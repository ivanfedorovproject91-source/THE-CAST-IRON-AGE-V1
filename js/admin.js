/* ===== Админ-кабинет «Чугунного века» =====
   Интерфейс — только оболочка. Каждое действие проверяется на сервере по подписи Telegram:
   если роли нет на сервере, любой вызов вернёт «forbidden», сколько ни показывай кнопки. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const A = (G.admin = { root: null, tab: '', me: null, state: {} });
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const dt = t => { if (!t) return '—'; const d = new Date(+t), p = n => ('0' + n).slice(-2); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + String(d.getFullYear()).slice(2) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'только что' : m < 60 ? m + ' мин. назад' : m < 1440 ? Math.round(m / 60) + ' ч. назад' : Math.round(m / 1440) + ' дн. назад'; };
  const TABS = [['stats', '📊', 'Статистика', 'stats'], ['online', '🟢', 'Онлайн', 'online'], ['players', '👤', 'Игроки', 'players'], ['sanctions', '🚫', 'Баны и муты', 'bans'], ['chat', '💬', 'Чат', 'chat'], ['params', '⚙️', 'Параметры', 'params'], ['audit', '📜', 'Журнал', 'audit'], ['admins', '🛡', 'Админы', 'owner'], ['radio', '📻', 'Радио', 'owner']];
  const PERM_RU = { players: 'Игроки', bans: 'Баны/муты', chat: 'Чат', params: 'Параметры', online: 'Онлайн', stats: 'Статистика', audit: 'Журнал' };
  // Уведомления внутри кабинета (игровые тосты лежат под ним и не видны)
  function say(text, bad) {
    if (!A.root) return;
    const d = document.createElement('div'); d.className = 'adm-toast' + (bad ? ' bad' : ''); d.textContent = text; A.root.appendChild(d);
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 4200);
  }
  const can = p => A.me && (p === 'owner' ? A.me.role === 'owner' : A.me.perms.indexOf(p) >= 0);

  // ---- вызов сервера (с автоматическим подтверждением опасных операций)
  async function call(op, args) {
    let r;
    try { r = await G.srv.post({ action: 'admin', op: op, args: args || {} }); } catch (e) { return { ok: false, error: 'нет связи с сервером' }; }
    if (r && r.needConfirm) {
      const yes = await dialog({ title: '⚠ Подтвердите опасное действие', text: r.summary, danger: true, ok: 'Подтверждаю' });
      if (!yes) return { ok: false, cancelled: true };
      try { r = await G.srv.post({ action: 'admin', op: op, args: args || {}, confirm: r.token }); } catch (e) { return { ok: false, error: 'нет связи с сервером' }; }
    }
    return r || { ok: false, error: 'пустой ответ' };
  }
  // ---- простое диалоговое окно поверх кабинета: fields → объект значений, либо null
  function dialog(o) {
    return new Promise(res => {
      const ov = document.createElement('div'); ov.className = 'adm-dlg';
      ov.innerHTML = '<div class="adm-dbox ' + (o.danger ? 'danger' : '') + '"><h3>' + esc(o.title) + '</h3>' + (o.text ? '<p>' + esc(o.text) + '</p>' : '')
        + (o.fields || []).map((f, i) => '<label>' + esc(f.label) + (f.type === 'select' ? '<select data-f="' + i + '">' + f.options.map(x => '<option value="' + esc(x[0]) + '">' + esc(x[1]) + '</option>').join('') + '</select>'
          : '<input data-f="' + i + '" type="' + (f.type || 'text') + '" value="' + esc(f.value || '') + '" placeholder="' + esc(f.ph || '') + '" maxlength="' + (f.max || 200) + '">') + '</label>').join('')
        + '<div class="adm-btns"><button class="btn" data-x="0">Отмена</button><button class="btn ' + (o.danger ? 'red' : 'hazard') + '" data-x="1">' + esc(o.ok || 'Ок') + '</button></div></div>';
      ov.onclick = e => {
        const x = e.target.closest('[data-x]'); if (!x) return;
        if (x.dataset.x === '0') { ov.remove(); return res(o.fields ? null : false); }
        const vals = {}; (o.fields || []).forEach((f, i) => { vals[f.id] = ov.querySelector('[data-f="' + i + '"]').value.trim(); });
        for (const f of o.fields || []) if (f.req && !vals[f.id]) { say('Заполните поле: ' + f.label, true); return; }
        ov.remove(); res(o.fields ? vals : true);
      };
      (A.root || document.getElementById('app')).appendChild(ov);
    });
  }
  const reasonF = { id: 'reason', label: 'Причина (обязательно, от 3 знаков)', req: 1, max: 200 };
  const notify = (r, okText) => { if (r.cancelled) return false; say(r.ok ? '✔ ' + (okText || 'Готово') : '⛔ ' + (r.error === 'forbidden' ? 'Нет прав' : r.error || 'ошибка'), !r.ok); return !!r.ok; };

  // ---- каркас
  A.open = async function () {
    if (!G.srv || G.srv.role !== 'owner') { G.toast && G.toast('⛔ Админ-кабинет доступен только владельцу игры.', 'warn'); return; }
    if (!G.srv || !G.srv.available()) { G.toast && G.toast('Админ-кабинет работает только из Telegram.'); return; }
    if (!A.root) { A.root = document.createElement('div'); A.root.className = 'adm-root'; document.getElementById('app').appendChild(A.root); A.root.addEventListener('click', onClick); }
    A.root.innerHTML = '<div class="adm-top"><b>🛡 Админ-кабинет</b><button class="btn" data-a="close">✕</button></div><div class="adm-body"><div class="note" style="padding:14px">Проверка полномочий на сервере…</div></div>';
    A.root.classList.add('on');
    const r = await G.srv.post({ action: 'admin', op: 'me', args: {} }).catch(() => null);
    if (!r || !r.ok) { A.root.querySelector('.adm-body').innerHTML = '<div class="card">⛔ ' + (r && r.error === 'forbidden' ? 'Доступ запрещён.' : 'Не удалось подтвердить полномочия (' + esc(r && r.error || 'нет связи') + ').') + '</div>'; return; }
    A.me = r; A.tab = (TABS.find(t => can(t[3])) || [])[0] || ''; A.render();
  };
  A.close = function () { if (A.root) { A.root.classList.remove('on'); A.root.innerHTML = ''; } A.me = null; };
  A.render = function () {
    const tabs = TABS.filter(t => can(t[3]));
    A.root.innerHTML = '<div class="adm-top"><b>🛡 ' + (A.me.role === 'owner' ? 'Владелец' : 'Администратор') + ' · ' + esc(A.me.name) + '</b><button class="btn" data-a="close">✕</button></div>'
      + '<div class="adm-tabs">' + tabs.map(t => '<button class="' + (A.tab === t[0] ? 'on' : '') + '" data-a="tab" data-t="' + t[0] + '">' + t[1] + ' ' + t[2] + '</button>').join('') + '</div><div class="adm-body" id="admBody"><div class="note" style="padding:14px">Загрузка…</div></div>';
    if (A.tab) V[A.tab]();
  };
  const body = h => { const b = document.getElementById('admBody'); if (b) b.innerHTML = h; };
  const err = r => '<div class="card">⛔ ' + esc(r.error === 'forbidden' ? 'Нет прав на этот раздел' : r.error || 'ошибка') + '</div>';
  const refresh = () => V[A.tab] && V[A.tab]();

  function playerLine(p) {
    return '<button class="adm-row" data-a="player" data-id="' + esc(p.id) + '"><b>' + esc(p.name || p.tg || p.id) + '</b>' + (p.banned ? ' <span class="adm-tag r">БАН</span>' : '') + (p.muted ? ' <span class="adm-tag y">МУТ</span>' : '')
      + '<small>ID ' + esc(p.id) + ' · ' + esc(p.job || '—') + ' · ' + (p.shifts || 0) + ' смен · ' + fmt(p.oj) + ' оч. · ' + (p.last ? ago(p.last) : '—') + '</small></button>';
  }
  // ---- разделы
  const V = {
    async stats() {
      const r = await call('stats'); if (!r.ok) return body(err(r)); const s = r.stats;
      const max = Math.max.apply(null, s.chatByDay.concat([1]));
      body('<div class="adm-grid">' + [['Онлайн сейчас', s.online], ['Активны за 24 ч', s.dau], ['Активны за 7 дн.', s.wau], ['Новых за 24 ч', s.new24], ['Новых за 7 дн.', s.new7], ['Всего игроков', s.total], ['Баны', s.banned], ['Муты', s.muted]].map(x => '<div class="adm-st"><em>' + fmt(x[1]) + '</em><small>' + x[0] + '</small></div>').join('') + '</div>'
        + '<div class="card"><h3>Сообщения в чате за 7 дней</h3><div class="adm-bars">' + s.chatByDay.map((v, i) => '<div><i style="height:' + Math.round(v / max * 60 + 2) + 'px"></i><b>' + v + '</b><small>' + (i === 6 ? 'сегодня' : '−' + (6 - i)) + '</small></div>').join('') + '</div></div>'
        + '<div class="card"><h3>Лидеры по очкам жизни</h3>' + s.top.map(playerLine).join('') + '</div>');
    },
    async online() {
      const r = await call('online'); if (!r.ok) return body(err(r));
      body('<div class="card"><h3>Онлайн: ' + r.players.length + '</h3><div class="note">Игрок считается онлайн, если сообщал о себе за последние 6 минут.</div></div>' + (r.players.map(playerLine).join('') || '<div class="card note">Никого нет.</div>') + '<div class="btns"><button class="btn" data-a="refresh">↻ Обновить</button></div>');
    },
    async players() {
      const q = A.state.q || '', r = await call('players_search', { q: q }); if (!r.ok) return body(err(r));
      body('<div class="adm-find"><input id="admQ" type="text" maxlength="40" placeholder="Telegram ID или игровое имя" value="' + esc(q) + '"><button class="btn hazard" data-a="find">🔍</button></div>' + (r.players.map(playerLine).join('') || '<div class="card note">Никого не найдено. Игрок появляется в списке после первого входа с этой версии игры.</div>'));
      const i = document.getElementById('admQ'); if (i) i.onkeydown = e => { if (e.key === 'Enter') onClick({ target: document.querySelector('[data-a=find]') }); };
    },
    async sanctions() {
      const r = await call('sanctions_list'); if (!r.ok) return body(err(r));
      body('<div class="card"><h3>Действующие санкции</h3></div>' + (r.list.map(x => '<div class="card adm-san"><b>' + (x.type === 'ban' ? '⛔ БАН' : '🔇 МУТ') + ' · ' + esc(x.name || x.id) + '</b><small>ID ' + esc(x.id) + ' · ' + (x.until ? 'до ' + dt(x.until) : 'бессрочно') + ' · выдал ' + esc(x.by) + ' ' + dt(x.at) + '</small><div class="note">Причина: ' + esc(x.reason) + '</div><button class="btn" data-a="un" data-t="' + x.type + '" data-id="' + esc(x.id) + '">Снять</button></div>').join('') || '<div class="card note">Активных санкций нет.</div>')
        + '<div class="btns"><button class="btn red" data-a="banid">⛔ Бан по Telegram ID</button></div>');
    },
    async chat() {
      const r = await call('chat_recent', { limit: 60 }); if (!r.ok) return body(err(r));
      body('<div class="card"><h3>Модерация чата</h3><div class="note">Чат: <b>' + (r.locked ? 'ЗАКРЫТ' : 'открыт') + '</b>' + (r.announce ? ' · объявление: «' + esc(r.announce) + '»' : '') + '</div><div class="btns"><button class="btn ' + (r.locked ? '' : 'red') + '" data-a="lock" data-v="' + (r.locked ? 0 : 1) + '">' + (r.locked ? '🔓 Открыть чат' : '🔒 Закрыть чат') + '</button><button class="btn" data-a="announce">📢 Объявление</button></div></div>'
        + r.msgs.map(m => '<div class="card adm-msg ' + (m.deleted ? 'del' : '') + '"><small>' + esc(m.name) + ' · ID ' + esc(String(m.uid).replace('tg:', '')) + ' · ' + dt(m.t) + (m.deleted ? ' · удалено (' + esc(m.why) + ')' : '') + '</small><div>' + esc(m.text) + '</div>'
          + (m.deleted ? '' : '<div class="btns"><button class="btn" data-a="delmsg" data-id="' + m.id + '">🗑 Удалить</button><button class="btn" data-a="player" data-id="' + esc(String(m.uid).replace('tg:', '')) + '">👤 Игрок</button></div>') + '</div>').join(''));
    },
    async params() {
      const r = await call('params_get'); if (!r.ok) return body(err(r));
      body('<div class="card"><h3>Игровые параметры</h3><div class="note">Применяются у всех игроков при ближайшем входе в сеть. Пустое значение — по умолчанию.</div></div>'
        + Object.keys(r.defs).map(k => { const d = r.defs[k], v = r.params[k]; return '<button class="adm-row" data-a="param" data-k="' + k + '"><b>' + k + '</b>' + (v !== undefined ? ' <span class="adm-tag y">изменён</span>' : '') + '<small>сейчас: ' + (v !== undefined ? v : d.def + ' (по умолч.)') + ' · допустимо ' + d.min + '…' + d.max + '</small></button>'; }).join('')
        + '<div class="btns"><button class="btn red" data-a="params_reset">Сбросить все параметры</button></div>');
    },
    async audit() {
      const q = A.state.aq || '', r = await call('audit', { limit: 120, q: q }); if (!r.ok) return body(err(r));
      body('<div class="adm-find"><input id="admAq" type="text" maxlength="40" placeholder="Фильтр: имя, ID, действие" value="' + esc(q) + '"><button class="btn hazard" data-a="afind">🔍</button></div>'
        + r.list.map(x => '<div class="card adm-log"><small>' + dt(x.t) + '</small><b>' + esc(x.action) + '</b><div class="note">Кто: ' + esc(x.actor) + ' (' + esc(x.actorId) + ')' + (x.target ? ' · Над кем: ' + esc(x.targetName || '') + ' (' + esc(x.target) + ')' : '') + (x.reason ? '<br>Причина: ' + esc(x.reason) : '') + (x.details ? '<br>' + esc(x.details) : '') + '</div></div>').join('') || '<div class="card note">Записей нет.</div>');
    },
    async admins() {
      const r = await call('admins_list'); if (!r.ok) return body(err(r)); A.state.perms = r.perms;
      body('<div class="card"><h3>Администраторы</h3><div class="note">Назначать и менять права может только владелец. Из игры администратором стать нельзя.</div></div>'
        + (r.list.map(a => '<div class="card adm-san"><b>' + esc(a.name) + '</b><small>ID ' + esc(a.id) + '</small><div class="note">Права: ' + (a.perms.map(p => PERM_RU[p]).join(', ') || 'нет') + '</div><div class="btns"><button class="btn" data-a="aperms" data-id="' + esc(a.id) + '" data-p="' + esc(a.perms.join(',')) + '">✎ Права</button><button class="btn red" data-a="adel" data-id="' + esc(a.id) + '">Снять</button></div></div>').join('') || '<div class="card note">Администраторов пока нет.</div>')
        + '<div class="btns"><button class="btn hazard" data-a="aadd">➕ Назначить администратора</button></div>');
    },
    async radio() {
      const r = await call('radio_get'); if (!r.ok) return body(err(r)); A.state.radio = r.radio;
      body('<div class="card"><h3>📻 Радиостанция</h3><div class="note">Радио в игре: <b>' + (r.radio.on ? 'включено' : 'ОТКЛЮЧЕНО для всех') + '</b>. Адрес потока — только <b>https</b> и только официальный/разрешённый источник. Игрок запускает звук сам.</div><div class="btns"><button class="btn ' + (r.radio.on ? 'red' : '') + '" data-a="rtoggle">' + (r.radio.on ? 'Отключить радио' : 'Включить радио') + '</button></div></div>'
        + r.radio.stations.map((s, i) => '<div class="card adm-san"><b>' + esc(s.name) + '</b> ' + (s.on ? '' : '<span class="adm-tag r">выкл</span>') + '<div class="note" style="word-break:break-all">Поток: ' + (s.url ? esc(s.url) : '— не задан —') + '<br>Название трека (JSON): ' + (s.meta ? esc(s.meta) : '—') + '</div><div class="btns"><button class="btn" data-a="redit" data-i="' + i + '">✎ Изменить</button></div></div>').join(''));
    }
  };
  // ---- действия
  async function onClick(e) {
    const el = e.target && e.target.closest && e.target.closest('[data-a]'); if (!el) return;
    const a = el.dataset.a, d = el.dataset;
    try {
      if (a === 'close') return A.close();
      if (a === 'tab') { A.tab = d.t; return A.render(); }
      if (a === 'refresh') return refresh();
      if (a === 'find') { A.state.q = (document.getElementById('admQ') || {}).value || ''; return V.players(); }
      if (a === 'afind') { A.state.aq = (document.getElementById('admAq') || {}).value || ''; return V.audit(); }
      if (a === 'player') return profile(d.id);
      if (a === 'un') { const v = await dialog({ title: 'Снять ' + (d.t === 'ban' ? 'бан' : 'мут'), fields: [reasonF], ok: 'Снять' }); if (!v) return; if (notify(await call(d.t === 'ban' ? 'unban' : 'unmute', { uid: d.id, reason: v.reason }))) { if (A.tab === 'sanctions') refresh(); else profile(d.id); } return; }
      if (a === 'banid') { const v = await dialog({ title: 'Бан по Telegram ID', fields: [{ id: 'uid', label: 'Telegram ID', req: 1, max: 15, type: 'text' }, { id: 'hours', label: 'Часов (0 — навсегда)', value: '0', type: 'number' }, reasonF], ok: 'Далее', danger: 1 }); if (!v) return; if (notify(await call('ban', { uid: v.uid, hours: +v.hours || 0, reason: v.reason }), 'Игрок заблокирован')) refresh(); return; }
      if (a === 'delmsg') { const v = await dialog({ title: 'Удалить сообщение', fields: [reasonF], ok: 'Удалить' }); if (!v) return; if (notify(await call('chat_delete', { id: +d.id, reason: v.reason }), 'Удалено')) refresh(); return; }
      if (a === 'lock') { const v = await dialog({ title: d.v === '1' ? 'Закрыть чат' : 'Открыть чат', fields: [reasonF], ok: 'Далее', danger: d.v === '1' }); if (!v) return; if (notify(await call('chat_lock', { locked: d.v === '1', reason: v.reason }))) refresh(); return; }
      if (a === 'announce') { const v = await dialog({ title: 'Объявление для всех игроков', fields: [{ id: 'text', label: 'Текст (пусто — убрать)', max: 200 }, reasonF], ok: 'Опубликовать' }); if (!v) return; if (notify(await call('announce_set', { text: v.text, reason: v.reason }))) refresh(); return; }
      if (a === 'param') { const v = await dialog({ title: 'Параметр ' + d.k, fields: [{ id: 'value', label: 'Новое значение (пусто — по умолчанию)', type: 'text', max: 10 }, reasonF], ok: 'Сохранить' }); if (!v) return; if (notify(await call('params_set', { key: d.k, value: v.value === '' ? null : +v.value, reason: v.reason }))) refresh(); return; }
      if (a === 'params_reset') { const v = await dialog({ title: 'Сбросить все параметры', fields: [reasonF], ok: 'Далее', danger: 1 }); if (!v) return; if (notify(await call('params_reset', { reason: v.reason }))) refresh(); return; }
      if (a === 'aadd') { const v = await dialog({ title: 'Назначить администратора', fields: [{ id: 'uid', label: 'Telegram ID', req: 1, max: 15 }, { id: 'name', label: 'Имя (для списка)', max: 30 }, { id: 'perms', label: 'Права через запятую: ' + Object.keys(PERM_RU).join(', '), value: 'players,bans,chat,online,stats', max: 120 }, reasonF], ok: 'Далее', danger: 1 }); if (!v) return; if (notify(await call('admin_add', { uid: v.uid, name: v.name, perms: v.perms.split(/[\s,]+/).filter(Boolean), reason: v.reason }), 'Администратор назначен')) refresh(); return; }
      if (a === 'aperms') { const v = await dialog({ title: 'Права администратора ' + d.id, fields: [{ id: 'perms', label: 'Через запятую: ' + Object.keys(PERM_RU).join(', '), value: d.p, max: 120 }, reasonF], ok: 'Далее', danger: 1 }); if (!v) return; if (notify(await call('admin_perms', { uid: d.id, perms: v.perms.split(/[\s,]+/).filter(Boolean), reason: v.reason }))) refresh(); return; }
      if (a === 'adel') { const v = await dialog({ title: 'Снять администратора ' + d.id, fields: [reasonF], ok: 'Далее', danger: 1 }); if (!v) return; if (notify(await call('admin_remove', { uid: d.id, reason: v.reason }), 'Администратор снят')) refresh(); return; }
      if (a === 'rtoggle') { const R = A.state.radio, v = await dialog({ title: R.on ? 'Отключить радио для всех' : 'Включить радио', fields: [reasonF], ok: 'Далее', danger: 1 }); if (!v) return; if (notify(await call('radio_set', { on: !R.on, stations: R.stations, reason: v.reason }))) refresh(); return; }
      if (a === 'redit') { const R = A.state.radio, s = R.stations[+d.i], v = await dialog({ title: 'Станция «' + s.name + '»', fields: [{ id: 'name', label: 'Название', value: s.name, max: 40 }, { id: 'url', label: 'Адрес потока (https://…, пусто — не задан)', value: s.url, max: 300 }, { id: 'meta', label: 'JSON с названием трека (необязательно, https://…)', value: s.meta, max: 300 }, { id: 'on', label: 'Станция', type: 'select', options: [['1', 'включена'], ['0', 'выключена']] }, reasonF], ok: 'Далее', danger: 1 }); if (!v) return; const st = R.stations.map((x, i) => i === +d.i ? { id: x.id, name: v.name, url: v.url, meta: v.meta, on: v.on === '1' } : x); if (notify(await call('radio_set', { on: R.on, stations: st, reason: v.reason }))) refresh(); return; }
      if (a === 'pban') { const v = await dialog({ title: 'Бан игрока ' + d.id, fields: [{ id: 'hours', label: 'Часов (0 — навсегда)', value: '0', type: 'number' }, reasonF], ok: 'Далее', danger: 1 }); if (v && notify(await call('ban', { uid: d.id, hours: +v.hours || 0, reason: v.reason }), 'Игрок заблокирован')) profile(d.id); return; }
      if (a === 'pmute') { const v = await dialog({ title: 'Мут игрока ' + d.id, fields: [{ id: 'minutes', label: 'Минут', value: '60', type: 'number' }, reasonF], ok: 'Выдать мут' }); if (v && notify(await call('mute', { uid: d.id, minutes: +v.minutes || 60, reason: v.reason }), 'Мут выдан')) profile(d.id); return; }
      if (a === 'pdelall') { const v = await dialog({ title: 'Удалить все сообщения ' + d.id, fields: [reasonF], ok: 'Далее', danger: 1 }); if (v && notify(await call('chat_delete_user', { uid: d.id, reason: v.reason }), 'Сообщения удалены')) profile(d.id); return; }
      if (a === 'prename') { const v = await dialog({ title: 'Сменить игровое имя', fields: [{ id: 'name', label: 'Новое имя (2–18 знаков)', req: 1, max: 18 }, reasonF], ok: 'Далее', danger: 1 }); if (v && notify(await call('player_rename', { uid: d.id, name: v.name, reason: v.reason }), 'Имя изменится при следующем входе игрока')) profile(d.id); return; }
    } catch (x) { say('⛔ Ошибка интерфейса', true); }
  }
  async function profile(id) {
    const r = await call('player_get', { uid: id }); if (!r.ok) return notify(r);
    const p = r.player, back = A.tab;
    body('<div class="btns"><button class="btn" data-a="tab" data-t="' + back + '">← Назад</button></div><div class="card"><h3>' + esc(p.name || 'Игрок ' + id) + (r.role ? ' · ' + (r.role === 'owner' ? 'ВЛАДЕЛЕЦ' : 'админ') : '') + '</h3>'
      + (r.found ? [['Telegram ID', p.id], ['Имя в Telegram', p.tg], ['Должность', p.job || '—'], ['Разряд', p.rank], ['Смен', p.shifts], ['Очки жизни', fmt(p.oj)], ['Деньги', fmt(p.money) + ' ₽'], ['Дней в игре', p.days], ['Версия', p.ver], ['Первый вход', dt(p.first)], ['Был в сети', dt(p.last) + ' (' + ago(p.last) + ')']].map(x => '<div class="kv"><span>' + x[0] + '</span><span>' + esc(x[1]) + '</span></div>').join('') : '<div class="note">Игрок ещё не заходил с этой версии игры (ID ' + esc(id) + ').</div>')
      + (r.ban ? '<div class="note" style="color:var(--red)">⛔ Бан ' + (r.ban.until ? 'до ' + dt(r.ban.until) : 'бессрочно') + ': ' + esc(r.ban.reason) + '</div>' : '') + (r.mute ? '<div class="note" style="color:var(--haz)">🔇 Мут до ' + dt(r.mute.until) + ': ' + esc(r.mute.reason) + '</div>' : '') + '</div>'
      + (can('bans') && !r.role ? '<div class="btns"><button class="btn red" data-a="pban" data-id="' + esc(id) + '">⛔ Бан</button><button class="btn" data-a="pmute" data-id="' + esc(id) + '">🔇 Мут</button>' + (r.ban ? '<button class="btn" data-a="un" data-t="ban" data-id="' + esc(id) + '">Снять бан</button>' : '') + (r.mute ? '<button class="btn" data-a="un" data-t="mute" data-id="' + esc(id) + '">Снять мут</button>' : '') + '</div>' : '')
      + (can('chat') && !r.role ? '<div class="btns"><button class="btn" data-a="pdelall" data-id="' + esc(id) + '">🗑 Удалить все сообщения</button></div>' : '')
      + (can('players') && !r.role && r.found ? '<div class="btns"><button class="btn" data-a="prename" data-id="' + esc(id) + '">✎ Сменить игровое имя</button></div>' : '')
      + '<div class="card"><h3>Последние сообщения</h3>' + (r.msgs.map(m => '<div class="adm-msg ' + (m.deleted ? 'del' : '') + '"><small>' + dt(m.t) + '</small> ' + esc(m.text) + '</div>').join('') || '<div class="note">Нет.</div>') + '</div>'
      + '<div class="card"><h3>История действий над игроком</h3>' + (r.log.map(x => '<div class="adm-msg"><small>' + dt(x.t) + ' · ' + esc(x.actor) + '</small> ' + esc(x.action) + (x.reason ? ' — ' + esc(x.reason) : '') + '</div>').join('') || '<div class="note">Нет.</div>') + '</div>');
  }
})();
