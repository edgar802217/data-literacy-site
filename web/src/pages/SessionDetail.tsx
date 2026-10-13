import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useDemo } from "../demo/store";
import { course, elig, JOB, mdw, sess, ST, TODAY } from "../demo/logic";
import { dot, lvName, Stage } from "../shell/Shell";
import { JudgeLink, JudgeView } from "../shell/sessions";
import { lastDetail } from "../shell/vt";

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
    ? <div className="pg-btnline"><Link to={loginTo} className="pg-btn pg-line">已收到邀請？登入</Link><Link to="/trainings/faq" className="pg-tlink">講師培訓怎麼推薦</Link></div>
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
  else if (e.ok) action = <div className="pg-btnline"><button type="button" className="pg-btn" onClick={() => { setForm(true); setTimeout(() => document.getElementById("idno")?.focus(), 60); }}>{e.full ? "登記備取" : "我要報名"} <span className="hm-arr" aria-hidden="true">→</span></button>
    <span className="pg-note" style={{ margin: 0 }}>需要：身分證字號{c.proof ? "、先修證明" : ""}、午餐選擇</span></div>;
  else action = <div className="pg-btnline"><JudgeLink st={st} me={me} s={s} skipDetail /></div>;

  return (
    <>
      <Stage eyebrow="場次詳情" doc={c.name} srTitle={`${lvName(c.level)} ${c.name}（${dot(s.date)}）`}
        cap="亮起的是這一場的日期、時數與名額。" focus={[dot(s.date), String(c.hours), String(s.cap)]}>
        <span className="sh-bigdate" style={{ viewTransitionName: "vt-date", color: COL[s.course] }}>{dot(s.date)}</span>
        <small>{s.date2 ? `–${dot(s.date2)}・兩天` : s.date.slice(0, 4)}</small>
        <Link className="sh-back" to="/trainings">← 回到研習</Link>
      </Stage>

      <div className="pg-dhead" data-c={s.course}>
        <p className="k">{lvName(c.level)}{s.track ? "・" + JOB[s.track] + "軌" : ""}</p>
        <h2 style={{ viewTransitionName: "vt-title" }}>{c.name}</h2>
        <p>{c.desc}</p>
      </div>
      <dl className="pg-facts">
        <div><dt>日期</dt><dd>{mdw(s.date)}{s.date2 && <small>{mdw(s.date2)}</small>}</dd></div>
        <div><dt>時間</dt><dd>{s.time.replace("兩天 ", "")}<small>研習 {c.hours} 小時</small></dd></div>
        <div><dt>地點</dt><dd>{city}<small>{s.venue}</small></dd></div>
        <div><dt>對象</dt><dd>{c.elig === "open" ? "不限資格" : c.elig === "invite" ? "縣市推薦" : JOB[s.track!]}<small>{c.elig === "track" ? "需先完成初階" : c.elig === "invite" ? "先修 " + c.proof!.join("、") : "教師、行政人員"}</small></dd></div>
      </dl>

      <section className={"pg-judge" + (run ? " run" : "")} data-c={s.course} aria-label="報名">
        {e.reg && <p className="hm-verdict ok" style={{ opacity: 1 }}>你已報名這一場：{ST[e.reg.status][0]}</p>}
        {!e.reg && <JudgeView st={st} me={me} s={s} />}
        {action}
      </section>

      <div className="pg-disc">
        <details open><summary>課程內容</summary><div className="a"><ul>{c.content.map(t => <li key={t}>{t}</li>)}</ul></div></details>
        <details><summary>報名資格與方式</summary><div className="a">{c.elig === "open" ? "不限資格。登入後在本頁報名，承辦審核後寄信通知。" : c.elig === "track" ? `已完成初階研習，且帳號職務為「${JOB[s.track!]}」。登入後在本頁報名，承辦審核後寄信通知。` : "由縣市承辦推薦。被推薦人會收到邀請信，點信中的連結登入或註冊後，即可在本頁報名並上傳先修證明。"}</div></details>
        <details><summary>研習時數與證明</summary><div className="a">結業後可在「研習 › 我的研習」取得研習證明（附查驗碼），並由計畫登錄全教網研習時數。{s.course === "B" && "結業當下自動開通分析平台。"}{s.course === "T" && "結訓後繳交公版簡報與試教影片，審查通過取得講師資格（效期 2 年）。"}</div></details>
        <details><summary>交通與注意事項</summary><div className="a">請提早 15 分鐘報到。{s.course !== "A" && "請攜帶筆電。"}停車與交通資訊會在錄取通知信中提供。</div></details>
      </div>
      <p className="pg-place"><b>{s.venue}</b><span>{s.address}</span>
        <a className="pg-link" href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(s.venue + " " + s.address)} target="_blank" rel="noopener">用 Google 地圖開啟</a></p>
    </>
  );
}
