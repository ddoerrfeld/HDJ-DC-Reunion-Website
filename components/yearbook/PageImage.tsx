import type { ReaderPage } from "@/lib/yearbook/types";

interface PageImageProps {
  page: ReaderPage;
  alt: string;
  eager?: boolean;
  className?: string;
}

/** A yearbook page at display size: WebP with a JPEG fallback for older iPads. Never draggable (the book handles drags). */
export function PageImage({ page, alt, eager = false, className = "" }: PageImageProps) {
  return (
    <picture className="contents">
      <source type="image/webp" srcSet={page.display} />
      <img
        src={page.displayJpg}
        alt={alt}
        width={page.width}
        height={page.height}
        loading={eager ? "eager" : "lazy"}
        // Pages on screen (and the turning leaf) decode synchronously so a turn never flashes blank.
        decoding={eager ? "sync" : "async"}
        draggable={false}
        className={`block h-full w-full select-none object-contain ${className}`}
      />
    </picture>
  );
}
