import { useState } from "react";
import { Switch, View } from "react-native";
import type { Event, Member, Repeat } from "@/lib/types";
import { Button, Choice, Confirm, Field, Sheet, T } from "./kit";
import { MemberPicker } from "./pickers";
import { DateField, TimeField } from "./when";
import { useColors } from "./theme";

const REPEATS: { key: Repeat; label: string }[] = [
  { key: "", label: "Just once" }, { key: "weekly", label: "Every week" }, { key: "biweekly", label: "Every 2 weeks" },
  { key: "monthly", label: "Every month" }, { key: "yearly", label: "Every year" },
];

// Add or edit a plan. For a repeating plan opened from one day, "Delete" offers that day only or every time.
export function EventSheet({ value, day, members, onClose, onSave, onDelete, onSkip }: {
  value: Partial<Event> | null; day?: string; members: Member[];
  onClose: () => void; onSave: (e: Partial<Event>) => void; onDelete: (e: Partial<Event>) => void; onSkip: (e: Partial<Event>, day: string) => void;
}) {
  const c = useColors();
  const [v, setV] = useState<Partial<Event>>({});
  const [seen, setSeen] = useState<Partial<Event> | null>(null);
  const [ask, setAsk] = useState(false), [err, setErr] = useState<string | null>(null);
  if (value !== seen) { setSeen(value); setV(value ? { start: 540, end: 600, repeat: "", member: "all", ...value } : {}); setErr(null); }
  const up = (p: Partial<Event>) => setV(o => ({ ...o, ...p }));
  const repeating = !!(value?.id && value.repeat);
  return (
    <Sheet open={!!value} onClose={onClose} title={value?.id ? "Edit plan" : "New plan"}>
      <Field label="What" placeholder="Soccer practice" value={v.title || ""} onChangeText={t => up({ title: t })} autoFocus={!value?.id} />
      <DateField label="Date" value={v.date || ""} onChange={d => up({ date: d })} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <T weight="medium">All day</T>
        <Switch value={!!v.allDay} onValueChange={a => up({ allDay: a })} trackColor={{ true: c.sageBtn }} accessibilityLabel="All day" />
      </View>
      {!v.allDay ? (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TimeField label="Starts" value={v.start ?? 540} onChange={s => up({ start: s, end: Math.max(s + 15, (v.end ?? s + 60) - (v.start ?? s) + s) })} />
          <TimeField label="Ends" value={v.end ?? 600} onChange={e => up({ end: e })} />
        </View>
      ) : null}
      <Choice label="Repeats" items={REPEATS} value={(v.repeat || "") as Repeat} onChange={r => up({ repeat: r })} />
      <MemberPicker members={members} value={v.member || "all"} onChange={m => up({ member: m })} />
      <Field label="Where (optional)" placeholder="Westside Field" value={v.place || ""} onChangeText={t => up({ place: t })} />
      <Field label="Note (optional)" value={v.note || ""} onChangeText={t => up({ note: t })} multiline />
      {err ? <T size={14} color={c.danger}>{err}</T> : null}
      <Button label={value?.id ? "Save" : "Add plan"} onPress={() => {
        if (!v.title?.trim()) return setErr("Say what the plan is.");
        if (!v.date) return setErr("Pick a date.");
        if (!v.allDay && (v.end ?? 0) <= (v.start ?? 0)) return setErr("The end time is before the start.");
        onSave({ ...v, title: v.title.trim(), place: v.place?.trim() || undefined, note: v.note?.trim() || undefined });
      }} />
      {value?.id ? <Button label={repeating && day ? "Delete…" : "Delete plan"} kind="quiet" onPress={() => setAsk(true)} /> : null}
      {repeating && day ? (
        <Sheet open={ask} onClose={() => setAsk(false)} title={`Delete “${v.title}”?`}>
          <T muted>This plan repeats. Remove just this day, or every time?</T>
          <Button label="Only this day" kind="secondary" onPress={() => { setAsk(false); onSkip(value!, day); }} />
          <Button label="Every time" kind="danger" onPress={() => { setAsk(false); onDelete(value!); }} />
          <Button label="Keep it" kind="quiet" onPress={() => setAsk(false)} />
        </Sheet>
      ) : (
        <Confirm open={ask} title={`Delete “${v.title}”?`} body="It's removed for everyone in the family. You can undo right after." yes="Delete plan"
          onYes={() => onDelete(value!)} onClose={() => setAsk(false)} />
      )}
    </Sheet>
  );
}
