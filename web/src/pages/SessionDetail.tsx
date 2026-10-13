import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useDemo } from "../demo/store";
import { course, elig, JOB, kindOf, levelName, mdw, sess, ST, titleOf, TODAY } from "../demo/logic";
import { dot, Stage } from "../shell/Shell";
import { JudgeLink, JudgeView } from "../shell/sessions";
import { lastDetail } from "../shell/vt";
import { LIVE } from "../lib/api";

/* 場次詳情：左欄是大字日期（從列表飛過來），右欄是課程、逐條資格判讀與報名。 */
const COL = { A: "var(--lv-a-tx)", B: "var(--lv-b-tx)", T: "var(--lv-t-tx)" } as const;

export default function SessionDetail() {
  const { id = "" } = useParams();
  const { st, me, update, toast } = useDemo();
  const loc = useLocation();
  const [form, setForm] = useState(false);
  const [err, setErr] = useState("");
  const [run, setRun] = useState(false);
  const s = sess(st, id);
  useEffect(() => {
    lastDetail.id = s ? s.id : null; setForm(false); setRun(false);
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setRun(true)));
    return () => cancelAnimationFrame(r);
  }, [s]);
  if (!s) return <>
    <Stage eyebrow="場次詳情" doc="找不到場次" title="找不到這個場次" cap="" focus={[]} />
    <p className="pg-text">這個場次可能已經下架。</p><Link className="pg-link" to="/trainings">回到找場次</Link>
  </>;
  const c = course(st, s.course), e = elig(st, me, s);
  const loginTo = "/login?next=" + encodeURIComponent(loc.pathname);
  const city = s.address.slice(0, 3) || s.region;

  const submit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const idno = String(fd.get("idno") || "").trim().toUpperCase();
    if (!/^[A-Z][1289]\d{8}$/.test(idno)) { setErr("身分證字號格式不對：第 1 碼是英文字母，後面接 9 個數字。"); document.getElementById("idno")?.focus(); return; }
    const files = (fd.getAll("files") as File[]).filter(f => f.size || f.name).map(f => f.name);
    update(d => {
      d.regs.push({ id: "r" + Date.now(), user: me!.id, sess: s.id, status: e.full ? "waitlist" : "pending", at: TODAY,
        idm: idno.slice(0, 3) + "****" + idno.slice(-3), meal: String(fd.get("meal")), note: String(fd.get("note") || "").trim(),
        files: c.proof ? (files.length ? files : c.proof.map(p => p + "_研習證明（範例）.pdf")) : undefined });
    });
    setForm(false); setErr(""); toast("報名已送出，審核結果會寄信通知");
  };

  /* 判讀框下方的動作：依狀態只給一個主要動作 */
  let action;
  if (e.reg) action = <div className="pg-btnline"><Link to="/trainings/mine" className="pg-btn pg-line">查看我的研習</Link></div>;
  else if (!me) action = c.elig === "invite"
    ? <div className="pg-btnline"><Link to={loginTo} className="pg-btn pg-line">已收到報名連結？登入</Link><Link to="/trainings/faq" className="pg-tlink">報名方式</Link></div>
    : <div className="pg-btnline"><Link to={loginTo} className="pg-btn">登入後報名</Link><Link to={loginTo + "&signup=1"} className="pg-tlink">還沒有帳號？註冊</Link></div>;
  else if (e.ok && form) action = <form className="pg-form" onSubmit={submit} noValidate>
    <div className="pg-field"><span><b>報名者</b>　{me.name}・{me.org}</span></div>
    <div className="pg-field"><label htmlFor="idno">身分證字號</label><input id="idno" name="idno" autoComplete="off" placeholder="A123456789" aria-describedby="idno-h idno-e" aria-invalid={!!err} />
      <span className="help" id="idno-h">只用於登錄全教網研習時數。加密保存，登錄完成 90 天後刪除。</span>{err && <p className="err" id="idno-e" role="alert">{err}</p>}</div>
    {c.proof && <div className="pg-field"><label htmlFor="files">先修證明（{c.proof.join("、")}）</label><input id="files" name="files" type="file" multiple accept=".pdf,.jpg,.png" /><span className="help">沒有選檔案的話，示範會自動附上範例檔。</span></div>}
    <fieldset className="pg-field"><legend>午餐</legend><div className="pg-radios">{["葷", "素", "不用餐"].map((m, i) => <label key={m}><input type="radio" name="meal" value={m} defaultChecked={i === 0} />{m}</label>)}</div></fieldset>
    <div className="pg-field"><label htmlFor="note">想在研習中解決的資料問題（選填）</label><textarea id="note" name="note" placeholder="例如：學習扶助測驗各班的落差" /></div>
    <div className="pg-btnline" style={{ marginTop: 0 }}><button className="pg-btn" type="submit">送出報名</button><button className="pg-tlink" type="button" onClick={() => { setForm(false); setErr(""); }}>取消</button></div>
  </form>;
  else if (e.ok && LIVE) action = <p className="pg-note" style={{ margin: 0 }}>線上報名將在下一階段開放。本梯次請由所屬推動辦公室彙整名單，寄到培訓專用信箱。</p>;
  else if (e.ok) action = <div className="pg-btnline"><button type="button" className="pg-btn" onClick={() => { setForm(true); setTimeout(() => document.getElementById("idno")?.focus(), 60); }}>{e.full ? "登記備取" : "我要報名"} <span className="hm-arr" aria-hidden="true">→</span></button>
    <span className="pg-note" style={{ margin: 0 }}>需要：身分證字號{c.proof ? `、${c.proof.join("、")} 完成證明` : ""}、午餐選擇</span></div>;
  else action = <div className="pg-btnline"><JudgeLink st={st} me={me} s={s} skipDetail /></div>;

  return (
    <>
      <Stage eyebrow={`場次詳情・${s.region}`} doc={levelName(st, s)} srTitle={`${levelName(st, s)}（${s.region} ${dot(s.date)}）`}
        cap="亮起的是這一場的日期、時數與名額。" focus={[dot(s.date), String(c.hours), String(s.cap)]}>
        <span className="sh-bigdate" style={{ viewTransitionName: "vt-date", color: COL[s.course] }}>{dot(s.date)}</span>
        <small>{s.date2 ? `–${dot(s.date2)}・兩天` : s.date.slice(0, 4)}</small>
        <Link className="sh-back" to="/trainings">← 回到研習</Link>
      </Stage>

      <div className="pg-dhead" data-c={s.course}>
        <p className="k">{kindOf(st, s)}</p>
        <h2 style={{ viewTransitionName: "vt-title" }}>{titleOf(st, s)}</h2>
        <p>{c.desc}</p>
      </div>
      <dl className="pg-facts">
        <div><dt>日期</dt><dd>{mdw(s.date)}{s.date2 && <small>{mdw(s.date2)}</small>}</dd></div>
        <div><dt>時間</dt><dd>{s.time.replace("兩天 ", "")}<small>08:30 報到・研習 {c.hours} 小時{s.course === "T" ? "（B6. 3＋G1. 9）" : ""}</small></dd></div>
        <div><dt>地點</dt><dd>{city}<small>{s.venue2 ? `第一天 ${s.venue}・第二天 ${s.venue2}` : s.venue}</small></dd></div>
        <div><dt>對象</dt><dd>{c.elig === "open" ? "不限資格" : c.elig === "invite" ? "推動辦公室推薦" : JOB[s.track!]}<small>{c.elig === "track" ? "需先完成 B6." : c.elig === "invite" ? "先修 " + c.proof!.join("、") : ""}</small></dd></div>
      </dl>

      <section className={"pg-judge" + (run ? " run" : "")} data-c={s.course} aria-label="報名">
        {e.reg && <p className="hm-verdict ok" style={{ opacity: 1 }}>你已報名這一場：{ST[e.reg.status][0]}</p>}
        {!e.reg && <JudgeView st={st} me={me} s={s} />}
        {action}
      </section>

      <div className="pg-disc">
        <details open><summary>{s.course === "T" ? "兩天課程表" : "課程內容"}</summary><div className="a"><ul>{c.content.map(t => <li key={t}>{t}</li>)}</ul>
          {s.course === "T" && <p>課程講師：國立高雄師範大學 沈明勳 教授</p>}</div></details>
        <details><summary>報名資格與方式</summary><div className="a">{s.course === "A"
          ? <><p>完成 A1、A2 及 B5-1 的教育相關人員。115 年下半年的 B6. 開放 G1. 參訓人員，以及各直轄市、縣（市）政府與國教署的教育行政相關人員。</p>
            <p>不受理個人報名：由各推動辦公室彙整名單寄到培訓信箱，計畫團隊再以 email 寄送報名連結。報名時請附 A1、A2、B5-1 全教網完成證明，尚未完成的請在培訓前補齊。</p></>
          : s.course === "T"
          ? <><p>由各推動辦公室推薦，須完成 A1、A2、B5-1 與 B6.，並符合下列身分之一：教育行政機關人員、現任或曾任校長或主任、已取得校長遴選或主任聘任資格者。具 B5-1. 講師資格者，推動辦公室可以優先推薦；教育行政機關人員可以跨單位推薦。</p>
            <p>須全程參與兩天課程。不受理個人報名：由推動辦公室彙整名單，計畫團隊以 email 寄送報名連結。報名時請附 A1、A2、B5-1 全教網完成證明。</p></>
          : <p>已完成 B6.，且帳號職務與分流相符。116 年起由各推動辦公室開設。</p>}
          <p>報名結果在報名截止後 3 個工作天內以 email 通知；行前須知在開課前 2 個工作天寄送。國教署及離島地區可以擇一區域參加。</p></div></details>
        <details><summary>研習時數與證明</summary><div className="a">依參與類型核發時數：B6. 單日 3 小時，G1. 全程兩天 12 小時。結業後可在「研習 › 我的研習」取得研習證明（附查驗碼），並由計畫登錄全教網研習時數。{s.course !== "A" && "結業後自動開通分析平台。"}</div></details>
        {s.course === "T" && <details><summary>講師資格認證</summary><div className="a"><ol>
          <li>全程參與兩天 B6.（3 小時）與 G1.（9 小時）課程。</li>
          <li>完成培訓後 6 個月內，繳交使用公版簡報的教學演示影片，由計畫團隊邀請專家學者審查。</li>
          <li>通過審查即為「B6-2. 教育資料實務應用工作坊（學校行政）」合格講師，效期 2 年。</li>
          <li>12 月中辦理「跨區共通講師實作分享交流會」，歡迎通過培訓的講師參加。</li>
          <li>116 年起協助各縣市及國教署辦理 B6-2. 並擔任講師，計畫團隊提供輔導與支持。</li></ol></div></details>}
        <details><summary>注意事項</summary><div className="a"><ul>
          <li>課程包含資料搜尋與分析實作，請攜帶筆記型電腦或平板。請在 08:30 前報到。</li>
          <li>培訓期間蒐集、處理及利用的個人資料，依個人資料保護法及相關法規辦理。</li>
          <li>遇颱風等不可抗力因素，依研習地點所在縣市公告辦理，延期日期另行通知。</li>
          <li>主辦單位保留調整研習內容、時間及相關安排的權利，異動會另行公告或通知。</li></ul>
          <p>聯絡：培訓專用信箱 edl.office+training@tlkr.nknu.edu.tw・電話 07-7172930 分機 7028</p></div></details>
      </div>
      {[[s.venue, s.address, s.venue2 ? "第一天" : ""], ...(s.venue2 ? [[s.venue2, s.address2 || "", "第二天"]] : [])].map(([v, a, d]) =>
        <p className="pg-place" key={v}><b>{d && d + "　"}{v}</b><span>{a}</span>
          <a className="pg-link" href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(v + " " + a)} target="_blank" rel="noopener">用 Google 地圖開啟</a></p>)}
    </>
  );
}
