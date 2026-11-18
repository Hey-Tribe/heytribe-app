import { useState } from "react";
import { Pressable, Share, View } from "react-native";
import { useCol, useFamily } from "@/lib/store";
import { useSession } from "@/lib/session";
import { SAMPLE, SITE } from "@/lib/config";
import { sortMembers } from "@/lib/family";
import type { Member } from "@/lib/types";
import { Avatar, Button, Card, Choice, Confirm, Empty, Fab, Field, H2, Row, Rows, Sheet, T, useToast } from "@/ui/kit";
import { router } from "expo-router";
import { Screen } from "@/ui/Screen";
import { useSave } from "@/ui/useSave";
import { MEMBER, MEMBER_COLORS, useColors } from "@/ui/theme";

export default function Family() {
  const fam = useFamily(), save = useSave(), toast = useToast(), c = useColors();
  const { me, setMe, code } = useSession();
  const members = sortMembers(useCol<Member>("members"));
  const [edit, setEdit] = useState<Partial<Member> | null>(null);
  const [rename, setRename] = useState<string | null>(null);
  const name = fam.tribe?.name || "Your family";

  const invite = () => Share.share({ message: `Join our family on HeyTribe. Open ${SITE}/app/ and use the family code ${code}.` });

  return (
    <Screen title="Family" action={<Fab label="Add person" onPress={() => setEdit({ color: MEMBER_COLORS[members.length % MEMBER_COLORS.length], order: members.length })} />}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}><T size={18} weight="semibold">{name}</T>{code !== SAMPLE ? <T size={13} muted>Family code {code}</T> : null}</View>
          {code !== SAMPLE ? <Button label="Rename" kind="quiet" onPress={() => setRename(name)} /> : null}
        </View>
        {code !== SAMPLE ? <Button label="Invite someone" kind="secondary" onPress={invite} accessibilityHint="Shares the family code" /> : null}
      </Card>
      {members.length === 0 ? <Empty title="No one here yet" body="Add each person in your family, kids and babies too. Then you can give them plans, chores and rewards." />
        : <View><H2 right={`${members.length} people`}>People</H2>
          <Rows>{members.map(m => <Row key={m.id} title={m.id === me ? `${m.name} (you)` : m.name} sub={m.style === "baby" ? "Baby" : m.style === "kid" ? "Kid" : undefined}
            left={<Avatar name={m.name} color={m.color} />} onPress={() => setEdit(m)} />)}</Rows></View>}
      {members.some(m => m.style === "kid") ? <View><H2>Kid view</H2>
        <Rows>{members.filter(m => m.style === "kid").map(m => <Row key={m.id} title={`Open ${m.name}'s view`} sub="Big, simple screen with their routines and chores"
          left={<Avatar name={m.name} color={m.color} />} onPress={() => router.push({ pathname: "/kid/[id]", params: { id: m.id } })} />)}</Rows></View> : null}
      {members.length && !me ? <Card style={{ gap: 8 }}><T weight="semibold">Which one is you?</T><T size={14} muted>Tap a person, then “This is me”, so chores and reminders know who you are.</T></Card> : null}

      <MemberSheet value={edit} isMe={!!edit?.id && edit.id === me} onClose={() => setEdit(null)} c={c}
        onSave={v => { const { id, ...d } = v; save(fam.set("members", id || null, { ...(id ? fam.get("members", id) : {}), ...d })); setEdit(null); }}
        onMe={v => { setMe(v.id!).catch(() => toast({ text: "That didn't save. Try again." })); setEdit(null); }}
        onDelete={v => { const was = fam.get<Member>("members", v.id!); save(fam.remove("members", v.id!)); setEdit(null); if (was) toast({ text: `${was.name} removed`, undo: () => save(fam.set("members", was.id, was)) }); }} />
      <Sheet open={rename !== null} onClose={() => setRename(null)} title="Family name">
        <Field label="Name" value={rename || ""} onChangeText={setRename} maxLength={40} autoFocus />
        <Button label="Save" onPress={() => { const n = (rename || "").trim(); if (n) save(fam.renameTribe(n)); setRename(null); }} />
      </Sheet>
    </Screen>
  );
}

function MemberSheet({ value, isMe, onClose, onSave, onDelete, onMe, c }: {
  value: Partial<Member> | null; isMe: boolean; c: ReturnType<typeof useColors>;
  onClose: () => void; onSave: (v: Partial<Member>) => void; onDelete: (v: Partial<Member>) => void; onMe: (v: Partial<Member>) => void;
}) {
  const [v, setV] = useState<Partial<Member>>({});
  const [seen, setSeen] = useState<Partial<Member> | null>(null);
  const [ask, setAsk] = useState(false), [err, setErr] = useState<string | null>(null);
  if (value !== seen) { setSeen(value); setV(value || {}); setErr(null); }
  return (
    <Sheet open={!!value} onClose={onClose} title={value?.id ? "Edit person" : "Add a person"}>
      <Field label="Name" placeholder="Maya" value={v.name || ""} onChangeText={t => setV(o => ({ ...o, name: t }))} maxLength={30} autoFocus={!value?.id} />
      <View style={{ gap: 6 }}>
        <T size={13} weight="medium" muted>Color</T>
        <View style={{ flexDirection: "row", gap: 12 }} accessibilityRole="radiogroup">
          {MEMBER_COLORS.map(col => (
            <Pressable key={col} onPress={() => setV(o => ({ ...o, color: col }))} accessibilityRole="radio" accessibilityLabel={col} accessibilityState={{ checked: v.color === col }}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: MEMBER.dot[col], borderWidth: 3, borderColor: v.color === col ? c.ink : "transparent" }} />
          ))}
        </View>
      </View>
      <Choice label="Look" items={[{ key: "short", label: "Short hair" }, { key: "long", label: "Long hair" }, { key: "kid", label: "Kid" }, { key: "baby", label: "Baby" }]}
        value={(v.style || "short") as string} onChange={st => setV(o => ({ ...o, style: st }))} />
      {err ? <T size={14} color={c.danger}>{err}</T> : null}
      <Button label={value?.id ? "Save" : "Add person"} onPress={() => { if (!v.name?.trim()) return setErr("Add a name."); onSave({ ...v, name: v.name.trim() }); }} />
      {value?.id && !isMe && v.style !== "baby" && v.style !== "kid" ? <Button label="This is me" kind="secondary" onPress={() => onMe(value)} /> : null}
      {value?.id ? <Button label="Remove from family" kind="quiet" onPress={() => setAsk(true)} /> : null}
      <Confirm open={ask} title={`Remove ${v.name}?`} body="Their plans and chores stay, but won't show a name. You can undo right after." yes="Remove"
        onYes={() => onDelete(value!)} onClose={() => setAsk(false)} />
    </Sheet>
  );
}
