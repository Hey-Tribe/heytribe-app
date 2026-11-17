import { View } from "react-native";
import { useCol, useFamily } from "@/lib/store";
import { useSession } from "@/lib/session";
import { addDays, nowMin, relDay, rid, timeLabel, todayKey, ymd } from "@/lib/dates";
import { memberName } from "@/lib/family";
import type { BabyDay, BabyEntry, Member } from "@/lib/types";
import { Button, Card, Empty, H2, Row, Rows, T, useToast } from "@/ui/kit";
import { Screen } from "@/ui/Screen";
import { useSave } from "@/ui/useSave";
import { useColors } from "@/ui/theme";

const KIND: Record<string, string> = { feed: "Feed", diaper: "Diaper", sleep: "Sleep" };
const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

// Quick taps to log feeds, diapers and sleep. One log per day, shared with everyone (same as the web app).
export default function Baby() {
  const fam = useFamily(), save = useSave(), toast = useToast(), c = useColors();
  const { me } = useSession();
  const members = useCol<Member>("members");
  const days = useCol<BabyDay>("baby");
  const k = todayKey(), yest = ymd(addDays(new Date(), -1));
  const entries = (d: string) => (days.find(x => x.id === d)?.entries || []).slice().sort((a, b) => b.at - a.at);
  const today = entries(k);
  const sleeping = today.find(e => e.kind === "sleep" && e.end == null);
  const write = (next: BabyEntry[]) => save(fam.set("baby", k, { entries: next }));

  const log = (kind: string) => {
    const now = nowMin(), cur = entries(k);
    if (kind === "sleep") {
      const open = cur.find(e => e.kind === "sleep" && e.end == null);
      write(open ? cur.map(e => (e.id === open.id ? { ...e, end: Math.max(now, e.at + 1) } : e)) : [...cur, { id: rid(), kind: "sleep", at: now, end: null, by: me || undefined }]);
      toast({ text: "Sleep updated" });
    } else {
      write([...cur, { id: rid(), kind, at: now, by: me || undefined }]);
      toast({ text: kind === "feed" ? "Feed logged" : "Diaper logged", undo: () => write(cur) });
    }
  };
  const last = (kind: string) => today.find(e => e.kind === kind);
  const ago = (e?: BabyEntry) => (e ? `${dur(Math.max(0, nowMin() - (e.end ?? e.at)))} ago` : "Not yet today");
  const row = (d: string) => function EntryRow(e: BabyEntry) { return (
    <Row key={e.id} title={KIND[e.kind] || e.kind}
      sub={[e.kind === "sleep" ? `${timeLabel(e.at)} – ${e.end != null ? timeLabel(e.end) + " · " + dur(e.end - e.at) : "now"}` : timeLabel(e.at), memberName(members, e.by)].filter(Boolean).join(" · ")}
      onLongPress={d === k ? () => { const cur = entries(k); write(cur.filter(x => x.id !== e.id)); toast({ text: "Entry removed", undo: () => write(cur) }); } : undefined} />
  ); };

  return (
    <Screen title="Baby log">
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button label="Feed" onPress={() => log("feed")} style={{ flex: 1 }} />
        <Button label="Diaper" onPress={() => log("diaper")} style={{ flex: 1 }} />
        <Button label={sleeping ? "Woke up" : "Sleep"} kind={sleeping ? "secondary" : "primary"} onPress={() => log("sleep")} style={{ flex: 1 }} />
      </View>
      <Card style={{ gap: 8 }}>
        {sleeping ? <T weight="semibold" color={c.sageInk}>Sleeping since {timeLabel(sleeping.at)}</T> : null}
        <T>Last feed: <T muted>{ago(last("feed"))}</T></T>
        <T>Last diaper: <T muted>{ago(last("diaper"))}</T></T>
        <T>Today: <T muted>{today.filter(e => e.kind === "feed").length} feeds · {today.filter(e => e.kind === "diaper").length} diapers · {dur(today.filter(e => e.kind === "sleep").reduce((n, e) => n + ((e.end ?? nowMin()) - e.at), 0))} sleep</T></T>
      </Card>
      {today.length === 0 && entries(yest).length === 0 ? <Empty title="Nothing logged yet" body="Tap Feed, Diaper or Sleep as it happens. Everyone sees the log, so whoever's on duty knows what's next." /> : null}
      {today.length ? <View><H2>Today</H2><Rows>{today.map(row(k))}</Rows></View> : null}
      {entries(yest).length ? <View><H2>{relDay(yest)}</H2><Rows>{entries(yest).map(row(yest))}</Rows></View> : null}
      {today.length ? <T size={13} muted center>Press and hold an entry to remove it.</T> : null}
    </Screen>
  );
}
