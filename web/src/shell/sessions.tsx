import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { course, daysTo, done, elig, has, JOB, ST, taken, TODAY, TRACK_CODE, upcoming } from "../demo/logic";
import type { Session, State, User } from "../demo/types";
import { dot } from "./Shell";

/* 報名條件判讀：首頁展開場次與場次詳情共用 */
type Mark = "1" | "0" | "-";
interface Judge { who: string; items: [Mark, string][]; verdict: string; ok: boolean; link?: [string, string] }

/** 報名條件逐條判讀：依序檢查，第一條不符就停下 */
export function judge(st: State, me: User | undefined, s: Session): Judge {
  const c = course(st, s.course), e = elig(st, me, s);
  const full = taken(st, s) >= s.cap, open = s.open && s.deadline >= TODAY;
  const dl = `報名截止 ${dot(s.deadline)}`;
  if (!me) {
    const items: [Mark, string][] = c.elig === "open" ? [["-", "不限資格"], ["-", dl], ["-", `名額 ${s.cap} 人`]]
      : c.elig === "track" ? [["-", "已完成 B6. 基礎課程"], ["-", `職務為${JOB[s.track!]}`], ["-", dl]]
      : [["-", "收到推動辦公室名單寄出的報名連結"], ["-", `已完成 ${c.proof?.join("、")}（全教網），報名時附證明`],
        ...(s.course === "T" ? [["-", "教育行政人員、現任或曾任校長主任，或已取得校長遴選／主任聘任資格"] as [Mark, string]] : []), ["-", dl]];
    return { who: "報名條件（登入後會依你的帳號逐條判讀）", items, ok: false,
      verdict: c.elig === "invite" ? "本學期不受理個人報名，請洽所屬縣市或國教署的推動辦公室。" : "登入後即可在場次頁報名。",
      link: c.elig === "invite" ? ["/trainings/faq", "報名方式"] : undefined };
  }
  const who = `以你的帳號判讀：${me.name}${me.job ? "・" + JOB[me.job] : ""}${done(st, me.id, "A") ? "・已完成 B6." : ""}`;
  if (e.reg) return { who, items: [], ok: true, verdict: `你已報名這一場，目前狀態：${ST[e.reg.status][0]}。`, link: ["/trainings/mine", "查看我的研習"] };
  if (!has(me, "learner") || done(st, me.id, c.id) || e.label === "已報名其他場次")
    return { who, items: [], ok: false, verdict: e.why + "。" };
  const conds: [boolean, string][] = [];
  if (!me.verified) conds.push([false, "email 已驗證"]);
  if (c.elig === "open") conds.push([true, "不限資格"]);
  if (c.elig === "track") {
    conds.push([done(st, me.id, "A"), "已完成 B6. 基礎課程"]);
    conds.push([me.job === s.track, `職務為${JOB[s.track!]}` + (me.job === s.track ? "" : `（你的職務是${me.job ? JOB[me.job] : "未填"}）`)]);
  }
  if (c.elig === "invite") conds.push([st.invites.some(i => i.course === c.id && i.user === me.id && i.status === "accepted"), "收到推動辦公室名單寄出的報名連結"]);
  conds.push([open, open ? "報名尚未截止" : "報名尚未截止（已截止）"]);
  conds.push([true, full ? "名額已滿，可以登記備取" : "還有名額"]);
  let stop = false;
  const items = conds.map(([ok, t]): [Mark, string] => { if (stop) return ["-", t]; if (!ok) { stop = true; return ["0", t]; } return ["1", t]; });
  if (!stop) return { who, items, ok: true, verdict: full ? "可以登記備取。" : "可以報名。", link: ["/trainings/" + s.id, "查看詳情與報名"] };
  const other = e.alt === "otherTrack" && me.job ? upcoming(st).find(x => x.course === "B" && x.track === me.job && x.open) : undefined;
  return { who, items, ok: false, verdict: (e.why || "目前無法報名") + "。",
    link: other ? ["/trainings/" + other.id, `看 ${dot(other.date)} ${TRACK_CODE[me.job!]}（${JOB[me.job!]}）`] : e.alt === "basic" ? ["/trainings?course=A", "看 B6. 場次"] : e.alt === "invite" ? ["/trainings/faq", "報名方式"] : undefined };
}

export function stateText(st: State, me: User | undefined, s: Session): [string, boolean] {
  const c = course(st, s.course), e = elig(st, me, s), full = taken(st, s) >= s.cap;
  if (e.reg) return [ST[e.reg.status][0], true];
  if (me && has(me, "learner")) return e.ok ? [full ? "可備取" : "可報名", true] : [c.elig === "invite" ? "推薦制" : e.label, false];
  if (c.elig === "invite") return ["推薦制", false];
  return s.open && s.deadline >= TODAY ? [full ? "可備取" : "開放報名", true] : ["報名截止", false];
}

/** 逐條判讀＋名額與截止小圖表 */
export function JudgeView({ st, me, s, children }: { st: State; me: User | undefined; s: Session; children?: ReactNode }) {
  const j = judge(st, me, s), n = taken(st, s), left = daysTo(s.deadline);
  return <>
    <div className="hm-judge" style={{ ["--n" as string]: j.items.length }}>
      <p className="hm-who">{j.who}</p>
      {j.items.length > 0 && <ol className="hm-checks" aria-label="報名條件">{j.items.map(([m, t], i) =>
        <li key={i} data-ok={m} style={{ ["--i" as string]: i }}><span className="hm-mk" aria-hidden="true" /><span>{t}<span className="vh">{m === "1" ? "（符合）" : m === "0" ? "（不符合）" : "（尚未檢查）"}</span></span></li>)}</ol>}
      <p className={"hm-verdict" + (j.ok ? " ok" : "")}>{j.verdict}</p>
    </div>
    <div className="hm-meters">
      <span>名額</span><span className="hm-bar" aria-hidden="true"><i style={{ ["--v" as string]: Math.min(1, n / s.cap) }} /></span><span className="hm-mv">已錄取 {n} / {s.cap}</span>
      <span>截止</span><span className="hm-ticks" aria-hidden="true">{Array.from({ length: 30 }, (_, k) => <i key={k} className={k < left ? "on" : ""} style={{ ["--k" as string]: k }} />)}</span>
      <span className="hm-mv">{left > 0 ? `還有 ${left} 天・${dot(s.deadline)}` : left === 0 ? `今天截止・${dot(s.deadline)}` : "報名已截止"}</span>
    </div>
    {children}
  </>;
}
/** 判讀結果附帶的下一步連結 */
export function JudgeLink({ st, me, s, skipDetail }: { st: State; me: User | undefined; s: Session; skipDetail?: boolean }) {
  const j = judge(st, me, s);
  if (!j.link || (skipDetail && j.link[0] === "/trainings/" + s.id)) return null;
  return <Link className="hm-go" to={j.link[0]}>{j.link[1]} <span className="hm-arr" aria-hidden="true">→</span></Link>;
}
