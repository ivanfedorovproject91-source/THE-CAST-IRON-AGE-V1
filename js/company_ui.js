/* ===== Интерфейс «Кабинет» генерального директора =====
   Отрисовка — чистые функции: они ничего не считают и не меняют (кроме выбора раздела).
   Все действия идут через G.cab.a(...) → функции модулей G.co.* → сохранение → перерисовка. */
(function () {
  'use strict';
  const G = window.G, CO = G.co, C = G.clamp;
  const CAB = (G.cab = { sec: 'home', open: null });
  const SECS = [['home', '🏢', 'Главная'], ['prod', '🏭', 'Производство'], ['fin', '💰', 'Финансы'], ['staff', '👥', 'Персонал'], ['supply', '🚚', 'Закупки'], ['sales', '📈', 'Продажи'], ['dev', '🏗', 'Развитие'], ['board', '🏛', 'Совет'], ['docs', '🗂', 'Документы']];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const A = (path) => { const args = Array.prototype.slice.call(arguments); return 'onclick="G.cab.a(' + esc(JSON.stringify(args)) + ')"'; };
  const AC = (msg, path) => { const args = Array.prototype.slice.call(arguments, 1); return 'onclick="G.cab.ask(' + esc(JSON.stringify(msg)) + ',' + esc(JSON.stringify(args)) + ')"'; };
  const cls = v => (v >= 60 ? '' : v >= 35 ? 'warn' : 'bad');
  const bar = (label, pct, txt, k) => '<div class="bar ' + (k != null ? k : cls(pct)) + '" style="margin:3px 0"><i style="width:' + C(pct, 0, 100) + '%"></i><span><span>' + label + '</span><span>' + (txt != null ? txt : Math.round(pct) + '%') + '</span></span></div>';
  const kv = (a, b) => '<div class="kv"><span>' + a + '</span><span>' + b + '</span></div>';
  const card = (title, body, extra) => '<div class="card ' + (extra || '') + '"><h3>' + title + '</h3>' + body + '</div>';
  const btn = (txt, act, o) => { o = o || {}; return '<button class="btn ' + (o.c || '') + '" ' + (o.dis ? 'disabled ' : '') + act + '>' + txt + (o.sub ? '<small>' + o.sub + '</small>' : '') + '</button>'; };
  const row2 = (a, b) => '<div class="cab-row">' + a + b + '</div>';
  const sg = v => (v > 0 ? '+' : '') + CO.m(v);

  // мини-график (SVG-линия) по ряду значений
  const spark = (vals, color) => {
    if (!vals || vals.length < 2) return '<div class="note">График появится после двух недель работы.</div>';
    const w = 300, h = 44, mn = Math.min.apply(null, vals.concat([0])), mx = Math.max.apply(null, vals.concat([1])), rg = (mx - mn) || 1;
    const pts = vals.map((v, i) => (i * w / (vals.length - 1)).toFixed(1) + ',' + (h - 4 - (v - mn) / rg * (h - 8)).toFixed(1)).join(' ');
    const zero = (h - 4 - (0 - mn) / rg * (h - 8)).toFixed(1);
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><line x1="0" x2="' + w + '" y1="' + zero + '" y2="' + zero + '" stroke="#555" stroke-dasharray="3 3"/><polyline fill="none" stroke="' + (color || '#f2b705') + '" stroke-width="2.5" points="' + pts + '"/></svg>';
  };

  CAB.open = function (sec) { CAB.sec = sec || 'home'; G.ui.tab = 'cabinet'; G.ui.render(); };
  CAB.go = function (sec) { CAB.sec = sec; G.ui.render(); const el = document.getElementById('screen'); if (el) el.scrollTop = 0; };
  CAB.a = function (args) {
    const path = args[0].split('.'), rest = args.slice(1);
    const c = CO.get(); if (!c) return;
    let fn = CO; path.forEach(p => { fn = fn && fn[p]; });
    if (typeof fn !== 'function') return;
    try { fn.apply(null, rest); } catch (e) { if (window.console) console.error(e); }
    if (G.save) G.save(); G.ui.keepScroll = true; G.ui.render();
  };
  CAB.ask = function (msg, args) {
    G.modal({ title: 'Подтвердите распоряжение', text: msg, opts: [{ t: '✅ Подписать', fn: () => CAB.a(args) }, { t: 'Отмена', fn: () => {} }] });
  };
  CAB.choose = function (uid, i) { CO.ev.choose(uid, i); if (G.save) G.save(); G.ui.keepScroll = true; G.ui.render(); };
  CAB.rep = function (w) { CAB.repOpen = CAB.repOpen === w ? null : w; G.ui.keepScroll = true; G.ui.render(); };

  // ---------- Шапка кабинета (панорамное окно на завод, письменный стол)
  function scene(c) {
    const s = G.s, smoke = CO.avgCond(c) < 45 ? '#5a4a40' : '#7a7873';
    const svg = '<svg viewBox="0 0 360 132" preserveAspectRatio="xMidYMid slice" class="cab-svg" aria-hidden="true">' +
      '<defs><linearGradient id="csky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2f28"/><stop offset=".6" stop-color="#7a4a2c"/><stop offset="1" stop-color="#c27a3a"/></linearGradient></defs>' +
      '<rect width="360" height="96" fill="url(#csky)"/>' +
      '<g fill="#1a1512"><rect x="14" y="52" width="60" height="44"/><rect x="30" y="30" width="9" height="26"/><rect x="52" y="22" width="9" height="34"/><rect x="92" y="60" width="90" height="36"/><rect x="108" y="38" width="12" height="24"/><rect x="200" y="46" width="70" height="50"/><rect x="214" y="26" width="10" height="24"/><rect x="236" y="34" width="10" height="16"/><rect x="290" y="58" width="66" height="38"/><rect x="306" y="40" width="8" height="20"/></g>' +
      '<g fill="' + smoke + '" opacity=".75"><ellipse cx="34" cy="22" rx="12" ry="7"/><ellipse cx="46" cy="12" rx="14" ry="8"/><ellipse cx="56" cy="14" rx="13" ry="7"/><ellipse cx="219" cy="18" rx="13" ry="7"/><ellipse cx="231" cy="8" rx="15" ry="8"/><ellipse cx="310" cy="32" rx="9" ry="5"/></g>' +
      '<g fill="#ffb347"><rect x="22" y="70" width="5" height="4"/><rect x="36" y="70" width="5" height="4"/><rect x="104" y="74" width="5" height="4"/><rect x="126" y="74" width="5" height="4"/><rect x="214" y="62" width="5" height="4"/><rect x="236" y="62" width="5" height="4"/></g>' +
      '<g stroke="#0e0b09" stroke-width="5" fill="none"><rect x="3" y="3" width="354" height="93"/><line x1="120" y1="3" x2="120" y2="96"/><line x1="240" y1="3" x2="240" y2="96"/><line x1="3" y1="50" x2="357" y2="50" stroke-width="3"/></g>' +
      '<rect x="0" y="96" width="360" height="36" fill="#2b1d14"/><rect x="0" y="96" width="360" height="5" fill="#4a3220"/>' +
      '<g><rect x="30" y="104" width="52" height="20" fill="#d6c9a8" transform="rotate(-4 56 114)"/><rect x="34" y="106" width="52" height="20" fill="#c8b98f" transform="rotate(3 60 116)"/><circle cx="270" cy="114" r="11" fill="#7a1f1a"/><circle cx="270" cy="114" r="7" fill="none" stroke="#b0392e" stroke-width="1.5"/><rect x="298" y="102" width="44" height="22" rx="2" fill="#1d1a18"/><rect x="302" y="105" width="36" height="14" fill="#6aa0c8" opacity=".5"/></g></svg>';
    return '<div class="cab-scene">' + svg + '<div class="cab-title"><b>' + CO.NAME + '</b><small>Генеральный директор: ' + (s.name || s.pname || 'вы') + ' · ' + G.dateStr() + '</small></div></div>';
  }
  function status(c) {
    const idx = (CO.avgCond(c) + c.morale + c.safety + c.rep + C(c.treasury / 1e6 * 2, 0, 100)) / 5;
    return idx >= 62 ? ['Устойчивое', 'good'] : idx >= 45 ? ['Рабочее', 'warn'] : ['Тяжёлое', 'bad'];
  }

  // ---------- Решения (общий блок)
  function evCard(e) {
    const c = CO.get(), v = CO.ev.view(c, e); if (!v) return '';
    return '<div class="cab-ev ' + (v.board ? 'board' : '') + '"><div class="cab-ev-h"><b>' + v.icon + ' ' + v.title + '</b><small>' + (v.left <= 1 ? '⏳ срок истекает' : 'ещё ' + v.left + ' дн.') + '</small></div><div class="note">' + v.text + '</div>' +
      v.opts.map((o, i) => '<button class="btn" ' + (o.dis ? 'disabled ' : '') + 'onclick="G.cab.choose(' + e.uid + ',' + i + ')">' + o.t + (o.h || o.dis ? '<small>' + (o.dis || o.h) + '</small>' : '') + '</button>').join('') + '</div>';
  }
  function decisions(c, onlyBoard) {
    const list = c.pending.filter(e => !!e.board === !!onlyBoard);
    if (onlyBoard) return list.length ? list.map(evCard).join('') : '<div class="note" style="padding:8px 0">Повестки нет: совет отдыхает.</div>';
    return '<div class="cab-req"><h3>⚠ ТРЕБУЕТ ВАШЕГО РЕШЕНИЯ' + (list.length ? ' · ' + list.length : '') + '</h3>' + (list.length ? list.map(evCard).join('') : '<div class="note">Срочных вопросов нет. Подозрительно спокойно — проверьте почту.</div>') + '</div>';
  }

  // ======================================================================
  function home(c) {
    const r = c.reports[0], st = status(c), pl = r ? r.planPct : 0, brak = r ? r.brakPct : 0;
    const last = c.reports.slice(0, 8).reverse();
    const debt = CO.debtTotal(c), needs = CO.fin.nextNeed(c), act = c.contracts.filter(k => k.status === 'active');
    let h = scene(c);
    h += '<div class="cab-stat ' + st[1] + '"><span>Состояние предприятия</span><b>' + st[0] + '</b></div>';
    h += decisions(c, false);
    h += '<div class="cab-kpi">' +
      '<div class="kpi"><small>💰 Касса</small><b class="' + (c.treasury < 0 ? 'neg' : '') + '">' + CO.m(c.treasury) + '</b><em>ещё нужно ≈ ' + CO.m(needs.total) + '</em></div>' +
      '<div class="kpi"><small>📥 Доходы (нед.)</small><b>' + (r ? CO.m(r.rev) : '—') + '</b><em>по отгрузкам</em></div>' +
      '<div class="kpi"><small>📤 Расходы (нед.)</small><b>' + (r ? CO.m(r.expTotal) : '—') + '</b><em>в т. ч. налоги</em></div>' +
      '<div class="kpi"><small>📊 Прибыль / убыток</small><b class="' + (r && r.profit < 0 ? 'neg' : 'pos') + '">' + (r ? sg(r.profit) : '—') + '</b><em>за прошлую неделю</em></div>' +
      '<div class="kpi"><small>🏭 Выпуск (нед.)</small><b>' + (r ? CO.t(r.made) : '—') + '</b><em>' + (r ? 'план выполнен на ' + CO.pc(pl) : 'ждём первую неделю') + '</em></div>' +
      '<div class="kpi"><small>🧾 Задолженности</small><b class="' + (c.arrears.wages + c.arrears.tax + c.arrears.other > 0 ? 'neg' : '') + '">' + CO.m(debt) + '</b><em>кредиты + долги</em></div></div>';
    h += card('Показатели', bar('⚙️ Оборудование', CO.avgCond(c)) + bar('✅ Качество продукции', (1 - brak) * 100 || 96) + bar('🙂 Боевой дух персонала', c.morale) + bar('🦺 Безопасность', c.safety) + bar('📣 Репутация', c.rep) + bar('🏛 Доверие собственников', c.board.trust));
    h += card('Динамика прибыли (8 нед.)', spark(last.map(x => x.profit), '#f2b705') + '<div class="note">Касса по неделям:</div>' + spark(last.map(x => x.cashEnd), '#6aa0c8'));
    h += card('Активные контракты (' + act.length + ')', act.length ? act.map(k => '<div class="kv"><span>' + CO.sales.cust(k.cust).i + ' №' + k.n + ' ' + k.name + '</span><span>' + CO.pc(k.delivered / k.vol) + (CO.today() > k.due ? ' <b style="color:var(--red)">просрочен</b>' : '') + '</span></div>').join('') : '<div class="note">Нет активных контрактов — принимайте заказы в разделе «Продажи».</div>');
    const pr = CO.problems(c);
    h += card('Текущие проблемы', pr.length ? pr.slice(0, 8).map(p => '<div class="req ' + (p.k === 'bad' ? 'no' : '') + '">' + (p.k === 'bad' ? '🔴 ' : '🟡 ') + p.x + '</div>').join('') : '<div class="note">Серьёзных проблем нет. Это тоже сигнал — но приятный.</div>');
    return h;
  }

  // ---------- Производство
  function prod(c) {
    const P = CO.prod, lr = c.lastRun || {};
    let h = card('Сквозной выпуск', kv('Выпуск за сутки (последний)', CO.t(lr.F || 0) + ' из ' + CO.t(lr.plan || P.planFin(c))) + kv('Узкое место', CO.dept(c.bottleneck).n) + (lr.why ? '<div class="req no">⚠ ' + lr.why + '</div>' : '<div class="req ok">✅ План выполнен.</div>') +
      '<div class="note">Плавка → литьё → механика. Выпуск ограничен самым слабым звеном, сырьём, людьми и состоянием оборудования; рост плана выше мощности только изнашивает станки.</div>');
    h += card('Резерв на ремонт', kv('Отложено', CO.m(c.repairFund)) + '<div class="cab-row">' + btn('+ 2 млн', A('prod.reserve', 2e6)) + btn('− 2 млн', A('prod.reserve', -2e6)) + '</div><div class="note">Резерв расходуется на ремонт и обслуживание в первую очередь — касса не страдает при авариях.</div>');
    CO.DEPTS.forEach(def => {
      const x = c.depts[def.id], e = P.eff(c, def.id), need = P.need(c, def.id), sup = def.kind === 'sup';
      const state = x.down > 0 ? '🔴 простой ' + x.down + ' дн.' : x.stop ? '⏸ остановлено' : x.cond < 35 ? '🟠 на пределе' : '🟢 работает';
      let b = '<div class="cab-badge">' + state + '</div>' + bar('Состояние оборудования', x.cond) + bar('Кадры', C(x.staff / need * 100, 0, 100), x.staff + ' / ' + Math.round(need)) + (sup ? '' : bar('Загрузка', C(x.last.util * 100 / 1.25, 0, 100), Math.round(x.last.util * 100) + '%', 'blue')) + bar('Брак', C(100 - x.defect * 400, 0, 100), Math.round(x.defect * 100) + '%');
      b += kv('Мощность', sup ? 'обеспечивающее' : Math.round(def.cap * (c.mods.cap[def.id] || 1)) + ' ' + def.unit) + kv('Эффективность', CO.pc(e.total)) + kv('Ответственный', CO.staff.ROLES[x.resp].i + ' ' + CO.staff.name(c, x.resp));
      if (!sup) b += kv('План (нагрузка)', '<b>' + CO.pc(x.plan) + '</b>') + kv('Выполнение за неделю', x.wk.plan > 0 ? CO.pc(x.wk.made / x.wk.plan) : '—') + kv('Простои за неделю', x.wk.idle + ' дн.');
      b += kv('Обслуживание', P.MAINT_NAMES[x.maint] + ' · ' + CO.m(P.maintWeekCost(def.kind, x.maint)) + '/нед.');
      if (!sup) b += '<div class="cab-row">' + btn('План −5%', A('prod.setPlan', def.id, x.plan - 0.05), { dis: x.plan <= 0.5 }) + btn('План +5%', A('prod.setPlan', def.id, x.plan + 0.05), { dis: x.plan >= 1.3 }) + '</div>';
      b += '<div class="cab-row">' + [0, 1, 2].map(i => '<button class="btn mini ' + (x.maint === i ? 'on' : '') + '" ' + A('prod.setMaint', def.id, i) + '>' + ['Без ТО', 'Обычное', 'Профилакт.'][i] + '</button>').join('') + '</div>';
      b += '<div class="cab-row">' + btn((x.ot ? '⏱ Отменить сверхурочные' : '⏱ Сверхурочные'), A('prod.toggleOT', def.id), { c: x.ot ? 'red' : '' }) + btn(x.stop ? '▶ Запустить' : '⏹ Остановить', A('prod.setStop', def.id, !x.stop), { c: x.stop ? 'green' : 'red' }) + '</div>';
      b += '<div class="cab-row">' + btn('🩹 Быстрый ремонт', AC('Быстрый ремонт: ' + CO.m(sup ? 0.5e6 : 1.6e6) + ', простой 2 дня, состояние +16. «Заплатка» ускорит износ. Подписать?', 'prod.quickRepair', def.id), { sub: sup ? '0,5 млн' : '1,6 млн' }) + btn('🔩 Капитальный', AC('Капитальный ремонт: ' + CO.m(sup ? 3e6 : 9e6) + ' и ' + (sup ? 2 : 3) + ' нед. работы на 40% мощности. Состояние → 96%. Подписать?', 'prod.startProject', 'cap_' + def.id), { sub: sup ? '3 млн · 2 нед.' : '9 млн · 3 нед.' }) + '</div>';
      b += '<div class="cab-row">' + ['prod', 'eng', 'otk', 'sup'].map(r => '<button class="btn mini ' + (x.resp === r ? 'on' : '') + '" ' + A('prod.assign', def.id, r) + '>' + CO.staff.ROLES[r].i + '</button>').join('') + '</div><div class="note">Значки: ответственный руководитель (производство · инженер · ОТК · снабжение). Чужая специализация — эффективность ниже.</div>';
      b += '<div class="cab-row">' + [1, 2, 3].map(i => '<button class="btn mini ' + (x.prio === i ? 'on' : '') + '" ' + A('prod.setPrio', def.id, i) + '>Приоритет ' + i + '</button>').join('') + '</div>';
      h += card(def.i + ' ' + def.n, b);
    });
    return h;
  }

  // ---------- Финансы
  function fin(c) {
    const F = CO.fin, r = c.reports[0], need = F.nextNeed(c), inc = F.incomingCash(c, 7);
    let h = card('Касса и ликвидность', kv('Деньги предприятия', '<b class="' + (c.treasury < 0 ? 'neg' : '') + '">' + CO.m(c.treasury) + '</b>') + kv('Дебиторка (ждём оплат)', CO.m(CO.sales.receivable(c))) + kv('Поступит за 7 дней', CO.m(inc)) +
      '<div class="note">На следующую неделю нужно:</div>' + kv('Зарплата и руководители', CO.m(need.wages)) + kv('Аренда, охрана, соцрасходы', CO.m(need.fixed)) + kv('Обслуживание + энергия', CO.m(need.maint + need.energy)) + kv('Закупки до нормы', CO.m(need.buy)) + kv('Кредиты', CO.m(need.loans)) + kv('Налоги', CO.m(need.tax)) + (need.proj ? kv('Проекты', CO.m(need.proj)) : '') + (need.arrears ? kv('Долги', CO.m(need.arrears)) : '') +
      '<div class="kv"><span><b>Итого</b></span><span><b>' + CO.m(need.total) + '</b></span></div>' + (c.treasury + inc < need.total ? '<div class="req no">⚠ Возможен кассовый разрыв: денег и поступлений не хватает.</div>' : '<div class="req ok">✅ Деньги на неделю есть.</div>') +
      '<div class="note">«Прибыль» и «деньги» — разные вещи: контракты оплачиваются с задержкой, а зарплата — по пятницам.</div>');
    if (r) {
      const items = [['raw', 'Сырьё и материалы (списано)'], ['cons', 'Расходные материалы'], ['energy', 'Электроэнергия'], ['wages', 'Зарплата и налоги на ФОТ'], ['maint', 'Обслуживание оборудования'], ['repair', 'Ремонт'], ['admin', 'Администрация'], ['safety', 'Охрана труда'], ['social', 'Социальные расходы'], ['interest', 'Проценты по кредитам'], ['tax', 'Налоги'], ['penalty', 'Штрафы'], ['shrink', 'Потери на складе'], ['recruit', 'Подбор персонала'], ['sever', 'Выходные пособия'], ['fees', 'Комиссии'], ['other', 'Прочее']];
      const max = Math.max.apply(null, items.map(i => r.exp[i[0]] || 0).concat([1]));
      h += card('Финансовый отчёт · неделя ' + (r.week + 1), '<div class="note"><i>' + r.line + '</i></div>' + kv('Выручка (отгружено ' + CO.t(r.shipped) + ')', CO.m(r.rev)) + items.filter(i => r.exp[i[0]]).map(i => '<div class="cab-cat"><span>' + i[1] + '</span><span>' + CO.m(r.exp[i[0]]) + '</span><i style="width:' + Math.round((r.exp[i[0]] / max) * 100) + '%"></i></div>').join('') + '<div class="kv"><span><b>Финансовый результат</b></span><span><b class="' + (r.profit < 0 ? 'neg' : 'pos') + '">' + sg(r.profit) + '</b></span></div>' + kv('Касса: начало → конец', CO.m(r.cashStart) + ' → ' + CO.m(r.cashEnd)));
    } else h += card('Финансовый отчёт', '<div class="note">Первый отчёт будет составлен в ближайший понедельник.</div>');
    // бюджет
    let b = '';
    ['admin', 'safety', 'social'].forEach(k => {
      const B = F.BUDGET[k];
      b += '<div class="note" style="margin-top:6px"><b>' + B.n + '</b> · ' + CO.m(B.cost[c.budget[k]]) + '/нед.</div><div class="cab-row">' + [0, 1, 2].map(i => '<button class="btn mini ' + (c.budget[k] === i ? 'on' : '') + '" ' + A('fin.setBudget', k, i) + '>' + B.lv[i] + '</button>').join('') + '</div><div class="note">' + B.d[c.budget[k]] + '</div>';
    });
    h += card('Бюджет (утверждается директором)', b);
    // кредиты
    let l = c.loans.length ? c.loans.map(x => '<div class="cab-loan"><div class="kv"><span>' + x.name + '</span><span>' + CO.m(x.left) + '</span></div><div class="note">Ставка ' + (x.rate * 100).toFixed(1) + '% · платёж ' + CO.m(x.pay) + '/нед. · осталось ' + x.weeks + ' нед.' + (x.late ? ' · <b style="color:var(--red)">просрочка</b>' : '') + '</div><div class="cab-row">' + btn('Погасить 5 млн', A('fin.repayLoan', x.id, 5e6), { dis: c.treasury < 5e6 }) + btn('Погасить всё', AC('Досрочно погасить ' + CO.m(x.left) + '?', 'fin.repayLoan', x.id, Math.round(x.left)), { dis: c.treasury < x.left }) + '</div></div>').join('') : '<div class="note">Кредитов нет.</div>';
    l += '<div class="note" style="margin-top:8px"><b>Предложения банка:</b></div>' + F.loanOffers(c).map((o, i) => btn('Взять ' + CO.m(o.amt) + ' на ' + o.weeks + ' нед.', AC('Кредит ' + CO.m(o.amt) + ' под ' + (o.rate * 100).toFixed(1) + '% на ' + o.weeks + ' недель: платёж ' + CO.m(F.annuity(o.amt, o.rate, o.weeks)) + '/нед. Взять?', 'fin.takeLoan', i), { sub: (o.rate * 100).toFixed(1) + '% годовых · платёж ' + CO.m(F.annuity(o.amt, o.rate, o.weeks)) + '/нед.' })).join('');
    h += card('Кредиты', l);
    const ar = c.arrears;
    h += card('Задолженность', kv('По зарплате', CO.m(ar.wages)) + kv('По налогам', CO.m(ar.tax)) + kv('Прочие долги и пени', CO.m(ar.other)) + (c.hidden > 0 ? kv('Скрытые счета (подозреваем)', '≈ ?') : '') + btn('Погасить задолженность из кассы', A('fin.payArrears'), { dis: ar.wages + ar.tax + ar.other <= 0 || c.treasury <= 0 }));
    h += card('Вклады и инвестиции', (c.deposits.length ? c.deposits.map(d => '<div class="kv"><span>' + CO.m(d.amt) + ' · ' + (d.rate * 100) + '% · до ' + CO.dayStr(d.until) + '</span><span><button class="chip" ' + A('fin.withdraw', d.id) + '>Закрыть</button></span></div>').join('') : '<div class="note">Вкладов нет. Ставки ниже кредитных — инвестиции не бесплатный заработок.</div>') + '<div class="cab-row">' + btn('5 млн на 4 нед. (7%)', A('fin.deposit', 5e6, 0)) + btn('10 млн на 13 нед. (9%)', A('fin.deposit', 10e6, 1)) + '</div>');
    return h;
  }

  // ---------- Персонал
  function staff(c) {
    const ST = CO.staff; let h = card('Коллектив', bar('🙂 Боевой дух', c.morale) + kv('Всего работников', ST.headcount(c)) + kv('Зарплатный фонд (нед.)', CO.m(CO.fin.wageFund(c))) + kv('Уровень оплаты', Math.round(c.wageIdx * 100) + '%') + '<div class="cab-row">' + btn('Оплата −5%', A('staff.setWage', c.wageIdx - 0.05), { dis: c.wageIdx <= 0.85 }) + btn('Оплата +5%', A('staff.setWage', c.wageIdx + 0.05), { dis: c.wageIdx >= 1.25 }) + '</div>' + btn('🗣 Провести совещание руководителей', A('staff.meeting'), { sub: 'Бесплатно, раз в неделю: отношения +1,5' }));
    ST.RID.forEach(role => {
      const m = c.staff[role], R = ST.ROLES[role];
      if (m.vac > 0) {
        const cands = c.cands && c.cands[role];
        h += card(R.i + ' ' + R.n + ' — ВАКАНСИЯ', '<div class="note">Должность свободна ещё ' + m.vac + ' нед. Эффективность функции 25%.</div>' + (cands ? cands.map((cd, i) => '<div class="cab-cand"><b>' + cd.name + '</b> · оклад ' + CO.m(cd.sal) + '/нед.<div class="note">Компетентность ' + cd.comp + ' · лояльность ' + cd.loy + ' · опыт ' + cd.exp + ' · честность ' + cd.hon + '</div><div class="note">' + cd.traits.map(t => ST.TRAITS[t].n + ': ' + ST.TRAITS[t].t).join('; ') + '</div>' + btn('Назначить (0,3 млн ₽)', AC('Назначить ' + cd.name + '?', 'staff.appoint', role, i)) + '</div>').join('') : btn('🔎 Подобрать кандидатов', A('staff.search', role))));
        return;
      }
      const stats = [['Компетентность', m.comp], ['Лояльность', m.loy], ['Опыт', m.exp], ['Дисциплина', m.disc], ['Инициативность', m.init], ['Честность', m.hon], ['Отношения с директором', m.rel]];
      h += card(R.i + ' ' + R.n, '<b>' + m.name + '</b>' + (m.adapt ? ' <small>(осваивается, ' + m.adapt + ' нед.)</small>' : '') + (m.away ? ' <small>(на обучении)</small>' : '') + '<div class="note">Оклад ' + CO.m(m.sal) + '/нед.</div>' + stats.map(s => bar(s[0], s[1])).join('') + '<div class="note">' + m.traits.map(t => '⭐ ' + ST.TRAITS[t].n + ': ' + ST.TRAITS[t].t).join('<br>') + '</div>' +
        '<div class="cab-row">' + btn('⬆ Повысить', A('staff.promote', role), { dis: m.cd.promo > 0 }) + btn('⬇ Понизить', AC('Понизить: лояльность −15, отношения −10, возможен уход. Подписать?', 'staff.demote', role)) + '</div>' +
        '<div class="cab-row">' + btn('💰 Премия', A('staff.bonus', role), { dis: m.cd.bonus > 0, sub: '0,3 млн' }) + btn('📄 Выговор', A('staff.reprimand', role)) + '</div>' +
        '<div class="cab-row">' + btn('🎓 Обучение', A('staff.train', role), { dis: m.cd.train > 0, sub: '0,4 млн · 2 нед.' }) + btn('🚪 Уволить', AC('Уволить ' + m.name + '? Выходное пособие ' + CO.m(m.sal * 4) + ', вакансия 3 недели' + (m.comp >= 70 ? '. Это сильный специалист — последствия будут.' : '.'), 'staff.fire', role), { c: 'red' }) + '</div>');
    });
    let w = '';
    CO.DEPTS.forEach(d => { const x = c.depts[d.id], cov = ST.coverage(c, d.id); w += '<div class="cab-cat2"><div class="kv"><span>' + d.i + ' ' + d.n + '</span><span>' + x.staff + ' / ' + Math.round(CO.prod.need(c, d.id)) + '</span></div><div class="cab-row">' + btn('+10 (' + CO.m(400000) + ')', A('staff.hire', d.id, 10)) + btn('−10', AC('Сократить 10 человек в «' + d.n + '»? Выходные пособия ≈ ' + CO.m(10 * ST.headWage(c, d.id) * 8) + ', дух коллектива упадёт.', 'staff.cut', d.id, 10), { dis: x.staff <= 15 }) + '</div></div>'; });
    h += card('Численность по подразделениям', w + '<div class="note">Нехватка людей снижает выпуск, избыток — лишние расходы. Набранные выходят через неделю.</div>');
    return h;
  }

  // ---------- Закупки
  function supply(c) {
    const S = CO.supply; let h = card('Склады', bar('Заполнение', (S.rawTons(c) + c.fg.t) / S.storageCap(c) * 100, CO.t(S.rawTons(c) + c.fg.t) + ' / ' + CO.t(S.storageCap(c)), 'blue') + kv('Сырьё', CO.t(S.rawTons(c))) + kv('Готовая продукция', CO.t(c.fg.t)) + kv('В пути', CO.t(S.incomingTons(c))));
    S.list.forEach(id => {
      const r = S.RES[id], i = c.inv[id], wu = S.weeklyUse(c, id), days = S.coverDays(c, id), sp = S.SUP[i.sup];
      let b = '';
      if (!r.noStock) b += bar('Запас', C(i.q / Math.max(1, i.min * 2) * 100, 0, 100), Math.round(i.q) + ' ' + r.unit + (days < 90 ? ' · ' + days.toFixed(1) + ' дн.' : ''), i.q < i.min ? 'bad' : days < 6 ? 'warn' : '');
      b += kv('Потребление', Math.round(wu) + ' ' + r.unit + '/нед.') + kv('Цена', CO.m(S.price(c, id)) + '/' + r.unit) + kv('Поставщик', r.sup[i.sup]) + kv('Срок доставки', sp.lead + ' дн.' + (sp.delayP > 0.2 ? ' · часто задерживает' : '')) + (r.noStock ? '' : kv('Минимальный запас', Math.round(i.min) + ' ' + r.unit));
      b += '<div class="cab-row">' + ['rel', 'cheap'].map(k => '<button class="btn mini ' + (i.sup === k ? 'on' : '') + '" ' + A('supply.setSupplier', id, k) + '>' + S.SUP[k].n + '</button>').join('') + btn(i.auto ? '📃 Расторгнуть договор' : '📃 Заключить договор', A('supply.toggleContract', id), { c: i.auto ? 'green' : '' }) + '</div><div class="note">' + sp.d + (i.auto ? ' Договор: автозакупка и скидка 4%.' : '') + '</div>';
      if (!r.noStock) {
        b += '<div class="cab-row">' + ['std', 'big', 'urgent'].map(m => btn(S.MODES[m].n.split(' ')[0], A('supply.order', id, m), { sub: CO.m(Math.round(wu * S.MODES[m].weeks * S.price(c, id, i.sup, m))) })).join('') + '</div>';
        b += '<div class="cab-row">' + btn('Резерв 1 нед.', A('supply.setReserve', id, 1)) + btn('Резерв 3 нед.', A('supply.setReserve', id, 3)) + '</div>';
      }
      h += card(r.i + ' ' + r.n, b);
    });
    h += card('Заказы в пути (' + c.orders.length + ')', c.orders.length ? c.orders.map(o => '<div class="cab-loan"><div class="kv"><span>' + S.RES[o.res].i + ' ' + S.RES[o.res].n + ' · ' + CO.t(o.q) + '</span><span>' + CO.dayStr(o.due) + '</span></div><div class="note">' + S.RES[o.res].sup[o.sup] + ' · ' + CO.m(o.cost) + (o.delayed ? ' · <b style="color:var(--haz)">задержка +' + o.delayed + ' дн.</b>' : '') + (o.qual < 0.9 ? ' · <b style="color:var(--red)">качество низкое</b>' : '') + '</div>' + btn('Отменить заказ (−15%)', AC('Отменить заказ? Поставщик удержит 15%.', 'supply.cancelOrder', o.id)) + '</div>').join('') : '<div class="note">Нет заказов в пути.</div>');
    return h;
  }

  // ---------- Продажи
  function sales(c) {
    const SL = CO.sales, sp = c.spot; const share = c.fg.t > 0 ? c.fg.bad / c.fg.t : 0;
    let h = card('Рынок и склад готовой продукции', kv('Свободная цена', CO.m(sp.price) + '/т') + kv('Рынок поглотит (нед.)', CO.t(sp.demand)) + kv('Готовой продукции на складе', CO.t(c.fg.t)) + kv('Скрытый брак на складе', CO.pc(share)) + kv('Дебиторка', CO.m(SL.receivable(c))) + kv('Неприкосновенный запас', CO.t(sp.hold)) +
      '<div class="cab-row">' + btn(sp.on ? '⏹ Остановить свободные продажи' : '▶ Разрешить свободные продажи', A('sales.setSpot', !sp.on), { c: sp.on ? '' : 'green' }) + btn('Запас +100 т', A('sales.setHold', sp.hold + 100)) + '</div>' + btn('Сбросить запас', A('sales.setHold', 0)));
    h += '<div class="grp">Предложения заказчиков</div>';
    h += c.offers.length ? c.offers.map(o => {
      const ct = SL.cust(o.cust), ld = SL.load(c, o), cost = CO.supply.varCost(c) + 12000;
      return '<div class="card"><h3>' + ct.i + ' ' + o.name + '</h3><div class="note">' + ct.n + ' · предложение действует до ' + CO.dayStr(o.exp) + '</div>' + kv('Продукция / объём', 'Готовая продукция · ' + CO.t(o.vol)) + kv('Цена', CO.m(o.price) + '/т (' + CO.m(o.price * o.vol) + ')') + kv('Себестоимость (оценка)', CO.m(Math.round(cost)) + '/т') + kv('Ожидаемая маржа', '<b class="' + (o.price > cost ? 'pos' : 'neg') + '">' + sg(Math.round((o.price - cost) * o.vol)) + '</b>') + kv('Срок исполнения', CO.dayStr(o.due) + ' (' + o.days + ' дн.)') + kv('Аванс', CO.pc(o.adv)) + kv('Оплата остатка', 'через ' + o.terms + ' дн. после отгрузки') + kv('Штраф', (o.pen * 100).toFixed(2) + '% / сутки') + bar('Нагрузка на завод', C(ld * 100, 0, 100), Math.round(ld * 100) + '% мощности механики', ld > 0.9 ? 'bad' : ld > 0.7 ? 'warn' : '') +
        '<div class="cab-row">' + ['fast', 'norm', 'slow'].map(k => '<button class="btn mini ' + (o.speed === k ? 'on' : '') + '" ' + A('sales.setSpeed', o.id, k) + '>' + { fast: 'Срочно +7%', norm: 'Стандарт', slow: 'Спокойно −4%' }[k] + '</button>').join('') + '</div>' +
        '<div class="cab-row">' + btn('🤝 Торговаться', A('sales.negotiate', o.id), { dis: !!o.neg, sub: 'цена +6% · риск' }) + btn('💵 Запросить аванс 30%', A('sales.askAdvance', o.id), { dis: !!o.advAsk }) + '</div>' +
        '<div class="cab-row">' + btn('✅ Принять', A('sales.accept', o.id), { c: 'green' }) + btn('✖ Отклонить', A('sales.decline', o.id)) + '</div></div>';
    }).join('') : '<div class="card"><div class="note">Новых предложений нет. Заказчики приходят каждую неделю.</div></div>';
    h += '<div class="grp">Контракты</div>';
    const ks = c.contracts.slice().sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || a.due - b.due);
    h += ks.length ? ks.map(k => {
      const lt = k.status === 'active' && CO.today() > k.due, stT = { active: lt ? '🔴 просрочен' : '🟢 в работе', done: '✅ выполнен', failed: '❌ сорван' }[k.status] || k.status;
      return '<div class="card"><h3>№' + k.n + ' ' + SL.cust(k.cust).i + ' ' + k.name + '</h3>' + kv('Статус', stT) + bar('Отгружено', k.delivered / k.vol * 100, CO.t(k.delivered) + ' / ' + CO.t(k.vol), lt ? 'bad' : '') + kv('Цена', CO.m(k.price) + '/т') + kv('Срок', CO.dayStr(k.due) + (k.status === 'active' ? ' (' + (k.due - CO.today() >= 0 ? 'ещё ' + (k.due - CO.today()) + ' дн.' : 'просрочка ' + (CO.today() - k.due) + ' дн.') + ')' : '')) + kv('Аванс получен / остаток оплаты', CO.m(k.advPaid) + ' / ' + CO.m(Math.max(0, Math.round(k.vol * k.price - k.advPaid))) + '') + kv('Штраф за срыв', (k.pen * 100).toFixed(2) + '%/сут.') + (k.returned ? kv('Возвращено браком', CO.t(k.returned)) : '') + '</div>';
    }).join('') : '<div class="card"><div class="note">Контрактов нет.</div></div>';
    h += card('Покупатели', SL.CID.map(id => bar(SL.cust(id).i + ' ' + SL.cust(id).n, c.cust[id].rel, null)).join('') + '<div class="note">Хорошие отношения — выше цена и чаще заказы; срывы и брак их разрушают.</div>');
    return h;
  }

  // ---------- Развитие
  function dev(c) {
    const P = CO.prod; let h = card('Стратегия развития', '<div class="note">Проекты платятся равными взносами каждую неделю, требуют запчасти и ограничивают мощность подразделений во время работ. Одновременно — не более двух. Эффект наступает только после завершения.</div>' + (c.flags.noInvest ? '<div class="req no">⛔ Совет временно запретил крупные проекты.</div>' : ''));
    if (c.projects.act.length) h += card('Идут проекты', c.projects.act.map(a => { const p = P.proj(a.id); return '<div class="cab-loan"><b>' + p.i + ' ' + p.n + '</b>' + bar('Выполнено', (a.total - a.left) / a.total * 100, 'осталось ' + a.left + ' нед.', 'blue') + '<div class="note">Уплачено ' + CO.m(a.paid) + (a.delayed ? ' · <b style="color:var(--haz)">срок сорван</b>' : '') + (a.stall ? ' · нет денег на взнос!' : '') + '</div>' + btn('Остановить проект', AC('Остановить проект? Уплаченные деньги и запчасти будут потеряны, доверие собственников упадёт.', 'prod.cancelProject', a.id), { c: 'red' }) + '</div>'; }).join(''));
    P.PROJECTS.forEach(p => {
      const why = P.canStart(c, p), done = c.projects.done[p.id], pb = P.payback(c, p);
      h += card(p.i + ' ' + p.n, '<div class="note">' + p.desc + '</div>' + kv('Стоимость', CO.m(p.cost) + ' (по ' + CO.m(Math.round(p.cost / p.weeks)) + '/нед.)') + kv('Срок', p.weeks + ' нед.') + kv('Запчасти', p.parts + ' компл. (на складе ' + Math.floor(c.inv.parts.q) + ')') + kv('Окупаемость', pb ? '≈ ' + pb + ' нед.' : 'нет прямой выручки') + '<div class="note">⚠ ' + p.risk + '</div>' + (done ? '<div class="req ok">✅ Выполнено</div>' : btn('Запустить проект', AC('Запустить «' + p.n + '»: ' + CO.m(p.cost) + ', ' + p.weeks + ' нед.? Подписать?', 'prod.startProject', p.id), { dis: !!why, sub: why || '' })));
    });
    return h;
  }

  // ---------- Совет директоров
  function board(c) {
    const b = c.board, L = b.last;
    let h = card('Доверие собственников', bar('Доверие', b.trust) + kv('Предупреждения', b.warn ? '⚠ было' : 'нет') + kv('Испытательный срок', b.probation > 0 ? '⛔ ещё ' + b.probation + ' нед. (нужно ≥ 40)' : 'нет') + kv('Следующее заседание', 'неделя ' + (b.next + 1)) + '<div class="note">Совет оценивает финансы, выполнение планов, стабильность, безопасность, репутацию и качество управления. Каждую оценку вы видите ниже — со всеми причинами.</div>');
    h += '<div class="grp">Повестка совета</div>' + decisions(c, true);
    if (L) h += card('Последняя оценка (неделя ' + L.week + ')', '<b>Итог: ' + L.total + ' / 100</b> · доверие ' + L.from + ' → ' + L.trust + ' (' + (L.delta >= 0 ? '+' : '') + L.delta + ')' + L.comps.map(x => bar(x.n + ' (' + Math.round(x.w * 100) + '%)', x.s) + '<div class="note" style="margin:-2px 0 4px">' + x.why + '</div>').join(''));
    else h += card('Оценка работы', '<div class="note">Первое заседание совета пройдёт на неделе ' + (b.next + 1) + '. До этого — доверие определяется условиями приёма дел.</div>');
    if (b.promises.length) h += card('Ваши обещания', b.promises.map(p => '<div class="req">' + (p.type === 'margin' ? 'Маржа ≥ ' + (p.target * 100) + '%' : 'Боевой дух ≥ ' + p.target) + ' к неделе ' + (p.until + 1) + '</div>').join(''));
    if (b.hist.length > 1) h += card('История оценок', spark(b.hist.slice().reverse().map(x => x.total), '#6fb06a'));
    return h;
  }

  // ---------- Документы и отчёты
  function reportBody(r) {
    return kv('Период', CO.dayStr(r.from) + ' – ' + CO.dayStr(r.to)) + kv('Выпуск', CO.t(r.made) + ' (' + CO.pc(r.planPct) + ' плана)') + kv('Годной продукции / брак', CO.t(r.good) + ' / ' + CO.t(r.brak)) + kv('Отгружено', CO.t(r.shipped) + (r.spotT ? ' (свободный рынок ' + CO.t(r.spotT) + ')' : '')) + kv('Выручка', CO.m(r.rev)) + kv('Расходы', CO.m(r.expTotal)) + kv('Результат', '<b class="' + (r.profit < 0 ? 'neg' : 'pos') + '">' + sg(r.profit) + '</b>') + kv('Касса', CO.m(r.cashStart) + ' → ' + CO.m(r.cashEnd)) + kv('Поломки / аварии / простои', r.breakdowns + ' / ' + r.accidents + ' / ' + r.idle + ' дн.') + (r.why ? kv('Причина недовыпуска', r.why) : '') + (r.notes.length ? '<div class="note" style="margin-top:6px">' + r.notes.map(n => '• ' + n).join('<br>') + '</div>' : '');
  }
  function docs(c) {
    let h = card('Динамика', '<div class="note">Результат по неделям</div>' + spark(c.reports.slice(0, 12).reverse().map(x => x.profit), '#f2b705') + '<div class="note">Выпуск, т</div>' + spark(c.reports.slice(0, 12).reverse().map(x => x.made), '#6fb06a'));
    h += '<div class="grp">Отчёты по неделям</div>';
    h += c.reports.length ? c.reports.map(r => '<div class="card"><h3 onclick="G.cab.rep(' + r.week + ')" style="cursor:pointer">📑 Неделя ' + (r.week + 1) + ' · ' + sg(r.profit) + ' ' + (CAB.repOpen === r.week ? '▲' : '▼') + '</h3>' + (CAB.repOpen === r.week ? '<div class="note"><i>' + r.line + '</i></div>' + reportBody(r) : '') + '</div>').join('') : '<div class="card"><div class="note">Отчётов пока нет — первый появится в понедельник.</div></div>';
    h += card('Журнал распоряжений', c.log.length ? c.log.slice(0, 40).map(l => '<div class="log ' + l.c + '"><small>' + CO.dayStr(l.d) + '</small> ' + l.x + '</div>').join('') : '<div class="note">Пока пусто.</div>');
    return h;
  }

  CAB.render = function () {
    const c = CO.get();
    if (!c) return '<div class="card"><h3>🏢 Кабинет закрыт</h3><div class="note">Кабинет откроется после назначения генеральным директором.</div></div>';
    const SEC = { home: home, prod: prod, fin: fin, staff: staff, supply: supply, sales: sales, dev: dev, board: board, docs: docs };
    const sec = SEC[CAB.sec] ? CAB.sec : 'home', bd = c.pending.filter(e => !e.board).length, bb = c.pending.filter(e => e.board).length;
    const chips = '<div class="chips cab-chips">' + SECS.map(s => '<button class="chip ' + (sec === s[0] ? 'on' : '') + '" onclick="G.cab.go(\'' + s[0] + '\')">' + s[1] + ' ' + s[2] + (s[0] === 'home' && bd ? ' <b class="rl-badge">' + bd + '</b>' : '') + (s[0] === 'board' && bb ? ' <b class="rl-badge">' + bb + '</b>' : '') + '</button>').join('') + '</div>';
    let body; try { body = SEC[sec](c); } catch (e) { if (window.console) console.error(e); body = '<div class="card"><div class="note">Раздел временно недоступен.</div></div>'; }
    return (sec === 'home' ? '' : '') + chips + body + '<div style="height:12px"></div>';
  };
})();
