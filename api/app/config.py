"""設定一律來自環境變數；本機開發可用 .env（不進 git）。"""
import os

def _env(key: str, default: str = "") -> str:
    return os.getenv(key, default).strip()

# 資料庫：Render 會給 postgres:// 開頭的連線字串，統一換成 psycopg 驅動
DATABASE_URL = _env("DATABASE_URL", "sqlite:///./dev.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgres://"):]
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgresql://"):]

SECRET_KEY = _env("SECRET_KEY", "dev-only-secret-change-me")
# 網站對外網址（寄信中的連結用），例如 https://data-literacy.vercel.app
BASE_URL = _env("BASE_URL", "http://localhost:5173").rstrip("/")
# 允許的來源（逗號分隔），檢查寫入請求的 Origin；空白時只看 BASE_URL
ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in _env("ALLOWED_ORIGINS").split(",") if o.strip()] or [BASE_URL]
COOKIE_SECURE = _env("COOKIE_SECURE", "1" if BASE_URL.startswith("https") else "0") == "1"

# 第一個系統管理者：帳號 admin，密碼由環境變數提供；首次登入強制改密碼
ADMIN_BOOTSTRAP_PASSWORD = _env("ADMIN_BOOTSTRAP_PASSWORD")

SESSION_HOURS = int(_env("SESSION_HOURS", "8"))
LOCK_AFTER = 5            # 連續失敗幾次鎖定
LOCK_MINUTES = 15

# 寄信：outbox＝只記錄在寄件紀錄（還沒設定寄信服務時）；smtp＝實際寄出
MAIL_BACKEND = _env("MAIL_BACKEND", "outbox")
MAIL_FROM = _env("MAIL_FROM", "教育資料素養提升計畫 <edl.office@tlkr.nknu.edu.tw>")
SMTP_HOST = _env("SMTP_HOST")
SMTP_PORT = int(_env("SMTP_PORT", "587"))
SMTP_USER = _env("SMTP_USER")
SMTP_PASSWORD = _env("SMTP_PASSWORD")
SMTP_STARTTLS = _env("SMTP_STARTTLS", "1") == "1"
