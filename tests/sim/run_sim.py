#!/usr/bin/env python3
"""Экономическая симуляция «Чугунного века» (Этап 2). Запуск: python3 tests/sim/run_sim.py [--quick] [--out DIR]
Гоняет настоящие функции игры в Chromium (Playwright) с фиксированными seed. Результат — JSON в DIR."""
import http.server, os, socketserver, threading, json, sys, re, argparse, time
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.dirname(os.path.abspath(__file__))
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass

# --- сценарии питания/досуга (реальные id из D.MENU / D.ITEMS / G.ACT)
THRIFTY = dict(lunch=['lapsha'], lunchSat=70, eatBelow=50, homeItems=['doshirak'], plan={0: [], 1: [], 2: [], 3: [], 4: [], 5: ['dk_kvn'], 6: ['fishing']}, hospital=False)
NORMAL = dict(lunch=['borsch', 'grechka'], lunchSat=85, eatBelow=55, homeItems=['dumpling', 'bread'], coffee=True, hospital=True,
              plan={0: [], 1: ['kino'], 2: [], 3: [], 4: ['ryum'], 5: ['bath', 'shashlik'], 6: ['fishing']})
SPENDY = dict(lunch=['shnitsel', 'grechka', 'kofe'], lunchSat=95, eatBelow=65, homeItems=['shaverma', 'tushenka', 'dumpling'], coffee=True, hospital=True,
              plan={0: ['cafe_eat'], 1: ['cafe_eat', 'kino'], 2: ['market_buy'], 3: ['cafe_eat'], 4: ['ryum', 'cafe_eat'], 5: ['cafe_eat', 'bath', 'shashlik'], 6: ['cafe_eat', 'billiard']})
SOCIAL = dict(lunch=['borsch', 'grechka'], lunchSat=85, eatBelow=55, homeItems=['dumpling'], coffee=True, hospital=True,
              plan={0: [], 1: ['dk_chorus'], 2: ['garage'], 3: ['dk_chorus', 'ryum'], 4: ['ryum'], 5: ['dk_dance', 'shashlik'], 6: ['fishing', 'garage']})

def prof(name, job, policy, skill=0.72, **kw):
    d = dict(name=name, job=job, policy=policy, skill=skill, exam=0.8, days=365, edu='')
    d.update(kw); return d
PROFILES = [
    prof('1 Экономный новичок', 'podsob', THRIFTY),
    prof('2 Обычный игрок', 'podsob', NORMAL),
    prof('3 Много тратит на еду и вещи', 'podsob', SPENDY),
    prof('4 Общительный (подарки, досуг)', 'podsob', SOCIAL, events=[dict(day=d, buy=1000, tag='подарки') for d in range(6, 365, 7)]),
    prof('5a Кредит 50 000', 'podsob', NORMAL, events=[dict(day=14, loan='Взять кредит 50 000')]),
    prof('5b Микрозайм 5 000 (каждые 28 дней)', 'podsob', NORMAL, events=[dict(day=d, loan='Микрозайм') for d in range(10, 365, 28)]),
    prof('6 Копит на машину (Гранта 350 000)', 'podsob', THRIFTY, goal=350000),
    prof('7 Высокий разряд (токарь р.5)', 'tokar', NORMAL, edu='tokar', start=dict(car=dict(rank=5, shifts=120, probShifts=20, mentorDone=1), st=dict(bm=3000, know=70, boss=40, coll=40), money=15000)),
    prof('8 Руководитель (Ст. мастер)', 'tokar', NORMAL, edu='tokar', start=dict(car=dict(rank=7, shifts=245, probShifts=20, mgmtStage=1, mentorDone=1), st=dict(bm=6000, know=80, boss=55, coll=45), money=30000)),
]
ADVERSE = [  # (метка, базовый профиль, параметры)
    ('А штрафы 1 500 ₽/мес', 1, dict(finePerMonth=1500)),
    ('Б болезнь 7 дн/мес', 1, dict(sickPerMonth=7)),
    ('В плохая работа (качество ~35%)', 1, dict(skill=0.25, exam=0.55)),
    ('Г кредитная нагрузка (50к + микрозайм + 200к)', 1, dict(events=[dict(day=7, loan='Взять кредит 50 000'), dict(day=20, loan='Микрозайм'), dict(day=60, loan='Взять кредит 200 000', minRank=1), dict(day=90, loan='Микрозайм'), dict(day=150, loan='Микрозайм')])),
    ('Д всё сразу', 1, dict(skill=0.4, exam=0.6, finePerMonth=1500, sickPerMonth=5, events=[dict(day=14, loan='Взять кредит 50 000'), dict(day=40, loan='Микрозайм')])),
]

def install_routes(ctx):
    """Тестовые подмены при загрузке (код игры в репозитории НЕ меняется): открыть банки вопросов и запретить внешнюю сеть."""
    def patch_ladder(route):
        r = route.fetch(); body = r.text(); i = body.rstrip().rfind('})();')
        body = body[:i] + "try{window.__LADDER={WORK_Q:WORK_Q,WORK_HARD:WORK_HARD,MGMT_Q:MGMT_Q,MGMT_HARD:MGMT_HARD};}catch(e){}\n" + body[i:]
        route.fulfill(response=r, body=body, headers={**r.headers, 'content-length': str(len(body.encode()))})
    def patch_nad(route):
        r = route.fetch(); body = r.text().replace("const NI = [", "window.__NQ = NQ; const NI = [", 1)
        route.fulfill(response=r, body=body, headers={**r.headers, 'content-length': str(len(body.encode()))})
    ctx.route('**/js/career_ladder.js*', patch_ladder)
    ctx.route('**/js/data_actions.js*', patch_nad)
    ctx.route(re.compile(r'^(?!http://127\.0\.0\.1).*'), lambda r: r.abort())

def strkeys(o):
    if isinstance(o, dict): return {str(k): strkeys(v) for k, v in o.items()}
    if isinstance(o, list): return [strkeys(x) for x in o]
    return o
def run_one(pg, cfg):
    pg.goto(URL); pg.wait_for_timeout(300)
    return pg.evaluate("c => window.__sim(c)", cfg)

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--quick', action='store_true'); ap.add_argument('--out', default=os.path.join(HERE, 'out')); ap.add_argument('--seeds', type=int, default=3)
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    srv = socketserver.TCPServer(('127.0.0.1', 0), Q); port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    URL = 'http://127.0.0.1:%d/index.html' % port
    drv = open(os.path.join(HERE, 'econ_driver.js'), encoding='utf-8').read()
    jobs = [(p, 'base') for p in PROFILES] + [(dict(PROFILES[b - 1], name='Неблагоприятно: ' + n, **kw), 'adverse') for n, b, kw in ADVERSE]
    res = []
    with sync_playwright() as pw:
        br = pw.chromium.launch(); ctx = br.new_context()
        install_routes(ctx)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        for (p, kind) in jobs:
            for seed in range(1, (2 if a.quick else a.seeds) + 1):
                cfg = dict(p, seed=seed, days=(40 if a.quick else p['days']), traceAcc=p['name'][:2] in ('2 ', '8 ', '1 ', '7 '))
                pg.goto(URL); pg.wait_for_timeout(250); pg.add_script_tag(content=drv)
                t0 = time.time()
                try: r = pg.evaluate("c => window.__sim(c)", strkeys(cfg))
                except Exception as e: r = dict(name=p['name'], seed=seed, error=str(e)[:400])
                r['kind'] = kind; r['sec'] = round(time.time() - t0, 1); res.append(r)
                print(('%-45s seed%d  %s' % (p['name'], seed, ('ERR ' + r['error'][:120]) if 'error' in r else 'money=%s debt=%s rank=%s shifts=%s end=%s (%.1fs)' % (r['money'], r['debt'], r['rank'], r['shifts'], r['ending'], r['sec']))), flush=True)
        ceo = []
        for diff in ('easy', 'normal', 'hard'):
            pg.goto(URL); pg.wait_for_timeout(250); pg.add_script_tag(content=drv)
            try: r = pg.evaluate("c => window.__ceo(c)", dict(seed=1, days=(60 if a.quick else 365), diff=diff))
            except Exception as e: r = dict(diff=diff, error=str(e)[:300])
            ceo.append(r); print('9 Предприятие', diff, ('ERR ' + r['error']) if 'error' in r else 'rows=%d ending=%s errs=%s' % (len(r['rows']), r['ending'], r['errs']), flush=True)
        json.dump(ceo, open(os.path.join(a.out, 'ceo_results.json'), 'w'), ensure_ascii=False, indent=1)
        print('page errors:', len(errs), errs[:3])
    json.dump(res, open(os.path.join(a.out, 'sim_results.json'), 'w'), ensure_ascii=False, indent=1)
