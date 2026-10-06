"use client";

import { useEffect } from "react";

export const HERO_PLAYED_KEY = "c77-hero-played";
const HERO_DURATION_MS = 10_000;
const SKIP_EVENTS = ["pointerdown", "wheel", "touchmove", "keydown", "scroll"] as const;

/**
 * Runs before first paint (first child of <body>): decides whether the hero plays.
 * Plays once per browser session and never under prefers-reduced-motion. The
 * "played" flag is written here on a home-page load, not after hydration, so a
 * reload before React loads (slow phone) doesn't replay the intro. The controller
 * also writes it, for a client-side navigation to the home page.
 */
export const heroBootScript = `(function(){var d=document.documentElement;try{var r=window.matchMedia("(prefers-reduced-motion: reduce)").matches;var s=r||sessionStorage.getItem("${HERO_PLAYED_KEY}");d.dataset.hero=s?"static":"play";if(!s&&location.pathname==="/")sessionStorage.setItem("${HERO_PLAYED_KEY}","1");}catch(e){d.dataset.hero="static";}})();`;

/** Marks the intro as played, and lets click / scroll / any key / the Skip button end it early. */
export function HeroController() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.hero !== "play") return;
    try {
      sessionStorage.setItem(HERO_PLAYED_KEY, "1");
    } catch {
      // Storage blocked (private mode): the intro may replay; harmless.
    }

    const finish = () => {
      const skipHadFocus = document.activeElement?.id === "hero-skip";
      root.dataset.hero = "static";
      cleanup();
      if (skipHadFocus) document.getElementById("hero-rsvp")?.focus();
    };
    // End exactly when the CSS timeline ends (it started at first paint, not at hydration).
    let active = true;
    const timeline = document.querySelector(".hero-content")?.getAnimations()[0];
    const timer = timeline ? undefined : window.setTimeout(finish, HERO_DURATION_MS);
    timeline?.finished.then(() => active && finish()).catch(() => {});
    for (const name of SKIP_EVENTS) window.addEventListener(name, finish, { passive: true });

    function cleanup() {
      active = false;
      window.clearTimeout(timer);
      for (const name of SKIP_EVENTS) window.removeEventListener(name, finish);
    }
    return cleanup;
  }, []);

  return (
    <button
      id="hero-skip"
      type="button"
      className="hero-skip absolute bottom-4 left-4 z-10 min-h-12 items-center md:bottom-10 md:left-10 rounded-card border-2 border-white bg-ink/85 px-5 text-body font-semibold text-white"
    >
      Skip intro
    </button>
  );
}
