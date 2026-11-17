import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useCol, useFamily } from "@/lib/store";
import { useSession } from "@/lib/session";
import { addDays, dayDiff, dayLabel, eventsOn, monthKey, nowMin, relDay, timeLabel, todayKey, ymd } from "@/lib/dates";
import { choreDone, choreOn, memberName, nextCountdown, sortMembers, weekDays } from "@/lib/family";
import type { Chore, Countdown, Event, Home, Med, Member, Note } from "@/lib/types";
import { Avatar, Card, Check, Empty, Fab, Fade, H2, Page, Pills, Row, Rows, T } from "@/ui/kit";
import { EventSheet } from "@/ui/EventSheet";
import { useSave } from "@/ui/useSave";
import { useColors } from "@/ui/theme";

type Tab = "today" | "tomorrow" | "week";

export default function Today() {
  const fam = useFamily(), save = useSave(), c = useColors();
  const { me } = useSession();
  const members = sortMembers(useCol<Member>("members"));
  const events = useCol<Event>("events").filter(e => e.title && e.date);
  const chores = useCol<Chore>("chores").filter(x => x.title);
  const notes = useCol<Note>("notes").filter(n => n.text).sort((a, b) => (b.at || 0) - (a.at || 0));
  const meds = useCol<Med>("meds").filter(m => m.name && m.times?.length);
  const home = useCol<Home>("home");
  const countdowns = useCol<Countdown>("countdowns").filter(x => x.title && x.date);
  const [tab, setTab] = useState<Tab>("today");
  const [edit, setEdit] = useState<{ e: Partial<Event>; day?: string } | null>(null);
  const k = todayKey(), tomorrow = ymd(addDays(new Date(), 1));
  const meName = members.find(m => m.id === me)?.name;
  const hour = new Date().getHours();
  const hello = `${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}${meName ? ", " + meName : ""}`;

  const eventRows = (day: string) => {
    const list = eventsOn(events, day);
    if (!list.length) return <Card><T muted>Nothing planned{day === k ? " today" : ""}.</T></Card>;
    return <Rows>{list.map(e => {
      const m = members.find(x => x.id === e.member);
      const past = day === k && !e.allDay && e.end < nowMin();
      return <Row key={e.id + day} title={e.title} strike={past} onPress={() => setEdit({ e, day })}
        sub={[e.allDay ? "All day" : `${timeLabel(e.start)} – ${timeLabel(e.end)}`, e.place, memberName(members, e.member)].filter(Boolean).join(" · ")}
        right={m ? <Avatar name={m.name} color={m.color} /> : null} />;
    })}</Rows>;
  };
  const choreRows = (day: string) => {
    const list = chores.filter(ch => choreOn(ch, day));
    if (!list.length) return null;
    const done = list.filter(ch => choreDone(ch, day)).length;
    return <View><H2 right={`${done} of ${list.length} done`}>Chores</H2>
      <Rows>{list.map(ch => {
        const d = choreDone(ch, day);
        return <Row key={ch.id} title={ch.title} strike={d} sub={memberName(members, ch.member)}
          left={<Check on={d} onPress={() => save(fam.merge("chores", ch.id, { done: { [day]: d ? null : true } }))} label={(d ? "Mark not done: " : "Mark done: ") + ch.title} />} />;
      })}</Rows></View>;
  };
  const medRows = (day: string) => {
    const list = meds.filter(m => (!m.start || m.start <= day) && (!m.until || m.until >= day))
      .flatMap(m => m.times.map(t => ({ m, t }))).sort((a, b) => a.t.localeCompare(b.t));
    if (!list.length) return null;
    return <View><H2>Medicine</H2><Rows>{list.map(({ m, t }) => {
      const given = !!m.log?.[day]?.[t];
      const [h, mi] = t.split(":").map(Number);
      return <Row key={m.id + t} title={m.name} strike={given} sub={[timeLabel(h * 60 + (mi || 0)), m.dose, memberName(members, m.member)].filter(Boolean).join(" · ")}
        left={<Check on={given} label={(given ? "Mark not given: " : "Mark given: ") + m.name}
          onPress={() => save(fam.merge("meds", m.id, { log: { [day]: { [t]: given ? null : { at: Date.now(), by: me || undefined } } } }))} />} />;
    })}</Rows></View>;
  };
  const billRows = () => {
    const mk = monthKey(new Date()), dom = new Date().getDate();
    const due = home.filter(h => h.kind === "bill" && h.name && h.dueDay && !h.paid?.[mk] && h.dueDay - dom <= 3 && h.dueDay - dom >= -5)
      .sort((a, b) => (a.dueDay || 0) - (b.dueDay || 0));
    if (!due.length) return null;
    return <View><H2>Bills due</H2><Rows>{due.map(b => (
      <Row key={b.id} title={b.name} sub={[b.dueDay! < dom ? "Overdue" : b.dueDay === dom ? "Due today" : `Due the ${ordinal(b.dueDay!)}`, b.amount ? `$${b.amount.toFixed(2)}` : null, b.autopay ? "Autopay" : null].filter(Boolean).join(" · ")}
        left={<Check on={false} label={"Mark paid: " + b.name} onPress={() => save(fam.merge("home", b.id, { paid: { [mk]: true } }))} />} />
    ))}</Rows></View>;
  };
  const nextCountdowns = countdowns.map(x => ({ x, day: nextCountdown(x, k) })).filter(o => o.day >= k).sort((a, b) => a.day.localeCompare(b.day)).slice(0, 3);

  const day = tab === "tomorrow" ? tomorrow : k;
  const empty = members.length === 0 && events.length === 0 && chores.length === 0;

  return (
    <Page title={tab === "week" ? "This week" : hello}
      pills={<Pills<Tab> items={[{ key: "today", label: "Today" }, { key: "tomorrow", label: "Tomorrow" }, { key: "week", label: "This week" }]} value={tab} onChange={setTab} />}
      action={<Fab label="Add plan" onPress={() => setEdit({ e: { date: tab === "tomorrow" ? tomorrow : k, member: me || "all" } })} />}>
      <Fade k={tab}>
        {empty ? <Empty title="Welcome to your family's home base" body="Start by adding the people in your family, then a plan or two." action={{ label: "Add family members", onPress: () => router.push("/family") }} /> : null}
        {tab !== "week" ? <>
          <View><H2 right={dayLabel(day)}>Plans</H2>{eventRows(day)}</View>
          {choreRows(day)}
          {medRows(day)}
          {tab === "today" ? billRows() : null}
          {tab === "today" && notes.length ? <View><H2 right={<T size={13} weight="medium" color={c.sageInk} onPress={() => router.push("/notes")}>All notes</T>}>Fridge notes</H2>
            <Card style={{ gap: 10 }}>{notes.slice(0, 3).map(n => <View key={n.id} style={{ gap: 2 }}><T>{n.text}</T><T size={12.5} muted>{memberName(members, n.by)}</T></View>)}</Card></View> : null}
          {tab === "today" && nextCountdowns.length ? <View><H2>Coming up</H2><Rows>{nextCountdowns.map(({ x, day: d }) => {
            const n = dayDiff(k, d);
            return <Row key={x.id} title={x.title} sub={dayLabel(d)} right={<T weight="semibold" color={c.sageInk}>{n === 0 ? "Today" : n === 1 ? "1 day" : `${n} days`}</T>} />;
          })}</Rows></View> : null}
        </> : weekDays().filter(d => d >= k).map(d => (
          <View key={d}><H2 right={chores.filter(ch => choreOn(ch, d)).length ? `${chores.filter(ch => choreOn(ch, d)).length} chores` : undefined}>{relDay(d)}</H2>{eventRows(d)}</View>
        ))}
      </Fade>
      <EventSheet value={edit?.e || null} day={edit?.day} members={members} onClose={() => setEdit(null)}
        onSave={v => { const { id, ...d } = v; save(fam.set("events", id || null, { ...(id ? fam.get("events", id) : {}), ...d })); setEdit(null); }}
        onDelete={v => { save(fam.remove("events", v.id!)); setEdit(null); }}
        onSkip={(v, d) => { save(fam.merge("events", v.id!, { skip: { [d]: true } })); setEdit(null); }} />
    </Page>
  );
}

const ordinal = (n: number) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
