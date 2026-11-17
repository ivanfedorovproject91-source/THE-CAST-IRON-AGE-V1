/* ===== Этап 3: кредитная система =====
   Новые договоры (поле v:2): аннуитет, срок, график платежей, переплата на экране, реальная просрочка
   с пенями и реструктуризацией, лимит по доходу, ипотека, которую можно выплатить.
   Старые договоры (без поля v) считаются ПО СТАРЫМ ПРАВИЛАМ БЕЗ ИЗМЕНЕНИЙ (см. legacyPayment ниже —
   это дословно прежняя логика расчёта). Для них в банке есть добровольное переоформление
   на новые условия, которое никогда не ухудшает положение игрока.
   При первой загрузке сохранения создаётся резервная копия кредитов, денег и квартир (flags.loanBackup). */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const S = () => G.s;
  const rub = n => G.rub(Math.round(n));

  // ---------- Условия новых договоров
  const CASH = [
    { amount: 30000, rate: 0.36, terms: [3, 6, 12] },
    { amount: 100000, rate: 0.32, terms: [6, 12, 24] },
    { amount: 300000, rate: 0.28, terms: [12, 24, 36] }
  ];
  const MICRO = { amount: 5000, perDay: 0.01, capMult: 2, maxActive: 2 };
  const MORT = { price: 3000000, downPct: 0.15, rate: 0.14, term: 120, minRank: 7 };
  const LIMIT_CASH = 0.40, LIMIT_MORT = 0.55;       // доля месячного дохода «на руки», которую могут занимать платежи
  const LATE_FEE = 0.05, RESTR_FEE = 0.01, RESTR_EXT = 12;
  const L = G.LOANRULES = { CASH, MICRO, MORT, LIMIT_CASH, LIMIT_MORT, LATE_FEE, RESTR_FEE, RESTR_EXT };

  const TYPE = { bank: 'Кредит', micro: 'Микрозайм', mortgage: 'Ипотека' };
  const monthlyNet = () => Math.round(G.monthlyPay() * 0.87);

  // ---------- Математика
  const annuity = (P, r12, n) => { const r = r12 / 12; return r === 0 ? Math.ceil(P / n) : Math.ceil(P * r / (1 - Math.pow(1 + r, -n))); };
  // платёж не покрывает проценты → Infinity
  const monthsLeft = (left, r12, pay) => { const r = r12 / 12; if (left <= 0) return 0; if (pay <= left * r) return Infinity; return Math.ceil(-Math.log(1 - left * r / pay) / Math.log(1 + r) - 1e-9); };
  // график: [{n, interest, principal, pay, left}] (аннуитет, проценты начисляются до платежа)
  const schedule = (l, max) => {
    const rows = []; let left = l.left; const r = l.rate / 12;
    for (let n = 1; n <= (max || 600) && left > 5; n++) {
      const interest = Math.round(left * r), due = Math.min(l.pay, left + interest);
      left = left + interest - due; rows.push({ n, interest, principal: due - interest, pay: due, left: Math.max(0, left) });
    }
    return rows;
  };
  const totals = (l) => { const rows = schedule(l, 600); const pay = rows.reduce((a, x) => a + x.pay, 0); return { months: rows.length, pay, overpay: pay - l.left, inf: !!rows.length && rows[rows.length - 1].left > 5 }; };

  // прежняя логика платежей: только для проекции «как было бы по старым правилам» (используется для проверки переоформления)
  const legacyProjection = (l) => {
    let left = l.left, sum = 0;
    if (l.type === 'micro') return { pay: left, inf: false };
    for (let m = 0; m < 600 && left > 5; m++) { const p = Math.min(l.pay, left); sum += p; left -= p; left = Math.round(left * (1 + l.rate / 12)); }
    return { pay: sum, inf: left > 5 };
  };

  // ---------- Состояние, резервная копия и пометка старых договоров
  G.loanSchema = function () {
    const s = S(); if (!s) return;
    s.flags = s.flags || {}; s.loans = s.loans || [];
    if (s.flags.loanSchema === 2) return;
    const legacy = s.loans.filter(l => !l.v);
    if (legacy.length || (s.own && s.own.flat)) {
      // резервная копия ДО любых пометок
      try { s.flags.loanBackup = { at: Date.now(), day: s.t && s.t.day, money: s.money, debt: s.debt, flat: !!(s.own && s.own.flat), loans: JSON.parse(JSON.stringify(s.loans)) }; } catch (e) {}
    }
    s.loans.forEach(l => { if (!l.v) { l.legacy = true; if (!l.hist) l.hist = []; } });
    s.flags.loanSchema = 2;
  };
  const _load = G.load;
  G.load = function () { const r = _load.apply(this, arguments); try { G.loanSchema(); } catch (e) { if (window.console) console.error(e); } return r; };
  const _ns = G.newState;
  if (_ns) G.newState = function () { const r = _ns.apply(this, arguments); try { G.loanSchema(); } catch (e) {} return r; };

  const hist = (l, rec) => { l.hist = l.hist || []; l.hist.push(rec); if (l.hist.length > 48) l.hist.shift(); };
  const activePay = () => S().loans.reduce((a, l) => a + (l.type === 'micro' ? 0 : (l.pay || 0)), 0);
  const lateAny = () => S().loans.some(l => (l.late || 0) >= 3);

  // ---------- Расчёт в день зарплаты (вызывается из G.payday)
  G.loanSettle = function () {
    const s = S(); let txt = '';
    s.loans.forEach(l => {
      if (l.v === 2) { txt += settleNew(l); return; }
      // --- прежняя логика, дословно ---
      if (l.type === 'micro') { const pay = Math.min(s.money, l.left); s.money -= pay; l.left -= pay; txt += '<br>Микрозайм: удержано ' + G.rub(pay); }
      if (l.type === 'bank' || l.type === 'mortgage') { const pay = Math.min(l.pay, l.left); if (s.money >= pay) { s.money -= pay; l.left -= pay; txt += '<br>Платёж по кредиту: ' + G.rub(pay); } else { l.late = (l.late || 0) + 1; txt += '<br>⚠ Просрочка платежа по кредиту!'; } l.left = Math.round(l.left * (1 + l.rate / 12)); }
    });
    s.loans = s.loans.filter(l => l.left > 5);
    return txt;
  };

  function settleNew(l) {
    const s = S();
    if (l.type === 'micro') {
      const pay = Math.min(s.money, l.left); s.money -= pay; l.left -= pay;
      hist(l, { day: s.t.day, pay, late: l.left > 5 });
      if (l.left > 5) { l.late = (l.late || 0) + 1; return '<br>⚠ Микрозайм: удержано ' + rub(pay) + ', остаток ' + rub(l.left) + ' (просрочка, проценты идут)'; }
      return '<br>Микрозайм погашен: ' + rub(pay);
    }
    const interest = Math.round(l.left * l.rate / 12), due = Math.min(l.pay, l.left + interest);
    if (s.money >= due) {
      s.money -= due; l.left = Math.max(0, l.left + interest - due); l.late = 0; l.paidTotal = (l.paidTotal || 0) + due; l.intTotal = (l.intTotal || 0) + interest;
      hist(l, { day: s.t.day, pay: due, interest, principal: due - interest, left: l.left });
      return '<br>' + TYPE[l.type] + ': платёж ' + rub(due) + ' (проценты ' + rub(interest) + ', долг ' + rub(due - interest) + '), остаток ' + rub(l.left);
    }
    const fee = Math.round(l.pay * LATE_FEE);
    l.left += interest + fee; l.late = (l.late || 0) + 1; l.feesTotal = (l.feesTotal || 0) + fee;
    hist(l, { day: s.t.day, pay: 0, interest, fee, late: true, left: l.left });
    G.fx({ mood: -3, cons: -1 });
    return '<br>⚠ ' + TYPE[l.type] + ': нет денег на платёж ' + rub(due) + '. Пени ' + rub(fee) + ', проценты ' + rub(interest) + ' добавлены к долгу. Просрочка: ' + l.late + ' мес. подряд. В банке можно оформить реструктуризацию.';
  }

  // ежедневные проценты нового микрозайма: простые, не больше 2× суммы займа
  G.loanDailyMicro = function (l) {
    const cap = Math.round(l.principal * MICRO.capMult);
    l.left = Math.min(cap, Math.round(l.left + l.principal * MICRO.perDay));
  };

  // ---------- Оформление новых договоров
  const nextSettle = () => { const w = G.week() % 4; return w === 3 ? 'в этот расчётный день' : 'в ближайший расчётный день (3-я неделя месяца)'; };
  const limitCheck = (newPay, ratio) => {
    const net = monthlyNet(), cap = Math.round(net * ratio), used = activePay();
    return { ok: used + newPay <= cap, cap, used };
  };

  const sign = (contract, extra) => {
    const s = S(); s.loans.push(contract);
    G.addMoney(contract.type === 'mortgage' ? 0 : contract.principal);
    if (extra) extra();
    s.flags.loanSchema = 2;
  };

  const offerCash = (c, term) => {
    const s = S(), pay = annuity(c.amount, c.rate, term);
    const tot = pay * term, over = tot - c.amount, lim = limitCheck(pay, LIMIT_CASH);
    G.modal({
      title: 'Условия кредита',
      text: 'Сумма: <b>' + rub(c.amount) + '</b><br>Ставка: <b>' + Math.round(c.rate * 100) + '% годовых</b><br>Срок: <b>' + term + ' мес.</b><br>Платёж: <b>' + rub(pay) + ' в месяц</b> (списывается в расчётный день)<br>Всего отдашь: <b>' + rub(tot) + '</b><br>Переплата: <b>' + rub(over) + '</b><br>Первый платёж — ' + nextSettle() + '.<br><i>Платежи по всем кредитам: ' + rub(lim.used + pay) + ' из допустимых ' + rub(lim.cap) + ' (' + Math.round(LIMIT_CASH * 100) + '% дохода).</i>',
      opts: [
        { t: '✍ Оформить', dis: lim.ok ? null : 'Платежи превысят ' + Math.round(LIMIT_CASH * 100) + '% дохода', fn: () => { sign({ v: 2, type: 'bank', principal: c.amount, left: c.amount, rate: c.rate, pay, term, late: 0, hist: [], start: s.t.day, paidTotal: 0, intTotal: 0 }); G.fx({ cons: -1 }); G.toast('Кредит одобрен: ' + rub(c.amount) + ', платёж ' + rub(pay) + '/мес.', 'warn'); } },
        { t: 'Назад', fn: () => offerCashTerms(c) }
      ]
    });
  };
  const offerCashTerms = (c) => {
    G.modal({
      title: 'Срок кредита ' + rub(c.amount), text: 'Ставка <b>' + Math.round(c.rate * 100) + '%</b> годовых. Чем дольше срок, тем меньше платёж и больше переплата.',
      opts: c.terms.map(t => { const p = annuity(c.amount, c.rate, t); return { t: t + ' мес. — ' + rub(p) + '/мес, переплата ' + rub(p * t - c.amount), fn: () => offerCash(c, t) }; }).concat([{ t: 'Назад', fn: () => G.bankMenu() }])
    });
  };

  const offerMicro = () => {
    const s = S(), act = s.loans.filter(l => l.type === 'micro');
    const max = Math.round(MICRO.amount * (MICRO.perDay * 100) / 100 * 28);
    G.modal({
      title: 'Микрозайм «До зарплаты»',
      text: 'Сумма: <b>' + rub(MICRO.amount) + '</b> на руки сразу.<br>Ставка: <b>' + (MICRO.perDay * 100) + '% в день</b> (≈ ' + Math.round(MICRO.perDay * 36500) + '% годовых).<br>Спишется целиком в ближайший расчётный день. Если не хватит денег — долг остаётся, проценты идут дальше, но не больше <b>' + rub(MICRO.amount * MICRO.capMult) + '</b> всего.<br>За 28 дней проценты ≈ ' + rub(max) + '.<br><i>Это самый дорогой способ занять. Только на крайний случай.</i>',
      opts: [
        { t: '✍ Взять ' + rub(MICRO.amount), dis: act.length >= MICRO.maxActive ? 'Не больше ' + MICRO.maxActive + ' займов одновременно' : (act.some(l => l.late) ? 'Есть просроченный микрозайм' : null), fn: () => { sign({ v: 2, type: 'micro', principal: MICRO.amount, left: MICRO.amount, rate: 0, pay: 0, late: 0, hist: [], start: s.t.day }); G.toast('Микрозайм получен. Проценты капают каждый день.', 'warn'); } },
        { t: 'Назад', fn: () => G.bankMenu() }
      ]
    });
  };

  const offerMortgage = () => {
    const s = S(), down = Math.round(MORT.price * MORT.downPct), loan = MORT.price - down, pay = annuity(loan, MORT.rate, MORT.term);
    const tot = pay * MORT.term, lim = limitCheck(pay, LIMIT_MORT);
    G.modal({
      title: 'Ипотека: квартира в центре',
      text: 'Цена квартиры: <b>' + rub(MORT.price) + '</b><br>Первый взнос ' + Math.round(MORT.downPct * 100) + '%: <b>' + rub(down) + '</b> (платится сразу)<br>Кредит: <b>' + rub(loan) + '</b> под <b>' + Math.round(MORT.rate * 100) + '%</b> на <b>' + MORT.term / 12 + ' лет</b><br>Платёж: <b>' + rub(pay) + ' в месяц</b><br>Всего отдашь банку: <b>' + rub(tot) + '</b>, переплата <b>' + rub(tot - loan) + '</b><br><i>Платежи по всем кредитам: ' + rub(lim.used + pay) + ' из допустимых ' + rub(lim.cap) + ' (' + Math.round(LIMIT_MORT * 100) + '% дохода).</i><br>Квартира остаётся твоей и после выплаты.',
      opts: [
        { t: '✍ Оформить ипотеку', dis: s.own.flat ? 'Квартира уже есть' : s.car.rank < MORT.minRank ? 'Нужен ранг ' + MORT.minRank + '+' : s.money < down ? 'Нужен первый взнос ' + rub(down) : !lim.ok ? 'Платёж превысит ' + Math.round(LIMIT_MORT * 100) + '% дохода' : lateAny() ? 'Есть серьёзная просрочка' : null,
          fn: () => { s.money -= down; s.stats.spent += down; sign({ v: 2, type: 'mortgage', principal: loan, left: loan, rate: MORT.rate, pay, term: MORT.term, late: 0, hist: [], start: s.t.day, paidTotal: 0, intTotal: 0 }, () => { s.own.flat = 1; G.fx({ mood: 15, cool: 10 }); G.achieve('flat', 'Квартира в центре (в ипотеку)'); }); G.toast('Квартира в центре! Платёж — ' + rub(pay) + ' в месяц.', 'warn'); } },
        { t: 'Назад', fn: () => G.bankMenu() }
      ]
    });
  };

  // ---------- Карточка договора
  const contractLine = (l) => {
    if (l.type === 'micro') return TYPE.micro + ': долг ' + rub(l.left) + (l.v ? ' (' + (MICRO.perDay * 100) + '%/день, максимум ' + rub(l.principal * MICRO.capMult) + ')' : ' (старые условия: 1,5%/день)');
    const t = totals(l);
    return TYPE[l.type] + (l.v ? '' : ' (старый договор)') + ': остаток ' + rub(l.left) + ', платёж ' + rub(l.pay) + '/мес, ' + (t.inf ? 'платёж не покрывает проценты' : 'осталось ≈ ' + t.months + ' мес., переплата ещё ≈ ' + rub(t.overpay)) + ((l.late || 0) ? ', ⚠ просрочка ' + l.late : '');
  };

  const showSchedule = (l) => {
    const rows = schedule(l, 12), t = totals(l);
    let h = TYPE[l.type] + ': остаток <b>' + rub(l.left) + '</b>, ставка ' + Math.round(l.rate * 1000) / 10 + '%, платёж ' + rub(l.pay) + '.<br><br>';
    h += '<table style="width:100%;font-size:13px"><tr><td>№</td><td>Платёж</td><td>Проценты</td><td>Долг</td><td>Остаток</td></tr>' + rows.map(r => '<tr><td>' + r.n + '</td><td>' + rub(r.pay) + '</td><td>' + rub(r.interest) + '</td><td>' + rub(r.principal) + '</td><td>' + rub(r.left) + '</td></tr>').join('') + '</table>';
    h += '<br>' + (t.inf ? '<b>Платёж не покрывает проценты — долг не уменьшается.</b>' : 'Всего платежей впереди: <b>' + t.months + '</b>, сумма <b>' + rub(t.pay) + '</b>, из них переплата <b>' + rub(t.overpay) + '</b>.');
    if (l.hist && l.hist.length) h += '<br><br><b>История платежей (последние):</b><br>' + l.hist.slice(-6).map(x => 'день ' + x.day + ': ' + (x.late ? 'просрочка' + (x.fee ? ', пени ' + rub(x.fee) : '') : rub(x.pay))).join('<br>');
    G.modal({ title: 'График платежей', text: h, wide: true, opts: [{ t: 'Назад', fn: () => contractMenu(l) }] });
  };

  const prepay = (l, amt) => {
    const s = S(), p = Math.min(amt, l.left, s.money); if (p <= 0) return;
    s.money -= p; l.left -= p; hist(l, { day: s.t.day, pay: p, early: true, left: l.left });
    if (l.left <= 5) { s.loans.splice(s.loans.indexOf(l), 1); G.toast((TYPE[l.type]) + ' погашен.', 'good'); } else G.toast('Досрочный платёж: ' + rub(p) + '. Срок сократился, платёж прежний.', 'good');
  };

  const restructure = (l) => {
    const s = S(), months = monthsLeft(l.left, l.rate, l.pay), base = isFinite(months) ? months : 0, n = Math.min(240, base + RESTR_EXT);
    const fee = Math.round(l.left * RESTR_FEE); l.left += fee; const pay = annuity(l.left, l.rate, Math.max(12, n));
    l.pay = Math.min(l.pay, pay); l.late = 0; l.restr = (l.restr || 0) + 1;
    hist(l, { day: s.t.day, pay: 0, restr: true, fee, left: l.left });
    G.toast('Реструктуризация: срок продлён, платёж ' + rub(l.pay) + '/мес, просрочка снята (комиссия ' + rub(fee) + ').', 'good');
  };

  // переоформление старого договора на новые условия: ставка не выше прежней, платёж не выше прежнего, итог не дороже
  G.loanConvertPlan = function (l) {
    if (!l || l.v || l.type === 'micro') return null;
    const newRate = Math.min(l.rate, l.type === 'mortgage' ? MORT.rate : 0.30);
    const maxTerm = l.type === 'mortgage' ? 240 : 60;
    let n = null;
    for (let t = 3; t <= maxTerm; t++) { if (annuity(l.left, newRate, t) <= l.pay) { n = t; break; } }
    if (n === null) return { ok: false, why: 'Новый платёж не получается ниже прежнего' };
    const pay = annuity(l.left, newRate, n), cand = { left: l.left, rate: newRate, pay };
    const nt = totals(cand), ot = legacyProjection(l);
    if (!ot.inf && nt.pay > ot.pay) return { ok: false, why: 'Переоформление вышло бы дороже прежних условий', rate: newRate, pay, term: n };
    return { ok: true, rate: newRate, pay, term: n, newTotal: nt.pay, oldTotal: ot.inf ? null : ot.pay, oldInf: ot.inf };
  };
  const convert = (l) => {
    const s = S(), plan = G.loanConvertPlan(l); if (!plan || !plan.ok) return;
    l.orig = { rate: l.rate, pay: l.pay, left: l.left, type: l.type };
    l.rate = plan.rate; l.pay = plan.pay; l.term = plan.term; l.v = 2; l.legacy = false; l.conv = true;
    hist(l, { day: s.t.day, pay: 0, conv: true, left: l.left });
    G.toast('Договор переоформлен: ставка ' + Math.round(plan.rate * 1000) / 10 + '%, платёж ' + rub(plan.pay) + '/мес.', 'good');
  };

  const contractMenu = (l) => {
    const s = S(); if (s.loans.indexOf(l) < 0) { G.bankMenu(); return; }
    const o = [], opts = [];
    if (l.type !== 'micro') o.push({ t: '📅 График платежей', fn: () => showSchedule(l) });
    [10000, 50000].forEach(a => { if (a < l.left) o.push({ t: 'Внести досрочно ' + rub(a), dis: s.money < a ? 'Нет денег' : null, fn: () => { prepay(l, a); G.bankMenu(); } }); });
    o.push({ t: 'Погасить полностью (' + rub(l.left) + ')', dis: s.money < l.left ? 'Нужно ' + rub(l.left) : null, fn: () => { prepay(l, l.left); G.bankMenu(); } });
    if (l.v === 2 && l.type !== 'micro' && !(l.restr >= 1) && ((l.late || 0) >= 1 || l.pay > monthlyNet() * 0.5)) o.push({ t: '🤝 Реструктуризация (+' + RESTR_EXT + ' мес., комиссия 1%)', fn: () => { restructure(l); G.bankMenu(); } });
    if (!l.v && l.type !== 'micro') {
      const p = G.loanConvertPlan(l);
      o.push({ t: '🔄 Переоформить на новые условия' + (p && p.ok ? ' (платёж ' + rub(p.pay) + ', ' + Math.round(p.rate * 1000) / 10 + '%)' : ''), dis: p && p.ok ? null : (p ? p.why : '—'), fn: () => { convert(l); G.bankMenu(); } });
    }
    o.push({ t: 'Назад', fn: () => G.bankMenu() });
    G.modal({ title: TYPE[l.type] + (l.v ? '' : ' (старый договор)'), text: contractLine(l) + (!l.v && l.type !== 'micro' ? '<br><i>Старый договор действует как прежде. Переоформление добровольное и не ухудшает условий; прежние данные сохраняются в резервной копии.</i>' : ''), opts: o, wide: true });
  };

  // ---------- Главное меню банка
  G.bankMenu = function () {
    const s = S(); G.loanSchema();
    const loans = s.loans, o = [];
    const t = 'Рублёв улыбается: <i>«Для вас — особые условия!»</i><br>Долги: ' + G.rub(s.debt) + ' · Договоров: ' + loans.length + '<br>Доход на руки ≈ ' + rub(monthlyNet()) + '/мес · платежи по кредитам: ' + rub(activePay()) + '/мес' + (loans.length ? '<br>' + loans.map(l => '• ' + contractLine(l)).join('<br>') : '');
    loans.forEach(l => o.push({ t: '📄 ' + TYPE[l.type] + ': ' + rub(l.left), fn: () => contractMenu(l) }));
    const blocked = lateAny() ? 'Есть серьёзная просрочка — сначала реструктуризация' : null;
    o.push({ t: '💳 Кредит наличными (от 30 000 ₽)', dis: s.car.rank < 1 ? 'Стажёрам не дают' : blocked, fn: () => G.modal({ title: 'Кредит наличными', text: 'Выбери сумму. Ставка зависит от суммы, срок выберешь дальше. Все платежи считаются аннуитетом: каждый месяц одинаковая сумма.', opts: CASH.map(c => ({ t: rub(c.amount) + ' — ' + Math.round(c.rate * 100) + '%', fn: () => offerCashTerms(c) })).concat([{ t: 'Назад', fn: () => G.bankMenu() }]) }) });
    o.push({ t: '⚡ Микрозайм 5 000 ₽ (1%/день)', fn: offerMicro });
    if (s.car.rank >= MORT.minRank) o.push({ t: '🏠 Ипотека: квартира в центре', dis: s.own.flat ? 'Уже есть' : blocked, fn: offerMortgage });
    if (s.debt > 0) o.push({ t: 'Погасить долг (' + G.rub(Math.min(s.debt, s.money)) + ')', dis: s.money < 1 ? 'Нет денег' : null, fn: () => { const p = Math.min(s.debt, s.money); s.money -= p; s.debt -= p; G.toast('Долг погашен частично/полностью: ' + G.rub(p)); } });
    o.push({ t: 'Выйти', fn: () => {} });
    G.modal({ title: '🏦 «Рубль-Банк»', face: 'rublev', text: t, opts: o, wide: true });
  };

  G.loanInfo = { annuity, schedule, totals, monthsLeft, legacyProjection, restructure, prepay, convert, offerCash: (a, t) => offerCash(CASH.filter(c => c.amount === a)[0], t) };
})();
