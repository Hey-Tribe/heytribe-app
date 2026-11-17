import { Pressable } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Page, T } from "./kit";
import { useColors } from "./theme";

// A screen opened from More: the same title + pills + cards layout, with a back link above the title.
export function Screen({ title, pills, action, children, backLabel = "More" }: {
  title: string; pills?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; backLabel?: string;
}) {
  const c = useColors();
  return (
    <Page title={title} pills={pills} action={action}
      back={<Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/more"))} accessibilityRole="button" accessibilityLabel={`Back to ${backLabel}`}
        hitSlop={8} style={{ flexDirection: "row", alignItems: "center", minHeight: 44, marginLeft: -6, alignSelf: "flex-start" }}>
        <Ionicons name="chevron-back" size={22} color={c.sageInk} />
        <T size={15} weight="medium" color={c.sageInk}>{backLabel}</T>
      </Pressable>}>
      {children}
    </Page>
  );
}
