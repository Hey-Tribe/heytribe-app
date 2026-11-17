import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCol, useFamily } from "@/lib/store";
import { addDays, dayLabel, fromYmd, rid, ymd } from "@/lib/dates";
import type { Trip as TripRec } from "@/lib/types";
import { Button, Card, Check, Empty, Fade, H2, Pills, Row, Rows, T, useToast } from "@/ui/kit";
import { Screen } from "@/ui/Screen";
import { EntSheet, type EntEdit } from "@/ui/EntSheet";
import { useSave } from "@/ui/useSave";
import { font, radius, useColors } from "@/ui/theme";

type Tab = "plan" | "packing" | "care";

export default function Trip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fam = useFamily(), save = useSave(), toast = useToast(), c = useColors();
  const t = useCol<TripRec>("trips").find(x => x.id === id);
  const [tab, setTab] = useState<Tab>("plan");
  const [edit, setEdit] = useState<EntEdit>(null);
  const [text, setText] = useState(""), [day, setDay] = useState("");
  if (!t) return <Screen title="Trip" backLabel="Trips"><Empty title="This trip was deleted" body="Someone in the family removed it." /></Screen>;

  const days: string[] = [];
  if (t.start) { const end = t.end || t.start; for (let d = fromYmd(t.start); ymd(d) <= end && days.length < 30; d = addDays(d, 1)) days.push(ymd(d)); }
  const write = (field: "plan" | "packing", next: unknown[]) => save(fam.merge("trips", t.id, { [field]: next }));
  const plan = t.plan || [], packing = t.packing || [];
  const add = () => {
    const v = text.trim(); if (!v) return; setText("");
    if (tab === "plan") write("plan", [...plan, { id: rid(), day: day || days[0] || "", text: v.slice(0, 80) }]);
    else write("packing", [...packing, { id: rid(), text: v.slice(0, 60), packed: false }]);
  };
  const input = (ph: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderRadius: radius.card, borderWidth: 1, borderColor: c.hairline, paddingLeft: 16, paddingRight: 6 }}>
      <TextInput value={text} onChangeText={setText} onSubmitEditing={add} submitBehavior="submit" placeholder={ph} placeholderTextColor={c.muted} accessibilityLabel={ph}
        style={{ flex: 1, minHeight: 52, fontFamily: font.regular, fontSize: 16, color: c.ink }} />
      <Pressable onPress={add} accessibilityRole="button" accessibilityLabel="Add" style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="add" size={26} color={c.sageInk} />
      </Pressable>
    </View>
  );

  return (
    <Screen title={t.name} backLabel="Trips"
      pills={<Pills<Tab> items={[{ key: "plan", label: "Plan" }, { key: "packing", label: `Packing${packing.length ? ` ${packing.filter(p => !p.packed).length}` : ""}` }, { key: "care", label: "Pets & plants" }]} value={tab} onChange={setTab} />}>
      <T muted>{[t.where, t.start ? dayLabel(t.start) + (t.end && t.end !== t.start ? " – " + dayLabel(t.end) : "") : "Dates not set"].filter(Boolean).join(" · ")}</T>
      <Fade k={tab}>
        {tab === "plan" && <>
          {days.length > 1 ? <Pills<string> items={days.map(d => ({ key: d, label: dayLabel(d) }))} value={day || days[0]} onChange={setDay} /> : null}
          {input(days.length ? `Add to ${dayLabel(day || days[0])}…` : "Add a plan…")}
          {plan.length === 0 ? <T muted center>Nothing planned yet.</T> : (days.length ? days : [""]).map(d => {
            const items = plan.filter(p => (days.length ? p.day === d || (!p.day && d === days[0]) : true));
            return items.length ? <View key={d}><H2>{d ? dayLabel(d) : "Plans"}</H2>
              <Rows>{items.map(p => <Row key={p.id} title={p.text} onPress={() => { write("plan", plan.filter(x => x.id !== p.id)); toast({ text: "Removed", undo: () => write("plan", plan) }); }} sub="Tap to remove" />)}</Rows></View> : null;
          })}
        </>}
        {tab === "packing" && <>
          {input("Add to the packing list…")}
          {packing.length === 0 ? <T muted center>Nothing on the list yet.</T> :
            <Rows>{[...packing].sort((a, b) => Number(!!a.packed) - Number(!!b.packed)).map(p => (
              <Row key={p.id} title={p.text} strike={!!p.packed}
                left={<Check on={!!p.packed} label={(p.packed ? "Unpack " : "Packed ") + p.text} onPress={() => write("packing", packing.map(x => x.id === p.id ? { ...x, packed: !x.packed } : x))} />}
                onLongPress={() => { write("packing", packing.filter(x => x.id !== p.id)); toast({ text: "Removed", undo: () => write("packing", packing) }); }} />
            ))}</Rows>}
          {packing.length ? <T size={13} muted center>Press and hold an item to remove it.</T> : null}
        </>}
        {tab === "care" && <Card style={{ gap: 8 }}>
          <T muted={!t.petcare}>{t.petcare || "No notes yet. Add who's feeding the pets and watering the plants."}</T>
        </Card>}
      </Fade>
      <Button label="Edit trip" kind="secondary" onPress={() => setEdit({ kind: "trip", rec: t })} />
      <EntSheet value={edit} onClose={() => setEdit(null)} />
    </Screen>
  );
}
