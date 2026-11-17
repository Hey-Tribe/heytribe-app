// Who is signed in, which families they belong to, which one is open, and which family member they are.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { PRIVACY_VERSION, SAMPLE, TERMS_VERSION } from "./config";

export type Membership = { tribe_code: string; member_id: string | null; role: string; status: string; name: string };

type Ctx = {
  ready: boolean; session: Session | null;
  families: Membership[]; pending: Membership[];
  code: string | null; me: string | null; // open family, and my member id in it
  open: (code: string | null) => void;
  setMe: (memberId: string) => Promise<void>;
  reloadFamilies: () => Promise<void>;
  createFamily: (name: string, you: string) => Promise<string>;
  joinFamily: (code: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  leaveFamily: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  recordTerms: (source: "sign_up" | "prompt") => Promise<void>;
  needsTerms: boolean;
};
const C = createContext<Ctx | null>(null);
const KEY = "ht-tribe", ME = (c: string) => "ht-me-" + c;
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} };

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [rows, setRows] = useState<Membership[]>([]);
  const [code, setCode] = useState<string | null>(read(KEY));
  const [picked, setPicked] = useState<Record<string, string>>({}); // "this is me" chosen on this phone
  const [needsTerms, setNeedsTerms] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const reloadFamilies = useCallback(async () => {
    if (!session) return; // rows are ignored while signed out (see value below)
    const del = await supabase.rpc("my_deletion_pending");
    if (del.data === true) { await supabase.auth.signOut(); write(KEY, null); setCode(null); setRows([]); return; }
    const r = await supabase.from("memberships").select("tribe_code, member_id, role, status, removed_at, tribes(name)").eq("user_id", session.user.id);
    if (r.error) return;
    const list = (r.data || []).filter((m: any) => !m.removed_at).map((m: any) => ({
      tribe_code: m.tribe_code, member_id: m.member_id, role: m.role, status: m.status, name: m.tribes?.name || "Your family",
    }));
    setRows(list);
    // open the remembered family if it's still ours, else the first active one
    setCode(cur => {
      const active = list.filter(m => m.status === "active");
      const next = cur === SAMPLE || active.some(m => m.tribe_code === cur) ? cur : active[0]?.tribe_code || null;
      write(KEY, next); return next;
    });
  }, [session]);

  // Terms: new accounts agreed on the sign-up screen; everyone else is asked once when the documents change.
  const checkTerms = useCallback(async () => {
    if (!session) return;
    const now = await supabase.from("terms_acceptances").select("terms_version").eq("terms_version", TERMS_VERSION).eq("privacy_version", PRIVACY_VERSION).limit(1);
    if (now.error) return;
    setNeedsTerms(!(now.data || []).length);
  }, [session]);

  // Both functions only set state after a server reply, never during the effect itself.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { reloadFamilies(); checkTerms(); }, [reloadFamilies, checkTerms]);

  const me = useMemo(() => !code ? null : picked[code] || rows.find(m => m.tribe_code === code)?.member_id || read(ME(code)), [code, rows, picked]);

  const value = useMemo<Ctx>(() => ({
    ready, session, needsTerms: !!session && needsTerms,
    families: session ? rows.filter(m => m.status === "active") : [],
    pending: session ? rows.filter(m => m.status === "pending") : [],
    code, me,
    open: (c) => { write(KEY, c); setCode(c); },
    setMe: async (memberId) => {
      if (!code) return;
      write(ME(code), memberId); setPicked(p => ({ ...p, [code]: memberId }));
      if (session && code !== SAMPLE) await supabase.rpc("set_me", { p_code: code, p_member: memberId });
    },
    reloadFamilies,
    createFamily: async (name, you) => {
      const r = await supabase.rpc("create_tribe", { p_name: name, p_you: you });
      if (r.error) throw new Error(r.error.message);
      const c = (r.data as any)?.code as string;
      await reloadFamilies(); write(KEY, c); setCode(c);
      return c;
    },
    joinFamily: async (c) => {
      const r = await supabase.rpc("join_tribe", { p_code: c });
      if (r.error) throw new Error(r.error.message);
      await reloadFamilies();
      return !!r.data;
    },
    signOut: async () => { await supabase.auth.signOut(); write(KEY, null); setCode(null); setRows([]); },
    leaveFamily: async () => {
      if (!code) return;
      if (session && code !== SAMPLE) {
        const r = await supabase.rpc("leave_tribe", { p_code: code });
        if (r.error) throw new Error(r.error.message);
      }
      write(KEY, null); write(ME(code), null); setCode(null);
      await reloadFamilies();
    },
    // Marks the account for deletion (finished on the server), then signs out. Same as the web app.
    deleteAccount: async () => {
      const r = await supabase.rpc("request_account_deletion");
      if (r.error) throw new Error(r.error.message);
      await supabase.auth.signOut(); write(KEY, null); setCode(null); setRows([]);
    },
    recordTerms: async (source) => {
      const r = await supabase.from("terms_acceptances").insert({ terms_version: TERMS_VERSION, privacy_version: PRIVACY_VERSION, source });
      if (r.error && !/duplicate/i.test(r.error.message || "")) throw new Error(r.error.message);
      setNeedsTerms(false);
    },
  }), [ready, session, needsTerms, rows, code, me, reloadFamilies]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useSession() {
  const c = useContext(C);
  if (!c) throw new Error("useSession outside SessionProvider");
  return c;
}
