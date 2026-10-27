import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { fetchAccuracy, fetchMeta, fetchSeries } from "./api";
import { DailyAccuracyChart } from "./components/DailyAccuracyChart";
import { DailyTable } from "./components/DailyTable";
import { GenerationChart } from "./components/GenerationChart";
import { StatTile } from "./components/StatTile";
import type { AccuracyResponse, Meta, SeriesPoint } from "./types";

const MONTH_START = "2026-01-01";
const MONTH_END = "2026-01-31";

const PRESETS = [
  { label: "Week 1", start: "2026-01-01", end: "2026-01-07" },
  { label: "Week 2", start: "2026-01-08", end: "2026-01-14" },
  { label: "Week 3", start: "2026-01-15", end: "2026-01-21" },
  { label: "Week 4", start: "2026-01-22", end: "2026-01-28" },
  { label: "Full month", start: MONTH_START, end: MONTH_END },
];

function fmtMw(v: number | null | undefined) {
  if (v == null) return "–";
  return Math.round(v).toLocaleString();
}

function App() {
  const [rangeStart, setRangeStart] = useState(PRESETS[0].start);
  const [rangeEnd, setRangeEnd] = useState(PRESETS[0].end);
  const [series, setSeries] = useState<SeriesPoint[] | null>(null);
  const [rangeAccuracy, setRangeAccuracy] = useState<AccuracyResponse | null>(null);
  const [monthAccuracy, setMonthAccuracy] = useState<AccuracyResponse | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMeta().then(setMeta).catch((e) => setError(String(e)));
    fetchAccuracy(MONTH_START, MONTH_END).then(setMonthAccuracy).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    setError(null);
    Promise.all([
      fetchSeries(rangeStart, rangeEnd),
      fetchAccuracy(rangeStart, rangeEnd),
    ])
      .then(([s, a]) => {
        setSeries(s);
        setRangeAccuracy(a);
      })
      .catch((e) => setError(String(e)));
  }, [rangeStart, rangeEnd]);

  const activePreset = useMemo(
    () => PRESETS.find((p) => p.start === rangeStart && p.end === rangeEnd)?.label,
    [rangeStart, rangeEnd]
  );

  return (
    <>
      <header className="header">
        <h1>Wind Day-Ahead Forecast Accuracy</h1>
        <p>
          National GB wind generation vs. the day-ahead forecast available at purchase-decision
          time &mdash; January 2026
        </p>
      </header>

      {meta && (
        <div className="assumption-banner">
          <strong>How "day-ahead forecast" is defined:</strong> {meta.assumption}
        </div>
      )}

      {error && <div className="error">Failed to load data: {error}</div>}

      <section className="panel">
        <div className="panel-header">
          <h2>Actual vs. day-ahead forecast generation</h2>
          <div className="controls-row">
            <div className="preset-buttons">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  className={activePreset === p.label ? "active" : ""}
                  onClick={() => {
                    setRangeStart(p.start);
                    setRangeEnd(p.end);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label>
              From
              <input
                type="date"
                value={rangeStart}
                min={MONTH_START}
                max={rangeEnd}
                onChange={(e) => setRangeStart(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={rangeEnd}
                min={rangeStart}
                max={MONTH_END}
                onChange={(e) => setRangeEnd(e.target.value)}
              />
            </label>
          </div>
        </div>

        {series ? <GenerationChart data={series} /> : <div className="loading">Loading…</div>}
      </section>

      {rangeAccuracy && (
        <div className="stat-grid">
          <StatTile label="Mean absolute error" value={fmtMw(rangeAccuracy.overall.mae)} unit="MW" />
          <StatTile label="RMSE" value={fmtMw(rangeAccuracy.overall.rmse)} unit="MW" />
          <StatTile
            label="Bias (forecast − actual)"
            value={
              rangeAccuracy.overall.bias != null
                ? (rangeAccuracy.overall.bias > 0 ? "+" : "") + fmtMw(rangeAccuracy.overall.bias)
                : "–"
            }
            unit="MW"
          />
          <StatTile
            label="Normalised MAE"
            value={rangeAccuracy.overall.normalisedMaePct?.toString() ?? "–"}
            unit="% of mean"
          />
          <StatTile label="Settlement periods" value={rangeAccuracy.overall.sampleSize.toLocaleString()} />
        </div>
      )}

      <section className="panel">
        <div className="panel-header">
          <h2>Daily forecast error &mdash; full month</h2>
          <span className="panel-subtitle">Mean absolute error per delivery day (MW)</span>
        </div>
        {monthAccuracy ? (
          <>
            <DailyAccuracyChart data={monthAccuracy.daily} />
            <button className="toggle-table" onClick={() => setShowTable((v) => !v)}>
              {showTable ? "Hide" : "Show"} daily breakdown table
            </button>
            {showTable && (
              <div style={{ marginTop: 14 }}>
                <DailyTable data={monthAccuracy.daily} />
              </div>
            )}
          </>
        ) : (
          <div className="loading">Loading…</div>
        )}
      </section>

      <p className="footer-note">
        Source: Elexon BMRS Insights API &mdash; datasets FUELHH (actuals, fuelType=WIND) and
        WINDFOR (forecasts). All times UTC.
      </p>
    </>
  );
}

export default App;
