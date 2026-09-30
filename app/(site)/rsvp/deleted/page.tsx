import type { Metadata } from "next";
import { RsvpHeader } from "@/components/rsvp/RsvpHeader";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "RSVP deleted" };

export default function DeletedPage() {
  return (
    <div className="container-page py-16 md:py-20">
      <div className="mx-auto max-w-2xl">
        <RsvpHeader title="Your RSVP was deleted">
          <p>Your name, photo, and contact details have been removed. We’ll miss you — and if your plans change, you’re always welcome to RSVP again.</p>
        </RsvpHeader>
        <ButtonLink href="/" variant="secondary" className="mt-10">
          Back to the home page
        </ButtonLink>
      </div>
    </div>
  );
}
