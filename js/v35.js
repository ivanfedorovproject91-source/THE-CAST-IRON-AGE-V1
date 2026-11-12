/* ===== v3.5 (часть A): шкала «Отношения», разговоры, «Свои люди» (макс. 5) ===== */
(function () {
  const G = window.G, D = G.D, C = G.clamp;
  const F = () => G.s.flags;
  const msg = (t, c) => G.toast(t, c);
  const sp = n => G.spend(n || 1);
  const first = id => (D.NPC[id] ? D.NPC[id].name.split(' ')[0] : id);
  const hash = str => { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
  const MAXF = 5;

  // ---------- Потолок отношений: не со всеми можно дойти до 100%
  G.relCap = function (id) {
    const n = D.NPC[id]; if (!n) return 100;
    if (G.friendable(id)) return (!G.isFriend(id) && G.friends().length >= MAXF) ? 92 : 100;
    if (n.romance) return 90;
    return 65;
  };
  G.relColor = l => l >= 0 ? 'hsl(' + Math.round(50 + 70 * Math.min(1, l / 100)) + ',70%,45%)' : 'hsl(' + Math.round(50 + 50 * Math.max(-1, l / 100)) + ',75%,45%)';
  G.relBar = function (id) {
    const l = G.R(id).l;
    return '<div class="rbar"><i style="width:' + Math.max(3, (l + 100) / 2) + '%;background:' + G.relColor(l) + '"></i></div>';
  };
  G.relFace = (id, cls) => '<div class="rface">' + G.faceHTML(id, cls) + G.relBar(id) + '</div>';
  G.relWord = function (l) { return l <= -60 ? 'Враг' : l <= -25 ? 'Неприязнь' : l < -5 ? 'Прохладно' : l <= 10 ? 'Нейтрально' : l <= 35 ? 'Знакомый' : l <= 60 ? 'Приятель' : l <= 85 ? 'Хороший друг' : l < 100 ? 'Почти свой' : 'Свой человек'; };
  G.relBig = function (id) {
    const r = G.R(id), l = r.l, cap = G.relCap(id), n = D.NPC[id];
    let note = '';
    if (G.isFriend(id)) note = 'В блоке «Свои люди»';
    else if (!G.friendable(id)) note = 'Дальше приятельских отношений дело не пойдёт';
    else if (G.friends().length >= MAXF) note = 'В «Своих людях» нет мест (максимум ' + MAXF + ')';
    else note = 'На 100% человек станет своим';
    return '<div class="rbig"><div class="rbig-h"><span>Отношения</span><b style="color:' + G.relColor(l) + '">' + G.relWord(l) + '</b></div>'
      + '<div class="rbar big"><i style="width:' + Math.max(2, (l + 100) / 2) + '%;background:' + G.relColor(l) + '"></i><u></u></div>'
      + '<div class="rbig-s">' + Math.round(l) + ' из ' + cap + ' · ' + note + '</div></div>';
  };

  // разные стартовые отношения (в среднем нейтральные)
  const _R = G.R;
  G.R = function (id) {
    const s = G.s, had = !!(s && s.rel[id]);
    const r = _R.apply(this, arguments);
    if (!had && D.NPC[id]) { const h = hash(id + (s.name || '')); r.l = C(r.l + (h % 31) - 15, -100, G.relCap(id)); }
    return r;
  };

  // нарабатываются медленно: дневной лимит и затухание у верха шкалы
  const _ra = G.relAdd;
  G.relAdd = function (id, d) {
    const s = G.s, r = G.R(id);
    if (d > 0) {
      const CF = G.CONFIG || {};
      if (r.l > 75) d *= (CF.REL_TAPER_HIGH || 0.5); else if (r.l > 50) d *= (CF.REL_TAPER_MID || 0.7);
      if (s.st.coll < 30) d *= 0.8;
      if (r.gDay !== s.t.day) { r.gDay = s.t.day; r.g = 0; }
      d = Math.min(d, Math.max(0, (CF.REL_DAILY_CAP || 9) - r.g)); r.g += d;
    }
    const out = _ra.call(this, id, d);
    const cap = G.relCap(id); if (r.l > cap) r.l = cap;
    if (d > 0) promote(id);
    return out;
  };
  function promote(id) {
    const r = G.R(id), s = G.s;
    if (!G.friendable(id) || G.isFriend(id) || r.l < 100 || s.flags['shun_' + id] || G.friends().length >= MAXF) return;
    G.addFriend(id);
    G.modal({ title: '🤝 Теперь вы свои', face: id, vib: 'success', cls: 'good', text: D.NPC[id].name + ' хлопает тебя по плечу: «Знаешь… ты мне как брат. Если что — я рядом». <br><b>' + first(id) + ' теперь в блоке «Свои люди» навсегда.</b> Дружбу надо поддерживать, но разрушить её могут только серьёзные ссоры: долги, обман, стукачество.' + '<br><i>Открылись: «Приколы с ' + first(id) + '», совместные выходы после работы и польза на работе.</i>', opts: [{ t: 'Круто!', fn: () => {} }] });
  }
  // Свой человек — только когда есть место; кнопки «дружбы» убираем
  const _addF = G.addFriend;
  G.addFriend = function (id) {
    if (G.friends().length >= MAXF && !G.isFriend(id)) return;
    const f = F(); G.friends();
    if (f.friends.indexOf(id) < 0) f.friends.push(id);
    delete f['shun_' + id]; f['fsince_' + id] = G.week();
    if (G.boardAdd) G.boardAdd(D.NPC[id].name + ' теперь твой друг', 'good');
    if (G.xp) G.xp(30);
  };

  // ---------- Дрейф отношений «сам по себе» (еженедельно, но логично)
  const _wt0 = G.weeklyTick;
  G.weeklyTick = function () {
    const r0 = _wt0.apply(this, arguments);
    try {
      const s = G.s, st = s.st;
      Object.keys(s.rel).forEach(id => {
        const r = s.rel[id], n = D.NPC[id]; if (!n || !r.met || G.isFriend(id)) return;
        const idle = G.week() - (r.last || 0); let d = 0;
        if (idle >= 2 && r.l > 0) d -= Math.min(r.l, 2);        // без общения остывают
        if (r.l < 0 && idle >= 2) d += 1;                       // обиды понемногу забываются
        if (G.chance(25)) {                                       // репутация игрока
          if (st.coll >= 65 && st.neat >= 55) d += 1; else if (st.habit >= 50 || st.neat < 30 || G.hasNick && G.hasNick('alkash')) d -= 1;
        }
        if (d) r.l = C(r.l + d, -100, G.relCap(id));
      });
    } catch (e) { if (window.console) console.error(e); }
    return r0;
  };

  // ---------- Разные виды разговоров
  G.talkMenu = function (id) {
    const s = G.s, n = D.NPC[id], r = G.R(id), face = id;
    if (id === 'tamara' && G.tamaraTalk) return G.tamaraTalk();
    if (r.tDay !== s.t.day) { r.tDay = s.t.day; r.tN = 0; r.kinds = {}; }
    if (r.tN >= 4) { G.info(n.name, 'Мы сегодня уже наговорились. Дай голове отдохнуть.'); return; }
    const done = (k, fn) => () => { r.kinds[k] = 1; r.tN++; r.talks = (r.talks || 0) + 1; r.met = true; fn(); };
    const used = k => r.kinds[k] ? 'Об этом уже говорили сегодня' : null;
    const o = [];
    o.push({ t: '💬 Поговорить о том о сём', fn: () => { r.tN++; G.talkTo(id); } });
    o.push({ t: '🙋 Расспросить о жизни', dis: used('ask'), fn: done('ask', () => { G.relAdd(id, 2); G.fx({ mood: 1 }); msg(first(id) + ' рассказал(а) кое-что о себе: ' + G.pick(['про семью и дачу', 'про молодость на заводе', 'про старую обиду на начальство', 'про мечту уехать куда-нибудь', 'про то, как раньше всё было лучше']) + '.', 'good'); sp(1); }) });
    o.push({ t: '😄 Пошутить', dis: used('joke'), fn: done('joke', () => { const p = C(40 + (s.st.cool || 0) / 2 + (s.st.mood - 50) / 4 + r.l / 5, 15, 85); if (G.chance(p)) { G.relAdd(id, 3); G.fx({ mood: 3 }); msg(first(id) + ' рассмеялся(ась): «Ха! Ну ты даёшь».', 'good'); } else { G.relAdd(id, -2); G.fx({ mood: -1 }); msg('Шутка не зашла. Тишина — как в цехе после аварии.', 'warn'); } sp(1); }) });
    o.push({ t: '😩 Пожаловаться на жизнь', dis: used('whine'), fn: done('whine', () => { if (r.l >= 10) { G.fx({ mood: 4 }); G.relAdd(id, 1); msg(first(id) + ' выслушал(а) и вздохнул(а): «Все мы тут так».', 'good'); } else { G.fx({ mood: -1 }); G.relAdd(id, -1); msg(first(id) + ': «А мне-то что? У самого проблем хватает».', 'warn'); } sp(1); }) });
    o.push({ t: '🗣 Обсудить коллег', dis: used('gossip'), fn: done('gossip', () => { if (r.l < 0) { msg(first(id) + ' не хочет с тобой это обсуждать.', 'warn'); sp(1); return; } G.relAdd(id, 3); G.fx({ mood: 3, coll: 1 }); if (G.chance(30)) { F().gossipRep = (F().gossipRep || 0) + 1; G.fx({ coll: -2 }); msg('Слова разлетелись по цеху — теперь тебя считают сплетником.', 'bad'); if (F().gossipRep >= 4 && G.addNick) G.addNick('spletnik'); } else msg('Вы вдвоём перемыли косточки начальству. Стало легче.', 'good'); sp(1); }) });
    o.push({ t: '💡 Спросить совета по работе', dis: r.l < 25 ? 'Нужно отношение ≥ 25' : used('advice'), fn: done('advice', () => { s.day.advice = 1; G.relAdd(id, 1); msg(first(id) + ' дал(а) дельный совет: ' + G.pick(['«Не торопись, проверь размеры дважды».', '«Смазывай станок — он добрее становится».', '«Мастеру не перечь, а вот Щиплену — вообще не попадайся».', '«Бери перерыв вовремя, а то выгоришь».']) + ' (работа сегодня чуть лучше)', 'good'); sp(1); }) });
    o.push({ t: 'Назад', fn: () => {} });
    G.modal({ title: n.name + ': разговор', face, text: G.relBig(id) + '<br>О чём поговорим? (сегодня разговоров: ' + r.tN + ' из 4)', opts: o });
  };

  // фильтры кнопок персонажа: без «Предложить дружить»; «Приколы» — только у своих; драки только при плохих отношениях
  const _sp = G.npcSpecial;
  G.npcSpecial = function (id) {
    let o = _sp.apply(this, arguments).filter(x => !/Предложить дружить|Меню друга|^😎 Приколы|Афоня: приколы/.test(x.t));
    const r = G.R(id);
    if (r.l >= 0) o = o.filter(x => !/Нарваться на драку/.test(x.t));
    if (G.isFriend(id)) o.push({ t: '🤝 Свои люди: меню ' + first(id), fn: () => G.friendMenu(id) });
    return o;
  };

  // ---------- Меню друга: приколы, выходы, помощь
  const PERK = {
    seryoga: { d: 'прикрывает у станка и приносит термос (+энергия)', day: () => G.fx({ energy: 3 }) },
    afonya: { d: 'поднимает настроение шутками', day: () => G.fx({ mood: 3 }) },
    vityok: { d: 'иногда чинит твой станок — меньше брака', day: () => { F().vityokFix = G.s.t.day; } },
    mikhalych: { d: 'делится опытом: растёт мастерство', day: () => G.fx({ know: 1 }) },
    palych: { d: 'наставник: подсказывает приёмы (+знания) и вытаскивает из передряг', day: () => G.fx({ know: 2 }) },
    kolyan: { d: 'знает людей: иногда подкидывает халтуру (+деньги)', day: () => { if (G.chance(25)) { G.addMoney(400); msg('Колян подкинул халтурку: +400 ₽', 'good'); } } },
    zahar: { d: 'заряжает энтузиазмом', day: () => G.fx({ mood: 2, energy: 2 }) },
    khomyak: { d: 'угощает перекусом (+сытость)', day: () => G.fx({ satiety: 10 }) },
    rafik: { d: 'подвозит на работу — реже опаздываешь', day: () => { F().rafikRide = G.s.t.day; } },
    lyosha: { d: 'поит чаем — понемногу лечит (+здоровье)', day: () => G.fx({ health: 3 }) },
    egorych: { d: 'пропускает без пропуска', day: () => {} },
    nyura: { d: 'кормит пирожками (+сытость, +настроение)', day: () => G.fx({ satiety: 8, mood: 2 }) },
    stepanych: { d: 'замолвит словечко начальству (+отношение с боссом)', day: () => { if (G.chance(30)) G.fx({ boss: 1 }); } },
    semyonych: { d: 'профсоюз заступается — штрафы меньше', day: () => {} }
  };
  G.friendPerkText = id => (PERK[id] && PERK[id].d) || 'просто хороший человек рядом';
  const _fd = G.dailyTick;
  G.dailyTick = function () {
    const r = _fd.apply(this, arguments);
    try { G.friends().forEach(id => { if (PERK[id] && PERK[id].day) PERK[id].day(); }); } catch (e) { if (window.console) console.error(e); }
    return r;
  };

  // приколы: у каждого свои
  const P = (t, fx, txt, h) => ({ t, fx, txt, h: h || 1 });
  const PR = {
    seryoga: null, // особое меню
    afonya: [P('🎸 Спеть под гитару в курилке', { mood: 8, coll: 2 }, 'Афоня бренчит, ты орёшь «Чугунный блюз». Курилка аплодирует.'), P('🧢 Подменить каски у мастера', { mood: 6, coll: 2, cons: -1 }, 'Мастер весь день ходит в каске на два размера меньше. Афоня сияет.'), P('🍌 Раздать «банановую премию»', { mood: 7, coll: 3 }, 'Афоня раздаёт цеху бананы со словами «от дирекции». Директор ни при чём.')],
    vityok: [P('🔧 Разобрать мотоблок в гараже', { mood: 5, know: 2, energy: -4 }, 'Разобрали, собрали, осталась лишняя деталь. Работает!', 2), P('🛢 Слить «технический» спирт для станков', { mood: 6, cons: -2 }, 'Для станков. Исключительно для станков.'), P('📻 Починить приёмник на «Радио Шансон»', { mood: 7, coll: 1 }, 'Теперь в цехе играет шансон. Цех доволен.')],
    mikhalych: [P('🥃 Пропустить по рюмке «для смелости»', { mood: 9, drunk: 12, cons: -1 }, 'Михалыч достал заначку: «По одной, чисто по-человечески».'), P('📜 Послушать байки про 90-е', { mood: 6, know: 1 }, 'Михалыч рассказывает, как менял станок на мешок картошки.'), P('🛠 Научить «секретному» приёму шлифовки', { know: 3, energy: -3 }, 'Приём работает: деталь блестит, мастер доволен.')],
    palych: [P('🎣 Послушать про место на реке', { mood: 8, know: 1 }, 'Палыч рисует на ладони карту секретного места.'), P('📐 Разобрать чертёж «как положено»', { know: 4, energy: -4 }, 'Палыч показывает, где чертёж врёт. Оказывается, часто.'), P('🍵 Посидеть в подсобке с чаем', { mood: 7, energy: 5 }, 'Тихо, по-стариковски. Мир на мгновение добрее.')],
    kolyan: [P('🚗 Покататься на его «Ладе»', { mood: 9, energy: -2 }, 'Колян рулит одной рукой, второй рассказывает про бизнес.'), P('📞 Обсудить «выгодное дело»', { mood: 4, know: 1 }, 'Дело выгодное, вот только вкладываться придётся тебе. Ты вежливо отказался.'), P('🥟 Налепить пельмени у него дома', { mood: 8, satiety: 15 }, 'Пельмени кривые, зато от души.', 2)],
    zahar: [P('🥾 Сходить на «разведку» по заводу', { mood: 6, know: 2 }, 'Захар находит заброшенный склад и три ржавых гаечных ключа.'), P('📣 Устроить розыгрыш в раздевалке', { mood: 8, coll: 2 }, 'Шкафчики поменялись местами. Раздевалка в панике, Захар хохочет.')],
    khomyak: [P('📦 «Реализовать» лишнее с проходной', { mood: 5, cons: -3 }, 'Хомяк что-то выносит в рюкзаке. Ты ничего не видел.'), P('🧮 Посчитать «навар» за неделю', { mood: 4, know: 1 }, 'У Хомяка в тетрадке — своя бухгалтерия. Честнее государственной.')],
    rafik: [P('🚘 Прокатиться на «Майбахе»', { mood: 10, cool: 2 }, 'Директорская машина без директора. Ощущения — как в кино.', 1), P('🍖 Заехать на шашлыки', { mood: 8, satiety: 12 }, 'Рафик жарит так, что соседи плачут.', 2)],
    lyosha: [P('🎶 Подпеть шансон на вахте', { mood: 8, coll: 1 }, 'Дядя Лёша знает все слова. Все.'), P('🔦 Обойти территорию ночным обходом', { mood: 5, know: 1 }, 'Фонарик, тишина и истории о призраке главного инженера.')],
    egorych: [P('🥶 Посидеть на проходной зимой', { mood: 5, health: -1 }, 'Егорыч греет руки о кружку и рассказывает про все смены с 1987 года.'), P('📖 Послушать «журнал проходной»', { mood: 6, know: 2 }, 'Журнал хранит тайны завода: кто, когда и в каком виде заходил.')],
    nyura: [P('🥒 Закрутить огурцы на зиму', { mood: 7, satiety: 10 }, 'Банок — как на заводе болтов. Тебе достаётся пять.', 2), P('🧶 Распутать клубки', { mood: 5, energy: 3 }, 'Баба Нюра говорит, что у тебя «золотые руки».')],
    stepanych: [P('🚬 Выйти курнуть «по-начальственному»', { mood: 6, boss: 1 }, 'Степаныч делится мудростью: «Начальство — не враг. Оно просто не понимает».'), P('🍷 Выпить за здоровье цеха', { mood: 7, drunk: 8, boss: 1 }, 'Рюмка в кабинете, чтобы никто не видел. Все видели.')],
    semyonych: [P('📋 Разобрать устав профсоюза', { mood: 3, know: 3 }, 'Выяснилось, что у тебя есть права. Это шок.'), P('🥂 Обмыть «победу над администрацией»', { mood: 8, drunk: 8, coll: 2 }, 'Победа небольшая, но обмыли основательно.')]
  };
  G.friendPranks = function (id) {
    if (id === 'seryoga' && G.seryogaMenu) return G.seryogaMenu();
    if (id === 'afonya' && !PR.afonya) return G.afonyaMenu();
    const list = PR[id] || [P('🤝 Просто провести время вместе', { mood: 5 }, 'Хорошо, когда есть свои.')];
    const s = G.s, n = D.NPC[id], r = G.R(id);
    if (r.prDay === s.t.day && r.prN >= 2) { G.info(n.name, 'Сегодня уже хватит приколов. Остаётся ещё и работать.'); return; }
    G.modal({ title: '😎 Приколы с ' + first(id), face: id, text: n.name + ' хитро улыбается: «Ну что, чем займёмся?»', opts: list.map(a => ({ t: a.t + (a.h > 1 ? ' (' + a.h + ' ч)' : ''), fn: () => {
      if (r.prDay !== s.t.day) { r.prDay = s.t.day; r.prN = 0; } r.prN++;
      G.fx(a.fx); G.relAdd(id, 2); r.last = G.week(); msg(a.txt, 'good'); sp(a.h);
    } })).concat([{ t: 'Назад', fn: () => {} }]) });
  };

  // ---------- Совместные выходы после работы
  G.outingMenu = function (id) {
    const s = G.s, n = D.NPC[id], free = G.isFree();
    const need = free ? null : 'Только вечером или в выходной';
    const done = (txt, fx, rel, h) => { G.fx(fx); G.relAdd(id, rel); G.R(id).last = G.week(); msg(txt, 'good'); sp(h); };
    G.modal({ title: 'Куда пойдём с ' + first(id) + '?', face: id, text: 'Свои люди — это не только работа. Выбирай, чем заняться после смены.', wide: true, opts: [
      { t: '🍺 Пойти в бар с ' + first(id) + ' (2 ч, ~600 ₽)', dis: need || (s.money < 600 ? 'Нет денег' : null), fn: () => G.barVisit(id) },
      { t: '🎣 Рыбалка с ' + first(id) + ' (3 ч)', dis: need, fn: () => { const c = G.chance(60); done(c ? 'Поймали десяток карасей. Палыч бы гордился.' : 'Клёва не было, зато поговорили по душам.', { mood: 10, energy: -4, satiety: c ? 8 : 0 }, 4, 3); } },
      { t: '🧖 В баню с ' + first(id) + ' (2 ч, 500 ₽)', dis: need || (s.money < 500 ? 'Нет денег' : null), fn: () => { G.addMoney(-500); done('Пар, веник и разговоры. Заводская копоть смыта.', { mood: 8, health: 6, energy: 6, neat: 12 }, 4, 2); } },
      { t: '⚽ Футбол во дворе (2 ч)', dis: need, fn: () => { if (G.chance(10)) { G.fx({ health: -8 }); msg('Подвернул ногу на пенальти. Зато весело.', 'warn'); } done('Играли два на два. Победили (почти).', { mood: 8, energy: -9, health: 1 }, 3, 2); } },
      { t: '🔧 Посидеть в гараже (2 ч)', dis: need, fn: () => { if (G.chance(35)) { G.addMoney(300); msg('Помогли соседу с машиной: +300 ₽.', 'good'); } done('Масло, ключи и философия.', { mood: 6, know: 2, energy: -3 }, 3, 2); } },
      { t: '🎱 Бильярд в «Шаре» (2 ч, 400 ₽)', dis: need || (s.money < 400 ? 'Нет денег' : null), fn: () => { G.addMoney(-400); const w = G.chance(45 + s.st.cool / 4); done(w ? 'Ты выиграл партию! ' + first(id) + ' уважительно кивает.' : first(id) + ' разделал тебя под орех, но пиво проставил.', { mood: w ? 10 : 6, cool: w ? 1 : 0 }, 3, 2); } },
      { t: 'Передумал', fn: () => {} }] });
  };

  // Пиво на скорость
  const MG = G.MG;
  MG.beer = function (el, spec, done) {
    let me = 0, fr = 0, alive = true, last = performance.now(), t0 = last;
    el.innerHTML = '<div class="mg"><div class="mg-title">' + (spec.title || '') + '</div><div class="mg-hint">' + (spec.hint || '') + '</div>'
      + '<div class="beer-row"><span>' + spec.fn + '</span><div class="beerbar"><i id="fb"></i></div></div>'
      + '<div class="beer-row"><span>Ты</span><div class="beerbar"><i id="mb"></i></div></div>'
      + '<button class="btn beer-tap" id="tap">🍺 ПИТЬ! (тапай быстро)</button></div>';
    const fb = el.querySelector('#fb'), mb = el.querySelector('#mb');
    const speed = spec.speed || 0.2;
    const tap = el.querySelector('#tap');
    const hit = () => { if (alive) me = Math.min(1, me + 0.065); };
    tap.addEventListener('pointerdown', e => { e.preventDefault(); hit(); });
    function loop(now) {
      if (!alive) return; const dt = Math.min(0.1, (now - last) / 1000); last = now;
      fr = Math.min(1, fr + dt * speed * (0.8 + 0.5 * Math.sin((now - t0) / 350 + 1)));
      me = Math.max(0, me - dt * 0.03);
      fb.style.width = fr * 100 + '%'; mb.style.width = me * 100 + '%';
      if (fr >= 1 || me >= 1) { alive = false; return setTimeout(() => done(me >= 1 && fr < 1 ? 1 : (me >= 1 && fr >= 1 ? 0.5 : 0)), 350); }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    return () => { alive = false; };
  };
  G.barVisit = function (id) {
    const s = G.s, n = D.NPC[id], r = G.R(id);
    G.addMoney(-150);
    let round = 0;
    const speed = 0.17 + Math.min(0.1, (n.age ? (50 - Math.abs(40 - n.age)) / 400 : 0)) + (G.hash ? 0 : 0);
    function playRound() {
      round++;
      G.mini('beer', { title: '🍺 Бутылка пива на скорость — раунд ' + round, hint: n.name + ' уже приложился. Не отставай!', fn: first(id), speed }, res => {
        const sc = (res && res.score) || 0;
        G.fx({ drunk: 22, mood: sc >= 1 ? 6 : 3 }); G.relAdd(id, sc >= 1 ? 3 : 2);
        msg(sc >= 1 ? 'Ты выпил быстрее! ' + first(id) + ': «Силён! Наливай ещё».' : first(id) + ' выпил первым: «Слабак! Хотя… давай ещё».', sc >= 1 ? 'good' : 'warn');
        if (G.s.st.drunk >= 60) msg('Мир плывёт, лица двоятся…', 'bad');
        if (round < 3 && s.money >= 150 && G.s.st.drunk < 90) G.modal({ title: 'Ещё бутылку?', face: id, text: 'Выпито бутылок: ' + round + '. Опьянение: ' + Math.round(G.s.st.drunk) + '%. Деньги: ' + G.rub(s.money), opts: [
          { t: '🍺 Ещё одну! (−150 ₽)', fn: () => { G.addMoney(-150); playRound(); } },
          { t: 'Хватит на сегодня', fn: finish }] });
        else finish();
      });
    }
    function finish() {
      const ev = G.pick([
        () => { G.relAdd(id, 4); msg(first(id) + ' поставил(а) всем по кружке и громко заявил, что ты — человек.', 'good'); G.fx({ mood: 5 }); },
        () => { G.fx({ mood: 8, cool: 1 }); msg('Вы спели в караоке «Владимирский централ». Зал рыдал.', 'good'); },
        () => { G.relAdd(id, 4); G.fx({ cons: 1 }); msg(first(id) + ' разоткровенничался(ась): рассказал(а) то, о чём не говорил(а) никому.', 'good'); },
        () => { if (G.s.st.drunk >= 40) { G.fx({ health: -4, mood: -6 }); msg('Утром в баре обнаружился счёт на лишние 800 ₽. Откуда — не помнишь.', 'bad'); G.addMoney(-Math.min(800, s.money)); } else msg('Вечер прошёл спокойно.', 'good'); }
      ]); ev();
      r.last = G.week(); sp(2);
    }
    playRound();
  };

  // ---------- Меню друга (расширенное)
  G.friendMenu = function (id) {
    const s = G.s, n = D.NPC[id], r = G.R(id), formal = s.car.rank >= 6, face = id, work = s.phase === 'work' || s.phase === 'lunch';
    const intro = formal
      ? n.name + ' слегка кашлянул(а): «Здравствуй… ой, здравствуйте. Привычка. Ты теперь начальство, но для меня — всё тот же свой человек».'
      : n.name + ' кивает: «Ну, чем займёмся?»';
    const o = [];
    o.push({ t: '😎 Приколы с ' + first(id), fn: () => G.friendPranks(id) });
    o.push({ t: '🚶 Пойти куда-нибудь после работы', fn: () => G.outingMenu(id) });
    o.push({ t: '💬 Поговорить по душам', fn: () => G.talkMenu(id) });
    o.push({ t: '🤝 Помочь по работе (1 ч)', dis: work ? null : 'Только на смене', fn: () => { G.fx({ coll: 3, energy: -5, cons: 1 }); G.relAdd(id, 3); r.help = (r.help || 0) + 1; msg('Подсобил(а) — друг оценил.', 'good'); sp(1); } });
    o.push({ t: '🙏 Попросить о помощи', fn: () => G.friendAsk(id) });
    o.push({ t: 'Закрыть', fn: () => {} });
    G.modal({ title: '🤝 ' + n.name, face, text: intro + '<br>' + G.relBig(id) + '<small>Чем полезен: ' + G.friendPerkText(id) + '<br>Свои люди: ' + G.friends().length + ' из ' + MAXF + '</small>', opts: o });
  };
  // чуть большая польза друзей на работе (качество): +2 за каждого, но не более 8
  const _q = G.quality;
  G.quality = function () {
    let q = _q.apply(this, arguments);
    try { if (G.s.day.advice) q += 4; if (F().vityokFix === G.s.t.day) q += 3; q = C(Math.round(q), 0, 100); } catch (e) {}
    return q;
  };

  // ---------- стили
  const st = document.createElement('style');
  st.textContent = '.rface{flex:none}.rbar{width:56px;height:5px;background:#0c0b0a;border:1px solid #000;border-radius:3px;margin:0 auto 3px;overflow:hidden}.rbar i{display:block;height:100%;transition:width .3s}'
    + '.rbar.big{width:100%;height:14px;position:relative;border-radius:7px}.rbar.big u{position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(255,255,255,.35)}.rbig{margin:6px 0 10px}.rbig-h{display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px}.rbig-s{font-size:11px;color:#aaa;margin-top:3px}'
    + '.beer-row{display:flex;align-items:center;gap:8px;margin:8px 0}.beer-row span{width:58px;font-size:12px}.beerbar{flex:1;height:26px;background:#1b1209;border:2px solid #000;border-radius:6px;overflow:hidden}.beerbar i{display:block;height:100%;width:0;background:linear-gradient(#f7d25b,#e0a21a 60%,#b8780c);box-shadow:inset 0 3px 0 #fff8dc}.beer-tap{width:100%;height:64px;font-size:20px;margin-top:8px}';
  document.head.appendChild(st);
})();

/* ===== v3.5 (часть B): долги, просьбы взаймы, Тамара Ивановна и уборка ===== */
(function () {
  const G = window.G, D = G.D, C = G.clamp, MG = G.MG;
  const F = () => G.s.flags;
  const msg = (t, c) => G.toast(t, c);
  const sp = n => G.spend(n || 1);
  const first = id => (D.NPC[id] ? D.NPC[id].name.split(' ')[0] : id);
  const mon = n => G.rub(Math.round(n));

  // ---------- Кто вообще может одолжить игроку
  const LENDERS = ['kolyan', 'mikhalych', 'palych', 'stepanych', 'semyonych', 'rafik', 'lyosha', 'gosha', 'zahar', 'seryoga', 'egorych', 'lidiya', 'nadezhda', 'tatishcheva', 'ekaterina', 'vityok'];
  G.lendReason = function (id, amt) {
    const r = G.R(id), s = G.s;
    if (r.noLend) return 'Раз не вернул — больше не даёт';
    if (LENDERS.indexOf(id) < 0) return 'У него самого денег нет';
    if (r.l < (amt >= 3000 ? 45 : 20)) return 'Не настолько знакомы (отн. ≥ ' + (amt >= 3000 ? 45 : 20) + ')';
    if (s.flags['debt_' + id] > 0) return 'Сначала верни прошлый долг';
    return null;
  };
  G.lendMenu = function (id) {
    const n = D.NPC[id], s = G.s, r = G.R(id);
    const lend = amt => ({ t: 'Одолжить ' + mon(amt), dis: s.money < amt ? 'Нет денег' : null, fn: () => { G.addMoney(-amt); r.owed = (r.owed || 0) + amt; r.help = (r.help || 0) + 1; G.relAdd(id, amt >= 2000 ? 8 : 4); msg('Одолжил ' + mon(amt) + ' (' + n.name + ')'); } });
    const borrow = amt => ({ t: 'Занять у него ' + mon(amt), dis: G.lendReason(id, amt), fn: () => { G.addMoney(amt); s.flags['debt_' + id] = (s.flags['debt_' + id] || 0) + amt; G.relAdd(id, -2); msg('Занял ' + mon(amt) + '. Теперь отдавай — один раз не вернёшь, больше не дадут.', 'warn'); } });
    G.modal({ title: n.name + ': деньги', face: id, text: 'Надёжность: ~' + (n.reliab || 50) + '%' + (r.noLend ? '<br><b style="color:#d66">Он больше не одалживает тебе: ты не вернул долг вовремя.</b>' : ''), opts: [lend(500), lend(2000), borrow(1000), borrow(3000), { t: 'Передумал', fn: () => {} }] });
  };
  // не вернул — больше не дадут
  const _fdebt = G.friendDebt;
  G.friendDebt = function (id, key) {
    const r = _fdebt.apply(this, arguments);
    try { if ((F()[key + '_lvl'] || 0) >= 2) G.R(id).noLend = 1; } catch (e) {}
    return r;
  };

  // ---------- Занимают у игрока: друзья — часто и «невыгодно», остальные — редко
  const LEECH = ['afonya', 'vityok', 'khomyak', 'kolyan', 'zahar', 'mikhalych'];
  G.askLoan = function (id, friend) {
    const s = G.s, n = D.NPC[id], r = G.R(id);
    const base = Math.max(500, Math.round(Math.min(s.money, G.monthlyPay() * 0.25) / 100) * 100), amt = friend ? Math.max(500, Math.round(base / 500) * 500) : Math.max(300, Math.round(base / 2 / 100) * 100);
    const LINES = ['«Слушай, выручи тысячу до получки. Отдам, честное слово!»', '«У меня тут форс-мажор… одолжишь?»', '«Только между нами: занять надо срочно. Ты же свой».', '«Жена убьёт, если не принесу. Одолжи, а?»'];
    r.askDay = s.t.day;
    G.modal({ title: n.name + ' просит денег', face: id, text: n.name + ' мнётся: ' + G.pick(LINES) + '<br>Сумма: <b>' + mon(amt) + '</b>', opts: [
      { t: '💸 Одолжить ' + mon(amt), dis: s.money < amt ? 'Нет денег' : null, fn: () => { G.addMoney(-amt); r.owed = (r.owed || 0) + amt; r.refuse = 0; G.relAdd(id, 3); msg('Одолжил ' + mon(amt) + '. Вернёт ли?', 'warn'); } },
      { t: '🚫 Отказать', fn: () => {
        r.refuse = (r.refuse || 0) + 1;
        if (friend && r.refuse >= 2) { G.relAdd(id, -35); G.endFriend(id, 'ты дважды отказал(а) в деньгах — человек обиделся.'); }
        else { G.relAdd(id, friend ? -8 : -3); msg(first(id) + ' поджал(а) губы: «Ну… понятно».' + (friend ? ' Второй отказ — и дружбе конец.' : ''), 'warn'); }
      } }
    ] });
  };
  const _d2 = G.dailyTick;
  G.dailyTick = function () {
    const r0 = _d2.apply(this, arguments);
    try {
      const s = G.s;
      // друзья просят часто (особенно «вечные должники»)
      G.friends().forEach(id => { const r = G.R(id); if ((r.owed || 0) > 0 || (r.askDay !== undefined && s.t.day - r.askDay < 5)) return; if (G.chance(LEECH.indexOf(id) >= 0 ? 16 : 3)) G.askLoan(id, true); });
      // остальные — редко
      if (G.chance(4)) {
        const pool = Object.keys(s.rel).filter(id => D.NPC[id] && s.rel[id].met && !G.isFriend(id) && s.rel[id].l >= 10 && !(s.rel[id].owed > 0) && ['truhanov', 'soplezhuykin', 'rassvetov', 'shchiplen', 'kulezhov', 'tatishcheva'].indexOf(id) < 0 && !D.NPC[id].romance);
        if (pool.length) G.askLoan(G.pick(pool), false);
      }
    } catch (e) { if (window.console) console.error(e); }
    return r0;
  };

  // ---------- Тамара Ивановна: энерговампир
  const _npcLoc = G.npcLoc;
  G.npcLoc = function (id) {
    const s = G.s;
    if (id === 'tamara') {
      if (s.day.tamMop && s.phase === 'work') return s.loc;
      if (s.phase === 'checkpoint') return G.hash(s.t.day, 11, 3) < 0.6 ? 'checkpoint' : null;
    }
    return _npcLoc.apply(this, arguments);
  };
  const VAMP = [
    '«Опять пришёл с таким лицом? Молодёжь пошла — одни кислые рожи. Вот в моё время…» — и дальше двадцать минут про «моё время».',
    '«Я тебе так скажу, милок: всё хуже, чем ты думаешь. И будет ещё хуже. Зато пол чистый».',
    '«У меня спина. У меня давление. У меня муж был — тоже был. А ты чего такой довольный?»',
    '«Ох, не к добру ты сегодня улыбаешься. Помяни моё слово: Щиплен сегодня в ударе».',
    '«Зарплату опять урежут. Мне сон приснился. Мои сны всегда сбываются, особенно плохие».',
    '«Вот ты молодой, а уже сутулишься. К сорока будешь как я. Хотя нет, как я не будешь — я особенная».'
  ];
  G.tamaraTalk = function () {
    const s = G.s, f = F(), r = G.R('tamara'); r.met = true; r.talks = (r.talks || 0) + 1; r.last = G.week();
    G.fx({ mood: -6 });
    const line = G.pick(VAMP);
    const gossipNames = [['seryoga', 'Серёга'], ['palych', 'Палыч'], ['shchiplen', 'Щиплен'], ['mikhalych', 'Михалыч'], ['lyudka', 'Людка']];
    const g = G.pick(gossipNames);
    const bait = G.chance(45) && s.car.shifts >= 3;
    if (!bait) {
      G.modal({ title: 'Тамара Ивановна', face: 'tamara', text: line + '<br><small>Каждый разговор с ней высасывает настроение (−6).</small>', opts: [
        { t: '📰 Расспросить о заводе', fn: () => G.gossipMenu() }, { t: 'Сбежать «по делам»', fn: () => { G.relAdd('tamara', -1); } }] });
      return;
    }
    G.modal({ title: 'Тамара Ивановна', face: 'tamara', text: line + '<br><br>И вдруг, прищурившись: <i>«А ты, милок, как там с ' + g[1] + '? Правду говорят, что…? Расскажи, мне для… общей картины».</i>', opts: [
      { t: '🗣 Выложить всё', fn: () => { f.gossipRep = (f.gossipRep || 0) + 1; G.relAdd('tamara', 4); G.fx({ coll: -3, mood: -2 }); msg('Тамара радостно кивает. К вечеру весь цех знает то, что ты рассказал(а). Тебя считают сплетником.', 'bad'); if (G.rumor) G.rumor('gossip_' + g[0], 'Говорят, ты сплетничаешь с Тамарой.', { coll: -2 }, 70); if (f.gossipRep >= 4 && G.addNick) G.addNick('spletnik'); G.gossipMenu(); } },
      { t: '🤐 Сказать что-то нейтральное', fn: () => { G.relAdd('tamara', -1); msg('Тамара разочарованно вздохнула: «Скучный ты».', 'warn'); G.gossipMenu(); } },
      { t: '🙅 «Ничего не знаю»', fn: () => { G.relAdd('tamara', -3); G.fx({ cons: 1 }); msg('Тамара обиженно: «Ну и храни свои тайны».', 'warn'); } }] });
  };
  // её меню открывается и без прежней «кнопки в цехе»
  const _nm = G.npcSpecial;
  G.npcSpecial = function (id) {
    const o = _nm.apply(this, arguments);
    if (id === 'tamara' && !o.some(x => /сплетн|завод/i.test(x.t))) o.unshift({ t: '📰 Расспросить о заводе', fn: () => { G.fx({ mood: -3 }); G.gossipMenu(); } });
    return o;
  };

  // Мини-игра: поднять ноги от швабры
  MG.mop = function (el, spec, done) {
    const W = 300, FEET = 150, PASSES = 6; let pass = 0, ok = 0, alive = true, lifted = false, liftEnd = 0, cd = 0, t0 = 0, dir = 1, dur = 1700, hitDone = false;
    el.innerHTML = '<div class="mg"><div class="mg-title">' + (spec.title || '') + '</div><div class="mg-hint">' + (spec.hint || '') + '</div><div class="mg-round" id="rd">Проход 1 / ' + PASSES + '</div>'
      + '<div id="fl" class="mop-floor"><span id="ft" class="mop-feet">🦶</span><span id="mp" class="mop-mop">🧹</span></div><button class="btn beer-tap" id="up">⬆ ПОДНЯТЬ НОГИ!</button></div>';
    const ft = el.querySelector('#ft'), mp = el.querySelector('#mp'), rd = el.querySelector('#rd'), fl = el.querySelector('#fl');
    const lift = () => { const n = performance.now(); if (!alive || n < cd) return; lifted = true; liftEnd = n + 420; cd = n + 700; };
    el.querySelector('#up').addEventListener('pointerdown', e => { e.preventDefault(); lift(); });
    fl.addEventListener('pointerdown', e => { e.preventDefault(); lift(); });
    function start() { pass++; if (pass > PASSES) { alive = false; return done(ok / PASSES); } rd.textContent = 'Проход ' + pass + ' / ' + PASSES; dir = pass % 2 ? 1 : -1; dur = 1750 - pass * 160; t0 = performance.now() + 450; hitDone = false; }
    function frame(now) {
      if (!alive) return;
      if (lifted && now > liftEnd) lifted = false;
      ft.style.transform = 'translateY(' + (lifted ? -26 : 0) + 'px)'; ft.style.opacity = lifted ? 0.6 : 1;
      const p = (now - t0) / dur;
      if (p < 0) { mp.style.left = (dir > 0 ? -40 : W) + 'px'; }
      else {
        const x = dir > 0 ? -40 + p * (W + 80) : W - p * (W + 80); mp.style.left = x + 'px';
        if (!hitDone && Math.abs(x + 16 - FEET) < 24) { hitDone = true; if (lifted) { ok++; ft.textContent = '😅'; } else { ft.textContent = '😖'; el.querySelector('.mop-floor').classList.add('shake'); setTimeout(() => el.querySelector('.mop-floor') && el.querySelector('.mop-floor').classList.remove('shake'), 300); } setTimeout(() => { if (ft) ft.textContent = '🦶'; }, 450); }
        if (p >= 1) start();
      }
      requestAnimationFrame(frame);
    }
    start(); requestAnimationFrame(frame);
    return () => { alive = false; };
  };
  const JIBES = [
    '«Ты чего, как корова на льду? Ноги надо вовремя поднимать!»', '«Следы везде оставил, горе моё. Я тут не для украшения!»',
    '«Вот раньше стажёры были стажёры, а сейчас — одно недоразумение».', '«Мамка тебя не научила пол уважать?»', '«Иди, иди отсюда, пока я швабру не применила не по назначению».'
  ];
  G.tamaraMop = function () {
    const s = G.s, f = F(); if (s.phase !== 'work' || s.end) return;
    f.tamMopWk = G.week(); s.day.tamMop = 1;
    G.modal({ title: '🧹 ТАМАРА ИВАНОВНА МОЕТ ПОЛЫ', face: 'tamara', vib: 'warning', cls: 'bad', text: 'После обеда в цех вплывает Тамара Ивановна с ведром и шваброй. Лицо — грозовая туча. <i>«Ноги подними! Я два раза повторять не буду!»</i>', opts: [{ t: '🦶 Приготовиться поднимать ноги', fn: () => {
      G.mini('mop', { title: '🧹 Уворачивайся от швабры', hint: 'Тапай «ПОДНЯТЬ НОГИ», когда швабра рядом с ногами.' }, res => {
        const sc = (res && res.score) || 0;
        if (sc >= 0.8) { G.fx({ mood: -6 }); G.relAdd('tamara', 2); msg('Ноги целы, пол чист. Тамара буркнула: «Хоть не мешаешься».', 'good'); }
        else if (sc >= 0.45) { G.fx({ mood: -10, neat: -4 }); G.relAdd('tamara', -3); msg('Тамара: ' + G.pick(JIBES), 'warn'); }
        else { G.fx({ mood: -15, neat: -8 }); G.relAdd('tamara', -7); msg('Тамара орёт на весь цех: ' + G.pick(JIBES) + ' Ботинки мокрые, настроение ниже плинтуса.', 'bad'); if (G.rumor) G.rumor('mop', 'Тамара Ивановна всем рассказывает, какой ты неряха.', { coll: -1 }, 60); }
        G.modal({ title: 'Тамара Ивановна', face: 'tamara', text: 'Она сурово опирается на швабру и сверлит тебя взглядом.', opts: [
          { t: '💬 Поговорить с Тамарой', fn: () => G.tamaraTalk() }, { t: 'Промолчать и отвернуться', fn: () => { s.day.tamMop = 0; } }] });
      });
    } }] });
  };
  const _adv = G.advance;
  G.advance = function (h) {
    const r = _adv.apply(this, arguments);
    try {
      const s = G.s;
      if (s && s.day && s.phase === 'work' && s.t.hour >= 13 && s.t.hour <= 16 && F().tamMopWk !== G.week() && s.car.shifts >= 1 && G.chance(35)) { F().tamMopWk = G.week(); setTimeout(() => { if (G.s && !G.s.end) G.tamaraMop(); }, 200); }
    } catch (e) {}
    return r;
  };
  // в начале смены Тамара часто торчит на проходной
  const K = G.career;
  if (K && K.toWorkplace) {
    const _tw = K.toWorkplace;
    K.toWorkplace = function () {
      const r = _tw.apply(this, arguments);
      try { const s = G.s; if (s.phase === 'work' && !s.day.tamGate && G.hash(s.t.day, 11, 3) < 0.45) { s.day.tamGate = 1; G.modal({ title: 'Тамара Ивановна', face: 'tamara', text: 'У входа в цех шуршит шваброй Тамара Ивановна. Увидев тебя, она протяжно вздыхает.', opts: [{ t: '💬 Поговорить', fn: () => G.tamaraTalk() }, { t: 'Пройти мимо', fn: () => { G.fx({ mood: -1 }); } }] }); } } catch (e) {}
      return r;
    };
  }

  const st = document.createElement('style');
  st.textContent = '.mop-floor{position:relative;height:110px;background:linear-gradient(#2a2118,#1a140d);border:2px solid #000;border-radius:8px;overflow:hidden;margin:8px 0;width:300px;max-width:100%}.mop-feet{position:absolute;left:134px;top:46px;font-size:34px;transition:transform .08s}.mop-mop{position:absolute;top:36px;left:-40px;font-size:48px}.mop-floor.shake{animation:mpsh .3s}@keyframes mpsh{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}';
  document.head.appendChild(st);
})();

/* ===== v3.5 (часть C): любовная линия — шкала любви, балансир, уход, просьбы, ревность ===== */
(function () {
  const G = window.G, D = G.D, C = G.clamp, MG = G.MG;
  const F = () => G.s.flags;
  const msg = (t, c) => G.toast(t, c);
  const sp = n => G.spend(n || 1);
  const first = id => (D.NPC[id] ? D.NPC[id].name.split(' ')[0] : id);
  const mon = n => G.rub(Math.round(n));
  const hasCar = () => Object.keys(G.s.own || {}).some(k => D.STATUS[k] && D.STATUS[k].tier === 'car');
  D.NICKS.stakhanov = { n: 'Любовник-стахановец', fx: { coll: -1, boss: -1 }, bad: 1 };

  // ---------- Состояние отношений
  const _gf0 = G.girlfriend;
  G.girlfriend = function () {
    const s = G.s, f = F();
    if (f.love && f.love.id && s.rel[f.love.id] && s.rel[f.love.id].stage >= 5) return f.love.id;
    return _gf0.apply(this, arguments);
  };
  G.love = function () {
    const id = G.girlfriend(); if (!id) return null;
    const f = F(), d = G.s.t.day;
    if (!f.love || f.love.id !== id) f.love = { id, v: 55, since: d, contact: d, intim: d, req: null, tipsy: 0, bad: 0, nag: 0, flirt: 0 };
    return f.love;
  };
  const loveAdd = (n, why) => { const L = G.love(); if (!L) return; L.v = C(L.v + n, 0, 100); G.R(L.id).l = C(G.R(L.id).l + n * 0.25, -100, 100); if (L.v <= 10) loveBreak(why || 'охладела'); };
  const touch = () => { const L = G.love(); if (L) L.contact = G.s.t.day; };
  G.loveTier = function () { const L = G.love(); if (!L) return 0; return L.v >= 70 ? 4 : L.v >= 40 ? 3 : L.v >= 20 ? 2 : 1; };
  const word = v => v >= 85 ? 'Души не чает' : v >= 70 ? 'Влюблена' : v >= 55 ? 'Нежна' : v >= 40 ? 'Ровно' : v >= 25 ? 'Пилит' : 'На грани разрыва';
  G.loveBig = function () {
    const L = G.love(); if (!L) return '';
    return '<div class="rbig"><div class="rbig-h"><span>💗 Любовь</span><b style="color:#ff6fa5">' + word(L.v) + '</b></div><div class="rbar big love"><i style="width:' + Math.max(2, L.v) + '%"></i></div><div class="rbig-s">' + Math.round(L.v) + ' из 100</div></div>';
  };
  function loveBreak(why) {
    const s = G.s, f = F(), L = f.love; if (!L) return;
    const id = L.id, n = D.NPC[id], r = G.R(id);
    r.stage = 2; r.l = Math.min(r.l - 30, -10); f.love = null; (f.loveCool = f.loveCool || {})[id] = G.week() + 4;
    G.fx({ mood: -18, energy: -6 }); f.heartbreak = s.t.day + 3;
    if (G.rumor) G.rumor('breakup_' + id, n.name + ' бросила тебя: «' + why + '».', { coll: -1 }, 60);
    G.modal({ title: '💔 ОНА УШЛА', face: id, vib: 'error', cls: 'bad', text: n.name + ' собирает вещи: «Всё, я устала. Причина — ' + why + '. Не звони мне».<br><small>Несколько дней настроение будет ниже обычного. Вернуть её сразу не получится.</small>', opts: [{ t: 'Остаться одному…', fn: () => {} }] });
  }
  G.loveBreak = loveBreak;

  // новые отношения запускают шкалу
  const _rom = G.romanceMove;
  G.romanceMove = function (id) {
    const s = G.s, f = F(), r = G.R(id), gf = G.girlfriend();
    if (f.loveCool && f.loveCool[id] > G.week()) { G.info(D.NPC[id].name, 'Она ещё не остыла после расставания. Подожди несколько недель.'); return; }
    if (gf && id === gf && r.stage >= 5) return G.girlMenu(id);
    if (gf && id !== gf) {
      if (r.stage >= 3) { G.modal({ title: D.NPC[id].name, face: id, text: 'У тебя уже есть девушка — ' + first(gf) + '. Серьёзные отношения возможны только с одной. Продолжишь — она рано или поздно узнает.', opts: [{ t: 'Всё-таки флиртовать (рискованно)', fn: () => { flirtOther(id); _rom.call(G, id); } }, { t: 'Одумался', fn: () => {} }] }); return; }
      flirtOther(id);
    }
    const st0 = r.stage;
    const out = _rom.apply(this, arguments);
    return out;
  };
  function flirtOther(id) { const L = G.love(); if (L) { L.flirt = (L.flirt || 0) + 1; } }
  const _ch = G.cheatCheck;
  G.cheatCheck = function (id) {
    const L = G.love(); const before = L ? !!F()['cheat_' + L.id] : false;
    const r = _ch.apply(this, arguments);
    try { const L2 = G.love(); if (L2 && !before && F()['cheat_' + L2.id]) { delete F()['cheat_' + L2.id]; loveAdd(-45, 'узнала про измену'); } } catch (e) {}
    return r;
  };

  // ---------- Меню девушки
  const NAG = {
    4: ['«Ты у меня самый лучший! Давай сегодня куда-нибудь сходим?»', '«Скучала. Расскажи, как день прошёл?»', '«Я тебе борщ приготовила. Ну… почти».'],
    3: ['«Ты сегодня какой-то усталый. Отдохнуть не хочешь?»', '«Всё нормально. Но могло быть и лучше».'],
    2: ['«Вот у Люды муж хотя бы цветы дарит…»', '«Ты опять допоздна на заводе? А обо мне подумал?»', '«Когда у тебя будет машина? Все подружки уже на машинах!»', '«Телефон мой совсем старый. Подружки уже с новыми. Ну да ладно…»'],
    1: ['«Не звони мне сегодня.»', '«Я с тобой разговаривать не буду, пока не извинишься.»']
  };
  G.girlMenu = function (id) {
    const s = G.s, n = D.NPC[id], L = G.love(); if (!L) return G.npcMenu(id);
    const free = G.isFree(), work = s.phase === 'work', t = G.loveTier();
    let line = G.pick(NAG[t]);
    if (t <= 2 && !hasCar() && G.chance(40)) line = '«Ну когда у тебя уже будет машина?! Все давно ездят!»';
    const o = [];
    o.push({ t: '💬 Мило пообщаться', dis: L.chat === s.t.day ? 'Сегодня уже болтали' : null, fn: () => { L.chat = s.t.day; touch(); loveAdd(4); G.fx({ mood: 3 }); msg(first(id) + ': ' + G.pick(['«Ты у меня такой хороший».', '«Обними меня крепче».', '«Расскажи про свои станки. Я всё равно ничего не понимаю, но мне нравится твой голос».']), 'good'); sp(1); } });
    o.push({ t: '💐 Подарить цветы (400 ₽)', dis: s.money < 400 && !G.has('flowers') ? 'Нет денег' : null, fn: () => { if (G.has('flowers')) G.give('flowers', -1); else G.addMoney(-400); touch(); loveAdd(8); G.fx({ mood: 4 }); msg(first(id) + ' зарделась: «Ты помнишь, что я люблю тюльпаны?»', 'good'); sp(1); } });
    o.push({ t: '🎁 Подарок', fn: () => G.giftMenu(id) });
    o.push({ t: '🍽 Сходить куда-нибудь вместе', dis: free ? null : 'Только вечером или в выходной', fn: () => G.dateMenu(id) });
    o.push({ t: '🍷 Угостить вином (800 ₽)', dis: s.money < 800 ? 'Нет денег' : (!free ? 'Только вечером' : null), fn: () => { G.addMoney(-800); touch(); L.tipsy = s.t.day; L.wine = (L.wine || 0) + 1; if (L.wine > 3 && G.chance(50)) { loveAdd(-6); msg(first(id) + ': «Ты хочешь меня споить?»', 'warn'); } else { loveAdd(5); G.fx({ mood: 4, drunk: 6 }); msg(first(id) + ' расслабилась и заметно повеселела. Сегодня она более расположена к… всему.', 'good'); } sp(1); } });
    o.push({ t: '👂 Выслушать её проблемы', dis: L.listen === s.t.day ? 'Сегодня уже слушал(а)' : null, fn: () => { L.listen = s.t.day; touch(); loveAdd(4); G.fx({ mood: -2, energy: -3 }); msg('Ты час слушал(а) про подружек и про мать. Она оценила: «Ты — единственный, кто меня слушает».', 'good'); sp(1); } });
    if (L.req) o.push({ t: '🎀 Её просьба: ' + L.req.t + ' (' + mon(L.req.cost) + ')', dis: s.money < L.req.cost ? 'Нет денег' : null, fn: () => doReq() });
    o.push({ t: '🌙 Побыть вместе перед сном', dis: !free ? 'Только вечером или в выходной' : L.intimDay === s.t.day ? 'Сегодня уже было' : null, fn: () => G.loveGame(false) });
    o.push({ t: '🔥 Уединиться на работе (рискованно)', dis: work ? (L.intimDay === s.t.day ? 'Сегодня уже было' : null) : 'Только на смене', fn: () => G.loveGame(true) });
    if (id === 'tatyana' && L.v >= 90) o.push({ t: '💍 Серьёзный разговор о будущем', fn: () => _rom.call(G, id) });
    o.push({ t: '📞 Позвонить', fn: () => G.callNpc(id) });
    o.push({ t: 'Закрыть', fn: () => {} });
    const sat = L.lastSat === undefined ? '' : '<br><small>Последняя близость: ' + (L.lastSat >= 0.75 ? 'на седьмом небе' : L.lastSat >= 0.5 ? 'приятно' : L.lastSat >= 0.3 ? 'так себе' : 'разочарована') + '</small>';
    G.modal({ title: '💗 ' + n.name, face: id, text: line + '<br>' + G.loveBig() + '<small>Чем помогает: ' + (GPERK[id] ? GPERK[id].d : 'просто поддерживает') + '</small>' + sat + (L.req ? '<br><small>Хочет: ' + L.req.t + ' (до недели ' + L.req.due + ')</small>' : ''), opts: o });
  };

  // ---------- Её просьбы и ворчание
  const REQ = [
    { k: 'salon', t: 'сходить в салон красоты', cost: 3000, up: 10 },
    { k: 'bag', t: 'новую сумочку («у Ленки такая же, только лучше»)', cost: 5000, up: 14 },
    { k: 'perfume', t: 'духи, которые «пахнут как мечта»', cost: 2500, up: 10 },
    { k: 'phone', t: 'новый смартфон («мой уже стыдно доставать»)', cost: 25000, up: 25, min: 2 },
    { k: 'dress', t: 'платье на корпоратив', cost: 4000, up: 12 }
  ];
  function doReq() {
    const s = G.s, L = G.love(); if (!L || !L.req) return; const q = L.req;
    if (s.money < q.cost) { G.info('Нет денег', 'Она просит ' + q.t + ', а на это нужно ' + mon(q.cost) + '.'); return; }
    G.addMoney(-q.cost); L.req = null; L.nag = 0; touch(); loveAdd(q.up); G.fx({ mood: 6 }); msg(first(L.id) + ' визжит от счастья и целует тебя. Любовь +' + q.up + '.', 'good');
  }
  function newReq() {
    const s = G.s, L = G.love(); if (!L || L.req || G.week() % 2) return;
    const pool = REQ.filter(r => !r.min || s.car.rank >= r.min); const q = G.pick(pool);
    L.req = Object.assign({}, q, { due: G.week() + 2 });
    G.modal({ title: '💗 ' + D.NPC[L.id].name + ' намекает', face: L.id, text: '«Милый, знаешь, о чём я мечтаю? Хочу ' + q.t + '. Всего ' + mon(q.cost) + '. Но если ты не можешь… я пойму. Наверное».', opts: [
      { t: 'Купить сейчас (' + mon(q.cost) + ')', dis: s.money < q.cost ? 'Нет денег' : null, fn: () => doReq() },
      { t: 'Скоро куплю (до двух недель)', fn: () => { G.fx({ mood: -1 }); } },
      { t: 'Не буду', fn: () => { L.req = null; loveAdd(-8); msg(first(L.id) + ' надулась: «Ну и ладно».', 'warn'); } }] });
  }

  // ---------- Мини-игра: розовый балансир
  MG.love = function (el, spec, done) {
    const T = spec.t || 14000, ZONE = spec.zone || 0.22; let x = 0, v = 0, inz = 0, tot = 0, alive = true, last = performance.now(), t0 = last, seed = Math.random() * 10;
    el.innerHTML = '<div class="mg"><div class="mg-title">' + (spec.title || '') + '</div><div class="mg-hint">' + (spec.hint || '') + '</div><div class="mg-round" id="lr">Держись по центру</div>'
      + '<div class="lv-track"><div class="lv-zone" style="width:' + ZONE * 100 + '%"></div><div class="lv-mark" id="lm">💗</div></div>'
      + '<div class="lv-bar"><i id="lb"></i></div>'
      + '<div class="lv-btns"><button class="btn" id="lL">◀ влево</button><button class="btn" id="lR">вправо ▶</button></div></div>';
    const lm = el.querySelector('#lm'), lb = el.querySelector('#lb'), lr = el.querySelector('#lr');
    const push = d => { if (alive) v += d * 0.9; };
    el.querySelector('#lL').addEventListener('pointerdown', e => { e.preventDefault(); push(-1); });
    el.querySelector('#lR').addEventListener('pointerdown', e => { e.preventDefault(); push(1); });
    function loop(now) {
      if (!alive) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; const el_t = now - t0;
      const gain = 1.1 + el_t / T * 1.6;
      v += (Math.sin(el_t / 230 + seed) * 0.55 + Math.sin(el_t / 97 + seed * 2) * 0.35 + (Math.random() - 0.5) * 0.5) * gain * dt * 2.2;
      v *= 0.985; x += v * dt * 1.5;
      if (x > 1) { x = 1; v = -Math.abs(v) * 0.3; } if (x < -1) { x = -1; v = Math.abs(v) * 0.3; }
      tot += dt; if (Math.abs(x) <= ZONE) inz += dt;
      lm.style.left = (50 + x * 46) + '%'; lb.style.width = Math.min(100, (el_t / T) * 100) + '%';
      lm.style.filter = Math.abs(x) <= ZONE ? 'drop-shadow(0 0 6px #ff6fa5)' : 'none'; lr.textContent = Math.abs(x) <= ZONE ? 'Отлично, держи!' : 'Сбалансируй!';
      if (el_t >= T) { alive = false; return done(tot ? inz / tot : 0); }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    return () => { alive = false; };
  };
  G.loveGame = function (atWork) {
    const s = G.s, L = G.love(); if (!L) return; const id = L.id, r = G.R(id), n = D.NPC[id];
    const tipsy = L.tipsy === s.t.day, drunkPen = s.st.drunk >= 40;
    const zone = (atWork ? 0.18 : 0.22) * (tipsy ? 1.3 : 1) * (drunkPen ? 0.8 : 1);
    G.mini('love', { title: atWork ? '🔥 Быстро и тихо' : '🌙 Вечер вдвоём', hint: 'Удерживай розовый маркер по центру как можно дольше. Чем дольше — тем она счастливее.' + (tipsy ? ' (Она навеселе — зона шире.)' : '') + (atWork ? ' (Времени мало, зона уже.)' : ''), t: atWork ? 9000 : 14000, zone }, res => {
      const sc = (res && res.score) || 0; L.lastSat = sc; L.intimDay = s.t.day; L.intim = s.t.day; touch();
      if (r.stage === 5) r.stage = 6;
      let d, txt, c;
      if (sc >= 0.75) { d = 10; txt = n.name + ': «Это было… невероятно».'; c = 'good'; G.fx({ mood: 12, health: 3 }); L.bad = 0; }
      else if (sc >= 0.5) { d = 5; txt = n.name + ' довольно улыбается: «Мне понравилось».'; c = 'good'; G.fx({ mood: 8 }); L.bad = 0; }
      else if (sc >= 0.3) { d = 0; txt = n.name + ' вздыхает: «Ну… нормально. В следующий раз постарайся».'; c = 'warn'; G.fx({ mood: 2 }); }
      else { d = -8; txt = n.name + ' отворачивается: «Это всё? Знаешь… я ждала большего».'; c = 'bad'; G.fx({ mood: -5 }); L.bad++; if (L.bad >= 3) { d -= 10; } }
      G.fx({ energy: atWork ? -6 : -8 });
      msg('Удовлетворённость: ' + Math.round(sc * 100) + '%. ' + txt, c); loveAdd(d, 'ты слишком безразличен(а) в постели');
      if (atWork) { s.day.breaks = (s.day.breaks || 0) + 1; if (G.chance(35)) { G.addNick('stakhanov'); msg('Вас застукали! Весь цех знает.', 'bad'); loveAdd(-5); G.punish({ risk: 100, what: 'Любовь на рабочем месте', fine: [300, 800], sev: 1 }); } }
      sp(atWork ? 1 : 2);
    });
  };

  // ---------- Ежедневное: забота и влияние на героя
  const GPERK = {
    tatyana: { d: 'подкармливает тебя (+сытость каждый день)', day: () => G.fx({ satiety: 12 }) },
    lyudka: { d: 'кормит борщом без очереди (+сытость)', day: () => G.fx({ satiety: 12 }) },
    pelageya: { d: 'замолвит словечко перед проверками по охране труда', day: () => { G.s.day.otShield = 1; } },
    lidiya: { d: 'катает на крюке — бодрит (+энергия)', day: () => G.fx({ energy: 4 }) },
    nadezhda: { d: 'предупредит о проверках и прикроет', day: () => { if (G.chance(30)) G.fx({ boss: 1 }); } },
    ekaterina: { d: 'смотрит сквозь пальцы на мелкий брак (+качество)', day: () => {} },
    tatishcheva: { d: 'продвигает твои документы (+опыт)', day: () => { if (G.xp) G.xp(5); } },
    tamara: { d: 'варит борщ «для внучека»', day: () => G.fx({ satiety: 10 }) }
  };
  function loveDaily() {
    const s = G.s, f = F(), L = G.love(); if (!L) return;
    const d = s.t.day, gap = d - (L.contact || d), ig = d - (L.intim || d);
    if (gap >= 3) loveAdd(-(3 + Math.min(4, gap - 3)), 'тебе на неё плевать');
    if (!f.love) return;
    if (ig >= 5) { loveAdd(-3, 'ты забываешь про неё'); if (!f.love) return; }
    if (L.req && L.req.due < G.week()) { L.req = null; L.nag++; loveAdd(-8, 'ты не выполняешь обещания'); if (!f.love) return; msg(first(L.id) + ' обижена: «Ты обещал(а)!»', 'warn'); }
    // она узнала про флирт на стороне
    if (L.flirt && G.chance(Math.min(55, L.flirt * 12))) { L.flirt = 0; loveAdd(-50, 'ты флиртуешь с другими'); if (!f.love) return; }
    // влияние на героя
    const t = G.loveTier();
    if (t === 4) G.fx({ mood: 6, energy: 3, health: 2 }); else if (t === 3) G.fx({ mood: 2 }); else if (t === 2) { G.fx({ mood: -3, energy: -1 }); msg(first(L.id) + ' пилит тебя с самого утра. Настроение портится.', 'warn'); } else G.fx({ mood: -8, energy: -3, health: -2 });
    if (GPERK[L.id] && L.v >= 40 && GPERK[L.id].day) GPERK[L.id].day();
    if (hasCar() && L.carJoy !== 1) { L.carJoy = 1; loveAdd(8); msg(first(L.id) + ' в восторге от твоей машины!', 'good'); }
  }
  const _d3 = G.dailyTick;
  G.dailyTick = function () { const r = _d3.apply(this, arguments); try { loveDaily(); } catch (e) { if (window.console) console.error(e); } return r; };
  const _w3 = G.weeklyTick;
  G.weeklyTick = function () { const r = _w3.apply(this, arguments); try { newReq(); } catch (e) { if (window.console) console.error(e); } return r; };
  const _q = G.quality;
  G.quality = function () {
    let q = _q.apply(this, arguments);
    try { const L = G.love(); if (L) { if (L.v >= 70) q += 3; if (L.id === 'ekaterina' && L.v >= 40) q += 5; } if ((F().heartbreak || 0) >= G.s.t.day) q -= 6; q = C(Math.round(q), 0, 100); } catch (e) {}
    return q;
  };

  // подарки и свидания тоже повышают любовь
  const _g = G.gift;
  G.gift = function (id, item) { const L = G.love(), l0 = G.R(id).l; const r = _g.apply(this, arguments); try { if (L && L.id === id && G.R(id).l > l0) { touch(); loveAdd(Math.min(12, (G.R(id).l - l0) * 1.2)); } } catch (e) {} return r; };
  const _de = G.dateEnd;
  G.dateEnd = function (id, h, cost, q) { const r = _de.apply(this, arguments); try { const L = G.love(); if (L && L.id === id) { touch(); loveAdd(3 + q * 3); } } catch (e) {} return r; };
  const _smsTo = G.smsTo;
  G.smsTo = function (id) { try { const L = G.love(); if (L && L.id === id && L.sms !== G.s.t.day) { L.sms = G.s.t.day; touch(); loveAdd(1.5); } } catch (e) {} return _smsTo.apply(this, arguments); };
  // разговор с девушкой — через её меню
  const _tm = G.talkMenu;
  G.talkMenu = function (id) { const L = G.love(); if (L && L.id === id) return G.girlMenu(id); return _tm.apply(this, arguments); };
  const _npcSp = G.npcSpecial;
  G.npcSpecial = function (id) { const o = _npcSp.apply(this, arguments); const L = G.love(); if (L && L.id === id) o.unshift({ t: '💗 Моя девушка', fn: () => G.girlMenu(id) }); return o; };

  // блок «Свои люди»: девушка с сердечком и шкалой любви
  G.relFace = function (id, cls) {
    const gf = G.girlfriend() === id;
    return '<div class="rface' + (gf ? ' gfface' : '') + '">' + (gf ? '<span class="heart">💗</span>' : '') + G.faceHTML(id, cls) + (gf && G.love() ? '<div class="rbar love"><i style="width:' + G.love().v + '%"></i></div>' : G.relBar(id)) + '</div>';
  };
  G.friendsBlock = function () {
    const ids = G.friends(), gf = G.girlfriend(), adm = F().adm;
    let h = '<div class="card friends"><h3>🤝 Свои люди <small style="opacity:.6">(' + (ids.length + (gf ? 1 : 0)) + ')</small></h3>';
    if (!ids.length && !gf) h += '<div class="note">Пока никого. Общайся, помогай и держи слово — настоящие друзья появляются не сразу и не со всеми (максимум 5 друзей). Шкала «Отношения» под аватарками растёт от общения.</div>';
    else {
      h += '<div class="ppl">' + ids.map(id => '<button class="pp fr" onclick="G.friendMenu(\'' + id + '\')">' + G.relFace(id) + first(id) + '</button>').join('')
        + (gf ? '<button class="pp fr gf" onclick="G.girlMenu(\'' + gf + '\')">' + G.relFace(gf) + first(gf) + '</button>' : '') + '</div>';
    }
    if (adm && !adm.revealed) h += '<button class="btn" onclick="G.admGuess()">💗? Выяснить, кто в тебя влюбился</button>';
    return h + '</div>';
  };
  // здоровье/настроение героя и пара последних штрихов — стили
  const st = document.createElement('style');
  st.textContent = '.gfface{position:relative}.gfface .heart{position:absolute;right:-2px;top:-4px;font-size:16px;z-index:2;filter:drop-shadow(0 0 3px #000)}.rbar.love i{background:linear-gradient(90deg,#ff9ac2,#ff4d8d)}.rbar.big.love i{background:linear-gradient(90deg,#ff9ac2,#ff4d8d)}'
    + '.lv-track{position:relative;height:56px;background:linear-gradient(90deg,#3a1a2b,#5a2440 50%,#3a1a2b);border:2px solid #000;border-radius:28px;margin:12px 0;overflow:hidden}.lv-zone{position:absolute;left:50%;top:0;bottom:0;transform:translateX(-50%);background:rgba(255,111,165,.28);border-left:2px dashed #ff9ac2;border-right:2px dashed #ff9ac2}.lv-mark{position:absolute;top:8px;left:50%;transform:translateX(-50%);font-size:34px;line-height:40px}'
    + '.lv-bar{height:6px;background:#1b0f16;border-radius:3px;overflow:hidden}.lv-bar i{display:block;height:100%;width:0;background:#ff6fa5}.lv-btns{display:flex;gap:10px;margin-top:12px}.lv-btns .btn{flex:1;height:64px;font-size:18px}';
  document.head.appendChild(st);
})();
