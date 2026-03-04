/**
 * BTC Mining Intelligence — Data Loader
 * Fetches data from Data Center API (api.btcmine.info)
 */

const API_BASE = 'https://api.btcmine.info';

let COMPANIES = [];
let FINANCIALS = [];
let OPERATIONAL = [];
let NEWS = [];
let SENTIMENT = { analyst_ratings: [], social_sentiment: [] };
let ANALYSIS_DATA = {};
let BTC_PREDICTIONS = {};
let MARKET_PREDICT = { latest: null, forecast: null, models: null, polymarket: null, fearGreed: null, derivatives: null, backtest: null, onchain: null, options: null, predictionHistory: null, signalHistory: null };

let dataReady = false;
let marketPredictLoaded = false;

async function fetchAPI(apiPath) {
  const res = await fetch(`${API_BASE}${apiPath}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${apiPath}: ${res.status}`);
  return await res.json();
}

async function loadAllData() {
  try {
    const [companiesRes, financialsRes, operationalRes, newsRes, sentimentRes, analysisRes, predictionsRes] = await Promise.all([
      fetchAPI('/api/btcmine/companies'),
      fetchAPI('/api/btcmine/financials'),
      fetchAPI('/api/btcmine/operational'),
      fetchAPI('/api/btcmine/news'),
      fetchAPI('/api/btcmine/sentiment'),
      fetchAPI('/api/btcmine/analysis'),
      fetchAPI('/api/btcmine/predictions'),
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

    // News — map API field names to frontend expectations
    // API returns aiRating:{grade,score,signal,summary}; local JSON has flat ai_grade/ai_score/ai_signal
    NEWS = (newsRes.data || []).map(n => {
      const ai = n.aiRating || {};
      const signal = ai.signal || n.ai_signal || '';
      const score = ai.score || n.ai_score || 0;
      return {
        ...n,
        published_at: n.published_at || n.ts || '',
        ticker: n.ticker || n.symbol || '',
        category: n.category || n.newsType || 'news',
        summary: ai.summary || n.ai_summary || n.summary || n.description || '',
        sentiment: n.sentiment || (signal === 'bullish' ? 'positive' : signal === 'bearish' ? 'negative' : 'neutral'),
        sentiment_score: n.sentiment_score || score,
        ai_grade: ai.grade || n.ai_grade || null,
        title_cn: n.titleCn || n.title_cn || '',
        source_url: n.source_url || n.link || '',
      };
    });

    // Sentiment
    SENTIMENT = {
      analyst_ratings: sentimentRes.analyst_ratings || [],
      social_sentiment: sentimentRes.social_sentiment || [],
    };

    // Analysis supplemental data
    ANALYSIS_DATA = analysisRes.data || {};

    // BTC price predictions
    BTC_PREDICTIONS = predictionsRes || {};

    dataReady = true;
    console.log(`Data loaded: ${COMPANIES.length} companies, ${FINANCIALS.length} financials, ${OPERATIONAL.length} ops, ${NEWS.length} news`);
  } catch (err) {
    console.error('Failed to load data:', err);
  }
}

async function loadMarketPredictions() {
  if (marketPredictLoaded) return;
  try {
    const [latestRes, forecastRes, modelsRes, pmRes, fgRes] = await Promise.all([
      fetchAPI('/api/predict/latest'),
      fetchAPI('/api/predict/forecast'),
      fetchAPI('/api/predict/models'),
      fetchAPI('/api/predict/polymarket'),
      fetchAPI('/api/predict/fear-greed'),
    ]);
    MARKET_PREDICT = {
      latest: latestRes,
      forecast: forecastRes,
      models: modelsRes,
      polymarket: pmRes,
      fearGreed: fgRes,
    };
    // Derivatives data
    try {
      const derivRes = await fetchAPI('/api/predict/derivatives');
      if (derivRes && derivRes.snapshot) {
        MARKET_PREDICT.derivatives = derivRes;
      }
    } catch (_) { /* derivatives not available yet */ }
    // Backtest data
    try {
      const btRes = await fetchAPI('/api/predict/backtest');
      if (btRes && btRes.backtest) {
        MARKET_PREDICT.backtest = btRes;
      }
    } catch (_) { /* backtest not available yet */ }
    // On-chain data
    try {
      const ocRes = await fetchAPI('/api/predict/onchain');
      if (ocRes && ocRes.metrics) {
        MARKET_PREDICT.onchain = ocRes;
      }
    } catch (_) { /* onchain not available yet */ }
    // Options data (Deribit)
    try {
      const optRes = await fetchAPI('/api/predict/options');
      if (optRes && !optRes.error) {
        MARKET_PREDICT.options = optRes;
      }
    } catch (_) { /* options not available yet */ }
    // Try fetching multi-platform betting data; fallback to polymarket only
    try {
      const bettingRes = await fetchAPI('/api/predict/betting-markets');
      if (bettingRes && bettingRes.markets) {
        MARKET_PREDICT.bettingMarkets = bettingRes;
      }
    } catch (_) { /* new API not available yet, use polymarket only */ }
    // Fetch historical data (non-blocking)
    try {
      const [predHist, sigHist] = await Promise.all([
        fetchAPI('/api/predict/prediction-history').catch(() => null),
        fetchAPI('/api/predict/signal-history').catch(() => null),
      ]);
      if (predHist) MARKET_PREDICT.predictionHistory = predHist;
      if (sigHist) MARKET_PREDICT.signalHistory = sigHist;
    } catch (_) { /* historical data not available yet */ }
    marketPredictLoaded = true;
  } catch (err) {
    console.error('Failed to load market predictions:', err);
  }
}
