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
  A('auto', { ph: ['work'], loc: 'shop', g: 'Работа и учёба', n: 'Автосмена (рутина)', i: '⏩', menu: true, noEvent: true, req: s => { const cap = G.CONFIG.AUTO_PER_WEEK, aw = s.flags.autoW && s.flags.autoW.w === G.week() ? s.flags.autoW.n : 0; return G.slotsLeft() < 2 ? 'Смена почти кончилась' : (s.instr.perv == null ? 'Нужен первичный инструктаж' : (cap > 0 && aw >= cap ? 'Лимит автосмен на неделю: ' + cap : null)); },
    fn: s => { G.modal({ title: 'Автосмена', text: 'Отработаешь остаток смены «на автомате»: усреднённый результат, повышенный риск, события пропускаются.', opts: [{ t: 'Поехали', fn: () => G.autoShift() }, { t: 'Отмена', fn: () => {} }] }); return 'custom'; } });
  A('check_dwg', { ph: ['work'], loc: 'shop', g: 'Работа и учёба', n: 'Проверить чертёж', i: '📐', h: 1, once: 'day',
    req: s => s.dwg.none ? 'Чертежа нет' : s.dwg.checked ? 'Уже проверен' : null,
    fn: s => { s.dwg.checked = true; const p = Math.min(95, 70 + s.st.know / 2); if (s.dwg.bad) { if (G.chance(p)) { s.dwg.fixed = true; G.fx({ know: 2, rel: { ekaterina: 1 } }); G.toast('Нашёл ошибку в чертеже и исправил! Качество +10.', 'good'); } else G.toast('Ничего не нашёл… (но чертёж кривой).', 'warn'); } else G.toast('Чертёж в порядке. Редкий случай.'); s.flags.ekDwg = (s.flags.ekDwg || 0) + 1; } });
  A('oil', { ph: ['work'], loc: 'shop', g: 'Работа и учёба', n: 'Смазать станок', i: '🛢️', h: 1, fx: { wear: -25, know: 2, energy: -3, neat: -3 }, txt: 'Станок скрипит, но дышит.' });
  A('study_ws', { ph: ['work'], loc: 'shop', g: 'Работа и учёба', n: 'Читать инструкции', i: '📖', h: 1, fx: { know: 6, energy: -3, mood: -1 }, txt: 'Прочитал инструкцию. Выяснил, что всё делал неправильно.' });
  A('help', { ph: ['work'], loc: 'shop', g: 'Коллеги и приколюхи', n: 'Помочь Серёге', i: '🤝', h: 1, fx: { coll: 4, energy: -5, rel: { seryoga: 3 }, cons: 1 }, txt: 'Подсобил напарнику. Неплохо.' });
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
  A('trud', { ph: ['work'], loc: 'admin', g: 'Заводоуправление', n: 'Жалоба в трудинспекцию', i: '📨', h: 1, noTrainee: true, req: s => s.flags.insp ? 'Жалоба уже подана' : null, fx: { cons: 3, boss: -3 }, txt: 'Жалоба подана. Ответ придёт через 2–3 недели.', fn: s => { s.flags.insp = s.t.day + G.ri(14, 21); } });
  A('courses_w', { ph: ['work'], loc: 'admin', g: 'Заводоуправление', n: 'Узнать про курсы', i: '🎓', menu: true, fn: () => { G.coursesMenu(); return 'custom'; } });
  A('smoke_yard', { ph: ['work'], loc: 'yard', g: 'Перерыв и здоровье', n: 'Перекур в курилке', i: '🚬', h: 1, lunch: true, cost: 20, fx: { mood: 4, energy: 3, health: -1, coll: 1 }, risk: 4, fine: [50, 150], what: 'Перекур', txt: 'Курилка. Все знают всё про всех.' });
  A('hole', { ph: ['work'], loc: 'yard', g: 'Крайности и криминал', n: 'Вынести через дыру в заборе', i: '🕳️', h: 1, menu: true, req: s => (s.flags.loot && s.flags.loot.length) ? null : 'Нечего выносить', fn: () => { G.carryOut('hole'); return 'custom'; } });
  A('yard_chat', { ph: ['work'], loc: 'yard', g: 'Коллеги и приколюхи', n: 'Потрепаться с мужиками', i: '🗣️', h: 1, lunch: true, fx: { coll: 3, mood: 3 }, risk: 6, fine: [50, 100], what: 'Разговоры в рабочее время', txt: 'Разговор про футбол и начальство.' });
  A('locker_nap', { ph: ['work'], loc: 'locker', g: 'Перерыв и здоровье', n: 'Прикорнуть на лавке', i: '😴', h: 1, lunch: true, fx: { energy: 10, mood: 1 }, risk: 20, fine: [100, 250], what: 'Сон в раздевалке', txt: 'Лавка жёсткая, но сон — сладкий.' });
  A('change', { ph: ['work'], loc: 'locker', g: 'Перерыв и здоровье', n: 'Переодеться в чистую спецовку', i: '🦺', h: 1, lunch: true, req: s => G.has('spare') ? null : 'Нет запасной спецовки (магазин)', fx: { neat: 35, mood: 1 }, txt: 'Чистая спецовка — как новая жизнь.', fn: s => { G.give('spare', -1); } });
  A('hide_loot', { ph: ['work'], loc: 'locker', g: 'Крайности и криминал', n: 'Спрятать добычу в шкафчик', i: '🔒', menu: true, req: s => (s.flags.loot && s.flags.loot.length) ? 'Уже спрятано' : 'Нечего прятать', txt: '' });
  A('rest_lunch', { ph: ['work'], loc: 'canteen', g: 'Перерыв и здоровье', n: 'Просто посидеть', i: '🪑', menu: false, lunch: true, fx: { mood: 3, energy: 4 }, txt: 'Посидел, отдышался.' });
  A('eat', { ph: ['work'], loc: 'canteen', g: 'Перерыв и здоровье', n: 'Взять обед', i: '🍲', lunch: true, menu: true, fn: () => { G.eatMenu(); return 'custom'; } });
  A('otk_chat', { ph: ['work'], loc: 'otk', g: 'Контроль качества', n: 'Сдать деталь на ОТК', i: '🔩', h: 1, fx: s => ({ rel: { ekaterina: s.dwg.bad && !s.dwg.fixed ? -2 : 2 }, boss: 1 }), txt: 'Екатерина Евгеньевна молча измеряет деталь.' });
  A('med_visit', { ph: ['work'], loc: 'med', g: 'Перерыв и здоровье', n: 'Посидеть в медпункте', i: '⚕️', h: 1, lunch: true, fx: { mood: 2, health: 2, energy: 3 }, txt: 'В медпункте тихо. И пахнет зелёнкой.' });

  // ===== УТРО / РАЗДЕВАЛКА =====
  A('coffee_m', { ph: ['morning'], loc: 'home', anywhere: true, g: 'Утро', n: 'Кофе по дороге (50 ₽)', i: '☕', cost: 50, menu: true, once: 'day', fx: { energy: 6, mask: 20 }, txt: 'Кофе из автомата у ворот.' });
  A('wash_m', { ph: ['morning'], loc: 'home', anywhere: true, g: 'Утро', n: 'Умыться и почистить зубы', i: '🪥', menu: true, once: 'day', req: s => s.flags.teethDay === s.t.day ? 'Сегодня уже чистил(а)' : null, fx: { neat: 10, mask: 15, mood: 1 }, txt: 'Прохладная вода и вкус мяты.', fn: s => { s.flags.teethDay = s.t.day; } });
  A('use_m', { ph: ['morning', 'locker'], loc: 'home', anywhere: true, g: 'Утро', n: 'Рюкзак: рассол, жвачка, лекарства', i: '🎒', menu: true, fn: () => { G.useMenu(); return 'custom'; } });
  A('sick_m', { ph: ['morning'], loc: 'home', anywhere: true, g: 'Утро', n: 'Купить больничный (2 000 ₽)', i: '🩹', menu: true, noTrainee: true, req: s => s.money < 2000 ? 'Нет денег' : null, fn: () => { G.buySick(); return 'custom'; } });
  A('stay_m', { ph: ['morning'], loc: 'home', anywhere: true, g: 'Утро', n: 'Не идти на работу (прогул)', i: '🛏️', menu: true, noEvent: true, fn: s => {
    G.modal({ title: s.car.sickUntil >= s.t.day ? 'Больничный / отпуск' : 'Прогул', text: s.car.sickUntil >= s.t.day ? 'Сегодня ты дома по законному основанию.' : 'Не выйти на работу — прогул. Штраф и выговор.', opts: [{ t: 'Остаться дома', fn: () => { if (s.car.sickUntil < s.t.day) { s.day.viol++; G.punish({ risk: 100, what: 'Прогул', fine: [500, 1500], sev: 1 }); } if (s.end) return; G.fx({ energy: 10, mood: 4 }); s.phase = 'evening'; s.t.hour = 17; s.day.skip = true; G.toast('Остался дома. Завод без тебя не развалился. Пока.'); } }, { t: 'Всё же пойду', fn: () => {} }] }); return 'custom'; } });
  A('prep_wed', { ph: ['locker'], loc: 'locker', g: 'Раздевалка', n: 'Подготовка к проверке (1 час)', i: '🧹', h: 1, req: s => G.weekday() !== 2 ? 'Только по средам' : s.day.prepped ? 'Уже подготовился' : null, fx: { neat: 12, mood: -1 }, txt: 'Прибрал рабочее место, проверил форму. Пусть проверяет.', fn: s => { s.day.prepped = true; s.t.hour = 8; s.phase = 'work'; s.loc = 'shop'; } });

  // ===== ДОМ (loc home) =====
  A('sleep', { ph: ['free'], loc: 'home', g: 'Дом', n: 'ЛЕЧЬ СПАТЬ', i: '🛌', menu: true, noEvent: true, fn: () => { G.sleep(); G.pump(); return 'custom'; } });
  S('rest', 'home', 'Дом', 'Отдохнуть дома (2 ч)', '🛋️', 2, { energy: 10, mood: 2 }, 'Лежишь, смотришь в потолок. Тихо.');
  S('cook', 'home', 'Дом', 'Сварить макароны', '🍝', 1, { satiety: 28, mood: 1, energy: -2 }, 'Макароны с кетчупом. Классика общаги.');
  S('teeth_h', 'home', 'Дом', 'Почистить зубы и умыться', '🪥', 0, { neat: 10, mask: 15, mood: 1 }, 'Прохладная вода и вкус мяты.', { menu: true, req: s => s.flags.teethDay === s.t.day ? 'Сегодня уже чистил(а)' : null, fn: s => { s.flags.teethDay = s.t.day; } });
  S('shower', 'home', 'Дом', 'Помыться и постирать', '🚿', 1, { neat: 45, mood: 2, tox: -2 }, 'Спецовка стирается, ты — тоже.', { fn: s => { s.flags.washDay = s.t.day; } });
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
  S('rest_eat', 'c_rest', 'Ресторан', 'Поужинать в ресторане (5 000 ₽)', '🍷', 3, { satiety: 45, mood: 20, money: -5000 }, 'Мясо, салат и скатерть. Живут же люди!', { req: s => s.money < 5000 ? 'Нет денег' : null });
  S('cafe_eat', 'c_cafe', 'Кафе', 'Посидеть в «Вкус очка» (1 000 ₽)', '🍔', 1, { satiety: 32, mood: 6, money: -1000 }, 'Бургер и картошка. Рядом кто-то из знакомых.', { req: s => s.money < 1000 ? 'Нет денег' : null });
  S('kino', 'c_kino', 'Кино', 'Сходить на фильм (350 ₽)', '🎬', 2, { mood: 13, energy: 2, money: -350 }, 'Фильм про богатых. Смешной.');
  S('gym_buy', 'c_gym', 'Спортзал', 'Абонемент на месяц (8 000 ₽)', '🎫', 0, {}, 'Абонемент оплачен до ' + '…', { menu: true, req: s => s.money < 8000 ? 'Нет денег' : null, fn: s => { G.addMoney(-8000); s.flags.gym = G.week() + 4; G.toast('Абонемент до недели №' + (s.flags.gym + 1) + '. Вика улыбается.'); G.relAdd('vika', 3); }, txt: '' });
  S('gym_train', 'c_gym', 'Спортзал', 'Тренировка (2 ч)', '🏋️', 2, {}, 'Железо — лучшее лекарство.', { menu: true, req: s => (s.flags.gym || -1) < G.week() ? 'Нужен абонемент' : null, fn: () => { G.gymGame(); return 'custom'; } });
  S('dk_chorus', 'c_dk', 'ДК «Металлург»', 'Хор ветеранов труда (чт)', '🎤', 2, { mood: 10, cool: -1, rel: { pelageya: 3 } }, 'Хор. Все фальшивят, но дружно.', { req: s => G.weekday() !== 3 ? 'Только по четвергам' : null });
  S('dk_dance', 'c_dk', 'ДК «Металлург»', 'Танцы (сб)', '💃', 3, { mood: 10, cool: 2, energy: -6, money: -100 }, 'Танцы до упаду.', { req: s => G.weekday() !== 5 ? 'Только по субботам' : null });
  S('dk_kvn', 'c_dk', 'ДК «Металлург»', 'КВН-кружок', '🎙️', 2, { mood: 8, cool: 3 }, 'Шутка про начальство — смех в зале.');
  S('ryum', 'c_ryum', 'Рюмочная', 'Выпить с мужиками (400 ₽)', '🍻', 2, { drunk: 30, mood: 10, coll: 4, craving: -20, money: -400 }, 'У Палыча наливают и слушают.', { req: s => s.money < 400 ? 'Нет денег' : null });
  S('tamada', 'c_ryum', 'Рюмочная', 'Тамада на юбилее (4 ч)', '🎉', 4, { money: 2500, drunk: 18, cool: 4, mood: 4, energy: -10 }, 'Ты вёл юбилей. В конце заплатили и налили.', { risk: 0 });
  S('market_sell', 'c_market', 'Барахолка', 'Продать краденое (60%)', '💰', 1, {}, '', { menu: true, req: s => (s.flags.loot && s.flags.loot.length) ? null : 'Нечего продавать', fn: s => { let v = 0; s.flags.loot.forEach(x => v += x.v); G.addMoney(Math.round(v * 0.6)); G.toast('Продал на барахолке за ' + G.rub(v * 0.6) + '. Продавцы не спрашивали откуда.'); s.flags.loot = []; G.fx({ cons: -2 }); }, txt: '' });
  S('market_buy', 'c_market', 'Барахолка', 'Купить дешёвую одежду (700 ₽)', '👕', 1, { neat: 10, mood: 2 }, 'Купил свитер. Пахнет чужой бабушкой.', { cost: 700, fn: s => { G.give('spare', 1); } });
  S('garage', 'c_garage', 'Гаражи', 'Посидеть с мужиками', '🔧', 2, { coll: 3, mood: 5, rel: { vityok: 2 } }, 'Чай, запчасти, разговор про всё.');
  S('bath', 'c_bath', 'Баня', 'Сходить в баню (500 ₽)', '♨️', 3, { health: 10, neat: 45, mood: 6, tox: -10, money: -500 }, 'Пар, веник, пиво. Жизнь удалась.', { req: s => s.money < 500 ? 'Нет денег' : null, fn: s => { s.flags.washDay = s.t.day; } });
  S('hosp', 'c_hosp', 'Больница', 'Подлечиться (1 500 ₽)', '💉', 2, { health: 15, tox: -10, money: -1500 }, 'Врач выписал таблетки и посмотрел с жалостью.', { req: s => s.money < 1500 ? 'Нет денег' : null });
  S('coding', 'c_hosp', 'Больница', 'Закодироваться (15 000 ₽)', '🚫', 4, { money: -15000, craving: -100, habit: -40, energy: -10 }, 'Тебя закодировали. Врач предупредил про срыв.', { req: s => s.money < 15000 ? 'Нет денег' : null, fn: s => { s.flags.coded = G.week() + G.ri(3, 6); } });
  S('bank', 'c_bank', 'Банк', 'Поговорить с менеджером', '🏦', 0, {}, '', { menu: true, fn: () => { G.bankMenu(); return 'custom'; } });
  S('lombard', 'c_lombard', 'Ломбард', 'Заложить вещь (40%)', '🦷', 0, {}, '', { menu: true, fn: () => { G.lombardMenu(); return 'custom'; } });
  S('mall', 'c_mall', 'ТЦ', 'Электроника и часы', '🛍️', 0, {}, '', { menu: true, fn: () => { G.statusMenu(['phone', 'watch', 'laptop', 'clothes'], 'ТЦ «Золотой Чугун»'); return 'custom'; } });
  S('autosalon', 'c_auto', 'Автосалон', 'Посмотреть машины', '🚗', 0, {}, '', { menu: true, fn: () => { G.statusMenu(['car'], 'Автосалон «Лада и К»'); return 'custom'; } });
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
    const lim = G.CONFIG.CANTEEN_LIMIT || 0, left = () => lim - (s.day.canteen || 0);
    const rec = () => G.modal({ title: 'Столовая', face: 'lyudka', wide: true, text: 'Деньги: <b>' + G.rub(s.money) + '</b> · Сытость: ' + Math.round(s.st.satiety) + (lim ? ' · Порций до конца дня: <b>' + Math.max(0, left()) + '</b>' : '') + '<br><i>Людка гремит черпаком.</i>', opts: D.MENU.map(m => ({ t: m.n + ' — ' + G.rub(m.p), dis: s.money < m.p ? 'Нет денег' : (lim && left() <= 0) ? 'Лимит порций на сегодня' : null, fn: () => { s.day.canteen = (s.day.canteen || 0) + 1; G.addMoney(-m.p); const f = {}; for (const k in m.fx) f[k] = m.fx[k] * (k === 'satiety' ? p : 1); G.fx(f); if (m.mask) s.mask += m.mask; if (m.fx.satiety >= 15) G.fx({ cure: 1 }); G.toast(m.n + ': ' + Object.keys(f).map(k => D.STAT_RU[k] + ' +' + Math.round(f[k])).join(', ')); if (G.R('tatyana').l >= 20 && G.chance(30)) { G.toast('В хлебе записка от Татьяны: «Приятного».', 'good'); G.relAdd('tatyana', 2); } rec(); } })).concat([{ t: 'Хватит', fn: () => G.spend(1) }]) });
    rec();
  };

  // ---------- Разговор с мастером (бывшее «Доложить мастеру»)
  const masterId = () => (D.NPC_ORDER || []).find(id => D.NPC[id] && /Степаныч/.test(D.NPC[id].name)) || null;
  G.masterTalk = function () {
    const s = G.s, mid = masterId(), f = s.flags;
    const mf = o => mid ? Object.assign({ face: mid }, o) : o;
    const rel = v => { if (mid) G.relAdd(mid, v); };
    const initN = () => { if (f.initWeek !== G.week()) { f.initWeek = G.week(); f.initN = 0; } return f.initN; };
    // «Инициатива наказуема»: шанс похвалы падает с каждой инициативой за неделю и с выговорами
    const initiative = o => {
      const n = initN();
      const p = C(o.base + s.st.know / 4 + s.st.boss / 8 - n * 14 - s.car.rep * 8, 10, 80);
      f.initN = n + 1;
      if (G.chance(p)) {
        f.initOk = (f.initOk || 0) + 1; rel(3);
        G.fx(Object.assign({ bm: 3 }, o.okFx)); if (o.onOk) o.onOk();
        G.toast(G.pick(o.ok), 'good'); if (G.boardAdd) G.boardAdd('Поощрён мастером за инициативу', 'good');
        G.spend(1);
      } else {
        f.initBad = (f.initBad || 0) + 1; rel(-3);
        G.fx(Object.assign({ bm: -1 }, o.badFx));
        G.toast(G.pick(o.bad), 'bad'); if (G.boardAdd) G.boardAdd('Проявил инициативу. Получил по инициативе', 'bad');
        if (s.st.boss < 30 && G.chance(15)) { G.fx({ rep: 1 }); G.toast('Мастер оформил это как самовольство. Выговор.', 'bad'); }
        G.spend(2);
      }
    };
    const work = () => G.modal(mf({ title: 'Рабочие моменты', text: 'Что предложишь мастеру? Инициатива — дело хорошее. Иногда даже хвалят. <small>(Чем чаще лезешь с идеями за неделю, тем меньше шанс на похвалу.)</small>', opts: [
      { t: '🔧 Улучшить станок', fn: () => initiative({ base: 40,
        okFx: { boss: 6, know: 2, mood: 2, coll: 1, wear: -12 },
        badFx: { boss: -4, mood: -5, energy: -8, coll: -1, wear: 2 },
        ok: ['Степаныч покрутил ручку, крякнул: «Ну… в целом толково». Станок стал бегать ровнее.', 'Мастер хлопнул по плечу: «Вот бы все так!» Станок работает тише.'],
        bad: ['Степаныч побагровел: «Тебе больше всех надо?» — и заставил перебирать узел вручную.', 'Предложение «улучшить» закончилось переделкой за тебя же. Мастер вздыхает громче станка.'] }) },
      { t: '📐 Предложить поправку по чертежам', fn: () => initiative({ base: 35,
        okFx: { boss: 5, know: 3, mood: 1 },
        badFx: { boss: -3, mood: -4, energy: -5 },
        onOk: () => { if (s.dwg.bad && !s.dwg.fixed) { s.dwg.fixed = true; G.toast('Мастер согласовал правку. Чертёж теперь читаемый.', 'good'); } },
        ok: ['Мастер посмотрел чертёж и неожиданно согласился. Редкий день.', '«Хм, и правда косяк. Молодец, что заметил», — буркнул Степаныч.'],
        bad: ['«Чертёж утверждал главный инженер. Ты что, умнее главного инженера?» — спросил мастер.', 'Мастер велел «не умничать» и дал лишних полчаса бумажной работы.'] }) },
      { t: '🦺 Пожаловаться на условия труда', fn: () => initiative({ base: 25,
        okFx: { coll: 5, mood: 3, cons: 2, boss: -1 },
        badFx: { boss: -7, mood: -4, coll: -1 },
        ok: ['Мастер что-то записал «для начальства». Коллеги за глаза благодарят.', 'Степаныч вздохнул: «Передам». Цех зауважал тебя тихо, но искренне.'],
        bad: ['«Жаловаться — это не по-нашему», — нахмурился Степаныч. Теперь ты на заметке.', 'Мастер молча посмотрел так, что захотелось уволиться самому.'] }) },
      { t: 'Передумал', fn: () => { G.spend(1); } }
    ] }));
    const chats = ['Степаныч полчаса рассказывал, как в девяносто пятом станок «сам работал».', 'Мастер пожаловался на начальство. Ты кивал в нужных местах.', 'Узнал, что премия «в этом квартале точно будет». Он говорит это каждый квартал.', 'Степаныч показал фото рассады. Рассада, надо признать, хорошая.'];
    G.modal(mf({ title: 'Мастер', text: 'Степаныч оторвался от журнала: «Чего тебе?»', opts: [
      { t: '🛠 Рабочие моменты: что улучшить', fn: work },
      { t: '☕ Просто поболтать', fn: () => { G.fx({ mood: 2, boss: G.chance(25) ? 1 : 0 }); rel(2); G.toast(G.pick(chats.concat(G.MASTER_CHATS || []))); G.spend(1); } },
      { t: '🐀 Доложить о коллеге (настучать)', fn: () => { G.fx({ boss: 5, coll: -8, cons: -6, snitch: 1 }); G.toast('Настучал Степанычу на коллегу. Мастер доволен.', 'warn'); if (G.chance(30)) G.addNick('stukach'); G.spend(1); } },
      { t: 'Ничего, я пойду', fn: () => {} }
    ] }));
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

  // ---------- v1.5: качалка-мини-игра, доска, Егорыч, подсказки (встроено, чтобы не зависеть от отдельного файла)
/* ===== Дополнения v1.5: качалка-мини-игра, доска почёта, Егорыч на проходной, подсказки =====
   Подключается ПОСЛЕ career.js, ui.js и data_absurd.js (в index.html). */
(function () {
  const G = (window.G = window.G || {});
  const D = G.D, C = G.clamp;
  const $ = id => document.getElementById(id);

  // ---------- Стили (вставляются сами)
  const css = document.createElement('style');
  css.textContent = `
.gym-ov{position:absolute;inset:0;z-index:70;background:#000c;display:flex;align-items:center;justify-content:center;padding:16px}
.gym-box{width:100%;max-width:420px;background:#1b1917;border:2px solid #000;border-top:4px solid var(--red,#c33);padding:16px;text-align:center;box-shadow:0 8px 30px #000}
.gym-box h3{margin:0 0 6px;font-family:var(--f-head,'Russo One',sans-serif);letter-spacing:1px}
.gym-info{font-size:14px;opacity:.85;margin-bottom:12px;min-height:34px}
.gym-track{position:relative;height:46px;background:#0d0c0b;border:2px solid #000;border-radius:4px;margin:6px 0 10px;overflow:hidden}
.gym-zone{position:absolute;top:0;bottom:0;background:#4fae4a99;border-left:2px solid #7fe07a;border-right:2px solid #7fe07a}
.gym-mark{position:absolute;top:-2px;bottom:-2px;width:8px;margin-left:-4px;background:#ffd24a;box-shadow:0 0 10px #ffd24a}
.gym-rep{font-family:var(--f-head,'Russo One',sans-serif);font-size:20px;min-height:28px;margin-bottom:8px}
.gym-rep.good{color:#7fe07a}.gym-rep.bad{color:#ff5a46}
.board-sec{margin:8px 0;text-align:left}.board-sec b{display:block;font-family:var(--f-head,'Russo One',sans-serif);margin-bottom:2px}
.board-sec div{font-size:14px;line-height:1.35;margin:2px 0}`;
  document.head.appendChild(css);

  // =====================================================================
  // 1. КАЧАЛКА: бегающий ползунок, 5 подходов. Точность тапа → сила.
  // =====================================================================
  const STR_RANKS = [[0, 'Ходячая зубочистка'], [15, 'Слабак с абонементом'], [30, 'Крепкий работяга'], [50, 'Гроза гантелей'], [70, 'Чугунный человек'], [90, 'Живой станок']];
  G.strRank = v => STR_RANKS.filter(r => v >= r[0]).pop()[1];

  G.gymGame = function () {
    const s = G.s, app = $('app'); if (!app || $('gym-ov')) return;
    const N = 5, scores = [];
    let rep = 0, pos = 0, dir = 1, speed = 0.9, zc = 0.5, zw = 0.26, last = 0, done = false, wait = false;
    const ov = document.createElement('div'); ov.id = 'gym-ov'; ov.className = 'gym-ov';
    ov.innerHTML = '<div class="gym-box"><h3>🏋️ ЖЕЛЕЗНЫЙ ФЕЛИКС</h3><div class="gym-info" id="gy-info"></div><div class="gym-track" id="gy-track"><div class="gym-zone" id="gy-zone"></div><div class="gym-mark" id="gy-mark"></div></div><div class="gym-rep" id="gy-rep">&nbsp;</div><button class="btn big hazard" id="gy-btn">ЖМИ!</button></div>';
    app.appendChild(ov);
    const setup = () => {
      zw = Math.max(0.08, 0.26 - rep * 0.04); zc = 0.2 + Math.random() * 0.6; speed = 0.9 + rep * 0.28; pos = Math.random() < 0.5 ? 0 : 1; dir = pos ? -1 : 1;
      const z = $('gy-zone'); z.style.left = ((zc - zw / 2) * 100) + '%'; z.style.width = (zw * 100) + '%';
      $('gy-info').innerHTML = 'Подход <b>' + (rep + 1) + '</b> из ' + N + '. Жми, когда жёлтая полоска в зелёной зоне.<br>Сила: <b>' + Math.round(s.flags.str || 0) + '</b> — ' + G.strRank(s.flags.str || 0);
    };
    const loop = t => {
      if (done) return; const dt = Math.min(0.05, ((t - (last || t)) / 1000)); last = t;
      if (!wait) { pos += dir * speed * dt; if (pos >= 1) { pos = 1; dir = -1; } else if (pos <= 0) { pos = 0; dir = 1; } }
      const m = $('gy-mark'); if (m) m.style.left = (pos * 100) + '%';
      requestAnimationFrame(loop);
    };
    const hit = () => {
      if (wait || done) return; wait = true;
      const d = Math.abs(pos - zc), half = zw / 2;
      const acc = d <= half ? 0.6 + 0.4 * (1 - d / half) : Math.max(0, 0.6 - (d - half) * 3);
      scores.push(acc);
      const r = $('gy-rep');
      r.className = 'gym-rep ' + (acc >= 0.6 ? 'good' : 'bad');
      r.textContent = acc >= 0.9 ? 'ИДЕАЛЬНО! 💪' : acc >= 0.6 ? 'Хорошо' : acc >= 0.3 ? 'Слабо…' : 'Мимо. Штанга упала.';
      G.vibe && G.vibe(acc >= 0.6 ? 'success' : 'error');
      rep++;
      setTimeout(() => { if (rep >= N) finish(); else { r.textContent = '\u00a0'; setup(); wait = false; } }, 650);
    };
    const finish = () => {
      done = true; ov.remove();
      const sum = scores.reduce((a, b) => a + b, 0), perfect = scores.filter(a => a >= 0.9).length, miss = scores.filter(a => a < 0.3).length;
      const old = s.flags.str || 0, gain = Math.round(sum * 3.6 * (1 - old / 140));
      s.flags.str = C(old + gain, 0, 100); s.flags.strDay = s.t.day;
      G.fx({ energy: -15, health: 1 + Math.round(sum), cool: sum >= 4 ? 2 : 1, mood: 2 + Math.round(sum), neat: -8 });
      let extra = '';
      if (miss >= 3) { G.fx({ health: -4 }); extra = '<br>Ты потянул спину. Феликс сочувственно качает головой.'; }
      if (perfect === N) s.flags.gymPerfect = (s.flags.gymPerfect || 0) + 1;
      if (perfect >= 4 && G.boardAdd) { G.boardAdd('Вырвал всё железо в «Железном Феликсе»', 'good'); if (G.rumor) G.rumor('gym', 'Слух: ты поднимаешь железо — станок №3 уважает.', { cool: 2 }, 50); }
      G.spend(2);
      G.info('Итоги тренировки', 'Точных подходов: <b>' + perfect + '</b> из ' + N + '. Сила: <b>' + Math.round(old) + ' → ' + Math.round(s.flags.str) + '</b> (' + G.strRank(s.flags.str) + ').' + extra + '<br><small>Сила даёт бодрость по утрам и растёт от качества тапов. Без тренировок понемногу уходит.</small>', () => {}, { face: 'vika' });
    };
    $('gy-btn').onclick = hit; $('gy-track').onclick = hit;
    setup(); requestAnimationFrame(loop);
  };

  // Сила: бодрость по утрам, детренировка
  const _dt = G.dailyTick;
  G.dailyTick = function () {
    const r = _dt.apply(this, arguments), s = G.s, str = s.flags.str || 0;
    if (s.flags.boardWeek !== G.week()) { s.flags.boardWeek = G.week(); if (s.car.shifts > 0) G.toast('📌 На доске в цехе вывесили новый выпуск', 'tip'); }
    if (str > 0) {
      if (s.flags.strDay !== undefined && s.t.day - s.flags.strDay > 6) s.flags.str = Math.max(0, str - 1);
      const b = Math.floor((s.flags.str || 0) / 15); if (b) s.st.energy = C(s.st.energy + b);
    }
    return r;
  };

  // =====================================================================
  // 2. ДОСКА («Цех» → «Доска»). Новый выпуск каждую неделю.
  // =====================================================================
  const STORIES = [
    ['Михалыч, сварщик', 'За тридцать лет сварил всё, что можно, и две вещи, которые нельзя. Одну из них нашли в соседнем цехе и узнали по шву. Коллектив гордится, прокуратура наблюдает.'],
    ['Дядя Лёша, охрана', 'Не пропустил на территорию ни одного постороннего. Все, кого он не пропустил, остались посторонними навсегда. Это называется стабильность.'],
    ['Людка, кухарка', 'Изобрела суп, который за обедом превращается в компот, а вечером обратно. Научного объяснения нет, зато есть очередь.'],
    ['Палыч, бригадир', 'Выловил в заводском пруду щуку, которая оказалась ревизором. Отпустил под честное слово. Премия — удочка, ревизор — в розыске.'],
    ['Лидия Н., крановщица', 'Вчера подняла груз в двенадцать тонн и справедливость. Груз опустила, справедливость пока висит под потолком.'],
    ['Тамара, уборщица', 'Двадцать лет моет один и тот же пол. Говорит, он с годами добрее. Пол подтверждает письменно.'],
    ['Гоша «Танк», начальник охраны', 'Задержал нарушителя, который оказался собственным отражением. Составил протокол в двух экземплярах. Отражение подписало оба.'],
    ['Витёк, наладчик', 'Починил станок, не сказав ни слова. Станок до сих пор молчит из благодарности и, возможно, из страха.'],
    ['Екатерина Е., ОТК', 'Забраковала план по выпуску продукции. План исправился и больше не повторяет ошибок.'],
    ['Станок №3', 'Работает без выходных, отпусков и жалоб. Единственный на заводе, кому не нужно объяснять, что такое смена.'],
    ['Кот Чугунок', 'Охраняет склад от мышей. Мыши подали встречную жалобу на склад. Дело рассматривается котом.'],
    ['Серёга, напарник', 'Рекордсмен по фразе «прикрой меня, я в туалете». Туалет подтвердил алиби, но попросил больше так не делать.'],
    ['Баба Нюра, общежитие', 'Вырастила кактус, который поёт по четвергам. Кактус обещает записать пластинку, если ему дадут горшок получше.'],
    ['Хомяк, кладовщик', 'Нашёл на складе недостающую гайку и теперь не отдаёт: «У неё всё хорошо, не надо её тревожить».']
  ];
  const NEWS = ['Завтра будет вчера. Просьба не опаздывать.', 'Потерян вторник. Нашедшему — благодарность в устной форме.', 'Курилка закрыта на перекур.', 'Объявлен конкурс на лучший конкурс. Участие обязательно.', 'Собрание профсоюза перенесено на то же время, но в другое место. Место не сообщаем.', 'Всем надеть тёплое. Зачем — выясним позже.', 'Станок №3 просит не называть его «железякой». Он слышит.', 'Из-за ремонта пола пол временно отсутствует.', 'Мастер Степаныч приглашает на чай. Чая нет, приглашение есть.', 'Нашлась пропавшая смена. Просит вернуть табель.', 'Просьба не кормить кота Чугунка. Он уже кормит нас.', 'В столовой дали компот. Вопросов к компоту нет.'];
  const SHAME = ['Некто опоздал на минуту и на всю жизнь', 'Кто-то пил из чужой кружки и вернул пустой', 'Сотрудник X ходил по цеху с лицом «я ничего не видел»', 'Неизвестный курил под табличкой «Не курить». Табличка обиделась и закурила'];
  const QUAL = [
    { k: 'good', c: s => s.st.boss >= 65, h: 'Любимчик начальства', t: 'Начальство отметило сотрудника, о котором мало знает, но «вроде хороший».' },
    { k: 'good', c: s => s.st.coll >= 60, h: 'Душа коллектива', t: 'Утверждён неформальным лидером курилки. Подписано: курилка.' },
    { k: 'good', c: s => s.st.neat >= 85, h: 'Образец опрятности', t: 'Единственный, чья спецовка не имеет собственного запаха. Предлагается занести в красную книгу.' },
    { k: 'good', c: s => (s.flags.str || 0) >= 35, h: 'Силач цеха', t: 'Станок №3 просит не пожимать ему руку так сильно. Станок пока цел.' },
    { k: 'good', c: s => (s.flags.initOk || 0) >= 2, h: 'Рационализатор', t: 'Предложил улучшить станок. Станок выразил осторожное согласие.' },
    { k: 'good', c: s => s.car.shifts >= 100, h: 'Ветеран цеха', t: 'Сто смен без единой пропущенной. По крайней мере, ни одну не нашли.' },
    { k: 'good', c: s => s.car.shifts >= 30 && s.car.shifts < 100, h: 'Стаж пошёл', t: 'Тридцать смен — это уже не новичок, а подозрительно привычный человек.' },
    { k: 'good', c: s => s.st.cons >= 70, h: 'Человек с чистой совестью', t: 'Совесть проверена и допущена к станку без ограничений.' },
    { k: 'bad', c: s => s.car.snitch >= 3, h: 'Стукач месяца', t: 'Знает всё, рассказывает всё. Приглашений на чай стало ровно ноль.' },
    { k: 'bad', c: s => s.st.drunk >= 30, h: 'Весёлый сотрудник', t: 'Замечен в приподнятом состоянии. Состояние выглядело счастливее хозяина.' },
    { k: 'bad', c: s => s.st.neat < 25, h: 'Условно опрятный', t: 'Опрятность отмечена как «условная». Спецовка — как «условно спецовка».' },
    { k: 'bad', c: s => s.money >= 150000, h: 'Подозрительно состоятельный', t: 'Источники дохода уточняются. Просьба их не уточнять.' }
  ];
  G.boardAdd = function (text, kind) {
    const f = G.s.flags; f.board = f.board || [];
    f.board.unshift({ w: G.week(), t: text, k: kind || 'good' }); if (f.board.length > 14) f.board.length = 14;
  };
  G.honorBoard = function () {
    const s = G.s, wk = G.week(), H = n => G.hash(wk, n, 7), pick = (a, n) => a[Math.floor(H(n) * a.length)];
    const q = QUAL.filter(x => { try { return x.c(s); } catch (e) { return false; } });
    const good = q.filter(x => x.k === 'good'), shame = q.filter(x => x.k === 'bad');
    const log = s.flags.board || [], logGood = log.filter(e => e.k === 'good').slice(0, 3), logBad = log.filter(e => e.k === 'bad').slice(0, 3);
    let star;
    if (good.length && H(1) < 0.6) { const g = good[Math.floor(H(2) * good.length)]; star = '<div><b style="color:#ffd24a">⭐ Это ты! ' + g.h + '</b></div><div>' + g.t + '</div>'; }
    else { const st = pick(STORIES, 3); star = '<div><b>' + st[0] + '</b></div><div>' + st[1] + '</div>'; }
    let li = Math.floor(G.hash(Math.floor(wk / 4), 11, 7) * STORIES.length);
    if (STORIES[li][1] === (star.indexOf('Это ты') < 0 ? pick(STORIES, 3)[1] : '')) li = (li + 1) % STORIES.length;
    const leg = STORIES[li];
    const mine = good.map(g => '• ' + g.h).concat(logGood.map(e => '• ' + e.t));
    const bad = shame.map(g => '• ' + g.h + ': ' + g.t).concat(logBad.map(e => '• ' + e.t));
    if (!bad.length) bad.push('• ' + pick(SHAME, 5));
    const news = [pick(NEWS, 2), pick(NEWS, 4), pick(NEWS, 6)].filter((v, i, a) => a.indexOf(v) === i);
    const html = '<div class="board-sec" style="opacity:.7">Выпуск №' + (wk + 1) + ' · обновляется каждую неделю</div>'
      + '<div class="board-sec"><b>🏆 Сотрудник недели</b>' + star + '</div>'
      + '<div class="board-sec"><b>📜 Легенда месяца: ' + leg[0] + '</b><div>' + leg[1] + '</div></div>'
      + '<div class="board-sec"><b>⭐ Твои заслуги</b>' + (mine.length ? mine.map(m => '<div>' + m + '</div>').join('') : '<div>Тебя тут пока нет. Но место в рамке для тебя уже забронировано.</div>') + '</div>'
      + '<div class="board-sec"><b>🗣 Цеховые слухи</b>' + ((s.flags.rumors || []).slice(0, 3).map(r => '<div>• ' + r.t + '</div>').join('') || '<div>• Слухов пока нет. Это само по себе подозрительно.</div>') + '</div>'
      + '<div class="board-sec"><b>📢 Объявления</b>' + news.map(n => '<div>• ' + n + '</div>').join('') + '</div>'
      + '<div class="board-sec"><b>🪧 Доска позора</b>' + bad.slice(0, 4).map(n => '<div>' + n + '</div>').join('') + '</div>';
    G.modal({ title: '📌 Доска завода', text: html, wide: true, opts: [{ t: 'Закрыть', fn: () => {} }] });
  };
  // Хук: слухи о нечистоплотности попадают на доску
  const _hc = G.hygieneCheck;
  if (_hc) G.hygieneCheck = function () { const r = _hc.apply(this, arguments); if ((G.s.flags.washMiss || 0) === 2) G.boardAdd('Сотрудника давно не видели в душе. Но чувствуют', 'bad'); return r; };

  // =====================================================================
  // 3. ЕГОРЫЧ НА ПРОХОДНОЙ
  // =====================================================================
  D.NPC.egorych = {
    name: 'Егорыч', full: 'Егорыч (вахтёр)', age: 61, role: 'Вахтёр на проходной', color: '#8a7',
    ap: { skin: '#d8a88c', shape: 'round', hair: 'bald', hc: '#999', brow: 'thick', eyes: 'tired', nose: 'red', mouth: 'flat', stache: 'brush', glasses: 'none', hat: 'cap', cloth: '#3a4a3a', collar: 'none', extra: ['flush'] },
    at: null, likes: ['vodka', 'cigs', 'beer', 'cognac'], dislikes: ['milk'], rel: 0, talk: []
  };
  const say = (text, opts) => G.modal({ title: 'Егорыч', face: 'egorych', text, opts });
  const GATE_LIKES = ['vodka', 'cigs', 'beer', 'cognac', 'env1'];

  G.gate = function () {
    const s = G.s, st = s.st, rel = () => G.R('egorych').l;
    const pass = () => { s.day.gate = 1; G.gatePass(); };
    const probs = [];
    if (s.flags.egSecret && st.drunk < 40 && G.chance(65)) { G.toast('Егорыч подмигивает: «Проходи, свой. Секретный пропуск при тебе».', 'good'); return pass(); }
    const wd = G.weekday(), DR = wd === 4 ? 35 : 20, NE = wd === 0 ? 45 : 35, hol = G.holiday && G.holiday();
    if (hol) probs.push('«Сегодня ' + hol + '! Без гостинца не пущу. Традиция, понимаешь?»');
    if (st.drunk >= DR) probs.push('«Ты пьяный! Я пьяных не пускаю — у меня на пьяных аллергия. На свою».');
    else if ((s.smell || 0) - (s.mask || 0) >= 25) probs.push('«Дыхни. Ох… Нет. С таким выхлопом на территорию — только в противогазе».');
    if (s.hang > 0) probs.push('«Рожа зелёная, глаза красные. С бодуна? Иди домой, лечись!»');
    if (st.neat < NE) probs.push('«В таком виде? Ты форму стирал вообще? Иди помойся, чучело».');
    if (!probs.length) return clean();
    let tried = 0;
    const out = (type) => {
      const o = [];
      o.push({ t: '🎁 Подарить подарок', fn: () => gift() });
      if (!tried) o.push({ t: '🗣 Уговорить («Егорыч, ну как человек человека…»)', fn: () => persuade() });
      if (rel() >= 40) o.push({ t: '🤝 «Егорыч, по-дружески…»', fn: () => { G.relAdd('egorych', -8); G.toast('Егорыч вздыхает: «Последний раз. Я всё записал в голове».'); G.boardAdd('Егорыч «не заметил» чей-то вид на проходной', 'bad'); pass(); } });
      o.push({ t: '🧗 Через забор', fn: () => fence() });
      o.push({ t: '🏠 Вернуться и привести себя в порядок', fn: () => { G.toast('Егорыч: «Иди-иди. Вернёшься человеком — поговорим».'); } });
      return o;
    };
    const menu = intro => say((intro || ['«Понедельник! Все приползли. Пропуск!»', '«Вторник. Пропуск, голубчик».', '«Среда — день Надежды Николаевны. Пропуск!»', '«Четверг. Смена на исходе. Пропуск».', '«Пятница, душа поёт! Пропуск, голубчик».'][G.weekday()] || '«Стоять! Пропуск!»') + '<br>' + probs.join('<br>') + '<br><i>«Не пущу. И не проси».</i>', out());
    const gift = () => {
      const ids = Object.keys(s.inv).filter(k => D.ITEMS[k] && (D.ITEMS[k].gift || D.ITEMS[k].bribe));
      if (!ids.length) { G.toast('В рюкзаке ничего подходящего. Егорыч смотрит с презрением.', 'bad'); return menu('«Руки пустые — и разговор пустой».'); }
      G.modal({ title: 'Подарок Егорычу', face: 'egorych', wide: true, opts: ids.map(k => ({ t: D.ITEMS[k].e + ' ' + D.ITEMS[k].n + ' ×' + s.inv[k], fn: () => {
        const it = D.ITEMS[k], liked = GATE_LIKES.indexOf(k) >= 0, v = (it.gift || 3) * (liked ? 2 : 1);
        G.give(k, -1);
        if (v >= 4) {
          G.relAdd('egorych', liked ? 8 : 3); if (it.bribe) G.fx({ cons: -2 });
          const lines = { vodka: 'Он мгновенно спрятал бутылку в недра будки. «Проходи. Я тебя не видел. И бутылку не видел».', cigs: 'Он понюхал пачку, как сомелье. «Годится. Проходи, пока я добрый».', beer: 'Он открыл пивом рот и сам себя поздравил. «Проходи».', cognac: 'Егорыч прослезился: «Три звезды… как в молодости. Проходи, сынок».', env1: '«Это что, пропуск? Хороший пропуск». Он тут же забыл твою рожу.' };
          G.toast(lines[k] || 'Егорыч принял подарок и сделал вид, что слепой. «Проходи».', 'good');
          s.flags.egGifts = (s.flags.egGifts || 0) + 1; G.boardAdd('Егорыч ценит гостинцы. Это не коррупция, а традиция', 'bad'); pass();
        } else { G.toast('Егорыч повертел подарок: «Это что, шутка?» Мало.', 'bad'); menu('«Не-не. Это мне не нужно».'); }
      } })).concat([{ t: 'Передумал', fn: () => menu() }]) });
    };
    const persuade = () => {
      tried = 1;
      const p = C(25 + rel() / 2 + st.cool / 4 - probs.length * 12, 5, 70);
      if (G.chance(p)) { G.fx({ mood: 2 }); G.relAdd('egorych', 2); G.toast('Егорыч сдался: «Ладно, красноречивый. Но — на твоей совести».', 'good'); pass(); }
      else { G.fx({ boss: -2, mood: -3 }); G.relAdd('egorych', -3); menu('«Разговорчики!» — Егорыч ударяет по столу журналом.'); }
    };
    const fence = () => {
      if (G.chance(45)) { G.fx({ cool: 3, mood: 2 }); G.toast('Перелез через забор. Егорыч в будке смотрит в другую сторону. Принципиально.', 'good'); if (G.rumor) G.rumor('fence', 'Говорят, ты перелез через забор на проходной. Егорыч это отрицает.', { cool: 3, boss: -1 }, 70); pass(); }
      else {
        G.fx({ boss: -4, mood: -4 }); G.punish({ risk: 100, what: 'Лез через забор на территорию', fine: [100, 300], sev: 1 });
        G.boardAdd('Некто застрял в заборе. Забор утверждает, что сам пострадал', 'bad'); G.toast('Застрял в заборе. Егорыч с наслаждением вызвал охрану.', 'bad'); pass();
      }
    };
    menu();
  };

  function clean() {
    const s = G.s, mood = G.chance(40);
    const Q = [
      ['«Пропуск! Кто тебя пустил вчера?»', [['Вы, Егорыч', '«Правильно. Помню, как же».', { rel: { egorych: 3 } }], ['Никто, я сам', '«Сам!.. У нас самому ходить не положено». Но пропустил.', { rel: { egorych: -1 }, mood: -1 }], ['Дядя Лёша', '«Лёша?! Он у меня ещё ответит». Егорыч обиделся за всех.', { rel: { egorych: -3, lyosha: -2 } }]]],
      ['«Ноги вытер? Я спрашиваю — ноги!»', [['Вытер', '«Врёшь. Но проходи».', {}], ['Нет, вытру', 'Ты вытер ноги так тщательно, что Егорыч прослезился.', { energy: -1, rel: { egorych: 2 } }], ['У меня нет ног', '«Нет ног — нет пропуска. Ладно, проходи, калека».', { cool: 2, rel: { egorych: 2 } }]]],
      ['«Пропуск покажи. Нет, не этот. Другой».', [['Показать этот же', 'Он посмотрел на него дольше, чем надо. «Другой же, а!» — и пропустил.', { mood: -1 }], ['Показать читательский билет', '«Библиотека — это хорошо». Пропустил, не читая.', { cool: 1, rel: { egorych: 2 } }], ['Показать язык', 'Егорыч торжественно показал свой в ответ. Вы квиты.', { mood: 3, rel: { egorych: 4 } }]]],
      ['«Знаешь, сколько в этой проходной ступенек? Нет? И я нет. Каждый день считаю».', [['Помочь считать', 'Вы посчитали вместе: получилось семь. Или девять. Он счастлив.', { mood: 2, rel: { egorych: 4 } }], ['Промолчать', 'Егорыч вздыхает: «Никто не поможет в таком деле».', { rel: { egorych: -1 } }], ['Заняться своим делом', '«Ага, ага. Своим». Пропустил.', {}]]]
    ];
    const q = G.pick(Q);
    const opts = q[1].map(o => ({ t: o[0], fn: () => { const sum = G.fx(o[2]); G.toast(o[1] + (sum ? ' (' + sum + ')' : '')); pass(); } }));
    opts.push({ t: '💬 Поболтать с Егорычем', fn: () => chat() });
    opts.push({ t: 'Молча пройти', fn: () => { if (mood) { G.fx({ mood: -1 }); G.relAdd('egorych', -1); G.toast('Егорыч в спину: «Здороваться надо, молодёжь!»'); } pass(); } });
    if (G.R('egorych').l >= 60 && !s.flags.egSecret) opts.unshift({ t: '🤫 «Егорыч, а есть что-нибудь для своих?»', fn: () => { s.flags.egSecret = 1; G.toast('Егорыч достал из-под стола картонку: «Секретный пропуск. Никому!»', 'good'); if (G.boardAdd) G.boardAdd('Обладатель секретного пропуска Егорыча', 'good'); pass(); } });
    say(q[0], opts);

    function pass() { s.day.gate = 1; G.gatePass(); }
    function chat() {
      say('Егорыч откладывает кроссворд: «Ну, спрашивай, раз пришёл».', [
        { t: 'Что вчера было на проходной?', fn: () => { G.fx({ mood: 2 }); G.relAdd('egorych', 2); G.toast('Вчера по территории прошла процессия гусей. Все с пропусками. А ты вот без. Шутка. Проходи.'); pass(); } },
        { t: 'Что слышно про директора?', fn: () => {
          const r = G.R('egorych').l;
          if (r >= 10 && G.chance(50)) { s.world.binocSafe = G.week(); G.relAdd('egorych', 1); G.toast('Егорыч шёпотом: «Директор на совещании всю неделю. Бинокль в сейфе». Сегодня спокойнее.', 'good'); }
          else { G.toast('«Что слышно… Слышно, как он бинокль протирает».'); }
          pass();
        } },
        { t: 'Партию в домино?', fn: () => { G.fx({ mood: 3, energy: -2 }); G.relAdd('egorych', 5); G.toast('Проиграл в домино, но Егорыч в хорошем настроении. Он теперь «добрый».'); pass(); } },
        { t: 'Пойду я', fn: () => pass() }
      ]);
    }
  }
  G.gatePass = function () { if (G._gateNext) { const f = G._gateNext; G._gateNext = null; f(); } };

  // Подключение к кнопке «ИДТИ НА РАБОТУ» (после загрузки всех скриптов)
  const wrapGate = () => {
    if (G._gateWrapped || !G.career || !G.career.goToWork) return;
    G._gateWrapped = true;
    const orig = G.career.goToWork.bind(G.career);
    G.career.goToWork = function () {
      const s = G.s;
      if (!s || !s.day || s.day.gate || s.car.sickUntil >= s.t.day) return orig();
      G._gateNext = () => orig();
      G.gate();
    };
  };
  wrapGate(); window.addEventListener('load', wrapGate); setTimeout(wrapGate, 0);

  // =====================================================================
  // 4. ПОДСКАЗКИ (используют существующую систему советов)
  // =====================================================================
  [
    { id: 't_gym', text: 'В «Железном Феликсе» жми точно в зелёную зону: чем точнее тапы, тем больше сила (даёт бодрость по утрам).', c: s => !s.flags.str && s.car.shifts > 5 },
    { id: 't_board', text: 'Внизу вкладки «Цех» есть кнопка «Доска»: там истории заводчан и абсурд недели. Старайся, чтобы там упоминали тебя.', c: s => s.car.shifts > 2 },
    { id: 't_gate', text: 'Егорыч на проходной не пустит пьяного, с бодуна или в грязной форме. Подарок или сообразительность спасут.', c: s => s.car.shifts < 15 },
    { id: 't_master', text: 'У мастера можно предложить инициативу. Помни: инициатива наказуема — особенно если лезешь с идеями каждый день.', c: s => s.car.shifts > 4 },
    { id: 't_hyg', text: 'Зубы чистить каждый день, мыться не реже раза в два дня — иначе упадёт опрятность, настроение и отношения.', c: s => s.st.neat < 60 },
    { id: 't_canteen', text: 'В столовой завода лимит порций на день. Не налетай на добавку с первого раза.', c: s => s.car.shifts > 3 },
    { id: 't_fx', text: 'Цифры над экраном показывают, как действие влияет на шкалы: красные плохие, зелёные хорошие.', c: s => s.car.shifts < 6 }
  ].forEach(t => { if (!D.TIPS.some(x => x.id === t.id)) D.TIPS.push(t); });
})();

  // Кнопка «Доска» — самая нижняя в «Цехе» (после «Отчибучить»)
  A('board', { ph: ['work'], loc: 'shop', g: 'Доска', n: 'Доска', i: '📌', menu: true, fn: () => { G.honorBoard(); return 'custom'; } });

  // ======================= v1.6: начальник цеха, мастер, Афоня, Серёга, драки, сила =======================
  (function () {
    const D = G.D, C = G.clamp, app = () => document.getElementById('app');
    const sp = () => G.spend(1);
    const msg = (t, c) => G.toast(t, c);
    const loy = () => (G.s.flags.chiefLoy || 0);
    const setLoy = v => { G.s.flags.chiefLoy = C(loy() + v, 0, 100); };

    // ---------- Новые персонажи
    const AT = (loc, p, alt) => ({ loc, alt, days: [0, 1, 2, 3, 4], p });
    const NP = {
      shchiplen: { name: 'Щиплен', full: 'Щиплен Ермолай Дробеструевич', age: 50, role: 'Начальник цеха', color: '#c88',
        ap: { skin: '#d9a387', shape: 'round', hair: 'bald', hc: '#777', brow: 'thick', eyes: 'small', nose: 'red', mouth: 'flat', stache: 'brush', glasses: 'none', cloth: '#2d3a4f', collar: 'none', extra: ['flush'] },
        at: AT('shop', 1), likes: ['cognac', 'vodka', 'beer', 'cigs'], dislikes: ['milk'], rel: 0,
        talk: [
          { t: 'Щиплен, не поднимая глаз от бумаг: «Ну? Чего встал? Работай, пока я добрый. Я сегодня почти добрый».', o: [['Слушаюсь, Ермолай Дробеструевич!', '«То-то. Видишь, можешь, когда захочешь».', { boss: 3, rel: { shchiplen: 3 } }], ['Ага', '«Что значит «ага»? Служебную писульку захотел?»', { boss: -3, rel: { shchiplen: -3 } }], ['Вы сегодня необыкновенно добры', 'Он подозрительно смотрит, но гордится.', { boss: 2, rel: { shchiplen: 4 } }]] },
          { t: 'Щиплен убирает бутылку в ящик: «Это лекарство. От вас всех».', o: [['Здоровья вам, Ермолай Дробеструевич', 'Он тронут. Почти.', { rel: { shchiplen: 4 }, boss: 1 }], ['Может, и мне капельку?', '«Капельку?! Служебную записку тебе капельку!»', { boss: -4, rel: { shchiplen: -4 } }]] },
          { t: '«Брак у тебя как у слепого кузнеца. Ты вообще на чьей стороне, дылда?»', o: [['На вашей, Ермолай Дробеструевич', '«Не верю. Но запишу».', { boss: 1 }], ['Станок такой', '«Станок у него виноват! Станок!»', { boss: -3 }]] }
        ] },
      dudukin: { name: 'Дудукин', full: 'Дудукин Афанасий Пукевич', age: 35, role: 'Мастер', color: '#7bd',
        ap: { skin: '#e8c3a6', shape: 'oval', hair: 'bangs', hc: '#5a4632', brow: 'light', eyes: 'norm', nose: 'small', mouth: 'smile', glasses: 'none', cloth: '#2f4a6a', collar: 'none', extra: [] },
        at: AT('shop', 0.85), likes: ['cigs', 'choco', 'env1'], dislikes: [], rel: 0,
        talk: [
          { t: 'Дудукин вытирает руки ветошью: «У третьего станка подшипник поёт, слышишь? Так не должно. Записал, разберусь».', o: [['Спасибо, что следите', '«Это моя работа. Но спасибо приятно».', { boss: 2, know: 1, rel: { dudukin: 4 } }], ['Это я подпевал', '«Тогда у вас дуэт. Но подшипник всё равно заменим».', { mood: 3, rel: { dudukin: 3 } }]] },
          { t: '«Слушай, если видишь, что что-то не так, — говори сразу. Лучше десять раз зря, чем один раз поздно».', o: [['Обязательно скажу', '«Вот, золотые слова. Мало кто понимает».', { boss: 2, rel: { dudukin: 5 } }], ['А если я ошибусь?', '«Ошибаются все. Не ошибается тот, кто сидит в курилке».', { know: 1, rel: { dudukin: 3 } }]] },
          { t: 'Дудукин показывает на чертёж: «Видишь допуск? Он не бумажный. Он железный. Запомни».', o: [['Запомнил', '«Хорошо. Знания не пропьёшь. Хотя некоторые пытаются».', { know: 2, rel: { dudukin: 3 } }]] },
          { t: '«Начальник цеха — человек сложный. С ним главное: вежливо и вовремя. Подарок — по возможности».', o: [['Учту', '«Ты быстро учишься».', { boss: 1, rel: { dudukin: 3 } }], ['А вы ему дарите?', '«Я ему результат дарю. Он этого не ценит, но результат есть».', { rel: { dudukin: 4 } }]] }
        ] },
      afonya: { name: 'Афоня', full: 'Афоня (слесарь-сантехник)', age: 40, role: 'Слесарь, душа компании', color: '#e96',
        ap: { skin: '#e3b693', shape: 'long', hair: 'bangs', hc: '#6a5a4a', brow: 'thick', eyes: 'tired', nose: 'red', mouth: 'smile', glasses: 'none', cloth: '#4a5f7a', collar: 'none', extra: ['flush', 'oil'] },
        at: AT('yard', 0.85, ['shop']), likes: ['beer', 'vodka', 'cigs'], dislikes: [], rel: 3, reliab: 20,
        talk: [
          { t: 'Афоня сидит на перевёрнутом ведре с гитарой, на которой не хватает двух струн: «Слушай, я придумал песню. Пока только припев. Он про кран».', o: [['Спой', 'Он спел. Кран, по его версии, был предателем. Ты почти заплакал.', { mood: 3, rel: { afonya: 5 } }], ['Лучше про станок', '«Про станок не могу. Он рядом, обидится».', { rel: { afonya: 2 } }]] },
          { t: '«Я вчера починил соседям батарею. Теперь у них холодно, зато стабильно».', o: [['Мастер!', '«Не мастер, а творческая личность».', { rel: { afonya: 4 }, mood: 2 }], ['Может, я посмотрю?', '«Не надо. Она мне уже доверяет».', { rel: { afonya: 2 } }]] },
          { t: 'Афоня докуривает, щурясь на солнце: «Знаешь, чем я отличаюсь от остальных? Я не пью. Я дегустирую».', o: [['Это сильно', '«Спасибо. Мне тоже кажется».', { rel: { afonya: 5 }, mood: 2 }], ['А завтра?', '«Завтра — тоже дегустация, только расширенная».', { rel: { afonya: 3 }, mood: 3 }]] },
          { t: '«Хочу уехать на юг. Но у меня права на лодку, а лодки нет. Значит, надо ехать на юг без лодки».', o: [['Поддержать план', '«Вот. Единственный, кто меня понимает».', { rel: { afonya: 6 }, mood: 3 }], ['Отговорить', '«Хм. Тоже вариант. Но юг я не отменю».', { rel: { afonya: 1 } }]] },
          { t: 'Афоня что-то мастерит из проволоки и ложки: «Это велосипед. Пока без колёс, но душа в нём уже есть».', o: [['Прокатиться', 'Ты прокатился в воображении. Было ухабисто.', { mood: 4, rel: { afonya: 5 } }], ['Сомневаться', '«Сомнения — это для тех, у кого есть колёса».', { rel: { afonya: 2 } }]] },
          { t: '«Я вчера с мастером поспорил: сколько в этой гайке резьбы. Проиграл. Теперь должен ему вечер без гитары».', o: [['Сочувствовать', 'Афоня впервые за день замолчал. Минуты на три.', { mood: 2, rel: { afonya: 4 } }], ['Предложить сыграть', '«Я бы сыграл, но гитара обиделась и ушла».', { mood: 3, rel: { afonya: 3 } }]] }
        ] }
    };
    Object.keys(NP).forEach(id => { if (!D.NPC[id]) D.NPC[id] = NP[id]; if (D.NPC_ORDER && D.NPC_ORDER.indexOf(id) < 0) D.NPC_ORDER.push(id); });

    // ---------- Подарки: общий выбор из рюкзака
    const GIFT_VAL = { vodka: 30, cognac: 40, beer: 12, cigs: 10, env1: 25, choco: 12 };
    const giftPick = (title, face, done) => {
      const s = G.s, ids = Object.keys(s.inv).filter(k => D.ITEMS[k] && (D.ITEMS[k].gift || D.ITEMS[k].bribe));
      if (!ids.length) { msg('В рюкзаке нечего подарить.', 'bad'); return false; }
      G.modal({ title, face, wide: true, opts: ids.map(k => ({ t: D.ITEMS[k].e + ' ' + D.ITEMS[k].n + ' ×' + s.inv[k], fn: () => { G.give(k, -1); done(k, GIFT_VAL[k] || 5); } })).concat([{ t: 'Передумал', fn: () => {} }]) });
      return true;
    };
    // ---------- Новая стукаческая база: каждый раз новые поводы
    const STUK = [
      ['Серёга сидит в курилке уже сорок минут «в туалете»', 'seryoga', 'Серёга теперь знает, чья это работа. Туалет — тоже.'],
      ['Витёк чинит станок кувалдой и интуицией', 'vityok', 'Витёк лишился кувалды и душевного равновесия.'],
      ['Михалыч варит в наушниках и подпевает швам', 'mikhalych', 'Швы теперь молчат из солидарности.'],
      ['Афоня подключил к сети личный кипятильник на 5 киловатт', 'afonya', 'Афоня клянётся, что это «мини-самовар для коллектива».'],
      ['Хомяк выдал себе спецовку на двоих', 'khomyak', 'Хомяк проверяет склад и подозрительно смотрит на тебя.'],
      ['Палыч ловит рыбу в заводском пруду в рабочее время', 'palych', 'Рыбалка отменена. Щука в шоке.'],
      ['Людка кладёт лишнюю картошку в борщ — себе', 'lyudka', 'Борщ стал гуще, а Людка — злее.'],
      ['Гоша «Танк» храпит на посту в рацию', 'gosha', 'Рация записала храп. Запись теперь в деле.'],
      ['Лидия на кране катает голубя', 'lidiya', 'Голубь выступил свидетелем и отказался от показаний.'],
      ['Колян принёс алкоголь в грелке', 'kolyan', 'Грелку конфисковали. Колян вылез из-за стола бледный.'],
      ['Тамара уносит домой моющее средство вёдрами', 'tamara', 'Тамара теперь моет пол только на виду.'],
      ['Ебланов рисует чертежи по ночам во сне', 'eblanov', 'Ебланов проснулся и нарисовал жалобу на тебя.'],
      ['Нюра выращивает кактус на казённом подоконнике', 'nyura', 'Кактус обиделся и не поёт.'],
      ['Рафик возит на директорской машине арбузы', 'rafik', 'Арбузы тоже конфискованы. Вкус отнят у народа.']
    ];
    G.stukach = function (whom) {
      const s = G.s, f = s.flags, face = whom === 'chief' ? 'shchiplen' : 'dudukin';
      f.stukUsed = f.stukUsed || [];
      let pool = STUK.map((x, i) => i).filter(i => f.stukUsed.indexOf(i) < 0);
      if (pool.length < 3) { f.stukUsed = []; pool = STUK.map((x, i) => i); }
      const picks = pool.sort(() => Math.random() - 0.5).slice(0, 3);
      G.modal({ title: whom === 'chief' ? 'Донос' : 'Сообщить о коллеге', face, text: 'О чём доложишь?', opts: picks.map(i => ({ t: STUK[i][0], fn: () => {
        f.stukUsed.push(i); const [, vic, resp] = STUK[i];
        const chief = whom === 'chief', soft = !chief && G.chance(35);
        G.fx({ boss: chief ? 5 : (soft ? 1 : 3), coll: -(chief ? 7 : 5), cons: -5, snitch: 1, rel: { [vic]: -8 } });
        if (soft) { G.relAdd('dudukin', -5); msg('Дудукин нахмурился: «Я такое не люблю. Люди — не бумажки».', 'bad'); }
        msg(resp, 'warn');
        const n = s.car.snitch; if (G.chance(n >= 6 ? 70 : n >= 3 ? 40 : 15)) G.addNick('stukach'); if (G.rumor) G.rumor('stuk', 'В цехе шепчутся, что кто-то «стучит» начальству. Все косятся на тебя.', { coll: -3 }, 60);
        if (G.boardAdd && n >= 3) G.boardAdd('Информатор цеха: слухи ходят, имя уточняется', 'bad');
        sp();
      } })).concat([{ t: 'Передумал', fn: () => {} }]) });
    };

    // ---------- Начальник цеха Щиплен
    const memo = (why, amount) => {
      const s = G.s; const a = loy() >= 60 ? Math.round(amount / 3) : amount;
      s.pay.pen = (s.pay.pen || 0) + a; G.fx({ boss: -8, mood: -6 });
      msg('Щиплен написал служебную записку: «' + why + '». Премия снята (−' + G.rub(a) + ').', 'bad');
      if (G.boardAdd) G.boardAdd('Получил служебную записку от начальника цеха', 'bad');
    };
    const REQ = [
      ['🛠 Заменить убитый станок', ['«Станок в расцвете сил. Ему ещё лет двадцать мучиться».', '«Новый станок? А мне новую жену не надо?»', '«Станок — как человек: пока скрипит — живой».']],
      ['💺 Нормальный стул', ['«Стул? Стоя полезнее для спины. У меня вот стул есть, и спина — как у восьмидесятилетнего».', '«Стул не положен. Положено — стоять и думать о Родине».']],
      ['💨 Вентиляцию в цехе', ['«Вентиляция — это окно. Видишь? Открыл — и вентиляция».', '«У нас вентиляция есть. Просто она работает в режиме ожидания».']],
      ['🧤 Перчатки без дыр', ['«Дыры — это вентиляция для рук».', '«Перчатки выдаём раз в год. Ты что, свои уже износил? Значит, много работаешь. Подозрительно».']],
      ['💡 Нормальный свет', ['«Свет по графику. Темнота — это отдых для глаз».', '«Свет есть. Он просто не знает, что нужен».']]
    ];
    const IDEA = [
      ['📜 Повесить плакат «Не болтай!»', s => { G.fx({ boss: 3, coll: -1 }); msg('Щиплен: «Вот наконец умная мысль! Только плакат будет «Не болтай — я слушаю».'); }],
      ['🍻 Предложить скинуться ему на день рождения', s => { if (loy() >= 15) { setLoy(6); G.fx({ boss: 4, money: -500 }); msg('Щиплен растрогался: «Ну ладно, ладно… один раз в жизни».'); } else { G.fx({ boss: -2 }); msg('Щиплен: «Мне подарки только от тех, кого я люблю. А я тебя пока терплю».'); } }],
      ['🕑 Предложить график перекуров', s => { if (G.chance(50)) { G.fx({ mood: -2 }); msg('Щиплен присвоил идею: «Ввожу график перекуров!» Тебе — устная благодарность. Очень устная.'); } else { G.fx({ boss: -3, mood: -3 }); msg('Щиплен: «Перекуры?! Ты что, курить пришёл на завод?»'); } }],
      ['🧑‍💼 Предложить поменять мастера', s => { memo('Подрыв дисциплины и интриги против мастера', 3000); }]
    ];
    G.chiefTalk = function () {
      const s = G.s, f = s.flags, face = 'shchiplen';
      const main = () => G.modal({ title: 'Щиплен', face, text: G.pick(['«Ну? Что у тебя? Быстро. Я занят: у меня пасьянс».', '«Говори, только не томи душу — у меня и так её нет».', '«Если снова про зарплату — иди в бухгалтерию. Если про станок — иди к станку».']), opts: [
        { t: '🎁 Преподнести подарок', fn: () => giftPick('Подарок начальнику', face, (k, v) => {
          const alc = ['vodka', 'cognac', 'beer'].indexOf(k) >= 0;
          setLoy(v); G.relAdd('shchiplen', alc ? 8 : 3); f.chiefProtect = G.week() + (v >= 30 ? 3 : 1);
          G.fx({ boss: alc ? 5 : 2 });
          const T = { cognac: 'Щиплен прослезился: «Выдержанный… как я сам». Спрятал так быстро, что ты не заметил, куда.', vodka: 'Щиплен принял бутылку, как медаль. «Ну… спасибо. В исключительном порядке».', beer: 'Пиво он взял без восторга, но и без отказа. «Тёплое? Ничего, согласен и тёплое».', cigs: 'Щиплен принюхался: «Сойдёт. Но в следующий раз покрепче».' };
          msg(T[k] || 'Щиплен принял подарок и записал в память. Только в память.', 'good');
          if (loy() >= 40) msg('Щиплен: «А ты мне нравишься. Почти».', 'good'); if (G.rumor) G.rumor('chief', 'Ходит слух, что ты «подмазываешь» начальника цеха.', { boss: 2, coll: -2 }, 60);
          sp();
        }) },
        { t: '🛠 Попросить улучшить рабочее место', fn: () => G.modal({ title: 'Просьба', face, text: 'Чего попросишь?', opts: REQ.map(r => ({ t: r[0], fn: () => {
          const roll = Math.random();
          if (roll < 0.6) { G.fx({ mood: -3, boss: -1 }); msg(G.pick(r[1]), 'bad'); }
          else if (roll < 0.85) { G.fx({ mood: 1 }); msg('Щиплен: «Записал». Блокнот он не доставал, но уверенность — главное.'); }
          else if (loy() < 30) { G.fx({ boss: -3, energy: -8 }); msg('«Инициатива наказуема!» — Щиплен отправил тебя разгребать склад.', 'bad'); G.spend(1); if (loy() < 20 && G.chance(25)) memo('Назойливые просьбы в рабочее время', 1500); }
          else { G.fx({ mood: 2 }); msg('Щиплен хмыкнул: «Ладно. Но только потому, что ты мне нравишься».'); }
          sp();
        } })).concat([{ t: 'Передумал', fn: main }]) }) },
        { t: '💡 Предложить идею', fn: () => G.modal({ title: 'Идея', face, text: 'Что предложишь?', opts: IDEA.map(r => ({ t: r[0], fn: () => { r[1](s); sp(); } })).concat([{ t: 'Передумал', fn: main }]) }) },
        { t: '🐀 Доложить (настучать)', fn: () => G.stukach('chief') },
        { t: '🙇 Подольститься', fn: () => { if (G.chance(70)) { setLoy(3); G.fx({ boss: 2 }); msg(G.pick(['«Правильно говоришь. Продолжай».', '«Хм… в общем-то верно. Я великий человек».', 'Щиплен приосанился: «Ну, в целом ты не безнадёжен».']), 'good'); } else { G.fx({ boss: -2, mood: -2 }); msg('Щиплен: «Льстить надо уметь. Ты не умеешь».', 'bad'); } sp(); } },
        { t: 'Уйти', fn: () => {} }
      ] });
      G.modal({ title: 'Щиплен', face, text: '«Ну? Чего надо?» — Щиплен даже не поднял головы. Как обратишься?', opts: [
        { t: 'Ермолай Дробеструевич, здравствуйте! Разрешите обратиться?', fn: () => { setLoy(1); main(); } },
        { t: 'Здрасьте', fn: () => { msg('Щиплен: «Здрасьте у себя дома говори».'); G.fx({ boss: -1 }); main(); } },
        { t: 'Эй, Щиплен, разговор есть!', fn: () => memo('Неуважительное обращение к начальнику цеха', 5000) },
        { t: 'Уйти', fn: () => {} }
      ] });
    };

    // ---------- Мастер Дудукин
    const DUD_CHAT = ['Дудукин рассказал, как правильно слушать станок: по звуку можно определить, что у него на душе и в подшипнике.', 'Мастер показал, как держать резец. Ты запомнил. Резец — тоже.', 'Дудукин признался, что тоже боится проверок. «Но виду не подаю. Смотри — ни один мускул».', 'Мастер объяснил, чем допуск отличается от желания. Желания можно шлифовать долго.', 'Дудукин угостил чаем из термоса. «Пей, у нас тут как в санатории. Только без процедур».'];
    G.masterTalk = G.dudukinTalk = function () {
      const s = G.s, f = s.flags, face = 'dudukin', rel = () => G.R('dudukin').l;
      const note = () => {
        f.dudScore = (f.dudScore || 0) + 1; G.relAdd('dudukin', 3);
        if (f.dudScore >= 5 && (f.dudGift || 0) >= 2 && rel() >= 20 && (f.dudRew === undefined || G.week() - f.dudRew >= 3)) {
          f.dudRew = G.week(); f.dudScore -= 3; s.pay.acc += 3000; G.fx({ boss: 6, mood: 6 });
          msg('Дудукин замолвил за тебя слово начальству: тебе выписана премия 3 000 ₽.', 'good'); if (G.rumor) G.rumor('dud', 'Говорят, мастер хвалит тебя перед начальством. Коллеги завидуют.', { coll: -1, boss: 2 }, 80);
          if (G.boardAdd) G.boardAdd('Отмечен мастером Дудукиным: «Золотые руки и голова на месте»', 'good');
        }
      };
      const report = () => G.modal({ title: 'Сообщить о проблеме', face, text: 'Что хочешь сообщить?', opts: [
        { t: '🔧 Станок плохо работает', fn: () => { if (s.machine.wear >= 35) { G.fx({ wear: -25, boss: 3, know: 1, mood: 2 }); msg('Дудукин осмотрел станок и сразу всё понял: «Спасибо, что сказал. Ещё неделя — и встал бы».', 'good'); } else { G.fx({ boss: 1 }); msg('Станок в порядке, но Дудукин всё равно доволен: «Бдительность — тоже работа».'); } note(); sp(); } },
        { t: '🪑 Рабочее место можно улучшить', fn: () => { f.ws = Math.min(5, (f.ws || 0) + 1); G.fx({ boss: 4, know: 1, mood: 2 }); msg('Дудукин кивнул: «Дельно. Подставку соорудим — тебе же легче. Ну вот, видишь, работает инициатива».', 'good'); note(); sp(); } },
        { t: '⚠ Заметил опасность (ТБ)', fn: () => { G.fx({ cons: 2, boss: 3, mood: 1 }); msg('Дудукин записал в журнал: «Надежде Николаевне понравится». Шутка про Надежду Николаевну была почти без иронии.', 'good'); note(); sp(); } },
        { t: '📐 Чертёж с ошибкой', fn: () => { if (s.dwg.bad && !s.dwg.fixed) { s.dwg.fixed = true; G.fx({ boss: 3, know: 1 }); msg('Дудукин исправил чертёж: «Ебланов, конечно, гений, но с оговорками».', 'good'); } else { G.fx({ boss: 1 }); msg('«Чертёж нормальный, но проверять надо всегда».'); } note(); sp(); } },
        { t: '💡 Предложить рационализацию', fn: () => { if (G.chance(70)) { G.fx({ boss: 6, know: 2, bm: 3 }); msg('Дудукин загорелся: «Это дельное предложение. Оформим, пустим в работу».', 'good'); if (G.boardAdd) G.boardAdd('Рацпредложение принято мастером Дудукиным', 'good'); } else { G.fx({ boss: 1 }); msg('«Интересно, но дороговато. Давай доработаем и вернёмся».'); } note(); sp(); } },
        { t: 'Назад', fn: () => {} }
      ] });
      G.modal({ title: 'Дудукин', face, text: 'Дудукин отрывается от станка: «О, привет. Что-то случилось или просто поболтать?»', opts: [
        { t: '🛠 Сообщить о проблеме', fn: report },
        { t: '☕ Поболтать по работе', fn: () => { G.fx({ know: 1, mood: 2 }); G.relAdd('dudukin', 2); msg(G.pick(DUD_CHAT)); sp(); } },
        { t: '🎁 Знак внимания (подарок)', fn: () => giftPick('Подарок мастеру', face, (k, v) => { f.dudGift = (f.dudGift || 0) + 1; G.relAdd('dudukin', 4); G.fx({ boss: 1, mood: 2 }); msg('Дудукин смутился: «Ну зачем… ладно, спасибо. Приятно, что ценят».', 'good'); note(); sp(); }) },
        { t: '🐀 Сообщить о коллеге', fn: () => G.stukach('master') },
        { t: 'Уйти', fn: () => {} }
      ] });
    };

    // ---------- Серёга и Афоня (блок «Коллеги и приколюхи»)
    const SERY = ['Серёга рассказал, как в детстве пытался продать соседу его же велосипед. Сосед купил.', 'Серёга признался, что боится голубей: «У них взгляд — как у налоговой».', 'Серёга уверен, что у станка №3 есть характер: «Он утром всегда мрачный, а к обеду добреет».', 'Серёга мечтает открыть шашлычную «Три товарища». Товарищей пока двое, и оба — он.', 'Серёга клянётся, что видел в столовой котлету, которая подмигнула.'];
    const PRANK = [['Приклеить Витьку записку «Я ничего не умею»', 'Витёк ходил так до обеда. Все улыбались, он — нет.'], ['Подкрутить будильник в раздевалке', 'Полцеха проснулось в три ночи. Было весело, но недолго.'], ['Спрятать у Михалыча маску', 'Михалыч варил с закрытыми глазами. Шов получился «авангардный».']];
    G.seryogaMenu = function () {
      const s = G.s, face = 'seryoga', back = () => G.seryogaMenu();
      G.modal({ title: 'Серёга', face, text: 'Серёга подмигивает: «Ну, чем займёмся? Только чтоб не по правилам».', opts: [
        { t: '🗣 Поговорить по душам', fn: () => { G.fx({ mood: 3 }); G.relAdd('seryoga', 4); msg(G.pick(SERY)); sp(); } },
        { t: '✌ Камень-ножницы-бумага на уборку', fn: () => G.modal({ title: 'КНБ', face, text: 'Проигравший убирает станок. Выбирай:', opts: ['🪨 Камень', '✂ Ножницы', '📄 Бумага'].map((t, i) => ({ t, fn: () => { const e = Math.floor(Math.random() * 3), r = (i - e + 3) % 3; if (r === 0) { msg('Ничья. Оба сделали вид, что убрали.'); } else if (r === 1) { G.fx({ coll: 2, mood: 2 }); G.relAdd('seryoga', 2); msg('Выиграл! Серёга драит станок и обещает «отыграться».', 'good'); } else { G.fx({ energy: -4, mood: -1 }); msg('Проиграл. Убираешь за двоих. Серёга сочувственно пьёт чай.', 'bad'); } sp(); } })) }) },
        { t: '🍻 Скинуться на пиво после смены (300 ₽)', dis: s.money < 300 ? 'Нет денег' : null, fn: () => { G.fx({ money: -300, mood: 4, drunk: 8 }); G.relAdd('seryoga', 6); msg('Скинулись, как положено. Серёга сказал тост про станки — длинный.'); sp(); } },
        { t: '🎭 Подшутить над коллегой', fn: () => { const p = G.pick(PRANK); G.fx({ cool: 2, coll: 3, mood: 3 }); msg(p[1], 'good'); if (G.chance(25)) G.punish({ risk: 100, what: 'Дурацкие шутки в цеху', fine: [100, 300], sev: 0 }); sp(); } },
        { t: '💡 Спросить совет', fn: () => { msg(G.pick(['Серёга: «Егорыч любит водку и когда его слушают. Лучше, чтоб одновременно».', 'Серёга: «Щиплен падок на коньяк. И на почтение. Особенно на почтение».', 'Серёга: «Дудукин любит, когда говорят про работу. Только по делу».', 'Серёга: «Надежда Николаевна, говорят, берёт конверты. Но тихо, я тебе не говорил».'])); sp(); } },
        { t: 'Уйти', fn: () => {} }
      ] });
    };
    const SONGS = ['«Ой, кран, ты кран, ты куда капаешь? Я ж тебя люблю, а ты заливаешь…»', '«На юге море, на юге пляж, а у меня в гараже — шкаф».', '«Если станок молчит — значит, спит. Если спит — значит, не мой».'];
    G.afonyaMenu = function () {
      const s = G.s, face = 'afonya';
      G.modal({ title: 'Афоня', face, text: 'Афоня встречает тебя на ведре: «Присаживайся. Только ведро своё приноси».', opts: [
        { t: '🎸 Послушать песню', fn: () => { G.fx({ mood: G.chance(70) ? 4 : -2 }); G.relAdd('afonya', 4); msg('Афоня спел: ' + G.pick(SONGS), 'good'); sp(); } },
        { t: '🔧 Попросить что-нибудь починить', fn: () => { const r = G.pick([['Афоня починил кран. Теперь вода течёт только в раковине соседа.', { mood: 2, coll: -1 }], ['Афоня разобрал станок, собрал — осталась одна лишняя деталь. «Запасная», — заверил он.', { mood: -2, know: 1 }], ['Афоня что-то подкрутил — и станок затанцевал. Работает, но странно.', { mood: 4, cool: 2 }]]); G.fx(r[1]); msg(r[0]); sp(); } },
        { t: '🍺 Выпить с Афоней (300 ₽)', dis: s.money < 300 ? 'Нет денег' : null, fn: () => { G.fx({ money: -300, drunk: 18, mood: 8 }); G.relAdd('afonya', 6); msg(G.pick(['Афоня за стаканом рассказал, что влюбился в кассиршу из столовой. Она об этом не знает. И не узнает.', 'Афоня клянётся, что откроет баню без пара — «для тех, кому тепла хватает внутри».']), 'good'); sp(); } },
        { t: '💸 Занять денег', fn: () => { G.fx({ mood: 1 }); G.relAdd('afonya', 2); msg('Афоня достал из кармана рубль и кусок провода: «Больше нет. Провод — гарантия».'); sp(); } },
        { t: '🛁 Взять левый заказ с Афоней', fn: () => { if (G.chance(55)) { G.fx({ money: 1500, coll: 2, energy: -10 }); msg('Левый заказ сделали быстро. Заказчик был в восторге, хозяйка — в ванной.', 'good'); } else { G.fx({ money: -500, mood: -5, energy: -8 }); msg('Затопили соседей снизу. Афоня: «Это не потоп, это творческий беспорядок».', 'bad'); } if (G.chance(20)) G.punish({ risk: 100, what: 'Левая халтура в рабочее время', fine: [200, 600], sev: 0 }); G.spend(2); } },
        { t: 'Уйти', fn: () => {} }
      ] });
    };
    A('seryoga_talk', { ph: ['work'], loc: 'shop', g: 'Коллеги и приколюхи', n: 'Серёга: приколы и разговоры', i: '😎', menu: true, fn: () => { G.seryogaMenu(); return 'custom'; } });
    A('afonya_talk', { ph: ['work'], loc: 'yard', g: 'Коллеги и приколюхи', n: 'Афоня: приколы и песни', i: '🎸', menu: true, lunch: true, fn: () => { G.afonyaMenu(); return 'custom'; } });

    // ---------- Особые пункты в меню персонажей
    const SPECIAL = {
      shchiplen: () => [{ t: '🗣 Разговор с начальником цеха', fn: () => G.chiefTalk() }],
      dudukin: () => [{ t: '🛠 Рабочие вопросы и инициатива', fn: () => G.dudukinTalk() }],
      afonya: () => [{ t: '🎸 Афоня: приколы', fn: () => G.afonyaMenu() }],
      seryoga: () => [{ t: '😎 Приколы с Серёгой', fn: () => G.seryogaMenu() }]
    };
    const _sp = G.npcSpecial;
    G.npcSpecial = function (id) {
      const o = _sp.apply(this, arguments);
      if (SPECIAL[id]) SPECIAL[id]().forEach(x => o.push(x));
      o.push({ t: '👊 Нарваться на драку', fn: () => G.modal({ title: 'Драка', text: 'Ты уверен? Выговор или увольнение — почти гарантированы.', opts: [{ t: 'Драться!', fn: () => G.fight(id) }, { t: 'Передумал', fn: () => {} }] }) });
      return o;
    };

    // ---------- Драка: «Уклонись и бей» (реакция на сигнал)
    const FPOW = { gosha: 90, lidiya: 60, shchiplen: 35, dudukin: 45, afonya: 55, seryoga: 50, vityok: 45, mikhalych: 65, palych: 60, lyosha: 40, egorych: 40, tamara: 50 };
    const fcss = document.createElement('style');
    fcss.textContent = '.fi-bars{display:flex;gap:10px;margin:8px 0}.fi-bars div{flex:1;text-align:left;font-size:13px}.fi-b{height:12px;background:#0d0c0b;border:1px solid #000;margin-top:2px}.fi-b i{display:block;height:100%}.fi-sig{font-family:var(--f-head,"Russo One",sans-serif);font-size:26px;min-height:64px;display:flex;align-items:center;justify-content:center;border:2px solid #000;margin:8px 0;background:#0d0c0b}.fi-sig.go{background:#2f6b2c}.fi-sig.bl{background:#8a2a22}.fi-btns{display:flex;gap:10px}.fi-btns button{flex:1}';
    document.head.appendChild(fcss);
    G.fight = function (id) {
      const s = G.s, root = app(); if (!root || document.getElementById('fight-ov')) return;
      const nm = (D.NPC[id] && D.NPC[id].name) || 'Соперник', ePow = FPOW[id] || 45, str = s.flags.str || 0;
      let hp = 100 + str * 0.5, ehp = 70 + ePow * 0.8; const hp0 = hp, ehp0 = ehp;
      let rounds = 0, state = 'wait', win = 0, timer = null, done = false;
      const ov = document.createElement('div'); ov.id = 'fight-ov'; ov.className = 'gym-ov';
      ov.innerHTML = '<div class="gym-box"><h3>👊 ДРАКА: ты против ' + nm + '</h3><div class="fi-bars"><div>Ты<div class="fi-b"><i id="fi-h" style="background:#4fae4a"></i></div></div><div>' + nm + '<div class="fi-b"><i id="fi-e" style="background:#c33"></i></div></div></div><div class="fi-sig" id="fi-s">Приготовься…</div><div class="fi-btns"><button class="btn big" id="fi-hit">🥊 УДАР</button><button class="btn big" id="fi-blk">🛡 БЛОК</button></div></div>';
      root.appendChild(ov);
      const upd = () => { document.getElementById('fi-h').style.width = Math.max(0, hp / hp0 * 100) + '%'; document.getElementById('fi-e').style.width = Math.max(0, ehp / ehp0 * 100) + '%'; };
      const sig = (t, c) => { const e = document.getElementById('fi-s'); e.textContent = t; e.className = 'fi-sig ' + (c || ''); };
      const next = () => {
        if (done) return;
        if (hp <= 0 || ehp <= 0 || rounds >= 14) return end();
        state = 'wait'; sig(nm + ' примеривается…'); rounds++;
        timer = setTimeout(() => {
          state = Math.random() < 0.5 ? 'open' : 'swing'; const w = Math.max(380, 700 - rounds * 22);
          sig(state === 'open' ? 'ОТКРЫТ! БЕЙ!' : 'ЗАМАХ! БЛОКИРУЙ!', state === 'open' ? 'go' : 'bl');
          timer = setTimeout(() => { if (state === 'swing') { hp -= 8 + ePow * 0.18; sig('Пропустил удар!'); } else sig('Упустил момент.'); upd(); state = 'dead'; timer = setTimeout(next, 450); }, w);
        }, 500 + Math.random() * 800);
      };
      const act = k => {
        if (done || state === 'dead') return;
        if (state === 'wait') { hp -= 4; sig('Рано! Противник уклонился.'); upd(); clearTimeout(timer); state = 'dead'; timer = setTimeout(next, 450); return; }
        clearTimeout(timer);
        if (state === 'open' && k === 'hit') { ehp -= 10 + str * 0.22 + Math.random() * 6; sig('Попал!', 'go'); }
        else if (state === 'swing' && k === 'blk') { ehp -= 3; sig('Отбил!', 'go'); }
        else { hp -= 6; sig('Мимо!', 'bl'); }
        upd(); state = 'dead'; timer = setTimeout(next, 450);
      };
      const end = () => {
        done = true; clearTimeout(timer); win = hp / hp0 >= ehp / ehp0 && ehp <= hp; ov.remove();
        G.fightResolve(id, ehp <= 0 || (hp > 0 && hp / hp0 > ehp / ehp0));
      };
      document.getElementById('fi-hit').onclick = () => act('hit'); document.getElementById('fi-blk').onclick = () => act('blk');
      upd(); timer = setTimeout(next, 700);
    };
    G.fightResolve = function (id, won) {
      const s = G.s, nm = (D.NPC[id] && D.NPC[id].name) || 'соперник';
      const fine = G.ri(500, 1500); G.buzz && G.buzz(won ? 'success' : 'error'); s.flags.fights = (s.flags.fights || 0) + 1; if (G.rumor) G.rumor('fight', 'Весь цех обсуждает твою драку. Одни с восхищением, другие со смехом.', { cool: 4, boss: -1 }, 80);
      G.fx(won ? { cool: 6, health: -5, mood: 3, money: -fine, rep: 1, boss: -8, rel: { [id]: -10 } } : { health: -14, mood: -8, cool: -4, money: -fine, rep: 1, boss: -8, rel: { [id]: -4 } });
      if (G.boardAdd) G.boardAdd(won ? 'Выиграл драку в курилке. Выговор прилагается' : 'Проиграл драку и получил выговор', 'bad');
      G.toast(won ? 'Ты победил ' + nm + '! Но кулаки — не аргумент для начальства.' : nm + ' надавал тебе по первое число.', won ? 'warn' : 'bad');
      if (G.checkEnd && G.checkEnd()) return;
      const sure = ['shchiplen', 'dudukin', 'truhanov', 'soplezhuykin'].indexOf(id) >= 0;
      if (sure || s.car.rep >= 3 || G.chance(G.fireRisk() / 2 + (won ? 20 : 35))) { G.info('УВОЛЕН ЗА ДРАКУ', 'Отдел кадров не стал разбираться, кто начал. Приказ уже подписан.', () => G.end('fired')); return; }
      G.info('Выговор', 'Тебе объявлен выговор (' + s.car.rep + '/3) и удержан штраф ' + G.rub(fine) + '.', () => {});
      G.spend(1);
    };

    // ---------- Сила: меньше усталости на смене
    const _fx = G.fx;
    G.fx = function (f, ctx) {
      try { const s = G.s; if (f && typeof f.energy === 'number' && f.energy < 0 && s.phase === 'work') { const red = Math.min(0.35, (s.flags.str || 0) * 0.0025 + (s.flags.ws || 0) * 0.03); if (red > 0) f = Object.assign({}, f, { energy: f.energy * (1 - red) }); } } catch (e) {}
      return _fx.call(this, f, ctx);
    };

    // ---------- Календарь и праздники (используются Егорычем и событиями)
    G.holiday = function () {
      const d = G.dateObj(), k = d.getDate() + '-' + (d.getMonth() + 1);
      return ({ '1-9': 'День знаний', '23-2': 'День защитника Отечества', '8-3': 'Международный женский день', '31-12': 'канун Нового года', '1-1': 'Новый год', '1-5': 'Первомай', '12-6': 'День России', '4-11': 'День народного единства' })[k] || null;
    };

    // ---------- Докладная начальника и ослабление лояльности
    const _dt2 = G.dailyTick;
    G.dailyTick = function () {
      const r = _dt2.apply(this, arguments), s = G.s, f = s.flags;
      if (G.weekday() === 0 && f.chiefLoy) f.chiefLoy = Math.max(0, f.chiefLoy - 5);
      if (s.car.shifts > 3 && (f.chiefProtect || 0) < G.week() && loy() < 30 && G.chance(8)) { memo('Следит за тобой и докладывает генеральному директору', 3000); }
      return r;
    };
  })();


  // ======================= v1.7: Надежда Николаевна, праздники, достижения, слухи =======================
  (function () {
    const D = G.D, C = G.clamp, K = G.career;
    const msg = (t, c) => G.toast(t, c);

    // ---------- Достижения (с названиями) и новые значки
    const FALL = { first_pay: 'Первая зарплата', wed: 'Выжил в среду', shur: 'Зять главбуха', rank1: 'Прошёл стажировку' };
    G.achName = id => {
      const n = (G.s.flags.achNames || {})[id]; if (n) return n; if (FALL[id]) return FALL[id];
      let m = /^rank(\d+)$/.exec(id); if (m) return 'Новая ступень: ' + D.RANKS[+m[1]];
      m = /^own_(.+)$/.exec(id); if (m) return 'Покупка: ' + m[1]; return id;
    };
    const _ach = G.achieve;
    G.achieve = function (id, text) { const f = G.s.flags; f.achNames = f.achNames || {}; if (text) f.achNames[id] = text; return _ach.call(this, id, text); };
    const AL = [
      ['shifts10', 'Десять смен: уже не новичок', s => s.car.shifts >= 10], ['shifts50', 'Полсотни смен', s => s.car.shifts >= 50],
      ['shifts100', 'Сто смен у станка', s => s.car.shifts >= 100], ['shifts250', 'Железный ветеран (250 смен)', s => s.car.shifts >= 250],
      ['egor3', 'Трижды переиграл Егорыча подарком', s => (s.flags.egGifts || 0) >= 3], ['gym5', 'Идеальная тренировка ×5', s => (s.flags.gymPerfect || 0) >= 5],
      ['str50', 'Силач: сила 50+', s => (s.flags.str || 0) >= 50], ['snitch5', 'Информатор года', s => s.car.snitch >= 5],
      ['fight1', 'Первая драка (выговор прилагается)', s => (s.flags.fights || 0) >= 1], ['fight3', 'Задира цеха', s => (s.flags.fights || 0) >= 3],
      ['chief60', 'Собутыльник начальника цеха', s => (s.flags.chiefLoy || 0) >= 60], ['dud_fav', 'Любимчик мастера Дудукина', s => s.flags.dudRew !== undefined],
      ['secret', 'Секретный пропуск Егорыча', s => !!s.flags.egSecret], ['clean95', 'Чистюля', s => s.st.neat >= 95],
      ['rich100', 'Стотысячник', s => s.money >= 100000], ['holi3', 'Праздничная душа: три праздника', s => (s.flags.holiN || 0) >= 3],
      ['nad_deal', 'Договорился с Надеждой Николаевной', s => !!s.flags.nadBribed], ['rumor3', 'Герой слухов', s => (s.flags.rumorN || 0) >= 3]
    ];
    G.checkAch = function () { const s = G.s; if (!s || s.end) return; AL.forEach(a => { try { if (!s.ach[a[0]] && a[2](s)) G.achieve(a[0], a[1]); } catch (e) {} }); };

    // ---------- Цеховые слухи
    G.rumor = function (id, text, fx, odds) {
      const s = G.s, f = s.flags; if (odds !== undefined && !G.chance(odds)) return;
      f.rumors = f.rumors || []; f.rumors.unshift({ id, t: text, fx: fx || {}, d: s.t.day, done: 0 }); if (f.rumors.length > 8) f.rumors.length = 8; f.rumorN = (f.rumorN || 0) + 1;
    };
    const spread = () => {
      const s = G.s; (s.flags.rumors || []).forEach(r => { if (!r.done && s.t.day - r.d >= 1) { r.done = 1; G.fx(r.fx); msg('🗣 По цеху ходит слух: ' + r.t, 'warn'); } });
    };

    // ---------- Надежда Николаевна: проверка, мини-экзамен, конверты
    const NQ = [
      ['Как часто проводится повторный инструктаж?', ['Раз в полгода', 'Раз в пять лет', 'Когда Надежда Николаевна вспомнит']],
      ['Что делать при пожаре?', ['Тушить огнетушителем и вызвать пожарных', 'Снять на телефон', 'Дождаться мастера']],
      ['Когда надевают каску в цеху?', ['Всегда, даже если голова уже дырявая', 'Только по средам', 'Когда Надежда Николаевна смотрит']],
      ['Какая спецовка допустима?', ['Чистая и по размеру', 'Чем грязнее, тем опытнее', 'Выданная на пять лет вперёд']],
      ['Можно ли распивать спиртное на рабочем месте?', ['Нельзя никогда', 'Только по праздникам', 'Без закуски можно']],
      ['Станок искрит. Что делать?', ['Отключить и доложить мастеру', 'Похлопать по корпусу', 'Накрыть ватником']],
      ['Первая помощь при порезе:', ['Остановить кровь, обработать, перевязать', 'Подуть', 'Приложить подорожник к станку']],
      ['Где находится огнетушитель?', ['На своём месте и доступен', 'За шкафом в курилке', 'В будке у Егорыча']],
      ['Что нельзя при работе рядом с вращающимися частями?', ['Свободная одежда и длинные волосы навыпуск', 'Дышать', 'Улыбаться']],
      ['Кто отвечает за охрану труда на участке?', ['Каждый работник и руководитель', 'Только Надежда Николаевна', 'Кот Чугунок']]
    ];
    const NI = ['Надежда Николаевна поправляет очки: «Где сушка спецовок? Почему масло на полу — оно здесь прописано?»', '«Я слышала, у вас здесь «всё нормально». В моей практике «нормально» — это протокол».', '«Каска — это не головной убор, а образ мышления», — говорит Надежда Николаевна и пишет что-то красным.'];
    G.nadExam = function (done) {
      const qs = NQ.slice().sort(() => Math.random() - 0.5).slice(0, 3); let ok = 0, i = 0;
      const ask = () => {
        if (i >= 3) return done(ok);
        const q = qs[i], idx = [0, 1, 2].sort(() => Math.random() - 0.5);
        G.modal({ title: 'Мини-экзамен (' + (i + 1) + '/3)', face: 'nadezhda', text: '<b>' + q[0] + '</b>', opts: idx.map(j => ({ t: q[1][j], fn: () => {
          if (j === 0) { ok++; msg('Верно. Надежда Николаевна сухо кивнула.', 'good'); } else msg(G.pick(['«Это неверно. Совсем».', '«Вы, видимо, спали на инструктаже».', '«Неправильно. Записываю».']), 'bad');
          i++; ask();
        } })) });
      };
      ask();
    };
    K.inspection = function () {
      const s = G.s, f = s.flags;
      const run = tidy => {
        const eff = K.effSmell(), notes = [];
        const outfit = s.st.neat >= 60 && (G.has('helmet') || s.car.rank >= 8 || s.day.prepped);
        if (!tidy) notes.push('рабочее место не убрано');
        if (!outfit) notes.push('не по форме (нужны чистая спецовка и каска/очки/респиратор)');
        if (s.st.neat < 60) notes.push('неопрятный вид');
        if (s.st.drunk > 3 || (eff > 12 && G.chance((eff - 5) * 5))) notes.push('запах алкоголя');
        const resolve = () => {
          if (!notes.length) { G.fx({ boss: 3, mood: 3 }); msg('Проверка пройдена без замечаний. Надежда Николаевна даже кивнула.', 'good'); f.wedRes = 'без замечаний'; G.achieve('wed', 'Выжил в среду'); G.relAdd('nadezhda', 2); return; }
          f.wedStrike = (f.wedStrike || 0) + 1; f.wedRes = 'нарушения: ' + notes.join(', ');
          if (G.rl('nadezhda') >= 30 && (f.nadWarn === undefined || G.week() - f.nadWarn >= 4)) { f.nadWarn = G.week(); G.fx({ boss: -1, mood: -2 }); msg('Надежда Николаевна: «Предупреждаю в последний раз. Премию оставляю — но запомню».', 'warn'); return; }
          const pen = G.newbie() ? 2500 : 5000;
          s.pay.pen += pen; s.pay.viol = (s.pay.viol || 0) + 1; s.day.viol++; G.fx({ boss: -4, mood: -5 });
          msg('Надежда Николаевна лишила премии на ' + G.rub(pen) + ': ' + notes.join('; ') + '.', 'bad');
          if (f.wedStrike >= 2 && !G.newbie() && G.chance(50)) { G.fx({ rep: 1 }); msg('Повторное нарушение: выговор.', 'bad'); G.checkEnd(); }
          f.wedStrike = G.chance(50) ? f.wedStrike : 0;
        };
        const exam = () => G.nadExam(ok => {
          if (ok >= 2) { G.fx({ know: 2 }); msg('Экзамен сдан (' + ok + ' из 3). «Хоть что-то вы знаете».', 'good'); resolve(); }
          else { G.fx({ rep: 1, boss: -5, mood: -5 }); msg('Экзамен не сдан (' + ok + ' из 3). Выговор. Всё строго!', 'bad'); if (!G.checkEnd()) resolve(); }
        });
        if (f.nadDeal && f.nadDeal >= G.week()) { f.nadDeal = 0; notes.length = 0; msg('Надежда Николаевна: «У нас с вами была договорённость». Проверка пройдена, экзамена нет.', 'good'); resolve(); return; }
        const main = () => {
          const opts = [];
          if (notes.length && G.has('choco')) opts.push({ t: '🍫 Подарить шоколадку', fn: () => { G.give('choco', -1); G.relAdd('nadezhda', 6); if (G.chance(55)) { msg('Она смягчилась. Замечаний нет.', 'good'); notes.length = 0; } exam(); } });
          opts.push({ t: '💵 Предложить конверт (3 000 ₽)', dis: s.money < 3000 && !G.has('env1') ? 'Нет денег' : null, fn: () => {
            if (G.has('env1')) G.give('env1', -1); else G.addMoney(-3000);
            f.nadBribed = 1; G.fx({ cons: -4, boss: 1 }); G.relAdd('nadezhda', 4); notes.length = 0;
            msg('Надежда Николаевна приняла конверт, как протокол. «Замечаний нет. Экзамена нет. Всё хорошо».', 'good'); f.wedRes = 'без замечаний';
            G.rumor('nad', 'Ходит слух, что Надежда Николаевна принимает конверты. Ты, говорят, знаешь, как.', { cons: -2, boss: -1 }, 55);
          } });
          opts.push({ t: 'Стоять по стойке смирно (экзамен)', fn: exam });
          G.modal({ title: 'ПРОВЕРКА ОТ', face: 'nadezhda', vib: 'warning', text: G.pick(NI) + '<br>Проверка по пунктам: уборка, форма, опрятность, трезвость.' + (notes.length ? '<br><b>Что она заметит:</b> ' + notes.join('; ') : '<br>Кажется, всё в порядке.'), opts });
        };
        G.modal({ title: 'ПРОВЕРКА ОТ', face: 'nadezhda', vib: 'warning', text: 'Надежда Николаевна идёт по цеху с портфелем и красной помадой.', opts: [
          { t: 'Здравствуйте, Надежда Николаевна!', fn: () => { G.relAdd('nadezhda', 3); main(); } },
          { t: 'Опять вы…', fn: () => { G.relAdd('nadezhda', -4); G.fx({ boss: -2 }); msg('«Я не «опять», я «регулярно», — отрезала Надежда Николаевна».', 'bad'); main(); } },
          { t: 'Чаю хотите?', fn: () => { G.fx({ mood: 2 }); msg('«Чай — после проверки. Если будет, за что».'); main(); } }
        ] });
      };
      if (s.day.prepped) run(true);
      else G.mini('clean', { title: 'Быстрая уборка!', hint: 'Тапай по мусору и маслу — Надежда Николаевна уже в цеху!' }, r => { s.day.cleaned = 1; run(r.score >= 0.6); });
    };
    // договориться заранее (меню персонажа)
    const _sp3 = G.npcSpecial;
    G.npcSpecial = function (id) {
      const o = _sp3.apply(this, arguments);
      if (id === 'nadezhda') o.push({ t: '💵 Договориться заранее (3 000 ₽)', dis: G.s.money < 3000 ? 'Нет денег' : null, fn: () => { G.addMoney(-3000); G.s.flags.nadDeal = G.week(); G.s.flags.nadBribed = 1; G.fx({ cons: -4 }); G.relAdd('nadezhda', 3); msg('Надежда Николаевна: «Я вас не слышала. Но на этой неделе всё будет хорошо».', 'good'); G.spend(1); } });
      return o;
    };

    // ---------- Праздники и сезонные события
    const prize = (what) => {
      const P = { choco: () => { G.give('choco', 1); return 'шоколадка'; }, vodka: () => { G.give('vodka', 1); return 'бутылка'; }, cash: () => { G.addMoney(1000); return '1 000 ₽'; }, flowers: () => { G.give('flowers', 1); return 'букет'; } };
      msg('Приз: ' + (P[what] ? P[what]() : what), 'good');
    };
    const HOL = {
      unity: ['🇷🇺 День народного единства', 'Профком объявил «День обнимашек»: до обеда весь цех ходит в обнимку.', [['Обняться со всеми', () => { G.fx({ coll: 6, mood: 4 }); prize('choco'); }], ['Остаться в стороне', () => { G.fx({ coll: -3, mood: -1 }); msg('Ты остался в стороне. Цех понял, но запомнил.'); }]]],
      knowledge: ['📚 День знаний', 'Пелагея Фёдоровна проводит викторину: «Сколько спецовок нужно, чтобы сменить спецовку?»', [['Одну', () => { G.fx({ know: 2, mood: 2 }); msg('Неверно, но уверенно. Она оценила.'); prize('choco'); }], ['Две', () => { G.fx({ know: 1 }); msg('«Близко», — говорит Пелагея Фёдоровна.'); }], ['Спецовка не сменяется', () => { G.fx({ cool: 3, mood: 3 }); msg('«Философ!» — Пелагея Фёдоровна записала ответ как «неправильный, но звучит».'); prize('cash'); }]]],
      feb23: ['🪖 23 февраля', 'Людка раздаёт открытки, а Надежда Николаевна — «персональные поздравления» в виде замечаний.', [['Принять открытку', () => { G.fx({ mood: 5 }); G.relAdd('lyudka', 3); prize('choco'); }], ['Поздравить Людку цветами', () => { if (G.has('flowers')) { G.give('flowers', -1); G.relAdd('lyudka', 8); G.fx({ mood: 4 }); msg('Людка растрогалась: «Это тебе добавка к борщу».', 'good'); } else msg('Цветов нет. Людка сделала вид, что не заметила.'); }]]],
      mar8: ['🌷 8 марта', 'Цех замер: сегодня все смотрят, кто кому что подарит.', [['Подарить цветы Надежде Николаевне', () => { if (G.has('flowers')) { G.give('flowers', -1); G.relAdd('nadezhda', 10); G.fx({ boss: 2 }); msg('Надежда Николаевна: «Это учтено при проверке». Как именно — не уточнила.', 'good'); } else { G.fx({ coll: -2 }); msg('Цветов нет — стыдно, но все видели.', 'bad'); } }], ['Скинуться на общий букет (300 ₽)', () => { G.fx({ money: -300, coll: 3, mood: 2 }); msg('Скинулись. Букет вышел длинный и разноцветный.', 'good'); }]]],
      metal: ['⚒ День металлурга', 'Заводская олимпиада: перетягивание станка, метание заклёпок, бег в спецовках.', [['Участвовать в перетягивании', () => { const w = G.chance(30 + (G.s.flags.str || 0) / 1.5); if (w) { G.fx({ cool: 6, coll: 4, mood: 6 }); msg('Победа! Станок перетянут, коллеги носят тебя на руках.', 'good'); prize('vodka'); } else { G.fx({ mood: -2, energy: -8 }); msg('Станок оказался сильнее. Честь цеха осталась ему.', 'bad'); } }], ['Болеть за наших', () => { G.fx({ mood: 4, coll: 2 }); msg('Болел с таким жаром, что тебя оштрафовали за шум.'); }]]],
      subbotnik: ['🧹 Субботник', 'Весь завод выходит на уборку территории: «добровольно-принудительно».', [['Работать усердно', () => { G.fx({ energy: -10, boss: 4, coll: 2 }); msg('Убрал за троих. Мастер умиляется.', 'good'); prize('choco'); }], ['Для вида', () => { G.fx({ coll: 2, boss: -1 }); msg('Ты усердно делал вид. Это тоже труд.'); }], ['Сачковать', () => { G.fx({ mood: 3 }); if (G.chance(35)) G.punish({ risk: 100, what: 'Уклонение от субботника', fine: [100, 300], sev: 0 }); }]]],
      doors: ['🚪 День открытых дверей для проверяющих', 'Завод принимает проверяющих: все делают вид, что так всегда.', [['Навести порядок', () => { G.fx({ cons: 2, neat: 5, boss: 3 }); msg('Проверяющие ушли довольными. Особенно от чая.', 'good'); prize('cash'); }], ['Спрятаться в курилке', () => { G.fx({ mood: 3, boss: -2 }); msg('Курилка выдержала. Проверяющие — нет.'); }]]]
    };
    const holKey = d => { const m = d.getMonth() + 1, dd = d.getDate(), wd = d.getDay();
      if (dd === 4 && m === 11) return 'unity'; if (dd === 1 && m === 9) return 'knowledge'; if (dd === 23 && m === 2) return 'feb23'; if (dd === 8 && m === 3) return 'mar8';
      if (m === 7 && wd === 0 && dd >= 15 && dd <= 21) return 'metal'; if (m === 4 && wd === 6 && dd >= 24) return 'subbotnik'; if (m === 4 && dd === 14) return 'doors'; return null; };
    G.holidayCheck = function () {
      const s = G.s; if (!s || s.end || s.phase === 'new' || s.flags.holSeen === s.t.day) return;
      const k = holKey(G.dateObj()); s.flags.holSeen = s.t.day; if (!k) return;
      const h = HOL[k]; s.flags.holiN = (s.flags.holiN || 0) + 1;
      G.modal({ title: h[0], text: h[1], opts: h[2].map(o => ({ t: o[0], fn: () => { o[1](); G.rumor('hol', 'Все обсуждают, как ты отметил «' + h[0].replace(/^\S+\s/, '') + '».', { coll: 1 }, 40); } })) });
    };

    // ---------- Хуки: проверка достижений, праздников и распространение слухов
    const _kh = K.hook;
    K.hook = function () { const r = _kh.apply(this, arguments); try { G.holidayCheck(); G.checkAch(); } catch (e) {} return r; };
    const _dt3 = G.dailyTick;
    G.dailyTick = function () { const r = _dt3.apply(this, arguments); try { spread(); G.checkAch(); } catch (e) {} return r; };
  })();


  // ======================= v1.8: профсоюз и забастовка, подработки, быт и кот, сюжетные арки =======================
  (function () {
    const D = G.D, C = G.clamp, msg = (t, c) => G.toast(t, c), sp = n => G.spend(n || 1);
    const F = () => G.s.flags;
    D.ENDINGS = D.ENDINGS || {};
    D.ENDINGS.union_leader = { e: '👑', t: 'ПРЕДСЕДАТЕЛЬ ПРОФКОМА', x: 'Забастовка кружек вошла в историю завода. Тебя избрали председателем профкома, Щиплен подал заявление «по собственному», а Егорыч выдал пожизненный пропуск. Кружки теперь большие. Завод — тоже.' };

    // ---------- Профсоюз и забастовка кружек (Семёныч)
    const NAMES = ['seryoga', 'vityok', 'mikhalych', 'palych', 'gosha', 'kolyan', 'afonya', 'khomyak', 'lyosha'];
    const DEMANDS = ['Заменить кружки на большие', 'Обед из трёх блюд и компота', 'Запретить слово «авральчик»', 'Каски с вентиляцией', 'Отгул для станка №3', 'День тишины раз в неделю'];
    G.unionMenu = function () {
      const s = G.s, f = F(), face = 'semyonych';
      f.uSig = f.uSig || 0; f.uDem = f.uDem || [];
      const back = () => G.unionMenu();
      const nm = id => (D.NPC[id] && D.NPC[id].name) || id;
      G.modal({ title: 'Профсоюзная работа', face, text: 'Подписей: <b>' + f.uSig + '</b> · Требований: <b>' + f.uDem.length + '/3</b>. Забастовок: <b>' + (f.uWins || 0) + '</b> побед.', opts: [
        { t: '✍ Собрать подписи', dis: s.day.uSign ? 'Сегодня уже собирал' : null, fn: () => { s.day.uSign = 1; const pick = NAMES.filter(i => D.NPC[i]).sort(() => Math.random() - 0.5).slice(0, 3);
          G.modal({ title: 'Чья подпись?', face, text: 'К кому подойдёшь?', opts: pick.map(id => ({ t: nm(id), fn: () => { const p = C(35 + s.st.coll / 2 + G.R(id).l / 3, 20, 85);
            if (G.chance(p)) { const n = G.ri(5, 8); f.uSig = Math.min(60, f.uSig + n); G.fx({ coll: 2, cool: 1 }); msg(nm(id) + ' подписал и пожелал «успеха этой авантюре». Подписей +' + n + '.', 'good'); }
            else { G.fx({ coll: -1 }); msg(nm(id) + ' подписывать не стал, но чаю налил. Это тоже вклад.'); }
            if (f.uSig >= 20 && G.chance(10)) { G.fx({ boss: -2 }); msg('Щиплен что-то заметил и скривился. Но пока молчит.'); }
            sp(); } })).concat([{ t: 'Назад', fn: back }]) }); } },
        { t: '📜 Составить требования', dis: f.uDem.length >= 3 ? 'Уже составлены' : null, fn: () => G.modal({ title: 'Требования', face, text: 'Что требуем? (всего до 3)', opts: DEMANDS.filter(d => f.uDem.indexOf(d) < 0).slice(0, 4).map(d => ({ t: d, fn: () => { f.uDem.push(d); G.fx({ mood: 2, cons: 1 }); msg('В требования внесено: «' + d + '». Семёныч записал мелким почерком.'); sp(); back(); } })).concat([{ t: 'Назад', fn: back }]) }) },
        { t: '🥛 Объявить «забастовку кружек»', dis: f.uSig < 25 || f.uDem.length < 2 ? 'Нужно 25 подписей и 2 требования' : (f.uLast !== undefined && G.week() - f.uLast < 8 ? 'Рано — отдохнуть 8 недель' : null), fn: () => {
          f.uLast = G.week(); const p = C(30 + f.uSig / 2 + s.st.coll / 3 - s.st.boss / 6, 15, 85), r = Math.random() * 100;
          if (r < p * 0.6) { f.uWins = (f.uWins || 0) + 1; s.pay.acc += 4000; G.fx({ coll: 10, cool: 5, boss: -4, mood: 10 }); G.modal({ title: 'ПОБЕДА', face, text: 'Весь цех встал и… начал пить чай из своих кружек. Начальство в панике увеличило кружки и выписало премию. Ты — герой дня.', opts: [{ t: 'Ура!', fn: () => {} }] }); if (G.boardAdd) G.boardAdd('Организатор «забастовки кружек»: кружки теперь большие', 'good'); G.rumor('strike', 'Цех гудит о твоей забастовке кружек. Рабочие носят тебя на руках.', { coll: 3 }, 90); G.achieve('strike_win', 'Победа забастовки кружек'); }
          else if (r < p) { G.fx({ coll: 5, boss: -6, mood: 3 }); msg('Забастовка частично удалась: кружки заменили, остальное «рассмотрят». Щиплен смотрит на тебя недобро.', 'warn'); }
          else { G.fx({ rep: 1, boss: -10, coll: -4, mood: -8 }); const fine = G.ri(500, 1500); G.fx({ money: -fine }); msg('Забастовка провалилась: все спрятали кружки и сделали вид, что не при чём. Выговор и штраф ' + G.rub(fine) + '.', 'bad'); if (!G.checkEnd() && (s.car.rep >= 3 || G.chance(G.fireRisk() / 2 + 15))) { G.info('УВОЛЕН', 'Организатор незаконной забастовки уволен приказом по заводу.', () => G.end('fired')); } }
          sp(2); } },
        { t: '👑 Стать председателем профкома', dis: (f.uWins || 0) < 2 || f.uSig < 50 ? 'Нужно 2 победы и 50 подписей' : null, fn: () => G.end('union_leader') },
        { t: 'Уйти', fn: () => {} }
      ] });
    };

    // ---------- Подработки: мини-игры «Шов» и «Допуски»
    G.sideGame = function (kind, cb) {
      const root = document.getElementById('app'); if (!root) return cb(0.5);
      const ov = document.createElement('div'); ov.className = 'gym-ov'; const box = document.createElement('div'); box.className = 'gym-box'; ov.appendChild(box); root.appendChild(ov);
      const fin = sc => { ov.remove(); cb(sc); };
      if (kind === 'weld') {
        let x = 0.5, v = 0, inz = 0, tot = 0, last = 0, t0 = 0; const T = 9;
        box.innerHTML = '<h3>🔥 СВАРИ ШОВ</h3><div class="gym-info">Держи горелку в зелёной зоне. ◀ ▶ подруливают — шов уводит в сторону!</div><div class="gym-track"><div class="gym-zone" style="left:36%;width:28%"></div><div class="gym-mark" id="sw-m"></div></div><div class="gym-rep" id="sw-t">9.0 с</div><div class="fi-btns"><button class="btn big" id="sw-l">◀</button><button class="btn big" id="sw-r">▶</button></div>';
        const m = box.querySelector('#sw-m'), tt = box.querySelector('#sw-t');
        box.querySelector('#sw-l').onclick = () => { v -= 0.35; }; box.querySelector('#sw-r').onclick = () => { v += 0.35; };
        const loop = ts => { if (!t0) { t0 = ts; last = ts; } const dt = Math.min(0.05, (ts - last) / 1000); last = ts; const el = (ts - t0) / 1000;
          v += (Math.random() - 0.5) * 6 * dt; v *= 0.985; x += v * dt; if (x < 0) { x = 0; v = Math.abs(v) * 0.5; } if (x > 1) { x = 1; v = -Math.abs(v) * 0.5; }
          tot += dt; if (Math.abs(x - 0.5) <= 0.14) inz += dt; m.style.left = (x * 100) + '%'; tt.textContent = Math.max(0, T - el).toFixed(1) + ' с';
          if (el >= T) fin(tot ? inz / tot : 0); else requestAnimationFrame(loop); };
        requestAnimationFrame(loop);
      } else {
        let i = 0, ok = 0, timer = null; const N = 10;
        box.innerHTML = '<h3>📏 ДОПУСКИ</h3><div class="gym-info">Эталон 10.00 мм, допуск ±0.05. Годен или брак? Время идёт!</div><div class="gym-rep" id="td-s" style="font-size:30px"></div><div class="gym-rep" id="td-r">&nbsp;</div><div class="fi-btns"><button class="btn big" id="td-g">✅ ГОДЕН</button><button class="btn big" id="td-b">❌ БРАК</button></div>';
        const sz = box.querySelector('#td-s'), rs = box.querySelector('#td-r'); let good = true, lock = false;
        const next = () => { if (i >= N) return fin(ok / N); lock = false; const d = Math.round(Math.random() * 12) / 100 * (Math.random() < 0.5 ? -1 : 1); good = Math.abs(d) <= 0.05; sz.textContent = (10 + d).toFixed(2) + ' мм'; rs.innerHTML = '&nbsp;'; timer = setTimeout(() => ans(null), Math.max(900, 1800 - i * 90)); };
        const ans = c => { if (lock) return; lock = true; clearTimeout(timer); if (c === good) { ok++; rs.textContent = 'Верно'; rs.className = 'gym-rep good'; } else { rs.textContent = c === null ? 'Не успел' : 'Ошибка'; rs.className = 'gym-rep bad'; } i++; setTimeout(next, 350); };
        box.querySelector('#td-g').onclick = () => ans(true); box.querySelector('#td-b').onclick = () => ans(false); next();
      }
    };
    const CUST = ['Заказчик: «Нужен шов на мангале, чтобы выдержал тёщу».', 'Заказчик: «Детали для самовара-вездехода».', 'Заказчик: «Калитка, которая сама закрывается — и открывается».', 'Заказчик: «Шестерня для кота-робота. Кот согласен».'];
    G.sideJob = function (kind, risky) {
      const s = G.s;
      G.modal({ title: kind === 'weld' ? 'Левый заказ: сварка' : 'Левый заказ: допуски', text: G.pick(CUST) + (risky ? '<br><i>Делать придётся в рабочее время. Рискованно, зато платят больше.</i>' : ''), opts: [
        { t: 'Приступить', fn: () => G.sideGame(kind, sc => {
          const base = kind === 'weld' ? G.ri(1800, 3500) : G.ri(1400, 2800), pay = Math.round(base * (0.3 + 0.9 * sc) * (risky ? 1.5 : 1));
          G.fx({ money: pay, energy: -12, mood: sc >= 0.6 ? 3 : -2 }); msg(sc >= 0.8 ? 'Работа сделана на отлично. Заказчик платит и целует руку.' : sc >= 0.5 ? 'Работа сделана «в целом». Заказчик заплатил с лёгким вздохом.' : 'Получилось криво. Заказчик заплатил из жалости.', sc >= 0.5 ? 'good' : 'warn');
          if (sc >= 0.95) G.achieve('golden', 'Золотые руки');
          if (risky && G.chance((F().chiefLoy || 0) >= 40 ? 12 : 30)) { G.fx({ boss: -6 }); G.punish({ risk: 100, what: 'Левый заказ в рабочее время', fine: [300, 800], sev: 1 }); }
          sp(3); }) },
        { t: 'Отказаться', fn: () => {} }
      ] });
    };
    const pickJob = risky => G.modal({ title: 'Подработка', text: 'Что берёшь?', opts: [{ t: '🔥 Сварить шов', fn: () => G.sideJob('weld', risky) }, { t: '📏 Подобрать допуски', fn: () => G.sideJob('tol', risky) }, { t: 'Передумал', fn: () => {} }] });
    A('side_work', { ph: ['work'], loc: 'shop', g: 'Левые заказы', n: 'Левый заказ в рабочее время', i: '🤫', menu: true, once: 'day', fn: () => { pickJob(true); return 'custom'; } });
    A('side_home', { ph: ['free'], loc: 'home', g: 'Подработка', n: 'Халтура на дому', i: '🛠️', menu: true, once: 'day', fn: () => { pickJob(false); return 'custom'; } });

    // ---------- Быт: обустройство комнаты и кот Чугунок
    const UPG = [['mattress', '🛏 Новый матрас (энергия по утрам +6)', 3500], ['wallpaper', '🖼 Обои и занавески (настроение +2 в день)', 2500], ['heater', '🔥 Обогреватель (здоровье и настроение +1)', 5000], ['plant', '🪴 Фикус «Геннадий» (настроение +1)', 800], ['kettle', '🫖 Чайник и плитка (кнопка «Чай с печеньем»)', 1500], ['tv', '📺 Телевизор (кнопка «Смотреть телевизор»)', 8000]];
    G.roomMenu = function () {
      const s = G.s, f = F(); f.room = f.room || {};
      G.modal({ title: 'Обустроить комнату', text: 'Деньги: <b>' + G.rub(s.money) + '</b>. Что купишь?', opts: UPG.map(u => ({ t: u[1] + ' — ' + G.rub(u[2]), dis: f.room[u[0]] ? 'Куплено' : s.money < u[2] ? 'Нет денег' : null, fn: () => {
        G.addMoney(-u[2]); f.room[u[0]] = 1; G.fx({ mood: 4 }); msg('Куплено: ' + u[1].replace(/\s*\(.*$/, '') + '. Комната становится человеческой.', 'good');
        if (Object.keys(f.room).length >= 4) G.achieve('home4', 'Хозяин комнаты'); sp(); G.roomMenu();
      } })).concat([{ t: 'Выйти', fn: () => {} }]) });
    };
    A('room', { ph: ['free'], loc: 'home', g: 'Быт', n: 'Обустроить комнату', i: '🏠', menu: true, fn: () => { G.roomMenu(); return 'custom'; } });
    A('tv', { ph: ['free'], loc: 'home', g: 'Быт', n: 'Смотреть телевизор', i: '📺', h: 2, fx: { mood: 8, energy: 3, satiety: -2 }, txt: 'Идёт передача про станки, которые ходят в гости. Ты не заметил, как прошёл вечер.', req: s => !(s.flags.room || {}).tv ? 'Нет телевизора' : null });
    A('tea', { ph: ['free'], loc: 'home', g: 'Быт', n: 'Чай с печеньем (30 ₽)', i: '🫖', h: 1, fx: { mood: 3, satiety: 8, energy: 2, money: -30 }, txt: 'Чай, печенье и тишина. Лучшая смена за день.', req: s => !(s.flags.room || {}).kettle ? 'Нет чайника' : s.money < 30 ? 'Нет денег' : null });
    A('cat_take', { ph: ['free'], loc: 'home', g: 'Чугунок', n: 'Приютить кота Чугунка (500 ₽)', i: '🐈', menu: true, req: s => s.flags.cat ? 'Он уже у тебя' : s.car.shifts < 8 ? 'Пока не знакомы' : s.money < 500 ? 'Нет денег' : null, fn: () => { G.addMoney(-500); F().cat = 1; F().catLove = 5; F().catFed = G.s.t.day; G.fx({ mood: 10 }); G.modal({ title: 'Чугунок', face: 'chugunok', text: 'Рыжий кот влез в комнату и сел на твою подушку. «Теперь я здесь главный начальник уюта», — читается в его взгляде.', opts: [{ t: 'Принять', fn: () => {} }] }); sp(); return 'custom'; } });
    A('cat_feed', { ph: ['free'], loc: 'home', g: 'Чугунок', n: 'Покормить Чугунка (100 ₽)', i: '🥫', once: 'day', fx: { mood: 2, money: -100 }, txt: 'Чугунок ел так, будто это его последний завтрак перед командировкой.', fn: s => { s.flags.catFed = s.t.day; s.flags.catLove = Math.min(100, (s.flags.catLove || 0) + 3); }, req: s => !s.flags.cat ? 'Нет кота' : s.money < 100 ? 'Нет денег' : null });
    A('cat_play', { ph: ['free'], loc: 'home', g: 'Чугунок', n: 'Поиграть с Чугунком', i: '🧶', h: 1, once: 'day', fx: { mood: 6, energy: 1 }, txt: 'Чугунок ловил твой шнурок, потом твоё внимание, потом тебя.', fn: s => { s.flags.catLove = Math.min(100, (s.flags.catLove || 0) + 2); }, req: s => !s.flags.cat ? 'Нет кота' : null });

    // ---------- Сюжетные арки с абсурдом
    const ARCS = {
      lyudka: { title: 'Борщ с последствиями', need: 25, steps: [
        { t: 'Людка зовёт в подсобку: «Я придумала новый борщ. На нём можно жениться. Попробуешь?»', o: [['Попробовать', 'Борщ оказался таким, что ты на минуту забыл про зарплату. Людка сияет.', { mood: 8, satiety: 10, rel: { lyudka: 8 } }, 'borsch'], ['Отказаться вежливо', 'Людка обиделась на половник. Половник — на тебя.', { rel: { lyudka: -4 } }, 'no']] },
        { t: 'Людка: «Я открываю кафе. Нужен партнёр. Подносы нести умеешь?»', o: [['Вложиться (3 000 ₽)', 'Кафе «Борщ и Ко» открылось на заднем дворе. Первая прибыль — компот.', { money: -3000, mood: 6, rel: { lyudka: 10 } }, 'cafe'], ['Отказаться', 'Людка вздохнула: «Ладно, сама. С котом».', { rel: { lyudka: -3 } }, 'no2']] }] },
      alevtina: { title: 'Больничный роман', need: 20, steps: [
        { t: 'Алевтина: «Давайте я вас обследую по полной программе. Мне кажется, у вас подозрительно хорошее здоровье».', o: [['Пройти обследование (500 ₽)', 'Обследование заняло час. Диагноз: «слишком здоров для такой работы». Алевтина записала телефон.', { money: -500, health: 8, rel: { alevtina: 8 } }, 'check'], ['Сказать, что здоров', '«Все так говорят. Потом приходят», — вздохнула Алевтина.', { rel: { alevtina: -3 } }, 'no']] },
        { t: 'Алевтина тайком достаёт справку: «Здесь написано, что вам нужно отдохнуть на этой неделе. Печать настоящая».', o: [['Взять справку', 'Ты взял день отгула «по состоянию здоровья». Начальство хмурится, но печать — печать.', { energy: 25, mood: 10, boss: -3, rel: { alevtina: 8 } }, 'cert'], ['Отказаться', 'Алевтина убрала справку. «Подумай, пока не поздно».', { rel: { alevtina: -2 } }, 'no2']] }] },
      allochka: { title: 'Выборы Аллочки', need: 15, steps: [
        { t: 'Аллочка шепчет: «Я баллотируюсь в «Королеву заводоуправления». Нужна агитация. Поможешь?»', o: [['Агитировать за неё', 'Ты развесил листовки с её лицом по всему цеху. Станок №3 тоже проголосовал.', { coll: 3, rel: { allochka: 8 } }, 'for'], ['Агитировать против', 'Ты распространял слухи, что у неё нет чувства юмора. Теперь у неё есть желание отомстить.', { boss: 3, rel: { allochka: -10 } }, 'against']] },
        { t: 'Итоги выборов: Аллочка…', o: [['Узнать результат', '', {}, 'result']] }] }
    };
    const arcResult = (id) => { const f = F(); f.arcs = f.arcs || {}; const path = (f.arcPath || {})[id] || [];
      if (id === 'allochka') { const win = path[0] === 'for'; f.arcPath.allochka.push(win ? 'win' : 'lose'); if (win) { G.fx({ boss: 8, mood: 8, rel: { allochka: 8 } }); msg('Аллочка победила и стала Королевой! Теперь письма директору проходят через неё — в твою пользу.', 'good'); G.achieve('arc_all', 'Придворный Королевы'); } else { G.fx({ boss: -3, mood: -3, rel: { allochka: -6 } }); msg('Аллочка проиграла и записала твоё имя красной помадой в «чёрный список».', 'bad'); } }
    };
    const _sp5 = G.npcSpecial;
    G.npcSpecial = function (id) {
      const o = _sp5.apply(this, arguments), f = F();
      if (id === 'semyonych' && G.s.car.union) o.push({ t: '📋 Профсоюзная работа', fn: () => G.unionMenu() });
      const a = ARCS[id]; f.arcs = f.arcs || {}; f.arcPath = f.arcPath || {}; f.arcWeek = f.arcWeek || {};
      if (a && (f.arcs[id] || 0) < a.steps.length && G.R(id).l >= a.need && f.arcWeek[id] !== G.week()) o.push({ t: '📖 Сюжет: ' + a.title, fn: () => {
        const k = f.arcs[id] || 0, st = a.steps[k]; f.arcWeek[id] = G.week();
        G.modal({ title: D.NPC[id].name + ': ' + a.title, face: id, text: st.t, opts: st.o.map(op => ({ t: op[0], fn: () => {
          f.arcs[id] = k + 1; (f.arcPath[id] = f.arcPath[id] || []).push(op[3]); if (op[1]) msg(op[1], op[2].rel && Object.values(op[2].rel)[0] < 0 ? 'bad' : 'good'); G.fx(op[2], { npc: id });
          if (op[3] === 'cafe') { f.cafe = 1; G.achieve('cafe', 'Совладелец «Борща и Ко»'); }
          if (op[3] === 'result') arcResult(id); sp();
        } })) });
      } });
      return o;
    };

    // ---------- Ежедневные эффекты: комната, кот, кафе
    const _dt4 = G.dailyTick;
    G.dailyTick = function () {
      const r = _dt4.apply(this, arguments), s = G.s, f = s.flags, room = f.room || {};
      if (room.mattress) s.st.energy = C(s.st.energy + 6);
      if (room.wallpaper) s.st.mood = C(s.st.mood + 2);
      if (room.heater) { s.st.health = C(s.st.health + 1); s.st.mood = C(s.st.mood + 1); }
      if (room.plant) s.st.mood = C(s.st.mood + 1);
      if (f.cafe) { G.addMoney(200); if (G.chance(20)) msg('Кафе «Борщ и Ко» принесло 200 ₽ прибыли. И один компот в подарок.', 'good'); }
      if (f.cat) {
        s.st.mood = C(s.st.mood + 2);
        if (f.catFed !== undefined && s.t.day - f.catFed >= 2) { f.catLove = Math.max(0, (f.catLove || 0) - 3); s.st.mood = C(s.st.mood - 2); msg('Чугунок смотрит с укоризной. Миска пустая.', 'bad'); }
        else if (G.chance(15)) { const g = G.pick([() => { G.addMoney(200); return 'Чугунок притащил тебе 200 ₽. Откуда — не уточняет.'; }, () => { G.give('choco', 1); return 'Чугунок принёс шоколадку. Видимо, украл у Людки.'; }, () => 'Чугунок принёс мёртвую мышь и положил на подушку. Это любовь.']); msg(g(), 'good'); }
        if ((f.catLove || 0) >= 30) G.achieve('cat30', 'Хозяин кота: Чугунок доверяет');
      }
      return r;
    };
  })();


  // ======================= v1.9: показатели завода, концовки и наследие, звук, сезоны, обучение =======================
  (function () {
    const D = G.D, C = G.clamp, msg = (t, c) => G.toast(t, c), K = G.career;
    const F = () => G.s.flags;
    // ---------- Звук (синтез, без файлов) и музыка
    if (G.settings.music === undefined) G.settings.music = false;
    let ac = null;
    const actx = () => { try { if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ac = new AC(); } if (ac.state === 'suspended') ac.resume(); return ac; } catch (e) { return null; } };
    const tone = (f, t0, d, type, vol) => { const c = actx(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0; o.type = type || 'square'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.07, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.03); };
    const SFX = { tick: [[880, 0, 0.05, 'square', 0.04]], click: [[300, 0, 0.03, 'square', 0.06]], good: [[660, 0, 0.08], [880, 0.09, 0.12]], bad: [[220, 0, 0.15, 'sawtooth'], [165, 0.14, 0.2, 'sawtooth']], warn: [[440, 0, 0.1], [440, 0.14, 0.1]], coin: [[988, 0, 0.07], [1319, 0.07, 0.14]], horn: [[110, 0, 0.8, 'sawtooth', 0.09], [165, 0, 0.8, 'sawtooth', 0.05]], punch: [[120, 0, 0.1, 'square', 0.12]] };
    G.sfx = function (k) { if (!G.settings.sound) return; try { (SFX[k] || []).forEach(a => tone(a[0], a[1], a[2], a[3], a[4])); } catch (e) {} };
    const _buzz = G.buzz; G.buzz = function (kind) { try { G.sfx(({ light: 'tick', success: 'good', error: 'bad', warning: 'warn' })[kind] || 'tick'); } catch (e) {} return _buzz.apply(this, arguments); };
    const _toast = G.toast; G.toast = function (text, cls) { try { if (cls === 'good') G.sfx('good'); else if (cls === 'bad') G.sfx('bad'); } catch (e) {} return _toast.apply(this, arguments); };
    let mus = null;
    G.musicOn = function () { if (mus || !G.settings.music) return; mus = setInterval(() => { if (!G.settings.music) { clearInterval(mus); mus = null; return; } const b = [55, 55, 82, 73][Math.floor(Date.now() / 2000) % 4]; tone(b, 0, 1.6, 'sawtooth', 0.02); tone(b * 2, 0.8, 0.12, 'square', 0.015); }, 2000); };
    document.addEventListener('pointerdown', () => { actx(); G.musicOn(); });
    window.addEventListener('load', () => { if (G.ui && G.ui.toggle) { const t = G.ui.toggle; G.ui.toggle = function (k) { const r = t.apply(this, arguments); if (k === 'music') G.musicOn(); if (k === 'sound') G.sfx('good'); return r; }; } });
    const _gp = G.gatePass; if (_gp) G.gatePass = function () { G.sfx('click'); setTimeout(() => G.sfx('horn'), 150); return _gp.apply(this, arguments); };

    // ---------- Показатели завода: план, настроение цеха, состояние (plant)
    G.plantStats = function () { const s = G.s, f = s.flags; if (f.plan === undefined) f.plan = 50; if (f.shopMorale === undefined) f.shopMorale = 50; return { plant: Math.round(s.world.plant), plan: Math.round(f.plan), morale: Math.round(f.shopMorale) }; };
    const plantDaily = () => {
      const s = G.s, f = s.flags; G.plantStats();
      f.plan = C(f.plan + ((100 - s.machine.wear) - 50) / 25 + (s.st.energy > 50 ? 1 : 0) - (s.day.viol ? 1 : 0) - (f.uLast !== undefined && G.week() - f.uLast < 1 ? 8 : 0) + (f.ws || 0) * 0.3);
      f.shopMorale = C(f.shopMorale + ((s.st.coll + s.st.mood) / 2 - f.shopMorale) / 6);
      if (G.weekday() === 0) {
        const sc = (f.plan + f.shopMorale + s.world.plant) / 3;
        if (sc >= 70) { s.pay.acc += 3000; G.fx({ boss: 3, mood: 4 }); msg('🏭 Завод перевыполнил план: премия 3 000 ₽ всем, и тебе тоже.', 'good'); }
        else if (sc <= 30) { s.pay.pen += 2000; G.fx({ boss: -3, mood: -3 }); s.world.plant = C(s.world.plant - 3); msg('🏭 Комиссия недовольна планом: премию сняли (−2 000 ₽).', 'bad'); }
        s.world.plant = C(s.world.plant + (f.plan - 50) / 25 + (f.shopMorale - 50) / 50);
        f.prosperWeeks = (f.plan >= 85 && f.shopMorale >= 75 && s.world.plant >= 80) ? (f.prosperWeeks || 0) + 1 : 0;
        if (f.prosperWeeks >= 4 && !s.end) G.info('🏭 ЗАВОД ПРОЦВЕТАЕТ', 'Четыре недели подряд план перевыполнен, цех поёт, станки гудят. Генеральный директор лично пожал тебе руку.', () => G.end('prosper'));
      }
    };

    // ---------- Новые концовки и режим наследия
    D.ENDINGS.prosper = { e: '🏭', t: 'ЗАВОД ПРОЦВЕТАЕТ', x: 'План перевыполнен, кружки большие, станки сыты, кот Чугунок возглавил совет директоров. Ты — легенда завода. Труханов завидует.' };
    D.ENDINGS.legend_board = { e: '🏆', t: 'ЛЕГЕНДА ДОСКИ ПОЧЁТА', x: 'Твоё фото висит на доске почёта десять лет. Люди приходят смотреть. Иногда кланяются. Егорыч пропускает без пропуска.' };
    D.ENDINGS.business = { e: '💼', t: 'УШЁЛ В БИЗНЕС', x: 'Ты уволился красиво, открыл дело и стал тем, на кого раньше писал докладные. Щиплен приходит просить в долг. Ты улыбаешься и наливаешь.' };
    A('future', { ph: ['free'], loc: 'home', g: 'Будущее', n: 'Подумать о будущем', i: '🔮', menu: true, fn: () => {
      const s = G.s, f = s.flags, goods = (f.board || []).filter(e => e.k === 'good').length, ach = Object.keys(s.ach).length;
      G.modal({ title: 'Что дальше?', text: 'Можно остаться, а можно завершить историю по-своему.', opts: [
        { t: '💼 Уйти в бизнес', dis: s.money < 300000 && !(f.cafe && s.money >= 100000) ? 'Нужно 300 000 ₽ (или кафе и 100 000 ₽)' : null, fn: () => G.end('business') },
        { t: '🏆 Остаться легендой доски', dis: goods < 6 || ach < 12 ? 'Нужно 6 записей на доске и 12 достижений' : null, fn: () => G.end('legend_board') },
        { t: 'Пока не время', fn: () => {} }
      ] }); return 'custom'; } });
    const LEG = { union_leader: s => { s.flags.uSig = 10; }, legend_board: s => { s.flags.str = 10; }, business: s => { s.money += 10000; }, quit_legend: s => { s.st.cool += 10; }, blogger: s => { s.st.coll += 10; }, prosper: s => { s.st.boss += 10; }, married: s => { s.st.mood += 5; } };
    const _ns = G.newState;
    G.newState = function () {
      const s = _ns.apply(this, arguments);
      try { const r = JSON.parse(localStorage.getItem(G.REC_KEY) || '{}'), ends = Object.keys(r.ends || {}); if (ends.length) { s.money += Math.min(8000, ends.length * 1000); ends.forEach(e => { if (LEG[e]) LEG[e](s); }); s.flags.legacy = ends.length; } } catch (e) {}
      return s;
    };

    // ---------- Сезонный рейтинг (клиентская часть)
    const seasonId = () => new Date().toISOString().slice(0, 7);
    const SK = 'cv_season_v1';
    const sRead = () => { try { return JSON.parse(localStorage.getItem(SK) || '{}'); } catch (e) { return {}; } };
    G.seasonBest = function () { const r = sRead(), id = seasonId(); return r.id === id ? (r.best || 0) : 0; };
    G.seasonText = function () { const MN = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']; const d = new Date(); return '🏁 Сезон: ' + MN[d.getMonth()] + ' ' + d.getFullYear() + ' · твой лучший результат сезона: <b>' + G.seasonBest() + '</b>' + (G.s && G.s.flags.lastSeason ? ' · прошлый сезон: ' + G.s.flags.lastSeason : ''); };
    const seasonTick = () => {
      if (!G.s || G.s.phase === 'new') return;
      const id = seasonId(), r = sRead(), sc = G.ojScore();
      if (r.id && r.id !== id) {
        const b = r.best || 0, medal = b >= 9000 ? 'Золото' : b >= 5000 ? 'Серебро' : b >= 2000 ? 'Бронза' : null;
        G.s.flags.lastSeason = b + (medal ? ' (' + medal + ')' : '');
        if (medal) G.achieve('season_' + r.id, 'Сезон ' + r.id + ': ' + medal);
        msg('🏁 Новый сезон! Прошлый: ' + b + (medal ? ' — ' + medal : '') + '.', 'good'); r.best = 0;
      }
      r.id = id; r.best = Math.max(r.best || 0, sc); try { localStorage.setItem(SK, JSON.stringify(r)); } catch (e) {}
    };
    if (G.lb && G.lb.payload) { const _p = G.lb.payload; G.lb.payload = function () { const o = _p.apply(this, arguments); o.season = seasonId(); o.seasonBest = G.seasonBest(); return o; }; }

    // ---------- Обучение для новичков (первые смены)
    const TUT = [
      { c: s => s.car.shifts === 0 && s.phase === 'morning', t: '👋 Добро пожаловать на завод', x: 'Утро: умойся и почисти зубы, поешь, потом жми «ИДТИ НА РАБОТУ». На проходной тебя встретит Егорыч: пьяным, грязным и с похмелья он не пустит.' },
      { c: s => s.car.shifts === 0 && s.phase === 'work', t: '⚙ Работа', x: 'Каждая операция тратит время и энергию. В мини-играх тапай точно. В 12:00 обед. Следи за шкалами: красные цифры над экраном показывают, что ты потерял.' },
      { c: s => s.car.shifts === 1 && s.phase === 'morning', t: '🤝 Люди', x: 'В «Цехе» стоят Щиплен (начальник, любит подарки и уважение) и Дудукин (мастер, любит инициативу). Серёга и Афоня в «Коллегах». Внизу «Цеха» — доска завода со слухами.' },
      { c: s => s.car.shifts === 2 && s.phase === 'morning', t: '📅 Среда и вечера', x: 'По средам приходит Надежда Николаевна: готовься к мини-экзамену. Вечерами: качалка, подработка, комната, кот. Не забывай мыться и чистить зубы.' }
    ];
    const tutorial = () => {
      const s = G.s; if (!s || !G.settings.tips || s.end || s.phase === 'new') return;
      const f = s.flags, i = f.tut || 0, st = TUT[i]; if (!st || !st.c(s)) return;
      f.tut = i + 1; const lg = f.legacy ? '<br><i>Наследие прошлых жизней: +' + Math.min(8000, f.legacy * 1000) + ' ₽ и бонусы.</i>' : '';
      G.modal({ title: st.t, text: st.x + (i === 0 ? lg : ''), opts: [{ t: 'Понятно', fn: () => {} }] });
    };

    // ---------- Подключение к ежедневным хукам
    const _kh2 = K.hook; K.hook = function () { const r = _kh2.apply(this, arguments); try { seasonTick(); tutorial(); } catch (e) {} return r; };
    const _dt5 = G.dailyTick; G.dailyTick = function () { const r = _dt5.apply(this, arguments); try { plantDaily(); } catch (e) {} return r; };
    // Сводка завода на доске
    const _hb = G.honorBoard; G.honorBoard = function () { try { const p = G.plantStats(); G.toast('🏭 Завод: состояние ' + p.plant + ' · план ' + p.plan + ' · цех ' + p.morale); } catch (e) {} return _hb.apply(this, arguments); };
  })();

})();
