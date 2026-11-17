// Premium: the family's plan (from the subscriptions table) and Apple in-app purchase.
// After a purchase or restore, the signed StoreKit transaction goes to /api/apple-verify, the same check the old iPhone app used.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as IAP from "expo-iap";
import { supabase } from "./supabase";
import { useSession } from "./session";
import { SAMPLE, SITE } from "./config";

export const IAP_IDS = { month: "app.heytribe.premium.monthly", year: "app.heytribe.premium.yearly" } as const;
type PlanKey = keyof typeof IAP_IDS;
const isPremiumId = (id?: string | null) => !!id && (Object.values(IAP_IDS) as string[]).includes(id);
export type Plan = { status: string; trial_ends_at: string | null; current_period_end: string | null; stripe_customer_id: string | null; stripe_subscription_id: string | null };

type Ctx = {
  plan: Plan | null; premium: boolean; limited: boolean; billing: boolean; trialDays: number; appleSub: boolean;
  price: (k: PlanKey) => string;
  buy: (k: PlanKey) => Promise<"ok" | "cancel" | string>;
  restore: () => Promise<boolean>;
  manage: () => Promise<void>;
  reload: () => Promise<void>;
};
const C = createContext<Ctx | null>(null);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { session, code } = useSession();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [trialDays, setTrialDays] = useState(0);
  const [products, setProducts] = useState<Record<string, { displayPrice: string }>>({});

  const reload = useCallback(async () => {
    if (!session || !code || code === SAMPLE) { setPlan(null); return; }
    const r = await supabase.from("subscriptions").select("status, trial_ends_at, current_period_end, stripe_customer_id, stripe_subscription_id").eq("tribe_code", code).maybeSingle();
    const p = r.error ? null : (r.data as Plan);
    setPlan(p);
    setTrialDays(p?.trial_ends_at ? Math.ceil((new Date(p.trial_ends_at).getTime() - Date.now()) / 864e5) : 0);
  }, [session, code]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { reload(); }, [reload]);

  const send = useCallback(async (jws: string, quiet: boolean): Promise<true | string> => {
    const tok = (await supabase.auth.getSession()).data.session?.access_token;
    if (!tok || !code || code === SAMPLE) return "Sign in first.";
    const r = await fetch(SITE + "/api/apple-verify", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + tok }, body: JSON.stringify({ jws, code }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r && r.ok) { await reload(); return true; }
    return quiet ? "" : j.error || "Couldn't confirm your purchase. Try Restore purchases in a minute.";
  }, [code, reload]);

  // Connect to the App Store once, load prices, and confirm any purchase that finishes in the background (renewals, Ask to Buy).
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let alive = true;
    const sub = IAP.purchaseUpdatedListener(async p => {
      if (!isPremiumId(p.productId) || !p.purchaseToken) return;
      if ((await send(p.purchaseToken, true)) === true) await IAP.finishTransaction({ purchase: p, isConsumable: false }).catch(() => {});
    });
    (async () => {
      try {
        await IAP.initConnection();
        const list = (await IAP.fetchProducts({ skus: Object.values(IAP_IDS), type: "subs" })) || [];
        const out: Record<string, { displayPrice: string }> = {};
        (list as { id: string; displayPrice: string }[]).forEach(p => { const k = (Object.keys(IAP_IDS) as PlanKey[]).find(x => IAP_IDS[x] === p.id); if (k) out[k] = { displayPrice: p.displayPrice }; });
        if (alive) setProducts(out);
      } catch { /* App Store not reachable: Premium simply isn't offered */ }
    })();
    return () => { alive = false; sub.remove(); };
  }, [send]);

  const value = useMemo<Ctx>(() => {
    const premium = code === SAMPLE || !plan || ["active", "comped", "past_due"].includes(plan.status) || (plan.status === "trialing" && trialDays > 0);
    const billing = !!(products.month || products.year);
    return {
      plan, premium, billing, trialDays, limited: billing && !premium,
      appleSub: String(plan?.stripe_subscription_id || "").startsWith("apple:"),
      price: k => products[k]?.displayPrice || (k === "year" ? "$39.99" : "$4.99"),
      buy: async k => {
        if (!products[k]) return "Premium isn't available in the App Store yet.";
        if (!session || !code || code === SAMPLE) return "Sign in first.";
        try {
          const r = await IAP.requestPurchase({ type: "subs", request: { apple: { sku: IAP_IDS[k], appAccountToken: session.user.id } } });
          const p = (Array.isArray(r) ? r[0] : r) as IAP.Purchase | null;
          if (!p?.purchaseToken) return "cancel";
          const ok = await send(p.purchaseToken, false);
          if (ok === true) { await IAP.finishTransaction({ purchase: p, isConsumable: false }).catch(() => {}); return "ok"; }
          return ok;
        } catch (e: any) {
          if (e?.code === IAP.ErrorCode.UserCancelled || /cancel/i.test(String(e?.message))) return "cancel";
          return "The purchase didn't go through. You haven't been charged.";
        }
      },
      restore: async () => {
        let found = false;
        try {
          await IAP.restorePurchases().catch(() => {});
          const list = (await IAP.getAvailablePurchases()) || [];
          for (const p of list) if (isPremiumId(p.productId) && p.purchaseToken && (await send(p.purchaseToken, true)) === true) found = true;
        } catch { /* nothing to restore */ }
        return found;
      },
      manage: async () => { await IAP.deepLinkToSubscriptions().catch(() => {}); },
      reload,
    };
  }, [plan, trialDays, products, session, code, send, reload]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function usePremium() {
  const c = useContext(C);
  if (!c) throw new Error("usePremium outside PremiumProvider");
  return c;
}
