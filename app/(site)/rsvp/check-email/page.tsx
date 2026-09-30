import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RsvpHeader } from "@/components/rsvp/RsvpHeader";

export const metadata: Metadata = { title: "Check your email" };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return (
    <div className="container-page py-16 md:py-20">
      <div className="mx-auto max-w-2xl">
        <RsvpHeader title="Check your email">
          {reason === "duplicate" ? (
            <p>
              You’ve already RSVP’d with that email address, so we didn’t create a second one. We’ve just
              emailed you a private link to see or change your RSVP.
            </p>
          ) : (
            <p>If that email address has an RSVP, we’ve sent it a new private link to make changes.</p>
          )}
        </RsvpHeader>
        <div className="card mt-10 flex items-start gap-4 p-6 md:p-8">
          <MailCheck size={32} strokeWidth={1.75} className="shrink-0 text-crown-blue-deep" aria-hidden="true" />
          <p className="text-body text-ink">
            It can take a few minutes to arrive. If you don’t see it, check your spam or junk folder. The new
            link replaces any earlier one. <Link href="/rsvp/lost">Send it again</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
