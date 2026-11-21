#!/usr/bin/env python3
"""Проверка исправлений V3.8: зависание экзамена, PACE, репутация и порог экзамена, новые диалоги, Субрыкин,
облачное сохранение (мок Telegram CloudStorage), устойчивость аватара, звонки в выходной.
Запуск: python3 tests/audit_fixes_test.py (нужны python3 и playwright)."""
import http.server, os, socketserver, threading, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def log_message(s,*a): pass
srv = socketserver.TCPServer(('127.0.0.1',0),Q); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
fails=[]
# в CI есть интернет: настоящий скрипт Telegram затёр бы макет CloudStorage, поэтому блокируем его
NOJS = lambda route: route.fulfill(status=200, content_type='application/javascript', body='')
def check(n,ok,info=''):
    print(('PASS ' if ok else 'FAIL ')+n+(('  -> '+str(info)) if info and not ok else ''))
    if not ok: fails.append(n)
SETUP = """() => { G.headless = true; G.newState('Тест', G.defaultAv(), G.D.EDU[0].id); const s=G.s; s.car.job='podsob'; s.car.rank=0; s.car.shifts=0; s.car.probShifts=0; s.phase='work'; s.t.hour=9; s.loc='shop'; G.mq.length=0; G.cur=null; G.busy=false; window.__m=[]; G.modal=function(o){window.__m.push(o);window.__last=o;}; return true; }"""
MOCK = """(() => { const st = {}; window.__cs = st;
 window.Telegram = { WebApp: { initData: 'x', ready(){}, expand(){}, setHeaderColor(){}, setBackgroundColor(){}, disableVerticalSwipes(){}, onEvent(){}, isVersionAtLeast(){ return true; },
  CloudStorage: { setItem(k,v,cb){ st[k]=v; cb&&cb(null,true); }, getItem(k,cb){ cb(null, st[k]===undefined?'':st[k]); }, removeItems(ks,cb){ ks.forEach(k=>delete st[k]); cb&&cb(null,true); } } } }; })();"""
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:%d/index.html'%port); pg.wait_for_timeout(1000)
    ev=pg.evaluate; ev(SETUP)
    # 1. зависание экзамена
    ev("G.CONFIG.PACE=1")  # тест рассчитан на базовые сроки; темп по умолчанию (1.5) проверяется в stage3_balance_test.py
    ev("G.s.car.shifts=5; G.career.checkLadder();")
    check('экзамен стартовал', ev("G.s.car.ladderPending")==1)
    ev("G.headless=false; G.save(); G.headless=true")
    pg.reload(); pg.wait_for_timeout(1000)
    ev("()=>{G.headless=true; G.load(); window.__m=[]; G.modal=function(o){window.__m.push(o);window.__last=o;};}")
    check('после перезагрузки ladderPending сброшен', ev("G.s.car.ladderPending")==0, ev("G.s.car.ladderPending"))
    ev("G.CONFIG.PACE=1")
    ev("G.career.checkLadder()")
    check('экзамен можно начать снова', 'Экзамен' in ev("(window.__m[0]||{}).title||''"), ev("window.__m.map(m=>m.title)"))
    # 2. PACE
    ev("G.CONFIG.PACE=2")
    check('PACE=2 удваивает срок (10 смен до первого экзамена)', ev("(G.career.reqLines()[0].t)").endswith('/ 10 смен'), ev("G.career.reqLines()[0].t"))
    ev("G.CONFIG.PACE=1")
    # 3. репутация: плохая закрывает допуск
    ev(SETUP); ev("G.s.car.rank=2; G.s.car.ladderStepAt=0; G.s.car.shifts=10; Object.assign(G.v38().perf,{late:9,viol:9,safety:9,brak:9,absent:9}); G.s.car.rep=3; G.s.st.boss=0; G.career.checkLadder()")
    check('при худшей репутации допуск закрыт', ev("window.__m.some(m=>m.title==='Допуск к экзамену закрыт')"), ev("window.__m.map(m=>m.title)"))
    check('экзамен не начался', ev("!G.s.car.ladderPending"))
    ev(SETUP); ev("G.s.car.rank=2; G.s.car.ladderStepAt=0; G.s.car.shifts=10; G.s.car.rep=0; G.s.st.boss=90; G.v38().perf.plan=1; G.v38().perf.qual=1; G.career.checkLadder()")
    check('при хорошей репутации экзамен начинается', ev("window.__m.some(m=>/Экзамен/.test(m.title))"), ev("window.__m.map(m=>m.title)"))
    # 4. вопросы: без повторов в одном экзамене, 5 штук
    ev(SETUP); ev("G.s.car.rank=3; G.s.car.ladderStepAt=0; G.s.car.shifts=40; G.s.st.boss=60; G.career.checkLadder(); window.__last.opts[window.__last.opts.length-1].fn();")
    qs=ev("(()=>{const out=[];for(let i=0;i<5;i++){const t=window.__last.text; out.push(t); const o=window.__last.opts; o[0].fn();} return out;})()")
    check('в экзамене 5 разных вопросов', len(set(qs))==5, qs)
    # 5. Субрыкин
    check('Ебланов заменён на Субрыкина', ev("G.D.NPC.eblanov.name")=='Субрыкин М. Э.' and 'Ебланов' not in ev("JSON.stringify(G.D.NPC)"))
    # 6. диалоги: у каждого NPC с talk не меньше 3 тем, у ключевых — больше, все fx без NaN
    res=ev("""()=>{const bad=[];for(const [id,n] of Object.entries(G.D.NPC)){(n.talk||[]).forEach((t,ti)=>{(t.o||[]).forEach((o,oi)=>{if(!o[0]||!o[1])bad.push(id+':'+ti+':'+oi+' пусто');try{G.s.st.mood=50;G.fx(o[2]||{});for(const k in G.s.st){if(typeof G.s.st[k]==='number'&&!isFinite(G.s.st[k]))bad.push(id+':NaN '+k)}}catch(e){bad.push(id+':'+e.message)}; const rel=(o[2]||{}).rel||{}; Object.keys(rel).forEach(k=>{if(!G.D.NPC[k])bad.push(id+': неизвестный NPC '+k)})})})}return bad}""")
    check('все реплики NPC корректны', not res, res[:5])
    check('диалогов стало больше', ev("Object.values(G.D.NPC).reduce((a,n)=>a+(n.talk||[]).length,0)")>=100, ev("Object.values(G.D.NPC).reduce((a,n)=>a+(n.talk||[]).length,0)"))
    # 7. аватар без skin не падает
    check('аватар без цвета кожи не падает', ev("(()=>{try{return G.avatar({}).length>50}catch(e){return false}})()"))
    # 8. звонки в выходной после стажировки
    ev(SETUP); ev("G.s.car.rank=1; G.s.world.nextCall=0; G.s.t.day=5; G.weekendEvents()")
    check('«Звонок в выходной» (без телефона — посыльный)', ev("window.__m.some(m=>/Звонок|Посыльный/.test(m.title||''))"), ev("window.__m.map(m=>m.title)"))
    ev(SETUP); ev("G.s.own.phone1=1; G.s.car.rank=1; G.s.world.nextCall=0; G.s.t.day=5; G.weekendEvents()")
    check('«Звонок в выходной» после стажировки работает (телефон есть)', ev("window.__m.some(m=>/Звонок/.test(m.title||''))"), ev("window.__m.map(m=>m.title)"))
    check('без телефона звонка нет: приходит посыльный', ev("(()=>{G.s.car.rank=1;return true})()") and 'Посыльный' in str(ev("(()=>{window.__m.length=0;delete G.s.own.phone1;G.s.world.nextCall=0;G.weekendEvents();return window.__m.map(m=>m.title)})()")))
    # 9. стажёра не вызывают на ковёр
    check('стажёр не получает «ковёр» (условие rank>=1)', 'c.rank >= 1 && G.chance(G.fireRisk()' in open(os.path.join(ROOT,'js/career.js'),encoding='utf-8').read())
    print('ERR',errs[:3]); check('нет ошибок страницы', not errs, errs)
    b.close()
    # 10. облако Telegram (мок)
    b=p.chromium.launch(); ctx=b.new_context(); ctx.add_init_script(MOCK); ctx.route('**/telegram-web-app.js', NOJS); pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:%d/index.html'%port); pg.wait_for_timeout(2400)
    pg.evaluate("""()=>{G.newState('Облако', G.defaultAv(), G.D.EDU[0].id); G.s.car.job='podsob'; G.s.car.shifts=7; G.s.phase='evening'; G.save();}""")
    ok=pg.evaluate("G.cloud.push()")
    check('сохранение ушло в облако', ok is True, pg.evaluate("G.cloud.status"))
    meta=json.loads(pg.evaluate("window.__cs.cv_meta"))
    check('облако: метка и куски согласованы', meta['n']>=1 and all(('cv_%d'%i) in pg.evaluate("Object.keys(window.__cs)") for i in range(meta['n'])), meta)
    cs=pg.evaluate("window.__cs")
    # новый «телефон»: чистый localStorage, облако то же
    ctx2=b.new_context(); ctx2.route('**/telegram-web-app.js', NOJS); ctx2.add_init_script(MOCK+"; Object.assign(window.__cs, %s);"%json.dumps(cs)); pg2=ctx2.new_page()
    pg2.goto('http://127.0.0.1:%d/index.html'%port); pg2.wait_for_timeout(4500)
    got=pg2.evaluate("(()=>{try{const d=JSON.parse(localStorage.getItem(G.SAVE_KEY)||'null');return d&&d.s&&d.s.car.shifts}catch(e){return null}})()")
    check('на новом устройстве прогресс восстановлен из облака', got==7, got)
    b.close()
print('\nИТОГ:', 'все проверки пройдены' if not fails else 'ПРОВАЛЕНЫ: %s'%fails)
raise SystemExit(1 if fails else 0)
