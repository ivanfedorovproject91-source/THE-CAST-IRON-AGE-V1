/* ===== Учёба и корочки: у каждой корочки есть смысл =====
   Курс — это занятия по 2 часа вечером или в выходной. После последнего занятия — экзамен (провалил — платная пересдача).
   Курсы повышения разряда и управленческие доступны, когда до нужной ступени остался один шаг.
   Что даёт корочка, показано в карточке курса (допуск к профессии, повышение, подработка, меньше травм).
   Старые сохранения: уже полученные корочки не меняются; курса «в процессе» у них нет. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.D, K = G.career, C = G.clamp;
  const rub = n => G.rub(Math.round(n));
  const SESSION = 2;               // часов на одно занятие
  const RETAKE = 0.2;              // пересдача: доля цены курса

  // ---------- Для чего нужна корочка (считаем из данных игры, чтобы не расходилось с правилами)
  const needFor = id => {
    const out = [];
    Object.keys(D.JOBS).forEach(j => { if (D.JOBS[j].cert === id) out.push('допуск к профессии «' + D.JOBS[j].name + '»'); });
    Object.keys(D.REQ).forEach(to => { if ((D.REQ[to].certs || []).indexOf(id) >= 0) out.push('аттестация на «' + D.RANKS[to] + '»'); });
    if (id === 'pogr') out.push('подработка «Разгрузка фур»: оплата ×1.5 и меньше усталость');
    if (id === 'gaz') out.push('травмы от поломок станка вдвое легче');
    if (id === 'c_vo') out.push('путь главного инженера');
    if (id === 'c_ts') out.push('ветка «Охрана труда»');
    return out;
  };
  const toRank = id => { let r = null; Object.keys(D.REQ).forEach(to => { if ((D.REQ[to].certs || []).indexOf(id) >= 0) r = +to; }); return r; };

  // можно ли записаться сейчас
  const enrollWhy = id => {
    const s = G.s, cr = D.COURSES[id], cur = s.flags.course;
    if (G.hasCert(id)) return 'Уже есть';
    if (cur) return cur.id === id ? 'Ты уже учишься на этом курсе' : 'Сначала закончи или брось «' + D.COURSES[cur.id].name + '»';
    const to = toRank(id);
    if (to !== null && s.car.rank < to - 1) return s.car.rank === 0 ? 'Сначала пройди стажировку' : 'Рано: нужен ' + D.RANKS[to - 1];
    if (s.money < cr.price) return 'Не хватает денег (' + rub(cr.price) + ')';
    return null;
  };
  const attendWhy = () => {
    const s = G.s, c = s.flags.course; if (!c) return 'Ты никуда не записан(а)';
    const cr = D.COURSES[c.id], fee = c.retake ? Math.round(cr.price * RETAKE) : 0;
    if (!G.isFree()) return 'Занятия — вечером или в выходной';
    if (s.t.hour + SESSION > 26) return 'Слишком поздно';
    if (s.st.energy < 20) return 'Нет сил на занятие';
    if (fee && s.money < fee) return 'Нужно ' + rub(fee) + ' на пересдачу';
    return null;
  };

  const exam = c => {
    const s = G.s, st = s.st, cr = D.COURSES[c.id];
    const p = C(Math.round(45 + st.know * 0.5 + (st.energy >= 40 ? 5 : -10) + (st.mood >= 40 ? 0 : -5)), 30, 95);
    if (G.chance(p)) {
      s.car.certs.push(c.id); delete s.flags.course; G.fx({ mood: 6 });
      const nf = needFor(c.id);
      G.modal({ title: '🎓 Экзамен сдан', text: 'Комиссия подписала бумаги. Корочка «<b>' + cr.name + '</b>» теперь в твоём деле.' + (nf.length ? '<br><i>Это даёт: ' + nf.join('; ') + '.</i>' : ''), vib: 'success', opts: [{ t: 'Отлично', fn: () => {} }] });
    } else {
      c.done = cr.slots - SESSION; c.retake = (c.retake || 0) + 1; G.fx({ mood: -5 });
      G.modal({ title: 'Экзамен не сдан', text: 'Шанс был ' + p + '%. Комиссия отправила на пересдачу: нужно ещё одно занятие и пересдача — <b>' + rub(Math.round(cr.price * RETAKE)) + '</b>. Выспись и подучи матчасть: знания и силы повышают шанс.', vib: 'warning', opts: [{ t: 'Понятно', fn: () => {} }] });
    }
  };

  const attend = () => {
    const s = G.s, c = s.flags.course; if (!c) return;
    const w = attendWhy(); if (w) { G.toast(w, 'warn'); return; }
    const cr = D.COURSES[c.id], sessions = Math.ceil(cr.slots / SESSION);
    if (c.retake) { G.addMoney(-Math.round(cr.price * RETAKE)); }
    c.done = Math.min(cr.slots, (c.done || 0) + SESSION);
    G.fx({ know: Math.max(1, Math.round(10 / sessions)), energy: -8, mood: -2 });
    if (c.done >= cr.slots) exam(c); else G.toast('Занятие пройдено: ' + c.done + ' из ' + cr.slots + ' ч.', 'good');
    G.spend(SESSION);
  };

  const card = id => {
    const s = G.s, cr = D.COURSES[id], nf = needFor(id), why = enrollWhy(id), to = toRank(id);
    G.modal({
      title: '🎓 ' + cr.name,
      text: 'Цена: <b>' + rub(cr.price) + '</b><br>Занятий: <b>' + Math.ceil(cr.slots / SESSION) + '</b> по ' + SESSION + ' ч (всего ' + cr.slots + ' ч), потом экзамен.<br>' + (nf.length ? 'Зачем нужна: ' + nf.join('; ') + '.' : 'Дополнительных профессиональных возможностей не даёт.') + (to !== null ? '<br><i>Записаться можно, когда до должности «' + D.RANKS[to] + '» остался один шаг.</i>' : '') + '<br><i>Занятия идут вечером или в выходной. Пересдача — ' + rub(Math.round(cr.price * RETAKE)) + '.</i>',
      opts: [{ t: 'Записаться и оплатить ' + rub(cr.price), dis: why, fn: () => { G.addMoney(-cr.price); s.flags.course = { id, done: 0, retake: 0 }; G.toast('Ты записан(а) на курс «' + cr.name + '». Занятия — вечером.', 'good'); } }, { t: 'Назад', fn: () => G.coursesMenu() }]
    });
  };

  G.coursesMenu = function () {
    const s = G.s, cur = s.flags.course, next = s.car.rank + 1, opts = [];
    if (cur) {
      const cr = D.COURSES[cur.id];
      opts.push({ t: '📖 Пойти на занятие (' + SESSION + ' ч) — ' + cr.name + ', пройдено ' + (cur.done || 0) + '/' + cr.slots + ' ч' + (cur.retake ? ' · пересдача' : ''), dis: attendWhy(), fn: attend });
      opts.push({ t: '🚪 Бросить курс (деньги не вернут)', fn: () => G.modal({ title: 'Бросить курс?', text: 'Ты потеряешь оплату и прогресс по курсу «' + cr.name + '».', opts: [{ t: 'Бросить', fn: () => { delete s.flags.course; G.toast('Курс брошен.', 'warn'); } }, { t: 'Остаться', fn: () => G.coursesMenu() }] }) });
    }
    Object.keys(D.COURSES).forEach(id => {
      const cr = D.COURSES[id], mark = G.hasCert(id) ? '✔ ' : (cur && cur.id === id) ? '▶ ' : (D.REQ[next] && (D.REQ[next].certs || []).indexOf(id) >= 0) ? '🎯 ' : '';
      opts.push({ t: mark + cr.name + ' — ' + rub(cr.price), dis: G.hasCert(id) ? 'Уже есть' : (cur && cur.id === id) ? 'Идёт сейчас' : enrollWhy(id), fn: () => card(id) });
    });
    opts.push({ t: 'Закрыть', fn: () => {} });
    const have = s.car.certs.map(c => D.COURSES[c] ? D.COURSES[c].name : c).join('; ') || 'нет';
    const goal = D.REQ[next] && (D.REQ[next].certs || []).filter(id => !G.hasCert(id)).map(id => D.COURSES[id].name);
    G.modal({
      title: '🎓 Учёба и курсы', wide: true,
      text: 'Корочки: ' + have + '<br>' + (cur ? 'Сейчас идёт курс: <b>' + D.COURSES[cur.id].name + '</b> (' + (cur.done || 0) + ' из ' + D.COURSES[cur.id].slots + ' ч).<br>' : '') + (goal && goal.length ? '🎯 Для следующей ступени нужна корочка: ' + goal.join('; ') + '.<br>' : '') + '<i>Курс — это занятия вечером и экзамен. Одновременно можно учиться только на одном.</i>',
      opts
    });
  };
  if (K) K.takeCourse = id => card(id);

  // «Газоспасатель»: при поломке станка травма вдвое легче
  const _mi = G.machineIncident;
  if (_mi) G.machineIncident = function () {
    const s = G.s, h0 = s && s.st ? s.st.health : 0, r = _mi.apply(this, arguments);
    try { if (G.hasCert && G.hasCert('gaz') && s.st.health < h0) { s.st.health = C(s.st.health + (h0 - s.st.health) / 2); G.toast('Навыки газоспасателя: травма вышла легче.', 'good'); } } catch (e) {}
    return r;
  };
})();
