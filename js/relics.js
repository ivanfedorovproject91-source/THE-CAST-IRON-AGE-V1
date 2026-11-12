/* ===== «ЛИЧНОЕ ДЕЛО — МОИ РЕЛИКВИИ»: хранение, выдача наград, интерфейс «Коллекция» =====
   Подключается ПОСЛЕ ui.js / v3x.js и ДО main.js. Данные — в js/data_relics.js.

   ВАЖНО О ХРАНЕНИИ.
   • Коллекция лежит в localStorage под ОТДЕЛЬНЫМ ключом (RELICS_KEY) и не входит в G.s.
     Поэтому «Начать заново» (G.wipe стирает только G.SAVE_KEY) её не затрагивает.
     В этом файле НЕТ функции очистки коллекции — так сделано намеренно.
   • Это ЧИСТО КЛИЕНТСКОЕ хранение. Оно защищает от ошибок (двойной тап, перезапуск, повтор события),
     но НЕ от игрока, который сам правит localStorage. Серверной защиты здесь нет.
   • Архитектура готова к переносу на сервер: у коллекции есть owner (Telegram ID, если известен) и счётчик rev,
     у каждой выдачи — постоянный grantKey (на сервере он станет уникальным по паре owner+grantKey),
     а R.mergeRemote() умеет без дублей объединять локальную коллекцию с серверной. */
(function () {
  'use strict';
  const G = window.G, D = G.D;
  const R = (G.relics = G.relics || {});
  const KEY = 'chugunny_vek_relics_v1';
  const BAK = KEY + '_bak';
  const BAD = KEY + '_corrupt';
  R.KEY = KEY;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cats = () => D.RELIC_CATS || {};
  const rars = () => D.RELIC_RARITY || {};
  const catalog = () => D.RELICS || {};

  // ============================================================ ХРАНИЛИЩЕ
  let store = null;
  R.volatile = false;   // true — запись в localStorage не удалась, коллекция живёт только до закрытия игры
  R.recovered = null;   // 'bak' | 'corrupt' — при загрузке пришлось восстанавливаться

  const empty = () => ({ v: 1, owner: 'local', rev: 0, items: [], grants: {}, offers: {}, seen: {} });
  function tgOwner() {
    try { const u = window.Telegram.WebApp.initDataUnsafe.user; if (u && u.id) return 'tg:' + u.id; } catch (e) {}
    return null;
  }
  function norm(d) {
    const s = empty();
    if (!d || typeof d !== 'object') return s;
    if (typeof d.owner === 'string') s.owner = d.owner;
    s.rev = +d.rev || 0;
    s.items = Array.isArray(d.items) ? d.items.filter(x => x && x.gid && x.itemId) : [];
    ['grants', 'offers', 'seen'].forEach(k => { if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) s[k] = d[k]; });
    return s;
  }
  function parse(raw) { try { const d = JSON.parse(raw); return d && typeof d === 'object' && Array.isArray(d.items) ? norm(d) : null; } catch (e) { return null; } }
  function readStore() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { return store || empty(); }
    if (raw == null) return store || empty();   // ещё ничего не сохраняли (или хранилище недоступно)
    let d = parse(raw);
    if (d) return d;
    // основная запись повреждена: сохраняем её как есть «на вскрытие» и пробуем резервную копию
    try { localStorage.setItem(BAD, raw); } catch (e) {}
    let b = null; try { b = parse(localStorage.getItem(BAK)); } catch (e) {}
    R.recovered = b ? 'bak' : 'corrupt';
    return b || empty();
  }
  // Перечитываем из localStorage перед КАЖДОЙ операцией записи: если открыто два окна игры,
  // они не перезапишут друг друга устаревшими данными и не выдадут награду дважды.
  function ensure() {
    store = readStore();
    const o = tgOwner(); if (o && store.owner === 'local') store.owner = o;
    return store;
  }
  function persist() {
    store.rev++;
    try {
      const json = JSON.stringify(store);
      localStorage.setItem(KEY, json);
      localStorage.setItem(BAK, json);   // копия на случай повреждения основной записи
      R.volatile = false; return true;
    } catch (e) { R.volatile = true; return false; }
  }
  R.state = () => ensure();
  ensure();

  // ============================================================ ВСПОМОГАТЕЛЬНОЕ
  const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const newGid = () => 'rg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  const owns = (st, itemId) => st.items.some(x => x.itemId === itemId);
  R.owns = itemId => owns(ensure(), itemId);
  R.runId = function () { const f = G.s && G.s.flags; if (!f) return null; return f.relicRun || (f.relicRun = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)); };
  const ruleKey = r => (r.scope === 'run' ? r.key + ':' + (R.runId() || 'norun') : r.key);
  const fmtDate = ts => { try { return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (e) { return ''; } };

  // ============================================================ ВЫДАЧА
  // Внутренняя выдача: меняет store, но НЕ сохраняет. Идемпотентна по grantKey.
  function grantInto(st, itemId, o) {
    o = o || {};
    const it = catalog()[itemId];
    if (!it) return { ok: false, reason: 'unknown' };
    if (!it.enabled && !o.force) return { ok: false, reason: 'disabled' };
    if (!o.grantKey) return { ok: false, reason: 'nokey' };
    if (st.grants[o.grantKey]) return { ok: false, dup: true, reason: 'key', gid: st.grants[o.grantKey] };
    if (owns(st, itemId) && !it.repeatable) return { ok: false, dup: true, reason: 'owned' };
    const inst = {
      gid: newGid(), itemId: itemId, grantKey: o.grantKey, acquiredAt: Date.now(),
      gameDay: G.s && G.s.t ? G.s.t.day : null,
      acquisitionSource: o.source || it.source || '', acquisitionDescription: o.description || ''
    };
    st.items.push(inst); st.grants[o.grantKey] = inst.gid;
    return { ok: true, inst: inst };
  }
  // Универсальная выдача одного предмета.
  R.grant = function (itemId, o) {
    const st = ensure(); const r = grantInto(st, itemId, o);
    if (r.ok) persist();
    return r;
  };

  // Универсальная «награда на выбор». Создаёт предложение (один раз на ключ) и возвращает его.
  // spec: { pool|options, count, title, text, source, description }
  R.offerChoice = function (key, spec) {
    const st = ensure();
    if (st.grants[key]) return { status: 'claimed', key: key };
    if (st.offers[key]) return Object.assign({ key: key }, st.offers[key]);
    const pool = (spec.options || spec.pool || []).filter(id => { const it = catalog()[id]; return it && it.enabled && (it.repeatable || !owns(st, id)); });
    pool.sort((a, b) => hash(key + a) - hash(key + b));   // стабильный порядок, генератор случайных чисел игры не трогаем
    const options = pool.slice(0, spec.count || 3);
    const offer = options.length
      ? { status: 'pending', options: options, createdAt: Date.now(), title: spec.title || 'Награда', text: spec.text || '', source: spec.source || '', description: spec.description || '' }
      : { status: 'void', createdAt: Date.now() };   // всё из набора уже в коллекции — предлагать нечего, больше не спрашиваем
    st.offers[key] = offer; persist();
    return Object.assign({ key: key }, offer);
  };

  // Игрок выбрал предмет. Выдача и отметка «получено» сохраняются ОДНОЙ записью.
  R.choose = function (key, itemId) {
    const st = ensure(); const offer = st.offers[key];
    if (!offer) return { ok: false, reason: 'nooffer' };
    if (offer.status !== 'pending') return { ok: false, dup: true, reason: offer.status };
    if (offer.options.indexOf(itemId) < 0) return { ok: false, reason: 'notinoffer' };
    const r = grantInto(st, itemId, { grantKey: key, source: offer.source, description: offer.description });
    if (!r.ok) return r;
    offer.status = 'claimed'; offer.chosen = itemId; offer.claimedAt = Date.now(); offer.gid = r.inst.gid;
    persist();
    return r;
  };

  // ============================================================ УСЛОВИЯ (триггеры)
  const rules = () => D.RELIC_RULES || [];
  const queued = key => (G.cur && G.cur._relic === key) || G.mq.some(m => m && m._relic === key);
  // Событие игры → проверка всех правил с таким именем. Безопасно вызывать сколько угодно раз.
  R.trigger = function (event, ctx) {
    const out = [];
    rules().forEach(rule => {
      if (rule.event !== event) return;
      try {
        if (rule.when && !rule.when(ctx || {}, G.s)) return;
        const key = ruleKey(rule), st = ensure();
        if (st.grants[key]) return;
        const desc = rule.describe ? rule.describe(ctx || {}, G.s) : '';
        if (rule.mode === 'direct') {
          const r = R.grant(rule.item, { grantKey: key, source: rule.source, description: desc });
          if (r.ok) { out.push(r); R.showReceived(r.inst.gid); }
        } else {
          const o = R.offerChoice(key, { pool: rule.pool, count: rule.count, title: rule.title, text: rule.text, source: rule.source, description: desc });
          if (o.status === 'pending') { out.push(o); R.showOffer(key); }
        }
      } catch (e) { console.error(e); }
    });
    return out;
  };
  // При запуске игры: награды, заслуженные ДО появления системы (старые сохранения), и неполученные предложения.
  R.reconcile = function () {
    const s = G.s; if (!s || s.end || s.phase === 'new') return;
    rules().forEach(rule => {
      try {
        if (!rule.legacy || !rule.legacy(s)) return;
        const key = ruleKey(rule), st = ensure();
        if (st.grants[key] || st.offers[key]) return;
        R.trigger(rule.event, { legacy: true });
      } catch (e) { console.error(e); }
    });
    const st = ensure();
    Object.keys(st.offers).forEach(k => { if (st.offers[k].status === 'pending') R.showOffer(k); });
  };

  // ============================================================ ЭКРАНЫ ВЫДАЧИ
  const sel = {};   // key → выбранный itemId (только на время показа окна)
  const rr = id => rars()[id] || rars().common || { n: id, color: '#999' };
  function cardHTML(it, cls, extra) {
    return '<span class="rl-img"><img src="' + esc(it.image) + '" alt="" draggable="false"></span><span class="rl-nm">' + esc(it.name) + '</span><span class="rl-rr">' + esc(rr(it.rarity).n) + '</span>' + (extra || '');
  }
  R.showOffer = function (key, front) {
    const st = ensure(), offer = st.offers[key];
    if (!offer || offer.status !== 'pending' || queued(key)) return;
    sel[key] = sel[key] && offer.options.indexOf(sel[key]) >= 0 ? sel[key] : null;
    const opts = offer.options.map(id => catalog()[id]).filter(Boolean);
    const html = '<div class="rl-offer"><div class="rl-offer-t">' + offer.text + '</div><div class="rl-choices">'
      + opts.map(it => '<button class="rl-pick rl-r-' + it.rarity + (sel[key] === it.id ? ' sel' : '') + '" data-id="' + it.id + '" onclick="G.relics.select(\'' + key + '\',\'' + it.id + '\')">' + cardHTML(it) + '<span class="rl-cat">' + esc((cats()[it.category] || {}).s || '') + '</span></button>').join('')
      + '</div><div class="rl-info" id="rl-info">' + infoHTML(key) + '</div></div>';
    const spec = {
      _relic: key, title: '🎖 ' + esc(offer.title), bg: 'checkpoint', cls: 'good', wide: true, vib: 'success', text: html,
      opts: [{ t: '✔ Забрать выбранное', cls: 'hazard', fn: () => R.confirm(key) }, { t: 'Выберу позже', fn: () => { delete sel[key]; } }]
    };
    if (front) { G.mq.unshift(spec); G.pump(); } else G.modal(spec);   // front: показать сразу, а не после остальных окон очереди
  };
  function infoHTML(key) {
    const it = sel[key] && catalog()[sel[key]];
    if (!it) return '<i>Нажми на предмет, чтобы рассмотреть его. Выбрать можно только один.</i>';
    return '<b>' + esc(it.name) + '</b><div class="rl-info-d">' + esc(it.description) + '</div><div class="rl-info-s">Вручает: ' + esc(it.source) + '</div>';
  }
  R.select = function (key, id) {
    sel[key] = id;
    try {
      document.querySelectorAll('.rl-pick').forEach(b => b.classList.toggle('sel', b.getAttribute('data-id') === id));
      const el = document.getElementById('rl-info'); if (el) el.innerHTML = infoHTML(key);
      G.buzz('light');
    } catch (e) {}
  };
  // Кнопка «Забрать». Решает СОСТОЯНИЕ хранилища, а не вид кнопки: повторный вызов вернёт dup и ничего не выдаст.
  R.confirm = function (key) {
    const id = sel[key];
    if (!id) { G.toast('Сначала выбери предмет.', 'bad'); R.showOffer(key, true); return; }
    const r = R.choose(key, id);
    delete sel[key];
    if (r.ok) { G.buzz('success'); R.showReceived(r.inst.gid, true); if (R.volatile) G.toast('Не удалось записать коллекцию на устройство.', 'bad'); }
    else if (r.dup) G.toast('Награда уже получена.');
  };
  R.showReceived = function (gid, front) {
    const st = ensure(), inst = st.items.find(x => x.gid === gid), it = inst && catalog()[inst.itemId];
    if (!it) return;
    const html = '<div class="rl-reveal rl-r-' + it.rarity + '"><div class="rl-frame"><img src="' + esc(it.image) + '" alt=""></div><div class="rl-rtag">' + esc(rr(it.rarity).n) + '</div><div class="rl-rname">' + esc(it.name) + '</div><div class="rl-rdesc">' + esc(it.description) + '</div><div class="rl-rnote">Предмет навсегда занесён в «Личное дело → Коллекция».</div></div>';
    const spec = { title: '🏅 Награда получена', bg: 'checkpoint', cls: 'good', wide: true, vib: 'success', text: html, opts: [
      { t: '📂 Открыть коллекцию', cls: 'hazard', fn: () => { R.ui.view = { gid: gid }; R.ui.cat = 'all'; R.ui.rar = 'all'; G.ui.tab = 'file'; G.ui.sub = 'relics'; } },
      { t: 'Продолжить', fn: () => {} }
    ] };
    if (front) { G.mq.unshift(spec); G.pump(); } else G.modal(spec);
  };

  // ============================================================ ВКЛАДКА «КОЛЛЕКЦИЯ»
  R.ui = { cat: 'all', rar: 'all', view: null };
  const rerender = keep => { G.ui.keepScroll = !!keep; G.ui.render(); };
  R.setCat = c => { R.ui.cat = c; rerender(true); };
  R.setRar = r => { R.ui.rar = r; rerender(true); };
  R.open = (gid, itemId) => { R.ui.view = gid ? { gid: gid } : { id: itemId }; if (gid) { const st = ensure(); if (!st.seen[gid]) { st.seen[gid] = 1; persist(); } } rerender(false); };
  R.back = () => { R.ui.view = null; rerender(false); };
  R.newCount = function () { const st = ensure(); return st.items.filter(x => !st.seen[x.gid]).length + Object.keys(st.offers).filter(k => st.offers[k].status === 'pending').length; };

  const GEAR = '<svg viewBox="0 0 64 64" class="rl-gear" aria-hidden="true"><path d="M32 8l4 .6 1.6 5.2 4.2 1.8 4.8-2.6 3 3-2.6 4.8 1.8 4.2 5.2 1.6.6 4-.6 4-5.2 1.6-1.8 4.2 2.6 4.8-3 3-4.8-2.6-4.2 1.8L36 56l-4 .6-4-.6-1.6-5.2-4.2-1.8-4.8 2.6-3-3 2.6-4.8-1.8-4.2L10 33.4 9.4 32l.6-4 5.2-1.6 1.8-4.2-2.6-4.8 3-3 4.8 2.6 4.2-1.8L28 8.6z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="32" cy="32" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';

  function entries() {
    const st = ensure(), out = [];
    st.items.slice().sort((a, b) => b.acquiredAt - a.acquiredAt).forEach(inst => { const it = catalog()[inst.itemId]; if (it) out.push({ kind: 'own', inst: inst, it: it }); });
    Object.keys(catalog()).map(k => catalog()[k]).filter(it => !owns(st, it.id) && (it.enabled || it.hidden))
      .sort((a, b) => (rr(a.rarity).order || 0) - (rr(b.rarity).order || 0))
      .forEach(it => out.push({ kind: it.hidden ? 'mystery' : 'locked', it: it }));
    return out;
  }
  function tile(e, st) {
    const it = e.it, isNew = e.kind === 'own' && !st.seen[e.inst.gid];
    const arg = e.kind === 'own' ? "'" + e.inst.gid + "',null" : "null,'" + it.id + "'";
    const name = e.kind === 'mystery' ? '???' : it.name;
    const rare = e.kind === 'mystery' ? 'Тайна' : e.kind === 'locked' ? 'Не получен' : rr(it.rarity).n;
    return '<button class="rl-tile rl-r-' + (e.kind === 'mystery' ? 'mystery' : it.rarity) + (e.kind === 'own' ? '' : ' ' + e.kind) + (isNew ? ' fresh' : '') + '" onclick="G.relics.open(' + arg + ')">'
      + (isNew ? '<span class="rl-new">НОВОЕ</span>' : '')
      + '<span class="rl-img"><img src="' + esc(it.image) + '" alt="" loading="lazy" draggable="false">' + (e.kind === 'mystery' ? '<b class="rl-q">?</b>' : '') + '</span>'
      + '<span class="rl-nm">' + esc(name) + '</span><span class="rl-rr">' + esc(rare) + '</span></button>';
  }
  function head(st) {
    const all = Object.keys(catalog()).map(k => catalog()[k]);
    const open = all.filter(i => !i.hidden && i.enabled).length, hid = all.filter(i => i.hidden).length;
    const uniq = {}; st.items.forEach(x => { uniq[x.itemId] = 1; });
    const have = Object.keys(uniq).length, total = open + hid;
    const pct = total ? Math.round(have * 100 / total) : 0;
    let h = '<div class="rl-head"><div class="rl-stripe"></div><div class="rl-head-in"><div class="rl-head-t">ЛИЧНОЕ ДЕЛО · МОИ РЕЛИКВИИ</div>'
      + '<div class="rl-count"><b>' + st.items.length + '</b><span>предметов в коллекции</span></div>'
      + '<div class="rl-bar"><i style="width:' + pct + '%"></i></div><div class="rl-sub">Собрано ' + have + ' из ' + total + (hid ? ' · тайн не раскрыто: ' + all.filter(i => i.hidden && !uniq[i.id]).length : '') + '</div></div></div>';
    if (R.volatile) h += '<div class="rl-warn">⚠ Хранилище устройства недоступно: коллекция будет жить только до закрытия игры.</div>';
    if (R.recovered === 'bak') h += '<div class="rl-warn">Коллекция была повреждена и восстановлена из резервной копии.</div>';
    if (R.recovered === 'corrupt') h += '<div class="rl-warn">Запись коллекции повреждена и не восстановлена. Копия сохранена отдельно.</div>';
    Object.keys(st.offers).filter(k => st.offers[k].status === 'pending').forEach(k => { h += '<button class="rl-gift" onclick="G.relics.showOffer(\'' + k + '\')">🎁 Награда ждёт выбора: ' + esc(st.offers[k].title) + '</button>'; });
    return h;
  }
  function chips(st) {
    const mine = st.items.map(x => catalog()[x.itemId]).filter(Boolean);
    let h = '<div class="rl-chips">' + ['all'].concat(Object.keys(cats())).map(c => {
      const n = c === 'all' ? mine.length : mine.filter(i => i.category === c).length;
      const c0 = cats()[c];
      return '<button class="' + (R.ui.cat === c ? 'on' : '') + '" onclick="G.relics.setCat(\'' + c + '\')">' + (c === 'all' ? 'Все' : (c0.e || '') + ' ' + esc(c0.s || c0.n)) + (n ? ' <b>' + n + '</b>' : '') + '</button>';
    }).join('') + '</div>';
    h += '<div class="rl-chips rl-rchips">' + ['all'].concat(Object.keys(rars()).sort((a, b) => rars()[a].order - rars()[b].order)).map(r => {
      const r0 = rars()[r];
      return '<button class="' + (R.ui.rar === r ? 'on' : '') + '" ' + (r === 'all' ? '' : 'style="--rc:' + r0.color + '"') + ' onclick="G.relics.setRar(\'' + r + '\')">' + (r === 'all' ? 'Любая редкость' : '<i class="rl-dot"></i>' + esc(r0.n)) + '</button>';
    }).join('') + '</div>';
    return h;
  }
  R.tabHTML = function () {
    const st = ensure();
    if (R.ui.view) return detailHTML(st);
    let list = entries().filter(e => (R.ui.cat === 'all' || e.it.category === R.ui.cat) && (R.ui.rar === 'all' || (e.kind !== 'mystery' && e.it.rarity === R.ui.rar)));
    let h = head(st) + chips(st);
    if (!list.length) {
      const c = cats()[R.ui.cat];
      h += '<div class="rl-empty">' + GEAR + '<h4>' + (R.ui.cat === 'all' || !c ? 'Полка пока пуста' : esc(c.n) + ': пока пусто') + '</h4><p>'
        + esc(R.ui.rar !== 'all' ? 'Предметов такой редкости пока нет. Всё впереди: завод помнит тех, кто работает.' : c ? c.empty : 'Награды за стажировку, смены и поступки появятся здесь. Каждая — на память и навсегда.') + '</p></div>';
    } else {
      h += '<div class="rl-case"><div class="rl-grid">' + list.map(e => tile(e, st)).join('') + '</div></div>';
    }
    const hist = st.items.slice().sort((a, b) => b.acquiredAt - a.acquiredAt).slice(0, 8);
    h += '<div class="card rl-hist"><h3>Хроника наград</h3>' + (hist.length ? hist.map(x => {
      const it = catalog()[x.itemId]; if (!it) return '';
      return '<button class="rl-hrow" onclick="G.relics.open(\'' + x.gid + '\')"><img src="' + esc(it.image) + '" alt=""><span><b>' + esc(it.name) + '</b><small>' + fmtDate(x.acquiredAt) + (x.gameDay != null ? ' · день ' + x.gameDay : '') + ' · ' + esc(x.acquisitionSource) + '</small></span></button>';
    }).join('') : '<div class="note">Записей пока нет. Первая награда будет вручена за стажировку.</div>') + '</div>';
    h += '<div class="note rl-foot">Коллекция хранится на этом устройстве отдельно от прохождения и не сбрасывается при «Начать заново».</div>';
    return h;
  };

  function detailHTML(st) {
    const v = R.ui.view; let inst = null, it = null;
    if (v.gid) { inst = st.items.find(x => x.gid === v.gid); it = inst && catalog()[inst.itemId]; } else it = catalog()[v.id];
    if (!it) { R.ui.view = null; return R.tabHTML(); }
    const mystery = !inst && it.hidden, locked = !inst && !it.hidden;
    const cls = mystery ? 'mystery' : it.rarity;
    let h = '<button class="rl-back" onclick="G.relics.back()">← К коллекции</button>';
    h += '<div class="rl-detail rl-r-' + cls + (inst ? '' : ' ' + (mystery ? 'mystery' : 'locked')) + '"><div class="rl-d-top"><div class="rl-frame"><img src="' + esc(it.image) + '" alt="" draggable="false">' + (mystery ? '<b class="rl-q big">?</b>' : '') + '</div>'
      + '<div class="rl-ribbon">' + (mystery ? 'Тайна завода' : esc(rr(it.rarity).n)) + '</div>'
      + '<h2>' + (mystery ? '???' : esc(it.name)) + '</h2>'
      + '<div class="rl-meta">' + (cats()[it.category] ? (cats()[it.category].e || '') + ' ' + esc(cats()[it.category].n) : '') + '</div></div>';
    if (mystery) {
      h += '<div class="rl-sec"><h5>Что известно</h5><p>' + esc(it.hint || 'Об этом предмете ничего не известно. Он откроется, когда ты его заслужишь.') + '</p></div>';
    } else {
      h += '<div class="rl-sec"><h5>Описание</h5><p>' + esc(it.description) + '</p></div>';
      if (inst || it.lore) h += '<div class="rl-sec"><h5>История предмета</h5><p class="rl-lore">' + esc(it.lore) + '</p></div>';
      h += '<div class="rl-sec"><h5>' + (inst ? 'История получения' : 'Как получить') + '</h5>';
      if (inst) {
        h += '<div class="kv"><span>Получен</span><span>' + fmtDate(inst.acquiredAt) + (inst.gameDay != null ? ' · день ' + inst.gameDay : '') + '</span></div>'
          + '<div class="kv"><span>Источник</span><span>' + esc(inst.acquisitionSource) + '</span></div>'
          + (inst.acquisitionDescription ? '<p class="rl-hist-t">' + esc(inst.acquisitionDescription) + '</p>' : '')
          + '<div class="kv"><span>Условие</span><span>' + esc(it.acquisition) + '</span></div>'
          + '<div class="kv rl-gid"><span>№ выдачи</span><span>' + esc(inst.gid) + '</span></div>';
      } else {
        h += '<p>' + esc(it.acquisition) + '</p><p class="note">Источник: ' + esc(it.source) + '</p>';
      }
      h += '</div>';
    }
    return h + '</div>';
  }

  // ============================================================ ПЕРЕНОС НА СЕРВЕР (заготовка)
  // Снимок для отправки на сервер (когда он появится).
  R.exportState = () => JSON.parse(JSON.stringify(ensure()));
  // Объединение с серверной копией БЕЗ дублей: выдачи сопоставляются по grantKey, «получено» побеждает «ждёт выбора».
  // Ничего не удаляет. Сам по себе нигде не вызывается: серверной части пока нет.
  R.mergeRemote = function (remote) {
    const st = ensure(), r = norm(remote);
    r.items.forEach(x => { if (!st.grants[x.grantKey] && !st.items.some(y => y.gid === x.gid)) { st.items.push(x); st.grants[x.grantKey] = x.gid; } });
    Object.keys(r.grants).forEach(k => { if (!st.grants[k]) st.grants[k] = r.grants[k]; });
    Object.keys(r.offers).forEach(k => { const a = st.offers[k], b = r.offers[k]; if (!a || (a.status !== 'claimed' && b.status === 'claimed')) st.offers[k] = b; });
    Object.keys(r.seen).forEach(k => { st.seen[k] = 1; });
    persist(); return st;
  };

  // ============================================================ ПОДКЛЮЧЕНИЕ К ИГРЕ
  // При запуске сохранённой игры проверяем старых игроков и неполученные награды.
  const UI = G.ui;
  if (UI && UI.setSub) { const _ss = UI.setSub; UI.setSub = function (x) { if (x === 'relics') R.ui.view = null; return _ss.apply(this, arguments); }; }
  if (UI && UI.continueGame) {
    const _cg = UI.continueGame;
    UI.continueGame = function () { const r = _cg.apply(this, arguments); try { R.reconcile(); } catch (e) { console.error(e); } return r; };
  }
})();
