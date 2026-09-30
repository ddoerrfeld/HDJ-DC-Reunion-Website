import { z } from "zod";

/**
 * RSVP validation shared by the browser form and the server (SPEC §7.2).
 * Messages are plain words (SPEC §4.5). Pure module: safe on client and server.
 */

const trimmed = (max: number) => z.string().trim().max(max, `Please keep this under ${max} characters.`);

export const GRAD_SCHOOLS = ["jacobs", "crown", "other"] as const;
export type GradSchool = (typeof GRAD_SCHOOLS)[number];

export const PersonSchema = z
  .object({
    firstName: trimmed(60).min(1, "Please enter your first name."),
    hsLastName: trimmed(60).min(1, "Please enter your last name from high school."),
    nameChanged: z.boolean(),
    currentLastName: trimmed(60),
    nickname: trimmed(40),
    email: z
      .string()
      .trim()
      .min(1, "Please enter your email address.")
      .max(254, "That email address is too long.")
      .pipe(z.email("That email address doesn’t look right. Please check it.")),
    phone: trimmed(30).refine((v) => v === "" || /^[\d\s()+.\-x]{7,30}$/i.test(v), "Please enter a phone number using digits."),
    city: trimmed(60),
    state: trimmed(30),
    gradSchool: z.enum(GRAD_SCHOOLS, "Please choose where you graduated."),
  })
  .superRefine((person, ctx) => {
    if (person.nameChanged && person.currentLastName === "") {
      ctx.addIssue({ code: "custom", path: ["currentLastName"], message: "Please enter your current last name." });
    }
  });
export type Person = z.infer<typeof PersonSchema>;

export const GuestNameSchema = z.object({ first: trimmed(60), last: trimmed(60) });

export const SelectionSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  guests: z.number().int().min(0).max(4),
  halftime: z.boolean(),
  guestNames: z.array(GuestNameSchema).max(4),
});
export type Selection = z.infer<typeof SelectionSchema>;

export const PhotoPathSchema = z
  .string()
  .regex(/^p\/[0-9a-f-]{36}$/)
  .nullable();

export const SubmissionSchema = z.object({
  person: PersonSchema,
  photoPath: PhotoPathSchema,
  selections: z.array(SelectionSchema).max(20),
  showInDirectory: z.boolean(),
  turnstileToken: z.string().max(4096).optional(),
});
export type Submission = z.infer<typeof SubmissionSchema>;

/** Minimal event facts the guest rules need (works with EventItem). */
export interface GuestRuleItem {
  slug: string;
  title: string;
  allowsGuests: boolean;
  requiresPayment: boolean;
}

/**
 * Guest names are required only for paid items (name tags / check-in, SPEC §7.1 Step 4).
 * Returns field-path → message.
 */
export function guestNameErrors(selections: Selection[], items: GuestRuleItem[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const sel of selections) {
    const item = items.find((i) => i.slug === sel.slug);
    if (!item?.requiresPayment || !item.allowsGuests) continue;
    for (let g = 0; g < sel.guests; g++) {
      const name = sel.guestNames[g];
      if (!name?.first?.trim()) errors[`guest-${sel.slug}-${g}-first`] = `Please enter guest ${g + 1}’s first name.`;
      if (!name?.last?.trim()) errors[`guest-${sel.slug}-${g}-last`] = `Please enter guest ${g + 1}’s last name.`;
    }
  }
  return errors;
}

/** Map zod issues on the person object to form field ids. */
export function personErrors(result: z.ZodSafeParseResult<unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (result.success) return errors;
  for (const issue of result.error.issues) {
    const key = String(issue.path[issue.path.length - 1] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
