import type { MetadataRoute } from "next";
import { isPreview, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (isPreview()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/rsvp/edit/", "/rsvp/approve/", "/styleguide", "/api/", "/yearbooks", "/whos-coming"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
