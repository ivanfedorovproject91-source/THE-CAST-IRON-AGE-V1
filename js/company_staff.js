/* ===== Предприятие: руководители, кадровые решения, персонал ===== */
(function () {
  'use strict';
  const G = window.G, D = G.D, CO = G.co, C = G.clamp;
  const ST = (CO.staff = {});

  ST.ROLES = {
    prod: { n: 'Заместитель по производству', i: '🏭', npc: 'soplezhuykin' },
    eng: { n: 'Главный инженер', i: '🛠', npc: null },
    fin: { n: 'Финансовый директор', i: '💼', npc: 'shurygina' },
    hr: { n: 'Начальник отдела кадров', i: '🗂', npc: 'tatishcheva' },
    otk: { n: 'Начальник ОТК', i: '🔍', npc: 'ekaterina' },
    sup: { n: 'Руководитель снабжения', i: '🚚', npc: null },
    sal: { n: 'Руководитель сбыта', i: '📈', npc: null }
  };
  ST.RID = Object.keys(ST.ROLES);
  ST.TRAITS = {
    pushy: { n: 'Выбивает план', t: 'Берёт большие планы (+3% выпуска), но жертвует качеством: брак растёт.' },
    proud: { n: 'Самолюбивый технарь', t: 'Блестяще знает оборудование, но обижается, когда директор лезет в технику.' },
    shady: { n: 'Творческая отчётность', t: 'Хорошо держит расходы, но любит скрывать проблемы и предлагать «оптимизации».' },
    kick: { n: 'Друг поставщиков', t: 'Знает всех поставщиков лично. Иногда — слишком лично.' },
    loyal: { n: 'Предан директору', t: 'Не предаст, не сольёт, не уйдёт без повода.' },
    careful: { n: 'Перестраховщик', t: 'Тормозит рискованные решения и держит запас.' },
    social: { n: 'Душа коллектива', t: 'Держит боевой дух персонала, помогает удержать людей.' },
    wolf: { n: 'Охотник за сделками', t: 'Находит заказчиков и выбивает цену, но обещает лишнего.' }
  };

  const NAMES_F = ['Кривоносов', 'Хапугин', 'Втюхин', 'Пересветов', 'Бочкарёв', 'Затыкин', 'Недоливайко', 'Громозека', 'Квашнин', 'Шлакоблоков', 'Оладьев', 'Перепёлкин', 'Тормозков', 'Лопатин'];
  const NAMES_N = ['Платон Эдуардович', 'Остап Бенедиктович', 'Эрнест Аркадьевич', 'Игнат Фомич', 'Аркадий Львович', 'Ермолай Петрович', 'Вениамин Саввич', 'Карп Кузьмич', 'Альберт Тимофеевич'];
  const ROLE_TRAITS = { prod: ['pushy', 'careful', 'loyal'], eng: ['proud', 'careful', 'loyal'], fin: ['shady', 'careful', 'loyal'], hr: ['social', 'loyal', 'careful'], otk: ['careful', 'loyal', 'proud'], sup: ['kick', 'careful', 'wolf'], sal: ['wolf', 'social', 'loyal'] };

  const salFor = comp => Math.round((30 + comp * 1.3) * 1000);
  const mk = (role, o) => Object.assign({ role: role, id: null, name: '', comp: 60, loy: 60, exp: 60, disc: 60, init: 60, hon: 60, rel: 55, traits: [], adapt: 0, vac: 0, away: 0, cd: { bonus: 0, train: 0, promo: 0 }, sal: 0 }, o, { sal: salFor(o.comp || 60) });
  const fromNpc = (id, base) => { const n = D.NPC[id]; return Object.assign({ id: id, name: n ? n.name : base.name }, base, { rel: C(50 + (G.s ? G.rl(id) : 0) * 0.4, 15, 95) }); };

  ST.init = function (c, df) {
    c.cands = {};
    c.staff = {
      prod: mk('prod', fromNpc('soplezhuykin', { name: 'Соплежуйкин М. Г.', comp: 62, loy: 45, exp: 50, disc: 60, init: 90, hon: 55, traits: ['pushy'] })),
      eng: mk('eng', { name: 'Кривоносов П. Э.', comp: 88, loy: 70, exp: 85, disc: 75, init: 55, hon: 80, rel: 55, traits: ['proud'] }),
      fin: mk('fin', fromNpc('shurygina', { name: 'Шурыгина В. М.', comp: 72, loy: 60, exp: 80, disc: 70, init: 50, hon: 35, traits: ['shady'] })),
      hr: mk('hr', fromNpc('tatishcheva', { name: 'Татищева Т. К.', comp: 66, loy: 85, exp: 90, disc: 80, init: 40, hon: 75, traits: ['social'] })),
      otk: mk('otk', fromNpc('ekaterina', { name: 'Екатерина Е.', comp: 78, loy: 65, exp: 70, disc: 90, init: 45, hon: 85, traits: ['careful'] })),
      sup: mk('sup', { name: 'Хапугин О. Б.', comp: 60, loy: 40, exp: 55, disc: 50, init: 70, hon: 30, rel: 50, traits: ['kick'] }),
      sal: mk('sal', { name: 'Втюхин Э. А.', comp: 66, loy: 55, exp: 60, disc: 55, init: 85, hon: 55, rel: 55, traits: ['wolf'] })
    };
  };

  // ---------- Эффекты
  ST.m = (c, role) => c.staff[role];
  ST.compEff = function (c, role) {
    const m = c.staff[role]; if (!m) return 40;
    if (m.vac > 0) return 22;
    let v = m.comp * (m.adapt > 0 ? 0.85 : 1) * (m.away > 0 ? 0.6 : 1);
    if (m.rel < 30) v *= 0.9; else if (m.rel > 75) v *= 1.03;
    return v;
  };
  ST.mod = (c, role) => (ST.compEff(c, role) - 50) / 100;          // −0.3 … +0.45
  ST.trait = (c, role, k) => { const m = c.staff[role]; return !!(m && m.vac <= 0 && m.traits.indexOf(k) >= 0); };
  ST.name = (c, role) => { const m = c.staff[role]; return m && m.vac <= 0 ? m.name : 'вакансия'; };
  ST.deptMgr = function (c, id) {
    const def = CO.dept(id), role = (c.depts[id].resp || def.resp), m = ST.mod(c, role) * (role === def.resp ? 1 : 0.75);
    return 1 + m * 0.18;
  };
  ST.engMul = c => C(1 - ST.mod(c, 'eng') * 0.5, 0.65, 1.3);
  ST.supMul = function (c) {
    const m = c.staff.sup, a = [1.5, 1, 0.7][c.budget.admin];
    return { delay: C(1 - ST.mod(c, 'sup') * 0.6, 0.5, 1.4), theft: (m && m.hon < 40 ? 1.6 : 1) * a };
  };
  ST.salMul = function (c) { const m = ST.mod(c, 'sal'); return { price: 1 + m * 0.06 + (ST.trait(c, 'sal', 'wolf') ? 0.015 : 0), extra: m > 0.18 ? 1 : 0 }; };
  ST.finMul = c => C(1 - ST.mod(c, 'fin') * 0.2, 0.8, 1.15); // множитель административных расходов
  ST.meddle = function (c) {
    const m = c.staff.eng; if (!m || m.vac > 0 || m.traits.indexOf('proud') < 0) return;
    const d = CO.today(); if (c.flags.meddleDay === d) return; c.flags.meddleDay = d;
    m.rel = C(m.rel - 2.2); m.loy = C(m.loy - 0.8);
    if (m.rel < 35 && !c.flags.meddleWarn) { c.flags.meddleWarn = 1; CO.note(c, m.name + ': «Вы третий раз за неделю лично крутите мои вентили. Может, и инженером будете сами?»', 'warn', true); }
  };
  ST.payroll = c => ST.RID.reduce((a, r) => a + (c.staff[r].vac > 0 ? 0 : c.staff[r].sal), 0);

  // ---------- Сутки
  ST.daily = function (c, d) {
    c.hire = c.hire.filter(h => { if (h.day <= d) { c.depts[h.dept].staff += h.n; return false; } return true; });
    // боевой дух движется к цели
    const ots = CO.DID.filter(id => c.depts[id].ot).length;
    const hr = ST.mod(c, 'hr') * 10 + (ST.trait(c, 'hr', 'social') ? 3 : 0);
    const target = 42 + [-12, 10, 22][c.budget.social] + (c.wageIdx - 1) * 90 + hr - (c.arrears.wages > 0 ? 28 : 0) - ots * 3 + c.mods.safetyBase * 0.3 + (c.safety - 50) * 0.12;
    c.morale = C(c.morale + C((target - c.morale) * 0.05, -1.1, 1.1));
  };

  // ---------- Неделя
  ST.weekly = function (c) {
    ST.RID.forEach(r => {
      const m = c.staff[r];
      if (m.adapt > 0) m.adapt--; if (m.away > 0) m.away--; if (m.vac > 0) { m.vac--; if (m.vac === 0 && !m.name) ST.autoFill(c, r); }
      ['bonus', 'train', 'promo'].forEach(k => { if (m.cd[k] > 0) m.cd[k]--; });
      m.rel += (50 - m.rel) * 0.02; m.rel = C(m.rel);
      if (m.vac <= 0) { if (m.loy < 25 && G.chance(8)) ST.quit(c, r, 'потерял всякую лояльность'); else if (m.rel < 20 && G.chance(8)) ST.quit(c, r, 'устал от обращения директора'); }
    });
    // текучесть
    let quits = 0;
    CO.DEPTS.forEach(def => {
      const x = c.depts[def.id], p = 0.004 + Math.max(0, 45 - c.morale) * 0.0007 + (c.arrears.wages > 0 ? 0.02 : 0);
      const q = Math.round(x.staff * p * (1 - ST.mod(c, 'hr') * 0.5) * (0.7 + G.rnd() * 0.6));
      if (q > 0) { x.staff = Math.max(5, x.staff - q); quits += q; const back = Math.round(q * (0.4 + ST.mod(c, 'hr'))); if (back > 0) { c.hire.push({ dept: def.id, n: back, day: CO.today() + 7 }); CO.expense(c, back * 30000, 'recruit'); } }
    });
    if (quits >= 8) CO.note(c, 'За неделю уволились ' + quits + ' чел. Отдел кадров ищет замену.', 'warn');
    // финдиректор «творчески» скрывает проблемы
    const f = c.staff.fin;
    if (f.vac <= 0 && f.hon < 45 && c.depts.smelt && G.chance(22 + (c.budget.admin === 0 ? 12 : 0))) { c.hidden += G.ri(4, 16) * 1e5; }
    // пул кандидатов обновляется
    if (G.chance(25)) c.cands = {};
  };
  ST.autoFill = function (c, role) { const m = c.staff[role], p = ST.makeCand(c, role, 0); Object.assign(m, p, { vac: 0, adapt: 3, cd: { bonus: 0, train: 0, promo: 0 } }); m.id = null; CO.note(c, 'Вакансия «' + ST.ROLES[role].n + '» закрыта: ' + m.name + ' (по приказу кадровой службы).', 'warn'); };
  ST.quit = function (c, role, why) {
    const m = c.staff[role]; CO.note(c, ST.ROLES[role].n + ' ' + m.name + ' уволился сам: ' + why + '.', 'bad', true);
    m.vac = 3; m.name = ''; c.morale = C(c.morale - 2); c.cands = {};
  };

  // ---------- Кандидаты
  ST.makeCand = function (c, role, i) {
    const comp = C(G.ri(42, 92), 0, 100), tr = G.pick(ROLE_TRAITS[role]);
    const o = { role: role, id: null, name: G.pick(NAMES_F) + ' ' + G.pick(NAMES_N).split(' ').map(w => w[0] + '.').join(' '), comp: comp, loy: G.ri(35, 85), exp: G.ri(30, 90), disc: G.ri(35, 90), init: G.ri(30, 90), hon: G.ri(25, 92), rel: 55, traits: [tr] };
    if (tr === 'shady') o.hon = Math.min(o.hon, 45); if (tr === 'loyal') o.loy = Math.max(o.loy, 75); if (tr === 'proud') { o.comp = Math.max(o.comp, 70); }
    o.sal = Math.round(salFor(o.comp) * (1 + (o.exp - 60) / 400));
    return o;
  };
  ST.candidates = function (c, role) {
    c.cands = c.cands || {};
    if (!c.cands[role]) { c.cands[role] = [0, 1, 2].map(i => ST.makeCand(c, role, i)); }
    return c.cands[role];
  };

  ST.search = function (role) { const c = CO.get(); if (!c) return; c.cands = c.cands || {}; c.cands[role] = [0, 1, 2].map(i => ST.makeCand(c, role, i)); CO.note(c, 'Кадровая служба подобрала кандидатов на должность «' + ST.ROLES[role].n + '».'); };
  // ---------- Кадровые решения (все платные операции проверяют кассу)
  ST.appoint = function (role, idx) {
    const c = CO.get(); if (!c) return; const cand = ST.candidates(c, role)[idx]; if (!cand) return;
    const cost = 300000; if (!CO.pay(c, cost, 'recruit')) return;
    const old = c.staff[role]; const was = old.vac > 0 || !old.name;
    c.staff[role] = Object.assign({ adapt: 3, vac: 0, away: 0, cd: { bonus: 0, train: 0, promo: 0 } }, cand);
    c.cands[role] = null;
    CO.note(c, 'Назначен: ' + ST.ROLES[role].n + ' — ' + cand.name + ' (оклад ' + CO.m(cand.sal) + '/нед.). Три недели осваивается: эффективность 85%.', 'good', true);
    if (!was) { c.morale = C(c.morale - 1); }
  };
  ST.fire = function (role) {
    const c = CO.get(); if (!c) return; const m = c.staff[role]; if (m.vac > 0) return;
    const sever = m.sal * 4; if (!CO.pay(c, sever, 'sever')) return;
    const good = m.comp >= 70;
    CO.note(c, m.name + ' (' + ST.ROLES[role].n + ') уволен. Выходное пособие ' + CO.m(sever) + '. Вакансия на 3 недели, эффективность функции 25%.', 'bad', true);
    ST.RID.forEach(r => { if (r !== role) c.staff[r].rel = C(c.staff[r].rel - (good ? 4 : 1.5)); });
    if (good) { c.morale = C(c.morale - 3); c.board.trust = C(c.board.trust - 1); }
    if (m.hon < 40 && !good) c.board.trust = C(c.board.trust + 0.5);
    if (m.id) { G.relAdd(m.id, -25); }
    if (m.loy < 45 && G.chance(35)) c.sched.push({ day: CO.today() + 3, kind: 'leak', who: m.name, role: role });
    m.vac = 3; m.name = ''; c.cands = {};
  };
  ST.promote = function (role) {
    const c = CO.get(); if (!c) return; const m = c.staff[role]; if (m.vac > 0) return; if (m.cd.promo > 0) { G.toast('Повышали недавно: подождите ' + m.cd.promo + ' нед.', 'warn'); return; }
    m.sal = Math.round(m.sal * 1.15); m.loy = C(m.loy + 10); m.rel = C(m.rel + 8); m.init = C(m.init + 3); m.cd.promo = 12;
    CO.note(c, m.name + ': повышение в должности, оклад ' + CO.m(m.sal) + '/нед. Лояльность растёт.', 'good');
  };
  ST.demote = function (role) {
    const c = CO.get(); if (!c) return; const m = c.staff[role]; if (m.vac > 0) return;
    m.sal = Math.round(m.sal * 0.9); m.loy = C(m.loy - 15); m.rel = C(m.rel - 10);
    CO.note(c, m.name + ': понижен, оклад снижен. ' + (m.loy < 35 ? 'Смотрит на вас как на врага.' : 'Принял молча — это хуже.'), 'warn');
    if (G.chance(25)) ST.quit(c, role, 'не простил понижения');
  };
  ST.bonus = function (role) {
    const c = CO.get(); if (!c) return; const m = c.staff[role]; if (m.vac > 0) return; if (m.cd.bonus > 0) { G.toast('Премию выдавали недавно (ещё ' + m.cd.bonus + ' нед.).', 'warn'); return; }
    if (!CO.pay(c, 300000, 'admin')) return; m.loy = C(m.loy + 6); m.rel = C(m.rel + 5); m.cd.bonus = 4;
    CO.note(c, m.name + ': премия 300 тыс. ₽. «Спасибо, начальник!»', 'good');
  };
  ST.reprimand = function (role) {
    const c = CO.get(); if (!c) return; const m = c.staff[role]; if (m.vac > 0) return;
    m.disc = C(m.disc + 4); m.loy = C(m.loy - 5); m.rel = C(m.rel - 4);
    CO.note(c, m.name + ': объявлен выговор. Дисциплина выросла, симпатия — нет.', 'warn');
    if (m.loy < 35 && G.chance(15)) ST.quit(c, role, 'обиделся на выговор');
  };
  ST.train = function (role) {
    const c = CO.get(); if (!c) return; const m = c.staff[role]; if (m.vac > 0) return; if (m.cd.train > 0) { G.toast('Обучение недавно проходили (ещё ' + m.cd.train + ' нед.).', 'warn'); return; }
    if (!CO.pay(c, 400000, 'admin')) return; m.away = 2; m.cd.train = 12; m.comp = Math.min(95, m.comp + 4); m.exp = Math.min(95, m.exp + 3); m.sal = salFor(m.comp);
    CO.note(c, m.name + ' отправлен на обучение (2 недели вне работы, +4 к компетентности).', 'good');
  };
  ST.meeting = function () {
    const c = CO.get(); if (!c) return; if (c.flags.meetWeek === Math.floor(CO.today() / 7)) { G.toast('Совещание на этой неделе уже было. Больше — это уже митинг.', 'warn'); return; }
    c.flags.meetWeek = Math.floor(CO.today() / 7);
    ST.RID.forEach(r => { c.staff[r].rel = C(c.staff[r].rel + 1.5); });
    c.morale = C(c.morale + 0.5);
    let extra = '';
    if (c.hidden > 0 && G.chance(45)) { extra = ' На совещании финансовый директор «случайно» проговорился о неоплаченных счетах.'; CO.ev.raise(c, 'hidden', {}); }
    CO.note(c, 'Проведено совещание руководителей: все выступили, никто не услышал, но отношения улучшились.' + extra, extra ? 'warn' : 'good');
  };

  // ---------- Рядовой персонал
  ST.headWage = (c, id) => 12692 * CO.dept(id).pay * c.wageIdx * 1.30 * (c.depts[id].ot ? 1.25 : 1);
  ST.hire = function (id, n) {
    const c = CO.get(); if (!c) return; if (!CO.pay(c, n * 40000, 'recruit')) return;
    c.hire.push({ dept: id, n: n, day: CO.today() + 7 }); CO.note(c, CO.dept(id).n + ': набор ' + n + ' чел. Выйдут через неделю (подбор ' + CO.m(n * 40000) + ').');
  };
  ST.cut = function (id, n) {
    const c = CO.get(); if (!c) return; const x = c.depts[id]; n = Math.min(n, x.staff - 5); if (n <= 0) return;
    const sever = Math.round(n * ST.headWage(c, id) * 8); if (!CO.pay(c, sever, 'sever')) return;
    x.staff -= n; c.morale = C(c.morale - n * 0.3); c.board.trust = C(c.board.trust + 0.4);
    CO.note(c, CO.dept(id).n + ': сокращено ' + n + ' чел. Выходные пособия ' + CO.m(sever) + '. Профсоюз сделал пометку.', 'warn');
    if (n >= 20) c.sched.push({ day: CO.today() + 2, kind: 'union_cut', dept: id, n: n });
  };
  ST.setWage = function (v) { const c = CO.get(); if (!c) return; c.wageIdx = C(Math.round(v * 100) / 100, 0.85, 1.25); CO.note(c, 'Уровень оплаты труда: ' + Math.round(c.wageIdx * 100) + '% от базового.'); };
  ST.headcount = c => CO.DID.reduce((a, id) => a + c.depts[id].staff, 0);
  ST.coverage = (c, id) => c.depts[id].staff / Math.max(1, CO.prod.need(c, id));
})();
