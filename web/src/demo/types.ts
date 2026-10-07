export type Job = "teacher" | "school_admin" | "county_admin";
export type Role = "learner" | "lecturer" | "county" | "staff";
export type CourseId = "A" | "B" | "T";
export type Elig = "open" | "track" | "invite";
export type RegStatus = "pending" | "admitted" | "waitlist" | "rejected" | "cancelled" | "attended" | "absent" | "completed" | "reported";

export interface Lecturer { until: string; regions: string[]; tags: string[] }
export interface User {
  id: string; name: string; email: string; verified: boolean;
  job: Job | null; title: string; org: string; county: string; roles: Role[];
  persona?: string; hint?: string; lect?: Lecturer;
}
export interface Course {
  id: CourseId; level: string; name: string; hours: number; elig: Elig;
  proof?: string[]; desc: string; content: string[];
}
export interface Session {
  id: string; course: CourseId; region: string; date: string; date2?: string;
  time: string; venue: string; address: string; cap: number; open: boolean;
  lect: string | null; track?: Job; roll: boolean; deadline: string;
}
export interface Reg {
  id: string; user: string; sess: string; status: RegStatus; at: string;
  idm: string; meal: string; note: string; files?: string[];
}
export interface Invite {
  id: string; course: CourseId; county: string; name: string; email: string; org: string;
  status: "sent" | "accepted" | "withdrawn"; user: string | null; by: string | null; sent: string;
}
export interface Cert { code: string; user: string; reg?: string; title: string; hours: number; date: string }
export interface Ent { user: string; src: string; date: string }
export interface Review { id: string; user: string; cohort: string; at: string; files: string[]; status: "submitted" | "approved" | "returned" }
export interface Mail {
  id: string; to: string; date: string; subject: string; body: string;
  action?: { type: "verify" | "invite"; id: string; label: string }; used?: boolean;
}
export interface State {
  users: User[]; courses: Course[]; sessions: Session[]; regs: Reg[]; invites: Invite[];
  certs: Cert[]; ents: Ent[]; reviews: Review[]; mails: Mail[]; seq: number; cur: string | null;
}
