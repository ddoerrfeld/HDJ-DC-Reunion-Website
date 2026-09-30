import { SITE_URL } from "@/lib/site";

/**
 * Plain, large-text HTML emails in brand colors with a text-only twin (SPEC §13).
 * Table layout + inline styles for email-client compatibility. 18 px body text.
 */

export interface EmailLine {
  title: string;
  when: string;
  where: string | null;
  guests: number;
  status: "Confirmed" | "Waitlist";
  /** Event costs money; how to pay is shared by the organizers (no online payment). */
  paid?: boolean;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const INK = "#1E1B16";
const MUTED = "#5C554A";
const PAPER = "#F7F1E3";
const BLUE_DEEP = "#14336B";
const BROWN = "#4A2C12";
const GOLD = "#F0B429";

function layout(preheader: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Class of ’77 Reunion</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<span style="display:none;max-height:0;overflow:hidden;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFCF5;border:1px solid #E3D9C3;">
<tr><td style="height:8px;line-height:8px;font-size:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="49%" style="background:#1F4E9E;height:8px;"></td><td width="2%" style="background:#E8A317;height:8px;"></td><td width="49%" style="background:${BROWN};height:8px;"></td>
</tr></table></td></tr>
<tr><td style="padding:28px 32px 8px 32px;font-family:Georgia,'Times New Roman',serif;color:${BLUE_DEEP};font-size:14px;letter-spacing:2px;text-transform:uppercase;">Class of ’77 · 50-Year Reunion</td></tr>
<tr><td style="padding:0 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:${INK};">
${bodyHtml}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #E3D9C3;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:${MUTED};">
Questions? Just reply to this email.<br>Irving Crown &amp; Harry D. Jacobs High Schools · October 8–10, 2027<br>
<a href="${SITE_URL}" style="color:${BLUE_DEEP};">${esc(new URL(SITE_URL).host)}</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr>
<td style="background:${GOLD};border:2px solid ${BROWN};border-radius:6px;">
<a href="${esc(href)}" style="display:inline-block;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:${BROWN};text-decoration:none;">${esc(label)}</a>
</td></tr></table>`;
}

function linesHtml(lines: EmailLine[]): string {
  if (lines.length === 0) return `<p style="margin:0 0 16px 0;">You haven’t picked any events yet — you can add them any time.</p>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px 0;border-collapse:collapse;">
${lines
  .map(
    (l) => `<tr><td style="padding:12px 0;border-top:1px solid #E3D9C3;">
<strong style="font-family:Georgia,serif;font-size:19px;">${esc(l.title)}</strong><br>
<span style="color:${MUTED};">${esc(l.when)}${l.where ? ` · ${esc(l.where)}` : ""}</span><br>
${l.guests > 0 ? `You + ${l.guests} guest${l.guests === 1 ? "" : "s"} · ` : ""}<strong>${esc(l.status)}</strong>
</td></tr>`,
  )
  .join("\n")}
</table>`;
}

function linesText(lines: EmailLine[]): string {
  if (lines.length === 0) return "You haven’t picked any events yet — you can add them any time.";
  return lines
    .map(
      (l) =>
        `- ${l.title}\n  ${l.when}${l.where ? ` · ${l.where}` : ""}\n  ${l.guests > 0 ? `You + ${l.guests} guest(s) · ` : ""}${l.status}`,
    )
    .join("\n");
}

function paymentNote(lines: EmailLine[]): { html: string; text: string } {
  const due = lines.filter((l) => l.paid && l.status !== "Waitlist").map((l) => l.title);
  if (due.length === 0) return { html: "", text: "" };
  const list = due.join(", ");
  return {
    html: `<p style="margin:0 0 16px 0;padding:16px;background:#F6EAD0;border-left:4px solid ${GOLD};"><strong>Payment details coming soon:</strong> your spot for ${esc(list)} is saved. There’s nothing to pay online — the organizers will let you know how to pay.</p>`,
    text: `PAYMENT DETAILS COMING SOON: your spot for ${list} is saved. There’s nothing to pay online — the organizers will let you know how to pay.`,
  };
}

export function confirmationEmail(opts: {
  firstName: string;
  editUrl: string;
  lines: EmailLine[];
  updated?: boolean;
}): { subject: string; html: string; text: string } {
  const { firstName, editUrl, lines, updated } = opts;
  const subject = updated ? "Your Class of ’77 RSVP was updated" : "You’re on the list — Class of ’77 Reunion";
  const intro = updated
    ? `Hi ${firstName}, your RSVP changes are saved. Here’s where things stand:`
    : `Hi ${firstName}, you’re coming to the Class of ’77 50-Year Reunion! Here’s what you signed up for:`;
  const pay = paymentNote(lines);
  const html = layout(
    subject,
    `<h1 style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:28px;line-height:1.25;color:${INK};">${esc(updated ? "RSVP updated" : "You’re on the list!")}</h1>
<p style="margin:0 0 8px 0;">${esc(intro)}</p>
${linesHtml(lines)}
${pay.html}
<p style="margin:0;">Change your plans, add guests, or update your photo any time:</p>
${button(editUrl, "View or change my RSVP")}
<p style="margin:0 0 16px 0;font-size:16px;color:${MUTED};">This link is private — anyone who has it can change your RSVP, so please don’t forward this email. A calendar file for your events is attached.</p>
<p style="margin:0;">Need a room? <a href="${SITE_URL}/stay" style="color:${BLUE_DEEP};">See where to stay</a>.</p>`,
  );
  const text = `${updated ? "RSVP UPDATED" : "YOU’RE ON THE LIST!"}

${intro}

${linesText(lines)}
${pay.text ? `\n${pay.text}\n` : ""}
View or change your RSVP (private link — please don’t forward):
${editUrl}

Need a room? ${SITE_URL}/stay

Questions? Just reply to this email.
Class of ’77 · October 8–10, 2027`;
  return { subject, html, text };
}

export function editLinkEmail(opts: { firstName: string; editUrl: string; reason: "lost" | "duplicate" }) {
  const subject = "Your private link to change your Class of ’77 RSVP";
  const lead =
    opts.reason === "duplicate"
      ? "You tried to RSVP again with this email address — you’re already on the list, so nothing was changed."
      : "You asked for the link to your RSVP.";
  const html = layout(
    subject,
    `<h1 style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:28px;line-height:1.25;color:${INK};">Here’s your RSVP link</h1>
<p style="margin:0 0 8px 0;">Hi ${esc(opts.firstName)}, ${esc(lead)}</p>
<p style="margin:0;">Use this button to see or change your RSVP:</p>
${button(opts.editUrl, "View or change my RSVP")}
<p style="margin:0;font-size:16px;color:${MUTED};">This new link replaces any earlier one. It’s private — please don’t forward this email. If you didn’t ask for it, you can ignore it; your RSVP is unchanged.</p>`,
  );
  const text = `HERE’S YOUR RSVP LINK

Hi ${opts.firstName}, ${lead}

View or change your RSVP:
${opts.editUrl}

This new link replaces any earlier one. It’s private — please don’t forward this email. If you didn’t ask for it, you can ignore it; your RSVP is unchanged.`;
  return { subject, html, text };
}
