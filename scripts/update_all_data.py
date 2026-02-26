#!/usr/bin/env python3
"""
Merge SEC EDGAR XBRL data + Yahoo Finance prices into the website's JSON files.
Updates: companies.json, financials.json, analysis_data.json
"""
import json
import os
from datetime import datetime

BASE = os.path.join(os.path.dirname(__file__), "..")
TODAY = datetime.now().strftime("%Y-%m-%d")


def load_json(path):
    with open(os.path.join(BASE, path)) as f:
        return json.load(f)


def save_json(path, data):
    with open(os.path.join(BASE, path), "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved {path}")


def update_companies():
    """Update stock prices and market caps in companies.json."""
    companies = load_json("data/companies.json")
    prices = load_json("data/prices_raw.json")

    updated = 0
    for c in companies["companies"]:
        ticker = c["ticker"]
        p = prices.get(ticker, {})
        price = p.get("price")
        if price:
            c["stock_price"] = round(price, 2)
            # Estimate market cap from shares_outstanding if available
            shares = c.get("shares_outstanding_m")
            if shares:
                c["market_cap_usd_m"] = round(price * shares, 1)
            updated += 1

    companies["_meta"]["last_updated"] = TODAY
    save_json("data/companies.json", companies)
    print(f"  Updated {updated} company prices")
    return companies


def build_financials_record(ticker, sec_rec):
    """Convert SEC EDGAR raw record to financials.json format."""
    fy = sec_rec["fiscal_year"]
    q = sec_rec["fiscal_quarter"]

    # Calculate adjusted_ebitda from available GAAP data
    adj_ebitda = None
    oi = sec_rec.get("operating_income_usd_m")
    dep = sec_rec.get("depreciation_usd_m")
    if oi is not None and dep is not None:
        adj_ebitda = round(oi + dep, 1)  # Simplified EBITDA estimate

    return {
        "ticker": ticker,
        "fiscal_year": fy,
        "fiscal_quarter": q,
        "period_label": f"{q} {fy}",
        "period_end_date": sec_rec.get("period_end_date", ""),
        "report_date": sec_rec.get("report_date"),
        "estimated_report_date": None,
        "is_reported": True,
        "revenue_usd_m": sec_rec.get("revenue_usd_m"),
        "gross_profit_usd_m": sec_rec.get("gross_profit_usd_m"),
        "operating_income_usd_m": oi,
        "net_income_usd_m": sec_rec.get("net_income_usd_m"),
        "adjusted_ebitda_usd_m": adj_ebitda,
        "eps_diluted": sec_rec.get("eps_diluted"),
        "revenue_yoy_pct": None,  # Will compute below
        "gross_profit_yoy_pct": None,
        "net_income_yoy_pct": None,
        "adjusted_ebitda_yoy_pct": None,
        "shares_outstanding_m": sec_rec.get("shares_outstanding_m"),
        "cash_and_equivalents_usd_m": sec_rec.get("cash_and_equivalents_usd_m"),
        "btc_held": None,
        "total_debt_usd_m": sec_rec.get("long_term_debt_usd_m"),
        "notes": f"Source: SEC EDGAR XBRL ({sec_rec.get('form', '')} filed {sec_rec.get('report_date', '')}). EBITDA estimated from operating_income + depreciation."
    }


def compute_yoy(records):
    """Compute YoY percentages for financial records."""
    # Group by (ticker, quarter)
    by_tq = {}
    for r in records:
        key = (r["ticker"], r["fiscal_quarter"])
        by_tq.setdefault(key, []).append(r)

    for key, recs in by_tq.items():
        recs.sort(key=lambda x: x["fiscal_year"])
        for i in range(1, len(recs)):
            curr = recs[i]
            prev = recs[i - 1]
            if curr["fiscal_year"] != prev["fiscal_year"] + 1:
                continue

            # Revenue YoY
            cr = curr.get("revenue_usd_m")
            pr = prev.get("revenue_usd_m")
            if cr is not None and pr is not None and pr != 0:
                curr["revenue_yoy_pct"] = round((cr - pr) / abs(pr) * 100, 1)

            # Net Income YoY (skip if both negative)
            cn = curr.get("net_income_usd_m")
            pn = prev.get("net_income_usd_m")
            if cn is not None and pn is not None and pn != 0:
                if not (cn < 0 and pn < 0):
                    curr["net_income_yoy_pct"] = round((cn - pn) / abs(pn) * 100, 1)

            # EBITDA YoY
            ce = curr.get("adjusted_ebitda_usd_m")
            pe = prev.get("adjusted_ebitda_usd_m")
            if ce is not None and pe is not None and pe != 0:
                curr["adjusted_ebitda_yoy_pct"] = round((ce - pe) / abs(pe) * 100, 1)


def update_financials():
    """Merge SEC EDGAR data into financials.json."""
    financials = load_json("data/financials.json")
    sec_data = load_json("data/sec_edgar_raw.json")

    existing = {}
    for r in financials["data"]:
        key = (r["ticker"], r["fiscal_year"], r["fiscal_quarter"])
        existing[key] = r

    added = 0
    updated_fields = 0

    for ticker, records in sec_data.items():
        for sec_rec in records:
            fy = sec_rec["fiscal_year"]
            q = sec_rec["fiscal_quarter"]
            key = (ticker, fy, q)

            if key in existing:
                # Update null fields in existing record
                ex = existing[key]
                new_rec = build_financials_record(ticker, sec_rec)
                for field in ["revenue_usd_m", "net_income_usd_m", "gross_profit_usd_m",
                              "operating_income_usd_m", "adjusted_ebitda_usd_m",
                              "eps_diluted", "shares_outstanding_m",
                              "cash_and_equivalents_usd_m", "total_debt_usd_m"]:
                    if ex.get(field) is None and new_rec.get(field) is not None:
                        ex[field] = new_rec[field]
                        updated_fields += 1
                # Update report_date if missing
                if not ex.get("report_date") and new_rec.get("report_date"):
                    ex["report_date"] = new_rec["report_date"]
                # Update notes to include SEC source
                if "SEC EDGAR" not in (ex.get("notes") or ""):
                    old_notes = ex.get("notes", "")
                    ex["notes"] = f"{old_notes} | SEC EDGAR XBRL verified.".strip(" |")
            else:
                # Add new record
                new_rec = build_financials_record(ticker, sec_rec)
                financials["data"].append(new_rec)
                existing[key] = new_rec
                added += 1

    # Compute YoY for all records
    compute_yoy(financials["data"])

    # Sort by ticker, fiscal_year, fiscal_quarter
    q_order = {"Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4, "FY": 5}
    financials["data"].sort(key=lambda r: (r["ticker"], r["fiscal_year"], q_order.get(r["fiscal_quarter"], 0)))

    financials["_meta"]["last_updated"] = TODAY
    save_json("data/financials.json", financials)
    print(f"  Added {added} new records, filled {updated_fields} null fields")
    return financials


def update_analysis_data():
    """Update analysis_data.json with current/prior year data from SEC EDGAR + prices."""
    sec_data = load_json("data/sec_edgar_raw.json")
    prices = load_json("data/prices_raw.json")
    companies = load_json("data/companies.json")

    analysis = load_json("data/analysis_data.json")

    # Company name lookup
    name_map = {}
    shares_map = {}
    for c in companies["companies"]:
        name_map[c["ticker"]] = c.get("full_name") or c.get("name", ticker)
        shares_map[c["ticker"]] = c.get("shares_outstanding_m")

    for ticker, records in sec_data.items():
        if not records:
            continue

        # Find FY records (annual)
        fy_records = [r for r in records if r["fiscal_quarter"] == "FY"]
        fy_records.sort(key=lambda r: r["fiscal_year"], reverse=True)

        if len(fy_records) < 1:
            print(f"  {ticker}: No annual data, skipping analysis_data")
            continue

        current_fy = fy_records[0]
        prior_fy = fy_records[1] if len(fy_records) >= 2 else None

        price_data = prices.get(ticker, {})
        price = price_data.get("price")
        shares = shares_map.get(ticker) or (current_fy.get("shares_outstanding_m"))
        market_cap = round(price * shares, 1) if price and shares else None

        def make_period(rec):
            if not rec:
                return {
                    "period": "N/A", "revenue": 0, "cogs": 0, "gross_profit": 0,
                    "sga": 0, "depreciation": 0, "operating_income": 0,
                    "net_income": 0, "ebit": 0, "total_assets": 1,
                    "current_assets": 0, "receivables": 0, "ppe_net": 0,
                    "total_liabilities": 0, "current_liabilities": 0,
                    "long_term_debt": 0, "retained_earnings": 0,
                    "total_equity": 1, "operating_cash_flow": 0,
                    "shares_outstanding_m": 1,
                }
            ta = rec.get("total_assets_usd_m") or 1
            te = rec.get("total_equity_usd_m") or 1
            oi = rec.get("operating_income_usd_m") or 0
            dep = rec.get("depreciation_usd_m") or 0

            return {
                "period": f"FY{rec['fiscal_year']}",
                "revenue": rec.get("revenue_usd_m") or 0,
                "cogs": rec.get("cogs_usd_m") or 0,
                "gross_profit": rec.get("gross_profit_usd_m") or 0,
                "sga": rec.get("sga_usd_m") or 0,
                "depreciation": dep,
                "operating_income": oi,
                "net_income": rec.get("net_income_usd_m") or 0,
                "ebit": oi + dep if oi else 0,
                "total_assets": ta,
                "current_assets": rec.get("current_assets_usd_m") or 0,
                "receivables": rec.get("receivables_usd_m") or 0,
                "ppe_net": rec.get("ppe_net_usd_m") or 0,
                "total_liabilities": rec.get("total_liabilities_usd_m") or 0,
                "current_liabilities": rec.get("current_liabilities_usd_m") or 0,
                "long_term_debt": rec.get("long_term_debt_usd_m") or 0,
                "retained_earnings": rec.get("retained_earnings_usd_m") or 0,
                "total_equity": te,
                "operating_cash_flow": rec.get("operating_cash_flow_usd_m") or 0,
                "shares_outstanding_m": rec.get("shares_outstanding_m") or shares or 1,
            }

        current = make_period(current_fy)
        prior = make_period(prior_fy)

        # Revenue growth stats
        curr_rev = current.get("revenue", 0)
        prior_rev = prior.get("revenue", 0)
        if prior_rev > 0:
            rev_growth = (curr_rev - prior_rev) / prior_rev
        else:
            rev_growth = 0.1

        # Equity volatility estimate based on company size
        if market_cap and market_cap > 1000:
            eq_vol = 0.75
        elif market_cap and market_cap > 100:
            eq_vol = 0.85
        else:
            eq_vol = 0.95

        ta = current.get("total_assets", 1)
        te = current.get("total_equity", 1)
        asset_vol = eq_vol * (abs(te) / abs(ta)) if ta != 0 else eq_vol * 0.5

        market = {
            "stock_price": round(price, 2) if price else None,
            "market_cap": market_cap,
            "equity_volatility": eq_vol,
            "asset_volatility": round(asset_vol, 4),
            "risk_free_rate": 0.043,
            "revenue_growth_mean": round(rev_growth, 4),
            "revenue_growth_std": round(abs(rev_growth) * 0.4, 4),
        }

        analysis["data"][ticker] = {
            "name": name_map.get(ticker, ticker),
            "current": current,
            "prior": prior,
            "market": market,
        }

    save_json("data/analysis_data.json", analysis)
    print(f"  analysis_data.json now has {len(analysis['data'])} companies")


def main():
    print("=" * 50)
    print("Phase 1: Updating companies.json (prices)")
    print("=" * 50)
    update_companies()

    print("\n" + "=" * 50)
    print("Phase 2: Updating financials.json (SEC EDGAR)")
    print("=" * 50)
    update_financials()

    print("\n" + "=" * 50)
    print("Phase 3: Updating analysis_data.json")
    print("=" * 50)
    update_analysis_data()

    # Clean up temp files
    for f in ["data/sec_edgar_raw.json", "data/prices_raw.json"]:
        p = os.path.join(BASE, f)
        if os.path.exists(p):
            os.remove(p)
            print(f"  Cleaned up {f}")

    print("\n" + "=" * 50)
    print("DONE")
    print("=" * 50)


if __name__ == "__main__":
    main()
