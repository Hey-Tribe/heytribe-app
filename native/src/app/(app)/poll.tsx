import { useState } from "react";
import { Pressable, View } from "react-native";
import { useFamily } from "@/lib/store";
import { useSession } from "@/lib/session";
import type { Poll as PollRec } from "@/lib/types";
import { Button, Card, Empty, Field, Sheet, T } from "@/ui/kit";
import { Screen } from "@/ui/Screen";
import { useSave } from "@/ui/useSave";
import { radius, useColors } from "@/ui/theme";

// One family poll at a time ("Friday dinner?"). Each person gets one vote; tapping again moves it.
export default function Poll() {
  const fam = useFamily(), save = useSave(), c = useColors();
  const { me } = useSession();
  const poll = fam.get<PollRec & { id: string }>("poll", "current");
  const [open, setOpen] = useState(false), [q, setQ] = useState(""), [o, setO] = useState(""), [err, setErr] = useState<string | null>(null);
  const total = poll ? poll.options.reduce((n, x) => n + (x.votes || []).length, 0) : 0;

  const vote = (i: number) => {
    if (!poll || !me) return;
    const options = poll.options.map((x, j) => ({ label: x.label, votes: (x.votes || []).filter(v => v !== me).concat(j === i && !(x.votes || []).includes(me) ? [me] : []) }));
    save(fam.set("poll", "current", { question: poll.question, options }));
  };
  const start = () => { setQ(poll?.question || ""); setO(poll ? poll.options.map(x => x.label).join("\n") : ""); setErr(null); setOpen(true); };

  return (
    <Screen title="Family poll">
      {!poll || !poll.question ? <Empty title="No poll right now" body="Ask the family something: where to eat, which movie, what to do Saturday." action={{ label: "Start a poll", onPress: start }} /> : <>
        <Card style={{ gap: 14 }}>
          <T size={19} weight="semibold">{poll.question}</T>
          {poll.options.map((x, i) => {
            const n = (x.votes || []).length, mine = !!me && (x.votes || []).includes(me), pct = total ? n / total : 0;
            return (
              <Pressable key={i} onPress={() => vote(i)} disabled={!me} accessibilityRole="radio" accessibilityState={{ checked: mine, disabled: !me }}
                accessibilityLabel={`${x.label}, ${n} ${n === 1 ? "vote" : "votes"}`}
                style={{ minHeight: 52, borderRadius: radius.input, borderWidth: 1.5, borderColor: mine ? c.sageBtn : c.line, overflow: "hidden", justifyContent: "center" }}>
                <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.round(pct * 100)}%`, backgroundColor: c.pillOn }} />
                <View style={{ flexDirection: "row", paddingHorizontal: 14, alignItems: "center" }}>
                  <T weight={mine ? "semibold" : "regular"} style={{ flex: 1 }}>{x.label}</T>
                  <T size={14} muted>{n}</T>
                </View>
              </Pressable>
            );
          })}
          <T size={13} muted>{!me ? "Pick who you are under Family to vote." : total ? `${total} ${total === 1 ? "vote" : "votes"} so far` : "No votes yet. Tap a choice."}</T>
        </Card>
        <Button label="New poll" kind="secondary" onPress={start} />
      </>}
      <Sheet open={open} onClose={() => setOpen(false)} title="Family poll">
        <Field label="Question" placeholder="Where should we eat Friday?" value={q} onChangeText={setQ} maxLength={80} />
        <Field label="Choices, one per line" placeholder={"Pizza\nTacos\nCook at home"} value={o} onChangeText={setO} multiline />
        {err ? <T size={14} color={c.danger}>{err}</T> : null}
        <Button label="Save poll" onPress={() => {
          const labels = o.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 6);
          if (!q.trim()) return setErr("Add a question.");
          if (labels.length < 2) return setErr("Add at least two choices.");
          const same = poll && labels.join("|") === poll.options.map(x => x.label).join("|");
          save(fam.set("poll", "current", { question: q.trim(), options: same ? poll!.options : labels.map(label => ({ label, votes: [] })) }));
          setOpen(false);
        }} />
      </Sheet>
    </Screen>
  );
}
