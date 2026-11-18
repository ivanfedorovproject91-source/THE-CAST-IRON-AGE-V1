/* ===== Этап 4, блок 4: жизнь генерального директора и свободная игра после финала =====
   Было: директор оставался «рабочим в кресле» — те же смены у станка, отношение начальства (стат boss), риск увольнения
   мастером, ковёр, штрафы; оклад начислялся только за «операции», поэтому выплаты были нестабильными;
   персонал относился к нему как к обычному коллеге; совет мог не уволить директора с доверием 2 даже за 250 дней.
   Стало:
     • у директора нет начальства в цехе — «отношение» = доверие совета директоров; fireRisk/ковёр/штрафы мастера не действуют;
     • цеховые действия (станок, перекур, наряды, ТБ-обходы…) скрыты, вместо них — действия директора;
     • оклад начисляется полностью, каждую смену (расчёт в расчётный день — как у всех, по тем же налогам);
     • полная власть над персоналом: меню «Распоряжения» у каждого сотрудника (премия, повышение, увольнение, обед, поручение, выговор);
     • отношение работников — как к царю: «пол» отношения, почтительные разговоры, подарки и угощения на праздники;
     • увольнение советом: доверие ≤ 8 четыре недели подряд — снимают, даже если предупреждения не было;
     • новые финалы директора («Холдинг», «Почётная пенсия») и свободная игра после нефатальных финалов.
   Старые сохранения: ничего не обнуляется, не списывается и не повторяется; для не-директоров модуль ничего не меняет. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.D, C = G.clamp;
  const CEO = G.ceo, CO = G.co;
  const rub = n => G.rub(Math.round(n));
  const nm = id => (D.NPC[id] && D.NPC[id].name) || id;
  const first = id => nm(id).split(' ')[0];
  const is = () => !!(CEO && CEO.is && CEO.is());
  const F = () => G.s.flags;
  const L = (G.LATER = G.LATER || {});
  const info = (title, text, cls, face) => G.modal({ title, text, cls, face, opts: [{ t: 'Понятно', fn: () => {} }] });

  // ---------- Персонал: кому директор — «царь»
  const OUTSIDERS = ['truhanov', 'rublev', 'rafik', 'nyura', 'kolyan', 'vika', 'chugunok', 'chugun', 'belka', 'tatyana', 'eblanov'];
  const isStaff = id => !!D.NPC[id] && OUTSIDERS.indexOf(id) < 0;
  G.ceoStaff = isStaff;
  const gone = id => !!(G.s && G.s.flags.ceoFired && G.s.flags.ceoFired[id]);
  const KING_FLOOR = 70;

  // ---------- 1. Нет начальства в цехе
  const _fr = G.fireRisk; G.fireRisk = function () { return is() ? 0 : _fr.apply(this, arguments); };
  const _pun = G.punish;
  G.punish = function (a) {
    if (is()) { G.toast('Совет директоров не комментирует вопросы такого масштаба. Но слухи ходят.', 'warn'); try { const c = CO.get(); if (c) c.board.trust = C(c.board.trust - 0.5); } catch (e) {} return; }
    return _pun.apply(this, arguments);
  };
  const _ce = G.checkEnd;
  G.checkEnd = function () { if (is() && G.s && G.s.car && G.s.car.rep >= 3) G.s.car.rep = 0; return _ce.apply(this, arguments); };
  // «отношение начальства» директора = доверие совета
  G.ceoSyncBoss = function () { try { const c = CO.get(); if (c && G.s.st) G.s.st.boss = C(Math.round(c.board.trust)); if (G.s.car) G.s.car.rep = 0; } catch (e) {} };

  // ---------- 2. Цеховые действия скрыты
  const HIDE = ['work', 'check_dwg', 'smoke_shop', 'milk', 'nap', 'use_w', 'otchib', 'loot', 'side_work', 'mg_assign', 'mg_check', 'mg_meeting', 'staff',
    'eco', 'eco_repair', 'eco_qc', 'eco_logi', 'eco_safety', 'mx_walk', 'mx_graph', 'mx_complaint', 'mx_safe', 'm_resource', 'm_budget', 'm_strategy', 'board',
    'w_sharpen', 'w_setup', 'w_mentor', 'w_critical'];
  const _av = G.avail;
  G.avail = function (a) {
    if (a && is() && HIDE.indexOf(a.id) >= 0 && G.s.phase !== 'new') return 'Не здесь'; // интерфейс такие действия не показывает вовсе
    return _av.apply(this, arguments);
  };

  // ---------- 3. Оклад: полный, независимо от «операций»
  const _es = G.endShift;
  G.endShift = function () {
    if (is() && G.s && G.s.phase !== 'evening' && !G.s.end) { const d = G.s.day; d.ops = Math.max(d.ops || 0, 1); d.qsum = Math.max(d.qsum || 0, 100 * d.ops); d.viol = 0; d.breaks = 0; }
    return _es.apply(this, arguments);
  };

  // ---------- 4. Действия директора
  const A = (id, o) => G.A(id, Object.assign({ ph: ['work'], i: '🏢', g: 'Директор', once: 'day', minRank: 10 }, o));
  const board = (v, why) => { const c = CO.get(); if (!c) return; c.board.trust = C(c.board.trust + v); G.ceoSyncBoss(); };
  const morale = v => { if (G.plantStats) G.plantStats(); F().shopMorale = C((F().shopMorale || 50) + v); };
  const plan = v => { if (G.plantStats) G.plantStats(); F().plan = C((F().plan || 50) + v); };
  const mine = () => is();

  A('ceo_round', { loc: 'shop', n: 'Обход цехов', i: '🚶', h: 2, req: () => (mine() ? null : 'Только для директора'), menu: true, fn: () => {
    G.modal({ title: 'Обход цехов', text: 'Вы идёте по заводу в сопровождении свиты. Рабочие выпрямляются, мастера бледнеют. Как пройти обход?', opts: [
      { t: 'Тепло поговорить с людьми (2 часа)', fn: () => { morale(5); plan(1); G.fx({ coll: 2, energy: -6, mood: 2 }); staffUp(3, 3); G.toast('Люди запомнят, что директор вышел к ним.', 'good'); G.spend(2); } },
      { t: 'Строгая проверка порядка (2 часа)', fn: () => { plan(3); morale(-3); G.fx({ energy: -6 }); staffUp(3, -1); G.toast('Порядок наведён, настроение у людей — не очень.'); G.spend(2); } },
      { t: 'Не сегодня', fn: () => {} }] });
    return 'custom';
  } });

  A('ceo_board_call', { loc: 'admin', n: 'Созвониться с советом', i: '📞', h: 1, once: false, req: () => (!mine() ? 'Только для директора' : F().ceoCallWk === G.week() ? 'Раз в неделю' : null), menu: true, fn: () => {
    F().ceoCallWk = G.week();
    G.modal({ title: 'Совет директоров на линии', face: 'truhanov', text: 'Труханов: «Докладывайте коротко. Что у вас?»', opts: [
      { t: 'Отчитаться по плану', fn: () => { const c = CO.get(); const good = c && c.treasury > 0 && c.board.trust >= 30; board(good ? 3 : -1); G.toast(good ? 'Совет доволен прозрачностью отчёта.' : 'Совет услышал отчёт и сделал выводы.', good ? 'good' : 'warn'); G.spend(1); } },
      { t: 'Попросить поддержки', fn: () => { if (G.chance(55)) { board(4); G.toast('Совет согласился подставить плечо.', 'good'); } else { board(-2); G.toast('Совет: «Решайте сами — вы же директор».', 'bad'); } G.spend(1); } },
      { t: 'Не звонить', fn: () => {} }] });
    return 'custom';
  } });

  A('ceo_staff_meeting', { loc: 'admin', n: 'Планёрка у директора', i: '🗂', h: 1, req: () => (mine() ? null : 'Только для директора'), menu: true, fn: () => {
    G.modal({ title: 'Планёрка', text: 'Руководители участков ждут ваших слов.', opts: [
      { t: 'Поставить задачу и спросить результат', fn: () => { plan(4); G.fx({ energy: -3 }); staffUp(2, 0); G.toast('Задачи поставлены: цеха подтянулись.', 'good'); G.spend(1); } },
      { t: 'Выслушать проблемы людей', fn: () => { morale(4); G.fx({ coll: 2, energy: -2 }); staffUp(2, 2); G.toast('Директор выслушал — это ценят.', 'good'); G.spend(1); } },
      { t: 'Отменить планёрку', fn: () => {} }] });
    return 'custom';
  } });

  // финалы директора
  A('ceo_holding', { n: '🏛 Создать холдинг', i: '🏛', loc: 'admin', h: 2, once: false, ph: ['work'], req: () => {
    const c = CO.get(); if (!mine() || !c) return 'Только для директора';
    if ((c.stats.weeks || 0) < 52) return 'Нужен хотя бы год у руля';
    if (c.board.trust < 60) return 'Нужно доверие совета ≥ 60';
    if (c.treasury < 40e6) return 'В кассе нужно ≥ 40 млн ₽';
    return null;
  }, menu: true, fn: () => {
    G.modal({ title: '🏛 Холдинг «Чугунный век»', text: 'Завод — только начало. Совет готов одобрить создание холдинга: ещё заводы, свой банк и дочерняя «Контора». Это потребует 30 млн ₽ из кассы и закроет эпоху одного завода. После церемонии можно будет остаться и руководить дальше.', opts: [
      { t: 'Подписать (−30 млн ₽ из кассы)', fn: () => { const c = CO.get(); CO.expense(c, 30e6, 'other'); G.end('ceo_holding', { why: ['Касса предприятия: ' + CO.m(c.treasury), 'Доверие совета: ' + Math.round(c.board.trust) + '%'] }); } },
      { t: 'Подождать', fn: () => {} }] });
    return 'custom';
  } });

  A('ceo_retire', { loc: 'admin', n: '🎖 Уйти на почётную пенсию', i: '🎖', h: 1, once: false, req: () => {
    const c = CO.get(); if (!mine() || !c) return 'Только для директора';
    if ((c.stats.weeks || 0) < 52) return 'Нужен хотя бы год у руля';
    if (c.board.trust < 50) return 'Нужно доверие совета ≥ 50';
    return null;
  }, menu: true, fn: () => {
    G.modal({ title: '🎖 Почётная отставка', text: 'Совет примет вашу отставку с почётом: портрет в холле, персональная пенсия, кабинет с видом на трубы. Это финал истории.', opts: [
      { t: 'Подать в отставку с почётом', fn: () => { const c = CO.get(); G.end('ceo_retire', { why: ['Лет у руля: ' + (Math.round((c.stats.weeks || 0) / 52 * 10) / 10), 'Доверие совета: ' + Math.round(c.board.trust) + '%'] }); } },
      { t: 'Остаться', fn: () => {} }] });
    return 'custom';
  } });

  D.ENDINGS = D.ENDINGS || {};
  D.ENDINGS.ceo_holding = { e: '🏛', t: 'ХОЛДИНГ «ЧУГУННЫЙ ВЕК»', x: 'Вы превратили один завод в холдинг. Над заводоуправлением новая вывеска, у ворот — очередь на трудоустройство. Труханов дал интервью, в котором ни разу не упомянул вас. Это лучший комплимент.' };
  D.ENDINGS.ceo_retire = { e: '🎖', t: 'ПОЧЁТНАЯ ПЕНСИЯ', x: 'Вы ушли красиво: портрет в холле, речь без бумажки и кот Чугунок на проводах. Завод остался на преемнике. Он обещает, что справится. Все вежливо кивают.' };

  // ---------- 5. Персонал и «царь»
  function staffUp(n, rel) { // отношения с несколькими случайными сотрудниками
    const ids = Object.keys(D.NPC).filter(isStaff).filter(id => !gone(id)); const pickN = [];
    for (let i = 0; i < n && ids.length; i++) pickN.push(ids.splice(Math.floor(G.rnd() * ids.length), 1)[0]);
    pickN.forEach(id => G.relAdd(id, rel));
  }

  // пол отношения: к директору относятся как к царю
  G.ceoReverence = function () {
    if (!is() || !G.s) return;
    Object.keys(D.NPC).filter(isStaff).forEach(id => { const r = G.R(id); if (r.l < KING_FLOOR) r.l = KING_FLOOR; });
    G.ceoSyncBoss();
  };
  const _ed = G.extraDaily;
  G.extraDaily = function () { const r = _ed ? _ed.apply(this, arguments) : undefined; try { G.ceoReverence(); } catch (e) { if (window.console) console.error(e); } return r; };
  const _ld = G.load; G.load = function () { const r = _ld.apply(this, arguments); try { G.ceoReverence(); } catch (e) {} return r; };

  const _ip = G.isPresent;
  G.isPresent = function (id) { return gone(id) ? false : _ip.apply(this, arguments); };

  const REV = [
    { t: '«Ваше превосходительство! Мы все в вас верим. Вот только… пропуска в столовую не работают».', o: [['Решу вопрос.', '«Золотой человек!» — слышно вслед.', { coll: 2, mood: 2 }], ['Не мелочитесь.', 'Он ёжится: «Так точно».', { coll: -1 }]] },
    { t: '«Прикажете чаю? Лучшего! Из личных запасов!»', o: [['Давайте.', 'Чай подан в стакане с подстаканником. Почёт.', { mood: 3, energy: 3 }], ['Нет, работайте.', '«Слушаюсь!» Работает вдвое усердней.', { coll: 1 }]] },
    { t: '«Когда вы проходите по цеху, даже станки гудят ровнее. Это правда».', o: [['Приятно слышать.', 'Вы улыбаетесь. Он счастлив до конца смены.', { mood: 3 }], ['Станки гудят от износа.', '«Так точно, но всё равно ровнее».', { know: 1 }]] },
    { t: '«Разрешите обратиться? У людей просьба — нормальную раздевалку».', o: [['Сделаем.', 'Он записывает слово в слово и благоговейно прячет блокнот.', { coll: 3, mood: 2 }], ['Не сейчас.', 'Он кивает, но тихо вздыхает.', { coll: -1 }]] }
  ];
  const _tt = G.talkTo;
  G.talkTo = function (id) {
    if (is() && isStaff(id) && !(G.isBoss && G.isBoss(id) && false)) {
      const n = D.NPC[id], d = G.pick(REV);
      const r = G.R(id); r.met = true; r.talks = (r.talks || 0) + 1;
      G.modal({ title: n.name, face: id, text: d.t, opts: d.o.map(o => ({ t: o[0], fn: () => { const sum = G.fx(o[2], { npc: id }); G.toast(o[1] + (sum ? ' (' + sum + ')' : '')); G.spend(1); } })) });
      return;
    }
    return _tt.apply(this, arguments);
  };

  // ---------- 6. Распоряжения: полная власть над персоналом
  const BONUS = 30000;
  const power = id => {
    const c = CO.get(), r = G.R(id), f = F(); f.ceoPromoted = f.ceoPromoted || {}; f.ceoFired = f.ceoFired || {}; f.ceoDay = f.ceoDay || {};
    const used = f.ceoDay[id] === G.s.t.day;
    const once = why => used ? 'Сегодня уже распоряжались' : why || null;
    G.modal({ title: '👑 Распоряжения: ' + nm(id), face: id, text: 'Вы — генеральный директор. Здесь ваше слово — закон. Но люди запоминают, как им распорядились.', wide: true, opts: [
      { t: '💰 Премия ' + rub(BONUS) + ' из кассы', dis: once(!c || c.treasury < BONUS ? 'Касса пуста' : null), fn: () => { f.ceoDay[id] = G.s.t.day; CO.expense(c, BONUS, 'other'); G.relAdd(id, 6); G.fx({ coll: 2 }); morale(1); G.toast(first(id) + ' благодарит. По цеху пошёл слух о щедром директоре.', 'good'); G.spend(1); } },
      { t: f.ceoPromoted[id] ? '⭐ Уже повышен(а)' : '⭐ Повысить в должности', dis: f.ceoPromoted[id] ? 'Уже' : once(null), fn: () => { f.ceoDay[id] = G.s.t.day; f.ceoPromoted[id] = 1; G.relAdd(id, 12); G.fx({ coll: 2 }); const c2 = CO.get(); if (c2) CO.note && CO.note(c2, 'Приказ о повышении: ' + nm(id) + '.'); G.toast(first(id) + ' повышен(а) личным приказом. Преданность — безгранична.', 'good'); G.spend(1); } },
      { t: '🍽 Пригласить на обед в кабинет', dis: once(null), fn: () => { f.ceoDay[id] = G.s.t.day; G.relAdd(id, 5); G.fx({ mood: 3, energy: 4 }); G.toast(first(id) + ' сидит на краешке стула и не притрагивается к супу. Но запомнит это на всю жизнь.', 'good'); G.spend(1); } },
      { t: '📋 Дать личное поручение', dis: once(null), fn: () => { f.ceoDay[id] = G.s.t.day; G.later('ceo_order_done', G.ri(3, 7), { id }); G.relAdd(id, 2); G.toast(first(id) + ' бросился исполнять.'); G.spend(1); } },
      { t: '😠 Объявить выговор', dis: once(null), fn: () => { f.ceoDay[id] = G.s.t.day; G.relAdd(id, -5); G.fx({ coll: -2 }); morale(-2); G.toast(first(id) + ' бледнеет: «Виноват!». Остальные примолкли.', 'warn'); G.spend(1); } },
      { t: '🚪 Уволить', cls: 'danger', fn: () => fireMenu(id) },
      { t: 'Назад', fn: () => {} }] });
  };
  const fireMenu = id => G.modal({ title: 'Уволить: ' + nm(id) + '?', face: id, text: 'Приказ подписывается одним росчерком. Но цех всё видит: коллеги будут помнить, чем кончается неудача, а профсоюз — как вы обходитесь с людьми. Без выходного пособия в 3 оклада — вы нарушите ТК.', opts: [
    { t: 'Уволить с пособием (' + rub(60000) + ' из кассы)', dis: CO.get() && CO.get().treasury < 60000 ? 'Касса пуста' : null, fn: () => { CO.expense(CO.get(), 60000, 'other'); F().ceoFired[id] = G.s.t.day + 1; G.fx({ coll: -2 }); morale(-1); G.toast(first(id) + ' уволен(а) с пособием. Цех тихо шепчется.', 'warn'); G.spend(1); } },
    { t: 'Уволить по статье', fn: () => { F().ceoFired[id] = G.s.t.day + 1; G.fx({ coll: -6, cons: -3 }); morale(-4); board(-1); G.later('ceo_union_protest', G.ri(4, 8), { id }); G.toast(first(id) + ' уволен(а) без пособия. Профсоюз недоволен.', 'bad'); G.spend(1); } },
    { t: 'Передумал', fn: () => {} }] });
  L.ceo_order_done = d => { if (!is()) return; if (G.chance(85)) { G.relAdd(d.id, 3); plan(2); G.toast(first(d.id) + ' выполнил(а) поручение директора точно в срок.', 'good'); } else { G.toast(first(d.id) + ' переусердствовал(а), вышло криво. Но так старался(лась)!', 'warn'); } };
  L.ceo_union_protest = d => { if (!is()) return; board(-2); G.fx({ coll: -2 }); info('📢 Профсоюз', 'Семёныч принёс заявление: увольнение ' + nm(d.id) + ' без пособия — нарушение. Совет директоров недоволен шумом.', 'bad', 'semyonych'); };

  const _sp = G.npcSpecial;
  G.npcSpecial = function (id) {
    const o = _sp.apply(this, arguments);
    if (is() && isStaff(id) && !gone(id)) o.push({ t: '👑 Распоряжения', fn: () => power(id) });
    return o;
  };

  // уволенные не «разговаривают»
  const _nm = G.npcMenu;
  G.npcMenu = function (id) {
    if (gone(id)) { G.modal({ title: nm(id), face: id, text: 'Вы подписали приказ об увольнении. Пропуск аннулирован, шкафчик пуст.', opts: [{ t: 'Понятно', fn: () => {} }] }); return; }
    return _nm.apply(this, arguments);
  };

  // ---------- 7. Увольнение советом: нет вечного «доверия 2»
  // (правка самого условия — в company_events.js: доверие ≤ 8 четыре недели подряд = снятие даже без предупреждения)

  // ---------- 8. Свободная игра после финала
  const FREE = ['head', 'puppet', 'prosper', 'legend_board', 'union_leader', 'business', 'blogger', 'married', 'moscow', 'ceo_legend', 'ceo_holding'];
  G.canContinueFree = function () { const s = G.s; return !!(s && s.end && FREE.indexOf(s.end.id) >= 0); };
  const _end = G.end;
  G.end = function (id, data) {
    const s = G.s;
    if (s && !s.end && s.flags.finals && s.flags.finals[id] && FREE.indexOf(id) >= 0) return; // этот финал уже был — свободная игра идёт дальше
    return _end.call(this, id, data);
  };
  G.continueFree = function () {
    const s = G.s; if (!G.canContinueFree()) return false;
    const f = s.flags; f.finals = f.finals || {}; f.finals[s.end.id] = s.t.day + 1; f.freePlay = (f.freePlay || 0) + 1;
    s.end = null; G.mq.length = 0; G.cur = null; G.busy = false;
    G.toast('История продолжается. Это уже свободная игра — финал останется в вашей биографии.', 'good');
    G.save && G.save(); if (G.ui && G.ui.render) G.ui.render();
    return true;
  };
})();
