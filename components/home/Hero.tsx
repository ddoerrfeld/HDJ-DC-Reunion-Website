import { getSiteText } from "@/lib/data/settings";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { HeroController } from "./HeroController";
import "./hero.css";

export async function Hero() {
  const t = await getSiteText();
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-half hero-left halftone">
        <div className="hero-label hero-label-crown">
          <p className="type-display text-lead md:text-h3">Irving Crown</p>
          <p className="type-eyebrow mt-1">Class of ’77 · 1973–1976</p>
        </div>
      </div>
      <div className="hero-half hero-right halftone">
        <div className="hero-right-cover" aria-hidden="true" />
        <div className="hero-label hero-label-jacobs">
          <p className="type-display text-lead md:text-h3">Harry D. Jacobs</p>
          <p className="type-eyebrow mt-1">First graduating class · 1977</p>
        </div>
      </div>
      <div className="hero-seam" aria-hidden="true">
        <span className="hero-seam-stitch" />
        <span className="hero-seam-line" />
      </div>

      <div className="hero-content">
        <p className="type-eyebrow text-white">{t["home.hero_eyebrow"]}</p>
        <h1 id="hero-title" className="mt-4 max-w-[18ch] text-h2 text-white md:max-w-[22ch] md:text-display">
          {t["home.hero_title"]}
        </h1>
        <p className="mt-5 text-lead font-semibold text-white">{t["general.dates"]}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink id="hero-rsvp" href="/rsvp" variant="primary">
            RSVP
          </ButtonLink>
          <ButtonLink
            href="/weekend"
            variant="inverse"
            icon={<ArrowRight size={20} strokeWidth={1.75} aria-hidden="true" />}
          >
            See the weekend
          </ButtonLink>
        </div>
      </div>

      <HeroController />
    </section>
  );
}
