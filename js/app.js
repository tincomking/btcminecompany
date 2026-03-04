/**
 * BTC Mining Intelligence Platform — Main Application
 */

'use strict';

// ── ANALYSIS MODELS REGISTRY ──────────────────────────────────────────────
if (typeof ANALYSIS_MODELS === 'undefined') window.ANALYSIS_MODELS = {};

// ── HELPERS ────────────────────────────────────────────────────────────────

function ensureFufuFirst(arr, tickerKey) {
  tickerKey = tickerKey || 'ticker';
  var fufuIdx = -1;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i][tickerKey] === 'FUFU') { fufuIdx = i; break; }
  }
  if (fufuIdx > 0) {
    var item = arr.splice(fufuIdx, 1)[0];
    arr.unshift(item);
  }
  return arr;
}

function chartColors() {
  const isLight = currentTheme === 'light';
  return {
    tooltip: { bg: isLight ? '#ffffff' : '#1a1a1a', border: isLight ? '#d4d4d8' : '#333', title: isLight ? '#18181b' : '#f0f0f0', body: isLight ? '#52525b' : '#a0a0a0' },
    legend: isLight ? '#52525b' : '#a0a0a0',
    tick: isLight ? '#93939e' : '#606060',
    grid: isLight ? '#e2e2e5' : '#1e1e1e',
  };
}

const fmt = {
  usd: (v, decimals = 1) => v == null ? '—' : `$${v.toFixed(decimals)}M`,
  pct: (v, type) => {
    if (v == null) return '<span class="no-data">—</span>';
    const cls = v >= 0 ? 'yoy-pos' : 'yoy-neg';
    const arrow = v >= 0 ? '↑' : '↓';
    const label = type === 'qoq' ? ' QoQ' : type === 'yoy' ? ' YoY' : '';
    return `<span class="yoy-badge ${cls}">${arrow} ${Math.abs(v).toFixed(1)}%<span style="font-size:8px;opacity:0.7;margin-left:2px;">${label}</span></span>`;
  },
  num: (v, decimals = 1) => v == null ? '—' : v.toLocaleString('en-US', { maximumFractionDigits: decimals }),
  date: (s) => {
    if (!s) return '—';
    const d = new Date(s);
    return d.toLocaleDateString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit' });
  },
  daysFrom: (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.round((new Date(dateStr) - new Date()) / 86400000);
    return diff;
  }
};

function getLatestFinancial(ticker) {
  const reported = FINANCIALS.filter(f => f.ticker === ticker && f.is_reported);
  if (!reported.length) return null;
  // Prefer quarterly data over FY — sort by date desc, then quarterly before FY
  reported.sort((a, b) => {
    const dateCmp = b.period_end_date.localeCompare(a.period_end_date);
    if (dateCmp !== 0) return dateCmp;
    const aIsQ = a.fiscal_quarter && a.fiscal_quarter.startsWith('Q');
    const bIsQ = b.fiscal_quarter && b.fiscal_quarter.startsWith('Q');
    if (aIsQ && !bIsQ) return -1;
    if (!aIsQ && bIsQ) return 1;
    return 0;
  });
  return reported[0];
}

/**
 * Find the last known non-null value for a field across all reported financials for a ticker.
 * Returns { value, period_label } or null if never reported.
 */
function findLastKnownValue(ticker, field) {
  const reported = FINANCIALS.filter(f => f.ticker === ticker && f.is_reported && f[field] != null)
    .sort((a, b) => b.period_end_date.localeCompare(a.period_end_date));
  if (!reported.length) return null;
  return { value: reported[0][field], period_label: reported[0].period_label };
}

function getLatestPeriod() {
  if (!OPERATIONAL.length) return null;
  return OPERATIONAL.reduce((max, o) => o.period > max ? o.period : max, OPERATIONAL[0].period);
}

function getLatestOperational(ticker, period) {
  const p = period || getLatestPeriod();
  return OPERATIONAL.find(o => o.ticker === ticker && o.period === p) || null;
}

function getSentiment(ticker) {
  return SENTIMENT.social_sentiment.find(s => s.ticker === ticker) || null;
}

function getAnalystRatings(ticker) {
  return SENTIMENT.analyst_ratings.filter(r => r.ticker === ticker);
}

function avgTargetPrice(ticker) {
  const ratings = getAnalystRatings(ticker).filter(r => r.target_price_usd);
  if (!ratings.length) return null;
  return ratings.reduce((s, r) => s + r.target_price_usd, 0) / ratings.length;
}

// Calculate sentiment score from StockTwits bullish percentage
// bullishPct: 0-100 → score: -1 to +1 (linear: 50% → 0, 100% → 1, 0% → -1)
// ── COMPANY LOGO ──────────────────────────────────────────────────────────

function companyLogo(ticker, size) {
  size = size || 24;
  const co = COMPANIES.find(c => c.ticker === ticker);
  const url = co && co.website ? co.website.replace(/\/$/, '') : null;
  const fallback = `<span class="logo-placeholder" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.45)}px;">${ticker[0]}</span>`;
  if (!url) return fallback;
  const src = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}&size=${size}`;
  const esc = fallback.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return `<img class="company-logo" src="${src}" width="${size}" height="${size}" alt="${ticker}" onerror="this.outerHTML='${esc}'">`;
}

// ── SENTIMENT TAB STATE ──────────────────────────────────────────────────

let sentimentPage = 1;
let sentimentFilterTicker = 'ALL';
let sentimentFilterRating = 'ALL';
const SENTIMENT_PAGE_SIZE = 15;

function calcSentimentScore(soc) {
  if (!soc || soc.stocktwits_bullish_pct == null) return null;
  return (soc.stocktwits_bullish_pct - 50) / 50; // e.g. 70% → 0.4, 42% → -0.16
}

function sentimentClass(score) {
  if (score == null) return 'sentiment-pill pill-neutral';
  if (score >= 0.1) return 'sentiment-pill pill-bullish';
  if (score <= -0.1) return 'sentiment-pill pill-bearish';
  return 'sentiment-pill pill-neutral';
}

function sentimentLabel(score) {
  if (score == null) return '—';
  if (score >= 0.1) return t('js.bullish');
  if (score <= -0.1) return t('js.bearish');
  return t('js.neutral');
}

function sentimentTooltip(soc) {
  if (!soc || soc.stocktwits_bullish_pct == null) return '';
  const score = calcSentimentScore(soc);
  const pct = soc.stocktwits_bullish_pct;
  if (currentLang === 'zh') {
    return `StockTwits 看涨 ${pct}% / 看跌 ${100 - pct}%\n` +
      `情绪得分: ${(score * 100).toFixed(0)}\n` +
      `规则: >55% 看多 | <45% 看空 | 45-55% 中性`;
  }
  return `StockTwits Bullish ${pct}% / Bearish ${100 - pct}%\n` +
    `Score: ${(score * 100).toFixed(0)}\n` +
    `Rule: >55% Bullish | <45% Bearish | 45-55% Neutral`;
}

function categoryClass(cat) {
  const map = { earnings:'cat-earnings', expansion:'cat-expansion', regulatory:'cat-regulatory', market:'cat-market', business:'cat-business', operations:'cat-operations', sustainability:'cat-sustainability', treasury:'cat-treasury' };
  return map[cat] || 'cat-default';
}

function categoryLabel(cat) {
  const keyMap = { earnings:'cat.earnings', expansion:'cat.expansion', regulatory:'cat.regulatory', market:'cat.market', business:'cat.business', operations:'cat.operations', sustainability:'cat.sustainability', treasury:'cat.treasury' };
  return keyMap[cat] ? t(keyMap[cat]) : cat;
}

function ratingClass(r) {
  const map = { buy:'rating-buy', hold:'rating-hold', sell:'rating-sell' };
  return map[r] || 'rating-hold';
}

function actionLabel(a) {
  const keyMap = { initiate:'js.initiate', maintain:'js.maintain', upgrade:'js.upgrade', downgrade:'js.downgrade', upgrade_target:'js.upgrade_target', downgrade_target:'js.downgrade_target', reiterate:'js.reiterate' };
  const cls = ['upgrade','upgrade_target'].includes(a) ? 'action-upgrade' : ['downgrade','downgrade_target'].includes(a) ? 'action-downgrade' : '';
  return `<span class="action-badge ${cls}">${keyMap[a] ? t(keyMap[a]) : a}</span>`;
}

// ── NAV TABS ────────────────────────────────────────────────────────────────

document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`page-${page}`).classList.add('active');
    if (page === 'financials') renderFinancials();
    if (page === 'operations') renderOperations();
    if (page === 'news') renderNews();
    if (page === 'sentiment') renderSentiment();
    if (page === 'analysis') renderAnalysis();
    if (page === 'predictions') renderPredictions();
    if (page === 'market-predict') renderMarketPredict();
  });
});

// ── INTRO CARD CLICK → NAVIGATE TO SUB-PAGE ────────────────────────────────
document.querySelectorAll('.intro-card[data-goto]').forEach(card => {
  card.addEventListener('click', () => {
    const page = card.dataset.goto;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const tab = document.querySelector(`.nav-tab[data-page="${page}"]`);
    if (tab) tab.classList.add('active');
    const pg = document.getElementById(`page-${page}`);
    if (pg) pg.classList.add('active');
    if (page === 'financials') renderFinancials();
    if (page === 'operations') renderOperations();
    if (page === 'news') renderNews();
    if (page === 'sentiment') renderSentiment();
    if (page === 'analysis') renderAnalysis();
    if (page === 'predictions') renderPredictions();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ── PAGE: OVERVIEW ──────────────────────────────────────────────────────────

function renderOverview() {
  updateStatsBar();
  renderEarningsCalendar();
  renderCompanyGrid('relevance');
  setupOverviewFilters();
}

function updateStatsBar() {
  document.getElementById('stat-companies').textContent = COMPANIES.length;

  // Total market cap
  const companiesWithMktCap = COMPANIES.filter(c => c.market_cap_usd_m > 0);
  const totalMktCap = companiesWithMktCap.reduce((s, c) => s + c.market_cap_usd_m, 0);
  document.getElementById('stat-mktcap').textContent = totalMktCap > 0 ? `$${(totalMktCap / 1000).toFixed(1)}B` : '—';
  const mktCapSub = document.getElementById('stat-mktcap').closest('.stat-item').querySelector('.stat-sub');
  if (mktCapSub) {
    const n = companiesWithMktCap.length;
    mktCapSub.textContent = n < COMPANIES.length
      ? `${n}/${COMPANIES.length} ${t('stats.companies_disclosed')}`
      : t('stats.mktcap_sub');
  }

  // Helper: for each company find their latest operational record with a given field
  function getLatestOpsPerCompany(field) {
    const byTicker = {};
    OPERATIONAL.forEach(o => {
      if (o[field] > 0) {
        if (!byTicker[o.ticker] || o.period > byTicker[o.ticker].period) {
          byTicker[o.ticker] = o;
        }
      }
    });
    return Object.values(byTicker);
  }

  // Helper: format period range for display
  function formatPeriodRange(records) {
    if (!records.length) return '';
    const periods = records.map(r => r.period).filter(Boolean).sort();
    if (!periods.length) return '';
    const min = periods[0], max = periods[periods.length - 1];
    const fmt = p => {
      if (!p) return '';
      if (p.includes('Q')) return p; // quarterly like "2025-Q4"
      const [y, m] = p.split('-');
      if (!m || isNaN(parseInt(m))) return p;
      return currentLang === 'zh' ? `${y}年${parseInt(m)}月` : `${y}-${m}`;
    };
    return min === max ? fmt(max) : `${fmt(min)}~${fmt(max)}`;
  }

  // Total BTC held (from latest financial OR latest operational per company)
  let totalBtc = 0;
  let btcCount = 0;
  const btcPeriods = [];
  COMPANIES.forEach(co => {
    // Check operational first (more frequent updates), then financial
    let btc = 0, period = null;
    const opsRecords = OPERATIONAL.filter(o => o.ticker === co.ticker && o.btc_held > 0)
      .sort((a, b) => b.period.localeCompare(a.period));
    if (opsRecords.length) {
      btc = opsRecords[0].btc_held;
      period = opsRecords[0].period;
    }
    if (!btc) {
      const fin = getLatestFinancial(co.ticker);
      if (fin && fin.btc_held > 0) {
        btc = fin.btc_held;
        period = fin.period_end_date ? fin.period_end_date.slice(0, 7) : null;
      }
    }
    if (btc > 0) {
      btcCount++;
      totalBtc += btc;
      if (period) btcPeriods.push({ period });
    }
  });
  document.getElementById('stat-btc').textContent = totalBtc > 0 ? totalBtc.toLocaleString() : '—';
  const btcSub = document.getElementById('stat-btc').closest('.stat-item').querySelector('.stat-sub');
  if (btcSub) {
    const range = formatPeriodRange(btcPeriods);
    btcSub.textContent = btcCount > 0
      ? `${btcCount}${t('stats.companies_disclosed')}${range ? ' / ' + range : ''}`
      : t('stats.btc_held_sub');
  }

  // Total hashrate from each company's latest operational data
  const hashRecords = getLatestOpsPerCompany('hash_rate_eh');
  const totalHash = hashRecords.reduce((s, o) => s + o.hash_rate_eh, 0);
  document.getElementById('stat-hashrate').textContent = totalHash > 0 ? `${totalHash.toFixed(1)} EH/s` : '—';
  const hashSub = document.getElementById('stat-hashrate').closest('.stat-item').querySelector('.stat-sub');
  if (hashSub) {
    const range = formatPeriodRange(hashRecords);
    hashSub.textContent = hashRecords.length > 0
      ? `${hashRecords.length}${t('stats.companies_disclosed')}${range ? ' / ' + range : ''}`
      : t('stats.hashrate_sub');
  }

  // Total BTC mined from each company's latest operational data
  const minedRecords = getLatestOpsPerCompany('btc_mined');
  const totalMined = minedRecords.reduce((s, o) => s + o.btc_mined, 0);
  document.getElementById('stat-btcmined').textContent = totalMined > 0 ? totalMined.toLocaleString() : '—';
  const minedSub = document.getElementById('stat-btcmined').closest('.stat-item').querySelector('.stat-sub');
  if (minedSub) {
    const range = formatPeriodRange(minedRecords);
    minedSub.textContent = minedRecords.length > 0
      ? `${minedRecords.length}${t('stats.companies_disclosed')}${range ? ' / ' + range : ''}`
      : t('stats.monthly_sub') || 'BTC';
  }
}

function renderEarningsCalendar() {
  const container = document.getElementById('earningsCalendar');
  const upcoming = FINANCIALS.filter(f => !f.is_reported && (f.estimated_report_date || f.report_date))
    .sort((a, b) => {
      const da = a.estimated_report_date || a.report_date;
      const db = b.estimated_report_date || b.report_date;
      return da.localeCompare(db);
    }).slice(0, 8);

  container.innerHTML = upcoming.map(f => {
    const company = COMPANIES.find(c => c.ticker === f.ticker);
    const dateStr = f.estimated_report_date || f.report_date;
    const days = fmt.daysFrom(dateStr);
    const daysLabel = days !== null ? (days > 0 ? `${days}${t('js.days_later')}` : days === 0 ? t('js.today') : `${Math.abs(days)}${t('js.days_ago')}`) : '';
    return `
      <div class="earnings-item upcoming">
        <div class="earnings-ticker-col">
          <span class="ticker-badge">${f.ticker}</span>
          <span class="earnings-period" style="margin-top:4px;">${f.period_label}</span>
        </div>
        <div class="earnings-date-col">
          <div class="earnings-date-display">${fmt.date(dateStr)}</div>
          <div class="earnings-days-away">${daysLabel}</div>
          <div style="margin-top:4px;"><span class="status-badge status-estimated"><span class="dot dot-pulse"></span>${t('js.estimated')}</span></div>
        </div>
      </div>`;
  }).join('');
}

function renderCompanyGrid(sortBy = 'mktcap') {
  const grid = document.getElementById('companyGrid');

  let sorted = [...COMPANIES];
  if (sortBy === 'relevance') {
    sorted.sort((a, b) => (b.market_cap_usd_m||0) - (a.market_cap_usd_m||0));
    ensureFufuFirst(sorted);
  } else if (sortBy === 'mktcap') {
    sorted.sort((a, b) => (b.market_cap_usd_m||0) - (a.market_cap_usd_m||0));
  } else if (sortBy === 'revenue') {
    sorted.sort((a, b) => {
      const fa = getLatestFinancial(a.ticker);
      const fb = getLatestFinancial(b.ticker);
      return ((fb&&fb.revenue_usd_m)||0) - ((fa&&fa.revenue_usd_m)||0);
    });
  } else if (sortBy === 'ebitda') {
    sorted.sort((a, b) => {
      const fa = getLatestFinancial(a.ticker);
      const fb = getLatestFinancial(b.ticker);
      return ((fb&&fb.adjusted_ebitda_usd_m)||0) - ((fa&&fa.adjusted_ebitda_usd_m)||0);
    });
  } else if (sortBy === 'hashrate') {
    sorted.sort((a, b) => {
      const oa = getLatestOperational(a.ticker);
      const ob = getLatestOperational(b.ticker);
      return ((ob&&ob.hash_rate_eh)||0) - ((oa&&oa.hash_rate_eh)||0);
    });
  }

  grid.innerHTML = sorted.map(co => {
    const fin = getLatestFinancial(co.ticker);
    const ops = getLatestOperational(co.ticker);
    const soc = getSentiment(co.ticker);
    const upcoming = FINANCIALS.find(f => f.ticker === co.ticker && !f.is_reported);
    const score = calcSentimentScore(soc);

    return `
      <div class="company-card" data-ticker="${co.ticker}" onclick="openCompanyModal('${co.ticker}')">
        <div class="company-card-header">
          <div class="company-identity">
            ${companyLogo(co.ticker, 28)}
            <div>
              <div class="ticker-badge">${co.ticker}</div>
            </div>
            <div>
              <div class="company-name-small">${co.name}</div>
              <div class="company-exchange">${co.exchange} · ${t('js.fiscal_year')} ${co.fiscal_year_end}</div>
            </div>
          </div>
          <div class="stock-info">
            ${co.stock_price ? `<div class="stock-price-display">$${co.stock_price}</div>` : ''}
            ${co.market_cap_usd_m ? `<div class="stock-mktcap">${t('js.mktcap')} $${(co.market_cap_usd_m/1000).toFixed(1)}B</div>` : `<div class="stock-mktcap" style="color:var(--text-muted);">${co.exchange}</div>`}
          </div>
        </div>

        <div class="company-metrics">
          <div class="metric-block">
            <div class="metric-label">${t('js.latest_revenue')}</div>
            <div class="metric-value">${(() => {
              if (fin && fin.revenue_usd_m != null) return fmt.usd(fin.revenue_usd_m);
              const h = findLastKnownValue(co.ticker, 'revenue_usd_m');
              return h ? fmt.usd(h.value) : t('js.pending');
            })()}</div>
            <div class="metric-yoy">${fin ? fmt.pct(fin.revenue_yoy_pct, fin.revenue_yoy_pct != null ? 'yoy' : null) : ''}</div>
          </div>
          <div class="metric-block">
            <div class="metric-label">${t('th.net_income')}</div>
            <div class="metric-value">${(() => {
              if (fin && fin.net_income_usd_m != null) return `<span class="${fin.net_income_usd_m >= 0 ? 'text-green' : 'text-red'}">${fmt.usd(fin.net_income_usd_m)}</span>`;
              const h = findLastKnownValue(co.ticker, 'net_income_usd_m');
              if (h) return `<span class="${h.value >= 0 ? 'text-green' : 'text-red'}">${fmt.usd(h.value)}</span>`;
              return t('js.pending');
            })()}</div>
            <div class="metric-yoy">${fin ? fmt.pct(fin.net_income_yoy_pct, fin.net_income_yoy_pct != null ? 'yoy' : null) : ''}</div>
          </div>
          <div class="metric-block">
            <div class="metric-label">Adj. EBITDA</div>
            <div class="metric-value">${(() => {
              if (fin && fin.adjusted_ebitda_usd_m != null) return fmt.usd(fin.adjusted_ebitda_usd_m);
              const h = findLastKnownValue(co.ticker, 'adjusted_ebitda_usd_m');
              return h ? fmt.usd(h.value) : t('js.pending');
            })()}</div>
            <div class="metric-yoy">${fin ? fmt.pct(fin.adjusted_ebitda_yoy_pct, fin.adjusted_ebitda_yoy_pct != null ? 'yoy' : null) : ''}</div>
          </div>
          <div class="metric-block">
            <div class="metric-label">${t('js.btc_holding')}</div>
            <div class="metric-value">${(() => {
              const opsRecs = OPERATIONAL.filter(o => o.ticker === co.ticker && o.btc_held > 0)
                .sort((a, b) => b.period.localeCompare(a.period));
              if (opsRecs.length) return opsRecs[0].btc_held.toLocaleString();
              if (fin && fin.btc_held) return fin.btc_held.toLocaleString();
              const h = findLastKnownValue(co.ticker, 'btc_held');
              if (h) return h.value.toLocaleString();
              return '—';
            })()}</div>
            <div class="metric-yoy" style="color:var(--text-muted);font-size:10px;">${(() => {
              const opsRecs = OPERATIONAL.filter(o => o.ticker === co.ticker && o.btc_held > 0)
                .sort((a, b) => b.period.localeCompare(a.period));
              if (opsRecs.length) return opsRecs[0].period_label || opsRecs[0].period;
              if (fin && fin.btc_held) return fin.period_label || '';
              const h = findLastKnownValue(co.ticker, 'btc_held');
              if (h) return h.period_label;
              return t('js.btc_unit');
            })()}</div>
          </div>
        </div>

        <div class="company-card-footer">
          <div class="earnings-info">
            ${fin ? `<span class="earnings-label">${t('js.latest_report')}</span><span class="earnings-date">${fin.period_label}</span>` : ''}
            ${upcoming ? `<span class="earnings-label" style="margin-top:4px;">${t('js.next_expected')}</span><span class="earnings-date" style="color:var(--orange);">${upcoming.period_label} · ${fmt.date(upcoming.estimated_report_date)}</span>` : ''}
          </div>
          <div class="${sentimentClass(score)}" title="${sentimentTooltip(soc).replace(/"/g, '&quot;')}">
            <span>●</span>${sentimentLabel(score)}
            ${score != null ? `<span style="font-size:9px;opacity:0.7;">${(score*100).toFixed(0)}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

function setupOverviewFilters() {
  const container = document.getElementById('page-overview');
  if (!container || container._sortInit) return;
  container._sortInit = true;
  container.querySelectorAll('[data-sort]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-sort]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCompanyGrid(btn.dataset.sort);
    });
  });
}

// ── PAGE: FINANCIALS ────────────────────────────────────────────────────────

let finCurrentPeriod = 'latest';
let finCurrentCompany = 'ALL';
let finPage = 1;
const FIN_PER_PAGE = 10;

function renderFinancials() {
  buildPeriodSelectors();
  renderFinancialsTable();
  renderEarningsCalendar_grid();
  setupCalendarNav();
  renderRevenueChart();
  setupFinancialFilters();
}

function buildPeriodSelectors() {
  const container = document.getElementById('fin-period-buttons');
  if (!container) return;

  // Collect unique years from reported data
  const years = [...new Set(FINANCIALS.filter(f => f.is_reported).map(f => f.fiscal_year))].sort((a, b) => b - a);

  let html = `<select id="fin-year-select" class="filter-select">
    <option value="latest">${t('filter.latest') || 'Latest'}</option>`;
  years.forEach(y => {
    html += `<option value="${y}">${y}</option>`;
  });
  html += `</select>`;
  html += `<select id="fin-quarter-select" class="filter-select">
    <option value="ALL">${t('filter.all_quarters') || 'All Quarters'}</option>
    <option value="Q1">Q1</option>
    <option value="Q2">Q2</option>
    <option value="Q3">Q3</option>
    <option value="Q4">Q4</option>
    <option value="FY">${t('filter.fy') || 'FY'}</option>
  </select>`;
  container.innerHTML = html;
}

function getFilteredFinancials() {
  const qWeight = { Q1: 1, H1: 2, Q2: 3, H2: 4, Q3: 5, Q4: 6, FY: 6 };
  let data = FINANCIALS.filter(f => f.is_reported && f.period_end_date);

  // Company filter
  if (finCurrentCompany !== 'ALL') data = data.filter(f => f.ticker === finCurrentCompany);

  // Year filter
  const yearSel = document.getElementById('fin-year-select');
  const quarterSel = document.getElementById('fin-quarter-select');
  const yearVal = yearSel ? yearSel.value : 'latest';
  const quarterVal = quarterSel ? quarterSel.value : 'ALL';

  if (yearVal === 'latest') {
    if (finCurrentCompany !== 'ALL') {
      // Single company: detect filing pattern and build complete timeline
      const hasQ = data.some(r => r.fiscal_quarter.startsWith('Q') &&
        (r.revenue_usd_m != null || r.net_income_usd_m != null));
      let expectedPeriods;
      if (hasQ) {
        expectedPeriods = ['Q1', 'Q2', 'Q3', 'FY'];
        data = data.filter(r => ['Q1','Q2','Q3','Q4','FY'].includes(r.fiscal_quarter));
      } else {
        const hasH = data.some(r => (r.fiscal_quarter === 'H1' || r.fiscal_quarter === 'H2') &&
          (r.revenue_usd_m != null || r.net_income_usd_m != null));
        if (hasH) {
          expectedPeriods = ['H1', 'FY'];
          data = data.filter(r => ['H1','H2','FY'].includes(r.fiscal_quarter));
        } else {
          expectedPeriods = ['FY'];
          data = data.filter(r => r.fiscal_quarter === 'FY');
        }
      }

      // Build data map and determine year range
      const dataMap = {};
      data.forEach(r => { dataMap[r.fiscal_year + '|' + r.fiscal_quarter] = r; });
      const years = data.map(r => r.fiscal_year);
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);

      // Generate complete timeline with placeholders for missing periods
      const timeline = [];
      const revPeriods = [...expectedPeriods].reverse(); // FY, Q3, Q2, Q1
      for (let y = maxYear; y >= minYear; y--) {
        for (const q of revPeriods) {
          const key = y + '|' + q;
          if (dataMap[key]) {
            timeline.push(dataMap[key]);
          } else {
            timeline.push({
              ticker: finCurrentCompany,
              fiscal_year: y,
              fiscal_quarter: q,
              period_label: q + ' ' + y,
              _placeholder: true,
            });
          }
        }
      }
      data = timeline;
    } else {
      // All companies → show latest per company
      const map = {};
      data.forEach(f => {
        if (!map[f.ticker] || f.period_end_date > map[f.ticker].period_end_date) map[f.ticker] = f;
      });
      data = Object.values(map);
    }
  } else {
    const year = parseInt(yearVal);
    data = data.filter(f => f.fiscal_year === year);
    if (quarterVal !== 'ALL') {
      data = data.filter(f => f.fiscal_quarter === quarterVal);
    }
  }

  // Quarter filter also applies in "latest" mode when a specific quarter is chosen
  if (yearVal === 'latest' && quarterVal !== 'ALL') {
    data = data.filter(f => f.fiscal_quarter === quarterVal);
  }

  // Sort: single company by fiscal period, all companies by report_date desc
  if (finCurrentCompany !== 'ALL') {
    data.sort((a, b) => {
      const ka = a.fiscal_year * 10 + (qWeight[a.fiscal_quarter] || 0);
      const kb = b.fiscal_year * 10 + (qWeight[b.fiscal_quarter] || 0);
      return kb - ka;
    });
  } else {
    data.sort((a, b) => {
      const da = a.report_date || a.period_end_date || '';
      const db = b.report_date || b.period_end_date || '';
      return db.localeCompare(da);
    });
  }
  return data;
}

function renderFinancialsTable() {
  const body = document.getElementById('financialsBody');
  const allData = getFilteredFinancials();

  if (!allData.length) {
    body.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:32px;color:var(--text-muted);">${t('js.no_data')}</td></tr>`;
    renderFinPagination(0, 0);
    return;
  }

  // Pagination
  const totalPages = Math.ceil(allData.length / FIN_PER_PAGE);
  if (finPage > totalPages) finPage = totalPages;
  if (finPage < 1) finPage = 1;
  const start = (finPage - 1) * FIN_PER_PAGE;
  const data = allData.slice(start, start + FIN_PER_PAGE);

  body.innerHTML = data.map(f => {
    // Placeholder row for missing periods
    if (f._placeholder) {
      return `<tr style="opacity:0.35;">
        <td><span class="td-ticker">${f.ticker}</span></td>
        <td class="td-mono">${f.period_label}</td>
        <td class="td-right no-data" colspan="9" style="text-align:center;">—</td>
        <td></td>
      </tr>`;
    }

    const co = COMPANIES.find(c => c.ticker === f.ticker);
    const niStr = f.net_income_usd_m == null ? '<span class="no-data">—</span>' :
      `<span class="${f.net_income_usd_m >= 0 ? 'text-green' : 'text-red'} text-mono">${f.net_income_usd_m >= 0 ? '' : ''}${fmt.usd(f.net_income_usd_m)}</span>`;
    const fKey = `${f.ticker}|${f.fiscal_year}|${f.fiscal_quarter}`;

    return `<tr class="fin-row-clickable" onclick="openFinancialDetail('${fKey}')">
      <td>
        <div style="display:flex;align-items:center;gap:6px;">
          ${companyLogo(f.ticker, 20)}
          <div style="display:flex;flex-direction:column;gap:1px;">
            <span class="td-ticker">${f.ticker}</span>
            <span style="font-size:10px;color:var(--text-muted);">${co ? co.name : ''}</span>
          </div>
        </div>
      </td>
      <td class="td-mono td-primary">${f.period_label}</td>
      <td class="td-right td-mono td-primary">${fmt.usd(f.revenue_usd_m)}</td>
      <td class="td-right">${fmt.pct(f.revenue_yoy_pct, 'yoy')}</td>
      <td class="td-right">${niStr}</td>
      <td class="td-right">${fmt.pct(f.net_income_yoy_pct, 'yoy')}</td>
      <td class="td-right td-mono td-primary">${fmt.usd(f.adjusted_ebitda_usd_m)}</td>
      <td class="td-right">${fmt.pct(f.adjusted_ebitda_yoy_pct, 'yoy')}</td>
      <td class="td-right td-mono">${f.eps_diluted == null ? '<span class="no-data">—</span>' : (f.eps_diluted >= 0 ? '+' : '') + f.eps_diluted.toFixed(2)}</td>
      <td><span class="status-badge status-reported"><span class="dot"></span>${t('js.reported')}</span></td>
      <td class="td-mono">${fmt.date(f.report_date)}</td>
      <td style="text-align:center;"><button class="fin-detail-btn" onclick="event.stopPropagation();openFinancialDetail('${fKey}',true);" title="${currentLang === 'zh' ? '查看完整财报' : 'View full report'}">&#9776;</button></td>
    </tr>`;
  }).join('');
  renderFinPagination(allData.length, totalPages);
}

function openFinancialDetail(key, showFull) {
  const [ticker, fy, fq] = key.split('|');
  const f = FINANCIALS.find(r => r.ticker === ticker && String(r.fiscal_year) === fy && r.fiscal_quarter === fq);
  if (!f) return;
  const co = COMPANIES.find(c => c.ticker === ticker);
  const isZh = currentLang === 'zh';

  // Header
  document.getElementById('finDetailHeader').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
      ${companyLogo(ticker, 28)}
      <span class="ticker-badge">${ticker}</span>
      <span style="font-size:15px;font-weight:600;">${co ? co.name : ''}</span>
    </div>
    <div style="font-size:12px;color:var(--text-muted);">${f.period_label} &middot; ${isZh ? '报告期截止' : 'Period ending'}: ${f.period_end_date || '—'} &middot; ${isZh ? '发布日期' : 'Filed'}: ${f.report_date || '—'}</div>`;

  // Summary metrics grid
  const metrics = [
    { label: isZh ? '营收' : 'Revenue', value: fmt.usd(f.revenue_usd_m), yoy: f.revenue_yoy_pct },
    { label: isZh ? '毛利' : 'Gross Profit', value: fmt.usd(f.gross_profit_usd_m), yoy: f.gross_profit_yoy_pct },
    { label: isZh ? '营业利润' : 'Operating Income', value: fmt.usd(f.operating_income_usd_m), yoy: null, color: f.operating_income_usd_m },
    { label: isZh ? '净利润' : 'Net Income', value: fmt.usd(f.net_income_usd_m), yoy: f.net_income_yoy_pct, color: f.net_income_usd_m },
    { label: 'Adj. EBITDA', value: fmt.usd(f.adjusted_ebitda_usd_m), yoy: f.adjusted_ebitda_yoy_pct },
    { label: isZh ? 'EPS（摊薄）' : 'EPS (Diluted)', value: f.eps_diluted != null ? (f.eps_diluted >= 0 ? '+' : '') + f.eps_diluted.toFixed(2) : '—', yoy: null, color: f.eps_diluted },
  ];
  document.getElementById('finDetailSummary').innerHTML = metrics.map(m => `
    <div class="modal-metric">
      <div class="modal-metric-label">${m.label}</div>
      <div class="modal-metric-value" ${m.color != null && m.color < 0 ? 'style="color:var(--red);"' : ''}>${m.value}</div>
      ${m.yoy != null ? `<div class="modal-metric-yoy">${fmt.pct(m.yoy, 'yoy')}</div>` : ''}
    </div>`).join('');

  // Full detail table
  const allFields = [
    [isZh ? '报告期' : 'Period', f.period_label],
    [isZh ? '报告期截止日' : 'Period End Date', f.period_end_date || '—'],
    [isZh ? '财报发布日' : 'Report Date', f.report_date || '—'],
    ['', ''],
    [isZh ? '营收 (百万美元)' : 'Revenue (USD M)', fmtVal(f.revenue_usd_m)],
    [isZh ? '营收同比' : 'Revenue YoY', fmtPctVal(f.revenue_yoy_pct)],
    [isZh ? '毛利 (百万美元)' : 'Gross Profit (USD M)', fmtVal(f.gross_profit_usd_m)],
    [isZh ? '毛利同比' : 'Gross Profit YoY', fmtPctVal(f.gross_profit_yoy_pct)],
    [isZh ? '营业利润 (百万美元)' : 'Operating Income (USD M)', fmtVal(f.operating_income_usd_m)],
    [isZh ? '净利润 (百万美元)' : 'Net Income (USD M)', fmtVal(f.net_income_usd_m)],
    [isZh ? '净利润同比' : 'Net Income YoY', fmtPctVal(f.net_income_yoy_pct)],
    [isZh ? '调整后 EBITDA (百万美元)' : 'Adj. EBITDA (USD M)', fmtVal(f.adjusted_ebitda_usd_m)],
    [isZh ? 'EBITDA 同比' : 'EBITDA YoY', fmtPctVal(f.adjusted_ebitda_yoy_pct)],
    ['', ''],
    [isZh ? 'EPS（摊薄）' : 'EPS (Diluted)', f.eps_diluted != null ? f.eps_diluted.toFixed(2) : '—'],
    [isZh ? '流通股数 (百万)' : 'Shares Outstanding (M)', f.shares_outstanding_m != null ? f.shares_outstanding_m.toFixed(2) : '—'],
    [isZh ? '现金及等价物 (百万美元)' : 'Cash & Equivalents (USD M)', fmtVal(f.cash_and_equivalents_usd_m)],
    [isZh ? 'BTC 持仓' : 'BTC Holdings', f.btc_held != null ? f.btc_held.toLocaleString() + ' BTC' : '—'],
    [isZh ? '总债务 (百万美元)' : 'Total Debt (USD M)', fmtVal(f.total_debt_usd_m)],
    ['', ''],
    [isZh ? '备注' : 'Notes', f.notes || '—'],
  ];

  const fullHtml = `
    <div style="margin-top:16px;border-top:1px solid var(--border-subtle);padding-top:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;cursor:pointer;" onclick="this.parentElement.querySelector('.fin-detail-body').classList.toggle('collapsed');this.querySelector('.fin-toggle').classList.toggle('open');">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);">${isZh ? '完整财报数据' : 'Full Report Data'}</div>
        <span class="fin-toggle ${showFull ? 'open' : ''}" style="font-size:10px;color:var(--text-muted);transition:transform 0.2s;">&#9660;</span>
      </div>
      <div class="fin-detail-body ${showFull ? '' : 'collapsed'}">
        <table style="width:100%;font-size:12px;">
          ${allFields.map(([label, val]) =>
            label === '' ? '<tr><td colspan="2" style="height:8px;"></td></tr>' :
            `<tr>
              <td style="padding:5px 10px 5px 0;color:var(--text-muted);white-space:nowrap;width:40%;vertical-align:top;">${label}</td>
              <td style="padding:5px 0;font-family:var(--font-mono);color:var(--text-primary);word-break:break-word;">${val}</td>
            </tr>`
          ).join('')}
        </table>
      </div>
    </div>`;
  document.getElementById('finDetailFull').innerHTML = fullHtml;

  document.getElementById('finDetailModal').classList.add('open');
}

function fmtVal(v) { return v != null ? (v < 0 ? '' : '') + v.toFixed(1) : '—'; }
function fmtPctVal(v) { return v != null ? (v > 0 ? '+' : '') + v.toFixed(1) + '%' : '—'; }

function renderFinPagination(total, totalPages) {
  let container = document.getElementById('finPagination');
  if (!container) {
    // Create pagination container after the table
    const table = document.getElementById('financialsBody');
    if (!table) return;
    container = document.createElement('div');
    container.id = 'finPagination';
    container.className = 'pagination-bar';
    table.closest('table').parentNode.appendChild(container);
  }
  if (total <= FIN_PER_PAGE) { container.innerHTML = ''; return; }

  let html = `<span class="pagination-info">${total} ${currentLang === 'zh' ? '条记录' : 'records'}</span>`;
  html += `<button class="pagination-btn" ${finPage <= 1 ? 'disabled' : ''} onclick="finPage--;renderFinancialsTable();">&#8249;</button>`;
  const maxShow = 5;
  let startP = Math.max(1, finPage - Math.floor(maxShow / 2));
  let endP = Math.min(totalPages, startP + maxShow - 1);
  if (endP - startP < maxShow - 1) startP = Math.max(1, endP - maxShow + 1);
  if (startP > 1) html += `<button class="pagination-btn" onclick="finPage=1;renderFinancialsTable();">1</button><span class="pagination-dots">…</span>`;
  for (let p = startP; p <= endP; p++) {
    html += `<button class="pagination-btn ${p === finPage ? 'active' : ''}" onclick="finPage=${p};renderFinancialsTable();">${p}</button>`;
  }
  if (endP < totalPages) html += `<span class="pagination-dots">…</span><button class="pagination-btn" onclick="finPage=${totalPages};renderFinancialsTable();">${totalPages}</button>`;
  html += `<button class="pagination-btn" ${finPage >= totalPages ? 'disabled' : ''} onclick="finPage++;renderFinancialsTable();">&#8250;</button>`;
  container.innerHTML = html;
}

// ── EARNINGS CALENDAR (monthly grid view) ─────────────────────────────────

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-indexed

function renderEarningsCalendar_grid() {
  const grid = document.getElementById('earningsCalGrid');
  if (!grid) return;

  const label = document.getElementById('calLabel');
  const monthNamesZh = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  const monthNamesEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const mNames = currentLang === 'zh' ? monthNamesZh : monthNamesEn;
  if (label) label.textContent = currentLang === 'zh' ? `${calYear} 年 ${mNames[calMonth]}` : `${mNames[calMonth]} ${calYear}`;

  // Build date → events map for this month
  // Deduplicate: for each (ticker, report_date), keep only the latest fiscal period
  const events = {};
  const seen = {}; // key: "ticker|dateStr" → best record
  FINANCIALS.forEach(f => {
    const dateStr = f.is_reported ? f.report_date : f.estimated_report_date;
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (d.getFullYear() !== calYear || d.getMonth() !== calMonth) return;
    const key = `${f.ticker}|${dateStr}`;
    const prev = seen[key];
    if (!prev || f.fiscal_year > prev.fiscal_year ||
        (f.fiscal_year === prev.fiscal_year && (f.fiscal_quarter === 'FY' || f.fiscal_quarter > prev.fiscal_quarter))) {
      seen[key] = f;
    }
  });
  Object.values(seen).forEach(f => {
    const dateStr = f.is_reported ? f.report_date : f.estimated_report_date;
    const day = new Date(dateStr).getDate();
    if (!events[day]) events[day] = [];
    events[day].push(f);
  });

  // Calendar grid
  const firstDay = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === calYear && today.getMonth() === calMonth;
  const todayDate = today.getDate();

  const weekdays = currentLang === 'zh' ? ['日','一','二','三','四','五','六'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = '<div class="cal-header-row">';
  weekdays.forEach(w => { html += `<div class="cal-weekday">${w}</div>`; });
  html += '</div><div class="cal-body">';

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="cal-cell cal-empty"></div>';
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = isCurrentMonth && d === todayDate;
    const hasEvents = events[d] && events[d].length > 0;
    const isWeekend = (firstDay + d - 1) % 7 === 0 || (firstDay + d - 1) % 7 === 6;

    let cls = 'cal-cell';
    if (isToday) cls += ' cal-today';
    if (hasEvents) cls += ' cal-has-event';
    if (isWeekend) cls += ' cal-weekend';

    html += `<div class="${cls}">`;
    html += `<div class="cal-day-num">${d}</div>`;

    if (hasEvents) {
      // Sort: reported first, then estimated; group by ticker
      const sorted = events[d].sort((a, b) => {
        if (a.is_reported !== b.is_reported) return a.is_reported ? -1 : 1;
        return a.ticker.localeCompare(b.ticker);
      });
      // Show up to 3 events, then "+N more"
      const show = sorted.slice(0, 3);
      const more = sorted.length - 3;
      show.forEach(f => {
        const dotCls = f.is_reported ? 'cal-dot-reported' : 'cal-dot-upcoming';
        const tipStatus = f.is_reported ? (currentLang === 'zh' ? '已披露' : 'Reported') : (currentLang === 'zh' ? '预计' : 'Expected');
        // Show compact period: e.g. "FY25", "Q1'26"
        const yr = (f.fiscal_year % 100).toString().padStart(2, '0');
        const shortPeriod = f.fiscal_quarter === 'FY' ? `FY${yr}` : `${f.fiscal_quarter}'${yr}`;
        html += `<div class="cal-event ${dotCls}" title="${f.ticker} ${f.period_label} — ${tipStatus}">`;
        html += `<span class="cal-evt-ticker">${f.ticker}</span>`;
        html += `<span class="cal-evt-period">${shortPeriod}</span>`;
        html += '</div>';
      });
      if (more > 0) {
        html += `<div class="cal-event-more">+${more}</div>`;
      }
    }
    html += '</div>';
  }

  // Pad remaining cells
  const totalCells = firstDay + daysInMonth;
  const remaining = (7 - totalCells % 7) % 7;
  for (let i = 0; i < remaining; i++) {
    html += '<div class="cal-cell cal-empty"></div>';
  }

  html += '</div>';
  grid.innerHTML = html;
}

function setupCalendarNav() {
  const prev = document.getElementById('calPrev');
  const next = document.getElementById('calNext');
  if (prev) prev.onclick = () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderEarningsCalendar_grid();
  };
  if (next) next.onclick = () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderEarningsCalendar_grid();
  };
}

function renderRevenueChart() {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;

  // Latest reported financials per company, sorted by revenue
  const latestMap = {};
  FINANCIALS.filter(f => f.is_reported && f.revenue_usd_m).forEach(f => {
    if (!latestMap[f.ticker] || f.period_end_date > latestMap[f.ticker].period_end_date) {
      latestMap[f.ticker] = f;
    }
  });
  const data = Object.values(latestMap).sort((a, b) => b.revenue_usd_m - a.revenue_usd_m);
  const labels = data.map(f => f.ticker);
  const revData = data.map(f => f.revenue_usd_m);
  const ebitdaData = data.map(f => f.adjusted_ebitda_usd_m || 0);

  // Highlight FUFU with distinct color
  const revBg = labels.map(l => l === 'FUFU' ? 'rgba(245,158,11,0.85)' : 'rgba(59,130,246,0.7)');
  const revBorder = labels.map(l => l === 'FUFU' ? '#f59e0b' : '#3b82f6');
  const ebitdaBg = labels.map(l => l === 'FUFU' ? 'rgba(251,191,36,0.75)' : 'rgba(16,185,129,0.7)');
  const ebitdaBorder = labels.map(l => l === 'FUFU' ? '#fbbf24' : '#10b981');

  const cc = chartColors();
  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: t('js.revenue_label'), data: revData, backgroundColor: revBg, borderColor: revBorder, borderWidth: 1, borderRadius: 4 },
        { label: t('js.ebitda_label'), data: ebitdaData, backgroundColor: ebitdaBg, borderColor: ebitdaBorder, borderWidth: 1, borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: cc.legend, font: { size: 11, family: 'Inter' } } },
        tooltip: {
          backgroundColor: cc.tooltip.bg,
          borderColor: cc.tooltip.border,
          borderWidth: 1,
          titleColor: cc.tooltip.title,
          bodyColor: cc.tooltip.body,
          callbacks: { label: ctx => `${ctx.dataset.label}: $${ctx.raw.toFixed(1)}M` }
        }
      },
      scales: {
        x: { ticks: { color: cc.tick, font: { size: 11, family: 'JetBrains Mono' } }, grid: { color: cc.grid } },
        y: { ticks: { color: cc.tick, font: { size: 10 }, callback: v => `$${v}M` }, grid: { color: cc.grid } }
      }
    }
  });
}

function setupFinancialFilters() {
  // Company autocomplete
  const input = document.getElementById('fin-company-input');
  const dropdown = document.getElementById('fin-company-dropdown');
  if (input && !input._init) {
    input._init = true;
    input.placeholder = t('filter.all_companies');

    function showDropdown(query) {
      const q = (query || '').toUpperCase().trim();
      let items = [{ ticker: 'ALL', label: t('filter.all_companies') }];
      COMPANIES.forEach(co => {
        items.push({ ticker: co.ticker, label: `${co.ticker} · ${co.name}` });
      });
      if (q) {
        items = items.filter(it => it.ticker.includes(q) || it.label.toUpperCase().includes(q));
      }
      if (!items.length) {
        dropdown.innerHTML = `<div class="ac-item ac-empty">${t('js.no_data')}</div>`;
      } else {
        dropdown.innerHTML = items.map(it =>
          `<div class="ac-item" data-value="${it.ticker}">${it.label}</div>`
        ).join('');
      }
      dropdown.classList.add('open');
    }

    input.addEventListener('focus', () => showDropdown(input.value));
    input.addEventListener('input', () => showDropdown(input.value));

    const clearBtn = document.getElementById('fin-company-clear');

    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.ac-item[data-value]');
      if (!item) return;
      const val = item.dataset.value;
      finCurrentCompany = val;
      input.value = val === 'ALL' ? '' : item.textContent;
      input.placeholder = val === 'ALL' ? t('filter.all_companies') : '';
      dropdown.classList.remove('open');
      if (clearBtn) clearBtn.style.display = val === 'ALL' ? 'none' : 'flex';
      finPage = 1; renderFinancialsTable();
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        finCurrentCompany = 'ALL';
        input.value = '';
        input.placeholder = t('filter.all_companies');
        clearBtn.style.display = 'none';
        finPage = 1; renderFinancialsTable();
      });
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#fin-company-ac-wrapper')) {
        dropdown.classList.remove('open');
      }
    });
  }

  // Period filter (year + quarter selects)
  const yearSelect = document.getElementById('fin-year-select');
  const quarterSelect = document.getElementById('fin-quarter-select');
  if (yearSelect && !yearSelect._init) {
    yearSelect._init = true;
    yearSelect.addEventListener('change', () => { finPage = 1; renderFinancialsTable(); });
  }
  if (quarterSelect && !quarterSelect._init) {
    quarterSelect._init = true;
    quarterSelect.addEventListener('change', () => { finPage = 1; renderFinancialsTable(); });
  }
}

// ── PAGE: OPERATIONS ────────────────────────────────────────────────────────

function renderOperations() {
  // Dynamically populate month filter from operational data
  const periods = [...new Set(OPERATIONAL.map(o => o.period))].sort().reverse();
  const sel = document.getElementById('ops-month-filter');
  if (sel && periods.length) {
    sel.innerHTML = periods.map(p => {
      const label = OPERATIONAL.find(o => o.period === p);
      return `<option value="${p}">${label ? label.period_label : p}</option>`;
    }).join('');
  }
  // Default to the period with the most companies reporting
  const periodCounts = {};
  periods.forEach(p => { periodCounts[p] = OPERATIONAL.filter(o => o.period === p).length; });
  const bestPeriod = periods.reduce((best, p) => periodCounts[p] > periodCounts[best] ? p : best, periods[0]) || '2025-01';
  if (sel) sel.value = bestPeriod;

  // Update op-highlights dynamically
  updateOpsHighlights(bestPeriod);

  renderOpsTable(bestPeriod);
  renderBtcProductionChart();
  setupOpsFilters();
}

function updateOpsHighlights(period) {
  const data = OPERATIONAL.filter(o => o.period === period);
  const periodLabel = data.length && data[0].period_label ? data[0].period_label : period;

  // Total BTC mined
  const totalMined = data.reduce((s, o) => s + (o.btc_mined || 0), 0);
  const el1 = document.getElementById('ops-total-mined');
  if (el1) el1.textContent = totalMined > 0 ? totalMined.toLocaleString() : '—';
  const sub1 = document.getElementById('ops-mined-sub');
  if (sub1) sub1.textContent = totalMined > 0 ? `BTC / ${periodLabel}` : '';

  // Total hashrate
  const totalHash = data.reduce((s, o) => s + (o.hash_rate_eh || 0), 0);
  const el2 = document.getElementById('ops-total-hashrate');
  if (el2) el2.textContent = totalHash > 0 ? `${totalHash.toFixed(1)} EH/s` : '—';
  const sub2 = document.getElementById('ops-hashrate-sub');
  if (sub2) sub2.textContent = totalHash > 0 ? `${data.filter(o => o.hash_rate_eh > 0).length} ${t('stats.companies_disclosed')}` : '';

  // Total BTC held
  const totalHeld = data.reduce((s, o) => s + (o.btc_held || 0), 0);
  const el3 = document.getElementById('ops-total-btc-held');
  if (el3) el3.textContent = totalHeld > 0 ? totalHeld.toLocaleString() : '—';

  // Lowest power cost
  const withPower = data.filter(o => o.avg_power_cost_cents_kwh > 0);
  if (withPower.length) {
    const lowest = withPower.reduce((min, o) => o.avg_power_cost_cents_kwh < min.avg_power_cost_cents_kwh ? o : min);
    const el4 = document.getElementById('ops-lowest-power');
    if (el4) el4.textContent = `${lowest.avg_power_cost_cents_kwh.toFixed(1)}¢/kWh`;
    const sub4 = document.getElementById('ops-power-sub');
    if (sub4) sub4.textContent = lowest.ticker;
  }
}

function renderOpsTable(period) {
  const body = document.getElementById('opsBody');
  const data = OPERATIONAL.filter(o => o.period === period)
    .sort((a, b) => (b.btc_mined||0) - (a.btc_mined||0));

  if (!data.length) {
    body.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:32px;color:var(--text-muted);">${t('js.no_month_data')}</td></tr>`;
    return;
  }

  body.innerHTML = data.map(o => {
    const co = COMPANIES.find(c => c.ticker === o.ticker);
    const utilization = o.installed_capacity_eh && o.hash_rate_eh ? ((o.hash_rate_eh / o.installed_capacity_eh) * 100).toFixed(0) + '%' : '—';
    const srcLink = o.source_url ? `<a href="${o.source_url}" target="_blank" style="color:var(--accent-blue);font-size:10px;">${t('js.link')}</a>` : '<span class="no-data">—</span>';

    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:6px;">
          ${companyLogo(o.ticker, 20)}
          <div style="display:flex;flex-direction:column;gap:1px;">
            <span class="td-ticker">${o.ticker}</span>
            <span style="font-size:10px;color:var(--text-muted);">${co ? co.name : ''}</span>
          </div>
        </div>
      </td>
      <td class="td-mono">${o.period_label}</td>
      <td class="td-right td-mono td-primary">${o.btc_mined != null ? o.btc_mined.toLocaleString() : '—'}</td>
      <td class="td-right td-mono">${o.btc_held != null ? o.btc_held.toLocaleString() : '—'}</td>
      <td class="td-right td-mono" style="color:${o.btc_sold === 0 ? 'var(--green)' : 'var(--text-secondary)'};">${o.btc_sold != null ? o.btc_sold.toLocaleString() : '—'}</td>
      <td class="td-right td-mono td-primary">${o.hash_rate_eh != null ? o.hash_rate_eh.toFixed(1) : '—'}</td>
      <td class="td-right td-mono" style="color:var(--text-muted);">${o.installed_capacity_eh != null ? o.installed_capacity_eh.toFixed(1) : '—'} <span style="font-size:9px;color:var(--text-disabled);">(${utilization})</span></td>
      <td class="td-right td-mono">${o.power_capacity_mw != null ? o.power_capacity_mw.toLocaleString() : '—'}</td>
      <td class="td-right td-mono" style="color:${o.fleet_efficiency_j_th && o.fleet_efficiency_j_th < 22 ? 'var(--green)' : 'var(--text-secondary)'};">${o.fleet_efficiency_j_th != null ? o.fleet_efficiency_j_th.toFixed(1) : '—'}</td>
      <td class="td-right td-mono" style="color:${o.avg_power_cost_cents_kwh && o.avg_power_cost_cents_kwh < 4 ? 'var(--green)' : 'var(--text-secondary)'};">${o.avg_power_cost_cents_kwh != null ? o.avg_power_cost_cents_kwh.toFixed(1) + '¢' : '—'}</td>
      <td>${srcLink}</td>
    </tr>`;
  }).join('');
}

function renderBtcProductionChart() {
  const canvas = document.getElementById('btcProductionChart');
  if (!canvas) return;

  // Dynamically find top tickers with btc_mined data and available periods
  const allPeriods = [...new Set(OPERATIONAL.map(o => o.period))].sort();
  const periods = allPeriods.slice(-3); // Last 3 months
  const periodLabels = periods.map(p => {
    const o = OPERATIONAL.find(op => op.period === p);
    return o ? o.period_label : p;
  });
  // Top 5 tickers by total btc_mined
  const tickerTotals = {};
  OPERATIONAL.filter(o => o.btc_mined).forEach(o => { tickerTotals[o.ticker] = (tickerTotals[o.ticker]||0) + o.btc_mined; });
  const tickers = Object.entries(tickerTotals).sort((a,b) => b[1]-a[1]).slice(0,5).map(([t]) => t);
  const colors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4'];

  const datasets = tickers.map((ticker, i) => {
    const data = periods.map(p => {
      const o = OPERATIONAL.find(op => op.ticker === ticker && op.period === p);
      return o ? o.btc_mined : null;
    });
    return { label: ticker, data, borderColor: colors[i], backgroundColor: colors[i] + '20', fill: false, tension: 0.3, borderWidth: 2, pointRadius: 4, pointBackgroundColor: colors[i] };
  });

  const cc2 = chartColors();
  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(canvas, {
    type: 'line',
    data: { labels: periodLabels, datasets },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: cc2.legend, font: { size: 11, family: 'Inter' }, usePointStyle: true } },
        tooltip: {
          backgroundColor: cc2.tooltip.bg, borderColor: cc2.tooltip.border, borderWidth: 1,
          titleColor: cc2.tooltip.title, bodyColor: cc2.tooltip.body,
          callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw} BTC` }
        }
      },
      scales: {
        x: { ticks: { color: cc2.tick, font: { size: 11, family: 'JetBrains Mono' } }, grid: { color: cc2.grid } },
        y: { ticks: { color: cc2.tick, font: { size: 10 } }, grid: { color: cc2.grid } }
      }
    }
  });
}

function setupOpsFilters() {
  const sel = document.getElementById('ops-month-filter');
  if (sel && !sel._init) {
    sel._init = true;
    sel.addEventListener('change', () => renderOpsTable(sel.value));
  }
}

// ── PAGE: NEWS ──────────────────────────────────────────────────────────────

let newsFilterCat = 'all';
let newsFilterCompany = 'ALL';

function renderNews() {
  renderNewsList();
  renderNewsCharts();
  setupNewsFilters();
}

function getFilteredNews() {
  let data = [...NEWS];
  if (newsFilterCat !== 'all') data = data.filter(n => n.category === newsFilterCat);
  if (newsFilterCompany !== 'ALL') data = data.filter(n => n.ticker === newsFilterCompany || n.ticker === null);
  return data.sort((a, b) => b.published_at.localeCompare(a.published_at));
}

function renderNewsList() {
  const list = document.getElementById('newsList');
  const count = document.getElementById('newsCount');
  const data = getFilteredNews();
  count.textContent = `(${data.length})`;

  list.innerHTML = data.map(n => {
    const pubDate = new Date(n.published_at);
    const dateLabel = pubDate.toLocaleDateString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit' });
    const sentDot = n.sentiment === 'positive' ? 'dot-positive' : n.sentiment === 'negative' ? 'dot-negative' : '';

    return `
      <div class="news-item" onclick="this.classList.toggle('expanded')">
        <div class="news-item-header">
          <span class="news-cat-badge ${categoryClass(n.category)}">${categoryLabel(n.category)}</span>
          ${n.ticker ? `<span class="ticker-badge" style="font-size:9px;padding:2px 5px;">${n.ticker}</span>` : ''}
          <span class="news-sentiment-dot ${sentDot}" style="margin-left:auto;"></span>
        </div>
        <div class="news-title">${n.title_cn || n.title}</div>
        <div class="news-meta">
          <span class="news-source">${n.source}</span>
          <span>·</span>
          <span>${dateLabel}</span>
        </div>
        <div class="news-summary">${n.summary}</div>
      </div>`;
  }).join('');
}

function renderNewsCharts() {
  // ── Sentiment ring (pure CSS conic-gradient) ──
  const ringEl = document.getElementById('newsSentimentRing');
  if (ringEl) {
    const pos = NEWS.filter(n => n.sentiment === 'positive').length;
    const neg = NEWS.filter(n => n.sentiment === 'negative').length;
    const neu = NEWS.filter(n => n.sentiment === 'neutral').length;
    const total = pos + neg + neu || 1;
    const pPos = (pos / total * 100).toFixed(1);
    const pNeg = (neg / total * 100).toFixed(1);
    const pNeu = (neu / total * 100).toFixed(1);
    const a1 = pos / total * 360;
    const a2 = a1 + neg / total * 360;

    ringEl.innerHTML = `
      <div class="css-ring-wrap">
        <div class="css-ring" style="background:conic-gradient(
          rgba(16,185,129,0.85) 0deg ${a1}deg,
          rgba(239,68,68,0.85) ${a1}deg ${a2}deg,
          rgba(96,96,96,0.6) ${a2}deg 360deg
        );">
          <div class="css-ring-hole">
            <span class="css-ring-total">${total}</span>
            <span class="css-ring-label">${currentLang === 'zh' ? '总计' : 'Total'}</span>
          </div>
        </div>
        <div class="css-ring-legend">
          <div class="css-ring-legend-item"><span class="css-dot" style="background:rgba(16,185,129,0.85);"></span>${t('js.positive')} <b>${pos}</b> (${pPos}%)</div>
          <div class="css-ring-legend-item"><span class="css-dot" style="background:rgba(239,68,68,0.85);"></span>${t('js.negative')} <b>${neg}</b> (${pNeg}%)</div>
          <div class="css-ring-legend-item"><span class="css-dot" style="background:rgba(96,96,96,0.6);"></span>${t('js.neutral')} <b>${neu}</b> (${pNeu}%)</div>
        </div>
      </div>`;
  }

  // ── Category horizontal bars (pure HTML/CSS) ──
  const barsEl = document.getElementById('newsCategoryBars');
  if (barsEl) {
    const cats = {};
    NEWS.forEach(n => { cats[n.category] = (cats[n.category] || 0) + 1; });
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const maxVal = sorted.length ? sorted[0][1] : 1;

    barsEl.innerHTML = `<div class="css-bars">
      ${sorted.map(([cat, count]) => {
        const pct = (count / maxVal * 100).toFixed(0);
        return `<div class="css-bar-row">
          <div class="css-bar-label">${categoryLabel(cat)}</div>
          <div class="css-bar-track">
            <div class="css-bar-fill" style="width:${pct}%;"></div>
          </div>
          <div class="css-bar-value">${count}</div>
        </div>`;
      }).join('')}
    </div>`;
  }
}

function setupNewsFilters() {
  document.querySelectorAll('[data-news-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-news-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      newsFilterCat = btn.dataset.newsFilter;
      renderNewsList();
    });
  });

  const sel = document.getElementById('news-company-filter');
  if (sel && !sel._init) {
    sel._init = true;
    // Populate company options from data
    COMPANIES.forEach(co => {
      const opt = document.createElement('option');
      opt.value = co.ticker; opt.textContent = co.ticker;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => { newsFilterCompany = sel.value; renderNewsList(); });
  }
}

// ── PAGE: SENTIMENT ─────────────────────────────────────────────────────────

function renderSentiment() {
  setupSentimentFilters();
  renderRatingsTable();
  renderRatingsPieChart();
  renderTargetPriceTable();
  renderSocialSentiment();
  // Update sentiment date badge
  const dateBadge = document.getElementById('sentimentDateBadge');
  if (dateBadge) {
    const dates = SENTIMENT.social_sentiment.map(s => s.date || s.updated_at).filter(Boolean).sort().reverse();
    dateBadge.textContent = dates.length ? dates[0] : new Date().toISOString().slice(0, 10);
  }
}

function getFilteredRatings() {
  let data = [...SENTIMENT.analyst_ratings].sort((a, b) => b.date.localeCompare(a.date));
  if (sentimentFilterTicker !== 'ALL') data = data.filter(r => r.ticker === sentimentFilterTicker);
  if (sentimentFilterRating !== 'ALL') data = data.filter(r => r.rating_normalized === sentimentFilterRating);
  return data;
}

function renderRatingsTable() {
  const body = document.getElementById('ratingsBody');
  const allData = getFilteredRatings();
  const totalPages = Math.max(1, Math.ceil(allData.length / SENTIMENT_PAGE_SIZE));
  if (sentimentPage > totalPages) sentimentPage = totalPages;
  const start = (sentimentPage - 1) * SENTIMENT_PAGE_SIZE;
  const data = allData.slice(start, start + SENTIMENT_PAGE_SIZE);

  body.innerHTML = data.map((r, idx) => {
    const co = COMPANIES.find(c => c.ticker === r.ticker);
    const targetDelta = r.target_price_usd && r.prev_target_price_usd
      ? ((r.target_price_usd / r.prev_target_price_usd - 1) * 100)
      : null;
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:6px;">
          ${companyLogo(r.ticker, 20)}
          <div style="display:flex;flex-direction:column;gap:1px;">
            <span class="td-ticker">${r.ticker}</span>
            <span style="font-size:10px;color:var(--text-muted);">${co ? co.name : ''}</span>
          </div>
        </div>
      </td>
      <td class="td-primary" style="font-size:11px;">${r.analyst_firm}</td>
      <td><span class="rating-badge ${ratingClass(r.rating_normalized)}">${r.rating}</span></td>
      <td class="td-right td-mono">
        ${r.target_price_usd ? `$${r.target_price_usd.toFixed(2)}` : '<span class="no-data">—</span>'}
        ${targetDelta != null ? `<span style="font-size:9px;color:${targetDelta>=0?'var(--green)':'var(--red)'};">${targetDelta>=0?'↑':'↓'}${Math.abs(targetDelta).toFixed(0)}%</span>` : ''}
      </td>
      <td>${actionLabel(r.action)}</td>
      <td class="td-mono" style="color:var(--text-muted);">${r.date}</td>
      <td><span class="note-link" onclick="openRatingDetail(${start + idx})" style="cursor:pointer;color:var(--accent-blue);font-size:10px;max-width:180px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.note ? r.note.substring(0, 50) + (r.note.length > 50 ? '…' : '') : '—'}</span></td>
    </tr>`;
  }).join('');

  // Render pagination
  renderRatingsPagination(allData.length, totalPages);
}

function renderRatingsPagination(total, totalPages) {
  let container = document.getElementById('ratingsPagination');
  if (!container) {
    const wrapper = document.getElementById('ratingsTable').parentElement;
    container = document.createElement('div');
    container.id = 'ratingsPagination';
    container.className = 'pagination-bar';
    wrapper.parentElement.appendChild(container);
  }
  if (totalPages <= 1) { container.innerHTML = `<span class="pagination-info">${total} ${t('js.items_total') || 'items'}</span>`; return; }

  let html = `<span class="pagination-info">${total} ${t('js.items_total') || 'items'}</span>`;
  html += `<button class="pagination-btn" ${sentimentPage <= 1 ? 'disabled' : ''} onclick="sentimentPage--;renderRatingsTable();">&#8249;</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (totalPages > 7 && p > 2 && p < totalPages - 1 && Math.abs(p - sentimentPage) > 1) {
      if (p === 3 || p === totalPages - 2) html += '<span class="pagination-ellipsis">…</span>';
      continue;
    }
    html += `<button class="pagination-btn ${p === sentimentPage ? 'active' : ''}" onclick="sentimentPage=${p};renderRatingsTable();">${p}</button>`;
  }
  html += `<button class="pagination-btn" ${sentimentPage >= totalPages ? 'disabled' : ''} onclick="sentimentPage++;renderRatingsTable();">&#8250;</button>`;
  container.innerHTML = html;
}

function openRatingDetail(globalIdx) {
  const allData = getFilteredRatings();
  const r = allData[globalIdx];
  if (!r) return;
  const co = COMPANIES.find(c => c.ticker === r.ticker);
  const overlay = document.getElementById('ratingDetailModal');
  overlay.querySelector('.modal').innerHTML = `
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        ${companyLogo(r.ticker, 28)}
        <div>
          <span class="ticker-badge">${r.ticker}</span>
          <span style="font-size:14px;font-weight:600;margin-left:6px;">${co ? co.full_name : r.ticker}</span>
        </div>
      </div>
      <button class="modal-close" onclick="document.getElementById('ratingDetailModal').classList.remove('open');">✕</button>
    </div>
    <div class="rating-detail-grid">
      <div class="rating-detail-item"><div class="rating-detail-label">${t('th.firm') || 'Firm'}</div><div class="rating-detail-value">${r.analyst_firm}</div></div>
      <div class="rating-detail-item"><div class="rating-detail-label">${t('th.rating') || 'Rating'}</div><div class="rating-detail-value"><span class="rating-badge ${ratingClass(r.rating_normalized)}">${r.rating}</span></div></div>
      <div class="rating-detail-item"><div class="rating-detail-label">${t('th.action') || 'Action'}</div><div class="rating-detail-value">${actionLabel(r.action)}</div></div>
      <div class="rating-detail-item"><div class="rating-detail-label">${t('th.target_price') || 'Target'}</div><div class="rating-detail-value">${r.target_price_usd ? '$' + r.target_price_usd.toFixed(2) : '—'}${r.prev_target_price_usd ? ' <span style="font-size:11px;color:var(--text-muted);">(prev: $' + r.prev_target_price_usd.toFixed(2) + ')</span>' : ''}</div></div>
      <div class="rating-detail-item"><div class="rating-detail-label">${t('th.date') || 'Date'}</div><div class="rating-detail-value">${r.date}</div></div>
      <div class="rating-detail-item"><div class="rating-detail-label">${t('js.source') || 'Source'}</div><div class="rating-detail-value">${r.source_url ? `<a href="${r.source_url}" target="_blank" rel="noopener" style="color:var(--accent-blue);text-decoration:underline;">${r.analyst_firm}</a>` : (r.analyst_firm || '—')}</div></div>
    </div>
    <div style="margin-top:16px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-muted);margin-bottom:8px;">${t('th.notes') || 'Notes'}</div>
      <div style="font-size:13px;line-height:1.6;color:var(--text-secondary);background:var(--bg-elevated);padding:14px;border-radius:var(--radius-md);">${r.note || '—'}</div>
    </div>
    ${r.source_url ? `<div style="margin-top:12px;text-align:right;"><a href="${r.source_url}" target="_blank" rel="noopener" style="color:var(--accent-blue);font-size:12px;">View Original Report ↗</a></div>` : ''}`;
  overlay.classList.add('open');
}

function setupSentimentFilters() {
  const filterBar = document.getElementById('sentimentFilterBar');
  if (!filterBar || filterBar._init) return;
  filterBar._init = true;

  // Company filter
  const tickerSelect = document.getElementById('sentimentTickerFilter');
  const tickers = [...new Set(SENTIMENT.analyst_ratings.map(r => r.ticker))].sort();
  tickerSelect.innerHTML = `<option value="ALL">${t('filter.all_companies') || 'All'}</option>` +
    tickers.map(tk => `<option value="${tk}">${tk}</option>`).join('');
  tickerSelect.addEventListener('change', () => {
    sentimentFilterTicker = tickerSelect.value;
    sentimentPage = 1;
    renderRatingsTable();
  });

  // Rating filter
  const ratingSelect = document.getElementById('sentimentRatingFilter');
  ratingSelect.addEventListener('change', () => {
    sentimentFilterRating = ratingSelect.value;
    sentimentPage = 1;
    renderRatingsTable();
  });
}

function renderRatingsPieChart() {
  const canvas = document.getElementById('ratingsPieChart');
  if (!canvas) return;
  // Set explicit size for responsive:false
  const container = canvas.parentElement;
  const w = container.clientWidth || 280;
  canvas.width = w;
  canvas.height = Math.min(w, 220);

  const buy = SENTIMENT.analyst_ratings.filter(r => r.rating_normalized === 'buy').length;
  const hold = SENTIMENT.analyst_ratings.filter(r => r.rating_normalized === 'hold').length;
  const sell = SENTIMENT.analyst_ratings.filter(r => r.rating_normalized === 'sell').length;

  const cc5 = chartColors();
  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: [`${t('js.buy')} (${buy})`, `${t('js.hold')} (${hold})`, `${t('js.sell')} (${sell})`],
      datasets: [{ data: [buy, hold, sell], backgroundColor: ['rgba(16,185,129,0.8)','rgba(245,158,11,0.8)','rgba(239,68,68,0.8)'], borderWidth: 0 }]
    },
    options: {
      responsive: false,
      cutout: '60%',
      animation: false,
      animations: { colors: false, x: false, y: false },
      transitions: { active: { animation: { duration: 0 } }, resize: { animation: { duration: 0 } } },
      hover: { mode: null },
      plugins: {
        legend: { position:'bottom', labels: { color: cc5.legend, font: { size: 11 }, padding: 12, usePointStyle: true } },
        tooltip: { mode: 'nearest', backgroundColor: cc5.tooltip.bg, borderColor: cc5.tooltip.border, borderWidth: 1, titleColor: cc5.tooltip.title, bodyColor: cc5.tooltip.body }
      }
    }
  });
}

function renderTargetPriceTable() {
  const body = document.getElementById('targetPriceBody');

  const rows = COMPANIES.map(co => {
    const avg = avgTargetPrice(co.ticker);
    const upside = avg && co.stock_price ? ((avg / co.stock_price - 1) * 100) : null;
    const ratings = getAnalystRatings(co.ticker);
    const buys = ratings.filter(r => r.rating_normalized === 'buy').length;
    const holds = ratings.filter(r => r.rating_normalized === 'hold').length;
    const sells = ratings.filter(r => r.rating_normalized === 'sell').length;
    const consensus = buys > holds && buys > sells ? 'buy' : holds >= buys ? 'hold' : 'sell';
    const consensusLabel = buys > holds && buys > sells ? t('js.buy') : holds >= buys ? t('js.hold') : t('js.sell');

    return { ticker: co.ticker, name: co.name, price: co.stock_price, avg, upside, consensus, consensusLabel };
  }).filter(r => r.avg);

  rows.sort((a, b) => (b.upside||0) - (a.upside||0));

  body.innerHTML = rows.map(r => `<tr>
    <td>
      <div style="display:flex;flex-direction:column;gap:1px;">
        <span class="td-ticker">${r.ticker}</span>
        <span style="font-size:10px;color:var(--text-muted);">${r.name}</span>
      </div>
    </td>
    <td class="td-right td-mono td-primary">$${r.price}</td>
    <td class="td-right td-mono">$${r.avg.toFixed(2)}</td>
    <td class="td-right">
      ${r.upside != null ? `<span class="yoy-badge ${r.upside>=0?'yoy-pos':'yoy-neg'}">${r.upside>=0?'↑':'↓'} ${Math.abs(r.upside).toFixed(1)}%</span>` : '—'}
    </td>
    <td><span class="rating-badge ${ratingClass(r.consensus)}">${r.consensusLabel}</span></td>
  </tr>`).join('');
}

function renderSocialSentiment() {
  const panel = document.getElementById('sentimentPanel');
  const data = [...SENTIMENT.social_sentiment]
    .map(s => ({ ...s, _score: calcSentimentScore(s) }))
    .sort((a, b) => (b._score || 0) - (a._score || 0));

  panel.innerHTML = data.map(s => {
    const co = COMPANIES.find(c => c.ticker === s.ticker);
    const sc = s._score || 0;
    const scoreClass = sc >= 0.1 ? 'score-pos' : sc <= -0.1 ? 'score-neg' : 'score-neu';
    const trendIcon = s.trend_direction === 'up' ? '↑' : s.trend_direction === 'down' ? '↓' : '→';
    const trendColor = s.trend_direction === 'up' ? 'var(--green)' : s.trend_direction === 'down' ? 'var(--red)' : 'var(--text-muted)';
    const scoreDisplay = s.stocktwits_bullish_pct != null ? s.stocktwits_bullish_pct : '—';

    return `
      <div class="sentiment-row">
        <div class="sentiment-header">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="sentiment-ticker">${s.ticker}</span>
            <span style="font-size:10px;color:var(--text-muted);">${co ? co.name : ''}</span>
            ${s.trending ? `<span style="font-size:9px;padding:1px 6px;background:var(--orange-dim);color:var(--orange);border-radius:3px;font-weight:600;">${t('js.trending')}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;" title="${sentimentTooltip(s).replace(/"/g, '&quot;')}">
            <span style="font-size:10px;color:${trendColor};">${trendIcon}</span>
            <span class="sentiment-score-num ${scoreClass}">${scoreDisplay}</span>
            <span style="font-size:9px;color:var(--text-muted);">%</span>
          </div>
        </div>
        <div class="sentiment-bars">
          <div class="sentiment-bar-row">
            <span class="sentiment-bar-label">${t('js.bull_rate')}</span>
            <div class="sentiment-bar-track">
              <div class="sentiment-bar-fill bar-bull" style="width:${s.stocktwits_bullish_pct}%"></div>
            </div>
            <span class="sentiment-bar-val">${s.stocktwits_bullish_pct}%</span>
          </div>
          <div class="sentiment-bar-row">
            <span class="sentiment-bar-label">${t('js.social_heat')}</span>
            <div class="sentiment-bar-track">
              <div class="sentiment-bar-fill bar-social" style="width:${Math.min(100,(s.twitter_x_mentions_24h/40))}%"></div>
            </div>
            <span class="sentiment-bar-val">${s.twitter_x_mentions_24h.toLocaleString()}</span>
          </div>
        </div>
        <div style="margin-top:8px;display:flex;gap:12px;font-size:10px;color:var(--text-muted);">
          <span>Reddit: <span style="color:var(--text-secondary);">${s.reddit_mentions_24h}</span></span>
          <span>X/Twitter: <span style="color:var(--text-secondary);">${s.twitter_x_mentions_24h.toLocaleString()}</span></span>
          <span>StockTwits: <span style="color:${s.stocktwits_bullish_pct>=60?'var(--green)':'var(--text-secondary)'};">${s.stocktwits_bullish_pct}% ${t('js.bullish')}</span></span>
        </div>
      </div>`;
  }).join('');
}

// ── COMPANY MODAL ───────────────────────────────────────────────────────────

function openCompanyModal(ticker) {
  const co = COMPANIES.find(c => c.ticker === ticker);
  if (!co) return;

  const qOrder = {Q1:1, Q2:2, Q3:3, Q4:4, FY:5};
  const allFin = FINANCIALS.filter(f => f.ticker === ticker && f.is_reported)
    .sort((a, b) => {
      if (b.fiscal_year !== a.fiscal_year) return b.fiscal_year - a.fiscal_year;
      return (qOrder[b.fiscal_quarter]||0) - (qOrder[a.fiscal_quarter]||0);
    });
  const latest = allFin[0];

  const modalHeader = document.getElementById('modal-ticker').parentElement;
  // Insert logo before ticker badge if not already present
  const existingLogo = modalHeader.querySelector('.company-logo, .logo-placeholder');
  if (existingLogo) existingLogo.remove();
  modalHeader.insertAdjacentHTML('afterbegin', companyLogo(ticker, 28));
  document.getElementById('modal-ticker').textContent = ticker;
  document.getElementById('modal-name').textContent = co.full_name;
  document.getElementById('modal-desc').textContent = co.description;

  const metrics = document.getElementById('modalMetrics');
  if (latest) {
    // Helper: use latest value, or fall back to last known historical value
    function modalVal(field, formatter, suffix) {
      if (latest[field] != null) return { value: formatter(latest[field]) + (suffix || ''), period: latest.period_label };
      const hist = findLastKnownValue(ticker, field);
      if (hist) return { value: formatter(hist.value) + (suffix || ''), period: hist.period_label };
      return { value: '—', period: null };
    }
    const rev = modalVal('revenue_usd_m', fmt.usd);
    const ni = modalVal('net_income_usd_m', fmt.usd);
    const ebitda = modalVal('adjusted_ebitda_usd_m', fmt.usd);
    const epsV = modalVal('eps_diluted', v => (v>=0?'+':'')+v.toFixed(2));
    // BTC held: check operational data first, then financials with fallback
    let btcVal = { value: '—', period: null };
    const opsRecs = OPERATIONAL.filter(o => o.ticker === ticker && o.btc_held > 0)
      .sort((a, b) => b.period.localeCompare(a.period));
    if (opsRecs.length) {
      btcVal = { value: opsRecs[0].btc_held.toLocaleString() + ' BTC', period: opsRecs[0].period_label || opsRecs[0].period };
    } else {
      const btcHist = findLastKnownValue(ticker, 'btc_held');
      if (btcHist) btcVal = { value: btcHist.value.toLocaleString() + ' BTC', period: btcHist.period_label };
    }
    const debt = modalVal('total_debt_usd_m', fmt.usd);

    metrics.innerHTML = [
      { label:t('js.latest_revenue'), value:rev.value, yoy:latest.revenue_yoy_pct, yoyType:'yoy', period:rev.period },
      { label:t('th.net_income'), value:ni.value, yoy:null, period:ni.period },
      { label:'Adj. EBITDA', value:ebitda.value, yoy:latest.adjusted_ebitda_yoy_pct, yoyType:'yoy', period:ebitda.period },
      { label:t('th.eps'), value:epsV.value, yoy:null, period:epsV.period },
      { label:t('js.btc_held_label'), value:btcVal.value, yoy:null, period:btcVal.period },
      { label:t('js.total_debt'), value:debt.value, yoy:null, period:debt.period },
    ].map(m => `
      <div class="modal-metric">
        <div class="modal-metric-label">${m.label} ${m.period ? `<span style="font-weight:400;">(${m.period})</span>` : ''}</div>
        <div class="modal-metric-value">${m.value}</div>
        ${m.yoy != null ? `<div class="modal-metric-yoy">${fmt.pct(m.yoy, m.yoyType)}</div>` : ''}
      </div>`).join('');
  } else {
    metrics.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">${t('js.no_earnings_data')}</div></div>`;
  }

  // Quarter history
  const histEl = document.getElementById('modalQuarterHistory');
  if (allFin.length > 1) {
    histEl.innerHTML = `
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:10px;">${t('js.quarter_history')}</div>
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>${t('th.period')}</th><th class="td-right">${t('th.revenue')}</th><th class="td-right">YoY</th>
            <th class="td-right">${t('th.net_income')}</th><th class="td-right">Adj.EBITDA</th><th class="td-right">YoY</th><th>${t('th.report_date')}</th>
          </tr></thead>
          <tbody>${allFin.map(f => `<tr>
            <td class="td-mono">${f.period_label}</td>
            <td class="td-right td-mono td-primary">${fmt.usd(f.revenue_usd_m)}</td>
            <td class="td-right">${fmt.pct(f.revenue_yoy_pct, 'yoy')}</td>
            <td class="td-right td-mono" style="color:${f.net_income_usd_m>=0?'var(--green)':'var(--red)'};">${fmt.usd(f.net_income_usd_m)}</td>
            <td class="td-right td-mono td-primary">${fmt.usd(f.adjusted_ebitda_usd_m)}</td>
            <td class="td-right">${fmt.pct(f.adjusted_ebitda_yoy_pct, 'yoy')}</td>
            <td class="td-mono" style="color:var(--text-muted);">${fmt.date(f.report_date)}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>`;
  } else {
    histEl.innerHTML = '';
  }

  document.getElementById('companyModal').classList.add('open');
}

document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('companyModal').classList.remove('open');
});

document.getElementById('companyModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('companyModal')) {
    document.getElementById('companyModal').classList.remove('open');
  }
});

// ── PAGE: ANALYSIS ──────────────────────────────────────────────────────────

let currentAnalysisModel = 'montecarlo';

function renderAnalysis() {
  if (!window.ANALYSIS_MODELS || !Object.keys(window.ANALYSIS_MODELS).length) {
    document.getElementById('analysisInfoPanel').innerHTML =
      '<div class="empty-state"><div class="empty-text">Loading models...</div></div>';
    return;
  }
  setupAnalysisModelSelector();
  renderAnalysisModel(currentAnalysisModel);
}

function setupAnalysisModelSelector() {
  const container = document.getElementById('analysisModelSelector');
  const modelKeys = ['montecarlo', 'kmv', 'altman', 'beneish', 'piotroski', 'jones'];
  container.innerHTML = modelKeys.map(key => {
    const model = window.ANALYSIS_MODELS[key];
    if (!model) return '';
    const info = model.info[currentLang] || model.info.zh;
    const active = key === currentAnalysisModel ? ' active' : '';
    return `<button class="model-tab${active}" data-model="${key}">${info.name}</button>`;
  }).join('');

  container.querySelectorAll('.model-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.model-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAnalysisModel = btn.dataset.model;
      renderAnalysisModel(currentAnalysisModel);
    });
  });
}

function renderAnalysisModel(modelKey) {
  const model = window.ANALYSIS_MODELS[modelKey];
  if (!model) return;
  const lang = currentLang;
  const info = model.info[lang] || model.info.zh;

  // Info Panel
  const panel = document.getElementById('analysisInfoPanel');
  panel.innerHTML = `
    <div class="analysis-info-content">
      <div class="analysis-info-header">
        <h3 class="analysis-model-name">${info.name}</h3>
      </div>
      <p class="analysis-model-desc">${info.description}</p>
      <div class="analysis-pros-cons">
        <div class="analysis-pros">
          <div class="analysis-pc-title">${t('analysis.pros')}</div>
          <ul>${info.pros.map(p => '<li>' + p + '</li>').join('')}</ul>
        </div>
        <div class="analysis-cons">
          <div class="analysis-pc-title">${t('analysis.cons')}</div>
          <ul>${info.cons.map(c => '<li>' + c + '</li>').join('')}</ul>
        </div>
      </div>
    </div>`;

  // Calculate results
  const results = model.calculate(ANALYSIS_DATA);
  ensureFufuFirst(results);

  // Render table
  renderAnalysisTable(modelKey, model, results);

  // Monte Carlo chart area
  const mcArea = document.getElementById('mcChartArea');
  if (modelKey === 'montecarlo') {
    mcArea.style.display = 'block';
    setupMonteCarloSelector(results);
  } else {
    mcArea.style.display = 'none';
  }
}

function renderAnalysisTable(modelKey, model, results) {
  const lang = currentLang;
  const columns = model.columns[lang] || model.columns.zh;
  const thead = document.getElementById('analysisTableHead');
  const tbody = document.getElementById('analysisTableBody');

  thead.innerHTML = '<tr>' + columns.map((col, i) => {
    const cls = i === 0 ? '' : ' class="td-right"';
    return `<th${cls}>${col}</th>`;
  }).join('') + '</tr>';

  if (!results.length) {
    tbody.innerHTML = `<tr><td colspan="${columns.length}" style="text-align:center;padding:32px;color:var(--text-muted);">${t('js.no_data')}</td></tr>`;
    return;
  }

  tbody.innerHTML = results.map(r => {
    const vLabel = r.verdict[lang] || r.verdict.zh;
    const verdictHtml = `<span class="verdict-badge ${r.verdictClass}">${vLabel}</span>`;

    if (modelKey === 'beneish') {
      return `<tr>
        <td><div class="analysis-company-cell"><span class="td-ticker">${r.ticker}</span><span class="analysis-co-name">${r.name}</span></div></td>
        <td class="td-right td-mono">${r.dsri.toFixed(3)}</td>
        <td class="td-right td-mono">${r.gmi.toFixed(3)}</td>
        <td class="td-right td-mono">${r.aqi.toFixed(3)}</td>
        <td class="td-right td-mono">${r.sgi.toFixed(3)}</td>
        <td class="td-right td-mono">${r.depi.toFixed(3)}</td>
        <td class="td-right td-mono">${r.sgai.toFixed(3)}</td>
        <td class="td-right td-mono">${r.tata.toFixed(4)}</td>
        <td class="td-right td-mono">${r.lvgi.toFixed(3)}</td>
        <td class="td-right td-mono td-primary">${r.score.toFixed(2)}</td>
        <td class="td-right">${verdictHtml}</td>
      </tr>`;
    }

    if (modelKey === 'piotroski') {
      const s = r.signals;
      const sig = v => v ? '<span class="text-green">1</span>' : '<span class="text-red">0</span>';
      return `<tr>
        <td><div class="analysis-company-cell"><span class="td-ticker">${r.ticker}</span><span class="analysis-co-name">${r.name}</span></div></td>
        <td class="td-right">${sig(s.roa_pos)}</td>
        <td class="td-right">${sig(s.cfo_pos)}</td>
        <td class="td-right">${sig(s.roa_up)}</td>
        <td class="td-right">${sig(s.cfo_gt_ni)}</td>
        <td class="td-right">${sig(s.leverage_down)}</td>
        <td class="td-right">${sig(s.liquidity_up)}</td>
        <td class="td-right">${sig(s.no_dilution)}</td>
        <td class="td-right">${sig(s.margin_up)}</td>
        <td class="td-right">${sig(s.turnover_up)}</td>
        <td class="td-right td-mono td-primary">${r.score}/9</td>
        <td class="td-right">${verdictHtml}</td>
      </tr>`;
    }

    if (modelKey === 'jones') {
      return `<tr>
        <td><div class="analysis-company-cell"><span class="td-ticker">${r.ticker}</span><span class="analysis-co-name">${r.name}</span></div></td>
        <td class="td-right td-mono">${r.ta_scaled.toFixed(4)}</td>
        <td class="td-right td-mono">${r.nda.toFixed(4)}</td>
        <td class="td-right td-mono">${r.da.toFixed(4)}</td>
        <td class="td-right td-mono td-primary">${r.absDA.toFixed(4)}</td>
        <td class="td-right">${verdictHtml}</td>
      </tr>`;
    }

    if (modelKey === 'altman') {
      return `<tr>
        <td><div class="analysis-company-cell"><span class="td-ticker">${r.ticker}</span><span class="analysis-co-name">${r.name}</span></div></td>
        <td class="td-right td-mono">${r.x1.toFixed(3)}</td>
        <td class="td-right td-mono">${r.x2.toFixed(3)}</td>
        <td class="td-right td-mono">${r.x3.toFixed(3)}</td>
        <td class="td-right td-mono">${r.x4.toFixed(3)}</td>
        <td class="td-right td-mono">${r.x5.toFixed(3)}</td>
        <td class="td-right td-mono td-primary">${r.score.toFixed(2)}</td>
        <td class="td-right">${verdictHtml}</td>
      </tr>`;
    }

    if (modelKey === 'kmv') {
      return `<tr>
        <td><div class="analysis-company-cell"><span class="td-ticker">${r.ticker}</span><span class="analysis-co-name">${r.name}</span></div></td>
        <td class="td-right td-mono">$${r.assetValue.toFixed(0)}M</td>
        <td class="td-right td-mono">$${r.defaultPoint.toFixed(0)}M</td>
        <td class="td-right td-mono">${(r.assetVol * 100).toFixed(1)}%</td>
        <td class="td-right td-mono td-primary">${r.dd.toFixed(2)}</td>
        <td class="td-right td-mono">${(r.pd * 100).toFixed(2)}%</td>
        <td class="td-right">${verdictHtml}</td>
      </tr>`;
    }

    if (modelKey === 'montecarlo') {
      return `<tr>
        <td><div class="analysis-company-cell"><span class="td-ticker">${r.ticker}</span><span class="analysis-co-name">${r.name}</span></div></td>
        <td class="td-right td-mono">$${r.currentRevenue.toFixed(1)}M</td>
        <td class="td-right td-mono">${(r.growthMean * 100).toFixed(0)}%</td>
        <td class="td-right td-mono">${(r.growthStd * 100).toFixed(0)}%</td>
        <td class="td-right td-mono text-red">$${r.p10.toFixed(1)}M</td>
        <td class="td-right td-mono text-orange">$${r.p25.toFixed(1)}M</td>
        <td class="td-right td-mono td-primary">$${r.p50.toFixed(1)}M</td>
        <td class="td-right td-mono text-green">$${r.p75.toFixed(1)}M</td>
        <td class="td-right td-mono text-green">$${r.p90.toFixed(1)}M</td>
      </tr>`;
    }

    return '';
  }).join('');
}

function setupMonteCarloSelector(results) {
  const sel = document.getElementById('mc-company-select');
  sel.innerHTML = `<option value="">${t('analysis.select_company')}</option>` +
    results.map(r => `<option value="${r.ticker}">${r.ticker} · ${r.name}</option>`).join('');

  // Remove old listener
  const newSel = sel.cloneNode(true);
  sel.parentNode.replaceChild(newSel, sel);

  newSel.addEventListener('change', () => {
    const ticker = newSel.value;
    if (!ticker) return;
    const r = results.find(x => x.ticker === ticker);
    if (r) renderMonteCarloChart(r);
  });

  // Default to first company (setTimeout lets canvas get dimensions after display:block)
  if (results.length) {
    newSel.value = results[0].ticker;
    setTimeout(() => renderMonteCarloChart(results[0]), 50);
  }
}

function renderMonteCarloChart(result) {
  const canvas = document.getElementById('mcChart');
  if (!canvas) return;

  const pct = result.percentiles;
  const steps = pct.p50.length;
  const labels = [];
  for (let i = 0; i < steps; i++) {
    labels.push(i === 0 ? 'Now' : `${t('analysis.month')}${i}`);
  }

  const cc = chartColors();
  if (canvas._chart) canvas._chart.destroy();

  canvas._chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'P90', data: pct.p90, borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.05)', fill: '+1', borderWidth: 1, pointRadius: 0, tension: 0.3 },
        { label: 'P75', data: pct.p75, borderColor: 'rgba(16,185,129,0.5)', backgroundColor: 'rgba(16,185,129,0.08)', fill: '+1', borderWidth: 1, pointRadius: 0, tension: 0.3 },
        { label: 'P50', data: pct.p50, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: false, borderWidth: 2.5, pointRadius: 2, tension: 0.3 },
        { label: 'P25', data: pct.p25, borderColor: 'rgba(245,158,11,0.5)', backgroundColor: 'rgba(245,158,11,0.08)', fill: '+1', borderWidth: 1, pointRadius: 0, tension: 0.3 },
        { label: 'P10', data: pct.p10, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.05)', fill: false, borderWidth: 1, pointRadius: 0, tension: 0.3 },
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: cc.legend, font: { size: 11, family: 'Inter' }, usePointStyle: true } },
        tooltip: {
          backgroundColor: cc.tooltip.bg, borderColor: cc.tooltip.border, borderWidth: 1,
          titleColor: cc.tooltip.title, bodyColor: cc.tooltip.body,
          callbacks: { label: ctx => `${ctx.dataset.label}: $${ctx.raw.toFixed(1)}M` }
        }
      },
      scales: {
        x: { ticks: { color: cc.tick, font: { size: 11, family: 'JetBrains Mono' } }, grid: { color: cc.grid } },
        y: { ticks: { color: cc.tick, font: { size: 10 }, callback: v => `$${v.toFixed(0)}M` }, grid: { color: cc.grid } }
      }
    }
  });
}

// ── PAGE: PREDICTIONS ────────────────────────────────────────────────────────

let currentPredTab = 'institution';

function renderPredictions() {
  if (!BTC_PREDICTIONS || !BTC_PREDICTIONS.crypto_platform_predictions) {
    document.getElementById('predDisclaimer').innerHTML =
      '<div class="empty-state"><div class="empty-text">Loading predictions...</div></div>';
    return;
  }
  document.getElementById('predDisclaimer').innerHTML =
    `<div class="prediction-disclaimer-inner">⚠ ${t('pred.disclaimer')}</div>`;
  setupPredictionTabs();
  showPredSection(currentPredTab);
}

function setupPredictionTabs() {
  const container = document.getElementById('predSubTabs');
  const tabs = [
    { key: 'institution', label: t('pred.institution_tab') },
    { key: 'platform', label: t('pred.platform_tab') },
    { key: 'consensus', label: t('pred.consensus_tab') },
    { key: 'fitting', label: t('pred.fitting_tab') },
  ];
  container.innerHTML = tabs.map(tb =>
    `<button class="pred-tab${tb.key === currentPredTab ? ' active' : ''}" data-pred="${tb.key}">${tb.label}</button>`
  ).join('');
  container.querySelectorAll('.pred-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.pred-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPredTab = btn.dataset.pred;
      showPredSection(currentPredTab);
    });
  });
}

function showPredSection(key) {
  document.getElementById('predPlatformSection').style.display = key === 'platform' ? '' : 'none';
  document.getElementById('predInstitutionSection').style.display = key === 'institution' ? '' : 'none';
  document.getElementById('predConsensusSection').style.display = key === 'consensus' ? '' : 'none';
  document.getElementById('predFittingSection').style.display = key === 'fitting' ? '' : 'none';

  if (key === 'platform') renderPlatformPredictions();
  if (key === 'institution') renderInstitutionalPredictions();
  if (key === 'consensus') renderConsensus();
  if (key === 'fitting') renderFitting();
}

function fmtPrice(v) {
  if (v == null) return `<span class="no-data">${t('pred.no_target')}</span>`;
  return '$' + v.toLocaleString('en-US');
}

function renderPlatformPredictions() {
  renderPlatformConsensusCard();
  const data = BTC_PREDICTIONS.crypto_platform_predictions || [];
  const years = ['2025', '2026', '2027', '2028', '2029', '2030'];
  const thead = document.getElementById('platformPredHead');
  const tbody = document.getElementById('platformPredBody');

  const yearColors = ['rgba(59,130,246,0.05)', 'rgba(16,185,129,0.05)', 'rgba(245,158,11,0.05)', 'rgba(139,92,246,0.05)', 'rgba(6,182,212,0.05)', 'rgba(239,68,68,0.05)'];
  thead.innerHTML = `<tr>
    <th>${t('pred.source')}</th>
    <th style="font-size:10px;">${t('pred.methodology')}</th>
    ${years.map((y, i) => `<th class="td-right" colspan="3" style="text-align:center;background:${yearColors[i]};">${y}<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-muted);font-weight:400;"><span>${t('pred.low')}</span><span>${t('pred.high')}</span><span>${t('pred.avg')}</span></div></th>`).join('')}
  </tr>`;

  tbody.innerHTML = data.map(src => {
    const p = src.predictions;
    return `<tr>
      <td>
        <div style="display:flex;flex-direction:column;gap:2px;">
          <a href="${src.url}" target="_blank" style="color:var(--accent-blue);font-weight:600;font-size:12px;text-decoration:none;">${src.source}</a>
          <span style="font-size:9px;color:var(--text-muted);">${src.prediction_date}</span>
        </div>
      </td>
      <td style="font-size:10px;color:var(--text-muted);white-space:normal;word-break:break-word;min-width:150px;max-width:220px;line-height:1.4;">${src.methodology}</td>
      ${years.map((y, i) => {
        const yp = p[y] || {};
        const bg = yearColors[i];
        return `<td class="td-right td-mono" style="font-size:11px;background:${bg};">${fmtPrice(yp.low)}</td>
                <td class="td-right td-mono" style="font-size:11px;background:${bg};">${fmtPrice(yp.high)}</td>
                <td class="td-right td-mono td-primary" style="font-size:11px;background:${bg};">${fmtPrice(yp.average)}</td>`;
      }).join('')}
    </tr>`;
  }).join('');
}

function buildConsensusCard(containerId, titleKey, subtitleKey, rangeLabel, consensusLabel, getRowData) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const years = ['2025', '2026', '2027', '2028', '2029', '2030'];
  const btcPrice = _lastBtcPrice || 0;

  let globalMin = Infinity, globalMax = 0;
  const rowData = years.map(y => {
    const r = getRowData(y);
    if (!r) return null;
    if (r.low > 0 && r.low < globalMin) globalMin = r.low;
    if (r.high > globalMax) globalMax = r.high;
    if (r.cHigh > globalMax) globalMax = r.cHigh;
    return { year: y, ...r };
  }).filter(Boolean);

  if (rowData.length === 0) { container.innerHTML = ''; return; }
  if (btcPrice > 0 && btcPrice < globalMin) globalMin = btcPrice;

  const logMin = Math.log10(globalMin * 0.8);
  const logMax = Math.log10(globalMax * 1.15);
  const logRange = logMax - logMin;
  const pct = v => v <= 0 ? 0 : (((Math.log10(v) - logMin) / logRange) * 100).toFixed(2);
  const fmtK = v => {
    if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'K';
    return '$' + v.toLocaleString();
  };
  const priceLinePct = btcPrice > 0 ? pct(btcPrice) : null;

  const barsHtml = rowData.map(r => {
    const rangeL = parseFloat(pct(r.low));
    const rangeR = parseFloat(pct(r.high));
    const cL = parseFloat(pct(r.cLow));
    const cR = parseFloat(pct(r.cHigh));
    return `<div class="inst-consensus-row">
      <div class="inst-consensus-year">${r.year}</div>
      <div class="inst-consensus-bar-area">
        <div class="inst-consensus-range-bar" style="left:${rangeL}%;width:${(rangeR - rangeL).toFixed(2)}%;">
          <span class="inst-cr-label-left">${fmtK(r.low)}</span>
          <span class="inst-cr-label-right">${fmtK(r.high)}</span>
        </div>
        <div class="inst-consensus-consensus-bar" style="left:${cL}%;width:${(cR - cL).toFixed(2)}%;">
          <span class="inst-cc-label">${fmtK(r.cLow)} – ${fmtK(r.cHigh)}</span>
        </div>
        ${priceLinePct !== null ? `<div class="inst-consensus-price-line" style="left:${priceLinePct}%;"></div>` : ''}
      </div>
    </div>`;
  }).join('');

  const dataDate = BTC_PREDICTIONS.data_collection_date || '2026-02-26';
  container.innerHTML = `<div class="inst-consensus-card">
    <div class="inst-consensus-header">
      <span class="inst-consensus-title">${t(titleKey)}</span>
      <span class="inst-consensus-subtitle">${t(subtitleKey)}</span>
    </div>
    <div class="inst-consensus-meta">${t('pred.data_date')}: ${dataDate} | ${t('pred.inst_consensus_note')}</div>
    <div class="inst-consensus-price-row">
      <span class="inst-consensus-price-label">${t('pred.current_price')}</span>
      <span class="inst-consensus-price-value">${btcPrice > 0 ? '$' + btcPrice.toLocaleString() : '$—'}</span>
    </div>
    <div class="inst-consensus-chart">${barsHtml}</div>
    <div class="inst-consensus-legend">
      <div class="inst-consensus-legend-item">
        <div class="inst-consensus-legend-swatch" style="background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.35);"></div>
        ${rangeLabel}
      </div>
      <div class="inst-consensus-legend-item">
        <div class="inst-consensus-legend-swatch" style="background:rgba(16,185,129,0.3);border:1px solid rgba(16,185,129,0.6);"></div>
        ${consensusLabel}
      </div>
      <div class="inst-consensus-legend-item">
        <div class="inst-consensus-legend-swatch" style="width:3px;height:14px;background:var(--orange);border-radius:1px;"></div>
        ${t('pred.current_price')}
      </div>
    </div>
  </div>`;
}

function renderPlatformConsensusCard() {
  const platforms = BTC_PREDICTIONS.crypto_platform_predictions || [];
  buildConsensusCard('platformConsensusCard', 'pred.plat_consensus_title', 'pred.inst_consensus_subtitle',
    t('pred.range_all'), t('pred.plat_consensus'),
    y => {
      const lows = [], highs = [];
      platforms.forEach(p => {
        const yp = p.predictions[y] || {};
        if (yp.low) { lows.push(yp.low); highs.push(yp.low); }
        if (yp.high) { lows.push(yp.high); highs.push(yp.high); }
        if (yp.average) { lows.push(yp.average); highs.push(yp.average); }
      });
      if (lows.length === 0) return null;
      const low = Math.min(...lows), high = Math.max(...highs);
      // Platform consensus: middle 50% range (exclude extreme outliers)
      const allVals = lows.concat(highs).sort((a, b) => a - b);
      const q1 = allVals[Math.floor(allVals.length * 0.25)];
      const q3 = allVals[Math.floor(allVals.length * 0.75)];
      return { low, high, cLow: q1, cHigh: q3 };
    }
  );
}

function renderInstitutionalConsensusCard() {
  const consensus = BTC_PREDICTIONS.summary_consensus || {};
  buildConsensusCard('institutionConsensusCard', 'pred.inst_consensus_title', 'pred.inst_consensus_subtitle',
    t('pred.range_all'), t('pred.institutional_consensus'),
    y => {
      const c = consensus[y];
      if (!c) return null;
      const low = c.range_low || 0, high = c.range_high || 0;
      let cLow = 0, cHigh = 0;
      if (c.institutional_consensus) {
        const parts = c.institutional_consensus.split('-');
        cLow = parseInt(parts[0]) || 0;
        cHigh = parseInt(parts[1] || parts[0]) || 0;
      }
      return { low, high, cLow, cHigh };
    }
  );
}

function renderInstitutionalPredictions() {
  renderInstitutionalConsensusCard();
  const data = BTC_PREDICTIONS.institutional_predictions || [];
  const years = ['2025', '2026', '2027', '2028', '2029', '2030'];
  const thead = document.getElementById('institutionPredHead');
  const tbody = document.getElementById('institutionPredBody');

  thead.innerHTML = `<tr>
    <th>${t('pred.source')}</th>
    <th>${t('pred.analyst')}</th>
    <th>${t('pred.type')}</th>
    ${years.map(y => `<th class="td-right">${y}</th>`).join('')}
  </tr>`;

  tbody.innerHTML = data.map(src => {
    const p = src.predictions;
    return `<tr>
      <td>
        <div style="display:flex;flex-direction:column;gap:2px;">
          <a href="${src.url}" target="_blank" style="color:var(--accent-blue);font-weight:600;font-size:12px;text-decoration:none;">${src.source}</a>
          <span style="font-size:9px;color:var(--text-muted);">${src.prediction_date}</span>
        </div>
      </td>
      <td style="font-size:10px;color:var(--text-secondary);max-width:160px;">${src.analyst || '—'}</td>
      <td style="font-size:10px;"><span class="inst-type-badge">${src.type}</span></td>
      ${years.map(y => {
        const yp = p[y];
        if (!yp) return `<td class="td-right td-mono" style="font-size:11px;">${fmtPrice(null)}</td>`;
        // Handle bear/base/bull format (ARK 2030)
        if (yp.bear || yp.base || yp.bull) {
          let parts = [];
          if (yp.bear) parts.push(`<span style="color:var(--red);font-size:9px;">${t('pred.bear')}: ${fmtPrice(yp.bear)}</span>`);
          if (yp.base) parts.push(`<span style="font-size:10px;">${t('pred.base')}: ${fmtPrice(yp.base)}</span>`);
          if (yp.bull) parts.push(`<span style="color:var(--green);font-size:9px;">${t('pred.bull')}: ${fmtPrice(yp.bull)}</span>`);
          return `<td class="td-right" style="font-size:10px;"><div style="display:flex;flex-direction:column;gap:1px;align-items:flex-end;">${parts.join('')}</div></td>`;
        }
        const val = yp.target;
        const note = yp.notes;
        return `<td class="td-right td-mono" style="font-size:11px;">
          ${fmtPrice(val)}
          ${note ? `<div style="font-size:8px;color:var(--text-muted);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${note}">${note}</div>` : ''}
        </td>`;
      }).join('')}
    </tr>`;
  }).join('');
}

function renderConsensus() {
  const consensus = BTC_PREDICTIONS.summary_consensus || {};
  const catalysts = BTC_PREDICTIONS.key_catalysts || [];
  const risks = BTC_PREDICTIONS.key_risks || [];
  const years = ['2025', '2026', '2027', '2028', '2029', '2030'];

  // Chart
  const canvas = document.getElementById('consensusChart');
  if (canvas) {
    const lows = years.map(y => consensus[y] ? consensus[y].range_low : null);
    const highs = years.map(y => consensus[y] ? consensus[y].range_high : null);
    // Parse institutional consensus string like "100000-200000"
    const instLow = years.map(y => {
      if (!consensus[y] || !consensus[y].institutional_consensus) return null;
      const parts = consensus[y].institutional_consensus.split('-');
      return parseInt(parts[0]);
    });
    const instHigh = years.map(y => {
      if (!consensus[y] || !consensus[y].institutional_consensus) return null;
      const parts = consensus[y].institutional_consensus.split('-');
      return parseInt(parts[1] || parts[0]);
    });

    const cc = chartColors();
    if (canvas._chart) canvas._chart.destroy();
    canvas._chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: years,
        datasets: [
          {
            label: t('pred.consensus_range') + ' (' + t('pred.high') + ')',
            data: highs,
            backgroundColor: 'rgba(59,130,246,0.15)',
            borderColor: 'rgba(59,130,246,0.4)',
            borderWidth: 1,
            borderRadius: 4,
            order: 2
          },
          {
            label: t('pred.consensus_range') + ' (' + t('pred.low') + ')',
            data: lows,
            backgroundColor: 'rgba(239,68,68,0.15)',
            borderColor: 'rgba(239,68,68,0.4)',
            borderWidth: 1,
            borderRadius: 4,
            order: 3
          },
          {
            label: t('pred.institutional_consensus') + ' (' + t('pred.high') + ')',
            data: instHigh,
            type: 'line',
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.1)',
            fill: '+1',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#10b981',
            tension: 0.3,
            order: 1
          },
          {
            label: t('pred.institutional_consensus') + ' (' + t('pred.low') + ')',
            data: instLow,
            type: 'line',
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 4,
            pointBackgroundColor: '#10b981',
            tension: 0.3,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: cc.legend, font: { size: 11, family: 'Inter' }, usePointStyle: true } },
          tooltip: {
            backgroundColor: cc.tooltip.bg, borderColor: cc.tooltip.border, borderWidth: 1,
            titleColor: cc.tooltip.title, bodyColor: cc.tooltip.body,
            callbacks: { label: ctx => `${ctx.dataset.label}: $${ctx.raw ? ctx.raw.toLocaleString() : '—'}` }
          }
        },
        scales: {
          x: { ticks: { color: cc.tick, font: { size: 12, family: 'JetBrains Mono' } }, grid: { color: cc.grid } },
          y: { ticks: { color: cc.tick, font: { size: 10 }, callback: v => '$' + (v/1000).toFixed(0) + 'K' }, grid: { color: cc.grid } }
        }
      }
    });
  }

  // Catalysts & Risks
  const grid = document.getElementById('catalystRiskGrid');
  grid.innerHTML = `
    <div class="catalyst-col">
      <div class="catalyst-risk-title" style="color:var(--green);">▲ ${t('pred.catalysts')}</div>
      <ul class="catalyst-risk-list">${catalysts.map(c => `<li>${c}</li>`).join('')}</ul>
    </div>
    <div class="risk-col">
      <div class="catalyst-risk-title" style="color:var(--red);">▼ ${t('pred.risks')}</div>
      <ul class="catalyst-risk-list">${risks.map(r => `<li>${r}</li>`).join('')}</ul>
    </div>`;
}

// ── FITTING ANALYSIS ──

let currentFitMethod = 'linear';

function renderFitting() {
  setupFittingControls();
  runFitting(currentFitMethod);
}

function setupFittingControls() {
  const container = document.getElementById('fittingControls');
  const methods = [
    { key: 'linear', label: t('pred.linear') },
    { key: 'exponential', label: t('pred.exponential') },
    { key: 'polynomial', label: t('pred.polynomial') },
    { key: 'power_law', label: t('pred.power_law') },
    { key: 'log', label: t('pred.log') },
  ];
  container.innerHTML = methods.map(m =>
    `<button class="pred-tab${m.key === currentFitMethod ? ' active' : ''}" data-fit="${m.key}">${m.label}</button>`
  ).join('');
  container.querySelectorAll('.pred-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.pred-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFitMethod = btn.dataset.fit;
      runFitting(currentFitMethod);
    });
  });
}

function collectFittingData() {
  // Gather all numeric predictions from all sources
  const points = []; // { year, price }
  const years = ['2025', '2026', '2027', '2028', '2029', '2030'];

  (BTC_PREDICTIONS.crypto_platform_predictions || []).forEach(src => {
    years.forEach(y => {
      const yp = src.predictions[y];
      if (!yp) return;
      if (yp.low) points.push({ year: parseInt(y), price: yp.low, source: src.source });
      if (yp.high) points.push({ year: parseInt(y), price: yp.high, source: src.source });
      if (yp.average) points.push({ year: parseInt(y), price: yp.average, source: src.source });
    });
  });

  (BTC_PREDICTIONS.institutional_predictions || []).forEach(src => {
    years.forEach(y => {
      const yp = src.predictions[y];
      if (!yp) return;
      if (yp.target) points.push({ year: parseInt(y), price: yp.target, source: src.source });
      if (yp.bear) points.push({ year: parseInt(y), price: yp.bear, source: src.source });
      if (yp.base) points.push({ year: parseInt(y), price: yp.base, source: src.source });
      if (yp.bull) points.push({ year: parseInt(y), price: yp.bull, source: src.source });
    });
  });

  return points;
}

function linearRegression(xs, ys) {
  const n = xs.length;
  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sxx = xs.reduce((a, x) => a + x * x, 0);
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const a = (sy - b * sx) / n;
  return { a, b };
}

function rSquared(ys, predicted) {
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const ssTot = ys.reduce((a, y) => a + (y - mean) * (y - mean), 0);
  const ssRes = ys.reduce((a, y, i) => a + (y - predicted[i]) * (y - predicted[i]), 0);
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}

function polyFit(xs, ys, degree) {
  // Normal equations for polynomial fit
  const n = xs.length;
  const m = degree + 1;
  // Build Vandermonde matrix
  const A = [];
  for (let i = 0; i < m; i++) {
    A[i] = [];
    for (let j = 0; j < m; j++) {
      A[i][j] = xs.reduce((s, x) => s + Math.pow(x, i + j), 0);
    }
  }
  const b = [];
  for (let i = 0; i < m; i++) {
    b[i] = xs.reduce((s, x, k) => s + ys[k] * Math.pow(x, i), 0);
  }
  // Gaussian elimination
  for (let col = 0; col < m; col++) {
    let maxRow = col;
    for (let row = col + 1; row < m; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
    }
    [A[col], A[maxRow]] = [A[maxRow], A[col]];
    [b[col], b[maxRow]] = [b[maxRow], b[col]];
    for (let row = col + 1; row < m; row++) {
      const f = A[row][col] / A[col][col];
      for (let j = col; j < m; j++) A[row][j] -= f * A[col][j];
      b[row] -= f * b[col];
    }
  }
  const coeffs = new Array(m);
  for (let i = m - 1; i >= 0; i--) {
    coeffs[i] = b[i];
    for (let j = i + 1; j < m; j++) coeffs[i] -= A[i][j] * coeffs[j];
    coeffs[i] /= A[i][i];
  }
  return coeffs; // [c0, c1, c2, ...] where y = c0 + c1*x + c2*x^2 + ...
}

function runFitting(method) {
  const points = collectFittingData();
  if (!points.length) return;

  // Normalize years: use (year - 2025) as x
  const xs = points.map(p => p.year - 2025);
  const ys = points.map(p => p.price);

  let fitted, predict, params, label;
  const xPlot = []; // 0..5 in 0.1 steps
  for (let x = 0; x <= 5; x += 0.1) xPlot.push(x);

  if (method === 'linear') {
    const lr = linearRegression(xs, ys);
    fitted = xs.map(x => lr.a + lr.b * x);
    predict = x => lr.a + lr.b * x;
    params = `y = ${lr.a.toFixed(0)} + ${lr.b.toFixed(0)} × x`;
    label = t('pred.linear');
  } else if (method === 'exponential') {
    // ln(y) = ln(a) + b*x
    const posIdx = ys.map((y, i) => y > 0 ? i : -1).filter(i => i >= 0);
    const lnYs = posIdx.map(i => Math.log(ys[i]));
    const filtXs = posIdx.map(i => xs[i]);
    const lr = linearRegression(filtXs, lnYs);
    const a = Math.exp(lr.a);
    const b = lr.b;
    fitted = xs.map(x => a * Math.exp(b * x));
    predict = x => a * Math.exp(b * x);
    params = `y = ${a.toFixed(0)} × e^(${b.toFixed(3)}x)`;
    label = t('pred.exponential');
  } else if (method === 'polynomial') {
    const coeffs = polyFit(xs, ys, 2);
    fitted = xs.map(x => coeffs[0] + coeffs[1] * x + coeffs[2] * x * x);
    predict = x => coeffs[0] + coeffs[1] * x + coeffs[2] * x * x;
    params = `y = ${coeffs[0].toFixed(0)} + ${coeffs[1].toFixed(0)}x + ${coeffs[2].toFixed(0)}x²`;
    label = t('pred.polynomial');
  } else if (method === 'power_law') {
    // ln(y) = ln(a) + b*ln(x+1)
    const posIdx = ys.map((y, i) => y > 0 ? i : -1).filter(i => i >= 0);
    const lnXs = posIdx.map(i => Math.log(xs[i] + 1));
    const lnYs = posIdx.map(i => Math.log(ys[i]));
    const lr = linearRegression(lnXs, lnYs);
    const a = Math.exp(lr.a);
    const b = lr.b;
    fitted = xs.map(x => a * Math.pow(x + 1, b));
    predict = x => a * Math.pow(x + 1, b);
    params = `y = ${a.toFixed(0)} × (x+1)^${b.toFixed(3)}`;
    label = t('pred.power_law');
  } else if (method === 'log') {
    // y = a * ln(x+1) + b
    const lnXs = xs.map(x => Math.log(x + 1));
    const lr = linearRegression(lnXs, ys);
    fitted = xs.map(x => lr.b * Math.log(x + 1) + lr.a);
    predict = x => lr.b * Math.log(x + 1) + lr.a;
    params = `y = ${lr.b.toFixed(0)} × ln(x+1) + ${lr.a.toFixed(0)}`;
    label = t('pred.log');
  }

  const r2 = rSquared(ys, fitted);

  // Render chart
  const canvas = document.getElementById('fittingChart');
  if (!canvas) return;
  const cc = chartColors();

  const scatterData = points.map(p => ({ x: p.year - 2025, y: p.price }));
  const curveData = xPlot.map(x => ({ x, y: predict(x) }));

  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(canvas, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: t('pred.all_data_points'),
          data: scatterData,
          backgroundColor: 'rgba(59,130,246,0.5)',
          borderColor: '#3b82f6',
          pointRadius: 4,
          pointHoverRadius: 6,
          order: 2
        },
        {
          label: label + ' (' + t('pred.fitted_curve') + ')',
          data: curveData,
          type: 'line',
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.1)',
          fill: false,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHitRadius: 15,
          pointHoverRadius: 4,
          tension: 0.3,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: cc.legend, font: { size: 11, family: 'Inter' }, usePointStyle: true } },
        tooltip: {
          backgroundColor: cc.tooltip.bg, borderColor: cc.tooltip.border, borderWidth: 1,
          titleColor: cc.tooltip.title, bodyColor: cc.tooltip.body,
          callbacks: {
            title: ctx => {
              if (!ctx[0]) return '';
              const x = ctx[0].parsed.x;
              const yearExact = 2025 + x;
              const year = Math.floor(yearExact);
              const monthFrac = (yearExact - year) * 12;
              const month = Math.round(monthFrac);
              if (month > 0 && month < 12) {
                const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                return monthNames[month] + ' ' + year;
              }
              return year.toString();
            },
            label: ctx => `$${ctx.parsed.y.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          ticks: { color: cc.tick, font: { size: 12, family: 'JetBrains Mono' }, callback: v => (2025 + v).toFixed(0), stepSize: 1 },
          grid: { color: cc.grid },
          min: -0.2, max: 5.2
        },
        y: {
          ticks: { color: cc.tick, font: { size: 10 }, callback: v => '$' + (v / 1000).toFixed(0) + 'K' },
          grid: { color: cc.grid },
          min: 0
        }
      }
    }
  });

  // Stats
  const stats = document.getElementById('fittingStats');
  const predYears = [2027, 2028, 2030];
  stats.innerHTML = `
    <div class="fitting-stats-inner">
      <div class="fitting-stat-item">
        <div class="fitting-stat-label">${t('pred.r_squared')}</div>
        <div class="fitting-stat-value" style="color:${r2 > 0.7 ? 'var(--green)' : r2 > 0.4 ? 'var(--orange)' : 'var(--red)'};">${r2.toFixed(4)}</div>
      </div>
      <div class="fitting-stat-item">
        <div class="fitting-stat-label">Formula</div>
        <div class="fitting-stat-value td-mono" style="font-size:11px;">${params}</div>
      </div>
      ${predYears.map(y => `
        <div class="fitting-stat-item">
          <div class="fitting-stat-label">${y} ${t('pred.prediction')}</div>
          <div class="fitting-stat-value td-mono">$${predict(y - 2025).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
        </div>
      `).join('')}
    </div>`;
}

// ── PAGE: MARKET PREDICT ─────────────────────────────────────────────────────

let mpForecastChart = null;

async function renderMarketPredict() {
  await loadMarketPredictions();
  const { latest, forecast, models, polymarket, fearGreed } = MARKET_PREDICT;

  // Hero section
  if (latest && !latest.error) {
    document.getElementById('mp-price').textContent = '$' + (latest.current_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const main = latest['24h'] || latest['4h'];
    if (main) {
      const isUp = main.direction === 'UP';
      const arrowEl = document.getElementById('mp-arrow');
      arrowEl.textContent = isUp ? '看涨 ▲' : '看跌 ▼';
      arrowEl.className = 'mp-arrow ' + (isUp ? 'mp-up' : 'mp-down');
      document.getElementById('mp-conf-text').textContent =
        `${t('mp.confidence')} ${main.confidence}% | ${t('mp.return')} ${main.expected_return >= 0 ? '+' : ''}${main.expected_return}%`;
    }
    const genAt = latest.generated_at;
    if (genAt) {
      const d = new Date(genAt);
      document.getElementById('mp-updated').textContent =
        d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Singapore' });
    }
    // Cards
    renderMPCard('4h', latest['4h']);
    renderMPCard('24h', latest['24h']);
    renderMPCard('168h', latest['168h']);
  }

  // Forecast chart (always render — historical data + prediction/signal overlays even if no forecast)
  renderMPForecastChart(forecast && !forecast.error ? forecast : null);

  // Derivatives Dashboard
  if (MARKET_PREDICT.derivatives) {
    renderMPDerivatives(MARKET_PREDICT.derivatives);
  }

  // Backtest Performance
  if (MARKET_PREDICT.backtest) {
    renderMPBacktest(MARKET_PREDICT.backtest);
  }

  // Models
  if (models && models.predictions) {
    renderMPModels(models.predictions);
    // Consensus panel (uses same models data)
    renderMPConsensus(models.predictions);
  }

  // Betting Markets (multi-platform or polymarket fallback)
  const bettingData = MARKET_PREDICT.bettingMarkets;
  if (bettingData && bettingData.markets) {
    renderBettingMarkets(bettingData);
  } else {
    renderBettingMarkets(polymarket);
  }
  // Bind sort buttons
  document.querySelectorAll('.mp-pm-sort-btn').forEach(btn => {
    btn.onclick = () => sortBettingMarkets(btn.dataset.sort);
  });

  // Sankey diagram
  renderSankeyDiagram(bettingData || polymarket);

  // Fear & Greed
  renderMPFearGreed(fearGreed);
}

function renderMPCard(key, pred) {
  const dirEl = document.getElementById(`mp-${key}-dir`);
  const retEl = document.getElementById(`mp-${key}-return`);
  const targetEl = document.getElementById(`mp-${key}-target`);
  const confEl = document.getElementById(`mp-${key}-conf`);
  const card = document.getElementById(`mp-card-${key}`);
  if (!pred) { dirEl.textContent = '--'; return; }

  const isUp = pred.direction === 'UP';
  dirEl.textContent = isUp ? '看涨 ▲' : '看跌 ▼';
  dirEl.className = 'mp-card-dir ' + (isUp ? 'mp-up' : 'mp-down');
  retEl.textContent = `${pred.expected_return >= 0 ? '+' : ''}${pred.expected_return}%`;
  retEl.className = 'mp-card-return ' + (isUp ? 'mp-up' : 'mp-down');
  targetEl.textContent = `${t('mp.target')}: $${(pred.target_price || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} | ${t('mp.confidence')}: ${pred.confidence}%`;
  confEl.style.width = pred.confidence + '%';
  card.classList.remove('mp-card-up', 'mp-card-down');
  card.classList.add(isUp ? 'mp-card-up' : 'mp-card-down');
}

let _mpCurrentRange = '30d';
let _mpHistoryCache = {};
let _mpForecastData = null;

async function fetchBinanceHistory(range) {
  if (_mpHistoryCache[range]) return _mpHistoryCache[range];
  const cfg = {
    '7d': { interval: '1h', limit: 168 },
    '30d': { interval: '4h', limit: 180 },
    '90d': { interval: '4h', limit: 540 },
    '180d': { interval: '1d', limit: 180 },
    '1y': { interval: '1d', limit: 365 },
  };
  const { interval, limit } = cfg[range] || cfg['30d'];
  try {
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`);
    const data = await res.json();
    const result = data.map(k => ({ x: new Date(k[0]), y: parseFloat(k[4]) }));
    _mpHistoryCache[range] = result;
    return result;
  } catch (e) {
    console.error('Binance history fetch error:', e);
    return [];
  }
}

async function renderMPForecastChart(forecast) {
  _mpForecastData = forecast;
  const canvas = document.getElementById('mp-forecast-chart');
  if (!canvas) return;

  // 绑定时间范围按钮事件
  const btns = document.querySelectorAll('.mp-range-btn');
  btns.forEach(btn => {
    btn.onclick = async () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _mpCurrentRange = btn.dataset.range;
      await _renderMPChart();
    };
  });

  await _renderMPChart();
}

async function _renderMPChart() {
  const canvas = document.getElementById('mp-forecast-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (mpForecastChart) mpForecastChart.destroy();

  const forecast = _mpForecastData;
  const cc = chartColors();
  const datasets = [];

  // 1. 获取历史价格数据
  const histData = await fetchBinanceHistory(_mpCurrentRange);
  if (histData.length > 0) {
    datasets.push({
      label: '历史价格',
      data: histData,
      borderColor: '#58a6ff',
      backgroundColor: 'rgba(88,166,255,0.04)',
      borderWidth: 2,
      pointRadius: 0,
      fill: true,
      tension: 0.2,
      order: 3,
    });
  }

  // 2. 历史预测线（金色虚线：过去每次预测的目标价格 vs 实际价格）
  const predHistory = MARKET_PREDICT.predictionHistory;
  if (predHistory && predHistory.predictions && predHistory.predictions.length > 0) {
    const predData = predHistory.predictions
      .filter(p => p.predicted_price && p.predicted_price > 0)
      .map(p => ({ x: new Date(p.timestamp), y: p.predicted_price }));
    if (predData.length > 0) {
      datasets.push({
        label: '历史预测',
        data: predData,
        borderColor: '#d4a017',
        borderWidth: 1.5,
        borderDash: [5, 3],
        pointRadius: 2,
        pointBackgroundColor: '#d4a017',
        tension: 0.2,
        order: 4,
      });
    }
  }

  // 3. 综合押注共识曲线（绿色虚线）
  const sigHistory = MARKET_PREDICT.signalHistory;
  if (sigHistory && sigHistory.history && sigHistory.history.length > 0) {
    const sigData = sigHistory.history
      .filter(s => s.consensus_price && s.consensus_price > 0)
      .map(s => ({ x: new Date(s.timestamp), y: s.consensus_price }));
    if (sigData.length > 0) {
      datasets.push({
        label: '押注共识',
        data: sigData,
        borderColor: '#22c55e',
        borderWidth: 1.5,
        borderDash: [3, 3],
        pointRadius: 0,
        tension: 0.3,
        order: 5,
      });
    }
  }

  // 4. 预测线（仅在可见范围时显示）
  if (forecast) {
    const nowTs = histData.length > 0 ? histData[histData.length - 1].x : new Date();

    if (forecast.hourly_forecast) {
      const combined = forecast.hourly_forecast.map(p => ({ x: new Date(p.timestamp), y: p.price }));
      if (histData.length > 0) combined.unshift({ x: nowTs, y: histData[histData.length - 1].y });
      datasets.push({
        label: t('mp.combined'),
        data: combined,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.04)',
        borderWidth: 2,
        borderDash: [6, 3],
        pointRadius: 0,
        fill: true,
        tension: 0.3,
        order: 0,
      });
    }
    if (forecast.hourly_model_only) {
      const modelData = forecast.hourly_model_only.map(p => ({ x: new Date(p.timestamp), y: p.price }));
      if (histData.length > 0) modelData.unshift({ x: nowTs, y: histData[histData.length - 1].y });
      datasets.push({
        label: t('mp.model_only'),
        data: modelData,
        borderColor: '#a78bfa',
        borderWidth: 1.5,
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0.3,
        order: 1,
      });
    }
    // Polymarket 单独预测线已移除，改用综合押注共识曲线
  }

  // 时间轴单位根据范围调整
  const timeUnit = { '7d': 'hour', '30d': 'day', '90d': 'day', '180d': 'week', '1y': 'month' }[_mpCurrentRange] || 'day';
  const timeFormat = { 'hour': 'MM/dd HH:mm', 'day': 'MM/dd', 'week': 'MM/dd', 'month': 'yy/MM' }[timeUnit];

  // "现在"标注线
  const nowLine = histData.length > 0 ? histData[histData.length - 1].x : null;

  mpForecastChart = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: cc.legend, font: { size: 11, family: 'Inter' }, usePointStyle: true, boxWidth: 20 },
        },
        tooltip: {
          backgroundColor: cc.tooltip.bg, borderColor: cc.tooltip.border, borderWidth: 1,
          titleColor: cc.tooltip.title, bodyColor: cc.tooltip.body,
          callbacks: { label: ctx => `${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString('en-US', { maximumFractionDigits: 0 })}` }
        },
        annotation: nowLine ? {
          annotations: {
            nowLine: {
              type: 'line', xMin: nowLine, xMax: nowLine,
              borderColor: 'rgba(139,148,158,0.5)', borderWidth: 1, borderDash: [4, 4],
              label: { content: '现在', display: true, position: 'start', color: cc.tick, font: { size: 10 }, backgroundColor: 'transparent' }
            }
          }
        } : {},
        zoom: {
          pan: { enabled: true, mode: 'x' },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x',
          },
          limits: {
            x: { minRange: 3600000 },  // 最小缩放 1 小时
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: timeUnit, displayFormats: { hour: 'MM/dd HH:mm', day: 'MM/dd', week: 'MM/dd', month: 'yy/MM' } },
          grid: { color: cc.grid },
          ticks: { color: cc.tick, font: { size: 10 }, maxTicksLimit: 10 },
        },
        y: {
          grid: { color: cc.grid },
          ticks: { color: cc.tick, font: { size: 10, family: 'JetBrains Mono' }, callback: v => '$' + v.toLocaleString() },
        }
      },
      interaction: { intersect: false, mode: 'index' },
    },
  });
}

function renderMPModels(predictions) {
  const thead = document.getElementById('mp-models-head');
  const tbody = document.getElementById('mp-models-body');
  if (!predictions) { tbody.innerHTML = '<tr><td colspan="5" class="no-data">--</td></tr>'; return; }

  const horizon = predictions['24h'] || predictions['4h'] || predictions['168h'];
  if (!horizon) { tbody.innerHTML = '<tr><td colspan="5" class="no-data">--</td></tr>'; return; }

  thead.innerHTML = `<tr>
    <th>${t('mp.model')}</th>
    <th>${t('mp.direction')}</th>
    <th class="td-right">${t('mp.confidence')}</th>
    <th class="td-right">${t('mp.return')}</th>
    <th class="td-right">${t('mp.target')}</th>
  </tr>`;

  const catOrder = { ensemble: 0, ml: 1, nn: 2, ts: 3, ta: 4 };
  const catLabels = { ml: 'ML', nn: 'NN', ts: 'TS', ta: 'TA', ensemble: 'ENS' };
  const sorted = Object.entries(horizon).sort((a, b) => (catOrder[a[1].category] ?? 5) - (catOrder[b[1].category] ?? 5));

  tbody.innerHTML = sorted.map(([key, m]) => {
    const isUp = m.direction === 'UP';
    const dirCls = isUp ? 'mp-up' : 'mp-down';
    return `<tr>
      <td><span style="font-size:12px;">${m.name}</span> <span class="mp-cat-badge">${catLabels[m.category] || ''}</span></td>
      <td class="${dirCls}" style="font-weight:600;">${isUp ? '看涨 ▲' : '看跌 ▼'}</td>
      <td class="td-right td-mono">${m.confidence}%</td>
      <td class="td-right td-mono ${dirCls}">${m.expected_return >= 0 ? '+' : ''}${m.expected_return}%</td>
      <td class="td-right td-mono">$${(m.target_price || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
    </tr>`;
  }).join('');
}

function translateBettingQuestion(q, source) {
  let cn = q;
  // Polymarket / general patterns
  cn = cn.replace(/Will (?:Bitcoin|BTC) (?:hit|reach|exceed|surpass) \$?([\d,.]+[kKmM]?) (?:by|before) (.+)\??/i,
    (_, price, date) => `比特币是否在${translatePMDate(date)}前达到 $${price}？`);
  cn = cn.replace(/Will (?:Bitcoin|BTC) be (above|below) \$?([\d,.]+[kKmM]?) (?:by|on|in) (.+)\??/i,
    (_, dir, price, date) => `比特币在${translatePMDate(date)}是否${dir === 'above' ? '高于' : '低于'} $${price}？`);
  cn = cn.replace(/(?:Bitcoin|BTC) \$?([\d,.]+[kKmM]?)\+? (?:by|before) (.+)\??/i,
    (_, price, date) => `比特币在${translatePMDate(date)}前达到 $${price}？`);
  cn = cn.replace(/Will (?:Bitcoin|BTC) close (above|below) \$?([\d,.]+[kKmM]?) (?:on|by) (.+)\??/i,
    (_, dir, price, date) => `比特币在${translatePMDate(date)}收盘是否${dir === 'above' ? '高于' : '低于'} $${price}？`);
  // Kalshi range format: "Bitcoin price range on Mar 3?" or "Bitcoin between $X and $Y"
  cn = cn.replace(/(?:Bitcoin|BTC) (?:price )?(?:range|between) (?:on |by )?(.+?)(?:\?|$)/i,
    (_, rest) => `比特币${translatePMDate(rest)}价格区间？`);
  cn = cn.replace(/(?:Bitcoin|BTC) (?:price )?(above|below|over|under|at or above|at or below) \$?([\d,.]+[kKmM]?)(?: on| by| at)? ?(.+?)(?:\?|$)/i,
    (_, dir, price, date) => {
      const d = dir.match(/above|over/i) ? '高于' : '低于';
      return `比特币${date ? translatePMDate(date) : ''}是否${d} $${price}？`;
    });
  // "Will BTC end 2026 above/below"
  cn = cn.replace(/Will (?:Bitcoin|BTC) end (\d{4}) (above|below) \$?([\d,.]+[kKmM]?)\??/i,
    (_, year, dir, price) => `比特币${year}年底是否${dir === 'above' ? '高于' : '低于'} $${price}？`);
  // Fallback: keyword translation for unmatched questions
  if (cn === q) {
    cn = q.replace(/\bBitcoin\b/gi, '比特币').replace(/\bBTC\b/gi, 'BTC')
          .replace(/\babove\b/gi, '高于').replace(/\bbelow\b/gi, '低于')
          .replace(/\bhit\b/gi, '达到').replace(/\breach\b/gi, '达到')
          .replace(/\bby\b/gi, '前').replace(/\bbefore\b/gi, '前')
          .replace(/\bWill\b/gi, '是否').replace(/\bprice\b/gi, '价格');
    if (cn !== q) return cn;
    return null;
  }
  return cn;
}
// Backward compat alias
function translatePMQuestion(q) { return translateBettingQuestion(q, 'polymarket'); }

function translatePMDate(dateStr) {
  const months = { 'january': '1月', 'february': '2月', 'march': '3月', 'april': '4月',
    'may': '5月', 'june': '6月', 'july': '7月', 'august': '8月',
    'september': '9月', 'october': '10月', 'november': '11月', 'december': '12月',
    'jan': '1月', 'feb': '2月', 'mar': '3月', 'apr': '4月',
    'jun': '6月', 'jul': '7月', 'aug': '8月', 'sep': '9月',
    'oct': '10月', 'nov': '11月', 'dec': '12月' };
  let s = dateStr.trim().replace(/[?.]/g, '');
  for (const [en, zh] of Object.entries(months)) {
    s = s.replace(new RegExp(en, 'gi'), zh);
  }
  // "March 31, 2026" → "2026年3月31日"
  s = s.replace(/(\d+月)\s*(\d+),?\s*(\d{4})/g, '$3年$1$2日');
  // "March 2026" → "2026年3月"
  s = s.replace(/(\d+月)\s*(\d{4})/g, '$2年$1');
  // "end of 2026" → "2026年底"
  s = s.replace(/end of (\d{4})/gi, '$1年底');
  return s;
}

function formatPMCountdown(endDate) {
  if (!endDate) return '';
  const end = new Date(endDate);
  const now = new Date();
  const diff = end - now;
  if (diff <= 0) return '已结束';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 30) return `${Math.floor(days / 30)}个月${days % 30}天`;
  if (days > 0) return `${days}天${hours}时`;
  return `${hours}小时`;
}

function formatVolume(v) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v || 0}`;
}

let _bettingData = null;
let _bettingSortMode = 'volume';

function _parseBettingDeadline(market) {
  const q = market.question || '';
  const months = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8,
    'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
  };
  const ql = q.toLowerCase();
  const patterns = [
    /(?:by|on)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i,
    /(?:by|on)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})(?:,?\s*(\d{4}))?/i,
  ];
  for (const p of patterns) {
    const m = ql.match(p);
    if (m) {
      const month = months[m[1]];
      const day = parseInt(m[2]);
      const year = m[3] ? parseInt(m[3]) : new Date().getFullYear();
      if (month) return new Date(Date.UTC(year, month - 1, day));
    }
  }
  const ym = ql.match(/in\s+(\d{4})/);
  if (ym) return new Date(Date.UTC(parseInt(ym[1]), 11, 31));
  if (market.end_date) {
    try { return new Date(market.end_date); } catch (_) {}
  }
  return null;
}

function _parseBettingTarget(q) {
  const ql = (q || '').toLowerCase();
  let m = ql.match(/\$(\d+(?:\.\d+)?)\s*k/);
  if (m) return parseFloat(m[1]) * 1000;
  m = ql.match(/\$(\d+(?:\.\d+)?)\s*m/);
  if (m) return parseFloat(m[1]) * 1000000;
  m = ql.match(/\$([\d,]+)/);
  if (m) return parseFloat(m[1].replace(/,/g, ''));
  return null;
}

function sortBettingMarkets(sortMode) {
  _bettingSortMode = sortMode;
  document.querySelectorAll('.mp-pm-sort-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.sort === sortMode);
  });
  if (_bettingData) renderBettingMarkets(_bettingData);
}

function renderBettingMarkets(data) {
  _bettingData = data;
  const el = document.getElementById('mp-polymarket-panel');
  const summaryEl = document.getElementById('mp-betting-summary');
  if (!data || !data.markets || data.markets.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-text">${t('js.no_data')}</div></div>`;
    if (summaryEl) summaryEl.style.display = 'none';
    return;
  }

  const now = new Date();
  const currentPrice = MARKET_PREDICT.latest?.current_price || 0;

  // Parse deadlines and filter expired
  const enriched = data.markets.map(m => {
    const deadline = _parseBettingDeadline(m);
    const target = _parseBettingTarget(m.question);
    const expired = deadline && deadline < now;
    return { ...m, _deadline: deadline, _target: target, _expired: expired };
  });
  const active = enriched.filter(m => !m._expired);

  // Sort based on mode
  let sorted;
  if (_bettingSortMode === 'deadline') {
    sorted = active.slice().sort((a, b) => {
      if (!a._deadline && !b._deadline) return (b.volume || 0) - (a.volume || 0);
      if (!a._deadline) return 1;
      if (!b._deadline) return -1;
      return a._deadline - b._deadline;
    });
  } else if (_bettingSortMode === 'proximity') {
    sorted = active.slice().sort((a, b) => {
      if (!a._target && !b._target) return (b.volume || 0) - (a.volume || 0);
      if (!a._target) return 1;
      if (!b._target) return -1;
      return Math.abs(a._target - currentPrice) - Math.abs(b._target - currentPrice);
    });
  } else {
    sorted = active.slice().sort((a, b) => (b.volume || 0) - (a.volume || 0));
  }
  const markets = sorted.slice(0, 12);
  const allMarkets = active;

  // Platform summary bar
  const sources = data.sources || {};
  const platformConfigs = {
    polymarket: { label: 'Polymarket', color: '#22c55e' },
    kalshi: { label: 'Kalshi', color: '#3b82f6' },
    gemini: { label: 'Gemini', color: '#06b6d4' },
  };
  if (summaryEl) {
    const totalVol = data.total_volume || allMarkets.reduce((s, m) => s + (m.volume || 0), 0);
    let summaryHTML = '';
    for (const [key, cfg] of Object.entries(platformConfigs)) {
      const src = sources[key];
      if (src && src.market_count > 0) {
        summaryHTML += `<span class="mp-pm-summary-item">
          <span class="mp-pm-summary-dot" style="background:${cfg.color}"></span>
          ${cfg.label}: ${src.market_count} 个合约 / ${formatVolume(src.total_volume || 0)}
        </span>`;
      }
    }
    // If no sources info (fallback to polymarket only), just show polymarket
    if (!summaryHTML && allMarkets.length > 0) {
      summaryHTML = `<span class="mp-pm-summary-item">
        <span class="mp-pm-summary-dot" style="background:#22c55e"></span>
        Polymarket: ${allMarkets.length} 个合约
      </span>`;
    }
    summaryHTML += `<span class="mp-pm-summary-total">总押注额 ${formatVolume(totalVol)}</span>`;
    summaryEl.innerHTML = summaryHTML;
    summaryEl.style.display = 'flex';
  }

  // Render cards
  el.innerHTML = markets.map(m => {
    const yesPct = m.yes_price != null ? (m.yes_price * 100) : 0;
    const noPct = 100 - yesPct;
    const vol = m.volume || 0;
    const yesAmt = vol * (m.yes_price || 0);
    const noAmt = vol * (1 - (m.yes_price || 0));
    const source = m.source || 'polymarket';
    const cnQ = translateBettingQuestion(m.question, source);
    const deadlineStr = m._deadline ? m._deadline.toISOString() : m.end_date;
    const countdown = formatPMCountdown(deadlineStr);
    const badgeClass = `mp-pm-badge mp-pm-badge-${source}`;
    const badgeLabel = { polymarket: 'Polymarket', kalshi: 'Kalshi', gemini: 'Gemini' }[source] || source;

    return `<div class="mp-pm-card">
      <span class="${badgeClass}">${badgeLabel}</span>
      <div class="mp-pm-card-q">${cnQ || m.question}</div>
      ${cnQ ? `<div class="mp-pm-card-q-en">${m.question}</div>` : ''}
      <div class="mp-pm-votes">
        <div class="mp-pm-vote mp-pm-vote-yes">
          <div class="mp-pm-vote-icon">&#10003;</div>
          <div class="mp-pm-vote-pct">${yesPct.toFixed(1)}%</div>
          <div class="mp-pm-vote-amt">${formatVolume(yesAmt)}</div>
          <div class="mp-pm-vote-label">是 YES</div>
        </div>
        <div class="mp-pm-vote mp-pm-vote-no">
          <div class="mp-pm-vote-icon">&#10007;</div>
          <div class="mp-pm-vote-pct">${noPct.toFixed(1)}%</div>
          <div class="mp-pm-vote-amt">${formatVolume(noAmt)}</div>
          <div class="mp-pm-vote-label">否 NO</div>
        </div>
      </div>
      <div class="mp-pm-progress"><div class="mp-pm-progress-yes" style="width:${yesPct}%"></div></div>
      <div class="mp-pm-footer">
        <span>${formatVolume(vol)}</span>
        ${countdown ? `<span class="mp-pm-countdown">&#9202; ${countdown}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}
// Backward compat
function renderMPPolymarket(data) { renderBettingMarkets(data); }

/* ================================================================
   Sankey Diagram — 预测数据流
   ================================================================ */
let _sankeyChart = null;
function renderSankeyDiagram(bettingData) {
  const canvas = document.getElementById('mp-sankey-chart');
  if (!canvas) return;
  if (_sankeyChart) { _sankeyChart.destroy(); _sankeyChart = null; }

  // Compute betting volumes per platform
  const sources = bettingData?.sources || {};
  const pmVol = sources.polymarket?.total_volume || bettingData?.total_volume || 0;
  const kalVol = sources.kalshi?.total_volume || 0;
  const gemVol = sources.gemini?.total_volume || 0;
  const bettingTotal = Math.max(pmVol + kalVol + gemVol, 1);

  // Normalize volumes to 1-10 scale for flow width
  const norm = v => Math.max(1, Math.round(v / bettingTotal * 10));

  const dataFlows = [
    // Data sources → Processing
    { from: 'Binance K线', to: '技术特征 (30+)', flow: 8 },
    { from: '恐惧贪婪指数', to: '技术特征 (30+)', flow: 3 },
    // Processing → Models
    { from: '技术特征 (30+)', to: '机器学习 (5)', flow: 6 },
    { from: '技术特征 (30+)', to: '神经网络 (1)', flow: 2 },
    { from: '技术特征 (30+)', to: '时间序列 ARIMA', flow: 2 },
    { from: '技术特征 (30+)', to: '技术分析策略 (4)', flow: 4 },
    // Models → Voting
    { from: '机器学习 (5)', to: '模型投票 (11)', flow: 6 },
    { from: '神经网络 (1)', to: '模型投票 (11)', flow: 2 },
    { from: '时间序列 ARIMA', to: '模型投票 (11)', flow: 2 },
    { from: '技术分析策略 (4)', to: '模型投票 (11)', flow: 4 },
    // Betting platforms → Betting signal
    { from: `Polymarket`, to: '押注信号', flow: Math.max(norm(pmVol), 1) },
  ];
  if (kalVol > 0) dataFlows.push({ from: 'Kalshi', to: '押注信号', flow: norm(kalVol) });
  if (gemVol > 0) dataFlows.push({ from: 'Gemini', to: '押注信号', flow: norm(gemVol) });
  // If no multi-platform data yet, show betting signal with smaller weight
  if (kalVol === 0 && gemVol === 0) {
    dataFlows[dataFlows.length - 1].flow = 4;
  }
  // Final merge
  dataFlows.push({ from: '模型投票 (11)', to: '综合预测', flow: 10 });
  dataFlows.push({ from: '押注信号', to: '综合预测', flow: 4 });

  const nodeColors = {
    'Binance K线': '#3b82f6',
    '恐惧贪婪指数': '#3b82f6',
    '技术特征 (30+)': '#a855f7',
    '机器学习 (5)': '#f59e0b',
    '神经网络 (1)': '#f59e0b',
    '时间序列 ARIMA': '#f59e0b',
    '技术分析策略 (4)': '#f59e0b',
    '模型投票 (11)': '#f59e0b',
    'Polymarket': '#22c55e',
    'Kalshi': '#3b82f6',
    'Gemini': '#06b6d4',
    '押注信号': '#a855f7',
    '综合预测': '#f59e0b',
  };

  try {
    _sankeyChart = new Chart(canvas, {
      type: 'sankey',
      data: {
        datasets: [{
          data: dataFlows,
          colorFrom: c => nodeColors[c.dataset.data[c.dataIndex].from] || '#666',
          colorTo: c => nodeColors[c.dataset.data[c.dataIndex].to] || '#666',
          colorMode: 'gradient',
          labels: Object.fromEntries(Object.keys(nodeColors).map(k => [k, k])),
          size: 'max',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const d = ctx.dataset.data[ctx.dataIndex];
                return `${d.from} → ${d.to}`;
              }
            }
          }
        },
        layout: { padding: { left: 10, right: 10 } },
      }
    });
  } catch (e) {
    console.warn('Sankey chart not available:', e);
    canvas.parentElement.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">桑基图加载失败（需要 Chart.js Sankey 插件）</p>';
  }
}

function renderMPFearGreed(data) {
  // 渲染到价格下方的内联区域
  const el = document.getElementById('mp-fg-inline');
  if (!el) return;
  if (!data || !data.data || data.data.length === 0) {
    el.innerHTML = '';
    return;
  }
  const latest = data.data[0];
  const val = latest.value;
  let gaugeClass = 'mp-fg-neutral';
  let label = '中性';
  if (val <= 25) { gaugeClass = 'mp-fg-extreme-fear'; label = '极度恐惧'; }
  else if (val <= 40) { gaugeClass = 'mp-fg-fear'; label = '恐惧'; }
  else if (val <= 60) { gaugeClass = 'mp-fg-neutral'; label = '中性'; }
  else if (val <= 75) { gaugeClass = 'mp-fg-greed'; label = '贪婪'; }
  else { gaugeClass = 'mp-fg-extreme-greed'; label = '极度贪婪'; }

  const history = data.data.slice(0, 7).reverse();
  const sparkline = history.map(d => {
    const h = Math.max(3, (d.value / 100) * 24);
    let color = '#f59e0b';
    if (d.value <= 25) color = '#ef4444';
    else if (d.value <= 40) color = '#f97316';
    else if (d.value >= 75) color = '#22c55e';
    else if (d.value >= 60) color = '#84cc16';
    return `<div style="width:5px;height:${h}px;background:${color};border-radius:1px;" title="${d.value}"></div>`;
  }).join('');

  el.innerHTML = `
    <div class="mp-fg-inline-gauge ${gaugeClass}">${val}</div>
    <div class="mp-fg-inline-info">
      <div class="mp-fg-inline-label">恐惧贪婪指数</div>
      <div class="mp-fg-inline-val">${label}</div>
    </div>
    <div class="mp-fg-inline-spark">${sparkline}</div>`;
}

// ── BACKTEST PERFORMANCE ─────────────────────────────────────────────────────

let _backtestChart = null;
let _backtestData = null;
let _backtestHorizon = '24h';

function renderMPBacktest(data) {
  const section = document.getElementById('mp-backtest-section');
  if (!section) return;
  if (!data || !data.backtest || Object.keys(data.backtest).length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';
  _backtestData = data;

  // Bind tab clicks
  document.querySelectorAll('.mp-backtest-tab').forEach(tab => {
    tab.onclick = () => {
      _backtestHorizon = tab.dataset.horizon;
      document.querySelectorAll('.mp-backtest-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      _renderBacktestContent();
    };
  });

  _renderBacktestContent();

  // Note
  const noteEl = document.getElementById('mp-backtest-note');
  if (noteEl && data.generated_at) {
    const d = new Date(data.generated_at);
    noteEl.textContent = (currentLang === 'zh' ? '回测时间: ' : 'Backtest: ')
      + d.toLocaleString('zh-CN', { timeZone: 'Asia/Singapore' })
      + ` | ${data.data_points || 0} ${currentLang === 'zh' ? '个数据点' : 'data points'}`;
  }
}

function _renderBacktestContent() {
  if (!_backtestData) return;
  const horizonData = _backtestData.backtest[_backtestHorizon];
  if (!horizonData) return;

  _renderBacktestTable(horizonData);
  _renderBacktestChart(horizonData);
}

function _renderBacktestTable(horizonData) {
  const thead = document.getElementById('mp-backtest-head');
  const tbody = document.getElementById('mp-backtest-body');
  if (!thead || !tbody) return;

  thead.innerHTML = `<tr>
    <th>${t('mp.model')}</th>
    <th class="td-right">${t('mp.bt_accuracy')}</th>
    <th class="td-right">${t('mp.bt_sharpe')}</th>
    <th class="td-right">${t('mp.bt_cum_return')}</th>
    <th class="td-right">${t('mp.bt_trades')}</th>
  </tr>`;

  const sorted = Object.entries(horizonData).sort((a, b) => b[1].accuracy - a[1].accuracy);
  const catLabels = { ml: 'ML', nn: 'NN', ts: 'TS', ta: 'TA', ensemble: 'ENS' };

  tbody.innerHTML = sorted.map(([key, m]) => {
    const accCls = m.accuracy > 55 ? 'mp-up' : m.accuracy < 45 ? 'mp-down' : '';
    const retCls = m.cum_return > 0 ? 'mp-up' : m.cum_return < 0 ? 'mp-down' : '';
    const sharpeCls = m.sharpe > 0.5 ? 'mp-up' : m.sharpe < 0 ? 'mp-down' : '';
    return `<tr>
      <td><span style="font-size:12px;">${m.name}</span> <span class="mp-cat-badge">${catLabels[m.category] || ''}</span></td>
      <td class="td-right td-mono ${accCls}">${m.accuracy}%</td>
      <td class="td-right td-mono ${sharpeCls}">${m.sharpe}</td>
      <td class="td-right td-mono ${retCls}">${m.cum_return >= 0 ? '+' : ''}${m.cum_return}%</td>
      <td class="td-right td-mono">${m.total_trades}</td>
    </tr>`;
  }).join('');
}

function _renderBacktestChart(horizonData) {
  const canvas = document.getElementById('mp-backtest-chart');
  if (!canvas) return;

  if (_backtestChart) { _backtestChart.destroy(); _backtestChart = null; }

  const sorted = Object.entries(horizonData).sort((a, b) => b[1].accuracy - a[1].accuracy);
  const labels = sorted.map(([, m]) => m.name);
  const accuracies = sorted.map(([, m]) => m.accuracy);
  const colors = accuracies.map(a => a > 55 ? 'rgba(34,197,94,0.7)' : a < 45 ? 'rgba(239,68,68,0.7)' : 'rgba(107,114,128,0.5)');

  const cs = getComputedStyle(document.documentElement);
  const gridColor = cs.getPropertyValue('--border').trim() || 'rgba(255,255,255,0.06)';
  const tickColor = cs.getPropertyValue('--text-muted').trim() || '#666';

  _backtestChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: t('mp.bt_accuracy'),
        data: accuracies,
        backgroundColor: colors,
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ctx.parsed.x.toFixed(1) + '%' } },
        annotation: {
          annotations: {
            refLine: {
              type: 'line',
              xMin: 50, xMax: 50,
              borderColor: 'rgba(245,158,11,0.6)',
              borderDash: [6, 3],
              borderWidth: 2,
              label: { display: true, content: '50%', position: 'start', color: '#f59e0b', font: { size: 10 } },
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { size: 10, family: 'JetBrains Mono' }, callback: v => v + '%' },
          min: 30,
          max: 80,
        },
        y: {
          grid: { display: false },
          ticks: { color: tickColor, font: { size: 10 } },
        },
      },
    },
  });
}

// ── SIGNAL CONSENSUS PANEL ───────────────────────────────────────────────────

function renderMPConsensus(predictions) {
  const section = document.getElementById('mp-consensus-section');
  if (!section) return;
  if (!predictions) { section.style.display = 'none'; return; }

  const horizons = ['4h', '24h', '168h'];
  const available = horizons.filter(h => predictions[h]);
  if (available.length === 0) { section.style.display = 'none'; return; }
  section.style.display = '';

  renderConsensusHeatmap(predictions, available);
  renderConsensusMeter(predictions, available);
  renderConsensusAlignment(predictions, available);
}

function renderConsensusHeatmap(predictions, horizons) {
  const canvas = document.getElementById('mp-consensus-heatmap');
  if (!canvas) return;

  // Collect all models across horizons
  const modelSet = new Set();
  horizons.forEach(h => {
    Object.entries(predictions[h] || {}).forEach(([key, m]) => {
      if (key !== 'ensemble') modelSet.add(key);
    });
  });
  const models = Array.from(modelSet);
  // Add ensemble at top
  models.unshift('ensemble');

  const horizonLabels = { '4h': '4H', '24h': '24H', '168h': '7D' };
  const cellW = 80, cellH = 32, labelW = 140, headerH = 30, pad = 10;
  const w = labelW + horizons.length * cellW + pad * 2;
  const h = headerH + models.length * cellH + pad * 2;
  canvas.width = w;
  canvas.height = h;
  canvas.style.minHeight = h + 'px';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  const cs = getComputedStyle(document.documentElement);
  const textPrimary = cs.getPropertyValue('--text-primary').trim() || '#e5e7eb';
  const textMuted = cs.getPropertyValue('--text-muted').trim() || '#6b7280';

  // Header row
  ctx.font = '11px JetBrains Mono, monospace';
  ctx.fillStyle = textMuted;
  ctx.textAlign = 'center';
  horizons.forEach((hz, i) => {
    ctx.fillText(horizonLabels[hz] || hz, labelW + i * cellW + cellW / 2 + pad, pad + headerH - 8);
  });

  // Rows
  models.forEach((modelKey, row) => {
    const y = pad + headerH + row * cellH;
    // Model label
    const modelData = predictions[horizons[0]]?.[modelKey] || predictions[horizons[1]]?.[modelKey] || {};
    const name = modelData.name || modelKey;
    ctx.font = modelKey === 'ensemble' ? 'bold 11px sans-serif' : '11px sans-serif';
    ctx.fillStyle = textPrimary;
    ctx.textAlign = 'right';
    ctx.fillText(name.length > 18 ? name.slice(0, 16) + '..' : name, labelW + pad - 6, y + cellH / 2 + 4);

    // Cells
    horizons.forEach((hz, col) => {
      const m = predictions[hz]?.[modelKey];
      const x = labelW + col * cellW + pad;
      const cx = x + cellW / 2;

      if (!m) {
        // No data
        ctx.fillStyle = 'rgba(107,114,128,0.1)';
        ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
        return;
      }

      const isUp = m.direction === 'UP';
      const conf = (m.confidence || 50) / 100;
      const alpha = 0.15 + conf * 0.6;

      // Cell background
      ctx.fillStyle = isUp
        ? `rgba(34,197,94,${alpha})`
        : `rgba(239,68,68,${alpha})`;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, cellW - 4, cellH - 4, 4);
      ctx.fill();

      // Text: confidence %
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.fillStyle = isUp ? '#22c55e' : '#ef4444';
      ctx.textAlign = 'center';
      ctx.fillText(`${isUp ? '▲' : '▼'} ${m.confidence}%`, cx, y + cellH / 2 + 4);
    });
  });
}

function renderConsensusMeter(predictions, horizons) {
  const container = document.getElementById('mp-consensus-meters');
  if (!container) return;

  const horizonLabels = { '4h': '4H', '24h': '24H', '168h': '7D' };

  container.innerHTML = horizons.map(hz => {
    const models = predictions[hz];
    if (!models) return '';
    const entries = Object.entries(models).filter(([k]) => k !== 'ensemble');
    const bullCount = entries.filter(([, m]) => m.direction === 'UP').length;
    const total = entries.length || 1;
    const bullPct = (bullCount / total * 100).toFixed(0);
    const bearPct = (100 - bullPct).toFixed(0);

    return `<div class="mp-consensus-meter">
      <div class="mp-consensus-meter-label">${horizonLabels[hz] || hz} ${t('mp.consensus_bull_pct')}</div>
      <div class="mp-consensus-meter-bar-wrap">
        <div class="mp-consensus-meter-bar" style="width:${bullPct}%"></div>
      </div>
      <div class="mp-consensus-meter-info">
        <span class="mp-consensus-meter-bull">${bullCount}/${total} ${currentLang === 'zh' ? '看涨' : 'Bull'} (${bullPct}%)</span>
        <span class="mp-consensus-meter-bear">${total - bullCount}/${total} ${currentLang === 'zh' ? '看跌' : 'Bear'} (${bearPct}%)</span>
      </div>
    </div>`;
  }).join('');
}

function renderConsensusAlignment(predictions, horizons) {
  const el = document.getElementById('mp-consensus-alignment');
  if (!el) return;

  // Check if all horizons agree on direction (using ensemble)
  const directions = horizons.map(hz => {
    const ens = predictions[hz]?.ensemble;
    return ens ? ens.direction : null;
  }).filter(Boolean);

  const allUp = directions.every(d => d === 'UP');
  const allDown = directions.every(d => d === 'DOWN');
  const aligned = allUp || allDown;

  el.className = 'mp-consensus-alignment ' + (aligned ? 'align-strong' : 'align-divergent');

  if (allUp) {
    el.innerHTML = `<div class="mp-consensus-align-icon" style="color:#22c55e;">▲▲▲</div>
      <div class="mp-consensus-align-text" style="color:#22c55e;">${t('mp.consensus_strong')}</div>
      <div class="mp-consensus-align-detail">${t('mp.consensus_all_bull')}</div>`;
  } else if (allDown) {
    el.innerHTML = `<div class="mp-consensus-align-icon" style="color:#ef4444;">▼▼▼</div>
      <div class="mp-consensus-align-text" style="color:#ef4444;">${t('mp.consensus_strong')}</div>
      <div class="mp-consensus-align-detail">${t('mp.consensus_all_bear')}</div>`;
  } else {
    const detail = horizons.map(hz => {
      const ens = predictions[hz]?.ensemble;
      if (!ens) return '';
      const isUp = ens.direction === 'UP';
      return `<span style="color:${isUp ? '#22c55e' : '#ef4444'};font-weight:600;">${hz.replace('h', 'H')}: ${isUp ? '▲' : '▼'}</span>`;
    }).filter(Boolean).join('  ');
    el.innerHTML = `<div class="mp-consensus-align-icon" style="color:#f59e0b;">◆</div>
      <div class="mp-consensus-align-text" style="color:#f59e0b;">${t('mp.consensus_divergent')}</div>
      <div class="mp-consensus-align-detail">${t('mp.consensus_mixed')}<br>${detail}</div>`;
  }
}

// ── DERIVATIVES DASHBOARD ────────────────────────────────────────────────────

let _derivFRChart = null;
let _derivOIChart = null;

function renderMPDerivatives(data) {
  const section = document.getElementById('mp-deriv-section');
  if (!section) return;
  if (!data || !data.snapshot) { section.style.display = 'none'; return; }
  section.style.display = '';

  const { snapshot, history, signals } = data;
  renderDerivFRGauge(snapshot, signals);
  renderDerivLSGauge(snapshot, signals);
  renderDerivTakerBar(snapshot);
  renderDerivOISummary(snapshot, signals);
  if (history) {
    renderDerivFRChart(history.funding_rate || []);
    renderDerivOIChart(history.open_interest || [], history.price || []);
  }
}

function renderDerivFRGauge(snap, sig) {
  const valEl = document.getElementById('mp-deriv-fr-val');
  const zoneEl = document.getElementById('mp-deriv-fr-zone');
  const barEl = document.getElementById('mp-deriv-fr-bar');
  if (!valEl) return;

  const fr = snap.funding_rate || 0;
  const frPct = (fr * 100).toFixed(4);
  valEl.textContent = (fr >= 0 ? '+' : '') + frPct + '%';
  valEl.style.color = fr > 0 ? '#22c55e' : fr < 0 ? '#ef4444' : 'var(--text-primary)';

  const zone = sig.fr_zone || 'neutral';
  const zoneMap = {
    neutral: { cls: 'zone-neutral', label: t('mp.fr_neutral') },
    positive: { cls: 'zone-positive', label: t('mp.fr_positive') },
    negative: { cls: 'zone-negative', label: t('mp.fr_negative') },
    extreme_positive: { cls: 'zone-extreme-pos', label: t('mp.fr_extreme_pos') },
    extreme_negative: { cls: 'zone-extreme-neg', label: t('mp.fr_extreme_neg') },
  };
  const z = zoneMap[zone] || zoneMap.neutral;
  zoneEl.className = 'mp-deriv-zone ' + z.cls;
  zoneEl.textContent = z.label;

  // Bar: center = 0, extend left (negative) or right (positive)
  const maxFR = 0.0005; // ±0.05% as full width
  const pct = Math.min(Math.abs(fr) / maxFR, 1) * 50;
  if (fr >= 0) {
    barEl.style.left = '50%';
    barEl.style.width = pct + '%';
    barEl.style.background = '#22c55e';
  } else {
    barEl.style.left = (50 - pct) + '%';
    barEl.style.width = pct + '%';
    barEl.style.background = '#ef4444';
  }
}

function renderDerivLSGauge(snap, sig) {
  const valEl = document.getElementById('mp-deriv-ls-val');
  const pctEl = document.getElementById('mp-deriv-ls-pct');
  const canvas = document.getElementById('mp-deriv-ls-gauge');
  if (!valEl) return;

  const ls = snap.long_short_ratio || 0;
  valEl.textContent = ls.toFixed(2);

  const longPct = snap.long_account_pct ? (snap.long_account_pct * 100).toFixed(1) : '--';
  const shortPct = snap.short_account_pct ? (snap.short_account_pct * 100).toFixed(1) : '--';
  const bias = sig.ls_bias || 'balanced';
  const biasLabel = t('mp.bias_' + bias);
  pctEl.innerHTML = `<span class="mp-deriv-bias bias-${bias}">${biasLabel}</span> (${t('mp.buy')} ${longPct}% / ${t('mp.sell')} ${shortPct}%)`;

  // Draw semicircle gauge
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h - 5, r = 50;

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0, false);
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(107,114,128,0.2)';
  ctx.stroke();

  // Value arc: ls = 0..2 mapped to PI..0 (left=short, right=long)
  const ratio = Math.min(Math.max(ls, 0), 3) / 3; // 0-3 range
  const angle = Math.PI - ratio * Math.PI;

  // Green (long) portion
  ctx.beginPath();
  ctx.arc(cx, cy, r, angle, 0, false);
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#22c55e';
  ctx.stroke();

  // Red (short) portion
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, angle, false);
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#ef4444';
  ctx.stroke();

  // Needle
  const needleAngle = Math.PI - ratio * Math.PI;
  const nx = cx + Math.cos(needleAngle) * (r - 15);
  const ny = cy + Math.sin(needleAngle) * (r - 15);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'var(--text-primary)';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'var(--text-primary)';
  ctx.fill();
}

function renderDerivTakerBar(snap) {
  const valEl = document.getElementById('mp-deriv-taker-val');
  const buyEl = document.getElementById('mp-deriv-taker-buy');
  const sellEl = document.getElementById('mp-deriv-taker-sell');
  const buyLabel = document.getElementById('mp-deriv-buy-label');
  const sellLabel = document.getElementById('mp-deriv-sell-label');
  if (!valEl) return;

  const ratio = snap.taker_buy_sell_ratio || 0;
  valEl.textContent = ratio.toFixed(4);
  valEl.style.color = ratio > 1 ? '#22c55e' : ratio < 1 ? '#ef4444' : 'var(--text-primary)';

  const buyVol = snap.taker_buy_vol || 0;
  const sellVol = snap.taker_sell_vol || 0;
  const total = buyVol + sellVol || 1;
  const buyPct = (buyVol / total * 100).toFixed(1);
  const sellPct = (sellVol / total * 100).toFixed(1);

  buyEl.style.width = buyPct + '%';
  sellEl.style.width = sellPct + '%';
  buyLabel.textContent = `${t('mp.buy')} ${buyPct}%`;
  sellLabel.textContent = `${t('mp.sell')} ${sellPct}%`;
}

function renderDerivOISummary(snap, sig) {
  const valEl = document.getElementById('mp-deriv-oi-val');
  const trendEl = document.getElementById('mp-deriv-oi-trend');
  if (!valEl) return;

  const oi = snap.open_interest || 0;
  // Format OI: e.g. 79,136 BTC
  valEl.textContent = oi.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' BTC';

  const trend = sig.oi_trend || 'flat';
  const trendMap = {
    rising: { arrow: '▲', cls: 'mp-deriv-trend-up', label: t('mp.oi_rising') },
    falling: { arrow: '▼', cls: 'mp-deriv-trend-down', label: t('mp.oi_falling') },
    flat: { arrow: '→', cls: 'mp-deriv-trend-flat', label: t('mp.oi_flat') },
  };
  const tr = trendMap[trend] || trendMap.flat;
  trendEl.innerHTML = `<span class="${tr.cls}">${tr.arrow} ${tr.label}</span>`;

  // Show divergence signal if present
  const div = sig.oi_price_divergence || 0;
  if (div !== 0) {
    const divLabel = div > 0 ? (currentLang === 'zh' ? 'OI背离: 看涨' : 'OI Divergence: Bullish')
                             : (currentLang === 'zh' ? 'OI背离: 看跌' : 'OI Divergence: Bearish');
    const divCls = div > 0 ? 'mp-deriv-trend-up' : 'mp-deriv-trend-down';
    trendEl.innerHTML += ` <span class="${divCls}" style="font-size:10px;margin-left:4px;">${divLabel}</span>`;
  }
}

function renderDerivFRChart(frHistory) {
  const canvas = document.getElementById('mp-deriv-fr-chart');
  if (!canvas || !frHistory.length) return;

  if (_derivFRChart) { _derivFRChart.destroy(); _derivFRChart = null; }

  const labels = frHistory.map(d => {
    const dt = new Date(d.timestamp);
    return dt.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' '
         + dt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  });
  const values = frHistory.map(d => d.value * 100); // to percentage
  const colors = values.map(v => v >= 0 ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)');

  const cs = getComputedStyle(document.documentElement);
  const gridColor = cs.getPropertyValue('--border').trim() || 'rgba(255,255,255,0.06)';
  const tickColor = cs.getPropertyValue('--text-muted').trim() || '#666';

  _derivFRChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderRadius: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toFixed(4)}%`,
          },
        },
        annotation: {
          annotations: {
            posLine: { type: 'line', yMin: 0.03, yMax: 0.03, borderColor: 'rgba(34,197,94,0.4)', borderDash: [4,4], borderWidth: 1 },
            negLine: { type: 'line', yMin: -0.03, yMax: -0.03, borderColor: 'rgba(239,68,68,0.4)', borderDash: [4,4], borderWidth: 1 },
            zeroLine: { type: 'line', yMin: 0, yMax: 0, borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1 },
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { size: 9 }, maxRotation: 45, maxTicksLimit: 10 },
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { size: 10, family: 'JetBrains Mono' }, callback: v => v.toFixed(3) + '%' },
        },
      },
    },
  });
}

function renderDerivOIChart(oiHistory, priceHistory) {
  const canvas = document.getElementById('mp-deriv-oi-chart');
  if (!canvas || (!oiHistory.length && !priceHistory.length)) return;

  if (_derivOIChart) { _derivOIChart.destroy(); _derivOIChart = null; }

  // Use price history timestamps as primary labels (more uniform)
  const primary = priceHistory.length ? priceHistory : oiHistory;
  const labels = primary.map(d => {
    const dt = new Date(d.timestamp);
    return dt.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' '
         + dt.toLocaleTimeString('zh-CN', { hour: '2-digit', hour12: false });
  });

  const cs = getComputedStyle(document.documentElement);
  const gridColor = cs.getPropertyValue('--border').trim() || 'rgba(255,255,255,0.06)';
  const tickColor = cs.getPropertyValue('--text-muted').trim() || '#666';

  const datasets = [];
  if (oiHistory.length) {
    datasets.push({
      label: 'Open Interest (BTC)',
      data: oiHistory.map(d => d.value),
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245,158,11,0.1)',
      fill: true,
      yAxisID: 'y',
      pointRadius: 0,
      borderWidth: 2,
      tension: 0.3,
    });
  }
  if (priceHistory.length) {
    datasets.push({
      label: 'Price (USD)',
      data: priceHistory.map(d => d.value),
      borderColor: '#3b82f6',
      backgroundColor: 'transparent',
      yAxisID: 'y1',
      pointRadius: 0,
      borderWidth: 2,
      tension: 0.3,
    });
  }

  _derivOIChart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: tickColor, font: { size: 10 }, boxWidth: 12 },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              return ctx.dataset.yAxisID === 'y1'
                ? `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                : v.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' BTC';
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { size: 9 }, maxRotation: 45, maxTicksLimit: 12 },
        },
        y: {
          position: 'left',
          grid: { color: gridColor },
          ticks: { color: '#f59e0b', font: { size: 10, family: 'JetBrains Mono' }, callback: v => (v / 1000).toFixed(0) + 'K' },
          title: { display: true, text: 'OI (BTC)', color: '#f59e0b', font: { size: 10 } },
        },
        y1: {
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#3b82f6', font: { size: 10, family: 'JetBrains Mono' }, callback: v => '$' + (v / 1000).toFixed(1) + 'K' },
          title: { display: true, text: 'Price', color: '#3b82f6', font: { size: 10 } },
        },
      },
      interaction: { intersect: false, mode: 'index' },
    },
  });
}

// ── DIFFICULTY TICKER ────────────────────────────────────────────────────────

async function fetchDifficulty() {
  try {
    // Fetch difficulty adjustment info and current difficulty in parallel
    const [adjRes, hrRes] = await Promise.all([
      fetch('https://mempool.space/api/v1/difficulty-adjustment').then(r => r.json()),
      fetch('https://mempool.space/api/v1/mining/hashrate/1d').then(r => r.json()),
    ]);

    const diffEl = document.getElementById('diffValue');
    const changeEl = document.getElementById('diffChange');
    const remainEl = document.getElementById('diffRemaining');
    if (!diffEl) return;

    // Current difficulty in T (trillions)
    const currentDiff = hrRes.currentDifficulty;
    const diffT = (currentDiff / 1e12).toFixed(2);
    diffEl.textContent = diffT + 'T';

    // Estimated next epoch change — API returns percentage directly (e.g. 2.46 = +2.46%)
    const changePct = adjRes.difficultyChange.toFixed(2);
    const isUp = adjRes.difficultyChange >= 0;
    changeEl.textContent = (isUp ? '+' : '') + changePct + '%';
    changeEl.className = isUp ? 'btc-change-pos' : 'btc-change-neg';

    // Remaining days until next adjustment
    const remainDays = Math.ceil(adjRes.remainingTime / 1000 / 60 / 60 / 24);
    remainEl.textContent = remainDays + (currentLang === 'zh' ? '天' : 'd');
  } catch (e) {
    // Silently fail if API is unavailable
  }
}

// ── BTC PRICE TICKER ─────────────────────────────────────────────────────────

let _lastBtcPrice = null;

async function fetchBtcPrice() {
  try {
    const res = await fetch('https://mempool.space/api/v1/prices');
    const d = await res.json();
    const price = d.USD;
    if (!price) return;

    const priceEl = document.getElementById('btcPrice');
    const changeEl = document.getElementById('btcChange');
    if (!priceEl) return;

    priceEl.textContent = '$' + price.toLocaleString();

    // Also update market-predict hero price with real-time data
    const mpPriceEl = document.getElementById('mp-price');
    if (mpPriceEl) {
      mpPriceEl.textContent = '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    if (_lastBtcPrice != null) {
      const pct = ((price - _lastBtcPrice) / _lastBtcPrice * 100).toFixed(2);
      const isUp = price >= _lastBtcPrice;
      changeEl.textContent = (isUp ? '+' : '') + pct + '%';
      changeEl.className = isUp ? 'btc-change-pos' : 'btc-change-neg';
    } else {
      changeEl.textContent = '';
    }
    _lastBtcPrice = price;
  } catch (e) {
    // Silently fail
  }
}

// ── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
  renderOverview();
  fetchBtcPrice();
  fetchDifficulty();
  // Refresh BTC price every 60 seconds
  setInterval(fetchBtcPrice, 60000);
});
