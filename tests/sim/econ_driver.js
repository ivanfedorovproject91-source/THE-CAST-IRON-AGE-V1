/* Драйвер экономической симуляции «Чугунного века».
   Вызывает НАСТОЯЩИЕ функции игры (G.endShift, G.payday, G.sleep, G.rollEvent, G.runAction, банк).
   Упрощения (честно): утро/проходная пропускаются (G.enterWork), на смене выполняются только операции
   и проверка чертежа, питание/досуг — по сценарию игрока, окна событий решаются по простому правилу. */
window.__sim = function (cfg) {
  'use strict';
  // детерминированный Math.random
  let ms = (cfg.seed * 2654435761) >>> 0 || 1;
  Math.random = function () { ms = (ms + 0x6d2b79f5) | 0; let t = Math.imul(ms ^ (ms >>> 15), 1 | ms); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const D = G.D, noop = () => {};
  G.headless = true; G.CONFIG.API_URL = ''; G.CONFIG.CHAT_URL = '';
  G.toast = noop; G.buzz = noop; if (G.ui) { G.ui.render = noop; G.ui.showModal = noop; G.ui.hideModal = noop; }
  G.mq.length = 0; G.cur = null; G.busy = false;
  const edu = D.EDU.find(e => e.id === cfg.edu) || D.EDU[0];
  const s = G.newState('Sim', {}, edu.id); s.rs = (cfg.seed * 7919) | 0;
  Object.assign(s.car, { job: cfg.job });
  s.instr.perv = 1; s.instr.vvod = 1;
  if (cfg.start) {
    Object.assign(s.car, cfg.start.car || {}); Object.assign(s.st, cfg.start.st || {});
    if (cfg.start.money != null) s.money = cfg.start.money;
    (cfg.start.certs || []).forEach(c => { if (s.car.certs.indexOf(c) < 0) s.car.certs.push(c); });
    s.car.ladderStepAt = s.car.shifts;
  }
  // ---------- журнал денег
  const MONTH = 28, led = {}; const L = { tag: 'прочее' };
  const mk = () => Math.floor(s.t.day / MONTH);
  const E = k => led[k] || (led[k] = { in: {}, out: {}, loan: 0, accrued: 0, shifts: 0, ops: 0, fines: 0 });
  const _am = G.addMoney;
  G.addMoney = function (v) { if (cfg.trace && v >= 4000 && L.tag !== 'выплата') (stats.titles = stats.titles || []).push(s.t.day + ' h' + s.t.hour + ' INCOME +' + Math.round(v) + ' tag=' + L.tag + ' @' + new Error().stack.split('\n').slice(2, 6).map(x => x.trim().replace(/^at /, '').replace(/http:\/\/[^/]+\//, '').replace('?v=3.14.0', '')).join(' < ')); const e = E(mk()); v = Math.round(v); let t = L.tag; if (t === 'прочее' && /G\.payday/.test(new Error().stack || '')) t = 'выплата'; if (t === 'выплата' && v < 0) t = (v === -(G.fixedCosts ? G.fixedCosts().total : 5500) ? 'общага+связь+проезд' : 'удержания (штрафы/долг)'); const b = v >= 0 ? e.in : e.out; b[t] = (b[t] || 0) + Math.abs(v); if (L.pay) L.pay.add += v; return _am.call(G, v); };
  const _pd = G.payday;
  G.payday = function () {
    const e = E(mk()), before = s.money, debt0 = s.debt, loans0 = s.loans.reduce((a, l) => a + l.left, 0); L.pay = { add: 0 }; const old = L.tag; L.tag = 'выплата';
    const acc = s.pay.acc, wk = G.week() % 4;
    try { return _pd.apply(this, arguments); } finally {
      const ad = L.pay.add; if (cfg.trace) (stats.titles = stats.titles || []).push(s.t.day + ' PAYDAY wk' + wk + ' acc=' + Math.round(acc) + ' adv=' + Math.round(s.pay.adv || 0) + ' received=' + Math.round(ad) + ' pen=' + Math.round(s.pay.pen) + ' rank=' + s.car.rank); const paid = Math.max(0, before + ad - s.money);
      if (wk === 3) { e.accrued += acc; }
      e.loan += paid; L.tag = old; L.pay = null;
    }
  };
  const _end = G.endShift;
  G.endShift = function () { const e = E(mk()); const r = _end.apply(this, arguments); e.shifts++; return r; };
  if (cfg.trace) { const _fx = G.fx; G.fx = function (o) { const m0 = s.st.mood; const r = _fx.apply(this, arguments); if (m0 - s.st.mood >= 8) (stats.titles = stats.titles || []).push(s.t.day + ' h' + s.t.hour + ' FX mood ' + Math.round(m0) + '->' + Math.round(s.st.mood) + ' ' + JSON.stringify(o).slice(0, 80) + ' @' + (new Error().stack.split('\n').slice(2, 5).map(x => x.trim().replace(/^at /, '').replace(/http:\/\/[^/]+\//, '')).join(' < '))); return r; }; }
  if (cfg.trace) { const _adv = G.advance; G.advance = function (h) { const m0 = s.st.mood, e0 = s.st.energy, sat0 = s.st.satiety; const r = _adv.apply(this, arguments); if (s.t.day >= 13 && s.t.day <= 14) (stats.titles = stats.titles || []).push(s.t.day + ' ADV h' + s.t.hour + ' mood ' + m0.toFixed(1) + '->' + s.st.mood.toFixed(1) + ' en ' + Math.round(e0) + '->' + Math.round(s.st.energy) + ' sat ' + Math.round(sat0) + '->' + Math.round(s.st.satiety) + ' drunk' + Math.round(s.st.drunk)); return r; }; }
  if (cfg.trace) { let mv = s.st.mood; Object.defineProperty(s.st, 'mood', { get() { return mv; }, set(v) { if (mv - v >= 25) (stats.titles = stats.titles || []).push(s.t.day + ' h' + s.t.hour + ' MOODSET ' + Math.round(mv) + '->' + Math.round(v) + ' @' + new Error().stack.split('\n').slice(2, 7).map(x => x.trim().replace(/^at /, '').replace(/http:\/\/[^/]+\//, '')).join(' < ')); mv = v; }, enumerable: true }); }
  if (cfg.trace) { let rv = s.car.rep; Object.defineProperty(s.car, 'rep', { get() { return rv; }, set(v) { if (v !== rv) (stats.titles = stats.titles || []).push(s.t.day + ' h' + s.t.hour + ' REP ' + rv + '->' + v + ' @' + new Error().stack.split('\n').slice(2, 6).map(x => x.trim().replace(/^at /, '').replace(/http:\/\/[^/]+\//, '').replace('?v=3.14.0', '')).join(' < ')); rv = v; }, enumerable: true }); }
  if (cfg.trace && cfg.tracePen) { let pv = s.pay.pen; Object.defineProperty(s.pay, 'pen', { get() { return pv; }, set(v) { if (v - pv >= 500) (stats.titles = stats.titles || []).push(s.t.day + ' h' + s.t.hour + ' PEN +' + Math.round(v - pv) + ' @' + new Error().stack.split('\n').slice(2, 5).map(x => x.trim().replace(/^at /, '').replace(/http:\/\/[^/]+\//, '').replace('?v=3.14.0', '')).join(' < ')); pv = v; }, enumerable: true }); }
  const ACC = {};
  if (cfg.traceAcc) { let av = s.pay.acc; Object.defineProperty(s.pay, 'acc', { get() { return av; }, set(v) { const d = v - av; if (d > 0) { const k = new Error().stack.split('\n').slice(2, 4).map(x => x.trim().replace(/^at /, '').replace(/http:\/\/[^/]+\//, '').replace('?v=3.14.0', '').replace(/:\d+$/, '')).join(' < '); const a = ACC[k] || (ACC[k] = [0, 0]); a[0]++; a[1] += d; } av = v; }, enumerable: true }); }
  // ---------- решатель окон
  const BAD = /^взять$|взятк|конверт|украст|своровать|стащить|напиться|водк|уволь|запанибрата|нагруб|послать|обмануть|соврать|подраться|ударить/i;
  const QB = () => { const L2 = window.__LADDER || {}; return [].concat(window.__NQ || [], D.QUIZ || [], L2.WORK_Q || [], L2.WORK_HARD || [], L2.MGMT_Q || [], L2.MGMT_HARD || []); };
  let QCACHE = null;
  function examIdx(opts) {
    if (!QCACHE) QCACHE = QB();
    const labels = opts.map(o => o.t);
    const q = QCACHE.find(q => q[1].every(x => labels.indexOf(x) >= 0));
    if (!q) return -1;
    const right = labels.indexOf(q[1][q.length > 2 ? q[2] : 0]);
    if (G.rnd() < cfg.exam) return right;
    const wrong = labels.map((_, i) => i).filter(i => i !== right); return wrong[Math.floor(G.rnd() * wrong.length)];
  }
  const stats = { modals: 0, exams: 0, examFail: 0, caps: 0 };
  let lastKey = '', rep = 0;
  function resolve() {
    let g = 0;
    while ((G.cur || G.mq.length) && g++ < 300 && !s.end) {
      if (!G.cur) { G.pump(); continue; }
      const sp = G.cur; stats.modals++; if (cfg.trace) { (stats.titles = stats.titles || []).push(s.t.day + ' h' + s.t.hour + ' mood' + Math.round(s.st.mood) + ': ' + String(sp.title || '').slice(0, 50) + ' -> ' + (sp.opts || []).map(x => String(x.t).slice(0, 25)).join(' / ').slice(0, 110)); }
      if (sp.type === 'mini') { G.choose(0, { score: cfg.skill }); continue; }
      const o = sp.opts || []; let idx = -1;
      if (/вопрос \d\/5|Мини-экзамен/.test(sp.title || '')) { idx = examIdx(o); stats.exams++; }
      if (idx < 0) { idx = o.findIndex(x => !x.dis && !BAD.test(String(x.t))); }
      if (idx < 0) idx = o.findIndex(x => !x.dis);
      const key = String(sp.title || ''); rep = key === lastKey ? rep + 1 : 0; lastKey = key;
      if (rep >= 3 && o.length) idx = o.length - 1 - (rep - 3) % o.length; // окно повторяется — берём другие варианты
      G.choose(idx < 0 ? 0 : idx);
    }
    if (g >= 300) stats.caps++;
  }
  // ---------- питание и досуг
  const IT = D.ITEMS, MENU = Object.fromEntries(D.MENU.map(m => [m.id, m]));
  const buy = (id, tag) => { const it = IT[id]; if (!it || s.money < it.p) return false; L.tag = tag || 'питание'; G.addMoney(-it.p); G.fx(it.use || {}); return true; };
  const canteen = (id) => { const m = MENU[id]; if (!m || s.money < m.p || (s.day.canteen || 0) >= (G.CONFIG.CANTEEN_LIMIT || 99)) return false; L.tag = 'питание'; G.addMoney(-m.p); G.fx(m.fx || {}); s.day.canteen = (s.day.canteen || 0) + 1; return true; };
  const act = (id, tag) => { const a = G.ACT[id]; if (!a) return false; if (a.loc) s.loc = a.loc; if (G.avail(a)) return false; const b = s.money; L.tag = tag || 'досуг'; G.runAction(id); resolve(); return true; };
  const P = cfg.policy;
  function lunch() { (P.lunch || []).forEach(id => { if (s.st.satiety < (P.lunchSat || 80)) canteen(id); }); }
  function eatHome() {
    let g = 0;
    while ((s.st.satiety < (P.eatBelow || 55) || (s.flags.starveH || 0) >= 8) && g++ < 4) {
      if (G.homeMealLeft() > 0 && act('cook', 'питание')) continue;
      const it = (P.homeItems || []).find(id => IT[id] && s.money >= IT[id].p);
      if (it && buy(it)) continue; break;
    }
  }
  function freeTime() {
    let g = 0;
    while (s.t.hour < 22 && g++ < 12 && !s.end) {
      if (s.phase !== 'evening' && s.phase !== 'weekend') break;
      eatHome();
      if (s.st.neat < 62 && act('shower', 'прочее')) continue;
      if (s.st.health < 35 && s.money >= 1500 && P.hospital && act('hosp', 'лечение')) continue;
      const plan = (P.plan[G.weekday()] || []).slice(); let did = false;
      for (const id of plan) { const key = 'p' + id; if (s.day[key]) continue; s.day[key] = 1; const tag = ({ cafe_eat: 'питание вне дома', rest_eat: 'питание вне дома', kino: 'досуг', ryum: 'досуг', bath: 'здоровье/быт', shashlik: 'досуг', market_buy: 'одежда', dk_dance: 'досуг', billiard: 'досуг' })[id] || 'досуг'; if (act(id, tag)) { did = true; break; } }
      if (did) continue;
      if (P.coffee && s.st.energy < 35 && buy('coffee', 'питание')) continue;
      if (!act('rest', 'прочее')) break;
    }
  }
  function extras() { // разовые решения по сценарию
    const d = s.t.day;
    (cfg.events || []).forEach(ev => {
      if (ev.day !== d) return;
      if (ev.loan) { s.car.rank >= (ev.minRank || 0) && bankOpt(ev.loan); }
      if (ev.fine) { L.tag = 'штрафы'; G.addMoney(-ev.fine); E(mk()).fines += ev.fine; }
      if (ev.sick) { s.car.sickUntil = d + ev.sick; }
      if (ev.buy) { L.tag = ev.tag || 'покупки'; G.addMoney(-ev.buy); }
    });
    if (cfg.finePerMonth && d % MONTH === 9) { L.tag = 'штрафы'; G.addMoney(-cfg.finePerMonth); E(mk()).fines += cfg.finePerMonth; G.fx({ boss: -4, mood: -4 }); }
    if (cfg.sickPerMonth && d % MONTH === 14) { s.car.sickUntil = d + cfg.sickPerMonth; s.st.health = Math.max(20, s.st.health - 25); }
  }
  function bankOpt(prefix) {
    s.loc = 'c_bank'; G.bankMenu(); const sp = G.cur; if (!sp) return;
    const i = (sp.opts || []).findIndex(o => String(o.t).indexOf(prefix) === 0 && !o.dis);
    if (i >= 0) { L.tag = 'кредит(получено)'; G.choose(i); } else { G.choose((sp.opts || []).length - 1); }
    resolve();
  }
  // ---------- день
  const snaps = {}, mon = [], trace = [];
  const need = new Set(cfg.snapDays || [30, 90, 180, 365]);
  let noLunch = 0, minMoney = s.money, hungry = 0, sad = 0, lowH = 0, zeroMoney = 0, workDays = 0, endDay = null;
  G.startDay(); resolve();
  const sample = (e) => { const st = s.st; e.hp = (e.hp || 0) + st.health; e.en = (e.en || 0) + st.energy; e.md = (e.md || 0) + st.mood; e.sat = (e.sat || 0) + st.satiety; e.n = (e.n || 0) + 1; };
  for (let day = 0; day < cfg.days && !s.end; day++) {
    extras(); resolve();
    if (s.phase === 'morning') { if (G.weekday() === 2 && !P.careless) { s.phase = 'locker'; s.loc = 'locker'; L.tag = 'прочее'; G.runAction('prep_wed'); resolve(); if (s.phase !== 'work') G.enterWork(); } else G.enterWork(); }
    let n = 0, first = true;
    while ((s.phase === 'work' || s.phase === 'lunch') && !s.end && n++ < 40) {
      if (s.phase === 'lunch') { lunch(); G.endLunch(); resolve(); continue; }
      if (first) { first = false; workDays++; if (!P.careless && s.dwg.bad && G.ACT.check_dwg && !G.avail(G.ACT.check_dwg)) { G.runAction('check_dwg'); resolve(); if (s.phase !== 'work') continue; } }
      if (!P.careless && s.st.tox > 15 && G.ACT.milk && !G.avail(G.ACT.milk)) { L.tag = 'прочее'; G.runAction('milk'); resolve(); if (s.phase !== 'work') continue; }
      if (s.st.satiety < 32 && !s.day.snacked) { s.day.snacked = 1; const sn = (P.snack || 'pirozhki'); if (!buy(sn)) buy('pirozhki'); }
      const sc = Math.max(0.05, Math.min(1, cfg.skill + (G.rnd() - 0.5) * 0.3));
      const before = s.stats.ops; L.tag = 'сдельная'; const m0 = s.money;
      G.doOp(sc); E(mk()).ops += s.stats.ops - before; resolve();
    }
    resolve();
    L.tag = 'прочее';
    freeTime(); resolve();
    const e = E(mk()); sample(e);
    if (!s.day.lunched && G.isWorkday() && s.car.sickUntil < s.t.day) noLunch++;
    if (s.st.satiety < 20) hungry++; if (s.st.mood < 30) sad++; if (s.st.health < 35) lowH++; if (s.money < 100) zeroMoney++;
    minMoney = Math.min(minMoney, s.money - s.debt);
    if (s.phase === 'evening' || s.phase === 'weekend' || s.phase === 'work' || s.phase === 'morning') { G.sleep(); resolve(); }
    if (cfg.noProsper !== false) { if ((s.flags.prosperWeeks || 0) >= 3) { stats.prosperDay = stats.prosperDay || s.t.day; s.flags.prosperWeeks = 2; } }
    const dn = s.t.day;
    e.end = { money: Math.round(s.money), debt: Math.round(s.debt), loans: Math.round(s.loans.reduce((a, l) => a + l.left, 0)), rank: s.car.rank, shifts: s.car.shifts, stage: s.car.mgmtStage || 0, day: dn, pay: G.monthlyPay() };
    if (cfg.trace) trace.push([dn, Math.round(s.money), Math.round(s.debt), Math.round(s.st.health), Math.round(s.st.energy), Math.round(s.st.mood), Math.round(s.st.satiety), s.car.rank, s.car.shifts, 'tox' + Math.round(s.st.tox) + ' neat' + Math.round(s.st.neat) + ' crav' + Math.round(s.st.craving) + ' sick' + (s.car.sickUntil|0) + ' mach' + Math.round(s.machine.wear) + ' rep' + s.car.rep]);
    if (need.has(dn)) snaps[dn] = { day: dn, money: Math.round(s.money), debt: Math.round(s.debt), loans: Math.round(s.loans.reduce((a, l) => a + l.left, 0)), rank: s.car.rank, stage: s.car.mgmtStage || 0, shifts: s.car.shifts, hp: Math.round(s.st.health), en: Math.round(s.st.energy), md: Math.round(s.st.mood), sat: Math.round(s.st.satiety), boss: Math.round(s.st.boss), coll: Math.round(s.st.coll) };
  }
  if (s.end) endDay = s.t.day;
  const months = Object.keys(led).map(Number).sort((a, b) => a - b).map(k => { const e = led[k]; return { m: k + 1, in: e.in, out: e.out, loan: Math.round(e.loan), accrued: Math.round(e.accrued), shifts: e.shifts, ops: e.ops, fines: e.fines, hp: Math.round(e.hp / e.n), en: Math.round(e.en / e.n), md: Math.round(e.md / e.n), sat: Math.round(e.sat / e.n), end: e.end }; });
  return { name: cfg.name, seed: cfg.seed, ending: s.end ? s.end.id : null, endDay, days: s.t.day, money: Math.round(s.money), debt: Math.round(s.debt), loans: s.loans.map(l => ({ t: l.type, left: Math.round(l.left), late: l.late || 0 })), rank: s.car.rank, shifts: s.car.shifts, minNet: Math.round(minMoney), hungry, noLunch, sad, lowH, zeroMoney, workDays, snaps, months, stats, trace, endInfo: s.end ? (s.end.id + ' ' + JSON.stringify(s.end).slice(0, 200)) : null, log: cfg.trace ? stats.titles : undefined, acc: ACC };
};

/* Профиль 9: управление предприятием. Назначение через G.ceo.dev.now (dev-вход игры, как в tests/ceo_test.py);
   события компании решаются первым вариантом. Это НЕ путь игрока от стажёра (он занимает 705 смен), а проверка экономики режима. */
window.__ceo = function (cfg) {
  let ms = (cfg.seed * 2654435761) >>> 0 || 1;
  Math.random = function () { ms = (ms + 0x6d2b79f5) | 0; let t = Math.imul(ms ^ (ms >>> 15), 1 | ms); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const noop = () => {}; G.headless = true; G.CONFIG.API_URL = ''; G.CONFIG.CHAT_URL = '';
  G.toast = noop; G.buzz = noop; if (G.ui) { G.ui.render = noop; G.ui.showModal = noop; G.ui.hideModal = noop; }
  G.mq.length = 0; G.cur = null; G.busy = false;
  G.newState('CEO', {}, 'chpu'); const s = G.s; s.rs = cfg.seed * 7919; s.phase = 'evening'; s.t.hour = 18;
  G.ceo.dev.now(cfg.diff || 'normal'); G.mq.length = 0; G.cur = null; G.busy = false;
  const rows = [], errs = []; let m0 = s.money;
  for (let d = 0; d < cfg.days && !s.end; d++) {
    try { G.sleep(); } catch (e) { errs.push('sleep: ' + e.message); break; }
    G.mq.length = 0; G.cur = null; G.busy = false;
    const c = G.co.get(); if (!c) break;
    (c.pending || []).slice().forEach(e => { try { G.co.ev.choose(e.uid, 0); } catch (x) { errs.push('ev: ' + x.message); } });
    if (d % 28 === 27) rows.push({ day: s.t.day, personal: Math.round(s.money), personalDelta: Math.round(s.money - m0), pay: Math.round(G.monthlyPay()), treasury: Math.round(c.treasury), trust: Math.round(c.board.trust), profit: c.reports[0] ? Math.round(c.reports[0].profit) : null, made: c.reports[0] ? Math.round(c.reports[0].made) : null });
    if (d % 28 === 27) m0 = s.money;
  }
  return { diff: cfg.diff, ending: s.end ? s.end.id : null, days: s.t.day, rows, errs: errs.slice(0, 5), keys: Object.keys(G.co.get() || {}).slice(0, 30) };
};
