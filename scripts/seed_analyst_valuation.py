#!/usr/bin/env python3
"""Generate analyst-valuation.json seed from existing sentiment.json analyst_ratings.

Honest seed: only fields we can derive from existing data. valuation_method=null where
unknown — frontend renders "—" rather than fabricating methodology labels.
"""
import json
import sys
from datetime import datetime, timezone


def main(sentiment_path: str, out_path: str):
    with open(sentiment_path, encoding="utf-8") as f:
        s = json.load(f)

    coverage = []
    for r in s.get("analyst_ratings", []):
        firm = r.get("analyst_firm", "") or ""
        if firm.startswith("Consensus") or firm in ("Danelfin AI",):
            continue

        coverage.append({
            "ticker": r.get("ticker"),
            "bank": firm,
            "analyst": r.get("analyst_name"),
            "rating": r.get("rating"),
            "rating_normalized": r.get("rating_normalized"),
            "target_price_usd": r.get("target_price_usd"),
            "prev_target_price_usd": r.get("prev_target_price_usd"),
            "date": r.get("date"),
            "action": r.get("action"),
            "valuation_method": None,
            "sotp_breakdown": None,
            "key_assumptions": None,
            "note": r.get("note"),
            "source": "sentiment_seed",
            "source_url": None,
        })

    out = {
        "_meta": {
            "description": "Sell-side analyst valuation methodologies for US Bitcoin mining companies",
            "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "source_agent": "phase1-seed-from-sentiment",
            "phase": 1,
            "method_coverage_pct": 0,
            "note": (
                "Phase 1 seed: bank/PT/rating from existing sentiment.json analyst_ratings. "
                "valuation_method intentionally null where not verifiable. "
                "Phase 2 collector will populate methodology + SOTP breakdowns from "
                "TheFly/StreetInsider/Benzinga/SeekingAlpha + LLM extraction."
            ),
        },
        "coverage": coverage,
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"wrote {out_path} - {len(coverage)} records")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
