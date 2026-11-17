import { useState } from "react";
import { Linking, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { SAMPLE, SITE } from "@/lib/config";
import { Button, Card, Field, Pills, T } from "@/ui/kit";
import { font, space, useColors } from "@/ui/theme";

type Mode = "in" | "up";

// Human messages for the auth errors people actually hit.
function friendly(msg: string) {
  if (/invalid login/i.test(msg)) return "That email and password don't match. Try again, or reset your password.";
  if (/email not confirmed/i.test(msg)) return "Confirm your email first. We sent you a link when you signed up.";
  if (/already registered|already exists/i.test(msg)) return "There's already an account with that email. Sign in instead.";
  if (/password/i.test(msg) && /(weak|short|pwned|leaked|characters)/i.test(msg)) return "Pick a stronger password: at least 8 characters, and not one that's been in a data breach.";
  if (/network|fetch/i.test(msg)) return "No connection. Check your internet and try again.";
  return msg;
}

export default function SignIn() {
  const c = useColors(), insets = useSafeAreaInsets();
  const { open, recordTerms } = useSession();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<string | null>(null), [ok, setOk] = useState<string | null>(null);

  async function submit() {
    setMsg(null); setOk(null);
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return setMsg("Enter your email address.");
    if (password.length < 8) return setMsg("Passwords are at least 8 characters.");
    setBusy(true);
    try {
      if (mode === "in") {
        const r = await supabase.auth.signInWithPassword({ email: e, password });
        if (r.error) throw r.error;
      } else {
        const r = await supabase.auth.signUp({ email: e, password, options: { emailRedirectTo: SITE + "/app/" } });
        if (r.error) throw r.error;
        if (r.data.session) await recordTerms("sign_up").catch(() => {});
        else setOk("Check your email for a link to confirm your account, then sign in here.");
      }
    } catch (err: any) { setMsg(friendly(err?.message || "Something went wrong.")); }
    setBusy(false);
  }

  async function reset() {
    setMsg(null); setOk(null);
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return setMsg("Enter your email above, then tap Forgot password.");
    const r = await supabase.auth.resetPasswordForEmail(e, { redirectTo: SITE + "/app/" });
    if (r.error) setMsg(friendly(r.error.message)); else setOk("If there's an account for that email, a reset link is on its way.");
  }

  async function apple() {
    setMsg(null);
    try {
      const raw = Crypto.randomUUID() + Crypto.randomUUID();
      const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL], nonce,
      });
      if (!cred.identityToken) throw new Error("Apple didn't return a sign-in token.");
      const out = await supabase.auth.signInWithIdToken({ provider: "apple", token: cred.identityToken, nonce: raw });
      if (out.error) throw out.error;
      // Hand Apple's one-time code to the server so the account can be revoked at Apple if it's ever deleted.
      if (cred.authorizationCode && out.data.session) {
        fetch(SITE + "/api/apple-signin", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + out.data.session.access_token }, body: JSON.stringify({ code: cred.authorizationCode }) }).catch(() => {});
      }
    } catch (err: any) {
      if (err?.code === "ERR_REQUEST_CANCELED") return;
      setMsg(friendly(err?.message || "Apple sign-in didn't work."));
    }
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32, paddingHorizontal: space.gutter, gap: 22 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 6 }}>
        <T size={34} weight="bold" style={{ letterSpacing: -0.4, lineHeight: 40 }}>HeyTribe</T>
        <T muted size={16}>One calm place for your family’s plans, chores and lists.</T>
      </View>

      <View style={{ marginHorizontal: -space.gutter }}>
        <Pills items={[{ key: "in", label: "Sign in" }, { key: "up", label: "Create account" }]} value={mode} onChange={m => { setMode(m); setMsg(null); setOk(null); }} />
      </View>

      <Card style={{ gap: 14 }}>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "in" ? "current-password" : "new-password"} textContentType={mode === "in" ? "password" : "newPassword"} onSubmitEditing={submit} />
        {msg ? <T size={14} color={c.danger} accessibilityLiveRegion="polite">{msg}</T> : null}
        {ok ? <T size={14} color={c.sageInk}>{ok}</T> : null}
        <Button label={mode === "in" ? "Sign in" : "Create account"} onPress={submit} busy={busy} />
        {mode === "in"
          ? <Button label="Forgot password" kind="quiet" onPress={reset} />
          : <T size={13} muted center>By creating an account you agree to the{" "}
              <T size={13} color={c.sageInk} weight="medium" style={{ fontFamily: font.medium }} >Terms</T> and{" "}
              <T size={13} color={c.sageInk} weight="medium">Privacy Policy</T>.</T>}
      </Card>
      {mode === "up" ? (
        <View style={{ flexDirection: "row", gap: 18, justifyContent: "center" }}>
          <Button label="Read the Terms" kind="quiet" onPress={() => Linking.openURL(SITE + "/terms.html")} />
          <Button label="Privacy Policy" kind="quiet" onPress={() => Linking.openURL(SITE + "/privacy.html")} />
        </View>
      ) : null}

      {Platform.OS === "ios" ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={mode === "in" ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN : AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={25} style={{ height: 50 }} onPress={apple} />
      ) : null}

      <Button label="Look around with a sample family" kind="secondary" onPress={() => open(SAMPLE)} />
    </ScrollView>
  );
}
