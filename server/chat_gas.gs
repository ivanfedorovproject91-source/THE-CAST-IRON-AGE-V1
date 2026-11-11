/**
 * Общий чат игроков «Чугунного века» — отдельное веб-приложение Google Apps Script.
 * Установка (5 минут):
 * 1) Создайте новую Google Таблицу, назовите её «Чугунный век — чат».
 * 2) Меню «Расширения → Apps Script», вставьте весь этот код, сохраните.
 * 3) «Развернуть → Новое развёртывание → Веб-приложение»: выполнять от своего имени, доступ — «Все».
 * 4) Скопируйте URL веб-приложения и вставьте в js/config.js → CHAT_URL: '...'
 * Сообщения хранятся на листе «chat» навсегда.
 */
var SHEET = 'chat';
function sh_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), s = ss.getSheetByName(SHEET);
  if (!s) { s = ss.insertSheet(SHEET); s.appendRow(['t', 'uid', 'name', 'job', 'text']); }
  return s;
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'chat_list') {
    var s = sh_(), n = s.getLastRow(), lim = Math.min(100, Math.max(1, +p.limit || 60));
    if (n < 2) return out_({ ok: true, msgs: [] });
    var from = Math.max(2, n - lim + 1), rows = s.getRange(from, 1, n - from + 1, 5).getValues();
    return out_({ ok: true, msgs: rows.map(function (r) { return { t: r[0], uid: r[1], name: r[2], job: r[3], text: r[4] }; }) });
  }
  return out_({ ok: false, error: 'unknown action' });
}
function doPost(e) {
  var b; try { b = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad json' }); }
  if (b.action !== 'chat_post') return out_({ ok: false, error: 'unknown action' });
  var text = String(b.text || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (text.length < 2) return out_({ ok: false, error: 'empty' });
  var uid = String(b.uid || '').slice(0, 40), cache = CacheService.getScriptCache();
  if (cache.get('c_' + uid)) return out_({ ok: false, error: 'слишком часто' });
  cache.put('c_' + uid, '1', 6);
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { sh_().appendRow([Date.now(), uid, String(b.name || '?').slice(0, 30), String(b.job || '').slice(0, 40), text]); } finally { lock.releaseLock(); }
  return out_({ ok: true });
}
