"""Сервер общего рейтинга «Чугунного века».

Запуск:
    pip install -r requirements.txt
    BOT_TOKEN=123:ABC ALLOWED_ORIGIN=https://<логин>.github.io python server.py

Переменные окружения:
    BOT_TOKEN        токен бота из @BotFather (нужен для проверки подписи Telegram)
    ALLOWED_ORIGIN   откуда разрешены запросы (адрес игры), по умолчанию *
    PORT             порт, по умолчанию 8787
    DB_PATH          путь к файлу базы, по умолчанию ratings.db
    DEV=1            тестовый режим: принимает заголовок X-Dev-User вместо подписи Telegram
                     (НЕ включайте на боевом сервере)
Сервер должен быть доступен по HTTPS (Telegram Mini App не умеет ходить на http).
"""
import hashlib, hmac, json, os, re, sqlite3, time
from urllib.parse import parse_qsl
from aiohttp import web

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")
DEV = os.environ.get("DEV") == "1"
DB_PATH = os.environ.get("DB_PATH", "ratings.db")
MAX_AGE = int(os.environ.get("INITDATA_MAX_AGE", 3 * 24 * 3600))
MIN_INTERVAL = 20  # секунд между отправками от одного игрока

db = sqlite3.connect(DB_PATH, check_same_thread=False)
db.row_factory = sqlite3.Row
db.execute("PRAGMA journal_mode=WAL")
db.execute("""CREATE TABLE IF NOT EXISTS players(
    uid INTEGER PRIMARY KEY, name TEXT, job TEXT, money INTEGER, end TEXT, ver TEXT,
    cur_oj INTEGER, best_oj INTEGER, best_shifts INTEGER, best_rank INTEGER, days INTEGER,
    hidden INTEGER DEFAULT 0, updated REAL, last_post REAL)""")
db.commit()

COLS = {"oj": "best_oj", "shifts": "best_shifts", "rank": "best_rank"}


def auth(request):
    """Возвращает (uid, имя в телеграме) или None."""
    dev = request.headers.get("X-Dev-User")
    if DEV and dev:
        return int(hashlib.sha1(dev.encode()).hexdigest()[:8], 16), dev
    raw = request.headers.get("X-Init-Data", "")
    if not raw or not BOT_TOKEN:
        return None
    pairs = dict(parse_qsl(raw, keep_blank_values=True))
    got = pairs.pop("hash", None)
    if not got:
        return None
    check = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    calc = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calc, got):
        return None
    try:
        if time.time() - int(pairs.get("auth_date", "0")) > MAX_AGE:
            return None
        u = json.loads(pairs.get("user", "{}"))
        return int(u["id"]), u.get("first_name", "")
    except Exception:
        return None


def clamp(v, lo, hi):
    try:
        return max(lo, min(hi, int(v)))
    except Exception:
        return lo


@web.middleware
async def cors(request, handler):
    if request.method == "OPTIONS":
        resp = web.Response(status=204)
    else:
        try:
            resp = await handler(request)
        except web.HTTPException as e:
            resp = web.json_response({"ok": False, "error": e.reason}, status=e.status)
    resp.headers["Access-Control-Allow-Origin"] = ORIGIN
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Init-Data, X-Dev-User"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return resp


async def post_score(request):
    who = auth(request)
    if not who:
        return web.json_response({"ok": False, "error": "auth"}, status=401)
    uid, tg_name = who
    try:
        d = await request.json()
    except Exception:
        return web.json_response({"ok": False, "error": "json"}, status=400)
    now = time.time()
    row = db.execute("SELECT * FROM players WHERE uid=?", (uid,)).fetchone()
    if row and now - (row["last_post"] or 0) < MIN_INTERVAL:
        return web.json_response({"ok": False, "error": "too_fast"}, status=429)
    name = re.sub(r"[\x00-\x1f<>&\"']", "", str(d.get("name", ""))).strip()[:18] or tg_name[:18] or "Аноним"
    days = clamp(d.get("days"), 0, 4000)
    shifts = clamp(d.get("shifts"), 0, 4000)
    rank = clamp(d.get("rank"), 0, 10)
    oj = clamp(d.get("oj"), -100000, 10_000_000)
    money = clamp(d.get("money"), 0, 10**10)
    # базовая защита от накруток: за день не больше одной смены, очки жизни ограничены темпом игры
    if shifts > days + 1 or oj > 6000 + shifts * 80 or rank > 9 and shifts < 700:
        return web.json_response({"ok": False, "error": "implausible"}, status=422)
    job = re.sub(r"[\x00-\x1f<>&\"']", "", str(d.get("job", "")))[:40]
    end = str(d.get("end") or "")[:20] or None
    hidden = 1 if d.get("hidden") else 0
    ver = str(d.get("v", ""))[:12]
    b_oj = max(oj, row["best_oj"]) if row else oj
    b_sh = max(shifts, row["best_shifts"]) if row else shifts
    b_rk = max(rank, row["best_rank"]) if row else rank
    db.execute("""INSERT INTO players(uid,name,job,money,end,ver,cur_oj,best_oj,best_shifts,best_rank,days,hidden,updated,last_post)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(uid) DO UPDATE SET name=excluded.name,job=excluded.job,money=excluded.money,end=excluded.end,
        ver=excluded.ver,cur_oj=excluded.cur_oj,best_oj=excluded.best_oj,best_shifts=excluded.best_shifts,
        best_rank=excluded.best_rank,days=excluded.days,hidden=excluded.hidden,updated=excluded.updated,last_post=excluded.last_post""",
               (uid, name, job, money, end, ver, oj, b_oj, b_sh, b_rk, days, hidden, now, now))
    db.commit()
    return web.json_response({"ok": True})


def fmt(r, pos, me_uid=None):
    return {"pos": pos, "name": r["name"], "job": r["job"], "oj": r["best_oj"], "shifts": r["best_shifts"],
            "rank": r["best_rank"], "end": r["end"], "me": r["uid"] == me_uid}


async def get_top(request):
    by = request.query.get("by", "oj")
    col = COLS.get(by, "best_oj")
    limit = clamp(request.query.get("limit", 50), 1, 100)
    who = auth(request)
    uid = who[0] if who else None
    rows = db.execute(f"SELECT * FROM players WHERE hidden=0 ORDER BY {col} DESC, updated ASC LIMIT ?", (limit,)).fetchall()
    total = db.execute("SELECT COUNT(*) FROM players WHERE hidden=0").fetchone()[0]
    out = [fmt(r, i + 1, uid) for i, r in enumerate(rows)]
    me = None
    if uid:
        r = db.execute("SELECT * FROM players WHERE uid=? AND hidden=0", (uid,)).fetchone()
        if r:
            pos = db.execute(f"SELECT COUNT(*) FROM players WHERE hidden=0 AND ({col} > ? OR ({col} = ? AND updated < ?))",
                             (r[col], r[col], r["updated"])).fetchone()[0] + 1
            me = fmt(r, pos, uid)
    return web.json_response({"ok": True, "rows": out, "me": me, "total": total, "by": by})


async def health(request):
    return web.json_response({"ok": True, "service": "chugunny-vek-rating"})


app = web.Application(middlewares=[cors])
app.add_routes([web.get("/", health), web.post("/api/score", post_score), web.get("/api/top", get_top), web.route("OPTIONS", "/{tail:.*}", health)])

if __name__ == "__main__":
    if not DEV and not BOT_TOKEN:
        print("ВНИМАНИЕ: BOT_TOKEN не задан — авторизация Telegram не будет работать.")
    web.run_app(app, port=int(os.environ.get("PORT", "8787")))
