import { router, type Href } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";
import { useCol, useFamily } from "@/lib/store";
import { useSession } from "@/lib/session";
import { SAMPLE } from "@/lib/config";
import type { Member, Note } from "@/lib/types";
import { Card, H2, Page, Row, Rows, T } from "@/ui/kit";
import { useColors } from "@/ui/theme";

type Icon = keyof typeof Ionicons.glyphMap;
type Link = { title: string; sub?: string; icon: Icon; href: Href };

// Every area that isn't one of the four main tabs lives here, grouped the way the web app groups them.
export default function More() {
  const fam = useFamily(), c = useColors();
  const { code } = useSession();
  const members = useCol<Member>("members").filter(m => m.name);
  const notes = useCol<Note>("notes").filter(n => n.text);

  const groups: { title: string; links: Link[] }[] = [
    { title: "Family", links: [
      { title: "Family", sub: `${members.length} ${members.length === 1 ? "person" : "people"}`, icon: "people-outline", href: "/family" },
      { title: "Fridge notes", sub: notes.length ? `${notes.length} ${notes.length === 1 ? "note" : "notes"}` : undefined, icon: "chatbox-ellipses-outline", href: "/notes" },
    ] },
    { title: "App", links: [
      { title: "Settings", sub: "Account, families, help", icon: "settings-outline", href: "/settings" },
    ] },
  ];

  return (
    <Page title="More">
      {code === SAMPLE ? <Card style={{ gap: 4 }}><T weight="semibold">You’re looking at a sample family</T><T size={14} muted>Changes here aren’t saved. Open Settings to go back.</T></Card> : null}
      <T size={14} muted>{fam.tribe?.name || "Your family"}</T>
      {groups.map(g => (
        <View key={g.title}><H2>{g.title}</H2>
          <Rows>{g.links.map(l => (
            <Row key={l.title} title={l.title} sub={l.sub} onPress={() => router.push(l.href)}
              left={<View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.pill, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={l.icon} size={19} color={c.sageInk} /></View>}
              right={<Ionicons name="chevron-forward" size={18} color={c.muted} />} />
          ))}</Rows>
        </View>
      ))}
    </Page>
  );
}
