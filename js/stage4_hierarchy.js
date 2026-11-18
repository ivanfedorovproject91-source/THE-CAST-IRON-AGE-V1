/* ===== Этап 4, блок 5: иерархия — ты и твои подчинённые =====
   Было: придирались к игроку независимо от его должности (мастер — к мастеру, зам. начальника цеха — к начальнику цеха),
   отношения не менялись от повышения, у руководителя не было управленческих реплик, «Свои люди» были только рабочие.
   Стало:
     • придираться к игроку могут только вышестоящие по должности (G.aboveMe); у директора — никто, кроме совета;
     • у подчинённого появляется меню «👔 Руководить»; новые пункты открываются ступенями:
         мастер — замечание; ст. мастер — + поручение; зам. начальника — + проверка; начальник цеха — + выговор, поощрение, намёк на взятку, увольнение;
     • увольнение не ломает игру: нужны основания (2 отметки), не чаще раза в 4 недели, не больше 5 за карьеру; последствия для цеха и профсоюза;
     • друзья («Свои люди») относятся к повысившемуся уважительнее, у руководителя они — «свои люди» с прозвищем; рыбалка с рабочими замечена начальством;
     • в «Свои люди» могут попасть руководители (по должности игрока); исключить друга — можно с ранга зам. начальника, но он сильно обидится;
     • «Выходной для руководителей»: закрытая рыбалка, сауна, шахматы, охота;
     • подчинённые приносят «знаки внимания» (взятки): принять можно, но проверка припомнит.
   Старые сохранения: ничего не списывается, друзья остаются друзьями; для рабочих рангов ничего не меняется. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.D, C = G.clamp;
  const rub = n => G.rub(Math.round(n));
  const nm = id => (D.NPC[id] && D.NPC[id].name) || id;
  const first = id => nm(id).split(' ')[0];
  const F = () => G.s.flags;
  const L = (G.LATER = G.LATER || {});
  const is = () => !!(G.ceo && G.ceo.is && G.ceo.is());
  const rank = () => (G.s && G.s.car ? G.s.car.rank : 0);
  const info = (title, text, cls, face) => G.modal({ title, text, cls, face, opts: [{ t: 'Понятно', fn: () => {} }] });

  // ---------- Должностной вес персонажей (шкала — ранги игрока: 6 мастер, 7 ст. мастер, 8 зам. нач., 9 нач. цеха, 10 зам. ген.)
  const NR = { stepanych: 6, dudukin: 6, kulezhov: 8, shchiplen: 9, rassvetov: 10, soplezhuykin: 10, truhanov: 13,
    palych: 5, seryoga: 4, vityok: 4, mikhalych: 4, afonya: 3, khomyak: 3, lidiya: 3, alevtina: 3, allochka: 3, lyosha: 2, egorych: 2, zahar: 1, lyudka: 1, tamara: 1, gosha: 6, pelageya: 6, eblanov: 4, vika: 2 };
  const EXEMPT = ['truhanov', 'soplezhuykin', 'rassvetov', 'semyonych', 'ekaterina', 'nadezhda', 'tatishcheva', 'nyura', 'kolyan', 'rublev', 'rafik', 'tatyana', 'chugunok', 'chugun', 'belka'];
  const moved = id => !!(G.s && G.s.flags.npcMoved && G.s.flags.npcMoved[id]);
  const gone = id => !!(G.s && G.s.flags.ceoFired && G.s.flags.ceoFired[id]);
  G.nr = id => (moved(id) ? 0 : NR[id] != null ? NR[id] : 3);
  const me = () => (is() ? 12 : rank());
  G.aboveMe = id => !is() && !!D.NPC[id] && G.nr(id) > rank();                 // кто может придираться
  G.isSuperior = id => G.aboveMe(id) || (is() && id === 'truhanov');           // с кем говорим как с начальством
  G.isSub = id => { if (!D.NPC[id] || EXEMPT.indexOf(id) >= 0 || gone(id)) return false; if (moved(id)) return me() >= 8; return NR[id] != null && NR[id] < me(); };
  const _ib = G.isBoss; G.isBoss = id => !!_ib(id) && G.isSuperior(id);
  const strikes = id => ((F().strikes || {})[id] || 0);
  const addStrike = id => { const f = F(); f.strikes = f.strikes || {}; f.strikes[id] = (f.strikes[id] || 0) + 1; };

  // ---------- 1. «Руководить»
  const STEP = { remark: 6, task: 7, check: 8, reprimand: 9, hint: 9, praise: 9, fire: 9 };
  const day = () => G.s.t.day;
  const usedToday = id => (F().leadDay || {})[id] === day();
  const markUsed = id => { const f = F(); f.leadDay = f.leadDay || {}; f.leadDay[id] = day(); };
  const sad = (id, txt, fx, rel) => { const sum = G.fx(fx || {}, { npc: id }); if (rel) G.relAdd(id, rel); G.toast(txt + (sum ? ' (' + sum + ')' : '')); };
  const plan = v => { if (G.plantStats) G.plantStats(); F().plan = C((F().plan || 50) + v); };
  const morale = v => { if (G.plantStats) G.plantStats(); F().shopMorale = C((F().shopMorale || 50) + v); };
  const friend = id => G.isFriend && G.isFriend(id);

  G.leadMenu = function (id) {
    const s = G.s, r = G.R(id), rk = rank(), n = nm(id), used = usedToday(id), why = null;
    const wait = used ? 'Сегодня уже распоряжались' : null;
    const o = [];
    const add = (key, t, dis, fn) => { if (rk >= STEP[key]) o.push({ t, dis: dis || wait, fn }); };
    add('remark', '📝 Сделать замечание', null, () => remark(id));
    add('task', '📋 Поручить задание (1 ч)', null, () => task(id));
    add('check', '🔍 Проверить работу (1 ч)', null, () => check(id));
    add('reprimand', '😠 Объявить выговор', null, () => reprimand(id));
    add('praise', '🏅 Выдвинуть на поощрение', (F().praiseWk || {})[id] > G.week() ? 'Недавно уже поощряли' : null, () => praise(id));
    add('hint', '💼 Намекнуть на «знак внимания»', (F().hintWk || 0) === G.week() ? 'Не чаще раза в неделю' : (F().hinted || {})[id] ? 'Он(а) уже понял(а) намёк' : null, () => hint(id));
    add('fire', '🚪 Уволить', fireBlock(id) , () => fire(id));
    o.push({ t: 'Назад', fn: () => {} });
    const need = rk < 7 ? 'Ступенью выше откроется поручение.' : rk < 8 ? 'С должности зама откроется проверка работы.' : rk < 9 ? 'С должности начальника цеха — выговоры, поощрения и кадровые решения.' : '';
    G.modal({ title: '👔 Руководить: ' + n, face: id, wide: true, text: 'Ты — ' + G.rankName().toLowerCase() + ', ' + first(id) + ' подчиняется тебе. Но люди запоминают, как ими распоряжаются.<br><small>Отметок о нарушениях: ' + strikes(id) + '. ' + need + '</small>', opts: o });
  };
  function remark(id) {
    markUsed(id); const r = G.R(id), p = C(70 + r.l / 4 - (friend(id) ? 15 : 0), 25, 92);
    if (G.chance(p)) sad(id, first(id) + ' кивает: «Понял, исправлю».', { coll: -0.5 }, -1);
    else sad(id, first(id) + ' обиженно: «Опять я?..»', { coll: -1, mood: -1 }, friend(id) ? -6 : -3);
    plan(0.5);
    G.afterAction({ h: 0, noEvent: true });
  }
  function task(id) {
    markUsed(id); G.later('lead_task_done', G.ri(2, 4), { id }); G.relAdd(id, 1); G.toast(first(id) + ' берёт задание в работу.'); G.spend(1);
  }
  L.lead_task_done = d => {
    if (!G.s || G.s.end) return; const r = G.R(d.id);
    if (G.chance(C(60 + r.l / 3, 30, 92))) { plan(2); G.relAdd(d.id, 1); G.toast(first(d.id) + ' выполнил(а) поручение в срок.', 'good'); }
    else { plan(-1); G.toast(first(d.id) + ' поручение завалил(а): «Не успел(а)».', 'warn'); }
  };
  function check(id) {
    markUsed(id); const r = G.R(id), prob = C(35 + strikes(id) * 12 - r.l / 6, 12, 80);
    if (G.chance(prob)) { addStrike(id); plan(1); morale(-0.5); G.fx({ know: 1, energy: -3 }); G.relAdd(id, -3); G.toast('Проверка выявила нарушения: ' + first(id) + ' получает отметку (' + strikes(id) + ').', 'warn'); }
    else { G.fx({ energy: -2 }); G.relAdd(id, 2); G.toast('Проверка ' + first(id) + ' прошла без замечаний. Людям приятно, когда начальник справедлив.', 'good'); }
    G.spend(1);
  }
  function reprimand(id) {
    markUsed(id); addStrike(id); G.relAdd(id, friend(id) ? -12 : -7); G.fx({ coll: -2 }); morale(-1.5); plan(0.5);
    G.toast(first(id) + ' получил(а) выговор (отметок: ' + strikes(id) + '). Остальные притихли.', 'warn'); G.spend(1);
  }
  function praise(id) {
    markUsed(id); const f = F(); f.praiseWk = f.praiseWk || {}; f.praiseWk[id] = G.week() + 4;
    G.relAdd(id, 8); G.fx({ coll: 2, cons: 1 }); morale(2); if (f.strikes && f.strikes[id] > 0) f.strikes[id]--;
    G.toast(first(id) + ' выдвинут(а) на поощрение. По цеху пошёл слух: «Начальник справедливый».', 'good'); G.spend(1);
  }
  function hint(id) {
    markUsed(id); const f = F(); f.hintWk = G.week(); f.hinted = f.hinted || {}; f.hinted[id] = 1;
    const r = G.R(id), amt = Math.round(700 * (rank() - 4) * (1 + G.rnd() * 0.5) / 100) * 100;
    const p = C(35 + r.l / 3 - (friend(id) ? 0 : 5), 10, 85);
    if (G.chance(p)) {
      G.addMoney(amt); G.fx({ cons: -5 }); G.note('Намёк на «знак внимания»'); G.relAdd(id, -2); G.later('bribe_audit', G.ri(10, 25), { amt });
      G.toast(first(id) + ' «случайно» оставил(а) конверт: +' + rub(amt) + '. Совесть молчит. Пока.', 'warn');
    } else {
      G.relAdd(id, -12); G.fx({ coll: -3, cons: -2 }); if (G.rumor) G.rumor('hint_' + id, 'Новый начальник намекал на конверт: ' + nm(id) + ' всем рассказал(а).', { coll: -3, boss: -1 }, 70);
      G.toast(first(id) + ' посмотрел(а) на тебя так, будто ты предложил(а) продать завод. Слухи пойдут.', 'bad');
    }
    G.spend(1);
  }
  L.bribe_audit = d => {
    if (!G.s || G.s.end || is()) return;
    if (G.chance(22)) { G.modal({ title: '🔎 Вопросы по конвертам', face: 'nadezhda', cls: 'bad', text: 'Проверяющая нашла: «знаки внимания» от подчинённых — это взятки. Придётся объясняться.', opts: [{ t: 'Выкручиваться', fn: () => G.punish({ risk: 100, what: 'Взятки от подчинённых', fine: [Math.round(d.amt * 0.7), Math.round(d.amt * 1.6)], sev: 2 }) }] }); }
  };

  // ---------- 2. Увольнение: только по основаниям и не лавинообразно
  function fireBlock(id) {
    const f = F(), wk = G.week(), rk = rank();
    if (usedToday(id)) return 'Сегодня уже распоряжались';
    if (rk < 9) return null;
    if ((f.fireN || 0) >= 5) return 'Кадровая комиссия больше не подпишет (уже 5 увольнений)';
    if (f.fireAt != null && wk - f.fireAt < 4) return 'Приказы об увольнении — не чаще раза в 4 недели';
    if (strikes(id) < 2 && rk < 10) return 'Нет оснований: нужны 2 отметки (сейчас ' + strikes(id) + ')';
    return null;
  }
  function fire(id) {
    G.modal({ title: 'Уволить: ' + nm(id) + '?', face: id, text: 'Основания: ' + (strikes(id) >= 2 ? 'отметок о нарушениях — ' + strikes(id) + '.' : 'нет (решение по должности).') + '<br>Цех всё видит: коллеги запомнят, чем кончается неудача, а профсоюз следит за соблюдением ТК. ' + (friend(id) ? '<br><b>Это человек из «Своих людей» — друзья этого не забудут.</b>' : ''), opts: [
      { t: 'Уволить с пособием (' + rub(20000) + ' из твоих)', dis: G.s.money < 20000 ? 'Нет денег' : null, fn: () => doFire(id, true) },
      { t: 'Уволить по статье', cls: 'danger', fn: () => doFire(id, false) },
      { t: 'Передумал', fn: () => {} }] });
  }
  function doFire(id, soft) {
    const f = F(), ground = strikes(id) >= 2; markUsed(id); f.ceoFired = f.ceoFired || {}; f.ceoFired[id] = day() + 1; f.fireN = (f.fireN || 0) + 1; f.fireAt = G.week();
    if (soft) G.addMoney(-20000);
    if (friend(id)) { G.endFriend && G.endFriend(id, 'ты подписал(а) приказ об увольнении.'); (G.friends() || []).forEach(o => G.relAdd(o, -8)); }
    G.fx({ coll: ground ? -2 : -6, cons: ground ? 0 : -3 }); morale(ground ? -1 : -4);
    if (!soft || !ground) G.later('fire_complaint', G.ri(4, 9), { id, soft: soft && ground });
    G.toast(first(id) + ' уволен(а). Пропуск аннулирован. В цехе стало тише.', 'warn'); G.spend(1);
  }
  L.fire_complaint = d => {
    if (!G.s || G.s.end) return;
    if (d.soft) return;
    G.fx({ coll: -2 }); info('📢 Профсоюз', 'Семёныч принёс жалобу: увольнение ' + nm(d.id) + ' оформлено с нарушениями. Пришлось объясняться.', 'bad', 'semyonych');
    if (G.chance(50)) G.punish({ risk: 100, what: 'Незаконное увольнение', fine: [2000, 6000], sev: 1 });
  };

  // ---------- 3. Кнопка в меню подчинённого
  const _sp = G.npcSpecial;
  G.npcSpecial = function (id) {
    const o = _sp.apply(this, arguments);
    try { if (!is() && rank() >= 6 && G.isSub(id)) o.push({ t: '👔 Руководить', fn: () => G.leadMenu(id) }); } catch (e) {}
    return o;
  };

  // ---------- 4. Почтительное обращение подчинённых (ступенчато по должности)
  const DEF_LINES = {
    6: [{ t: '«Мастер, у меня вопрос по участку. Разрешите?»', o: [['Слушаю.', 'Он оживляется: «Спасибо, что выслушали».', { coll: 1 }], ['Потом.', 'Кивает, но вздыхает.', {}]] }],
    8: [{ t: '«Здравствуйте. План по участку идёт, разрешите доложить?»', o: [['Докладывайте.', 'Доклад чёткий, без воды. Это приятно.', { know: 1, coll: 1 }], ['Давайте позже.', 'Он кивает: «Как скажете».', {}]] },
        { t: '«Если что — обращайтесь, мы всё сделаем. Только не забывайте нас, когда будете наверху».', o: [['Не забуду.', 'Он улыбается: «Мы в вас верим».', { mood: 2 }], ['Работайте.', '«Так точно».', {}]] }],
    9: [{ t: '«Смирно, начальник идёт!» — шепчет он коллегам и тут же краснеет. «Здравствуйте».', o: [['Вольно.', 'Все выдыхают и смеются.', { coll: 2, mood: 2 }], ['Продолжайте.', 'Работа идёт ровно, глаза у всех в пол.', {}]] },
        { t: '«Разрешите обратиться? Смена просит нормальную спецодежду. Вы — наша последняя надежда».', o: [['Решу.', 'Он кланяется чуть ниже, чем нужно.', { coll: 3 }], ['Потерпите.', 'Он кивает, но тихо вздыхает.', { coll: -1 }]] }]
  };
  const _tt = G.talkTo;
  G.talkTo = function (id) {
    if (!is() && rank() >= 6 && G.isSub(id) && !(G.isBoss && G.isBoss(id)) && G.chance(55)) {
      const key = rank() >= 9 ? 9 : rank() >= 8 ? 8 : 6, d = G.pick(DEF_LINES[key]); const r = G.R(id); r.met = true; r.talks = (r.talks || 0) + 1;
      G.modal({ title: nm(id), face: id, text: d.t, opts: d.o.map(o => ({ t: o[0], fn: () => { const sum = G.fx(o[2], { npc: id }); G.toast(o[1] + (sum ? ' (' + sum + ')' : '')); G.spend(1); } })) });
      return;
    }
    return _tt.apply(this, arguments);
  };

  // ---------- 5. Друзья после повышения: уважение, «Свой человек», исключение из друзей
  const floorFor = id => { const rk = rank(); if (rk < 6) return -100; if (friend(id)) return Math.min(90, 60 + (rk - 5) * 5); if (G.isSub(id) && rk >= 8) return 40 + (rk - 7) * 5; return -100; };
  G.hierarchyDaily = function () {
    const s = G.s; if (!s || s.end || is()) return;
    const f = F(), wk = G.week(); f.grudge = f.grudge || {};
    Object.keys(D.NPC).forEach(id => {
      const fl = floorFor(id); if (fl < 0 || (f.grudge[id] && f.grudge[id] > wk) || G.isShunned(id)) return;
      const r = G.R(id); if (r.met && r.l < fl) r.l = fl;
    });
    if (rank() >= 8) (G.friends() || []).forEach(id => { if (G.isSub(id) && (G.R(id).outN || 0) >= 3 && !(f.svoy || {})[id]) { f.svoy = f.svoy || {}; f.svoy[id] = 1; G.toast('«Свой человек»: ' + first(id) + ' теперь так и называет тебя за глаза — с уважением.', 'good'); } });
  };
  const _ed = G.extraDaily;
  G.extraDaily = function () { const r = _ed ? _ed.apply(this, arguments) : undefined; try { G.hierarchyDaily(); } catch (e) { if (window.console) console.error(e); } return r; };

  const INTRO = { 6: 'Для своих ты всё тот же. Но на людях они зовут тебя «мастер».', 8: 'Наедине — по-старому, при людях — «на вы». Свои этим гордятся.', 10: 'Для своих ты — как старший брат, ставший начальником. Они чуть робеют, но готовы за тебя в огонь.' };
  const withModalPatch = (fnName, patch) => {
    const orig = G[fnName];
    G[fnName] = function (id) {
      const m = G.modal; G.modal = function (spec) { try { spec = patch(id, spec) || spec; } catch (e) {} return m.call(this, spec); };
      try { return orig.apply(this, arguments); } finally { G.modal = m; }
    };
  };
  withModalPatch('friendMenu', (id, spec) => {
    const rk = rank(); if (rk < 6 || !spec || !spec.opts) return spec;
    const key = rk >= 10 ? 10 : rk >= 8 ? 8 : 6, f = F(), svoy = (f.svoy || {})[id] ? '<br><b>«Свой человек»</b> — ' + first(id) + ' ' + (G.isSub(id) ? 'всегда прикроет тебя перед коллективом.' : 'говорит с тобой как с равным.') : '';
    const opts = spec.opts.slice(); const bk = opts.length ? opts.pop() : null;
    if (rk >= 8) opts.push({ t: '🗑 Исключить из «Своих людей»', cls: 'danger', fn: () => removeFriend(id) });
    if (bk) opts.push(bk);
    return Object.assign({}, spec, { text: (spec.text || '') + '<br><i>' + INTRO[key] + '</i>' + svoy, opts });
  });
  function removeFriend(id) {
    G.modal({ title: 'Исключить ' + nm(id) + '?', face: id, text: 'Выгнать человека из «Своих людей» — это не заявление об увольнении, это личное. Он(а) обидится сильно и надолго; остальные друзья тоже это заметят.', opts: [
      { t: 'Да, вычеркнуть', cls: 'danger', fn: () => { const f = F(); f.grudge = f.grudge || {}; f.grudge[id] = G.week() + 12; (G.friends() || []).filter(o => o !== id).forEach(o => G.relAdd(o, -4)); G.endFriend && G.endFriend(id, 'ты сам(а) вычеркнул(а) его из своих.'); G.R(id).l = Math.min(G.R(id).l, -25); G.fx({ coll: -3 }); if (G.rumor) G.rumor('unfriend_' + id, 'Начальник вычеркнул ' + nm(id) + ' из своих. Люди запоминают такое.', { coll: -2 }, 60); } },
      { t: 'Передумал', fn: () => {} }] });
  }
  // после обиды повторная дружба — не раньше чем через 12 недель
  const _fo = G.friendOffer;
  G.friendOffer = function (id) { const g = (F().grudge || {})[id]; if (g && g > G.week()) { G.info(nm(id), '«Ты меня вычеркнул(а) из своих. Я это не забыл(а). Не сейчас».'); return; } return _fo.apply(this, arguments); };

  // рыбалка и выходы с подчинёнными: начальство замечает
  withModalPatch('outingMenu', (id, spec) => {
    const rk = rank(); if (rk < 8 || !spec || !spec.opts || !G.isSub(id)) return spec;
    spec = Object.assign({}, spec); spec.opts = spec.opts.map(o => o.fn && !/Передумал/.test(o.t) ? Object.assign({}, o, { fn: () => { const r = o.fn(); try { afterOuting(id); } catch (e) {} return r; } }) : o);
    return spec;
  });
  function afterOuting(id) {
    const f = F(), r = G.R(id); r.outN = (r.outN || 0) + 1; G.relAdd(id, 3);
    const svoy = (f.svoy || {})[id];
    if (G.chance(svoy ? 12 : 35)) { G.fx({ boss: -2 }); G.toast('Вышестоящие косо смотрят: начальник ходит на рыбалку с ' + first(id) + '. Странно для твоей должности.', 'warn'); }
    else if (svoy || r.outN >= 2) { G.fx({ coll: 2 }); G.toast('В цехе говорят: «Наш начальник — свой человек».', 'good'); }
  }

  // руководители в «Своих людях»
  const EXEC = { pelageya: 6, gosha: 7, ekaterina: 8, kulezhov: 8, shchiplen: 9, rassvetov: 9, soplezhuykin: 10 };
  const _fa = G.friendable; G.friendable = id => !!_fa(id) || (EXEC[id] != null && !!D.NPC[id]);
  const _fr = G.friendReq;
  G.friendReq = function (id) {
    if (EXEC[id] != null && !_fa(id) && rank() < EXEC[id]) return { ok: false, miss: ['с ним на равных — после должности «' + (D.RANKS[EXEC[id]] || 'выше') + '»'] };
    return _fr.apply(this, arguments);
  };
  const EXEC_PERK = { pelageya: 'закрывает глаза на мелкие нарушения по ТБ', gosha: 'проводит вне очереди на проходной', ekaterina: 'ОТК смотрит благосклонно: меньше брака', kulezhov: 'делится кулуарными новостями (+статус)', shchiplen: 'замолвит слово наверху', rassvetov: 'консультирует по технике (+знания)', soplezhuykin: 'предупреждает о проверках' };
  const _fp = G.friendPerkText; G.friendPerkText = id => EXEC_PERK[id] || _fp(id);
  const _dt = G.dailyTick;
  G.dailyTick = function () {
    const r = _dt.apply(this, arguments);
    try { (G.friends() || []).forEach(id => { if (!EXEC_PERK[id]) return; if (id === 'rassvetov') G.fx({ know: 1 }); else if (id === 'kulezhov') G.fx({ coll: 1 }); else if (id === 'shchiplen' || id === 'soplezhuykin') G.fx({ boss: 0.5 }); else if (id === 'ekaterina') G.fx({ know: 0.5 }); }); } catch (e) {}
    return r;
  };

  // ---------- 6. Выходной для руководителей
  const PEERS = ['ekaterina', 'kulezhov', 'shchiplen', 'rassvetov', 'soplezhuykin', 'truhanov', 'pelageya', 'gosha'];
  const peerList = () => PEERS.filter(id => D.NPC[id] && !gone(id) && G.R(id).met && !moved(id) && (G.isFriend(id) || G.nr(id) >= rank() - 1) && G.nr(id) <= me() + 3 && G.R(id).l >= 10);
  const LEIS = [
    { k: 'fish', t: '🎣 Закрытая рыбалка на пруду', h: 3, cost: 1500, min: 8, rel: 6, fx: { mood: 10, energy: -4 }, txt: 'Тихий пруд, свой катер и разговор без лишних ушей. Лучшая рыбалка в твоей жизни.' },
    { k: 'chess', t: '♟ Партия в шахматы в кабинете', h: 1, cost: 0, min: 8, rel: 3, fx: { know: 1, mood: 3 }, txt: 'Двигать фигуры и молчать — искусство руководителя.' },
    { k: 'sauna', t: '🧖 Сауна «для своих»', h: 2, cost: 2500, min: 8, rel: 5, fx: { mood: 8, health: 1, cool: 1 }, txt: 'Веники, мёд и дела, которые решаются в простынях.' },
    { k: 'hunt', t: '🦌 Охота на выходные', h: 4, cost: 4000, min: 9, rel: 8, fx: { mood: 12, cool: 2, energy: -8 }, txt: 'Двустволка, рассвет, термос с коньяком. Договорённости рождаются в лесу.' }
  ];
  G.A('exec_leisure', { ph: ['free'], loc: 'home', g: 'Для руководителей', n: 'Выходной для начальства', i: '🥃', menu: true, noEvent: true, minRank: 8, fn: () => {
    const s = G.s, ids = peerList();
    if (!ids.length) { info('Некого позвать', 'Для таких выходов нужны ровня или начальство, с кем у тебя уже хорошие отношения (≥ 10). Познакомься и общайся.'); return 'custom'; }
    G.modal({ title: '🥃 С кем проведёшь время?', text: 'Только для руководителей: сюда простых работяг не зовут. Здесь заводятся нужные знакомства.', wide: true, opts: ids.map(id => ({ t: nm(id) + ' (' + (G.D.NPC[id].role || '') + ', отн. ' + Math.round(G.R(id).l) + ')', fn: () => leisureWith(id) })).concat([{ t: 'Закрыть', fn: () => {} }]) });
    return 'custom';
  } });
  function leisureWith(id) {
    const s = G.s, rk = rank();
    G.modal({ title: 'Чем заняться с ' + first(id) + '?', face: id, wide: true, opts: LEIS.map(a => ({ t: a.t + ' (' + a.h + ' ч' + (a.cost ? ', ' + rub(a.cost) : '') + ')', dis: rk < a.min ? 'Нужна должность ранга ' + a.min : s.money < a.cost ? 'Нет денег' : (F().leisDay || {})[id] === day() ? 'Сегодня уже встречались' : (s.t.hour + a.h > 26 ? 'Слишком поздно' : null), fn: () => {
      const f = F(); f.leisDay = f.leisDay || {}; f.leisDay[id] = day();
      if (a.cost) G.addMoney(-a.cost);
      G.fx(a.fx); G.relAdd(id, a.rel); G.R(id).last = G.week();
      if (G.rl(id) >= 50 && G.chance(25) && !is()) { G.fx({ boss: 2 }); G.toast('За стаканом ' + first(id) + ' проговорился(ась): наверху о тебе хорошо отзываются.', 'good'); }
      if (a.k === 'hunt' && G.chance(8)) { G.fx({ health: -6 }); G.toast('Неудачный выстрел — царапина. Зато история на год.', 'warn'); }
      G.toast(a.txt, 'good'); G.spend(a.h);
    } })).concat([{ t: 'Назад', fn: () => {} }]) });
  }

  // ---------- 7. «Знаки внимания» подчинённых и подарки к повышению
  const E = (id, o) => { o.id = id; G.EV.push(o); return o; };
  const bribeAmt = () => Math.round(500 * (rank() - 4) * (1 + G.rnd() * 0.6) / 100) * 100;
  E('sub_gift', { where: ['work'], w: 1.4, cd: 12, cond: s => !is() && s.car.rank >= 6 && s.car.shifts >= 30 && Object.keys(D.NPC).some(id => G.isSub(id) && G.R(id).met && G.R(id).l >= 20), fn: s => {
    const ids = Object.keys(D.NPC).filter(id => G.isSub(id) && G.R(id).met && G.R(id).l >= 20); if (!ids.length) return;
    const id = G.pick(ids), amt = bribeAmt();
    G.modal({ title: '🎁 Знак внимания', face: id, text: nm(id) + ' мнётся у двери: «Разрешите… вот. От чистого сердца, ничего такого. Просто чтобы вы нас не забывали».<br>В конверте — ' + rub(amt) + '.', opts: [
      { t: 'Принять (' + rub(amt) + ')', fn: () => { G.addMoney(amt); G.fx({ cons: -4 }); G.relAdd(id, 3); const f = F(); f.bribesTaken = (f.bribesTaken || 0) + 1; G.note('Приняты деньги от подчинённого'); G.later('bribe_audit', G.ri(10, 25), { amt }); G.toast('Конверт исчез в ящике стола. Ты теперь немного «должен».', 'warn'); G.spend(1); } },
      { t: 'Вежливо отказаться', fn: () => { G.relAdd(id, 4); G.fx({ cons: 3, coll: 1 }); G.toast(first(id) + ': «Золотой начальник. Таких мало».', 'good'); G.spend(1); } }] });
  } });
  L.promo_gifts = d => {
    if (!G.s || G.s.end || is()) return;
    const amt = Math.round(1000 * (d.to - 4) * (1 + G.rnd() * 0.4) / 100) * 100;
    G.modal({ title: '🎁 Подарок от коллектива', text: 'По случаю назначения («' + (D.RANKS[d.to] || 'новая должность') + '») подчинённые скинулись на подарок: коньяк, галстук и конверт «на обмывание».', opts: [
      { t: 'Принять всё (+коньяк, галстук, ' + rub(amt) + ')', fn: () => { G.give('cognac', 1); G.give('tie', 1); G.addMoney(amt); G.fx({ mood: 6, cons: -3, coll: 2 }); G.note('Конверт от коллектива при назначении'); G.later('bribe_audit', G.ri(12, 30), { amt }); } },
      { t: 'Принять только коньяк и галстук', fn: () => { G.give('cognac', 1); G.give('tie', 1); G.fx({ mood: 6, coll: 3, cons: 1 }); } },
      { t: 'Отказаться: «Не за то работаем»', fn: () => { G.fx({ cons: 4, coll: 4, mood: 2 }); } }] });
  };
  const K = G.career;
  if (K && K.promote) { const _pr = K.promote; K.promote = function (to) { const r = _pr.apply(this, arguments); try { if (to >= 6 && !is() && G.later) G.later('promo_gifts', 2, { to }); } catch (e) {} return r; }; }
})();
