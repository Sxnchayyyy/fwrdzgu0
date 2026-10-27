import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "../types";

interface Props {
  data: SeriesPoint[];
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const axisFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const p: SeriesPoint = payload[0].payload;
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: "0.8rem",
        color: "var(--text-primary)",
      }}
    >
      <div style={{ color: "var(--text-muted)", marginBottom: 6 }}>
        {dateFmt.format(new Date(p.startTime))} UTC
      </div>
      <div>
        <span style={{ color: "var(--series-actual)" }}>&#9679;</span> Actual:{" "}
        <strong>{Math.round(p.actualMw).toLocaleString()} MW</strong>
      </div>
      {p.forecastMw != null && (
        <div>
          <span style={{ color: "var(--series-forecast)" }}>&#9679;</span> Day-ahead forecast:{" "}
          <strong>{Math.round(p.forecastMw).toLocaleString()} MW</strong>
        </div>
      )}
      {p.errorMw != null && (
        <div style={{ color: "var(--text-secondary)", marginTop: 4 }}>
          Error: {p.errorMw > 0 ? "+" : ""}
          {Math.round(p.errorMw).toLocaleString()} MW
        </div>
      )}
    </div>
  );
}

export function GenerationChart({ data }: Props) {
  return (
    <>
      <div className="legend-row" style={{ marginBottom: 12 }}>
        <span className="legend-swatch">
          <span className="legend-dot" style={{ background: "var(--series-actual)" }} />
          Actual generation
        </span>
        <span className="legend-swatch">
          <span className="legend-dot" style={{ background: "var(--series-forecast)" }} />
          Day-ahead forecast (available at decision time)
        </span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="startTime"
            tickFormatter={(v) => axisFmt.format(new Date(v))}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--baseline)" }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="actualMw"
            stroke="var(--series-actual)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="forecastMw"
            stroke="var(--series-forecast)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
