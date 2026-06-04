"use client";

import { useState } from "react";
import type { Facility, Shipment } from "@/lib/types";

// India bounding box for the equirectangular projection.
const BOUNDS = { latMin: 6, latMax: 37.5, lngMin: 67, lngMax: 98 };
const W = 460;
const H = 520;

function project(lat: number, lng: number) {
  const x = ((lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * W;
  const y = (1 - (lat - BOUNDS.latMin) / (BOUNDS.latMax - BOUNDS.latMin)) * H;
  return { x, y };
}

const inIndia = (f: Facility) =>
  f.location.market === "IN" &&
  f.location.lat >= BOUNDS.latMin &&
  f.location.lat <= BOUNDS.latMax;

const statusColor: Record<Shipment["status"], string> = {
  in_transit: "#38bdf8",
  delivered: "#34d399",
  delayed: "#fbbf24",
  exception: "#fb3b6b",
  scheduled: "#8a99b0",
};

export function NetworkMap({
  facilities,
  shipments,
}: {
  facilities: Facility[];
  shipments: Shipment[];
}) {
  const [hover, setHover] = useState<string | null>(null);

  const domestic = shipments.filter(
    (s) => inIndia(s.origin) && inIndia(s.destination)
  );

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[480px] w-full"
        role="img"
        aria-label="India supply-chain network map"
      >
        {/* graticule */}
        {Array.from({ length: 7 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={(W / 6) * i}
            y1={0}
            x2={(W / 6) * i}
            y2={H}
            stroke="#1f2a3f"
            strokeWidth={0.5}
          />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={(H / 8) * i}
            x2={W}
            y2={(H / 8) * i}
            stroke="#1f2a3f"
            strokeWidth={0.5}
          />
        ))}

        {/* routes */}
        {domestic.map((s) => {
          const a = project(s.origin.location.lat, s.origin.location.lng);
          const b = project(s.destination.location.lat, s.destination.location.lng);
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2 - Math.hypot(b.x - a.x, b.y - a.y) * 0.18;
          const color = statusColor[s.status];
          const px = a.x + (b.x - a.x) * s.progress + 0; // current position approx
          const py = a.y + (b.y - a.y) * s.progress;
          return (
            <g key={s.id} opacity={hover && hover !== s.id ? 0.25 : 1}>
              <path
                d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                fill="none"
                stroke={color}
                strokeWidth={s.status === "exception" ? 2 : 1.2}
                strokeOpacity={0.7}
                className="vc-flow"
              />
              <circle
                cx={px}
                cy={py}
                r={s.status === "exception" ? 4 : 3}
                fill={color}
                className={s.status === "exception" ? "vc-pulse" : ""}
                onMouseEnter={() => setHover(s.id)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              />
            </g>
          );
        })}

        {/* facility nodes */}
        {facilities.filter(inIndia).map((f) => {
          const p = project(f.location.lat, f.location.lng);
          const isMfg = f.type === "manufacturer" || f.type === "cdmo";
          return (
            <g key={f.id}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isMfg ? 3.5 : 2.5}
                fill={isMfg ? "#2dd4bf" : "#5a6a82"}
                stroke="#0a0f1a"
                strokeWidth={1}
              />
              {isMfg && (
                <text
                  x={p.x + 6}
                  y={p.y + 3}
                  fontSize={8}
                  fill="#8a99b0"
                  className="select-none"
                >
                  {f.location.city}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/80 px-3 py-2 text-[10px] text-[var(--color-muted)] backdrop-blur">
        <Legend color="#2dd4bf" label="Manufacturing" />
        <Legend color="#38bdf8" label="In transit" />
        <Legend color="#fbbf24" label="Delayed" />
        <Legend color="#fb3b6b" label="Excursion" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
