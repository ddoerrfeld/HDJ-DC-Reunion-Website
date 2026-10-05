"use client";

import { ErrorPanel } from "@/components/layout/ErrorPanel";

export default function SiteError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPanel {...props} />;
}
