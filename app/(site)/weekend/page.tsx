import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = { title: "The Weekend" };

export default function WeekendPage() {
  return (
    <PlaceholderPage
      eyebrow="October 8–10, 2027"
      title="The weekend"
      intro="School tours, Friday night football, golf or pickleball, the reunion dinner, and a farewell brunch."
      cardTitle="The full itinerary is on its way"
    >
      <p>
        Times, places, maps, and add-to-calendar buttons for every event will appear here. The
        weekend at a glance is on the home page.
      </p>
    </PlaceholderPage>
  );
}
