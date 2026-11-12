/* ===== Рантайм действий: запуск, люди, романтика, магазин, банк, телефон ===== */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.D;
  const C = G.clamp;
  const K = G.career;
  G.ACT = {};
  G.A = (id, o) => { o.id = id; G.ACT[id] = o; return o; };

  // ---------- Доступность
  const isFree = () => { const p = G.s.phase; return p === 'evening' || p === 'weekend'; };
  G.isFree = isFree;
  G.avail = function (a) {
    const s = G.s, ph = s.phase;
    if (s.end) return 'Игра окончена';
    let ok = false;
    (a.ph || ['work']).forEach(p => { if (p === ph || (p === 'free' && isFree()) || (p === 'work' && ph === 'lunch' && a.lunch)) ok = true; });
    if (!ok) return 'Сейчас недоступно';
    if ((ph === 'work' || ph === 'lunch') && a.loc && a.loc !== s.loc && !a.anywhere) return 'Не здесь';
    if (a.cost && s.money < a.cost) return 'Не хватает денег (' + G.rub(a.cost) + ')';
    if (isFree() && a.h && s.t.hour + a.h > 26) return 'Слишком поздно';
    if (ph === 'work' && a.h && G.slotsLeft() < a.h) return 'Смена кончается';
    if (ph === 'lunch' && !a.menu && s.lunchAP < 1) return 'Обед кончился';
    if (a.once && s.day.done[a.id]) return 'Уже сегодня';
    if (a.noTrainee && s.car.rank === 0) return 'Стажёрам нельзя';
    if (a.minRank && s.car.rank < a.minRank) return 'Нужна должность выше';
    if (a.maxRank != null && s.car.rank > a.maxRank) return 'Не для твоей должности';
    if (a.req) { const r = a.req(s); if (r) return r; }
    return null;
  };
  G.spend = function (h) {
    const s = G.s;
    if (s.phase === 'lunch') s.lunchAP = Math.max(0, s.lunchAP - 1); else if (h) G.advance(h);
    G.afterAction({ h: h || 1 });
  };
  G.afterAction = function (a) {
    const s = G.s;
    if (s.end) { G.pump(); return; }
    G.settle();
    if (!s.end && a && a.h !== 0 && a.noEvent !== true) G.rollEvent();
    G.pump();
  };
  G.runAction = function (id) {
    const a = G.ACT[id], s = G.s; if (!a) return;
    const why = G.avail(a);
    if (why) { G.toast(why, 'warn'); return; }
    if (a.cost) G.addMoney(-a.cost);
    if (a.once) s.day.done[a.id] = 1;
    if (a.fn) {
      const r = a.fn(s, a);
      if (r === false) { if (a.cost) G.addMoney(a.cost); if (a.once) delete s.day.done[a.id]; return; }
      if (r === 'custom') { return; }
    }
    const f = typeof a.fx === 'function' ? a.fx(s) : a.fx;
    const sum = G.fx(f);
    const t = typeof a.txt === 'function' ? a.txt(s) : Array.isArray(a.txt) ? G.pick(a.txt) : a.txt;
    if (t || sum) G.toast((t ? G.fmt(t) + ' ' : '') + (sum ? '(' + sum + ')' : ''), a.cls);
    if (!a.menu) {
      if (s.phase === 'lunch') s.lunchAP = Math.max(0, s.lunchAP - 1);
      else if (a.h) { G.advance(a.h); if (s.phase === 'work') { s.day.breaks += a.work ? 0 : 1; } }
    }
    if (a.risk) {
      s.day.risky = a.what || a.n;
      const got = G.caught({ risk: a.risk, fine: a.fine || [100, 300], sev: a.sev || 0, what: a.what || a.n });
      if (!got && a.tag === 'risky' && G.binocularMaybe) G.binocularMaybe(a);
    }
    G.afterAction(a);
  };
  G.actionsAt = function (loc, group) {
    return Object.values(G.ACT).filter(a => a.loc === loc && (!group || a.g === group));
  };

  // ---------- Предметы
  G.useItem = function (id) {
    const s = G.s, it = D.ITEMS[id]; if (!it || !G.has(id)) return;
    G.give(id, -1);
    if (it.drink) { G.fx({ drunk: it.drink, mood: 4 + it.drink / 6, craving: -8 }); G.toast('Выпил: ' + it.n + '.'); if (s.phase === 'work' || s.phase === 'lunch') { s.day.risky = 'Выпил на работе'; G.caught({ risk: 45, fine: [200, 600], sev: 1, what: 'Распитие на рабочем месте' }); } }
    if (it.use) G.fx(it.use);
    if (it.cure) G.fx({ cure: it.cure });
    if (it.mask) s.mask += it.mask;
    G.toast('Использовано: ' + it.n + '.');
    G.afterAction({ h: 0, noEvent: true });
  };
  G.useMenu = function () {
    const s = G.s;
    const ids = Object.keys(s.inv).filter(id => D.ITEMS[id] && (D.ITEMS[id].use || D.ITEMS[id].cure || D.ITEMS[id].mask || D.ITEMS[id].drink));
    if (!ids.length) { G.info('Рюкзак пуст', 'Из пригодного для употребления у тебя ничего нет. Магазин — вечером в городе.'); return; }
    G.modal({ title: 'Рюкзак: что использовать?', opts: ids.map(id => ({ t: D.ITEMS[id].e + ' ' + D.ITEMS[id].n + ' ×' + s.inv[id] + ' — ' + D.ITEMS[id].d, fn: () => G.useItem(id) })).concat([{ t: 'Закрыть', fn: () => {} }]), wide: true });
  };

  // ---------- Магазин
  G.shopMenu = function (cat) {
    const s = G.s;
    if (!cat) {
      const cats = ['еда', 'аптека', 'алкоголь', 'подарок', 'взятка', 'прочее'];
      G.modal({ title: 'Магазин «Пятёрка-Минус»', text: 'Деньги: <b>' + G.rub(s.money) + '</b>', opts: cats.map(c => ({ t: c[0].toUpperCase() + c.slice(1), fn: () => G.shopMenu(c) })).concat([{ t: 'Выйти', fn: () => G.afterAction({ h: 1 }) }]) });
      return;
    }
    const ids = Object.keys(D.ITEMS).filter(id => D.ITEMS[id].cat === cat);
    G.modal({ title: cat[0].toUpperCase() + cat.slice(1), text: 'Деньги: <b>' + G.rub(s.money) + '</b>', wide: true, opts: ids.map(id => { const it = D.ITEMS[id]; return { t: it.e + ' ' + it.n + ' — ' + G.rub(it.p) + (G.s.inv[id] ? ' (есть ' + s.inv[id] + ')' : '') + ' · ' + it.d, dis: s.money < it.p ? 'Не хватает' : null, fn: () => { G.addMoney(-it.p); G.give(id, 1); G.toast('Куплено: ' + it.n); G.shopMenu(cat); } }; }).concat([{ t: '← К разделам', fn: () => G.shopMenu() }]) });
  };
  G.buyStatus = function (id) {
    const s = G.s, it = D.STATUS[id];
    if (s.own[id]) { G.info('Уже есть', it.n + ' у тебя уже есть.'); return; }
    const lowerSame = Object.keys(s.own).filter(k => D.STATUS[k].tier === it.tier && D.STATUS[k].v >= it.v);
    if (lowerSame.length) { G.info('Зачем?', 'У тебя уже есть вещь лучше.'); return; }
    if (s.money < it.p) { G.info('Не хватает', it.n + ' стоит ' + G.rub(it.p) + '.'); return; }
    G.addMoney(-it.p);
    Object.keys(s.own).forEach(k => { if (D.STATUS[k].tier === it.tier) delete s.own[k]; });
    s.own[id] = 1; G.fx({ mood: 6 + it.v * 3, cool: it.v * 3 }); G.toast('Куплено: ' + it.n + '!', 'good'); G.achieve('own_' + id, 'Купил: ' + it.n);
    G.afterAction({ h: 1 });
  };
  G.statusMenu = function (tiers, title) {
    const s = G.s, ids = Object.keys(D.STATUS).filter(id => tiers.indexOf(D.STATUS[id].tier) >= 0);
    G.modal({ title, wide: true, text: 'Деньги: <b>' + G.rub(s.money) + '</b>. Статус нельзя заработать честно — только украсть, занять или продать себя по частям.', opts: ids.map(id => { const it = D.STATUS[id]; return { t: it.e + ' ' + it.n + ' — ' + G.rub(it.p) + (s.own[id] ? ' ✔' : ''), dis: s.own[id] ? 'Уже есть' : null, fn: () => G.buyStatus(id) }; }).concat([{ t: 'Выйти', fn: () => {} }]) });
  };
  G.statusScore = () => Object.keys(G.s.own).reduce((a, k) => a + D.STATUS[k].v, 0);

  // ---------- Банк, кредиты
  G.bankMenu = function () {
    const s = G.s, loans = s.loans;
    const t = 'Рублёв улыбается: <i>«Для вас — особые условия!»</i><br>Долги: ' + G.rub(s.debt) + ' · Кредитов: ' + loans.length + '<br>' + loans.map(l => '• ' + ({ bank: 'Кредит', micro: 'Микрозайм', mortgage: 'Ипотека' }[l.type]) + ': осталось ' + G.rub(l.left)).join('<br>');
    const o = [];
    o.push({ t: 'Взять кредит 50 000 ₽ (38% годовых)', fn: () => { s.loans.push({ type: 'bank', left: 50000, rate: 0.38, pay: 4800 }); G.addMoney(50000); G.fx({ cons: -1 }); G.toast('Кредит одобрен. Подпись — и ты на крючке.', 'warn'); } });
    o.push({ t: 'Взять кредит 200 000 ₽ (42%)', dis: s.car.rank < 1 ? 'Стажёрам не дают' : null, fn: () => { s.loans.push({ type: 'bank', left: 200000, rate: 0.42, pay: 19000 }); G.addMoney(200000); G.toast('200 000 ₽. И шесть звонков в неделю.', 'warn'); } });
    o.push({ t: 'Микрозайм «До зарплаты» 5 000 ₽ (1,5%/день)', fn: () => { s.loans.push({ type: 'micro', left: 5000, rate: 0 }); G.addMoney(5000); G.toast('Микрозайм получен. Проценты капают каждый день.', 'warn'); } });
    if (s.car.rank >= 7) o.push({ t: 'Ипотека: квартира в центре (4,5 млн, 24%)', dis: s.own.flat ? 'Уже есть' : null, fn: () => { s.loans.push({ type: 'mortgage', left: 4500000, rate: 0.24, pay: 90000 }); s.own.flat = 1; G.fx({ mood: 15, cool: 10 }); G.toast('Квартира в центре! Платёж — 90 000 ₽ в месяц.', 'warn'); G.achieve('flat', 'Квартира в центре (в ипотеку)'); } });
    if (s.debt > 0) o.push({ t: 'Погасить долг (' + G.rub(Math.min(s.debt, s.money)) + ')', dis: s.money < 1 ? 'Нет денег' : null, fn: () => { const p = Math.min(s.debt, s.money); G.addMoney(0); s.money -= p; s.debt -= p; G.toast('Долг погашен частично/полностью: ' + G.rub(p)); } });
    loans.forEach((l, i) => { if (s.money > 0) o.push({ t: 'Погасить: ' + ({ bank: 'кредит', micro: 'микрозайм', mortgage: 'ипотека' }[l.type]) + ' (' + G.rub(Math.min(l.left, s.money)) + ')', fn: () => { const p = Math.min(l.left, s.money); s.money -= p; l.left -= p; if (l.left <= 5) { s.loans.splice(s.loans.indexOf(l), 1); if (l.type === 'mortgage') { delete s.own.flat; } } G.toast('Платёж: ' + G.rub(p)); } }); });
    o.push({ t: 'Выйти', fn: () => {} });
    G.modal({ title: '🏦 «Рубль-Банк»', face: 'rublev', text: t, opts: o, wide: true });
  };

  // ---------- Люди: меню, разговор, подарки
  G.isPresent = function (id) {
    const s = G.s, n = D.NPC[id];
    if (!n || !n.at) return false;
    if (n.at.city) return false;
    return G.npcLoc(id) === s.loc && (s.phase === 'work' || s.phase === 'lunch' || s.phase === 'locker' || s.phase === 'morning' || s.phase === 'checkpoint');
  };
  G.talkTo = function (id) {
    const s = G.s, n = D.NPC[id], r = G.R(id);
    if (!n.talk || !n.talk.length) { G.info(n.name, 'Он(а) молчит.'); return; }
    let list = n.talk.filter(d => !d.c || d.c(s));
    const seen = r.seen || (r.seen = {});
    const fresh = list.filter((d, i) => !seen[i]);
    const pool = fresh.length ? fresh : list;
    const d = G.pick(pool); seen[n.talk.indexOf(d)] = 1; if (!fresh.length) r.seen = {};
    r.met = true; r.talks++;
    G.modal({ title: n.name, face: id, text: G.fmt(d.t), opts: d.o.map(o => ({ t: o[0], fn: () => { const sum = G.fx(o[2], { npc: id }); G.toast(G.fmt(o[1]) + (sum ? ' (' + sum + ')' : '')); G.spend(1); } })) });
  };
  G.giftMenu = function (id) {
    const s = G.s, n = D.NPC[id];
    const ids = Object.keys(s.inv).filter(k => D.ITEMS[k] && (D.ITEMS[k].gift || D.ITEMS[k].bribe));
    if (!ids.length) { G.info('Нечего дарить', 'В рюкзаке нет ничего подходящего. Магазин — вечером.'); return; }
    G.modal({ title: 'Подарок: ' + n.name, face: id, wide: true, opts: ids.map(k => ({ t: D.ITEMS[k].e + ' ' + D.ITEMS[k].n + ' ×' + s.inv[k], fn: () => G.gift(id, k) })).concat([{ t: 'Передумал', fn: () => {} }]) });
  };
  G.gift = function (id, item) {
    const s = G.s, n = D.NPC[id], it = D.ITEMS[item];
    G.give(item, -1);
    let v = it.gift || 3;
    const liked = n.likes && n.likes.indexOf(item) >= 0, hated = n.dislikes && n.dislikes.indexOf(item) >= 0;
    if (liked) v *= 2; if (hated) v = -v / 2;
    if (id === 'truhanov' && it.bribe) { G.modal({ title: 'Труханов', face: id, text: '«Не-не-не. Такими вещами у нас занимается Соплежуйкин». Он хмурится, но подарок прячет.', opts: [{ t: 'Понял…', fn: () => { G.give(item, 1); s.flags.truhHint = 1; G.fx({ cons: -1 }); } }] }); return; }
    G.relAdd(id, v); G.R(id).met = true;
    let extra = '';
    if (it.bribe || item === 'cognac' || item === 'perfume' || item === 'tie') { G.fx({ cons: -(it.bribe ? 4 : 1) }); }
    if (id === 'soplezhuykin' && v >= 9) { s.flags.soplGift = G.week() + 6; extra = ' Он «забудет» лишать зарплаты 6 недель.'; G.fx({ boss: 3 }); }
    if (id === 'nadezhda' && v > 0) extra = ' Помада на мгновение дрогнула.';
    if (id === 'truhanov') G.fx({ boss: 3 });
    G.toast(n.name + (hated ? ' скривился(ась).' : liked ? ' в восторге!' : ' принял(а) подарок.') + extra + ' (отн. ' + (v > 0 ? '+' : '') + Math.round(v) + ')', hated ? 'bad' : 'good');
    G.spend(1);
  };
  G.lendMenu = function (id) {
    const n = D.NPC[id], s = G.s;
    G.modal({ title: n.name + ': деньги', face: id, text: 'Надёжность: ~' + (n.reliab || 50) + '%', opts: [
      { t: 'Одолжить 500 ₽', dis: s.money < 500 ? 'Нет денег' : null, fn: () => { G.addMoney(-500); G.R(id).owed = (G.R(id).owed || 0) + 500; G.R(id).help = (G.R(id).help || 0) + 1; G.relAdd(id, 4); G.toast('Одолжил 500 ₽ (' + n.name + ')'); } },
      { t: 'Одолжить 2 000 ₽', dis: s.money < 2000 ? 'Нет денег' : null, fn: () => { G.addMoney(-2000); G.R(id).owed = (G.R(id).owed || 0) + 2000; G.R(id).help = (G.R(id).help || 0) + 2; G.relAdd(id, 8); G.toast('Одолжил 2 000 ₽ (' + n.name + ')'); } },
      { t: 'Занять у него 1 000 ₽', fn: () => { G.addMoney(1000); s.flags['debt_' + id] = (s.flags['debt_' + id] || 0) + 1000; G.relAdd(id, -2); G.toast('Занял 1 000 ₽. Запомнят.'); } },
      { t: 'Занять 3 000 ₽', fn: () => { G.addMoney(3000); s.flags['debt_' + id] = (s.flags['debt_' + id] || 0) + 3000; G.relAdd(id, -4); G.toast('Занял 3 000 ₽. Теперь отдавай.'); } },
      { t: 'Передумал', fn: () => {} }
    ] });
  };
  G.npcMenu = function (id) {
    if (G.isShunned && G.isShunned(id)) return G.shunTalk(id);
    const s = G.s, n = D.NPC[id], r = G.R(id), here = G.isPresent(id);
    r.met = true;
    const o = [];
    const stageTxt = n.romance ? ' · ' + D.ROM_STAGES[Math.min(7, r.stage)] : '';
    if (here || (n.at && n.at.city && G.isFree() && s.loc === n.at.loc)) {
      o.push({ t: '💬 Поговорить', fn: () => (G.talkMenu ? G.talkMenu(id) : G.talkTo(id)) });
      o.push({ t: '🎁 Подарить', fn: () => G.giftMenu(id) });
      if (n.reliab || ['kolyan', 'vityok', 'semyonych', 'seryoga', 'palych'].indexOf(id) >= 0) o.push({ t: '💸 Деньги в долг', fn: () => G.lendMenu(id) });
      if (G.debtOpts) G.debtOpts(id).forEach(x => o.push(x));
      if (n.romance) o.push({ t: '💘 ' + G.romanceLabel(id), fn: () => G.romanceMove(id) });
      const sp = G.npcSpecial(id); sp.forEach(x => o.push(x));
    } else {
      o.push({ t: '📞 Позвонить', dis: (G.phoneTier && !G.phoneTier()) ? 'Нет телефона' : r.l < 10 && r.stage < 1 ? 'Нет номера' : null, fn: () => G.callNpc(id) });
    }
    o.push({ t: 'Закрыть', fn: () => {} });
    G.modal({ title: n.name, face: id, text: '<b>' + n.role + '</b>, ' + n.age + (n.age ? ' лет' : '') + stageTxt + '<br>' + (G.relBig ? G.relBig(id) : 'Отношение: <b>' + Math.round(r.l) + '</b>') + (r.owed ? '<br>Тебе должен: ' + G.rub(r.owed) : '') + (s.flags['debt_' + id] ? '<br>Ты должен: ' + G.rub(s.flags['debt_' + id]) : ''), opts: o });
  };
  G.callNpc = function (id) {
    const s = G.s, n = D.NPC[id], r = G.R(id);
    G.toast('Звонишь: ' + n.name + '…');
    const o = [];
    o.push({ t: 'Просто поболтать', fn: () => { const d = r.l >= 20 ? 4 : 1; G.relAdd(id, d); G.fx({ mood: n.romance && r.stage >= 3 ? 6 : 2 }); G.toast('Поболтали. Приятно.'); G.spend(1); } });
    if (n.romance && r.stage >= 3 && G.isFree()) o.push({ t: 'Позвать на свидание', fn: () => G.dateMenu(id) });
    if (id === 'kolyan' && G.isFree()) o.push({ t: 'Встретиться и выпить', fn: () => { G.fx({ drunk: 22, mood: 8, craving: -20, money: -300, rel: { kolyan: 5 } }); G.toast('Посидели с Коляном. Вечер удался.'); G.spend(3); } });
    o.push({ t: 'Положить трубку', fn: () => {} });
    G.modal({ title: '📞 ' + n.name, face: id, text: 'Идут гудки…', opts: o });
  };

  // Особые действия по персонажам
  G.npcSpecial = function (id) {
    const s = G.s, o = [], c = s.car;
    if (id === 'lyosha') o.push({ t: '🥃 Подмазать (бутылка/сигареты)', dis: !(G.has('vodka') || G.has('cigs')) ? 'Нужна бутылка или сигареты' : null, fn: () => { G.give(G.has('vodka') ? 'vodka' : 'cigs', -1); G.relAdd('lyosha', 15); G.toast('Дядя Лёша подмигнул. Проверка тебя обойдёт (почти).'); G.spend(1); } });
    if (id === 'semyonych') {
      if (!c.union && c.rank > 0) o.push({ t: '📋 Вступить в профсоюз', fn: () => K.unionOffer() });
      if (c.union) o.push({ t: '📢 Пожаловаться на задержку зарплаты', fn: () => { G.fx({ mood: 3, boss: -1 }); G.toast('Семёныч: «Нужно подождать». Ты подождал. Что-то сдвинулось.'); G.spend(1); } });
    }
    if (id === 'rafik') o.push({ t: '🚗 Спросить расписание директора', dis: !s.flags.rafikTip ? 'Сначала угости сигаретой' : null, fn: () => { s.world.binocSafe = G.week(); G.toast('Рафик: «На этой неделе — бинокль только по пятницам». Полезно.'); G.spend(1); } });
    if (id === 'khomyak') o.push({ t: '💰 Продать краденое', dis: !(s.flags.loot && s.flags.loot.length) ? 'Нечего продавать' : null, fn: () => { let v = 0; s.flags.loot.forEach(x => v += x.v); G.addMoney(Math.round(v * 0.6)); G.toast('Хомяк забрал товар и выдал ' + G.rub(v * 0.6) + '.'); s.flags.loot = []; G.fx({ cons: -2 }); G.spend(1); } });
    if (id === 'alevtina') {
      o.push({ t: '🩺 Лечиться (здоровье +8)', fn: () => { G.fx({ health: 8, tox: -4, mood: 2 }); G.toast('Алевтина послушала, смазала зелёнкой, дала таблетку.'); G.spend(1); } });
      o.push({ t: '📄 Купить больничный (2 000 ₽)', dis: s.money < 2000 ? 'Нет денег' : null, fn: () => G.buySick() });
    }
    if (id === 'tatishcheva') {
      o.push({ t: '📑 Аттестация (подать заявление)', dis: c.rank === 0 ? 'Сначала испытательный срок' : null, fn: () => K.applyAttest() });
      o.push({ t: '🔄 Сменить профессию', dis: c.rank < 1 ? 'Нельзя на стажировке' : c.rank >= 6 ? 'Для управленцев закрыто' : null, fn: () => G.transferMenu() });
    }
    if (id === 'pelageya') o.push({ t: '📝 Пройти инструктаж', fn: () => G.instructMenu() });
    if (id === 'nadezhda') o.push({ t: '📝 Целевой инструктаж', dis: s.instr.perv == null ? 'Нужен первичный' : null, fn: () => { K.testInstr('celev', 'nadezhda'); } });
    if (id === 'eblanov') o.push({ t: '🧰 Попросить новый чертёж', fn: () => { if (s.flags.eblBinge && s.t.day <= (s.flags.eblBingeUntil || 0)) { G.toast('Ебланов в запое — чертежа не будет.', 'bad'); } else { s.dwg.bad = G.chance(40); s.dwg.none = false; G.toast('Он ищет по ящикам и приносит новый чертёж. Пахнет вчерашним.'); } G.spend(1); } });
    if (id === 'ekaterina') {
      o.push({ t: '🔩 Принести идеальную деталь', dis: G.quality() < 85 ? 'Качество ниже 85%' : null, fn: () => { G.relAdd('ekaterina', 4); s.flags.ekPerfect = (s.flags.ekPerfect || 0) + 1; G.toast('Екатерина Евгеньевна измерила, кивнула. +4 к отношению.'); G.spend(1); } });
      o.push({ t: '🆘 Помочь с авралом ОТК', fn: () => { G.relAdd('ekaterina', 6); s.flags.ekHelp = (s.flags.ekHelp || 0) + 1; G.fx({ energy: -10, mood: -2 }); G.toast('Ты отсортировал детали до вечера. Она заметила.'); G.spend(1); } });
    }
    if (id === 'shurygina') o.push({ t: '🧾 Расчётный лист / перерасчёт', fn: () => G.accountantMenu() });
    if (id === 'soplezhuykin') o.push({ t: '🎩 Зайти в кабинет', fn: () => G.soplMenu() });
    if (id === 'truhanov') {
      o.push({ t: '📅 Записаться на приём', dis: c.rank === 0 ? 'Стажёрам нельзя' : c.appointment ? 'Запись уже есть' : null, fn: () => { c.appointment = s.t.day + G.ri(3, 6); G.toast('Аллочка записала тебя на ' + G.dateStrOf(c.appointment) + '.'); G.spend(1); } });
    }
    if (id === 'palych') o.push({ t: '🎣 Договориться на рыбалку', fn: () => { G.fishPlanSet('palych'); G.toast('Палыч: «Давай после смены к пруду. Удочки у меня». Кнопка рыбалки появится после работы.', 'good'); } });
    if (id === 'alla' || id === 'allochka') o.push({ t: '📅 Записаться к директору', dis: c.rank === 0 ? 'Стажёрам нельзя' : c.appointment ? 'Запись уже есть' : null, fn: () => { c.appointment = s.t.day + G.ri(3, 6); G.toast('Аллочка записала тебя на ' + G.dateStrOf(c.appointment) + '.'); G.spend(1); } });
    return o;
  };

  G.buySick = function () {
    const s = G.s;
    if (s.money < 2000) return;
    G.addMoney(-2000); s.car.sickUntil = s.t.day + 3;
    G.toast('Больничный куплен на 3 дня. Деньги — 70% оклада.', 'warn');
    if (G.chance(5)) { G.toast('ФСС проверил больничный: штраф и выговор!', 'bad'); G.fx({ rep: 1, money: -3000 }); }
    if (s.phase === 'morning') { s.phase = 'evening'; s.t.hour = 17; s.day.sick = true; }
    G.afterAction({ h: 0 });
  };

  G.instructMenu = function () {
    const s = G.s;
    const opts = [];
    opts.push({ t: 'Повторный инструктаж' + (s.flags.povtDue ? ' (ПРОСРОЧЕН!)' : ''), dis: s.instr.perv == null ? 'Сначала первичный' : null, fn: () => { K.testInstr('povt', 'pelageya'); } });
    opts.push({ t: 'Внеплановый инструктаж', dis: s.instr.perv == null ? 'Сначала первичный' : null, fn: () => { K.testInstr('vnepl', 'pelageya'); } });
    opts.push({ t: 'Целевой инструктаж (разовая работа)', dis: s.instr.perv == null ? 'Сначала первичный' : null, fn: () => { K.testInstr('celev', 'pelageya'); } });
    opts.push({ t: 'Не сейчас', fn: () => {} });
    G.modal({ title: 'Журнал инструктажей', face: 'pelageya', text: 'Вводный: ' + (s.instr.vvod != null ? '✅' : '❌') + ' · Первичный: ' + (s.instr.perv != null ? '✅' : '❌') + ' · Повторный: ' + (s.instr.povt != null ? 'нед.' + s.instr.povt : '—') + '<br>Подпись пьяному не поставят.', opts });
  };

  G.transferMenu = function () {
    const s = G.s;
    const ids = D.JOB_ORDER.filter(id => id !== s.car.job);
    const opts = ids.map(id => { const why = K.jobStatus(id); return { t: D.JOBS[id].name, dis: why, fn: () => { G.modal({ title: 'Переквалификация', face: 'tatishcheva', text: 'Ты перейдёшь на «' + D.JOBS[id].name + '». Сохранится 50% стажа и знаний, ставка = Р1 × 0.9 на 2 недели. Первичный инструктаж — заново.', opts: [{ t: 'Перейти', fn: () => { s.car.job = id; s.car.rank = 1; s.car.shifts = Math.floor(s.car.shifts * 0.5); s.st.know = Math.round(s.st.know * 0.5); s.st.bm = Math.floor(s.st.bm * 0.5); s.instr.perv = null; s.flags.firstDay = 0; s.flags.xferUntil = s.car.shifts + 10; G.toast('Новая профессия: ' + D.JOBS[id].name, 'good'); G.spend(1); } }, { t: 'Отмена', fn: () => {} }] }); } }; });
    opts.push({ t: 'Закрыть', fn: () => {} });
    G.modal({ title: 'Смена профессии', face: 'tatishcheva', text: 'Недостающие корочки покупаются в разделе «Учёба» (вечером дома).', opts, wide: true });
  };

  // ---------- Главбух
  G.accountantMenu = function () {
    const s = G.s, p = s.pay;
    const o = [];
    o.push({ t: 'Проверить, сколько заплатили', fn: () => { G.modal({ title: 'Расчётный лист', face: 'shurygina', text: 'Начислено в текущем месяце: <b>' + G.rub(p.acc) + '</b><br>Аванс получен: ' + G.rub(p.adv) + '<br>Штрафы: ' + G.rub(p.pen) + '<br>' + (s.flags.accError ? '<b>Последняя выплата с ошибкой: ' + (s.flags.accError < 0 ? 'недоплата ' : 'переплата ') + G.rub(Math.abs(s.flags.accError)) + '</b>' : 'Ошибок в прошлой выплате не обнаружено.'), opts: [{ t: 'Ок', fn: () => G.spend(1) }] }); } });
    o.push({ t: 'Попросить перерасчёт', dis: !(s.flags.accError < 0) ? 'Недоплаты нет' : null, fn: () => {
      G.modal({ title: 'Скандал в бухгалтерии', face: 'shurygina', text: 'Шурыгина орёт: «Какой перерасчёт?! Я тут сорок лет! Деточка!..»', opts: [
        { t: 'Терпеть и кивать', fn: () => G.recalc(60) }, { t: 'Лесть: «Вы так считаете, как никто!»', fn: () => G.recalc(80) }, { t: 'Орать в ответ', fn: () => G.recalc(35) }
      ] });
    } });
    const r = G.R('shurygina');
    o.push({ t: '🍵 Чай с главбухом (отношения)', fn: () => { G.relAdd('shurygina', 6); G.fx({ mood: -2, satiety: 4 }); G.toast('Шурыгина налила чай и рассказала про 1987 год.'); G.spend(1); } });
    if (r.l >= 30) o.push({ t: '💞 «Замутить» с главбухом…', fn: () => G.shurRomance() });
    o.push({ t: 'Уйти', fn: () => {} });
    G.modal({ title: 'Бухгалтерия', face: 'shurygina', text: 'Шурыгина Валентина Матвеевна ловко щёлкает костяшками.', opts: o });
  };
  G.recalc = function (p) {
    const s = G.s;
    G.fx({ mood: -G.ri(10, 20) });
    if (G.chance(p)) { const add = Math.abs(s.flags.accError); G.addMoney(add); s.flags.accError = 0; G.toast('Перерасчёт сделан: +' + G.rub(add), 'good'); G.relAdd('shurygina', -2); }
    else { G.toast('Перерасчёта не будет. «Иди уже!»', 'bad'); G.relAdd('shurygina', -4); }
    G.spend(1);
  };
  G.shurRomance = function () {
    const s = G.s, r = G.R('shurygina');
    const st = r.stage;
    const steps = ['Чай', 'Конфеты', 'Прогулка', 'Близость (затемнение)'];
    if (st >= 4) { G.info('Бухгалтерия', 'Зарплата теперь считается без ошибок. И смеётся над тобой весь завод.'); return; }
    G.modal({ title: 'Главбух: ' + steps[st], face: 'shurygina', text: 'Шаг ' + (st + 1) + ' из 4. <i>Лучше держаться подальше…</i>', opts: [{ t: 'Продолжить', fn: () => {
      r.stage++; G.relAdd('shurygina', 8); G.fx({ cons: -3, mood: -3 });
      if (r.stage >= 4) {
        s.flags.shurFriend = 1; G.fx({ coll: -25, mood: -10 }); G.addNick('zyat'); G.achieve('shur', 'Зять главбуха');
        s.flags.gonoDay = s.t.day + G.ri(3, 10);
        G.toast('Прошёл час… «Через час…» Весь завод узнал за обед.', 'bad');
      }
      G.spend(2);
    } }, { t: 'Передумал', fn: () => {} }] });
  };
  // Соплежуйкин
  G.soplMenu = function () {
    const s = G.s;
    const o = [
      { t: 'Похвалить его (подхалимаж)', fn: () => { G.fx({ boss: 4, coll: -3, cons: -3, rel: { soplezhuykin: G.ri(5, 10) } }); G.toast('Он расцвёл. «Вы далеко пойдёте».'); s.car.sop++; G.spend(1); } },
      { t: 'Настучать на коллегу', fn: () => { G.fx({ boss: 5, coll: -8, cons: -10, snitch: 1, rel: { soplezhuykin: 10 } }); G.toast('Он записал. «Ценю сознательность».'); if (G.chance(35)) G.addNick('stukach'); G.spend(1); } },
      { t: 'Принести подарок', fn: () => { G.giftMenu('soplezhuykin'); } },
      { t: 'Попросить помощи по работе', fn: () => { G.toast('Соплежуйкин «ничего не знает» и перекинул на других.'); G.relAdd('soplezhuykin', -2); G.spend(1); } },
      { t: 'Подать идею', fn: () => { G.toast('Он присвоил идею и пошёл хвастаться директору. Ты — «рационализатор».'); G.fx({ boss: 1, mood: -3, know: 1 }); G.spend(1); } },
      { t: 'Выйти', fn: () => {} }
    ];
    G.modal({ title: 'Кабинет Соплежуйкина', face: 'soplezhuykin', text: 'Аллочка кивнула: «Сейчас примет». Он разглядывает тебя поверх папки.', opts: o });
  };

  // Директор на приёме
  G.directorTalk = function () {
    const s = G.s, c = s.car;
    c.appointment = null;
    const rel = G.rl('truhanov');
    const o = [
      { t: '1. Настучать на коллегу', fn: () => { G.fx({ boss: 6, coll: -15, cons: -10, snitch: 1, flag: { promised: 1 } }); G.toast('Труханов: «Быстрая карьера тебе обеспечена!» (враньё).'); } },
      { t: '2. Предложить полезное внедрение', fn: () => { G.fx({ mood: -10, boss: -5 }); G.note('Умник'); G.toast('Он обложил тебя матом и выгнал.'); } },
      { t: '3. Указать на недостатки в работе', fn: () => { G.fx({ boss: -10 }); G.toast('«Тебе что, работа не нравится? Уходи!»', 'bad'); if (G.chance(G.fireRisk() / 2)) G.end('fired'); } },
      { t: '4. Дать взятку', fn: () => G.giftMenu('truhanov') },
      { t: '5. Послать его на хер', fn: () => { G.end(G.s.st.cool >= 60 && G.s.st.coll >= 50 ? 'quit_legend' : 'fired'); } },
      { t: '6. Наябедничать на главбуха', fn: () => { G.fx({ mood: 3 }); G.relAdd('shurygina', -8); G.toast('Он рассказал анекдот и сказал: «Гуляй».'); } },
      { t: '7. Попросить прибавку', fn: () => { if (G.chance(25)) { G.toast('«Прибавки не будет, а вот увольнение…»', 'bad'); if (G.chance(25)) G.end('fired'); } else if (G.chance(10 + (s.car.snitch > 2 ? 5 : 0))) { s.pay.acc += 3000; G.toast('Прибавка +3 000 ₽ единовременно!', 'good'); } else G.fx({ boss: -3 }); } },
      { t: '8. Сделать комплимент', fn: () => { G.fx({ boss: 10, coll: -8, cons: -5, rel: { truhanov: 6 } }); G.toast('Он потеплел. «Приятный молодой человек».'); } },
      { t: '9. Предложить выпить', fn: () => { if (rel >= 55 && s.st.boss >= 65 && G.chance(25)) { G.toast('Выпили на брудершафт. Директор подписал бумаги!', 'good'); G.fx({ drunk: 25, boss: 8 }); if (c.rank > 0 && c.rank < 9 && c.shifts >= 0.6 * D.REQ[c.rank + 1].shifts) { K.promote(c.rank + 1); } else { s.pay.acc += 8000; G.toast('Премия 8 000 ₽.'); } } else { G.toast('«Пошёл вон».', 'bad'); G.fx({ boss: -4 }); } } },
      { t: '10. Пожаловаться в трудинспекцию', fn: () => { s.flags.insp = s.t.day + G.ri(14, 21); G.toast('Жалоба подана. Ждать 2–3 недели.'); } },
      { t: 'Выйти (молча)', fn: () => {} }
    ];
    G.modal({ title: 'ПРИЁМ У ДИРЕКТОРА', face: 'truhanov', vib: 'warning', text: 'Труханов смотрит поверх золотых очков: «Ну? Эй, ' + G.pick(D.TRUH_NAMES) + '. Что у тебя?»', opts: o, wide: true });
  };

  // ---------- Романтика
  const T = [0, 12, 28, 42, 56, 70, 84];
  G.romanceLabel = function (id) {
    const r = G.R(id); return ['Познакомиться', 'Проявить симпатию', 'Флиртовать', 'Позвать на свидание', 'Предложить встречаться', 'Остаться вместе', 'Побыть вместе'][Math.min(6, r.stage)];
  };
  G.romReq = function (id) {
    const s = G.s, n = D.NPC[id], r = G.R(id), sp = (n.rom && n.rom.speed) || 1;
    const need = T[Math.min(6, r.stage)] * sp;
    if (id === 'tatishcheva') return r.l >= Math.min(need, 20) ? null : 'Нужно отношение ' + Math.ceil(Math.min(need, 20));
    if (r.l < need) return 'Нужно отношение ≥ ' + Math.ceil(need);
    if (id === 'ekaterina') {
      if (r.stage === 2 && (s.flags.ekPerfect || 0) < 2) return 'Принеси ей 2 идеальные детали';
      if (r.stage === 3 && ((s.flags.ekHelp || 0) < 1 || s.car.snitch > 0)) return 'Помоги с авралом ОТК и не будь стукачом';
      if (r.stage === 4 && ((s.flags.ekRefused || 0) < 2)) { return null; }
      if (r.stage >= 4 && (s.car.snitch > 1 || s.car.frame > 0)) return 'Она слышала про твои делишки';
    }
    return null;
  };
  G.romanceMove = function (id) {
    const s = G.s, n = D.NPC[id], r = G.R(id), st = r.stage;
    const why = G.romReq(id);
    if (why) { G.modal({ title: n.name, face: id, text: '<i>Рано.</i> ' + why, opts: [{ t: 'Понял', fn: () => {} }] }); return; }
    if (st >= 3 && st <= 3 && !G.isFree() && id !== 'tatishcheva') { G.modal({ title: 'Свидание', face: id, text: 'Свидание — только вечером или в выходные.', opts: [{ t: 'Договориться', fn: () => { G.relAdd(id, 1); } }] }); return; }
    const big = s.st.neat >= 60 ? 6 : -6;
    const adv = (txt, extraFx, hours) => {
      // измена
      G.cheatCheck(id);
      r.stage = Math.min(7, st + 1); G.relAdd(id, 5);
      if (r.stage === 4) { s.car.affairs++; if (s.car.affairs >= 7) G.addNick('skandal'); else if (s.car.affairs >= 5) G.addNick('kobelek'); else if (s.car.affairs >= 3) G.addNick('lovelas'); }
      G.fx(extraFx, { npc: id });
      G.toast(txt);
      if (r.stage >= 5 && id === 'tatishcheva' && !s.flags.tatTrap) { s.flags.tatTrap = G.week() + G.ri(3, 8); }
      if (r.stage >= 5 && (id === 'lyudka' || id === 'tatyana') && s.rel.lyudka && s.rel.tatyana && s.rel.lyudka.stage >= 3 && s.rel.tatyana.stage >= 3 && !s.flags.cooks) s.flags.cooks = G.week() + 1;
      G.spend(hours || 1);
    };
    switch (st) {
      case 0: adv('Вы познакомились: ' + n.name + '.', { mood: 3 }); break;
      case 1: G.modal({ title: n.name + ': симпатия', face: id, text: 'Как проявить симпатию?', opts: [
        { t: 'Угостить чаем (бесплатно)', fn: () => adv('Чай и разговор о жизни. ' + n.name + ' потеплел(а).', { mood: 4, energy: -2 }) },
        { t: 'Помочь по работе', fn: () => adv('Ты помог(ла) — это замечено.', { mood: 3, energy: -6, cons: 1 }) },
        { t: 'Подарить шоколадку', dis: !G.has('choco') ? 'Нет шоколадки' : null, fn: () => { G.give('choco', -1); adv('Шоколадка сработала.', { mood: 5, rel: { me: 5 } }); } }] }); break;
      case 2: { const p = C(40 + r.l / 2 + big + G.statusScore() * 2, 20, 90); G.modal({ title: n.name + ': флирт', face: id, text: 'Шанс успеха ~' + Math.round(p) + '%', opts: [{ t: 'Сделать комплимент', fn: () => { if (G.chance(p)) adv('Она улыбнулась. Флирт пошёл.', { mood: 8 }); else { G.relAdd(id, -4); G.fx({ mood: -4 }); G.toast('Комплимент не зашёл.', 'bad'); if (id === 'ekaterina') s.flags.ekRefused = (s.flags.ekRefused || 0); G.spend(1); } } }, { t: 'Отмена', fn: () => {} }] }); break; }
      case 3: G.dateMenu(id); break;
      case 4: { const p = C(35 + r.l / 2, 25, 90); if (id === 'ekaterina' && (s.flags.ekRefused || 0) < 2) { s.flags.ekRefused = (s.flags.ekRefused || 0) + 1; G.fx({ mood: -4 }); G.modal({ title: 'Екатерина Евгеньевна', face: id, text: 'Она отказывается: «У меня нет времени на кафе. Спросите позже».', opts: [{ t: 'Эх', fn: () => G.spend(1) }] }); break; } if (G.chance(p)) adv('Вы теперь вместе. Весь завод об этом узнает.', { mood: 12, health: 3 }, 1); else { G.fx({ mood: -6 }); G.relAdd(id, -5); G.toast('Она взяла паузу.', 'bad'); G.spend(1); } break; }
      case 5: adv('«Через час…» Затемнение. Утро наступило неожиданно.', { mood: 15, health: 4, energy: -6 }, 3); break;
      default: G.fx({ mood: 8, health: 2 }); G.relAdd(id, 3); G.toast('Вы провели время вместе.'); G.cheatCheck(id); G.spend(2);
        if (id === 'tatyana' && r.stage >= 5 && r.l >= 90) { G.modal({ title: 'Татьяна', face: id, text: 'Она тихо говорит: «Давай уедем отсюда. В деревню. Там огород и тишина».', opts: [{ t: 'Уехать с Татьяной', fn: () => G.end('married') }, { t: 'Остаться', fn: () => {} }] }); }
    }
    if (id === 'lidiya' && st >= 3 && s.phase === 'work' && G.chance(20)) { G.toast('Вас «запалили» в кабине крана!', 'bad'); G.addNick('lovelas'); G.punish({ risk: 100, what: 'Роман на рабочем месте', fine: [200, 500], sev: 1 }); }
  };
  G.dateMenu = function (id) {
    const s = G.s, n = D.NPC[id], r = G.R(id);
    if (!G.isFree()) { G.toast('Свидание — вечером или в выходной.', 'warn'); return; }
    G.modal({ title: 'Свидание: ' + n.name, face: id, text: 'Куда пойдём?', opts: [
      { t: 'Прогулка (бесплатно)', fn: () => { G.dateEnd(id, 1, 0, 0.6); } },
      { t: 'Кино «Октябрь-3D» (700 ₽)', dis: s.money < 700 ? 'Нет денег' : null, fn: () => { G.addMoney(-700); G.dateEnd(id, 3, 0, 1); } },
      { t: 'Ресторан «Золотая Заслонка» (2 500 ₽)', dis: s.money < 2500 ? 'Нет денег' : null, fn: () => { G.addMoney(-2500); G.dateEnd(id, 3, 0, 1.6); } },
      { t: 'Отмена', fn: () => {} }
    ] });
  };
  G.dateEnd = function (id, h, cost, q) {
    const s = G.s, r = G.R(id), n = D.NPC[id];
    const p = C(45 + r.l / 2 + q * 15 + (s.st.neat >= 60 ? 5 : -10) + G.statusScore() * 2 - s.st.drunk / 2, 20, 95);
    G.cheatCheck(id);
    if (G.chance(p)) {
      if (r.stage === 3) { r.stage = 4; s.car.affairs++; }
      G.relAdd(id, 8 * q); G.fx({ mood: 10 + q * 4, satiety: 10 }); G.toast('Свидание удалось! ' + n.name + ' улыбается.', 'good');
    } else { G.relAdd(id, -3); G.fx({ mood: -3 }); G.toast('Свидание вышло неловким.', 'warn'); }
    G.spend(h);
  };
  G.cheatCheck = function (id) {
    const s = G.s; if (!D.NPC[id].romance) return;
    Object.keys(s.rel).forEach(o => {
      if (o === id || !D.NPC[o] || !D.NPC[o].romance) return;
      const ro = s.rel[o];
      if (ro.stage >= 4 && s.rel[id].stage >= 3 && G.chance(18) && !s.flags['cheat_' + o]) {
        s.flags['cheat_' + o] = 1; ro.l -= 25; G.fx({ mood: -8 });
        if (o === 'nadezhda') { G.toast('Надежда Николаевна узнала. Внеочередной аудит!', 'bad'); s.pay.pen += G.monthlyPay() * 0.1; G.note('Измена Надежде', true); }
        else if (o === 'ekaterina') { G.toast('Екатерина узнала: «брак — 100%» в ближайший месяц.', 'bad'); s.flags.ekBrak = G.week() + 4; }
        else G.toast(D.NPC[o].name + ' узнала про измену. Скандал!', 'bad');
      }
    });
  };

  // ---------- Телефон
  G.phoneMenu = function () {
    const s = G.s;
    if (G.weekday() === 2 && s.phase === 'work' && s.day.inspect === false && Math.floor(s.t.hour) >= 10) { G.toast('В среду с телефоном — опасно.', 'warn'); }
    const work = s.phase === 'work' || s.phase === 'lunch';
    const o = [
      { t: '📲 «Контактик»', fn: () => { const a = { risk: work ? 12 : 0 }; G.fx({ mood: G.ri(4, 8) }); G.toast('Листаешь ленту. Мир ещё хуже, чем завод.'); if (work) { s.day.breaks++; G.caught({ risk: 12, fine: [100, 250], what: 'Телефон на рабочем месте' }); } G.spend(1); } },
      { t: '▶️ «Ютабчик»', fn: () => { G.fx({ mood: G.ri(5, 9) }); G.toast('Видео про кота. Кот лучше начальника.'); if (work) { s.day.breaks++; G.caught({ risk: 15, fine: [100, 250], what: 'Видео на рабочем месте' }); } G.spend(1); } },
      { t: '📞 Позвонить знакомым', fn: () => G.callRandom() },
      { t: '🤡 Пранк-звонок на неизвестный номер', fn: () => { G.fx({ mood: G.ri(15, 20) }); s.flags.prank = (s.flags.prank || 0) + 1; G.toast('Ты звонишь незнакомцу и пищишь «Алло, это прачечная?». Жизнь прекрасна.'); if (G.chance(Math.min(15, 3 * s.flags.prank))) { G.toast('Хулиган из соседнего подъезда вычислил тебя и дал в глаз.', 'bad'); G.fx({ health: -8, mood: -10, fights: 1 }); } G.spend(1); } },
      { t: '🏦 Банк', fn: () => G.bankMenu() },
      { t: '🛍 Магазин онлайн (подарки/еда)', fn: () => { G.shopMenu(); } },
      { t: '🎥 Блог «ЧугунTV»', fn: () => G.blogMenu() },
      { t: 'Закрыть', fn: () => {} }
    ];
    G.modal({ title: '📱 Телефон', text: 'Заряд 80%. Деньги: ' + G.rub(s.money) + ' · Долг: ' + G.rub(s.debt), opts: o, wide: true });
  };
  G.callRandom = function () {
    const s = G.s;
    const who = G.pick([['мама', { mood: -6 }, 'Мама спрашивает, почему ты так худой. И почему не звонишь. И когда внуки.'], ['мама', { mood: 4 }, 'Мама прислала фото кота. Теплее.'], ['kolyan', { mood: 6 }, 'Колян ржёт в трубку и зовёт «на стаканчик».'], ['seryoga', { mood: 3 }, 'Серёга сплетничает о начальстве.'], ['коллега', { mood: 2 }, 'Коллега ругает завод. Хорошо.'], ['tatyana', { mood: 5, rel: { tatyana: 3 } }, 'Татьяна смущённо поздоровалась.']]);
    G.fx(who[1]); G.toast('📞 ' + who[2]); G.spend(1);
  };

  // ---------- Блог (разд. 17.9)
  G.blogMenu = function () {
    const s = G.s, b = s.blog;
    if (!s.own.laptop && !s.own.phone1 && !s.own.phone2 && !s.own.phone3) { G.info('Блог', 'Нужен хотя бы смартфон. Купи в ТЦ.'); return; }
    G.modal({ title: '🎥 «ЧугунTV»', text: 'Подписчики: <b>' + b.subs + '</b> · Сырых кадров: ' + (b.footage || 0) + ' · ' + (b.anon ? 'анонимно (без лица)' : 'с лицом'), opts: [
      { t: 'Снять видео на заводе (скрытно)', dis: !(s.phase === 'work' || s.phase === 'lunch') ? 'Только на заводе' : null, fn: () => { b.on = true; b.footage = (b.footage || 0) + 1; G.toast('Снял кусок. Дым, цех и ржавая вывеска «АО».'); G.fx({ mood: 2 }); s.day.risky = 'Съёмка'; G.caught({ risk: 14, fine: [200, 500], sev: 1, what: 'Съёмка на территории' }); G.spend(1); } },
      { t: 'Смонтировать и выложить (2 ч)', dis: !G.isFree() ? 'Только вечером' : !(b.footage > 0) ? 'Нет кадров' : null, fn: () => { const gain = Math.round(b.footage * G.ri(8, 60) * (1 + b.subs / 1500)); b.subs += gain; b.footage = 0; G.toast('Выложил видео: +' + gain + ' подписчиков.', 'good'); if (b.subs >= 100 && !s.flags.blog100) { s.flags.blog100 = 1; G.fx({ coll: -5 }); G.addNick('blogeryuga'); } G.fx({ mood: 4, energy: -6 }); G.spend(2); } },
      { t: b.anon ? 'Показать лицо в кадре (больше подписчиков, больше риска)' : 'Снова скрыть лицо', fn: () => { b.anon = !b.anon; G.toast(b.anon ? 'Лицо спрятано.' : 'Лицо в кадре. Подписчиков будет больше.'); } },
      { t: 'Закрыть', fn: () => {} }
    ] });
  };

  // ---------- Допы к тикам (расширения engine)
  G.extraWeekly = function () {
    const s = G.s, b = s.blog;
    // блог: доход и раскрытие
    if (b.on && b.subs >= 100) { const inc = b.subs >= 10000 ? G.ri(5000, 10000) : b.subs >= 1000 ? G.ri(300, 1300) : G.ri(50, 250); G.addMoney(inc); G.toast('Блог принёс ' + G.rub(inc) + ' за неделю.'); }
    if (b.on && !b.revealed && s.car.shifts > 120) {
      const p = b.anon ? 0.7 : 3;
      if (G.chance(p * (1 + b.subs / 5000))) { b.revealed = true; G.modal({ title: '📹 БЛОГ РАСКРЫТ', vib: 'error', face: 'truhanov', text: 'Труханов нашёл твой «ЧугунTV»: «Это ты?! Про МОЙ завод?!» У тебя на руках ' + b.subs + ' подписчиков.', opts: [{ t: 'Уйти в блог', fn: () => { if (b.subs >= 1000) G.end('blogger'); else G.end('fired'); } }, { t: 'Всё отрицать', fn: () => { if (G.chance(35)) G.toast('Не признался. Но запись в блокноте.', 'warn'); else G.end('fired'); G.note('Блог', true); } }] }); }
    }
    // ипотека → потеря
    if (s.flags.bailiff && G.week() < s.flags.bailiff) G.toast('Приставы удерживают часть зарплаты.', 'bad');
    // профсоюзные путёвки
    if (s.car.union && G.week() % 8 === 0) { s.flags.voucher = 1; G.toast('Профсоюз предлагает путёвку (дешёвый отпуск).', 'good'); }
    // Татищева — ловушка
    if (s.flags.tatTrap && G.week() >= s.flags.tatTrap) { s.flags.tatTrap = 0; G.modal({ title: 'ПРИКАЗ №666', vib: 'error', face: 'tatishcheva', bg: 'checkpoint', text: 'Татищева опускает глаза: «Прости. Приказ директора. Без объяснения причин». Ты был слишком близок к ней.', opts: [{ t: 'Взять расчёт', fn: () => G.end('fired') }] }); return; }
    // Людка / Татьяна
    if (s.flags.cooks && G.week() >= s.flags.cooks && !s.flags.cooksDone) { s.flags.cooksDone = 1; G.cooksFight(); }
    // Бухгалтерия: гонорея
    if (s.flags.gonoDay && s.t.day >= s.flags.gonoDay) { s.flags.gonoDay = 0; G.modal({ title: 'Медпункт', face: 'alevtina', text: 'Алевтина качает головой: «Милый, это заразное. И лечится платно». Лечение 7 000–15 000 ₽, здоровье −20, слух по заводу.', opts: [{ t: 'Лечиться', fn: () => { G.fx({ money: -G.ri(7000, 15000), health: -20, mood: -10, coll: -6 }); } }] }); }
    // блокнот
    if (s.flags.insp && s.t.day >= s.flags.insp) { s.flags.insp = 0; G.modal({ title: 'Ответ трудинспекции', text: '«Нарушений не выявлено». Тебя вызвали на ковёр.', face: 'truhanov', opts: [{ t: 'Выслушать', fn: () => { if (G.chance(70)) { s.car.rank = Math.max(1, s.car.rank - 1); G.toast('Понижен в должности.', 'bad'); } else { G.end('fired'); } } }] }); }
    // выход на пенсию: Ебланов в запое
    if (s.flags.eblBingeStart) {}
    // слухи
    if (G.chance(20)) s.flags.rumor = 1;
    // возврат долгов
    if (G.owedWeekly) G.owedWeekly(); else Object.keys(s.rel).forEach(id => { const r = s.rel[id]; if (r.owed > 0 && G.chance(25)) { const n = D.NPC[id]; if (G.chance(n && n.reliab || 50)) { G.addMoney(r.owed); G.toast(n.name + ' вернул(а) долг: ' + G.rub(r.owed), 'good'); G.relAdd(id, 2); } else { G.toast(n.name + ' «забыл(а)» про долг ' + G.rub(r.owed), 'warn'); G.relAdd(id, -2); } r.owed = 0; } });
  };
  G.cooksFight = function () {
    const s = G.s;
    G.modal({ title: '🍲 Людка узнала!', face: 'lyudka', vib: 'error', text: 'Людка узнала про Татьяну. На раздаче — тишина. В твоей тарелке — «борщ с сюрпризом».', opts: [
      { t: 'Съесть и извиниться', fn: () => { G.fx({ health: -30, mood: -10 }); if (G.chance(5)) G.end('poisoned'); else { s.car.sickUntil = s.t.day + 2; G.toast('2 дня в больнице. Людка скандалит.', 'bad'); } } },
      { t: 'Подарить цветы и поговорить', dis: !G.has('flowers') ? 'Нет цветов' : null, fn: () => { G.give('flowers', -1); G.relAdd('lyudka', 15); G.toast('Людка оттаяла. Пока.', 'good'); } },
      { t: 'Отказаться от обеда', fn: () => { G.fx({ mood: -5, coll: -3 }); G.relAdd('lyudka', -10); G.toast('Теперь тебя кормят одним гороховым супом.', 'bad'); } }
    ] });
  };
  G.extraDaily = function () {
    const s = G.s;
    // директор: приём
    // больничный
    if (s.flags.bailiff && G.week() >= s.flags.bailiff) s.flags.bailiff = 0;
  };
})();
