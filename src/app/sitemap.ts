import { MetadataRoute } from "next";

// FIX: dominio unificado — misma URL que layout.tsx y robots.ts
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://wavepipe.onrender.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
