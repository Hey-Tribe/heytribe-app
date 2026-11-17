// The family data contract. Each family ("tribe") stores its data in the `docs` table as
// (tribe_code, col, id, data jsonb). These shapes match what the web app (spa/app.js) reads and writes,
// so a family can use the website and the phone app at the same time. Keep both in step.
//
// Times of day are minutes after midnight (540 = 9:00 am). Dates are "YYYY-MM-DD" in the family's local time.
// `member` is a member id, or "all" for the whole family. `by` is the member id who made the change.

export type MemberId = string;

export type Member = {
  id: string; name: string; color?: string; order?: number;
  hair?: string; skin?: string; style?: string; // avatar
  goal?: number; reward?: string; // chore stars goal and the reward for reaching it
  status?: string; // "home", "out", ...
};

export type Repeat = "" | "weekly" | "biweekly" | "monthly" | "yearly";

export type Event = {
  id: string; title: string; date: string; start: number; end: number;
  allDay?: boolean; endDate?: string; // multi-day: shows every day from date to endDate
  member?: MemberId; by?: MemberId; driver?: MemberId | null; place?: string; note?: string;
  repeat?: Repeat; until?: string; // last date a repeating event happens
  skip?: Record<string, boolean>; // dates removed from a repeating event
};

export type Chore = {
  id: string; title: string; member?: MemberId;
  days?: number[]; // weekdays it repeats on, 0 = Monday (same as the web app's dowIdx)
  done?: Record<string, boolean>; // date -> done
  stars?: number;
};

export type Item = { id: string; text: string; list?: string; section?: string; checked?: boolean; at?: number; by?: MemberId };
export type Meal = { id: string; dish?: string; ingredients?: string }; // id is the date "YYYY-MM-DD"
export type Note = { id: string; text: string; tone?: string; at?: number; by?: MemberId };
export type Poll = { question: string; options: { label: string; votes: MemberId[] }[] };

export type BabyEntry = { id: string; kind: "sleep" | "feed" | "diaper" | string; at: number; end?: number; by?: MemberId; note?: string };
export type BabyDay = { id: string; entries: BabyEntry[] }; // id is the date

export type Routine = { id: string; name: string; member?: MemberId; time?: string; steps: { id: string; text: string }[]; done?: Record<string, Record<string, boolean>> };
export type Med = {
  id: string; name: string; member?: MemberId; dose?: string; note?: string; start?: string; until?: string;
  times: string[]; // "08:00"
  log?: Record<string, Record<string, { at: number; by?: MemberId }>>; // date -> time -> given
};
export type Health = { id: string; title: string; kind?: string; member?: MemberId; date?: string; next?: string; note?: string };
export type Contact = { id: string; name: string; role?: string; phone?: string; email?: string; note?: string; member?: MemberId };
export type School = {
  id: string; kind: "lunch" | "form" | string; member?: MemberId; title?: string;
  week?: string; days?: Record<string, string>; due?: string; done?: boolean;
};
export type Home = {
  id: string; kind: "bill" | "sub" | "task" | string; name: string;
  amount?: number; dueDay?: number; autopay?: boolean; paid?: Record<string, boolean>; // month "YYYY-MM" -> paid
  cycle?: string; renews?: string; every?: number; last?: string;
};
export type Doc = { id: string; title: string; kind?: string; member?: MemberId; where?: string; expires?: string; note?: string };
export type Trip = {
  id: string; name: string; where?: string; start?: string; end?: string;
  plan?: { id: string; day: string; text: string }[];
  packing?: { id: string; text: string; member?: MemberId; checked?: boolean }[];
  petcare?: string;
};
export type Countdown = { id: string; title: string; date: string; member?: MemberId; tone?: string; yearly?: boolean };
export type Sitter = { address?: string; wifi?: string; rules?: string; notes?: string };

// Collections loaded for every family, in the same order as the web app (COLS in spa/app.js).
export const COLS = ["members", "events", "chores", "items", "meals", "notes", "baby", "routines", "meds", "health",
  "contacts", "school", "home", "docs", "trips", "countdowns"] as const;
export type Col = (typeof COLS)[number] | "info" | "poll";
