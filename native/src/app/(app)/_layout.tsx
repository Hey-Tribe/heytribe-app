import { useEffect } from "react";
import { Stack } from "expo-router";
import { refreshReminder } from "@/lib/push";
import { SAMPLE } from "@/lib/config";
import { FamilyProvider } from "@/lib/store";
import { useSession } from "@/lib/session";
import { useColors } from "@/ui/theme";
import { TermsGate } from "@/ui/TermsGate";
import { PremiumProvider } from "@/lib/premium";

// Everything inside a family shares one copy of its data. Tabs sit at the bottom; other areas open on top of them.
export default function AppLayout() {
  const { code, me, session } = useSession();
  const c = useColors();
  useEffect(() => { if (session && code && code !== SAMPLE) refreshReminder(code, me).catch(() => {}); }, [session, code, me]);
  if (!code) return null;
  return (
    <FamilyProvider code={code} key={code}>
      <PremiumProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
        <TermsGate />
      </PremiumProvider>
    </FamilyProvider>
  );
}
