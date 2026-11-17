import { useCol } from "@/lib/store";
import { dayDiff, dayLabel, todayKey } from "@/lib/dates";
import { DKIND, label } from "@/lib/entities";
import { memberName } from "@/lib/family";
import type { Doc, Member } from "@/lib/types";
import { T } from "@/ui/kit";
import { EntList } from "@/ui/EntList";
import { useColors } from "@/ui/theme";

export default function Docs() {
  const members = useCol<Member>("members"), c = useColors(), k = todayKey();
  return (
    <EntList<Doc> title="Documents" kind="doc" col="docs" add="Add document" filter={d => !!d.title}
      empty={{ title: "No documents yet", body: "Passports, insurance cards, warranties: note what you have, whose it is, where it's kept and when it expires." }}
      groups={list => {
        const soon = list.filter(d => d.expires && dayDiff(k, d.expires) <= 90).sort((a, b) => String(a.expires).localeCompare(String(b.expires)));
        return [{ title: "Expiring soon", items: soon },
          ...DKIND.map(([key, name]) => ({ title: name, items: list.filter(d => (d.kind || "other") === key && !soon.includes(d)).sort((a, b) => a.title.localeCompare(b.title)) }))];
      }}
      row={d => {
        const n = d.expires ? dayDiff(k, d.expires) : null;
        return {
          title: d.title,
          sub: [label(DKIND, d.kind), memberName(members, d.member), d.where, d.expires ? (n! < 0 ? "Expired" : `Expires ${dayLabel(d.expires)}`) : ""].filter(Boolean).join(" · "),
          right: n !== null && n < 0 ? <T size={13} weight="semibold" color={c.danger}>Expired</T> : null,
        };
      }} />
  );
}
