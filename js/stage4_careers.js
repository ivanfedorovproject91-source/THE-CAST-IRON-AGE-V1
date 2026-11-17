/* ===== Этап 4, блок 2: у каждой ступени карьеры своё содержание работы =====
   До этого разряды 1–5 отличались только цифрами (набор действий был одинаков), а ранги 8–10 — одним и тем же набором.
   Теперь каждая ступень открывает новое рабочее действие с выбором и последствиями (часть — отложенные, см. stage4_events.js):
     Разряд 2: заточка резцов            Разряд 3: наладка станка
     Разряд 4: наставничество            Разряд 5: сложный заказ
     Ранг 8:   ресурсы между участками   Ранг 9:  бюджет цеха (раз в неделю)
     Ранг 10:  стратегическое решение (раз в неделю)
   Эффекты умеренные: деньги — только небольшие премии через начисление (с налогами), основной выигрыш — план, качество, отношения. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const C = G.clamp;
  const rub = n => G.rub(Math.round(n));
  const F = () => G.s.flags;
  const plan = v => { const f = F(); if (G.plantStats) G.plantStats(); f.plan = C((f.plan || 50) + v); };
  const morale = v => { const f = F(); if (G.plantStats) G.plantStats(); f.shopMorale = C((f.shopMorale || 50) + v); };
  const prem = v => { G.s.pay.acc += v; };
  const wage = () => { try { return G.monthlyPay(); } catch (e) { return 30000; } };
  const info = (title, text, cls) => G.modal({ title, text, cls, opts: [{ t: 'Понятно', fn: () => {} }] });
  const W = 'Работа и учёба', M = 'Управление';
  const A = (id, o) => G.A(id, Object.assign({ ph: ['work'], loc: 'shop', i: '🔧', once: 'day' }, o));

  // качество на смену: заточка и наладка
  const _q = G.quality;
  G.quality = function () { let q = _q.apply(this, arguments); try { const d = G.s.day; if (d) q += (d.sharp ? 5 : 0) + (d.setupQ || 0); } catch (e) {} return q; };

  // ---------- Рабочие разряды
  A('w_sharpen', { maxRank: 5, g: W, n: 'Заточить резцы', i: '🪚', h: 1, minRank: 2, fx: { know: 1, energy: -2 }, txt: 'Резцы звенят. Сегодня стружка ляжет ровнее (качество +5 на смену).', fn: s => { s.day.sharp = 1; } });

  A('w_setup', { maxRank: 5, g: W, n: 'Наладить станок по чертежу', i: '📐', menu: true, minRank: 3, fn: () => { G.modal({ title: 'Наладка станка', text: 'Станок можно настроить по чертежу или «на глазок».', opts: [
    { t: 'По чертежу (1 час)', fn: () => { G.s.day.setupQ = 8; G.fx({ know: 2, energy: -3 }); G.fx({ wear: -15 }); G.toast('Наладил аккуратно: качество на смену выше.', 'good'); G.spend(1); } },
    { t: 'На глазок (без потери времени)', fn: () => { if (G.chance(60)) { G.s.day.setupQ = 8; G.toast('Опыт не пропьёшь: настроилось с первого раза.', 'good'); } else { G.s.day.setupQ = -4; G.fx({ wear: 10, mood: -2 }); G.toast('Не попал: станок гуляет, брака будет больше.', 'bad'); } G.afterAction({ h: 0, noEvent: true }); } },
    { t: 'Не трогать', fn: () => {} }] }); return 'custom'; } });

  A('w_mentor', { maxRank: 5, g: W, n: 'Наставлять новичка', i: '🎓', menu: true, minRank: 4, fn: () => { G.modal({ title: 'Новичок у станка', text: 'Новичок мнётся и боится включать станок. Он смотрит на тебя, как на спасителя.', opts: [
    { t: 'Объяснить терпеливо (1 час)', fn: () => { G.fx({ coll: 3, boss: 1, know: 1, energy: -3 }); G.later('mentee_ok', G.ri(5, 8), {}); G.toast('Ты потратил час, зато он понял.', 'good'); G.spend(1); } },
    { t: 'Дать задание и уйти', fn: () => { G.fx({ coll: -1 }); G.later('mentee_fail', G.ri(3, 5), {}); G.afterAction({ h: 0, noEvent: true }); } },
    { t: 'Не связываться', fn: () => {} }] }); return 'custom'; } });

  A('w_critical', { maxRank: 5, g: W, n: 'Сложный заказ', i: '⭐', menu: true, minRank: 5, fn: () => { G.modal({ title: 'Сложный заказ', face: 'stepanych', text: 'Степаныч: «Заказ с допусками в сотку. Кроме тебя никто не возьмётся. Премия — как положено».', opts: [
    { t: 'Взять самому (2 часа)', fn: () => { const ok = G.quality() >= 65 && G.chance(70); if (ok) { prem(1500); G.fx({ boss: 3, mood: 4, know: 2 }); G.toast('Принят с первого предъявления. Премия: ' + rub(1500) + '.', 'good'); } else { G.s.pay.pen += 500; G.fx({ mood: -4, boss: -1 }); G.toast('Допуск ушёл. Деталь в брак, удержано ' + rub(500) + '.', 'bad'); } G.spend(2); } },
    { t: 'Вдвоём с учеником (2 часа)', fn: () => { if (G.chance(90)) { prem(900); G.fx({ coll: 2, boss: 1, know: 1 }); G.toast('Справились вдвоём. Премия: ' + rub(900) + '.', 'good'); } else { G.fx({ mood: -2 }); G.toast('Вдвоём тоже не вышло: заказ на переделку.', 'bad'); } G.spend(2); } },
    { t: 'Отказаться', fn: () => { G.fx({ boss: -1 }); } }] }); return 'custom'; } });

  // ---------- Управленческие ступени
  A('m_resource', { g: M, n: 'Перебросить ресурсы между участками', i: '🔀', menu: true, minRank: 8, fn: () => { G.modal({ title: 'Межучастковый баланс', text: 'У одного участка простаивают люди, у другого горит план.', opts: [
    { t: 'Забрать людей у «тихого» участка', fn: () => { plan(5); morale(-3); G.fx({ boss: 2 }); G.later('resource_gap', 5, {}); G.toast('План вырос, но «тихий» участок просел.'); G.spend(1); } },
    { t: 'Договориться об обмене', fn: () => { if (G.chance(50)) { plan(2); morale(2); G.fx({ boss: 1, coll: 2 }); G.toast('Начальники участков договорились.', 'good'); } else { G.fx({ boss: -1 }); G.toast('Договориться не вышло: каждый тянет на себя.', 'bad'); } G.spend(1); } },
    { t: 'Не вмешиваться', fn: () => {} }] }); return 'custom'; } });

  A('m_budget', { g: M, n: 'Бюджет цеха на неделю', i: '💼', menu: true, minRank: 9, once: false, req: s => (F().budgetWk === G.week() ? 'Раз в неделю' : null), fn: () => { F().budgetWk = G.week(); G.modal({ title: 'Бюджет цеха', text: 'Финансисты просят определиться, на чём сэкономить.', opts: [
    { t: 'Урезать ремонт', fn: () => { plan(4); G.fx({ boss: 2 }); G.later('budget_breakdown', G.ri(6, 12), {}); G.toast('План выше, ремонт откладывается.'); G.spend(1); } },
    { t: 'Заложить ремонт полностью', fn: () => { plan(-2); morale(3); G.fx({ cons: 2 }); G.toast('Оборудование в порядке, показатели чуть ниже.', 'good'); G.spend(1); } },
    { t: 'Выбить дополнительный лимит у Труханова', fn: () => { if (G.chance(50)) { plan(3); morale(2); G.fx({ boss: 3 }); G.toast('Труханов подписал: «Но это в последний раз».', 'good'); } else { G.fx({ boss: -3, mood: -3 }); G.toast('Труханов: «Бюджет — это не резиновое слово».', 'bad'); } G.spend(1); } }] }); return 'custom'; } });

  A('m_strategy', { g: M, n: 'Стратегическое решение', i: '🧭', loc: 'admin', menu: true, minRank: 10, once: false, req: s => (F().stratWk === G.week() ? 'Раз в неделю' : null), fn: () => { F().stratWk = G.week(); G.modal({ title: 'Курс на квартал', text: 'Как сыграем в этом квартале? Решение отзовётся не сразу.', opts: [
    { t: 'Модернизация цеха', fn: () => { plan(-3); G.fx({ boss: 1, cons: 2 }); G.later('modernization', 14, {}); G.toast('Часть мощностей остановлена. Результат — через две недели.'); G.spend(1); } },
    { t: 'Наращивание выпуска', fn: () => { plan(6); morale(-4); G.fx({ boss: 3 }); G.later('overheat', 10, {}); G.toast('Выпуск растёт, люди тоже устают.'); G.spend(1); } },
    { t: 'Режим экономии', fn: () => { plan(-2); G.fx({ boss: 3 }); G.later('cuts_unrest', 7, {}); G.toast('Расходы сокращены. Рабочие шепчутся.'); G.spend(1); } }] }); return 'custom'; } });

  // ---------- Последствия (очередь из stage4_events.js)
  const L = (G.LATER = G.LATER || {});
  L.mentee_ok = () => { prem(800); G.fx({ coll: 2, boss: 1 }); G.toast('Новичок сдал допуск и благодарит наставника. Мастер доплатил ' + rub(800) + '.', 'good'); };
  L.mentee_fail = () => { if (G.chance(40)) { G.fx({ boss: -2 }); G.punish({ risk: 100, what: 'Брак новичка без присмотра', fine: [200, 400], sev: 0 }); G.toast('Оставленный без присмотра новичок запорол заготовку. Спросили с тебя.', 'bad'); } };
  L.resource_gap = () => { plan(-4); morale(-2); G.toast('Участок, у которого забрали людей, не выполнил задание.', 'bad'); };
  L.budget_breakdown = () => { plan(-8); morale(-3); G.fx({ boss: -2 }); info('🛠 Авария на линии', 'Оборудование, которое не отремонтировали, встало посреди смены. Ремонт обойдётся дороже сэкономленного.', 'bad'); };
  L.modernization = () => { plan(10); if (G.s.world) G.s.world.plant = C(G.s.world.plant + 3); G.fx({ boss: 3, cons: 2 }); info('🏭 Модернизация завершена', 'Новое оборудование пущено. План вырос, на заводе заметили.', 'good'); };
  L.overheat = () => { morale(-6); plan(-3); G.toast('Перегруженный цех выдохся: люди на пределе, выпуск просел.', 'bad'); };
  L.cuts_unrest = () => { morale(-4); G.fx({ coll: -2 }); G.toast('Сокращение расходов вызвало недовольство коллектива.', 'bad'); };
})();
