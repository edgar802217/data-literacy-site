import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useDemo } from "../demo/store";
import { done, entitled, has, JOB, openReg, ST } from "../demo/logic";
import { Icon } from "../components/ui";
import { Stage } from "../shell/Shell";
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
      <Stage eyebrow="分析平台" doc="分析平台" title="把研習所學，帶進資料分析。"
        lead="不用寫程式。上傳資料、說出想了解的問題，平台完成分析並附上說明，最後由你確認結果。"
        cap="亮起的是開通平台的課程時數：進階課程 6 小時、G1. 講師培訓 12 小時。" focus={["6", "12"]}>
        <div className="sh-actions">
          {ent ? <Link to="/platform/enter" className="pg-btn">進入分析平台 <span className="hm-arr" aria-hidden="true">→</span></Link>
            : !me ? <Link to="/login?next=/platform" className="pg-btn">登入分析平台</Link> : null}
          <a href="#try" className="pg-tlink" onClick={e => { e.preventDefault(); document.getElementById("try")?.scrollIntoView({ behavior: "smooth" }); }}>先試玩看看</a>
        </div>
        {me && !ent && learner && <p className="sh-lead" style={{ marginTop: 14 }}>還差：{!a ? "B6. 基礎課程、" : ""}進階課程（{me.job ? JOB[me.job] : ""}，116 年起開設）或 G1. 講師培訓。{bReg ? <>你的進階報名目前「{ST[bReg.status][0]}」。</> : null}</p>}
      </Stage>

      <h2 className="pg-sec" id="try">試玩：從匯入資料到產出報告</h2>
      <p className="pg-text">把左邊的物件拖到對的位置（或點一下），五個步驟走完一次平台的分析流程。資料是虛構的。</p>
      <Trial />

      <h2 className="pg-sec" id="unlock">怎麼開通</h2>
      <p className="pg-text">結業當下自動開通，不用另外申請。{ent && <b>你已開通。</b>}</p>
      <ol className="pg-unlock">
        <li className={a || ent ? "pg-done" : ""}><b>完成 B6. 教育資料素養工作坊</b><p>3 小時；報名前需完成全教網的 A1、A2、B5-1。</p></li>
        <li className={b || ent ? "pg-done" : ""}><b>完成進階課程或講師培訓</b><p>進階課程 B6-1／B6-2／B6-3 依職務分流，各 6 小時，116 年起開設；G1. 講師培訓由推動辦公室推薦。結業當下開通。</p></li>
        <li className={ent ? "pg-done" : ""}><b>用同一組帳號進入</b><p>不用再註冊或登入一次。</p></li>
      </ol>
      <p className="pg-priv">真實資料會先在你的電腦上去識別化。AI 只會看到欄位結構和統計摘要，不會取得學生的個別紀錄；數字一律由平台計算。</p>
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
        <p className="muted">{me ? "完成進階課程或 G1. 講師培訓後會自動開通。" : "分析平台使用網站同一組帳號。"}</p>
        <Link to={me ? "/platform#unlock" : "/login?next=/platform/enter"} className="btn btn-p">{me ? "看開通條件" : "登入"}</Link>
      </>}
    </div>
  );
}
