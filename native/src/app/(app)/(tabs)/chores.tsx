import { useMemo, useState } from "react";
import { View } from "react-native";
import { useCol, useFamily } from "@/lib/store";
import { useSession } from "@/lib/session";
import { addDays, dayLabel, DOW, relDay, todayKey, ymd } from "@/lib/dates";
import { choreDays, choreDone, choreOn, DEFAULT_GOAL, isBaby, memberName, sortMembers, weekDays, weekStars } from "@/lib/family";
import type { Chore, Member } from "@/lib/types";
import { Avatar, Button, Card, Check, Confirm, Empty, Fab, Fade, Field, H2, Page, Pills, Row, Rows, Sheet, T, useToast } from "@/ui/kit";
import { DayPicker, MemberPicker } from "@/ui/pickers";
import { useSave } from "@/ui/useSave";
import { useColors } from "@/ui/theme";

type Tab = "week" | "people" | "rewards" | "history";

export default function Chores() {
  const fam = useFamily(), save = useSave(), toast = useToast(), c = useColors();
  const { me } = useSession();
  const chores = useCol<Chore>("chores").filter(x => x.title);
  const members = sortMembers(useCol<Member>("members"));
  const people = members.filter(m => !isBaby(m));
  const [tab, setTab] = useState<Tab>("week");
  const [edit, setEdit] = useState<Partial<Chore> | null>(null);
  const [rewardFor, setRewardFor] = useState<Member | null>(null);
  const k = todayKey(), days = weekDays();

  const toggle = (ch: Chore, day: string) => {
    const was = choreDone(ch, day);
    save(fam.merge("chores", ch.id, { done: { [day]: was ? null : true } }));
  };
  const remove = (ch: Chore) => {
    save(fam.remove("chores", ch.id));
    toast({ text: "Chore deleted", undo: () => save(fam.set("chores", ch.id, ch)) });
  };
  const row = (ch: Chore, day: string, withWho = true) => {
    const m = members.find(x => x.id === ch.member), done = choreDone(ch, day);
    return (
      <Row key={ch.id + day} title={ch.title} strike={done} onPress={() => setEdit(ch)}
        sub={[withWho ? memberName(members, ch.member) : null, choreDays(ch).length === 7 ? "Every day" : choreDays(ch).map(i => DOW[i]).join(", ")].filter(Boolean).join(" · ")}
        left={<Check on={done} onPress={() => toggle(ch, day)} label={(done ? "Mark not done: " : "Mark done: ") + ch.title} />}
        right={m ? <Avatar name={m.name} color={m.color} /> : null} />
    );
  };

  const dueToday = chores.filter(ch => choreOn(ch, k));
  const later = days.filter(d => d > k).flatMap(d => chores.filter(ch => choreOn(ch, d) && !dueToday.includes(ch)).map(ch => ({ ch, d })))
    .filter((x, i, arr) => arr.findIndex(y => y.ch.id === x.ch.id) === i);
  const weekTotal = chores.reduce((n, ch) => n + days.filter(d => choreOn(ch, d)).length, 0);
  const weekDone = chores.reduce((n, ch) => n + days.filter(d => choreOn(ch, d) && choreDone(ch, d)).length, 0);

  const history = useMemo(() => {
    const out: { day: string; items: { ch: Chore }[] }[] = [];
    for (let i = 1; i <= 14; i++) {
      const d = ymd(addDays(new Date(), -i));
      const items = chores.filter(ch => choreDone(ch, d)).map(ch => ({ ch }));
      if (items.length) out.push({ day: d, items });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fam.version]);

  return (
    <Page title="Chores"
      pills={<Pills<Tab> items={[{ key: "week", label: "This week" }, { key: "people", label: "By person" }, { key: "rewards", label: "Rewards" }, { key: "history", label: "History" }]} value={tab} onChange={setTab} />}
      action={tab === "rewards" ? undefined : <Fab label="Add chore" onPress={() => setEdit({ member: me || people[0]?.id, days: [0, 1, 2, 3, 4, 5, 6] })} />}>
      <Fade k={tab}>
        {tab === "week" && (chores.length === 0
          ? <Empty title="No chores yet" body="Add a chore, pick who does it and which days. Kids earn a star each time they tick it off." action={{ label: "Add a chore", onPress: () => setEdit({ member: me || people[0]?.id, days: [0, 1, 2, 3, 4, 5, 6] }) }} />
          : <>
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <T weight="semibold">{weekDone} of {weekTotal} done</T><T size={13} muted>{dayLabel(days[0]).split(", ")[1]} – {dayLabel(days[6]).split(", ")[1]}</T>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: c.sageSoft, overflow: "hidden" }}>
                <View style={{ height: 6, width: `${weekTotal ? Math.round(weekDone / weekTotal * 100) : 0}%`, backgroundColor: c.sageBtn, borderRadius: 3 }} />
              </View>
            </Card>
            <View><H2 right={dayLabel(k)}>Today</H2>
              {dueToday.length ? <Rows>{dueToday.map(ch => row(ch, k))}</Rows> : <Card><T muted>Nothing due today.</T></Card>}
            </View>
            {later.length ? <View><H2 right={`${later.length} chores`}>Later this week</H2><Rows>{later.map(({ ch, d }) => row(ch, d))}</Rows></View> : null}
          </>)}

        {tab === "people" && (people.length === 0 ? <Empty title="No family members yet" body="Add the people in your family under More › Family, then give them chores." /> :
          people.map(m => {
            const mine = chores.filter(ch => ch.member === m.id);
            const stars = weekStars(chores, m.id), goal = Math.max(1, Number(m.goal) || DEFAULT_GOAL);
            return (
              <Card key={m.id} style={{ gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Avatar name={m.name} color={m.color} size={40} />
                  <View style={{ flex: 1 }}><T size={16} weight="semibold">{m.name}</T><T size={13} muted>{stars} of {goal} stars this week</T></View>
                </View>
                {mine.length ? mine.map(ch => (
                  <View key={ch.id} style={{ gap: 6 }}>
                    <T size={14} weight="medium">{ch.title}</T>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {days.map((d, i) => {
                        const on = choreOn(ch, d), done = choreDone(ch, d), future = d > k;
                        return (
                          <View key={d} style={{ flex: 1, alignItems: "center", gap: 2 }}>
                            <T size={11} muted>{DOW[i].slice(0, 2)}</T>
                            {on && !future ? <Check on={done} onPress={() => toggle(ch, d)} label={`${ch.title}, ${DOW[i]}`} />
                              : <View style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}><T muted>{on ? "○" : "·"}</T></View>}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )) : <T muted size={14}>No chores yet.</T>}
              </Card>
            );
          }))}

        {tab === "rewards" && (people.length === 0 ? <Empty title="No family members yet" body="Add people under More › Family to set rewards." /> :
          <Rows>{people.map(m => {
            const stars = weekStars(chores, m.id), goal = Math.max(1, Number(m.goal) || DEFAULT_GOAL);
            return <Row key={m.id} title={m.reward || "Pick a reward"} sub={`${m.name} · ${stars} of ${goal} stars this week${stars >= goal ? " · earned!" : ""}`}
              left={<Avatar name={m.name} color={m.color} />} right={<T size={14} weight="medium" color={c.sageInk}>Edit</T>} onPress={() => setRewardFor(m)} />;
          })}</Rows>)}

        {tab === "history" && (history.length === 0 ? <Empty title="Nothing ticked off yet" body="Chores done in the last two weeks show up here." /> :
          <>{history.map(h => (
            <View key={h.day}><H2>{relDay(h.day)}</H2>
              <Rows>{h.items.map(({ ch }) => <Row key={ch.id} title={ch.title} sub={memberName(members, ch.member)} left={<Check on onPress={() => toggle(ch, h.day)} label={"Undo " + ch.title} />} />)}</Rows>
            </View>
          ))}<T size={13} muted center>Showing the last 14 days</T></>)}
      </Fade>

      <ChoreSheet value={edit} members={people} onClose={() => setEdit(null)}
        onSave={v => { const { id, ...d } = v; save(fam.set("chores", id || null, { ...(id ? fam.get("chores", id) : {}), ...d })); setEdit(null); }}
        onDelete={v => { remove(v as Chore); setEdit(null); }} />
      <RewardSheet member={rewardFor} onClose={() => setRewardFor(null)}
        onSave={(m, reward, goal) => { save(fam.merge("members", m.id, { reward, goal })); setRewardFor(null); }} />
    </Page>
  );
}

function ChoreSheet({ value, members, onClose, onSave, onDelete }: {
  value: Partial<Chore> | null; members: Member[]; onClose: () => void; onSave: (v: Partial<Chore>) => void; onDelete: (v: Partial<Chore>) => void;
}) {
  const [title, setTitle] = useState(""), [member, setMember] = useState(""), [days, setDays] = useState<number[]>([]);
  const [ask, setAsk] = useState(false), [err, setErr] = useState<string | null>(null);
  const c = useColors();
  const [seen, setSeen] = useState<Partial<Chore> | null>(null);
  if (value !== seen) { setSeen(value); setTitle(value?.title || ""); setMember(value?.member || members[0]?.id || ""); setDays(value?.days?.length ? value.days : [0, 1, 2, 3, 4, 5, 6]); setErr(null); }
  return (
    <Sheet open={!!value} onClose={onClose} title={value?.id ? "Edit chore" : "New chore"}>
      <Field label="Chore" placeholder="Feed the dog" value={title} onChangeText={setTitle} autoFocus={!value?.id} />
      <MemberPicker members={members} value={member} onChange={setMember} everyone={false} />
      <DayPicker value={days} onChange={setDays} />
      {err ? <T size={14} color={c.danger}>{err}</T> : null}
      <Button label={value?.id ? "Save" : "Add chore"} onPress={() => {
        if (!title.trim()) return setErr("Give the chore a name.");
        if (!days.length) return setErr("Pick at least one day.");
        onSave({ ...value, title: title.trim(), member, days });
      }} />
      {value?.id ? <Button label="Delete chore" kind="quiet" onPress={() => setAsk(true)} /> : null}
      <Confirm open={ask} title={`Delete “${title}”?`} body="It's removed for everyone in the family. You can undo right after." yes="Delete chore"
        onYes={() => onDelete(value!)} onClose={() => setAsk(false)} />
    </Sheet>
  );
}

function RewardSheet({ member, onClose, onSave }: { member: Member | null; onClose: () => void; onSave: (m: Member, reward: string, goal: number) => void }) {
  const [reward, setReward] = useState(""), [goal, setGoal] = useState("");
  const [seen, setSeen] = useState<Member | null>(null);
  if (member !== seen) { setSeen(member); setReward(member?.reward || ""); setGoal(String(member?.goal || DEFAULT_GOAL)); }
  return (
    <Sheet open={!!member} onClose={onClose} title={member ? `${member.name}'s reward` : ""}>
      <Field label="Saving up for" placeholder="Pick the Friday movie" value={reward} onChangeText={setReward} />
      <Field label="Stars needed each week" value={goal} onChangeText={setGoal} keyboardType="number-pad" />
      <Button label="Save" onPress={() => member && onSave(member, reward.trim(), Math.max(1, Math.min(99, parseInt(goal, 10) || DEFAULT_GOAL)))} />
    </Sheet>
  );
}
