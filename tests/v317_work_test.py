#!/usr/bin/env python3
"""Проверка V3.17: левый заказ (раз в смену, не всегда), воровство (шкафчик, тайник, выход, Егорыч),
раздел «Добыча» дома и продажа, ОТК, медпункт. Запуск: python3 tests/v317_work_test.py"""
import http.server, os, socketserver, threading
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
SETUP = """(o) => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s=G.s; s.car.job='tokar'; s.car.rank=(o&&o.rank!==undefined)?o.rank:3; s.car.shifts=60; s.money=(o&&o.money)||50000; s.phase=(o&&o.phase)||'work'; s.t.hour=(o&&o.hour)||9; s.loc=(o&&o.loc)||'shop'; s.st.energy=90; s.st.mood=80; s.st.know=60; s.instr.perv=1; G.mq.length=0; G.cur=null; G.busy=false; }"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:%d/index.html'%port); pg.wait_for_timeout(800)
    ev=lambda js,a=None: pg.evaluate(js,a) if a is not None else pg.evaluate(js)
    def setup(**o):
        pg.wait_for_timeout(200); ev(SETUP,o); ev("G.mq.length=0; G.cur=null; G.busy=false")
    def pick(rx):
        return ev("(rx)=>{const o=(G.cur&&G.cur.opts||[]).find(x=>new RegExp(rx).test(x.t)); if(!o) return 'NOTFOUND'; if(o.dis) return 'DIS:'+o.dis; G.choose(G.cur.opts.indexOf(o)); return 'OK'}",rx)
    def clear(): ev("G.mq.length=0; G.cur=null; G.busy=false; G.ui.hideModal&&G.ui.hideModal()")
    def why(id): return ev("(id)=>G.avail(G.ACT[id])",id)

    # ---------- Левый заказ
    setup(); ev("G.s.flags.swRoll={d:G.s.t.day,ids:[]}")
    check('левый заказ: нет заказов — кнопка недоступна', 'нет' in str(why('side_work')))
    ev("G.s.flags.swRoll={d:G.s.t.day,ids:['stool','key','knives']}")
    check('левый заказ: есть заказы — доступен', why('side_work') is None)
    ev("G.runAction('side_work')")
    check('меню заказов открылось', ev("!!G.cur && G.cur.title.indexOf('Левый заказ')>=0"))
    ev("G.fx({money:0})"); m0=ev("G.s.money")
    r=pick('Ключ на 32'); check('выбор заказа', r=='OK', r)
    r=pick('Быстро и тихо'); check('быстрый вариант', r=='OK', r)
    clear(); m1=ev("G.s.money"); sd=ev("G.s.day.swDone")
    check('заказ выполнен и отмечен: раз в смену', sd==1)
    check('после заказа повторно нельзя', 'уже' in str(why('side_work')))
    check('вся смена тратит время', ev("G.s.t.hour")>9)
    # разные дни — новый бросок
    ev("G.s.day.swDone=0; G.s.t.day+=1; G.s.flags.swRoll=null")
    seen=set(); empty=0
    for i in range(60):
        ev("G.s.t.day+=1; G.s.flags.swRoll=null"); ids=ev("(()=>{const a=G.s.flags; return a.swRoll?1:0})()")
        ids=ev("(()=>{G.s.day.swDone=0; G.avail(G.ACT.side_work); return G.s.flags.swRoll.ids})()")
        if not ids: empty+=1
        for x in ids: seen.add(x)
    check('заказов не всегда: бывают пустые дни', 5 <= empty <= 55, empty)
    check('разнообразие заказов (>=10 видов)', len(seen)>=10, len(seen))

    # ---------- Воровство
    setup(); ev("G.s.flags.lootRoll={d:G.s.t.day,offers:[]}")
    check('воровство: пусто — «всё приколочено»', 'приколочено' in str(why('loot')))
    ev("G.s.flags.lootRoll={d:G.s.t.day,offers:[{id:'wire',v:600},{id:'plate',v:1500}]}")
    check('воровство: есть варианты', why('loot') is None)
    ev("G.runAction('loot')"); check('меню воровства', ev("!!G.cur && G.cur.title.indexOf('плохо лежит')>=0"))
    pick('медного провода'); ev("G.cur.title")  # подробности
    ev("G.s.st.boss=100; G.s.st.coll=100")  # снижаем риск, чтобы кража прошла
    ev("G.rnd=()=>0.99")  # ни один шанс не срабатывает
    r=pick('спрятать в робу'); check('взять в робу', r=='OK', r)
    check('добыча в робе', ev("G.s.flags.loot.length")==1)
    check('показана подсказка про шкафчик', ev("!!G.cur && G.cur.text.indexOf('шкафчик')>=0"))
    clear()
    check('раз в смену: второй раз нельзя', 'уже' in str(why('loot')))
    # шкафчик
    ev("G.s.loc='locker'"); check('шкафчик: кнопка доступна', why('hide_loot') is None)
    ev("G.runAction('hide_loot')"); clear()
    check('добыча перешла в шкафчик', ev("[G.s.flags.loot.length,G.s.flags.lockerLoot.length]")==[0,1])
    check('кнопка «достать» доступна', why('unhide_loot') is None)

    # выход с завода: проходная с добычей в шкафчике (рандом отключён → не поймали)
    ev("G.s.phase='evening'; G.lootExit()")
    check('выход: окно выбора пути', ev("!!G.cur && G.cur.title.indexOf('как нести')>=0"))
    r=pick('Через проходную'); check('через проходную', r=='OK', r)
    check('добыча дома', ev("G.s.flags.stash.length")==1 and ev("G.s.flags.lootSold||0")==0, ev("JSON.stringify(G.s.flags.stash)"))
    clear()

    # проходная с добычей в робе — Егорыч заметит
    setup(); ev("G.s.flags.loot=[{n:'болты',v:100,sz:1}]; G.s.phase='evening'")
    ev("G.rnd=()=>0.0")  # любой шанс срабатывает
    rep0=ev("G.s.car.rep"); ev("G.lootExit()"); pick('Через проходную'); clear()
    check('Егорыч заметил: добыча конфискована', ev("G.s.flags.loot.length+G.s.flags.stash.length")==0 if ev("!!G.s.flags.stash") else ev("G.s.flags.loot.length")==0)
    check('Егорыч заметил: есть наказание', ev("(G.s.car.rep>0)||(G.s.money<50000)||G.s.end"), ev("[G.s.car.rep,G.s.money]"))

    # тайник за забором
    ev("G.rnd=()=>0.99")
    setup(loc='yard'); ev("G.s.flags.loot=[{n:'кабель',v:900,sz:2}]")
    check('двор: кнопка перекинуть', why('hole') is None)
    ev("G.runAction('hole')"); clear()
    check('добыча за забором', ev("[G.s.flags.loot.length,G.s.flags.fenceLoot.length]")==[0,1])
    ev("G.s.phase='evening'; G.lootExit()"); clear()
    check('после смены тайник забран домой', ev("[G.s.flags.fenceLoot.length,G.s.flags.stash.length]")==[0,1])

    # ---------- Дом → Добыча
    setup(phase='free', loc='home', hour=18)
    ev("G.s.flags.stash=[{n:'болты',v:100,sz:1},{n:'болты',v:120,sz:1},{n:'кабель',v:900,sz:2}]")
    check('дом: раздел «Добыча» доступен', why('stash') is None)
    ev("G.runAction('stash')")
    check('в разделе видно количество', ev("!!G.cur && G.cur.opts.some(o=>/болты ×2/.test(o.t))"))
    m0=ev("G.s.money"); pick('болты ×2'); pick('Продать всё'); clear()
    m1=ev("G.s.money")
    check('продажа дома по 55%', abs((m1-m0)-121)<=1, m1-m0)
    check('в запасе остался кабель', ev("G.s.flags.stash.length")==1)
    html=ev("G.stashCard()"); check('карточка дома есть', 'Добыча дома' in html)
    ev("G.s.loc='c_market'"); check('барахолка доступна', why('market_sell') is None)

    # ---------- ОТК
    setup(loc='otk'); check('ОТК: без работы сдать нечего', 'поработай' in str(why('otk_chat')))
    ev("G.s.day.ops=5; G.s.day.qsum=5*90; G.s.dwg.bad=false")
    check('ОТК: можно сдать', why('otk_chat') is None)
    st0=ev("[G.s.st.bm,G.s.money]")
    ev("G.runAction('otk_chat')"); pick('Подождать'); clear()
    st1=ev("[G.s.st.bm,G.s.money]")
    check('ОТК: клеймо A даёт премию и баллы', st1[1]-st0[1]>=350 and st1[0]>st0[0], [st0,st1])
    check('ОТК: раз в смену', 'принята' in str(why('otk_chat')))
    # кривой чертёж
    setup(loc='otk'); ev("G.s.day.ops=3; G.s.day.qsum=3*60; G.s.dwg.bad=true; G.s.dwg.fixed=false; G.rnd=()=>0.0")
    ev("G.runAction('otk_chat')")
    check('ОТК: заметила кривой чертёж', ev("!!G.cur && G.cur.title.indexOf('брак по чертежу')>=0"))
    pick('Переделать'); clear()
    check('ОТК: чертёж исправлен', ev("G.s.dwg.fixed")==True)
    ev("G.rnd=()=>0.5")

    # ---------- Медпункт
    setup(loc='med'); ev("G.s.st.health=50; G.s.st.tox=40; G.s.hang=1")
    check('медпункт: осмотр доступен', why('med_check') is None, why('med_check'))
    h0=ev("G.s.st.health"); ev("G.runAction('med_check')"); clear()
    check('медпункт: лечит', ev("G.s.st.health")>h0 and ev("G.s.hang")==0, ev("[G.s.st.health,G.s.hang]"))
    check('медпункт: раз в смену', 'осматривалась' in str(why('med_check')))
    check('таблетки выдают', why('med_pills') is None)
    ev("G.runAction('med_pills')"); check('таблетки получены', ev("Object.keys(G.s.inv).length")>=1)
    setup(loc='med'); ev("G.s.st.health=90; G.s.st.tox=0")
    check('здоровому больничный не дают', 'здоров' in str(why('med_note')))
    ev("G.s.st.health=30"); check('больному больничный доступен', why('med_note') is None)
    ev("G.runAction('med_note')"); pick('Оформить'); clear()
    check('больничный оформлен', ev("G.s.car.sickUntil")>=ev("G.s.t.day")+2)

    check('нет ошибок страницы', not errs, errs[:3])
    b.close()
print('ИТОГ:', 'ВСЁ ПРОШЛО' if not fails else 'ПРОВАЛЕНО: %s'%fails)
raise SystemExit(1 if fails else 0)
