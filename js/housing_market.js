/* ===== Каталог недвижимости: купить сразу или взять ипотеку в «Рубль-Банке» =====
   Подключается к существующим модулям: жильё (stage3_housing) и кредиты (stage3_credit).
   Старые сохранения: квартира без записи flags.realty считается «Квартирой в центре» (3 000 000 ₽, как раньше). */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const C = G.clamp;
  const rub = n => G.rub(Math.round(n));

  // rent — коммуналка и взносы в месяц, comms — связь, transit — дорога до завода; energy/mood/health — бонус за ночь; cool — статус в неделю
  const R = G.REALTY = {
    studio:  { n: 'Студия на окраине',        i: '🏙️', kind: 'Обычное',  rooms: 'студия',     price: 1100000,  down: 0.15, rent: 1800, comms: 1000, transit: 2000, energy: 3,  mood: 1, health: 0,   cool: 0, d: 'Двадцать два метра, вид на гаражи. Зато своё.' },
    one:     { n: 'Однушка в хрущёвке',       i: '🏢', kind: 'Обычное',  rooms: '1-комн.',    price: 1800000,  down: 0.15, rent: 2200, comms: 1000, transit: 1500, energy: 5,  mood: 1, health: 0,   cool: 0, d: 'Тонкие стены, зато слышно всё о соседях.' },
    center:  { n: 'Квартира в центре',        i: '🏢', kind: 'Обычное',  rooms: '2-комн.',    price: 3000000,  down: 0.15, rent: 2500, comms: 1000, transit: 1500, energy: 8,  mood: 2, health: 0.5, cool: 0, d: 'Двушка рядом с проходной и магазином. Классика.' },
    three:   { n: 'Трёшка в сталинке',        i: '🏛️', kind: 'Обычное',  rooms: '3-комн.',    price: 4500000,  down: 0.15, rent: 3500, comms: 1200, transit: 1500, energy: 9,  mood: 3, health: 0.5, cool: 1, d: 'Высокие потолки, паркет, три комнаты. Можно жить, как человек.' },
    dacha:   { n: 'Дом в посёлке',            i: '🏡', kind: 'Коттедж',  rooms: 'дом 80 м²',  price: 3800000,  down: 0.20, rent: 3000, comms: 1200, transit: 3500, energy: 10, mood: 3, health: 1,   cool: 1, d: 'Грядки, баня, свежий воздух. До завода — на электричке.' },
    elite:   { n: 'Элитная квартира',         i: '🏙️', kind: 'Элитное',  rooms: '3-комн. люкс', price: 9000000, down: 0.20, rent: 7000, comms: 1500, transit: 1500, energy: 11, mood: 4, health: 1,   cool: 3, d: 'Консьерж, паркинг, вид на трубы с высоты птичьего полёта.' },
    cottage: { n: 'Коттедж в «Золотой роще»', i: '🏰', kind: 'Коттедж',  rooms: 'дом 250 м²', price: 14000000, down: 0.25, rent: 9000, comms: 2000, transit: 3500, energy: 12, mood: 4, health: 1.5, cool: 4, d: 'Забор выше, чем у Труханова. Газон подстригает садовник.' },
    manor:   { n: 'Особняк с садом',          i: '👑', kind: 'Элитное',  rooms: 'особняк',    price: 30000000, down: 0.30, rent: 15000, comms: 3000, transit: 3500, energy: 14, mood: 5, health: 2,   cool: 6, d: 'Бассейн, гараж на три машины и ощущение, что завод — это чьи-то чужие проблемы.' }
  };
  const SALE_PCT = 0.9;     // при продаже получаешь 90% цены (агентство и торг)
  const TERMS = [120, 180, 240];

  const H = () => G.HOUSING;
  const base = H() && H().own ? Object.assign({}, H().own) : null;   // прежние значения «своей квартиры»
  const id = () => { const s = G.s; if (!s || !s.own || !s.own.flat) return null; const k = s.flags && s.flags.realty; return R[k] ? k : 'center'; };
  G.realtyId = id;

  // подставляем в «Своё жильё» параметры купленного объекта
  const apply = () => {
    if (!H() || !base) return;
    const k = id(), o = H().own;
    if (!k) { Object.assign(o, base); return; }
    const r = R[k];
    Object.assign(o, { n: r.n, i: r.i, rent: r.rent, comms: r.comms, transit: r.transit, energy: r.energy, mood: r.mood, health: r.health, d: r.d });
  };
  G.applyRealty = apply;

  const _fc = G.fixedCosts; G.fixedCosts = function () { try { apply(); } catch (e) {} return _fc.apply(this, arguments); };
  const _sl = G.sleep; G.sleep = function () { try { apply(); } catch (e) {} return _sl.apply(this, arguments); };
  const _load = G.load; G.load = function () { const r = _load.apply(this, arguments); try { apply(); } catch (e) {} return r; };
  const _ns = G.newState; if (_ns) G.newState = function () { const r = _ns.apply(this, arguments); try { apply(); } catch (e) {} return r; };
  const _wt = G.weeklyTick;
  G.weeklyTick = function () { const r = _wt.apply(this, arguments); try { const k = id(); if (k && R[k].cool && G.s && !G.s.end) G.fx({ cool: R[k].cool }); } catch (e) {} return r; };

  const mortgage = () => (G.s.loans || []).find(l => l.type === 'mortgage');
  const saleValue = k => Math.round(R[k].price * SALE_PCT);

  // ---------- Покупка
  const own = (k, how) => {
    const s = G.s, r = R[k];
    s.own.flat = 1; s.flags.realty = k; s.flags.housing = 'own'; apply();
    G.fx({ mood: 10 + r.mood * 2, cool: 4 + r.cool * 2 });
    G.achieve('flat', r.n + (how === 'mortgage' ? ' (в ипотеку)' : ''));
    if (G.note) G.note('Купил жильё: ' + r.n);
  };
  const buyCash = k => {
    const s = G.s, r = R[k]; if (s.money < r.price || (s.own && s.own.flat)) return;
    G.addMoney(-r.price); s.stats.spent = (s.stats.spent || 0) + r.price; own(k, 'cash');
    G.toast('Куплено за наличные: ' + r.n + '. Ты переехал(а).', 'good');
  };
  const mortgageOffer = (k, term) => {
    const s = G.s, r = R[k], I = G.loanInfo, down = Math.round(r.price * r.down), loan = r.price - down;
    const pay = I.annuity(loan, I.MORT.rate, term), tot = pay * term, lim = I.limitCheck(pay, I.LIMIT_MORT);
    const why = (s.own && s.own.flat) ? 'Сначала продай текущее жильё' : s.car.rank < 1 ? 'Стажёрам ипотеку не дают' : s.money < down ? 'Нужен первый взнос ' + rub(down) : !lim.ok ? 'Платёж превысит ' + Math.round(I.LIMIT_MORT * 100) + '% дохода' : I.lateAny() ? 'Есть серьёзная просрочка' : null;
    G.modal({
      title: 'Ипотека: ' + r.n,
      text: 'Цена: <b>' + rub(r.price) + '</b><br>Первый взнос ' + Math.round(r.down * 100) + '%: <b>' + rub(down) + '</b> (платится сразу)<br>Кредит: <b>' + rub(loan) + '</b> под <b>' + Math.round(I.MORT.rate * 100) + '%</b> на <b>' + term / 12 + ' лет</b><br>Платёж: <b>' + rub(pay) + ' в месяц</b> (в расчётный день)<br>Всего отдашь банку: <b>' + rub(tot) + '</b>, переплата <b>' + rub(tot - loan) + '</b><br><i>Платежи по всем кредитам: ' + rub(lim.used + pay) + ' из допустимых ' + rub(lim.cap) + ' (' + Math.round(I.LIMIT_MORT * 100) + '% дохода). Не платишь — пени и коллекторы, а квартиру банк может отобрать в счёт долга. Выплатишь — квартира твоя без долгов.</i>',
      opts: [
        { t: '✍ Оформить ипотеку', dis: why, fn: () => {
          s.money -= down; s.stats.spent = (s.stats.spent || 0) + down;
          I.sign({ v: 2, type: 'mortgage', principal: loan, left: loan, rate: I.MORT.rate, pay, term, late: 0, hist: [], start: s.t.day, paidTotal: 0, intTotal: 0, realty: k }, () => own(k, 'mortgage'));
          G.toast(r.n + ': ипотека оформлена, платёж ' + rub(pay) + '/мес.', 'warn');
        } },
        { t: 'Назад', fn: () => mortgageTerms(k) }
      ]
    });
  };
  const mortgageTerms = k => {
    const r = R[k], I = G.loanInfo, loan = r.price - Math.round(r.price * r.down);
    G.modal({
      title: 'Срок ипотеки', text: r.n + ': кредит ' + rub(loan) + '. Чем дольше срок, тем меньше платёж и больше переплата.',
      opts: TERMS.map(t => { const p = I.annuity(loan, I.MORT.rate, t); return { t: t / 12 + ' лет — ' + rub(p) + '/мес, переплата ' + rub(p * t - loan), fn: () => mortgageOffer(k, t) }; }).concat([{ t: 'Назад', fn: () => realtyCard(k) }]),
      wide: true
    });
  };
  const realtyCard = k => {
    const s = G.s, r = R[k], I = G.loanInfo, down = Math.round(r.price * r.down), has = !!(s.own && s.own.flat);
    const month = r.rent + r.comms + r.transit;
    G.modal({
      title: r.i + ' ' + r.n,
      text: '<i>' + r.d + '</i><br><br>Тип: <b>' + r.kind + '</b>, ' + r.rooms + '<br>Цена: <b>' + rub(r.price) + '</b><br>Расходы в месяц: коммуналка ' + rub(r.rent) + ', связь ' + rub(r.comms) + ', дорога ' + rub(r.transit) + ' — <b>' + rub(month) + '</b><br>Отдых за ночь: энергия +' + r.energy + ', настроение +' + r.mood + (r.health ? ', здоровье +' + r.health : '') + (r.cool ? '<br>Статус: +' + r.cool + ' в неделю' : '') + '<br>Первый взнос по ипотеке: ' + rub(down) + ' (' + Math.round(r.down * 100) + '%)',
      opts: [
        { t: '💵 Купить сразу — ' + rub(r.price), dis: has ? 'Сначала продай текущее жильё' : s.money < r.price ? 'Не хватает ' + rub(r.price - s.money) : null, fn: () => buyCash(k) },
        { t: '🏦 В ипотеку (взнос ' + rub(down) + ')', dis: has ? 'Сначала продай текущее жильё' : s.car.rank < 1 ? 'Стажёрам ипотеку не дают' : null, fn: () => mortgageTerms(k) },
        { t: 'Назад', fn: () => G.realtyMenu() }
      ]
    });
  };
  const sellCurrent = () => {
    const s = G.s, k = id(); if (!k) return;
    const m = mortgage(), debt = m ? m.left : 0, get = saleValue(k) - debt;
    if (get < 0) return;
    G.addMoney(get);
    if (m) s.loans.splice(s.loans.indexOf(m), 1);
    delete s.own.flat; delete s.flags.realty; if (s.flags.housing === 'own') s.flags.housing = 'dorm'; apply();
    G.toast('Жильё продано' + (debt ? ' (ипотека погашена из выручки)' : '') + '. На руки: ' + rub(get) + '. Ты вернулся(лась) в общагу.', 'good');
  };

  G.realtyMenu = function () {
    const s = G.s, k = id(), has = !!k, m = mortgage();
    const opts = Object.keys(R).map(x => { const r = R[x]; return { t: r.i + ' ' + r.n + ' (' + r.rooms + ') — ' + rub(r.price), dis: x === k ? 'Это твоё жильё' : null, fn: () => realtyCard(x) }; });
    if (has) { const get = saleValue(k) - (m ? m.left : 0); opts.push({ t: '🏷️ Продать текущее жильё (выручка ' + rub(Math.max(0, get)) + ')', dis: get < 0 ? 'Долг по ипотеке больше выручки' : null, fn: () => G.modal({ title: 'Продажа жилья', text: R[k].n + ': покупатель даёт ' + rub(saleValue(k)) + ' (90% цены).' + (m ? '<br>Остаток ипотеки ' + rub(m.left) + ' будет погашен из выручки.' : '') + '<br>На руки: <b>' + rub(get) + '</b>. После продажи ты вернёшься в общагу.', opts: [{ t: 'Продать', fn: sellCurrent }, { t: 'Назад', fn: () => G.realtyMenu() }] }) }); }
    opts.push({ t: 'Закрыть', fn: () => {} });
    G.modal({
      title: '🏘️ НЕДВИЖИМОСТЬ',
      text: 'Деньги: <b>' + rub(s.money) + '</b>.' + (has ? '<br>Сейчас у тебя: <b>' + R[k].n + '</b>.' : '<br>Своего жилья нет.') + '<br><i>Можно купить сразу или взять ипотеку в «Рубль-Банке» (платёж не больше 55% дохода). Свой дом — это коммуналка вместо аренды и лучший отдых.</i>',
      opts, wide: true
    });
  };
})();
