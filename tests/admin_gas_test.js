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
      // Как в настоящем Apps Script: допустимы только (строка, строка) или (байты, байты)
      computeHmacSha256Signature: (v, k) => {
        if (typeof v !== typeof k) throw new Error('The parameters (' + typeof v + ',' + typeof k + ') don\'t match the method signature for Utilities.computeHmacSha256Signature.');
        const toBuf = x => (typeof x === 'string' ? Buffer.from(x) : Buffer.from(x.map(b => (b + 256) % 256)));
        return [...crypto.createHmac('sha256', toBuf(k)).update(toBuf(v)).digest()].map(b => (b > 127 ? b - 256 : b));
      },
      newBlob: s => ({ getBytes: () => [...Buffer.from(s)].map(b => (b > 127 ? b - 256 : b)) }),
      computeDigest: (a, s) => { if (typeof s !== 'string' && !Array.isArray(s)) throw new Error('bad digest arg'); return [...crypto.createHash('sha256').update(typeof s === 'string' ? Buffer.from(s) : Buffer.from(s.map(b => (b + 256) % 256))).digest()].map(b => (b > 127 ? b - 256 : b)); },
      DigestAlgorithm: { SHA_256: 1 }, getUuid: () => crypto.randomUUID(),
      // Utilities.formatDate: «день» считается в заданном поясе; ctx.__dayShift сдвигает время на N суток (проверка выплаты «раз в сутки»)
      formatDate: (d, tz, fmt) => {
        const t = new Date(d.getTime() + (ctx.__dayShift || 0) * 86400000);
        const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
        if (fmt !== 'yyyyMMdd') throw new Error('тест поддерживает только yyyyMMdd');
        return p.replace(/-/g, '');
      }
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
ok(adm(3001, 'me').error === 'forbidden', 'режим «только владелец»: назначенный админ не получает доступ к админ-API');
ok(adm(3001, 'players_search', { q: '' }).error === 'forbidden', 'назначенный админ не видит игроков');
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

ok(adm(1000, 'mute', { uid: '4001', minutes: 10 }).error.indexOf('причину') > 0, 'причина обязательна');
ok(adm(1000, 'mute', { uid: '4001', minutes: 10, reason: 'спам' }).ok, 'мут выдан владельцем');
env.__cache['c_tg:4001'] && delete env.__cache['c_tg:4001'];
ok(/мут/i.test(post({ action: 'chat_post', initData: initData(4001, 'Вася'), name: 'Вася', text: 'снова пишу' }).error), 'замученный не может писать (проверка на сервере)');
ok(adm(1000, 'unmute', { uid: '4001', reason: 'извинился' }).ok, 'мут снят');
ok(adm(1000, 'mute', { uid: '1000', minutes: 5, reason: 'сам' }).error.indexOf('себе') > 0, 'нельзя применять санкции к себе');
ok(adm(1000, 'admin_add', { uid: '3002', perms: ['bans'], reason: 'второй' }, adm(1000, 'admin_add', { uid: '3002', perms: ['bans'], reason: 'второй' }).token).ok, 'второй админ назначен');

let b = adm(1000, 'ban', { uid: '4002', hours: 0, reason: 'читерство' });
ok(b.needConfirm, 'бан требует подтверждения');
ok(adm(1000, 'ban', { uid: '4002', hours: 0, reason: 'читерство' }, b.token).ok, 'бан после подтверждения');
ok(post({ action: 'ping', initData: initData(4002, 'Петя') }).ban.reason === 'читерство', 'ping сообщает клиенту о бане');
env.__cache['c_tg:4002'] && delete env.__cache['c_tg:4002'];
ok(/заблокированы/.test(post({ action: 'chat_post', initData: initData(4002, 'Петя'), name: 'Петя', text: 'пишу из бана' }).error), 'забаненный не может писать в чат');
ok(adm(1000, 'sanctions_list').list.some(x => x.type === 'ban' && x.id === '4002'), 'список активных санкций');
ok(adm(1000, 'unban', { uid: '4002', reason: 'ошибка' }).ok && !post({ action: 'ping', initData: initData(4002, 'Петя') }).ban, 'разбан');

// --- модерация чата
const msg = get({ action: 'chat_list' }).msgs[0];
ok(adm(1000, 'chat_delete', { id: msg.id, reason: 'оскорбление' }).ok, 'удаление сообщения');
ok(get({ action: 'chat_list' }).msgs.length === 0, 'удалённое сообщение не отдаётся игрокам');
ok(adm(1000, 'chat_recent', {}).msgs.some(m => m.deleted), 'админ видит удалённые с пометкой');
let lk = adm(1000, 'chat_lock', { locked: true, reason: 'рейд' });
ok(lk.needConfirm && adm(1000, 'chat_lock', { locked: true, reason: 'рейд' }, lk.token).ok, 'закрытие чата с подтверждением');
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
// =====================================================================
// --- премиум-аккаунты
// =====================================================================
const admc = (id, op, args) => { const r = adm(id, op, args); return r && r.needConfirm ? adm(id, op, args, r.token) : r; }; // с автоподтверждением
const clearRate = uid => { ['c_', 'vip_', 'pp_'].forEach(p => { delete env.__cache[p + 'tg:' + uid]; }); };
const GOLD = 'За тестировку игры';
// чат был закрыт в тесте выше — открываем
ok(admc(1000, 'chat_lock', { locked: false, reason: 'открываем чат' }).ok, 'чат открыт для проверки премиума');
post({ action: 'ping', initData: initData(5001, 'Олег'), name: 'Олег Золотой', job: 'Токарь', rank: 1, shifts: 10, oj: 300, money: 100, days: 12, v: '3.18.0' });
post({ action: 'ping', initData: initData(5002, 'Игорь'), name: 'Игорь Простой', job: 'Слесарь', rank: 1, shifts: 10, oj: 300, money: 100, days: 12, v: '3.18.0' });

// выдача — только владелец
ok(post({ action: 'ping', initData: initData(5001, 'Олег') }).premium === null, 'премиум: до выдачи его нет');
ok(adm(2001, 'premium_grant', { uid: '5001', reason: GOLD }).error === 'forbidden', 'премиум: обычный игрок не может выдать премиум');
ok(adm(3002, 'premium_grant', { uid: '5001', reason: GOLD }).error === 'forbidden', 'премиум: назначенный админ (не владелец) не может выдать премиум');
ok(adm(2001, 'premium_revoke', { uid: '5001', reason: 'просто так' }).error === 'forbidden', 'премиум: обычный игрок не может снять премиум');
ok(adm(2001, 'premium_list').error === 'forbidden', 'премиум: список для админа закрыт для игроков');
ok(post({ action: 'premium_claim', initData: initData(5001, 'Олег') }).ok === false, 'премиум: выплата без премиума не выдаётся');
ok(adm(1000, 'premium_grant', { uid: '5001' }).error.indexOf('причину') > 0, 'премиум: запись для игрока обязательна');
ok(adm(1000, 'premium_grant', { uid: 'abc', reason: GOLD }).ok === false, 'премиум: некорректный ID отклонён');
let gr = adm(1000, 'premium_grant', { uid: '5001', reason: GOLD });
ok(gr.ok && gr.granted, 'премиум: владелец выдал премиум с записью «' + GOLD + '»');

// что видит сам игрок
let pp = post({ action: 'ping', initData: initData(5001, 'Олег') }).premium;
ok(pp && pp.note === GOLD && pp.payout.amount === 2500 && pp.payout.claimable === true && pp.title === '', 'премиум: ping отдаёт игроку статус, запись админа и выплату 2500');
ok(post({ action: 'ping', initData: initData(5002, 'Игорь'), premium: { note: 'взлом' } }).premium === null, 'премиум: у остальных премиума нет, поле premium от клиента игнорируется');

// публичный список (для золотых имён в рейтинге и плашки)
const pl = get({ action: 'premium_list' });
ok(pl.ok && pl.list.length === 1 && pl.list[0].uid === 'tg:5001' && pl.list[0].name === 'Олег Золотой' && pl.list[0].note === GOLD, 'премиум: публичный список — uid, игровое имя и запись админа');
ok(pl.list[0].unique === true, 'премиум: имя игрока уникально — золото в рейтинге по имени разрешено');
post({ action: 'ping', initData: initData(5003, 'Двойник'), name: 'олег  золотой', job: 'Слесарь', rank: 1, shifts: 10, oj: 300, money: 100, days: 12, v: '3.18.0' });
delete env.__cache['prem_pub'];
ok(get({ action: 'premium_list' }).list[0].unique === false, 'премиум: игрок с таким же именем делает имя неоднозначным — золото по имени не показывается (защита от двойников)');
post({ action: 'ping', initData: initData(5003, 'Двойник'), name: 'Двойник', job: 'Слесарь', rank: 1, shifts: 10, oj: 300, money: 100, days: 12, v: '3.18.0' });
ok(!JSON.stringify(pl).includes('tg:1000') && !('by' in pl.list[0]), 'премиум: публичный список не раскрывает, кто выдал премиум');
ok(adm(1000, 'players_search', { q: '5001' }).players[0].premium === true && adm(1000, 'players_search', { q: '5002' }).players[0].premium === false, 'премиум: в поиске игроков видна отметка');
ok(adm(1000, 'player_get', { uid: '5001' }).premium.note === GOLD, 'премиум: профиль игрока в админке показывает запись');

// ежедневная выплата
ok(post({ action: 'premium_claim', initData: '' }).error === 'auth', 'выплата: без подписи Telegram отклонена');
ok(post({ action: 'premium_claim', initData: initData(5002, 'Игорь') }).ok === false, 'выплата: не премиум-игрок получить не может');
let c1 = post({ action: 'premium_claim', initData: initData(5001, 'Олег') });
ok(c1.ok && c1.amount === 2500, 'выплата: 2500 ₽ в день выдаются');
ok(post({ action: 'premium_claim', initData: initData(5001, 'Олег') }).error === 'already', 'выплата: второй раз в тот же день не выдаётся');
ok(post({ action: 'ping', initData: initData(5001, 'Олег') }).premium.payout.claimable === false, 'выплата: после получения ping сообщает, что сегодня уже получено');
env.__dayShift = 1; // наступили следующие сутки
ok(post({ action: 'ping', initData: initData(5001, 'Олег') }).premium.payout.claimable === true, 'выплата: на следующий день снова доступна');
ok(post({ action: 'premium_claim', initData: initData(5001, 'Олег') }).ok === true, 'выплата: на следующий день получена');
ok(adm(1000, 'premium_list').list[0].payoutTotal === 5000, 'выплата: сервер ведёт учёт выданного (2 × 2500)');
let bn = admc(1000, 'ban', { uid: '5001', hours: 0, reason: 'проверка бана' });
ok(post({ action: 'premium_claim', initData: initData(5001, 'Олег') }).ok === false, 'выплата: забаненный получить не может (и в день выплаты — тоже)');
ok(adm(1000, 'unban', { uid: '5001', reason: 'проверка окончена' }).ok, 'выплата: проверка бана завершена');

// титулы
ok(post({ action: 'premium_title', initData: initData(5002, 'Игорь'), title: 'Король завода' }).ok === false, 'титулы: без премиума недоступны');
ok(post({ action: 'premium_title', initData: initData(5001, 'Олег'), title: 'Президент Земли' }).ok === false, 'титулы: свой титул придумать нельзя — только из списка');
ok(['Олигарх Едрёностали', 'Король завода', 'Человек с деньгами'].every(t => post({ action: 'premium_title', initData: initData(5001, 'Олег'), title: t }).ok), 'титулы: доступны все три эксклюзивных');
ok(get({ action: 'premium_list' }).list[0].title === 'Человек с деньгами', 'титулы: выбранный титул виден всем');
ok(post({ action: 'premium_title', initData: initData(5001, 'Олег'), title: '' }).ok && get({ action: 'premium_list' }).list[0].title === '', 'титулы: титул можно снять');
ok(post({ action: 'premium_title', initData: initData(5001, 'Олег'), title: 'Король завода' }).ok, 'титулы: выбран «Король завода»');

// достижения для VIP-профиля
clearRate(5001); clearRate(5002);
post({ action: 'ping', initData: initData(5001, 'Олег'), name: 'Олег Золотой', rank: 1, shifts: 10, oj: 300, money: 100, days: 12, ach: ['Первая зарплата', '<b>Выжил в среду</b>'] });
ok(get({ action: 'premium_list' }).list[0].ach.length === 2 && get({ action: 'premium_list' }).list[0].ach[0] === 'Первая зарплата', 'VIP-профиль: достижения сохраняются на сервере');
ok(!/[<>]/.test(JSON.stringify(get({ action: 'premium_list' }).list[0].ach)), 'VIP-профиль: из достижений вычищена разметка');

// VIP-объявления в общем чате
ok(/премиум/i.test(post({ action: 'chat_post', initData: initData(5002, 'Игорь'), name: 'Игорь Простой', text: 'Продаю гараж', vip: true }).error), 'VIP-чат: не премиум-игрок объявление опубликовать не может');
delete env.__cache['c_tg:5001'];
ok(post({ action: 'chat_post', initData: initData(5001, 'Олег'), name: 'Олег Золотой', job: 'Токарь', text: 'Всем привет от VIP!', vip: true }).ok, 'VIP-чат: премиум-игрок публикует объявление');
delete env.__cache['c_tg:5001'];
ok(/раз в/.test(post({ action: 'chat_post', initData: initData(5001, 'Олег'), name: 'Олег Золотой', text: 'Ещё одно объявление', vip: true }).error), 'VIP-чат: частота объявлений ограничена');
delete env.__cache['c_tg:5001'];
ok(post({ action: 'chat_post', initData: initData(5001, 'Олег'), name: 'Олег Золотой', job: 'Токарь', text: 'Обычное сообщение' }).ok, 'VIP-чат: обычные сообщения премиум-игрока не ограничены паузой');
const cl = get({ action: 'chat_list' });
const vipMsgs = cl.msgs.filter(m => m.vip);
ok(vipMsgs.length === 1 && vipMsgs[0].text === 'Всем привет от VIP!' && cl.msgs.some(m => !m.vip && m.text === 'Обычное сообщение'), 'VIP-чат: объявление помечено, обычное сообщение — нет');
ok(cl.prem['tg:5001'] && cl.prem['tg:5001'].note === GOLD && cl.prem['tg:5001'].title === 'Король завода' && !cl.prem['tg:5002'], 'VIP-чат: чат отдаёт данные премиум-авторов (для золотого имени и плашки)');

// снятие премиума
let rv = adm(1000, 'premium_revoke', { uid: '5001', reason: 'Тестирование окончено' });
ok(rv.needConfirm, 'снятие: требует подтверждения');
ok(admc(1000, 'premium_revoke', { uid: '5001', reason: 'Тестирование окончено' }).ok, 'снятие: премиум снят после подтверждения');
ok(post({ action: 'ping', initData: initData(5001, 'Олег') }).premium === null, 'снятие: у игрока премиум пропал сразу');
ok(post({ action: 'premium_claim', initData: initData(5001, 'Олег') }).ok === false, 'снятие: выплата больше не выдаётся');
ok(post({ action: 'premium_title', initData: initData(5001, 'Олег'), title: 'Король завода' }).ok === false, 'снятие: титулы недоступны');
clearRate(5001); delete env.__cache['vip_tg:5001'];
ok(/премиум/i.test(post({ action: 'chat_post', initData: initData(5001, 'Олег'), name: 'Олег', text: 'Снова объявление', vip: true }).error), 'снятие: VIP-объявления недоступны');
ok(get({ action: 'premium_list' }).list.length === 0 && !get({ action: 'chat_list' }).prem['tg:5001'], 'снятие: золотое имя пропало из списков и чата');
ok(admc(1000, 'premium_revoke', { uid: '5001', reason: 'ещё раз' }).ok === false, 'снятие: повторное снятие отклоняется');
ok(adm(1000, 'premium_list').list[0].active === false, 'снятие: в списке владельца запись осталась как неактивная');
ok(adm(1000, 'premium_grant', { uid: '5001', reason: 'Вернули за помощь' }).granted === true, 'выдача: премиум можно выдать повторно');
ok(post({ action: 'ping', initData: initData(5001, 'Олег') }).premium.payout.claimable === false, 'выдача: снять и выдать заново — не способ получить вторую выплату за день');
ok(adm(1000, 'premium_grant', { uid: '5001', reason: 'Новая запись' }).granted === false && post({ action: 'ping', initData: initData(5001, 'Олег') }).premium.note === 'Новая запись', 'выдача: запись админа можно менять у действующего премиума');
const alog = adm(1000, 'audit', { limit: 300 }).list;
ok(['Премиум выдан', 'Премиум снят', 'Премиум выдан повторно', 'Премиум: изменена запись'].every(a => alog.some(x => x.action === a && x.actorId === '1000' && x.target === '5001')), 'журнал: выдача, изменение записи и снятие премиума записаны');
ok(alog.find(x => x.action === 'Премиум выдан').reason === GOLD, 'журнал: запись админа сохранена в причине');
ok(alog.some(x => x.action.indexOf('ОТКАЗ') === 0 && x.actorId === '3002' && /premium_grant/.test(x.details)), 'журнал: попытка выдать премиум не владельцем зафиксирована');
env.__dayShift = 0;

console.log('\nВсего проверок:', n, '— всё прошло');
