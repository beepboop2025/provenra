import type { MetadataRoute } from "next";

const SITE_URL = "https://vitalchain.vercel.app";

/** Expose the public product page while keeping authenticated modules out of search. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/intro", "/llms.txt", "/.well-known/security.txt"],
      disallow: [
        "/api/",
        "/login",
        "/trace",
        "/quality",
        "/qms",
        "/coldchain",
        "/warehouse",
        "/inventory",
        "/compliance",
        "/verify",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
