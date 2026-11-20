#!/usr/bin/env python3
"""Проверка v3.16: плашка «Репутация у начальства» только в «Смена → Цех»; блок «Свои люди» только в цеху и дома;
связь настроения с сытостью.
Запуск: python3 tests/v310_test.py (нужны python3 и playwright)."""
import http.server, os, socketserver, threading, sys
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

SETUP = """(opt) => { G.headless = true; G.newState('Тест', {}, G.D.EDU[0].id); const s=G.s; s.car.job=Object.keys(G.D.JOBS)[0]; s.car.rank=1; s.car.shifts=10; s.car.probShifts=20; s.car.mgmtStage=1; s.phase=opt.phase; s.t.hour=opt.hour; s.loc=opt.loc||'home'; s.money=20000; s.st.energy=80; s.st.satiety=70; s.st.mood=70; s.flags.starveH=0; G.mq.length=0; G.cur=null; G.busy=false; return true; }"""

with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:%d/index.html'%port); pg.wait_for_timeout(800)
    ev=lambda js: pg.evaluate(js)
    def setup(**o): return pg.evaluate(SETUP,o)
    def page_html():
        ev("G.ui.tab='shift'; G.ui.render()")
        return ev("document.getElementById('screen').innerHTML")

    # ---- 1. «Репутация у начальства»: только Смена → Цех
    for loc, want in [('shop', True), ('admin', False), ('otk', False), ('yard', False), ('med', False), ('canteen', False)]:
        setup(phase='work', hour=10, loc=loc)
        h = page_html()
        check('репутация %s в локации «%s»' % ('есть' if want else 'скрыта', loc), ('Репутация у начальства' in h) == want)
    setup(phase='lunch', hour=12, loc='shop')
    check('репутация видна в цеху в обед', 'Репутация у начальства' in page_html())
    setup(phase='locker', hour=7, loc='locker')
    check('репутации нет в раздевалке', 'Репутация у начальства' not in page_html())
    for ph, hr in [('morning', 7), ('evening', 18), ('weekend', 12)]:
        setup(phase=ph, hour=hr)
        check('репутации нет дома (%s)' % ph, 'Репутация у начальства' not in page_html())

    # ---- 2. «Свои люди»: только в цеху и дома
    for loc, want in [('shop', True), ('admin', False), ('otk', False), ('yard', False), ('med', False), ('canteen', False)]:
        setup(phase='work', hour=10, loc=loc)
        h = page_html()
        check('«Свои люди» %s в локации «%s»' % ('есть' if want else 'скрыт', loc), ('Свои люди' in h) == want)
    setup(phase='evening', hour=18)
    check('«Свои люди» есть дома вечером', 'Свои люди' in page_html())
    setup(phase='weekend', hour=12)
    check('«Свои люди» есть дома в выходной', 'Свои люди' in page_html())
    setup(phase='locker', hour=7, loc='locker')
    check('«Свои люди» нет в раздевалке', 'Свои люди' not in page_html())

    # ---- 3. Настроение и сытость
    # скорость падения за один рабочий час
    def drop(sat, phase='work', hour=10):
        setup(phase=phase, hour=hour, loc='shop' if phase == 'work' else 'home')
        # расход сытости почти отключаем, чтобы измерять чистое влияние уровня сытости (0 движок заменил бы значением по умолчанию)
        ev("G.CONFIG.SAT_DRAIN_WORK=0.001; G.CONFIG.SAT_DRAIN_REST=0.001; G.s.st.satiety=%d; G.s.st.mood=80; G.s.flags.starveH=0; G.advance(1)" % sat)
        return 80 - ev("G.s.st.mood")
    fed, norm, hungry, starving = drop(85), drop(55), drop(30), drop(10)
    check('сытый: настроение падает медленнее среднего', fed < norm, (fed, norm))
    check('голодный: настроение падает быстрее среднего', hungry > norm, (hungry, norm))
    check('совсем голодный: падает ещё быстрее', starving > hungry, (starving, hungry))
    check('в норме настроение падает быстрее прежних 0.75/ч', norm > 0.75, norm)
    check('но не обвалом (в норме меньше 1.5 в час, голод — меньше 3)', norm < 1.5 and starving < 3, (norm, starving))
    d_work, d_home = drop(55, 'work', 10), drop(55, 'evening', 18)
    check('дома настроение падает медленнее, чем на смене', d_home < d_work, (d_home, d_work))

    # поел голодным — бонус к настроению
    setup(phase='evening', hour=19)
    ev("G.s.st.satiety=15; G.s.st.mood=50; G.s.flags.starveH=0; G.fx({satiety:25})")
    m_hungry = ev("G.s.st.mood") - 50
    setup(phase='evening', hour=19)
    ev("G.s.st.satiety=60; G.s.st.mood=50; G.s.flags.starveH=0; G.fx({satiety:25})")
    m_full = ev("G.s.st.mood") - 50
    check('поел, когда было голодно: настроение вырастает', m_hungry >= 3, m_hungry)
    check('поел будучи не голодным: бонуса нет', m_full < 1, m_full)

    # сон на голодный желудок
    def sleep_gain(sat):
        setup(phase='evening', hour=22)
        ev("G.s.st.satiety=%d; G.s.st.mood=50; G.s.day.peak=0; G.s.day.drank=false; G.sleep()" % sat)
        return ev("G.s.st.mood") - 50
    g_fed, g_hungry = sleep_gain(60), sleep_gain(10)
    check('сон на голодный желудок поднимает настроение слабее', g_hungry < g_fed, (g_hungry, g_fed))

    check('JS-ошибок на странице нет', not errs, errs)
    b.close()
print('\nИТОГО: %s' % ('ВСЁ ПРОШЛО' if not fails else 'ПРОВАЛЕНО: ' + '; '.join(fails)))
sys.exit(1 if fails else 0)
