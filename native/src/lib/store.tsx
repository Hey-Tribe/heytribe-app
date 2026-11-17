// The family data store: loads every record of one family from `docs`, keeps it live with Supabase realtime,
// and writes changes back. Writes show on screen right away and then go to the server (like the web app's makeDb).
// The sample family (SAMPLE) is read-only on the server: changes stay on this phone, and its dates are moved so
// the sample week is always this week.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { SAMPLE, SAMPLE_BASE } from "./config";
import { fromYmd, rid, todayKey } from "./dates";
import type { Col } from "./types";

type Row = { col: string; id: string; data: any };
type Data = Map<string, Map<string, any>>; // col -> id -> data

function shiftDates<T>(obj: T, days: number): T {
  if (!days) return obj;
  const s = JSON.stringify(obj).replace(/\b(20\d\d)-(\d\d)-(\d\d)\b/g, (_m, y, mo, d) => {
    const dt = new Date(+y, +mo - 1, +d + days);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  });
  return JSON.parse(s);
}
function deepMerge(a: any, b: any): any {
  if (!a || typeof a !== "object" || Array.isArray(a) || !b || typeof b !== "object" || Array.isArray(b)) return b;
  const out: any = { ...a };
  for (const k of Object.keys(b)) out[k] = b[k] === null ? undefined : deepMerge(a[k], b[k]);
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}

type Store = {
  code: string; status: "loading" | "ready" | "error"; error?: string; local: boolean;
  tribe: { name: string } | null;
  list: <T = any>(col: Col) => (T & { id: string })[];
  get: <T = any>(col: Col, id: string) => (T & { id: string }) | null;
  set: (col: Col, id: string | null, data: any) => Promise<string>;
  merge: (col: Col, id: string, patch: any) => Promise<void>;
  remove: (col: Col, id: string) => Promise<void>;
  renameTribe: (name: string) => Promise<void>;
  refresh: () => void;
  version: number;
};
const Ctx = createContext<Store | null>(null);

export function FamilyProvider({ code, children }: { code: string; children: React.ReactNode }) {
  const data = useRef<Data>(new Map());
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<Store["status"]>("loading");
  const [error, setError] = useState<string>();
  const [tribe, setTribe] = useState<{ name: string } | null>(null);
  const [reload, setReload] = useState(0);
  const local = code === SAMPLE;
  const shift = useMemo(() => local ? Math.round((fromYmd(todayKey()).getTime() - fromYmd(SAMPLE_BASE).getTime()) / 864e5) : 0, [local]);
  const bump = useCallback(() => setVersion(v => v + 1), []);
  const colMap = (c: string) => { let m = data.current.get(c); if (!m) { m = new Map(); data.current.set(c, m); } return m; };
  const put = (r: Row) => colMap(r.col).set(shift ? shiftDates({ v: r.id }, shift).v : r.id, shift ? shiftDates(r.data, shift) : r.data);

  useEffect(() => {
    let alive = true, channel: RealtimeChannel | null = null, lost = false;
    data.current = new Map(); // the provider is keyed by family code, so status starts as "loading"
    (async () => {
      try {
        const tr = await supabase.from("tribes").select("name").eq("code", code).maybeSingle();
        if (tr.error) throw tr.error;
        if (!alive) return;
        setTribe(tr.data ? { name: tr.data.name } : null);
        for (let from = 0; ; from += 1000) {
          const r = await supabase.from("docs").select("col, id, data").eq("tribe_code", code).range(from, from + 999);
          if (r.error) throw r.error;
          (r.data as Row[]).forEach(put);
          if (r.data.length < 1000) break;
        }
        if (!alive) return;
        setStatus("ready"); bump();
        if (!local) {
          channel = supabase.channel("tribe-" + code)
            .on("postgres_changes", { event: "*", schema: "public", table: "docs", filter: "tribe_code=eq." + code }, (p: any) => {
              if (p.eventType === "DELETE") { const o = p.old || {}; if (o.col && o.id) colMap(o.col).delete(o.id); }
              else put(p.new as Row);
              bump();
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tribes", filter: "code=eq." + code }, (p: any) => setTribe({ name: p.new.name }))
            .subscribe(s => {
              // if live updates dropped, reload once they're back so nothing missed stays stale
              if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") lost = true;
              else if (s === "SUBSCRIBED" && lost && alive) { lost = false; setReload(n => n + 1); }
            });
        }
      } catch (e: any) {
        if (alive) { setStatus("error"); setError(e?.message || "Couldn't load your family"); }
      }
    })();
    return () => { alive = false; if (channel) supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, reload]);

  const write = useCallback(async (fn: () => PromiseLike<{ error: any }>) => {
    if (local) return;
    const r = await fn();
    if (r.error) throw new Error(r.error.message || "Couldn't save");
  }, [local]);

  const store = useMemo<Store>(() => ({
    code, status, error, local, tribe, version,
    list: (col) => [...colMap(col).entries()].map(([id, d]) => ({ id, ...d })),
    get: (col, id) => { const d = colMap(col).get(id); return d ? { id, ...d } : null; },
    set: async (col, id, d) => {
      const key = id || rid(); const { id: _drop, ...clean } = d || {};
      colMap(col).set(key, clean); bump();
      await write(() => supabase.from("docs").upsert({ tribe_code: code, col, id: key, data: clean }));
      return key;
    },
    merge: async (col, id, patch) => {
      colMap(col).set(id, deepMerge(colMap(col).get(id) || {}, patch)); bump();
      await write(() => supabase.rpc("doc_merge", { p_code: code, p_col: col, p_id: id, p_patch: patch }));
    },
    remove: async (col, id) => {
      colMap(col).delete(id); bump();
      await write(() => supabase.from("docs").delete().match({ tribe_code: code, col, id }));
    },
    renameTribe: async (name) => {
      setTribe({ name });
      await write(() => supabase.from("tribes").update({ name }).eq("code", code));
    },
    refresh: () => setReload(n => n + 1),
  }), [code, status, error, local, tribe, version, write, bump]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useFamily() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useFamily outside FamilyProvider");
  return s;
}
// A collection as an array, re-rendering when it changes.
export function useCol<T = any>(col: Col) {
  const s = useFamily();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => s.list<T>(col), [s.version, col]);
}
