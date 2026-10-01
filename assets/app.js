/* 教育資料素養提升計畫網站
   內容來源優先順序：Google 試算表 → 瀏覽器快取（上次成功讀到的內容）→ data/content.json 備份。
   試算表的工作表與欄位名稱見 tools/build_sheet.py；地圖資料見 tools/build_map.py。 */

// Google 試算表 ID：網址 https://docs.google.com/spreadsheets/d/<這一段>/edit 中間那串
const SHEET_ID = "1Iqu6qJulH0lgWeHmsN78bDnxIN5MAq7GDt-2SdZtetc";
const TABS = ["設定", "消息", "簡章", "簡章條目", "場次", "活動", "常見問題"];
const CACHE_KEY = "dl-site-content-v1";
const NEWS_LIMIT = 5;
const MOTION = !matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  // 不帶登入資訊：讀者若登入了其他 Google 帳號，帶上 cookie 反而會被導到登入頁
  const res = await fetch(url, { cache: "no-store", credentials: "omit" });
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
const SVGNS = "http://www.w3.org/2000/svg";
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

// 區域名稱 → 地圖上的區域代碼（對應 LOGO 四根長條的顏色）
const REGION = { 北: "var(--c-north)", 中: "var(--c-central)", 南: "var(--c-south)", 東: "var(--c-east)" };
const regionKey = name => Object.keys(REGION).find(k => String(name).includes(k)) || null;
const regionColor = name => REGION[regionKey(name)] || "var(--c-other)";

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

/* ---------- 內容區塊 ---------- */
let state = { data: null, active: null, region: null };

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
  // 手機版每格是兩欄格線（標題＋內容），內容要包在同一個元素裡才不會被拆行
  const dayCell = (d, h) => `<td data-h="${h}"><span>${d ? `${md(d)}<span class="wd">${wd(d)}</span>` : "—"}</span></td>`;
  const rows = sessions.map(s => {
    const [cls, txt] = status(s, brochure["狀態文字"]);
    const form = isUrl(s["報名表連結"]) && cls !== "done"
      ? `<br><a href="${esc(s["報名表連結"])}" target="_blank" rel="noopener">報名表</a>` : "";
    return `<tr class="${cls === "done" ? "done" : ""}">
      <td class="r"><span class="dot" style="--c:${regionColor(s["區域"])}"></span>${esc(s["區域"])}</td>
      ${dayCell(s.d1, hasD2 ? "第一天" : "日期")}${hasD2 ? dayCell(s.d2, "第二天") : ""}
      ${hasTime ? `<td data-h="時間">${esc(s["時間"]) || "—"}</td>` : ""}
      <td data-h="地點">${s["地點"] ? esc(s["地點"]) : '<span class="muted">公布中</span>'}</td>
      <td data-h="狀態"><span><span class="st ${cls}">${txt}</span>${form}</span></td></tr>`;
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
  return `<article class="sheet" aria-labelledby="sheet-title">
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

/* ---------- 研習場次：地圖＋區域卡 ---------- */
const PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';

function currentBrochure() {
  return state.data["簡章"].filter(shown).find(b => b["代號"] === state.active);
}

function drawMapBase() {
  const M = window.TAIWAN_MAP, svg = $("tw-map");
  if (!M || svg.dataset.ready) return;
  svg.setAttribute("viewBox", `0 0 ${M.w} ${M.h}`);
  svg.innerHTML = `<g aria-hidden="true">${M.counties.map(c => `<path class="county" d="${c.d}"/>`).join("")}</g><g id="tw-marks"></g>`;
  svg.dataset.ready = "1";
}

function renderExplorer() {
  const b = currentBrochure();
  const sessions = b ? sessionsOf(b["代號"]) : [];
  const keyOf = s => `${s["簡章代號"]}|${s["區域"]}`;
  if (!sessions.some(s => keyOf(s) === state.region)) {
    // 預設選最近一場還沒結束的場次
    const next = sessions.find(s => days(s.d2 || s.d1) >= 0) || sessions[0];
    state.region = next ? keyOf(next) : null;
  }
  // 地圖標記
  drawMapBase();
  const M = window.TAIWAN_MAP, marks = $("tw-marks");
  if (M && marks) {
    marks.innerHTML = sessions.map(s => {
      const pos = M.venues[regionKey(s["區域"])]; if (!pos) return "";
      const done = days(s.d2 || s.d1) < 0, on = keyOf(s) === state.region;
      return `<g class="mk${done ? " done" : ""}${on ? " on" : ""}" tabindex="0" role="button" aria-pressed="${on}"
        aria-label="${esc(s["區域"])}：${md(s.d1)}${s.d2 ? `、${md(s.d2)}` : ""}" data-key="${esc(keyOf(s))}" style="--c:${regionColor(s["區域"])}">
        <circle class="ring" cx="${pos[0]}" cy="${pos[1]}" r="${on ? 22 : 16}"/>
        <circle class="core" cx="${pos[0]}" cy="${pos[1]}" r="${on ? 10 : 7}"/>
        <text x="${pos[0] + 16}" y="${pos[1] + 5}">${esc(s["區域"])}</text></g>`;
    }).join("");
  }
  // 區域按鈕（地圖以外的另一種選法，也照顧鍵盤與螢幕報讀器）
  $("reg-chips").innerHTML = sessions.map(s => `<button type="button" class="reg-chip" data-key="${esc(keyOf(s))}"
    aria-pressed="${keyOf(s) === state.region}" style="--c:${regionColor(s["區域"])}"><i></i>${esc(s["區域"])}</button>`).join("");
  // 區域卡
  const s = sessions.find(x => keyOf(x) === state.region), card = $("reg-detail");
  if (!s) { card.innerHTML = `<p class="muted">場次確定後公告。</p>`; card.style.removeProperty("--c"); return; }
  const [cls, txt] = status(s, b["狀態文字"]);
  const target = days(s.d1) >= 0 ? s.d1 : s.d2;
  const n = target ? days(target) : -1;
  const count = cls === "done" ? "這一區已辦理完畢"
    : n === 0 ? "<b>今天</b>開始" : n > 0 ? `距離${target === s.d1 ? "第一天" : "第二天"}還有 <b>${n}</b> 天` : "";
  const dayRow = (d, label) => d ? `<li class="${days(d) < 0 ? "past" : ""}"><span class="d">${md(d)}<small>週${WD[d.getDay()]}</small></span><span class="w">${label}</span></li>` : "";
  card.style.setProperty("--c", regionColor(s["區域"]));
  card.innerHTML = `
    <div class="reg-top"><h3>${esc(s["區域"])}</h3><span class="st ${cls}">${txt}</span></div>
    <p class="reg-count">${count}</p>
    <ul class="reg-days">
      ${dayRow(s.d1, s.d2 ? "第一天・初階＋講師培訓前置" : "研習日")}
      ${dayRow(s.d2, "第二天・進階應用")}
    </ul>
    <div class="reg-place">${PIN}<div><strong>${s["地點"] ? esc(s["地點"]) : "地點公布中"}</strong>${
      s["時間"] ? `<div class="muted">${esc(s["時間"])}</div>` : ""}</div></div>
    <div class="reg-acts">
      ${isUrl(s["報名表連結"]) && cls !== "done" ? `<a class="btn btn-primary btn-sm" href="${esc(s["報名表連結"])}" target="_blank" rel="noopener">填寫報名表</a>` : ""}
      <a class="btn btn-line btn-sm" href="#brochure">看完整簡章</a>
    </div>`;
  if (MOTION) { card.classList.remove("swap"); void card.offsetWidth; card.classList.add("swap"); }
}

function pickRegion(key) {
  if (!key || key === state.region) return;
  state.region = key; renderExplorer();
}
$("tw-map").addEventListener("click", e => pickRegion(e.target.closest(".mk")?.dataset.key));
$("tw-map").addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.closest(".mk")) { e.preventDefault(); pickRegion(e.target.closest(".mk").dataset.key); }
});
$("reg-chips").addEventListener("click", e => pickRegion(e.target.closest(".reg-chip")?.dataset.key));

function renderBrochures() {
  const list = state.data["簡章"].filter(shown);
  if (!list.some(b => b["代號"] === state.active)) state.active = list[0]?.["代號"] || null;
  $("btabs").hidden = list.length < 2;
  $("btabs").innerHTML = list.map(b => `<button class="btab" role="tab" type="button" data-code="${esc(b["代號"])}"
    aria-selected="${b["代號"] === state.active}">${esc(b["分頁名稱"] || b["簡章標題"])}</button>`).join("");
  const current = list.find(b => b["代號"] === state.active);
  $("sheets").innerHTML = current ? brochureSheet(current)
    : `<article class="sheet"><p class="muted">目前沒有開放中的研習，新簡章公告後會出現在這裡。</p></article>`;
  renderExplorer();
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
      n === 0 ? "今天" : `還有 ${n} 天`}</span></span><a href="#sessions">看場次 →</a>`;
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
  state.active = t.dataset.code; state.region = null; renderBrochures();
});

/* ---------- 捲動進場與數字跳動 ---------- */
function countUp(el) {
  const to = +el.dataset.count, t0 = performance.now(), dur = 1100;
  const step = t => {
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

if (MOTION && "IntersectionObserver" in window) {
  document.documentElement.classList.add("js-reveal");
  const io = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.classList.add("in");
      en.target.querySelectorAll("[data-count]").forEach(countUp);
      io.unobserve(en.target);
    }
  // threshold 0：很長的區塊（例如手機上的簡章）也一定觸發得到
  }, { threshold: 0, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".rv").forEach(el => io.observe(el));
}

/* ---------- 平台試玩（虛構示範資料） ---------- */
const DEMO = {
  dist: {
    caption: "七年級數學段考成績分布（虛構示範資料，77 人）",
    unit: "人", yMax: 30, yStep: 10,
    bars: [["0–59", 9], ["60–69", 24, true], ["70–79", 22], ["80–89", 15], ["90–100", 7]],
    text: "77 位學生中，60–69 分的人數最多（24 人，約 31%），其次是 70–79 分（22 人）。有 9 位學生未達 60 分，約占 12%，建議先找出他們共同答錯的題型。",
    caution: "判讀提醒：這是單次段考的結果，看不出進步或退步。若要比較，需要加入前一次段考的成績。",
  },
  class: {
    caption: "各班平均分數（虛構示範資料，括號內為人數）",
    unit: "分", yMax: 100, yStep: 20,
    bars: [["701（30）", 74], ["702（29）", 71], ["703（18）", 66, true]],
    text: "703 班平均 66 分，比 701 班低 8 分、比 702 班低 5 分。",
    caution: "判讀提醒：703 班只有 18 人，少數學生的分數就會明顯拉動平均。建議同時看各班的分數分布，再決定是否需要補救教學。",
  },
};
let demoRun = 0;

function demoStep(n) {
  document.querySelectorAll(".demo-steps li").forEach(li => li.classList.toggle("on", +li.dataset.step <= n));
}

function drawDemoChart(d) {
  const W = 420, H = 240, L = 40, R = 12, T = 16, B = 34;
  const iw = W - L - R, ih = H - T - B, slot = iw / d.bars.length, bw = Math.min(56, slot * .6);
  const y = v => T + ih - (v / d.yMax) * ih;
  let g = "";
  for (let v = 0; v <= d.yMax; v += d.yStep) {
    g += `<line class="axis" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" opacity="${v ? .5 : 1}"/>`
       + `<text class="tick" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  }
  d.bars.forEach(([label, v, hi], i) => {
    const x = L + slot * i + (slot - bw) / 2;
    g += `<rect class="b${hi ? " hi" : ""}" x="${x}" y="${y(v)}" width="${bw}" height="${y(0) - y(v)}" rx="4" style="--d:${i * 0.08}s"/>`
       + `<text class="val" x="${x + bw / 2}" y="${y(v) - 6}" text-anchor="middle">${v}</text>`
       + `<text class="tick" x="${x + bw / 2}" y="${H - 12}" text-anchor="middle">${label}</text>`;
  });
  g += `<text class="tick" x="${L - 8}" y="${T - 4}" text-anchor="end">${d.unit}</text>`;
  $("demo-svg").innerHTML = g;
  $("demo-svg").setAttribute("aria-label", `${d.caption}：${d.bars.map(([l, v]) => `${l} ${v}${d.unit}`).join("，")}`);
}

function typeText(el, text, run, done) {
  if (!MOTION) { el.textContent = text; done(); return; }
  el.textContent = ""; el.classList.add("typing");
  let i = 0;
  const tick = () => {
    if (run !== demoRun) return;
    el.textContent = text.slice(0, ++i);
    if (i < text.length) setTimeout(tick, 22);
    else { el.classList.remove("typing"); done(); }
  };
  tick();
}

function runDemo(key) {
  const d = DEMO[key], run = ++demoRun;
  document.querySelectorAll(".q").forEach(b => b.setAttribute("aria-pressed", b.dataset.q === key));
  const text = $("ai-text");
  text.contentEditable = "false"; text.classList.remove("typing");
  $("ai-caution").hidden = true; $("ai-actions").hidden = true; $("ai-done").hidden = true;
  $("ai-edit").textContent = "我要修改";
  demoStep(2);
  $("demo-cap").textContent = "平台分析中…";
  text.textContent = "";
  setTimeout(() => {
    if (run !== demoRun) return;
    drawDemoChart(d);
    $("demo-cap").textContent = d.caption;
    demoStep(3);
    typeText(text, d.text, run, () => {
      if (run !== demoRun) return;
      $("ai-caution").textContent = d.caution; $("ai-caution").hidden = false;
      $("ai-actions").hidden = false;
      demoStep(4);
    });
  }, MOTION ? 650 : 0);
}

function confirmDemo(edited) {
  const text = $("ai-text");
  text.contentEditable = "false";
  $("ai-actions").hidden = true;
  $("ai-done").textContent = edited
    ? "已確認你修改後的說明。正式平台會把它連同圖表放進分析報告。"
    : "已確認。正式平台會把這段說明連同圖表放進分析報告。";
  $("ai-done").hidden = false;
}

$("demo-qs").addEventListener("click", e => { const b = e.target.closest(".q"); if (b) runDemo(b.dataset.q); });
$("ai-ok").addEventListener("click", () => confirmDemo($("ai-text").isContentEditable));
$("ai-edit").addEventListener("click", () => {
  const text = $("ai-text");
  if (text.isContentEditable) { confirmDemo(true); return; }
  text.contentEditable = "true"; text.focus();
  $("ai-edit").textContent = "完成修改";
});

/* ---------- 啟動 ---------- */
(async function start() {
  drawMapBase();
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
