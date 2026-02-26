#!/usr/bin/env python3
"""
Add Q4 2025 / FY2025 data and missing quarterly data for foreign issuers.
Sources: press releases, GlobeNewsWire, SEC filings.
"""
import json
import os

BASE = os.path.join(os.path.dirname(__file__), "..")
YOY_CAP = 1000.0


def load_json(path):
    with open(os.path.join(BASE, path)) as f:
        return json.load(f)


def save_json(path, data):
    with open(os.path.join(BASE, path), "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved {path}")


def make_record(ticker, fy, q, period_label, period_end, report_date,
                rev, ni, oi, ebitda, gp, eps, shares, notes):
    return {
        "ticker": ticker, "fiscal_year": fy, "fiscal_quarter": q,
        "period_label": period_label, "period_end_date": period_end,
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


NEW_RECORDS = [
    # ── BTDR Q4 2025 + FY 2025 (reported Feb 12, 2026) ──
    make_record("BTDR", 2025, "Q4", "Q4 2025", "2025-12-31", "2026-02-12",
                224.8, 70.5, 109.4, 31.2, 10.6, -0.73, 225.3,
                "Source: Bitdeer Q4/FY2025 press release Feb 12 2026. Rev +226% YoY."),
    make_record("BTDR", 2025, "FY", "FY 2025", "2025-12-31", "2026-02-12",
                620.3, 65.6, 159.7, 35.2, 61.0, -1.43, 204.7,
                "Source: Bitdeer FY2025 press release. Diluted EPS -$1.43, basic $0.32."),
    # ── BTDR Q1-Q3 2025 (from SEC EDGAR, may need to be added if not present) ──
    # These should already exist from XBRL... but BTDR only had FY data from XBRL.
    # The XBRL only had annual data. Adding estimated quarterly from press releases later.

    # ── ABTC Q4 2025 + FY 2025 (reported Feb 26, 2026) ──
    make_record("ABTC", 2025, "Q4", "Q4 2025", "2025-12-31", "2026-02-26",
                78.3, -59.5, -104.6, -77.6, 41.6, None, None,
                "Source: American Bitcoin Q4/FY2025 press release Feb 26 2026. Mined 783 BTC."),
    make_record("ABTC", 2025, "FY", "FY 2025", "2025-12-31", "2026-02-26",
                185.2, -153.2, -228.0, -157.3, 93.2, None, None,
                "Source: American Bitcoin FY2025 press release. NI includes $227M non-cash BTC mark-to-market."),

    # ── MIGI FY 2025 (preliminary, Feb 6, 2026) ──
    make_record("MIGI", 2025, "FY", "FY 2025", "2025-12-31", "2026-02-06",
                39.8, -23.8, None, None, 17.3, None, None,
                "Source: Mawson FY2025 preliminary unaudited results Feb 6 2026. Rev -33% YoY."),

    # ── BITF Q1-Q3 2025 (press releases, foreign issuer no XBRL) ──
    make_record("BITF", 2025, "Q1", "Q1 2025", "2025-03-31", "2025-05-14",
                66.8, -35.9, -32.4, 15.1, -0.5, -0.07, 500.2,
                "Source: Bitfarms Q1 2025 press release. IFRS GP negative; mining margin 43%."),
    make_record("BITF", 2025, "Q2", "Q2 2025", "2025-06-30", "2025-08-12",
                77.8, -28.8, -39.6, 13.7, None, -0.05, 555.8,
                "Source: Bitfarms Q2 2025 press release. Rev +87% YoY (Stronghold acq)."),
    make_record("BITF", 2025, "Q3", "Q3 2025", "2025-09-30", "2025-11-13",
                69.2, -46.3, -29.0, 19.6, -2.9, -0.08, 556.5,
                "Source: Bitfarms Q3 2025 press release. Continuing ops only."),

    # ── FUFU Q1-Q3 2025 (press releases, foreign issuer) ──
    make_record("FUFU", 2025, "Q1", "Q1 2025", "2025-03-31", "2025-06-05",
                78.0, -16.8, -17.1, -10.8, 6.5, -0.10, 168.5,
                "Source: BitFuFu Q1 2025 press release. Post-halving impact."),
    make_record("FUFU", 2025, "Q2", "Q2 2025", "2025-06-30", "2025-08-15",
                115.4, 47.1, 53.1, 60.7, 12.9, 0.28, 168.6,
                "Source: BitFuFu Q2 2025 press release. Strong BTC fair value gains."),
    make_record("FUFU", 2025, "Q3", "Q3 2025", "2025-09-30", "2025-11-12",
                180.7, 11.6, 14.1, 22.1, 7.2, 0.07, 169.9,
                "Source: BitFuFu Q3 2025 press release. Record revenue."),
]


def _capped_yoy(curr, prev):
    if curr is None or prev is None or prev == 0:
        return None
    val = round((curr - prev) / abs(prev) * 100, 1)
    return max(-YOY_CAP, min(YOY_CAP, val))


def compute_yoy(records):
    from collections import defaultdict
    by_key = defaultdict(list)
    for r in records:
        by_key[(r["ticker"], r["fiscal_quarter"])].append(r)
    for key, recs in by_key.items():
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
    print("ADD 2025 FINANCIAL DATA")
    print("=" * 60)

    financials = load_json("data/financials.json")
    existing = set()
    for r in financials["data"]:
        existing.add((r["ticker"], r["fiscal_year"], r["fiscal_quarter"]))

    added = 0
    for r in NEW_RECORDS:
        key = (r["ticker"], r["fiscal_year"], r["fiscal_quarter"])
        if key not in existing:
            financials["data"].append(r)
            existing.add(key)
            added += 1
            print(f"  + {r['ticker']} {r['period_label']}")
        else:
            print(f"  = {r['ticker']} {r['period_label']} (already exists)")

    if added:
        q_order = {"Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4, "FY": 5}
        financials["data"].sort(key=lambda r: (r["ticker"], r["fiscal_year"],
                                                q_order.get(r["fiscal_quarter"], 0)))
        compute_yoy(financials["data"])
        save_json("data/financials.json", financials)
        print(f"\n  Added {added} records")
    else:
        print("\n  No new records needed")

    # Summary
    from collections import defaultdict
    by_ticker_2025 = defaultdict(list)
    all_tickers = set()
    for r in financials["data"]:
        all_tickers.add(r["ticker"])
        if r["fiscal_year"] == 2025:
            by_ticker_2025[r["ticker"]].append(r["fiscal_quarter"])

    print(f"\n  Total: {len(financials['data'])} records, {len(all_tickers)} tickers")
    print("\n  2025 coverage:")
    for t in sorted(all_tickers):
        qs = sorted(by_ticker_2025.get(t, []))
        has_fy = "FY" in qs
        status = "FY" if has_fy else f"{','.join(qs)}" if qs else "NONE"
        not_reported = ""
        if not has_fy and t not in ["BITF", "FUFU", "DGXX", "SAIH"]:
            not_reported = " (not yet reported)"
        elif t in ["BITF"]:
            not_reported = " (Q4 scheduled Mar 25)"
        elif t in ["FUFU"]:
            not_reported = " (Q4 ~Mar 2026)"
        elif t in ["DGXX", "SAIH"]:
            not_reported = " (small cap, TBD)"
        print(f"    {t:5s}: {status:20s}{not_reported}")


if __name__ == "__main__":
    main()
