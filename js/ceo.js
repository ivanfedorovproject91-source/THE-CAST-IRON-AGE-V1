/* ===== Генеральный директор: назначение, сюжетная цепочка, вступление в должность =====
   Статус директора — отдельный флаг s.ceo.appointed. Числовые ранги car.rank НЕ меняются:
   лестница (career_ladder.js) заканчивается на 10 (зам. генерального), а директором игрок становится сюжетом ниже. */
(function () {
  'use strict';
  const G = window.G, D = G.D, CO = G.co, C = G.clamp;
  const CEO = (G.ceo = {});
  const O = () => G.s.ceo;
  const nm = () => (G.s.name || G.s.pname || 'Новый директор');
  const sup = (k, v) => { const o = O(); o.support[k] = C((o.support[k] || 0) + v, -20, 30); };

  CEO.is = () => !!(G.s && G.s.ceo && G.s.ceo.appointed);
  CEO.eligible = () => !!(G.s && !G.s.end && G.s.phase !== 'new' && G.s.car && G.s.car.rank >= 10 && !G.s.ceo.appointed);
  CEO.NEED = 50; // порог голосования

  // ---------- Заслуги (0…40): считаются из карьеры, репутации и событий — назначение не подарок
  CEO.merit = function () {
    const s = G.s, c = s.car, ach = Object.keys(s.ach || {}).length;
    const parts = [
      ['Расположение руководства', C(s.st.boss * 0.12, 0, 12)],
      ['Состояние завода', C((s.world.plant || 0) * 0.06, 0, 6)],
      ['Ступень в должности зама', C((c.mgmtStage || 1) * 2, 0, 10)],
      ['Достижения', Math.min(5, ach / 4)],
      ['Отношения с Трухановым и Соплежуйкиным', C((G.rl('truhanov') + G.rl('soplezhuykin') + 200) / 40, 0, 10)],
      ['Выговоры и «рейтинг» нарушений', -C((c.rep || 0) * 3, 0, 12)]
    ];
    const total = C(parts.reduce((a, p) => a + p[1], 0), 0, 40);
    return { total: total, parts: parts };
  };
  CEO.total = () => { const o = O(); return CEO.merit().total + (o.support.truh || 0) + (o.support.owners || 0) + (o.support.sopl || 0) + (o.support.staff || 0); };

  // ---------- Подключение к игровым часам (G.weeklyTick — по понедельникам) и утру
  const _wt = G.weeklyTick;
  G.weeklyTick = function () { const r = _wt.apply(this, arguments); try { CEO.weekly(); } catch (e) { if (window.console) console.error(e); } return r; };
  const _sd = G.startDay;
  G.startDay = function () { const r = _sd.apply(this, arguments); try { CEO.resume(); } catch (e) { if (window.console) console.error(e); } return r; };

  CEO.weekly = function () {
    if (!CEO.eligible()) return;
    const o = O(), wk = G.week(), c = G.s.car;
    if (o.depWeek == null) o.depWeek = wk;
    if (o.prompt) return; // вопрос уже ждёт ответа
    if (o.stage === 6) { CEO.s6(); return; } // приказ не был завершён (например, перезагрузка)
    if (wk < (o.nextWeek || 0)) return;
    if (o.stage === 0) {
      if (wk - o.depWeek < 4 || (c.mgmtStage || 1) < 2) return;
      o.path = CEO.pickPath(); o.stage = 1;
    } else if (o.stage >= 1 && o.stage <= 4) { o.stage++; } else return;
    CEO.show(o.stage);
  };
  CEO.resume = function () { // если окно закрылось без ответа (перезагрузка) — показать снова
    if (!CEO.eligible()) return; const o = O();
    if (o.prompt && !G.cur && !G.mq.length) CEO.show(o.prompt);
    else if (o.stage === 6 && !o.prompt && !G.cur && !G.mq.length) CEO.s6();
  };
  CEO.pickPath = function () {
    const s = G.s;
    if ((s.world.plant || 50) < 35) return 'crisis';
    if (s.st.boss >= 70 && G.rl('truhanov') < 25) return 'owners';
    return G.pick(['retire', 'resign', 'dismiss', 'retire']);
  };
  CEO.show = function (stage) {
    const o = O(); o.prompt = stage;
    const f = ({ 1: CEO.s1, 2: CEO.s2, 3: CEO.s3, 4: CEO.s4, 5: CEO.s5 })[stage]; if (f) f();
  };
  const done = (next) => { const o = O(); o.prompt = 0; o.nextWeek = G.week() + 1; if (next != null) o.stage = next; G.save && G.save(); };
  const M = (spec) => G.modal(Object.assign({ wide: true }, spec));

  // ---------- 1. Слухи
  const RUMOR = {
    retire: 'В коридорах заводоуправления шепчутся: Труханов «собирается на заслуженный отдых». Аллочка прячет глаза, а в его приёмной внезапно появились коробки для вещей — и клетка с попугаем, о котором никто не знал.',
    resign: 'Слух: Труханов подаёт в отставку «по состоянию здоровья». Здоровье у него, впрочем, отменное — особенно когда речь идёт о банкетах. Видимо, дело в другом.',
    dismiss: 'Слух: собственники недовольны Трухановым и готовят его снятие. Он ходит по заводу с видом человека, который всё знает, но ничего не может сделать — привычный для него вид.',
    crisis: 'Завод в плохом состоянии, и по цехам идёт слух: совет директоров ищет нового руководителя. Труханов сказал на планёрке, что «кризис — это возможность». Все согласились, что возможность — для кого-то другого.',
    owners: 'Слух: собственники присматриваются к вам. «Дельный парень, цифры в порядке» — эту фразу якобы произнесли в кабинете наверху. Труханов, узнав, неделю не здоровался.'
  };
  CEO.s1 = function () {
    const o = O();
    M({ title: '🗞 Слухи о смене директора', face: D.NPC.allochka ? 'allochka' : 'soplezhuykin', vib: 'warning',
      text: RUMOR[o.path] + '<br><br><i>Вы — заместитель генерального директора. Теоретически кресло рядом. Практически вокруг него уже ходят акулы.</i>',
      opts: [
        { t: 'Сделать вид, что ничего не слышали', fn: () => { sup('sopl', -2); done(); } },
        { t: 'Тихо навести порядок в бумагах и отчётах', fn: () => { sup('owners', 4); G.fx({ mood: -3 }); done(); } },
        { t: 'Расспросить секретаршу Аллочку', fn: () => { sup('truh', -2); sup('staff', 2); G.fx({ boss: 2 }); G.toast('Аллочка шепчет: «Бумаги уже печатают. Но на чьё имя — не скажу».'); done(); } }
      ] });
  };

  // ---------- 2. Разговоры с руководством (нужно пройти два из трёх)
  CEO.s2 = function () {
    const o = O(); o.talked = o.talked || {};
    const menu = () => {
      const n = Object.keys(o.talked).length;
      const row = (id, t) => ({ t: (o.talked[id] ? '✔ ' : '') + t, dis: o.talked[id] ? 'Уже поговорили' : null, fn: () => TALK[id](menu) });
      const opts = [row('sopl', 'Поговорить с Соплежуйкиным'), row('truh', 'Зайти к Труханову'), row('fin', 'Пообщаться с главбухом Шурыгиной')];
      if (n >= 2) opts.push({ t: '➡ Достаточно разговоров', fn: () => { o.talked = {}; done(2); } });
      M({ title: '🤝 Разговоры с руководством', face: 'truhanov', text: 'Решение о преемнике не принимается в вакууме: сначала — коридорные разговоры, перешёптывания и кофе в 11:00. Нужно побеседовать минимум с двумя людьми (сейчас: ' + n + ').', opts: opts });
    };
    menu();
  };
  const TALK = {
    sopl: next => { const o = O(); M({ title: 'Соплежуйкин', face: 'soplezhuykin', text: 'Максим Гогенович разглядывает вас поверх папки: «Слухи слышал. Конкуренция — это здорово. Особенно когда я выигрываю».', opts: [
      { t: '«Мы не конкуренты, Максим Гогенович»', fn: () => { sup('sopl', 8); o.talked.sopl = 1; G.relAdd('soplezhuykin', 4); next(); } },
      { t: '«Если стану директором — вы мой первый зам»', fn: () => { sup('sopl', 4); sup('truh', -3); o.talked.sopl = 1; next(); } },
      { t: 'Намекнуть, что знаете про его «комиссионные»', fn: () => { sup('sopl', -10); sup('owners', 3); o.talked.sopl = 1; G.relAdd('soplezhuykin', -12); next(); } }] }); },
    truh: next => { const o = O(); const hasCog = G.has('cognac'); M({ title: 'Труханов', face: 'truhanov', text: 'Труханов за огромным столом листает «важные» бумаги вверх ногами. «Говорят, ты метишь на моё место? Я, между прочим, ещё лет тридцать…».', opts: [
      { t: 'Заверить в лояльности: «Вы — наш флагман»', fn: () => { sup('truh', 8); sup('owners', -3); o.talked.truh = 1; next(); } },
      { t: 'Сказать прямо: готов принять дела', fn: () => { sup('owners', 5); sup('truh', -4); o.talked.truh = 1; next(); } },
      { t: 'Подарить коньяк' + (hasCog ? '' : ' (нет в рюкзаке)'), dis: hasCog ? null : 'Нужен коньяк', fn: () => { G.give('cognac', -1); sup('truh', 12); o.talked.truh = 1; G.toast('Труханов принял бутылку как должное и как будто уже ваш друг.'); next(); } }] }); },
    fin: next => { const o = O(); M({ title: 'Шурыгина', face: 'shurygina', text: 'Главбух поправляет очки: «Прибыль есть. Денег нет. Хотите правду или красивые цифры?»', opts: [
      { t: 'Попросить честные цифры', fn: () => { sup('owners', 5); sup('truh', -2); o.talked.fin = 1; G.toast('Цифры вышли страшные. Зато честные.'); next(); } },
      { t: 'Пообещать ей место финансового директора', fn: () => { sup('staff', 6); o.flagsPromise = 'fin'; o.talked.fin = 1; next(); } },
      { t: 'Ни о чём не просить', fn: () => { o.talked.fin = 1; next(); } }] }); }
  };

  // ---------- 3. Встреча с собственниками
  CEO.s3 = function () {
    const o = O(), mr = CEO.merit().total;
    M({ title: '🏛 Встреча с собственниками', face: 'truhanov', text: 'Совет директоров принимает вас в переговорной с длинным столом и коротким терпением. Собственники — три человека в дорогих костюмах и один в свитере (самый богатый). Они хотят понять, «чем вы лучше остальных».', opts: [
      { t: 'Представить отчёт о работе', fn: () => { sup('owners', 4 + Math.round(mr / 4)); done(); } },
      { t: 'Предложить программу развития завода', fn: () => { sup('owners', 8); o.promises.push('growth'); done(); } },
      { t: 'Пошутить про чугун и шлак', fn: () => { if (G.chance(50)) { sup('owners', 10); G.toast('Человек в свитере впервые за вечер улыбнулся.', 'good'); } else { sup('owners', -6); G.toast('Шутку не оценили. Свитер нахмурился.', 'bad'); } done(); } },
      { t: 'Сослаться на поддержку коллектива', fn: () => { sup('staff', 6); sup('owners', 3); done(); } }
    ] });
  };

  // ---------- 4. Обсуждение кандидатуры (роль Труханова зависит от пути)
  CEO.s4 = function () {
    const o = O(), p = o.path;
    const base = { title: '🗳 Обсуждение кандидатуры', face: 'truhanov' };
    if (p === 'dismiss') M(Object.assign(base, { text: 'Собственники обсуждают снятие Труханова, а он цепляется за кресло, как кот Чугунок за занавеску. Ему нужен союзник — вы.', opts: [
      { t: 'Не вмешиваться', fn: () => { done(); } },
      { t: 'Публично поддержать Труханова', fn: () => { sup('truh', 12); sup('owners', -10); done(); } },
      { t: 'Передать собственникам «факты» о его растратах', fn: () => { sup('owners', 10); sup('truh', -15); G.relAdd('truhanov', -20); done(); } }] }));
    else if (p === 'resign') M(Object.assign(base, { text: 'Труханов «сдаёт дела», но папку с финансами носит с собой. Подозрительно. Вы можете потребовать полный аудит перед назначением.', opts: [
      { t: 'Потребовать аудит финансов', fn: () => { sup('owners', 8); sup('truh', -10); o.audit = 1; done(); } },
      { t: 'Принять дела «как есть»', fn: () => { sup('truh', 5); done(); } },
      { t: 'Тайно сфотографировать его папку', fn: () => { if (G.chance(50)) { sup('owners', 10); } else { sup('truh', -12); sup('owners', -4); } done(); } }] }));
    else if (p === 'owners') M(Object.assign(base, { text: 'Неожиданно Труханов сам поддерживает вашу кандидатуру: «Лучше ты, чем этот Соплежуйкин. Свой человек!» Выгоду он, разумеется, найдёт.', opts: [
      { t: 'Принять поддержку', fn: () => { sup('truh', 12); sup('owners', 2); o.deals.truh = true; done(); } },
      { t: 'Поблагодарить, но без обязательств', fn: () => { sup('truh', 5); done(); } }] }));
    else M(Object.assign(base, { text: (p === 'crisis' ? 'Завод в кризисе, совет обсуждает «варягов из столицы» и вас. ' : 'Труханов уходит и хочет «остаться при деле». ') + 'Он предлагает вам сделку: «Ты директор, я — советник с окладом и правом подписи. Мелочи».', opts: [
      { t: 'Согласиться на сделку', fn: () => { sup('truh', 15); sup('owners', -3); o.deals.truh = true; done(); } },
      { t: 'Вежливо отказаться', fn: () => { sup('truh', -8); sup('owners', 3); done(); } },
      { t: 'Пообещать подумать', fn: () => { sup('truh', 4); done(); } }] }));
  };

  // ---------- 5. Решение
  CEO.s5 = function () {
    const o = O(), mr = CEO.merit(), total = CEO.total(), sp = o.support;
    const lines = mr.parts.map(p => '• ' + p[0] + ': ' + (p[1] >= 0 ? '+' : '') + Math.round(p[1] * 10) / 10).join('<br>');
    const sum = '<b>Заслуги: ' + Math.round(mr.total) + '</b><br>' + lines + '<br><br>Поддержка: Труханов ' + (sp.truh >= 0 ? '+' : '') + sp.truh + ', собственники ' + (sp.owners >= 0 ? '+' : '') + sp.owners + ', Соплежуйкин ' + (sp.sopl >= 0 ? '+' : '') + sp.sopl + ', коллектив ' + (sp.staff >= 0 ? '+' : '') + sp.staff + '<br><b>Итого: ' + Math.round(total) + ' (нужно ' + CEO.NEED + ')</b>';
    const compromise = o.tries >= 3 && total >= 40;
    if (total >= CEO.NEED || compromise) {
      M({ title: '🗳 Совет голосует', face: 'truhanov', vib: 'success', text: (compromise ? 'После трёх заседаний совет устал спорить и выбирает вас «как наименьшее зло». Это тоже способ.' : 'Голосование: «за» — большинство. Соплежуйкин воздержался, Труханов проголосовал «за» с выражением человека, откусившего лимон.') + '<br><br>' + sum, opts: [{ t: 'Продолжить', fn: () => { done(6); CEO.s6(); } }] });
    } else if (total >= 35) {
      o.tries++;
      M({ title: '🗳 Решение отложено', face: 'truhanov', vib: 'warning', text: 'Совет не готов принять решение: «Кандидат перспективный, но… давайте ещё раз поговорим». Вас просят доказать зрелость и встретиться с собственниками снова. Нужно набрать ' + CEO.NEED + ', сейчас ' + Math.round(total) + '.<br><br>' + sum, opts: [{ t: 'Понятно', fn: () => { O().prompt = 0; O().stage = 2; O().nextWeek = G.week() + 3; O().talked = {}; G.save && G.save(); } }] });
    } else {
      o.tries++;
      M({ title: '🗳 Назначение не состоялось', face: 'truhanov', vib: 'error', text: 'Совет выбрал «временное решение» — исполняющего обязанности из числа приглашённых. Вас поблагодарили, как благодарят людей, которые подали жалобу в нужный отдел.<br><br>' + sum + '<br><br><i>Улучшайте репутацию, отношения и состояние завода — вопрос вернётся через пару месяцев.</i>', opts: [{ t: 'Принять к сведению', fn: () => { const x = O(); Object.keys(x.support).forEach(k => { x.support[k] = Math.round(x.support[k] / 2); }); x.prompt = 0; x.stage = 0; x.nextWeek = G.week() + 8; x.depWeek = G.week() - 2; G.save && G.save(); } }] });
    }
  };

  // ---------- 6. Приказ и 7. Вступление
  CEO.s6 = function () {
    const d = G.dateObj(), ds = d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
    M({ title: '📜 ПРИКАЗ О НАЗНАЧЕНИИ', face: 'truhanov', vib: 'success', text:
      '<div style="border:2px solid #b5532a;padding:10px;font-family:serif"><b>АО «ЧУГУННЫЙ ВЕК»<br>ПРИКАЗ № ' + (G.s.t.day + 100) + '/ГД от ' + ds + '</b><br><br>1. Назначить <b>' + nm() + '</b> на должность <b>генерального директора</b> АО «Чугунный век».<br>2. Труханова Б. К. считать ушедшим «на заслуженный отдых», в том числе от ответственности.<br>3. Контроль исполнения приказа возложить на кота Чугунка (по согласованию).<br><br><i>Председатель совета директоров: Труханов Б. К. (печать, подпись, пятно от кофе).</i></div><br>Прежде чем принять дела, выберите, в каком состоянии вы хотите их получить.',
      opts: Object.keys(CO.DIFF).map(k => ({ t: CO.DIFF[k].n, fn: () => CEO.s7(k) })) });
    // подсказка по сложности
    G.toast('Условия приёма дел определяют стартовую кассу, долг и доверие совета.', 'warn');
  };
  CEO.s7 = function (diff) {
    M({ title: '🎖 ВСТУПЛЕНИЕ В ДОЛЖНОСТЬ', face: 'truhanov', vib: 'success', text: 'Торжественная церемония на плацу у заводоуправления. Оркестр цеха №3 исполняет марш, местами совпадающий с оригиналом. Кот Чугунок перерезает ленточку — когтями. Труханов вручает вам ключ от кабинета, который не открывает ни одну дверь, и печать, оставляющая только чернильное пятно. «Печать — символическая, — поясняет он. — Настоящая у меня».<br><br>Рабочие стоят молча. Вы чувствуете, что теперь вниз по лестнице — только вниз.<br><br><i>' + CO.DIFF[diff].d + '</i>', opts: [{ t: '🏢 Войти в кабинет', fn: () => { CEO.appoint(diff); } }] });
  };

  CEO.appoint = function (diff) {
    const s = G.s, o = s.ceo; if (o.appointed) return;
    o.appointed = true; o.day = s.t.day; o.diff = diff; o.stage = 8; o.prompt = 0;
    s.company = CO.create(diff);
    const c = s.company;
    c.board.trust = C(c.board.trust + (o.support.owners || 0) / 5 + (CEO.total() - CEO.NEED) / 8, 25, 85);
    if (o.promises.indexOf('growth') >= 0) c.board.promises.push({ type: 'margin', until: Math.floor(s.t.day / 7) + 12, target: 0.04 });
    if (o.audit) { c.flags.audit = 1; c.treasury += 0; }
    if (o.deals && o.deals.truh) c.board.trust = C(c.board.trust + 2);
    CEO.applyWorld();
    if (G.achieve) G.achieve('ceo', 'Генеральный директор «Чугунного века»');
    G.ui.tab = 'cabinet'; if (G.cab) G.cab.sec = 'home';
    CO.log(c, 'Вы вступили в должность генерального директора. Сложность: ' + CO.DIFF[c.diff].n + '.', 'good');
    G.save && G.save(); G.ui.render();
  };
  CEO.applyWorld = function () { // косметика мира после назначения (роль в словарях, перезагрузка тоже)
    if (!CEO.is()) return;
    if (D.NPC.truhanov) D.NPC.truhanov.role = 'Председатель совета директоров';
    if (D.NPC.soplezhuykin) D.NPC.soplezhuykin.role = 'Заместитель по производству';
  };

  // ---------- Интеграция с карьерой: звание, оклад, концовки
  const _rn = G.rankName; G.rankName = function () { return CEO.is() ? 'Генеральный директор' : _rn.apply(this, arguments); };
  const _jt = G.jobTitle; G.jobTitle = function () { return CEO.is() ? 'Генеральный директор АО «Чугунный век»' : _jt.apply(this, arguments); };
  const _mp = G.monthlyPay; G.monthlyPay = function () { return CEO.is() ? 300000 : _mp.apply(this, arguments); };
  const _ri = G.rankInfo; G.rankInfo = function () { if (CEO.is()) { const c = G.co.get(); return { stars: 5, mgmt: true, line: c ? 'Доверие собственников: ' + Math.round(c.board.trust) + '%' : 'Генеральный директор' }; } return _ri.apply(this, arguments); };
  const _end = G.end;
  G.end = function (id, data) {
    if (CEO.is() && id === 'fired') { id = 'ceo_fired'; data = Object.assign({ why: ['Собственники освободили вас от должности.'] }, data || {}); }
    return _end.call(this, id, data);
  };
  const _load = G.load;
  G.load = function () { const r = _load.apply(this, arguments); try { CEO.applyWorld(); } catch (e) { } return r; };

  D.ENDINGS = D.ENDINGS || {};
  D.ENDINGS.ceo_fired = { e: '📜', t: 'ОСВОБОЖДЁН ОТ ДОЛЖНОСТИ', x: 'Совет директоров освободил вас от должности генерального директора. Кабинет с панорамным окном остался прежним, изменился только пропуск. Труханов выступил с речью о «неизбежных кадровых решениях» — и вполне искренне вздохнул.' };
  D.ENDINGS.ceo_quit = { e: '🚪', t: 'ОТСТАВКА ДИРЕКТОРА', x: 'Вы подали заявление об уходе сами. Завод продолжит дымить без вас, а кот Чугунок займёт ваше кресло — на правах старшего по должности.' };
  D.ENDINGS.ceo_legend = { e: '🏆', t: 'ЛЕГЕНДА ЗАВОДА', x: 'Два года у руля: завод стоит, дымит и приносит прибыль. Во дворе заводоуправления поставили ваш бюст из чугуна. Он чуть кривой, но настоящий. Труханов приглашает на рыбалку — он всё ещё не отвык от власти, но уже не вредный.' };

  // ---------- Карточки в интерфейсе (карьера и главный экран)
  CEO.pathCard = function () {
    if (!G.s || !G.s.car || G.s.car.rank < 10) return '';
    const o = O();
    if (o.appointed) return '<div class="card"><h3>🏢 Кабинет директора</h3><div class="note">Вы — генеральный директор. Решения, отчёты и совет директоров — во вкладке «Кабинет».</div></div>';
    const lab = ['Слухов пока нет. Работайте — и будьте на виду.', 'Идут слухи о смене директора.', 'Разговоры с руководством.', 'Встреча с собственниками.', 'Обсуждение кандидатуры.', 'Совет принимает решение.'][Math.min(5, o.stage || 0)];
    const need = (o.stage || 0) === 0 ? '<div class="note">Требуется: ≥ 2-й ступени зама и около месяца в должности. Сейчас ступень ' + (G.s.car.mgmtStage || 1) + '.</div>' : '';
    return '<div class="card"><h3>🪑 Путь к креслу директора</h3><div>' + lab + '</div>' + need + '<div class="note">Заслуги: ' + Math.round(CEO.merit().total) + ' / 40. Попытки: ' + (o.tries || 0) + '.</div></div>';
  };
  const _pc = G.progressCard; G.progressCard = function () { return (_pc ? _pc.apply(this, arguments) : '') + CEO.pathCard(); };
  const _st = G.shiftTop; G.shiftTop = function () {
    const base = _st ? _st.apply(this, arguments) : '';
    if (!CEO.is() || !CO.on()) return base;
    const c = CO.get(), n = c.pending.length;
    return base + '<div class="card cab-quick" onclick="G.cab.open(\'home\')"><h3>🏢 Вызов в кабинет</h3><div class="kv"><span>Касса предприятия</span><span>' + CO.m(c.treasury) + '</span></div><div class="kv"><span>Требует решения</span><span>' + (n ? '<b style="color:var(--red)">' + n + '</b>' : '0') + '</span></div></div>';
  };

  // ---------- Отладка/тест
  CEO.dev = {
    deputy: function () { const s = G.s; s.car.job = s.car.job || Object.keys(D.JOBS)[0]; s.car.rank = 10; s.car.mgmtStage = Math.max(2, s.car.mgmtStage || 1); s.st.boss = Math.max(s.st.boss, 70); s.ceo.depWeek = G.week() - 6; s.ceo.nextWeek = 0; },
    start: function () { CEO.dev.deputy(); const o = O(); o.stage = 0; o.prompt = 0; CEO.weekly(); },
    now: function (diff) { CEO.dev.deputy(); CEO.appoint(diff || 'normal'); }
  };
})();
