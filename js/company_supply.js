/* ===== Предприятие: снабжение, склады, поставщики ===== */
(function () {
  'use strict';
  const G = window.G, CO = G.co, C = G.clamp;
  const S = (CO.supply = {});

  // perMelt — расход на тонну металла; perFin — на тонну готовой продукции; price — рыночная цена за единицу
  S.RES = {
    scrap: { n: 'Металлолом и сырьё', i: '♻️', unit: 'т', price: 22000, perMelt: 0.55, tons: true, sup: { rel: 'ООО «Лом-Гарант»', cheap: 'ИП Ржавый и сыновья' } },
    ore: { n: 'Железорудное сырьё', i: '⛏️', unit: 'т', price: 9000, perMelt: 0.45, tons: true, sup: { rel: 'Рудник «Красная гора»', cheap: 'ЧП «Руда-Транзит»' } },
    coke: { n: 'Кокс и топливо', i: '🪨', unit: 'т', price: 18000, perMelt: 0.35, tons: true, sup: { rel: 'Коксохим-Урал', cheap: 'ООО «Уголёк плюс»' } },
    ferro: { n: 'Ферросплавы', i: '🔩', unit: 'т', price: 120000, perMelt: 0.03, tons: true, sup: { rel: 'Ферросплав-Холдинг', cheap: 'ИП Сплавов А. А.' } },
    cons: { n: 'Расходные материалы', i: '🧰', unit: 'т', price: 40000, perFin: 0.05, tons: false, sup: { rel: 'Индустриал-Снаб', cheap: 'Оптовик «Всё для цеха»' } },
    parts: { n: 'Запасные части', i: '⚙️', unit: 'компл.', price: 90000, tons: false, sup: { rel: 'Запчасть-Сервис', cheap: 'Склад «У Михалыча»' } },
    power: { n: 'Электроэнергия', i: '⚡', unit: 'МВт·ч', price: 5000, perMelt: 0.8, tons: false, noStock: true, sup: { rel: 'Облэнерго', cheap: 'Энергоальянс-Транзит' } }
  };
  S.list = ['scrap', 'ore', 'coke', 'ferro', 'cons', 'parts', 'power'];
  S.RAW = ['scrap', 'ore', 'coke', 'ferro'];
  // условия поставщиков
  S.SUP = {
    rel: { n: 'Надёжный', mul: 1.0, lead: 3, delayP: 0.06, delay: [2, 3], qual: 1.0, badP: 0, d: 'Цена рыночная, срок 3 дня, срывы редки.' },
    cheap: { n: 'Дешёвый', mul: 0.88, lead: 5, delayP: 0.30, delay: [3, 7], qual: 0.92, badP: 0.25, d: 'Цена −12%, но срок 5 дней, часто задерживает, сырьё хуже.' }
  };
  S.MODES = {
    std: { n: 'Обычная партия', weeks: 1.5, mul: 1.0, lead: 0, d: 'запас на 1,5 недели' },
    big: { n: 'Крупная партия', weeks: 4, mul: 0.94, lead: 1, d: 'запас на 4 недели, скидка 6%' },
    urgent: { n: 'Срочная закупка', weeks: 0.7, mul: 1.30, lead: -99, d: 'доставка за 1 день, наценка 30%' }
  };

  S.init = function (c, df) {
    S.list.forEach(id => {
      const r = S.RES[id];
      c.inv[id] = { id: id, q: 0, min: 0, sup: 'rel', auto: false, mkt: 1, avg: r.price, qual: 1, price: r.price, used: 0 };
    });
    // стартовые запасы — по неделям потребления
    S.list.forEach(id => { if (!S.RES[id].noStock) c.inv[id].q = Math.round(S.weeklyUse(c, id) * (df.stockWeeks + (id === 'parts' ? 0.5 : 0))); });
    S.list.forEach(id => { c.inv[id].min = Math.round(S.weeklyUse(c, id) * 1.0); });
    c.inv.power.q = 0; c.inv.power.min = 0;
    ['scrap', 'ore', 'coke', 'ferro', 'cons', 'parts'].forEach(id => { if (c.inv[id]) c.inv[id].auto = true; }); // договоры достались от прежнего директора
    c.orders = [];
  };

  // ---------- Потребление
  S.meltWeek = c => { const F = Math.max(1, CO.prod.planFin(c)) * 5; return F / (CO.Y1 * CO.Y2); };
  S.weeklyUse = function (c, id) {
    const r = S.RES[id];
    if (r.perMelt) return S.meltWeek(c) * r.perMelt;
    if (id === 'cons') return Math.max(1, CO.prod.planFin(c)) * 5 * r.perFin;
    if (id === 'parts') { // обслуживание всех подразделений
      let k = 0; CO.DEPTS.forEach(d => { const lvl = c.depts[d.id].maint; k += (d.kind === 'prod' ? [0, 0.25, 0.5] : [0, 0.05, 0.1])[lvl] * 5; });
      return Math.max(3, k + 1.5);
    }
    return 0;
  };
  S.dailyUse = (c, id) => S.weeklyUse(c, id) / 5;
  S.price = function (c, id, supKey, mode) {
    const r = S.RES[id], i = c.inv[id], sp = S.SUP[supKey || i.sup], md = S.MODES[mode || 'std'];
    return Math.round(r.price * i.mkt * sp.mul * md.mul * (i.auto ? 0.96 : 1));
  };
  S.varCost = function (c) { // переменные затраты на тонну готовой продукции
    const melt = 1 / (CO.Y1 * CO.Y2);
    let v = 0; S.RAW.forEach(id => { v += S.RES[id].price * c.inv[id].mkt * S.SUP[c.inv[id].sup].mul * S.RES[id].perMelt * melt; });
    v += S.RES.power.price * c.inv.power.mkt * S.SUP[c.inv.power.sup].mul * S.RES.power.perMelt * melt * c.mods.energy;
    v += S.RES.cons.price * S.RES.cons.perFin;
    return v;
  };
  S.maxMelt = function (c) { let m = 1e9; S.RAW.forEach(id => { m = Math.min(m, c.inv[id].q / S.RES[id].perMelt); }); return Math.max(0, m); };
  S.consume = function (c, id, qty) {
    const i = c.inv[id]; qty = Math.min(qty, i.q); if (qty <= 0) return 0; i.q -= qty; i.used += qty; return qty * i.avg;
  };
  S.consumeRaw = function (c, melt) {
    let cost = 0, qs = 0, qn = 0;
    S.RAW.forEach(id => { const i = c.inv[id], use = Math.min(i.q, melt * S.RES[id].perMelt); i.q -= use; i.used += use; cost += use * i.avg; qs += use * i.qual; qn += use; });
    return { cost: cost, q: qn > 0 ? qs / qn : 1 };
  };

  // ---------- Склад
  S.storageCap = c => Math.round((2800 + c.mods.storage) * (0.92 + 0.08 * c.depts.store.cond / 100));
  S.rawTons = c => S.RAW.reduce((a, id) => a + c.inv[id].q, 0);
  S.incomingTons = c => c.orders.reduce((a, o) => a + (S.RES[o.res].tons ? o.q : 0), 0);
  S.fgCap = c => Math.max(0, S.storageCap(c) - S.rawTons(c) - 0);
  S.room = c => Math.max(0, S.storageCap(c) - S.rawTons(c) - S.incomingTons(c) - c.fg.t);
  S.incoming = (c, id) => c.orders.filter(o => o.res === id).reduce((a, o) => a + o.q, 0);
  S.coverDays = function (c, id) { const u = S.dailyUse(c, id); return u > 0 ? c.inv[id].q / u : 99; };

  // ---------- Решения закупщика (директор)
  S.setSupplier = function (id, k) { const c = CO.get(); if (!c) return; c.inv[id].sup = k; CO.note(c, S.RES[id].n + ': поставщик — ' + S.RES[id].sup[k] + ' (' + S.SUP[k].n.toLowerCase() + ')'); };
  S.toggleContract = function (id) {
    const c = CO.get(); if (!c) return; const i = c.inv[id]; i.auto = !i.auto;
    CO.note(c, i.auto ? 'Заключён договор поставки: ' + S.RES[id].n + ' (−4% к цене, автозакупка до нормы)' : 'Договор поставки расторгнут: ' + S.RES[id].n, i.auto ? 'good' : '');
  };
  S.setReserve = function (id, weeks) { const c = CO.get(); if (!c) return; c.inv[id].min = Math.round(S.weeklyUse(c, id) * weeks); CO.note(c, S.RES[id].n + ': резерв ' + weeks + ' нед. (' + CO.t(c.inv[id].min) + ')'); };
  S.order = function (id, mode, silent) {
    const c = CO.get(); if (!c) return false;
    const r = S.RES[id], i = c.inv[id], md = S.MODES[mode], sp = S.SUP[i.sup];
    if (r.noStock) return false;
    let q = Math.max(1, Math.round(S.weeklyUse(c, id) * md.weeks));
    if (r.tons) { const room = S.room(c); if (room < q) { q = Math.floor(room); if (q < 5) { if (!silent) G.toast('Склад переполнен: заказывать некуда.', 'bad'); return false; } } }
    const price = S.price(c, id, i.sup, mode); let cost = Math.round(q * price);
    if (silent && c.treasury < cost && c.treasury > 0) { // автозакупка: берём сколько позволяет касса (не оставляя завод вовсе без этой позиции)
      const q2 = Math.floor(c.treasury * 0.7 / price); if (q2 >= Math.max(5, q * 0.25)) { q = q2; cost = Math.round(q * price); }
    }
    if (c.treasury < cost) { if (!silent) G.toast('Не хватает денег: заказ ' + CO.m(cost) + ', в кассе ' + CO.m(c.treasury) + '.', 'bad'); return false; }
    CO.cashOut(c, cost, 'buy');
    const sm = CO.staff.supMul(c);
    let lead = mode === 'urgent' ? 1 : sp.lead + md.lead, delayed = 0;
    if (mode !== 'urgent' && G.chance(sp.delayP * 100 * sm.delay)) { delayed = G.ri(sp.delay[0], sp.delay[1]); lead += delayed; }
    let qual = sp.qual; if (sp.badP && G.chance(sp.badP * 100)) qual -= 0.10;
    const o = { id: c.uid++, res: id, q: q, price: price, cost: cost, due: CO.today() + lead, qual: qual, sup: i.sup, delayed: delayed, urgent: mode === 'urgent' };
    c.orders.push(o);
    if (!silent) CO.note(c, 'Заказ: ' + r.n + ' ' + CO.t(q) + ' · ' + CO.m(cost) + ' · поставка ' + CO.dayStr(o.due) + (delayed ? ' (поставщик уже тянет время)' : ''), delayed ? 'warn' : '');
    if (delayed && r.tons && G.chance(70)) c.sched.push({ day: CO.today() + 1, kind: 'delay', res: id, order: o.id });
    return true;
  };
  S.cancelOrder = function (oid) { const c = CO.get(); if (!c) return; const i = c.orders.findIndex(o => o.id === oid); if (i < 0) return; const o = c.orders[i]; c.orders.splice(i, 1); const back = Math.round(o.cost * 0.85); CO.cashIn(c, back, 'buyBack'); CO.note(c, 'Заказ отменён: возвращено ' + CO.m(back) + ' (15% удержал поставщик).', 'warn'); };
  S.autoBuy = function (c) {
    S.list.slice().sort((a, b) => S.coverDays(c, a) - S.coverDays(c, b)).forEach(id => {
      const i = c.inv[id]; if (!i.auto || S.RES[id].noStock) return;
      const target = Math.max(i.min, S.weeklyUse(c, id) * 1.5), have = i.q + S.incoming(c, id);
      if (have < target) S.order(id, 'std', true);
    });
  };

  // ---------- Сутки: поставки
  S.daily = function (c, d) {
    const arrived = [];
    c.orders = c.orders.filter(o => { if (o.due <= d) { arrived.push(o); return false; } return true; });
    arrived.forEach(o => {
      const i = c.inv[o.res], nq = i.q + o.q;
      i.avg = nq > 0 ? (i.q * i.avg + o.q * o.price) / nq : o.price;
      i.qual = nq > 0 ? (i.q * i.qual + o.q * o.qual) / nq : o.qual;
      i.q = nq;
      if (o.qual < 0.9) CO.note(c, S.RES[o.res].n + ': пришла партия низкого качества (' + CO.t(o.q) + '). Брак вырастет.', 'warn');
    });
    // дешёвая электросеть иногда «моргает»
    if (c.inv.power.sup === 'cheap' && d % 7 < 5 && G.chance(1.2) && c.depts.smelt.down < 1) { c.depts.smelt.down = 1; CO.note(c, 'Дешёвые электрики «моргнули»: плавка стоит сутки.', 'warn'); }
  };

  // ---------- Неделя: рынок цен, автозакупки, усушка
  S.weekly = function (c) {
    S.list.forEach(id => { const i = c.inv[id]; i.mkt = C(i.mkt * (1 + (G.rnd() - 0.5) * 0.07) + (1 - i.mkt) * 0.15, 0.78, 1.45); });
    // потери на складе (усушка, «потерялось»)
    const x = c.depts.store, cov = x.staff / Math.max(1, CO.prod.need(c, 'store'));
    const loss = 0.002 * (1.8 - 0.8 * C(cov, 0, 1)) * (1.5 - 0.5 * x.cond / 100) * (CO.staff.supMul(c).theft);
    let lossCost = 0;
    S.RAW.forEach(id => { const i = c.inv[id], l = i.q * loss; i.q -= l; lossCost += l * i.avg; });
    if (lossCost > 1) { c.wk.exp.shrink = Math.round(lossCost); }
  };
})();
