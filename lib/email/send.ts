import { getSiteStage } from "@/lib/site";
import { serviceDb } from "@/lib/supabase/admin";

export interface Attachment {
  filename: string;
  content: string; // UTF-8 text; encoded to base64 for the provider
  contentType: string;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: "rsvp-confirmation" | "edit-link" | "rsvp-updated" | "classmate-review" | "classmate-approved";
  attendeeId?: string | null;
  replyTo?: string | null;
  attachments?: Attachment[];
}

const DEFAULT_FROM = "Class of ’77 Reunion <reunion@crownjacobs77.com>";

/**
 * Sends through Resend when RESEND_API_KEY is set (SPEC §13). Without it, in
 * preview only, the message is written to email_log (with its body) so tests
 * and previews can follow links; production without a key is an error.
 */
export async function sendEmail(email: OutgoingEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const db = serviceDb();

  if (!apiKey) {
    if (getSiteStage() === "production") throw new Error("RESEND_API_KEY is not configured.");
    console.info(`[email:log] to=${email.to} subject="${email.subject}"`);
    await db?.from("email_log").insert({
      attendee_id: email.attendeeId ?? null,
      to_email: email.to,
      template: email.template,
      subject: email.subject,
      transport: "log",
      body_text: email.text,
    });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      ...(email.attachments?.length
        ? {
            attachments: email.attachments.map((a) => ({
              filename: a.filename,
              content: Buffer.from(a.content, "utf8").toString("base64"),
              content_type: a.contentType,
            })),
          }
        : {}),
    }),
  });
  const result = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok) throw new Error(`Email send failed (${response.status}): ${result.message ?? "unknown"}`);

  // Real emails carry private edit links: log the fact, never the body.
  await db?.from("email_log").insert({
    attendee_id: email.attendeeId ?? null,
    to_email: email.to,
    template: email.template,
    subject: email.subject,
    transport: "resend",
    provider_id: result.id ?? null,
  });
}
