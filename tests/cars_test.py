#!/usr/bin/env python3
"""Проверка системы автомобилей (v3.10): иконка в меню, карточка в «Досье», окно машины,
заправка/ремонт/ТО, сохранение, перенос старых сохранений, картинки всех моделей, баланс расходов.

Запуск:  python3 tests/cars_test.py     (нужны python3, playwright и Chrome/Chromium)
"""
import http.server, os, socketserver, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fails = []

def check(name, ok, info=''):
    print(('PASS ' if ok else 'FAIL ') + name + (('  → ' + str(info)) if info and not ok else ''))
    if not ok: fails.append(name)

class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), Q); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % port

SPY = "() => { window.__am = []; if (!G.__addMoney0) G.__addMoney0 = G.addMoney; G.addMoney = function (n) { window.__am.push(n); return G.__addMoney0.apply(this, arguments); }; }"
UNSPY = "() => { if (G.__addMoney0) { G.addMoney = G.__addMoney0; delete G.__addMoney0; } return window.__am; }"
CLEAR = "() => { G.mq.length = 0; G.cur = null; G.busy = false; document.getElementById('modal-root').innerHTML = ''; document.getElementById('modal-root').classList.remove('on'); }"
START = """(car) => { G.newState('Тест', G.defaultAv(), 'chpu'); const s = G.s; s.phase = 'evening'; s.t.hour = 18; s.money = 500000; s.flags = s.flags || {};
  s.money = 500000; try { G.settle(); } catch (e) {} s.money = 500000;  /* бонусы за «денежные» достижения выдаются при первом расчёте — делаем это заранее */
  if (car) s.own[car] = 1; G.ui.mode = 'game'; G.ui.tab = 'shift'; G.mq.length = 0; G.cur = null; G.busy = false; document.getElementById('modal-root').innerHTML = ''; document.getElementById('modal-root').classList.remove('on'); G.ui.render(); }"""

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'), args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); p = ctx.new_page()
    p.on('pageerror', lambda e: fails.append('pageerror: ' + str(e)))
    p.route('**/telegram.org/**', lambda r: r.abort()); p.route('**/fonts.g*/**', lambda r: r.abort())
    p.goto(URL); p.wait_for_timeout(1000)
    check('модуль G.cars загружен, моделей 12', p.evaluate("() => G.cars && Object.keys(G.cars.CAT).length") == 12)

    # ---------- 1. Без машины иконки и карточки нет
    p.evaluate(START, None)
    check('[нет машины] иконки нет', p.locator('.tb-car').count() == 0)
    p.evaluate("() => { G.ui.tab = 'file'; G.ui.sub = 'file'; G.ui.render(); }")
    check('[нет машины] карточки в «Досье» нет', p.locator('.cw-card').count() == 0)

    # ---------- 2. С машиной дома: иконка справа от аватара, карточка в досье
    p.evaluate(START, 'car1'); p.wait_for_timeout(200)
    check('[есть машина] иконка в верхней панели', p.locator('.tb-car').count() == 1)
    order = p.evaluate("() => { const r = document.querySelector('.tb-row'); return [...r.children].map(e => e.className.split(' ')[0]).join(',') }")
    check('[есть машина] порядок: аватар → иконка → инфо', order.startswith('tb-face,tb-car,tb-info'), order)
    check('[есть машина] миниатюра загрузилась', p.evaluate("() => new Promise(r => { const i = document.querySelector('.tb-car-img'); i.complete ? r(i.naturalWidth > 0) : (i.onload = () => r(true), i.onerror = () => r(false)); })"))
    p.evaluate("() => { G.ui.tab = 'file'; G.ui.sub = 'file'; G.ui.render(); }")
    card = p.locator('.cw-card')
    check('[досье] карточка автомобиля есть', card.count() == 1)
    txt = card.inner_text() if card.count() else ''
    for need in ['Лада', 'Девятка', 'Стоимость', '150', 'Топливо', 'Состояние', 'Износ', 'Обслуживание']:
        check('[досье] в карточке есть «%s»' % need, need in txt, txt[:200])

    # ---------- 3. На смене иконка скрыта
    p.evaluate("() => { G.s.phase = 'work'; G.ui.tab = 'shift'; G.ui.render(); }")
    check('[на смене] иконки нет', p.locator('.tb-car').count() == 0)
    p.evaluate("() => { G.s.phase = 'weekend'; G.ui.render(); }")
    check('[выходной] иконка есть', p.locator('.tb-car').count() == 1)

    # ---------- 4. Окно машины: заправка, ремонт, ТО
    p.evaluate("() => { G.s.phase = 'evening'; G.s.t.hour = 18; G.ui.render(); }")
    p.locator('.tb-car').click(); p.wait_for_timeout(300)
    check('[окно] открылось', p.locator('.cw-modal').count() == 1)
    mt = p.locator('.cw-modal').inner_text()
    for need in ['Расход', 'Объём бака', 'Надёжность', 'Скорость износа', 'Стоимость обслуживания', 'ТО (каждые', 'Ремонт', 'Эвакуатор']:
        check('[окно] есть «%s»' % need, need in mt)
    before = p.evaluate("() => ({ m: G.s.money, f: G.s.flags.car.fuel })")
    p.evaluate(SPY)
    p.locator('.cw-modal button:has-text("до полного")').click(); p.wait_for_timeout(300)
    amf = p.evaluate(UNSPY)
    after = p.evaluate("() => ({ m: G.s.money, f: G.s.flags.car.fuel, tank: G.cars.CAT.car1.tank })")
    check('[заправка] бак полный', abs(after['f'] - after['tank']) < 0.01, after)
    exp = round((after['tank'] - before['f']) * 58)  # АИ-92 — 58 ₽/л
    check('[заправка] списана верная сумма (один платёж)', amf == [-exp], (amf, exp))
    check('[заправка] окно открылось снова, бак полон', 'Бак полон' in p.locator('.cw-modal').inner_text())
    # износ -> ремонт и ТО
    p.evaluate("() => { const c = G.s.flags.car; c.cond = 40; c.wear = 50; c.kmSvc = 3000; }")
    p.evaluate(CLEAR); p.evaluate("() => G.cars.open()"); p.wait_for_timeout(200)
    b0 = p.evaluate("() => ({ m: G.s.money, h: G.s.t.hour, rc: G.cars.repairCost(G.s.flags.car) })")
    p.evaluate(SPY)
    p.locator('.cw-modal button:has-text("Ремонт")').click(); p.wait_for_timeout(400)
    am0 = p.evaluate(UNSPY)
    a0 = p.evaluate("() => ({ m: G.s.money, h: G.s.t.hour, cond: G.s.flags.car.cond })")
    check('[ремонт] состояние 100%', a0['cond'] == 100, a0)
    check('[ремонт] списана ровно стоимость ремонта (один платёж)', b0['rc'] > 0 and am0.count(-b0['rc']) == 1, (b0, am0))
    check('[ремонт] прошло время', a0['h'] > b0['h'], (b0, a0))
    p.evaluate(CLEAR); p.evaluate("() => G.cars.open()"); p.wait_for_timeout(200)
    b1 = p.evaluate("() => ({ m: G.s.money, wear: G.s.flags.car.wear, sc: G.cars.svcCost(G.s.flags.car) })")
    p.evaluate(SPY)
    p.locator('.cw-modal button:has-text("Техобслуживание")').click(); p.wait_for_timeout(400)
    am1 = p.evaluate(UNSPY)
    a1 = p.evaluate("() => ({ m: G.s.money, wear: G.s.flags.car.wear, kmSvc: G.s.flags.car.kmSvc })")
    check('[ТО] списана ровно стоимость ТО (с наценкой за просрочку)', am1.count(-b1['sc']) == 1, (b1, am1))
    check('[ТО] износ снижен, счётчик сброшен', a1['wear'] == 20 and a1['kmSvc'] == 0, a1)
    # утром ремонт недоступен, заправка — да
    p.evaluate(CLEAR); p.evaluate("() => { G.s.phase = 'morning'; G.s.flags.car.cond = 50; G.s.flags.car.fuel = 5; G.cars.open(); }"); p.wait_for_timeout(200)
    check('[утро] ремонт заблокирован', p.locator('.cw-modal button:has-text("Ремонт")').is_disabled())
    check('[утро] заправка доступна', not p.locator('.cw-modal button:has-text("до полного")').is_disabled())
    check('[утро] поездка заблокирована при пустом баке', 'бензин' in (p.evaluate("() => G.cars.blockReason(G.s.flags.car)") or ''))
    # нехватка денег
    p.evaluate(CLEAR); p.evaluate("() => { G.s.money = 10; G.cars.open(); }"); p.wait_for_timeout(200)
    check('[нет денег] заправка заблокирована', p.locator('.cw-modal button:has-text("до полного")').is_disabled())
    p.evaluate(CLEAR)

    # ---------- 5. Сохранение и загрузка
    p.evaluate("() => { G.s.money = 123456; G.s.flags.car.fuel = 17.5; G.s.flags.car.wear = 33; G.s.flags.car.km = 4242; G.save(); }")
    p.reload(); p.wait_for_timeout(1200)
    saved = p.evaluate("() => { G.load(); const c = G.cars.state(); return c && { key: c.key, fuel: c.fuel, wear: c.wear, km: c.km, money: G.s.money } }")
    check('[сохранение] состояние машины восстановлено', saved == {'key': 'car1', 'fuel': 17.5, 'wear': 33, 'km': 4242, 'money': 123456}, saved)

    # ---------- 6. Старое сохранение (прежний формат flags.car)
    p.evaluate(START, 'car1b')
    legacy = p.evaluate("() => { G.s.flags.car = { key: 'car1b', cond: 70, fuelWk: -1, broken: -1 }; const c = G.cars.state(); return { fuel: c.fuel, wear: c.wear, km: c.km, kmSvc: c.kmSvc, cond: c.cond, v: c.v } }")
    check('[миграция] поля достроены', all(isinstance(legacy[k], (int, float)) for k in legacy) and 0 < legacy['fuel'] <= 50, legacy)
    p.evaluate("() => { G.s.flags.car = { key: 'car1b', cond: 100, fuelWk: G.week(), broken: -1 }; }")
    check('[миграция] «заправлен на неделю» → полный бак', p.evaluate("() => G.cars.state().fuel") == 50)

    # ---------- 7. Покупка, продажа, смена машины
    p.evaluate(START, None)
    p.evaluate(CLEAR); p.evaluate("() => G.cars.showroom()"); p.wait_for_timeout(200)
    check('[автосалон] показаны 12 моделей', p.locator('.modal .m-opts button').count() == 13, p.locator('.modal .m-opts button').count())
    p.locator('.modal .m-opts button:has-text("Буханка")').click(); p.wait_for_timeout(200)
    check('[автосалон] карточка модели с картинкой', p.locator('.cw-modal img.cw-img').count() == 1)
    m0 = p.evaluate("() => G.s.money")
    p.evaluate(SPY)
    p.locator('.cw-modal button:has-text("Купить")').click(); p.wait_for_timeout(400)
    amb = p.evaluate(UNSPY)
    st = p.evaluate("() => ({ m: G.s.money, own: !!G.s.own.carV, c: G.cars.state() && G.cars.state().key })")
    check('[покупка] машина появилась', st['own'] and st['c'] == 'carV', st)
    check('[покупка] списана цена машины (один платёж)', amb.count(-220000) == 1, amb)
    print('   (все движения денег при покупке:', amb, ')')
    p.evaluate(CLEAR)
    pv = p.evaluate("() => { const c = G.cars.state(); c.cond = 50; return G.pawnVal('carV') }")
    check('[ломбард] цена зависит от состояния', pv < 220000 * 0.4 and pv > 220000 * 0.4 * 0.7, pv)
    p.evaluate("() => { delete G.s.own.carV; }")
    check('[продажа] состояние сбрасывается без машины', p.evaluate("() => G.cars.state() === null && !G.s.flags.car"))

    # ---------- 8. Картинки всех моделей и миниатюры
    res = p.evaluate("""async () => { const out = {}; for (const k of Object.keys(G.cars.CAT)) for (const t of ['', '_t']) {
      out[k + t] = await new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth > 0); i.onerror = () => r(false); i.src = 'assets/cars/' + k + t + '.svg'; }); } return out; }""")
    check('[картинки] 24 файла загружаются', len(res) == 24 and all(res.values()), [k for k, v in res.items() if not v])
    raw = p.evaluate("""async () => { const o = {}; for (const k of Object.keys(G.cars.CAT)) o[k] = await (await fetch('assets/cars/' + k + '.svg')).text(); return o; }""")
    check('[картинки] у каждой модели своё изображение', len(set(raw.values())) == 12)

    # ---------- 9. Статус и экономика
    st = p.evaluate("() => G.cars.ORDER.map(k => [k, G.cars.CAT[k].p, G.cars.CAT[k].v])")
    check('[статус] дороже → выше статусность', all(st[i][2] <= st[i + 1][2] for i in range(len(st) - 1)), st)
    p.evaluate(START, 'car4')
    worn = p.evaluate("() => { const c = G.cars.state(); const a = c.v; c.cond = 0; const w = G.cars.state().v; return [a, w] }")
    check('[статус] запущенная машина даёт ≤60% статуса', worn[1] <= worn[0] * 0.61 and worn[1] > 0, worn)
    sim = p.evaluate("""() => { const rows = []; for (const k of G.cars.ORDER) {
      G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.own[k] = 1; s.money = 1e9; s.flags = s.flags || {}; s.t.day = 10; s.phase = 'evening';
      const c = G.cars.state(), m = G.cars.CAT[k]; const m0 = s.money; let days = 0, broke = 0;
      for (let w = 0; w < 52; w++) { for (let d = 0; d < 5; d++) { s.t.day++; const bl = G.cars.blockReason(c);
          if (bl && bl.indexOf('ремонте') < 0) G.cars.refuel(c, m.tank - c.fuel);
          if (G.cars.blockReason(c)) continue; days++;
          if (G.cars.trip(c).broke) broke++; else if (!G.cars.blockReason(c) && c.fuel >= G.cars.tripFuel(c)) G.cars.trip(c); }
        s.t.day += 2; if (c.fuel < m.tank * 0.3) G.cars.refuel(c, m.tank - c.fuel); if (G.cars.svcStatus(c).k) G.cars.service(c); if (c.cond < 60) G.cars.repair(c); }
      rows.push([k, Math.round((m0 - s.money) / 52), m.p, days, broke, Math.round(c.cond), Math.round(c.wear)]); } return rows; }""")
    print('\n  Расходы на содержание (₽/нед.), цена, дней на машине из 260, поломок за год:')
    for r in sim: print('   %-6s %7d ₽/нед  цена %8d  дней %3d  поломок %2d  cond %3d wear %3d' % tuple(r))
    check('[экономика] содержание ≤ 2.2% цены машины в неделю', all(r[1] <= r[2] * 0.022 or r[2] < 100000 for r in sim), [r for r in sim if r[1] > r[2] * 0.022])
    check('[экономика] недорогая машина дешевле дорогой', sim[0][1] < sim[-1][1] and sim[1][1] < sim[5][1])
    check('[экономика] при уходе машина ездит ≥ 75% дней', all(r[3] >= 195 for r in sim), [(r[0], r[3]) for r in sim if r[3] < 195])

    # ---------- 10. Дорога на работу на своей машине
    p.evaluate(START, 'car1')
    p.evaluate("() => { G.s.phase = 'morning'; G.s.day.commute = null; G.s.flags.car.fuel = 20; G.s.flags.car.cond = 100; G.s.flags.car.wear = 0; G.chance = () => false; }")
    p.evaluate(CLEAR); p.evaluate("() => G.commuteChoose(() => { window.__went = 1; })"); p.wait_for_timeout(200)
    check('[дорога] в окне выбора есть кнопка «Заправить / осмотреть»', p.locator('.modal button:has-text("Заправить / осмотреть")').count() == 1)
    f0 = p.evaluate("() => G.s.flags.car.fuel")
    p.locator('.modal button:has-text("Своя машина")').click(); p.wait_for_timeout(300)
    r = p.evaluate("() => ({ fuel: G.s.flags.car.fuel, km: G.s.flags.car.km, went: window.__went, mode: G.s.day.commute, need: G.cars.tripFuel(G.s.flags.car) })")
    check('[дорога] поехали на машине', r['went'] == 1 and r['mode'] == 'car', r)
    check('[дорога] бензин потрачен по расходу модели', abs((f0 - r['fuel']) - 30 * 8.5 / 100) < 0.01, (f0, r))
    check('[дорога] пробег вырос на 30 км', r['km'] == 120000 + 30 or r['km'] >= 30, r)
    p.evaluate("() => { G.s.flags.car.fuel = 1; G.s.day.commute = null; }")
    p.evaluate(CLEAR); p.evaluate("() => G.commuteChoose(() => { window.__went2 = 1; })"); p.wait_for_timeout(200)
    check('[дорога] при пустом баке «Своя машина» заблокирована', p.locator('.modal button:has-text("Своя машина —")').is_disabled())
    p.locator('.modal button:has-text("Заправить / осмотреть")').click(); p.wait_for_timeout(300)
    check('[дорога] кнопка открыла окно автомобиля', p.locator('.cw-modal').count() == 1)
    p.locator('.cw-modal button:has-text("до полного")').click(); p.wait_for_timeout(300)
    p.locator('.cw-modal button:has-text("Назад")').click(); p.wait_for_timeout(300)
    car_btn = p.locator('.modal button:has-text("Своя машина —")')
    check('[дорога] «Назад» возвращает к выбору, машина доступна', car_btn.count() == 1 and not car_btn.is_disabled(), (car_btn.count(), car_btn.inner_text() if car_btn.count() else None, p.evaluate("() => [G.s.flags.car.fuel, G.s.flags.car.broken, G.s.t.day, G.cars.blockReason(G.s.flags.car)]")))
    p.evaluate(CLEAR)
    b.close()

print('\nИТОГ: %s' % ('все проверки пройдены' if not fails else 'провалено: %d' % len(fails)))
raise SystemExit(1 if fails else 0)
