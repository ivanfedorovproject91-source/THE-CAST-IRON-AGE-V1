#!/usr/bin/env python3
"""Этап 4, блок 4: режим директора и свободная игра. Запуск: python3 tests/stage4_ceo_test.py"""
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
BASE = "G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; G.mq.length = 0; G.cur = null; G.busy = false; G.ceo.dev.now('normal'); G.mq.length = 0; G.cur = null; G.busy = false; s.phase = 'work'; s.loc = 'shop'; s.t.hour = 9; const c = G.co.get();"
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox']); p = b.new_context().new_page()
    p.on('pageerror', lambda e: fails.append('pageerror: ' + str(e)))
    p.route('**/telegram.org/**', lambda r: r.abort()); p.route('**/fonts.g*/**', lambda r: r.abort())
    p.goto(URL); p.wait_for_timeout(800)

    r = p.evaluate("() => {" + BASE + """
      const av = id => G.avail(G.ACT[id]);
      return { is: G.ceo.is(), work: av('work'), smoke: av('smoke_shop'), staff: av('staff'), round: av('ceo_round'), call: (s.loc = 'admin', av('ceo_board_call')), fr: G.fireRisk(), };}""")
    check('директор назначен', r['is'], r)
    check('цеховые действия скрыты', r['work'] and r['smoke'] and r['staff'], r)
    check('действия директора доступны', r['round'] is None and r['call'] is None, r)
    check('риск увольнения мастером = 0', r['fr'] == 0, r)

    r = p.evaluate("() => {" + BASE + """
      const a = s.pay.acc; s.day.ops = 0; s.day.qsum = 0; G.endShift(); const gain = s.pay.acc - a; const base = G.monthlyPay() / 20;
      return { gain, base }; }""")
    check('оклад за смену начисляется полностью (без операций)', abs(r['gain'] - r['base'] * 1.0) < 1, r)

    r = p.evaluate("() => {" + BASE + """
      c.board.trust = 33; s.car.rep = 5; G.ceoSyncBoss(); const boss = s.st.boss; const rep = s.car.rep;
      const t0 = c.board.trust; G.punish({ risk: 100, what: 'x', fine: [100, 200], sev: 1 }); const ended = !!s.end;
      G.checkEnd(); return { boss, rep, ended, endAfter: !!s.end, repAfter: s.car.rep }; }""")
    check('отношение начальства = доверие совета', r['boss'] == 33, r)
    check('ковёр/штраф мастера не действует на директора', not r['ended'] and not r['endAfter'] and r['repAfter'] == 0, r)

    # царь: отношение работяг
    r = p.evaluate("() => {" + BASE + """
      G.R('palych').l = 10; G.R('stepanych').l = -20; G.R('truhanov').l = 5; G.ceoReverence();
      return { palych: G.R('palych').l, st: G.R('stepanych').l, truh: G.R('truhanov').l, staff: G.ceoStaff('palych'), notStaff: G.ceoStaff('truhanov') }; }""")
    check('работяги относятся как к царю (≥70)', r['palych'] >= 70 and r['st'] >= 70, r)
    check('председатель совета не «царедворец»', r['truh'] == 5 and r['staff'] and not r['notStaff'], r)

    # меню распоряжений и последствия
    r = p.evaluate("() => {" + BASE + """
      G.ceoReverence(); G.mq.length = 0; G.cur = null;
      const sp = G.npcSpecial('palych').map(x => x.t); const spTruh = G.npcSpecial('truhanov').map(x => x.t);
      const t0 = c.treasury; const rl0 = G.R('palych').l;
      G.npcSpecial('palych').find(x => /Распоряжения/.test(x.t)).fn();
      const m = G.cur; const titles = m.opts.map(o => o.t);
      m.opts.find(o => /Премия/.test(o.t)).fn();
      return { has: sp.some(t => /Распоряжения/.test(t)), hasTruh: spTruh.some(t => /Распоряжения/.test(t)), titles, dt: t0 - c.treasury, dr: G.R('palych').l - rl0 }; }""")
    check('меню распоряжений есть у персонала, нет у председателя совета', r['has'] and not r['hasTruh'], r)
    check('премия списывается из кассы предприятия и растит отношение', r['dt'] == 30000 and r['dr'] > 0, r)

    r = p.evaluate("() => {" + BASE + """
      G.ceoReverence(); G.mq.length = 0; G.cur = null;
      G.npcSpecial('vityok').find(x => /Распоряжения/.test(x.t)).fn();
      G.cur.opts.find(o => /Уволить/.test(o.t)).fn(); G.cur = G.mq.shift();
      G.cur.opts.find(o => /по статье/.test(o.t)).fn();
      const gone = !!s.flags.ceoFired.vityok; const present = G.isPresent('vityok');
      G.mq.length = 0; G.cur = null; G.busy = false; G.npcMenu('vityok'); const txt = G.cur && G.cur.text;
      const spAfter = G.npcSpecial('vityok').some(x => /Распоряжения/.test(x.t));
      return { gone, present, txt, spAfter, later: JSON.stringify(s.flags.later || []).indexOf('ceo_union_protest') >= 0 }; }""")
    check('уволенный сотрудник исчезает, остаётся реакция профсоюза', r['gone'] and not r['present'] and 'аннулирован' in (r['txt'] or '') and r['later'], r)

    # разговор — почтительный
    r = p.evaluate("() => {" + BASE + """
      G.mq.length = 0; G.cur = null; G.isPresent = () => true; G.talkTo('palych'); const m = G.cur; return { t: m && m.text, n: m && m.opts.length }; }""")
    check('разговор с персоналом идёт в почтительном тоне', r['n'] == 2 and r['t'], r)

    # увольнение советом: 4 недели на дне
    r = p.evaluate("() => {" + BASE + """
      c.board.trust = 3; c.board.warn = 0; c.board.probation = 0; c.treasury = 5e7; let wk = 0;
      for (let i = 0; i < 6 && !c.flags.dismissed; i++) { wk = i + 1; G.co.ev.weekClose(c, { profit: 0 }, i); c.board.trust = 3; }
      const md = [G.cur].concat(G.mq).find(m => m && /ПРИКАЗ/.test(m.title || '')); if (!s.end && md) md.opts[0].fn();
      return { end: s.end && s.end.id, wk, dis: !!c.flags.dismissed }; }""")
    check('совет снимает директора после 4 недель доверия ≤ 8', r['end'] == 'ceo_fired' and r['wk'] == 4, r)

    # финалы директора
    r = p.evaluate("() => {" + BASE + """
      s.loc = 'admin'; c.stats.weeks = 60; c.board.trust = 70; c.treasury = 10e6;
      const noMoney = G.avail(G.ACT.ceo_holding); c.treasury = 60e6; const ok = G.avail(G.ACT.ceo_holding);
      c.stats.weeks = 10; const early = G.avail(G.ACT.ceo_retire); c.stats.weeks = 60; const okR = G.avail(G.ACT.ceo_retire);
      return { noMoney, ok, early, okR }; }""")
    check('холдинг и отставка открываются по условиям', r['noMoney'] and r['ok'] is None and r['early'] and r['okR'] is None, r)
    r = p.evaluate("() => {" + BASE + """
      c.stats.weeks = 60; c.board.trust = 70; c.treasury = 60e6; G.ACT.ceo_holding.fn(); G.cur.opts[0].fn();
      return { end: s.end && s.end.id, tr: c.treasury, can: G.canContinueFree() }; }""")
    check('холдинг: финал, касса −30 млн, можно продолжить', r['end'] == 'ceo_holding' and r['tr'] == 30e6 and r['can'], r)

    # свободная игра
    r = p.evaluate("() => {" + BASE + """
      G.end('ceo_holding'); const e1 = s.end.id; const ok = G.continueFree(); const e2 = s.end; const fp = s.flags.freePlay;
      G.end('ceo_holding'); const again = s.end; // повторный тот же финал игнорируется
      G.end('ceo_fired'); const e3 = s.end && s.end.id;
      return { e1, ok, e2, fp, again, e3 }; }""")
    check('после нефатального финала игру можно продолжить', r['ok'] and r['e2'] is None and r['fp'] == 1, r)
    check('тот же финал не повторяется, провальный финал срабатывает', r['again'] is None and r['e3'] == 'ceo_fired', r)
    r = p.evaluate("() => {" + BASE + """
      G.end('ceo_fired'); return { can: G.canContinueFree(), cont: G.continueFree(), still: !!s.end }; }""")
    check('после увольнения/смерти продолжить нельзя', not r['can'] and not r['cont'] and r['still'], r)

    # обычный игрок не затронут
    r = p.evaluate("() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.car.job = 'tokar'; s.car.rank = 3; s.phase = 'work'; s.loc = 'shop'; s.t.hour = 9; G.mq.length = 0; G.cur = null;" + """
      const a = G.avail(G.ACT.work); const e = G.avail(G.ACT.ceo_round); G.R('palych').l = 10; G.ceoReverence(); const sp = G.npcSpecial('palych').some(x => /Распоряжения/.test(x.t));
      return { a, e, pl: G.R('palych').l, sp, fr: G.fireRisk() >= 0 }; }""")
    check('у обычного работника ничего не изменилось', r['a'] is None and r['e'] and r['pl'] == 10 and not r['sp'], r)

    # старое сохранение: директор без новых флагов загружается
    r = p.evaluate("() => {" + BASE + """
      delete s.flags.ceoFired; delete s.flags.finals; G.save(); G.load(); const ok = G.ceo.is() && !G.canContinueFree();
      return { ok, fired: G.isPresent('palych') !== undefined }; }""")
    check('старое сохранение директора загружается без ошибок', r['ok'], r)

    b.close()
print('\nИТОГО: %s' % ('ВСЕ ПРОШЛИ' if not fails else 'ПРОВАЛЫ: %d' % len(fails)))
raise SystemExit(1 if fails else 0)
