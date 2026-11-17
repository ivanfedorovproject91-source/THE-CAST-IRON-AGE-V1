/* ===== Этап 3: жильё как выбор игрока =====
   По умолчанию все живут в общаге (3 500 + связь 500 + проезд 1 500 = 5 500 ₽/мес, как раньше).
   Съём комнаты (ранг 4+) и квартира (ранг 7+) — по желанию: дороже, но лучше отдых.
   Своя квартира (купленная в ипотеку) даёт вариант «жить у себя» с коммуналкой.
   Старые сохранения: флага нет — значит общага, расходы не меняются. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const C = G.clamp;

  const H = G.HOUSING = {
    dorm: { n: 'Общага', i: '🛏️', rent: 3500, comms: 500, transit: 1500, rank: 0, energy: 0, mood: 0, health: 0, d: 'Комната №14, баба Нюра за стенкой. Дёшево и шумно.' },
    room: { n: 'Съёмная комната', i: '🚪', rent: 9000, comms: 1000, transit: 1500, rank: 4, energy: 4, mood: 1, health: 0, d: 'Своя дверь и тишина по ночам. Залог — один месяц аренды.' },
    flat: { n: 'Съёмная квартира', i: '🏢', rent: 20000, comms: 1000, transit: 1500, rank: 7, energy: 8, mood: 2, health: 0.5, d: 'Кухня, душ, вид на трубы. Залог — один месяц аренды.' },
    own: { n: 'Своя квартира', i: '🔑', rent: 2500, comms: 1000, transit: 1500, rank: 0, energy: 8, mood: 2, health: 0.5, d: 'Квартира в центре, коммуналка вместо аренды.' }
  };

  const cur = () => { const s = G.s, f = s && s.flags; const k = f && f.housing; if (k === 'own' && !(s.own && s.own.flat)) return 'dorm'; return H[k] ? k : 'dorm'; };
  G.housing = cur;

  // постоянные ежемесячные расходы (жильё + связь + проезд)
  G.fixedCosts = function () {
    const h = H[cur()];
    return { housing: h.rent, comms: h.comms, transit: h.transit, total: h.rent + h.comms + h.transit, name: h.n };
  };

  const move = (k) => {
    const s = G.s, h = H[k];
    const deposit = (k === 'room' || k === 'flat') ? h.rent : 0;
    if (deposit) G.addMoney(-deposit);
    s.flags.housing = k;
    G.toast('Новое жильё: ' + h.n + '.', 'good');
    if (G.note) G.note('Переезд: ' + h.n);
  };

  const menu = () => {
    const s = G.s, now = cur(), c = s.car;
    const opts = Object.keys(H).map(k => {
      const h = H[k], total = h.rent + h.comms + h.transit;
      const deposit = (k === 'room' || k === 'flat') ? h.rent : 0;
      let why = null;
      if (k === now) why = 'Сейчас здесь';
      else if (k === 'own' && !(s.own && s.own.flat)) why = 'Нет своей квартиры';
      else if (c.rank < h.rank) why = 'Нужен ранг ' + h.rank + '+';
      else if (deposit && s.money < deposit) why = 'Нужен залог ' + G.rub(deposit);
      return { t: h.i + ' ' + h.n + ' — ' + G.rub(total) + '/мес' + (deposit ? ' (залог ' + G.rub(deposit) + ')' : ''), dis: why, fn: () => move(k) };
    });
    opts.push({ t: 'Закрыть', fn: () => {} });
    const h = H[now];
    G.modal({
      title: '🏠 ЖИЛЬЁ',
      text: 'Сейчас: <b>' + h.n + '</b>. Расходы в месяц: жильё ' + G.rub(h.rent) + ', связь ' + G.rub(h.comms) + ', проезд ' + G.rub(h.transit) + ' — итого <b>' + G.rub(h.rent + h.comms + h.transit) + '</b>.<br><i>Жильё лучше — отдых лучше, но платить каждый месяц. Вернуться в общагу можно в любой момент (залог не возвращается).</i>',
      opts
    });
  };

  G.A('housing', { ph: ['free'], loc: 'home', g: 'Дом', n: 'Жильё: где жить', i: '🏠', menu: true, noEvent: true, fn: () => { menu(); return 'custom'; } });

  // бонус к отдыху от жилья
  const _sleep = G.sleep;
  G.sleep = function () {
    const r = _sleep.apply(this, arguments);
    try {
      const s = G.s, h = H[cur()];
      if (h && (h.energy || h.mood || h.health) && s && s.st && !s.end) {
        s.st.energy = C(s.st.energy + h.energy); s.st.mood = C(s.st.mood + h.mood); s.st.health = C(s.st.health + h.health);
      }
    } catch (e) {}
    return r;
  };
})();
