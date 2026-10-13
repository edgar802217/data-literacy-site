import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Outlet, useLocation } from "react-router-dom";
import { useDemo } from "../demo/store";
import { codeOf, upcoming } from "../demo/logic";
import type { State } from "../demo/types";
import { createSlot, playIntro, reduced, type Cat, type SeaWords, type Slot, type SlotSeed } from "../home/sea";
import "../styles/home.css";
import "../styles/shell.css";

/* 全站骨架：左欄「舞台」（本頁標題＋數字海）換頁時留在原地，只收窄與換字；右欄是各頁內容。
   各頁用 <Stage> 把標題放進舞台，用 useSea() 控制數字海要亮哪些數字。 */

export const dot = (d: string) => d.slice(5).replace("-", ".");
/* 數字海裡「講得出意義」的數字：依 115 年下半年培訓簡章 */
const BASE_MEAN: Record<string, string> = {
  "22": "縣市＋國教署推動辦公室", "4": "區培訓：北、中、南、東", "3": "B6. 教育資料素養工作坊時數",
  "6": "進階課程時數（B6-1／B6-2／B6-3）", "9": "G1. 講師培訓時數", "12": "B6.＋G1. 兩天合計時數",
  "2": "講師資格效期（年）", "1": "各推動辦公室至少推薦的 G1. 人數", "90": "登錄全教網後，身分證字號保存天數",
  "115": "計畫年度（民國）", "116": "進階課程開始開設的年度",
  "A1": "報名前需完成的全教網課程", "A2": "報名前需完成的全教網課程", "B5-1": "報名前需完成的全教網課程",
  "10.22": "北區、中區報名截止", "10.28": "南區、東區報名截止",
};
const BASE_CAT: Record<string, Cat> = { "3": "A", "A1": "A", "A2": "A", "B5-1": "A", "6": "B", "116": "B", "9": "T", "12": "T", "2": "T", "1": "T" };
function buildWords(st: State): SeaWords {
  const mean = { ...BASE_MEAN }, cat = { ...BASE_CAT };
  upcoming(st).forEach(s => {
    const k = dot(s.date), t = `${codeOf(st, s)} ${s.region}`;
    if (!mean[k]) { mean[k] = t; cat[k] = s.course; } else if (!mean[k].includes(t)) mean[k] += "／" + t;
  });
  return { mean, cat, raw: ["08:30", "09:00", "12:00", "13:00", "16:00", "40", "25", "DL115", "0", "5", "7", "8", "2026"] };
}

interface SeaApi { setPage: (l: string[]) => void; setRow: (l: string[] | null) => void; kept: string | null; words: SeaWords; ready: boolean }
const SeaCtx = createContext<SeaApi | null>(null);
export const useSea = () => useContext(SeaCtx)!;
const StageCtx = createContext<{ text: HTMLElement | null; cap: HTMLElement | null }>({ text: null, cap: null });

/** 把本頁的標題放進左欄舞台 */
export function Stage({ eyebrow, title, srTitle, lead, children, cap, focus, doc, intro }: {
  eyebrow: string; title?: ReactNode; srTitle?: string; lead?: ReactNode; children?: ReactNode;
  cap: string; focus: string[]; doc: string; intro?: boolean;
}) {
  const { text, cap: capEl } = useContext(StageCtx);
  const sea = useSea();
  const key = focus.join();
  useLayoutEffect(() => { sea.setPage(focus); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);
  useEffect(() => { document.title = doc === "首頁" ? "教育資料素養提升計畫" : `${doc}｜教育資料素養提升計畫`; }, [doc]);
  const rv = (d: number) => (intro ? { className: "hm-rv", "data-tx": "", style: { ["--d" as string]: d + "ms" } } : {});
  if (!text) return null;
  return <>
    {createPortal(<>
      <p className="hm-eyebrow" {...rv(120)}>{eyebrow}</p>
      {title ? <h1 className={"sh-title" + (intro ? " hm-rv" : "")} tabIndex={-1} {...(intro ? { "data-tx": "", style: { ["--d" as string]: "180ms" } } : {})}>{title}</h1>
        : <h1 className="vh" tabIndex={-1}>{srTitle}</h1>}
      {lead && <p className={"sh-lead" + (intro ? " hm-rv" : "")} {...(intro ? { "data-tx": "", style: { ["--d" as string]: "280ms" } } : {})}>{lead}</p>}
      {children}
    </>, text)}
    {capEl && createPortal(cap, capEl)}
  </>;
}

export function Shell() {
  const loc = useLocation();
  const { st } = useDemo();
  const home = loc.pathname === "/";
  const words = useMemo(() => buildWords(st), [st]);
  const wordsKey = Object.keys(words.mean).join() + Object.values(words.mean).join();
  const shell = useRef<HTMLDivElement>(null), box = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState<HTMLDivElement | null>(null), [cap, setCap] = useState<HTMLElement | null>(null);
  const slot = useRef<Slot>();
  const page = useRef<string[]>([]);
  const [kept, setKept] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [announce, setAnnounce] = useState("");

  /* 開場：這次瀏覽第一次直接進首頁時播放；網址加 ?intro=1 可重看 */
  const play = useRef(false);
  useLayoutEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("dl-intro") === "1"; } catch { /* 無法存取時照常播放 */ }
    play.current = home && !reduced() && scrollY < 40 && (!seen || new URLSearchParams(location.search).has("intro"));
    if (play.current) document.documentElement.classList.add("hm-pre");
    return () => document.documentElement.classList.remove("hm-pre");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const make = (seed?: SlotSeed) => {
      if (!box.current || !cv.current) return;
      slot.current = createSlot(box.current, cv.current, words, setKept, seed);
      slot.current.setPage(page.current);
      setReady(true);
    };
    if (!play.current) { make(); return () => { slot.current?.destroy(); slot.current = undefined; }; }
    let cancel: (() => void) | undefined, alive = true;
    try { sessionStorage.setItem("dl-intro", "1"); } catch { /* 略過 */ }
    const fonts = document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
    fonts.then(() => {
      if (!alive || !shell.current) return;
      cancel = playIntro(shell.current, words, () => document.documentElement.classList.remove("hm-pre"), seed => { if (alive) make(seed); });
    });
    return () => { alive = false; cancel?.(); document.documentElement.classList.remove("hm-pre"); slot.current?.destroy(); slot.current = undefined; };
    // 數字海只建立一次，換頁時不重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { slot.current?.setWords(words); }, [wordsKey]);

  /* 換頁後：焦點移到新頁標題，並告訴螢幕閱讀器 */
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const h = text?.querySelector<HTMLElement>("h1");
    h?.focus({ preventScroll: true });
    setAnnounce("已前往：" + (h?.textContent || document.title));
  }, [loc.pathname, text]);

  const setPage = useCallback((l: string[]) => { page.current = l; slot.current?.setPage(l); }, []);
  const setRow = useCallback((l: string[] | null) => { slot.current?.setRow(l); }, []);
  const api = useMemo(() => ({ setPage, setRow, kept, words, ready }), [setPage, setRow, kept, words, ready]);
  return (
    <SeaCtx.Provider value={api}>
      <StageCtx.Provider value={{ text, cap }}>
        <div className={"hm hm-wrap shl " + (home ? "is-home" : "is-sub")} ref={shell}>
          <div className="sh-stage">
            <div className="sh-text" ref={setText} />
            <figure className="sh-fig">
              <div className="hm-sea sh-sea hm-rv" ref={box}><canvas ref={cv} aria-hidden="true" /></div>
              <figcaption className="hm-rv" style={{ ["--d" as string]: "420ms" }} ref={setCap} />
            </figure>
          </div>
          <div className="sh-pane"><Outlet /></div>
        </div>
        <p className="vh" aria-live="polite">{announce}</p>
      </StageCtx.Provider>
    </SeaCtx.Provider>
  );
}
