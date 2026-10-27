"""
Core domain logic: turns raw Elexon FUELHH (actuals) and WINDFOR
(forecasts) records into the two things the trading desk needs:

  1. For every half-hour settlement period, the day-ahead forecast that
     was actually available when the day-ahead purchase decision had to
     be made, paired with the actual that later materialised.
  2. Forecast accuracy metrics computed from that pairing.

"Day-ahead forecast available at decision time" is not a field Elexon
hands you directly -- WINDFOR publishes a new forecast every couple of
hours, each covering roughly the next two days. We reconstruct what a
trader would have seen by taking, for each settlement period, the most
recently published forecast as of the day-ahead gate closure (11:00
UTC the day before delivery). See config.DAY_AHEAD_CUTOFF_HOUR_UTC.
"""
import bisect
import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from statistics import mean
from typing import Optional

from app.config import DAY_AHEAD_CUTOFF_HOUR_UTC, FUELHH_RAW, WINDFOR_RAW


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


@dataclass(frozen=True)
class PeriodResult:
    start_time: datetime
    settlement_period: int
    actual_mw: float
    forecast_mw: Optional[float]
    forecast_publish_time: Optional[datetime]
    decision_cutoff: datetime


class WindDataset:
    def __init__(self) -> None:
        self._actuals = self._load_actuals()
        self._forecast_index = self._load_forecast_index()

    @staticmethod
    def _load_actuals() -> list[dict]:
        raw = json.loads(FUELHH_RAW.read_text(encoding="utf-8"))
        rows = [
            {
                "start_time": _parse(r["startTime"]),
                "settlement_period": r["settlementPeriod"],
                "generation": float(r["generation"]),
            }
            for r in raw
        ]
        rows.sort(key=lambda r: r["start_time"])
        return rows

    @staticmethod
    def _load_forecast_index() -> dict[datetime, list[tuple[datetime, float]]]:
        """hour_bucket -> [(publishTime, generation), ...] sorted by publishTime."""
        raw = json.loads(WINDFOR_RAW.read_text(encoding="utf-8"))
        index: dict[datetime, list[tuple[datetime, float]]] = {}
        for r in raw:
            bucket = _parse(r["startTime"])
            index.setdefault(bucket, []).append((_parse(r["publishTime"]), float(r["generation"])))
        for bucket in index:
            index[bucket].sort(key=lambda pair: pair[0])
        return index

    def _forecast_at_cutoff(self, hour_bucket: datetime, cutoff: datetime) -> tuple[Optional[float], Optional[datetime]]:
        candidates = self._forecast_index.get(hour_bucket)
        if not candidates:
            return None, None
        publish_times = [c[0] for c in candidates]
        idx = bisect.bisect_right(publish_times, cutoff) - 1
        if idx < 0:
            return None, None
        publish_time, generation = candidates[idx]
        return generation, publish_time

    def periods(self, start: datetime, end: datetime) -> list[PeriodResult]:
        results = []
        for row in self._actuals:
            st = row["start_time"]
            if not (start <= st < end):
                continue
            delivery_day = st.date()
            cutoff = datetime(
                delivery_day.year, delivery_day.month, delivery_day.day,
                tzinfo=timezone.utc,
            ) - timedelta(days=1) + timedelta(hours=DAY_AHEAD_CUTOFF_HOUR_UTC)
            hour_bucket = st.replace(minute=0, second=0, microsecond=0)
            forecast_mw, publish_time = self._forecast_at_cutoff(hour_bucket, cutoff)
            results.append(
                PeriodResult(
                    start_time=st,
                    settlement_period=row["settlement_period"],
                    actual_mw=row["generation"],
                    forecast_mw=forecast_mw,
                    forecast_publish_time=publish_time,
                    decision_cutoff=cutoff,
                )
            )
        return results


@lru_cache(maxsize=1)
def get_dataset() -> WindDataset:
    return WindDataset()


def compute_accuracy(periods: list[PeriodResult]) -> dict:
    paired = [p for p in periods if p.forecast_mw is not None]
    if not paired:
        return {
            "sampleSize": 0,
            "coverage": 0.0,
            "mae": None,
            "rmse": None,
            "bias": None,
            "normalisedMaePct": None,
            "meanActualMw": None,
        }

    errors = [p.forecast_mw - p.actual_mw for p in paired]
    abs_errors = [abs(e) for e in errors]
    sq_errors = [e * e for e in errors]
    mean_actual = mean(p.actual_mw for p in paired)
    mae = mean(abs_errors)

    return {
        "sampleSize": len(paired),
        "coverage": round(len(paired) / len(periods), 4) if periods else 0.0,
        "mae": round(mae, 1),
        "rmse": round(mean(sq_errors) ** 0.5, 1),
        "bias": round(mean(errors), 1),
        "normalisedMaePct": round(100 * mae / mean_actual, 2) if mean_actual else None,
        "meanActualMw": round(mean_actual, 1),
    }


def daily_accuracy(periods: list[PeriodResult]) -> list[dict]:
    by_day: dict[str, list[PeriodResult]] = {}
    for p in periods:
        day_key = p.start_time.date().isoformat()
        by_day.setdefault(day_key, []).append(p)

    out = []
    for day_key in sorted(by_day):
        metrics = compute_accuracy(by_day[day_key])
        out.append({"date": day_key, **metrics})
    return out
