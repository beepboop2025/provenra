"use client";

import { useMemo, useState } from "react";
import { PackageSearch, TrendingUp, CalendarClock, Boxes, Globe2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge, Card, CardHeader, Metric, Progress } from "@/components/ui/primitives";
import { DemandForecastChart } from "@/components/charts/charts";
import { getData, demandSeries } from "@/lib/data/engine";
import { supplyResilienceRisk } from "@/lib/analytics";
import { formatNumber, shelfLifeLabel, formatDate, daysUntil, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StockHealth } from "@/lib/types";

const healthTone: Record<StockHealth, "ok" | "warn" | "danger" | "critical" | "info"> = {
  healthy: "ok",
  watch: "warn",
  low: "danger",
  stockout: "critical",
  excess: "info",
};

export default function InventoryPage() {
  const data = getData();
  const [productId, setProductId] = useState(data.products[0]?.id);
  const product = data.products.find((p) => p.id === productId) ?? data.products[0];
  const series = useMemo(() => demandSeries(product.id), [product.id]);

  const positions = data.stock.filter((s) => s.productId === product.id);
  const totalOnHand = positions.reduce((a, s) => a + s.onHand, 0);
  const totalExpiring = data.stock.reduce((a, s) => a + s.expiringUnits, 0);
  const stockouts = data.stock.filter((s) => s.health === "stockout").length;
  const lowStock = data.stock.filter((s) => s.health === "low").length;

  // FEFO: positions with the most units at risk of expiring before sale.
  const fefoRisk = [...data.stock]
    .filter((s) => s.expiringUnits > 0)
    .sort((a, b) => b.expiringUnits - a.expiringUnits)
    .slice(0, 8);

  const forecast14 = series.filter((d) => d.actual === null).reduce((a, d) => a + d.forecast, 0);

  // Supply-resilience risk (API geo-concentration + single-source + price cap).
  const resilience = data.products
    .map((p) => ({
      product: p,
      risk: supplyResilienceRisk(p.apiDependencePct, p.singleSource, p.priceCapped, p.essential),
    }))
    .sort((a, b) => b.risk - a.risk);
  const chinaDependent = data.products.filter((p) => p.apiSource === "CN" && p.apiDependencePct >= 60).length;
  const singleSourced = data.products.filter((p) => p.singleSource).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shortage & Inventory Risk"
        subtitle="Demand forecasting, stockout prediction and FEFO expiry control"
        icon={<PackageSearch size={22} />}
      >
        <Badge tone={stockouts ? "critical" : lowStock ? "warn" : "ok"}>
          {stockouts} stockouts · {lowStock} low
        </Badge>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <Metric label="Shortage risks (high)" value={data.shortages.filter((s) => s.riskScore >= 65).length} tone="danger" />
        </Card>
        <Card className="p-4">
          <Metric label="Facilities below reorder" value={lowStock + stockouts} tone="warn" />
        </Card>
        <Card className="p-4">
          <Metric label="Units at expiry risk" value={formatNumber(totalExpiring)} tone="warn" sub="FEFO exposure" />
        </Card>
        <Card className="p-4">
          <Metric label="Essential-drug alerts" value={data.shortages.filter((s) => s.essential).length} tone="critical" />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Product picker + forecast */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Demand Forecast"
            subtitle="14-day forecast with confidence band vs. actual offtake"
            icon={<TrendingUp size={16} />}
            action={
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs text-[var(--color-fg)] outline-none focus:border-[var(--color-brand)]"
              >
                {data.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            }
          />
          <div className="p-4">
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="On hand (national)" value={formatNumber(totalOnHand)} />
              <Metric label="14d forecast demand" value={formatNumber(forecast14)} tone="violet" />
              <Metric label="Stocking facilities" value={positions.length} />
              <Metric label="MRP" value={`₹${product.mrp}`} />
            </div>
            <DemandForecastChart data={series} />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--color-muted)]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded bg-[#2dd4bf]" /> Actual offtake</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded bg-[#a78bfa]" /> Forecast</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded bg-[#a78bfa44]" /> Confidence band</span>
            </div>
          </div>
        </Card>

        {/* Shortage watchlist */}
        <Card>
          <CardHeader title="Shortage Watchlist" subtitle="Composite risk score (0–100)" icon={<Boxes size={16} />} />
          <ul className="max-h-[460px] divide-y divide-[var(--color-border)] overflow-auto">
            {data.shortages.map((s) => (
              <li key={s.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {s.productName}
                    {s.essential && <span className="ml-1.5 text-[10px] text-[var(--color-warn)]">NLEM</span>}
                  </p>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      s.riskScore >= 80 ? "text-[var(--color-critical)]" : "text-[var(--color-danger)]"
                    )}
                  >
                    {s.riskScore}
                  </span>
                </div>
                <Progress className="mt-2" value={s.riskScore} tone={s.riskScore >= 80 ? "critical" : "warn"} />
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--color-faint)]">
                  <span>{s.affectedFacilities} facilities affected</span>
                  <span>stockout ~{formatDate(s.projectedStockout)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Supply resilience / API geopolitical risk */}
      <Card>
        <CardHeader
          title="Supply Resilience & API Geopolitical Risk"
          subtitle="~70% of India's bulk-drug APIs are imported from China; single-source generics drive most shortages"
          icon={<Globe2 size={16} />}
          action={
            <div className="hidden gap-2 sm:flex">
              <Badge tone="danger">{chinaDependent} China-dependent</Badge>
              <Badge tone="warn">{singleSourced} single-source</Badge>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Form</th>
                <th className="px-4 py-2 font-medium">API source</th>
                <th className="px-4 py-2 font-medium">Import dependence</th>
                <th className="px-4 py-2 font-medium">Sourcing</th>
                <th className="px-4 py-2 font-medium">Resilience risk</th>
              </tr>
            </thead>
            <tbody>
              {resilience.slice(0, 9).map(({ product: p, risk }) => (
                <tr key={p.id} className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface-2)]/40">
                  <td className="px-4 py-2.5 font-medium">
                    {p.name}
                    {p.essential && <span className="ml-1.5 text-[10px] text-[var(--color-warn)]">NLEM</span>}
                    {p.priceCapped && <span className="ml-1.5 text-[10px] text-[var(--color-faint)]">DPCO</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs capitalize text-[var(--color-muted)]">{p.dosageForm}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={p.apiSource === "CN" ? "danger" : "ok"}>
                      {p.apiSource === "CN" ? "China" : "India"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex w-28 items-center gap-2">
                      <Progress value={p.apiDependencePct} tone={p.apiDependencePct >= 60 ? "danger" : "warn"} />
                      <span className="text-[10px] tabular-nums text-[var(--color-faint)]">
                        {formatPct(p.apiDependencePct, 0)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={p.singleSource ? "critical" : "neutral"}>
                      {p.singleSource ? "single-source" : "multi-source"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        risk >= 70 ? "text-[var(--color-critical)]" : risk >= 45 ? "text-[var(--color-danger)]" : "text-[var(--color-warn)]"
                      )}
                    >
                      {risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* FEFO expiry exposure */}
      <Card>
        <CardHeader
          title="Expiry Exposure (FEFO)"
          subtitle="Units projected to expire before they can be dispensed at current demand"
          icon={<CalendarClock size={16} />}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Facility</th>
                <th className="px-4 py-2 font-medium">On hand</th>
                <th className="px-4 py-2 font-medium">Daily demand</th>
                <th className="px-4 py-2 font-medium">Next expiry</th>
                <th className="px-4 py-2 font-medium">At risk</th>
                <th className="px-4 py-2 font-medium">Health</th>
              </tr>
            </thead>
            <tbody>
              {fefoRisk.map((s) => (
                <tr key={s.id} className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-surface-2)]/40">
                  <td className="px-4 py-2.5 font-medium">{s.productName}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-muted)]">{s.facilityName}</td>
                  <td className="px-4 py-2.5 tabular-nums text-xs">{formatNumber(s.onHand)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-xs">{s.dailyDemand}/day</td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className={daysUntil(s.nextExpiry) < 90 ? "text-[var(--color-warn)]" : "text-[var(--color-muted)]"}>
                      {shelfLifeLabel(s.nextExpiry)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-xs font-semibold text-[var(--color-danger)]">
                    {formatNumber(s.expiringUnits)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={healthTone[s.health]}>{s.health}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
