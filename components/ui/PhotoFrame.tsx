import type { ReactNode } from "react";
import { Monogram77 } from "@/components/brand/Monogram77";

export type School = "crown" | "jacobs" | "other";

const placeholderSurface: Record<School, string> = {
  crown: "bg-crown-blue",
  jacobs: "bg-jacobs-brown",
  other: "split-surface",
};

interface PhotoFrameProps {
  school: School;
  /** The photo. When omitted, a monogram placeholder in the school color is shown. */
  children?: ReactNode;
  size?: number | string;
  className?: string;
}

/** The one photo frame: a slightly rounded, white-bordered yearbook print (SPEC §4.6). */
export function PhotoFrame({ school, children, size = 160, className = "" }: PhotoFrameProps) {
  const dimension = typeof size === "number" ? `${size}px` : size;
  return (
    <div
      className={`relative shrink-0 rounded-sm bg-white p-1.5 shadow-[0_1px_2px_rgb(30_27_22/0.12),0_6px_16px_-8px_rgb(30_27_22/0.35)] ring-1 ring-line ${className}`}
      style={{ width: dimension }}
    >
      <div className="relative aspect-square overflow-hidden rounded-[2px] ring-1 ring-line ring-inset">
        {children ?? (
          <div className={`halftone absolute inset-0 flex items-center justify-center ${placeholderSurface[school]}`}>
            <Monogram77 variant="dark" height="46%" />
          </div>
        )}
      </div>
    </div>
  );
}
