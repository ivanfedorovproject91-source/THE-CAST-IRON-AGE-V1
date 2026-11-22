#!/usr/bin/env python3
"""Проверка интерфейса премиум-аккаунтов: золотое имя с короной, плашка Premium account, VIP-рамка, VIP-кабинет
(выплата 2500, титулы), VIP-объявления в чате, золотые имена в рейтинге, раздел «Премиум» в админ-кабинете.
Сервер подменяется заглушкой: серверная логика проверяется отдельно (node tests/admin_gas_test.js).
Запуск: python3 tests/premium_test.py (нужны python3 и playwright)."""
import http.server, os, socketserver, threading, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def log_message(s,*a): pass
srv = socketserver.TCPServer(('127.0.0.1',0),Q); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
fails=[]
def check(n,ok,info=''):
    print(('PASS ' if ok else 'FAIL ')+n+(('  -> '+str(info)) if info and not ok else ''))
    if not ok: fails.append(n)

SETUP = """() => { G.headless = true; G.newState('Олег Золотой', {}, G.D.EDU[0].id); const s=G.s; s.car.job=Object.keys(G.D.JOBS)[0]; s.car.rank=1; s.phase='evening'; s.t.hour=18; s.loc='home'; s.money=1000; G.mq.length=0; G.cur=null; G.busy=false; G.lb.uid = () => 'tg:5001'; return true; }"""
# заглушка сервера: то, что отвечает ping/чат/выплата. Всё «серверное» живёт в window.__srv
STUBS = """() => {
  window.__srv = { claims: 0, titleCalls: [], chatBodies: [] };
  G.srv.available = () => true;
  G.srv.post = (b) => {
    if (b.action === 'premium_claim') { window.__srv.claims++; return Promise.resolve(window.__srv.claims === 1 ? { ok: true, amount: 2500 } : { ok: false, error: 'already' }); }
    if (b.action === 'premium_title') { window.__srv.titleCalls.push(b.title); return Promise.resolve({ ok: true, title: b.title }); }
    return Promise.resolve({ ok: false, error: 'stub' });
  };
  G.CONFIG.CHAT_URL = 'https://chat.test/exec';
  const LIST = { ok: true, payout: 2500, titles: ['Олигарх Едрёностали', 'Король завода', 'Человек с деньгами'], list: [
    { uid: 'tg:5001', name: 'Олег Золотой', unique: true, since: 1790000000000, note: 'За тестировку игры', title: '', ach: ['Первая зарплата'] },
    { uid: 'tg:6001', name: 'Гена Уникальный', unique: true, since: 1790000000000, note: 'Лучший рабочий', title: 'Король завода', ach: ['Выжил в среду', 'Зять главбуха'] },
    { uid: 'tg:6002', name: 'Двойной Тёзка', unique: false, since: 1790000000000, note: 'Неоднозначное имя', title: '', ach: [] } ] };
  const CHAT = { ok: true, locked: false, msgs: [
    { id: 2, t: Date.now(), uid: 'tg:6001', name: 'Гена Уникальный', job: 'Токарь', text: 'Продаю гараж недорого', vip: true },
    { id: 3, t: Date.now(), uid: 'tg:7001', name: 'Простой Вася', job: 'Слесарь', text: 'Обычное сообщение', vip: false } ],
    prem: { 'tg:6001': { since: 1790000000000, note: 'Лучший рабочий', title: 'Король завода', ach: ['Выжил в среду', 'Зять главбуха'] } } };
  window.fetch = (u, o) => {
    const url = String(u);
    if (o && o.body && /chat_post/.test(o.body)) { window.__srv.chatBodies.push(JSON.parse(o.body)); return Promise.resolve({ json: () => ({ ok: true }) }); }
    if (/action=premium_list/.test(url)) return Promise.resolve({ ok: true, json: () => LIST });
    if (/action=chat_list/.test(url)) return Promise.resolve({ ok: true, json: () => CHAT });
    if (/action=top/.test(url)) return Promise.resolve({ ok: true, json: () => ({ ok: true, total: 4, me: { pos: 2, name: 'Олег Золотой', oj: 500, job: 'Токарь', shifts: 10 },
      rows: [ { pos: 1, name: 'Гена Уникальный', oj: 900, job: 'Токарь', shifts: 50 }, { pos: 2, name: 'Олег Золотой', oj: 500, job: 'Токарь', shifts: 10, me: true },
              { pos: 3, name: 'Двойной Тёзка', oj: 400, job: 'Слесарь', shifts: 8 }, { pos: 4, name: 'Простой Вася', oj: 100, job: 'Слесарь', shifts: 2 } ] }) });
    return Promise.resolve({ ok: true, json: () => ({ ok: false }) });
  };
  return true; }"""
PING = """(p) => { G.srv.onPingTest = 1; G.premium.onPing(p); return true; }"""
MINE = {'since': 1790000000000, 'note': 'За тестировку игры', 'title': '', 'payout': {'amount': 2500, 'claimable': True}}

with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:%d/index.html'%port); pg.wait_for_timeout(800)
    ev=lambda js,arg=None: pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
    ev(SETUP); ev(STUBS)

    # ---- 1. до выдачи: ничего золотого
    ev("G.ui.render()")
    check('обычный игрок: имя без короны и без золота', ev("!document.querySelector('.tb-name .pn') && !document.querySelector('.vip-frame')"))
    ev("G.ui.setTab('file')")
    check('обычный игрок: VIP-кабинета в «Деле» нет', ev("!document.querySelector('.prem-cab')"))

    # ---- 2. выдали премиум (ответ ping)
    ev(PING, MINE); ev("G.ui.setTab('shift')")
    check('шапка: имя золотое и с короной', ev("(document.querySelector('.tb-name .pn')||{}).textContent") == '👑 Олег Золотой', ev("document.querySelector('.tb-name').innerHTML"))
    check('шапка: VIP-рамка на аватаре', ev("!!document.querySelector('.tb-face.vip-frame')"))
    check('золотой цвет имени задан в стиле', ev("getComputedStyle(document.querySelector('.tb-name .pn')).color") == 'rgb(255, 210, 74)')
    ev("document.querySelector('.tb-name .pn').click()")
    pg.wait_for_timeout(100)
    m = ev("(document.querySelector('.modal')||{}).innerText||''")
    check('плашка по нажатию на имя: Premium account с короной', 'Premium account' in m and '👑' in m, m[:120])
    check('плашка: «Игроку доступны премиум функции»', 'Игроку доступны премиум функции' in m)
    check('плашка: запись от админа «За тестировку игры»', 'За тестировку игры' in m and 'запись администратора' in m.lower())
    check('VIP-профиль: статус, дата вступления, достижения', 'VIP-профиль' in m and 'Статус' in m and 'В премиуме с' in m and 'достижения' in m.lower(), m)
    check('VIP-профиль: дата вступления отформатирована', ev("/\\d{2}\\.\\d{2}\\.\\d{4}/.test((document.querySelector('.prem-prof')||{}).innerText||'')"))
    ev("G.choose(0)"); ev("G.mq.length=0; G.cur=null; G.busy=false; G.ui.hideModal()")

    # ---- 3. VIP-кабинет в «Деле»
    ev("G.ui.setTab('file')")
    check('«Дело»: имя золотое, рамка на портрете', ev("!!document.querySelector('.prev.vip-frame') && !!document.querySelector('#view .pn, .pn')"))
    check('«Дело»: виден VIP-кабинет с запиской админа', ev("(document.querySelector('.prem-cab')||{}).innerText||''").count('За тестировку игры') == 1)
    check('«Дело»: три эксклюзивных титула', all(t in ev("document.querySelector('.prem-cab').innerText") for t in ['Олигарх Едрёностали','Король завода','Человек с деньгами']))
    check('кнопка выплаты активна и показывает 2 500', ev("(function(){const b=[...document.querySelectorAll('.prem-cab .btn.hazard')][0]; return !!b && !b.disabled && /2\\s?500/.test(b.textContent);})()"))
    before = ev("G.s.money")
    ev("G.premium.claim()"); pg.wait_for_timeout(200)
    check('выплата: на счёт зачислено 2500', ev("G.s.money") - before == 2500, (before, ev("G.s.money")))
    check('выплата: кнопка стала недоступной', ev("(function(){const b=document.querySelector('.prem-cab .btn.hazard'); return !!b && b.disabled;})()"))
    ev("G.premium.mine.payout.claimable = true; G.premium.claim()"); pg.wait_for_timeout(200)
    check('выплата: повтор в тот же день (ответ сервера «already») ничего не начисляет', ev("G.s.money") - before == 2500, ev("G.s.money"))
    ev("G.premium.setTitle(1)"); pg.wait_for_timeout(200)
    check('титул: выбран «Король завода» (запрос ушёл на сервер)', ev("window.__srv.titleCalls[0]") == 'Король завода' and ev("G.premium.mine.title") == 'Король завода')
    ev("G.ui.render()")
    check('титул: отмечен в VIP-кабинете', ev("[...document.querySelectorAll('.prem-titles .chip.on')].map(x=>x.textContent).join('|')").startswith('Король завода'))
    ev("G.premium.setTitle(-1)"); pg.wait_for_timeout(200)
    check('титул: можно снять', ev("G.premium.mine.title") == '')

    # ---- 4. чат
    ev("G.chat.loaded=0; G.chat.load()"); pg.wait_for_timeout(300)
    ev("G.ui.setTab('shift')"); ev("document.body.insertAdjacentHTML('beforeend', '<div id=\"tmpchat\">'+G.chatBlock()+'</div>'); G.chat.draw()")
    html = ev("document.getElementById('chatList').innerHTML")
    check('чат: имя премиум-автора золотое и с короной', '👑 Гена Уникальный' in html and 'class="pn"' in html, html[:200])
    check('чат: VIP-объявление выделено', 'chm vip' in html and 'VIP-объявление' in html)
    check('чат: у обычного игрока нет короны', '👑 Простой Вася' not in html and 'Простой Вася' in html)
    check('чат: у премиума есть галочка «VIP-объявление»', ev("!!document.getElementById('chatVip')"))
    ev("document.getElementById('chatVip').checked = true; document.getElementById('chatIn').value = 'Привет от VIP игрока'; G.chat.lastSend = 0; G.chat.send()"); pg.wait_for_timeout(300)
    check('чат: объявление отправлено с признаком vip', ev("window.__srv.chatBodies.length") == 1 and ev("window.__srv.chatBodies[0].vip") is True)
    ev("document.getElementById('chatVip').checked = false; document.getElementById('chatIn').value = 'Обычное сообщение'; G.chat.lastSend = 0; G.chat.send()"); pg.wait_for_timeout(300)
    check('чат: без галочки признак vip не ставится', ev("window.__srv.chatBodies[1].vip") is False)
    ev("document.getElementById('tmpchat').remove()")
    # плашка по нажатию на чужое золотое имя
    ev("G.premium.card('tg:6001')"); pg.wait_for_timeout(100)
    m = ev("(document.querySelector('.modal')||{}).innerText||''")
    check('чужая плашка: запись админа и титул', 'Лучший рабочий' in m and 'Король завода' in m and 'Выжил в среду' in m, m)
    ev("G.mq.length=0; G.cur=null; G.busy=false; G.ui.hideModal()")

    # ---- 5. рейтинг
    ev("G.ui.setTab('rating'); G.lb.by='oj'; G.lb.sec='me'; G.lb.cache={}; G.ui.render()"); pg.wait_for_timeout(500)
    ev("G.ui.render()")
    rows = ev("[...document.querySelectorAll('.lbrow')].map(r => ({ nm: r.querySelector('.nm').textContent, gold: !!r.querySelector('.nm .pn') }))")
    d = {r['nm'].replace('👑 ',''): r for r in rows}
    check('рейтинг: премиум-игрок с уникальным именем — золотой с короной', d.get('Гена Уникальный',{}).get('gold') and d['Гена Уникальный']['nm'].startswith('👑'), rows)
    check('рейтинг: моя строка золотая', d.get('Олег Золотой',{}).get('gold'), rows)
    check('рейтинг: неоднозначное имя золота не получает (защита от двойников)', d.get('Двойной Тёзка',{}).get('gold') is False, rows)
    check('рейтинг: обычный игрок без золота', d.get('Простой Вася',{}).get('gold') is False, rows)
    check('рейтинг: «Твоё место» — золотое имя', ev("!!document.querySelector('.card .note .pn')"))
    ev("document.querySelector('.lbrow .nm .pn').click()"); pg.wait_for_timeout(100)
    check('рейтинг: нажатие на имя открывает плашку Premium account', 'Premium account' in ev("(document.querySelector('.modal')||{}).innerText||''"))
    ev("G.mq.length=0; G.cur=null; G.busy=false; G.ui.hideModal()")
    # защита от подмены: имя «золотого» нельзя ввести через HTML
    ev("G.premium.byName['x'] = null");
    check('имя с HTML не ломает вёрстку', ev("G.premium.name('<img src=x onerror=1>', {uid:'tg:1'})").count('<img') == 0)
    check('некорректный uid в onclick не пропускается', ev("G.premium.name('A', {uid:\"tg:1');alert(1);('\"})") == 'A')

    # ---- 6. снятие премиума: всё золото пропадает
    ev(PING, None); ev("G.ui.setTab('shift')")
    check('после снятия: имя и рамка обычные', ev("!document.querySelector('.tb-name .pn') && !document.querySelector('.vip-frame')"))
    ev("G.ui.setTab('file')")
    check('после снятия: VIP-кабинета нет', ev("!document.querySelector('.prem-cab')"))

    # ---- 7. админ-кабинет
    ev("() => { G.srv.role = 'owner'; window.__calls = []; G.srv.post = (b) => { window.__calls.push(b); if (b.action === 'admin' && b.op === 'me') return Promise.resolve({ ok: true, role: 'owner', perms: [], name: 'Владелец' }); if (b.action === 'admin' && b.op === 'premium_list') return Promise.resolve({ ok: true, payout: 2500, titles: [], list: [ { id: '5001', name: 'Олег Золотой', active: true, since: 1790000000000, note: 'За тестировку игры', by: 'Владелец', title: 'Король завода', lastPayout: 20261122, payoutTotal: 5000 }, { id: '5002', name: 'Бывший VIP', active: false, since: 1780000000000, note: 'Старая запись', by: 'Владелец', title: '', lastPayout: 0, payoutTotal: 0 } ] }); if (b.action === 'admin' && b.op === 'premium_grant') return Promise.resolve({ ok: true, granted: true }); return Promise.resolve({ ok: false, error: 'stub' }); }; return true; }")
    ev("G.admin.open()"); pg.wait_for_timeout(300)
    check('админка: вкладка «Премиум» есть', ev("[...document.querySelectorAll('.adm-tabs button')].some(b => /Премиум/.test(b.textContent))"))
    ev("document.querySelector('.adm-tabs [data-t=premium]').click()"); pg.wait_for_timeout(300)
    t = ev("document.getElementById('admBody').innerText")
    check('админка: список премиум-игроков с записью и выплатами', 'Олег Золотой' in t and 'За тестировку игры' in t and 'Король завода' in t and '5 000' in t and '22.11.2026' in t, t[:300])
    check('админка: снятый игрок помечен', 'снят' in t and 'Выдать снова' in t)
    ev("document.querySelector('[data-a=pgrant][data-id=\"\"]').click()"); pg.wait_for_timeout(100)
    ev("(function(){const ins=document.querySelectorAll('.adm-dbox input'); ins[0].value='5003'; ins[1].value='За тестировку игры';})()")
    ev("document.querySelector('.adm-dbox [data-x=\"1\"]').click()"); pg.wait_for_timeout(300)
    call = ev("window.__calls.filter(c => c.op === 'premium_grant')[0]")
    check('админка: выдача отправляет ID и запись для игрока', call and call['args']['uid'] == '5003' and call['args']['reason'] == 'За тестировку игры', call)

    check('нет ошибок страницы', not errs, errs)
    b.close()
print('\nИТОГ:', 'ВСЁ ПРОШЛО' if not fails else 'ПРОВАЛЕНО: %d' % len(fails))
sys.exit(1 if fails else 0)
