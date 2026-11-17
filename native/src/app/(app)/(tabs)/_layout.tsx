import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { font, useColors } from "@/ui/theme";

type Icon = keyof typeof Ionicons.glyphMap;
const tab = (title: string, icon: Icon, iconOn: Icon) => ({
  title,
  tabBarIcon: ({ color, focused }: { color: import("react-native").ColorValue; focused: boolean }) => <Ionicons name={focused ? iconOn : icon} size={24} color={String(color)} />,
});

// The bottom bar never changes between screens: Today, Calendar, Chores, Lists, More.
export default function TabsLayout() {
  const c = useColors();
  return (
      <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.sageInk, tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.hairline },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11.5 },
        sceneStyle: { backgroundColor: c.bg },
      }}>
        <Tabs.Screen name="index" options={tab("Today", "sunny-outline", "sunny")} />
        <Tabs.Screen name="calendar" options={tab("Calendar", "calendar-outline", "calendar")} />
        <Tabs.Screen name="chores" options={tab("Chores", "checkmark-circle-outline", "checkmark-circle")} />
        <Tabs.Screen name="lists" options={tab("Lists", "list-outline", "list")} />
        <Tabs.Screen name="more" options={tab("More", "ellipsis-horizontal", "ellipsis-horizontal")} />
      </Tabs>
  );
}
