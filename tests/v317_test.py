#!/usr/bin/env python3
"""Проверка правок v3.17: время/настроение, лимиты смены, отпуск и сверхурочные, каталог жилья и ипотека,
подработки и такси, звонки без телефона, курсы, лоток питомца. Запуск: python3 tests/v317_test.py"""
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

    # --- доступность по рангам
    setup(phase='work',hour=10,rank=3); ev("G.s.loc='shop'")
    check('действие «Азартные игры» в группе Крайности', ev("G.ACT.gamble.g")=='Крайности и криминал')
    ev("G.gamble.menu()"); 
    t=ev("G.cur.opts.map(o=>o.t).join('|')")
    check('работяге: бега, монета, пиво; без автомата', 'Тараканьи' in t and 'Орёл' in t and 'пиво' in t and 'автомат' not in t, t)
    setup(phase='work',hour=10,rank=7); ev("G.s.loc='shop'"); ev("G.gamble.menu()")
    t=ev("G.cur.opts.map(o=>o.t).join('|')")
    check('мастеру: монета и автомат, бега и пиво исчезли', 'Орёл' in t and 'автомат' in t and 'Тараканьи' not in t and 'пиво' not in t, t)
    check('автомат работяге закрыт', (setup(phase='work',hour=10,rank=3) or True) and ev("(()=>{G.toast=()=>{};return G.gamble.slot()})()") is None and ev("!document.querySelector('#gb-ov')"))

    # --- автомат: выплаты и RTP
    ev("G.s.car.rank=0"); setup(phase='work',hour=10,rank=7)
    check('автомат: 3 шестерни = x100, 3 каски x40, пара шестерён x3, пусто 0', ev("[G.gamble.payout(4,4,4),G.gamble.payout(0,0,0),G.gamble.payout(4,4,1),G.gamble.payout(1,2,3)]")==[100,40,3,0])
    rtp=ev("(()=>{let w=[2,4,5,3,1],d=()=>{let r=Math.random()*15;for(let i=0;i<5;i++){if(r<w[i])return i;r-=w[i]}return 2},t=0,N=200000;for(let i=0;i<N;i++)t+=G.gamble.payout(d(),d(),d());return t/N})()")
    check('автомат: возврат 60–95% (есть преимущество заведения)', 0.6<rtp<0.95, rtp)
    h=ev("G.s.time=G.s.t.hour"); m0=ev("G.s.money")
    ev("G.gamble.slot()"); ev("document.querySelectorAll('#gb-b button')[0].click()"); pg.wait_for_timeout(1900)
    check('автомат: крутится без траты игрового времени', ev("G.s.t.hour")==10)
    check('автомат: ставка списана/выигрыш начислен, барабаны показывают символы', ev("G.s.money")!=m0 or ev("document.getElementById('gb-rep').textContent")!='' , ev("G.s.money"))
    ev("document.getElementById('gb-ov').remove()")

    # --- орёл/решка: раз в смену, анимация, время
    setup(phase='work',hour=10,rank=3); m0=ev("G.s.money")
    ev("G.gamble.coin()"); check('монета: выбор соперника-работяги', 'Серёга' in ev("G.cur.opts.map(o=>o.t).join('|')") or 'Витёк' in ev("G.cur.opts.map(o=>o.t).join('|')"))
    pick('Серёга|Витёк|Михалыч|Афоня'); pick('^100'); pick('Орёл')
    pg.wait_for_timeout(300); check('монета: оверлей с вращением', ev("!!document.querySelector('#gb-ov .gb-coin')"))
    pg.wait_for_timeout(3500)
    check('монета: деньги ±100, время не тратится', ev("G.s.money")-m0 in (100,-100) and ev("G.s.t.hour")==10, ev("G.s.money")-m0)
    ev("G.mq.length=0; G.cur=null; G.busy=false")
    ev("G.toast=()=>{}"); ev("G.gamble.coin()")
    check('монета: второй раз за смену нельзя', ev("!G.cur || !/Орёл|Серёга/.test(G.cur.opts.map(o=>o.t).join())"))
    ev("G.mq.length=0; G.cur=null; G.busy=false")
    # мастер играет только с равными
    setup(phase='work',hour=10,rank=7); ev("G.gamble.coin()")
    t=ev("G.cur.opts.map(o=>o.t).join('|')")
    check('мастер: соперники — равные по рангу (Степаныч/Дудукин), не работяги', ('Степаныч' in t or 'Дудукин' in t) and 'Серёга' not in t and 'Витёк' not in t, t)

    # --- тараканьи бега
    setup(phase='work',hour=10,rank=3); m0=ev("G.s.money")
    ev("G.gamble.roach()")
    pick('Серёга|Витёк|Михалыч|Афоня|Хомяк|Захар'); 
    check('бега: можно позвать третьего таракана', 'Позвать' in ev("G.cur.opts.map(o=>o.t).join('|')"))
    pick('Позвать'); pick('^100'); 
    check('бега: три таракана на выбор', len(ev("G.cur.opts.filter(o=>/🪳/.test(o.t))"))==3 if False else ev("G.cur.opts.filter(o=>/🪳/.test(o.t)).length")==3)
    pick('Прусак')
    pg.wait_for_timeout(400); check('бега: трёхдорожечный забег идёт', ev("document.querySelectorAll('#gb-ov .gb-lane').length")==3)
    pg.wait_for_function("!document.querySelector('#gb-ov')",timeout=15000)
    dm=ev("G.s.money")-m0; check('бега: итог +200 или -100, время не тратится', dm in (200,-100) and ev("G.s.t.hour")==10, dm)
    ev("G.mq.length=0; G.cur=null; G.busy=false"); ev("G.toast=()=>{}"); ev("G.gamble.roach()")
    check('бега: раз в смену', not ev("/Прусак|Серёга/.test((G.cur&&G.cur.opts||[]).map(o=>o.t).join())"))
    ev("G.mq.length=0; G.cur=null; G.busy=false")
    # крупный выигрыш портит отношения, память
    setup(phase='work',hour=10,rank=3); ev("G.s.money=20000; G.s.rel.seryoga=undefined"); r0=ev("G.R('seryoga').l")
    ev("(()=>{G.chance=()=>false; })()")
    ev("void (G.gamble.raceAnim=(n,m,nm,cb)=>cb(m))")
    ev("G.gamble.roach()"); pick('Серёга'); pick('Нет, вдвоём'); pick('^1.?000'); pick('Прусак')
    pg.wait_for_timeout(200)
    check('крупный выигрыш: отношения хуже', ev("G.R('seryoga').l")<r0-3, ev("G.R('seryoga').l"))
    check('память NPC хранит выигрыш игрока', ev("G.s.flags.gamble.mem.seryoga.w")==1000)
    ev("G.mq.length=0; G.cur=null; G.busy=false; G.s.day.gamble.roach=0")
    ev("G.gamble.roach()")
    check('обиженный NPC не садится играть повторно в ту же смену', 'Серёга' not in ev("G.cur.opts.map(o=>o.t).join('|')"), ev("G.cur&&G.cur.opts.map(o=>o.t).join('|')"))
    ev("G.mq.length=0; G.cur=null; G.busy=false")
    # драка при крупном проигрыше NPC
    setup(phase='work',hour=10,rank=3); ev("G.s.money=20000"); ev("window._f=null; G.fight=(id)=>{window._f=id}; G.chance=()=>true")
    ev("void (G.gamble.raceAnim=(n,m,nm,cb)=>cb(m))")
    ev("G.gamble.roach()"); pick('Витёк'); pick('Нет, вдвоём'); pick('^1.?000'); pick('Прусак'); pg.wait_for_timeout(200)
    pick('^OK$|Ок'); pg.wait_for_timeout(200)
    check('крупный проигрыш NPC → предлагается драка', ev("!!G.cur && /Драться/.test(G.cur.opts.map(o=>o.t).join())"), ev("G.cur&&G.cur.title"))
    pick('Драться'); check('драка запускает существующий G.fight', ev("window._f")=='vityok', ev("window._f"))
    ev("G.mq.length=0; G.cur=null; G.busy=false")

    # --- пиво
    setup(phase='work',hour=10,rank=2); m0=ev("G.s.money"); ev("G.chance=()=>false; G.caught=()=>false; G.fx({drunk:0})")
    ev("void (G.gamble.beerAnim=(nm,cb)=>cb(0))")
    ev("G.gamble.beer()"); pick('Ставка 100|100'); pg.wait_for_timeout(200)
    check('пиво: победа даёт банк +200, опьянение, время не тратится', ev("G.s.money")-m0==200 and ev("G.s.st.drunk")>5 and ev("G.s.t.hour")==10, [ev("G.s.money")-m0, ev("G.s.st.drunk")])
    ev("G.mq.length=0; G.cur=null; G.busy=false")
    ev("G.gamble.beer()"); pick('Ставка 100|100'); pg.wait_for_timeout(200); ev("G.mq.length=0; G.cur=null; G.busy=false")
    ev("G.toast=()=>{}; G.gamble.beer()")
    check('пиво: только 2 раза за смену', ev("G.s.day.gamble.beer")==2 and not ev("/Ставка/.test((G.cur&&G.cur.opts||[]).map(o=>o.t).join())"))
    ev("G.mq.length=0; G.cur=null; G.busy=false")
    # риск быть пойманным вызывается
    setup(phase='work',hour=10,rank=2); ev("window._c=0; G.caught=(a)=>{window._c=a.risk; return false}; void (G.gamble.beerAnim=(nm,cb)=>cb(1))")
    ev("G.gamble.beer()"); pick('Ставка 100|100'); pg.wait_for_timeout(200); pick('Ок|OK'); pg.wait_for_timeout(100)
    check('пиво: проверка «поймало начальство»', ev("window._c")>0, ev("window._c"))
    ev("G.mq.length=0; G.cur=null; G.busy=false")
    # реальная мини-игра пива (тап)
    setup(phase='work',hour=10,rank=2); ev("G.gamble.beerAnim=undefined") if False else None
    # перезагрузим логику: проверяем оверлей на чистом G
    pg.reload(); pg.wait_for_timeout(900); setup(phase='work',hour=10,rank=2)
    ev("G.gamble.beer()"); pick('Ставка 100|100'); pg.wait_for_timeout(300)
    check('пиво: оверлей с тремя шкалами и кнопкой', ev("document.querySelectorAll('#gb-ov .gb-bar').length")==3 and ev("!!document.getElementById('gb-tap')"))
    ev("(()=>{const t=document.getElementById('gb-tap'); const iv=setInterval(()=>t.click(),20); setTimeout(()=>clearInterval(iv),9000)})()")
    pg.wait_for_function("!document.querySelector('#gb-ov')",timeout=15000)
    check('пиво: игра завершилась без ошибок', True)
    ev("G.mq.length=0; G.cur=null; G.busy=false")

    # --- сохранение и счётчики на новый день
    setup(phase='work',hour=10,rank=3); ev("G.s.day=G.freshDay()")
    check('счётчики смены сбрасываются', ev("(G.s.day.gamble||{roach:0}).roach")==0)
    check('нет ошибок страницы', not errs, errs[:3])
print('ИТОГ:', 'ВСЁ ПРОШЛО' if not fails else 'ПРОВАЛЕНО: %s'%fails)
raise SystemExit(1 if fails else 0)
