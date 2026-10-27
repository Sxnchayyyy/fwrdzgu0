from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SeriesPoint(BaseModel):
    startTime: datetime
    settlementPeriod: int
    actualMw: float
    forecastMw: Optional[float]
    errorMw: Optional[float]
    forecastPublishTime: Optional[datetime]
    decisionCutoff: datetime


class AccuracySummary(BaseModel):
    sampleSize: int
    coverage: float
    mae: Optional[float]
    rmse: Optional[float]
    bias: Optional[float]
    normalisedMaePct: Optional[float]
    meanActualMw: Optional[float]


class DailyAccuracy(AccuracySummary):
    date: str


class AccuracyResponse(BaseModel):
    overall: AccuracySummary
    daily: list[DailyAccuracy]


class MetaResponse(BaseModel):
    dataset: str
    source: str
    targetStart: str
    targetEnd: str
    dayAheadCutoffHourUtc: int
    assumption: str
