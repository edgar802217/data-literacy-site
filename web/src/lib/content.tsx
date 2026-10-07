/* 網站內容（最新消息、活動、常見問題、設定）仍由 Google 試算表「網站內容」維護。
   讀取順序：試算表 → 瀏覽器快取（上次成功的內容）→ 內建備份 data/content.json。
   場次與課程已改由示範資料（之後是後端）提供，不再讀試算表的「簡章／場次」。 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import backup from "../data/content.json";

const SHEET_ID = "1Iqu6qJulH0lgWeHmsN78bDnxIN5MAq7GDt-2SdZtetc";
const TABS = ["設定", "消息", "活動", "常見問題"] as const;
const CACHE_KEY = "dl-web-content-v1";
type Row = Record<string, string>;
export interface Content { settings: Record<string, string>; news: Row[]; events: Row[]; faq: Row[] }

function parseCSV(text: string): Row[] {
  const rows: string[][] = []; let row: string[] = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [head = [], ...body] = rows;
  const keys = head.map(h => h.trim());
  return body.filter(r => r.some(v => v.trim())).map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] || "").trim()])));
}
async function fetchTab(name: string) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(name)}`;
  const res = await fetch(url, { cache: "no-store", credentials: "omit" });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const text = await res.text();
  if (/^\s*</.test(text)) throw new Error(`${name}: 試算表未開放檢視`);
  return parseCSV(text);
}
const shown = (r: Row) => (r["顯示"] || "是") !== "否";
function shape(raw: Partial<Record<string, Row[]>>): Content {
  const settings = Object.fromEntries((raw["設定"] || []).map(r => [r["項目"], r["內容"]]));
  const byDate = (a: Row, b: Row) => (a["日期"] < b["日期"] ? 1 : -1);
  return {
    settings,
    news: (raw["消息"] || []).filter(shown).sort(byDate),
    events: (raw["活動"] || []).filter(shown).sort((a, b) => -byDate(a, b)),
    faq: (raw["常見問題"] || []).filter(shown),
  };
}

const Ctx = createContext<Content>(shape(backup as Record<string, Row[]>));
export function ContentProvider({ children }: { children: ReactNode }) {
  const [c, setC] = useState<Content>(() => {
    try { const x = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); if (x) return shape(x); } catch { /* 忽略 */ }
    return shape(backup as Record<string, Row[]>);
  });
  useEffect(() => {
    let off = false;
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("逾時")), 8000));
    Promise.race([Promise.all(TABS.map(fetchTab)), timeout])
      .then(tabs => {
        const raw = Object.fromEntries(TABS.map((t, i) => [t, tabs[i]]));
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(raw)); } catch { /* 忽略 */ }
        if (!off) setC(shape(raw));
      })
      .catch(e => console.warn("無法讀取 Google 試算表，改用備份內容：", e.message));
    return () => { off = true; };
  }, []);
  return <Ctx.Provider value={c}>{children}</Ctx.Provider>;
}
export const useContent = () => useContext(Ctx);

/** 「1. 」「・」開頭的行轉成清單，其他是段落 */
export function Rich({ text }: { text: string }) {
  const blocks: (string | { kind: "ul" | "ol"; items: string[] })[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue;
    const b = line.match(/^[・•\-－]\s*(.*)$/), n = line.match(/^\d+\s*[.、)]\s*(.*)$/);
    const kind = b ? "ul" : n ? "ol" : null;
    if (kind) { if (!list || list.kind !== kind) { list = { kind, items: [] }; blocks.push(list); } list.items.push((b || n)![1]); }
    else { list = null; blocks.push(line); }
  }
  return <div className="rich">{blocks.map((x, i) => typeof x === "string" ? <p key={i}>{x}</p>
    : x.kind === "ul" ? <ul key={i}>{x.items.map((t, j) => <li key={j}>{t}</li>)}</ul> : <ol key={i}>{x.items.map((t, j) => <li key={j}>{t}</li>)}</ol>)}</div>;
}
