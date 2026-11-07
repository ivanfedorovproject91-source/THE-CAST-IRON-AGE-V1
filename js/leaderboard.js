/* ===== Общий рейтинг: клиент (сервер — Google Apps Script + Google Таблица, см. инструкцию) =====
   Три рейтинга: личный, предприятий и бригадный (еженедельное соревнование). */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const CFG = G.CONFIG;
  const LB = (G.lb = { cache: {}, last: 0, by: 'oj', sec: 'me', err: null, loading: false, status: '', brigMsg: '' });
  LB.configured = () => !!CFG.API_URL;
  function devId() {
    try { let d = localStorage.getItem('cv_dev_id'); if (!d) { d = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem('cv_dev_id', d); } return d; } catch (e) { return 'nodev'; }
  }
  function tg() { try { return window.Telegram && window.Telegram.WebApp; } catch (e) { return null; } }
  LB.uid = function () { const t = tg(), u = t && t.initDataUnsafe && t.initDataUnsafe.user; return u && u.id ? 'tg:' + u.id : 'dev:' + devId(); };
  const seasonId = () => new Date().toISOString().slice(0, 7);
  function weekId() { // ISO-неделя (UTC), как на сервере
    const d = new Date(), t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), dn = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dn); const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
    return y + '-W' + ('0' + w).slice(-2);
  }
  // Очки недели для бригадных соревнований: смены × 100 + выпущенные детали
  G.weekPts = function () {
    const s = G.s, f = s.flags, e = f.eco || {}, w = weekId(), made = e.made || 0;
    if (!f.wkBase || f.wkBase.w !== w) f.wkBase = { w: w, shifts: s.car.shifts, made: made };
    return Math.max(0, (s.car.shifts - f.wkBase.shifts) * 100 + (made - f.wkBase.made));
  };
  LB.payload = function () {
    const s = G.s, t = tg(), f = s.flags, e = f.eco || {}, st = f.staff || [], made = e.made || 0;
    return { action: 'score', v: CFG.VERSION, name: s.name, oj: G.ojScore(), shifts: s.car.shifts, rank: s.car.rank, days: s.t.day, money: Math.round(s.money), job: G.jobTitle(), end: s.end ? s.end.id : null, hidden: G.settings.lbOn === false,
      season: seasonId(), seasonBest: G.seasonBest ? G.seasonBest() : 0, dev: devId(), initData: t && t.initData ? t.initData : '',
      pay: G.monthlyPay ? G.monthlyPay() : 0, profit: Math.round((e.rev || 0) - (e.exp || 0)), made: made, staff: st.length, quality: made ? Math.round((1 - (e.rej || 0) / made) * 100) : 0,
      shop: 'Цех «' + s.name + '»', week: weekId(), wkPts: G.weekPts() };
  };
  function post(body) {
    return fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }).then(r => r.json());
  }
  // Отправка результата. Не чаще раза в 45 секунд (кроме force). Читерам (отладочное меню) — не отправляем.
  LB.submit = function (force) {
    const s = G.s;
    if (!LB.configured() || !s || s.flags.dbg || s.phase === 'new') return;
    const now = Date.now();
    if (!force && now - LB.last < 45000) return;
    LB.last = now;
    try { post(LB.payload()).then(j => { LB.status = j && j.ok ? 'ok ' + new Date().toLocaleTimeString() : 'ошибка: ' + ((j && j.error) || '?'); if (j && j.ok) LB.cache = {}; }).catch(e => { LB.status = 'нет связи: ' + String(e.message || e); }); } catch (e) { LB.status = 'ошибка: ' + e; }
  };
  LB.load = function (by, force) {
    if (!LB.configured() || LB.loading) return;
    const c = LB.cache[by];
    if (c && !force && Date.now() - c.t < 60000) return;
    LB.loading = true; LB.err = null;
    fetch(CFG.API_URL + (CFG.API_URL.indexOf('?') >= 0 ? '&' : '?') + 'action=top&by=' + encodeURIComponent(by) + '&limit=50&uid=' + encodeURIComponent(LB.uid()))
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(j => { if (!j || j.ok === false) throw new Error((j && j.error) || 'ошибка сервера'); LB.cache[by] = { t: Date.now(), data: j }; if (by === 'brig') LB.checkPrize(j); })
      .catch(e => { LB.err = String(e.message || e); })
      .then(() => { LB.loading = false; if (G.ui && G.ui.tab === 'rating' && !G.cur) { G.ui.keepScroll = true; G.ui.render(); } });
  };
  // Бригады: создать, вступить, выйти (сначала нужно хотя бы раз отправить результат)
  LB.brig = function (action, name) {
    if (!LB.configured()) return;
    LB.brigMsg = 'Подожди…';
    LB.submit(true);
    setTimeout(() => {
      post({ action: action, name: name || '', dev: devId(), initData: (tg() && tg().initData) || '' }).then(j => {
        LB.brigMsg = j && j.ok ? (action === 'brigade_leave' ? 'Ты вышел из бригады.' : 'Готово: бригада «' + j.name + '».') : ((j && j.error) || 'Не удалось');
        if (j && j.ok) { G.s.flags.brigade = action === 'brigade_leave' ? '' : j.name; LB.cache = {}; G.save && G.save(); }
      }).catch(e => { LB.brigMsg = 'Нет связи: ' + String(e.message || e); }).then(() => { if (G.ui) { G.ui.keepScroll = true; G.ui.render(); } });
    }, 1200);
  };
  // Награда: если бригада победила в прошлой неделе — звание и достижение
  LB.checkPrize = function (j) {
    const s = G.s, f = s && s.flags, L = j && j.last; if (!f || !L || !L.top || !L.top.length || !j.my) return;
    if (L.top[0].name === j.my.name && f.brigPrize !== L.week) {
      f.brigPrize = L.week; f.title = 'Бригадир-победитель недели ' + L.week; G.achieve && G.achieve('brig_win_' + L.week, 'Бригада «' + j.my.name + '» — лучшая на неделе ' + L.week);
      G.toast && G.toast('🏆 Твоя бригада победила в соревновании недели! Звание получено.', 'good');
    }
  };
})();
