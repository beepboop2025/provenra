import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cold Chain — Temperature Monitoring & MKT",
  description:
    "End-to-end cold-chain monitoring with temperature profiles, Mean Kinetic Temperature (MKT), and freeze-vs-heat excursion detection — catching the silent freeze damage that destroys vaccines, insulin and biologics.",
  alternates: { canonical: "/coldchain" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
