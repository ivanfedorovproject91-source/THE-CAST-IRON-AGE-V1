#!/usr/bin/env python3
"""Этап 5: сохранения, облако, диагностика. Запуск: python3 tests/stage5_saves_test.py"""
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
    def do_GET(s):
        if s.path.startswith('/js/stage4_social.js') and getattr(Q, 'break_social', False):
            s.send_response(404); s.end_headers(); return
        return super().do_GET()
srv = socketserver.TCPServer(('127.0.0.1', 0), Q)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]
MOCK = """
window.__cloud = {}; window.Telegram = { WebApp: { initData: '', ready() {}, expand() {}, isVersionAtLeast: () => true, setHeaderColor() {}, setBackgroundColor() {}, onEvent() {}, disableVerticalSwipes() {},
  CloudStorage: { getItem: (k, cb) => cb(null, window.__cloud[k] || ''), setItem: (k, v, cb) => { window.__cloud[k] = v; cb(null, true); }, removeItems: (ks, cb) => { ks.forEach(k => delete window.__cloud[k]); cb(null, true); } } } };
"""
def newpage(pw, init=None, mock=False):
    b = pw.chromium.launch(args=['--no-sandbox']); ctx = b.new_context(); p = ctx.new_page()
    p.on('pageerror', lambda e: fails.append('pageerror: ' + str(e)))
    p.route('**/telegram.org/**', lambda r: r.abort()); p.route('**/fonts.g*/**', lambda r: r.abort())
    if mock: p.add_init_script(MOCK)
    if init: p.add_init_script(init)
    return b, p
with sync_playwright() as pw:
    # ---- 1. старое сохранение (прежняя версия игры, без новых полей, с кредитом и квартирой): копия до обновления и инварианты
    b, p = newpage(pw)
    p.goto(URL); p.wait_for_timeout(600)
    old = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const s = G.s; s.car.job = 'tokar'; s.car.rank = 8; s.car.shifts = 300; s.money = 123456; s.t.day = 400; s.phase = 'work';
      s.own = { flat: true }; s.debt = 0; s.loans = [{ id: 'L1', type: 'bank', left: 50000, pay: 5000, amount: 60000, hist: [{ d: 1 }] }, { id: 'L2', type: 'mortgage', left: 2000000, pay: 40000, amount: 2550000 }];
      delete s.flags.loanSchema; delete s.flags.lifestyle; delete s.flags.housing; delete s.flags.strikes; delete s.flags.finals; s.gameVer = '3.13.0'; G.headless = false;
      const raw = JSON.stringify({ s, settings: G.settings }); localStorage.setItem(G.SAVE_KEY, raw); return raw; }""")
    p.reload(); p.wait_for_timeout(900)
    r = p.evaluate("""() => ({ pre: localStorage.getItem(G.SAVEKEYS.pre), meta: JSON.parse(localStorage.getItem(G.SAVEKEYS.preMeta) || 'null'), inv: G.loadInfo.invariants, money: G.s.money, loans: G.s.loans.map(l => [l.id, l.left]), flat: !!G.s.own.flat, rank: G.s.car.rank, ver: G.s.gameVer, mm: !!G.migrationMismatch })""")
    check('перед миграцией создана копия, идентичная исходному сохранению', r['pre'] == old and r['meta'] and r['meta']['from'] == '3.13.0', (r['meta'], r['pre'] == old))
    check('после миграции деньги, ранг, квартира и кредиты не изменились', r['inv'] is True and r['money'] == 123456 and r['rank'] == 8 and r['flat'] and r['loans'] == [['L1', 50000], ['L2', 2000000]] and not r['mm'], r)
    check('версия сохранения обновилась', r['ver'] == '3.17.0', r)
    # повторная загрузка: копия «до обновления» не перезаписывается новым состоянием
    p.evaluate("() => { G.headless = false; G.s.money += 777; G.save(); }")
    p.reload(); p.wait_for_timeout(700)
    r2 = p.evaluate("() => localStorage.getItem(G.SAVEKEYS.pre)")
    check('копия «до обновления» не перезаписывается при следующих запусках', r2 == old)

    # ---- 2. повреждённое сохранение: не стирается, восстановление из скользящей копии
    p.evaluate("() => { G.forceBackup(); }")
    meta = p.evaluate("() => localStorage.getItem(G.SAVEKEYS.rollingMeta)")
    check('скользящая копия создаётся по запросу', meta is not None and json.loads(meta)['shifts'] == 300, meta)
    p.evaluate("() => { G.save = function () {}; localStorage.setItem(G.SAVE_KEY, '{\"s\": {broken'); }")
    p.reload(); p.wait_for_timeout(900)
    r = p.evaluate("() => ({ rec: G.loadInfo.recovered, has: !!G.s, money: G.s && G.s.money, corrupt: localStorage.getItem(G.SAVEKEYS.corrupt) })")
    check('повреждённое сохранение восстановлено из копии, исходное сохранено для разбора', r['rec'] == 'скользящая копия' and r['has'] and r['money'] == 123456 + 777 and r['corrupt'] == '{"s": {broken', r)
    p.evaluate("() => { G.save = function () {}; localStorage.removeItem(G.SAVEKEYS.rolling); localStorage.removeItem(G.SAVEKEYS.pre); localStorage.setItem(G.SAVE_KEY, '{oops'); }")
    p.reload(); p.wait_for_timeout(800)
    r = p.evaluate("() => ({ s: !!G.s, raw: localStorage.getItem(G.SAVE_KEY) })")
    check('без копий битое сохранение не стирается', not r['s'] and r['raw'] == '{oops', r)

    # ---- 3. проверка состояния (NaN) и импорт
    r = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); const a = G.saveSane(G.s); G.s.money = NaN; const b = G.saveSane(G.s); G.s.money = 5; const imp = G.importSave('не json'); const imp2 = G.importSave(JSON.stringify({ s: { st: {}, t: {}, car: {} } })); return { a, b, imp: imp.ok, imp2: imp2.ok }; }""")
    check('проверка состояния: исправное проходит, NaN ловится, чужой текст не импортируется', r['a'] == [] and 'деньги' in r['b'] and not r['imp'] and not r['imp2'], r)
    b.close()

    # ---- 4. диагностика загрузки модулей
    Q.break_social = True
    b, p = newpage(pw); p.goto(URL); p.wait_for_timeout(1800)
    r = p.evaluate("() => ({ failed: G.diag.failed, missing: G.diag.missing, bar: !!document.getElementById('diag-bar') })")
    check('не загрузившийся файл обнаружен и показана плашка', r['failed'] == ['stage4_social.js'] and r['bar'], r)
    check('отсутствие функций модуля тоже видно', any('friendCooling' in m for m in r['missing']), r)
    b.close(); Q.break_social = False
    b, p = newpage(pw); p.goto(URL); p.wait_for_timeout(1800)
    r = p.evaluate("() => ({ failed: G.diag.failed, missing: G.diag.missing, bar: !!document.getElementById('diag-bar'), n: G.diag.modules, txt: G.diag.text().length })")
    check('в исправной сборке сообщений об ошибках нет (без ложных срабатываний)', not r['failed'] and not r['missing'] and not r['bar'] and r['n'] > 40, r)
    b.close()

    # ---- 5. облако
    D = lambda p, a, b_: p.evaluate("(a) => G.cloud.decide(a[0], a[1])", [a, b_])
    b, p = newpage(pw); p.goto(URL); p.wait_for_timeout(600)
    L = lambda run, sh, ts: {'run': run, 'shifts': sh, 'ts': ts}
    C_ = lambda run, sh, ts, same=False: {'run': run, 'shifts': sh, 'ts': ts, 'same': same}
    check('на устройстве пусто — восстановить из облака', D(p, None, C_('a', 5, 1))['act'] == 'restore')
    check('то же сохранение — ничего не делаем', D(p, L('a', 5, 1), C_('a', 5, 1, True))['act'] == 'none')
    check('то же прохождение, локальное новее — записать в облако', D(p, L('a', 50, 900000), C_('a', 40, 10))['act'] == 'push')
    check('то же прохождение, облако новее — спросить', D(p, L('a', 40, 10), C_('a', 50, 900000))['act'] == 'ask')
    check('НОВОЕ прохождение с маленьким прогрессом не затирает продвинутое облачное молча', D(p, L('b', 2, 9999999), C_('a', 300, 10))['act'] == 'ask')
    check('новое прохождение, обогнавшее облачное — можно записывать', D(p, L('b', 400, 10), C_('a', 300, 9999999))['act'] == 'push' or D(p, L('b', 400, 10), C_('a', 300, 10))['act'] == 'push')
    b.close()

    # сценарий с имитацией облака Telegram
    b, p = newpage(pw, mock=True); p.goto(URL); p.wait_for_timeout(600)
    # заливаем в облако продвинутое прохождение, затем стартуем новое на «втором устройстве»
    p.evaluate("""() => { G.headless = true; G.newState('Старый', G.defaultAv(), 'chpu'); G.s.car.shifts = 500; G.s.car.job = 'tokar'; G.s.car.rank = 7; G.s.phase = 'work'; G.headless = false; G.save(); }""")
    p.evaluate("() => { G.cloud.synced = true; G.cloud.push(); }"); p.wait_for_timeout(600)
    meta = json.loads(p.evaluate("() => window.__cloud.cv_meta"))
    check('метка облака содержит прохождение и прогресс', meta.get('shifts') == 500 and meta.get('run'), meta)
    cloud_before = p.evaluate("() => JSON.stringify(window.__cloud)")
    # новое прохождение: «Начать снова» → короткая игра → автосохранение не должно затереть облако
    p.evaluate("""() => { G.wipe(); G.headless = true; G.newState('Новый', G.defaultAv(), 'chpu'); G.s.car.shifts = 3; G.s.car.job = 'tokar'; G.s.phase = 'work'; G.headless = false; G.mq.length = 0; G.cur = null; G.busy = false; G.save(); }""")
    p.evaluate("() => G.cloud.push()"); p.wait_for_timeout(500)
    cloud_after = p.evaluate("() => JSON.stringify(window.__cloud)")
    m = p.evaluate("() => ({ title: G.cur && G.cur.title, st: G.cloud.status })")
    check('«Начать снова» не стирает облачный прогресс без вопроса', cloud_after == cloud_before and m['title'] and 'Новое прохождение' in m['title'], m)
    p.evaluate("() => { G.choose(0); }"); p.wait_for_timeout(600)
    meta2 = json.loads(p.evaluate("() => window.__cloud.cv_meta"))
    check('после явного согласия облако перезаписывается', meta2.get('shifts') == 3, meta2)
    b.close()

    # синхронизация при запуске: облако продвинутее, локальное — новое прохождение
    b, p = newpage(pw, mock=True); p.goto(URL); p.wait_for_timeout(500)
    p.evaluate("""() => { G.headless = true; G.newState('Старый', G.defaultAv(), 'chpu'); G.s.car.shifts = 500; G.s.car.job = 'tokar'; G.s.phase = 'work'; G.headless = false; G.save(); G.cloud.synced = true; G.cloud.push(); }""")
    p.wait_for_timeout(500); cloud = p.evaluate("() => JSON.stringify(window.__cloud)")
    p.evaluate("""() => { G.headless = true; G.newState('Новый', G.defaultAv(), 'chpu'); G.s.car.shifts = 2; G.s.car.job = 'tokar'; G.s.phase = 'work'; G.headless = false; G.save(); }""")
    p.evaluate("() => { G.mq.length = 0; G.cur = null; G.busy = false; G.cloud.synced = false; G.cloud.sync(); }"); p.wait_for_timeout(800)
    m = p.evaluate("() => ({ title: G.cur && G.cur.title, synced: G.cloud.synced, dec: G.cloud.lastDecision })")
    check('при запуске: разные прохождения → вопрос, облако не тронуто, запись заблокирована', m['title'] and 'отличается' in m['title'] and m['dec']['act'] == 'ask' and not m['synced'] and p.evaluate("() => JSON.stringify(window.__cloud)") == cloud, m)
    p.evaluate("() => { G.cloud.push(); }"); p.wait_for_timeout(300)
    check('пока выбор не сделан, push не пишет', p.evaluate("() => JSON.stringify(window.__cloud)") == cloud)
    b.close()

    # ---- 6. меню разработчика не включает флаг читера без читов
    b, p = newpage(pw); p.goto(URL); p.wait_for_timeout(500)
    r = p.evaluate("""() => { G.headless = true; G.newState('Т', G.defaultAv(), 'chpu'); G.s.phase = 'work'; G.mq.length = 0; G.cur = null; G.busy = false; G.ui.debug(); const t = G.cur.opts.map(o => o.t); const dbg1 = !!G.s.flags.dbg; G.cur.opts.find(o => /Читы/.test(o.t)).fn(); G.cur = G.mq.shift(); return { t, dbg1, dbg2: !!G.s.flags.dbg }; }""")
    check('меню разработчика: диагностика/сохранение/облако безопасны, флаг читера только при входе в «Читы»', not r['dbg1'] and r['dbg2'] and any('Диагностика' in x for x in r['t']), r)
    b.close()
print('\nИТОГО: %s' % ('ВСЕ ПРОШЛИ' if not fails else 'ПРОВАЛЫ: %d' % len(fails)))
raise SystemExit(1 if fails else 0)
