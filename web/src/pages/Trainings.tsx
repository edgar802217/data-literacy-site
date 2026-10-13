import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useSearchParams } from "react-router-dom";
import { useDemo } from "../demo/store";
import { course, elig, entitled, has, JOB, kindOf, levelName, mask, mdw, pendingInvites, sess, ST, titleOf, upcoming } from "../demo/logic";
import type { Cert, CourseId, RegStatus, Session } from "../demo/types";
import { useContent, Rich } from "../lib/content";
import { Modal } from "../components/ui";
import { bindInvite } from "../components/Layout";
import { dot, Stage, useSea } from "../shell/Shell";
import { stateText } from "../shell/sessions";
import { lastDetail, vt } from "../shell/vt";

/* ---------- 研習區：分頁在右欄最上方，標題在左欄舞台 ---------- */
export function TrainingsLayout() {
  const { st, me } = useDemo();
  const active = me ? st.regs.filter(r => r.user === me.id && ["pending", "waitlist", "admitted"].includes(r.status)).length : 0;
  return (
    <>
      <nav className="pg-tabs" aria-label="研習">
        <NavLink to="/trainings" end>找場次</NavLink>
        <NavLink to="/trainings/mine">我的研習{active > 0 && <span className="n">{active}</span>}</NavLink>
        <NavLink to="/trainings/verify">證書查驗</NavLink>
        <NavLink to="/trainings/faq">常見問題</NavLink>
      </nav>
      <Outlet />
    </>
  );
}

const Back = () => <Link className="sh-back" to="/">← 回首頁</Link>;

/** 一列場次：日期、課程、地點、我能不能報；點了進場次詳情 */
export function TrainRow({ s, why }: { s: Session; why?: boolean }) {
  const { st, me } = useDemo();
  const { setRow } = useSea();
  const c = course(st, s.course), e = elig(st, me, s), [txt, good] = stateText(st, me, s);
  const back = lastDetail.id === s.id;
  const on = () => setRow([dot(s.date), String(c.hours)]), off = () => setRow(null);
  return (
    <Link to={"/trainings/" + s.id} className="pg-row" data-c={s.course} data-vt-row=""
      onPointerEnter={e2 => e2.pointerType === "mouse" && on()} onPointerLeave={e2 => e2.pointerType === "mouse" && off()} onFocus={on} onBlur={off}>
      <div className="d"><time dateTime={s.date} data-vt="date" style={back ? { viewTransitionName: "vt-date" } : undefined}>{dot(s.date)}</time>{s.date2 && <small>–{dot(s.date2)}・兩天</small>}</div>
      <div className="m">
        <p className="k">{kindOf(st, s)}</p>
        <span className="t" data-vt="title" style={back ? { viewTransitionName: "vt-title" } : undefined}>{titleOf(st, s)}</span>
        <p className="meta">{s.region}・{s.venue}{s.venue2 ? "、" + s.venue2 : ""}</p>
        {why && e.why && !e.reg && !e.ok && <p className="pg-why">{e.why}</p>}
      </div>
      <span className={"s" + (good ? " good" : "")}>{txt}</span>
      <span className="go" aria-hidden="true">→</span>
    </Link>
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
  const set = (k: string, v: string) => vt(() => { const n = new URLSearchParams(q); if (v === "all") n.delete(k); else n.set(k, v); setQ(n, { replace: true }); });
  const learner = has(me, "learner");
  const list = upcoming(st).filter(s => (fc === "all" || s.course === fc) && (fr === "all" || s.region === fr) && (!only || elig(st, me, s).ok));
  const months: Record<string, Session[]> = {};
  list.forEach(s => { const m = `${s.date.slice(0, 4)} 年 ${+s.date.slice(5, 7)} 月`; (months[m] = months[m] || []).push(s); });
  const chip = (k: string, v: string, t: string, cur: string) => <button key={v} type="button" className="pg-chip" aria-pressed={cur === v} onClick={() => set(k, v)}>{t}</button>;
  return (
    <>
      <Stage eyebrow="研習" doc="找場次" title="找到適合你的場次" lead="115 年下半年開設 B6. 與 G1. 工作坊，由各推動辦公室彙整名單報名；進階課程 116 年起開設。"
        cap="亮起的是目前列出的場次日期。滑過場次，對應的數字會更明顯。" focus={list.map(s => dot(s.date))}><Back /></Stage>
      <div className="pg-filters" role="group" aria-label="篩選場次">
        <div className="pg-chips"><span className="pg-lb">課程</span>{chip("course", "all", "全部", fc)}{chip("course", "A", "B6. 基礎", fc)}{chip("course", "B", "進階", fc)}{chip("course", "T", "G1. 講師培訓", fc)}</div>
        <div className="pg-chips"><span className="pg-lb">區域</span>{chip("region", "all", "全部", fr)}{REGIONS.map(r => chip("region", r, r, fr))}</div>
        {learner && <label className="pg-check"><input type="checkbox" checked={only} onChange={() => vt(() => setOnly(!only))} />只看我可以報名的</label>}
      </div>
      <p className="pg-count" aria-live="polite">共 {list.length} 個場次</p>
      {list.length ? Object.entries(months).map(([m, ss]) => <section key={m}><h2 className="pg-sec">{m}</h2><div className="pg-list">{ss.map(s => <TrainRow key={s.id} s={s} why={learner} />)}</div></section>)
        : <p className="pg-empty">{fc === "B" ? "進階課程（B6-1／B6-2／B6-3）116 年起由各推動辦公室開設，目前還沒有場次。" : "沒有符合條件的場次。"}<button type="button" className="pg-tlink" onClick={() => vt(() => { setQ({}, { replace: true }); setOnly(false); })}>清除篩選</button></p>}
    </>
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
      <div className="foot2"><div>教育部資訊及科技教育司指導｜國立高雄師範大學承辦<br />查驗碼 <span className="code">{c.code}</span><br />可至「研習 › 證書查驗」核對</div><div className="qr" aria-label="查驗 QR code（示意）" /></div>
    </div>
    <p className="muted small">正式版可下載 PDF；QR code 掃描後會直接打開證書查驗並帶入查驗碼。</p>
  </Modal>;
}

/** 報名進度：送出報名 → 審核錄取 → 出席研習 → 結業 → 登錄全教網 */
function Steps({ status }: { status: RegStatus }) {
  const steps = ["送出報名", "審核錄取", "出席研習", "結業與證明", "登錄全教網"];
  const pos: Partial<Record<RegStatus, number>> = { pending: 1, waitlist: 1, admitted: 2, attended: 3, completed: 4, reported: 5 };
  const p = pos[status]; if (p == null) return null;
  return <ol className="pg-steps" aria-label="報名進度">{steps.map((t, i) => <li key={t} className={i < p ? "pg-done" : i === p ? "pg-now" : ""} aria-current={i === p ? "step" : undefined}><span>{t}{i < p && <span className="vh">（已完成）</span>}</span></li>)}</ol>;
}

/* ---------- 我的研習 ---------- */
export function Mine() {
  const { st, me, update, toast } = useDemo();
  const [cert, setCert] = useState<Cert | null>(null);
  const [cancel, setCancel] = useState<string | null>(null);
  const hoursTok = me ? Array.from(new Set(st.certs.filter(c => c.user === me.id).map(c => String(c.hours)))) : [];
  const stage = (lead: string) => <Stage eyebrow="研習" doc="我的研習" title="你的研習" lead={lead} cap="亮起的是你已完成研習的時數。" focus={hoursTok}><Back /></Stage>;
  if (!me) return <>{stage("報名進度與研習證明都在這裡。")}
    <p className="pg-text">登入後，這裡會列出你的報名進度：送出報名、審核、出席、結業，到登錄全教網時數，每一步都看得到。結業後的研習證明也在這裡。</p>
    <div className="pg-btnline"><Link to="/login?next=/trainings/mine" className="pg-btn">登入</Link><Link to="/trainings/verify" className="pg-tlink">查驗別人的證明</Link></div></>;
  if (!has(me, "learner")) return <>{stage("這個身分沒有研習紀錄。")}<p className="pg-text">你的身分是講師或承辦，工作在後台。</p><div className="pg-btnline"><Link to="/admin" className="pg-btn">前往後台</Link></div></>;
  const mine = st.regs.filter(r => r.user === me.id).map(r => ({ r, s: sess(st, r.sess)! })).sort((a, b) => (a.s.date < b.s.date ? 1 : -1));
  const going = mine.filter(x => ["pending", "waitlist", "admitted", "attended"].includes(x.r.status));
  const past = mine.filter(x => ["completed", "reported"].includes(x.r.status));
  const other = mine.filter(x => ["cancelled", "rejected", "absent"].includes(x.r.status));
  const extraCerts = st.certs.filter(c => c.user === me.id && !c.reg);
  const hours = st.certs.filter(c => c.user === me.id).reduce((a, c) => a + c.hours, 0);
  const inv = pendingInvites(st, me);
  const ent = entitled(st, me.id);
  return (
    <>
      {stage(`${me.name}・${me.job ? JOB[me.job] : ""}`)}
      {inv.map(i => <div className="pg-banner" key={i.id}><span><b>{i.county}</b>推薦你參加「{course(st, i.course).name}」</span>
        <button type="button" className="pg-btn sm" onClick={() => { update(d => bindInvite(d, i.id, me.id)); toast("已接受邀請，現在可以報名了"); }}>接受邀請</button></div>)}
      <div className="pg-sum">
        <div><span>進行中</span><b>{going.length}</b></div>
        <div><span>已結業</span><b>{past.length + extraCerts.length}</b></div>
        <div><span>累計研習時數</span><b>{hours}</b></div>
        <div><span>分析平台</span><b className="s">{ent ? "已開通" : "未開通"}</b>{ent ? <Link to="/platform/enter">進入平台</Link> : <Link to="/platform">開通條件</Link>}</div>
      </div>

      <h2 className="pg-sec" style={{ marginTop: 28 }}>進行中</h2>
      {going.length ? <div className="pg-list">{going.map(({ r, s }) => {
        return <div className="pg-row" data-c={s.course} key={r.id}>
          <div className="d"><time dateTime={s.date}>{dot(s.date)}</time>{s.date2 && <small>–{dot(s.date2)}</small>}</div>
          <div className="m"><p className="k">{kindOf(st, s)}</p><Link to={"/trainings/" + s.id} className="t">{titleOf(st, s)}</Link><p className="meta">{s.address.slice(0, 3) || s.region}・{s.venue}</p></div>
          <span className="s pg-now">{ST[r.status][0]}</span><span />
          <div className="extra">
            <Steps status={r.status} />
            {r.files && <p className="meta">已附先修證明：{r.files.join("、")}</p>}
            {["pending", "waitlist", "admitted"].includes(r.status) && <div className="pg-btnline" style={{ marginTop: 0 }}><button type="button" className="pg-btn pg-line sm" onClick={() => setCancel(r.id)}>取消報名</button></div>}
          </div>
        </div>;
      })}</div> : <p className="pg-empty">目前沒有進行中的報名。<Link to="/trainings">找研習 →</Link></p>}

      <h2 className="pg-sec">已完成</h2>
      {past.length + extraCerts.length ? <div className="pg-list">
        {past.map(({ r, s }) => { const c = course(st, s.course), ce = st.certs.find(x => x.reg === r.id);
          return <div className="pg-row" data-c={s.course} key={r.id}>
            <div className="d"><time dateTime={s.date}>{dot(s.date)}</time></div>
            <div className="m"><p className="k">{kindOf(st, s)}</p><span className="t">{titleOf(st, s)}</span><p className="meta">{s.venue}・{c.hours} 小時</p>
              {ce && <div className="pg-cert"><span>研習證明</span><code>{ce.code}</code><button type="button" className="pg-tlink" onClick={() => setCert(ce)}>檢視</button></div>}</div>
            <span className="s good">{ST[r.status][0]}</span><span />
          </div>; })}
        {extraCerts.map(ce => <div className="pg-row" data-c="T" key={ce.code}>
          <div className="d"><time dateTime={ce.date}>{dot(ce.date)}</time></div>
          <div className="m"><p className="k">講師培訓｜G1.</p><span className="t">{ce.title.replace(/^G1\. /, "")}</span><p className="meta">{ce.hours} 小時</p>
            <div className="pg-cert"><span>研習證明</span><code>{ce.code}</code><button type="button" className="pg-tlink" onClick={() => setCert(ce)}>檢視</button></div></div>
          <span className="s good">已結業</span><span />
        </div>)}
      </div> : <p className="pg-empty">還沒有完成的研習。結業後研習證明會出現在這裡。</p>}
      {other.length > 0 && <details className="pg-older"><summary>已取消、未錄取或缺席（{other.length}）</summary>{other.map(({ r, s }) => <p key={r.id}>{levelName(st, s)}・{s.region} {mdw(s.date)}・{ST[r.status][0]}</p>)}</details>}
      {cert && <CertView c={cert} onClose={() => setCert(null)} />}
      {cancel && <Modal title="取消這筆報名？" onClose={() => setCancel(null)}><p>取消後名額會釋出給備取的人。</p>
        <div className="row"><button className="btn btn-d btn-sm" onClick={() => { update(d => { d.regs.find(r => r.id === cancel)!.status = "cancelled"; }); setCancel(null); toast("已取消報名"); }}>取消報名</button><button className="btn btn-g btn-sm" onClick={() => setCancel(null)}>保留</button></div></Modal>}
    </>
  );
}

/* ---------- 證書查驗 ---------- */
export function Verify() {
  const { st } = useDemo();
  const [q] = useSearchParams();
  const [code, setCode] = useState(q.get("code") || "");
  const [res, setRes] = useState<Cert | null | undefined>(q.get("code") ? st.certs.find(c => c.code === q.get("code")!.toUpperCase()) ?? null : undefined);
  const sample = st.certs[0]?.code;
  useEffect(() => { if (q.get("code")) setCode(q.get("code")!); }, [q]);
  return (
    <>
      <Stage eyebrow="研習" doc="證書查驗" title="研習證明查驗" lead="輸入研習證明上的查驗碼，確認證明由本計畫核發。不需要登入。" cap="查驗碼的格式是 DL115 加五碼。" focus={["DL115", "115"]}><Back /></Stage>
      <form className="pg-verify" onSubmit={e => { e.preventDefault(); setRes(st.certs.find(c => c.code === code.trim().toUpperCase()) ?? null); }}>
        <label htmlFor="vcode" className="vh">查驗碼</label>
        <input id="vcode" value={code} onChange={e => setCode(e.target.value)} placeholder={"例如 " + sample} required autoComplete="off" />
        <button className="pg-btn" type="submit">查驗</button>
      </form>
      {sample && <p className="pg-note">示範用查驗碼：<button type="button" className="pg-tlink" onClick={() => setCode(sample)}>{sample}</button></p>}
      <div aria-live="polite">
        {res === null && <div className="pg-result bad"><b>查無此查驗碼</b>請確認英文字母與連字號是否正確。</div>}
        {res && <div className="pg-result"><b>有效證明</b>{mask(st.users.find(u => u.id === res.user)!.name)}・{res.title}・{res.date}・{res.hours} 小時</div>}
      </div>
      <p className="pg-note">查驗結果只顯示遮罩後的姓名、課程、日期與時數。研習證明上的 QR code 掃描後會直接打開這頁並帶入查驗碼。</p>
    </>
  );
}

/* ---------- 常見問題（試算表維護） ---------- */
export function Faq() {
  const { faq } = useContent();
  return (
    <>
      <Stage eyebrow="研習" doc="常見問題" title="常見問題" lead="報名方式、資格、時數與研習證明。" cap="亮起的是常被問到的數字：時數、先修課程與講師資格效期。" focus={["3", "9", "12", "2", "A1", "B5-1"]}><Back /></Stage>
      <div className="pg-disc" style={{ marginTop: 16 }}>{faq.map((x, i) => <details key={i}><summary>{x["問題"]}</summary><div className="a"><Rich text={x["回答"]} /></div></details>)}</div>
      <p className="pg-note">找不到答案？培訓相關請寄 edl.office+training@tlkr.nknu.edu.tw，其他業務請寄 edl.office@tlkr.nknu.edu.tw，或來電 07-7172930 分機 7028。</p>
    </>
  );
}
