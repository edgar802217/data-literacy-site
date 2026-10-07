import { useState } from "react";
import { Link, NavLink, Outlet, useSearchParams } from "react-router-dom";
import { useDemo } from "../demo/store";
import { course, elig, entitled, has, JOB, mask, mdw, pendingInvites, sess, ST, upcoming } from "../demo/logic";
import type { Cert, CourseId } from "../demo/types";
import { useContent, Rich } from "../lib/content";
import { Badge, Icon, Level, Modal, Timeline } from "../components/ui";
import { SessionCard } from "../components/SessionCard";
import { bindInvite } from "../components/Layout";

/* ---------- 研習區外框：標題＋分頁 ---------- */
export function TrainingsLayout() {
  const { st, me } = useDemo();
  const active = me ? st.regs.filter(r => r.user === me.id && ["pending", "waitlist", "admitted"].includes(r.status)).length : 0;
  return (
    <>
      <div className="phead"><div className="wrap">
        <div className="crumb"><Link to="/">首頁</Link>›<span>研習</span></div>
        <h1>研習</h1>
        <nav className="subnav" aria-label="研習">
          <NavLink to="/trainings" end>找場次</NavLink>
          <NavLink to="/trainings/mine">我的研習{active > 0 && <span className="dot">{active}</span>}</NavLink>
          <NavLink to="/trainings/verify">證書查驗</NavLink>
          <NavLink to="/trainings/faq">常見問題</NavLink>
        </nav>
      </div></div>
      <Outlet />
    </>
  );
}

/* ---------- 找場次 ---------- */
const REGIONS = ["北區", "中區", "南區", "東區"];
export function Find() {
  const { st, me } = useDemo();
  const [q, setQ] = useSearchParams();
  const fc = (q.get("course") || "all") as CourseId | "all";
  const fr = q.get("region") || "all";
  const [only, setOnly] = useState(false);
  const set = (k: string, v: string) => { const n = new URLSearchParams(q); if (v === "all") n.delete(k); else n.set(k, v); setQ(n, { replace: true }); };
  const learner = has(me, "learner");
  const list = upcoming(st).filter(s => (fc === "all" || s.course === fc) && (fr === "all" || s.region === fr) && (!only || elig(st, me, s).ok));
  const months: Record<string, typeof list> = {};
  list.forEach(s => { const m = Number(s.date.slice(5, 7)) + " 月"; (months[m] = months[m] || []).push(s); });
  const chip = (k: string, v: string, t: string, cur: string) => <button key={v} className="chip" aria-pressed={cur === v} onClick={() => set(k, v)}>{t}</button>;
  return (
    <div className="wrap finder">
      <aside className="filters" aria-label="篩選">
        <div className="fg"><div className="fl">課程</div><div className="chips">{chip("course", "all", "全部", fc)}{chip("course", "A", "初階", fc)}{chip("course", "B", "進階", fc)}{chip("course", "T", "講師培訓", fc)}</div></div>
        <div className="fg"><div className="fl">區域</div><div className="chips">{chip("region", "all", "全部", fr)}{REGIONS.map(r => chip("region", r, r, fr))}</div></div>
        {learner && <div className="fg"><button className="switch" aria-pressed={only} onClick={() => setOnly(!only)}><i />只看我可以報名的</button></div>}
        {fc !== "all" && <div className="cinfo"><Level c={fc}>{course(st, fc).level}</Level><p>{course(st, fc).desc}</p></div>}
      </aside>
      <div className="results">
        <p className="count">共 {list.length} 個場次</p>
        {list.length ? Object.entries(months).map(([m, ss]) => <section key={m}><h2 className="month">{m}</h2>{ss.map(s => <SessionCard key={s.id} s={s} />)}</section>)
          : <div className="empty"><p>沒有符合條件的場次。</p><button className="btn btn-t" onClick={() => { setQ({}, { replace: true }); setOnly(false); }}>清除篩選</button></div>}
      </div>
    </div>
  );
}

/* ---------- 研習證明 ---------- */
function CertView({ c, onClose }: { c: Cert; onClose: () => void }) {
  const { st } = useDemo();
  const p = st.users.find(u => u.id === c.user)!;
  return <Modal title="研習證明" onClose={onClose} wide>
    <div className="certdoc">
      <h2>研習證明</h2>
      <p className="body"><b>{p.name}</b>（{p.org}）於 <span className="num">{c.date}</span> 參加教育資料素養提升計畫 {c.title}，研習時數共 <b className="num">{c.hours}</b> 小時，特此證明。</p>
      <div className="foot2"><div>教育部補助｜國立高雄師範大學執行<br />查驗碼 <span className="code">{c.code}</span><br />可至「研習 › 證書查驗」核對</div><div className="qr" aria-label="查驗 QR code（示意）" /></div>
    </div>
    <p className="muted small">正式版可下載 PDF；QR code 掃描後會直接打開證書查驗並帶入查驗碼。</p>
  </Modal>;
}

/* ---------- 我的研習 ---------- */
export function Mine() {
  const { st, me, update, toast } = useDemo();
  const [cert, setCert] = useState<Cert | null>(null);
  const [cancel, setCancel] = useState<string | null>(null);
  if (!me) return <div className="wrap"><div className="gate"><div><h2>登入後，這裡會列出你的報名進度與研習證明</h2><p className="muted">從報名、審核、出席、結業到登錄全教網，每一步都看得到；結業後的研習證明也在這裡。</p>
    <div className="acts"><Link to="/login?next=/trainings/mine" className="btn btn-p">登入</Link><Link to="/trainings/verify" className="btn btn-s">查驗別人的證明</Link></div></div>
    <div className="gate-art" aria-hidden="true"><i /><i /><i /></div></div></div>;
  if (!has(me, "learner")) return <div className="wrap"><div className="empty"><p>這個身分沒有研習紀錄。</p><Link to="/admin" className="btn btn-t">前往後台 <Icon n="arrow" /></Link></div></div>;
  const mine = st.regs.filter(r => r.user === me.id).map(r => ({ r, s: sess(st, r.sess)! })).sort((a, b) => (a.s.date < b.s.date ? 1 : -1));
  const going = mine.filter(x => ["pending", "waitlist", "admitted", "attended"].includes(x.r.status));
  const past = mine.filter(x => ["completed", "reported"].includes(x.r.status));
  const other = mine.filter(x => ["cancelled", "rejected", "absent"].includes(x.r.status));
  const extraCerts = st.certs.filter(c => c.user === me.id && !c.reg);
  const hours = st.certs.filter(c => c.user === me.id).reduce((a, c) => a + c.hours, 0);
  const inv = pendingInvites(st, me);
  return (
    <div className="wrap mine-page">
      {inv.map(i => <div className="banner" key={i.id}><span><b>{i.county}</b>推薦你參加「{course(st, i.course).name}」</span>
        <button className="btn btn-p btn-sm" onClick={() => { update(d => bindInvite(d, i.id, me.id)); toast("已接受邀請，現在可以報名了"); }}>接受邀請</button></div>)}
      <div className="sum">
        <div><span>進行中</span><b>{going.length}</b></div>
        <div><span>已結業</span><b>{past.length + extraCerts.length}</b></div>
        <div><span>累計研習時數</span><b>{hours}</b></div>
        <div><span>分析平台</span>{entitled(st, me.id) ? <><b className="s ok">已開通</b><Link to="/platform/enter">進入平台</Link></> : <><b className="s">未開通</b><Link to="/platform#unlock">開通條件</Link></>}</div>
      </div>
      <h2 className="h2">進行中</h2>
      {going.length ? going.map(({ r, s }) => {
        const c = course(st, s.course);
        return <article className="rcard" key={r.id}>
          <div className="top"><div><Level c={s.course}>{c.level}{s.track ? "・" + JOB[s.track] + "軌" : ""}</Level><h3><Link to={"/trainings/" + s.id}>{c.name}</Link></h3><p className="meta">{s.region} {mdw(s.date)}・{s.venue}</p></div><Badge kind={ST[r.status][1]}>{ST[r.status][0]}</Badge></div>
          <Timeline status={r.status} date={mdw(s.date)} />
          {r.files && <p className="meta">已附先修證明：{r.files.join("、")}</p>}
          {["pending", "waitlist", "admitted"].includes(r.status) && <div className="row"><Link to={"/trainings/" + s.id} className="btn btn-g btn-sm">場次資訊</Link><button className="btn btn-g btn-sm" onClick={() => setCancel(r.id)}>取消報名</button></div>}
        </article>;
      }) : <div className="empty"><p>目前沒有進行中的報名。</p><Link to="/trainings" className="btn btn-t">找研習 <Icon n="arrow" /></Link></div>}
      <h2 className="h2">已完成</h2>
      {past.length + extraCerts.length ? <>
        {past.map(({ r, s }) => { const c = course(st, s.course), ce = st.certs.find(x => x.reg === r.id);
          return <article className="rcard" key={r.id}><div className="top"><div><Level c={s.course}>{c.level}{s.track ? "・" + JOB[s.track] + "軌" : ""}</Level><h3>{c.name}</h3><p className="meta">{s.region} {mdw(s.date)}・{s.venue}・{c.hours} 小時</p></div><Badge kind="ok">{ST[r.status][0]}</Badge></div>
            {ce && <div className="certrow"><Icon n="file" /><span>研習證明</span><span className="code">{ce.code}</span><button className="btn btn-s btn-sm" onClick={() => setCert(ce)}>檢視</button></div>}</article>; })}
        {extraCerts.map(ce => <article className="rcard" key={ce.code}><div className="top"><div><Level c="T">講師培訓</Level><h3>{ce.title}</h3><p className="meta">{ce.date}・{ce.hours} 小時</p></div><Badge kind="ok">已結業</Badge></div>
          <div className="certrow"><Icon n="file" /><span>研習證明</span><span className="code">{ce.code}</span><button className="btn btn-s btn-sm" onClick={() => setCert(ce)}>檢視</button></div></article>)}
      </> : <div className="empty"><p>還沒有完成的研習。結業後研習證明會出現在這裡。</p></div>}
      {other.length > 0 && <details className="older"><summary>已取消、未錄取或缺席（{other.length}）</summary>{other.map(({ r, s }) => <p key={r.id}>{course(st, s.course).name}・{s.region} {mdw(s.date)}　<Badge kind="no">{ST[r.status][0]}</Badge></p>)}</details>}
      {cert && <CertView c={cert} onClose={() => setCert(null)} />}
      {cancel && <Modal title="取消這筆報名？" onClose={() => setCancel(null)}><p>取消後名額會釋出給備取的人。</p>
        <div className="row"><button className="btn btn-d btn-sm" onClick={() => { update(d => { d.regs.find(r => r.id === cancel)!.status = "cancelled"; }); setCancel(null); toast("已取消報名"); }}>取消報名</button><button className="btn btn-g btn-sm" onClick={() => setCancel(null)}>保留</button></div></Modal>}
    </div>
  );
}

/* ---------- 證書查驗 ---------- */
export function Verify() {
  const { st } = useDemo();
  const [q] = useSearchParams();
  const [code, setCode] = useState(q.get("code") || "");
  const [res, setRes] = useState<Cert | null | undefined>(q.get("code") ? st.certs.find(c => c.code === q.get("code")!.toUpperCase()) ?? null : undefined);
  const sample = st.certs[0]?.code;
  return (
    <div className="wrap narrow">
      <h2 className="h2">研習證明查驗</h2>
      <p className="muted">輸入研習證明上的查驗碼，確認證明由本計畫核發。不需要登入。</p>
      <form className="vrow" onSubmit={e => { e.preventDefault(); setRes(st.certs.find(c => c.code === code.trim().toUpperCase()) ?? null); }}>
        <label htmlFor="vcode" className="sr">查驗碼</label>
        <input id="vcode" value={code} onChange={e => setCode(e.target.value)} placeholder={"例如 " + sample} required />
        <button className="btn btn-p" type="submit">查驗</button>
      </form>
      {sample && <p className="small muted">示範用查驗碼：<button className="btn btn-t" onClick={() => setCode(sample)}>{sample}</button></p>}
      {res === null && <div className="result bad">查無此查驗碼。請確認英文字母與連字號是否正確。</div>}
      {res && <div className="result"><Badge kind="ok">有效證明</Badge><p><b>{mask(st.users.find(u => u.id === res.user)!.name)}</b>・{res.title}・{res.date}・{res.hours} 小時</p></div>}
      <p className="small muted">查驗結果只顯示遮罩後的姓名、課程、日期與時數。研習證明上的 QR code 掃描後會直接打開這頁並帶入查驗碼。</p>
    </div>
  );
}

/* ---------- 常見問題（試算表維護） ---------- */
export function Faq() {
  const { faq } = useContent();
  return <div className="wrap narrow"><h2 className="h2">常見問題</h2><div className="faq">{faq.map((q, i) => <details key={i}><summary>{q["問題"]}</summary><div className="a"><Rich text={q["回答"]} /></div></details>)}</div>
    <p className="small muted">找不到答案？請寫信給計畫辦公室。</p></div>;
}

