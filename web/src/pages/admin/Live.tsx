/* 正式模式的後台：網站內容、場次與課程、寄件紀錄（計畫承辦）；帳號與權限、操作紀錄（系統管理者）。
   取代原本的 Google 試算表，所有修改直接存進資料庫。 */
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { useDemo } from "../../demo/store";
import { COUNTIES, has, JOB, levelName, mdw } from "../../demo/logic";
import type { Course, Job, Session } from "../../demo/types";
import { api } from "../../lib/api";
import { useContent } from "../../lib/content";
import { Badge, Modal } from "../../components/ui";

const H = ({ t, sub, children }: { t: string; sub?: ReactNode; children?: ReactNode }) => <div className="ahead"><div><h1>{t}</h1>{sub && <p>{sub}</p>}</div>{children}</div>;
const Table = ({ head, children }: { head: string[]; children: ReactNode }) => <div className="tw"><table><thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
const fd = (e: FormEvent<HTMLFormElement>) => new FormData(e.currentTarget);
const ROLE: Record<string, string> = { learner: "學員", lecturer: "講師", county: "推動辦公室", staff: "計畫承辦", admin: "系統管理者" };

/** 載入資料的小工具：回傳 [資料, 重新載入, 錯誤訊息] */
function useLoad<T>(path: string): [T | null, () => void, string] {
  const [d, setD] = useState<T | null>(null), [err, setErr] = useState("");
  const load = useCallback(() => { api<T>(path).then(setD).catch(e => setErr(e.message)); }, [path]);
  useEffect(load, [load]);
  return [d, load, err];
}

export function LiveAdminLayout() {
  const { me, ready } = useDemo();
  if (!ready) return <div className="wrap narrow"><p className="muted">載入中…</p></div>;
  if (!me) return <Navigate to="/login?next=/admin" replace />;
  if (me.mustChangePassword) return <Navigate to="/account/password?first=1" replace />;
  const staff = has(me, "staff") || has(me, "admin"), sys = has(me, "admin");
  if (!staff && !sys) return <div className="wrap narrow"><h1 className="h2">{me.name}還沒有後台功能</h1>
    <p className="muted">{has(me, "lecturer") || has(me, "county") ? "講師與推動辦公室的後台功能將在下一階段開放。" : "後台只開放給計畫承辦與系統管理者。需要權限請聯絡系統管理者。"}</p><Link to="/" className="btn btn-p">回到首頁</Link></div>;
  return (
    <div className="admin">
      <nav className="aside" aria-label="後台選單">
        {staff && <div><div className="grp">計畫管理</div><NavLink to="/admin/content">網站內容</NavLink><NavLink to="/admin/sessions">場次與課程</NavLink><NavLink to="/admin/mails">寄件紀錄</NavLink></div>}
        {sys && <div><div className="grp">系統管理</div><NavLink to="/admin/users">帳號與權限</NavLink><NavLink to="/admin/audit">操作紀錄</NavLink></div>}
      </nav>
      <div className="amain"><Outlet /></div>
    </div>
  );
}
export function LiveAdminIndex() {
  const { me } = useDemo();
  return <Navigate to={me && (has(me, "staff") || has(me, "admin")) ? "/admin/content" : "/"} replace />;
}

/* ---------------- 網站內容 ---------------- */
interface NewsRow { id: string; date: string; category: string; title: string; body: string; link: string; visible: boolean }
interface EventRow { id: string; date: string; name: string; desc: string; visible: boolean }
interface FaqRow { id: string; question: string; answer: string; sort: number; visible: boolean }
interface AdminContent { settings: Record<string, string>; news: NewsRow[]; events: EventRow[]; faq: FaqRow[] }
type Field = { k: string; label: string; type?: "date" | "textarea" | "number" | "check"; req?: boolean; help?: string };
const NEWS_F: Field[] = [{ k: "date", label: "日期", type: "date", req: true }, { k: "category", label: "分類", help: "例如：研習、計畫、平台" }, { k: "title", label: "標題", req: true }, { k: "body", label: "內容", type: "textarea" }, { k: "link", label: "連結（選填）", help: "https:// 開頭的外部連結，或 / 開頭的站內頁面" }, { k: "visible", label: "在網站上顯示", type: "check" }];
const EVENT_F: Field[] = [{ k: "date", label: "日期", type: "date", req: true }, { k: "name", label: "名稱", req: true }, { k: "desc", label: "說明", type: "textarea" }, { k: "visible", label: "在網站上顯示", type: "check" }];
const FAQ_F: Field[] = [{ k: "question", label: "問題", req: true }, { k: "answer", label: "回答", type: "textarea", help: "每行開頭打「1.」會變成編號清單，「・」會變成項目清單" }, { k: "sort", label: "排序（數字小的在前）", type: "number" }, { k: "visible", label: "在網站上顯示", type: "check" }];

function RowForm({ fields, init, onSave, onCancel }: { fields: Field[]; init: Record<string, unknown>; onSave: (v: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = fd(e), v: Record<string, unknown> = {};
    fields.forEach(x => { v[x.k] = x.type === "check" ? f.get(x.k) === "on" : x.type === "number" ? Number(f.get(x.k) || 0) : String(f.get(x.k) || "").trim(); });
    setBusy(true); setErr("");
    try { await onSave(v); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };
  return <form className="form" onSubmit={submit}>
    {fields.map(x => x.type === "check"
      ? <label key={x.k} className="row"><input type="checkbox" name={x.k} defaultChecked={init[x.k] !== false} />{x.label}</label>
      : <div className="fld" key={x.k}><label htmlFor={"f-" + x.k}>{x.label}</label>
        {x.type === "textarea" ? <textarea id={"f-" + x.k} name={x.k} defaultValue={String(init[x.k] ?? "")} rows={5} />
          : <input id={"f-" + x.k} name={x.k} type={x.type || "text"} required={x.req} defaultValue={String(init[x.k] ?? "")} />}
        {x.help && <span className="help">{x.help}</span>}</div>)}
    {err && <p className="err" role="alert">{err}</p>}
    <div className="row"><button className="btn btn-p btn-sm" type="submit" disabled={busy}>儲存</button><button className="btn btn-g btn-sm" type="button" onClick={onCancel}>取消</button></div>
  </form>;
}

function ListEditor<T extends { id: string; visible: boolean }>({ title, path, rows, fields, cols, blank, reload }: {
  title: string; path: string; rows: T[]; fields: Field[]; cols: (r: T) => ReactNode[]; blank: Record<string, unknown>; reload: () => void;
}) {
  const { toast } = useDemo();
  const { reload: reloadSite } = useContent();
  const [edit, setEdit] = useState<T | "new" | null>(null), [del, setDel] = useState<T | null>(null);
  const after = (m: string) => { setEdit(null); setDel(null); reload(); reloadSite(); toast(m); };
  const save = async (v: Record<string, unknown>) => {
    if (edit === "new") await api(path, { method: "POST", body: v }); else await api(`${path}/${(edit as T).id}`, { method: "PATCH", body: v });
    after("已儲存，網站已更新");
  };
  return <section className="apanel">
    <div className="row between"><b>{title}（{rows.length}）</b><button className="btn btn-p btn-sm" onClick={() => setEdit("new")}>新增</button></div>
    <Table head={[...fields.filter(f => f.type !== "check" && f.type !== "textarea").map(f => f.label.replace(/（.*/, "")), "狀態", ""]}>{rows.map(r => <tr key={r.id}>
      {cols(r).map((c, i) => <td key={i}>{c}</td>)}<td>{r.visible ? <Badge kind="ok">顯示中</Badge> : <Badge kind="no">已隱藏</Badge>}</td>
      <td><div className="row"><button className="btn btn-g btn-sm" onClick={() => setEdit(r)}>編輯</button><button className="btn btn-d btn-sm" onClick={() => setDel(r)}>刪除</button></div></td></tr>)}</Table>
    {edit && <Modal title={edit === "new" ? "新增" + title : "編輯" + title} onClose={() => setEdit(null)} wide><RowForm fields={fields} init={edit === "new" ? blank : edit as unknown as Record<string, unknown>} onSave={save} onCancel={() => setEdit(null)} /></Modal>}
    {del && <Modal title={`刪除這筆${title}？`} onClose={() => setDel(null)}><p>刪除後無法復原。只是暫時不想顯示的話，可以改成「隱藏」。</p>
      <div className="row"><button className="btn btn-d btn-sm" onClick={async () => { try { await api(`${path}/${del.id}`, { method: "DELETE" }); after("已刪除"); } catch (x) { toast((x as Error).message); } }}>刪除</button><button className="btn btn-g btn-sm" onClick={() => setDel(null)}>取消</button></div></Modal>}
  </section>;
}

const SETTING_HELP: Record<string, string> = {
  重要公告: "首頁最上方的橫幅；留白就不顯示", 重要公告連結: "橫幅的「看詳情」連結，例如 /trainings", 聯絡窗口: "", 聯絡信箱: "一般業務信箱", 培訓信箱: "培訓專用信箱", 聯絡電話: "", 標語: "頁尾的一句話",
};
export function ContentAdmin() {
  const { toast } = useDemo();
  const { reload: reloadSite } = useContent();
  const [d, reload, err] = useLoad<AdminContent>("/admin/content");
  const [tab, setTab] = useState<"settings" | "news" | "events" | "faq">("settings");
  if (err) return <p className="err">{err}</p>;
  if (!d) return <p className="muted">載入中…</p>;
  const saveSettings = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = fd(e); const values: Record<string, string> = {};
    Object.keys(d.settings).forEach(k => { values[k] = String(f.get(k) || ""); });
    try { await api("/admin/settings", { method: "PUT", body: { values } }); reload(); reloadSite(); toast("已儲存，網站已更新"); } catch (x) { toast((x as Error).message); }
  };
  return <>
    <H t="網站內容" sub="重要公告、最新消息、交流活動、常見問題與聯絡資訊都在這裡修改，儲存後網站立即更新。" />
    <div className="tabs2" role="tablist">{([["settings", "公告與聯絡"], ["news", "最新消息"], ["events", "交流活動"], ["faq", "常見問題"]] as const).map(([k, t]) =>
      <button key={k} role="tab" aria-selected={tab === k} aria-pressed={tab === k} onClick={() => setTab(k)}>{t}</button>)}</div>
    {tab === "settings" && <form className="apanel form" onSubmit={saveSettings}>
      {Object.entries(d.settings).map(([k, v]) => <div className="fld" key={k}><label htmlFor={"s-" + k}>{k}</label>
        {k === "重要公告" ? <textarea id={"s-" + k} name={k} defaultValue={v} rows={3} /> : <input id={"s-" + k} name={k} defaultValue={v} />}
        {SETTING_HELP[k] && <span className="help">{SETTING_HELP[k]}</span>}</div>)}
      <div><button className="btn btn-p btn-sm" type="submit">儲存</button></div></form>}
    {tab === "news" && <ListEditor title="最新消息" path="/admin/news" rows={d.news} fields={NEWS_F} reload={reload}
      blank={{ date: new Date().toISOString().slice(0, 10), visible: true }} cols={r => [r.date, r.category || "—", r.title, r.link ? <a href={r.link} target="_blank" rel="noopener">連結</a> : "—"]} />}
    {tab === "events" && <ListEditor title="交流活動" path="/admin/events" rows={d.events} fields={EVENT_F} reload={reload}
      blank={{ date: new Date().toISOString().slice(0, 10), visible: true }} cols={r => [r.date, r.name]} />}
    {tab === "faq" && <ListEditor title="常見問題" path="/admin/faq" rows={d.faq} fields={FAQ_F} reload={reload}
      blank={{ sort: (d.faq.length ? d.faq[d.faq.length - 1].sort : 0) + 1, visible: true }} cols={r => [r.question, String(r.sort)]} />}
  </>;
}

/* ---------------- 場次與課程 ---------------- */
const REGIONS = ["北區", "中區", "南區", "東區"];
function SessionForm({ s, courses, lecturers, onSave, onCancel }: { s: Partial<Session>; courses: Course[]; lecturers: { id: string; name: string }[]; onSave: (v: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const [course, setCourse] = useState(s.course || "A"), [err, setErr] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = fd(e), g = (k: string) => String(f.get(k) || "").trim();
    const v = { id: s.id || g("id") || null, course, track: course === "B" ? g("track") : null, region: g("region"), date: g("date"), date2: g("date2") || null, time: g("time"),
      venue: g("venue"), address: g("address"), venue2: g("venue2") || null, address2: g("address2") || null, cap: Number(g("cap")), open: f.get("open") === "on", deadline: g("deadline"), lect: g("lect") || null };
    setErr(""); try { await onSave(v); } catch (x) { setErr((x as Error).message); }
  };
  return <form className="form" onSubmit={submit}>
    <div className="fgrid">
      <div className="fld"><label htmlFor="ss-course">課程</label><select id="ss-course" value={course} onChange={e => setCourse(e.target.value as Session["course"])} disabled={!!s.id}>{courses.map(c => <option key={c.id} value={c.id}>{c.code} {c.name}</option>)}</select></div>
      {course === "B" && <div className="fld"><label htmlFor="ss-track">分流</label><select id="ss-track" name="track" defaultValue={s.track || "school_admin"}>{(Object.keys(JOB) as Job[]).map(k => <option key={k} value={k}>{JOB[k]}</option>)}</select></div>}
      <div className="fld"><label htmlFor="ss-region">區域</label><select id="ss-region" name="region" defaultValue={s.region || "北區"}>{REGIONS.map(r => <option key={r}>{r}</option>)}</select></div>
      {!s.id && <div className="fld"><label htmlFor="ss-id">場次代號（選填）</label><input id="ss-id" name="id" placeholder="留白會自動產生" pattern="[A-Za-z0-9_\-]{2,32}" /></div>}
    </div>
    <div className="fgrid">
      <div className="fld"><label htmlFor="ss-date">日期（第一天）</label><input id="ss-date" name="date" type="date" required defaultValue={s.date} /></div>
      <div className="fld"><label htmlFor="ss-date2">第二天（兩天的課程才填）</label><input id="ss-date2" name="date2" type="date" defaultValue={s.date2} /></div>
      <div className="fld"><label htmlFor="ss-time">時間</label><input id="ss-time" name="time" defaultValue={s.time || (course === "A" ? "09:00–12:00" : "兩天 09:00–16:00")} /></div>
    </div>
    <div className="fgrid">
      <div className="fld"><label htmlFor="ss-venue">地點</label><input id="ss-venue" name="venue" required defaultValue={s.venue} /></div>
      <div className="fld"><label htmlFor="ss-address">地址</label><input id="ss-address" name="address" defaultValue={s.address} /></div>
    </div>
    <div className="fgrid">
      <div className="fld"><label htmlFor="ss-venue2">第二天地點（和第一天不同才填）</label><input id="ss-venue2" name="venue2" defaultValue={s.venue2} /></div>
      <div className="fld"><label htmlFor="ss-address2">第二天地址</label><input id="ss-address2" name="address2" defaultValue={s.address2} /></div>
    </div>
    <div className="fgrid">
      <div className="fld"><label htmlFor="ss-cap">名額</label><input id="ss-cap" name="cap" type="number" min={1} required defaultValue={s.cap || 40} /></div>
      <div className="fld"><label htmlFor="ss-deadline">報名截止日</label><input id="ss-deadline" name="deadline" type="date" required defaultValue={s.deadline} /></div>
      <div className="fld"><label htmlFor="ss-lect">講師</label><select id="ss-lect" name="lect" defaultValue={s.lect || ""}><option value="">— 未指派 —</option>{lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
    </div>
    <label className="row"><input type="checkbox" name="open" defaultChecked={s.open ?? true} />開放報名</label>
    {err && <p className="err" role="alert">{err}</p>}
    <div className="row"><button className="btn btn-p btn-sm" type="submit">儲存</button><button className="btn btn-g btn-sm" type="button" onClick={onCancel}>取消</button></div>
  </form>;
}
function CourseForm({ c, onSave, onCancel }: { c: Course; onSave: (v: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const [err, setErr] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = fd(e), g = (k: string) => String(f.get(k) || "").trim();
    const v = { level: g("level"), code: g("code"), name: g("name"), hours: Number(g("hours")), elig: g("elig"), proof: g("proof") ? g("proof").split(/[、,，\s]+/).filter(Boolean) : null, desc: g("desc"), content: g("content").split("\n").map(x => x.trim()).filter(Boolean) };
    setErr(""); try { await onSave(v); } catch (x) { setErr((x as Error).message); }
  };
  return <form className="form" onSubmit={submit}>
    <div className="fgrid"><div className="fld"><label htmlFor="c-level">課程類別</label><input id="c-level" name="level" required defaultValue={c.level} /></div>
      <div className="fld"><label htmlFor="c-code">代碼</label><input id="c-code" name="code" required defaultValue={c.code} /></div>
      <div className="fld"><label htmlFor="c-hours">時數</label><input id="c-hours" name="hours" type="number" min={1} required defaultValue={c.hours} /></div></div>
    <div className="fld"><label htmlFor="c-name">課程名稱</label><input id="c-name" name="name" required defaultValue={c.name} /></div>
    <div className="fgrid"><div className="fld"><label htmlFor="c-elig">報名方式</label><select id="c-elig" name="elig" defaultValue={c.elig}><option value="open">不限資格</option><option value="track">依職務分流（需先完成 B6.）</option><option value="invite">推動辦公室推薦</option></select></div>
      <div className="fld"><label htmlFor="c-proof">先修證明（用頓號分隔）</label><input id="c-proof" name="proof" defaultValue={(c.proof || []).join("、")} /></div></div>
    <div className="fld"><label htmlFor="c-desc">簡介</label><textarea id="c-desc" name="desc" rows={3} defaultValue={c.desc} /></div>
    <div className="fld"><label htmlFor="c-content">課程內容（一行一項）</label><textarea id="c-content" name="content" rows={5} defaultValue={c.content.join("\n")} /></div>
    {err && <p className="err" role="alert">{err}</p>}
    <div className="row"><button className="btn btn-p btn-sm" type="submit">儲存</button><button className="btn btn-g btn-sm" type="button" onClick={onCancel}>取消</button></div>
  </form>;
}
export function SessionsAdmin() {
  const { st, refresh, toast } = useDemo();
  const [lects] = useLoad<{ id: string; name: string }[]>("/admin/lecturers");
  const [edit, setEdit] = useState<Partial<Session> | null>(null), [cedit, setCedit] = useState<Course | null>(null), [del, setDel] = useState<Session | null>(null);
  const done = async (m: string) => { setEdit(null); setCedit(null); setDel(null); await refresh(); toast(m); };
  const list = [...st.sessions].sort((a, b) => (a.date < b.date ? -1 : 1));
  const today = new Date().toISOString().slice(0, 10);
  return <>
    <H t="場次與課程" sub="新增或修改場次的日期、地點、名額與截止日；儲存後網站立即更新。"><button className="btn btn-p btn-sm" onClick={() => setEdit({})}>新增場次</button></H>
    <Table head={["場次", "日期", "地點", "名額", "截止", "報名", ""]}>{list.map(s => <tr key={s.id} className={s.date < today ? "muted" : undefined}>
      <td>{levelName(st, s)}<div className="sub">{s.region}・代號 {s.id}</div></td><td className="num">{mdw(s.date)}{s.date2 && <div className="sub">{mdw(s.date2)}</div>}</td>
      <td>{s.venue}{s.venue2 && <div className="sub">第二天 {s.venue2}</div>}</td><td className="num">{s.cap}</td><td className="num">{mdw(s.deadline)}</td>
      <td>{s.date < today ? <Badge kind="no">已結束</Badge> : s.open ? <Badge kind="ok">開放中</Badge> : <Badge kind="no">未開放</Badge>}</td>
      <td><div className="row"><button className="btn btn-g btn-sm" onClick={() => setEdit(s)}>編輯</button><button className="btn btn-d btn-sm" onClick={() => setDel(s)}>刪除</button></div></td></tr>)}</Table>
    <h2 className="h3">課程</h2>
    {st.courses.map(c => <div className="apanel" key={c.id}><div className="row between"><div><b>{c.level}｜{c.code} {c.name}</b><p className="muted small">{c.hours} 小時・{c.elig === "invite" ? "推動辦公室推薦" : c.elig === "track" ? "依職務分流" : "不限資格"}{c.proof ? "・先修 " + c.proof.join("、") : ""}</p></div>
      <button className="btn btn-g btn-sm" onClick={() => setCedit(c)}>編輯課程說明</button></div></div>)}
    {edit && <Modal title={edit.id ? "編輯場次" : "新增場次"} onClose={() => setEdit(null)} wide>
      <SessionForm s={edit} courses={st.courses} lecturers={lects || []} onCancel={() => setEdit(null)}
        onSave={async v => { if (edit.id) await api(`/admin/sessions/${edit.id}`, { method: "PATCH", body: v }); else await api("/admin/sessions", { method: "POST", body: v }); await done("已儲存，網站已更新"); }} /></Modal>}
    {cedit && <Modal title="編輯課程說明" onClose={() => setCedit(null)} wide><CourseForm c={cedit} onCancel={() => setCedit(null)} onSave={async v => { await api(`/admin/courses/${cedit.id}`, { method: "PATCH", body: v }); await done("已儲存"); }} /></Modal>}
    {del && <Modal title="刪除這個場次？" onClose={() => setDel(null)}><p>{levelName(st, del)}｜{del.region} {mdw(del.date)}。刪除後無法復原；只是暫停報名的話，可以改成「未開放」。</p>
      <div className="row"><button className="btn btn-d btn-sm" onClick={async () => { try { await api(`/admin/sessions/${del.id}`, { method: "DELETE" }); await done("已刪除"); } catch (x) { toast((x as Error).message); } }}>刪除</button><button className="btn btn-g btn-sm" onClick={() => setDel(null)}>取消</button></div></Modal>}
  </>;
}

/* ---------------- 寄件紀錄 ---------------- */
interface MailRow { id: string; to: string; subject: string; body: string; status: string; error: string; createdAt: string }
export function MailsAdmin() {
  const [d, reload, err] = useLoad<MailRow[]>("/admin/mails");
  const [open, setOpen] = useState<MailRow | null>(null);
  const S: Record<string, [string, "ok" | "wait" | "no"]> = { sent: ["已寄出", "ok"], outbox: ["只記錄（尚未設定寄信）", "wait"], failed: ["寄送失敗", "no"] };
  return <>
    <H t="寄件紀錄" sub="系統寄出的驗證信、重設密碼信都會記在這裡。還沒設定寄信服務時，信件只會記錄、不會真的寄出，可以從這裡複製連結給對方。"><button className="btn btn-g btn-sm" onClick={reload}>重新整理</button></H>
    {err ? <p className="err">{err}</p> : !d ? <p className="muted">載入中…</p> : d.length ? <Table head={["時間", "收件人", "主旨", "狀態", ""]}>{d.map(m => <tr key={m.id}>
      <td className="num small">{new Date(m.createdAt).toLocaleString("zh-TW")}</td><td>{m.to}</td><td>{m.subject}</td><td><Badge kind={S[m.status]?.[1] || "wait"}>{S[m.status]?.[0] || m.status}</Badge></td>
      <td><button className="btn btn-g btn-sm" onClick={() => setOpen(m)}>內容</button></td></tr>)}</Table> : <div className="apanel"><p className="muted">還沒有信件。</p></div>}
    {open && <Modal title={open.subject} onClose={() => setOpen(null)} wide><p className="muted small">寄給 {open.to}</p><pre className="csv" style={{ whiteSpace: "pre-wrap" }}>{open.body}</pre>{open.error && <p className="err">{open.error}</p>}</Modal>}
  </>;
}

/* ---------------- 帳號與權限 ---------------- */
interface UserRow { id: string; email: string; name: string; title: string; org: string; county: string; job: Job | null; roles: string[]; verified: boolean; isActive: boolean; mustChangePassword: boolean; lastLoginAt: string | null }
function UserForm({ u, onSave, onCancel }: { u: Partial<UserRow>; onSave: (v: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const [err, setErr] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = fd(e), g = (k: string) => String(f.get(k) || "").trim();
    const v: Record<string, unknown> = { name: g("name"), title: g("title"), org: g("org"), county: g("county"), job: g("job") || null,
      roles: Object.keys(ROLE).filter(r => f.get("r-" + r) === "on"), isActive: f.get("active") === "on", verified: f.get("verified") === "on" };
    if (!u.id) v.email = g("email");
    setErr(""); try { await onSave(v); } catch (x) { setErr((x as Error).message); }
  };
  return <form className="form" onSubmit={submit}>
    {!u.id && <div className="fld"><label htmlFor="u-email">Email（登入帳號）</label><input id="u-email" name="email" type="email" required /></div>}
    <div className="fgrid"><div className="fld"><label htmlFor="u-name">姓名</label><input id="u-name" name="name" required defaultValue={u.name} /></div>
      <div className="fld"><label htmlFor="u-title">職稱</label><input id="u-title" name="title" defaultValue={u.title} /></div></div>
    <div className="fgrid"><div className="fld"><label htmlFor="u-org">服務單位</label><input id="u-org" name="org" defaultValue={u.org} /></div>
      <div className="fld"><label htmlFor="u-county">縣市（推動辦公室必填）</label><select id="u-county" name="county" defaultValue={u.county || ""}><option value="">（未填）</option>{[...COUNTIES, "國教署"].map(c => <option key={c}>{c}</option>)}</select></div>
      <div className="fld"><label htmlFor="u-job">職務</label><select id="u-job" name="job" defaultValue={u.job || ""}><option value="">（未填）</option>{(Object.keys(JOB) as Job[]).map(k => <option key={k} value={k}>{JOB[k]}</option>)}</select></div></div>
    <fieldset className="fld"><legend className="lb">角色與權限</legend><div className="seg2">{Object.entries(ROLE).map(([k, t]) => <label key={k}><input type="checkbox" name={"r-" + k} defaultChecked={(u.roles || ["learner"]).includes(k)} /><span>{t}</span></label>)}</div>
      <span className="help">計畫承辦：管理網站內容與場次。系統管理者：另外可以管理帳號與權限。</span></fieldset>
    <label className="row"><input type="checkbox" name="active" defaultChecked={u.isActive ?? true} />帳號啟用中</label>
    <label className="row"><input type="checkbox" name="verified" defaultChecked={u.verified ?? true} />email 已驗證</label>
    {err && <p className="err" role="alert">{err}</p>}
    <div className="row"><button className="btn btn-p btn-sm" type="submit">{u.id ? "儲存" : "建立帳號"}</button><button className="btn btn-g btn-sm" type="button" onClick={onCancel}>取消</button></div>
  </form>;
}
export function UsersAdmin() {
  const { toast, me } = useDemo();
  const [q, setQ] = useState(""), [role, setRole] = useState("");
  const [d, setD] = useState<{ total: number; users: UserRow[] } | null>(null), [err, setErr] = useState("");
  const load = useCallback(() => { api<{ total: number; users: UserRow[] }>(`/admin/users?q=${encodeURIComponent(q)}&role=${role}`).then(setD).catch(e => setErr(e.message)); }, [q, role]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const [edit, setEdit] = useState<Partial<UserRow> | null>(null), [temp, setTemp] = useState<{ who: string; pw: string } | null>(null), [reset, setReset] = useState<UserRow | null>(null);
  return <>
    <H t="帳號與權限" sub="把計畫承辦、推動辦公室、講師的權限指派給對應的帳號。新建或重設密碼的帳號，首次登入會被要求改密碼。"><button className="btn btn-p btn-sm" onClick={() => setEdit({})}>建立帳號</button></H>
    <div className="row bar"><label className="fld inline">搜尋<input value={q} onChange={e => setQ(e.target.value)} placeholder="姓名、email 或服務單位" /></label>
      <label className="fld inline">角色<select value={role} onChange={e => setRole(e.target.value)}><option value="">全部</option>{Object.entries(ROLE).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label></div>
    {err ? <p className="err">{err}</p> : !d ? <p className="muted">載入中…</p> : <>
      <p className="muted small">共 {d.total} 個帳號{d.total > 50 ? "，只列出前 50 個，請用搜尋縮小範圍" : ""}</p>
      <Table head={["姓名", "帳號", "服務單位", "角色", "狀態", ""]}>{d.users.map(u => <tr key={u.id}>
        <td>{u.name}{u.title && <div className="sub">{u.title}</div>}</td><td>{u.email}</td><td>{u.org || "—"}{u.county && <div className="sub">{u.county}</div>}</td>
        <td><div className="tags">{u.roles.map(r => <Badge key={r} kind={r === "admin" || r === "staff" ? "ok" : "can"}>{ROLE[r] || r}</Badge>)}</div></td>
        <td>{!u.isActive ? <Badge kind="no">已停用</Badge> : u.mustChangePassword ? <Badge kind="wait">待改密碼</Badge> : !u.verified ? <Badge kind="wait">email 未驗證</Badge> : <Badge kind="ok">正常</Badge>}
          <div className="sub">{u.lastLoginAt ? "最近登入 " + new Date(u.lastLoginAt).toLocaleDateString("zh-TW") : "尚未登入"}</div></td>
        <td><div className="row"><button className="btn btn-g btn-sm" onClick={() => setEdit(u)}>編輯</button>{u.id !== me?.id && <button className="btn btn-g btn-sm" onClick={() => setReset(u)}>重設密碼</button>}</div></td></tr>)}</Table></>}
    {edit && <Modal title={edit.id ? "編輯帳號" : "建立帳號"} onClose={() => setEdit(null)} wide><UserForm u={edit} onCancel={() => setEdit(null)} onSave={async v => {
      if (edit.id) { await api(`/admin/users/${edit.id}`, { method: "PATCH", body: v }); toast("已儲存"); }
      else { const r = await api<{ tempPassword: string }>("/admin/users", { method: "POST", body: v }); setTemp({ who: String(v.email), pw: r.tempPassword }); }
      setEdit(null); load();
    }} /></Modal>}
    {reset && <Modal title={`重設 ${reset.name} 的密碼？`} onClose={() => setReset(null)}><p>會產生一組臨時密碼，對方用它登入後必須立刻改成新密碼；原本的登入狀態會全部登出。</p>
      <div className="row"><button className="btn btn-p btn-sm" onClick={async () => { try { const r = await api<{ tempPassword: string }>(`/admin/users/${reset.id}/reset-password`, { method: "POST" }); setTemp({ who: reset.email, pw: r.tempPassword }); setReset(null); load(); } catch (x) { toast((x as Error).message); } }}>產生臨時密碼</button><button className="btn btn-g btn-sm" onClick={() => setReset(null)}>取消</button></div></Modal>}
    {temp && <Modal title="臨時密碼" onClose={() => setTemp(null)}><p>帳號 <b>{temp.who}</b> 的臨時密碼如下。這個視窗關掉後就看不到了，請用安全的方式交給對方。</p>
      <pre className="csv" style={{ fontSize: "1.2rem", userSelect: "all" }}>{temp.pw}</pre>
      <div className="row"><button className="btn btn-s btn-sm" onClick={() => navigator.clipboard?.writeText(temp.pw).then(() => toast("已複製"), () => toast("無法存取剪貼簿，請手動選取複製"))}>複製</button><button className="btn btn-g btn-sm" onClick={() => setTemp(null)}>關閉</button></div></Modal>}
  </>;
}

/* ---------------- 操作紀錄 ---------------- */
export function AuditAdmin() {
  const [d, reload, err] = useLoad<{ at: string; user: string; action: string; target: string; detail: string }[]>("/admin/audit");
  return <>
    <H t="操作紀錄" sub="誰在什麼時候改了什麼（最近 300 筆）。"><button className="btn btn-g btn-sm" onClick={reload}>重新整理</button></H>
    {err ? <p className="err">{err}</p> : !d ? <p className="muted">載入中…</p> : <Table head={["時間", "操作者", "動作", "對象", "說明"]}>{d.map((a, i) => <tr key={i}>
      <td className="num small">{new Date(a.at).toLocaleString("zh-TW")}</td><td>{a.user}</td><td><code>{a.action}</code></td><td className="small">{a.target}</td><td className="small">{a.detail}</td></tr>)}</Table>}
  </>;
}
