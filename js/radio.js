/* ===== «Радиоточка» — атмосферное радио внизу экрана (3 станции) =====
   Звук запускается ТОЛЬКО по нажатию игрока. Адреса потоков задаёт владелец в админ-кабинете (сервер),
   по умолчанию они пусты: используйте только официальные потоки, на которые у вас есть право. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const KEY = 'cv_radio';
  const DEF = [
    { id: 'mayak', name: 'Радио «Маяк»', key: 'М', url: '', meta: '', on: true },
    { id: 'retro', name: 'Ретро FM', key: 'Р', url: '', meta: '', on: true },
    { id: 'seven', name: 'Радио 7 на семи холмах', key: '7', url: '', meta: '', on: true }
  ];
  const R = (G.radio = { st: DEF.map(s => Object.assign({}, s)), cfgOn: true, prefs: { on: true, vol: 0.6, i: 0 }, playing: false, status: '', track: '', audio: null });
  try { Object.assign(R.prefs, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const savePrefs = () => { try { localStorage.setItem(KEY, JSON.stringify(R.prefs)); } catch (e) {} };
  const $ = id => document.getElementById(id);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cur = () => R.st[R.prefs.i] || R.st[0];

  // Настройки станций с сервера (только https-адреса)
  R.setConfig = function (c) {
    if (!c) return;
    R.cfgOn = c.on !== false;
    (c.stations || []).forEach(x => { const s = R.st.find(y => y.id === x.id); if (s) { s.name = x.name || s.name; s.url = /^https:\/\//.test(x.url || '') ? x.url : ''; s.meta = /^https:\/\//.test(x.meta || '') ? x.meta : ''; s.on = x.on !== false; } });
    if (!R.cfgOn || !cur().on) { stop(); }
    R.sync();
  };

  function build() {
    const el = $('radio'); if (!el || el.firstChild) return;
    el.innerHTML = '<div class="rd-body"><button class="rd-play" id="rdPlay" aria-label="Играть/пауза"></button>'
      + '<div class="rd-dial"><div class="rd-name" id="rdName"></div><div class="rd-trk" id="rdTrk"></div><div class="rd-scale"><i id="rdNeedle"></i></div></div>'
      + '<div class="rd-keys" id="rdKeys"></div>'
      + '<input class="rd-vol" id="rdVol" type="range" min="0" max="100" aria-label="Громкость"></div>';
    $('rdPlay').onclick = toggle;
    $('rdVol').oninput = function () { R.prefs.vol = this.value / 100; if (R.audio) R.audio.volume = R.prefs.vol; savePrefs(); };
    $('rdKeys').onclick = e => { const b = e.target.closest('button[data-i]'); if (b) select(+b.dataset.i); };
  }
  function paint() {
    if (!$('rdPlay')) return;
    const s = cur();
    $('rdPlay').textContent = R.playing ? '❚❚' : '▶';
    $('rdPlay').classList.toggle('on', R.playing);
    $('rdName').textContent = s.name;
    $('rdTrk').textContent = R.playing ? (R.status === 'live' ? (R.track || 'в эфире') : R.status) : (s.url ? 'выключено' : 'станция не настроена');
    $('rdNeedle').style.left = (16 + R.prefs.i * 34) + '%';
    $('rdVol').value = Math.round(R.prefs.vol * 100);
    $('rdKeys').innerHTML = R.st.map((x, i) => '<button data-i="' + i + '" class="' + (i === R.prefs.i ? 'on' : '') + '" ' + (x.on ? '' : 'disabled') + ' aria-label="' + esc(x.name) + '">' + x.key + '</button>').join('');
    $('rdTrk').classList.toggle('live', R.playing && R.status === 'live');
  }
  function stop() {
    R.playing = false; R.status = ''; R.track = '';
    if (R.audio) { try { R.audio.pause(); R.audio.removeAttribute('src'); R.audio.load(); } catch (e) {} R.audio = null; }
    clearInterval(R.metaT); paint();
  }
  function start() { // вызывается только из обработчика нажатия
    const s = cur();
    if (!s.url) { R.playing = true; R.status = 'нет сигнала'; paint(); setTimeout(() => { if (R.status === 'нет сигнала') stop(); }, 1800); return; }
    if (R.audio) { try { R.audio.pause(); } catch (e) {} }
    const a = (R.audio = new Audio()); a.preload = 'none'; a.volume = R.prefs.vol;
    R.playing = true; R.status = 'соединение…'; R.track = ''; paint();
    a.addEventListener('playing', () => { if (R.audio === a) { R.status = 'live'; paint(); } });
    a.addEventListener('waiting', () => { if (R.audio === a) { R.status = 'буферизация…'; paint(); } });
    a.addEventListener('error', () => { if (R.audio === a) { R.status = 'нет связи с эфиром'; R.playing = false; paint(); } });
    a.addEventListener('stalled', () => { if (R.audio === a && R.status === 'live') { R.status = 'помехи…'; paint(); } });
    a.src = s.url;
    const p = a.play(); if (p && p.catch) p.catch(() => { if (R.audio === a) { R.status = 'нажмите ещё раз'; R.playing = false; paint(); } });
    clearInterval(R.metaT);
    if (s.meta) { const poll = () => meta(s); poll(); R.metaT = setInterval(poll, 20000); }
  }
  function toggle() { if (R.playing) stop(); else start(); }
  function select(i) {
    if (!R.st[i] || !R.st[i].on) return;
    R.prefs.i = i; savePrefs();
    try { G.buzz && G.buzz('light'); } catch (e) {}
    if (R.playing) start(); else paint();
  }
  // Текущая композиция — только если источник отдаёт JSON (title/song/now_playing…)
  function meta(s) {
    fetch(s.meta, { cache: 'no-store' }).then(r => r.json()).then(j => {
      let t = j && (j.title || j.song || j.current_track || (j.now_playing && j.now_playing.song && (j.now_playing.song.text || j.now_playing.song.title)) || (j.icestats && j.icestats.source && (Array.isArray(j.icestats.source) ? j.icestats.source[0] : j.icestats.source).title));
      if (typeof t === 'object' && t) t = t.title || t.name || '';
      if (cur() === s && typeof t === 'string') { R.track = '♪ ' + t.slice(0, 80); paint(); }
    }).catch(() => {});
  }
  // Показ/скрытие полосы: только в игре, если радио не отключено игроком или владельцем
  R.sync = function () {
    const el = $('radio'), nav = $('nav'); if (!el) return;
    build();
    const show = R.cfgOn && R.prefs.on && nav && !nav.classList.contains('hide');
    el.classList.toggle('hide', !show);
    if (!show && R.playing) stop();
    if (show) paint();
  };
  R.toggleEnabled = function () { R.prefs.on = !R.prefs.on; savePrefs(); if (!R.prefs.on) stop(); R.sync(); G.ui && (G.ui.keepScroll = true, G.ui.render()); };
  R.label = () => !R.cfgOn ? 'отключено администрацией' : R.prefs.on ? 'вкл' : 'выкл';
  window.addEventListener('pagehide', () => { if (R.playing) stop(); });
  if (G.ui && G.ui.render) { const r0 = G.ui.render; G.ui.render = function () { const x = r0.apply(this, arguments); try { R.sync(); } catch (e) {} return x; }; }
})();
