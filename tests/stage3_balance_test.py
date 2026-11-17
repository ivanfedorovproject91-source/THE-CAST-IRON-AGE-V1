#!/usr/bin/env python3
"""Этап 3, блок 1: потолок штрафов в расчёте, премия завода от оклада, концовка «процветает» только с ранга 8.
Запуск: python3 tests/stage3_balance_test.py"""
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
NEW = "() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.car.job = s.car.job || 'tokar'; s.car.rank = 2; s.flags = s.flags || {}; return G.monthlyPay(); }"
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox']); p = b.new_context().new_page()
    p.on('pageerror', lambda e: fails.append('pageerror: ' + str(e)))
    p.route('**/telegram.org/**', lambda r: r.abort()); p.route('**/fonts.g*/**', lambda r: r.abort())
    p.goto(URL); p.wait_for_timeout(800)
    # 1. штраф больше начисления: на руки не отрицательно, удержано <= 20%
    r = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.flags.shurFriend = 1; s.car.rank = 2;
      s.pay.acc = 40000; s.pay.adv = 16000; s.pay.pen = 90000; s.pay.viol = 1; s.pay.qn = 1; s.pay.prem = 0.5;
      const w = G.week; G.week = () => 3; const m0 = s.money; G.payday(); G.week = w;
      return { delta: s.money - m0 + 5500 }; }""")
    check('штраф 90 000 при начислении 40 000: выплата не отрицательна', r['delta'] >= 0, r)
    check('удержание ограничено 20%: на руки ≥ (40000−8000−16000)*0.87', r['delta'] >= (40000 - 8000 - 16000) * 0.87 - 2, r)
    # 2. премия завода = 5% оклада ступени (не меньше 500), а не фиксированные 3 000
    r = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s, f = s.flags;
      s.car.job = Object.keys(G.D.JOBS)[0]; s.car.rank = 2; f.plan = 95; f.shopMorale = 95; s.world.plant = 95;
      G.weekday = () => 0; s.pay.acc = 0; try { G.dailyTick(); } catch (e) {}
      return { acc: s.pay.acc, mp: G.monthlyPay() }; }""")
    exp = max(500, round(r['mp'] * 0.05 / 100) * 100)
    check('премия завода = 5% оклада (мин. 500)', abs(r['acc'] - exp) < 1 and r['acc'] != 3000, (r, exp))
    # 3. процветание не наступает ниже ранга 8
    r = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s, f = s.flags; s.car.rank = 3;
      f.plan = 95; f.shopMorale = 95; s.world.plant = 95; f.prosperWeeks = 20; s.flags.uLast = undefined;
      for (let i = 0; i < 30; i++) { try { G.dailyTick(); } catch (e) {} }
      return { end: s.end || null, pw: f.prosperWeeks }; }""")
    check('ранг 3: концовка «процветает» не срабатывает', r['end'] != 'prosper', r)
    b.close()
srv.shutdown()
print('\nИТОГ:', 'все проверки пройдены' if not fails else 'ОШИБКИ: %s' % fails)
raise SystemExit(1 if fails else 0)
