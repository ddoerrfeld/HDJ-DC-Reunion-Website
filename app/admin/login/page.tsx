import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Notice } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { TextField } from "@/components/ui/Field";
import { getAdmin } from "@/lib/admin/auth";
import { requestAdminLink } from "./actions";

export const metadata: Metadata = { title: "Organizer sign-in" };

const ERRORS: Record<string, string> = {
  email: "Please enter your email address.",
  expired: "That sign-in link has expired or was already used. Ask for a new one below.",
  send: "We couldn’t send the email just now. Please try again in a minute.",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; signedout?: string }> }) {
  if (await getAdmin()) redirect("/admin");
  const { sent, error, signedout } = await searchParams;
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-6">
      <h1 className="text-h2 text-ink md:text-h1">Organizer sign-in</h1>
      {sent ? (
        <div role="status" className="card flex flex-col gap-3 p-6">
          <p className="flex items-center gap-3 text-h3 text-ink">
            <Mail size={28} strokeWidth={1.75} className="text-crown-blue-deep" aria-hidden="true" />
            Check your email
          </p>
          <p className="text-body text-ink">
            If that address is on the organizer list, a sign-in link is on its way. It works once and expires in 15 minutes.
          </p>
        </div>
      ) : (
        <>
          <p className="measure text-lead text-ink">Enter your email and we’ll send you a one-time sign-in link. No password needed.</p>
          <Notice error={error ? ERRORS[error] : undefined} ok={signedout ? "You’re signed out." : undefined} />
          <form action={requestAdminLink} className="flex flex-col gap-5">
            <TextField id="email" name="email" type="email" label="Email address" autoComplete="email" required />
            <div>
              <SubmitButton pendingLabel="Sending…">Email me a sign-in link</SubmitButton>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
