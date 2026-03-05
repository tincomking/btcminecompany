# BTC Mining Intelligence 产品需求文档 (PRD)

> **网站**: https://btcmine.info
> **仓库**: github.com/tincomking/btcminecompany
> **本地路径**: `/Users/leogrossman/btcminecompany/`
> **最后更新**: 2026-03-06

---

## 1. Executive Summary / 产品概述

BTC Mining Intelligence 是一个专注于美股上市比特币矿业公司的综合金融情报平台。平台追踪 23 家上市矿企，提供七大核心模块：财务数据、运营披露、新闻动态、市场情绪、六大量化分析模型、BTC 机构价格预测、以及基于 11 个 ML 模型的实时 BTC 价格预测系统。

技术上采用纯静态架构（HTML + CSS + JavaScript + Chart.js），通过 GitHub Pages 托管，数据由后端 DataCentre API（`api.btcmine.info`）实时提供。OpenClaw Agent 自动化采集系统负责日常数据更新。

**核心版本**: `v2.0305J`（定义在 `js/app.js` 第 8 行）

---

## 2. Mission & Core Principles / 使命与核心原则

### 使命
为 BTC 矿业投资者、分析师和研究人员提供一站式、数据驱动的矿企情报中心。

### 核心原则

1. **数据优先** — 一切以真实的 SEC 备案、财报数据、市场数据为基础，不造数据、不臆测
2. **只采集缺失的** — 数据采集遵循增量原则，已有数据不重复采集
3. **前端零依赖** — 纯静态站，无 Node.js 构建步骤，无框架，直接推送即部署
4. **双语支持** — 中英文完整覆盖，所有 UI 文本通过 `data-i18n` 属性管理
5. **安全合规** — 密钥不硬编码，内部服务不暴露，API 走 Cloudflare 代理
6. **自动化运营** — OpenClaw Cron 负责日常数据采集，GitHub Actions 负责自动部署

---

## 3. Target Users / 目标用户

| 用户类型 | 使用场景 | 关注模块 |
|---------|---------|---------|
| 矿业投资者 | 选股、估值对比、持仓管理 | 概览、财务、同业对比表、分析模型 |
| BTC 交易者 | 短中线交易决策 | 币价市场预测、衍生品仪表盘、预测市场 |
| 行业研究员 | 矿业报告撰写、行业趋势分析 | 运营披露、新闻、市场情绪 |
| 量化分析师 | 回测验证、信号共识分析 | 财务分析模型、P0-P3 量化面板 |
| 长期投资者 | BTC 中长期价格参考 | 机构预测、共识区间、高级拟合 |

---

## 4. Current Scope / 当前范围

### In Scope (已实现)

- 23 家美股上市 BTC 矿企的完整追踪
- 8 个主要导航页面（概览/财务/运营/新闻/情绪/分析/机构预测/市场预测）
- 6 大财务分析模型（Altman / Beneish / Jones / KMV / Monte Carlo / Piotroski）
- 11 个 ML 模型的实时 BTC 价格预测（4H/24H/7D）
- P0-P3 量化面板（衍生品/共识热力图/回测/链上/期权/订单簿/预测市场/鲸鱼流向）
- 中英文双语切换
- 暗色/亮色主题切换
- 字体缩放（0.8x - 1.2x）
- GitHub Actions 自动部署 + 数据 PR 自动合并
- 同业对比表（EV/EH、EV/Revenue、EV/EBITDA 等关键估值指标）
- 财报日历（月历视图 + 即将发布提醒）
- 经济日历（美国重要经济数据排期）
- BTC 实时价格 + 难度变化 Ticker

### Out of Scope (不在当前范围)

- 用户注册/登录系统
- 付费内容/订阅功能
- 移动端原生 App
- 数据库（前端无 DB，数据全部来自 API 或静态 JSON）
- 后端服务（后端在 datacenter 项目，不在本仓库）
- 自动交易/下单功能

---

## 5. Core Features / 核心功能

### 5.1 概览页面 (`page-overview`)

**功能描述**: 平台首页，提供全行业鸟瞰视图。

**组件**:
- **站点介绍卡片**: 7 个模块入口卡片，可点击导航到对应页面
- **行业汇总统计栏**: 追踪公司数 / 总市值 / 合并 BTC 持仓 / 合并算力 / 月产量 / 行业平均 EV/EH
- **即将发布财报**: 近期财报日期提醒（距今天数 + 公司名）
- **公司卡片网格**: 所有公司卡片，支持 5 种排序（相关度/市值/营收/EBITDA/算力）
- **同业对比表**: 横向对比所有公司的关键估值与运营指标

**排序选项**: 相关排序 / 市值排序 / 营收排序 / EBITDA排序 / 算力排序

### 5.2 财务数据页面 (`page-financials`)

**功能描述**: 季度财报数据对比与可视化。

**组件**:
- **营收对比柱状图**: 各公司最新期营收 + EBITDA 并列柱状图（Chart.js）
- **筛选栏**: 公司搜索（自动补全）+ 报告期选择
- **财务数据表格**: 营收/营收YoY/净利润/净利润YoY/Adj.EBITDA/EBITDA YoY/EPS/财报状态/日期
- **财报日历**: 月历视图，标注各公司财报发布日期
- **详情弹窗**: 点击展开单公司历史季报、完整财务指标

**数据字段**: revenue_usd_m, net_income_usd_m, adjusted_ebitda_usd_m, eps_diluted, btc_held, total_debt_usd_m, cash_and_equivalents_usd_m

### 5.3 运营披露页面 (`page-operations`)

**功能描述**: 月度 BTC 产量与运营数据。

**组件**:
- **行业汇总高亮卡**: 合计 BTC 产量 / 合计算力 / 合计持有 BTC / 最低电力成本
- **月度运营表格**: BTC产量/持仓/销售/算力/装机算力/电力容量/机队效率/电价
- **BTC 产量趋势图**: 主要公司的月度 BTC 产量折线图（Chart.js）
- **月份筛选**: 下拉选择查看不同月份数据

### 5.4 新闻动态页面 (`page-news`)

**功能描述**: 矿企相关新闻汇总与分析。

**组件**:
- **分类筛选栏**: 全部/财报/扩张/监管/市场/宏观/商业 + 公司筛选
- **新闻列表**: 时间排序，含 AI 评分/摘要/中文标题/情绪标签
- **经济日历**: 美国重要经济数据排期（CPI/NFP/Fed 利率决议等）
- **情绪分布**: 正面/中性/负面比例环形图
- **分类统计**: 各类别新闻数量柱状图

**新闻 AI 评分字段**: aiRating.grade / aiRating.score / aiRating.signal / aiRating.summary

### 5.5 市场情绪页面 (`page-sentiment`)

**功能描述**: 华尔街分析师评级与社交媒体情绪。

**组件**:
- **机构评级表格**: 公司/机构/评级/目标价/变动/日期/备注（支持筛选）
- **评级汇总**: Buy/Hold/Sell 比例饼图
- **目标价 vs 现价**: 各公司平均目标价与当前价对比 + 上涨空间
- **社交媒体情绪**: StockTwits 看涨/看跌/热度指标面板

### 5.6 财务分析页面 (`page-analysis`)

**功能描述**: 六大量化分析模型，基于公开财务数据。

**六大模型**:

| 模型 | 文件 | 用途 | 关键阈值 |
|------|------|------|---------|
| Altman Z-Score | `Analysis/altman.js` | 破产预测 | >2.99 安全 / 1.81-2.99 灰色区 / <1.81 危险 |
| Beneish M-Score | `Analysis/beneish.js` | 盈余操纵检测 | >-1.78 可能操纵 |
| Modified Jones | `Analysis/jones.js` | 应计利润分析 | \|DA\|>0.05 高 / >0.02 中等 |
| KMV 信用风险 | `Analysis/kmv.js` | 违约概率估算 | DD>3 极低 / 1.5-3 中等 / <1.5 高风险 |
| Monte Carlo | `Analysis/montecarlo.js` | 营收模拟预测 | GBM 1000 次路径，P10-P90 区间 |
| Piotroski F-Score | `Analysis/piotroski.js` | 财务健康度 | >=8 强势 / 5-7 中等 / <5 弱势 |

**交互**: 模型选择标签 + 模型信息面板（优势/局限性）+ 结果表格 + Monte Carlo 扇形图

### 5.7 BTC 机构预测页面 (`page-predictions`)

**功能描述**: 汇集多平台与机构的 BTC 价格预测（2025-2030）。

**子标签**:
1. **平台预测**: 8 个加密预测平台（DigitalCoinPrice, CoinCodex, PricePrediction.net 等）
2. **机构预测**: 11 家华尔街/研究机构（ARK, JPMorgan, Goldman Sachs, Bernstein, Standard Chartered 等）
3. **共识汇总**: 所有来源的年度共识区间图 + 利好因素/风险因素
4. **高级拟合**: 5 种数学模型（线性/指数/多项式/幂律/对数）拟合分析

### 5.8 BTC 市场预测页面 (`page-market-predict`)

**功能描述**: 基于 11 个 ML 模型的实时 BTC 价格预测系统。这是整个平台中最复杂的页面。

**Row 1 — 主图 + 预测卡片**:
- **Ticker Strip**: 实时价格/方向/置信度/恐惧贪婪指数/更新时间
- **预测图表**: 历史价格（蓝色）+ 历史预测（金色虚线）+ 押注共识（绿色虚线）+ 当前预测（红色）
- **3 个预测卡片**: 4H / 24H / 7D 预测方向/回报率/目标价/置信度
- **信号共识**: 全模型 x 全时间框架共识热力图

**Row 2 — 衍生品 + 订单簿 (P0)**:
- **资金费率 (FR)**: 数值 + 区间判定 + 柱状进度条
- **多空比 (L/S)**: 比值 + 多/空百分比横条
- **买卖比 (Taker)**: 主动买/卖量比 + 双色横条
- **持仓量 (OI)**: 总量 + 趋势方向
- **订单簿**: 买卖挂单深度 + 价差 + 失衡度

**Row 3 — 衍生品图表 + 微型 Widget (P1/P2/P3)**:
- **FR 历史图** (7 天)
- **OI vs Price 图** (7 天)
- **微型 Widget**: 隐含波动率(IV) / PCR / MaxPain / 行权集中 / 算力 / Mempool / 手续费 / 鲸鱼流向

**Row 4 — 预测市场 + 模型详情**:
- **预测市场表**: Polymarket + 多平台 BTC 合约（排序: Vol/Exp/Near）
- **全模型折叠面板**: 11 个模型的详细预测（方向/置信度/回报率/目标价）

**11 个预测模型**:
- **ML 模型 (5)**: XGBoost, LightGBM, Random Forest, SVR, Ridge
- **神经网络 (2)**: MLP, LSTM+XGB (混合)
- **时间序列 (1)**: ARIMA
- **技术分析策略 (3)**: EMA交叉, RSI, MACD (+ 布林带辅助)

**共识融合算法**:
```
最终预测价格 = 当前价 x (1 + 模型预测收益率 + Polymarket调整)
Polymarket调整 = clip((看涨分数 - 50) / 500 x 时间因子, -5%, +5%)
```

**方法论面板** (弹窗): 7 个标签页（系统架构/数据采集/特征工程/11个模型/共识融合/回测验证/指标说明）

---

## 6. Architecture & Directory Structure / 架构与目录结构

```
/Users/leogrossman/btcminecompany/
├── .claude/
│   └── PRD.md                    # 本文档
├── .github/
│   └── workflows/
│       ├── auto-merge-data.yml   # 数据 PR 自动验证 + 自动合并
│       └── deploy.yml            # push main → GitHub Pages 部署
├── Analysis/                     # 6 大财务分析模型（IIFE 模块）
│   ├── altman.js                 # Altman Z-Score 破产预测
│   ├── beneish.js                # Beneish M-Score 盈余操纵检测
│   ├── jones.js                  # Modified Jones 应计利润分析
│   ├── kmv.js                    # KMV 信用风险（Merton 模型）
│   ├── montecarlo.js             # Monte Carlo GBM 营收模拟
│   └── piotroski.js              # Piotroski F-Score 财务健康度
├── css/
│   └── style.css                 # 全站样式（3123 行），含暗色/亮色主题
├── data/
│   ├── economic-calendar.json    # 经济日历数据（备用，优先取 API）
│   └── raw_reports/              # 24 家公司的 SEC 原始报告（子目录）
│       ├── MARA/
│       ├── RIOT/
│       ├── CLSK/
│       └── ... (24 公司)
├── docs/
│   ├── DATA_COLLECTION_GUIDE.md  # 数据采集指南
│   └── financial_data_collection_guide.md  # 详细财务数据采集手册
├── js/
│   ├── app.js                    # 主应用逻辑（4302 行），所有 render 函数
│   ├── data.js                   # 数据加载层，API 调用（209 行）
│   └── i18n.js                   # 中英双语 + 主题/缩放管理（902 行）
├── scripts/                      # Python 数据处理脚本（历史遗留，现在由 datacenter 接管）
│   ├── update_all_data.py        # 合并 SEC + Yahoo 数据
│   ├── fetch_sec_data.py         # SEC EDGAR 数据抓取
│   ├── fetch_prices.py           # Yahoo Finance 价格抓取
│   ├── fetch_missing_financials.py
│   ├── fix_data_quality.py
│   ├── add_2025_data.py
│   ├── add_debt_data.py
│   ├── add_fufu_ops.py
│   ├── add_missing_data.py
│   └── add_recent_ops.py
├── index.html                    # 单页应用入口（1363 行）
├── CNAME                         # GitHub Pages 自定义域名: btcmine.info
└── README.md                     # 项目说明 + Agent 数据采集指南
```

### 前端架构要点

- **单页应用 (SPA)**: 所有页面在一个 `index.html` 内，通过 `class="page active"` 控制显隐
- **导航路由**: 8 个 `nav-tab` 按钮，通过 `data-page` 属性绑定对应的 `page-*` div
- **模块加载顺序**: `i18n.js` → `data.js` → `Analysis/*.js` (x6) → `app.js`
- **全局变量**: `COMPANIES`, `FINANCIALS`, `OPERATIONAL`, `NEWS`, `SENTIMENT`, `ANALYSIS_DATA`, `BTC_PREDICTIONS`, `MARKET_PREDICT`
- **分析模型注册**: `window.ANALYSIS_MODELS` 对象，每个模型通过 IIFE 自注册
- **Chart.js 版本**: 4.4.0 + date-fns adapter + annotation plugin + zoom plugin
- **无构建步骤**: 无 npm/webpack/vite，直接 CDN 引入依赖

### CDN 依赖

| 库 | 版本 | 用途 |
|---|---|---|
| Chart.js | 4.4.0 | 图表渲染 |
| chartjs-adapter-date-fns | 3.x | 时间轴适配器 |
| chartjs-plugin-annotation | 3.x | 图表标注（阈值线等） |
| chartjs-plugin-zoom | 2.0.1 | 图表缩放/平移 |
| Hammer.js | 2.0.8 | 触摸手势（zoom 插件依赖） |
| Google Fonts | — | Inter + JetBrains Mono 字体 |

---

## 7. Data Sources & Data Flow / 数据源与数据流

### 数据流架构

```
SEC EDGAR ─┐
Yahoo Finance ─┤
CoinGecko ────┤──→ DataCentre (100.111.111.111:8000) ──→ api.btcmine.info ──→ 前端
Binance ──────┤      └─ 25 采集器 + SQLite WAL          └─ Cloudflare Tunnel
Deribit ──────┤      └─ FastAPI + APScheduler
Polymarket ───┤
FRED ─────────┤
mempool.space ─┘
```

### 前端数据加载流程

1. 页面加载 → `loadAllData()` 并行请求 7 个核心 API
2. 用户进入"币价市场预测"页面 → 懒加载 `loadMarketPredictions()`（12+ 个额外 API）
3. 经济日历：优先 API，失败回退到 `data/economic-calendar.json` 静态文件
4. BTC 实时价格：Header Ticker 从 API 获取

### 数据分类

| 分类 | 代号 | 数据 | 更新频率 | 来源 |
|------|------|------|---------|------|
| A | 公司档案 | ticker/名称/市值/股价 | IPO/退市/重大变更时 | SEC EDGAR, Yahoo |
| B | 季度财务 | 营收/净利/EBITDA/EPS/BTC持仓/负债 | 每季度财报后 | SEC 10-Q/10-K, IR 页面 |
| C | 月度运营 | BTC产量/持仓/算力/电力成本/效率 | 每月次月初 | IR 月报, 8-K |
| D | 新闻动态 | 公告/财报/扩建/监管 | 实时 | PR Wire, CoinDesk, SEC |
| E | 市场情绪 | 分析师评级/目标价/社交情绪 | 研报发布时 | TipRanks, StockTwits |
| F | BTC 预测 | 平台+机构价格预测 (2025-2030) | 季度更新 | 预测平台, 机构研报 |
| G | 财务分析 | 资产负债表/现金流 (6 模型输入) | 随 B 类更新 | SEC 10-K |

---

## 8. API Dependencies / API 依赖

### 核心数据 API（`loadAllData()` 并行调用）

| 端点 | 全局变量 | 说明 |
|------|---------|------|
| `GET /api/btcmine/companies` | `COMPANIES` | 公司列表（ticker/名称/交易所/市值/股价） |
| `GET /api/btcmine/financials` | `FINANCIALS` | 季度财务数据 |
| `GET /api/btcmine/operational` | `OPERATIONAL` | 月度运营数据 |
| `GET /api/btcmine/news` | `NEWS` | 新闻列表（含 AI 评分） |
| `GET /api/btcmine/sentiment` | `SENTIMENT` | 分析师评级 + 社交情绪 |
| `GET /api/btcmine/analysis` | `ANALYSIS_DATA` | 财务分析模型输入数据 |
| `GET /api/btcmine/predictions` | `BTC_PREDICTIONS` | BTC 机构预测数据 |
| `GET /api/btcmine/economic-calendar` | `ECONOMIC_CALENDAR` | 经济日历（备用: `data/economic-calendar.json`） |

### 市场预测 API（`loadMarketPredictions()` 懒加载）

| 端点 | 全局变量字段 | 说明 |
|------|------------|------|
| `GET /api/predict/latest` | `MARKET_PREDICT.latest` | 最新预测结果 |
| `GET /api/predict/forecast` | `MARKET_PREDICT.forecast` | 预测明细（含历史价格） |
| `GET /api/predict/models` | `MARKET_PREDICT.models` | 11 个模型各自预测 |
| `GET /api/predict/polymarket` | `MARKET_PREDICT.polymarket` | Polymarket 预测市场数据 |
| `GET /api/predict/fear-greed` | `MARKET_PREDICT.fearGreed` | 恐惧贪婪指数 |
| `GET /api/predict/derivatives` | `MARKET_PREDICT.derivatives` | 衍生品快照（FR/LS/Taker/OI） |
| `GET /api/predict/backtest` | `MARKET_PREDICT.backtest` | 回测结果 |
| `GET /api/predict/onchain` | `MARKET_PREDICT.onchain` | 链上数据（算力/mempool/费率） |
| `GET /api/predict/options` | `MARKET_PREDICT.options` | 期权数据（IV/PCR/MaxPain） |
| `GET /api/predict/orderbook` | `MARKET_PREDICT.orderbook` | 订单簿深度 |
| `GET /api/predict/betting-markets` | `MARKET_PREDICT.bettingMarkets` | 多平台预测市场 |
| `GET /api/predict/whale-transfers` | `MARKET_PREDICT.whaleTransfers` | 鲸鱼交易所净流量 |
| `GET /api/predict/prediction-history` | `MARKET_PREDICT.predictionHistory` | 历史预测快照 |
| `GET /api/predict/signal-history` | `MARKET_PREDICT.signalHistory` | 历史信号记录 |

### API 配置

```javascript
const API_BASE = 'https://api.btcmine.info';  // js/data.js 第 6 行
// 超时: 8000ms (AbortSignal.timeout)
```

**关键说明**:
- `api.btcmine.info` 通过 Cloudflare Tunnel 代理到 DataCentre `100.111.111.111:8000`
- 所有 API 均为 GET 请求，无需认证（公开只读）
- 市场预测 API 中非核心端点（derivatives/backtest/onchain/options/orderbook/betting/whale）均使用 try-catch 包装，失败不影响页面主体渲染

---

## 9. JSON File Schemas / JSON 文件结构速查

> 注意: 数据文件现在已不存放在本仓库 `data/` 目录下（已迁移到 DataCentre API），本仓库 `data/` 目录只保留 `economic-calendar.json`（备用）和 `raw_reports/`（SEC 原始报告）。

### companies API 响应

```json
{
  "companies": [
    {
      "ticker": "MARA",
      "name": "Marathon Digital",
      "full_name": "Marathon Digital Holdings Inc",
      "exchange": "NASDAQ",
      "description": "...",
      "website": "https://...",
      "ir_url": "https://ir.mara.com",
      "fiscal_year_end": "December",
      "sector": "Bitcoin Mining",
      "headquarters": "Fort Lauderdale, FL",
      "stock_price": 23.45,
      "market_cap_usd_m": 7200.0,
      "active": true
    }
  ]
}
```

### financials API 响应

```json
{
  "data": [
    {
      "ticker": "MARA",
      "fiscal_year": 2024,
      "fiscal_quarter": "Q4",
      "period_end_date": "2024-12-31",
      "period_label": "FY2024 Q4",
      "is_reported": true,
      "report_date": "2025-02-26",
      "revenue_usd_m": 214.4,
      "net_income_usd_m": -12.0,
      "adjusted_ebitda_usd_m": 156.3,
      "eps_diluted": -0.04,
      "revenue_yoy_pct": 37.2,
      "net_income_yoy_pct": null,
      "ebitda_yoy_pct": 85.1,
      "gross_profit_usd_m": 78.5,
      "operating_income_usd_m": -25.0,
      "total_debt_usd_m": 850.0,
      "btc_held": 44893,
      "cash_and_equivalents_usd_m": 312.0
    }
  ]
}
```

### operational API 响应

```json
{
  "data": [
    {
      "ticker": "MARA",
      "period": "2024-10",
      "btc_mined": 890,
      "btc_held_eom": 33875,
      "btc_sold": 0,
      "operational_hashrate_eh": 40.2,
      "installed_capacity_eh": 50.0,
      "power_capacity_mw": 1100,
      "fleet_efficiency_j_th": 21.5,
      "uptime_pct": 95.0,
      "avg_power_cost_cents_kwh": 4.5,
      "source_url": "https://..."
    }
  ]
}
```

### news API 响应

```json
{
  "data": [
    {
      "title": "Marathon Digital Reports Record Q4 Revenue",
      "titleCn": "Marathon Digital 报告创纪录的 Q4 营收",
      "published_at": "2025-02-26T08:00:00Z",
      "ticker": "MARA",
      "category": "earnings",
      "sentiment": "positive",
      "sentiment_score": 0.85,
      "aiRating": {
        "grade": "A",
        "score": 88,
        "signal": "bullish",
        "summary": "..."
      },
      "source_url": "https://..."
    }
  ]
}
```

### sentiment API 响应

```json
{
  "analyst_ratings": [
    {
      "ticker": "MARA",
      "firm": "H.C. Wainwright",
      "rating": "buy",
      "target_price": 35.00,
      "action": "maintain",
      "date": "2025-02-27",
      "notes": "Raised PT from $30"
    }
  ],
  "social_sentiment": [
    {
      "ticker": "MARA",
      "source": "StockTwits",
      "bullish_pct": 72,
      "bearish_pct": 28,
      "volume": 1250,
      "trending": true,
      "timestamp": "2025-02-28"
    }
  ]
}
```

### analysis API 响应

```json
{
  "data": {
    "MARA": {
      "name": "Marathon Digital",
      "current": {
        "total_assets": 4500.0,
        "current_assets": 800.0,
        "current_liabilities": 200.0,
        "total_liabilities": 1200.0,
        "long_term_debt": 850.0,
        "retained_earnings": -500.0,
        "ebit": 50.0,
        "revenue": 800.0,
        "net_income": -12.0,
        "operating_cash_flow": 150.0,
        "gross_profit": 300.0,
        "ppe_net": 2500.0,
        "depreciation": 120.0,
        "sga": 80.0,
        "receivables": 50.0,
        "shares_outstanding_m": 310.0
      },
      "prior": { /* 前期数据, 同 current 结构 */ },
      "market": {
        "market_cap": 7200.0,
        "asset_volatility": 0.65,
        "risk_free_rate": 0.045,
        "revenue_growth_mean": 0.25,
        "revenue_growth_std": 0.40
      }
    }
  }
}
```

### economic-calendar.json (本地备用)

```json
{
  "updated_at": "2026-03-04",
  "source": "US Bureau of Labor Statistics / Federal Reserve / Bureau of Economic Analysis",
  "events": [
    {
      "date": "2026-03-06",
      "time": "08:30",
      "tz": "ET",
      "event": "Non-Farm Payrolls",
      "event_cn": "非农就业人数",
      "country": "US",
      "impact": "high",
      "previous": "143K",
      "forecast": "160K",
      "actual": null,
      "description": "Key employment data, major market mover"
    }
  ]
}
```

---

## 10. OpenClaw Automation / 自动化

### Cron 调度（在 DataCentre 运行）

| 任务 | 频率 | 时间 | 内容 |
|------|------|------|------|
| 日采集 | 周一至周五 | 6:00 AM ET | 股价 + 市值更新 |
| 周采集 | 每周日 | 7:00 AM ET | SEC 全量 + 股价 + 分析数据 |
| 月采集 | 每月 1 日 | 8:00 AM ET | 全量刷新（含运营数据） |
| 新闻情绪 | 每 30 分钟 | 07:00-22:00 SGT | OP Cron 31 个任务 |

### 数据发布流程

```
OP 采集数据 → 修改 /data/*.json → git commit → 创建 PR → GitHub Action 自动验证 → 自动合并 → GitHub Pages 部署 (~60s)
```

### 自动合并规则（`.github/workflows/auto-merge-data.yml`）

1. PR 仅修改 `data/` 目录下的文件
2. 所有 JSON 文件通过 `python3 -m json.tool` 语法验证
3. PR 作者必须是 `tincomking`
4. 自动 Approve + Squash Merge
5. Commit 标题格式: `data: <PR 标题>`

### 部署工作流（`.github/workflows/deploy.yml`）

- 触发: push 到 `main` 分支 或 手动 `workflow_dispatch`
- 流程: checkout → configure-pages → upload-artifact → deploy-pages
- 整站直接上传（`path: '.'`），无构建步骤

---

## 11. Security Rules / 安全规范

### 前端安全

- 无用户输入处理（纯只读展示站）
- 所有 API 均为 GET 请求，无写入操作
- 无 cookie/localStorage 敏感信息（仅存语言/主题/缩放偏好）
- CDN 资源使用 `https://cdn.jsdelivr.net`

### API 安全

- `api.btcmine.info` 通过 Cloudflare Tunnel 代理，不直接暴露服务器 IP
- DataCentre 内部服务绑定 `127.0.0.1`
- FastAPI 生产环境关闭 `/docs`
- 管理 API 需要认证
- 不信任 `cf-connecting-ip`，使用 `request.client.host` 判断 Tailscale IP

### 仓库安全

- `.gitignore` 排除 `.env*`, `node_modules/`, `__pycache__/`, IDE 文件
- GitHub Actions 限制 PR auto-merge 仅 `tincomking` 用户
- 密钥/凭据一律使用 `.env` + pydantic-settings

---

## 12. Quality Metrics / 质量指标

### 性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 首屏加载 | <3s | 7 个核心 API 并行请求 |
| API 超时 | 8s | `AbortSignal.timeout(8000)` |
| 页面切换 | <200ms | 纯 DOM 显隐，无路由跳转 |
| 市场预测懒加载 | <5s | 仅在进入该页面时加载 12+ API |

### 数据质量

| 指标 | 标准 |
|------|------|
| 公司覆盖率 | 23/23 家主要上市矿企 |
| 财务数据完整度 | 重点 5 家 (MARA/RIOT/CLSK/CORZ/HUT) 100% 字段填充 |
| 新闻时效性 | <24h 延迟 |
| 预测更新频率 | 市场预测每小时刷新，机构预测季度更新 |
| JSON 合法性 | 每次 PR 自动验证 |

### 代码质量

| 文件 | 行数 | 说明 |
|------|------|------|
| `js/app.js` | 4302 行 | 主逻辑，含 50+ render 函数 |
| `index.html` | 1363 行 | 单页 HTML，含方法论面板 |
| `css/style.css` | 3123 行 | 全站样式，双主题 |
| `js/i18n.js` | 902 行 | ~400 个翻译键（中+英） |
| `js/data.js` | 209 行 | 数据加载层 |
| `Analysis/*.js` | ~150 行/个 | 6 个独立模型模块 |

---

## 13. Future Considerations / TODO

### 高优先级

- [ ] Telegram 预警 Bot Token 配置（AlertChecker 已就绪，待 token）
- [ ] 移动端响应式优化（当前 PC 优先，手机体验欠佳）
- [ ] 数据缓存层（Service Worker 或 localStorage 缓存 API 响应，减少重复请求）

### 中优先级

- [ ] 公司详情独立页面（当前是弹窗 Modal，信息量有限）
- [ ] 历史数据对比功能（跨季度/跨年趋势图）
- [ ] 用户自定义关注列表
- [ ] API 健康监控面板
- [ ] 预测准确率追踪仪表盘（历史预测 vs 实际价格）

### 低优先级

- [ ] RSS/Atom Feed 输出
- [ ] 数据导出（CSV/Excel）
- [ ] 嵌入式 Widget（供第三方网站引用）
- [ ] 暗色主题进一步优化（部分图表颜色在暗色下对比度不足）
- [ ] SEO 优化（当前 SPA 对搜索引擎不友好）

### 技术债务

- [ ] `app.js` 4300 行需要拆分为多个模块
- [ ] 部分 render 函数间耦合较重，重构为独立组件
- [ ] `scripts/` 目录下的 Python 脚本已被 DataCentre 替代，可考虑归档
- [ ] 硬编码的 FUFU 公司优先排序逻辑（`ensureFufuFirst` 函数）需要参数化

---

## 14. Appendix / 附录

### 14.1 覆盖公司列表

| 优先级 | Ticker | 公司名称 | 说明 |
|--------|--------|---------|------|
| **P0** | MARA | Marathon Digital | 最大矿企，44k+ BTC 持仓 |
| **P0** | RIOT | Riot Platforms | 第二大，算力持续扩张 |
| **P0** | CLSK | CleanSpark | 高效率运营 |
| **P0** | CORZ | Core Scientific | 从破产重组复出 |
| **P0** | HUT | Hut 8 Mining | 加拿大总部，NASDAQ 上市 |
| P1 | WULF | TeraWulf | 低碳挖矿 |
| P1 | IREN | IREN (原 Iris Energy) | 澳洲背景 |
| P1 | CIFR | Cipher Mining | 数据中心转型 |
| P1 | APLD | Applied Digital | AI/HPC 转型 |
| P1 | BITF | Bitfarms | 加拿大/南美运营 |
| P1 | BTBT | Bit Digital | 多元化挖矿 |
| P2 | ABTC | - | - |
| P2 | ANY | Sphere 3D | - |
| P2 | AULT | BitNile | - |
| P2 | BTDR | Bitdeer | 芯片设计+挖矿 |
| P2 | DGHI | Digihost | - |
| P2 | FUFU | BitFuFu | 云算力平台 |
| P2 | GREE | Greenidge | - |
| P2 | HIVE | HIVE Digital | - |
| P2 | MIGI | - | - |
| P2 | SAI | SAI.TECH | - |
| P2 | SDIG | Stronghold Digital | - |
| P2 | SLNH | Soluna Holdings | - |

### 14.2 关键文件修改指南

| 修改需求 | 文件 | 说明 |
|---------|------|------|
| 新增公司 | API 数据 + `data/raw_reports/<TICKER>/` | 无需改前端代码 |
| 修改 UI 布局 | `index.html` | 页面 HTML 结构 |
| 修改样式 | `css/style.css` | 含暗色主题变量 `[data-theme="light"]` |
| 修改渲染逻辑 | `js/app.js` | 找到对应 `render*()` 函数 |
| 新增翻译 | `js/i18n.js` | 在 `zh` 和 `en` 对象中各加一条 |
| 修改 API 端点 | `js/data.js` | `API_BASE` 变量和 `fetchAPI()` 调用 |
| 修改分析模型 | `Analysis/<model>.js` | IIFE 模块，注册到 `ANALYSIS_MODELS` |
| 修改部署配置 | `.github/workflows/deploy.yml` | GitHub Pages 配置 |
| 修改 auto-merge | `.github/workflows/auto-merge-data.yml` | 数据 PR 自动合并规则 |

### 14.3 常用开发命令

```bash
# 本地预览（任意静态服务器）
cd /Users/leogrossman/btcminecompany
python3 -m http.server 8080

# 查看 git 状态
cd /Users/leogrossman/btcminecompany && git status

# 推送部署（自动触发 GitHub Pages）
cd /Users/leogrossman/btcminecompany && git add -A && git commit -m "描述" && git push

# 检查 API 可用性
curl -s https://api.btcmine.info/api/btcmine/companies | python3 -m json.tool | head -20
curl -s https://api.btcmine.info/api/predict/latest | python3 -m json.tool

# 检查 DataCentre 直连
curl -s http://100.111.111.111:8000/api/dashboard | python3 -m json.tool | head -20
```

### 14.4 app.js 核心 render 函数索引

| 函数 | 行号 | 页面 | 说明 |
|------|------|------|------|
| `renderOverview()` | 256 | 概览 | 统计栏+财报提醒+公司网格+对比表 |
| `renderCompanyGrid()` | 411 | 概览 | 公司卡片网格（支持排序） |
| `renderCompTable()` | 561 | 概览 | 同业对比表 |
| `renderFinancials()` | 678 | 财务 | 财务页面入口 |
| `renderRevenueChart()` | 1101 | 财务 | 营收对比柱状图 |
| `renderOperations()` | 1232 | 运营 | 运营页面入口 |
| `renderBtcProductionChart()` | 1329 | 运营 | BTC 产量趋势图 |
| `renderNews()` | 1406 | 新闻 | 新闻页面入口 |
| `renderSentiment()` | 1616 | 情绪 | 情绪页面入口 |
| `renderAnalysis()` | 1989 | 分析 | 分析页面入口 |
| `renderAnalysisSummary()` | 2032 | 分析 | 综合评估总结 |
| `renderPredictions()` | 2335 | 机构预测 | 机构预测页面入口 |
| `renderFitting()` | 2706 | 机构预测 | 高级拟合分析 |
| `renderMarketPredict()` | 2985 | 市场预测 | 市场预测页面入口（async） |
| `renderMPForecastChart()` | 3149 | 市场预测 | 预测主图（async） |
| `renderMPModelsAccordion()` | 3370 | 市场预测 | 全模型折叠面板 |
| `renderMPConsensusCompact()` | 3431 | 市场预测 | 信号共识热力图 |
| `renderMPBettingTable()` | 3612 | 市场预测 | 预测市场表格 |
| `renderMPDerivatives()` | 3924 | 市场预测 | 衍生品仪表盘 |
| `renderDerivFRChart()` | 4048 | 市场预测 | FR 历史图 |
| `renderDerivOIChart()` | 4096 | 市场预测 | OI vs Price 图 |

### 14.5 主题与 i18n 系统

**主题**: 通过 `document.documentElement.setAttribute('data-theme', 'light')` 切换。CSS 使用 CSS 变量：
- 默认（暗色）: `:root { --bg: #0a0a0a; --text: #f0f0f0; ... }`
- 亮色: `[data-theme="light"] { --bg: #f8f9fa; --text: #18181b; ... }`

**i18n**: `data-i18n` 属性驱动，`t(key)` 函数返回当前语言文本。语言切换后调用 `applyI18n()` + 重新渲染当前页面。

**缩放**: 9 级缩放 `[0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2]`，通过 `document.body.style.zoom` 实现。

---

*本文档由 Claude Code 生成，用于为 Claude Code Agent 提供完整项目上下文。修改项目后请同步更新本文档中受影响的章节。*
