// Phone reminders. The server already sends Apple push to "apns:<token>" rows in push_subscriptions (see /api/reminders).
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

export const REM_TYPES: [string, string][] = [["plans", "Plans"], ["meds", "Medicine"], ["bills", "Bills"], ["school", "School forms"], ["countdowns", "Big days"]];
export type Prefs = Record<string, boolean>;
export type PushRow = { id: string; prefs: Prefs | null; tribe_code: string };

const KEY = "ht-apns";
const prefix = Platform.OS === "android" ? "fcm" : "apns";
const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const endpoint = () => { const t = stored(); return t ? `${prefix}:${t}` : null; };

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// Asks for permission if needed and returns this phone's push token, or null if notifications are off.
async function token(ask: boolean) {
  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted && ask && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return null;
  const t = (await Notifications.getDevicePushTokenAsync()).data as string;
  try { localStorage.setItem(KEY, t); } catch {}
  return t;
}

export async function loadReminder(): Promise<PushRow | null> {
  const ep = endpoint(); if (!ep) return null;
  const r = await supabase.from("push_subscriptions").select("id, prefs, tribe_code").eq("endpoint", ep).maybeSingle();
  return (r.data as PushRow) || null;
}

export async function remindersOn(code: string, member: string | null): Promise<PushRow | "denied"> {
  const t = await token(true);
  if (!t) return "denied";
  const row = { tribe_code: code, member_id: member, endpoint: `${prefix}:${t}`, p256dh: prefix, auth: prefix,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York", dead: false };
  const r = await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" }).select("id, prefs, tribe_code").maybeSingle();
  if (r.error) throw new Error(r.error.message);
  return r.data as PushRow;
}

export async function remindersOff() {
  const ep = endpoint(); if (ep) await supabase.from("push_subscriptions").delete().eq("endpoint", ep);
}

export async function setPrefs(prefs: Prefs, member: string | null) {
  const ep = endpoint(); if (!ep) return;
  await supabase.from("push_subscriptions").update({ prefs, member_id: member }).eq("endpoint", ep);
}

// Keep the row's token fresh when Apple rotates it (e.g. after a restore) and the family/member after switching.
export async function refreshReminder(code: string, member: string | null) {
  const old = endpoint(); if (!old) return;
  const t = await token(false); if (!t) return;
  const ep = `${prefix}:${t}`;
  await supabase.from("push_subscriptions").update({ endpoint: ep, tribe_code: code, member_id: member }).eq("endpoint", old);
}
