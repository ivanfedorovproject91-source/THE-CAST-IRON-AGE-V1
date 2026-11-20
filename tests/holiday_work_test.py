#!/usr/bin/env python3
"""Праздничные объявления на заводе («День обнимашек» и т.п.) появляются только на работе,
а не дома после сна. Запуск: python3 tests/holiday_work_test.py"""
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
# день игры, на который выпадает дата: 2026-11-02 + day
DAY = "(y, m, d) => Math.round((new Date(y, m - 1, d) - new Date(2026, 10, 2)) / 86400000)"
BASE = "G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; window.__m = []; G.modal = o => { window.__m.push(o.title); };"
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox']); p = b.new_context().new_page()
    p.on('pageerror', lambda e: fails.append('pageerror: ' + str(e)))
    p.route('**/telegram.org/**', lambda r: r.abort()); p.route('**/fonts.g*/**', lambda r: r.abort())
    p.goto(URL); p.wait_for_timeout(800)

    # День народного единства (4 ноября): дома — тишина, на работе — одно окно
    r = p.evaluate("() => {" + BASE + """
      const day = (""" + DAY + """)(2026, 11, 4); s.t.day = day; const out = {};
      for (const ph of ['morning', 'evening', 'weekend']) { s.phase = ph; G.holidayCheck(); }
      out.home = window.__m.length; out.seenAtHome = s.flags.holSeen === day;
      s.phase = 'work'; G.holidayCheck(); out.work = window.__m.length;
      G.holidayCheck(); out.again = window.__m.length;
      s.phase = 'lunch'; G.holidayCheck(); out.lunch = window.__m.length; out.title = window.__m[0];
      return out; }""")
    check('дома (утро/вечер/выходной) объявление не появляется', r['home'] == 0, r)
    check('дома день не помечается «праздник уже был»', r['seenAtHome'] is False, r)
    check('на работе объявление появляется', r['work'] == 1 and 'единства' in (r['title'] or ''), r)
    check('объявление показывается один раз за день', r['again'] == 1 and r['lunch'] == 1, r)

    # Праздник выходного дня (День металлурга, воскресенье) не привязан к заводу — работает как раньше
    r = p.evaluate("() => {" + BASE + """
      s.t.day = (""" + DAY + """)(2027, 7, 18); s.phase = 'weekend'; G.holidayCheck(); return window.__m.length; }""")
    check('выходные праздники (День металлурга) по-прежнему появляются дома', r == 1, r)

    # Обычный день без праздника — ничего не ломается
    r = p.evaluate("() => {" + BASE + """
      s.t.day = (""" + DAY + """)(2026, 11, 10); s.phase = 'work'; G.holidayCheck(); return window.__m.length; }""")
    check('в обычный день окон нет', r == 0, r)
    b.close()
srv.shutdown()
print('\nИТОГ: ' + ('все проверки пройдены' if not fails else 'ПРОВАЛЕНО: ' + str(len(fails))))
raise SystemExit(1 if fails else 0)
