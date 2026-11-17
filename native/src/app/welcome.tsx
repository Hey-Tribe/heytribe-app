import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/lib/session";
import { SAMPLE } from "@/lib/config";
import { Button, Card, Field, Pills, Rows, Row, T } from "@/ui/kit";
import { space, useColors } from "@/ui/theme";

// Signed in but not in a family yet: start one, or ask to join one with its code.
export default function Welcome() {
  const c = useColors(), insets = useSafeAreaInsets();
  const { createFamily, joinFamily, pending, families, open, signOut, reloadFamilies } = useSession();
  const [mode, setMode] = useState<"new" | "join">("new");
  const [family, setFamily] = useState(""), [you, setYou] = useState(""), [code, setCode] = useState("");
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<string | null>(null), [ok, setOk] = useState<string | null>(null);

  async function start() {
    setMsg(null);
    if (!family.trim() || !you.trim()) return setMsg("Add your family's name and your first name.");
    setBusy(true);
    try { await createFamily(family.trim(), you.trim()); } catch (e: any) { setMsg(e?.message || "Couldn't start your family. Try again."); }
    setBusy(false);
  }
  async function join() {
    setMsg(null); setOk(null);
    const c6 = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (c6.length < 6) return setMsg("Family codes are 6 letters and numbers. Ask a parent for it.");
    setBusy(true);
    try {
      const sent = await joinFamily(c6);
      if (sent) setOk("Request sent. A parent in that family will see it and let you in."); else setMsg("We couldn't find a family with that code.");
    } catch (e: any) { setMsg(e?.message || "Couldn't send the request. Try again."); }
    setBusy(false);
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 22 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 6 }}>
        <T size={30} weight="bold" style={{ lineHeight: 36 }}>Set up your family</T>
        <T muted>Start a new family space, or join one someone already made.</T>
      </View>

      {families.length ? (
        <Rows>{families.map(f => <Row key={f.tribe_code} title={f.name} sub="Open" onPress={() => open(f.tribe_code)} />)}</Rows>
      ) : null}

      <View style={{ marginHorizontal: -space.gutter }}>
        <Pills items={[{ key: "new", label: "Start a family" }, { key: "join", label: "Join with a code" }]} value={mode} onChange={m => { setMode(m); setMsg(null); setOk(null); }} />
      </View>

      {mode === "new" ? (
        <Card style={{ gap: 14 }}>
          <Field label="Family name" placeholder="The Garcias" value={family} onChangeText={setFamily} autoCapitalize="words" />
          <Field label="Your first name" placeholder="Maria" value={you} onChangeText={setYou} autoCapitalize="words" textContentType="givenName" />
          {msg ? <T size={14} color={c.danger}>{msg}</T> : null}
          <Button label="Start our family" onPress={start} busy={busy} />
        </Card>
      ) : (
        <Card style={{ gap: 14 }}>
          <Field label="Family code" placeholder="ABC123" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} maxLength={8} />
          <T size={13} muted>Find it in the app under Family. A parent approves new people before they can see anything.</T>
          {msg ? <T size={14} color={c.danger}>{msg}</T> : null}
          {ok ? <T size={14} color={c.sageInk}>{ok}</T> : null}
          <Button label="Ask to join" onPress={join} busy={busy} />
        </Card>
      )}

      {pending.length ? (
        <Card style={{ gap: 8 }}>
          <T weight="semibold">Waiting for approval</T>
          {pending.map(p => <T key={p.tribe_code} muted>{p.name} · code {p.tribe_code}</T>)}
          <Button label="Check again" kind="secondary" onPress={reloadFamilies} />
        </Card>
      ) : null}

      <Button label="Look around with a sample family" kind="secondary" onPress={() => open(SAMPLE)} />
      <Button label="Sign out" kind="quiet" onPress={signOut} />
    </ScrollView>
  );
}
