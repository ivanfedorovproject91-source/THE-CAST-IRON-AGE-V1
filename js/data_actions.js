/* ===== Таблица действий: цех, перерывы, дом, город ===== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.D, A = G.A, C = G.clamp, K = G.career;
  const wk = () => G.s.phase === 'work' || G.s.phase === 'lunch';

  // ---------- Город: места
  D.PLACES = [
    { id: 'home', n: 'Общага', i: '🏠', d: 'Комната №14, баба Нюра за стенкой' },
    { id: 'c_shop', n: '«Пятёрка-Минус»', i: '🛒', d: 'Магазин. Цены — по настроению кассирши' },
    { id: 'c_rest', n: '«Золотая Заслонка»', i: '🍽️', d: 'Ресторан для тех, кто не считает деньги' },
    { id: 'c_cafe', n: '«Вкус очка»', i: '🍔', d: 'Почти «Вкусно — и точка»' },
    { id: 'c_kino', n: '«Октябрь-3D»', i: '🎬', d: 'Кинотеатр. Третье «D» — это дым' },
    { id: 'c_gym', n: '«Железный Феликс»', i: '🏋️', d: 'Спортзал. Вика на ресепшене' },
    { id: 'c_dk', n: 'ДК «Металлург»', i: '🎭', d: 'Хор ветеранов, танцы, КВН' },
    { id: 'c_ryum', n: '«У Палыча»', i: '🍻', d: 'Рюмочная. Колян обычно тут' },
    { id: 'c_market', n: 'Барахолка', i: '🧺', d: 'Купить, продать, «не спрашивать откуда»' },
    { id: 'c_garage', n: 'Гаражи', i: '🔧', d: 'Мужики, чай, запчасти' },
    { id: 'c_bath', n: 'Баня', i: '♨️', d: 'Здоровье и опрятность' },
    { id: 'c_hosp', n: 'Больница №2', i: '🏥', d: 'Лечение, кодирование' },
    { id: 'c_bank', n: '«Рубль-Банк»', i: '🏦', d: 'Кредиты «на особых условиях»' },
    { id: 'c_lombard', n: 'Ломбард «Золотой Зуб»', i: '🦷', d: 'Ценное — в залог, душу — в придачу' },
    { id: 'c_mall', n: 'ТЦ «Золотой Чугун»', i: '🏬', d: 'Телефоны, часы, костюмы' },
    { id: 'c_auto', n: 'Автосалон «Лада и К»', i: '🚗', d: 'Статус на колёсах' },
    { id: 'c_jobs', n: 'Биржа подработок', i: '📌', d: 'Доска объявлений' },
    { id: 'c_nature', n: 'Река и дача', i: '🎣', d: 'Рыбалка с Палычем, шашлыки' },
    { id: 'c_misc', n: 'Разное', i: '🎲', d: 'Церковь, казино, тир, промзона' },
    { id: 'c_station', n: 'Вокзал', i: '🚆', d: 'Билет в один конец' }
  ];

  // ---------- Хелпер простых действий
  const S = (id, loc, g, n, i, h, fx, txt, o) => A(id, Object.assign({ ph: ['free'], loc, g, n, i, h, fx, txt }, o || {}));

  // ===== ЦЕХ (loc shop) =====
  A('work', { ph: ['work'], loc: 'shop', g: 'Работа и учёба', n: 'РАБОТАТЬ', i: '⚙️', h: 1, work: true, menu: true,
    req: s => (!s.car.job ? 'Нет должности' : (s.car.rank > 0 && s.flags.xferUntil > s.car.shifts && false) || null),
    fn: s => {
      const j = G.job(); const kind = s.car.rank >= 6 || j.mini === 'papers' ? 'papers' : 'rhythm';
      if (s.instr.perv == null) { G.toast('Без первичного инструктажа допуска нет! Иди к Палычу или Пелагее.', 'bad'); return false; }
      G.mini(kind, { title: s.car.rank >= 8 ? 'Бумажки и подписи' : s.car.rank >= 6 ? 'Распределение людей' : (j.name + ': операция'), hint: kind === 'papers' ? 'Тапай по папкам, пока не кончилось время' : 'Тапай «РАБОТАТЬ», когда маркер в зелёной зоне', rounds: 3 + Math.min(2, Math.floor(G.physical() / 2)) }, r => G.doOp(r.score));
      return 'custom';
    } });
  G.doOp = function (score) {
    const s = G.s, j = G.job(), d = s.day, c = s.car;
    if (s.dwg.none) { G.toast('Чертежа нет — Ебланов в запое. Стоишь без дела.', 'bad'); G.spend(1); return; }
    const q = G.quality(), qop = q * (0.55 + 0.45 * score);
    d.ops++; d.qsum += qop; s.stats.ops++;
    const heavy = G.physical();
    const cash = Math.round((20 + c.rank * 5) * qop / 100 * (c.rank === 0 ? 0.5 : 1));
    G.addMoney(cash); s.stats.earned;
    s.st.bm += (c.rank >= 8 ? 3.5 : c.rank >= 6 ? 2.5 : 1.6) * qop / 100;
    G.fx({ energy: -(2 + heavy * 1.4), mood: -(0.15 + (j.nerves || 2) * 0.12), know: 0.6, wear: 0.9 });
    G.toast('Операция: качество ' + Math.round(qop) + '% (+' + G.rub(cash) + ')' + (score >= 0.8 ? ' — отлично!' : score < 0.35 ? ' — криво.' : ''), score >= 0.8 ? 'good' : score < 0.35 ? 'warn' : '');
    if (G.chance(s.machine.wear / 14)) G.machineIncident();
    G.spend(1);
  };
  A('auto', { ph: ['work'], loc: 'shop', g: 'Работа и учёба', n: 'Автосмена (рутина)', i: '⏩', menu: true, noEvent: true, req: s => G.slotsLeft() < 2 ? 'Смена почти кончилась' : (s.instr.perv == null ? 'Нужен первичный инструктаж' : null),
    fn: s => { G.modal({ title: 'Автосмена', text: 'Отработаешь остаток смены «на автомате»: усреднённый результат, повышенный риск, события пропускаются.', opts: [{ t: 'Поехали', fn: () => G.autoShift() }, { t: 'Отмена', fn: () => {} }] }); return 'custom'; } });
  A('check_dwg', { ph: ['work'], loc: 'shop', g: 'Работа и учёба', n: 'Проверить чертёж', i: '📐', h: 1, once: 'day',
    req: s => s.dwg.none ? 'Чертежа нет' : s.dwg.checked ? 'Уже проверен' : null,
    fn: s => { s.dwg.checked = true; const p = Math.min(95, 70 + s.st.know / 2); if (s.dwg.bad) { if (G.chance(p)) { s.dwg.fixed = true; G.fx({ know: 2, rel: { ekaterina: 1 } }); G.toast('Нашёл ошибку в чертеже и исправил! Качество +10.', 'good'); } else G.toast('Ничего не нашёл… (но чертёж кривой).', 'warn'); } else G.toast('Чертёж в порядке. Редкий случай.'); s.flags.ekDwg = (s.flags.ekDwg || 0) + 1; } });
  A('oil', { ph: ['work'], loc: 'shop', g: 'Работа и учёба', n: 'Смазать станок', i: '🛢️', h: 1, fx: { wear: -25, know: 2, energy: -3, neat: -3 }, txt: 'Станок скрипит, но дышит.' });
  A('study_ws', { ph: ['work'], loc: 'shop', g: 'Работа и учёба', n: 'Читать инструкции', i: '📖', h: 1, fx: { know: 6, energy: -3, mood: -1 }, txt: 'Прочитал инструкцию. Выяснил, что всё делал неправильно.' });
  A('help', { ph: ['work'], loc: 'shop', g: 'Коллеги и приколюхи', n: 'Помочь Серёге', i: '🤝', h: 1, fx: { coll: 4, energy: -5, rel: { seryoga: 3 }, cons: 1 }, txt: 'Подсобил напарнику. Неплохо.' });
  A('snitch', { ph: ['work'], loc: 'shop', g: 'Начальство и бумаги', n: 'Доложить мастеру (настучать)', i: '🐀', h: 1, noTrainee: true, fx: { boss: 5, coll: -8, cons: -6, snitch: 1 }, txt: 'Настучал Степанычу на коллегу. Мастер доволен.', fn: () => { if (G.chance(30)) G.addNick('stukach'); } });
  A('smoke_shop', { ph: ['work'], loc: 'shop', g: 'Перерыв и здоровье', n: 'Перекур у станка', i: '🚬', h: 1, cost: 20, fx: { mood: 4, energy: 3, health: -1 }, risk: 30, fine: [100, 300], tag: 'risky', what: 'Курение не в курилке', txt: 'Затянулся. Дым смешался с цеховым.' });
  A('tea', { ph: ['work'], loc: 'shop', g: 'Перерыв и здоровье', n: 'Чай в каптёрке', i: '🫖', h: 1, lunch: true, fx: { mood: 3, energy: 3 }, risk: 8, fine: [50, 150], what: 'Чаепитие в рабочее время', txt: 'Тёплый чай и тишина.' });
  A('milk', { ph: ['work'], loc: 'shop', anywhere: true, g: 'Перерыв и здоровье', n: 'Выпить заводское молоко', i: '🥛', menu: true, lunch: true, once: 'day', fx: { tox: -8, health: 2, cure: 1 }, txt: 'Заводское молоко. Белое и подозрительное.',
    fn: s => { s.day.milk = true; } });
  A('nap', { ph: ['work'], loc: 'shop', g: 'Перерыв и здоровье', n: 'Вздремнуть в подсобке', i: '😴', h: 1, fx: s => ({ energy: 14, mood: 2 }), risk: 34, fine: [150, 400], tag: 'risky', what: 'Сон на рабочем месте', txt: 'Придавил минут сорок. Почти как дома.' });
  A('phone_w', { ph: ['work'], loc: 'shop', anywhere: true, lunch: true, menu: true, noEvent: true, g: 'Телефон', n: 'Достать телефон', i: '📱', fn: () => { G.phoneMenu(); return 'custom'; } });
  A('use_w', { ph: ['work'], loc: 'shop', anywhere: true, lunch: true, menu: true, noEvent: true, g: 'Перерыв и здоровье', n: 'Рюкзак: использовать вещь', i: '🎒', fn: () => { G.useMenu(); return 'custom'; } });
  A('drink_w', { ph: ['work'], loc: 'shop', g: 'Крайности и криминал', n: 'Пропустить стопочку', i: '🥃', h: 1, lunch: true, menu: true, req: s => (G.has('vodka') || G.has('beer')) ? null : 'Нужна бутылка (магазин)',
    fn: s => { G.useItem(G.has('vodka') ? 'vodka' : 'beer'); G.fx({ coll: 3, cool: 2 }); G.spend(1); return 'custom'; } });
  A('otchib', { ph: ['work'], loc: 'shop', g: 'Отчибучить', n: 'Отчибучить…', i: '🎭', menu: true, noEvent: true, lunch: true, fn: () => { G.stuntMenu(); return 'custom'; } });
  A('loot', { ph: ['work'], loc: 'shop', g: 'Крайности и криминал', n: 'Присмотреть, что плохо лежит', i: '🧰', h: 1, noTrainee: true, menu: true, fn: () => { G.lootFind(); return 'custom'; } });

  // ===== ЗАВОДОУПРАВЛЕНИЕ (admin), ОТК, ДВОР, МЕДПУНКТ =====
  A('trud', { ph: ['work'], loc: 'admin', g: 'Начальство и бумаги', n: 'Жалоба в трудинспекцию', i: '📨', h: 1, noTrainee: true, req: s => s.flags.insp ? 'Жалоба уже подана' : null, fx: { cons: 3, boss: -3 }, txt: 'Жалоба подана. Ответ придёт через 2–3 недели.', fn: s => { s.flags.insp = s.t.day + G.ri(14, 21); } });
  A('courses_w', { ph: ['work'], loc: 'admin', g: 'Начальство и бумаги', n: 'Узнать про курсы', i: '🎓', menu: true, fn: () => { G.coursesMenu(); return 'custom'; } });
  A('smoke_yard', { ph: ['work'], loc: 'yard', g: 'Перерыв и здоровье', n: 'Перекур в курилке', i: '🚬', h: 1, lunch: true, cost: 20, fx: { mood: 4, energy: 3, health: -1, coll: 1 }, risk: 4, fine: [50, 150], what: 'Перекур', txt: 'Курилка. Все знают всё про всех.' });
  A('hole', { ph: ['work'], loc: 'yard', g: 'Крайности и криминал', n: 'Вынести через дыру в заборе', i: '🕳️', h: 1, menu: true, req: s => (s.flags.loot && s.flags.loot.length) ? null : 'Нечего выносить', fn: () => { G.carryOut('hole'); return 'custom'; } });
  A('yard_chat', { ph: ['work'], loc: 'yard', g: 'Коллеги и приколюхи', n: 'Потрепаться с мужиками', i: '🗣️', h: 1, lunch: true, fx: { coll: 3, mood: 3 }, risk: 6, fine: [50, 100], what: 'Разговоры в рабочее время', txt: 'Разговор про футбол и начальство.' });
  A('locker_nap', { ph: ['work'], loc: 'locker', g: 'Перерыв и здоровье', n: 'Прикорнуть на лавке', i: '😴', h: 1, lunch: true, fx: { energy: 10, mood: 1 }, risk: 20, fine: [100, 250], what: 'Сон в раздевалке', txt: 'Лавка жёсткая, но сон — сладкий.' });
  A('change', { ph: ['work'], loc: 'locker', g: 'Перерыв и здоровье', n: 'Переодеться в чистую спецовку', i: '🦺', h: 1, lunch: true, req: s => G.has('spare') ? null : 'Нет запасной спецовки (магазин)', fx: { neat: 35, mood: 1 }, txt: 'Чистая спецовка — как новая жизнь.', fn: s => { G.give('spare', -1); } });
  A('hide_loot', { ph: ['work'], loc: 'locker', g: 'Крайности и криминал', n: 'Спрятать добычу в шкафчик', i: '🔒', menu: true, req: s => (s.flags.loot && s.flags.loot.length) ? 'Уже спрятано' : 'Нечего прятать', txt: '' });
  A('rest_lunch', { ph: ['work'], loc: 'canteen', g: 'Перерыв и здоровье', n: 'Просто посидеть', i: '🪑', menu: false, lunch: true, fx: { mood: 3, energy: 4 }, txt: 'Посидел, отдышался.' });
  A('eat', { ph: ['work'], loc: 'canteen', g: 'Перерыв и здоровье', n: 'Взять обед', i: '🍲', lunch: true, menu: true, fn: () => { G.eatMenu(); return 'custom'; } });
  A('otk_chat', { ph: ['work'], loc: 'otk', g: 'Начальство и бумаги', n: 'Сдать деталь на ОТК', i: '🔩', h: 1, fx: s => ({ rel: { ekaterina: s.dwg.bad && !s.dwg.fixed ? -2 : 2 }, boss: 1 }), txt: 'Екатерина Евгеньевна молча измеряет деталь.' });
  A('med_visit', { ph: ['work'], loc: 'med', g: 'Перерыв и здоровье', n: 'Посидеть в медпункте', i: '⚕️', h: 1, lunch: true, fx: { mood: 2, health: 2, energy: 3 }, txt: 'В медпункте тихо. И пахнет зелёнкой.' });

  // ===== УТРО / РАЗДЕВАЛКА =====
  A('coffee_m', { ph: ['morning'], loc: 'home', anywhere: true, g: 'Утро', n: 'Кофе по дороге (50 ₽)', i: '☕', cost: 50, menu: true, once: 'day', fx: { energy: 6, mask: 20 }, txt: 'Кофе из автомата у ворот.' });
  A('wash_m', { ph: ['morning'], loc: 'home', anywhere: true, g: 'Утро', n: 'Умыться и почистить зубы', i: '🪥', menu: true, once: 'day', fx: { neat: 10, mask: 15, mood: 1 }, txt: 'Прохладная вода и вкус мяты.' });
  A('use_m', { ph: ['morning', 'locker'], loc: 'home', anywhere: true, g: 'Утро', n: 'Рюкзак: рассол, жвачка, лекарства', i: '🎒', menu: true, fn: () => { G.useMenu(); return 'custom'; } });
  A('sick_m', { ph: ['morning'], loc: 'home', anywhere: true, g: 'Утро', n: 'Купить больничный (2 000 ₽)', i: '🩹', menu: true, noTrainee: true, req: s => s.money < 2000 ? 'Нет денег' : null, fn: () => { G.buySick(); return 'custom'; } });
  A('stay_m', { ph: ['morning'], loc: 'home', anywhere: true, g: 'Утро', n: 'Не идти на работу (прогул)', i: '🛏️', menu: true, noEvent: true, fn: s => {
    G.modal({ title: s.car.sickUntil >= s.t.day ? 'Больничный / отпуск' : 'Прогул', text: s.car.sickUntil >= s.t.day ? 'Сегодня ты дома по законному основанию.' : 'Не выйти на работу — прогул. Штраф и выговор.', opts: [{ t: 'Остаться дома', fn: () => { if (s.car.sickUntil < s.t.day) { s.day.viol++; G.punish({ risk: 100, what: 'Прогул', fine: [500, 1500], sev: 1 }); } if (s.end) return; G.fx({ energy: 10, mood: 4 }); s.phase = 'evening'; s.t.hour = 17; s.day.skip = true; G.toast('Остался дома. Завод без тебя не развалился. Пока.'); } }, { t: 'Всё же пойду', fn: () => {} }] }); return 'custom'; } });
  A('prep_wed', { ph: ['locker'], loc: 'locker', g: 'Раздевалка', n: 'Подготовка к проверке (1 час)', i: '🧹', h: 1, req: s => G.weekday() !== 2 ? 'Только по средам' : s.day.prepped ? 'Уже подготовился' : null, fx: { neat: 12, mood: -1 }, txt: 'Прибрал рабочее место, проверил форму. Пусть проверяет.', fn: s => { s.day.prepped = true; s.t.hour = 8; s.phase = 'work'; s.loc = 'shop'; } });

  // ===== ДОМ (loc home) =====
  A('sleep', { ph: ['free'], loc: 'home', g: 'Дом', n: 'ЛЕЧЬ СПАТЬ', i: '🛌', menu: true, noEvent: true, fn: () => { G.sleep(); G.pump(); return 'custom'; } });
  S('rest', 'home', 'Дом', 'Отдохнуть дома (2 ч)', '🛋️', 2, { energy: 10, mood: 2 }, 'Лежишь, смотришь в потолок. Тихо.');
  S('cook', 'home', 'Дом', 'Сварить макароны (40 ₽)', '🍝', 1, { satiety: 28, mood: 1, energy: -2, money: -40 }, 'Макароны с кетчупом. Классика общаги.');
  S('shower', 'home', 'Дом', 'Помыться и постирать (50 ₽)', '🚿', 1, { neat: 45, mood: 2, money: -50, tox: -2 }, 'Спецовка стирается, ты — тоже.');
  S('study_h', 'home', 'Дом', 'Учить матчасть (2 ч)', '📚', 2, { know: 10, energy: -6, mood: -2 }, 'Учебник и холодный чай.');
  S('use_h', 'home', 'Дом', 'Рюкзак: использовать вещь', '🎒', 0, {}, '', { menu: true, fn: () => { G.useMenu(); return 'custom'; } });
  S('drink_h', 'home', 'Дом', 'Напиться дома', '🍾', 2, {}, '', { req: s => (G.has('vodka') || G.has('beer')) ? null : 'Нужна выпивка (магазин)', fn: s => { const id = G.has('vodka') ? 'vodka' : 'beer'; const n = id === 'vodka' ? 2 : 3; for (let i = 0; i < n && G.has(id); i++) G.useItem(id); G.fx({ mood: 4 }); }, tag: 'x' });
  S('courses_h', 'home', 'Дом', 'Учёба и курсы (платно)', '🎓', 0, {}, '', { menu: true, fn: () => { G.coursesMenu(); return 'custom'; } });
  S('phone_h', 'home', 'Дом', 'Телефон / банк / блог', '📱', 0, {}, '', { menu: true, fn: () => { G.phoneMenu(); return 'custom'; } });
  S('overtime', 'home', 'Дом', 'Задержаться на 2 часа (×1.5)', '⏰', 2, { boss: 3, energy: -12, mood: -6, health: -2 }, 'Остался сверхурочно. Начальство довольно, ты — нет.', { req: s => !G.isWorkday() || s.day.skip ? 'Только в рабочий день' : s.phase !== 'evening' ? 'Только в рабочий день' : s.t.hour > G.shiftEnd() + 1 ? 'Поздно' : s.day.overtime ? 'Уже сегодня' : null, fn: s => { s.day.overtime = 1; s.pay.acc += G.monthlyPay() / 20 / 8 * 2 * 1.5; } });
  S('vacation', 'home', 'Дом', 'Взять отпуск (5 дней)', '🏖️', 0, { health: 25, energy: 40, mood: 30, know: -10 }, 'Отпуск! Дача, огурцы, тишина.', { menu: true, noTrainee: true, req: s => s.car.vac < 5 ? 'Дней отпуска: ' + s.car.vac + ' (нужно 5)' : null, fn: s => { s.car.vac -= 5; s.car.sickUntil = s.t.day + 6; G.toast('Ты в отпуске до ' + G.dateStrOf(s.t.day + 6) + '.'); } });
  S('buy_sick_h', 'c_hosp', 'Больница', 'Купить больничный (2 000 ₽)', '🩹', 1, {}, '', { noTrainee: true, req: s => s.money < 2000 ? 'Нет денег' : null, fn: s => { G.buySick(); return 'custom'; }, menu: true });

  // ===== ГОРОД =====
  S('shop_menu', 'c_shop', 'Магазин', 'Зайти в магазин', '🛒', 0, {}, '', { menu: true, fn: () => { G.shopMenu(); return 'custom'; } });
  S('rest_eat', 'c_rest', 'Ресторан', 'Поужинать (1 500 ₽)', '🍷', 3, { satiety: 45, mood: 20, money: -1500 }, 'Мясо, салат и скатерть. Живут же люди!', { req: s => s.money < 1500 ? 'Нет денег' : null });
  S('cafe_eat', 'c_cafe', 'Кафе', 'Посидеть в «Вкус очка» (300 ₽)', '🍔', 1, { satiety: 32, mood: 6, money: -300 }, 'Бургер и картошка. Рядом кто-то из знакомых.');
  S('kino', 'c_kino', 'Кино', 'Сходить на фильм (350 ₽)', '🎬', 2, { mood: 13, energy: 2, money: -350 }, 'Фильм про богатых. Смешной.');
  S('gym_buy', 'c_gym', 'Спортзал', 'Абонемент на месяц (8 000 ₽)', '🎫', 0, {}, 'Абонемент оплачен до ' + '…', { menu: true, req: s => s.money < 8000 ? 'Нет денег' : null, fn: s => { G.addMoney(-8000); s.flags.gym = G.week() + 4; G.toast('Абонемент до недели №' + (s.flags.gym + 1) + '. Вика улыбается.'); G.relAdd('vika', 3); }, txt: '' });
  S('gym_train', 'c_gym', 'Спортзал', 'Тренировка (2 ч)', '🏋️', 2, { energy: -15, health: 3, cool: 1, mood: 4, neat: -8 }, 'Железо — лучшее лекарство.', { req: s => (s.flags.gym || -1) < G.week() ? 'Нужен абонемент' : null });
  S('dk_chorus', 'c_dk', 'ДК «Металлург»', 'Хор ветеранов труда (чт)', '🎤', 2, { mood: 10, cool: -1, rel: { pelageya: 3 } }, 'Хор. Все фальшивят, но дружно.', { req: s => G.weekday() !== 3 ? 'Только по четвергам' : null });
  S('dk_dance', 'c_dk', 'ДК «Металлург»', 'Танцы (сб)', '💃', 3, { mood: 10, cool: 2, energy: -6, money: -100 }, 'Танцы до упаду.', { req: s => G.weekday() !== 5 ? 'Только по субботам' : null });
  S('dk_kvn', 'c_dk', 'ДК «Металлург»', 'КВН-кружок', '🎙️', 2, { mood: 8, cool: 3 }, 'Шутка про начальство — смех в зале.');
  S('ryum', 'c_ryum', 'Рюмочная', 'Выпить с мужиками (400 ₽)', '🍻', 2, { drunk: 30, mood: 10, coll: 4, craving: -20, money: -400 }, 'У Палыча наливают и слушают.', { req: s => s.money < 400 ? 'Нет денег' : null });
  S('tamada', 'c_ryum', 'Рюмочная', 'Тамада на юбилее (4 ч)', '🎉', 4, { money: 2500, drunk: 18, cool: 4, mood: 4, energy: -10 }, 'Ты вёл юбилей. В конце заплатили и налили.', { risk: 0 });
  S('market_sell', 'c_market', 'Барахолка', 'Продать краденое (60%)', '💰', 1, {}, '', { menu: true, req: s => (s.flags.loot && s.flags.loot.length) ? null : 'Нечего продавать', fn: s => { let v = 0; s.flags.loot.forEach(x => v += x.v); G.addMoney(Math.round(v * 0.6)); G.toast('Продал на барахолке за ' + G.rub(v * 0.6) + '. Продавцы не спрашивали откуда.'); s.flags.loot = []; G.fx({ cons: -2 }); }, txt: '' });
  S('market_buy', 'c_market', 'Барахолка', 'Купить дешёвую одежду (700 ₽)', '👕', 1, { neat: 10, mood: 2 }, 'Купил свитер. Пахнет чужой бабушкой.', { cost: 700, fn: s => { G.give('spare', 1); } });
  S('garage', 'c_garage', 'Гаражи', 'Посидеть с мужиками', '🔧', 2, { coll: 3, mood: 5, rel: { vityok: 2 } }, 'Чай, запчасти, разговор про всё.');
  S('bath', 'c_bath', 'Баня', 'Сходить в баню (400 ₽)', '♨️', 3, { health: 10, neat: 45, mood: 6, tox: -10, money: -400 }, 'Пар, веник, пиво. Жизнь удалась.', { req: s => s.money < 400 ? 'Нет денег' : null });
  S('hosp', 'c_hosp', 'Больница', 'Подлечиться (1 500 ₽)', '💉', 2, { health: 15, tox: -10, money: -1500 }, 'Врач выписал таблетки и посмотрел с жалостью.', { req: s => s.money < 1500 ? 'Нет денег' : null });
  S('coding', 'c_hosp', 'Больница', 'Закодироваться (15 000 ₽)', '🚫', 4, { money: -15000, craving: -100, habit: -40, energy: -10 }, 'Тебя закодировали. Врач предупредил про срыв.', { req: s => s.money < 15000 ? 'Нет денег' : null, fn: s => { s.flags.coded = G.week() + G.ri(3, 6); } });
  S('bank', 'c_bank', 'Банк', 'Поговорить с менеджером', '🏦', 0, {}, '', { menu: true, fn: () => { G.bankMenu(); return 'custom'; } });
  S('lombard', 'c_lombard', 'Ломбард', 'Заложить вещь (40%)', '🦷', 0, {}, '', { menu: true, fn: () => { G.lombardMenu(); return 'custom'; } });
  S('mall', 'c_mall', 'ТЦ', 'Электроника и часы', '🛍️', 0, {}, '', { menu: true, fn: () => { G.statusMenu(['phone', 'watch', 'laptop', 'clothes'], 'ТЦ «Золотой Чугун»'); return 'custom'; } });
  S('auto', 'c_auto', 'Автосалон', 'Посмотреть машины', '🚗', 0, {}, '', { menu: true, fn: () => { G.statusMenu(['car'], 'Автосалон «Лада и К»'); return 'custom'; } });
  S('gigs', 'c_jobs', 'Подработки', 'Выбрать подработку', '📌', 0, {}, '', { menu: true, fn: () => { G.gigMenu(); return 'custom'; } });
  S('fishing', 'c_nature', 'Природа', 'Рыбалка с Палычем (4 ч)', '🎣', 4, { mood: 20, energy: -4, rel: { palych: 5 }, coll: 2 }, 'Тишина, поплавок, Палыч с термосом.', { fn: s => { if (G.chance(25)) { G.toast('Поймал сапог. Зато свой!'); } else if (G.chance(50)) { G.give('bread', 1); G.toast('Поймал рыбу! Сытный ужин.'); } } });
  S('dacha', 'c_nature', 'Природа', 'Огород у бабы Нюры', '🥔', 3, { satiety: 25, health: 2, energy: -10, mood: 2, rel: { nyura: 4 } }, 'Картошка и ломота в пояснице.');
  S('shashlik', 'c_nature', 'Природа', 'Шашлыки на «Чучи»', '🍖', 4, { satiety: 30, drunk: 15, coll: 6, mood: 12, money: -500 }, 'Мясо, мужики, песни.', { req: s => s.money < 500 ? 'Нет денег' : null });
  S('church', 'c_misc', 'Разное', 'Побеседовать с батюшкой', '⛪', 1, { cons: 4, mood: 5 }, 'Батюшка слушал и не осуждал. Редкость.');
  S('casino', 'c_misc', 'Разное', 'Автоматы «Золотой Чугун»', '🎰', 1, {}, '', { menu: true, fn: () => { G.casino(); return 'custom'; } });
  S('billiard', 'c_misc', 'Разное', 'Бильярд «Полтора шара»', '🎱', 2, {}, '', { fn: s => { if (G.chance(45 + s.st.cool / 4)) { G.addMoney(400); G.fx({ cool: 3, mood: 6 }); G.toast('Выиграл партию на деньги: +400 ₽.', 'good'); } else { G.addMoney(-400); G.fx({ mood: -2 }); G.toast('Проиграл 400 ₽.', 'bad'); } }, req: s => s.money < 400 ? 'Нет денег' : null });
  S('tir', 'c_misc', 'Разное', 'Тир «Меткий»', '🎯', 1, { mood: 6, cool: 2, money: -150 }, 'Попал почти в яблочко. Стресс снят.', { req: s => s.money < 150 ? 'Нет денег' : null });
  S('stalker', 'c_misc', 'Разное', 'Прогулка по промзоне', '🔦', 3, { mood: 3, energy: -8 }, '', { fn: s => { if (G.chance(50)) { const v = G.ri(100, 600); G.addMoney(v); G.toast('В промзоне нашёл металлолом: +' + G.rub(v) + '.'); } else if (G.chance(25)) { G.fx({ health: -6 }); G.toast('Споткнулся о рельс. Ссадина.', 'bad'); } else G.toast('Ржавые трубы и тишина. Красота.'); } });
  S('court', 'c_misc', 'Разное', 'Посидеть во дворе с бабками', '👵', 1, { mood: 2 }, '', { fn: s => { G.toast('Бабки пересказали новости всего города. Среди них — «про тебя»…'); s.flags.rumor = 1; } });
  S('station', 'c_station', 'Вокзал', 'Купить билет в Москву', '🚆', 0, {}, '', { menu: true, fn: s => { if (s.money < 500000) { G.info('Касса', 'Билет в один конец стоит дёшево, а вот начать в Москве с нуля — 500 000 ₽. У тебя ' + G.rub(s.money) + '.'); } else G.modal({ title: 'Вокзал', text: 'У тебя хватает на жизнь в Москве. Уехать навсегда?', opts: [{ t: 'Уехать', fn: () => G.end('moscow') }, { t: 'Остаться', fn: () => {} }] }); return 'custom'; } });
  S('nyura', 'home', 'Дом', 'Зайти к бабе Нюре', '👵', 1, { mood: 3 }, '', { menu: false, fn: () => { G.npcMenu('nyura'); return 'custom'; } });

  // ---------- Меню: еда
  G.eatMenu = function () {
    const s = G.s, p = G.R('lyudka').stage >= 4 ? 1.2 : 1;
    const rec = () => G.modal({ title: 'Столовая', face: 'lyudka', wide: true, text: 'Деньги: <b>' + G.rub(s.money) + '</b> · Сытость: ' + Math.round(s.st.satiety) + '<br><i>Людка гремит черпаком.</i>', opts: D.MENU.map(m => ({ t: m.n + ' — ' + G.rub(m.p), dis: s.money < m.p ? 'Нет денег' : null, fn: () => { G.addMoney(-m.p); const f = {}; for (const k in m.fx) f[k] = m.fx[k] * (k === 'satiety' ? p : 1); G.fx(f); if (m.mask) s.mask += m.mask; if (m.fx.satiety >= 15) G.fx({ cure: 1 }); G.toast(m.n + ': ' + Object.keys(f).map(k => D.STAT_RU[k] + ' +' + Math.round(f[k])).join(', ')); if (G.R('tatyana').l >= 20 && G.chance(30)) { G.toast('В хлебе записка от Татьяны: «Приятного».', 'good'); G.relAdd('tatyana', 2); } rec(); } })).concat([{ t: 'Хватит', fn: () => G.spend(1) }]) });
    rec();
  };

  // ---------- Курсы
  G.coursesMenu = function () {
    const s = G.s, ids = Object.keys(D.COURSES);
    G.modal({ title: 'Учёба и курсы', wide: true, text: 'Корочки: ' + (s.car.certs.map(c => D.COURSES[c] ? D.COURSES[c].name : c).join('; ') || 'нет') + '<br>Курсы идут вечерами; часы потратятся сразу.', opts: ids.map(id => ({ t: D.COURSES[id].name + ' — ' + G.rub(D.COURSES[id].price) + (G.hasCert(id) ? ' ✔' : ''), dis: G.hasCert(id) ? 'Уже есть' : null, fn: () => K.takeCourse(id) })).concat([{ t: 'Закрыть', fn: () => {} }]) });
  };
  G.lombardMenu = function () {
    const s = G.s, ids = Object.keys(s.own).filter(k => D.STATUS[k].tier !== 'flat');
    if (!ids.length) { G.info('Ломбард «Золотой Зуб»', 'Закладывать нечего. Могу принять ваш скепсис в залог — но не дорого.'); return; }
    G.modal({ title: 'Ломбард', text: 'Принимают на 40% стоимости.', opts: ids.map(k => ({ t: D.STATUS[k].e + ' ' + D.STATUS[k].n + ' — ' + G.rub(D.STATUS[k].p * 0.4), fn: () => { G.addMoney(Math.round(D.STATUS[k].p * 0.4)); delete s.own[k]; G.toast('Заложено: ' + D.STATUS[k].n, 'warn'); } })).concat([{ t: 'Уйти', fn: () => {} }]), wide: true });
  };
  G.casino = function () {
    const s = G.s;
    G.modal({ title: '🎰 «Золотой Чугун»', text: 'Автомат подмигивает. Ставка — как судьба. Деньги: ' + G.rub(s.money), opts: [200, 1000, 5000].map(b => ({ t: 'Ставка ' + G.rub(b), dis: s.money < b ? 'Нет денег' : null, fn: () => { s.flags.lud = (s.flags.lud || 0) + 1; if (G.chance(42)) { G.addMoney(b); G.fx({ mood: 8 }); G.toast('Выиграл +' + G.rub(b) + '!', 'good'); } else { G.addMoney(-b); G.fx({ mood: -6 }); G.toast('Проиграл ' + G.rub(b) + '.', 'bad'); } G.spend(1); } })).concat([{ t: 'Уйти', fn: () => {} }]) });
  };
  G.gigMenu = function () {
    const s = G.s;
    const gigs = [
      ['Таксист (ночью)', 4, { money: G.ri(1500, 2500), energy: -35, mood: -4 }, 'Ночные пассажиры: пьяные, добрые и страшные.', 'taxi'],
      ['Грузчик', 4, { money: 1200, health: -3, energy: -35 }, 'Гора коробок и ноющая спина.'],
      ['Маляр', 4, { money: 1600, mood: -10, energy: -20, tox: 4 }, 'Краска, запах, потолок.'],
      ['Уборщик', 4, { money: 900, mood: -8, energy: -15 }, 'Мыл полы. Полы сопротивлялись.'],
      ['Диджей на свадьбе', 4, { money: 2000, cool: 3, drunk: 10, mood: 3, energy: -10 }, 'Играл «Ламбаду» на бис.'],
      ['Курьер', 4, { money: 1300, energy: -25, mood: -2 }, 'Бегал по подъездам с пиццей.'],
      ['Разгрузка вагона', 4, { money: 2200, health: -5, energy: -40 }, 'Вагон ушёл. Ты — нет.'],
      ['Шабашка у соседа', 3, { money: 1000, energy: -18, rel: { nyura: 2 } }, 'Починил сантехнику соседу.']
    ];
    G.modal({ title: 'Биржа подработок', wide: true, text: 'Подработки копят «усталость от подработок»: на заводе качество падает.', opts: gigs.map(g => ({ t: g[0] + ' (' + g[1] + ' ч) ≈ ' + G.rub(g[2].money), dis: s.t.hour + g[1] > 26 ? 'Поздно' : null, fn: () => { G.fx(g[2]); s.day.fatigue = (s.day.fatigue || 0) + 3; s.flags.gigs = (s.flags.gigs || 0) + 1; G.toast(g[3] + ' (+' + G.rub(g[2].money) + ')'); if (g[4] === 'taxi' && G.chance(10)) { G.fx({ health: -8, mood: -8 }); G.toast('Хамы на заднем сиденье. Небольшое ДТП.', 'bad'); } G.spend(g[1]); } })).concat([{ t: 'Закрыть', fn: () => {} }]) });
  };

  // ---------- Мелкая кража (разд. 17.11)
  const LOOT = [['болты и гайки', 50, 150], ['моток медного провода', 400, 800], ['подшипник', 600, 1200], ['технический спирт', 300, 700, 'spirt'], ['инструмент', 500, 1500], ['лист металла', 200, 500], ['мешок цемента', 150, 150], ['спецодежда и валенки', 300, 300], ['бутыль масла', 200, 200], ['чугунная плита (тяжёлая)', 1000, 2500], ['удлинитель и фонарь', 250, 250], ['детали станка', 2000, 3500]];
  G.lootFind = function () {
    const s = G.s; const it = G.pick(LOOT); const v = G.ri(it[1], it[2]);
    s.flags.loot = s.flags.loot || [];
    G.modal({ title: 'Плохо лежит', text: 'Ты заметил: <b>' + it[0] + '</b> (≈ ' + G.rub(v) + '). Никто не смотрит… вроде.', opts: [
      { t: 'Взять (спрятать в робу)', fn: () => { s.flags.loot.push({ n: it[0], v, spirt: !!it[3] }); G.fx({ cons: -4 }); s.car.thefts++; s.day.stole++; G.toast('Спрятал: ' + it[0] + '. Совесть тихо ворчит.', 'warn'); G.spend(1); } },
      { t: 'Передать Хомяку', fn: () => { if (G.npcLoc('khomyak')) { G.addMoney(Math.round(v * 0.5)); G.fx({ cons: -4 }); s.car.thefts++; G.toast('Хомяк рассчитался на месте: ' + G.rub(v * 0.5)); } else G.toast('Хомяка нет рядом.'); G.spend(1); } },
      { t: 'Оставить', fn: () => { G.fx({ cons: 2 }); G.spend(1); } }
    ] });
  };
  G.carryOut = function (way) {
    const s = G.s, loot = s.flags.loot || []; if (!loot.length) return;
    let v = 0; loot.forEach(x => v += x.v);
    const heavy = v > 1500;
    let risk = (way === 'hole' ? 22 : 36) + (heavy ? 12 : 0) - G.rl('lyosha') / 3 - (G.rl('gosha') > 20 ? 10 : 0);
    const cb = () => {
      if (G.chance(C(risk, 10, 70))) { s.flags.loot = []; G.addNick('tashchilkin'); G.punish({ risk: 100, what: 'Хищение (' + G.rub(v) + ')', fine: [500, 2000], sev: heavy || s.car.thefts > 3 ? 2 : 1 }); if (s.end) return; }
      else { G.addMoney(Math.round(v * 0.6)); G.toast('Вынес! Хомяк-«скупщик» рассчитался: +' + G.rub(v * 0.6) + '.', 'good'); s.flags.loot = []; s.flags.stolenTotal = (s.flags.stolenTotal || 0) + v; }
    };
    if (way === 'pay') { const cost = Math.round(v * 0.3); if (s.money < cost) { G.toast('Нет денег откупиться.'); return; } G.addMoney(-cost); risk = 5; cb(); return; }
    cb();
  };

  // ---------- Отчибучить (22)
  const STUNTS = [
    ['Станцевать на столе', 40, 0, { cool: 12, mood: 10 }, 'Стол трещал, зал аплодировал.', 'light'],
    ['Пранкануть коллегу (подушка-пердушка)', 25, 0, { mood: 8, coll: 1 }, 'Подушка издала звук. Коллега подпрыгнул.', 'light'],
    ['Постучать в дверь начальника и убежать', 35, 0, { mood: 10, boss: -2 }, 'Бежал так, что обогнал эхо.'],
    ['Покакать под дверь начальнику (экстрим)', 70, 2, { mood: 25, cool: 20, cons: -6, coll: 4, nick: 'govnar' }, 'Легенда родилась. Но убирать будут не тебе.'],
    ['Спеть в радиоузел', 45, 0, { cool: 8, boss: -3, mood: 8 }, 'По всему заводу прозвучал твой шансон.'],
    ['Нарисовать усы на Доске почёта', 50, 0, { cool: 8, boss: -2, mood: 6 }, 'Усы удались. Начальник цеха стал похож на себя.'],
    ['Гонки на тележках', 35, 0, { energy: -6, coll: 4, cool: 6, mood: 8 }, 'Тележка занесла на повороте. Мужики орали «ура».'],
    ['Привязать шнурки коллеге', 25, 0, { mood: 5, coll: -1 }, 'Коллега падал красиво.', 'light'],
    ['Запереть Соплежуйкина в туалете', 60, 2, { boss: -15, mood: 25, cool: 20, rel: { soplezhuykin: -20 } }, 'Пять минут славы и крик из кабинки.'],
    ['Включить «Ламбаду» на весь цех', 30, 0, { coll: 4, boss: -2, mood: 8 }, 'Цех двигался в ритме.'],
    ['Надеть каску на кота Чугунка', 15, 0, { mood: 8, health: -2 }, 'Кот недоволен, но в каске красавец.'],
    ['Поменять местами таблички М/Ж', 40, 0, { mood: 8, boss: -2 }, 'Надежда Николаевна обнаружила себя «не там».'],
    ['Спрятать у Ебланова ручку', 20, 0, { mood: 4 }, 'Чертёж задержится.', 'light'],
    ['Бои тараканов с тотализатором', 30, 0, { coll: 4, mood: 6, money: G.ri ? 150 : 150 }, 'Таракан «Мазут» выиграл.'],
    ['Забег в цеховых тапках на водку', 25, 0, { coll: 4, cool: 5, mood: 6 }, 'Сорок метров позора и славы.'],
    ['«Собрание» в курилке — избрать бригадира-шута', 35, 0, { coll: 4, boss: -2, mood: 6 }, 'Шут избран единогласно.'],
    ['Налить Витьку «чай» (с водкой)', 30, 0, { mood: 5, coll: 3 }, 'Витёк подобрел и испортил станок.'],
    ['Украсить станок гирляндой', 18, 0, { mood: 5, boss: 1 }, 'Станок мигает. Начальник тоже улыбнулся.', 'light'],
    ['Написать мелом «Чугунный век = чугунные лбы»', 45, 1, { cool: 10, mood: 6 }, 'Гоша «Танк» ищет виновного с лупой.'],
    ['Минута славы: речь про справедливость', 28, 0, { cons: 4, cool: 6, boss: -3, mood: 5 }, 'Тебя слушали. Это уже победа.'],
    ['Гимн Едрёносталя в рэпе на громкой связи', 32, 0, { coll: 4, boss: -2, mood: 6 }, 'Рэп про трубы — это тема.'],
    ['«Письмо счастья» по цеху', 15, 0, { mood: 3 }, 'Письмо дошло до начальника. Он не поверил.', 'light']
  ];
  G.stuntMenu = function () {
    const s = G.s;
    const list = STUNTS.map((x, i) => ({ x, i })).filter(o => s.car.rank > 0 || o.x[5] === 'light');
    G.modal({ title: 'Отчибучить', wide: true, text: 'Риск — шанс, что заметят. Ты можешь прославиться, а можешь вылететь.', opts: list.map(o => ({ t: o.x[0] + ' · риск ' + G.catchChance(o.x[1]) + '%', fn: () => G.runStunt(o.i) })).concat([{ t: 'Передумал', fn: () => {} }]) });
  };
  G.runStunt = function (i) {
    const s = G.s, x = STUNTS[i];
    const fx = Object.assign({}, x[3]); if (x[0].indexOf('тараканов') >= 0) fx.money = G.ri(-150, 300);
    const sum = G.fx(fx);
    G.toast(x[4] + (sum ? ' (' + sum + ')' : ''));
    s.day.risky = x[0]; G.fx({ coll: 0 });
    const got = G.caught({ risk: x[1], fine: [150, 600], sev: x[2], what: x[0] });
    if (!got && G.binocularMaybe) G.binocularMaybe({ tag: 'risky' });
    G.spend(1);
  };

  // wrap weekly: кодирование
  const _w = G.extraWeekly;
  G.extraWeekly = function () {
    _w && _w();
    const s = G.s;
    if (s.flags.coded && G.week() >= s.flags.coded) { s.flags.coded = 0; if (G.chance(30)) { s.st.craving = 100; s.st.habit = C(s.st.habit + 20); G.modal({ title: 'СРЫВ', vib: 'error', text: 'Кодирование слетело. Ты «только понюхал». Через час — стол и друзья.', opts: [{ t: 'Эх…', fn: () => { G.fx({ drunk: 40, mood: -10, cons: -3 }); } }] }); } }
  };
})();
