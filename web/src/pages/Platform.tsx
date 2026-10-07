import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useDemo } from "../demo/store";
import { done, entitled, has, JOB, openReg, ST } from "../demo/logic";
import { Badge, Icon, Level } from "../components/ui";
import "../styles/platform-demo.css";

/* 試玩沿用舊網站的拖曳流程（public/platform-demo.js）。它直接操作 DOM，所以這裡只放好它要的骨架再載入。 */
const DEMO_HTML = `
<div class="demo" id="try-box">
  <div class="demo-head"><h3 id="demo-title">試玩看看：從匯入資料到產出報告</h3><span class="demo-note">示意流程，資料為虛構；實際畫面以平台為準</span></div>
  <ol class="demo-steps" id="demo-steps" aria-label="試玩步驟"><li data-step="1">匯入資料</li><li data-step="2">去識別</li><li data-step="3">選起手式</li><li data-step="4">檢核 AI 草稿</li><li data-step="5">產出報告</li></ol>
  <div class="stage" id="stage"><div class="tray" id="tray" role="group" aria-label="可以拖曳的物件"></div>
    <div class="win"><div class="win-bar" aria-hidden="true"><i></i><i></i><i></i><span id="win-title">AI 輔助教育數據分析平台</span></div><div class="win-body" id="win-body"></div></div></div>
  <div class="demo-foot"><p class="demo-hint" id="demo-hint" aria-live="polite"></p><div class="demo-ctrl"><button type="button" class="btn btn-line btn-sm" id="demo-back">上一步</button><button type="button" class="btn btn-line btn-sm" id="demo-reset">重新開始</button></div></div>
</div>`;
function Trial() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    (window as unknown as { SITE_PLATFORM_URL: string }).SITE_PLATFORM_URL = "/platform/enter";
    const sc = document.createElement("script");
    sc.src = import.meta.env.BASE_URL + "platform-demo.js"; sc.async = false;
    document.body.appendChild(sc);
    return () => { sc.remove(); document.querySelectorAll(".hand,.ghost").forEach(x => x.remove()); };
  }, []);
  return <div className="pdemo" ref={ref} dangerouslySetInnerHTML={{ __html: DEMO_HTML }} />;
}

export default function Platform() {
  const { st, me } = useDemo();
  const loc = useLocation();
  useEffect(() => { if (loc.hash) setTimeout(() => document.querySelector(loc.hash)?.scrollIntoView({ behavior: "smooth" }), 150); }, [loc.hash]);
  const learner = has(me, "learner");
  const ent = !!me && (entitled(st, me.id) || has(me, "staff"));
  const a = learner && done(st, me!.id, "A"), b = learner && done(st, me!.id, "B");
  const bReg = learner ? openReg(st, me!.id, "B") : undefined;
  return (
    <>
      <section className="hero plat">
        <div className="wrap">
          <div>
            <Level c="B">分析平台</Level>
            <h1>AI 輔助教育數據分析平台</h1>
            <p className="lead">不用會寫程式。上傳資料、說出你想了解的問題，平台會完成分析並附上說明，最後由你確認結果。</p>
            <div className="acts">
              <a href="#try" className="btn btn-s" onClick={e => { e.preventDefault(); document.getElementById("try")?.scrollIntoView({ behavior: "smooth" }); }}>先試玩看看</a>
              {ent ? <Link to="/platform/enter" className="btn btn-p">進入分析平台 <Icon n="arrow" /></Link>
                : me ? <button className="btn btn-p" disabled>進入平台（尚未開通）</button>
                : <Link to="/login?next=/platform" className="btn btn-p">登入分析平台</Link>}
            </div>
            {me && !ent && learner && <p className="hint-line">還差：{!a ? "初階研習、" : ""}進階研習（{me.job ? JOB[me.job] : ""}軌）。{bReg ? <>你的進階報名目前「{ST[bReg.status][0]}」。</> : <Link to={a ? "/trainings?course=B" : "/trainings?course=A"}>去報名 →</Link>}</p>}
          </div>
          <div className="app big" aria-hidden="true">
            <div className="app-bar"><i /><i /><i /></div>
            <div className="app-body"><div className="app-side"><span className="on" /><span /><span /><span /></div>
              <div className="app-main"><div className="r"><span className="pill">✓ 已去識別</span><span className="pill b">七年級段考.xlsx</span></div>
                <svg viewBox="0 0 240 100" style={{ width: "100%", height: "auto" }}><line x1="0" y1="92" x2="240" y2="92" stroke="#DCE4EA" />{[48, 62, 40, 70, 56, 30].map((h, i) => <rect key={i} x={18 + i * 34} y={92 - h} width="24" height={h} rx="4" fill={i === 5 ? "#EE7A1D" : "#2185B5"} />)}</svg>
                <div className="ai"><b>AI 解讀草稿・需你確認</b>第 6 班平均明顯低於其他班，建議先確認是否有缺考或特殊狀況。</div></div></div>
          </div>
        </div>
      </section>

      <section className="sec tint" id="try">
        <div className="wrap"><div className="sh"><div><h2>試玩：從匯入資料到產出報告</h2><p>把左邊的物件拖到對的位置（或點一下），五個步驟走完一次平台的分析流程。</p></div></div><Trial /></div>
      </section>

      <section className="sec" id="unlock">
        <div className="wrap">
          <div className="sh"><div><h2>怎麼開通</h2><p>結業當下自動開通，不用另外申請。</p></div>{ent && <Badge kind="ok">你已開通</Badge>}</div>
          <ol className="steps3">
            <li className={a || ent ? "done" : ""}><span className="n">{a || ent ? "✓" : "1"}</span><b>完成初階研習</b><p>3 小時，不限資格。</p></li>
            <li className={b || ent ? "done" : ""}><span className="n">{b || ent ? "✓" : "2"}</span><b>完成進階研習</b><p>依職務分流，6 小時。結業當下開通。</p></li>
            <li className={ent ? "done" : ""}><span className="n">{ent ? "✓" : "3"}</span><b>用同一組帳號進入</b><p>不用再註冊或登入一次。</p></li>
          </ol>
          <div className="priv"><Icon n="shield" /><p>真實資料會先在你的電腦上去識別化。AI 只會看到欄位結構和統計摘要，不會取得學生的個別紀錄；數字一律由平台計算。</p></div>
        </div>
      </section>
    </>
  );
}

/** 「進入平台」：分析平台還沒整合前的過場頁 */
export function PlatformEnter() {
  const { st, me } = useDemo();
  const url = import.meta.env.VITE_ANALYTICS_URL;
  const ok = !!me && (entitled(st, me.id) || has(me, "staff"));
  return (
    <div className="wrap narrow enter">
      {ok ? <>
        <div className="spinner" aria-hidden="true" />
        <h1>正在前往分析平台</h1>
        <p className="muted">正式版會帶著網站的登入狀態直接進入分析平台，不需要再登入一次。</p>
        {url ? <a className="btn btn-p" href={url}>前往分析平台 <Icon n="arrow" /></a>
          : <p className="note-box">示範版：分析平台尚未串接。整合時只要設定平台網址（VITE_ANALYTICS_URL），並補上單一登入的交接即可。</p>}
        <Link to="/platform" className="btn btn-t">回到分析平台介紹</Link>
      </> : <>
        <h1>{me ? "你的帳號還沒開通分析平台" : "請先登入"}</h1>
        <p className="muted">{me ? "完成進階研習後會自動開通。" : "分析平台使用網站同一組帳號。"}</p>
        <Link to={me ? "/platform#unlock" : "/login?next=/platform/enter"} className="btn btn-p">{me ? "看開通條件" : "登入"}</Link>
      </>}
    </div>
  );
}
