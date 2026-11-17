// The add/edit forms for the simpler areas, ported from ENT in spa/app.js so both apps write the same records.
import type { Col } from "./types";
import { rid, todayKey } from "./dates";

export type Opt = [string, string];
export type FieldDef = {
  name: string; label: string; required?: boolean; ph?: string; value?: string | number;
  type?: "text" | "number" | "date" | "time" | "select" | "checkbox" | "textarea" | "tel" | "email" | "members" | "members+all";
  options?: Opt[]; min?: number; max?: number;
  get?: (r: any) => string; // how to show a stored value in the form
};
export type EntDef = {
  col: Col; title: string; fixed?: Record<string, unknown>; fields: FieldDef[];
  toData?: (d: any, rec: any) => any; // returns the record, or { error }
};

export const DKIND: Opt[] = [["passport", "Passport"], ["id", "ID or license"], ["insurance", "Insurance"], ["medical", "Medical"], ["school", "School"], ["vehicle", "Vehicle"], ["warranty", "Warranty"], ["legal", "Legal"], ["other", "Other"]];
export const ROLES: Opt[] = [["emergency", "Emergency"], ["doctor", "Doctors and dentists"], ["school", "School"], ["family", "Family and friends"], ["sitter", "Sitters"], ["other", "Other"]];
export const RKIND: Opt[] = [["checkup", "Checkup"], ["vaccine", "Vaccine"], ["dentist", "Dentist"], ["allergy", "Allergy"], ["other", "Note"]];
export const TONES: Opt[] = [["sage", "Sage"], ["blue", "Blue"], ["rose", "Rose"], ["olive", "Olive"], ["sand", "Sand"]];
export const label = (opts: Opt[], k?: string) => opts.find(o => o[0] === k)?.[1] || "";

const pad = (n: number) => String(n).padStart(2, "0");
export const toHHMM = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
export const fromHHMM = (s: string) => { const [h, m] = String(s || "0:0").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
export function parseClock(s: string) {
  const m = String(s).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(a|am|p|pm)?\.?$/i);
  if (!m) return null;
  let h = +m[1]; const mm = +(m[2] || 0); const ap = (m[3] || "").toLowerCase();
  if (h > 23 || mm > 59) return null;
  if (ap.startsWith("p") && h < 12) h += 12;
  if (ap.startsWith("a") && h === 12) h = 0;
  return toHHMM(h * 60 + mm);
}
const clock = (t: string) => { const v = fromHHMM(t), h = Math.floor(v / 60) % 12 || 12; return `${h}${v % 60 ? ":" + pad(v % 60) : ""}${v < 720 ? "am" : "pm"}`; };

export const ENT: Record<string, EntDef> = {
  bill: { col: "home", title: "Bill", fixed: { kind: "bill" }, fields: [
    { name: "name", label: "Bill", required: true, ph: "Electric" },
    { name: "amount", label: "Amount ($)", type: "number", min: 0 },
    { name: "dueDay", label: "Due day of the month", type: "number", min: 1, max: 31, required: true, value: 1 },
    { name: "autopay", label: "Paid automatically", type: "checkbox" }],
    toData: d => ({ ...d, dueDay: Math.min(31, Math.max(1, Math.round(d.dueDay || 1))) }) },
  upkeep: { col: "home", title: "Home task", fixed: { kind: "upkeep" }, fields: [
    { name: "name", label: "Task", required: true, ph: "Change the furnace filter" },
    { name: "every", label: "Every how many months", type: "number", min: 1, max: 60, value: 3 },
    { name: "last", label: "Last done", type: "date" }],
    toData: d => ({ ...d, every: Math.min(60, Math.max(1, Math.round(d.every || 3))) }) },
  sub: { col: "home", title: "Subscription", fixed: { kind: "sub" }, fields: [
    { name: "name", label: "Subscription", required: true, ph: "Streaming service" },
    { name: "amount", label: "Price ($)", type: "number", min: 0 },
    { name: "cycle", label: "Billed", type: "select", options: [["monthly", "Every month"], ["yearly", "Every year"]] },
    { name: "renews", label: "Next renewal", type: "date" }] },
  doc: { col: "docs", title: "Document", fields: [
    { name: "title", label: "Document", required: true, ph: "Passport" },
    { name: "kind", label: "Type", type: "select", options: DKIND },
    { name: "member", label: "Whose", type: "members+all" },
    { name: "expires", label: "Expires", type: "date" },
    { name: "where", label: "Where it’s kept", ph: "Fireproof box, hall closet" },
    { name: "note", label: "Notes", type: "textarea" }] },
  contact: { col: "contacts", title: "Contact", fields: [
    { name: "name", label: "Name", required: true, ph: "Dr. Rivera" },
    { name: "role", label: "Type", type: "select", options: ROLES },
    { name: "phone", label: "Phone", type: "tel", ph: "(570) 555-0100" },
    { name: "email", label: "Email", type: "email" },
    { name: "member", label: "For", type: "members+all" },
    { name: "note", label: "Notes", ph: "2nd grade teacher, Room 14" }] },
  record: { col: "health", title: "Health record", fields: [
    { name: "member", label: "Who", type: "members" },
    { name: "kind", label: "Type", type: "select", options: RKIND },
    { name: "title", label: "What", required: true, ph: "Flu shot, 9-month checkup, peanuts" },
    { name: "date", label: "Date", type: "date" },
    { name: "next", label: "Next due", type: "date" },
    { name: "note", label: "Notes", type: "textarea" }] },
  med: { col: "meds", title: "Medicine", fields: [
    { name: "member", label: "Who", type: "members" },
    { name: "name", label: "Medicine", required: true, ph: "Amoxicillin" },
    { name: "dose", label: "Dose", ph: "5 ml" },
    { name: "times", label: "Times (comma separated)", required: true, ph: "8am, 8pm", get: r => (r.times || []).map(clock).join(", ") },
    { name: "start", label: "Starting", type: "date" },
    { name: "until", label: "Stop after", type: "date" },
    { name: "note", label: "Notes", ph: "With food" }],
    toData: d => {
      const ts = String(d.times || "").split(/[,;]+/).map(parseClock).filter(Boolean) as string[];
      if (!ts.length) return { error: "Add at least one time, like 8am or 20:00." };
      return { ...d, times: [...new Set(ts)].sort(), start: d.start || todayKey() };
    } },
  slip: { col: "school", title: "Form or slip", fixed: { kind: "slip" }, fields: [
    { name: "member", label: "For", type: "members+all" },
    { name: "title", label: "Form", required: true, ph: "Field trip permission" },
    { name: "due", label: "Due", type: "date" },
    { name: "done", label: "Signed and returned", type: "checkbox" }] },
  routine: { col: "routines", title: "Routine", fields: [
    { name: "member", label: "For", type: "members" },
    { name: "name", label: "Routine", required: true, ph: "Bedtime" },
    { name: "time", label: "Starts at (like 7:30pm)", ph: "7:30pm", get: r => (r.time ? clock(r.time) : "") },
    { name: "steps", label: "Steps, one per line", type: "textarea", required: true, ph: "Bath\nPajamas\nBrush teeth\nTwo books", get: r => (r.steps || []).map((s: any) => s.text).join("\n") }],
    toData: (d, rec) => {
      const old: { id: string; text: string }[] = rec.steps || [];
      const lines = String(d.steps || "").split("\n").map(s => s.trim()).filter(Boolean).slice(0, 20);
      if (!lines.length) return { error: "Add at least one step." };
      let time = "";
      if (String(d.time || "").trim()) { const t = parseClock(d.time); if (!t) return { error: "Write the start time like 7:30pm." }; time = t; }
      return { ...d, time, steps: lines.map(t => ({ id: old.find(s => s.text === t)?.id || rid(), text: t.slice(0, 60) })) };
    } },
  countdown: { col: "countdowns", title: "Countdown", fields: [
    { name: "title", label: "Counting down to", required: true, ph: "Beach trip, Leo’s birthday" },
    { name: "date", label: "Date", type: "date", required: true },
    { name: "member", label: "Whose big day", type: "members+all" },
    { name: "tone", label: "Card color", type: "select", options: TONES },
    { name: "yearly", label: "Repeats every year (birthdays, holidays)", type: "checkbox" }] },
  trip: { col: "trips", title: "Trip", fields: [
    { name: "name", label: "Trip", required: true, ph: "Beach weekend" },
    { name: "where", label: "Where", ph: "Ocean City" },
    { name: "start", label: "Leaving", type: "date" },
    { name: "end", label: "Coming home", type: "date" },
    { name: "petcare", label: "Pet and plant care", type: "textarea", ph: "Neighbor feeds the dog at 8am and 6pm" }],
    toData: (d, rec) => ({ ...d, end: d.start && d.end && d.end < d.start ? d.start : d.end, ...(rec.id ? {} : { packing: [], plan: [] }) }) },
};
