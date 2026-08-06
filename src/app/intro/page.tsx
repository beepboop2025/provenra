import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: "Provenra | Pharmaceutical supply-chain workflow prototype",
  description:
    "Demonstration of serialization, cold-chain, quality, FEFO inventory, warehouse, and recall workflows using deterministic seed data.",
  alternates: { canonical: "/intro" },
};

/**
 * Server Component wrapper — keeps metadata and prerendering on the server,
 * while the immersive WebGL/animation experience lives in the Client Component
 * it renders. This split is what lets the client-only `ssr:false` 3D canvas
 * coexist with full SEO, with no hydration mismatch.
 */
export default function IntroPage() {
  return <Landing />;
}
