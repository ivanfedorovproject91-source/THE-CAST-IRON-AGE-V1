/* ===== Облачное сохранение через Telegram CloudStorage (v3.14) =====
   Зачем: прогресс в localStorage теряется при очистке кэша Telegram и не переносится на другое устройство.
   Как: копия сохранения режется на куски (лимит значения — 4096 символов) и лежит в CloudStorage пользователя.
   При запуске: если локального сохранения нет, а в облаке есть — восстанавливаем; если облако новее локального — спрашиваем.
   Без Telegram (обычный браузер) модуль молча ничего не делает. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const CL = (G.cloud = { status: '', lastPush: 0 });
  const CHUNK = 3500, MAX_CHUNKS = 400, TS_KEY = 'cv_local_ts', PUSH_EVERY = 25000;
  const tg = () => { try { return window.Telegram && window.Telegram.WebApp; } catch (e) { return null; } };
  const store = () => { const t = tg(); return t && t.CloudStorage && (!t.isVersionAtLeast || t.isVersionAtLeast('6.9')) ? t.CloudStorage : null; };
  CL.available = () => !!store();

  const call = (fn, ...args) => new Promise((res, rej) => { try { store()[fn](...args, (err, val) => (err ? rej(err) : res(val))); } catch (e) { rej(e); } });
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  let busy = false, dirty = false, timer = null;
  CL.push = async function () {
    if (!store() || G.headless || busy) { dirty = dirty || busy; return false; }
    const raw = lsGet(G.SAVE_KEY); if (!raw) return false;
    busy = true; dirty = false;
    try {
      const n = Math.ceil(raw.length / CHUNK);
      if (n > MAX_CHUNKS) { CL.status = 'сохранение слишком большое для облака'; return false; }
      const ts = Date.now();
      let old = 0; try { old = (JSON.parse(await call('getItem', 'cv_meta') || '{}').n) || 0; } catch (e) {}
      for (let i = 0; i < n; i++) await call('setItem', 'cv_' + i, raw.slice(i * CHUNK, (i + 1) * CHUNK));
      await call('setItem', 'cv_meta', JSON.stringify({ n, ts, len: raw.length, v: (G.CONFIG && G.CONFIG.VERSION) || '' })); // метка — последней: неполная запись не принимается
      if (old > n) { const ks = []; for (let i = n; i < old; i++) ks.push('cv_' + i); await call('removeItems', ks); }
      lsSet(TS_KEY, String(ts)); CL.lastPush = ts; CL.status = 'сохранено в облако'; return true;
    } catch (e) { CL.status = 'облако недоступно'; return false; }
    finally { busy = false; if (dirty) schedule(); }
  };

  CL.pull = async function () {
    if (!store()) return null;
    try {
      const meta = JSON.parse(await call('getItem', 'cv_meta') || 'null'); if (!meta || !meta.n) return null;
      let raw = ''; for (let i = 0; i < meta.n; i++) { const part = await call('getItem', 'cv_' + i); if (!part) return null; raw += part; }
      if (meta.len && raw.length !== meta.len) return null; // повреждена или записывается прямо сейчас
      const d = JSON.parse(raw); if (!d || !d.s || !d.s.st || !d.s.t) return null;
      return { meta, raw, d };
    } catch (e) { return null; }
  };

  const restore = c => { lsSet(G.SAVE_KEY, c.raw); lsSet(TS_KEY, String(c.meta.ts)); try { location.reload(); } catch (e) {} };

  CL.sync = async function () {
    if (!store()) { CL.status = 'облако недоступно (откройте игру из Telegram)'; return; }
    const c = await CL.pull();
    if (!c) { if (lsGet(G.SAVE_KEY)) CL.push(); return; }
    const local = lsGet(G.SAVE_KEY), localTs = +lsGet(TS_KEY) || 0;
    if (!local) { restore(c); return; }
    if (c.meta.ts > localTs + 60000 && c.raw !== local) {
      const info = c.d.s.name + ', день ' + (c.d.s.t && c.d.s.t.day) + ', смен ' + (c.d.s.car && c.d.s.car.shifts);
      G.modal({ title: '☁ Найден прогресс в облаке', text: 'В облаке Telegram есть более новое сохранение (' + info + '). Загрузить его вместо этого?<br><small>Текущее сохранение на этом устройстве будет заменено.</small>',
        opts: [{ t: 'Загрузить из облака', fn: () => restore(c) }, { t: 'Оставить это, облако перезаписать', fn: () => CL.push() }] });
    } else if (localTs >= c.meta.ts || !c.meta.ts) CL.push();
  };

  function schedule() { if (timer) return; timer = setTimeout(() => { timer = null; CL.push(); }, PUSH_EVERY); }
  const saveOrig = G.save;
  G.save = function () { const r = saveOrig.apply(this, arguments); try { if (!G.headless && G.s) { lsSet(TS_KEY, String(Date.now())); if (store()) schedule(); } } catch (e) {} return r; };
  document.addEventListener('visibilitychange', () => { if (document.hidden && store()) CL.push(); });
  window.addEventListener('pagehide', () => { if (store()) CL.push(); });
  setTimeout(() => { try { CL.sync(); } catch (e) {} }, 1500);
})();
