import type { MetadataRoute } from "next";
import { configuredAppUrl } from "@/lib/environment";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/select-organization", "/onboarding"],
    },
    sitemap: `${configuredAppUrl()}/sitemap.xml`,
  };
}
