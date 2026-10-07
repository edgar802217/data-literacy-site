import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useContent } from "../lib/content";
import { useDemo } from "../demo/store";
import { addMail, COUNTIES, has, isAdmin, JOB } from "../demo/logic";
import type { Job } from "../demo/types";
import { Badge, Icon } from "../components/ui";

/* ---------- 最新消息 ---------- */
export function News() {
  const { news, events } = useContent();
  const kinds = Array.from(new Set(news.map(n => n["分類"]).filter(Boolean)));
  const [k, setK] = useState("all");
  return (
    <>
      <div className="phead"><div className="wrap"><div className="crumb"><Link to="/">首頁</Link>›<span>最新消息</span></div><h1>最新消息</h1>
        <div className="chips">{["all", ...kinds].map(x => <button key={x} className="chip" aria-pressed={k === x} onClick={() => setK(x)}>{x === "all" ? "全部" : x}</button>)}</div></div></div>
      <div className="wrap cols-news">
        <ul className="ul big">{news.filter(n => k === "all" || n["分類"] === k).map((n, i) => <li key={i}><time>{n["日期"]}</time><div>{n["分類"] && <span className="k">{n["分類"]}</span>}<b>{n["連結"] ? <a href={n["連結"]} target="_blank" rel="noopener">{n["標題"]}</a> : n["標題"]}</b>{n["內容"] && <p className="muted">{n["內容"]}</p>}</div></li>)}</ul>
        <aside><h2 className="h3">交流活動</h2>{events.map((e, i) => <div className="ev" key={i}><div className="d">{e["日期"].slice(5).replace("-", "/").replace(/^0/, "")}</div><div><b>{e["名稱"]}</b>{e["說明"] && <p className="muted small">{e["說明"]}</p>}</div></div>)}</aside>
      </div>
    </>
  );
}

/* ---------- 關於計畫 ---------- */
export function About() {
  const { settings } = useContent();
  return (
    <>
      <div className="phead"><div className="wrap"><div className="crumb"><Link to="/">首頁</Link>›<span>關於計畫</span></div><h1>關於計畫</h1>
        <p className="sub">給縣市行政人員、校長主任與老師的資料素養研習。學會看懂教育數據、用數據討論問題，再搭配 AI 輔助分析平台實際操作。</p></div></div>
      <div className="wrap about">
        <section><h2 className="h3">計畫目標</h2><ul className="pts"><li><Icon n="check" />建立教育現場看懂、使用數據的共同基礎</li><li><Icon n="check" />依縣市行政、學校行政、教師的工作，用真實資料練習分析與判讀</li><li><Icon n="check" />培育各縣市的種子講師，讓研習能在地延續</li><li><Icon n="check" />提供 AI 輔助分析平台，降低使用數據的門檻</li></ul></section>
        <section><div className="stats">{([["22", "縣市＋國教署", "#1B5FA6"], ["14", "場講師培訓", "#2185B5"], ["10", "場縣市行政研習", "#0E6E7A"], ["59", "項能力指標", "#A9520B"]] as const).map(([n, t, c]) => <div key={t}><b style={{ color: c }}>{n}</b><span>{t}</span></div>)}</div></section>
        <section className="two"><div><h2 className="h3">執行團隊</h2><dl className="kv"><dt>補助單位</dt><dd>教育部</dd><dt>執行單位</dt><dd>國立高雄師範大學</dd><dt>計畫主持人</dt><dd>李文廷 教授</dd></dl></div>
          <div><h2 className="h3">聯絡我們</h2><dl className="kv">{settings["聯絡窗口"] && <><dt>聯絡窗口</dt><dd>{settings["聯絡窗口"]}</dd></>}<dt>電子信箱</dt><dd>{settings["聯絡信箱"] || "（待公告）"}</dd>{settings["聯絡電話"] && <><dt>聯絡電話</dt><dd>{settings["聯絡電話"]}</dd></>}</dl></div></section>
      </div>
    </>
  );
}

/* ---------- 登入／註冊（示範：選帳號即登入） ---------- */
export function Login() {
  const { st, update, toast } = useDemo();
  const [q] = useSearchParams();
  const nav = useNavigate();
  const inv = q.get("invite") ? st.invites.find(i => i.id === q.get("invite") && i.status === "sent") : undefined;
  const [tab, setTab] = useState<"login" | "signup">(inv || q.get("signup") ? "signup" : "login");
  const next = q.get("next") || "/";
  const go = (id: string) => { update(d => { d.cur = id; }); toast("已登入：" + st.users.find(u => u.id === id)!.name); nav(isAdmin(st.users.find(u => u.id === id)) && next === "/" ? "/" : next); };
  const signup = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim().toLowerCase();
    if (st.users.some(u => u.email === email)) { toast("這個 email 已經註冊過，請直接登入"); return; }
    const id = "n" + Date.now();
    update(d => {
      d.users.push({ id, name: String(fd.get("name")).trim(), email, verified: !!inv, job: fd.get("job") as Job, title: "", org: String(fd.get("org")).trim(), county: String(fd.get("county")), roles: ["learner"], persona: "新註冊帳號" });
      d.cur = id;
      if (inv) { const i = d.invites.find(x => x.id === inv.id)!; i.status = "accepted"; i.user = id; d.mails.forEach(m => { if (m.action?.id === inv.id) m.used = true; }); }
      else addMail(d, email, "【教育資料素養提升計畫】請驗證您的 email", "您好：\n請點下方按鈕完成 email 驗證，驗證後即可報名研習。", { type: "verify", id, label: "驗證 email" });
    });
    toast(inv ? "帳號已建立，邀請已接受" : "帳號已建立，驗證信已寄到示範信箱");
    nav(inv ? "/trainings?course=T" : next);
  };
  return (
    <div className="wrap narrow auth">
      <h1>{tab === "login" ? "登入" : inv ? "接受邀請並註冊" : "註冊新帳號"}</h1>
      <div className="tabs2"><button aria-pressed={tab === "login"} onClick={() => setTab("login")}>登入</button><button aria-pressed={tab === "signup"} onClick={() => setTab("signup")}>註冊</button></div>
      {tab === "login" ? <>
        <button className="btn btn-g btn-full" disabled>以教育雲端帳號登入（規劃中）</button>
        <p className="muted small center">示範中不需要密碼，選一個示範帳號登入：</p>
        <div className="people">{st.users.filter(u => u.persona).map(u => <button key={u.id} className="person" onClick={() => go(u.id)}><b>{u.name}</b><span>{u.persona}</span></button>)}</div>
      </> : <form className="form" onSubmit={signup}>
        {inv && <p className="banner small"><span><b>{inv.county}</b>推薦你參加講師培訓。email 由邀請連結帶入，視為已驗證。</span></p>}
        <div className="fgrid"><div className="fld"><label htmlFor="s-name">姓名</label><input id="s-name" name="name" required defaultValue={inv?.name} /></div>
          <div className="fld"><label htmlFor="s-email">Email</label><input id="s-email" name="email" type="email" required defaultValue={inv?.email} readOnly={!!inv} placeholder="name@school.edu.tw" /></div></div>
        <fieldset className="fld"><legend className="lb">職務</legend><div className="seg2">{(Object.keys(JOB) as Job[]).map((k, i) => <label key={k}><input type="radio" name="job" value={k} defaultChecked={i === (inv ? 1 : 0)} /><span>{JOB[k]}</span></label>)}</div><span className="help">決定你可以報名哪一個進階分流。</span></fieldset>
        <div className="fgrid"><div className="fld"><label htmlFor="s-org">服務單位</label><input id="s-org" name="org" required defaultValue={inv?.org} /></div>
          <div className="fld"><label htmlFor="s-county">縣市</label><select id="s-county" name="county" defaultValue={inv?.county || "高雄市"}>{COUNTIES.map(c => <option key={c}>{c}</option>)}</select></div></div>
        <div className="fld"><label htmlFor="s-pw">密碼</label><input id="s-pw" name="pw" type="password" minLength={12} required placeholder="至少 12 個字元" /></div>
        <button className="btn btn-p btn-full" type="submit">{inv ? "註冊並接受邀請" : "註冊"}</button>
      </form>}
    </div>
  );
}

/* ---------- 個人資料 ---------- */
export function Account() {
  const { me, update, toast } = useDemo();
  if (!me) return <div className="wrap narrow"><h1 className="h2">請先登入</h1><Link to="/login?next=/account" className="btn btn-p">登入</Link></div>;
  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const old = me.job;
    update(d => { const u = d.users.find(x => x.id === me.id)!; u.name = String(fd.get("name")).trim(); u.title = String(fd.get("title")).trim(); u.org = String(fd.get("org")).trim(); if (fd.get("job")) u.job = fd.get("job") as Job; });
    toast(fd.get("job") && fd.get("job") !== old ? "已儲存。職務已變更，可報名的進階分流也會跟著變。" : "已儲存");
  };
  return (
    <div className="wrap narrow">
      <div className="crumb top"><Link to="/">首頁</Link>›<span>個人資料</span></div>
      <h1 className="h2">個人資料</h1>
      <form className="form panel" onSubmit={save}>
        <div className="fgrid"><div className="fld"><label htmlFor="p-name">姓名</label><input id="p-name" name="name" defaultValue={me.name} required /></div>
          <div className="fld"><span className="lb">Email</span><div className="row"><span>{me.email}</span>{me.verified ? <Badge kind="ok">已驗證</Badge> : <Badge kind="wait">未驗證</Badge>}</div></div></div>
        {has(me, "learner") && <fieldset className="fld"><legend className="lb">職務</legend><div className="seg2">{(Object.keys(JOB) as Job[]).map(k => <label key={k}><input type="radio" name="job" value={k} defaultChecked={me.job === k} /><span>{JOB[k]}</span></label>)}</div><span className="help">決定你能報哪一個進階分流；變更後，承辦會在報名審核時確認。</span></fieldset>}
        <div className="fgrid"><div className="fld"><label htmlFor="p-title">職稱</label><input id="p-title" name="title" defaultValue={me.title} /></div>
          <div className="fld"><label htmlFor="p-org">服務單位</label><input id="p-org" name="org" defaultValue={me.org} /></div></div>
        <div><button className="btn btn-p" type="submit">儲存</button></div>
      </form>
      <div className="panel tint"><b>教育雲端帳號</b><div className="row"><span className="muted small">尚未綁定。綁定後可以用教育雲端帳號直接登入。</span><button className="btn btn-g btn-sm" disabled>綁定（規劃中）</button></div></div>
    </div>
  );
}
