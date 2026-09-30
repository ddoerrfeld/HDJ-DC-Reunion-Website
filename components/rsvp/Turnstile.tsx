"use client";

import { useEffect, useRef } from "react";

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Cloudflare Turnstile (SPEC §3). Renders nothing when no site key is configured (local/testing). */
export function Turnstile({ siteKey, onToken }: { siteKey: string | null; onToken: (token: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!siteKey || !box.current) return;
    let widgetId: string | null = null;
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.turnstile || !box.current) return;
      widgetId = window.turnstile.render(box.current, {
        sitekey: siteKey,
        theme: "light",
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
      });
    };
    if (window.turnstile) render();
    else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
    }
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={box} className="min-h-[65px]" />;
}
