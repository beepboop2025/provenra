"use client";

import { useState } from "react";
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ScanLine,
  ArrowRight,
} from "lucide-react";
import { TexturaShell } from "@/components/command/textura-shell";
import { Badge, Card, CardHeader, Progress } from "@/components/ui/primitives";
import { getData } from "@/lib/data/engine";
import { riskBand } from "@/lib/risk";
import { formatDate, shelfLifeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SerialUnit } from "@/lib/types";

type Verdict =
  | { kind: "idle" }
  | { kind: "notfound"; serial: string }
  | { kind: "found"; unit: SerialUnit };

export default function VerifyPage() {
  const data = getData();
  const [input, setInput] = useState("");
  const [verdict, setVerdict] = useState<Verdict>({ kind: "idle" });

  // Curated sample serials so the demo is explorable.
  const genuine = data.serials.find((s) => s.riskScore < 30 && s.status !== "recalled");
  const suspect = data.serials.find((s) => s.status === "suspect" || s.riskScore >= 70);
  const recalled = data.serials.find((s) => s.status === "recalled");

  function verify(serial: string) {
    const q = serial.trim();
    if (!q) return;
    const unit = data.serials.find((s) => s.serial.toLowerCase() === q.toLowerCase());
    setVerdict(unit ? { kind: "found", unit } : { kind: "notfound", serial: q });
  }

  return (
    <TexturaShell
      eyebrow="Point of dispense"
      title="Verify a Unit"
      subtitle="Point-of-dispense authentication — scan or enter a unit serial number"
      icon={<Activity size={22} />}
    >

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Serial Verification" subtitle="GS1 sGTIN lookup against the trust ledger" icon={<ScanLine size={16} />} />
          <div className="p-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5">
                <ScanLine size={16} className="text-[var(--color-faint)]" />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && verify(input)}
                  placeholder="e.g. 08907000…"
                  className="w-full bg-transparent font-mono text-sm text-[var(--color-fg)] outline-none placeholder:text-[var(--color-faint)]"
                />
              </div>
              <button
                onClick={() => verify(input)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-[#04201d] transition-opacity hover:opacity-90"
              >
                Verify <ArrowRight size={15} />
              </button>
            </div>

            <p className="mt-3 text-[11px] text-[var(--color-faint)]">Try a sample unit:</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {genuine && (
                <SampleChip label="Genuine unit" tone="ok" onClick={() => { setInput(genuine.serial); verify(genuine.serial); }} />
              )}
              {suspect && (
                <SampleChip label="Suspect unit" tone="critical" onClick={() => { setInput(suspect.serial); verify(suspect.serial); }} />
              )}
              {recalled && (
                <SampleChip label="Recalled unit" tone="warn" onClick={() => { setInput(recalled.serial); verify(recalled.serial); }} />
              )}
              <SampleChip label="Unknown serial" tone="neutral" onClick={() => { setInput("0890700099999.FAKE.00001"); verify("0890700099999.FAKE.00001"); }} />
            </div>
          </div>
        </Card>

        {/* Result */}
        <Card>
          <CardHeader title="Verification Result" subtitle="Authenticity verdict & provenance" />
          <div className="p-4">
            <VerdictView verdict={verdict} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="How VitalChain detects counterfeits" />
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <Explainer
            icon={<ShieldCheck className="text-[var(--color-ok)]" size={20} />}
            title="Trust ledger lookup"
            body="Every serial is checked against the hash-chained commissioning record. Serials never issued by a verified manufacturer fail instantly."
          />
          <Explainer
            icon={<ShieldQuestion className="text-[var(--color-info)]" size={20} />}
            title="Anomaly scoring"
            body="Duplicate scans, impossible geo-jumps and abnormal scan velocity raise the counterfeit risk score — the hallmarks of cloned serials."
          />
          <Explainer
            icon={<ShieldAlert className="text-[var(--color-critical)]" size={20} />}
            title="Lifecycle checks"
            body="Units from recalled batches, or past expiry, are blocked at the point of dispense even if the serial itself is real."
          />
        </div>
      </Card>
    </TexturaShell>
  );
}

function SampleChip({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: "ok" | "warn" | "critical" | "neutral";
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="transition-transform hover:scale-[1.03]">
      <Badge tone={tone}>{label}</Badge>
    </button>
  );
}

function Explainer({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/40 p-3">
      <div className="mb-2">{icon}</div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{body}</p>
    </div>
  );
}

function VerdictView({ verdict }: { verdict: Verdict }) {
  const data = getData();

  if (verdict.kind === "idle") {
    return (
      <div className="grid place-items-center gap-2 py-12 text-center">
        <ShieldQuestion className="text-[var(--color-faint)]" size={36} />
        <p className="text-sm text-[var(--color-muted)]">
          Enter a serial number to authenticate a unit.
        </p>
      </div>
    );
  }

  if (verdict.kind === "notfound") {
    return (
      <div className="rounded-xl border border-[var(--color-critical)]/40 bg-[var(--color-critical)]/10 p-5 text-center">
        <ShieldAlert className="mx-auto text-[var(--color-critical)]" size={40} />
        <p className="mt-3 text-lg font-bold text-[var(--color-critical)]">COUNTERFEIT RISK</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Serial <span className="font-mono">{verdict.serial}</span> was never commissioned by a
          verified manufacturer. Do not dispense. Report to QA.
        </p>
      </div>
    );
  }

  const { unit } = verdict;
  const batch = data.batches.find((b) => b.id === unit.batchId);
  const product = data.products.find((p) => p.id === batch?.productId);
  const facility = data.facilities.find((f) => f.id === unit.currentFacilityId);
  const recalled = unit.status === "recalled" || batch?.status === "recalled";
  const expired = batch ? new Date(batch.expiryDate).getTime() < Date.now() : false;
  const high = unit.riskScore >= 70;

  const blocked = recalled || expired || high;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-xl border p-5 text-center",
          blocked
            ? "border-[var(--color-critical)]/40 bg-[var(--color-critical)]/10"
            : "border-[var(--color-ok)]/40 bg-[var(--color-ok)]/8"
        )}
      >
        {blocked ? (
          <ShieldAlert className="mx-auto text-[var(--color-critical)]" size={40} />
        ) : (
          <ShieldCheck className="mx-auto text-[var(--color-ok)]" size={40} />
        )}
        <p
          className={cn(
            "mt-3 text-lg font-bold",
            blocked ? "text-[var(--color-critical)]" : "text-[var(--color-ok)]"
          )}
        >
          {recalled
            ? "DO NOT DISPENSE — RECALLED"
            : expired
              ? "DO NOT DISPENSE — EXPIRED"
              : high
                ? "SUSPECT — INVESTIGATE"
                : "AUTHENTIC"}
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {product?.name} {product?.strength} · {product?.genericName}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Manufacturer batch" value={batch?.batchNo} mono />
        <Field label="Current location" value={facility ? `${facility.location.city}` : "—"} />
        <Field label="Expiry" value={batch ? `${formatDate(batch.expiryDate)} (${shelfLifeLabel(batch.expiryDate)})` : "—"} />
        <Field label="Schedule" value={product ? `Schedule ${product.schedule}` : "—"} />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-[var(--color-muted)]">Counterfeit risk score</span>
          <span className="font-semibold tabular-nums">{unit.riskScore}/100 ({riskBand(unit.riskScore)})</span>
        </div>
        <Progress value={unit.riskScore} tone={high ? "critical" : unit.riskScore >= 40 ? "warn" : "ok"} />
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-faint)]">{label}</div>
      <div className={cn("mt-0.5 text-sm text-[var(--color-fg)]", mono && "font-mono text-xs")}>
        {value ?? "—"}
      </div>
    </div>
  );
}
