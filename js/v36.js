/* ===== V1 (3.6.0): интерфейс, версия, управленческая карьера, мини-игры телефона ===== */
(function () {
  'use strict';
  const G = window.G, D = G.D, C = G.clamp, MG = G.MG;
  const F = () => G.s.flags;
  const msg = (t, c) => G.toast(t, c);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const log = e => { try { if (window.console) console.error(e); } catch (x) {} };

  // ---------- Список изменений (дополняйте при каждом обновлении: новая версия — новый элемент СВЕРХУ)
  G.CHANGELOG = [
    { v: 'V1', date: '10.11.2026', items: [
      '🏠 Вкладка «Смена» дома называется «Дом», на заводе — «Смена».',
      '🎒 «Рюкзак» и «Журнал событий» теперь во вкладке «Смена/Дом».',
      '⭐ Новая шапка игрока: должность жирным, 5 звёзд (жёлтые — разряд, белые — управленец), смены до повышения, кличка.',
      '🪖 У управленцев каска белая.',
      '🏆 Управленческая карьера: каждая звезда — должность. Нужны «хорошие недели» (план, настроение цеха, активность). Недельный отчёт руководителя.',
      '🧰 Новая работа управленцев: обход цеха, премии, график смен, заказ запчастей, собеседования, жалобы, совещание у Труханова, рейд по ОТ, квартальный отчёт.',
      '🎉 Экран повышения со статистикой и кнопкой «Продолжить».',
      '💬 Общий чат игроков внизу вкладки «Смена/Дом».',
      '📚 Заводоуправление: «Система завода», «Информация о заводе», «Нормативная документация» (стажёр обязан расписаться!).',
      '📱 Игры на телефоне: кнопка «Выйти», защита от вылетов, свайпы в «Змейке».',
      '🛠 Исправлена кнопка «Как играть» на стартовом экране; защита от «мёртвого экрана».',
      '🔖 Номер версии и дата обновления, окно «Что нового».'
    ] }
  ];
  const SEEN = 'cv_seen_ver';
  G.showChangelog = function () {
    const CF = G.CONFIG;
    const html = G.CHANGELOG.map(c => '<div style="margin-bottom:10px"><b>' + esc(c.v) + '</b> · <small>изменения от ' + esc(c.date) + '</small><ul style="margin:4px 0 0 18px;padding:0">' + c.items.map(i => '<li style="margin:3px 0">' + i + '</li>').join('') + '</ul></div>').join('');
    G.modal({ title: '📰 Что нового · ' + CF.GAME_VER, wide: true, text: '<div style="max-height:58vh;overflow:auto">' + html + '</div>', opts: [{ t: 'Понятно', fn: () => { try { localStorage.setItem(SEEN, CF.GAME_VER); } catch (e) {} } }] });
  };
  G.versionLabel = () => 'Чугунный век ' + G.CONFIG.GAME_VER + ' · обновлено ' + G.CONFIG.GAME_DATE + ' · Разработчик Иван Фёдоров';
  function mountFoot() {
    const f = document.getElementById('foot'); if (!f) return;
    f.textContent = G.versionLabel(); f.onclick = () => { if (!G.busy) G.showChangelog(); };
  }

  // ---------- Шапка: звёзды и прогресс
  G.MG_NEED = { 7: 4, 8: 6, 9: 8 };
  G.rankInfo = function () {
    const s = G.s, c = s.car, r = c.rank;
    if (!c.job) return { stars: 0, noStars: true, mgmt: false, line: 'Оформление на работу' };
    if (r === 0) return { stars: 0, noStars: true, mgmt: false, line: 'Стажёр · до допуска: ' + Math.max(0, 20 - (c.probShifts || 0)) + ' смен' };
    if (r <= 5) {
      const nx = D.REQ[r + 1], left = Math.max(0, nx.shifts - c.shifts), nm = r < 5 ? 'Р' + (r + 1) : 'бригадира';
      return { stars: r, mgmt: false, line: left ? 'До ' + nm + ': ' + left + ' смен' : 'Стаж набран — подай заявление' };
    }
    const stars = Math.min(5, r - 5);
    let line;
    if (r >= 10) line = 'Высшая должность';
    else if (r === 9) line = 'Потолок: ★5 — кресло зама гендиректора (Труханов обещает)';
    else line = 'До ★' + (stars + 1) + ': хор. недель ' + (F().mgW || 0) + '/' + G.MG_NEED[r + 1];
    return { stars: stars, mgmt: true, line: line };
  };

  // ---------- Экран повышения
  const K = G.career;
  K.promoScreen = function (to, text, cont) {
    const s = G.s, c = s.car, st = s.st, mg = to >= 6, n = mg ? Math.min(5, to - 5) : to;
    let stars = ''; for (let k = 1; k <= 5; k++) stars += '<span style="color:' + (k <= n ? (mg ? '#fff' : '#ffd24a') : '#4a4640') + '">★</span>';
    const row = (a, b) => '<div class="kv"><span>' + a + '</span><b>' + b + '</b></div>';
    const html = '<div style="text-align:center;font-size:30px;letter-spacing:4px;margin:2px 0 6px">' + stars + '</div><div style="text-align:center;margin-bottom:8px">' + text + '</div>'
      + row('Должность', esc(G.jobTitle())) + row('Смен отработано', c.shifts) + row('Баллы мастерства', Math.floor(st.bm)) + row('Знания', Math.floor(st.know))
      + row('Уважение начальства / коллег', Math.floor(st.boss) + ' / ' + Math.floor(st.coll)) + row('Заработано за всё время', G.rub(s.stats.earned)) + row('Прожито дней', s.t.day) + row('Оклад', G.rub(G.monthlyPay()));
    G.modal({ title: to === 1 ? '🎉 Допущен к работе' : mg ? '🎖 Повышение в должности' : '🎉 Новый разряд', face: 'tatishcheva', bg: 'checkpoint', vib: 'success', cls: 'good', wide: true, text: html, opts: [{ t: '▶ Продолжить', fn: cont || (() => {}) }] });
  };
  const _prom = K.promote;
  K.promote = function (to) { if (G.s) { F().mgW = 0; F().mgAct = 0; } return _prom.apply(this, arguments); };
  const _rl = K.reqLines;
  K.reqLines = function (to) {
    const L = _rl.apply(this, arguments); if (!L) return L;
    if (G.MG_NEED[to]) { const have = F().mgW || 0, need = G.MG_NEED[to]; L.push({ t: 'Хороших управленческих недель: ' + have + ' / ' + need, ok: have >= need }); }
    return L;
  };

  // ---------- Недельный отчёт управленца
  const plan = v => { const f = F(); if (G.plantStats) G.plantStats(); f.plan = C((f.plan || 50) + v); };
  const morale = v => { const f = F(); if (G.plantStats) G.plantStats(); f.shopMorale = C((f.shopMorale || 50) + v); };
  const act = () => { const f = F(); f.mgAct = (f.mgAct || 0) + 1; };
  const sp = n => G.spend(n || 1);
  const _wt = G.weeklyTick;
  G.weeklyTick = function () {
    const r = _wt.apply(this, arguments);
    try {
      const s = G.s, f = s.flags;
      if (s.car.rank >= 6 && s.car.rank <= 9 && s.phase !== 'new' && !s.end) {
        const ps = G.plantStats(), acts = f.mgAct || 0;
        const ch = [['План ≥ 55%: ' + ps.plan + '%', ps.plan >= 55], ['Настроение цеха ≥ 45%: ' + ps.morale + '%', ps.morale >= 45], ['Состояние завода ≥ 40%: ' + ps.plant + '%', ps.plant >= 40], ['Управленческих действий ≥ 3: ' + acts, acts >= 3], ['Выговоров не больше 1', s.car.rep <= 1]];
        const ok = ch.filter(x => x[1]).length, good = ok >= 4 && acts >= 3;
        if (good) f.mgW = (f.mgW || 0) + 1; else if (ok <= 2) f.mgW = Math.max(0, (f.mgW || 0) - 1);
        f.mgAct = 0;
        const nx = G.MG_NEED[s.car.rank + 1];
        G.modal({ title: '📊 Недельный отчёт руководителя', face: 'truhanov', cls: good ? 'good' : '', text: ch.map(x => (x[1] ? '✅ ' : '❌ ') + x[0]).join('<br>') + '<br><br><b>' + (good ? 'Неделя засчитана как хорошая.' : ok <= 2 ? 'Плохая неделя: счётчик −1.' : 'Неделя не засчитана.') + '</b><br>Хороших недель: ' + f.mgW + (nx ? ' / ' + nx : '') + (nx && f.mgW >= nx ? '<br>🎖 Условие по неделям выполнено — подавай заявление на повышение (Татищева).' : ''), opts: [{ t: '▶ Продолжить', fn: () => {} }] });
      }
    } catch (e) { log(e); }
    return r;
  };

  // ---------- Новая работа управленцев
  const A = G.A;
  const mgReq = (r, name) => s => s.car.rank < r ? 'Нужна должность: ' + name : null;
  function decide(title, text, opts, face) {
    G.modal({ title: title, face: face, text: text, opts: opts.concat([{ t: 'Отложить', fn: () => { const a = G.s.day.done; Object.keys(a).forEach(k => { if (/^mx_/.test(k) && G._mxPending === k) delete a[k]; }); } }]) });
  }
  const done = (m, c) => { act(); msg(m, c); sp(1); };
  function mx(id, o) { return A(id, Object.assign({ ph: ['work'], menu: true, once: 'day', g: 'Управление' }, o)); }
  mx('mx_walk', { loc: 'shop', n: 'Обход цеха', i: '🚶', req: mgReq(6, 'бригадир'), fn: () => { G._mxPending = 'mx_walk';
    const P = [['Течёт масло у пресса.', '🧽 Вызвать уборщицу', () => { morale(2); G.fx({ cons: 1 }); done('Масло убрали, Людка вздохнула.'); }, '🙈 Пройти мимо', () => { plan(-2); G.fx({ cons: -2 }); done('Через час там поскользнулся электрик.', 'bad'); }],
      ['Двое сидят и «обсуждают чертёж» уже час.', '📋 Выдать задание', () => { plan(3); morale(-1); done('Чертёж внезапно оказался понятным.'); }, '☕ Присоединиться', () => { morale(3); plan(-2); G.fx({ boss: -1 }); done('Душевно. Но план не закрыт.'); }],
      ['Станок гудит как-то не так.', '🔧 Остановить и вызвать слесаря', () => { plan(-1); G.fx({ cons: 2, boss: 1 }); G.s.world.plant = C(G.s.world.plant + 1); done('Нашли треснувший подшипник. Герой дня — ты.', 'good'); }, '🙄 Работать до смены', () => { plan(2); G.s.world.plant = C(G.s.world.plant - 2); done('Продержался до вечера. Станок — нет.', 'warn'); }]];
    const p = G.pick(P); decide('🚶 Обход цеха', p[0], [{ t: p[1], fn: p[2] }, { t: p[3], fn: p[4] }]); return 'custom'; } });
  mx('mx_bonus', { loc: 'admin', n: 'Премировать бригаду', i: '🎁', req: mgReq(7, 'мастер участка'), fn: () => { G._mxPending = 'mx_bonus';
    decide('🎁 Премия бригаде', 'Из своего кармана «на пряники». Сколько?', [
      { t: 'Небольшая — 2 000 ₽', dis: G.s.money < 2000 ? 'Не хватает денег' : null, fn: () => { G.addMoney(-2000); morale(5); G.fx({ coll: 3 }); done('Бригада оценила. Пряники съели за обедом.', 'good'); } },
      { t: 'Щедрая — 7 000 ₽', dis: G.s.money < 7000 ? 'Не хватает денег' : null, fn: () => { G.addMoney(-7000); morale(12); plan(3); G.fx({ coll: 7, boss: 1 }); done('Народ в восторге: «Наш — человек!»', 'good'); } }]); return 'custom'; } });
  mx('mx_graph', { loc: 'shop', n: 'Составить график смен', i: '🗓', req: mgReq(6, 'бригадир'), fn: () => { G.workGame('assign', 'График смен', sc => { plan(Math.round(2 + 5 * sc)); morale(sc >= 0.6 ? 3 : -2); G.fx({ know: 1 }); done('График готов. Верных расстановок: ' + Math.round(sc * 100) + '%.', sc >= 0.6 ? 'good' : 'warn'); }); return 'custom'; } });
  mx('mx_parts', { loc: 'admin', n: 'Заказать запчасти', i: '📦', req: mgReq(7, 'мастер участка'), fn: () => { G._mxPending = 'mx_parts';
    decide('📦 Закупка запчастей', 'Снабженец Паша предлагает варианты.', [
      { t: 'Оригинал: дорого и надёжно (3 000 ₽)', dis: G.s.money < 3000 ? 'Не хватает денег' : null, fn: () => { G.addMoney(-3000); G.s.world.plant = C(G.s.world.plant + 3); plan(2); done('Оригинальные детали подошли с первого раза. Паша в шоке.', 'good'); } },
      { t: 'Аналог «как оригинал»', fn: () => { if (G.chance(50)) { G.s.world.plant = C(G.s.world.plant + 2); plan(1); done('Подошло. Почти.'); } else { G.s.world.plant = C(G.s.world.plant - 3); morale(-3); done('Аналог оказался «аналогом» ключа от другого замка.', 'bad'); } } }]); return 'custom'; } });
  mx('mx_hire', { loc: 'admin', n: 'Собеседование кандидатов', i: '🧑‍💼', req: mgReq(7, 'мастер участка'), fn: () => { G._mxPending = 'mx_hire';
    decide('🧑‍💼 Собеседование', 'Трое кандидатов в цех. Кого берём?', [
      { t: 'Витя: опыт 15 лет, ворчит', fn: () => { plan(3); morale(-2); done('Витя уже научил всех, как «раньше было лучше».'); } },
      { t: 'Оля: молодая, горит идеями', fn: () => { morale(4); plan(1); G.fx({ cool: 1 }); done('Оля предложила 14 улучшений. Реализуемо — одно.'); } },
      { t: 'Гена: племянник Кулежова', fn: () => { G.fx({ boss: 3, coll: -3 }); plan(-1); done('Гена пришёл раньше всех и ушёл раньше всех.', 'warn'); } }]); return 'custom'; } });
  mx('mx_complaint', { loc: 'shop', n: 'Разобрать жалобу', i: '📝', req: mgReq(6, 'бригадир'), fn: () => { G._mxPending = 'mx_complaint';
    decide('📝 Жалоба', 'Сварщик жалуется, что токарь «занял его розетку и его обед».', [
      { t: 'Выслушать обоих, развести по сменам', fn: () => { morale(4); G.fx({ coll: 2, mood: -1 }); done('Мир, но у тебя болит голова.', 'good'); } },
      { t: 'Рявкнуть на обоих', fn: () => { morale(-4); plan(2); G.fx({ boss: 2, coll: -3 }); done('Разошлись молча. Работают быстро и злобно.'); } },
      { t: 'Сделать вид, что не слышал', fn: () => { morale(-2); G.fx({ cons: -1 }); done('Розетка — не повод. Но завтра это будет повод.', 'warn'); } }]); return 'custom'; } });
  mx('mx_truh', { loc: 'admin', n: 'Совещание у Труханова', i: '🧑‍⚖️', req: mgReq(8, 'зам. начальника цеха'), fn: () => { G._mxPending = 'mx_truh';
    decide('🧑‍⚖️ Совещание', 'Труханов: «У кого какие мысли? Только не у всех сразу».', [
      { t: 'Предложить идею', fn: () => { if (G.chance(55)) { G.fx({ boss: 6 }); plan(3); done('Труханов: «Мысль хорошая. Я сам так думал».', 'good'); } else { G.fx({ boss: -3 }); done('Труханов: «Идей у меня и так много».', 'warn'); } } },
      { t: 'Кивать и записывать', fn: () => { G.fx({ boss: 2, cool: -1 }); done('Красиво записал. Ничего не понял.'); } },
      { t: 'Заступиться за цех', fn: () => { morale(6); G.fx({ boss: -2, coll: 4 }); done('Цех услышал, что ты за них. Труханов — тоже.'); } }], 'truhanov'); return 'custom'; } });
  mx('mx_safe', { loc: 'shop', n: 'Рейд по охране труда', i: '🦺', req: mgReq(7, 'мастер участка'), fn: () => { G._mxPending = 'mx_safe';
    decide('🦺 Рейд по ОТ', 'Проверить каски, ограждения и надписи «Не влезай — убьёт».', [
      { t: 'Строго: штрафовать за каждую мелочь', fn: () => { morale(-4); G.fx({ cons: 2, boss: 3 }); G.s.world.plant = C(G.s.world.plant + 1); done('Нарушений меньше, друзей — тоже.'); } },
      { t: 'По-человечески: объяснить и поправить', fn: () => { morale(3); G.fx({ cons: 3, coll: 2 }); done('Все в касках, никто не обижен. Редкий случай.', 'good'); } }]); return 'custom'; } });
  mx('mx_audit', { loc: 'admin', n: 'Квартальный отчёт', i: '📈', req: mgReq(9, 'начальник цеха'), fn: () => { G.mini('papers', { title: 'Квартальный отчёт', hint: 'Таскай бумаги куда надо — Труханов ждёт цифры!' }, r => { const sc = r && r.score || 0; plan(Math.round(sc * 5)); G.fx({ boss: Math.round(sc * 5) }); done('Отчёт сдан, оценка: ' + Math.round(sc * 100) + '%.', sc >= 0.6 ? 'good' : 'warn'); }); return 'custom'; } });
  // у «once» действий нужно снимать отметку, если игрок отложил решение (поведение «Отложить» в decide)

  // ---------- Мини-игры на телефоне: выход, защита от вылетов, свайпы
  const PH = ['snake', 'sapper', 'memory', 'quiz'];
  const _rm = G.runMini;
  G.runMini = function (el, spec) {
    let cl = null;
    try { cl = _rm.call(G, el, spec); } catch (e) { log(e); setTimeout(() => { if (G.cur === spec || G.cur) G.choose(0, { score: 0, exit: true }); }, 0); return null; }
    if (PH.indexOf(spec.kind) >= 0 && el && el.parentNode) {
      const b = document.createElement('button'); b.className = 'btn mg-exit'; b.textContent = '✖ Выйти из игры';
      b.onclick = () => { if (G.cur) G.choose(0, { score: 0, exit: true }); };
      el.parentNode.appendChild(b);
    }
    return cl;
  };
  const _mini = G.mini;
  G.mini = function (kind, params, d) {
    if (PH.indexOf(kind) >= 0) { const d0 = d; d = function (res) { if (res && res.exit) { msg('Ты вышел из игры.'); return; } return d0 && d0.apply(this, arguments); }; }
    return _mini.call(this, kind, params, d);
  };
  const _sn = MG.snake;
  MG.snake = function (el) {
    const cl = _sn.apply(this, arguments);
    let x0 = 0, y0 = 0;
    const press = d => { const b = el.querySelector('[data-d="' + d + '"]'); if (b) b.click(); };
    el.addEventListener('touchstart', e => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
    el.addEventListener('touchend', e => { const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return; if (Math.abs(dx) > Math.abs(dy)) press(dx > 0 ? '1,0' : '-1,0'); else press(dy > 0 ? '0,1' : '0,-1'); }, { passive: true });
    const key = e => { const m = { ArrowUp: '0,-1', ArrowDown: '0,1', ArrowLeft: '-1,0', ArrowRight: '1,0' }[e.key]; if (m) { press(m); e.preventDefault(); } };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); if (cl) cl(); };
  };

  // ---------- Окно «Что нового» при запуске и подпись версии
  function boot() {
    mountFoot();
    let seen = null; try { seen = localStorage.getItem(SEEN); } catch (e) {}
    if (seen !== G.CONFIG.GAME_VER && !G.busy) G.showChangelog();
  }
  if (document.readyState === 'complete') setTimeout(boot, 50); else window.addEventListener('load', () => setTimeout(boot, 80));
})();
