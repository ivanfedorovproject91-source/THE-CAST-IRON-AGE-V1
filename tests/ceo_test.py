#!/usr/bin/env python3
"""Тест системы «Генеральный директор»: python3 tests/ceo_test.py"""
import http.server, os, socketserver, threading, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fails = []
def check(n, ok, info=''):
    print(('PASS ' if ok else 'FAIL ') + n + (('  → ' + str(info)) if info and not ok else ''))
    if not ok: fails.append(n)
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), Q); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % port
START = """() => { G.newState('Тест', G.defaultAv(), 'chpu'); const s = G.s; s.phase='evening'; s.t.hour=18; G.ui.mode='game'; G.ui.tab='shift';
  G.mq.length=0; G.cur=null; G.busy=false; document.getElementById('modal-root').innerHTML=''; document.getElementById('modal-root').classList.remove('on'); G.ui.render(); }"""
CLEAR = "() => { G.mq.length=0; G.cur=null; G.busy=false; document.getElementById('modal-root').innerHTML=''; document.getElementById('modal-root').classList.remove('on'); }"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None)
    pg = b.new_page(viewport={'width': 390, 'height': 800}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.evaluate(START)
    check('новичок: вкладки Кабинет нет', pg.evaluate("() => !G.ceo.is() && !document.querySelector('.nav').innerText.toLowerCase().includes('кабинет')"))
    pg.evaluate("() => G.ceo.dev.now('normal')"); pg.evaluate(CLEAR); pg.evaluate("() => G.ui.render()")
    check('после назначения: CEO', pg.evaluate("() => G.ceo.is() && !!G.s.company"))
    check('вкладка Кабинет есть', pg.evaluate("() => document.querySelector('.nav').innerText.toLowerCase().includes('кабинет')"))
    check('ранг не изменён (число)', pg.evaluate("() => typeof G.s.car.rank === 'number'"))
    for sec in ['home','prod','fin','staff','supply','sales','dev','board','docs']:
        r = pg.evaluate("(sec) => { G.cab.open(sec); return document.getElementById('screen').innerText.length }", sec)
        check('раздел ' + sec + ' рисуется', r > 100, r)
    pg.screenshot(path='/tmp/cab_docs.png')
    # симуляция 12 недель
    res = pg.evaluate("""() => { const s=G.s, c=G.co.get(); const log=[]; const money0=s.money;
      for (let i=0;i<84;i++){ try{ G.sleep(); }catch(e){ log.push('ERR '+e.message); break; }
        G.mq.length=0; G.cur=null; G.busy=false;
        const c=G.co.get(); if(!c) break;
        c.pending.slice().forEach(e=>{ try{G.co.ev.choose(e.uid,0)}catch(x){log.push('EVERR '+x.message)} });
        if (i%7==0) log.push([i, Math.round(c.treasury/1e5)/10, Math.round(c.board.trust), c.reports[0]?Math.round(c.reports[0].profit/1e5)/10:null, c.reports[0]?Math.round(c.reports[0].made):null].join('|')); if (s.end) {log.push('END '+s.end.id); break;} }
      return log; }""")
    print('\n'.join(res))
    check('симуляция без исключений', not any(x.startswith(('ERR','EVERR')) for x in res), res[:3])
    check('личные деньги отделены', pg.evaluate("() => typeof G.s.money === 'number' && G.co.get() ? G.s.money !== G.co.get().treasury : true"))
    # сохранение/перезагрузка
    t0 = pg.evaluate("() => { G.save(); return G.co.get() ? G.co.get().lastDay : null }")
    pg.reload(); pg.wait_for_timeout(500)
    ok = pg.evaluate("() => { try { G.load(); } catch(e) { return 'ERR '+e.message } return G.s && G.s.ceo ? (G.co.get()? G.co.get().lastDay : 'end') : 'nos' }")
    check('перезагрузка сохраняет компанию', ok == t0 or ok == 'end', (t0, ok))
    check('нет ошибок консоли', not errs, errs[:5])
    b.close()
print('FAILS:', fails); raise SystemExit(1 if fails else 0)
