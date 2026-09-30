import { ClosingCta } from "@/components/home/ClosingCta";
import { Countdown } from "@/components/home/Countdown";
import { Hero } from "@/components/home/Hero";
import { StayCallout } from "@/components/home/StayCallout";
import { WeekendGlance } from "@/components/home/WeekendGlance";
import { WhosComingTeaser } from "@/components/home/WhosComingTeaser";
import { YearbookShelf } from "@/components/home/YearbookShelf";

// Event data refreshes within a minute of an organizer edit; also keeps the day countdown current.
export const revalidate = 60;

export default function HomePage() {
  return (
    <>
      <Hero />
      <Countdown />
      <WeekendGlance />
      <StayCallout />
      <WhosComingTeaser />
      <YearbookShelf />
      <ClosingCta />
    </>
  );
}
