"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteRsvp } from "@/app/(site)/rsvp/actions";
import { Button } from "@/components/ui/Button";

/** SPEC §12.2 "Delete my RSVP", with an explicit second confirmation. */
export function DeleteRsvp({ token }: { token: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <section aria-labelledby="delete-title" className="mt-16 border-t border-line pt-8">
      <h2 id="delete-title" className="text-h3 text-ink">
        Can’t make it after all?
      </h2>
      <p className="measure mt-2 text-body text-ink">
        Deleting your RSVP removes your name, photo, and contact details from the site. If you paid for
        anything, the organizers keep the payment record and will contact you about a refund.
      </p>
      {confirming ? (
        <div role="alertdialog" aria-labelledby="delete-confirm" className="mt-5 flex flex-col gap-4 rounded-card border-2 border-error bg-paper-raised p-5">
          <p id="delete-confirm" className="font-semibold text-error">
            Delete your RSVP? This can’t be undone.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              className="border-error text-error"
              disabled={pending}
              onClick={() => startTransition(() => deleteRsvp(token))}
              icon={<Trash2 size={20} strokeWidth={1.75} aria-hidden="true" />}
            >
              {pending ? "Deleting…" : "Yes, delete my RSVP"}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Keep my RSVP
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" className="mt-5" onClick={() => setConfirming(true)}>
          Delete my RSVP
        </Button>
      )}
    </section>
  );
}
