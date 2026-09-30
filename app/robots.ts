import type { MetadataRoute } from "next";
import { isPreview } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (isPreview()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/rsvp/edit/", "/styleguide"] },
  };
}
