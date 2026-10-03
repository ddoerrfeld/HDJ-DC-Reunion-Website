import type { Metadata } from "next";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { AdminHeader, CheckboxField, Notice, TextAreaField } from "@/components/admin/ui";
import { TextField } from "@/components/ui/Field";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminEmails, getAdminSettings } from "@/lib/admin/data";
import { chicagoDateTime } from "@/lib/admin/time";
import { addAdmin, removeAdmin, saveSettings } from "./actions";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireAdmin();
  const { ok, error } = await searchParams;
  const [s, admins] = await Promise.all([getAdminSettings(), getAdminEmails()]);
  const [deadlineDay = "", deadlineTime = ""] = chicagoDateTime(s.rsvpDeadline).split("T");

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <AdminHeader title="Settings" />
      <Notice ok={ok} error={error} />
      <form action={saveSettings} className="flex flex-col gap-10">
        <fieldset className="flex flex-col gap-5">
          <legend className="mb-2 text-h3 text-ink">RSVPs</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField id="deadline_day" name="deadline_day" type="date" label="RSVP deadline" optional hint="Blank = no deadline." defaultValue={deadlineDay} />
            <TextField id="deadline_time" name="deadline_time" type="time" label="Time (Chicago)" optional hint="Blank = end of that day." defaultValue={deadlineTime} />
          </div>
          <p className="text-small text-muted">After the deadline, people can still change their details and free events, but not paid-event sign-ups.</p>
          <TextField id="organizer_contact_email" name="organizer_contact_email" type="email" label="Organizer email" hint="Replies to site emails go here, and classmate checks are sent here." defaultValue={s.organizerContactEmail ?? ""} />
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-2 text-h3 text-ink">Refunds</legend>
          <TextAreaField id="refund_policy_md" name="refund_policy_md" label="Refund policy" rows={4} hint="Shown on the Info page. Blank lines start a new paragraph." defaultValue={s.refundPolicyMd ?? ""} />
          <TextField id="refund_cutoff_date" name="refund_cutoff_date" type="date" label="Refunds until" optional defaultValue={s.refundCutoffDate ?? ""} />
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-2 text-h3 text-ink">Pages and features</legend>
          <CheckboxField name="flag_faq" label="Info page (questions & answers)" hint="Adds “Info” to the menu." defaultChecked={s.flags.faq} />
          <TextAreaField
            id="faq_md"
            name="faq_md"
            label="Questions & answers"
            rows={10}
            hint="Start each question on its own line with ## — for example “## Is there parking?” — and write the answer underneath."
            defaultValue={s.faqMd ?? ""}
          />
          <CheckboxField name="flag_in_memoriam" label="In Memoriam page" hint="Adds “In Memoriam” to the footer. Add names under In Memoriam." defaultChecked={s.flags.inMemoriam} />
          <CheckboxField name="flag_yearbook_ocr" label="Name search in the yearbooks" defaultChecked={s.flags.yearbookOcr} />
          <CheckboxField
            name="section_gate_enabled"
            label="Yearbooks and Who’s Coming for classmates only (after launch)"
            hint="When on, visitors must RSVP or pass the classmate name check first. Applies once the site is public; during the preview the passcode covers everything."
            defaultChecked={s.sectionGateEnabled}
          />
        </fieldset>
        <div>
          <SubmitButton>Save settings</SubmitButton>
        </div>
      </form>

      <section id="admins" aria-labelledby="admins-h" className="flex scroll-mt-24 flex-col gap-4">
        <h2 id="admins-h" className="text-h3 text-ink">
          Organizers who can sign in
        </h2>
        <ul className="flex flex-col gap-2">
          {admins.map((email) => (
            <li key={email} className="card flex flex-wrap items-center justify-between gap-3 px-4 py-2">
              <span className="break-all text-body text-ink">
                {email}
                {email.toLowerCase() === me.toLowerCase() ? " (you)" : ""}
              </span>
              {email.toLowerCase() === me.toLowerCase() ? null : (
                <form action={removeAdmin}>
                  <input type="hidden" name="email" value={email} />
                  <button type="submit" className="inline-flex min-h-12 items-center font-semibold text-crown-blue-deep underline">
                    Remove<span className="visually-hidden"> {email}</span>
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <form action={addAdmin} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextField id="new-admin" name="email" type="email" label="Add an organizer" hint="They sign in with a link sent to this address." required />
          </div>
          <SubmitButton variant="secondary" pendingLabel="Adding…">
            Add
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
