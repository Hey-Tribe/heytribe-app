import { useState } from "react";
import { Linking, View } from "react-native";
import { useSession } from "@/lib/session";
import { usePremium } from "@/lib/premium";
import { SAMPLE, SITE } from "@/lib/config";
import { dayLabel, ymd } from "@/lib/dates";
import { Button, Card, Pills, T, useToast } from "@/ui/kit";
import { Screen } from "@/ui/Screen";
import { useColors } from "@/ui/theme";

// Wording from the website's pricing page (content/pricing.html), limited to what this app has.
const EXTRAS = ["Unlimited lists, routines, trips, bills, documents, contacts and people", "Plan dinners ahead and send ingredients to the grocery list", "Yearly countdowns and home upkeep reminders"];

export default function Premium() {
  const { code } = useSession();
  const p = usePremium(), toast = useToast(), c = useColors();
  const [pick, setPick] = useState<"month" | "year">("year");
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  const st = p.plan?.status;

  let head = "Free plan", sub = "Every feature, in an everyday version.";
  if (code === SAMPLE) { head = "Sample family"; sub = "Premium is on so you can see everything."; }
  else if (st === "comped") { head = "Premium"; sub = "On the house. Enjoy every extra."; }
  else if (st === "active") { head = "Premium"; sub = p.plan?.current_period_end ? "Renews " + dayLabel(ymd(new Date(p.plan.current_period_end))) : "Thanks for being Premium."; }
  else if (st === "past_due") { head = "Premium"; sub = "Your last payment didn't go through. Update your payment to keep Premium."; }
  else if (st === "trialing" && p.trialDays > 0) { head = "Premium trial"; sub = (p.trialDays === 1 ? "1 day left" : `${p.trialDays} days left`) + ". Pick a plan to keep Premium."; }
  const canBuy = code !== SAMPLE && !["active", "comped", "past_due"].includes(st || "");

  const buy = async () => {
    setBusy("buy"); const r = await p.buy(pick); setBusy(null);
    if (r === "ok") toast({ text: "Welcome to Premium. Thank you!" }); else if (r !== "cancel") toast({ text: r });
  };

  return (
    <Screen title="Premium" backLabel="Settings">
      <Card style={{ gap: 6 }}><T size={18} weight="semibold">{head}</T><T muted>{sub}</T></Card>
      <Card style={{ gap: 10 }}>
        <T weight="semibold">Premium adds</T>
        {EXTRAS.map(x => <T key={x} muted>• {x}</T>)}
      </Card>

      {canBuy && p.billing ? <View style={{ gap: 12 }}>
        <View style={{ marginHorizontal: -20 }}>
          <Pills<"month" | "year"> items={[{ key: "year", label: `${p.price("year")} a year` }, { key: "month", label: `${p.price("month")} a month` }]} value={pick} onChange={setPick} />
        </View>
        <Button label="Continue" busy={busy === "buy"} onPress={buy} />
        <T size={12.5} muted style={{ lineHeight: 18 }}>Monthly or yearly subscription for your whole family. If you haven&apos;t had Premium through Apple before, the first 2 weeks are free, then the price above is charged unless you cancel before the free weeks end. Payment is charged to your Apple ID. It renews for the same period unless you cancel at least 24 hours before it ends. Manage or cancel anytime in your Apple ID settings.</T>
      </View> : null}
      {canBuy && !p.billing && code !== SAMPLE ? <T muted>Premium isn&apos;t available in the App Store yet.</T> : null}

      <View style={{ gap: 4 }}>
        {p.appleSub ? <Button label="Manage subscription" kind="secondary" onPress={() => p.manage()} /> : null}
        {!p.appleSub && p.plan?.stripe_customer_id ? <T size={14} muted center>Billing is managed on heytribe.app.</T> : null}
        {code !== SAMPLE ? <Button label="Restore purchases" kind="quiet" busy={busy === "restore"} onPress={async () => {
          setBusy("restore"); const found = await p.restore(); setBusy(null);
          toast({ text: found ? "Premium restored" : "No Premium purchase found for this Apple ID" });
        }} /> : null}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          <Button label="Terms" kind="quiet" onPress={() => Linking.openURL(SITE + "/terms.html")} />
          <Button label="Privacy" kind="quiet" onPress={() => Linking.openURL(SITE + "/privacy.html")} />
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: c.bg }} />
    </Screen>
  );
}
