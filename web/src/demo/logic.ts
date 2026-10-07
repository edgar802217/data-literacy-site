/* 報名資格、狀態與日期這些規則。正式版會搬到後端，前端只負責顯示。 */
import type { Course, CourseId, Invite, Job, Reg, RegStatus, Session, State, User } from "./types";

// 示範資料以這一天為「今天」，畫面才會和場次日期對得上
export const TODAY = "2026-10-07";

export const JOB: Record<Job, string> = { teacher: "學校教師", school_admin: "學校行政", county_admin: "縣市行政" };
export const ST: Record<RegStatus, [string, "can" | "ok" | "wait" | "no"]> = {
  pending: ["待審核", "wait"], admitted: ["已錄取", "ok"], waitlist: ["備取", "wait"], rejected: ["未錄取", "no"],
  cancelled: ["已取消", "no"], attended: ["已出席", "ok"], absent: ["缺席", "no"], completed: ["已結業", "ok"], reported: ["已登錄全教網", "ok"],
};
export const ELIG_LABEL = { open: "不限資格", track: "依職務分流", invite: "縣市推薦制" } as const;
export const LV_CLASS: Record<CourseId, string> = { A: "la", B: "lb", T: "lt" };
export const COUNTIES = ["臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市", "基隆市", "新竹市", "嘉義市", "新竹縣", "苗栗縣", "彰化縣", "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣", "澎湖縣", "金門縣", "連江縣"];
export const QUOTA = 4;

const WD = "日一二三四五六";
const dt = (d: string) => new Date(d + "T00:00:00");
export const md = (d: string) => { const t = dt(d); return `${t.getMonth() + 1}/${t.getDate()}`; };
export const wd = (d: string) => "週" + WD[dt(d).getDay()];
export const mdw = (d: string) => `${md(d)}（${WD[dt(d).getDay()]}）`;
export const daysTo = (d: string) => Math.round((dt(d).getTime() - dt(TODAY).getTime()) / 864e5);
export const ended = (s: Session) => (s.date2 || s.date) < TODAY;
export const sessWhen = (s: Session) => mdw(s.date) + (s.date2 ? "、" + mdw(s.date2) : "");

export const course = (st: State, id: CourseId) => st.courses.find(c => c.id === id)!;
export const sess = (st: State, id: string) => st.sessions.find(s => s.id === id);
export const user = (st: State, id: string | null) => (id ? st.users.find(u => u.id === id) : undefined);
export const has = (u: User | undefined, r: User["roles"][number]) => !!u && u.roles.includes(r);
export const isAdmin = (u?: User) => has(u, "staff") || has(u, "county") || has(u, "lecturer");

/** 例：進階・學校教師軌 */
export const levelName = (st: State, s: Session) => course(st, s.course).level + (s.track ? "・" + JOB[s.track] + "軌" : "");
/** 例：進階・學校教師軌｜南區 11/14（六） */
export const sessName = (st: State, s: Session) => levelName(st, s) + "｜" + s.region + " " + sessWhen(s);

export const active = (r: Reg) => !["cancelled", "rejected"].includes(r.status);
export const taken = (st: State, s: Session) => st.regs.filter(r => r.sess === s.id && ["admitted", "attended", "completed", "reported"].includes(r.status)).length;
export const done = (st: State, uid: string, cid: CourseId) => st.regs.some(r => r.user === uid && ["completed", "reported"].includes(r.status) && sess(st, r.sess)?.course === cid);
export const entitled = (st: State, uid: string) => st.ents.some(e => e.user === uid);
/** 某人在某門課進行中（還沒結業）的報名 */
export const openReg = (st: State, uid: string, cid: CourseId) =>
  st.regs.find(r => r.user === uid && active(r) && sess(st, r.sess)?.course === cid && !["completed", "reported", "absent"].includes(r.status));
export const pendingInvites = (st: State, u: User) => st.invites.filter(i => i.status === "sent" && i.email === u.email);
export const mask = (name: string) => (name.length < 2 ? name : name[0] + "○" + name.slice(2));
export const upcoming = (st: State) => st.sessions.filter(s => !ended(s)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

export interface EligResult { ok: boolean; why: string; kind: "can" | "ok" | "wait" | "no"; label: string; reg?: Reg; full?: boolean; login?: boolean; alt?: "otherTrack" | "basic" | "invite" }
/** 這個人能不能報名這個場次；不能時附原因與替代做法 */
export function elig(st: State, u: User | undefined, s: Session): EligResult {
  const c = course(st, s.course);
  if (ended(s)) return { ok: false, kind: "no", label: "已結束", why: "這個場次已經結束" };
  if (!u) {
    if (c.elig === "invite") return { ok: false, kind: "no", label: "縣市推薦制", why: "受推薦者請點邀請信中的連結報名", alt: "invite" };
    if (c.elig === "track") return { ok: false, kind: "no", label: ELIG_LABEL.track, why: "需先完成初階，並選擇與職務相符的分流", login: true };
    return { ok: false, kind: "can", label: "不限資格", why: "登入後即可報名", login: true };
  }
  const mine = st.regs.find(r => r.user === u.id && r.sess === s.id && active(r));
  if (mine) return { ok: false, kind: ST[mine.status][1], label: ST[mine.status][0], why: "", reg: mine };
  if (!has(u, "learner")) return { ok: false, kind: "no", label: "無法報名", why: "此身分不能報名研習" };
  if (done(st, u.id, c.id)) return { ok: false, kind: "ok", label: "已結業", why: "你已完成這門課" };
  const other = openReg(st, u.id, c.id);
  if (other) return { ok: false, kind: "no", label: "已報名其他場次", why: "你已報名" + sessName(st, sess(st, other.sess)!) };
  if (!u.verified) return { ok: false, kind: "no", label: "無法報名", why: "請先完成 email 驗證" };
  if (!s.open || s.deadline < TODAY) return { ok: false, kind: "no", label: "未開放報名", why: s.open ? "報名已截止" : "這個場次目前沒有開放報名" };
  if (c.elig === "track") {
    if (!done(st, u.id, "A")) return { ok: false, kind: "no", label: "無法報名", why: "需先完成初階研習", alt: "basic" };
    if (s.track && u.job !== s.track) return { ok: false, kind: "no", label: "無法報名", why: `此分流限${JOB[s.track]}（你的職務是${u.job ? JOB[u.job] : "未填"}）`, alt: "otherTrack" };
  }
  if (c.elig === "invite" && !st.invites.some(i => i.course === c.id && i.user === u.id && i.status === "accepted"))
    return { ok: false, kind: "no", label: "縣市推薦制", why: "沒有收到這門課的推薦邀請", alt: "invite" };
  if (taken(st, s) >= s.cap) return { ok: true, full: true, kind: "can", label: "可登記備取", why: "" };
  return { ok: true, kind: "can", label: "可報名", why: "" };
}

/* ---------- 會改變資料的流程 ---------- */
export function certCode(seq: number) {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let x = seq * 7919 + 1237, s = "";
  for (let i = 0; i < 5; i++) { s += A[x % A.length]; x = Math.floor(x / A.length) + seq * 31; }
  return "DL115-" + s;
}
export function issueCert(st: State, r: Reg) {
  const s = sess(st, r.sess)!, c = course(st, s.course);
  if (st.certs.some(x => x.reg === r.id)) return;
  st.certs.push({ code: certCode(++st.seq), user: r.user, reg: r.id, title: c.level + "研習「" + c.name + "」" + (s.track ? "（" + JOB[s.track] + "軌）" : ""), hours: c.hours, date: s.date2 || s.date });
}
export function addMail(st: State, to: string, subject: string, body: string, action?: NonNullable<State["mails"][number]["action"]>) {
  st.mails.unshift({ id: "m" + Date.now() + Math.random().toString(36).slice(2, 6), to, date: TODAY, subject, body, action });
}
export function inviteMail(st: State, i: Invite) {
  const c: Course = course(st, i.course);
  addMail(st, i.email, `【教育資料素養提升計畫】${i.county}推薦您參加${c.name}`,
    `${i.name} 您好：\n${i.county}推薦您參加「${c.name}」。請點下方按鈕接受邀請：\n・還沒有帳號：直接註冊，email 會自動帶入並視為已驗證\n・已經有帳號：登入後，邀請會綁到您的帳號（帳號 email 不同也可以）\n此連結 14 天內有效，只能使用一次。`,
    { type: "invite", id: i.id, label: "接受邀請" });
  st.mails[0].date = i.sent;
}
/** 結業：核發證明，並依規則開通分析平台 */
export function graduate(st: State, sid: string) {
  const s = sess(st, sid)!; let n = 0, g = 0;
  st.regs.filter(r => r.sess === sid && r.status === "attended").forEach(r => {
    r.status = "completed"; issueCert(st, r); n++;
    if ((s.course === "B" || s.course === "T") && !entitled(st, r.user)) {
      st.ents.push({ user: r.user, src: s.course === "B" ? `完成進階研習（${JOB[s.track!]}軌）` : "完成講師培訓", date: TODAY }); g++;
    }
  });
  return { n, g };
}
