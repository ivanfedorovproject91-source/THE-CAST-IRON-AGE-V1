/* ===== События: случайные ЧП, бинокль директора, поломки ===== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.D, C = G.clamp;
  const EV = (G.EV = []);
  const E = (id, o) => { o.id = id; EV.push(o); return o; };

  const PEE_NICKS = ['fontan', 'mokraya', 'luzha', 'nederzh', 'protek'];
  const POOP_NICKS = ['bombard', 'dermovoz', 'dristun', 'shokol', 'vonyuchka'];
  const FART_NICKS = ['perdun', 'gaz', 'diesel', 'reakt'];

  // ---------- Бинокль директора (разд. 8.3)
  G.binocularMaybe = function (a) {
    const s = G.s; if (s.phase !== 'work') return;
    const wd = G.weekday();
    let p = (wd === 0 || wd === 3) ? 16 : wd === 4 ? 10 : 4;
    if (s.world.binocSafe === G.week()) p *= 0.5;
    if (s.flags.warned) p *= 0.5;
    if (!G.chance(p)) return;
    G.toast('🔭 Блик в окне заводоуправления: директор в бинокль!', 'warn');
    const act = s.day.risky || 'нарушение';
    G.mini('tap', { title: 'ДИРЕКТОР В БИНОКЛЬ!', hint: 'Быстро жми «Делать вид, что работаешь»!', time: 3.0 }, r => {
      if (r.score >= 1) { G.toast('Успел сделать вид. Директор отвернулся.', 'good'); G.fx({ boss: 1 }); }
      else { G.note(act, false); s.world.binoc = 1; G.fx({ boss: -4, mood: -3 }); G.toast('Директор записал в блокнотик: «' + act + '».', 'bad'); }
    });
  };

  // ---------- Поломки станка
  G.machineIncident = function () {
    const s = G.s;
    const list = [
      ['Станок заклинило. Мастер ругается.', { mood: -4, boss: -2 }, 0],
      ['Из-под станка брызнули искры.', { health: -4, mood: -3 }, 0],
      ['Лопнула гидравлика: масло везде.', { neat: -25, mood: -3 }, 0],
      ['Сломался резец. Новый — в вычет.', { money: -150, mood: -4 }, 0],
      ['Станок перегрелся и встал на час.', { mood: -2 }, 1],
      ['Зажало перчатку — едва успел отдёрнуть руку.', { health: -3, mood: -6, know: 1 }, 0],
      ['Отвалился кожух. «Так и было».', { boss: -1 }, 0]
    ];
    const x = G.pick(list);
    G.fx(x[1]); G.fx({ wear: -35 }); G.toast('ЧП на станке: ' + x[0], 'bad');
    if (G.quality() < 70 && G.chance(40)) G.caught({ risk: 100, fine: [150, 400], what: 'Поломка станка по неосторожности', sev: 0 });
    if (x[2] && G.s.phase === 'work') G.advance(1);
  };

  // ---------- Мини-игра «удержать»: пузырь/кишечник
  function emergency(kind) {
    const s = G.s, pee = kind === 'pee';
    const nicks = pee ? PEE_NICKS : POOP_NICKS;
    const fail = () => {
      G.fx(pee ? { neat: -35, mood: -18, coll: -4 } : { neat: -45, mood: -25, coll: -8, cons: -2 });
      G.addNick(G.pick(nicks)); s.stats.fails = (s.stats.fails || 0) + 1;
      G.modal({ title: pee ? 'Не успел…' : 'КАТАСТРОФА', vib: 'error', cls: 'bad', text: pee ? 'Тёплое пятно расползается по штанам. Коллеги переглядываются.' : 'Слов нет. Запах распространился по цеху за секунды.', opts: [
        { t: 'Отпроситься домой', fn: () => { G.fx({ boss: -3, mood: -3 }); s.phase = 'evening'; s.t.hour = Math.max(Math.floor(s.t.hour), 10); s.day.ops = Math.max(s.day.ops, 0); G.toast('Тебя отпустили. Работу ты завершить не успел.', 'bad'); G.endShiftEarly(); } },
        { t: 'Работать в мокрых штанах', fn: () => { G.fx({ mood: -6, coll: -2, cool: -3 }); } }
      ] });
    };
    G.modal({ title: pee ? '🚽 Невыносимо хочется в туалет!' : '💩 Живот скрутило!', vib: 'warning', text: pee ? 'Мочевой пузырь сигналит красным. До туалета — пара шагов, но станок не ждёт.' : 'Шум в животе. Надо СРОЧНО.', opts: [
      { t: 'Терпеть (мини-игра)', fn: () => G.mini('mash', { title: pee ? 'Держи!' : 'ДЕРЖИСЬ!', hint: 'Жми кнопку, чтобы шкала не упала до нуля', time: pee ? 6 : 5, rate: pee ? 1 : 1.3 }, r => { if (r.score >= 0.7) { G.toast('Выдержал! Чуть не лопнул.', 'good'); G.fx({ mood: 2 }); } else fail(); }) },
      { t: 'Бежать в туалет (1 час)', dis: (s.day.wcVisits || 0) >= 2 ? 'Сегодня уже хватит' : null, fn: () => { s.day.wcVisits = (s.day.wcVisits || 0) + 1; s.day.peaGas = 99; G.toast('Побежал. Зато чисто.'); G.fx({ mood: 3 }); if (G.chance(8)) { G.toast('Туалет закрыт на ремонт!', 'bad'); fail(); } else G.spend(1); } },
      { t: 'Отпроситься у мастера', fn: () => { if (G.chance(55)) { s.day.wcVisits = (s.day.wcVisits || 0) + 1; s.day.peaGas = 99; G.toast('Степаныч махнул рукой: «Иди».'); G.spend(1); } else { G.toast('«Потерпишь». Отказали.', 'bad'); fail(); } } }
    ] });
  }
  G.endShiftEarly = function () { const s = G.s; s.phase = 'work'; s.t.hour = G.shiftEnd(); G.endShift(); };

  // ---------- Реестр событий
  E('pee', { where: ['work'], w: 3, cd: 2, cond: s => s.day.slots >= 1 && (s.day.wcVisits || 0) < 2, w2: s => 1 + s.st.drunk / 10 + (s.st.satiety > 70 ? 1 : 0), fn: () => emergency('pee') });
  E('poop', { where: ['work'], w: 1.2, cd: 4, cond: s => s.day.slots >= 2 && s.car.shifts >= 4 && (s.day.wcVisits || 0) < 2, fn: () => emergency('poop') });
  E('fart', { where: ['work'], w: 1.5, cd: 4, cond: s => s.day.slots >= 1, fn: () => G.modal({ title: 'Нечаянный звук', text: 'Живот предательски сработал в самый тихий момент. Рядом слышали.', opts: [
    { t: 'Сделать вид, что это станок', fn: () => { if (G.chance(50)) { G.toast('Прокатило!', 'good'); G.fx({ cool: 2 }); } else { G.addNick(G.pick(FART_NICKS)); G.fx({ mood: -4, coll: -2 }); } } },
    { t: 'Покраснеть и извиниться', fn: () => { G.fx({ mood: -3, coll: -1 }); if (G.chance(35)) G.addNick(G.pick(FART_NICKS)); } },
    { t: 'Ржать вместе со всеми', fn: () => { G.fx({ mood: 3, cool: 3, coll: 1 }); } }
  ] }) });
  E('cat', { where: ['work'], w: 2, cd: 6, cond: s => s.car.shifts >= 3, fn: () => G.modal({ title: 'Чугунок', face: 'chugunok', text: 'Рыжий кот запрыгнул на станок и смотрит на тебя, как на равного.', opts: [{ t: 'Погладить', fn: () => { G.fx({ mood: 12, rel: { chugunok: 6 } }); G.R('chugunok').met = true; } }, { t: 'Накормить котлетой', fn: () => { G.fx({ mood: 8, satiety: -3, rel: { chugunok: 10 } }); G.R('chugunok').met = true; } }] }) });
  E('squirrel', { where: ['work', 'evening'], w: 0.3, cd: 40, cond: s => s.car.shifts >= 20, fn: () => G.modal({ title: '🐿️ БЕЛКА В КАСКЕ', face: 'belka', text: 'На проводах сидит белка в каске. Она смотрит прямо в тебя. И кивает.', opts: [{ t: 'Кивнуть в ответ', fn: () => { G.fx({ mood: 10, cool: 3 }); G.achieve('squirrel', 'Белка одобряет'); } }, { t: 'Пойти за белкой', fn: () => { if (G.chance(30)) G.end('squirrel'); else { G.fx({ mood: 6 }); G.toast('Она убежала. Ты остался. Пока.'); } } }] }) });
  E('borrow', { where: ['work'], w: 2, cd: 6, cond: s => s.money > 600 && s.car.shifts >= 4, fn: () => G.modal({ title: 'Витёк просит в долг', face: 'vityok', text: '«Слышь, одолжи тысячку до получки, не подведу!»', opts: [
    { t: 'Дать 1 000 ₽', fn: () => { G.addMoney(-1000); G.R('vityok').owed = 1000; G.fx({ coll: 2, rel: { vityok: 6 } }); } },
    { t: 'Дать 300 ₽', fn: () => { G.addMoney(-300); G.R('vityok').owed = 300; G.fx({ rel: { vityok: 3 } }); } },
    { t: 'Отказать', fn: () => { G.fx({ coll: -2, rel: { vityok: -3 } }); if (G.chance(20)) G.addNick('zhmot'); } }
  ] }) });
  E('sopl_check', { where: ['work'], w: 2, cd: 5, cond: s => s.car.shifts >= 5 && (G.weekday() === 1 || G.weekday() === 3), fn: () => G.modal({ title: 'Соплежуйкин с проверкой', face: 'soplezhuykin', text: 'Максим Гогенович обходит цех с блокнотиком: «Показатели? Дисциплина? Кто тут у нас не работает?»', opts: [
    { t: 'Показать работу', fn: () => { if (G.quality() >= 75) { G.fx({ boss: 4 }); G.toast('Он остался доволен. Ушёл.'); } else { G.fx({ boss: -2 }); G.toast('«Ну так себе».'); } } },
    { t: 'Подхалимничать', fn: () => { G.fx({ boss: 4, coll: -2, cons: -2, rel: { soplezhuykin: 5 } }); } },
    { t: 'Нагрубить', fn: () => { G.fx({ boss: -8, cool: 5, rel: { soplezhuykin: -8 } }); G.note('Хамство Соплежуйкину'); } }
  ] }) });
  E('boss_yell', { where: ['work'], w: 2, cd: 5, cond: s => s.car.shifts >= 3, fn: () => G.modal({ title: 'Ор Труханова', face: 'truhanov', text: '«Эй, {tn}! Ты что тут встал?! Хочешь, чтобы я миллиарды потерял?!»'.replace('{tn}', G.pick(D.TRUH_NAMES)), vib: 'warning', opts: [
    { t: 'Молчать и кивать', fn: () => { G.fx({ boss: 1, mood: -4, terpila: 1 }); } },
    { t: 'Ответить по делу', fn: () => { if (G.chance(40 + G.s.st.boss / 4)) { G.fx({ boss: 3, cool: 3 }); G.toast('Он на секунду задумался и ушёл.', 'good'); } else { G.fx({ boss: -5, mood: -6 }); } } },
    { t: 'Огрызнуться', fn: () => { G.fx({ cool: 6, boss: -8, mood: 3 }); G.note('Огрызнулся на директора'); } }
  ] }) });
  E('injury', { where: ['work'], w: 1.5, cd: 5, cond: s => s.car.shifts >= 2, fn: () => G.modal({ title: 'Порезал палец', text: 'Заусенец, кровь, неприятно. Продолжать или в медпункт?', opts: [
    { t: 'Заклеить пластырем и работать', fn: () => { G.fx({ health: -2, mood: -2 }); } },
    { t: 'В медпункт (1 час)', fn: () => { G.fx({ health: 2, rel: { alevtina: 3 } }); G.spend(1); } }
  ] }) });
  E('money', { where: ['work', 'evening'], w: 1.5, cd: 4, fn: () => { const v = G.pick([10, 50, 100, 200]); G.addMoney(v); G.toast('Нашёл ' + G.rub(v) + ' в кармане старой куртки.', 'good'); G.fx({ mood: 3 }); } });
  E('power', { where: ['work'], w: 1, cd: 15, cond: s => s.car.shifts >= 8, fn: () => G.modal({ title: 'Свет вырубился', text: 'Весь цех встал. Мужики достали карты и чай.', opts: [{ t: 'Посидеть с мужиками', fn: () => { G.fx({ coll: 4, mood: 6, energy: 5 }); G.spend(1); } }, { t: 'Попробовать что-то починить', fn: () => { G.fx({ know: 3, boss: 2, energy: -4 }); G.spend(1); } }] }) });
  E('fight', { where: ['work'], w: 1, cd: 10, cond: s => s.car.shifts >= 10, fn: () => G.modal({ title: 'Драка в цеху', text: 'Серёга и Витёк сцепились из-за ерунды. Цех замер.', vib: 'warning', opts: [
    { t: 'Разнять', fn: () => { G.fx({ health: -4, coll: 5, cool: 3, fights: 1 }); } },
    { t: 'Поддержать Серёгу', fn: () => { G.fx({ rel: { seryoga: 6, vityok: -6 }, coll: 1, fights: 1 }); G.punish({ risk: 60, what: 'Участие в драке', fine: [200, 500], sev: 1 }); } },
    { t: 'Уйти в сторону', fn: () => { G.fx({ coll: -2 }); } }
  ] }) });
  E('bribe', { where: ['work'], w: 0.8, cd: 20, cond: s => s.car.rank >= 3, fn: () => G.modal({ title: 'Конвертик', face: 'khomyak', text: 'Заказчик шепчет: «Сделай без очереди — 3 000 ₽ твои».', opts: [
    { t: 'Взять', fn: () => { G.addMoney(3000); G.fx({ cons: -8, boss: -1 }); G.punish({ risk: 55, what: 'Взятка от заказчика', fine: [1000, 3000], sev: 2 }); } },
    { t: 'Отказаться', fn: () => { G.fx({ cons: 4, mood: 2 }); } }
  ] }) });
  E('ebl_cry', { where: ['work'], w: 1, cd: 8, cond: s => s.car.shifts >= 6 && !s.flags.eblBinge, fn: () => G.modal({ title: 'Ебланов плачет', face: 'eblanov', text: 'Ебланов сидит у станка и тихо рыдает: «Меня никто не ценит…»', opts: [
    { t: 'Утешить', fn: () => { G.fx({ cons: 3, rel: { eblanov: 8 }, flag: { eblGood: 1 } }); } },
    { t: 'Налить ему', fn: () => { G.fx({ drunk: 15, rel: { eblanov: 10 }, flag: { eblBinge: 1 } }); } },
    { t: 'Пройти мимо', fn: () => {} }
  ] }) });
  E('mikh_drunk', { where: ['work'], w: 1, cd: 10, cond: s => s.car.shifts >= 5, fn: () => G.talkTo('mikhalych') });
  E('lyudka_gossip', { where: ['work'], w: 1, cd: 6, cond: s => s.car.shifts >= 4, fn: () => { G.toast('Людка по секрету выдала сплетню про начальство.'); G.fx({ mood: 2, rel: { lyudka: 2 } }); G.s.flags.rumor = 1; } });
  E('trainee', { where: ['work'], w: 3, cd: 40, cond: s => s.car.shifts >= 30 && !s.flags.zahar, fn: () => { G.s.flags.zahar = 1; G.R('zahar').met = true; G.modal({ title: 'Новый стажёр', face: 'zahar', text: 'Степаныч приводит Захара: «Он теперь твой. Научи уму-разуму».', opts: [{ t: 'Взять наставничество', fn: () => G.fx({ coll: 3, boss: 2 }) }, { t: 'Отказаться', fn: () => G.fx({ boss: -1 }) }] }); } });
  E('hum', { where: ['work'], w: 1, cd: 6, fn: () => { G.fx({ mood: 4 }); G.toast('Радиоузел крутит «Ламбаду». Цех притоптывает.'); } });
  E('fire', { where: ['work'], w: 0.7, cd: 30, cond: s => s.car.shifts >= 10, fn: () => G.modal({ title: 'Учебная тревога', text: 'Вой сирены. Надо бежать на сборный пункт и стоять 20 минут.', opts: [{ t: 'Пойти со всеми', fn: () => { G.fx({ mood: -1, boss: 1 }); G.spend(1); } }, { t: 'Остаться у станка', fn: () => { G.punish({ risk: 70, what: 'Игнор учебной тревоги', fine: [100, 300], sev: 0 }); } }] }) });
  E('milk_drop', { where: ['lunch'], w: 2, cd: 8, fn: () => { G.fx({ mood: -2 }); G.toast('Кто-то опрокинул молоко. Лужа в столовой.'); } });
  E('lunch_gossip', { where: ['lunch'], w: 2, cd: 4, fn: () => { G.fx({ mood: 3, coll: 1 }); G.toast('За соседним столом спорят про премию.'); } });
  // вечер/выходные
  E('kolyan_call', { where: ['evening'], w: 3, cd: 6, cond: s => s.car.shifts >= 4, fn: () => G.modal({ title: '📞 Колян звонит', face: 'kolyan', text: '«Ну что, трудяга? Пошли в «У Палыча»! Я угощаю».', opts: [
    { t: 'Пойти', fn: () => { G.fx({ drunk: 28, mood: 9, craving: -22, coll: 1, rel: { kolyan: 6 } }); G.spend(3); } },
    { t: 'Отказаться', fn: () => { G.fx({ rel: { kolyan: -2 } }); } }
  ] }) });
  E('neighbors', { where: ['evening'], w: 2, cd: 4, fn: () => { G.fx({ energy: -5, mood: -4 }); G.toast('Соседи за стенкой устроили вечеринку до трёх ночи.'); } });
  E('mom', { where: ['evening'], w: 2, cd: 7, fn: () => G.modal({ title: '📞 Мама', text: '«Сынок, ты кушаешь? Не простудился? А внуки?..»', opts: [{ t: 'Поговорить', fn: () => { G.fx({ mood: G.pick([-5, 6]), energy: -2 }); G.spend(1); } }, { t: 'Скинуть', fn: () => { G.fx({ mood: -3, cons: -2 }); } }] }) });
  E('dorm_check', { where: ['evening'], w: 1.5, cd: 14, fn: () => { if (G.has('vodka') || G.has('beer')) { G.toast('Комендант в общаге нашёл бутылку: штраф 300 ₽.', 'bad'); G.fx({ money: -300 }); G.give(G.has('vodka') ? 'vodka' : 'beer', -1); } else G.toast('Комендант проверил комнату. Всё чисто.'); } });
  E('mugging', { where: ['evening'], w: 0.8, cd: 25, cond: s => s.money > 500, fn: () => G.modal({ title: 'Тёмный двор', vib: 'warning', text: 'Двое в капюшонах преграждают дорогу: «Закурить не найдётся?»', opts: [{ t: 'Отдать 300 ₽', fn: () => { G.addMoney(-300); G.fx({ mood: -4 }); } }, { t: 'Драться', fn: () => { if (G.chance(35 + G.s.st.cool / 3)) { G.fx({ cool: 8, mood: 6 }); G.toast('Отбился! Герой двора.', 'good'); } else { G.fx({ health: -10, mood: -8, money: -300 }); } } }, { t: 'Убежать', fn: () => { G.fx({ energy: -8, cool: -3 }); } }] }) });
  E('lottery', { where: ['evening'], w: 0.8, cd: 20, cond: s => s.money > 100, fn: () => G.modal({ title: 'Лотерейка «Спортлото»', text: 'У ларька продают билет: 100 ₽.', opts: [{ t: 'Взять', fn: () => { G.addMoney(-100); if (G.chance(1)) { G.addMoney(100000); G.toast('ВЫИГРАЛ 100 000 ₽!!!', 'good'); } else if (G.chance(12)) { G.addMoney(500); G.toast('+500 ₽ — отбил.'); } else G.toast('Не повезло.'); } }, { t: 'Пройти мимо', fn: () => {} }] }) });
  E('corp', { where: ['evening'], w: 0, cd: 1, fn: () => {} });
  E('babka', { where: ['evening'], w: 1, cd: 8, fn: () => { G.fx({ mood: 3, satiety: 8 }); G.toast('Баба Нюра угостила огурцами и рассказала про молодость.'); G.relAdd('nyura', 3); } });

  // ---------- Запуск
  G.rollEvent = function () {
    const s = G.s; if (s.end || G.cur) return;
    const ph = s.phase;
    const wh = ph === 'lunch' ? 'lunch' : ph === 'work' ? 'work' : G.isFree() ? 'evening' : null;
    if (!wh) return;
    // запланированное
    if (wh === 'evening' && s.flags.corpPending) { s.flags.corpPending = 0; G.corporate(); return; }
    const base = wh === 'work' ? 15 : wh === 'lunch' ? 9 : 8;
    if (s.car.shifts < 1 && wh === 'work') return;
    if (!G.chance(base)) return;
    const elig = EV.filter(e => e.w > 0 && (e.where || ['work']).indexOf(wh) >= 0 && (!e.cond || e.cond(s)) && !(s.eventHist && s.eventHist[e.id] != null && s.t.day - s.eventHist[e.id] < (e.cd || 3)));
    const e = G.wpick(elig, x => x.w * (x.w2 ? x.w2(s) : 1));
    if (!e) return;
    s.eventHist = s.eventHist || {}; s.eventHist[e.id] = s.t.day;
    if (s.eventHist) { const ks = Object.keys(s.eventHist); if (ks.length > 80) delete s.eventHist[ks[0]]; }
    e.fn(s);
  };

  // ---------- Корпоратив (разд. 11.3: 25 декабря)
  G.corporate = function () {
    const s = G.s;
    G.modal({ title: '🎄 Новогодний корпоратив', face: 'truhanov', vib: 'warning', text: 'Актовый зал, оливье, шампанское. Труханов толкает речь про миллиарды. Людка в блёстках. Соплежуйкин ловко щёлкает камерой.', opts: [
      { t: 'Выпить с директором', fn: () => { G.fx({ drunk: 35, boss: 6, rel: { truhanov: 6 }, mood: 8 }); G.toast('Вы выпили на брудершафт. Он назвал тебя «сынок».'); G.spend(3); } },
      { t: 'Танцевать с Людкой', fn: () => { G.fx({ drunk: 15, coll: 6, cool: 5, rel: { lyudka: 8 }, mood: 10 }); G.spend(3); } },
      { t: 'Петь караоке', fn: () => { G.fx({ cool: 8, mood: 10, drunk: 12 }); if (G.chance(30)) G.addNick('geroy'); G.spend(2); } },
      { t: 'Сбежать домой', fn: () => { G.fx({ boss: -3, mood: -2 }); } }
    ] });
  };
  const _ed = G.extraDaily;
  G.extraDaily = function () { _ed && _ed(); const s = G.s; if (s.t.day === 53) s.flags.corpPending = 1; };
})();
