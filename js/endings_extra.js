/* ===== Недостижимые ранее концовки: «Тюрьма / условно» и «Алкаш-бездомный» (QA V3.17)
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

  G.ENDINGS_EXTRA = { JAIL_WINDOW, JAIL_WARN, JAIL_END, HOMELESS_DEBT, HOMELESS_HABIT, HOMELESS_MONEY, HOMELESS_WARN_WK, HOMELESS_END_WK };
})();
