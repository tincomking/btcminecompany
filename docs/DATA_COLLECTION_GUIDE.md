# btcmine.info Data Collection Guide

> For automated agents (OpenClaw cron jobs) and manual data maintenance.
> Repository: `tincomking/btcminecompany` | Site: https://btcmine.info
> Last updated: 2026-02-27

---

## Architecture Overview

btcmine.info is a **static GitHub Pages** site. Data flow:

```
Data Collection (Python scripts / Agent)
    ↓
Modify data/*.json files locally
    ↓
git add + git commit + git push origin main
    ↓
GitHub Pages auto-deploys (usually < 2 minutes)
    ↓
Website fetches data/*.json via browser fetch(), renders client-side
```

**No server-side processing is needed.** The website reads JSON files directly and renders everything in the browser. After pushing updated JSON data, the site automatically reflects changes.

---

## Repository Structure

```
btcminecompany/
├── data/                      # All data files (JSON)
│   ├── companies.json         # Master company list, stock prices, market caps
│   ├── financials.json        # Quarterly & annual financial results
│   ├── operational.json       # Monthly mining production reports
│   ├── sentiment.json         # Analyst ratings & social sentiment
│   ├── news.json              # Industry news articles
│   ├── analysis_data.json     # Balance sheet data for financial models
│   ├── btc_price_predictions.json  # BTC price forecasts from institutions
│   └── schema.json            # Data format specification
├── scripts/                   # Python data collection/processing scripts
│   ├── fetch_sec_data.py      # Fetch financials from SEC EDGAR XBRL
│   ├── fetch_prices.py        # Fetch stock prices from Yahoo Finance
│   ├── update_all_data.py     # Merge raw data into website JSON
│   ├── fix_data_quality.py    # One-time data quality fixes
│   └── add_*.py               # One-time data addition scripts
├── js/
│   ├── data.js                # Client-side data loader (fetch JSON)
│   ├── app.js                 # Main application logic & rendering
│   └── i18n.js                # Bilingual translations (zh/en)
└── index.html                 # Single-page app
```

---

## Data Files Reference

### 1. `companies.json` — Company Master Data

**What it stores:** Basic info for all 22 tracked Bitcoin mining companies — ticker, name, exchange, website, stock price, market cap.

**Update frequency:** Weekly (stock prices), or immediately when a company lists/delists.

**How to collect stock prices:**
```bash
cd /Users/leogrossman/btcminecompany
python3 scripts/fetch_prices.py
python3 scripts/update_all_data.py
```

**Source:** Yahoo Finance v8 API (`query2.finance.yahoo.com/v8/finance/chart/{ticker}`)
- No API key required
- Rate limit: ~2000 requests/hour
- Returns: current price, previous close, currency, exchange

**Manual update (if API fails):** Edit `companies.json` directly:
```json
{
  "ticker": "FUFU",
  "stock_price": 4.25,
  "market_cap_usd_m": 718.5
}
```

**Tracked companies (22):**
| Ticker | Company | Exchange | FY End |
|--------|---------|----------|--------|
| MARA | Marathon Digital | NASDAQ | Dec |
| RIOT | Riot Platforms | NASDAQ | Dec |
| CLSK | CleanSpark | NASDAQ | Sep |
| CORZ | Core Scientific | NASDAQ | Dec |
| HUT | Hut 8 Mining | NASDAQ | Dec |
| WULF | TeraWulf | NASDAQ | Dec |
| IREN | Iris Energy | NASDAQ | Jun |
| CIFR | Cipher Mining | NASDAQ | Dec |
| BITF | Bitfarms | NASDAQ | Dec |
| BTBT | Bit Digital | NASDAQ | Dec |
| BTDR | Bitdeer Technologies | NASDAQ | Dec |
| APLD | Applied Digital | NASDAQ | May |
| FUFU | BitFuFu | NASDAQ | Dec |
| HIVE | HIVE Digital | NASDAQ | Mar |
| GREE | Greenidge Generation | NASDAQ | Dec |
| ABTC | American Bitcoin | NASDAQ | Dec |
| ANY | Sphere 3D | NASDAQ | Dec |
| SLNH | Soluna Holdings | NASDAQ | Dec |
| GPUS | Nano Labs | NASDAQ | Dec |
| DGXX | DigiX Technology | NASDAQ | Dec |
| MIGI | Mawson Infrastructure | NASDAQ | Jun |
| SAIH | SAI.TECH | NASDAQ | Dec |

---

### 2. `financials.json` — Financial Results

**What it stores:** Revenue, net income, EBITDA, EPS, BTC held, total debt, etc. for each fiscal quarter and annual period.

**Update frequency:** Within 24 hours of each earnings release. Earnings season: mid-Feb to mid-Mar (Q4/FY), May (Q1), Aug (Q2), Nov (Q3).

**How to collect (automated):**
```bash
# Step 1: Fetch from SEC EDGAR XBRL
python3 scripts/fetch_sec_data.py
# Output: data/raw_reports/{ticker}_xbrl.json

# Step 2: Merge into financials.json
python3 scripts/update_all_data.py
```

**Source:** SEC EDGAR XBRL CompanyFacts API
- URL: `https://data.sec.gov/api/xbrl/companyfacts/CIK{CIK}.json`
- User-Agent header required: `btcmine.info admin@btcmine.info`
- No API key needed
- Rate limit: 10 requests/second
- CIK mapping in `scripts/fetch_sec_data.py` (line 14-23)

**Limitations of XBRL:**
- Foreign private issuers (BITF, HIVE, IREN, HUT, FUFU, SAIH) file 20-F/40-F with limited or no XBRL
- Some fields (EBITDA, EPS) may not be in XBRL → must be manually added from press releases
- Report dates from XBRL may reflect amended filings rather than original dates

**How to collect (manual, for foreign issuers or missing data):**

1. Find the earnings press release on GlobeNewsWire, PR Newswire, or company IR page
2. Extract: revenue, net income, EBITDA, EPS, shares outstanding, BTC held, total debt
3. Add record to `financials.json`:

```json
{
  "ticker": "FUFU",
  "fiscal_year": 2025,
  "fiscal_quarter": "Q4",
  "period_label": "Q4 2025",
  "period_end_date": "2025-12-31",
  "report_date": "2026-03-15",
  "estimated_report_date": null,
  "is_reported": true,
  "revenue_usd_m": 120.5,
  "gross_profit_usd_m": 45.2,
  "operating_income_usd_m": 30.1,
  "net_income_usd_m": 25.3,
  "adjusted_ebitda_usd_m": 50.0,
  "eps_diluted": 0.15,
  "revenue_yoy_pct": null,
  "gross_profit_yoy_pct": null,
  "net_income_yoy_pct": null,
  "adjusted_ebitda_yoy_pct": null,
  "shares_outstanding_m": 170.0,
  "cash_and_equivalents_usd_m": 200.0,
  "btc_held": 2000,
  "total_debt_usd_m": 150.0,
  "notes": "Source: BitFuFu Q4 2025 press release"
}
```

**YoY computation:** After adding records, YoY percentages are computed automatically by `scripts/update_all_data.py` → `compute_yoy()`. Or manually: `yoy = (current - prior) / abs(prior) * 100`, capped at ±1000%.

**Upcoming (not yet reported) records:**
Add with `"is_reported": false` and `"estimated_report_date": "YYYY-MM-DD"` to show on the earnings calendar.

---

### 3. `operational.json` — Monthly Mining Operations

**What it stores:** Monthly BTC mined, BTC held, hashrate, power capacity for each company.

**Update frequency:** Monthly, within 1-2 days of each company's production report (typically 3rd-8th of each month for previous month's data).

**How to collect:**

Most companies publish monthly production updates as press releases. Search for:
- `"{company name} monthly production update"` on GlobeNewsWire / PR Newswire
- Company IR page → Press Releases
- SEC 8-K filings (some companies)

**Companies with monthly reports (as of Feb 2026):**
| Ticker | Report Day | Source |
|--------|-----------|--------|
| MARA | ~3rd of month | ir.mara.com → discontinued Oct 2025, now quarterly |
| RIOT | ~4th of month | riotplatforms.com → discontinued Dec 2025, now quarterly |
| CLSK | ~4th of month | investors.cleanspark.com (still monthly) |
| HIVE | ~5th of month | hivedigitaltechnologies.com (still monthly) |
| IREN | ~5th of month | irisenergy.gcs-web.com → discontinued Aug 2025, now quarterly |
| BITF | ~1st of month | investor.bitfarms.com → discontinued Apr 2025, now quarterly |
| FUFU | ~6th of month | GlobeNewsWire "BitFuFu monthly" (still monthly) |
| HUT | ~4th of month | globenewswire.com → discontinued Mar 2025, now quarterly |
| BTBT | ~5th of month | GlobeNewsWire (still monthly) |
| BTDR | ~5th of month | GlobeNewsWire (still monthly) |
| CIFR | ~5th of month | ir.ciphermining.com (still monthly) |
| WULF | ~5th of month | investors.terawulf.com (still monthly) |

**Record format:**
```json
{
  "ticker": "FUFU",
  "period": "2026-01",
  "period_label": "Jan 2026",
  "report_date": "2026-02-05",
  "btc_mined": 46,
  "btc_held": 1796,
  "btc_sold": null,
  "hash_rate_eh": 3.7,
  "installed_capacity_eh": null,
  "power_capacity_mw": 520,
  "fleet_efficiency_j_th": null,
  "uptime_pct": null,
  "avg_power_cost_cents_kwh": null,
  "source_url": "https://www.globenewswire.com/...",
  "notes": "Self-mining: 46 BTC. Power capacity 520 MW."
}
```

**Key fields to extract from press releases:**
- `btc_mined`: Self-mining production (NOT cloud mining customers)
- `btc_held`: Total BTC held (including pledged/restricted)
- `hash_rate_eh`: Self-owned operational hashrate in EH/s (NOT total managed)
- `power_capacity_mw`: Total power capacity in MW
- `source_url`: URL of the press release

---

### 4. `sentiment.json` — Analyst Ratings & Social Sentiment

**What it stores:** Analyst ratings (buy/hold/sell with target prices), social media sentiment scores.

**Update frequency:** Monthly or when new analyst reports are published.

**How to collect analyst ratings:**
1. Search for `"$TICKER price target"` on Benzinga, TipRanks, MarketBeat
2. Check SEC 13F filings for institutional coverage
3. Extract: analyst firm, rating (Buy/Hold/Sell), target price, date, note

**Record format (analyst_ratings):**
```json
{
  "ticker": "FUFU",
  "firm": "Benchmark",
  "analyst": "Mark Palmer",
  "rating": "Buy",
  "rating_normalized": "buy",
  "target_price_usd": 8.00,
  "date": "2025-08-20",
  "note": "Initiated coverage with Buy rating...",
  "source_url": "https://..."
}
```

**Social sentiment:** Currently minimal data. Can be enhanced with Twitter/X API or sentiment analysis tools.

---

### 5. `news.json` — Industry News

**What it stores:** Recent Bitcoin mining industry news articles with sentiment classification.

**Update frequency:** Weekly.

**How to collect:**
1. Search Google News for "bitcoin mining" + company names
2. Check company IR pages for press releases
3. Monitor CoinDesk, The Block, Bitcoin Magazine mining sections

**Record format:**
```json
{
  "title": "Marathon Digital Reports Q4 2025 Results",
  "source": "Business Wire",
  "url": "https://...",
  "date": "2026-02-26",
  "summary": "Revenue up 45% YoY...",
  "category": "earnings",
  "sentiment": "positive",
  "sentiment_score": 0.8,
  "tickers": ["MARA"]
}
```

---

### 6. `analysis_data.json` — Balance Sheet Data for Financial Models

**What it stores:** Current and prior year balance sheet items per company, used by analysis models (Monte Carlo, KMV, Altman Z-score, Beneish M-score, Piotroski F-score, Jones model).

**Update frequency:** After annual results are reported (once per year per company).

**How to collect:**
1. From 10-K/20-F annual filing on SEC EDGAR
2. Extract: total assets, current assets, total liabilities, current liabilities, retained earnings, EBIT, total equity, revenue (current and prior year)

**Record format:**
```json
{
  "FUFU": {
    "name": "BitFuFu",
    "current": {
      "revenue_usd_m": 374.1,
      "net_income_usd_m": 41.9,
      "total_assets_usd_m": 500.0,
      "current_assets_usd_m": 300.0,
      "total_liabilities_usd_m": 200.0,
      "current_liabilities_usd_m": 100.0,
      "total_debt_usd_m": 141.3,
      "retained_earnings_usd_m": 50.0,
      "ebit_usd_m": 45.0,
      "total_equity_usd_m": 300.0,
      "market_cap_usd_m": 718.5,
      "shares_outstanding_m": 169.0,
      "gross_profit_usd_m": 26.6,
      "depreciation_usd_m": 20.0,
      "receivables_usd_m": 30.0,
      "cash_from_operations_usd_m": 60.0,
      "ppe_net_usd_m": 150.0
    },
    "prior": { ... },
    "market": {
      "stock_price": 4.25,
      "market_cap_usd_m": 718.5,
      "risk_free_rate": 0.042
    }
  }
}
```

---

### 7. `btc_price_predictions.json` — BTC Price Forecasts

**What it stores:** BTC price predictions from institutions, analysts, and models.

**Update frequency:** Quarterly or when major new predictions are published.

**How to collect:** Search for "bitcoin price prediction 2027 2028 2030" on CoinDesk, Bloomberg, ARK Invest research.

---

## Collection Schedule (Cron)

| Task | Frequency | When | Script/Method |
|------|-----------|------|---------------|
| Stock prices | Weekly (Mon) | Market close | `fetch_prices.py` → `update_all_data.py` |
| SEC XBRL financials | Weekly (Mon) | Any time | `fetch_sec_data.py` → `update_all_data.py` |
| Monthly production reports | Monthly (1st-10th) | After press releases | Manual: add to `operational.json` |
| Earnings releases | Quarterly | Within 24h of release | Manual: add to `financials.json` |
| Analyst ratings | Monthly | When published | Manual: add to `sentiment.json` |
| News articles | Weekly | Any time | Manual: add to `news.json` |
| BTC price predictions | Quarterly | Any time | Manual: add to `btc_price_predictions.json` |

---

## Agent Workflow: How to Submit Data

### Prerequisites
```bash
cd /Users/leogrossman/btcminecompany
git pull origin main  # Always pull latest first
```

### Step 1: Modify the JSON file(s)

Use Python to safely modify JSON:
```python
import json

# Load
with open('data/financials.json') as f:
    data = json.load(f)

# Add new record
data['data'].append({
    "ticker": "FUFU",
    "fiscal_year": 2025,
    "fiscal_quarter": "Q4",
    # ... all fields
})

# Save
with open('data/financials.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
```

### Step 2: Validate the JSON
```bash
python3 -c "import json; json.load(open('data/financials.json')); print('OK')"
```

### Step 3: Commit and push
```bash
git add data/financials.json
git commit -m "data: add FUFU Q4 2025 financial results"
git push origin main
```

### Step 4: Verify deployment
Wait ~2 minutes, then check https://btcmine.info to confirm data appears correctly.

---

## Automated Pipeline (Full Update)

Run all automated collection steps:
```bash
cd /Users/leogrossman/btcminecompany
git pull origin main

# 1. Fetch stock prices
python3 scripts/fetch_prices.py

# 2. Fetch SEC EDGAR financial data
python3 scripts/fetch_sec_data.py

# 3. Merge into website JSON files
python3 scripts/update_all_data.py

# 4. Validate
python3 -c "
import json
for f in ['companies','financials','operational','sentiment','news','analysis_data','btc_price_predictions']:
    json.load(open(f'data/{f}.json'))
    print(f'  OK: {f}.json')
"

# 5. Commit and push
git add data/
git commit -m "data: weekly automated update $(date +%Y-%m-%d)"
git push origin main
```

---

## Data Quality Checks

After any update, verify:
1. All JSON files parse without errors
2. No negative `report_date` values (HIVE had corrupted dates historically)
3. No duplicate records: `(ticker, fiscal_year, fiscal_quarter)` must be unique in financials
4. No duplicate records: `(ticker, period)` must be unique in operational
5. YoY percentages are capped at ±1000%
6. Report dates are plausible (within 6 months of `period_end_date` for current filings)

---

## Data Sources Quick Reference

| Data | Primary Source | Backup Source | API? |
|------|---------------|---------------|------|
| Stock prices | Yahoo Finance v8 | Google Finance | Yes (no key) |
| Financial results | SEC EDGAR XBRL | Press releases | Yes (no key) |
| BTC price | CoinGecko | Mempool.space | Yes (no key) |
| Monthly production | Company IR pages | GlobeNewsWire | No (web scrape) |
| Analyst ratings | TipRanks, Benzinga | MarketBeat | No (manual) |
| News | CoinDesk, The Block | Google News | No (manual) |
| Balance sheet | SEC EDGAR 10-K | Annual reports | Yes (no key) |
| BTC network | Mempool.space API | Blockchain.com | Yes (no key) |

---

## Troubleshooting

**XBRL returns no data for a ticker:**
Foreign issuers (BITF, HIVE, IREN, HUT, FUFU, SAIH) often have no XBRL. Collect manually from press releases or 20-F filings.

**Yahoo Finance price fetch fails:**
Sometimes Yahoo blocks requests. Use a browser cookie (implemented in `fetch_prices.py`). Or manually update `companies.json` stock_price fields.

**Duplicate calendar entries:**
XBRL filings include comparative period data. The calendar deduplicates by showing only the latest fiscal period per (ticker, report_date). Verify `report_date` values are not stale filing dates.

**Website not updating after push:**
Check GitHub Actions for Pages deployment status. Usually deploys in 1-2 minutes. Hard-refresh the browser (Ctrl+Shift+R) to clear cache.
