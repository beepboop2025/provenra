import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QMS — Deviations, CAPA & Batch Release",
  description:
    "Quality management system: deviation register, CAPA board with severity-driven SLA due dates, GMP-gated batch manufacturing records, and a hash-chained, tamper-evident audit trail.",
  alternates: { canonical: "/qms" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
