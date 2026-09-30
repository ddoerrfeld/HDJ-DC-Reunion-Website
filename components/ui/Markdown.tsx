import ReactMarkdown from "react-markdown";

/**
 * Renders organizer-entered Markdown (descriptions, hotel notes, FAQ). Raw HTML
 * is never rendered (react-markdown's default), and only a small set of
 * elements is allowed so admin text can't break the page's structure.
 */
const ALLOWED = ["p", "strong", "em", "a", "ul", "ol", "li", "br"];

export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  if (!children.trim()) return null;
  return (
    <div className={`flex flex-col gap-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 ${className}`}>
      <ReactMarkdown
        allowedElements={ALLOWED}
        unwrapDisallowed
        components={{
          a: ({ href, children: text }) => {
            const external = href?.startsWith("http");
            return (
              <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {text}
                {external ? <span className="visually-hidden"> (opens in a new tab)</span> : null}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
