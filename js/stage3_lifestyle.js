/* ===== Этап 3: образ жизни (необязательные расходы высоких рангов) =====
   По умолчанию «Скромный» — 0 ₽, ничего не меняется (старые сохранения не затронуты).
   Остальные уровни — выбор игрока: списываются в расчётный день вместе с жильём, дают бонусы к отдыху и статусу.
   Доступны по рангу, чтобы рост дохода открывал новые возможности, а не просто копил деньги. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const C = G.clamp;

  const T = G.LIFESTYLE = {
    modest: { n: 'Скромный', i: '🥔', cost: 0, rank: 0, energy: 0, mood: 0, health: 0, cool: 0, d: 'Как все: столовая, телевизор, выходные дома.' },
    comfort: { n: 'Комфортный', i: '🛋️', cost: 8000, rank: 3, energy: 1, mood: 1, health: 0.5, cool: 0, d: 'Кафе по выходным, нормальные продукты, спортзал.' },
    repr: { n: 'Представительский', i: '🥂', cost: 30000, rank: 7, energy: 2, mood: 2, health: 1, cool: 1, d: 'Рестораны, хорошая одежда, деловые обеды. Тебя замечают.' },
    elite: { n: 'Элитный', i: '👑', cost: 90000, rank: 9, energy: 3, mood: 3, health: 1, cool: 2, d: 'Клубы, личный водитель, абонемент в закрытый клуб директоров.' }
  };
  const cur = () => { const s = G.s; const k = s && s.flags && s.flags.lifestyle; return T[k] ? k : 'modest'; };
  G.lifestyle = cur;

  // добавляем расход к постоянным
  const _fc = G.fixedCosts;
  G.fixedCosts = function () {
    const r = _fc ? _fc.apply(this, arguments) : { housing: 3500, comms: 500, transit: 1500, total: 5500, name: 'Общага', label: 'Общага, связь, проезд' };
    const t = T[cur()];
    if (!t.cost) return r;
    return Object.assign({}, r, { life: t.cost, total: r.total + t.cost, label: r.label + ', образ жизни' });
  };

  const choose = (k) => { G.s.flags.lifestyle = k; G.toast('Образ жизни: ' + T[k].n + '.', 'good'); };

  const menu = () => {
    const s = G.s, now = cur(), c = s.car;
    const opts = Object.keys(T).map(k => {
      const t = T[k];
      const why = k === now ? 'Сейчас так' : c.rank < t.rank ? 'Нужен ранг ' + t.rank + '+' : null;
      return { t: t.i + ' ' + t.n + ' — ' + (t.cost ? G.rub(t.cost) + '/мес' : 'бесплатно'), dis: why, fn: () => choose(k) };
    });
    opts.push({ t: 'Закрыть', fn: () => {} });
    const t = T[now];
    G.modal({
      title: '🥂 ОБРАЗ ЖИЗНИ',
      text: 'Сейчас: <b>' + t.n + '</b> (' + (t.cost ? G.rub(t.cost) + ' в месяц' : 'бесплатно') + ').<br><i>Это твой выбор: дороже — лучше отдых и статус, дешевле — больше остаётся на цели. Менять можно в любой момент, платёж списывается в расчётный день.</i>',
      opts, wide: true
    });
  };

  G.A('lifestyle', { ph: ['free'], loc: 'home', g: 'Дом', n: 'Образ жизни', i: '🥂', menu: true, noEvent: true, fn: () => { menu(); return 'custom'; } });

  // бонусы за ночь
  const _sleep = G.sleep;
  G.sleep = function () {
    const r = _sleep.apply(this, arguments);
    try {
      const s = G.s, t = T[cur()];
      if (t.cost && s && s.st && !s.end) { s.st.energy = C(s.st.energy + t.energy); s.st.mood = C(s.st.mood + t.mood); s.st.health = C(s.st.health + t.health); }
    } catch (e) {}
    return r;
  };
  // еженедельный статус
  const _wt = G.weeklyTick;
  G.weeklyTick = function () {
    const r = _wt.apply(this, arguments);
    try { const t = T[cur()]; if (t.cool && G.s && !G.s.end) G.fx({ cool: t.cool }); } catch (e) {}
    return r;
  };
})();
