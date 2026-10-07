import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDemo } from "../demo/store";
import { has, isAdmin } from "../demo/logic";
import { useContent } from "../lib/content";
import { Icon, Modal } from "./ui";
import type { State } from "../demo/types";

/* ---------- 示範列：切換身分、示範信箱、重設（正式版不會有） ---------- */
function bindInvite(d: State, inviteId: string, userId: string) {
  const i = d.invites.find(x => x.id === inviteId)!;
  i.status = "accepted"; i.user = userId;
  d.mails.forEach(m => { if (m.action?.id === inviteId) m.used = true; });
}
function DemoBar() {
  const { st, me, update, reset, toast } = useDemo();
  const nav = useNavigate();
  const [box, setBox] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [bind, setBind] = useState<string | null>(null);
  const personas = st.users.filter(u => u.persona);
  const openMail = (id: string) => {
    const m = st.mails.find(x => x.id === id)!;
    if (m.action?.type === "verify") {
      update(d => { const u = d.users.find(x => x.id === m.action!.id)!; u.verified = true; d.cur = u.id; d.mails.find(x => x.id === id)!.used = true; });
      setBox(false); toast("email 已驗證，現在可以報名研習了");
    } else if (m.action?.type === "invite") {
      setBox(false);
      if (me && has(me, "learner")) setBind(m.action.id);
      else nav("/login?invite=" + m.action.id);
    }
  };
  const inv = bind ? st.invites.find(i => i.id === bind) : undefined;
  return (
    <div className="demobar">
      <div className="in">
        <span className="demotag">示範</span>
        <label htmlFor="persona">目前身分</label>
        <select id="persona" value={st.cur || ""} onChange={e => { const v = e.target.value || null; update(d => { d.cur = v; }); }}>
          <option value="">訪客（未登入）</option>
          {personas.map(u => <option key={u.id} value={u.id}>{u.name}｜{u.persona}</option>)}
        </select>
        <span className="sp" />
        <button className="dbtn" onClick={() => setBox(true)}><Icon n="mail" />示範信箱<span className="cnt">{st.mails.length}</span></button>
        <button className="dbtn" onClick={() => setConfirmReset(true)}>重設示範資料</button>
      </div>
      <div className="hint"><b>試試看：</b>{me ? me.hint || "新帳號要先驗證 email 才能報名。" : "按右上角「登入」選一個示範帳號，或註冊新帳號。首頁、研習與分析平台會依登入身分改變。"}</div>
      {box && <Modal title="示範信箱" onClose={() => setBox(false)} wide>
        <p className="muted small">系統在示範中寄出的所有信件。正式版會真的寄到對方信箱。</p>
        {st.mails.length ? st.mails.map(m => <div className="mail" key={m.id}>
          <div className="mh"><span>寄給 {m.to}</span><span>{m.date}</span></div>
          <b>{m.subject}</b><div className="bd">{m.body}</div>
          {m.action && (m.used ? <span className="bdg no">連結已使用</span> : <button className="btn btn-p btn-sm" onClick={() => openMail(m.id)}>{m.action.label}</button>)}
        </div>) : <p className="muted">沒有信件。</p>}
      </Modal>}
      {inv && me && <Modal title="把邀請綁到目前的帳號？" onClose={() => setBind(null)}>
        <dl className="kv"><dt>邀請寄送的信箱</dt><dd>{inv.email}</dd><dt>目前登入的帳號</dt><dd>{me.name}・{me.email}</dd></dl>
        {inv.email !== me.email && <p className="small">兩個 email 不同沒關係：能點開這封信，就代表你收得到學校信箱。綁定後，推薦資格會掛在目前這個帳號上。</p>}
        <div className="row"><button className="btn btn-p btn-sm" onClick={() => { update(d => bindInvite(d, inv.id, me.id)); setBind(null); toast("已接受邀請，現在可以報名講師培訓了"); nav("/trainings?course=T"); }}>接受並綁定</button><button className="btn btn-g btn-sm" onClick={() => setBind(null)}>取消</button></div>
      </Modal>}
      {confirmReset && <Modal title="重設示範資料？" onClose={() => setConfirmReset(false)}>
        <p>所有操作（新註冊的帳號、報名、審核結果）都會清除，回到初始狀態。</p>
        <div className="row"><button className="btn btn-d btn-sm" onClick={() => { reset(); setConfirmReset(false); toast("已重設示範資料"); nav("/"); }}>重設</button><button className="btn btn-g btn-sm" onClick={() => setConfirmReset(false)}>取消</button></div>
      </Modal>}
    </div>
  );
}
export { bindInvite };

/* ---------- 頁首 ---------- */
const NAV = [["/trainings", "研習"], ["/platform", "分析平台"], ["/news", "最新消息"], ["/about", "關於計畫"]] as const;
function Header() {
  const { me, update, toast } = useDemo();
  const [menu, setMenu] = useState(false);
  const [mnav, setMnav] = useState(false);
  const loc = useLocation(), nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setMenu(false); setMnav(false); }, [loc.pathname]);
  useEffect(() => {
    if (!menu) return;
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(false); };
    addEventListener("click", off); return () => removeEventListener("click", off);
  }, [menu]);
  return (
    <header className="nav">
      <div className="wrap">
        <Link to="/" className="brand"><img src={import.meta.env.BASE_URL + "logo.png"} alt="" /><span>教育資料素養提升計畫<small>教育部補助｜國立高雄師範大學執行</small></span></Link>
        <nav className="menu-l" aria-label="主選單">{NAV.map(([to, t]) => <NavLink key={to} to={to}>{t}</NavLink>)}</nav>
        {me ? <div className="acct" ref={ref}>
          <button className="me" aria-expanded={menu} onClick={() => setMenu(!menu)}><i>{me.name[0]}</i><span>{me.name}</span></button>
          {menu && <div className="menu">
            <div className="mh"><b>{me.name}</b><span>{me.org}</span></div>
            {has(me, "learner") && <Link to="/trainings/mine">我的研習</Link>}
            <Link to="/account">個人資料</Link>
            {isAdmin(me) && <Link to="/admin" className="strong">後台 →</Link>}
            <hr />
            <button onClick={() => { update(d => { d.cur = null; }); toast("已登出"); nav("/"); }}><Icon n="out" />登出</button>
          </div>}
        </div> : <Link to={"/login?next=" + encodeURIComponent(loc.pathname + loc.search)} className="btn btn-s btn-sm login">登入</Link>}
        <button className="ham" aria-label="選單" aria-expanded={mnav} onClick={() => setMnav(!mnav)}><Icon n={mnav ? "close" : "menu"} /></button>
      </div>
      {mnav && <nav className="mnav">{NAV.map(([to, t]) => <NavLink key={to} to={to}>{t}</NavLink>)}</nav>}
    </header>
  );
}

/* ---------- 重要公告：試算表「設定」的「重要公告」有內容才顯示 ---------- */
function Announcement() {
  const { settings } = useContent();
  // 試算表沒有這一列時，示範版顯示一則範例；有這一列但留白就不顯示
  const text = "重要公告" in settings ? settings["重要公告"] : "進階研習（學校行政軌）11/7 中區場次，報名至 10/28（三）截止。";
  const link = settings["重要公告連結"] || ("重要公告" in settings ? "" : "/trainings/B1");
  const [hide, setHide] = useState(false);
  if (!text || hide) return null;
  return <div className="notice"><div className="wrap"><Icon n="bell" /><span>{text}</span>{link && (link.startsWith("/") ? <Link to={link}>看詳情</Link> : <a href={link} target="_blank" rel="noopener">看詳情</a>)}<button className="iconbtn" aria-label="關閉公告" onClick={() => setHide(true)}><Icon n="close" /></button></div></div>;
}

function Footer() {
  const { settings } = useContent();
  return (
    <footer className="foot">
      <div className="wrap">
        <div><div className="fb"><img src={import.meta.env.BASE_URL + "logo.png"} alt="" /><b>教育資料素養提升計畫</b></div><p>數據治理．決策有理</p></div>
        <div className="links"><b>研習</b><Link to="/trainings">找場次</Link><Link to="/trainings/verify">研習證明查驗</Link><Link to="/trainings/faq">常見問題</Link></div>
        <div><b>計畫</b><p>補助單位：教育部<br />執行單位：國立高雄師範大學<br />計畫主持人：李文廷 教授</p>
          {settings["聯絡信箱"] && <p>聯絡信箱：{settings["聯絡信箱"]}</p>}</div>
      </div>
    </footer>
  );
}

export function Layout() {
  const { toastMsg } = useDemo();
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <>
      <DemoBar />
      <Header />
      {loc.pathname === "/" && <Announcement />}
      <main id="main"><Outlet /></main>
      <Footer />
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </>
  );
}
