import { Stack } from "expo-router";
import { FamilyProvider } from "@/lib/store";
import { useSession } from "@/lib/session";
import { useColors } from "@/ui/theme";

// Everything inside a family shares one copy of its data. Tabs sit at the bottom; other areas open on top of them.
export default function AppLayout() {
  const { code } = useSession();
  const c = useColors();
  if (!code) return null;
  return (
    <FamilyProvider code={code} key={code}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
    </FamilyProvider>
  );
}
