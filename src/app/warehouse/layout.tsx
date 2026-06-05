import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Warehouse (WMS) — FEFO Picking & Dispatch",
  description:
    "Warehouse management with FEFO-enforced pick queues (flagging violations that strand expiring stock), zoned putaway, dispatch docks, pick accuracy and order fill-rate metrics.",
  alternates: { canonical: "/warehouse" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
