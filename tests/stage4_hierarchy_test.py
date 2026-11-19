#!/usr/bin/env python3
"""Этап 4, блок 5: иерархия. Запуск: python3 tests/stage4_hierarchy_test.py"""
import http.server, os, socketserver, threading
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fails = []
def check(n, ok, info=''):
    print(('PASS ' if ok else 'FAIL ') + n + ('' if ok else '  → ' + str(info)))
    if not ok: fails.append(n)
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), Q)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]
def base(rank):
    return ("G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.car.job = 'tokar'; s.car.rank = %d; s.car.shifts = 200; s.money = 200000; s.phase = 'work'; s.loc = 'shop'; s.t.hour = 9; s.st.boss = 20; "
            "G.mq.length = 0; G.cur = null; G.busy = false; G.busy = false; const ids = ['seryoga','palych','vityok','kulezhov','stepanych','shchiplen','rassvetov','soplezhuykin','truhanov','ekaterina','mikhalych']; ids.forEach(k => { const r = G.R(k); r.met = 1; r.l = 40; r.last = G.week(); });" % rank)
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox']); p = b.new_context().new_page()
    p.on('pageerror', lambda e: fails.append('pageerror: ' + str(e)))
    p.route('**/telegram.org/**', lambda r: r.abort()); p.route('**/fonts.g*/**', lambda r: r.abort())
    p.goto(URL); p.wait_for_timeout(800)

    # 1. кто выше игрока
    r = p.evaluate("() => {" + base(7) + "return ['stepanych','dudukin','kulezhov','shchiplen','rassvetov','soplezhuykin','truhanov'].map(i => G.aboveMe(i) ? 1 : 0); }")
    check('ранг 7: выше только руководство цеха и выше (мастера — не выше)', r == [0, 0, 1, 1, 1, 1, 1], r)
    r = p.evaluate("() => {" + base(9) + "return ['shchiplen','kulezhov','rassvetov','soplezhuykin','truhanov'].map(i => G.aboveMe(i) ? 1 : 0); }")
    check('ранг 9: выше только главный инженер, замгенерального, генеральный', r == [0, 0, 1, 1, 1], r)
    r = p.evaluate("() => {" + base(10) + "return { sop: G.aboveMe('soplezhuykin'), tr: G.aboveMe('truhanov'), isB: G.isBoss('truhanov'), isBs: G.isBoss('shchiplen') }; }")
    check('ранг 10: над игроком только Труханов', not r['sop'] and r['tr'] and r['isB'] and not r['isBs'], r)
    r = p.evaluate("() => {" + base(10) + "G.ceo.appoint('normal'); G.mq.length = 0; G.cur = null; G.busy = false; return { a: ['truhanov','soplezhuykin','shchiplen'].map(i => G.aboveMe(i)), sup: G.isSuperior('truhanov'), sup2: G.isSuperior('soplezhuykin') }; }")
    check('директор: никто не «выше» по цеху, с советом — как с начальством', r['a'] == [False, False, False] and r['sup'] and not r['sup2'], r)

    # 2. придирки приходят только от вышестоящих
    for rk, allowed in [(6, ['kulezhov','shchiplen','rassvetov','soplezhuykin','truhanov']), (7, ['kulezhov','shchiplen','rassvetov','soplezhuykin','truhanov']), (8, ['shchiplen','rassvetov','soplezhuykin','truhanov']), (9, ['rassvetov','soplezhuykin','truhanov'])]:
        r = p.evaluate("() => {" + base(rk) + """
          const seen = {}; const oc = G.chance; G.chance = () => true; const om = G.modal; G.modal = m => { if (m && m.face) seen[m.face] = (seen[m.face] || 0) + 1; G.cur = null; };
          for (let i = 0; i < 80; i++) { const v = s.flags.v38 = s.flags.v38 || {}; if (v.neg) { v.neg.day = -1; } if (v.cfDay != null) v.cfDay = -9; s.day.cfToday = 0; s.day.slots = 8; s.phase = 'work'; s.st.boss = 10; s.t.day += 2; G.cur = null; G.busy = false; G.rollEvent(); }
          G.chance = oc; G.modal = om; return seen; }""")
        bad = [k for k in r if k in ('stepanych','dudukin','kulezhov','shchiplen','rassvetov','soplezhuykin','truhanov') and k not in allowed]
        check('ранг %d: придираются только вышестоящие (%s)' % (rk, ','.join(sorted(r.keys()))), not bad, r)
    r = p.evaluate("() => {" + base(10) + "G.ceo.appoint('normal'); G.mq.length = 0; G.cur = null; G.busy = false; s.phase = 'work'; s.loc = 'shop';" + """
      const seen = {}; const oc = G.chance; G.chance = () => true; const om = G.modal; G.modal = m => { if (m && m.title && /Проверка рабочего места|Замечание|Дополнительная проверка|объяснительн|Доверие|Ответственное поручение|Похвала при всех|характеристике|Конфликт/.test(m.title)) seen[m.title] = 1; G.cur = null; };
      for (let i = 0; i < 60; i++) { s.day.slots = 8; s.phase = 'work'; s.t.day += 2; G.cur = null; G.busy = false; const v = s.flags.v38 = s.flags.v38 || {}; if (v.neg) v.neg.day = -1; if (v.cfDay != null) v.cfDay = -9; s.day.cfToday = 0; G.rollEvent(); }
      G.chance = oc; G.modal = om; return Object.keys(seen); }""")
    bad = r
    check('у директора руководители цеха и Труханов не придираются', not bad, r)

    # 3. меню «Руководить» открывается по ступеням
    def steps(rank):
        return p.evaluate("() => {" + base(rank) + "G.mq.length = 0; G.cur = null; G.busy = false; const sp = G.npcSpecial('seryoga').find(x => /Руководить/.test(x.t)); if (!sp) return null; sp.fn(); return G.cur.opts.map(o => o.t); }")
    check('рабочий ранг 5: меню «Руководить» нет', steps(5) is None)
    s6 = steps(6); s7 = steps(7); s8 = steps(8); s9 = steps(9)
    n = lambda l: len([x for x in l if 'Назад' not in x])
    check('мастер: 1 пункт', n(s6) == 1 and 'замечание' in s6[0], s6)
    check('старший мастер: 2 пункта', n(s7) == 2, s7)
    check('зам. начальника цеха: 3 пункта', n(s8) == 3, s8)
    check('начальник цеха: 7 пунктов (выговор, поощрение, намёк, увольнение)', n(s9) == 7, s9)

    # 4. увольнение с ограничителями
    r = p.evaluate("() => {" + base(9) + """
      G.mq.length = 0; G.cur = null; G.busy = false; G.npcSpecial('seryoga').find(x => /Руководить/.test(x.t)).fn(); const firstDis = G.cur.opts.find(o => /Уволить/.test(o.t)).dis;
      return { firstDis }; }""")
    check('нельзя уволить без оснований (нужны 2 отметки)', r['firstDis'] and 'Нет оснований' in r['firstDis'], r)
    r = p.evaluate("() => {" + base(9) + """
      s.flags.strikes = { seryoga: 2, vityok: 2, palych: 2 };
      const dis = id => { G.mq.length = 0; G.cur = null; G.busy = false; G.npcSpecial(id).find(x => /Руководить/.test(x.t)).fn(); return G.cur.opts.find(o => /Уволить/.test(o.t)).dis; };
      const before = dis('seryoga');
      G.mq.length = 0; G.cur = null; G.busy = false; G.npcSpecial('seryoga').find(x => /Руководить/.test(x.t)).fn(); G.cur.opts.find(o => /Уволить/.test(o.t)).fn(); G.cur = G.mq.shift(); G.cur.opts.find(o => /по статье/.test(o.t)).fn();
      const gone = !!s.flags.ceoFired.seryoga, present = G.isPresent('seryoga');
      const after = dis('vityok'); const toast = [];
      s.flags.fireAt = G.week() - 5; const again = dis('vityok'); s.flags.fireN = 5; const cap = dis('vityok');
      return { before, gone, present, after, again, cap, later: JSON.stringify(s.flags.later || []).indexOf('fire_complaint') >= 0, fireN: s.flags.fireN }; }""")
    check('при основаниях увольнение доступно, сотрудник исчезает', r['before'] is None and r['gone'] and not r['present'], r)
    check('после увольнения — пауза 4 недели, затем снова можно, потолок 5', r['after'] and '4 недели' in r['after'] and r['again'] is None and r['cap'] and 'комисс' in r['cap'], r)
    check('увольнение по статье вызывает жалобу профсоюза', r['later'], r)

    # 5. взятки
    r = p.evaluate("() => {" + base(9) + """
      G.R('seryoga').l = 60; s.flags.hintWk = -5; G.mq.length = 0; G.cur = null; G.busy = false; const m0 = s.money;
      const oc = G.chance; G.chance = () => true; G.npcSpecial('seryoga').find(x => /Руководить/.test(x.t)).fn(); G.cur.opts.find(o => /знак внимания/.test(o.t)).fn(); G.chance = oc;
      return { dm: s.money - m0, later: JSON.stringify(s.flags.later || []).indexOf('bribe_audit') >= 0, notes: s.car.notes.length }; }""")
    check('намёк на взятку приносит деньги и ставит проверку на будущее', r['dm'] > 0 and r['later'], r)
    r = p.evaluate("() => {" + base(8) + """
      G.mq.length = 0; G.cur = null; G.busy = false; const m0 = s.money; const ev = G.EV.find(e => e.id === 'sub_gift'); const cond = ev.cond(s); ev.fn(s); const t = G.cur && G.cur.title; const opt = G.cur.opts[0]; opt.fn();
      return { cond, t, dm: s.money - m0 }; }""")
    check('подчинённый приносит «знак внимания»: можно принять', r['cond'] and 'Знак внимания' in r['t'] and r['dm'] > 0, r)
    r = p.evaluate("() => {" + base(5) + "return G.EV.find(e => e.id === 'sub_gift').cond(s); }")
    check('рабочему взятки не носят', not r, r)

    # 6. друзья
    r = p.evaluate("() => {" + base(9) + """
      G.addFriend('seryoga'); const r = G.R('seryoga'); r.l = 55; G.hierarchyDaily(); const v1 = r.l;
      G.R('kulezhov').l = 5; G.R('truhanov').l = 5;  G.hierarchyDaily(); return { v1, rank9: G.isFriend('seryoga'), tr: G.R('truhanov').l }; }""")
    check('друг при высоком ранге не опускается ниже уровня уважения (≥ 80 на ранге 9)', r['v1'] >= 80 and r['rank9'], r)
    check('начальство (Труханов) «пол уважения» не получает', r['tr'] == 5, r)
    r = p.evaluate("() => {" + base(9) + """
      G.addFriend('seryoga'); G.mq.length = 0; G.cur = null; G.busy = false; G.friendMenu('seryoga'); const t = G.cur.text; const opts = G.cur.opts.map(o => o.t);
      return { t, hasRemove: opts.some(o => /Исключить/.test(o)) }; }""")
    check('меню друга на высоком ранге: приписка об уважении и «Исключить»', 'при людях' in r['t'], r)
    check('исключить из друзей можно с должности зама', r['hasRemove'], r)
    r = p.evaluate("() => {" + base(7) + "G.addFriend('seryoga'); G.mq.length = 0; G.cur = null; G.busy = false; G.friendMenu('seryoga'); return G.cur.opts.some(o => /Исключить/.test(o.t)); }")
    check('мастеру исключать друзей рано', not r, r)
    r = p.evaluate("() => {" + base(9) + """
      G.addFriend('seryoga'); G.addFriend('palych'); G.R('palych').l = 80; G.mq.length = 0; G.cur = null; G.busy = false; G.friendMenu('seryoga'); G.cur.opts.find(o => /Исключить/.test(o.t)).fn(); G.cur = G.mq.shift(); G.cur.opts[0].fn();
      return { fr: G.isFriend('seryoga'), l: G.R('seryoga').l, other: G.R('palych').l, grudge: (s.flags.grudge || {}).seryoga > G.week() }; }""")
    check('исключение из «Своих людей»: сильная обида, друзья недовольны', not r['fr'] and r['l'] <= -25 and r['other'] < 80 and r['grudge'], r)
    r = p.evaluate("() => {" + base(9) + "G.hierarchyDaily(); return G.R('seryoga').l; }")
    p.evaluate("() => {" + base(9) + "G.addFriend('seryoga'); G.R('seryoga').l = 70; G.mq.length = 0; G.cur = null; G.busy = false; G.friendMenu('seryoga'); G.cur.opts.find(o => /Исключить/.test(o.t)).fn(); G.cur = G.mq.shift(); G.cur.opts[0].fn(); G.hierarchyDaily(); window.__l = G.R('seryoga').l; }")
    check('после обиды отношение не «подтягивается» полом уважения', p.evaluate("() => window.__l") <= -25)

    # 7. руководители в «Своих людях»
    r = p.evaluate("() => {" + base(7) + "return { a: G.friendable('kulezhov'), q7: G.friendReq('kulezhov').ok, q8: (s.car.rank = 8, G.R('kulezhov').l = 70, G.R('kulezhov').talks = 9, G.R('kulezhov').help = 9, s.st.coll = 80, G.friendReq('kulezhov').ok) }; }")
    check('начальник — в «Своих людях» только по должности', r['a'] and not r['q7'] and r['q8'], r)

    # 8. досуг начальников
    r = p.evaluate("() => {" + base(8) + """
      s.phase = 'free'; s.loc = 'home'; s.t.hour = 19; G.R('kulezhov').l = 40; const a = G.avail(G.ACT.exec_leisure);
      const low = (s.car.rank = 7, G.avail(G.ACT.exec_leisure)); s.car.rank = 8;
      G.mq.length = 0; G.cur = null; G.busy = false; G.ACT.exec_leisure.fn(); const list = G.cur.opts.map(o => o.t);
      G.cur.opts[0].fn(); G.cur = G.mq.shift(); const acts = G.cur.opts.map(o => ({ t: o.t, dis: o.dis }));
      const m0 = s.money, r0 = G.R(G.cur.face).l; G.cur.opts[0].fn();
      return { a, low, list, acts, dm: s.money - m0, dr: G.R('ekaterina').l }; }""")
    check('«Выходной для начальства» доступен с ранга 8', r['a'] is None and r['low'], r)
    check('охота закрыта для зама (ранг 9+), рыбалка доступна', r['acts'][3]['dis'] and not r['acts'][0]['dis'], r)

    # 9. подарки к повышению
    r = p.evaluate("() => {" + base(5) + """
      G.mq.length = 0; G.cur = null; G.busy = false; G.LATER.promo_gifts({ to: 7 }); const t = G.cur.title; const m0 = s.money; G.cur.opts[0].fn(); return { t, dm: s.money - m0, cog: s.inv.cognac || 0 }; }""")
    check('подарки от коллектива при назначении', r['dm'] > 0 and r['cog'] >= 1, r)

    # 10. рабочему ничего не изменилось
    r = p.evaluate("() => {" + base(4) + """
      const sp = G.npcSpecial('seryoga').map(x => x.t); return { lead: sp.some(t => /Руководить/.test(t)), above: G.aboveMe('stepanych') }; }""")
    check('рабочие ранги: логика прежняя (мастер выше, меню нет)', not r['lead'] and r['above'], r)

    b.close()
print('\nИТОГО: %s' % ('ВСЕ ПРОШЛИ' if not fails else 'ПРОВАЛЫ: %d' % len(fails)))
raise SystemExit(1 if fails else 0)
