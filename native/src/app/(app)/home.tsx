import { useState } from "react";
import { View } from "react-native";
import { useCol, useFamily } from "@/lib/store";
import { dayDiff, dayLabel, fromYmd, monthKey, todayKey, ymd } from "@/lib/dates";
import type { Home as HomeRec } from "@/lib/types";
import { Card, Check, Empty, Fab, Fade, H2, Pills, Row, Rows, T, useToast } from "@/ui/kit";
import { Screen } from "@/ui/Screen";
import { EntSheet, type EntEdit } from "@/ui/EntSheet";
import { useSave } from "@/ui/useSave";
import { useColors } from "@/ui/theme";

type Tab = "bills" | "subs" | "upkeep";
const money = (n?: number | null) => (n || n === 0 ? `$${Number(n).toFixed(2)}` : "");
const ordinal = (n: number) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");

// Next renewal on or after today, rolling a past date forward by its cycle (same as subNext in the web app).
function subNext(s: HomeRec) {
  if (!s.renews) return null;
  const t = fromYmd(todayKey()), d = fromYmd(s.renews); let guard = 0;
  while (d < t && guard++ < 400) { if (s.cycle === "yearly") d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1); }
  return ymd(d);
}
function upkeepNext(x: HomeRec) {
  if (!x.last) return todayKey();
  const d = fromYmd(x.last); d.setMonth(d.getMonth() + (x.every || 3)); return ymd(d);
}

export default function Home() {
  const fam = useFamily(), save = useSave(), toast = useToast(), c = useColors();
  const all = useCol<HomeRec>("home").filter(x => x.name);
  const [tab, setTab] = useState<Tab>("bills");
  const [edit, setEdit] = useState<EntEdit>(null);
  const k = todayKey(), mk = monthKey(new Date()), dom = new Date().getDate();

  const bills = all.filter(x => x.kind === "bill").sort((a, b) => (a.dueDay || 0) - (b.dueDay || 0));
  const subs = all.filter(x => x.kind === "sub").map(s => ({ s, next: subNext(s) })).sort((a, b) => String(a.next || "9").localeCompare(String(b.next || "9")));
  const upkeep = all.filter(x => x.kind === "upkeep").map(x => ({ x, next: upkeepNext(x) })).sort((a, b) => a.next.localeCompare(b.next));
  const unpaid = bills.filter(b => !b.paid?.[mk]);
  const monthly = subs.reduce((n, { s }) => n + (s.amount || 0) / (s.cycle === "yearly" ? 12 : 1), 0);

  return (
    <Screen title="Bills & home"
      pills={<Pills<Tab> items={[{ key: "bills", label: "Bills" }, { key: "subs", label: "Subscriptions" }, { key: "upkeep", label: "Home tasks" }]} value={tab} onChange={setTab} />}
      action={<Fab label={tab === "bills" ? "Add bill" : tab === "subs" ? "Add subscription" : "Add home task"} onPress={() => setEdit({ kind: tab === "bills" ? "bill" : tab === "subs" ? "sub" : "upkeep" })} />}>
      <Fade k={tab}>
        {tab === "bills" && (bills.length === 0 ? <Empty title="No bills yet" body="Add the bills you pay each month. You'll see what's due, and can tick them off when they're paid." /> : <>
          <Card><T weight="semibold">{unpaid.length ? `${unpaid.length} left to pay this month` : "All paid this month"}</T>
            {unpaid.length ? <T size={14} muted>{money(unpaid.reduce((n, b) => n + (b.amount || 0), 0))} still to go</T> : null}</Card>
          <Rows>{bills.map(b => {
            const paid = !!b.paid?.[mk], late = !paid && (b.dueDay || 0) < dom;
            return <Row key={b.id} title={b.name} strike={paid} onPress={() => setEdit({ kind: "bill", rec: b })}
              sub={[paid ? "Paid" : late ? "Overdue" : b.dueDay === dom ? "Due today" : `Due the ${ordinal(b.dueDay || 1)}`, money(b.amount), b.autopay ? "Autopay" : ""].filter(Boolean).join(" · ")}
              left={<Check on={paid} label={(paid ? "Mark unpaid: " : "Mark paid: ") + b.name} onPress={() => {
                save(fam.merge("home", b.id, { paid: { [mk]: !paid } }));
                if (!paid) toast({ text: "Marked paid", undo: () => save(fam.merge("home", b.id, { paid: { [mk]: false } })) });
              }} />} />;
          })}</Rows>
        </>)}

        {tab === "subs" && (subs.length === 0 ? <Empty title="No subscriptions yet" body="Keep track of streaming, apps and memberships, and when each one renews." /> : <>
          <Card><T weight="semibold">About {money(monthly)} a month</T><T size={14} muted>{subs.length} {subs.length === 1 ? "subscription" : "subscriptions"}</T></Card>
          <Rows>{subs.map(({ s, next }) => {
            const n = next ? dayDiff(k, next) : null;
            return <Row key={s.id} title={s.name} onPress={() => setEdit({ kind: "sub", rec: s })}
              sub={[money(s.amount) + (s.amount ? (s.cycle === "yearly" ? " a year" : " a month") : ""), next ? (n === 0 ? "Renews today" : n! <= 7 ? `Renews in ${n} day${n === 1 ? "" : "s"}` : `Renews ${dayLabel(next)}`) : ""].filter(Boolean).join(" · ")} />;
          })}</Rows>
        </>)}

        {tab === "upkeep" && (upkeep.length === 0 ? <Empty title="No home tasks yet" body="Filters, smoke alarms, gutters: add the things that need doing every few months." /> :
          <View><H2>Next up</H2><Rows>{upkeep.map(({ x, next }) => {
            const due = next <= k;
            return <Row key={x.id} title={x.name} onPress={() => setEdit({ kind: "upkeep", rec: x })}
              sub={[due ? "Due now" : `Next ${dayLabel(next)}`, `every ${x.every || 3} month${(x.every || 3) === 1 ? "" : "s"}`, x.last ? `last done ${dayLabel(x.last)}` : ""].filter(Boolean).join(" · ")}
              left={<Check on={false} label={"Done today: " + x.name} onPress={() => {
                const was = x.last; save(fam.merge("home", x.id, { last: k }));
                toast({ text: "Nice. Next reminder set", undo: () => save(fam.merge("home", x.id, { last: was || null })) });
              }} />}
              right={due ? <T size={13} weight="semibold" color={c.danger}>Due</T> : null} />;
          })}</Rows></View>)}
      </Fade>
      <EntSheet value={edit} onClose={() => setEdit(null)} />
    </Screen>
  );
}
