/* ===== Халтура на дому: подработки вне завода =====
   Заказы бывают не всегда (кидается раз в день). Любая подработка отнимает энергию, настроение и сытость.
   Такси требует свою машину (бензин, износ и поломки считает cars.js) и смартфон с приложением. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const rub = n => G.rub(Math.round(n));
  const F = () => G.s.flags;

  // p — шанс, что заказы сегодня есть; pay — ₽ за час; fx — потери за каждый час работы
  const JOBS = {
    weld:    { i: '🔥', n: 'Сварить шов на заказ', p: 0.7, game: 'weld', d: 'Мини-игра. Платят по качеству шва.' },
    fix:     { i: '🔧', n: 'Починить технику соседям', p: 0.7, game: 'fix', d: 'Мини-игра: подбери инструмент к поломке.' },
    courier: { i: '🛵', n: 'Курьер: доставка заказов', p: 0.85, hours: [1, 2, 3], pay: [250, 420], fx: { energy: -7, mood: -2, satiety: -3 }, phone: 2, d: 'Бегаешь по адресам с приложением. Нужен смартфон.' },
    loader:  { i: '📦', n: 'Разгрузка фур на складе', p: 0.55, hours: [2, 3, 4], pay: [450, 700], fx: { energy: -12, mood: -3, satiety: -4, health: -1 }, d: 'Тяжело, зато платят сразу. Спина запомнит.' },
    tutor:   { i: '📚', n: 'Репетитор по черчению', p: 0.5, hours: [1, 2], pay: [500, 800], fx: { energy: -5, mood: -1, satiety: -2 }, know: 45, d: 'Студенты-технари. Нужны знания (45+).' },
    taxi:    { i: '🚕', n: 'Таксовать на своей машине', p: 1, hours: [1, 2, 3, 4, 5], pay: [500, 900], fx: { energy: -8, mood: -3, satiety: -3 }, car: true, phone: 2, d: 'Нужна своя машина и смартфон. Бензин и износ — за твой счёт.' }
  };
  G.SIDEJOBS = JOBS;

  // сегодняшние заказы: кидаем один раз в день и запоминаем (в сохранении)
  const roll = () => {
    const s = G.s, f = s.flags;
    if (!f.sideRoll || f.sideRoll.d !== s.t.day) { const a = {}; Object.keys(JOBS).forEach(k => { a[k] = G.chance(JOBS[k].p * 100); }); f.sideRoll = { d: s.t.day, a }; }
    return f.sideRoll.a;
  };

  const car = () => (G.cars && G.cars.owned && G.cars.owned()) ? G.cars.state() : null;
  const why = (k, h) => {
    const s = G.s, j = JOBS[k];
    if (!roll()[k]) return 'Сегодня заказов нет';
    if (j.car) {
      const c = car(); if (!c) return 'Нужна своя машина';
      if (c.broken >= s.t.day) return 'Машина в ремонте';
      if (c.fuel < G.cars.tripFuel(c) * (h || 1)) return 'Мало бензина в баке';
    }
    if (j.phone && (G.phoneTier ? G.phoneTier() : 0) < j.phone) return G.phoneTier && G.phoneTier() ? 'Нужен смартфон' : 'Нужен телефон (смартфон)';
    if (j.phone && G.phoneBattery && G.phoneBattery() <= 0) return 'Телефон разряжен';
    if (j.know && s.st.know < j.know) return 'Не хватает знаний (' + j.know + '+)';
    if (s.st.energy < 15) return 'Слишком устал(а)';
    if (h && s.t.hour + h > 26) return 'Слишком поздно';
    return null;
  };
  G.sideWhy = why;

  const payText = j => j.pay ? rub(j.pay[0]) + '–' + rub(j.pay[1]) + '/час' : 'по качеству';

  const run = (k, h) => {
    const s = G.s, j = JOBS[k]; let total = 0, hrs = 0, mood = 0, health = 0, fine = 0; const notes = []; const c = j.car ? car() : null; const forklift = k === 'loader' && G.hasCert && G.hasCert('pogr');
    if (forklift) notes.push('Работал на погрузчике (права есть): платят больше, устаёшь меньше.');
    for (let i = 0; i < h; i++) {
      let rate = G.ri(j.pay[0], j.pay[1]);
      if (k === 'taxi') {
        rate = Math.min(1000, rate + Math.round(G.cars.CAT[c.key].v * 30));
        if (G.chance(10)) { rate = Math.round(rate * 0.6); notes.push('Пробки: час отстоял, заработал мало.'); }
        else if (G.chance(8)) { rate = 0; notes.push('Пассажир выскочил без оплаты.'); }
        else if (G.chance(7)) { fine += G.ri(500, 1500); notes.push('Остановил патруль ГИБДД: штраф.'); }
      } else if (k === 'courier') {
        if (G.chance(12)) { rate = Math.round(rate * 0.8); mood -= 3; notes.push('Ливень: промок до нитки.'); }
        else if (G.chance(6)) { rate = 0; notes.push('Клиент не вышел за заказом.'); }
      } else if (k === 'loader') {
        if (forklift) rate = Math.round(rate * 1.5);
        if (G.chance(10)) { health -= 4; notes.push('Потянул спину.'); }
      } else if (k === 'tutor') {
        if (G.chance(15)) { rate = Math.round(rate * 0.5); notes.push('Ученик не пришёл, оплатили полчаса.'); }
      }
      total += rate; hrs++;
      if (k === 'taxi') { const r = G.cars.trip(c); if (r.broke) { notes.push('Машина сломалась по дороге. Эвакуатор: ' + rub(r.cost) + '.'); break; } }
    }
    const fx = { money: total - fine, mood: mood, health: health };
    Object.keys(j.fx).forEach(x => { fx[x] = (fx[x] || 0) + Math.round(j.fx[x] * hrs * (forklift && x !== 'satiety' ? 0.7 : 1)); });
    G.fx(fx);
    s.stats.sideJobs = (s.stats.sideJobs || 0) + 1; s.day.sideDone = 1;
    let fuel = ''; if (c) fuel = '<br>Бензин в баке: ' + Math.round(c.fuel * 10) / 10 + ' л.';
    G.info(j.i + ' ' + j.n, 'Отработано часов: <b>' + hrs + '</b>. Заработано: <b>' + rub(total) + '</b>' + (fine ? ', штраф ' + rub(fine) : '') + '.<br><i>Усталость: энергия, настроение и сытость просели.</i>' + (notes.length ? '<br>' + notes.join('<br>') : '') + fuel);
    G.spend(hrs);
  };

  const hoursMenu = k => {
    const j = JOBS[k];
    G.modal({
      title: j.i + ' ' + j.n,
      text: j.d + '<br>Оплата: <b>' + payText(j) + '</b>. За каждый час: энергия ' + j.fx.energy + ', настроение ' + (j.fx.mood || 0) + ', сытость ' + j.fx.satiety + '.' + (k === 'taxi' && car() ? '<br>Машина: ' + G.cars.CAT[car().key].n + ', бензин ' + Math.round(car().fuel) + ' л.' : '') + '<br>На сколько часов выходишь?',
      opts: j.hours.map(h => ({ t: h + ' ч', dis: why(k, h), fn: () => run(k, h) })).concat([{ t: 'Назад', fn: () => G.sideMenu() }])
    });
  };

  G.sideMenu = function () {
    const opts = Object.keys(JOBS).map(k => {
      const j = JOBS[k], w = why(k);
      return { t: j.i + ' ' + j.n + ' — ' + payText(j), dis: w, fn: () => { if (j.game) G.sideJob(j.game, false); else hoursMenu(k); } };
    });
    opts.push({ t: 'Передумал', fn: () => {} });
    G.modal({ title: '🛠️ ПОДРАБОТКА', text: 'Заказы бывают не каждый день. Подработка выматывает: уходят энергия, настроение и сытость. Одна подработка в день.', opts, wide: true });
  };

  // кнопка «Халтура на дому» недоступна, если сегодня совсем нечего взять
  const act = G.ACT && G.ACT.side_home;
  if (act) {
    const prev = act.req;
    act.once = false; // лимит «одна подработка в день» ставится только когда работа реально сделана, а не при открытии меню
    act.req = s => { const r = prev ? prev(s) : null; if (r) return r; if (s.day.sideDone) return 'Сегодня уже подрабатывал(а)'; const a = roll(); return Object.keys(JOBS).some(k => a[k]) ? null : 'Сегодня заказов нет'; };
  }
})();
