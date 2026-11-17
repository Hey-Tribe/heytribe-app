import { useState } from "react";
import { Linking, View } from "react-native";
import * as Application from "expo-application";
import { useSession } from "@/lib/session";
import { useFamily } from "@/lib/store";
import { SAMPLE, SITE } from "@/lib/config";
import { Button, Card, Confirm, Field, H2, Row, Rows, Sheet, T, useToast } from "@/ui/kit";
import { Screen } from "@/ui/Screen";
import { useColors } from "@/ui/theme";

export default function Settings() {
  const { session, families, code, open, signOut, leaveFamily, deleteAccount } = useSession();
  const fam = useFamily(), toast = useToast(), c = useColors();
  const [leave, setLeave] = useState(false), [del, setDel] = useState(false);
  const [word, setWord] = useState(""), [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const sample = code === SAMPLE;

  return (
    <Screen title="Settings">
      {session ? <View><H2>Account</H2><Card style={{ gap: 4 }}><T size={13} muted>Signed in as</T><T weight="medium">{session.user.email || "Apple account"}</T></Card></View> : null}

      <View><H2>Families</H2>
        <Rows>
          {families.map(f => <Row key={f.tribe_code} title={f.name} sub={f.tribe_code === code ? "Open now" : "Tap to switch"} onPress={f.tribe_code === code ? undefined : () => open(f.tribe_code)} />)}
          <Row title={sample ? "Leave the sample family" : "Sample family"} sub={sample ? "Back to your own family" : "Look around with made-up data"}
            onPress={() => open(sample ? families[0]?.tribe_code || null : SAMPLE)} />
        </Rows>
      </View>

      <View><H2>Help and legal</H2>
        <Rows>
          <Row title="Help center" onPress={() => Linking.openURL(`${SITE}/help.html`)} />
          <Row title="Write to us" sub="hello@heytribe.app" onPress={() => Linking.openURL("mailto:hello@heytribe.app")} />
          <Row title="Privacy policy" onPress={() => Linking.openURL(`${SITE}/privacy.html`)} />
          <Row title="Terms of service" onPress={() => Linking.openURL(`${SITE}/terms.html`)} />
        </Rows>
      </View>

      <View style={{ gap: 10 }}>
        {!sample && session ? <Button label={`Leave ${fam.tribe?.name || "this family"}`} kind="secondary" onPress={() => setLeave(true)} /> : null}
        {session ? <Button label="Sign out" kind="secondary" onPress={() => signOut()} /> : <Button label="Sign in" onPress={() => open(null)} />}
        {session ? <Button label="Delete my account" kind="quiet" onPress={() => { setWord(""); setErr(null); setDel(true); }} /> : null}
      </View>
      <T size={12.5} muted center>HeyTribe {Application.nativeApplicationVersion || ""} ({Application.nativeBuildVersion || "dev"})</T>

      <Confirm open={leave} title={`Leave ${fam.tribe?.name || "this family"}?`} body="You'll stop seeing this family's plans and lists. Someone in the family can invite you back." yes="Leave family"
        onYes={() => leaveFamily().catch(() => toast({ text: "Couldn't leave the family. Try again." }))} onClose={() => setLeave(false)} />
      <Sheet open={del} onClose={() => setDel(false)} title="Delete your account?">
        <T muted>This deletes your sign-in and removes you from every family. Family data others still use stays with them. It can’t be undone.</T>
        <Field label="Type DELETE to confirm" value={word} onChangeText={setWord} autoCapitalize="characters" autoCorrect={false} />
        {err ? <T size={14} color={c.danger}>{err}</T> : null}
        <Button label="Delete my account" kind="danger" busy={busy} onPress={async () => {
          if (word.trim().toUpperCase() !== "DELETE") return setErr("Type DELETE in capital letters.");
          setBusy(true);
          try { await deleteAccount(); setDel(false); } catch { setErr("Couldn't delete your account. Check your connection and try again."); }
          setBusy(false);
        }} />
        <Button label="Keep my account" kind="quiet" onPress={() => setDel(false)} />
      </Sheet>
    </Screen>
  );
}
