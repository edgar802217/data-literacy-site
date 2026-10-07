/* 後台：講師工作台、縣市承辦、計畫承辦。顏色與元件同前台，版面改成左側選單＋表格，方便處理大量資料。 */
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, Navigate, Outlet, useNavigate, useParams } from "react-router-dom";
import { useDemo } from "../../demo/store";
import { addMail, course, done, ELIG_LABEL, ended, entitled, graduate, has, inviteMail, JOB, mdw, QUOTA, sess, sessName, ST, taken, TODAY, user } from "../../demo/logic";
import type { Elig, Invite, State, User } from "../../demo/types";
import { Badge, Modal } from "../../components/ui";

type Item = [string, string, (st: State, me: User) => number];
function groups(me: User): [string, Item[]][] {
  const g: [string, Item[]][] = [];
  if (has(me, "lecturer")) g.push(["講師工作台", [
    ["teach", "我的授課", () => 0],
    ["roll", "點名", (st, u) => st.sessions.filter(s => s.lect === u.id && ended(s) && !s.roll && st.regs.some(r => r.sess === s.id && r.status === "admitted")).length]]]);
  if (has(me, "county")) g.push(["縣市承辦", [["nominate", "講師培訓推薦", () => 0]]]);
  if (has(me, "staff")) g.push(["計畫管理", [
    ["dash", "總覽", () => 0],
    ["review", "報名審核", st => st.regs.filter(r => r.status === "pending").length],
    ["invites", "推薦與邀請", () => 0],
    ["complete", "結業與全教網", st => st.sessions.filter(s => ended(s) && st.regs.some(r => r.sess === s.id && ["admitted", "attended", "completed"].includes(r.status))).length],
    ["lecturers", "講師管理", st => st.reviews.filter(r => r.status === "submitted").length],
    ["courses", "課程設定", () => 0]]]);
  return g;
}

export function AdminLayout() {
  const { st, me } = useDemo();
  if (!me) return <Navigate to="/login?next=/admin" replace />;
  const g = groups(me);
  if (!g.length) return <div className="wrap narrow"><h1 className="h2">{me.name}沒有後台功能</h1><p className="muted">後台只開放給講師、縣市承辦與計畫承辦。</p><Link to="/" className="btn btn-p">回到首頁</Link></div>;
  return (
    <div className="admin">
      <nav className="aside" aria-label="後台選單">
        {g.map(([t, items]) => <div key={t}><div className="grp">{t}</div>{items.map(([k, label, badge]) => { const n = badge(st, me); return <NavLink key={k} to={"/admin/" + k}><span>{label}</span>{n > 0 && <span className="cnt">{n}</span>}</NavLink>; })}</div>)}
      </nav>
      <div className="amain"><Outlet /></div>
    </div>
  );
}
export function AdminIndex() {
  const { me } = useDemo();
  const first = me ? groups(me)[0]?.[1][0]?.[0] : undefined;
  return <Navigate to={"/admin/" + (first || "")} replace />;
}

const H = ({ t, sub, children }: { t: string; sub?: ReactNode; children?: ReactNode }) => <div className="ahead"><div><h1>{t}</h1>{sub && <p>{sub}</p>}</div>{children}</div>;
const Table = ({ head, children }: { head: string[]; children: ReactNode }) => <div className="tw"><table><thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;

/* ---------- 講師 ---------- */
export function Teach() {
  const { st, me } = useDemo();
  const [roster, setRoster] = useState<string | null>(null);
  const list = st.sessions.filter(s => s.lect === me!.id).sort((a, b) => (a.date < b.date ? -1 : 1));
  const people = (sid: string) => st.regs.filter(r => r.sess === sid && ["admitted", "attended", "absent", "completed", "reported"].includes(r.status));
  return <>
    <H t="我的授課" sub="承辦指派給你的場次。講師只看得到學員姓名與服務單位。" />
    <Table head={["場次", "地點", "學員", "狀態", ""]}>{list.map(s => <tr key={s.id}><td>{sessName(st, s)}</td><td>{s.venue}</td><td className="num">{people(s.id).length}</td>
      <td>{!ended(s) ? <Badge kind="can">即將開始</Badge> : s.roll ? <Badge kind="ok">已點名</Badge> : <Badge kind="wait">待點名</Badge>}</td>
      <td>{ended(s) && !s.roll ? <Link className="btn btn-p btn-sm" to={"/admin/roll/" + s.id}>去點名</Link> : <button className="btn btn-g btn-sm" onClick={() => setRoster(s.id)}>學員名單</button>}</td></tr>)}</Table>
    {me!.lect && <div className="apanel"><b>講師資格</b><p className="muted small">效期至 {me!.lect.until}・可授課區域：{me!.lect.regions.join("、")}・專長：{me!.lect.tags.join("、")}・已授課 {st.sessions.filter(s => s.lect === me!.id && ended(s)).length} 場（系統自動累計，作為續證依據）</p></div>}
    {roster && <Modal title="學員名單" onClose={() => setRoster(null)}><p className="muted small">{sessName(st, sess(st, roster)!)}</p>
      {people(roster).length ? <Table head={["姓名", "服務單位", "職務"]}>{people(roster).map(r => { const p = user(st, r.user)!; return <tr key={r.id}><td>{p.name}</td><td>{p.org}</td><td>{p.job && JOB[p.job]}</td></tr>; })}</Table> : <p className="muted">目前還沒有錄取的學員。</p>}</Modal>}
  </>;
}
export function Roll() {
  const { st, me, update, toast } = useDemo();
  const { sid } = useParams();
  const nav = useNavigate();
  const pool = st.sessions.filter(s => ended(s) && (has(me, "staff") || s.lect === me!.id) && st.regs.some(r => r.sess === s.id && r.status === "admitted"));
  const s = pool.find(x => x.id === sid) || pool[0];
  const [marks, setMarks] = useState<Record<string, "attended" | "absent">>({});
  if (!s) return <><H t="點名" /><div className="apanel"><p>沒有待點名的場次。</p></div></>;
  const list = st.regs.filter(r => r.sess === s.id && r.status === "admitted");
  const left = list.filter(r => !marks[r.id]).length;
  return <>
    <H t="點名" sub="研習結束後登記每位學員是否出席，承辦會依此核發結業。之後可改成學員掃 QR code 自行簽到。" />
    <div className="row bar"><label className="fld inline">場次<select value={s.id} onChange={e => { setMarks({}); nav("/admin/roll/" + e.target.value); }}>{pool.map(x => <option key={x.id} value={x.id}>{sessName(st, x)}</option>)}</select></label>
      <button className="btn btn-s btn-sm" onClick={() => setMarks(Object.fromEntries(list.map(r => [r.id, "attended" as const])))}>全部標為出席</button></div>
    <Table head={["學員", "服務單位", "出席"]}>{list.map(r => { const p = user(st, r.user)!, m = marks[r.id];
      return <tr key={r.id}><td>{p.name}</td><td>{p.org}</td><td><div className="row">
        <button className={"btn btn-sm " + (m === "attended" ? "btn-p" : "btn-g")} aria-pressed={m === "attended"} onClick={() => setMarks({ ...marks, [r.id]: "attended" })}>出席</button>
        <button className={"btn btn-sm " + (m === "absent" ? "btn-d" : "btn-g")} aria-pressed={m === "absent"} onClick={() => setMarks({ ...marks, [r.id]: "absent" })}>缺席</button></div></td></tr>; })}</Table>
    <div className="row"><button className="btn btn-p" disabled={left > 0} onClick={() => {
      const a = Object.values(marks).filter(v => v === "attended").length;
      update(d => { d.regs.filter(r => r.sess === s.id && r.status === "admitted").forEach(r => { r.status = marks[r.id]; }); d.sessions.find(x => x.id === s.id)!.roll = true; });
      setMarks({}); toast(`已送出點名：出席 ${a} 人。承辦會接著核發結業。`); nav(has(me, "staff") ? "/admin/complete" : "/admin/teach");
    }}>送出點名結果</button><span className="muted small">{left ? `還有 ${left} 位未標記` : "全部已標記"}</span></div>
  </>;
}

/* ---------- 縣市承辦 ---------- */
const INV: Record<Invite["status"], [string, "wait" | "ok" | "no"]> = { sent: ["已寄邀請・未回應", "wait"], accepted: ["已接受", "ok"], withdrawn: ["已撤回", "no"] };
export function Nominate() {
  const { st, me, update, toast } = useDemo();
  const mine = st.invites.filter(i => i.county === me!.county && i.course === "T");
  const used = mine.filter(i => i.status !== "withdrawn").length;
  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const f = e.currentTarget;
    update(d => { const i: Invite = { id: "i" + Date.now(), course: "T", county: me!.county, name: String(fd.get("name")).trim(), email: String(fd.get("email")).trim().toLowerCase(), org: String(fd.get("org")).trim(), status: "sent", user: null, by: me!.id, sent: TODAY }; d.invites.push(i); inviteMail(d, i); });
    f.reset(); toast("已推薦 " + fd.get("name") + "，邀請信已寄出（可在示範信箱看到）");
  };
  return <>
    <H t="講師培訓推薦" sub={<>{course(st, "T").name}・{me!.county}名額 <b className="num">{used} / {QUOTA}</b></>} />
    <Table head={["被推薦人", "服務單位", "邀請", "報名", ""]}>{mine.map(i => {
      const r = i.user ? st.regs.find(x => x.user === i.user && sess(st, x.sess)?.course === "T" && x.status !== "cancelled") : undefined;
      return <tr key={i.id}><td>{i.name}<div className="sub">{i.email}</div></td><td>{i.org}</td><td><Badge kind={INV[i.status][1]}>{INV[i.status][0]}</Badge><div className="sub">寄出 {i.sent}</div></td>
        <td>{r ? <><Badge kind={ST[r.status][1]}>{ST[r.status][0]}</Badge><div className="sub">{sess(st, r.sess)!.region}場</div></> : <span className="muted small">尚未報名</span>}</td>
        <td>{i.status === "sent" && <div className="row"><button className="btn btn-g btn-sm" onClick={() => { update(d => { const x = d.invites.find(y => y.id === i.id)!; x.sent = TODAY; inviteMail(d, x); }); toast("已重寄邀請信給 " + i.name); }}>重寄</button>
          <button className="btn btn-d btn-sm" onClick={() => { update(d => { d.invites.find(y => y.id === i.id)!.status = "withdrawn"; d.mails.forEach(m => { if (m.action?.id === i.id) m.used = true; }); }); toast("已撤回推薦，名額已釋出"); }}>撤回</button></div>}</td></tr>;
    })}</Table>
    {used < QUOTA ? <form className="apanel form" onSubmit={add}><b>新增推薦</b><div className="fgrid">
      <div className="fld"><label htmlFor="n-name">姓名</label><input id="n-name" name="name" required /></div>
      <div className="fld"><label htmlFor="n-email">Email</label><input id="n-email" name="email" type="email" required placeholder="建議填常用信箱" /></div>
      <div className="fld"><label htmlFor="n-org">服務單位</label><input id="n-org" name="org" required /></div></div>
      <div className="row"><button className="btn btn-p btn-sm" type="submit">推薦並寄出邀請</button><span className="muted small">被推薦人點邀請信就能報名；email 跟他的帳號不同也能綁定。</span></div></form>
      : <div className="apanel"><p>名額已用完。撤回未回應的推薦可以釋出名額。</p></div>}
  </>;
}

/* ---------- 計畫承辦 ---------- */
export function Dash() {
  const { st } = useDemo();
  const k = (n: number, t: string, s: string, to: string) => <Link to={"/admin/" + to} className={"kpi" + (n ? " hot" : "")}><span>{t}</span><b>{n}</b><span>{s}</span></Link>;
  const nol = st.sessions.filter(s => !ended(s) && !s.lect);
  return <>
    <H t="總覽" sub={`今天是 ${mdw(TODAY)}。數字是待處理的件數，點進去處理。`} />
    <div className="kpis">
      {k(st.regs.filter(r => r.status === "pending").length, "待審核報名", "含先修證明檢視", "review")}
      {k(st.sessions.filter(s => ended(s) && !s.roll && st.regs.some(r => r.sess === s.id && r.status === "admitted")).length, "待點名場次", "等講師點名或代點", "complete")}
      {k(st.regs.filter(r => r.status === "attended").length, "待核發結業", "已出席、尚未結業", "complete")}
      {k(st.regs.filter(r => r.status === "completed").length, "待登錄全教網", "已結業、尚未登錄", "complete")}
      {k(st.reviews.filter(r => r.status === "submitted").length, "待審講師認證", "公版簡報與試教影片", "lecturers")}
      {k(st.invites.filter(i => i.status === "sent").length, "推薦邀請未回應", "可重寄或提醒縣市", "invites")}
    </div>
    {nol.length > 0 && <div className="banner"><span>有 {nol.length} 個場次還沒指派講師。</span><Link to="/admin/lecturers" className="btn btn-s btn-sm">去指派</Link></div>}
    <h2 className="h3">近期場次</h2>
    <Table head={["場次", "地點", "錄取／名額", "待審", "講師"]}>{st.sessions.filter(s => !ended(s)).sort((a, b) => (a.date < b.date ? -1 : 1)).map(s => <tr key={s.id}><td>{sessName(st, s)}</td><td>{s.venue}</td><td className="num">{taken(st, s)} / {s.cap}</td><td className="num">{st.regs.filter(r => r.sess === s.id && r.status === "pending").length}</td><td>{s.lect ? user(st, s.lect)!.name : <Badge kind="wait">未指派</Badge>}</td></tr>)}</Table>
  </>;
}
export function Review() {
  const { st, update, toast } = useDemo();
  const [f, setF] = useState("pending");
  const list = st.regs.filter(r => (f === "pending" ? r.status === "pending" : r.sess === f && r.status !== "cancelled"));
  const decide = (id: string, v: "admitted" | "waitlist" | "rejected") => {
    update(d => { const r = d.regs.find(x => x.id === id)!; r.status = v; const p = d.users.find(u => u.id === r.user)!;
      addMail(d, p.email, "【教育資料素養提升計畫】報名結果：" + ST[v][0], `${p.name} 您好：\n您報名的「${sessName(d, sess(d, r.sess)!)}」審核結果為：${ST[v][0]}。\n詳情請登入網站查看「研習 › 我的研習」。`); });
    toast(user(st, st.regs.find(r => r.id === id)!.user)!.name + "：" + ST[v][0] + "，已寄信通知");
  };
  return <>
    <H t="報名審核" sub="先修證明（例如 A1、A2、B5-1）是全教網無法代為審核的資料，在這裡由承辦檢視。結果會自動寄信通知。" />
    <div className="row bar"><label className="fld inline">顯示<select value={f} onChange={e => setF(e.target.value)}><option value="pending">所有待審核</option>{st.sessions.filter(s => !ended(s)).map(s => <option key={s.id} value={s.id}>{sessName(st, s)}</option>)}</select></label>
      {list.some(r => r.status === "pending") && <button className="btn btn-s btn-sm" onClick={() => { const ids = list.filter(r => r.status === "pending").map(r => r.id); ids.forEach(id => decide(id, "admitted")); }}>待審核的全部錄取</button>}</div>
    {list.length ? <Table head={["報名者", "場次", "資格檢核", "留言", "處理"]}>{list.map(r => {
      const p = user(st, r.user)!, s = sess(st, r.sess)!, c = course(st, s.course);
      const chk: ReactNode[] = [];
      if (s.track) chk.push(p.job === s.track ? <Badge key="j" kind="ok">職務相符</Badge> : <Badge key="j" kind="no">職務不符</Badge>);
      if (c.elig === "track") chk.push(done(st, p.id, "A") ? <Badge key="a" kind="ok">初階已結業</Badge> : <Badge key="a" kind="no">查無初階紀錄</Badge>);
      if (c.elig === "invite") { const iv = st.invites.find(i => i.user === p.id && i.course === c.id); chk.push(iv ? <Badge key="i" kind="ok">{iv.county}推薦</Badge> : <Badge key="i" kind="no">無推薦</Badge>); }
      if (!chk.length) chk.push(<Badge key="o" kind="can">不限資格</Badge>);
      return <tr key={r.id}><td>{p.name}<div className="sub">{p.org}・{p.job && JOB[p.job]}</div></td><td>{sessName(st, s)}<div className="sub">名額 {taken(st, s)}/{s.cap}</div></td>
        <td><div className="tags">{chk}</div>{r.files && <div className="sub">附件：{r.files.join("、")}</div>}</td><td className="small">{r.note || <span className="muted">—</span>}</td>
        <td><div className="stack"><Badge kind={ST[r.status][1]}>{ST[r.status][0]}</Badge><div className="row">
          {r.status !== "admitted" && <button className="btn btn-p btn-sm" onClick={() => decide(r.id, "admitted")}>錄取</button>}
          {r.status !== "waitlist" && <button className="btn btn-g btn-sm" onClick={() => decide(r.id, "waitlist")}>備取</button>}
          {r.status !== "rejected" && <button className="btn btn-d btn-sm" onClick={() => decide(r.id, "rejected")}>不錄取</button>}</div></div></td></tr>;
    })}</Table> : <div className="apanel"><p>沒有符合條件的報名。</p></div>}
  </>;
}
export function Invites() {
  const { st, update, toast } = useDemo();
  const by: Record<string, { n: number; a: number }> = {};
  st.invites.forEach(i => { by[i.county] = by[i.county] || { n: 0, a: 0 }; if (i.status !== "withdrawn") by[i.county].n++; if (i.status === "accepted") by[i.county].a++; });
  const imp = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const rows = String(new FormData(e.currentTarget).get("rows")).split("\n").map(l => l.trim()).filter(Boolean);
    update(d => rows.forEach((l, k) => { const [name, email, county, org] = l.split(/[,，]/).map(x => (x || "").trim()); if (!name || !email) return;
      const i: Invite = { id: "i" + Date.now() + k, course: "T", county: county || "未填", name, email: email.toLowerCase(), org: org || "", status: "sent", user: null, by: null, sent: TODAY }; d.invites.push(i); inviteMail(d, i); }));
    toast(`已匯入 ${rows.length} 位，邀請信已寄出`);
  };
  return <>
    <H t="推薦與邀請" sub={`${course(st, "T").name}・每縣市 ${QUOTA} 名。縣市可以自己在平台推薦，也可以由承辦匯入名單。`} />
    <Table head={["縣市", "已推薦", "已接受", "未回應"]}>{Object.entries(by).map(([c, v]) => <tr key={c}><td>{c}</td><td className="num">{v.n} / {QUOTA}</td><td className="num">{v.a}</td><td className="num">{v.n - v.a}</td></tr>)}</Table>
    <Table head={["被推薦人", "縣市", "推薦方式", "狀態", ""]}>{st.invites.map(i => <tr key={i.id}><td>{i.name}<div className="sub">{i.email}</div></td><td>{i.county}</td><td className="small">{i.by ? "縣市在平台推薦" : "承辦匯入名單"}</td><td><Badge kind={INV[i.status][1]}>{INV[i.status][0]}</Badge></td>
      <td>{i.status === "sent" && <button className="btn btn-g btn-sm" onClick={() => { update(d => { const x = d.invites.find(y => y.id === i.id)!; x.sent = TODAY; inviteMail(d, x); }); toast("已重寄邀請信給 " + i.name); }}>重寄</button>}</td></tr>)}</Table>
    <form className="apanel form" onSubmit={imp}><b>匯入推薦名單</b><p className="muted small">每行一位：姓名,email,縣市,服務單位</p>
      <textarea name="rows" aria-label="推薦名單" defaultValue={"何志遠,ho.cy@hl.edu.tw,花蓮縣,花蓮縣立花崗國中\n李明珠,lee.mc@hl.edu.tw,花蓮縣,花蓮縣花蓮市明義國小"} />
      <div><button className="btn btn-p btn-sm" type="submit">匯入並寄出邀請</button></div></form>
  </>;
}
export function Complete() {
  const { st, update, toast } = useDemo();
  const [exp, setExp] = useState<string | null>(null);
  const list = st.sessions.filter(s => ended(s)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const es = exp ? sess(st, exp)! : null;
  const rows = es ? st.regs.filter(r => r.sess === es.id && r.status === "completed").map(r => { const p = user(st, r.user)!; return [r.idm, p.name, p.org, es.date2 || es.date, String(course(st, es.course).hours)]; }) : [];
  const csv = ["身分證字號,姓名,服務單位,研習日期,研習時數", ...rows.map(r => r.join(","))].join("\n");
  return <>
    <H t="結業與全教網" sub="已結束的場次：點名 → 核發結業與研習證明 → 匯出名單登錄全教網。" />
    <Table head={["場次", "點名", "出席", "已結業", "已登錄", "下一步"]}>{list.map(s => {
      const R = st.regs.filter(r => r.sess === s.id), c = (k: string) => R.filter(r => r.status === k).length;
      const att = c("attended"), cp = c("completed"), rp = c("reported");
      return <tr key={s.id}><td>{sessName(st, s)}<div className="sub">講師 {s.lect ? user(st, s.lect)!.name : "—"}</div></td>
        <td>{s.roll ? <Badge kind="ok">已點名</Badge> : <Badge kind="wait">等講師點名</Badge>}</td><td className="num">{att + cp + rp}</td><td className="num">{cp + rp}</td><td className="num">{rp}</td>
        <td>{!s.roll && c("admitted") ? <Link className="btn btn-g btn-sm" to={"/admin/roll/" + s.id}>代為點名</Link>
          : att ? <button className="btn btn-p btn-sm" onClick={() => { update(d => { graduate(d, s.id); }); toast(`已核發 ${att} 張研習證明；完成進階或講師培訓的人已自動開通分析平台`); }}>核發結業（{att} 人）</button>
          : cp ? <button className="btn btn-p btn-sm" onClick={() => setExp(s.id)}>匯出全教網名單（{cp} 人）</button>
          : <Badge kind="ok">已完成</Badge>}</td></tr>;
    })}</Table>
    <p className="muted small">核發結業時同時產生研習證明，完成進階或講師培訓的人會自動開通分析平台。匯出欄位要依全教網實際的批次匯入格式調整。</p>
    {es && <Modal title="匯出全教網名單" onClose={() => setExp(null)} wide>
      <p className="muted small">{sessName(st, es)}・共 {rows.length} 人</p><pre className="csv">{csv}</pre>
      <p className="small">示範中身分證字號維持遮罩；正式版匯出時才解密完整字號，每次匯出都寫入稽核紀錄。</p>
      <div className="row"><button className="btn btn-s btn-sm" onClick={() => navigator.clipboard?.writeText(csv).then(() => toast("已複製 CSV"), () => toast("無法存取剪貼簿，請手動選取複製"))}>複製 CSV</button>
        <button className="btn btn-p btn-sm" onClick={() => { update(d => d.regs.filter(r => r.sess === es.id && r.status === "completed").forEach(r => { r.status = "reported"; })); setExp(null); toast(`${rows.length} 人已標記為登錄全教網`); }}>已登錄完成，標記這 {rows.length} 人</button></div>
    </Modal>}
  </>;
}
export function Lecturers() {
  const { st, update, toast } = useDemo();
  const L = st.users.filter(u => has(u, "lecturer"));
  const q = st.reviews.filter(r => r.status === "submitted");
  return <>
    <H t="講師管理" sub="講師認證：完成講師培訓 → 繳交公版簡報與試教影片 → 審查通過 → 取得講師資格（效期 2 年）。" />
    <h2 className="h3">講師認證審查</h2>
    {q.length ? <Table head={["申請人", "培訓梯次", "繳交資料", ""]}>{q.map(r => { const p = user(st, r.user)!; return <tr key={r.id}><td>{p.name}<div className="sub">{p.org}</div></td><td>{r.cohort}<div className="sub">繳交 {r.at}</div></td><td className="small">{r.files.join("、")}</td>
      <td><div className="row"><button className="btn btn-p btn-sm" onClick={() => { update(d => { d.reviews.find(x => x.id === r.id)!.status = "approved"; const u = d.users.find(x => x.id === r.user)!; if (!u.roles.includes("lecturer")) u.roles.push("lecturer"); u.lect = { until: (Number(TODAY.slice(0, 4)) + 2) + TODAY.slice(4), regions: [], tags: [] }; if (!entitled(d, u.id)) d.ents.push({ user: u.id, src: "具講師資格", date: TODAY }); }); toast(p.name + " 已取得講師資格"); }}>通過</button>
        <button className="btn btn-g btn-sm" onClick={() => { update(d => { d.reviews.find(x => x.id === r.id)!.status = "returned"; addMail(d, p.email, "【教育資料素養提升計畫】講師認證資料請補件", p.name + " 您好：\n您的試教影片需要補充說明，請登入網站重新上傳。"); }); toast("已退回補件，並寄信通知 " + p.name); }}>退回補件</button></div></td></tr>; })}</Table>
      : <div className="apanel"><p className="muted">沒有待審件。</p></div>}
    <h2 className="h3">場次指派</h2>
    <Table head={["場次", "地點", "講師"]}>{st.sessions.filter(s => !ended(s)).sort((a, b) => (a.date < b.date ? -1 : 1)).map(s => <tr key={s.id}><td>{sessName(st, s)}</td><td>{s.venue}</td>
      <td><select aria-label="指派講師" value={s.lect || ""} onChange={e => { const v = e.target.value || null; update(d => { d.sessions.find(x => x.id === s.id)!.lect = v; }); toast(v ? "已指派 " + user(st, v)!.name : "已取消指派"); }}>
        <option value="">— 未指派 —</option>{L.map(u => <option key={u.id} value={u.id}>{u.name}（{u.lect?.regions.join("、") || "未填區域"}{u.lect?.regions.includes(s.region) ? "" : "，非可授課區"}）</option>)}</select></td></tr>)}</Table>
    <h2 className="h3">講師名冊</h2>
    <Table head={["講師", "可授課區域", "專長", "效期至", "已授課"]}>{L.map(u => <tr key={u.id}><td>{u.name}<div className="sub">{u.org}</div></td><td>{u.lect?.regions.join("、") || "—"}</td><td className="small">{u.lect?.tags.join("、") || "—"}</td><td className="num">{u.lect?.until}</td><td className="num">{st.sessions.filter(s => s.lect === u.id && ended(s)).length}</td></tr>)}</Table>
  </>;
}
export function Courses() {
  const { st, update, toast } = useDemo();
  return <>
    <H t="課程設定" sub="改了「資格類型」，網站上的報名按鈕會跟著變。116 年的新課程也用同一套設定開課。" />
    {st.courses.map(c => <div className="apanel" key={c.id}>
      <div className="row between"><div><b>{c.level}・{c.name}</b><p className="muted small">{c.hours} 小時{c.proof ? "・報名須附先修證明（" + c.proof.join("、") + "）" : ""}</p></div>
        <label className="fld inline">資格類型<select value={c.elig} onChange={e => { const v = e.target.value as Elig; update(d => { d.courses.find(x => x.id === c.id)!.elig = v; }); toast("已改為「" + ELIG_LABEL[v] + "」"); }}>{(Object.keys(ELIG_LABEL) as Elig[]).map(k => <option key={k} value={k}>{ELIG_LABEL[k]}</option>)}</select></label></div>
      <Table head={["場次", "地點", "名額", "報名"]}>{st.sessions.filter(s => s.course === c.id).map(s => <tr key={s.id}><td>{sessName(st, s)}</td><td>{s.venue}</td><td className="num">{taken(st, s)} / {s.cap}</td>
        <td>{ended(s) ? <Badge kind="no">已結束</Badge> : <button className={"btn btn-sm " + (s.open ? "btn-s" : "btn-g")} onClick={() => { update(d => { const x = d.sessions.find(y => y.id === s.id)!; x.open = !x.open; }); toast(s.open ? "已關閉報名" : "已開放報名"); }}>{s.open ? "開放中・點此關閉" : "已關閉・點此開放"}</button>}</td></tr>)}</Table>
    </div>)}
  </>;
}
