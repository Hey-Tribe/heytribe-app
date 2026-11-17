import { useState } from "react";
import { View } from "react-native";
import { useCol, useFamily } from "@/lib/store";
import { useSession } from "@/lib/session";
import { relDay, ymd } from "@/lib/dates";
import { memberName, sortMembers } from "@/lib/family";
import type { Member, Note } from "@/lib/types";
import { Button, Card, Empty, Fab, Field, Sheet, T, useToast } from "@/ui/kit";
import { Screen } from "@/ui/Screen";
import { useSave } from "@/ui/useSave";

// Fridge notes: short messages everyone in the family sees, newest first.
export default function Notes() {
  const fam = useFamily(), save = useSave(), toast = useToast();
  const { me } = useSession();
  const members = sortMembers(useCol<Member>("members"));
  const notes = useCol<Note>("notes").filter(n => n.text).sort((a, b) => (b.at || 0) - (a.at || 0));
  const [edit, setEdit] = useState<Partial<Note> | null>(null);
  const [text, setText] = useState("");
  const [seen, setSeen] = useState<Partial<Note> | null>(null);
  if (edit !== seen) { setSeen(edit); setText(edit?.text || ""); }

  return (
    <Screen title="Fridge notes" action={<Fab label="Add note" onPress={() => setEdit({})} />}>
      {notes.length === 0 ? <Empty title="No notes yet" body="Leave a quick note for everyone: who's picking up, what's for dinner, a reminder." action={{ label: "Write a note", onPress: () => setEdit({}) }} />
        : notes.map(n => (
          <Card key={n.id} style={{ gap: 6 }}>
            <T size={16.5} style={{ lineHeight: 23 }} >{n.text}</T>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <T size={13} muted>{memberName(members, n.by)}{n.at ? " · " + relDay(ymd(new Date(n.at))) : ""}</T>
              <Button label="Edit" kind="quiet" onPress={() => setEdit(n)} />
            </View>
          </Card>
        ))}
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit note" : "New note"}>
        <Field label="Note" placeholder="I'll grab the kids at 3" value={text} onChangeText={setText} multiline maxLength={280} autoFocus />
        <Button label={edit?.id ? "Save" : "Post note"} onPress={() => {
          const t = text.trim(); if (!t || !edit) return;
          if (edit.id) save(fam.merge("notes", edit.id, { text: t }));
          else save(fam.set("notes", null, { text: t, by: me || undefined, at: Date.now() }));
          setEdit(null);
        }} />
        {edit?.id ? <Button label="Delete note" kind="quiet" onPress={() => {
          const was = fam.get<Note>("notes", edit.id!); save(fam.remove("notes", edit.id!)); setEdit(null);
          if (was) toast({ text: "Note deleted", undo: () => save(fam.set("notes", was.id, was)) });
        }} /> : null}
      </Sheet>
    </Screen>
  );
}
