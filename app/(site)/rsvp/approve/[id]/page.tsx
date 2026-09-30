import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RsvpHeader } from "@/components/rsvp/RsvpHeader";
import { Button } from "@/components/ui/Button";
import { approveClassmate, validApprovalSignature } from "@/lib/classmates/review";
import { serviceDb } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Confirm a classmate", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const SCHOOL: Record<string, string> = { crown: "Irving Crown", jacobs: "Harry D. Jacobs", other: "Other / attended both" };

async function approve(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const signature = String(formData.get("s") ?? "");
  if (!validApprovalSignature(id, signature)) notFound();
  await approveClassmate(id);
  redirect(`/rsvp/approve/${id}?s=${encodeURIComponent(signature)}&done=1`);
}

/**
 * Organizer's one-click approval for an RSVP whose name wasn't in the senior
 * roster. Reached from the signed link in the review email. GET only shows the
 * details; approving takes a deliberate button press (link scanners can't approve).
 */
export default async function ApproveClassmatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ s?: string; done?: string }>;
}) {
  const { id } = await params;
  const { s, done } = await searchParams;
  if (!validApprovalSignature(id, s)) notFound();
  const db = serviceDb();
  if (!db) notFound();
  const { data: attendee } = await db
    .from("attendees")
    .select("first_name, nickname, hs_last_name, current_last_name, email, city, state, grad_school, classmate_status, status")
    .eq("id", id)
    .maybeSingle();
  if (!attendee || attendee.status !== "active") notFound();

  const name = `${attendee.first_name}${attendee.nickname ? ` “${attendee.nickname}”` : ""} ${attendee.hs_last_name}`;
  const approved = attendee.classmate_status !== "pending";

  return (
    <div className="container-page py-16 md:py-20">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <RsvpHeader eyebrow="Organizer" title={approved ? "Classmate confirmed" : "Confirm a classmate"}>
          <p>
            {approved
              ? `${name} is confirmed. ${done ? "We’ve emailed them that the yearbooks are open." : ""}`
              : "This name wasn’t found among the 1977 senior portraits. If you know them, confirm them below."}
          </p>
        </RsvpHeader>
        <dl className="card grid gap-x-6 gap-y-3 p-6 sm:grid-cols-[auto_1fr]">
          <dt className="font-semibold text-muted">Name</dt>
          <dd className="text-ink">{name}</dd>
          {attendee.current_last_name ? (
            <>
              <dt className="font-semibold text-muted">Last name now</dt>
              <dd className="text-ink">{attendee.current_last_name}</dd>
            </>
          ) : null}
          <dt className="font-semibold text-muted">Graduated from</dt>
          <dd className="text-ink">{SCHOOL[attendee.grad_school]}</dd>
          <dt className="font-semibold text-muted">Email</dt>
          <dd className="break-all text-ink">{attendee.email}</dd>
          {attendee.city ? (
            <>
              <dt className="font-semibold text-muted">City</dt>
              <dd className="text-ink">{[attendee.city, attendee.state].filter(Boolean).join(", ")}</dd>
            </>
          ) : null}
        </dl>
        {approved ? (
          <p className="flex items-center gap-2 text-lead font-semibold text-ink">
            <CheckCircle2 size={28} strokeWidth={1.75} className="text-crown-blue-deep" aria-hidden="true" />
            They now appear on Who’s Coming and can open the yearbooks.
          </p>
        ) : (
          <form action={approve} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="s" value={s} />
            <div>
              <Button type="submit">Yes, this is a classmate</Button>
            </div>
            <p className="text-body text-muted">
              Not a classmate? Do nothing. Their RSVP stays saved, but they won’t appear on Who’s Coming or be able
              to open the yearbooks.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
