/* ===== V3.4 (3.9.0): договорённость о рыбалке, отношения быстрее меняются при общении ===== */
(function () {
  'use strict';
  const G = window.G, D = G.D, CFG = G.CONFIG;
  const msg = (t, c) => G.toast(t, c);
  const first = id => (D.NPC[id] ? D.NPC[id].name.split(' ')[0] : id);

  // ---------- Что нового
  if (G.CHANGELOG) G.CHANGELOG.unshift({ v: 'V3.4', date: CFG.GAME_DATE, items: [
    '🚽 Исправлено «бесконечное нажатие» в туалет: после забега позывы на сегодня прекращаются, не больше двух забегов в день.',
    '☕ Утренний кофе бодрит заметно сильнее (+20 энергии), кофе в столовой и растворимый тоже.',
    '🛒 В магазине больше еды: лапша, пирожки, сосиски, кефир, фрукты, батончик, тушёнка, шаурма, пицца и другое.',
    '🤝 Отношения с коллегами быстрее меняются при общении (разговоры, шутки, посиделки).',
    '🎣 Если договорился с кем-то о рыбалке, после работы появляется кнопка «Пойти на рыбалку» (вкладка «Дом»). Не сходишь за 3 дня — друг обидится.',
    '⚡ Энергия и сытость расходуются медленнее.'
  ] });

  // ---------- Отношения: общение меняет их быстрее
  let talkDepth = 0;
  const inTalk = fn => function () { talkDepth++; try { return fn.apply(this, arguments); } finally { talkDepth--; } };
  const _relAdd = G.relAdd;
  G.relAdd = function (id, d) {
    if (talkDepth > 0 && typeof d === 'number') d *= d >= 0 ? (CFG.REL_TALK_MULT || 1) : (CFG.REL_TALK_NEG_MULT || 1);
    return _relAdd.call(this, id, d);
  };
  const wrapOpts = spec => (spec && Array.isArray(spec.opts))
    ? Object.assign({}, spec, { opts: spec.opts.map(o => (o && o.fn) ? Object.assign({}, o, { fn: inTalk(o.fn) }) : o) })
    : spec;
  // меню общения: кнопки внутри них считаются «общением», пока меню строится
  ['talkTo', 'talkMenu', 'friendMenu', 'callNpc'].forEach(name => {
    const orig = G[name]; if (typeof orig !== 'function') return;
    G[name] = function () {
      const m = G.modal;
      G.modal = function (spec) { return m.call(this, wrapOpts(spec)); };
      try { return orig.apply(this, arguments); } finally { G.modal = m; }
    };
  });

  // ---------- Рыбалка: договорённость → кнопка после работы
  G.fishPlanSet = function (id) {
    const s = G.s; if (!s || !D.NPC[id]) return;
    s.flags.fishPlan = { id: id, day: s.t.day, until: s.t.day + (CFG.FISH_PLAN_DAYS || 3) };
  };
  G.fishPlan = function () {
    const s = G.s, p = s && s.flags && s.flags.fishPlan;
    return p && p.until >= s.t.day && D.NPC[p.id] ? p : null;
  };
  G.fishPlanGo = function () {
    const s = G.s, p = G.fishPlan();
    if (!p || !G.isFree() || G.busy) return;
    if (s.t.hour + 2 > 26) { msg('Уже слишком поздно для рыбалки.', 'warn'); return; }
    if (s.st.energy < 10) { msg('Нет сил на рыбалку.', 'warn'); return; }
    s.flags.fishPlan = null; // обещание выполнено, повторно кнопка не появится
    G.relAdd(p.id, 3);
    msg(first(p.id) + ': «Молодец, что пришёл. Слово держишь».', 'good');
    G.fishGame(p.id);
  };

  // Любой ответ-договорённость в диалогах: { fishPlan: 'seryoga' }
  const _fx = G.fx;
  G.fx = function (o, ctx) {
    const r = _fx.apply(this, arguments);
    try { if (o && o.fishPlan) G.fishPlanSet(o.fishPlan); } catch (e) {}
    return r;
  };

  // Карточка с кнопкой в начале вкладки «Дом» (вечером и в выходные)
  const _top = G.shiftTop;
  G.shiftTop = function () {
    let h = _top ? _top.apply(this, arguments) : '';
    try {
      const s = G.s, p = s && G.fishPlan();
      if (p && G.isFree()) {
        const late = s.t.hour + 2 > 26, tired = s.st.energy < 10;
        h += '<div class="card" style="border-left:4px solid #3aa0c8"><b>🎣 Рыбалка с ' + first(p.id) + '</b> — вы договорились. <span class="note">Пруд, термос и тишина (2 ч).</span>'
          + '<div class="cta"><button class="btn big hazard" ' + (late || tired ? 'disabled' : '') + ' onclick="G.fishPlanGo()">🎣 ПОЙТИ НА РЫБАЛКУ →</button></div>'
          + (late ? '<div class="note">Слишком поздно, не успеешь.</div>' : tired ? '<div class="note">Нет сил: сначала отдохни.</div>' : '') + '</div>';
      }
    } catch (e) {}
    return h;
  };

  // Напоминание, когда смена закончилась
  const _es = G.endShift;
  G.endShift = function () {
    const wasWork = G.s && G.s.phase !== 'evening';
    const r = _es.apply(this, arguments);
    try { const p = wasWork && G.fishPlan(); if (p) msg('🎣 Ты договорился о рыбалке с ' + first(p.id) + '. Кнопка ждёт во вкладке «Дом».', 'good'); } catch (e) {}
    return r;
  };

  // Не сходил вовремя: друг обижается
  const _ed = G.extraDaily;
  G.extraDaily = function () {
    const r = _ed ? _ed.apply(this, arguments) : undefined;
    try {
      const s = G.s, p = s.flags.fishPlan;
      if (p && p.until < s.t.day) {
        s.flags.fishPlan = null; G.relAdd(p.id, -3);
        msg(first(p.id) + ': «Ты же обещал на рыбалку… Мы прождали зря».', 'warn');
      }
    } catch (e) {}
    return r;
  };
})();
