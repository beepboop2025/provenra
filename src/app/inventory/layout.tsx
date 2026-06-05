import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shortage & Inventory — Demand Forecast & FEFO Expiry",
  description:
    "Drug-shortage prediction and inventory risk: demand forecasting, FEFO expiry exposure, stockout prediction, and API geopolitical / single-source supply-resilience scoring.",
  alternates: { canonical: "/inventory" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
