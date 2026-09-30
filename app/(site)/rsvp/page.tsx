import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = { title: "RSVP" };

export default function RsvpPage() {
  return (
    <PlaceholderPage
      eyebrow="RSVP"
      title="RSVP"
      intro="One short form: tell us who you are, add a photo if you like, and pick the events you’ll join."
      cardTitle="RSVPs open soon"
      showEmailNote={false}
    >
      <p>
        When RSVPs open you’ll receive a private link by email so you can change your plans any time
        — no account or password needed.
      </p>
    </PlaceholderPage>
  );
}
