import { useState } from "react";
import { Pressable, View } from "react-native";
import { useCol, useFamily } from "@/lib/store";
import { useSession } from "@/lib/session";
import { addDays, daysIn, dayLabel, DOW, dowIdx, eventsOn, MONTHS, relDay, timeLabel, todayKey, ymd } from "@/lib/dates";
import { memberName, monday, sortMembers, weekDays } from "@/lib/family";
import type { Event, Member } from "@/lib/types";
import { Avatar, Button, Card, Empty, Fab, Fade, H2, Page, Pills, Row, Rows, T, useToast } from "@/ui/kit";
import { EventSheet } from "@/ui/EventSheet";
import { useSave } from "@/ui/useSave";
import { MEMBER, radius, useColors } from "@/ui/theme";

type Tab = "upcoming" | "week" | "month";

export default function Calendar() {
  const fam = useFamily(), save = useSave(), toast = useToast(), c = useColors();
  const { me } = useSession();
  const members = sortMembers(useCol<Member>("members"));
  const events = useCol<Event>("events").filter(e => e.title && e.date);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [weekStart, setWeekStart] = useState(() => monday());
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [picked, setPicked] = useState(todayKey());
  const [edit, setEdit] = useState<{ e: Partial<Event>; day?: string } | null>(null);
  const k = todayKey();

  const list = (day: string, showEmpty = true) => {
    const evs = eventsOn(events, day);
    if (!evs.length) return showEmpty ? <Card><T muted>Nothing planned.</T></Card> : null;
    return <Rows>{evs.map(e => {
      const m = members.find(x => x.id === e.member);
      return <Row key={e.id + day} title={e.title} onPress={() => setEdit({ e, day })}
        sub={[e.allDay ? "All day" : `${timeLabel(e.start)} – ${timeLabel(e.end)}`, e.place, memberName(members, e.member), e.repeat ? "Repeats" : null].filter(Boolean).join(" · ")}
        right={m ? <Avatar name={m.name} color={m.color} /> : null} />;
    })}</Rows>;
  };

  const upcoming = [...Array(30)].map((_, i) => ymd(addDays(new Date(), i))).filter(d => eventsOn(events, d).length);
  const remove = (e: Partial<Event>) => {
    const was = fam.get<Event>("events", e.id!);
    save(fam.remove("events", e.id!));
    if (was) toast({ text: "Plan deleted", undo: () => save(fam.set("events", was.id, was)) });
  };

  const y = month.getFullYear(), mo = month.getMonth();
  const lead = dowIdx(month), total = daysIn(y, mo);
  const cells = [...Array(lead).fill(null), ...[...Array(total)].map((_, i) => ymd(new Date(y, mo, i + 1)))];
  while (cells.length % 7) cells.push(null);

  return (
    <Page title="Calendar"
      pills={<Pills<Tab> items={[{ key: "upcoming", label: "Upcoming" }, { key: "week", label: "Week" }, { key: "month", label: "Month" }]} value={tab} onChange={setTab} />}
      action={<Fab label="Add plan" onPress={() => setEdit({ e: { date: tab === "month" ? picked : k, member: me || "all" } })} />}>
      <Fade k={tab}>
        {tab === "upcoming" && (upcoming.length === 0
          ? <Empty title="Nothing planned yet" body="Add practices, appointments and birthdays. Everyone in the family sees them." action={{ label: "Add a plan", onPress: () => setEdit({ e: { date: k, member: me || "all" } }) }} />
          : <>{upcoming.map(d => <View key={d}><H2 right={relDay(d) !== dayLabel(d) ? dayLabel(d) : undefined}>{relDay(d)}</H2>{list(d)}</View>)}
            <T size={13} muted center>Showing the next 30 days</T></>)}

        {tab === "week" && <>
          <Stepper label={`${dayLabel(ymd(weekStart)).split(", ")[1]} – ${dayLabel(ymd(addDays(weekStart, 6))).split(", ")[1]}`}
            onPrev={() => setWeekStart(addDays(weekStart, -7))} onNext={() => setWeekStart(addDays(weekStart, 7))}
            onToday={ymd(weekStart) !== ymd(monday()) ? () => setWeekStart(monday()) : undefined} />
          {weekDays(weekStart).map(d => <View key={d}><H2>{d === k ? `Today · ${dayLabel(d)}` : dayLabel(d)}</H2>{list(d)}</View>)}
        </>}

        {tab === "month" && <>
          <Stepper label={`${MONTHS[mo]} ${y}`} onPrev={() => setMonth(new Date(y, mo - 1, 1))} onNext={() => setMonth(new Date(y, mo + 1, 1))}
            onToday={y !== new Date().getFullYear() || mo !== new Date().getMonth() ? () => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setPicked(k); } : undefined} />
          <Card style={{ gap: 6 }}>
            <View style={{ flexDirection: "row" }}>{DOW.map(d => <T key={d} size={12} muted center style={{ flex: 1 }}>{d.slice(0, 2)}</T>)}</View>
            {[...Array(cells.length / 7)].map((_, r) => (
              <View key={r} style={{ flexDirection: "row" }}>
                {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
                  if (!d) return <View key={i} style={{ flex: 1, height: 48 }} />;
                  const evs = eventsOn(events, d), on = d === picked, today = d === k;
                  return (
                    <Pressable key={d} onPress={() => setPicked(d)} accessibilityRole="button"
                      accessibilityLabel={`${dayLabel(d)}${evs.length ? `, ${evs.length} plan${evs.length > 1 ? "s" : ""}` : ""}`} accessibilityState={{ selected: on }}
                      style={{ flex: 1, height: 48, alignItems: "center", justifyContent: "center", gap: 3, borderRadius: radius.input, backgroundColor: on ? c.pillOn : "transparent" }}>
                      <T size={15} weight={today || on ? "bold" : "regular"} color={today ? c.sageInk : undefined}>{Number(d.slice(8))}</T>
                      <View style={{ flexDirection: "row", gap: 2, height: 5 }}>
                        {evs.slice(0, 3).map(e => <View key={e.id} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: dot(members, e.member, c.sageBtn) }} />)}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </Card>
          <View><H2>{relDay(picked)}</H2>{list(picked)}</View>
        </>}
      </Fade>
      <EventSheet value={edit?.e || null} day={edit?.day} members={members} onClose={() => setEdit(null)}
        onSave={v => { const { id, ...d } = v; save(fam.set("events", id || null, { ...(id ? fam.get("events", id) : {}), ...d })); setEdit(null); }}
        onDelete={v => { remove(v); setEdit(null); }}
        onSkip={(v, d) => { save(fam.merge("events", v.id!, { skip: { [d]: true } })); setEdit(null); toast({ text: "Removed for that day", undo: () => save(fam.merge("events", v.id!, { skip: { [d]: null } })) }); }} />
    </Page>
  );
}

function dot(members: Member[], id: string | undefined, fallback: string) {
  const m = members.find(x => x.id === id);
  const key = (m?.color || "") as keyof typeof MEMBER;
  return MEMBER[key]?.dot || fallback;
}

function Stepper({ label, onPrev, onNext, onToday }: { label: string; onPrev: () => void; onNext: () => void; onToday?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Button label="‹" kind="secondary" onPress={onPrev} accessibilityHint="Previous" style={{ width: 48 }} />
      <T size={16} weight="semibold" center style={{ flex: 1 }}>{label}</T>
      {onToday ? <Button label="Today" kind="quiet" onPress={onToday} style={{ paddingHorizontal: 8 }} /> : null}
      <Button label="›" kind="secondary" onPress={onNext} accessibilityHint="Next" style={{ width: 48 }} />
    </View>
  );
}
