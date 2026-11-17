import "expo-sqlite/localStorage/install";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

// Sessions are kept on the device (expo-sqlite localStorage) so people stay signed in between launches.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Refresh the session only while the app is in front.
AppState.addEventListener("change", state => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
