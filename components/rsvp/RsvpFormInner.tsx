"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { submitRsvp, updateRsvp, type ActionResult } from "@/app/(site)/rsvp/actions";
import { Button } from "@/components/ui/Button";
import type { FormItem, FormState } from "@/lib/rsvp/form-model";
import { DRAFT_KEY, EMPTY_PERSON, selectedList } from "@/lib/rsvp/form-model";
import { guestNameErrors, personErrors, PersonSchema } from "@/lib/rsvp/schema";
import { ErrorSummary } from "./ErrorSummary";
import { PhotoPicker } from "./PhotoPicker";
import { PaymentComingSoon } from "./PaymentComingSoon";
import { ProgressSteps } from "./ProgressSteps";
import { SeeMePicker } from "./SeeMePicker";
import { AboutStep, GuestsStep, ReviewStep, WeekendStep } from "./steps";


const STEPS = ["About you", "Photo", "Your weekend", "Guests", "Review"] as const;
const STEP_INTRO = [
  "Tell us who you are. Classmates will find you by the name you had in high school.",
  "A current photo helps classmates recognize you. You can skip this.",
  "Choose the events you’ll join. Where two happen at once, pick one.",
  "Bringing a spouse, partner, or friend? Add them here.",
  "Check everything over. You can change any of it later with your private link.",
];

export interface RsvpFormProps {
  mode: "create" | "edit";
  items: FormItem[];
  initial?: FormState;
  token?: string;
  lockedPaid?: boolean;
  /** Show "Find yourself in the ’77 yearbook" (the yearbooks are set up). */
  yearbooksAvailable?: boolean;
}

function blankState(): FormState {
  return { person: { ...EMPTY_PERSON }, photo: null, selections: {}, showInDirectory: true };
}

function loadDraft(): FormState | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as { state: FormState }).state : null;
  } catch {
    return null;
  }
}
function loadDraftStep(): number {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? Math.min(Math.max((JSON.parse(raw) as { step: number }).step, 0), STEPS.length - 1) : 0;
  } catch {
    return 0;
  }
}

export default function RsvpFormInner({ mode, items, initial, token, lockedPaid = false, yearbooksAvailable = false }: RsvpFormProps) {
  // Client-only component (loaded with ssr:false), so sessionStorage is safe in initializers.
  const [state, setState] = useState<FormState>(() => (mode === "create" ? loadDraft() : null) ?? initial ?? blankState());
  const [step, setStep] = useState(() => (mode === "create" ? loadDraftStep() : 0));
  const [furthest, setFurthest] = useState(step);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [website, setWebsite] = useState("");
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  // SPEC §7.1: a refresh must not wipe the form (new RSVPs only; edits load from the server).
  useEffect(() => {
    if (mode !== "create") return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ state, step }));
    } catch {
      // storage unavailable: the form still works, it just won't survive a refresh
    }
  }, [mode, state, step]);

  // Move focus to the new step's heading (not on first load) so screen readers announce it.
  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: "start" });
  }, [step]);

  // Focus the error summary whenever a validation attempt fails.
  const [errorVersion, setErrorVersion] = useState(0);
  useEffect(() => {
    if (errorVersion > 0) summary.current?.focus();
  }, [errorVersion]);

  function showErrors(next: Record<string, string>, message?: string) {
    setErrors(next);
    setFormError(message);
    setErrorVersion((v) => v + 1);
  }

  function goTo(index: number) {
    moved.current = true;
    setErrors({});
    setFormError(undefined);
    setStep(index);
    setFurthest((f) => Math.max(f, index));
  }

  function validate(index: number): Record<string, string> {
    if (index === 0) return personErrors(PersonSchema.safeParse(state.person));
    if (index === 2) return selectedList(state).length === 0 ? { weekend: "Please choose at least one event." } : {};
    if (index === 3) return guestNameErrors(selectedList(state), items);
    return {};
  }

  function next() {
    const found = validate(step);
    if (Object.keys(found).length > 0) return showErrors(found);
    goTo(step + 1);
  }

  function submit() {
    for (const index of [0, 2, 3]) {
      const found = validate(index);
      if (Object.keys(found).length > 0) {
        goTo(index);
        return showErrors(found);
      }
    }
    const payload = {
      person: state.person,
      photoPath: state.photo?.path ?? null,
      yearbookPhoto: state.yearbookPhoto ? { pageId: state.yearbookPhoto.pageId, crop: state.yearbookPhoto.crop } : null,
      selections: selectedList(state),
      showInDirectory: state.showInDirectory,
      website: website || undefined,
    };
    startTransition(async () => {
      const result: ActionResult | undefined =
        mode === "edit" && token ? await updateRsvp(token, payload) : await submitRsvp(payload);
      if (result && !result.ok) {
        const target = { about: 0, weekend: 2, guests: 3, review: 4 }[result.step];
        if (target !== step) goTo(target);
        showErrors(result.fieldErrors, result.formError);
      }
    });
  }

  const paidTitles = items.filter((i) => i.requiresPayment && state.selections[i.slug]?.selected).map((i) => i.title);
  const submitLabel = mode === "edit" ? "Save changes" : "Submit RSVP";
  const school = state.person.gradSchool || "other";

  return (
    <div className="flex flex-col gap-8">
      <ProgressSteps steps={STEPS} current={step} furthest={furthest} onGoTo={goTo} />

      <section aria-labelledby="rsvp-step-title" className="flex flex-col gap-6">
        <div>
          <h2 id="rsvp-step-title" ref={heading} tabIndex={-1} className="scroll-mt-28 text-h2 text-ink focus:outline-none">
            {STEPS[step]}
          </h2>
          <p className="measure mt-2 text-lead text-ink">{STEP_INTRO[step]}</p>
        </div>

        <ErrorSummary ref={summary} errors={errors} formError={formError} />

        {step === 0 ? (
          <AboutStep
            person={state.person}
            errors={errors}
            onChange={(patch) => setState((s) => ({ ...s, person: { ...s.person, ...patch } }))}
          />
        ) : null}
        {step === 1 ? (
          <div className="flex flex-col gap-8">
            <PhotoPicker value={state.photo} school={school} onChange={(photo) => setState((s) => ({ ...s, photo }))} />
            {yearbooksAvailable ? (
              <SeeMePicker
                value={state.yearbookPhoto ?? null}
                onChange={(yearbookPhoto) => setState((s) => ({ ...s, yearbookPhoto }))}
                person={state.person}
              />
            ) : null}
          </div>
        ) : null}
        {step === 2 ? (
          <WeekendStep
            items={items}
            selections={state.selections}
            errors={errors}
            lockedPaid={lockedPaid}
            onChange={(selections) => setState((s) => ({ ...s, selections }))}
          />
        ) : null}
        {step === 3 ? (
          <GuestsStep
            items={items}
            selections={state.selections}
            errors={errors}
            lockedPaid={lockedPaid}
            onChange={(selections) => setState((s) => ({ ...s, selections }))}
          />
        ) : null}
        {step === 4 ? (
          <>
            <ReviewStep
              state={state}
              items={items}
              onEdit={goTo}
              onShowInDirectory={(showInDirectory) => setState((s) => ({ ...s, showInDirectory }))}
            />
            {mode === "create" ? (
              // Honeypot for bots (replaces a visible bot check): off-screen, skipped by keyboard and screen readers.
              <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
                <label>
                  Website
                  <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </label>
              </div>
            ) : null}
            <PaymentComingSoon titles={paidTitles} />
          </>
        ) : null}
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => goTo(step - 1)} icon={<ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />}>
            Back
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={next} icon={<ArrowRight size={20} strokeWidth={1.75} aria-hidden="true" />}>
            {step === 1 && !state.photo && !state.yearbookPhoto ? "Skip for now" : "Next"}
          </Button>
        ) : (
          <Button onClick={submit} disabled={pending} aria-disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
