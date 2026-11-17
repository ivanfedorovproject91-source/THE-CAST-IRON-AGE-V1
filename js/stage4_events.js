/* ===== Этап 4, блок 1: события с выбором и отложенными последствиями =====
   G.later(id, дней, данные) — запланировать последствие. Очередь лежит в s.flags.later и сохраняется вместе с игрой.
   В начале каждого дня (G.extraDaily) выполняются все наступившие последствия: ответ на твой выбор приходит не сразу.
   Старые сохранения: очереди нет — создаётся пустой, ничего не меняется. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.D;
  const rub = n => G.rub(Math.round(n));

  // ---------- Очередь последствий
  const LATER = (G.LATER = {});
  const queue = () => { const f = G.s.flags; return f.later || (f.later = []); };
  G.later = function (id, days, data) {
    const q = queue(); q.push({ id, due: G.s.t.day + Math.max(1, days), d: data || {} });
    if (q.length > 24) q.shift();
  };
  G.laterRun = function () {
    const s = G.s, q = queue(); if (!q.length) return;
    const due = q.filter(x => x.due <= s.t.day);
    if (!due.length) return;
    s.flags.later = q.filter(x => x.due > s.t.day);       // сначала убираем, чтобы ничего не выполнилось дважды
    due.forEach(x => { try { if (LATER[x.id]) LATER[x.id](x.d || {}); } catch (e) { if (window.console) console.error(e); } });
  };
  const _ed = G.extraDaily;
  G.extraDaily = function () { _ed && _ed.apply(this, arguments); try { G.laterRun(); } catch (e) { if (window.console) console.error(e); } };

  const info = (title, text, cls) => G.modal({ title, text, cls, opts: [{ t: 'Понятно', fn: () => {} }] });
  const prem = (v) => { G.s.pay.acc += v; };
  const wage = () => { try { return G.monthlyPay(); } catch (e) { return 30000; } };

  // ---------- Последствия
  LATER.brak_found = d => {
    if (G.chance(55)) { G.fx({ boss: -2, mood: -4 }); info('📋 Скрытый брак нашли', 'Комиссия вскрыла спрятанную партию. Говорят, ты стоял рядом и всё видел. «Почему не доложил?»'); G.punish({ risk: 100, what: 'Сокрытие брака', fine: [300, 800], sev: 1 }); }
    else G.toast('Спрятанный брак нашли, но на тебя не подумали. Пронесло.', 'good');
  };
  LATER.seryoga_thanks = d => { G.addMoney(1500); G.fx({ mood: 6, coll: 2, rel: { seryoga: 6 } }); info('🤝 Серёга не забыл', 'Серёга сунул тебе конверт: «Это за тот случай. Должен буду». В конверте ' + rub(1500) + '.', 'good'); };
  LATER.seryoga_revenge = d => { G.fx({ coll: -3, mood: -3 }); if (G.chance(40)) G.addNick('stukach'); G.toast('Серёга обиделся и рассказал в курилке, что ты «стучишь мастеру».', 'bad'); };
  LATER.overtime_tired = d => { G.fx({ health: -3, mood: -3, energy: -6 }); G.toast('Выходная переработка аукнулась: болит спина и хочется спать.', 'bad'); };
  LATER.overtime_bonus = d => { prem(1500); G.fx({ boss: 2 }); G.toast('Мастер помнит, кто выручал: к премии добавили ' + rub(1500) + '.', 'good'); };
  LATER.overtime_remember = d => { if (G.chance(35)) { G.fx({ boss: -2 }); G.toast('Мастер припомнил отказ от сверхурочных: «Не командный игрок».', 'bad'); } };
  LATER.overtime_caught = d => { if (G.chance(50)) { G.fx({ boss: -3 }); G.punish({ risk: 100, what: 'Халтура на сверхурочных', fine: [200, 600], sev: 1 }); G.toast('Партия, сделанная на сверхурочных, вернулась с браком.', 'bad'); } };
  LATER.wedding_friend = d => { G.fx({ coll: 2, boss: 1, mood: 4 }); if (G.chance(35)) { G.addMoney(2000); G.toast('Лёха познакомил тебя с нужным человеком — подработка на ' + rub(2000) + '.', 'good'); } else G.toast('Лёха с женой передали привет и банку огурцов.', 'good'); };
  LATER.wedding_gossip = d => { G.fx({ coll: -1 }); G.toast('В цехе обсуждают, что ты не пришёл на свадьбу. «Гордый».', 'bad'); };
  LATER.tb_commission = d => { prem(1000); G.fx({ boss: 2, cons: 2 }); info('🦺 Комиссия по ТБ', 'Проверка нашла то самое ограждение. Мастеру выговор, а тебе объявили благодарность и ' + rub(1000) + ' премии.', 'good'); };
  LATER.tb_accident = d => { if (G.chance(35)) { G.fx({ mood: -8, boss: -3, cons: -3 }); info('🚑 Несчастный случай', 'На станке без ограждения покалечили руку. Человек жив, но все знали про ограждение. И ты тоже.', 'bad'); } };
  LATER.ratio_result = d => {
    if (G.chance(d.team ? 80 : 70)) { const v = d.team ? 2500 : 4000; prem(v); G.fx({ boss: 4, coll: d.team ? 3 : 0, mood: 6 }); info('💡 Рацпредложение принято', 'Комиссия одобрила: премия ' + rub(v) + '.', 'good'); }
    else { G.fx({ mood: -3 }); G.toast('Рацпредложение отклонили: «Не соответствует техпроцессу».', 'bad'); }
  };
  LATER.rumor_spread = d => { G.fx({ boss: -2, mood: -2 }); G.toast('Слух про сокращения дошёл до Соплежуйкина. Он спрашивает, кто разводит панику.', 'bad'); };
  LATER.rumor_answer = d => {
    if (G.chance(50)) { G.fx({ mood: 4 }); G.toast('Соплежуйкин: «Сокращений не будет». Выдохнули.', 'good'); }
    else { G.fx({ mood: -4 }); G.toast('Соплежуйкин замялся: «Посмотрим по итогам квартала». Радости мало.', 'bad'); }
  };
  LATER.invest_result = d => {
    if (G.chance(70)) { const back = Math.round(d.amt * 1.35); G.addMoney(back); G.fx({ mood: 8, cool: 2 }); info('🌯 Ларёк пошёл', 'Колян вернул вложение с прибылью: ' + rub(back) + ' (вложил ' + rub(d.amt) + ').', 'good'); }
    else { G.fx({ mood: -8, rel: { kolyan: -3 } }); info('🌯 Ларёк прогорел', 'СЭС закрыла точку. Колян разводит руками: «Бизнес — это риск». Вложенные ' + rub(d.amt) + ' пропали.', 'bad'); }
  };
  LATER.invest_nogo = d => { if (G.chance(50)) { G.fx({ mood: -2 }); G.toast('Ларёк у Коляна идёт неплохо. Он напоминает, что ты отказался.'); } };
  LATER.audit_fake = d => {
    if (G.chance(60)) { G.fx({ boss: -6, cons: -3 }); G.note('Приписки в акте', true); info('🔍 Проверка актов', 'Аудитор нашёл приписки в акте выполнения плана. Подпись твоя.', 'bad'); G.punish({ risk: 100, what: 'Приписки в отчётности', fine: [3000, 8000], sev: 2 }); }
    else G.toast('Акт прошёл проверку без вопросов. Пока.', 'good');
  };
  LATER.honest_credit = d => { const v = Math.max(1000, Math.round(wage() * 0.05 / 100) * 100); prem(v); G.fx({ boss: 3, cons: 3 }); info('📊 Честность засчитана', 'Комиссия по результатам отметила достоверность отчётов: премия ' + rub(v) + '.', 'good'); };

  // ---------- События с выбором
  const E = (id, o) => { o.id = id; G.EV.push(o); return o; };

  E('brak_witness', { where: ['work'], w: 1.4, cd: 14, cond: s => s.car.rank >= 1 && s.car.shifts >= 8, fn: () => G.modal({ title: 'Спрятанный брак', face: 'seryoga', text: 'Серёга запорол партию заготовок и торопливо заталкивает её за стеллаж. Ты единственный, кто это видел. «Ты ничего не видел, да?»', opts: [
    { t: 'Промолчать', fn: () => { G.fx({ coll: 1 }); G.later('brak_found', G.ri(3, 7), {}); } },
    { t: 'Взять вину на себя (−400 ₽ штраф)', fn: () => { G.s.pay.pen += 400; G.fx({ mood: -3, boss: -2, coll: 3, rel: { seryoga: 8 } }); G.later('seryoga_thanks', G.ri(8, 15), {}); } },
    { t: 'Доложить мастеру', fn: () => { G.fx({ boss: 3, coll: -4, rel: { seryoga: -8 } }); G.later('seryoga_revenge', G.ri(5, 10), {}); } }
  ] }) });

  E('overtime_offer', { where: ['work'], w: 1.2, cd: 15, cond: s => s.car.rank >= 2 && s.car.shifts >= 15, fn: () => G.modal({ title: 'Сверхурочные в выходные', face: 'stepanych', text: 'Степаныч: «Заказ горит. Выйдешь в субботу? Заплатят 2 500 ₽ к начислению, и я это запомню».', opts: [
    { t: 'Согласиться', fn: () => { prem(2500); G.fx({ energy: -10, mood: -3, boss: 3 }); G.later('overtime_tired', 3); G.later('overtime_bonus', G.ri(10, 14)); } },
    { t: 'Согласиться, но работать вполсилы (1 200 ₽)', fn: () => { prem(1200); G.fx({ energy: -4, mood: -1 }); G.later('overtime_caught', 4); } },
    { t: 'Отказаться', fn: () => { G.fx({ boss: -1 }); G.later('overtime_remember', G.ri(8, 12)); } }
  ] }) });

  E('wedding', { where: ['evening'], w: 1, cd: 40, cond: s => s.car.shifts >= 15 && s.money >= 1000, fn: () => G.modal({ title: '💒 Приглашение на свадьбу', text: 'Лёха из соседнего цеха женится и зовёт на торжество. «Скинешься, как люди?»', opts: [
    { t: 'Подарить 3 000 ₽ и прийти', dis: G.s.money < 3000 ? 'Нет денег' : null, fn: () => { G.addMoney(-3000); G.fx({ coll: 4, mood: 6, cool: 2 }); G.later('wedding_friend', 20); } },
    { t: 'Подарить 1 000 ₽', fn: () => { G.addMoney(-1000); G.fx({ coll: 1, mood: 2 }); G.later('wedding_friend', 20); } },
    { t: 'Не пойти', fn: () => { G.fx({ coll: -2 }); G.later('wedding_gossip', 6); } }
  ] }) });

  E('safety_gap', { where: ['work'], w: 1.1, cd: 20, cond: s => s.car.rank >= 2 && s.car.shifts >= 12, fn: () => G.modal({ title: 'Снятое ограждение', text: 'У соседнего станка кто-то снял защитное ограждение, «чтобы не мешало». Рядом работает новичок.', opts: [
    { t: 'Доложить по ТБ', fn: () => { G.fx({ boss: 3, coll: -1, cons: 2 }); G.later('tb_commission', G.ri(4, 8)); } },
    { t: 'Поставить на место самому (1 час)', fn: () => { G.spend(1); G.fx({ coll: 3, cool: 1, cons: 2 }); } },
    { t: 'Не лезть', fn: () => { G.fx({ cons: -2 }); G.later('tb_accident', G.ri(3, 10)); } }
  ] }) });

  E('rationalization', { where: ['work'], w: 1, cd: 30, cond: s => s.car.rank >= 4 && s.car.shifts >= 60, fn: () => G.modal({ title: '💡 Идея для техпроцесса', text: 'Ты придумал, как сократить наладку станка на четверть. Идея твоя, но подсказали и в бригаде. Как оформить?', opts: [
    { t: 'Оформить на себя', fn: () => { G.fx({ coll: -2 }); G.later('ratio_result', G.ri(8, 14), { team: false }); } },
    { t: 'Оформить от всей бригады', fn: () => { G.fx({ coll: 3, mood: 2 }); G.later('ratio_result', G.ri(8, 14), { team: true }); } },
    { t: 'Забыть', fn: () => {} }
  ] }) });

  E('layoff_rumor', { where: ['work', 'lunch'], w: 1, cd: 25, cond: s => s.car.rank >= 2 && s.world.plant < 75, fn: () => G.modal({ title: 'Слух про сокращения', text: 'В курилке шепчутся: «Завод сокращает штат, спишут по списку». Подтверждений нет, но настроение у всех упало.', opts: [
    { t: 'Пересказать всем', fn: () => { G.fx({ coll: 2, mood: -2 }); G.later('rumor_spread', 4); } },
    { t: 'Спросить у Соплежуйкина', fn: () => { G.fx({ boss: 1 }); G.later('rumor_answer', 3); } },
    { t: 'Не обращать внимания', fn: () => {} }
  ] }) });

  E('friend_invest', { where: ['evening'], w: 0.9, cd: 60, cond: s => s.car.rank >= 3 && s.money >= 8000, fn: () => G.modal({ title: '🌯 Колян и ларёк', face: 'kolyan', text: 'Колян открывает точку с шаурмой: «Гарантированная прибыль! Вложишься — через месяц вернёшь с процентами». Гарантий, разумеется, нет.', opts: [
    { t: 'Вложить 20 000 ₽', dis: G.s.money < 20000 ? 'Нет денег' : null, fn: () => { G.addMoney(-20000); G.later('invest_result', 28, { amt: 20000 }); } },
    { t: 'Вложить 5 000 ₽', fn: () => { G.addMoney(-5000); G.later('invest_result', 28, { amt: 5000 }); } },
    { t: 'Отказаться', fn: () => { G.later('invest_nogo', 28); } }
  ] }) });

  E('plan_pressure', { where: ['work'], w: 1.1, cd: 25, cond: s => s.car.rank >= 6, fn: () => G.modal({ title: '📈 План любой ценой', face: 'truhanov', text: 'Труханов: «К концу месяца план по участку должен быть закрыт. Любыми средствами. Ты же понимаешь, о чём я».', opts: [
    { t: 'Подписать акт с припиской (+премия)', fn: () => { prem(Math.round(wage() * 0.08 / 100) * 100); G.fx({ boss: 3, cons: -6 }); G.later('audit_fake', G.ri(10, 20)); } },
    { t: 'Доложить как есть', fn: () => { G.fx({ boss: -2, cons: 4 }); G.later('honest_credit', 15); } },
    { t: 'Выбить перенос срока', fn: () => { if (G.chance(50)) { G.fx({ boss: 1, mood: 3 }); G.toast('Перенос согласовали.', 'good'); } else { G.fx({ boss: -2, mood: -3 }); G.toast('Отказали: «Не умеешь договариваться».', 'bad'); } } }
  ] }) });
})();
