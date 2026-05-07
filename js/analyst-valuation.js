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

// State for method distribution view
let currentBankProfileKey = null;  // `${bank}|${method}`

function renderMethodDistribution() {
  const data = window.ANALYST_VALUATION || { coverage: [] };
  const allCov = data.coverage || [];
  const cov = allCov.filter(c => c.valuation_method);
  if (cov.length === 0) {
    document.getElementById('avContent').innerHTML = `<div class="empty-state">${t('av.no_data')}</div>`;
    return;
  }

  // ─── 1. Aggregate method counts (the original chart) ───
  const counts = {};
  for (const m of VALUATION_METHODS) counts[m] = 0;
  for (const c of cov) counts[c.valuation_method] = (counts[c.valuation_method] || 0) + 1;
  const total = cov.length;
  const ranked = Object.entries(counts)
    .filter(([_, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  // ─── 2. Per-bank methodology profile ───
  // Group records by (bank, method)
  const byBankMethod = {};
  for (const r of cov) {
    const k = `${r.bank}|${r.valuation_method}`;
    if (!byBankMethod[k]) byBankMethod[k] = [];
    byBankMethod[k].push(r);
  }
  // Bank-level totals (for sorting)
  const bankTotals = {};
  for (const r of cov) {
    bankTotals[r.bank] = (bankTotals[r.bank] || 0) + 1;
  }
  // Sort bank|method rows: by bank total desc, then by method count desc within a bank
  const bankMethodRows = Object.entries(byBankMethod)
    .map(([k, recs]) => {
      const [bank, method] = k.split('|');
      return { key: k, bank, method, recs, bankTotal: bankTotals[bank] };
    })
    .sort((a, b) =>
      b.bankTotal - a.bankTotal ||
      a.bank.localeCompare(b.bank) ||
      b.recs.length - a.recs.length
    );

  // ─── 3. Build HTML ───
  let html = `<div class="av-method-summary">`;
  html += `<p class="av-method-desc">${t('av.method_desc')}</p>`;
  html += `<div class="chart-container" style="max-width:720px;"><canvas id="avMethodChart" height="100"></canvas></div>`;
  html += `<table class="av-method-table"><thead><tr><th>${t('av.method')}</th><th class="td-right">${t('av.count')}</th><th class="td-right">${t('av.pct')}</th></tr></thead><tbody>`;
  for (const [m, n] of ranked) {
    html += `<tr><td><span class="av-legend-swatch" style="background:${METHOD_COLORS[m]}"></span> ${methodLabel(m)}</td><td class="td-right">${n}</td><td class="td-right">${(100 * n / total).toFixed(1)}%</td></tr>`;
  }
  html += `</tbody></table></div>`;

  // ─── 4. Bank methodology profile section ───
  html += `<div class="av-bank-profiles">`;
  html += `<div class="section-header mt-24"><div class="section-title">${t('av.bank_profiles_title')}</div></div>`;
  html += `<p class="av-method-desc">${t('av.bank_profiles_desc')}</p>`;
  html += `<div class="table-wrapper"><table class="av-bank-profile-table"><thead><tr>
    <th>${t('av.bank')}</th>
    <th>${t('av.method')}</th>
    <th class="td-right">${t('av.uses')}</th>
    <th>${t('av.formula_template')}</th>
    <th>${t('av.coverage_examples')}</th>
  </tr></thead><tbody>`;

  for (const row of bankMethodRows) {
    const tpl = inferFormulaTemplate(row.recs);
    const examples = formatCoverageExamples(row.recs);
    const swatch = `<span class="av-legend-swatch" style="background:${METHOD_COLORS[row.method] || '#cbd5e1'}"></span>`;
    const isSelected = row.key === currentBankProfileKey ? ' selected' : '';
    html += `<tr class="av-bank-profile-row${isSelected}" data-key="${escapeAttr(row.key)}">
      <td><b>${escapeHtml(row.bank)}</b><br><small class="av-bank-total">${t('av.total_in_method_db')}: ${row.bankTotal}</small></td>
      <td>${swatch}<b>${methodLabel(row.method)}</b></td>
      <td class="td-right"><b>${row.recs.length}</b><br><small>${(100 * row.recs.length / row.bankTotal).toFixed(0)}% ${t('av.of_bank')}</small></td>
      <td class="av-formula-tpl">${tpl}</td>
      <td class="av-coverage-examples">${examples}</td>
    </tr>`;
  }
  html += `</tbody></table></div></div>`;

  // ─── 5. Bank profile detail panel placeholder (rendered below) ───
  html += `<div id="avBankProfileDetail"></div>`;

  document.getElementById('avContent').innerHTML = html;

  // Wire bank profile row clicks
  document.querySelectorAll('.av-bank-profile-row').forEach(tr => {
    tr.onclick = () => {
      currentBankProfileKey = tr.dataset.key;
      // Update selected styling
      document.querySelectorAll('.av-bank-profile-row').forEach(r => r.classList.toggle('selected', r === tr));
      renderBankProfileDetail(byBankMethod[tr.dataset.key]);
    };
  });

  // If a profile was already selected from earlier, render it
  if (currentBankProfileKey && byBankMethod[currentBankProfileKey]) {
    renderBankProfileDetail(byBankMethod[currentBankProfileKey]);
  }

  // Chart
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

// ─── Bank methodology profile helpers ───

/**
 * Infer a "formula template" string for a (bank, method) combo from its records.
 * For SOTP: list the most-common segments/multiples seen
 * For EV/EBITDA / EV/Revenue: compute mean & range of multiples (parsed from key_assumptions)
 * For DCF: list discount-rate hints
 * Otherwise: show the most representative key_assumptions line
 */
function inferFormulaTemplate(recs) {
  if (!recs || recs.length === 0) return '—';
  const method = recs[0].valuation_method;

  // SOTP: aggregate segment templates
  if (method === 'SOTP') {
    const segCounter = {};   // segment name -> {count, methods:Set, multiples:Set}
    let withBreakdown = 0;
    for (const r of recs) {
      if (!r.sotp_breakdown || !r.sotp_breakdown.length) continue;
      withBreakdown++;
      for (const s of r.sotp_breakdown) {
        const seg = (s.segment || '').trim();
        if (!seg) continue;
        if (!segCounter[seg]) segCounter[seg] = { count: 0, methods: new Set(), multiples: new Set() };
        segCounter[seg].count++;
        if (s.method) segCounter[seg].methods.add(s.method);
        if (s.multiple) segCounter[seg].multiples.add(s.multiple);
      }
    }
    if (withBreakdown === 0) {
      const sample = recs.find(r => r.key_assumptions);
      return sample ? `<small>${escapeHtml(sample.key_assumptions)}</small>` : `<small class="av-tpl-empty">${t('av.tpl_no_breakdown')}</small>`;
    }
    const segs = Object.entries(segCounter).sort((a, b) => b[1].count - a[1].count).slice(0, 4);
    let out = `<div class="av-tpl-sotp">`;
    for (const [seg, info] of segs) {
      const mlist = [...info.methods].slice(0, 2).join(' / ');
      const xlist = [...info.multiples].slice(0, 2).join(', ');
      out += `<div class="av-tpl-line"><b>${escapeHtml(seg)}</b> · ${escapeHtml(mlist || '?')} ${xlist ? `(${escapeHtml(xlist)})` : ''} <small>×${info.count}</small></div>`;
    }
    out += `</div>`;
    return out;
  }

  // EV/EBITDA, EV/Revenue: extract numeric multiples from key_assumptions
  if (method === 'EV_EBITDA' || method === 'EV_REVENUE') {
    const re = method === 'EV_EBITDA' ? /(\d+(?:\.\d+)?)\s*x\s*(?:20\d\d[EAa]?|FY\+?\d|fwd|trail|NTM|LTM)?\s*(?:EV[/-])?EBITDA/i
                                       : /(\d+(?:\.\d+)?)\s*x\s*(?:20\d\d[EAa]?|FY\+?\d|fwd|trail|NTM|LTM)?\s*(?:EV[/-])?(?:Revenue|Sales)/i;
    const multiples = [];
    for (const r of recs) {
      const text = (r.key_assumptions || '') + ' ' + (r.note || '');
      const m = text.match(re);
      if (m) multiples.push(parseFloat(m[1]));
    }
    let out = `<div class="av-tpl-multi">`;
    if (multiples.length) {
      const mean = multiples.reduce((s, x) => s + x, 0) / multiples.length;
      const lo = Math.min(...multiples);
      const hi = Math.max(...multiples);
      const tag = method === 'EV_EBITDA' ? 'EBITDA' : 'Revenue';
      out += `<div class="av-tpl-line"><b>${mean.toFixed(1)}x</b> EV/${tag} <small>(range ${lo}x-${hi}x, n=${multiples.length})</small></div>`;
    }
    const sample = recs.find(r => r.key_assumptions);
    if (sample) out += `<div class="av-tpl-line"><small>${t('av.tpl_example')}: ${escapeHtml(sample.key_assumptions.slice(0, 140))}${sample.key_assumptions.length > 140 ? '…' : ''}</small></div>`;
    out += `</div>`;
    return out;
  }

  // DCF/OTHER/NAV: show first key_assumptions
  const sample = recs.find(r => r.key_assumptions);
  if (sample) return `<small>${escapeHtml(sample.key_assumptions.slice(0, 200))}${sample.key_assumptions.length > 200 ? '…' : ''}</small>`;
  return `<small class="av-tpl-empty">${t('av.tpl_no_breakdown')}</small>`;
}

/**
 * Render a compact list of (ticker · date · target) examples for the bank-method row's last column.
 */
function formatCoverageExamples(recs) {
  if (!recs || !recs.length) return '—';
  // Sort by date desc, take top 6
  const sorted = [...recs].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);
  let html = `<div class="av-cov-list">`;
  for (const r of sorted) {
    const pt = r.target_price_usd != null ? `$${r.target_price_usd}` : '—';
    html += `<span class="av-cov-tag" title="${escapeAttr(r.bank + ' on ' + r.ticker + ', ' + (r.date||'') + ' → ' + pt)}"><b>${escapeHtml(r.ticker)}</b> <small>${r.date || ''}</small> · ${pt}</span>`;
  }
  if (recs.length > 6) html += `<span class="av-cov-more">+${recs.length - 6} more</span>`;
  html += `</div>`;
  return html;
}

/**
 * Render the per-bank-method detail panel below the bank profile table.
 * Lists every record using this (bank, method) combo with full source links + assumptions.
 */
function renderBankProfileDetail(recs) {
  const el = document.getElementById('avBankProfileDetail');
  if (!el || !recs) return;
  const sorted = [...recs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const bank = recs[0].bank;
  const method = recs[0].valuation_method;
  const swatch = `<span class="av-legend-swatch" style="background:${METHOD_COLORS[method] || '#cbd5e1'}"></span>`;

  let html = `<div class="av-detail-panel av-bank-detail">
    <div class="av-detail-header">
      <div class="av-detail-title">
        <span class="av-detail-bank">${escapeHtml(bank)}</span>
        <span class="av-detail-bank-method">${swatch}${methodLabel(method)}</span>
        <span class="av-detail-date">· ${recs.length} ${t('av.records')}</span>
      </div>
      <button class="av-detail-close" title="${t('av.close')}">×</button>
    </div>`;

  // Aggregate metrics
  const targets = recs.map(r => r.target_price_usd).filter(v => v != null);
  if (targets.length) {
    const mean = targets.reduce((s, v) => s + v, 0) / targets.length;
    const median = medianOf(targets);
    html += `<div class="av-detail-summary">
      <span class="av-detail-pill">${t('av.tpl_avg_pt')}: <b>$${mean.toFixed(2)}</b></span>
      <span class="av-detail-pill">${t('av.consensus_median')}: <b>$${median.toFixed(2)}</b></span>
      <span class="av-detail-pill">${t('av.consensus_range')}: <b>$${Math.min(...targets)} — $${Math.max(...targets)}</b></span>
    </div>`;
  }

  // Per-record table
  html += `<div class="table-wrapper" style="margin-top:12px;"><table class="av-bank-detail-table"><thead><tr>
    <th>${t('av.ticker')}</th>
    <th>${t('av.date')}</th>
    <th>${t('av.analyst')}</th>
    <th>${t('av.rating')}</th>
    <th class="td-right">${t('av.target_price')}</th>
    <th>${t('av.assumptions')}</th>
    <th>${t('av.source_link')}</th>
  </tr></thead><tbody>`;
  for (const r of sorted) {
    const src = r.source_url
      ? `<a href="${escapeAttr(r.source_url)}" target="_blank" rel="noopener" class="av-src-link">${shortDomain(r.source_url)} ↗</a>`
      : (r.source || '—');
    const ka = r.key_assumptions
      ? `<small>${escapeHtml(r.key_assumptions.length > 220 ? r.key_assumptions.slice(0, 220) + '…' : r.key_assumptions)}</small>`
      : '—';
    html += `<tr>
      <td><b>${escapeHtml(r.ticker)}</b></td>
      <td>${r.date || '—'}</td>
      <td>${escapeHtml(r.analyst || '—')}</td>
      <td>${escapeHtml(r.rating || '—')}</td>
      <td class="td-right">${r.target_price_usd != null ? '$' + r.target_price_usd : '—'}</td>
      <td class="av-assumptions-cell">${ka}</td>
      <td>${src}</td>
    </tr>`;
  }
  html += `</tbody></table></div>`;

  // Sample SOTP breakdown (first record with one)
  const sampleSotp = sorted.find(r => r.sotp_breakdown && r.sotp_breakdown.length);
  if (sampleSotp) {
    const total = sampleSotp.sotp_breakdown.reduce((s, seg) => s + (seg.value_per_share || 0), 0);
    html += `<div class="av-formula" style="margin-top:16px;"><h4>${t('av.formula_sample')} (${escapeHtml(sampleSotp.ticker)} · ${sampleSotp.date || ''})</h4>`;
    html += `<table class="av-sotp-table"><thead><tr><th>${t('av.segment')}</th><th>${t('av.method')}</th><th>${t('av.multiple')}</th><th class="td-right">${t('av.value_per_share')}</th></tr></thead><tbody>`;
    for (const seg of sampleSotp.sotp_breakdown) {
      html += `<tr>
        <td><b>${escapeHtml(seg.segment || '—')}</b></td>
        <td>${escapeHtml(seg.method || '—')}</td>
        <td>${escapeHtml(seg.multiple || '—')}</td>
        <td class="td-right">${seg.value_per_share != null ? '$' + Number(seg.value_per_share).toFixed(2) : '—'}</td>
      </tr>`;
    }
    html += `<tr class="av-sotp-total"><td colspan="3"><b>${t('av.sotp_total')}</b></td><td class="td-right"><b>$${total.toFixed(2)}</b></td></tr>`;
    html += `</tbody></table></div>`;
  }

  html += `</div>`;
  el.innerHTML = html;
  el.querySelector('.av-detail-close').onclick = () => {
    currentBankProfileKey = null;
    el.innerHTML = '';
    document.querySelectorAll('.av-bank-profile-row').forEach(r => r.classList.remove('selected'));
  };
  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
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
