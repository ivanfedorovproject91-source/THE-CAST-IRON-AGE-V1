#!/usr/bin/env python3
"""Платформы: ВКонтакте (ПК и телефон), Telegram и обычный браузер. Запуск: python3 tests/vk_platform_test.py
VK Bridge подменяется заглушкой (настоящий работает только внутри ВКонтакте), всё остальное — настоящая игра:
определение платформы, запуск оболочки, подпись для сервера, имя игрока, вибро, облачное сохранение (в т.ч. лимит 4096 байт),
вёрстка на ПК и телефоне."""
import http.server, os, socketserver, threading, json, time
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
BASE = 'http://127.0.0.1:%d/index.html' % srv.server_address[1]

def vk_url(platform='desktop_web', uid='4242', ts=None):
    return BASE + '?vk_access_token_settings=&vk_app_id=5551234&vk_is_app_user=1&vk_language=ru&vk_platform=%s&vk_ref=catalog_featured&vk_ts=%d&vk_user_id=%s&sign=TESTSIGN' % (platform, ts or int(time.time()), uid)

# Заглушка VK Bridge: запоминает вызовы, хранит VK Storage в памяти и режет значения больше 4096 байт, как настоящее хранилище
VK_MOCK = """
(function () {
  window.__vkCalls = []; window.__vkStore = window.__vkStoreInit || {}; window.__vkBadWrites = 0; window.__vkMax = 0;
  window.vkBridge = {
    send: function (m, p) {
      window.__vkCalls.push([m, p || {}]);
      if (m === 'VKWebAppGetUserInfo') return Promise.resolve({ id: 4242, first_name: 'Иван', last_name: 'Чугунов' });
      if (m === 'VKWebAppStorageGet') return Promise.resolve({ keys: p.keys.map(function (k) { return { key: k, value: window.__vkStore[k] || '' }; }) });
      if (m === 'VKWebAppStorageSet') {
        if (!/^[a-zA-Z_\\-0-9]{1,100}$/.test(p.key)) { window.__vkBadWrites++; return Promise.reject({ error_type: 'client_error' }); }
        var bytes = new TextEncoder().encode(p.value || '').length; window.__vkMax = Math.max(window.__vkMax, bytes);
        if (bytes > 4096) { window.__vkBadWrites++; }
        if (!p.value) delete window.__vkStore[p.key]; else window.__vkStore[p.key] = p.value.slice(0, 4096);
        return Promise.resolve({ result: true });
      }
      return Promise.resolve({ result: true });
    },
    subscribe: function (fn) { window.__vkSub = fn; }, supportsAsync: function () { return Promise.resolve(true); }
  };
})();
"""
TG_MOCK = """
window.__tgCalls = [];
window.Telegram = { WebApp: { initData: 'query_id=AAA&user=%7B%22id%22%3A777%2C%22first_name%22%3A%22%D0%A2%D0%B0%D0%BD%D1%8F%22%7D&auth_date=1&hash=abc', initDataUnsafe: { user: { id: 777, first_name: 'Таня' } },
  platform: 'android', ready() { __tgCalls.push('ready'); }, expand() { __tgCalls.push('expand'); }, isVersionAtLeast: () => true, setHeaderColor() {}, setBackgroundColor() {}, onEvent() {}, disableVerticalSwipes() {},
  HapticFeedback: { impactOccurred: k => __tgCalls.push('impact:' + k), notificationOccurred: k => __tgCalls.push('notify:' + k) },
  CloudStorage: { getItem: (k, cb) => cb(null, ''), setItem: (k, v, cb) => cb(null, true), removeItems: (ks, cb) => cb(null, true) } } };
"""

def newpage(pw, vk=False, tg=False, w=390, h=844, vk_store=None, no_gzip=False, requests=None):
    b = pw.chromium.launch(args=['--no-sandbox']); ctx = b.new_context(viewport={'width': w, 'height': h}); p = ctx.new_page()
    p.on('pageerror', lambda e: fails.append('pageerror: ' + str(e)))
    if requests is not None: p.on('request', lambda r: requests.append(r.url))
    p.route('**/telegram.org/**', lambda r: r.abort()); p.route('**/fonts.g*/**', lambda r: r.abort())
    p.route('**/script.google.com/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{"ok":true,"role":"","perms":[],"cfg":{"params":{}}}'))
    if no_gzip: p.add_init_script("delete window.CompressionStream; delete window.DecompressionStream;")
    if vk:
        if vk_store is not None: p.add_init_script('window.__vkStoreInit = ' + json.dumps(vk_store) + ';')
        p.route('**/js/vendor/vk-bridge.min.js*', lambda r: r.fulfill(status=200, content_type='application/javascript', body=VK_MOCK))
    if tg: p.add_init_script(TG_MOCK)
    return b, p

MAKE = """() => { G.headless = true; G.newState('Иван', G.defaultAv(), 'chpu'); G.s.phase = 'morning'; G.s.car.shifts = 12; G.s.t.day = 30; G.headless = false; G.save(); return true; }"""

with sync_playwright() as pw:
    # ---------- 1. ВКонтакте, ПК
    reqs = []
    b, p = newpage(pw, vk=True, w=1000, h=700, requests=reqs)
    p.goto(vk_url('desktop_web')); p.wait_for_timeout(900)
    r = p.evaluate("""() => ({ name: G.platform.name(), vk: G.platform.isVk(), desk: G.platform.isDesktop(), uid: G.platform.userId(), init: G.platform.initData(), label: G.platform.label(),
      cls: document.documentElement.className, calls: window.__vkCalls.map(c => c[0]), user: G.platform.userName(), screen: document.getElementById('screen').innerHTML.length })""")
    check('VK/ПК: платформа распознана', r['name'] == 'vk' and r['vk'] and r['desk'] and r['label'] == 'ВКонтакте', r)
    check('VK: userId вида vk:4242', r['uid'] == 'vk:4242', r['uid'])
    check('VK: для сервера уходит vk: + параметры запуска с sign', r['init'].startswith('vk:') and 'vk_user_id=4242' in r['init'] and 'sign=TESTSIGN' in r['init'], r['init'])
    check('VK: отправлен VKWebAppInit, запрошено имя', r['calls'].count('VKWebAppInit') == 1 and 'VKWebAppGetUserInfo' in r['calls'], r['calls'])
    check('VK: имя игрока из VK', r['user'] == 'Иван', r['user'])
    check('VK: классы платформы на <html>', 'plat-vk' in r['cls'] and 'plat-desktop' in r['cls'], r['cls'])
    check('VK: скрипт Telegram не запрашивался', not any('telegram.org' in u for u in reqs), [u for u in reqs if 'telegram' in u])
    check('VK: игра отрисовалась (титульный экран)', r['screen'] > 200, r['screen'])
    p.evaluate("() => { G.s = null; G.ui.newGame(); }"); p.wait_for_timeout(200)
    check('VK: имя героя подставляется из VK', p.evaluate("() => G.ui.draft && G.ui.draft.name") == 'Иван')
    # рейтинг и сервер
    p.evaluate(MAKE); p.wait_for_timeout(100)
    lb = p.evaluate("() => ({ uid: G.lb.uid(), init: G.lb.payload().initData, cs: G.srv.available(), si: G.srv.initData() })")
    check('VK: рейтинг и чат используют подпись VK', lb['uid'] == 'vk:4242' and lb['init'].startswith('vk:') and lb['cs'] and lb['si'].startswith('vk:'), lb)
    # пинг на сервер чата: тело запроса содержит initData VK
    sent = []
    p.unroute('**/script.google.com/**')
    def grab(route):
        try: sent.append(json.loads(route.request.post_data or '{}'))
        except Exception: pass
        route.fulfill(status=200, content_type='application/json', body='{"ok":true,"role":"","perms":[],"cfg":{"params":{}}}')
    p.route('**/script.google.com/**', grab)
    p.evaluate("() => G.srv.ping()"); p.wait_for_timeout(400)
    check('VK: пинг на сервер несёт initData VK', any(x.get('action') == 'ping' and str(x.get('initData', '')).startswith('vk:') for x in sent), sent)
    # вибро на ПК не вызывается (там его нет)
    p.evaluate("() => { G.settings.haptic = true; G.buzz('light'); G.buzz('success'); }")
    check('VK/ПК: вибро не вызывается', not any(c.startswith('VKWebAppTaptic') for c in p.evaluate("() => window.__vkCalls.map(c => c[0])")))
    # вёрстка ПК
    lay = p.evaluate("""() => { const a = document.getElementById('app').getBoundingClientRect(); return { w: a.width, left: a.left, h: a.height, sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight }; }""")
    check('ПК: колонка игры ≤ 560 px и по центру', lay['w'] <= 560 and abs(lay['left'] - (lay['iw'] - lay['w']) / 2) < 2, lay)
    check('ПК: нет горизонтальной прокрутки, высота = окну', lay['sw'] <= lay['iw'] and abs(lay['h'] - lay['ih']) < 3, lay)
    p.evaluate("() => { G.ui.mode = 'play'; G.ui.render && G.ui.render(); }"); p.wait_for_timeout(300)
    p.screenshot(path='/tmp/claude-0/vk_desktop.png')
    # окно создания бригады — своё, не системное
    for _ in range(8):  # закрыть уже открытые окна («Что нового» и т.п.), иначе наше встанет в очередь за ними
        if not p.evaluate("() => !!document.querySelector('#modal-root .modal')"): break
        p.evaluate("() => { const b = document.querySelector('#modal-root .modal button'); b && b.click(); }"); p.wait_for_timeout(200)
    p.evaluate("() => G.ui.brigCreate()"); p.wait_for_timeout(300)
    check('Бригада: название вводится в окне игры (не window.prompt)', p.evaluate("() => !!document.getElementById('brigName')"))
    p.evaluate("() => { const el = document.getElementById('brigName'); el.value = 'Литейщики'; el.dispatchEvent(new Event('input', { bubbles: true })); const bs = [...document.querySelectorAll('#modal-root .modal button')]; bs.find(b => /Создать/.test(b.textContent)).click(); }"); p.wait_for_timeout(1900)
    check('Бригада: кнопка «Создать» отправляет запрос на сервер', any(x.get('action') == 'brigade_create' and x.get('name') == 'Литейщики' and str(x.get('initData', '')).startswith('vk:') for x in sent), sent)
    b.close()

    # ---------- 2. ВКонтакте, телефон
    b, p = newpage(pw, vk=True, w=390, h=844)
    p.goto(vk_url('mobile_android')); p.wait_for_timeout(900)
    r = p.evaluate("() => ({ desk: G.platform.isDesktop(), cls: document.documentElement.className, calls: window.__vkCalls })")
    check('VK/телефон: не ПК, классы plat-mobile', (not r['desk']) and 'plat-mobile' in r['cls'], r)
    vs = [c for c in r['calls'] if c[0] == 'VKWebAppSetViewSettings']
    check('VK/телефон: цвет оболочки задан', vs and vs[0][1].get('action_bar_color') == '#121110', vs)
    p.evaluate("() => { G.settings.haptic = true; G.buzz('light'); G.buzz('success'); G.buzz('error'); }"); p.wait_for_timeout(100)
    tc = p.evaluate("() => window.__vkCalls.filter(c => c[0].indexOf('VKWebAppTaptic') === 0)")
    check('VK/телефон: вибро идёт через Taptic', ['VKWebAppTapticImpactOccurred', 'VKWebAppTapticNotificationOccurred'] == [c[0] for c in tc][:2] and tc[0][1].get('style') == 'light' and tc[1][1].get('type') == 'success' and tc[2][1].get('type') == 'error', tc)
    p.evaluate("() => window.__vkSub({ detail: { type: 'VKWebAppUpdateConfig', data: { insets: { top: 0, bottom: 34, left: 0, right: 0 } } } })")
    check('VK/телефон: нижний отступ из VK применён', p.evaluate("() => document.documentElement.style.getPropertyValue('--safe-b')") == '34px')
    lay = p.evaluate("() => ({ w: document.getElementById('app').getBoundingClientRect().width, sw: document.documentElement.scrollWidth, iw: innerWidth })")
    check('Телефон: на всю ширину, без горизонтальной прокрутки', abs(lay['w'] - lay['iw']) < 2 and lay['sw'] <= lay['iw'], lay)
    p.evaluate(MAKE); p.evaluate("() => { G.ui.mode = 'play'; G.ui.render && G.ui.render(); }"); p.wait_for_timeout(300)
    p.screenshot(path='/tmp/claude-0/vk_mobile.png')
    b.close()

    # ---------- 3. Облако VK: сжатие, лимит 4096 байт, восстановление на новом устройстве
    for gz in (True, False):
        tag = 'со сжатием' if gz else 'без сжатия (старый браузер)'
        b, p = newpage(pw, vk=True, no_gzip=not gz)
        p.goto(vk_url()); p.wait_for_timeout(500)
        p.evaluate("""() => { G.headless = true; G.newState('Иван Чугунов', G.defaultAv(), 'chpu'); G.s.phase = 'morning'; G.s.car.shifts = 77; G.s.t.day = 120;
          G.s.flags.bigNote = []; for (let i = 0; i < 400; i++) G.s.flags.bigNote.push('Запись №' + i + ': выговор за опоздание и премия за рационализаторское предложение «Чугунок» 🐈');
          G.headless = false; G.save(); }""")
        p.evaluate("() => { G.cloud.synced = true; return G.cloud.push(); }"); p.wait_for_timeout(2500)
        st = p.evaluate("() => ({ keys: Object.keys(window.__vkStore).length, meta: JSON.parse(window.__vkStore.cv_meta || 'null'), max: window.__vkMax, bad: window.__vkBadWrites, status: G.cloud.status, raw: localStorage.getItem(G.SAVE_KEY).length })")
        print('   ', tag, '→ ключей:', st['keys'], 'сохранение:', st['raw'], 'символов, самое большое значение:', st['max'], 'байт')
        check('Облако VK (%s): записано, ни одно значение не больше 4096 байт' % tag, st['meta'] and st['bad'] == 0 and st['max'] <= 4096 and st['keys'] < 400, st)
        check('Облако VK (%s): метка сжатия соответствует' % tag, (st['meta'] or {}).get('enc') == ('gz' if gz else ''), st['meta'])
        store = p.evaluate("() => window.__vkStore")
        # изменение мелочи: перезапись только изменившихся кусков
        before = p.evaluate("() => window.__vkCalls.filter(c => c[0] === 'VKWebAppStorageSet').length")
        p.evaluate("() => { G.s.money += 5; G.save(); return G.cloud.push(); }"); p.wait_for_timeout(2500)
        after = p.evaluate("() => window.__vkCalls.filter(c => c[0] === 'VKWebAppStorageSet').length")
        check('Облако VK (%s): повторная запись не переписывает всё (экономия лимита запросов)' % tag, (after - before) < max(2, st['keys']) if st['keys'] > 3 else True, (before, after, st['keys']))
        store = p.evaluate("() => window.__vkStore")
        b.close()
        # новое устройство: локального сохранения нет — игра подтягивает прогресс из облака
        b, p = newpage(pw, vk=True, vk_store=store, no_gzip=not gz)
        p.goto(vk_url()); p.wait_for_timeout(4500)
        rs = p.evaluate("() => ({ has: G.hasSave(), name: G.s && G.s.name, shifts: G.s && G.s.car.shifts, day: G.s && G.s.t.day, big: G.s && G.s.flags.bigNote && G.s.flags.bigNote.length, st: G.cloud.status })")
        check('Облако VK (%s): на новом устройстве прогресс восстановлен без потерь' % tag, rs['has'] and rs['name'] == 'Иван Чугунов' and rs['shifts'] == 77 and rs['day'] == 120 and rs['big'] == 400, rs)
        b.close()

    # ---------- 4. Telegram — как раньше
    reqs = []
    b, p = newpage(pw, tg=True, requests=reqs)
    p.goto(BASE); p.wait_for_timeout(900)
    r = p.evaluate("() => ({ name: G.platform.name(), vk: G.platform.isVk(), uid: G.platform.userId(), init: G.platform.initData(), user: G.platform.userName(), cloud: G.cloud.available(), cls: document.documentElement.className })")
    check('Telegram: платформа tg, userId, имя, облако', r['name'] == 'tg' and r['uid'] == 'tg:777' and r['user'] == 'Таня' and r['cloud'] and not r['vk'], r)
    check('Telegram: initData уходит как есть (без префикса vk:)', r['init'].startswith('query_id=AAA'), r['init'])
    check('Telegram: VK Bridge не загружался', not any('vk-bridge' in u for u in reqs), [u for u in reqs if 'vk' in u])
    p.evaluate("() => { G.settings.haptic = true; G.buzz('light'); G.buzz('success'); }")
    check('Telegram: вибро через HapticFeedback', p.evaluate("() => __tgCalls.filter(c => c.indexOf(':') > 0)") == ['impact:light', 'notify:success'])
    check('Telegram: ready/expand вызваны', 'ready' in p.evaluate("() => __tgCalls") and 'expand' in p.evaluate("() => __tgCalls"))
    p.evaluate("() => { G.s = null; G.ui.newGame(); }")
    check('Telegram: имя героя подставляется из Telegram', p.evaluate("() => G.ui.draft && G.ui.draft.name") == 'Таня')
    b.close()

    # ---------- 5. Обычный браузер
    b, p = newpage(pw)
    p.goto(BASE); p.wait_for_timeout(900)
    r = p.evaluate("() => ({ name: G.platform.name(), init: G.platform.initData(), uid: G.platform.userId(), cloud: G.cloud.available(), screen: document.getElementById('screen').innerHTML.length, lb: G.lb.uid().slice(0, 4) })")
    check('Браузер: платформа web, без подписи и облака, игра работает', r['name'] == 'web' and r['init'] == '' and r['uid'] is None and not r['cloud'] and r['screen'] > 200 and r['lb'] == 'dev:', r)
    b.close()

    # ---------- 6. Подпись VK не должна «угадываться» из чужого адреса: без sign или без vk_app_id платформа — не VK
    b, p = newpage(pw, vk=True)
    p.goto(BASE + '?vk_user_id=1'); p.wait_for_timeout(600)
    check('Адрес без sign/vk_app_id не считается запуском из VK', p.evaluate("() => G.platform.isVk()") is False)
    b.close()

print('\nFAILS:', fails)
raise SystemExit(1 if fails else 0)
