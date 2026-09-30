"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/Button";

/** One-tap "Copy code" for the hotel group code (SPEC §6.1), with a spoken confirmation. */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the code is on screen in large type to copy by hand.
      setCopied(false);
    }
  }

  return (
    <>
      <button type="button" onClick={copy} className={buttonClasses("secondary", false, "min-h-12 px-4 py-2")}>
        {copied ? (
          <Check size={20} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Copy size={20} strokeWidth={1.75} aria-hidden="true" />
        )}
        {copied ? "Copied" : "Copy code"}
      </button>
      <span role="status" className="visually-hidden">
        {copied ? `Group code ${code} copied` : ""}
      </span>
    </>
  );
}
