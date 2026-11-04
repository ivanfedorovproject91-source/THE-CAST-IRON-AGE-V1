/* ===== Мини-игры (рендерятся внутри модального окна) ===== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const MG = (G.MG = {});
  const raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : f => setTimeout(f, 16);
  const rnd = Math.random;

  function frame(el, spec, inner) {
    el.innerHTML = '<div class="mg"><div class="mg-title">' + (spec.title || '') + '</div><div class="mg-hint">' + (spec.hint || '') + '</div>' + inner + '</div>';
  }

  // 1) Ритм-работа: тапни, когда маркер в зелёной зоне
  MG.rhythm = function (el, spec, done) {
    const rounds = spec.rounds || 3;
    const en = G.s ? G.s.st.energy : 70;
    const zoneW = en < 30 ? 16 : en < 55 ? 21 : 26;
    let round = 0, total = 0, pos = 0, dir = 1, speed = 0.9, zone = 0, alive = true, last = 0, locked = false;
    frame(el, spec, '<div class="mg-round" id="mgr">Операция 1 / ' + rounds + '</div><div class="mg-bar"><div class="mg-zone" id="mgz"></div><div class="mg-mark" id="mgm"></div></div><button class="btn big hazard" id="mgb">⚙ РАБОТАТЬ</button><div class="mg-res" id="mgs">&nbsp;</div>');
    const z = el.querySelector('#mgz'), m = el.querySelector('#mgm'), b = el.querySelector('#mgb'), s = el.querySelector('#mgs'), r = el.querySelector('#mgr');
    function newZone() { zone = 8 + rnd() * (84 - zoneW); z.style.left = zone + '%'; z.style.width = zoneW + '%'; speed = 0.75 + round * 0.22 + rnd() * 0.25; }
    function loop(t) {
      if (!alive) return;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
      pos += dir * speed * dt * 100; if (pos >= 98) { pos = 98; dir = -1; } if (pos <= 0) { pos = 0; dir = 1; }
      m.style.left = pos + '%'; raf(loop);
    }
    newZone(); raf(loop);
    b.onclick = function () {
      if (locked) return; locked = true;
      const c = pos, inZ = c >= zone && c <= zone + zoneW;
      const near = !inZ && (Math.abs(c - zone) < 7 || Math.abs(c - (zone + zoneW)) < 7);
      const sc = inZ ? 1 : near ? 0.5 : 0.1; total += sc;
      s.textContent = inZ ? 'ТОЧНО!' : near ? 'Почти…' : 'Мимо!'; s.className = 'mg-res ' + (inZ ? 'ok' : near ? '' : 'bad');
      if (G.buzz) G.buzz('light');
      round++;
      setTimeout(function () {
        if (!alive) return;
        if (round >= rounds) { alive = false; done(total / rounds); }
        else { r.textContent = 'Операция ' + (round + 1) + ' / ' + rounds; newZone(); locked = false; s.innerHTML = '&nbsp;'; }
      }, 420);
    };
    return () => { alive = false; };
  };

  // 2) Бумажки: тапай по появляющимся папкам
  MG.papers = function (el, spec, done) {
    const N = 8; let spawned = 0, hits = 0, alive = true, timers = [];
    frame(el, spec, '<div class="mg-round" id="mgr">Принято: 0 / ' + N + '</div><div class="mg-field" id="mgf"></div>');
    const f = el.querySelector('#mgf'), r = el.querySelector('#mgr');
    const icons = ['📁', '📄', '📑', '🗂️', '✍️'];
    function spawn() {
      if (!alive) return;
      if (spawned >= N) { timers.push(setTimeout(() => { if (alive) { alive = false; done(hits / N); } }, 1200)); return; }
      spawned++;
      const d = document.createElement('button'); d.className = 'mg-item'; d.textContent = icons[spawned % icons.length];
      d.style.left = (6 + rnd() * 78) + '%'; d.style.top = (8 + rnd() * 70) + '%';
      d.onclick = () => { if (!d.dataset.x) { d.dataset.x = 1; hits++; r.textContent = 'Принято: ' + hits + ' / ' + N; d.classList.add('hit'); setTimeout(() => d.remove(), 150); if (G.buzz) G.buzz('light'); } };
      f.appendChild(d); timers.push(setTimeout(() => d.remove(), 1500));
      timers.push(setTimeout(spawn, 650));
    }
    spawn();
    return () => { alive = false; timers.forEach(clearTimeout); };
  };

  // 3) Уборка: убери мусор, пока Надежда идёт по цеху
  MG.clean = function (el, spec, done) {
    const N = 10, T = 8; let hits = 0, alive = true, t0 = Date.now(), iv;
    frame(el, spec, '<div class="mg-progress"><div id="mgp"></div><span>Надежда Николаевна →</span></div><div class="mg-round" id="mgr">Убрано: 0 / ' + N + '</div><div class="mg-field" id="mgf"></div>');
    const f = el.querySelector('#mgf'), r = el.querySelector('#mgr'), p = el.querySelector('#mgp');
    const ic = ['🗑️', '🛢️', '🧴', '📦', '🧻', '🍾'];
    for (let i = 0; i < N; i++) { const d = document.createElement('button'); d.className = 'mg-item'; d.textContent = ic[i % ic.length]; d.style.left = (4 + rnd() * 82) + '%'; d.style.top = (4 + rnd() * 76) + '%'; d.onclick = () => { if (!d.dataset.x) { d.dataset.x = 1; hits++; r.textContent = 'Убрано: ' + hits + ' / ' + N; d.classList.add('hit'); setTimeout(() => d.remove(), 120); if (hits >= N) fin(); } }; f.appendChild(d); }
    function fin() { if (!alive) return; alive = false; clearInterval(iv); setTimeout(() => done(hits / N), 250); }
    iv = setInterval(() => { const e = (Date.now() - t0) / 1000; p.style.width = Math.min(100, e / T * 100) + '%'; if (e >= T) fin(); }, 80);
    return () => { alive = false; clearInterval(iv); };
  };

  // 4) Держись: бей по кнопке, чтобы шкала не упала до нуля
  MG.mash = function (el, spec, done) {
    const T = spec.time || 6, rate = spec.rate || 1; let v = 55, alive = true, t0 = Date.now(), last = Date.now(), iv;
    frame(el, spec, '<div class="mg-meter"><div id="mgv"></div></div><div class="mg-round" id="mgr"></div><button class="btn big hazard" id="mgb">ДЕРЖАТЬ!</button>');
    const bar = el.querySelector('#mgv'), b = el.querySelector('#mgb'), r = el.querySelector('#mgr');
    b.onclick = () => { v = Math.min(100, v + 8.5); if (G.buzz) G.buzz('light'); };
    iv = setInterval(() => {
      const now = Date.now(), dt = (now - last) / 1000; last = now;
      v -= dt * 30 * rate; bar.style.width = Math.max(0, v) + '%'; bar.className = v < 25 ? 'low' : '';
      const left = T - (now - t0) / 1000; r.textContent = 'Осталось: ' + Math.max(0, left).toFixed(1) + ' с';
      if (v <= 0) { alive = false; clearInterval(iv); done(0); } else if (left <= 0) { alive = false; clearInterval(iv); done(1); }
    }, 60);
    return () => { alive = false; clearInterval(iv); };
  };

  // 5) Реакция: успей нажать
  MG.tap = function (el, spec, done) {
    const T = spec.time || 3; let alive = true, t0 = Date.now(), iv;
    frame(el, spec, '<div class="mg-progress"><div id="mgp" class="rev"></div></div><button class="btn big hazard" id="mgb">ДЕЛАТЬ ВИД, ЧТО РАБОТАЮ!</button>');
    const p = el.querySelector('#mgp'), b = el.querySelector('#mgb');
    b.onclick = () => { if (!alive) return; alive = false; clearInterval(iv); done(1); };
    iv = setInterval(() => { const e = (Date.now() - t0) / 1000; p.style.width = Math.max(0, 100 - e / T * 100) + '%'; if (e >= T && alive) { alive = false; clearInterval(iv); done(0); } }, 60);
    return () => { alive = false; clearInterval(iv); };
  };

  G.runMini = function (el, spec) {
    const fn = MG[spec.kind];
    if (!fn) { G.choose(0, { score: 0.5 }); return null; }
    return fn(el, spec, sc => G.choose(0, { score: sc }));
  };
})();
