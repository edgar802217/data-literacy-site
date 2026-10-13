/* 網站內容（重要公告、最新消息、活動、常見問題、聯絡資訊）。
   正式模式：由後台管理，從 /api/public/content 讀取；讀不到時用上次成功的內容，再不行用內建備份 data/content.json。
   示範模式：直接用內建備份。原本的 Google 試算表已停用。 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import backup from "../data/content.json";
import { api, LIVE } from "./api";

const CACHE_KEY = "dl-web-content-v2";
type Row = Record<string, string>;
export interface Content { settings: Record<string, string>; news: Row[]; events: Row[]; faq: Row[]; reload: () => void }
interface ApiContent {
  settings: Record<string, string>;
  news: { date: string; category: string; title: string; body: string; link: string }[];
  events: { date: string; name: string; desc: string }[];
  faq: { question: string; answer: string }[];
}

const shown = (r: Row) => (r["顯示"] || "是") !== "否";
function fromBackup(): Omit<Content, "reload"> {
  const raw = backup as Record<string, Row[]>;
  const byDate = (a: Row, b: Row) => (a["日期"] < b["日期"] ? 1 : -1);
  return {
    settings: Object.fromEntries((raw["設定"] || []).map(r => [r["項目"], r["內容"]])),
    news: (raw["消息"] || []).filter(shown).sort(byDate),
    events: (raw["活動"] || []).filter(shown).sort((a, b) => -byDate(a, b)),
    faq: (raw["常見問題"] || []).filter(shown),
  };
}
/** 後端的英文欄位轉成畫面使用的欄位名稱 */
function fromApi(c: ApiContent): Omit<Content, "reload"> {
  return {
    settings: c.settings,
    news: c.news.map(n => ({ 日期: n.date, 分類: n.category, 標題: n.title, 內容: n.body, 連結: n.link })),
    events: c.events.map(e => ({ 日期: e.date, 名稱: e.name, 說明: e.desc })),
    faq: c.faq.map(f => ({ 問題: f.question, 回答: f.answer })),
  };
}

const Ctx = createContext<Content>({ ...fromBackup(), reload: () => {} });
export function ContentProvider({ children }: { children: ReactNode }) {
  const [c, setC] = useState(() => {
    if (LIVE) try { const x = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); if (x) return fromApi(x); } catch { /* 忽略 */ }
    return fromBackup();
  });
  const reload = useCallback(() => {
    if (!LIVE) return;
    api<ApiContent>("/public/content").then(x => {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(x)); } catch { /* 忽略 */ }
      setC(fromApi(x));
    }).catch(e => console.warn("無法讀取網站內容，改用備份：", e.message));
  }, []);
  useEffect(reload, [reload]);
  return <Ctx.Provider value={{ ...c, reload }}>{children}</Ctx.Provider>;
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
