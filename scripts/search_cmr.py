"""Query the public NASA CMR catalog; metadata only, not validated scene pairs."""
import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

COLLECTIONS = ("NISAR_L2_GCOV_V1", "NISAR_L2_GCOV_PROVISIONAL_V1", "NISAR_L2_GCOV_BETA_V1")
ENDPOINT = "https://cmr.earthdata.nasa.gov/search/granules.json"
ROOT = Path(__file__).resolve().parents[1]

def utc_now():
    return datetime.now(timezone.utc).isoformat()

def search(short_name, bbox, start, end, max_pages):
    pages, entries, urls = [], [], []
    search_after = None
    hits = None
    for page in range(1, max_pages + 1):
        params = {"short_name": short_name, "bounding_box": bbox,
                  "temporal": f"{start}T00:00:00Z,{end}T23:59:59Z", "page_size": 100}
        url = ENDPOINT + "?" + urlencode(params)
        headers = {"Accept": "application/json", "User-Agent": "BosqueVivo-HN-catalog/1.0"}
        if search_after:
            headers["CMR-Search-After"] = search_after
        elif page > 1:
            raise RuntimeError("CMR pagination token missing; no further page requested")
        urls.append(url)
        with urlopen(Request(url, headers=headers), timeout=45) as response:
            payload = json.load(response)
            hits = response.headers.get("CMR-Hits", hits)
            search_after = response.headers.get("CMR-Search-After")
        current = payload.get("feed", {}).get("entry")
        if not isinstance(current, list):
            raise ValueError("Unexpected CMR response; feed.entry not found")
        pages.append(payload)
        entries.extend(current)
        if len(current) < 100 or (hits is not None and len(entries) >= int(hits)):
            break
    return {"collection": short_name, "status": "ok", "retrieved_count": len(entries),
            "cmr_hits": int(hits) if hits is not None else None,
            "truncated": (len(entries) < int(hits)) if hits is not None else len(entries) >= max_pages * 100,
            "request_urls": urls, "raw_pages": pages,
            "scenes": [{"id": e.get("id"), "producer_granule_id": e.get("producer_granule_id"),
                        "title": e.get("title"), "acquired_start": e.get("time_start"),
                        "acquired_end": e.get("time_end"), "collection_concept_id": e.get("collection_concept_id"),
                        "data_size": e.get("granule_size"), "boxes": e.get("boxes"),
                        "polygons": e.get("polygons"), "pair_status": "needs_metadata_review"} for e in entries]}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--bbox", default="-87.35,14.00,-87.05,14.35")
    p.add_argument("--start", default="2026-06-01")
    p.add_argument("--end", default="2026-10-31")
    p.add_argument("--max-pages", type=int, default=3, choices=range(1, 11))
    args = p.parse_args()
    start, end = (datetime.strptime(x, "%Y-%m-%d").date() for x in (args.start, args.end))
    if start > end:
        p.error("start must be <= end")
    try:
        west, south, east, north = map(float, args.bbox.split(","))
        if not (-180 <= west < east <= 180 and -90 <= south < north <= 90):
            raise ValueError()
    except ValueError:
        p.error("bbox must be west,south,east,north within geographic bounds")
    report = {"retrieved_at": utc_now(), "scope": "CMR metadata only; not processed measurements",
              "bbox": args.bbox, "start": args.start, "end": args.end, "collections": []}
    for name in COLLECTIONS:
        try:
            result = search(name, args.bbox, args.start, args.end, args.max_pages)
            print(f"{name}: {result['retrieved_count']} catalog records; compatibility not verified")
        except (HTTPError, URLError, TimeoutError, ValueError, RuntimeError, OSError) as exc:
            # Do not publish exceptions with URLs/credentials; public query only.
            result = {"collection": name, "status": "error", "error_type": type(exc).__name__,
                      "message": str(exc)[:500], "retrieved_count": None}
            print(f"{name}: error ({type(exc).__name__})")
        report["collections"].append(result)
    directory = ROOT / ".bosquevivo-work" / "catalog"
    directory.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    dest = directory / f"cmr-{stamp}.json"
    temp = dest.with_suffix(".tmp")
    temp.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temp, dest)
    print(f"Report: {dest}")
    # Never equate failed queries with empty collection. Non-zero indicates incomplete query.
    return 1 if any(x["status"] != "ok" for x in report["collections"]) else 0

if __name__ == "__main__":
    raise SystemExit(main())
