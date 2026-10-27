"""
Pulls national wind generation actuals (FUELHH) and wind generation
forecasts (WINDFOR) from the Elexon BMRS Insights API and stores them
as raw JSON files under backend/data/.

The app ships with data already fetched for January 2026 (plus a few
days of padding on either side so day-ahead lookups at the month's
edges still resolve). Re-run this script only if you want to refresh
or widen the window.

Usage:
    python scripts/fetch_data.py
"""
import json
import urllib.request
from pathlib import Path

BASE = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Padding beyond the target month so that:
#  - forecasts published the day before Jan 1 are available (day-ahead
#    lookups for Jan 1 need publishTime on Dec 31)
#  - the last settlement periods of Jan 31 (which fall in the next
#    calendar day's hour buckets) still have a matching forecast
SETTLEMENT_FROM = "2025-12-31"
SETTLEMENT_TO = "2026-02-01"
PUBLISH_FROM = "2025-12-30T00:00:00Z"
PUBLISH_TO = "2026-02-01T00:00:00Z"


def fetch(url: str) -> list:
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    fuelhh_url = (
        f"{BASE}/FUELHH/stream"
        f"?settlementDateFrom={SETTLEMENT_FROM}&settlementDateTo={SETTLEMENT_TO}"
        f"&fuelType=WIND"
    )
    print(f"Fetching actuals: {fuelhh_url}")
    actuals = fetch(fuelhh_url)
    print(f"  -> {len(actuals)} records")
    (DATA_DIR / "fuelhh_raw.json").write_text(json.dumps(actuals), encoding="utf-8")

    windfor_url = (
        f"{BASE}/WINDFOR/stream"
        f"?publishDateTimeFrom={PUBLISH_FROM}&publishDateTimeTo={PUBLISH_TO}"
    )
    print(f"Fetching forecasts: {windfor_url}")
    forecasts = fetch(windfor_url)
    print(f"  -> {len(forecasts)} records")
    (DATA_DIR / "windfor_raw.json").write_text(json.dumps(forecasts), encoding="utf-8")

    print("Done.")


if __name__ == "__main__":
    main()
