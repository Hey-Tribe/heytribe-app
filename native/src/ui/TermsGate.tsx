import { Linking, View } from "react-native";
import { useSession } from "@/lib/session";
import { SITE } from "@/lib/config";
import { Button, Sheet, T, useToast } from "./kit";

// Existing accounts are asked once to agree when the Terms or Privacy Policy change (same wording as the web app).
export function TermsGate() {
  const { needsTerms, recordTerms } = useSession();
  const toast = useToast();
  return (
    <Sheet open={needsTerms} onClose={() => {}} title="We updated our Terms">
      <T muted>We changed the Terms and the Privacy Policy on November 6, 2026: plan prices, the free trial, and how phone app purchases work.</T>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Button label="Read the Terms" kind="quiet" onPress={() => Linking.openURL(SITE + "/terms.html")} />
        <Button label="Read the Privacy Policy" kind="quiet" onPress={() => Linking.openURL(SITE + "/privacy.html")} />
      </View>
      <Button label="I agree" onPress={() => recordTerms("prompt").catch(() => toast({ text: "That didn't save. Check your connection and try again." }))} />
      <T size={13} muted>If you don&apos;t agree, you can delete your account in More › Settings.</T>
    </Sheet>
  );
}
