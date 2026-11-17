import { useState } from "react";
import { View } from "react-native";
import { useCol, useFamily } from "@/lib/store";
import { dayDiff, dayLabel, todayKey, ymd } from "@/lib/dates";
import { memberName, monday, weekDays } from "@/lib/family";
import type { Member, School as SchoolRec } from "@/lib/types";
import { Button, Card, Check, Empty, Fab, Fade, Field, H2, Pills, Row, Rows, Sheet, T } from "@/ui/kit";
import { Screen } from "@/ui/Screen";
import { EntSheet, type EntEdit } from "@/ui/EntSheet";
import { useSave } from "@/ui/useSave";
import { useColors } from "@/ui/theme";

type Tab = "forms" | "lunch";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function School() {
  const fam = useFamily(), save = useSave(), c = useColors();
  const members = useCol<Member>("members");
  const all = useCol<SchoolRec>("school");
  const [tab, setTab] = useState<Tab>("forms");
  const [edit, setEdit] = useState<EntEdit>(null);
  const [lunchOpen, setLunchOpen] = useState(false);
  const [lunch, setLunch] = useState<Record<string, string>>({});
  const k = todayKey(), wk = ymd(monday());
  const slips = all.filter(x => x.kind === "slip" && x.title).sort((a, b) => Number(!!a.done) - Number(!!b.done) || String(a.due || "9").localeCompare(String(b.due || "9")));
  const week = all.find(x => x.id === "lunch-" + wk)?.days || {};
  const days = weekDays().slice(0, 5);

  return (
    <Screen title="School"
      pills={<Pills<Tab> items={[{ key: "forms", label: "Forms" }, { key: "lunch", label: "Lunch" }]} value={tab} onChange={setTab} />}
      action={tab === "forms" ? <Fab label="Add form" onPress={() => setEdit({ kind: "slip" })} /> : undefined}>
      <Fade k={tab}>
        {tab === "forms" && (slips.length === 0 ? <Empty title="No forms to sign" body="Permission slips, picture day, book orders. Add them so nothing is missed on the due date." /> :
          <Rows>{slips.map(x => {
            const n = x.due ? dayDiff(k, x.due) : null;
            return <Row key={x.id} title={x.title!} strike={!!x.done} onPress={() => setEdit({ kind: "slip", rec: x })}
              sub={[memberName(members, x.member), x.done ? "Signed and returned" : x.due ? (n! < 0 ? `Was due ${dayLabel(x.due)}` : n === 0 ? "Due today" : `Due ${dayLabel(x.due)}`) : ""].filter(Boolean).join(" · ")}
              left={<Check on={!!x.done} label={(x.done ? "Mark not returned: " : "Mark signed and returned: ") + x.title} onPress={() => save(fam.merge("school", x.id, { done: !x.done }))} />}
              right={!x.done && n !== null && n < 0 ? <T size={13} weight="semibold" color={c.danger}>Late</T> : null} />;
          })}</Rows>)}

        {tab === "lunch" && <>
          <View><H2 right={<T size={13} weight="medium" color={c.sageInk} onPress={() => { setLunch(Object.fromEntries(Object.entries(week).map(([i, v]) => [i, String(v)]))); setLunchOpen(true); }}>Edit</T>}>Lunch this week</H2>
            <Card style={{ gap: 12 }}>{days.map((d, i) => (
              <View key={d} style={{ flexDirection: "row", gap: 12 }}>
                <T weight={d === k ? "bold" : "medium"} color={d === k ? c.sageInk : undefined} style={{ width: 96 }}>{DAYS[i]}</T>
                <T muted={!week[i]} style={{ flex: 1 }}>{week[i] || "Not set"}</T>
              </View>
            ))}</Card>
          </View>
          <T size={13} muted center>Copy it from the school menu once a week. Everyone sees what&apos;s for lunch.</T>
        </>}
      </Fade>
      <EntSheet value={edit} onClose={() => setEdit(null)} />
      <Sheet open={lunchOpen} onClose={() => setLunchOpen(false)} title="Lunch this week">
        {DAYS.map((d, i) => <Field key={d} label={d} value={lunch[i] || ""} onChangeText={t => setLunch(o => ({ ...o, [i]: t }))} placeholder="Pizza day" maxLength={60} />)}
        <Button label="Save" onPress={() => {
          const out: Record<string, string> = {}; Object.entries(lunch).forEach(([i, v]) => { if (v.trim()) out[i] = v.trim(); });
          save(fam.set("school", "lunch-" + wk, { kind: "lunch", week: wk, days: out })); setLunchOpen(false);
        }} />
      </Sheet>
    </Screen>
  );
}
