import { SiteShell } from "@/components/layout/SiteShell";

// Footer reads admin settings; every page refreshes within a minute of an edit.
export const revalidate = 60;

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteShell>{children}</SiteShell>;
}
