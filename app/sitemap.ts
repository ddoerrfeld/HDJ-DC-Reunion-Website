import type { MetadataRoute } from "next";
import { isPreview, SITE_URL } from "@/lib/site";

/** Public pages only, and only once the site is public (SPEC §12.1 Stage B). */
export default function sitemap(): MetadataRoute.Sitemap {
  if (isPreview()) return [];
  return ["", "/weekend", "/stay", "/rsvp"].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.8,
  }));
}
