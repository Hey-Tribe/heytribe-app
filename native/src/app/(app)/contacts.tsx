import { Linking, Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCol } from "@/lib/store";
import { ROLES } from "@/lib/entities";
import { memberName } from "@/lib/family";
import type { Contact, Member } from "@/lib/types";
import { EntList } from "@/ui/EntList";
import { useColors } from "@/ui/theme";

export default function Contacts() {
  const members = useCol<Member>("members"), c = useColors();
  const btn = (icon: keyof typeof Ionicons.glyphMap, a11y: string, url: string) => (
    <Pressable onPress={() => Linking.openURL(url)} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={6}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.pill, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={18} color={c.sageInk} />
    </Pressable>
  );
  return (
    <EntList<Contact> title="Contacts" kind="contact" col="contacts" add="Add contact" filter={x => !!x.name}
      empty={{ title: "No contacts yet", body: "Doctors, teachers, sitters and emergency numbers, so anyone in the family can find them fast." }}
      groups={list => ROLES.map(([key, name]) => ({ title: name, items: list.filter(x => (x.role || "other") === key).sort((a, b) => a.name.localeCompare(b.name)) }))}
      row={x => ({
        title: x.name,
        sub: [x.member && x.member !== "all" ? "for " + memberName(members, x.member) : "", x.phone, x.note].filter(Boolean).join(" · "),
        right: <View style={{ flexDirection: "row", gap: 8 }}>
          {x.phone ? btn("call-outline", `Call ${x.name}`, `tel:${x.phone.replace(/[^\d+]/g, "")}`) : null}
          {x.email ? btn("mail-outline", `Email ${x.name}`, `mailto:${x.email}`) : null}
        </View>,
      })} />
  );
}
