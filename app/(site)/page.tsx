import { ClosingCta } from "@/components/home/ClosingCta";
import { Countdown } from "@/components/home/Countdown";
import { Hero } from "@/components/home/Hero";
import { WeekendGlance } from "@/components/home/WeekendGlance";
import { WhosComingTeaser } from "@/components/home/WhosComingTeaser";
import { YearbookShelf } from "@/components/home/YearbookShelf";

// Countdown is days-only; hourly regeneration keeps it correct across midnight.
export const revalidate = 3600;

export default function HomePage() {
  return (
    <>
      <Hero />
      <Countdown />
      <WeekendGlance />
      <WhosComingTeaser />
      <YearbookShelf />
      <ClosingCta />
    </>
  );
}
