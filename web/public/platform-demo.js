/* 平台試玩：從匯入資料到產出報告（示意流程，資料為虛構）
   操作語言只有一種：把物件拖到對的位置。點一下物件、或用鍵盤按 Enter 也能完成同一步。
   用詞對齊 edu-analytics docs/02、docs/06（S22 起去識別在瀏覽器本機執行，收件匣已退役）：
   本機開啟、敏感掃描、資料集、學生代碼、起手式、結果卡片、
   判讀鷹架、群體防護鎖、敘寫檢核。數字全部由下方的虛構資料即時算出，不手打。 */
(function () {
  const $ = id => document.getElementById(id);
  if (!$("stage")) return;
  const MOTION = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- 虛構資料（固定亂數種子，每次都一樣） ---------- */
  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = rng(20261001);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const clamp = v => Math.max(20, Math.min(100, Math.round(v)));
  const SUR = "陳林黃張李王吳劉蔡楊許鄭謝郭洪曾邱廖賴周";
  const GIV = ["宜庭", "家豪", "雅婷", "冠宇", "怡君", "承恩", "品妍", "柏翰", "子涵", "宥辰", "詩涵", "彥廷", "欣妤", "俊宏", "佳穎", "睿哲"];
  const CLASSES = [["701", 30, 73], ["702", 29, 70], ["703", 18, 64], ["705", 3, 70]];   // 班級、人數、平均
  const students = [];
  for (const [cls, n, mu] of CLASSES) {
    for (let seat = 1; seat <= n; seat++) {
      const e1 = clamp(mu + gauss() * 12);
      students.push({
        name: SUR[Math.floor(rand() * SUR.length)] + GIV[Math.floor(rand() * GIV.length)],
        id: `113${cls.slice(1)}${String(seat).padStart(2, "0")}`,
        cls, e1, e2: clamp(e1 + 2 + gauss() * 7),
      });
    }
  }
  students.forEach((s, i) => { s.code = `S${String(i + 1).padStart(3, "0")}`; });
  const N = students.length;
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const pct = n => Math.round((n / N) * 100);
  const LOCK = 5;   // 群體防護鎖：少於 5 人的組別不顯示

  /* ---------- 三個起手式：統計、草稿、判讀鷹架 ---------- */
  function analyse(op) {
    if (op === "describe") {
      const edges = [[0, 59, "0–59"], [60, 69, "60–69"], [70, 79, "70–79"], [80, 89, "80–89"], [90, 100, "90–100"]];
      const bars = edges.map(([a, b, l]) => [l, students.filter(s => s.e2 >= a && s.e2 <= b).length]);
      const top = bars.reduce((m, b) => (b[1] > m[1] ? b : m));
      const low = bars[0][1];
      return {
        bars, hi: bars.indexOf(top), unit: "人", caption: `第二次段考成績分布（${N} 人）`,
        lead: `${N} 位學生第二次段考的平均是 ${Math.round(avg(students.map(s => s.e2)))} 分，${top[0]} 分的人數最多（${top[1]} 人，約 ${pct(top[1])}%）。`,
        flag: `未達 60 分的 ${low} 位學生屬於低成就學生。`,
        rule: "標籤化", why: "避免替學生貼標籤，描述分數本身就好",
        fix: `有 ${low} 位學生未達 60 分，可以先找出他們共同答錯的題型。`,
        scaffold: "單次段考只能看出分數分布，看不出進步或退步；要比較，需要加入前一次段考。",
      };
    }
    if (op === "group") {
      const groups = CLASSES.map(([c]) => {
        const g = students.filter(s => s.cls === c);
        return { c, n: g.length, m: Math.round(avg(g.map(s => s.e2))) };
      });
      const shown = groups.filter(g => g.n >= LOCK), locked = groups.filter(g => g.n < LOCK);
      const min = shown.reduce((a, b) => (b.m < a.m ? b : a));
      const gaps = shown.filter(g => g !== min).map(g => g.m - min.m).sort((a, b) => a - b);
      return {
        bars: shown.map(g => [`${g.c}（${g.n}人）`, g.m]), hi: shown.indexOf(min), unit: "分", yMax: 100,
        caption: "各班第二次段考平均分數", locked,
        lead: shown.map(g => `${g.c} 班平均 ${g.m} 分`).join("、") + "。",
        flag: `${min.c} 班是表現最差的班級。`,
        rule: "排名用語", why: "避免替班級或學生排名次，改為描述差距與限制",
        fix: `${min.c} 班平均比其他班低 ${gaps[0]}–${gaps[gaps.length - 1]} 分；這個班只有 ${min.n} 人，差距是否需要介入，要再看分數分布。`,
        scaffold: "各班人數不同，人數少的班，平均容易受少數學生影響。",
      };
    }
    // trend：兩次段考前後比較
    const diff = students.map(s => ({ ...s, d: s.e2 - s.e1 }));
    const up = diff.filter(s => s.d >= 5), down = diff.filter(s => s.d <= -5);
    const top = diff.reduce((a, b) => (b.d > a.d ? b : a));
    const everyClass = CLASSES.filter(([, n]) => n >= LOCK).every(([c]) => up.some(s => s.cls === c));
    return {
      bars: [["退步 5 分以上", down.length], ["變動 5 分內", N - up.length - down.length], ["進步 5 分以上", up.length]],
      hi: 2, unit: "人", caption: "兩次段考的分數變化（人數）",
      lead: `比較兩次段考，${up.length} 位學生（約 ${pct(up.length)}%）進步 5 分以上，${down.length} 位退步 5 分以上。`,
      flag: `${top.code} 進步最多，值得公開表揚。`,
      rule: "個人指涉", why: "分析只談群體，不指出單一學生",
      fix: everyClass
        ? "進步 5 分以上的學生每一班都有，可以再比較各班的進步情形，找出值得分享的教學做法。"
        : "可以再比較各班的進步情形，找出值得分享的教學做法。",
      scaffold: "兩次段考的難度不一定相同，分數變化不全是學生能力的變化。",
    };
  }
  const OPS = {
    describe: { name: "成績分布", method: "描述統計", color: "var(--c-north)" },
    group: { name: "班級比較", method: "組間比較", color: "var(--c-south)" },
    trend: { name: "兩次段考進步", method: "趨勢・前後比較", color: "var(--c-east)" },
  };

  function chart(r, small) {
    const W = 420, H = small ? 170 : 210, L = 34, R = 8, T = 18, B = 30;
    const yMax = r.yMax || Math.ceil(Math.max(...r.bars.map(b => b[1])) / 10) * 10 || 10;
    const step = yMax <= 30 ? 10 : yMax <= 60 ? 20 : 25;
    const iw = W - L - R, ih = H - T - B, slot = iw / r.bars.length, bw = Math.min(64, slot * 0.58);
    const y = v => T + ih - (v / yMax) * ih;
    let g = "";
    for (let v = 0; v <= yMax; v += step) {
      g += `<line class="ax" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"${v ? ' opacity=".45"' : ""}/>`
        + `<text class="tk" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    }
    r.bars.forEach(([label, v], i) => {
      const x = L + slot * i + (slot - bw) / 2;
      g += `<rect class="bar${i === r.hi ? " hi" : ""}" x="${x}" y="${y(v)}" width="${bw}" height="${y(0) - y(v)}" rx="4" style="--d:${i * 0.07}s"/>`
        + `<text class="vl" x="${x + bw / 2}" y="${y(v) - 5}" text-anchor="middle">${v}</text>`
        + `<text class="tk" x="${x + bw / 2}" y="${H - 9}" text-anchor="middle">${esc(label)}</text>`;
    });
    g += `<text class="tk" x="${L - 6}" y="${T - 6}" text-anchor="end">${r.unit}</text>`;
    const label = `${r.caption}：${r.bars.map(([l, v]) => `${l} ${v}${r.unit}`).join("，")}`;
    return `<svg class="dchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${g}</svg>`;
  }

  /* ---------- 圖示 ---------- */
  const ICON = {
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13l2 2 4-4"/></svg>',
    stamp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 16v-4M11 16V9M15 16v-6"/></svg>',
    hand: '<svg viewBox="0 0 24 24" fill="#fff" stroke="#1E2B38" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5c0 3.6-2.4 6.5-6 6.5h-.6c-2.2 0-3.7-1-4.9-2.7L4.6 15a1.5 1.5 0 0 1 2.4-1.8L9 15.5"/></svg>',
  };

  /* ---------- 狀態與畫面 ---------- */
  const STEPS = {
    1: { title: "匯入資料", hint: "把檔案拖進匯入區（也可以直接點一下檔案）" },
    2: { title: "匯入資料・去識別", hint: "把「去識別」印章拖到資料表上（或點一下印章）" },
    3: { title: "分析工作區", hint: "選一塊起手式積木，拖進分析插槽（或點一下積木）" },
    4: { title: "分析工作區", hint: "把建議改寫拖到標紅的句子上（或點一下），再確認草稿" },
    5: { title: "報告", hint: "把結果卡片拖進報告（或點一下卡片）" },
    6: { title: "報告", hint: "完成了！可以換一塊積木再玩一次。" },
  };
  let st = { step: 1, op: null, fixed: false };
  let run = 0;   // 每次換畫面就遞增，讓還沒跑完的計時器自動作廢
  const later = (ms, fn) => { const r = run; setTimeout(() => { if (r === run) fn(); }, MOTION ? ms : Math.min(ms, 300)); };

  function table(deid) {
    const rows = students.slice(0, 5);
    const head = deid
      ? `<th class="h-code">學生代碼</th><th>班級</th><th>段考一</th><th>段考二</th>`
      : `<th class="h-sens" title="敏感：去識別時移除">姓名</th><th class="h-sens" title="敏感：去識別時移除">學號</th><th>班級</th><th>段考一</th><th>段考二</th>`;
    const body = rows.map(s => deid
      ? `<tr><td class="flip">${s.code}</td><td>${s.cls}</td><td>${s.e1}</td><td>${s.e2}</td></tr>`
      : `<tr><td class="mask">***</td><td class="mask">***</td><td>${s.cls}</td><td>${s.e1}</td><td>${s.e2}</td></tr>`).join("");
    return `<div class="dt-wrap"><table class="dt"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      <p class="dt-more">…共 ${N} 筆</p></div>`;
  }

  function resultCard(r, op, compact) {
    const o = OPS[op];
    return `<article class="rcard" style="--c:${o.color}">
      <header><b>#1</b> ${o.name}<span>${o.method}</span></header>
      ${chart(r, compact)}
      ${r.locked?.length ? `<p class="lock">${ICON.stamp}${r.locked.map(g => `${g.c} 班只有 ${g.n} 人`).join("、")}，依群體防護鎖不顯示（少於 ${LOCK} 人）。</p>` : ""}
      <p class="scaf"><b>判讀鷹架</b>${esc(r.scaffold)}</p>
    </article>`;
  }

  function draft(r) {
    return `<div class="draft">
      <p class="draft-h">AI 解讀草稿 <span>只根據上面的統計摘要寫成</span></p>
      <p>${esc(r.lead)} <span class="flag${st.fixed ? " fixed" : ""}" id="flag">${esc(st.fixed ? r.fix : r.flag)}</span></p>
      <p class="flag-note${st.fixed ? " ok" : ""}">${st.fixed ? `敘寫檢核：已依建議改寫（${r.rule}）` : `敘寫檢核：${r.rule}。${r.why}`}</p>
      ${st.fixed ? `<button type="button" class="btn btn-primary btn-sm" id="confirm">我確認這段說明</button>` : ""}
    </div>`;
  }

  function report(r) {
    const o = OPS[st.op], d = new Date();
    return `<div class="report-wrap"><article class="report" aria-label="報告預覽">
      <p class="rp-kicker">分析報告</p>
      <h4>七年級數學段考：${o.name}</h4>
      <p class="rp-meta">資料集：七年級數學段考（${N} 筆，已去識別）・${d.getFullYear() - 1911}.${d.getMonth() + 1}.${d.getDate()}</p>
      ${chart(r, true)}
      <p>${esc(r.lead)}${esc(r.fix)}</p>
      <p class="rp-scaf"><b>判讀提醒</b>${esc(r.scaffold)}</p>
      <p class="rp-foot">本報告使用去識別資料，學生以代碼表示；AI 草稿已經敘寫檢核，並由教師確認。示範資料為虛構。</p>
    </article>
    <div class="rp-side"><p class="done-msg">報告完成</p>
      <p class="muted">從匯入到報告，原始資料都沒有離開你的電腦；平台只收到去識別後的資料，AI 只看過統計摘要。</p>
      <div class="rp-acts">
        <button type="button" class="btn btn-primary btn-sm" id="again">換一塊積木再玩</button>
        <a class="btn btn-line btn-sm" href="#platform" data-link="platform">進入分析平台</a>
      </div></div></div>`;
  }

  function render() {
    run++;
    const s = st.step, body = $("win-body"), tray = $("tray");
    $("win-title").textContent = `AI 輔助教育數據分析平台・${STEPS[s].title}`;
    $("demo-hint").textContent = STEPS[s].hint;
    document.querySelectorAll("#demo-steps li").forEach(li => {
      const n = +li.dataset.step;
      li.classList.toggle("on", n < s || s === 6);
      li.classList.toggle("cur", n === s);
    });
    $("demo-back").disabled = s === 1;
    const r = st.op ? analyse(st.op) : null;

    if (s === 1) {
      tray.innerHTML = `<p class="tray-h">你的電腦</p>
        <button type="button" class="dg file" data-to="inbox">${ICON.file}<span><b>七年級數學段考.xlsx</b><small>${N} 筆・5 個欄位</small></span></button>`;
      body.innerHTML = `<div class="drop big" data-drop="inbox"><span>匯入區</span><small>把檔案拖到這裡，在瀏覽器裡開啟</small></div>`;
    }
    if (s === 2) {
      tray.innerHTML = `<p class="tray-h">工具</p>
        <button type="button" class="dg stamp" data-to="table">${ICON.stamp}<span><b>去識別</b><small>在你的電腦執行</small></span></button>`;
      body.innerHTML = `<p class="scan"><span class="chip-sens">含敏感 2 欄：姓名、學號</span><span class="chip-safe">安全 3 欄</span></p>
        <div class="drop tbl" data-drop="table">${table(false)}</div>
        <p class="muted small">檔案還在你的電腦裡；預覽時敏感欄位的值一律以 *** 遮罩。</p>`;
    }
    if (s === 3) {
      tray.innerHTML = `<p class="tray-h">起手式積木</p>` + Object.entries(OPS).map(([k, o]) =>
        `<button type="button" class="dg block" data-to="slot" data-op="${k}" style="--c:${o.color}"><b>${o.name}</b><small>${o.method}</small></button>`).join("");
      body.innerHTML = `<p class="ds-chip">${ICON.card}資料集：七年級數學段考・${N} 筆・已去識別</p>
        <div class="drop slot" data-drop="slot"><span>分析插槽</span><small>把一塊起手式積木拖到這裡</small></div>
        <p class="muted small">從這一步開始 AI 才會參與，而且只看得到統計摘要。</p>`;
    }
    if (s === 4) {
      tray.innerHTML = st.fixed ? `<p class="tray-h">建議改寫</p><p class="muted small">已套用。按右邊的「我確認這段說明」繼續。</p>`
        : `<p class="tray-h">敘寫檢核的建議改寫</p>
        <button type="button" class="dg fix" data-to="flag">${ICON.pen}<span>${esc(r.fix)}</span></button>`;
      body.innerHTML = `<div class="ws">${resultCard(r, st.op, true)}<div data-drop="flag">${draft(r)}</div></div>`;
      $("confirm")?.addEventListener("click", () => { st.step = 5; render(); });
    }
    if (s === 5) {
      tray.innerHTML = `<p class="tray-h">已確認的結果</p>
        <button type="button" class="dg cardthumb" data-to="report" style="--c:${OPS[st.op].color}">${ICON.card}<span><b>#1 ${OPS[st.op].name}</b><small>圖表＋說明＋判讀鷹架</small></span></button>`;
      body.innerHTML = `<div class="drop page" data-drop="report"><span>報告</span><small>把結果卡片拖到這裡</small></div>`;
    }
    if (s === 6) {
      tray.innerHTML = `<p class="tray-h">完成</p><p class="muted small">換一塊積木，可以看到不同的分析與敘寫檢核規則。</p>`;
      body.innerHTML = report(r);
      $("again").addEventListener("click", () => { st = { step: 3, op: null, fixed: false }; render(); });
      if (window.SITE_PLATFORM_URL) body.querySelector('[data-link="platform"]').href = window.SITE_PLATFORM_URL;
    }
    tray.querySelectorAll(".dg").forEach(armDrag);
    scheduleHint();
  }

  /* ---------- 放下之後 ---------- */
  function dropped(item) {
    const s = st.step;
    if (s === 1) {
      $("win-body").innerHTML = `<p class="scan"><span class="busy">敏感掃描中…</span></p>${table(false)}`;
      $("tray").innerHTML = `<p class="tray-h">你的電腦</p><p class="muted small">已在瀏覽器開啟，還沒有上傳。</p>`;
      later(1300, () => { st.step = 2; render(); });
    }
    if (s === 2) {
      $("win-body").innerHTML = `<p class="scan"><span class="chip-safe">已去識別：姓名、學號移除，改用學生代碼</span></p>
        ${table(true)}
        <p class="made">${ICON.stamp}已建立資料集「七年級數學段考」${N} 筆。去識別在你的電腦完成，只有去識別後的資料會匯入平台。</p>`;
      $("tray").innerHTML = `<p class="tray-h">工具</p><p class="muted small">去識別完成。</p>`;
      later(2400, () => { st.step = 3; render(); });
    }
    if (s === 3) {
      st.op = item.dataset.op;
      $("win-body").innerHTML = `<p class="ds-chip">${ICON.card}資料集：七年級數學段考・${N} 筆・已去識別</p>
        <div class="drop slot filled" style="--c:${OPS[st.op].color}"><span>${OPS[st.op].name}</span><small class="busy">平台計算中…</small></div>`;
      later(900, () => { st.step = 4; st.fixed = false; render(); });
    }
    if (s === 4) { st.fixed = true; render(); $("confirm")?.focus(); }
    if (s === 5) { st.step = 6; render(); }
  }

  /* ---------- 拖曳：滑鼠、觸控、點一下、鍵盤 ---------- */
  let hintTimer = null, hintAnim = null;
  function clearHint() { clearTimeout(hintTimer); hintAnim?.cancel(); document.querySelector(".hand")?.remove(); }
  function scheduleHint() {
    clearHint();
    if (!MOTION || st.step === 6) return;
    const r = run;
    hintTimer = setTimeout(() => { if (r === run) showHint(); }, 5000);
  }
  function targetOf(item) { return document.querySelector(`[data-drop="${item.dataset.to}"]`); }
  function center(el) { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }
  function inView(el) { const b = el.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight; }

  function showHint() {
    const item = $("tray").querySelector(".dg"), tgt = item && targetOf(item);
    if (!tgt || !inView(item) || !inView(tgt)) { scheduleHint(); return; }
    const hand = document.createElement("div");
    hand.className = "hand"; hand.innerHTML = ICON.hand;
    document.body.appendChild(hand);
    const [x0, y0] = center(item), [x1, y1] = center(tgt);
    tgt.classList.add("armed");
    hintAnim = hand.animate([
      { transform: `translate(${x0}px,${y0}px) scale(1)`, opacity: 0 },
      { transform: `translate(${x0}px,${y0}px) scale(.9)`, opacity: 1, offset: 0.15 },
      { transform: `translate(${x1}px,${y1}px) scale(.9)`, opacity: 1, offset: 0.75 },
      { transform: `translate(${x1}px,${y1}px) scale(1)`, opacity: 0 },
    ], { duration: 2000, easing: "ease-in-out", iterations: 2 });
    hintAnim.onfinish = () => { hand.remove(); tgt.classList.remove("armed"); scheduleHint(); };
  }

  function ghostOf(item) {
    const b = item.getBoundingClientRect(), g = item.cloneNode(true);
    g.classList.add("ghost"); g.removeAttribute("data-to"); g.setAttribute("aria-hidden", "true");
    Object.assign(g.style, { width: `${b.width}px`, left: `${b.left}px`, top: `${b.top}px` });
    document.body.appendChild(g);
    return g;
  }

  // 點一下（或鍵盤）：物件自己飛到目標
  function fly(item) {
    const tgt = targetOf(item); if (!tgt) return;
    clearHint();
    if (!MOTION) { dropped(item); return; }
    const g = ghostOf(item), [x0, y0] = center(item), [x1, y1] = center(tgt);
    item.classList.add("lifted"); tgt.classList.add("over");
    let done = false;
    const finish = () => { if (done) return; done = true; g.remove(); dropped(item); };
    g.animate([{ transform: "translate(0,0)" }, { transform: `translate(${x1 - x0}px,${y1 - y0}px) scale(.85)`, opacity: 0.4 }],
      { duration: 480, easing: "cubic-bezier(.4,.1,.2,1)" }).onfinish = finish;
    setTimeout(finish, 700);   // 動畫被中斷（例如分頁切到背景）時仍要完成這一步
  }

  function armDrag(item) {
    let start = null, g = null, dragging = false, moved = false;
    item.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      start = [e.clientX, e.clientY]; dragging = false; moved = false;
      item.setPointerCapture(e.pointerId);
    });
    item.addEventListener("pointermove", e => {
      if (!start) return;
      const dx = e.clientX - start[0], dy = e.clientY - start[1];
      if (!dragging && Math.hypot(dx, dy) > 6) {
        dragging = moved = true; clearHint();
        g = ghostOf(item); item.classList.add("lifted");
        targetOf(item)?.classList.add("armed");
      }
      if (!dragging) return;
      g.style.transform = `translate(${dx}px,${dy}px) rotate(-2deg)`;
      const under = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-drop]");
      targetOf(item)?.classList.toggle("over", under === targetOf(item));
    });
    const end = e => {
      if (!start) return;
      start = null;
      if (!dragging) return;
      dragging = false;
      const tgt = targetOf(item), under = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-drop]");
      tgt?.classList.remove("armed");
      if (tgt && under === tgt) { g.remove(); dropped(item); return; }
      // 放錯地方：彈回原位、輕輕晃一下
      tgt?.classList.remove("over");
      const back = g.animate([{ transform: g.style.transform }, { transform: "translate(0,0)" }], { duration: MOTION ? 260 : 0, easing: "ease-out" });
      let done = false;
      setTimeout(() => back.onfinish?.(), 500);
      back.onfinish = () => {
        if (done) return; done = true;
        g.remove(); item.classList.remove("lifted");
        if (MOTION) item.animate([{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: 260 });
        scheduleHint();
      };
    };
    item.addEventListener("pointerup", end);
    item.addEventListener("pointercancel", end);
    item.addEventListener("click", e => { if (moved) { moved = false; e.preventDefault(); return; } fly(item); });
  }

  /* ---------- 上一步／重新開始 ---------- */
  $("demo-back").addEventListener("click", () => {
    clearHint();
    if (st.step === 6) st.step = 5;
    else if (st.step === 5) { st.step = 4; st.fixed = true; }
    else if (st.step === 4) { st.step = 3; st.op = null; st.fixed = false; }
    else if (st.step > 1) st.step--;
    render();
  });
  $("demo-reset").addEventListener("click", () => { clearHint(); st = { step: 1, op: null, fixed: false }; render(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) clearHint(); });

  render();
})();
