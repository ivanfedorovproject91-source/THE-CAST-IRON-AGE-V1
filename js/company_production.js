/* ===== Предприятие: производство, оборудование, ремонт, проекты развития ===== */
(function () {
  'use strict';
  const G = window.G, CO = G.co, C = G.clamp;
  const P = (CO.prod = {});
  const Y1 = 0.95, Y2 = 0.97;      // выход: металл → отливки, отливки → готовая продукция
  CO.Y1 = Y1; CO.Y2 = Y2;

  // стоимость обслуживания в неделю и расход запчастей (комплектов) в сутки по уровням: 0 нет, 1 обычное, 2 профилактика
  const MAINT_COST = { prod: [0, 0.15e6, 0.28e6], sup: [0, 0.05e6, 0.09e6] };
  const MAINT_PARTS = { prod: [0, 0.25, 0.5], sup: [0, 0.05, 0.1] };
  const MAINT_REST = [0, 0.19, 0.44];
  P.MAINT_NAMES = ['Без обслуживания', 'Обычное обслуживание', 'Профилактика'];
  P.maintWeekCost = (kind, lvl) => MAINT_COST[kind][lvl];

  P.init = function (c, df) {
    const nm = c.mods;
    c.rawQ = 1; c.bottleneck = 'mech'; c.lastRun = { F: 0, plan: 0, brak: 0, melt: 0 };
    nm.cap = { smelt: 1, foundry: 1, mech: 1 };
  };

  // ---------- Эффективность подразделения
  P.need = (c, id) => { const d = CO.dept(id); return d.need * (d.kind === 'prod' ? c.mods.need : 1); };
  P.eff = function (c, id) {
    const x = c.depts[id], cov = x.staff / Math.max(1, P.need(c, id));
    const eStaff = cov >= 1 ? 1 : 0.35 + 0.65 * C(cov, 0, 1);
    const eCond = 0.70 + 0.30 * x.cond / 100;
    const eMor = 0.92 + 0.16 * c.morale / 100;
    const mg = CO.staff.deptMgr(c, id);
    return { staff: eStaff, cond: eCond, morale: eMor, mgr: mg, lim: x.lim, total: eStaff * eCond * eMor * mg * x.lim };
  };
  P.capNow = function (c, id) { // реальная мощность в сутки
    const x = c.depts[id], def = CO.dept(id), e = P.eff(c, id);
    return def.cap * (c.mods.cap[id] || 1) * e.total * (x.ot ? 1.15 : 1) * (CO.staff.trait(c, 'prod', 'pushy') ? 1.03 : 1);
  };
  // номинальный выпуск готовой продукции в сутки (при полной эффективности) — для оценки проектов
  P.nominalFin = function (capMods) {
    const m = capMods || {}, cap = id => CO.dept(id).cap * (m[id] || 1);
    return Math.min(cap('mech'), cap('foundry') * Y2, cap('smelt') * Y1 * Y2);
  };
  P.bottleneck = function (c) {
    const v = { smelt: P.capNow(c, 'smelt') * Y1 * Y2, foundry: P.capNow(c, 'foundry') * Y2, mech: P.capNow(c, 'mech') };
    let best = 'mech'; CO.PROD.forEach(id => { if (v[id] < v[best]) best = id; }); return best;
  };
  P.planFin = function (c) { // суточный план предприятия (готовой продукции)
    const pl = id => CO.dept(id).cap * (c.mods.cap[id] || 1) * c.depts[id].plan;
    return Math.min(pl('mech'), pl('foundry') * Y2, pl('smelt') * Y1 * Y2);
  };
  P.contribution = function (c) { // маржинальная прибыль с тонны (цена − переменные затраты), оценка
    const price = c.spot.price || 60000; return Math.max(5000, price - CO.supply.varCost(c));
  };

  // ---------- Суточный расчёт
  P.daily = function (c, d) {
    const wk = c.wk, S = CO.supply;
    // 1) простои / остановки
    const blocked = {};
    CO.DID.forEach(id => { const x = c.depts[id]; if (x.down > 0) { x.down--; x.wk.down++; blocked[id] = 'down'; } else if (x.stop) blocked[id] = 'stop'; });
    // 2) выпуск по цепочке (спрос тянет цепочку назад: считаем готовую продукцию, затем металл и отливки)
    const cap = {}; CO.PROD.forEach(id => { cap[id] = blocked[id] ? 0 : Math.min(P.capNow(c, id), CO.dept(id).cap * (c.mods.cap[id] || 1) * c.depts[id].plan * (c.depts[id].ot ? 1.15 : 1)); });
    const raw = S.maxMelt(c);                         // сколько металла можно сварить из запасов
    const consMax = c.inv.cons.q / S.RES.cons.perFin;  // расходные материалы
    const room = Math.max(0, S.fgCap(c) - c.fg.t);     // место на складе готовой продукции
    let F = Math.min(cap.mech, cap.foundry * Y2, cap.smelt * Y1 * Y2, raw * Y1 * Y2, consMax, room);
    F = Math.max(0, F);
    const melt = F / (Y1 * Y2), cast = F / Y2;
    const act = { smelt: melt, foundry: cast, mech: F };
    const planF = P.planFin(c);
    wk.plan += planF; wk.planDays++;
    // причина недовыпуска — для отчёта
    let why = '';
    if (F < planF - 0.5) {
      if (CO.PROD.every(id => blocked[id])) why = 'всё стоит';
      else if (raw * Y1 * Y2 <= F + 0.01 && raw < cap.smelt) why = 'не хватает сырья';
      else if (consMax <= F + 0.01) why = 'нет расходных материалов';
      else if (room <= F + 0.01) why = 'склад готовой продукции переполнен';
      else { const b = P.bottleneck(c); why = 'узкое место: ' + CO.dept(b).n.toLowerCase(); }
    }
    c.lastRun = { F: F, plan: planF, melt: melt, why: why, day: d };
    // 3) списание ресурсов
    let rawCost = 0, rq = 0;
    if (melt > 0) { const r = S.consumeRaw(c, melt); rawCost = r.cost; rq = r.q; c.rawQ = r.q; }
    const consCost = S.consume(c, 'cons', F * S.RES.cons.perFin);
    const energy = melt * S.RES.power.perMelt * c.inv.power.price * c.mods.energy;
    wk.exp.raw = (wk.exp.raw || 0) + Math.round(rawCost);
    wk.exp.cons = (wk.exp.cons || 0) + Math.round(consCost);
    if (energy > 0) CO.expense(c, energy, 'energy');
    c.inv.power.used = (c.inv.power.used || 0) + melt * S.RES.power.perMelt;
    // 4) качество
    const push = CO.staff.trait(c, 'prod', 'pushy') ? 0.02 : 0;
    let dsum = 1;
    CO.PROD.forEach(id => { const x = c.depts[id]; const di = 0.022 + (100 - x.cond) / 100 * 0.06 + (x.ot ? 0.012 : 0) + push / 3 + c.mods.defect / 3 + (1 - c.rawQ) * 0.2 + (c.depts[id].staff < P.need(c, id) * 0.8 ? 0.01 : 0) + x.patch * 0.003; x.defect = C(di, 0.005, 0.5); dsum *= (1 - x.defect); });
    const defect = 1 - dsum;
    const k = P.otkCatch(c);
    const brak = F * defect * k, hidden = F * defect * (1 - k);
    const good = F - brak;
    c.fg.t += good; c.fg.bad += hidden;
    wk.made += F; wk.good += good; wk.brak += brak; c.stats.made += F; c.stats.brak += brak;
    // 5) износ, обслуживание, поломки
    CO.DEPTS.forEach(def => {
      const id = def.id, x = c.depts[id], sup = def.kind === 'sup';
      const util = sup ? 0.6 : (act[id] / def.cap);
      const blk = blocked[id];
      x.last = { made: act[id] || 0, util: sup ? 0 : util };
      x.wk.made += act[id] || 0; x.wk.plan += sup ? 0 : def.cap * (c.mods.cap[id] || 1) * x.plan;
      if (blk === 'down') { x.wk.idle++; }
      if (blk === 'stop') { x.wk.idle++; }
      // обслуживание
      const lvl = x.maint, kind = def.kind;
      const perDayPartsWant = MAINT_PARTS[kind][lvl];
      let partsRatio = 1;
      if (perDayPartsWant > 0) { const have = Math.min(perDayPartsWant, c.inv.parts.q); partsRatio = have / perDayPartsWant; if (have > 0) S.consume(c, 'parts', have); }
      const wkCost = MAINT_COST[kind][lvl];
      if (wkCost > 0) { const todayCost = wkCost / 5; if (c.repairFund >= todayCost) { c.repairFund -= todayCost; c.wk.exp.maint = (c.wk.exp.maint || 0) + Math.round(todayCost); c.wk.cout.fund = (c.wk.cout.fund || 0) + Math.round(todayCost); } else CO.expense(c, todayCost, 'maint'); }
      const rm = P.repairMul(c, id) * (id === 'repair' ? 1 : 1) * (x.prio === 3 ? 1.25 : x.prio === 1 ? 0.8 : 1);
      const rest = MAINT_REST[lvl] * (sup ? 0.3 : 1) * rm * (0.5 + 0.5 * partsRatio);
      let wear;
      if (blk === 'stop') wear = 0.0;
      else if (blk === 'down') wear = 0.02;
      else wear = (sup ? 0.07 : 0.20 * util * util + 0.04 + Math.max(0, x.plan - 1) * 0.5 * 0.2) * (x.ot ? 1.3 : 1) * c.mods.wear * (1 + x.patch * 0.08);
      if (blk === 'stop' && lvl > 0) x.cond = C(x.cond + 0.3 * rm);
      else x.cond = C(x.cond + rest - wear, 0, 100);
      // поломки только у работающих производственных подразделений
      if (!sup && !blk && F > 0) P.breakRoll(c, id, d, util);
    });
    // 6) безопасность
    P.safetyDrift(c);
    c.bottleneck = P.bottleneck(c);
    // 7) аварии
    P.accidentRoll(c, d);
  };

  P.otkCatch = function (c) {
    const x = c.depts.otk, cov = x.staff / Math.max(1, P.need(c, 'otk'));
    const base = 0.50 + 0.30 * C(cov, 0, 1) * (0.7 + 0.3 * x.cond / 100);
    return C(base * CO.staff.deptMgr(c, 'otk') * (x.stop || x.down > 0 ? 0.3 : 1), 0.1, 0.93);
  };
  P.repairMul = function (c, id) {
    const x = c.depts.repair, cov = x.staff / Math.max(1, P.need(c, 'repair'));
    return (0.65 + 0.35 * x.cond / 100) * (0.6 + 0.4 * C(cov, 0, 1)) * CO.staff.deptMgr(c, 'repair');
  };

  P.breakRoll = function (c, id, d, util) {
    const x = c.depts[id];
    const eng = CO.staff.engMul(c);
    const flag = (c.flags['defer_' + id] || 0) >= d ? 0.012 : 0;
    let p = 0.004 + Math.max(0, util - 1) * 0.05 + Math.max(0, 50 - x.cond) * 0.0012 + (x.ot ? 0.006 : 0) + x.patch * 0.004 + flag;
    p *= eng * (x.maint === 2 ? 0.6 : x.maint === 0 ? 1.4 : 1) * (x.riskMul || 1) * (c.mods.riskMul || 1);
    if (!G.chance(p * 100)) return;
    const sev = C(G.ri(1, 3) + (x.cond < 30 ? 1 : 0) - (x.cond > 85 ? 1 : 0), 1, 4);
    const short = c.inv.parts.q < 2;
    x.down = Math.max(x.down, sev + (short ? 1 : 0));
    x.cond = C(x.cond - (5 + sev * 4));
    const cost = Math.round((0.25e6 * sev + G.ri(0, 3) * 0.1e6) * (flag ? 1.3 : 1));
    c.wk.breakdowns++; c.stats.breakdowns++;
    const fund = Math.min(c.repairFund, cost); c.repairFund -= fund; if (fund) c.wk.cout.fund = (c.wk.cout.fund || 0) + fund;
    CO.expense(c, cost - fund, 'repair'); if (fund) c.wk.exp.repair = (c.wk.exp.repair || 0) + fund;
    const nm = CO.dept(id).n;
    if (sev >= 3 && !c.pending.some(e => e.id === 'breakdown' && e.ctx && e.ctx.dept === id)) {
      CO.note(c, nm + ': серьёзная авария, простой ' + x.down + ' дн.', 'bad', true);
      CO.ev.raise(c, id === 'smelt' ? 'furnace' : 'breakdown', { dept: id, sev: sev, cost: cost });
    } else CO.note(c, nm + ': поломка (тяжесть ' + sev + '), ремонт ' + CO.m(cost) + ', простой ' + x.down + ' дн.', 'warn');
  };

  P.safetyDrift = function (c) {
    const lvl = c.budget.safety, avgCond = CO.avgCond(c);
    const ots = CO.PROD.filter(id => c.depts[id].ot).length;
    const target = 44 + c.mods.safetyBase + [-16, 4, 22][lvl] + (CO.staff.mod(c, 'eng') * 12) - ots * 5 - (avgCond < 40 ? 8 : 0) + (c.eco - 50) * 0.05;
    c.safety = C(c.safety + C((target - c.safety) * 0.04, -0.7, 0.7));
  };
  P.accidentRoll = function (c, d) {
    const avgCond = CO.avgCond(c), ots = CO.PROD.some(id => c.depts[id].ot);
    if (c.flags.accCool && c.flags.accCool > d) return;
    const p = 0.0011 + Math.max(0, 55 - c.safety) * 0.00009 + (ots ? 0.0012 : 0) + (avgCond < 40 ? 0.0015 : 0);
    if (!G.chance(p * 100)) return;
    c.flags.accCool = d + 12; c.wk.accidents++; c.stats.accidents++;
    CO.ev.raise(c, 'accident', { sev: c.safety < 30 ? 2 : 1, dept: G.pick(CO.PROD) });
  };

  // ---------- Решения директора по производству
  const meddle = c => CO.staff.meddle(c);
  P.setPlan = function (id, v) { const c = CO.get(); if (!c) return; c.depts[id].plan = C(Math.round(v * 100) / 100, 0.5, 1.3); meddle(c); };
  P.setPrio = function (id, v) { const c = CO.get(); if (!c) return; c.depts[id].prio = C(v, 1, 3); };
  P.toggleOT = function (id) {
    const c = CO.get(); if (!c) return; const x = c.depts[id];
    x.ot = !x.ot; meddle(c);
    CO.note(c, CO.dept(id).n + ': сверхурочные ' + (x.ot ? 'утверждены (+15% мощности, +25% к оплате, риск и износ растут)' : 'отменены'), x.ot ? 'warn' : '');
  };
  P.setMaint = function (id, v) {
    const c = CO.get(); if (!c) return; const x = c.depts[id]; if (x.maint === v) return; x.maint = v; meddle(c);
    CO.note(c, CO.dept(id).n + ': ' + P.MAINT_NAMES[v].toLowerCase(), v === 0 ? 'warn' : '');
  };
  P.setStop = function (id, on) {
    const c = CO.get(); if (!c) return; const x = c.depts[id]; x.stop = !!on; meddle(c);
    CO.note(c, CO.dept(id).n + (on ? ': остановлено по решению директора' : ': запущено снова'), on ? 'warn' : '');
  };
  P.assign = function (id, role) { const c = CO.get(); if (!c) return; c.depts[id].resp = role; CO.note(c, CO.dept(id).n + ': ответственный — ' + CO.staff.ROLES[role].n + ' (' + CO.staff.name(c, role) + ')'); };
  P.quickRepair = function (id) {
    const c = CO.get(); if (!c) return; const x = c.depts[id], def = CO.dept(id);
    const cost = def.kind === 'prod' ? 1.6e6 : 0.5e6;
    if (x.cond >= 92) { G.toast('Оборудование и так в хорошем состоянии.', 'warn'); return; }
    if (!CO.pay(c, cost, 'repair', { fund: true })) return;
    const gain = Math.min(16, 92 - x.cond); x.cond += gain; x.down = Math.max(x.down, 2); x.patch = Math.min(4, x.patch + 1); meddle(c);
    CO.note(c, def.n + ': быстрый ремонт (+' + Math.round(gain) + ' к состоянию, простой 2 дня). «Заплатка» ускоряет будущий износ.', 'warn', true);
  };
  P.reserve = function (amt) {
    const c = CO.get(); if (!c) return; amt = Math.round(amt);
    if (amt > 0) { if (c.treasury < amt) { G.toast('В кассе нет столько денег.', 'bad'); return; } c.treasury -= amt; c.repairFund += amt; c.wk.cout.fundIn = (c.wk.cout.fundIn || 0) + amt; }
    else { const back = Math.min(c.repairFund, -amt); c.repairFund -= back; c.treasury += back; c.wk.cin.fundOut = (c.wk.cin.fundOut || 0) + back; }
    CO.note(c, 'Резерв на ремонт: ' + CO.m(c.repairFund));
  };

  // ---------- Проекты развития и модернизации
  const gainCap = (c, id, mul) => { // еженедельная выгода от роста мощности (с учётом узкого места)
    const cur = Object.assign({}, c.mods.cap), nxt = Object.assign({}, cur); nxt[id] = (nxt[id] || 1) * mul;
    const dF = (P.nominalFin(nxt) - P.nominalFin(cur)) * 5 * P.contribution(c);
    return dF;
  };
  P.PROJECTS = [
    { id: 'furnace', i: '🔥', n: 'Модернизация печей', cost: 18e6, weeks: 8, parts: 30, lim: { smelt: 0.6 }, risk: 'Переносится на 2 недели в 20% случаев; перерасход бюджета до 15%.', riskP: 0.2,
      desc: 'Мощность плавки +10%, расход энергии −6%, печь реже ломается. Во время работ плавильное производство даёт 60% мощности.',
      apply: c => { c.mods.cap.smelt *= 1.10; c.mods.energy *= 0.94; c.depts.smelt.riskMul = 0.7; c.depts.smelt.cond = Math.max(c.depts.smelt.cond, 88); c.depts.smelt.patch = 0; },
      gain: c => gainCap(c, 'smelt', 1.10) + 2.2e6 * 0.06 + 0.1e6 },
    { id: 'lines', i: '🛠', n: 'Ремонт производственных линий', cost: 7e6, weeks: 4, parts: 10, lim: { foundry: 0.65, mech: 0.7 }, risk: 'Риск задержки 15%.', riskP: 0.15,
      desc: 'Литейный и механический участки возвращаются к состоянию 90+, «заплатки» снимаются. На время ремонта — 65–70% мощности.',
      apply: c => { ['foundry', 'mech'].forEach(id => { c.depts[id].cond = Math.max(c.depts[id].cond, 92); c.depts[id].patch = 0; }); },
      gain: c => 0.5e6 + (90 - (c.depts.foundry.cond + c.depts.mech.cond) / 2) * 0.03e6 },
    { id: 'equip', i: '🏗', n: 'Покупка нового оборудования', cost: 24e6, weeks: 10, parts: 14, lim: { mech: 0.75 }, risk: 'Переносится на 3 недели в 25% случаев; нужен монтаж и обучение.', riskP: 0.25,
      desc: 'Новые станки на механическом участке: мощность +12%. Реальный прирост выпуска ограничен следующим узким местом цепочки.',
      apply: c => { c.mods.cap.mech *= 1.12; c.depts.mech.cond = Math.max(c.depts.mech.cond, 90); c.depts.mech.patch = 0; },
      gain: c => gainCap(c, 'mech', 1.12) },
    { id: 'store', i: '📦', n: 'Расширение складов', cost: 9e6, weeks: 6, parts: 4, lim: {}, risk: 'Риск задержки 10%.', riskP: 0.1,
      desc: 'Складская ёмкость +600 т: крупные закупки и резерв сырья, меньше срывов из-за переполнения.',
      apply: c => { c.mods.storage += 600; }, gain: c => 0.12e6 },
    { id: 'energy', i: '⚡', n: 'Повышение энергоэффективности', cost: 12e6, weeks: 8, parts: 8, lim: { smelt: 0.9 }, risk: 'Риск задержки 15%.', riskP: 0.15,
      desc: 'Расход электроэнергии −15% во всех подразделениях. Эффект постоянный, но окупается медленно.',
      apply: c => { c.mods.energy *= 0.85; }, gain: c => (c.inv.power.price * (CO.supply.RES.power.perMelt) * 520 * 1.05) * 0.15 },
    { id: 'filter', i: '🌫', n: 'Улучшение системы очистки', cost: 10e6, weeks: 6, parts: 6, lim: { smelt: 0.85 }, risk: 'Риск задержки 15%.', riskP: 0.15,
      desc: 'Экология +25: меньше штрафов природнадзора, растёт репутация предприятия и доверие собственников.',
      apply: c => { c.mods.eco += 25; c.eco = C(c.eco + 25); c.rep = C(c.rep + 3); c.board.trust = C(c.board.trust + 2); }, gain: c => 0.2e6 },
    { id: 'auto', i: '🤖', n: 'Автоматизация производства', cost: 28e6, weeks: 12, parts: 12, lim: { mech: 0.8, foundry: 0.85 }, risk: 'Переносится на 4 недели в 30% случаев; потребность в людях падает — профсоюз недоволен.', riskP: 0.3,
      desc: 'Потребность в персонале −10%, брак −1 п.п. Экономия появляется только если сократить штат — а это люди.',
      apply: c => { c.mods.need *= 0.90; c.mods.defect -= 0.01; c.morale = C(c.morale - 3); }, gain: c => 0.7e6 + 0.05e6 },
    { id: 'labor', i: '🦺', n: 'Улучшение условий труда', cost: 6e6, weeks: 5, parts: 2, lim: {}, risk: 'Риск задержки 10%.', riskP: 0.1,
      desc: 'Безопасность +12 постоянно, боевой дух +8. Прямой выручки нет — зато меньше аварий и проверок.',
      apply: c => { c.mods.safetyBase += 12; c.morale = C(c.morale + 8); c.safety = C(c.safety + 6); }, gain: c => 0.05e6 }
  ];
  P.capDef = function (id) { // капитальный ремонт подразделения (долгосрочное обновление вместо «заплатки»)
    const d = CO.dept(String(id).slice(4)); if (!d) return null; const prod = d.kind === 'prod';
    return { id: id, dept: d.id, cap: true, i: '🔩', n: 'Капитальный ремонт: ' + d.n, cost: prod ? 9e6 : 3e6, weeks: prod ? 3 : 2, parts: prod ? 6 : 2, lim: { [d.id]: 0.4 }, risk: 'Риск задержки 10%.', riskP: 0.1,
      desc: 'Оборудование «' + d.n + '» восстанавливается до 96%, «заплатки» снимаются. Подразделение работает на 40% мощности во время ремонта.',
      apply: c => { c.depts[d.id].cond = 96; c.depts[d.id].patch = 0; }, gain: c => 0.25e6 + Math.max(0, 85 - c.depts[d.id].cond) * 0.02e6 };
  };
  P.proj = id => P.PROJECTS.find(p => p.id === id) || (String(id).indexOf('cap_') === 0 ? P.capDef(id) : null);
  P.payback = function (c, p) { const g = p.gain(c); return g > 1e4 ? Math.round(p.cost / g) : null; };
  P.isActive = (c, id) => c.projects.act.some(a => a.id === id);
  P.canStart = function (c, p) {
    if (c.projects.done[p.id]) return 'Уже выполнено';
    if (c.flags.noInvest && !p.cap && p.cost > 7e6) return 'Совет директоров не разрешает новые крупные проекты (ещё несколько недель)';
    if (P.isActive(c, p.id)) return 'Уже идёт';
    if (c.projects.act.length >= 2) return 'Одновременно — не более двух проектов';
    if (c.inv.parts.q < p.parts) return 'Не хватает запчастей: нужно ' + p.parts + ', на складе ' + Math.floor(c.inv.parts.q);
    const first = Math.round(p.cost / p.weeks);
    if (c.treasury < first * 2) return 'Не хватает денег на первые взносы (' + CO.m(first * 2) + ')';
    return null;
  };
  P.startProject = function (id) {
    const c = CO.get(); if (!c) return; const p = P.proj(id); if (!p) return;
    const why = P.canStart(c, p); if (why) { G.toast(why, 'bad'); return; }
    CO.supply.consume(c, 'parts', p.parts);
    c.projects.act.push({ id: id, start: CO.today(), left: p.weeks, total: p.weeks, paid: 0, cost: p.cost, delayed: false });
    P.recalcLim(c);
    CO.note(c, 'Запущен проект «' + p.n + '»: ' + CO.m(p.cost) + ', срок ' + p.weeks + ' нед.', 'good', true);
  };
  P.cancelProject = function (id) {
    const c = CO.get(); if (!c) return; const i = c.projects.act.findIndex(a => a.id === id); if (i < 0) return;
    const a = c.projects.act[i]; c.projects.act.splice(i, 1); P.recalcLim(c);
    c.board.trust = C(c.board.trust - 1.5); c.morale = C(c.morale - 2);
    CO.note(c, 'Проект «' + P.proj(id).n + '» остановлен. Уплачено ' + CO.m(a.paid) + ' — деньги и запчасти потеряны.', 'bad', true);
  };
  P.recalcLim = function (c) {
    CO.DID.forEach(id => { c.depts[id].lim = 1; });
    c.projects.act.forEach(a => { const p = P.proj(a.id); Object.keys(p.lim).forEach(id => { c.depts[id].lim = Math.min(c.depts[id].lim, p.lim[id]); }); });
  };
  // раз в неделю (закрытие недели)
  P.weekly = function (c) {
    const done = [];
    c.projects.act.forEach(a => {
      const p = P.proj(a.id), inst = Math.round(p.cost / p.weeks * (a.overrun ? 1.15 : 1));
      if (c.treasury >= inst) { CO.cashOut(c, inst, 'proj'); a.paid += inst; c.wk.capex = (c.wk.capex || 0) + inst; a.left--; a.stall = 0; }
      else { a.stall = (a.stall || 0) + 1; CO.note(c, 'Проект «' + p.n + '»: нет денег на взнос, работы стоят.', 'bad'); }
      if (!a.rolled && a.left <= 1 && G.chance(p.riskP * 100)) { a.rolled = 1; a.left += p.id === 'equip' ? 3 : p.id === 'auto' ? 4 : 2; a.delayed = true; if (p.id === 'furnace' || p.id === 'lines') a.overrun = true; CO.note(c, 'Проект «' + p.n + '» сорван по срокам: подрядчик «нашёл» новые обстоятельства.', 'warn', true); }
      if (a.left <= 0) done.push(a);
    });
    done.forEach(a => {
      const p = P.proj(a.id); c.projects.act.splice(c.projects.act.indexOf(a), 1); c.projects.done[a.id] = CO.today();
      p.apply(c); if (p.cap) delete c.projects.done[a.id]; CO.note(c, '✅ Проект «' + p.n + '» завершён. ' + p.desc.split('. ')[0] + '.', 'good', true); c.board.trust = C(c.board.trust + 2.5);
    });
    if (done.length || c.projects.act.length) P.recalcLim(c);
  };
})();
