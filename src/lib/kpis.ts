import { getData, spark } from "@/lib/data/engine";
import { formatCompact, formatPct } from "@/lib/format";
import type { Kpi, VitalChainData } from "@/lib/types";

/** Overview command-center KPIs spanning all four modules. */
export function overviewKpis(d: VitalChainData = getData()): Kpi[] {
  const activeShipments = d.shipments.filter((s) => s.status !== "delivered").length;
  const liveExcursions = d.shipments.filter((s) => s.status === "exception").length;
  const suspectUnits = d.serials.filter((s) => s.status === "suspect" || s.riskScore >= 70).length;
  const atRiskProducts = d.shortages.filter((s) => s.riskScore >= 65).length;
  const openRecalls = d.recalls.filter((r) => r.status !== "completed").length;
  const totalUnits = d.batches.reduce((a, b) => a + b.quantity, 0);
  const onTime =
    (d.shipments.filter((s) => s.status === "delivered" || s.status === "in_transit").length /
      Math.max(d.shipments.length, 1)) *
    100;

  return [
    {
      label: "Units Under Trace",
      value: formatCompact(totalUnits),
      delta: 4.2,
      deltaGood: "up",
      spark: spark("units", 12, true),
    },
    {
      label: "Active Shipments",
      value: String(activeShipments),
      delta: -2.1,
      deltaGood: "up",
      spark: spark("ship", 12, true),
    },
    {
      label: "Live Cold-Chain Breaches",
      value: String(liveExcursions),
      delta: liveExcursions > 0 ? 60 : -100,
      deltaGood: "down",
      spark: spark("breach", 12, false),
    },
    {
      label: "Suspect / Counterfeit Units",
      value: String(suspectUnits),
      delta: 9.0,
      deltaGood: "down",
      spark: spark("suspect", 12, false),
    },
    {
      label: "Essential-Drug Shortage Risks",
      value: String(atRiskProducts),
      delta: 12.5,
      deltaGood: "down",
      spark: spark("shortage", 12, false),
    },
    {
      label: "On-Time-In-Full",
      value: formatPct(onTime),
      delta: 1.8,
      deltaGood: "up",
      spark: spark("otif", 12, true),
    },
    {
      label: "Open Recalls",
      value: String(openRecalls),
      delta: openRecalls > 1 ? 25 : -50,
      deltaGood: "down",
      spark: spark("recall", 12, false),
    },
    {
      label: "Network Facilities",
      value: String(d.facilities.length),
      delta: 6.0,
      deltaGood: "up",
      spark: spark("fac", 12, true),
    },
  ];
}
