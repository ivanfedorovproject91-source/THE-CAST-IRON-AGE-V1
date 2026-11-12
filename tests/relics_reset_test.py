#!/usr/bin/env python3
"""Проверка: ни обычный сброс («Начать заново»), ни аварийный («Сбросить сохранение» на панели восстановления)
не удаляют коллекцию реликвий (chugunny_vek_relics_v1 и её резервную копию).

Запуск:  python3 tests/relics_reset_test.py     (нужны python3, playwright и Chrome/Chromium)
Тест сам поднимает локальный сервер из корня проекта и проходит настоящий интерфейс игры.
"""
import http.server, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY, BAK, BAD = 'chugunny_vek_relics_v1', 'chugunny_vek_relics_v1_bak', 'chugunny_vek_relics_v1_corrupt'
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

# Подмена: сторожевой таймер «мёртвого экрана» (3 с) срабатывает быстро и при пустом #screen —
# так настоящая панель восстановления из main.js появляется без искусственной поломки игры.
INIT = """(() => { const st = window.setTimeout;
  window.setTimeout = (f, t, ...a) => t === 3000 ? st(() => { const s = document.getElementById('screen'); if (s) s.innerHTML = ''; f(); }, 80) : st(f, t, ...a); })();"""

def page(b, init=None):
    p = b.new_context(viewport={'width': 390, 'height': 844}).new_page()
    p.on('pageerror', lambda e: fails.append('pageerror: ' + str(e)))
    p.route('**/telegram.org/**', lambda r: r.abort()); p.route('**/fonts.g*/**', lambda r: r.abort())
    if init: p.add_init_script(init)
    return p

def seed(p):
    """Игровое сохранение + коллекция с одним предметом + посторонний ключ."""
    p.evaluate("""() => { G.newState('Тест', G.defaultAv(), 'chpu'); G.save();
      G.relics.grant('rare_key_old_master', { grantKey: 'test:reset', force: true, source: 'тест' });
      localStorage.setItem('other_key', '1'); }""")

def snap(p):
    return p.evaluate("""([k, b, bad]) => ({
      main: localStorage.getItem(k), bak: localStorage.getItem(b), save: localStorage.getItem(G.SAVE_KEY), other: localStorage.getItem('other_key'),
      items: (JSON.parse(localStorage.getItem(k) || '{"items":[]}').items || []).map(x => x.itemId) })""", [KEY, BAK, BAD])

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'), args=['--no-sandbox'])

    # ---------- 1. Обычный сброс: «Начать заново» → «Да, стереть»
    p = page(b); p.goto(URL); p.wait_for_timeout(1000); seed(p)
    before = snap(p)
    check('[обычный] подготовка: основной ключ, копия и игровое сохранение есть', bool(before['main'] and before['bak'] and before['save']), before)
    p.evaluate("() => { G.mq.length = 0; G.cur = null; G.busy = false; document.getElementById('modal-root').innerHTML = ''; G.ui.mode = 'title'; G.ui.render(); G.ui.confirmNew(); }"); p.wait_for_timeout(300)
    p.locator('#modal-root button:has-text("Да, стереть")').click(); p.wait_for_timeout(400)
    after = snap(p)
    check('[обычный] игровое сохранение стёрто', after['save'] is None, after['save'])
    check('[обычный] основной ключ коллекции не изменился', after['main'] == before['main'])
    check('[обычный] резервная копия коллекции не изменилась', after['bak'] == before['bak'])
    check('[обычный] предмет на месте', after['items'] == ['rare_key_old_master'], after['items'])
    p.reload(); p.wait_for_timeout(1000)
    check('[обычный] после перезагрузки предмет на месте', p.evaluate("() => G.relics.exportState().items.map(x => x.itemId)") == ['rare_key_old_master'])

    # ---------- 2. Аварийный сброс: настоящая кнопка на панели восстановления
    p = page(b, INIT); p.goto(URL); p.wait_for_timeout(1000); seed(p)
    before = snap(p)
    p.evaluate("() => { document.getElementById('screen').innerHTML = ''; }")
    p.reload(); p.wait_for_timeout(1500)          # панель появится сама, #screen пуст на момент проверки
    btn = p.locator('button:has-text("Сбросить сохранение")')
    check('[аварийный] панель восстановления показана', btn.count() == 1, btn.count())
    if btn.count() == 1:
        # кнопка делает location.reload(): дожидаемся перезагрузки и проверяем уже новое состояние
        with p.expect_navigation():
            btn.click()
        p.wait_for_timeout(500)
        after = snap(p)
        check('[аварийный] игровое сохранение стёрто', after['save'] is None, after['save'])
        check('[аварийный] посторонний ключ стёрт (сброс реально сработал)', after['other'] is None, after['other'])
        check('[аварийный] основной ключ коллекции не изменился', after['main'] == before['main'])
        check('[аварийный] резервная копия коллекции не изменилась', after['bak'] == before['bak'])
        check('[аварийный] предмет на месте', after['items'] == ['rare_key_old_master'], after['items'])

    # ---------- 3. Аварийный сброс при повреждённой коллекции: файл «на вскрытие» тоже не удаляется
    p = page(b, INIT); p.goto(URL); p.wait_for_timeout(1000); seed(p)
    p.evaluate("([k, bad]) => { localStorage.setItem(bad, '{broken-copy'); }", [KEY, BAD])
    p.evaluate("() => { document.getElementById('screen').innerHTML = ''; }"); p.reload(); p.wait_for_timeout(1500)
    with p.expect_navigation():
        p.locator('button:has-text("Сбросить сохранение")').click()
    p.wait_for_timeout(500)
    check('[аварийный] копия повреждённой записи (_corrupt) не удалена', p.evaluate("(bad) => localStorage.getItem(bad)", BAD) == '{broken-copy')
    b.close()

srv.shutdown()
print('\nИТОГ:', 'ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ' if not fails else 'ПРОВАЛЕНО: %d' % len(fails))
sys.exit(1 if fails else 0)
