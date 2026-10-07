# 教育資料素養提升計畫網站

一頁式計畫網站：最新消息、研習簡章與場次、課程介紹、AI 輔助分析平台入口、常見問題。
部署在 GitHub Pages：https://edgar802217.github.io/data-literacy-site/

## 內容怎麼更新

日常內容（消息、簡章、場次、活動、常見問題、聯絡資訊）都在 Google 試算表「網站內容」裡編輯，
改完重新整理網頁即可，不需要動程式。填寫規則寫在試算表的「使用說明」工作表。

網頁讀取內容的順序：

1. Google 試算表（`assets/app.js` 開頭的 `SHEET_ID`）
2. 瀏覽器快取：上次成功讀到的內容
3. `data/content.json`：repo 內的備份

試算表讀不到時（權限、網路、Google 服務異常），網頁會用 2 或 3 顯示，不會變成空白。
備份檔不會自動同步，內容有大改時，請把試算表各工作表的內容更新到 `data/content.json`。

試算表必須設為「知道連結的使用者可以檢視」，網頁才讀得到。

## 檔案

| 路徑 | 內容 |
|---|---|
| `index.html` | 頁面結構；課程介紹、平台介紹這類很少變動的段落直接寫在這裡 |
| `assets/style.css` | 樣式（顏色取自 LOGO；刻意只做淺色版） |
| `assets/app.js` | 讀取試算表並顯示內容 |
| `data/content.json` | 內容備份 |
| `tools/build_sheet.py` | 產生試算表範本（xlsx）與 `data/content.json`，需要 openpyxl |
| `assets/taiwan-map.js` | 研習場次地圖的縣市輪廓與四區標記座標 |
| `tools/expo_src.html` | 展場互動展區（2026 資訊教育科技展）的頁面原始檔；試玩程式以 `/*DEMO_JS*/` 佔位 |
| `tools/build_expo.py` | 把 `expo_src.html` 和 `assets/demo.js` 組成可離線開啟的單一 HTML（輸出在 repo 根目錄，檔名結尾 `_重構版.html`）。改了展區頁或 `demo.js` 後執行 `python tools/build_expo.py` |
| `portal-demo/index.html` | 入口網（帳號、研習報名、推薦邀請、結業與全教網、講師管理、分析平台權限）的討論用操作示範。單一檔案、資料全在瀏覽器裡，上方可切換身分。網址：`/portal-demo/` |
| `tools/build_map.py` | 由 [taiwan-atlas](https://www.npmjs.com/package/taiwan-atlas) 的 `counties-10t.json` 產生 `assets/taiwan-map.js`；研習地點換了就改檔案裡的 `VENUES` 座標再執行 |

## 修改程式或樣式後

GitHub Pages 會讓瀏覽器快取 `app.js`、`style.css` 10 分鐘。改了這兩個檔案後，
請把 `index.html` 裡對應的 `?v=數字` 加 1，訪客重新整理就會拿到新版。
（只改試算表內容不需要做這件事：試算表每次都會重新讀取。）

## 本機預覽

```bash
python -m http.server 8765
```

打開 http://localhost:8765

## 正式公開前

`index.html` 的 `<meta name="robots" content="noindex, nofollow">` 是內部預覽階段用的，避免被搜尋引擎收錄。
正式公開時刪掉這一行。
