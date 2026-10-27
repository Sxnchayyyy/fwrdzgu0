import os
from datetime import date, datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.analysis import compute_accuracy, daily_accuracy, get_dataset
from app.config import DAY_AHEAD_CUTOFF_HOUR_UTC, TARGET_END_DATE, TARGET_START_DATE
from app.schemas import AccuracyResponse, MetaResponse, SeriesPoint

app = FastAPI(
    title="Wind Day-Ahead Forecast Accuracy API",
    description=(
        "Serves GB national wind generation actuals and the forecast "
        "that was available at day-ahead decision time, plus forecast "
        "accuracy metrics, for January 2026."
    ),
    version="1.0.0",
)

allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _parse_date_range(start: str, end: str) -> tuple[datetime, datetime]:
    try:
        start_dt = datetime.combine(date.fromisoformat(start), datetime.min.time(), tzinfo=timezone.utc)
        end_dt = datetime.combine(date.fromisoformat(end), datetime.min.time(), tzinfo=timezone.utc) + timedelta(days=1)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid date: {exc}") from exc
    if end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="end must be after start")
    return start_dt, end_dt


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/meta", response_model=MetaResponse)
def meta() -> MetaResponse:
    return MetaResponse(
        dataset="Elexon BMRS: FUELHH (actuals, fuelType=WIND) and WINDFOR (forecasts)",
        source="https://data.elexon.co.uk/bmrs/api/v1",
        targetStart=TARGET_START_DATE,
        targetEnd=TARGET_END_DATE,
        dayAheadCutoffHourUtc=DAY_AHEAD_CUTOFF_HOUR_UTC,
        assumption=(
            "The day-ahead market gate closes at 11:00 UK time on the day before "
            "delivery. For each settlement period we take the most recently "
            "published WINDFOR forecast as of that cutoff on the prior day as "
            "'the forecast available when the purchase decision was made'."
        ),
    )


@app.get("/api/series", response_model=list[SeriesPoint])
def series(
    start: str = Query(default=TARGET_START_DATE),
    end: str = Query(default=TARGET_END_DATE),
) -> list[SeriesPoint]:
    start_dt, end_dt = _parse_date_range(start, end)
    periods = get_dataset().periods(start_dt, end_dt)
    return [
        SeriesPoint(
            startTime=p.start_time,
            settlementPeriod=p.settlement_period,
            actualMw=p.actual_mw,
            forecastMw=p.forecast_mw,
            errorMw=(p.forecast_mw - p.actual_mw) if p.forecast_mw is not None else None,
            forecastPublishTime=p.forecast_publish_time,
            decisionCutoff=p.decision_cutoff,
        )
        for p in periods
    ]


@app.get("/api/accuracy", response_model=AccuracyResponse)
def accuracy(
    start: str = Query(default=TARGET_START_DATE),
    end: str = Query(default=TARGET_END_DATE),
) -> AccuracyResponse:
    start_dt, end_dt = _parse_date_range(start, end)
    periods = get_dataset().periods(start_dt, end_dt)
    return AccuracyResponse(
        overall=compute_accuracy(periods),
        daily=daily_accuracy(periods),
    )
