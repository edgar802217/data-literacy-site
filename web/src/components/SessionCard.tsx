import { Link } from "react-router-dom";
import type { Session } from "../demo/types";
import { useDemo } from "../demo/store";
import { course, elig, JOB, md, taken, wd } from "../demo/logic";
import { Badge, Level } from "./ui";

/** 一張場次卡只回答四件事：什麼課、何時、在哪裡、我能不能報 */
export function SessionCard({ s, compact }: { s: Session; compact?: boolean }) {
  const { st, me } = useDemo();
  const c = course(st, s.course), e = elig(st, me, s);
  return (
    <Link to={"/trainings/" + s.id} className={"scard" + (compact ? " compact" : "")}>
      <div className="d"><b>{md(s.date)}</b><small>{wd(s.date)}{s.date2 ? "・兩天" : ""}</small></div>
      <div className="m">
        <Level c={s.course}>{c.level}{s.track ? "・" + JOB[s.track] + "軌" : ""}</Level>
        <h3>{c.name}</h3>
        <p className="meta">{s.region}・{s.venue}{!compact && <>・名額 <span className="num">{taken(st, s)}/{s.cap}</span></>}</p>
      </div>
      <div className="r"><Badge kind={e.kind}>{e.label}</Badge>{e.why && !compact && <span className="why-s">{e.why}</span>}</div>
    </Link>
  );
}
