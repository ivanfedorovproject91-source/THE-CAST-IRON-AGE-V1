/**
 * Общий рейтинг «Чугунного века» на Google Таблице (бесплатно). Версия 2: три рейтинга.
 *   1) Личный (очки жизни, сезон, богатство, зарплата, карьера, смены)
 *   2) Предприятия (прибыль, выпуск, штат, качество)
 *   3) Бригады (до 10 человек, еженедельное соревнование)
 *
 * Вставьте этот код в Apps Script, привязанный к таблице (Расширения → Apps Script),
 * затем: Начать развёртывание → Управление развёртываниями → карандаш → Новая версия → Развернуть.
 * URL веб-приложения при этом не меняется.
 *
 * Свойства скрипта (необязательно): BOT_TOKEN, REQUIRE_TELEGRAM=1 (подробности — в инструкции).
 * Для игроков ВКонтакте: VK_SECRET (защищённый ключ приложения VK) и VK_APP_ID (ID приложения). REQUIRE_TELEGRAM=1 требует
 * подписанную личность — Telegram или VK, — безымянных веб-игроков тогда не принимаем.
 * Для управления рейтингом из игры (Админ-кабинет → «Рейтинг») нужны оба свойства: BOT_TOKEN и OWNER_ID (ваш Telegram ID).
 * Управлять рейтингом может только владелец: подпись Telegram проверяется здесь, поле «владелец» от клиента игнорируется.
 */
const SHEET_NAME = 'Players', BRIG_SHEET = 'Brigades', MAX_BRIG = 10;
const HEAD = ['id', 'name', 'oj', 'shifts', 'rank', 'days', 'money', 'job', 'end', 'hidden', 'updated', 'version', 'season', 'seasonBest', 'source', 'pay', 'profit', 'made', 'staff', 'quality', 'shop', 'week', 'wkPts', 'brigade', 'blocked'];
const COL = {}; HEAD.forEach((h, i) => { COL[h] = i; });
const PERSON = { oj: 'oj', season: 'seasonBest', shifts: 'shifts', rank: 'rank', money: 'money', pay: 'pay' };
const COMPANY = { profit: 'profit', made: 'made', staff: 'staff', quality: 'quality' };

// Ответ. Для запросов чтения с параметром callback (запасной путь из мобильных оболочек через <script>) — обёртка JSONP.
var CALLBACK_ = '';
function out_(o) {
  var json = JSON.stringify(o);
  if (CALLBACK_) return ContentService.createTextOutput(CALLBACK_ + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
function setCallback_(q) { var c = String((q && q.callback) || ''); CALLBACK_ = /^[A-Za-z_][\w]{0,60}$/.test(c) ? c : ''; }
function props_() { return PropertiesService.getScriptProperties(); }
function seasonNow_() { return Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM'); }
function weekNow_() {
  const d = new Date(), t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), dn = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dn); const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return y + '-W' + ('0' + w).slice(-2);
}
function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(SHEET_NAME); sh.appendRow(HEAD); sh.setFrozenRows(1); }
  else { const h = sh.getRange(1, 1, 1, HEAD.length).getValues()[0]; if (String(h[HEAD.length - 1]) !== HEAD[HEAD.length - 1]) sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]); }
  return sh;
}
function brigSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(BRIG_SHEET);
  if (!sh) { sh = ss.insertSheet(BRIG_SHEET); sh.appendRow(['name', 'owner', 'created']); sh.setFrozenRows(1); }
  return sh;
}
function isBlocked_(r) { const v = r[COL.blocked]; return v === true || String(v).toLowerCase() === 'true'; }
function allRows_() { const sh = sheet_(), n = sh.getLastRow(); return n > 1 ? sh.getRange(2, 1, n - 1, HEAD.length).getValues() : []; }

function doGet(e) {
  const q = (e && e.parameter) || {};
  setCallback_(q); // JSONP: только для doGet; POST всегда обычный JSON
  try {
    if (q.action === 'top') return out_(top_(q));
    return out_({ ok: true, service: 'chugunny-vek-rating', version: 2, season: seasonNow_(), week: weekNow_() });
  } catch (err) { return out_({ ok: false, error: String(err && err.message || err) }); }
}
function doPost(e) {
  CALLBACK_ = ''; // POST всегда отдаёт обычный JSON
  try {
    const p = JSON.parse(e.postData.contents);
    if (p.action === 'score') return out_(save_(p));
    if (p.action === 'brigade_create' || p.action === 'brigade_join' || p.action === 'brigade_leave') return out_(brigade_(p));
    if (/^admin_/.test(String(p.action))) return out_(admin_(p));
    return out_({ ok: false, error: 'bad action' });
  } catch (err) { return out_({ ok: false, error: String(err && err.message || err) }); }
}

// ---------- Подлинность игрока
function hex_(bytes) { return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join(''); }
function verifyTelegram_(initData, token, maxAge) {
  const parts = String(initData).split('&'), kv = {}; let hash = '';
  parts.forEach(s => { const i = s.indexOf('='); if (i < 0) return; const k = s.slice(0, i), v = decodeURIComponent(s.slice(i + 1).replace(/\+/g, ' ')); if (k === 'hash') hash = v; else kv[k] = v; });
  if (!hash) return null;
  const check = Object.keys(kv).sort().map(k => k + '=' + kv[k]).join('\n');
  // Apps Script принимает пары (строка, строка) или (байты, байты); смешивать нельзя — всё переводим в байты.
  const b = x => Utilities.newBlob(String(x)).getBytes();
  const secret = Utilities.computeHmacSha256Signature(b(token), b('WebAppData'));
  if (hex_(Utilities.computeHmacSha256Signature(b(check), secret)) !== hash) return null;
  if (kv.auth_date && (Date.now() / 1000 - Number(kv.auth_date)) > (maxAge || 7 * 86400)) return null;
  try { return JSON.parse(kv.user); } catch (e) { return null; }
}
// Подпись параметров запуска VK Mini Apps: vk_* по алфавиту → «k=v&…» → HMAC-SHA256 защищённым ключом → base64url без «=» (поле sign).
function verifyVk_(initData, secret, appId, maxAge) {
  const raw = String(initData || '').replace(/^vk:/, '').replace(/^\?/, ''), o = {}, orig = {};
  raw.split('&').forEach(s => { const i = s.indexOf('='); if (i < 0) return; try { const k = decodeURIComponent(s.slice(0, i).replace(/\+/g, ' ')); o[k] = decodeURIComponent(s.slice(i + 1).replace(/\+/g, ' ')); orig[k] = s; } catch (e) {} });
  if (!o.sign || !secret) return null;
  const keys = Object.keys(o).filter(k => k.indexOf('vk_') === 0).sort(); if (!keys.length) return null;
  const b = x => Utilities.newBlob(String(x)).getBytes(), key = b(secret);
  const sign = str => Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(b(str), key)).replace(/=+$/, '');
  const eq = (x, y) => { if (x.length !== y.length) return false; let d = 0; for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i); return d === 0; };
  const got = String(o.sign);
  if (!eq(sign(keys.map(k => k + '=' + encodeURIComponent(o[k])).join('&')), got) && !eq(sign(keys.map(k => orig[k]).join('&')), got)) return null;
  if (appId && o.vk_app_id !== String(appId)) return null;
  const ts = Number(o.vk_ts) || 0, now = Date.now() / 1000;
  if (!ts || now - ts > (maxAge || 7 * 86400) || ts > now + 300) return null;
  if (!/^\d{1,15}$/.test(String(o.vk_user_id || '')) || o.vk_user_id === '0') return null;
  return { id: o.vk_user_id };
}
function identity_(p) {
  const token = props_().getProperty('BOT_TOKEN'), strict = props_().getProperty('REQUIRE_TELEGRAM') === '1', vkSecret = props_().getProperty('VK_SECRET');
  if (String(p.initData || '').indexOf('vk:') === 0 && !vkSecret) throw new Error('VK_SECRET не задан в свойствах скрипта рейтинга');
  if (String(p.initData || '').indexOf('vk:') === 0 && vkSecret) { const u = verifyVk_(p.initData, vkSecret, props_().getProperty('VK_APP_ID')); if (u && u.id) return { id: 'vk:' + u.id, src: 'vk' }; throw new Error('bad vk signature'); }
  if (p.initData && token && String(p.initData).indexOf('vk:') !== 0) { const u = verifyTelegram_(p.initData, token); if (u && u.id) return { id: 'tg:' + u.id, src: 'tg' }; throw new Error('bad telegram signature'); }
  if (strict) throw new Error('telegram required');
  const dev = String(p.dev || '').replace(/[^\w-]/g, '').slice(0, 40);
  if (!dev) throw new Error('no id');
  return { id: 'dev:' + dev, src: 'web' };
}
const int_ = (v, a, b) => Math.max(a, Math.min(b, Math.round(Number(v) || 0)));
function clean_(v, n, def) { const s = String(v || '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, n); return s || def || ''; }

// ---------- Итоги прошедшей недели (бригады)
function brigAgg_(rows, week) {
  const m = {};
  rows.forEach(r => { const b = r[COL.brigade]; if (!b) return; const o = m[b] = m[b] || { name: b, members: 0, pts: 0, oj: 0 }; o.members++; o.oj += Number(r[COL.oj]) || 0; if (r[COL.week] === week) o.pts += Number(r[COL.wkPts]) || 0; });
  return Object.keys(m).map(k => m[k]).sort((a, b) => b.pts - a.pts || b.oj - a.oj);
}
function rollWeek_() {
  const pr = props_(), now = weekNow_(), cur = pr.getProperty('curWeek');
  if (cur === now) return;
  if (cur) { const top = brigAgg_(allRows_(), cur).filter(b => b.pts > 0).slice(0, 3).map(b => ({ name: b.name, pts: b.pts })); pr.setProperty('lastWeek', JSON.stringify({ week: cur, top: top })); }
  pr.setProperty('curWeek', now);
}

// ---------- Запись результата игрока
// Игрок раньше писался под ключом dev:<устройство>. Если он теперь пришёл с подписью Telegram и прислал тот же dev — переносим его запись и бригадирство.
function adoptDev_(ids, tgId, dev) {
  const dv = 'dev:' + String(dev || '').replace(/[^\w-]/g, '').slice(0, 40); if (dv === 'dev:') return -1;
  const di = ids.indexOf(dv); if (di < 0) return -1;
  const bs = brigSheet_(), bl = bs.getLastRow();
  if (bl > 1) { const own = bs.getRange(2, 2, bl - 1, 1).getValues(); own.forEach((r, i) => { if (r[0] === dv) bs.getRange(i + 2, 2).setValue(tgId); }); }
  return di;
}
function save_(p) {
  const who = identity_(p), cache = CacheService.getScriptCache();
  if (cache.get('rl:' + who.id)) return { ok: true, throttled: true };
  const oj = int_(p.oj, -1000, 40000), shifts = int_(p.shifts, 0, 5000), rank = int_(p.rank, 0, 10), days = int_(p.days, 0, 20000);
  if (shifts > days + 3) throw new Error('implausible');
  const sbIn = int_(p.seasonBest, 0, 100000), season = /^\d{4}-\d{2}$/.test(p.season || '') ? p.season : seasonNow_();
  const week = /^\d{4}-W\d{2}$/.test(p.week || '') ? p.week : weekNow_(), wk = int_(p.wkPts, 0, 200000);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    rollWeek_();
    const sh = sheet_(), last = sh.getLastRow(), ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => r[0]) : [];
    let idx = ids.indexOf(who.id);
    if (idx < 0 && (who.src === 'tg' || who.src === 'vk')) idx = adoptDev_(ids, who.id, p.dev); // после включения BOT_TOKEN запись игрока переезжает с dev:… на tg:…, без дублей
    const row = idx >= 0 ? sh.getRange(idx + 2, 1, 1, HEAD.length).getValues()[0] : new Array(HEAD.length).fill('');
    const old = { oj: Number(row[COL.oj]) || -1000, shifts: Number(row[COL.shifts]) || 0, rank: Number(row[COL.rank]) || 0, season: row[COL.season], sb: Number(row[COL.seasonBest]) || 0, week: row[COL.week], wk: Number(row[COL.wkPts]) || 0 };
    const sb = old.season === season ? Math.max(old.sb, sbIn) : sbIn, wkPts = old.week === week ? Math.max(old.wk, wk) : wk;
    const nr = [who.id, clean_(p.name, 24, 'Заводчанин'), Math.max(old.oj, oj), Math.max(old.shifts, shifts), Math.max(old.rank, rank), days, int_(p.money, -1e9, 1e9), clean_(p.job, 40), p.end ? clean_(p.end, 24) : '', p.hidden === true, new Date().toISOString(), clean_(p.v, 12), season, sb, who.src,
      int_(p.pay, 0, 1e7), int_(p.profit, -1e9, 1e9), int_(p.made, 0, 1e7), int_(p.staff, 0, 12), int_(p.quality, 0, 100), clean_(p.shop, 40), week, wkPts, row[COL.brigade] || '', row[COL.blocked] === true ? true : ''];
    if (idx >= 0) sh.getRange(idx + 2, 1, 1, HEAD.length).setValues([nr]); else sh.appendRow(nr);
    cache.put('rl:' + who.id, '1', 15);
  } finally { lock.releaseLock(); }
  return { ok: true };
}

// ---------- Бригады: создание, вступление, выход
function brigade_(p) {
  const who = identity_(p), cache = CacheService.getScriptCache();
  if (cache.get('br:' + who.id)) return { ok: false, error: 'Слишком часто. Подожди пару секунд.' };
  cache.put('br:' + who.id, '1', 3);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    rollWeek_();
    const sh = sheet_(), last = sh.getLastRow(), ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => r[0]) : [], idx = ids.indexOf(who.id);
    if (idx < 0) return { ok: false, error: 'Сначала доиграй смену — тебя ещё нет в таблице.' };
    const rows = allRows_(), cur = String(rows[idx][COL.brigade] || ''), bs = brigSheet_(), bl = bs.getLastRow(), brs = bl > 1 ? bs.getRange(2, 1, bl - 1, 3).getValues() : [];
    const setB = v => sh.getRange(idx + 2, COL.brigade + 1).setValue(v);
    const findB = n => brs.findIndex(b => String(b[0]).toLowerCase() === String(n).toLowerCase());
    if (p.action === 'brigade_create') {
      if (cur) return { ok: false, error: 'Ты уже в бригаде «' + cur + '». Сначала выйди из неё.' };
      const name = clean_(p.name, 20).replace(/[^A-Za-zА-Яа-яЁё0-9 \-]/g, '').trim();
      if (name.length < 3) return { ok: false, error: 'Название бригады: от 3 до 20 символов (буквы, цифры, пробел).' };
      if (findB(name) >= 0) return { ok: false, error: 'Бригада с таким названием уже есть.' };
      bs.appendRow([name, who.id, new Date().toISOString()]); setB(name); return { ok: true, name: name };
    }
    if (p.action === 'brigade_join') {
      if (cur) return { ok: false, error: 'Ты уже в бригаде «' + cur + '».' };
      const bi = findB(p.name); if (bi < 0) return { ok: false, error: 'Такой бригады нет.' };
      const name = brs[bi][0], count = rows.filter(r => r[COL.brigade] === name).length;
      if (count >= MAX_BRIG) return { ok: false, error: 'Бригада полна (максимум ' + MAX_BRIG + ').' };
      setB(name); return { ok: true, name: name };
    }
    // leave
    if (!cur) return { ok: false, error: 'Ты не в бригаде.' };
    setB('');
    const bi = findB(cur);
    if (bi >= 0) {
      const rest = rows.map((r, i) => ({ r: r, i: i })).filter(x => x.r[COL.brigade] === cur && x.i !== idx);
      if (!rest.length) bs.deleteRow(bi + 2);
      else if (brs[bi][1] === who.id) { rest.sort((a, b) => (Number(b.r[COL.wkPts]) || 0) - (Number(a.r[COL.wkPts]) || 0)); bs.getRange(bi + 2, 2).setValue(rest[0].r[COL.id]); }
    }
    return { ok: true };
  } finally { lock.releaseLock(); }
}

// ---------- Таблицы лидеров
function top_(q) {
  const by = String(q.by || 'oj'), limit = int_(q.limit || 50, 1, 100), uid = String(q.uid || '');
  rollWeek_();
  const rows = allRows_().filter(r => !isBlocked_(r)), vis = rows.filter(r => r[COL.hidden] !== true && String(r[COL.hidden]).toLowerCase() !== 'true');
  const num = (r, k) => Number(r[COL[k]]) || 0;
  const person = (r, i) => ({ pos: i + 1, name: r[COL.name], job: r[COL.job], shifts: num(r, 'shifts'), rank: num(r, 'rank'), oj: num(r, 'oj'), sb: num(r, 'seasonBest'), money: num(r, 'money'), pay: num(r, 'pay'), shop: r[COL.shop] || '', profit: num(r, 'profit'), made: num(r, 'made'), staff: num(r, 'staff'), quality: num(r, 'quality'), brigade: r[COL.brigade] || '', end: r[COL.end] || null, me: r[COL.id] === uid,
    // uid отдаём только для игроков из Telegram и ВКонтакте (по нему игра отмечает премиум). Технические ID устройств (dev:…) — это «пароль» веб-игрока, их не раскрываем.
    uid: /^(tg|vk):/.test(String(r[COL.id])) ? r[COL.id] : '' });
  if (by === 'brig') {
    const wk = weekNow_(), agg = brigAgg_(rows, wk), mine = rows.find(r => r[COL.id] === uid), myName = mine ? String(mine[COL.brigade] || '') : '';
    const bs = brigSheet_(), bl = bs.getLastRow(), brs = bl > 1 ? bs.getRange(2, 1, bl - 1, 3).getValues() : [];
    const mi = myName ? agg.findIndex(b => b.name === myName) : -1;
    let my = null;
    if (myName) {
      const brRow = brs.find(b => b[0] === myName), mem = rows.filter(r => r[COL.brigade] === myName).map(r => ({ name: r[COL.name], pts: r[COL.week] === wk ? num(r, 'wkPts') : 0, oj: num(r, 'oj'), me: r[COL.id] === uid })).sort((a, b) => b.pts - a.pts);
      my = { name: myName, owner: !!(brRow && brRow[1] === uid), members: mem, pts: mem.reduce((a, m) => a + m.pts, 0), pos: mi + 1 };
    }
    let last = null; try { last = JSON.parse(props_().getProperty('lastWeek') || 'null'); } catch (e) {}
    return { ok: true, week: wk, total: agg.length, max: MAX_BRIG, my: my, last: last, rows: agg.slice(0, limit).map((b, i) => ({ pos: i + 1, name: b.name, members: b.members, pts: b.pts, oj: b.oj, me: b.name === myName })) };
  }
  const cur = seasonNow_(); let list;
  if (PERSON[by]) {
    list = vis.slice(); const key = PERSON[by];
    if (by === 'season') list = list.filter(r => r[COL.season] === cur && num(r, 'seasonBest') > 0);
    list.sort((a, b) => num(b, key) - num(a, key) || num(b, 'oj') - num(a, 'oj') || num(b, 'shifts') - num(a, 'shifts'));
  } else if (COMPANY[by]) {
    list = vis.filter(r => num(r, 'staff') > 0); const key = COMPANY[by];
    list.sort((a, b) => num(b, key) - num(a, key) || num(b, 'profit') - num(a, 'profit'));
  } else throw new Error('bad by');
  const dev = String(q.dev || '').replace(/[^\w-]/g, '').slice(0, 40);
  let mi = list.findIndex(r => r[COL.id] === uid);
  if (mi < 0 && dev) mi = list.findIndex(r => r[COL.id] === 'dev:' + dev); // запись, сделанная до того, как подпись стала проверяться
  return { ok: true, total: list.length, season: cur, me: mi >= 0 ? person(list[mi], mi) : null, rows: list.slice(0, limit).map(person) };
}

// ---------- Управление рейтингом (только владелец)
function owner_(p) {
  const token = props_().getProperty('BOT_TOKEN'), owner = String(props_().getProperty('OWNER_ID') || '').trim();
  if (!token || !owner) throw new Error('В свойствах скрипта рейтинга нужно задать BOT_TOKEN и OWNER_ID');
  const u = p.initData ? verifyTelegram_(p.initData, token, 86400) : null;
  if (!u || !u.id) throw new Error('auth');
  if (String(u.id) !== owner) throw new Error('forbidden');
  return { id: 'tg:' + u.id, name: clean_((u.first_name || '') + ' ' + (u.last_name || ''), 40, String(u.id)) };
}
function adminLog_(u, action, row, note) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('AdminLog');
  if (!sh) { sh = ss.insertSheet('AdminLog'); sh.appendRow(['time', 'actor', 'action', 'id', 'name', 'note']); sh.setFrozenRows(1); }
  sh.appendRow([new Date().toISOString(), u.id, action, row[COL.id], row[COL.name], clean_(note, 120)]);
}
function admin_(p) {
  const u = owner_(p), lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = sheet_(), rows = allRows_(), act = String(p.action);
    if (act === 'admin_list') {
      const q = clean_(p.q, 40).toLowerCase();
      const list = rows.filter(r => !q || [r[COL.id], r[COL.name], r[COL.job]].join(' ').toLowerCase().indexOf(q) >= 0)
        .sort((a, b) => (isBlocked_(a) - isBlocked_(b)) || (Number(b[COL.oj]) || 0) - (Number(a[COL.oj]) || 0)).slice(0, 40)
        .map(r => ({ id: r[COL.id], name: r[COL.name], job: r[COL.job], oj: Number(r[COL.oj]) || 0, shifts: Number(r[COL.shifts]) || 0, days: Number(r[COL.days]) || 0, updated: r[COL.updated], src: r[COL.source], brigade: r[COL.brigade] || '', blocked: isBlocked_(r) }));
      return { ok: true, total: rows.length, blockedTotal: rows.filter(isBlocked_).length, list: list };
    }
    const id = String(p.id || ''), idx = rows.findIndex(r => String(r[COL.id]) === id);
    if (idx < 0) return { ok: false, error: 'Игрок не найден' };
    const row = rows[idx], note = clean_(p.note, 120);
    if (act === 'admin_block') { // скрыть/вернуть: строка остаётся, игрок продолжает играть, но в таблицах его нет и новая отправка результата его не вернёт
      const on = p.blocked === true;
      sh.getRange(idx + 2, COL.blocked + 1).setValue(on ? true : '');
      adminLog_(u, on ? 'Скрыт из рейтинга' : 'Возвращён в рейтинг', row, note); return { ok: true, blocked: on };
    }
    if (act === 'admin_delete') { // удалить запись целиком (игрок появится снова, если заново отправит результат; чтобы не появлялся — «Скрыть»)
      const cur = String(row[COL.brigade] || '');
      if (cur) { // как при выходе из бригады: пустая бригада удаляется, бригадир передаётся
        const bs = brigSheet_(), bl = bs.getLastRow(), brs = bl > 1 ? bs.getRange(2, 1, bl - 1, 3).getValues() : [], bi = brs.findIndex(b => String(b[0]) === cur);
        if (bi >= 0) {
          const rest = rows.map((r, i) => ({ r: r, i: i })).filter(x => x.r[COL.brigade] === cur && x.i !== idx);
          if (!rest.length) bs.deleteRow(bi + 2);
          else if (String(brs[bi][1]) === id) { rest.sort((a, b) => (Number(b.r[COL.wkPts]) || 0) - (Number(a.r[COL.wkPts]) || 0)); bs.getRange(bi + 2, 2).setValue(rest[0].r[COL.id]); }
        }
      }
      sh.deleteRow(idx + 2); adminLog_(u, 'Запись удалена', row, note); return { ok: true };
    }
    return { ok: false, error: 'bad admin action' };
  } finally { lock.releaseLock(); }
}
