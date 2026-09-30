import { Monogram77 } from "@/components/brand/Monogram77";
import { SeamRule } from "@/components/brand/Seam";
import { SiteShell } from "@/components/layout/SiteShell";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <SiteShell>
      <div className="container-page flex flex-col items-center gap-6 py-20 text-center md:py-28">
        <Monogram77 height={96} />
        <p className="type-eyebrow text-crown-blue-deep">Page not found</p>
        <h1 className="max-w-[18ch] text-h1 text-ink md:text-display">This page must have graduated early</h1>
        <SeamRule className="w-full max-w-60" />
        <p className="measure text-lead text-ink">
          The link may be old or mistyped. Everything for the reunion weekend starts from the home page.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" variant="primary">
            Go to the home page
          </ButtonLink>
          <ButtonLink href="/weekend" variant="secondary">
            See the weekend
          </ButtonLink>
        </div>
      </div>
    </SiteShell>
  );
}
