/**
 * BTC Mining Intelligence — Analyst Valuation Tab
 * Renders sell-side analyst valuation methodologies for BTC mining companies.
 *
 * Three sub-views:
 *   1. coverage  — bank × ticker matrix
 *   2. methods   — methodology distribution chart
 *   3. drilldown — per-ticker bank coverage detail
 */

const VALUATION_METHODS = ['SOTP', 'EV_EBITDA', 'EV_REVENUE', 'DCF', 'NAV', 'OTHER'];
const METHOD_COLORS = {
  SOTP:       '#7c3aed',
  EV_EBITDA:  '#0ea5e9',
  EV_REVENUE: '#10b981',
  DCF:        '#f59e0b',
  NAV:        '#ef4444',
  OTHER:      '#94a3b8'
};

let currentValuationView = 'coverage';
let currentDrilldownTicker = null;
let analystValuationChart = null;

async function loadAnalystValuation() {
  if (window.ANALYST_VALUATION) return window.ANALYST_VALUATION;
  try {
    const res = await fetch('data/analyst-valuation.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    window.ANALYST_VALUATION = await res.json();
  } catch (e) {
    console.warn('analyst-valuation.json load failed:', e);
    window.ANALYST_VALUATION = { _meta: {}, coverage: [] };
  }
  return window.ANALYST_VALUATION;
}

async function renderAnalystValuation() {
  const root = document.getElementById('analystValuationRoot');
  if (!root) return;
  await loadAnalystValuation();
  root.innerHTML = `
    <div class="av-sub-tabs">
      <button class="av-sub-tab${currentValuationView === 'coverage' ? ' active' : ''}" data-view="coverage">${t('av.view_coverage')}</button>
      <button class="av-sub-tab${currentValuationView === 'methods' ? ' active' : ''}" data-view="methods">${t('av.view_methods')}</button>
      <button class="av-sub-tab${currentValuationView === 'drilldown' ? ' active' : ''}" data-view="drilldown">${t('av.view_drilldown')}</button>
    </div>
    <div class="av-meta" id="avMeta"></div>
    <div class="av-content" id="avContent"></div>
  `;
  root.querySelectorAll('.av-sub-tab').forEach(btn => {
    btn.onclick = () => {
      currentValuationView = btn.dataset.view;
      renderAnalystValuation();
    };
  });
  renderValuationMeta();
  if (currentValuationView === 'coverage') renderCoverageMatrix();
  else if (currentValuationView === 'methods') renderMethodDistribution();
  else if (currentValuationView === 'drilldown') renderTickerDrilldown();
}

function renderValuationMeta() {
  const data = window.ANALYST_VALUATION || {};
  const meta = data._meta || {};
  const cov = data.coverage || [];
  const banks = new Set(cov.map(c => c.bank));
  const tickers = new Set(cov.map(c => c.ticker));
  const withMethod = cov.filter(c => c.valuation_method).length;
  const el = document.getElementById('avMeta');
  el.innerHTML = `
    <span class="av-meta-pill">${t('av.banks')}: <b>${banks.size}</b></span>
    <span class="av-meta-pill">${t('av.companies')}: <b>${tickers.size}</b></span>
    <span class="av-meta-pill">${t('av.records')}: <b>${cov.length}</b></span>
    <span class="av-meta-pill">${t('av.method_coverage')}: <b>${cov.length ? Math.round(100 * withMethod / cov.length) : 0}%</b></span>
    <span class="av-meta-pill av-meta-update">${t('av.updated')}: ${meta.last_updated || '—'}</span>
  `;
}

function renderCoverageMatrix() {
  const data = window.ANALYST_VALUATION || { coverage: [] };
  const cov = data.coverage || [];
  if (cov.length === 0) {
    document.getElementById('avContent').innerHTML = `<div class="empty-state">${t('av.no_data')}</div>`;
    return;
  }

  const banks = [...new Set(cov.map(c => c.bank))].sort();
  const tickers = [...new Set(cov.map(c => c.ticker))].sort();
  const cell = {};
  for (const c of cov) {
    const k = `${c.bank}|${c.ticker}`;
    if (!cell[k]) cell[k] = [];
    cell[k].push(c);
  }

  let html = `<div class="table-wrapper av-matrix-wrapper"><table class="av-matrix"><thead><tr><th class="av-matrix-corner">${t('av.bank')} \\ ${t('av.ticker')}</th>`;
  for (const tk of tickers) html += `<th class="av-matrix-th">${tk}</th>`;
  html += `</tr></thead><tbody>`;

  for (const bk of banks) {
    html += `<tr><th class="av-matrix-bank">${bk}</th>`;
    for (const tk of tickers) {
      const recs = cell[`${bk}|${tk}`];
      if (!recs) {
        html += `<td class="av-matrix-empty">—</td>`;
      } else {
        const r = recs[0];
        const m = r.valuation_method;
        const color = m ? METHOD_COLORS[m] || METHOD_COLORS.OTHER : 'transparent';
        const label = m ? methodLabel(m) : '?';
        const pt = r.target_price_usd ? `$${r.target_price_usd}` : '';
        html += `<td class="av-matrix-cell" title="${bk} → ${tk}: ${r.rating || ''} ${pt} (${m || 'method?'})" style="background:${color};">${label}${pt ? `<br><small>${pt}</small>` : ''}</td>`;
      }
    }
    html += `</tr>`;
  }
  html += `</tbody></table></div>`;

  html += `<div class="av-legend">`;
  for (const m of VALUATION_METHODS) {
    html += `<span class="av-legend-item"><span class="av-legend-swatch" style="background:${METHOD_COLORS[m]}"></span>${methodLabel(m)}</span>`;
  }
  html += `</div>`;

  document.getElementById('avContent').innerHTML = html;
}

function renderMethodDistribution() {
  const data = window.ANALYST_VALUATION || { coverage: [] };
  const cov = (data.coverage || []).filter(c => c.valuation_method);
  if (cov.length === 0) {
    document.getElementById('avContent').innerHTML = `<div class="empty-state">${t('av.no_data')}</div>`;
    return;
  }

  const counts = {};
  for (const m of VALUATION_METHODS) counts[m] = 0;
  for (const c of cov) counts[c.valuation_method] = (counts[c.valuation_method] || 0) + 1;
  const total = cov.length;

  const ranked = Object.entries(counts)
    .filter(([_, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  let html = `<div class="av-method-summary">`;
  html += `<p class="av-method-desc">${t('av.method_desc')}</p>`;
  html += `<div class="chart-container" style="max-width:720px;"><canvas id="avMethodChart" height="120"></canvas></div>`;
  html += `<table class="av-method-table"><thead><tr><th>${t('av.method')}</th><th class="td-right">${t('av.count')}</th><th class="td-right">${t('av.pct')}</th></tr></thead><tbody>`;
  for (const [m, n] of ranked) {
    html += `<tr><td><span class="av-legend-swatch" style="background:${METHOD_COLORS[m]}"></span> ${methodLabel(m)}</td><td class="td-right">${n}</td><td class="td-right">${(100 * n / total).toFixed(1)}%</td></tr>`;
  }
  html += `</tbody></table></div>`;

  document.getElementById('avContent').innerHTML = html;

  if (analystValuationChart) { analystValuationChart.destroy(); analystValuationChart = null; }
  const ctx = document.getElementById('avMethodChart');
  if (ctx && window.Chart) {
    analystValuationChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ranked.map(([m]) => methodLabel(m)),
        datasets: [{
          label: t('av.records'),
          data: ranked.map(([_, n]) => n),
          backgroundColor: ranked.map(([m]) => METHOD_COLORS[m])
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }
}

function renderTickerDrilldown() {
  const data = window.ANALYST_VALUATION || { coverage: [] };
  const cov = data.coverage || [];
  const tickers = [...new Set(cov.map(c => c.ticker))].sort();
  if (!currentDrilldownTicker || !tickers.includes(currentDrilldownTicker)) {
    currentDrilldownTicker = tickers[0] || null;
  }

  let html = `<div class="av-drilldown-controls"><label>${t('av.select_company')}: </label><select class="filter-select" id="avTickerSelect">`;
  for (const tk of tickers) html += `<option value="${tk}"${tk === currentDrilldownTicker ? ' selected' : ''}>${tk}</option>`;
  html += `</select></div>`;

  if (!currentDrilldownTicker) {
    html += `<div class="empty-state">${t('av.no_data')}</div>`;
    document.getElementById('avContent').innerHTML = html;
    return;
  }

  const recs = cov.filter(c => c.ticker === currentDrilldownTicker)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const targets = recs.map(r => r.target_price_usd).filter(v => v != null);
  const median = targets.length ? medianOf(targets) : null;
  const mean = targets.length ? (targets.reduce((s, v) => s + v, 0) / targets.length) : null;
  const high = targets.length ? Math.max(...targets) : null;
  const low = targets.length ? Math.min(...targets) : null;

  html += `<div class="av-consensus-card">
    <div class="av-consensus-cell"><span class="av-consensus-label">${t('av.consensus_median')}</span><span class="av-consensus-value">${median != null ? '$' + median.toFixed(2) : '—'}</span></div>
    <div class="av-consensus-cell"><span class="av-consensus-label">${t('av.consensus_mean')}</span><span class="av-consensus-value">${mean != null ? '$' + mean.toFixed(2) : '—'}</span></div>
    <div class="av-consensus-cell"><span class="av-consensus-label">${t('av.consensus_range')}</span><span class="av-consensus-value">${low != null ? '$' + low + ' — $' + high : '—'}</span></div>
    <div class="av-consensus-cell"><span class="av-consensus-label">${t('av.consensus_n')}</span><span class="av-consensus-value">${recs.length}</span></div>
  </div>`;

  html += `<div class="table-wrapper"><table><thead><tr>
    <th>${t('av.bank')}</th>
    <th>${t('av.analyst')}</th>
    <th>${t('av.date')}</th>
    <th>${t('av.rating')}</th>
    <th class="td-right">${t('av.target_price')}</th>
    <th>${t('av.method')}</th>
    <th>${t('av.method_detail')}</th>
    <th>${t('av.source')}</th>
  </tr></thead><tbody>`;

  for (const r of recs) {
    const m = r.valuation_method;
    const swatch = m ? `<span class="av-legend-swatch" style="background:${METHOD_COLORS[m]}"></span>` : '';
    const detail = formatBreakdown(r);
    const src = r.source_url ? `<a href="${r.source_url}" target="_blank" rel="noopener">↗</a>` : (r.source || '—');
    html += `<tr>
      <td><b>${r.bank || '—'}</b></td>
      <td>${r.analyst || '—'}</td>
      <td>${r.date || '—'}</td>
      <td>${r.rating || '—'}</td>
      <td class="td-right">${r.target_price_usd != null ? '$' + r.target_price_usd : '—'}</td>
      <td>${swatch}${m ? methodLabel(m) : '—'}</td>
      <td class="av-detail-cell">${detail}</td>
      <td>${src}</td>
    </tr>`;
  }
  html += `</tbody></table></div>`;

  document.getElementById('avContent').innerHTML = html;
  document.getElementById('avTickerSelect').onchange = (e) => {
    currentDrilldownTicker = e.target.value;
    renderTickerDrilldown();
  };
}

function methodLabel(m) {
  const labels = {
    SOTP:       currentLang === 'zh' ? '分部加总' : 'SOTP',
    EV_EBITDA:  'EV/EBITDA',
    EV_REVENUE: 'EV/Revenue',
    DCF:        'DCF/NPV',
    NAV:        'NAV',
    OTHER:      currentLang === 'zh' ? '其他' : 'Other'
  };
  return labels[m] || m;
}

function formatBreakdown(r) {
  if (r.sotp_breakdown && r.sotp_breakdown.length) {
    return r.sotp_breakdown.map(s =>
      `<div class="av-sotp-line"><b>${s.segment}</b>: ${s.method || ''} ${s.multiple || ''} → $${s.value_per_share || '?'}</div>`
    ).join('');
  }
  if (r.key_assumptions) return `<small>${r.key_assumptions}</small>`;
  if (r.note) return `<small>${r.note}</small>`;
  return '—';
}

function medianOf(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
