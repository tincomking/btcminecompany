#!/usr/bin/env python3
"""
Fetch financial data from SEC EDGAR XBRL CompanyFacts API.
No API key required. Just needs User-Agent header.
"""
import json
import urllib.request
import time
import sys
import os

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

# Fiscal year end months (non-December companies)
FY_END = {
    "CLSK": 9, "IREN": 6, "APLD": 5, "HIVE": 3, "MIGI": 6, "SAIH": 6,
}

# Common XBRL tags for revenue
REVENUE_TAGS = [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
    "SalesRevenueNet",
    "TotalRevenuesAndOtherIncome",
]

NET_INCOME_TAGS = [
    "NetIncomeLoss",
    "NetIncomeLossAvailableToCommonStockholdersBasic",
    "ProfitLoss",
]

EBITDA_TAGS = [
    # Non-GAAP EBITDA sometimes reported in XBRL
    "EarningsBeforeInterestTaxesDepreciationAndAmortization",
]

FIELDS_MAP = {
    "gross_profit": ["GrossProfit"],
    "operating_income": ["OperatingIncomeLoss"],
    "total_assets": ["Assets"],
    "current_assets": ["AssetsCurrent"],
    "total_liabilities": ["Liabilities"],
    "current_liabilities": ["LiabilitiesCurrent"],
    "long_term_debt": ["LongTermDebt", "LongTermDebtNoncurrent"],
    "total_equity": ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
    "retained_earnings": ["RetainedEarningsAccumulatedDeficit"],
    "cash_and_equivalents": ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsAndShortTermInvestments"],
    "ppe_net": ["PropertyPlantAndEquipmentNet"],
    "operating_cash_flow": ["NetCashProvidedByUsedInOperatingActivities"],
    "depreciation": ["DepreciationDepletionAndAmortization", "DepreciationAndAmortization"],
    "shares_outstanding": ["CommonStockSharesOutstanding", "EntityCommonStockSharesOutstanding", "WeightedAverageNumberOfDilutedSharesOutstanding"],
    "eps_diluted": ["EarningsPerShareDiluted"],
    "receivables": ["AccountsReceivableNetCurrent", "ReceivablesNetCurrent"],
    "sga": ["SellingGeneralAndAdministrativeExpense", "GeneralAndAdministrativeExpense"],
    "cogs": ["CostOfRevenue", "CostOfGoodsAndServicesSold"],
}


def fetch_company_facts(cik):
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read())
    except Exception as e:
        print(f"  ERROR fetching CIK {cik}: {e}", file=sys.stderr)
        return None


def extract_metric(facts, tags, unit="USD", duration=True):
    """Extract financial metric from XBRL facts.
    Returns list of (start, end, val, form, filed, fp) tuples.
    """
    us_gaap = facts.get("facts", {}).get("us-gaap", {})
    ifrs = facts.get("facts", {}).get("ifrs-full", {})

    results = []
    for tag in tags:
        fact = us_gaap.get(tag) or ifrs.get(tag)
        if not fact:
            continue
        units = fact.get("units", {})
        entries = units.get(unit, [])
        if not entries and unit == "USD":
            # Try shares for share count
            entries = units.get("shares", [])
        if not entries:
            entries = units.get("pure", [])  # For EPS

        for e in entries:
            start = e.get("start", "")
            end = e.get("end", "")
            val = e.get("val")
            form = e.get("form", "")
            filed = e.get("filed", "")
            fp = e.get("fp", "")
            fy = e.get("fy")

            if val is None:
                continue

            # Filter: only 10-K, 10-Q, 20-F, 6-K
            if form not in ("10-K", "10-Q", "20-F", "6-K", "10-K/A", "10-Q/A", "20-F/A"):
                continue

            results.append({
                "start": start, "end": end, "val": val,
                "form": form, "filed": filed, "fp": fp, "fy": fy,
                "tag": tag,
            })

        if results:
            break  # Use first matching tag

    return results


def classify_period(start, end, fy_end_month=12):
    """Classify a reporting period as Q1/Q2/Q3/Q4/FY based on dates."""
    if not start or not end:
        return None, None, None

    from datetime import datetime
    try:
        s = datetime.strptime(start, "%Y-%m-%d")
        e = datetime.strptime(end, "%Y-%m-%d")
    except:
        return None, None, None

    days = (e - s).days

    if days > 300:  # Annual
        return e.year, "FY", end
    elif 75 <= days <= 105:  # Quarterly (~90 days)
        # Determine quarter based on fiscal year end
        month = e.month
        if fy_end_month == 12:
            q_map = {3: "Q1", 6: "Q2", 9: "Q3", 12: "Q4"}
        elif fy_end_month == 9:  # CLSK
            q_map = {12: "Q1", 3: "Q2", 6: "Q3", 9: "Q4"}
        elif fy_end_month == 6:  # IREN, MIGI, SAIH
            q_map = {9: "Q1", 12: "Q2", 3: "Q3", 6: "Q4"}
        elif fy_end_month == 5:  # APLD
            q_map = {8: "Q1", 11: "Q2", 2: "Q3", 5: "Q4"}
        elif fy_end_month == 3:  # HIVE
            q_map = {6: "Q1", 9: "Q2", 12: "Q3", 3: "Q4"}
        else:
            q_map = {3: "Q1", 6: "Q2", 9: "Q3", 12: "Q4"}

        quarter = q_map.get(month)
        if not quarter:
            # Approximate
            for m, q in q_map.items():
                if abs(month - m) <= 1 or abs(month - m) >= 11:
                    quarter = q
                    break
        if not quarter:
            quarter = f"Q?"

        # Fiscal year
        if fy_end_month == 12:
            fy = e.year
        else:
            fy = e.year if month <= fy_end_month else e.year + 1

        return fy, quarter, end

    return None, None, None


def to_millions(val):
    """Convert raw value (usually in USD) to millions."""
    if val is None:
        return None
    return round(val / 1_000_000, 1)


def fetch_all_financials(ticker):
    """Fetch all available financial data for a ticker from SEC EDGAR XBRL."""
    cik = CIK_MAP.get(ticker)
    if not cik:
        print(f"  {ticker}: No CIK found")
        return []

    facts = fetch_company_facts(cik)
    if not facts:
        return []

    fy_end = FY_END.get(ticker, 12)

    # Extract all metrics
    revenue_data = extract_metric(facts, REVENUE_TAGS)
    net_income_data = extract_metric(facts, NET_INCOME_TAGS)
    gross_profit_data = extract_metric(facts, FIELDS_MAP["gross_profit"])
    op_income_data = extract_metric(facts, FIELDS_MAP["operating_income"])
    total_assets_data = extract_metric(facts, FIELDS_MAP["total_assets"])
    current_assets_data = extract_metric(facts, FIELDS_MAP["current_assets"])
    total_liab_data = extract_metric(facts, FIELDS_MAP["total_liabilities"])
    current_liab_data = extract_metric(facts, FIELDS_MAP["current_liabilities"])
    lt_debt_data = extract_metric(facts, FIELDS_MAP["long_term_debt"])
    equity_data = extract_metric(facts, FIELDS_MAP["total_equity"])
    retained_data = extract_metric(facts, FIELDS_MAP["retained_earnings"])
    cash_data = extract_metric(facts, FIELDS_MAP["cash_and_equivalents"])
    ppe_data = extract_metric(facts, FIELDS_MAP["ppe_net"])
    ocf_data = extract_metric(facts, FIELDS_MAP["operating_cash_flow"])
    dep_data = extract_metric(facts, FIELDS_MAP["depreciation"])
    shares_data = extract_metric(facts, FIELDS_MAP["shares_outstanding"], unit="shares")
    eps_data = extract_metric(facts, FIELDS_MAP["eps_diluted"], unit="USD/shares")
    recv_data = extract_metric(facts, FIELDS_MAP["receivables"])
    sga_data = extract_metric(facts, FIELDS_MAP["sga"])
    cogs_data = extract_metric(facts, FIELDS_MAP["cogs"])

    # Build lookup by (end_date, period_type)
    def build_lookup(data_list):
        lookup = {}
        for d in data_list:
            fy, q, end = classify_period(d["start"], d["end"], fy_end)
            if fy and q:
                key = (fy, q)
                # Prefer more recent filings
                if key not in lookup or d["filed"] > lookup[key]["filed"]:
                    lookup[key] = d
        return lookup

    rev_lookup = build_lookup(revenue_data)
    ni_lookup = build_lookup(net_income_data)
    gp_lookup = build_lookup(gross_profit_data)
    oi_lookup = build_lookup(op_income_data)
    ta_lookup = build_lookup(total_assets_data)
    ca_lookup = build_lookup(current_assets_data)
    tl_lookup = build_lookup(total_liab_data)
    cl_lookup = build_lookup(current_liab_data)
    ltd_lookup = build_lookup(lt_debt_data)
    eq_lookup = build_lookup(equity_data)
    re_lookup = build_lookup(retained_data)
    cash_lookup = build_lookup(cash_data)
    ppe_lookup = build_lookup(ppe_data)
    ocf_lookup = build_lookup(ocf_data)
    dep_lookup = build_lookup(dep_data)
    shares_lookup = build_lookup(shares_data)
    eps_lookup = build_lookup(eps_data)
    recv_lookup = build_lookup(recv_data)
    sga_lookup = build_lookup(sga_data)
    cogs_lookup = build_lookup(cogs_data)

    # Combine all periods
    all_periods = set()
    for lookup in [rev_lookup, ni_lookup]:
        all_periods.update(lookup.keys())

    records = []
    for (fy, q) in sorted(all_periods):
        if fy < 2020:
            continue  # 5+ years of data

        rev = rev_lookup.get((fy, q))
        ni = ni_lookup.get((fy, q))
        gp = gp_lookup.get((fy, q))
        oi = oi_lookup.get((fy, q))
        ta = ta_lookup.get((fy, q))
        ca = ca_lookup.get((fy, q))
        tl = tl_lookup.get((fy, q))
        cl = cl_lookup.get((fy, q))
        ltd = ltd_lookup.get((fy, q))
        eq = eq_lookup.get((fy, q))
        re = re_lookup.get((fy, q))
        cash = cash_lookup.get((fy, q))
        ppe = ppe_lookup.get((fy, q))
        ocf = ocf_lookup.get((fy, q))
        dep = dep_lookup.get((fy, q))
        shares = shares_lookup.get((fy, q))
        eps = eps_lookup.get((fy, q))
        recv = recv_lookup.get((fy, q))
        sga = sga_lookup.get((fy, q))
        cogs = cogs_lookup.get((fy, q))

        end_date = (rev or ni or {}).get("end", "")
        filed = (rev or ni or {}).get("filed", "")
        form = (rev or ni or {}).get("form", "")

        record = {
            "ticker": ticker,
            "fiscal_year": fy,
            "fiscal_quarter": q,
            "period_label": f"{q} {fy}",
            "period_end_date": end_date,
            "report_date": filed,
            "is_reported": True,
            "form": form,
            "revenue_usd_m": to_millions(rev["val"]) if rev else None,
            "net_income_usd_m": to_millions(ni["val"]) if ni else None,
            "gross_profit_usd_m": to_millions(gp["val"]) if gp else None,
            "operating_income_usd_m": to_millions(oi["val"]) if oi else None,
            "total_assets_usd_m": to_millions(ta["val"]) if ta else None,
            "current_assets_usd_m": to_millions(ca["val"]) if ca else None,
            "total_liabilities_usd_m": to_millions(tl["val"]) if tl else None,
            "current_liabilities_usd_m": to_millions(cl["val"]) if cl else None,
            "long_term_debt_usd_m": to_millions(ltd["val"]) if ltd else None,
            "total_equity_usd_m": to_millions(eq["val"]) if eq else None,
            "retained_earnings_usd_m": to_millions(re["val"]) if re else None,
            "cash_and_equivalents_usd_m": to_millions(cash["val"]) if cash else None,
            "ppe_net_usd_m": to_millions(ppe["val"]) if ppe else None,
            "operating_cash_flow_usd_m": to_millions(ocf["val"]) if ocf else None,
            "depreciation_usd_m": to_millions(dep["val"]) if dep else None,
            "shares_outstanding_m": round(shares["val"] / 1_000_000, 1) if shares else None,
            "eps_diluted": round(eps["val"], 2) if eps else None,
            "receivables_usd_m": to_millions(recv["val"]) if recv else None,
            "sga_usd_m": to_millions(sga["val"]) if sga else None,
            "cogs_usd_m": to_millions(cogs["val"]) if cogs else None,
        }

        records.append(record)

    print(f"  {ticker}: {len(records)} periods from SEC EDGAR XBRL")
    return records


def main():
    tickers = list(CIK_MAP.keys())
    all_data = {}

    for i, ticker in enumerate(tickers):
        print(f"[{i+1}/{len(tickers)}] Fetching {ticker}...")
        records = fetch_all_financials(ticker)
        all_data[ticker] = records
        time.sleep(0.15)  # SEC rate limit: 10 req/sec

    # Save raw output
    out_path = os.path.join(os.path.dirname(__file__), "..", "data", "sec_edgar_raw.json")
    with open(out_path, "w") as f:
        json.dump(all_data, f, indent=2)

    # Print summary
    total = sum(len(v) for v in all_data.values())
    print(f"\nTotal: {total} records for {len(all_data)} companies")
    print(f"Saved to {out_path}")

    # Print per-company summary
    for t in tickers:
        recs = all_data[t]
        if recs:
            periods = [f"{r['fiscal_quarter']}{r['fiscal_year']}" for r in recs]
            print(f"  {t}: {', '.join(periods)}")
        else:
            print(f"  {t}: NO DATA")


if __name__ == "__main__":
    main()
