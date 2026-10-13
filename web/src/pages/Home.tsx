import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDemo } from "../demo/store";
import { course, daysTo, entitled, has, JOB, md, pendingInvites, sess, ST, TODAY, upcoming } from "../demo/logic";
import { useContent } from "../lib/content";
import type { CourseId, Session } from "../demo/types";
import { createBars, reduced, type BarGroup } from "../home/sea";
import { dot, lvName, Stage, useSea } from "../shell/Shell";
import { JudgeLink, JudgeView, stateText } from "../shell/sessions";
import { lastDetail } from "../shell/vt";

/* 首頁：左欄舞台放理念與數字海（由全站骨架提供），右欄是你的研習、近期研習、研習路徑、分析平台與最新消息。 */

function SessionRow({ s, open, linked, onToggle, onFocusRow }: { s: Session; open: boolean; linked: boolean; onToggle: () => void; onFocusRow: (on: boolean) => void }) {
  const { st, me } = useDemo();
  const c = course(st, s.course), [stTxt, good] = stateText(st, me, s);
  const city = s.address.slice(0, 3) || s.region;
  const pid = "hm-p-" + s.id, tid = "hm-t-" + s.id;
  const btn = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const toggle = () => { if (open && panel.current?.contains(document.activeElement)) btn.current?.focus(); onToggle(); };
  const back = lastDetail.id === s.id;
  return (
    <div className={"hm-item" + (open ? " open" : "") + (linked ? " linked" : "")} data-c={s.course} data-ln="b" data-vt-row=""
      onPointerEnter={e => e.pointerType === "mouse" && onFocusRow(true)} onPointerLeave={e => e.pointerType === "mouse" && onFocusRow(false)}
      onFocus={() => onFocusRow(true)} onBlur={() => onFocusRow(false)}>
      <div className="hm-ihead">
        <div className="hm-date"><time className="hm-rv" dateTime={s.date} data-vt="date" style={back ? { viewTransitionName: "vt-date" } : undefined}>{dot(s.date)}</time>{s.date2 && <small className="hm-rv">–{dot(s.date2)}・兩天</small>}</div>
        <div className="hm-main" data-ln="l">
          <div className="hm-rv" data-tx="">
            <p className="hm-kind">{lvName(c.level)}{s.track ? "・" + JOB[s.track] + "軌" : ""}</p>
            <h3><button ref={btn} type="button" id={tid} aria-expanded={open} aria-controls={pid} onClick={toggle} data-vt="title" style={back ? { viewTransitionName: "vt-title" } : undefined}>{c.name}</button></h3>
            <p className="hm-meta">{city}・{c.elig === "invite" ? "縣市推薦" : "實體研習"}</p>
          </div>
        </div>
        <span className={"hm-state hm-rv" + (good ? " good" : "")} data-tx="">{stTxt}</span>
        <span className="hm-sign hm-rv" aria-hidden="true" />
      </div>
      <div className="hm-panel" id={pid} role="region" aria-labelledby={tid} ref={panel} {...(open ? {} : { inert: "" })}>
        <div className="hm-pin-wrap"><div className="hm-pin">
          <p>{c.desc}</p>
          <JudgeView st={st} me={me} s={s} />
          <dl className="hm-facts"><dt>時間</dt><dd>{s.time}・研習 {c.hours} 小時</dd><dt>地點</dt><dd>{s.venue}</dd></dl>
          <div className="hm-links">
            <JudgeLink st={st} me={me} s={s} skipDetail />
            <Link className="hm-go" to={"/trainings/" + s.id}>查看詳情與報名 <span className="hm-arr" aria-hidden="true">→</span></Link>
          </div>
        </div></div>
      </div>
    </div>
  );
}

/** 登入後：最近一筆進行中的報名與下一步 */
function Mine() {
  const { st, me } = useDemo();
  if (!me) return null;
  if (!has(me, "learner")) return <div className="hm-mine"><p className="hm-eyebrow">後台</p><p className="hm-mine-t">你的身分有後台工作</p><Link className="hm-go" to="/admin">進入後台 <span className="hm-arr" aria-hidden="true">→</span></Link></div>;
  const inv = pendingInvites(st, me)[0];
  const cur = st.regs.filter(r => r.user === me.id && ["pending", "waitlist", "admitted"].includes(r.status)).map(r => ({ r, s: sess(st, r.sess)! }))
    .filter(x => daysTo(x.s.date) >= 0).sort((a, b) => (a.s.date < b.s.date ? -1 : 1))[0];
  const ent = entitled(st, me.id);
  const plat = ent && <Link className="hm-go" to="/platform/enter">進入分析平台 <span className="hm-arr" aria-hidden="true">→</span></Link>;
  const next: Record<string, string> = { pending: "已收到報名，等待承辦審核", waitlist: "名額已滿，等待遞補", admitted: "已錄取，請準時參加" };
  return (
    <div className="hm-mine" data-c={cur ? cur.s.course : undefined}>
      <p className="hm-eyebrow">你的研習</p>
      {inv ? <><p className="hm-mine-t">{inv.county}推薦你參加講師培訓</p><p className="hm-mine-d">邀請信已寄到 {inv.email}，點信中的連結就能接受。</p></>
        : cur ? <><p className="hm-mine-t">{md(cur.s.date)}　{lvName(course(st, cur.s.course).level)}{cur.s.track ? `（${JOB[cur.s.track]}軌）` : ""}・{ST[cur.r.status][0]}</p><p className="hm-mine-d">{next[cur.r.status]}・{cur.s.venue}</p></>
        : <p className="hm-mine-t">目前沒有進行中的報名</p>}
      <div className="hm-links"><Link className="hm-go" to="/trainings/mine">查看我的研習 <span className="hm-arr" aria-hidden="true">→</span></Link>{plat}</div>
    </div>
  );
}

/** 研習路徑：細線小字，第一次看到時畫出來 */
function CoursePath({ focus, drawn }: { focus: { cat: CourseId; track?: string } | null; drawn: boolean }) {
  const nav = useNavigate();
  const go = (to: string) => (e: MouseEvent) => { e.preventDefault(); nav(to); };
  const on = (c: CourseId) => (focus?.cat === c ? "on" : undefined);
  const tr = (t: string) => (focus?.track === t ? "n" : undefined);
  return (
    <div className="hm-path hm-rv">
      <p className="hm-eyebrow" id="hm-path-h">研習路徑</p>
      <div className="hm-scroll">
        <svg viewBox="0 0 640 146" role="group" aria-labelledby="hm-path-h hm-path-d" className={(drawn ? "drawn" : "") + (focus ? " focus" : "")}>
          <desc id="hm-path-d">初階研習之後，依職務選一個進階分流；完成進階研習即開通分析平台。講師培訓由縣市推薦，是另外一條路，取得講師資格後也能使用分析平台。</desc>
          <g data-c="A" className={on("A")}>
            <path className="ln ca" pathLength={1} style={{ ["--d" as string]: "0ms" }} d="M24 44H150" />
            <a href="/trainings?course=A" onClick={go("/trainings?course=A")} aria-label="初階研習：看場次"><circle className="dot fa" cx="24" cy="44" r="6" /><text className="n" x="14" y="24">初階研習</text></a>
          </g>
          <g data-c="B" className={on("B")}>
            {["M150 44C190 44 196 20 236 20H330", "M150 44H330", "M150 44C190 44 196 68 236 68H330"].map(d => <path key={d} className="ln cb" pathLength={1} style={{ ["--d" as string]: "200ms" }} d={d} />)}
            {["M410 20C446 20 450 44 486 44", "M410 44H486", "M410 68C446 68 450 44 486 44"].map(d => <path key={d} className="ln cb" pathLength={1} style={{ ["--d" as string]: "420ms" }} d={d} />)}
            <path className="ln cb" pathLength={1} style={{ ["--d" as string]: "560ms" }} d="M486 44H592" />
            <a href="/trainings?course=B" onClick={go("/trainings?course=B")} aria-label="進階研習：看場次"><circle className="dot fb" cx="150" cy="44" r="5" /><text className="n" x="150" y="92" textAnchor="middle">進階研習</text></a>
            <text className={tr("county_admin")} x="340" y="24">縣市行政軌</text>
            <text className={tr("school_admin")} x="340" y="48">學校行政軌</text>
            <text className={tr("teacher")} x="340" y="72">學校教師軌</text>
          </g>
          <g data-c="T" className={on("T")}>
            <path className="ln ct" pathLength={1} style={{ ["--d" as string]: "150ms" }} d="M24 118H380" />
            <path className="ln ct" pathLength={1} style={{ ["--d" as string]: "500ms" }} d="M380 118H566C590 118 600 104 600 86V54" />
            <circle className="dot hollow" cx="24" cy="118" r="5" /><text x="14" y="142">縣市推薦</text>
            <a href="/trainings?course=T" onClick={go("/trainings?course=T")} aria-label="講師培訓：看場次"><circle className="dot ft" cx="200" cy="118" r="6" /><text className="n" x="200" y="142" textAnchor="middle">講師培訓</text></a>
            <circle className="dot ft" cx="380" cy="118" r="5" /><text x="380" y="142" textAnchor="middle">講師資格（效期 2 年）</text>
          </g>
          <a href="/platform" onClick={go("/platform")} aria-label="分析平台：了解開通方式"><circle className="dot fp" cx="600" cy="44" r="8" /><text className="n" x="604" y="24" textAnchor="end">開通分析平台</text></a>
        </svg>
      </div>
    </div>
  );
}

export default function Home() {
  const { st, me } = useDemo();
  const { news } = useContent();
  const sea = useSea();
  const up = upcoming(st);
  /* 近期研習：每種課程各取最近一場可報名的（登入者的進階優先顯示自己的分流），依日期排序 */
  const list = useMemo(() => (["A", "B", "T"] as CourseId[]).map(c => {
    const pool = up.filter(s => s.course === c);
    const mine = c === "B" && me?.job ? pool.find(s => s.track === me.job && s.open && s.deadline >= TODAY) : undefined;
    return mine || pool.find(s => s.open && s.deadline >= TODAY) || pool[0];
  }).filter(Boolean).sort((a, b) => (a!.date < b!.date ? -1 : 1)) as Session[], [up, me]);
  const months = Array.from(new Set(list.map(s => +s.date.slice(5, 7))));
  const range = list.length ? `${list[0].date.slice(0, 4)} / ${Math.min(...months)}${months.length > 1 ? "–" + Math.max(...months) : ""}` : "";

  const [openId, setOpenId] = useState<string | null>(null);
  const [rowFocus, setRowFocus] = useState<Session | null>(null);
  const [pathDrawn, setPathDrawn] = useState(false);
  const pfCv = useRef<HTMLCanvasElement>(null), pathRef = useRef<HTMLDivElement>(null);
  const bars = useRef<ReturnType<typeof createBars>>();
  const { setRow } = sea;
  useEffect(() => { setRow(rowFocus ? [dot(rowFocus.date), String(course(st, rowFocus.course).hours)] : null); }, [rowFocus, setRow, st]);
  useEffect(() => () => setRow(null), [setRow]);
  useEffect(() => { if (sea.ready) bars.current?.recheck(); }, [sea.ready]);

  /* 平台區長條圖：各區場次，一筆一格 */
  const groups: BarGroup[] = useMemo(() => {
    const regs = ["北區", "中區", "南區", "東區"].map(r => ({ label: r, items: st.sessions.filter(s => s.region === r).sort((a, b) => (a.date < b.date ? -1 : 1)).map(s => dot(s.date)) }))
      .filter(g => g.items.length).sort((a, b) => b.items.length - a.items.length);
    const cols: BarGroup["color"][] = ["act", "la", "lb", "lt"];
    return regs.map((g, i) => ({ ...g, color: cols[i % 4] }));
  }, [st.sessions]);
  useEffect(() => {
    if (!pfCv.current) return;
    bars.current = createBars(pfCv.current, groups);
    return () => { bars.current?.destroy(); bars.current = undefined; };
  }, [groups]);
  /* 研習路徑：進入畫面且開場結束後才畫 */
  useEffect(() => {
    if (!sea.ready || pathDrawn || !pathRef.current) return;
    if (reduced() || !("IntersectionObserver" in window)) { setPathDrawn(true); return; }
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { setTimeout(() => setPathDrawn(true), 250); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(pathRef.current);
    return () => io.disconnect();
  }, [sea.ready, pathDrawn]);

  const keptCat = sea.kept ? sea.words.cat[sea.kept] : undefined;
  const keptDate = sea.kept && /^\d\d\.\d\d$/.test(sea.kept) ? sea.kept : null;
  const focus = rowFocus ? { cat: rowFocus.course, track: rowFocus.track } : keptCat ? { cat: keptCat as CourseId } : null;
  const ent = !!me && entitled(st, me.id);
  const counts = groups.map(g => `${g.label} ${g.items.length} 場`).join("、");
  return (
    <>
      <Stage intro eyebrow="教育資料素養・持續學習" doc="首頁" title={<>理解資料，<br />讓教育的每一步<br />更有依據。</>}
        lead={<>從資料判讀到教學應用，與教育工作者一起，<br />將理解化為實踐。</>}
        cap="每個數字都來自計畫資料。把游標移到數字上（手機請點一下），其他數字會讓開，留下它代表的意思。" focus={[]}>
        <div className="hm-actions hm-rv" data-tx="" style={{ ["--d" as string]: "360ms" }}>
          <Link className="hm-btn" to="/trainings">探索研習 <span className="hm-arr" aria-hidden="true">→</span></Link>
          <Link className="hm-tlink" to="/trainings/faq">報名方式</Link>
        </div>
      </Stage>

      <section aria-labelledby="hm-tr">
        <Mine />
        <div className="hm-th">
          <h2 id="hm-tr" className="hm-rv" data-tx="" style={{ ["--d" as string]: "200ms" }}>近期研習</h2>
          <span className="hm-rule" data-ln="m" aria-hidden="true" />
          <span className="hm-range hm-rv" style={{ ["--d" as string]: "200ms" }}>{range}</span>
        </div>
        <div className="hm-list">
          {list.length ? list.map(s => <SessionRow key={s.id} s={s} open={openId === s.id} linked={keptDate ? dot(s.date) === keptDate : keptCat === s.course}
            onToggle={() => setOpenId(openId === s.id ? null : s.id)}
            onFocusRow={on => setRowFocus(on ? s : null)} />)
            : <p className="hm-empty">目前沒有即將舉辦的研習。</p>}
        </div>
        <div className="hm-all hm-rv" style={{ ["--d" as string]: "560ms" }}><Link to="/trainings">查看全部場次 <span className="hm-arr" aria-hidden="true">→</span></Link></div>
      </section>

      <div ref={pathRef}><CoursePath focus={focus} drawn={pathDrawn} /></div>

      <section className="hm-platform" data-ln="t" aria-labelledby="hm-pf">
        <div className="hm-rv" data-tx="" style={{ ["--d" as string]: "620ms" }}>
          <p className="hm-eyebrow">學習，延伸到實際應用</p>
          <h2 id="hm-pf">把研習所學，帶進資料分析。</h2>
          <p>完成進階研習或講師培訓，就能使用分析平台；也可以先用示範資料試玩。</p>
          <div className="hm-links">
            {ent ? <Link className="hm-btn sm" to="/platform/enter">進入分析平台 <span className="hm-arr" aria-hidden="true">→</span></Link> : null}
            <Link className="hm-go" to="/platform">認識分析平台 <span className="hm-arr" aria-hidden="true">→</span></Link>
          </div>
        </div>
        <figure className="hm-chart hm-rv" style={{ ["--d" as string]: "680ms" }}>
          <canvas ref={pfCv} aria-hidden="true" />
          <figcaption>示範：各區研習場次，一筆場次就是一格。點一下重新排列。<span className="vh">{counts}。</span></figcaption>
        </figure>
      </section>

      {news.length > 0 && <section className="hm-news hm-rv" data-ln="t" style={{ ["--d" as string]: "700ms" }} aria-labelledby="hm-nw">
        <h2 id="hm-nw">最新消息</h2>
        <ul>{news.slice(0, 2).map((n, i) => <li key={i}><time>{dot(n["日期"] || "")}</time>{n["連結"] ? <a href={n["連結"]} target="_blank" rel="noopener">{n["標題"]}</a> : <Link to="/news">{n["標題"]}</Link>}</li>)}</ul>
        <Link className="hm-go" to="/news">全部消息 <span className="hm-arr" aria-hidden="true">→</span></Link>
      </section>}
    </>
  );
}
