/* ===== Интерфейс: экраны, вкладки, модальные окна, тосты ===== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.D, K = G.career;
  const UI = (G.ui = { tab: 'shift', sub: 'file', place: null, mode: 'title', draft: null, step: 0, cleanup: null, taps: 0 });
  const $ = id => document.getElementById(id);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const IMG = { gate: 'assets/bg_gate.jpg', checkpoint: 'assets/bg_checkpoint.jpg' };

  const LOCS = {
    shop: { n: 'Цех', i: '🏭', d: 'Гул станков, масло, запах горячего металла.' },
    admin: { n: 'Заводоуправление', i: '🏢', d: 'Коридоры с линолеумом, двери с табличками.' },
    otk: { n: 'ОТК', i: '🔍', d: 'Чистый стол, штангенциркуль, строгий взгляд.' },
    yard: { n: 'Двор / курилка', i: '🚬', d: 'Лавочка, урна, вид на трубы.' },
    med: { n: 'Медпункт', i: '⚕️', d: 'Зелёнка, бинты и запах хлорки.' },
    locker: { n: 'Раздевалка', i: '🚪', d: 'Ряды шкафчиков и мокрый пол.' },
    canteen: { n: 'Столовая', i: '🍲', d: 'Запах борща и гул голосов.' }
  };

  // ---------- Вспомогательное
  function bar(label, v, kind, inv) {
    v = Math.max(0, Math.min(100, v));
    let c = kind || '';
    if (!kind) { if (inv) c = v > 60 ? 'bad' : v > 30 ? 'warn' : ''; else c = v < 25 ? 'bad' : v < 45 ? 'warn' : ''; }
    return '<div class="bar ' + c + '"><i style="width:' + v + '%"></i><span><b>' + label + '</b><em style="font-style:normal">' + Math.round(v) + '</em></span></div>';
  }
  function groupActs(list) {
    const g = {}, order = [];
    list.forEach(a => { const k = a.g || 'Разное'; if (!g[k]) { g[k] = []; order.push(k); } g[k].push(a); });
    return order.map(k => '<div class="grp">' + k + '</div><div class="btns">' + g[k].map(actBtn).join('') + '</div>').join('');
  }
  function actBtn(a) {
    const s = G.s, why = G.avail(a);
    let tag = '';
    if (a.h && !a.menu) tag = s.phase === 'lunch' ? '1 оч.' : a.h + ' ч';
    if (a.cost && a.n.indexOf('₽') < 0) tag += (tag ? ' · ' : '') + G.rub(a.cost);
    const rk = a.risk ? '<span class="tag rk">⚠ ' + G.catchChance(a.risk) + '%</span>' : '';
    return '<button class="btn ' + (a.risk ? 'red' : '') + '" ' + (why ? 'disabled' : '') + ' onclick="G.ui.act(\'' + a.id + '\')">' + (a.i || '') + ' ' + a.n + rk + (tag ? '<span class="tag">' + tag + '</span>' : '') + (why ? '<small>' + why + '</small>' : '') + '</button>';
  }
  function visibleActs(filter) {
    return Object.values(G.ACT).filter(a => filter(a)).filter(a => { const w = G.avail(a); return w !== 'Сейчас недоступно' && w !== 'Не здесь'; });
  }
  UI.act = id => G.runAction(id);
  function petClick(id) { return id === 'chugunok' ? "G.petMenu('cat')" : id === 'chugun' ? "G.petMenu('dog')" : "G.npcMenu('" + id + "')"; }
  function people(loc) {
    const ids = G.peopleAt(loc);
    ids.forEach(id => { G.R(id).met = true; });
    if (!ids.length) return '';
    return '<div class="ppl">' + ids.map(id => '<button class="pp" onclick="' + petClick(id) + '">' + (G.relFace ? G.relFace(id) : G.faceHTML(id)) + D.NPC[id].name.split(' ')[0] + '</button>').join('') + '</div>';
  }

  // ---------- Рендер
  UI.render = function () {
    const el = $('screen'), s = G.s;
    const top = $('top'), nav = $('nav');
    const keep = el.scrollTop;
    let html = '', game = false;
    if (s && s.end) html = ending();
    else if (s && s.phase !== 'new') { game = true; html = gameScreen(); }
    else if (s && s.phase === 'new') html = '<div class="title-scr" style="background-image:url(' + IMG.checkpoint + ')"><div class="logo"><small>Отдел кадров</small><h1>Оформление…</h1></div></div>';
    else if (UI.mode === 'create') html = create();
    else html = title();
    top.classList.toggle('hide', !game); nav.classList.toggle('hide', !game);
    if (game) { top.innerHTML = topbar(); nav.innerHTML = navHTML(); }
    el.innerHTML = html;
    if (UI.keepScroll) el.scrollTop = keep; else el.scrollTop = 0;
    UI.keepScroll = false;
  };

  function topbar() {
    const s = G.s, st = s.st;
    const nick = G.nickLabel();
    const bars = bar('❤ Здоровье', st.health) + bar('⚡ Энергия', st.energy) + bar('🙂 Настроение', st.mood) + bar('🍲 Сытость', st.satiety)
      + (st.drunk > 2 ? bar('🍺 Опьянение', st.drunk, 'rust', 1) : '') + (s.hang > 0 ? bar('🤕 Похмелье', s.hang * 50, 'bad') : '') + (st.craving >= 40 ? bar('🥃 Тяга', st.craving, '', 1) : '') + (st.neat < 50 ? bar('🧼 Опрятность', st.neat) : '');
    const ri = G.rankInfo ? G.rankInfo() : { stars: 0, mgmt: false, line: '' };
    let starsH = '';
    for (let k = 1; k <= 5; k++) starsH += '<i class="' + (k <= ri.stars ? (ri.mgmt ? 'sw' : 'sy') : 'sg') + '">★</i>';
    const rankH = '<div class="tb-rank"><b>' + esc(G.jobTitle()) + '</b>' + (ri.noStars ? '' : '<span class="stars">' + starsH + '</span>') + '</div>';
    const subH = '<div class="tb-prog">' + ri.line + '</div>';
    const nickH = '<div class="tb-nick">' + (nick ? '<span class="nk">«' + esc(nick) + '»</span> ' : '') + esc(G.status()) + (G.admirerMark ? G.admirerMark() : '') + '</div>';
    return '<div class="tb-row"><div class="tb-face" onclick="G.ui.dbgTap()">' + G.playerFace() + '</div><div class="tb-info"><div class="tb-name">' + esc(s.name) + '</div>' + rankH + subH + nickH + '</div><div class="tb-right"><div class="tb-money">' + G.rub(s.money) + '</div><div class="tb-time">' + G.timeStr() + '</div><div class="tb-time">' + G.dateStr() + '</div></div></div><div class="bars">' + bars + '</div>';
  }
  function navHTML() {
    const ph = G.s && G.s.phase, home = !(ph === 'locker' || ph === 'work' || ph === 'lunch');
    const T = [['shift', home ? '🏠' : '⚙️', home ? 'Дом' : 'Смена'], ['city', '🏙️', 'Город'], ['people', '👥', 'Люди'], ['phone', '📱', 'Телефон'], ['rating', '🏆', 'Рейтинг'], ['file', '📋', 'Дело']];
    return T.map(t => '<button class="' + (UI.tab === t[0] ? 'on' : '') + '" onclick="G.ui.setTab(\'' + t[0] + '\')"><b>' + t[1] + '</b>' + t[2] + '</button>').join('');
  }
  UI.setTab = function (t) { UI.tab = t; if (t !== 'city') UI.place = null; UI.render(); };
  function gameScreen() {
    switch (UI.tab) { case 'city': return cityTab(); case 'people': return peopleTab(); case 'phone': return phoneTab(); case 'file': return fileTab(); case 'rating': return ratingTab(); default: return (G.shiftTop ? G.shiftTop() : '') + shiftTab() + (G.shiftExtras ? G.shiftExtras() : ''); }
  }

  // ---------- Вкладка СМЕНА
  function scene(bg, title, desc, cls) {
    return '<div class="scene ' + (cls || '') + '" style="' + (bg ? 'background-position:center 38%;background-image:url(' + bg + ')' : 'background:linear-gradient(135deg,#2a2622,#14110f)') + '"><div class="sc-t"><h2>' + title + '</h2><p>' + desc + '</p></div></div>';
  }
  function shiftTab() {
    const s = G.s, ph = s.phase;
    const wd = G.WDF[G.weekday()];
    let h = '';
    if (ph === 'morning') {
      const sick = s.car.sickUntil >= s.t.day;
      h += scene(IMG.gate, 'Утро. ' + wd, G.dateStr() + ', ' + G.season() + '. ' + (sick ? 'Ты на больничном/в отпуске.' : G.weekday() === 2 ? 'Среда — день проверки охраны труда!' : 'Впереди смена с 8:00.'), 'smoke');
      if (s.hang) h += '<div class="card"><b>🤕 Похмелье.</b> <span class="note">Рассол, молоко или плотный завтрак помогут.</span></div>';
      if (G.weekday() === 2) h += '<div class="card note">⚠ Сегодня проверяющая Надежда Николаевна. Нужны чистота, форма и трезвость. Дядя Лёша принюхается на проходной.</div>';
      h += people('shop');
      if (s.flags.povtDue) h += '<div class="card note">⚠ Просрочен повторный инструктаж — зайди к Пелагее Фёдоровне.</div>';
      h += groupActs(visibleActs(a => (a.ph || []).indexOf('morning') >= 0));
      h += '<div class="cta"><button class="btn big hazard" onclick="G.career.goToWork()">' + (sick ? 'ЭТО ВЫХОДНОЙ ПО БОЛЬНИЧНОМУ' : 'ИДТИ НА РАБОТУ →') + '</button></div>';
      return h;
    }
    if (ph === 'locker') {
      h += scene(IMG.checkpoint, 'Проходная и раздевалка', 'Турникет щёлкнул. Влажный пол отражает лампы.');
      h += people('locker');
      h += groupActs(visibleActs(a => (a.ph || []).indexOf('locker') >= 0));
      if (s.flags.loot && s.flags.loot.length) h += '<div class="card note">Ты уже принёс с собой «добычу» на смену?</div>';
      h += '<div class="cta"><button class="btn big hazard" onclick="G.career.toWorkplace()">К РАБОЧЕМУ МЕСТУ →</button></div>';
      return h;
    }
    if (ph === 'work' || ph === 'lunch') {
      const L = LOCS[s.loc] || LOCS.shop;
      const chips = ['shop', 'admin', 'otk', 'yard', 'med', 'locker'].concat(ph === 'lunch' ? ['canteen'] : []);
      h += scene(s.loc === 'yard' ? IMG.gate : s.loc === 'locker' ? IMG.checkpoint : null, L.i + ' ' + L.n, L.d + ' ' + (ph === 'lunch' ? 'Обеденный перерыв.' : 'Слотов до конца смены: ' + G.slotsLeft() + '.'), s.loc === 'yard' ? 'smoke' : 'sm');
      h += '<div class="chips">' + chips.map(c => '<button class="chip ' + (s.loc === c ? 'on' : '') + '" onclick="G.ui.go(\'' + c + '\')">' + LOCS[c].i + ' ' + LOCS[c].n + '</button>').join('') + '</div>';
      h += people(s.loc);
      if (s.loc === 'admin' && G.adminCard) h += G.adminCard();
      if (ph === 'lunch') h += '<div class="card note">Обед: осталось действий — <b>' + s.lunchAP + '</b>. Можно поесть, выпить молока, поболтать.</div>';
      const acts = visibleActs(a => a.loc === s.loc && ((a.ph || ['work']).indexOf('work') >= 0));
      if (G.friendsBlock) h += G.friendsBlock();
      h += groupActs(acts);
      if (s.dwg.none) h += '<div class="card note">⚠ Чертежа нет — Ебланов в запое. Работать нечем.</div>';
      if (ph === 'lunch') h += '<div class="cta"><button class="btn big hazard" onclick="G.endLunch()">ЗАКОНЧИТЬ ОБЕД →</button></div>';
      return h;
    }
    // вечер / выходной
    const free = G.shiftEnd ? 26 - s.t.hour : 0;
    h += scene(IMG.gate, ph === 'weekend' ? wd + ' — выходной' : 'Вечер после смены', G.dateStr() + ', ' + G.hourStr() + '. Свободных часов до глубокой ночи: ' + Math.max(0, free) + '. Город — во вкладке «Город».', 'smoke');
    h += people('home');
    if (s.car.sickUntil >= s.t.day) h += '<div class="card note">Ты на больничном/в отпуске до ' + G.dateStrOf(s.car.sickUntil) + '.</div>';
    if (G.friendsBlock) h += G.friendsBlock();
    h += groupActs(visibleActs(a => a.loc === 'home' && (a.ph || []).indexOf('free') >= 0));
    return h;
  }
  UI.go = function (loc) { G.s.loc = loc; UI.keepScroll = true; UI.render(); };

  // ---------- Город
  function cityTab() {
    const s = G.s;
    if (!G.isFree()) return scene(IMG.gate, 'Город закрыт до вечера', 'После смены или в выходной можно пойти в магазин, баню, рюмочную, на подработку.', 'sm') + '<div class="card note">Сейчас ты на заводе. ' + (s.phase === 'morning' ? 'Иди на работу.' : '') + '</div>';
    let h = '';
    if (UI.place) {
      const p = D.PLACES.find(x => x.id === UI.place);
      s.loc = p.id;
      const ppl = D.NPC_ORDER.filter(id => D.NPC[id].at && D.NPC[id].at.city && D.NPC[id].at.loc === p.id);
      h += '<div class="card"><button class="chip" onclick="G.ui.openPlace(null)">← Все места</button><h3 style="margin-top:8px">' + p.i + ' ' + p.n + '</h3><div class="note">' + p.d + '. Сейчас ' + G.hourStr() + ' (ночь — после 23:00).</div></div>';
      if (ppl.length) h += '<div class="ppl">' + ppl.map(id => { G.R(id).met = true; return '<button class="pp" onclick="G.npcMenu(\'' + id + '\')">' + (G.relFace ? G.relFace(id) : G.faceHTML(id)) + D.NPC[id].name.split(' ')[0] + '</button>'; }).join('') + '</div>';
      h += groupActs(visibleActs(a => a.loc === p.id && (a.ph || []).indexOf('free') >= 0));
      return h;
    }
    h += '<div class="card"><h3>Куда пойдёшь?</h3><div class="note">Каждое место — часы вечера. Сейчас ' + G.hourStr() + ' (доступно до 02:00).</div></div><div class="grid2">';
    h += D.PLACES.filter(p => p.id !== 'home').map(p => '<button class="tile" onclick="G.ui.openPlace(\'' + p.id + '\')"><b>' + p.i + '</b>' + p.n + '<small>' + p.d + '</small></button>').join('');
    return h + '</div>';
  }
  UI.openPlace = function (id) { UI.place = id; if (id) G.s.loc = id; UI.render(); };

  // ---------- Люди
  function peopleTab() {
    const s = G.s;
    const ids = D.NPC_ORDER.filter(id => (s.rel[id] && s.rel[id].met) || (id === 'chugun' && s.flags.dog) || (id === 'chugunok' && !s.flags.catHome));
    let h = '<div class="card"><h3>Знакомые</h3><div class="note">Тапни, чтобы поговорить (если человек рядом) или позвонить.</div></div>';
    if (!ids.length) h += '<div class="card note">Пока никого не знаешь. Выйди на смену — познакомишься.</div>';
    ids.forEach(id => {
      const n = D.NPC[id], r = s.rel[id] || {l:0,stage:0}, l = r.l;
      const loc = G.npcLoc(id);
      h += '<button class="pcard" onclick="' + petClick(id) + '">' + (G.relFace ? G.relFace(id) : G.faceHTML(id)) + '<div class="pi"><b>' + n.name + (G.isFriend && G.isFriend(id) ? ' 🤝' : '') + '</b><small>' + n.role + (n.romance && r.stage ? ' · ' + D.ROM_STAGES[Math.min(7, r.stage)] : '') + (loc && G.isPresent(id) ? ' · 📍здесь' : '') + '</small></div></button>';
    });
    return h;
  }

  // ---------- Телефон
  function phoneTab() {
    if (G.phoneScreen) return G.phoneScreen();
    const s = G.s;
    const tiles = [['📲', 'Контакты и звонки', 'G.phoneMenu()'], ['🏦', 'Банк', 'G.bankMenu()'], ['🎥', 'Блог «ЧугунTV»', 'G.blogMenu()'], ['🛍️', 'Магазин онлайн', 'G.shopMenu()'], ['🎒', 'Рюкзак', 'G.useMenu()'], ['📓', 'Журнал событий', 'G.ui.openLog()']];
    let h = '<div class="card"><h3>Телефон</h3><div class="note">Заряд 80%. Долг: ' + G.rub(s.debt) + (s.loans.length ? ' · кредитов: ' + s.loans.length : '') + '.</div></div><div class="grid2">';
    h += tiles.map(t => '<button class="tile" onclick="' + t[2] + '"><b>' + t[0] + '</b>' + t[1] + '</button>').join('') + '</div>';
    const callable = D.NPC_ORDER.filter(id => s.rel[id] && s.rel[id].met && (s.rel[id].l >= 10 || s.rel[id].stage >= 1));
    if (callable.length) h += '<div class="grp">Позвонить</div><div class="btns">' + callable.map(id => '<button class="btn blue" onclick="G.callNpc(\'' + id + '\')">📞 ' + D.NPC[id].name + '</button>').join('') + '</div>';
    return h;
  }
  UI.openLog = function () {
    const s = G.s;
    G.modal({ title: '📓 Журнал', wide: true, text: '<div style="max-height:55vh;overflow:auto">' + s.log.slice(0, 40).map(l => '<div class="log ' + l.c + '"><small>' + l.d + ' ' + l.t + '</small>' + l.x + '</div>').join('') + '</div>', opts: [{ t: 'Закрыть', fn: () => {} }] });
  };

  // ---------- Общий рейтинг: личный, предприятия, бригады
  const SECS = [['me', '👤 Личный', [['oj', 'Очки жизни'], ['season', 'Сезон'], ['money', 'Богатство'], ['pay', 'Зарплата'], ['rank', 'Карьера'], ['shifts', 'Смены']]],
    ['co', '🏭 Предприятия', [['profit', 'Прибыль'], ['made', 'Выпуск'], ['staff', 'Штат'], ['quality', 'Качество']]],
    ['br', '👥 Бригады', [['brig', 'Неделя']]]];
  const fmt = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  function valOf(by, r) {
    switch (by) {
      case 'oj': return fmt(r.oj); case 'season': return fmt(r.sb) + ' оч.'; case 'shifts': return r.shifts + ' см.'; case 'money': return fmt(r.money) + ' ₽'; case 'pay': return fmt(r.pay) + ' ₽/мес.';
      case 'profit': return fmt(r.profit) + ' ₽'; case 'made': return fmt(r.made) + ' дет.'; case 'staff': return r.staff + ' чел.'; case 'quality': return r.quality + '%';
      default: return D.RANKS[Math.min(10, r.rank)] || '—';
    }
  }
  function ratingTab() {
    const LB = G.lb, s = G.s, by = LB.by, sec = LB.sec || 'me';
    const cur = SECS.find(x => x[0] === sec) || SECS[0];
    let h = '<div class="card"><h3>🏆 Общий рейтинг</h3><div class="note">Лучшие работники, предприятия и бригады «Чугунного века» со всех устройств.</div></div>';
    h += '<div class="sub">' + SECS.map(x => '<button class="' + (sec === x[0] ? 'on' : '') + '" onclick="G.ui.setSec(\'' + x[0] + '\')">' + x[1] + '</button>').join('') + '</div>';
    if (cur[2].length > 1) h += '<div class="sub">' + cur[2].map(x => '<button class="' + (by === x[0] ? 'on' : '') + '" onclick="G.ui.setBy(\'' + x[0] + '\')">' + x[1] + '</button>').join('') + '</div>';
    if (!LB.configured()) return h + '<div class="card note">Рейтинг временно недоступен: не указан адрес сервера (API_URL в config.js).</div>';
    if (s.flags.dbg) h += '<div class="card note">⚠ Ты пользовался отладкой — твои результаты в рейтинг не отправляются.</div>';
    if (by === 'season' && G.seasonText) h += '<div class="card note">' + G.seasonText() + '</div>';
    if (G.settings.lbOn === false) h += '<div class="card note">Ты скрыт из рейтинга (настройка в «Деле»).</div>';
    const c = LB.cache[by];
    if (!c || Date.now() - c.t > 60000) LB.load(by);
    if (!c) return h + '<div class="card note">' + (LB.err ? 'Не удалось загрузить рейтинг (' + esc(LB.err) + '). <button class="chip" onclick="G.ui.reloadLb()">Повторить</button>' : 'Загрузка…') + '</div>';
    const d = c.data, medals = ['🥇', '🥈', '🥉'];
    if (by === 'brig') {
      h += '<div class="card note">Неделя ' + esc(d.week) + '. Очки бригады: смены × 100 + выпущенные детали у всех участников. Победители недели получают звание.</div>';
      if (d.last && d.last.top && d.last.top.length) h += '<div class="card note">Итоги прошлой недели (' + esc(d.last.week) + '): ' + d.last.top.map((x, i) => (medals[i] || '') + ' ' + esc(x.name) + ' — ' + fmt(x.pts)).join(' · ') + '</div>';
      if (d.my) {
        h += '<div class="card"><b>Твоя бригада: «' + esc(d.my.name) + '»</b>' + (d.my.owner ? ' (ты бригадир)' : '') + ' · место №' + (d.my.pos || '—') + ' · очки недели: ' + fmt(d.my.pts)
          + '<div class="note">' + d.my.members.map(m => (m.me ? '<b>' + esc(m.name) + '</b>' : esc(m.name)) + ' — ' + fmt(m.pts)).join(' · ') + '</div>'
          + '<div class="btns"><button class="btn" onclick="G.ui.brigLeave()">Выйти из бригады</button></div></div>';
      } else {
        h += '<div class="card"><b>Ты пока не в бригаде.</b><div class="note">Создай свою (до ' + (d.max || 10) + ' человек) или вступи в готовую. Для вступления нужно хотя бы раз отправить результат (доиграй смену).</div><div class="btns"><button class="btn" onclick="G.ui.brigCreate()">➕ Создать бригаду</button></div></div>';
      }
      if (LB.brigMsg) h += '<div class="card note">' + esc(LB.brigMsg) + '</div>';
      h += '<div style="padding:6px 10px 0">' + d.rows.map(r => '<div class="lbrow ' + (r.me ? 'me' : '') + '"><b>' + (medals[r.pos - 1] || '#' + r.pos) + '</b><div><span class="nm">' + esc(r.name) + '</span><small>' + r.members + ' из ' + (d.max || 10) + ' чел.' + (!d.my && r.members < (d.max || 10) ? ' · <a href="#" onclick="G.ui.brigJoin(\'' + esc(r.name).replace(/'/g, '') + '\');return false">вступить</a>' : '') + '</small></div><em>' + fmt(r.pts) + ' оч.</em></div>').join('') + '</div>';
      h += '<div class="btns"><button class="btn" onclick="G.ui.reloadLb()">↻ Обновить</button></div>';
      return h;
    }
    if (d.me) h += '<div class="card"><b>Твоё место: №' + d.me.pos + '</b> из ' + d.total + '<div class="note">' + esc(d.me.name) + ' · ' + esc(valOf(by, d.me)) + '</div></div>';
    else h += '<div class="card note">Всего в таблице: ' + d.total + '. ' + (sec === 'co' ? 'Предприятие появляется в рейтинге, когда у тебя есть сотрудники (должность бригадира и выше).' : 'Тебя в таблице пока нет — доработай смену до конца.') + '</div>';
    h += '<div style="padding:6px 10px 0">' + d.rows.map(r => '<div class="lbrow ' + (r.me ? 'me' : '') + '"><b>' + (medals[r.pos - 1] || '#' + r.pos) + '</b><div><span class="nm">' + esc(sec === 'co' ? (r.shop || r.name) : r.name) + '</span><small>' + (sec === 'co' ? esc(r.name) + ' · штат ' + r.staff + ' · выпуск ' + fmt(r.made) + ' · качество ' + r.quality + '%' : esc(r.job || '—') + ' · ' + r.shifts + ' смен' + (r.brigade ? ' · 👥 ' + esc(r.brigade) : '') + (r.end ? ' · ' + (D.ENDINGS[r.end] ? D.ENDINGS[r.end].e : '') : '')) + '</small></div><em>' + esc(valOf(by, r)) + '</em></div>').join('') + '</div>';
    h += '<div class="btns"><button class="btn" onclick="G.ui.reloadLb()">↻ Обновить</button></div>';
    if (LB.status) h += '<div class="note" style="padding:4px 12px;opacity:.6">Отправка результата: ' + esc(LB.status) + '</div>';
    return h;
  }
  UI.setSec = function (x) { const L = G.lb; L.sec = x; L.by = x === 'me' ? 'oj' : x === 'co' ? 'profit' : 'brig'; UI.render(); };
  UI.setBy = function (b) { G.lb.by = b; UI.render(); };
  UI.reloadLb = function () { G.lb.load(G.lb.by, true); G.lb.err = null; UI.render(); };
  UI.brigCreate = function () { const n = window.prompt('Название бригады (3–20 символов):', ''); if (n && n.trim()) G.lb.brig('brigade_create', n.trim()); };
  UI.brigJoin = function (n) { G.lb.brig('brigade_join', n); };
  UI.brigLeave = function () { if (window.confirm('Выйти из бригады?')) G.lb.brig('brigade_leave'); };

  // ---------- Дело (досье)
  function fileTab() {
    const s = G.s, st = s.st, c = s.car;
    const subs = [['file', 'Досье'], ['career', 'Карьера'], ['bag', 'Рюкзак'], ['relics', 'Коллекция' + (G.relics && G.relics.newCount() ? ' <b class="rl-badge">' + G.relics.newCount() + '</b>' : '')], ['log', 'Журнал']];
    let h = '<div class="sub">' + subs.map(x => '<button class="' + (UI.sub === x[0] ? 'on' : '') + '" onclick="G.ui.setSub(\'' + x[0] + '\')">' + x[1] + '</button>').join('') + '</div>';
    if (UI.sub === 'relics') return h + (G.relics ? G.relics.tabHTML() : '');
    if (UI.sub === 'career') {
      h += '<div class="card"><h3>' + G.jobTitle() + '</h3>';
      h += '<div class="kv"><span>Оклад (≈/мес)</span><span>' + G.rub(G.monthlyPay()) + '</span></div><div class="kv"><span>Смен отработано</span><span>' + c.shifts + '</span></div><div class="kv"><span>Баллы мастерства</span><span>' + Math.floor(st.bm) + '</span></div><div class="kv"><span>Выговоры</span><span>' + c.rep + ' / 3</span></div><div class="kv"><span>Записи в блокнотике</span><span>' + G.noteCount() + '</span></div><div class="kv"><span>Риск увольнения</span><span>' + G.fireRisk() + '%</span></div><div class="kv"><span>Профсоюз</span><span>' + (c.union ? 'да' : 'нет') + '</span></div></div>';
      if (c.rank === 0) h += '<div class="card"><h3>Испытательный срок</h3><div class="note">Отработано ' + c.probShifts + ' / 5 смен. После пяти смен — экзамен у Соплежуйкина; наставник после допуска больше не закрепляется.</div></div>';
      else if (c.rank < 10) {
        const L = K.reqLines(c.rank + 1);
        h += '<div class="card"><h3>Следующая цель: ' + K.nextRankName() + '</h3>' + L.map(x => '<div class="req ' + (x.ok ? 'ok' : 'no') + '">' + (x.ok ? '✅ ' : '❌ ') + x.t + '</div>').join('') + '<div class="note" style="margin-top:6px">Заявление подаётся у Татищевой (кадры) за взнос.</div></div>';
      }
      h += '<div class="card"><h3>Корочки</h3><div class="note">' + (c.certs.length ? c.certs.map(x => D.COURSES[x] ? D.COURSES[x].name : x).join('; ') : 'нет') + '</div><button class="btn" onclick="G.coursesMenu()">🎓 Курсы</button></div>';
      h += '<div class="card"><h3>Инструктажи</h3><div class="note">Вводный: ' + (s.instr.vvod != null ? '✅' : '❌') + ' · Первичный: ' + (s.instr.perv != null ? '✅' : '❌') + ' · Повторный: ' + (s.instr.povt != null ? 'нед.' + s.instr.povt : s.flags.povtDue ? '⚠ просрочен' : '—') + '</div></div>';
      return h;
    }
    if (UI.sub === 'bag') {
      h += '<div class="card"><h3>Деньги</h3><div class="kv"><span>Наличные</span><span>' + G.rub(s.money) + '</span></div><div class="kv"><span>Долги</span><span>' + G.rub(s.debt) + '</span></div>' + s.loans.map(l => '<div class="kv"><span>' + ({ bank: 'Кредит', micro: 'Микрозайм', mortgage: 'Ипотека' }[l.type]) + '</span><span>' + G.rub(l.left) + '</span></div>').join('') + '</div>';
      const ids = Object.keys(s.inv);
      h += '<div class="card"><h3>Рюкзак</h3>' + (ids.length ? ids.map(id => '<div class="kv"><span>' + (D.ITEMS[id] ? D.ITEMS[id].e + ' ' + D.ITEMS[id].n : id) + '</span><span>×' + s.inv[id] + '</span></div>').join('') : '<div class="note">Пусто.</div>') + '<button class="btn" onclick="G.useMenu()">Использовать вещь</button></div>';
      const own = Object.keys(s.own);
      h += '<div class="card"><h3>Статус</h3>' + (own.length ? own.map(k => '<div class="kv"><span>' + D.STATUS[k].e + ' ' + D.STATUS[k].n + '</span><span>✔</span></div>').join('') : '<div class="note">Ни часов, ни машины. Один паспорт.</div>') + '</div>';
      if (s.flags.loot && s.flags.loot.length) h += '<div class="card"><h3>Добыча</h3>' + s.flags.loot.map(x => '<div class="kv"><span>' + x.n + '</span><span>≈' + G.rub(x.v) + '</span></div>').join('') + '</div>';
      return h;
    }
    if (UI.sub === 'log') return h + s.log.slice(0, 60).map(l => '<div class="log ' + l.c + '"><small>' + l.d + ' ' + l.t + '</small>' + l.x + '</div>').join('');
    // досье
    h += '<div class="card" style="display:flex;gap:12px;align-items:center"><div class="prev" style="margin:0;flex:none;width:96px;height:96px">' + G.playerFace() + '</div><div><b style="font-family:var(--f-head);font-size:17px">' + esc(s.name) + '</b><div class="note">' + G.status() + '</div><div class="note">Очки жизни: <b style="color:var(--haz)">' + G.ojScore() + '</b></div>' + (s.nicks.length ? '<div class="note">Клички: ' + s.nicks.map(n => '«' + D.NICKS[n].n + '»').join(', ') + '</div>' : '') + '</div></div>';
    h += '<div class="card"><h3>Показатели</h3><div class="bars" style="grid-template-columns:1fr">' + [['❤ Здоровье', st.health], ['⚡ Энергия', st.energy], ['🙂 Настроение', st.mood], ['🍲 Сытость', st.satiety], ['🧼 Опрятность', st.neat], ['👔 Начальство', st.boss, 'blue'], ['🤝 Коллеги', st.coll, 'blue'], ['💪 Сила', (G.s.flags.str || 0), 'blue'], ['😎 Крутизна', st.cool, 'blue'], ['⚖ Совесть', st.cons, 'blue'], ['📘 Знания', st.know, 'blue'], ['☣ Токсичность', st.tox, '', 1], ['🥃 Тяга', st.craving, '', 1], ['🍾 Привычка', st.habit, '', 1], ['🍺 Опьянение', st.drunk, 'rust', 1]].map(x => bar(x[0], x[1], x[2], x[3])).join('') + '</div></div>';
    if (G.plantStats) { const ps = G.plantStats(); h += '<div class="card"><h3>🏭 Завод</h3><div class="bars" style="grid-template-columns:1fr">' + [['🏭 Состояние завода', ps.plant, 'blue'], ['📊 Выполнение плана', ps.plan, 'blue'], ['🎵 Настроение цеха', ps.morale, 'blue']].map(x => bar(x[0], x[1], x[2])).join('') + '</div></div>'; }
    if (G.progressCard) h += G.progressCard();
    const ach = Object.keys(s.ach);
    h += '<div class="card"><h3>Достижения (' + ach.length + ')</h3><div class="note">' + (ach.length ? ach.map(id => '<span style="display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;border:1px solid #000;border-left:4px solid #ffd24a;background:#1b1917">🏅 ' + (G.achName ? G.achName(id) : id) + '</span>').join('') : 'Пока нет.') + '</div></div>';
    h += '<div class="card"><h3>Настройки</h3><button class=\"btn\" onclick=\"G.ui.toggle(\'sound\')\">Звук: ' + (G.settings.sound ? 'вкл' : 'выкл') + '</button><button class=\"btn\" onclick=\"G.ui.toggle(\'music\')\">Музыка: ' + (G.settings.music ? 'вкл' : 'выкл') + '</button><button class="btn" onclick="G.ui.toggle(\'haptic\')">Вибрация: ' + (G.settings.haptic ? 'вкл' : 'выкл') + '</button><button class="btn" onclick="G.ui.toggle(\'tips\')">Подсказки: ' + (G.settings.tips ? 'вкл' : 'выкл') + '</button>' + (G.lb.configured() ? '<button class="btn" onclick="G.ui.toggleLb()">Показывать меня в рейтинге: ' + (G.settings.lbOn === false ? 'нет' : 'да') + '</button>' : '') + '<button class="btn red" onclick="G.ui.confirmNew()">Начать заново</button><button class="btn" onclick="G.ui.help()">Как играть</button></div>';
    return h;
  }
  UI.setSub = function (x) { UI.sub = x; UI.render(); };
  UI.toggle = function (k) { G.settings[k] = !G.settings[k]; G.save(); UI.keepScroll = true; UI.render(); };
  UI.toggleLb = function () { G.settings.lbOn = G.settings.lbOn === false ? true : false; G.save(); G.lb.submit(true); UI.keepScroll = true; UI.render(); };
  UI.confirmNew = function () { G.modal({ title: 'Начать заново?', text: 'Текущее сохранение будет стёрто.', cls: 'bad', opts: [{ t: 'Да, стереть', fn: () => { G.wipe(); UI.mode = 'title'; UI.render(); } }, { t: 'Отмена', fn: () => {} }] }); };
  UI.help = function () {
    G.modal({ title: 'Как играть', text: '<b>Цель</b> — выжить на заводе «Чугунный век» как можно дольше и подняться по карьере (или сбежать).<br><br>• День — это слоты по часам. Смена с 8:00, обед в 12:00.<br>• «РАБОТАТЬ» — мини-игра: жми, когда маркер в зелёной зоне. Это даёт баллы мастерства.<br>• Следи за здоровьем, настроением и сытостью. Опьянение, тяга, токсичность портят качество.<br>• Не попадайся начальству: выговоры (3 — увольнение), блокнотик Труханова, бинокль директора.<br>• Среда — проверка охраны труда. Аванс и зарплата — по пятницам.<br>• Вечером и в выходные — вкладка «Город»: магазин, баня, подработки, романтика.<br>• Люди запоминают, как ты с ними обошёлся.<br><br><i>Автосохранение — каждый ход.</i>', opts: [{ t: 'Понятно', fn: () => {} }] });
  };

  // ---------- Титул
  function title() {
    const rec = G.records();
    return '<div class="title-scr" style="background-image:url(' + IMG.gate + ')"><div class="logo"><small>Едрёносталь · Россия · XXI век</small><h1>ЧУГУННЫЙ<br>ВЕК</h1><p>Симулятор выживания на заводе, где дым густой, а начальство — гуще.</p></div><div class="stripe"></div><div class="btns">'
      + (G.hasSave() ? '<button class="btn big hazard" onclick="G.ui.continueGame()">ПРОДОЛЖИТЬ</button>' : '')
      + '<button class="btn big ' + (G.hasSave() ? '' : 'hazard') + '" onclick="G.ui.newGame()">НОВАЯ СМЕНА</button>'
      + '<button class="btn" onclick="G.ui.help()">Как играть</button>'
      + '<button class="btn" onclick="G.showChangelog()">Что нового</button>'
      + (rec.runs ? '<div class="note" style="text-align:center;margin-top:10px">Забегов: ' + rec.runs + ' · Рекорд очков жизни: ' + (rec.best || 0) + '</div>' : '') + '</div></div>';
  }
  UI.continueGame = function () {
    if (!G.s && !G.load()) { UI.newGame(); return; }
    UI.tab = 'shift'; UI.render();
  };
  UI.newGame = function () {
    if (G.hasSave() && !UI.confirmed) { G.modal({ title: 'Новая игра', text: 'Сохранение будет перезаписано при начале новой смены.', opts: [{ t: 'Начать', fn: () => { UI.confirmed = true; UI.newGame(); UI.confirmed = false; } }, { t: 'Отмена', fn: () => {} }] }); return; }
    G.s = null;
    let nm = '';
    try { const u = window.Telegram.WebApp.initDataUnsafe.user; if (u && u.first_name) nm = u.first_name; } catch (e) {}
    UI.draft = { name: nm, av: G.defaultAv(), edu: 'chpu' }; UI.step = 0; UI.mode = 'create'; UI.render();
  };

  // ---------- Создание героя
  function create() {
    const d = UI.draft, O = G.AV_OPTS;
    if (UI.step === 0) {
      const sw = (key, labels) => '<div class="sw">' + O[key].map((v, i) => '<button class="' + (d.av[key] === v ? 'on' : '') + (key === 'skin' || key === 'hc' || key === 'cloth' ? ' col' : '') + '" ' + (key === 'skin' || key === 'hc' || key === 'cloth' ? 'style="background:' + v + '"' : '') + ' onclick="G.ui.setAv(\'' + key + '\',\'' + v + '\')">' + (labels ? labels[i] : '') + '</button>').join('') + '</div>';
      const fld = (t, h) => '<div class="field"><label>' + t + '</label>' + h + '</div>';
      return '<div class="scene sm" style="background-image:url(' + IMG.checkpoint + ')"><div class="sc-t"><h2>Новый работник</h2><p>Расскажи, кто ты</p></div></div>'
        + '<div class="prev">' + G.avatar(Object.assign({ eyes: 'norm', nose: 'small', mouth: 'smile', extra: [] }, d.av)) + '</div>'
        + fld('Имя', '<input id="nm" maxlength="18" value="' + esc(d.name) + '" placeholder="Как тебя зовут?" oninput="G.ui.draft.name=this.value">')
        + fld('Кожа', sw('skin')) + fld('Причёска', sw('hair', ['Корот.', 'Зачёс', 'Кудри', 'Ёжик', 'Шипы', 'Длин.', 'Лысый', 'Лохм.'])) + fld('Цвет волос', sw('hc'))
        + fld('Форма лица', sw('shape', ['Круг', 'Овал', 'Квадрат', 'Длинное'])) + fld('Усы', sw('stache', ['Нет', 'Щётка', 'Тонкие', 'Моржовые'])) + fld('Борода', sw('beard', ['Нет', 'Щетина', 'Борода'])) + fld('Очки', sw('glasses', ['Нет', 'Круглые', 'Квадратные'])) + fld('Куртка', sw('cloth'))
        + '<div class="cta"><button class="btn big hazard" onclick="G.ui.toEdu()">ДАЛЕЕ: ОБРАЗОВАНИЕ →</button></div>';
    }
    return '<div class="scene sm" style="background-image:url(' + IMG.checkpoint + ')"><div class="sc-t"><h2>Образование</h2><p>Это определит стартовые вакансии и немного знаний</p></div></div><div class="btns">'
      + D.EDU.map(e => '<button class="edu" onclick="G.ui.pickEdu(\'' + e.id + '\')"><b>' + e.name + '</b><small>' + e.school + ' · знания +' + e.know + (e.certs.length ? ' · корочка: ' + e.certs.map(c => D.COURSES[c].name).join(', ') : '') + '</small></button>').join('')
      + '<button class="btn" style="margin-top:14px" onclick="G.ui.step=0;G.ui.render()">← Назад</button></div>';
  }
  UI.setAv = function (k, v) { UI.draft.av[k] = v; UI.keepScroll = true; UI.render(); };
  UI.toEdu = function () { if (!UI.draft.name.trim()) UI.draft.name = 'Заводчанин'; UI.step = 1; UI.render(); };
  UI.pickEdu = function (id) {
    const d = UI.draft;
    G.newState(d.name.trim() || 'Заводчанин', d.av, id);
    UI.mode = 'game'; UI.tab = 'shift';
    G.career.start(); G.pump();
  };

  // ---------- Концовка
  function ending() {
    const s = G.s, e = D.ENDINGS[s.end.id] || { e: '❓', t: 'КОНЕЦ', x: 'История закончилась.' };
    const rec = G.records();
    return '<div class="end-scr"><div class="em">' + e.e + '</div><h1>' + e.t + '</h1><p>' + e.x + '</p><div class="stripe"></div><div class="stat-list">'
      + '<div><span>Смен отработано</span><b>' + s.car.shifts + '</b></div><div><span>Должность</span><b>' + G.rankName() + '</b></div><div><span>Прожито дней</span><b>' + s.t.day + '</b></div><div><span>Деньги</span><b>' + G.rub(s.money) + '</b></div><div><span>Операций</span><b>' + s.stats.ops + '</b></div><div><span>Клички</span><b>' + (s.nicks.map(n => D.NICKS[n].n).join(', ') || '—') + '</b></div><div><span>Очки жизни</span><b style="color:var(--haz)">' + G.ojScore() + '</b></div><div><span>Рекорд</span><b>' + (rec.best || 0) + '</b></div></div>'
      + '<button class="btn big hazard" onclick="G.ui.restart()">НАЧАТЬ СНОВА</button></div>';
  }
  UI.restart = function () { G.wipe(); UI.mode = 'title'; UI.render(); };

  // ---------- Модальные окна и тосты
  UI.showModal = function (sp) {
    const root = $('modal-root'); root.classList.add('on');
    let h = '<div class="modal ' + (sp.cls || '') + '">';
    if (sp.bg && IMG[sp.bg]) h += '<div class="m-bg" style="background-image:url(' + IMG[sp.bg] + ')"></div>';
    if (sp.type === 'mini') { root.innerHTML = h + '<div id="mg-host"></div></div>'; UI.cleanup = G.runMini($('mg-host'), sp); return; }
    h += '<div class="m-head">' + (sp.face && D.NPC[sp.face] ? G.faceHTML(sp.face, 'lg') : '') + '<div class="m-title">' + sp.title + '</div></div>';
    if (sp.text) h += '<div class="m-text">' + G.fmt(sp.text) + '</div>';
    h += '<div class="m-opts">' + (sp.opts || []).map((o, i) => '<button class="btn ' + (o.cls || '') + '" ' + (o.dis ? 'disabled' : '') + ' onclick="G.choose(' + i + ')">' + o.t + (o.dis ? '<span class="why">' + o.dis + '</span>' : '') + '</button>').join('') + '</div></div>';
    root.innerHTML = h;
    const m = root.firstChild; if (m) m.scrollTop = 0;
  };
  UI.hideModal = function () {
    const root = $('modal-root'); root.classList.remove('on'); root.innerHTML = '';
    if (UI.cleanup) { try { UI.cleanup(); } catch (e) {} UI.cleanup = null; }
  };
  // ---------- Всплывающие изменения шкал (красные/зелёные цифры, плавно исчезают)
  const FX_INV = { drunk: 1, craving: 1, habit: 1, tox: 1 };
  const FX_ICON = { health: '❤', energy: '⚡', mood: '🙂', satiety: '🍲', neat: '🧼', drunk: '🍺', craving: '🥃', habit: '🍾', boss: '👔', coll: '🤝', cool: '😎', cons: '⚖', know: '📘', tox: '☣', money: '💰' };
  UI.floatFx = function (items) {
    const box = $('fxpops'), top = $('top');
    if (!box || !top || !G.s || G.s.phase === 'new' || top.classList.contains('hide')) return;
    box.style.top = (top.offsetHeight + 10) + 'px';
    let delay = 0;
    items.forEach(it => {
      const k = it[0], v = it[1]; if (k === 'bm' || !v) return;
      const good = FX_INV[k] ? v < 0 : v > 0;
      const d = document.createElement('div');
      d.className = 'fxpop ' + ((G.CONFIG.FX_ALL_RED || !good) ? 'neg' : 'pos');
      const sgn = v > 0 ? '+' : '−';
      d.textContent = (FX_ICON[k] || '') + ' ' + (k === 'money' ? sgn + G.rub(Math.abs(v)) : D.STAT_RU[k] + ' ' + sgn + Math.abs(Math.round(v * 10) / 10));
      d.style.animationDelay = delay + 'ms'; delay += 140;
      box.appendChild(d);
      setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 2700 + delay);
    });
    while (box.children.length > 8) box.removeChild(box.firstChild);
  };
  UI.toast = function (text, cls) {
    const box = $('toasts'); if (!box) return;
    const d = document.createElement('div'); d.className = 'toast ' + (cls || ''); d.innerHTML = text; box.appendChild(d);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 3800);
  };

  // ---------- Отладка (7 тапов по портрету)
  UI.dbgTap = function () {
    UI.taps++; clearTimeout(UI.tapT); UI.tapT = setTimeout(() => { UI.taps = 0; }, 1500);
    if (UI.taps >= 7) { UI.taps = 0; UI.debug(); }
  };
  UI.debug = function () {
    const s = G.s; s.flags.dbg = 1;
    G.modal({ title: '🛠 Отладка', wide: true, opts: [
      { t: '+10 000 ₽', fn: () => G.addMoney(10000) },
      { t: '+500 000 ₽', fn: () => G.addMoney(500000) },
      { t: 'Здоровье/энергия/настроение 100', fn: () => { ['health', 'energy', 'mood', 'satiety'].forEach(k => { s.st[k] = 100; }); } },
      { t: '+Ранг', fn: () => { s.car.rank = Math.min(9, s.car.rank + 1); s.car.job = s.car.job || 'podsob'; } },
      { t: '+50 смен', fn: () => { s.car.shifts += 50; s.st.bm += 500; s.st.know = 100; s.st.boss = 80; s.st.coll = 80; } },
      { t: 'Пропустить до вечера', fn: () => { if (s.phase === 'work' || s.phase === 'lunch') { s.t.hour = G.shiftEnd(); s.phase = 'work'; G.endShift(); } } },
      { t: 'Все корочки', fn: () => { Object.keys(D.COURSES).forEach(c => { if (s.car.certs.indexOf(c) < 0) s.car.certs.push(c); }); } },
      { t: 'Все знакомые', fn: () => { D.NPC_ORDER.forEach(id => { G.R(id).met = true; }); } },
      { t: 'Закрыть', fn: () => {} }
    ] });
  };
})();
