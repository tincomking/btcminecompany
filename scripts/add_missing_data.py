#!/usr/bin/env python3
"""
Add missing financial and operational data for foreign issuers and data gaps.
Sources: SEC EDGAR 20-F/40-F filings, press releases, StockAnalysis.com.
"""
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


def make_fy_record(ticker, fy, period_end, report_date, rev, ni, oi, ebitda, gp, eps, shares, notes):
    return {
        "ticker": ticker, "fiscal_year": fy, "fiscal_quarter": "FY",
        "period_label": f"FY {fy}", "period_end_date": period_end,
        "report_date": report_date, "estimated_report_date": None,
        "is_reported": True,
        "revenue_usd_m": rev, "gross_profit_usd_m": gp,
        "operating_income_usd_m": oi, "net_income_usd_m": ni,
        "adjusted_ebitda_usd_m": ebitda, "eps_diluted": eps,
        "revenue_yoy_pct": None, "gross_profit_yoy_pct": None,
        "net_income_yoy_pct": None, "adjusted_ebitda_yoy_pct": None,
        "shares_outstanding_m": shares,
        "cash_and_equivalents_usd_m": None, "btc_held": None,
        "total_debt_usd_m": None, "notes": notes
    }


def make_ops_record(ticker, period, label, report_date, btc_mined, btc_held,
                     hashrate, efficiency, notes, source_url=None):
    return {
        "ticker": ticker, "period": period, "period_label": label,
        "report_date": report_date,
        "btc_mined": btc_mined, "btc_held": btc_held, "btc_sold": None,
        "hash_rate_eh": hashrate, "installed_capacity_eh": None,
        "power_capacity_mw": None, "fleet_efficiency_j_th": efficiency,
        "uptime_pct": None, "avg_power_cost_cents_kwh": None,
        "source_url": source_url, "notes": notes
    }


# ── HIVE FY2020-2023 (fiscal year ends March 31) ──
# Data from SEC 20-F, press releases, StockAnalysis.com
HIVE_NEW = [
    make_fy_record("HIVE", 2020, "2020-03-31", "2020-09-14",
                   29.2, -1.7, None, 5.0, 8.5, -0.01, 65.38,
                   "Source: HIVE 20-F FY2020. FY ends Mar 31. IFRS reporting."),
    make_fy_record("HIVE", 2021, "2021-03-31", "2021-07-16",
                   67.7, 24.1, 54.0, None, 51.1, 0.33, 73.29,
                   "Source: HIVE 20-F FY2021, StockAnalysis. IFRS comprehensive income."),
    make_fy_record("HIVE", 2022, "2022-03-31", "2022-07-20",
                   211.2, 79.6, 79.3, None, 163.9, 0.94, 84.81,
                   "Source: HIVE 20-F FY2022, StockAnalysis. Record annual revenue."),
    make_fy_record("HIVE", 2023, "2023-03-31", "2023-07-26",
                   106.3, -236.4, -125.2, None, 50.9, -2.85, 82.87,
                   "Source: HIVE 20-F FY2023, StockAnalysis. Large impairment charges."),
]

# ── IREN FY2020-2022 (fiscal year ends June 30) ──
# Data from SEC 20-F XBRL, press releases
IREN_NEW = [
    make_fy_record("IREN", 2020, "2020-06-30", "2022-09-13",
                   2.2, -2.1, -1.7, None, None, -0.13, 16.1,
                   "Source: IREN 20-F FY2020 (comparative). Pre-IPO. IFRS reporting."),
    make_fy_record("IREN", 2021, "2021-06-30", "2022-09-13",
                   7.9, -60.4, -0.5, 1.4, None, -2.93, 20.6,
                   "Source: IREN 20-F FY2021. Pre-IPO. NI includes -$61.2M finance costs."),
    make_fy_record("IREN", 2022, "2022-06-30", "2022-09-13",
                   59.0, -419.8, 0.3, 26.2, None, -10.25, 40.9,
                   "Source: IREN 20-F FY2022. NI includes -$425M finance costs (derivatives)."),
]

# ── HUT FY2020-2021 (calendar year, originally CAD converted to USD) ──
# Data from SEC 40-F, press releases. CAD→USD avg rates: 2020=0.7462, 2021=0.7977
HUT_NEW = [
    make_fy_record("HUT", 2020, "2020-12-31", "2021-03-25",
                   30.4, 14.2, -5.3, -0.2, -13.8, 0.15, 90.4,
                   "Source: Hut 8 Mining 40-F FY2020. CAD→USD @0.7462. NI boosted by impairment reversal."),
    make_fy_record("HUT", 2021, "2021-12-31", "2022-03-18",
                   138.7, -58.0, 38.9, 77.1, 70.8, -0.43, 97.2,
                   "Source: Hut 8 Mining 40-F FY2021. CAD→USD @0.7977. NI loss from -$70.8M finance costs."),
]

# ── FUFU FY2020 (founded Dec 2020, minimal ops) ──
FUFU_NEW = [
    make_fy_record("FUFU", 2020, "2020-12-31", None,
                   1.2, -1.1, -1.1, None, 0.1, None, None,
                   "Source: StockAnalysis (from SPAC F-4 filing). Founded Dec 2020, minimal operations."),
]

# ── Operational data (51 new records) ──
OPS_NEW = []

# BITF monthly 2024-2025
bitf_monthly = [
    ("2024-01", "Jan 2024", 357, None, None, None),
    ("2024-02", "Feb 2024", 300, None, None, None),
    ("2024-03", "Mar 2024", 286, None, None, None),
    ("2024-04", "Apr 2024", 269, None, None, None),
    ("2024-05", "May 2024", 156, None, None, None),
    ("2024-06", "Jun 2024", 189, None, 10.4, 25.0),
    ("2024-07", "Jul 2024", 253, None, 11.1, None),
    ("2024-08", "Aug 2024", 233, None, None, None),
    ("2024-09", "Sep 2024", 217, None, None, None),
    ("2024-10", "Oct 2024", 236, None, None, None),
    ("2024-11", "Nov 2024", 207, None, 12.8, None),
    ("2024-12", "Dec 2024", 211, 934, 12.8, 21.0),
    ("2025-01", "Jan 2025", 201, 1152, 15.2, 20.0),
    ("2025-02", "Feb 2025", 213, 1260, 16.1, 20.0),
    ("2025-03", "Mar 2025", 280, 1140, 19.5, 19.0),
]
for p, lbl, mined, held, hr, eff in bitf_monthly:
    OPS_NEW.append(make_ops_record(
        "BITF", p, lbl, None, mined, held, hr, eff,
        "Source: Bitfarms monthly production update.",
        "https://investor.bitfarms.com/news-releases"))

# BTBT monthly 2024-2025
btbt_monthly = [
    ("2024-01", "Jan 2024", 145.7, 739, 2.50, None),
    ("2024-02", "Feb 2024", 128.7, 848, 2.73, None),
    ("2024-03", "Mar 2024", 136.4, 957, 2.76, None),
    ("2024-04", "Apr 2024", 119.3, 992, 2.76, None),
    ("2024-05", "May 2024", 63.3, None, 2.54, None),
    ("2024-06", "Jun 2024", 61.7, 586, 2.57, None),
    ("2024-07", "Jul 2024", 60.5, 642, 2.46, None),
    ("2024-08", "Aug 2024", 53.4, None, 2.43, None),
    ("2024-09", "Sep 2024", 51.5, None, 2.43, None),
    ("2024-10", "Oct 2024", 52.2, None, 2.43, None),
    ("2024-11", "Nov 2024", 44.9, 813, 2.51, None),
    ("2024-12", "Dec 2024", 32.4, 742, 1.80, None),
    ("2025-01", "Jan 2025", 28.7, 769, 1.60, None),
]
for p, lbl, mined, held, hr, eff in btbt_monthly:
    OPS_NEW.append(make_ops_record(
        "BTBT", p, lbl, None, mined, held, hr, eff,
        "Source: Bit Digital monthly production update.",
        "https://bit-digital.com/press-releases/"))

# HIVE monthly 2024-2025
hive_monthly = [
    ("2024-01", "Jan 2024", 235, 1939, 3.85, None),
    ("2024-02", "Feb 2024", 200, 2131, None, None),
    ("2024-03", "Mar 2024", 224, 2287, None, None),
    ("2024-04", "Apr 2024", 212, 2377, 5.0, None),
    ("2024-05", "May 2024", 119, 2451, 4.9, None),
    ("2024-06", "Jun 2024", 119, 2496, None, None),
    ("2024-07", "Jul 2024", 116, 2533, 4.7, None),
    ("2024-08", "Aug 2024", 112, 2567, 5.0, 23.0),
    ("2024-09", "Sep 2024", 112, 2604, 5.3, None),
    ("2024-10", "Oct 2024", 117, 2624, 5.3, 22.3),
    ("2024-11", "Nov 2024", 103, 2713, 5.3, 22.3),
    ("2024-12", "Dec 2024", 103, 2805, 5.5, 22.0),
    ("2025-01", "Jan 2025", 102, 2657, 5.7, None),
    ("2025-02", "Feb 2025", 89, 2620, 5.6, 20.9),
]
for p, lbl, mined, held, hr, eff in hive_monthly:
    OPS_NEW.append(make_ops_record(
        "HIVE", p, lbl, None, mined, held, hr, eff,
        "Source: HIVE Digital monthly production update.",
        "https://www.hivedigitaltechnologies.com/news/"))

# FUFU monthly 2024-2025
fufu_monthly = [
    ("2024-11", "Nov 2024", 84, 1643, None, None),
    ("2024-12", "Dec 2024", 111, 1720, 3.1, None),
    ("2025-01", "Jan 2025", 83, 1742, 3.1, None),
    ("2025-02", "Feb 2025", 58, 1800, None, None),
    ("2025-03", "Mar 2025", 58, 1847, 4.2, None),
]
for p, lbl, mined, held, hr, eff in fufu_monthly:
    OPS_NEW.append(make_ops_record(
        "FUFU", p, lbl, None, mined, held, hr, eff,
        "Source: BitFuFu monthly production update.",
        "https://www.globenewswire.com/"))

# ABTC quarterly (no monthly data available)
abtc_ops = [
    ("2025-Q4", "Q4 2025", 783, 5401, 21.9, 16.3),
]
for p, lbl, mined, held, hr, eff in abtc_ops:
    OPS_NEW.append(make_ops_record(
        "ABTC", p, lbl, None, mined, held, hr, eff,
        "Source: ABTC Q4 FY2025 earnings. Quarterly aggregate.",
        None))


YOY_CAP = 1000.0


def _capped_yoy(curr, prev):
    if curr is None or prev is None or prev == 0:
        return None
    val = round((curr - prev) / abs(prev) * 100, 1)
    return max(-YOY_CAP, min(YOY_CAP, val))


def compute_yoy(records):
    """Recompute all YoY percentages."""
    from collections import defaultdict
    by_ticker_q = defaultdict(list)
    for r in records:
        by_ticker_q[(r["ticker"], r["fiscal_quarter"])].append(r)

    for key, recs in by_ticker_q.items():
        recs.sort(key=lambda x: x["fiscal_year"])
        for i, r in enumerate(recs):
            if i == 0:
                r["revenue_yoy_pct"] = None
                r["gross_profit_yoy_pct"] = None
                r["net_income_yoy_pct"] = None
                r["adjusted_ebitda_yoy_pct"] = None
                continue
            prev = recs[i - 1]
            if r["fiscal_year"] - prev["fiscal_year"] != 1:
                r["revenue_yoy_pct"] = None
                r["gross_profit_yoy_pct"] = None
                r["net_income_yoy_pct"] = None
                r["adjusted_ebitda_yoy_pct"] = None
                continue
            r["revenue_yoy_pct"] = _capped_yoy(r.get("revenue_usd_m"), prev.get("revenue_usd_m"))
            r["gross_profit_yoy_pct"] = _capped_yoy(r.get("gross_profit_usd_m"), prev.get("gross_profit_usd_m"))
            r["net_income_yoy_pct"] = _capped_yoy(r.get("net_income_usd_m"), prev.get("net_income_usd_m"))
            r["adjusted_ebitda_yoy_pct"] = _capped_yoy(r.get("adjusted_ebitda_usd_m"), prev.get("adjusted_ebitda_usd_m"))


def main():
    print("=" * 60)
    print("ADD MISSING FINANCIAL & OPERATIONAL DATA")
    print("=" * 60)

    # ── Financials ──
    financials = load_json("data/financials.json")
    existing = set()
    for r in financials["data"]:
        existing.add((r["ticker"], r["fiscal_year"], r["fiscal_quarter"]))

    all_new_fin = []
    for batch_name, batch in [("HIVE", HIVE_NEW), ("IREN", IREN_NEW),
                               ("HUT", HUT_NEW), ("FUFU", FUFU_NEW)]:
        added = 0
        for r in batch:
            key = (r["ticker"], r["fiscal_year"], r["fiscal_quarter"])
            if key not in existing:
                all_new_fin.append(r)
                existing.add(key)
                added += 1
        print(f"  {batch_name}: {added} new FY records")

    if all_new_fin:
        financials["data"].extend(all_new_fin)
        q_order = {"Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4, "FY": 5}
        financials["data"].sort(key=lambda r: (r["ticker"], r["fiscal_year"],
                                                q_order.get(r["fiscal_quarter"], 0)))
        # Recompute YoY
        compute_yoy(financials["data"])
        save_json("data/financials.json", financials)
        print(f"\n  Added {len(all_new_fin)} financial records total")
    else:
        print("\n  No new financial records needed")

    # ── FY count check ──
    from collections import defaultdict
    fy_count = defaultdict(int)
    for r in financials["data"]:
        if r["fiscal_quarter"] == "FY":
            fy_count[r["ticker"]] += 1
    print("\n  FY records per ticker:")
    for t in sorted(fy_count):
        status = "OK" if fy_count[t] >= 4 else "LOW"
        print(f"    {t}: {fy_count[t]} FY [{status}]")

    # ── Operational ──
    operational = load_json("data/operational.json")
    existing_ops = set()
    for r in operational["data"]:
        existing_ops.add((r["ticker"], r["period"]))

    added_ops = 0
    for r in OPS_NEW:
        key = (r["ticker"], r["period"])
        if key not in existing_ops:
            operational["data"].append(r)
            existing_ops.add(key)
            added_ops += 1

    if added_ops:
        operational["data"].sort(key=lambda r: (r["ticker"], r["period"]))
        save_json("data/operational.json", operational)
        print(f"\n  Added {added_ops} operational records")
    else:
        print("\n  No new operational records needed")

    # ── Stats ──
    from collections import Counter
    ops_tickers = Counter(r["ticker"] for r in operational["data"])
    print(f"\n  Operational: {len(operational['data'])} records, {len(ops_tickers)} tickers")
    for t in sorted(ops_tickers):
        print(f"    {t}: {ops_tickers[t]}")

    # ── Validate JSON ──
    print("\n  Validating all JSON files...")
    for f in ["companies.json", "financials.json", "operational.json",
              "news.json", "sentiment.json", "analysis_data.json",
              "btc_price_predictions.json"]:
        try:
            json.load(open(os.path.join(BASE, "data", f)))
            print(f"    {f}: OK")
        except Exception as e:
            print(f"    {f}: ERROR - {e}")


if __name__ == "__main__":
    main()
