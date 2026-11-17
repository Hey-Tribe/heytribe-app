import { useState } from "react";
import { Switch, View } from "react-native";
import { ENT } from "@/lib/entities";
import { useCol, useFamily } from "@/lib/store";
import { useSession } from "@/lib/session";
import { sortMembers } from "@/lib/family";
import type { Member, Routine } from "@/lib/types";
import { Button, Choice, Confirm, Field, Sheet, T, useToast } from "./kit";
import { MemberPicker } from "./pickers";
import { DateField } from "./when";
import { useSave } from "./useSave";
import { usePremium } from "@/lib/premium";
import { router } from "expo-router";
import { useColors } from "./theme";

export type EntEdit = { kind: string; rec?: any; preset?: Record<string, unknown> } | null;

// One add/edit sheet for every simple area. Fields come from ENT (src/lib/entities.ts).
export function EntSheet({ value, onClose }: { value: EntEdit; onClose: () => void }) {
  const fam = useFamily(), save = useSave(), toast = useToast(), c = useColors();
  const { me } = useSession();
  const members = sortMembers(useCol<Member>("members"));
  const routines = useCol<Routine>("routines");
  const { limited } = usePremium();
  const upsell = (msg: string) => { onClose(); toast({ text: msg, undo: undefined }); router.push("/premium"); };
  const E = value ? ENT[value.kind] : null;
  const [v, setV] = useState<Record<string, any>>({});
  const [seen, setSeen] = useState<EntEdit>(null);
  const [err, setErr] = useState<string | null>(null), [ask, setAsk] = useState(false);
  if (value !== seen) {
    setSeen(value); setErr(null);
    const rec = value?.rec || {}, init: Record<string, any> = {};
    (E?.fields || []).forEach(f => {
      init[f.name] = f.get ? f.get(rec) : rec[f.name] ?? value?.preset?.[f.name] ??
        (f.type === "members" ? me || members[0]?.id : f.type === "members+all" ? "all" : f.type === "select" ? f.options?.[0]?.[0] : f.value ?? "");
      if (f.type === "number" && init[f.name] !== "" && init[f.name] != null) init[f.name] = String(init[f.name]);
    });
    setV(init);
  }
  if (!E || !value) return <Sheet open={false} onClose={onClose} title=""><View /></Sheet>;
  const id = value.rec?.id as string | undefined;

  const submit = () => {
    let data: any = { ...(E.fixed || {}) };
    for (const f of E.fields) {
      let val = v[f.name];
      if (f.type === "checkbox") val = !!val;
      else if (f.type === "number") val = val === "" || val == null ? null : Number(val);
      else val = String(val ?? "").trim();
      if (f.required && (val === "" || val == null || Number.isNaN(val))) return setErr(`Add ${f.label.toLowerCase().replace(/\s*\(.*\)/, "")}.`);
      data[f.name] = val;
    }
    if (E.toData) { data = E.toData(data, value.rec || {}); if (data?.error) return setErr(data.error); }
    if (limited && value.kind === "countdown" && data.yearly && !value.rec?.yearly) return upsell("Yearly repeats for birthdays and holidays are a Premium extra.");
    if (limited && value.kind === "routine") {
      if (!id && routines.filter(r => r.member === data.member).length >= 2) return upsell("Free families get two routines per person. Premium makes it unlimited.");
      if ((data.steps || []).length > 8) return setErr("Free routines have up to 8 steps. Premium allows 20.");
    }
    if (id) save(fam.merge(E.col, id, data), "Saved");
    else save(fam.set(E.col, null, { ...data, by: me || undefined, at: Date.now() }), "Added");
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={(id ? "Edit " : "New ") + E.title.toLowerCase()}>
      {E.fields.map((f, i) => {
        const set = (x: any) => setV(o => ({ ...o, [f.name]: x }));
        switch (f.type) {
          case "members": case "members+all":
            return <MemberPicker key={f.name} label={f.label} members={members} value={v[f.name] || ""} onChange={set} everyone={f.type === "members+all"} />;
          case "select":
            return <Choice key={f.name} label={f.label} items={(f.options || []).map(([k, l]) => ({ key: k, label: l }))} value={v[f.name]} onChange={set} />;
          case "date":
            return <DateField key={f.name} label={f.label} value={v[f.name] || ""} onChange={set} />;
          case "checkbox":
            return <View key={f.name} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <T weight="medium" style={{ flex: 1 }}>{f.label}</T>
              <Switch value={!!v[f.name]} onValueChange={set} trackColor={{ true: c.sageBtn }} accessibilityLabel={f.label} />
            </View>;
          default:
            return <Field key={f.name} label={f.label} placeholder={f.ph} value={String(v[f.name] ?? "")} onChangeText={set} autoFocus={!id && i === 0}
              multiline={f.type === "textarea"} keyboardType={f.type === "number" ? "decimal-pad" : f.type === "tel" ? "phone-pad" : f.type === "email" ? "email-address" : "default"}
              autoCapitalize={f.type === "email" ? "none" : "sentences"} />;
        }
      })}
      {err ? <T size={14} color={c.danger}>{err}</T> : null}
      <Button label={id ? "Save" : "Add"} onPress={submit} />
      {id ? <Button label="Delete" kind="quiet" onPress={() => setAsk(true)} /> : null}
      <Confirm open={ask} title={`Delete this ${E.title.toLowerCase()}?`} body="It's removed for everyone in the family. You can undo right after." yes="Delete"
        onClose={() => setAsk(false)} onYes={() => {
          const was = value.rec; save(fam.remove(E.col, id!)); onClose();
          toast({ text: `${E.title} deleted`, undo: () => save(fam.set(E.col, was.id, was)) });
        }} />
    </Sheet>
  );
}
