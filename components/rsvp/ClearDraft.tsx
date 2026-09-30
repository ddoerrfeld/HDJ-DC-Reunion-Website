"use client";

import { useEffect } from "react";
import { DRAFT_KEY } from "@/lib/rsvp/form-model";

/** After a successful RSVP, the in-progress draft is no longer needed. */
export function ClearDraft() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // storage unavailable: nothing to clear
    }
  }, []);
  return null;
}
