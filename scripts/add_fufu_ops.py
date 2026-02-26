#!/usr/bin/env python3
"""Add FUFU monthly operational data Apr 2025 - Jan 2026 and update Q1-Q3 financials."""
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

FUFU_OPS = [
    {"period": "2025-04", "period_label": "Apr 2025", "report_date": "2025-05-08",
     "btc_mined": 36, "btc_held": 1908, "hash_rate_eh": 4.2, "power_capacity_mw": 566,
     "source_url": "https://www.globenewswire.com/news-release/2025/05/08/3077221/0/en/BitFuFu-Announces-April-2025-Bitcoin-Mining-and-Operation-Updates.html",
     "notes": "Self-mining: 36 BTC. Power capacity expanded to 566 MW. BTC held 1,908."},
    {"period": "2025-05", "period_label": "May 2025", "report_date": "2025-06-04",
     "btc_mined": 43, "btc_held": 1709, "hash_rate_eh": 4.2, "power_capacity_mw": 651,
     "source_url": "https://www.globenewswire.com/news-release/2025/06/04/3093503/0/en/BitFuFu-Announces-May-2025-Bitcoin-Mining-and-Operation-Updates-Highlighting-Record-Hashrate-of-34-1-EH-s.html",
     "notes": "Self-mining: 43 BTC. Record total managed hashrate 34.1 EH/s. Power 651 MW. BTC held 1,709."},
    {"period": "2025-06", "period_label": "Jun 2025", "report_date": "2025-07-07",
     "btc_mined": 58, "btc_held": 1792, "hash_rate_eh": 3.8, "power_capacity_mw": 728,
     "source_url": "https://www.globenewswire.com/news-release/2025/07/07/3110962/0/en/BitFuFu-Announces-June-2025-Bitcoin-Production-and-Operation-Updates-Record-36-2-EH-s-Hashrate-and-728-MW-Power-Capacity.html",
     "notes": "Self-mining: 58 BTC. Record 36.2 EH/s total managed, 728 MW power. BTC held 1,792."},
    {"period": "2025-07", "period_label": "Jul 2025", "report_date": "2025-08-05",
     "btc_mined": 83, "btc_held": 1784, "hash_rate_eh": 3.8, "power_capacity_mw": 752,
     "source_url": "https://www.globenewswire.com/news-release/2025/08/05/3127310/0/en/BitFuFu-Announces-July-2025-Bitcoin-Production-and-Operation-Updates-Record-38-6-EH-s-Hashrate-467-BTC-Mined.html",
     "notes": "Self-mining: 83 BTC (peak). Record 38.6 EH/s total, 752 MW power. BTC held 1,784."},
    {"period": "2025-08", "period_label": "Aug 2025", "report_date": "2025-09-04",
     "btc_mined": 55, "btc_held": 1899, "hash_rate_eh": 5.0, "power_capacity_mw": 628,
     "source_url": "https://www.globenewswire.com/news-release/2025/09/04/3144460/0/en/BitFuFu-Announces-August-2025-Bitcoin-Production-and-Operation-Updates-Bitcoin-Holdings-Increasing-to-1-899-BTC.html",
     "notes": "Self-mining: 55 BTC. Self-owned hashrate upgraded to 5.0 EH/s. BTC held 1,899."},
    {"period": "2025-09", "period_label": "Sep 2025", "report_date": "2025-10-06",
     "btc_mined": 33, "btc_held": 1959, "hash_rate_eh": 5.0, "power_capacity_mw": 624,
     "source_url": "https://www.globenewswire.com/news-release/2025/10/06/3161664/0/en/BitFuFu-Announces-September-2025-Bitcoin-Production-and-Operation-Updates-Bitcoin-Holdings-Increasing-to-1-959-BTC.html",
     "notes": "Self-mining: 33 BTC. BTC held peaked at 1,959. Self-owned 5.0 EH/s."},
    {"period": "2025-10", "period_label": "Oct 2025", "report_date": "2025-11-05",
     "btc_mined": 30, "btc_held": 1953, "hash_rate_eh": 5.0, "power_capacity_mw": 555,
     "source_url": "https://www.globenewswire.com/news-release/2025/11/05/3181389/0/en/BitFuFu-Announces-October-2025-Bitcoin-Production-and-Operational-Updates.html",
     "notes": "Self-mining: 30 BTC. Self-owned 5.0 EH/s. Power 555 MW. BTC held 1,953."},
    {"period": "2025-11", "period_label": "Nov 2025", "report_date": "2025-12-05",
     "btc_mined": 41, "btc_held": 1764, "hash_rate_eh": 3.7, "power_capacity_mw": 478,
     "source_url": "https://www.globenewswire.com/news-release/2025/12/05/3200667/0/en/BitFuFu-Announces-November-2025-Bitcoin-Production-and-Operational-Updates.html",
     "notes": "Self-mining: 41 BTC. Sold ~205 BTC at ~$107K. S19→S21 fleet transition, hashrate 3.7 EH/s. BTC held 1,764."},
    {"period": "2025-12", "period_label": "Dec 2025", "report_date": "2026-01-07",
     "btc_mined": 37, "btc_held": 1780, "hash_rate_eh": 3.7, "power_capacity_mw": 478,
     "source_url": "https://www.globenewswire.com/news-release/2026/01/07/3214474/0/en/BitFuFu-Announces-December-2025-Bitcoin-Production-and-Operational-Updates.html",
     "notes": "Self-mining: 37 BTC. Hashrate 3.7 EH/s. BTC held 1,780."},
    {"period": "2026-01", "period_label": "Jan 2026", "report_date": "2026-02-05",
     "btc_mined": 46, "btc_held": 1796, "hash_rate_eh": 3.7, "power_capacity_mw": 520,
     "source_url": "https://www.globenewswire.com/news-release/2026/02/05/3232973/0/en/BitFuFu-Announces-January-2026-Bitcoin-Production-and-Operational-Updates.html",
     "notes": "Self-mining: 46 BTC. Power capacity recovered to 520 MW. BTC held 1,796."},
]


def main():
    print("=" * 60)
    print("ADD FUFU OPERATIONAL DATA Apr 2025 - Jan 2026")
    print("=" * 60)

    # 1. Add operational records
    ops = load_json("data/operational.json")
    existing = set()
    for r in ops["data"]:
        existing.add((r["ticker"], r["period"]))

    added = 0
    for rec in FUFU_OPS:
        key = ("FUFU", rec["period"])
        if key not in existing:
            full_rec = {
                "ticker": "FUFU",
                "period": rec["period"],
                "period_label": rec["period_label"],
                "report_date": rec["report_date"],
                "btc_mined": rec["btc_mined"],
                "btc_held": rec["btc_held"],
                "btc_sold": None,
                "hash_rate_eh": rec["hash_rate_eh"],
                "installed_capacity_eh": None,
                "power_capacity_mw": rec.get("power_capacity_mw"),
                "fleet_efficiency_j_th": None,
                "uptime_pct": None,
                "avg_power_cost_cents_kwh": None,
                "source_url": rec["source_url"],
                "notes": rec["notes"]
            }
            ops["data"].append(full_rec)
            existing.add(key)
            added += 1
            print(f"  + FUFU {rec['period_label']}")
        else:
            print(f"  = FUFU {rec['period_label']} (exists)")

    if added:
        ops["data"].sort(key=lambda r: (r["ticker"], r["period"]))
        save_json("data/operational.json", ops)
        print(f"\n  Added {added} operational records")
    else:
        print("\n  No new operational records")

    # 2. Update FUFU Q1-Q3 2025 financials with btc_held
    fin = load_json("data/financials.json")
    updates = {
        ("FUFU", 2025, "Q1"): {"btc_held": 1835},
        ("FUFU", 2025, "Q2"): {"btc_held": 1792},
        ("FUFU", 2025, "Q3"): {"btc_held": 1962},
    }
    fin_updated = 0
    for r in fin["data"]:
        key = (r["ticker"], r["fiscal_year"], r["fiscal_quarter"])
        if key in updates:
            for field, val in updates[key].items():
                if r.get(field) != val:
                    r[field] = val
                    fin_updated += 1
                    print(f"  ~ FUFU {r['period_label']}: {field} = {val}")

    if fin_updated:
        save_json("data/financials.json", fin)
        print(f"\n  Updated {fin_updated} financial fields")
    else:
        print("\n  No financial updates needed")

    # Summary
    fufu_ops = [r for r in ops["data"] if r["ticker"] == "FUFU"]
    print(f"\n  FUFU total operational records: {len(fufu_ops)}")
    print(f"  Period range: {fufu_ops[0]['period']} ~ {fufu_ops[-1]['period']}")


if __name__ == "__main__":
    main()
