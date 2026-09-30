import { MONOGRAM } from "./monogram-geometry";

type Variant = "light" | "dark";

const PALETTE: Record<Variant, { crown: string; jacobs: string; seam: string }> = {
  // On paper/light backgrounds.
  light: { crown: "var(--crown-blue)", jacobs: "var(--jacobs-brown)", seam: "var(--seam-gold)" },
  // On blue, brown, or ink backgrounds.
  dark: { crown: "var(--crown-white)", jacobs: "var(--jacobs-gold)", seam: "var(--seam-gold)" },
};

interface Monogram77Props {
  variant?: Variant;
  /** Rendered height in CSS units; width follows the artwork's aspect ratio. */
  height?: number | string;
  /** Accessible name. Omit when the monogram is decorative next to visible text. */
  title?: string;
  className?: string;
}

export function Monogram77({ variant = "light", height = 64, title, className }: Monogram77Props) {
  const colors = PALETTE[variant];
  const h = typeof height === "number" ? `${height}px` : height;
  return (
    <svg
      viewBox={MONOGRAM.viewBox}
      style={{ height: h, width: "auto", aspectRatio: MONOGRAM.aspect }}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g fill={colors.crown}>
        <polygon points={MONOGRAM.crownSeven} />
        <path d={MONOGRAM.horn} />
      </g>
      <polygon points={MONOGRAM.seam} fill={colors.seam} />
      <g fill={colors.jacobs}>
        <polygon points={MONOGRAM.jacobsSeven} />
        <path d={MONOGRAM.wing} />
      </g>
    </svg>
  );
}
