# 入口網後端（api/）

FastAPI ＋ PostgreSQL，與分析平台 edu-analytics 同一套技術。所有路徑都在 `/api` 底下，前端（Vercel）用 `web/vercel.json` 把 `/api` 轉到這裡，所以登入 cookie 是同網域的。

第一階段的功能：

- 帳號：註冊、email 驗證、登入、登出、忘記密碼、修改密碼、個人資料
- 角色：學員、講師、推動辦公室、計畫承辦、系統管理者（admin）
- 後台：網站內容（重要公告、最新消息、活動、常見問題、聯絡資訊）、場次與課程、寄件紀錄、帳號與權限、操作紀錄
- 取代原本的 Google 試算表

密碼規則：至少 8 個字元，含小寫與大寫英文字母，不能有 6 位連續或重複的數字（如 000000、123456、654321）。連續失敗 5 次鎖 15 分鐘。

## 部署到 Render（第一次）

1. Render → **New → Blueprint**，選這個 GitHub repo，Render 會讀根目錄的 `render.yaml`，建立：
   - 網站服務 `dl-portal-api`（starter）
   - 資料庫 `dl-portal-db`（basic-256mb）
2. 建立時會要求填三個變數：
   - `ADMIN_BOOTSTRAP_PASSWORD`：第一個系統管理者 `admin` 的臨時密碼（符合密碼規則）。首次登入會要求改密碼，改完之後可以把這個變數刪掉。
   - `BASE_URL`：前端網址，例如 `https://你的網站.vercel.app`（寄信連結與來源檢查用，結尾不要加 `/`）。
   - `ALLOWED_ORIGINS`：可留白；有自訂網域時，用逗號列出所有前端網址。
3. 部署完成後打開 `https://dl-portal-api.onrender.com/api/health`，看到 `{"ok":true}` 就成功了。
   - 服務名稱如果被占用、網址不同，要同步修改 `web/vercel.json` 裡的網址。
4. 第一次啟動會自動建立資料表，並匯入課程、115 年下半年場次、消息、常見問題與聯絡資訊。

## 前端切換成正式模式（Vercel）

Vercel → 專案 → Settings → Environment Variables：

- Production 新增 `VITE_MODE` = `live`，然後重新部署。
- Preview 不要設，分支預覽會維持示範模式（身分切換、示範信箱），方便大家試用。

## 寄信

`MAIL_BACKEND=outbox`（預設）：信件只記錄在後台「寄件紀錄」，不會真的寄出；可以從那裡複製驗證或重設連結給對方。
之後接上 Google 寄信時，把 `MAIL_BACKEND` 改成 `smtp`，並設定 `SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASSWORD`、`MAIL_FROM`。

## 本機開發

```bash
cd api
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
ADMIN_BOOTSTRAP_PASSWORD=Bootstrap2026 BASE_URL=http://localhost:5173 uvicorn app.main:app --reload   # 預設用 SQLite（dev.db）
python -m pytest -q tests                                     # 測試；設 DATABASE_URL 可改用 PostgreSQL
```

前端另開一個終端機：`cd web && VITE_MODE=live npm run dev`，`/api` 會轉到本機的 8000 埠。

## 注意

- 資料表目前由程式啟動時自動建立（`create_all`）；之後階段要改欄位時，會加上 Alembic 遷移。
- 正式承載真實個資（身分證字號等）前，請先確認存放地點符合計畫規範。
