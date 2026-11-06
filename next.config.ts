import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Upload di foto e documenti passano dalle server action: il limite di
    // default (1 MB) bloccava quasi ogni PDF ("This page couldn't load").
    // 50 MB = dimensione massima per file del piano free di Supabase Storage.
    serverActions: { bodySizeLimit: "50mb" },
    // Il proxy (src/proxy.ts) bufferizza il body: va alzato anche lui (default 10 MB).
    proxyClientMaxBodySize: "50mb",
  },
  images: {
    // Le foto/documenti sono serviti da Supabase Storage tramite signed URL
    // (dominio *.supabase.co, oppure il dominio custom del progetto).
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
