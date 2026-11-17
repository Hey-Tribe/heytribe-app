import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts, AtkinsonHyperlegibleNext_400Regular, AtkinsonHyperlegibleNext_500Medium,
  AtkinsonHyperlegibleNext_600SemiBold, AtkinsonHyperlegibleNext_700Bold,
} from "@expo-google-fonts/atkinson-hyperlegible-next";
import { SessionProvider, useSession } from "@/lib/session";
import { ToastProvider } from "@/ui/kit";
import { useColors } from "@/ui/theme";
import { SAMPLE } from "@/lib/config";

SplashScreen.preventAutoHideAsync();

function Routes() {
  const { ready, session, code } = useSession();
  const c = useColors();
  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);
  if (!ready) return null;
  const inFamily = !!code && (!!session || code === SAMPLE);
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Protected guard={!session && !inFamily}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !inFamily}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
      <Stack.Protected guard={inFamily}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    AtkinsonHyperlegibleNext_400Regular, AtkinsonHyperlegibleNext_500Medium,
    AtkinsonHyperlegibleNext_600SemiBold, AtkinsonHyperlegibleNext_700Bold,
  });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <ToastProvider>
          <StatusBar style="auto" />
          <Routes />
        </ToastProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
