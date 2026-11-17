import { useCallback, useEffect, useState } from "react";
import { Share, View } from "react-native";
import { useFamily } from "@/lib/store";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { SAMPLE, SITE } from "@/lib/config";
import { dayLabel, ymd } from "@/lib/dates";
import type { Sitter as SitterInfo } from "@/lib/types";
import { Button, Card, Field, H2, Pills, Sheet, T, useToast } from "@/ui/kit";
import { Screen } from "@/ui/Screen";
import { useSave } from "@/ui/useSave";

const LENGTHS: [string, string][] = [["1", "Tonight"], ["2", "2 days"], ["7", "A week"], ["30", "A month"]];

// House notes for the sitter, and a private link that shows them the care sheet without an account.
export default function Sitter() {
  const fam = useFamily(), save = useSave(), toast = useToast();
  const { code } = useSession();
  const info = (fam.get<SitterInfo & { id: string }>("info", "sitter") || {}) as SitterInfo;
  const [link, setLink] = useState<{ token: string; expires_at: string } | null>(null);
  const [len, setLen] = useState("1"), [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<SitterInfo | null>(null);
  const sample = code === SAMPLE;
  const url = (t: string) => `${SITE}/sitter/?t=${t}`;

  const load = useCallback(async () => {
    if (sample) return;
    const r = await supabase.from("sitter_links").select("token, expires_at").eq("tribe_code", code!).maybeSingle();
    setLink(r.data && new Date(r.data.expires_at) > new Date() ? r.data : null);
  }, [code, sample]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const make = async () => {
    setBusy(true);
    const r = await supabase.rpc("make_sitter_link", { p_code: code!, p_days: Number(len) });
    setBusy(false);
    if (r.error) return toast({ text: "Couldn't make a link. Try again." });
    const token = (r.data as { token: string }).token;
    await load();
    Share.share({ message: `Here's our family care sheet: ${url(token)}` });
  };
  const stop = async () => {
    const r = await supabase.rpc("stop_sitter_link", { p_code: code! });
    if (r.error) return toast({ text: "Couldn't turn it off. Try again." });
    setLink(null); toast({ text: "Sitter link turned off" });
  };
  const notes: [keyof SitterInfo, string][] = [["address", "Address"], ["wifi", "Wi-Fi"], ["rules", "House rules"], ["notes", "Other notes"]];

  return (
    <Screen title="Sitter">
      <View><H2 right={<T size={13} weight="medium" onPress={() => setEdit({ ...info })}>Edit</T>}>House notes</H2>
        <Card style={{ gap: 12 }}>{notes.map(([key, l]) => (
          <View key={key} style={{ gap: 2 }}><T size={13} muted>{l}</T><T muted={!info[key]}>{info[key] || "Not added"}</T></View>
        ))}</Card>
      </View>
      <View><H2>Share with a sitter</H2>
        <Card style={{ gap: 12 }}>
          <T muted>A private link that shows the care sheet: kids, allergies, medicine, bedtime routines, emergency contacts and these notes. No app or login needed. Health records, documents and everything else stay private.</T>
          {sample ? <T muted>Sitter links aren&apos;t available in the sample family.</T> : <>
            {link ? <View style={{ gap: 8 }}>
              <T weight="semibold">Link is on until {dayLabel(ymd(new Date(link.expires_at)))}</T>
              <Button label="Share link" onPress={() => Share.share({ message: `Here's our family care sheet: ${url(link.token)}` })} />
              <Button label="Turn off" kind="quiet" onPress={stop} />
            </View> : null}
            <T size={13} weight="medium" muted>{link ? "Make a new link" : "How long should it work?"}</T>
            <Pills<string> items={LENGTHS.map(([k, l]) => ({ key: k, label: l }))} value={len} onChange={setLen} />
            <Button label={link ? "Make a new link" : "Make a link"} kind={link ? "secondary" : "primary"} busy={busy} onPress={make} />
          </>}
        </Card>
      </View>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title="House notes">
        {notes.map(([key, l]) => <Field key={key} label={l} value={edit?.[key] || ""} onChangeText={t => setEdit(o => ({ ...o, [key]: t }))} multiline={key === "rules" || key === "notes"} />)}
        <Button label="Save" onPress={() => {
          const out: SitterInfo = {}; notes.forEach(([key]) => { out[key] = (edit?.[key] || "").trim(); });
          save(fam.set("info", "sitter", out), "Saved"); setEdit(null);
        }} />
      </Sheet>
    </Screen>
  );
}
