import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { dayLabel, fromYmd, timeLabel, ymd } from "@/lib/dates";
import { T } from "./kit";
import { radius, useColors } from "./theme";

// A date ("YYYY-MM-DD") or a time of day (minutes after midnight) shown as a tappable field with the system picker.
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Wrap label={label} text={value ? dayLabel(value) : "Pick a date"} onPress={() => setOpen(o => !o)}>
      {open ? <DateTimePicker value={value ? fromYmd(value) : new Date()} mode="date" display={Platform.OS === "ios" ? "inline" : "default"}
        onChange={(e, d) => { if (Platform.OS !== "ios") setOpen(false); if (e.type !== "dismissed" && d) onChange(ymd(d)); }} /> : null}
    </Wrap>
  );
}
export function TimeField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false);
  const d = new Date(); d.setHours(Math.floor(value / 60), value % 60, 0, 0);
  return (
    <Wrap label={label} text={timeLabel(value)} onPress={() => setOpen(o => !o)}>
      {open ? <DateTimePicker value={d} mode="time" minuteInterval={5} display={Platform.OS === "ios" ? "spinner" : "default"}
        onChange={(e, t) => { if (Platform.OS !== "ios") setOpen(false); if (e.type !== "dismissed" && t) onChange(t.getHours() * 60 + t.getMinutes()); }} /> : null}
    </Wrap>
  );
}
function Wrap({ label, text, onPress, children }: { label: string; text: string; onPress: () => void; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <T size={13} weight="medium" muted>{label}</T>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${text}`}
        style={{ minHeight: 48, borderWidth: 1, borderColor: c.line, borderRadius: radius.input, paddingHorizontal: 14, justifyContent: "center", backgroundColor: c.surface }}>
        <T>{text}</T>
      </Pressable>
      {children}
    </View>
  );
}
