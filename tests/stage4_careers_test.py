#!/usr/bin/env python3
"""Этап 4, блок 2: каждая ступень карьеры открывает новое действие. Запуск: python3 tests/stage4_careers_test.py"""
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
BASE = "G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.car.job = 'tokar'; s.car.shifts = 300; s.money = 100000; s.phase = 'work'; s.t.hour = 10; s.loc = 'shop'; s.day.done = {}; G.mq.length = 0; G.cur = null; G.busy = false; s.car.mgmtStage = 1;"
NEW = {2: 'w_sharpen', 3: 'w_setup', 4: 'w_mentor', 5: 'w_critical', 8: 'm_resource', 9: 'm_budget', 10: 'm_strategy'}
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox']); p = b.new_context().new_page()
    p.on('pageerror', lambda e: fails.append('pageerror: ' + str(e)))
    p.route('**/telegram.org/**', lambda r: r.abort()); p.route('**/fonts.g*/**', lambda r: r.abort())
    p.goto(URL); p.wait_for_timeout(800)

    # 1. Каждая ступень открывает действие ровно с нужного ранга; набор действий растёт, а не повторяется
    r = p.evaluate("() => {" + BASE + """
      const out = {}; for (const rk of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) { s.car.rank = rk; s.loc = 'shop'; s.day.done = {}; s.flags.budgetWk = -1; s.flags.stratWk = -1;
        const ids = []; for (const id in G.ACT) { const a = G.ACT[id]; if (!(a.ph || ['work']).includes('work')) continue; if (a.loc && a.loc !== 'shop' && a.loc !== 'admin') continue; if (a.loc === 'admin') { s.loc = 'admin'; } else s.loc = 'shop'; if (!G.avail(a)) ids.push(id); }
        out[rk] = ids; }
      return out; }""")
    new_ids = list(NEW.values())
    for rk, aid in NEW.items():
        have = [k for k in new_ids if k in r[str(rk)]]
        check('ранг %d: открывается «%s»' % (rk, aid), aid in r[str(rk)], r[str(rk)])
    check('ранг 1: новых действий ещё нет', not any(k in r['1'] for k in new_ids), r['1'])
    check('рабочие действия разрядов не лезут к руководителям (ранг 6)', not any(k in r['6'] for k in ['w_sharpen', 'w_setup', 'w_mentor', 'w_critical']), r['6'])
    # наборы действий разных ступеней различаются
    sets = {rk: tuple(sorted(r[str(rk)])) for rk in range(1, 11)}
    check('наборы действий соседних ступеней 2–5 и 8–10 различаются', all(sets[a] != sets[a + 1] for a in (1, 2, 3, 4, 7, 8, 9)), {a: len(sets[a]) for a in sets})

    # 2. Каждое действие и каждый вариант выбора отрабатывают без ошибок; последствия тоже
    for rk, aid in NEW.items():
        res = p.evaluate("([rk, aid]) => {" + BASE + """
          const a = G.ACT[aid]; const out = { aid, variants: [] };
          const open = () => { G.mq.length = 0; G.cur = null; G.busy = false; s.car.rank = rk; s.loc = a.loc; s.day.done = {}; s.flags.budgetWk = -1; s.flags.stratWk = -1; s.pay.acc = 0; s.pay.pen = 0; s.later = 0; s.flags.later = []; s.phase = 'work'; s.t.hour = 10; G.runAction(aid); };
          open(); const n = G.cur && G.cur.opts ? G.cur.opts.length : 0; out.n = n;
          if (!n || aid === 'w_sharpen') { out.simple = true; out.sharp = s.day.sharp; out.q = G.quality(); return out; }
          for (let i = 0; i < n; i++) {
            open(); try { G.choose(i); } catch (e) { out.variants.push({ i, err: String(e) }); continue; }
            const q = (s.flags.later || []).map(x => x.id);
            for (const chance of [true, false]) { G.chance = () => chance; s.t.day += 40; G.mq.length = 0; G.cur = null; G.busy = false; try { G.laterRun(); } catch (e) { out.variants.push({ i, err: 'later ' + e }); } s.t.day -= 40; }
            out.variants.push({ i, q, bad: [s.money, s.pay.acc, s.st.mood, s.st.health].some(v => !isFinite(v)) });
          }
          return out; }""", [rk, aid])
        if res.get('simple'):
            ok = res['sharp'] == 1
        else:
            ok = res['n'] >= 2 and all('err' not in v and not v.get('bad') for v in res['variants'])
        check('действие «%s» (ранг %d): все варианты и последствия отрабатывают' % (aid, rk), ok, json.dumps(res, ensure_ascii=False)[:300])

    # 3. Эффекты: заточка и наладка ставят флаги смены и поднимают качество, ограничения «раз в неделю»
    r = p.evaluate("() => {" + BASE + """
      s.car.rank = 5; s.st.know = 5; s.st.mood = 10; s.st.energy = 15;
      const q0 = G.quality(); s.day.sharp = 1; const q1 = G.quality(); s.day.setupQ = 8; const q2 = G.quality();
      s.day.sharp = 0; s.day.setupQ = 0; G.runAction('w_sharpen'); const f1 = s.day.sharp; G.mq.length = 0; G.cur = null; G.busy = false;
      G.runAction('w_setup'); G.choose(0); const f2 = s.day.setupQ; return { q0, q1, q2, f1, f2 }; }""")
    check('заточка +5, наладка +8 к качеству; действия ставят флаги смены', r['q1'] - r['q0'] == 5 and r['q2'] - r['q1'] == 8 and r['f1'] == 1 and r['f2'] == 8, r)
    r = p.evaluate("() => {" + BASE + """
      s.car.rank = 9; s.loc = 'shop'; s.flags.budgetWk = -1; G.runAction('m_budget'); G.choose(2); G.mq.length = 0; G.cur = null;
      const again = G.avail(G.ACT.m_budget); return { again }; }""")
    check('бюджет цеха — раз в неделю', r['again'] == 'Раз в неделю', r)
    r = p.evaluate("() => {" + BASE + """
      s.car.rank = 10; s.loc = 'admin'; s.flags.stratWk = -1; G.runAction('m_strategy'); G.choose(0); const q = (s.flags.later || []).map(x => x.id + ':' + (x.due - s.t.day));
      return { q }; }""")
    check('стратегия «Модернизация» ставит последствие на 14 дней', any(x.startswith('modernization:1') for x in r['q']), r)
    # награды умеренные: сложный заказ не даёт больше 1 500 ₽ к начислению
    r = p.evaluate("() => {" + BASE + """
      s.car.rank = 5; G.chance = () => true; s.st.know = 100; s.pay.acc = 0; G.runAction('w_critical'); G.choose(0); return { acc: s.pay.acc, q: G.quality() }; }""")
    check('сложный заказ: премия не выше 1 500 ₽', r['acc'] <= 1500, r)
    b.close()
srv.shutdown()
print('\nИТОГ:', 'все проверки пройдены' if not fails else 'ОШИБКИ: %s' % fails)
raise SystemExit(1 if fails else 0)
