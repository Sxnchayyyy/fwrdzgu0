import type { AccuracyResponse, Meta, SeriesPoint } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function fetchSeries(start: string, end: string): Promise<SeriesPoint[]> {
  return getJson(`/api/series?start=${start}&end=${end}`);
}

export function fetchAccuracy(start: string, end: string): Promise<AccuracyResponse> {
  return getJson(`/api/accuracy?start=${start}&end=${end}`);
}

export function fetchMeta(): Promise<Meta> {
  return getJson(`/api/meta`);
}
