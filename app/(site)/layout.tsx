import { SiteShell } from "@/components/layout/SiteShell";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteShell>{children}</SiteShell>;
}
