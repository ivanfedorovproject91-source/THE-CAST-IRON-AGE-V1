#!/usr/bin/env python3
"""Проверка v3.12: репутация у начальства, субординация, придирки, конфликты, Тамара, стадии настроения.
Запуск: python3 tests/v38_test.py (нужны python3 и playwright)."""
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
SETUP = """() => { G.headless = true; G.newState('Тест', {}, G.D.EDU[0].id); const s=G.s; s.car.job=Object.keys(G.D.JOBS)[0]; s.car.rank=1; s.car.shifts=10; s.car.probShifts=20; s.phase='work'; s.t.hour=9; s.loc='shop'; G.mq.length=0; G.cur=null; G.busy=false; return true; }"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:%d/index.html'%port); pg.wait_for_timeout(800)
    pg.evaluate(SETUP)
    ev=lambda js: pg.evaluate(js)
    check('модуль загружен', ev("typeof G.bossStanding==='function' && typeof G.bossTalk==='function'"))
    # 1. репутация: одно мелкое нарушение не ломает
    base=ev("G.bossStanding().score")
    ev("G.v38().perf.late+=1")
    one=ev("G.bossStanding().score")
    check('одно опоздание снижает репутацию не более чем на 4', base-one<=4, (base,one))
    ev("Object.assign(G.v38().perf,{late:9,viol:9,safety:9,brak:9}); G.s.car.rep=2; G.s.st.boss=5")
    check('много нарушений -> плохая репутация (lvl>=2)', ev("G.bossStanding().lvl")>=2)
    # 2. фамильярность: чем выше начальник, тем строже
    res={}
    for id in ['stepanych','shchiplen','truhanov']:
        ev(SETUP); ev("G.s.st.boss=40")
        ev("G.R('%s').l=0"%id)
        before=ev("G.R('%s').l"%id)
        ev("(function(){G.bossTalk('%s'); const o=G.cur.opts.find(x=>/Запанибрата/.test(x.t)); o.fn();})()"%id)
        res[id]=before-ev("G.R('%s').l"%id)
    check('фамильярность: мастер < начальник цеха < директор', res['stepanych']<res['shchiplen']<res['truhanov'], res)
    ev(SETUP); ev("G.R('stepanych').l=0")
    ev("(function(){G.bossTalk('stepanych'); G.cur.opts.find(x=>/Официально/.test(x.t)).fn();})()")
    check('официальный тон повышает отношения', ev("G.R('stepanych').l")>0)
    # должность игрока открывает фамильярность
    ev(SETUP); ev("G.s.car.rank=5; G.R('stepanych').l=50")
    b0=ev("G.s.st.boss")
    ev("(function(){G.bossTalk('stepanych'); G.cur.opts.find(x=>/Запанибрата/.test(x.t)).fn();})()")
    check('при высоком ранге и отношениях «по-свойски» допустимо', ev("G.R('stepanych').l")>50)
    # 3. придирки: частота растёт с плохой репутацией
    def fired(setup):
        n=0
        for i in range(400):
            ev(SETUP); ev(setup); ev("G.s.day.slots=5")
            n+=ev("(function(){G.mq.length=0;G.cur=null;G.busy=false; const before=G.mq.length; const nb=G.s.flags.v38; const cnt=()=>G.mq.length+(G.cur?1:0); G.rollEvent(); return cnt()>0?1:0;})()")
        return n
    good=fired("Object.assign(G.v38().perf,{plan:0.95,qual:0.95}); G.s.st.boss=80; G.s.car.clean=6")
    bad=fired("Object.assign(G.v38().perf,{late:5,viol:4,brak:5,safety:3,plan:0.3,qual:0.4}); G.s.car.rep=2; G.s.st.boss=10")
    check('при плохой репутации придирок больше, чем при хорошей', bad>good, (good,bad))
    # доверие при хорошей репутации
    ev(SETUP); ev("Object.assign(G.v38().perf,{plan:0.95,qual:0.95}); G.s.st.boss=80; G.s.car.clean=6")
    check('хорошая репутация (lvl 0)', ev("G.bossStanding().lvl")==0)
    # характеристика: трудно при плохой репутации
    ev(SETUP); ev("Object.assign(G.v38().perf,{late:5,viol:4,brak:5,safety:3}); G.s.car.rep=2; G.s.st.boss=10")
    ev("G.askCharacteristic('stepanych')"); check('при плохой репутации характеристику не дают', ev("G.v38().charUntil==null"))
    ev(SETUP); ev("Object.assign(G.v38().perf,{plan:0.95,qual:0.95}); G.s.st.boss=80; G.s.car.clean=6; G.R('stepanych').l=30")
    ev("G.askCharacteristic('stepanych')"); check('при хорошей репутации характеристику выдают', ev("G.v38().charUntil>G.s.t.day"))
    # 4. конфликты: все 6 вариантов работают, память сохраняется
    for k in ['спокойно','грубо','Промолчать','Пошутить','Помириться','руководству']:
        ev(SETUP); ev("G.R('mikhalych').l=-40; G.v38().cfDay=-9")
        ok=ev("""(function(){ const cf=G.s.flags.v38; G.s.loc='shop'; try{ G.peopleAt=()=>['mikhalych']; }catch(e){}
          for(let i=0;i<600&&!(G.cur&&/Конфликт/.test(G.cur.title));i++){ G.mq.length=0;G.cur=null;G.busy=false; G.s.day.cfToday=0; G.v38().cfDay=-9; G.v38().conf={}; G.rollEvent(); }
          if(!G.cur) return 'no conflict'; const o=G.cur.opts.find(x=>x.t.indexOf('%s')>=0); if(!o) return 'no option'; const r0=G.R('mikhalych').l; o.fn(); return G.v38().conf.mikhalych&&G.v38().conf.mikhalych.mem.length===1?'ok':'no memory';})()"""%k)
        check('конфликт: вариант «%s»'%k, ok=='ok', ok)
    # 5. Тамара: нет автодиалога на проходной, уборка 2 раза в неделю
    ev(SETUP); ev("G.s.phase='locker'; G.s.day.tamGate=0")
    ev("G.startDay()"); check('Тамара: окно у входа в цех отключено', ev("G.s.day.tamGate===1"))
    ev(SETUP); mops=0
    ev("G.s.t.day=0; G.startDay();")
    days=[]
    for d in range(14):
        ev("G.s.t.day=%d; G.startDay(); G.s.phase='work'; G.s.t.hour=12; G.mq.length=0; G.cur=null; G.busy=false; G.s.st.mood=70; G.s.car.sickUntil=-1"%d)
        wd=ev("G.weekday()")
        ev("G.advance(1)"); ev("G.advance(1)")
        done=ev("G.v38().cleanDone===G.s.t.day")
        if done: days.append(wd)
    check('уборка ровно 2 раза в неделю (вт и пт)', sorted(set(days))==[1,4] and len(days)==4, days)
    # 6. настроение: стадии и срыв вместо внезапного конца
    ev(SETUP); stages=[]
    for m in [28,18,9,4]:
        ev("G.mq.length=0; G.cur=null; G.busy=false; G.s.st.mood=%d; G.fx({})"%m)
        stages.append(ev("G.v38().mood.stage"))
    check('стадии предупреждения 1..4', stages==[1,2,3,4], stages)
    ev("G.s.st.mood=0; G.mq.length=0; G.cur=null; G.busy=false; G.checkEnd()")
    check('первый ноль — срыв, игра не закончена', ev("!G.s.end && G.s.st.mood>0 && G.v38().mood.breaks===1"))
    ev("G.s.st.mood=0; G.checkEnd()")
    check('повторный ноль в течение 10 дней — уход (quit)', ev("G.s.end && G.s.end.id==='quit'"))
    # сохранение/миграция
    ev(SETUP); ev("delete G.s.flags.v38"); ev("G.bossStanding()")
    check('старое сохранение без v38 работает', ev("!!G.s.flags.v38 && typeof G.s.flags.v38.perf==='object'"))
    check('нет ошибок страницы', not errs, errs[:3])
    b.close()
print('\nИТОГ:', 'ВСЁ ПРОШЛО' if not fails else 'ПРОВАЛЕНО: '+', '.join(fails)); sys.exit(1 if fails else 0)
