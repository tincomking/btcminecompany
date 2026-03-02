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
    'stats.hashrate_sub': '运营算力',
    'stats.monthly': '合并月产量',
    'stats.monthly_sub': 'BTC 月产量',
    'stats.companies_disclosed': '家公司已披露',

    // Header
    'header.difficulty': 'DIFF',

    // Overview
    'overview.intro_title': '关于本站',
    'overview.intro_text': 'BTC Mining Intelligence 是一个专注于美股上市比特币矿业公司的综合数据平台。我们追踪 23 家上市矿企，汇集财务数据、运营指标、新闻动态、市场情绪、量化分析模型和 BTC 价格预测，为投资者、分析师和行业研究人员提供一站式挖矿行业信息中心。',
    'overview.desc_financials': '季度财报对比、营收与 EBITDA 柱状图、EPS、同比增长率，支持按公司和报告期筛选。涵盖 23 家上市矿企的完整财务画像。',
    'overview.desc_operations': '月度产量报告：BTC 挖矿数量、持仓变化、算力增长、装机容量、电力成本、机队效率，含 BTC 产量趋势图。',
    'overview.desc_news': '实时汇总矿企公告、财报发布、设施扩建、监管政策、BTC 储备策略等新闻，配合情绪分析和分类统计图表。',
    'overview.desc_sentiment': '集成华尔街分析师评级（买入/持有/卖出）、目标价对比，以及 StockTwits 等社交平台的看涨看跌比例和情绪评分。',
    'overview.desc_analysis': '六大量化模型：Monte Carlo 营收模拟、KMV 违约概率、Altman Z-score 破产预警、Beneish M-score 盈余操纵检测、Piotroski F-score 财务健康度、Jones 模型应计分析。',
    'overview.desc_predictions': '汇集 8 个加密平台和 11 家华尔街/研究机构的 BTC 价格预测（2025-2030），附共识区间图表和五种高级数学拟合分析。',
    'overview.upcoming_earnings': '即将发布财报',
    'overview.estimated_date': '预估日期',
    'overview.all_companies': '所有公司',

    // Sort
    'sort.relevance': '相关排序',
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
    'filter.search_ticker': '输入代码搜索...',

    // Financials
    'fin.revenue_chart_title': '各公司季度营收对比（最新期）',
    'fin.detail': '财务数据明细',
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
    'ops.industry_summary': '行业汇总',
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
    'footer.left': 'BTC Mining Intelligence © 2026',
    'footer.right': '数据来源: SEC EDGAR, Yahoo Finance, RSS',

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

    // Predictions tab (institutional)
    'nav.predictions': '币价机构预测',
    'nav.market_predict': '币价市场预测',
    'pred.title': 'BTC 机构预测',
    'pred.subtitle': '综合多平台与机构的 BTC 价格预测（2025-2030）',
    'overview.desc_market_predict': '基于 12 个 ML 模型的实时 BTC 价格预测（4h/24h/7d），集成 Polymarket 预测市场信号和恐惧贪婪指数。',

    // Market predictions tab
    'mp.title': 'BTC 市场预测',
    'mp.subtitle': '基于 ML 模型 + Polymarket + 恐惧贪婪指数的实时预测',
    'mp.current_price': '当前价格',
    'mp.h4': '4 小时预测',
    'mp.h24': '24 小时预测',
    'mp.h168': '7 天预测',
    'mp.all_models': '全模型预测',
    'mp.polymarket': 'Polymarket 预测市场',
    'mp.fear_greed': '恐惧贪婪指数',
    'mp.history': '历史价格',
    'mp.model': '模型',
    'mp.direction': '方向',
    'mp.confidence': '信心',
    'mp.return': '回报',
    'mp.target': '目标价',
    'mp.combined': '综合预测',
    'mp.model_only': '模型预测',
    'mp.poly_only': 'Polymarket',
    'pred.platform_tab': '平台预测',
    'pred.institution_tab': '机构预测',
    'pred.consensus_tab': '共识汇总',
    'pred.fitting_tab': '高级拟合',
    'pred.platform_desc': '来自 DigitalCoinPrice、CoinCodex、PricePrediction.net 等加密货币价格预测平台的数据。这些平台主要使用算法模型或机器学习自动生成预测，每个年份给出最低/最高/平均价格，数据更新频繁，偏量化分析。',
    'pred.institution_desc': '来自 ARK Invest、Standard Chartered、JPMorgan、Goldman Sachs 等全球顶级投资机构和银行的预测。由具名分析师或研究团队基于宏观经济、链上数据、供需模型等基本面研究给出目标价，通常提供单一目标价或熊/基/牛三种情景分析。',
    'pred.consensus_desc': '将上述所有平台与机构的预测数据汇总，计算每年的综合预测区间。蓝色柱状图为全部来源的最低/最高范围，绿色折线为机构共识区间。下方列出影响 BTC 价格的关键利好因素和风险因素。',
    'pred.source': '来源',
    'pred.methodology': '方法论',
    'pred.year': '年份',
    'pred.low': '最低',
    'pred.high': '最高',
    'pred.avg': '平均',
    'pred.target': '目标价',
    'pred.notes': '备注',
    'pred.analyst': '分析师',
    'pred.type': '类型',
    'pred.catalysts': '利好因素',
    'pred.risks': '风险因素',
    'pred.consensus_range': '共识区间',
    'pred.institutional_consensus': '机构共识',
    'pred.fitting_title': '价格趋势拟合分析',
    'pred.linear': '线性回归',
    'pred.exponential': '指数拟合',
    'pred.polynomial': '多项式拟合',
    'pred.power_law': '幂律拟合',
    'pred.log': '对数拟合',
    'pred.disclaimer': '以下预测均来自第三方，仅供参考，不构成任何投资建议。',
    'pred.r_squared': '拟合度 R²',
    'pred.prediction': '预测值',
    'pred.all_data_points': '所有数据点',
    'pred.fitted_curve': '拟合曲线',
    'pred.no_target': '未公布',
    'pred.bear': '熊市',
    'pred.base': '基本',
    'pred.bull': '牛市',
    'pred.inst_consensus_title': 'BTC 机构预测共识',
    'pred.plat_consensus_title': 'BTC 平台预测共识',
    'pred.inst_consensus_subtitle': '2025-2030 价格预测汇总',
    'pred.inst_consensus_note': '部分来源使用算法/ML 模型，部分为分析师驱动',
    'pred.data_date': '数据采集',
    'pred.current_price': '当前价格',
    'pred.range_all': '全部预测区间',
    'pred.plat_consensus': '平台共识（中位区间）',
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
    'stats.hashrate_sub': 'Operational',
    'stats.monthly': 'Monthly Output',
    'stats.monthly_sub': 'BTC monthly',
    'stats.companies_disclosed': ' companies disclosed',

    // Header
    'header.difficulty': 'DIFF',

    'overview.upcoming_earnings': 'Upcoming Earnings',
    'overview.intro_title': 'About This Site',
    'overview.intro_text': 'BTC Mining Intelligence is a comprehensive data platform focused on US-listed Bitcoin mining companies. We track 23 public miners, aggregating financial data, operational metrics, news, market sentiment, quantitative analysis models, and BTC price predictions — a one-stop intelligence hub for investors, analysts, and industry researchers.',
    'overview.desc_financials': 'Quarterly earnings comparison, revenue & EBITDA charts, EPS, YoY growth rates with company and period filters. Full financial profiles for all 23 listed miners.',
    'overview.desc_operations': 'Monthly production reports: BTC mined, holdings changes, hashrate growth, installed capacity, power costs, fleet efficiency, plus BTC production trend charts.',
    'overview.desc_news': 'Real-time aggregation of mining company announcements, earnings releases, facility expansions, regulatory updates, BTC treasury strategies, with sentiment analysis and category charts.',
    'overview.desc_sentiment': 'Wall Street analyst ratings (Buy/Hold/Sell), target price comparisons, plus social media bullish/bearish ratios and sentiment scores from StockTwits and other platforms.',
    'overview.desc_analysis': 'Six quantitative models: Monte Carlo revenue simulation, KMV default probability, Altman Z-score bankruptcy warning, Beneish M-score earnings manipulation detection, Piotroski F-score financial health, Jones model accrual analysis.',
    'overview.desc_predictions': 'BTC price forecasts from 8 crypto platforms and 11 Wall Street/research institutions (2025-2030), with consensus range charts and five advanced mathematical fitting analyses.',
    'overview.estimated_date': 'Estimated',
    'overview.all_companies': 'All Companies',

    'sort.relevance': 'Relevance',
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
    'filter.search_ticker': 'Search ticker...',

    'fin.revenue_chart_title': 'Quarterly Revenue Comparison (Latest)',
    'fin.detail': 'Financial Details',
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

    'ops.industry_summary': 'Industry Summary',
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

    'footer.left': 'BTC Mining Intelligence © 2026',
    'footer.right': 'Data: SEC EDGAR, Yahoo Finance, RSS',

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

    // Predictions tab (institutional)
    'nav.predictions': 'Institutional',
    'nav.market_predict': 'Market Predict',
    'pred.title': 'BTC Institutional Forecasts',
    'pred.subtitle': 'Aggregated BTC forecasts from platforms & institutions (2025-2030)',
    'overview.desc_market_predict': 'Real-time BTC price predictions from 12 ML models (4h/24h/7d), integrated with Polymarket signals and Fear & Greed Index.',

    // Market predictions tab
    'mp.title': 'BTC Market Predictions',
    'mp.subtitle': 'Real-time ML models + Polymarket + Fear & Greed Index',
    'mp.current_price': 'Current Price',
    'mp.h4': '4-Hour Forecast',
    'mp.h24': '24-Hour Forecast',
    'mp.h168': '7-Day Forecast',
    'mp.all_models': 'All Models',
    'mp.polymarket': 'Polymarket Predictions',
    'mp.fear_greed': 'Fear & Greed Index',
    'mp.history': 'Price History',
    'mp.model': 'Model',
    'mp.direction': 'Direction',
    'mp.confidence': 'Confidence',
    'mp.return': 'Return',
    'mp.target': 'Target',
    'mp.combined': 'Combined',
    'mp.model_only': 'Model Only',
    'mp.poly_only': 'Polymarket',
    'pred.platform_tab': 'Platforms',
    'pred.institution_tab': 'Institutions',
    'pred.consensus_tab': 'Consensus',
    'pred.fitting_tab': 'Fitting',
    'pred.platform_desc': 'Data from crypto price prediction platforms such as DigitalCoinPrice, CoinCodex, and PricePrediction.net. These platforms primarily use algorithmic or machine-learning models to generate forecasts, providing low/high/average prices per year with frequent updates.',
    'pred.institution_desc': 'Forecasts from top global investment institutions and banks including ARK Invest, Standard Chartered, JPMorgan, and Goldman Sachs. Produced by named analysts or research teams based on macro fundamentals, on-chain data, and supply-demand models — typically a single target price or bear/base/bull scenario analysis.',
    'pred.consensus_desc': 'Aggregated view combining all platform and institutional predictions. Blue bars show the full min/max range across all sources; green lines represent the institutional consensus range. Key bullish catalysts and risk factors are listed below.',
    'pred.source': 'Source',
    'pred.methodology': 'Methodology',
    'pred.year': 'Year',
    'pred.low': 'Low',
    'pred.high': 'High',
    'pred.avg': 'Average',
    'pred.target': 'Target',
    'pred.notes': 'Notes',
    'pred.analyst': 'Analyst',
    'pred.type': 'Type',
    'pred.catalysts': 'Key Catalysts',
    'pred.risks': 'Key Risks',
    'pred.consensus_range': 'Consensus Range',
    'pred.institutional_consensus': 'Institutional Consensus',
    'pred.fitting_title': 'Price Trend Fitting Analysis',
    'pred.linear': 'Linear Regression',
    'pred.exponential': 'Exponential Fit',
    'pred.polynomial': 'Polynomial Fit',
    'pred.power_law': 'Power Law Fit',
    'pred.log': 'Logarithmic Fit',
    'pred.disclaimer': 'All predictions are from third parties. For reference only, not financial advice.',
    'pred.r_squared': 'R² Goodness',
    'pred.prediction': 'Prediction',
    'pred.all_data_points': 'All Data Points',
    'pred.fitted_curve': 'Fitted Curve',
    'pred.no_target': 'N/A',
    'pred.bear': 'Bear',
    'pred.base': 'Base',
    'pred.bull': 'Bull',
    'pred.inst_consensus_title': 'BTC Institutional Consensus',
    'pred.plat_consensus_title': 'BTC Platform Consensus',
    'pred.inst_consensus_subtitle': '2025-2030 Price Forecast Summary',
    'pred.inst_consensus_note': 'Some sources use algorithmic/ML models; others are analyst-driven',
    'pred.data_date': 'Data collected',
    'pred.current_price': 'Current Price',
    'pred.range_all': 'Full Prediction Range',
    'pred.plat_consensus': 'Platform Consensus (IQR)',
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
    if (page === 'predictions') renderPredictions();
    if (page === 'market-predict' && typeof renderMarketPredict === 'function') renderMarketPredict();
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

// ── Font Size (zoom) ──
const ZOOM_LEVELS = [0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2];
let zoomIdx = parseInt(localStorage.getItem('btcmine-zoom-idx'), 10);
if (isNaN(zoomIdx) || zoomIdx < 0 || zoomIdx >= ZOOM_LEVELS.length) zoomIdx = 4; // default 1.0

function applyZoom() {
  document.body.style.zoom = ZOOM_LEVELS[zoomIdx];
  localStorage.setItem('btcmine-zoom-idx', zoomIdx);
}

function fontUp() {
  if (zoomIdx < ZOOM_LEVELS.length - 1) { zoomIdx++; applyZoom(); }
}

function fontDown() {
  if (zoomIdx > 0) { zoomIdx--; applyZoom(); }
}

// ── Init on load ──
document.addEventListener('DOMContentLoaded', () => {
  // Theme
  applyTheme(currentTheme);

  // Zoom
  applyZoom();

  // Language
  const langBtn = document.getElementById('langToggle');
  langBtn.textContent = currentLang === 'zh' ? 'EN' : '中';
  applyI18n();

  // Event listeners
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('langToggle').addEventListener('click', toggleLang);
  document.getElementById('fontUp').addEventListener('click', fontUp);
  document.getElementById('fontDown').addEventListener('click', fontDown);
});
