import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = { title: "Who’s Coming" };

export default function WhosComingPage() {
  return (
    <PlaceholderPage
      eyebrow="Who’s coming"
      title="Who’s coming"
      intro="Find classmates by the name you knew them by — maiden names and nicknames included."
      cardTitle="The classmate list fills in as RSVPs arrive"
      showEmailNote={false}
    >
      <p>
        Only names, photos, school, and chosen events are ever shown here. Email addresses, phone
        numbers, and hometowns stay private.
      </p>
    </PlaceholderPage>
  );
}
