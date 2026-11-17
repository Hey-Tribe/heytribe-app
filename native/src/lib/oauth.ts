import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

// Same return address the old iPhone app used, so it is already on Supabase's allowed list.
export const REDIRECT = "app.heytribe.ios://auth";

// Google sign-in in Apple's secure sign-in sheet. Supabase sends the session back in the return link.
export async function googleSignIn(): Promise<"ok" | "cancel"> {
  const o = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: REDIRECT, skipBrowserRedirect: true, queryParams: { prompt: "select_account" } } });
  if (o.error || !o.data?.url) throw o.error || new Error("Google sign-in isn't available right now.");
  const r = await WebBrowser.openAuthSessionAsync(o.data.url, REDIRECT);
  if (r.type !== "success") return "cancel";
  const u = new URL(r.url);
  const p = new URLSearchParams(u.hash.slice(1) || u.search.slice(1));
  const err = p.get("error_description") || p.get("error");
  if (err) throw new Error(err.replace(/\+/g, " "));
  const access_token = p.get("access_token"), refresh_token = p.get("refresh_token");
  if (access_token && refresh_token) {
    const s = await supabase.auth.setSession({ access_token, refresh_token });
    if (s.error) throw s.error;
    return "ok";
  }
  const code = p.get("code");
  if (code) { const x = await supabase.auth.exchangeCodeForSession(code); if (x.error) throw x.error; return "ok"; }
  throw new Error("Google didn't finish signing you in. Try again.");
}
