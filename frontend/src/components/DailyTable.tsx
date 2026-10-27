import type { DailyAccuracy } from "../types";

interface Props {
  data: DailyAccuracy[];
}

export function DailyTable({ data }: Props) {
  return (
    <div className="table-wrap">
      <table className="daily-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>MAE (MW)</th>
            <th>RMSE (MW)</th>
            <th>Bias (MW)</th>
            <th>Norm. MAE (%)</th>
            <th>Mean actual (MW)</th>
            <th>Coverage</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.mae?.toLocaleString() ?? "–"}</td>
              <td>{d.rmse?.toLocaleString() ?? "–"}</td>
              <td>
                {d.bias != null ? (d.bias > 0 ? "+" : "") + d.bias.toLocaleString() : "–"}
              </td>
              <td>{d.normalisedMaePct != null ? `${d.normalisedMaePct}%` : "–"}</td>
              <td>{d.meanActualMw?.toLocaleString() ?? "–"}</td>
              <td>{(d.coverage * 100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
