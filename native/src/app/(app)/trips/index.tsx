import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useCol } from "@/lib/store";
import { dayDiff, dayLabel, todayKey } from "@/lib/dates";
import type { Trip } from "@/lib/types";
import { Empty, Fab, H2, Row, Rows, T } from "@/ui/kit";
import { Screen } from "@/ui/Screen";
import { EntSheet, type EntEdit } from "@/ui/EntSheet";
import { useColors } from "@/ui/theme";

export default function Trips() {
  const trips = useCol<Trip>("trips").filter(t => t.name);
  const [edit, setEdit] = useState<EntEdit>(null);
  const c = useColors(), k = todayKey();
  const upcoming = trips.filter(t => !t.end || t.end >= k).sort((a, b) => String(a.start || "9").localeCompare(String(b.start || "9")));
  const past = trips.filter(t => t.end && t.end < k).sort((a, b) => String(b.start).localeCompare(String(a.start)));
  const row = (t: Trip) => {
    const n = t.start ? dayDiff(k, t.start) : null, packed = (t.packing || []).filter(p => p.packed).length, total = (t.packing || []).length;
    return <Row key={t.id} title={t.name} onPress={() => router.push({ pathname: "/trips/[id]", params: { id: t.id } })}
      sub={[t.where, t.start ? dayLabel(t.start) + (t.end && t.end !== t.start ? " – " + dayLabel(t.end) : "") : "", total ? `${packed} of ${total} packed` : ""].filter(Boolean).join(" · ")}
      right={n !== null && n > 0 ? <T weight="semibold" color={c.sageInk}>{n === 1 ? "1 day" : `${n} days`}</T> : n !== null && n <= 0 && (!t.end || t.end >= k) ? <T weight="semibold" color={c.sageInk}>Now</T> : null} />;
  };
  return (
    <Screen title="Trips" action={<Fab label="Add trip" onPress={() => setEdit({ kind: "trip" })} />}>
      {trips.length === 0 ? <Empty title="No trips yet" body="Plan a trip: day-by-day plans, a shared packing list, and notes for whoever's watching the pets." action={{ label: "Plan a trip", onPress: () => setEdit({ kind: "trip" }) }} /> : <>
        {upcoming.length ? <View><H2>Coming up</H2><Rows>{upcoming.map(row)}</Rows></View> : null}
        {past.length ? <View><H2>Past trips</H2><Rows>{past.map(row)}</Rows></View> : null}
      </>}
      <EntSheet value={edit} onClose={() => setEdit(null)} />
    </Screen>
  );
}
