"use client";

import { Camera, ImageUp, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/Button";
import { PhotoFrame, type School } from "@/components/ui/PhotoFrame";
import type { PhotoState } from "@/lib/rsvp/form-model";

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp";

type Phase = "idle" | "uploading" | "processing" | "cropping" | "saving";

function putWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

/**
 * Photo step (SPEC §7.1 Step 2): choose → upload straight to storage → server
 * converts HEIC, orients and strips EXIF → square crop with rotate → save.
 */
export function PhotoPicker({
  value,
  onChange,
  school,
}: {
  value: PhotoState | null;
  onChange: (photo: PhotoState | null) => void;
  school: School;
}) {
  const inputId = useId();
  const statusId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState<{ uploadId: string; previewUrl: string } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [area, setArea] = useState<Area | null>(null);
  const cropIntro = useRef<HTMLParagraphElement>(null);

  // The control that had focus disappears when the view changes: move focus to where the user is now.
  useEffect(() => {
    if (phase === "cropping") cropIntro.current?.focus();
    if (phase === "idle" && value) input.current?.focus();
  }, [phase, value]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("That photo is larger than 20 MB. Please choose a smaller one.");
      return;
    }
    try {
      setPhase("uploading");
      setProgress(0);
      const { uploadId, signedUrl } = await postJson<{ uploadId: string; signedUrl: string }>("/api/photos/upload");
      await putWithProgress(signedUrl, file, setProgress);
      setPhase("processing");
      const { previewUrl } = await postJson<{ previewUrl: string }>("/api/photos/prepare", { uploadId });
      setUpload({ uploadId, previewUrl });
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setPhase("cropping");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setPhase("idle");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  async function save() {
    if (!upload || !area) return;
    setPhase("saving");
    setError(null);
    try {
      const saved = await postJson<{ photoPath: string; previewUrl: string }>("/api/photos/finalize", {
        uploadId: upload.uploadId,
        crop: { x: area.x, y: area.y, width: area.width, height: area.height },
        rotation,
      });
      onChange({ path: saved.photoPath, url: saved.previewUrl });
      setUpload(null);
      setPhase("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setPhase("cropping");
    }
  }

  const status =
    phase === "uploading"
      ? `Uploading your photo… ${progress}%`
      : phase === "processing"
        ? "Preparing your photo…"
        : phase === "saving"
          ? "Saving your photo…"
          : "";

  const chooser = (
    <>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="peer visually-hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        aria-describedby={statusId}
      />
      <label
        htmlFor={inputId}
        className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-card border-2 border-ink bg-paper-raised px-6 py-3 font-semibold text-ink hover:bg-paper-sunk peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-seam-gold peer-focus-visible:shadow-[0_0_0_2px_var(--ink)]"
      >
        <ImageUp size={22} strokeWidth={1.75} aria-hidden="true" />
        {value ? "Choose a different photo" : "Upload a photo"}
      </label>
    </>
  );

  return (
    <div className="flex flex-col gap-5">
      <p id={statusId} role="status" aria-live="polite" className={status ? "font-semibold text-crown-blue-deep" : "visually-hidden"}>
        {status}
      </p>
      {phase === "uploading" ? (
        <div className="h-3 overflow-hidden rounded-pill bg-paper-sunk" aria-hidden="true">
          <div className="h-full bg-crown-blue-deep transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="font-semibold text-error">
          {error}
        </p>
      ) : null}

      {phase === "cropping" || phase === "saving" ? (
        upload ? (
          <div className="flex flex-col gap-4">
            <p ref={cropIntro} tabIndex={-1} className="text-body text-ink focus:outline-none">
              Drag to position your face in the square. Use the slider to zoom.
            </p>
            <div className="relative h-80 overflow-hidden rounded-card bg-ink sm:h-96">
              <Cropper
                image={upload.previewUrl}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(pct) => setArea(pct)}
                cropperProps={{ role: "group", "aria-label": "Photo crop area. Use the arrow keys to move the photo." }}
                keyboardStep={10}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor={`${inputId}-zoom`} className="font-semibold text-ink">
                Zoom
              </label>
              <input
                id={`${inputId}-zoom`}
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-12 w-full accent-[var(--crown-blue-deep)]"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                className="min-h-12"
                onClick={() => setRotation((r) => (((r + 270) % 360) as 0 | 90 | 180 | 270))}
                icon={<RotateCcw size={20} strokeWidth={1.75} aria-hidden="true" />}
              >
                Rotate left
              </Button>
              <Button
                variant="secondary"
                className="min-h-12"
                onClick={() => setRotation((r) => (((r + 90) % 360) as 0 | 90 | 180 | 270))}
                icon={<RotateCw size={20} strokeWidth={1.75} aria-hidden="true" />}
              >
                Rotate right
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={save} disabled={phase === "saving" || !area}>
                {phase === "saving" ? "Saving…" : "Use this photo"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setUpload(null);
                  setPhase("idle");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null
      ) : (
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <PhotoFrame school={school} size={176}>
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.url} alt="Your photo" width={512} height={512} className="absolute inset-0 size-full object-cover" />
            ) : undefined}
          </PhotoFrame>
          <div className="flex w-full flex-col gap-3 sm:w-auto">
            {phase === "idle" ? chooser : null}
            {value && phase === "idle" ? (
              <Button variant="secondary" onClick={() => onChange(null)} icon={<Trash2 size={20} strokeWidth={1.75} aria-hidden="true" />}>
                Remove photo
              </Button>
            ) : null}
            {!value && phase === "idle" ? (
              <p className="flex items-center gap-2 text-small text-muted">
                <Camera size={18} strokeWidth={1.75} aria-hidden="true" />
                JPEG, PNG, WebP or iPhone photos, up to 20 MB.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
