# 教育資料素養提升計畫網站（新版）

多頁式網站：研習（找場次、我的研習、證書查驗、常見問題）、分析平台、最新消息、關於計畫，加上講師、縣市承辦與計畫承辦用的後台。
技術與分析平台 edu-analytics 的前端一致：Vite 5、React 18、TypeScript、React Router 6。設計依據在 `../docs/design/`。

## 目前是「示範模式」

還沒有後端。帳號、場次、報名、證明等資料是示範資料，存在使用者瀏覽器的 localStorage：

- 畫面最上方的深色示範列可以切換身分（訪客、學員、受推薦者、講師、縣市承辦、計畫承辦），也能打開「示範信箱」看系統寄出的信
- 「重設示範資料」會回到初始狀態
- 示範資料以 2026-10-07 為「今天」（`src/demo/logic.ts` 的 `TODAY`），場次日期才對得上

最新消息、活動、常見問題仍讀 Google 試算表「網站內容」（讀不到時用 `src/data/content.json` 備份）。
試算表「設定」工作表加一列「重要公告」，首頁頂端就會出現公告橫幅；「重要公告連結」可填網址。
沒有這一列時，示範版會顯示一則範例公告；有這一列但內容留白則不顯示。

## 本機開發

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # 型別檢查＋打包到 dist/
```

## 部署到 Vercel

1. 在 Vercel 匯入這個 GitHub repo
2. **Root Directory** 設為 `web`（Framework Preset 會自動辨識為 Vite；Build Command `npm run build`、Output `dist`）
3. 環境變數（選填）：`VITE_ANALYTICS_URL` = 分析平台網址。沒設時，「進入分析平台」只會停在示範的跳轉頁
4. Deploy。之後每次 push，Vercel 會自動重新部署；其他分支會有自己的預覽網址

`vercel.json` 把所有路徑導回 `index.html`，讓 `/trainings/B2` 這類網址直接打開也能用。

## 之後接上後端（Render）

- 後端（FastAPI＋PostgreSQL）部署在 Render 後，在 `vercel.json` 的 rewrites **最前面**加一條：
  `{ "source": "/api/(.*)", "destination": "https://<服務名>.onrender.com/api/$1" }`
  瀏覽器看到的都是同一個網域，登入 cookie 不會被當成第三方 cookie
- 前端只透過 `src/demo/store.tsx` 的 `useDemo()` 讀寫資料；接後端時把這一層換成呼叫 `/api`，畫面不用改
- 報名資格、狀態等規則（`src/demo/logic.ts`）屆時搬到後端，前端只負責顯示

## 檔案

| 路徑 | 內容 |
|---|---|
| `src/App.tsx` | 所有網址與頁面的對應 |
| `src/components/` | 頁首頁尾、示範列、場次卡、共用元件（按鈕、狀態標籤、對話框） |
| `src/pages/` | 各頁；`admin/` 是後台 |
| `src/demo/` | 示範資料、報名規則、資料存取（之後換成後端） |
| `src/lib/content.tsx` | 讀 Google 試算表 |
| `src/styles/global.css` | 全站樣式（設計系統見 `docs/design/visual.html`） |
| `public/platform-demo.js` | 分析平台試玩，與舊網站 `assets/demo.js` 相同；改了舊的要複製一份過來 |
