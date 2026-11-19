// Случайный «игрок»: каждый день выбирает случайные доступные действия и случайные варианты в окнах.
// Ловит исключения в действиях, NaN/выход за диапазон и зависания. Запуск из Playwright (tests/stage6_fuzz_test.py).
window.__fuzz = function (cfg) {
  const s0 = G.s; G.headless = true; G.CONFIG.API_URL = ''; G.CONFIG.CHAT_URL = '';
  let seed = cfg.seed >>> 0; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const out = { errors: [], bad: [], days: 0, end: null, acts: {}, modals: 0, stuck: 0, freeUsed: 0 };
  const err = (where, e) => { if (out.errors.length < 12) out.errors.push(where + ': ' + (e && e.message || e)); };
  const s = G.s;
  const check = (where) => {
    const n = [['money', s.money], ['day', s.t.day], ['rank', s.car.rank]].concat(Object.keys(s.st).map(k => ['st.' + k, s.st[k]]));
    n.forEach(([k, v]) => { if (typeof v !== 'number' || !isFinite(v)) { if (out.bad.length < 12) out.bad.push(where + ' ' + k + '=' + v); } });
    ['health', 'energy', 'mood', 'satiety'].forEach(k => { if (s.st[k] < -0.5 || s.st[k] > 100.5) { if (out.bad.length < 12) out.bad.push(where + ' ' + k + '=' + s.st[k]); } });
    if (s.car.rank < 0 || s.car.rank > 10) { if (out.bad.length < 12) out.bad.push(where + ' rank=' + s.car.rank); }
    Object.keys(s.rel).forEach(k => { const l = s.rel[k].l; if (typeof l !== 'number' || !isFinite(l)) { if (out.bad.length < 12) out.bad.push(where + ' rel.' + k + '=' + l); } });
    (s.loans || []).forEach(l => { if (!isFinite(l.left) || l.left < 0) { if (out.bad.length < 12) out.bad.push(where + ' loan ' + l.id + ' left=' + l.left); } });
  };
  const resolve = (where) => {
    let guard = 0;
    while ((G.cur || G.mq.length) && guard++ < 40 && !s.end) {
      if (!G.cur && G.mq.length) { G.cur = G.mq.shift(); }
      const m = G.cur; if (!m) break; out.modals++; lastModal = m.title || '';
      let ok = (m.opts || []).map((o, i) => (o.dis ? -1 : i)).filter(i => i >= 0);
      if (!cfg.chaos) { const good = ok.filter(i => !BAD.test(String(m.opts[i].t || ''))); if (good.length) ok = good; }
      if (!ok.length) { G.cur = null; G.busy = false; break; }
      const ci = pick(ok), m0 = s.st.mood; try { G.choose(ci); const dm = s.st.mood - m0; if (dm < -20 && (out.drops = out.drops || []).length < 8) out.drops.push('модал «' + (m.title || '') + '» → «' + String((m.opts[ci] || {}).t || '').slice(0, 50) + '» mood ' + Math.round(m0) + '→' + Math.round(s.st.mood)); } catch (e) { err(where + ' modal "' + (m.title || '') + '"', e); G.cur = null; G.busy = false; }
    }
    if (guard >= 40) { out.loops = (out.loops || 0) + 1; (out.stuckInfo = out.stuckInfo || []).push('modal-loop: ' + (G.cur && G.cur.title)); G.cur = null; G.mq.length = 0; G.busy = false; }
  };
  const BAD = /взят|конверт|укра|своров|стащ|напит|водк|уволь|запанибр|нагруб|посла|обман|совр|подра|удар|припис|вполсил|не лез|прогул|уйти|уволит|бросить|вычеркн|выгнать|сжечь|сдать|настучать|донос|подлог|подправить|шантаж|вымогат|намекн|стукн|подстав|мошен|пьян|выпить|бухн|рюмоч|пиво|самогон|пить/i;
  const KEY = { evening: 'free', weekend: 'free' };
  const actions = () => { const k = KEY[s.phase] || s.phase; return Object.keys(G.ACT).filter(id => { const a = G.ACT[id]; if (!a.ph || a.ph.indexOf(k) < 0) return false; try { return !G.avail(a); } catch (e) { return false; } }); };
  const lastDay = s.t.day + cfg.days;
  let lastId = '', lastModal = ''; const recent = [];
  let steps = 0, guardDay = -1, sameDay = 0, phSteps = 0, lastPh = '';
  const EAT = /eat|cook|cafe|canteen|lunch|shop_menu|fridge/;
  while (s.t.day < lastDay && !s.end && steps++ < cfg.days * 120) {
    if (s.t.day !== guardDay) { (out.series = out.series || []).push(s.t.day + ':m' + Math.round(s.st.mood) + '/e' + Math.round(s.st.energy) + '/h' + Math.round(s.st.health) + '/s' + Math.round(s.st.satiety)); guardDay = s.t.day; sameDay = 0; } else if (++sameDay > 100) { out.stuck++; (out.stuckInfo = out.stuckInfo || []).push(s.phase + ' h' + s.t.hour + ' loc=' + s.loc + ' last=' + recent.join(',')); try { G.sleep(); } catch (e) { err('force-sleep', e); } sameDay = 0; }
    if (s.phase !== lastPh) { lastPh = s.phase; phSteps = 0; } else phSteps++;
    try {
      resolve('pre'); if (s.end) break;
      const ph = s.phase; let ids = actions(); if (!cfg.chaos) { const sane = ids.filter(i => !BAD.test(String(G.ACT[i].n || '')) && !/^(steal|loot|otchib|drink|vodka|fight|nap|smoke_shop|use_|sick_|stay_|buy_sick|side_work|study_ws|milk|check_dwg_skip)/.test(i)); if (sane.length) ids = sane; }
      // переходы между фазами — как кнопки интерфейса
      if (ph === 'morning' && (phSteps >= 2 || !ids.length || rnd() < 0.4)) { G.career.goToWork(); resolve('goToWork'); check('goToWork'); continue; }
      if (ph === 'locker' && (phSteps >= 2 || !ids.length || rnd() < 0.5)) { G.career.toWorkplace(); resolve('toWorkplace'); check('toWorkplace'); continue; }
      if (ph === 'lunch' && (phSteps >= 3 || s.lunchAP <= 0 || !ids.length || rnd() < 0.3)) { G.endLunch(); resolve('endLunch'); check('endLunch'); continue; }
      if (!ids.length) { try { G.advance(1); } catch (e) { err('advance', e); } resolve('adv'); check('adv'); continue; }
      let id;
      const hungry = s.st.satiety < 55 || (s.flags.starveH || 0) >= 10, eats = ids.filter(i => EAT.test(i)), glum = s.st.mood < 40, fun = ids.filter(i => { const f = G.ACT[i].fx; return f && typeof f === 'object' && f.mood > 0 && !(f.health < 0); });
      if (ph === 'work' && ids.indexOf('work') >= 0 && rnd() < 0.55) id = 'work';
      else if (hungry && eats.length && rnd() < 0.9) id = pick(eats);
      else if (hungry && !eats.length && (s.flags.starveH || 0) >= 14) { G.fx({ satiety: 40 }); continue; }
      else if (s.st.mood < 55 && fun.length && rnd() < 0.7) id = pick(fun);
      else if ((ph === 'evening' || ph === 'weekend') && ids.indexOf('sleep') >= 0 && (phSteps > 7 || s.st.energy < 25 || s.t.hour >= 24 || rnd() < 0.1)) id = 'sleep';
      else id = pick(ids);
      const a = G.ACT[id]; if (a.loc) s.loc = a.loc;
      out.acts[id] = (out.acts[id] || 0) + 1;
      const mA = s.st.mood; lastId = id; recent.push(id); if (recent.length > 8) recent.shift(); G.runAction(id); if (s.st.mood - mA < -20 && (out.drops = out.drops || []).length < 8) out.drops.push('действие ' + id + ' mood ' + Math.round(mA) + '→' + Math.round(s.st.mood) + ' ph=' + s.phase + ' h=' + s.t.hour + ' st=' + JSON.stringify(s.st) + ' f=' + Object.keys(s.flags).filter(k => /hang|sick|cop|dep|lost|bad|bender|zapoy|panic|breakdown|crisis/i.test(k)).join(',')); resolve(id);
      if (cfg.trace && s.t.day >= cfg.trace) (out.trace = out.trace || []).push(id + ' -> d' + s.t.day + ' ' + s.phase + ' mood=' + Math.round(s.st.mood * 10) / 10 + ' sat=' + Math.round(s.st.satiety) + ' hp=' + Math.round(s.st.health));
      check(id);
    } catch (e) { err('step', e); try { G.cur = null; G.mq.length = 0; G.busy = false; } catch (x) {} }
  }
  out.days = s.t.day - (lastDay - cfg.days); out.end = s.end ? s.end.id : null; out.money = Math.round(s.money); out.rank = s.car.rank; out.shifts = s.car.shifts; out.free = s.flags.freePlay || 0;
  out.last = lastId + ' | ' + lastModal + ' | ' + (s.end && s.end.why ? s.end.why.join('; ') : '');
  out.nActs = Object.keys(out.acts).length;
  return out;
};
