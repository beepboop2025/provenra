"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import type { DemandPoint, SensorReading, TempRange } from "@/lib/types";

const axis = {
  stroke: "#5a6a82",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  background: "#0f1626",
  border: "1px solid #1f2a3f",
  borderRadius: 10,
  fontSize: 12,
  color: "#e6edf6",
};

const fmtDay = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : format(d, "dd MMM");
};
const fmtHour = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : format(d, "HH:mm");
};

/* ── Cold-chain temperature profile ───────────────────────────────────── */

export function TempProfileChart({
  data,
  range,
}: {
  data: SensorReading[];
  range: TempRange;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2a3f" vertical={false} />
        {/* Acceptable temperature band */}
        <ReferenceArea
          y1={range.min}
          y2={range.max}
          fill="#34d399"
          fillOpacity={0.08}
          stroke="#34d399"
          strokeOpacity={0.25}
          strokeDasharray="4 4"
        />
        <XAxis dataKey="t" tickFormatter={fmtHour} {...axis} minTickGap={40} />
        <YAxis
          {...axis}
          domain={[range.min - 6, range.max + 8]}
          tickFormatter={(v) => `${v}°`}
          width={40}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(l) => fmtHour(String(l))}
          formatter={(v, name) => [
            name === "temp" ? `${v}°C` : `${v}%`,
            name === "temp" ? "Temperature" : "Humidity",
          ]}
        />
        <Line
          type="monotone"
          dataKey="temp"
          stroke="#38bdf8"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Demand actual + forecast with confidence band ───────────────────── */

export function DemandForecastChart({ data }: { data: DemandPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2a3f" vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmtDay} {...axis} minTickGap={32} />
        <YAxis {...axis} width={44} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(l) => fmtDay(String(l))}
        />
        {/* Confidence band rendered as upper area minus lower area */}
        <Area
          type="monotone"
          dataKey="upper"
          stroke="none"
          fill="url(#bandFill)"
          fillOpacity={1}
        />
        <Area
          type="monotone"
          dataKey="lower"
          stroke="none"
          fill="#0f1626"
          fillOpacity={1}
        />
        <Area
          type="monotone"
          dataKey="actual"
          stroke="#2dd4bf"
          strokeWidth={2}
          fill="none"
          connectNulls={false}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="forecast"
          stroke="#a78bfa"
          strokeWidth={2}
          strokeDasharray="5 4"
          fill="none"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Generic horizontal bar (e.g. excursions by product) ─────────────── */

export function MiniBarChart({
  data,
  color = "#38bdf8",
  height = 200,
}: {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 12, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2a3f" horizontal={false} />
        <XAxis type="number" {...axis} />
        <YAxis type="category" dataKey="name" {...axis} width={120} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff08" }} />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Donut (e.g. status / category mix) ──────────────────────────────── */

export function DonutChart({
  data,
  height = 220,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-2xl font-bold tabular-nums">{total.toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-[var(--color-faint)]">total</div>
        </div>
      </div>
    </div>
  );
}
