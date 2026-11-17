import { useState } from "react";
import { Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCol, useFamily } from "@/lib/store";
import { timeLabel, todayKey } from "@/lib/dates";
import { fromHHMM } from "@/lib/entities";
import { sortMembers } from "@/lib/family";
import type { Member, Routine } from "@/lib/types";
import { Avatar, Button, Card, Empty, Fab, T } from "@/ui/kit";
import { Screen } from "@/ui/Screen";
import { EntSheet, type EntEdit } from "@/ui/EntSheet";
import { useSave } from "@/ui/useSave";
import { useColors } from "@/ui/theme";

// Step-by-step checklists (bedtime, getting out the door). Ticks reset each day.
export default function Routines() {
  const fam = useFamily(), save = useSave(), c = useColors();
  const members = sortMembers(useCol<Member>("members"));
  const routines = useCol<Routine>("routines").filter(r => r.name).sort((a, b) => String(a.time || "99").localeCompare(String(b.time || "99")));
  const [edit, setEdit] = useState<EntEdit>(null);
  const k = todayKey();

  return (
    <Screen title="Routines" action={<Fab label="Add routine" onPress={() => setEdit({ kind: "routine" })} />}>
      {routines.length === 0 ? <Empty title="No routines yet" body="Make a checklist for bedtime or school mornings. Kids tick each step; it resets tomorrow." action={{ label: "Add a routine", onPress: () => setEdit({ kind: "routine" }) }} />
        : routines.map(r => {
          const m = members.find(x => x.id === r.member), done = r.done?.[k] || {};
          const n = (r.steps || []).filter(s => done[s.id]).length, total = (r.steps || []).length;
          return (
            <Card key={r.id} style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                {m ? <Avatar name={m.name} color={m.color} size={36} /> : null}
                <View style={{ flex: 1 }}>
                  <T size={16.5} weight="semibold">{r.name}</T>
                  <T size={13} muted>{[m?.name, r.time ? timeLabel(fromHHMM(r.time)) : "", n === total && total ? "All done!" : `${n} of ${total}`].filter(Boolean).join(" · ")}</T>
                </View>
                <Button label="Edit" kind="quiet" onPress={() => setEdit({ kind: "routine", rec: r })} />
              </View>
              {(r.steps || []).map(s => (
                <Pressable key={s.id} onPress={() => save(fam.merge("routines", r.id, { done: { [k]: { [s.id]: !done[s.id] } } }))}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }} accessibilityRole="checkbox" accessibilityState={{ checked: !!done[s.id] }} accessibilityLabel={s.text}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: done[s.id] ? c.sageBtn : c.line, backgroundColor: done[s.id] ? c.sageBtn : "transparent", alignItems: "center", justifyContent: "center" }}>
                    {done[s.id] ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                  </View>
                  <T strike={!!done[s.id]} muted={!!done[s.id]} style={{ flex: 1 }}>{s.text}</T>
                </Pressable>
              ))}
            </Card>
          );
        })}
      <EntSheet value={edit} onClose={() => setEdit(null)} />
      {routines.length ? <T size={13} muted center>Ticks start fresh every morning.</T> : null}
    </Screen>
  );
}
