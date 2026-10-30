import type { MetadataRoute } from "next";
import { configuredAppUrl } from "@/lib/environment";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = configuredAppUrl();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/sign-up`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
