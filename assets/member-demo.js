/* 會員功能示範：在原本的計畫網站上加一層「登入後才看得到」的內容。
   - 場次改由示範資料（之後是後端資料庫）提供，透過 app.js 的 SITE_HOOKS 接上
   - 首頁：你的下一步、場次上的報名按鈕、學習路徑、分析平台開通狀態
   - 個人頁：我的報名、研習證明、個人資料、證書查驗（沿用主站版型）
   需要先載入 portal-core.js，並放在 app.js 之前。 */
(function () {
'use strict';
const P = window.P;
const {esc, chip, stChip, note, U, SS, C, me, has, JOB, md} = P;
const CODE = {T:'P-T', A:'P-A', B:'P-B'};
const COURSE_OF = {'P-T':'T', 'P-A':'A', 'P-B':'B'};
const STATUS_TEXT = {open:'報名中', track:'報名中', invite:'縣市推薦中'};
const $ = s => document.querySelector(s);
const st = () => P.st;

/* ---------- 接到 app.js：場次資料與報名按鈕 ---------- */
window.SITE_HOOKS = {
  data(d) {
    const s = st();
    const time = c => c.hours === 3 ? '09:00–12:00' : c.hours === 6 ? '09:00–16:00' : '';
    return Object.assign({}, d, {
      '簡章': s.courses.map(c => ({'代號':CODE[c.id],'顯示':'是','分頁名稱':c.tab,'簡章標題':c.title,'年度':'115','狀態文字':STATUS_TEXT[c.elig],'簡章PDF':''})),
      '簡章條目': s.courses.flatMap(c => c.clauses.map(([k, v]) => ({'簡章代號':CODE[c.id],'條目名稱':k,'內容':v}))),
      '場次': s.sessions.filter(x => !P.ended(x)).map(x => ({'簡章代號':CODE[x.course],'區域':x.region+(x.track?'・'+JOB[x.track]+'軌':''),
        '第一天':x.date,'第二天':x.date2||'','時間':time(C(x.course)),'地點':x.venue,'報名表連結':'','顯示':'是',_sid:x.id}))
    });
  },
  // 場次表「狀態」欄位下方
  sessionCell(s) {
    const ps = SS(s._sid); if (!ps) return '';
    const u = me(), c = C(ps.course);
    if (!u) return c.elig === 'invite' ? '' : '<br><button type="button" class="p-link" data-pa="login">登入報名</button>';
    if (!has(u, 'learner')) return '';
    const r = st().regs.find(r => r.user === u.id && r.sess === ps.id && P.active(r));
    if (r) return '<br>' + stChip(r.status);
    const e = P.elig(u, ps);
    if (e.ok) return '<br><button type="button" class="p-link" data-pa="apply" data-id="' + ps.id + '">' + (e.full ? '登記備取' : '報名') + '</button>';
    return '<br><span class="why">' + esc(e.why) + '</span>';
  },
  // 地圖旁的區域卡
  sessionActions(s) {
    const ps = SS(s._sid); if (!ps) return '';
    const u = me(), c = C(ps.course);
    if (!u) return c.elig === 'invite'
      ? '<span class="why">縣市推薦制：受推薦者請點邀請信中的連結報名</span>'
      : '<button type="button" class="btn btn-primary btn-sm" data-pa="login">登入後報名</button>';
    if (!has(u, 'learner')) return '';
    const r = st().regs.find(r => r.user === u.id && r.sess === ps.id && P.active(r));
    if (r) return stChip(r.status) + '<button type="button" class="btn btn-line btn-sm" data-pa="page" data-v="myregs">查看我的報名</button>';
    const e = P.elig(u, ps);
    if (e.ok) return '<button type="button" class="btn btn-primary btn-sm" data-pa="apply" data-id="' + ps.id + '">' + (e.full ? '登記備取' : '我要報名') + '</button>';
    return '<button type="button" class="btn btn-ghost btn-sm" disabled>無法報名</button><span class="why">' + esc(e.why) + '</span>';
  }
};

/* ---------- 導覽列右上角：登入／帳號選單 ---------- */
function adminLinks(u) {
  const L = [];
  if (has(u, 'lecturer')) L.push(['teach', '講師工作台']);
  if (has(u, 'county')) L.push(['nominate', '縣市承辦後台']);
  if (has(u, 'staff')) L.push(['dash', '計畫管理後台']);
  return L;
}
function renderAcct() {
  const u = me(), box = $('#acct');
  if (!u) { box.innerHTML = '<button type="button" class="btn btn-line btn-sm" data-pa="login">登入</button>'; return; }
  const items = [];
  if (has(u, 'learner')) items.push(['myregs', '我的報名'], ['certs', '研習證明'], ['profile', '個人資料']);
  else items.push(['profile', '個人資料']);
  box.innerHTML = '<button type="button" class="av-btn" data-pa="menu" aria-expanded="false" aria-controls="acctmenu"><span class="av" aria-hidden="true">' + esc(u.name[0]) + '</span><span class="nm">' + esc(u.name) + '</span></button>'
    + '<div class="menu" id="acctmenu" hidden><div class="mh"><b>' + esc(u.name) + '</b><span>' + esc(u.org) + '</span></div>'
    + items.map(([v, t]) => '<button type="button" data-pa="page" data-v="' + v + '">' + t + '</button>').join('')
    + (adminLinks(u).length ? '<div class="sep"></div>' + adminLinks(u).map(([v, t]) => '<a href="admin-demo.html#' + v + '">' + t + ' →</a>').join('') : '')
    + '<div class="sep"></div><button type="button" data-pa="logout">登出</button></div>';
}
P.A.menu = (d, el) => {
  const m = $('#acctmenu'); if (!m) return;
  m.hidden = !m.hidden; el.setAttribute('aria-expanded', String(!m.hidden));
};
document.addEventListener('click', ev => {
  const m = $('#acctmenu');
  if (m && !m.hidden && !ev.target.closest('#acct')) m.hidden = true;
  if (ev.target.closest('#acctmenu [data-pa], #acctmenu a') && m) m.hidden = true;
});

/* ---------- Hero：你的下一步 ---------- */
function adminTodo(u) {
  const s = st(), out = [];
  if (has(u, 'staff')) {
    const pend = s.regs.filter(r => r.status === 'pending').length;
    const rev = s.reviews.filter(r => r.status === 'submitted').length;
    const grad = s.regs.filter(r => r.status === 'attended' || r.status === 'completed').length;
    out.push([chip('後台', 'teal'), '待審核報名 <b>' + pend + '</b>、待審講師認證 <b>' + rev + '</b>、待結業或登錄全教網 <b>' + grad + '</b> 人', '<a class="btn btn-line btn-sm" href="admin-demo.html#dash">進入計畫管理後台</a>']);
  }
  if (has(u, 'county')) {
    const mine = s.invites.filter(i => i.county === u.county && i.status !== 'withdrawn');
    out.push([chip('後台', 'teal'), u.county + '講師培訓推薦 <b>' + mine.length + ' / ' + P.QUOTA + '</b>，' + mine.filter(i => i.status === 'sent').length + ' 位尚未回應', '<a class="btn btn-line btn-sm" href="admin-demo.html#nominate">進入縣市承辦後台</a>']);
  }
  if (has(u, 'lecturer')) {
    const n = s.sessions.filter(x => x.lect === u.id && P.ended(x) && !x.roll).length;
    const next = s.sessions.filter(x => x.lect === u.id && !P.ended(x)).sort((a, b) => a.date < b.date ? -1 : 1)[0];
    out.push([chip('授課', 'teal'), (n ? '有 <b>' + n + '</b> 場研習待點名' : '沒有待點名的場次') + (next ? '；下一場授課 ' + esc(P.sessName(next)) : ''), '<a class="btn btn-line btn-sm" href="admin-demo.html#' + (n ? 'roll' : 'teach') + '">進入講師工作台</a>']);
  }
  return out;
}
function renderMine() {
  const u = me(), box = $('#mine');
  if (!u) { box.hidden = true; box.innerHTML = ''; return; }
  const s = st(), rows = [];
  if (has(u, 'learner')) {
    if (!u.verified) rows.push([chip('待辦', 'warn'), 'email 還沒驗證，驗證後才能報名。驗證信已寄到 ' + esc(u.email), '<button type="button" class="btn btn-line btn-sm" data-pa="mailbox">打開示範信箱</button>']);
    P.pendingInvites(u).forEach(i => rows.push([chip('邀請', 'warn'), '<b>' + esc(i.county) + '</b>推薦你參加「' + esc(C(i.course).name) + '」', '<button type="button" class="btn btn-primary btn-sm" data-pa="accept" data-id="' + i.id + '">接受邀請</button>']));
    s.regs.filter(r => r.user === u.id && P.active(r) && !P.ended(SS(r.sess)) && !['completed', 'reported'].includes(r.status))
      .sort((a, b) => SS(a.sess).date < SS(b.sess).date ? -1 : 1)
      .forEach(r => { const x = SS(r.sess), n = P.daysTo(x.date);
        rows.push([stChip(r.status), esc(C(x.course).name) + '・' + esc(x.region) + ' ' + md(x.date) + '<span class="muted">・還有 ' + n + ' 天</span>', '<button type="button" class="btn btn-ghost btn-sm" data-pa="page" data-v="myregs">查看</button>']); });
    const acc = s.invites.find(i => i.user === u.id && i.status === 'accepted' && !P.myReg(u.id, i.course) && !P.done(u.id, i.course));
    if (acc) rows.push([chip('下一步', 'info'), '你已接受推薦，可以報名「' + esc(C(acc.course).name) + '」了', '<button type="button" class="btn btn-primary btn-sm" data-pa="seeCourse" data-code="' + CODE[acc.course] + '">選擇場次</button>']);
    if (!P.done(u.id, 'A') && !P.myReg(u.id, 'A')) rows.push([chip('下一步', 'info'), '從初階研習「資料素養基礎與解讀」開始', '<button type="button" class="btn btn-line btn-sm" data-pa="seeCourse" data-code="P-A">看初階場次</button>']);
    else if (P.done(u.id, 'A') && !P.done(u.id, 'B') && !P.myReg(u.id, 'B')) rows.push([chip('下一步', 'info'), '你已完成初階，可以報名進階研習（' + esc(JOB[u.job] || '') + '軌）', '<button type="button" class="btn btn-line btn-sm" data-pa="seeCourse" data-code="P-B">看進階場次</button>']);
    if (P.entitled(u.id)) rows.push([chip('已開通', 'good'), 'AI 輔助分析平台已開通，用同一組帳號直接進入', '<button type="button" class="btn btn-line btn-sm" data-pa="enter">進入分析平台</button>']);
  }
  rows.push(...adminTodo(u));
  if (!rows.length) rows.push(['', '<span class="muted">目前沒有待辦事項。</span>', '']);
  box.hidden = false;
  box.innerHTML = '<div class="mine-h"><span class="label">你的下一步</span><span class="who">' + esc(u.name) + '・' + esc(u.org) + '</span></div>'
    + '<ul class="mine-list">' + rows.map(([c, t, a]) => '<li><span class="c">' + c + '</span><span class="t">' + t + '</span><span class="a">' + a + '</span></li>').join('') + '</ul>'
    + note('登入後首頁還是同一頁，只是在這裡多一塊「你的下一步」：待接受的邀請、報名進度、下一門該上的課。');
}

/* ---------- 課程介紹：研習路徑 ---------- */
function renderPath() {
  const u = me(), learner = has(u, 'learner'), s = st();
  const node = (state, k, title, sub, act) => '<li class="pn ' + state + '"><button type="button" ' + act + '><span class="k">' + (state === 'done' ? '✓' : k) + '</span><span class="tt">' + title + '</span><span class="ss">' + sub + '</span></button></li>';
  const stateOf = cid => {
    if (!learner) return ['', ''];
    if (P.done(u.id, cid)) return ['done', '已結業'];
    const r = P.myReg(u.id, cid); if (r) return ['now', P.ST[r.status][0]];
    if (cid === 'T' && s.invites.some(i => i.user === u.id && i.status === 'accepted')) return ['now', '已受推薦'];
    return ['', ''];
  };
  const [a, at] = stateOf('A'), [b, bt] = stateOf('B'), [t, tt] = stateOf('T');
  const pl = learner && P.entitled(u.id) ? ['done', '已開通'] : ['', ''];
  $('#path').innerHTML = '<h3>' + (learner ? '你的研習進度' : '研習路徑') + '</h3><ol class="pathl">'
    + node(a, 1, '初階研習', at || '3 小時・不限資格', 'data-pa="seeCourse" data-code="P-A"')
    + node(b, 2, '進階研習', bt || '6 小時・依職務分流', 'data-pa="seeCourse" data-code="P-B"')
    + node(pl[0], 3, 'AI 分析平台', pl[1] || '完成進階後自動開通', 'data-pa="toPlatform"')
    + '</ol><div class="pathside">'
    + node(t, '＋', '講師培訓', tt || '12 小時・縣市推薦', 'data-pa="seeCourse" data-code="P-T"').replace('<li', '<div').replace('</li>', '</div>')
    + '</div>'
    + note('學習路徑讓第一次來的人一眼看懂「先上什麼、再上什麼、上完可以做什麼」；登入後同一張圖會標出自己走到哪裡。');
}

/* ---------- 分析平台區塊 ---------- */
function renderPlatform() {
  const u = me(), box = $('#plat-acts');
  if (!u) box.innerHTML = '<button type="button" class="btn btn-primary" data-pa="login">登入分析平台</button><small>完成進階研習的學員，用網站同一組帳號登入</small>';
  else if (P.entitled(u.id) || has(u, 'staff')) box.innerHTML = '<button type="button" class="btn btn-primary" data-pa="enter">進入分析平台</button><small>' + chip('已開通', 'good') + ' 不用再登入一次</small>';
  else if (has(u, 'learner')) {
    const a = P.done(u.id, 'A'), b = P.done(u.id, 'B');
    box.innerHTML = '<div class="plat-lock"><b>完成以下研習後自動開通</b><ul class="checks"><li><span class="tick ' + (a ? 'ok' : '') + '">' + (a ? '✓' : '1') + '</span>初階研習</li><li><span class="tick ' + (b ? 'ok' : '') + '">' + (b ? '✓' : '2') + '</span>進階研習（' + esc(JOB[u.job] || '對應職務') + '軌）</li></ul></div>'
      + '<button type="button" class="btn btn-line btn-sm" data-pa="seeCourse" data-code="' + (a ? 'P-B' : 'P-A') + '">看' + (a ? '進階' : '初階') + '場次</button>';
  } else box.innerHTML = '<small>此身分沒有分析平台帳號</small>';
  $('#plat-note').innerHTML = note('開通條件存成資料，沒有寫死在程式裡：目前是「完成任一進階研習，或具講師資格」。之後要開放試用、設期限、或讓某個縣市整批開通，只要改規則。');
}

/* ---------- 個人頁 ---------- */
const PAGES = {myregs:'我的報名', certs:'研習證明', profile:'個人資料', verify:'證書查驗'};
function pageHead(k, sub) {
  const u = me();
  const tabs = u && has(u, 'learner') && k !== 'verify'
    ? '<div class="btabs mtabs" role="tablist">' + ['myregs', 'certs', 'profile'].map(v => '<button type="button" class="btab" role="tab" aria-selected="' + (v === k) + '" data-pa="page" data-v="' + v + '">' + PAGES[v] + '</button>').join('') + '</div>' : '';
  return '<button type="button" class="p-link back" data-pa="home">← 回首頁</button><div class="sec-head"><h2>' + PAGES[k] + '</h2>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div>' + tabs;
}
const PV = {};
PV.myregs = u => {
  const list = st().regs.filter(r => r.user === u.id).sort((a, b) => SS(a.sess).date < SS(b.sess).date ? 1 : -1);
  let h = pageHead('myregs', '每筆報名目前走到哪一步。');
  h += note('一條狀態線走到底：報名 → 審核 → 出席 → 結業 → 登錄全教網。學員隨時看得到卡在哪一步，承辦不用一一回覆詢問。');
  if (!list.length) return h + '<div class="m-card"><p>還沒有報名紀錄。<button type="button" class="p-link" data-pa="seeCourse" data-code="P-A">看初階場次</button></p></div>';
  const steps = ['報名', '審核錄取', '出席', '結業', '登錄全教網'];
  const pos = {pending:1, waitlist:1, admitted:2, attended:3, completed:4, reported:5};
  list.forEach(r => {
    const s = SS(r.sess), p = pos[r.status];
    const tl = p == null ? '' : '<ol class="tl">' + steps.map((t, i) => '<li class="' + (i < p ? 'done' : i === p ? 'now' : '') + '">' + t + '</li>').join('') + '</ol>';
    const canCancel = ['pending', 'admitted', 'waitlist'].includes(r.status) && !P.ended(s);
    h += '<div class="m-card"><div class="row" style="justify-content:space-between"><div><h3>' + esc(C(s.course).name) + '</h3><p class="small muted">' + esc(P.sessName(s)) + '・' + esc(s.venue) + '</p></div><div class="row">' + stChip(r.status) + (canCancel ? '<button type="button" class="btn btn-danger btn-sm" data-pa="cancel" data-id="' + r.id + '">取消報名</button>' : '') + '</div></div>' + tl + (r.files ? '<p class="small muted" style="margin-top:8px">已附先修證明：' + r.files.map(esc).join('、') + '</p>' : '') + '</div>';
  });
  return h;
};
PV.certs = u => {
  const list = st().certs.filter(c => c.user === u.id);
  let h = pageHead('certs', '結業後自動產生。每張都有查驗碼，可以給學校或縣市核對。');
  h += note('任何人都能在頁尾的「證書查驗」輸入查驗碼核對真偽。正式版的查驗碼要用不可預測的亂碼，避免被人猜出來。');
  if (!list.length) return h + '<div class="m-card"><p>還沒有研習證明，完成研習並結業後會出現在這裡。</p></div>';
  return h + '<div class="p-tw"><table><thead><tr><th>研習</th><th>日期</th><th>時數</th><th>查驗碼</th><th></th></tr></thead><tbody>'
    + list.map(c => '<tr><td>' + esc(c.title) + '</td><td class="num">' + esc(c.date) + '</td><td class="num">' + c.hours + '</td><td class="code">' + esc(c.code) + '</td><td><button type="button" class="btn btn-line btn-sm" data-pa="cert" data-id="' + esc(c.code) + '">檢視</button></td></tr>').join('')
    + '</tbody></table></div><p class="small muted">累計研習時數 <b class="num">' + list.reduce((a, c) => a + c.hours, 0) + '</b> 小時</p>';
};
PV.profile = u => {
  let h = pageHead('profile');
  h += '<div class="m-card"><form class="f" data-pform="profile"><div class="fgrid">'
    + '<div class="fld"><label for="p-name">姓名</label><input id="p-name" name="name" type="text" value="' + esc(u.name) + '" required></div>'
    + '<div class="fld"><span class="lb">Email</span><div class="row"><span>' + esc(u.email) + '</span>' + (u.verified ? chip('已驗證', 'good') : chip('未驗證', 'warn')) + '</div></div>'
    + (has(u, 'learner') ? '<div class="fld"><label for="p-job">職務</label><select id="p-job" name="job">' + Object.entries(JOB).map(([k, v]) => '<option value="' + k + '"' + (u.job === k ? ' selected' : '') + '>' + v + '</option>').join('') + '</select><span class="help">決定你能報哪一個進階分流。</span></div>' : '')
    + '<div class="fld"><label for="p-title">職稱</label><input id="p-title" name="title" type="text" value="' + esc(u.title) + '"></div>'
    + '<div class="fld"><label for="p-org">服務單位</label><input id="p-org" name="org" type="text" value="' + esc(u.org) + '"></div>'
    + '</div><div class="row"><button class="btn btn-primary btn-sm" type="submit">儲存</button></div></form></div>'
    + '<div class="m-card tint"><h3>教育雲端帳號</h3><div class="row" style="margin-top:6px"><span class="muted small">尚未綁定。綁定後可以用教育雲端帳號直接登入。</span><button type="button" class="btn btn-ghost btn-sm" disabled>綁定（規劃中）</button></div></div>';
  h += note('職務目前由使用者自己填，承辦在報名審核時把關。也可以改成由學校或縣市確認，要看行政負擔能不能接受。');
  return h;
};
PV.verify = () => {
  const ex = st().certs[0] ? st().certs[0].code : '';
  return pageHead('verify', '輸入研習證明上的查驗碼，確認證明是否由本計畫核發。')
    + '<div class="m-card"><form class="f" data-pform="verify"><div class="fld"><label for="v-code">查驗碼</label><input id="v-code" name="code" type="text" placeholder="例如 ' + esc(ex) + '" required><span class="help">示範用查驗碼：<span class="code">' + esc(ex) + '</span></span></div><div class="row"><button class="btn btn-primary btn-sm" type="submit">查驗</button></div></form><div id="vres" style="margin-top:14px"></div></div>'
    + note('查驗結果只顯示遮罩過的姓名、課程、日期與時數，不露出服務單位或聯絡方式。');
};
function renderPage() {
  const s = st(), u = me();
  if (s.page && s.page !== 'verify' && !u) s.page = null;
  if (s.page && !PV[s.page]) s.page = null;
  document.body.classList.toggle('mpage', !!s.page);
  $('#member').hidden = !s.page;
  $('#member').innerHTML = s.page ? '<div class="wrap">' + PV[s.page](u) + '</div>' : '';
}

/* ---------- 動作 ---------- */
P.A.page = d => { st().page = d.v; P.render(); window.scrollTo(0, 0); };
P.A.home = () => { st().page = null; P.render(); window.scrollTo(0, 0); };
P.A.seeCourse = d => {
  st().page = null; P.closeModal(); P.render();
  const t = document.querySelector('.btab[data-code="' + d.code + '"]');
  if (t && t.getAttribute('aria-selected') !== 'true') t.click();
  document.getElementById('sessions').scrollIntoView({behavior: 'smooth'});
};
P.A.toPlatform = () => document.getElementById('platform').scrollIntoView({behavior: 'smooth'});
P.afterInvite = i => P.A.seeCourse({code: CODE[i.course]});
P.FORM.profile = fd => {
  const u = me(), old = u.job;
  ['name', 'title', 'org'].forEach(k => u[k] = fd.get(k).trim());
  if (fd.get('job')) u.job = fd.get('job');
  P.render(); P.toast(old !== u.job ? '已儲存。職務已變更，可報名的進階分流也會跟著變。' : '已儲存');
};
P.FORM.verify = fd => {
  const code = fd.get('code').trim().toUpperCase(), c = st().certs.find(x => x.code === code);
  $('#vres').innerHTML = c
    ? '<div class="m-card tint"><div class="row">' + chip('有效證明', 'good') + '<span class="code">' + esc(c.code) + '</span></div><p style="margin-top:6px"><b>' + esc(P.mask(U(c.user).name)) + '</b>・' + esc(c.title) + '・' + esc(c.date) + '・' + c.hours + ' 小時</p></div>'
    : '<p class="why">查無此查驗碼。請確認大小寫與連字號是否正確。</p>';
};
// 在個人頁時點導覽列：先回到首頁，再讓瀏覽器捲到對應段落
document.addEventListener('click', ev => {
  const a = ev.target.closest('.nav a');
  if (a && st().page) { st().page = null; P.render(); }
});

/* ---------- 繪製 ---------- */
P.render = function () {
  P.renderBar(['admin-demo.html', '後台示範 →']);
  renderAcct(); renderMine(); renderPath(); renderPlatform(); renderPage();
  $('#sess-note').innerHTML = note('開放線上報名後，場次改由承辦在後台建立，網站即時顯示名額與每個人的報名狀態；最新消息、常見問題仍由 Google 試算表維護。');
  if (window.SITE_RERENDER) window.SITE_RERENDER();
  P.save();
};
P.render();
})();
