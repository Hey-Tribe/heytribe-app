import { useState } from "react";
import { View } from "react-native";
import { useCol } from "@/lib/store";
import type { Col } from "@/lib/types";
import { Empty, Fab, H2, Row, Rows } from "./kit";
import { Screen } from "./Screen";
import { EntSheet, type EntEdit } from "./EntSheet";

// A grouped list of one simple record type, with add and edit. Used by Documents, Contacts and Countdowns.
export function EntList<R extends { id: string }>({ title, kind, col, empty, add, groups, row, filter }: {
  title: string; kind: string; col: Col; add: string;
  empty: { title: string; body: string };
  groups: (list: R[]) => { title: string; right?: string; items: R[] }[];
  row: (r: R) => { title: string; sub?: string; right?: React.ReactNode; left?: React.ReactNode; onPress?: () => void };
  filter?: (r: R) => boolean;
}) {
  const list = useCol<R>(col).filter(r => (filter ? filter(r) : true));
  const [edit, setEdit] = useState<EntEdit>(null);
  return (
    <Screen title={title} action={<Fab label={add} onPress={() => setEdit({ kind })} />}>
      {list.length === 0 ? <Empty title={empty.title} body={empty.body} action={{ label: add, onPress: () => setEdit({ kind }) }} />
        : groups(list).filter(g => g.items.length).map(g => (
          <View key={g.title}><H2 right={g.right}>{g.title}</H2>
            <Rows>{g.items.map(r => { const p = row(r); return <Row key={r.id} {...p} onPress={p.onPress || (() => setEdit({ kind, rec: r }))} />; })}</Rows>
          </View>
        ))}
      <EntSheet value={edit} onClose={() => setEdit(null)} />
    </Screen>
  );
}
