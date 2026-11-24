/* ===== Премиум-аккаунты: золотое имя с короной, плашка «Premium account», VIP-рамка, VIP-профиль, титулы, выплата =====
   Кто премиум, запись админа, титул и выплата определяются ТОЛЬКО сервером (подпись Telegram, выдаёт один владелец).
   Клиент лишь показывает то, что прислал сервер, и просит выплату/титул — проверка и учёт на сервере (server/chat_gas.gs). */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const P = (G.premium = { byUid: {}, byName: {}, mine: null, loaded: 0, loading: false, busy: false, titles: ['Олигарх Едрёностали', 'Король завода', 'Человек с деньгами'], payout: 2500, hinted: false });
  // экранирование + защита от подстановок {name}/{boss}, которые G.fmt применяет к тексту окон
  const esc = t => String(t == null ? '' : t).replace(/[&<>"{}]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '{': '&#123;', '}': '&#125;' }[c]));
  const nk = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const url = () => (G.CONFIG && G.CONFIG.CHAT_URL) || '';
  const okUid = u => /^(tg|vk):\d{1,20}$/.test(String(u || ''));
  const rub = v => (G.rub ? G.rub(v) : v + ' ₽');
  const fmtDate = t => { try { const d = new Date(+t), p = n => ('0' + n).slice(-2); return +t ? p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() : '—'; } catch (e) { return '—'; } };
  const myUid = () => (G.lb && G.lb.uid ? G.lb.uid() : '');

  /* ---------- данные ---------- */
  P.achList = function () { // названия последних достижений для VIP-профиля (сервер почистит и обрежет)
    try { return Object.keys(G.s.ach || {}).slice(-8).map(id => (G.achName ? G.achName(id) : id)); } catch (e) { return []; }
  };
  P.mineRec = function () { return P.mine ? Object.assign({ uid: myUid(), name: G.s ? G.s.name : '', ach: P.achList() }, P.mine) : null; };
  function rebuild(list) {
    P.byUid = {}; P.byName = {};
    (list || []).forEach(r => {
      if (!okUid(r.uid)) return;
      P.byUid[r.uid] = r;
      if (r.unique && r.name) P.byName[nk(r.name)] = r; // по имени — только если оно у одного игрока (защита от двойников)
    });
  }
  P.load = function (force) {
    if (P.loading || !url()) return;
    if (!force && Date.now() - P.loaded < 120000) return;
    P.loading = true; P.loaded = Date.now(); // метка ставится сразу: при ошибке повтор не раньше чем через 2 минуты
    fetch(url() + (url().indexOf('?') >= 0 ? '&' : '?') + 'action=premium_list')
      .then(r => r.json())
      .then(j => { if (!j || !j.ok) throw new Error('premium'); rebuild(j.list); if (j.titles && j.titles.length) P.titles = j.titles; if (j.payout) P.payout = j.payout; })
      .catch(() => {})
      .then(() => { P.loading = false; P.redraw(); });
  };
  P.redraw = function () {
    try { if (G.chat && G.chat.draw) G.chat.draw(); } catch (e) {}
    try { if (G.ui && !G.cur && G.ui.render && (G.ui.tab === 'rating')) { G.ui.keepScroll = true; G.ui.render(); } } catch (e) {}
  };
  P.addChat = function (map) { // сервер вместе с чатом присылает данные авторов-премиумов
    if (!map) return; Object.keys(map).forEach(u => { if (okUid(u)) P.byUid[u] = Object.assign({ uid: u }, P.byUid[u] || {}, map[u]); });
  };
  P.onPing = function (p) { // ответ ping: что сервер говорит про меня
    const was = !!P.mine; P.mine = p && typeof p === 'object' ? p : null;
    if (P.mine) { if (P.mine.payout && P.mine.payout.amount) P.payout = P.mine.payout.amount; P.load(); }
    if (was !== !!P.mine && G.ui && G.ui.render && G.s && G.s.phase !== 'new') G.ui.render();
    if (P.mine && P.mine.payout && P.mine.payout.claimable && !P.hinted && G.toast) { P.hinted = true; G.toast('👑 VIP-выплата ждёт тебя в «Деле».', 'good'); }
  };
  P.forUid = function (uid) { if (uid && uid === myUid() && P.mine) return P.mineRec(); P.load(); return okUid(uid) ? P.byUid[uid] || null : null; };
  // строка рейтинга: uid (если сервер рейтинга его отдаёт) → «это я» → имя (только если уникально)
  P.forRow = function (r, isMe) {
    if (!r) return null;
    if (isMe || r.me) return P.mineRec();
    P.load();
    const u = r.uid || r.id;
    if (okUid(u)) return P.byUid[u] || null; // сервер рейтинга отдал uid — доверяем только ему, по имени не гадаем
    if (/^\d{1,20}$/.test(String(u || ''))) return P.byUid['tg:' + u] || null;
    return P.byName[nk(r.name)] || null; // uid нет (веб-игрок или старый сервер рейтинга) — только по уникальному имени
  };

  /* ---------- отображение ---------- */
  // имя игрока: у премиума — золотое, с короной, по нажатию открывается плашка
  P.name = function (name, rec) {
    if (!rec || !okUid(rec.uid)) return esc(name);
    return '<span class="pn" onclick="event.stopPropagation();G.premium.card(\'' + rec.uid + '\')">👑 ' + esc(name) + '</span>';
  };
  P.ownName = function (name) { return P.mine ? '<span class="pn" onclick="event.stopPropagation();G.premium.card(\'me\')">👑 ' + esc(name) + '</span>' : esc(name); };
  P.frame = () => (P.mine ? ' vip-frame' : ''); // класс VIP-рамки аватара

  P.card = function (uid) {
    const rec = uid === 'me' ? P.mineRec() : P.forUid(uid);
    if (!rec) return;
    const note = String(rec.note || '').trim();
    const ach = (rec.ach || []).filter(Boolean);
    let h = '<div class="prem-plate"><div class="prem-crown">👑</div><div class="prem-t">Premium account</div>'
      + '<div class="prem-n">' + esc(rec.name || '—') + '</div>'
      + '<div class="prem-d">Игроку доступны премиум функции</div>'
      + (note ? '<div class="prem-note"><small>Запись администратора</small>«' + esc(note) + '»</div>' : '') + '</div>'
      + '<div class="prem-prof"><h4>VIP-профиль</h4>'
      + '<div class="kv"><span>Статус</span><span class="pn">👑 Premium</span></div>'
      + '<div class="kv"><span>В премиуме с</span><span>' + fmtDate(rec.since) + '</span></div>'
      + '<div class="kv"><span>Титул</span><span>' + (rec.title ? '🏅 ' + esc(rec.title) : '—') + '</span></div>'
      + '<div class="prem-ach"><small>Достижения</small>' + (ach.length ? ach.map(a => '<span>🏅 ' + esc(a) + '</span>').join('') : '<i>пока не отмечены</i>') + '</div></div>';
    G.modal({ title: '👑 Premium', cls: 'prem-modal', text: h, opts: [{ t: 'Закрыть', fn: () => {} }] });
  };

  /* ---------- VIP-кабинет в «Деле» ---------- */
  P.dossierCard = function () {
    const m = P.mine; if (!m) return '';
    const claim = m.payout && m.payout.claimable;
    return '<div class="card prem-cab"><h3>👑 VIP-кабинет</h3>'
      + '<div class="kv"><span>Статус</span><span class="pn">Premium</span></div>'
      + '<div class="kv"><span>В премиуме с</span><span>' + fmtDate(m.since) + '</span></div>'
      + (m.note ? '<div class="prem-note"><small>Запись администратора</small>«' + esc(m.note) + '»</div>' : '')
      + '<div class="prem-sec"><b>Ежедневная VIP-выплата</b><div class="note">' + rub(P.payout) + ' в день — раз в сутки по московскому времени.</div>'
      + '<button class="btn hazard" ' + (claim && !P.busy ? '' : 'disabled') + ' onclick="G.premium.claim()">' + (claim ? '💰 Получить ' + rub(P.payout) : '✅ Сегодня уже получено') + '</button></div>'
      + '<div class="prem-sec"><b>Эксклюзивный титул</b><div class="prem-titles">'
      + P.titles.map((t, i) => '<button class="chip ' + (m.title === t ? 'on' : '') + '" onclick="G.premium.setTitle(' + i + ')">' + esc(t) + '</button>').join('')
      + '<button class="chip ' + (!m.title ? 'on' : '') + '" onclick="G.premium.setTitle(-1)">Без титула</button></div></div>'
      + '<div class="prem-sec"><b>VIP-объявления</b><div class="note">В общем чате отметь «📣 VIP-объявление» — сообщение выделится золотом. Не чаще раза в 30 минут.</div></div>'
      + '<div class="btns"><button class="btn" onclick="G.premium.card(\'me\')">👑 Мой VIP-профиль</button></div>'
      + '<div class="note">Новые премиум-функции появятся здесь.</div></div>';
  };
  P.claim = function () {
    const m = P.mine; if (!m || P.busy || !m.payout || !m.payout.claimable) return;
    if (!G.srv || !G.srv.available()) { G.toast('Выплата доступна только в Telegram, при связи с сервером.', 'warn'); return; }
    P.busy = true; if (G.ui) { G.ui.keepScroll = true; G.ui.render(); }
    G.srv.post({ action: 'premium_claim' }).then(j => {
      if (j && j.ok) {
        G.addMoney(j.amount || P.payout); m.payout.claimable = false; G.save && G.save();
        G.toast('👑 VIP-выплата: +' + rub(j.amount || P.payout), 'good');
      } else if (j && j.error === 'already') { m.payout.claimable = false; G.toast('Сегодня выплата уже получена.'); }
      else G.toast((j && j.error) || 'Не удалось получить выплату.', 'warn');
    }).catch(() => G.toast('Нет связи с сервером — попробуй позже.', 'warn'))
      .then(() => { P.busy = false; if (G.ui) { G.ui.keepScroll = true; G.ui.render(); } });
  };
  P.setTitle = function (i) {
    const m = P.mine; if (!m || P.busy) return;
    const t = i >= 0 ? P.titles[i] : ''; if (i >= 0 && !t) return;
    if (!G.srv || !G.srv.available()) { G.toast('Титул меняется только в Telegram, при связи с сервером.', 'warn'); return; }
    P.busy = true;
    G.srv.post({ action: 'premium_title', title: t }).then(j => {
      if (j && j.ok) { m.title = j.title || ''; G.toast(m.title ? '🏅 Титул: ' + m.title : 'Титул снят.', 'good'); if (G.srv) G.srv.last = 0; P.load(true); }
      else G.toast((j && j.error) || 'Не удалось сменить титул.', 'warn');
    }).catch(() => G.toast('Нет связи с сервером — попробуй позже.', 'warn'))
      .then(() => { P.busy = false; if (G.ui) { G.ui.keepScroll = true; G.ui.render(); } });
  };
})();
