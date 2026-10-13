/* 正式模式的帳號頁面：登入、註冊、忘記密碼、重設密碼、email 驗證、修改密碼、個人資料。 */
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDemo, type ApiUser } from "../demo/store";
import { COUNTIES, has, JOB } from "../demo/logic";
import type { Job } from "../demo/types";
import { api, passwordProblems } from "../lib/api";
import { Badge } from "../components/ui";

const form = (e: FormEvent<HTMLFormElement>) => Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;

/** 密碼欄位：輸入時即時列出還缺哪些條件 */
function PasswordField({ id, label, name = "password", autoComplete = "new-password" }: { id: string; label: string; name?: string; autoComplete?: string }) {
  const [v, setV] = useState("");
  const p = v ? passwordProblems(v) : [];
  return <div className="fld">
    <label htmlFor={id}>{label}</label>
    <input id={id} name={name} type="password" required autoComplete={autoComplete} value={v} onChange={e => setV(e.target.value)} aria-describedby={id + "-h"} />
    <span className="help" id={id + "-h"} aria-live="polite">{!v ? "至少 8 個字元，含小寫與大寫英文字母；不能有 6 位連續或重複的數字（如 000000、123456）。" : p.length ? "還需要：" + p.join("、") : "符合密碼規則。"}</span>
  </div>;
}
function Err({ msg }: { msg: string }) { return msg ? <p className="err" role="alert">{msg}</p> : null; }

export function LiveLogin() {
  const { setMe, toast } = useDemo();
  const [q] = useSearchParams();
  const nav = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">(q.get("signup") ? "signup" : "login");
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const next = q.get("next") || "/";
  const done = (u: ApiUser, msg: string) => {
    setMe(u); toast(msg);
    nav(u.mustChangePassword ? "/account/password?first=1" : next, { replace: true });
  };
  const login = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = form(e); setErr(""); setBusy(true);
    try { done(await api<ApiUser>("/auth/login", { method: "POST", body: { email: f.email, password: f.password } }), "已登入"); }
    catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };
  const signup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = form(e); setErr("");
    const p = passwordProblems(f.password); if (p.length) { setErr("密碼還需要：" + p.join("、")); return; }
    setBusy(true);
    try { done(await api<ApiUser>("/auth/register", { method: "POST", body: { email: f.email, name: f.name, password: f.password, job: f.job, org: f.org, county: f.county, title: f.title } }), "帳號已建立，驗證信已寄出"); }
    catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="wrap narrow auth">
      <h1>{tab === "login" ? "登入" : "註冊新帳號"}</h1>
      <div className="tabs2"><button aria-pressed={tab === "login"} onClick={() => { setTab("login"); setErr(""); }}>登入</button><button aria-pressed={tab === "signup"} onClick={() => { setTab("signup"); setErr(""); }}>註冊</button></div>
      {tab === "login" ? <form className="form" onSubmit={login}>
        <div className="fld"><label htmlFor="l-email">帳號（email）</label><input id="l-email" name="email" required autoComplete="username" /></div>
        <div className="fld"><label htmlFor="l-pw">密碼</label><input id="l-pw" name="password" type="password" required autoComplete="current-password" /></div>
        <Err msg={err} />
        <button className="btn btn-p btn-full" type="submit" disabled={busy}>{busy ? "登入中…" : "登入"}</button>
        <p className="small center"><Link to="/forgot-password">忘記密碼？</Link></p>
        <button type="button" className="btn btn-g btn-full" disabled>以教育雲端帳號登入（規劃中）</button>
      </form> : <form className="form" onSubmit={signup}>
        <div className="fgrid"><div className="fld"><label htmlFor="s-name">姓名</label><input id="s-name" name="name" required autoComplete="name" /></div>
          <div className="fld"><label htmlFor="s-email">Email</label><input id="s-email" name="email" type="email" required autoComplete="email" placeholder="name@school.edu.tw" /></div></div>
        <fieldset className="fld"><legend className="lb">職務</legend><div className="seg2">{(Object.keys(JOB) as Job[]).map((k, i) => <label key={k}><input type="radio" name="job" value={k} defaultChecked={i === 0} /><span>{JOB[k]}</span></label>)}</div><span className="help">決定你可以報名哪一個進階分流。</span></fieldset>
        <div className="fgrid"><div className="fld"><label htmlFor="s-org">服務單位</label><input id="s-org" name="org" required autoComplete="organization" /></div>
          <div className="fld"><label htmlFor="s-county">縣市</label><select id="s-county" name="county" defaultValue="高雄市">{[...COUNTIES, "國教署"].map(c => <option key={c}>{c}</option>)}</select></div></div>
        <div className="fld"><label htmlFor="s-title">職稱（選填）</label><input id="s-title" name="title" autoComplete="organization-title" /></div>
        <PasswordField id="s-pw" label="密碼" />
        <Err msg={err} />
        <button className="btn btn-p btn-full" type="submit" disabled={busy}>{busy ? "建立中…" : "註冊"}</button>
        <p className="small muted center">註冊後會寄驗證信到你的 email，驗證後才能報名研習。</p>
      </form>}
    </div>
  );
}

export function ForgotPassword() {
  const [sent, setSent] = useState(false), [err, setErr] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setErr("");
    try { await api("/auth/forgot", { method: "POST", body: { email: form(e).email } }); setSent(true); } catch (x) { setErr((x as Error).message); }
  };
  return <div className="wrap narrow auth"><h1>忘記密碼</h1>
    {sent ? <p>如果這個 email 有註冊帳號，我們已經寄出重設密碼的連結，請在 1 小時內點開。沒收到的話，請檢查垃圾郵件匣，或聯絡計畫辦公室。</p>
      : <form className="form" onSubmit={submit}>
        <div className="fld"><label htmlFor="f-email">註冊時的 email</label><input id="f-email" name="email" type="email" required autoComplete="email" /></div>
        <Err msg={err} /><button className="btn btn-p btn-full" type="submit">寄送重設連結</button>
        <p className="small muted">由管理者建立、還沒有 email 的帳號，請請系統管理者重設密碼。</p></form>}
    <p className="small center"><Link to="/login">回到登入</Link></p></div>;
}

export function ResetPassword() {
  const [q] = useSearchParams();
  const [ok, setOk] = useState(false), [err, setErr] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setErr("");
    const f = form(e); if (f.password !== f.password2) { setErr("兩次輸入的密碼不一樣"); return; }
    try { await api("/auth/reset", { method: "POST", body: { token: q.get("token") || "", password: f.password } }); setOk(true); } catch (x) { setErr((x as Error).message); }
  };
  return <div className="wrap narrow auth"><h1>設定新密碼</h1>
    {ok ? <><p>密碼已更新，請用新密碼登入。</p><Link className="btn btn-p btn-full" to="/login">登入</Link></>
      : <form className="form" onSubmit={submit}>
        <PasswordField id="r-pw" label="新密碼" />
        <div className="fld"><label htmlFor="r-pw2">再輸入一次</label><input id="r-pw2" name="password2" type="password" required autoComplete="new-password" /></div>
        <Err msg={err} /><button className="btn btn-p btn-full" type="submit">更新密碼</button></form>}</div>;
}

export function VerifyEmail() {
  const [q] = useSearchParams();
  const { me, setMe } = useDemo();
  const [state, setState] = useState<"busy" | "ok" | "bad">("busy"), [msg, setMsg] = useState("");
  useEffect(() => {
    api("/auth/verify", { method: "POST", body: { token: q.get("token") || "" } })
      .then(() => { setState("ok"); return api<{ user: ApiUser | null }>("/auth/me").then(r => setMe(r.user)); })
      .catch(x => { setState("bad"); setMsg((x as Error).message); });
  }, [q, setMe]);
  return <div className="wrap narrow auth"><h1>email 驗證</h1>
    {state === "busy" ? <p>驗證中…</p> : state === "ok" ? <><p>email 已驗證，現在可以報名研習了。</p><Link className="btn btn-p btn-full" to="/trainings">去找研習</Link></>
      : <><p className="err">{msg}</p>{me ? <Link className="btn btn-s btn-full" to="/account">到個人資料重新寄送驗證信</Link> : <Link className="btn btn-s btn-full" to="/login?next=/account">登入後重新寄送</Link>}</>}</div>;
}

export function ChangePassword() {
  const { me, setMe, toast } = useDemo();
  const [q] = useSearchParams();
  const nav = useNavigate();
  const [err, setErr] = useState("");
  if (!me) return <div className="wrap narrow"><h1 className="h2">請先登入</h1><Link to="/login?next=/account/password" className="btn btn-p">登入</Link></div>;
  const first = q.get("first") || me.mustChangePassword;
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setErr("");
    const f = form(e); if (f.password !== f.password2) { setErr("兩次輸入的新密碼不一樣"); return; }
    try { setMe(await api<ApiUser>("/auth/change-password", { method: "POST", body: { current: f.current, password: f.password } })); toast("密碼已更新"); nav(first ? "/" : "/account", { replace: true }); }
    catch (x) { setErr((x as Error).message); }
  };
  return <div className="wrap narrow auth"><h1>{first ? "請先設定你的密碼" : "修改密碼"}</h1>
    {first && <p className="muted">這是管理者建立或重設的臨時密碼，請改成只有你知道的密碼後再繼續。</p>}
    <form className="form" onSubmit={submit}>
      <div className="fld"><label htmlFor="c-cur">{first ? "臨時密碼" : "目前的密碼"}</label><input id="c-cur" name="current" type="password" required autoComplete="current-password" /></div>
      <PasswordField id="c-pw" label="新密碼" />
      <div className="fld"><label htmlFor="c-pw2">再輸入一次新密碼</label><input id="c-pw2" name="password2" type="password" required autoComplete="new-password" /></div>
      <Err msg={err} /><button className="btn btn-p btn-full" type="submit">更新密碼</button>
    </form></div>;
}

export function LiveAccount() {
  const { me, setMe, toast } = useDemo();
  const [err, setErr] = useState("");
  if (!me) return <div className="wrap narrow"><h1 className="h2">請先登入</h1><Link to="/login?next=/account" className="btn btn-p">登入</Link></div>;
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setErr(""); const f = form(e);
    try { setMe(await api<ApiUser>("/auth/me", { method: "PATCH", body: { name: f.name, title: f.title, org: f.org, county: f.county, job: f.job || me.job } })); toast("已儲存"); }
    catch (x) { setErr((x as Error).message); }
  };
  const resend = async () => { try { await api("/auth/resend-verify", { method: "POST" }); toast("驗證信已重新寄出"); } catch (x) { toast((x as Error).message); } };
  return (
    <div className="wrap narrow">
      <div className="crumb top"><Link to="/">首頁</Link>›<span>個人資料</span></div>
      <h1 className="h2">個人資料</h1>
      <form className="form panel" onSubmit={save}>
        <div className="fgrid"><div className="fld"><label htmlFor="p-name">姓名</label><input id="p-name" name="name" defaultValue={me.name} required /></div>
          <div className="fld"><span className="lb">帳號（email）</span><div className="row"><span>{me.email}</span>{me.verified ? <Badge kind="ok">已驗證</Badge> : <><Badge kind="wait">未驗證</Badge><button type="button" className="btn btn-t btn-sm" onClick={resend}>重寄驗證信</button></>}</div></div></div>
        {has(me, "learner") && <fieldset className="fld"><legend className="lb">職務</legend><div className="seg2">{(Object.keys(JOB) as Job[]).map(k => <label key={k}><input type="radio" name="job" value={k} defaultChecked={me.job === k} /><span>{JOB[k]}</span></label>)}</div><span className="help">決定你能報哪一個進階分流。</span></fieldset>}
        <div className="fgrid"><div className="fld"><label htmlFor="p-title">職稱</label><input id="p-title" name="title" defaultValue={me.title} /></div>
          <div className="fld"><label htmlFor="p-org">服務單位</label><input id="p-org" name="org" defaultValue={me.org} /></div></div>
        <div className="fld"><label htmlFor="p-county">縣市</label><select id="p-county" name="county" defaultValue={me.county || ""}><option value="">（未填）</option>{[...COUNTIES, "國教署"].map(c => <option key={c}>{c}</option>)}</select></div>
        <Err msg={err} />
        <div className="row"><button className="btn btn-p" type="submit">儲存</button><Link className="btn btn-g" to="/account/password">修改密碼</Link></div>
      </form>
      <div className="panel tint"><b>教育雲端帳號</b><div className="row"><span className="muted small">尚未綁定。綁定後可以用教育雲端帳號直接登入。</span><button className="btn btn-g btn-sm" disabled>綁定（規劃中）</button></div></div>
    </div>
  );
}
