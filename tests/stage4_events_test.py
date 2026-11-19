#!/usr/bin/env python3
"""Этап 4, блок 1: события с выбором и отложенными последствиями.
Для детерминизма G.chance подменяется. Запуск: python3 tests/stage4_events_test.py"""
import http.server, os, socketserver, threading, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fails = []
def check(n, ok, info=''):
    print(('PASS ' if ok else 'FAIL ') + n + ('' if ok else '  → ' + str(info)))
    if not ok: fails.append(n)
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), Q)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]
BASE = "G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.car.job = 'tokar'; s.car.rank = 7; s.car.shifts = 200; s.money = 100000; s.phase = 'work'; s.world.plant = 60; G.mq.length = 0; G.cur = null; G.busy = false;"
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox']); p = b.new_context().new_page()
    p.on('pageerror', lambda e: fails.append('pageerror: ' + str(e)))
    p.route('**/telegram.org/**', lambda r: r.abort()); p.route('**/fonts.g*/**', lambda r: r.abort())
    p.goto(URL); p.wait_for_timeout(800)

    # 1. очередь: планируется, не срабатывает раньше срока, срабатывает один раз, переживает сохранение/загрузку
    r = p.evaluate("() => {" + BASE + """
      let n = 0; G.LATER.t1 = () => { n++; };
      G.later('t1', 3, {}); const q0 = s.flags.later.length; G.laterRun(); const early = n;
      s.t.day += 3; const copy = JSON.parse(JSON.stringify(s.flags.later));
      G.laterRun(); const once = n; G.laterRun(); return { q0, early, once, twice: n, left: s.flags.later.length, copy: copy.length }; }""")
    check('последствие ставится в очередь и не срабатывает раньше срока', r['q0'] == 1 and r['early'] == 0, r)
    check('срабатывает ровно один раз и очередь очищается', r['once'] == 1 and r['twice'] == 1 and r['left'] == 0, r)
    r = p.evaluate("() => {" + BASE + """
      G.later('brak_found', 5, {}); G.headless = false; G.save(); G.headless = true; const saved = JSON.stringify(s.flags.later); return saved; }""")
    check('очередь сохраняется в сохранении (flags.later)', 'brak_found' in r, r)
    r = p.evaluate("() => { G.headless = true; G.load(); return JSON.stringify(G.s.flags.later || []); }")
    check('после загрузки очередь на месте', 'brak_found' in r, r)

    # 2. старое сохранение без очереди не ломается
    r = p.evaluate("() => {" + BASE + """
      delete s.flags.later; try { G.laterRun(); G.extraDaily(); return { ok: true, q: (s.flags.later || []).length }; } catch (e) { return { err: String(e) }; } }""")
    check('сохранение без очереди: ошибок нет', r.get('ok') is True, r)

    # 3. каждое событие: открывается, каждый вариант выбора выполняется без ошибок, последствия отрабатывают
    ids = ['brak_witness', 'overtime_offer', 'wedding', 'safety_gap', 'rationalization', 'layoff_rumor', 'friend_invest', 'plan_pressure']
    for ev_id in ids:
        res = p.evaluate("(id) => {" + BASE + """
          const e = G.EV.find(x => x.id === id); if (!e) return { err: 'нет события' };
          const out = { id, variants: [] }; let n = 0;
          e.fn(s); const total = G.cur && G.cur.opts ? G.cur.opts.length : 0; out.total = total;
          for (let i = 0; i < total; i++) {
            const st = JSON.parse(JSON.stringify(s));  // откат состояния между вариантами
            G.mq.length = 0; G.cur = null; G.busy = false; s.flags.later = []; s.pay.acc = 0; s.pay.pen = 0; s.money = 100000;
            e.fn(s); const opt = G.cur.opts[i]; if (opt.dis) { out.variants.push({ i, dis: opt.dis }); continue; }
            try { G.choose(i); } catch (err) { out.variants.push({ i, err: String(err) }); continue; }
            const queued = (s.flags.later || []).map(x => x.id);
            // принудительно «проматываем» все последствия: и удачный, и неудачный исход
            const res = {};
            for (const chance of [true, false]) {
              const save = { later: JSON.parse(JSON.stringify(s.flags.later || [])), money: s.money, acc: s.pay.acc };
              G.chance = () => chance; G.mq.length = 0; G.cur = null; G.busy = false;
              s.t.day += 40; try { G.laterRun(); } catch (err) { out.variants.push({ i, err: 'later: ' + String(err) }); }
              res[chance] = { dmoney: s.money - save.money, dacc: s.pay.acc - save.acc, bad: [s.money, s.pay.acc, s.st.mood].some(v => !isFinite(v)) };
              s.flags.later = save.later; s.money = save.money; s.pay.acc = save.acc; s.t.day -= 40;
            }
            out.variants.push({ i, queued, res });
          }
          return out; }""", ev_id)
        ok = 'err' not in res and res['total'] >= 2 and all('err' not in v and not any(x['bad'] for x in v.get('res', {}).values()) for v in res['variants'])
        check('событие «%s»: все варианты и последствия отрабатывают без ошибок' % ev_id, ok, json.dumps(res, ensure_ascii=False)[:400])
        if ev_id != 'layoff_rumor' and ev_id != 'safety_gap':
            pass
    # 4. конкретные последствия
    r = p.evaluate("() => {" + BASE + """
      s.pay.acc = 0; G.later('overtime_bonus', 1); s.t.day += 1; G.laterRun(); return { acc: s.pay.acc }; }""")
    check('бонус за сверхурочные: +1 500 к начислению', r['acc'] == 1500, r)
    r = p.evaluate("() => {" + BASE + """
      G.chance = () => true; s.money = 0; G.later('invest_result', 1, { amt: 20000 }); s.t.day += 1; G.laterRun(); return { money: s.money }; }""")
    check('ларёк: при удаче 20 000 → 27 000', r['money'] == 27000, r)
    r = p.evaluate("() => {" + BASE + """
      G.chance = () => false; s.money = 0; G.later('invest_result', 1, { amt: 20000 }); s.t.day += 1; G.laterRun(); return { money: s.money }; }""")
    check('ларёк: при неудаче вложение потеряно, в минус не уходим', r['money'] == 0, r)
    r = p.evaluate("() => {" + BASE + """
      const e = G.EV.find(x => x.id === 'plan_pressure'); const ok = e.cond(s); s.car.rank = 3; return { ok, low: e.cond(s) }; }""")
    check('«План любой ценой» только для руководителей (ранг 6+)', r['ok'] and not r['low'], r)
    r = p.evaluate("() => {" + BASE + """
      const e = G.EV.find(x => x.id === 'friend_invest'); s.money = 3000; G.mq.length = 0; G.cur = null; e.fn(s); return { dis: G.cur.opts[0].dis }; }""")
    check('нельзя вложить 20 000 без денег', r['dis'] is not None, r)
    b.close()
srv.shutdown()
print('\nИТОГ:', 'все проверки пройдены' if not fails else 'ОШИБКИ: %s' % fails)
raise SystemExit(1 if fails else 0)
