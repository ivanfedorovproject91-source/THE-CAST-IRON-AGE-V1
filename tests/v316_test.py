#!/usr/bin/env python3
"""Проверка правок v3.16: время/настроение, лимиты смены, отпуск и сверхурочные, каталог жилья и ипотека,
подработки и такси, звонки без телефона, курсы, лоток питомца. Запуск: python3 tests/v316_test.py"""
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
SETUP = """(o) => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s=G.s; s.car.job='tokar'; s.car.rank=(o&&o.rank!==undefined)?o.rank:3; s.car.shifts=60; s.money=(o&&o.money)||50000; s.phase=(o&&o.phase)||'free'; s.t.hour=(o&&o.hour)||18; s.st.energy=90; s.st.mood=80; s.st.know=60; G.mq.length=0; G.cur=null; G.busy=false; }"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:%d/index.html'%port); pg.wait_for_timeout(800)
    ev=lambda js,a=None: pg.evaluate(js,a) if a is not None else pg.evaluate(js)
    def setup(**o):
        pg.wait_for_timeout(250); ev(SETUP,o); pg.wait_for_timeout(50); ev("G.mq.length=0; G.cur=null; G.busy=false")
    def pick(rx):
        return ev("(rx)=>{const o=(G.cur&&G.cur.opts||[]).find(x=>new RegExp(rx).test(x.t)); if(!o) return 'NOTFOUND'; if(o.dis) return 'DIS:'+o.dis; G.choose(G.cur.opts.indexOf(o)); return 'OK'}",rx)

    # 1-2. время и настроение
    setup()
    check('смайлик: весёлый/средний/грустный', ev("[G.moodFace(90),G.moodFace(50),G.moodFace(10)]")==['😄','😐','😢'])
    css=open(ROOT+'/css/style.css',encoding='utf-8').read()
    check('стили: будни зелёные, выходные синие', '.tb-clock.wk' in css and '.tb-clock.we' in css)
    ev("G.ui.render && G.ui.render()"); html=ev("document.body.innerHTML")
    check('в шапке есть день недели и класс wk/we', 'tb-clock' in str(html) and re.search(r'tb-clock (wk|we)',str(html)) is not None)

    # 3. раз в смену
    setup(phase='work',hour=9); ev("G.s.loc='shop'")
    r1=ev("(()=>{const a=G.ACT.oil; return [G.avail?G.avail(a):null]})()")
    ev("G.runAction('oil')"); 
    check('смазать станок 2-й раз в смену нельзя', ev("!!G.availWhy ? G.availWhy(G.ACT.oil) : (G.ACT.oil.once==='day' && !!G.s.day.done.oil)"))
    check('читать инструкции — раз в смену', ev("G.ACT.study_ws.once")=='day')

    # 4-5. отпуск в Заводоуправлении, сверхурочные в Цехе
    check('отпуск перенесён в Заводоуправление', ev("G.ACT.vacation.loc")=='admin' and ev("G.ACT.overtime.loc")=='shop' and ev("!!G.ACT.overtime.bottom"))
    setup(phase='work',hour=16); ev("G.s.loc='shop'; G.s.car.vac=10")
    ev("G.runAction('overtime')")
    check('сверхурочные продлевают смену на 2 часа', ev("G.shiftEnd()")>=19, ev("G.shiftEnd()"))
    wins=0
    for i in range(300):
        setup(phase='work',hour=10); ev("G.s.loc='admin'; G.s.car.vac=10; G.s.car.sickUntil=0; G.s.day.done={}; G.runAction('vacation'); G.mq.length=0; G.cur=null; G.busy=false")
        wins+= ev("G.s.car.vac<10 ? 1 : 0")
    check('отпуск одобряют редко (<20% из 300)', wins/300<0.2, wins)

    # 6. жильё
    setup(money=5000000,rank=3)
    ev("G.realtyMenu()"); check('каталог недвижимости открывается', ev("G.cur.title")=='🏘️ НЕДВИЖИМОСТЬ' and ev("G.cur.opts.length")>=9, ev("G.cur&&G.cur.title"))
    ev("G.cur=null; G.mq.length=0"); setup(money=5000000,rank=3)
    ev("G.realtyMenu()"); pick('Однушка'); pick('Купить сразу')
    check('покупка за наличные: деньги списаны, жильё своё', ev("G.s.money")==5000000-1800000 and ev("G.s.own.flat")==1 and ev("G.s.flags.realty")=='one', ev("[G.s.money,G.s.own.flat,G.s.flags.realty]"))
    check('расходы своего жилья соответствуют объекту', ev("G.HOUSING.own.rent")==2200, ev("G.HOUSING.own.rent"))
    ev("G.cur=null; G.mq.length=0; G.busy=false; G.realtyMenu()"); r1=pick('Продать текущее'); r2=pick('^Продать')
    check('продажа возвращает 90% цены', ev("G.s.money")==5000000-1800000+1620000 and ev("!G.s.own.flat"), [r1,r2,ev("[G.s.money,G.s.own.flat]")])
    setup(money=900000,rank=4)
    ev("G.realtyMenu()"); rs=[pick('Студия'),pick('В ипотеку'),pick('20 лет')]; r=pick('Оформить')
    ln=ev("(G.s.loans||[]).find(l=>l.type==='mortgage')")
    check('ипотека на студию оформлена (взнос 15% списан)', r=='OK' and ln and ev("G.s.own.flat")==1 and ev("G.s.money")==900000-165000, [rs,r,ln,ev("G.s.money")])
    setup(money=100,rank=0); ev("G.realtyMenu()"); pick('Элитная')
    check('стажёру ипотеку не дают', 'DIS' in pick('В ипотеку'))

    # 7. подработки
    setup(); ev("G.s.flags.sideRoll=null; G.s.day.sideDone=0")
    ev("G.sideMenu()"); check('меню подработки открывается (6 видов + выход)', ev("G.cur.opts.length")==7, ev("G.cur.opts.map(o=>o.t)"))
    check('нет «Подбора допусков» в домашней халтуре', not any('допуск' in t for t in ev("G.cur.opts.map(o=>o.t)")))
    ev("G.cur=null"); setup(); ev("G.s.flags.sideRoll={d:G.s.t.day,a:{weld:true,fix:true,courier:true,loader:true,tutor:true,taxi:true}}")
    check('такси без машины недоступно', 'машина' in str(ev("G.sideWhy('taxi',1)")), ev("G.sideWhy('taxi',1)"))
    ev("G.s.flags.sideRoll={d:G.s.t.day,a:{weld:false,fix:false,courier:false,loader:false,tutor:false,taxi:false}}")
    check('без заказов кнопка «Халтура на дому» недоступна', 'заказов нет' in str(ev("G.ACT.side_home.req(G.s)")))
    changes=0
    for k in range(40):
        setup(money=3000000); ev("G.s.t.day=%d"%(k+3)); ev("G.s.flags.sideRoll=null; G.s.day.sideDone=0")
        changes+=ev("(()=>{const a=Object.assign({},G.s.flags.sideRoll||{}); G.sideWhy('weld'); return G.s.flags.sideRoll.a.weld?0:1})()")
    check('заказы бывают не каждый день', 0<changes<40, changes)
    # такси с машиной
    setup(money=3000000); ev("G.s.own.phone2=1")
    ev("G.s.own[G.cars.ORDER[0]]=1"); ev("G.s.t.hour=14; G.s.flags.sideRoll={d:G.s.t.day,a:{taxi:true,weld:false,fix:false,courier:false,loader:false,tutor:false}}; G.s.day.sideDone=0; G.cars.state().fuel=40")
    m0=ev("G.s.money"); e0=ev("G.s.st.energy")
    check('с машиной и смартфоном такси доступно', ev("G.sideWhy('taxi',2)") is None, ev("G.sideWhy('taxi',2)"))
    ev("G.sideMenu()"); r1=pick('Таксовать'); r2=pick('^2 ч')
    dm=ev("G.s.money")-m0
    check('такси за 2 часа: выручка и штрафы в разумных пределах', r1=='OK' and r2=='OK' and -1500<=dm<=2000, [r1,r2,dm])
    check('такси тратит энергию и бензин', ev("G.s.st.energy")<e0 and ev("G.cars.state().fuel")<40, [e0,ev("G.s.st.energy"),ev("G.cars.state().fuel")])
    check('после подработки в этот день вторая недоступна', 'уже' in str(ev("G.ACT.side_home.req(G.s)")))

    # 8. звонки без телефона
    setup(); ev("delete G.s.own.phone1; delete G.s.own.phone2; delete G.s.own.phone3")
    check('без телефона hasPhone=false', ev("G.hasPhone()")==False)
    ev("G.s.own.phone1=1"); check('с телефоном hasPhone=true', ev("G.hasPhone()")==True)
    src=open(ROOT+'/js/data_events.js',encoding='utf-8').read()
    check('звонок мамы только при телефоне', "E('mom', { where: ['evening'], w: 2, cd: 7, cond: () => G.hasPhone()" in src)

    # 9. курсы
    setup(rank=1,money=100000)
    ev("G.coursesMenu()"); check('курс повышения недоступен раньше времени', 'Рано' in pick('Р4') or 'DIS' in pick('Р4'))
    ev("G.cur=null; G.mq.length=0"); setup(rank=1,money=100000); ev("G.coursesMenu()"); pick('Р2'); pick('Записаться')
    check('запись на курс списывает деньги', ev("G.s.money")==100000-3000 and ev("!!G.s.flags.course"), ev("G.s.money"))
    n=0
    for i in range(12):
        setup(rank=1,money=100000,hour=18,phase='evening') if i==0 else None; ev("G.s.phase='evening'; G.s.flags.course=G.s.flags.course||{id:'c_r2',done:0}")
        ev("G.s.flags.course=G.s.flags.course||{id:'c_r2',done:0}; G.s.st.energy=90; G.s.st.mood=80; G.s.t.hour=18; G.mq.length=0; G.cur=null; G.busy=false; G.coursesMenu()")
        pick('Пойти на занятие'); n+=1
        if ev("G.hasCert('c_r2')"): break
    check('курс заканчивается экзаменом и выдаёт корочку (за ≤12 занятий)', ev("G.hasCert('c_r2')"), n)
    setup(rank=2); ev("G.s.own={}; G.s.car.certs=['pogr']")
    check('«Газоспасатель» и «Погрузчик» имеют описанный эффект', 'травмы' in open(ROOT+'/js/courses.js',encoding='utf-8').read() and 'pogr' in open(ROOT+'/js/side_jobs.js',encoding='utf-8').read())

    # 10. лоток
    setup(); ev("G.s.flags.catHome=1; G.s.flags.cat=1; G.petMenu && G.petMenu('cat')")
    check('в меню Чугунка есть «Убрать туалет»', any('Убрать туалет' in t for t in ev("G.cur.opts.map(o=>o.t)")))
    check('в блоке «Дом»/Чугунок есть действие «Убрать туалет»', ev("G.ACT.cat_litter && G.ACT.cat_litter.g")=='Чугунок')
    ev("G.cur=null;G.mq.length=0"); ev("G.s.flags.litterDirt=0")
    for d in range(1,8):
        ev("G.litterNight()")
        ev("G.mq.length=0; G.cur=null; G.busy=false")
        if d==3: check('3 дня без уборки: падает чистота', ev("G.s.st.neat")<100)
    check('неделя без уборки: кот уходит', ev("!G.s.flags.catHome"))
    setup(phase='evening'); ev("G.s.flags.catHome=1; G.s.flags.cat=1; G.s.flags.litterDirt=2; G.mq.length=0; G.cur=null")
    ev("G.litterGame()")
    check('мини-игра лотка открывается', ev("!!document.querySelector('#lt-tray')"))
    ev("""(()=>{const t=document.querySelector('#lt-tray'); const wc=document.querySelector('#lt-wc');
       [...t.querySelectorAll('button')].forEach(b=>{b.click(); wc.click();});})()""")
    check('мини-игра: все комки убраны → лоток чист', ev("G.litterDirt()")==0 and ev("!document.querySelector('#lt-tray')"), ev("G.litterDirt()"))

    check('нет ошибок страницы', not errs, errs[:3])
print('ИТОГ:', 'ВСЁ ПРОШЛО' if not fails else 'ПРОВАЛЕНО: %s'%fails)
raise SystemExit(1 if fails else 0)
