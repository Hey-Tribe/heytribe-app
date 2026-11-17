import { useState } from "react";
import { Switch, View } from "react-native";
import { useCol, useFamily } from "@/lib/store";
import { useSession } from "@/lib/session";
import { addDays, dayLabel, relDay, todayKey } from "@/lib/dates";
import { monday, weekDays } from "@/lib/family";
import type { Item, Meal } from "@/lib/types";
import { Button, Field, Pills, Row, Rows, Sheet, T, useToast } from "@/ui/kit";
import { Screen } from "@/ui/Screen";
import { useSave } from "@/ui/useSave";
import { useColors } from "@/ui/theme";
import { sectionFor } from "@/lib/grocery";

type Wk = "this" | "next";

// Dinner for each night. Ingredients can go straight onto the Groceries list.
export default function Meals() {
  const fam = useFamily(), save = useSave(), toast = useToast(), c = useColors();
  const { me } = useSession();
  const meals = useCol<Meal>("meals");
  const items = useCol<Item>("items");
  const [wk, setWk] = useState<Wk>("this");
  const [day, setDay] = useState<string | null>(null);
  const [dish, setDish] = useState(""), [ing, setIng] = useState(""), [addIng, setAddIng] = useState(false);
  const k = todayKey();
  const days = weekDays(wk === "this" ? monday() : addDays(monday(), 7));
  const get = (d: string) => meals.find(m => m.id === d);

  const openDay = (d: string) => { const m = get(d); setDay(d); setDish(m?.dish || ""); setIng(m?.ingredients || ""); setAddIng(false); };
  const submit = async () => {
    if (!day) return;
    const d = dish.trim(), i = ing.trim();
    if (d || i) save(fam.set("meals", day, { dish: d, ingredients: i })); else save(fam.remove("meals", day));
    if (addIng && i) {
      const parts = i.split(/[,\n]+/).map(s => s.trim()).filter(Boolean).slice(0, 30);
      const have = new Set(items.filter(x => !x.checked && (x.list || "Groceries") === "Groceries").map(x => x.text.toLowerCase()));
      const add = parts.filter(p => !have.has(p.toLowerCase()));
      for (const p of add) save(fam.set("items", null, { text: p, list: "Groceries", section: sectionFor(p), by: me || undefined, checked: false, at: Date.now() }));
      toast({ text: add.length ? `Added ${add.length} to Groceries` : "Already on the list" });
    }
    setDay(null);
  };

  return (
    <Screen title="Meals" pills={<Pills<Wk> items={[{ key: "this", label: "This week" }, { key: "next", label: "Next week" }]} value={wk} onChange={setWk} />}>
      <Rows>{days.map(d => {
        const m = get(d);
        return <Row key={d} title={m?.dish || "Plan dinner"} onPress={() => openDay(d)}
          sub={[d === k || dayLabel(d) !== relDay(d) ? relDay(d) : dayLabel(d), m?.ingredients ? m.ingredients.split(/[,\n]/).length + " ingredients" : ""].filter(Boolean).join(" · ")}
          right={!m?.dish ? <T size={13} weight="medium" color={c.sageInk}>Add</T> : null} />;
      })}</Rows>
      <T size={13} muted center>{days.filter(d => get(d)?.dish).length} of 7 dinners planned</T>
      <Sheet open={!!day} onClose={() => setDay(null)} title={day ? `Dinner · ${relDay(day)}` : ""}>
        <Field label="What's for dinner" placeholder="Tacos" value={dish} onChangeText={setDish} maxLength={60} />
        <Field label="Ingredients (comma separated)" placeholder="tortillas, ground beef, salsa, cheese" value={ing} onChangeText={setIng} multiline />
        {ing.trim() ? <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <T weight="medium">Add ingredients to Groceries</T>
          <Switch value={addIng} onValueChange={setAddIng} trackColor={{ true: c.sageBtn }} accessibilityLabel="Add ingredients to Groceries" />
        </View> : null}
        <Button label="Save" onPress={submit} />
        {day && get(day) ? <Button label="Clear this night" kind="quiet" onPress={() => { save(fam.remove("meals", day)); setDay(null); }} /> : null}
      </Sheet>
    </Screen>
  );
}
