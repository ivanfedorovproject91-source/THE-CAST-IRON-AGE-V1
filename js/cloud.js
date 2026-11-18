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
    if (!CL.synced) { CL.status = 'ждём выбора: облако или это устройство'; return false; } // не перезаписываем облако, пока не сверились
    { const cur = { run: CL.runOf(G.s), shifts: CL.progOf(G.s) }, k = CL.known; // «Начать снова» не должно молча стирать облачный прогресс
      if (k && k.run && cur.run && cur.run !== k.run && k.shifts > cur.shifts && !CL.allowOverwrite) {
        if (!CL.asked) { CL.asked = true; G.modal({ title: '☁ Новое прохождение', text: 'В облаке лежит другое прохождение (смен: <b>' + k.shifts + '</b>), а у тебя новое (смен: <b>' + cur.shifts + '</b>). Перезаписать облачное сохранение?', opts: [{ t: 'Перезаписать облако', fn: () => { CL.allowOverwrite = true; CL.push(); } }, { t: 'Не трогать облако (до тех пор, пока не догонишь)', fn: () => {} }] }); }
        CL.status = 'облако не изменено: в нём более продвинутое прохождение'; return false;
      } }
    const raw = lsGet(G.SAVE_KEY); if (!raw) return false;
    busy = true; dirty = false;
    try {
      const n = Math.ceil(raw.length / CHUNK);
      if (n > MAX_CHUNKS) { CL.status = 'сохранение слишком большое для облака'; return false; }
      const ts = Date.now();
      let old = 0; try { old = (JSON.parse(await call('getItem', 'cv_meta') || '{}').n) || 0; } catch (e) {}
      for (let i = 0; i < n; i++) await call('setItem', 'cv_' + i, raw.slice(i * CHUNK, (i + 1) * CHUNK));
      await call('setItem', 'cv_meta', JSON.stringify({ n, ts, len: raw.length, v: (G.CONFIG && G.CONFIG.VERSION) || '', run: CL.runOf(G.s), shifts: CL.progOf(G.s), day: G.s && G.s.t && G.s.t.day })); // метка — последней: неполная запись не принимается
      if (old > n) { const ks = []; for (let i = n; i < old; i++) ks.push('cv_' + i); await call('removeItems', ks); }
      lsSet(TS_KEY, String(ts)); CL.lastPush = ts; CL.known = { run: CL.runOf(G.s), shifts: CL.progOf(G.s) }; CL.status = 'сохранено в облако'; return true;
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
      CL.known = { run: CL.runOf(d.s), shifts: CL.progOf(d.s) };
      return { meta, raw, d };
    } catch (e) { return null; }
  };

  const restore = c => { lsSet(G.SAVE_KEY, c.raw); lsSet(TS_KEY, String(c.meta.ts)); try { location.reload(); } catch (e) {} };

  // ---------- Решение «что делать, если на устройстве и в облаке разные сохранения»
  CL.runOf = st => (st && st.rs != null ? String(st.rs) : '');
  CL.progOf = st => (st && st.car ? Number(st.car.shifts) || 0 : 0);
  // local/cloud: { run, shifts, ts, same } → { act: 'restore' | 'push' | 'ask' | 'none', why }
  CL.decide = function (local, cloud) {
    if (!local) return { act: 'restore', why: 'на устройстве нет сохранения' };
    if (!cloud) return { act: 'push', why: 'в облаке пусто' };
    if (cloud.same) return { act: 'none', why: 'совпадают' };
    const sameRun = !!local.run && !!cloud.run && local.run === cloud.run;
    if (sameRun) {
      if (cloud.ts > local.ts + 60000 && cloud.shifts >= local.shifts) return { act: 'ask', why: 'в облаке более новое сохранение этого же прохождения' };
      if (cloud.shifts > local.shifts + 2) return { act: 'ask', why: 'в облаке больше прогресса' };
      return { act: 'push', why: 'локальное сохранение новее или равно' };
    }
    // разные прохождения: никогда не перезаписываем молча, если облако продвинутее
    if (cloud.shifts > local.shifts) return { act: 'ask', why: 'в облаке другое, более продвинутое прохождение' };
    if (cloud.ts > local.ts + 60000) return { act: 'ask', why: 'в облаке другое, более новое прохождение' };
    return { act: 'push', why: 'локальное прохождение продвинулось дальше облачного' };
  };

  CL.sync = async function () {
    if (!store()) { CL.status = 'облако недоступно (откройте игру из Telegram)'; return; }
    const c = await CL.pull();
    if (!c) { CL.synced = true; if (lsGet(G.SAVE_KEY)) CL.push(); return; }
    const local = lsGet(G.SAVE_KEY), localTs = +lsGet(TS_KEY) || 0;
    let ld = null; try { ld = local && JSON.parse(local); } catch (e) {}
    const dec = CL.decide(local ? { run: ld && ld.s ? CL.runOf(ld.s) : '', shifts: ld && ld.s ? CL.progOf(ld.s) : 0, ts: localTs } : null,
      { run: CL.runOf(c.d.s), shifts: CL.progOf(c.d.s), ts: c.meta.ts, same: c.raw === local });
    CL.lastDecision = dec;
    if (dec.act === 'restore') { CL.synced = true; restore(c); return; }
    if (dec.act === 'none') { CL.synced = true; return; }
    if (dec.act === 'push') { CL.synced = true; CL.push(); return; }
    const info = c.d.s.name + ', день ' + (c.d.s.t && c.d.s.t.day) + ', смен ' + (c.d.s.car && c.d.s.car.shifts);
    const mine = ld && ld.s ? ld.s.name + ', день ' + (ld.s.t && ld.s.t.day) + ', смен ' + (ld.s.car && ld.s.car.shifts) : '—';
    G.modal({ title: '☁ Прогресс в облаке отличается', text: 'В облаке: <b>' + info + '</b><br>На этом устройстве: <b>' + mine + '</b><br><small>' + dec.why + '. Выбранный вариант заменит другой; прежнее сохранение устройства перед загрузкой из облака копируется в запасной слот.</small>',
      opts: [{ t: 'Загрузить из облака', fn: () => { try { lsSet(G.SAVE_KEY + '_before_cloud', local || ''); } catch (e) {} CL.synced = true; restore(c); } },
        { t: 'Оставить это, облако перезаписать', fn: () => { CL.synced = true; CL.allowOverwrite = true; CL.push(); } },
        { t: 'Решу позже (облако не трогаем)', fn: () => { CL.status = 'облако не изменено: выбор отложен'; } }] });
  };

  function schedule() { if (timer) return; timer = setTimeout(() => { timer = null; CL.push(); }, PUSH_EVERY); }
  const saveOrig = G.save;
  G.save = function () { const r = saveOrig.apply(this, arguments); try { if (!G.headless && G.s) { lsSet(TS_KEY, String(Date.now())); if (store()) schedule(); } } catch (e) {} return r; };
  document.addEventListener('visibilitychange', () => { if (document.hidden && store()) CL.push(); });
  window.addEventListener('pagehide', () => { if (store()) CL.push(); });
  setTimeout(() => { try { CL.sync(); } catch (e) {} }, 1500);
})();
