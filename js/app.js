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
  return FINANCIALS.filter(f => f.ticker === ticker && f.is_reported)
    .sort((a, b) => b.period_end_date.localeCompare(a.period_end_date))[0] || null;
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

function sentimentClass(score) {
  if (score == null) return 'sentiment-pill pill-neutral';
  if (score >= 0.5) return 'sentiment-pill pill-bullish';
  if (score <= 0) return 'sentiment-pill pill-bearish';
  return 'sentiment-pill pill-neutral';
}

function sentimentLabel(score) {
  if (score == null) return '—';
  if (score >= 0.5) return t('js.bullish');
  if (score <= 0) return t('js.bearish');
  return t('js.neutral');
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
  const totalMktCap = COMPANIES.reduce((s, c) => s + (c.market_cap_usd_m || 0), 0);
  document.getElementById('stat-mktcap').textContent = totalMktCap > 0 ? `$${(totalMktCap / 1000).toFixed(1)}B` : '—';

  // Total BTC held (from latest financial or operational)
  let totalBtc = 0;
  COMPANIES.forEach(co => {
    const fin = getLatestFinancial(co.ticker);
    const ops = getLatestOperational(co.ticker);
    const btc = (fin && fin.btc_held) || (ops && ops.btc_held) || 0;
    totalBtc += btc;
  });
  document.getElementById('stat-btc').textContent = totalBtc > 0 ? totalBtc.toLocaleString() : '—';

  // Total hashrate & BTC mined from latest operational period
  const latestP = getLatestPeriod();
  const latestOps = OPERATIONAL.filter(o => o.period === latestP);
  const totalHash = latestOps.reduce((s, o) => s + (o.hash_rate_eh || 0), 0);
  const totalMined = latestOps.reduce((s, o) => s + (o.btc_mined || 0), 0);

  document.getElementById('stat-hashrate').textContent = totalHash > 0 ? `${totalHash.toFixed(1)} EH/s` : '—';
  document.getElementById('stat-btcmined').textContent = totalMined > 0 ? totalMined.toLocaleString() : '—';
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
    const score = soc ? soc.composite_score : null;

    return `
      <div class="company-card" data-ticker="${co.ticker}" onclick="openCompanyModal('${co.ticker}')">
        <div class="company-card-header">
          <div class="company-identity">
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
            <div class="metric-value">${fin ? fmt.usd(fin.revenue_usd_m) : t('js.pending')}</div>
            <div class="metric-yoy">${fin ? fmt.pct(fin.revenue_yoy_pct, fin.revenue_yoy_pct != null ? (fin.fiscal_quarter === 'FY' ? 'yoy' : 'yoy') : null) : ''}</div>
          </div>
          <div class="metric-block">
            <div class="metric-label">Adj. EBITDA</div>
            <div class="metric-value">${fin ? fmt.usd(fin.adjusted_ebitda_usd_m) : t('js.pending')}</div>
            <div class="metric-yoy">${fin ? fmt.pct(fin.adjusted_ebitda_yoy_pct, fin.adjusted_ebitda_yoy_pct != null ? 'yoy' : null) : ''}</div>
          </div>
          <div class="metric-block">
            <div class="metric-label">${t('js.btc_holding')}</div>
            <div class="metric-value">${fin && fin.btc_held ? fin.btc_held.toLocaleString() : ops && ops.btc_held ? ops.btc_held.toLocaleString() : '—'}</div>
            <div class="metric-yoy" style="color:var(--text-muted);font-size:10px;">${t('js.btc_unit')}</div>
          </div>
          <div class="metric-block">
            <div class="metric-label">${t('js.hashrate')}</div>
            <div class="metric-value">${ops ? ops.hash_rate_eh + ' EH/s' : '—'}</div>
            <div class="metric-yoy" style="color:var(--text-muted);font-size:10px;">${ops ? t('js.monthly_mined') + ' ' + ops.btc_mined + ' BTC' : ''}</div>
          </div>
        </div>

        <div class="company-card-footer">
          <div class="earnings-info">
            ${fin ? `<span class="earnings-label">${t('js.latest_report')}</span><span class="earnings-date">${fin.period_label} · ${fmt.date(fin.report_date)}</span>` : ''}
            ${upcoming ? `<span class="earnings-label" style="margin-top:4px;">${t('js.next_expected')}</span><span class="earnings-date" style="color:var(--orange);">${upcoming.period_label} · ${fmt.date(upcoming.estimated_report_date)}</span>` : ''}
          </div>
          <div class="${sentimentClass(score)}">
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

function renderFinancials() {
  renderFinancialsTable();
  renderEarningsTable();
  renderRevenueChart();
  setupFinancialFilters();
}

function getFilteredFinancials() {
  let data = FINANCIALS.filter(f => f.is_reported);
  if (finCurrentCompany !== 'ALL') data = data.filter(f => f.ticker === finCurrentCompany);
  if (finCurrentPeriod === 'latest') {
    // Get latest reported for each company
    const map = {};
    data.forEach(f => {
      if (!map[f.ticker] || f.period_end_date > map[f.ticker].period_end_date) {
        map[f.ticker] = f;
      }
    });
    data = Object.values(map);
  } else if (finCurrentPeriod !== 'FY') {
    const [q, y] = finCurrentPeriod.split('-');
    data = data.filter(f => f.fiscal_quarter === q && String(f.fiscal_year) === y);
  }
  return data.sort((a, b) => ((b.revenue_usd_m)||0) - ((a.revenue_usd_m)||0));
}

function renderFinancialsTable() {
  const body = document.getElementById('financialsBody');
  const data = getFilteredFinancials();

  if (!data.length) {
    body.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:32px;color:var(--text-muted);">${t('js.no_data')}</td></tr>`;
    return;
  }

  body.innerHTML = data.map(f => {
    const co = COMPANIES.find(c => c.ticker === f.ticker);
    const niStr = f.net_income_usd_m == null ? '<span class="no-data">—</span>' :
      `<span class="${f.net_income_usd_m >= 0 ? 'text-green' : 'text-red'} text-mono">${f.net_income_usd_m >= 0 ? '' : ''}${fmt.usd(f.net_income_usd_m)}</span>`;

    return `<tr>
      <td>
        <div style="display:flex;flex-direction:column;gap:1px;">
          <span class="td-ticker">${f.ticker}</span>
          <span style="font-size:10px;color:var(--text-muted);">${co ? co.name : ''}</span>
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
    </tr>`;
  }).join('');
}

function renderEarningsTable() {
  const body = document.getElementById('earningsBody');
  // All entries sorted by date
  const data = FINANCIALS
    .sort((a, b) => {
      const da = a.estimated_report_date || a.report_date || '';
      const db = b.estimated_report_date || b.report_date || '';
      return db.localeCompare(da);
    });

  body.innerHTML = data.map(f => {
    const co = COMPANIES.find(c => c.ticker === f.ticker);
    const dateStr = f.report_date || f.estimated_report_date;
    const statusBadge = f.is_reported
      ? `<span class="status-badge status-reported"><span class="dot"></span>${t('js.reported')}</span>`
      : `<span class="status-badge status-estimated"><span class="dot dot-pulse"></span>${t('js.expected_release')}</span>`;

    return `<tr>
      <td>
        <div style="display:flex;flex-direction:column;gap:1px;">
          <span class="td-ticker">${f.ticker}</span>
          <span style="font-size:10px;color:var(--text-muted);">${co ? co.name : ''}</span>
        </div>
      </td>
      <td class="td-mono">${f.period_label}</td>
      <td class="td-mono td-primary">${fmt.date(dateStr)}</td>
      <td>${statusBadge}</td>
      <td class="td-mono" style="color:var(--text-muted);">${f.is_reported ? fmt.usd(f.revenue_usd_m) : `<span class="no-data">${t('js.pending')}</span>`}</td>
      <td class="td-mono" style="color:var(--text-muted);">${f.is_reported && f.eps_diluted != null ? (f.eps_diluted >= 0 ? '+' : '') + f.eps_diluted.toFixed(2) : '<span class="no-data">—</span>'}</td>
      <td style="font-size:11px;color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;">${f.notes || '—'}</td>
    </tr>`;
  }).join('');
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

  const cc = chartColors();
  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: t('js.revenue_label'), data: revData, backgroundColor: 'rgba(59,130,246,0.7)', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 4 },
        { label: t('js.ebitda_label'), data: ebitdaData, backgroundColor: 'rgba(16,185,129,0.7)', borderColor: '#10b981', borderWidth: 1, borderRadius: 4 }
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

    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.ac-item[data-value]');
      if (!item) return;
      const val = item.dataset.value;
      finCurrentCompany = val;
      input.value = val === 'ALL' ? '' : item.textContent;
      input.placeholder = val === 'ALL' ? t('filter.all_companies') : '';
      dropdown.classList.remove('open');
      renderFinancialsTable();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#fin-company-ac-wrapper')) {
        dropdown.classList.remove('open');
      }
    });
  }

  // Period filter
  document.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      finCurrentPeriod = btn.dataset.period;
      renderFinancialsTable();
    });
  });
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
  const latestP = periods[0] || '2025-01';
  renderOpsTable(latestP);
  renderBtcProductionChart();
  setupOpsFilters();
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
        <div style="display:flex;flex-direction:column;gap:1px;">
          <span class="td-ticker">${o.ticker}</span>
          <span style="font-size:10px;color:var(--text-muted);">${co ? co.name : ''}</span>
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
        <div class="news-title">${n.title}</div>
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
  // Sentiment donut
  const canvas1 = document.getElementById('sentimentDonut');
  if (canvas1) {
    const pos = NEWS.filter(n => n.sentiment === 'positive').length;
    const neg = NEWS.filter(n => n.sentiment === 'negative').length;
    const neu = NEWS.filter(n => n.sentiment === 'neutral').length;
    const cc3 = chartColors();
    if (canvas1._chart) canvas1._chart.destroy();
    canvas1._chart = new Chart(canvas1, {
      type: 'doughnut',
      data: {
        labels: [t('js.positive'), t('js.negative'), t('js.neutral')],
        datasets: [{ data: [pos, neg, neu], backgroundColor: ['rgba(16,185,129,0.8)','rgba(239,68,68,0.8)','rgba(96,96,96,0.8)'], borderWidth: 0, hoverOffset: 4 }]
      },
      options: {
        cutout: '65%',
        plugins: {
          legend: { position:'bottom', labels: { color: cc3.legend, font: { size: 11 }, padding: 12, usePointStyle: true } },
          tooltip: { backgroundColor: cc3.tooltip.bg, borderColor: cc3.tooltip.border, borderWidth: 1, titleColor: cc3.tooltip.title, bodyColor: cc3.tooltip.body }
        }
      }
    });
  }

  // Category bar
  const canvas2 = document.getElementById('categoryChart');
  if (canvas2) {
    const cats = {};
    NEWS.forEach(n => { cats[n.category] = (cats[n.category]||0) + 1; });
    const sorted = Object.entries(cats).sort((a,b) => b[1]-a[1]);
    const cc4 = chartColors();
    if (canvas2._chart) canvas2._chart.destroy();
    canvas2._chart = new Chart(canvas2, {
      type: 'bar',
      data: {
        labels: sorted.map(([c]) => categoryLabel(c)),
        datasets: [{ data: sorted.map(([,v]) => v), backgroundColor: 'rgba(59,130,246,0.6)', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 4 }]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { backgroundColor: cc4.tooltip.bg, borderColor: cc4.tooltip.border, borderWidth: 1, titleColor: cc4.tooltip.title, bodyColor: cc4.tooltip.body } },
        scales: {
          x: { ticks: { color: cc4.tick }, grid: { color: cc4.grid } },
          y: { ticks: { color: cc4.legend, font: { size: 11 } }, grid: { display: false } }
        }
      }
    });
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
  renderRatingsTable();
  renderRatingsPieChart();
  renderTargetPriceTable();
  renderSocialSentiment();
}

function renderRatingsTable() {
  const body = document.getElementById('ratingsBody');
  const data = [...SENTIMENT.analyst_ratings].sort((a, b) => b.date.localeCompare(a.date));

  body.innerHTML = data.map(r => {
    const co = COMPANIES.find(c => c.ticker === r.ticker);
    const targetDelta = r.target_price_usd && r.prev_target_price_usd
      ? ((r.target_price_usd / r.prev_target_price_usd - 1) * 100)
      : null;
    return `<tr>
      <td>
        <div style="display:flex;flex-direction:column;gap:1px;">
          <span class="td-ticker">${r.ticker}</span>
          <span style="font-size:10px;color:var(--text-muted);">${co ? co.name : ''}</span>
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
      <td style="font-size:10px;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;" title="${r.note||''}">${r.note ? r.note.substring(0,60) + (r.note.length>60?'…':'') : '—'}</td>
    </tr>`;
  }).join('');
}

function renderRatingsPieChart() {
  const canvas = document.getElementById('ratingsPieChart');
  if (!canvas) return;

  // Get latest rating per company per firm
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
      cutout: '60%',
      plugins: {
        legend: { position:'bottom', labels: { color: cc5.legend, font: { size: 11 }, padding: 12, usePointStyle: true } },
        tooltip: { backgroundColor: cc5.tooltip.bg, borderColor: cc5.tooltip.border, borderWidth: 1, titleColor: cc5.tooltip.title, bodyColor: cc5.tooltip.body }
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
  const data = [...SENTIMENT.social_sentiment].sort((a, b) => b.composite_score - a.composite_score);

  panel.innerHTML = data.map(s => {
    const co = COMPANIES.find(c => c.ticker === s.ticker);
    const scoreClass = s.composite_score >= 0.5 ? 'score-pos' : s.composite_score <= 0.1 ? 'score-neg' : 'score-neu';
    const trendIcon = s.trend_direction === 'up' ? '↑' : s.trend_direction === 'down' ? '↓' : '→';
    const trendColor = s.trend_direction === 'up' ? 'var(--green)' : s.trend_direction === 'down' ? 'var(--red)' : 'var(--text-muted)';

    return `
      <div class="sentiment-row">
        <div class="sentiment-header">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="sentiment-ticker">${s.ticker}</span>
            <span style="font-size:10px;color:var(--text-muted);">${co ? co.name : ''}</span>
            ${s.trending ? `<span style="font-size:9px;padding:1px 6px;background:var(--orange-dim);color:var(--orange);border-radius:3px;font-weight:600;">${t('js.trending')}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:10px;color:${trendColor};">${trendIcon}</span>
            <span class="sentiment-score-num ${scoreClass}">${(s.composite_score * 100).toFixed(0)}</span>
            <span style="font-size:9px;color:var(--text-muted);">/100</span>
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

  const allFin = FINANCIALS.filter(f => f.ticker === ticker && f.is_reported)
    .sort((a, b) => b.period_end_date.localeCompare(a.period_end_date));
  const latest = allFin[0];

  document.getElementById('modal-ticker').textContent = ticker;
  document.getElementById('modal-name').textContent = co.full_name;
  document.getElementById('modal-desc').textContent = co.description;

  const metrics = document.getElementById('modalMetrics');
  if (latest) {
    metrics.innerHTML = [
      { label:t('js.latest_revenue'), value:fmt.usd(latest.revenue_usd_m), yoy:latest.revenue_yoy_pct, yoyType:'yoy', period:latest.period_label },
      { label:t('th.net_income'), value: latest.net_income_usd_m != null ? fmt.usd(latest.net_income_usd_m) : '—', yoy:null, period:latest.period_label },
      { label:'Adj. EBITDA', value:fmt.usd(latest.adjusted_ebitda_usd_m), yoy:latest.adjusted_ebitda_yoy_pct, yoyType:'yoy', period:latest.period_label },
      { label:t('th.eps'), value:latest.eps_diluted != null ? (latest.eps_diluted>=0?'+':'')+latest.eps_diluted.toFixed(2) : '—', yoy:null },
      { label:t('js.btc_held_label'), value:latest.btc_held ? latest.btc_held.toLocaleString()+' BTC' : '—', yoy:null },
      { label:t('js.total_debt'), value:fmt.usd(latest.total_debt_usd_m), yoy:null },
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

let currentAnalysisModel = 'beneish';

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
  const modelKeys = ['beneish', 'piotroski', 'jones', 'altman', 'kmv', 'montecarlo'];
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

  // Default to first company
  if (results.length) {
    newSel.value = results[0].ticker;
    renderMonteCarloChart(results[0]);
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

// ── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
  renderOverview();
});
