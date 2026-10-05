import type { NextConfig } from "next";

const preview = process.env.SITE_STAGE !== "production";


const nextConfig: NextConfig = {
  poweredByHeader: false,
  // WASM/native image libraries must load from node_modules, not the bundle.
  serverExternalPackages: ["heic-convert", "libheif-js", "sharp"],
  // Admin photo uploads (hotel, In Memoriam) go through server actions; Vercel caps bodies at 4.5 MB.
  experimental: { serverActions: { bodySizeLimit: "4.2mb" } },
  async headers() {
    const always = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
    ];
    return [
      {
        source: "/:path*",
        // SPEC §12.1: the whole preview site is noindex, nofollow.
        headers: preview ? [...always, { key: "X-Robots-Tag", value: "noindex, nofollow" }] : always,
      },
      // SPEC §12.2: never indexed in any stage.
      ...["/admin/:path*", "/rsvp/edit/:path*", "/styleguide"].map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },
};

export default nextConfig;
