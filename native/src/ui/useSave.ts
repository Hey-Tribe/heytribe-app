import { useCallback } from "react";
import { useToast } from "./kit";

// Run a save; if the server refuses it, say so in plain words instead of failing silently.
export function useSave() {
  const toast = useToast();
  return useCallback((p: Promise<unknown>, done?: string) => {
    p.then(() => { if (done) toast({ text: done }); })
      .catch(() => toast({ text: "That didn't save. Check your connection and try again." }));
  }, [toast]);
}
