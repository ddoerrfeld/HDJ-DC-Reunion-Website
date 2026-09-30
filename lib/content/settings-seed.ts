/**
 * Default settings rows (SPEC §11 "Settings"). Seeded once; the organizer edits
 * them in /admin (Phase 7). Values the organizer hasn't decided are null.
 */
export interface SettingSeed {
  key: string;
  value: unknown;
  isPublic: boolean;
}

export const SETTINGS_SEED: readonly SettingSeed[] = [
  { key: "rsvp_deadline", value: null, isPublic: true },
  { key: "refund_policy_md", value: null, isPublic: true },
  { key: "refund_cutoff_date", value: null, isPublic: true },
  { key: "organizer_contact_email", value: null, isPublic: true },
  { key: "faq_md", value: null, isPublic: true },
  { key: "fee_handling", value: "absorb", isPublic: false },
  { key: "pay_offline_enabled", value: false, isPublic: true },
  {
    key: "feature_flags",
    value: { in_memoriam: false, faq: false, yearbook_ocr: false },
    isPublic: true,
  },
  // Stage B section gate (SPEC §12.1): default ON; passcode hash set by admin.
  { key: "section_gate_enabled", value: true, isPublic: false },
  { key: "section_gate_passcode_hash", value: null, isPublic: false },
];
