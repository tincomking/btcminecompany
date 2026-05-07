/**
 * BTC Mining Intelligence — Analyst Valuation Tab
 * Renders sell-side analyst valuation methodologies for BTC mining companies.
 *
 * Three sub-views:
 *   1. coverage  — bank × ticker matrix (click a cell to jump to drilldown)
 *   2. methods   — methodology distribution chart
 *   3. drilldown — per-ticker bank coverage + click row to see full formula
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
let currentSelectedKey = null;   // `${ticker}|${bank}|${date}` of expanded record
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
    <div class="av-detail" id="avDetail"></div>
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
  renderDetailPanel();
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

function recordKey(r) {
  return `${r.ticker}|${r.bank}|${r.date || ''}`;
}

function pickRecord(key) {
  const cov = (window.ANALYST_VALUATION || {}).coverage || [];
  return cov.find(r => recordKey(r) === key);
}

function selectRecord(key, opts = {}) {
  currentSelectedKey = key;
  if (opts.jumpToDrilldown) {
    const r = pickRecord(key);
    if (r) currentDrilldownTicker = r.ticker;
    currentValuationView = 'drilldown';
    renderAnalystValuation();
    setTimeout(() => {
      const el = document.getElementById('avDetail');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  } else {
    renderDetailPanel();
    const el = document.getElementById('avDetail');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
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
  // Within each cell, keep most recent first
  for (const k of Object.keys(cell)) {
    cell[k].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  let html = `<p class="av-hint">${t('av.matrix_hint')}</p>`;
  html += `<div class="table-wrapper av-matrix-wrapper"><table class="av-matrix"><thead><tr><th class="av-matrix-corner">${t('av.bank')} \\ ${t('av.ticker')}</th>`;
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
        const color = m ? METHOD_COLORS[m] || METHOD_COLORS.OTHER : '#cbd5e1';
        const label = m ? methodLabel(m) : '?';
        const pt = r.target_price_usd ? `$${r.target_price_usd}` : '';
        const key = recordKey(r);
        html += `<td class="av-matrix-cell" data-key="${escapeAttr(key)}" style="background:${color};">${label}${pt ? `<br><small>${pt}</small>` : ''}${recs.length > 1 ? `<sup>+${recs.length - 1}</sup>` : ''}</td>`;
      }
    }
    html += `</tr>`;
  }
  html += `</tbody></table></div>`;

  html += `<div class="av-legend">`;
  for (const m of VALUATION_METHODS) {
    html += `<span class="av-legend-item"><span class="av-legend-swatch" style="background:${METHOD_COLORS[m]}"></span>${methodLabel(m)}</span>`;
  }
  html += `<span class="av-legend-item"><span class="av-legend-swatch" style="background:#cbd5e1"></span>${t('av.method_unknown')}</span>`;
  html += `</div>`;

  const container = document.getElementById('avContent');
  container.innerHTML = html;
  container.querySelectorAll('.av-matrix-cell[data-key]').forEach(td => {
    td.onclick = () => selectRecord(td.dataset.key, { jumpToDrilldown: true });
  });
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

  html += `<p class="av-hint">${t('av.row_hint')}</p>`;

  html += `<div class="table-wrapper"><table class="av-drilldown-table"><thead><tr>
    <th>${t('av.bank')}</th>
    <th>${t('av.analyst')}</th>
    <th>${t('av.date')}</th>
    <th>${t('av.rating')}</th>
    <th class="td-right">${t('av.target_price')}</th>
    <th>${t('av.method')}</th>
    <th>${t('av.source')}</th>
  </tr></thead><tbody>`;

  for (const r of recs) {
    const m = r.valuation_method;
    const swatch = m ? `<span class="av-legend-swatch" style="background:${METHOD_COLORS[m]}"></span>` : '';
    const key = recordKey(r);
    const isSelected = key === currentSelectedKey ? ' selected' : '';
    const sourceCell = r.source_url
      ? `<a href="${escapeAttr(r.source_url)}" target="_blank" rel="noopener" class="av-src-link" onclick="event.stopPropagation()">${shortDomain(r.source_url)} ↗</a>`
      : (r.source || '—');
    html += `<tr class="av-clickable-row${isSelected}" data-key="${escapeAttr(key)}">
      <td><b>${escapeHtml(r.bank || '—')}</b></td>
      <td>${escapeHtml(r.analyst || '—')}</td>
      <td>${r.date || '—'}</td>
      <td>${escapeHtml(r.rating || '—')}</td>
      <td class="td-right">${r.target_price_usd != null ? '$' + r.target_price_usd : '—'}</td>
      <td>${swatch}${m ? methodLabel(m) : '—'}</td>
      <td>${sourceCell}</td>
    </tr>`;
  }
  html += `</tbody></table></div>`;

  const container = document.getElementById('avContent');
  container.innerHTML = html;
  document.getElementById('avTickerSelect').onchange = (e) => {
    currentDrilldownTicker = e.target.value;
    currentSelectedKey = null;
    renderAnalystValuation();
  };
  container.querySelectorAll('.av-clickable-row').forEach(tr => {
    tr.onclick = () => selectRecord(tr.dataset.key);
  });

  // Auto-select first record if nothing selected yet for this ticker
  if (!currentSelectedKey || !pickRecord(currentSelectedKey) || pickRecord(currentSelectedKey).ticker !== currentDrilldownTicker) {
    currentSelectedKey = recs.length ? recordKey(recs[0]) : null;
  }
}

function renderDetailPanel() {
  const el = document.getElementById('avDetail');
  if (!el) return;
  if (!currentSelectedKey) { el.innerHTML = ''; return; }
  const r = pickRecord(currentSelectedKey);
  if (!r) { el.innerHTML = ''; return; }

  const m = r.valuation_method;
  const swatch = m ? `<span class="av-legend-swatch" style="background:${METHOD_COLORS[m]}"></span>` : '';

  let formula = '';
  if (r.sotp_breakdown && r.sotp_breakdown.length) {
    const total = r.sotp_breakdown.reduce((s, seg) => s + (seg.value_per_share || 0), 0);
    formula = `<div class="av-formula">
      <h4>${t('av.formula_title')}</h4>
      <table class="av-sotp-table"><thead><tr>
        <th>${t('av.segment')}</th>
        <th>${t('av.method')}</th>
        <th>${t('av.multiple')}</th>
        <th class="td-right">${t('av.value_per_share')}</th>
      </tr></thead><tbody>`;
    for (const seg of r.sotp_breakdown) {
      formula += `<tr>
        <td><b>${escapeHtml(seg.segment || '—')}</b></td>
        <td>${escapeHtml(seg.method || '—')}</td>
        <td>${escapeHtml(seg.multiple || '—')}</td>
        <td class="td-right">${seg.value_per_share != null ? '$' + Number(seg.value_per_share).toFixed(2) : '—'}</td>
      </tr>`;
    }
    formula += `<tr class="av-sotp-total"><td colspan="3"><b>${t('av.sotp_total')}</b></td><td class="td-right"><b>$${total.toFixed(2)}</b></td></tr>`;
    formula += `</tbody></table></div>`;
  } else if (m) {
    formula = `<div class="av-formula">
      <h4>${t('av.formula_title')}</h4>
      <p class="av-no-formula">${t('av.no_formula_breakdown')}</p>
    </div>`;
  }

  const assumptions = r.key_assumptions
    ? `<div class="av-assumptions"><h4>${t('av.assumptions')}</h4><p>${escapeHtml(r.key_assumptions)}</p></div>`
    : '';

  const note = r.note
    ? `<div class="av-note"><h4>${t('av.rationale')}</h4><p>${escapeHtml(r.note)}</p></div>`
    : '';

  const sourceLink = r.source_url
    ? `<div class="av-source-link"><h4>${t('av.source_link')}</h4><a href="${escapeAttr(r.source_url)}" target="_blank" rel="noopener" class="av-src-full">${escapeHtml(r.source_url)} ↗</a></div>`
    : (r.source ? `<div class="av-source-link"><h4>${t('av.source_link')}</h4><span class="av-src-internal">${escapeHtml(r.source)}</span></div>` : '');

  const conf = r.method_confidence != null
    ? ` <span class="av-conf-badge" title="${t('av.method_confidence')}">conf=${(r.method_confidence * 100).toFixed(0)}%</span>`
    : '';

  el.innerHTML = `
    <div class="av-detail-panel">
      <div class="av-detail-header">
        <div class="av-detail-title">
          <span class="av-detail-ticker">${escapeHtml(r.ticker || '')}</span>
          <span class="av-detail-bank">${escapeHtml(r.bank || '—')}</span>
          ${r.analyst ? `<span class="av-detail-analyst">· ${escapeHtml(r.analyst)}</span>` : ''}
          <span class="av-detail-date">· ${r.date || '—'}</span>
        </div>
        <button class="av-detail-close" title="${t('av.close')}">×</button>
      </div>
      <div class="av-detail-summary">
        <span class="av-detail-pill">${t('av.rating')}: <b>${escapeHtml(r.rating || '—')}</b></span>
        <span class="av-detail-pill">${t('av.target_price')}: <b>${r.target_price_usd != null ? '$' + r.target_price_usd : '—'}</b></span>
        <span class="av-detail-pill">${t('av.method')}: ${swatch}<b>${m ? methodLabel(m) : '—'}</b>${conf}</span>
      </div>
      ${formula}
      ${assumptions}
      ${note}
      ${sourceLink}
    </div>
  `;
  el.querySelector('.av-detail-close').onclick = () => {
    currentSelectedKey = null;
    el.innerHTML = '';
  };
}

function methodLabel(m) {
  const labels = {
    SOTP:       currentLang === 'zh' ? '分部加总 (SOTP)' : 'SOTP',
    EV_EBITDA:  'EV/EBITDA',
    EV_REVENUE: 'EV/Revenue',
    DCF:        'DCF/NPV',
    NAV:        'NAV',
    OTHER:      currentLang === 'zh' ? '其他 (混合/对标)' : 'Other'
  };
  return labels[m] || m;
}

function shortDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch (_) { return url.slice(0, 30); }
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

function medianOf(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
