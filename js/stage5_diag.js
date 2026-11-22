/* ===== Этап 5: диагностика загрузки модулей и меню «Диагностика» =====
   Раньше сбой одного из ~50 скриптов (404, обрыв связи, исключение при загрузке) оставлял игру «наполовину рабочей» без единого сообщения.
   Теперь: список ожидаемых модулей берётся из index.html; проверяется, что каждый загрузился, а ключевые функции существуют;
   при проблеме сверху показывается плашка с кнопкой «Подробнее» и копируемым отчётом. Журнал последних ошибок хранится в localStorage (cv_diag). */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const DG = (G.diag = { notes: [], missing: [], failed: [], checked: false });
  const KEY = 'cv_diag';
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

  // ключевые функции по модулям: если файл загрузился, но не определил своё — тоже сообщаем
  const NEED = [['engine.js', 'G.modal'], ['engine.js', 'G.save'], ['career.js', 'G.career'], ['ui.js', 'G.ui'], ['ceo.js', 'G.ceo'], ['company.js', 'G.co'], ['stage3_credit.js', 'G.loanSchema'], ['stage3_housing.js', 'G.housing'],
    ['stage3_lifestyle.js', 'G.lifestyle'], ['stage4_events.js', 'G.later'], ['stage4_social.js', 'G.friendCooling'], ['stage4_ceo.js', 'G.continueFree'], ['stage4_hierarchy.js', 'G.aboveMe'], ['stage5_saves.js', 'G.saveSane'],
    ['leaderboard.js', 'G.lb'], ['srv.js', 'G.srv'], ['cloud.js', 'G.cloud'], ['v38.js', 'G.bossTalk'], ['v34.js', 'G.friends'], ['actions.js', 'G.runAction'], ['premium.js', 'G.premium']];
  const dig = path => path.split('.').slice(1).reduce((o, k) => (o == null ? o : o[k]), G);

  DG.note = function (kind, text) {
    const e = { t: Date.now(), kind, text: String(text).slice(0, 300) }; DG.notes.push(e); if (DG.notes.length > 50) DG.notes.shift();
    try { const old = JSON.parse(ls.get(KEY) || '[]'); old.push(e); ls.set(KEY, JSON.stringify(old.slice(-30))); } catch (x) {}
  };
  DG.check = function () {
    const list = Array.prototype.map.call(document.scripts, s => s.src).filter(Boolean).map(u => u.split('/').pop().split('?')[0]).filter(n => /\.js$/.test(n) && !/telegram/.test(n));
    DG.failed = (window.__failed || []).filter((v, i, a) => a.indexOf(v) === i);
    DG.missing = NEED.filter(n => list.indexOf(n[0]) >= 0 && dig(n[1]) == null).map(n => n[0] + ' → ' + n[1].replace(/^G\./, ''));
    DG.errors = (window.__errs || []).slice(0, 10); DG.modules = list.length; DG.checked = true;
    DG.failed.forEach(f => DG.note('load', 'не загрузился: ' + f)); DG.missing.forEach(m => DG.note('missing', m)); DG.errors.slice(0, 3).forEach(m => DG.note('error', m));
    return DG;
  };
  DG.ok = () => !DG.failed.length && !DG.missing.length;
  DG.text = function () {
    const c = (G.CONFIG && G.CONFIG.VERSION) || '?', lines = ['Чугунный век ' + c, 'Модулей в списке: ' + DG.modules, 'Не загрузились: ' + (DG.failed.join(', ') || 'нет'), 'Отсутствуют функции: ' + (DG.missing.join('; ') || 'нет'), 'Ошибки при загрузке: ' + ((DG.errors || []).join(' | ') || 'нет'),
      'Сохранение: ' + JSON.stringify(G.loadInfo || {}), 'Облако: ' + ((G.cloud && (G.cloud.status || (G.cloud.available() ? 'доступно' : 'нет'))) || '—'), 'UA: ' + (navigator.userAgent || '')];
    try { lines.push('Журнал: ' + (JSON.parse(ls.get(KEY) || '[]').slice(-8).map(e => e.kind + ':' + e.text).join(' | ') || 'пусто')); } catch (e) {}
    return lines.join('\n');
  };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function banner() {
    if (DG.ok() || document.getElementById('diag-bar')) return;
    const d = document.createElement('div'); d.id = 'diag-bar';
    d.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:998;background:#7a2a10;color:#fff;padding:6px 10px;font:12px sans-serif;display:flex;gap:8px;align-items:center';
    d.innerHTML = '<span style="flex:1">⚠ Часть игры не загрузилась (' + (DG.failed.length + DG.missing.length) + '). Попробуйте перезапустить.</span><button style="padding:4px 8px" onclick="G.diag.show()">Подробнее</button><button style="padding:4px 8px" onclick="this.parentNode.remove()">✕</button>';
    document.body.appendChild(d);
  }
  DG.show = function () {
    DG.check(); const t = DG.text();
    G.modal({ title: 'ℹ Диагностика', wide: true, text: '<pre style="white-space:pre-wrap;font-size:11px;text-align:left">' + esc(t) + '</pre>', opts: [
      { t: '📋 Скопировать отчёт', fn: () => { try { navigator.clipboard.writeText(t); G.toast('Отчёт скопирован.'); } catch (e) { G.toast('Не удалось скопировать — выделите текст вручную.', 'warn'); } } },
      { t: '🔄 Перезапустить', fn: () => { try { location.reload(); } catch (e) {} } }, { t: 'Закрыть', fn: () => {} }] });
  };
  window.addEventListener('load', () => setTimeout(() => { try { DG.check(); banner(); } catch (e) {} }, 700));
})();
