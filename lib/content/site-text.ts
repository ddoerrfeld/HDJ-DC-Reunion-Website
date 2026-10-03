/**
 * Organizer-editable site copy (Admin → Site text). Each entry is the text the
 * site shows until the organizer changes it; changes are stored in the
 * `site_text` setting as { key: text } and only differences from these
 * defaults are kept, so improving a default here still reaches pages the
 * organizer never touched.
 *
 * kind: "line" = one line, plain text (headings, labels);
 *       "text" = a paragraph or more, rendered as simple Markdown (**bold**, links, blank line = new paragraph).
 */
export interface SiteTextEntry {
  key: string;
  group: string;
  label: string;
  kind: "line" | "text";
  default: string;
  hint?: string;
}

export const SITE_TEXT = [
  // ------------------------------------------------------------- everywhere
  { key: "general.dates", group: "Everywhere", label: "Reunion dates (short)", kind: "line", default: "October 8–10, 2027", hint: "Shown on the home page, the Weekend page and in the footer." },
  { key: "general.dates_long", group: "Everywhere", label: "Reunion dates (long)", kind: "line", default: "Friday, October 8 – Sunday, October 10, 2027" },
  { key: "footer.tagline", group: "Everywhere", label: "Footer sentence", kind: "line", default: "Irving Crown High School and Harry D. Jacobs High School — one class, together again." },

  // ------------------------------------------------------------------ home
  { key: "home.hero_eyebrow", group: "Home page", label: "Small line above the headline", kind: "line", default: "Class of ’77 · 50-Year Reunion" },
  { key: "home.hero_title", group: "Home page", label: "Headline", kind: "line", default: "Three years together. One year apart. Fifty years later." },
  { key: "home.countdown_text", group: "Home page", label: "Paragraph beside the countdown", kind: "text", default: "Two schools, one class. Walk the same halls, cheer at the same fields, and sit down to dinner together — fifty years on." },
  { key: "home.weekend_title", group: "Home page", label: "Weekend section heading", kind: "line", default: "Three days, two schools, one class" },
  { key: "home.weekend_text", group: "Home page", label: "Weekend section paragraph", kind: "text", default: "Every event is optional. Pick what suits you when you RSVP." },
  { key: "home.whos_coming_text", group: "Home page", label: "Who’s Coming section paragraph", kind: "text", default: "As classmates RSVP, their photos fill this space — Crown grads in blue, Jacobs grads in gold. RSVPs are open — add yours." },
  { key: "home.yearbooks_title", group: "Home page", label: "Yearbooks section heading", kind: "line", default: "Both 1977 yearbooks, page by page" },
  { key: "home.yearbooks_text", group: "Home page", label: "Yearbooks section paragraph", kind: "text", default: "Leaf through the Crown and Jacobs yearbooks, zoom in on every senior portrait, and link your own ’77 photo to your RSVP." },
  { key: "home.closing_title", group: "Home page", label: "Closing heading", kind: "line", default: "Save your spot for October 2027" },
  { key: "home.closing_text", group: "Home page", label: "Closing paragraph", kind: "text", default: "RSVP once, choose your events, and get a private link to change your plans any time." },

  // --------------------------------------------------------------- weekend
  { key: "weekend.title", group: "Weekend page", label: "Page heading", kind: "line", default: "The weekend" },
  { key: "weekend.intro", group: "Weekend page", label: "Introduction", kind: "text", default: "Every event is optional — come to one or all of them. Where two events share a time, you’ll pick one when you RSVP. All times are Central." },
  { key: "weekend.choose_one", group: "Weekend page", label: "Label on events at the same time", kind: "line", default: "Choose one" },
  { key: "weekend.coming_soon", group: "Weekend page", label: "Label on events without a time or place yet", kind: "line", default: "Time & place coming soon" },
  { key: "weekend.stay_title", group: "Weekend page", label: "Hotel box heading", kind: "line", default: "Need a room?" },
  { key: "weekend.stay_text", group: "Weekend page", label: "Hotel box sentence", kind: "line", default: "Hotel details and any group rate are on the Stay page." },

  // ------------------------------------------------------------------ RSVP
  { key: "rsvp.intro", group: "RSVP", label: "Introduction", kind: "text", default: "One short form: who you are, a photo if you like, and the events you’ll join. You’ll get a private link by email to change anything later — no account or password." },
  { key: "rsvp.closed", group: "RSVP", label: "Message after the deadline", kind: "text", default: "The RSVP deadline has passed. If you already RSVP’d, you can still update your name and photo with your private link. Questions? Contact the organizers." },
  { key: "rsvp.halftime_label", group: "RSVP", label: "Halftime question", kind: "line", default: "I plan to walk onto the field at halftime to be recognized." },
  { key: "rsvp.halftime_hint", group: "RSVP", label: "Halftime question — small print", kind: "line", default: "This helps the organizers plan with the school." },
  { key: "rsvp.confirmed_title", group: "RSVP", label: "Heading after RSVPing", kind: "line", default: "See you in October" },
  { key: "email.confirmation_note", group: "RSVP", label: "Extra note in the confirmation email", kind: "text", default: "", hint: "Optional. Added to every RSVP confirmation email, e.g. parking or dress code." },

  // ----------------------------------------------------------- other pages
  { key: "stay.intro", group: "Other pages", label: "Stay page introduction", kind: "text", default: "Coming in from out of town? Book early — group rates are held only until the date shown." },
  { key: "whos.intro", group: "Other pages", label: "Who’s Coming introduction", kind: "text", default: "Find classmates by the name you knew them by — maiden names and nicknames included. Only names, photos, school and chosen events are shown here; email addresses, phone numbers and hometowns stay private." },
  { key: "yearbooks.intro", group: "Other pages", label: "Yearbooks introduction", kind: "text", default: "Both books, page by page — the Crown *Valhallan* and the Jacobs *Eyrie*. Zoom in close enough to read every name under every portrait." },
  { key: "memoriam.intro", group: "Other pages", label: "In Memoriam introduction", kind: "text", default: "Classmates we’ve lost, and remember fondly." },
] as const satisfies readonly SiteTextEntry[];

export type SiteTextKey = (typeof SITE_TEXT)[number]["key"];
export type SiteText = Record<SiteTextKey, string>;

export const SITE_TEXT_DEFAULTS = Object.fromEntries(SITE_TEXT.map((e) => [e.key, e.default])) as SiteText;

/** Stored overrides on top of the defaults; blank or unknown keys are ignored. */
export function resolveSiteText(stored: unknown): SiteText {
  const out = { ...SITE_TEXT_DEFAULTS };
  if (stored && typeof stored === "object") {
    for (const [k, v] of Object.entries(stored as Record<string, unknown>)) {
      if (k in out && typeof v === "string" && v.trim()) out[k as SiteTextKey] = v.trim();
    }
  }
  return out;
}
