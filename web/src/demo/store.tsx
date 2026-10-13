/* 資料存取：畫面只透過 useDemo() 讀寫。
   示範模式：整份資料存在瀏覽器的 localStorage，可以切換身分、看示範信箱。
   正式模式（VITE_MODE=live）：課程與場次、登入者從後端讀取；報名等流程在後續階段接上後端前，不會寫入任何資料。 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Course, Session, State, User } from "./types";
import { seed } from "./seed";
import { TODAY } from "./logic";
import { api, LIVE } from "../lib/api";

const KEY = "dl-web-demo-v2";

function load(): State {
  try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s?.users) return s; } } catch { /* 無痕模式等 */ }
  return seed();
}
/** 正式模式的起始狀態：先用內建的課程與場次，後端回應後再換掉 */
function liveInitial(): State {
  const s = seed();
  return { users: [], courses: s.courses, sessions: s.sessions.filter(x => x.date >= TODAY), regs: [], invites: [], certs: [], ents: [], reviews: [], mails: [], seq: 0, cur: null };
}
export interface ApiUser { id: string; email: string; name: string; title: string; org: string; county: string; job: User["job"]; roles: User["roles"]; verified: boolean; mustChangePassword: boolean }
const toUser = (u: ApiUser): User => ({ ...u });

interface Ctx {
  st: State;
  me: User | undefined;
  /** 修改資料：fn 收到一份可直接改的副本（只有示範模式有效） */
  update: (fn: (draft: State) => void) => void;
  reset: () => void;
  toast: (msg: string) => void;
  toastMsg: string;
  /** 正式模式：後端資料是否已載入 */
  ready: boolean;
  /** 正式模式：登入、登出、改個人資料後更新目前使用者 */
  setMe: (u: ApiUser | null) => void;
  /** 正式模式：重新讀取課程與場次 */
  refresh: () => Promise<void>;
}
const DemoCtx = createContext<Ctx | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<State>(LIVE ? liveInitial : load);
  const [toastMsg, setToast] = useState("");
  const [ready, setReady] = useState(!LIVE);

  useEffect(() => { if (!LIVE) try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* 忽略 */ } }, [st]);
  // 示範模式：另一個分頁改了資料時跟著更新
  useEffect(() => {
    if (LIVE) return;
    const on = (e: StorageEvent) => { if (e.key === KEY && e.newValue) { try { setSt(JSON.parse(e.newValue)); } catch { /* 忽略 */ } } };
    addEventListener("storage", on); return () => removeEventListener("storage", on);
  }, []);
  useEffect(() => { if (!toastMsg) return; const t = setTimeout(() => setToast(""), 3200); return () => clearTimeout(t); }, [toastMsg]);

  const setMe = useCallback((u: ApiUser | null) => setSt(prev => ({ ...prev, users: u ? [toUser(u)] : [], cur: u ? u.id : null })), []);
  const refresh = useCallback(async () => {
    const cat = await api<{ courses: Course[]; sessions: Session[] }>("/public/catalog");
    setSt(prev => ({ ...prev, courses: cat.courses, sessions: cat.sessions }));
  }, []);
  useEffect(() => {
    if (!LIVE) return;
    Promise.allSettled([refresh(), api<{ user: ApiUser | null }>("/auth/me").then(r => setMe(r.user))])
      .then(rs => { rs.forEach(r => r.status === "rejected" && console.warn(r.reason)); setReady(true); });
  }, [refresh, setMe]);

  const update = useCallback((fn: (d: State) => void) => {
    if (LIVE) { setToast("這個功能還沒開放，之後會接上正式系統"); return; }
    setSt(prev => { const d = structuredClone(prev); fn(d); return d; });
  }, []);
  const reset = useCallback(() => { try { localStorage.removeItem(KEY); } catch { /* 忽略 */ } setSt(seed()); }, []);
  const value = useMemo<Ctx>(() => ({ st, me: st.cur ? st.users.find(u => u.id === st.cur) : undefined, update, reset, toast: setToast, toastMsg, ready, setMe, refresh }),
    [st, update, reset, toastMsg, ready, setMe, refresh]);
  return <DemoCtx.Provider value={value}>{children}</DemoCtx.Provider>;
}

export function useDemo() {
  const c = useContext(DemoCtx);
  if (!c) throw new Error("useDemo 必須在 DemoProvider 裡使用");
  return c;
}
