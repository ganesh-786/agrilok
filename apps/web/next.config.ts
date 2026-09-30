import type { NextConfig } from "next";

// Security headers that do not depend on the request. The Content Security
// Policy needs a fresh nonce per request, so it is set in proxy.ts instead.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // A self-contained server bundle for the Dockerfile.
  output: "standalone",
  // The file tracer copies sharp's native addon but, on Windows, not the
  // libvips library it loads, so resizing fails and every thumbnail is sent
  // as the full-size original (500 KB for a 160px image). Include sharp's
  // platform packages whole, whatever the build machine.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@img/**/*"],
  },
  images: {
    // AVIF first: the smallest files for the phones on slow connections this
    // is built for. Widths stop at 1280 because no photo here needs more.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1280],
    imageSizes: [96, 160, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        // The service worker must always be re-checked, or a fix to it would
        // not reach phones that already have the old one.
        source: "/service-worker.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
