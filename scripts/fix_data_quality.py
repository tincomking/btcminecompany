#!/usr/bin/env python3
"""
One-time data quality fix script for btcmine.info.
Fixes:
  1. HIVE corrupted report_dates (float values → null)
  2. Fill missing report_dates from SEC EDGAR submissions API
  3. Compute missing EBITDA from operating_income + depreciation
  4. Compute missing EPS from net_income / shares_outstanding
  5. Fill missing shares_outstanding from SEC EDGAR XBRL
  6. Recompute all YoY with ±1000% cap
  7. Fix analysis_data.json placeholder balance sheet values
"""
import json
import os
import urllib.request
import time
import sys
from datetime import datetime

BASE = os.path.join(os.path.dirname(__file__), "..")
UA = "btcmine.info admin@btcmine.info"

CIK_MAP = {
    "MARA": "0001507605", "RIOT": "0001167419", "CLSK": "0000827876",
    "CORZ": "0001839341", "HUT": "0001964789", "WULF": "0001083301",
    "IREN": "0001878848", "CIFR": "0001819989", "BITF": "0001812477",
    "BTBT": "0001710350", "BTDR": "0001899123", "APLD": "0001144879",
    "FUFU": "0001921158", "HIVE": "0001720424", "GREE": "0001844971",
    "ABTC": "0001755953", "ANY": "0001591956", "SLNH": "0000064463",
    "GPUS": "0000896493", "DGXX": "0001854368", "MIGI": "0001218683",
    "SAIH": "0001847075",
}

# Balance sheet XBRL tags to try (us-gaap namespace)
BALANCE_SHEET_TAGS = {
    "total_assets": ["Assets"],
    "current_assets": ["AssetsCurrent"],
    "total_liabilities": ["Liabilities"],
    "current_liabilities": ["LiabilitiesCurrent"],
    "long_term_debt": ["LongTermDebt", "LongTermDebtNoncurrent"],
    "total_equity": ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
    "retained_earnings": ["RetainedEarningsAccumulatedDeficit"],
    "ppe_net": ["PropertyPlantAndEquipmentNet"],
    "receivables": ["AccountsReceivableNetCurrent", "ReceivablesNetCurrent"],
    "shares_outstanding": ["CommonStockSharesOutstanding", "EntityCommonStockSharesOutstanding"],
}

# IFRS tags for foreign issuers
IFRS_BALANCE_SHEET_TAGS = {
    "total_assets": ["Assets"],
    "current_assets": ["CurrentAssets"],
    "total_liabilities": ["Liabilities"],
    "current_liabilities": ["CurrentLiabilities"],
    "total_equity": ["Equity", "EquityAttributableToOwnersOfParent"],
    "long_term_debt": ["NoncurrentFinancialLiabilities"],
    "retained_earnings": ["RetainedEarnings"],
    "ppe_net": ["PropertyPlantAndEquipment"],
    "receivables": ["TradeAndOtherCurrentReceivables"],
    "shares_outstanding": ["NumberOfSharesIssued"],
}

SHARES_TAGS = [
    "CommonStockSharesOutstanding",
    "EntityCommonStockSharesOutstanding",
    "WeightedAverageNumberOfDilutedSharesOutstanding",
    "WeightedAverageNumberOfShareOutstandingBasicAndDiluted",
]


def load_json(path):
    with open(os.path.join(BASE, path)) as f:
        return json.load(f)


def save_json(path, data):
    with open(os.path.join(BASE, path), "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved {path}")


def fetch_sec_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read())
    except Exception as e:
        print(f"  ERROR fetching {url}: {e}", file=sys.stderr)
        return None


def extract_instant_values(facts, tags, namespace="us-gaap"):
    """Extract instant (balance sheet) values keyed by date."""
    values = {}
    ns_data = facts.get("facts", {}).get(namespace, {})
    for tag in tags:
        if tag not in ns_data:
            continue
        units = ns_data[tag].get("units", {})
        for unit_key in ["USD", "pure", "shares"]:
            if unit_key not in units:
                continue
            for entry in units[unit_key]:
                if "end" in entry and "start" not in entry:
                    # instant value
                    date = entry["end"]
                    val = entry.get("val")
                    if val is not None and date not in values:
                        values[date] = val
                elif "end" in entry:
                    date = entry["end"]
                    val = entry.get("val")
                    if val is not None and date not in values:
                        values[date] = val
        if values:
            break
    return values


def extract_shares_values(facts):
    """Extract shares outstanding values keyed by date."""
    values = {}
    ns_data = facts.get("facts", {}).get("us-gaap", {})
    dei_data = facts.get("facts", {}).get("dei", {})

    for tag in SHARES_TAGS:
        for ns in [ns_data, dei_data]:
            if tag not in ns:
                continue
            units = ns[tag].get("units", {})
            for unit_key in ["shares", "pure"]:
                if unit_key not in units:
                    continue
                for entry in units[unit_key]:
                    date = entry.get("end", entry.get("start", ""))
                    val = entry.get("val")
                    if val is not None and val > 0 and date:
                        if date not in values or val > values[date]:
                            values[date] = val
    return values


# ── PHASE 1: Fix corrupted report_dates ──────────────────────────────────────

def fix_corrupted_dates(financials):
    """Fix HIVE and any other records with numeric report_date values."""
    fixed = 0
    for r in financials["data"]:
        rd = r.get("report_date")
        if rd is not None and not isinstance(rd, str):
            print(f"  Fixed corrupted report_date for {r['ticker']} {r['fiscal_quarter']} {r['fiscal_year']}: {rd} → null")
            r["report_date"] = None
            fixed += 1
        elif isinstance(rd, str) and rd and not rd[0].isdigit():
            print(f"  Fixed corrupted report_date for {r['ticker']} {r['fiscal_quarter']} {r['fiscal_year']}: {rd} → null")
            r["report_date"] = None
            fixed += 1
    return fixed


# ── PHASE 2: Fill missing report_dates from SEC EDGAR submissions ────────────

def fill_report_dates(financials):
    """Fill null report_dates from SEC EDGAR submissions API."""
    tickers_needing_dates = set()
    for r in financials["data"]:
        if not r.get("report_date"):
            tickers_needing_dates.add(r["ticker"])

    if not tickers_needing_dates:
        print("  No missing report_dates to fill.")
        return 0

    filled = 0
    for ticker in sorted(tickers_needing_dates):
        cik = CIK_MAP.get(ticker)
        if not cik:
            continue
        print(f"  Fetching submissions for {ticker} (CIK {cik})...")
        data = fetch_sec_json(f"https://data.sec.gov/submissions/CIK{cik}.json")
        time.sleep(0.15)
        if not data:
            continue

        # Build a map of period_end → filing_date from recent filings
        filings = data.get("filings", {}).get("recent", {})
        forms = filings.get("form", [])
        dates = filings.get("filingDate", [])
        periods = filings.get("reportDate", [])

        period_to_filing = {}
        for i in range(len(forms)):
            if forms[i] in ("10-K", "10-Q", "20-F", "6-K", "10-K/A", "10-Q/A", "20-F/A"):
                if i < len(periods) and i < len(dates):
                    period_to_filing[periods[i]] = dates[i]

        for r in financials["data"]:
            if r["ticker"] != ticker or r.get("report_date"):
                continue
            ped = r.get("period_end_date", "")
            if ped in period_to_filing:
                r["report_date"] = period_to_filing[ped]
                print(f"    Filled {ticker} {r['fiscal_quarter']} {r['fiscal_year']}: {r['report_date']}")
                filled += 1

    return filled


# ── PHASE 3: Compute missing EBITDA and EPS ──────────────────────────────────

def compute_missing_ebitda_eps(financials):
    """Fill EBITDA from OI+depreciation, EPS from net_income/shares."""
    ebitda_filled = 0
    eps_filled = 0

    for r in financials["data"]:
        # EBITDA
        if r.get("adjusted_ebitda_usd_m") is None:
            oi = r.get("operating_income_usd_m")
            dep = r.get("depreciation_usd_m", 0) or 0
            if oi is not None:
                r["adjusted_ebitda_usd_m"] = round(oi + dep, 1)
                ebitda_filled += 1

        # EPS
        if r.get("eps_diluted") is None:
            ni = r.get("net_income_usd_m")
            shares = r.get("shares_outstanding_m")
            if ni is not None and shares and shares > 0:
                r["eps_diluted"] = round(ni / shares, 2)
                eps_filled += 1

    return ebitda_filled, eps_filled


# ── PHASE 4: Fill shares_outstanding from SEC EDGAR ──────────────────────────

def fill_shares_outstanding(financials):
    """Fetch shares outstanding from SEC EDGAR XBRL for records missing it."""
    tickers_needing_shares = set()
    for r in financials["data"]:
        if not r.get("shares_outstanding_m"):
            tickers_needing_shares.add(r["ticker"])

    filled = 0
    for ticker in sorted(tickers_needing_shares):
        cik = CIK_MAP.get(ticker)
        if not cik:
            continue

        print(f"  Fetching shares data for {ticker}...")
        facts = fetch_sec_json(f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json")
        time.sleep(0.15)
        if not facts:
            continue

        shares_by_date = extract_shares_values(facts)
        if not shares_by_date:
            print(f"    No shares data found for {ticker}")
            continue

        for r in financials["data"]:
            if r["ticker"] != ticker or r.get("shares_outstanding_m"):
                continue
            ped = r.get("period_end_date", "")
            # Try exact match first, then closest prior date
            shares = shares_by_date.get(ped)
            if not shares:
                # Find closest date within 90 days
                sorted_dates = sorted(shares_by_date.keys(), reverse=True)
                for d in sorted_dates:
                    if d <= ped:
                        shares = shares_by_date[d]
                        break
            if shares:
                r["shares_outstanding_m"] = round(shares / 1_000_000, 2)
                filled += 1

    return filled


# ── PHASE 5: Recompute YoY with cap ─────────────────────────────────────────

def compute_yoy_capped(records, cap=1000.0):
    """Compute YoY percentages capped at ±cap%."""
    # Clear existing YoY first
    for r in records:
        r["revenue_yoy_pct"] = None
        r["gross_profit_yoy_pct"] = None
        r["net_income_yoy_pct"] = None
        r["adjusted_ebitda_yoy_pct"] = None

    by_tq = {}
    for r in records:
        key = (r["ticker"], r["fiscal_quarter"])
        by_tq.setdefault(key, []).append(r)

    computed = 0
    capped = 0

    for key, recs in by_tq.items():
        recs.sort(key=lambda x: x["fiscal_year"])
        for i in range(1, len(recs)):
            curr = recs[i]
            prev = recs[i - 1]
            if curr["fiscal_year"] != prev["fiscal_year"] + 1:
                continue

            for field, yoy_field in [
                ("revenue_usd_m", "revenue_yoy_pct"),
                ("gross_profit_usd_m", "gross_profit_yoy_pct"),
                ("net_income_usd_m", "net_income_yoy_pct"),
                ("adjusted_ebitda_usd_m", "adjusted_ebitda_yoy_pct"),
            ]:
                cv = curr.get(field)
                pv = prev.get(field)
                if cv is not None and pv is not None and pv != 0:
                    # Skip if both negative for net income
                    if field in ("net_income_usd_m",) and cv < 0 and pv < 0:
                        continue
                    val = round((cv - pv) / abs(pv) * 100, 1)
                    if abs(val) > cap:
                        val = cap if val > 0 else -cap
                        capped += 1
                    curr[yoy_field] = val
                    computed += 1

    return computed, capped


# ── PHASE 6: Fix analysis_data.json balance sheet placeholders ───────────────

def fix_analysis_data(analysis):
    """Re-fetch balance sheet data from SEC EDGAR for analysis_data.json entries with placeholder values."""
    fixed_companies = 0

    for ticker, entry in analysis["data"].items():
        cik = CIK_MAP.get(ticker)
        if not cik:
            continue

        # Check if this entry has placeholder values
        current = entry.get("current", {})
        has_placeholder = (
            current.get("total_assets") in (0, 1) or
            current.get("total_equity") in (0, 1) or
            (current.get("current_assets") == 0 and current.get("total_assets") in (0, 1))
        )
        if not has_placeholder:
            continue

        print(f"  Fetching balance sheet for {ticker}...")
        facts = fetch_sec_json(f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json")
        time.sleep(0.15)
        if not facts:
            continue

        # Try both us-gaap and ifrs-full namespaces
        for period_key in ["current", "prior"]:
            period = entry[period_key]
            period_name = period.get("period", "")
            if not period_name or period_name == "N/A":
                continue

            # Extract year from period name like "FY2024"
            try:
                fy = int(period_name.replace("FY", ""))
            except (ValueError, AttributeError):
                continue

            # Find the best matching period_end_date
            # For December FY companies: YYYY-12-31
            # Look for balance sheet values near fiscal year end
            for namespace, tags_map in [("us-gaap", BALANCE_SHEET_TAGS), ("ifrs-full", IFRS_BALANCE_SHEET_TAGS)]:
                for field, tags in tags_map.items():
                    if field == "shares_outstanding":
                        continue
                    current_val = period.get(field, 0)
                    if current_val not in (0, 1):
                        continue

                    values = extract_instant_values(facts, tags, namespace)
                    if not values:
                        continue

                    # Find value closest to fiscal year end
                    best_date = None
                    best_val = None
                    for date, val in sorted(values.items(), reverse=True):
                        year = int(date[:4])
                        if year == fy or year == fy - 1:
                            best_date = date
                            best_val = val
                            break

                    if best_val is not None:
                        # Convert to millions
                        val_m = round(best_val / 1_000_000, 1)
                        if abs(val_m) > 0.01:
                            period[field] = val_m

            # Recalculate ebit
            oi = period.get("operating_income", 0)
            dep = period.get("depreciation", 0)
            if oi:
                period["ebit"] = oi + dep

        # Update shares_outstanding_m from SEC data
        shares_values = extract_shares_values(facts)
        if shares_values:
            latest_shares = max(shares_values.values())
            if latest_shares > 0:
                entry["current"]["shares_outstanding_m"] = round(latest_shares / 1_000_000, 2)
                if entry["prior"].get("shares_outstanding_m") in (0, 1):
                    entry["prior"]["shares_outstanding_m"] = round(latest_shares / 1_000_000, 2)

        # Recalculate market data
        market = entry.get("market", {})
        price = market.get("stock_price")
        shares_m = entry["current"].get("shares_outstanding_m")
        if price and shares_m and shares_m > 1:
            market["market_cap"] = round(price * shares_m, 1)

        ta = entry["current"].get("total_assets", 1)
        te = entry["current"].get("total_equity", 1)
        if ta > 1 or te > 1:
            fixed_companies += 1

    return fixed_companies


def main():
    print("=" * 60)
    print("DATA QUALITY FIX SCRIPT")
    print("=" * 60)

    financials = load_json("data/financials.json")
    analysis = load_json("data/analysis_data.json")

    # Phase 1: Fix corrupted dates
    print("\n── Phase 1: Fix corrupted report_dates ──")
    n = fix_corrupted_dates(financials)
    print(f"  Fixed {n} corrupted dates")

    # Phase 2: Fill missing report_dates
    print("\n── Phase 2: Fill missing report_dates from SEC ──")
    n = fill_report_dates(financials)
    print(f"  Filled {n} report_dates")

    # Phase 4: Fill shares outstanding (before EPS calc)
    print("\n── Phase 3: Fill shares_outstanding from SEC ──")
    n = fill_shares_outstanding(financials)
    print(f"  Filled {n} shares_outstanding values")

    # Phase 3: Compute missing EBITDA and EPS
    print("\n── Phase 4: Compute missing EBITDA and EPS ──")
    ebitda_n, eps_n = compute_missing_ebitda_eps(financials)
    print(f"  Filled {ebitda_n} EBITDA, {eps_n} EPS values")

    # Phase 5: Recompute YoY
    print("\n── Phase 5: Recompute all YoY (capped at ±1000%) ──")
    computed, capped = compute_yoy_capped(financials["data"])
    print(f"  Computed {computed} YoY values, capped {capped} extreme outliers")

    # Save financials
    financials["_meta"]["last_updated"] = datetime.now().strftime("%Y-%m-%d")
    save_json("data/financials.json", financials)

    # Phase 6: Fix analysis_data.json
    print("\n── Phase 6: Fix analysis_data.json placeholders ──")
    n = fix_analysis_data(analysis)
    print(f"  Fixed balance sheet for {n} companies")
    save_json("data/analysis_data.json", analysis)

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    total = len(financials["data"])
    null_ebitda = sum(1 for r in financials["data"] if r.get("adjusted_ebitda_usd_m") is None)
    null_eps = sum(1 for r in financials["data"] if r.get("eps_diluted") is None)
    null_rd = sum(1 for r in financials["data"] if not r.get("report_date"))
    null_shares = sum(1 for r in financials["data"] if not r.get("shares_outstanding_m"))
    null_yoy = sum(1 for r in financials["data"] if r.get("revenue_yoy_pct") is None)
    print(f"  Total records: {total}")
    print(f"  Null EBITDA: {null_ebitda} ({null_ebitda*100//total}%)")
    print(f"  Null EPS: {null_eps} ({null_eps*100//total}%)")
    print(f"  Null report_date: {null_rd} ({null_rd*100//total}%)")
    print(f"  Null shares_outstanding: {null_shares} ({null_shares*100//total}%)")
    print(f"  Null revenue_yoy: {null_yoy} ({null_yoy*100//total}%)")
    print("\nDONE")


if __name__ == "__main__":
    main()
