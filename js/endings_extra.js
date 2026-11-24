/* ===== Недостижимые ранее концовки: «Тюрьма / условно» и «Алкаш-бездомный» (QA V3.17)
   • closed: закрытие завода даёт 4 недели на спасение (взятка / поручительство / рост показателей).
   • jail: пойманный с добычей игрок копит «дело». Две поимки за 120 дней — предупреждение
     (Соплежуйкин завёл папку), третья — условный срок.
   • homeless: тяжёлые долги + зависимость + пустой кошелёк несколько недель подряд.
     Есть предупреждение за 4 недели; выбраться можно, погасив долг или бросив пить. */
(function () {
  'use strict';
  const G = window.G, D = G.D;
  const JAIL_WINDOW = 120, JAIL_WARN = 2, JAIL_END = 3;
  const HOMELESS_DEBT = 120000, HOMELESS_HABIT = 60, HOMELESS_MONEY = 2000, HOMELESS_WARN_WK = 4, HOMELESS_END_WK = 8;

  // ---------- Тюрьма: вызывается из work_extras при поимке с добычей
  G.lootBust = function () {
    const s = G.s; if (!s || s.end) return;
    const f = s.flags, day = s.t.day;
    f.lootBusts = (f.lootBusts || []).filter(d => day - d <= JAIL_WINDOW); f.lootBusts.push(day);
    const n = f.lootBusts.length;
    if (n >= JAIL_END) {
      G.end('jail');
    } else if (n === JAIL_WARN && !f.jailWarned) {
      f.jailWarned = day;
      G.modal({ title: '📁 На тебя завели папку', cls: 'bad', vib: 'warning', face: 'soplezhuykin', wide: true,
        text: 'Савелий Соплежуйкин молча кладёт перед тобой тонкую папку. <i>«Это уже второй раз. Третий — и разговор будет не со мной, а со следователем».</i><br><br>Ещё одна поимка с добычей за 120 дней — и тебя ждёт условный срок.',
        opts: [{ t: 'Понял. Завязываю', fn: () => {} }] });
    }
    if (day - (f.jailWarned || -999) > JAIL_WINDOW && n < JAIL_WARN) f.jailWarned = 0;
  };

  // ---------- Бездомный: еженедельная проверка
  const homelessRisk = s => s.debt >= HOMELESS_DEBT && (s.st.habit || 0) >= HOMELESS_HABIT && s.money < HOMELESS_MONEY;
  const _wt = G.weeklyTick;
  G.weeklyTick = function () {
    const r = _wt.apply(this, arguments);
    try {
      const s = G.s; if (!s || s.end) return r;
      const f = s.flags;
      if (homelessRisk(s)) {
        f.hlWk = (f.hlWk || 0) + 1;
        if (f.hlWk >= HOMELESS_END_WK) { G.end('homeless'); return r; }
        if (f.hlWk === HOMELESS_WARN_WK) {
          G.modal({ title: '🥴 Дно близко', cls: 'bad', vib: 'warning', wide: true,
            text: 'Долги ' + G.rub(s.debt) + ', пустой кошелёк, а рука сама тянется к стакану. Коменданта общаги уже тошнит от твоих «завтра отдам».<br><br>Ещё несколько недель так — и ты окажешься на улице. Погаси долг или завяжи с выпивкой, пока «У Палыча» тебя ещё узнают.',
            opts: [{ t: 'Хватит', fn: () => {} }] });
        }
      } else if (f.hlWk) { f.hlWk = Math.max(0, f.hlWk - 2); }
    } catch (e) { if (window.console) console.error(e); }
    return r;
  };

  // ---------- Закрытие завода: не мгновенный конец, а 4 недели на спасение
  const K = G.career, CLOSE_WEEKS = 4, CLOSE_BRIBE = 20000, CLOSE_COOL = 26;
  const rescue = how => {
    const s = G.s; s.world.closing = 0; s.flags.closeCool = G.week() + CLOSE_COOL;
    s.world.plant = Math.min(100, Math.max(s.world.plant, 50) + 5);
    G.toast('Завод спасён: ' + how, 'good'); G.buzz && G.buzz('success');
  };
  const closeOffer = intro => {
    const s = G.s; if (!s || s.end || !s.world.closing) return;
    const left = Math.max(0, s.world.closing - G.week()), st = s.st;
    const chance = Math.max(20, Math.min(75, Math.round(40 + (st.boss - 40) / 2)));
    G.modal({ title: '📰 Над заводом нависла угроза', vib: 'error', bg: 'gate', wide: true,
      text: (intro || '') + 'До решения комиссии: <b>' + left + ' нед.</b> Если ничего не сделать, завод закроют.',
      opts: [
        { t: '💰 Договориться с комиссией (−' + G.rub(CLOSE_BRIBE) + ')', dis: s.money < CLOSE_BRIBE ? 'Не хватает денег' : null,
          fn: () => { G.addMoney(-CLOSE_BRIBE); G.fx({ cons: -5 }); rescue('комиссия «всё поняла».'); } },
        { t: '🗣 Пойти к начальству и поручиться (шанс ' + chance + '%)',
          fn: () => { if (G.chance(chance)) { G.fx({ boss: 5, cons: 2 }); rescue('начальство поверило твоим доводам.'); } else { G.fx({ boss: -5, mood: -5 }); G.toast('Тебя выслушали и не поверили.', 'bad'); } } },
        { t: 'Ждать и надеяться', fn: () => {} }
      ] });
  };
  K.closing = function () {
    const s = G.s; if (!s || s.end || s.world.closing) return;
    if (G.week() < (s.flags.closeCool || 0)) return;
    s.world.closing = G.week() + CLOSE_WEEKS;
    closeOffer('Людка шепчет в столовой: «Комиссия из Москвы приехала. Говорят, закрывают». Времени мало, но ещё можно что-то сделать.<br><br>');
  };
  const _wt2 = G.weeklyTick;
  G.weeklyTick = function () {
    const r = _wt2.apply(this, arguments);
    try {
      const s = G.s; if (!s || s.end || !s.world.closing) return r;
      if (G.week() >= s.world.closing) { G.end('closed'); return r; }
      if (s.world.plant >= 65 && G.chance(25)) { rescue('показатели выправились, комиссия уехала довольной.'); return r; }
      closeOffer('Слухи не утихают. ');
    } catch (e) { if (window.console) console.error(e); }
    return r;
  };

  G.ENDINGS_EXTRA = { JAIL_WINDOW, JAIL_WARN, JAIL_END, HOMELESS_DEBT, HOMELESS_HABIT, HOMELESS_MONEY, HOMELESS_WARN_WK, HOMELESS_END_WK };
})();
