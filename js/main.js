/* ===== Точка входа: Telegram Mini App, загрузка сохранения ===== */
(function () {
  'use strict';
  const G = window.G;
  try {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg) {
      tg.ready(); tg.expand();
      try { tg.setHeaderColor('#121110'); tg.setBackgroundColor('#121110'); tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {}
    }
  } catch (e) {}
  window.addEventListener('pagehide', () => G.save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) G.save(); });
  // Темп прогрессии (config.js → PACE)
  const pace = (G.CONFIG && G.CONFIG.PACE) || 1;
  if (pace !== 1) Object.keys(G.D.REQ).forEach(k => { const r = G.D.REQ[k]; r.shifts = Math.round(r.shifts * pace); r.bm = Math.round(r.bm * pace); });
  G.load();
  if (G.s && G.s.phase === 'new') G.wipe();
  G.ui.mode = 'title';
  // если было сохранение — показываем титул с кнопкой «Продолжить»
  const keep = G.s; G.s = null; G.ui.render(); G.s = keep;
  window.G = G;
})();
