/* ===== Этап 5: безопасные сохранения =====
   • перед миграцией (первая загрузка после обновления) создаётся резервная копия «до обновления»;
   • скользящая резервная копия «последнее исправное состояние» (не чаще раза в 10 минут и только если состояние прошло проверку);
   • после загрузки проверяется, что деньги, долги, кредиты/ипотеки, квартира, ранг, смены и день не изменились миграцией;
   • повреждённое сохранение не затирается: копия уходит в «_corrupt», игра пробует восстановиться из резервных копий;
   • экспорт/импорт сохранения (отладочное меню → «Сохранение»).
   Ничего не обнуляется и не списывается повторно. Резервные копии лежат в localStorage рядом с основным сохранением. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const KEY = G.SAVE_KEY;
  const K = G.SAVEKEYS = { rolling: KEY + '_backup', rollingMeta: KEY + '_backup_meta', pre: KEY + '_premig', preMeta: KEY + '_premig_meta', corrupt: KEY + '_corrupt' };
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
  const valid = d => !!(d && d.s && d.s.st && d.s.t);
  const parse = raw => { try { return JSON.parse(raw); } catch (e) { return null; } };
  const log = (kind, text) => { try { if (G.diag && G.diag.note) G.diag.note(kind, text); } catch (e) {} };

  // Что обязано пережить любую миграцию без изменений
  G.saveInvariants = function (s) {
    const loans = (s.loans || []).map(l => ({ id: l.id, type: l.type, left: l.left, pay: l.pay, v: l.v, hist: (l.hist || []).length, principal: l.amount != null ? l.amount : l.principal }));
    return JSON.stringify({ money: s.money, debt: s.debt, flat: !!(s.own && s.own.flat), own: s.own ? Object.keys(s.own).sort() : [], loans, rank: s.car && s.car.rank, shifts: s.car && s.car.shifts, day: s.t && s.t.day, name: s.name });
  };
  // Проверка состояния на «битость» (NaN, выход за допустимое)
  G.saveSane = function (s) {
    const bad = [], fin = (v, n) => { if (typeof v !== 'number' || !isFinite(v)) bad.push(n); };
    if (!s || !s.st || !s.t || !s.car) return ['структура'];
    fin(s.money, 'деньги'); fin(s.t.day, 'день'); fin(s.car.rank, 'ранг'); fin(s.car.shifts, 'смены');
    ['health', 'energy', 'mood', 'satiety'].forEach(k => fin(s.st[k], k));
    if (s.car.rank < 0 || s.car.rank > 10) bad.push('ранг вне диапазона');
    if (s.loans && !Array.isArray(s.loans)) bad.push('кредиты');
    return bad;
  };

  let preInv = null;
  const _load = G.load;
  G.load = function () {
    const raw = ls.get(KEY); let pre = raw ? parse(raw) : null; G.loadInfo = { raw: !!raw, recovered: null, preBackup: false, invariants: null };
    if (raw && valid(pre)) {
      preInv = G.saveInvariants(pre.s);
      const cur = (G.CONFIG && G.CONFIG.VERSION) || '', from = pre.s.gameVer || '';
      const m = parse(ls.get(K.preMeta) || 'null');
      if (from !== cur && !(m && m.from === from && m.to === cur)) {
        if (ls.set(K.pre, raw)) { ls.set(K.preMeta, JSON.stringify({ from, to: cur, ts: Date.now(), day: pre.s.t.day, shifts: pre.s.car && pre.s.car.shifts })); G.loadInfo.preBackup = true; log('save', 'резервная копия перед обновлением ' + from + ' → ' + cur); }
        else log('save', 'не удалось записать резервную копию (localStorage заполнен?)');
      }
    }
    let ok = _load.apply(this, arguments);
    if (!ok && raw) {                                              // сохранение есть, но не читается
      ls.set(K.corrupt, raw); log('save', 'основное сохранение не читается, копия в _corrupt');
      for (const [nm, key] of [['скользящая копия', K.rolling], ['копия до обновления', K.pre]]) {
        const b = ls.get(key), d = b && parse(b); if (!valid(d)) continue;
        ls.set(KEY, b); ok = _load.apply(this, arguments);
        if (ok) { G.loadInfo.recovered = nm; log('save', 'восстановлено из: ' + nm); setTimeout(() => { try { G.toast('♻ Сохранение было повреждено и восстановлено из резервной копии (' + nm + ').', 'warn'); } catch (e) {} }, 1200); break; }
      }
      if (!ok) { ls.set(KEY, raw); }                               // ничего не помогло — оставляем как было, не стираем
    } else if (ok && preInv != null && G.loadInfo.recovered == null) {
      const now = G.saveInvariants(G.s);
      G.loadInfo.invariants = now === preInv;
      if (now !== preInv) { log('save', 'МИГРАЦИЯ ИЗМЕНИЛА ДАННЫЕ ИГРОКА; копия до обновления: ' + K.pre); G.migrationMismatch = { before: preInv, after: now }; setTimeout(() => { try { G.toast('⚠ После обновления данные сохранения изменились. Резервная копия сохранена (меню отладки → Сохранение).', 'warn'); } catch (e) {} }, 1500); }
    }
    return ok;
  };

  // скользящая копия: не чаще раза в 10 минут и только для исправного состояния
  let lastRoll = 0;
  const _save = G.save;
  G.save = function () {
    const r = _save.apply(this, arguments);
    try {
      if (!G.headless && G.s && G.s.phase !== 'new' && Date.now() - lastRoll > 600000) {
        const bad = G.saveSane(G.s);
        if (bad.length) { log('save', 'состояние не прошло проверку: ' + bad.join(', ')); }
        else { const raw = ls.get(KEY); if (raw && ls.set(K.rolling, raw)) { ls.set(K.rollingMeta, JSON.stringify({ ts: Date.now(), day: G.s.t.day, shifts: G.s.car.shifts, ver: G.CONFIG.VERSION })); lastRoll = Date.now(); } }
      }
    } catch (e) {}
    return r;
  };
  G.forceBackup = function () { lastRoll = 0; return G.save(); };

  // информация и действия для меню отладки
  G.saveBackups = function () {
    const one = (key, meta) => { const raw = ls.get(key); if (!raw) return null; const m = parse(ls.get(meta) || 'null') || {}; const d = parse(raw); return { key, meta: m, size: raw.length, ok: valid(d), day: valid(d) ? d.s.t.day : null, shifts: valid(d) ? d.s.car.shifts : null }; };
    return { rolling: one(K.rolling, K.rollingMeta), pre: one(K.pre, K.preMeta), corrupt: ls.get(K.corrupt) ? { size: ls.get(K.corrupt).length } : null };
  };
  // восстановление: текущее сохранение предварительно копируется в _before_restore
  G.restoreBackup = function (which) {
    const key = which === 'pre' ? K.pre : K.rolling, b = ls.get(key), d = b && parse(b);
    if (!valid(d)) return false;
    const cur = ls.get(KEY); if (cur) ls.set(KEY + '_before_restore', cur);
    ls.set(KEY, b); try { location.reload(); } catch (e) {} return true;
  };
  G.exportSave = function () { return ls.get(KEY) || ''; };
  G.importSave = function (text) {
    const d = parse(String(text || '').trim());
    if (!valid(d)) return { ok: false, error: 'Это не сохранение игры (нет данных персонажа).' };
    const bad = G.saveSane(d.s); if (bad.length) return { ok: false, error: 'Сохранение повреждено: ' + bad.join(', ') };
    const cur = ls.get(KEY); if (cur) ls.set(KEY + '_before_import', cur);
    ls.set(KEY, JSON.stringify(d)); return { ok: true };
  };
})();
