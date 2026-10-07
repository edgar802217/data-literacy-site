/* 示範模式的資料存取：整份資料存在瀏覽器的 localStorage。
   畫面只透過 useDemo() 讀寫；接上 Render 後端時，換掉這一層即可。 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { State, User } from "./types";
import { seed } from "./seed";

const KEY = "dl-web-demo-v1";

function load(): State {
  try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s?.users) return s; } } catch { /* 無痕模式等 */ }
  return seed();
}

interface Ctx {
  st: State;
  me: User | undefined;
  /** 修改資料：fn 收到一份可直接改的副本 */
  update: (fn: (draft: State) => void) => void;
  reset: () => void;
  toast: (msg: string) => void;
  toastMsg: string;
}
const DemoCtx = createContext<Ctx | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<State>(load);
  const [toastMsg, setToast] = useState("");

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* 忽略 */ } }, [st]);
  // 另一個分頁改了資料時跟著更新
  useEffect(() => {
    const on = (e: StorageEvent) => { if (e.key === KEY && e.newValue) { try { setSt(JSON.parse(e.newValue)); } catch { /* 忽略 */ } } };
    addEventListener("storage", on); return () => removeEventListener("storage", on);
  }, []);
  useEffect(() => { if (!toastMsg) return; const t = setTimeout(() => setToast(""), 3200); return () => clearTimeout(t); }, [toastMsg]);

  const update = useCallback((fn: (d: State) => void) => setSt(prev => { const d = structuredClone(prev); fn(d); return d; }), []);
  const reset = useCallback(() => { try { localStorage.removeItem(KEY); } catch { /* 忽略 */ } setSt(seed()); }, []);
  const value = useMemo<Ctx>(() => ({ st, me: st.cur ? st.users.find(u => u.id === st.cur) : undefined, update, reset, toast: setToast, toastMsg }), [st, update, reset, toastMsg]);
  return <DemoCtx.Provider value={value}>{children}</DemoCtx.Provider>;
}

export function useDemo() {
  const c = useContext(DemoCtx);
  if (!c) throw new Error("useDemo 必須在 DemoProvider 裡使用");
  return c;
}
