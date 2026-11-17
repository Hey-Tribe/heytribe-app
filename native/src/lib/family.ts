// Small shared rules about family members and weeks, matching the web app.
import { addDays, dowIdx, fromYmd, todayKey, ymd } from "./dates";
import type { Chore, Member, Countdown } from "./types";

export const sortMembers = (ms: Member[]) => [...ms].filter(m => m.name).sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name));
export const memberName = (ms: Member[], id?: string | null) => !id || id === "all" ? "Everyone" : ms.find(m => m.id === id)?.name || "Someone";
export const isBaby = (m: Member) => m.style === "baby";

// Monday of the week that holds `d` (weeks run Monday to Sunday, like the web app).
export const monday = (d = new Date()) => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -dowIdx(d));
export const weekDays = (start = monday()) => [...Array(7)].map((_, i) => ymd(addDays(start, i)));

export const choreDays = (c: Chore) => c.days && c.days.length ? c.days : [0, 1, 2, 3, 4, 5, 6];
export const choreOn = (c: Chore, day: string) => choreDays(c).includes(dowIdx(fromYmd(day)));
export const choreDone = (c: Chore, day: string) => !!(c.done && c.done[day]);

// Stars this week for one person: one per chore done on a day it was due.
export function weekStars(chores: Chore[], memberId: string, start = monday()) {
  const days = weekDays(start);
  return chores.filter(c => c.member === memberId).reduce((n, c) => n + days.filter(d => choreDone(c, d)).length, 0);
}
export const DEFAULT_GOAL = 20;
export const today = todayKey;

// The next date a countdown lands on: yearly ones roll forward to this year or next.
export function nextCountdown(x: Countdown, k = todayKey()) {
  if (!x.yearly || x.date >= k) return x.date;
  const d = fromYmd(x.date), y = fromYmd(k).getFullYear();
  const on = (yy: number) => ymd(new Date(yy, d.getMonth(), d.getDate()));
  return on(y) >= k ? on(y) : on(y + 1);
}
