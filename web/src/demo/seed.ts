/* 示範資料：115 年下半年的場次日期、地點與報名截止依培訓簡章；名額、報名紀錄、人名與單位為虛構。
   正式版改由後端資料庫提供，這個檔案只在示範模式使用。 */
import type { Job, Reg, State, User } from "./types";
import { issueCert, inviteMail } from "./logic";

export function seed(): State {
  const users: User[] = [
    { id: "u1", name: "王小明", email: "wang.hm@kh.edu.tw", verified: true, job: "teacher", title: "教師", org: "高雄市立前鎮國中", county: "高雄市", roles: ["learner"],
      persona: "一般學員（教師）", hint: "已完成 B6.。本學期只開 B6. 與 G1.，採推動辦公室推薦；進階課程 116 年起開設。打開任一場次，看資格怎麼逐條判讀。" },
    { id: "u2", name: "林佳慧", email: "lin.jh@tn.edu.tw", verified: true, job: "school_admin", title: "教務主任", org: "臺南市永康區永康國小", county: "臺南市", roles: ["learner"],
      persona: "學校行政（已開通分析平台）", hint: "已完成 B6-2.，分析平台已開通；也被臺南市推動辦公室推薦參加 G1.，已錄取南區。看看「研習 › 我的研習」和研習證明。" },
    { id: "u3", name: "陳怡君", email: "yijun.chen@gmail.com", verified: true, job: "school_admin", title: "教務主任", org: "屏東縣潮州鎮潮州國小", county: "屏東縣", roles: ["learner"],
      persona: "受推薦參加 G1.（尚未接受）", hint: "推動辦公室把報名連結寄到學校信箱，但她用 Gmail 註冊。打開上方「示範信箱」點邀請信，看邀請怎麼綁到現有帳號。" },
    { id: "u4", name: "張志豪", email: "chang.ch@kh.edu.tw", verified: true, job: "teacher", title: "教師", org: "高雄市立鳳山國中", county: "高雄市", roles: ["learner", "lecturer"],
      lect: { until: "2028-07-05", regions: ["南區"], tags: ["描述統計", "資料視覺化", "學習扶助資料"] },
      persona: "講師", hint: "講師。右上角選單進入「後台」：10/4 南區 B6. 場還沒點名。" },
    { id: "u5", name: "黃淑芬", email: "huang.sf@kh.edu.tw", verified: true, job: "county_admin", title: "科長", org: "高雄市政府教育局", county: "高雄市", roles: ["county"],
      persona: "推動辦公室（高雄市）", hint: "高雄市推動辦公室。右上角選單進入「後台」推薦 B6. 或 G1. 參訓人員，系統會寄出報名連結。" },
    { id: "u6", name: "李宜蓁", email: "office@dl-project.example", verified: true, job: null, title: "專任助理", org: "教育資料素養提升計畫辦公室", county: "", roles: ["staff"],
      persona: "計畫承辦（管理者）", hint: "計畫承辦。右上角選單進入「後台」：審核報名、核發結業、匯出全教網名單、審查講師認證。" },
    { id: "L1", name: "沈明勳", email: "instructor@example.edu.tw", verified: true, job: null, title: "教授", org: "國立高雄師範大學", county: "高雄市", roles: ["lecturer"],
      lect: { until: "2027-12-31", regions: ["北區", "中區", "南區", "東區"], tags: ["B6. 教育資料素養工作坊", "G1. 講師培訓工作坊"] } },
  ];
  const F: [string, string, Job, string, string, string][] = [
    ["f1", "吳俊賢", "school_admin", "學務主任", "高雄市立五福國中", "高雄市"],
    ["f3", "蘇建宏", "school_admin", "教務主任", "高雄市立中正高中", "高雄市"],
    ["f4", "許雅雯", "teacher", "教師", "臺中市立大墩國中", "臺中市"],
    ["f5", "鄭雅文", "teacher", "教師", "臺北市立中山國中", "臺北市"],
    ["f6", "楊志明", "teacher", "教師", "高雄市立前鎮國小", "高雄市"],
    ["f7", "郭怡婷", "teacher", "教師", "屏東縣屏東市屏東國小", "屏東縣"],
    ["f8", "劉建志", "school_admin", "總務主任", "高雄市立鼓山國小", "高雄市"],
    ["f9", "何佩珊", "teacher", "教師", "臺南市立後甲國中", "臺南市"],
    ["f10", "謝宗翰", "teacher", "教師", "高雄市立三民國中", "高雄市"],
    ["f11", "羅淑娟", "school_admin", "輔導主任", "屏東縣內埔鄉內埔國小", "屏東縣"],
    ["f12", "洪家豪", "teacher", "教師", "高雄市立左營國中", "高雄市"],
    ["f13", "曾美玲", "teacher", "教師", "臺南市立建興國中", "臺南市"],
    ["f14", "廖俊傑", "county_admin", "股長", "臺中市政府教育局", "臺中市"],
    ["f15", "賴宛如", "teacher", "教師", "高雄市立苓雅國中", "高雄市"],
    ["f16", "周志偉", "school_admin", "教務主任", "臺中市立惠文高中", "臺中市"],
  ];
  F.forEach(([id, name, job, title, org, county]) => users.push({ id, name, email: id + "@example.edu.tw", verified: true, job, title, org, county, roles: ["learner"] }));
  const f5 = users.find(u => u.id === "f5")!;
  f5.roles.push("lecturer");
  f5.lect = { until: "2028-07-05", regions: ["北區"], tags: ["問卷分析", "縣市資料"] };

  const s: State = {
    users,
    courses: [
      { id: "A", level: "基礎課程", code: "B6.", name: "教育資料素養工作坊", hours: 3, elig: "invite", proof: ["A1", "A2", "B5-1"],
        desc: "基礎教育資料素養：教育資料的理解與識讀。",
        content: ["08:30–09:00　報到", "09:00–12:00　教育資料素養核心概念、能力框架、角色能力差異與常用統計觀念"] },
      { id: "B", level: "進階課程", code: "B6-1.／B6-2.／B6-3.", name: "教育資料實務應用工作坊", hours: 6, elig: "track",
        desc: "依職務分流的實作：AI 協作資料判讀與實務應用。116 年起由各推動辦公室開設。",
        content: ["B6-1.（縣市行政）：行政決策應用與資料整合實作", "B6-2.（學校行政）：校務決策應用與科技領導實作", "B6-3.（學校教師）：資料識別判讀與教學應用實作"] },
      { id: "T", level: "講師培訓", code: "G1.", name: "教育資料實務應用（學校行政）講師培訓工作坊", hours: 12, elig: "invite", proof: ["A1", "A2", "B5-1"],
        desc: "培育 B6-2. 講師：校務決策、科技領導案例與 AI 協作應用。兩天共 12 小時，含第一天上午的 B6. 教育資料素養工作坊 3 小時與 G1. 9 小時。",
        content: ["第一天 09:00–12:00　B6. 教育資料素養工作坊：核心概念、能力框架、角色能力差異與常用統計觀念",
          "第一天 13:00–16:00　縣市及國教署教育資料案例分析、AI 協作應用示範與實作任務、講師培訓資格審查說明",
          "第二天 09:00–12:00　教育資料素養核心概念、學校行政決策與科技領導、校務資料判讀、AI 協作與治理",
          "第二天 13:00–16:00　實作流程、平台報表操作、案例分析實作與小組交流，發展校務問題與改進策略"] },
    ],
    sessions: [
      S("A0", "A", "南區", "2026-09-12", "國立高雄師範大學", 60, false, "u4", { roll: true }),
      S("A1", "A", "南區", "2026-10-04", "國立高雄師範大學", 60, false, "u4"),
      S("B0", "B", "南區", "2026-08-22", "國立臺南大學", 40, false, "u4", { track: "school_admin", roll: true }),
      // 115 年下半年：每區第一天上午是 B6.（可單日參加），G1. 兩天
      S("B6C", "A", "中區", "2026-10-31", "國立臺中教育大學", 40, true, "L1", { deadline: "2026-10-22" }),
      S("B6N", "A", "北區", "2026-11-01", "國立臺灣大學", 40, true, "L1", { deadline: "2026-10-22" }),
      S("B6S", "A", "南區", "2026-11-07", "國立高雄師範大學", 40, true, "L1", { deadline: "2026-10-28" }),
      S("B6E", "A", "東區", "2026-11-08", "花蓮美侖大飯店", 40, true, "L1", { deadline: "2026-10-28" }),
      S("G1C", "T", "中區", "2026-10-31", "國立臺中教育大學", 25, true, "L1", { date2: "2026-11-21", deadline: "2026-10-22" }),
      S("G1N", "T", "北區", "2026-11-01", "國立臺灣大學", 25, true, "L1", { date2: "2026-11-22", venue2: "國立臺北教育大學", deadline: "2026-10-22" }),
      S("G1S", "T", "南區", "2026-11-07", "國立高雄師範大學", 25, true, "L1", { date2: "2026-12-05", deadline: "2026-10-28" }),
      S("G1E", "T", "東區", "2026-11-08", "花蓮美侖大飯店", 25, true, "L1", { date2: "2026-12-06", venue2: "煙波大飯店花蓮店", deadline: "2026-10-28" }),
    ],
    regs: [], invites: [], certs: [], ents: [], reviews: [], mails: [], seq: 0, cur: "u1",
  };

  let n = 0;
  const R = (user: string, sess: string, status: Reg["status"], x: Partial<Reg> = {}) =>
    s.regs.push({ id: "r" + ++n, user, sess, status, at: "2026-09-15", idm: fakeId(n), meal: "葷", note: "", ...x });
  ["u1", "u2", "u3", "f6", "f7", "f8", "f9"].forEach(u => R(u, "A0", "reported", { at: "2026-08-20" }));
  ["f10", "f11", "f12", "f13", "f15", "f16", "f1", "f3"].forEach(u => R(u, "A1", "admitted"));
  ["u2", "f8"].forEach(u => R(u, "B0", "completed", { at: "2026-08-01" }));
  R("f14", "B6C", "pending", { at: "2026-10-09", files: ["A1_研習證明.pdf", "A2_研習證明.pdf", "B5-1_研習證明.pdf"] });
  R("f11", "B6S", "pending", { at: "2026-10-12", files: ["A1A2_研習證明.pdf", "B5-1_研習證明.pdf"], note: "想了解縣市資料怎麼讀" });
  R("u2", "G1S", "admitted", { at: "2026-10-08", files: ["A1_研習證明.pdf", "A2_研習證明.pdf", "B5-1_研習證明.pdf"] });
  R("f1", "G1S", "pending", { at: "2026-10-10", files: ["A1A2_研習證明.pdf", "B5-1_研習證明.pdf"] });
  R("f16", "G1C", "pending", { at: "2026-10-11", files: ["A1_研習證明.pdf"] });

  s.invites = [
    { id: "i1", course: "T", county: "高雄市", name: "吳俊賢", email: "f1@example.edu.tw", org: "高雄市立五福國中", status: "accepted", user: "f1", by: "u5", sent: "2026-09-30" },
    { id: "i2", course: "T", county: "高雄市", name: "蔡雅婷", email: "tsai.yt@kh.edu.tw", org: "高雄市立鼓山高中", status: "sent", user: null, by: "u5", sent: "2026-09-30" },
    { id: "i3", course: "T", county: "臺南市", name: "林佳慧", email: "lin.jh@tn.edu.tw", org: "臺南市永康區永康國小", status: "accepted", user: "u2", by: null, sent: "2026-09-29" },
    { id: "i4", course: "T", county: "屏東縣", name: "陳怡君", email: "chen.yj@mail.ptc.edu.tw", org: "屏東縣潮州鎮潮州國小", status: "sent", user: null, by: null, sent: "2026-10-01" },
    { id: "i5", course: "T", county: "臺中市", name: "周志偉", email: "f16@example.edu.tw", org: "臺中市立惠文高中", status: "accepted", user: "f16", by: null, sent: "2026-09-30" },
    { id: "i6", course: "T", county: "臺中市", name: "江明哲", email: "chiang.mz@tc.edu.tw", org: "臺中市立居仁國中", status: "sent", user: null, by: null, sent: "2026-09-30" },
    { id: "i7", course: "A", county: "臺中市", name: "廖俊傑", email: "f14@example.edu.tw", org: "臺中市政府教育局", status: "accepted", user: "f14", by: null, sent: "2026-10-06" },
    { id: "i8", course: "A", county: "屏東縣", name: "羅淑娟", email: "f11@example.edu.tw", org: "屏東縣內埔鄉內埔國小", status: "accepted", user: "f11", by: null, sent: "2026-10-08" },
  ];
  s.regs.filter(r => r.status === "completed" || r.status === "reported").forEach(r => issueCert(s, r));
  s.certs.push({ code: "DL115-T4WQK", user: "u4", title: "G1. 教育資料實務應用（學校行政）講師培訓工作坊（114 年試辦）", hours: 12, date: "2026-07-05" });
  s.certs.push({ code: "DL115-T9HMB", user: "f5", title: "G1. 教育資料實務應用（學校行政）講師培訓工作坊（114 年試辦）", hours: 12, date: "2026-07-05" });
  s.ents = [
    { user: "u2", src: "完成 B6-2.（學校行政）", date: "2026-08-22" },
    { user: "f8", src: "完成 B6-2.（學校行政）", date: "2026-08-22" },
    { user: "u4", src: "具講師資格", date: "2026-07-05" },
    { user: "f5", src: "具講師資格", date: "2026-07-05" },
  ];
  s.reviews = [
    { id: "v1", user: "f3", cohort: "114 年試辦場（南區）", at: "2026-09-28", files: ["公版簡報_蘇建宏.pptx", "試教影片（雲端連結）"], status: "submitted" },
    { id: "v2", user: "f4", cohort: "114 年試辦場（中區）", at: "2026-10-02", files: ["公版簡報_許雅雯.pptx", "試教影片（雲端連結）"], status: "submitted" },
  ];
  s.invites.filter(i => i.status === "sent").forEach(i => inviteMail(s, i));
  return s;
}

const ADDR: Record<string, string> = {
  "國立高雄師範大學": "高雄市苓雅區和平一路 116 號",
  "國立臺北教育大學": "臺北市大安區和平東路二段 134 號",
  "國立臺中教育大學": "臺中市西區民生路 140 號",
  "國立臺南大學": "臺南市中西區樹林街二段 33 號",
  "國立臺灣大學": "臺北市大安區羅斯福路四段 1 號",
  "花蓮美侖大飯店": "花蓮縣花蓮市",
  "煙波大飯店花蓮店": "花蓮縣花蓮市",
};
function S(id: string, course: "A" | "B" | "T", region: string, date: string, venue: string, cap: number, open: boolean, lect: string | null,
  x: { track?: Job; roll?: boolean; date2?: string; venue2?: string; deadline?: string } = {}) {
  const d = new Date(date + "T00:00:00"); d.setDate(d.getDate() - 10);
  const deadline = x.deadline || d.toISOString().slice(0, 10);
  const time = course === "A" ? "09:00–12:00" : course === "B" ? "09:00–16:00" : "兩天 09:00–16:00";
  return { id, course, region, date, venue, address: ADDR[venue] || "", cap, open, lect, roll: false, time, ...x, deadline,
    ...(x.venue2 ? { address2: ADDR[x.venue2] || "" } : {}) };
}
function fakeId(n: number) { const L = "EFSDABTHK"; return L[n % L.length] + (n % 2 ? "1" : "2") + "2****" + String(100 + (n * 37) % 900); }
