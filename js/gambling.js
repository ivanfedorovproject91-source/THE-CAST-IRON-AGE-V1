/* v3.17 — «Азартные игры» (Цех → Крайности и криминал)
   1) Тараканьи бега (работяги, 1 раз за смену)   2) Орёл или решка (все, 1 раз за смену)
   3) Старый автомат из курилки (с ранга «Мастер участка», не для работяг)
   4) «Кто первый выпьет пиво?» (работяги, 2 раза за смену, пьянка + риск попасться)
   Время игры не тратится. Память об исходах — s.flags.gamble.mem[npc]. */
(function () {
  'use strict';
  const G = window.G, D = G.D, C = G.clamp;
  const MASTER = 7; // D.RANKS[7] = «Мастер участка»
  const app = () => document.getElementById('app');
  const nm = id => (D.NPC[id] && D.NPC[id].name) || id;
  const rub = n => G.rub(n);
  const isWorker = () => G.s.car.rank < MASTER;
  const BIG = 500;

  // ---------- Соперники по рангам
  const WORKERS = ['seryoga', 'vityok', 'mikhalych', 'afonya', 'khomyak', 'zakhar'];
  const BY_RANK = { 6: ['palych', 'stepanych'], 7: ['stepanych', 'dudukin', 'palych'], 8: ['dudukin', 'kulezhov', 'stepanych'], 9: ['kulezhov', 'shchiplen', 'dudukin'], 10: ['shchiplen', 'kulezhov', 'soplezhuykin'] };
  const pool = () => { const r = G.s.car.rank; return (r < 6 ? WORKERS : (BY_RANK[Math.min(10, r)] || BY_RANK[10])).filter(id => D.NPC[id]); };

  // ---------- Состояние и память
  const st = () => { const f = G.s.flags; f.gamble = f.gamble || { mem: {} }; f.gamble.mem = f.gamble.mem || {}; return f.gamble; };
  const cnt = () => { const d = G.s.day; d.gamble = d.gamble || { roach: 0, coin: 0, beer: 0 }; return d.gamble; };
  const mem = id => { const m = st().mem; return m[id] || (m[id] = { w: 0, l: 0, n: 0, grudge: 0, day: G.s.t.day }); };
  const grudge = id => { const m = mem(id); return Math.max(0, m.grudge - (G.s.t.day - m.day) / 2); };
  const refuses = id => grudge(id) >= 1 || G.R(id).l <= -35;
  const memLine = id => { const m = mem(id); if (!m.n) return ''; return m.w - m.l > 0 ? 'помнит: ты у него отыграл ' + rub(m.w - m.l) : m.w - m.l < 0 ? 'помнит: он у тебя выиграл ' + rub(m.l - m.w) : 'сыграли вничью по деньгам'; };

  // ---------- Расчёт: игрок против списка соперников. won=true — игрок выиграл у всех
  function settle(ids, stake, playerWon, winnerId) {
    const s = G.s, out = { fight: null };
    if (playerWon) {
      const gain = stake * ids.length; G.addMoney(gain);
      ids.forEach(id => { const m = mem(id); m.w += stake; m.n++; m.day = s.t.day; m.grudge = grudge(id); if (stake >= BIG) { m.grudge += 1; G.relAdd(id, -Math.round(3 + stake / 250)); } else G.relAdd(id, -1); });
      // самый обиженный — возможная драка
      if (stake >= BIG) {
        const cand = ids.slice().sort((a, b) => grudge(b) - grudge(a))[0];
        const p = C(10 + grudge(cand) * 10 + (G.R(cand).l < 0 ? 10 : 0) + stake / 100, 0, 50);
        if (!G.noFight(cand) && G.chance(p)) out.fight = cand;
      }
    } else {
      G.addMoney(-stake);
      const m = mem(winnerId); m.l += stake; m.n++; m.day = s.t.day; G.relAdd(winnerId, 1);
      ids.filter(i => i !== winnerId).forEach(i => { mem(i).n++; });
    }
    return out;
  }
  function fightMaybe(id, cb) {
    if (!id) return cb && cb();
    G.modal({ title: '👊 ' + nm(id) + ' вскипел', vib: 'warning', face: id, text: '<i>' + nm(id) + ' швыряет карты и встаёт:</i> «Ты меня обул! Выйдем!»', opts: [{ t: 'Драться!', fn: () => G.fight(id) }, { t: 'Вернуть деньги и извиниться', fn: () => { const back = Math.round(BIG / 2); G.addMoney(-back); G.relAdd(id, 4); mem(id).grudge = 0; G.toast('Вернул ' + rub(back) + '. Пока обошлось.', 'warn'); } }] });
  }

  // ---------- CSS
  const css = document.createElement('style');
  css.textContent = '.gb-lane{position:relative;height:34px;background:#0d0c0b;border:2px solid #000;margin:5px 0;text-align:left;overflow:hidden}.gb-lane.me{border-color:#ffd24a}.gb-lane:after{content:"🏁";position:absolute;right:2px;top:4px}.gb-r{position:absolute;top:2px;left:0;font-size:24px;transform:scaleX(-1);transition:left .08s linear}.gb-lab{position:absolute;left:4px;top:2px;font-size:11px;opacity:.6}'
    + '.gb-coin{width:96px;height:96px;margin:10px auto;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffe58a,#c89a1d 70%);border:4px solid #7a5a0c;display:flex;align-items:center;justify-content:center;font-size:42px;color:#5a3f05;font-family:var(--f-head,sans-serif)}.gb-coin.fl{animation:gbflip 1.6s ease-out}@keyframes gbflip{0%{transform:translateY(0) rotateY(0)}50%{transform:translateY(-60px) rotateY(900deg)}100%{transform:translateY(0) rotateY(1800deg)}}'
    + '.gb-reels{display:flex;gap:8px;justify-content:center;margin:10px 0}.gb-reel{width:76px;height:84px;font-size:44px;background:#0d0c0b;border:3px solid #7a5a0c;display:flex;align-items:center;justify-content:center}.gb-reel.sp{filter:blur(1.5px)}'
    + '.gb-bar{height:18px;background:#0d0c0b;border:1px solid #000;margin:3px 0}.gb-bar i{display:block;height:100%;width:0}';
  document.head.appendChild(css);

  function overlay(id, html) {
    const root = app(); if (!root || document.getElementById(id)) return null;
    const ov = document.createElement('div'); ov.id = id; ov.className = 'gym-ov'; ov.innerHTML = '<div class="gym-box">' + html + '</div>'; root.appendChild(ov); return ov;
  }
  const stakes = () => [100, 300, 500, 1000].filter(x => x <= G.s.money);

  // ---------- 1. Тараканьи бега
  const RNAMES = ['Прусак Борис', 'Рыжая Молния', 'Чёрный Баро́н'];
  function roachWhy(s) { return !isWorker() ? 'Бега только для работяг' : cnt().roach >= 1 ? 'Уже играли в эту смену' : s.money < 100 ? 'Нужно хотя бы 100 ₽' : null; }
  G.gamble = G.gamble || {};
  G.gamble.roach = function () {
    const why = roachWhy(G.s); if (why) return G.toast(why, 'warn');
    const ids = pool().filter(id => !refuses(id));
    if (!ids.length) return G.info('Тараканьи бега', 'Все помнят, как ты их обыграл. Никто не садится за коробку.', () => {});
    G.modal({ title: '🪳 Тараканьи бега', text: 'За коробкой из-под электродов в курилке — тотализатор. С кем сядешь?', opts: ids.map(id => ({ t: nm(id) + (memLine(id) ? ' (' + memLine(id) + ')' : ''), fn: () => {
      const rest = ids.filter(i => i !== id);
      if (!rest.length) return roachStake([id]);
      G.modal({ title: '🪳 Третий таракан?', text: 'Можно позвать ещё одного — тогда побегут три таракана.', opts: [{ t: 'Нет, вдвоём', fn: () => roachStake([id]) }].concat(rest.map(r => ({ t: 'Позвать: ' + nm(r), fn: () => roachStake([id, r]) }))) });
    } })).concat([{ t: 'Отмена', fn: () => {} }]) });
  };
  function roachStake(npcs) {
    const sk = stakes(); if (!sk.length) return G.toast('Нет денег на ставку.', 'warn');
    G.modal({ title: '🪳 Ставка', text: 'Ставка делается с каждого. Победа — чистая случайность: таракан сам решает.', opts: sk.map(x => ({ t: rub(x), fn: () => roachPick(npcs, x) })).concat([{ t: 'Отмена', fn: () => {} }]) });
  }
  function roachPick(npcs, stake) {
    const n = npcs.length + 1;
    G.modal({ title: '🪳 На кого ставишь?', text: 'Выбери своего таракана. Ставка: ' + rub(stake) + '.', opts: RNAMES.slice(0, n).map((r, i) => ({ t: '🪳 ' + r, fn: () => roachRace(npcs, stake, i) })) });
  }
  G.gamble.raceAnim = function (n, myIdx, names, cb, fast) {
    const ov = overlay('gb-ov', '<h3>🪳 ЗАБЕГ</h3><div id="gb-lanes"></div><div class="gym-rep" id="gb-rep">На старт…</div>');
    const pos = new Array(n).fill(0);
    if (!ov) { const w = Math.floor(Math.random() * n); return cb(w); }
    const L = document.getElementById('gb-lanes');
    for (let i = 0; i < n; i++) L.insertAdjacentHTML('beforeend', '<div class="gb-lane' + (i === myIdx ? ' me' : '') + '"><span class="gb-lab">' + names[i] + '</span><span class="gb-r" id="gb-r' + i + '">🪳</span></div>');
    let tick = 0;
    const iv = setInterval(() => {
      tick++; if (tick < 6) return;
      for (let i = 0; i < n; i++) { pos[i] += Math.random() * 3.2 + (Math.random() < 0.12 ? 3 : 0) - (Math.random() < 0.08 ? 2 : 0); pos[i] = Math.max(0, pos[i]); const e = document.getElementById('gb-r' + i); if (e) e.style.left = Math.min(92, pos[i]) + '%'; }
      const top = Math.max.apply(null, pos);
      if (top >= 96) { clearInterval(iv); const w = pos.indexOf(top); const rep = document.getElementById('gb-rep'); if (rep) { rep.textContent = '🏁 Финиш: ' + names[w] + '!'; rep.className = 'gym-rep ' + (w === myIdx ? 'good' : 'bad'); } setTimeout(() => { ov.remove(); cb(w); }, fast ? 10 : 1200); }
    }, fast ? 5 : 70);
  };
  function roachRace(npcs, stake, myIdx) {
    const n = npcs.length + 1; cnt().roach++;
    const names = RNAMES.slice(0, n);
    G.gamble.raceAnim(n, myIdx, names, w => {
      const won = w === myIdx;
      // NPC занимают остальные дорожки по порядку
      const winnerNpc = won ? null : npcs[(w > myIdx ? w - 1 : w)];
      const out = settle(npcs, stake, won, winnerNpc);
      if (won) { G.fx({ mood: 4 + stake / 250, cool: 1 }); G.info('🪳 Твой таракан первый!', 'Выигрыш: <b>' + rub(stake * npcs.length) + '</b>. ' + npcs.map(nm).join(' и ') + ' морщатся.', () => fightMaybe(out.fight)); }
      else { G.fx({ mood: -3 - stake / 400 }); G.info('🪳 Не повезло', nm(winnerNpc) + ' забирает ' + rub(stake) + ': его таракан пришёл первым.', () => {}); }
    });
  }

  // ---------- 2. Орёл или решка
  function coinWhy(s) { return cnt().coin >= 1 ? 'Уже играли в эту смену' : s.money < 100 ? 'Нужно хотя бы 100 ₽' : null; }
  G.gamble.coin = function () {
    const why = coinWhy(G.s); if (why) return G.toast(why, 'warn');
    const ids = pool().filter(id => !refuses(id));
    if (!ids.length) return G.info('Орёл или решка', 'Никто не хочет с тобой кидать монетку. Помнят.', () => {});
    const hint = isWorker() ? '' : '<br><small>С ранга «Мастер участка» играешь только с равными по должности.</small>';
    G.modal({ title: '🪙 Орёл или решка', text: 'С кем кинем монету?' + hint, opts: ids.map(id => ({ t: nm(id) + (memLine(id) ? ' (' + memLine(id) + ')' : ''), fn: () => {
      const sk = stakes(); if (!sk.length) return G.toast('Нет денег на ставку.', 'warn');
      G.modal({ title: '🪙 Ставка', text: 'Против ' + nm(id) + '.', opts: sk.map(x => ({ t: rub(x), fn: () => G.modal({ title: '🪙 Твоя сторона', text: 'Что выбираешь?', opts: [{ t: '🦅 Орёл', fn: () => coinThrow(id, x, 0) }, { t: '⚙️ Решка', fn: () => coinThrow(id, x, 1) }] }) })).concat([{ t: 'Отмена', fn: () => {} }]) });
    } })).concat([{ t: 'Отмена', fn: () => {} }]) });
  };
  G.gamble.coinAnim = function (res, cb, fast) {
    const ov = overlay('gb-ov', '<h3>🪙 МОНЕТА В ВОЗДУХЕ</h3><div class="gb-coin fl" id="gb-c">?</div><div class="gym-rep" id="gb-rep">Крутится…</div>');
    if (!ov) return cb();
    setTimeout(() => { const c = document.getElementById('gb-c'); if (c) { c.classList.remove('fl'); c.textContent = res === 0 ? '🦅' : '⚙️'; } const r = document.getElementById('gb-rep'); if (r) r.textContent = res === 0 ? 'ОРЁЛ!' : 'РЕШКА!'; setTimeout(() => { ov.remove(); cb(); }, fast ? 10 : 900); }, fast ? 20 : 1650);
  };
  function coinThrow(id, stake, pick) {
    cnt().coin++; const res = Math.random() < 0.5 ? 0 : 1;
    G.gamble.coinAnim(res, () => {
      const won = res === pick, out = settle([id], stake, won, id);
      if (won) { G.fx({ mood: 4 }); G.info('🪙 Угадал!', nm(id) + ' отсчитывает ' + rub(stake) + '.', () => fightMaybe(out.fight)); }
      else { G.fx({ mood: -3 }); G.info('🪙 Мимо', nm(id) + ' забирает ' + rub(stake) + ' и ухмыляется.', () => {}); }
    });
  }

  // ---------- 3. Старый автомат
  const SYM = ['🪖', '🔩', '🪳', '🔧', '⚙️'], W = [2, 4, 5, 3, 1]; // каска, болт, таракан, ключ, шестерня
  const NAMEP = ['Каска', 'Болт', 'Таракан', 'Ключ', 'Золотая шестерня'];
  const TRIPLE = [40, 10, 5, 20, 100], PAIR = [2, 0, 0, 0, 3];
  const draw = () => { let r = Math.random() * 15; for (let i = 0; i < 5; i++) { if (r < W[i]) return i; r -= W[i]; } return 2; };
  G.gamble.payout = function (a, b, c) {
    if (a === b && b === c) return TRIPLE[a];
    if (a === b || b === c || a === c) { const k = a === b || a === c ? a : b; return PAIR[k]; }
    return 0;
  };
  function slotWhy(s) { return isWorker() ? 'Автомат доступен с ранга «Мастер участка»' : s.money < 50 ? 'Нужно хотя бы 50 ₽' : null; }
  G.gamble.slot = function () {
    const why = slotWhy(G.s); if (why) return G.toast(why, 'warn');
    const ov = overlay('gb-ov', '<h3>🎰 СТАРЫЙ АВТОМАТ</h3><div class="gym-info" id="gb-info">Ржавый, но живой. Три барабана.<br><small>🪖×3 40 · 🔩×3 10 · 🪳×3 5 · 🔧×3 20 · ⚙️×3 100; пара ⚙️ ×3, пара 🪖 ×2</small></div><div class="gb-reels"><div class="gb-reel" id="gb-0">🪖</div><div class="gb-reel" id="gb-1">🔩</div><div class="gb-reel" id="gb-2">🔧</div></div><div class="gym-rep" id="gb-rep"></div><div class="fi-btns" id="gb-b"></div>');
    if (!ov) return;
    const b = document.getElementById('gb-b'); let busy = false;
    const mk = (stake) => { const e = document.createElement('button'); e.className = 'btn big'; e.textContent = 'Крутнуть ржавый барабан · ' + rub(stake); e.onclick = () => spin(stake); b.appendChild(e); };
    [50, 100, 250].forEach(mk);
    const close = document.createElement('button'); close.className = 'btn'; close.textContent = 'Уйти'; close.onclick = () => ov.remove(); b.appendChild(close);
    function spin(stake) {
      if (busy) return; if (G.s.money < stake) return G.toast('Не хватает на ставку.', 'warn');
      busy = true; G.addMoney(-stake);
      const res = [draw(), draw(), draw()];
      const reels = [0, 1, 2].map(i => document.getElementById('gb-' + i)); reels.forEach(r => r.classList.add('sp'));
      const iv = setInterval(() => reels.forEach(r => { r.textContent = SYM[Math.floor(Math.random() * 5)]; }), 70);
      [700, 1100, 1500].forEach((t, i) => setTimeout(() => { reels[i].classList.remove('sp'); reels[i].textContent = SYM[res[i]]; if (i === 2) { clearInterval(iv); finish(); } }, t));
      function finish() {
        const m = G.gamble.payout(res[0], res[1], res[2]), win = m * stake, rep = document.getElementById('gb-rep');
        if (win > 0) G.addMoney(win);
        const net = win - stake; G.fx({ mood: net > 0 ? 3 + Math.min(8, net / 200) : -1 });
        if (rep) { rep.textContent = win > 0 ? (m >= 20 ? '🎉 ДЖЕКПОТ! +' : 'Выигрыш: +') + rub(win) : 'Пусто. Автомат хрустит.'; rep.className = 'gym-rep ' + (win > 0 ? 'good' : 'bad'); }
        st().slotNet = (st().slotNet || 0) + net; busy = false;
      }
    }
  };

  // ---------- 4. Кто первый выпьет пиво?
  function beerWhy(s) { return !isWorker() ? 'Только для работяг' : cnt().beer >= 2 ? 'Два раза за смену — предел' : s.money < 100 ? 'Нужно хотя бы 100 ₽' : null; }
  G.gamble.beer = function () {
    const why = beerWhy(G.s); if (why) return G.toast(why, 'warn');
    const ids = pool().filter(id => !refuses(id));
    if (ids.length < 2) return G.info('Кто первый выпьет пиво?', 'Некому составить компанию: все помнят прошлое.', () => {});
    const pick = () => ids.slice().sort(() => Math.random() - 0.5).slice(0, 2);
    const sk = stakes().filter(x => x <= 500); if (!sk.length) return G.toast('Нет денег на ставку.', 'warn');
    G.modal({ title: '🍺 Кто первый выпьет пиво?', text: 'Трое работяг, три бутылки. Кто быстрее — забирает банк. Но пьянка на смене — это риск: вдруг заглянет начальство.', opts: sk.map(x => ({ t: 'Ставка ' + rub(x), fn: () => beerRace(pick(), x) })).concat([{ t: 'Отмена', fn: () => {} }]) });
  };
  G.gamble.beerAnim = function (names, cb, fast) {
    const ov = overlay('gb-ov', '<h3>🍺 КТО ПЕРВЫЙ?</h3><div class="gym-info">Жми на бутылку как можно чаще!</div><div id="gb-bars"></div><div class="fi-btns"><button class="btn big" id="gb-tap">🍺 ПЕЙ!</button></div><div class="gym-rep" id="gb-rep"></div>');
    if (!ov) return cb(Math.floor(Math.random() * 3));
    const box = document.getElementById('gb-bars'), pos = [0, 0, 0], sp = [0, 0.9 + Math.random() * 0.5, 0.9 + Math.random() * 0.5];
    names.forEach((n, i) => box.insertAdjacentHTML('beforeend', '<div>' + n + '<div class="gb-bar"><i id="gb-p' + i + '" style="background:' + (i === 0 ? '#ffd24a' : '#c33') + '"></i></div></div>'));
    let over = false;
    document.getElementById('gb-tap').onclick = () => { if (!over) { pos[0] += 4.2; draw2(); } };
    function draw2() { pos.forEach((p, i) => { const e = document.getElementById('gb-p' + i); if (e) e.style.width = Math.min(100, p) + '%'; }); const top = Math.max.apply(null, pos); if (top >= 100 && !over) { over = true; clearInterval(iv); const w = pos.indexOf(top); const rep = document.getElementById('gb-rep'); if (rep) { rep.textContent = '🍺 Первым допил: ' + names[w]; rep.className = 'gym-rep ' + (w === 0 ? 'good' : 'bad'); } setTimeout(() => { ov.remove(); cb(w); }, fast ? 10 : 1100); } }
    const iv = setInterval(() => { if (over) return; for (let i = 1; i < 3; i++) pos[i] += sp[i] * (0.4 + Math.random() * 1.6) * 0.8; draw2(); }, fast ? 5 : 100);
  };
  function beerRace(npcs, stake) {
    cnt().beer++;
    G.gamble.beerAnim(['Ты', nm(npcs[0]), nm(npcs[1])], w => {
      const won = w === 0, winner = won ? null : npcs[w - 1];
      const out = settle(npcs, stake, won, winner);
      G.fx({ drunk: 12, mood: won ? 5 : 1, craving: 4 }); G.s.day.risky = 'Пиво на смене';
      G.info(won ? '🍺 Ты первый!' : '🍺 Опоздал', (won ? 'Банк твой: <b>' + rub(stake * 2) + '</b>.' : nm(winner) + ' забирает ' + rub(stake) + '.') + ' В голове шумит.', () => {
        const caught = G.caught({ risk: 55, fine: [300, 800], sev: 1, what: 'Пьянка на рабочем месте (соревнование по пиву)' });
        if (!caught && out.fight) fightMaybe(out.fight);
      });
    });
  }

  // ---------- Меню раздела
  G.gamble.menu = function () {
    const s = G.s, c = cnt(), w = isWorker(), o = [];
    if (w) o.push({ t: '🪳 Тараканьи бега' + (c.roach ? ' (сыграно)' : ''), dis: roachWhy(s), fn: () => G.gamble.roach() });
    o.push({ t: '🪙 Орёл или решка' + (c.coin ? ' (сыграно)' : ''), dis: coinWhy(s), fn: () => G.gamble.coin() });
    if (!w) o.push({ t: '🎰 Старый автомат из курилки', dis: slotWhy(s), fn: () => G.gamble.slot() });
    if (w) o.push({ t: '🍺 Кто первый выпьет пиво? (' + (2 - c.beer) + ' из 2)', dis: beerWhy(s), fn: () => G.gamble.beer() });
    o.push({ t: 'Назад', fn: () => {} });
    G.modal({ title: '🎲 Азартные игры', text: 'Заводской тотализатор — вне закона, но не вне смены. Время игры не тратится.', opts: o });
  };

  G.A('gamble', { ph: ['work'], loc: 'shop', g: 'Крайности и криминал', n: 'Азартные игры', i: '🎲', menu: true, lunch: true, noEvent: true, fn: () => { G.gamble.menu(); return 'custom'; } });
})();
