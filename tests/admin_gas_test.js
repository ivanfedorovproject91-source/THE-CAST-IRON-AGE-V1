/* Тест серверной части админки (server/chat_gas.gs) с эмуляцией Google Apps Script.
   Запуск: node tests/admin_gas_test.js */
'use strict';
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), path = require('path'), assert = require('assert');

function makeEnv() {
  const props = { BOT_TOKEN: '123:TESTTOKEN', OWNER_ID: '1000' }, cache = {}, sheets = {};
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
        getValues: () => { const o = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) row.push((s.d[r - 1 + i] || [])[c - 1 + j] === undefined ? '' : s.d[r - 1 + i][c - 1 + j]); o.push(row); } return o; },
        setValues: v => { for (let i = 0; i < nr; i++) { s.d[r - 1 + i] = s.d[r - 1 + i] || []; for (let j = 0; j < nc; j++) s.d[r - 1 + i][c - 1 + j] = v[i][j]; } },
        setValue: v => { s.d[r - 1] = s.d[r - 1] || []; s.d[r - 1][c - 1] = v; },
        createTextFinder: t => ({ matchEntireCell: () => ({ findNext: () => { for (let i = 0; i < nr; i++) if (s.d[r - 1 + i] && s.d[r - 1 + i][c - 1] === t) return { getRow: () => r + i }; return null; } }) })
      };
    }
  }
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: k => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = new Sheet(n)) }) },
    ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 1 } },
    Utilities: {
      computeHmacSha256Signature: (v, k) => [...crypto.createHmac('sha256', Buffer.isBuffer(k) ? k : Array.isArray(k) ? Buffer.from(k.map(x => (x + 256) % 256)) : k).update(v).digest()].map(b => (b > 127 ? b - 256 : b)),
      computeDigest: (a, s) => [...crypto.createHash('sha256').update(s).digest()].map(b => (b > 127 ? b - 256 : b)),
      DigestAlgorithm: { SHA_256: 1 }, getUuid: () => crypto.randomUUID()
    },
    console
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../server/chat_gas.gs'), 'utf8'), ctx);
  ctx.__props = props; ctx.__cache = cache; ctx.__sheets = sheets;
  return ctx;
}
function initData(id, name, age = 0, token = '123:TESTTOKEN') {
  const f = { auth_date: String(Math.floor(Date.now() / 1000) - age), query_id: 'AAA', user: JSON.stringify({ id, first_name: name }) };
  const check = Object.keys(f).sort().map(k => k + '=' + f[k]).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  f.hash = crypto.createHmac('sha256', secret).update(check).digest('hex');
  return Object.keys(f).map(k => k + '=' + encodeURIComponent(f[k])).join('&');
}
const env = makeEnv();
const post = b => JSON.parse(env.doPost({ postData: { contents: JSON.stringify(b) } }).s);
const get = p => JSON.parse(env.doGet({ parameter: p }).s);
const adm = (id, op, args, confirm) => post({ action: 'admin', initData: initData(id, 'U' + id), op, args, confirm });
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok -', m); };
const cfgSet = () => {}; void cfgSet;

// --- подпись Telegram
ok(post({ action: 'ping', initData: initData(1000, 'Owner') }).ok, 'ping с корректной подписью принят');
ok(post({ action: 'ping', initData: initData(1000, 'Owner', 0, 'other:token') }).error === 'auth', 'подпись с чужим токеном отклонена');
ok(post({ action: 'ping', initData: initData(1000, 'Owner', 99999) }).error === 'auth', 'просроченный initData отклонён');
ok(post({ action: 'ping', initData: initData(1000, 'Owner').replace('Owner', 'Hacker') }).error === 'auth', 'подделанные данные отклонены');
ok(post({ action: 'ping', initData: '' }).error === 'auth', 'пустой initData отклонён');

// --- роли
ok(post({ action: 'ping', initData: initData(1000, 'Owner') }).role === 'owner', 'владелец определён по OWNER_ID');
ok(post({ action: 'ping', initData: initData(2001, 'Player'), role: 'owner' }).role === '', 'обычный игрок: роль пустая, поле role от клиента игнорируется');
ok(adm(2001, 'me').error === 'forbidden', 'обычный игрок не имеет доступа к админ-API');
ok(adm(2001, 'admin_add', { uid: '2001', perms: ['players'], reason: 'сам себя' }).error === 'forbidden', 'игрок не может назначить себя админом');
ok(post({ action: 'admin', op: 'me', args: {}, initData: '' }).error === 'auth', 'админ-API без подписи отклонён');
ok(post({ action: 'admin', op: 'me', args: {}, uid: 'tg:1000', role: 'owner' }).error === 'auth', 'подмена uid/role в теле запроса не работает');
const aud = adm(1000, 'audit', { limit: 50 });
ok(aud.list.some(x => x.action.indexOf('ОТКАЗ') === 0 && x.actorId === '2001'), 'попытки доступа без прав попали в журнал');

// --- назначение админа: подтверждение
let r = adm(1000, 'admin_add', { uid: '3001', perms: ['bans', 'chat', 'bogus'], reason: 'новый модератор' });
ok(r.needConfirm && r.token, 'назначение админа требует подтверждения');
ok(adm(1000, 'admin_add', { uid: '3001', perms: ['bans', 'chat', 'bogus'], reason: 'новый модератор' }, 'wrongtoken').ok === false, 'неверный токен подтверждения не работает');
r = adm(1000, 'admin_add', { uid: '3001', perms: ['bans', 'chat', 'bogus'], reason: 'новый модератор' });
ok(adm(1000, 'admin_add', { uid: '3001', perms: ['bans'], reason: 'новый модератор' }, r.token).ok === false, 'токен привязан к параметрам операции');
r = adm(1000, 'admin_add', { uid: '3001', perms: ['bans', 'chat', 'bogus'], reason: 'новый модератор' });
ok(adm(1000, 'admin_add', { uid: '3001', perms: ['bans', 'chat', 'bogus'], reason: 'новый модератор' }, r.token).ok === true, 'назначение с верным подтверждением проходит');
ok(adm(1000, 'admin_add', { uid: '3001', perms: [], reason: 'повтор' }).needConfirm && true, 'повтор снова требует подтверждение');
ok(adm(3001, 'me').role === 'admin' && adm(3001, 'me').perms.join() === 'bans,chat', 'админ получил только выданные права (мусорное право отброшено)');
ok(adm(3001, 'players_search', { q: '' }).error === 'forbidden', 'админ без права players не видит игроков');
ok(adm(3001, 'admin_add', { uid: '3001', perms: ['players'], reason: 'самоповышение' }).error === 'forbidden', 'админ не может выдавать права (только владелец)');
ok(adm(3001, 'admin_perms', { uid: '3001', perms: ['players', 'audit'], reason: 'самоповышение' }).error === 'forbidden', 'админ не может изменить свои права');
ok(adm(3001, 'radio_set', { reason: 'пробую', stations: [] }).error === 'forbidden', 'радио доступно только владельцу');

// --- игроки, поиск, санкции
post({ action: 'ping', initData: initData(4001, 'Вася'), name: 'Вася Чугунов', job: 'Слесарь', rank: 2, shifts: 55, oj: 1200, money: 5000, days: 70, v: '3.11.0' });
post({ action: 'ping', initData: initData(4002, 'Петя'), name: 'Петя Токарь', job: 'Токарь', rank: 1, shifts: 10, oj: 300, money: 100, days: 12, v: '3.11.0' });
ok(adm(1000, 'players_search', { q: '4001' }).players[0].name === 'Вася Чугунов', 'поиск по Telegram ID');
ok(adm(1000, 'players_search', { q: 'ТОКАРЬ' }).players[0].id === '4002', 'поиск по игровому имени (без учёта регистра)');
const pg = adm(1000, 'player_get', { uid: '4001' });
ok(pg.found && pg.player.shifts === 55 && pg.player.oj === 1200, 'профиль и статистика игрока');
ok(adm(1000, 'online').players.length >= 2, 'список онлайн');
ok(adm(1000, 'stats').stats.total >= 2, 'статистика активности');

ok(post({ action: 'chat_post', initData: initData(4001, 'Вася'), name: 'Вася', job: 'Слесарь', text: 'Привет всем' }).ok, 'обычное сообщение в чат');
ok(post({ action: 'chat_post', initData: '', name: 'x', text: 'без подписи' }).ok === false, 'сообщение без подписи отклонено');
ok(get({ action: 'chat_list' }).msgs.length === 1, 'чат отдаёт сообщения');

ok(adm(3001, 'mute', { uid: '4001', minutes: 10 }).error.indexOf('причину') > 0, 'причина обязательна');
ok(adm(3001, 'mute', { uid: '4001', minutes: 10, reason: 'спам' }).ok, 'мут выдан админом с правом bans');
env.__cache['c_tg:4001'] && delete env.__cache['c_tg:4001'];
ok(/мут/i.test(post({ action: 'chat_post', initData: initData(4001, 'Вася'), name: 'Вася', text: 'снова пишу' }).error), 'замученный не может писать (проверка на сервере)');
ok(adm(3001, 'unmute', { uid: '4001', reason: 'извинился' }).ok, 'мут снят');
ok(adm(3001, 'mute', { uid: '3001', minutes: 5, reason: 'сам' }).error.indexOf('себе') > 0, 'нельзя применять санкции к себе');
ok(adm(3001, 'mute', { uid: '1000', minutes: 5, reason: 'владелец' }).error.indexOf('владельцу') > 0, 'нельзя применять санкции к владельцу');
ok(adm(1000, 'admin_add', { uid: '3002', perms: ['bans'], reason: 'второй' }, adm(1000, 'admin_add', { uid: '3002', perms: ['bans'], reason: 'второй' }).token).ok, 'второй админ назначен');
ok(adm(3001, 'mute', { uid: '3002', minutes: 5, reason: 'коллега' }).error.indexOf('владелец') > 0, 'админ не может наказать другого админа');

let b = adm(3001, 'ban', { uid: '4002', hours: 0, reason: 'читерство' });
ok(b.needConfirm, 'бан требует подтверждения');
ok(adm(3001, 'ban', { uid: '4002', hours: 0, reason: 'читерство' }, b.token).ok, 'бан после подтверждения');
ok(post({ action: 'ping', initData: initData(4002, 'Петя') }).ban.reason === 'читерство', 'ping сообщает клиенту о бане');
env.__cache['c_tg:4002'] && delete env.__cache['c_tg:4002'];
ok(/заблокированы/.test(post({ action: 'chat_post', initData: initData(4002, 'Петя'), name: 'Петя', text: 'пишу из бана' }).error), 'забаненный не может писать в чат');
ok(adm(1000, 'sanctions_list').list.some(x => x.type === 'ban' && x.id === '4002'), 'список активных санкций');
ok(adm(3001, 'unban', { uid: '4002', reason: 'ошибка' }).ok && !post({ action: 'ping', initData: initData(4002, 'Петя') }).ban, 'разбан');

// --- модерация чата
const msg = get({ action: 'chat_list' }).msgs[0];
ok(adm(3001, 'chat_delete', { id: msg.id, reason: 'оскорбление' }).ok, 'удаление сообщения');
ok(get({ action: 'chat_list' }).msgs.length === 0, 'удалённое сообщение не отдаётся игрокам');
ok(adm(3001, 'chat_recent', {}).msgs.some(m => m.deleted), 'админ видит удалённые с пометкой');
let lk = adm(3001, 'chat_lock', { locked: true, reason: 'рейд' });
ok(lk.needConfirm && adm(3001, 'chat_lock', { locked: true, reason: 'рейд' }, lk.token).ok, 'закрытие чата с подтверждением');
env.__cache['c_tg:4001'] && delete env.__cache['c_tg:4001'];
ok(/закрыт/.test(post({ action: 'chat_post', initData: initData(4001, 'Вася'), name: 'В', text: 'пишу в закрытый' }).error), 'закрытый чат не принимает сообщения от игроков');

// --- параметры
ok(adm(1000, 'params_set', { key: 'WALK_LATE', value: 10, reason: 'баланс' }).ok, 'параметр изменён');
ok(adm(1000, 'params_set', { key: 'WALK_LATE', value: 1000, reason: 'баланс' }).ok === false, 'значение вне диапазона отклонено');
ok(adm(1000, 'params_set', { key: 'EVIL', value: 1, reason: 'баланс' }).ok === false, 'параметр не из белого списка отклонён');
ok(post({ action: 'ping', initData: initData(4001, 'Вася') }).cfg.params.WALK_LATE === 10, 'игроки получают изменённый параметр');

// --- радио
const radio = { on: true, stations: [{ id: 'mayak', name: 'Радио «Маяк»', url: 'https://example.com/stream', on: true }, { id: 'retro', name: 'Ретро FM', url: 'javascript:alert(1)' }, { id: 'seven', name: 'Радио 7', url: 'http://insecure.example/x' }] };
let rs = adm(1000, 'radio_set', Object.assign({ reason: 'настройка' }, radio));
ok(rs.needConfirm && adm(1000, 'radio_set', Object.assign({ reason: 'настройка' }, radio), rs.token).ok, 'радиопотоки меняются владельцем с подтверждением');
const pub = get({ action: 'config' }).cfg.radio.stations;
ok(pub[0].url === 'https://example.com/stream' && pub[1].url === '' && pub[2].url === '', 'принимаются только https-потоки');

// --- снятие админа и журнал
let rm = adm(1000, 'admin_remove', { uid: '3001', reason: 'увольнение' });
ok(adm(1000, 'admin_remove', { uid: '3001', reason: 'увольнение' }, rm.token).ok, 'админ снят');
ok(adm(3001, 'me').error === 'forbidden', 'снятый админ сразу теряет доступ');
const log = adm(1000, 'audit', { limit: 300 }).list;
ok(['БАН', 'МУТ', 'Удаление сообщения', 'Назначен администратор', 'Снят администратор', 'Чат закрыт'].every(a => log.some(x => x.action === a && x.actor && x.t && (x.reason || a === 'Назначен администратор'))), 'журнал: кто, над кем, что, когда, причина');
ok(log.find(x => x.action === 'БАН').target === '4002' && log.find(x => x.action === 'БАН').reason === 'читерство', 'в журнале указан объект и причина');
console.log('\nВсего проверок:', n, '— всё прошло');
