import type { MetadataRoute } from "next";

const SITE_URL = "https://vitalchain.vercel.app";

/** The public product route; application modules require authentication. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{
    url: `${SITE_URL}/intro`,
    lastModified: new Date("2026-08-06"),
    changeFrequency: "monthly",
    priority: 1,
  }];
}
