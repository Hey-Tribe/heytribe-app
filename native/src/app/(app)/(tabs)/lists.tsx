import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCol, useFamily } from "@/lib/store";
import { useSession } from "@/lib/session";
import type { Item } from "@/lib/types";
import { Button, Check, Empty, Fade, Field, H2, Page, Pills, Row, Rows, Sheet, T, useToast } from "@/ui/kit";
import { useSave } from "@/ui/useSave";
import { font, radius, useColors } from "@/ui/theme";

// Same sections and word rules as the web app (SECTIONS in spa/app.js), so both sort items the same way.
const SECTIONS: [string, RegExp][] = [
  ["produce", /avocado|banana|apple|cilantro|lettuce|tomato|onion|lime|lemon|berr|potato|carrot|pepper|spinach|fruit|veg|garlic|cucumber|grape|orange|mango|plantain|corn\b/i],
  ["dairy", /milk|egg|cheese|yogurt|yoghurt|butter|cream/i],
  ["bakery", /bread|tortilla|bagel|bun\b|buns|roll|pita|muffin/i],
  ["meat & fish", /chicken|beef|pork|fish|turkey|salmon|bacon|sausage|shrimp|steak|ham\b/i],
  ["pantry", /rice|bean|pasta|flour|sugar|oil|cereal|coffee|salt|sauce|can\b|cans|oat|honey|spice|salsa|chips|snack|cracker|tea\b/i],
  ["baby", /diaper|wipe|formula|puffs|baby|pacifier/i],
  ["household", /paper|soap|detergent|towel|trash|foil|sponge|bleach|batter|bulb|toilet/i],
  ["pharmacy", /vitamin|tylenol|ibuprofen|bandage|medicine|prescription|toothpaste|shampoo/i],
];
export const sectionFor = (t: string) => (SECTIONS.find(([, r]) => r.test(t)) || ["other"])[0];
const ORDER = [...SECTIONS.map(s => s[0]), "other"];
const DEFAULT = "Groceries";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Lists() {
  const fam = useFamily(), save = useSave(), toast = useToast(), c = useColors();
  const { me } = useSession();
  const items = useCol<Item>("items").filter(i => i.text);
  const [extra, setExtra] = useState<string[]>([]);
  const names = [...new Set([DEFAULT, "Costco", "Pharmacy", ...items.map(i => i.list || DEFAULT), ...extra])];
  const [list, setList] = useState(DEFAULT);
  const [text, setText] = useState("");
  const [edit, setEdit] = useState<Item | null>(null);
  const [newList, setNewList] = useState<string | null>(null);
  const cur = names.includes(list) ? list : DEFAULT;
  const mine = items.filter(i => (i.list || DEFAULT) === cur);
  const groups = ORDER.map(s => [s, mine.filter(i => (i.section || sectionFor(i.text)) === s)
    .sort((a, b) => Number(!!a.checked) - Number(!!b.checked) || (a.at || 0) - (b.at || 0))] as const).filter(([, a]) => a.length);
  const checked = mine.filter(i => i.checked);

  const add = () => {
    const t = text.trim().slice(0, 80);
    if (!t) return;
    setText("");
    save(fam.set("items", null, { text: t, list: cur, section: sectionFor(t), by: me || undefined, checked: false, at: Date.now() }));
  };
  const clear = () => {
    const gone = checked.slice();
    gone.forEach(i => save(fam.remove("items", i.id)));
    toast({ text: `Cleared ${gone.length} ${gone.length === 1 ? "item" : "items"}`, undo: () => gone.forEach(i => save(fam.set("items", i.id, i))) });
  };

  return (
    <Page title="Lists"
      pills={<Pills<string> items={[...names.map(n => {
        const open = items.filter(i => (i.list || DEFAULT) === n && !i.checked).length;
        return { key: n, label: open ? `${n} ${open}` : n };
      }), { key: "+", label: "+ New list" }]} value={cur} onChange={k => k === "+" ? setNewList("") : setList(k)} />}>
      <Fade k={cur}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surface, borderRadius: radius.card, borderWidth: 1, borderColor: c.hairline, paddingLeft: 16, paddingRight: 6 }}>
          <TextInput value={text} onChangeText={setText} onSubmitEditing={add} submitBehavior="submit" returnKeyType="done" maxLength={80}
            placeholder={`Add to ${cur}…`} placeholderTextColor={c.muted} accessibilityLabel={`Add an item to ${cur}`}
            style={{ flex: 1, minHeight: 52, fontFamily: font.regular, fontSize: 16, color: c.ink }} />
          <Pressable onPress={add} accessibilityRole="button" accessibilityLabel="Add item" hitSlop={8}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="add" size={26} color={c.sageInk} />
          </Pressable>
        </View>
        {mine.length === 0
          ? <Empty title={`${cur} is empty`} body="Type above to add something. Items sort themselves into aisles, and everyone sees them right away." />
          : groups.map(([s, arr]) => (
            <View key={s}><H2>{cap(s)}</H2>
              <Rows>{arr.map(i => <Row key={i.id} title={i.text} strike={!!i.checked} onPress={() => setEdit(i)}
                left={<Check on={!!i.checked} label={(i.checked ? "Uncheck " : "Check off ") + i.text} onPress={() => save(fam.merge("items", i.id, { checked: !i.checked }))} />} />)}</Rows>
            </View>
          ))}
        {checked.length ? <Button label={`Clear ${checked.length} checked`} kind="secondary" onPress={clear} /> : null}
      </Fade>

      <ItemSheet item={edit} names={names} onClose={() => setEdit(null)}
        onSave={(i, t, l) => { save(fam.merge("items", i.id, { text: t, list: l, section: sectionFor(t) })); setEdit(null); }}
        onDelete={i => { save(fam.remove("items", i.id)); setEdit(null); toast({ text: "Item removed", undo: () => save(fam.set("items", i.id, i)) }); }} />
      <Sheet open={newList !== null} onClose={() => setNewList(null)} title="New list">
        <Field label="List name" placeholder="Hardware store" value={newList || ""} onChangeText={setNewList} autoFocus maxLength={30} />
        <T size={14} muted>The list appears for everyone once something is on it.</T>
        <Button label="Make list" onPress={() => { const n = (newList || "").trim(); if (!n) return; setExtra(e => [...e, n]); setList(n); setNewList(null); }} />
      </Sheet>
    </Page>
  );
}

function ItemSheet({ item, names, onClose, onSave, onDelete }: {
  item: Item | null; names: string[]; onClose: () => void; onSave: (i: Item, text: string, list: string) => void; onDelete: (i: Item) => void;
}) {
  const [text, setText] = useState(""), [list, setList] = useState(DEFAULT);
  const [seen, setSeen] = useState<Item | null>(null);
  if (item !== seen) { setSeen(item); setText(item?.text || ""); setList(item?.list || DEFAULT); }
  return (
    <Sheet open={!!item} onClose={onClose} title="Edit item">
      <Field label="Item" value={text} onChangeText={setText} maxLength={80} />
      <View style={{ gap: 6 }}>
        <T size={13} weight="medium" muted>On the list</T>
        <Pills<string> items={names.map(n => ({ key: n, label: n }))} value={list} onChange={setList} />
      </View>
      <Button label="Save" onPress={() => item && text.trim() && onSave(item, text.trim(), list)} />
      <Button label="Remove item" kind="quiet" onPress={() => item && onDelete(item)} />
    </Sheet>
  );
}
