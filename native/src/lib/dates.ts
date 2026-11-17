// Date helpers that match spa/app.js exactly, so both apps agree on what happens on which day.
import type { Event } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromYmd = (s: string) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const todayKey = () => ymd(new Date());
export const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const dowIdx = (d: Date) => (d.getDay() + 6) % 7; // Monday = 0
export const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
export const dayDiff = (a: string, b: string) => Math.round((fromYmd(b).getTime() - fromYmd(a).getTime()) / 864e5);

export const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// 540 -> "9:00 am"
export function timeLabel(min: number) {
  const h = Math.floor(min / 60) % 24, m = min % 60, ap = h < 12 ? "am" : "pm";
  return `${h % 12 || 12}:${pad(m)} ${ap}`;
}
// "Wed, Nov 11"
export function dayLabel(day: string) { const d = fromYmd(day); return `${DOW[dowIdx(d)]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`; }
export function relDay(day: string) { const n = dayDiff(todayKey(), day); return n === 0 ? "Today" : n === 1 ? "Tomorrow" : n === -1 ? "Yesterday" : dayLabel(day); }

// Same rules as occursOn() in the web app.
export function occursOn(e: Event, day: string) {
  if (e.skip && e.skip[day]) return false;
  if (e.date === day) return true;
  if (e.endDate && e.date < day && day <= e.endDate) return true;
  if (!e.repeat || !e.date || e.date > day || (e.until && e.until < day)) return false;
  const a = fromYmd(e.date), b = fromYmd(day);
  if (e.repeat === "weekly") return dowIdx(a) === dowIdx(b);
  if (e.repeat === "biweekly") return dowIdx(a) === dowIdx(b) && Math.round((b.getTime() - a.getTime()) / 864e5 / 7) % 2 === 0;
  if (e.repeat === "monthly") { const last = daysIn(b.getFullYear(), b.getMonth()); return b.getDate() === Math.min(a.getDate(), last); }
  if (e.repeat === "yearly") return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  return false;
}
export const eventsOn = (events: Event[], day: string) =>
  events.filter(e => occursOn(e, day)).sort((a, b) => (b.allDay ? 1 : 0) - (a.allDay ? 1 : 0) || a.start - b.start);

// Same id shape as the web app's rid().
export const rid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).replace(/-/g, "").slice(0, 20);
