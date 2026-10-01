import Image from "next/image";
import crown from "@/public/images/duotone-crown-football.webp";
import jacobs from "@/public/images/duotone-jacobs-entrance.webp";

/**
 * Photographic seam band (SPEC §4.7): 1977 yearbook photos as duotones in each
 * school's colors — Crown football (“Viking spirit pushes on”, Valhallan p. 32)
 * and the Jacobs entrance arch (Eyrie p. 5) — split by the gold 62° seam.
 * Decorative only. Chosen so no one is recognizable (helmets, a building).
 */
export function DuotoneBand({ className = "" }: { className?: string }) {
  // Horizontal run of a 62° seam across the band: height / tan(62°) ≈ 0.532 × height; half each side.
  const run = "calc(var(--band-h) * 0.266)";
  return (
    <div
      aria-hidden="true"
      className={`relative w-full overflow-hidden bg-ink [--band-h:9rem] md:[--band-h:13rem] ${className}`}
      style={{ height: "var(--band-h)" }}
    >
      <div className="absolute inset-0" style={{ clipPath: `polygon(0 0, calc(50% + ${run}) 0, calc(50% - ${run}) 100%, 0 100%)` }}>
        <Image src={crown} alt="" fill sizes="60vw" className="object-cover object-[50%_35%]" placeholder="blur" />
      </div>
      <div className="absolute inset-0" style={{ clipPath: `polygon(calc(50% + ${run} + 10px) 0, 100% 0, 100% 100%, calc(50% - ${run} + 10px) 100%)` }}>
        <Image src={jacobs} alt="" fill sizes="60vw" className="object-cover object-[50%_30%]" placeholder="blur" />
      </div>
      <div
        className="absolute inset-0 bg-seam-gold"
        style={{
          clipPath: `polygon(calc(50% + ${run}) 0, calc(50% + ${run} + 10px) 0, calc(50% - ${run} + 10px) 100%, calc(50% - ${run}) 100%)`,
        }}
      />
    </div>
  );
}
