"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/client-report";

/**
 * Last-resort page when the root layout itself fails. It replaces the whole
 * document, so it carries its own minimal brand styling (no app CSS or fonts).
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    if (!error.digest) reportClientError(error.message || "Root error", error.stack ?? null);
  }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#F7F1E3", color: "#1E1B16", fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <title>Something went wrong · Class of ’77 Reunion</title>
        <div style={{ height: 8, background: "linear-gradient(118deg, #1F4E9E 49%, #E8A317 49% 51%, #4A2C12 51%)" }} />
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "80px 20px", textAlign: "center", fontSize: 20, lineHeight: 1.6 }}>
          <p style={{ letterSpacing: 2, textTransform: "uppercase", color: "#14336B", fontSize: 16 }}>Class of ’77 · 50-Year Reunion</p>
          <h1 style={{ fontSize: 36, lineHeight: 1.2, margin: "12px 0 16px" }}>The site didn’t load properly</h1>
          <p>It’s not you — the organizers have been told automatically. Please try again in a moment.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 24, minHeight: 56, padding: "12px 28px", fontSize: 18, fontWeight: 700, color: "#4A2C12", background: "#F0B429", border: "2px solid #4A2C12", borderRadius: 6, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
