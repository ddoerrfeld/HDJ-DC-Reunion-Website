"use client";

import { ErrorPanel } from "@/components/layout/ErrorPanel";

export default function AdminError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPanel {...props} homeHref="/admin" />;
}
