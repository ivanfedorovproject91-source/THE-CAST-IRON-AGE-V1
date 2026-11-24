/* ===== Платформа: Telegram Mini App / VK Mini App / обычный браузер =====
   Один слой, за которым игра не знает, где запущена. Всё, что отличается между Telegram и ВКонтакте
   (подпись для сервера, имя игрока, вибро-отклик, облачное хранилище, цвета оболочки), живёт только здесь.
   Остальные модули спрашивают у G.platform:
     name()      'tg' | 'vk' | 'web'
     initData()  строка для сервера: у Telegram — initData, у VK — 'vk:' + параметры запуска (сервер проверяет подпись)
     userId()    'tg:123' | 'vk:123' | null — только для показа и ключей; личность сервер определяет сам по подписи
     userName()  имя игрока из платформы (может быть пустым)
     haptic(k)   'light' | 'success' | 'warning' | 'error'
     cloud       облачное хранилище платформы (см. ниже) либо null
*/
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const P = (G.platform = {});

  // ---------- параметры запуска VK (приходят в адресной строке, подписаны сервером ВКонтакте)
  const query = (function () { try { return String(location.search || '').replace(/^\?/, ''); } catch (e) { return ''; } })();
  const qp = {};
  query.split('&').forEach(function (s) {
    if (!s) return; const i = s.indexOf('='); const k = i < 0 ? s : s.slice(0, i), v = i < 0 ? '' : s.slice(i + 1);
    try { qp[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) {}
  });
  const IS_VK = !!(qp.vk_app_id && qp.vk_user_id !== undefined && qp.sign);
  const vkb = () => { try { return window.vkBridge || null; } catch (e) { return null; } };
  const tg = () => { try { return window.Telegram && window.Telegram.WebApp; } catch (e) { return null; } };
  P.vkParams = IS_VK ? qp : null;

  P.name = () => (IS_VK ? 'vk' : (tg() && tg().initData ? 'tg' : 'web'));
  P.isVk = () => IS_VK;
  P.isTg = () => !IS_VK && !!(tg() && tg().initData);
  P.label = () => ({ vk: 'ВКонтакте', tg: 'Telegram', web: 'браузер' }[P.name()]);
  // ПК-версия: web VK на компьютере или десктопный Telegram. Нужна только для мелких поправок интерфейса.
  P.isDesktop = function () {
    if (IS_VK) return /^desktop/.test(qp.vk_platform || '');
    const t = tg(); return !!(t && /^(tdesktop|macos|weba|webk|web)$/.test(t.platform || ''));
  };

  P.initData = function () {
    if (IS_VK) return 'vk:' + query;
    const t = tg(); return (t && t.initData) || '';
  };
  P.userId = function () {
    if (IS_VK) return /^\d{1,15}$/.test(qp.vk_user_id || '') && qp.vk_user_id !== '0' ? 'vk:' + qp.vk_user_id : null;
    const t = tg(), u = t && t.initDataUnsafe && t.initDataUnsafe.user; return u && u.id ? 'tg:' + u.id : null;
  };
  let vkUser = null;
  P.userName = function () {
    if (IS_VK) return (vkUser && vkUser.first_name) || '';
    const t = tg(), u = t && t.initDataUnsafe && t.initDataUnsafe.user; return (u && u.first_name) || '';
  };

  // ---------- вибро-отклик
  P.haptic = function (kind) {
    try {
      if (IS_VK) {
        const b = vkb(); if (!b || P.isDesktop()) return;
        const p = kind === 'light' ? b.send('VKWebAppTapticImpactOccurred', { style: 'light' }) : b.send('VKWebAppTapticNotificationOccurred', { type: kind === 'success' || kind === 'warning' || kind === 'error' ? kind : 'warning' });
        if (p && p.catch) p.catch(function () {});
        return;
      }
      const h = tg() && tg().HapticFeedback; if (!h) return;
      if (kind === 'light') h.impactOccurred('light'); else h.notificationOccurred(kind);
    } catch (e) {}
  };

  // ---------- запуск оболочки
  const BG = '#121110';
  function setInsets(ins) { // безопасные отступы мобильного клиента VK (вырезы, жесты); если не пришли — работает env() из CSS
    try {
      if (!ins) return; const r = document.documentElement.style;
      if (ins.top > 0) r.setProperty('--safe-t', ins.top + 'px');
      if (ins.bottom > 0) r.setProperty('--safe-b', ins.bottom + 'px');
    } catch (e) {}
  }
  function vkInit() {
    const b = vkb(); if (!b) return;
    try { b.subscribe(function (e) { const d = e && e.detail; if (d && d.type === 'VKWebAppUpdateConfig') setInsets(d.data && d.data.insets); }); } catch (e) {}
    // VKWebAppInit обязателен: без него ВКонтакте закроет приложение (нужно отправить в первые 30 секунд)
    try { b.send('VKWebAppInit', {}).catch(function () {}); } catch (e) {}
    try { b.send('VKWebAppSetViewSettings', { status_bar_style: 'light', action_bar_color: BG, navigation_bar_color: BG }).catch(function () {}); } catch (e) {}
    try { b.send('VKWebAppGetUserInfo', {}).then(function (u) { vkUser = u || null; }).catch(function () {}); } catch (e) {}
  }
  function tgInit() {
    try {
      const t = tg(); if (!t) return;
      t.ready(); t.expand();
      try { t.setHeaderColor(BG); t.setBackgroundColor(BG); t.disableVerticalSwipes && t.disableVerticalSwipes(); } catch (e) {}
      try { t.onEvent && t.onEvent('viewportChanged', function () { window.dispatchEvent(new Event('resize')); }); } catch (e) {}
    } catch (e) {}
  }
  let vkDone = false;
  P.init = function () {
    try {
      const root = document.documentElement;
      root.classList.add('plat-' + P.name());
      if (P.isDesktop()) root.classList.add('plat-desktop'); else root.classList.add('plat-mobile');
    } catch (e) {}
    if (IS_VK) { if (!vkDone) { vkDone = true; vkInit(); } } else tgInit();
  };
  window.__tgInit = P.init; // вызывается из index.html после загрузки telegram-web-app.js

  // ---------- облачное хранилище платформы
  // Единый интерфейс для cloud.js: get/set/remove возвращают Promise; chunk — безопасная длина одного значения;
  // pack/unpack — необязательное сжатие целого сохранения; pushEvery — как часто можно писать (мс); diff — писать только изменившиеся куски.
  function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) { const bin = atob(s), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  const canGzip = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function' && typeof Response === 'function';
  async function gzip(str) {
    const cs = new CompressionStream('gzip'), w = cs.writable.getWriter(); w.write(new TextEncoder().encode(str)); w.close();
    return b64(new Uint8Array(await new Response(cs.readable).arrayBuffer()));
  }
  async function gunzip(s) {
    const ds = new DecompressionStream('gzip'), w = ds.writable.getWriter(); w.write(unb64(s)); w.close();
    return new Response(ds.readable).text();
  }
  P.gzip = gzip; P.gunzip = gunzip; P.canGzip = canGzip;

  const tgCloud = {
    kind: 'tg', chunk: 3500, pushEvery: 25000, diff: false,
    available() { const t = tg(); return !!(t && t.CloudStorage && (!t.isVersionAtLeast || t.isVersionAtLeast('6.9'))); },
    _call(fn, args) { return new Promise(function (res, rej) { try { tg().CloudStorage[fn].apply(tg().CloudStorage, args.concat([function (err, val) { err ? rej(err) : res(val); }])); } catch (e) { rej(e); } }); },
    get(k) { return this._call('getItem', [k]); },
    set(k, v) { return this._call('setItem', [k, v]); },
    remove(keys) { return keys.length ? this._call('removeItems', [keys]) : Promise.resolve(); },
    pack(raw) { return Promise.resolve({ data: raw, enc: '' }); },
    unpack(data) { return Promise.resolve(data); }
  };
  // VK Storage: значение до 4096 БАЙТ (не символов), не более 1000 ключей и 1000 запросов в час на игрока.
  // Поэтому сохранение сжимается (gzip → base64, один байт на символ), пишутся только изменившиеся куски и не чаще раза в 2 минуты.
  const vkCloud = {
    kind: 'vk', chunk: 3900, pushEvery: 120000, diff: true,
    available() { return !!vkb() && IS_VK; },
    async get(k) { const r = await vkb().send('VKWebAppStorageGet', { keys: [k] }); const it = r && r.keys && r.keys[0]; return (it && it.value) || ''; },
    async set(k, v) { await vkb().send('VKWebAppStorageSet', { key: k, value: v }); },
    async remove(keys) { for (const k of keys) await vkb().send('VKWebAppStorageSet', { key: k, value: '' }); },
    async pack(raw) {
      if (canGzip()) { try { return { data: await gzip(raw), enc: 'gz' }; } catch (e) {} }
      this.chunk = 1300; // без сжатия: кириллица и эмодзи занимают до 3 байт на символ — берём запас
      return { data: raw, enc: '' };
    },
    async unpack(data, enc) {
      if (enc === 'gz') { if (!canGzip()) throw new Error('no gzip'); return gunzip(data); }
      return data;
    }
  };
  P.cloud = IS_VK ? vkCloud : tgCloud;
  P.cloudAvailable = () => { try { return P.cloud.available(); } catch (e) { return false; } };
})();
