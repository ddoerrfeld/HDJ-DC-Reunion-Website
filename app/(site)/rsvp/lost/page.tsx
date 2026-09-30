import type { Metadata } from "next";
import { requestEditLink } from "../actions";
import { RsvpHeader } from "@/components/rsvp/RsvpHeader";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export const metadata: Metadata = { title: "Get your RSVP link" };

export default async function LostLinkPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="container-page py-16 md:py-20">
      <div className="mx-auto max-w-2xl">
        <RsvpHeader title="Lost your link?">
          <p>Enter the email address you RSVP’d with and we’ll send you a new private link to make changes.</p>
        </RsvpHeader>
        <form action={requestEditLink} className="card mt-10 flex flex-col gap-6 p-6 md:p-8">
          <TextField
            id="email"
            name="email"
            label="Email address"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            required
            error={error === "email" ? "Please enter the email address you used to RSVP." : undefined}
          />
          <Button type="submit">Email me my link</Button>
        </form>
      </div>
    </div>
  );
}
