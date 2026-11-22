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
      d.innerHTML = '<h2>Игра не смогла запуститься</h2><p>Нажми «Перезапустить». Если не помогло — «Сбросить сохранение» (прогресс этого устройства будет стёрт).</p><p style="font-size:12px;color:#aaa">Диагностика: ' + ((window.__failed && window.__failed.length) ? 'не загрузились файлы: ' + window.__failed.join(', ') + ' | ' : '') + (window.__errs || []).slice(0, 5).join(' | ').replace(/</g, '&lt;') + '<br>' + (navigator.userAgent || '') + '</p><button style="font-size:18px;padding:12px 18px;margin:6px" onclick="location.reload()">Перезапустить</button><button style="font-size:18px;padding:12px 18px;margin:6px" onclick="try{var ks=[];for(var i=0;i<localStorage.length;i++){var n=localStorage.key(i);if(n.indexOf(\'chugunny_vek_relics\')!==0)ks.push(n)}ks.forEach(function(n){localStorage.removeItem(n)})}catch(e){};location.reload()">Сбросить сохранение</button>';
      document.body.appendChild(d);
    } catch (e) {}
  }, 3000);
  // ПК-версия Telegram: горизонтальные ряды (локации, люди, вкладки) листаются колёсиком и мышью.
  // Делегирование на document — работает и после перерисовки экрана.
  (function hScroll() {
    const SEL = '.chips, .ppl, .rl-chips, .adm-tabs';
    let box = null, startX = 0, startLeft = 0, moved = false;
    document.addEventListener('wheel', function (e) {
      const el = e.target.closest && e.target.closest(SEL);
      if (!el || el.scrollWidth <= el.clientWidth + 1) return;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      const max = el.scrollWidth - el.clientWidth;
      if ((d < 0 && el.scrollLeft <= 0) || (d > 0 && el.scrollLeft >= max - 1)) return; // край — пусть листается страница
      el.scrollLeft += d; e.preventDefault();
    }, { passive: false });
    document.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      const el = e.target.closest && e.target.closest(SEL);
      if (!el || el.scrollWidth <= el.clientWidth + 1) return;
      box = el; startX = e.clientX; startLeft = el.scrollLeft; moved = false;
    });
    document.addEventListener('mousemove', function (e) {
      if (!box) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) { moved = true; box.classList.add('hs-drag'); }
      if (moved) box.scrollLeft = startLeft - dx;
    });
    function end() { if (box) box.classList.remove('hs-drag'); box = null; }
    document.addEventListener('mouseup', end);
    window.addEventListener('blur', end);
    // после перетаскивания клик по кнопке под курсором не засчитываем
    document.addEventListener('click', function (e) {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
    }, true);
  })();
  window.addEventListener('pagehide', () => G.save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) G.save(); });
  // Темп прогрессии (config.js → PACE) применяется в career_ladder.js
  G.load();
  if (G.s && G.s.phase === 'new') G.wipe();
  G.ui.mode = 'title';
  // если было сохранение — показываем титул с кнопкой «Продолжить»
  const keep = G.s; G.s = null; G.ui.render(); G.s = keep;
  window.G = G;
})();
