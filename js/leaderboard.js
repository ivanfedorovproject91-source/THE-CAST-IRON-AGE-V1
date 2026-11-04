/* ===== Общий рейтинг: клиент (сервер — папка server/) ===== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const CFG = G.CONFIG;
  const LB = (G.lb = { cache: {}, last: 0, by: 'oj', err: null, loading: false });
  LB.configured = () => !!CFG.API_URL;
  const api = p => CFG.API_URL.replace(/\/+$/, '') + p;
  function headers() {
    const h = { 'Content-Type': 'application/json' };
    try { const tg = window.Telegram && window.Telegram.WebApp; if (tg && tg.initData) h['X-Init-Data'] = tg.initData; } catch (e) {}
    if (!h['X-Init-Data']) { try { const d = localStorage.getItem('cv_dev_id'); if (d) h['X-Dev-User'] = d; } catch (e) {} }
    return h;
  }
  LB.payload = function () {
    const s = G.s;
    return { v: CFG.VERSION, name: s.name, oj: G.ojScore(), shifts: s.car.shifts, rank: s.car.rank, days: s.t.day, money: Math.round(s.money), job: G.jobTitle(), end: s.end ? s.end.id : null, hidden: G.settings.lbOn === false };
  };
  // Отправка результата. Не чаще раза в 45 секунд (кроме force). Читерам (отладочное меню) — не отправляем.
  LB.submit = function (force) {
    const s = G.s;
    if (!LB.configured() || !s || s.flags.dbg || s.phase === 'new') return;
    const now = Date.now();
    if (!force && now - LB.last < 45000) return;
    LB.last = now;
    try {
      fetch(api('/api/score'), { method: 'POST', headers: headers(), body: JSON.stringify(LB.payload()), keepalive: true })
        .then(r => r.json()).then(j => { if (j && j.ok) LB.cache = {}; }).catch(() => {});
    } catch (e) {}
  };
  LB.load = function (by, force) {
    if (!LB.configured() || LB.loading) return;
    const c = LB.cache[by];
    if (c && !force && Date.now() - c.t < 60000) return;
    LB.loading = true; LB.err = null;
    fetch(api('/api/top?by=' + by + '&limit=50'), { headers: headers() })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(j => { LB.cache[by] = { t: Date.now(), data: j }; })
      .catch(e => { LB.err = String(e.message || e); })
      .then(() => { LB.loading = false; if (G.ui && G.ui.tab === 'rating' && !G.cur) { G.ui.keepScroll = true; G.ui.render(); } });
  };
})();
