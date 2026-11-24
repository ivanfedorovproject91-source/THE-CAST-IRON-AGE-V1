/* Тест проверки подписи ВКонтакте на сервере (server/chat_gas.gs и server/rating_gas.gs) с эмуляцией Google Apps Script.
   Подпись в тесте считается независимо от серверного кода — по описанию алгоритма VK Mini Apps:
   параметры vk_* → по алфавиту → «k=v&…» → HMAC-SHA256 защищённым ключом → base64url без «=».
   Проверяет: принимаются только корректные подписи; чужой ключ, чужое приложение, подмена параметров и просрочка отклоняются;
   игрок из VK не получает ролей (даже если его ID совпадает с OWNER_ID); id Telegram и VK не пересекаются; бан VK-игрока работает.
   Запуск: node tests/vk_gas_test.js */
'use strict';
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), path = require('path'), assert = require('assert');

const VK_SECRET = 'TESTvkSECRETkey_123', VK_APP = '5551234', TG_TOKEN = '123:TESTTOKEN';

function makeEnv(file) {
  const props = { BOT_TOKEN: TG_TOKEN, OWNER_ID: '1000', VK_SECRET, VK_APP_ID: VK_APP }, cache = {}, sheets = {};
  class Sheet {
    constructor(n) { this.n = n; this.d = []; }
    appendRow(r) { this.d.push(r.slice()); }
    getLastRow() { return this.d.length; }
    getLastColumn() { return this.d.length ? this.d[0].length : 0; }
    setFrozenRows() {}
    deleteRow(i) { this.d.splice(i - 1, 1); }
    getRange(r, c, nr = 1, nc = 1) {
      const s = this;
      return {
        getValues: () => { const o = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) { const v = (s.d[r - 1 + i] || [])[c - 1 + j]; row.push(v === undefined ? '' : v); } o.push(row); } return o; },
        setValues: v => { for (let i = 0; i < nr; i++) { s.d[r - 1 + i] = s.d[r - 1 + i] || []; for (let j = 0; j < nc; j++) s.d[r - 1 + i][c - 1 + j] = v[i][j]; } },
        setValue: v => { s.d[r - 1] = s.d[r - 1] || []; s.d[r - 1][c - 1] = v; },
        createTextFinder: t => ({ matchEntireCell: () => ({ findNext: () => { for (let i = 0; i < nr; i++) if (s.d[r - 1 + i] && s.d[r - 1 + i][c - 1] === t) return { getRow: () => r + i }; return null; } }) })
      };
    }
  }
  const toBuf = x => (typeof x === 'string' ? Buffer.from(x) : Buffer.from(x.map(b => (b + 256) % 256)));
  const signed = b => [...b].map(x => (x > 127 ? x - 256 : x));
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: k => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = new Sheet(n)) }) },
    ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 1, JAVASCRIPT: 2 } },
    Utilities: {
      computeHmacSha256Signature: (v, k) => {
        if (typeof v !== typeof k) throw new Error('The parameters (' + typeof v + ',' + typeof k + ') don\'t match the method signature for Utilities.computeHmacSha256Signature.');
        return signed(crypto.createHmac('sha256', toBuf(k)).update(toBuf(v)).digest());
      },
      // как в Apps Script: URL-безопасный base64 (с символами «=» в конце)
      base64EncodeWebSafe: bytes => toBuf(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      newBlob: s => ({ getBytes: () => signed(Buffer.from(s)) }),
      computeDigest: (a, s) => signed(crypto.createHash('sha256').update(toBuf(s)).digest()),
      DigestAlgorithm: { SHA_256: 1 }, getUuid: () => crypto.randomUUID(),
      formatDate: (d, tz, fmt) => (fmt === 'yyyyMMdd' ? d.toISOString().slice(0, 10).replace(/-/g, '') : d.toISOString().slice(0, 7))
    },
    console
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../server', file), 'utf8'), ctx);
  ctx.__props = props; ctx.__cache = cache; ctx.__sheets = sheets;
  return ctx;
}

// Параметры запуска VK, подписанные независимой реализацией алгоритма
function vkInit(userId, opts = {}) {
  const o = Object.assign({ vk_access_token_settings: '', vk_app_id: VK_APP, vk_is_app_user: '1', vk_is_favorite: '0', vk_language: 'ru', vk_platform: 'desktop_web', vk_ref: 'catalog_featured', vk_ts: String(Math.floor(Date.now() / 1000) - (opts.age || 0)), vk_user_id: String(userId) }, opts.extra || {});
  const secret = opts.secret || VK_SECRET;
  const qs = Object.keys(o).sort().map(k => k + '=' + encodeURIComponent(o[k])).join('&');
  const sign = crypto.createHmac('sha256', secret).update(qs).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return 'vk:' + (opts.shuffle ? Object.keys(o).reverse() : Object.keys(o)).map(k => k + '=' + encodeURIComponent(o[k])).join('&') + '&sign=' + sign;
}
function tgInit(id, name, token = TG_TOKEN) {
  const f = { auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'AAA', user: JSON.stringify({ id, first_name: name }) };
  const check = Object.keys(f).sort().map(k => k + '=' + f[k]).join('\n');
  f.hash = crypto.createHmac('sha256', crypto.createHmac('sha256', 'WebAppData').update(token).digest()).update(check).digest('hex');
  return Object.keys(f).map(k => f[k] === undefined ? '' : k + '=' + encodeURIComponent(f[k])).join('&');
}

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok -', m); };

/* ======================= ЧАТ И АДМИНКА ======================= */
{
  const env = makeEnv('chat_gas.gs');
  const post = b => JSON.parse(env.doPost({ postData: { contents: JSON.stringify(b) } }).s);
  const get = p => JSON.parse(env.doGet({ parameter: p }).s);
  const ping = (init, extra) => post(Object.assign({ action: 'ping', initData: init }, extra || {}));

  const cfgJ = env.doGet({ parameter: { action: 'config', callback: 'cb_2' } }).s;
  ok(/^cb_2\(\{"ok":true,"cfg":\{.*"radio":/.test(cfgJ), 'чат: публичные настройки (радио) читаются без подписи, в том числе через JSONP');
  ok(ping(vkInit(777001)).ok === true, 'чат: корректная подпись VK принята');
  ok(ping(vkInit(777001, { shuffle: true })).ok === true, 'чат: порядок параметров в адресе не важен');
  ok(ping(vkInit(777001, { extra: { vk_ref: 'a b!x' } })).ok === true, 'чат: параметр со спецсимволами в значении подписывается и проверяется');
  ok(ping(vkInit(777001, { secret: 'WRONG' })).error === 'auth', 'чат: подпись другим ключом отклонена');
  ok(ping(vkInit(777001).replace('vk_user_id=777001', 'vk_user_id=777002')).error === 'auth', 'чат: подмена vk_user_id отклонена');
  ok(ping(vkInit(777001).replace('vk_language=ru', 'vk_language=en')).error === 'auth', 'чат: подмена любого vk_* параметра отклонена');
  ok(ping(vkInit(777001).replace(/&sign=.*/, '')).error === 'auth', 'чат: без sign отклонено');
  ok(ping(vkInit(777001, { age: 90000 })).error === 'auth', 'чат: просроченный запуск (больше суток) отклонён');
  ok(ping(vkInit(777001, { age: -4000 })).error === 'auth', 'чат: запуск «из будущего» отклонён');
  ok(ping(vkInit(777001, { extra: { vk_app_id: '999' } })).error === 'auth', 'чат: подпись чужого приложения (другой vk_app_id) отклонена');
  ok(ping('vk:').error === 'auth' && ping('vk:garbage').error === 'auth', 'чат: мусор вместо параметров отклонён');
  ok(ping(vkInit(0)).error === 'auth', 'чат: гость (vk_user_id=0) отклонён');
  env.__props.VK_SECRET = '';
  ok(ping(vkInit(777001)).error === 'auth', 'чат: без VK_SECRET в свойствах скрипта VK-игроки не принимаются');
  env.__props.VK_SECRET = VK_SECRET;
  env.__props.VK_APP_ID = '';
  ok(ping(vkInit(777001, { extra: { vk_app_id: '999' } })).ok === true, 'чат: без VK_APP_ID номер приложения не сверяется (подпись всё равно проверена)');
  env.__props.VK_APP_ID = VK_APP;

  // роли: игрок VK никогда не получает прав, даже если цифры ID совпали с владельцем (OWNER_ID=1000 — это Telegram)
  ok(ping(tgInit(1000, 'Owner')).role === 'owner', 'роли: владелец из Telegram определён');
  ok(ping(vkInit(1000)).role === '', 'роли: VK-игрок с тем же числом, что у владельца, прав не получает');
  const adm = (init, op, args, confirm) => post({ action: 'admin', initData: init, op, args, confirm });
  ok(adm(vkInit(1000), 'me', {}).error === 'forbidden', 'роли: админ-API закрыт для VK-игрока с «чужим» ID владельца');
  ok(adm(vkInit(777001), 'admin_add', { uid: 'vk777001', perms: ['bans'], reason: 'сам себя' }).error === 'forbidden', 'роли: VK-игрок не может назначить себя админом');

  // чат: сообщения VK-игрока подписаны uid vk:…, а Telegram-игрок с теми же цифрами — другой человек
  ok(post({ action: 'chat_post', initData: vkInit(555), name: 'Вася', job: 'Токарь', text: 'привет из ВК' }).ok === true, 'чат: VK-игрок пишет в общий чат');
  ok(post({ action: 'chat_post', initData: tgInit(555, 'Tg'), name: 'Петя', job: 'Токарь', text: 'привет из ТГ' }).ok === true, 'чат: Telegram-игрок с теми же цифрами пишет в общий чат');
  const msgs = get({ action: 'chat_list' }).msgs;
  ok(msgs.some(m => m.uid === 'vk:555' && m.text === 'привет из ВК') && msgs.some(m => m.uid === 'tg:555' && m.text === 'привет из ТГ'), 'чат: uid автора — vk:555 и tg:555, это разные люди');

  // бан по VK ID: владелец (Telegram) банит vk555 — Telegram 555 это не затрагивает
  const banArgs = { uid: 'vk555', hours: 0, reason: 'проверка бана' };
  const step = adm(tgInit(1000, 'Owner'), 'ban', banArgs);
  ok(step.needConfirm && step.token, 'бан VK-игрока требует подтверждения владельца');
  ok(adm(tgInit(1000, 'Owner'), 'ban', banArgs, step.token).ok === true, 'владелец банит VK-игрока по ID вида vk555');
  const pv = ping(vkInit(555));
  ok(pv.ban && /проверка бана/.test(pv.ban.reason), 'VK-игрок видит бан в ping');
  ok(!ping(tgInit(555, 'Tg')).ban, 'Telegram-игрок с теми же цифрами не забанен');
  ok(post({ action: 'chat_post', initData: vkInit(555), name: 'Вася', job: '', text: 'ещё одно' }).ok === false, 'забаненный VK-игрок не может писать в чат');
  ping(vkInit(555, { extra: {} }), { name: 'Вася', job: 'Токарь', rank: 1, shifts: 5, oj: 100, money: 10, days: 20, v: 't' });
  const pl = adm(tgInit(1000, 'Owner'), 'players_search', { q: 'vk555' });
  ok(pl.ok && pl.players.length === 1 && pl.players[0].uid === 'vk:555' && pl.players[0].id === 'vk555' && pl.players[0].banned === true, 'поиск игрока по vk555 в админке находит именно VK-игрока (а не Telegram 555)');
  const pg = adm(tgInit(1000, 'Owner'), 'player_get', { uid: 'vk555' });
  ok(pg.ok !== false, 'карточка VK-игрока открывается по ID vk555');
  const un = adm(tgInit(1000, 'Owner'), 'unban', { uid: 'vk555', reason: 'проверка разбана' });
  ok(un.ok === true && !ping(vkInit(555)).ban, 'разбан VK-игрока работает');
  ok(adm(tgInit(1000, 'Owner'), 'ban', { uid: 'vk-12', hours: 0, reason: 'мусор' }).ok === false, 'ID неверного вида (vk-12) отклоняется');
}

/* ======================= РЕЙТИНГ ======================= */
{
  const env = makeEnv('rating_gas.gs');
  const post = b => JSON.parse(env.doPost({ postData: { contents: JSON.stringify(b) } }).s);
  const get = q => JSON.parse(env.doGet({ parameter: q }).s);
  const clearRl = () => Object.keys(env.__cache).forEach(k => delete env.__cache[k]);
  const score = (init, name, oj, extra = {}) => { clearRl(); return post(Object.assign({ action: 'score', initData: init, name, oj, shifts: 5, rank: 1, days: 20, money: 100, job: 'Токарь' }, extra)); };

  ok(score(vkInit(8001), 'Вика', 150).ok === true, 'рейтинг: результат игрока VK с корректной подписью записан');
  ok(/vk signature/.test(score(vkInit(8002, { secret: 'WRONG' }), 'Подделка', 99999).error || ''), 'рейтинг: результат с неверной подписью VK отклонён');
  ok(/vk signature/.test(score(vkInit(8003, { age: 8 * 86400 }), 'Старый', 10).error || ''), 'рейтинг: просроченная подпись VK (больше недели) отклонена');
  ok(/vk signature/.test(score(vkInit(8004, { extra: { vk_app_id: '1' } }), 'Чужой', 10).error || ''), 'рейтинг: подпись чужого приложения отклонена');
  ok(score(tgInit(8001, 'Tg'), 'Таня', 120).ok === true, 'рейтинг: Telegram-игрок с теми же цифрами записан отдельно');
  const top = get({ action: 'top', by: 'oj', limit: 50, uid: 'vk:8001' });
  const rows = top.rows || top.list || top.top || [];
  const vk = rows.find(r => r.uid === 'vk:8001'), tg = rows.find(r => r.uid === 'tg:8001');
  ok(vk && vk.name === 'Вика' && tg && tg.name === 'Таня', 'рейтинг: uid vk:8001 и tg:8001 — две разные строки');
  ok(vk && vk.me === true && tg && tg.me === false, 'рейтинг: «это я» отмечается по uid платформы');
  ok(!rows.some(r => r.name === 'Подделка'), 'рейтинг: подделка в таблицу не попала');
  env.__props.REQUIRE_TELEGRAM = '1';
  ok(score(vkInit(8005), 'Строгий', 50).ok === true, 'рейтинг: в строгом режиме подписанный игрок VK принимается');
  ok(score('', 'Аноним', 50, { dev: 'abc123' }).ok !== true, 'рейтинг: в строгом режиме без подписи не принимается');
  env.__props.REQUIRE_TELEGRAM = '';
  env.__props.VK_SECRET = '';
  ok(/VK_SECRET/.test(score(vkInit(8006), 'БезКлюча', 50, { dev: 'dev8006' }).error || ''), 'рейтинг: без VK_SECRET сервер прямо говорит, чего не хватает (а не молча пишет под чужим ID)');
  env.__props.VK_SECRET = VK_SECRET;
  // «я» ищется и по устройству: запись, сделанная когда подпись ещё не проверялась (dev:…), всё равно отмечается
  score('', 'Старожил', 70, { dev: 'olddev1' });
  const t2 = get({ action: 'top', by: 'oj', limit: 50, uid: 'vk:9999', dev: 'olddev1' });
  ok(t2.me && t2.me.name === 'Старожил', 'рейтинг: игрок находит себя по устройству, если записи под vk:-ID ещё нет');
  // JSONP: запасной путь чтения для мобильных оболочек
  const jp = env.doGet({ parameter: { action: 'top', by: 'oj', limit: 5, callback: 'cb_1' } }).s;
  ok(/^cb_1\(\{.*\}\);$/.test(jp), 'рейтинг: чтение с callback отдаётся как JSONP');
  ok(!/^cb_/.test(env.doGet({ parameter: { action: 'top', by: 'oj', limit: 5, callback: 'a);alert(1);//' } }).s), 'рейтинг: небезопасное имя callback игнорируется (нет инъекции)');
  ok(!/^cb_/.test(env.doGet({ parameter: { action: 'top', by: 'oj' } }).s), 'рейтинг: без callback — обычный JSON (callback не «залипает» между запросами)');
  const owner = post({ action: 'admin_list', initData: vkInit(1000) });
  ok(owner.ok !== true, 'рейтинг: админ-действия из VK недоступны');
}

console.log('\nВсего проверок: ' + n + ' — всё прошло');
