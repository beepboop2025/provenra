import type { MetadataRoute } from "next";

const SITE_URL = "https://vitalchain.vercel.app";

/** All public routes, surfaced to search and answer engines. */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "", // Command Center
    "/intro",
    "/trace",
    "/quality",
    "/qms",
    "/coldchain",
    "/warehouse",
    "/inventory",
    "/compliance",
    "/verify",
  ];
  // Fixed lastModified (matches the data engine's deterministic NOW) so the
  // sitemap is byte-stable across builds rather than churning every deploy.
  const lastModified = new Date("2026-06-05");
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "daily",
    priority: path === "" ? 1 : 0.8,
  }));
}
