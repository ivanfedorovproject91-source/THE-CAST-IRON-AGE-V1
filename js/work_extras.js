/* ===== V3.17: «Левый заказ», добыча с завода, ОТК и медпункт =====
   1) Левый заказ в рабочее время: раз в смену, не каждый день; набор забавных заказов с разной оплатой и рисками.
   2) «Присмотреть, что плохо лежит»: раз в смену, не каждый день; добыча лежит «в робе» → прячется в шкафчик
      (Раздевалка) или перекидывается через дыру в заборе (Двор) → выносится после смены → дома раздел «Добыча» (продажа).
      Через проходную с добычей в робе Егорыч не пропустит.
   3) ОТК: «Сдать деталь на ОТК» — оценка партии (клеймо A/B/C/брак): премия, баллы мастерства, защита от возврата вечером.
   4) Медпункт: осмотр и лечение раз в смену, таблетки, больничный для реально больных, прогноз медкомиссии. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.D, C = G.clamp;
  const F = () => G.s.flags;
  const rub = n => G.rub(Math.round(n));
  const log = e => { try { if (window.console) console.error(e); } catch (x) {} };

  // =====================================================================
  //  ДОБЫЧА: хранилища и вспомогательные функции
  //  robe — «в робе» (flags.loot), locker — шкафчик (flags.lockerLoot),
  //  fence — тайник за забором (flags.fenceLoot), home — дома (flags.stash)
  // =====================================================================
  const KEY = { robe: 'loot', locker: 'lockerLoot', fence: 'fenceLoot', home: 'stash' };
  const list = k => { const f = F(), key = KEY[k]; if (!Array.isArray(f[key])) f[key] = []; return f[key]; };
  const total = a => a.reduce((x, i) => x + (i.v || 0), 0);
  const units = a => a.reduce((x, i) => x + (i.sz || 1), 0);
  const LOCKER_CAP = 4;
  const SZ = { 1: 'в карман', 2: 'под робу', 3: 'тяжёлая' };

  // r — базовый риск, что заметят в момент кражи (в %); sz — размер (1 мелочь, 2 средняя, 3 тяжёлая)
  const LOOT = [
    { id: 'bolts', e: '🔩', n: 'болты и гайки', v: [80, 200], sz: 1, r: 6, w: 'В ящике у станка кто-то оставил россыпь крепежа. Целую горсть.' },
    { id: 'wire', e: '🧵', n: 'моток медного провода', v: [400, 900], sz: 1, r: 10, w: 'В углу валяется бухта медного провода. Бесхозная. Наверное.' },
    { id: 'bearing', e: '⚙️', n: 'подшипник', v: [600, 1300], sz: 1, r: 12, w: 'На стеллаже лежит новый подшипник в промасленной бумаге.' },
    { id: 'spirt', e: '🧪', n: 'канистра технического спирта', v: [300, 800], sz: 2, r: 14, spirt: true, w: 'У лаборатории стоит канистра «Спирт технический. НЕ ПИТЬ». Все понимают, что это значит.' },
    { id: 'tool', e: '🧰', n: 'набор инструмента', v: [500, 1600], sz: 2, r: 14, w: 'Хороший набор ключей лежит в чужом ящике. Хозяин ушёл в курилку.' },
    { id: 'sheet', e: '📄', n: 'лист нержавейки', v: [500, 1200], sz: 2, r: 16, w: 'Обрезки нержавейки у резки. Их никто не считает… наверное.' },
    { id: 'cement', e: '🧱', n: 'мешок цемента', v: [150, 300], sz: 3, r: 10, w: 'Мешок цемента у стены. Тяжёлый, бесхозный и очень нужный на даче.' },
    { id: 'clothes', e: '🥾', n: 'спецодежда и валенки', v: [300, 600], sz: 2, r: 8, w: 'Склад спецодежды приоткрыт. Кладовщика нет.' },
    { id: 'oil', e: '🛢️', n: 'бутыль моторного масла', v: [250, 500], sz: 2, r: 8, w: 'Бочка с маслом подтекает. Грех не подставить бутыль.' },
    { id: 'plate', e: '⬛', n: 'чугунная плита (тяжёлая)', v: [1000, 2500], sz: 3, r: 22, w: 'Чугунная плита лежит у забора «на списание». Списывать её, видимо, будешь ты.' },
    { id: 'lamp', e: '🔦', n: 'удлинитель и фонарь', v: [200, 450], sz: 1, r: 6, w: 'Удлинитель и фонарь висят на гвозде. Им там скучно.' },
    { id: 'parts', e: '🛠️', n: 'детали станка', v: [2000, 3500], sz: 3, r: 28, w: 'В разобранном станке лежат красивые детали. Станок уже год «в ремонте».' },
    { id: 'cable', e: '🔌', n: 'бухта силового кабеля', v: [900, 1800], sz: 2, r: 16, w: 'Электрики оставили бухту силового кабеля без присмотра. Надолго ли?' },
    { id: 'brass', e: '🟡', n: 'латунные втулки (кило)', v: [700, 1500], sz: 1, r: 12, w: 'Латунь — это валюта любого пункта приёма цветмета. А тут целое кило.' },
    { id: 'paint', e: '🎨', n: 'банка краски «Серый металлик»', v: [200, 400], sz: 1, r: 6, w: 'Краска «Серый металлик» стоит у окраски. Дача давно просит.' },
    { id: 'radio', e: '📻', n: 'старая рация «Алтай»', v: [600, 1200], sz: 1, r: 12, w: 'В инструменталке пылится рация «Алтай». Коллекционеры за такую платят.' },
    { id: 'gloves', e: '🧤', n: 'пачка брезентовых рукавиц', v: [150, 300], sz: 1, r: 4, w: 'Целая коробка рукавиц. На всех не хватает, а одной коробкой — меньше.' }
  ];
  const lootById = id => LOOT.find(x => x.id === id) || LOOT[0];

  // Что «плохо лежит» сегодня: бросок один раз на игровой день (хранится в сохранении)
  function lootRoll() {
    const s = G.s, f = s.flags;
    if (!f.lootRoll || f.lootRoll.d !== s.t.day) {
      const offers = [];
      if (G.chance(60)) {
        const n = G.chance(15) ? 3 : G.chance(45) ? 2 : 1, pool = LOOT.slice();
        for (let i = 0; i < n && pool.length; i++) {
          const it = pool.splice(Math.floor(G.rnd() * pool.length), 1)[0];
          offers.push({ id: it.id, v: G.ri(it.v[0], it.v[1]) });
        }
      }
      f.lootRoll = { d: s.t.day, offers };
    }
    return f.lootRoll.offers;
  }

  A_loot();
  function A_loot() {
    G.A('loot', { ph: ['work'], loc: 'shop', g: 'Крайности и криминал', n: 'Присмотреть, что плохо лежит', i: '🧰', h: 1, noTrainee: true, menu: true, noEvent: true,
      req: s => s.day.lootDone ? 'Сегодня уже присматривался: 1 раз за смену' : !lootRoll().length ? 'Сегодня всё приколочено' : null,
      fn: () => { G.lootFind(); return 'custom'; } });
    G.A('hide_loot', { ph: ['work'], loc: 'locker', g: 'Крайности и криминал', n: 'Спрятать добычу в шкафчик', i: '🔒', menu: true, noEvent: true, lunch: true,
      req: s => !list('robe').length ? 'Нечего прятать (добыча в робе)' : units(list('locker')) >= LOCKER_CAP ? 'Шкафчик забит' : null,
      fn: () => { G.lootHide(); } });
    G.A('unhide_loot', { ph: ['work'], loc: 'locker', g: 'Крайности и криминал', n: 'Достать добычу из шкафчика', i: '🔓', menu: true, noEvent: true, lunch: true,
      req: s => !list('locker').length ? 'Шкафчик пуст' : null,
      fn: () => { const lk = list('locker'), n = lk.length; list('robe').push.apply(list('robe'), lk.splice(0, lk.length)); G.toast('Достал из шкафчика ' + n + ' шт. Теперь всё снова «в робе» — осторожнее.', 'warn'); } });
    G.A('hole', { ph: ['work'], loc: 'yard', g: 'Крайности и криминал', n: 'Перекинуть добычу через дыру в заборе', i: '🕳️', h: 1, menu: true,
      req: s => list('robe').length ? null : 'Нечего перекидывать (добыча в робе)',
      fn: () => { G.lootThrow(); return 'custom'; } });
    G.A('stash', { ph: ['free'], loc: 'home', g: 'Добыча', n: 'Добыча: посмотреть и продать', i: '🧺', menu: true, noEvent: true,
      req: s => list('home').length ? null : (F().everLoot || s.car.thefts > 0 ? 'Пока нечего продавать' : 'Не здесь'),
      fn: () => { G.stashMenu('home'); return 'custom'; } });
    G.A('market_sell', { ph: ['free'], loc: 'c_market', g: 'Барахолка', n: 'Продать добычу (60–80%)', i: '💰', h: 1, menu: true,
      req: s => list('home').length ? null : 'Нечего продавать: добыча дома, вынеси её с завода',
      fn: () => { G.stashMenu('market'); return 'custom'; } });
  }

  // ---------- Присмотреть, что плохо лежит
  G.lootFind = function () {
    const s = G.s, offers = lootRoll();
    if (s.day.lootDone) return G.toast('Сегодня ты уже присматривался.', 'warn');
    if (!offers.length) return G.toast('Всё приколочено, как в сейфе. Сегодня не повезло.', 'warn');
    G.modal({ title: '🧰 Что плохо лежит', wide: true,
      text: 'Ты прошёлся по цеху, поглядывая по сторонам. Варианты есть, но успеть унести можно <b>только что-то одно за смену</b>. Всё, что возьмёшь, будет «в робе»: до проходной его нужно спрятать.',
      opts: offers.map(o => { const it = lootById(o.id); return { t: it.e + ' ' + it.n + ' — ≈ ' + rub(o.v) + ' · ' + SZ[it.sz] + ' <span class="tag rk">⚠ ' + G.catchChance(it.r) + '%</span>', fn: () => lootChoose(o) }; }).concat([{ t: 'Пройти мимо', fn: () => {} }]) });
  };
  function lootChoose(o) {
    const it = lootById(o.id), here = G.isPresent('khomyak');
    G.modal({ title: it.e + ' ' + it.n, wide: true,
      text: it.w + '<br>Оценка ≈ <b>' + rub(o.v) + '</b>. Размер: ' + SZ[it.sz] + '.',
      opts: [
        { t: '🤏 Взять и спрятать в робу', fn: () => lootTake(o, it) },
        { t: '💰 Сразу передать Хомяку (50% цены)', dis: here ? null : 'Хомяка рядом нет', fn: () => lootKhomyak(o, it) },
        { t: 'Не рисковать', fn: () => {} }
      ] });
  }
  function lootCaught(it, what) {
    G.fx({ cons: -2, boss: -3 });
    G.toast('Заметили! ' + what + ': ' + it.n + '.', 'bad');
    G.punish({ risk: 100, what: 'Попытка хищения: ' + it.n, fine: [300, 900], sev: it.sz >= 3 ? 2 : 1 });
    if (G.lootBust) G.lootBust();
  }
  function lootTake(o, it) {
    const s = G.s, watchers = (G.peopleAt(s.loc) || []).length;
    const risk = it.r + Math.min(12, watchers * 4) + ((s.st.drunk || 0) > 5 ? 5 : 0);
    s.day.lootDone = 1;
    if (G.chance(G.catchChance(risk))) { lootCaught(it, 'Руки в чужих карманах'); if (!s.end) G.spend(1); return; }
    list('robe').push({ n: it.n, v: o.v, sz: it.sz, k: it.id, spirt: !!it.spirt });
    F().everLoot = 1; s.car.thefts++; s.day.stole++; G.fx({ cons: -4 });
    G.toast('Спрятал в робу: ' + it.n + '. Совесть тихо ворчит.', 'warn');
    G.modal({ title: '💡 Добыча в робе', cls: 'warn', wide: true,
      text: 'Ты унёс: <b>' + it.n + '</b> (≈ ' + rub(o.v) + ').<br><br><b>Подсказка:</b> на выходе Егорыч видит всё, что в робе, — будет выговор и штраф. Сначала <b>спрячь добычу в шкафчик</b> (🚪 Раздевалка → «Спрятать добычу в шкафчик») или <b>перекинь через дыру в заборе</b> (🌳 Двор). После смены вынеси её другим путём, а дома найдёшь её в «Дом → Добыча» — там её можно продать.',
      opts: [{ t: 'Понятно', fn: () => {} }] });
    G.spend(1);
  }
  function lootKhomyak(o, it) {
    const s = G.s, pay = Math.round(o.v * 0.5);
    s.day.lootDone = 1;
    if (G.chance(G.catchChance(it.r * 0.5))) { lootCaught(it, 'Сделка у всех на виду'); if (!s.end) G.spend(1); return; }
    G.addMoney(pay); G.fx({ cons: -4 }); s.car.thefts++; s.day.stole++; F().everLoot = 1; G.relAdd('khomyak', 1);
    G.toast('Хомяк рассчитался на месте: ' + rub(pay) + '.', 'good'); G.spend(1);
  }

  // ---------- Шкафчик
  G.lootHide = function () {
    const s = G.s, robe = list('robe'), lock = list('locker');
    const sorted = robe.slice().sort((a, b) => (a.sz || 1) - (b.sz || 1));
    let moved = 0;
    sorted.forEach(it => { if (units(lock) + (it.sz || 1) <= LOCKER_CAP) { lock.push(it); robe.splice(robe.indexOf(it), 1); moved++; } });
    if (!moved) { G.toast('В шкафчик не влезает: ' + units(lock) + '/' + LOCKER_CAP + ' занято. Тяжёлое — только через забор.', 'warn'); return; }
    G.toast('Спрятал в шкафчик: ' + moved + ' шт. (' + units(lock) + '/' + LOCKER_CAP + ').' + (robe.length ? ' Не влезло: ' + robe.length + ' шт. остаются в робе.' : ' Теперь можно дышать спокойнее.'), 'good');
    const seen = (G.peopleAt('locker') || []).length;
    if (seen && G.chance(25)) { G.rumor('lockerloot', 'Говорят, у тебя в шкафчике что-то звякает.', { coll: -2 }, 100); G.toast('Кто-то в раздевалке странно на тебя покосился.', 'warn'); }
  };

  // ---------- Через дыру в заборе (во время смены)
  G.lootThrow = function () {
    const s = G.s, robe = list('robe'); if (!robe.length) return;
    const u = units(robe);
    const risk = C(Math.round(18 + u * 3 - G.rl('lyosha') / 4 - (G.rl('gosha') > 20 ? 8 : 0)), 8, 60);
    if (G.chance(G.catchChance(risk))) { busted(robe.slice(), 'Хищение у забора', 'Через дыру в заборе — и прямо в объятия Гоши «Танка» с термосом.'); }
    else {
      const items = robe.splice(0, robe.length); items.forEach(x => list('fence').push(x));
      G.toast('Перекинул ' + items.length + ' шт. через дыру в заборе. Заберёшь после смены, обойдя завод. Тайник могут и найти…', 'good');
    }
    if (!s.end) G.spend(1);
  };

  function busted(items, what, line) {
    const s = G.s, v = total(items), sev = (units(items) >= 5 || s.car.thefts > 3) ? 2 : 1;
    F().loot = []; F().lockerLoot = [];
    if (sev === 2) G.addNick('tashchilkin');
    G.toast(line, 'bad');
    const b = s.day.viol;
    G.punish({ risk: 100, what: what + ' (' + rub(v) + ')', fine: [500, 2000], sev });
    if (G.lootBust && !s.end) G.lootBust();
    // Общее «пронесло» здесь не работает: пойманного с добычей на выходе наказывают всегда
    if (!s.end && s.day.viol === b) {
      const fine = G.ri(500, 1500);
      s.day.viol++; s.car.clean = 0; s.pay.viol = (s.pay.viol || 0) + 1;
      G.fx({ money: -fine, rep: 1, boss: -6, mood: -6 });
      G.toast('Выговор и штраф ' + rub(fine) + ': добычу изъяли, акт составили.', 'bad');
      G.checkEnd();
    }
  }
  function moveHome(items) {
    const home = list('home'); items.forEach(x => home.push(x));
    F().stolenTotal = (F().stolenTotal || 0) + total(items); F().everLoot = 1;
  }

  // =====================================================================
  //  Выход с завода после смены
  // =====================================================================
  function collectFence() {
    const s = G.s; if (!s || s.end) return;
    const fence = list('fence'); if (!fence.length) return;
    const items = fence.splice(0, fence.length);
    if (G.chance(12)) { G.toast('🌳 Тайник за забором пуст: растащили. ' + items.length + ' шт. (≈ ' + rub(total(items)) + ') как не бывало.', 'bad'); G.fx({ mood: -4 }); return; }
    moveHome(items);
    G.toast('🌳 Обошёл забор и забрал тайник: ' + items.length + ' шт. (≈ ' + rub(total(items)) + '). Дома — «Добыча».', 'good');
  }
  function carried() { return list('robe').concat(list('locker')); }
  function arrived(all, how) {
    moveHome(all); F().loot = []; F().lockerLoot = [];
    G.toast(how + ' Добыча дома: ' + all.length + ' шт. (≈ ' + rub(total(all)) + '). Откроешь «Дом → Добыча» и продашь.', 'good');
    collectFence();
  }
  function viaGate() {
    const s = G.s, all = carried(), hidden = !list('robe').length, rel = G.rl('egorych');
    let p = hidden ? C(12 + units(all) * 3 - rel / 4, 5, 45) : C(92 - rel / 5, 55, 95);
    if (s.car.rank >= 6) p *= 0.4; // начальство не досматривают
    if (G.chance(Math.round(p))) {
      G.relAdd('egorych', -6);
      busted(all, 'Вынос с завода', hidden ? 'Егорыч заглянул в сумку: «А это что у нас под тряпками?»' : 'Егорыч хлопнул тебя по робе: «Что-то звякает, голубчик. Выворачивай!»');
      if (!s.end) { if (G.boardAdd) G.boardAdd('Егорыч поймал рабочего с «лишним весом» на проходной', 'bad'); collectFence(); }
    } else arrived(all, hidden ? 'Егорыч зевнул и махнул рукой.' : 'Егорыч отвлёкся на кроссворд. Повезло!');
  }
  function viaHole() {
    const s = G.s, all = carried();
    const risk = C(Math.round(20 + units(all) * 2 + (list('robe').length ? 4 : 0) - G.rl('lyosha') / 4 - (G.rl('gosha') > 20 ? 8 : 0)), 8, 60);
    if (G.chance(G.catchChance(risk))) { busted(all, 'Вынос через забор', 'Вылез через дыру в заборе — а там Гоша «Танк» с термосом и вопросами.'); if (!s.end) collectFence(); }
    else arrived(all, 'Протиснулся через дыру в заборе.');
  }
  function viaTruck() {
    const s = G.s, all = carried(), fee = Math.round(total(all) * 0.3);
    if (s.money < fee) { G.toast('Нет денег откупиться: ' + rub(fee) + '.', 'warn'); G.lootExit(); return; }
    G.addMoney(-fee);
    if (G.chance(6)) { busted(all, 'Вынос с завода', 'Гоша взял долю, но всё равно заложил. Дружба дружбой, а премия — врозь.'); if (!s.end) collectFence(); }
    else arrived(all, 'Договорился с Гошей у погрузочных ворот (его доля: ' + rub(fee) + ').');
  }
  G.lootExit = function () {
    const s = G.s; if (!s || s.end || !s.flags) return;
    const robe = list('robe'), lock = list('locker');
    if (!robe.length && !lock.length) { collectFence(); return; }
    const all = carried(), opts = [];
    if (robe.length && units(lock) < LOCKER_CAP) opts.push({ t: '🔒 Сунуть добычу из робы в шкафчик (оставить на потом)', fn: () => { G.lootHide(); G.lootExit(); } });
    opts.push({ t: '🛂 Через проходную (Егорыч смотрит!)', fn: viaGate });
    opts.push({ t: '🕳 Через дыру в заборе', fn: viaHole });
    opts.push({ t: '🚚 Через погрузочные ворота: доля Гоше ' + rub(total(all) * 0.3), dis: s.money < Math.round(total(all) * 0.3) ? 'Нет денег' : null, fn: viaTruck });
    opts.push({ t: robe.length ? '🗑 Выбросить добычу из робы и уйти налегке' : '🏠 Уйти налегке (добыча остаётся в шкафчике)', fn: () => {
      if (robe.length) { const n = robe.length; F().loot = []; G.fx({ cons: 1 }); G.toast('Выбросил ' + n + ' шт. добычи. Совесть чиста, карманы пусты.', 'warn'); }
      collectFence(); } });
    G.modal({ title: '🚪 Конец смены: как нести добычу?', wide: true, face: 'egorych',
      text: 'Смена кончилась. У тебя: ' + (robe.length ? '<br>🧥 В робе: <b>' + robe.length + ' шт.</b> (≈ ' + rub(total(robe)) + ')' : '') + (lock.length ? '<br>🔒 В шкафчике: <b>' + lock.length + ' шт.</b> (≈ ' + rub(total(lock)) + ')' : '')
        + '<br><br>Егорыч на проходной смотрит в оба: добычу в робе он заметит почти наверняка, из шкафчика — реже. Дыра в заборе и ворота Гоши — запасные пути.',
      opts });
  };
  const _fs = G.finishShift;
  G.finishShift = function () {
    const r = _fs.apply(this, arguments);
    try { if (G.s && !G.s.end) G.lootExit(); } catch (e) { log(e); }
    return r;
  };

  // =====================================================================
  //  ДОМ → Добыча: просмотр и продажа
  // =====================================================================
  const RATE_HOME = 0.55;
  const marketRate = () => 0.6 + Math.floor(G.hash(G.s.t.day, 41, 5) * 21) / 100; // 60–80%, цены гуляют по дням
  const grouped = arr => { const g = {}, order = []; arr.forEach(x => { if (!g[x.n]) { g[x.n] = { n: x.n, items: [] }; order.push(x.n); } g[x.n].items.push(x); }); return order.map(k => g[k]); };
  G.stashMenu = function (mode, visit) {
    const arr = list('home'); visit = visit || { sold: 0, spent: 0 };
    mode = mode === 'market' ? 'market' : 'home';
    if (!arr.length) { G.info(mode === 'market' ? '🏚 Барахолка' : '🧺 Добыча', visit.sold ? 'Всё продано. Выручка: <b>' + rub(visit.sold) + '</b>.' : 'Пока ничего нет. Добыча появляется дома, когда вынесешь её с завода.'); return; }
    const rate = mode === 'market' ? marketRate() : RATE_HOME;
    G.modal({ title: mode === 'market' ? '🏚 Барахолка' : '🧺 Добыча дома', wide: true,
      text: 'Предметов: <b>' + arr.length + '</b>, оценка ≈ <b>' + rub(total(arr)) + '</b>.<br>' + (mode === 'market'
        ? 'Сегодня на барахолке берут по <b>' + Math.round(rate * 100) + '%</b> от оценки (цены гуляют по дням). Торговля займёт час.'
        : 'Знакомый скупщик заберёт прямо дома за <b>' + Math.round(rate * 100) + '%</b> от оценки и без вопросов. На барахолке в городе платят больше (60–80%), но уйдёт час вечера.'),
      opts: grouped(arr).map(g => ({ t: g.n + ' ×' + g.items.length + ' — ≈ ' + rub(total(g.items)), fn: () => sellGroup(g, mode, visit) }))
        .concat([{ t: '💰 Продать всё (' + rub(total(arr) * rate) + ')', fn: () => sellItems(arr.slice(), mode, visit) }, { t: 'Закрыть', fn: () => {} }]) });
  };
  function sellGroup(g, mode, visit) {
    const rate = mode === 'market' ? marketRate() : RATE_HOME, opts = [];
    opts.push({ t: 'Продать всё: ×' + g.items.length + ' за ' + rub(total(g.items) * rate), fn: () => sellItems(g.items.slice(), mode, visit) });
    if (g.items.length > 1) opts.push({ t: 'Продать одну штуку за ' + rub(g.items[0].v * rate), fn: () => sellItems([g.items[0]], mode, visit) });
    opts.push({ t: '← Назад', fn: () => G.stashMenu(mode, visit) });
    G.modal({ title: g.n + ' ×' + g.items.length, text: 'Оценка: ≈ ' + rub(total(g.items)) + '. По курсу ' + Math.round(rate * 100) + '%.', opts });
  }
  function sellItems(items, mode, visit) {
    const home = list('home'), rate = mode === 'market' ? marketRate() : RATE_HOME, pay = Math.round(total(items) * rate);
    items.forEach(it => { const i = home.indexOf(it); if (i >= 0) home.splice(i, 1); });
    G.addMoney(pay); visit.sold = (visit.sold || 0) + pay; F().lootSold = (F().lootSold || 0) + pay; G.fx({ cons: -1 });
    G.toast('Продано: ' + items.length + ' шт. за ' + rub(pay) + '. Покупатели не спрашивали откуда.', 'good');
    if (mode === 'market' && !visit.spent) { visit.spent = 1; G.spend(1); }
    if (home.length) G.stashMenu(mode, visit);
    else G.info(mode === 'market' ? '🏚 Барахолка' : '🧺 Добыча', 'Всё продано. Выручка за визит: <b>' + rub(visit.sold) + '</b>.');
  }
  // Хомяк на заводе: берёт добычу из робы и шкафчика
  G.lootSellKhomyak = function () {
    const arr = carried(); if (!arr.length) return G.toast('Продавать нечего.', 'warn');
    const pay = Math.round(total(arr) * 0.6);
    F().loot = []; F().lockerLoot = [];
    G.addMoney(pay); G.fx({ cons: -2 }); G.relAdd('khomyak', 1);
    G.toast('Хомяк забрал товар и выдал ' + rub(pay) + '.', 'good'); G.spend(1);
  };

  // ---------- Карточки в интерфейсе
  G.lootCard = function () {
    const s = G.s; if (!s || !s.flags) return '';
    const robe = list('robe'), lock = list('locker'), fence = list('fence');
    if (!robe.length && !lock.length && !fence.length) return '';
    const row = (t, a) => a.length ? '<div class="kv"><span>' + t + '</span><b>' + a.length + ' шт. ≈ ' + rub(total(a)) + '</b></div>' : '';
    let h = '<div class="card"><h3>🧰 Добыча на заводе</h3>' + row('🧥 В робе', robe) + row('🔒 В шкафчике (' + units(lock) + '/' + LOCKER_CAP + ')', lock) + row('🌳 Тайник за забором', fence);
    if (robe.length) h += '<div class="note">💡 Через проходную с добычей в робе Егорыч не пропустит: спрячь её в шкафчик (🚪 Раздевалка) или перекинь через дыру в заборе (🌳 Двор).</div>';
    return h + '</div>';
  };
  G.stashCard = function () {
    const a = list('home'); if (!a.length) return '';
    return '<div class="card"><h3>🧺 Добыча дома</h3><div class="kv"><span>Предметов</span><b>' + a.length + '</b></div><div class="kv"><span>Оценка</span><b>≈ ' + rub(total(a)) + '</b></div><button class="btn" style="margin-top:8px" onclick="G.stashMenu(\'home\')">Посмотреть и продать</button></div>';
  };
  G.lootBagHTML = function () {
    const s = G.s; if (!s || !s.flags) return '';
    const parts = [['🧥 В робе', list('robe')], ['🔒 В шкафчике', list('locker')], ['🌳 За забором', list('fence')], ['🏠 Дома', list('home')]].filter(x => x[1].length);
    if (!parts.length) return '';
    return '<div class="card"><h3>Добыча</h3>' + parts.map(x => '<div class="kv"><span><b>' + x[0] + '</b></span><span>≈ ' + rub(total(x[1])) + '</span></div>' + grouped(x[1]).map(g => '<div class="kv"><span>· ' + g.n + '</span><span>×' + g.items.length + '</span></div>').join('')).join('') + '</div>';
  };

  // =====================================================================
  //  ЛЕВЫЙ ЗАКАЗ в рабочее время
  //  pay — диапазон оплаты, h — часов, r — базовый риск попасться, tw — случайные «изюминки»
  // =====================================================================
  const SJ = [
    { id: 'weld', i: '🔥', n: 'Сварить шов на заказ', game: 'weld', h: 3, r: 30, pay: [1800, 3500], d: 'Заказчик: «Нужен шов на мангале, чтобы выдержал тёщу». Работа тонкая, платят хорошо.' },
    { id: 'fix', i: '🔧', n: 'Починить технику соседям', game: 'fix', h: 3, r: 30, pay: [1400, 2800], d: 'Соседи принесли тостер, дрель и «что-то, что раньше работало». Надо угадать нужный инструмент.' },
    { id: 'stool', i: '🪑', n: 'Табуретки для дачи', h: 2, r: 30, pay: [500, 800], d: 'Люда-буфетчица: «Мне три табуретки, чтобы выдерживали Петровича».',
      tw: [{ p: 18, t: 'Табуретки вышли такие крепкие, что Люда заказала ещё две — для пола.', money: 200 }, { p: 10, t: 'Одна табуретка «случайно» приварилась к верстаку. Станку не понравилось.', fx: { wear: 6 } }] },
    { id: 'key', i: '🔑', n: 'Ключ на 32 для люка', h: 1, r: 22, pay: [300, 600], d: 'Вася из гаражей: «Выточи ключ, а то люк сам не откроется».',
      tw: [{ p: 20, t: 'Вася расчувствовался и подарил пачку сигарет.', give: 'cigs' }] },
    { id: 'mangal', i: '🍖', n: 'Мангал «Тёщин огонь»', h: 2, r: 35, pay: [700, 1000], d: 'Заказ из обрезков: мангал, который переживёт любую шашлычную войну.',
      tw: [{ p: 15, t: 'Мангал вышел размером с бочку. Заказчик взял два и позвал на шашлык.', money: 300, fx: { mood: 6, coll: 2 } }] },
    { id: 'knives', i: '🔪', n: 'Заточить ножи для столовой', h: 1, r: 12, pay: [200, 400], d: 'Повариха Валентина: «Ножи тупые, как начальство».',
      tw: [{ p: 60, t: 'Валентина добавила порцию котлет «за труды».', fx: { satiety: 18, mood: 2 } }] },
    { id: 'cat', i: '🐈', n: 'Памятник коту Барсику', h: 2, r: 38, pay: [600, 1000], d: 'Дядя Коля заказал памятник коту Барсику: «Чтобы Барсик смотрел на дорогу».',
      tw: [{ p: 25, t: 'Дядя Коля расплакался и приплатил: «Барсик бы оценил».', money: 250, fx: { mood: 4 } }, { p: 10, t: 'Памятник получился подозрительно похожим на директора.', fx: { cool: 3, boss: -2 } }] },
    { id: 'bike', i: '🚲', n: 'Велосипед сына Щиплена', h: 1, r: 8, pay: [400, 700], d: 'Просьба странная и приятная: починить велосипед сына начальника цеха. Попадёшься — вроде как «по знакомству».',
      tw: [{ p: 60, t: 'Щиплен узнал и остался доволен. Репутация у начальства выросла.', fx: { boss: 4 } }, { p: 15, t: 'Сын прокатился и погнул переднее колесо. Папа пока не знает.', fx: { boss: -1 } }] },
    { id: 'still', i: '🥃', n: 'Починить самогонный аппарат', h: 2, r: 45, pay: [800, 1200], d: 'Мужики из кузнечного: «Аппарат капризничает. Только тихо, ладно?»', sev: 1,
      tw: [{ p: 45, t: 'Аппарат заработал так, что тебе налили в благодарность.', give: 'vodka' }, { p: 12, t: 'Аппарат чихнул паром. Брови отрастут.', fx: { health: -3, neat: -8 } }] },
    { id: 'hipster', i: '🔩', n: 'Эксклюзивный болт для хипстера', h: 1, r: 25, pay: [1000, 1500], d: 'Парень из города платит за «аутентичный советский болт ручной работы». Болт как болт.',
      tw: [{ p: 30, t: 'Хипстер выложил болт в соцсети: триста лайков. Тебе прибавили крутизны.', fx: { cool: 3 } }, { p: 10, t: 'Часть оплаты хипстер внёс «экспозицией»: пообещал упомянуть тебя в блоге.', mult: 0.7 }] },
    { id: 'muffler', i: '🚗', n: 'Подварить глушитель Витьку', h: 1, r: 22, pay: [400, 700], d: 'Витёк: «Глушитель отвалился по дороге. Нужно срочно, пока ГАИ не заметило».',
      tw: [{ p: 15, t: 'Глушитель отвалился у Витька на светофоре. Он просит скидку.', money: -150 }, { p: 25, t: 'Витёк подбросил до дома и обещал помочь с гаражом.', rel: { vityok: 3 } }] },
    { id: 'gate', i: '🚪', n: 'Калитка Михалычу', h: 1, r: 18, pay: [300, 500], d: 'Михалыч просит сделать калитку «чтобы не скрипела».',
      tw: [{ p: 35, t: 'Михалыч расчувствовался и налил чаю.', fx: { mood: 2 }, rel: { mikhalych: 3 } }] },
    { id: 'sled', i: '🛷', n: 'Санки для внуков', h: 1, r: 10, pay: [200, 350], d: 'Бабушка из бухгалтерии просит санки из обрезков для внуков.',
      tw: [{ p: 40, t: 'Бабушка расплатилась пирожками. Сытно.', fx: { satiety: 12, mood: 2 } }] },
    { id: 'antenna', i: '📡', n: 'Антенна «на все каналы»', h: 1, r: 15, pay: [350, 600], d: 'Сосед просит антенну, которая ловит «вообще всё».',
      tw: [{ p: 20, t: 'Антенна ловит только «Шансон». Заказчик счастлив.', fx: { mood: 3 } }] }
  ];
  const jobById = id => SJ.find(x => x.id === id) || SJ[0];
  function swRoll() {
    const s = G.s, f = s.flags;
    if (!f.swRoll || f.swRoll.d !== s.t.day) {
      const ids = [];
      if (G.chance(60)) {
        const n = G.chance(20) ? 3 : G.chance(50) ? 2 : 1, pool = SJ.map(j => j.id);
        for (let i = 0; i < n && pool.length; i++) ids.push(pool.splice(Math.floor(G.rnd() * pool.length), 1)[0]);
      }
      f.swRoll = { d: s.t.day, ids };
    }
    return f.swRoll.ids;
  }
  const riskOf = (j, k) => j.r * (k === 'fast' ? 0.6 : k === 'solid' ? 1.25 : 1) * ((F().chiefLoy || 0) >= 40 ? 0.5 : 1);
  G.A('side_work', { ph: ['work'], loc: 'shop', g: 'Левые заказы', n: 'Левый заказ в рабочее время', i: '🤫', h: 1, menu: true, noEvent: true,
    req: s => s.day.swDone ? 'Сегодня уже халтурил(а): 1 раз за смену' : !swRoll().length ? 'Сегодня заказов нет' : null,
    fn: () => { G.sideWorkMenu(); return 'custom'; } });
  G.sideWorkMenu = function () {
    const s = G.s, ids = swRoll();
    if (s.day.swDone) return G.toast('Сегодня ты уже халтурил.', 'warn');
    if (!ids.length) return G.toast('Сегодня никто ничего не заказывает.', 'warn');
    G.modal({ title: '🤫 Левый заказ', wide: true,
      text: 'Пока Труханов ходит по цеху, к тебе подкатывают с заказами. Взять можно <b>один за смену</b>. Работа в рабочее время — начальство не одобряет.',
      opts: ids.map(id => { const j = jobById(id); return { t: j.i + ' ' + j.n + ' — ' + rub(j.pay[0]) + '–' + rub(j.pay[1]) + ' · ' + j.h + ' ч · <span class="tag rk">⚠ ' + G.catchChance(riskOf(j)) + '%</span>', dis: G.slotsLeft() < j.h ? 'Смена кончается' : null, fn: () => sideWorkJob(j) }; }).concat([{ t: 'Не сейчас', fn: () => {} }]) });
  };
  function sideWorkJob(j) {
    if (j.game) {
      G.modal({ title: j.i + ' ' + j.n, text: j.d + '<br><i>Делать придётся в рабочее время. Рискованно, зато платят больше.</i>', opts: [
        { t: 'Приступить', fn: () => minigameJob(j) }, { t: 'Отказаться', fn: () => {} }] });
      return;
    }
    G.modal({ title: j.i + ' ' + j.n, wide: true, text: j.d + '<br>Оплата ≈ ' + rub(j.pay[0]) + '–' + rub(j.pay[1]) + ', займёт ' + j.h + ' ч.',
      opts: [
        { t: '⚡ Быстро и тихо (платят меньше, риск ниже) <span class="tag rk">⚠ ' + G.catchChance(riskOf(j, 'fast')) + '%</span>', fn: () => doJob(j, 'fast') },
        { t: '🛠 Как следует (платят больше, риск выше) <span class="tag rk">⚠ ' + G.catchChance(riskOf(j, 'solid')) + '%</span>', fn: () => doJob(j, 'solid') },
        { t: 'Отказаться', fn: () => {} }] });
  }
  function jobCaught(j, risk) {
    const s = G.s;
    if (!G.chance(G.catchChance(risk))) return;
    G.fx({ boss: -4 });
    if (G.chance(35) && G.note) G.note('Левый заказ в рабочее время');
    G.punish({ risk: 100, what: 'Левый заказ: ' + j.n, fine: j.fine || [300, 900], sev: j.sev === undefined ? 1 : j.sev });
  }
  function minigameJob(j) {
    const s = G.s; s.day.swDone = 1;
    G.sideGame(j.game, sc => {
      const pay = Math.round(G.ri(j.pay[0], j.pay[1]) * (0.3 + 0.9 * sc) * 1.5);
      G.fx({ money: pay, energy: -12, mood: sc >= 0.6 ? 3 : -2 });
      G.info('🤫 ' + j.n, (sc >= 0.8 ? 'Работа сделана на отлично. Заказчик платит и целует руку.' : sc >= 0.5 ? 'Работа сделана «в целом». Заказчик заплатил с лёгким вздохом.' : 'Получилось криво. Заказчик заплатил из жалости.') + '<br>Заработано: <b>' + rub(pay) + '</b>.');
      if (sc >= 0.95 && G.achieve) G.achieve('golden', 'Золотые руки');
      jobCaught(j, riskOf(j));
      if (!s.end) G.spend(j.h);
    });
  }
  function doJob(j, app) {
    const s = G.s, st = s.st;
    s.day.swDone = 1;
    const pG = C(20 + st.know / 4 + s.car.rank * 2, 15, 60), pB = C(22 - st.know / 6, 5, 22), roll = G.rnd() * 100;
    const q = roll < pG ? 'great' : roll > 100 - pB ? 'bad' : 'ok';
    let pay = G.ri(j.pay[0], j.pay[1]) * (app === 'fast' ? 0.7 : 1.25) * (q === 'great' ? 1.25 : q === 'bad' ? 0.5 : 1);
    const notes = [q === 'great' ? 'Получилось лучше, чем просили. Заказчик в восторге.' : q === 'bad' ? 'Вышло кривовато. Заказчик поморщился и заплатил меньше.' : 'Сделано ровно, как заказывали.'];
    G.fx({ energy: -5 * j.h, satiety: -2 * j.h, mood: q === 'bad' ? -3 : 1 });
    (j.tw || []).forEach(t => {
      if (!G.chance(t.p)) return;
      notes.push(t.t);
      if (t.money) pay += t.money;
      if (t.mult !== undefined) pay *= t.mult;
      if (t.fx) G.fx(t.fx);
      if (t.rel) Object.keys(t.rel).forEach(id => G.relAdd(id, t.rel[id]));
      if (t.give) G.give(t.give, 1);
    });
    if (G.chance(8)) { pay = 0; notes.push('Заказчик «забыл кошелёк» и пообещал занести завтра. Ждать не советую.'); }
    if (G.chance(5)) { G.fx({ health: -4 }); notes.push('Порезал палец о заготовку. Заклеил и работал дальше.'); }
    pay = Math.max(0, Math.round(pay / 10) * 10);
    if (pay) G.fx({ money: pay });
    G.info('🤫 ' + j.n, notes.join('<br>') + '<br><br>Заработано: <b>' + rub(pay) + '</b>.');
    jobCaught(j, riskOf(j, app));
    if (!s.end) G.spend(j.h);
  }

  // =====================================================================
  //  ОТК: сдать партию
  //  Оценка по среднему качеству за смену. Клеймо A/B/C защищает от «возврата партии» вечером.
  // =====================================================================
  G.A('otk_chat', { ph: ['work'], loc: 'otk', g: 'Контроль качества', n: 'Сдать деталь на ОТК', i: '🔩', h: 1, menu: true, noEvent: true,
    req: s => !s.day.ops ? 'Сначала поработай: сдавать нечего' : s.day.otkDone ? 'Партия за смену уже принята' : null,
    fn: () => { G.otkSubmit(); return 'custom'; } });
  function otkGrade(q) { return q >= 85 ? 'A' : q >= 70 ? 'B' : q >= 50 ? 'C' : 'D'; }
  function otkFinish(g, q, note) {
    const s = G.s, d = s.day;
    const T = { A: 'Отлично. Ставлю клеймо «A». Так бы всегда.', B: 'Годно. Клеймо «B». Придраться не к чему.', C: 'Принято с замечаниями. Клеймо «C». Следи за допусками.', D: 'Это брак. Верни в цех и сделай нормально.' };
    if (g === 'A') { G.fx({ money: 350, boss: 2, mood: 3, know: 1, rel: { ekaterina: 3 } }); s.st.bm += 2; s.pay.prem += 0.2; d.otkStamp = 'A'; F().otkA = (F().otkA || 0) + 1; if (F().otkA >= 10 && G.achieve) G.achieve('otk_a10', 'Клеймо «Отлично» ×10'); }
    else if (g === 'B') { G.fx({ money: 120, boss: 1, mood: 1, rel: { ekaterina: 2 } }); s.st.bm += 1; s.pay.prem += 0.1; d.otkStamp = 'B'; }
    else if (g === 'C') { G.fx({ mood: -1, rel: { ekaterina: 1 } }); d.otkStamp = 'C'; }
    else { G.fx({ boss: -2, mood: -4, rel: { ekaterina: -2 } }); d.otkStamp = ''; }
    const bonus = g === 'A' ? '<br><br>💰 Премия +350 ₽, 🎖 +2 балла мастерства, защита от возврата партии вечером.' : g === 'B' ? '<br><br>💰 Премия +120 ₽, 🎖 +1 балл мастерства, защита от возврата партии вечером.' : g === 'C' ? '<br><br>Партия принята: вечером её не вернут.' : '<br><br>Партия не принята.';
    G.modal({ title: '🔩 ОТК: клеймо «' + (g === 'D' ? 'брак' : g) + '»', face: 'ekaterina', text: (note ? note + '<br><br>' : '') + '«' + T[g] + '»' + bonus, opts: [{ t: 'Ок', fn: () => {} }] });
    if (!s.end) G.spend(1);
  }
  G.otkSubmit = function () {
    const s = G.s, d = s.day, r = G.R('ekaterina');
    const avg = d.ops ? d.qsum / d.ops : 0, rel = G.rl('ekaterina');
    const flaw = s.dwg && s.dwg.bad && !s.dwg.fixed;
    const seen = flaw && G.chance(r.stage >= 4 ? 15 : C(80 - rel * 0.4, 35, 90));
    d.otkDone = 1;
    const intro = 'Екатерина Евгеньевна берёт штангенциркуль. Партия за смену: операций <b>' + d.ops + '</b>, среднее качество <b>' + Math.round(avg) + '%</b>.';
    if (seen) {
      G.modal({ title: '🔩 ОТК: брак по чертежу', face: 'ekaterina', wide: true,
        text: intro + '<br><br>«Размеры не бьются. Ты делал по неправильному чертежу. Партию принять не могу».',
        opts: [
          { t: '🔁 Переделать по правильному чертежу (2 ч)', dis: G.slotsLeft() < 3 ? 'Смена кончается' : null, fn: () => {
            s.dwg.fixed = true; G.fx({ know: 2, energy: -6 }); G.spend(2);
            if (!s.end) otkFinish(otkGrade(Math.max(avg, 70)), avg, 'Переделано по правильному чертежу.'); } },
          { t: '🙏 Уговорить закрыть глаза', dis: rel < 30 ? 'Мало доверия (нужно 30+)' : null, fn: () => {
            if (G.chance(C(30 + rel / 2, 30, 80))) { G.fx({ cons: -3, rel: { ekaterina: -3 } }); s.dwg.fixed = true; otkFinish('C', avg, 'Екатерина вздохнула и «не заметила» ошибку. Ты ей должен.'); }
            else { G.fx({ boss: -2, rel: { ekaterina: -4 } }); G.toast('Екатерина вспыхнула: «Взяток не беру. И глаз не закрываю».', 'bad'); G.spend(1); } } },
          { t: 'Оставить как есть', fn: () => { G.fx({ mood: -2, rel: { ekaterina: -1 } }); d.otkStamp = ''; G.toast('Партию вернули без клейма. Вечером она может вернуться в цех.', 'warn'); G.spend(1); } }
        ] });
      return;
    }
    const g = otkGrade(avg);
    if (g === 'D') {
      G.modal({ title: '🔩 ОТК: брак', face: 'ekaterina', wide: true, text: intro + '<br><br>«Это не деталь, а сувенир. Доработай».',
        opts: [
          { t: '🔧 Доработать (1 ч): качество +10', dis: G.slotsLeft() < 2 ? 'Смена кончается' : null, fn: () => { d.qsum += d.ops * 10; G.fx({ energy: -4, know: 1 }); G.spend(1); if (!s.end) { const ng = otkGrade(avg + 10); otkFinish(ng === 'D' ? 'C' : ng, avg + 10, 'Доработано напильником и силой воли.'); } } },
          { t: 'Забрать как есть', fn: () => otkFinish('D', avg, '') }
        ] });
      return;
    }
    G.modal({ title: '🔩 ОТК', face: 'ekaterina', text: intro, opts: [{ t: 'Подождать результат', fn: () => otkFinish(g, avg, '') }] });
  };
  // Партия с клеймом не возвращается вечером из-за кривого чертежа
  const _es = G.endShift;
  G.endShift = function () {
    try { const s = G.s; if (s && s.phase !== 'evening' && !s.end && s.day && s.day.otkStamp && s.dwg && s.dwg.bad && !s.dwg.fixed) s.dwg.fixed = true; } catch (e) { log(e); }
    return _es.apply(this, arguments);
  };
  function otkCard() {
    const s = G.s, d = s.day, st = d.otkStamp;
    return '<div class="card"><h3>🔩 ОТК</h3><div class="note">Сдай партию Екатерине Евгеньевне (после хотя бы одной операции, раз в смену). Оценка идёт по среднему качеству за смену: клеймо <b>A</b> и <b>B</b> дают премию, баллы мастерства и защиту от возврата партии вечером. Брак по кривому чертежу она заметит.</div>'
      + '<div class="kv"><span>Сегодня</span><b>' + (d.otkDone ? (st ? 'клеймо «' + st + '»' : 'партия не принята') : d.ops ? 'можно сдавать (' + d.ops + ' оп.)' : 'нечего сдавать') + '</b></div></div>';
  }

  // =====================================================================
  //  МЕДПУНКТ
  // =====================================================================
  G.A('med_check', { ph: ['work'], loc: 'med', g: 'Здоровье', n: 'Осмотр и лечение у Алевтины', i: '🩺', h: 1, lunch: true, menu: true, noEvent: true,
    req: s => !G.isPresent('alevtina') ? 'Алевтины нет на месте' : s.day.medCheck ? 'Сегодня уже осматривалась: 1 раз за смену' : null,
    fn: () => { G.medCheck(); return 'custom'; } });
  G.A('med_pills', { ph: ['work'], loc: 'med', g: 'Здоровье', n: 'Выпросить таблетки с собой', i: '💊', lunch: true, menu: true, noEvent: true,
    req: s => !G.isPresent('alevtina') ? 'Алевтины нет на месте' : s.day.medPills ? 'Сегодня таблетки уже выдавали' : G.rl('alevtina') < 0 ? 'Алевтина не в духе: загладь вину подарком' : null,
    fn: () => { G.medPills(); } });
  G.A('med_note', { ph: ['work'], loc: 'med', g: 'Здоровье', n: 'Оформить больничный (если реально болен)', i: '📄', menu: true, noEvent: true,
    req: s => !G.isPresent('alevtina') ? 'Алевтины нет на месте' : (s.car.sickUntil || -1) > s.t.day ? 'Больничный уже оформлен' : (s.st.health <= 40 || s.st.tox >= 60) ? null : 'Алевтина: «Ты здоров. Иди работай»',
    fn: () => { G.medNote(); return 'custom'; } });
  G.medCheck = function () {
    const s = G.s, st = s.st, d = s.day, f = F(), rel = G.rl('alevtina');
    if (s.phase !== 'work' && s.phase !== 'lunch') return G.toast('Осмотр — только в медпункте во время смены.', 'warn');
    if (d.medCheck) return G.toast('Сегодня уже осматривалась.', 'warn');
    d.medCheck = 1;
    if ((st.drunk || 0) >= 8) {
      G.relAdd('alevtina', -2);
      if (G.chance(50)) { G.toast('Алевтина принюхалась: «Дыхни. Так и знала».', 'bad'); G.punish({ risk: 100, what: 'Явился в медпункт нетрезвым', fine: [100, 300], sev: 0 }); if (!s.end) G.spend(1); return; }
      G.toast('Алевтина принюхалась, но промолчала: «Сядь, не дыши в мою сторону».', 'warn');
    }
    const out = [], fx = { health: 4, energy: 3 };
    if (s.hang > 0) { fx.cure = 1; out.push('таблетка от головы: похмелье отпускает'); }
    if (st.tox >= 20) { fx.tox = -(rel >= 20 ? 12 : 8); out.push('молоко и капельница: токсичность падает'); }
    if (st.health < 70) { fx.health += rel >= 20 ? 6 : 3; out.push('зелёнка и таблетки: здоровье лучше'); }
    if (st.mood < 40) { fx.mood = 3; out.push('чай с сахаром и разговор по душам'); }
    if (!out.length) out.push('давление в норме, пульс в норме, симулянт в норме');
    G.fx(fx); G.relAdd('alevtina', 1);
    const rooms = [['Терапевт', st.health >= 45 && st.tox <= 65, 'здоровье ≥ 45, токсичность ≤ 65'], ['ЛОР и рентген', st.tox <= 55, 'токсичность ≤ 55'], ['Нарколог', st.habit <= 60 && !(d.peak > 40), 'привычка ≤ 60, не напиваться'], ['Психиатр', st.mood >= 25 && !f.burnout, 'настроение ≥ 25'], ['Невролог и окулист', !(s.car.lowE > 5), 'не работать на износ']];
    const bad = rooms.filter(r => !r[1]);
    const wk = (f.medNext || 26) - G.week();
    const prog = bad.length ? '<br>Если бы комиссия была сегодня: ' + bad.map(r => '❌ ' + r[0] + ' (' + r[2] + ')').join('; ') + '.' : '<br>Если бы комиссия была сегодня, ты бы прошёл(ла) все кабинеты.';
    G.modal({ title: '🩺 Осмотр у Алевтины', face: 'alevtina', wide: true,
      text: 'Алевтина послушала, померила, поцокала языком.<br><br>' + out.map(x => '· ' + x).join('<br>') + prog + '<br>Плановая медкомиссия: ' + (wk > 0 ? 'через ~' + wk + ' нед.' : 'пора, скоро вызовут.'),
      opts: [{ t: 'Спасибо', fn: () => {} }] });
    G.spend(1);
  };
  G.medPills = function () {
    const s = G.s, st = s.st; s.day.medPills = 1;
    const id = (s.hang > 0 || (st.drunk || 0) > 5) ? 'aspirin' : st.tox >= 40 ? 'vitamins' : st.health < 60 ? 'mazi' : 'mint';
    G.give(id, 1); G.relAdd('alevtina', 1);
    G.toast('Алевтина сунула тебе в карман: ' + D.ITEMS[id].n + '. «Только не всё сразу».', 'good');
  };
  G.medNote = function () {
    const s = G.s;
    G.modal({ title: '📄 Больничный', face: 'alevtina', wide: true,
      text: 'Алевтина посмотрела на тебя поверх очков: «Вижу, что тебе реально плохо. Выпишу на 2 дня. Но денег за эти дни не будет — предупреждаю».',
      opts: [
        { t: 'Оформить больничный на 2 дня', fn: () => { s.car.sickUntil = Math.max(s.car.sickUntil || -1, s.t.day + 2); G.fx({ health: 8, mood: 3 }); G.toast('Больничный оформлен: на завод ближайшие 2 дня идти не надо. Отлежись.', 'good'); } },
        { t: 'Передумал(а)', fn: () => {} }] });
  }
  function medCard() {
    const d = G.s.day;
    return '<div class="card"><h3>⚕️ Медпункт</h3><div class="note">Алевтина лечит раз в смену: снимает похмелье и токсичность, чинит здоровье, подсказывает, пройдёшь ли ты плановую медкомиссию. Можно выпросить таблетки с собой, а если реально болен (здоровье ≤ 40 или токсичность ≥ 60) — оформить бесплатный больничный.</div>'
      + '<div class="kv"><span>Сегодня</span><b>' + (d.medCheck ? 'осмотр пройден' : 'осмотра не было') + '</b></div></div>';
  }

  // =====================================================================
  //  Карточки по местам (вызывается из ui.js)
  // =====================================================================
  G.locCard = function (loc) {
    let h = '';
    try {
      h += G.lootCard();
      if (loc === 'otk') h += otkCard();
      if (loc === 'med') h += medCard();
    } catch (e) { log(e); }
    return h;
  };

  // ---------- Список изменений
  try {
    if (G.CHANGELOG && !G.CHANGELOG.some(c => c.v === 'V3.17')) G.CHANGELOG.unshift({ v: 'V3.17', date: '22.11.2026', items: [
      '🤫 «Левый заказ»: раз в смену и не каждый день. Забавные заказы с разной оплатой (от 200 до 3500 ₽) и рисками: выговор, штраф, неплательщики, порезы.',
      '🧰 «Что плохо лежит»: раз в смену и не каждый день, 17 видов добычи. Добыча «в робе» — прячь её в шкафчик (Раздевалка) или перекидывай через дыру в заборе (Двор).',
      '🚪 После смены добычу надо вынести: через проходную (Егорыч заметит добычу в робе), через дыру в заборе или через ворота Гоши за долю.',
      '🧺 «Дом → Добыча»: список с количеством и оценкой, продажа скупщику дома или на барахолке (цена гуляет 60–80%).',
      '🔩 ОТК: «Сдать деталь на ОТК» оценивает партию. Клеймо A/B даёт премию и защиту от возврата вечером; кривой чертёж Екатерина заметит.',
      '⚕️ Медпункт: осмотр и лечение раз в смену, таблетки, бесплатный больничный для реально больных, прогноз медкомиссии.'
    ] });
  } catch (e) { log(e); }
})();
