/**
 * On-brand inline SVG diagrams for the landing page. Schematic medical / pharma
 * supply-chain illustrations (no external images). Colors match the design
 * tokens. Each scales to its container via viewBox + width:100%.
 */
import * as React from "react";

// Light, clinical palette — these diagrams render on the light /intro landing.
const C = {
  surface: "#ffffff",
  surface2: "#eef3f8",
  border: "#cbd5e1",
  fg: "#0f172a",
  muted: "#475569",
  faint: "#94a3b8",
  brand: "#0d9488",
  violet: "#7c3aed",
  ok: "#059669",
  warn: "#d97706",
  danger: "#dc2626",
  info: "#2563eb",
};

type Props = { className?: string };
const wrap: React.CSSProperties = { width: "100%", height: "auto" };

/* ── Supply-chain journey: factory → distributor → hospital → patient ───── */
export function SupplyChainJourney({ className }: Props) {
  const nodes = [
    { x: 90, label: "Manufacturer" },
    { x: 290, label: "Distributor" },
    { x: 490, label: "Hospital" },
    { x: 660, label: "Patient" },
  ];
  return (
    <svg viewBox="0 0 740 220" style={wrap} className={className} role="img" aria-label="Supply chain from manufacturer to patient">
      {/* connecting flow line */}
      <line x1="90" y1="95" x2="660" y2="95" stroke={C.border} strokeWidth="2" />
      <line x1="90" y1="95" x2="660" y2="95" stroke={C.brand} strokeWidth="2" className="vc-flow" opacity="0.9" />
      {nodes.map((n, i) => (
        <g key={n.label}>
          <circle cx={n.x} cy="95" r="40" fill={C.surface} stroke={C.border} strokeWidth="2" />
          <g transform={`translate(${n.x - 20}, 75)`} stroke={C.brand} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {i === 0 && (
              <>
                <path d="M2 38 V18 l10 7 V18 l10 7 V18 l10 7 V38 Z" fill={`${C.brand}1f`} />
                <line x1="2" y1="12" x2="2" y2="18" />
              </>
            )}
            {i === 1 && (
              <>
                <rect x="2" y="16" width="22" height="18" rx="2" fill={`${C.brand}1f`} />
                <path d="M24 22 h9 l5 6 v6 h-14 Z" fill={`${C.brand}1f`} />
                <circle cx="11" cy="38" r="3.5" fill={C.surface} />
                <circle cx="31" cy="38" r="3.5" fill={C.surface} />
              </>
            )}
            {i === 2 && (
              <>
                <rect x="4" y="14" width="32" height="24" rx="2" fill={`${C.brand}1f`} />
                <line x1="20" y1="20" x2="20" y2="30" />
                <line x1="15" y1="25" x2="25" y2="25" />
              </>
            )}
            {i === 3 && (
              <>
                <circle cx="20" cy="19" r="6" fill={`${C.brand}1f`} />
                <path d="M8 40 c0 -9 6 -14 12 -14 s12 5 12 14" fill={`${C.brand}1f`} />
              </>
            )}
          </g>
          <text x={n.x} y="160" textAnchor="middle" fill={C.muted} fontSize="15" fontFamily="var(--font-geist-sans), sans-serif">
            {n.label}
          </text>
        </g>
      ))}
      {/* moving pack */}
      <rect x="180" y="86" width="18" height="18" rx="3" fill={C.brand}>
        <animate attributeName="x" values="120;560" dur="6s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

/* ── Hospital scene: building + pack verification at dispense ───────────── */
export function HospitalScene({ className }: Props) {
  return (
    <svg viewBox="0 0 480 320" style={wrap} className={className} role="img" aria-label="Hospital pack verification">
      {/* ground */}
      <line x1="20" y1="270" x2="460" y2="270" stroke={C.border} strokeWidth="2" />
      {/* building */}
      <rect x="60" y="80" width="220" height="190" rx="6" fill={C.surface} stroke={C.border} strokeWidth="2" />
      <rect x="150" y="40" width="40" height="40" rx="6" fill={C.surface2} stroke={C.border} strokeWidth="2" />
      {/* red cross */}
      <g fill={C.danger}>
        <rect x="166" y="48" width="8" height="24" rx="2" />
        <rect x="158" y="56" width="24" height="8" rx="2" />
      </g>
      {/* windows */}
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect key={`${r}-${c}`} x={80 + c * 48} y={104 + r * 44} width="30" height="28" rx="3" fill={r === 2 && c === 1 ? `${C.brand}33` : C.surface2} stroke={C.border} />
        ))
      )}
      {/* entrance */}
      <rect x="150" y="226" width="40" height="44" rx="3" fill={C.surface2} stroke={C.border} />
      {/* pharmacy / scan station */}
      <rect x="310" y="150" width="130" height="120" rx="8" fill={C.surface} stroke={C.border} strokeWidth="2" />
      <text x="375" y="174" textAnchor="middle" fill={C.faint} fontSize="11" letterSpacing="2" fontFamily="var(--font-geist-mono), monospace">
        DISPENSE
      </text>
      {/* the pack */}
      <rect x="345" y="188" width="60" height="44" rx="5" fill={C.surface2} stroke={C.brand} strokeWidth="2" />
      {/* tiny datamatrix */}
      <g fill={C.brand}>
        {[0, 1, 2, 3].map((i) =>
          [0, 1, 2, 3].map((j) =>
            (i + j) % 2 === 0 ? <rect key={`${i}-${j}`} x={352 + i * 5} y={196 + j * 5} width="4" height="4" /> : null
          )
        )}
      </g>
      {/* verified check */}
      <circle cx="375" cy="250" r="13" fill={`${C.ok}22`} stroke={C.ok} strokeWidth="2" />
      <path d="M369 250 l4 4 l8 -8" fill="none" stroke={C.ok} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Cold-chain curve: safe band with a flagged freeze excursion ────────── */
export function ColdChainCurve({ className }: Props) {
  return (
    <svg viewBox="0 0 480 280" style={wrap} className={className} role="img" aria-label="Cold chain temperature with freeze excursion">
      {/* axes */}
      <line x1="50" y1="30" x2="50" y2="240" stroke={C.border} strokeWidth="1.5" />
      <line x1="50" y1="240" x2="450" y2="240" stroke={C.border} strokeWidth="1.5" />
      {/* safe band 2-8C */}
      <rect x="50" y="92" width="400" height="60" fill={`${C.ok}14`} />
      <line x1="50" y1="92" x2="450" y2="92" stroke={`${C.ok}66`} strokeDasharray="4 4" />
      <line x1="50" y1="152" x2="450" y2="152" stroke={`${C.ok}66`} strokeDasharray="4 4" />
      <text x="56" y="86" fill={C.ok} fontSize="11" fontFamily="var(--font-geist-mono), monospace">8°C</text>
      <text x="56" y="168" fill={C.ok} fontSize="11" fontFamily="var(--font-geist-mono), monospace">2°C</text>
      {/* temperature line dipping into freeze */}
      <polyline
        points="50,120 110,116 160,128 210,122 250,150 300,205 340,150 400,126 450,122"
        fill="none"
        stroke={C.info}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* freeze point */}
      <circle cx="300" cy="205" r="6" fill={C.danger} />
      <line x1="300" y1="205" x2="300" y2="240" stroke={`${C.danger}66`} strokeDasharray="3 3" />
      <g transform="translate(300,205)">
        <rect x="8" y="-26" width="118" height="26" rx="6" fill={`${C.danger}1f`} stroke={C.danger} />
        <text x="18" y="-9" fill={C.danger} fontSize="12" fontFamily="var(--font-geist-sans), sans-serif">FREEZE · −4°C</text>
      </g>
    </svg>
  );
}

/* ── Trace: serialized vial + chain of custody ─────────────────────────── */
export function TraceVial({ className }: Props) {
  const hops = ["Plant", "CFA", "Distributor", "Pharmacy"];
  return (
    <svg viewBox="0 0 480 300" style={wrap} className={className} role="img" aria-label="Serialized vial and chain of custody">
      {/* vial */}
      <g transform="translate(60,60)">
        <rect x="18" y="-18" width="44" height="14" rx="3" fill={C.surface2} stroke={C.border} strokeWidth="2" />
        <rect x="14" y="-4" width="52" height="150" rx="10" fill={C.surface} stroke={C.border} strokeWidth="2" />
        <rect x="14" y="70" width="52" height="76" rx="10" fill={`${C.brand}1a`} />
        {/* datamatrix label */}
        <rect x="22" y="14" width="36" height="36" rx="3" fill={C.surface2} stroke={C.border} />
        <g fill={C.brand}>
          {[0, 1, 2, 3, 4].map((i) =>
            [0, 1, 2, 3, 4].map((j) =>
              (i * 7 + j * 3) % 2 === 0 ? <rect key={`${i}-${j}`} x={26 + i * 6} y={18 + j * 6} width="5" height="5" /> : null
            )
          )}
        </g>
      </g>
      <text x="86" y="240" fill={C.faint} fontSize="12" fontFamily="var(--font-geist-mono), monospace">
        sGTIN · 0890…·LOT·00042
      </text>
      {/* chain of custody */}
      <g transform="translate(200,70)">
        {hops.map((h, i) => (
          <g key={h} transform={`translate(0, ${i * 50})`}>
            <circle cx="0" cy="0" r="9" fill={i <= 2 ? C.brand : C.surface} stroke={C.brand} strokeWidth="2" />
            {i < hops.length - 1 && <line x1="0" y1="9" x2="0" y2="41" stroke={C.border} strokeWidth="2" />}
            <text x="22" y="5" fill={i <= 2 ? C.fg : C.muted} fontSize="14" fontFamily="var(--font-geist-sans), sans-serif">
              {h}
            </text>
            <text x="150" y="5" fill={C.faint} fontSize="11" fontFamily="var(--font-geist-mono), monospace">
              {i <= 2 ? "✓ hashed" : "pending"}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/* ── FEFO shelf: oldest expiry shipped first ───────────────────────────── */
export function FefoShelf({ className }: Props) {
  const boxes = [
    { exp: "EXP 08/26", first: true },
    { exp: "EXP 11/26", first: false },
    { exp: "EXP 03/27", first: false },
    { exp: "EXP 09/27", first: false },
  ];
  return (
    <svg viewBox="0 0 480 260" style={wrap} className={className} role="img" aria-label="FEFO oldest expiry first">
      <line x1="30" y1="200" x2="450" y2="200" stroke={C.border} strokeWidth="2" />
      {boxes.map((b, i) => {
        const x = 40 + i * 108;
        return (
          <g key={b.exp}>
            <rect
              x={x}
              y="110"
              width="86"
              height="90"
              rx="6"
              fill={b.first ? `${C.brand}1a` : C.surface}
              stroke={b.first ? C.brand : C.border}
              strokeWidth="2"
            />
            <line x1={x + 12} y1="134" x2={x + 74} y2="134" stroke={b.first ? C.brand : C.border} strokeWidth="6" strokeLinecap="round" />
            <text x={x + 43} y="172" textAnchor="middle" fill={b.first ? C.fg : C.muted} fontSize="12" fontFamily="var(--font-geist-mono), monospace">
              {b.exp}
            </text>
            {b.first && (
              <g>
                <text x={x + 43} y="96" textAnchor="middle" fill={C.brand} fontSize="12" fontFamily="var(--font-geist-sans), sans-serif">
                  ship first
                </text>
                <path d={`M${x + 43} 60 v28 m-7 -7 l7 7 l7 -7`} stroke={C.brand} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
