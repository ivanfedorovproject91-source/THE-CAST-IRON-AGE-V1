/* ===== Точка входа: Telegram Mini App, загрузка сохранения ===== */
(function () {
  'use strict';
  const G = window.G;
  function tgInit() {
    try {
      const tg = window.Telegram && window.Telegram.WebApp;
      if (tg) {
        tg.ready(); tg.expand();
        try { tg.setHeaderColor('#121110'); tg.setBackgroundColor('#121110'); tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {}
        try { tg.onEvent && tg.onEvent('viewportChanged', fit); } catch (e) {}
      }
    } catch (e) {}
  }
  window.__tgInit = tgInit; tgInit();
  // высота приложения: в некоторых WebView 100% даёт ноль — задаём явно
  function fit() { try { const h = window.innerHeight || document.documentElement.clientHeight; if (h > 200) document.documentElement.style.setProperty('--app-h', h + 'px'); } catch (e) {} }
  fit(); window.addEventListener('resize', fit); window.addEventListener('orientationchange', function () { setTimeout(fit, 200); });
  // страховка от «мёртвого экрана»: если через 3 с ничего не нарисовано — показываем панель восстановления
  setTimeout(function () {
    try {
      const sc = document.getElementById('screen');
      if (sc && sc.innerHTML.length > 50) return;
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;inset:0;z-index:999;background:#121110;color:#eee;padding:24px;font-family:sans-serif;overflow:auto';
      d.innerHTML = '<h2>Игра не смогла запуститься</h2><p>Нажми «Перезапустить». Если не помогло — «Сбросить сохранение» (прогресс этого устройства будет стёрт).</p><p style="font-size:12px;color:#aaa">Диагностика: ' + (window.__errs || []).slice(0, 5).join(' | ').replace(/</g, '&lt;') + '<br>' + (navigator.userAgent || '') + '</p><button style="font-size:18px;padding:12px 18px;margin:6px" onclick="location.reload()">Перезапустить</button><button style="font-size:18px;padding:12px 18px;margin:6px" onclick="try{localStorage.clear()}catch(e){};location.reload()">Сбросить сохранение</button>';
      document.body.appendChild(d);
    } catch (e) {}
  }, 3000);
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
