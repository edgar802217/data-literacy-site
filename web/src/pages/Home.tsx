import { Link } from "react-router-dom";
import { useDemo } from "../demo/store";
import { daysTo, done, entitled, has, isAdmin, JOB, mdw, openReg, pendingInvites, sess, ST, upcoming } from "../demo/logic";
import { useContent } from "../lib/content";
import { Badge, Icon, Level } from "../components/ui";
import { SessionCard } from "../components/SessionCard";
import type { CourseId } from "../demo/types";

function HeroChart() {
  const bars: [number, number, number, string, number][] = [[50, 190, 80, "#1B5FA6", 0], [120, 140, 130, "#2185B5", .12], [190, 95, 175, "#1E97A3", .24], [260, 45, 225, "#EE7A1D", .36]];
  const dots: [number, number, number, string, number][] = [[74, 150, 11, "#1B5FA6", .9], [144, 100, 11, "#1E97A3", 1.05], [300, 24, 13, "#EE7A1D", 1.2]];
  return (
    <svg className="chart" viewBox="0 0 360 300" role="img" aria-label="LOGO 中的長條圖與折線">
      <line x1="20" y1="270" x2="340" y2="270" stroke="#DCE4EA" strokeWidth="2" />
      {bars.map(([x, y, h, c, d]) => <rect key={x} className="bar" x={x} y={y} width="48" height={h} rx="6" fill={c} style={{ animationDelay: d + "s" }} />)}
      <polyline className="ln" points="74,150 144,100 214,96 300,24" />
      {dots.map(([x, y, r, c, d]) => <circle key={x} className="dot" cx={x} cy={y} r={r} fill={c} stroke="#fff" strokeWidth="4" style={{ animationDelay: d + "s" }} />)}
    </svg>
  );
}

/** 登入後 Hero 右側：只放最重要的一件事 */
function MyCard() {
  const { st, me } = useDemo();
  if (!me) return null;
  if (!has(me, "learner")) {
    const pend = st.regs.filter(r => r.status === "pending").length;
    return <div className="mine"><div className="hd"><span className="k">後台待辦</span></div>
      <h3>{has(me, "staff") ? `待審核報名 ${pend} 件` : has(me, "county") ? "講師培訓推薦名單" : "授課與點名"}</h3>
      <Link to="/admin" className="btn btn-p btn-sm">進入後台 <Icon n="arrow" /></Link></div>;
  }
  const inv = pendingInvites(st, me)[0];
  const cur = st.regs.filter(r => r.user === me.id && ["pending", "waitlist", "admitted"].includes(r.status)).map(r => ({ r, s: sess(st, r.sess)! }))
    .filter(x => daysTo(x.s.date) >= 0).sort((a, b) => (a.s.date < b.s.date ? -1 : 1))[0];
  const ent = entitled(st, me.id);
  const foot = <div className="ft"><Icon n="lock" />{ent ? <>分析平台已開通・<Link to="/platform">進入</Link></> : "完成進階後，AI 分析平台自動開通"}</div>;
  if (inv) return <div className="mine"><div className="hd"><span className="k">你的研習</span><Badge kind="wait">待接受邀請</Badge></div>
    <h3>{inv.county}推薦你參加講師培訓</h3><p className="muted">邀請信已寄到 {inv.email}，到「示範信箱」點邀請信即可接受。</p>{foot}</div>;
  if (cur) {
    const p = { pending: 1, waitlist: 1, admitted: 2 }[cur.r.status as "pending"] ?? 1;
    return <div className="mine"><div className="hd"><span className="k">你的研習</span><Badge kind={ST[cur.r.status][1]}>{ST[cur.r.status][0]}</Badge></div>
      <h3>{st.courses.find(c => c.id === cur.s.course)!.level}研習{cur.s.track ? `（${JOB[cur.s.track]}軌）` : ""}</h3>
      <div className="when"><Icon n="cal" />{mdw(cur.s.date)} {cur.s.region}・{cur.s.venue}</div>
      <div className="prog">{[0, 1, 2, 3, 4].map(i => <i key={i} className={i < p ? "on" : i === p ? "cur" : ""} />)}</div>
      <Link to="/trainings/mine" className="btn btn-s btn-sm">查看我的研習</Link>{foot}</div>;
  }
  const next: [CourseId, string] | null = !done(st, me.id, "A") ? ["A", "從初階研習開始"] : !done(st, me.id, "B") && !openReg(st, me.id, "B") ? ["B", `下一步：報名進階研習（${me.job ? JOB[me.job] : ""}軌）`] : null;
  const target = next && upcoming(st).find(s => s.course === next[0] && (!s.track || s.track === me.job));
  return <div className="mine"><div className="hd"><span className="k">你的研習</span>{done(st, me.id, "A") && <Badge kind="ok">初階已結業</Badge>}</div>
    <h3>{next ? next[1] : "目前沒有進行中的研習"}</h3>
    {target && <div className="when"><Icon n="cal" />最近一場 {mdw(target.date)} {target.region}</div>}
    {target ? <Link to={"/trainings/" + target.id} className="btn btn-p btn-sm">看這個場次 <Icon n="arrow" /></Link> : <Link to="/trainings/mine" className="btn btn-s btn-sm">查看我的研習</Link>}
    {foot}</div>;
}

export default function Home() {
  const { st, me } = useDemo();
  const { news, events } = useContent();
  const up = upcoming(st);
  const openCount = (c: CourseId) => up.filter(s => s.course === c && s.open).length;
  const lstate = (c: CourseId) => {
    if (!me || !has(me, "learner")) return null;
    if (done(st, me.id, c)) return <Badge kind="ok">已結業</Badge>;
    const r = openReg(st, me.id, c); if (r) return <Badge kind={ST[r.status][1]}>{ST[r.status][0]}</Badge>;
    if (c === "T") return st.invites.some(i => i.user === me.id && i.status === "accepted") ? <Badge kind="can">已受推薦</Badge> : <Badge kind="no">需縣市推薦</Badge>;
    if (c === "B" && !done(st, me.id, "A")) return <Badge kind="no">需先完成初階</Badge>;
    return <Badge kind="can">可報名</Badge>;
  };
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            <p className="eyebrow">給縣市行政、校長主任與老師的研習</p>
            <h1>教育資料素養提升計畫</h1>
            <p className="motto">數據治理．決策有理</p>
            <p className="lead">學會看懂教育數據、用數據討論問題，再搭配 AI 輔助分析平台，用自己學校的資料實際操作。</p>
            <div className="acts"><Link to="/trainings" className="btn btn-p">找研習 <Icon n="arrow" /></Link><Link to="/platform#try" className="btn btn-s">試玩分析平台</Link></div>
          </div>
          {me ? <MyCard /> : <HeroChart />}
        </div>
      </section>

      <section className="sec">
        <div className="wrap now">
          <div>
            <div className="sh"><h2>近期研習</h2><Link to="/trainings" className="btn btn-t">看全部場次 <Icon n="arrow" /></Link></div>
            <div className="scroller">{up.slice(0, 3).map(s => <SessionCard key={s.id} s={s} compact />)}</div>
          </div>
          <div>
            <div className="sh"><h2>最新消息</h2><Link to="/news" className="btn btn-t">看全部 <Icon n="arrow" /></Link></div>
            <ul className="ul">{news.slice(0, 3).map((n, i) => <li key={i}><time>{n["日期"]}</time><span>{n["分類"] && <span className="k">{n["分類"]}</span>}{n["連結"] ? <a href={n["連結"]} target="_blank" rel="noopener">{n["標題"]}</a> : n["標題"]}</span></li>)}</ul>
            {events.length > 0 && <div className="evs"><h3>近期活動</h3>{events.slice(0, 2).map((e, i) => <div className="ev" key={i}><div className="d">{e["日期"].slice(5).replace("-", "/").replace(/^0/, "")}</div><div><b>{e["名稱"]}</b></div></div>)}</div>}
          </div>
        </div>
      </section>

      <section className="sec tint">
        <div className="wrap">
          <div className="sh"><div><h2>研習課程</h2><p>一般研習先打基礎，再依你的職務用真實資料練習。講師培訓是另一條路，由縣市推薦。</p></div></div>
          <div className="tracks">
            <div className="track">
              <div className="tk-h">一般研習</div>
              <div className="line2">
                <div className="cc la"><div className="top"><Level c="A">初階</Level>{lstate("A")}</div><h3>資料素養基礎與解讀</h3><p className="meta">3 小時・不限資格</p>
                  <div className="nx"><b>{openCount("A")} 場開放報名</b><span>北、中、南區</span></div><Link to="/trainings?course=A" className="btn btn-t">看初階場次 <Icon n="arrow" /></Link></div>
                <div className="cc lb"><div className="top"><Level c="B">進階</Level>{lstate("B")}</div><h3>教育數據分析與應用</h3><p className="meta">6 小時・縣市行政／學校行政／學校教師三分流・需先完成初階</p>
                  <div className="nx"><b>{openCount("B")} 場開放報名</b><span>每個分流各自開班</span></div><Link to="/trainings?course=B" className="btn btn-t">看進階場次 <Icon n="arrow" /></Link></div>
              </div>
              <div className="unlock"><Icon n="lock" /><span>完成進階研習，<b>自動開通 AI 輔助分析平台</b>，用同一組帳號登入。</span></div>
            </div>
            <div className="track">
              <div className="tk-h">講師培訓</div>
              <div className="cc lt solo"><div className="top"><Level c="T">講師培訓・獨立</Level>{lstate("T")}</div><h3>學校行政講師培訓工作坊</h3><p className="meta">兩天 12 小時・縣市推薦</p>
                <ul><li>先修：A1、A2、B5-1</li><li>結訓後試教審查，取得講師資格（2 年）</li></ul>
                <div className="nx"><b>四區開班・10/31 起</b><span>中、北、南、東區</span></div><Link to="/trainings?course=T" className="btn btn-t">了解講師培訓 <Icon n="arrow" /></Link></div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap teaser">
          <div className="app" aria-hidden="true">
            <div className="app-bar"><i /><i /><i /></div>
            <div className="app-body"><div className="app-side"><span className="on" /><span /><span /><span /></div>
              <div className="app-main"><div className="r"><span className="pill">✓ 已去識別</span><span className="pill b">七年級段考.xlsx</span></div>
                <svg viewBox="0 0 240 100" style={{ width: "100%", height: "auto" }}><line x1="0" y1="92" x2="240" y2="92" stroke="#DCE4EA" />
                  {[48, 62, 40, 70, 56, 30].map((h, i) => <rect key={i} x={18 + i * 34} y={92 - h} width="24" height={h} rx="4" fill={i === 5 ? "#EE7A1D" : "#2185B5"} />)}</svg>
                <div className="ai"><b>AI 解讀草稿・需你確認</b>第 6 班平均明顯低於其他班，建議先確認是否有缺考或特殊狀況。</div></div></div>
          </div>
          <div>
            <Level c="B">AI 輔助教育數據分析平台</Level>
            <h2>不用寫程式，也能用數據討論學生學習</h2>
            <p>上傳資料、說出想了解的問題，平台完成分析並附上說明，最後由你確認結果。</p>
            <ul className="pts"><li><Icon n="check" />資料先在你的電腦上去識別，AI 只看統計摘要</li><li><Icon n="check" />每段解讀都附判讀提示，由你決定要不要採用</li><li><Icon n="check" />完成進階研習即可使用</li></ul>
            <div className="acts"><Link to="/platform#try" className="btn btn-s">試玩看看</Link>{me && entitled(st, me.id) && <Link to="/platform/enter" className="btn btn-p">進入分析平台</Link>}</div>
          </div>
        </div>
      </section>

      <section className="sec tint">
        <div className="wrap">
          <div className="stats">
            {([["22", "縣市＋國教署", "#1B5FA6"], ["14", "場講師培訓", "#2185B5"], ["10", "場縣市行政研習", "#0E6E7A"], ["59", "項能力指標", "#A9520B"]] as const).map(([n, t, c]) => <div key={t}><b style={{ color: c }}>{n}</b><span>{t}</span></div>)}
          </div>
          {me && isAdmin(me) && <p className="muted small" style={{ marginTop: 16 }}>你有後台權限：<Link to="/admin">進入後台</Link></p>}
        </div>
      </section>
    </>
  );
}
