/**
 * BTC Mining Intelligence — i18n & Theme Manager
 */

const I18N = {
  zh: {
    // Nav
    'nav.overview': '概览',
    'nav.financials': '财务数据',
    'nav.operations': '运营披露',
    'nav.news': '新闻动态',
    'nav.sentiment': '市场情绪',

    // Stats bar
    'stats.tracked': '追踪公司',
    'stats.tracked_sub': 'US上市矿商',
    'stats.mktcap': '总市值',
    'stats.mktcap_sub': '合并市值',
    'stats.btc_held': '合并持仓 BTC',
    'stats.btc_held_sub': '各公司合计持有',
    'stats.hashrate': '合并算力',
    'stats.hashrate_sub': '10月 运营算力',
    'stats.monthly': '合并月产量',
    'stats.monthly_sub': 'BTC / 2024年10月',

    // Overview
    'overview.upcoming_earnings': '即将发布财报',
    'overview.estimated_date': '预估日期',
    'overview.all_companies': '所有公司',

    // Sort
    'sort.mktcap': '市值排序',
    'sort.revenue': '营收排序',
    'sort.ebitda': 'EBITDA排序',
    'sort.hashrate': '算力排序',

    // Filters
    'filter.company': '公司：',
    'filter.all_companies': '全部公司',
    'filter.period': '报告期：',
    'filter.latest': '最新期',
    'filter.fy': '全年',
    'filter.filter': '筛选：',
    'filter.all': '全部',

    // Financials
    'fin.revenue_chart_title': '各公司季度营收对比（最新期）',
    'fin.summary': '财务数据汇总',
    'fin.unit_note': '单位：USD百万 | YoY=同比增长',
    'fin.earnings_calendar': '财报日历',

    // Table headers
    'th.company': '公司',
    'th.period': '报告期',
    'th.revenue': '营收 (M)',
    'th.revenue_yoy': '营收 YoY',
    'th.net_income': '净利润 (M)',
    'th.net_income_yoy': '净利润 YoY',
    'th.eps': 'EPS（摊薄）',
    'th.status': '财报状态',
    'th.report_date': '财报日期',
    'th.revenue_est': '营收预期',
    'th.eps_est': 'EPS预期',
    'th.notes': '备注',
    'th.btc_mined': 'BTC产量',
    'th.btc_held': 'BTC持仓',
    'th.btc_sold': 'BTC销售',
    'th.hashrate': '算力 (EH/s)',
    'th.installed_cap': '装机算力 (EH/s)',
    'th.power_cap': '电力容量 (MW)',
    'th.efficiency': '机队效率 (J/TH)',
    'th.power_cost': '电价 (¢/kWh)',
    'th.source': '来源',
    'th.firm': '机构',
    'th.rating': '评级',
    'th.target_price': '目标价',
    'th.action': '变动',
    'th.date': '日期',
    'th.current_price': '现价',
    'th.avg_target': '平均目标价',
    'th.upside': '上涨空间',

    // Operations
    'ops.industry_summary': '行业汇总（2024年10月）',
    'ops.latest_monthly': '最新月度数据',
    'ops.total_btc_mined': '合计 BTC 产量',
    'ops.total_hashrate': '合计算力',
    'ops.avg_hashrate': '平均算力',
    'ops.total_btc_held': '合计持有 BTC',
    'ops.eom_total': '各公司合计（月底）',
    'ops.lowest_power': '最低电力成本',
    'ops.riot_dr': 'RIOT（需量响应后）',
    'ops.monthly_disclosure': '月度运营披露',
    'ops.oct_2024': '2024年10月',
    'ops.sep_2024': '2024年9月',
    'ops.aug_2024': '2024年8月',
    'ops.btc_trend_title': '月度 BTC 产量趋势（主要公司）',

    // News
    'news.list': '新闻列表',
    'news.sentiment_dist': '情绪分布',
    'news.category_stats': '分类统计',

    // Categories
    'cat.earnings': '财报',
    'cat.expansion': '扩张',
    'cat.regulatory': '监管',
    'cat.market': '市场',
    'cat.business': '商业',
    'cat.operations': '运营',
    'cat.sustainability': '可持续',
    'cat.treasury': 'BTC储备',

    // Sentiment
    'sent.analyst_ratings': '机构评级',
    'sent.latest_reports': '最新研报',
    'sent.rating_summary': '评级汇总',
    'sent.target_vs_current': '各公司目标价 vs 当前价',
    'sent.social_sentiment': '社交媒体情绪',

    // Footer
    'footer.left': 'BTC Mining Intelligence © 2026 | MOCK DATA — 仅供演示',
    'footer.right': '数据更新: 2026-02-26 | 公司: 12 US-listed miners',

    // Dynamic JS strings
    'js.days_later': '天后',
    'js.today': '今日',
    'js.days_ago': '天前',
    'js.estimated': '预期',
    'js.reported': '已发布',
    'js.pending': '待发布',
    'js.expected_release': '预期发布',
    'js.latest_revenue': '最新营收',
    'js.btc_holding': 'BTC持仓',
    'js.hashrate': '算力',
    'js.monthly_mined': '月产',
    'js.latest_report': '最近财报',
    'js.next_expected': '下次预期',
    'js.bullish': '看多',
    'js.bearish': '看空',
    'js.neutral': '中性',
    'js.no_data': '暂无数据',
    'js.no_month_data': '暂无该月数据',
    'js.no_earnings_data': '暂无财报数据',
    'js.link': '链接',
    'js.fiscal_year': '财年',
    'js.mktcap': '市值',
    'js.btc_unit': '枚 BTC',
    'js.revenue_label': '营收 (M)',
    'js.ebitda_label': 'Adj.EBITDA (M)',
    'js.positive': '正面',
    'js.negative': '负面',
    'js.buy': '买入',
    'js.hold': '持有',
    'js.sell': '卖出',
    'js.initiate': '首次覆盖',
    'js.maintain': '维持',
    'js.upgrade': '上调评级',
    'js.downgrade': '下调评级',
    'js.upgrade_target': '上调目标价',
    'js.downgrade_target': '下调目标价',
    'js.reiterate': '重申',
    'js.trending': '热门',
    'js.bull_rate': '看多率',
    'js.social_heat': '社交热度',
    'js.quarter_history': '历史季报',
    'js.btc_held_label': 'BTC持仓',
    'js.total_debt': '总债务',

    // Analysis tab
    'nav.analysis': '财务分析',
    'analysis.title': '财务分析模型',
    'analysis.subtitle': '基于公开财务数据的量化分析（模拟数据，仅供演示）',
    'analysis.model_info': '模型介绍',
    'analysis.pros': '优势',
    'analysis.cons': '局限性',
    'analysis.results': '分析结果',
    'analysis.select_company': '选择公司查看模拟',
    'analysis.mc_chart_title': 'Monte Carlo 营收模拟（12个月）',
    'analysis.mc_note': '基于 GBM 模型的 1000 次随机路径模拟',
    'analysis.month': '月',
    'analysis.revenue_m': '营收 (M)',
  },

  en: {
    'nav.overview': 'Overview',
    'nav.financials': 'Financials',
    'nav.operations': 'Operations',
    'nav.news': 'News',
    'nav.sentiment': 'Sentiment',

    'stats.tracked': 'Tracked',
    'stats.tracked_sub': 'US Public Miners',
    'stats.mktcap': 'Total Mkt Cap',
    'stats.mktcap_sub': 'Combined',
    'stats.btc_held': 'BTC Holdings',
    'stats.btc_held_sub': 'All companies total',
    'stats.hashrate': 'Hashrate',
    'stats.hashrate_sub': 'Oct operational',
    'stats.monthly': 'Monthly Output',
    'stats.monthly_sub': 'BTC / Oct 2024',

    'overview.upcoming_earnings': 'Upcoming Earnings',
    'overview.estimated_date': 'Estimated',
    'overview.all_companies': 'All Companies',

    'sort.mktcap': 'Mkt Cap',
    'sort.revenue': 'Revenue',
    'sort.ebitda': 'EBITDA',
    'sort.hashrate': 'Hashrate',

    'filter.company': 'Company:',
    'filter.all_companies': 'All Companies',
    'filter.period': 'Period:',
    'filter.latest': 'Latest',
    'filter.fy': 'Full Year',
    'filter.filter': 'Filter:',
    'filter.all': 'All',

    'fin.revenue_chart_title': 'Quarterly Revenue Comparison (Latest)',
    'fin.summary': 'Financial Summary',
    'fin.unit_note': 'Unit: USD Million | YoY = Year-over-Year',
    'fin.earnings_calendar': 'Earnings Calendar',

    'th.company': 'Company',
    'th.period': 'Period',
    'th.revenue': 'Revenue (M)',
    'th.revenue_yoy': 'Rev YoY',
    'th.net_income': 'Net Income (M)',
    'th.net_income_yoy': 'NI YoY',
    'th.eps': 'EPS (Diluted)',
    'th.status': 'Status',
    'th.report_date': 'Report Date',
    'th.revenue_est': 'Rev Est.',
    'th.eps_est': 'EPS Est.',
    'th.notes': 'Notes',
    'th.btc_mined': 'BTC Mined',
    'th.btc_held': 'BTC Held',
    'th.btc_sold': 'BTC Sold',
    'th.hashrate': 'Hashrate (EH/s)',
    'th.installed_cap': 'Installed (EH/s)',
    'th.power_cap': 'Power (MW)',
    'th.efficiency': 'Efficiency (J/TH)',
    'th.power_cost': 'Power Cost (¢/kWh)',
    'th.source': 'Source',
    'th.firm': 'Firm',
    'th.rating': 'Rating',
    'th.target_price': 'Target',
    'th.action': 'Action',
    'th.date': 'Date',
    'th.current_price': 'Price',
    'th.avg_target': 'Avg Target',
    'th.upside': 'Upside',

    'ops.industry_summary': 'Industry Summary (Oct 2024)',
    'ops.latest_monthly': 'Latest Monthly',
    'ops.total_btc_mined': 'Total BTC Mined',
    'ops.total_hashrate': 'Total Hashrate',
    'ops.avg_hashrate': 'Average Hashrate',
    'ops.total_btc_held': 'Total BTC Held',
    'ops.eom_total': 'End-of-month total',
    'ops.lowest_power': 'Lowest Power Cost',
    'ops.riot_dr': 'RIOT (after DR)',
    'ops.monthly_disclosure': 'Monthly Operational Disclosure',
    'ops.oct_2024': 'Oct 2024',
    'ops.sep_2024': 'Sep 2024',
    'ops.aug_2024': 'Aug 2024',
    'ops.btc_trend_title': 'Monthly BTC Production Trend (Top Miners)',

    'news.list': 'News Feed',
    'news.sentiment_dist': 'Sentiment Distribution',
    'news.category_stats': 'Category Stats',

    'cat.earnings': 'Earnings',
    'cat.expansion': 'Expansion',
    'cat.regulatory': 'Regulatory',
    'cat.market': 'Market',
    'cat.business': 'Business',
    'cat.operations': 'Operations',
    'cat.sustainability': 'Green',
    'cat.treasury': 'Treasury',

    'sent.analyst_ratings': 'Analyst Ratings',
    'sent.latest_reports': 'Latest reports',
    'sent.rating_summary': 'Rating Summary',
    'sent.target_vs_current': 'Target Price vs Current Price',
    'sent.social_sentiment': 'Social Media Sentiment',

    'footer.left': 'BTC Mining Intelligence © 2026 | MOCK DATA — Demo Only',
    'footer.right': 'Updated: 2026-02-26 | 12 US-listed miners',

    'js.days_later': 'd away',
    'js.today': 'Today',
    'js.days_ago': 'd ago',
    'js.estimated': 'Est.',
    'js.reported': 'Reported',
    'js.pending': 'Pending',
    'js.expected_release': 'Expected',
    'js.latest_revenue': 'Latest Rev',
    'js.btc_holding': 'BTC Held',
    'js.hashrate': 'Hashrate',
    'js.monthly_mined': 'Mined',
    'js.latest_report': 'Last Report',
    'js.next_expected': 'Next Expected',
    'js.bullish': 'Bullish',
    'js.bearish': 'Bearish',
    'js.neutral': 'Neutral',
    'js.no_data': 'No data',
    'js.no_month_data': 'No data for this month',
    'js.no_earnings_data': 'No earnings data',
    'js.link': 'Link',
    'js.fiscal_year': 'FY',
    'js.mktcap': 'Mkt Cap',
    'js.btc_unit': 'BTC',
    'js.revenue_label': 'Revenue (M)',
    'js.ebitda_label': 'Adj.EBITDA (M)',
    'js.positive': 'Positive',
    'js.negative': 'Negative',
    'js.buy': 'Buy',
    'js.hold': 'Hold',
    'js.sell': 'Sell',
    'js.initiate': 'Initiate',
    'js.maintain': 'Maintain',
    'js.upgrade': 'Upgrade',
    'js.downgrade': 'Downgrade',
    'js.upgrade_target': 'PT Raise',
    'js.downgrade_target': 'PT Cut',
    'js.reiterate': 'Reiterate',
    'js.trending': 'Hot',
    'js.bull_rate': 'Bull %',
    'js.social_heat': 'Social',
    'js.quarter_history': 'Quarter History',
    'js.btc_held_label': 'BTC Held',
    'js.total_debt': 'Total Debt',

    // Analysis tab
    'nav.analysis': 'Analysis',
    'analysis.title': 'Financial Analysis Models',
    'analysis.subtitle': 'Quantitative analysis based on public financial data (simulated, demo only)',
    'analysis.model_info': 'Model Info',
    'analysis.pros': 'Strengths',
    'analysis.cons': 'Limitations',
    'analysis.results': 'Results',
    'analysis.select_company': 'Select a company to view simulation',
    'analysis.mc_chart_title': 'Monte Carlo Revenue Simulation (12 Months)',
    'analysis.mc_note': '1000 random path simulations based on GBM model',
    'analysis.month': 'Mo',
    'analysis.revenue_m': 'Revenue (M)',
  }
};

// ── Current language ──
let currentLang = localStorage.getItem('btcmine-lang') || 'zh';

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || (I18N['zh'][key]) || key;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    if (text) el.textContent = text;
  });
}

function toggleLang() {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('btcmine-lang', currentLang);
  const btn = document.getElementById('langToggle');
  btn.textContent = currentLang === 'zh' ? 'EN' : '中';
  applyI18n();
  // Re-render dynamic content
  renderOverview();
  const activePage = document.querySelector('.nav-tab.active');
  if (activePage) {
    const page = activePage.dataset.page;
    if (page === 'financials') renderFinancials();
    if (page === 'operations') renderOperations();
    if (page === 'news') renderNews();
    if (page === 'sentiment') renderSentiment();
    if (page === 'analysis') renderAnalysis();
  }
}

// ── Theme ──
let currentTheme = localStorage.getItem('btcmine-theme') || 'light';

function applyTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('btcmine-theme', theme);
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  const btn = document.getElementById('themeToggle');
  btn.textContent = theme === 'dark' ? '☀' : '☾';
  btn.title = theme === 'dark' ? 'Switch to Light' : 'Switch to Dark';
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

// ── Init on load ──
document.addEventListener('DOMContentLoaded', () => {
  // Theme
  applyTheme(currentTheme);

  // Language
  const langBtn = document.getElementById('langToggle');
  langBtn.textContent = currentLang === 'zh' ? 'EN' : '中';
  applyI18n();

  // Event listeners
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('langToggle').addEventListener('click', toggleLang);
});
