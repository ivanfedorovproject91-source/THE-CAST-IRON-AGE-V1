/* ===== Предприятие: ядро (состояние, игровые сутки, учёт денег, отчёты) =====
   Модуль «Генеральный директор». Корпоративные деньги — s.company.treasury, личные — s.money. Они НЕ смешиваются.
   Расчёт идёт только из G.dailyTick (G.sleep) и только один раз за игровые сутки: метка c.lastDay пишется в то же
   сохранение, что и s.t.day. Отрисовка интерфейса ничего не считает и не изменяет. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const C = G.clamp;
  const CO = (G.co = { MAX_CATCHUP: 14, mod: {} });

  CO.NAME = 'АО «Чугунный век»';
  CO.DEPTS = [
    { id: 'smelt', n: 'Плавильное производство', i: '🔥', kind: 'prod', cap: 120, need: 140, pay: 1.15, resp: 'prod', unit: 'т металла/сут' },
    { id: 'foundry', n: 'Литейный цех', i: '🏭', kind: 'prod', cap: 114, need: 130, pay: 1.10, resp: 'prod', unit: 'т отливок/сут' },
    { id: 'mech', n: 'Механический участок', i: '⚙️', kind: 'prod', cap: 104, need: 90, pay: 1.05, resp: 'prod', unit: 'т готовой продукции/сут' },
    { id: 'repair', n: 'Ремонтная служба', i: '🔧', kind: 'sup', cap: 100, need: 30, pay: 1.0, resp: 'eng' },
    { id: 'otk', n: 'ОТК', i: '🔍', kind: 'sup', cap: 100, need: 15, pay: 0.95, resp: 'otk' },
    { id: 'store', n: 'Складское хозяйство', i: '📦', kind: 'sup', cap: 100, need: 15, pay: 0.8, resp: 'sup' }
  ];
  CO.DID = CO.DEPTS.map(d => d.id);
  CO.PROD = ['smelt', 'foundry', 'mech'];
  CO.dept = id => CO.DEPTS.find(d => d.id === id);

  CO.DIFF = {
    easy: { n: '🟢 Спокойное наследство', d: 'Деньги в кассе, оборудование в порядке, совет директоров настроен доброжелательно.', treasury: 58e6, loan: 12e6, cond: 82, trust: 66, morale: 68, safety: 66, stockWeeks: 2.2, extra: 0 },
    normal: { n: '🟡 Рабочее состояние', d: 'Обычный завод Едрёносталь: всё работает, но запас прочности невелик.', treasury: 40e6, loan: 22e6, cond: 70, trust: 55, morale: 60, safety: 58, stockWeeks: 1.6, extra: 1 },
    hard: { n: '🔴 Завод на грани', d: 'Касса почти пуста, печи на честном слове, совет директоров ждёт повода.', treasury: 16e6, loan: 42e6, cond: 52, trust: 42, morale: 48, safety: 45, stockWeeks: 0.9, extra: 2 }
  };

  // ---------- Форматирование
  CO.m = v => {
    const a = Math.abs(v), sg = v < 0 ? '−' : '';
    if (a >= 1e6) return sg + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace('.', ',') + ' млн ₽';
    if (a >= 1e3) return sg + Math.round(a / 1e3).toLocaleString('ru-RU') + ' тыс. ₽';
    return sg + Math.round(a) + ' ₽';
  };
  CO.t = v => Math.round(v).toLocaleString('ru-RU').replace(/ /g, ' ') + ' т';
  CO.pc = v => Math.round(v * 100) + '%';
  CO.dayStr = d => (G.dateStrOf ? G.dateStrOf(d) : 'день ' + d);
  CO.on = () => !!(G.s && G.s.ceo && G.s.ceo.appointed && G.s.company);
  CO.get = () => (CO.on() ? G.s.company : null);
  CO.today = () => G.s.t.day;

  // ---------- Журнал директора
  CO.log = function (c, text, cls) {
    c.log = c.log || [];
    c.log.unshift({ d: CO.today(), x: text, c: cls || '' });
    if (c.log.length > 60) c.log.length = 60;
    if (c.wk) { c.wk.notes.push(text); if (c.wk.notes.length > 14) c.wk.notes.shift(); }
  };
  CO.note = function (c, text, cls, toast) { CO.log(c, text, cls); if (toast) G.toast('🏢 ' + text, cls); };

  // ---------- Деньги предприятия (отдельный счёт)
  CO.cashIn = function (c, amt, cat) {
    amt = Math.round(amt); if (!(amt > 0)) return 0;
    c.treasury += amt; c.wk.cin[cat] = (c.wk.cin[cat] || 0) + amt; return amt;
  };
  CO.cashOut = function (c, amt, cat) {
    amt = Math.round(amt); if (!(amt > 0)) return 0;
    c.treasury -= amt; c.wk.cout[cat] = (c.wk.cout[cat] || 0) + amt; return amt;
  };
  // расход, уходящий и в убытки периода (бухгалтерский учёт)
  CO.expense = function (c, amt, key, cat) { amt = Math.round(amt); if (amt <= 0) return; c.wk.exp[key] = (c.wk.exp[key] || 0) + amt; CO.cashOut(c, amt, cat || key); };
  CO.canPay = (c, amt) => c.treasury >= amt;
  // оплата по решению игрока: проверка наличия денег; fund:'repair' — сначала ремонтный резерв
  CO.pay = function (c, amt, key, opt) {
    opt = opt || {}; amt = Math.round(amt);
    const fund = opt.fund ? Math.min(c.repairFund || 0, amt) : 0;
    if (c.treasury < amt - fund) { G.toast('Не хватает денег предприятия: нужно ' + CO.m(amt - fund) + ', в кассе ' + CO.m(c.treasury) + '.', 'bad'); return false; }
    if (fund) { c.repairFund -= fund; c.wk.cout.fund = (c.wk.cout.fund || 0) + fund; }
    if (opt.capex) CO.cashOut(c, amt - fund, key); else CO.expense(c, amt - fund, key);
    if (fund) { if (opt.capex) { /* из резерва, уже выведено */ } else c.wk.exp[key] = (c.wk.exp[key] || 0) + fund; }
    return true;
  };

  // ---------- Общий применитель последствий решений
  // f: {cash, morale, safety, rep, trust, eco, cond:{d:n}, down:{d:days}, stock:{res:n}, rel:{role:n}, sched:{...}}
  CO.fx = function (c, f) {
    if (!f) return;
    if (f.cash) { if (f.cash > 0) CO.cashIn(c, f.cash, 'other'); else CO.expense(c, -f.cash, f.key || 'other'); }
    if (f.morale) c.morale = C(c.morale + f.morale);
    if (f.safety) c.safety = C(c.safety + f.safety);
    if (f.rep) c.rep = C(c.rep + f.rep);
    if (f.eco) c.eco = C(c.eco + f.eco);
    if (f.trust) c.board.trust = C(c.board.trust + f.trust);
    if (f.cond) Object.keys(f.cond).forEach(id => { const d = c.depts[id]; if (d) d.cond = C(d.cond + f.cond[id]); });
    if (f.down) Object.keys(f.down).forEach(id => { const d = c.depts[id]; if (d) d.down = Math.max(d.down, f.down[id]); });
    if (f.stock) Object.keys(f.stock).forEach(id => { const r = c.inv[id]; if (r) r.q = Math.max(0, r.q + f.stock[id]); });
    if (f.rel) Object.keys(f.rel).forEach(role => { const m = c.staff[role]; if (m) { m.rel = C(m.rel + f.rel[role]); } });
    if (f.loy) Object.keys(f.loy).forEach(role => { const m = c.staff[role]; if (m) { m.loy = C(m.loy + f.loy[role]); } });
    if (f.sched) { c.sched.push(Object.assign({ day: CO.today() + (f.sched.in || 7) }, f.sched)); }
    if (f.flag) Object.keys(f.flag).forEach(k => { c.flags[k] = f.flag[k]; });
    if (f.personal && f.personal.money) G.addMoney(f.personal.money);
  };

  // ---------- Создание предприятия при вступлении в должность
  CO.newWk = () => ({ cin: {}, cout: {}, exp: {}, rev: 0, made: 0, good: 0, brak: 0, shipped: 0, spotT: 0, plan: 0, planDays: 0, breakdowns: 0, accidents: 0, idle: 0, notes: [], retD: 0 });
  CO.create = function (diff) {
    const df = CO.DIFF[diff] || CO.DIFF.normal;
    const c = {
      v: 1, diff: CO.DIFF[diff] ? diff : 'normal', name: CO.NAME,
      startDay: CO.today(), lastDay: CO.today(), accDays: 0,
      treasury: df.treasury, repairFund: 0, loans: [], deposits: [], recv: [],
      arrears: { wages: 0, tax: 0, other: 0 }, hidden: 0, wageLate: 0, negWeeks: 0,
      budget: { admin: 1, safety: 1, social: 1 }, wageIdx: 1,
      morale: df.morale, safety: df.safety, rep: 62, eco: 50,
      depts: {}, mods: { cap: { smelt: 1, foundry: 1, mech: 1 }, energy: 1, need: 1, defect: 0, storage: 0, safetyBase: 0, eco: 0, wear: 1 },
      inv: {}, orders: [], fg: { t: 0, bad: 0 }, offers: [], contracts: [], cust: {}, spot: { idx: 1, price: 0, demand: 260, on: true, hold: 0 },
      staff: {}, hire: [], projects: { act: [], done: {} },
      board: { trust: df.trust, warn: 0, probation: 0, next: 0, last: null, hist: [], promises: [] },
      pending: [], evHist: {}, sched: [], flags: {}, log: [], reports: [], uid: 1,
      stats: { made: 0, sold: 0, profit: 0, brak: 0, breakdowns: 0, accidents: 0, late: 0, done: 0, weeks: 0, cashGapWeeks: 0 }
    };
    c.wk = CO.newWk();
    CO.DEPTS.forEach(d => {
      c.depts[d.id] = { cond: df.cond + G.ri(-4, 4), staff: d.need, plan: 1, prio: 2, ot: false, maint: 1, stop: false, down: 0, patch: 0, lim: 1, resp: d.resp, defect: 0.04, last: { made: 0, util: 0 }, wk: { made: 0, plan: 0, idle: 0, down: 0 } };
    });
    ['prod', 'supply', 'sales', 'staff', 'fin'].forEach(k => { if (CO[k] && CO[k].init) CO[k].init(c, df); });
    c.board.next = Math.floor(CO.today() / 7) + 4;
    return c;
  };

  // ---------- Игровые сутки
  CO.process = function () {
    const s = G.s; if (!CO.on() || s.end || CO._busy) return;
    const c = s.company, today = s.t.day;
    if (typeof c.lastDay !== 'number' || !isFinite(c.lastDay)) c.lastDay = today;
    if (today <= c.lastDay) { if (today < c.lastDay) c.lastDay = today; return; } // некорректная/«откатившаяся» дата: только синхронизация, без начислений
    if (today - c.lastDay > CO.MAX_CATCHUP) { c.lastDay = today - CO.MAX_CATCHUP; CO.log(c, 'Часть периода пропущена: учтены последние ' + CO.MAX_CATCHUP + ' суток.', 'warn'); }
    CO._busy = true;
    try {
      while (c.lastDay < today && !s.end) {
        const d = c.lastDay + 1;
        c.lastDay = d; // метка ставится ДО расчёта: сбой внутри суток не приведёт к повторному начислению
        try { CO.day(c, d); } catch (e) { c.errs = (c.errs || 0) + 1; if (window.console) console.error('company day', d, e); }
      }
    } finally { CO._busy = false; }
  };

  CO.day = function (c, d) {
    const wd = d % 7;
    if (wd === 0 && c.accDays > 0) CO.fin.closeWeek(c, d);
    if (G.s.end) return;
    c.accDays++;
    CO.supply.daily(c, d);
    CO.sales.cashDaily(c, d);
    if (wd < 5) CO.prod.daily(c, d);
    CO.sales.ship(c, d);
    CO.sales.lateDaily(c, d);
    CO.staff.daily(c, d);
    CO.ev.daily(c, d);
    CO.fin.daily(c, d);
  };

  // ---------- Сводные показатели (для интерфейса и проверок)
  CO.nominalWeek = () => {
    let m = 1e9; CO.PROD.forEach(id => { m = Math.min(m, CO.dept(id).cap); }); return m * 5;
  };
  CO.weekOutput = c => c.reports.length ? c.reports[0].made : 0;
  CO.avgCond = c => CO.PROD.reduce((a, id) => a + c.depts[id].cond, 0) / CO.PROD.length;
  CO.debtTotal = c => c.loans.reduce((a, l) => a + l.left, 0) + c.arrears.wages + c.arrears.tax + c.arrears.other;
  CO.problems = function (c) {
    const out = [];
    CO.DEPTS.forEach(d => { const x = c.depts[d.id]; if (x.down > 0) out.push({ k: 'bad', x: d.i + ' ' + d.n + ': простой, ещё ' + x.down + ' дн.' }); else if (x.stop) out.push({ k: 'warn', x: d.i + ' ' + d.n + ': остановлено' }); else if (x.cond < 35) out.push({ k: 'bad', x: d.i + ' ' + d.n + ': оборудование на пределе (' + Math.round(x.cond) + '%)' }); });
    if (CO.supply) CO.supply.list.forEach(id => { const r = c.inv[id]; if (!r || r.id === 'power') return; const need = CO.supply.dailyUse(c, id) * 5; if (r.q < r.min) out.push({ k: 'warn', x: CO.supply.RES[id].i + ' ' + CO.supply.RES[id].n + ': ниже минимума (' + CO.t(r.q) + ')' }); else if (need > 0 && r.q < need * 0.5) out.push({ k: 'warn', x: CO.supply.RES[id].i + ' ' + CO.supply.RES[id].n + ': хватит меньше чем на 2,5 дня' }); });
    if (c.arrears.wages > 0) out.push({ k: 'bad', x: 'Задолженность по зарплате ' + CO.m(c.arrears.wages) });
    if (c.arrears.tax + c.arrears.other > 0) out.push({ k: 'bad', x: 'Просрочены платежи: ' + CO.m(c.arrears.tax + c.arrears.other) });
    if (c.treasury < 0) out.push({ k: 'bad', x: 'Касса в минусе: ' + CO.m(c.treasury) });
    c.contracts.forEach(k => { if (k.status === 'active' && CO.today() > k.due) out.push({ k: 'bad', x: 'Просрочен контракт №' + k.n + ' (' + CO.sales.cust(k.cust).n + ')' }); });
    if (c.morale < 35) out.push({ k: 'warn', x: 'Низкий боевой дух: ' + Math.round(c.morale) });
    if (c.safety < 35) out.push({ k: 'warn', x: 'Опасный уровень безопасности: ' + Math.round(c.safety) });
    return out;
  };

  // ---------- Сохранения: страховка структуры (после загрузки старого или повреждённого сохранения)
  CO.repair = function () {
    const s = G.s; if (!s) return;
    if (!s.ceo || typeof s.ceo !== 'object') s.ceo = CO.ceoDefault();
    const c = s.company;
    if (!c) { if (s.ceo.appointed) { s.company = CO.create('normal'); s.company.lastDay = s.t.day; } return; }
    const fresh = CO.create(c.diff || 'normal'); // эталон структуры: дозаполняем только отсутствующие поля
    const merge = (dst, src) => Object.keys(src).forEach(k => {
      if (dst[k] === undefined) dst[k] = JSON.parse(JSON.stringify(src[k]));
      else if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) merge(dst[k], src[k]);
    });
    const keepLast = c.lastDay;
    merge(c, fresh);
    c.lastDay = typeof keepLast === 'number' ? keepLast : s.t.day;
    if (!c.wk || !c.wk.cin) c.wk = CO.newWk();
  };
  CO.ceoDefault = () => ({ appointed: false, stage: 0, depWeek: null, nextWeek: 0, path: null, support: { truh: 0, owners: 0, sopl: 0, staff: 0 }, tries: 0, deals: {}, promises: [], day: null, diff: null, seen: {} });

  const _base = G.baseState;
  G.baseState = function () { const s = _base.apply(this, arguments); s.ceo = CO.ceoDefault(); s.company = null; return s; };
  const _load = G.load;
  G.load = function () { const r = _load.apply(this, arguments); try { CO.repair(); } catch (e) { if (window.console) console.error(e); } return r; };
  const _dt = G.dailyTick;
  G.dailyTick = function () { const r = _dt.apply(this, arguments); try { CO.process(); } catch (e) { if (window.console) console.error(e); } return r; };
})();
