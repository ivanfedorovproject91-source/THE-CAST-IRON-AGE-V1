/* ===== Этап 4, блок 3: социальные связи, которые живут и без твоего участия =====
   Уже было: друзья («Свои люди»), романтика, подарки, просьбы о помощи.
   Не хватало: дружба ничего от тебя не требовала и ничем не грозила. Добавлено:
     • друзья остывают, если с ними долго не общаться (дружба не рвётся, но просить о помощи станет нельзя);
     • друзья сами просят помощи — ответ отзывается через дни (вернули долг, замолвили слово, обиделись);
     • день рождения коллеги: подарок или забывчивость, и люди это помнят;
     • соперник по разряду: помочь, соревноваться честно или подставить (последствия через очередь событий).
   Старые сохранения: ничего не списывается и не рвётся, друзья остаются друзьями. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.D, C = G.clamp;
  const rub = n => G.rub(Math.round(n));
  const first = id => ((D.NPC[id] && D.NPC[id].name) || id).split(' ')[0];
  const nm = id => (D.NPC[id] && D.NPC[id].name) || id;
  const L = (G.LATER = G.LATER || {});
  const E = (id, o) => { o.id = id; G.EV.push(o); return o; };
  const info = (title, text, cls) => G.modal({ title, text, cls, opts: [{ t: 'Понятно', fn: () => {} }] });

  // ---------- Дружба остывает без общения
  const COOL_AFTER = 5, COOL_STEP = 3, COOL_FLOOR = 45;   // недель без контакта; на сколько падает отношение за неделю; ниже не падает
  G.friendCooling = function () {
    const s = G.s, f = s.flags; if (!f.friends || !f.friends.length) return;
    const wk = G.week(); f.cooled = f.cooled || {};
    f.friends.forEach(id => {
      if (!D.NPC[id]) return;
      const r = G.R(id), idle = wk - (r.last == null ? wk : r.last);
      if (idle >= COOL_AFTER && r.l > COOL_FLOOR) {
        r.l = Math.max(COOL_FLOOR, r.l - COOL_STEP);
        if (!f.cooled[id]) { f.cooled[id] = 1; G.toast('💤 ' + nm(id) + ': «Давно не виделись… Ты про нас совсем забыл».', 'warn'); }
      } else if (idle < COOL_AFTER && f.cooled[id]) delete f.cooled[id];
    });
  };
  const _wt = G.weeklyTick;
  G.weeklyTick = function () { const r = _wt.apply(this, arguments); try { G.friendCooling(); } catch (e) { if (window.console) console.error(e); } return r; };

  // ---------- Последствия
  L.friend_repay = d => {
    if (G.chance(85)) { G.addMoney(d.amt); G.relAdd(d.id, 4); G.fx({ mood: 3 }); G.toast(first(d.id) + ' вернул(а) ' + rub(d.amt) + ': «Спасибо, выручил(а)!»', 'good'); }
    else { G.relAdd(d.id, -2); G.toast(first(d.id) + ' «забыл(а)» про долг. Напоминать неловко.', 'warn'); G.R(d.id).owed = d.amt; }
  };
  L.friend_favor = d => { G.fx({ boss: 2, coll: 2 }); G.relAdd(d.id, 2); G.toast(first(d.id) + ' замолвил(а) за тебя слово перед мастером.', 'good'); };
  L.friend_cold = d => { if (G.chance(40)) { G.relAdd(d.id, -3); G.toast(first(d.id) + ' при встрече отводит глаза: «Помнишь, когда мне было туго?..»', 'bad'); } };
  L.birthday_remembered = d => { if (G.chance(40)) { G.relAdd(d.id, -2); G.fx({ coll: -1 }); G.toast(first(d.id) + ': «Все поздравили, а ты — нет. Запомню».', 'bad'); } };
  L.birthday_thanks = d => { if (G.chance(40)) { G.relAdd(d.id, 3); G.fx({ mood: 3 }); G.toast(first(d.id) + ' до сих пор вспоминает твой подарок. Это приятно.', 'good'); } };
  L.rival_ally = d => { G.relAdd('kulezhov', 4); G.fx({ coll: 3, cons: 2, mood: 4 }); info('🤝 Соперник оценил', 'Кулежов сдал экзамен и при всех сказал: «Без него бы не вытянул». В цехе твой авторитет растёт.', 'good'); };
  L.rival_exposed = d => {
    if (G.chance(50)) { G.fx({ boss: -4, coll: -5, cons: -3 }); G.note('Подлог в журнале допусков', true); info('📓 Подлог раскрыт', 'Исправления в журнале допусков заметил мастер. Все знают, чья это работа.', 'bad'); G.punish({ risk: 100, what: 'Подлог в журнале допусков', fine: [300, 900], sev: 1 }); }
    else G.toast('Подмена в журнале допусков осталась незамеченной. Пока.', 'warn');
  };

  // ---------- События
  const presentFriends = s => (s.flags.friends || []).filter(id => D.NPC[id]);

  E('friend_in_need', { where: ['evening'], w: 1.8, cd: 12, cond: s => presentFriends(s).length >= 1 && s.car.shifts >= 10, fn: s => {
    const id = G.pick(presentFriends(s));
    G.modal({ title: '📞 ' + first(id) + ' просит помощи', face: id, text: '«Выручай, ' + (s.name || 'друг') + '. Прижало: нужно или три тысячи до получки, или чтобы ты помог разобраться с проблемой на работе. Я бы не просил».', opts: [
      { t: 'Одолжить 3 000 ₽', dis: s.money < 3000 ? 'Нет денег' : null, fn: () => { G.addMoney(-3000); G.relAdd(id, 8); G.fx({ coll: 1 }); G.later('friend_repay', G.ri(10, 20), { id, amt: 3000 }); } },
      { t: 'Помочь делом (2 часа)', fn: () => { G.relAdd(id, 6); G.R(id).help = (G.R(id).help || 0) + 1; G.fx({ energy: -6, coll: 2 }); G.later('friend_favor', G.ri(7, 14), { id }); G.spend(2); } },
      { t: 'Отказать', fn: () => { G.relAdd(id, -6); G.fx({ mood: -2 }); G.later('friend_cold', 5, { id }); } }
    ] });
  } });

  E('birthday', { where: ['evening'], w: 1.3, cd: 20, cond: s => s.car.shifts >= 15 && Object.keys(s.rel || {}).some(k => D.NPC[k] && s.rel[k].met && s.rel[k].l >= 25 && D.NPC[k].role && !/^(chugunok|chugun|belka)$/.test(k)), fn: s => {
    const cands = Object.keys(s.rel).filter(k => D.NPC[k] && s.rel[k].met && s.rel[k].l >= 25 && !/^(chugunok|chugun|belka)$/.test(k));
    if (!cands.length) return;
    const id = G.pick(cands);
    G.modal({ title: '🎂 День рождения: ' + first(id), face: id, text: 'Сегодня день рождения у ' + nm(id) + ' (' + D.NPC[id].role + '). В цехе скидываются на подарок.', opts: [
      { t: 'Скинуться: 700 ₽', dis: s.money < 700 ? 'Нет денег' : null, fn: () => { G.addMoney(-700); G.relAdd(id, 5); G.fx({ coll: 1, mood: 3 }); G.later('birthday_thanks', G.ri(5, 12), { id }); } },
      { t: 'Просто поздравить', fn: () => { G.relAdd(id, 2); } },
      { t: 'Сделать вид, что забыл', fn: () => { G.relAdd(id, -3); G.later('birthday_remembered', G.ri(3, 7), { id }); } }
    ] });
  } });

  E('rival_promotion', { where: ['work'], w: 1.2, cd: 40, cond: s => s.car.rank >= 1 && s.car.rank <= 5 && s.car.shifts >= 20 && !!D.NPC.kulezhov, fn: s => G.modal({ title: '🥇 Соперник', face: 'kulezhov', text: 'Кулежов тоже готовится сдавать на следующий разряд. Вы идёте ноздря в ноздрю, а место на повышение одно.', opts: [
    { t: 'Помочь ему подготовиться (1 час)', fn: () => { G.relAdd('kulezhov', 6); G.fx({ coll: 3, energy: -3, know: 1 }); G.later('rival_ally', G.ri(8, 14), {}); G.spend(1); } },
    { t: 'Соревноваться честно: учиться самому (1 час)', fn: () => { G.fx({ know: 5, energy: -4 }); G.spend(1); } },
    { t: 'Подправить его запись в журнале допусков', fn: () => { G.relAdd('kulezhov', -10); G.fx({ cons: -6, boss: 1 }); G.later('rival_exposed', G.ri(5, 12), {}); } }
  ] }) });
})();
