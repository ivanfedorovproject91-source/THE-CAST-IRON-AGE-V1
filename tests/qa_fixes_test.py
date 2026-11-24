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

    # --- 2. «Тюрьма»: третья поимка с добычей за 120 дней
    setup(rank=3, shifts=80); ev("G.s.t.day=50")
    ev("G.lootBust()"); r1=ev("G.s.end?G.s.end.id:null"); ev("G.s.t.day=60; G.lootBust()")
    r2=ev("G.s.end?G.s.end.id:null"); w2=ev("(G.cur&&G.cur.title)||(G.mq.length?'queued':'')")
    check('две поимки: игра идёт, предупреждение показано', r1 is None and r2 is None and ('папку' in str(w2) or w2=='queued'), (r1,r2,w2))
    ev("G.s.t.day=70; G.lootBust()")
    check('третья поимка: концовка jail', ev("G.s.end&&G.s.end.id")=='jail', ev("G.s.end"))
    setup(rank=3, shifts=80); ev("G.s.t.day=50; G.lootBust(); G.s.t.day=200; G.lootBust(); G.s.t.day=400; G.lootBust()")
    check('поимки реже окна 120 дней не ведут к тюрьме', ev("!G.s.end"), ev("G.s.end"))
    # --- 3. «Бездомный»: долг + зависимость + пустой кошелёк 8 недель подряд
    setup(rank=1, shifts=40); ev("G.s.debt=150000; G.s.st.habit=80; G.s.money=0")
    ids=[]
    for i in range(8):
        ev("G.s.debt=150000; G.s.st.habit=80; G.s.money=0; G.weeklyTick()"); ids.append(ev("G.s.end?G.s.end.id:null"))
        if ids[-1]: break
    check('8 недель на дне: концовка homeless не раньше 8-й недели', ids[-1]=='homeless' and len(ids)==8 and all(x is None for x in ids[:-1]), ids)
    setup(rank=1, shifts=40)
    for i in range(12): ev("G.s.debt=150000; G.s.st.habit=80; G.s.money=0; if(%d%%3===2){G.s.money=5000}; G.weeklyTick()" % i)
    check('если деньги появляются, бездомным не становишься', ev("!G.s.end"), ev("G.s.end"))
    setup(rank=1, shifts=40)
    for i in range(12): ev("G.s.debt=150000; G.s.st.habit=10; G.s.money=0; G.weeklyTick()")
    check('без зависимости долг сам по себе не ведёт к бездомности', ev("!G.s.end"), ev("G.s.end"))

    # --- 4. Закрытие завода: 4 недели на спасение
    setup(rank=3, shifts=80); ev("G.s.world.plant=40; G.s.t.day=70; G.career.closing()")
    check('закрытие: игра не заканчивается сразу, идёт отсчёт', ev("!G.s.end && G.s.world.closing>0"), ev("[G.s.end,G.s.world.closing]"))
    ev("G.mq.length=0;G.cur=null;G.busy=false;G.s.money=50000"); ev("G.addMoney(-20000); G.s.world.closing=0; G.s.flags.closeCool=G.week()+26")
    ev("G.career.closing()"); check('после спасения 26 недель угроза не повторяется', ev("G.s.world.closing===0"), ev("G.s.world.closing"))
    setup(rank=3, shifts=80); ev("G.s.world.plant=40; G.career.closing()")
    for i in range(6):
        ev("G.mq.length=0;G.cur=null;G.busy=false;G.s.world.plant=40;G.s.t.day+=7;G.weeklyTick()")
        if ev("!!G.s.end"): break
    check('ничего не делать: завод закрывается ровно через 4 недели', ev("G.s.end&&G.s.end.id")=='closed' and i==3, (i, ev("G.s.end")))
    setup(rank=3, shifts=80); ev("G.s.world.plant=40; G.s.money=50000; G.career.closing()")
    pr=ev("G.cur?G.cur.opts.map(o=>o.t):null")
    ev("G.cur.opts[0].fn()")
    check('взятка комиссии спасает завод и стоит 20 000', ev("G.s.world.closing===0 && !G.s.end") and ev("G.s.money")<=30000, (pr, ev("G.s.money")))
    setup(rank=3, shifts=80); ev("G.s.world.plant=40; G.s.money=100; G.career.closing()")
    dis=ev("G.cur&&G.cur.opts[0].dis")
    check('без денег взятка недоступна', bool(dis), dis)
    setup(rank=3, shifts=80); ev("G.s.world.plant=80; G.career.closing()")
    saved=False
    for i in range(60):
        ev("G.mq.length=0;G.cur=null;G.busy=false;G.s.world.closing=G.week()+3;G.s.world.plant=80;G.weeklyTick()")
        if ev("G.s.world.closing===0"): saved=True; break
    check('при хороших показателях завод может спастись сам', saved, i)
    check('puppet удалена, jail/homeless/closed на месте', ev("!G.D.ENDINGS.puppet && !!G.D.ENDINGS.jail && !!G.D.ENDINGS.homeless && !!G.D.ENDINGS.closed"))

    check('нет ошибок страницы', not errs, errs)
print('ИТОГ: ' + ('ВСЁ ПРОШЛО' if not fails else 'ПРОВАЛЕНО: ' + ', '.join(fails)))
raise SystemExit(1 if fails else 0)
