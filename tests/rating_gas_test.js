/* Тест скрипта рейтинга (server/rating_gas.gs) с эмуляцией Google Apps Script.
   Проверяет: uid для Telegram-игроков (без dev:-ID), скрытие владельцем, защиту от «возврата» отправкой результата,
   удаление записи, права (только владелец), подпись Telegram, журнал действий.
   Запуск: node tests/rating_gas_test.js */
'use strict';
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), path = require('path'), assert = require('assert');
const TOKEN = '123:TESTTOKEN';
function makeEnv() {
  const props = { BOT_TOKEN: TOKEN, OWNER_ID: '1000' }, cache = {}, sheets = {};
  class Sheet {
    constructor(n) { this.d = []; this.n = n; }
    appendRow(r) { this.d.push(r.slice()); }
    getLastRow() { return this.d.length; }
    setFrozenRows() {}
    deleteRow(i) { this.d.splice(i - 1, 1); }
    getRange(r, c, nr = 1, nc = 1) {
      const s = this;
      return {
        getValues: () => { const o = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) { const v = (s.d[r - 1 + i] || [])[c - 1 + j]; row.push(v === undefined ? '' : v); } o.push(row); } return o; },
        setValues: v => { for (let i = 0; i < nr; i++) { s.d[r - 1 + i] = s.d[r - 1 + i] || []; for (let j = 0; j < nc; j++) s.d[r - 1 + i][c - 1 + j] = v[i][j]; } },
        setValue: v => { s.d[r - 1] = s.d[r - 1] || []; s.d[r - 1][c - 1] = v; }
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
      computeHmacSha256Signature: (v, k) => {
        if (typeof v !== typeof k) throw new Error('bad hmac args');
        const toBuf = x => (typeof x === 'string' ? Buffer.from(x) : Buffer.from(x.map(b => (b + 256) % 256)));
        return [...crypto.createHmac('sha256', toBuf(k)).update(toBuf(v)).digest()].map(b => (b > 127 ? b - 256 : b));
      },
      newBlob: s => ({ getBytes: () => [...Buffer.from(s)].map(b => (b > 127 ? b - 256 : b)) }),
      formatDate: (d, tz, fmt) => d.toISOString().slice(0, 7)
    },
    console
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../server/rating_gas.gs'), 'utf8'), ctx);
  ctx.__props = props; ctx.__sheets = sheets; ctx.__cache = cache;
  return ctx;
}
function initData(id, name, age = 0, token = TOKEN) {
  const f = { auth_date: String(Math.floor(Date.now() / 1000) - age), query_id: 'AAA', user: JSON.stringify({ id, first_name: name }) };
  const check = Object.keys(f).sort().map(k => k + '=' + f[k]).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  f.hash = crypto.createHmac('sha256', secret).update(check).digest('hex');
  return Object.keys(f).map(k => k + '=' + encodeURIComponent(f[k])).join('&');
}
const env = makeEnv();
const post = b => JSON.parse(env.doPost({ postData: { contents: JSON.stringify(b) } }).s);
const get = q => JSON.parse(env.doGet({ parameter: q }).s);
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok -', m); };
const clearRl = () => Object.keys(env.__cache).forEach(k => delete env.__cache[k]);
const score = (id, name, oj, extra = {}) => { clearRl(); return post(Object.assign({ action: 'score', initData: initData(id, name), name, oj, shifts: 5, rank: 1, days: 20, money: 100, job: 'Токарь' }, extra)); };
const adm = (id, action, args = {}) => post(Object.assign({ action, initData: initData(id, 'X') }, args));

// ---- игроки: Telegram и веб
ok(score(2001, 'Сергей', 400).ok && score(2002, 'Тест', 5405, { shifts: 0, days: 0 }).ok && score(2003, 'Вася', 100).ok, 'три игрока из Telegram записаны');
clearRl(); ok(post({ action: 'score', dev: 'abc123secret', name: 'Веб Игрок', oj: 300, shifts: 3, rank: 1, days: 10, money: 1, job: 'Слесарь' }).ok, 'веб-игрок (без Telegram) записан');
let top = get({ action: 'top', by: 'oj', limit: 50 });
ok(top.total === 4 && top.rows.length === 4, 'рейтинг отдаёт всех четверых');
ok(top.rows.filter(r => r.uid).every(r => /^tg:\d+$/.test(r.uid)) && top.rows.find(r => r.name === 'Сергей').uid === 'tg:2001', 'uid отдаётся для игроков из Telegram (по нему игра отмечает премиум)');
ok(top.rows.find(r => r.name === 'Веб Игрок').uid === '' && !JSON.stringify(top).includes('abc123secret'), 'технический ID веб-игрока (dev:…) не раскрывается');
ok(get({ action: 'top', by: 'oj', uid: 'tg:2001' }).me.uid === 'tg:2001', 'строка «я» тоже с uid');
ok(env.__sheets.Players.d[0][24] === 'blocked', 'заголовок таблицы дополнен колонкой blocked (миграция)');

// ---- переезд записей: игрок писался как dev:…, после включения BOT_TOKEN приходит с подписью Telegram
delete env.__props.BOT_TOKEN; clearRl();
ok(post({ action: 'score', dev: 'olddev77', name: 'Старожил', oj: 700, shifts: 9, rank: 2, days: 30, money: 5, job: 'Мастер' }).ok, 'старый режим (без BOT_TOKEN): игрок записан как dev:…');
clearRl(); post({ action: 'brigade_create', dev: 'olddev77', name: 'Ветераны' });
ok(env.__sheets.Brigades.d[1][1] === 'dev:olddev77', 'он бригадир, ключ dev:…');
env.__props.BOT_TOKEN = TOKEN; const before = env.__sheets.Players.d.length;
clearRl(); ok(post({ action: 'score', initData: initData(3003, 'Старожил'), dev: 'olddev77', name: 'Старожил', oj: 800, shifts: 10, rank: 2, days: 31, money: 5, job: 'Мастер' }).ok, 'тот же игрок с подписью Telegram отправил результат');
ok(env.__sheets.Players.d.length === before && env.__sheets.Players.d.some(r => r[0] === 'tg:3003') && !env.__sheets.Players.d.some(r => r[0] === 'dev:olddev77'), 'запись переехала на tg:… без дубля');
ok(env.__sheets.Players.d.find(r => r[0] === 'tg:3003')[2] === 800 && env.__sheets.Brigades.d[1][1] === 'tg:3003', 'очки сохранены, бригадирство перешло на tg:…');
ok(get({ action: 'top', by: 'oj', uid: 'tg:3003' }).me.uid === 'tg:3003', 'теперь игра видит его uid');
ok(env.__sheets.Players.d.filter(r => r[1] === 'Старожил').length === 1, 'в рейтинге он один');
ok(post({ action: 'score', initData: initData(3004, 'Чужой'), dev: 'olddev77', name: 'Чужой', oj: 1, shifts: 0, rank: 0, days: 1, money: 0 }).ok, 'другой игрок с чужим (уже перенесённым) dev получает собственную запись');
ok(env.__sheets.Players.d.some(r => r[0] === 'tg:3004') && env.__sheets.Players.d.find(r => r[0] === 'tg:3003')[1] === 'Старожил', 'и не затирает чужую');
env.__sheets.Players.d = env.__sheets.Players.d.filter(r => r[0] !== 'tg:3004'); env.__sheets.Players.d = env.__sheets.Players.d.filter(r => r[0] !== 'tg:3003'); env.__sheets.Brigades.d.splice(1);

// ---- права
ok(adm(2001, 'admin_list').error === 'forbidden', 'обычный игрок не имеет доступа к управлению рейтингом');
ok(adm(2001, 'admin_block', { id: 'tg:2001', blocked: true }).error === 'forbidden', 'игрок не может скрыть себя/других');
ok(post({ action: 'admin_list', initData: '' }).error === 'auth', 'без подписи Telegram отказ');
ok(post({ action: 'admin_list', initData: initData(1000, 'Owner').replace('Owner', 'Hack') }).error === 'auth', 'подделанная подпись отклонена');
ok(post({ action: 'admin_list', initData: initData(1000, 'Owner', 90000) }).error === 'auth', 'старая подпись (старше суток) для админ-операций отклонена');
ok(post({ action: 'admin_list', initData: initData(1000, 'Owner'), owner: true, uid: 'tg:1000' }).ok, 'владелец проходит (поля «owner/uid» от клиента ничего не решают)');
ok(post({ action: 'admin_list', dev: 'x', owner: true }).error === 'auth', 'подмена владельца через dev/owner не работает');
delete env.__props.OWNER_ID;
ok(/OWNER_ID/.test(adm(1000, 'admin_list').error), 'без OWNER_ID в свойствах скрипта сообщается, что настроить');
env.__props.OWNER_ID = '1000';

// ---- список
let ls = adm(1000, 'admin_list');
ok(ls.ok && ls.total === 4 && ls.list[0].name === 'Тест' && ls.list[0].oj === 5405, 'список для владельца: сверху по очкам, виден «Тест» с 5405');
ok(adm(1000, 'admin_list', { q: 'серг' }).list.length === 1 && adm(1000, 'admin_list', { q: 'tg:2003' }).list[0].name === 'Вася', 'поиск по имени и по ID');
ok(adm(1000, 'admin_list').list.find(x => x.name === 'Веб Игрок').id.indexOf('dev:') === 0, 'владелец видит технический ID (нужен для скрытия веб-игроков)');

// ---- скрыть
ok(adm(1000, 'admin_block', { id: 'tg:2002', blocked: true, note: 'тестовый аккаунт' }).blocked === true, 'владелец скрыл «Тест»');
top = get({ action: 'top', by: 'oj', limit: 50 });
ok(top.total === 3 && !top.rows.some(r => r.name === 'Тест'), 'скрытый пропал из рейтинга');
ok(get({ action: 'top', by: 'oj', uid: 'tg:2002' }).me === null, 'скрытый не видит себя в таблице');
ok(score(2002, 'Тест', 9999).ok && !get({ action: 'top', by: 'oj', limit: 50 }).rows.some(r => r.name === 'Тест'), 'новая отправка результата не возвращает скрытого в рейтинг');
ok(env.__sheets.Players.d[2][COLpos('oj')] === 9999, 'очки скрытого продолжают сохраняться (запись жива)');
function COLpos(k) { return env.__sheets.Players.d[0].indexOf(k); }
clearRl(); post({ action: 'score', initData: initData(2002, 'Тест'), name: 'Тест', oj: 1, shifts: 0, rank: 0, days: 1, money: 0, hidden: false }); // игрок сам шлёт hidden:false
ok(!get({ action: 'top', by: 'oj', limit: 50 }).rows.some(r => r.name === 'Тест'), 'игрок сам не может снять скрытие, поставленное владельцем (hidden:false от клиента не помогает)');
ok(get({ action: 'top', by: 'season' }).rows.every(r => r.name !== 'Тест') && get({ action: 'top', by: 'brig' }).ok, 'скрытый не попадает и в другие таблицы');
ok(adm(1000, 'admin_list').list.find(x => x.name === 'Тест').blocked === true && adm(1000, 'admin_list').blockedTotal === 1, 'в списке владельца скрытый помечен');
ok(adm(1000, 'admin_block', { id: 'tg:2002', blocked: false }).blocked === false && get({ action: 'top', by: 'oj' }).rows.some(r => r.name === 'Тест'), 'вернуть в рейтинг можно');
ok(adm(1000, 'admin_block', { id: 'tg:9999', blocked: true }).ok === false, 'несуществующий игрок отклоняется');
ok(adm(1000, 'admin_block', { id: 'dev:abc123secret', blocked: true }).ok && !get({ action: 'top', by: 'oj' }).rows.some(r => r.name === 'Веб Игрок'), 'веб-игрока тоже можно скрыть (по ID из списка владельца)');

// ---- удаление и бригады
clearRl(); post({ action: 'brigade_create', initData: initData(2001, 'Сергей'), name: 'Орлы' });
clearRl(); post({ action: 'brigade_join', initData: initData(2003, 'Вася'), name: 'Орлы' });
ok(env.__sheets.Brigades.d[1][1] === 'tg:2001', 'бригада «Орлы» создана Сергеем');
ok(adm(1000, 'admin_delete', { id: 'tg:2001', note: 'дубль' }).ok && !adm(1000, 'admin_list').list.some(x => x.id === 'tg:2001'), 'запись удалена');
ok(env.__sheets.Brigades.d[1][1] === 'tg:2003', 'бригадир удалённого игрока передан другому участнику');
ok(adm(1000, 'admin_delete', { id: 'tg:2003' }).ok && env.__sheets.Brigades.d.length === 1, 'пустая бригада удаляется вместе с последним участником');
ok(score(2001, 'Сергей', 450).ok && get({ action: 'top', by: 'oj' }).rows.some(r => r.name === 'Сергей'), 'удалённый появится снова, если заново отправит результат (для постоянного скрытия — «Скрыть»)');

// ---- журнал
const log = env.__sheets.AdminLog.d.slice(1);
ok(['Скрыт из рейтинга', 'Возвращён в рейтинг', 'Запись удалена'].every(a => log.some(r => r[2] === a && r[1] === 'tg:1000')), 'журнал: скрытие, возврат и удаление записаны (кто, кого, когда)');
ok(log.find(r => r[2] === 'Скрыт из рейтинга').slice(3, 6).join('|') === 'tg:2002|Тест|тестовый аккаунт', 'журнал: игрок и заметка сохранены');
console.log('\nВсего проверок:', n, '— всё прошло');
