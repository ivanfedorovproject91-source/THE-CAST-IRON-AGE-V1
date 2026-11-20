/* ===== v3.15: доработки по отзывам игроков =====
   1) Похмелье ограничивает настроение (hangMoodCap).
   2) Окно «Вы на грани»: все способы поднять настроение реально работают (без телефона тоже).
   3) Баба Нюра — соседка (подработки, чай, сплетни); исчезает, когда игрок съезжает из общаги.
   4) «Отчебучить»: постепенное открытие, ранговые варианты для руководителей, последствия по должности.
   5) «Свои люди»: приглашения домой, в бар, на рыбалку, в гости.
   Модуль грузится последним (перед main.js) и только оборачивает существующие функции. */
(function () {
  'use strict';
  const G = window.G, D = G.D, C = G.clamp;
  const F = () => G.s.flags;
  const msg = (t, c) => G.toast(t, c);
  const first = id => (D.NPC[id] ? D.NPC[id].name.split(' ')[0] : id);
  const safe = fn => function () { try { return fn.apply(this, arguments); } catch (e) { if (window.console) console.error(e); } };
  const live = () => { const s = G.s; return !!(s && s.st && !s.end && s.phase !== 'new'); };
  const atWork = () => ['work', 'lunch', 'locker'].indexOf(G.s.phase) >= 0;
  const hour = () => G.s.t.hour;

  // =====================================================================
  // 1. ПОХМЕЛЬЕ ↔ НАСТРОЕНИЕ
  // =====================================================================
  // Лёгкое похмелье (1): настроение не выше 55; тяжёлое (2): не выше 35. Пока не вылечился или не отоспался — «хорошего» настроения нет.
  G.hangMoodCap = function () { const s = G.s; if (!s || !s.hang) return 100; return s.hang >= 2 ? 35 : 55; };
  function hangClamp(quiet) {
    if (!live() || !G.s.hang) return;
    const s = G.s, cap = G.hangMoodCap();
    if (s.st.mood > cap) {
      s.st.mood = cap;
      if (!quiet && s.flags.hangNote !== s.t.day) { s.flags.hangNote = s.t.day; msg('🤕 С похмелья хорошего настроения не бывает: выше ' + cap + ' не поднимется, пока не полечишься (рассол, молоко, плотный завтрак).', 'warn'); }
    }
  }
  const _fx = G.fx;
  G.fx = function () { const r = _fx.apply(this, arguments); try { hangClamp(false); } catch (e) {} return r; };
  const _adv = G.advance;
  G.advance = function () { const r = _adv.apply(this, arguments); try { hangClamp(false); } catch (e) {} return r; };
  const _sleep = G.sleep;
  G.sleep = function () {
    const s = G.s, mood0 = s.st.mood;
    const r = _sleep.apply(this, arguments);
    try {
      if (live()) {
        // с похмелья просыпаешься разбитым: настроение просаживается; без похмелья после полноценного сна из ямы выбираешься легче
        if (s.hang) s.st.mood = C(s.st.mood - (s.hang >= 2 ? 12 : 6));
        else if (mood0 < 40 && s.st.mood > mood0) s.st.mood = C(s.st.mood + 6);
        hangClamp(true);
      }
    } catch (e) { if (window.console) console.error(e); }
    return r;
  };
  const _sd = G.startDay;
  G.startDay = function () { const r = _sd.apply(this, arguments); try { hangClamp(true); } catch (e) {} return r; };

  // =====================================================================
  // 2. ОКНО НИЗКОГО НАСТРОЕНИЯ: способы, которые действительно работают
  // =====================================================================
  const moodDay = () => { const f = F(); f.v39 = f.v39 || {}; const m = f.v39; if (m.relDay !== G.s.t.day) { m.relDay = G.s.t.day; m.talks = 0; m.air = 0; } return m; };

  function talkRelief(id, gain, txt, hours) {
    const m = moodDay(); m.talks++;
    const k = m.talks <= 1 ? 1 : m.talks === 2 ? 0.7 : 0.4;          // повторные «разговоры по душам» работают слабее
    const sum = G.fx({ mood: Math.round(gain * k) });
    if (id) G.relAdd(id, 2);
    msg(txt + (sum ? ' (' + sum + ')' : ''), 'good');
    if (hours) G.spend(hours); else if (G.pump) G.pump();
  }
  G.moodTalkOptions = function () {
    const s = G.s, o = [], m = moodDay(), ph = s.phase, work = atWork(), free = G.isFree();
    const late = hour() + 1 > 26;
    // коллеги рядом (на смене)
    if (work) {
      const near = D.NPC_ORDER.filter(id => G.isPresent(id) && s.rel[id] && s.rel[id].met && !(G.isBoss && G.isBoss(id)) && id !== 'chugunok' && id !== 'chugun').slice(0, 3);
      near.forEach(id => o.push({ t: '💬 Выговориться ' + first(id) + ' (1 ч)', dis: ph === 'lunch' ? null : (G.slotsLeft && G.slotsLeft() < 1 ? 'Смена кончается' : null), fn: () => talkRelief(id, (G.isFriend && G.isFriend(id)) ? 10 : 6, first(id) + ' выслушал(а) и подбодрил(а).', 1) }));
      if (!near.length) o.push({ t: '💬 Перекинуться словом с коллегами (1 ч)', dis: ph === 'lunch' ? null : (G.slotsLeft && G.slotsLeft() < 1 ? 'Смена кончается' : null), fn: () => talkRelief(null, 5, 'Постояли в курилке, пожаловались на жизнь. Полегчало.', 1) });
    }
    // дома: соседка, питомец, друзья по телефону (если он есть), соседи
    if (!work) {
      if (G.nyuraHere && G.nyuraHere()) o.push({ t: '👵 Зайти к бабе Нюре (чай и разговоры)', dis: late ? 'Поздно' : null, fn: () => G.nyuraMenu() });
      if (F().catHome) o.push({ t: '🐈 Погладить Чугунка', fn: () => G.petMenu('cat') });
      const hasPhone = G.phoneTier && G.phoneTier() > 0;
      if (hasPhone) {
        const fr = (G.friends ? G.friends() : []).filter(id => !(G.npcGone && G.npcGone(id)) && !(G.isBoss && G.isBoss(id))).slice(0, 2);
        fr.forEach(id => o.push({ t: '📞 Позвонить ' + first(id) + ' (1 ч)', dis: late ? 'Поздно' : null, fn: () => { if (!G.phoneOk(1)) return; G.phoneDrain && G.phoneDrain(3); talkRelief(id, 9, first(id) + ' поднял(а) тебе настроение по телефону.', 1); } }));
      }
      if (ph !== 'morning') o.push({ t: '🚪 Постучаться к соседу по общаге (1 ч)', dis: late ? 'Поздно' : null, fn: () => talkRelief(null, 5, 'Посидели на кухне с соседом, пожаловались на коммуналку. Стало легче.', 1) });
    }
    if (!o.length) o.push({ t: '🧘 Остановиться и выдохнуть (1 ч)', fn: () => talkRelief(null, 4, 'Ты сел(а), закрыл(а) глаза и пять минут просто дышал(а).', 1) });
    return o;
  };
  G.moodTalk = function () {
    const o = G.moodTalkOptions(); o.push({ t: 'Назад', fn: () => {} });
    G.modal({ title: '💬 Поговорить по душам', wide: true, text: 'С кем получится поговорить прямо сейчас? Телефон нужен только для звонков — поговорить можно и вживую.', opts: o });
  };
  G.moodReliefOpts = function () {
    const s = G.s, m = moodDay(), ph = s.phase, morning = ph === 'morning';
    const air = {
      t: '🌬 Выйти на воздух (' + (morning ? 'пара минут, +6' : '1 ч, +8') + ' настроения)',
      dis: m.air ? 'Сегодня уже выходил(а)' : (!morning && hour() + 1 > 26) ? 'Слишком поздно' : (ph === 'work' && G.slotsLeft && G.slotsLeft() < 1) ? 'Смена кончается' : null,
      fn: () => {
        m.air = 1;
        const sum = G.fx({ mood: morning ? 6 : 8, energy: 1 });
        msg('Ты постоял(а) на крыльце, подышал(а) и чуть пришёл(ла) в себя' + (sum ? ' (' + sum + ')' : '') + '.', 'good');
        if (!morning) G.spend(1);
      }
    };
    const o = [air, { t: '👥 Поговорить с кем-нибудь', fn: () => G.moodTalk() }];
    if (F().catHome && !atWork()) o.push({ t: '🐈 Погладить Чугунка', fn: () => G.petMenu('cat') });
    o.push({ t: 'Ок', fn: () => {} });
    return o;
  };

  // =====================================================================
  // 3. БАБА НЮРА — СОСЕДКА
  // =====================================================================
  const NY = 'nyura';
  G.nyuraHere = () => !!(G.housing && G.housing() === 'dorm');
  G.npcGone = id => id === NY && !G.nyuraHere();
  const _friends = G.friends;
  G.friends = function () { return _friends.apply(this, arguments).filter(id => !G.npcGone(id)); };
  const _isPresent = G.isPresent;
  G.isPresent = function (id) { return G.npcGone(id) ? false : _isPresent.apply(this, arguments); };

  const NY_JOBS = [
    { n: '🚰 Починить капающий кран', h: 1, pay: [400, 700], fx: { energy: -6 }, t: 'Кран капал с 1998 года. Теперь молчит. Баба Нюра подозрительно проверила — и расплатилась.' },
    { n: '🥔 Покопать картошку на огороде', h: 3, pay: [700, 1100], fx: { energy: -14, health: 1 }, season: ['осень', 'лето'], t: 'Картошка осталась в мешках, поясница — в трёх частях. Нюра рассчиталась и насыпала в придачу.' },
    { n: '🪟 Заклеить окна на зиму', h: 2, pay: [500, 800], fx: { energy: -8 }, season: ['осень', 'зима'], t: 'Окна заклеены газетами «Едрёносталь Вечерний». Теперь в комнате тепло и очень информативно.' },
    { n: '🛒 Сходить на рынок с тележкой', h: 1, pay: [250, 450], fx: { energy: -5 }, t: 'Ты донёс(ла) картошку, капусту и сплетни. Всё в целости.' },
    { n: '🧺 Выстирать и развесить бельё', h: 1, pay: [300, 500], fx: { energy: -5 }, t: 'Бельё висит по системе. Систему ты так и не понял(а), но Нюра довольна.' },
    { n: '🥒 Закрутить банки с огурцами', h: 2, pay: [350, 600], fx: { energy: -7, satiety: 8 }, season: ['осень', 'лето'], t: 'Банок — как болтов на складе. Пять достаются тебе.', gain: { bread: 0 } },
    { n: '🪵 Перетаскать мешки и ящики в кладовку', h: 2, pay: [500, 850], fx: { energy: -12 }, t: 'Ящики были тяжёлые, а Нюра — командная. Расплатилась честно.' }
  ];
  const nyJobToday = () => {
    const s = G.s, f = F(); f.v39 = f.v39 || {};
    if (!G.nyuraHere()) return null;
    const rel = G.R(NY).l, p = 0.3 + Math.max(0, rel) / 160;      // чем лучше отношения, тем чаще у неё есть дело
    if (G.hash(s.t.day, 39, 7) >= p) return null;
    const sea = G.season(), pool = NY_JOBS.filter(j => !j.season || j.season.indexOf(sea) >= 0);
    return pool[Math.floor(G.hash(s.t.day, 39, 11) * pool.length)];
  };
  const nyIntro = () => {
    const rel = G.R(NY).l;
    if (rel < 10) return '«Здравствуй, милок. Ты кто будешь? Из восьмой? А-а, из четырнадцатой. Заходи, не стой на сквозняке».';
    if (rel < 40) return '«Заходи-заходи! Чай горячий, сушки вчерашние. Рассказывай, как на заводе».';
    if (rel < 70) return '«А вот и мой хороший! Я как раз пирожки поставила. Садись, а то стоишь, как на проходной».';
    return '«Родной ты мой… Садись. Всё расскажи. И не спорь, а то обижусь».';
  };
  const nyDone = (s, k) => { const f = F(); f.v39 = f.v39 || {}; return f.v39[k] === s.t.day; };
  const nyMark = k => { const f = F(); f.v39 = f.v39 || {}; f.v39[k] = G.s.t.day; };
  G.nyuraMenu = function () {
    const s = G.s, r = G.R(NY);
    r.met = true;
    if (!G.nyuraHere()) { G.info('Баба Нюра', 'Баба Нюра осталась в общаге: ты здесь больше не живёшь.'); return; }
    if (atWork() || s.phase === 'morning') { G.info('Баба Нюра', 'Баба Нюра у себя в общаге. Загляни к ней вечером или в выходной — сейчас тебе не до того.'); return; }
    if (hour() >= 24) { G.info('Баба Нюра', 'За стенкой тихо: Баба Нюра давно спит. Зайдёшь завтра.'); return; }
    const o = [], job = nyJobToday(), late = h => hour() + h > 26;
    o.push({ t: '☕ Попить чай с бабой Нюрой (1 ч)', dis: nyDone(s, 'nyTea') ? 'Сегодня уже пили чай' : late(1) ? 'Поздно' : null, fn: () => {
      nyMark('nyTea'); const sum = G.fx({ mood: 6, satiety: 6, energy: 2 }); G.relAdd(NY, 3);
      msg('Чай, сушки и бесконечные истории про «вот в наше время». Душевно' + (sum ? ' (' + sum + ')' : '') + '.', 'good'); G.spend(1);
    } });
    o.push({ t: job ? '🧺 Помочь: ' + job.n + ' (' + job.h + ' ч, ≈' + G.rub(Math.round((job.pay[0] + job.pay[1]) / 2)) + ')' : '🧺 Спросить, не нужна ли помощь', dis: nyDone(s, 'nyJob') ? 'Сегодня уже помогал(а)' : (!job ? null : (late(job.h) ? 'Слишком поздно' : (s.st.energy < 10 ? 'Нет сил' : null))), fn: () => {
      if (!job) { msg('Баба Нюра: «Сегодня дел нет, милок. Заходи завтра — что-нибудь найдётся».', 'tip'); return; }
      nyMark('nyJob');
      const mult = 1 + Math.max(0, r.l) / 200, pay = Math.round(G.ri(job.pay[0], job.pay[1]) * mult / 10) * 10;
      G.addMoney(pay); G.relAdd(NY, 3); const sum = G.fx(Object.assign({ mood: 2 }, job.fx));
      let extra = '';
      if (r.l >= 60 && G.chance(20)) { G.addMoney(300); extra = ' Сверху она сунула «на конфетки» ещё 300 ₽.'; }
      if (job.n.indexOf('картошку') >= 0 || job.n.indexOf('огурцами') >= 0) { G.give('bread', 1); extra += ' Дала с собой пирожков.'; }
      msg(job.t + ' +' + G.rub(pay) + (sum ? ' (' + sum + ')' : '') + '.' + extra, 'good'); G.spend(job.h);
    } });
    o.push({ t: '🥧 Попросить пирожков', dis: r.l < 20 ? 'Пока рано просить (отношение от 20)' : nyDone(s, 'nyFood') ? 'Сегодня уже кормила' : null, fn: () => {
      nyMark('nyFood'); const sum = G.fx({ satiety: 26, mood: 3 }); msg('Баба Нюра: «Ешь, а то худой, как чугунная палка!»' + (sum ? ' (' + sum + ')' : ''), 'good'); G.spend(1);
    } });
    o.push({ t: '👂 Послушать сплетни про общагу (1 ч)', dis: nyDone(s, 'nyGossip') ? 'Сегодня уже всё рассказала' : late(1) ? 'Поздно' : null, fn: () => {
      nyMark('nyGossip'); G.relAdd(NY, 2);
      const tips = [
        ['Баба Нюра: «У Егорыча слабость — кроссворды. Подари газету — размякнет». Всё понятно.', { mood: 3 }],
        ['Баба Нюра: «В третьей комнате живёт тип, он по ночам точит. Что точит — не говорит».', { mood: 4 }],
        ['Баба Нюра шепчет: «Коменданту завезли новый замок. Старый, говорят, был слишком открытый».', { mood: 3 }],
        ['Баба Нюра: «Ты, милок, не пей по средам. Надежда Николаевна — она всех видит». Дельный совет.', { mood: 3, cons: 1 }],
        ['Баба Нюра: «Кактус мой вчера пел. Про тебя пел. Хорошо пел».', { mood: 5 }]
      ];
      const t = G.pick(tips); const sum = G.fx(t[1]); msg(t[0] + (sum ? ' (' + sum + ')' : ''), 'good'); G.spend(1);
    } });
    o.push({ t: '🎁 Подарить', fn: () => G.giftMenu(NY) });
    o.push({ t: 'Закрыть', fn: () => {} });
    const hint = job ? '<br><small>У неё есть дело — можно подзаработать.</small>' : '';
    G.modal({ title: '👵 Баба Нюра', face: NY, wide: true, text: 'Соседка по общаге, комната за стенкой. ' + nyIntro() + '<br>' + (G.relBig ? G.relBig(NY) : '') + hint, opts: o });
  };
  const _npcMenu = G.npcMenu;
  G.npcMenu = function (id) { if (id === NY) return G.nyuraMenu(); return _npcMenu.apply(this, arguments); };
  const _talkTo = G.talkTo;
  G.talkTo = function (id) { if (id === NY) return G.nyuraMenu(); return _talkTo.apply(this, arguments); };
  if (G.talkMenu) { const _tm = G.talkMenu; G.talkMenu = function (id) { if (id === NY) return G.nyuraMenu(); return _tm.apply(this, arguments); }; }
  const _callNpc = G.callNpc;
  G.callNpc = function (id) {
    if (id === NY) { G.info('Баба Нюра', 'У бабы Нюры нет телефона. Она живёт за стенкой — загляни к ней вечером.'); return; }
    return _callNpc.apply(this, arguments);
  };
  // «Зайти к бабе Нюре» из блока «Дом» и «Огород» — только пока живёшь в общаге
  if (G.ACT && G.ACT.nyura) { G.ACT.nyura.menu = true; G.ACT.nyura.n = 'Зайти к бабе Нюре'; G.ACT.nyura.h = 0; G.ACT.nyura.fx = null; G.ACT.nyura.req = () => (G.nyuraHere() ? null : 'Ты здесь больше не живёшь'); G.ACT.nyura.fn = () => { G.nyuraMenu(); return 'custom'; }; G.ACT.nyura.noEvent = true; }
  if (G.ACT && G.ACT.dacha) { const old = G.ACT.dacha.req; G.ACT.dacha.req = s => (!G.nyuraHere() ? 'Огород остался у бабы Нюры в общаге' : (old ? old(s) : null)); }
  // исчезновение при переезде: один раз сообщаем игроку
  function nyuraWatch() {
    if (!live()) return;
    const f = F(); f.v39 = f.v39 || {};
    if (!G.nyuraHere()) {
      if (G.R(NY).met && !f.v39.nyuraBye) { f.v39.nyuraBye = 1; G.modal({ title: '👵 Баба Нюра осталась в общаге', face: NY, text: 'Ты съехал(а) — а баба Нюра осталась за стенкой. Без неё в новом жилье непривычно тихо. Если вернёшься в общагу, она будет на месте и поставит чайник.', opts: [{ t: 'Ок', fn: () => {} }] }); }
    } else if (f.v39.nyuraBye) f.v39.nyuraBye = 0;
  }
  const _dt = G.dailyTick;
  G.dailyTick = function () { const r = _dt.apply(this, arguments); try { nyuraWatch(); } catch (e) {} return r; };
  const _es = G.endShift;
  G.endShift = function () { const r = _es.apply(this, arguments); try { nyuraWatch(); } catch (e) {} return r; };
  // у «соседки» в общаге из событий «угостила огурцами» тоже есть условие
  try { const ev = (G.EV || []).find(e => e && e.id === 'babka'); if (ev) { const oc = ev.cond; ev.cond = s => G.nyuraHere() && (!oc || oc(s)); } } catch (e) {}

  // =====================================================================
  // 4. ОТЧЕБУЧИТЬ: открывается постепенно, зависит от должности
  // =====================================================================
  // Рабочие (стажёр…разряд 5). Поля: название, риск %, тяжесть, эффект, текст, условие открытия.
  const W = (n, risk, sev, fx, txt, u, extra) => Object.assign({ n, risk, sev, fx, txt, u: u || {}, tier: 'w' }, extra || {});
  const WORKER = [
    W('Украсить станок гирляндой', 18, 0, { mood: 5, boss: 1 }, 'Станок мигает. Начальник тоже улыбнулся.', { sh: 0 }),
    W('«Письмо счастья» по цеху', 15, 0, { mood: 3 }, 'Письмо дошло до начальника. Он не поверил.', { sh: 0 }),
    W('Спрятать у Субрыкина ручку', 20, 0, { mood: 4 }, 'Чертёж задержится.', { sh: 2 }),
    W('Пранкануть коллегу (подушка-пердушка)', 25, 0, { mood: 8, coll: 1 }, 'Подушка издала звук. Коллега подпрыгнул.', { sh: 3 }),
    W('Привязать шнурки коллеге', 25, 0, { mood: 5, coll: -1 }, 'Коллега падал красиво.', { sh: 4 }),
    W('Надеть каску на кота Чугунка', 15, 0, { mood: 8 }, 'Кот недоволен, но в каске красавец.', { sh: 6 }),
    W('Постучать в дверь начальника и убежать', 35, 0, { mood: 10, boss: -2 }, 'Бежал так, что обогнал эхо.', { r: 1, sh: 10 }),
    W('Станцевать на столе', 40, 0, { cool: 12, mood: 10 }, 'Стол трещал, зал аплодировал.', { r: 1, sh: 12 }),
    W('Бои тараканов с тотализатором', 30, 0, { coll: 4, mood: 6 }, 'Таракан «Мазут» выиграл.', { r: 1, sh: 14 }, { money: true }),
    W('Гонки на тележках', 35, 0, { energy: -6, coll: 4, cool: 6, mood: 8 }, 'Тележка занесла на повороте. Мужики орали «ура».', { r: 1, sh: 15 }),
    W('Налить Витьку «чай» (с водкой)', 30, 0, { mood: 5, coll: 3 }, 'Витёк подобрел и испортил станок.', { r: 1, sh: 16 }, { needItem: ['vodka', 'beer'] }),
    W('Поменять местами таблички М/Ж', 40, 0, { mood: 8, boss: -2 }, 'Надежда Николаевна обнаружила себя «не там».', { r: 1, sh: 18 }),
    W('Забег в цеховых тапках на водку', 25, 0, { coll: 4, cool: 5, mood: 6 }, 'Сорок метров позора и славы.', { r: 2, sh: 22 }),
    W('Спеть в радиоузел', 45, 0, { cool: 8, boss: -3, mood: 8 }, 'По всему заводу прозвучал твой шансон.', { r: 2, sh: 25 }),
    W('Включить «Ламбаду» на весь цех', 30, 0, { coll: 4, boss: -2, mood: 8 }, 'Цех двигался в ритме.', { r: 2, sh: 28 }),
    W('Нарисовать усы на Доске почёта', 50, 0, { cool: 8, boss: -2, mood: 6 }, 'Усы удались. Начальник цеха стал похож на себя.', { r: 2, sh: 30 }),
    W('Гимн Едрёносталя в рэпе на громкой связи', 32, 0, { coll: 4, boss: -2, mood: 6 }, 'Рэп про трубы — это тема.', { r: 2, sh: 32 }),
    W('Минута славы: речь про справедливость', 28, 0, { cons: 4, cool: 6, boss: -3, mood: 5 }, 'Тебя слушали. Это уже победа.', { r: 2, sh: 35 }),
    W('«Собрание» в курилке — избрать бригадира-шута', 35, 0, { coll: 4, boss: -2, mood: 6 }, 'Шут избран единогласно.', { r: 3, sh: 45 }),
    W('Написать мелом «Чугунный век = чугунные лбы»', 45, 1, { cool: 10, mood: 6 }, 'Гоша «Танк» ищет виновного с лупой.', { r: 3, sh: 50, cool: 30 }),
    W('Запереть Соплежуйкина в туалете', 60, 2, { boss: -15, mood: 20, cool: 20, rel: { soplezhuykin: -20 } }, 'Пять минут славы и крик из кабинки.', { r: 4, sh: 90, cool: 35 }),
    W('Покакать под дверь начальнику (экстрим)', 70, 2, { mood: 20, cool: 20, cons: -6, coll: 4, nick: 'govnar' }, 'Легенда родилась. Но убирать будут не тебе.', { r: 4, sh: 100, cool: 40 })
  ];
  // Руководители. u.r — минимальная должность, u.st — ступень внутри должности.
  const M = (n, risk, sev, fx, txt, u, extra) => Object.assign({ n, risk, sev, fx, txt, u: u || {}, tier: 'm' }, extra || {});
  const MANAGER = [
    // 6 — мастер, 7 — старший мастер
    M('Устроить «планёрку» в курилке с чаем', 15, 0, { coll: 4, mood: 6, boss: -1 }, 'Планёрка вышла душевной. Решений ноль, настроение выросло.', { r: 6, st: 1, max: 8 }, { morale: 2 }),
    M('Закрыть глаза на мелкое опоздание любимчика', 30, 0, { coll: 5, cons: -3, boss: -2 }, 'Любимчик благодарен. Остальные запомнили, кто в бригаде «свой».', { r: 6, st: 2, max: 8 }, { morale: -1 }),
    M('Вручить бригаде грамоту «за терпение» за свой счёт', 0, 0, { coll: 7, mood: 6 }, 'Грамоты напечатаны на принтере у Аллочки. Бригада растрогана.', { r: 6, st: 3, max: 8 }, { cost: 600, morale: 5 }),
    M('Нарисовать план выпуска в виде смайликов', 30, 0, { cool: 5, mood: 7, boss: -3 }, 'Верхи не оценили, низы повесили график на стену.', { r: 7, st: 1, max: 8 }, { plan: -1, morale: 3 }),
    M('Турнир по домино в обед с призом цеха', 20, 0, { coll: 7, mood: 8, energy: -3 }, 'Победила бригада Палыча. Приз — вымпел «Чугунный козёл».', { r: 7, st: 2, max: 8 }, { morale: 5 }),
    // 8 — зам. начальника цеха, 9 — начальник цеха
    M('Объявить «день тишины» в цехе', 25, 0, { mood: 8, boss: -2 }, 'Цех работал молча. К обеду все договорились жестами.', { r: 8, st: 1, max: 9 }, { plan: -2, morale: 5 }),
    M('Отправить отчёт директору в стихах', 40, 0, { cool: 8, boss: -4, mood: 8 }, 'Труханов дочитал до конца. Это уже что-то. Или всё плохо.', { r: 8, st: 2, max: 9 }),
    M('Провести совещание в бане', 45, 1, { coll: 8, mood: 12, boss: -5, cool: 6 }, 'Вопросы решались в парилке. Протокол — на запотевшем зеркале.', { r: 8, st: 3, max: 9 }, { morale: 6 }),
    M('Назначить кота Чугунка «почётным начальником склада»', 10, 0, { mood: 10, coll: 6, boss: -2 }, 'Приказ № 1 по складу: «Кормить и не мешать».', { r: 9, st: 1, max: 9 }, { morale: 4 }),
    M('Устроить корпоратив для цеха за счёт премии', 50, 1, { coll: 10, mood: 14, boss: -4 }, 'Столы накрыты, тосты длинные. Утром бухгалтерия считает убытки.', { r: 9, st: 2, max: 9 }, { cost: 3000, morale: 8 }),
    M('Закрыть наряды задним числом ради плана', 55, 2, { boss: 2, cons: -6 }, 'План сошёлся. Совесть — нет. Ждём ОТК и аудит.', { r: 9, st: 3, max: 9 }, { plan: 8, morale: -2 }),
    // 10 — зам. генерального директора
    M('Подписать приказ о «пятнице без отчётов»', 30, 0, { coll: 10, mood: 8, boss: -3 }, 'Приказ повесили в каждом цехе. Бухгалтерия слегка побледнела.', { r: 10, st: 1, max: 10 }, { plan: -2, morale: 6 }),
    M('Назначить «день без совещаний» по всему заводу', 25, 0, { mood: 9, cool: 5, boss: -2 }, 'Первое в истории завода утро без «коротких встреч на час». Люди растерянно работали.', { r: 10, st: 2, max: 10 }, { morale: 5 }),
    M('Объявить «день открытых дверей» для рабочих', 25, 0, { coll: 12, mood: 10, boss: -3, cool: 6 }, 'Рабочие впервые увидели кабинет. Двое попросили прибавку, один — чай.', { r: 10, st: 1, max: 10 }, { morale: 8 }),
    M('Принять «делегацию» в актовом зале с банкетом', 55, 1, { cool: 12, coll: 6, mood: 14 }, 'Делегация осталась довольна. Банкет — тоже. Смета — не очень.', { r: 10, st: 2, max: 10 }, { cost: 8000, morale: 5 }),
    M('Лично запустить станок, разрезав красную ленту', 15, 0, { cool: 10, boss: 3, mood: 10 }, 'Ножницы были тупые, лента — настоящая. Фотограф — тоже.', { r: 10, st: 3, max: 10 }, { morale: 6, plan: 3 })
  ];
  const mgmtLevel = () => { const c = G.s.car; return c.rank * 10 + Math.max(1, Math.min(5, c.mgmtStage || 1)); };
  const isMgr = () => G.s.car.rank >= 6;
  function unlocked(x) {
    const s = G.s, c = s.car, u = x.u;
    if (x.tier === 'm') return mgmtLevel() >= (u.r || 0) * 10 + (u.st || 1);
    return c.rank >= (u.r || 0) && c.shifts >= (u.sh || 0) && s.st.cool >= (u.cool || 0);
  }
  function lockText(x) {
    const s = G.s, u = x.u, t = [];
    if (x.tier === 'm') { const names = { 6: 'мастер', 7: 'ст. мастер', 8: 'зам. начальника', 9: 'нач. цеха', 10: 'зам. ген. директора' }; t.push((names[u.r] || 'должность ' + u.r) + ', ступень ' + (u.st || 1)); }
    else {
      if (u.r && s.car.rank < u.r) t.push('разряд ' + u.r);
      if (u.sh && s.car.shifts < u.sh) t.push(u.sh + ' смен (сейчас ' + s.car.shifts + ')');
      if (u.cool && s.st.cool < u.cool) t.push('крутизна ' + u.cool);
    }
    return t.join(', ');
  }
  const stuntKey = x => x.tier + ':' + x.n;
  const stuntList = () => (isMgr() ? MANAGER.filter(x => G.s.car.rank <= (x.u.max || 10)) : WORKER);
  G.stuntMenu = function () {
    const s = G.s, f = F(); f.v39 = f.v39 || {}; f.v39.stuntLast = f.v39.stuntLast || {};
    const all = stuntList(), open = all.filter(unlocked), shut = all.filter(x => !unlocked(x));
    const doneToday = s.day.stunts || 0;
    const opts = open.map(x => {
      const last = f.v39.stuntLast[stuntKey(x)];
      let dis = null;
      if (doneToday >= 2) dis = 'На сегодня хватит выходок';
      else if (last !== undefined && s.t.day - last < 3) dis = 'Недавно уже было';
      else if (x.cost && s.money < x.cost) dis = 'Нужно ' + G.rub(x.cost);
      else if (x.needItem && !x.needItem.some(i => G.has(i))) dis = 'Нужна выпивка';
      const risk = x.risk ? ' · риск ' + G.catchChance(x.risk) + '%' : ' · без риска';
      return { t: x.n + (x.cost ? ' (' + G.rub(x.cost) + ')' : '') + risk, dis, fn: () => G.runStunt(x) };
    });
    // показываем пару ближайших закрытых вариантов, чтобы было к чему стремиться
    shut.slice(0, 2).forEach(x => opts.push({ t: '🔒 ' + x.n, dis: 'Откроется: ' + lockText(x), fn: () => {} }));
    opts.push({ t: 'Передумал', fn: () => {} });
    const who = isMgr() ? 'Ты руководитель: чудачества теперь другого масштаба — они бьют по плану, настроению цеха и отношениям с начальством, а штрафы и выговоры кусаются сильнее.' : 'Ты ещё не начальник — шалости попроще. С разрядом и стажем откроются новые выходки.';
    G.modal({ title: 'Отчибучить', wide: true, text: who + '<br>Риск — шанс, что заметят. Выходок в день — не больше двух. Открыто: ' + open.length + ' из ' + all.length + '.', opts });
  };
  function boardAdj(k, v) { const f = F(); if (G.plantStats) G.plantStats(); f[k] = C((f[k] === undefined ? 50 : f[k]) + v, 0, 100); }
  G.runStunt = function (x) {
    const s = G.s, f = F(); f.v39 = f.v39 || {}; f.v39.stuntLast = f.v39.stuntLast || {};
    if (typeof x === 'number') x = stuntList()[x];   // совместимость: старые вызовы по номеру
    if (!x) return;
    if (x.cost) { if (s.money < x.cost) { msg('Не хватает денег: ' + G.rub(x.cost), 'warn'); return; } G.addMoney(-x.cost); }
    if (x.needItem) { const it = x.needItem.find(i => G.has(i)); if (!it) { msg('Нужна выпивка.', 'warn'); return; } G.give(it, -1); }
    const fx = Object.assign({}, x.fx);
    if (x.money) fx.money = G.ri(-150, 300);
    const sum = G.fx(fx);
    if (x.plan) boardAdj('plan', x.plan);
    if (x.morale) boardAdj('shopMorale', x.morale);
    msg(x.txt + (sum ? ' (' + sum + ')' : ''));
    f.v39.stuntLast[stuntKey(x)] = s.t.day; s.day.stunts = (s.day.stunts || 0) + 1; s.day.risky = x.n;
    let caught = false;
    if (x.risk) {
      const p = G.catchChance(x.risk);
      if (G.rnd() * 100 < p) { caught = true; if (x.tier === 'm') mgrCaught(x); else workerCaught(x); }
    }
    if (!caught && G.binocularMaybe && x.risk) G.binocularMaybe({ tag: 'risky' });
    G.spend(1);
  };
  function workerCaught(x) {
    // штраф растёт с разрядом: рабочему с высоким разрядом есть что терять
    const k = 1 + 0.25 * G.s.car.rank;
    G.punish({ risk: x.risk, fine: [Math.round(150 * k), Math.round(600 * k)], sev: x.sev || 0, what: x.n });
  }
  function mgrCaught(x) {
    const s = G.s, c = s.car, f = F(), rk = c.rank, sev = x.sev || 0;
    const sc = 1 + (rk - 6) * 0.6;                                   // чем выше должность, тем дороже ошибка
    const fine = Math.round(G.ri(500, 1800) * sc * (1 + sev) / 10) * 10;
    const who = rk >= 9 ? 'Труханов' : rk >= 8 ? 'Щиплен' : 'Щиплен';
    const whoId = rk >= 9 ? 'truhanov' : 'shchiplen';
    s.day.viol = (s.day.viol || 0) + 1; c.clean = 0; s.pay.viol = (s.pay.viol || 0) + 1;
    G.fx({ boss: sev ? -8 : -4, mood: -5 });
    if (s.world.binoc) G.note(x.n, sev > 0);
    if (G.rumor && sev >= 1) G.rumor('stunt_m', 'Говорят, ' + (rk >= 9 ? 'начальник цеха' : 'руководство цеха') + ' опять «выдал» — слухи гуляют по заводу.', { coll: -1 }, 60);
    if (G.buzz) G.buzz('error');
    G.modal({
      title: '📞 ВЫЗОВ НА КОВЁР', cls: 'bad', vib: 'error', wide: true,
      text: 'Выходка руководителя не прошла незамеченной: «' + x.n + '». ' + who + ' вызывает к себе: «Вы — должностное лицо. От вас ждут примера, а не этого». Возможный штраф: <b>' + G.rub(fine) + '</b>' + (sev >= 1 ? ', вероятен выговор.' : '.'),
      opts: [
        { t: '🙏 Признать ошибку и принять меры', fn: () => { G.addMoney(-Math.round(fine / 2)); G.fx({ boss: 2, cons: 2, mood: -2 }); if (sev >= 2) G.fx({ rep: 1 }); msg('Ты признал(а) ошибку. Штраф ' + G.rub(Math.round(fine / 2)) + '. Репутация терпит, но выживает.', 'warn'); G.checkEnd(); } },
        { t: '🗣 Свалить на подчинённых', fn: () => { if (G.chance(45)) { G.fx({ coll: -6, cons: -6 }); msg('Прокатило: виноватые найдены. Коллектив шепчется — доверие подорвано.', 'warn'); } else { G.addMoney(-fine); G.fx({ boss: -8, coll: -8, cons: -4, rep: 1 }); boardAdj('shopMorale', -6); msg('Не прокатило: ' + who + ' всё выяснил. Штраф, выговор, и цех теперь за тебя не горой.', 'bad'); } G.checkEnd(); } },
        { t: '💵 Молча заплатить штраф', fn: () => { G.addMoney(-fine); G.fx({ boss: -2 }); if (sev >= 1) G.fx({ rep: 1 }); boardAdj('plan', -sev * 2); msg('Штраф ' + G.rub(fine) + ' удержан. Разговор окончен.', 'warn'); G.checkEnd(); } }
      ]
    });
  }

  // =====================================================================
  // 5. «СВОИ ЛЮДИ»: ПРИГЛАШЕНИЯ ДОМОЙ, В БАР, НА РЫБАЛКУ, В ГОСТИ
  // =====================================================================
  // Кто как реагирует на визит домой: небольшая личная польза (у каждого своя)
  const HOME = {
    seryoga: ['Серёга принёс пиво и анекдот про начальника цеха.', { mood: 6 }, () => { if (G.chance(40)) G.give('beer', 1); }],
    afonya: ['Афоня достал гитару — соседи стучат, но подпевают.', { mood: 8 }],
    vityok: ['Витёк починил в комнате розетку и дверцу шкафа.', { mood: 3, know: 1 }],
    mikhalych: ['Михалыч весь вечер рассказывал, как правильно читать чертёж.', { know: 3 }],
    palych: ['Палыч показал два приёма, которым не учат в техникуме.', { know: 3, mood: 3 }],
    kolyan: ['Колян «по дружбе» подкинул идею подработки на выходные.', { mood: 4 }, () => { if (G.chance(35)) { G.addMoney(500); msg('Колян оставил 500 ₽ «в долг, но ты забудь».', 'good'); } }],
    zahar: ['Захар зарядил всю комнату энтузиазмом на неделю вперёд.', { mood: 5, energy: 4 }],
    khomyak: ['Хомяк принёс «лишнюю» тушёнку с проходной. Ты ничего не видел.', { satiety: 12, mood: 3 }],
    rafik: ['Рафик заехал на «Майбахе» — весь двор вышел смотреть.', { cool: 3, mood: 6 }],
    lyosha: ['Дядя Лёша заварил свой чай. Здоровье поправилось, душа тоже.', { health: 3, mood: 5 }],
    egorych: ['Егорыч принёс журнал проходной и кроссворд. Решали до ночи.', { mood: 5, know: 1 }],
    nyura: ['Баба Нюра пришла с пирожками и осталась до ночи.', { satiety: 15, mood: 6 }]
  };
  const GUEST_TIPS = ['«Егорыч любит водку и когда его слушают».', '«Щиплен любит коньяк и почтение».', '«Не пей по средам — Надежда Николаевна всех видит».', '«Откладывай хоть чуть-чуть с зарплаты — потом сам себе спасибо скажешь».', '«Бинокль директора смотрит с крыши, а не из кабинета».'];
  const inviteDay = (id) => { const r = G.R(id); if (r.invDay !== G.s.t.day) { r.invDay = G.s.t.day; r.invN = 0; r.invBusy = null; } return r; };
  // принял ли друг приглашение (случайно, но один раз за день: «занят» не перебрасывается)
  function accepts(id) {
    const s = G.s, r = inviteDay(id);
    if (r.invN >= 2) { G.info(n(id), 'Мы сегодня уже достаточно повидались. Давай завтра.'); return false; }
    if (r.invBusy === null) r.invBusy = G.hash(s.t.day, 391, id.length * 17 + id.charCodeAt(0)) < 0.12 ? 1 : 0;
    if (r.invBusy) { G.info(n(id), '«Сегодня не могу — дела. В другой раз, ладно?» Без обид.'); return false; }
    return true;
  }
  const n = id => D.NPC[id].name;
  const visitOk = (h) => {
    if (!G.isFree()) return 'Только вечером или в выходной';
    if (hour() + h > 26) return 'Слишком поздно';
    if (G.s.st.energy < 8) return 'Нет сил';
    return null;
  };
  G.inviteMenu = function (id) {
    const s = G.s, r = inviteDay(id), boss = G.isBoss && G.isBoss(id), neighbor = id === NY;
    if (boss) { G.info(n(id), 'Приглашать начальство в гости как-то неловко. Лучше сначала сходить к нему на чай в кабинет.'); return; }
    if ((G.npcGone && G.npcGone(id))) { G.info(n(id), 'Её здесь больше нет.'); return; }
    const done = () => { r.invN++; r.last = G.week(); };
    const o = [];
    o.push({ t: '🏠 Пригласить домой (2 ч, ≈250 ₽ на угощение)', dis: visitOk(2) || (s.money < 250 ? 'Нет денег' : null), fn: () => {
      if (!accepts(id)) return;
      G.addMoney(-250); done();
      const h = HOME[id] || [first(id) + ' посидел(а) у тебя, попили чай, поговорили по душам.', { mood: 5 }];
      const fx = Object.assign({ mood: 6, satiety: 10 }, h[1]); if ((s.flags.room || {}).tv) fx.mood += 2; if ((s.flags.room || {}).kettle) fx.mood += 1;
      const sum = G.fx(fx); G.relAdd(id, 4); if (h[2]) h[2]();
      let cat = ''; if (F().catHome) { cat = ' Чугунок обошёл гостя по кругу и милостиво разрешил остаться.'; G.R(id).l += 0; }
      msg('Гость в доме: ' + h[0] + cat + (sum ? ' (' + sum + ')' : ''), 'good'); G.spend(2);
    } });
    if (!neighbor) o.push({ t: '🍺 Пригласить в бар', dis: visitOk(2) || (s.money < 400 ? 'Нет денег (от 400 ₽)' : null), fn: () => { if (!accepts(id)) return; done(); G.barVisit(id); } });
    if (!neighbor) o.push({ t: '🎣 Позвать на рыбалку', dis: visitOk(2) || (G.fishPlan && G.fishPlan() ? 'Уже есть договорённость о рыбалке' : null), fn: () => {
      if (!accepts(id)) return; done(); G.fishPlanSet(id);
      msg(first(id) + ': «Пойдём, давно не были». Договорились: на вкладке «Дом» появилась кнопка «Пойти на рыбалку».', 'good'); if (G.ui && G.ui.render) G.ui.render();
    } });
    o.push({ t: '🚪 Сходить в гости к ' + first(id) + ' (3 ч)', dis: visitOk(3), fn: () => {
      if (!accepts(id)) return; done();
      const drinker = ['seryoga', 'kolyan', 'afonya', 'zahar'].indexOf(id) >= 0;
      const fx = { satiety: 24, mood: 9, energy: -3 }; if (drinker && G.chance(35)) fx.drunk = 14;
      const sum = G.fx(fx); G.relAdd(id, 5);
      let extra = '';
      if (G.chance(35)) { const t = G.pick(GUEST_TIPS); extra = ' ' + first(id) + ' по секрету: ' + t; G.fx({ know: 1 }); }
      msg('В гостях у ' + first(id) + ': угощение, разговоры, чай до ночи.' + extra + (sum ? ' (' + sum + ')' : ''), 'good'); G.spend(3);
    } });
    o.push({ t: 'Назад', fn: () => {} });
    G.modal({ title: '📨 Позвать: ' + first(id), face: id, wide: true, text: 'Пригласить можно вечером или в выходной. Раз в день — не больше двух встреч с одним человеком; иногда друг бывает занят.<br>' + (G.relBig ? G.relBig(id) : ''), opts: o });
  };

  // =====================================================================
  // ИНТЕРФЕЙС: карточка «Дом» с котом, список изменений
  // =====================================================================
  const _top = G.shiftTop;
  G.shiftTop = function () {
    let h = _top ? _top.apply(this, arguments) : '';
    try {
      const s = G.s;
      if (s && live() && F().catHome && !atWork()) {
        const p = F().petCat;
        h += '<div class="card" style="border-left:4px solid #e0a03a"><b>🐈 Чугунок дома.</b> <span class="note">Погладишь — настроение заметно поднимется' + (p ? ' (сейчас у него ' + Math.round(p.mood) + '/100)' : '') + '.</span><div class="cta-in"><button class="btn" onclick="G.petMenu(\'cat\')">🐾 К Чугунку</button></div></div>';
      }
      if (s && live() && !atWork() && G.nyuraHere() && G.R(NY).met && nyJobToday() && !nyDone(s, 'nyJob') && hour() < 24) {
        h += '<div class="card" style="border-left:4px solid #bba"><b>👵 У бабы Нюры сегодня есть дело.</b> <span class="note">Можно подзаработать и подружиться.</span><div class="cta-in"><button class="btn" onclick="G.nyuraMenu()">Зайти к ней</button></div></div>';
      }
    } catch (e) { if (window.console) console.error(e); }
    return h;
  };
  // Встреча дома: после смены Чугунок встречает хозяина
  const _es2 = G.endShift;
  G.endShift = function () {
    const was = G.s && G.s.phase !== 'evening' && !G.s.end;
    const r = _es2.apply(this, arguments);
    try { if (was && live() && F().catHome) { const sum = G.fx({ mood: 3 }); msg('🐈 Чугунок встретил тебя у порога и потёрся о ногу' + (sum ? ' (' + sum + ')' : '') + '.', 'good'); } } catch (e) {}
    return r;
  };

  // =====================================================================
  // 6. ТАМАРА ИВАНОВНА — только на самой проходной и не каждый день
  // =====================================================================
  // Егорыч пропустил -> G.gatePass() доводит игрока до раздевалки; именно здесь (на проходной) Тамара и может оказаться
  const _gatePass = G.gatePass;
  G.gatePass = function () {
    const r = _gatePass.apply(this, arguments);
    try {
      const s = G.s;
      if (s && s.phase === 'locker' && G.isWorkday() && !s.day.tamGateSeen && G.hash(s.t.day, 11, 3) < 0.5) {
        s.day.tamGateSeen = 1;
        G.modal({ title: '🧹 Тамара Ивановна на проходной', face: 'tamara', text: 'У проходной шуршит шваброй Тамара Ивановна. Подходить или нет — решать тебе.', opts: [{ t: '💬 Подойти поговорить', fn: () => G.tamaraTalk() }, { t: 'Пройти мимо', fn: () => {} }] });
      }
    } catch (e) { if (window.console) console.error(e); }
    return r;
  };

  if (G.CHANGELOG) G.CHANGELOG.unshift({ v: 'V3.15', date: '19.11.2026', items: [
    '🛂 Мастера и выше Егорыч пропускает всегда: без придирок, даже без пропуска или с похмелья.',
    '🎭 «Отчибучить» открывается постепенно; у руководителей — свои выходки и последствия по должности (план, цех, штрафы, «ковёр» у начальства).',
    '📜 Если долго не подписывать нормативную документацию, репутация у начальства падает. Плашки «Нужно расписаться» и «Репутация» теперь только на работе.',
    '👋 Приветственное окно теперь называется «Привет, работяга!».',
    '🤕 С похмелья хорошего настроения нет: потолок настроения 55 (лёгкое) и 35 (тяжёлое).',
    '🚨 Настроение больше не рушится одним махом: исправлен «голодный обрыв». В окне «Вы на грани» все способы работают, телефон не нужен. Кнопка «Ок».',
    '👵 Баба Нюра — соседка: чай, сплетни, подработка. Если съехать из общаги, она остаётся там.',
    '🐈 Чугунок заметно поднимает настроение: погладить, поиграть, встреча дома.',
    '🚿 «Помыться» — один раз в день.',
    '🤝 «Свои люди»: пригласить домой, в бар, на рыбалку, сходить в гости. Помощь друзей теперь видна каждое утро.'
  ] });
})();
