#!/usr/bin/env python3
"""Fetch live stock prices from Yahoo Finance v8 API."""
import json
import urllib.request
import time
import http.cookiejar
import sys
import os

TICKERS = [
    "MARA", "RIOT", "CLSK", "CORZ", "HUT", "WULF", "IREN", "CIFR",
    "BITF", "BTBT", "BTDR", "APLD", "FUFU", "HIVE", "GREE", "ABTC",
    "ANY", "SLNH", "GPUS", "DGXX", "MIGI", "SAIH",
]


def get_yahoo_cookie():
    """Get a consent cookie from Yahoo."""
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    opener.addheaders = [("User-Agent", "Mozilla/5.0")]
    try:
        opener.open("https://fc.yahoo.com", timeout=10)
    except:
        pass
    return cj, opener


def fetch_price(ticker, opener):
    """Fetch price data from Yahoo Finance v8 chart API."""
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=5d"
    try:
        resp = opener.open(url, timeout=15)
        data = json.loads(resp.read())
        meta = data["chart"]["result"][0]["meta"]
        return {
            "ticker": ticker,
            "price": meta.get("regularMarketPrice"),
            "prev_close": meta.get("previousClose"),
            "currency": meta.get("currency"),
            "exchange": meta.get("exchangeName"),
        }
    except Exception as e:
        print(f"  ERROR {ticker}: {e}", file=sys.stderr)
        return {"ticker": ticker, "price": None}


def fetch_btc_price():
    """Fetch BTC price from CoinGecko."""
    url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_market_cap=true&include_24hr_change=true"
    req = urllib.request.Request(url, headers={"User-Agent": "btcmine.info"})
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read())
        btc = data.get("bitcoin", {})
        return {
            "btc_price_usd": btc.get("usd"),
            "btc_market_cap": btc.get("usd_market_cap"),
            "btc_24h_change_pct": btc.get("usd_24h_change"),
        }
    except Exception as e:
        print(f"  ERROR fetching BTC price: {e}", file=sys.stderr)
        return {}


def main():
    print("Fetching Yahoo Finance cookie...")
    cj, opener = get_yahoo_cookie()

    prices = {}
    for i, ticker in enumerate(TICKERS):
        print(f"[{i+1}/{len(TICKERS)}] {ticker}...")
        result = fetch_price(ticker, opener)
        prices[ticker] = result
        if result.get("price"):
            print(f"  ${result['price']}")
        time.sleep(0.3)

    # Also fetch BTC price
    print("\nFetching BTC price...")
    btc = fetch_btc_price()
    prices["_BTC"] = btc
    if btc.get("btc_price_usd"):
        print(f"  BTC: ${btc['btc_price_usd']:,.0f}")

    out_path = os.path.join(os.path.dirname(__file__), "..", "data", "prices_raw.json")
    with open(out_path, "w") as f:
        json.dump(prices, f, indent=2)

    print(f"\nSaved to {out_path}")
    found = sum(1 for t in TICKERS if prices.get(t, {}).get("price"))
    print(f"Prices found: {found}/{len(TICKERS)}")


if __name__ == "__main__":
    main()
