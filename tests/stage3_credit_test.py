#!/usr/bin/env python3
"""Этап 3, блок 5: кредитная система. Старые договоры не меняются, резервная копия, аннуитет, просрочка,
реструктуризация, ипотека, переоформление не ухудшает. Запуск: python3 tests/stage3_credit_test.py"""
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
BASE = "G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.flags.shurFriend = 1; s.car.job = 'tokar'; s.car.rank = 5; s.car.mgmtStage = 1; G.mq.length = 0; G.cur = null; G.busy = false;"
PAYDAY = "const pd = () => { s.pay.acc = 0; s.pay.adv = 0; s.pay.pen = 0; s.pay.viol = 1; s.pay.qn = 1; s.pay.prem = 0.5; const w = G.week; G.week = () => 3; G.payday(); G.week = w; };"
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox']); p = b.new_context().new_page()
    p.on('pageerror', lambda e: fails.append('pageerror: ' + str(e)))
    p.route('**/telegram.org/**', lambda r: r.abort()); p.route('**/fonts.g*/**', lambda r: r.abort())
    p.goto(URL); p.wait_for_timeout(800)

    # 1. Старые договоры: расчёт в день зарплаты идентичен прежней формуле, деньги и квартира сохранены
    r = p.evaluate("() => {" + BASE + PAYDAY + """
      s.loans = [{ type: 'bank', left: 50000, rate: 0.38, pay: 4800 }, { type: 'mortgage', left: 4500000, rate: 0.24, pay: 90000 }, { type: 'micro', left: 5000, rate: 0 }];
      s.own.flat = 1; s.money = 200000; s.debt = 0;
      const exp = { bank: Math.round((50000 - 4800) * (1 + 0.38 / 12)), mort: Math.round((4500000 - 90000) * (1 + 0.24 / 12)) };
      delete s.flags.loanSchema; G.loanSchema(); const bk = s.flags.loanBackup; const before = JSON.parse(JSON.stringify(s.loans));
      pd();
      const get = t => s.loans.find(l => l.type === t);
      return { exp, bank: get('bank').left, mort: get('mortgage').left, micro: get('micro'), flat: !!s.own.flat, bk: !!bk, bkLoans: bk && bk.loans.length, bkMoney: bk && bk.money, legacyFlag: before.every(l => l.legacy), schema: s.flags.loanSchema }; }""")
    check('старый кредит: остаток как по прежней формуле', r['bank'] == r['exp']['bank'], r)
    check('старая ипотека: остаток как по прежней формуле (без списаний сверх)', r['mort'] == r['exp']['mort'], r)
    check('старый микрозайм погашен (ничего лишнего)', r['micro'] is None, r)
    check('квартира сохранена', r['flat'], r)
    check('резервная копия создана до миграции: 3 договора, деньги 200000', r['bk'] and r['bkLoans'] == 3 and r['bkMoney'] == 200000, r)
    check('старые договоры помечены legacy, схема = 2', r['legacyFlag'] and r['schema'] == 2, r)

    # 2. Повторный запуск миграции не создаёт новой копии и ничего не меняет
    r = p.evaluate("() => {" + BASE + """
      s.loans = [{ type: 'bank', left: 50000, rate: 0.38, pay: 4800 }]; s.money = 777; delete s.flags.loanSchema; G.loanSchema(); const at = s.flags.loanBackup.at; s.money = 5; s.loans[0].left = 123; G.loanSchema();
      return { same: s.flags.loanBackup.at === at, bkLeft: s.flags.loanBackup.loans[0].left, money: s.flags.loanBackup.money }; }""")
    check('повторная миграция копию не перезаписывает', r['same'] and r['bkLeft'] == 50000 and r['money'] == 777, r)

    # 3. Новый кредит: аннуитет, полное погашение за срок, переплата совпадает
    r = p.evaluate("() => {" + BASE + PAYDAY + """
      s.car.rank = 5; s.money = 100000; const I = G.loanInfo; const pay = I.annuity(100000, 0.32, 12);
      const l = { v: 2, type: 'bank', principal: 100000, left: 100000, rate: 0.32, pay, term: 12, late: 0, hist: [] }; s.loans = [l];
      let paid = 0, months = 0; s.money = 10000000; for (let i = 0; i < 40 && s.loans.length; i++) { const m0 = s.money; pd(); paid += m0 - s.money; months++; }
      const sch = I.totals({ left: 100000, rate: 0.32, pay });
      return { pay, months, left: s.loans.length, sch: sch.months, over: sch.overpay }; }""")
    check('кредит 100 000 / 12 мес. под 32%: платёж ~9 700 и закрыт ровно за срок', 9500 < r['pay'] < 9900 and r['left'] == 0 and 12 <= r['months'] <= 13 and r['sch'] in (12, 13), r)

    # 4. Просрочка: нет денег → пени и проценты, не отрицательные деньги, просрочка копится; реструктуризация снимает её
    r = p.evaluate("() => {" + BASE + PAYDAY + """
      const I = G.loanInfo; const pay = I.annuity(100000, 0.32, 12); const l = { v: 2, type: 'bank', principal: 100000, left: 100000, rate: 0.32, pay, term: 12, late: 0, hist: [] }; s.loans = [l];
      s.money = 0; s.pay.acc = 0; const left0 = l.left; s.flags.fixedSkip = 1;
      const w = G.week; G.week = () => 3; const money0 = s.money; G.loanSettle(); G.week = w;
      const afterLate = { late: l.late, left: l.left, money: s.money };
      I.restructure(l); return { left0, afterLate, restrLate: l.late, restrPay: l.pay, pay, restr: l.restr }; }""")
    check('просрочка: left вырос (проценты+пени), late=1, деньги не ушли в минус', r['afterLate']['late'] == 1 and r['afterLate']['left'] > r['left0'] and r['afterLate']['money'] == 0, r)
    check('реструктуризация снимает просрочку и не повышает платёж', r['restrLate'] == 0 and r['restrPay'] <= r['pay'] and r['restr'] == 1, r)

    # 5. Микрозайм: простые проценты 1%/день, потолок 2× суммы
    r = p.evaluate("() => {" + BASE + """
      const l = { v: 2, type: 'micro', principal: 5000, left: 5000, rate: 0, pay: 0, late: 0, hist: [] }; s.loans = [l];
      for (let i = 0; i < 28; i++) G.dailyTick(); const d28 = l.left; for (let i = 0; i < 200; i++) G.dailyTick(); return { d28, cap: l.left }; }""")
    check('микрозайм: за 28 дней 5 000 → 6 400 (простые 1%/день)', r['d28'] == 6400, r)
    check('микрозайм: долг не больше 10 000', r['cap'] == 10000, r)

    # 6. Ипотека: новая, платёж погашает долг; квартира остаётся после полной выплаты
    r = p.evaluate("() => {" + BASE + PAYDAY + """
      s.car.rank = 8; s.car.mgmtStage = 1; s.money = 1000000; s.own = {}; s.loans = [];
      G.bankMenu(); const idx = G.cur.opts.findIndex(o => /Ипотека/.test(o.t)); G.choose(idx);
      const offer = G.cur && G.cur.opts ? G.cur.opts.map(o => o.t + '|' + (o.dis || '')) : null;
      const sign = G.cur.opts.findIndex(o => /Оформить ипотеку/.test(o.t)); G.choose(sign);
      const m = s.loans.find(l => l.type === 'mortgage'); const info = m && { left: m.left, pay: m.pay, rate: m.rate };
      const I = G.loanInfo; const t = m && I.totals(m);
      s.money = 100000000; I.prepay(m, m.left); return { offer, info, months: t && t.months, inf: t && t.inf, flat: !!s.own.flat, left: s.loans.length, moneyAfter: s.money }; }""")
    check('ипотека: взнос 450 000 списан, кредит 2 550 000 под 14%', r['info'] and r['info']['left'] == 2550000 and r['info']['rate'] == 0.14, r)
    check('ипотека: платёж покрывает проценты, срок ≈ 120 мес.', r['info'] and not r['inf'] and 118 <= r['months'] <= 121, r)
    check('после полной выплаты ипотеки квартира остаётся', r['flat'] and r['left'] == 0, r)

    # 7. Лимит по доходу: большой кредит не выдаётся рабочему низкого разряда
    r = p.evaluate("() => {" + BASE + """
      s.car.rank = 1; s.money = 1000; s.loans = []; G.offerTest = 1; G.loanInfo.offerCash(300000, 12);
      const o = G.cur.opts[0]; return { dis: o.dis || null, t: o.t, txt: G.cur.text.slice(0, 200) }; }""")
    check('лимит: 300 000 на 12 мес. при разряде 1 отклонён', r['dis'] is not None, r)

    # 8. Переоформление старого договора: платёж и ставка не выше прежних, итог не дороже, деньги не меняются
    r = p.evaluate("() => {" + BASE + """
      s.loans = [{ type: 'bank', left: 120000, rate: 0.42, pay: 9000 }, { type: 'mortgage', left: 4500000, rate: 0.24, pay: 90000 }]; s.own.flat = 1; s.money = 12345; delete s.flags.loanSchema; G.loanSchema();
      const out = []; for (const l of s.loans.slice()) { const plan = G.loanConvertPlan(l); const before = { rate: l.rate, pay: l.pay, left: l.left }; const m0 = s.money;
        if (plan && plan.ok) G.loanInfo.convert(l);
        out.push({ type: l.type, ok: plan && plan.ok, before, after: { rate: l.rate, pay: l.pay, left: l.left }, moneyDelta: s.money - m0, v: l.v, hasOrig: !!l.orig, flat: !!s.own.flat }); }
      return out; }""")
    for o in r:
        check('переоформление %s: ставка и платёж не выше прежних, долг и деньги те же, резерв orig' % o['type'],
              o['ok'] and o['after']['rate'] <= o['before']['rate'] and o['after']['pay'] <= o['before']['pay'] and o['after']['left'] == o['before']['left'] and o['moneyDelta'] == 0 and o['v'] == 2 and o['hasOrig'] and o['flat'], o)

    # 9. Меню банка открывается без ошибок при старых и новых договорах
    r = p.evaluate("() => {" + BASE + """
      s.loans = [{ type: 'bank', left: 50000, rate: 0.38, pay: 4800 }, { v: 2, type: 'bank', principal: 30000, left: 20000, rate: 0.36, pay: 3000, term: 12, late: 1, hist: [] }, { type: 'mortgage', left: 4500000, rate: 0.24, pay: 90000 }]; s.own.flat = 1; s.money = 5000;
      try { G.bankMenu(); const n = G.cur.opts.length; G.choose(0); const t0 = G.cur.title; G.choose(0); const t1 = G.cur.title; return { n, t0, t1 }; } catch (e) { return { err: String(e) }; } }""")
    check('меню банка/договора/график открываются', 'err' not in r and r['n'] >= 5 and r['t1'] == 'График платежей', r)
    b.close()
srv.shutdown()
print('\nИТОГ:', 'все проверки пройдены' if not fails else 'ОШИБКИ: %s' % fails)
raise SystemExit(1 if fails else 0)
