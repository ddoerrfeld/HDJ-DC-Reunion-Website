"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import type { ReactNode } from "react";

/** Submit button that says it is working (and can't be double-pressed) while the action runs. */
export function SubmitButton({ children, variant = "primary", pendingLabel = "Saving…", name, value, icon }: { children: ReactNode; variant?: ButtonVariant; pendingLabel?: string; name?: string; value?: string; icon?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} aria-disabled={pending} name={name} value={value} icon={pending ? undefined : icon} className="disabled:opacity-70">
      {pending ? pendingLabel : children}
    </Button>
  );
}
