import type { ReactNode } from "react";
import { SeamRule } from "@/components/brand/Seam";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  id?: string;
  children?: ReactNode;
  align?: "left" | "center";
}

/** Standard section opener: Graduate eyebrow, Bitter H2, seam rule, optional intro. */
export function SectionHeading({ eyebrow, title, id, children, align = "left" }: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <div className={`flex flex-col gap-3 ${centered ? "items-center text-center" : ""}`}>
      <p className="type-eyebrow text-crown-blue-deep">{eyebrow}</p>
      <h2 id={id} className="text-h2 text-ink">
        {title}
      </h2>
      <SeamRule className="w-full max-w-60" />
      {children ? <div className="measure text-lead text-ink">{children}</div> : null}
    </div>
  );
}
