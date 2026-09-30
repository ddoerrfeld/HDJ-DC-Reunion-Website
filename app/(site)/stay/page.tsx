import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = { title: "Where to Stay" };

export default function StayPage() {
  return (
    <PlaceholderPage
      eyebrow="Where to stay"
      title="Stay"
      intro="Coming in from out of town? Hotel details and group rates will be listed here."
      cardTitle="A hotel room block is being arranged"
    >
      <p>Check back soon.</p>
    </PlaceholderPage>
  );
}
