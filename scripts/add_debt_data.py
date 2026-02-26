#!/usr/bin/env python3
"""Add total_debt_usd_m to latest financial records for all companies."""
import json
import os

BASE = os.path.join(os.path.dirname(__file__), "..")

def load_json(path):
    with open(os.path.join(BASE, path)) as f:
        return json.load(f)

def save_json(path, data):
    with open(os.path.join(BASE, path), "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved {path}")

# Total debt data from SEC filings and earnings releases
# Format: ticker -> [(fiscal_year, fiscal_quarter, total_debt_usd_m)]
DEBT_DATA = {
    "FUFU":  [(2024, "FY", 141.3), (2025, "Q1", 141.3), (2025, "Q2", 141.3), (2025, "Q3", 141.3)],
    "MARA":  [(2024, "FY", 2474.0), (2025, "FY", 3642.0)],
    "RIOT":  [(2024, "FY", 480.0), (2025, "FY", 585.3)],
    "CLSK":  [(2024, "FY", 245.6), (2025, "FY", 644.6)],  # FY ends Sep
    "CORZ":  [(2024, "FY", 1085.0)],
    "CIFR":  [(2024, "FY", 56.4)],
    "IREN":  [(2024, "FY", 1.3), (2025, "FY", 964.2)],  # FY ends Jun
    "HUT":   [(2024, "FY", 235.6)],
    "HIVE":  [(2024, "FY", 30.1), (2025, "FY", 55.2)],  # FY ends Mar
    "BITF":  [(2024, "FY", 1.4), (2025, "Q1", 51.6), (2025, "Q2", 51.6), (2025, "Q3", 51.6)],
    "WULF":  [(2024, "FY", 500.0)],
    "BTDR":  [(2024, "FY", 468.0), (2025, "FY", 1000.0)],
    "BTBT":  [(2024, "FY", 0.0), (2025, "FY", 0.0)],
    "APLD":  [(2024, "FY", 150.0), (2025, "FY", 688.2)],  # FY ends May
    "ABTC":  [(2024, "FY", 0.0), (2025, "FY", 0.0)],
    "ANY":   [(2024, "FY", 0.0)],
    "MIGI":  [(2024, "FY", 21.4), (2025, "FY", 21.4)],
    "GREE":  [(2024, "FY", 68.5)],
    "GPUS":  [(2024, "FY", 27.3)],
    "SLNH":  [(2024, "FY", 23.3)],
    "DGXX":  [(2024, "FY", 0.0)],
    "SAIH":  [(2024, "FY", 1.6)],
}


def main():
    print("=" * 60)
    print("ADD TOTAL DEBT DATA")
    print("=" * 60)

    fin = load_json("data/financials.json")

    # Build lookup
    debt_lookup = {}
    for ticker, entries in DEBT_DATA.items():
        for fy, fq, debt in entries:
            debt_lookup[(ticker, fy, fq)] = debt

    updated = 0
    for r in fin["data"]:
        key = (r["ticker"], r["fiscal_year"], r["fiscal_quarter"])
        if key in debt_lookup:
            new_val = debt_lookup[key]
            old_val = r.get("total_debt_usd_m")
            if old_val != new_val:
                r["total_debt_usd_m"] = new_val
                updated += 1
                print(f"  ~ {r['ticker']} {r['period_label']}: debt {old_val} -> {new_val}")

    if updated:
        save_json("data/financials.json", fin)
        print(f"\n  Updated {updated} records with debt data")
    else:
        print("\n  No updates needed")

    # Verify
    has_debt = sum(1 for r in fin["data"] if r.get("total_debt_usd_m") is not None)
    print(f"\n  Records with total_debt: {has_debt} / {len(fin['data'])}")

    # Show latest debt per company
    latest = {}
    for r in fin["data"]:
        if r.get("total_debt_usd_m") is not None:
            t = r["ticker"]
            if t not in latest or r["period_end_date"] > latest[t]["period_end_date"]:
                latest[t] = r
    print(f"  Companies with debt data: {len(latest)} / 22\n")
    for t in sorted(latest):
        r = latest[t]
        print(f"    {t:6s} {r['period_label']:15s} debt=${r['total_debt_usd_m']:>8.1f}M")


if __name__ == "__main__":
    main()
