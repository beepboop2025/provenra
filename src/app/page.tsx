import type { Metadata } from "next";
import { CommandCenter } from "@/components/command/command-center";

export const metadata: Metadata = {
  title: "Command Center — Provenra",
  description:
    "The live Provenra command center: KPIs, the India distribution network, priority alerts, cold-chain excursions, shortage and recall watchlists, and quality/throughput health — one real-time view from factory to bedside.",
  alternates: { canonical: "/" },
};

/**
 * Server Component wrapper — keeps metadata + prerendering on the server while
 * the immersive WebGL/animation experience lives in the Client Component it
 * renders (the same split the /intro landing uses to run an `ssr:false` 3D
 * canvas with full SEO and no hydration mismatch).
 */
export default function Page() {
  return <CommandCenter />;
}
