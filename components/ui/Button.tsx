import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * One button style per role (SPEC §4.7):
 *  - primary:   gold fill, brown text (6.79:1) — the main call to action (RSVP)
 *  - secondary: outlined, for supporting actions on light surfaces
 *  - inverse:   outlined white, for supporting actions on blue/brown/ink
 * All are ≥ 56 px tall (SPEC §4.5 asks ≥ 48) and always carry a text label.
 */
export type ButtonVariant = "primary" | "secondary" | "inverse";

const base =
  "inline-flex min-h-14 items-center justify-center gap-2 rounded-card px-6 py-3 text-center font-sans text-body font-semibold leading-tight no-underline transition-[background-color,border-color,color,transform] duration-[var(--dur-ui)] ease-[var(--ease-out)] active:translate-y-px select-none hover:no-underline";

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-2 border-jacobs-brown bg-jacobs-gold text-jacobs-brown [text-shadow:none] hover:bg-seam-gold",
  secondary: "border-2 border-ink bg-transparent text-ink hover:bg-paper-sunk",
  inverse: "border-2 border-white bg-transparent text-white hover:bg-white/10",
};

export function buttonClasses(variant: ButtonVariant = "primary", fullWidth = false, extra = "") {
  return [base, variants[variant], fullWidth ? "w-full" : "", extra].filter(Boolean).join(" ");
}

interface CommonProps {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant,
  fullWidth,
  icon,
  children,
  className,
  type = "button",
  ...rest
}: CommonProps & Omit<ComponentProps<"button">, "children" | "className">) {
  return (
    <button type={type} className={buttonClasses(variant, fullWidth, className)} {...rest}>
      {children}
      {icon}
    </button>
  );
}

export function ButtonLink({
  variant,
  fullWidth,
  icon,
  children,
  className,
  ...rest
}: CommonProps & Omit<ComponentProps<typeof Link>, "children" | "className">) {
  return (
    <Link className={buttonClasses(variant, fullWidth, className)} {...rest}>
      {children}
      {icon}
    </Link>
  );
}
