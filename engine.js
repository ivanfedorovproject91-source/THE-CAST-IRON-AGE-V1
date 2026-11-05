/* ===== АО «ЧУГУННЫЙ ВЕК» — ядро: состояние, время, шкалы, формулы ===== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = (G.D = G.D || {});
  const C = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  G.clamp = C;
  G.SAVE_KEY = 'chugunny_vek_save_v1';
  G.REC_KEY = 'chugunny_vek_records_v1';
  G.SAVE_VERSION = 1; // версия СХЕМЫ сохранения; обновления игры не требуют её менять — работает автослияние (G.migrate)
  G.s = null;
  G.settings = { sound: true, haptic: true, tips: true, auto: false };

  // ---------- Генератор случайных чисел (mulberry32, состояние в сохранении)
  G.rnd = function () {
    const s = G.s;
    if (!s) return Math.random();
    s.rs = (s.rs + 0x6d2b79f5) | 0;
    let t = s.rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  G.ri = (a, b) => a + Math.floor(G.rnd() * (b - a + 1));
  G.pick = arr => arr[Math.floor(G.rnd() * arr.length)];
  G.chance = p => G.rnd() * 100 < p;
  G.wpick = (arr, wf) => {
    let tot = 0;
    const ws = arr.map(x => { const w = Math.max(0, wf(x)); tot += w; return w; });
    if (tot <= 0) return null;
    let r = G.rnd() * tot;
    for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r <= 0) return arr[i]; }
    return arr[arr.length - 1];
  };
  G.rub = n => Math.round(n).toLocaleString('ru-RU').replace(/\u00a0/g, ' ') + ' ₽';

  // ---------- Состояние
  G.baseState = function (name, av, edu) {
    const e = D.EDU.find(x => x.id === edu) || D.EDU[0];
    const s = {
      ver: G.SAVE_VERSION, rs: (Date.now() ^ 0x5bd1e995) & 0x7fffffff, name: name || 'Заводчанин', av: av || {}, edu: e.id,
      t: { day: 0, hour: 7 }, phase: 'new', loc: 'shop', end: null,
      st: { health: 92, energy: 80, mood: 70, satiety: 60, neat: 75, drunk: 0, craving: 10, habit: 0, boss: 25, coll: 25, cool: 15, cons: 70, know: e.know, tox: 0, bm: 0 },
      money: 3000, debt: 0,
      car: { job: null, rank: 0, shifts: 0, certs: e.certs.slice(), rep: 0, snitch: 0, frame: 0, fights: 0, thefts: 0, terpila: 0, drinks: 0, affairs: 0, clean: 0, union: false, notes: [], probShifts: 0, probFail: 0, vac: 0, attest: null, appointment: null, sickUntil: -1, stolen: 0, sop: 0 },
      rel: {}, flags: {}, nicks: [], inv: {}, own: {}, loans: [], log: [], ach: {}, tipsSeen: {},
      pay: { acc: 0, adv: 0, prem: 0, pen: 0, err: 0, errNote: '', qs: 0, qn: 0, hist: [] },
      instr: { vvod: null, perv: null, povt: null, vnepl: null, celev: null },
      day: null, hang: 0, hangSlots: 0, smell: 0, mask: 0, lunchAP: 2,
      machine: { wear: 28 }, dwg: { bad: false, checked: false, fixed: false, none: false },
      world: { plant: 70, rumors: 0, theft: 0, closing: 0, nextCall: 3, nextBinocular: 0 },
      stats: { earned: 0, ops: 0, spent: 0, drank: 0, maxMoney: 3000, brak: 0, ach: 0 },
      blog: { on: false, subs: 0, anon: true, revealed: false },
      eventHist: [], nextEv: 0
    };
    s.day = G.freshDay();
    return s;
  };
  G.newState = function (name, av, edu) { const s = G.baseState(name, av, edu); G.s = s; return s; };
  G.freshDay = () => ({ ops: 0, qsum: 0, viol: 0, breaks: 0, milk: false, peak: 0, drank: false, done: {}, risky: null, slots: 0, inspect: false, prepped: false, cleaned: 0, stole: 0, helped: 0, pays: 0 });

  // ---------- Время
  G.weekday = () => G.s.t.day % 7;
  G.week = () => Math.floor(G.s.t.day / 7);
  G.isWorkday = () => G.weekday() < 5;
  G.shiftStart = () => 8;
  G.shiftEnd = () => (G.weekday() === 4 ? 16 : 17);
  G.dateObj = () => new Date(2026, 10, 2 + G.s.t.day);
  const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const WDF = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  G.WD = WD; G.WDF = WDF;
  G.dateStr = () => { const d = G.dateObj(); return d.getDate() + ' ' + MON[d.getMonth()]; };
  G.hourStr = h => { h = h == null ? G.s.t.hour : h; return String(Math.floor(h) % 24).padStart(2, '0') + ':00'; };
  G.timeStr = () => WD[G.weekday()] + ' ' + G.hourStr();
  G.season = () => { const m = G.dateObj().getMonth(); return m === 11 || m < 2 ? 'зима' : m < 5 ? 'весна' : m < 8 ? 'лето' : 'осень'; };
  G.newbie = () => G.week() < 3;
  G.monthIdx = () => Math.floor(G.week() / 4);

  // ---------- Журнал и тосты
  G.log = function (text, cls) {
    const s = G.s; if (!s) return;
    s.log.unshift({ t: G.timeStr(), d: G.dateStr(), x: text, c: cls || '' });
    if (s.log.length > 100) s.log.length = 100;
  };
  G.toastq = [];
  G.toast = function (text, cls) {
    G.log(text, cls);
    G.toastq.push({ x: text, c: cls || '' });
    if (G.ui && G.ui.toast) G.ui.toast(text, cls);
  };
  G.fmt = function (t, ctx) {
    const s = G.s;
    return String(t).replace(/\{name\}/g, s.name).replace(/\{tn\}/g, () => G.pick(D.TRUH_NAMES)).replace(/\{boss\}/g, 'Труханов');
  };
  G.buzz = function (kind) {
    try { if (!G.settings.haptic) return; const h = window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback; if (!h) return; if (kind === 'light') h.impactOccurred('light'); else h.notificationOccurred(kind); } catch (e) {}
  };

  // ---------- Модальные окна (очередь)
  G.mq = []; G.cur = null; G.busy = false;
  G.modal = function (spec) { G.mq.push(spec); G.pump(); };
  G.pump = function () {
    if (G.busy) return;
    const sp = G.mq.shift();
    if (!sp) { G.cur = null; if (G.s) { G.save(); } if (G.ui && G.ui.render) G.ui.render(); return; }
    G.busy = true; G.cur = sp;
    if (sp.vib) G.buzz(sp.vib);
    if (G.ui && G.ui.showModal) G.ui.showModal(sp);
  };
  G.choose = function (i, result) {
    const sp = G.cur; if (!sp) return;
    G.cur = null; G.busy = false;
    if (G.ui && G.ui.hideModal) G.ui.hideModal();
    try {
      if (sp.type === 'mini') { if (sp.done) sp.done(result || { score: 0.5 }); }
      else { const o = sp.opts && sp.opts[i]; if (o && o.fn) o.fn(); }
    } catch (e) { console.error(e); G.log('Ошибка: ' + e.message, 'bad'); }
    G.pump();
  };
  G.info = (title, text, cb, extra) => G.modal(Object.assign({ title, text, opts: [{ t: 'Ок', fn: cb }] }, extra || {}));

  // ---------- Деньги, предметы, отношения
  G.addMoney = function (v) {
    const s = G.s; v = Math.round(v);
    if (v >= 0) { s.money += v; s.stats.earned += v; s.stats.maxMoney = Math.max(s.stats.maxMoney, s.money); }
    else { const need = -v; s.stats.spent += need; if (s.money >= need) s.money -= need; else { s.debt += need - s.money; s.money = 0; } }
  };
  G.has = (id, n = 1) => (G.s.inv[id] || 0) >= n;
  G.give = (id, n = 1) => { const s = G.s; s.inv[id] = (s.inv[id] || 0) + n; if (s.inv[id] <= 0) delete s.inv[id]; };
  G.R = function (id) { const s = G.s; return s.rel[id] || (s.rel[id] = { l: (D.NPC[id] && D.NPC[id].rel) || 0, stage: 0, jeal: 0, met: false, last: G.week(), debt: 0, owed: 0, talks: 0, seen: {} }); };
  G.relAdd = function (id, d) { const r = G.R(id); r.l = C(r.l + d, -100, 100); r.last = G.week(); };
  G.rl = id => G.R(id).l;
  G.hasCert = id => G.s.car.certs.indexOf(id) >= 0;

  // ---------- Блокнотик, клички
  G.note = function (cat, big) {
    const s = G.s; s.car.notes.push({ w: G.week(), c: cat, big: !!big });
    if (s.car.notes.length > 12) s.car.notes.shift();
    G.log('📓 Труханов что-то записал в блокнотик: «' + cat + '»', 'bad');
  };
  G.noteCount = () => G.s.car.notes.length;
  G.addNick = function (id) {
    const s = G.s; if (!D.NICKS[id] || s.nicks.indexOf(id) >= 0) return;
    s.nicks.push(id); if (s.nicks.length > 3) s.nicks.shift();
    G.toast('Тебе дали кличку: «' + D.NICKS[id].n + '»', 'bad');
    if (id === 'dolzhnik') G.R('kolyan').l -= 3;
  };
  G.nickLabel = () => { const s = G.s; return s.nicks.length ? D.NICKS[s.nicks[s.nicks.length - 1]].n : ''; };

  // ---------- Применение эффектов
  const SGN = v => (v > 0 ? '+' : '−') + Math.abs(Math.round(v * 10) / 10);
  G.fx = function (o, ctx) {
    if (!o) return '';
    const s = G.s, st = s.st, out = [], pops = [], R = D.STAT_RU;
    ctx = ctx || {};
    for (const k in o) {
      const v = o[k];
      switch (k) {
        case 'money': if (v) { G.addMoney(v); out.push((v > 0 ? '+' : '−') + G.rub(Math.abs(v))); pops.push(['money', v]); } break;
        case 'debt': s.debt = Math.max(0, s.debt + v); out.push('Долг ' + SGN(v)); break;
        case 'rel': for (const n in v) { const id = n === 'me' ? ctx.npc : n; if (id) G.relAdd(id, v[n]); } break;
        case 'flag': Object.assign(s.flags, v); break;
        case 'nick': G.addNick(v); break;
        case 'note': G.note(v, ctx.big); break;
        case 'rep': s.car.rep = C(s.car.rep + v, 0, 3); out.push('Выговор ' + SGN(v)); break;
        case 'snitch': case 'frame': case 'fights': case 'thefts': case 'terpila': case 'affairs': s.car[k] += v; break;
        case 'item': for (const id in v) G.give(id, v[id]); break;
        case 'say': G.log(v); break;
        case 'end': G.end(v); break;
        case 'hours': G.advance(v); break;
        case 'mask': s.mask += v; break;
        case 'hang': s.hang = v; s.hangSlots = v ? 3 : 0; break;
        case 'cure': if (s.hang > 0) { s.hang = Math.max(0, s.hang - v); if (!s.hang) s.hangSlots = 0; out.push('Похмелье легче'); } break;
        case 'wear': s.machine.wear = C(s.machine.wear + v, 0, 100); break;
        case 'plant': s.world.plant = C(s.world.plant + v, 0, 100); break;
        case 'pen': s.pay.pen += v; break;
        default:
          if (k in st) {
            let d = v;
            if (k === 'drunk' && v > 0) d = v / (1 + st.habit / 150);
            const before = st[k];
            st[k] = k === 'bm' ? Math.max(0, st[k] + d) : C(st[k] + d, 0, 100);
            if (k === 'drunk') { s.day.peak = Math.max(s.day.peak, st.drunk); if (v > 0) s.day.drank = true; }
            const real = st[k] - before;
            if (k !== 'bm' && Math.abs(real) >= 0.5 && R[k]) { out.push(R[k] + ' ' + SGN(real)); pops.push([k, real]); }
          }
      }
    }
    if (pops.length && G.ui && G.ui.floatFx) { try { G.ui.floatFx(pops); } catch (e) {} }
    return out.join(', ');
  };

  // ---------- Должность, зарплата, качество
  G.job = () => D.JOBS[G.s.car.job] || null;
  G.rank = () => G.s.car.rank;
  G.rankName = () => D.RANKS[G.s.car.rank];
  G.jobTitle = function () {
    const c = G.s.car, j = G.job(); if (!j) return 'Безработный';
    if (c.rank >= 6) return D.RANKS[c.rank];
    return j.name + (c.rank === 0 ? ' (стажёр)' : ', ' + D.RANKS[c.rank].toLowerCase());
  };
  G.monthlyPay = function () {
    const c = G.s.car, j = G.job(); if (!j) return 0;
    if (c.rank === 0) return 12000;
    if (c.rank >= 6) { const p = D.MGMT_PAY[c.rank]; return Math.round((p[0] + (p[1] - p[0]) * Math.min(1, (c.shifts % 120) / 120)) / 100) * 100; }
    const base = j.pay[0] + (j.pay[1] - j.pay[0]) * ((c.rank - 1) / 4);
    return Math.round(base * (j.harm >= 3 ? 1.12 : 1) / 100) * 100;
  };
  G.physical = () => { const j = G.job(); return j && G.s.car.rank < 6 ? j.load : (G.s.car.rank < 8 ? 1.5 : 0.5); };
  G.quality = function () {
    const s = G.s, st = s.st; let q = 100;
    if (st.energy < 25) q -= 20;
    if (st.mood < 30) q -= 20;
    if (s.flags.burnout) q -= 10;
    if (st.health < 35) q -= 20;
    if (st.craving >= 75) q -= 15; else if (st.craving >= 50) q -= 5;
    q -= st.drunk / 4;
    if (s.hang === 1 && s.hangSlots > 0) q -= 10; else if (s.hang === 2 && s.hangSlots > 0) q -= 20;
    if (st.coll < 25) q -= 10;
    if (st.boss < 15) q -= 5;
    if (st.satiety < 20) q -= 5;
    if (s.dwg.fixed) q += 10;
    if (st.neat >= 60) q += 3;
    if (s.day && s.day.fatigue) q -= s.day.fatigue;
    return C(Math.round(q), 30, 100);
  };
  G.fireRisk = function () {
    const s = G.s, c = s.car, st = s.st;
    let r = c.rep * 20 + Math.max(0, 45 - st.boss) * 0.9 + (s.day.viol ? 10 : 0) + G.noteCount() * 2 - c.snitch * 1.5 - (c.union ? 8 : 0) - (st.coll > 70 ? 3 : 0) - G.rl('truhanov') / 10;
    return C(Math.round(r), 0, 90);
  };
  G.ojScore = function () {
    const s = G.s, st = s.st;
    const items = Object.keys(s.own).length;
    const rel = Math.max(0, ...Object.keys(s.rel).filter(k => D.NPC[k] && D.NPC[k].romance).map(k => s.rel[k].l));
    return Math.round(s.car.rank * 500 + st.bm / 2 + Math.min(3000, s.money / 200) + items * 150 + (st.boss + st.coll) * 3 + rel * 2 + Object.keys(s.ach).length * 100 - s.debt / 150 - s.car.rep * 200 - s.nicks.length * 80);
  };
  G.status = function () {
    const s = G.s, st = s.st, c = s.car;
    if (s.stats.ops < 10 || G.week() === 0 && s.t.day < 3) return 'Новичок';
    if (c.snitch >= 6 && st.coll < 45) return 'Стукачёк';
    if (st.habit >= 50 && st.boss < 45) return 'Раздолбай-алкаш';
    if (c.frame >= 3) return 'Подлый интриган';
    if (c.fights >= 3 && st.coll < 60) return 'Заводской задира';
    if (st.cool >= 70 && st.boss < 45) return 'Душа компании';
    if (st.boss >= 70 && st.coll < 35) return 'Любимчик начальства';
    if (st.coll >= 70 && st.boss < 30) return 'Народный заступник';
    if (st.boss < 25 && st.coll < 25) return 'Изгой';
    if (c.terpila >= 5 && st.boss >= 60) return 'Терпила-карьерист';
    if (st.boss >= 55 && st.coll >= 55 && st.cool >= 30 && c.snitch < 4) return 'Золотая середина';
    if (c.affairs >= 3) return 'Ходок';
    if (s.blog.revealed) return 'Блогер-позорище';
    if (s.stats.ops > 80 && c.rep === 0 && st.habit < 20) return 'Трудоголик';
    return 'Работяга';
  };

  // ---------- Расписание НПС
  G.hash = function (a, b, c) { let h = (a * 374761393 + b * 668265263 + (c || 0) * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  G.npcLoc = function (id) {
    const s = G.s, n = D.NPC[id]; if (!n || !n.at) return null;
    const a = n.at, wd = G.weekday(), hr = Math.floor(s.t.hour), ph = s.phase;
    if (a.city) return null;
    if (ph === 'morning' || ph === 'checkpoint') return a.morning ? 'checkpoint' : null;
    if (ph === 'locker') return (id === 'khomyak' || id === 'tamara' || id === 'seryoga') && G.hash(s.t.day, 7, id.length) < 0.5 ? 'locker' : null;
    if (a.days.indexOf(wd) < 0) return null;
    if (a.from && hr < a.from) return null;
    if (ph === 'lunch') {
      if (a.l) return a.l;
      return ['lyudka', 'tatyana', 'palych', 'seryoga', 'vityok', 'mikhalych', 'stepanych', 'zahar', 'chugunok'].indexOf(id) >= 0 && G.hash(s.t.day, 11, id.length) < 0.8 ? 'canteen' : (a.loc === 'yard' ? 'yard' : null);
    }
    if (ph !== 'work') return null;
    if (a.loc === 'canteen') return null;
    if (G.hash(s.t.day, hr, id.length * 31 + id.charCodeAt(0)) > a.p) return null;
    if (id === 'truhanov' && (s.world.binoc || 0) > 0) return null;
    if (a.alt && G.hash(s.t.day, hr, 91 + id.length) < 0.4) return a.alt[Math.floor(G.hash(s.t.day, hr, 5) * a.alt.length)];
    return a.loc;
  };
  G.peopleAt = loc => D.NPC_ORDER.filter(id => G.npcLoc(id) === loc);

  // ---------- Время: тик по часу
  function tick() {
    const s = G.s, st = s.st, ph = s.phase, work = ph === 'work' || ph === 'lunch';
    st.drunk = Math.max(0, st.drunk - 6);
    if (s.smell > 0) s.smell = Math.max(0, s.smell - 4);
    st.satiety = Math.max(0, st.satiety - (ph === 'work' ? 3.4 : 2.2));
    if (!work) st.energy = C(st.energy - 1.2);
    st.neat = Math.max(0, st.neat - (ph === 'work' ? 1.4 : 0.4));
    if (ph === 'work') { const j = G.job(); if (j) st.tox = C(st.tox + j.harm * 0.35 * (s.car.rank >= 8 ? 0.2 : 1)); }
    if (st.satiety < 20) { st.energy = C(st.energy - 1); st.mood = C(st.mood - 0.8); }
    if (st.satiety <= 0) st.health = C(st.health - 1.2);
    if (st.drunk > 0 && st.drunk < 3) st.drunk = 0;
  }
  G.advance = function (h) {
    for (let i = 0; i < h; i++) { tick(); G.s.t.hour++; }
  };

  // ---------- Проверка концовок по шкалам
  G.checkEnd = function () {
    const s = G.s; if (s.end) return true;
    if (s.st.health <= 0) { G.end(s.flags.overwork ? 'died' : 'health'); return true; }
    if (s.st.mood <= 0 && s.phase !== 'new') { G.end('quit'); return true; }
    if (s.car.rep >= 3) { G.end('fired'); return true; }
    return false;
  };

  G.end = function (id, data) {
    const s = G.s; if (s.end) return;
    s.end = Object.assign({ id, day: s.t.day, shifts: s.car.shifts }, data || {});
    s.mq = null; G.mq.length = 0;
    try {
      const r = JSON.parse(localStorage.getItem(G.REC_KEY) || '{}');
      r.runs = (r.runs || 0) + 1; r.best = Math.max(r.best || 0, G.ojScore()); r.ends = r.ends || {}; r.ends[id] = (r.ends[id] || 0) + 1;
      r.maxShifts = Math.max(r.maxShifts || 0, s.car.shifts);
      localStorage.setItem(G.REC_KEY, JSON.stringify(r));
    } catch (e) {}
    G.buzz('error');
    if (G.lb) G.lb.submit(true);
    G.save();
    if (G.ui && G.ui.render) G.ui.render();
  };

  G.achieve = function (id, text) {
    const s = G.s; if (s.ach[id]) return; s.ach[id] = G.week(); s.stats.ach++;
    G.toast('🏆 Достижение: ' + text, 'good');
  };

  // ---------- «Поймали / пронесло» (разд. 8.5–8.6)
  G.catchChance = function (risk) { const st = G.s.st; return C(Math.round(risk - st.boss / 8 - st.coll / 10 + st.drunk / 4), 8, 85); };
  G.caught = function (a) {
    if (!a || !a.risk) return false;
    const p = G.catchChance(a.risk);
    if (G.rnd() * 100 >= p) return false;
    G.punish(a); return true;
  };
  G.punish = function (a) {
    const s = G.s, st = s.st, c = s.car;
    const sev = a.sev || 0;
    let ok = 0.35 * st.boss + 3 * c.snitch + (c.union ? 12 : 0) - 15 * sev + (G.rl('truhanov') + G.rl('soplezhuykin')) / 10 + (G.newbie() ? 18 : 0);
    ok = C(Math.round(ok), 0, 70);
    const what = a.what || 'нарушение';
    if (G.chance(ok)) {
      G.fx({ boss: -2, mood: -3 });
      G.toast('ПРОНЕСЛО! («' + what + '» — никто не заметил / закрыли глаза)', 'warn');
      G.buzz('warning'); return;
    }
    const fine = Array.isArray(a.fine) ? G.ri(a.fine[0], a.fine[1]) : (a.fine || 0);
    const real = G.newbie() ? Math.round(fine / 2) : fine;
    s.day.viol++; c.clean = 0; s.pay.viol = (s.pay.viol || 0) + 1;
    G.fx({ money: -real, rep: 1, boss: sev ? -10 : -6, mood: -8 });
    if (s.world.binoc) G.note(what, sev > 0);
    G.buzz('error');
    if (G.checkEnd()) return;
    if (sev >= 2 && G.chance(G.fireRisk() / 2 + 20)) { G.info('УВОЛЕН НА МЕСТЕ', 'За «' + what + '» начальство не стало разбираться: приказ уже подписан.', () => G.end('fired')); return; }
    G.modal({
      title: 'ПОЙМАЛИ!', cls: 'bad', vib: 'error',
      text: 'Нарушение: <b>' + what + '</b>.<br>Штраф ' + G.rub(real) + ', выговор (' + c.rep + '/3). Что скажешь начальству?',
      opts: [
        { t: 'Извиниться', fn: () => { G.fx({ boss: 3, mood: -2 }); G.toast('Ты извинился. Начальство хмыкнуло.'); } },
        { t: 'Оправдаться', fn: () => { const p = C(25 + st.boss / 4 + 2 * c.snitch, 5, 70); if (G.chance(p)) { G.fx({ rep: -1, money: Math.round(real / 2) }); G.toast('Оправдался! Выговор снят, половина штрафа возвращена.', 'good'); } else { G.fx({ boss: -3, mood: -8 }); G.toast('Оправдания не приняли.', 'bad'); } G.checkEnd(); } },
        { t: 'Послать начальника', fn: () => { G.fx({ cool: 8, coll: 3, boss: -12, mood: 6, rep: 1 }); G.toast('Послал! Все слышали. Крутизна растёт, карьера — нет.', 'warn'); if (!G.checkEnd() && G.chance(G.fireRisk())) G.end('fired'); } }
      ]
    });
  };

  // ---------- Мини-игры (вызов модального окна типа mini)
  G.mini = function (kind, params, done) { G.modal(Object.assign({ type: 'mini', kind, params: params || {}, done }, params)); };

  // ---------- Начало дня, фазы
  G.startDay = function () {
    const s = G.s, st = s.st, wd = G.weekday();
    s.day = G.freshDay(); s.dwg = { bad: false, checked: false, fixed: false, none: false };
    s.lunchAP = 2; s.world.binoc = 0;
    if (G.isWorkday()) { s.phase = 'morning'; s.t.hour = 7; s.loc = 'shop'; } else { s.phase = 'weekend'; s.t.hour = 9; s.loc = 'home'; }
    // чертёж на смену
    const bad = s.flags.eblBeaten && s.flags.eblBeaten > G.week() - 3 ? 20 : 45;
    s.dwg.bad = G.chance(bad);
    if (s.flags.eblBinge === 1 && !s.flags.eblBingeUntil) s.flags.eblBingeUntil = s.t.day + G.ri(5, 10);
    if (s.flags.eblBinge && s.flags.eblBingeUntil >= s.t.day) s.dwg.none = true; else { delete s.flags.eblBinge; delete s.flags.eblBingeUntil; }
    if (wd === 0 && G.week() > 0) { st.energy = C(st.energy - 5); st.mood = C(st.mood - 2); }
    if (s.hang) G.toast(s.hang === 2 ? 'ТЯЖЁЛОЕ ПОХМЕЛЬЕ. Голова гудит как цех.' : 'С утра — похмелье. Рассол бы…', 'bad');
    if (!G.isWorkday()) { G.weekendEvents(); }
    else if (wd === 2) G.toast('Среда — день охраны труда. Прибери место и не дыши на проверяющих.', 'warn');
    G.showTip();
    G.checkEnd();
  };

  G.showTip = function () {
    const s = G.s; if (!G.settings.tips) return;
    const cand = D.TIPS.filter(t => { try { return t.c(s) && (!s.tipsSeen[t.id] || (s.tipsSeen[t.id] < G.week() - (s.car.shifts < 20 ? 1 : 8))); } catch (e) { return false; } });
    if (!cand.length) return;
    if (s.car.shifts > 25 && !G.chance(30)) return;
    const t = G.pick(cand); s.tipsSeen[t.id] = G.week();
    G.toast('💡 ' + t.text, 'tip');
  };

  G.weekendEvents = function () {
    const s = G.s;
    if (s.car.probShifts >= 20 && G.week() >= s.world.nextCall && s.car.job) {
      s.world.nextCall = G.week() + G.ri(2, 4);
      const who = G.chance(50) ? 'truhanov' : 'soplezhuykin';
      G.modal({ title: '☎ Звонок в выходной', text: (who === 'truhanov' ? 'Звонит Труханов: «Эй, {tn}! Выходи, аврал! Миллиарды… то есть план горит!»' : 'Звонит Соплежуйкин: «Максим Гогенович беспокоит. Нужно выйти. Это не обсуждается. Хотя обсуждается».').replace('{tn}', G.pick(D.TRUH_NAMES)), vib: 'warning', opts: [
        { t: 'Выйти (оплата ×2)', fn: () => { G.s.flags.callOut = G.s.t.day; G.fx({ boss: 6, energy: -20, mood: -10, coll: -1 }); G.s.pay.acc += G.monthlyPay() / 20 * 2; G.toast('Вышел в выходной. Оплата ×2, силы ушли.'); G.s.t.hour = 17; } },
        { t: 'Соврать: «Я далеко / болею»', fn: () => { const p = 60 + (G.s.st.boss - 40) / 4; if (G.chance(p)) { G.toast('Поверили. Выходной спасён.', 'good'); if (who === 'truhanov') G.note('Не вышел в выходной'); } else { G.fx({ boss: -6, mood: -4 }); G.toast('Раскусили! Замечание.', 'bad'); G.punish({ risk: 100, what: 'Не вышел в выходной (ложь)', fine: [0, 300] }); } } },
        { t: 'Отказать прямо', fn: () => { G.fx({ boss: -9 }); if (G.s.st.boss >= 55 && G.chance(40)) G.toast('Начальство вздохнуло и поняло.'); else G.toast('Начальство обиделось.', 'bad'); if (who === 'truhanov') G.note('Отказался выходить'); } }
      ] });
    }
  };

  // Вход на смену (после проходной/раздевалки)
  G.enterWork = function () {
    const s = G.s; s.phase = 'work'; s.t.hour = 8; s.loc = 'shop';
    if (G.weekday() === 2) s.day.inspect = false;
    if (G.chance(25)) s.world.binoc = 0;
  };

  G.slotsLeft = function () { const s = G.s, h = Math.floor(s.t.hour); const end = G.shiftEnd(); let n = 0; for (let x = h; x < end; x++) if (x !== 12) n++; return n; };

  // После любого действия — фазы, события, проверки
  G.settle = function () {
    const s = G.s; if (s.end) return;
    if (G.checkEnd()) return;
    const hr = Math.floor(s.t.hour);
    if (s.phase === 'work') {
      if (s.hangSlots > 0) s.hangSlots--;
      s.day.slots++;
      if (hr >= 12 && hr < 13 && !s.day.lunched) { s.phase = 'lunch'; s.t.hour = 12; s.lunchAP = 2; s.loc = 'canteen'; s.day.lunched = true; G.toast('Обеденный перерыв! Можно в столовую.'); }
      else if (hr >= G.shiftEnd()) G.endShift();
    }
    G.morningWed();
  };

  G.morningWed = function () { if (G.career && G.career.hook) G.career.hook(); };

  G.endLunch = function () {
    const s = G.s; if (s.phase !== 'lunch') return;
    s.phase = 'work'; s.t.hour = 13; s.loc = 'shop'; G.settle(); G.pump();
  };

  // ---------- Конец смены, оценка дня, оплата
  G.endShift = function () {
    const s = G.s, c = s.car, d = s.day, st = s.st;
    if (s.phase === 'evening') return;
    s.phase = 'evening'; s.loc = 'home'; if (s.t.hour < G.shiftEnd()) s.t.hour = G.shiftEnd();
    const avgQ = d.ops ? d.qsum / d.ops : 0;
    c.shifts++; if (c.probShifts < 20 && c.rank === 0) c.probShifts++;
    st.know = C(st.know - 3);
    // оценка дня
    let r, rate;
    if (d.med && d.ops === 0) { r = 'Медкомиссия — день прошёл'; rate = 0.6; }
    else if (d.ops === 0) { r = 'Ты тут вообще работал?'; rate = 0.2; }
    else if (d.viol) { r = 'Опять отчибучил?'; rate = 0.25; }
    else if (st.drunk > 12 || s.smell > 30) { r = 'Пахнет как в рюмочной'; rate = 0.3; }
    else if (avgQ >= 95) { r = 'ГЕНИАЛЬНО! Орёл!'; rate = 1; }
    else if (avgQ >= 85) { r = 'Молодец!'; rate = 0.85; }
    else if (avgQ >= 70) { r = 'Пойдёт'; rate = 0.65; }
    else if (avgQ >= 55) { r = 'Говнюк, ну да ладно'; rate = 0.45; }
    else if (avgQ >= 40) { r = 'Засранец'; rate = 0.3; }
    else { r = 'Позорище! Руки бы оторвать!'; rate = 0.1; }
    if (d.breaks > 3 && d.ops < 4) r = 'Ты тут вообще работал?';
    // чертёж и ОТК
    let extra = '';
    if (G.job() && c.rank < 8 && d.ops > 0 && s.dwg.bad && !s.dwg.fixed) {
      const p = 70 - Math.max(0, G.rl('ekaterina')) * 0.3;
      if (G.chance(p)) {
        s.stats.brak++; rate = 0.1; r = 'Позорище! Брак!';
        extra = '<br><b>ОТК вернул партию:</b> чертёж был кривой, а ты не проверил. Переделка 2 часа сверхурочно без оплаты, штраф 200–400 ₽.';
        G.fx({ money: -G.ri(200, 400), mood: -6, boss: -2 }); G.relAdd('ekaterina', -2); s.t.hour += 2; for (let i = 0; i < 2; i++) tick();
      }
    }
    // оплата
    if (c.sickUntil < s.t.day) {
      const base = G.monthlyPay() / 20;
      s.pay.acc += base * (0.75 + 0.25 * Math.min(1, avgQ / 100 || 0.5));
      s.pay.prem += rate; s.pay.qs += avgQ; s.pay.qn++;
    }
    const bmGain = Math.round((c.rank >= 8 ? 8 : c.rank >= 6 ? 5 : 3) + rate * 4);
    st.bm += bmGain;
    // чистые смены
    if (!d.viol) c.clean++; else c.clean = 0;
    if (c.clean >= 5 && c.rep > 0) { c.rep--; c.clean = 0; G.toast('5 чистых смен подряд: выговор снят.', 'good'); }
    // износ станка
    s.machine.wear = C(s.machine.wear + 1.2 + (G.job() ? G.job().load * 0.2 : 0));
    // переутомление
    if (st.energy < 15) c.lowE = (c.lowE || 0) + 1; else c.lowE = 0;
    // премия/оценка влияет на начальство
    G.fx({ boss: rate >= 0.85 ? 1.5 : rate >= 0.65 ? 0.8 : rate >= 0.45 ? 0.2 : rate < 0.3 ? -1 : 0, coll: rate >= 0.65 ? 0.4 : 0 });
    if (G.dateObj().getDay() === 5) { G.payday(); }
    G.modal({
      title: 'КОНЕЦ СМЕНЫ', cls: rate >= 0.65 ? 'good' : rate < 0.3 ? 'bad' : '', vib: rate >= 0.65 ? 'success' : 'warning',
      text: '<div class="verdict">«' + r + '»</div>Операций: <b>' + d.ops + '</b>, среднее качество: <b>' + Math.round(avgQ) + '%</b><br>Баллы мастерства: <b>+' + bmGain + '</b>. Смена №' + c.shifts + '.' + extra,
      opts: [{ t: 'В раздевалку и домой', fn: () => { if (G.career) G.career.shiftEnd(); G.finishShift(); } }]
    });
  };

  G.finishShift = function () {
    const s = G.s;
    G.checkEnd();
    if (G.lb) G.lb.submit();
    if (s.end) return;
    if (s.car.job && s.car.probShifts >= 20 && s.car.rank === 0 && G.career) G.career.probationEnd();
    if (s.car.lowE > 10 && s.st.health < 30 && G.week() > 60 && G.chance(5)) { s.flags.overwork = 1; s.st.health = 0; G.checkEnd(); }
  };

  // ---------- Зарплата (разд. 9.2)
  G.payday = function () {
    const s = G.s, p = s.pay, wk = G.week() % 4;
    if (wk === 1) {
      const gross = 0.4 * p.acc; p.adv = gross; const net = Math.round(gross * 0.87);
      G.addMoney(net);
      G.modal({ title: '💵 АВАНС', text: 'Начислено аванса ' + G.rub(gross) + ', на руки (минус НДФЛ 13%): <b>' + G.rub(net) + '</b>.', opts: [{ t: 'Ок' }], vib: 'success' });
      G.achieve('first_pay', 'Первая зарплата');
    } else if (wk === 3) {
      const j = G.job(), c = s.car;
      const avgR = p.qn ? p.prem / p.qn : 0.5;
      let prem = 0;
      if (c.rank > 0 && !p.viol) prem = Math.round(p.acc * 0.3 * avgR);
      let deprive = 0;
      const soplRel = G.rl('soplezhuykin');
      if (c.rank > 0 && G.chance(soplRel >= 60 ? 3 : soplRel < 30 ? 15 : 8)) { deprive = prem; prem = 0; }
      if (s.flags.soplGift && s.flags.soplGift > G.week()) { deprive = 0; if (!prem) prem = Math.round(p.acc * 0.15); }
      const wedPen = p.pen || 0;
      const total = p.acc + prem - wedPen;
      let net = (total - p.adv) * 0.87;
      const union = c.union ? Math.round(total * 0.01) : 0;
      net -= union;
      let errTxt = '';
      p.err = 0;
      if (!s.flags.shurFriend && G.chance(35)) {
        if (G.chance(80)) { p.err = -Math.round(total * G.ri(3, 15) / 100 * 0.87); errTxt = 'Бухгалтерия недоплатила ~' + G.rub(-p.err) + '. Можно сходить к главбуху на перерасчёт.'; }
        else { p.err = Math.round(total * G.ri(3, 8) / 100 * 0.87); errTxt = 'Бухгалтерия переплатила — потом удержат.'; s.flags.overpaid = p.err; }
        net += p.err;
        p.errNote = errTxt; s.flags.accError = p.err;
      }
      if (s.flags.overpaid && !p.err) { net -= s.flags.overpaid; s.flags.overpaid = 0; }
      net = Math.round(net);
      G.addMoney(net);
      const fixed = 3500 + 500 + 1500;
      G.addMoney(-fixed);
      // долги и кредиты
      let loanTxt = '';
      s.loans.forEach(l => { if (l.type === 'micro') { const pay = Math.min(s.money, l.left); s.money -= pay; l.left -= pay; loanTxt += '<br>Микрозайм: удержано ' + G.rub(pay); } if (l.type === 'bank' || l.type === 'mortgage') { const pay = Math.min(l.pay, l.left); if (s.money >= pay) { s.money -= pay; l.left -= pay; loanTxt += '<br>Платёж по кредиту: ' + G.rub(pay); } else { l.late = (l.late || 0) + 1; loanTxt += '<br>⚠ Просрочка платежа по кредиту!'; } l.left = Math.round(l.left * (1 + l.rate / 12)); } });
      s.loans = s.loans.filter(l => l.left > 5);
      G.modal({ title: '💵 РАСЧЁТ ЗА МЕСЯЦ', text: 'Начислено: ' + G.rub(p.acc) + (prem ? ' + премия ' + G.rub(prem) : '') + (deprive ? '<br><b>Соплежуйкин лишил премии (' + G.rub(deprive) + ')</b>' : '') + (wedPen ? '<br>Удержано штрафов: ' + G.rub(wedPen) : '') + '<br>Аванс уже получен: ' + G.rub(p.adv) + '<br>На руки: <b>' + G.rub(net) + '</b>' + (errTxt ? '<br><i>' + errTxt + '</i>' : '') + '<br>Общага, связь, проезд: −' + G.rub(fixed) + loanTxt, opts: [{ t: 'Ок' }], vib: 'success' });
      p.hist.push({ m: G.monthIdx(), net });
      p.acc = 0; p.adv = 0; p.prem = 0; p.pen = 0; p.qs = 0; p.qn = 0; p.viol = 0;
    }
  };

  // ---------- Сон и смена дня
  G.sleep = function () {
    const s = G.s, st = s.st;
    const nextDow = (G.weekday() + 1) % 7;
    const wake = nextDow < 5 ? 7 : 9;
    let hours = wake + 24 - Math.floor(s.t.hour);
    hours = C(hours, 2, 11);
    const peak = s.day.peak, drank = s.day.drank;
    // похмелье
    let hang = peak > 65 ? 2 : peak > 40 ? 1 : 0;
    const e0 = st.energy;
    const gain = (hang ? 35 : 60) * Math.min(1.25, hours / 8);
    st.energy = C(st.energy + gain);
    if (hours >= 7) st.health = C(st.health + 1.5);
    st.mood = C(st.mood + (hours >= 7 ? 3 : 0));
    st.satiety = Math.max(0, st.satiety - 8);
    st.drunk = 0;
    st.tox = C(st.tox - 1.5);
    if (st.tox > 70) st.health = C(st.health - 3); else if (st.tox > 40) st.health = C(st.health - 1);
    // тяга и привычка
    if (!drank) { st.craving = st.habit >= 10 ? C(st.craving + 4) : Math.max(0, st.craving - 2); st.habit = C(st.habit - 0.5); }
    else { st.craving = C(st.craving - (peak > 40 ? 40 : 25)); st.habit = C(st.habit + (peak > 40 ? 2 : peak > 15 ? 1 : 0)); s.stats.drank++; }
    if (st.craving >= 90) { s.flags.crav90 = (s.flags.crav90 || 0) + 1; if (s.flags.crav90 >= 2) { s.flags.burnout = 1; G.toast('ВЫГОРАНИЕ: настроение больше 40 не поднимется.', 'bad'); } } else s.flags.crav90 = 0;
    if (s.flags.burnout && st.craving < 50 && st.mood > 50) { delete s.flags.burnout; G.toast('Выгорание отступило.', 'good'); }
    if (s.flags.burnout) st.mood = Math.min(st.mood, 40);
    if (st.craving >= 75) st.mood = C(st.mood - 4);
    else if (st.craving >= 50) st.mood = C(st.mood - 2);
    if (st.habit >= 70 && s.nicks.indexOf('bukharik') < 0) G.addNick('bukharik');
    s.hang = hang; s.hangSlots = hang ? 3 : 0;
    s.smell = Math.round(peak * 0.9); s.mask = 0;
    // экстра-энергия, если мало спал
    if (hours < 5) { st.mood = C(st.mood - 5); }
    G.log('😴 Сон ' + hours + ' ч. Энергия ' + Math.round(e0) + ' → ' + Math.round(st.energy) + (hang ? ' (похмелье)' : ''));
    // новый день
    s.t.day++; s.t.hour = wake;
    if (G.weekday() === 0) G.weeklyTick();
    G.dailyTick();
    G.startDay();
    G.settle();
  };

  // Гигиена: зубы — каждый день, помывка — не реже раза в 2 дня. Иначе падают шкалы.
  G.hygieneCheck = function () {
    const s = G.s, f = s.flags, y = s.t.day - 1;
    if (f.teethDay === undefined) f.teethDay = y;
    if (f.washDay === undefined) f.washDay = y;
    if (f.teethDay < y) {
      f.teethMiss = (f.teethMiss || 0) + 1;
      G.toast('Зубы вчера не чистил(а). Во рту — как в цеху после смены.', 'bad');
      G.fx({ neat: -5, mood: -2 });
      if (f.teethMiss >= 3) { G.fx({ health: -2, coll: -1 }); G.toast('Кариес не дремлет, коллеги отворачиваются.', 'bad'); }
    } else f.teethMiss = 0;
    if (f.washDay < y - 1) {
      f.washMiss = (f.washMiss || 0) + 1;
      G.toast('Ты давно не мылся. Общага уже в курсе.', 'bad');
      G.fx({ neat: -10, mood: -2, coll: -2 });
      if (f.washMiss >= 2) { G.fx({ health: -2, boss: -2 }); G.toast('Начальство морщит нос в твою сторону.', 'bad'); }
    } else f.washMiss = 0;
  };

  G.dailyTick = function () {
    const s = G.s, st = s.st;
    G.hygieneCheck();
    // долги
    s.loans.forEach(l => { if (l.type === 'micro') { l.left = Math.round(l.left * 1.015); } });
    if (s.loans.some(l => l.late >= 1) && G.chance(30)) G.collectors();
    if (s.debt > 0 && s.debt > 20000 && G.chance(15)) G.collectors();
    // больничный
    if (s.car.sickUntil >= s.t.day) G.toast('Ты на больничном.');
    // слухи Людки
    if (s.flags.rumor) { delete s.flags.rumor; const r = G.pick(D.RUMORS); G.toast('По заводу ходит слух: «' + r + '»', 'warn'); G.fx({ coll: G.ri(-3, 2) }); }
    // долги друзьям
    Object.keys(s.flags).filter(k => k.indexOf('debt_') === 0 && s.flags[k] > 0).forEach(k => { if (G.chance(8)) G.friendDebt(k.slice(5), k); });
    if (G.extraDaily) G.extraDaily();
    if (s.flags.lent_vityok && G.chance(5)) { s.flags.lent_vityok = 0; if (G.chance(40)) { G.addMoney(500); G.toast('Витёк вернул 500 ₽. Чудо!', 'good'); } else G.toast('Витёк «забыл» про долг.', 'warn'); }
  };

  G.friendDebt = function (id, key) {
    const s = G.s, amt = s.flags[key], n = D.NPC[id];
    const lvl = (s.flags[key + '_lvl'] = (s.flags[key + '_lvl'] || 0) + 1);
    const texts = ['напомнил про долг.', 'ссорится из-за долга.', 'пустил слух про тебя по заводу.', 'грозит разобраться по-мужски.'];
    G.modal({ title: n.name + ' вспомнил', text: n.name + ' ' + texts[Math.min(3, lvl - 1)] + '<br>Долг: ' + G.rub(amt), opts: [
      { t: 'Отдать ' + G.rub(amt), fn: () => { if (s.money >= amt) { G.addMoney(-amt); s.flags[key] = 0; s.flags[key + '_lvl'] = 0; G.toast('Долг отдан.', 'good'); G.relAdd(id, 4); } else G.toast('Денег нет.', 'bad'); } },
      { t: 'Попросить отсрочку', fn: () => { G.fx({ mood: -2 }); G.relAdd(id, -2); } },
      { t: 'Послать', fn: () => { G.fx({ cool: 3, cons: -3, coll: lvl >= 3 ? -8 : -2 }); G.addNick('dolzhnik'); if (lvl >= 4) { G.fx({ health: -15, mood: -15 }); G.toast('Тебя подкараулили и отметелили.', 'bad'); } } }
    ] });
  };

  G.collectors = function () {
    const s = G.s;
    G.modal({ title: '📞 Коллекторы', text: 'Звонят с незнакомого номера: «Вы нам должны. Мы знаем, где вы работаете». Настроение падает.', vib: 'warning', opts: [{ t: 'Бросить трубку', fn: () => G.fx({ mood: -8 }) }, { t: 'Пообещать погасить', fn: () => G.fx({ mood: -4, cons: -1 }) }] });
    if (s.debt > 60000 && G.chance(30)) { G.toast('Приставы удерживают 50% зарплаты.', 'bad'); s.flags.bailiff = G.week() + 4; }
  };

  G.weeklyTick = function () {
    const s = G.s, st = s.st;
    const wk = G.week();
    // клички
    s.nicks.forEach(id => { const n = D.NICKS[id]; G.fx(n.fx); });
    if (s.nicks.length && st.coll > 55 && G.chance(25)) { const id = s.nicks.shift(); G.toast('Кличка «' + D.NICKS[id].n + '» забылась.', 'good'); }
    // отношения стареют
    Object.keys(s.rel).forEach(id => { const r = s.rel[id], n = D.NPC[id]; if (n && n.romance && r.stage >= 1 && wk - r.last > 1) r.l = Math.max(-100, r.l - 2); if (n && n.romance && r.stage >= 3 && wk - r.last > 3 && r.l < 20) { r.stage = Math.max(0, r.stage - 1); } });
    // блокнотик стирается
    s.car.notes = s.car.notes.filter(n => wk - n.w < (n.big ? 24 : 12));
    // инструктаж повторный
    if (s.instr.perv != null) { const last = s.instr.povt != null ? s.instr.povt : s.instr.perv; if (wk - last >= 26 && !s.flags.povtDue) { s.flags.povtDue = 1; G.toast('Пора на повторный инструктаж (раз в 26 недель)!', 'warn'); } }
    // закрытие завода (разд. 11.2)
    let p = 0.0005; if (s.world.plant < 30) p *= 2; if (s.flags.audit) p *= 1.5;
    if (s.world.plant < 55 || G.week() > 20) { if (G.rnd() < p * 1) { if (G.career && G.career.closing) G.career.closing(); } }
    s.world.plant = C(s.world.plant - (G.chance(30) ? 1 : 0) + (G.chance(15) ? 1 : 0));
    // деньги в долг: проценты
    if (s.debt > 0) s.debt = Math.round(s.debt * 1.005);
    // союз
    if (wk === 4 && !s.car.union && !s.flags.unionOffered) { s.flags.unionOffered = 1; G.pendingUnion = true; }
    // отпускные дни
    if (wk % 4 === 0) s.car.vac += 2;
    if (G.extraWeekly) G.extraWeekly();
  };

  // ---------- Автосмена (разд. 4.3)
  G.autoShift = function () {
    const s = G.s; if (s.phase !== 'work') return;
    const j = G.job(), n = G.slotsLeft();
    let totalOps = 0;
    const aw = s.flags.autoW && s.flags.autoW.w === G.week() ? s.flags.autoW : (s.flags.autoW = { w: G.week(), n: 0 }); aw.n++;
    for (let i = 0; i < n && s.phase === 'work'; i++) {
      const q = G.quality() * (0.5 + G.rnd() * 0.35);
      s.day.ops++; s.day.qsum += q; s.stats.ops++; totalOps++;
      G.fx({ energy: -(j ? 2 + j.load * 1.2 : 3), bm: 0, know: 0.4, wear: 1.2, mood: -(j ? 0.2 + j.nerves * 0.15 : 0.6) });
      G.addMoney(Math.round((20 + s.car.rank * 5) * q / 100 * (s.car.rank === 0 ? 0.5 : 1)));
      s.st.bm += 1.2 * q / 100;
      G.advance(1); const hr = Math.floor(s.t.hour);
      if (G.career && G.career.hook) G.career.hook();
      if (G.chance(12)) { const inc = G.pick([{ x: 'Станок закашлялся — переделка.', f: { mood: -2, wear: 3 } }, { x: 'Мастер ворчал полчаса.', f: { boss: -1, mood: -2 } }, { x: 'Порезал палец. Заклеил.', f: { health: -2 } }, { x: 'Подслушал сплетню в курилке.', f: { mood: 2 } }, { x: 'Нашёл рубль на полу.', f: { money: 1, mood: 1 } }]); G.fx(inc.f); G.log('(автосмена) ' + inc.x); }
      if (G.chance(4)) G.caught({ risk: 40, fine: [100, 300], what: 'Задремал у станка' });
      if (hr === 12 && !s.day.lunched) { s.day.lunched = true; G.fx({ satiety: 15 }); G.advance(1); }
      else if (hr >= G.shiftEnd()) break;
    }
    if (s.phase === 'work') { s.t.hour = G.shiftEnd(); }
    G.toast('Автосмена: ' + totalOps + ' операций «на автомате».');
    G.endShift();
  };

  // ---------- Сохранение
  G.save = function () {
    try { if (G.s && !G.headless) localStorage.setItem(G.SAVE_KEY, JSON.stringify({ s: G.s, settings: G.settings })); } catch (e) {}
  };
  G.hasSave = function () { try { return !!localStorage.getItem(G.SAVE_KEY); } catch (e) { return false; } };
  G.load = function () {
    try {
      const raw = localStorage.getItem(G.SAVE_KEY); if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d.s || !d.s.st || !d.s.t) return false;
      G.s = G.migrate(d.s); Object.assign(G.settings, d.settings || {});
      return true;
    } catch (e) { return false; }
  };
  // Дозаполняет сохранение полями, которых в нём ещё нет (после обновления игры). Ничего не стирает.
  G.migrate = function (old) {
    const base = G.baseState(old.name, old.av, old.edu);
    const merge = (dst, src) => { Object.keys(src).forEach(k => { if (dst[k] === undefined) dst[k] = JSON.parse(JSON.stringify(src[k])); else if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object' && !Array.isArray(dst[k])) merge(dst[k], src[k]); }); };
    merge(old, base);
    if (!old.day || !old.day.done) old.day = Object.assign(G.freshDay(), old.day || {});
    old.gameVer = (G.CONFIG && G.CONFIG.VERSION) || old.gameVer;
    return old;
  };
  G.wipe = function () { try { localStorage.removeItem(G.SAVE_KEY); } catch (e) {} G.s = null; G.mq.length = 0; G.cur = null; G.busy = false; };
  G.records = function () { try { return JSON.parse(localStorage.getItem(G.REC_KEY) || '{}'); } catch (e) { return {}; } };
})();
