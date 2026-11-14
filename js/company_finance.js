/* ===== Предприятие: финансы юридического лица, бюджет, кредиты, закрытие недели ===== */
(function () {
  'use strict';
  const G = window.G, CO = G.co, C = G.clamp;
  const F = (CO.fin = {});

  F.BUDGET = {
    admin: { n: 'Административные расходы', lv: ['Режим экономии', 'Обычный режим', 'Щедрый режим'], cost: [0.45e6, 0.70e6, 1.00e6], d: ['Дешевле, но контроль слабее: растут хищения и «потерянные» бумаги.', 'Нормальный контроль и документооборот.', 'Строгий контроль, аудиторы, секретари — и всё это стоит денег.'] },
    safety: { n: 'Охрана труда и безопасность', lv: ['Минимум', 'По нормативу', 'Усиленная'], cost: [0.15e6, 0.50e6, 1.00e6], d: ['Экономит, но безопасность падает, а проверки штрафуют.', 'Нормативные мероприятия.', 'Обучение, СИЗ, тренажёры: безопасность растёт.'] },
    social: { n: 'Социальные расходы', lv: ['Минимум', 'Обычные', 'Расширенные'], cost: [0.10e6, 0.40e6, 0.80e6], d: ['Столовая «как была». Боевой дух падает.', 'Обеды, путёвки, спартакиада.', 'Хорошая столовая и премии: люди держатся за место.'] }
  };
  F.TAX = 0.20; F.PROPERTY = 0.25e6;

  F.init = function (c, df) {
    c.cashStart = c.treasury; c.lossCF = 0;
    c.loans = [{ id: c.uid++, name: 'Кредит «Рубль-Банка» (наследство)', left: df.loan, rate: 0.14, pay: 0, weeks: 52, late: 0 }];
    F.recalcPay(c.loans[0]);
  };
  F.annuity = (amt, rate, weeks) => { const r = rate / 52; return r > 0 ? amt * r / (1 - Math.pow(1 + r, -weeks)) : amt / weeks; };
  F.recalcPay = l => { l.pay = Math.round(F.annuity(l.left, l.rate, Math.max(1, l.weeks))); };

  // ---------- Решения
  F.setBudget = function (key, lv) {
    const c = CO.get(); if (!c) return; c.budget[key] = lv;
    CO.note(c, 'Бюджет утверждён: ' + F.BUDGET[key].n.toLowerCase() + ' — ' + F.BUDGET[key].lv[lv].toLowerCase() + ' (' + CO.m(F.BUDGET[key].cost[lv]) + '/нед.).');
  };
  F.loanOffers = function (c) {
    const bad = (c.arrears.wages + c.arrears.tax + c.arrears.other > 0 || c.treasury < 0) ? 0.04 : 0;
    const rate = 0.15 + (c.diff === 'hard' ? 0.03 : 0) + Math.max(0, (45 - c.board.trust) * 0.002) + bad - (c.rep > 70 ? 0.01 : 0);
    return [{ amt: 10e6, weeks: 26, rate: rate }, { amt: 25e6, weeks: 52, rate: rate + 0.01 }, { amt: 50e6, weeks: 104, rate: rate + 0.02 }];
  };
  F.loanTotal = c => c.loans.reduce((a, l) => a + l.left, 0);
  F.takeLoan = function (i) {
    const c = CO.get(); if (!c) return; const o = F.loanOffers(c)[i]; if (!o) return;
    if (F.loanTotal(c) + o.amt > 95e6) { G.toast('Банк отказал: общая задолженность по кредитам не может превышать 95 млн ₽.', 'bad'); return; }
    const fee = Math.round(o.amt * 0.01), l = { id: c.uid++, name: 'Кредит «Рубль-Банка» ' + CO.dayStr(CO.today()), left: o.amt, rate: o.rate, pay: 0, weeks: o.weeks, late: 0 };
    F.recalcPay(l); c.loans.push(l); CO.cashIn(c, o.amt, 'loan'); CO.expense(c, fee, 'fees');
    CO.note(c, 'Получен кредит ' + CO.m(o.amt) + ' под ' + (o.rate * 100).toFixed(1) + '% на ' + o.weeks + ' нед. Платёж ' + CO.m(l.pay) + '/нед. Комиссия ' + CO.m(fee) + '.', 'warn', true);
  };
  F.repayLoan = function (id, amt) {
    const c = CO.get(); if (!c) return; const l = c.loans.find(x => x.id === id); if (!l) return;
    amt = Math.min(Math.round(amt), Math.round(l.left)); if (c.treasury < amt) { G.toast('В кассе нет столько денег.', 'bad'); return; }
    CO.cashOut(c, amt, 'loanPrin'); l.left -= amt;
    if (l.left < 1) c.loans.splice(c.loans.indexOf(l), 1); else F.recalcPay(l);
    CO.note(c, 'Досрочное погашение кредита: ' + CO.m(amt) + '.', 'good');
  };
  F.payArrears = function () {
    const c = CO.get(); if (!c) return; const a = c.arrears;
    const pay = (k) => { const v = Math.min(c.treasury, Math.round(a[k])); if (v > 0) { CO.cashOut(c, v, 'arrears'); a[k] -= v; } };
    const before = a.wages + a.tax + a.other;
    pay('wages'); pay('tax'); pay('other');
    const paid = before - (a.wages + a.tax + a.other);
    if (paid > 0) CO.note(c, 'Погашена задолженность на ' + CO.m(paid) + '.', 'good'); else G.toast('Погашать нечем или долгов нет.', 'warn');
  };
  F.DEP = [{ w: 4, rate: 0.07 }, { w: 13, rate: 0.09 }];
  F.deposit = function (amt, i) {
    const c = CO.get(); if (!c) return; const t = F.DEP[i]; amt = Math.round(amt);
    if (c.treasury - amt < 5e6) { G.toast('Нельзя вкладывать, оставив в кассе меньше 5 млн ₽ на текущие нужды.', 'bad'); return; }
    CO.cashOut(c, amt, 'deposit'); c.deposits.push({ id: c.uid++, amt: amt, rate: t.rate, until: CO.today() + t.w * 7, acc: 0 });
    CO.note(c, 'Размещён вклад ' + CO.m(amt) + ' на ' + t.w + ' нед. под ' + (t.rate * 100) + '% годовых.');
  };
  F.withdraw = function (id) {
    const c = CO.get(); if (!c) return; const i = c.deposits.findIndex(d => d.id === id); if (i < 0) return; const d = c.deposits[i];
    c.deposits.splice(i, 1); const back = Math.round(d.amt * 0.99); CO.cashIn(c, back, 'dep');
    CO.note(c, 'Вклад закрыт досрочно: проценты потеряны, комиссия 1%.', 'warn');
  };

  // ---------- Недельные обязательства
  F.wageFund = function (c) { return CO.DID.reduce((a, id) => a + c.depts[id].staff * CO.staff.headWage(c, id), 0) + CO.staff.payroll(c); };
  F.weekFixed = function (c) {
    return F.BUDGET.admin.cost[c.budget.admin] * CO.staff.finMul(c) + F.BUDGET.safety.cost[c.budget.safety] + F.BUDGET.social.cost[c.budget.social];
  };
  F.loanPay = c => c.loans.reduce((a, l) => a + Math.min(l.pay, l.left * (1 + l.rate / 52)), 0);
  F.nextNeed = function (c) { // сколько денег нужно на следующую неделю (оценка)
    const last = c.reports[0];
    const wages = F.wageFund(c), fixed = F.weekFixed(c) + F.PROPERTY;
    let maint = 0; CO.DEPTS.forEach(d => { maint += CO.prod.maintWeekCost(d.kind, c.depts[d.id].maint); });
    const energy = CO.supply.meltWeekNow ? 0 : (CO.supply.meltWeek(c) * CO.supply.RES.power.perMelt * c.inv.power.price * c.mods.energy);
    let buy = 0; CO.supply.RAW.concat(['cons', 'parts']).forEach(id => { const need = CO.supply.weeklyUse(c, id), gap = Math.max(0, need * 1.2 - c.inv[id].q - CO.supply.incoming(c, id)); buy += gap * CO.supply.price(c, id, c.inv[id].sup, 'std'); });
    const tax = last ? Math.max(0, last.tax) : 0;
    const proj = c.projects.act.reduce((a, p) => a + Math.round(CO.prod.proj(p.id).cost / CO.prod.proj(p.id).weeks), 0);
    return { wages: wages, fixed: fixed, maint: maint, energy: energy, buy: buy, loans: F.loanPay(c), tax: tax, proj: proj, arrears: c.arrears.wages + c.arrears.tax + c.arrears.other, total: wages + fixed + maint + energy + buy + F.loanPay(c) + tax + proj + c.arrears.wages + c.arrears.tax + c.arrears.other };
  };
  F.incomingCash = (c, days) => c.recv.filter(r => r.day <= CO.today() + days).reduce((a, r) => a + r.amt, 0);

  // уплата или создание задолженности
  F.payOrOwe = function (c, amt, kind, key, cat) {
    amt = Math.round(amt); if (amt <= 0) return;
    c.wk.exp[key] = (c.wk.exp[key] || 0) + amt;
    const pay = Math.max(0, Math.min(c.treasury, amt));
    if (pay > 0) CO.cashOut(c, pay, cat || key);
    if (pay < amt) c.arrears[kind] += amt - pay;
  };

  F.daily = function (c, d) { /* денежные потоки считаются в закрытии недели и по событиям суток */ };

  F.closeWeek = function (c, d) {
    const wk = c.wk, weekNo = Math.floor(d / 7) - 1, cashStart = c.cashStart != null ? c.cashStart : c.treasury;
    // 1) вклады
    let finInc = 0;
    c.deposits = c.deposits.filter(x => { const inc = x.amt * x.rate / 52; x.acc += inc; if (x.until <= d) { CO.cashIn(c, x.amt + x.acc, 'dep'); finInc += inc; return false; } finInc += inc; return true; });
    wk.finInc = Math.round(finInc);
    // 2) рынок, склад, продажи, кадры, проекты
    CO.supply.weekly(c); CO.sales.weekly(c); CO.staff.weekly(c);
    CO.prod.weekly(c);
    // 3) платежи по приоритету: старая зарплатная задолженность → зарплата → кредиты → налоги → прочее
    const a = c.arrears;
    a.tax = Math.round(a.tax * 1.015); a.other = Math.round(a.other * 1.015);
    if (a.wages > 0) { const v = Math.min(c.treasury, a.wages); if (v > 0) { CO.cashOut(c, v, 'arrears'); a.wages -= v; } }
    const wages = Math.round(F.wageFund(c));
    const hadWageArrears = a.wages > 0;
    F.payOrOwe(c, wages, 'wages', 'wages');
    // кредиты
    let interest = 0;
    c.loans.forEach(l => {
      const i = l.left * l.rate / 52; interest += i;
      const due = Math.min(l.left + i, l.weeks <= 1 ? l.left + i : l.pay);
      wk.exp.interest = (wk.exp.interest || 0) + Math.round(i);
      if (c.treasury >= due) { CO.cashOut(c, due, 'loan'); l.left = Math.max(0, l.left + i - due); l.late = 0; }
      else { l.late++; a.other += Math.round(due); c.rep = C(c.rep - 1); c.board.trust = C(c.board.trust - 1.2); CO.note(c, 'Просрочен платёж по кредиту «' + l.name + '»: ' + CO.m(due) + '. Банк недоволен.', 'bad', true); l.left = Math.max(0, l.left + i - due); }
      l.weeks--;
    });
    c.loans = c.loans.filter(l => l.left > 5000 || (l.late > 0 && l.left > 1));
    c.loans.forEach(l => { if (l.weeks <= 0 && l.left > 0) l.weeks = 4; if (!l.late) { /* пересчёт аннуитета при смене ставки не требуется */ } });
    // налог на прибыль (по начислению): доходы − расходы без капвложений
    const expSum = () => Object.keys(wk.exp).reduce((x, k) => x + wk.exp[k], 0);
    // прочие постоянные
    const fixed = Math.round(F.weekFixed(c));
    const bud = F.BUDGET, adminAmt = Math.round(bud.admin.cost[c.budget.admin] * CO.staff.finMul(c)), safeAmt = bud.safety.cost[c.budget.safety], socAmt = bud.social.cost[c.budget.social];
    F.payOrOwe(c, adminAmt, 'other', 'admin'); F.payOrOwe(c, safeAmt, 'other', 'safety'); F.payOrOwe(c, socAmt, 'other', 'social');
    const pre = wk.rev + (wk.finInc || 0) - expSum() - F.PROPERTY;
    const taxable = Math.max(0, pre - c.lossCF);
    c.lossCF = Math.max(0, c.lossCF - Math.max(0, pre)) + Math.max(0, -pre);
    const tax = Math.round(taxable * F.TAX + F.PROPERTY);
    F.payOrOwe(c, tax, 'tax', 'tax');
    // 4) автозакупки уже после обязательных платежей
    CO.supply.autoBuy(c);
    // 5) отчёт
    const expTotal = expSum();
    const profit = wk.rev + (wk.finInc || 0) - expTotal;
    const planPct = wk.plan > 0 ? wk.made / wk.plan : 0;
    const rep = {
      week: weekNo, from: d - 7, to: d - 1, rev: Math.round(wk.rev), exp: Object.assign({}, wk.exp), expTotal: Math.round(expTotal), finInc: wk.finInc || 0, profit: Math.round(profit), tax: tax, net: Math.round(profit),
      cashStart: Math.round(cashStart), cashEnd: Math.round(c.treasury), cin: Object.assign({}, wk.cin), cout: Object.assign({}, wk.cout), capex: wk.capex || 0,
      made: Math.round(wk.made), good: Math.round(wk.good), brak: Math.round(wk.brak), plan: Math.round(wk.plan), planPct: planPct, shipped: Math.round(wk.shipped), spotT: Math.round(wk.spotT),
      breakdowns: wk.breakdowns, accidents: wk.accidents, idle: wk.idle, notes: wk.notes.slice(), recv: Math.round(CO.sales.receivable(c)), why: c.lastRun && c.lastRun.why || '', bn: c.bottleneck
    };
    rep.brakPct = rep.made > 0 ? rep.brak / rep.made : 0;
    rep.line = F.joke(c, rep);
    c.reports.unshift(rep); if (c.reports.length > 26) c.reports.length = 26;
    c.stats.profit += profit; c.stats.weeks++;
    c.cashStart = c.treasury;
    // 6) счётчики кризиса
    c.negWeeks = c.treasury < 0 ? c.negWeeks + 1 : 0;
    c.wageLate = c.arrears.wages > 0 ? c.wageLate + 1 : 0;
    if (c.arrears.wages > 0) { c.morale = C(c.morale - 6); }
    c.stats.cashGapWeeks = profit > 0 && c.treasury < cashStart - 2e6 ? c.stats.cashGapWeeks + 1 : c.stats.cashGapWeeks;
    // 7) новая неделя
    c.wk = CO.newWk();
    CO.DID.forEach(id => { c.depts[id].wk = { made: 0, plan: 0, idle: 0, down: 0 }; });
    // 8) совет директоров, кризисы, события недели
    CO.ev.weekClose(c, rep, weekNo);
    // 9) уведомление об отчёте (один раз за неделю)
    F.showReport(rep);
  };

  F.joke = function (c, r) {
    const f = c.staff.fin.name || 'Финансовый директор';
    if (r.profit > 0 && r.cashEnd < r.cashStart - 3e6) return f + ' представил отчёт. Прибыль есть. Денег нет. Он утверждает, что это современная бухгалтерия.';
    if (r.planPct > 1.05 && r.brakPct > 0.07) return 'План выполнен на ' + CO.pc(r.planPct) + '. ОТК обнаружил, что ' + CO.pc(Math.min(0.5, r.brakPct * 4)) + ' продукции годится только как пресс-папье.';
    if (r.profit < 0 && r.cashEnd < 0) return 'Предприятие вышло на новый уровень финансовой устойчивости: касса научилась уходить в минус самостоятельно.';
    if (r.profit < 0) return 'Убыток. ' + f + ' называет его «временной инвестицией в будущие убытки».';
    if (r.breakdowns >= 2) return 'За неделю ' + r.breakdowns + ' поломки. Главный инженер уверяет, что оборудование просто «проявляет характер».';
    if (r.planPct < 0.8) return 'План выполнен на ' + CO.pc(r.planPct) + '. Начальник цеха ссылается на погоду, звёзды и политику Центробанка.';
    if (r.profit > 3e6) return 'Прибыль растёт. Бухгалтерия проверила отчёт дважды: цифры сошлись — это тревожнее любой аварии.';
    return 'Неделя прошла без героизма. Для завода это почти победа.';
  };
  F.showReport = function (r) {
    const sg = r.profit >= 0 ? '+' : '';
    G.modal({ title: '📑 ОТЧЁТ ЗА НЕДЕЛЮ ' + (r.week + 1), vib: r.profit >= 0 ? 'success' : 'warning', cls: r.profit >= 0 ? 'good' : 'bad', face: 'shurygina', wide: true,
      text: '<i>' + r.line + '</i><br><br>Выпуск: <b>' + CO.t(r.made) + '</b> (' + CO.pc(r.planPct) + ' плана), брак ' + CO.pc(r.brakPct) + '<br>Выручка: <b>' + CO.m(r.rev) + '</b> · Расходы: ' + CO.m(r.expTotal) + '<br>Финансовый результат: <b>' + sg + CO.m(r.profit) + '</b><br>Касса: ' + CO.m(r.cashStart) + ' → <b>' + CO.m(r.cashEnd) + '</b>',
      opts: [{ t: '📂 Открыть в кабинете', fn: () => { if (G.cab) G.cab.open('docs'); } }, { t: 'Принято к сведению', fn: () => {} }] });
  };
})();
