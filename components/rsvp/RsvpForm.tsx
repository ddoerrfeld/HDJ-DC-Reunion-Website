"use client";

import dynamic from "next/dynamic";
import type { RsvpFormProps } from "./RsvpFormInner";

/** Skeleton shaped like the real form (SPEC §4.7) while the client form loads. */
function FormSkeleton() {
  return (
    <div className="flex flex-col gap-8" role="status" aria-busy="true" aria-label="Loading the RSVP form">
      <div className="skeleton h-6 w-56" />
      <div className="skeleton h-2 w-full" />
      <div className="skeleton h-10 w-48" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="skeleton h-5 w-40" />
          <div className="skeleton h-14 w-full" />
        </div>
      ))}
    </div>
  );
}

// Client-only: the form restores an in-progress draft from sessionStorage on first render.
const Inner = dynamic(() => import("./RsvpFormInner"), { ssr: false, loading: FormSkeleton });

export function RsvpForm(props: RsvpFormProps) {
  return <Inner {...props} />;
}
