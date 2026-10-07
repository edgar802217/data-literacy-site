/* 入口網示範：網站（member-demo.html）與後台（admin-demo.html）共用的示範資料與流程。
   資料全部存在瀏覽器的 localStorage，不會送到任何伺服器。
   對外只露出 window.P；畫面上的按鈕用 data-pa（動作）、data-pchg（下拉選單）、data-pform（表單）接到 P.A / P.CHG / P.FORM。 */
(function () {
'use strict';
const TODAY = '2026-10-07';
const KEY = 'dl-portal-demo-v2';
const JOB = {teacher:'學校教師', school_admin:'學校行政', county_admin:'縣市行政'};
const ST = {
  pending:['待審核','warn'], admitted:['已錄取','info'], waitlist:['備取','warn'], rejected:['未錄取','bad'],
  cancelled:['已取消',''], attended:['已出席','teal'], absent:['缺席','bad'], completed:['已結業','good'], reported:['已登錄全教網','good']
};
const ELIG = {
  open:['不限資格','已驗證 email 的帳號都能報名'],
  track:['依職務分流','依帳號上的職務選擇分流，且須先完成初階研習'],
  invite:['縣市推薦制','僅限收到推薦邀請的人報名']
};
const COUNTIES = ['臺北市','新北市','桃園市','臺中市','臺南市','高雄市','屏東縣','花蓮縣','宜蘭縣','新竹縣'];
const QUOTA = 4;

/* ---------- 示範資料 ---------- */
function seed() {
  const users = [
    {id:'u1',name:'王小明',email:'wang.hm@kh.edu.tw',verified:true,job:'teacher',title:'教師',org:'高雄市立前鎮國中',county:'高雄市',roles:['learner'],persona:'一般學員（教師）',
      hint:'王小明已完成初階、進階教師軌待審核。看看首頁的「你的下一步」和研習場次上的狀態；再切到<b>計畫承辦</b>到後台錄取他。'},
    {id:'u2',name:'林佳慧',email:'lin.jh@tn.edu.tw',verified:true,job:'school_admin',title:'教務主任',org:'臺南市永康區永康國小',county:'臺南市',roles:['learner'],persona:'學校行政（已開通分析平台）',
      hint:'林佳慧已完成進階研習，首頁的<b>分析平台</b>區塊會顯示已開通；她也被臺南市推薦參加講師培訓。'},
    {id:'u3',name:'陳怡君',email:'yijun.chen@gmail.com',verified:true,job:'school_admin',title:'教務主任',org:'屏東縣潮州鎮潮州國小',county:'屏東縣',roles:['learner'],persona:'被縣市推薦（邀請尚未接受）',
      hint:'陳怡君的推薦邀請寄到學校信箱，但她是用 Gmail 註冊的。打開上方<b>示範信箱</b>點她的邀請信，看邀請怎麼綁到現有帳號。'},
    {id:'u4',name:'張志豪',email:'chang.ch@kh.edu.tw',verified:true,job:'teacher',title:'教師',org:'高雄市立鳳山國中',county:'高雄市',roles:['learner','lecturer'],persona:'講師',
      lect:{until:'2028-07-05',regions:['南區'],tags:['描述統計','資料視覺化','學習扶助資料'],bio:'國中數學教師，114 年試辦場結訓。'},
      hint:'張志豪是講師。右上角選單可以進入<b>講師工作台</b>：10/4 南區初階場還沒點名。'},
    {id:'u5',name:'黃淑芬',email:'huang.sf@kh.edu.tw',verified:true,job:'county_admin',title:'科長',org:'高雄市政府教育局',county:'高雄市',roles:['county'],persona:'縣市承辦（高雄市）',
      hint:'黃淑芬是高雄市承辦。右上角選單進入<b>縣市承辦後台</b>推薦講師培訓人選，系統會自動寄出邀請信。'},
    {id:'u6',name:'李宜蓁',email:'office@dl-project.example',verified:true,job:null,title:'專任助理',org:'教育資料素養提升計畫辦公室',county:'',roles:['staff'],persona:'計畫承辦（管理者）',
      hint:'計畫承辦。右上角選單進入<b>計畫管理後台</b>：審核報名、核發結業、匯出全教網名單、審查講師認證。'}
  ];
  const F = [
    ['f1','吳俊賢','school_admin','學務主任','高雄市立五福國中','高雄市'],
    ['f3','蘇建宏','school_admin','教務主任','高雄市立中正高中','高雄市'],
    ['f4','許雅雯','teacher','教師','臺中市立大墩國中','臺中市'],
    ['f5','鄭雅文','teacher','教師','臺北市立中山國中','臺北市'],
    ['f6','楊志明','teacher','教師','高雄市立前鎮國小','高雄市'],
    ['f7','郭怡婷','teacher','教師','屏東縣屏東市屏東國小','屏東縣'],
    ['f8','劉建志','school_admin','總務主任','高雄市立鼓山國小','高雄市'],
    ['f9','何佩珊','teacher','教師','臺南市立後甲國中','臺南市'],
    ['f10','謝宗翰','teacher','教師','高雄市立三民國中','高雄市'],
    ['f11','羅淑娟','school_admin','輔導主任','屏東縣內埔鄉內埔國小','屏東縣'],
    ['f12','洪家豪','teacher','教師','高雄市立左營國中','高雄市'],
    ['f13','曾美玲','teacher','教師','臺南市立建興國中','臺南市'],
    ['f14','廖俊傑','county_admin','股長','臺中市政府教育局','臺中市'],
    ['f15','賴宛如','teacher','教師','高雄市立苓雅國中','高雄市'],
    ['f16','周志偉','school_admin','教務主任','臺中市立惠文高中','臺中市']
  ];
  F.forEach(([id,name,job,title,org,county]) => users.push({id,name,email:id+'@example.edu.tw',verified:true,job,title,org,county,roles:['learner']}));
  const f5 = users.find(u => u.id === 'f5');
  f5.roles.push('lecturer');
  f5.lect = {until:'2028-07-05',regions:['北區'],tags:['問卷分析','縣市資料'],bio:''};

  const courses = [
    {id:'T',level:'講師培訓',name:'學校行政講師培訓工作坊（115 年）',tab:'學校行政講師培訓',title:'教育資料素養講師培訓工作坊（學校行政）簡章',hours:12,elig:'invite',proof:['A1','A2','B5-1'],
      desc:'兩天共 12 小時。結訓後繳交公版簡報與試教影片，審查通過取得講師資格（效期 2 年）。',
      clauses:[
        ['參加對象','由各縣市推薦之學校行政講師人選，可為跨局處行政人員或校長。'],
        ['參加資格','已完成 A1、A2 及 B5-1 研習，報名時上傳研習證明。'],
        ['報名方式','採縣市推薦制。縣市承辦在入口網推薦後，被推薦人會收到邀請信，點信中的連結登入或註冊即可報名。'],
        ['課程安排','・第一天：初階「資料素養基礎與解讀」3 小時＋講師培訓前置 3 小時\n・第二天：進階「教育數據分析與應用」6 小時'],
        ['場次與地點','【場次表】'],
        ['講師資格認證','1. 完成兩天培訓（共 12 小時）\n2. 繳交公版簡報及試教影片，由計畫團隊審查\n3. 審查通過取得講師資格，效期 2 年\n4. 參與講師實作交流會']]},
    {id:'A',level:'初階',name:'資料素養基礎與解讀',tab:'初階研習',title:'教育資料素養研習（初階）簡章',hours:3,elig:'open',
      desc:'看懂常見的教育統計，學會提出好的資料問題。',
      clauses:[
        ['參加對象','縣市行政人員、校長主任與教師，不限資格。'],
        ['報名方式','登入後在下方場次表直接報名（需先完成 email 驗證）。錄取結果會寄信通知。'],
        ['研習時數','3 小時。結業後由計畫登錄全教網研習時數，並可在入口網下載研習證明。'],
        ['場次與地點','【場次表】']]},
    {id:'B',level:'進階',name:'教育數據分析與應用',tab:'進階研習',title:'教育資料素養研習（進階）簡章',hours:6,elig:'track',
      desc:'依職務分流，用自己單位的資料實作分析。三個分流分開開班。',
      clauses:[
        ['參加對象','已完成初階研習者。依職務分為縣市行政、學校行政、學校教師三個分流。'],
        ['報名方式','登入後選擇與帳號職務相符的分流場次報名，承辦審核後寄信通知。'],
        ['研習時數','6 小時。結業後自動開通 AI 輔助教育數據分析平台。'],
        ['場次與地點','【場次表】']]}
  ];
  const S = (id,course,region,date,venue,cap,open,lect,x={}) => Object.assign({id,course,region,date,venue,cap,open,lect,roll:false},x);
  const sessions = [
    S('A0','A','南區','2026-09-12','國立高雄師範大學',60,false,'u4',{roll:true}),
    S('A1','A','南區','2026-10-04','國立高雄師範大學',60,false,'u4'),
    S('A2','A','北區','2026-10-17','國立臺北教育大學',60,true,'f5'),
    S('A3','A','南區','2026-10-24','國立高雄師範大學',60,true,'u4'),
    S('A4','A','中區','2026-10-25','國立臺中教育大學',60,true,null),
    S('B0','B','南區','2026-08-22','國立臺南大學',40,false,'u4',{track:'school_admin',roll:true}),
    S('B1','B','中區','2026-11-07','國立臺中教育大學',40,true,null,{track:'school_admin'}),
    S('B2','B','南區','2026-11-14','國立高雄師範大學',40,true,'u4',{track:'teacher'}),
    S('B3','B','北區','2026-11-21','國立臺北教育大學',30,true,'f5',{track:'county_admin'}),
    S('TC','T','中區','2026-10-31','國立臺中教育大學',30,true,null,{date2:'2026-11-21'}),
    S('TN','T','北區','2026-11-01','國立臺北教育大學',30,true,'f5',{date2:'2026-11-22'}),
    S('TS','T','南區','2026-11-07','國立高雄師範大學',30,true,null,{date2:'2026-12-05'}),
    S('TE','T','東區','2026-11-08','福容大飯店花蓮店',30,true,null,{date2:'2026-11-29'})
  ];
  let n = 0;
  const regs = [];
  const R = (user,sess,status,x={}) => regs.push(Object.assign({id:'r'+(++n),user,sess,status,at:'2026-09-0'+(1+n%8),meal:'葷',idm:fakeId(n),note:''},x));
  ['u1','u2','u3','f6','f7','f8','f9'].forEach(u => R(u,'A0','reported',{at:'2026-08-20'}));
  ['f10','f11','f12','f13','f15','f16','f1','f3'].forEach(u => R(u,'A1','admitted',{at:'2026-09-15'}));
  R('f14','A3','pending',{at:'2026-10-03'});
  R('f4','A3','admitted',{at:'2026-09-29'});
  ['u2','f8'].forEach(u => R(u,'B0','completed',{at:'2026-08-01'}));
  R('u1','B2','pending',{at:'2026-10-02',note:'想分析學習扶助測驗的班級落差'});
  R('f6','B2','pending',{at:'2026-10-03'});
  R('f7','B2','pending',{at:'2026-10-05',note:'學校剛導入平板，想看使用紀錄'});
  R('u2','TS','admitted',{at:'2026-10-01',files:['A1_研習證明.pdf','A2_研習證明.pdf','B5-1_研習證明.pdf']});
  R('f1','TS','pending',{at:'2026-10-04',files:['A1A2_研習證明.pdf','B5-1_研習證明.pdf']});
  R('f16','TC','pending',{at:'2026-10-05',files:['A1_研習證明.pdf']});

  const invites = [
    {id:'i1',course:'T',county:'高雄市',name:'吳俊賢',email:'f1@example.edu.tw',org:'高雄市立五福國中',status:'accepted',user:'f1',by:'u5',sent:'2026-09-30'},
    {id:'i2',course:'T',county:'高雄市',name:'蔡雅婷',email:'tsai.yt@kh.edu.tw',org:'高雄市立鼓山高中',status:'sent',user:null,by:'u5',sent:'2026-09-30'},
    {id:'i3',course:'T',county:'臺南市',name:'林佳慧',email:'lin.jh@tn.edu.tw',org:'臺南市永康區永康國小',status:'accepted',user:'u2',by:null,sent:'2026-09-29'},
    {id:'i4',course:'T',county:'屏東縣',name:'陳怡君',email:'chen.yj@mail.ptc.edu.tw',org:'屏東縣潮州鎮潮州國小',status:'sent',user:null,by:null,sent:'2026-10-01'},
    {id:'i5',course:'T',county:'臺中市',name:'周志偉',email:'f16@example.edu.tw',org:'臺中市立惠文高中',status:'accepted',user:'f16',by:null,sent:'2026-09-30'},
    {id:'i6',course:'T',county:'臺中市',name:'江明哲',email:'chiang.mz@tc.edu.tw',org:'臺中市立居仁國中',status:'sent',user:null,by:null,sent:'2026-09-30'}
  ];
  const s = {users,courses,sessions,regs,invites,certs:[],ents:[],reviews:[],mails:[],seq:0,
    cur:'u1',notes:true,view:null,page:null,rollSid:null,rollMarks:{},reviewFilter:'pending'};
  regs.filter(r => r.status === 'completed' || r.status === 'reported').forEach(r => issueCert(s,r));
  s.certs.push({code:certCode(++s.seq),user:'u4',title:'學校行政講師培訓工作坊（114 年試辦）',hours:12,date:'2026-07-05'});
  s.certs.push({code:certCode(++s.seq),user:'f5',title:'學校行政講師培訓工作坊（114 年試辦）',hours:12,date:'2026-07-05'});
  s.ents = [
    {user:'u2',src:'完成進階研習（學校行政軌）',date:'2026-08-22'},
    {user:'f8',src:'完成進階研習（學校行政軌）',date:'2026-08-22'},
    {user:'u4',src:'具講師資格',date:'2026-07-05'},
    {user:'f5',src:'具講師資格',date:'2026-07-05'}
  ];
  s.reviews = [
    {id:'v1',user:'f3',cohort:'114 年試辦場（南區）',at:'2026-09-28',files:['公版簡報_蘇建宏.pptx','試教影片（雲端連結）'],status:'submitted'},
    {id:'v2',user:'f4',cohort:'114 年試辦場（中區）',at:'2026-10-02',files:['公版簡報_許雅雯.pptx','試教影片（雲端連結）'],status:'submitted'}
  ];
  invites.filter(i => i.status === 'sent').forEach(i => inviteMail(s,i));
  return s;
}
function fakeId(n){const L='EFSDABTHK';return L[n%L.length]+(n%2?'1':'2')+'2****'+String(100+(n*37)%900)}
function certCode(seq){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let x=seq*7919+1237,s='';for(let i=0;i<5;i++){s+=A[x%A.length];x=Math.floor(x/A.length)+seq*31}return 'DL115-'+s}
function issueCert(s,r){
  const ss=s.sessions.find(x=>x.id===r.sess), c=s.courses.find(x=>x.id===ss.course);
  if(s.certs.some(x=>x.reg===r.id))return;
  s.certs.push({code:certCode(++s.seq),user:r.user,reg:r.id,title:c.level+'研習「'+c.name+'」'+(ss.track?'（'+JOB[ss.track]+'軌）':''),hours:c.hours,date:ss.date2||ss.date});
}
function addMail(s,to,subject,body,action){s.mails.unshift({id:'m'+Date.now()+Math.random().toString(36).slice(2,6),to,date:TODAY,subject,body,action})}
function inviteMail(s,i){
  const c=s.courses.find(x=>x.id===i.course);
  addMail(s,i.email,'【教育資料素養提升計畫】'+i.county+'推薦您參加'+c.name,
    i.name+' 您好：\n'+i.county+'推薦您參加「'+c.name+'」。請點下方按鈕接受邀請：\n・還沒有帳號：直接註冊，email 會自動帶入並視為已驗證\n・已經有帳號：登入後，邀請會綁到您的帳號（帳號 email 不同也可以）\n此連結 14 天內有效，只能使用一次。',
    {type:'invite',id:i.id,label:'接受邀請'});
  s.mails[0].date=i.sent;
}

/* ---------- 狀態存取 ---------- */
let st;
function load(){try{const raw=localStorage.getItem(KEY);if(raw){const x=JSON.parse(raw);if(x&&x.users){st=x;return}}}catch(e){}st=seed()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}}
// 另一個分頁（網站／後台）改了資料時跟著更新
addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{st=JSON.parse(e.newValue);P.render()}catch(err){}}});

/* ---------- 小工具 ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const U=id=>st.users.find(u=>u.id===id);
const SS=id=>st.sessions.find(s=>s.id===id);
const C=id=>st.courses.find(c=>c.id===id);
const me=()=>st.cur?U(st.cur):null;
const has=(u,r)=>!!u&&u.roles.includes(r);
const isAdmin=u=>has(u,'staff')||has(u,'county')||has(u,'lecturer');
function md(d){if(!d)return'';const t=new Date(d+'T00:00:00');return (t.getMonth()+1)+'/'+t.getDate()+'（'+'日一二三四五六'[t.getDay()]+'）'}
function daysTo(d){return Math.round((new Date(d+'T00:00:00')-new Date(TODAY+'T00:00:00'))/864e5)}
function chip(t,k){return '<span class="chip '+(k||'')+'">'+esc(t)+'</span>'}
function stChip(s){const m=ST[s];return chip(m[0],m[1])}
function note(t){return st.notes?'<div class="note"><b>討論</b><span>'+t+'</span></div>':''}
function ended(s){return (s.date2||s.date)<TODAY}
function sessWhen(s){return md(s.date)+(s.date2?'、'+md(s.date2):'')}
function sessName(s){const c=C(s.course);return c.level+(s.track?'・'+JOB[s.track]+'軌':'')+'｜'+s.region+' '+sessWhen(s)}
function active(r){return !['cancelled','rejected'].includes(r.status)}
function taken(s){return st.regs.filter(r=>r.sess===s.id&&['admitted','attended','completed','reported'].includes(r.status)).length}
function done(uid,cid){return st.regs.some(r=>r.user===uid&&['completed','reported'].includes(r.status)&&SS(r.sess).course===cid)}
function entitled(uid){return st.ents.some(e=>e.user===uid)}
function myReg(uid,cid){return st.regs.find(r=>r.user===uid&&active(r)&&SS(r.sess).course===cid&&!['completed','reported'].includes(r.status))}
function mask(name){return name.length<2?name:name[0]+'○'+name.slice(2)}
function pendingInvites(u){return st.invites.filter(i=>i.status==='sent'&&i.email===u.email)}
function toast(t){document.querySelectorAll('.p-toast').forEach(x=>x.remove());const d=document.createElement('div');d.className='p-toast';d.setAttribute('role','status');d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),3400)}
function modal(html,wide){
  let root=$('#p-ov');if(!root){root=document.createElement('div');root.id='p-ov';document.body.appendChild(root)}
  root.innerHTML='<div class="p-ov" data-pa="closeov"><div class="p-dlg'+(wide?' wide':'')+'" role="dialog" aria-modal="true"><button type="button" class="btn btn-ghost btn-sm p-x" data-pa="close">關閉</button>'+html+'</div></div>';
  const f=root.querySelector('input:not([readonly]):not([type=hidden]),select,.btn-primary');if(f)f.focus();
}
function closeModal(){const r=$('#p-ov');if(r)r.innerHTML=''}
function addYears(d,n){return (Number(d.slice(0,4))+n)+d.slice(4)}

// 報名資格：每門課的資格類型（不限／依職務分流／縣市推薦）＋場次狀態
function elig(u,s){
  const c=C(s.course);
  if(!u)return{ok:false,why:'登入或註冊後即可報名',login:true};
  if(!has(u,'learner'))return{ok:false,why:'此身分不能報名'};
  if(!u.verified)return{ok:false,why:'請先完成 email 驗證'};
  if(done(u.id,c.id))return{ok:false,why:'你已完成這門課',mine:true};
  const mine=st.regs.find(r=>r.user===u.id&&active(r)&&SS(r.sess).course===c.id);
  if(mine)return{ok:false,why:mine.sess===s.id?'你已報名這個場次':'你已報名本課程的其他場次',mine};
  if(ended(s))return{ok:false,why:'已結束'};
  if(!s.open)return{ok:false,why:'尚未開放報名'};
  if(c.elig==='track'){
    if(s.track&&u.job!==s.track)return{ok:false,why:'此分流限'+JOB[s.track]+'（你的職務是'+(JOB[u.job]||'未填')+'）'};
    if(!done(u.id,'A'))return{ok:false,why:'需先完成初階研習'};
  }
  if(c.elig==='invite'&&!st.invites.some(i=>i.course===c.id&&i.user===u.id&&i.status==='accepted'))return{ok:false,why:'採縣市推薦，限收到邀請的人報名',invite:true};
  if(taken(s)>=s.cap)return{ok:true,full:true};
  return{ok:true};
}

function qr(code){
  let h=0;for(const ch of code)h=(h*31+ch.charCodeAt(0))>>>0;
  let r='';const N=11,c=6.5;
  const fin=(x,y)=>'<rect x="'+x+'" y="'+y+'" width="19.5" height="19.5" fill="none" stroke="#1E2B38" stroke-width="3"/><rect x="'+(x+6)+'" y="'+(y+6)+'" width="7.5" height="7.5" fill="#1E2B38"/>';
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){if((i<3&&j<3)||(i<3&&j>N-4)||(i>N-4&&j<3))continue;h=(h*1103515245+12345)>>>0;if(h&0x10000)r+='<rect x="'+(i*c+1)+'" y="'+(j*c+1)+'" width="'+c+'" height="'+c+'" fill="#1E2B38"/>'}
  return '<svg viewBox="0 0 74 74" role="img" aria-label="查驗 QR code（示意）"><rect width="74" height="74" fill="#FFFFFF"/>'+fin(1.5,1.5)+fin(53,1.5)+fin(1.5,53)+r+'</svg>';
}

/* ---------- 示範列 ---------- */
function renderBar(other){
  const bar=$('#demobar');if(!bar)return;
  const u=me();
  bar.className='p-demobar';
  bar.innerHTML='<div class="in"><span class="p-tag">示範</span><label for="p-persona">目前身分</label><select id="p-persona" data-pchg="persona"><option value="">訪客（未登入）</option>'
    +st.users.filter(x=>x.persona).map(x=>'<option value="'+x.id+'"'+(x.id===st.cur?' selected':'')+'>'+esc(x.name)+'｜'+esc(x.persona)+'</option>').join('')+'</select>'
    +'<span class="sp"></span>'+(other?'<a class="p-dbtn" href="'+other[0]+'">'+other[1]+'</a>':'')
    +'<button type="button" class="p-dbtn" data-pa="mailbox">示範信箱<span class="cnt">'+st.mails.length+'</span></button>'
    +'<button type="button" class="p-dbtn" data-pa="notes">'+(st.notes?'隱藏討論註記':'顯示討論註記')+'</button>'
    +'<button type="button" class="p-dbtn" data-pa="reset">重設示範資料</button></div>'
    +'<div class="hint"><b>試試看：</b>'+(u?(u.hint||'新帳號要先驗證 email 才能報名。'):'按右上角<b>登入</b>選一個示範帳號，或註冊新帳號。首頁的場次、課程與平台區塊會依登入身分改變。')+'</div>';
  if(!u)bar.querySelector('select').value='';
}

/* ---------- 共用表單 ---------- */
function signupForm(o){
  const inv=o.inv;
  return '<form class="f" data-pform="signup">'+(inv?'<input type="hidden" name="inv" value="'+inv.id+'">':'')
   +'<div class="fgrid"><div class="fld"><label for="s-name">姓名</label><input id="s-name" name="name" type="text" required value="'+esc(inv?inv.name:'')+'"></div>'
   +'<div class="fld"><label for="s-email">Email</label><input id="s-email" name="email" type="email" required '+(inv?'readonly ':'')+'value="'+esc(inv?inv.email:'')+'" placeholder="name@school.edu.tw">'+(inv?'<span class="help">由邀請連結帶入，視為已驗證</span>':'')+'</div></div>'
   +'<div class="fld"><span class="lb">職務</span><div class="radios">'+Object.entries(JOB).map(([k,v],i)=>'<label><input type="radio" name="job" value="'+k+'"'+(i===(inv?1:0)?' checked':'')+'>'+v+'</label>').join('')+'</div><span class="help">決定你可以報名哪一個進階分流。</span></div>'
   +'<div class="fgrid"><div class="fld"><label for="s-org">服務單位</label><input id="s-org" name="org" type="text" required value="'+esc(inv?inv.org:'')+'"></div>'
   +'<div class="fld"><label for="s-county">縣市</label><select id="s-county" name="county">'+COUNTIES.map(c=>'<option'+(inv&&inv.county===c?' selected':'')+'>'+c+'</option>').join('')+'</select></div></div>'
   +'<div class="fld"><label for="s-pw">密碼</label><input id="s-pw" name="pw" type="password" minlength="12" required placeholder="至少 12 個字元"></div>'
   +'<div class="row"><button class="btn btn-primary btn-sm" type="submit">'+(inv?'註冊並接受邀請':'註冊')+'</button></div></form>';
}

/* ---------- 共用動作 ---------- */
const A={
  close:()=>closeModal(),
  closeov:(d,el,ev)=>{if(ev.target===el)closeModal()},
  notes:()=>{st.notes=!st.notes;P.render()},
  reset:()=>modal('<h2>重設示範資料？</h2><p>所有操作（新註冊的帳號、報名、審核結果）都會清除，回到初始狀態。</p><div class="row"><button type="button" class="btn btn-danger btn-sm" data-pa="doreset">重設</button><button type="button" class="btn btn-ghost btn-sm" data-pa="close">取消</button></div>'),
  doreset:()=>{try{localStorage.removeItem(KEY)}catch(e){}st=seed();closeModal();P.render();toast('已重設示範資料')},
  login:()=>{
    const people=st.users.filter(x=>x.persona);
    modal('<h2>登入</h2><div class="stack"><button type="button" class="btn btn-ghost btn-sm" disabled>以教育雲端帳號登入（規劃中）</button>'
      +'<p class="small muted">示範中不需要密碼，選一個示範帳號登入：</p><div class="p-people">'
      +people.map(x=>'<button type="button" class="p-person" data-pa="as" data-id="'+x.id+'"><b>'+esc(x.name)+'</b><span>'+esc(x.persona)+'</span></button>').join('')+'</div>'
      +'<p class="small">還沒有帳號？<button type="button" class="p-link" data-pa="signup">註冊新帳號</button></p></div>'
      +note('先用 email＋密碼註冊並驗證信箱。之後接上教育雲端帳號時，同一個人可以把兩種登入方式綁在一起，報名紀錄不會斷。'));
  },
  as:d=>{st.cur=d.id;st.page=null;st.view=null;closeModal();P.render();toast('已登入：'+U(d.id).name)},
  logout:()=>{st.cur=null;st.page=null;closeModal();P.render();toast('已登出')},
  signup:()=>modal('<h2>註冊新帳號</h2>'+signupForm({})),
  mailbox:()=>{
    modal('<h2>示範信箱</h2><p class="small muted">系統在示範中寄出的所有信件。正式版會真的寄到對方信箱。</p>'+(st.mails.length?st.mails.map(m=>'<div class="p-mail"><div class="mh"><span>寄給 '+esc(m.to)+'</span><span>'+esc(m.date)+'</span></div><div class="sj">'+esc(m.subject)+'</div><div class="bd">'+esc(m.body)+'</div>'+(m.action&&!m.used?'<div class="row"><button type="button" class="btn btn-primary btn-sm" data-pa="mailgo" data-id="'+m.id+'">'+esc(m.action.label)+'</button></div>':m.action?'<div>'+chip('連結已使用')+'</div>':'')+'</div>').join(''):'<p class="muted">沒有信件。</p>'),true);
  },
  mailgo:d=>{
    const m=st.mails.find(x=>x.id===d.id);if(!m)return;
    if(m.action.type==='verify'){const u=U(m.action.id);u.verified=true;m.used=true;st.cur=u.id;closeModal();P.render();toast('email 已驗證，現在可以報名研習了')}
    else if(m.action.type==='invite')A.accept({id:m.action.id});
  },
  accept:d=>{
    const i=st.invites.find(x=>x.id===d.id),u=me();
    if(!i||i.status!=='sent'){toast('這個邀請已經使用過');return}
    if(!u||!has(u,'learner')){
      modal('<h2>接受邀請：註冊帳號</h2><p class="small muted">'+esc(i.county)+'推薦你參加「'+esc(C(i.course).name)+'」。如果你已經有帳號，請先用上方「目前身分」切換到該帳號，再點邀請信。</p>'+signupForm({inv:i}));
      return;
    }
    modal('<h2>把邀請綁到目前的帳號？</h2><div class="p-tw"><table><tbody><tr><th>邀請寄送的信箱</th><td>'+esc(i.email)+'</td></tr><tr><th>目前登入的帳號</th><td>'+esc(u.name)+'・'+esc(u.email)+'</td></tr></tbody></table></div>'
      +(i.email!==u.email?'<p class="small">兩個 email 不同沒關係：能點開這封信，就代表你收得到學校信箱。綁定後，推薦資格會掛在目前這個帳號上。</p>':'')
      +'<div class="row"><button type="button" class="btn btn-primary btn-sm" data-pa="bind" data-id="'+i.id+'">接受並綁定</button><button type="button" class="btn btn-ghost btn-sm" data-pa="close">取消</button></div>');
  },
  bind:d=>{
    const i=st.invites.find(x=>x.id===d.id),u=me();
    i.status='accepted';i.user=u.id;st.mails.forEach(m=>{if(m.action&&m.action.id===i.id)m.used=true});
    closeModal();P.render();P.afterInvite&&P.afterInvite(i);toast('已接受邀請，現在可以報名「'+C(i.course).name+'」了');
  },
  apply:d=>{
    const s=SS(d.id),c=C(s.course),u=me(),e=elig(u,s);
    if(!e.ok){toast(e.why);return}
    modal('<h2>報名：'+esc(c.name)+'</h2><p class="muted small">'+esc(sessName(s))+'・'+esc(s.venue)+(e.full?'・名額已滿，將列為備取':'')+'</p>'
      +'<form class="f" data-pform="apply"><input type="hidden" name="sid" value="'+s.id+'">'
      +'<div class="fgrid"><div class="fld"><span class="lb">報名者</span><span>'+esc(u.name)+'・'+esc(u.org)+'</span></div><div class="fld"><span class="lb">職務</span><span>'+esc(JOB[u.job])+'</span></div></div>'
      +'<div class="fld"><label for="a-id">身分證字號</label><input id="a-id" name="idno" type="text" required placeholder="A123456789" autocomplete="off"><span class="help">僅用於登錄全教網研習時數。加密保存、只有承辦看得到，登錄完成 90 天後刪除。（示範中只會留下遮罩後的字號）</span></div>'
      +(c.proof?'<div class="fld"><label for="a-file">先修證明（'+c.proof.join('、')+'）</label><input id="a-file" name="file" type="file" multiple accept=".pdf,.jpg,.png"><span class="help">沒選檔案的話，示範會自動附上範例檔。</span></div>':'')
      +'<div class="fld"><span class="lb">午餐</span><div class="radios">'+['葷','素','不用餐'].map((m,i)=>'<label><input type="radio" name="meal" value="'+m+'"'+(i?'':' checked')+'>'+m+'</label>').join('')+'</div></div>'
      +'<div class="fld"><label for="a-note">想在研習中解決的資料問題（選填）</label><textarea id="a-note" name="note" placeholder="例如：想看學習扶助測驗各班的落差"></textarea></div>'
      +'<div class="err" id="a-err" hidden></div><div class="row"><button class="btn btn-primary btn-sm" type="submit">送出報名</button><button class="btn btn-ghost btn-sm" type="button" data-pa="close">取消</button></div></form>'
      +note('每門課要收的資料不同：先做「固定欄位＋每門課幾個自訂題目」，不要一開始就做成萬用表單產生器。'));
  },
  cancel:d=>modal('<h2>取消這筆報名？</h2><p>取消後名額會釋出給備取的人。</p><div class="row"><button type="button" class="btn btn-danger btn-sm" data-pa="docancel" data-id="'+d.id+'">取消報名</button><button type="button" class="btn btn-ghost btn-sm" data-pa="close">保留</button></div>'),
  docancel:d=>{st.regs.find(r=>r.id===d.id).status='cancelled';closeModal();P.render();toast('已取消報名')},
  cert:d=>{
    const c=st.certs.find(x=>x.code===d.id),p=U(c.user);
    modal('<div class="p-cert"><h2>研習證明</h2><div class="body"><b>'+esc(p.name)+'</b>（'+esc(p.org)+'）於 <span class="num">'+esc(c.date)+'</span> 參加<br>教育資料素養提升計畫 '+esc(c.title)+'，<br>研習時數共 <b class="num">'+c.hours+'</b> 小時，特此證明。</div><div class="foot"><div>教育部補助｜國立高雄師範大學執行<br>查驗碼 <span class="code">'+esc(c.code)+'</span><br>可至網站頁尾「證書查驗」核對</div>'+qr(c.code)+'</div></div><p class="small muted">正式版可下載 PDF。右下角是示意的查驗 QR code，掃描後直接開啟查驗結果。</p>',true);
  },
  enter:()=>toast('正式版會直接進入分析平台，不需要再登入一次（共用登入狀態）')
};
const CHG={
  persona:v=>{st.cur=v||null;st.page=null;st.view=null;closeModal();P.render();window.scrollTo(0,0)}
};
const FORM={
  signup:(fd)=>{
    const email=fd.get('email').trim().toLowerCase();
    if(st.users.some(u=>u.email===email)){toast('這個 email 已經註冊過，請直接登入');return}
    const inv=fd.get('inv')?st.invites.find(i=>i.id===fd.get('inv')):null;
    const u={id:'n'+Date.now(),name:fd.get('name').trim(),email,verified:!!inv,job:fd.get('job'),title:'',org:fd.get('org').trim(),county:fd.get('county'),roles:['learner'],persona:'新註冊帳號'};
    st.users.push(u);st.cur=u.id;st.page=null;
    if(inv){inv.status='accepted';inv.user=u.id;st.mails.forEach(m=>{if(m.action&&m.action.id===inv.id)m.used=true});closeModal();P.render();P.afterInvite&&P.afterInvite(inv);toast('帳號已建立，邀請已接受')}
    else{addMail(st,email,'【教育資料素養提升計畫】請驗證您的 email',u.name+' 您好：\n請點下方按鈕完成 email 驗證，驗證後即可報名研習。',{type:'verify',id:u.id,label:'驗證 email'});
      closeModal();P.render();toast('帳號已建立，驗證信已寄到示範信箱')}
  },
  apply:(fd,form)=>{
    const id=fd.get('idno').trim().toUpperCase();
    if(!/^[A-Z][1289]\d{8}$/.test(id)){const e=form.querySelector('#a-err');e.hidden=false;e.textContent='身分證字號格式不對：第 1 碼是英文字母，後面接 9 個數字。';return}
    const s=SS(fd.get('sid')),c=C(s.course),e=elig(me(),s);
    const inp=form.querySelector('#a-file'),files=inp?[...inp.files].map(f=>f.name):[];
    st.regs.push({id:'r'+Date.now(),user:st.cur,sess:s.id,status:e.full?'waitlist':'pending',at:TODAY,meal:fd.get('meal'),idm:id.slice(0,3)+'****'+id.slice(-3),note:fd.get('note').trim(),files:c.proof?(files.length?files:c.proof.map(p=>p+'_研習證明（範例）.pdf')):undefined});
    closeModal();P.render();toast('報名已送出，審核結果會寄信通知');
  }
};

document.addEventListener('click',ev=>{const el=ev.target.closest('[data-pa]');if(!el)return;const f=P.A[el.dataset.pa];if(!f)return;if(el.tagName==='A')ev.preventDefault();f(el.dataset,el,ev)});
document.addEventListener('change',ev=>{const el=ev.target.closest('[data-pchg]');if(el&&P.CHG[el.dataset.pchg])P.CHG[el.dataset.pchg](el.value,el)});
document.addEventListener('submit',ev=>{const f=ev.target.closest('form[data-pform]');if(!f)return;ev.preventDefault();P.FORM[f.dataset.pform](new FormData(f),f)});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeModal()});

load();
const P=window.P={
  TODAY,JOB,ST,ELIG,COUNTIES,QUOTA,
  get st(){return st},
  A,CHG,FORM,render(){},afterInvite:null,
  save,seed,esc,U,SS,C,me,has,isAdmin,md,daysTo,chip,stChip,note,ended,sessWhen,sessName,active,taken,done,entitled,myReg,mask,
  pendingInvites,toast,modal,closeModal,elig,issueCert,inviteMail,addMail,addYears,qr,renderBar,signupForm
};
})();
