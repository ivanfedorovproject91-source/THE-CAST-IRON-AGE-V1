/* ===== Связь с сервером чата/админки: пинг (онлайн, бан), параметры игры, роль =====
   Роль, бан и параметры приходят ТОЛЬКО с сервера (подпись Telegram проверяется там). Клиент их не определяет. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const CFG = G.CONFIG;
  const S = (G.srv = { role: '', perms: [], ban: null, mute: null, cfg: null, last: 0, seenAnn: '' });
  const KEY = 'cv_srv_cfg';
  const tg = () => { try { return window.Telegram && window.Telegram.WebApp; } catch (e) { return null; } };
  S.initData = () => { const t = tg(); return (t && t.initData) || ''; };
  S.url = () => CFG.CHAT_URL || '';
  S.available = () => !!(S.url() && S.initData());
  S.post = function (body) {
    return fetch(S.url(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ initData: S.initData() }, body)) }).then(r => r.json());
  };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Серверные игровые параметры (только числовые, только известные ключи config.js)
  const LIMITS = { AUTO_PER_WEEK: [0, 14], CANTEEN_LIMIT: [0, 20], DRAIN_ENERGY: [0, 3], DRAIN_MOOD: [0, 3], OP_ENERGY_MULT: [0.1, 3], HEAL_FACTOR: [0.1, 3], SAT_DRAIN_WORK: [0, 15], SAT_DRAIN_REST: [0, 15], REL_TALK_MULT: [0.1, 5], REL_TALK_NEG_MULT: [0.1, 5], REL_DAILY_CAP: [1, 60], FISH_PLAN_DAYS: [1, 14], WALK_LATE: [0, 100], MOOD_CAP_TRAINEE: [10, 100] };
  const BASE = {}; Object.keys(LIMITS).forEach(k => { BASE[k] = CFG[k]; });
  function applyCfg(c) {
    if (!c) return;
    S.cfg = c;
    Object.keys(LIMITS).forEach(k => { // вернуть базовое значение, затем наложить серверное
      const v = c.params && c.params[k];
      CFG[k] = (typeof v === 'number' && v >= LIMITS[k][0] && v <= LIMITS[k][1]) ? v : BASE[k];
    });
    if (G.radio) G.radio.setConfig(c.radio);
  }
  try { applyCfg(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) {}

  function banScreen() {
    let el = document.getElementById('ban-ov');
    if (!S.ban) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'ban-ov'; el.className = 'ban-ov'; document.getElementById('app').appendChild(el); }
    const until = S.ban.until ? 'до ' + new Date(S.ban.until).toLocaleString('ru-RU') : 'бессрочно';
    el.innerHTML = '<div class="ban-box"><h2>⛔ Пропуск аннулирован</h2><p>Доступ к игре ограничен администрацией (' + until + ').</p><p class="note">Причина: ' + esc(S.ban.reason || '—') + '</p></div>';
  }
  S.ping = function () {
    if (!S.available() || !G.s || G.s.phase === 'new') return;
    S.last = Date.now();
    let p = {};
    try { p = { name: G.s.name, job: G.jobTitle(), rank: G.s.car.rank, shifts: G.s.car.shifts, oj: G.ojScore(), money: Math.round(G.s.money), days: G.s.t.day, v: CFG.VERSION }; } catch (e) {}
    S.post(Object.assign({ action: 'ping' }, p)).then(j => {
      if (!j || !j.ok) return;
      S.role = j.role || ''; S.perms = j.perms || []; S.ban = j.ban || null; S.mute = j.mute || null;
      applyCfg(j.cfg); try { localStorage.setItem(KEY, JSON.stringify(j.cfg)); } catch (e) {}
      banScreen();
      if (j.forceName && G.s && G.s.name !== j.forceName) { G.s.name = j.forceName; G.save && G.save(); G.ui && G.ui.render(); S.last = 0; }
      const a = j.cfg && j.cfg.announce;
      if (a && a !== S.seenAnn) { S.seenAnn = a; let seen = ''; try { seen = localStorage.getItem('cv_ann') || ''; } catch (e) {} if (seen !== a) { try { localStorage.setItem('cv_ann', a); } catch (e) {} G.toast && G.toast('📢 Объявление администрации: ' + esc(a)); } }
    }).catch(() => {});
  };
  setTimeout(S.ping, 3000);
  setInterval(() => { if (!document.hidden && Date.now() - S.last > 150000) S.ping(); }, 20000);
})();
