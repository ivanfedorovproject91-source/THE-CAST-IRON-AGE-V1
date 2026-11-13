/**
 * «Чугунный век» — общий чат + административный кабинет (Google Apps Script, бесплатно).
 *
 * УСТАНОВКА (обновление уже работающего чата):
 * 1) Откройте таблицу «Чугунный век — чат» → «Расширения → Apps Script», замените весь код на этот файл, сохраните.
 * 2) «Настройки проекта (шестерёнка) → Свойства скрипта» — добавьте два свойства:
 *      BOT_TOKEN  — токен вашего бота из @BotFather (нужен для проверки подписи Telegram; нигде в игре не хранится)
 *      OWNER_ID   — ваш числовой Telegram ID (узнать: написать боту @userinfobot). Это единственный владелец игры.
 * 3) «Развернуть → Управление развёртываниями → ✎ → Версия: Новая версия → Развернуть».
 *    URL остаётся прежним (CHAT_URL в js/config.js менять не нужно).
 *
 * БЕЗОПАСНОСТЬ:
 *  - Личность игрока определяется ТОЛЬКО по подписанным данным Telegram (initData, HMAC-SHA256 с токеном бота).
 *    Всё, что клиент пишет про «себя» (uid, роль), игнорируется.
 *  - Владелец задан свойством OWNER_ID, администраторы хранятся на листе «admins», который меняет только этот код
 *    (операции доступны только владельцу). Из игры стать админом невозможно.
 *  - Каждая админ-операция проверяет права на сервере. Опасные операции требуют одноразового подтверждения.
 *  - Все действия и отказы пишутся на лист «audit» (кто, над кем, что, когда, причина).
 *  Не давайте посторонним доступ к таблице и скрипту: владелец таблицы по определению всемогущ.
 */
var PERMS = ['players', 'bans', 'chat', 'params', 'online', 'stats', 'audit'];
var AUTH_MAX = 24 * 3600, ADMIN_AUTH_MAX = 12 * 3600; // сек: срок годности initData
var ONLINE_MS = 6 * 60 * 1000;
var PARAMS = { // допустимые игровые параметры (значения по умолчанию = js/config.js)
  AUTO_PER_WEEK: { def: 2, min: 0, max: 14 }, CANTEEN_LIMIT: { def: 5, min: 0, max: 20 },
  DRAIN_ENERGY: { def: 0.4, min: 0, max: 3 }, DRAIN_MOOD: { def: 0.75, min: 0, max: 3 },
  OP_ENERGY_MULT: { def: 0.65, min: 0.1, max: 3 }, HEAL_FACTOR: { def: 0.5, min: 0.1, max: 3 },
  SAT_DRAIN_WORK: { def: 4.5, min: 0, max: 15 }, SAT_DRAIN_REST: { def: 1.5, min: 0, max: 15 },
  REL_TALK_MULT: { def: 2, min: 0.1, max: 5 }, REL_TALK_NEG_MULT: { def: 1.5, min: 0.1, max: 5 },
  REL_DAILY_CAP: { def: 22, min: 1, max: 60 }, FISH_PLAN_DAYS: { def: 3, min: 1, max: 14 },
  WALK_LATE: { def: 22, min: 0, max: 100 }, MOOD_CAP_TRAINEE: { def: 90, min: 10, max: 100 }
};
var HEAD = {
  chat: ['t', 'uid', 'name', 'job', 'text', 'deleted', 'del_by', 'del_reason'],
  players: ['uid', 'tg_name', 'name', 'job', 'rank', 'shifts', 'oj', 'money', 'days', 'ver', 'first', 'last', 'msgs'],
  sanctions: ['uid', 'type', 'until', 'reason', 'by_uid', 'by_name', 'at', 'active'],
  admins: ['uid', 'name', 'perms', 'added_by', 'at'],
  audit: ['t', 'actor_uid', 'actor_name', 'target_uid', 'target_name', 'action', 'reason', 'details']
};

/* ---------- утилиты ---------- */
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function now_() { return Date.now(); }
function clean_(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); }
function S_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), s = ss.getSheetByName(name), h = HEAD[name];
  if (!s) { s = ss.insertSheet(name); s.appendRow(h); s.setFrozenRows(1); }
  else if (s.getLastColumn() < h.length) s.getRange(1, 1, 1, h.length).setValues([h]);
  return s;
}
function rows_(name) { var s = S_(name), n = s.getLastRow(); return n < 2 ? [] : s.getRange(2, 1, n - 1, HEAD[name].length).getValues(); }
function withLock_(fn) { var l = LockService.getScriptLock(); l.waitLock(15000); try { return fn(); } finally { l.releaseLock(); } }
function digits_(v) { v = String(v == null ? '' : v).replace(/^tg:/, '').trim(); return /^\d{1,15}$/.test(v) ? v : ''; }
function bytes_(str) { return Utilities.newBlob(String(str)).getBytes(); }
function hex_(bytes) { return bytes.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); }
function safeEq_(a, b) { if (a.length !== b.length) return false; var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
function sha_(s) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes_(s))); }
function stable_(o) { // детерминированный JSON (для привязки подтверждения к параметрам операции)
  if (Array.isArray(o)) return '[' + o.map(stable_).join(',') + ']';
  if (o && typeof o === 'object') return '{' + Object.keys(o).sort().map(function (k) { return JSON.stringify(k) + ':' + stable_(o[k]); }).join(',') + '}';
  return JSON.stringify(o === undefined ? null : o);
}

/* ---------- подлинность: подпись Telegram ---------- */
function verify_(raw, maxAge) {
  var token = prop_('BOT_TOKEN'); raw = String(raw || '');
  if (!token || !raw) return null;
  var o = {};
  raw.split('&').forEach(function (p) {
    var i = p.indexOf('='); if (i < 0) return;
    try { o[decodeURIComponent(p.slice(0, i).replace(/\+/g, ' '))] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' ')); } catch (e) {}
  });
  var got = o.hash; if (!got) return null; delete o.hash;
  var check = Object.keys(o).sort().map(function (k) { return k + '=' + o[k]; }).join('\n');
  // Apps Script принимает пары (строка, строка) или (байты, байты) — смешивать нельзя, поэтому всё переводим в байты.
  var secret = Utilities.computeHmacSha256Signature(bytes_(token), bytes_('WebAppData'));
  var calc = hex_(Utilities.computeHmacSha256Signature(bytes_(check), secret));
  if (!safeEq_(calc, String(got))) return null;
  var ad = +o.auth_date || 0;
  if (!ad || now_() / 1000 - ad > maxAge || ad > now_() / 1000 + 300) return null;
  var u; try { u = JSON.parse(o.user); } catch (e) { return null; }
  var id = digits_(u && u.id); if (!id) return null;
  return { id: id, uid: 'tg:' + id, name: clean_((u.first_name || '') + (u.last_name ? ' ' + u.last_name : '') || u.username || id, 40) };
}

/* ---------- настройки (параметры игры, радио, объявление) ---------- */
function defCfg_() {
  return { params: {}, chatLocked: false, announce: '', forced: {},
    radio: { on: true, stations: [{ id: 'mayak', name: 'Радио «Маяк»', url: '', meta: '', on: true }, { id: 'retro', name: 'Ретро FM', url: '', meta: '', on: true }, { id: 'seven', name: 'Радио 7 на семи холмах', url: '', meta: '', on: true }] } };
}
function cfg_() {
  var c = CacheService.getScriptCache().get('cfg'), o;
  if (c) { try { return JSON.parse(c); } catch (e) {} }
  try { o = JSON.parse(prop_('CFG') || '{}'); } catch (e) { o = {}; }
  var d = defCfg_(); Object.keys(d).forEach(function (k) { if (o[k] === undefined) o[k] = d[k]; });
  CacheService.getScriptCache().put('cfg', JSON.stringify(o), 120);
  return o;
}
function saveCfg_(o) { PropertiesService.getScriptProperties().setProperty('CFG', JSON.stringify(o)); CacheService.getScriptCache().remove('cfg'); }
function publicCfg_() { var c = cfg_(); return { params: c.params, chatLocked: !!c.chatLocked, announce: c.announce || '', radio: c.radio }; }

/* ---------- роли ---------- */
function admins_() {
  var cache = CacheService.getScriptCache(), c = cache.get('adm');
  if (c) { try { return JSON.parse(c); } catch (e) {} }
  var m = {}; rows_('admins').forEach(function (r) { var id = digits_(r[0]); if (id) m[id] = { name: String(r[1]), perms: String(r[2]).split(',').filter(function (p) { return PERMS.indexOf(p) >= 0; }) }; });
  cache.put('adm', JSON.stringify(m), 300); return m;
}
function roleOf_(id) {
  var owner = digits_(prop_('OWNER_ID'));
  if (owner && id === owner) return { role: 'owner', perms: PERMS.slice() };
  var a = admins_()[id]; if (a) return { role: 'admin', perms: a.perms };
  return { role: '', perms: [] };
}
function playerName_(uid) { var r = rows_('players'); for (var i = 0; i < r.length; i++) if (r[i][0] === uid) return String(r[i][2] || r[i][1]); return ''; }

/* ---------- санкции ---------- */
function activeSanctions_() { // {ban:{uid:{...}}, mute:{...}}
  var out = { ban: {}, mute: {} }, t = now_();
  rows_('sanctions').forEach(function (r, i) {
    if (+r[7] !== 1) return; var until = +r[2] || 0; if (until && until < t) return;
    out[r[1]] && (out[r[1]][r[0]] = { until: until, reason: String(r[3]), by: String(r[5]), at: +r[6], row: i + 2 });
  });
  return out;
}
function sanction_(uid, type) {
  var cache = CacheService.getScriptCache(), key = 'sn_' + type + '_' + uid, c = cache.get(key);
  if (c !== null && c !== undefined) return c === 'null' ? null : JSON.parse(c);
  var s = activeSanctions_()[type][uid] || null;
  cache.put(key, s ? JSON.stringify(s) : 'null', 60); return s;
}
function dropSanctionCache_(uid) { var c = CacheService.getScriptCache(); c.remove('sn_ban_' + uid); c.remove('sn_mute_' + uid); }

/* ---------- журнал ---------- */
function audit_(actor, targetUid, action, reason, details) {
  var tn = targetUid ? playerName_(targetUid) : '';
  S_('audit').appendRow([now_(), actor.uid, actor.name, targetUid || '', tn, action, reason || '', clean_(details, 400)]);
}

/* ---------- публичные точки входа ---------- */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'chat_list') return out_(chatList_(+p.limit));
  if (p.action === 'config') return out_({ ok: true, cfg: publicCfg_() });
  return out_({ ok: false, error: 'unknown action' });
}
function doPost(e) {
  var b; try { b = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad json' }); }
  try {
    if (b.action === 'ping') return out_(ping_(b));
    if (b.action === 'chat_post') return out_(chatPost_(b));
    if (b.action === 'admin') return out_(admin_(b));
  } catch (err) { return out_({ ok: false, error: 'server error' }); }
  return out_({ ok: false, error: 'unknown action' });
}

function chatList_(limit) {
  var s = S_('chat'), n = s.getLastRow(), lim = Math.min(100, Math.max(1, limit || 60));
  var cfg = cfg_();
  if (n < 2) return { ok: true, msgs: [], locked: !!cfg.chatLocked };
  var from = Math.max(2, n - lim - 40 + 1), rows = s.getRange(from, 1, n - from + 1, 6).getValues(), msgs = [];
  rows.forEach(function (r, i) { if (+r[5] !== 1) msgs.push({ id: from + i, t: r[0], uid: r[1], name: r[2], job: r[3], text: r[4] }); });
  return { ok: true, msgs: msgs.slice(-lim), locked: !!cfg.chatLocked };
}
function ping_(b) {
  var u = verify_(b.initData, AUTH_MAX); if (!u) return { ok: false, error: 'auth' };
  var cfg = cfg_(), r = roleOf_(u.id);
  var key = 'pp_' + u.uid, cache = CacheService.getScriptCache();
  if (!cache.get(key)) { cache.put(key, '1', 60); upsertPlayer_(u, b); }
  return { ok: true, role: r.role, perms: r.perms, ban: sanction_(u.uid, 'ban'), mute: sanction_(u.uid, 'mute'),
    forceName: (cfg.forced || {})[u.uid] || '', cfg: publicCfg_(), now: now_() };
}
function num_(v, lo, hi) { v = Math.round(+v); return isNaN(v) ? lo : Math.max(lo, Math.min(hi, v)); }
function upsertPlayer_(u, b) {
  var name = clean_(b.name, 18) || u.name;
  withLock_(function () {
    var s = S_('players'), n = s.getLastRow(), t = now_(), row = null, r = 0;
    if (n >= 2) { var f = s.getRange(2, 1, n - 1, 1).createTextFinder(u.uid).matchEntireCell(true).findNext(); if (f) { r = f.getRow(); row = s.getRange(r, 1, 1, 13).getValues()[0]; } }
    var vals = [u.uid, u.name, name, clean_(b.job, 40), num_(b.rank, 0, 10), num_(b.shifts, 0, 4000), num_(b.oj, -100000, 10000000), num_(b.money, 0, 1e10), num_(b.days, 0, 4000), clean_(b.v, 12), row ? row[10] : t, t, row ? row[12] : 0];
    if (r) s.getRange(r, 1, 1, 13).setValues([vals]); else s.appendRow(vals);
  });
}
function chatPost_(b) {
  var u = verify_(b.initData, AUTH_MAX); if (!u) return { ok: false, error: 'Чат доступен только внутри Telegram' };
  var role = roleOf_(u.id), cfg = cfg_();
  if (cfg.chatLocked && !role.role) return { ok: false, error: 'Чат временно закрыт администрацией' };
  var ban = sanction_(u.uid, 'ban'); if (ban) return { ok: false, error: 'Вы заблокированы: ' + ban.reason };
  var mute = sanction_(u.uid, 'mute');
  if (mute) return { ok: false, error: 'Вы в муте' + (mute.until ? ' до ' + new Date(mute.until).toLocaleString('ru-RU') : '') + ': ' + mute.reason };
  var text = clean_(b.text, 200); if (text.length < 2) return { ok: false, error: 'empty' };
  var cache = CacheService.getScriptCache();
  if (cache.get('c_' + u.uid)) return { ok: false, error: 'слишком часто' };
  cache.put('c_' + u.uid, '1', 6);
  withLock_(function () { S_('chat').appendRow([now_(), u.uid, clean_(b.name, 30) || u.name, clean_(b.job, 40), text, 0, '', '']); });
  return { ok: true };
}

/* ---------- админ-кабинет ---------- */
var DANGEROUS = { ban: 1, chat_delete_user: 1, chat_lock: 1, params_reset: 1, admin_add: 1, admin_perms: 1, admin_remove: 1, radio_set: 1, player_rename: 1 };
function cleanReason_(r) { r = clean_(r, 200); return r.length >= 3 ? r : ''; }
function confirm_(u, op, a, token) {
  var cache = CacheService.getScriptCache(), sig = sha_(u.uid + '|' + op + '|' + stable_(a));
  if (token) {
    var k = 'cf_' + String(token).replace(/[^a-z0-9]/gi, ''), v = cache.get(k);
    if (v && v === sig) { cache.remove(k); return null; }
    return { ok: false, error: 'Подтверждение недействительно или устарело' };
  }
  var t = Utilities.getUuid().replace(/-/g, ''); cache.put('cf_' + t, sig, 120);
  return { ok: false, needConfirm: true, token: t, summary: OPS[op].title(a) };
}
function rate_(uid) { var c = CacheService.getScriptCache(), k = 'rl_' + uid + '_' + Math.floor(now_() / 60000), n = +(c.get(k) || 0) + 1; c.put(k, String(n), 90); return n <= 60; }
function denied_(u, op) {
  var c = CacheService.getScriptCache(), k = 'dn_' + u.uid; if (c.get(k)) return; c.put(k, '1', 60);
  audit_(u, '', 'ОТКАЗ (нет прав)', '', 'op=' + clean_(op, 40));
}
function admin_(b) {
  var u = verify_(b.initData, ADMIN_AUTH_MAX); if (!u) return { ok: false, error: 'auth' };
  var r = roleOf_(u.id), op = String(b.op || ''), a = (b.args && typeof b.args === 'object') ? b.args : {}, h = OPS[op];
  if (r.role !== 'owner') { denied_(u, op); return { ok: false, error: 'forbidden' }; }
  if (!h) return { ok: false, error: 'unknown op' };
  if ((h.owner && r.role !== 'owner') || (h.perm && r.perms.indexOf(h.perm) < 0)) { denied_(u, op); return { ok: false, error: 'forbidden' }; }
  if (!rate_(u.uid)) return { ok: false, error: 'Слишком часто' };
  if (h.reason) { var reason = cleanReason_(a.reason); if (!reason) return { ok: false, error: 'Укажите причину (не короче 3 знаков)' }; a.reason = reason; }
  if (DANGEROUS[op]) { var c = confirm_(u, op, a, b.confirm); if (c) return c; }
  var run = function () { return h.fn(u, r, a); };
  return h.write ? withLock_(run) : run();
}
/** Можно ли применять санкции к цели: не себе, не владельцу, администраторам — только владелец. */
function targetOk_(u, r, id) {
  if (!id) return 'Некорректный Telegram ID';
  if ('tg:' + id === u.uid) return 'Нельзя применять к себе';
  var tr = roleOf_(id);
  if (tr.role === 'owner') return 'Нельзя применять к владельцу';
  if (tr.role === 'admin' && r.role !== 'owner') return 'Администраторов может наказывать только владелец';
  return '';
}
function fail_(m) { return { ok: false, error: m }; }
function playerRow_(r, sn) {
  var uid = r[0];
  return { uid: uid, id: uid.replace('tg:', ''), tg: r[1], name: r[2], job: r[3], rank: r[4], shifts: r[5], oj: r[6], money: r[7], days: r[8], ver: r[9], first: r[10], last: r[11],
    banned: !!(sn && sn.ban[uid]), muted: !!(sn && sn.mute[uid]) };
}
function setSanction_(u, type, id, until, reason) {
  var uid = 'tg:' + id, s = S_('sanctions'), n = s.getLastRow();
  rows_('sanctions').forEach(function (r, i) { if (r[0] === uid && r[1] === type && +r[7] === 1) s.getRange(i + 2, 8).setValue(0); });
  s.appendRow([uid, type, until, reason, u.uid, u.name, now_(), 1]); dropSanctionCache_(uid);
}
function clearSanction_(type, id) {
  var uid = 'tg:' + id, s = S_('sanctions'), c = 0;
  rows_('sanctions').forEach(function (r, i) { if (r[0] === uid && r[1] === type && +r[7] === 1) { s.getRange(i + 2, 8).setValue(0); c++; } });
  dropSanctionCache_(uid); return c;
}
function chatRows_(limit) { var s = S_('chat'), n = s.getLastRow(); if (n < 2) return []; var from = Math.max(2, n - limit + 1); return s.getRange(from, 1, n - from + 1, 8).getValues().map(function (r, i) { return { id: from + i, t: r[0], uid: r[1], name: r[2], job: r[3], text: r[4], deleted: +r[5] === 1, by: r[6], why: r[7] }; }); }
function stationsClean_(list) {
  var ids = ['mayak', 'retro', 'seven'], out = [];
  ids.forEach(function (id) {
    var s = (list || []).filter(function (x) { return x && x.id === id; })[0] || {};
    var url = String(s.url || '').trim(), meta = String(s.meta || '').trim();
    out.push({ id: id, name: clean_(s.name, 40) || id, url: /^https:\/\/[^\s"'<>]{4,300}$/.test(url) ? url : '', meta: /^https:\/\/[^\s"'<>]{4,300}$/.test(meta) ? meta : '', on: s.on !== false });
  });
  return out;
}

var OPS = {
  me: { fn: function (u, r) { return { ok: true, role: r.role, perms: r.perms, id: u.id, name: u.name }; } },
  stats: { perm: 'stats', fn: function () {
    var t = now_(), p = rows_('players'), sn = activeSanctions_(), day = 86400000, o = { total: p.length, online: 0, dau: 0, wau: 0, new24: 0, new7: 0 };
    p.forEach(function (r) { var last = +r[11], first = +r[10]; if (t - last < ONLINE_MS) o.online++; if (t - last < day) o.dau++; if (t - last < 7 * day) o.wau++; if (t - first < day) o.new24++; if (t - first < 7 * day) o.new7++; });
    o.banned = Object.keys(sn.ban).length; o.muted = Object.keys(sn.mute).length;
    var d0 = new Date(t); d0.setHours(0, 0, 0, 0); var start = d0.getTime(), days = [0, 0, 0, 0, 0, 0, 0];
    chatRows_(2000).forEach(function (m) { if (m.deleted) return; var ago = m.t >= start ? 0 : Math.floor((start - m.t) / day) + 1; if (ago > 6) return; days[6 - ago]++; });
    o.chatByDay = days; o.top = p.slice().sort(function (a, b) { return +b[6] - +a[6]; }).slice(0, 5).map(function (r) { return playerRow_(r); });
    return { ok: true, stats: o };
  } },
  online: { perm: 'online', fn: function () {
    var t = now_(), sn = activeSanctions_();
    var list = rows_('players').filter(function (r) { return t - +r[11] < ONLINE_MS; }).sort(function (a, b) { return +b[11] - +a[11]; }).map(function (r) { return playerRow_(r, sn); });
    return { ok: true, players: list, now: t };
  } },
  players_search: { perm: 'players', fn: function (u, r, a) {
    var q = clean_(a.q, 40).toLowerCase(), sn = activeSanctions_();
    var list = rows_('players').filter(function (x) { if (!q) return true; var d = digits_(q); if (d && x[0] === 'tg:' + d) return true; return String(x[2]).toLowerCase().indexOf(q) >= 0 || String(x[1]).toLowerCase().indexOf(q) >= 0; })
      .sort(function (a, b) { return +b[11] - +a[11]; }).slice(0, 30).map(function (x) { return playerRow_(x, sn); });
    return { ok: true, players: list };
  } },
  player_get: { perm: 'players', fn: function (u, r, a) {
    var id = digits_(a.uid), uid = 'tg:' + id; if (!id) return fail_('Некорректный Telegram ID');
    var sn = activeSanctions_(), row = rows_('players').filter(function (x) { return x[0] === uid; })[0];
    var role = roleOf_(id).role;
    var msgs = chatRows_(600).filter(function (m) { return m.uid === uid; }).slice(-10).reverse();
    var log = rows_('audit').filter(function (x) { return x[3] === uid; }).slice(-10).reverse().map(function (x) { return { t: x[0], actor: x[2], action: x[5], reason: x[6] }; });
    return { ok: true, found: !!row, player: row ? playerRow_(row, sn) : { uid: uid, id: id }, role: role, ban: sn.ban[uid] || null, mute: sn.mute[uid] || null, msgs: msgs, log: log };
  } },
  player_rename: { perm: 'players', reason: 1, write: 1, title: function (a) { return 'Принудительно сменить игровое имя игрока ' + clean_(a.uid, 20) + ' на «' + clean_(a.name, 18) + '»'; },
    fn: function (u, r, a) {
      var id = digits_(a.uid), bad = targetOk_(u, r, id); if (bad) return fail_(bad);
      var nm = clean_(a.name, 18); if (nm.length < 2) return fail_('Имя слишком короткое');
      var c = cfg_(); c.forced = c.forced || {}; c.forced['tg:' + id] = nm; saveCfg_(c);
      audit_(u, 'tg:' + id, 'Смена игрового имени', a.reason, 'новое имя: ' + nm); return { ok: true };
    } },
  sanctions_list: { perm: 'bans', fn: function () {
    var sn = activeSanctions_(), out = [];
    ['ban', 'mute'].forEach(function (t) { Object.keys(sn[t]).forEach(function (uid) { var x = sn[t][uid]; out.push({ type: t, uid: uid, id: uid.replace('tg:', ''), name: playerName_(uid), until: x.until, reason: x.reason, by: x.by, at: x.at }); }); });
    out.sort(function (a, b) { return b.at - a.at; }); return { ok: true, list: out };
  } },
  ban: { perm: 'bans', reason: 1, write: 1, title: function (a) { return 'ЗАБЛОКИРОВАТЬ игрока ' + clean_(a.uid, 20) + (+a.hours ? ' на ' + num_(a.hours, 1, 8760) + ' ч.' : ' НАВСЕГДА') + '. Причина: ' + clean_(a.reason, 80); },
    fn: function (u, r, a) {
      var id = digits_(a.uid), bad = targetOk_(u, r, id); if (bad) return fail_(bad);
      var h = +a.hours > 0 ? num_(a.hours, 1, 8760) : 0, until = h ? now_() + h * 3600000 : 0;
      setSanction_(u, 'ban', id, until, a.reason); audit_(u, 'tg:' + id, 'БАН', a.reason, h ? h + ' ч.' : 'навсегда'); return { ok: true };
    } },
  unban: { perm: 'bans', reason: 1, write: 1, fn: function (u, r, a) { var id = digits_(a.uid); if (!id) return fail_('Некорректный Telegram ID'); clearSanction_('ban', id); audit_(u, 'tg:' + id, 'Разбан', a.reason, ''); return { ok: true }; } },
  mute: { perm: 'bans', reason: 1, write: 1, fn: function (u, r, a) {
    var id = digits_(a.uid), bad = targetOk_(u, r, id); if (bad) return fail_(bad);
    var m = num_(a.minutes, 1, 525600), until = now_() + m * 60000;
    setSanction_(u, 'mute', id, until, a.reason); audit_(u, 'tg:' + id, 'МУТ', a.reason, m + ' мин.'); return { ok: true };
  } },
  unmute: { perm: 'bans', reason: 1, write: 1, fn: function (u, r, a) { var id = digits_(a.uid); if (!id) return fail_('Некорректный Telegram ID'); clearSanction_('mute', id); audit_(u, 'tg:' + id, 'Снятие мута', a.reason, ''); return { ok: true }; } },
  chat_recent: { perm: 'chat', fn: function (u, r, a) { return { ok: true, msgs: chatRows_(num_(a.limit || 60, 1, 150)).reverse(), locked: !!cfg_().chatLocked, announce: cfg_().announce || '' }; } },
  chat_delete: { perm: 'chat', reason: 1, write: 1, fn: function (u, r, a) {
    var s = S_('chat'), id = num_(a.id, 0, 1e7); if (id < 2 || id > s.getLastRow()) return fail_('Сообщение не найдено');
    var row = s.getRange(id, 1, 1, 8).getValues()[0]; if (+row[5] === 1) return fail_('Уже удалено');
    s.getRange(id, 6, 1, 3).setValues([[1, u.uid, a.reason]]); audit_(u, String(row[1]), 'Удаление сообщения', a.reason, '«' + clean_(row[4], 120) + '»'); return { ok: true };
  } },
  chat_delete_user: { perm: 'chat', reason: 1, write: 1, title: function (a) { return 'Удалить ВСЕ сообщения игрока ' + clean_(a.uid, 20) + '. Причина: ' + clean_(a.reason, 80); },
    fn: function (u, r, a) {
      var id = digits_(a.uid); if (!id) return fail_('Некорректный Telegram ID');
      var s = S_('chat'), cnt = 0; rows_('chat').forEach(function (x, i) { if (x[0] !== undefined && x[1] === 'tg:' + id && +x[5] !== 1) { s.getRange(i + 2, 6, 1, 3).setValues([[1, u.uid, a.reason]]); cnt++; } });
      audit_(u, 'tg:' + id, 'Удаление всех сообщений', a.reason, 'удалено: ' + cnt); return { ok: true, count: cnt };
    } },
  chat_lock: { perm: 'chat', reason: 1, write: 1, title: function (a) { return a.locked ? 'ЗАКРЫТЬ общий чат для всех игроков' : 'Открыть общий чат'; },
    fn: function (u, r, a) { var c = cfg_(); c.chatLocked = !!a.locked; saveCfg_(c); audit_(u, '', a.locked ? 'Чат закрыт' : 'Чат открыт', a.reason, ''); return { ok: true }; } },
  announce_set: { perm: 'chat', reason: 1, write: 1, fn: function (u, r, a) { var c = cfg_(); c.announce = clean_(a.text, 200); saveCfg_(c); audit_(u, '', 'Объявление', a.reason, c.announce); return { ok: true }; } },
  params_get: { perm: 'params', fn: function () { var c = cfg_(); return { ok: true, params: c.params, defs: PARAMS }; } },
  params_set: { perm: 'params', reason: 1, write: 1, fn: function (u, r, a) {
    var d = PARAMS[a.key]; if (!d) return fail_('Неизвестный параметр');
    var c = cfg_(); c.params = c.params || {};
    if (a.value === null || a.value === '') { delete c.params[a.key]; audit_(u, '', 'Параметр сброшен: ' + a.key, a.reason, ''); }
    else { var v = +a.value; if (isNaN(v) || v < d.min || v > d.max) return fail_('Допустимо от ' + d.min + ' до ' + d.max); c.params[a.key] = v; audit_(u, '', 'Параметр ' + a.key, a.reason, 'значение: ' + v); }
    saveCfg_(c); return { ok: true };
  } },
  params_reset: { perm: 'params', reason: 1, write: 1, title: function () { return 'Сбросить ВСЕ игровые параметры к значениям по умолчанию'; },
    fn: function (u, r, a) { var c = cfg_(); c.params = {}; saveCfg_(c); audit_(u, '', 'Сброс всех параметров', a.reason, ''); return { ok: true }; } },
  audit: { perm: 'audit', fn: function (u, r, a) {
    var q = clean_(a.q, 40).toLowerCase(), list = rows_('audit').filter(function (x) { return !q || x.join(' ').toLowerCase().indexOf(q) >= 0; }).slice(-num_(a.limit || 100, 1, 300)).reverse()
      .map(function (x) { return { t: x[0], actor: x[2], actorId: String(x[1]).replace('tg:', ''), target: String(x[3]).replace('tg:', ''), targetName: x[4], action: x[5], reason: x[6], details: x[7] }; });
    return { ok: true, list: list };
  } },
  /* --- только владелец --- */
  admins_list: { owner: 1, fn: function () { var m = admins_(); return { ok: true, perms: PERMS, list: Object.keys(m).map(function (id) { return { id: id, name: m[id].name, perms: m[id].perms }; }) }; } },
  admin_add: { owner: 1, reason: 1, write: 1, title: function (a) { return 'НАЗНАЧИТЬ администратором игрока ' + clean_(a.uid, 20) + ' с правами: ' + ((a.perms || []).join(', ') || 'нет'); },
    fn: function (u, r, a) {
      var id = digits_(a.uid); if (!id) return fail_('Некорректный Telegram ID');
      if (id === digits_(prop_('OWNER_ID'))) return fail_('Это владелец');
      if (admins_()[id]) return fail_('Уже администратор');
      var perms = (Array.isArray(a.perms) ? a.perms : []).filter(function (p) { return PERMS.indexOf(p) >= 0; });
      S_('admins').appendRow(['tg:' + id, clean_(a.name, 30) || playerName_('tg:' + id) || id, perms.join(','), u.uid, now_()]); CacheService.getScriptCache().remove('adm');
      audit_(u, 'tg:' + id, 'Назначен администратор', a.reason, 'права: ' + perms.join(',')); return { ok: true };
    } },
  admin_perms: { owner: 1, reason: 1, write: 1, title: function (a) { return 'ИЗМЕНИТЬ права администратора ' + clean_(a.uid, 20) + ' на: ' + ((a.perms || []).join(', ') || 'нет'); },
    fn: function (u, r, a) {
      var id = digits_(a.uid), s = S_('admins'), perms = (Array.isArray(a.perms) ? a.perms : []).filter(function (p) { return PERMS.indexOf(p) >= 0; }), ok = false;
      rows_('admins').forEach(function (x, i) { if (x[0] === 'tg:' + id) { s.getRange(i + 2, 3).setValue(perms.join(',')); ok = true; } });
      if (!ok) return fail_('Администратор не найден'); CacheService.getScriptCache().remove('adm');
      audit_(u, 'tg:' + id, 'Изменены права администратора', a.reason, 'права: ' + perms.join(',')); return { ok: true };
    } },
  admin_remove: { owner: 1, reason: 1, write: 1, title: function (a) { return 'СНЯТЬ администратора ' + clean_(a.uid, 20); },
    fn: function (u, r, a) {
      var id = digits_(a.uid), s = S_('admins'), row = 0;
      rows_('admins').forEach(function (x, i) { if (x[0] === 'tg:' + id) row = i + 2; });
      if (!row) return fail_('Администратор не найден'); s.deleteRow(row); CacheService.getScriptCache().remove('adm');
      audit_(u, 'tg:' + id, 'Снят администратор', a.reason, ''); return { ok: true };
    } },
  radio_get: { owner: 1, fn: function () { return { ok: true, radio: cfg_().radio }; } },
  radio_set: { owner: 1, reason: 1, write: 1, title: function (a) { return 'ИЗМЕНИТЬ радиопотоки и настройки радиостанции для ВСЕХ игроков'; },
    fn: function (u, r, a) {
      var c = cfg_(); c.radio = { on: a.on !== false, stations: stationsClean_(a.stations) }; saveCfg_(c);
      audit_(u, '', 'Радио: настройки', a.reason, c.radio.stations.map(function (s) { return s.id + '=' + (s.url ? 'поток задан' : 'пусто') + (s.on ? '' : ' (выкл)'); }).join('; ') + (c.radio.on ? '' : '; радио ВЫКЛ')); return { ok: true };
    } }
};
