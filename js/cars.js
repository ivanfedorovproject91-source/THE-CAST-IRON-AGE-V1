/* ===== v3.10: Автомобили игрока — каталог моделей, топливо, износ, ремонт, ТО, окно машины ===== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.D, C = G.clamp;
  const rub = n => G.rub(n);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Настройки баланса
  const KM = 30;                 // км в одну сторону (дом ↔ завод)
  const REPAIR_HOURS = 2;        // сколько часов вечера занимает ремонт / ТО
  const WEAR_SVC = 30;           // на сколько пунктов ТО снижает износ
  const GRADE = { 92: ['АИ-92', 58], 95: ['АИ-95', 64], 98: ['АИ-98', 82], dt: ['ДТ', 66] };

  // ---------- Каталог: v — очки статуса (как у прежних предметов), tank — л, cons — л/100 км,
  // rel — надёжность 0..100, wear — износ в % на 1000 км, rk — множитель цены ремонта,
  // svc — цена ТО, int — интервал ТО (км), used — состояние при покупке (б/у).
  const CAT = {
    car0:  { brand: 'Запорожец', model: '«Горбатый»', cls: 'Ретро', e: '🚗', p: 60000, v: 0.5, tank: 30, cons: 9, fuel: 92, rel: 35, wear: 7, rk: 0.8, svc: 1500, int: 2000, used: { cond: 70, wear: 40, km: 180000 }, d: 'Дедовский. Заводится с пинка, глохнет из принципа.' },
    car1:  { brand: 'Лада', model: 'Девятка', cls: 'Эконом', e: '🚗', p: 150000, v: 1, tank: 43, cons: 8.5, fuel: 92, rel: 50, wear: 5, rk: 1, svc: 2400, int: 2500, used: { cond: 85, wear: 25, km: 120000 }, d: 'Классика районов. Тонировка — на полстекла и на всю жизнь.' },
    carV:  { brand: 'Уралец', model: 'Буханка', cls: 'Рабочая лошадка', e: '🚐', p: 220000, v: 1.2, tank: 55, cons: 12, fuel: 'dt', rel: 75, wear: 3, rk: 0.9, svc: 2200, int: 3000, d: 'Вывезет всё: цех, дачу, тёщу. Жрёт много, ломается редко.' },
    car1b: { brand: 'Лада', model: 'Гранта', cls: 'Эконом', e: '🚗', p: 350000, v: 1.5, tank: 50, cons: 7.8, fuel: 92, rel: 55, wear: 4.5, rk: 1, svc: 3000, int: 3000, d: 'Новая, блестящая. Дверь закрывается с третьего раза.' },
    carN:  { brand: 'Уралец', model: 'Вездеход', cls: 'Внедорожник', e: '🚙', p: 480000, v: 1.8, tank: 60, cons: 11, fuel: 92, rel: 65, wear: 4, rk: 1.1, svc: 3600, int: 3000, d: 'Куда не доедет — там и не нужно. Гордость рыбаков.' },
    car2:  { brand: 'Фольксхаген', model: 'Гольфик (б/у)', cls: 'Комфорт', e: '🚙', p: 600000, v: 2, tank: 50, cons: 7.5, fuel: 95, rel: 60, wear: 4, rk: 1.5, svc: 4500, int: 3500, used: { cond: 85, wear: 30, km: 210000 }, d: 'Иномарка «из Европы». Запчасти — только из Европы.' },
    carP:  { brand: 'Едрёнмотор', model: 'Трудяга', cls: 'Пикап', e: '🛻', p: 900000, v: 2.2, tank: 70, cons: 10.5, fuel: 'dt', rel: 78, wear: 3, rk: 1.2, svc: 4800, int: 4000, d: 'В кузове — вся твоя добыча с завода. Теоретически.' },
    car2b: { brand: 'Тоёкава', model: 'Сидэн-R (праворукая)', cls: 'Комфорт', e: '🚙', p: 1200000, v: 2.5, tank: 45, cons: 6.5, fuel: 95, rel: 85, wear: 2.5, rk: 1.4, svc: 5200, int: 4500, d: 'Руль справа, надёжность слева. Едет вечно, обгонять неудобно.' },
    carW:  { brand: 'Баварец', model: 'Икс-Кросс', cls: 'Бизнес', e: '🚙', p: 2000000, v: 2.8, tank: 65, cons: 10, fuel: 95, rel: 55, wear: 3.5, rk: 2.6, svc: 8000, int: 4000, d: 'Подвеска как у принцессы: любую кочку чувствует.' },
    car3:  { brand: 'Штутгарт', model: 'Е-Люкс', cls: 'Премиум', e: '🏎️', p: 3000000, v: 3, tank: 66, cons: 9.5, fuel: 98, rel: 70, wear: 3, rk: 2.8, svc: 10000, int: 4500, d: 'Директорская. Двери закрываются сами и смотрят на тебя с уважением.' },
    carL:  { brand: 'Кремлёвец', model: 'Лимузин «Генеральский»', cls: 'Представительский', e: '🚘', p: 5000000, v: 3.5, tank: 80, cons: 15, fuel: 98, rel: 65, wear: 3.5, rk: 3.5, svc: 14000, int: 5000, d: 'Чёрный, длинный, с флажком. Шлагбаумы поднимаются заранее.' },
    car4:  { brand: 'Бумер', model: 'Спорт-Купе', cls: 'Спорт', e: '🏎️', p: 8000000, v: 4, tank: 60, cons: 15, fuel: 98, rel: 50, wear: 5, rk: 4.5, svc: 15000, int: 3500, d: 'Красный, быстрый и дорогой в содержании. Мечта и кредит.' }
  };
  const ORDER = Object.keys(CAT).sort((a, b) => CAT[a].p - CAT[b].p);
  Object.keys(CAT).forEach(k => {
    const m = CAT[k]; m.key = k; m.n = m.brand + ' ' + m.model;
    D.STATUS[k] = Object.assign(D.STATUS[k] || {}, { n: m.n, p: m.p, e: m.e, tier: 'car', v: m.v });
  });

  const fuelInfo = m => GRADE[m.fuel];
  const fuelPrice = m => fuelInfo(m)[1];

  // ---------- Состояние (хранится в s.flags.car — попадает в сохранение, старые сохранения достраиваются)
  function ownedKey() { const s = G.s; return s && s.own ? Object.keys(s.own).find(k => CAT[k]) || null : null; }
  function fresh(m) {
    const u = m.used || {}, day = G.s.t.day;
    return { key: m.key, cond: u.cond || 100, wear: u.wear || 0, km: u.km || 0, kmSvc: u.km ? Math.round(m.int * 0.4) : 0, fuel: Math.round(m.tank * 0.5), fuelWk: -1, broken: -1, bought: day, svcDay: day };
  }
  function state() {
    const s = G.s; if (!s || !s.flags) return null;
    const k = ownedKey(), f = s.flags;
    if (!k) { if (f.car) delete f.car; return null; }
    const m = CAT[k]; let c = f.car;
    if (!c || c.key !== k) c = f.car = fresh(m);
    if (c.fuel === undefined) { // сохранение из версии со «слитной» недельной заправкой
      c.fuel = c.fuelWk === G.week() ? m.tank : Math.round(m.tank * 0.3);
      c.wear = Math.round((100 - (c.cond == null ? 100 : c.cond)) * 0.25); c.km = c.km || 0; c.kmSvc = Math.round((100 - (c.cond == null ? 100 : c.cond)) * 20); c.svcDay = s.t.day; c.bought = c.bought || s.t.day;
    }
    ['cond'].forEach(x => { if (typeof c[x] !== 'number') c[x] = 100; });
    c.broken = typeof c.broken === 'number' ? c.broken : -1;
    c.n = m.n; c.v = effV(c);
    return c;
  }
  // эффективная «статусность»: запущенная и ржавая машина престижа почти не даёт (−40%), чинить дешевле, чем терять статус
  function effV(c) { const m = CAT[c.key]; return Math.round(m.v * (0.6 + 0.4 * c.cond / 100) * 100) / 100; }
  const prestige = c => Math.round(effV(c) / 4 * 100);

  // ---------- Формулы
  const effCons = c => CAT[c.key].cons * (1 + c.wear / 100 * 0.25) * (c.cond < 50 ? 1.1 : 1);
  const tripFuel = c => KM * effCons(c) / 100;
  const dayFuel = c => 2 * tripFuel(c);
  const repairPoint = m => Math.max(25, m.svc * 0.012 * m.rk);
  const repairCost = c => Math.round((100 - c.cond) * repairPoint(CAT[c.key]) / 10) * 10;
  const overdue = c => c.kmSvc - CAT[c.key].int;
  const svcCost = c => { const m = CAT[c.key]; return Math.round(m.svc * (overdue(c) > 0 ? 1.25 : 1) / 100) * 100; };
  const towCost = c => Math.round(CAT[c.key].svc * 0.5 / 10) * 10;
  function svcStatus(c) {
    const m = CAT[c.key], left = m.int - c.kmSvc;
    if (left <= 0) return { k: 'bad', t: 'ТО просрочено на ' + Math.round(-left) + ' км', short: 'Просрочено' };
    if (left <= m.int * 0.25) return { k: 'warn', t: 'Скоро ТО (осталось ≈' + Math.round(left) + ' км)', short: 'Скоро ТО' };
    return { k: '', t: 'В порядке (до ТО ≈' + Math.round(left) + ' км)', short: 'В порядке' };
  }
  function condWord(v) { return v >= 85 ? 'Отличное' : v >= 65 ? 'Хорошее' : v >= 45 ? 'Среднее' : v >= 25 ? 'Плохое' : 'Аварийное'; }
  function wearWord(v) { return v < 20 ? 'Минимальный' : v < 45 ? 'Умеренный' : v < 70 ? 'Высокий' : 'Критический'; }
  const atHome = () => { const p = G.s && G.s.phase; return p === 'morning' || p === 'evening' || p === 'weekend'; };

  function blockReason(c) {
    const s = G.s;
    if (c.broken >= s.t.day) return 'Машина в ремонте до дня ' + c.broken;
    const need = dayFuel(c);
    if (c.fuel < need) return 'Мало бензина (нужно ≈' + Math.ceil(need) + ' л на день, в баке ' + Math.floor(c.fuel) + ' л)';
    return null;
  }

  // одна поездка: расход топлива, износ, возможная поломка
  function trip(c) {
    const m = CAT[c.key], s = G.s, over = overdue(c) > 0;
    c.fuel = Math.max(0, c.fuel - tripFuel(c));
    c.km += KM; c.kmSvc += KM;
    c.wear = C(c.wear + m.wear * KM / 1000 * (1 + (100 - c.cond) / 200) * (over ? 1.4 : 1), 0, 100);
    c.cond = C(c.cond - 0.03 * KM * (1.6 - m.rel / 100) * (1 + c.wear / 100) * (over ? 1.5 : 1), 0, 100);
    const p = C((0.012 + (100 - c.cond) * 0.0011 + c.wear * 0.0005) * (1.7 - m.rel / 100), 0.005, 0.5);
    if (G.chance(p * 100)) {
      c.broken = s.t.day + (m.v < 2 ? 3 : 2); c.cond = Math.max(5, c.cond - G.ri(10, 20));
      const cost = Math.max(0, Math.min(s.money, towCost(c))); G.addMoney(-cost);
      return { broke: true, cost };
    }
    return { broke: false, cost: 0 };
  }

  // ---------- Операции (деньги — через G.addMoney, всё лежит в s.flags.car → в сохранении)
  function refuel(c, litres) {
    const m = CAT[c.key], s = G.s; litres = Math.min(litres, m.tank - c.fuel); if (litres <= 0) return false;
    const cost = Math.round(litres * fuelPrice(m)); if (s.money < cost) return false;
    G.addMoney(-cost); c.fuel = Math.min(m.tank, c.fuel + litres); return cost;
  }
  function repair(c) { const cost = repairCost(c); if (G.s.money < cost || cost <= 0) return false; G.addMoney(-cost); c.cond = 100; if (c.broken >= G.s.t.day) c.broken = -1; return cost; }
  function service(c) { const cost = svcCost(c); if (G.s.money < cost) return false; G.addMoney(-cost); c.kmSvc = 0; c.wear = Math.max(0, c.wear - WEAR_SVC); c.cond = Math.min(100, c.cond + 10); c.svcDay = G.s.t.day; return cost; }

  // ---------- Оценка и ломбард
  const pawnValue = k => { const m = CAT[k], c = G.s && G.s.flags && G.s.flags.car && G.s.flags.car.key === k ? G.s.flags.car : null; return Math.round(m.p * 0.4 * (c ? 0.7 + 0.3 * c.cond / 100 : 1) / 100) * 100; };
  G.pawnVal = k => (CAT[k] ? pawnValue(k) : D.STATUS[k].p * 0.4);
  const _ss = G.statusScore;
  G.statusScore = function () { let t = _ss.apply(this, arguments); const c = state(); if (c) t -= CAT[c.key].v - effV(c); return t; };

  // ---------- Вёрстка
  const img = (k, thumb, cls) => '<img class="' + (cls || 'cw-img') + '" src="assets/cars/' + k + (thumb ? '_t' : '') + '.svg" alt="' + esc(CAT[k].n) + '" draggable="false">';
  function bar(label, pct, right, kind) { pct = C(pct, 0, 100); return '<div class="cw-bar ' + (kind || '') + '"><i style="width:' + pct + '%"></i><span><b>' + label + '</b><em>' + right + '</em></span></div>'; }
  const kindHi = v => v < 25 ? 'bad' : v < 45 ? 'warn' : '';
  const kindLo = v => v > 70 ? 'bad' : v > 45 ? 'warn' : '';
  function bars(c) {
    const m = CAT[c.key], fp = c.fuel / m.tank * 100, ss = svcStatus(c), broken = c.broken >= G.s.t.day;
    return '<div class="cw-bars">'
      + bar('⛽ Топливо', fp, Math.round(c.fuel * 10) / 10 + ' / ' + m.tank + ' л', kindHi(fp))
      + bar('🔧 Состояние', c.cond, broken ? 'в ремонте' : condWord(c.cond) + ' · ' + Math.round(c.cond) + '%', kindHi(c.cond))
      + bar('⚙ Износ', c.wear, wearWord(c.wear) + ' · ' + Math.round(c.wear) + '%', kindLo(c.wear))
      + '</div><div class="cw-svc ' + ss.k + '">🛠 Обслуживание: <b>' + ss.t + '</b></div>';
  }
  const kv = (a, b) => '<div class="kv"><span>' + a + '</span><span>' + b + '</span></div>';

  // ---------- Иконка в главном меню (рядом с аватаром, только когда игрок дома)
  function alertKind(c) {
    const m = CAT[c.key];
    if (c.broken >= G.s.t.day || c.fuel < dayFuel(c) || overdue(c) > 0 || c.cond < 25) return 'bad';
    if (c.fuel < m.tank * 0.3 || c.cond < 50 || svcStatus(c).k === 'warn') return 'warn';
    return '';
  }
  function topIcon() {
    const s = G.s; if (!s || !s.phase || s.phase === 'new' || s.end) return '';
    if (!atHome()) return '';
    const c = state(); if (!c) return '';
    return '<button class="tb-car ' + alertKind(c) + '" onclick="G.cars.open()" aria-label="Автомобиль: ' + esc(c.n) + '">' + img(c.key, true, 'tb-car-img') + '<i></i></button>';
  }

  // ---------- Карточка в личном деле
  function dossierCard() {
    const c = state(); if (!c) return '';
    const m = CAT[c.key], ss = svcStatus(c);
    return '<div class="card cw-card"><h3>🚗 Автомобиль</h3>'
      + '<div class="cw-top">' + img(c.key, false) + '<div class="cw-name"><b>' + esc(m.brand) + '</b><span>' + esc(m.model) + '</span><small>' + esc(m.cls) + ' · статус ' + prestige(c) + '/100</small></div></div>'
      + bars(c)
      + kv('Стоимость', rub(m.p)) + kv('Пробег', Math.round(c.km).toLocaleString('ru-RU').replace(/ /g, ' ') + ' км')
      + '<button class="btn" onclick="G.cars.open()">Открыть окно автомобиля</button></div>';
  }

  // ---------- Окно автомобиля
  function open(opt) {
    opt = opt || {};
    const c = state();
    if (!c) { G.info('Автомобиль', 'У тебя нет машины. Загляни в автосалон — вкладка «Город».'); return; }
    const s = G.s, m = CAT[c.key], home = atHome(), free = G.isFree(), price = fuelPrice(m), again = () => G.cars.open(opt);
    const room = m.tank - c.fuel, opts = [];
    const homeWhy = home ? null : 'Машина на заводской стоянке';
    const fuelBtn = (label, L) => {
      const lit = Math.min(L, room), cost = Math.round(lit * price);
      opts.push({ t: label + ' — ' + Math.round(lit * 10) / 10 + ' л · ' + rub(cost), dis: room < 0.5 ? 'Бак полон' : homeWhy || (s.money < cost ? 'Не хватает денег' : null), fn: () => {
        const paid = refuel(c, L); if (paid === false) { G.toast('Не хватает денег на бензин.', 'warn'); } else G.toast('Заправился: ' + Math.round(lit * 10) / 10 + ' л (' + m.n + '), −' + rub(paid));
        again();
      } });
    };
    fuelBtn('⛽ Заправить до полного', room);
    if (room > 10.5) fuelBtn('⛽ Долить 10 л', 10);
    if (room > 20.5) fuelBtn('⛽ Долить 20 л', 20);
    const timeWhy = !free ? 'Сервис работает вечером и в выходной' : s.t.hour + REPAIR_HOURS > 26 ? 'Слишком поздно' : null;
    const rc = repairCost(c), sc = svcCost(c);
    opts.push({ t: '🔧 Ремонт (до 100%) — ' + (rc > 0 ? rub(rc) : 'не нужен') + ' · ' + REPAIR_HOURS + ' ч', dis: rc <= 0 ? 'Машина исправна' : homeWhy || timeWhy || (s.money < rc ? 'Не хватает денег' : null), fn: () => {
      const paid = repair(c); if (paid === false) { G.toast('Не хватает денег на ремонт.', 'warn'); return again(); }
      G.fx({ mood: 2 }); G.toast('Ремонт выполнен (−' + rub(paid) + '). Состояние — 100%.', 'good'); G.spend(REPAIR_HOURS); again();
    } });
    opts.push({ t: '🛠 Техобслуживание — ' + rub(sc) + ' · ' + REPAIR_HOURS + ' ч', dis: c.kmSvc < 50 && c.wear < 5 ? 'Только что обслужена' : homeWhy || timeWhy || (s.money < sc ? 'Не хватает денег' : null), fn: () => {
      const paid = service(c); if (paid === false) { G.toast('Не хватает денег на ТО.', 'warn'); return again(); }
      G.fx({ mood: 2 }); G.toast('ТО пройдено (−' + rub(paid) + '): масло, колодки, фильтры. Износ снижен.', 'good'); G.spend(REPAIR_HOURS); again();
    } });
    opts.push({ t: opt.back ? '← Назад' : 'Закрыть', fn: () => { if (opt.back) opt.back(); } });
    const left = Math.max(0, m.int - c.kmSvc);
    const text = '<div class="cw">' + img(c.key, false) + '<div class="cw-sub">' + esc(m.cls) + ' · ' + esc(m.d) + '</div>' + bars(c)
      + '<div class="cw-h">Характеристики модели</div>'
      + kv('Расход (сейчас)', (Math.round(effCons(c) * 10) / 10) + ' л/100 км <small>(база ' + m.cons + ')</small>') + kv('Объём бака', m.tank + ' л') + kv('Бензин', fuelInfo(m)[0] + ' · ' + rub(price) + '/л')
      + kv('Надёжность', m.rel + '/100') + kv('Скорость износа', m.wear + '% на 1000 км') + kv('Пробег', Math.round(c.km).toLocaleString('ru-RU').replace(/ /g, ' ') + ' км')
      + '<div class="cw-h">Стоимость обслуживания</div>'
      + kv('ТО (каждые ' + m.int + ' км)', rub(m.svc) + (overdue(c) > 0 ? ' <small>+25% за просрочку</small>' : '')) + kv('До ТО', left > 0 ? '≈' + Math.round(left) + ' км' : 'просрочено')
      + kv('Ремонт 1% состояния', rub(Math.round(repairPoint(m)))) + kv('Полный ремонт сейчас', rc > 0 ? rub(rc) : '—') + kv('Эвакуатор при поломке', '≈' + rub(towCost(c)))
      + '<div class="cw-h">Стоимость и статус</div>'
      + kv('Покупная цена', rub(m.p)) + kv('В ломбарде дадут', rub(pawnValue(c.key))) + kv('Статус владельца', prestige(c) + '/100 <small>(зависит от состояния)</small>')
      + '<div class="note" style="margin-top:6px">Поездка на работу и обратно ≈ ' + Math.round(dayFuel(c) * 10) / 10 + ' л в день. Заправка — дома (утром, вечером, в выходной); ремонт и ТО — вечером или в выходной.</div></div>';
    G.modal({ title: m.e + ' ' + m.n, text, opts, wide: true, cls: 'cw-modal' });
  }

  // ---------- Автосалон
  function showroom() {
    const s = G.s, cur = ownedKey();
    const opts = ORDER.map(k => {
      const m = CAT[k], have = s.own[k], better = cur && CAT[cur].v >= m.v && cur !== k;
      return { t: m.e + ' <b>' + esc(m.brand) + ' ' + esc(m.model) + '</b> — ' + rub(m.p) + (have ? ' ✔' : '') + '<small>' + esc(m.cls) + ' · ' + m.cons + ' л/100 км · бак ' + m.tank + ' л · надёжность ' + m.rel + '</small>', dis: have ? 'Уже есть' : better ? 'У тебя уже есть машина лучше' : null, fn: () => detail(k) };
    });
    opts.push({ t: 'Выйти', fn: () => {} });
    G.modal({ title: 'Автосалон «Лада и К»', wide: true, text: 'Деньги: <b>' + rub(s.money) + '</b>. Чем дороже и престижнее машина, тем выше твой статус — но и содержание кусается. Состояние машины влияет на статус.' + (cur ? '<br><small>Покупка новой машины — старая уйдёт в зачёт без доплаты.</small>' : ''), opts });
  }
  function detail(k) {
    const m = CAT[k], s = G.s, u = m.used;
    const text = '<div class="cw">' + img(k, false) + '<div class="cw-sub">' + esc(m.cls) + ' · ' + esc(m.d) + '</div>'
      + kv('Цена', rub(m.p)) + kv('Состояние', u ? 'Б/у: ' + u.cond + '%, износ ' + u.wear + '%, пробег ' + u.km.toLocaleString('ru-RU').replace(/ /g, ' ') + ' км' : 'Новая') + kv('Расход', m.cons + ' л/100 км') + kv('Бак', m.tank + ' л · ' + fuelInfo(m)[0])
      + kv('Надёжность', m.rel + '/100') + kv('Скорость износа', m.wear + '% на 1000 км') + kv('ТО', rub(m.svc) + ' каждые ' + m.int + ' км') + kv('Статус', 'до ' + Math.round(m.v / 4 * 100) + '/100') + '</div>';
    G.modal({ title: m.e + ' ' + m.n, text, wide: true, cls: 'cw-modal', opts: [{ t: 'Купить за ' + rub(m.p), dis: s.money < m.p ? 'Не хватает денег' : null, fn: () => G.buyStatus(k) }, { t: '← К списку', fn: showroom }] });
  }

  // ---------- Что нового
  if (G.CHANGELOG) G.CHANGELOG.unshift({ v: 'V3.5', date: G.CONFIG.GAME_DATE, items: [
    '🚗 Новая система автомобилей: 12 моделей с разными марками, ценами и характеристиками, у каждой — своя картинка и миниатюра.',
    '🪪 Машина игрока показана в «Досье»: фото, марка и модель, стоимость, состояние, топливо, износ и статус обслуживания.',
    '🏠 Дома справа от аватара появляется иконка машины — по нажатию открывается окно автомобиля: заправка, ремонт, ТО и цены обслуживания.',
    '⛽ Бензин теперь тратится на каждой поездке (а не «слитной» заправкой на неделю). Расход, бак, надёжность, износ и цена ремонта зависят от модели.',
    '😎 Чем дороже и престижнее машина, тем выше статус — но запущенная и сломанная машина даёт меньше. В ломбарде цена зависит от состояния.'
  ] });
  if (G.CHANGELOG) G.CHANGELOG.unshift({ v: 'V3.6', date: G.CONFIG.GAME_DATE, items: [
    '📻 Радиоточка внизу экрана: «Маяк», «Ретро FM», «Радио 7». Играет только по вашей кнопке; выключается в «Дело → Настройки».',
    '🛡 Серверная модерация чата: баны и муты, удаление сообщений. Вход в игру по подписи Telegram.'
  ] });

  G.cars = { CAT, ORDER, KM, state, owned: () => { const k = ownedKey(); return k ? { key: k, v: CAT[k].v, n: CAT[k].n } : null; }, effV, prestige, tripFuel, dayFuel, blockReason, trip, refuel, repair, service, repairCost, svcCost, svcStatus, towCost, fuelPrice, pawnValue, open, showroom, topIcon, dossierCard, atHome };
})();
