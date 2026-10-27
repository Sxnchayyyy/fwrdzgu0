export interface SeriesPoint {
  startTime: string;
  settlementPeriod: number;
  actualMw: number;
  forecastMw: number | null;
  errorMw: number | null;
  forecastPublishTime: string | null;
  decisionCutoff: string;
}

export interface AccuracySummary {
  sampleSize: number;
  coverage: number;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  normalisedMaePct: number | null;
  meanActualMw: number | null;
}

export interface DailyAccuracy extends AccuracySummary {
  date: string;
}

export interface AccuracyResponse {
  overall: AccuracySummary;
  daily: DailyAccuracy[];
}

export interface Meta {
  dataset: string;
  source: string;
  targetStart: string;
  targetEnd: string;
  dayAheadCutoffHourUtc: number;
  assumption: string;
}
