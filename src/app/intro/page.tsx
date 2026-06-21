import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: "Provenra — Catch the bad batch before it reaches a patient",
  description:
    "Pharma supply-chain command center for hospital chains and distributors. Catch recalled and substandard (NSQ) batches before they reach a patient, prove cold-chain integrity, enforce FEFO, and reconcile recalls across states. Built India-first.",
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
