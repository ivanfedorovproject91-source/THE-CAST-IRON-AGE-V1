#!/usr/bin/env python3
"""Этап 3, блок 1: потолок штрафов в расчёте, премия завода от оклада, концовка «процветает» только с ранга 8.
Запуск: python3 tests/stage3_balance_test.py"""
import http.server, os, socketserver, threading
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
NEW = "() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.car.job = s.car.job || 'tokar'; s.car.rank = 2; s.flags = s.flags || {}; return G.monthlyPay(); }"
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox']); p = b.new_context().new_page()
    p.on('pageerror', lambda e: fails.append('pageerror: ' + str(e)))
    p.route('**/telegram.org/**', lambda r: r.abort()); p.route('**/fonts.g*/**', lambda r: r.abort())
    p.goto(URL); p.wait_for_timeout(800)
    # 1. штраф больше начисления: на руки не отрицательно, удержано <= 20%
    r = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.flags.shurFriend = 1; s.car.rank = 2;
      s.pay.acc = 40000; s.pay.adv = 16000; s.pay.pen = 90000; s.pay.viol = 1; s.pay.qn = 1; s.pay.prem = 0.5;
      const w = G.week; G.week = () => 3; const m0 = s.money; G.payday(); G.week = w;
      return { delta: s.money - m0 + 5500 }; }""")
    check('штраф 90 000 при начислении 40 000: выплата не отрицательна', r['delta'] >= 0, r)
    check('удержание ограничено 20%: на руки ≥ (40000−8000−16000)*0.87', r['delta'] >= (40000 - 8000 - 16000) * 0.87 - 2, r)
    # 2. премия завода = 5% оклада ступени (не меньше 500), а не фиксированные 3 000
    r = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s, f = s.flags;
      s.car.job = Object.keys(G.D.JOBS)[0]; s.car.rank = 2; f.plan = 95; f.shopMorale = 95; s.world.plant = 95;
      G.weekday = () => 0; s.pay.acc = 0; try { G.dailyTick(); } catch (e) {}
      return { acc: s.pay.acc, mp: G.monthlyPay() }; }""")
    exp = max(500, round(r['mp'] * 0.05 / 100) * 100)
    check('премия завода = 5% оклада (мин. 500)', abs(r['acc'] - exp) < 1 and r['acc'] != 3000, (r, exp))
    # 3. процветание не наступает ниже ранга 8
    r = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s, f = s.flags; s.car.rank = 3;
      f.plan = 95; f.shopMorale = 95; s.world.plant = 95; f.prosperWeeks = 20; s.flags.uLast = undefined;
      for (let i = 0; i < 30; i++) { try { G.dailyTick(); } catch (e) {} }
      return { end: s.end || null, pw: f.prosperWeeks }; }""")
    check('ранг 3: концовка «процветает» не срабатывает', r['end'] != 'prosper', r)
        # 4. лестница окладов: каждая управленческая ступень ощутимо выше лучшего разряда 5 и предыдущей ступени
    r = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; const out = {};
      let best5 = 0; for (const k of Object.keys(G.D.JOBS)) { s.car.job = k; s.car.rank = 5; best5 = Math.max(best5, G.monthlyPay()); }
      const m = []; s.car.job = 'tokar'; for (let r = 6; r <= 10; r++) { s.car.rank = r; s.car.mgmtStage = 1; const a = G.monthlyPay(); s.car.mgmtStage = 5; m.push([a, G.monthlyPay()]); }
      return { best5, m }; }""")
    check('Мастер участка (р6, ступень 1) ≥ +25% к лучшему разряду 5 любой профессии', r['m'][0][0] >= r["best5"] * 1.25, r)
    ok = all(r['m'][i][0] >= r['m'][i-1][1] * 1.05 for i in range(1, 5))
    check('каждая следующая должность ≥ +5% к верху предыдущей', ok, r)
    # 5. сдельные за операции: рабочему платят, руководителю (р6+) — нет
    r = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.car.job = 'tokar'; s.s = 0; s.dwg = { none: false };
      const res = {}; for (const rk of [3, 6]) { s.car.rank = rk; s.money = 1000; s.dwg.none = false; try { G.doOp(1); } catch (e) { res.err = String(e); } res[rk] = s.money - 1000; }
      return res; }""")
    check('рабочий (р3) получает сдельные за операцию', r.get('3', 0) > 0, r)
    check('руководитель (р6) не получает сдельных', r.get('6', 1) == 0, r)
    # 6. жильё: по умолчанию общага = 5 500, съём дороже, бонус сна, старое сохранение без флага = общага
    r = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.car.job = 'tokar'; s.car.rank = 5;
      const out = { def: G.fixedCosts().total, hk: G.housing(), act: !!G.ACT.housing };
      s.money = 100000; s.flags.housing = 'room'; out.room = G.fixedCosts().total;
      s.flags.housing = 'flat'; out.flat = G.fixedCosts().total;
      s.flags.housing = 'own'; out.ownNoFlat = G.housing();
      s.own.flat = 1; out.own = G.fixedCosts().total;
      s.flags.housing = 'room'; s.st.energy = 20; s.st.mood = 50; s.phase = 'evening'; s.t.hour = 22; const e0 = s.st.energy; try { G.sleep(); } catch (e) { out.err = String(e); } out.sleepGain = s.st.energy - e0;
      s.flags.housing = 'dorm'; s.st.energy = 20; s.t.hour = 22; const e1 = s.st.energy; try { G.sleep(); } catch (e) {} out.sleepGainDorm = s.st.energy - e1;
      delete s.flags.housing; out.old = G.fixedCosts().total; return out; }""")
    check('общага по умолчанию = 5 500 ₽/мес', r['def'] == 5500 and r['hk'] == 'dorm' and r['old'] == 5500, r)
    check('действие «Жильё» зарегистрировано', r['act'], r)
    check('комната 11 500, квартира 22 500, своя 5 000; «своя» без квартиры → общага', r['room'] == 11500 and r['flat'] == 22500 and r['own'] == 5000 and r['ownNoFlat'] == 'dorm', r)
    check('сон в съёмной комнате восстанавливает больше, чем в общаге', r['sleepGain'] > r['sleepGainDorm'], r)
    # расчёт зарплаты списывает выбранные расходы (общага → ровно 5 500)
    r = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.flags.shurFriend = 1; s.car.job = 'tokar'; s.car.rank = 5;
      const calc = (h) => { s.flags.housing = h; s.pay.acc = 40000; s.pay.adv = 16000; s.pay.pen = 0; s.pay.viol = 1; s.pay.qn = 1; s.pay.prem = 0.5; s.money = 50000; const w = G.week; G.week = () => 3; G.payday(); G.week = w; return s.money; };
      return { dorm: calc('dorm'), room: calc('room') }; }""")
    check('в расчёте комната дороже общаги ровно на 6 000 ₽', r['dorm'] - r['room'] == 6000, r)
    # 7. окно «Жильё» открывается, переезд в комнату списывает залог и меняет расходы
    r = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.car.job = 'tokar'; s.car.rank = 5; s.money = 30000; s.phase = 'free';
      G.mq.length = 0; G.cur = null; G.busy = false; G.ACT.housing.fn(s); const m = G.cur || G.modal.cur || null;
      const titles = (G.cur && G.cur.opts) ? G.cur.opts.map(o => o.t + '|' + (o.dis || '')) : null; return { titles, has: !!G.cur }; }""")
    check('окно «Жильё» открывается: 4 варианта + каталог покупки + закрыть', r['has'] and r['titles'] and len(r['titles']) == 6 and any('Купить жильё' in t for t in r['titles']), r)
    r = p.evaluate("""() => { const s = G.s; const i = G.cur.opts.findIndex(o => /Съёмная комната/.test(o.t)); G.choose(i); return { h: G.housing(), money: s.money, fixed: G.fixedCosts().total }; }""")
    check('переезд в комнату: залог 9 000 списан, расходы 11 500', r['h'] == 'room' and r['money'] == 21000 and r['fixed'] == 11500, r)
    # 8. темп карьеры: PACE 1.5 для новых; текущий шаг старого сохранения идёт по прежнему темпу, следующий — по новому
    r = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s;
      const out = { pace: G.CONFIG.PACE, newNeed: G.career.reqLines()[0].t };
      s.car.rank = 1; s.car.shifts = 12; s.car.ladderStepAt = 4; delete s.car.paceSchema; delete s.car.paceStep; G.load && 0;
      s.car.paceSchema = 1; s.car.paceStep = 1; out.oldNeed = G.career.reqLines()[0].t;
      delete s.car.paceStep; out.liveNeed = G.career.reqLines()[0].t; return out; }""")
    check('PACE по умолчанию 1.5, первый экзамен через 8 смен (было 5)', r['pace'] == 1.5 and r['newNeed'].endswith('/ 8 смен'), r)
    check('старый шаг (разряд 1→2) идёт по прежним 10 сменам, новый — по 15', r['oldNeed'].endswith('/ 10 смен') and r['liveNeed'].endswith('/ 15 смен'), r)
    # 9. образ жизни: по умолчанию 0 ₽, выбор по рангу, расход в расчёте, бонус сна
    r = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.car.job = 'tokar'; s.car.rank = 8; s.money = 100000;
      const out = { def: G.fixedCosts().total, k: G.lifestyle(), act: !!G.ACT.lifestyle };
      s.flags.lifestyle = 'repr'; out.repr = G.fixedCosts().total; out.label = G.fixedCosts().label;
      s.flags.housing = 'flat'; out.both = G.fixedCosts().total; delete s.flags.housing;
      s.st.energy = 20; s.st.mood = 50; s.t.hour = 22; const e1 = s.st.energy; try { G.sleep(); } catch (e) {} out.gainRepr = s.st.energy - e1;
      s.flags.lifestyle = 'modest'; s.st.energy = 20; s.t.hour = 22; const e2 = s.st.energy; try { G.sleep(); } catch (e) {} out.gainModest = s.st.energy - e2;
      s.car.rank = 2; s.flags.lifestyle = 'modest'; G.mq.length = 0; G.cur = null; G.busy = false; G.ACT.lifestyle.fn(s); out.opts = G.cur.opts.map(o => o.t + '|' + (o.dis || ''));
      return out; }""")
    check('образ жизни по умолчанию «Скромный»: расходы 5 500', r['def'] == 5500 and r['k'] == 'modest' and r['act'], r)
    check('«Представительский» +30 000, вместе с квартирой 52 500; строка в расчёте', r['repr'] == 35500 and r['both'] == 52500 and 'образ жизни' in r['label'], r)
    check('образ жизни улучшает сон', r['gainRepr'] > r['gainModest'], r)
    check('на низком ранге элитный недоступен', any('Элитный' in o and 'Нужен ранг 9' in o for o in r['opts']), r)
    b.close()
srv.shutdown()
print('\nИТОГ:', 'все проверки пройдены' if not fails else 'ОШИБКИ: %s' % fails)
raise SystemExit(1 if fails else 0)
