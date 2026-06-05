import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recall & Compliance — Cross-State Recalls & GMP",
  description:
    "Recall tracking and regulatory compliance: cross-state recall coordination, supplier risk, Revised Schedule M GMP readiness, and DSCSA / EU FMD regulatory posture.",
  alternates: { canonical: "/compliance" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
