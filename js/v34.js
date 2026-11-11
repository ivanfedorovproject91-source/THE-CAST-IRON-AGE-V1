/* ===== v3.4: шкалы, еда, столовая с иконками, голод ===== */
(function () {
  const G = window.G, D = G.D, C = G.clamp, CFG = G.CONFIG;
  const F = () => G.s.flags;
  const msg = (t, c) => G.toast(t, c);

  // ---------- 1. Здоровье восстанавливается медленнее; сытость не выше потолка; учёт «часов без еды»
  const _fx = G.fx;
  G.fx = function (o, ctx) {
    if (o && typeof o === 'object' && o.health > 0) { o = Object.assign({}, o); o.health = o.health * (CFG.HEAL_FACTOR || 1); }
    const sat0 = G.s && G.s.st ? G.s.st.satiety : 0;
    const r = _fx.call(this, o, ctx);
    try {
      const s = G.s;
      if (s && s.st && o && o.satiety > 0) {
        if (s.st.satiety > (CFG.SAT_CAP || 95)) s.st.satiety = CFG.SAT_CAP || 95;
        if (o.satiety >= 10 || s.st.satiety - sat0 >= 10) s.flags.starveH = 0;
      }
    } catch (e) {}
    return r;
  };
  const _sleep = G.sleep;
  G.sleep = function () {
    const s = G.s, h0 = s.st.health;
    const r = _sleep.apply(this, arguments);
    try {
      const h1 = s.st.health;
      if (h1 > h0) s.st.health = h0 + (h1 - h0) * (CFG.HEAL_FACTOR || 1);
      s.flags.starveH = (s.flags.starveH || 0) + 8;
    } catch (e) {}
    return r;
  };

  // ---------- 2. Голод: сутки без еды — настроение почти ноль, качество падает; двое — обморок
  const _adv = G.advance;
  G.advance = function (h) {
    const r = _adv.apply(this, arguments);
    try {
      const s = G.s; if (!s || !s.st || s.end || s.phase === 'new') return r;
      const f = s.flags;
      f.starveH = (f.starveH || 0) + h;
      if (f.starveH >= CFG.HUNGER_H2) {
        s.st.mood = Math.min(s.st.mood, 6);
        if (f.starveWarn !== s.t.day) { f.starveWarn = s.t.day; msg('🍽 Ты почти сутки не ел(а). Настроение на нуле, руки трясутся, работа валится.', 'bad'); }
      } else if (f.starveH >= CFG.HUNGER_H1 && f.starveWarn1 !== s.t.day) {
        f.starveWarn1 = s.t.day; msg('Живот сводит от голода. Надо поесть.', 'warn');
      }
      if (f.starveH >= CFG.HUNGER_H3 && !s.day.fainted) {
        s.day.fainted = 1; f.starveH = CFG.HUNGER_H2 - 4;
        setTimeout(() => G.hungerCollapse(), 100);
      }
    } catch (e) {}
    return r;
  };
  G.hungerCollapse = function () {
    const s = G.s; if (!s || s.end) return;
    G.modal({ title: '😵 ОБМОРОК ОТ ГОЛОДА', vib: 'error', cls: 'bad', text: 'Двое суток без нормальной еды. В глазах потемнело — ты рухнул(а) на пол. Очнулся(ась) в медпункте с капельницей в руке. Врач качает головой: «Ты что, на диете из гвоздей?»', opts: [{ t: 'Очнуться', fn: () => {
      G.fx({ health: -12, mood: 4, energy: -15, satiety: 35 });
      s.st.health = C(s.st.health - 8);
      const fee = Math.min(s.money, 2500); if (fee > 0) G.addMoney(-fee);
      s.car.sickUntil = Math.max(s.car.sickUntil || -1, s.t.day + 2);
      s.flags.starveH = 0;
      G.fx({ rel: {} }); s.day.viol = (s.day.viol || 0);
      msg('Больничный на 2 дня и счёт за капельницу ' + G.rub(fee) + '. Ешь вовремя.', 'bad');
    } }] });
  };

  // ---------- 3. Еда дома: после работы 1 раз, в выходной и на больничном — 3
  G.homeMealLimit = function () {
    const s = G.s;
    return (G.isWorkday() && !s.day.sick && !s.day.skip) ? (CFG.MEALS_HOME_WORK || 1) : (CFG.MEALS_HOME_FREE || 3);
  };
  G.homeMealLeft = function () { return G.homeMealLimit() - (G.s.day.homeMeals || 0); };
  G.homeMealUsed = function () { G.s.day.homeMeals = (G.s.day.homeMeals || 0) + 1; };

  // ---------- 4. Меню столовой: 1 первое + 1 второе + 1 напиток; иконки; гороховый суп
  if (!D.MENU.some(m => m.id === 'gorokh')) D.MENU.splice(3, 0, { id: 'gorokh', n: 'Гороховый суп', p: 45, fx: { satiety: 19, energy: 3, mood: 1 }, pea: true });
  const KIND = { borsch: 1, shchi: 1, lapsha: 1, gorokh: 1, grechka: 2, makaroni: 2, pyure: 2, shnitsel: 2, salat: 2, pirozhok: 2, kompot: 3, chai: 3, kofe: 3 };
  D.MENU.forEach(m => { m.kind = KIND[m.id] || (m.fx && m.fx.satiety >= 15 ? 2 : 3); });
  const KIND_RU = { 1: 'Первое', 2: 'Второе', 3: 'Напиток' };
  const KIND_KEY = { 1: 'cFirst', 2: 'cSecond', 3: 'cDrink' };

  // мини-иконки (SVG) для еды
  const svg = (inner) => '<svg class="fi" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">' + inner + '</svg>';
  const bowl = (col, extra) => svg('<ellipse cx="16" cy="14" rx="12" ry="4" fill="' + col + '" stroke="#222" stroke-width="1"/>' + (extra || '') + '<path d="M4 14 Q5 27 16 27 Q27 27 28 14" fill="#e8e3d6" stroke="#222" stroke-width="1.2"/><ellipse cx="16" cy="14" rx="12" ry="4" fill="' + col + '" opacity=".92"/>');
  const plate = (inner) => svg('<ellipse cx="16" cy="21" rx="14" ry="6" fill="#f3efe4" stroke="#222" stroke-width="1"/>' + inner);
  const cup = (col, steam) => svg('<path d="M7 11 H22 V21 Q22 27 14.5 27 Q7 27 7 21 Z" fill="#f3efe4" stroke="#222" stroke-width="1.2"/><path d="M22 14 Q27 14 27 18 Q27 22 22 22" fill="none" stroke="#222" stroke-width="1.5"/><rect x="8.5" y="12.5" width="12" height="3" fill="' + col + '"/>' + (steam ? '<path d="M11 8 Q9 5 11 3 M16 8 Q14 5 16 3" stroke="#888" fill="none" stroke-width="1.2"/>' : ''));
  const ICON = {
    borsch: () => bowl('#b3261e', '<circle cx="16" cy="13" r="2.4" fill="#fff"/>'),
    shchi: () => bowl('#9cc060', '<circle cx="11" cy="14" r="1.2" fill="#f4f0c0"/><circle cx="20" cy="13.5" r="1.2" fill="#f4f0c0"/>'),
    lapsha: () => bowl('#e8c872', '<path d="M9 14 Q12 11 15 14 T22 14" stroke="#c9a040" fill="none" stroke-width="1.2"/>'),
    gorokh: () => bowl('#b7b34a', '<circle cx="11" cy="14" r="1.3" fill="#7d9a2c"/><circle cx="15" cy="13" r="1.3" fill="#7d9a2c"/><circle cx="19" cy="14.5" r="1.3" fill="#7d9a2c"/><circle cx="22" cy="13" r="1.3" fill="#7d9a2c"/>'),
    grechka: () => plate('<ellipse cx="13" cy="19" rx="7" ry="3.2" fill="#6b4a2a"/><ellipse cx="22" cy="20" rx="4.5" ry="3" fill="#a0522d"/>'),
    makaroni: () => plate('<path d="M7 20 Q10 15 13 20 T19 20 T25 20" stroke="#e6b94a" fill="none" stroke-width="2.4"/><rect x="12" y="17" width="9" height="3" rx="1.5" fill="#c0463a"/>'),
    pyure: () => plate('<ellipse cx="13" cy="19" rx="7" ry="3.5" fill="#f6e9a8"/><rect x="18" y="17" width="8" height="3.4" rx="1.7" fill="#c9553f"/>'),
    shnitsel: () => plate('<ellipse cx="16" cy="19.5" rx="10" ry="4" fill="#c98a3a"/><circle cx="16" cy="19" r="2.4" fill="#f0d060"/>'),
    salat: () => bowl('#7cb342', '<circle cx="11" cy="13.5" r="1.4" fill="#e53935"/><circle cx="19" cy="13" r="1.4" fill="#e53935"/><circle cx="15" cy="14.5" r="1.2" fill="#fdd835"/>'),
    pirozhok: () => svg('<path d="M4 22 Q4 10 16 10 Q28 10 28 22 Z" fill="#d89b4a" stroke="#222" stroke-width="1.2"/><path d="M9 17 L12 14 M15 17 L18 13 M21 18 L23 15" stroke="#a8702a" stroke-width="1.2"/>'),
    kompot: () => cup('#c0392b', false),
    chai: () => cup('#a0522d', true),
    kofe: () => cup('#4a2c17', true)
  };
  G.foodIcon = id => (ICON[id] ? ICON[id]() : svg('<circle cx="16" cy="16" r="10" fill="#ddd" stroke="#222"/>'));

  G.eatMenu = function () {
    const s = G.s, p = G.R('lyudka').stage >= 4 ? 1.2 : 1;
    const lim = CFG.CANTEEN_LIMIT || 0;
    const used = k => (s.day[KIND_KEY[k]] || 0);
    const rec = () => {
      const done = [1, 2, 3].map(k => KIND_RU[k] + (used(k) ? ' ✔' : ' —')).join(' · ');
      const opts = D.MENU.map(m => ({
        t: G.foodIcon(m.id) + ' <span class="fn">' + m.n + ' — ' + G.rub(m.p) + '</span>' + (m.pea ? ' <small>(💨 осторожно)</small>' : ''),
        dis: s.money < m.p ? 'Нет денег' : used(m.kind) ? KIND_RU[m.kind] + ' уже брал(а) сегодня' : s.st.satiety >= 90 && m.kind !== 3 ? 'Не лезет: ты сыт(а)' : null,
        fn: () => {
          s.day[KIND_KEY[m.kind]] = 1; s.day.canteen = (s.day.canteen || 0) + 1; G.addMoney(-m.p);
          const f = {}; for (const k in m.fx) f[k] = m.fx[k] * (k === 'satiety' ? p : 1);
          G.fx(f); if (m.mask) s.mask += m.mask; if (m.fx.satiety >= 15) G.fx({ cure: 1 });
          if (m.pea) { s.day.pea = 1; msg('Гороховый суп! Вкусно… но живот уже что-то замышляет.', 'warn'); }
          msg(m.n + ': ' + Object.keys(f).map(k => D.STAT_RU[k] + ' +' + Math.round(f[k])).join(', '));
          if (G.R('tatyana').l >= 20 && G.chance(30)) { msg('В хлебе записка от Татьяны: «Приятного».', 'good'); G.relAdd('tatyana', 2); }
          rec();
        }
      }));
      G.modal({ title: 'Столовая', face: 'lyudka', wide: true, text: 'Деньги: <b>' + G.rub(s.money) + '</b> · Сытость: ' + Math.round(s.st.satiety) + '<br>Как в жизни: одно первое, одно второе, один напиток. <b>' + done + '</b><br><i>Людка гремит черпаком.</i>', opts: opts.concat([{ t: 'Хватит', fn: () => G.spend(1) }]) });
    };
    rec();
  };

  // Гороховый суп: до трёх мощных «залпов» за вторую половину смены
  const _advPea = G.advance;
  G.advance = function (h) {
    const r = _advPea.apply(this, arguments);
    try {
      const s = G.s;
      if (s && s.day && s.day.pea && s.phase === 'work' && s.t.hour >= 14 && s.t.hour <= 17 && (s.day.peaGas || 0) < 2 && s.day.gasDone && !G.modalOpen) {
        s.day.peaGas = (s.day.peaGas || 0) + 1;
        setTimeout(() => { if (G.s && !G.s.end) G.gasUrge(); }, 150);
      }
    } catch (e) {}
    return r;
  };

  // стили
  const st = document.createElement('style');
  st.textContent = '.fi{vertical-align:middle;margin-right:6px;flex:none}.fn{vertical-align:middle}';
  document.head.appendChild(st);
})();

/* ===== v3.4 (часть B): опоздания, забытый пропуск, долги ===== */
(function () {
  const G = window.G, D = G.D, C = G.clamp, CFG = G.CONFIG, K = G.career;
  const F = () => G.s.flags;
  const msg = (t, c) => G.toast(t, c);
  const mon = n => G.rub(Math.round(n));

  // ---------- Опоздание
  G.lateHit = function (h, why) {
    const s = G.s, f = F();
    s.day.late = (s.day.late || 0) + h;
    if (f.lateWeek !== G.week()) { f.lateWeek = G.week(); f.lateCnt = 0; }
    f.lateCnt++;
    const n = f.lateCnt, pay = Math.round(G.monthlyPay() / 20 / 8 * h);
    let txt = why + '<br>На рабочее место ты попал(а) на <b>' + h + ' ч</b> позже. ';
    if (pay) G.fx({ pen: pay });
    if (n === 1) { G.fx({ boss: -2, mood: -3 }); txt += 'Мастер посмотрел на часы и промолчал. Пока.'; }
    else if (n === 2) { G.fx({ boss: -4, coll: -2, mood: -4 }); txt += 'Мастер записал опоздание в журнал. Коллеги переглядываются.'; }
    else { G.fx({ boss: -5, coll: -3, mood: -5 }); txt += 'Это уже система. Табельщица составила акт.'; if (s.pay) G.punish({ risk: 100, what: 'Систематические опоздания', fine: [300, 800], sev: 1 }); }
    txt += '<br>Удержано из зарплаты: ' + mon(pay) + '. Опозданий на этой неделе: ' + n + '.';
    G.modal({ title: '⏰ ОПОЗДАНИЕ', vib: 'warning', cls: 'bad', text: txt, opts: [{ t: 'Понятно…', fn: () => {} }] });
  };
  G.walkLateRoll = function () {
    const s = G.s, st = s.st;
    let p = CFG.WALK_LATE || 22;
    if (st.energy < 35) p += 12;
    if (s.hang > 0) p += 10;
    if (st.drunk > 10) p += 8;
    if (st.satiety < 25) p += 5;
    if (!G.chance(Math.min(60, p))) return;
    G.lateHit(1, G.pick(['Шёл пешком и застрял у закрытого переезда: товарняк тянулся вечность.', 'По дороге пришлось обходить лужу размером с озеро. Время ушло.', 'Шёл пешком, зазевался у киоска с пирожками и потерял счёт времени.', 'Дорога пешком оказалась длиннее, чем казалось. Ноги — не автобус.']));
  };
  if (K && K.toWorkplace) {
    const _tw = K.toWorkplace;
    K.toWorkplace = function () {
      const r = _tw.apply(this, arguments), s = G.s;
      try { if (s && s.phase === 'work' && s.day.late && !s.day.lateApplied) { s.day.lateApplied = 1; G.advance(s.day.late); } } catch (e) {}
      return r;
    };
  }

  // ---------- Забытый пропуск (усталость, иногда опьянение)
  const _gate = G.gate;
  G.gate = function () {
    const s = G.s, st = s.st, self = this, args = arguments;
    if (s.day.passRoll === undefined) {
      s.day.passRoll = 1;
      if (G.isFriend('egorych') && (st.energy < 50 || st.drunk >= 5) && G.chance(85)) { msg('Егорыч видит твою рожу: «Проходи, свой. Пропуск потом покажешь».', 'good'); return _gate.apply(this, args); }
      let p = 0;
      if (st.energy < 20) p = 40; else if (st.energy < 35) p = 22; else if (st.energy < 50) p = 6;
      if (st.drunk >= 15) p += 18; else if (st.drunk >= 5) p += 8;
      if (G.chance(Math.min(70, p))) return forgotPass(() => _gate.apply(self, args));
    }
    return _gate.apply(this, args);
  };
  function forgotPass(cont) {
    const s = G.s, rel = () => G.R('egorych').l;
    const why = s.st.drunk >= 5 ? 'После вчерашнего голова — как чугунная болванка, пропуск остался дома.' : 'Ты так вымотался(ась), что пропуск остался на тумбочке.';
    const ask = () => G.modal({ title: '🚫 ПРОХОДНАЯ', face: 'egorych', vib: 'error', cls: 'bad',
      text: '<div class="forgot-pass">Вы забыли пропуск</div><i>' + why + '</i><br>Егорыч высовывается из будки: «Пропуск! Нет пропуска — нет человека».',
      opts: [
        { t: '🏃 Сбегать домой за пропуском (−2 ч, опоздание)', fn: () => { G.fx({ energy: -6, mood: -3 }); G.lateHit(2, 'Бегал(а) домой за пропуском.'); cont(); } },
        { t: '🗣 Уговорить Егорыча пропустить так', fn: () => {
          if (G.chance(30 + rel() / 2)) { G.fx({ mood: 1 }); G.relAdd('egorych', 1); msg('Егорыч сдался: «Лицо у тебя знакомое. В последний раз!»', 'good'); cont(); }
          else { msg('«Не положено! Иди за пропуском!»', 'bad'); G.fx({ mood: -2 }); G.lateHit(2, 'Егорыч не поддался на уговоры, пришлось бежать домой.'); cont(); }
        } },
        { t: '💵 Сунуть 500 ₽', dis: s.money < 500 ? 'Нет денег' : null, fn: () => { G.addMoney(-500); G.relAdd('egorych', 1); G.fx({ cons: -2 }); msg('Купюра исчезла в ящике. «Проходи, раззява».', 'warn'); cont(); } },
        { t: '📝 Разовый пропуск (штраф 300 ₽ и запись)', fn: () => { const f = Math.min(300, s.money); if (f) G.addMoney(-f); G.fx({ boss: -1, mood: -2 }); msg('Егорыч выписал бумажку. Его почерк разобрать невозможно, зато печать огромная.', 'warn'); cont(); } }
      ] });
    G.toast('🚫 Вы забыли пропуск!', 'bad');
    ask();
  }

  // ---------- Долги
  G.isShunned = id => !!(G.s.flags['shun_' + id]);
  G.shunTalk = function (id) {
    const s = G.s, n = D.NPC[id], debt = s.flags['debt_' + id] || 0, opts = [];
    if (debt > 0) opts.push({ t: '💵 Отдать ' + mon(debt) + ' и извиниться', dis: s.money < debt ? 'Нет денег' : null, fn: () => {
      G.addMoney(-debt); s.flags['debt_' + id] = 0; s.flags['debt_' + id + '_lvl'] = 0; delete s.flags['shun_' + id];
      G.R(id).l = Math.max(G.R(id).l, -10); G.relAdd(id, 10); msg(n.name + ' взял(а) деньги, буркнул(а) «ладно» и снова с тобой разговаривает. Но осадочек остался.', 'good');
    } });
    opts.push({ t: 'Уйти', fn: () => {} });
    G.modal({ title: n.name, face: id, text: n.name + ' демонстративно отворачивается: «Мы с тобой не разговариваем.»' + (debt > 0 ? '<br>Долг: ' + mon(debt) : ''), opts });
  };
  function punishDebt(id, key) {
    const s = G.s, n = D.NPC[id];
    G.R(id).l = -60; s.flags['shun_' + id] = 1;
    if (!(G.noFight && G.noFight(id))) { G.fx({ health: -15, mood: -15, fights: 1 }); msg('Тебя подкараулили после смены и отметелили за долг. ' + n.name + ' с тобой больше не разговаривает.', 'bad'); }
    else { G.fx({ mood: -8, coll: -4 }); msg(n.name + ' перестала с тобой общаться и рассказала всем, кто ты такой(ая) на самом деле.', 'bad'); }
    if (G.rumor) G.rumor('debt_' + id, 'Все знают: ты не отдал(а) долг ' + n.name + '.', { coll: -3 }, 80);
    G.addNick('dolzhnik');
  }
  G.friendDebt = function (id, key) {
    const s = G.s, f = s.flags, amt = f[key], n = D.NPC[id];
    if (!n || !(amt > 0) || f['shun_' + id]) return;
    const lvl = (f[key + '_lvl'] = (f[key + '_lvl'] || 0) + 1);
    const T = ['вежливо напомнил(а): «Ты мне должен. Помнишь?»', 'уже в открытую ссорится из-за долга.', 'пустил(а) по заводу слух, что ты не отдаёшь долги.', 'теряет терпение: «Это последнее предупреждение».'];
    if (lvl === 1) G.relAdd(id, -1); else if (lvl === 2) { G.relAdd(id, -4); G.fx({ coll: -1 }); } else if (lvl === 3) { G.relAdd(id, -8); G.fx({ coll: -3 }); if (G.rumor) G.rumor('debt_' + id, n.name + ' рассказывает, что ты не отдаёшь долги.', { coll: -1 }, 70); }
    if (lvl >= 5) return punishDebt(id, key);
    const o = [
      { t: 'Отдать ' + mon(amt), dis: s.money < amt ? 'Нет денег' : null, fn: () => { G.addMoney(-amt); f[key] = 0; f[key + '_lvl'] = 0; msg('Долг отдан.', 'good'); G.relAdd(id, 4 + lvl); } },
      { t: 'Отдать половину (' + mon(amt / 2) + ')', dis: s.money < amt / 2 ? 'Нет денег' : null, fn: () => { G.addMoney(-amt / 2); f[key] = Math.round(amt / 2); f[key + '_lvl'] = Math.max(0, lvl - 2); G.relAdd(id, 1); msg('Часть долга возвращена. ' + n.name + ' смягчился(ась).', 'good'); } }
    ];
    if (lvl < 4) o.push({ t: 'Попросить отсрочку (5 дней)', fn: () => { f[key + '_until'] = s.t.day + 5; G.fx({ mood: -2 }); G.relAdd(id, -2); } });
    o.push({ t: 'Послать', fn: () => { G.fx({ cool: 3, cons: -3, coll: -2 }); G.addNick('dolzhnik'); if (lvl >= 3) punishDebt(id, key); else { f[key + '_lvl'] = lvl + 1; G.relAdd(id, -6); } } });
    G.modal({ title: n.name + ' вспомнил', face: id, text: n.name + ' ' + T[Math.min(3, lvl - 1)] + '<br>Долг: ' + mon(amt), opts: o });
  };
  G.debtOpts = function (id) {
    const s = G.s, r = G.R(id), o = [], d = s.flags['debt_' + id] || 0;
    if (d > 0) o.push({ t: '💵 Отдать долг (' + mon(d) + ')', dis: s.money < d ? 'Нет денег' : null, fn: () => { G.addMoney(-d); s.flags['debt_' + id] = 0; s.flags['debt_' + id + '_lvl'] = 0; G.relAdd(id, 5); msg('Долг отдан. Совесть чиста.', 'good'); } });
    if (r.owed > 0) o.push({ t: '🔔 Напомнить про долг (' + mon(r.owed) + ')', dis: r.remindDay === s.t.day ? 'Сегодня уже напоминал(а)' : null, fn: () => {
      const n = D.NPC[id]; r.remindDay = s.t.day; r.remind = (r.remind || 0) + 1;
      if (G.chance((n.reliab || 50) * 0.7 + r.l / 4)) { G.addMoney(r.owed); msg(n.name + ' вернул(а) ' + mon(r.owed) + ': «Прости, замотался».', 'good'); r.owed = 0; r.forgot = 0; r.remind = 0; G.relAdd(id, 1); }
      else if (r.remind >= 4) { G.relAdd(id, -8); r.remind = 0; msg(n.name + ' обиделся(ась): «Ты меня достал(а) со своими деньгами!»', 'bad'); }
      else { G.relAdd(id, -2); msg(n.name + ' мнётся: «Скоро отдам, честно».', 'warn'); }
    } });
    return o;
  };
  G.owedWeekly = function () {
    const s = G.s;
    Object.keys(s.rel).forEach(id => {
      const r = s.rel[id], n = D.NPC[id]; if (!n || !(r.owed > 0) || !G.chance(25)) return;
      if (G.chance(n.reliab || 50)) { G.addMoney(r.owed); msg(n.name + ' вернул(а) долг: ' + mon(r.owed), 'good'); G.relAdd(id, 2); r.owed = 0; r.forgot = 0; return; }
      r.forgot = (r.forgot || 0) + 1; G.relAdd(id, -1);
      if (r.forgot >= 3) { msg(n.name + ' так и не отдал(а) ' + mon(r.owed) + ' и считает, что вы «квиты». Больше не проси.', 'bad'); G.relAdd(id, -10); r.owed = 0; r.forgot = 0; }
      else msg(n.name + ' «забыл(а)» про долг ' + mon(r.owed) + '. Стоит напомнить.', 'warn');
    });
  };

  const st = document.createElement('style');
  st.textContent = '.forgot-pass{color:#ff2a2a;font-weight:900;font-size:26px;text-align:center;text-transform:uppercase;letter-spacing:1px;margin:6px 0 10px;text-shadow:0 0 8px rgba(255,0,0,.55);animation:fpb .6s infinite alternate;border:3px solid #ff2a2a;padding:8px;background:rgba(80,0,0,.35)}@keyframes fpb{from{opacity:1}to{opacity:.65}}';
  document.head.appendChild(st);
})();

/* ===== v3.4 (часть C): «Свои люди» — друзья, девушка, тайный поклонник ===== */
(function () {
  const G = window.G, D = G.D, C = G.clamp;
  const F = () => G.s.flags;
  const msg = (t, c) => G.toast(t, c);
  const sp = n => G.spend(n || 1);
  const WORKPH = () => G.s.phase === 'work' || G.s.phase === 'lunch';
  const first = id => (D.NPC[id] ? D.NPC[id].name.split(' ')[0] : id);

  // ---------- Кто вообще может стать другом (не все!) и что для этого нужно
  const DEF = { rel: 60, talks: 6, help: 3, coll: 50 };
  const FR = {
    seryoga: {}, afonya: {}, vityok: {}, mikhalych: {}, palych: {},
    kolyan: { rel: 45, talks: 3, help: 1, coll: 35 },
    zahar: { rel: 50, talks: 4, help: 2, coll: 40 },
    khomyak: {}, rafik: { rel: 65 }, lyosha: {}, egorych: { talks: 0, help: 4 },
    nyura: { rel: 55, talks: 5, help: 3, coll: 40 },
    stepanych: { rel: 65, rank: 2 },
    semyonych: { rel: 65, x: s => !!s.car.union, xt: 'надо вступить в профсоюз' }
  };
  G.friendable = id => !!FR[id] && !!D.NPC[id];
  G.friends = function () {
    const f = F(); if (!f.friends) f.friends = [];
    return f.friends.filter(id => D.NPC[id]);
  };
  G.isFriend = id => G.friends().indexOf(id) >= 0;
  G.friendReq = function (id) {
    const s = G.s, r = G.R(id), q = Object.assign({}, DEF, FR[id] || {}), miss = [];
    if (r.l < q.rel) miss.push('уважение ' + Math.round(r.l) + '/' + q.rel);
    if ((r.talks || 0) < q.talks) miss.push('разговоров ' + (r.talks || 0) + '/' + q.talks);
    if ((r.help || 0) < q.help) miss.push('помощи и подарков ' + (r.help || 0) + '/' + q.help);
    if (s.st.coll < q.coll) miss.push('твой статус в коллективе ' + Math.round(s.st.coll) + '/' + q.coll);
    if (q.rank && s.car.rank < q.rank) miss.push('нужна должность повыше');
    if (q.x && !q.x(s)) miss.push(q.xt);
    if (s.st.habit >= 60) miss.push('друзья не любят, когда ты в запое');
    return { ok: !miss.length, miss };
  };
  G.addFriend = function (id) {
    const f = F(), n = D.NPC[id]; G.friends();
    if (f.friends.indexOf(id) < 0) f.friends.push(id);
    delete f['shun_' + id];
    G.relAdd(id, 10);
    msg('🤝 ' + n.name + ' теперь в блоке «Свои люди»!', 'good');
    if (G.boardAdd) G.boardAdd(n.name + ' и ты — не разлей вода', 'good');
    if (G.xp) G.xp(30);
  };
  G.endFriend = function (id, why) {
    const f = F(); G.friends();
    const i = f.friends.indexOf(id); if (i < 0) return;
    f.friends.splice(i, 1); G.R(id).l = Math.min(G.R(id).l, 20); G.R(id).l -= 10; G.R(id).help = 0;
    f.frLost = (f.frLost || 0) + 1;
    msg('💔 ' + D.NPC[id].name + ' больше не в «Своих людях»: ' + why, 'bad');
    if (G.boardAdd) G.boardAdd('Дружба с ' + D.NPC[id].name + ' дала трещину', 'bad');
  };
  G.friendOffer = function (id) {
    const s = G.s, n = D.NPC[id], r = G.R(id), q = G.friendReq(id), face = id;
    if (r.askDay !== undefined && s.t.day - r.askDay < 7) { G.info(n.name, '«Мы же недавно говорили об этом. Не гони лошадей».'); return; }
    if (!q.ok) {
      G.modal({ title: n.name, face, text: '«Дружба — штука серьёзная. Мы пока просто знакомые».<br><small>Чтобы подружиться, не хватает: ' + q.miss.join('; ') + '.</small>', opts: [{ t: 'Понял, буду стараться', fn: () => {} }] });
      return;
    }
    r.askDay = s.t.day;
    if (G.chance(85)) { G.modal({ title: n.name, face, text: '«Знаешь… а давай. Ты нормальный человек. Теперь ты — свой».', opts: [{ t: '🤝 По рукам', fn: () => G.addFriend(id) }] }); }
    else { G.relAdd(id, -2); G.modal({ title: n.name, face, text: '«Дружить — не вопрос, но не сегодня. Присмотрюсь ещё».', opts: [{ t: 'Ладно', fn: () => {} }] }); }
  };

  // кнопки в меню персонажей
  const _sp = G.npcSpecial;
  G.npcSpecial = function (id) {
    const o = _sp.apply(this, arguments);
    try {
      if (G.friendable(id) && !G.isShunned(id)) {
        if (G.isFriend(id)) o.push({ t: '🤝 Меню друга', fn: () => G.friendMenu(id) });
        else o.push({ t: '🤝 Предложить дружить', fn: () => G.friendOffer(id) });
      }
    } catch (e) {}
    return o;
  };

  // помощь/подарки засчитываются в «помогал»
  const _gift = G.gift;
  G.gift = function (id, item) { const r = G.R(id), l0 = r.l, r0 = _gift.apply(this, arguments); try { if (G.R(id).l > l0) G.R(id).help = (G.R(id).help || 0) + 1; } catch (e) {} return r0; };

  // ---------- Меню друга (формальнее после повышения)
  G.friendMenu = function (id) {
    const s = G.s, n = D.NPC[id], r = G.R(id), formal = s.car.rank >= 6, face = id;
    const intro = formal
      ? n.name + ' слегка кашлянул(а): «Здравствуй… ой, здравствуйте. Привычка. Ты теперь начальство, но для меня — всё тот же свой человек».'
      : n.name + ' кивает: «Ну, чем займёмся?»';
    const o = [];
    o.push({ t: '🗣 Поговорить по душам', fn: () => {
      r.talks = (r.talks || 0) + 1; G.fx({ mood: 4 }); G.relAdd(id, 3);
      msg(n.name + ': ' + G.pick(formal ? ['«Ты, главное, нас не забывай. Мы за тебя горой».', '«Поздравляю с должностью — заслужил. А мы тут по-старому».'] : ['«Жизнь — штука тяжёлая, но когда есть свои, терпимо».', '«Слушай, а помнишь, как мы…» — и дальше полчаса воспоминаний.', '«Держись, я рядом».']), 'good'); sp(1);
    } });
    if (id === 'seryoga' && G.seryogaMenu) o.push({ t: '😎 Приколы с Серёгой и помощь', fn: () => G.seryogaMenu() });
    if (id === 'afonya' && G.afonyaMenu) o.push({ t: '🎸 Приколы с Афоней', fn: () => G.afonyaMenu() });
    o.push({ t: '🤝 Помочь по работе (1 ч)', dis: WORKPH() ? null : 'Только на смене', fn: () => { G.fx({ coll: 3, energy: -5, cons: 1 }); G.relAdd(id, 3); r.help = (r.help || 0) + 1; msg('Подсобил(а) — друг оценил.', 'good'); sp(1); } });
    o.push({ t: '☕ Посидеть вместе (2 ч)', dis: G.isFree() ? null : 'Только вечером/в выходной', fn: () => { G.fx({ mood: 9, energy: 2 }); G.relAdd(id, 4); r.help = (r.help || 0) + 1; msg('Посидели, поговорили о жизни. Стало легче.', 'good'); sp(2); } });
    o.push({ t: '🙏 Попросить о помощи', fn: () => G.friendAsk(id) });
    o.push({ t: 'Закрыть', fn: () => {} });
    G.modal({ title: '🤝 ' + n.name, face, text: intro + '<br><small>Отношение: ' + Math.round(r.l) + ' · друзей всего: ' + G.friends().length + '</small>', opts: o });
  };
  G.friendAsk = function (id) {
    const s = G.s, n = D.NPC[id], r = G.R(id), o = [];
    if (r.askHelpDay !== undefined && s.t.day - r.askHelpDay < 3) { G.info(n.name, '«Я тебе только что помогал(а). Дай и другим вздохнуть, и мне».'); return; }
    if (r.l < 50) { G.info(n.name, '«Мы друзья, но не настолько. Пока».'); return; }
    const done = (t) => { r.askHelpDay = s.t.day; G.relAdd(id, -1); msg(t, 'good'); sp(1); };
    o.push({ t: '🍲 «Поделись обедом»', fn: () => { G.fx({ satiety: 20, mood: 2 }); done(n.name + ' разделил(а) с тобой обед: «Ешь, а то ветром сдует».'); } });
    o.push({ t: '🛡 «Прикрой, если что»', fn: () => { F().covered = s.t.day + 1; done(n.name + ' пообещал(а) прикрыть тебя перед мастером.'); } });
    o.push({ t: '🔧 «Подмени на часок»', dis: WORKPH() ? null : 'Только на смене', fn: () => { G.fx({ energy: 12, mood: 2 }); done(n.name + ' встал(а) за твой станок. Ты отдышался.'); } });
    o.push({ t: '💡 «Дай совет»', fn: () => { done(n.name + ': ' + G.pick(['«Егорыч любит водку и когда его слушают».', '«Щиплен любит коньяк и почтение».', '«Не пей по средам — Надежда Николаевна ходит».', '«Откладывай хоть чуть-чуть с зарплаты. Потом спасибо скажешь».'])); } });
    o.push({ t: 'Передумал', fn: () => {} });
    G.modal({ title: n.name + ': помощь', face: id, text: 'Что попросишь? Просить можно не чаще раза в 3 дня.', opts: o });
  };

  // ---------- Девушка (одна)
  G.girlfriend = function () {
    const s = G.s; let best = null;
    Object.keys(D.NPC).forEach(id => { const n = D.NPC[id]; if (!n.romance || !s.rel[id]) return; const r = s.rel[id]; if (r.stage >= 5 && r.l >= 30 && !s.flags['cheat_' + id]) { if (!best || r.l > s.rel[best].l) best = id; } });
    return best;
  };
  G.girlMenu = function (id) {
    const n = D.NPC[id], s = G.s;
    G.modal({ title: '💗 ' + n.name, face: id, text: n.name + ': «Я всегда на твоей стороне. Только не пей, ладно?»', opts: [
      { t: '💬 Поговорить', fn: () => G.talkTo(id) },
      { t: '🎁 Подарить', fn: () => G.giftMenu(id) },
      { t: '💘 Побыть вместе', dis: G.isFree() ? null : 'Только вечером/в выходной', fn: () => G.romanceMove(id) },
      { t: '📞 Позвонить', fn: () => G.callNpc(id) },
      { t: 'Закрыть', fn: () => {} }] });
  };

  // ---------- Блок «Свои люди» в интерфейсе
  G.friendsBlock = function () {
    const ids = G.friends(), gf = G.girlfriend(), adm = F().adm;
    let h = '<div class="card friends"><h3>🤝 Свои люди</h3>';
    if (!ids.length && !gf) h += '<div class="note">Пока никого. Общайся, помогай, дари подарки и расти в статусе — настоящие друзья появляются не сразу и не со всеми.</div>';
    else {
      h += '<div class="ppl">' + ids.map(id => '<button class="pp fr" onclick="G.friendMenu(\'' + id + '\')">' + G.faceHTML(id) + first(id) + '</button>').join('')
        + (gf ? '<button class="pp fr gf" onclick="G.girlMenu(\'' + gf + '\')">' + G.faceHTML(gf) + '💗 ' + first(gf) + '</button>' : '') + '</div>';
      h += '<div class="note">Чем больше друзей — тем легче жить: настроение, прикрытие перед начальством, помощь в трудную минуту.</div>';
    }
    if (adm && !adm.revealed) h += '<button class="btn" onclick="G.admGuess()">💗? Выяснить, кто в тебя влюбился</button>';
    return h + '</div>';
  };

  // ---------- Ежедневное и еженедельное: бонусы, потери
  const _dt = G.dailyTick;
  G.dailyTick = function () {
    const r = _dt.apply(this, arguments);
    try { friendsDaily(); admDaily(); } catch (e) { if (window.console) console.error(e); }
    return r;
  };
  const _wt = G.weeklyTick;
  G.weeklyTick = function () {
    const r = _wt.apply(this, arguments);
    try { friendsWeekly(); admWeekly(); } catch (e) { if (window.console) console.error(e); }
    return r;
  };
  function friendsDaily() {
    const s = G.s, f = F(), ids = G.friends().slice(), n = ids.length;
    if (n) { G.fx({ mood: Math.min(6, n * 1.5), energy: Math.min(4, n) }); }
    if (G.girlfriend()) G.fx({ mood: 3 });
    ids.forEach(id => {
      const r = G.R(id);
      if (f['shun_' + id]) return G.endFriend(id, 'из-за долгов он(а) больше не хочет тебя знать.');
      if (r.l < 20) return G.endFriend(id, 'вы поругались, и дружба закончилась.');
      if (r.l < 45 && f['warn_' + id] !== G.week()) { f['warn_' + id] = G.week(); msg('⚠ ' + D.NPC[id].name + ' стал(а) холоднее. Дружбе нужно внимание.', 'warn'); }
    });
    if (n && (s.car.snitch || 0) > (f.frSnitch || 0)) { f.frSnitch = s.car.snitch; ids.forEach(id => { if (G.chance(60)) { G.relAdd(id, -12); msg(D.NPC[id].name + ' слышал(а), что ты стучишь на своих. Это не по-дружески.', 'bad'); } }); }
    if (n && (s.car.thefts || 0) > (f.frThefts || 0)) { f.frThefts = s.car.thefts; ids.forEach(id => { if (G.chance(50)) { G.relAdd(id, -8); msg(D.NPC[id].name + ' узнал(а) про твои кражи. Лицо — кирпичом.', 'bad'); } }); }
  }
  function friendsWeekly() {
    const s = G.s, f = F(), ids = G.friends().slice();
    ids.forEach(id => {
      const r = G.R(id);
      if (G.week() - (r.last || 0) >= 4 && r.l > 60) { G.relAdd(id, -3); r.last = r.last; msg(D.NPC[id].name + ' давно тебя не видел(а). Дружба ржавеет без общения.', 'warn'); }
      if (s.st.habit >= 60 && G.chance(30)) { G.relAdd(id, -6); msg(D.NPC[id].name + ' переживает за твой запой и всё чаще отворачивается.', 'warn'); }
      if (G.chance(15)) {
        const w = G.pick([() => { G.addMoney(500); msg(D.NPC[id].name + ' угостил(а) тебя обедом и не взял(а) денег: +500 ₽ экономии.', 'good'); }, () => { G.fx({ mood: 6 }); msg(D.NPC[id].name + ' подкинул(а) анекдот про начальство. Полегчало.', 'good'); }, () => { G.fx({ coll: 2 }); msg(D.NPC[id].name + ' замолвил(а) за тебя словечко в курилке.', 'good'); }]);
        w();
      }
    });
  }
  // дружба рвётся и сразу, если уважение упало
  const _ra = G.relAdd;
  G.relAdd = function (id, d) {
    const r = _ra.apply(this, arguments);
    try { if (d < 0 && G.s.flags.friends && G.isFriend(id) && G.R(id).l < 20) G.endFriend(id, 'после этого дружить уже не получится.'); } catch (e) {}
    return r;
  };
  // друзья прикрывают перед начальством
  const _pun = G.punish;
  G.punish = function (a) {
    try {
      const ids = G.friends(), f = F(), n = ids.length;
      if (n && (a.sev || 0) < 2 && (f.covered >= G.s.t.day || G.chance(Math.min(35, n * 7)))) {
        const who = G.pick(ids); msg('🤝 ' + first(who) + ' прикрыл(а) тебя («' + (a.what || 'нарушение') + '»). Своих не сдают.', 'good');
        if (f.covered >= G.s.t.day) f.covered = 0; return;
      }
    } catch (e) {}
    return _pun.apply(this, arguments);
  };
  const _q = G.quality;
  G.quality = function () {
    let q = _q.apply(this, arguments);
    try { const n = G.friends().length; q += Math.min(6, n * 1.5); if ((F().inspired || 0) >= G.s.t.day) q += 8; q = C(Math.round(q), 0, 100); } catch (e) {}
    return q;
  };
  // формальнее после повышения + шанс раскрыть поклонницу в разговоре
  const _tk = G.talkTo;
  G.talkTo = function (id) {
    const r = _tk.apply(this, arguments);
    try {
      if (G.isFriend(id) && G.s.car.rank >= 6 && G.chance(40)) { msg(first(id) + ' по-дружески, но уже с уважением: «Теперь ты большой человек, а мы — рядом».'); G.relAdd(id, 1); }
      admTalk(id);
    } catch (e) {}
    return r;
  };

  // ---------- Тайный поклонник 💗?
  const ADMR = { tatyana: 1, lyudka: 1, tamara: 1, pelageya: 3, lidiya: 3, nadezhda: 4, ekaterina: 5, tatishcheva: 6 };
  const CLUE = {
    tatyana: 'кто-то, кто каждый день выдаёт тебе хлеб',
    lyudka: 'кто-то, кто громче всех гремит черпаком на раздаче',
    tamara: 'кто-то, кто знает про цех всё и моет за тобой пол',
    pelageya: 'кто-то, кто следит за охраной труда и краснеет при встрече',
    lidiya: 'кто-то, кто смотрит на тебя сверху — из кабины крана',
    nadezhda: 'кто-то строгий, с очень красной помадой',
    ekaterina: 'кто-то, кто сидит в ОТК и никогда не улыбается… почти',
    tatishcheva: 'кто-то из кабинета кадров, у кого всегда папка в руках'
  };
  G.admirerMark = function () { const a = G.s && G.s.flags && G.s.flags.adm; return a && !a.revealed ? ' <span class="adm-mark" title="Кто-то в тебя влюблён…">💗?</span>' : ''; };
  const admBad = () => { const s = G.s, st = s.st; return st.drunk >= 30 || st.habit >= 40 || st.neat < 35 || s.hang > 0; };
  function admPool() { const s = G.s, gf = G.girlfriend(); return Object.keys(ADMR).filter(id => ADMR[id] <= s.car.rank + 1 && D.NPC[id] && G.R(id).stage < 5 && id !== gf && !s.flags['cheat_' + id]); }
  function admWeekly() {
    const s = G.s, st = s.st, f = F();
    const good = st.neat >= 60 && st.mood >= 55 && st.habit < 25 && !s.hang;
    f.admStreak = good ? (f.admStreak || 0) + 1 : 0;
    if (!f.adm && good && f.admStreak >= 2 && G.week() >= (f.admCool || 0) && (f.admTotal || 0) < 4 && G.chance(35)) {
      const pool = admPool(); if (!pool.length) return;
      f.adm = { id: G.pick(pool), wk: G.week(), hints: [], strikes: 0, revealed: false }; f.admTotal = (f.admTotal || 0) + 1;
      G.modal({ title: '💗?', text: 'Ты замечаешь странное: на шкафчике кто-то оставил записку без подписи, а в курилке шепчутся и поглядывают на тебя. Похоже, <b>в тебя кто-то влюбился</b>. Кто — загадка.<br><small>Рядом с твоим именем появился значок 💗?. Общайся с людьми — они проболтаются. Только не пей и ходи опрятным: иначе сердечко исчезнет.</small>', opts: [{ t: 'Интересно…', fn: () => {} }] });
    }
  }
  function admDaily() {
    const s = G.s, f = F(), a = f.adm; if (!a) return;
    if (admBad() && a.strikeDay !== s.t.day) {
      a.strikeDay = s.t.day; a.strikes++;
      if (a.strikes === 1) msg(a.revealed ? '⚠ ' + first(a.id) + ' косится на твой вид: «Опять?»' : '💗? Сердечко мигает. Похоже, тот, кто в тебя влюбился, разочаровывается.', 'warn');
      else if (a.strikes >= 2) {
        if (a.revealed) { G.relAdd(a.id, -20); msg('💔 ' + D.NPC[a.id].name + ' в тебе разочаровалась. «Я думала, ты другой».', 'bad'); }
        else msg('💔 Сердечко с вопросом исчезло. Кто бы в тебя ни влюбился — он(а) передумал(а).', 'bad');
        f.adm = null; f.admCool = G.week() + 6; f.admStreak = 0;
      }
    } else if (!admBad() && a.strikes > 0 && G.chance(25)) a.strikes--;
  }
  function admTalk(id) {
    const s = G.s, f = F(), a = f.adm; if (!a || a.revealed) return;
    if (id === a.id) { if (G.chance(30) && (a.hints.length || G.chance(50))) return admReveal(); msg(first(id) + ' почему-то отводит глаза и теребит край халата.', 'warn'); if (a.hints.indexOf(id) < 0) a.hints.push(id); return; }
    if (D.NPC[id] && G.chance(18) && a.hints.indexOf('c') < 0) { a.hints.push('c'); msg('🗣 ' + first(id) + ' шепчет: «А ты знаешь, это ' + CLUE[a.id] + '… Я ничего не говорил(а)».', 'good'); }
  }
  function admReveal() {
    const s = G.s, f = F(), a = f.adm, id = a.id, n = D.NPC[id];
    a.revealed = true; const r = G.R(id); r.met = true; r.stage = Math.max(r.stage, 2); G.relAdd(id, 20);
    f.inspired = s.t.day + 5; G.fx({ mood: 15, cool: 4, coll: 2 }); G.give('choco', 1); if (G.xp) G.xp(40);
    if (G.achieve) G.achieve('admirer', 'Разгадал тайного поклонника');
    if (G.boardAdd) G.boardAdd('У кого-то на заводе появилась любовь. Остальные завидуют', 'good');
    G.modal({ title: '💗 ВОТ КТО В ТЕБЯ ВЛЮБИЛСЯ', face: id, vib: 'success', cls: 'good', text: 'Это <b>' + n.name + '</b>! Она краснеет и протягивает шоколадку: «Ну… ты же сам догадался».<br><b>Бонус:</b> 5 дней вдохновения (качество работы +8), настроение +15, вы теперь на «Симпатии», а дальше всё зависит от тебя. Но если снова запьёшь — она передумает.', opts: [{ t: 'Ура!', fn: () => {} }] });
  }
  G.admGuess = function () {
    const s = G.s, f = F(), a = f.adm; if (!a || a.revealed) return;
    if (a.guessDay === s.t.day) { G.info('💗?', 'Сегодня ты уже гадал(а). Подожди до завтра.'); return; }
    if (!a.hints.length) { G.info('💗?', 'Пока ты вообще не знаешь, с чего начать. Поговори с людьми — кто-нибудь проболтается.'); return; }
    const pool = admPool().filter(x => x !== a.id), decoys = []; while (pool.length && decoys.length < 3) decoys.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    const cand = decoys.concat([a.id]).sort(() => Math.random() - 0.5);
    G.modal({ title: '💗? Кто же это?', text: 'Что тебе известно: <i>' + (a.hints.indexOf('c') >= 0 ? CLUE[a.id] : 'кто-то явно смущается при встрече') + '</i>.<br>Выбери, к кому подойти (1 час):', opts: cand.map(id => ({ t: first(id) + ' — ' + D.NPC[id].role, fn: () => {
      a.guessDay = s.t.day; sp(1);
      if (id === a.id) admReveal();
      else { G.fx({ mood: -3 }); G.relAdd(id, -3); msg(first(id) + ' удивлённо смотрит: «С чего ты взял(а)? Нет». Неловко.', 'bad'); }
    } })).concat([{ t: 'Не сейчас', fn: () => {} }]) });
  };

  const st = document.createElement('style');
  st.textContent = '.card.friends h3{margin-bottom:6px}.pp.fr{border-color:#6a8f4e}.pp.gf{border-color:#d46a8f}.adm-mark{color:#ff6fa5;font-size:.85em;margin-left:4px;animation:admb 1.2s infinite alternate}@keyframes admb{from{opacity:1}to{opacity:.45}}';
  document.head.appendChild(st);
})();

/* ===== v3.4 (часть D): телефон — блокировка без аппарата, батарея, приложения, мини-игры ===== */
(function () {
  const G = window.G, D = G.D, C = G.clamp, MG = G.MG;
  const F = () => G.s.flags;
  const msg = (t, c) => G.toast(t, c);
  const WORKPH = () => G.s.phase === 'work' || G.s.phase === 'lunch';
  const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  // ---------- Телефон: наличие, тип, батарея
  G.phoneItem = function () {
    const s = G.s; if (!s || !s.own) return null; let best = null;
    Object.keys(s.own).forEach(k => { const it = D.STATUS[k]; if (it && it.tier === 'phone' && (!best || it.v > best.v)) best = it; });
    return best;
  };
  G.phoneTier = function () { const p = G.phoneItem(); return !p ? 0 : (p.v < 1 ? 1 : 2); }; // 0 нет, 1 кнопочный, 2 смартфон
  const bat = () => { const f = F(); if (f.bat === undefined) f.bat = 100; return f.bat; };
  G.phoneBattery = bat;
  G.phoneDrain = function (n) { const f = F(); f.bat = C(bat() - n, 0, 100); };
  // доступ: need = 1 (любой телефон), 2 (смартфон)
  G.phoneOk = function (need) {
    const t = G.phoneTier();
    if (!t) { G.info('📵 Нет телефона', 'Телефона у тебя нет, поэтому звонки, сообщения, игры и приложения недоступны. Купи в ТЦ «Золотой Чугун»: кнопочный «Кирпич» стоит всего 1 500 ₽, смартфон — дороже.'); return false; }
    if (need > t) { G.info('📱 Нужен смартфон', 'Это приложение не запускается на кнопочном телефоне. Купи смартфон в ТЦ.'); return false; }
    if (bat() <= 0) { G.info('🪫 Телефон разряжен', 'Батарея села. Поставь телефон на зарядку дома (или просто выспись — ночью он зарядится).'); return false; }
    return true;
  };
  const _adv = G.advance;
  G.advance = function (h) { const r = _adv.apply(this, arguments); try { if (G.phoneTier()) G.phoneDrain((G.phoneTier() === 1 ? 0.4 : 1.1) * h); } catch (e) {} return r; };
  const _sl = G.sleep;
  G.sleep = function () { const r = _sl.apply(this, arguments); try { if (G.phoneTier()) F().bat = 100; } catch (e) {} return r; };

  // ---------- Блокировка старых точек входа
  const lock = () => (G.phoneTier() ? null : 'Нет телефона (купи в ТЦ)');
  ['phone_w', 'phone_h'].forEach(id => { const a = G.ACT[id]; if (a) { a.req = () => lock(); a.n = a.n; } });
  const _cn = G.callNpc; G.callNpc = function (id) { if (!G.phoneOk(1)) return; G.phoneDrain(3); return _cn.apply(this, arguments); };
  const _cr = G.callRandom; G.callRandom = function () { if (!G.phoneOk(1)) return; G.phoneDrain(3); return _cr.apply(this, arguments); };
  G.A('phone_charge', { ph: ['free'], loc: 'home', g: 'Дом', n: 'Поставить телефон на зарядку (1 ч)', i: '🔌', h: 1, req: () => !G.phoneTier() ? 'Нет телефона' : bat() >= 95 ? 'Телефон уже заряжен' : null, fn: s => { F().bat = C(bat() + 45, 0, 100); msg('🔌 Телефон зарядился: ' + Math.round(bat()) + '%.', 'good'); }, txt: 'Розетка, провод, тишина.' });

  // ---------- Общие приёмы
  function fun(base) { const s = G.s; const c = s.day.fun = (s.day.fun || 0) + 1; return Math.round(base * (c <= 3 ? 1 : 0.4)); }
  function workRisk(risk, what) { if (WORKPH()) { G.s.day.breaks = (G.s.day.breaks || 0) + 1; G.caught({ risk, fine: [100, 250], what }); } }
  const spend1 = () => G.spend(1);

  // ---------- Мини-игры
  const wrap = (el, spec, inner) => { el.innerHTML = '<div class="mg"><div class="mg-title">' + (spec.title || '') + '</div><div class="mg-hint">' + (spec.hint || '') + '</div>' + inner + '</div>'; };

  MG.snake = function (el, spec, done) {
    const N = 12, cell = 20; let alive = true, snake = [[5, 6], [4, 6], [3, 6]], dir = [1, 0], nd = [1, 0], apple = [9, 6], score = 0, tm;
    wrap(el, spec, '<div class="mg-round" id="sc">Яблок: 0</div><canvas id="cv" width="' + N * cell + '" height="' + N * cell + '" style="display:block;margin:0 auto;background:#0e0d0c;border:2px solid #000"></canvas><div class="ph-pad"><button class="btn" data-d="0,-1">▲</button><div><button class="btn" data-d="-1,0">◀</button><button class="btn" data-d="1,0">▶</button></div><button class="btn" data-d="0,1">▼</button></div><button class="btn" id="end">Закончить</button>');
    const cv = el.querySelector('#cv'), x = cv.getContext('2d'), sc = el.querySelector('#sc');
    const place = () => { do { apple = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; } while (snake.some(p => p[0] === apple[0] && p[1] === apple[1])); };
    const draw = () => { x.fillStyle = '#0e0d0c'; x.fillRect(0, 0, N * cell, N * cell); x.fillStyle = '#e74c3c'; x.fillRect(apple[0] * cell + 3, apple[1] * cell + 3, cell - 6, cell - 6); snake.forEach((p, i) => { x.fillStyle = i ? '#6fb06a' : '#b9e36b'; x.fillRect(p[0] * cell + 1, p[1] * cell + 1, cell - 2, cell - 2); }); };
    const stop = () => { if (!alive) return; alive = false; clearInterval(tm); done(Math.min(1, score / 8)); };
    el.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const d = b.dataset.d.split(',').map(Number); if (d[0] !== -dir[0] || d[1] !== -dir[1]) nd = d; }; });
    el.querySelector('#end').onclick = stop;
    tm = setInterval(() => {
      dir = nd; const h = [snake[0][0] + dir[0], snake[0][1] + dir[1]];
      if (h[0] < 0 || h[1] < 0 || h[0] >= N || h[1] >= N || snake.some(p => p[0] === h[0] && p[1] === h[1])) return stop();
      snake.unshift(h); if (h[0] === apple[0] && h[1] === apple[1]) { score++; sc.textContent = 'Яблок: ' + score; place(); } else snake.pop(); draw();
    }, 220); draw();
    spec._score = () => score;
    return () => { alive = false; clearInterval(tm); };
  };

  MG.sapper = function (el, spec, done) {
    const N = 6, M = 6; let open = {}, flag = {}, mines = {}, mode = 0, over = false, first = true;
    const key = (a, b) => a + ',' + b;
    wrap(el, spec, '<div class="mg-round" id="st">Мин: ' + M + '</div><div id="gr" class="ph-grid6"></div><button class="btn" id="md">Режим: открывать</button>');
    const gr = el.querySelector('#gr'), st = el.querySelector('#st'), md = el.querySelector('#md');
    const nb = (a, b) => { let c = 0; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if ((i || j) && mines[key(a + i, b + j)]) c++; return c; };
    function plant(a, b) { let k = 0; while (k < M) { const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N); if (mines[key(x, y)] || (Math.abs(x - a) <= 1 && Math.abs(y - b) <= 1)) continue; mines[key(x, y)] = 1; k++; } }
    function flood(a, b) { if (a < 0 || b < 0 || a >= N || b >= N || open[key(a, b)] || mines[key(a, b)]) return; open[key(a, b)] = 1; if (!nb(a, b)) for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) flood(a + i, b + j); }
    function render() {
      gr.innerHTML = ''; for (let b = 0; b < N; b++) for (let a = 0; a < N; a++) {
        const k = key(a, b), btn = document.createElement('button'); btn.className = 'btn ph-c' + (open[k] ? ' op' : '');
        btn.textContent = open[k] ? (mines[k] ? '💥' : (nb(a, b) || '')) : flag[k] ? '🚩' : (over && mines[k] ? '💣' : '');
        btn.onclick = () => click(a, b); gr.appendChild(btn);
      }
    }
    function finish(win) { over = true; render(); setTimeout(() => done(win ? 1 : 0.15), 700); }
    function click(a, b) {
      if (over) return; const k = key(a, b);
      if (mode) { if (!open[k]) { flag[k] = !flag[k]; render(); } return; }
      if (flag[k] || open[k]) return;
      if (first) { plant(a, b); first = false; }
      if (mines[k]) { open[k] = 1; return finish(false); }
      flood(a, b); render();
      if (Object.keys(open).length >= N * N - M) finish(true);
    }
    md.onclick = () => { mode = mode ? 0 : 1; md.textContent = 'Режим: ' + (mode ? 'флажок' : 'открывать'); };
    render(); return () => { over = true; };
  };

  MG.memory = function (el, spec, done) {
    const ic = ['🔧', '⚙️', '🔩', '🧰', '🛠️', '🔥', '🧲', '🪛'], deck = ic.concat(ic).sort(() => Math.random() - 0.5); let sel = [], found = 0, moves = 0, lock = false, alive = true;
    wrap(el, spec, '<div class="mg-round" id="st">Ходов: 0</div><div id="gr" class="ph-grid4"></div>');
    const gr = el.querySelector('#gr'), st = el.querySelector('#st');
    deck.forEach((v, i) => { const b = document.createElement('button'); b.className = 'btn ph-c'; b.dataset.i = i; b.onclick = () => {
      if (lock || b.classList.contains('op') || !alive) return; b.textContent = v; b.classList.add('op'); sel.push([b, v]);
      if (sel.length === 2) { moves++; st.textContent = 'Ходов: ' + moves; lock = true;
        if (sel[0][1] === sel[1][1]) { found++; sel = []; lock = false; if (found === 8) { alive = false; setTimeout(() => done(C(1 - (moves - 8) / 14, 0.2, 1)), 500); } }
        else setTimeout(() => { sel.forEach(p => { p[0].textContent = ''; p[0].classList.remove('op'); }); sel = []; lock = false; }, 650); }
    }; gr.appendChild(b); });
    return () => { alive = false; };
  };

  const QUIZ = [
    ['Что надевают в цеху «всегда, даже если голова уже дырявая»?', ['Каску', 'Шляпу', 'Наушники'], 0],
    ['Как часто проводят повторный инструктаж по охране труда?', ['Раз в полгода', 'Раз в пять лет', 'По праздникам'], 0],
    ['Кто на проходной любит водку и когда его слушают?', ['Егорыч', 'Гоша «Танк»', 'Рафик'], 0],
    ['В какой день недели приходит проверяющая по охране труда?', ['В среду', 'В понедельник', 'В субботу'], 0],
    ['Как зовут рыжего кота на заводе?', ['Чугунок', 'Барсик', 'Станок'], 0],
    ['Сколько стоит базовый обед «борщ со сметаной» в этой столовой?', ['70 ₽', '700 ₽', '7 ₽'], 0],
    ['После какого супа «метеоризм начинается всегда»?', ['Горохового', 'Борща', 'Лапши'], 0],
    ['Как называется завод в игре?', ['АО «Чугунный век»', 'ООО «Сталь-Плюс»', 'ЗАО «Железка»'], 0],
    ['Кто на кухне гремит черпаком?', ['Людка', 'Тамара', 'Лидия'], 0],
    ['Что делает мастер, когда ты опоздал?', ['Записывает в журнал', 'Дарит премию', 'Угощает чаем'], 0]
  ];
  MG.quiz = function (el, spec, done) {
    const qs = QUIZ.slice().sort(() => Math.random() - 0.5).slice(0, 5); let i = 0, good = 0, alive = true;
    function show() {
      if (!alive) return; if (i >= qs.length) { alive = false; return done(good / qs.length); }
      const q = qs[i], ord = q[1].map((t, k) => [t, k]).sort(() => Math.random() - 0.5);
      wrap(el, spec, '<div class="mg-round">Вопрос ' + (i + 1) + ' / ' + qs.length + '</div><div style="margin:8px 0">' + esc(q[0]) + '</div>' + ord.map(o => '<button class="btn" data-k="' + o[1] + '">' + esc(o[0]) + '</button>').join(''));
      el.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { if (+b.dataset.k === q[2]) good++; i++; show(); }; });
    }
    show(); return () => { alive = false; };
  };

  const GAMES = {
    snake: { n: 'Змейка', i: '🐍', smart: 1, hint: 'Ешь яблоки, не врезайся.', bat: 5 },
    sapper: { n: 'Сапёр', i: '💣', smart: 2, hint: 'Найди все безопасные клетки. 🚩 — флажок на мину.', bat: 6 },
    memory: { n: 'Найди пару', i: '🧠', smart: 2, hint: 'Запомни инструменты и найди пары.', bat: 6 },
    quiz: { n: 'Викторина «Чугунный умник»', i: '❓', smart: 2, hint: '5 вопросов про завод и жизнь.', bat: 4 }
  };
  G.playGame = function (id) {
    const g = GAMES[id], s = G.s; if (!g || !G.phoneOk(g.smart)) return;
    G.phoneDrain(g.bat);
    G.mini(id, { title: g.i + ' ' + g.n, hint: g.hint }, res => {
      const sc = (res && res.score) || 0, f = F(), best = f['hs_' + id] || 0;
      const mood = fun(Math.round(2 + 7 * sc)); G.fx({ mood: mood, know: id === 'quiz' ? Math.round(3 * sc) : 0 });
      let t = g.n + ': результат ' + Math.round(sc * 100) + '%. Настроение +' + mood + '.';
      if (sc > best) { f['hs_' + id] = sc; if (best) t += ' Новый рекорд!'; }
      if ((id === 'quiz' && sc >= 0.8 || id === 'sapper' && sc >= 1) && s.day.prize !== 1) { s.day.prize = 1; G.addMoney(150); t += ' Приз от оператора: +150 ₽.'; }
      msg(t, sc >= 0.6 ? 'good' : ''); workRisk(15, 'Игры на работе'); spend1();
    });
  };
  G.gamesMenu = function () {
    if (!G.phoneOk(1)) return; const t = G.phoneTier(), f = F();
    G.modal({ title: '🎮 Игры', text: 'Заряд: ' + Math.round(bat()) + '%' + (t === 1 ? '<br><small>На кнопочном телефоне есть только «Змейка».</small>' : ''), opts: Object.keys(GAMES).map(id => { const g = GAMES[id]; return { t: g.i + ' ' + g.n + (f['hs_' + id] ? ' · рекорд ' + Math.round(f['hs_' + id] * 100) + '%' : ''), dis: g.smart > t ? 'Нужен смартфон' : null, fn: () => G.playGame(id) }; }).concat([{ t: 'Назад', fn: () => {} }]) });
  };

  // ---------- Приложения
  const FEED = ['Чей-то кот упал с шкафа. Кот в порядке, интернет — нет.', 'Рецепт борща из трёх ингредиентов. Один из них — «надежда».', 'Блогер доказывает, что земля плоская, на фоне глобуса.', 'Знакомый выложил фото из отпуска. Зависть бьёт по настроению.', 'Новости: «Цены выросли, зарплата — задумалась».', 'Мем про начальника: смешно, но узнаваемо до слёз.', 'Подруга бывшей женила кота. Ты лайкнул случайно.', 'Видео: мужик чинит станок молотком. Работает.'];
  const APPS = [
    { id: 'contacts', i: '📲', n: 'Контакты', need: 1, fn: () => { const s = G.s, ids = G.friends().concat(D.NPC_ORDER.filter(id => s.rel[id] && s.rel[id].met && (s.rel[id].l >= 10 || s.rel[id].stage >= 1) && !G.isFriend(id))).slice(0, 12); if (!ids.length) { G.info('📲 Контакты', 'В записной книжке пока пусто. Знакомься с людьми на заводе.'); return; } G.modal({ title: '📲 Контакты', wide: true, opts: ids.map(id => ({ t: (G.isFriend(id) ? '🤝 ' : '📞 ') + D.NPC[id].name, fn: () => G.callNpc(id) })).concat([{ t: 'Назад', fn: () => {} }]) }); } },
    { id: 'sms', i: '💬', n: 'Сообщения', need: 1, fn: () => G.smsMenu() },
    { id: 'games', i: '🎮', n: 'Игры', need: 1, fn: () => G.gamesMenu() },
    { id: 'feed', i: '🌐', n: 'Контактик', need: 2, fn: () => { G.phoneDrain(3); const m = G.pick([4, 5, 6, -2]); G.fx({ mood: m > 0 ? fun(m) : m }); msg('Лента: ' + G.pick(FEED), m > 0 ? '' : 'warn'); workRisk(12, 'Телефон на рабочем месте'); spend1(); } },
    { id: 'video', i: '▶️', n: 'Ютабчик', need: 2, fn: () => { G.modal({ title: '▶️ Ютабчик', text: 'Что смотрим?', opts: [
      { t: '🐱 Коты', fn: () => { G.phoneDrain(7); G.fx({ mood: fun(8) }); msg('Кот лучше начальника. Мнение окончательное.', 'good'); workRisk(15, 'Видео на рабочем месте'); spend1(); } },
      { t: '🎓 Лекция по сварке', fn: () => { G.phoneDrain(7); G.fx({ know: 3, mood: -1, energy: -2 }); msg('Узнал новое про швы. Голова тяжёлая, зато умная.', 'good'); workRisk(15, 'Видео на рабочем месте'); spend1(); } },
      { t: '📰 Новости', fn: () => { G.phoneDrain(6); G.fx({ mood: -4, know: 1 }); msg('Лучше бы не смотрел.', 'warn'); workRisk(15, 'Видео на рабочем месте'); spend1(); } },
      { t: 'Назад', fn: () => {} }] }); } },
    { id: 'camera', i: '📷', n: 'Камера', need: 2, fn: () => { G.phoneDrain(3); const st = G.s.st, ok = st.neat >= 55 && st.drunk < 15 && st.mood >= 40; if (ok) { G.fx({ cool: 1, mood: fun(4) }); msg('Селфи удалось: ты выглядишь неплохо. Лайки капают.', 'good'); } else { G.fx({ mood: -3 }); msg('Селфи вышло… тревожным. Лучше удалить.', 'warn'); } workRisk(10, 'Фото на рабочем месте'); spend1(); } },
    { id: 'music', i: '🎵', n: 'Плеер', need: 2, fn: () => G.modal({ title: '🎵 Плеер', text: 'Что включить?', opts: [
      { t: '🎸 Рок', fn: () => { G.phoneDrain(4); G.fx({ energy: 5, mood: fun(3) }); msg('Рок заряжает. Станки даже не гудят в ответ.', 'good'); spend1(); } },
      { t: '🎻 Классика', fn: () => { G.phoneDrain(4); G.fx({ mood: fun(5), know: 1 }); msg('Бах и сварка — странное сочетание, но работает.', 'good'); spend1(); } },
      { t: '🎤 Шансон', fn: () => { G.phoneDrain(4); G.fx({ mood: fun(6), coll: 1 }); msg('Шансон объединяет цех лучше профсоюза.', 'good'); spend1(); } },
      { t: 'Назад', fn: () => {} }] }) },
    { id: 'news', i: '🗞', n: 'Новости завода', need: 2, fn: () => { G.phoneDrain(2); const b = (F().board || []).slice(0, 6); G.info('🗞 Новости завода', b.length ? b.map(x => (x.k === 'bad' ? '🔻 ' : '🔹 ') + esc(x.t)).join('<br>') : 'Пока тихо. Даже слухи взяли выходной.'); } },
    { id: 'horo', i: '🔮', n: 'Гороскоп', need: 2, fn: () => { const s = G.s; if (s.day.horo) { G.info('🔮 Гороскоп', 'Сегодня звёзды уже всё сказали. Повторов не будет.'); return; } s.day.horo = 1; G.phoneDrain(1); const r = G.pick([['Звёзды: «День будет лёгким».', { mood: 5 }], ['Звёзды: «Осторожнее с начальством».', { boss: -1, mood: -1 }], ['Звёзды: «Деньги придут неожиданно».', { money: 200 }], ['Звёзды молчат. Вселенная ушла на обед.', {}]]); G.fx(r[1]); msg('🔮 ' + r[0]); } },
    { id: 'prank', i: '🤡', n: 'Пранк-звонок', need: 1, fn: () => { const s = G.s; G.phoneDrain(3); G.fx({ mood: fun(G.ri(8, 14)) }); s.flags.prank = (s.flags.prank || 0) + 1; msg('Ты звонишь незнакомцу и пищишь «Алло, это прачечная?». Жизнь прекрасна.'); if (G.chance(Math.min(15, 3 * s.flags.prank))) { msg('Хулиган из соседнего подъезда вычислил тебя и дал в глаз.', 'bad'); G.fx({ health: -8, mood: -10, fights: 1 }); } spend1(); } },
    { id: 'bank', i: '🏦', n: 'Банк', need: 2, fn: () => { G.phoneDrain(2); G.bankMenu(); } },
    { id: 'shop', i: '🛍', n: 'Магазин', need: 2, fn: () => { G.phoneDrain(2); G.shopMenu(); } },
    { id: 'blog', i: '🎥', n: 'ЧугунTV', need: 2, fn: () => { G.phoneDrain(2); G.blogMenu(); } }
  ];
  G.phoneApp = function (id) { const a = APPS.find(x => x.id === id); if (!a || !G.phoneOk(a.need)) return; a.fn(); };
  G.phoneMenu = function () {
    if (!G.phoneOk(1)) return; const t = G.phoneTier();
    G.modal({ title: '📱 ' + (G.phoneItem().n) + ' · 🔋 ' + Math.round(bat()) + '%', wide: true, opts: APPS.map(a => ({ t: a.i + ' ' + a.n, dis: a.need > t ? 'Нужен смартфон' : null, fn: () => G.phoneApp(a.id) })).concat([{ t: 'Закрыть', fn: () => {} }]) });
  };

  // SMS
  G.smsMenu = function () {
    const s = G.s, gf = G.girlfriend(), ids = G.friends().concat(gf ? [gf] : []).concat(D.NPC_ORDER.filter(id => s.rel[id] && s.rel[id].met && s.rel[id].l >= 20 && !G.isFriend(id) && id !== gf)).slice(0, 10);
    if (!ids.length) { G.info('💬 Сообщения', 'Писать пока некому. Для начала познакомься с людьми.'); return; }
    G.modal({ title: '💬 Кому написать?', wide: true, opts: ids.map(id => ({ t: (id === gf ? '💗 ' : G.isFriend(id) ? '🤝 ' : '') + D.NPC[id].name, fn: () => G.smsTo(id) })).concat([{ t: 'Назад', fn: () => {} }]) });
  };
  G.smsTo = function (id) {
    const s = G.s, n = D.NPC[id], t = G.phoneTier(), d = s.day.sms = s.day.sms || {};
    const reply = () => G.pick(['«Ха, привет! Как сам?»', '«Занят, но рад тебя слышать».', '«Ты пишешь — значит, не забыл. Приятно».', '«Скинь потом фотку, обсудим».', '«Ну ты даёшь…»']);
    const send = (what, mood, rel) => { G.phoneDrain(2); d[id] = (d[id] || 0) + 1; const k = d[id] <= 2 ? 1 : 0.2; G.fx({ mood: fun(mood) }); G.relAdd(id, rel * k); if (G.R(id)) G.R(id).last = G.week(); msg(n.name + ': ' + reply(), 'good'); workRisk(8, 'Переписка на рабочем месте'); spend1(); };
    G.modal({ title: '💬 ' + n.name, face: id, text: 'Что напишешь?' + (d[id] >= 2 ? '<br><small>Сегодня вы уже много переписывались — эффект слабее.</small>' : ''), opts: [
      { t: '👋 «Как дела?»', fn: () => send('', 2, 2) },
      { t: '😂 Скинуть мем', dis: t < 2 ? 'Нужен смартфон' : null, fn: () => send('', 4, 3) },
      { t: '🍻 Позвать посидеть вечером', dis: G.isFree() ? null : 'Только вечером/в выходной', fn: () => { G.phoneDrain(2); G.relAdd(id, 4); G.fx({ mood: 6 }); msg(n.name + ' согласился(ась): посидели, поболтали.', 'good'); spend1(); G.spend(1); } },
      { t: 'Передумал', fn: () => {} }] });
  };

  // ---------- Экран вкладки «Телефон»
  G.phoneScreen = function () {
    const s = G.s, t = G.phoneTier(), p = G.phoneItem();
    const util = '';
    if (!t) return '<div class="phone off"><div class="ph-status"><span>📵 Нет сети</span><span>—</span></div><div class="ph-lock"><b>📵</b><div>У тебя нет телефона</div><small>Звонки, сообщения, игры и приложения недоступны. Купи аппарат в ТЦ «Золотой Чугун» (вкладка «Город»): кнопочный — от 1 500 ₽.</small></div></div>' + util;
    const b = Math.round(bat()), dead = b <= 0;
    let h = '<div class="phone' + (dead ? ' off' : '') + '"><div class="ph-status"><span>📶 ' + esc(p.n) + '</span><span>🔋 ' + b + '%</span></div>';
    h += '<div class="ph-bat"><i style="width:' + b + '%;background:' + (b < 20 ? '#c0392b' : '#6fb06a') + '"></i></div>';
    if (dead) h += '<div class="ph-lock"><b>🪫</b><div>Телефон разряжен</div><small>Зарядится ночью или в действии «Поставить телефон на зарядку» дома.</small></div>';
    else h += '<div class="ph-apps">' + APPS.map(a => '<button class="ph-app' + (a.need > t ? ' lk' : '') + '" onclick="G.phoneApp(\'' + a.id + '\')"><b>' + a.i + '</b><span>' + a.n + '</span>' + (a.need > t ? '<em>🔒</em>' : '') + '</button>').join('') + '</div>' + (t === 1 ? '<div class="note" style="margin-top:6px">Кнопочный телефон: звонки, сообщения, «Змейка». Остальное — на смартфоне.</div>' : '');
    h += '</div>';
    h += '<div class="note">Долг: ' + G.rub(s.debt) + (s.loans.length ? ' · кредитов: ' + s.loans.length : '') + '</div>' + util;
    return h;
  };

  const st = document.createElement('style');
  st.textContent = '.phone{background:#15110e;border:3px solid #000;border-radius:18px;padding:12px;margin-bottom:10px}.phone.off{opacity:.8}.ph-status{display:flex;justify-content:space-between;font-size:12px;color:#aaa;margin-bottom:6px}.ph-bat{height:5px;background:#000;border-radius:3px;margin-bottom:10px;overflow:hidden}.ph-bat i{display:block;height:100%}.ph-apps{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.ph-app{position:relative;background:#241d17;border:1px solid #000;border-radius:12px;padding:10px 4px;color:#eee;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px}.ph-app b{font-size:26px}.ph-app.lk{opacity:.4}.ph-app em{position:absolute;top:3px;right:5px;font-style:normal;font-size:11px}.ph-lock{text-align:center;padding:24px 8px}.ph-lock b{font-size:46px;display:block}.ph-lock small{display:block;margin-top:6px;color:#aaa}.ph-pad{display:flex;justify-content:center;align-items:center;gap:6px;margin:8px 0}.ph-pad>div{display:flex;gap:6px}.ph-grid6{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:8px 0}.ph-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}.ph-c{height:44px;padding:0;font-size:20px}.ph-c.op{background:#3a3027}';
  document.head.appendChild(st);
})();
