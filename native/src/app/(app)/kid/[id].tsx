import { Pressable, ScrollView, useColorScheme, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCol, useFamily } from "@/lib/store";
import { DOW, eventsOn, timeLabel, todayKey } from "@/lib/dates";
import { fromHHMM } from "@/lib/entities";
import { choreOn, weekStars } from "@/lib/family";
import type { Chore, Event, Member, Routine } from "@/lib/types";
import { Avatar, Button, T } from "@/ui/kit";
import { useSave } from "@/ui/useSave";
import { MEMBER, radius, useColors } from "@/ui/theme";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// A big, simple screen for one kid: today's plans, their routines and chores. Same as Kid view on the web.
export default function Kid() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fam = useFamily(), save = useSave(), c = useColors(), insets = useSafeAreaInsets(), dark = useColorScheme() === "dark";
  const m = useCol<Member>("members").find(x => x.id === id);
  const events = useCol<Event>("events").filter(e => e.title && e.date);
  const routines = useCol<Routine>("routines").filter(r => r.member === id).sort((a, b) => fromHHMM(a.time || "99:00") - fromHHMM(b.time || "99:00"));
  const chores = useCol<Chore>("chores");
  const k = todayKey(), ti = (new Date().getDay() + 6) % 7;
  if (!m) return null;
  const evs = eventsOn(events, k).filter(e => e.member === id || e.member === "all");
  const mine = chores.filter(ch => ch.member === id && choreOn(ch, k));
  const stars = weekStars(chores, id);

  const big = (on: boolean, label: string, onPress: () => void, star = false) => (
    <Pressable key={label} onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={{ flexDirection: "row", alignItems: "center", gap: 16, minHeight: 68, paddingHorizontal: 18, borderRadius: radius.card, backgroundColor: on ? c.pillOn : c.surface, borderWidth: 1, borderColor: c.hairline }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, borderColor: on ? c.sageBtn : c.line, backgroundColor: on ? c.sageBtn : "transparent", alignItems: "center", justifyContent: "center" }}>
        {on ? <Ionicons name={star ? "star" : "checkmark"} size={24} color="#fff" /> : null}
      </View>
      <T size={20} weight="medium" strike={on} style={{ flex: 1 }}>{label}</T>
    </Pressable>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, gap: 22 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar name={m.name} color={m.color} size={68} />
        <View style={{ flex: 1 }}>
          <T size={28} weight="bold" color={c.sageInk}>Hi {m.name}!</T>
          <T size={22} weight="medium">{DAYS[ti] || DOW[ti]}</T>
        </View>
        <Button label="Done" kind="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace("/family"))} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: radius.card, backgroundColor: (dark ? MEMBER.dark : MEMBER.light).rose }}>
        <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: MEMBER.dot.rose, alignItems: "center", justifyContent: "center" }}><Ionicons name="star" size={26} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <T size={26} weight="bold">{stars} {stars === 1 ? "star" : "stars"}</T>
          <T muted>{m.reward ? `Saving up for ${m.reward}` : "this week"}</T>
        </View>
      </View>
      {evs.length ? <View style={{ gap: 10 }}><T size={14} weight="semibold" muted>TODAY</T>
        {evs.map(e => <View key={e.id} style={{ flexDirection: "row", gap: 14, alignItems: "center", minHeight: 60, paddingHorizontal: 18, borderRadius: radius.card, backgroundColor: c.surface, borderWidth: 1, borderColor: c.hairline }}>
          <T size={18} weight="semibold" style={{ width: 80 }}>{e.allDay ? "All day" : timeLabel(e.start)}</T><T size={20} style={{ flex: 1 }}>{e.title}</T></View>)}</View> : null}
      {routines.map(r => {
        const done = r.done?.[k] || {};
        return <View key={r.id} style={{ gap: 10 }}>
          <T size={14} weight="semibold" muted>{r.name.toUpperCase()}{r.time ? " · " + timeLabel(fromHHMM(r.time)) : ""}</T>
          {(r.steps || []).map(s => big(!!done[s.id], s.text, () => save(fam.merge("routines", r.id, { done: { [k]: { [s.id]: !done[s.id] } } }))))}
        </View>;
      })}
      {mine.length ? <View style={{ gap: 10 }}><T size={14} weight="semibold" muted>CHORES</T>
        {mine.map(ch => { const on = !!ch.done?.[k]; return big(on, ch.title, () => save(fam.merge("chores", ch.id, { done: { [k]: on ? null : true } })), true); })}</View> : null}
      {!evs.length && !routines.length && !mine.length ? <View style={{ alignItems: "center", gap: 6, paddingVertical: 40 }}>
        <T size={22} weight="semibold" color={c.sageInk}>Nothing to do today!</T><T muted center>Ask a grown-up to add chores or a routine.</T></View> : null}
    </ScrollView>
  );
}
