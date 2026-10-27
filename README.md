# Wind Day-Ahead Forecast Accuracy

A web app for a GB energy utility's day-ahead power buying desk. It shows, for every half-hour
settlement period in January 2026, the national wind generation forecast that was actually
available when the team had to decide how much extra power to buy from the day-ahead market —
alongside what wind generation turned out to be — and quantifies how accurate that forecast was.

Built for the "Full Stack SWE challenge v4" brief: understand the latest renewable forecast
available at decision time, and quantify forecast error, using Elexon BMRS `FUELHH` (actuals)
and `WINDFOR` (forecasts) data for wind, national level, January 2026 only.

**AI tool disclosure:** this app (backend, frontend, Docker setup, and this README) was built
with the assistance of Claude (Anthropic), via Claude Code, as permitted by the assignment brief.

## Why this matters for the desk

Wind is weather-dependent and can't be dispatched on demand. To cover the demand wind *won't*
meet, the desk buys the shortfall from thermal generation on the day-ahead market, and that
purchase decision has to be made before the delivery day, based on a forecast — not on what
actually happens. Two things follow directly from that:

1. They need to see the forecast **as it stood at decision time**, not a forecast that was
   revised later (hindsight isn't available to a trader).
2. They need a quantified sense of how wrong that forecast has historically been, so they can
   size a buying margin around it rather than trust it blindly.

This app answers both.

## How "the forecast available at decision time" is defined

GB's day-ahead auction (EPEX/N2EX) gate closes at **11:00 UK time on the day before delivery**.
Elexon's `WINDFOR` dataset republishes a forecast every couple of hours, each covering roughly
the next two days — so there are several forecast vintages per settlement period, and most of
them postdate the moment the desk actually had to act.

For every half-hour actual, this app:

1. Finds the delivery day it belongs to.
2. Computes the decision cutoff: 11:00 UTC on the previous day (January is GMT, so UTC = UK
   local time — no DST adjustment needed for this dataset).
3. Picks the **most recently published** `WINDFOR` forecast, for that settlement period's hour,
   with a `publishTime` at or before that cutoff.

That's the number plotted as "day-ahead forecast" and compared against the actual. The cutoff
hour is a single constant (`DAY_AHEAD_CUTOFF_HOUR_UTC` in `backend/app/config.py`) if the real
gate-closure time needs tuning.

## Accuracy metrics

Computed by comparing the day-ahead forecast against the actual, per period, then aggregated
overall and per day:

- **MAE** (mean absolute error, MW) — typical size of the error, in the units the desk buys in.
- **RMSE** (MW) — like MAE but penalises large misses more, surfaces bad days MAE can hide.
- **Bias** (`forecast − actual`, MW) — systematic over/under-forecasting. Positive means the
  forecast has been running hot (desk would have under-bought thermal cover); negative means
  wind under-delivered relative to forecast.
- **Normalised MAE** — MAE as a % of mean actual generation over the period, so error size is
  comparable across low-wind and high-wind days.

## Repo layout

```
backend/
  app/
    main.py          FastAPI app, routes
    analysis.py       core domain logic: day-ahead forecast selection + accuracy metrics
    config.py          target window, day-ahead cutoff hour
    schemas.py          pydantic response models
  data/
    fuelhh_raw.json      cached Elexon FUELHH actuals (fuelType=WIND), Dec 2025 - Feb 2026
    windfor_raw.json      cached Elexon WINDFOR forecasts, same window
  scripts/
    fetch_data.py        re-fetches the two JSON files above from the live Elexon API
  Dockerfile
  requirements.txt

frontend/
  src/
    App.tsx               page layout, date-range controls, data fetching
    api.ts                  typed fetch wrappers around the backend
    types.ts                 shared response types
    components/
      GenerationChart.tsx    actual vs forecast line chart
      DailyAccuracyChart.tsx  daily MAE bar chart
      DailyTable.tsx           accessible table view of daily accuracy
      StatTile.tsx              KPI tile
  Dockerfile               multi-stage build -> nginx
  vercel.json

docker-compose.yml     runs both services together for local dev
render.yaml             Render blueprint for the backend
```

### Why the data is bundled, not fetched live per request

January 2026 is a fixed historical window for this build, and Elexon's API has no auth but is
a third-party dependency the demo shouldn't depend on being up. `backend/data/*.json` is a
one-time snapshot (Dec 30 2025 - Feb 1 2026, wide enough to pad both ends of the day-ahead
lookup) fetched via `backend/scripts/fetch_data.py`. The backend still does all the actual
work — joining actuals to the right forecast vintage and computing accuracy — in Python, at
request time, from that snapshot. Re-run the fetch script to refresh it:

```bash
cd backend
python scripts/fetch_data.py
```

## Running locally

### Option A: Docker Compose (recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:8000 (docs at `/docs`)

### Option B: run each service directly

Backend:

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend (separate terminal):

```bash
cd frontend
npm install
npm run dev
```

Vite dev server runs on http://localhost:5173 and already points at
`http://localhost:8000` via `frontend/.env.development`.

## Deployment

- **Backend -> Render**: new Web Service from this repo, root directory `backend`, Docker
  runtime (Render reads `backend/Dockerfile` automatically, or use the `render.yaml` blueprint
  at the repo root). Set env var `ALLOWED_ORIGINS` to the deployed frontend's origin.
- **Frontend -> Vercel**: new project from this repo, root directory `frontend` (Vercel
  auto-detects Vite via `frontend/vercel.json`). Set env var `VITE_API_BASE_URL` to the
  deployed Render backend's URL.

Live app: **https://fwrdzgu0.vercel.app**
Backend API: **https://fwrdzgu0.onrender.com** (interactive docs at `/docs`; note this is a free-tier Render service, so it may take 30-60s to wake up if idle)

## API

- `GET /api/meta` — dataset description and the day-ahead assumption, as shown in the app banner.
- `GET /api/series?start=YYYY-MM-DD&end=YYYY-MM-DD` — per-period actual, forecast, error.
- `GET /api/accuracy?start=YYYY-MM-DD&end=YYYY-MM-DD` — overall + per-day accuracy metrics.

Interactive docs at `/docs` (FastAPI's built-in Swagger UI) once the backend is running.

## Scope notes

- National-level wind only, no embedded/regional breakdown, no other fuel types — matches the
  brief exactly.
- Data window: January 2026 (with padding either side purely so day-ahead lookups at the
  month's edges resolve).
- No database: the dataset is small (~33 days of half-hourly actuals, a few hundred forecast
  publishes) and fully fits in memory; a cached JSON snapshot plus in-process computation is
  the simplest thing that's still correct and fast.
