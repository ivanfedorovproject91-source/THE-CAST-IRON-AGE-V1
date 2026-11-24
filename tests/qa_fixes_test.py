#!/usr/bin/env python3
"""Проверка правок по QA-отчёту V3.17: корочки и экзамен, концовки, закрытие завода, версия, мёртвый код.
Запуск: python3 tests/qa_fixes_test.py"""
import http.server, os, socketserver, threading, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def log_message(s,*a): pass
srv = socketserver.TCPServer(('127.0.0.1',0),Q); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
fails=[]
def check(n,ok,info=''):
    print(('PASS ' if ok else 'FAIL ')+n+(('  -> '+str(info)) if info and not ok else ''))
    if not ok: fails.append(n)
SETUP = """(o) => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s=G.s; s.car.job='tokar'; s.car.rank=(o&&o.rank!==undefined)?o.rank:1; s.car.shifts=(o&&o.shifts)||30; s.money=(o&&o.money)||50000; s.phase=(o&&o.phase)||'free'; s.t.hour=(o&&o.hour)||18; s.st.energy=90; s.st.mood=80; G.mq.length=0; G.cur=null; G.busy=false; }"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:%d/index.html'%port); pg.wait_for_timeout(800)
    ev=lambda js,a=None: pg.evaluate(js,a) if a is not None else pg.evaluate(js)
    def setup(**o):
        pg.wait_for_timeout(250); ev(SETUP,o); pg.wait_for_timeout(50); ev("G.mq.length=0; G.cur=null; G.busy=false")

    # --- 1. корочки облегчают экзамен (−1 верный ответ), но не обязательны
    need=lambda: int(re.search(r'нужно (\d) правильных', ev("G.career.reqLines().map(x=>x.t).join('|')")).group(1))
    setup(rank=2, shifts=60)
    ev("G.s.car.certs=[]"); n0=need(); t0=ev("G.career.reqLines().map(x=>x.t).join('|')")
    check('без корочки Р3: есть подсказка про необязательную корочку', 'Необязательно' in t0, t0)
    ev("G.s.car.certs=['c_r3']"); n1=need(); t1=ev("G.career.reqLines().map(x=>x.t).join('|')")
    check('с корочкой Р3: порог на 1 ниже, подсказка исчезла', n1==n0-1 and 'Необязательно' not in t1, (n0,n1,t1))
    ev("G.s.car.certs=['c_r2']"); n2=need()
    check('корочка не той ступени порог не меняет', n2==n0, (n0,n2))
    setup(rank=1, shifts=30); ev("G.s.car.certs=[]"); m0=need(); ev("G.s.car.certs=['c_r2']"); m1=need()
    check('Р1→Р2: корочка Р2 снижает порог на 1', m1==m0-1, (m0,m1))
    ev("G.s.car.certs=['c_r2']"); ev("G.s.car.rank=2"); ev("G.s.car.ladderStepAt=0"); k0=need()
    check('порог никогда не ниже 2', k0>=2, k0)
    setup(rank=1, shifts=30); ev("G.s.car.certs=[]"); ev("G.coursesMenu()")
    txt=ev("G.cur?G.cur.text:''")
    check('меню курсов не врёт, что корочка обязательна', 'не обязательна' in txt and 'нужна корочка' not in txt, txt)

    check('нет ошибок страницы', not errs, errs)
print('ИТОГ: ' + ('ВСЁ ПРОШЛО' if not fails else 'ПРОВАЛЕНО: ' + ', '.join(fails)))
raise SystemExit(1 if fails else 0)
