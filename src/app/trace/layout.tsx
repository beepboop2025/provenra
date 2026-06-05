import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track & Trace — GS1 Serialization & Chain of Custody",
  description:
    "Pharmaceutical track & trace with GS1 sGTIN serialization, hash-chained chain-of-custody, aggregation hierarchy and anti-counterfeit risk scoring. DSCSA / EU FMD ready.",
  alternates: { canonical: "/trace" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
