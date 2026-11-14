/* ===== Предприятие: покупатели, контракты, отгрузки, спотовый рынок ===== */
(function () {
  'use strict';
  const G = window.G, CO = G.co, C = G.clamp;
  const SL = (CO.sales = {});
  SL.BASE_PRICE = 69000;

  SL.CUST = {
    build: { n: 'Строительная компания', i: '🏗', terms: 21, adv: 0.10, pen: 0.0008, price: 1.00, vol: [150, 700], names: ['«Бетон и надежда»', '«СтройУрал»', '«Монолит-Е»', 'ООО «Фундамент-Плюс»'] },
    mach: { n: 'Машиностроительное предприятие', i: '🔧', terms: 14, adv: 0.15, pen: 0.0010, price: 1.06, vol: [100, 450], names: ['«Тяжмаш-Едрёнск»', '«Редуктор»', 'з-д «Красный токарь»'] },
    state: { n: 'Государственный заказчик', i: '🏛', terms: 45, adv: 0.05, pen: 0.0015, price: 1.04, vol: [300, 1200], names: ['Минпромторг (региональное управление)', 'ФГУП «Оборонснаб»', 'Дирекция госзакупок'] },
    region: { n: 'Региональное предприятие', i: '🏭', terms: 10, adv: 0.20, pen: 0.0007, price: 0.98, vol: [80, 350], names: ['«Трубопрокат»', 'комбинат «Кирпичный»', 'АО «Уралкабель»'] },
    mid: { n: 'Частный посредник', i: '🧳', terms: 3, adv: 0.30, pen: 0.0005, price: 0.92, vol: [50, 260], names: ['ИП Лысенко-Брокер', '«Металл-Экспресс-Ё»', 'Гоша «Оптом»'] }
  };
  SL.CID = Object.keys(SL.CUST);
  SL.cust = id => SL.CUST[id] || SL.CUST.mid;

  SL.init = function (c, df) {
    SL.CID.forEach(id => { c.cust[id] = { rel: 50 }; });
    c.spot = { idx: 1, price: SL.BASE_PRICE, demand: 260, on: true, hold: 0 };
    c.fg = { t: 160, bad: 4 };
    c.cn = 1; c.offers = []; c.contracts = [];
    // унаследованный контракт: даёт стартовую загрузку, чтобы первая неделя не была «в никуда»
    const vol = 520, price = Math.round(SL.BASE_PRICE * 1.02);
    c.contracts.push({ n: c.cn++, cust: 'mach', name: 'з-д «Красный токарь»', vol: vol, price: price, adv: 0.10, advPaid: Math.round(vol * price * 0.10), delivered: 0, due: CO.today() + 24, pen: 0.0010, terms: 14, status: 'active', start: CO.today(), late: 0, returned: 0 });
    SL.genOffers(c, 3);
  };

  // ---------- Предложения
  SL.genOffers = function (c, n) {
    const sm = CO.staff.salMul(c);
    for (let k = 0; k < n && c.offers.length < 5; k++) {
      const id = G.wpick(SL.CID, x => 1 + (c.cust[x].rel - 40) / 60) || 'mid', ct = SL.cust(id);
      const vol = Math.round(G.ri(ct.vol[0], ct.vol[1]) / 10) * 10;
      const nominal = Math.max(40, CO.prod.nominalFin() * 0.88);
      const days = Math.ceil(vol / nominal * 7 / 5) + G.ri(5, 18);
      const price = Math.round(c.spot.price * ct.price * (0.95 + G.rnd() * 0.14) * sm.price * (0.97 + c.cust[id].rel / 100 * 0.06) / 100) * 100;
      c.offers.push({ id: c.uid++, cust: id, name: G.pick(ct.names), vol: vol, price: price, adv: ct.adv, due: CO.today() + days, days: days, pen: ct.pen, terms: ct.terms, exp: CO.today() + 10, neg: 0, advAsk: 0, speed: 'norm' });
    }
  };
  SL.load = function (c, o) { // доля номинальных мощностей, которую займёт контракт на его срок
    const wd = Math.max(1, Math.ceil((o.due - CO.today()) * 5 / 7)), need = o.vol / wd, cap = Math.max(10, CO.prod.capNow(c, 'mech'));
    return need / cap;
  };
  SL.offer = (c, id) => c.offers.find(o => o.id === id);
  SL.negotiate = function (id) {
    const c = CO.get(); if (!c) return; const o = SL.offer(c, id); if (!o || o.neg) return;
    o.neg = 1; const p = 45 + c.cust[o.cust].rel / 5 + CO.staff.mod(c, 'sal') * 20;
    if (G.chance(p)) { o.price = Math.round(o.price * 1.06 / 100) * 100; CO.note(c, 'Торг удался: цена по заказу ' + o.name + ' выросла до ' + CO.m(o.price) + '/т.', 'good'); }
    else if (G.chance(35)) { c.offers.splice(c.offers.indexOf(o), 1); c.cust[o.cust].rel = C(c.cust[o.cust].rel - 4); CO.note(c, o.name + ' обиделся на торг и ушёл к конкурентам.', 'bad', true); }
    else CO.note(c, 'Торг не удался: ' + o.name + ' остался при своей цене.', 'warn');
  };
  SL.askAdvance = function (id) {
    const c = CO.get(); if (!c) return; const o = SL.offer(c, id); if (!o || o.advAsk) return;
    o.advAsk = 1;
    if (G.chance(55 + c.cust[o.cust].rel / 6)) { o.adv = 0.30; o.price = Math.round(o.price * 0.98 / 100) * 100; CO.note(c, o.name + ' согласен на аванс 30% (цена −2%).', 'good'); }
    else CO.note(c, o.name + ' отказал в авансе: «Мы платим по факту. Как принято у приличных людей».', 'warn');
  };
  SL.setSpeed = function (id, sp) {
    const c = CO.get(); if (!c) return; const o = SL.offer(c, id); if (!o || o.speed === sp) return;
    // пересчёт от базовых условий
    const base = { fast: 0.75, norm: 1, slow: 1.3 }, pm = { fast: 1.07, norm: 1, slow: 0.96 }, pn = { fast: 1.5, norm: 1, slow: 1 };
    o.price = Math.round(o.price / pm[o.speed] * pm[sp] / 100) * 100; o.pen = o.pen / pn[o.speed] * pn[sp];
    const baseDays = o.days / base[o.speed]; o.days = Math.max(5, Math.round(baseDays * base[sp]));
    o.due = CO.today() + o.days; o.speed = sp;
  };
  SL.accept = function (id) {
    const c = CO.get(); if (!c) return; const o = SL.offer(c, id); if (!o) return;
    const active = c.contracts.filter(k => k.status === 'active').length;
    if (active >= 6) { G.toast('Одновременно — не более шести контрактов.', 'warn'); return; }
    c.offers.splice(c.offers.indexOf(o), 1);
    const advAmt = Math.round(o.vol * o.price * o.adv);
    const k = { n: c.cn++, cust: o.cust, name: o.name, vol: o.vol, price: o.price, adv: o.adv, advPaid: advAmt, delivered: 0, due: o.due, pen: o.pen, terms: o.terms, status: 'active', start: CO.today(), late: 0, returned: 0 };
    c.contracts.push(k);
    if (advAmt > 0) CO.cashIn(c, advAmt, 'adv');
    CO.note(c, 'Заключён контракт №' + k.n + ': ' + o.name + ', ' + CO.t(o.vol) + ' по ' + CO.m(o.price) + '/т, срок до ' + CO.dayStr(o.due) + (advAmt ? ', аванс ' + CO.m(advAmt) : ''), 'good', true);
  };
  SL.decline = function (id) { const c = CO.get(); if (!c) return; const o = SL.offer(c, id); if (!o) return; c.offers.splice(c.offers.indexOf(o), 1); c.cust[o.cust].rel = C(c.cust[o.cust].rel - 1); CO.note(c, 'Заказ ' + o.name + ' отклонён.'); };

  // ---------- Сутки: поступление денег, отгрузки, штрафы
  SL.cashDaily = function (c, d) {
    c.recv = c.recv.filter(r => { if (r.day <= d) { CO.cashIn(c, r.amt, r.cat || 'recv'); return false; } return true; });
    c.deposits.forEach(x => { /* проценты начисляются при закрытии недели */ });
    c.offers = c.offers.filter(o => o.exp >= d);
  };
  SL.ship = function (c, d) {
    const wd = d % 7; if (wd >= 5) return;
    let logistics = 130;
    const list = c.contracts.filter(k => k.status === 'active').sort((a, b) => a.due - b.due);
    list.forEach(k => {
      if (c.fg.t < 1 || logistics < 1) return;
      const rest = k.vol - k.delivered; if (rest <= 0.001) return;
      const q = Math.min(rest, c.fg.t, logistics); if (q < 1 && rest > 1) return;
      const share = c.fg.t > 0 ? C(c.fg.bad / c.fg.t, 0, 1) : 0, badq = q * share;
      c.fg.t -= q; c.fg.bad = Math.max(0, c.fg.bad - badq); logistics -= q;
      let ok = q;
      if (share > 0.05) { // покупатель выявил брак и вернул скрытый брак
        ok = q - badq; k.returned += badq; c.cust[k.cust].rel = C(c.cust[k.cust].rel - Math.min(9, share * 60)); c.rep = C(c.rep - 1.2); c.stats.brak += badq;
        CO.note(c, 'Возврат: ' + SL.cust(k.cust).i + ' ' + k.name + ' вернул ' + CO.t(badq) + ' брака (контракт №' + k.n + '). ОТК кивает: «Мы говорили».', 'bad');
      }
      k.delivered += ok;
      const revenue = ok * k.price, advShare = k.advPaid * (ok / k.vol), due = Math.max(0, Math.round(revenue - advShare));
      c.wk.rev += revenue; c.wk.shipped += ok; c.stats.sold += ok;
      if (due > 0) c.recv.push({ day: d + k.terms, amt: due, cat: 'recv', k: k.n });
      if (k.delivered >= k.vol - 0.5) {
        k.status = 'done'; k.done = d; c.stats.done++;
        const intime = d <= k.due;
        c.cust[k.cust].rel = C(c.cust[k.cust].rel + (intime ? 6 : 1)); c.rep = C(c.rep + (intime ? 1.5 : 0.3));
        CO.note(c, 'Контракт №' + k.n + ' (' + k.name + ') выполнен' + (intime ? ' в срок' : ' с опозданием') + '. Остаток оплаты придёт через ' + k.terms + ' дн.', intime ? 'good' : 'warn', true);
      }
    });
  };
  SL.lateDaily = function (c, d) { // штрафы и срыв контрактов — раз в сутки, после отгрузки
    c.contracts.forEach(k => {
      if (k.status !== 'active') return;
      if (d > k.due) {
        const rest = (k.vol - k.delivered) * k.price, pen = Math.round(rest * k.pen);
        if (k.late === 0) { c.stats.late++; c.cust[k.cust].rel = C(c.cust[k.cust].rel - 6); c.rep = C(c.rep - 2.5); CO.note(c, 'Контракт №' + k.n + ' (' + k.name + ') просрочен. Начинают капать штрафы.', 'bad', true); }
        k.late++;
        if (pen > 0) CO.expense(c, pen, 'penalty');
        if (k.late >= 14) { // срыв
          const adv = Math.round(k.advPaid * (1 - k.delivered / k.vol)), fix = Math.round(rest * 0.08);
          k.status = 'failed'; c.cust[k.cust].rel = C(c.cust[k.cust].rel - 25); c.rep = C(c.rep - 8); c.board.trust = C(c.board.trust - 3);
          if (adv > 0) CO.cashOut(c, adv, 'advBack'); CO.expense(c, fix, 'penalty');
          CO.note(c, 'Контракт №' + k.n + ' сорван: возврат аванса ' + CO.m(adv) + ' и штраф ' + CO.m(fix) + '. Репутация предприятия пострадала.', 'bad', true);
        }
      }
    });
    c.contracts = c.contracts.filter(k => k.status === 'active' || (k.done || k.due) > d - 30);
  };

  // ---------- Неделя: рынок, спот, новые предложения
  SL.weekly = function (c) {
    const sp = c.spot;
    sp.idx = C(sp.idx * (1 + (G.rnd() - 0.5) * 0.09) + (1 - sp.idx) * 0.12, 0.78, 1.3);
    sp.price = Math.round(SL.BASE_PRICE * sp.idx / 100) * 100;
    sp.demand = Math.round(260 * (1.35 - 0.35 * sp.idx) * (0.75 + G.rnd() * 0.5));
    // спотовая продажа свободного остатка
    if (sp.on) {
      const reserve = c.contracts.filter(k => k.status === 'active' && k.due <= CO.today() + 14).reduce((a, k) => a + (k.vol - k.delivered), 0);
      const keep = reserve + (sp.hold || 0);
      const free = Math.max(0, c.fg.t - keep), q = Math.min(free, sp.demand);
      if (q >= 5) {
        const share = c.fg.t > 0 ? C(c.fg.bad / c.fg.t, 0, 1) : 0, pe = sp.price * (1 - 0.0003 * q) * (1 - share * 1.5);
        const rev = Math.round(q * pe);
        c.fg.t -= q; c.fg.bad = Math.max(0, c.fg.bad - q * share);
        c.wk.rev += rev; c.wk.spotT += q; c.wk.shipped += q; c.stats.sold += q;
        c.recv.push({ day: CO.today() + 3, amt: rev, cat: 'spot' });
        CO.note(c, 'Продано на свободном рынке: ' + CO.t(q) + ' по ' + CO.m(Math.round(pe)) + '/т.');
      }
    }
    // новые предложения
    const sm = CO.staff.salMul(c);
    SL.genOffers(c, G.ri(1, 2) + sm.extra);
  };

  SL.setSpot = function (on) { const c = CO.get(); if (!c) return; c.spot.on = !!on; CO.note(c, on ? 'Продажи на свободном рынке разрешены.' : 'Продажи на свободном рынке остановлены: продукция копится на складе.'); };
  SL.setHold = function (t) { const c = CO.get(); if (!c) return; c.spot.hold = Math.max(0, t); CO.note(c, 'Неприкосновенный запас готовой продукции: ' + CO.t(c.spot.hold)); };
  SL.receivable = c => c.recv.reduce((a, r) => a + r.amt, 0);
})();
