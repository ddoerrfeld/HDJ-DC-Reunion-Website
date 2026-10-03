import type { Metadata } from "next";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { completeAdminSignIn } from "../actions";

export const metadata: Metadata = { title: "Organizer sign-in" };

/**
 * The emailed link lands here. Signing in takes a button press, because email
 * security scanners open links automatically and would use up the one-time token.
 */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-6">
      <h1 className="text-h2 text-ink md:text-h1">Sign in to the organizer pages</h1>
      <p className="text-lead text-ink">One more step: press the button to finish signing in on this device.</p>
      <form action={completeAdminSignIn}>
        <input type="hidden" name="token" value={token} />
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>
    </div>
  );
}
