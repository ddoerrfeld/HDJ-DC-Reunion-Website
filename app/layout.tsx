import type { Metadata, Viewport } from "next";
import { Bitter, Graduate, Source_Sans_3 } from "next/font/google";
import { heroBootScript } from "@/components/home/HeroController";
import { PreviewRibbon } from "@/components/layout/PreviewRibbon";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, isPreview } from "@/lib/site";
import "./globals.css";

const graduate = Graduate({ weight: "400", subsets: ["latin"], variable: "--font-graduate", display: "swap" });
const bitter = Bitter({ weight: ["700"], subsets: ["latin"], variable: "--font-bitter", display: "swap" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · Class of ’77 Reunion` },
  description: SITE_DESCRIPTION,
  // The image itself comes from app/opengraph-image.png (scripts/generate-og.mts).
  openGraph: { type: "website", siteName: "Class of ’77 · 50-Year Reunion", locale: "en_US", title: SITE_NAME, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image" },
  robots: isPreview() ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = {
  themeColor: "#1f4e9e",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-hero is set by the boot script before paint; React must not fight it.
    <html
      lang="en"
      className={`${graduate.variable} ${bitter.variable} ${sourceSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* First in <body>, not <head>: Next inserts stylesheet links into <head> at varying
            times, which made React's hydration of an inline head script intermittently fail
            (#418) and reset <html> attributes. It still runs before anything is painted. */}
        <script dangerouslySetInnerHTML={{ __html: heroBootScript }} />
        {isPreview() ? <PreviewRibbon /> : null}
        {children}
      </body>
    </html>
  );
}
