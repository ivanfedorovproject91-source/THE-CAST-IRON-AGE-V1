#!/usr/bin/env python3
"""Проверка v3.15: охранник для мастеров, плашки на работе, похмелье и настроение, окно «Вы на грани»,
Баба Нюра, кот, «Помыться», «Отчибучить», приглашения друзей.
Запуск: python3 tests/v39_test.py (нужны python3 и playwright)."""
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
def src(p): return open(os.path.join(ROOT,p),encoding='utf-8').read()

SETUP = """(opt) => { G.headless = true; G.newState('Тест', {}, G.D.EDU[0].id); const s=G.s; s.car.job=Object.keys(G.D.JOBS)[0]; s.car.rank=(opt&&opt.rank!==undefined)?opt.rank:1; s.car.shifts=(opt&&opt.shifts!==undefined)?opt.shifts:10; s.car.probShifts=20; s.car.mgmtStage=(opt&&opt.stage)||1; s.phase=(opt&&opt.phase)||'evening'; s.t.hour=(opt&&opt.hour)||18; s.loc=s.phase==='work'?'shop':'home'; s.money=(opt&&opt.money)||20000; s.st.energy=80; s.st.satiety=70; G.mq.length=0; G.cur=null; G.busy=false; return true; }"""

with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:%d/index.html'%port); pg.wait_for_timeout(800)
    ev=lambda js,arg=None: pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
    def setup(**o): return pg.evaluate(SETUP,o)
    def opts():  return ev("(G.cur&&G.cur.opts||[]).map(o=>o.t)")
    def click(rx):
        return ev("(function(rx){const o=(G.cur&&G.cur.opts||[]).find(x=>new RegExp(rx).test(x.t)); if(!o) return 'NOTFOUND'; if(o.dis) return 'DIS:'+o.dis; G.choose(G.cur.opts.indexOf(o)); return 'OK';})('%s')"%rx)
    reset = lambda: ev("G.mq.length=0; G.cur=null; G.busy=false")

    # ---- 1. охранник
    setup(rank=6, phase='morning', hour=7)
    ev("G.s.st.drunk=70; G.s.hang=2; G.s.st.neat=5; G.s.flags.housing=undefined; window.__ok=0; G._gateNext=()=>{window.__ok=1}; G.s.day={...G.s.day}; G.gate();")
    check('мастер: пьяного и грязного пропускают без разговора', ev("window.__ok===1 && !G.cur"), ev("[window.__ok, !!G.cur]"))
    setup(rank=6, phase='morning', hour=7)
    ev("G.s.day.passRoll=undefined; G.s.st.energy=5; window.__ok=0; G._gateNext=()=>{window.__ok=1}; G.gate();")
    check('мастер: «забытого пропуска» нет, даже при нулевой энергии', ev("window.__ok===1 && !G.cur"))
    setup(rank=1, phase='morning', hour=7)
    ev("G.s.day.passRoll=1; G.s.st.drunk=70; window.__ok=0; G._gateNext=()=>{window.__ok=1}; G.gate();")
    check('рабочий: пьяного по-прежнему не пускают', ev("window.__ok===0 && !!G.cur"))

    # ---- 4. заголовок приветствия
    t = src('js/data_actions.js')
    check('приветствие: «Привет, работяга!»', 'Привет, работяга!' in t and 'Добро пожаловать на завод' not in t)

    # ---- 9. помыться
    setup(phase='evening')
    ev("G.runAction('shower')")
    why = ev("G.avail(G.ACT.shower)")
    check('«Помыться» нельзя второй раз за день', bool(why), why)
    ev("G.s.t.day+=1; G.s.day=G.freshDay()")
    check('«Помыться» снова доступно на следующий день', ev("G.avail(G.ACT.shower)") is None)

    # ---- 3. плашки и документация
    setup(rank=1, phase='evening'); ev("G.ui.tab='shift'")
    h = ev("G.shiftTop()")
    check('дома нет плашки «Нужно расписаться»', 'Нужно расписаться' not in h)
    check('дома нет плашки «Репутация у начальства»', 'Репутация у начальства' not in h)
    setup(rank=1, phase='work', hour=10); ev("G.ui.tab='shift'")
    h = ev("G.shiftTop()")
    check('на работе плашка «Нужно расписаться» есть', 'Нужно расписаться' in h)
    check('на работе плашка «Репутация у начальства» есть', 'Репутация у начальства' in h)
    setup(rank=1, shifts=25, phase='work', hour=10)
    bad = ev("G.bossStanding().score")
    ev("G.DOCS.forEach(d=>{G.s.flags.docs=G.s.flags.docs||{}; G.s.flags.docs[d.id]=1})")
    good = ev("G.bossStanding().score")
    check('долгое неподписание портит репутацию у начальства', good > bad, (bad, good))

    # ---- 5. похмелье
    setup(phase='morning', hour=7)
    ev("G.s.hang=2; G.s.st.mood=95; G.fx({mood:5})")
    check('тяжёлое похмелье: настроение ≤ 35', ev("G.s.st.mood")<=35, ev("G.s.st.mood"))
    ev("G.s.hang=1; G.s.st.mood=90; G.fx({mood:5})")
    check('лёгкое похмелье: настроение ≤ 55', ev("G.s.st.mood")<=55, ev("G.s.st.mood"))
    ev("G.s.hang=0; G.s.st.mood=60; G.fx({mood:20})")
    check('без похмелья настроение растёт свободно', ev("G.s.st.mood")>=80, ev("G.s.st.mood"))
    setup(phase='evening', hour=23)
    ev("G.s.day.peak=80; G.s.day.drank=true; G.s.st.mood=100; G.sleep()")
    check('после тяжёлого перепоя настроение утром ≤ 35', ev("G.s.hang===2 && G.s.st.mood<=35"), ev("[G.s.hang, G.s.st.mood]"))

    # ---- 6. настроение: голод больше не обрывает шкалу, окно «Вы на грани»
    setup(phase='evening', hour=18)
    ev("G.s.flags.starveH=30; G.s.st.satiety=70; G.s.st.mood=100; G.advance(1)")
    check('при нормальной сытости настроение не падает до 6', ev("G.s.st.mood")>80, ev("G.s.st.mood"))
    ev("G.s.flags.starveH=30; G.s.st.satiety=15; G.s.st.mood=100; G.advance(1)")
    check('при настоящем голоде настроение падает плавно, а не обрывом', ev("G.s.st.mood")>85, ev("G.s.st.mood"))
    reset(); setup(phase='morning', hour=7); ev("G.s.flags.v38=undefined")
    ev("G.s.st.mood=8; G.fx({mood:0})"); o = opts()
    check('окно настроения: есть кнопка «Ок»', 'Ок' in o, o)
    check('окно настроения: нет «Понял(а), исправлюсь»', not any('исправлюсь' in x for x in o), o)
    check('окно настроения: выйти на воздух утром доступно', not ev("(G.cur.opts.find(o=>/воздух/.test(o.t))||{}).dis"))
    m0 = ev("G.s.st.mood"); click('воздух'); m1 = ev("G.s.st.mood")
    check('«Выйти на воздух» поднимает настроение', m1 > m0, (m0, m1))
    # разговор без телефона
    reset(); setup(phase='evening', hour=18); ev("G.s.st.mood=15; G.s.inv={}; G.moodTalk()")
    o = opts(); check('разговор возможен без телефона', len(o) > 1 and not any('Позвонить' in x for x in o), o)
    m0 = ev("G.s.st.mood"); click('соседу'); m1 = ev("G.s.st.mood")
    check('поговорить дома без телефона поднимает настроение', m1 > m0, (m0, m1))
    reset(); setup(phase='work', hour=10); ev("G.s.st.mood=15; G.moodTalk()")
    o = opts(); check('на работе можно поговорить с коллегами', len(o) >= 2, o)
    m0 = ev("G.s.st.mood"); click('Выговориться|коллегами'); m1 = ev("G.s.st.mood")
    check('разговор на работе поднимает настроение', m1 > m0, (m0, m1))

    # ---- 7. Баба Нюра
    reset(); setup(phase='evening', hour=18); ev("G.R('nyura').met=true; G.R('nyura').l=40")
    check('в общаге Баба Нюра рядом', ev("G.nyuraHere() && !G.npcGone('nyura')"))
    ev("G.nyuraMenu()"); o = opts()
    check('меню соседки: чай, помощь, пирожки, сплетни (не «Позвонить»)', any('чай' in x for x in o) and any('помощь' in x or 'Помочь' in x for x in o) and not any('Позвонить' in x for x in o), o)
    m0 = ev("G.s.st.mood"); click('чай'); check('чай с бабой Нюрой поднимает настроение', ev("G.s.st.mood")>m0)
    # работа от Нюры: подбираем день, когда у неё есть дело
    got = False
    for d in range(60):
        reset(); setup(phase='evening', hour=17); ev("G.R('nyura').met=true; G.R('nyura').l=60; G.s.t.day=%d"%(100+d))
        ev("G.nyuraMenu()")
        if ev("!!G.cur.text && /Помочь:/.test(G.cur.opts.map(o=>o.t).join('|'))"):
            m0 = ev("G.s.money"); click('Помочь'); got = ev("G.s.money")>m0; break
    check('Баба Нюра даёт подработку и платит', got)
    reset(); setup(phase='evening'); ev("G.R('nyura').met=true; G.R('nyura').l=80; G.s.flags.friends=['nyura']")
    check('Нюра в «Своих людях», пока живёшь в общаге', ev("G.friends().indexOf('nyura')>=0"))
    ev("G.s.flags.housing='room'")
    check('после переезда Баба Нюра пропадает', ev("G.npcGone('nyura') && G.friends().indexOf('nyura')<0 && !G.isPresent('nyura')"))
    reset(); ev("G.nyuraMenu()"); check('после переезда к ней не зайти', 'Ок' in opts() and ev("/осталась в общаге/.test(G.cur.text)"))
    reset(); ev("G.s.flags.housing='dorm'")
    check('вернулся в общагу — Нюра на месте', ev("G.nyuraHere()"))

    # ---- 8. кот
    reset(); setup(phase='evening'); ev("G.s.flags.catHome=1; G.s.flags.cat=1; G.petMenu('cat')")
    m0 = ev("G.s.st.mood=40; G.s.st.mood"); click('Погладить'); m1 = ev("G.s.st.mood")
    check('Чугунок: погладить даёт заметное настроение (≥ +5)', m1 - m0 >= 5, (m0, m1))
    check('Чугунок: сумма бонуса показана в окне', ev("/🙂/.test((G.cur&&G.cur.text)||'')"))
    check('Чугунок: карточка на вкладке «Дом»', 'Чугунок дома' in ev("G.shiftTop()"))
    # не бесконечный фарм
    reset(); ev("G.s.st.mood=10; G.petMenu('cat')"); tot0 = ev("G.s.st.mood")
    for i in range(8):
        reset(); ev("G.petMenu('cat')"); click('Погладить')
    check('питомец не даёт бесконечное настроение за день', ev("G.s.st.mood") - tot0 < 60, ev("G.s.st.mood"))

    # ---- 2. «Отчибучить»
    reset(); setup(rank=0, shifts=0, phase='work', hour=10); ev("G.stuntMenu()"); o = opts()
    enabled = ev("G.cur.opts.filter(x=>!x.dis && !/Передумал/.test(x.t)).length")
    check('стажёр с нуля: открыто только пара безобидных выходок', 1 <= enabled <= 3, enabled)
    check('закрытые выходки показаны как «🔒» с условием', any('🔒' in x for x in o), o)
    reset(); setup(rank=1, shifts=40, phase='work', hour=10); ev("G.stuntMenu()")
    e2 = ev("G.cur.opts.filter(x=>!x.dis && !/Передумал/.test(x.t)).length")
    check('со стажем открывается больше выходок', e2 > enabled, (enabled, e2))
    reset(); setup(rank=7, shifts=300, phase='work', hour=10, stage=2); ev("G.stuntMenu()"); o = opts()
    check('мастер: варианты для руководителей, без детских шалостей', any('планёрку' in x for x in o) and not any('Станцевать' in x or 'шнурки' in x for x in o), o)
    reset(); setup(rank=10, shifts=500, phase='work', hour=10, stage=3); ev("G.stuntMenu()"); o = opts()
    check('зам. ген. директора: свои выходки', any('открытых дверей' in x for x in o) and not any('планёрку' in x for x in o), o)
    # последствия: поймали руководителя -> «ковёр», штраф по должности
    reset(); setup(rank=9, shifts=400, phase='work', hour=10, stage=3, money=50000)
    ev("G.rnd=()=>0; G.stuntMenu()")
    r = click('Закрыть наряды'); check('руководитель: можно выбрать «рискованную» выходку', r == 'OK', r)
    check('руководителя поймали -> вызов на ковёр', ev("/КОВЁР/.test(G.cur&&G.cur.title||'')"), ev("G.cur&&G.cur.title"))
    ev("delete G.rnd; G.rnd=undefined")
    # лимит выходок в день
    pg.reload(); pg.wait_for_timeout(600)
    reset(); setup(rank=1, shifts=40, phase='work', hour=10)
    ev("G.fx({coll:0}); G.rnd=()=>0.99")
    for nme in ['Украсить', 'Письмо']:
        reset(); ev("G.stuntMenu()"); click(nme);
    reset(); ev("G.stuntMenu()")
    check('не больше двух выходок в день', ev("G.cur.opts.filter(x=>!x.dis && !/Передумал/.test(x.t)).length")==0)

    # ---- 10. «Свои люди»
    reset(); setup(phase='evening', hour=18); ev("G.s.flags.friends=['seryoga']; G.R('seryoga').l=100; G.R('seryoga').met=true")
    ev("G.friendMenu('seryoga')"); o = opts()
    check('меню друга: есть «Пригласить»', any('Пригласить' in x for x in o), o)
    reset(); ev("G.inviteMenu('seryoga')"); o = opts()
    check('приглашения: домой, в бар, на рыбалку, в гости', all(any(k in x for x in o) for k in ['домой', 'бар', 'рыбалку', 'гости']), o)
    # детерминируем «занят»
    ev("G.R('seryoga').invDay=G.s.t.day; G.R('seryoga').invN=0; G.R('seryoga').invBusy=0")
    m0 = ev("[G.s.money, G.s.st.mood, G.R('seryoga').l]"); click('домой'); m1 = ev("[G.s.money, G.s.st.mood, G.R('seryoga').l]")
    check('«Пригласить домой»: деньги уходят, настроение растёт', m1[0] < m0[0] and m1[1] > m0[1], (m0, m1))
    reset(); ev("G.inviteMenu('seryoga')"); ev("G.R('seryoga').invBusy=0; G.R('seryoga').invN=0")
    click('рыбалку'); check('«Позвать на рыбалку» создаёт договорённость', ev("!!G.fishPlan() && G.fishPlan().id==='seryoga'"))
    reset(); setup(phase='work', hour=10); ev("G.s.flags.friends=['seryoga']; G.inviteMenu('seryoga')")
    check('на работе приглашать нельзя', all(ev("G.cur.opts.filter(o=>/домой|бар|гости/.test(o.t)).map(o=>!!o.dis)")))
    reset(); setup(phase='evening', hour=18); ev("G.s.flags.friends=['seryoga']; G.R('seryoga').l=100; G.inviteMenu('seryoga'); G.R('seryoga').invDay=G.s.t.day; G.R('seryoga').invBusy=0; G.R('seryoga').invN=0")
    m0 = ev("[G.s.st.satiety, G.s.st.mood]"); click('в гости'); m1 = ev("[G.s.st.satiety, G.s.st.mood]")
    check('«Сходить в гости»: сытость и настроение растут', m1[0] > m0[0] and m1[1] > m0[1], (m0, m1))

    check('нет ошибок страницы', not errs, errs)
    b.close()
print('\nИТОГ:', 'ВСЁ ПРОШЛО' if not fails else 'ПРОВАЛЕНО: %d' % len(fails))
sys.exit(1 if fails else 0)
