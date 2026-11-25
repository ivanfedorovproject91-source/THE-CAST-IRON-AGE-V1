#!/usr/bin/env python3
"""Стажировка: при стандартном PACE (1.5) срок остаётся неделей (5 смен), экзамен стартует сразу после пятой смены,
зависший флаг экзамена не блокирует переход, а экраны показывают тот же срок, что и код.
Запуск: python3 tests/probation_test.py (нужны python3 и playwright)."""
import http.server, os, re, socketserver, threading
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
SETUP = """() => { G.headless = true; G.newState('Тест', G.defaultAv(), G.D.EDU[0].id); const s=G.s; s.car.job='podsob'; s.car.rank=0; s.car.shifts=0; s.car.probShifts=0; s.instr.perv=1; s.instr.vvod=1; s.phase='work'; s.t.hour=9; s.loc='shop'; G.mq.length=0; G.cur=null; G.busy=false; G.toast=()=>{}; return G.CONFIG.PACE; }"""
SHIFT = """() => { const s=G.s; s.phase='work'; s.t.hour=G.shiftEnd(); s.day.ops=3; s.day.qsum=240; s.day.viol=false; G.endShift(); }"""
# закрывает окна очереди: конец смены → finishShift; экзамен не проходим, смотрим только факт старта
CLOSE = """() => { let g=0; const t=[]; while (G.cur && g++<10) { t.push(G.cur.title||''); if (G.cur._ladder) break; G.choose(0); } return t; }"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context().new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    def patch(route):  # открываем банки вопросов, чтобы ответить на экзамене верно
        body = route.fetch().text(); i = body.index('const standing')
        route.fulfill(status=200, content_type='application/javascript', body=body[:i] + 'window.__QB=[].concat(WORK_Q,WORK_HARD);\n' + body[i:])
    pg.route(re.compile(r'.*career_ladder\.js.*'), patch)
    pg.goto('http://127.0.0.1:%d/index.html'%port); pg.wait_for_timeout(1000)
    ev=pg.evaluate
    ev('()=>{window.__M0=G.modal;}')
    pace=ev(SETUP); check('в конфиге стоит PACE 1.5 (проверяем именно стандартный темп)', pace==1.5, pace)
    started=None
    for i in range(1,9):
        ev(SHIFT); titles=ev(CLOSE)
        if any('Экзамен перед повышением'==t for t in titles): started=i; break
    check('экзамен на повышение с стажировки открывается после 5-й смены', started==5, started)
    # экран «Стажировка: N смен до экзамена» считает от реальных 5 смен
    ev(SETUP); ev("G.s.car.shifts=3; G.s.car.probShifts=3")
    check('rankInfo: до экзамена 2 смены', '2 смен' in ev("G.rankInfo().line"), ev("G.rankInfo().line"))
    # зависший флаг экзамена (окон экзамена нет) не должен навсегда блокировать переход
    ev(SETUP); ev("() => { const c=G.s.car; c.shifts=6; c.ladderPending=1; G.mq.length=0; G.cur=null; G.busy=false; G.modal=function(o){window.__m=(window.__m||[]).concat([o.title]);}; G.career.checkLadder(); }")
    check('после зависшего флага экзамен запускается снова', ev("G.s.car.ladderPending")==1 and 'Экзамен перед повышением' in ev("window.__m||[]"), ev("[G.s.car.ladderPending, window.__m]"))
    # переход со стажёра на разряд 1 при верном экзамене (настоящая очередь окон)
    ev('()=>{G.modal=window.__M0; window.__m=[];}'); ev(SETUP); ev("() => { const c=G.s.car; c.shifts=5; G.career.checkLadder(); }")
    for _ in range(40):
        if not ev("!!G.cur"): break
        ev("""() => { const m=G.cur; const t=m.title||''; let i=0;
            if (/вопрос \\d\\/5/.test(t)) { const L=window.__QB||[]; const labels=m.opts.map(o=>o.t); const q=L.find(q=>q[1].every(x=>labels.indexOf(x)>=0)); if(q) i=labels.indexOf(q[1][q[2]]); }
            if (m._relic) { const mm=(m.text||'').match(/data-id="([^"]+)"/); if (mm) G.relics.select(m._relic, mm[1]); }
            if (t==='Экзамен перед повышением') i=m.opts.length-1;
            G.choose(Math.min(i, m.opts.length-1)); }""")
    check('верный экзамен переводит стажёра в разряд 1', ev("G.s.car.rank")==1, ev("[G.s.car.rank, G.s.car.ladderAttempts]"))
    check('нет ошибок страницы', not errs, errs[:3])
    b.close()
print('\nFAILS:',fails) if fails else print('\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ')
raise SystemExit(1 if fails else 0)
