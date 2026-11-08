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
      o.push({ t: '💵 Сунуть Егорычу взятку', fn: () => bribe() });
      o.push({ t: '🧗 Через забор (50 на 50)', fn: () => fence() });
      o.push({ t: '🏠 Домой привести себя в порядок (потеряешь пару часов)', fn: () => { G.advance(2); G.fx({ boss: -2, mood: -2 }); G.toast('Егорыч: «Иди-иди. Вернёшься человеком — поговорим». Время уходит, начальство косится.'); } });
      o.push({ t: '🤒 Домой и взять больничный (800 ₽)', dis: s.money < 800 ? 'Нет денег' : null, fn: () => sickHome() });
      o.push({ t: '🚫 Прогул (это увольнение!)', fn: () => truancy() });
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
      if (G.chance(50)) { G.fx({ cool: 3, mood: 2 }); G.toast('Перелез через забор. Егорыч в будке смотрит в другую сторону. Принципиально.', 'good'); if (G.rumor) G.rumor('fence', 'Говорят, ты перелез через забор на проходной. Егорыч это отрицает.', { cool: 3, boss: -1 }, 70); pass(); }
      else {
        G.fx({ boss: -4, mood: -4 }); G.punish({ risk: 100, what: 'Лез через забор на территорию', fine: [100, 300], sev: 1 });
        G.boardAdd('Некто застрял в заборе. Забор утверждает, что сам пострадал', 'bad'); G.toast('Застрял в заборе. Егорыч с наслаждением вызвал охрану.', 'bad'); pass();
      }
    };
    const bribe = () => {
      const B = [['💵 50 ₽ и улыбка', 50, 0.35, null], ['💵 100 ₽ на чай', 100, 0.55, null], ['💵 300 ₽', 300, 0.85, null], ['💵 1 000 ₽ в конверте', 1000, 1, null], ['🚬 Пачка сигарет', 0, 0.8, 'cigs'], ['🍫 Шоколадка', 0, 0.6, 'choco'], ['🍺 Пиво', 0, 0.75, 'beer'], ['🍾 Водка', 0, 1, 'vodka']];
      G.modal({ title: 'Взятка Егорычу', face: 'egorych', wide: true, text: 'Чем «поблагодаришь»? Чем лучше «благодарность», тем выше шанс.', opts: B.map(o => ({ t: o[0], dis: o[3] ? (G.has(o[3]) ? null : 'Нет в рюкзаке') : (s.money < o[1] ? 'Нет денег' : null), fn: () => {
        if (G.chance(o[2] * 100)) { if (o[3]) G.give(o[3], -1); else G.addMoney(-o[1]); G.relAdd('egorych', 2); G.fx({ cons: -2 }); G.toast(G.pick(['Егорыч незаметно убрал подношение: «Проходи. Я ничего не видел. И ты тоже».', 'Подношение исчезло в ящике. «Только быстро, пока я добрый».', 'Егорыч кивнул на дверь: «Иди, студент. И не дыши на людей».']), 'good'); s.flags.egGifts = (s.flags.egGifts || 0) + 1; if (G.boardAdd) G.boardAdd('Проходная «решает вопросы»', 'bad'); pass(); }
        else { G.relAdd('egorych', -1); G.toast('Егорыч оскорблённо отодвинул: «Это что, на чай? Я не нищий!» Мало.', 'bad'); menu('«Оскорблять вахтёра подачкой — это надо уметь».'); } } })).concat([{ t: 'Назад', fn: () => menu() }]) });
    };
    const sickHome = () => { G.addMoney(-800); s.car.sickUntil = Math.max(s.car.sickUntil || -1, s.t.day); s.phase = 'weekend'; s.t.hour = 9; s.loc = 'home'; s.day.sick = true; G.toast('🤒 Взял больничный (справка у знакомого врача). Сегодня свободный день.', 'warn'); if (G.ui && G.ui.render) G.ui.render(); };
    const truancy = () => G.modal({ title: 'Прогул', face: 'egorych', text: 'Прогул — это увольнение. Точно?', opts: [{ t: 'Назад', fn: () => menu() }, { t: 'Да, прогулять', fn: () => G.end('fired') }] });
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


  // ======================= v2.0: карьерные ступени, Кулежов, главный инженер, управление =======================
  (function () {
    const D = G.D, C = G.clamp, K = G.career, msg = (t, c) => G.toast(t, c), sp = n => G.spend(n || 1);
    const F = () => G.s.flags;

    // ---------- Новые персонажи: Кулежов (зам. начальника цеха) и главный инженер
    const AT = (loc, p) => ({ loc, days: [0, 1, 2, 3, 4], p });
    const LIES = [
      ['«Я вчера обедал с министром. Он отдал мне свой суп: «Ешь, Андрей, ты нужнее».»', 'Поверить', 'Усомниться', 'Попросить познакомить'],
      ['«Я раньше был космонавтом. Просто в космос не взяли: я на земле нужнее».', 'Поверить', 'Усомниться', 'Спросить про скафандр'],
      ['«В детстве я починил экскаватор взглядом. Он до сих пор меня слушается».', 'Поверить', 'Усомниться', 'Позвать к станку'],
      ['«У меня три гаража. В одном — гараж. В другом — гараж. Третий — секрет».', 'Поверить', 'Усомниться', 'Попросить показать'],
      ['«Гагарин мне звонил. По ошибке, но я ответил».', 'Поверить', 'Усомниться', 'Спросить, о чём говорили'],
      ['«Вчера победил медведя. Он первым начал. Теперь он в нашем профсоюзе».', 'Поверить', 'Усомниться', 'Предложить вступить в профсоюз самому'],
      ['«Я недавно купил завод. Но передумал. Мне вернули деньги с процентами и извинениями».', 'Поверить', 'Усомниться', 'Спросить адрес завода'],
      ['«Мне предлагали стать министром. Но у нас зарплата выше».', 'Поверить', 'Усомниться', 'Попросить рекомендацию']
    ];
    const talkOf = (id, lie) => ({ t: 'Кулежов, не моргая: ' + lie[0], o: [[lie[1], 'Кулежов расцветает: «Вот! Человек с воображением!» Он запомнил тебя с хорошей стороны.', { mood: 2, boss: 1, rel: { [id]: 3 } }], [lie[2], 'Кулежов вздохнул: «Ты просто не видел жизни. Но ладно, я не обиделся. Ну… почти».', { mood: -1, rel: { [id]: -2 } }], [lie[3], 'Он сменил тему, как переключают станок: мгновенно и без предупреждения. Но ты не спишь.', { mood: 3, cool: 1, rel: { [id]: 1 } }]] });
    const NP = {
      kulezhov: { name: 'Кулежов А.', full: 'Кулежов Андрей', age: 38, role: 'Зам. начальника цеха', color: '#a8d',
        ap: { skin: '#e8c4a8', shape: 'oval', hair: 'bangs', hc: '#2a2a2a', brow: 'light', eyes: 'norm', nose: 'small', mouth: 'smile', glasses: 'none', cloth: '#5a4a6a', collar: 'none', extra: [] },
        at: AT('shop', 0.8), likes: ['cognac', 'cigs', 'env1'], dislikes: [], rel: 0, talk: [] },
      rassvetov: { name: 'Рассветов И. П.', full: 'Рассветов Игнат Платонович', age: 56, role: 'Главный инженер', color: '#7ad',
        ap: { skin: '#dcb899', shape: 'long', hair: 'bald', hc: '#888', brow: 'thick', eyes: 'tired', nose: 'small', mouth: 'flat', glasses: 'none', cloth: '#3a4a5f', collar: 'none', extra: [] },
        at: AT('admin', 0.6), likes: ['cognac', 'choco'], dislikes: [], rel: 0,
        talk: [
          { t: 'Рассветов не поднимает глаз от чертежа: «Допуск — это не пожелание. Допуск — это закон природы».', o: [['Согласиться', '«Приятно говорить с человеком, который слушает».', { know: 2, rel: { rassvetov: 4 } }], ['Пошутить про закон природы', '«Остроумие — хорошо. Но не в чертежах».', { rel: { rassvetov: -1 }, mood: 1 }]] },
          { t: '«Вы знаете, чем инженер отличается от мастера? Мастер чинит, а инженер — чтобы не чинить».', o: [['Записать цитату', 'Он удивлённо кивнул. Цитату, видимо, и правда стоит записать.', { know: 1, rel: { rassvetov: 3 } }], ['Спросить про премию', '«Премия — это производная от чертежа. Идите, читайте чертёж».', { mood: -1 }]] }
        ] }
    };
    LIES.forEach(l => NP.kulezhov.talk.push(talkOf('kulezhov', l)));
    Object.keys(NP).forEach(id => { if (!D.NPC[id]) D.NPC[id] = NP[id]; if (D.NPC_ORDER && D.NPC_ORDER.indexOf(id) < 0) D.NPC_ORDER.push(id); });

    G.kulezhovMenu = function () {
      const s = G.s, face = 'kulezhov', rel = () => G.R('kulezhov').l, back = () => G.kulezhovMenu();
      G.modal({ title: 'Кулежов А.', face, text: 'Кулежов поправляет галстук: «О, свои люди! Присаживайся, расскажу кое-что… и это почти правда».', opts: [
        { t: '🤥 Послушать историю', fn: () => { const l = G.pick(LIES); G.modal({ title: 'История Кулежова', face, text: l[0], opts: [[l[1], 'Он доволен. Теперь вы почти друзья.', { mood: 3, rel: { kulezhov: 4 } }], [l[2], 'Кулежов поднял бровь: «Проверь, проверь. Только мне потом не звони».', { mood: -1, rel: { kulezhov: -2 } }], [l[3], 'Он ушёл в туманные подробности. Ты вышел с ощущением, что тебя только что очень вежливо обманули.', { mood: 2, cool: 1 }]].map(o => ({ t: o[0], fn: () => { msg(o[1]); G.fx(o[2], { npc: 'kulezhov' }); sp(); } })) }); } },
        { t: '📈 Спросить про протекцию (повышение)', fn: () => { const r = Math.random(); if (r < 0.4 && rel() >= 10) { G.fx({ boss: 4 }); msg('Кулежов: «Говорил с директором!» — и правда что-то сказал. Начальство ждало, но вежливо.', 'good'); } else if (r < 0.85) { msg('«Я с директором на ты, всё решу». Через час директор спросил, кто это такой.'); } else { G.fx({ boss: -3 }); msg('Кулежов пошёл «решать» и случайно рассказал начальству, что ты хочешь его место.', 'bad'); } sp(); } },
        { t: '🔍 Поймать на вранье', fn: () => { if (G.chance(50)) { G.fx({ cons: 2, boss: 1, rel: { kulezhov: -4 } }, { npc: 'kulezhov' }); msg('Ты поймал Кулежова на противоречии. Он ответил: «Это не противоречие, это многогранность».', 'good'); } else { G.fx({ mood: -3, rel: { kulezhov: -3 } }, { npc: 'kulezhov' }); msg('Ты попытался поймать, но он вывернулся так, что виноватым оказался ты.', 'bad'); } sp(); } },
        { t: '🍻 Выпить за карьеру (300 ₽)', dis: s.money < 300 ? 'Нет денег' : null, fn: () => { G.fx({ money: -300, drunk: 8, mood: 4, rel: { kulezhov: 6 } }, { npc: 'kulezhov' }); msg(G.pick(['Кулежов за рюмкой выдал «страшную тайну»: директор, оказывается, боится котов. Чугунка, видимо, тоже.', 'Кулежов поклялся, что завтра станет директором. Через неделю напомнишь.']), 'good'); sp(); } },
        { t: 'Уйти', fn: () => {} }
      ] });
    };
    G.rassvetovMenu = function () {
      const s = G.s, face = 'rassvetov';
      G.modal({ title: 'Главный инженер', face, text: 'Рассветов отрывается от расчётов: «У вас вопрос по делу? Тогда проходите».', opts: [
        { t: '📐 Задать технический вопрос', fn: () => { G.fx({ know: 2, mood: 1 }); G.relAdd('rassvetov', 3); msg('Рассветов объяснил, как работает допуск и почему «на глаз» — это не метод. Ты запомнил половину.'); sp(); } },
        { t: '💡 Предложить рацпредложение', fn: () => { if (s.st.know >= 55 && G.chance(60)) { G.fx({ boss: 5, know: 2, bm: 4 }); G.relAdd('rassvetov', 5); msg('Рассветов внимательно изучил и сказал: «Это разумно. Оформляйте». Впервые за год.', 'good'); if (G.boardAdd) G.boardAdd('Рацпредложение одобрено главным инженером', 'good'); } else { G.fx({ mood: -2 }); msg('«Интересно, но без расчётов — не принимается». Ты ушёл с блокнотом и жаждой знаний.'); } sp(); } },
        { t: '🏛 Узнать про путь главного инженера', fn: () => { const ok = s.car.rank >= 8 && G.hasCert && G.hasCert('c_vo'); G.modal({ title: 'Путь главного инженера', face, text: ok ? '«У вас есть диплом и должность. Если рассчитываете на моё кресло — готовьтесь, я ещё лет пятнадцать».' : '«Нужны: диплом ВО, должность не ниже зама начальника цеха и мои хорошие отношения».', opts: [{ t: 'Понятно', fn: () => {} }] }); } },
        { t: 'Уйти', fn: () => {} }
      ] });
    };
    const SPECIAL20 = { kulezhov: () => [{ t: '🤥 Разговор с Кулежовым', fn: () => G.kulezhovMenu() }], rassvetov: () => [{ t: '📐 Технические вопросы', fn: () => G.rassvetovMenu() }] };
    const _sp20 = G.npcSpecial; G.npcSpecial = function (id) { const o = _sp20.apply(this, arguments); if (SPECIAL20[id]) SPECIAL20[id]().forEach(x => o.push(x)); return o; };

    // ---------- Проверка условий повышения: опыт, план, репутация, отношения, дисциплина
    const patchReq = (to, rel) => { const r = D.REQ[to]; if (!r) return; r.rel = Object.assign({}, r.rel || {}, rel); };
    patchReq(6, { palych: 30, dudukin: 20 }); patchReq(7, { dudukin: 30, shchiplen: 20 }); patchReq(8, { kulezhov: 20, shchiplen: 35 }); patchReq(9, { shchiplen: 40, rassvetov: 20 });
    const PLAN_REQ = { 6: 50, 7: 55, 8: 60, 9: 65 };
    const _rl = K.reqLines;
    K.reqLines = function (to) {
      const L = _rl.apply(this, arguments); if (!L) return L; const s = G.s;
      if (PLAN_REQ[to]) { const p = G.plantStats ? G.plantStats().plan : 50; L.push({ t: 'Выполнение плана завода: ' + p + ' / ' + PLAN_REQ[to], ok: p >= PLAN_REQ[to] }); }
      if (to >= 7) L.push({ t: 'Нет серьёзных нарушений (удержаний за месяц нет)', ok: !(s.pay && s.pay.pen > 0) });
      return L;
    };

    // ---------- Перестановки персонажей при повышении
    const MOVES = {
      6: [['palych', 'Рабочий-наставник (бывший бригадир)', 'stay', 'Палыч передал тебе бригадирскую тетрадь: «Теперь ты за всех отвечаешь, а я — только за себя. Красота».']],
      7: [['dudukin', 'Мастер цеха №2', 'gone', 'Дудукин переведён мастером в соседний цех. Он пожал тебе руку: «Справишься. Звони, если что».'], ['stepanych', 'Пенсионер (бывший мастер)', 'gone', 'Степаныч вышел на заслуженный отдых и унёс с собой любимую кружку.']],
      8: [['kulezhov', 'Мастер участка (бывший зам)', 'stay', 'Кулежов понижен до мастера и остался. Он утверждает, что сам попросил: «Хотел быть ближе к народу».']],
      9: [['shchiplen', 'Главный по облакам (хозчасть)', 'admin', 'Щиплен переведён в хозчасть на должность «Главный по облакам». Прощаясь, он сунул тебе бутылку: «Не пей… пока я не уйду».']]
    };
    G.applyMoves = function () {
      const f = G.s && G.s.flags; if (!f || !f.npcMoved) return;
      Object.keys(f.npcMoved).forEach(id => { const m = f.npcMoved[id], n = D.NPC[id]; if (!n) return; n.role = m.role; if (m.mode === 'gone') n.at = null; else if (m.mode === 'admin') n.at = { loc: 'admin', days: [0, 1, 2, 3, 4], p: 0.5 }; });
    };
    G.rankShift = function (to) {
      const f = F(); f.npcMoved = f.npcMoved || {};
      (MOVES[to] || []).forEach(m => { f.npcMoved[m[0]] = { role: m[1], mode: m[2] }; msg(m[3], 'warn'); if (G.boardAdd) G.boardAdd('Кадровая перестановка: ' + (D.NPC[m[0]] ? D.NPC[m[0]].name : m[0]) + ' теперь «' + m[1] + '»', 'good'); });
      G.applyMoves();
      if (to === 9) F().seat = 90;
      if (to >= 6) G.toast('Обращения к тебе теперь вежливее: управленцем быть престижно.', 'good');
    };
    const _pr = K.promote; K.promote = function (to) { const r = _pr.apply(this, arguments); try { G.rankShift(to); } catch (e) {} return r; };
    const _kh20 = K.hook; K.hook = function () { const r = _kh20.apply(this, arguments); try { G.applyMoves(); } catch (e) {} return r; };

    // ---------- Обращение к игроку по должности (подчинённые здороваются иначе)
    const SUBS = ['seryoga', 'vityok', 'mikhalych', 'palych', 'afonya', 'khomyak', 'lyosha', 'gosha', 'kolyan', 'zahar', 'lidiya', 'tamara', 'nyura', 'vika', 'lyudka', 'tatyana', 'tamara', 'egorych'];
    const GREET = {
      6: ['Здравствуйте, бригадир!', 'Доброе утро, бригадир. Всё под контролем.'],
      7: ['Здравствуйте, {n}! Как вы, мастер?', 'Мастер! Разрешите доложить?'],
      8: ['Здравствуйте, {n}! Замначальника, мы вас уважаем.', 'О, заместитель! Проходите, мы тут стараемся.'],
      9: ['Смирно! Начальник цеха идёт!', 'Здравствуйте, {n}. Чем обязаны вашим визитом?']
    };
    window.addEventListener('load', () => {
      if (!G.modal || G._greetWrapped) return; G._greetWrapped = true; const _m = G.modal;
      G.modal = function (m) {
        try { const s = G.s; if (s && m && m.face && SUBS.indexOf(m.face) >= 0 && s.car.rank >= 6 && s.day) { s.day.greet = s.day.greet || {}; if (!s.day.greet[m.face]) { s.day.greet[m.face] = 1; const r = Math.min(9, s.car.rank), t = G.pick(GREET[r] || GREET[9]).replace('{n}', s.name); m = Object.assign({}, m, { text: '<i>«' + t + '»</i><br>' + (m.text || '') }); } } } catch (e) {}
        return _m.call(this, m);
      };
    });

    // ---------- «Путь к креслу директора» (недостижимая цель)
    const SEAT = ['Труханов: «Я ещё тридцать лет буду работать, но вы, главное, не торопитесь».', 'Секретарь Аллочка: «Директор принимает по средам. Каждый год».', 'Соплежуйкин: «Вам не хватает… ну… мелочи. Я потом скажу какой».', 'В приказе №0 опять опечатка: слово «директор» заменено на «заместитель».', 'Кулежов: «Я с директором на ты. Он сказал, что скоро. Он так говорил и вчера».'];
    A('seat', { ph: ['work'], loc: 'admin', g: 'Заводоуправление', n: 'Путь к креслу директора', i: '🪑', menu: true, req: s => s.car.rank < 9 ? 'Нужна должность начальника цеха' : null, fn: () => {
      const f = F(); f.seat = Math.min(99, f.seat || 90); G.modal({ title: '🪑 Путь к креслу директора', text: 'Прогресс: <b>' + f.seat + '%</b>.<br>' + G.pick(SEAT) + '<br><small>Игра обещает: ещё чуть-чуть — и кресло твоё.</small>', opts: [{ t: 'Продолжать идти', fn: () => { G.fx({ boss: 1, mood: -1 }); if (G.week() > (f.seatWk || -1)) { f.seatWk = G.week(); f.seat = Math.min(99, f.seat + 1); } msg('Ты сделал ещё шаг. Кресло, кажется, сдвинулось. В обратную сторону.'); sp(); } }, { t: 'Остановиться', fn: () => {} }] }); return 'custom'; } });

    // ---------- Управление цехом: новые возможности по должностям
    const plan = v => { const f = F(); if (G.plantStats) G.plantStats(); f.plan = C((f.plan || 50) + v); };
    const morale = v => { const f = F(); if (G.plantStats) G.plantStats(); f.shopMorale = C((f.shopMorale || 50) + v); };
    A('mg_assign', { ph: ['work'], loc: 'shop', g: 'Управление', n: 'Расставить людей по участкам', i: '🧑‍🔧', menu: true, once: 'day', req: s => s.car.rank < 6 ? 'Нужна должность бригадира' : null, fn: () => { G.modal({ title: 'Расстановка', text: 'Куда сделать упор сегодня?', opts: [
      { t: '🏭 На скорость', fn: () => { plan(5); morale(-2); G.fx({ boss: 2, energy: -4 }); msg('План растёт, народ ворчит.'); sp(); } },
      { t: '🔍 На качество', fn: () => { plan(2); morale(2); G.fx({ know: 1, boss: 1 }); msg('Брака меньше, спокойствия больше.'); sp(); } },
      { t: '🦺 На безопасность', fn: () => { plan(-1); morale(4); G.fx({ cons: 2, boss: 1 }); msg('Все в касках, все слегка недовольны, но целы.'); sp(); } }] }); return 'custom'; } });
    A('mg_check', { ph: ['work'], loc: 'shop', g: 'Управление', n: 'Проверить работу участка', i: '📋', menu: true, once: 'day', req: s => s.car.rank < 7 ? 'Нужна должность мастера' : null, fn: () => { G.mini('papers', { title: 'Проверка участка', hint: 'Тапай по документам: принимай отчёты и накладные!' }, r => { plan(Math.round(7 * r.score)); G.fx({ boss: 2, know: 1, energy: -6 }); msg(r.score >= 0.7 ? 'Проверка прошла чётко. Участок подтянулся.' : 'Проверка вышла вялой, но замечания записаны.', r.score >= 0.7 ? 'good' : 'warn'); sp(); }); return 'custom'; } });
    A('mg_meeting', { ph: ['work'], loc: 'shop', g: 'Управление', n: 'Провести планёрку', i: '📣', menu: true, once: 'day', req: s => s.car.rank < 8 ? 'Нужна должность зама начальника цеха' : null, fn: () => { G.modal({ title: 'Планёрка', text: 'Что скажешь коллективу?', opts: [
      { t: 'Поставить жёсткий план', fn: () => { plan(6); morale(-5); G.fx({ boss: 3 }); msg('План принят. Лица вытянулись.'); sp(); } },
      { t: 'Поблагодарить за работу', fn: () => { plan(1); morale(6); G.fx({ coll: 3, mood: 2 }); msg('Народ растаял. Работать стали охотнее.', 'good'); sp(); } },
      { t: 'Пошутить про Кулежова', fn: () => { morale(4); G.fx({ cool: 2 }); msg('Смеялись все, кроме Кулежова. Он сказал, что это и был его план.'); sp(); } }] }); return 'custom'; } });
    A('mg_report', { ph: ['work'], loc: 'admin', g: 'Заводоуправление', n: 'Доклад директору о состоянии цеха', i: '📑', menu: true, req: s => s.car.rank < 9 ? 'Нужна должность начальника цеха' : (G.week() === (s.flags.repWk === undefined ? -1 : s.flags.repWk) ? 'Раз в неделю' : null), fn: () => { const f = F(); f.repWk = G.week(); G.modal({ title: 'Доклад Труханову', face: 'truhanov', text: 'Труханов смотрит поверх очков: «Ну? Как у вас с планом?»', opts: [
      { t: 'Доложить честно', fn: () => { const p = G.plantStats().plan; if (p >= 60) { G.fx({ boss: 5, mood: 3 }); msg('Труханов кивнул: «Хорошо. Так держать, а я сам ничего не придумаю».', 'good'); } else { G.fx({ boss: -2 }); msg('Труханов: «Хм. Исправляйте». Он что-то записал в блокнотик.', 'warn'); } sp(); } },
      { t: 'Приукрасить цифры', fn: () => { if (G.chance(55)) { G.fx({ boss: 6 }); msg('Труханов остался доволен. Цифры, правда, придётся подтверждать.', 'warn'); plan(-2); } else { G.fx({ boss: -8, cons: -3 }); msg('Труханов проверил цифры и записал в блокнотик «приукрашивает».', 'bad'); } sp(); } }] }); return 'custom'; } });
  })();


  // ======================= v2.1: механики работы по профессиям, брак, премии и взятки =======================
  (function () {
    const D = G.D, C = G.clamp, msg = (t, c) => G.toast(t, c), F = () => G.s.flags;
    const shuf = a => a.slice().sort(() => Math.random() - 0.5);
    const ovl = html => { const root = document.getElementById('app'), o = document.createElement('div'); o.className = 'gym-ov'; const b = document.createElement('div'); b.className = 'gym-box'; b.innerHTML = html; o.appendChild(b); root.appendChild(o); return { o, b, q: s => b.querySelector(s) }; };
    const accOf = (d, half) => d <= half ? 0.6 + 0.4 * (1 - d / half) : Math.max(0, 0.6 - (d - half) * 3);

    // ---------- Мини-игры по профессиям
    const GAMES = {
      crane: (title, cb) => { // Кран: груз качается, опусти в зону
        const u = ovl('<h3>' + title + '</h3><div class="gym-info" id="i">Опусти груз точно в зелёную зону. Он раскачивается!</div><div class="gym-track"><div class="gym-zone" id="z"></div><div class="gym-mark" id="m"></div></div><div class="gym-rep" id="r">&nbsp;</div><button class="btn big hazard" id="b">ОПУСТИТЬ ГРУЗ</button>');
        let rd = 0, sc = [], t0 = 0, zc = 0.5, zw = 0.22, locked = false, pos = 0.5, done = false;
        const setup = () => { zw = Math.max(0.12, 0.22 - rd * 0.03); zc = 0.2 + Math.random() * 0.6; u.q('#z').style.left = ((zc - zw / 2) * 100) + '%'; u.q('#z').style.width = (zw * 100) + '%'; u.q('#i').innerHTML = 'Груз ' + (rd + 1) + ' из 3'; };
        const loop = ts => { if (done) return; if (!t0) t0 = ts; const sp = 1.6 + rd * 0.5; pos = 0.5 + 0.46 * Math.sin((ts - t0) / 1000 * sp * 2); u.q('#m').style.left = (pos * 100) + '%'; requestAnimationFrame(loop); };
        u.q('#b').onclick = () => { if (locked) return; locked = true; const a = accOf(Math.abs(pos - zc), zw / 2); sc.push(a); u.q('#r').textContent = a >= 0.9 ? 'Точно в цель!' : a >= 0.6 ? 'Нормально' : 'Мимо, груз задел стойку'; rd++; setTimeout(() => { if (rd >= 3) { done = true; u.o.remove(); cb(sc.reduce((x, y) => x + y, 0) / 3); } else { setup(); locked = false; u.q('#r').innerHTML = '&nbsp;'; } }, 600); };
        setup(); requestAnimationFrame(loop);
      },
      cut: (title, cb) => { // Обработка: зажми подачу и отпусти в зелёной зоне
        const u = ovl('<h3>' + title + '</h3><div class="gym-info" id="i"></div><div class="gym-track"><div class="gym-zone" style="left:68%;width:20%"></div><div class="gym-mark" id="m" style="left:0"></div></div><div class="gym-rep" id="r">&nbsp;</div><button class="btn big hazard" id="b">ДЕРЖИ ПОДАЧУ</button>');
        let rd = 0, sc = [], hold = false, prog = 0, last = 0, done = false, wait = false;
        const info = () => { u.q('#i').innerHTML = 'Деталь ' + (rd + 1) + ' из 3. Держи кнопку, отпусти в зелёной зоне. Перегнёшь — деталь в брак.'; };
        const fin = a => { sc.push(a); rd++; wait = true; hold = false; setTimeout(() => { if (rd >= 3) { done = true; u.o.remove(); cb(sc.reduce((x, y) => x + y, 0) / 3); } else { prog = 0; wait = false; u.q('#r').innerHTML = '&nbsp;'; info(); } }, 650); };
        const loop = ts => { if (done) return; const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; if (hold && !wait) { prog += dt * (0.5 + rd * 0.12); if (prog >= 1) { u.q('#r').textContent = 'Перегнул! Брак.'; fin(0); } } u.q('#m').style.left = Math.min(100, prog * 100) + '%'; requestAnimationFrame(loop); };
        const b = u.q('#b'); const down = e => { if (!wait) hold = true; e.preventDefault(); }; const up = () => { if (!hold || wait) return; hold = false; const a = Math.max(0, 1 - Math.abs(prog - 0.78) / 0.45); u.q('#r').textContent = a >= 0.85 ? 'Чистая обработка!' : a >= 0.5 ? 'Допустимо' : 'Кривовато'; fin(a); };
        b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up);
        info(); requestAnimationFrame(loop);
      },
      wires: (title, cb) => { // Ремонт/электрика: соедини провода одного цвета
        const COL = ['#e33', '#3a3', '#38f', '#fd2'], R = shuf([0, 1, 2, 3]);
        const u = ovl('<h3>' + title + '</h3><div class="gym-info" id="i">Соедини провода одного цвета: сначала слева, потом справа. 12 секунд!</div><div style="display:flex;justify-content:space-between;margin:10px 0"><div id="l" style="display:flex;flex-direction:column;gap:8px"></div><div id="r" style="display:flex;flex-direction:column;gap:8px"></div></div><div class="gym-rep" id="t">12.0 с</div>');
        let sel = -1, ok = 0, bad = 0, t0 = 0, done = false; const used = {};
        const mk = (side, ci) => { const b = document.createElement('button'); b.className = 'btn'; b.style.cssText = 'background:' + COL[ci] + ';min-width:70px;height:40px;border:2px solid #000'; b.textContent = '●'; b.onclick = () => { if (done || used[side + ci]) return;
          if (side === 'l') { sel = ci; return; } if (sel < 0) return;
          if (sel === ci) { ok++; used['l' + ci] = used['r' + ci] = 1; b.style.opacity = 0.35; u.q('#l').children[ci].style.opacity = 0.35; } else bad++; sel = -1; if (ok >= 4) fin(); }; return b; };
        [0, 1, 2, 3].forEach(i => u.q('#l').appendChild(mk('l', i))); R.forEach(i => u.q('#r').appendChild(mk('r', i)));
        const fin = () => { if (done) return; done = true; u.o.remove(); cb(C((ok - 0.3 * bad) / 4, 0, 1)); };
        const loop = ts => { if (done) return; if (!t0) t0 = ts; const el = (ts - t0) / 1000; u.q('#t').textContent = Math.max(0, 12 - el).toFixed(1) + ' с'; if (el >= 12) fin(); else requestAnimationFrame(loop); }; requestAnimationFrame(loop);
      },
      sort: (title, cb, theme) => { // Склад/строповка: разложи по нужной полке
        const T = theme === 'sling' ? { shelves: ['Строп 1 т', 'Строп 3 т', 'Строп 5 т'], items: [['📦 Ящик 0.8 т', 0], ['⚙ Редуктор 2.5 т', 1], ['🧱 Плита 4.5 т', 2], ['🛢 Бочка 0.9 т', 0], ['🔩 Вал 3 т', 1], ['🏗 Балка 5 т', 2], ['📦 Короб 0.6 т', 0], ['⚙ Двигатель 2.8 т', 1]] }
          : { shelves: ['Металл', 'Крепёж', 'Жидкости'], items: [['🔩 Болт', 1], ['🛢 Масло', 2], ['⬛ Заготовка', 0], ['⚙ Шайба', 1], ['🧴 Растворитель', 2], ['📏 Пруток', 0], ['🔩 Гайка', 1], ['🎨 Краска', 2], ['⬛ Лист', 0], ['🛢 Смазка', 2]] };
        const items = shuf(T.items).slice(0, 8);
        const u = ovl('<h3>' + title + '</h3><div class="gym-info">Разложи по полкам, пока время не вышло.</div><div class="gym-rep" id="s" style="font-size:26px;min-height:44px"></div><div class="gym-rep" id="r">&nbsp;</div><div class="fi-btns" id="sh"></div>');
        let i = 0, ok = 0, timer = null, lock = false, cur = null;
        const next = () => { if (i >= items.length) { u.o.remove(); return cb(ok / items.length); } lock = false; cur = items[i]; u.q('#s').textContent = cur[0]; u.q('#r').innerHTML = '&nbsp;'; timer = setTimeout(() => ans(-1), Math.max(1000, 1900 - i * 90)); };
        const ans = k => { if (lock) return; lock = true; clearTimeout(timer); const r = u.q('#r'); if (k === cur[1]) { ok++; r.textContent = 'Верно'; r.className = 'gym-rep good'; } else { r.textContent = k < 0 ? 'Не успел' : 'Не туда'; r.className = 'gym-rep bad'; } i++; setTimeout(next, 330); };
        T.shelves.forEach((n, k) => { const b = document.createElement('button'); b.className = 'btn big'; b.textContent = n; b.onclick = () => ans(k); u.q('#sh').appendChild(b); }); next();
      },
      quiz: (title, cb, bank) => { // Распределение людей / решения: выбери верный вариант
        const qs = shuf(bank).slice(0, 3); let i = 0, ok = 0;
        const u = ovl('<h3>' + title + '</h3><div class="gym-info" id="q"></div><div class="gym-rep" id="r">&nbsp;</div><div id="o" style="display:flex;flex-direction:column;gap:8px"></div>');
        const show = () => { if (i >= qs.length) { u.o.remove(); return cb(ok / qs.length); } const q = qs[i]; u.q('#q').innerHTML = '<b>' + q.q + '</b>'; u.q('#r').innerHTML = '&nbsp;'; const o = u.q('#o'); o.innerHTML = ''; shuf([0, 1, 2]).forEach(j => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = q.a[j]; b.onclick = () => { if (j === 0) { ok++; u.q('#r').textContent = 'Верное решение'; u.q('#r').className = 'gym-rep good'; } else { u.q('#r').textContent = 'Так себе решение'; u.q('#r').className = 'gym-rep bad'; } i++; o.innerHTML = ''; setTimeout(show, 700); }; o.appendChild(b); }); };
        show();
      }
    };
    const ASSIGN = [
      { q: 'Тяжёлая погрузка. Кого поставишь?', a: ['Силача Гену', 'Аккуратную Люсю', 'Болтуна Витю'] }, { q: 'Срочный заказ горит. Кого?', a: ['Быструю Люсю', 'Опытного, но медленного Иваныча', 'Новичка Колю'] },
      { q: 'Сложный чертёж. Кого?', a: ['Опытного Иваныча', 'Быстрого Гену', 'Новичка Колю'] }, { q: 'Тонкая отделка. Кого?', a: ['Аккуратную Люсю', 'Силача Гену', 'Быстрого Витю'] },
      { q: 'Нужно обучить стажёра. Кого?', a: ['Терпеливого Иваныча', 'Нервного Гену', 'Молчуна Витю'] }
    ];
    const DECIDE = [
      { q: 'Заказчик просит сделать на день раньше. Что решишь?', a: ['Согласовать реальные сроки', 'Пообещать и ускорить любой ценой', 'Сделать вид, что не слышал'] }, { q: 'Мастер просит новый инструмент. Бюджет ограничен.', a: ['Купить самое нужное, остальное отложить', 'Отказать всем', 'Купить всё и объясняться потом'] },
      { q: 'Два работника поссорились. Что делать?', a: ['Выслушать обоих и развести по участкам', 'Уволить обоих', 'Сделать вид, что всё хорошо'] }, { q: 'Брак на партии. Как действовать?', a: ['Найти причину и исправить процесс', 'Скрыть и отправить', 'Найти виноватого и наказать'] },
      { q: 'Директор хочет отчёт «завтра к утру».', a: ['Подготовить честный отчёт и предупредить о пробелах', 'Нарисовать красивые цифры', 'Передать задачу Кулежову'] }, { q: 'План горит, народ устал. Что сделаешь?', a: ['Перераспределить смены и дать отдых', 'Ввести сверхурочные без оплаты', 'Пообещать премию, которой нет'] }
    ];
    G.workGame = function (kind, title, cb, extra) {
      try {
        if (kind === 'bank') return GAMES.quiz(title, cb, extra);
        if (kind === 'weld' || kind === 'tol') return G.sideGame(kind, cb);
        if (kind === 'sling') return GAMES.sort(title, cb, 'sling');
        if (kind === 'assign') return GAMES.quiz(title, cb, ASSIGN);
        if (kind === 'decide') return GAMES.quiz(title, cb, DECIDE);
        return GAMES[kind](title, cb);
      } catch (e) { cb(0.5); }
    };
    const JOBGAME = { drob: 'rhythm', podsob: 'rhythm', liteyshik: 'rhythm', plavilshik: 'rhythm', stropalshik: 'sling', kran: 'crane', tokar: 'cut', chpu: 'cut', svarshik: 'weld', slesar: 'wires', elektrik: 'wires', laborant: 'papers', otk: 'tol', kladovshik: 'sort', deloproizv: 'papers' };
    const JT = { drob: 'ДРОБЬ', podsob: 'ПОДСОБКА', liteyshik: 'ЛИТЬЁ', plavilshik: 'ПЛАВКА', stropalshik: 'СТРОПОВКА', kran: 'КРАН', tokar: 'ТОЧЕНИЕ', chpu: 'ЧПУ', svarshik: 'СВАРКА', slesar: 'РЕМОНТ', elektrik: 'ЭЛЕКТРИКА', laborant: 'АНАЛИЗЫ', otk: 'КОНТРОЛЬ ОТК', kladovshik: 'СКЛАД', deloproizv: 'БУМАГИ' };
    G.ACT.work.fn = function (s) {
      if (s.instr.perv == null) { msg('Без первичного инструктажа допуска нет! Иди к Палычу или Пелагее.', 'bad'); return false; }
      const r = s.car.rank, j = G.job(); let kind, title;
      if (r >= 8) { kind = 'decide'; title = 'СОВЕЩАНИЕ И РЕШЕНИЯ'; } else if (r === 7) { kind = 'papers'; title = 'ПРОВЕРКИ И УКАЗАНИЯ'; } else if (r === 6) { kind = 'assign'; title = 'РАСПРЕДЕЛЕНИЕ ЛЮДЕЙ'; }
      else { kind = JOBGAME[s.car.job] || 'rhythm'; title = JT[s.car.job] || j.name; }
      if (kind === 'rhythm' || kind === 'papers') G.mini(kind, { title: title, hint: kind === 'papers' ? 'Тапай по папкам, пока не кончилось время' : 'Тапай «РАБОТАТЬ», когда маркер в зелёной зоне', rounds: 3 + Math.min(2, Math.floor(G.physical() / 2)) }, res => G.doOp(res.score));
      else G.workGame(kind, title, sc => G.doOp(sc));
      return 'custom';
    };

    // ---------- Действия, зависящие от профессии (чужие скрыты)
    const MACH = ['drob', 'podsob', 'liteyshik', 'plavilshik', 'tokar', 'chpu', 'slesar'];
    const isJob = (s, list) => s.car.rank < 6 && list.indexOf(s.car.job) >= 0;
    G.ACT.oil.req = s => isJob(s, MACH) ? null : 'Не здесь';
    const care = (id, jobs, n, i, txt) => A(id, { ph: ['work'], loc: 'shop', g: 'Работа и учёба', n, i, h: 1, once: 'day', fx: { know: 2, energy: -3 }, txt, req: s => isJob(s, jobs) ? null : 'Не здесь', fn: s => { s.flags.careDay = s.t.day; } });
    care('care_weld', ['svarshik'], 'Заменить электроды и зачистить кромки', '🔥', 'Электроды свежие, кромки блестят. Шов будет красивым.');
    care('care_crane', ['kran', 'stropalshik'], 'Осмотреть тросы и крюки', '🪝', 'Тросы целы, крюки на месте. Можно жить.');
    care('care_elec', ['elektrik'], 'Проверить щиток и заземление', '⚡', 'Щиток не бьётся током. Приятная новость.');
    care('care_otk', ['otk', 'laborant'], 'Поверить калибры и приборы', '📏', 'Калибры показывают честно. Они у вас единственные.');
    care('care_stock', ['kladovshik', 'deloproizv'], 'Провести инвентаризацию и разобрать стеллаж', '📋', 'Всё учтено. Кроме того, что украдено.');
    const _q = G.quality; G.quality = function () { const q = _q.apply(this, arguments); return G.s.flags.careDay === G.s.t.day ? Math.min(100, q + 6) : q; };
    const _mi = G.machineIncident; G.machineIncident = function () { if (G.s.flags.careDay === G.s.t.day && G.chance(60)) { msg('Утренний осмотр спас от поломки.', 'good'); return; } return _mi.apply(this, arguments); };

    // ---------- Брак: бригадир, ОТК, взятки и любовь
    const _op = G.doOp;
    G.doOp = function (score) {
      const s = G.s, r = _op.apply(this, arguments);
      try { if (s.car.rank < 6 && score < 0.35) { s.day.defects = (s.day.defects || 0) + 1; s.stats.brak++; msg('Деталь с браком. Надеемся, не заметят.', 'warn'); } } catch (e) {}
      return r;
    };
    const penalty = (n, why) => { const s = G.s; s.pay.pen += n; G.fx({ boss: -3, mood: -4 }); msg(why + ' Премия снята на ' + G.rub(n) + '.', 'bad'); if (G.boardAdd) G.boardAdd('Лишён премии за брак', 'bad'); };
    const defectCase = (n, by, done) => {
      const s = G.s, f = F(), cost = Math.min(6000, 1500 * n), face = by === 'otk' ? 'ekaterina' : 'palych';
      const who = by === 'otk' ? 'Екатерина Е. (ОТК)' : (D.NPC.palych.name + ' (бригадир)');
      const bribe = (amount, item) => { if (item && G.has(item)) G.give(item, -1); else G.addMoney(-amount); f.bribed = (f.bribed || 0) + 1; G.fx({ cons: -3 }); msg('Вопрос решён «по-человечески»: брак исчез из ведомости.', 'warn'); if (G.rumor) G.rumor('brak', 'Говорят, ты откупился от брака. Не все осуждают.', { cons: -1, coll: 1 }, 55); done(); };
      G.modal({ title: '⚠ Брак на смене', face, text: who + ' обнаружил(а) брак: деталей — <b>' + n + '</b>. Возможное наказание: лишение премии на <b>' + G.rub(cost) + '</b>.', opts: [
        { t: '🙇 Признать вину', fn: () => { penalty(cost, 'Ты признал вину.'); G.fx({ cons: 2 }); done(); } },
        { t: '💵 Договориться (конверт 1 000 ₽)', dis: s.money < 1000 && !G.has('env1') ? 'Нет денег' : null, fn: () => bribe(1000, 'env1') },
        { t: '🔧 Свалить на станок', dis: s.machine.wear < 40 ? 'Станок в порядке' : null, fn: () => { if (G.chance(50)) { msg('Станок и правда подвёл. Тебя пожалели.', 'good'); done(); } else { penalty(Math.round(cost * 1.3), 'Станок оказался ни при чём.'); done(); } } }
      ] });
    };
    const _es = G.endShift;
    G.endShift = function () {
      const s = G.s, f = F(), n = s.day && s.day.defects || 0;
      if (n > 0 && s.car.rank < 6 && s.phase !== 'evening') {
        const palych = D.NPC.palych && !(f.npcMoved && f.npcMoved.palych && s.car.rank >= 6);
        const deal = f.brigDeal !== undefined && s.t.day <= f.brigDeal, eDeal = f.ekDeal !== undefined && G.week() <= f.ekDeal;
        const noticed = palych && !deal && G.chance(Math.min(85, 40 + 10 * n));
        const toOtk = !noticed && G.chance(35);
        const proceed = () => _es.apply(G, arguments);
        if (noticed) { defectCase(n, 'brig', proceed); return; }
        if (toOtk) {
          const ek = G.R('ekaterina');
          if (eDeal) msg('Екатерина вспомнила вашу договорённость и закрыла глаза на брак.', 'warn');
          else if (ek.stage >= 4) { msg('Екатерина нашла брак, посмотрела на тебя и тихо порвала акт. Любовь зла.', 'good'); G.relAdd('ekaterina', 1); if (G.rumor) G.rumor('ek', 'Говорят, начальница ОТК закрывает глаза на твой брак. Подозрительно.', { coll: -2 }, 60); }
          else { defectCase(n, 'otk', proceed); return; }
        }
      }
      return _es.apply(this, arguments);
    };
    // Договориться заранее (меню Палыча и Екатерины)
    const _sp21 = G.npcSpecial;
    G.npcSpecial = function (id) {
      const o = _sp21.apply(this, arguments), s = G.s, f = F();
      const dealOpt = (key, val, label, txt) => o.push({ t: label, dis: s.money < 1000 && !G.has('env1') ? 'Нет денег' : null, fn: () => { if (G.has('env1')) G.give('env1', -1); else G.addMoney(-1000); f[key] = val; G.fx({ cons: -3 }); msg(txt, 'warn'); G.spend(1); } });
      if (id === 'palych' && s.car.rank < 6) dealOpt('brigDeal', s.t.day + 7, '💵 Подкинуть бригадиру на чай (1 000 ₽)', 'Палыч смущённо взял: «На неделю хватит глазам не замечать. Но чур — аккуратнее».');
      if (id === 'ekaterina' && s.car.rank < 6) dealOpt('ekDeal', G.week() + 1, '💵 Договориться насчёт брака (1 000 ₽)', 'Екатерина холодно кивнула: «Я ничего не слышала. До следующей недели».');
      return o;
    };
  })();


  // ======================= v2.2: сотрудники цеха, найм, зарплаты, мораль коллектива =======================
  (function () {
    const D = G.D, C = G.clamp, K = G.career, msg = (t, c) => G.toast(t, c), sp = n => G.spend(n || 1);
    const F = () => G.s.flags, shuf = a => a.slice().sort(() => Math.random() - 0.5), mon = n => G.rub(Math.round(n));
    const TR = {
      slow_exp: { n: 'Опытный, но медленный', prod: -12, skill: 18, err: 3 }, fast_err: { n: 'Быстрый, часто ошибается', prod: 15, skill: 0, err: 14 },
      conflict: { n: 'Хороший специалист, конфликтный', prod: 0, skill: 15, err: 4, conf: 1 }, young: { n: 'Молодой, быстро обучается', prod: 0, skill: -14, err: 6, learn: 1 },
      diligent: { n: 'Старательный, без инициативы', prod: 5, skill: 5, err: 4 }, lazy: { n: 'Талантливый лентяй', prod: -5, skill: 20, err: 6 },
      booze: { n: 'Золотые руки, слабость к рюмке', prod: 8, skill: 12, err: 10 }, honest: { n: 'Честный и надёжный', prod: 2, skill: 8, err: 2 }
    };
    const FN = ['Иван', 'Пётр', 'Сидор', 'Николай', 'Алексей', 'Фёдор', 'Захар', 'Григорий', 'Тимур', 'Олег', 'Борис', 'Кирилл'], LN = ['Петров', 'Иванов', 'Сидоров', 'Смирнов', 'Кузнецов', 'Попов', 'Лебедев', 'Козлов', 'Новиков', 'Морозов', 'Волков', 'Соловьёв'];
    const jobName = id => (D.JOBS[id] && D.JOBS[id].name) || id;
    const CAP = r => r >= 9 ? 12 : r >= 8 ? 8 : r >= 7 ? 5 : r >= 6 ? 3 : 0;
    const eff = e => { const t = TR[e.trait], br = F().staff.some(x => x.brig) ? 1.05 : 1; return C((e.skill / 100) * (0.6 + 0.4 * e.loy / 100) * (1 + (t.prod || 0) / 100) * br, 0, 1.4); };
    G.staffEff = eff;
    const mk = (o) => { const f = F(); f.staffId = (f.staffId || 0) + 1; const t = TR[o.trait]; return Object.assign({ id: f.staffId, skill: C(55 + (t.skill || 0) + Math.round(Math.random() * 20 - 10), 25, 95), loy: 50 + Math.round(Math.random() * 20), shift: f.staffId % 2 + 1, brig: false, hired: G.s.t.day }, o); };
    const ensure = () => {
      const f = F(); if (f.staff || G.s.car.rank < 6) return; f.budget = f.budget || 0; f.delays = 0; f.pays = 0;
      f.staff = [mk({ npc: 'seryoga', name: 'Серёга', job: 'tokar', trait: 'fast_err', pay: 24000 }), mk({ npc: 'mikhalych', name: 'Михалыч', job: 'svarshik', trait: 'slow_exp', pay: 30000 }), mk({ npc: 'vityok', name: 'Витёк', job: 'slesar', trait: 'young', pay: 21000 })];
    };
    const _pr2 = K.promote; K.promote = function (to) { const r = _pr2.apply(this, arguments); try { if (to >= 6) ensure(); if (to === 7 && F().staff && !F().staff.some(e => e.npc === 'afonya')) F().staff.push(mk({ npc: 'afonya', name: 'Афоня', job: 'slesar', trait: 'conflict', pay: 23000 })); } catch (e) {} return r; };
    const pay$ = n => { const f = F(); if (f.budget >= n) { f.budget -= n; return true; } if (G.s.money >= n) { G.addMoney(-n); return true; } return false; };
    const can$ = n => F().budget >= n || G.s.money >= n;
    const line = e => e.name + ' — ' + jobName(e.job) + ' · навык ' + Math.round(e.skill) + ' · лояльность ' + Math.round(e.loy) + ' · ' + mon(e.pay) + '/мес.' + (e.brig ? ' · бригадир' : '');

    G.staffMenu = function () {
      ensure(); const s = G.s, f = F(), r = s.car.rank, st = f.staff || [], back = () => G.staffMenu();
      const mor = G.plantStats ? G.plantStats().morale : 50;
      G.modal({ title: 'Сотрудники цеха', wide: true, text: 'Бюджет цеха: <b>' + mon(f.budget || 0) + '</b> · Сотрудников: <b>' + st.length + '/' + CAP(r) + '</b> · Мораль цеха: <b>' + mor + '</b> · Задержек зарплаты: <b>' + (f.delays || 0) + '</b>', opts: st.map(e => ({ t: line(e), fn: () => card(e) })).concat([
        { t: '➕ Нанять сотрудника (500 ₽)', dis: r < 7 ? 'Нужна должность мастера' : st.length >= CAP(r) ? 'Штат полон' : null, fn: () => hire() },
        { t: '📅 Распределение по сменам', dis: r < 8 ? 'Нужна должность зама начальника' : null, fn: () => shifts() },
        { t: '💰 Политика зарплат', dis: r < 9 ? 'Нужна должность начальника цеха' : null, fn: () => policy() },
        { t: 'Закрыть', fn: () => {} }]) });
      function card(e) {
        const t = TR[e.trait];
        G.modal({ title: e.name, text: jobName(e.job) + '<br>Характер: <b>' + t.n + '</b><br>Навык: ' + Math.round(e.skill) + ' · Производительность: ' + Math.round(eff(e) * 100) + '% · Лояльность: ' + Math.round(e.loy) + '<br>Смена: ' + e.shift + ' · Зарплата: ' + mon(e.pay) + '/мес.', opts: [
          { t: '📚 Повысить квалификацию (1 000 ₽)', dis: !can$(1000) ? 'Нет денег' : e.skill >= 95 ? 'Потолок' : null, fn: () => { pay$(1000); e.skill = Math.min(95, e.skill + (t.learn ? 12 : 8)); e.loy += 3; msg(e.name + ' прошёл курсы. Навык растёт.', 'good'); sp(); back(); } },
          { t: '💵 Повысить зарплату на 10%', fn: () => { e.pay = Math.round(e.pay * 1.1 / 100) * 100; e.loy = Math.min(100, e.loy + 8); msg(e.name + ' доволен. Работать будет лучше.', 'good'); sp(); back(); } },
          { t: e.brig ? '⭐ Снять с бригадира' : '⭐ Назначить бригадиром', dis: r < 8 ? 'Нужна должность зама начальника' : null, fn: () => { st.forEach(x => { x.brig = false; }); if (!e.brig) { e.brig = true; e.pay = Math.round(e.pay * 1.1 / 100) * 100; e.loy = Math.min(100, e.loy + 5); msg(e.name + ' назначен бригадиром: команда подтянулась.', 'good'); } sp(); back(); } },
          { t: '🔁 Перевести в другую смену', fn: () => { e.shift = e.shift === 1 ? 2 : 1; msg(e.name + ' теперь во ' + e.shift + '-й смене.'); back(); } },
          { t: '❌ Уволить', dis: r < 7 ? 'Нужна должность мастера' : e.npc ? 'Старый кадр: уволить нельзя, только перевести' : null, fn: () => G.modal({ title: 'Увольнение', text: 'Уволить ' + e.name + '? Выходное пособие: ' + mon(e.pay / 2) + '.', opts: [{ t: 'Уволить', fn: () => { if (!pay$(Math.round(e.pay / 2))) { msg('Нет денег на пособие.', 'bad'); return; } f.staff = st.filter(x => x !== e); if (e.loy >= 60 || e.brig) { f.shopMorale = C((f.shopMorale || 50) - 5); msg('Коллектив недоволен: ' + e.name + ' был уважаемым человеком.', 'bad'); } else if (eff(e) < 0.4) { f.shopMorale = C((f.shopMorale || 50) + 2); msg('Коллектив вздохнул с облегчением.'); } else msg('Уволен. Без драмы.'); G.fx({ cons: -1 }); sp(); back(); } }, { t: 'Передумал', fn: () => card(e) }] }) },
          { t: 'Назад', fn: back }] });
      }
      function hire() {
        const pool = Object.keys(D.JOBS), cands = [0, 1, 2].map(() => { const j = G.pick(shuf(pool)), jb = D.JOBS[j], tr = G.pick(shuf(Object.keys(TR))); return mk({ name: G.pick(shuf(LN)) + ' ' + G.pick(shuf(FN))[0] + '.', job: j, trait: tr, pay: Math.round(jb.pay[0] * (0.9 + Math.random() * 0.3) / 100) * 100, loy: 55 }); });
        G.modal({ title: 'Кандидаты', wide: true, text: 'Собеседование. Выбери одного (500 ₽ за оформление):', opts: cands.map(e => ({ t: line(e) + ' · ' + TR[e.trait].n, dis: !can$(500) ? 'Нет денег' : null, fn: () => { pay$(500); f.staff.push(e); msg(e.name + ' принят на работу. Новый человек в цехе.', 'good'); if (f.staff.length >= 5) G.achieve('crew5', 'Руководитель: в штате 5 человек'); if (f.staff.length >= 12) G.achieve('crew12', 'Большой цех: 12 сотрудников'); sp(); back(); } })).concat([{ t: 'Назад', fn: back }]) });
      }
      function shifts() {
        const a = st.filter(e => e.shift === 1).length, b = st.length - a;
        G.modal({ title: 'Смены', text: 'Первая смена: <b>' + a + '</b> чел. · Вторая смена: <b>' + b + '</b> чел.<br>Баланс смен влияет на план: ровное распределение даёт бонус.', opts: [{ t: '⚖ Распределить поровну', fn: () => { st.forEach((e, i) => { e.shift = i % 2 + 1; }); msg('Смены сбалансированы.', 'good'); sp(); back(); } }, { t: 'Назад', fn: back }] });
      }
      function policy() {
        G.modal({ title: 'Политика зарплат', text: 'Бюджет цеха: ' + mon(f.budget || 0) + '. Решения влияют на лояльность всего цеха.', opts: [
          { t: '🎁 Выписать премию цеху (5 000 ₽)', dis: !can$(5000) ? 'Нет денег' : null, fn: () => { pay$(5000); st.forEach(e => { e.loy = Math.min(100, e.loy + 8); }); f.shopMorale = C((f.shopMorale || 50) + 8); msg('Премия выписана. Цех гудит, как улей.', 'good'); sp(); back(); } },
          { t: '📈 Поднять зарплаты на 10%', fn: () => { st.forEach(e => { e.pay = Math.round(e.pay * 1.1 / 100) * 100; e.loy = Math.min(100, e.loy + 6); }); msg('Зарплаты выросли. Расходы тоже.', 'good'); sp(); back(); } },
          { t: '📉 Урезать зарплаты на 10%', fn: () => { st.forEach(e => { e.pay = Math.round(e.pay * 0.9 / 100) * 100; e.loy = Math.max(0, e.loy - 9); }); f.shopMorale = C((f.shopMorale || 50) - 5); msg('Зарплаты урезаны. Коллектив мрачнеет.', 'bad'); sp(); back(); } },
          { t: 'Назад', fn: back }] });
      }
    };
    A('staff', { ph: ['work'], loc: 'shop', g: 'Управление', n: 'Сотрудники цеха', i: '👥', menu: true, req: s => s.car.rank < 6 ? 'Нужна должность бригадира' : null, fn: () => { G.staffMenu(); return 'custom'; } });

    // ---------- Ежедневные расчёты: производительность, конфликты, зарплата по понедельникам
    const plan = v => { const f = F(); if (G.plantStats) G.plantStats(); f.plan = C((f.plan || 50) + v); };
    const payroll = () => {
      const f = F(), st = f.staff; if (!st || !st.length) return;
      const wk = Math.round(st.reduce((a, e) => a + e.pay / 4, 0)), income = Math.round(st.length * 6000 * (0.6 + (G.plantStats().plan / 100) * 0.8));
      f.budget = (f.budget || 0) + income;
      if (f.budget >= wk) { f.budget -= wk; f.pays = (f.pays || 0) + 1; st.forEach(e => { e.loy = Math.min(100, e.loy + 1); }); msg('💼 Цех получил зарплату: ' + mon(wk) + ' (поступления ' + mon(income) + ').', 'good'); if (f.pays >= 12 && !f.delays) G.achieve('nodelay', 'Зарплата вовремя 12 недель'); return; }
      const lack = wk - f.budget;
      G.modal({ title: '💼 Не хватает на зарплату', text: 'Бюджет цеха: ' + mon(f.budget) + ', нужно ' + mon(wk) + '. Не хватает <b>' + mon(lack) + '</b>.', opts: [
        { t: 'Доплатить из своих', dis: G.s.money < lack ? 'Нет денег' : null, fn: () => { G.addMoney(-lack); f.budget = 0; st.forEach(e => { e.loy = Math.min(100, e.loy + 3); }); G.fx({ cons: 1, mood: -2 }); msg('Зарплата выплачена из твоего кармана. Люди это запомнят.', 'good'); } },
        { t: 'Задержать зарплату', fn: () => { f.delays = (f.delays || 0) + 1; f.pays = 0; st.forEach(e => { e.loy = Math.max(0, e.loy - (8 + 2 * f.delays)); }); f.shopMorale = C((f.shopMorale || 50) - 7); G.fx({ boss: 1, coll: -3 }); msg('Зарплата задержана. По цеху пошёл ропот.', 'bad'); if (f.delays >= 3) msg('Цех шумит: «Сколько можно ждать?». Задержки накапливаются.', 'bad'); } }] });
    };
    const staffDaily = () => {
      const s = G.s, f = F(), st = f.staff; if (!st || !st.length) return; const cap = CAP(s.car.rank) || 3;
      const avg = st.reduce((a, e) => a + eff(e), 0) / st.length, a1 = st.filter(e => e.shift === 1).length, bal = Math.abs(a1 - (st.length - a1)) <= 1 ? 0.5 : -0.3;
      plan((avg - 0.55) * 8 * (0.5 + st.length / cap * 0.5) + bal);
      f.shopMorale = C((f.shopMorale || 50) + (st.reduce((a, e) => a + e.loy, 0) / st.length - 50) / 20);
      const brig = st.some(e => e.brig);
      st.forEach(e => { const t = TR[e.trait];
        if (G.chance(t.err * 0.4)) { plan(-1.2); if (G.chance(30)) msg('У ' + e.name + ' брак: план просел.', 'warn'); }
        if (t.conf && G.chance(brig ? 4 : 12)) { f.shopMorale = C(f.shopMorale - 3); msg(e.name + ' поругался с коллегой. Мораль цеха падает.', 'warn'); }
        e.skill = Math.min(95, e.skill + 0.06 * (t.learn ? 4 : 1));
      });
      for (const e of st.slice()) if (e.loy < 15) { f.staff = f.staff.filter(x => x !== e); f.shopMorale = C(f.shopMorale - 3); msg(e.name + ' уволился: «Хватит с меня».', 'bad'); }
      if (G.weekday() === 0) payroll();
    };
    const _dt22 = G.dailyTick; G.dailyTick = function () { const r = _dt22.apply(this, arguments); try { staffDaily(); } catch (e) {} return r; };
  })();


  // ======================= v2.3: производственная экономика, заказы, управленческие мини-игры =======================
  (function () {
    const D = G.D, C = G.clamp, msg = (t, c) => G.toast(t, c), sp = n => G.spend(n || 1);
    const F = () => G.s.flags, shuf = a => a.slice().sort(() => Math.random() - 0.5), mon = n => G.rub(Math.round(n));
    const eco = () => { const f = F(); f.eco = f.eco || { raw: 0, order: null, mode: 'norm', done: 0, rev: 0, exp: 0, made: 0, rej: 0, mRev: 0, mExp: 0, qcDays: 0, logDays: 0, safeDays: 0, cheap: false }; return f.eco; };
    const rawPrice = () => Math.round(45 + 40 * G.hash(G.week(), 3, 9));
    const MODES = { qual: { n: '🎯 Качественно', speed: 0.8, def: 0.03, raw: 1, bonus: 1.15, d: 'Медленнее, брака мало, заказчик доплачивает' }, norm: { n: '⚙ Обычный режим', speed: 1, def: 0.08, raw: 1, bonus: 1, d: 'Сбалансированно' }, rush: { n: '⚡ Быстро и дёшево', speed: 1.25, def: 0.18, raw: 0.85, bonus: 0.95, d: 'Быстро и экономнее по сырью, но много брака' } };
    const CUST = ['ООО «Рога и Шестерёнки»', 'ИП «Гайка и Ко»', 'завод «Красный Болт»', 'артель «Вечный Двигатель»', 'ТД «Станкоторг»', 'кооператив «Самоварные краны»', 'ООО «Три Кузнеца»', 'АО «Заклёпка Плюс»'];
    const PARTS = ['шестерён', 'фланцев', 'втулок', 'кронштейнов', 'заклёпок', 'валов', 'самоварных кранов', 'гаек повышенной духовности'];
    const staffEff = () => { const st = F().staff || []; return st.reduce((a, e) => a + (G.staffEff ? G.staffEff(e) : e.skill / 100 * 0.8), 0); };
    const budget$ = n => { const f = F(); if ((f.budget || 0) >= n) { f.budget -= n; return true; } if (G.s.money >= n) { G.addMoney(-n); return true; } return false; };
    const can$ = n => (F().budget || 0) >= n || G.s.money >= n;
    const orders = () => { const wk = G.week(), r = G.s.car.rank, sc = 0.6 + ((F().staff || []).length) / 8;
      return [0, 1, 2].map(i => { const h = k => G.hash(wk, i * 7 + k, 11); const qty = Math.round((150 + h(1) * 450) * sc / 10) * 10, price = Math.round(120 + h(2) * 180 + r * 8); return { id: wk * 10 + i, cust: CUST[Math.floor(h(3) * CUST.length)], part: PARTS[Math.floor(h(4) * PARTS.length)], qty, price, days: 10 + Math.floor(h(5) * 10) }; }); };

    // ---------- Меню «Производство и заказы»
    G.ecoMenu = function () {
      const s = G.s, f = F(), e = eco(), o = e.order, back = () => G.ecoMenu(), r = s.car.rank;
      const estRate = Math.min(0.5, MODES[e.mode].def + s.machine.wear / 400 + (e.cheap ? 0.08 : 0) + 0.04), need = o ? Math.max(0, Math.round((o.qty - o.good) * 0.4 * MODES[e.mode].raw / (1 - estRate) * 1.05 - e.raw)) : 0;
      const status = o ? '<br>Заказ: <b>' + o.cust + '</b> — ' + o.qty + ' ' + o.part + ' по ' + mon(o.price) + '<br>Готово годных: <b>' + o.good + '</b> из ' + o.qty + ' (брак ' + o.bad + ') · срок до дня ' + o.deadline + (s.t.day > o.deadline ? ' <b style="color:#ff5a46">(просрочено!)</b>' : ' (осталось ' + (o.deadline - s.t.day) + ' дн.)') : '<br>Активного заказа нет.';
      G.modal({ title: 'Производство и заказы', wide: true, text: 'Сырьё: <b>' + e.raw + ' кг</b> · цена металла: <b>' + rawPrice() + ' ₽/кг</b> · бюджет цеха: <b>' + mon(f.budget || 0) + '</b> · режим: <b>' + MODES[e.mode].n + '</b>' + status, opts: [
        { t: '📥 Принять заказ покупателя', dis: o ? 'Уже есть активный заказ' : null, fn: () => take() },
        { t: '🧱 Закупить металл', fn: () => buy(need) },
        { t: '🎚 Режим производства', fn: () => mode() },
        { t: '💰 Финансовый отчёт', fn: () => report() },
        { t: '🗑 Отказаться от заказа (−10% стоимости)', dis: !o ? 'Нет заказа' : null, fn: () => { const pen = Math.round(o.qty * o.price * 0.1); budget$(Math.min(pen, f.budget || 0)); G.fx({ boss: -3 }); e.order = null; msg('Заказчик недоволен. Неустойка ' + mon(pen) + '.', 'bad'); sp(); } },
        { t: 'Закрыть', fn: () => {} }] });
      function take() {
        const L = orders();
        G.modal({ title: 'Заказы покупателей', wide: true, text: 'Выбери заказ. Подумай о сырье, людях и сроках.', opts: L.map(x => ({ t: x.cust + ': ' + x.qty + ' ' + x.part + ' по ' + mon(x.price) + ' (выручка ' + mon(x.qty * x.price) + ') · срок ' + x.days + ' дн.', fn: () => { e.order = { cust: x.cust, part: x.part, qty: x.qty, price: x.price, deadline: s.t.day + x.days, made: 0, bad: 0, good: 0, start: s.t.day }; msg('Заказ принят: ' + x.qty + ' ' + x.part + ' для «' + x.cust.replace(/[«»]/g, '') + '». Закупи металл и выбери режим.', 'good'); sp(); mode(true); } })).concat([{ t: 'Назад', fn: back }]) });
      }
      function buy(n) {
        const p = rawPrice(), want = Math.max(50, Math.round(n || 200));
        G.modal({ title: 'Закупка металла', text: 'Цена: <b>' + p + ' ₽/кг</b> (меняется каждую неделю). Нужно примерно <b>' + want + ' кг</b> на заказ. Есть: ' + e.raw + ' кг.', opts: [
          { t: 'Качественный металл на ' + want + ' кг — ' + mon(want * p), dis: !can$(want * p) ? 'Нет денег' : null, fn: () => { budget$(want * p); e.exp += want * p; e.mExp += want * p; e.raw += want; e.cheap = false; msg('Металл закуплен: +' + want + ' кг.', 'good'); sp(); back(); } },
          { t: 'Дешёвый металл с примесями на ' + want + ' кг — ' + mon(want * p * 0.75), dis: !can$(want * p * 0.75) ? 'Нет денег' : null, fn: () => { budget$(want * p * 0.75); e.exp += want * p * 0.75; e.mExp += want * p * 0.75; e.raw += want; e.cheap = true; msg('Металл дешёвый: экономия есть, но брака будет больше.', 'warn'); sp(); back(); } },
          { t: 'Половина партии — ' + mon(want * p / 2), dis: !can$(want * p / 2) ? 'Нет денег' : null, fn: () => { budget$(want * p / 2); e.exp += want * p / 2; e.mExp += want * p / 2; e.raw += Math.round(want / 2); sp(); back(); } },
          { t: 'Назад', fn: back }] });
      }
      function mode(fromTake) {
        G.modal({ title: 'Режим производства', text: 'Выбери подход к производству (можно менять):', opts: Object.keys(MODES).map(k => ({ t: MODES[k].n + ' — ' + MODES[k].d, fn: () => { e.mode = k; msg('Режим: ' + MODES[k].n, 'good'); if (fromTake) back(); else back(); } })).concat([{ t: 'Назад', fn: back }]) });
      }
      function report() {
        G.modal({ title: 'Финансовый отчёт цеха', text: 'За всё время:<br>Выручка: <b>' + mon(e.rev) + '</b><br>Расходы (сырьё, электричество, ремонты): <b>' + mon(e.exp) + '</b><br>Прибыль: <b>' + mon(e.rev - e.exp) + '</b><br>Выполнено заказов: <b>' + e.done + '</b><br>Произведено деталей: ' + e.made + ' · брак: ' + e.rej + (e.made ? ' (' + Math.round(e.rej / e.made * 100) + '%)' : ''), opts: [{ t: 'Назад', fn: back }] });
      }
    };
    A('eco', { ph: ['work'], loc: 'shop', g: 'Управление', n: 'Производство и заказы', i: '🏭', menu: true, req: s => s.car.rank < 7 ? 'Нужна должность мастера' : null, fn: () => { G.ecoMenu(); return 'custom'; } });

    // ---------- Управленческие мини-игры
    const ovl = html => { const root = document.getElementById('app'), o = document.createElement('div'); o.className = 'gym-ov'; const b = document.createElement('div'); b.className = 'gym-box'; b.innerHTML = html; o.appendChild(b); root.appendChild(o); return { o, b, q: s => b.querySelector(s) }; };
    const grid = (u, items, cols) => { const g = u.q('#g'); g.style.cssText = 'display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:8px;margin:8px 0'; items.forEach(it => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = it.txt; b.onclick = () => it.on(b); g.appendChild(b); }); };
    G.mgGame = function (kind, cb) {
      try {
        if (kind === 'wires') return G.workGame('wires', 'РЕМОНТ СТАНКА', cb);
        if (kind === 'pack') { // Логистика: нажимай числа по порядку
          const u = ovl('<h3>🚚 ЛОГИСТИКА</h3><div class="gym-info">Погрузи ящики по порядку: 1, 2, 3… Чем быстрее, тем лучше.</div><div id="g"></div><div class="gym-rep" id="t">0.0 с</div>');
          const nums = shuf([1, 2, 3, 4, 5, 6, 7, 8, 9]); let nxt = 1, t0 = 0, pen = 0, done = false;
          grid(u, nums.map(n => ({ txt: '📦 ' + n, on: b => { if (done) return; if (!t0) t0 = Date.now(); if (n === nxt) { b.disabled = true; b.style.opacity = 0.3; nxt++; if (nxt > 9) { done = true; const t = (Date.now() - t0) / 1000 + pen; u.o.remove(); cb(C(1 - (t - 8) / 18, 0, 1)); } } else { pen += 1; u.q('#t').textContent = 'Не тот ящик! +1 с'; } } })), 3);
          return;
        }
        // inspect: контроль качества / охрана труда
        const QC = kind === 'qc';
        let items;
        if (QC) { items = []; for (let i = 0; i < 12; i++) { const bad = i < 4; const d = bad ? (0.07 + Math.random() * 0.08) * (Math.random() < 0.5 ? -1 : 1) : (Math.random() - 0.5) * 0.09; items.push({ txt: (10 + d).toFixed(2) + ' мм', bad }); } }
        else { const GOOD = ['🧯 Огнетушитель на месте', '🧤 Перчатки целы', '🦺 Жилет надет', '🚪 Проход свободен', '💡 Освещение в норме', '🪖 Каска надета'], BAD = ['🔌 Голые провода', '🚬 Курят у бочки с маслом', '👟 Тапочки вместо ботинок', '🛢 Масло на полу', '⛓ Ограждение снято', '🔓 Станок без заземления']; items = shuf(BAD).slice(0, 4).map(t => ({ txt: t, bad: true })).concat(shuf(GOOD).slice(0, 6).map(t => ({ txt: t, bad: false }))); }
        items = shuf(items); const badN = items.filter(x => x.bad).length;
        const u = ovl('<h3>' + (QC ? '🔬 КОНТРОЛЬ КАЧЕСТВА' : '🦺 ПРОВЕРКА ОХРАНЫ ТРУДА') + '</h3><div class="gym-info">' + (QC ? 'Эталон 10.00 мм, допуск ±0.05. Отметь детали с браком.' : 'Найди нарушения на производстве.') + ' Время: 12 с.</div><div id="g"></div><div class="gym-rep" id="t">12.0 с</div><button class="btn big hazard" id="d">ГОТОВО</button>');
        let hits = 0, wrong = 0, done = false, t0 = 0;
        const fin = () => { if (done) return; done = true; u.o.remove(); cb(C((hits - 0.6 * wrong) / badN, 0, 1)); };
        grid(u, items.map(it => ({ txt: it.txt, on: b => { if (done || b.dataset.x) return; b.dataset.x = 1; if (it.bad) { hits++; b.style.background = '#2f6b2c'; } else { wrong++; b.style.background = '#8a2a22'; } if (hits >= badN) fin(); } })), 2);
        u.q('#d').onclick = fin; const loop = ts => { if (done) return; if (!t0) t0 = ts; const el = (ts - t0) / 1000; u.q('#t').textContent = Math.max(0, 12 - el).toFixed(1) + ' с'; if (el >= 12) fin(); else requestAnimationFrame(loop); }; requestAnimationFrame(loop);
      } catch (e) { cb(0.5); }
    };
    const mg = (id, loc, n, i, rank, kind, fn) => A(id, { ph: ['work'], loc, g: 'Управление', n, i, menu: true, once: 'day', req: s => s.car.rank < rank ? 'Нужна должность выше' : null, fn: () => { G.mgGame(kind, sc => { fn(sc); sp(); }); return 'custom'; } });
    mg('eco_repair', 'shop', 'Ремонт станка (мини-игра)', '🔧', 6, 'wires', sc => { const e = eco(); const d = Math.round(15 + 20 * sc); G.s.machine.wear = Math.max(0, G.s.machine.wear - d); e.exp += 200; if (F().budget >= 200) F().budget -= 200; G.fx({ know: 1, energy: -5 }); msg('Станок отремонтирован: износ −' + d + '.', sc >= 0.6 ? 'good' : 'warn'); });
    mg('eco_qc', 'shop', 'Контроль качества партии', '🔬', 7, 'qc', sc => { const e = eco(); e.qcDays = sc >= 0.8 ? 5 : 3; G.fx({ know: 1, boss: 1 }); msg(sc >= 0.6 ? 'Браковка проведена: брака в партии станет меньше.' : 'Проверка вышла поверхностной.', sc >= 0.6 ? 'good' : 'warn'); });
    mg('eco_logi', 'shop', 'Логистика склада', '🚚', 7, 'pack', sc => { const e = eco(); e.logDays = sc >= 0.8 ? 5 : 3; G.fx({ energy: -4 }); msg(sc >= 0.6 ? 'Склад в порядке: отгрузка пойдёт быстрее.' : 'Склад разобран кое-как.', sc >= 0.6 ? 'good' : 'warn'); });
    mg('eco_safety', 'shop', 'Проверка охраны труда', '🦺', 7, 'safe', sc => { const e = eco(); e.safeDays = 7; G.relAdd('nadezhda', Math.round(4 * sc)); G.fx({ cons: 2, boss: 1 }); if (G.plantStats) { const f = F(); f.plan = C((f.plan || 50) + Math.round(3 * sc)); } msg(sc >= 0.6 ? 'Нарушения найдены и устранены. Надежда Николаевна довольна.' : 'Проверка прошла формально.', sc >= 0.6 ? 'good' : 'warn'); });
    const _mi3 = G.machineIncident; G.machineIncident = function () { if (eco().safeDays > 0 && G.chance(50)) { msg('Проверенные ограждения предотвратили аварию.', 'good'); return; } return _mi3.apply(this, arguments); };

    // ---------- Ежедневное производство
    const deliver = () => {
      const s = G.s, f = F(), e = eco(), o = e.order, late = Math.max(0, s.t.day - o.deadline), rate = o.made ? o.bad / o.made : 0, q = MODES[e.mode];
      let rev = o.qty * o.price * (rate <= 0.04 ? 1.15 : 1) * Math.max(0.6, 1 - 0.05 * late) * (e.mode === 'qual' ? 1.05 : 1);
      f.budget = (f.budget || 0) + Math.round(rev); e.rev += rev; e.mRev += rev; e.done++;
      const bonus = late === 0 ? Math.round(rev * 0.015) : 0; if (bonus) s.pay.acc += bonus;
      G.fx({ boss: late ? -2 : 4, mood: late ? -2 : 4 }); if (f.plan !== undefined) f.plan = C(f.plan + (late ? 1 : 5) + (rate <= 0.04 ? 2 : 0));
      G.modal({ title: '📦 Заказ выполнен', text: '«' + o.cust + '» получил ' + o.qty + ' ' + o.part + '.<br>Брак за время работы: ' + o.bad + ' (' + Math.round(rate * 100) + '%).<br>Выручка: <b>' + mon(rev) + '</b>' + (late ? '<br>Просрочка: ' + late + ' дн. (штраф к цене)' : '') + (bonus ? '<br>Тебе начислена премия: <b>' + mon(bonus) + '</b>' : ''), opts: [{ t: 'Отлично', fn: () => {} }] });
      if (G.boardAdd && late === 0 && rate <= 0.04) G.boardAdd('Заказ для «' + o.cust.replace(/[«»]/g, '') + '» выполнен в срок и без брака', 'good');
      if (e.done >= 3) G.achieve('orders3', 'Три заказа выполнено'); if (e.rev - e.exp >= 500000) G.achieve('profit500', 'Цех принёс прибыль в полмиллиона');
      e.order = null;
    };
    const ecoDaily = () => {
      const s = G.s, f = F(), e = eco(), o = e.order; if (e.qcDays > 0) e.qcDays--; if (e.logDays > 0) e.logDays--; if (e.safeDays > 0) e.safeDays--;
      if (G.weekday() === 0 && G.week() % 4 === 0 && (e.mRev || e.mExp)) { G.modal({ title: '📊 Итоги месяца', text: 'Выручка цеха: <b>' + mon(e.mRev) + '</b><br>Расходы: <b>' + mon(e.mExp) + '</b><br>Прибыль: <b>' + mon(e.mRev - e.mExp) + '</b>', opts: [{ t: 'Принято', fn: () => {} }] }); e.mRev = 0; e.mExp = 0; }
      if (!o) return;
      const q = MODES[e.mode], plan = G.plantStats ? G.plantStats().plan : 50, wear = s.machine.wear;
      const power = staffEff() + (s.car.rank >= 7 ? 0.5 : 0), pr = power * 14 * q.speed * (1 - wear / 200) * (0.7 + plan / 200) * (e.logDays > 0 ? 1.1 : 1) * (1 + (f.engBoost || 0));
      const need = 0.4 * q.raw; let made = Math.max(0, Math.round(pr)); const max = Math.floor(e.raw / need);
      if (max < made) { if (made > 0 && G.chance(60)) msg('Сырья не хватает: производство замедлилось. Закупи металл.', 'warn'); made = max; }
      e.raw = Math.max(0, Math.round((e.raw - made * need) * 10) / 10);
      const elec = 600 + Math.round(made * 2.5); e.exp += elec; f.budget = (f.budget || 0) - elec; e.mExp += elec;
      const rate = C(q.def + wear / 400 + (e.cheap ? 0.08 : 0) - (e.qcDays > 0 ? 0.05 : 0) + ((f.shopMorale || 50) < 35 ? 0.04 : 0), 0.01, 0.5), bad = Math.round(made * rate);
      o.made += made; o.bad += bad; o.good += made - bad; e.made += made; e.rej += bad; s.machine.wear = C(wear + Math.min(2, made / 40));
      if (o.good >= o.qty) deliver();
      else if (s.t.day - o.deadline > 10) { const pen = Math.round(o.qty * o.price * 0.2); f.budget = (f.budget || 0) - pen; e.exp += pen; G.fx({ boss: -6, mood: -4 }); if (f.plan !== undefined) f.plan = C(f.plan - 6); msg('Заказ «' + o.cust + '» сорван: неустойка ' + mon(pen) + '. Заказчик ушёл к конкурентам.', 'bad'); if (G.boardAdd) G.boardAdd('Сорван заказ для «' + o.cust.replace(/[«»]/g, '') + '»', 'bad'); e.order = null; }
      else if (s.t.day === o.deadline) msg('Сегодня срок сдачи заказа «' + o.cust + '»! Готово ' + o.good + ' из ' + o.qty + '.', 'warn');
    };
    const _dt23 = G.dailyTick; G.dailyTick = function () { const r = _dt23.apply(this, arguments); try { if (G.s.car.rank >= 6) ecoDaily(); } catch (e) {} return r; };
  })();


  // ======================= v2.4: карьерные ветки: охрана труда, ОТК, главный инженер =======================
  (function () {
    const D = G.D, C = G.clamp, msg = (t, c) => G.toast(t, c), sp = n => G.spend(n || 1);
    const F = () => G.s.flags, mon = n => G.rub(Math.round(n));
    const TR = {
      ot: { n: '🦺 Охрана труда', lv: ['Специалист по охране труда', 'Ведущий специалист по охране труда', 'Начальник отдела охраны труда'], bonus: [25000, 40000, 60000], npc: ['pelageya', 'Пенсионер-консультант (бывший начальник отдела ОТ)', 'gone', 'Пелагея Фёдоровна вышла на пенсию и передала тебе печать, чернила и красную ручку: «Строго, но справедливо».'] },
      otk: { n: '🔬 Контроль качества (ОТК)', lv: ['Контролёр-приёмщик', 'Старший контролёр', 'Начальник ОТК'], bonus: [30000, 55000, 85000], npc: ['ekaterina', 'Заведующая лабораторией', 'stay', 'Екатерина переведена заведовать лабораторией и осталась рядом. Она сказала, что давно мечтала о пробирках.'] },
      eng: { n: '📐 Инженерная линия', lv: ['Инженер-технолог', 'Ведущий инженер', 'Главный инженер предприятия'], bonus: [45000, 80000, 140000], npc: ['rassvetov', 'Советник по технике (на пенсии)', 'gone', 'Рассветов передал тебе ключи от сейфа с чертежами: «Допуск — это закон природы. Береги его».'] }
    };
    const rel = id => G.R(id).l;
    const reqs = k => { const s = G.s, f = F(), r = s.car.rank, st = s.st;
      if (k === 'ot') return [{ t: 'Разряд не ниже 4-го', ok: r >= 4 }, { t: 'Спец. корочка по ТБ (у Татищевой)', ok: G.hasCert('c_ts') }, { t: 'Знания не ниже 55', ok: st.know >= 55 }, { t: 'Отношения с Пелагеей Ф. от 20', ok: rel('pelageya') >= 20 }];
      if (k === 'otk') return [{ t: 'Разряд не ниже 5-го', ok: r >= 5 }, { t: 'Знания не ниже 65', ok: st.know >= 65 }, { t: 'Отношения с Екатериной Е. от 20', ok: rel('ekaterina') >= 20 }, { t: 'Выполнение плана не ниже 45', ok: (G.plantStats ? G.plantStats().plan : 50) >= 45 }];
      return [{ t: 'Должность не ниже зама начальника цеха', ok: r >= 8 }, { t: 'Диплом ВО (у Татищевой)', ok: G.hasCert('c_vo') }, { t: 'Знания не ниже 70', ok: st.know >= 70 }, { t: 'Отношения с Рассветовым от 30', ok: rel('rassvetov') >= 30 }];
    };
    const lvl = k => (F().tlvl || {})[k] || 1;
    const cur = () => F().track || null;

    // ---------- Отдел кадров: смена ветки
    G.tracksMenu = function () {
      const f = F(), back = () => G.tracksMenu(), t = cur();
      f.tlvl = f.tlvl || {}; f.tcnt = f.tcnt || {};
      G.modal({ title: 'Карьерные ветки', face: 'tatishcheva', wide: true, text: 'Татищева: «Основная линия — это путь начальника. А есть и другие дороги. Ветка сохраняет ваш разряд, но меняет работу и функции.»<br>Текущая ветка: <b>' + (t ? TR[t].lv[lvl(t) - 1] : 'основная линия (производство)') + '</b>', opts: Object.keys(TR).map(k => { const L = reqs(k), ok = L.every(x => x.ok); return { t: TR[k].n + (t === k ? ' (текущая)' : ''), dis: t === k ? 'Вы уже здесь' : null, fn: () => G.modal({ title: TR[k].n, face: 'tatishcheva', text: 'Условия перехода:<br>' + L.map(x => (x.ok ? '✅ ' : '❌ ') + x.t).join('<br>') + '<br>Прибавка к окладу: до ' + mon(TR[k].bonus[2]) + '/мес. на высшем уровне.', opts: [{ t: ok ? 'Оформить перевод' : 'Условия не выполнены', dis: ok ? null : 'Не выполнены', fn: () => { f.track = k; f.tlvl[k] = f.tlvl[k] || 1; f.tcnt[k] = f.tcnt[k] || 0; G.fx({ mood: 5, boss: 2 }); msg('Ты переведён: ' + TR[k].lv[lvl(k) - 1] + '. Работа и обязанности теперь другие.', 'good'); sp(); } }, { t: 'Назад', fn: back }] }) }; }).concat([{ t: '↩ Вернуться на основную линию', dis: !t ? 'Вы на основной линии' : null, fn: () => { f.track = null; msg('Вы вернулись на основную линию производства.'); sp(); } }, { t: 'Закрыть', fn: () => {} }]) });
    };
    A('tracks', { ph: ['work'], loc: 'admin', g: 'Заводоуправление', n: 'Карьерные ветки (отдел кадров)', i: '🧭', menu: true, req: s => s.car.rank < 4 ? 'Нужен разряд не ниже 4-го' : null, fn: () => { G.tracksMenu(); return 'custom'; } });

    // ---------- Название, оклад, рейтинг
    const _jt = G.jobTitle; G.jobTitle = function () { const t = cur(); return t ? TR[t].lv[lvl(t) - 1] : _jt.apply(this, arguments); };
    const _mp = G.monthlyPay; G.monthlyPay = function () { const v = _mp.apply(this, arguments), t = cur(); return t ? v + TR[t].bonus[lvl(t) - 1] : v; };
    const _oj = G.ojScore; G.ojScore = function () { const f = G.s.flags, tl = f.tlvl || {}; return _oj.apply(this, arguments) + 300 * Object.keys(tl).reduce((a, k) => a + (tl[k] - 1), 0); };

    // ---------- Работа в ветке: свои игры
    const ENG = [
      { q: 'Заказчик хочет сэкономить и заменить сталь на более дешёвую. Что решишь?', a: ['Пересчитать нагрузки и предложить допустимую замену', 'Согласиться без расчётов', 'Отказать и не объяснять'] },
      { q: 'В чертеже допуск 0.01 мм, а станок «гуляет» на 0.05.', a: ['Пересмотреть допуск или отправить станок в ремонт', 'Оставить как есть', 'Приказать рабочим «точнее смотреть»'] },
      { q: 'Расчёт показывает запас прочности 1.1. Норма — 1.5.', a: ['Усилить конструкцию и пересчитать', 'Округлить до 1.5', 'Отправить в производство и молиться'] },
      { q: 'Новая технология сулит выигрыш, но не опробована.', a: ['Провести опытную партию', 'Внедрить сразу на всё', 'Запретить любые новшества'] },
      { q: 'Рабочие просят изменить оснастку: так удобнее.', a: ['Оценить предложение и испытать', 'Отмахнуться', 'Одобрить без проверки'] },
      { q: 'Чертёж нужно сдать завтра, а в нём спорный узел.', a: ['Сообщить заказчику и согласовать срок', 'Скрыть узел', 'Нарисовать что-нибудь похожее'] }
    ];
    const _wf = G.ACT.work.fn;
    G.ACT.work.fn = function (s) {
      const t = cur(); if (!t || s.instr.perv == null) return _wf.apply(this, arguments);
      F().tcnt = F().tcnt || {}; F().tcnt[t] = (F().tcnt[t] || 0) + 1;
      if (t === 'ot') G.mgGame('safe', sc => { G.doOp(sc); const e = (F().eco = F().eco || {}); e.safeDays = Math.max(e.safeDays || 0, 3); });
      else if (t === 'otk') G.mgGame('qc', sc => { G.doOp(sc); const e = (F().eco = F().eco || {}); e.qcDays = Math.max(e.qcDays || 0, 2); });
      else G.workGame('bank', 'РАСЧЁТЫ И РЕШЕНИЯ', sc => { G.doOp(sc); if (sc >= 0.67 && G.chance(35)) F().engBoost = Math.min(0.3, (F().engBoost || 0) + 0.02); }, ENG);
      return 'custom';
    };

    // ---------- Особые действия веток
    const trk = (id, k, n, i, fn) => A(id, { ph: ['work'], loc: 'shop', g: 'Ветка: ' + TR[k].n.replace(/^\S+\s/, ''), n, i, menu: true, once: 'day', req: s => cur() === k ? null : 'Не здесь', fn: () => { fn(); return 'custom'; } });
    const INC = [['Рабочий порезал руку о заусенец.', 'Расследовать и выдать защитные перчатки', 'Сделать вид, что бывает'], ['На складе нашли бочку масла рядом с проходом.', 'Убрать, провести разбор, наказать виновных', 'Закрыть глаза'], ['У крана износился трос.', 'Остановить кран и заменить трос', 'Подождать до конца месяца'], ['Сварщик работал без маски.', 'Провести внеплановый инструктаж', 'Сделать выговор по-тихому']];
    trk('ot_case', 'ot', 'Расследовать происшествие', '📑', () => { const x = G.pick(INC); G.modal({ title: 'Происшествие', face: 'pelageya', text: x[0], opts: [{ t: x[1], fn: () => { G.fx({ cons: 3, boss: 2, know: 1 }); if (G.plantStats) { const f = F(); f.plan = C((f.plan || 50) + 1); } msg('Меры приняты. Протокол составлен, цех стал безопаснее.', 'good'); if (G.rumor) G.rumor('ot', 'Новый специалист по охране труда принимает меры всерьёз. Народ уважает и побаивается.', { coll: -1, boss: 2 }, 50); sp(); } }, { t: x[2], fn: () => { G.fx({ cons: -3, boss: -2 }); G.s.pay.pen += 1500; msg('Закрыл глаза, но Надежда Николаевна заметила. Премию сняли (−1 500 ₽).', 'bad'); sp(); } }] }); });
    trk('ot_brief', 'ot', 'Провести инструктаж для цеха', '🦺', () => { const e = (F().eco = F().eco || {}); e.safeDays = 7; (F().staff || []).forEach(x => { x.skill = Math.min(95, x.skill + 1); x.loy = Math.min(100, x.loy + 1); }); G.fx({ know: 1, energy: -4, mood: 1 }); G.relAdd('nadezhda', 2); msg('Инструктаж проведён: весь цех знает, где огнетушитель. Почти все.', 'good'); sp(); });
    const ACC = [['Партия принята: 3 % брака. Но цех просит принять «ради плана».', 'Принять с замечанием', 'Забраковать и вернуть на доработку', 'Взять конверт и подписать'], ['Заказчик давит: «Нам нужно сегодня».', 'Принять только годные', 'Подписать всё', 'Потребовать пересортировку'], ['Мастер просит закрыть глаза на пару деталей.', 'Отказать вежливо', 'Согласиться по-дружески', 'Передать начальнику цеха']];
    trk('otk_accept', 'otk', 'Приёмка партии', '📋', () => { const x = G.pick(ACC); G.modal({ title: 'Приёмка', face: 'ekaterina', text: x[0], opts: [{ t: x[1], fn: () => { G.fx({ cons: 2, boss: 1 }); if (F().eco) F().eco.qcDays = Math.max(F().eco.qcDays || 0, 3); msg('Приёмка прошла по правилам. Брака на выходе меньше.', 'good'); sp(); } }, { t: x[2], fn: () => { G.fx({ boss: 2, cons: 3 }); if (G.plantStats) { const f = F(); f.plan = C((f.plan || 50) - 2); } msg('Строго и честно, но план просел.', 'warn'); sp(); } }, { t: x[3], fn: () => { G.addMoney(1500); G.fx({ cons: -5, boss: -2 }); if (G.rumor) G.rumor('otk', 'Поговаривают, что в ОТК всё решается «по-людски». Особенно за конверт.', { cons: -2, boss: -3 }, 70); msg('Взял 1 500 ₽ и подписал. Совесть тоже подписала, но неохотно.', 'bad'); sp(); } }] }); });
    trk('eng_design', 'eng', 'Разработать рацпредложение', '✏️', () => { G.workGame('tol', 'ЧЕРТЁЖ И ДОПУСКИ', sc => { const f = F(); f.engBoost = Math.min(0.3, (f.engBoost || 0) + 0.03 * sc); G.fx({ know: 2, energy: -5, boss: sc >= 0.6 ? 3 : 0 }); msg(sc >= 0.6 ? 'Рацпредложение принято: цех работает быстрее (+' + Math.round(f.engBoost * 100) + '%).' : 'Чертёж вышел сырым. Нужны доработки.', sc >= 0.6 ? 'good' : 'warn'); if (sc >= 0.8 && G.boardAdd) G.boardAdd('Рацпредложение инженера принято в производство', 'good'); sp(); }); });

    // ---------- Рост в ветке и смена кадров
    const need = { ot: [40, 120], otk: [40, 120], eng: [35, 100] };
    const lvReq = (k, L) => { const st = G.s.st, p = G.plantStats ? G.plantStats().plan : 50; if (L === 2) return st.know >= 60 && (k !== 'eng' || p >= 50); if (k === 'ot') return st.know >= 75 && rel('pelageya') >= 40 && rel('nadezhda') >= 30; if (k === 'otk') return st.know >= 75 && rel('ekaterina') >= 30 && p >= 55; return st.know >= 80 && rel('rassvetov') >= 40 && G.hasCert('c_vo') && p >= 60; };
    const trackDaily = () => { const f = F(), k = cur(); if (!k) return; const n = (f.tcnt || {})[k] || 0, L = lvl(k); if (L >= 3) return;
      if (n >= need[k][L - 1] && lvReq(k, L + 1)) { f.tlvl[k] = L + 1; G.fx({ boss: 5, mood: 8 }); G.modal({ title: '⭐ Повышение в ветке', text: 'Ты получил должность: <b>' + TR[k].lv[L] + '</b>. Оклад вырос, обязанности расширились.', opts: [{ t: 'Отлично', fn: () => {} }] });
        if (L + 1 === 3) { const m = TR[k].npc; f.npcMoved = f.npcMoved || {}; f.npcMoved[m[0]] = { role: m[1], mode: m[2] }; msg(m[3], 'warn'); if (G.applyMoves) G.applyMoves(); G.achieve('track3_' + k, 'Вершина ветки: ' + TR[k].lv[2]); if (G.boardAdd) G.boardAdd('Новый руководитель направления: ' + TR[k].lv[2], 'good'); } } };
    const _dt24 = G.dailyTick; G.dailyTick = function () { const r = _dt24.apply(this, arguments); try { trackDaily(); } catch (e) {} return r; };
  })();


  // ======================= v3.1: транспорт и машины, больничный, увольнение, медкомиссия, рвота, «Приспичело» =======================
  (function () {
    const D = G.D, C = G.clamp, K = G.career, msg = (t, c) => G.toast(t, c), sp = n => G.spend(n || 1);
    const F = () => G.s.flags, mon = n => G.rub(Math.round(n));
    const CFG = G.CONFIG;

    // ---------- Стили оверлеев (рвота и «Приспичело»)
    const css = document.createElement('style');
    css.textContent = '.vomit-ov{position:absolute;inset:0;z-index:80;background:radial-gradient(circle at 30% 20%,#6b8e23 0,#3d5a14 45%,#22330b 100%);display:flex;align-items:center;justify-content:center;padding:16px;animation:vwob .5s infinite alternate}@keyframes vwob{from{filter:hue-rotate(0)}to{filter:hue-rotate(25deg)}}.vomit-box{width:100%;max-width:420px;text-align:center;color:#f4ffd0}.vomit-box .big{font-size:90px;animation:vshk .25s infinite alternate}@keyframes vshk{from{transform:rotate(-8deg) scale(1)}to{transform:rotate(8deg) scale(1.1)}}.v-bar{height:22px;background:#142006;border:2px solid #000;margin:10px 0;overflow:hidden}.v-bar i{display:block;height:100%;background:linear-gradient(90deg,#b5d63a,#f2e04a);transition:width .08s}.v-bar.red i{background:linear-gradient(90deg,#e8a33a,#d33)}.press-ov{position:absolute;inset:0;z-index:80;background:#240c0c;display:flex;align-items:center;justify-content:center;padding:16px;animation:pflash .4s infinite alternate}@keyframes pflash{from{background:#240c0c}to{background:#4a1010}}.press-box{width:100%;max-width:420px;text-align:center;color:#ffe7d0}.press-box .big{font-size:80px}';
    document.head.appendChild(css);

    // ---------- 1. Драки: только с мужчинами (не с женщинами и не с котом)
    const NOFIGHT = ['tatishcheva', 'shurygina', 'lyudka', 'tatyana', 'pelageya', 'tamara', 'nadezhda', 'lidiya', 'ekaterina', 'alevtina', 'allochka', 'nyura', 'vika', 'chugunok', 'belka'];
    G.noFight = id => NOFIGHT.indexOf(id) >= 0;
    const _fight = G.fight; G.fight = function (id) { if (G.noFight(id)) { msg('С женщинами и котами не дерёмся. Совесть и Чугунок не позволят.', 'warn'); return; } return _fight.apply(this, arguments); };
    const _spf = G.npcSpecial; G.npcSpecial = function (id) { const o = _spf.apply(this, arguments); return G.noFight(id) ? o.filter(x => !/Нарваться на драку/.test(x.t)) : o; };

    // ---------- 2. Энергия и настроение падают быстрее (настраивается в config.js)
    const _adv = G.advance; G.advance = function (h) {
      _adv.apply(this, arguments); const s = G.s, st = s.st, work = s.phase === 'work' || s.phase === 'lunch', k = work ? 1 : 0.5;
      st.energy = C(st.energy - (CFG.DRAIN_ENERGY === undefined ? 0.7 : CFG.DRAIN_ENERGY) * k * h); st.mood = C(st.mood - (CFG.DRAIN_MOOD === undefined ? 0.45 : CFG.DRAIN_MOOD) * k * h); capMood();
    };
    // Нервный срыв вместо мгновенного «ушёл сам»: раз в 8 недель
    const _ce = G.checkEnd; G.checkEnd = function () {
      const s = G.s; if (s && !s.end && s.phase !== 'new' && s.st.mood <= 0 && (F().breakdownWk === undefined || G.week() - F().breakdownWk >= 8)) {
        F().breakdownWk = G.week(); s.st.mood = 25; s.st.energy = Math.max(s.st.energy, 35); s.car.sickUntil = Math.max(s.car.sickUntil || -1, s.t.day + 2);
        msg('Нервный срыв: ты рыдал у станка. Врач выписал два дня отдыха.', 'bad');
      }
      return _ce.apply(this, arguments);
    };

    // ---------- 3. Больничный: свободный день вместо тупика
    const _sd = G.startDay; G.startDay = function () {
      const r = _sd.apply(this, arguments), s = G.s;
      if (s.car.sickUntil >= s.t.day && G.isWorkday()) { s.phase = 'weekend'; s.t.hour = 9; s.loc = 'home'; s.day.sick = true; msg('🤒 Больничный: сегодня свободный день. Отдыхай, занимайся чем хочешь, а завтра по расписанию.', 'warn'); }
      return r;
    };

    // ---------- 4. Увольнение: взятка директору или заявление
    const _fr = G.fireRisk; G.fireRisk = function () { const r = _fr.apply(this, arguments), k = (G.s && G.s.car.rank) || 0; return Math.round(r * Math.max(0.3, 1 - k * 0.07)); };
    const _end = G.end;
    G.end = function (id) {
      const s = G.s;
      if (id === 'fired' && s && !s.end && s.phase !== 'new' && !G._bribeBusy && (F().bribeWk === undefined || G.week() - F().bribeWk >= 6)) {
        G._bribeBusy = true; const cost = Math.round((60000 + 30000 * s.car.rank + 25000 * s.car.rep) / 1000) * 1000, self = this, args = arguments;
        G.modal({ title: '📄 ПРИКАЗ ОБ УВОЛЬНЕНИИ', face: 'truhanov', vib: 'error', text: 'Труханов подписывает приказ и смотрит поверх очков: «Но я человек не злой. Вопрос можно решить лично. Сумма — <b>' + mon(cost) + '</b>. Без расписки».', opts: [
          { t: '💰 Дать взятку генеральному директору (' + mon(cost) + ')', dis: s.money < cost ? 'Нет денег' : null, fn: () => {
            G._bribeBusy = false; G.addMoney(-cost); F().bribeWk = G.week();
            if (G.chance(80)) { s.car.rep = Math.max(0, s.car.rep - 1); G.fx({ boss: -8, cons: -6 }); msg('Труханов убрал конверт, как фокусник. «Приказ… потерялся. Работайте». Но теперь ты у него в блокнотике по-другому.', 'warn'); if (G.boardAdd) G.boardAdd('Вопрос с увольнением решён «лично»', 'bad'); }
            else { msg('Деньги Труханов взял, приказ подписал всё равно. «Благодарю за вклад».', 'bad'); _end.apply(self, args); } } },
          { t: '🚪 Уволиться (подписать заявление)', fn: () => { G._bribeBusy = false; _end.apply(self, args); } }] });
        return;
      }
      return _end.apply(this, arguments);
    };

    // ---------- 5. Медкомиссия без мгновенного конца игры
    K.medCommission = function () {
      const s = G.s, st = s.st; let fails = 0; const rep = [];
      const rooms = [['Терапевт', st.health >= 45 && st.tox <= 65], ['ЛОР и рентген лёгких', st.tox <= 55], ['Нарколог', st.habit <= 60 && !(s.day.peak > 40)], ['Психиатр', st.mood >= 25 && !s.flags.burnout], ['Невролог и окулист', !(s.car.lowE > 5)]];
      const finish = () => {
        rooms.forEach(r => { if (!r[1]) fails++; rep.push((r[1] ? '✅ ' : '❌ ') + r[0]); });
        let verdict, fx = {}, final = false, extra = '';
        if (fails === 0) verdict = 'ГОДЕН';
        else if (fails === 1) { verdict = 'ГОДЕН С ОГРАНИЧЕНИЕМ'; s.flags.limited = G.week() + 8; fx = { mood: -4 }; extra = '<br><br>Перевод на лёгкий труд: оклад −10% на 8 недель.'; }
        else if (fails === 2) { verdict = 'ПРОФЗАБОЛЕВАНИЕ'; fx = { money: -12000, health: 15, tox: -30 }; s.car.sickUntil = s.t.day + 14; extra = '<br><br>Лечение 2 недели, платное (12 000 ₽).'; }
        else { s.flags.medUnfit = (s.flags.medUnfit || 0) + 1; if (s.flags.medUnfit >= 2) { verdict = 'НЕ ГОДЕН'; final = true; } else { verdict = 'НЕ ГОДЕН (УСЛОВНО)'; fx = { money: -15000, health: 20, tox: -40, mood: -5 }; s.car.sickUntil = s.t.day + 21; s.flags.limited = G.week() + 12; extra = '<br><br>Последнее предупреждение: 3 недели лечения (платно, 15 000 ₽) и лёгкий труд 12 недель. Следующая комиссия — через 12 недель. Не пройдёшь снова — спишут по здоровью.'; } }
        if (fails <= 1) s.flags.medUnfit = 0;
        s.flags.medNext = G.week() + (verdict.indexOf('УСЛОВНО') >= 0 ? 12 : 26); G.fx(fx);
        G.modal({ title: 'МЕДКОМИССИЯ: ' + verdict, vib: fails ? 'error' : 'success', face: 'alevtina', text: rep.join('<br>') + extra, opts: [{ t: 'Ок', fn: () => { if (final) G.end('health'); else if (s.car.sickUntil >= s.t.day) { s.phase = 'weekend'; s.t.hour = 9; s.loc = 'home'; s.day.sick = true; } else { s.phase = 'work'; s.loc = 'shop'; s.t.hour = 8; G.advance(4); G.settle(); } } }] });
      };
      const opts = [];
      if (G.has('env1')) opts.push({ t: '✉ Подмазать врача (все кабинеты пройдены)', fn: () => { G.give('env1', -1); G.fx({ cons: -4 }); rooms.forEach(r => { r[1] = true; }); finish(); } });
      opts.push({ t: 'Идти по кабинетам', fn: finish });
      G.modal({ title: 'ПЛАНОВАЯ МЕДКОМИССИЯ', face: 'alevtina', text: 'Раз в полгода — обязательно. Терапевт, ЛОР, нарколог, психиатр, рентген, анализы. Не пил молоко? Узнаем.', opts });
    };

    // ---------- 6. Машины и дорога на работу
    Object.assign(D.STATUS, {
      car0: { n: 'Запорожец «Горбатый»', p: 60000, e: '🚗', tier: 'car', v: 0.5 },
      car1b: { n: '«Лада-Гранта»', p: 350000, e: '🚗', tier: 'car', v: 1.5 },
      car2b: { n: 'Японская иномарка (праворукая)', p: 1200000, e: '🚙', tier: 'car', v: 2.5 },
      car4: { n: 'Спорткар «Бумер»', p: 8000000, e: '🏎️', tier: 'car', v: 4 }
    });
    D.NICKS.zasranec = { n: 'Засранец', fx: { coll: -1 }, bad: 1 };
    const carOwned = () => { const k = Object.keys(G.s.own || {}).find(x => D.STATUS[x] && D.STATUS[x].tier === 'car'); return k ? { key: k, v: D.STATUS[k].v, n: D.STATUS[k].n } : null; };
    const fuelCost = v => Math.round((500 + 1100 * v + 300 * v * v) / 100) * 100, svcCost = v => Math.round((900 + 1800 * v + 500 * v * v) / 100) * 100;
    G.carInfo = carOwned;
    const car$ = () => { const f = F(), c = carOwned(); if (!c) return null; if (!f.car || f.car.key !== c.key) f.car = { key: c.key, cond: 100, fuelWk: -1, broken: -1 }; return Object.assign(f.car, { v: c.v, n: c.n }); };
    const MODES = { walk: '🚶 Пешком', scooter: '🛴 Электросамокат', bus: '🚌 Автобус', car: '🚗 Своя машина' };
    const carBlock = () => { const c = car$(); if (!c) return 'Нет машины'; if (c.broken >= G.s.t.day) return 'Машина в ремонте до дня ' + c.broken; const need = c.fuelWk !== G.week() ? fuelCost(c.v) : 0; return need > G.s.money ? 'Нет денег на бензин (' + mon(need) + ')' : null; };
    const modeInfo = m => { const c = car$(); return ({ walk: 'сильнее устанешь (−8 энергии)', scooter: '300 ₽, почти не устаёшь', bus: '60 ₽, энергия цела, но настроение падает (−8)', car: c ? c.n + (c.fuelWk !== G.week() ? ' · заправка ' + mon(fuelCost(c.v)) : ' · бак полон') : '' })[m]; };
    const canMode = m => { const s = G.s; if (m === 'scooter' && s.money < 300) return 'Нет денег'; if (m === 'bus' && s.money < 60) return 'Нет денег'; if (m === 'car') return carBlock(); return null; };
    function go(mode, next) {
      const s = G.s, f = F(), st = s.st, c = car$();
      f.commute = { mode }; s.day.commute = mode;
      if (mode === 'walk') { G.fx({ energy: -8, mood: -1 }); msg('Дошёл пешком. Ноги гудят.'); }
      else if (mode === 'scooter') { G.fx({ money: -300, energy: -2, mood: 1 }); msg('Прокатился на электросамокате: ветер, свобода и минус 300 ₽.'); }
      else if (mode === 'bus') { G.fx({ money: -60, mood: -8 }); msg('Автобус: давка, запахи, чужой локоть. Энергия цела, настроение — нет.', 'warn'); }
      else {
        if (c.fuelWk !== G.week()) { G.addMoney(-fuelCost(c.v)); c.fuelWk = G.week(); G.toast('Заправился на неделю: −' + mon(fuelCost(c.v)), 'warn'); }
        const p = Math.max(0.02, (0.03 + (100 - c.cond) * 0.0015) * Math.max(0.6, 1.6 - 0.25 * c.v)); c.cond = Math.max(0, c.cond - 2.5);
        G.fx({ mood: 2 + Math.round(c.v * 1.5), cool: Math.round(c.v) });
        if (G.chance(p * 100)) { c.broken = s.t.day + (c.v < 2 ? 3 : 2); const rc = Math.min(s.money, Math.round(svcCost(c.v) * 0.5)); G.addMoney(-rc); G.fx({ energy: -6, mood: -5, boss: -1 }); msg('🔧 Машина сломалась по дороге! Эвакуатор и ремонт: −' + mon(rc) + '. Опоздал и вымотался. Пару дней она в сервисе.', 'bad'); }
        else msg('Приехал на ' + c.n + '. Сидеть в тепле — уже счастье.', 'good');
      }
      next();
    }
    G.commuteChoose = function (next) {
      const f = F(), opts = [];
      if (f.commute && f.commute.mode && !canMode(f.commute.mode)) opts.push({ t: '↩ Как обычно: ' + MODES[f.commute.mode], fn: () => go(f.commute.mode, next) });
      Object.keys(MODES).forEach(m => { if (m === 'car' && !carOwned()) return; opts.push({ t: MODES[m] + ' — ' + modeInfo(m), dis: canMode(m), fn: () => go(m, next) }); });
      G.modal({ title: 'Как добираешься на работу?', text: 'Утро. Смена с 8:00.', opts });
    };
    function homeTrip() {
      const s = G.s, m = s.day && s.day.commute; if (!m) return;
      if (m === 'walk') { G.fx({ energy: -4 }); msg('Домой пешком: устал, но дошёл.'); }
      else if (m === 'scooter') { if (s.money >= 150) { G.fx({ money: -150, energy: -1 }); msg('Домой на самокате: −150 ₽.'); } else { G.fx({ energy: -4 }); msg('Самокат не оплатить — пошёл пешком.', 'warn'); } }
      else if (m === 'bus') { G.fx({ money: -Math.min(60, Math.max(0, s.money)), mood: -4 }); msg('Домой на автобусе: давка и тоска.', 'warn'); }
      else { const c = car$(); if (c && c.broken < s.t.day) { G.fx({ mood: 1 }); c.cond = Math.max(0, c.cond - 1.5); msg('Домой на машине: тепло и музыка.'); } else { G.fx({ energy: -4 }); } }
    }
    const _es2 = G.endShift; G.endShift = function () { try { homeTrip(); } catch (e) {} return _es2.apply(this, arguments); };
    const wrapCommute = () => {
      if (G._commuteWrapped || !K || !K.goToWork) return; G._commuteWrapped = true; const orig = K.goToWork.bind(K);
      K.goToWork = function () {
        const s = G.s;
        if (!s || !s.day || s.day.commute || s.car.sickUntil >= s.t.day) return orig();
        G.commuteChoose(() => orig());
      };
    };
    window.addEventListener('load', wrapCommute); setTimeout(wrapCommute, 50);
    A('car_service', { ph: ['free'], loc: 'home', g: 'Быт', n: 'Техобслуживание машины', i: '🛠️', menu: true, req: s => { const c = car$(); return !c ? 'Нет машины' : c.cond >= 98 && c.broken < s.t.day ? 'Машина в порядке' : s.money < svcCost(c.v) ? 'Нет денег (' + mon(svcCost(c.v)) + ')' : null; }, fn: () => { const c = car$(), p = svcCost(c.v); G.addMoney(-p); c.cond = 100; c.broken = -1; G.fx({ mood: 2 }); msg('ТО пройдено (' + mon(p) + '): масло, колодки, фильтры. Машина как новая.', 'good'); sp(); return 'custom'; } });
    // Машина — постоянный плюс к энергии, настроению, уважению
    const _dt25 = G.dailyTick; G.dailyTick = function () {
      const r = _dt25.apply(this, arguments), s = G.s, st = s.st, c = car$();
      if (c) { if (c.broken >= s.t.day) st.mood = C(st.mood - 1); else { st.energy = C(st.energy + 1 + c.v); st.mood = C(st.mood + 1 + 0.7 * c.v); if (st.coll < 35 + 12 * c.v) st.coll = C(st.coll + 0.25 * c.v); if (st.cool < 30 + 14 * c.v) st.cool = C(st.cool + 0.25 * c.v); } }
      capMood(); return r;
    };

    // ---------- 7. Засранец: потолок настроения и уважения
    const hasNick = id => G.s && G.s.nicks && G.s.nicks.indexOf(id) >= 0;
    function capMood() { const s = G.s; if (s && s.st && hasNick('zasranec')) { s.st.mood = Math.min(s.st.mood, 50); s.st.coll = Math.min(s.st.coll, 38); } }

    // ---------- 8. Рвота при сильном опьянении
    G.vomitGame = function () {
      const s = G.s, root = document.getElementById('app'); if (!root || document.getElementById('vomit-ov') || s.day.vomitDone) return; s.day.vomitDone = 1;
      const o = document.createElement('div'); o.id = 'vomit-ov'; o.className = 'vomit-ov';
      o.innerHTML = '<div class="vomit-box"><div class="big">🤮</div><h3>ТОШНИТ!</h3><div class="gym-info" style="color:#f4ffd0">Тапай быстро, чтобы удержать! Шкала не должна дойти до края.</div><div class="v-bar" id="vb"><i id="vf" style="width:50%"></i></div><div class="gym-rep" id="vt">5.0 с</div><button class="btn big hazard" id="vbtn">ТЕРПИ! 🤢</button></div>';
      root.appendChild(o); let v = 50, t0 = 0, last = 0, done = false; const bar = o.querySelector('#vf'), vb = o.querySelector('#vb'), T = 5;
      const fin = ok => { if (done) return; done = true; o.remove(); if (G.buzz) G.buzz(ok ? 'success' : 'error');
        if (ok) { G.fx({ mood: -2 }); msg('Удержался! Желудок передумал. Пока.', 'good'); }
        else { G.fx({ mood: -12, neat: -30, coll: -4, health: -3, satiety: -25, drunk: -35, cool: -3 }); msg('🤮 Блеванул. Прямо при всех. Позор, лужа и запах.', 'bad'); if (s.phase === 'work') G.fx({ boss: -2 }); if (G.rumor) G.rumor('vomit', 'Все обсуждают, как тебя вывернуло. Некоторые — в красках.', { coll: -2, cool: -2 }, 100); if (G.boardAdd) G.boardAdd('Выставил на всеобщее обозрение содержимое желудка', 'bad'); if (G.chance(30)) G.addNick('fontan'); } };
      o.querySelector('#vbtn').onclick = () => { v = Math.max(0, v - 9); };
      const loop = ts => { if (done) return; if (!t0) { t0 = ts; last = ts; } const dt = Math.min(0.05, (ts - last) / 1000); last = ts; v += dt * 22; bar.style.width = Math.min(100, v) + '%'; vb.className = 'v-bar' + (v > 75 ? ' red' : ''); const el = (ts - t0) / 1000; o.querySelector('#vt').textContent = Math.max(0, T - el).toFixed(1) + ' с'; if (v >= 100) fin(false); else if (el >= T) fin(true); else requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    };
    const _fx25 = G.fx; G.fx = function (f, ctx) { const r = _fx25.apply(this, arguments); try { capMood(); const s = G.s; if (s && s.st && s.st.drunk >= 85 && s.day && !s.day.vomitDone && s.phase !== 'new') setTimeout(() => G.vomitGame(), 80); } catch (e) {} return r; };

    // ---------- 9. «Приспичело»: 1–3 раза в неделю, по разу за смену
    G.pressGame = function () {
      const s = G.s, root = document.getElementById('app'); if (!root || document.getElementById('press-ov')) return;
      const o = document.createElement('div'); o.id = 'press-ov'; o.className = 'press-ov';
      o.innerHTML = '<div class="press-box"><div class="big">🚽</div><h3>ПРИСПИЧЕЛО!</h3><div class="gym-info" style="color:#ffe7d0">Бегом до туалета! Тапай, чтобы дотерпеть и добежать (14 тапов).</div><div class="v-bar red" id="pb"><i id="pf" style="width:0%"></i></div><div class="gym-rep" id="pt">5.0 с</div><button class="btn big hazard" id="pbtn">ТЕРПЕТЬ И БЕЖАТЬ! 🏃</button></div>';
      root.appendChild(o); let n = 0, t0 = 0, done = false; const T = 5.2, bar = o.querySelector('#pf');
      const fin = ok => { if (done) return; done = true; o.remove(); if (G.buzz) G.buzz(ok ? 'success' : 'error'); const f = F();
        if (ok) { G.fx({ mood: 1 }); msg('Успел! Дверь кабинки захлопнулась вовремя. Лучшая победа за неделю.', 'good'); }
        else { f.pooCount = (f.pooCount || 0) + 1; G.fx({ mood: -15, neat: -45, coll: -5, cool: -8, boss: -2 }); msg('💩 Не успел. Обкакался. Тихо, быстро и безнадёжно.', 'bad'); if (G.rumor) G.rumor('poo', 'По заводу пошли слухи: «Видели, что случилось у кабинки? Не подходи близко».', { coll: -3, cool: -2 }, 100); if (G.boardAdd) G.boardAdd('Не добежал до туалета', 'bad'); if (f.pooCount >= 2) G.addNick('zasranec'); if (s.phase === 'work') sp(); } };
      o.querySelector('#pbtn').onclick = () => { n++; bar.style.width = Math.min(100, n / 14 * 100) + '%'; if (n >= 14) fin(true); };
      const loop = ts => { if (done) return; if (!t0) t0 = ts; const el = (ts - t0) / 1000; o.querySelector('#pt').textContent = Math.max(0, T - el).toFixed(1) + ' с'; if (el >= T) fin(false); else requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    };
    const pressPlan = () => { const f = F(), wk = G.week(); if (f.pressWk === wk && f.pressDays) return; f.pressWk = wk; const k = G.pick([1, 2, 3]), base = G.s.t.day, cand = [0, 1, 2, 3, 4, 5, 6].map(x => base + x).sort(() => Math.random() - 0.5); f.pressDays = cand.slice(0, k); };
    const _kh25 = K.hook; K.hook = function () {
      const r = _kh25.apply(this, arguments);
      try { const s = G.s; if (s && s.phase === 'work' && !s.day.pressDone && s.car.shifts >= 2) { pressPlan(); const h = 9 + Math.floor(G.hash(s.t.day, 5, 3) * 7); if (F().pressDays.indexOf(s.t.day) >= 0 && s.t.hour >= h) { s.day.pressDone = 1; setTimeout(() => G.pressGame(), 100); } } } catch (e) {}
      return r;
    };
  })();


  // ======================= v3.2: прогресс (уровни, цели, бонус дня), Тамара-сплетница, романтика по рангам, алкаш, проходная, задержки зарплаты =======================
  (function () {
    const D = G.D, C = G.clamp, K = G.career, msg = (t, c) => G.toast(t, c), sp = n => G.spend(n || 1);
    const F = () => G.s.flags, mon = n => G.rub(Math.round(n)), esc = x => String(x).replace(/[<>&]/g, '');
    const scale = () => C((G.monthlyPay ? G.monthlyPay() : 30000) / 30000, 1, 5);   // награды растут вместе с зарплатой, но остаются скромными
    const hasNick = id => G.s && G.s.nicks && G.s.nicks.indexOf(id) >= 0;

    // ---------- Новые предметы: минералка; больше телефонов
    D.ITEMS.mineral = { n: 'Минералка «Чугунная ключевая»', p: 70, cat: 'аптека', e: '💧', use: {}, sober: 25, d: 'Чем больше пьёшь за день — тем быстрее трезвеешь (−25…−45 опьянения)' };
    Object.assign(D.STATUS, {
      phone0: { n: 'Кнопочный «Кирпич-3310»', p: 1500, e: '📱', tier: 'phone', v: 0.3 },
      phone1b: { n: 'Смартфон «Мелкомягкий»', p: 12000, e: '📱', tier: 'phone', v: 1.5 },
      phone2b: { n: 'Игровой «Дракон-X»', p: 45000, e: '📱', tier: 'phone', v: 2.5 },
      phone3b: { n: 'Складной «Раскладушка Z»', p: 140000, e: '📱', tier: 'phone', v: 3.5 },
      phone4: { n: 'Золотой «Вертю»', p: 450000, e: '📱', tier: 'phone', v: 5 }
    });
    D.NICKS.alkash = { n: 'Алкаш', fx: { coll: -2, boss: -2, cons: -1 }, bad: 1 };
    const _ui = G.useItem; G.useItem = function (id) {
      const had = G.s && G.has(id), it = D.ITEMS[id], r = _ui.apply(this, arguments);
      if (had && it && it.sober) { const f = F(), n = (f.minToday && f.minToday.d === G.s.t.day ? f.minToday.n : 0); f.minToday = { d: G.s.t.day, n: n + 1 }; const dr = Math.min(45, it.sober + 5 * n); G.fx({ drunk: -dr, mood: 1 }); G.s.smell = Math.max(0, (G.s.smell || 0) - 10); msg('💧 Минералка: опьянение −' + dr + (n ? ' (организм вошёл во вкус)' : '') + '.', 'good'); }
      return r;
    };

    // ---------- Опыт и уровни («Путь заводчанина»)
    const xpFor = L => (L - 1) * (L - 1) * 30, lvlOf = xp => Math.min(40, Math.floor(Math.sqrt(xp / 30)) + 1);
    const TITLES = ['Новобранец', 'Подсобник', 'Рабочая косточка', 'Цеховой', 'Уважаемый человек', 'Мастер на все руки', 'Заводская легенда', 'Железный человек', 'Чугунная душа', 'Икона завода'];
    const titleOf = L => TITLES[Math.min(TITLES.length - 1, Math.floor((L - 1) / 4))];
    const ICYCLE = ['mineral', 'choco', 'rassol', 'coffee', 'vitamins', 'flowers', 'env1'];
    const rewardFor = L => ({ money: Math.round(250 * L * scale() / 50) * 50, item: L % 3 === 0 ? ICYCLE[(L / 3 - 1) % ICYCLE.length] : null });
    G.xp = function (n) { const f = F(); f.xp = (f.xp || 0) + Math.round(n); G.checkLevel(); };
    G.checkLevel = function () {
      const f = F(); f.lvl = f.lvl || 1;
      while (lvlOf(f.xp || 0) > f.lvl) {
        f.lvl++; const r = rewardFor(f.lvl); G.addMoney(r.money); if (r.item) G.give(r.item, 1); G.fx({ mood: 4 });
        G.modal({ title: '⭐ УРОВЕНЬ ' + f.lvl, text: 'Ты стал: <b>' + titleOf(f.lvl) + '</b>.<br>Награда: ' + mon(r.money) + (r.item ? ' и ' + D.ITEMS[r.item].e + ' ' + D.ITEMS[r.item].n : '') + '.<br><small>Следующий уровень: ' + (xpFor(f.lvl + 1) - f.xp) + ' оп.</small>', opts: [{ t: 'Отлично!', fn: () => {} }] });
        if (f.lvl >= 10) G.achieve('lvl10', 'Уровень 10: ' + titleOf(f.lvl));
      }
    };
    const _es3 = G.endShift; G.endShift = function () { try { G.xp(12); } catch (e) {} return _es3.apply(this, arguments); };
    const _ach3 = G.achieve; G.achieve = function (id, t) { const had = G.s && G.s.ach && G.s.ach[id]; const r = _ach3.apply(this, arguments); try { if (!had) G.xp(25); } catch (e) {} return r; };
    const _pr3 = K.promote; K.promote = function (to) { const r = _pr3.apply(this, arguments); try { G.xp(60); } catch (e) {} return r; };

    // ---------- Бонус дня (раз в реальные сутки, серия до 7 дней)
    const DAILY = [{ m: 300 }, { m: 200, i: 'mineral' }, { m: 400, i: 'choco' }, { m: 500, i: 'rassol' }, { m: 600, i: 'coffee' }, { m: 800, i: 'env1' }, { m: 1500, i: 'wine' }];
    const dkey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    const dailyBonus = () => {
      const s = G.s, f = F(); const now = new Date(), key = dkey(now), y = new Date(now.getTime() - 86400000);
      const d = f.daily || (f.daily = { last: '', streak: 0 }); if (d.last === key) return;
      d.streak = d.last === dkey(y) ? d.streak + 1 : 1; d.last = key;
      const r = DAILY[(d.streak - 1) % 7], money = Math.round(r.m * scale() / 50) * 50, xp = 10 + 5 * Math.min(d.streak, 10);
      G.addMoney(money); if (r.i) G.give(r.i, 1); G.xp(xp);
      const days = DAILY.map((x, i) => (i + 1 <= ((d.streak - 1) % 7) + 1 ? '🟢' : '⚪')).join(' ');
      G.modal({ title: '🎁 БОНУС ДНЯ', text: 'Заходишь в игру <b>' + d.streak + '-й день подряд</b>!<br>' + days + '<br>Сегодня: ' + mon(money) + (r.i ? ' + ' + D.ITEMS[r.i].e + ' ' + D.ITEMS[r.i].n : '') + ' и ' + xp + ' оп.<br><small>Пропустишь день — серия начнётся заново. На 7-й день награда — самая крупная.</small>', opts: [{ t: 'Забрать', fn: () => {} }] });
    };

    // ---------- Цели заводчанина
    const own = (s, tier) => Object.keys(s.own || {}).some(k => D.STATUS[k] && D.STATUS[k].tier === tier);
    const GOALS = [
      { id: 'g_shift5', t: 'Отработать 5 смен', c: s => s.car.shifts >= 5, p: s => [s.car.shifts, 5], r: { xp: 30, item: 'coffee' } },
      { id: 'g_m5k', t: 'Накопить 5 000 ₽', c: s => s.money >= 5000, p: s => [s.money, 5000], r: { xp: 40, money: 300 } },
      { id: 'g_phone', t: 'Купить телефон', c: s => own(s, 'phone'), r: { xp: 50, mood: 5 } },
      { id: 'g_rank1', t: 'Стать разрядником (Разряд 1)', c: s => s.car.rank >= 1, r: { xp: 60, money: 500 } },
      { id: 'g_dry7', t: 'Не пить 7 дней подряд', c: s => (s.flags.dry || 0) >= 7, p: s => [s.flags.dry || 0, 7], r: { xp: 70, item: 'vitamins' } },
      { id: 'g_shift20', t: 'Отработать 20 смен', c: s => s.car.shifts >= 20, p: s => [s.car.shifts, 20], r: { xp: 60, money: 600 } },
      { id: 'g_room3', t: 'Купить 3 предмета для комнаты', c: s => Object.keys(s.flags.room || {}).length >= 3, p: s => [Object.keys(s.flags.room || {}).length, 3], r: { xp: 70, mood: 6 } },
      { id: 'g_m20k', t: 'Накопить 20 000 ₽', c: s => s.money >= 20000, p: s => [s.money, 20000], r: { xp: 80, item: 'wine' } },
      { id: 'g_egor', t: 'Подружиться с Егорычем (отношения 30)', c: s => G.R('egorych').l >= 30, p: s => [G.R('egorych').l, 30], r: { xp: 70, item: 'cigs' } },
      { id: 'g_str25', t: 'Накачать силу до 25', c: s => (s.flags.str || 0) >= 25, p: s => [Math.round(s.flags.str || 0), 25], r: { xp: 80, mood: 6 } },
      { id: 'g_rank3', t: 'Достичь Разряда 3', c: s => s.car.rank >= 3, r: { xp: 100, money: 1000 } },
      { id: 'g_car', t: 'Купить машину', c: s => own(s, 'car'), r: { xp: 120, mood: 10 } },
      { id: 'g_fish10', t: 'Поймать 10 рыб', c: s => ((s.flags.fish || {}).total || 0) >= 10, p: s => [(s.flags.fish || {}).total || 0, 10], r: { xp: 70, item: 'beer' } },
      { id: 'g_m100k', t: 'Накопить 100 000 ₽', c: s => s.money >= 100000, p: s => [s.money, 100000], r: { xp: 150, item: 'perfume' } },
      { id: 'g_late', t: 'Пережить задержку зарплаты', c: s => (s.flags.payLateCount || 0) >= 1, r: { xp: 60, item: 'rassol' } },
      { id: 'g_ach10', t: 'Собрать 10 достижений', c: s => Object.keys(s.ach || {}).length >= 10, p: s => [Object.keys(s.ach || {}).length, 10], r: { xp: 120, money: 1000 } },
      { id: 'g_brig', t: 'Стать бригадиром', c: s => s.car.rank >= 6, r: { xp: 200, money: 2000 } },
      { id: 'g_staff5', t: 'Нанять 5 сотрудников', c: s => (s.flags.staff || []).length >= 5, p: s => [(s.flags.staff || []).length, 5], r: { xp: 150, money: 1500 } },
      { id: 'g_order', t: 'Выполнить заказ покупателя', c: s => ((s.flags.eco || {}).done || 0) >= 1, r: { xp: 150, money: 2000 } },
      { id: 'g_lvl10', t: 'Дорасти до 10 уровня', c: s => (s.flags.lvl || 1) >= 10, p: s => [s.flags.lvl || 1, 10], r: { xp: 100, item: 'cognac' } },
      { id: 'g_master', t: 'Стать мастером участка', c: s => s.car.rank >= 7, r: { xp: 250, money: 3000 } },
      { id: 'g_m500k', t: 'Накопить 500 000 ₽', c: s => s.money >= 500000, p: s => [s.money, 500000], r: { xp: 250, item: 'jewelry' } },
      { id: 'g_head', t: 'Стать начальником цеха', c: s => s.car.rank >= 9, r: { xp: 400, money: 5000 } }
    ];
    const goalsActive = () => { const done = F().goalsDone || []; return GOALS.filter(g => done.indexOf(g.id) < 0).slice(0, 3); };
    G.checkGoals = function () {
      const s = G.s, f = F(); f.goalsDone = f.goalsDone || [];
      goalsActive().forEach(g => { try { if (g.c(s)) { f.goalsDone.push(g.id); const m = g.r.money ? Math.round(g.r.money * scale() / 50) * 50 : 0; if (m) G.addMoney(m); if (g.r.item) G.give(g.r.item, 1); if (g.r.mood) G.fx({ mood: g.r.mood }); G.xp(g.r.xp); msg('🎯 Цель выполнена: «' + g.t + '»! ' + (m ? '+' + mon(m) + ' ' : '') + (g.r.item ? D.ITEMS[g.r.item].e + ' ' : '') + '+' + g.r.xp + ' оп.', 'good'); } } catch (e) {} });
    };
    G.progressCard = function () {
      const f = F(), L = f.lvl || 1, xp = f.xp || 0, a = xpFor(L), b = xpFor(L + 1), pct = C((xp - a) / Math.max(1, b - a) * 100, 0, 100), r = rewardFor(L + 1);
      const bar = (v, c) => '<div style="height:10px;background:#0d0c0b;border:1px solid #000;margin:3px 0"><i style="display:block;height:100%;width:' + C(v, 0, 100) + '%;background:' + (c || '#ffd24a') + '"></i></div>';
      const gl = goalsActive().map(g => { const p = g.p ? g.p(G.s) : null; return '<div style="margin:6px 0">🎯 ' + g.t + (p ? ' — ' + Math.min(p[0], p[1]).toLocaleString('ru') + ' / ' + p[1].toLocaleString('ru') : '') + (p ? bar(p[0] / p[1] * 100, '#4fae4a') : '') + '</div>'; }).join('') || '<div>Все цели выполнены. Ты легенда.</div>';
      const d = f.daily || { streak: 0 };
      return '<div class="card"><h3>🧭 Путь заводчанина</h3><div>Уровень <b>' + L + '</b>: ' + titleOf(L) + '</div>' + bar(pct) + '<div class="note">Опыт ' + xp + ' / ' + b + ' · следующая награда: ' + mon(r.money) + (r.item ? ' + ' + D.ITEMS[r.item].e : '') + '<br>Опыт дают смены, цели, достижения и повышения.</div><div class="note">🔥 Серия входов: ' + (d.streak || 0) + ' дн. (бонус дня раз в сутки)</div></div><div class="card"><h3>🎯 Цели</h3>' + gl + '</div>';
    };

    // ---------- Романтика открывается с ростом ранга (для «Стажёра» — никого)
    const ROMRANK = { tatyana: 1, lyudka: 1, tamara: 1, pelageya: 3, lidiya: 3, nadezhda: 4, ekaterina: 5, tatishcheva: 6 };
    const locked = id => ROMRANK[id] !== undefined && G.s.car.rank < ROMRANK[id];
    const _rl = G.romanceLabel; G.romanceLabel = function (id) { if (locked(id)) return '🔒 Романтика откроется с ранга «' + D.RANKS[ROMRANK[id]] + '»'; if (id === 'tamara') return '🧹 Ухаживать за Тамарой Ивановной'; return _rl.apply(this, arguments); };
    const _rm = G.romanceMove; G.romanceMove = function (id) { if (locked(id)) { msg('Пока рано: романтика с ней откроется с ранга «' + D.RANKS[ROMRANK[id]] + '». Сначала расти по службе.', 'warn'); return; } if (id === 'tamara') return G.tamaraArc(); return _rm.apply(this, arguments); };

    // ---------- Тамара Ивановна: главная сплетница завода
    const DOS = {
      seryoga: ['Весёлый прохиндей: на работе «в туалете», в жизни — душа компании.', 'Любит пиво и розыгрыши. Скинься на пиво — станет другом на смену.'], vityok: ['Добрый и наивный, верит, что станки меняются местами.', 'Молодой, быстро учится. Дай ему наставника — вырастет в слесаря.'],
      mikhalych: ['Сварщик от бога, шов у него поёт. Обидчив.', 'Любит, когда хвалят шов. С ним про сварку не спорь — проиграешь.'], palych: ['Бригадир-наставник, спокойный как удав, рыбак.', 'За 1 000 ₽ на «чай» неделю не заметит твой брак.'],
      lyosha: ['Дядя Лёша: подозрителен ко всему, кроме пива.', 'Принюхивается при входе: жвачка и леденцы убирают перегар.'], egorych: ['Вахтёр-старожил: вредина с душой как старая тряпка.', 'Любит водку, сигареты и когда его слушают. Друзьям даёт секретный пропуск (отношения от 60).'],
      gosha: ['Начальник охраны «Танк»: силён как три станка, умён как один.', 'С ним в драку лучше не лезть: проиграешь и получишь выговор.'], lyudka: ['Кухарка с золотым половником и железным характером.', 'Любит комплименты. Её борщ на вчерашнем компоте — лучше не обсуждать.'],
      tatyana: ['Тихая кухарка, добрая и застенчивая.', 'Принеси шоколадку — расскажет все столовские новости.'], kolyan: ['Мечтатель: ему снилось, что он завод.', 'Слаб к спиртному: может занять и не отдать.'],
      khomyak: ['Кладовщик «Хомяк»: бережёт склад как крепость.', 'Спецовки выдаёт только своим. Дружба = лишняя каска.'], afonya: ['Слесарь-романтик: гитара без струн, мечтает о юге.', 'Пьёт «для дегустации» и зовёт на левую халтуру (платят, но попасться можно).'],
      nyura: ['Баба Нюра: знает про общагу всё и кормит пирожками.', 'Подружись — угостит пирожками и даст совет «по-бабушкиному».'], vika: ['Вика из спортзала: бодрая, как весенний ручей.', 'Абонемент продлит всем, кто видел гантели. То есть всем.'],
      stepanych: ['Старый мастер: ворчит, но завод любит больше жены.', 'Скоро на пенсию. Когда ты сам станешь мастером, он уйдёт.'], dudukin: ['Мастер Дудукин: адекватный, приятный, настоящий специалист.', 'Любит инициативу и разговоры по делу, доносов не терпит. Подарки + рабочие вопросы дают премию.'],
      pelageya: ['Инженер по охране труда: строгая, но справедливая.', 'Проводит инструктаж с экзаменом. Не выучишь — будет выговор.'], lidiya: ['Крановщица Лидия: поднимает тонны, голубей и настроение.', 'Может прокатить на крюке. Только никому.'],
      eblanov: ['Конструктор-гений с чертежами «в процессе».', 'Его чертежи надо проверять: иногда в них ошибки, иначе ОТК вернёт.'], rafik: ['Шофёр директора: знает все дороги и все секреты.', 'Директорская машина «едет сама», он просто рядом. Не спорь.'],
      alevtina: ['Медсестра: внимательная и участливая.', 'Раз в полгода — медкомиссия. Тошнить и пить перед ней вредно для карьеры.'], allochka: ['Секретарша Аллочка: голос директора и его уши.', 'Любит внимание. Её судьба решится на выборах.'],
      ekaterina: ['Начальница ОТК: ледяная красавица с калибром.', 'Если у вас роман, брак ей «не виден». Иначе беспощадна.'], nadezhda: ['Проверяющая по ОТ: гроза цеха по средам.', 'Берёт конверт: экзамен и замечания испаряются. Но слухи ходят.'],
      shchiplen: ['Начальник цеха: вредный, любит выпить и подарки.', 'К нему вежливо и с коньяком. Грубость — служебка и −5 000 ₽.'], kulezhov: ['Зам. начальника цеха: патологический врун, но безобидный.', 'Его «протекция» срабатывает редко. Но срабатывает.'],
      shurygina: ['Бухгалтерия в одном лице: держит всё в кулаке и в тайне.', 'Когда задерживают зарплату — иди к ней. Но с шоколадкой.'], tatishcheva: ['Начальница кадров: молода, строга, любит порядок.', 'Корочки и курсы — у неё. Без них повышения не будет.'],
      soplezhuykin: ['Зам. генерального директора: подозрительный, любит подарки и жалобы.', 'Может лишить премии. Спасут подарок или связи.'], rassvetov: ['Главный инженер: знает цену допуску и людям.', 'Хочет рацпредложения, а не слова. Приходи с расчётами.'],
      truhanov: ['Генеральный директор: блокнотик, очки, абсолютная власть.', 'Берёт «личные вопросы». Но на последнюю ступень всё равно не пустит.']
    };
    const TIERNPC = { 1: ['seryoga', 'vityok', 'mikhalych', 'palych', 'lyosha', 'egorych', 'gosha', 'lyudka', 'tatyana', 'kolyan', 'khomyak', 'afonya', 'nyura', 'vika'], 2: ['stepanych', 'dudukin', 'pelageya', 'lidiya', 'eblanov', 'rafik', 'alevtina', 'allochka', 'ekaterina', 'nadezhda'], 3: ['shchiplen', 'kulezhov', 'shurygina', 'tatishcheva', 'soplezhuykin', 'rassvetov'], 4: ['truhanov'] };
    const NEWS = [
      [1, 'В столовой борщ «на основе вчерашнего компота». Кто не успел — тот не отравился.'], [1, 'Серёга «в туалете» уже сорок минут. Туалет подал заявление о помощи.'], [1, 'Корова из цеха уволилась: ей предложили молоко, а она хотела премию.'], [2, 'Егорыч говорит, что без гостинца в праздник не пустит. И не врёт: проверено.'],
      [2, 'У Щиплена в ящике стола — коньяк. «Лекарство от вас всех». Он принимает по рецепту подарка.'], [2, 'Надежда Николаевна не любит неубранные рабочие места и людей. В обратном порядке.'], [2, 'Дудукин ждёт инициативных: сообщи о проблеме — станешь любимчиком.'], [3, 'В среду — проверка. Выучи вопросы или приготовь конверт. Совесть можно оставить дома.'],
      [3, 'Говорят, зарплату иногда задерживают: «бухгалтерия ищет деньги». Найдёт — выдаст.'], [3, 'Соплежуйкин любит жалобы на коллег. Но коллеги тоже любят жаловаться на него.'], [3, 'Кулежов «знаком с директором». Директор об этом пока не знает.'], [4, 'Чтобы стать мастером, нужны корочки, план завода и хорошие отношения с Дудукиным и Щипленом.'],
      [4, 'Кресло генерального директора занято навечно. Остальное — как повезёт. А повезёт — если подарить коньяк.'], [4, 'Труханов в блокнотике ведёт «личные заметки» на всех. Не делай глупостей, он пишет красной ручкой.']
    ];
    const tamTier = () => { const rel = G.R('tamara').l, sh = G.s.car.shifts, a = rel >= 65 ? 4 : rel >= 45 ? 3 : rel >= 25 ? 2 : rel >= 10 ? 1 : 0, b = sh < 5 ? 0 : sh < 15 ? 1 : sh < 40 ? 2 : sh < 80 ? 3 : 4; return Math.min(a, b); };
    G.gossipMenu = function () {
      const s = G.s, f = F(), t = tamTier(), face = 'tamara', back = () => G.gossipMenu(); f.dossier = f.dossier || {};
      const known = Object.keys(f.dossier).length;
      G.modal({ title: 'Тамара Ивановна', face, text: t === 0 ? 'Тамара, не отрываясь от швабры: «Ничего не знаю, милок. Полы мою. Приходи, как подружимся».' : 'Тамара опирается на швабру: «Ну, спрашивай. Я тут всё вижу — уборщица, она как радар, только с ведром».<br><small>Что знает: ' + known + ' заводчан · доверие: ' + ['низкое', 'растёт', 'хорошее', 'высокое', 'абсолютное'][t] + '</small>', opts: [
        { t: '🗣 Узнать про человека', dis: t === 0 ? 'Пока не доверяет' : s.day.gossipAsk ? 'Сегодня уже спрашивал' : null, fn: () => who() },
        { t: '📰 Новость дня', dis: t === 0 ? 'Пока не доверяет' : s.day.gossipNews ? 'Сегодня уже слышал' : null, fn: () => news() },
        { t: '📖 Что я уже знаю', dis: known ? null : 'Пока ничего', fn: () => list() },
        { t: '🧹 Помочь с уборкой (−5 энергии)', fn: () => { G.fx({ energy: -5, mood: 1 }); G.relAdd('tamara', 3); msg('Ты помог Тамаре с полом. Она растрогана и вручила пирожок.', 'good'); G.give('bread', 1); sp(); } },
        { t: '💝 Ухаживать (по-человечески)', dis: locked('tamara') ? 'Рано (нужен ранг «' + D.RANKS[ROMRANK.tamara] + '»)' : null, fn: () => G.tamaraArc() },
        { t: 'Уйти', fn: () => {} }] });
      function who() {
        const ids = []; for (let k = 1; k <= t; k++) (TIERNPC[k] || []).forEach(i => { if (D.NPC[i]) ids.push(i); });
        G.modal({ title: 'О ком расскажет?', face, wide: true, text: 'Круг её знаний растёт вместе с доверием.', opts: ids.slice(0, 40).map(id => ({ t: D.NPC[id].name + ' — ' + (D.NPC[id].role || '') + (f.dossier[id] ? ' ✓' : ''), fn: () => { s.day.gossipAsk = 1; const d = DOS[id] || ['Человек как человек.', 'Тут я пас.'], ut = Object.keys(TIERNPC).find(k => TIERNPC[k].indexOf(id) >= 0) | 0, deep = t >= Math.min(4, ut + 1), rec = f.dossier[id] = f.dossier[id] || {}; rec.c = d[0]; if (deep) rec.s = d[1]; G.relAdd('tamara', 1); G.xp(3);
            G.modal({ title: D.NPC[id].name, face, text: '<b>Характер:</b> ' + d[0] + '<br>' + (deep ? '<b>Секрет:</b> ' + d[1] : '<i>Тамара многозначительно замолчала: про остальное — когда подружимся покрепче.</i>'), opts: [{ t: 'Спасибо, Тамара Ивановна', fn: () => {} }] }); } })).concat([{ t: 'Назад', fn: back }]) });
      }
      function news() { s.day.gossipNews = 1; const pool = NEWS.filter(x => x[0] <= t), n = pool[Math.floor(G.hash(s.t.day, 7, 5) * pool.length)] || pool[0]; G.xp(2); G.modal({ title: '📰 Новость дня', face, text: n[1], opts: [{ t: 'Ого…', fn: () => {} }] }); }
      function list() { const ids = Object.keys(f.dossier); G.modal({ title: '📖 Записная книжка', wide: true, text: ids.map(id => '<b>' + (D.NPC[id] ? D.NPC[id].name : id) + ':</b> ' + esc(f.dossier[id].c) + (f.dossier[id].s ? '<br><i>' + esc(f.dossier[id].s) + '</i>' : '')).join('<hr style="opacity:.2">'), opts: [{ t: 'Назад', fn: back }] }); }
    };
    // Забавное «ухаживание» за бабушкой (ничего неприличного, только пирожки и швабры)
    const TAM = [
      { t: 'Тамара Ивановна оценивающе смотрит: «Ты чего вокруг меня ходишь, как швабра вокруг ведра? Внучек, что ли?»', o: [['Подарить шоколадку', 'choco', 'Она хмыкнула, но шоколадку спрятала в фартук. «Ладно, внучек. На эту неделю считай, что ты мой».', { mood: 4 }, 8], ['Помочь с уборкой коридора', null, 'Ты отдраил коридор. Тамара пожала плечами: «Руки есть. Голова — вопрос».', { energy: -6, mood: 2 }, 6]] },
      { t: 'Тамара достаёт термос: «Ешь, худоба. Борщ мой, не людкин. Тот — на компоте».', o: [['Есть с аппетитом', null, 'Борщ оказался роскошным. Тамара довольна: «Мужчина должен кушать! И носки носить».', { satiety: 25, mood: 6 }, 8], ['Отказаться вежливо', null, 'Она обиделась на термос, но ненадолго. «Ну хоть пирожок».', { mood: 1 }, 2]] },
      { t: 'Тамара: «Поедешь на мой огород? Там помидоры, кабачки и кошка. Кошка — главная».', o: [['Съездить и помочь', null, 'Ты копал грядки, пока кошка проверяла качество. Домой уехал с банками огурцов.', { energy: -10, mood: 4 }, 10, { rassol: 2 }], ['Сказать, что занят', null, 'Тамара вздохнула: «Молодёжь… огурцы сами не растут». Но на огурцы не обиделась.', { mood: -1 }, 1]] },
      { t: 'Тамара достаёт спицы: «Раз уж ты мне как родной — свяжу носки. Размер у тебя какой? Не отвечай, я на глаз».', o: [['Согласиться на носки', null, 'Носки получились огромные, тёплые и немного колючие. Здоровье крепче, настроение выше.', { health: 4, mood: 5 }, 8], ['Поблагодарить и отказаться', null, 'Тамара: «Ну, как знаешь». Но шарф всё равно связала.', { mood: 2 }, 4]] },
      { t: 'Тамара торжественно опирается на швабру: «Слушай, внучек… ты хороший. Выходи за меня… то есть, тьфу, женись на мне! Хотя я для этого уже стара, а ты — мал. Шучу. Но ключи от каморки возьми».', o: [['Принять ключи от каморки', null, 'Теперь у тебя есть своя каморка со швабрами: можно прилечь на смене. Тамара довольна, коллеги шепчутся про «зятя».', { mood: 8, cool: -2 }, 10, null, 'kam'], ['Вежливо отказаться и обнять', null, 'Тамара прослезилась: «Хороший ты. Пирожок возьми». Ты ушёл с пирожком и чистой совестью.', { mood: 6, cons: 3 }, 6, { bread: 1 }]] }
    ];
    G.tamaraArc = function () {
      const s = G.s, f = F(), st = f.tamStage || 0, rel = G.R('tamara').l;
      if (st >= TAM.length) { msg('Тамара Ивановна машет тебе из-за швабры: «Заходи, внучек. Борщ на плите».', 'good'); return; }
      if (f.tamWk === G.week()) { msg('Тамара: «На этой неделе ты уже был. Не мозоль глаза, дай швабре отдохнуть».', 'warn'); return; }
      const need = [8, 15, 25, 35, 50][st], sh = [3, 10, 20, 35, 60][st];
      if (rel < need || s.car.shifts < sh) { msg('Тамара Ивановна присматривается: «Рано, милок. Подружись как следует (отношения ' + need + ', смен ' + sh + ')».', 'warn'); return; }
      const x = TAM[st];
      G.modal({ title: 'Тамара Ивановна', face: 'tamara', text: x.t, opts: x.o.map(o => ({ t: o[0], dis: o[1] && !G.has(o[1]) ? 'Нет в рюкзаке' : null, fn: () => { if (o[1]) G.give(o[1], -1); f.tamStage = st + 1; f.tamWk = G.week(); G.fx(o[3]); G.relAdd('tamara', o[4]); if (o[5]) Object.keys(o[5]).forEach(k => G.give(k, o[5][k])); if (o[6] === 'kam') { f.kamorka = 1; G.achieve('tamara', 'Любимый внучек Тамары Ивановны'); if (G.boardAdd) G.boardAdd('Обладатель ключей от каморки Тамары Ивановны', 'good'); } msg(o[2], 'good'); G.xp(10); sp(); } })) });
    };
    A('gossip', { ph: ['work'], loc: 'shop', g: 'Коллеги и приколюхи', n: 'Тамара Ивановна: сплетни', i: '🧹', menu: true, fn: () => { G.gossipMenu(); return 'custom'; } });
    // ---------- Алкаш: пьёшь часто — кличка и хуже работаешь
    const _fx26 = G.fx; G.fx = function (f, ctx) {
      const s = G.s, before = s && s.st ? s.st.drunk : 0, r = _fx26.apply(this, arguments);
      try { if (s && s.st && s.st.drunk - before >= 10) { const fl = F(); fl.drinkDays = (fl.drinkDays || []).filter(d => s.t.day - d <= 14); if (fl.drinkDays.indexOf(s.t.day) < 0) fl.drinkDays.push(s.t.day); fl.dry = 0; if (fl.drinkDays.length >= 7 && !hasNick('alkash')) { G.addNick('alkash'); msg('Про тебя говорят: «Алкаш». Кличка прилипла.', 'bad'); } } } catch (e) {}
      return r;
    };
    const _q2 = G.quality; G.quality = function () { const q = _q2.apply(this, arguments); return hasNick('alkash') ? Math.max(0, q - 10) : q; };
    // Заводчане стучат, если ты пьян на смене
    const _kh26 = K.hook; K.hook = function () {
      const r = _kh26.apply(this, arguments);
      try {
        const s = G.s; if (s && s.phase !== 'new') {
          if (!G._dailyDone) { G._dailyDone = 1; dailyBonus(); }
          if (s.phase === 'work' && s.st.drunk >= 15 && !s.day.snitched && s.t.hour >= 10) {
            s.day.snitched = 1; const p = C(55 - s.st.coll * 0.5, 10, 60);
            if (G.chance(p)) { const who = G.pick(['Колян', 'Витёк', 'Серёга', 'Хомяк', 'Соплежуйкин']); s.pay.pen += 1500; G.fx({ boss: -8, mood: -4, coll: -1 }); msg('🐀 ' + who + ' настучал начальству, что ты пьян на смене. Докладная, штраф 1 500 ₽.', 'bad'); if (G.rumor) G.rumor('drunkwork', 'Все знают, что тебя застукали пьяным на смене.', { cool: -2, boss: -2 }, 70); }
            else if (G.chance(40)) { msg('Коллеги заметили, что ты поддатый, но промолчали. Пока.', 'warn'); }
          }
        }
      } catch (e) {}
      return r;
    };

    // ---------- Проходная: взятки, 50/50 через забор, больничный или прогул
    // (патч расширяет уже существующий G.gate; см. data_actions)

    // ---------- Задержки зарплаты
    const _pd = G.payday;
    G.payday = function () {
      const s = G.s, f = F(), wk = G.week() % 4;
      if ((wk === 1 || wk === 3) && !f.payLate && s.car.shifts >= 15 && G.chance(12)) {
        f.payLate = { due: s.t.day + G.ri(3, 6), wk: G.week() }; f.payLateCount = (f.payLateCount || 0) + 1; G.fx({ mood: -6, coll: -1 });
        G.modal({ title: '⏳ ЗАРПЛАТУ ЗАДЕРЖИВАЮТ', face: 'shurygina', text: 'Бухгалтерия вывесила объявление: «Выплата задерживается по техническим причинам. Причины технические. Технически — нет денег».', opts: [
          { t: 'Ждать и надеяться', fn: () => { msg('Придётся потерпеть. Коллеги ворчат вполголоса.', 'warn'); } },
          { t: 'Пойти к Шурыгиной', fn: () => { if (G.chance(45)) { msg('Шурыгина вздохнула и нашла деньги в ящике «на чёрный день».', 'good'); const w = G.week; G.week = () => f.payLate.wk; try { _pd.call(G); } finally { G.week = w; } f.payLate = null; } else { G.fx({ mood: -3 }); msg('«Приходите после обеда. Завтра». Это значит — нескоро.', 'bad'); } } },
          { t: s.car.union ? 'Позвать Семёныча (профсоюз)' : 'Профсоюза нет — просто ворчать', dis: s.car.union ? null : 'Нет профсоюза', fn: () => { f.payLate.due = s.t.day + 2; G.fx({ boss: -3 }); msg('Семёныч пошёл «строго разговаривать». Выплату обещали через пару дней.', 'warn'); } }] });
        return;
      }
      return _pd.apply(this, arguments);
    };
    const payLateTick = () => { const s = G.s, f = F(); if (f.payLate && s.t.day >= f.payLate.due) { const w = G.week; G.week = () => f.payLate.wk; try { _pd.call(G); } finally { G.week = w; } f.payLate = null; msg('💵 Зарплату наконец перечислили. Бухгалтерия приносит извинения (устные).', 'good'); G.fx({ mood: 3 }); } };

    // ---------- Ежедневные расчёты
    const _dt26 = G.dailyTick; G.dailyTick = function () {
      const r = _dt26.apply(this, arguments), s = G.s, f = F();
      try { f.dry = (f.drinkDays || []).indexOf(s.t.day - 1) >= 0 ? 0 : (f.dry || 0) + 1; payLateTick(); if (f.kamorka) s.st.mood = C(s.st.mood + 1.5); G.checkGoals(); G.checkLevel(); } catch (e) {}
      return r;
    };
  })();

})();
