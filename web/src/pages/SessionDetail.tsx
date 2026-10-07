import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useDemo } from "../demo/store";
import { course, daysTo, elig, JOB, mdw, sess, ST, taken, TODAY } from "../demo/logic";
import { Badge, Icon, Level, Timeline } from "../components/ui";

export default function SessionDetail() {
  const { id = "" } = useParams();
  const { st, me, update, toast } = useDemo();
  const loc = useLocation(), nav = useNavigate();
  const [form, setForm] = useState(false);
  const [err, setErr] = useState("");
  const s = sess(st, id);
  if (!s) return <div className="wrap narrow"><h1 className="h2">找不到這個場次</h1><Link to="/trainings" className="btn btn-t">回到找場次 <Icon n="arrow" /></Link></div>;
  const c = course(st, s.course), e = elig(st, me, s), n = taken(st, s);
  const left = daysTo(s.deadline);
  const loginTo = "/login?next=" + encodeURIComponent(loc.pathname);
  const altLink = e.alt === "otherTrack" ? <Link to="/trainings?course=B" className="btn btn-s btn-full">看其他進階分流</Link>
    : e.alt === "basic" ? <Link to="/trainings?course=A" className="btn btn-s btn-full">先報名初階研習</Link>
    : e.alt === "invite" ? <Link to="/trainings/faq" className="btn btn-s btn-full">講師培訓怎麼推薦？</Link> : null;

  const submit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const idno = String(fd.get("idno") || "").trim().toUpperCase();
    if (!/^[A-Z][1289]\d{8}$/.test(idno)) { setErr("身分證字號格式不對：第 1 碼是英文字母，後面接 9 個數字。"); return; }
    const files = (fd.getAll("files") as File[]).filter(f => f.size || f.name).map(f => f.name);
    update(d => {
      d.regs.push({ id: "r" + Date.now(), user: me!.id, sess: s.id, status: e.full ? "waitlist" : "pending", at: TODAY,
        idm: idno.slice(0, 3) + "****" + idno.slice(-3), meal: String(fd.get("meal")), note: String(fd.get("note") || "").trim(),
        files: c.proof ? (files.length ? files : c.proof.map(p => p + "_研習證明（範例）.pdf")) : undefined });
    });
    setForm(false); setErr(""); toast("報名已送出，審核結果會寄信通知");
  };

  const capBox = <>
    <div><div className="cap"><span>已錄取</span><b className="num">{n} / {s.cap}</b></div><div className="meter"><i style={{ width: Math.min(100, n / s.cap * 100) + "%" }} /></div></div>
    {s.open && left >= 0 && <div className="dl"><Icon n="hour" />報名截止 {mdw(s.deadline)}・{left === 0 ? "今天截止" : `還有 ${left} 天`}</div>}
  </>;
  let box, bar;
  if (e.reg) {
    box = <><div className="rh"><b>你的報名</b><Badge kind={ST[e.reg.status][1]}>{ST[e.reg.status][0]}</Badge></div><Timeline status={e.reg.status} date={mdw(s.date)} /><Link to="/trainings/mine" className="btn btn-s btn-full">查看我的研習</Link></>;
    bar = <><div className="s"><b>{ST[e.reg.status][0]}</b>{e.reg.status === "pending" ? "結果會寄信通知" : mdw(s.date)}</div><Link to="/trainings/mine" className="btn btn-s btn-sm">我的研習</Link></>;
  } else if (!me) {
    box = c.elig === "invite"
      ? <>{capBox}<p className="why">本課程採縣市推薦制。受推薦者會收到邀請信，點信中的連結即可報名。</p><Link to={loginTo} className="btn btn-s btn-full">已收到邀請？登入</Link></>
      : <>{capBox}<Link to={loginTo} className="btn btn-p btn-full primary">登入後報名</Link><p className="center small muted">還沒有帳號？<Link to={loginTo + "&signup=1"}>註冊</Link></p>
        <div className="need"><b>報名資格</b><span>{c.elig === "open" ? "不限資格。" : `需先完成初階研習，且帳號職務為「${JOB[s.track!]}」。`}</span></div></>;
    bar = <><div className="s"><b>名額 {n} / {s.cap}</b>{mdw(s.deadline)} 截止</div><Link to={loginTo} className="btn btn-p btn-sm">{c.elig === "invite" ? "登入" : "登入後報名"}</Link></>;
  } else if (e.ok && form) {
    box = <form className="form" onSubmit={submit}>
      <div className="rh"><b>報名資料</b><Badge kind="can">{e.label}</Badge></div>
      <div className="fld"><span className="lb">報名者</span><span>{me.name}・{me.org}</span></div>
      <div className="fld"><label htmlFor="idno">身分證字號</label><input id="idno" name="idno" autoComplete="off" placeholder="A123456789" required /><span className="help">只用於登錄全教網研習時數。加密保存，登錄完成 90 天後刪除。</span></div>
      {c.proof && <div className="fld"><label htmlFor="files">先修證明（{c.proof.join("、")}）</label><input id="files" name="files" type="file" multiple accept=".pdf,.jpg,.png" /><span className="help">沒有選檔案的話，示範會自動附上範例檔。</span></div>}
      <fieldset className="fld"><legend className="lb">午餐</legend><div className="seg2">{["葷", "素", "不用餐"].map((m, i) => <label key={m}><input type="radio" name="meal" value={m} defaultChecked={i === 0} /><span>{m}</span></label>)}</div></fieldset>
      <div className="fld"><label htmlFor="note">想在研習中解決的資料問題（選填）</label><textarea id="note" name="note" placeholder="例如：學習扶助測驗各班的落差" /></div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn btn-p btn-full primary" type="submit">送出報名</button>
      <button className="btn btn-t center" type="button" onClick={() => setForm(false)}>取消</button>
    </form>;
    bar = <><div className="s"><b>填寫報名資料</b>約 1 分鐘</div><button className="btn btn-p btn-sm" onClick={() => (document.getElementById("idno") as HTMLInputElement | null)?.form?.requestSubmit()}>送出報名</button></>;
  } else if (e.ok) {
    box = <>{capBox}<p className="ok-line"><Icon n="check" />你符合報名資格{e.full ? "（名額已滿，會列為備取）" : ""}</p><button className="btn btn-p btn-full primary" onClick={() => setForm(true)}>{e.full ? "登記備取" : "我要報名"}</button>
      <div className="need"><b>報名時需要</b><span>身分證字號（登錄研習時數用）{c.proof ? "、先修證明" : ""}、午餐選擇</span></div></>;
    bar = <><div className="s"><b>名額 {n} / {s.cap}</b>{mdw(s.deadline)} 截止</div><button className="btn btn-p btn-sm" onClick={() => { setForm(true); setTimeout(() => document.getElementById("idno")?.focus(), 50); }}>我要報名</button></>;
  } else {
    box = <>{capBox}<div className="rh"><b>報名狀態</b><Badge kind={e.kind}>{e.label}</Badge></div>{e.why && <p className="why">{e.why}</p>}{altLink}</>;
    bar = <><div className="s"><b>{e.label}</b>{e.why}</div>{altLink && <button className="btn btn-s btn-sm" onClick={() => nav(e.alt === "otherTrack" ? "/trainings?course=B" : e.alt === "basic" ? "/trainings?course=A" : "/trainings/faq")}>其他做法</button>}</>;
  }

  return (
    <>
      <div className="wrap">
        <div className="crumb top"><Link to="/">首頁</Link>›<Link to="/trainings">研習</Link>›<span>{c.level}{s.track ? "・" + JOB[s.track] + "軌" : ""} {mdw(s.date)}</span></div>
        <div className="dt">
          <div className={"dt-main " + { A: "la", B: "lb", T: "lt" }[s.course]}>
            <Level c={s.course}>{c.level}研習{s.track ? "・" + JOB[s.track] + "軌" : ""}</Level>
            <h1>{c.name}</h1>
            <p className="sub">{c.desc}</p>
            <dl className="facts">
              <div className="fact"><span className="ib"><Icon n="cal" /></span><div><dt>日期</dt><dd>{sessWhenLong(s.date, s.date2)}<small>{s.date2 ? "兩天" : "一天"}</small></dd></div></div>
              <div className="fact"><span className="ib"><Icon n="clock" /></span><div><dt>時間</dt><dd>{s.time}<small>研習時數 {c.hours} 小時</small></dd></div></div>
              <div className="fact"><span className="ib"><Icon n="pin" /></span><div><dt>地點</dt><dd>{s.venue}<small>{s.region}</small></dd></div></div>
              <div className="fact"><span className="ib"><Icon n="users" /></span><div><dt>對象</dt><dd>{c.elig === "open" ? "不限資格" : c.elig === "invite" ? "縣市推薦" : JOB[s.track!]}<small>{c.elig === "track" ? "需先完成初階研習" : c.elig === "invite" ? "先修 " + c.proof!.join("、") : "教師、行政人員皆可"}</small></dd></div></div>
            </dl>
            <div className="acc">
              <details open><summary>課程內容</summary><div className="bd"><ul>{c.content.map(t => <li key={t}>{t}</li>)}</ul></div></details>
              <details><summary>報名資格與方式</summary><div className="bd">{c.elig === "open" ? "不限資格。登入後在本頁報名，承辦審核後寄信通知。" : c.elig === "track" ? `已完成初階研習，且帳號職務為「${JOB[s.track!]}」。登入後在本頁報名，承辦審核後寄信通知。` : "由縣市承辦推薦。被推薦人會收到邀請信，點信中的連結登入或註冊後，即可在本頁報名並上傳先修證明。"}</div></details>
              <details><summary>研習時數與證明</summary><div className="bd">結業後可在「研習 › 我的研習」取得研習證明（附查驗碼），並由計畫登錄全教網研習時數。{s.course === "B" && "結業當下自動開通 AI 輔助分析平台。"}{s.course === "T" && "結訓後繳交公版簡報與試教影片，審查通過取得講師資格（效期 2 年）。"}</div></details>
              <details><summary>交通與注意事項</summary><div className="bd">請提早 15 分鐘報到。{s.course !== "A" && "請攜帶筆電。"}停車與交通資訊會在錄取通知信中提供。</div></details>
            </div>
            <div className="place"><div className="map" aria-hidden="true" /><div className="tx"><b>{s.venue}</b><span className="muted">{s.address}</span>
              <a className="btn btn-t" href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(s.venue + " " + s.address)} target="_blank" rel="noopener">用 Google 地圖開啟 <Icon n="arrow" /></a></div></div>
          </div>
          <aside className="reg" aria-label="報名">{box}</aside>
        </div>
      </div>
      <div className="mbar">{bar}</div>
    </>
  );
}
function sessWhenLong(d: string, d2?: string) {
  const f = (x: string) => x.slice(0, 4) + "/" + mdw(x);
  return f(d) + (d2 ? "、" + mdw(d2) : "");
}
