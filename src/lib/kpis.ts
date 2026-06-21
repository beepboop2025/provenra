import { getData, spark } from "@/lib/data/engine";
import { fefoPickRate } from "@/lib/analytics";
import { formatCompact, formatPct } from "@/lib/format";
import type { Kpi, ProvenraData } from "@/lib/types";

/** Overview command-center KPIs spanning all four modules. */
export function overviewKpis(d: ProvenraData = getData()): Kpi[] {
  const activeShipments = d.shipments.filter((s) => s.status !== "delivered").length;
  const liveExcursions = d.shipments.filter((s) => s.status === "exception").length;
  const suspectUnits = d.serials.filter((s) => s.status === "suspect" || s.riskScore >= 70).length;
  const atRiskProducts = d.shortages.filter((s) => s.riskScore >= 65).length;
  const openRecalls = d.recalls.filter((r) => r.status !== "completed").length;
  const nsqInInventory = d.qualityAlerts.filter(
    (q) => q.inInventory && q.action !== "cleared"
  ).length;
  const totalUnits = d.batches.reduce((a, b) => a + b.quantity, 0);
  const onTime =
    (d.shipments.filter((s) => s.status === "delivered" || s.status === "in_transit").length /
      Math.max(d.shipments.length, 1)) *
    100;
  const fefoAccuracy = fefoPickRate(d.pickTasks);
  const openDeviations = d.deviations.filter((dv) => dv.status !== "closed").length;
  const overdueCapas = d.capas.filter((c) => c.status === "overdue").length;
  const awaitingRelease = d.batchRecords.filter(
    (b) => b.status === "in_review" || b.status === "on_hold"
  ).length;

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
      label: "NSQ Batches in Inventory",
      value: String(nsqInInventory),
      delta: 7.5,
      deltaGood: "down",
      spark: spark("nsq", 12, false),
    },
    {
      label: "FEFO Pick Accuracy",
      value: formatPct(fefoAccuracy, 0),
      delta: 1.2,
      deltaGood: "up",
      spark: spark("fefo", 12, true),
    },
    {
      label: "Open Deviations",
      value: String(openDeviations),
      delta: 5.5,
      deltaGood: "down",
      spark: spark("devs", 12, false),
    },
    {
      label: "Overdue CAPAs",
      value: String(overdueCapas),
      delta: overdueCapas > 0 ? 30 : -40,
      deltaGood: "down",
      spark: spark("capa", 12, false),
    },
    {
      label: "Batches Awaiting Release",
      value: String(awaitingRelease),
      delta: 3.0,
      deltaGood: "down",
      spark: spark("bmr", 12, false),
    },
  ];
}
