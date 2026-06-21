import type { MetadataRoute } from "next";

/** Web app manifest — improves mobile/PWA presentation and SEO signals. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Provenra — Pharma Supply Chain Intelligence",
    short_name: "Provenra",
    description:
      "Enterprise pharmaceutical supply-chain command center: track & trace, cold chain, quality/NSQ, QMS, warehouse, inventory and compliance.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f1a",
    theme_color: "#0b0f1a",
    categories: ["business", "medical", "productivity"],
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
