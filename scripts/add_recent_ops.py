#!/usr/bin/env python3
"""Add recent operational data for major miners: MARA, RIOT, CLSK, HIVE, HUT, IREN, BITF."""
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

def rec(ticker, period, period_label, report_date, btc_mined, btc_held,
        hash_rate_eh, power_mw=None, source_url=None, notes=""):
    return {
        "ticker": ticker, "period": period, "period_label": period_label,
        "report_date": report_date, "btc_mined": btc_mined, "btc_held": btc_held,
        "btc_sold": None, "hash_rate_eh": hash_rate_eh,
        "installed_capacity_eh": None, "power_capacity_mw": power_mw,
        "fleet_efficiency_j_th": None, "uptime_pct": None,
        "avg_power_cost_cents_kwh": None, "source_url": source_url, "notes": notes
    }

NEW_RECORDS = [
    # ── RIOT Oct-Dec 2025 (monthly reports) ──
    rec("RIOT", "2025-10", "Oct 2025", "2025-11-04", 437, 19324, 33.2,
        source_url="https://www.riotplatforms.com/riot-announces-october-2025-production-and-operations-updates/",
        notes="Deployed 36.6 EH/s, avg operating 33.2 EH/s. Sold 400 BTC. BTC held incl 3,300 restricted."),
    rec("RIOT", "2025-11", "Nov 2025", "2025-12-04", 428, 19368, 34.6,
        source_url="https://www.riotplatforms.com/riot-announces-november-2025-production-and-operations-updates/",
        notes="Deployed 36.6 EH/s, avg operating 34.6 EH/s. Sold 383 BTC. Fleet eff 20.5 J/TH."),

    # ── CLSK Jan 2026 ──
    rec("CLSK", "2026-01", "Jan 2026", "2026-02-04", 573, 13513, 42.6,
        power_mw=808,
        source_url="https://investors.cleanspark.com/news/news-details/2026/CleanSpark-Releases-January-2026-Operational-Update/default.aspx",
        notes="Peak 50.0 EH/s, avg 42.6 EH/s. 248,394 miners deployed. 1.8 GW contracted, 808 MW utilized. Peak daily: 21.77 BTC."),

    # ── HIVE Apr 2025 - Jan 2026 (monthly reports) ──
    rec("HIVE", "2025-03", "Mar 2025", None, 100, 2500, 6.3,
        notes="Estimated from quarterly trends. ~100 BTC mined, ~2,500 held."),
    rec("HIVE", "2025-04", "Apr 2025", "2025-05-06", 102, None, 6.5,
        source_url="https://www.newsfilecorp.com/release/251434/",
        notes="Avg 6.5 EH/s, peak 7.3 EH/s. 102 BTC mined."),
    rec("HIVE", "2025-05", "May 2025", "2025-06-05", 139, None, 10.4,
        source_url="https://www.hivedigitaltechnologies.com/news/hive-digital-technologies-achieves-58-peak-hashrate-growth-in-one-month-surpasses-10-ehs-in-may-2025-and-remains-on-track-to-reach-25-ehs-by-year-end/",
        notes="Peak 10.4 EH/s, 58% hashrate growth MoM. 139 BTC mined."),
    rec("HIVE", "2025-06", "Jun 2025", "2025-07-07", 164, None, 11.4,
        notes="11.4 EH/s. 164 BTC mined, 18% jump MoM."),
    rec("HIVE", "2025-07", "Jul 2025", "2025-08-05", 203, None, 15.0,
        source_url="https://www.hivedigitaltechnologies.com/news/hive-digital-technologies-tops-15-ehs-and-provides-july-2025-production-report-with-24-monthly-increase-in-production/",
        notes="Topped 15 EH/s. 203 BTC mined, 24% MoM increase."),
    rec("HIVE", "2025-08", "Aug 2025", "2025-09-04", 247, None, 16.3,
        source_url="https://www.hivedigitaltechnologies.com/news/hive-digital-technologies-provides-august-2025-production-report-with-22-monthly-increase-in-bitcoin-production-and-phase-3-expansion/",
        notes="Avg 16.3 EH/s, peak 18.1 EH/s. 247 BTC mined, 22% MoM increase. Phase 3 expansion."),
    rec("HIVE", "2025-09", "Sep 2025", "2025-10-06", 267, 2202, 19.4,
        notes="Avg 19.4 EH/s, peak 21.7 EH/s. 267 BTC mined. Q2 FY2026: 210 treasury + 1,992 pledged = 2,202 total BTC."),
    rec("HIVE", "2025-10", "Oct 2025", "2025-11-03", 289, None, 24.0,
        source_url="https://www.hivedigitaltechnologies.com/news/hive-digital-technologies-reports-october-bitcoin-production-of-289-btc-up-8-mm-and-147-yy-in-paraguay-while-fueling-canadas-tier-iii-ai-data-center-growth/",
        notes="24.0 EH/s. 289 BTC mined, +8% MoM, +147% YoY. Paraguay operations."),
    rec("HIVE", "2025-11", "Nov 2025", "2025-12-03", 290, None, 23.5,
        source_url="https://www.hivedigitaltechnologies.com/news/hive-digital-technologies-reports-november-production-of-290-btc-achieves-25-ehs-as-tier-iii-ai-data-center-growth-accelerates-into-2026/",
        notes="Avg 23.5 EH/s, peak 25.0 EH/s. 290 BTC mined."),
    rec("HIVE", "2025-12", "Dec 2025", "2026-01-06", 306, None, 23.3,
        source_url="https://www.stocktitan.net/news/HIVE/hive-digital-technologies-delivers-strong-year-over-year-quarter-hp0wjlzekyp3.html",
        notes="Avg 23.3 EH/s, peak 24.0 EH/s. 306 BTC mined. Full year 2025: 2,311 BTC."),
    rec("HIVE", "2026-01", "Jan 2026", "2026-02-05", 297, None, 22.2,
        source_url="https://www.stocktitan.net/news/HIVE/hive-digital-technologies-achieves-290-year-over-year-hashrate-kq7qm6bah4j8.html",
        notes="Avg 22.2 EH/s, peak 23.7 EH/s. 297 BTC mined. 290% YoY hashrate growth."),

    # ── HUT Mar 2025 (last monthly report) ──
    rec("HUT", "2025-03", "Mar 2025", "2025-04-04", 78, 10264, 9.3,
        source_url="https://www.globenewswire.com/news-release/2025/04/04/3056227/0/en/Hut-8-Operations-Update-for-March-2025.html",
        notes="Self-mined 78 BTC (net of JV). Stopped monthly reporting after this. Hashrate 9.3 EH/s."),

    # ── IREN Mar-Aug 2025 (monthly reports, sells BTC daily) ──
    rec("IREN", "2025-03", "Mar 2025", "2025-04-04", 533, 0, 30.3,
        source_url="https://www.globenewswire.com/news-release/2025/04/04/3055869/0/en/IREN-March-2025-Monthly-Update.html",
        notes="Avg 30.3 EH/s. 533 BTC mined. Sells all BTC daily."),
    rec("IREN", "2025-04", "Apr 2025", "2025-05-08", 579, 0, 36.6,
        source_url="https://irisenergy.gcs-web.com/news-releases/news-release-details/iren-april-2025-monthly-update",
        notes="Avg 36.6 EH/s, 40.0 EH/s installed. 579 BTC mined. Sells daily."),
    rec("IREN", "2025-05", "May 2025", "2025-06-05", 627, 0, 38.4,
        source_url="https://www.globenewswire.com/news-release/2025/06/05/3094341/0/en/IREN-May-2025-Monthly-Update.html",
        notes="Avg 38.4 EH/s. 627 BTC mined. Sells daily."),
    rec("IREN", "2025-06", "Jun 2025", "2025-07-07", 650, 0, 50.0,
        source_url="https://www.globenewswire.com/news-release/2025/07/07/3110921/0/en/iren-june-2025-monthly-update.html",
        notes="Installed capacity reached 50.0 EH/s. ~650 BTC mined (record). Sells daily."),
    rec("IREN", "2025-07", "Jul 2025", "2025-08-06", 700, 0, 50.0,
        source_url="https://irisenergy.gcs-web.com/news-releases/news-release-details/iren-july-2025-monthly-update",
        notes="50.0 EH/s capacity. ~700 BTC mined (record). Sells daily."),
    rec("IREN", "2025-08", "Aug 2025", "2025-09-08", 668, 0, 44.0,
        source_url="https://irisenergy.gcs-web.com/news-releases/news-release-details/iren-august-2025-monthly-update",
        notes="Avg 44.0 EH/s (seasonal curtailment). 668 BTC mined. Last monthly report before quarterly switch."),

    # ── BITF Apr 2025 (last monthly report) ──
    rec("BITF", "2025-04", "Apr 2025", "2025-05-01", 268, 1005, 19.5,
        source_url="https://investor.bitfarms.com/news-releases/news-release-details/bitfarms-provides-april-2025-production-and-operations-update",
        notes="268 BTC mined. 1,005 BTC held. 19.5 EH/s. Last monthly report, switching to quarterly."),
]

# Also fix/update existing records
UPDATES = {
    # Fix MARA Oct 2025: add btc_held and hashrate
    ("MARA", "2025-10"): {
        "btc_held": 52850,  # Approximate from Sep 2025 + Oct mined (HODL strategy)
        "hash_rate_eh": 60.4,
        "period_label": "Oct 2025",
        "report_date": "2025-11-03",
        "notes": "~717 BTC mined. Hashrate ~60.4 EH/s. BTC held ~52,850 (est from Q3). Last monthly before quarterly switch."
    },
    # Fix MARA Aug 2025 period_label
    ("MARA", "2025-08"): {
        "period_label": "Aug 2025",
    },
    # Fix RIOT Dec 2025: add btc_mined and btc_held
    ("RIOT", "2025-12"): {
        "btc_mined": 460,
        "btc_held": 18005,
        "source_url": "https://www.riotplatforms.com/riot-announces-december-2025-production-and-operations-updates/",
        "notes": "Deployed 38.5 EH/s, avg operating 34.9 EH/s. Sold 1,818 BTC (~$200M). BTC held 18,005 incl 3,977 restricted. Last monthly report."
    },
}


def main():
    print("=" * 60)
    print("ADD RECENT OPERATIONAL DATA FOR MAJOR MINERS")
    print("=" * 60)

    ops = load_json("data/operational.json")
    existing = {}
    for i, r in enumerate(ops["data"]):
        existing[(r["ticker"], r["period"])] = i

    added = 0
    for r in NEW_RECORDS:
        key = (r["ticker"], r["period"])
        if key not in existing:
            ops["data"].append(r)
            existing[key] = len(ops["data"]) - 1
            added += 1
            print(f"  + {r['ticker']} {r['period_label']}")
        else:
            print(f"  = {r['ticker']} {r['period_label']} (exists)")

    updated = 0
    for key, fields in UPDATES.items():
        if key in existing:
            idx = existing[key]
            for field, val in fields.items():
                if ops["data"][idx].get(field) != val:
                    ops["data"][idx][field] = val
                    updated += 1
            print(f"  ~ {key[0]} {key[1]}: updated {len(fields)} fields")
        else:
            print(f"  ! {key[0]} {key[1]}: NOT FOUND")

    if added or updated:
        ops["data"].sort(key=lambda r: (r["ticker"], r["period"]))
        save_json("data/operational.json", ops)
        print(f"\n  Added {added} records, updated {updated} fields")

    # Summary
    from collections import defaultdict
    by_ticker = defaultdict(list)
    for r in ops["data"]:
        by_ticker[r["ticker"]].append(r)
    print(f"\n  Total: {len(ops['data'])} records, {len(by_ticker)} tickers")
    print("\n  Latest per ticker:")
    for t in sorted(by_ticker):
        recs = sorted(by_ticker[t], key=lambda r: r["period"])
        latest = recs[-1]
        btc = latest.get("btc_held") or "-"
        hr = latest.get("hash_rate_eh") or "-"
        mined = latest.get("btc_mined") or "-"
        print(f"    {t:6s} {latest['period']:8s} mined={str(mined):>6s} held={str(btc):>6s} hash={str(hr):>6s}  ({len(recs)} records)")


if __name__ == "__main__":
    main()
