/* ===== Карьера: кадры, инструктажи, среда, аттестация, медкомиссия, концовки ===== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.D;
  const C = G.clamp;
  const K = (G.career = {});

  // ---------- Концовки (разд. 23)
  D.ENDINGS = {
    fired: { e: '📄', t: 'УВОЛЕНИЕ', x: 'Приказ подписан, пропуск изъят, шкафчик вскрыт. Дядя Лёша тихо вздохнул и не посмотрел тебе в глаза.' },
    health: { e: '🏥', t: 'СПИСАН ПО ЗДОРОВЬЮ', x: 'Лёгкие, печень и нервы подали коллективное заявление «по собственному». Завод оформил тебя как «утрату трудоспособности» и оставил молоко себе.' },
    quit: { e: '🚪', t: 'УШЁЛ САМ', x: 'Настроение ушло в минус. Ты положил заявление на стол, ни с кем не попрощался и просто пошёл по лужам прочь. «Хлопнул дверью».' },
    quit_legend: { e: '🚪', t: 'УХОД ЛЕГЕНДЫ', x: 'Ты послал директора — и весь цех аплодировал стоя. Уходил ты как король. Правда, без трудовой.' },
    closed: { e: '🏭', t: 'ЗАВОД ЗАКРЫТ', x: 'Комиссия из Москвы приехала в понедельник, а в пятницу на воротах уже висела табличка «СДАЁТСЯ». Миллиарды удивительным образом не нашлись. Трубы больше не дымят.' },
    died: { e: '⚰️', t: 'УМЕР НА СМЕНЕ', x: 'Ты упал у станка, не дойдя до кабинета мечты. Смена, по ведомости, закончилась вовремя. Выговор посмертно не объявили — в виде исключения.' },
    poisoned: { e: '🍲', t: 'ОТРАВЛЕН ЛЮДКОЙ', x: 'Борщ с сюрпризом. Людка всегда знала, чья это ложка.' },
    jail: { e: '⛓️', t: 'ТЮРЬМА / УСЛОВНО', x: 'Колян сказал, что всё будет чисто. «Спортики» оказались неаккуратными, а Савелий Соплежуйкин — очень внимательным. Следователь вежливо улыбался.' },
    puppet: { e: '🪑', t: 'ЗАМ. ГЕНЕРАЛЬНОГО (КУКЛА)', x: 'Ты у руля, но без руля. Труханов по-прежнему «ещё лет тридцать будет работать». Завод по-прежнему дымит. Ты — самый важный человек, чьё мнение никому не нужно.' },
    head: { e: '🏅', t: 'НАЧАЛЬНИК ЦЕХА', x: 'Честный потолок достигнут. Ты вырос, а завод всё равно рушится. Выше — только директор, а директорское кресло — недостижимо.' },
    blogger: { e: '📹', t: 'БЛОГЕР ИЗ ЕДРЁНОСТАЛИ', x: 'Ты стал голосом завода. Подписчиков много, трудовой больше нет. Зато ты свободен, дымен и узнаваем.' },
    married: { e: '💍', t: 'ЖЕНИЛСЯ НА ТАТЬЯНЕ', x: 'Вы уехали в деревню. Огород, коза, тишина. Иногда по ночам снится гудок. Но Татьяна гладит тебя по голове — и гудок замолкает.' },
    homeless: { e: '🥴', t: 'АЛКАШ-БЕЗДОМНЫЙ', x: 'Долги, зависимость и пустые стёкла. «У Палыча» тебя пока ещё узнают — но уже не наливают.' },
    moscow: { e: '🚆', t: 'ПОБЕГ В МОСКВУ', x: 'Ты купил билет и уехал, не оглядываясь. Поезд шёл всю ночь. Дым из труб ещё долго видели в окне.' },
    squirrel: { e: '🐿️', t: 'БЕЛКА ПОБЕДИЛА', x: 'Ты закрыл игру. И, пожалуй, это единственный выход, который она не предусмотрела. Белка в каске одобрительно кивнула.' }
  };

  // ---------- Викторина
  K.shuffle = function (arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(G.rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  G.quiz = function (n, title, cb, who) {
    const qs = K.shuffle(D.QUIZ).slice(0, n); let i = 0, ok = 0;
    const next = () => {
      if (i >= qs.length) { cb(ok, n); return; }
      const q = qs[i++];
      const opts = K.shuffle(q[1].map((t, idx) => ({ t, right: idx === q[2] })));
      G.modal({ title, face: who, text: 'Вопрос ' + i + ' из ' + n + ':<br><b>' + q[0] + '</b>', opts: opts.map(o => ({ t: o.t, fn: () => { if (o.right) ok++; next(); } })) });
    };
    next();
  };

  // ---------- Вакансии
  K.jobStatus = function (id) {
    const s = G.s, j = D.JOBS[id], e = D.EDU.find(x => x.id === s.edu);
    if (id === 'otk') { if (G.rl('ekaterina') >= 40 && s.car.shifts >= 40) return null; return 'Для своих: нужно хорошее отношение Екатерины Евгеньевны'; }
    let open = j.open === 'all' || e.jobs.indexOf(id) >= 0 || (j.cert && G.hasCert(j.cert));
    if (!open) return j.cert ? 'Нужна корочка: ' + D.COURSES[j.cert].name : 'Нужно профильное образование';
    if (j.cert && !G.hasCert(j.cert)) return 'Нужна корочка: ' + D.COURSES[j.cert].name;
    if (j.hp && s.st.health < j.hp) return 'Медкомиссия не пропустит (здоровье ≥ ' + j.hp + ')';
    return null;
  };

  // ---------- Старт карьеры: отдел кадров → вакансия → договор → вводный инструктаж
  K.start = function () {
    const s = G.s, e = D.EDU.find(x => x.id === s.edu);
    s.phase = 'new';
    G.modal({ title: 'Отдел кадров', face: 'tatishcheva', bg: 'checkpoint', text: 'Татищева Тамара Кондратьевна улыбается так, будто ждала именно тебя.<br><i>«Так-так… {name}. Образование — ' + e.name + ', ' + e.school + '. Стаж — ноль. Паспорт, СНИЛС, ИНН, военник — всё есть?»</i><br><br>' + e.joke, opts: [{ t: 'Всё есть, вот', fn: () => K.vacancies() }] });
  };
  K.vacancies = function () {
    const s = G.s;
    const opts = D.JOB_ORDER.map(id => {
      const j = D.JOBS[id], why = K.jobStatus(id);
      return { t: j.name + '<small>Стажёр 12 000 ₽ · Р1 ' + G.rub(j.pay[0]) + ' · тяжесть ' + j.load + ' · вредность ' + j.harm + ' · нервы ' + j.nerves + '</small>', dis: why, fn: () => K.contract(id) };
    });
    G.modal({ title: 'Вакансии завода', face: 'tatishcheva', bg: 'checkpoint', text: '<i>«Вот что у нас есть. Что-то занято, что-то «для своих». Выбирайте с умом — чем выше оклад, тем сильнее садится здоровье».</i>', opts, wide: true });
  };
  K.contract = function (id) {
    const j = D.JOBS[id];
    G.modal({ title: 'Трудовой договор', bg: 'checkpoint', text: '<div class="doc"><b>ТРУДОВОЙ ДОГОВОР №17/Ч-В</b><br>Должность: ' + j.name + ' (стажёр)<br>1. Испытательный срок — 4 недели (20 смен).<br>2. Оклад стажёра — 12 000 ₽ в месяц.<br>3. Надбавка за вредность — 12% (после испытательного срока).<br>4. График: пятидневка, смена с 8:00.<br>9. <b>Материальная ответственность:</b> за ущерб оборудованию работник отвечает своей зарплатой.<br>14.7. Работник обязан любить завод. Работодатель — нет.</div>', opts: [
      { t: '✍ Подписать', fn: () => { G.s.car.job = id; K.introInstr(); } },
      { t: 'Передумал, к вакансиям', fn: () => K.vacancies() }
    ] });
  };
  K.introInstr = function () {
    G.modal({ title: 'Вводный инструктаж', face: 'pelageya', bg: 'checkpoint', text: 'Пелагея Фёдоровна приносит журнал и пирожок:<br><i>«Без подписи на работу не пустят. А муж мой тоже… ладно. Слушай: ' + G.pick(K.jokes) + '»</i>', opts: [{ t: 'Слушать внимательно', fn: () => K.testInstr('vvod', 'pelageya') }] });
  };
  K.jokes = ['если станок упал на ногу — не тряси ногой, береги станок, ногу мы спишем.', 'каску надевай, даже если голова уже дырявая.', 'молоко — для вредности, а не для кота Чугунка.', 'огнетушитель стоит на месте, а ты — рядом с ним.', 'спецовка — это не декор, а последнее, что тебя спасёт.', 'при пожаре бежим спокойно, но очень быстро.'];
  K.testInstr = function (kind, who) {
    const s = G.s, titles = { vvod: 'Вводный', perv: 'Первичный', povt: 'Повторный', vnepl: 'Внеплановый', celev: 'Целевой' };
    G.quiz(3, titles[kind] + ' инструктаж', (ok) => {
      if (ok >= 2) {
        s.instr[kind] = G.week(); if (kind === 'povt') delete s.flags.povtDue;
        G.fx({ know: 2, mood: 1 });
        G.modal({ title: 'Подпись в журнале', face: who, text: ok === 3 ? 'Все ответы верны. Пелагея довольно кивает. <b>Подпись поставлена.</b>' : 'Два ответа верны. «Ну, пройдёт». <b>Подпись поставлена.</b>', opts: [{ t: 'Ок', fn: () => { if (kind === 'vvod') { s.phase = 'morning'; s.t.hour = 7; K.firstDayIntro(); } } }] });
      } else {
        G.fx({ mood: -3, boss: -1 });
        G.modal({ title: 'Не сдал', face: who, text: 'Ответов верно: ' + ok + ' из 3. «Приходи, когда выучишь». Потерян час.', opts: [{ t: 'Пересдать', fn: () => { G.advance(1); K.testInstr(kind, who); } }] });
      }
    }, who);
  };
  K.firstDayIntro = function () {
    const s = G.s;
    s.phase = 'morning'; s.t.hour = 7;
    G.log('Ты принят на «АО Чугунный век». Вводный инструктаж пройден.');
    G.modal({ title: 'Добро пожаловать в Едрёносталь', bg: 'gate', text: 'Ты принят стажёром. Впереди 4 недели испытательного срока, общага за 3 500 ₽ и бесплатное молоко.<br><br><i>Нажми «Идти на работу» — первая смена начинается с проходной.</i>', opts: [{ t: 'Поехали', fn: () => {} }] });
  };

  // ---------- Проходная (дядя Лёша), перегар
  K.effSmell = () => Math.max(0, G.s.smell * (1 - Math.min(0.8, G.s.mask / 100)));
  K.goToWork = function () {
    const s = G.s;
    if (s.phase !== 'morning') return;
    if (s.car.sickUntil >= s.t.day) { G.toast('Ты на больничном — на работу идти не надо.', 'warn'); return; }
    s.phase = 'checkpoint'; s.t.hour = 7; G.advance(0);
    const eff = K.effSmell(), wed = G.weekday() === 2;
    let msg = 'Дядя Лёша кивает на пропуск. «Проходи».';
    if (eff > 12 || s.st.drunk > 3) {
      const p = wed ? C((eff - 5) * 4 + s.st.drunk * 3, 5, 95) : C((eff - 10) * 1.5, 0, 60);
      if (G.rl('lyosha') >= 30) { msg = 'Дядя Лёша принюхался, крякнул: «Иди уж. Но в среду — ни-ни».'; }
      else if (G.chance(p)) {
        if (wed || s.st.drunk > 15) { s.pay.pen += G.monthlyPay() / 4 * 0.2; G.punish({ risk: 100, what: 'Перегар на проходной' + (wed ? ' (в среду!)' : ''), fine: [200, 500], sev: 0 }); msg = 'Дядя Лёша принюхался и вызвал Гошу «Танка»…'; }
        else { G.fx({ boss: -2 }); msg = 'Дядя Лёша принюхивается и качает головой. «Не дыши на меня, ладно?»'; }
      }
    }
    s.phase = 'locker'; s.loc = 'locker';
    G.toast(msg);
    G.buzz('light');
    G.settle(); G.pump();
  };

  K.toWorkplace = function () {
    const s = G.s;
    if (s.phase !== 'locker') return;
    s.phase = 'work'; s.t.hour = 8; s.loc = 'shop'; s.day.slots = 0;
    G.settle();
    if (!s.flags.firstDay) { s.flags.firstDay = 1; G.modal({ title: 'Первая смена', face: 'palych', text: 'Палыч встречает у станка: <i>«Я твой наставник. Первичный инструктаж на рабочем месте — и вперёд».</i>', opts: [{ t: 'К журналу', fn: () => K.testInstr('perv', 'palych') }] }); }
    G.pump();
  };

  // ---------- Среда: проверка по охране труда (разд. 8.4)
  K.hook = function () {
    const s = G.s; if (!s || s.end) return;
    if (s.phase === 'work' && G.weekday() === 2 && Math.floor(s.t.hour) >= 10 && !s.day.inspect && s.car.probShifts >= 2) { s.day.inspect = true; K.inspection(); }
    if (s.phase === 'work' && s.car.attest && s.car.attest.day === s.t.day && Math.floor(s.t.hour) >= 14 && !s.day.attested) { s.day.attested = true; K.attestation(); }
    if (s.phase === 'morning' && s.car.probShifts >= 5 && G.week() >= (s.flags.medNext || 26) && !s.day.med && G.isWorkday()) { s.day.med = true; K.medCommission(); }
    if (s.car.appointment && s.car.appointment <= s.t.day && s.phase === 'work' && Math.floor(s.t.hour) >= 10 && !s.day.dir) { s.day.dir = true; G.directorTalk(); }
    if (G.pendingUnion && s.phase === 'work') { G.pendingUnion = false; K.unionOffer(); }
    if (s.flags.povtDue && s.phase === 'work' && s.day.slots >= 1 && G.chance(20) && !s.day.povtNag) { s.day.povtNag = true; G.toast('Пелагея Фёдоровна напоминает: просрочен повторный инструктаж. Зайди в заводоуправление.', 'warn'); }
  };

  K.inspection = function () {
    const s = G.s;
    const run = tidy => {
      const eff = K.effSmell();
      const notes = [];
      const outfit = s.st.neat >= 60 && (G.has('helmet') || s.car.rank >= 8 || s.day.prepped);
      if (!tidy) notes.push('рабочее место не убрано');
      if (!outfit) notes.push('не по форме (нужны чистая спецовка и каска/очки/респиратор)');
      if (s.st.neat < 60) notes.push('неопрятный вид');
      if (s.st.drunk > 3 || (eff > 12 && G.chance((eff - 5) * 5))) notes.push('запах алкоголя');
      const gift = () => { if (G.has('choco')) { G.give('choco', -1); G.relAdd('nadezhda', 6); return true; } return false; };
      const resolve = () => {
        if (!notes.length) { G.fx({ boss: 3, mood: 3 }); G.toast('Проверка пройдена без замечаний. Надежда Николаевна даже кивнула.', 'good'); s.flags.wedRes = 'без замечаний'; G.achieve('wed', 'Выжил в среду'); G.relAdd('nadezhda', 2); return; }
        s.flags.wedStrike = (s.flags.wedStrike || 0) + 1;
        const pen = Math.round(G.monthlyPay() / 4 * 0.2 * (G.newbie() ? 0.5 : 1));
        s.pay.pen += pen; s.pay.viol = (s.pay.viol || 0) + 1; s.day.viol++;
        s.flags.wedRes = 'нарушения: ' + notes.join(', ');
        G.fx({ boss: -4, mood: -5 });
        G.toast('Надежда Николаевна выписала штраф ' + G.rub(pen) + ' (недельная депремизация): ' + notes.join('; ') + '.', 'bad');
        if (s.flags.wedStrike >= 2 && !G.newbie() && G.chance(50)) { G.fx({ rep: 1 }); G.toast('Повторное нарушение: выговор.', 'bad'); G.checkEnd(); }
        s.flags.wedStrike = G.chance(50) ? s.flags.wedStrike : 0;
      };
      const choices = [];
      if (notes.length && G.has('choco')) choices.push({ t: '🍫 Подарить шоколадку', fn: () => { gift(); if (G.chance(55)) { G.toast('Она смягчилась. Замечаний нет.', 'good'); notes.length = 0; } resolve(); } });
      choices.push({ t: 'Стоять по стойке смирно', fn: resolve });
      G.modal({ title: 'ПРОВЕРКА ОТ', face: 'nadezhda', vib: 'warning', text: 'Надежда Николаевна идёт по цеху с портфелем и красной помадой. Проверка по пунктам: уборка, форма, опрятность, трезвость.' + (notes.length ? '<br><b>Что она заметит:</b> ' + notes.join('; ') : '<br>Кажется, всё в порядке.'), opts: choices });
    };
    if (s.day.prepped) run(true);
    else G.mini('clean', { title: 'Быстрая уборка!', hint: 'Тапай по мусору и маслу — Надежда Николаевна уже в цеху!' }, r => { s.day.cleaned = 1; run(r.score >= 0.6); });
  };

  // ---------- Аттестация (разд. 7.3)
  K.reqLines = function (to) {
    const s = G.s, st = s.st, c = s.car, r = D.REQ[to]; if (!r) return null;
    const L = [];
    const add = (t, ok) => L.push({ t, ok });
    add('Стаж: ' + c.shifts + ' / ' + r.shifts + ' смен', c.shifts >= r.shifts);
    add('Баллы мастерства: ' + Math.floor(st.bm) + ' / ' + r.bm, st.bm >= r.bm);
    add('Знания: ' + Math.floor(st.know) + ' / ' + r.know, st.know >= r.know);
    add('Уважение начальства: ' + Math.floor(st.boss) + ' / ' + r.boss, st.boss >= r.boss);
    add('Уважение коллег: ' + Math.floor(st.coll) + ' / ' + r.coll, st.coll >= r.coll);
    (r.certs || []).forEach(id => add('Корочка: ' + D.COURSES[id].name, G.hasCert(id)));
    if (r.rel) Object.keys(r.rel).forEach(n => add('Отношение: ' + D.NPC[n].name + ' ≥ ' + r.rel[n] + ' (сейчас ' + Math.floor(G.rl(n)) + ')', G.rl(n) >= r.rel[n]));
    if (r.notes != null) add('Записей в блокнотике Труханова ≤ ' + r.notes + ' (сейчас ' + G.noteCount() + ')', G.noteCount() <= r.notes);
    add('Актуальный инструктаж (повторный не просрочен)', !s.flags.povtDue && s.instr.perv != null);
    add('Выговоров не больше 1', c.rep <= 1);
    return L;
  };
  K.nextRankName = () => D.RANKS[Math.min(9, G.s.car.rank + 1)];
  K.applyAttest = function () {
    const s = G.s, c = s.car, to = c.rank + 1;
    if (c.rank === 0) { G.info('Ещё стажёр', 'Сначала пройди испытательный срок (20 смен).'); return; }
    if (to > 9) { G.info('Потолок', 'Выше — только директорское кресло. А оно недоступно.'); return; }
    if (c.attest) { G.info('Заявление уже подано', 'Комиссия соберётся в среду ' + G.dateStrOf(c.attest.day) + ' после обеда.'); return; }
    if (s.flags.attestBan && s.flags.attestBan > c.shifts) { G.info('Рано', 'Повторная подача — через ' + (s.flags.attestBan - c.shifts) + ' смен.'); return; }
    const L = K.reqLines(to), bad = L.filter(x => !x.ok);
    const fee = 800 + 600 * to;
    G.modal({ title: 'Заявление на «' + D.RANKS[to] + '»', face: 'tatishcheva', bg: 'checkpoint', text: '<i>«Проверим бумаги…»</i><br>' + L.map(x => (x.ok ? '✅ ' : '❌ ') + x.t).join('<br>') + '<br><br>Взнос: ' + G.rub(fee), opts: bad.length ? [{ t: 'Понятно, буду добирать', fn: () => {} }] : [
      { t: 'Подать заявление (' + G.rub(fee) + ')', dis: s.money < fee ? 'Не хватает денег' : null, fn: () => { G.addMoney(-fee); const wd = G.weekday(), toWed = (2 - wd + 7) % 7; const day = s.t.day + (toWed || 7) + 7; c.attest = { day, to, fee }; G.toast('Заявление принято. Комиссия — в среду, ' + G.dateStrOf(day) + '.'); } },
      { t: 'Передумал', fn: () => {} }
    ] });
  };
  G.dateStrOf = function (day) { const d = new Date(2026, 10, 2 + day); const MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']; return d.getDate() + ' ' + MON[d.getMonth()]; };

  K.attestation = function () {
    const s = G.s, st = s.st, c = s.car, to = c.attest.to, r = D.REQ[to];
    let bribe = 0, brOpts = [];
    const proceed = () => {
      G.quiz(5, 'Квалификационная комиссия — теория', ok => {
        G.mini('rhythm', { title: 'Практическое испытание', hint: 'Попадай в зелёную зону!', rounds: 4 }, res => {
          const avgQ = s.day.ops ? s.day.qsum / s.day.ops : G.quality();
          let p = 45 - 3 * to + 0.6 * (st.know - r.know) + 0.4 * (G.quality() - 70) + (ok - 2.5) * 5 + (res.score - 0.5) * 20 + bribe;
          if (st.boss >= 70) p += 8; if (st.coll >= 70) p += 4; if (G.rl('ekaterina') >= 50) p += 6; if (!G.noteCount()) p += 3; if (G.rl('tatishcheva') >= 40) p += 5;
          if (st.mood < 30) p -= 15; if (st.energy < 30) p -= 15; if (st.health < 30) p -= 10; if (st.drunk > 15) p -= 25; if (K.effSmell() > 20) p -= 20;
          p -= c.rep * 5 + G.noteCount() * 3;
          p = C(Math.round(p), 3, 95);
          const win = G.chance(p);
          c.attest = null;
          if (win) K.promote(to);
          else { st.know *= 0.6; s.flags.attestBan = c.shifts + 3; G.fx({ mood: -10, boss: -2 }); G.modal({ title: 'Комиссия: не аттестован', face: 'tatishcheva', bg: 'checkpoint', vib: 'error', text: 'Шанс был ' + p + '%. Не повезло. Знания ×0.6, взнос не возвращается. Повторная подача — через 3 смены.', opts: [{ t: 'Ну…', fn: () => {} }] }); }
        });
      }, 'tatishcheva');
    };
    if (s.flags.noteReminder !== s.t.day && G.noteCount() > 0) {
      const ns = s.car.notes.slice(-3).map(n => '«' + n.c + '»').join(', ');
      G.toast('Труханов открыл блокнотик: ' + ns + '. (−3% за запись)', 'bad');
    }
    if (G.has('env1') || G.has('env5')) brOpts.push({ t: '✉ Сунуть конверт комиссии (+10%, риск)', fn: () => { G.give(G.has('env5') ? 'env5' : 'env1', -1); bribe = 10; G.fx({ cons: -5 }); if (G.chance(25)) { G.fx({ rep: 1 }); G.toast('Взятку заметили! Выговор.', 'bad'); bribe = -10; } proceed(); } });
    G.modal({ title: 'КВАЛИФИКАЦИОННАЯ КОМИССИЯ', face: 'tatishcheva', bg: 'checkpoint', text: 'Татищева, мастер и инспектор ОТ ждут тебя. Теория (5 вопросов), практика и оценка ОТК. Взнос уплачен.', opts: brOpts.concat([{ t: 'Идти отвечать', fn: proceed }]) });
  };
  K.promote = function (to) {
    const s = G.s, st = s.st, c = s.car;
    c.rank = to; st.know = Math.round(st.know * 0.5);
    G.fx({ mood: 20, boss: 3 }); G.relAdd('tatishcheva', 3);
    G.buzz('success');
    G.achieve('rank' + to, 'Новая ступень: ' + D.RANKS[to]);
    const wage = G.monthlyPay();
    const finish = () => {
      if (to === 9) {
        G.modal({ title: '🏅 НАЧАЛЬНИК ЦЕХА', vib: 'success', bg: 'gate', text: 'Ты стал начальником цеха — честный потолок. Выше — только директорское кресло, но «Путь к креслу» застыл на 99%.<br>Труханов: «Я ещё лет 30 буду работать!»', opts: [{ t: 'Завершить карьеру (концовка)', fn: () => G.end('head') }, { t: 'Продолжить без роста', fn: () => { s.flags.headDone = 1; } }] });
      }
    };
    K.promoScreen(to, 'Теперь ты — <b>' + D.RANKS[to] + '</b>. Новый оклад ≈ ' + G.rub(wage) + '.<br><i>«Я знала, что вы справитесь», — шепчет Татищева.</i> Знания ×0.5.', finish);
    if (to >= 6 && !s.flags.mgmtHint) { s.flags.mgmtHint = 1; G.toast('Теперь меньше физического труда и больше бумаг — и больше давления сверху.', 'tip'); }
  };

  // ---------- Стажировка (разд. 6.7)
  K.shiftEnd = function () {
    const s = G.s, c = s.car;
    if (c.rank === 0) {
      const n = c.probShifts;
      const scenes = {
        5: ['Конец 1-й недели: проверка у наставника', 'Палыч смотрит твою работу, хмыкает: «Не безнадёжен. Но руки из других мест».', { know: 3, boss: 2 }],
        10: ['Конец 2-й недели: инструктаж по месту', 'Пелагея Фёдоровна проверяет рабочее место: «Хорошо. Но шнурки завяжи».', { know: 2, boss: 2 }],
        15: ['3-я неделя: самостоятельная операция', 'Мастер Степаныч даёт тебе самостоятельную операцию. «Не запори — отвечаешь ты».', { know: 4, bm: 10 }]
      };
      if (scenes[n] && s.flags['prob' + n] !== 1) { s.flags['prob' + n] = 1; const sc = scenes[n]; G.modal({ title: sc[0], face: n === 10 ? 'pelageya' : n === 15 ? 'stepanych' : 'palych', text: sc[1], opts: [{ t: 'Ок', fn: () => G.fx(sc[2]) }] }); }
      if (n === 8 && !s.flags.probCat) { s.flags.probCat = 1; G.fx({ mood: 8 }); G.modal({ title: 'Рыжий знакомый', face: 'chugunok', text: 'Из-под станка вылез рыжий кот Чугунок. Потёрся о ботинок. Ты теперь знаком с главным начальником уюта.', opts: [{ t: 'Погладить кота', fn: () => { G.fx({ mood: 8 }); G.R('chugunok').met = true; } }] }); }
      if (n === 12 && !s.flags.probBeer) { s.flags.probBeer = 1; G.modal({ title: 'Ритуальная пьянка', face: 'seryoga', text: 'Серёга и мужики зовут «обмыть стажёра» после смены. Традиция.', opts: [{ t: 'Пойти с ними', fn: () => { G.fx({ drunk: 25, mood: 8, coll: 8, cool: 4, money: -150, rel: { seryoga: 8, palych: 4 } }); G.toast('Обмыли. Утром будет весело.'); } }, { t: 'Отказаться', fn: () => { G.fx({ coll: -4, boss: 1 }); } }] }); }
    }
    G.showTip();
    // отчёт среды в пятницу
    if (G.weekday() === 4 && s.flags.wedRes) { G.toast('Итоги проверки ОТ: ' + s.flags.wedRes, s.flags.wedRes === 'без замечаний' ? 'good' : 'bad'); delete s.flags.wedRes; }
    // выговор: проверка риска увольнения в конце недели
    if (G.weekday() === 4 && G.chance(G.fireRisk() / 4)) { G.modal({ title: 'Вызывают на ковёр', face: 'truhanov', vib: 'warning', text: 'Труханов раскрывает блокнотик: «Ты… как тебя там, ' + G.pick(D.TRUH_NAMES) + '. Не нравишься ты мне. Что скажешь?»', opts: [{ t: 'Покаяться', fn: () => { G.fx({ boss: 2, mood: -4 }); G.toast('Он махнул рукой.'); } }, { t: 'Огрызнуться', fn: () => { G.fx({ cool: 6, boss: -8 }); if (G.chance(G.fireRisk() + 15)) G.end('fired'); else G.toast('Пронесло… пока.', 'warn'); } }] }); }
  };
  K.probationEnd = function () {
    const s = G.s, c = s.car, st = s.st;
    if (c.rank !== 0 || c.probShifts < 20) return;
    const p = C(Math.round(50 + st.know * 0.6 + st.boss * 0.3 + (s.instr.perv != null ? 8 : -20) - c.rep * 15 - (G.docsUnsigned ? G.docsUnsigned() * 6 : 0)), 25, 95);
    G.modal({ title: 'Допуск к самостоятельной работе', face: 'tatishcheva', bg: 'checkpoint', text: 'Комиссия: Татищева + мастер + инспектор ОТ. Итоги испытательного срока. (Шанс ~' + p + '%.)', opts: [{ t: 'Ждать решения', fn: () => {
      if (G.chance(p)) { c.rank = 1; G.fx({ mood: 15, boss: 3, coll: 2 }); G.achieve('rank1', 'Прошёл стажировку'); K.promoScreen(1, 'Ты переходишь в «Разряд 1» с полным окладом ≈ ' + G.rub(G.monthlyPay()) + '. Профсоюз уже тянет к тебе руки.', () => { if (G.relics) G.relics.trigger('internship_complete'); }); }
      else { c.probShifts = 16; c.probFail++; G.fx({ mood: -6, boss: -2 }); G.modal({ title: 'ПРОДЛЕНИЕ СТАЖИРОВКИ', vib: 'error', face: 'tatishcheva', bg: 'checkpoint', text: 'Не прошёл. Стажировка продлена на неделю (4 смены). Оплата — стажёрская.', opts: [{ t: 'Эх', fn: () => {} }] }); if (c.probFail >= 3) G.modal({ title: 'ПРИКАЗ', text: 'Трижды не пройден допуск. Тебя отчисляют.', opts: [{ t: '…', fn: () => G.end('fired') }] }); }
    } }] });
  };

  // ---------- Профсоюз (разд. 8.8)
  K.unionOffer = function () {
    G.modal({ title: 'Профсоюз «Чугунный проф»', face: 'semyonych', text: 'Семёныч подходит со своей папкой: «Вступайте. Взнос 1% зарплаты. Путёвки раз в 8 недель, защита от выговоров. Всегда нужно подождать, но вступить можно сразу».', opts: [
      { t: 'Вступить', fn: () => { G.s.car.union = true; G.fx({ boss: -1, cons: 1 }); G.toast('Ты в профсоюзе: −8% к риску увольнения, больше шансов «пронесёт».', 'good'); } },
      { t: 'Не сейчас', fn: () => { G.s.flags.unionOffered = 0; } }
    ] });
  };

  // ---------- Медкомиссия (разд. 10.3)
  K.medCommission = function () {
    const s = G.s, st = s.st; let fails = 0; const rep = [];
    const rooms = [
      ['Терапевт', st.health >= 45 && st.tox <= 65],
      ['ЛОР и рентген лёгких', st.tox <= 55],
      ['Нарколог', st.habit <= 60 && !(s.day.peak > 40)],
      ['Психиатр', st.mood >= 25 && !s.flags.burnout],
      ['Невролог и окулист', !(s.car.lowE > 5)]
    ];
    const finish = () => {
      rooms.forEach(r => { if (!r[1]) fails++; rep.push((r[1] ? '✅ ' : '❌ ') + r[0]); });
      let verdict, fx = {};
      if (fails === 0) verdict = 'ГОДЕН';
      else if (fails === 1) { verdict = 'ГОДЕН С ОГРАНИЧЕНИЕМ'; s.flags.limited = G.week() + 8; fx = { mood: -4 }; }
      else if (fails === 2) { verdict = 'ПРОФЗАБОЛЕВАНИЕ'; fx = { money: -12000, health: 15, tox: -30 }; s.car.sickUntil = s.t.day + 14; }
      else verdict = 'НЕ ГОДЕН';
      s.flags.medNext = G.week() + 26;
      G.fx(fx);
      G.modal({ title: 'МЕДКОМИССИЯ: ' + verdict, vib: fails ? 'error' : 'success', face: 'alevtina', text: rep.join('<br>') + (fails === 2 ? '<br><br>Лечение 2 недели, платное (12 000 ₽).' : '') + (fails === 1 ? '<br><br>Перевод на лёгкий труд: оклад −10% на 8 недель.' : ''), opts: [{ t: 'Ок', fn: () => { if (verdict === 'НЕ ГОДЕН') G.end('health'); else { s.phase = 'work'; s.loc = 'shop'; s.t.hour = 8; G.advance(4); G.settle(); } } }] });
    };
    const opts = [];
    if (G.has('env1')) opts.push({ t: '✉ Подмазать врача (−1 замечание)', fn: () => { G.give('env1', -1); G.fx({ cons: -4 }); rooms.forEach((r, i) => { if (!r[1] && rooms.filter(x => !x[1]).length) { r[1] = true; } }); rooms.some(r => false); finish(); } });
    opts.push({ t: 'Идти по кабинетам', fn: finish });
    G.modal({ title: 'ПЛАНОВАЯ МЕДКОМИССИЯ', face: 'alevtina', text: 'Раз в полгода — обязательно. Терапевт, ЛОР, нарколог, психиатр, рентген, анализы. Не пил молоко? Узнаем.', opts });
  };

  // ---------- Закрытие завода
  K.closing = function () {
    G.modal({ title: '📰 Слухи в столовой', text: 'Людка шепчет: «Комиссия из Москвы приехала. Говорят, закрывают». Через неделю на воротах уже висела табличка.', vib: 'error', bg: 'gate', opts: [{ t: 'Это конец', fn: () => G.end('closed') }] });
  };

  // ---------- Курсы
  K.takeCourse = function (id) {
    const s = G.s, cr = D.COURSES[id];
    if (G.hasCert(id)) { G.info('Уже есть', 'Корочка «' + cr.name + '» уже в деле.'); return; }
    if (s.money < cr.price) { G.info('Не хватает денег', 'Курс стоит ' + G.rub(cr.price) + '.'); return; }
    G.modal({ title: cr.name, text: 'Стоимость: ' + G.rub(cr.price) + '. Займёт ' + cr.slots + ' слотов (вечера/выходные). Знания +10, усталость.', opts: [
      { t: 'Записаться и учиться', fn: () => { G.addMoney(-cr.price); s.car.certs.push(id); G.advance(Math.min(cr.slots, 4)); G.fx({ know: 10, energy: -14, mood: -4 }); G.toast('Получена корочка: ' + cr.name, 'good'); G.settle(); } },
      { t: 'Не сейчас', fn: () => {} }
    ] });
  };
})();
