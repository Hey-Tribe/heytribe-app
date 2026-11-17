import { Pressable, View } from "react-native";
import { DOW } from "@/lib/dates";
import type { Member } from "@/lib/types";
import { Choice, T } from "./kit";
import { radius, useColors } from "./theme";

// Who something belongs to: one pill per person, plus "Everyone" when allowed.
export function MemberPicker({ members, value, onChange, everyone = true, label = "Who" }: {
  members: Member[]; value: string; onChange: (id: string) => void; everyone?: boolean; label?: string;
}) {
  const items = [...(everyone ? [{ key: "all", label: "Everyone" }] : []), ...members.map(m => ({ key: m.id, label: m.name }))];
  return <Choice label={label} items={items} value={value} onChange={onChange} />;
}

// Which weekdays something repeats on (0 = Monday).
export function DayPicker({ value, onChange }: { value: number[]; onChange: (d: number[]) => void }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <T size={13} weight="medium" muted>Days</T>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {DOW.map((d, i) => {
          const on = value.includes(i);
          return (
            <Pressable key={d} onPress={() => onChange(on ? value.filter(x => x !== i) : [...value, i].sort())}
              accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={d}
              style={{ flex: 1, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.pillOn : c.pill }}>
              <T size={13} weight={on ? "semibold" : "medium"} color={on ? c.sageInk : c.muted}>{d.slice(0, 2)}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
