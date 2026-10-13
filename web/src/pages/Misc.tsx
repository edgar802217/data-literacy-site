import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useContent } from "../lib/content";
import { useDemo } from "../demo/store";
import { addMail, COUNTIES, has, isAdmin, JOB } from "../demo/logic";
import type { Job } from "../demo/types";
import { Badge } from "../components/ui";
import { Stage, useSea } from "../shell/Shell";

/* ---------- 最新消息 ---------- */
export function News() {
  const { news, events } = useContent();
  const kinds = Array.from(new Set(news.map(n => n["分類"]).filter(Boolean)));
  const [k, setK] = useState("all");
  const dd = (d: string) => (d || "").slice(5).replace("-", ".");
  return (
    <>
      <Stage eyebrow="最新消息" doc="最新消息" title="最新消息" lead="研習公告與計畫活動。" cap="亮起的是消息與活動的日期。" focus={[...news.slice(0, 6), ...events].map(n => dd(n["日期"]))}>
        <Link className="sh-back" to="/">← 回首頁</Link>
      </Stage>
      {kinds.length > 0 && <div className="pg-chips" role="group" aria-label="分類">{["all", ...kinds].map(x => <button key={x} type="button" className="pg-chip" aria-pressed={k === x} onClick={() => setK(x)}>{x === "all" ? "全部" : x}</button>)}</div>}
      <ul className="pg-news">{news.filter(n => k === "all" || n["分類"] === k).map((n, i) => <li key={i}><time>{dd(n["日期"])}</time><div>
        {n["分類"] && <span className="kd">{n["分類"]}</span>}<b>{n["連結"] ? <a href={n["連結"]} target="_blank" rel="noopener">{n["標題"]}</a> : n["標題"]}</b>{n["內容"] && <p>{n["內容"]}</p>}</div></li>)}</ul>
      {events.length > 0 && <><h2 className="pg-sec">交流活動</h2>
        <ul className="pg-news">{events.map((e, i) => <li key={i}><time>{dd(e["日期"])}</time><div><b>{e["名稱"]}</b>{e["說明"] && <p>{e["說明"]}</p>}</div></li>)}</ul></>}
    </>
  );
}

/* ---------- 關於計畫（依 115 年下半年培訓簡章） ---------- */
const ARCH: [string, string, string, string, string, boolean?][] = [
  ["基礎課程", "B6.", "教育資料素養工作坊", "基礎教育資料素養：教育資料理解與識讀", "3 小時"],
  ["進階課程", "B6-1.", "教育資料實務應用工作坊（縣市行政）", "行政決策應用與資料整合實作；AI 協作資料判讀與實務應用", "6 小時", true],
  ["進階課程", "B6-2.", "教育資料實務應用工作坊（學校行政）", "校務決策應用與科技領導實作；AI 協作資料判讀與實務應用", "6 小時", true],
  ["進階課程", "B6-3.", "教育資料實務應用工作坊（學校教師）", "資料識別判讀與教學應用實作；AI 協作資料判讀與實務應用", "6 小時", true],
  ["講師培訓", "G1.", "教育資料實務應用（學校行政）講師培訓工作坊", "培育 B6-2. 講師：校務決策、科技領導案例與 AI 協作應用", "9 小時"],
  ["講師培訓", "G2.", "教育資料實務應用（學校教師）講師培訓工作坊", "培育 B6-3. 講師：教學應用案例與 AI 協作課務資料判讀", "9 小時", true],
];
export function About() {
  const { settings } = useContent();
  const { setRow } = useSea();
  const figs = [["4", "區培訓：北、中、南、東"], ["12", "小時：B6.＋G1. 兩天"], ["2", "年：講師資格效期"], ["22", "縣市＋國教署推動辦公室"]];
  return (
    <>
      <Stage eyebrow="關於計畫" doc="關於計畫" title="提升教育人員的資料素養" lead="不只看懂數據，也能應用數據。教育部資訊及科技教育司指導，國立高雄師範大學承辦。"
        cap="亮起的是 115 年下半年培訓的關鍵數字。指到右邊的數字，左邊對應的數字會放大。" focus={figs.map(f => f[0])}>
        <Link className="sh-back" to="/">← 回首頁</Link>
      </Stage>
      <h2 className="pg-sec">計畫目的</h2>
      <ul className="pg-goals">
        <li>落實「教育資料素養提升計畫」推動目標，提升教育人員的教育資料素養及實務應用能力。</li>
        <li>培育 116 年起由各縣市及國教署數位學習推動辦公室辦理「B6-2. 教育資料實務應用工作坊（學校行政）」所需的種子講師，各推動辦公室至少培育 1 位，建立自主辦理培訓的量能。</li>
        <li>協助校長及主任透過分析校務資料，掌握學生學習與學校發展情況，並依分析結果支持校務治理與決策。</li>
      </ul>
      <h2 className="pg-sec">培訓架構</h2>
      <div className="pg-arch">{ARCH.map(([cat, code, name, focus, h, fut]) => <div key={code} className={fut ? "fut" : undefined}>
        <span className="c">{cat}</span><code>{code}</code><span>{name}{fut ? "（116 年起）" : ""}<small>{focus}</small></span><span className="h">{h}</span></div>)}</div>
      <p className="pg-note">115 年下半年開設 B6. 與 G1.；參加 G1. 的人員須同時參加 B6.。</p>
      <h2 className="pg-sec">培訓數字</h2>
      <div className="pg-figs">{figs.map(([n, t]) => <button type="button" key={n} onPointerEnter={() => setRow([n])} onPointerLeave={() => setRow(null)} onFocus={() => setRow([n])} onBlur={() => setRow(null)}><b>{n}</b><span>{t}</span></button>)}</div>
      <h2 className="pg-sec">辦理單位與聯絡</h2>
      <dl className="pg-kv">
        <dt>指導單位</dt><dd>教育部資訊及科技教育司</dd><dt>承辦單位</dt><dd>國立高雄師範大學</dd><dt>計畫主持人</dt><dd>李文廷 教授</dd>
        <dt>依據</dt><dd>教育部「教育資料素養提升計畫」核定函（臺教資(三)字第1152702590號）</dd>
        <dt>一般業務信箱</dt><dd>{settings["聯絡信箱"] || "edl.office@tlkr.nknu.edu.tw"}</dd>
        <dt>培訓專用信箱</dt><dd>edl.office+training@tlkr.nknu.edu.tw</dd>
        <dt>電話</dt><dd>{settings["聯絡電話"] || "07-7172930 分機 7028"}</dd>
      </dl>
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
    nav(inv ? "/trainings?course=" + inv.course : next);
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
        {inv && <p className="banner small"><span><b>{inv.county}</b>推動辦公室推薦你參加「{st.courses.find(c => c.id === inv.course)?.code} {st.courses.find(c => c.id === inv.course)?.name}」。email 由報名連結帶入，視為已驗證。</span></p>}
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
