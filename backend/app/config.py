from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
FUELHH_RAW = DATA_DIR / "fuelhh_raw.json"
WINDFOR_RAW = DATA_DIR / "windfor_raw.json"

# Target reporting window for this build of the product.
TARGET_START_DATE = "2026-01-01"
TARGET_END_DATE = "2026-01-31"

# GB day-ahead auction (EPEX/N2EX) gate closure is 11:00 UK time on the
# day before delivery. January is GMT (UTC+0), so no DST adjustment is
# needed for this build. A trader deciding how much thermal power to
# buy for delivery day D can only see forecasts published before this
# cutoff on D-1 -- that is the forecast this app treats as "the latest
# forecast available when the decision was made".
DAY_AHEAD_CUTOFF_HOUR_UTC = 11
