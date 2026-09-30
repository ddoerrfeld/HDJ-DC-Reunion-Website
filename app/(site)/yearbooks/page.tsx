import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = { title: "Yearbooks" };

export default function YearbooksPage() {
  return (
    <PlaceholderPage
      eyebrow="The 1977 yearbooks"
      title="Yearbooks"
      intro="The Irving Crown and Harry D. Jacobs yearbooks, page by page, with zoom for reading every name."
      cardTitle="The yearbook readers are being built"
      showEmailNote={false}
    >
      <p>Both books will open here once they’ve been scanned.</p>
    </PlaceholderPage>
  );
}
