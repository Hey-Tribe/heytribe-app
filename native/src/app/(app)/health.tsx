import { useState } from "react";
import { View } from "react-native";
import { useCol, useFamily } from "@/lib/store";
import { useSession } from "@/lib/session";
import { dayDiff, dayLabel, timeLabel, todayKey } from "@/lib/dates";
import { label, RKIND, fromHHMM } from "@/lib/entities";
import { memberName, sortMembers } from "@/lib/family";
import type { Health as HealthRec, Med, Member } from "@/lib/types";
import { Avatar, Check, Empty, Fab, Fade, H2, Pills, Row, Rows, T } from "@/ui/kit";
import { Screen } from "@/ui/Screen";
import { EntSheet, type EntEdit } from "@/ui/EntSheet";
import { useSave } from "@/ui/useSave";
import { useColors } from "@/ui/theme";

type Tab = "meds" | "records";

export default function Health() {
  const fam = useFamily(), save = useSave(), c = useColors();
  const { me } = useSession();
  const members = sortMembers(useCol<Member>("members"));
  const meds = useCol<Med>("meds").filter(m => m.name);
  const records = useCol<HealthRec>("health").filter(r => r.title);
  const [tab, setTab] = useState<Tab>("meds");
  const [edit, setEdit] = useState<EntEdit>(null);
  const k = todayKey();
  const active = meds.filter(m => (!m.start || m.start <= k) && (!m.until || m.until >= k));
  const ended = meds.filter(m => m.until && m.until < k);
  const doses = active.flatMap(m => (m.times || []).map(t => ({ m, t }))).sort((a, b) => a.t.localeCompare(b.t));
  const dueSoon = records.filter(r => r.next && dayDiff(k, r.next) <= 30).sort((a, b) => String(a.next).localeCompare(String(b.next)));

  return (
    <Screen title="Health"
      pills={<Pills<Tab> items={[{ key: "meds", label: "Medicine" }, { key: "records", label: "Records" }]} value={tab} onChange={setTab} />}
      action={<Fab label={tab === "meds" ? "Add medicine" : "Add record"} onPress={() => setEdit({ kind: tab === "meds" ? "med" : "record" })} />}>
      <Fade k={tab}>
        {tab === "meds" && (meds.length === 0 ? <Empty title="No medicine yet" body="Add a medicine and its times. Anyone can tick a dose as given, so no one doubles up." /> : <>
          {doses.length ? <View><H2 right={`${doses.filter(({ m, t }) => m.log?.[k]?.[t]).length} of ${doses.length} given`}>Today</H2>
            <Rows>{doses.map(({ m, t }) => {
              const g = m.log?.[k]?.[t];
              return <Row key={m.id + t} title={`${m.name}${m.dose ? " · " + m.dose : ""}`} strike={!!g}
                sub={[timeLabel(fromHHMM(t)), memberName(members, m.member), g ? `given by ${memberName(members, g.by)}` : ""].filter(Boolean).join(" · ")}
                left={<Check on={!!g} label={(g ? "Mark not given: " : "Mark given: ") + m.name}
                  onPress={() => save(fam.merge("meds", m.id, { log: { [k]: { [t]: g ? null : { at: Date.now(), by: me || undefined } } } }))} />} />;
            })}</Rows></View> : null}
          <View><H2>All medicine</H2><Rows>{[...active, ...meds.filter(m => m.start && m.start > k), ...ended].map(m => (
            <Row key={m.id} title={m.name} onPress={() => setEdit({ kind: "med", rec: m })}
              sub={[memberName(members, m.member), m.until && m.until < k ? "Finished" : m.until ? `until ${dayLabel(m.until)}` : "Ongoing", m.note].filter(Boolean).join(" · ")}
              right={<Avatar name={members.find(x => x.id === m.member)?.name} color={members.find(x => x.id === m.member)?.color} />} />
          ))}</Rows></View>
        </>)}

        {tab === "records" && (records.length === 0 ? <Empty title="No health records yet" body="Checkups, vaccines, dentist visits and allergies, for each person, in one place." /> : <>
          {dueSoon.length ? <View><H2>Coming due</H2><Rows>{dueSoon.map(r => {
            const n = dayDiff(k, r.next!);
            return <Row key={r.id} title={r.title} onPress={() => setEdit({ kind: "record", rec: r })}
              sub={`${memberName(members, r.member)} · ${n < 0 ? "overdue" : n === 0 ? "today" : dayLabel(r.next!)}`}
              right={n < 0 ? <T size={13} weight="semibold" color={c.danger}>Overdue</T> : null} />;
          })}</Rows></View> : null}
          {members.filter(m => records.some(r => r.member === m.id)).map(m => (
            <View key={m.id}><H2>{m.name}</H2><Rows>{records.filter(r => r.member === m.id).sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).map(r => (
              <Row key={r.id} title={r.title} onPress={() => setEdit({ kind: "record", rec: r })}
                sub={[label(RKIND, r.kind), r.date ? dayLabel(r.date) : "", r.next ? `next ${dayLabel(r.next)}` : ""].filter(Boolean).join(" · ")} />
            ))}</Rows></View>
          ))}
        </>)}
      </Fade>
      <EntSheet value={edit} onClose={() => setEdit(null)} />
    </Screen>
  );
}
