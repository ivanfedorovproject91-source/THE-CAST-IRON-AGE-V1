#!/usr/bin/env python3
"""Этап 6: случайный «игрок» (fuzz) на разных стартах. Запуск: python3 tests/stage6_fuzz_test.py [дней] [seeds]"""
import http.server, os, socketserver, threading, sys, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 120
SEEDS = int(sys.argv[2]) if len(sys.argv) > 2 else 2
CHAOS = len(sys.argv) > 3 and sys.argv[3] == 'chaos'
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]
STARTS = [('podsob', 0, 'новичок'), ('tokar', 3, 'рабочий р.3'), ('tokar', 5, 'рабочий р.5'), ('tokar', 6, 'мастер'), ('tokar', 7, 'ст. мастер'), ('tokar', 8, 'зам. нач. цеха'), ('tokar', 9, 'нач. цеха'), ('tokar', 10, 'зам. ген.'), ('ceo', 10, 'ГЕНДИР')]
fails = []; rows = []
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox'])
    for job, rank, label in STARTS:
        for seed in range(1, SEEDS + 1):
            p = b.new_context().new_page(); perr = []
            p.on('pageerror', lambda e: perr.append(str(e)))
            p.route('**/telegram.org/**', lambda r: r.abort()); p.route('**/fonts.g*/**', lambda r: r.abort())
            p.goto(URL); p.wait_for_timeout(500)
            p.add_script_tag(path=os.path.join(ROOT, 'tests', 'stage6_fuzz.js'))
            r = p.evaluate("""(a) => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.rs = a.seed * 7919; s.car.job = a.job === 'ceo' ? 'tokar' : a.job; s.car.rank = a.rank; s.car.shifts = a.rank * 40; s.money = 20000 + a.rank * 20000; s.phase = 'evening'; s.loc = 'home'; s.t.hour = 18;
              if (a.job === 'ceo') { G.ceo.dev.now('normal'); } G.mq.length = 0; G.cur = null; G.busy = false;
              try { G.startDay && 0; } catch (e) {} return window.__fuzz({ days: a.days, seed: a.seed * 101 + a.rank, chaos: a.chaos }); }""", {'job': job, 'rank': rank, 'seed': seed, 'days': DAYS, 'chaos': CHAOS})
            r['label'] = label; r['seed'] = seed; r['pageerrors'] = perr[:3]
            rows.append(r)
            ok = not r['errors'] and not r['bad'] and not perr and r['stuck'] < 3
            print(('OK   ' if ok else 'FAIL ') + '%-14s seed%d: дней %d, итог %s, деньги %d, ранг %d, действий %d видов, окон %d, зависаний %d' % (label, seed, r['days'], r['end'] or 'играет', r['money'], r['rank'], r['nActs'], r['modals'], r['stuck']))
            for si in (r.get('stuckInfo') or [])[:3]: print('     · завис:', si[:200])
            if r['end'] and os.environ.get('SERIES'): print('     · ряд:', ' '.join(r.get('series', [])[-12:]))
            for d in (r.get('drops') or [])[:5]: print('     · падение настроения:', d)
            if r['end']: print('     · конец:', r['last'][:160])
            for e in r['errors'][:4] + r['bad'][:4] + perr[:2]: print('     ·', e[:200])
            if not ok: fails.append((label, seed))
            p.context.close()
    b.close()
json.dump(rows, open(os.path.join(ROOT, 'tests', 'stage6_fuzz_last.json'), 'w'), ensure_ascii=False, indent=1)
print('\nИТОГО: %s' % ('ВСЕ ПРОШЛИ' if not fails else 'ПРОВАЛЫ: %s' % fails))
raise SystemExit(1 if fails else 0)
