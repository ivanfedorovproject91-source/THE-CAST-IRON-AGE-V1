/* ===== Общий рейтинг: клиент (сервер — Google Apps Script + Google Таблица, см. инструкцию) ===== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const CFG = G.CONFIG;
  const LB = (G.lb = { cache: {}, last: 0, by: 'oj', err: null, loading: false });
  LB.configured = () => !!CFG.API_URL;
  // Идентификатор устройства (для игроков вне Telegram) и Telegram-данные
  function devId() {
    try { let d = localStorage.getItem('cv_dev_id'); if (!d) { d = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem('cv_dev_id', d); } return d; } catch (e) { return 'nodev'; }
  }
  function tg() { try { return window.Telegram && window.Telegram.WebApp; } catch (e) { return null; } }
  LB.uid = function () { const t = tg(); const u = t && t.initDataUnsafe && t.initDataUnsafe.user; return u && u.id ? 'tg:' + u.id : 'dev:' + devId(); };
  const seasonId = () => new Date().toISOString().slice(0, 7);
  LB.payload = function () {
    const s = G.s, t = tg();
    return { action: 'score', v: CFG.VERSION, name: s.name, oj: G.ojScore(), shifts: s.car.shifts, rank: s.car.rank, days: s.t.day, money: Math.round(s.money), job: G.jobTitle(), end: s.end ? s.end.id : null, hidden: G.settings.lbOn === false,
      season: seasonId(), seasonBest: G.seasonBest ? G.seasonBest() : 0, dev: devId(), initData: t && t.initData ? t.initData : '' };
  };
  // Отправка результата. Не чаще раза в 45 секунд (кроме force). Читерам (отладочное меню) — не отправляем.
  // Content-Type text/plain — «простой» запрос, который Google Apps Script принимает без CORS-предзапроса.
  LB.submit = function (force) {
    const s = G.s;
    if (!LB.configured() || !s || s.flags.dbg || s.phase === 'new') return;
    const now = Date.now();
    if (!force && now - LB.last < 45000) return;
    LB.last = now;
    try {
      fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(LB.payload()) })
        .then(r => r.json()).then(j => { if (j && j.ok) LB.cache = {}; }).catch(() => {});
    } catch (e) {}
  };
  LB.load = function (by, force) {
    if (!LB.configured() || LB.loading) return;
    const c = LB.cache[by];
    if (c && !force && Date.now() - c.t < 60000) return;
    LB.loading = true; LB.err = null;
    fetch(CFG.API_URL + (CFG.API_URL.indexOf('?') >= 0 ? '&' : '?') + 'action=top&by=' + encodeURIComponent(by) + '&limit=50&uid=' + encodeURIComponent(LB.uid()))
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(j => { if (!j || j.ok === false) throw new Error((j && j.error) || 'ошибка сервера'); LB.cache[by] = { t: Date.now(), data: j }; })
      .catch(e => { LB.err = String(e.message || e); })
      .then(() => { LB.loading = false; if (G.ui && G.ui.tab === 'rating' && !G.cur) { G.ui.keepScroll = true; G.ui.render(); } });
  };
})();
