import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify a Unit — Point-of-Dispense Authentication",
  description:
    "Authenticate a pharmaceutical pack at the point of dispense: scan or enter a GS1 serial to check authenticity, recall status and counterfeit risk before it reaches the patient.",
  alternates: { canonical: "/verify" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
