/* 教育資料素養提升計畫網站
   內容來源優先順序：Google 試算表 → 瀏覽器快取（上次成功讀到的內容）→ data/content.json 備份。
   試算表的工作表與欄位名稱見 tools/build_sheet.py。 */

// Google 試算表 ID：網址 https://docs.google.com/spreadsheets/d/<這一段>/edit 中間那串
const SHEET_ID = "";
const TABS = ["設定", "消息", "簡章", "簡章條目", "場次", "活動", "常見問題"];
const CACHE_KEY = "dl-site-content-v1";
const NEWS_LIMIT = 5;

/* ---------- 讀取資料 ---------- */
function parseCSV(text) {
  const rows = []; let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head = [], ...body] = rows;
  const keys = head.map(h => h.trim());
  return body.filter(r => r.some(v => v.trim()))
    .map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] || "").trim()])));
}

async function fetchTab(name) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(name)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const text = await res.text();
  if (/^\s*</.test(text)) throw new Error(`${name}: 試算表未開放檢視`);  // 權限不足時 Google 回傳登入頁
  return parseCSV(text);
}

async function loadSheet() {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("逾時")), 8000));
  const tabs = await Promise.race([Promise.all(TABS.map(fetchTab)), timeout]);
  return Object.fromEntries(TABS.map((t, i) => [t, tabs[i]]));
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
}
function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* 無痕模式等情況可忽略 */ }
}

/* ---------- 小工具 ---------- */
const $ = id => document.getElementById(id);
const WD = "日一二三四五六";
const NUM = "一二三四五六七八九十";
const today = new Date(); today.setHours(0, 0, 0, 0);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const shown = r => (r["顯示"] || "是") !== "否";
const isUrl = s => /^https?:\/\//i.test(s || "");
const cnNum = n => n <= 10 ? NUM[n - 1] : n < 20 ? "十" + NUM[n - 11] : String(n);

// 接受 2026-10-31、2026/10/31、115/10/31（民國年）等寫法，回傳 Date 或 null
function toDate(s) {
  const m = String(s || "").match(/(\d{2,4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})/);
  if (!m) return null;
  let y = +m[1]; if (y < 1911) y += 1911;
  const d = new Date(y, +m[2] - 1, +m[3]);
  return isNaN(d) ? null : d;
}
const days = d => Math.round((d - today) / 864e5);
const md = d => `${d.getMonth() + 1}/${d.getDate()}`;
const wd = d => `（${WD[d.getDay()]}）`;
const ymd = d => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;

function regionColor(name) {
  if (/北/.test(name)) return "var(--c-north)";
  if (/中/.test(name)) return "var(--c-central)";
  if (/南/.test(name)) return "var(--c-south)";
  if (/東/.test(name)) return "var(--c-east)";
  return "var(--c-other)";
}

// 多行文字：「・」「-」開頭 → 條列；「1.」開頭 → 編號清單；其他 → 段落
function rich(text) {
  const out = []; let list = null;
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue;
    const bullet = line.match(/^[・•\-－]\s*(.*)$/), num = line.match(/^\d+\s*[.、)]\s*(.*)$/);
    const kind = bullet ? "ul" : num ? "ol" : null;
    if (kind) {
      if (!list || list.kind !== kind) { list = { kind, items: [] }; out.push(list); }
      list.items.push((bullet || num)[1]);
    } else { list = null; out.push(line); }
  }
  return `<div class="rich">${out.map(b => typeof b === "string"
    ? `<p>${esc(b)}</p>`
    : `<${b.kind}>${b.items.map(i => `<li>${esc(i)}</li>`).join("")}</${b.kind}>`).join("")}</div>`;
}

/* ---------- 畫面 ---------- */
let state = { data: null, active: null };

function renderSettings(rows) {
  const s = Object.fromEntries(rows.map(r => [r["項目"], r["內容"]]));
  if (s["標語"]) $("motto").textContent = s["標語"];
  const platform = isUrl(s["平台網址"]) ? s["平台網址"] : "";
  document.querySelectorAll('[data-link="platform"]').forEach(a => {
    if (platform) { a.href = platform; a.target = "_blank"; a.rel = "noopener"; }
    else { a.href = "#platform"; a.removeAttribute("target"); }
  });
  const contact = [["聯絡窗口", s["聯絡窗口"]], ["電子信箱", s["聯絡信箱"]], ["聯絡電話", s["聯絡電話"]]].filter(([, v]) => v);
  $("contact").innerHTML = contact.map(([k, v]) => `<dt>${k}</dt><dd>${
    k === "電子信箱" ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : esc(v)}</dd>`).join("");
  $("contact").hidden = !contact.length;
}

function renderNews(rows) {
  const items = rows.filter(shown).map(r => ({ ...r, d: toDate(r["日期"]) })).filter(r => r.d)
    .sort((a, b) => b.d - a.d).slice(0, NEWS_LIMIT);
  $("news-list").innerHTML = items.length ? items.map(n => `
    <li><time datetime="${n.d.toISOString().slice(0, 10)}">${ymd(n.d)}</time>
    <div>${n["分類"] ? `<span class="kind">${esc(n["分類"])}</span>` : ""}<span class="t">${
      isUrl(n["連結"]) ? `<a href="${esc(n["連結"])}" target="_blank" rel="noopener">${esc(n["標題"])}</a>` : esc(n["標題"])}</span>
    ${n["內容"] ? `<p>${esc(n["內容"])}</p>` : ""}</div></li>`).join("")
    : `<li><span></span><div class="muted">目前沒有新消息。</div></li>`;
}

function sessionsOf(code) {
  return state.data["場次"].filter(s => s["簡章代號"] === code && shown(s))
    .map(s => ({ ...s, d1: toDate(s["第一天"]), d2: toDate(s["第二天"]) })).filter(s => s.d1)
    .sort((a, b) => a.d1 - b.d1);
}

function status(s, fallback) {
  const a = days(s.d1), b = days(s.d2 || s.d1);
  if (b < 0) return ["done", "已結束"];
  if (a < 0) return ["soon", "進行中"];
  if (a <= 14) return ["soon", a === 0 ? "今天" : `${a} 天後開始`];
  return ["open", fallback || (isUrl(s["報名表連結"]) ? "報名中" : "即將公告")];
}

function scheduleTable(sessions, brochure) {
  if (!sessions.length) return `<p class="muted">場次確定後公告。</p>`;
  const hasTime = sessions.some(s => s["時間"]), hasD2 = sessions.some(s => s.d2);
  const dayCell = (d, h) => `<td data-h="${h}">${d ? `${md(d)}<span class="wd">${wd(d)}</span>` : "—"}</td>`;
  const rows = sessions.map(s => {
    const [cls, txt] = status(s, brochure["狀態文字"]);
    const form = isUrl(s["報名表連結"]) && cls !== "done"
      ? `<br><a href="${esc(s["報名表連結"])}" target="_blank" rel="noopener">報名表</a>` : "";
    return `<tr class="${cls === "done" ? "done" : ""}">
      <td class="r"><span class="dot" style="--c:${regionColor(s["區域"])}"></span>${esc(s["區域"])}</td>
      ${dayCell(s.d1, hasD2 ? "第一天" : "日期")}${hasD2 ? dayCell(s.d2, "第二天") : ""}
      ${hasTime ? `<td data-h="時間">${esc(s["時間"]) || "—"}</td>` : ""}
      <td data-h="地點">${s["地點"] ? esc(s["地點"]) : '<span class="muted">公布中</span>'}</td>
      <td data-h="狀態"><span class="st ${cls}">${txt}</span>${form}</td></tr>`;
  }).join("");
  return `<div class="table-scroll"><table class="sched"><thead><tr><th>區域</th><th>${hasD2 ? "第一天" : "日期"}</th>${
    hasD2 ? "<th>第二天</th>" : ""}${hasTime ? "<th>時間</th>" : ""}<th>地點</th><th>狀態</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function brochureSheet(b) {
  const code = b["代號"], sessions = sessionsOf(code);
  const clauses = state.data["簡章條目"].filter(c => c["簡章代號"] === code);
  const TABLE = "【場次表】";
  if (!clauses.some(c => c["內容"].includes(TABLE))) clauses.push({ "條目名稱": "場次與地點", "內容": TABLE });
  const pdf = isUrl(b["簡章PDF"]);
  return `<article class="sheet" role="tabpanel" aria-labelledby="sheet-title">
    <div class="sheet-head">
      <small>教育資料素養提升計畫${b["年度"] ? `　${esc(b["年度"])} 年度` : ""}</small>
      <h2 id="sheet-title">${esc(b["簡章標題"])}</h2>
    </div>
    <ol class="clauses">${clauses.map((c, i) => `
      <li><b>${cnNum(i + 1)}、${esc(c["條目名稱"])}</b><div>${
        c["內容"].includes(TABLE) ? scheduleTable(sessions, b) : rich(c["內容"])}</div></li>`).join("")}
    </ol>
    <div class="sheet-foot">
      <p>${pdf ? "完整簡章含議程、交通與聯絡資訊。" : "完整簡章 PDF 將於確定後公告。"}</p>
      <a class="btn btn-primary" ${pdf ? `href="${esc(b["簡章PDF"])}" target="_blank" rel="noopener"` : 'aria-disabled="true"'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>
        ${pdf ? "下載完整簡章 PDF" : "簡章 PDF 即將公告"}</a>
    </div></article>`;
}

function renderBrochures() {
  const list = state.data["簡章"].filter(shown);
  if (!list.some(b => b["代號"] === state.active)) state.active = list[0]?.["代號"] || null;
  $("btabs").hidden = list.length < 2;
  $("btabs").innerHTML = list.map(b => `<button class="btab" role="tab" type="button" data-code="${esc(b["代號"])}"
    aria-selected="${b["代號"] === state.active}">${esc(b["分頁名稱"] || b["簡章標題"])}</button>`).join("");
  const current = list.find(b => b["代號"] === state.active);
  $("sheets").innerHTML = current ? brochureSheet(current)
    : `<article class="sheet"><p class="muted">目前沒有開放中的研習，新簡章公告後會出現在這裡。</p></article>`;
}

function renderEvents(rows) {
  const items = rows.filter(shown).map(r => ({ ...r, d: toDate(r["日期"]) })).filter(r => r.d).sort((a, b) => a.d - b.d);
  $("events-wrap").hidden = !items.length;
  $("events").innerHTML = items.map(e => `
    <li class="${days(e.d) < 0 ? "done" : ""}"><time datetime="${e.d.toISOString().slice(0, 10)}">${md(e.d)}${wd(e.d)}</time>
    <div><strong>${esc(e["名稱"])}</strong>${e["說明"] ? `<p>${esc(e["說明"])}</p>` : ""}</div></li>`).join("");
}

function renderNext() {
  const brochures = state.data["簡章"].filter(shown);
  const candidates = brochures.flatMap(b => sessionsOf(b["代號"]).flatMap(s => {
    const name = `${s["區域"]}${b["分頁名稱"] || ""}`;
    return s.d2 ? [[s.d1, `${name}・第一天`], [s.d2, `${name}・第二天`]] : [[s.d1, name]];
  })).concat(state.data["活動"].filter(shown).map(e => [toDate(e["日期"]), e["名稱"]]))
    .filter(([d]) => d && days(d) >= 0).sort((a, b) => a[0] - b[0]);
  const next = candidates[0];
  $("next").hidden = !next;
  if (next) {
    const n = days(next[0]);
    $("next").innerHTML = `<span class="label">最近一場</span><span class="what"><strong>${md(next[0])}${wd(next[0])}</strong>　${esc(next[1])}<span class="muted">・${
      n === 0 ? "今天" : `還有 ${n} 天`}</span></span><a href="#brochure">看簡章 →</a>`;
  }
}

function renderFaq(rows) {
  $("faq-list").innerHTML = rows.filter(shown).map(q =>
    `<details><summary>${esc(q["問題"])}</summary><div class="a">${rich(q["回答"])}</div></details>`).join("");
}

function render(data) {
  // 缺少的工作表以空陣列處理，避免單一工作表出錯讓整頁壞掉
  state.data = Object.fromEntries(TABS.map(t => [t, Array.isArray(data?.[t]) ? data[t] : []]));
  const parts = [["設定", renderSettings], ["消息", renderNews], ["簡章", renderBrochures],
    ["活動", renderEvents], ["最近一場", renderNext], ["常見問題", renderFaq]];
  for (const [name, fn] of parts) {
    try { fn(state.data[name]); } catch (e) { console.warn(`「${name}」顯示失敗`, e); }
  }
}

$("btabs").addEventListener("click", e => {
  const t = e.target.closest(".btab"); if (!t) return;
  state.active = t.dataset.code; renderBrochures();
});

(async function start() {
  const cached = readCache();
  if (cached) render(cached);
  else {
    try { render(await (await fetch("data/content.json")).json()); }
    catch (e) { console.warn("備份資料讀取失敗", e); }
  }
  if (!SHEET_ID) return;
  try {
    const data = await loadSheet();
    render(data); writeCache(data);
  } catch (e) {
    console.warn("無法讀取 Google 試算表，改用備份內容：", e.message);
  }
})();
