/**
 * BTC Mining Intelligence — Data Loader
 * Fetches data from /data/*.json files
 */

let COMPANIES = [];
let FINANCIALS = [];
let OPERATIONAL = [];
let NEWS = [];
let SENTIMENT = { analyst_ratings: [], social_sentiment: [] };

let dataReady = false;

async function loadAllData() {
  try {
    const [companiesRes, financialsRes, operationalRes, newsRes, sentimentRes] = await Promise.all([
      fetch('data/companies.json').then(r => r.json()),
      fetch('data/financials.json').then(r => r.json()),
      fetch('data/operational.json').then(r => r.json()),
      fetch('data/news.json').then(r => r.json()),
      fetch('data/sentiment.json').then(r => r.json()),
    ]);

    // Map companies — JSON has no stock_price/market_cap, set defaults
    COMPANIES = (companiesRes.companies || []).filter(c => c.active !== false).map(c => ({
      ticker: c.ticker,
      name: c.name,
      full_name: c.full_name || c.name,
      exchange: c.exchange || 'NASDAQ',
      description: c.description || '',
      website: c.website,
      ir_url: c.ir_url,
      fiscal_year_end: c.fiscal_year_end || 'December',
      sector: c.sector || 'Bitcoin Mining',
      headquarters: c.headquarters || '',
      stock_price: c.stock_price || null,
      market_cap_usd_m: c.market_cap_usd_m || null,
    }));

    // Financials
    FINANCIALS = (financialsRes.data || []).map(f => ({
      ...f,
      // Ensure all expected fields exist
      gross_profit_usd_m: f.gross_profit_usd_m || null,
      operating_income_usd_m: f.operating_income_usd_m || null,
      total_debt_usd_m: f.total_debt_usd_m || null,
      btc_held: f.btc_held || null,
      cash_and_equivalents_usd_m: f.cash_and_equivalents_usd_m || null,
    }));

    // Operational
    OPERATIONAL = (operationalRes.data || []).map(o => ({
      ...o,
      installed_capacity_eh: o.installed_capacity_eh || null,
      power_capacity_mw: o.power_capacity_mw || null,
      fleet_efficiency_j_th: o.fleet_efficiency_j_th || null,
      uptime_pct: o.uptime_pct || null,
      avg_power_cost_cents_kwh: o.avg_power_cost_cents_kwh || null,
    }));

    // News
    NEWS = (newsRes.data || []).map(n => ({
      ...n,
      sentiment_score: n.sentiment_score || 0,
    }));

    // Sentiment
    SENTIMENT = {
      analyst_ratings: sentimentRes.analyst_ratings || [],
      social_sentiment: sentimentRes.social_sentiment || [],
    };

    dataReady = true;
    console.log(`Data loaded: ${COMPANIES.length} companies, ${FINANCIALS.length} financials, ${OPERATIONAL.length} ops, ${NEWS.length} news`);
  } catch (err) {
    console.error('Failed to load data:', err);
  }
}
