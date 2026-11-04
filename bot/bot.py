"""Минимальный Telegram-бот: открывает игру как Mini App.
Установка:  pip install python-telegram-bot==21.*
Запуск:     BOT_TOKEN=123:ABC WEBAPP_URL=https://<логин>.github.io/<репозиторий>/ python bot.py
"""
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, MenuButtonWebApp
from telegram.ext import Application, CommandHandler, ContextTypes

URL = os.environ["WEBAPP_URL"]

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    kb = InlineKeyboardMarkup([[InlineKeyboardButton("🏭 Выйти на смену", web_app=WebAppInfo(url=URL))]])
    await update.message.reply_text("АО «Чугунный век» ждёт нового работника. Пропуск — по кнопке.", reply_markup=kb)

async def post_init(app: Application):
    await app.bot.set_chat_menu_button(menu_button=MenuButtonWebApp(text="Играть", web_app=WebAppInfo(url=URL)))

app = Application.builder().token(os.environ["BOT_TOKEN"]).post_init(post_init).build()
app.add_handler(CommandHandler("start", start))
app.run_polling()
