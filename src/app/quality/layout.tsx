import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quality & NSQ Watch — CDSCO Drug-Alert Surveillance",
  description:
    "Surveillance of NSQ (Not of Standard Quality), spurious and DEG/EG-contaminated drugs modelled on CDSCO monthly alerts, matched to held inventory for quarantine and recall.",
  alternates: { canonical: "/quality" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
