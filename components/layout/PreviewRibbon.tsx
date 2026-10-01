/** SPEC §12.1: thin, tasteful notice so nobody mistakes the preview for the live site. */
export function PreviewRibbon() {
  return (
    <aside aria-label="Preview notice" className="bg-ink text-center text-small text-jacobs-gold">
      <p className="container-page py-1.5">
        <span className="type-eyebrow mr-2 text-seam-gold">Preview</span>
        <span className="text-paper">Private preview — details may change.</span>
      </p>
    </aside>
  );
}
