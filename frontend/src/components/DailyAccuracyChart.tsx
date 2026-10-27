import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyAccuracy } from "../types";

interface Props {
  data: DailyAccuracy[];
}

function dayLabel(iso: string) {
  return iso.slice(8, 10);
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d: DailyAccuracy = payload[0].payload;
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
      <div style={{ color: "var(--text-muted)", marginBottom: 6 }}>{d.date}</div>
      <div>
        MAE: <strong>{d.mae?.toLocaleString()} MW</strong>
      </div>
      <div>
        Bias: <strong>{d.bias != null && d.bias > 0 ? "+" : ""}{d.bias?.toLocaleString()} MW</strong>
      </div>
      <div style={{ color: "var(--text-secondary)" }}>
        {d.normalisedMaePct != null ? `${d.normalisedMaePct}% of mean generation` : ""}
      </div>
    </div>
  );
}

export function DailyAccuracyChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }} barCategoryGap={3}>
        <CartesianGrid stroke="var(--gridline)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={dayLabel}
          tick={{ fill: "var(--text-muted)", fontSize: 10 }}
          axisLine={{ stroke: "var(--baseline)" }}
          tickLine={false}
          interval={1}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--gridline)" }} />
        <Bar dataKey="mae" fill="var(--series-actual)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
