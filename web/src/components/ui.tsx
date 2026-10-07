import { useEffect, type ReactNode } from "react";
import type { CourseId } from "../demo/types";
import { LV_CLASS } from "../demo/logic";

const PATHS = {
  cal: <><path d="M4 6h16v14H4z" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4" /><path d="M16 4.8a3.2 3.2 0 0 1 0 6.3M18 14.8c1.7.7 2.8 2.4 3 5.2" /></>,
  hour: <path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  shield: <><path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
  file: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></>,
  out: <><path d="M14 4h5v16h-5" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
};
export type IconName = keyof typeof PATHS;
export const Icon = ({ n, className = "" }: { n: IconName; className?: string }) =>
  <svg className={"ic " + className} viewBox="0 0 24 24" aria-hidden="true">{PATHS[n]}</svg>;

export const Badge = ({ kind, children }: { kind: "can" | "ok" | "wait" | "no"; children: ReactNode }) =>
  <span className={"bdg " + kind}>{children}</span>;

export const Level = ({ c, children }: { c: CourseId; children: ReactNode }) =>
  <span className={"lv " + LV_CLASS[c]}><i />{children}</span>;

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="ov" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={"dlg" + (wide ? " wide" : "")} role="dialog" aria-modal="true" aria-label={title}>
        <div className="dlg-h"><h2>{title}</h2><button className="iconbtn" onClick={onClose} aria-label="關閉"><Icon n="close" /></button></div>
        {children}
      </div>
    </div>
  );
}

/** 報名進度線：報名 → 審核 → 出席 → 結業 → 登錄全教網 */
export function Timeline({ status, date }: { status: string; date?: string }) {
  const steps = ["送出報名", "審核錄取", "出席研習", "結業與研習證明", "登錄全教網時數"];
  const pos: Record<string, number> = { pending: 1, waitlist: 1, admitted: 2, attended: 3, completed: 4, reported: 5 };
  const p = pos[status];
  if (p == null) return null;
  const note: Record<string, string> = { pending: "承辦審核中，結果會寄信通知", waitlist: "目前備取，有名額釋出會通知你", admitted: date ? `已錄取，${date} 見` : "已錄取" };
  return <ol className="tl">{steps.map((t, i) => <li key={t} className={i < p ? "done" : i === p ? "now" : ""}>{i === p && note[status] ? note[status] : t}</li>)}</ol>;
}

export function PageHead({ crumb, title, sub, children }: { crumb?: ReactNode; title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return <div className="phead"><div className="wrap">{crumb && <div className="crumb">{crumb}</div>}<h1>{title}</h1>{sub && <p className="sub">{sub}</p>}{children}</div></div>;
}
