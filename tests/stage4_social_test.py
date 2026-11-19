#!/usr/bin/env python3
"""Этап 4, блок 3: социальные связи. Запуск: python3 tests/stage4_social_test.py"""
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
BASE = "G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.car.job = 'tokar'; s.car.rank = 3; s.car.shifts = 80; s.money = 50000; s.phase = 'evening'; s.t.hour = 19; G.mq.length = 0; G.cur = null; G.busy = false; s.flags.friends = ['seryoga', 'kolyan']; for (const k of ['seryoga', 'kolyan', 'kulezhov', 'palych']) { const r = G.R(k); r.met = 1; r.l = 70; r.last = G.week(); }"
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox']); p = b.new_context().new_page()
    p.on('pageerror', lambda e: fails.append('pageerror: ' + str(e)))
    p.route('**/telegram.org/**', lambda r: r.abort()); p.route('**/fonts.g*/**', lambda r: r.abort())
    p.goto(URL); p.wait_for_timeout(800)

    # 1. остывание: через 5 недель без общения отношение падает до 45, но дружба остаётся; общение сбрасывает счётчик
    r = p.evaluate("() => {" + BASE + """
      const wk0 = G.week(); const w = G.week; let cur = wk0; G.week = () => cur;
      const R = G.R('seryoga'); R.last = wk0; const hist = [];
      for (let i = 1; i <= 14; i++) { cur = wk0 + i; G.friendCooling(); hist.push(Math.round(R.l)); }
      const stillFriend = G.isFriend('seryoga'); const floor = R.l;
      cur = wk0 + 13; R.last = cur; G.relAdd('seryoga', 3); G.friendCooling(); const after = R.l; G.week = w;
      return { hist, stillFriend, floor, after, cooledFlag: !!s.flags.cooled && !s.flags.cooled.seryoga, askBlocked: floor < 50 }; }""")
    check('до 5 недель отношение не падает', r['hist'][:4] == [70, 70, 70, 70], r)
    check('потом падает по 3 в неделю и останавливается на 45', r['hist'][4] == 67 and r['floor'] == 45, r)
    check('дружба при остывании не рвётся, а просить помощи нельзя (<50)', r['stillFriend'] and r['askBlocked'], r)
    check('общение возвращает отношения и снимает остывание', r["after"] >= 47 and r['cooledFlag'], r)

    # 2. «Давно не виделись» показывается один раз, не повторяется каждую неделю
    r = p.evaluate("() => {" + BASE + """
      const wk0 = G.week(); const w = G.week; let cur = wk0; G.week = () => cur; let n = 0; const t = G.toast; G.toast = (m) => { if (/Давно не виделись/.test(m)) n++; };
      G.R('seryoga').last = wk0; G.R('kolyan').last = wk0; for (let i = 1; i <= 10; i++) { cur = wk0 + i; G.friendCooling(); } G.toast = t; G.week = w; return { n }; }""")
    check('предупреждение об остывании — по одному на друга', r['n'] == 2, r)

    # 3. новые события: открываются, каждый вариант и последствие отрабатывают без ошибок, деньги не NaN/отрицательные
    for ev in ['friend_in_need', 'birthday', 'rival_promotion']:
        res = p.evaluate("(id) => {" + BASE + """
          const e = G.EV.find(x => x.id === id); if (!e) return { err: 'нет события' }; const out = { variants: [] };
          const open = () => { G.mq.length = 0; G.cur = null; G.busy = false; s.flags.later = []; s.money = 50000; s.phase = id === 'rival_promotion' ? 'work' : 'evening'; e.fn(s); };
          open(); const n = G.cur && G.cur.opts ? G.cur.opts.length : 0; out.n = n; out.cond = !!e.cond(s);
          for (let i = 0; i < n; i++) {
            open(); try { G.choose(i); } catch (x) { out.variants.push({ i, err: String(x) }); continue; }
            const q = (s.flags.later || []).map(x => x.id); const m0 = s.money;
            for (const ch of [true, false]) { G.chance = () => ch; s.t.day += 40; G.mq.length = 0; G.cur = null; G.busy = false; try { G.laterRun(); } catch (x) { out.variants.push({ i, err: 'later ' + x }); } s.t.day -= 40; }
            out.variants.push({ i, q, bad: [s.money, s.st.mood, s.st.coll, s.st.boss].some(v => !isFinite(v)) || s.money < 0 });
          }
          return out; }""", ev)
        ok = 'err' not in res and res['n'] >= 3 and res['cond'] and all('err' not in v and not v.get('bad') for v in res['variants'])
        check('событие «%s»: условие выполняется, все варианты и последствия отрабатывают' % ev, ok, json.dumps(res, ensure_ascii=False)[:300])

    # 4. Конкретика
    r = p.evaluate("() => {" + BASE + """
      G.chance = () => true; s.money = 0; G.later('friend_repay', 1, { id: 'seryoga', amt: 3000 }); s.t.day += 1; G.laterRun(); return { money: s.money }; }""")
    check('друг вернул 3 000 ₽', r['money'] == 3000, r)
    r = p.evaluate("() => {" + BASE + """
      G.chance = () => false; s.money = 0; G.later('friend_repay', 1, { id: 'seryoga', amt: 3000 }); s.t.day += 1; G.laterRun(); return { money: s.money, owed: G.R('seryoga').owed }; }""")
    check('«забыл вернуть»: деньги не пришли, долг помечен', r['money'] == 0 and r['owed'] == 3000, r)
    r = p.evaluate("() => {" + BASE + """
      const e = G.EV.find(x => x.id === 'friend_in_need'); s.flags.friends = []; const none = e.cond(s); s.flags.friends = ['seryoga']; return { none, some: e.cond(s) }; }""")
    check('просьба друга приходит только при наличии друзей', not r['none'] and r['some'], r)
    r = p.evaluate("() => {" + BASE + """
      const e = G.EV.find(x => x.id === 'rival_promotion'); s.car.rank = 6; const mg = e.cond(s); s.car.rank = 3; return { mg, w: e.cond(s) }; }""")
    check('соперник по разряду только у рабочих (ранг 1–5)', not r['mg'] and r['w'], r)
    # 5. старое сохранение без flags.friends/cooled не ломается
    r = p.evaluate("() => {" + BASE + """
      delete s.flags.friends; delete s.flags.cooled; try { G.friendCooling(); G.weeklyTick(); return { ok: true }; } catch (e) { return { err: String(e) }; } }""")
    check('сохранение без списка друзей: ошибок нет', r.get('ok') is True, r)
    b.close()
srv.shutdown()
print('\nИТОГ:', 'все проверки пройдены' if not fails else 'ОШИБКИ: %s' % fails)
raise SystemExit(1 if fails else 0)
