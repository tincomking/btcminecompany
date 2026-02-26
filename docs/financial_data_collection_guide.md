# BTC Mining Intelligence 全站数据采集指南

> 本文档供自动化 AI Agent 使用。Agent 每日执行 4 次（06:00 / 12:00 / 18:00 / 00:00 UTC），为 btcmine.info 平台持续采集、更新所有数据文件。
>
> **适用范围**: 覆盖 `data/` 目录下全部 7 个可更新数据文件 + 1 个只读参考文件。

---

## 第 0 章: 安全红线（绝对禁止违反）

> **历史事故**: 2026-02-26，一个 Agent 删除了网站核心文件（`js/app.js`、`css/style.css`、`Analysis/*.js`、`CNAME`、`js/i18n.js`），重写了 `index.html` 和 `js/data.js`，并修改了 JSON 文件结构（添加 `_meta` 到不允许的文件），导致 btcmine.info 完全崩溃、不可用。以下规则基于该事故教训制定，**绝对不可违反**。

### 0.1 禁止操作清单

| # | 禁止操作 | 原因 |
|---|---------|------|
| 1 | **禁止删除 `data/` 目录以外的任何文件** | Agent 删除了 `Analysis/*.js`、`CNAME`、`css/style.css`、`js/i18n.js`，导致网站崩溃 |
| 2 | **禁止修改以下文件**: `index.html`、`js/app.js`、`js/data.js`、`js/i18n.js`、`css/style.css`、`Analysis/*.js`、`CNAME`、`.github/*`、`README.md` | 这些是网站核心代码，数据采集 Agent 无权修改 |
| 3 | **禁止修改 `data/schema.json`** | 此为只读参考文档 |
| 4 | **禁止改变任何 JSON 文件的顶层结构** | Agent 曾将 `{data:[...]}` 改为 `{_meta:{...}, data:[...]}`，导致前端解析失败 |
| 5 | **禁止使用 `git add .`、`git add -A`、`git add --all`** | 可能 stage 非 `data/` 文件 |
| 6 | **禁止创建新分支** | 所有数据变更直接提交到 `main` 分支 |
| 7 | **禁止编造数据** | 找不到的数据填 `null`，绝对不可捏造数字 |

### 0.2 允许操作范围

```
可修改的文件（仅 7 个）:
  data/companies.json          — 仅更新 stock_price 和 market_cap_usd_m 字段
  data/financials.json         — 在 data 数组中 添加/更新 记录
  data/operational.json        — 在 data 数组中 添加/更新 记录
  data/news.json               — 在 data 数组中 添加 新记录
  data/sentiment.json          — 在 analyst_ratings / social_sentiment 数组中 添加/更新 记录
  data/analysis_data.json      — 在 data 对象中 添加/更新 公司条目
  data/btc_price_predictions.json — 更新预测数据（仅周更）

可新增的文件:
  data/raw_reports/{TICKER}/{YEAR}_{PERIOD}.json — 原始财报存档

绝对不可触碰:
  index.html, js/*, css/*, Analysis/*, CNAME, .github/*, docs/*, README.md
  data/schema.json（只读参考）
```

### 0.3 每个数据文件的结构保护规则

**以下是每个 JSON 文件的顶层结构，Agent 必须严格遵守，不得修改顶层键名或添加/删除顶层键**:

| 文件 | 必须的顶层键 | 禁止的操作 |
|------|------------|-----------|
| `companies.json` | `_meta`, `companies` | `companies` 是数组，不是 `data`。禁止将 `companies` 改名为 `data` |
| `financials.json` | `_meta`, `data` | `data` 是数组。`_meta` 已存在，保留即可 |
| `operational.json` | `_meta`, `data` | `data` 是数组。`_meta` 已存在，保留即可 |
| `news.json` | `_meta`, `data` | `data` 是数组。`_meta` 已存在，保留即可 |
| `sentiment.json` | `_meta`, `analyst_ratings`, `social_sentiment` | **无 `data` 键**。两个独立数组 |
| `analysis_data.json` | `data` | `data` 是**对象**（非数组）。**禁止添加 `_meta`** |
| `btc_price_predictions.json` | `_meta`, `crypto_platform_predictions`, `institutional_predictions`, `summary_consensus`, `key_catalysts`, `key_risks` | **无 `data` 包装器**。所有键在顶层 |

### 0.4 上次事故详情

**日期**: 2026-02-26
**影响**: btcmine.info 完全不可用

**Agent 的错误操作**:
1. 删除了 6 个分析模型文件（`Analysis/beneish.js` 等）
2. 删除了 CNAME 文件（自定义域名配置）
3. 删除了 `css/style.css`（整个样式表）
4. 删除了 `js/i18n.js`（国际化系统）
5. 重写了 `index.html`、`js/app.js`、`js/data.js`
6. 将 JSON 文件结构从 `{data:[...]}` 改为 `{_meta:{...}, data:[...]}`（对不允许添加 `_meta` 的文件）
7. 推送到了非 main 分支

**根本原因**: Agent 没有理解自己的操作范围仅限于 `data/` 目录中的数据记录，擅自重写了整个网站。

---

## 第 1 章: 平台概览

### 1.1 项目背景

btcmine.info 是一个 BTC 矿企情报平台，部署在 GitHub Pages 上。网站从 `data/` 目录的 JSON 文件加载所有数据，通过 `js/data.js` 解析并在前端展示。

### 1.2 跟踪的公司（22 家活跃 + 1 家退市）

```
活跃 (22):
FUFU, MARA, RIOT, CLSK, CORZ, CIFR, HUT, WULF, IREN, BITF,
BTBT, BTDR, APLD, HIVE, GREE, ABTC, ANY, SLNH, GPUS, DGXX,
MIGI, SAIH

退市/已并购 (不再采集):
SDIG — 2025年3月被 Bitfarms (BITF) 收购退市

Ticker 变更记录:
AULT → GPUS  (Hyperscale Data, 2024年9月更名)
DGHI → DGXX  (Digi Power X, 2025年3月更名)
SAI  → SAIH  (SAIHEAT, 2024年9月更名)
```

### 1.3 非标准财年公司

| Ticker | 财年截止月 | SEC Filing 类型 |
|--------|----------|----------------|
| CLSK | 9月 | 10-K / 10-Q |
| IREN | 6月 | 20-F / 6-K |
| APLD | 5月 | 10-K / 10-Q |
| HIVE | 3月 | 10-K / 10-Q |
| MIGI | 6月 | 10-K / 10-Q |
| SAIH | 6月 | 20-F / 6-K |

其余 16 家活跃公司财年截止为 12 月。

### 1.4 数据文件总览与采集频率分级

数据按时效性分为 5 个采集频率等级:

#### 频率等级 A: 实时级（每日 4 次，每 6 小时）

| 文件 | 更新字段 | 采集时间 |
|------|---------|---------|
| `data/companies.json` | `stock_price`, `market_cap_usd_m` | Run 1/2/3/4 |
| `data/analysis_data.json` | `market.stock_price`, `market.market_cap` | Run 1/2/3/4 |

#### 频率等级 B: 高频（每日 2 次）

| 文件 | 更新内容 | 采集时间 |
|------|---------|---------|
| `data/news.json` | 新增新闻条目 | Run 2 (12:00) + Run 3 (18:00) |
| `data/sentiment.json` → `social_sentiment` | StockTwits 看涨比例、Reddit/X 提及数 | Run 2 (12:00) + Run 4 (00:00) |

#### 频率等级 C: 日检（每日 1 次检查，有新数据才更新）

| 文件 | 触发条件 | 采集时间 |
|------|---------|---------|
| `data/financials.json` | SEC 有新 10-K/10-Q/20-F/6-K | Run 3 (18:00) |
| `data/sentiment.json` → `analyst_ratings` | 新分析师评级发布 | Run 3 (18:00) |
| `data/operational.json` | 公司 IR 发布月度报告（通常每月 1-7 日） | Run 3 (18:00) |
| `data/analysis_data.json` → `current/prior` | 年报发布时重算模型 | Run 3 (18:00) |

#### 频率等级 D: 周检（每周 1 次）

| 文件 | 更新内容 | 采集时间 |
|------|---------|---------|
| `data/btc_price_predictions.json` | 各平台/机构 BTC 价格预测 | Run 4 (00:00)，仅周日 |

#### 频率等级 E: 只读（Agent 禁止修改）

| 文件 | 说明 |
|------|------|
| `data/schema.json` | 结构参考文档，仅人工修改 |

### 1.5 前端数据加载方式

`js/data.js` 的加载逻辑（Agent 必须了解，以避免破坏兼容性）:

```javascript
// companies.json → 使用 companiesRes.companies（不是 .data）
COMPANIES = companiesRes.companies || [];

// financials.json → 使用 financialsRes.data
FINANCIALS = financialsRes.data || [];

// operational.json → 使用 operationalRes.data
OPERATIONAL = operationalRes.data || [];

// news.json → 使用 newsRes.data
NEWS = newsRes.data || [];

// sentiment.json → 使用两个独立数组（不是 .data）
SENTIMENT = {
  analyst_ratings: sentimentRes.analyst_ratings || [],
  social_sentiment: sentimentRes.social_sentiment || [],
};

// analysis_data.json → 使用 analysisRes.data（对象，非数组）
ANALYSIS_DATA = analysisRes.data || {};

// btc_price_predictions.json → 直接使用整个响应对象
BTC_PREDICTIONS = predictionsRes || {};
```

---

## 第 2 章: 各数据文件详细规范

---

### 2.1 文件 1: `data/companies.json` — 公司主列表

#### 顶层结构

```json
{
  "_meta": {
    "description": "US-listed Bitcoin mining companies master data",
    "last_updated": "2026-02-26",
    "source_agent": "data-agent",
    "market_data_note": "Stock prices and market caps are approximate as of Feb 2026."
  },
  "companies": [
    { ... },
    { ... }
  ]
}
```

**顶层键**: `_meta`（已存在）, `companies`（数组）。
**注意**: 数组键名是 `companies`，**不是** `data`。

#### 每条记录的字段

| 字段 | 类型 | 必填 | 说明 | Agent 可否更新 |
|------|------|------|------|---------------|
| `ticker` | string | 是 | 股票代码，大写 | 否（仅人工） |
| `name` | string | 是 | 公司简称 | 否（仅人工） |
| `full_name` | string | 是 | 公司法定全称 | 否（仅人工） |
| `exchange` | string | 是 | `"NASDAQ"` / `"NYSE"` / `"OTC"` | 否（仅人工） |
| `sector` | string | 是 | 业务板块 | 否（仅人工） |
| `description` | string | 否 | 公司描述 | 否（仅人工） |
| `website` | string | 否 | 公司官网 | 否（仅人工） |
| `ir_url` | string | 否 | 投资者关系页面 | 否（仅人工） |
| `founded` | integer | 否 | 成立年份 | 否（仅人工） |
| `headquarters` | string | 否 | 总部所在地 | 否（仅人工） |
| `fiscal_year_end` | string | 是 | 财年截止月份 | 否（仅人工） |
| `stock_price` | number | 否 | 最新股价（USD） | **是 — 每日4次** |
| `market_cap_usd_m` | number | 否 | 市值（百万USD） | **是 — 每日4次** |
| `active` | boolean | 是 | 是否活跃跟踪 | 否（仅人工） |

#### Agent 更新规则

- Agent **仅可更新** 每家公司的 `stock_price` 和 `market_cap_usd_m` 两个字段
- **禁止**添加、删除公司记录
- **禁止**修改公司名称、交易所等基础信息
- 更新时同步更新 `_meta.last_updated` 为当天日期

#### 去重规则

按 `ticker` 去重。每个 ticker 在数组中只有一条记录。

#### 数据来源

| 来源 | URL/API | 说明 |
|------|---------|------|
| Yahoo Finance | `https://finance.yahoo.com/quote/{TICKER}` | 实时股价、市值 |
| Google Finance | `https://www.google.com/finance/quote/{TICKER}:NASDAQ` | 备用 |
| Financial Modeling Prep API | `https://financialmodelingprep.com/api/v3/quote/{TICKER}` | 需 API key |
| Alpha Vantage | `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={TICKER}` | 需 API key |

#### 更新示例

找到 ticker 为 `MARA` 的对象，仅修改：
```json
{
  "stock_price": 15.23,
  "market_cap_usd_m": 5097
}
```

---

### 2.2 文件 2: `data/financials.json` — 季度/年度财务数据

#### 顶层结构

```json
{
  "_meta": {
    "description": "Quarterly and annual financial data for US Bitcoin mining companies",
    "currency": "USD millions (unless noted)",
    "last_updated": "2026-02-26",
    "source_agent": "data-agent",
    "note": "Data collected from company IR websites and earnings reports"
  },
  "data": [
    { ... },
    { ... }
  ]
}
```

**顶层键**: `_meta`（已存在，保留）, `data`（数组）。

#### 每条记录的字段

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `ticker` | string | 是 | 股票代码 | `"MARA"` |
| `fiscal_year` | integer | 是 | 财年 | `2024` |
| `fiscal_quarter` | string | 是 | `"Q1"` / `"Q2"` / `"Q3"` / `"Q4"` / `"FY"` | `"Q4"` |
| `period_label` | string | 是 | 显示文字 | `"Q4 2024"` / `"FY 2024"` |
| `period_end_date` | string | 是 | 周期截止日 `YYYY-MM-DD` | `"2024-12-31"` |
| `report_date` | string\|null | 是 | 财报实际发布日。未发布填 `null` | `"2025-03-25"` |
| `estimated_report_date` | string\|null | 否 | 预计发布日。已发布填 `null` | `null` |
| `is_reported` | boolean | 是 | 已发布填 `true` | `true` |
| `revenue_usd_m` | number\|null | 是 | 总营收（百万USD） | `463.3` |
| `gross_profit_usd_m` | number\|null | 否 | 毛利润 | `29.7` |
| `operating_income_usd_m` | number\|null | 否 | 营业利润/亏损（亏损为负数） | `58.9` |
| `net_income_usd_m` | number\|null | 是 | 净利润/亏损 | `54.0` |
| `adjusted_ebitda_usd_m` | number\|null | 是 | 调整后 EBITDA | `117.5` |
| `eps_diluted` | number\|null | 否 | 稀释每股收益 | `0.34` |
| `revenue_yoy_pct` | number\|null | 否 | 营收同比增长率（%） | `63.1` |
| `gross_profit_yoy_pct` | number\|null | 否 | 毛利润同比增长率（%） | `133.9` |
| `net_income_yoy_pct` | number\|null | 否 | 净利润同比增长率（%）。双亏损填 `null` | `null` |
| `adjusted_ebitda_yoy_pct` | number\|null | 否 | 调整后 EBITDA 同比增长率（%） | `null` |
| `shares_outstanding_m` | number\|null | 否 | 稀释流通股（百万） | `163.1` |
| `cash_and_equivalents_usd_m` | number\|null | 否 | 现金及等价物 | `45.1` |
| `btc_held` | integer\|null | 否 | 期末持有 BTC（个） | `1720` |
| `total_debt_usd_m` | number\|null | 否 | 总债务 | `35.0` |
| `notes` | string | 否 | 备注 | `"Source: 20-F filed..."` |

#### 添加/更新规则

- **添加**: 每个新的报告周期（公司 + 财年 + 季度组合），向 `data` 数组追加一条新记录
- **更新**: 如果已存在同一 `ticker` + `fiscal_year` + `fiscal_quarter` 的记录，**更新该记录**而非重复添加
- **去重键**: `(ticker, fiscal_year, fiscal_quarter)`
- **排序**: 无强制排序要求，但建议按 ticker 字母序 + 时间正序

#### YoY 增长率计算方法

```
revenue_yoy_pct = (当期 revenue - 去年同期 revenue) / |去年同期 revenue| * 100
```
- 同期 = 同一 fiscal_quarter + fiscal_year - 1
- 如去年同期不存在或 revenue 为 0，填 `null`
- net_income_yoy_pct: 如两期都是亏损（负数），填 `null`（无意义）
- 保留 1 位小数

#### 数据来源

| 优先级 | 来源 | URL |
|--------|------|-----|
| 1 | SEC EDGAR (10-K/10-Q/20-F/6-K) | `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={TICKER}&type=10-K&dateb=&owner=include&count=10` |
| 2 | 公司 IR 页面 | 各公司 `ir_url` 字段 |
| 3 | Stock Analysis | `https://stockanalysis.com/stocks/{TICKER}/financials/?p=quarterly` |
| 4 | Yahoo Finance | `https://finance.yahoo.com/quote/{TICKER}/financials` |
| 5 | Macrotrends | `https://www.macrotrends.net/stocks/charts/{TICKER}/` |

#### 完整记录示例

```json
{
  "ticker": "FUFU",
  "fiscal_year": 2024,
  "fiscal_quarter": "FY",
  "period_label": "FY 2024",
  "period_end_date": "2024-12-31",
  "report_date": "2025-04-21",
  "estimated_report_date": null,
  "is_reported": true,
  "revenue_usd_m": 463.3,
  "gross_profit_usd_m": 29.7,
  "operating_income_usd_m": 58.9,
  "net_income_usd_m": 54.0,
  "adjusted_ebitda_usd_m": 117.5,
  "eps_diluted": 0.34,
  "revenue_yoy_pct": 63.1,
  "gross_profit_yoy_pct": 133.9,
  "net_income_yoy_pct": 414.3,
  "adjusted_ebitda_yoy_pct": 182.1,
  "shares_outstanding_m": 163.1,
  "cash_and_equivalents_usd_m": 45.1,
  "btc_held": 1720,
  "total_debt_usd_m": 35.0,
  "notes": "FY2024: Revenue $463.3M (+63% YoY). Source: 20-F filed 2025-04-21."
}
```

---

### 2.3 文件 3: `data/operational.json` — 月度挖矿运营数据

#### 顶层结构

```json
{
  "_meta": {
    "description": "Monthly operational disclosures from IR websites and press releases",
    "last_updated": "2026-02-26",
    "source_agent": "data-agent",
    "note": "Data collected from company monthly production reports"
  },
  "data": [
    { ... },
    { ... }
  ]
}
```

**顶层键**: `_meta`（已存在，保留）, `data`（数组）。

#### 每条记录的字段

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `ticker` | string | 是 | 股票代码 | `"MARA"` |
| `period` | string | 是 | 报告月份 `YYYY-MM` | `"2025-01"` |
| `period_label` | string | 是 | 可读标签 | `"Jan 2025"` |
| `report_date` | string\|null | 是 | 公司发布日期 `YYYY-MM-DD` | `"2025-02-03"` |
| `btc_mined` | integer\|null | 是 | 当月挖出 BTC 数量 | `750` |
| `btc_held` | integer\|null | 是 | 期末持有 BTC 总量 | `46374` |
| `btc_sold` | integer\|null | 否 | 当月出售 BTC。HODL 策略填 `0` | `0` |
| `hash_rate_eh` | number\|null | 是 | 平均算力 EH/s | `53.2` |
| `installed_capacity_eh` | number\|null | 否 | 已安装算力容量 EH/s | `null` |
| `power_capacity_mw` | number\|null | 否 | 电力容量 MW | `null` |
| `fleet_efficiency_j_th` | number\|null | 否 | 矿机效率 J/TH（越低越好） | `null` |
| `uptime_pct` | number\|null | 否 | 矿机在线率（%） | `null` |
| `avg_power_cost_cents_kwh` | number\|null | 否 | 平均电费（美分/kWh） | `null` |
| `source_url` | string\|null | 否 | IR 新闻稿 URL | `"https://ir.mara.com/..."` |
| `notes` | string | 否 | 备注 | `"HODL strategy - zero BTC sold."` |

#### 添加/更新规则

- **添加**: 每个新月度报告（公司 + 月份组合），追加一条新记录
- **更新**: 如已存在同一 `ticker` + `period` 的记录，更新该记录
- **去重键**: `(ticker, period)`
- 大部分矿企每月初发布上月运营数据（通常每月 1-7 日）

#### 数据来源

| 来源 | 说明 |
|------|------|
| 公司 IR 页面 | 月度生产报告（最权威） |
| GlobeNewswire / BusinessWire / PRNewswire | 新闻稿分发平台 |
| SEC Form 8-K | 部分公司通过 8-K 披露运营数据 |
| The Miner Mag / Hashrate Index | 行业数据汇总（辅助） |

#### 完整记录示例

```json
{
  "ticker": "MARA",
  "period": "2025-01",
  "period_label": "Jan 2025",
  "report_date": "2025-02-03",
  "btc_mined": 750,
  "btc_held": 46374,
  "btc_sold": 0,
  "hash_rate_eh": 53.2,
  "installed_capacity_eh": null,
  "power_capacity_mw": null,
  "fleet_efficiency_j_th": null,
  "uptime_pct": null,
  "avg_power_cost_cents_kwh": null,
  "source_url": "https://ir.mara.com/news-events/press-releases/detail/1386",
  "notes": "Production down 13% MoM due to network difficulty fluctuations. HODL strategy - zero BTC sold."
}
```

---

### 2.4 文件 4: `data/news.json` — 新闻与新闻稿

#### 顶层结构

```json
{
  "_meta": {
    "description": "News and press releases related to US Bitcoin mining companies",
    "last_updated": "2026-02-26",
    "source_agent": "data-agent",
    "note": "..."
  },
  "data": [
    { ... },
    { ... }
  ]
}
```

**顶层键**: `_meta`（已存在，保留）, `data`（数组）。

#### 每条记录的字段

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `id` | string | 是 | 唯一 ID，格式 `news_NNNN` | `"news_001"` |
| `ticker` | string\|null | 是 | 公司相关填 ticker。行业/宏观新闻填 `null` | `"MARA"` |
| `title` | string | 是 | 文章标题 | `"Marathon Digital Reports Q3 2024..."` |
| `source` | string | 是 | 来源出版物名称 | `"PR Newswire"` |
| `url` | string\|null | 否 | 文章 URL。不可用时填 `null` | `"https://..."` |
| `published_at` | string | 是 | 发布时间 ISO 8601 UTC | `"2024-11-07T16:30:00Z"` |
| `category` | string | 是 | 分类（见下方枚举值） | `"earnings"` |
| `sentiment` | string | 是 | `"positive"` / `"negative"` / `"neutral"` | `"neutral"` |
| `sentiment_score` | number | 否 | 情绪分数 -1.0 到 +1.0 | `0.05` |
| `summary` | string | 是 | 2-4 句摘要（最多 500 字符） | `"Marathon reported..."` |
| `tags` | array[string] | 否 | 关键词标签 | `["earnings", "Q3-2024"]` |

#### category 枚举值

```
earnings, operations, expansion, regulatory, market, business,
sustainability, treasury, executive, partnership
```

#### 添加/更新规则

- **仅追加**: 新闻只新增，不更新已有记录
- **去重键**: `id` 字段。分配 ID 时先找到当前最大 `news_NNNN` 编号，+1 作为新 ID
- **替代去重**: 检查是否已存在同一 `title` + `ticker` + `published_at` 的记录，避免重复
- 建议保留最近 6 个月的新闻（更早的可清理，但不强制）

#### 数据来源

| 来源 | URL | 说明 |
|------|-----|------|
| 公司 IR 页面 | 各公司 `ir_url` | 财报公告、运营公告 |
| GlobeNewswire | `https://www.globenewswire.com/search?keyword={TICKER}` | 新闻稿分发 |
| BusinessWire | `https://www.businesswire.com/portal/site/home/` | 新闻稿分发 |
| CoinDesk | `https://www.coindesk.com/tag/mining/` | 行业新闻 |
| The Block | `https://www.theblock.co/category/mining` | 行业新闻 |
| Bloomberg / Reuters | 搜索 `{TICKER} OR {COMPANY_NAME} bitcoin mining` | 主流财经 |
| SEC EDGAR 8-K | `https://efts.sec.gov/LATEST/search-index?q={TICKER}&forms=8-K` | 重大事件披露 |

#### 完整记录示例

```json
{
  "id": "news_025",
  "ticker": "CORZ",
  "title": "Core Scientific Secures 200MW AI Data Center Deal with CoreWeave",
  "source": "Bloomberg",
  "url": null,
  "published_at": "2024-11-01T10:30:00Z",
  "category": "business",
  "sentiment": "positive",
  "sentiment_score": 0.85,
  "summary": "Core Scientific signed a 12-year, $5.75B contract with CoreWeave to convert mining facilities to AI data centers.",
  "tags": ["AI", "HPC", "CoreWeave", "strategic", "pivot"]
}
```

---

### 2.5 文件 5: `data/sentiment.json` — 分析师评级 + 社交情绪

#### 顶层结构

```json
{
  "_meta": {
    "description": "Analyst ratings and social sentiment data for US Bitcoin mining companies",
    "last_updated": "2026-02-26",
    "source_agent": "data-agent",
    "note": "..."
  },
  "analyst_ratings": [
    { ... }
  ],
  "social_sentiment": [
    { ... }
  ]
}
```

**顶层键**: `_meta`, `analyst_ratings`（数组）, `social_sentiment`（数组）。
**注意**: 此文件**没有 `data` 键**。两个数组直接在顶层。

#### 5A: analyst_ratings 字段

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `ticker` | string | 是 | 股票代码 | `"MARA"` |
| `analyst_firm` | string | 是 | 券商/投行名称 | `"H.C. Wainwright"` |
| `analyst_name` | string\|null | 否 | 分析师姓名 | `"Kevin Dede"` |
| `rating` | string | 是 | 原始评级（原文） | `"Buy"` |
| `rating_normalized` | string | 是 | 标准化评级: `"buy"` / `"hold"` / `"sell"` | `"buy"` |
| `target_price_usd` | number\|null | 否 | 目标价（USD） | `35.00` |
| `prev_target_price_usd` | number\|null | 否 | 此前目标价 | `28.00` |
| `date` | string | 是 | 评级日期 `YYYY-MM-DD` | `"2024-11-08"` |
| `action` | string | 是 | 评级动作（见枚举） | `"maintain"` |
| `note` | string | 否 | 分析师评论/理由 | `"Positive on hash rate growth..."` |

**action 枚举值**: `initiate`, `maintain`, `upgrade`, `downgrade`, `upgrade_target`, `downgrade_target`, `reiterate`

**rating 标准化映射**:
- Buy / Outperform / Overweight / Strong Buy -> `"buy"`
- Hold / Neutral / Equal Weight / Market Perform -> `"hold"`
- Sell / Underperform / Underweight -> `"sell"`

#### 5B: social_sentiment 字段

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `ticker` | string | 是 | 股票代码 | `"FUFU"` |
| `date` | string | 是 | 数据日期 `YYYY-MM-DD` | `"2026-02-26"` |
| `reddit_mentions_24h` | integer\|null | 否 | Reddit 24h 提及数 | `0` |
| `twitter_x_mentions_24h` | integer\|null | 否 | Twitter/X 24h 提及数 | `45` |
| `stocktwits_bullish_pct` | number\|null | 否 | StockTwits 看涨比例 0-100 | `42` |
| `stocktwits_bearish_pct` | number\|null | 否 | StockTwits 看跌比例 0-100 | `58` |
| `stocktwits_message_volume` | string | 否 | `"low"` / `"normal"` / `"high"` | `"low"` |
| `composite_score` | number\|null | 否 | 综合情绪得分 -1 到 +1 | `-0.15` |
| `trending` | boolean | 否 | 是否正在社交媒体上趋势化 | `false` |
| `trend_direction` | string | 否 | `"up"` / `"down"` / `"neutral"` | `"down"` |
| `notes` | string | 否 | 备注 | `"Dead last among peers..."` |

#### 关于 composite_score 的重要说明

**前端已自动计算 composite_score**: `js/app.js` 中的 `calcSentimentScore()` 函数直接从 `stocktwits_bullish_pct` 计算:

```javascript
// 公式: (stocktwits_bullish_pct - 50) / 50
// 示例: 70% -> 0.4, 42% -> -0.16, 50% -> 0
```

因此 Agent 的优先级应为:
1. **必须采集** `stocktwits_bullish_pct` 和 `stocktwits_bearish_pct`（前端依赖）
2. **仍然写入** `composite_score` 字段（向后兼容），计算公式: `(stocktwits_bullish_pct - 50) / 50`
3. 两者应一致: 如 `stocktwits_bullish_pct = 42`，则 `composite_score = (42-50)/50 = -0.16`

#### 添加/更新规则

**analyst_ratings**:
- **添加**: 新评级追加到数组
- **去重键**: `(ticker, analyst_firm, date)`。同一天同一券商对同一公司只保留一条
- **不删除**: 历史评级保留

**social_sentiment**:
- **更新**: 每个 ticker 只保留**最新一条**。如已存在同一 `ticker` + `date` 的记录，更新；如新日期，替换旧日期记录
- **去重键**: `(ticker, date)` — 但实际上每个 ticker 只需保留最新的一条（旧的可保留也可替换）

#### 数据来源

| 数据类型 | 来源 | URL |
|---------|------|-----|
| 分析师评级 | TipRanks | `https://www.tipranks.com/stocks/{TICKER}/forecast` |
| 分析师评级 | MarketBeat | `https://www.marketbeat.com/stocks/NASDAQ/{TICKER}/forecast/` |
| 分析师评级 | Yahoo Finance | `https://finance.yahoo.com/quote/{TICKER}/analysis/` |
| 社交情绪 | StockTwits | `https://stocktwits.com/symbol/{TICKER}` |
| 社交情绪 | AltIndex | `https://altindex.com/stock/{TICKER}` |
| 社交情绪 | Reddit (r/CryptoCurrency, r/BitcoinMining) | 搜索 ticker 提及数 |
| 社交情绪 | Twitter/X | 搜索 `${TICKER} bitcoin mining` 计算提及数 |

#### 完整记录示例

**analyst_ratings**:
```json
{
  "ticker": "MARA",
  "analyst_firm": "H.C. Wainwright",
  "analyst_name": "Kevin Dede",
  "rating": "Buy",
  "rating_normalized": "buy",
  "target_price_usd": 35.00,
  "prev_target_price_usd": 28.00,
  "date": "2024-11-08",
  "action": "maintain",
  "note": "Positive on MARA's hash rate growth trajectory and BTC treasury strategy"
}
```

**social_sentiment**:
```json
{
  "ticker": "FUFU",
  "date": "2026-02-26",
  "reddit_mentions_24h": 0,
  "twitter_x_mentions_24h": 45,
  "stocktwits_bullish_pct": 42,
  "stocktwits_bearish_pct": 58,
  "stocktwits_message_volume": "low",
  "composite_score": -0.16,
  "trending": false,
  "trend_direction": "down",
  "notes": "Retail unconvinced despite analyst Buy consensus."
}
```

---

### 2.6 文件 6: `data/analysis_data.json` — 财务分析模型数据

#### 顶层结构

```json
{
  "data": {
    "FUFU": { ... },
    "MARA": { ... }
  }
}
```

**顶层键**: **仅** `data`（对象，非数组）。
**禁止添加 `_meta` 或任何其他顶层键。**

> 注意: 当前文件实际包含 `_meta`，但前端代码 `analysisRes.data || {}` 只读取 `data` 键。如果文件中已有 `_meta` 则保留现状，但**绝对禁止新增**其他顶层键。Agent 写入数据时只操作 `data` 对象内部。

#### 每家公司的结构

```json
{
  "TICKER": {
    "name": "公司全称",
    "current": {
      "period": "FY2024",
      "revenue": 463.3,
      "cogs": 433.6,
      "gross_profit": 29.7,
      "sga": 32.7,
      "depreciation": 24.7,
      "operating_income": 58.9,
      "net_income": 54.0,
      "ebit": 58.9,
      "total_assets": 377.7,
      "current_assets": 265.3,
      "receivables": 10.9,
      "ppe_net": 56.0,
      "total_liabilities": 215.2,
      "current_liabilities": 63.4,
      "long_term_debt": 35.0,
      "retained_earnings": 78.2,
      "total_equity": 162.5,
      "operating_cash_flow": -219.9,
      "shares_outstanding_m": 163.1
    },
    "prior": {
      "period": "FY2023",
      "revenue": 284.1,
      "cogs": 271.4,
      "gross_profit": 12.7,
      "sga": 5.5,
      "depreciation": 24.5,
      "operating_income": 16.6,
      "net_income": 10.5,
      "ebit": 16.6,
      "total_assets": 210.0,
      "current_assets": 121.3,
      "receivables": 3.8,
      "ppe_net": 81.9,
      "total_liabilities": 192.7,
      "current_liabilities": 86.4,
      "long_term_debt": 0,
      "retained_earnings": 24.2,
      "total_equity": 17.3,
      "operating_cash_flow": -115.3,
      "shares_outstanding_m": 149.8
    },
    "market": {
      "stock_price": 2.66,
      "market_cap": 434.0,
      "equity_volatility": 0.72,
      "asset_volatility": 0.42,
      "risk_free_rate": 0.043,
      "revenue_growth_mean": 0.63,
      "revenue_growth_std": 0.25
    }
  }
}
```

#### current / prior 字段列表

| 字段 | 类型 | 说明 | 单位 |
|------|------|------|------|
| `period` | string | `"FY2024"` 格式 | — |
| `revenue` | number | 总营收 | 百万USD |
| `cogs` | number | 营业成本 | 百万USD |
| `gross_profit` | number | 毛利润 = revenue - cogs | 百万USD |
| `sga` | number | 销售、一般及行政费用 | 百万USD |
| `depreciation` | number | 折旧摊销 | 百万USD |
| `operating_income` | number | 营业利润 | 百万USD |
| `net_income` | number | 净利润 | 百万USD |
| `ebit` | number | 息税前利润 | 百万USD |
| `total_assets` | number | 总资产 | 百万USD |
| `current_assets` | number | 流动资产 | 百万USD |
| `receivables` | number | 应收账款 | 百万USD |
| `ppe_net` | number | 固定资产净值 | 百万USD |
| `total_liabilities` | number | 总负债 | 百万USD |
| `current_liabilities` | number | 流动负债 | 百万USD |
| `long_term_debt` | number | 长期债务 | 百万USD |
| `retained_earnings` | number | 留存收益 | 百万USD |
| `total_equity` | number | 股东权益 | 百万USD |
| `operating_cash_flow` | number | 经营现金流 | 百万USD |
| `shares_outstanding_m` | number | 流通股数 | 百万 |

#### market 字段说明

| 字段 | 类型 | 说明 | 典型范围 |
|------|------|------|---------|
| `stock_price` | number | 最新股价（USD） | — |
| `market_cap` | number | 市值（百万USD） | — |
| `equity_volatility` | number | 年化股权波动率 | 0.70-0.95 |
| `asset_volatility` | number | 年化资产波动率 ≈ equity_vol * (equity/assets) | 0.35-0.55 |
| `risk_free_rate` | number | 无风险利率，统一 `0.043` | 0.043 |
| `revenue_growth_mean` | number | 营收增长率 = (current.revenue - prior.revenue) / prior.revenue | — |
| `revenue_growth_std` | number | 增长率标准差 ≈ growth_mean * 0.3~0.5 | — |

#### 添加/更新规则

- **更新时机**: 仅当某公司有**新年报（FY）数据**时更新
- **更新方式**:
  - `current` = 最新 FY 数据
  - `prior` = 上一个 FY 数据
  - `market` = 更新 stock_price、market_cap、重新计算 revenue_growth_mean/std
- **季度数据不更新此文件**（分析模型目前仅使用年度数据）
- **去重键**: `data` 对象中的键名（ticker），每个 ticker 只有一个条目

#### 数据来源

与 `financials.json` 相同（SEC EDGAR、公司 IR 等），但仅取年度报告数据。market 字段从 Yahoo Finance / Google Finance 获取。

---

### 2.7 文件 7: `data/btc_price_predictions.json` — BTC 价格预测

#### 顶层结构

```json
{
  "_meta": {
    "title": "Bitcoin (BTC) Price Predictions 2025-2030",
    "description": "...",
    "data_collected": "2026-02-26",
    "disclaimer": "All predictions are speculative...",
    "notes": "..."
  },
  "crypto_platform_predictions": [ ... ],
  "institutional_predictions": [ ... ],
  "summary_consensus": { ... },
  "key_catalysts": [ ... ],
  "key_risks": [ ... ]
}
```

**顶层键**: `_meta`, `crypto_platform_predictions`, `institutional_predictions`, `summary_consensus`, `key_catalysts`, `key_risks`。
**注意**: 没有 `data` 包装器。所有数据键直接在顶层。

#### crypto_platform_predictions 记录

```json
{
  "source": "DigitalCoinPrice",
  "url": "https://digitalcoinprice.com/forecast/bitcoin",
  "prediction_date": "2026-02",
  "methodology": "Algorithmic model based on historical data and technical analysis",
  "predictions": {
    "2025": { "low": null, "high": null, "average": null, "notes": "..." },
    "2026": { "low": 224224, "high": 270576, "average": 247614 },
    "2027": { "low": 307075, "high": null, "average": 376327 }
  }
}
```

#### institutional_predictions 记录

```json
{
  "source": "Standard Chartered",
  "type": "institutional",
  "url": "...",
  "analyst": "Geoff Kendrick",
  "prediction_date": "2025-01",
  "methodology": "Macro analysis...",
  "notes": "...",
  "predictions": {
    "2025": { "low": null, "high": null, "average": 200000, "year_end": 200000 }
  }
}
```

#### summary_consensus 结构

```json
{
  "description": "Aggregated consensus...",
  "2025": { "low": 80000, "high": 250000, "median": 150000, "mean": 155000 },
  "2026": { "low": 100000, "high": 500000, "median": 250000, "mean": 270000 }
}
```

#### key_catalysts 和 key_risks

```json
"key_catalysts": [
  { "catalyst": "Spot Bitcoin ETF inflows", "impact": "high", "timeline": "2025-2026" },
  ...
],
"key_risks": [
  { "risk": "Regulatory crackdown on crypto", "impact": "high", "likelihood": "medium" },
  ...
]
```

#### 添加/更新规则

- **更新频率**: 每周一次（在 Run 4 / 00:00 UTC 执行）
- **更新方式**: 更新已有来源的预测数据，或添加新的预测来源
- **去重**: `crypto_platform_predictions` 按 `source` 去重；`institutional_predictions` 按 `source` + `analyst` 去重
- `summary_consensus` 根据所有来源重新汇总计算
- `key_catalysts` 和 `key_risks` 根据最新市场情况更新

#### 数据来源

| 来源 | URL |
|------|-----|
| DigitalCoinPrice | `https://digitalcoinprice.com/forecast/bitcoin` |
| CoinCodex | `https://coincodex.com/crypto/bitcoin/price-prediction/` |
| PricePrediction.net | `https://priceprediction.net/en/price-prediction/bitcoin` |
| CryptoNewsZ | `https://www.cryptonewsz.com/forecast/bitcoin-price-prediction/` |
| Standard Chartered, ARK Invest, Galaxy Digital 等 | 研报/公开预测 |

---

### 2.8 文件 8: `data/schema.json` — 参考 Schema（只读）

Agent **不可修改**此文件。此文件是各数据文件的格式参考文档，供人工维护。Agent 在采集数据时应参考此文件确认字段名称和类型。

---

## 第 3 章: 采集调度（按数据类型分频率）

### 3.1 频率分级总览

```
┌─────────────────────────────────────────────────────────────────┐
│  等级 A — 实时级  │  每 6 小时 (4次/天)  │  股价、市值           │
│  等级 B — 高频    │  每 12 小时 (2次/天) │  新闻、社交情绪        │
│  等级 C — 日检    │  每 24 小时 (1次/天) │  SEC 财报、运营、评级   │
│  等级 D — 周检    │  每周 1 次           │  BTC 价格预测          │
│  等级 E — 事件驱动│  年报发布时          │  财务分析模型           │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 每日调度时间表

| 运行 | UTC 时间 | 美东时间 | 执行的频率等级 |
|------|---------|---------|--------------|
| Run 1 | 06:00 | 01:00 EST | A |
| Run 2 | 12:00 | 07:00 EST | A + B |
| Run 3 | 18:00 | 13:00 EST | A + B + C |
| Run 4 | 00:00 | 19:00 EST | A + B + D (周日) + 全量验证 |

### 3.3 等级 A: 股价/市值 — 每日 4 次（Run 1/2/3/4）

**目标**: 保持股价和市值数据尽可能接近实时

**影响文件**: `data/companies.json`, `data/analysis_data.json`

**操作清单**:

```
1. 获取 22 家活跃公司的最新股价和市值
   数据来源: Yahoo Finance / Financial Modeling Prep API / Alpha Vantage
   注意: SDIG 已退市 (active: false)，跳过不采集

2. 更新 data/companies.json:
   - 遍历 companies 数组，跳过 active === false 的公司
   - 更新每家公司的 stock_price 和 market_cap_usd_m
   - 更新 _meta.last_updated 为当天日期

3. 更新 data/analysis_data.json:
   - 遍历 data 对象中每家公司
   - 更新 market.stock_price 和 market.market_cap

4. 执行 JSON 验证（第 5 章）
5. Git 提交并推送（第 6 章）
```

**特殊说明**:
- 美股开盘前 (Run 1) 和收盘后 (Run 4) 的价格为前收盘价或盘后价
- Run 4 的收盘价为当日最终价，是最重要的一次更新
- 周末/节假日美股不交易，价格不变，仍需执行以保持 `last_updated` 时效

### 3.4 等级 B: 新闻 + 社交情绪 — 每日 2 次（Run 2 + Run 4）

**目标**: 捕捉当日新闻动态和社交媒体情绪变化

**影响文件**: `data/news.json`, `data/sentiment.json`

**操作清单**:

```
1. 新闻采集 → data/news.json
   a. 搜索过去 12 小时内 22 家活跃公司的新闻和新闻稿
   b. 搜索 BTC 挖矿行业宏观新闻
   c. 为每条新闻创建记录（分配新 id、分类、情绪标注）
   d. 去重: 检查 title + ticker + published_at 是否已存在
   e. 追加到 data 数组

2. 社交情绪 → data/sentiment.json (social_sentiment)
   a. 采集每家公司的 StockTwits 看涨/看跌比例
   b. 采集 Reddit 24h 提及数
   c. 采集 Twitter/X 24h 提及数
   d. 注意: composite_score 字段前端会自动计算，Agent 无需填写
      前端公式: score = (stocktwits_bullish_pct - 50) / 50
   e. 更新每家公司的 social_sentiment 记录（用当天日期替换）

3. 分析师评级检查 → data/sentiment.json (analyst_ratings)
   a. 检查 TipRanks / MarketBeat 是否有新的分析师评级发布
   b. 如有，追加到 analyst_ratings 数组
```

**新闻采集来源优先级**:
```
1. 公司 IR 页面 — 官方新闻稿（最权威）
2. SEC EDGAR 8-K — 重大事件披露
3. GlobeNewswire / BusinessWire / PRNewswire — 新闻稿分发
4. CoinDesk / The Block — 行业新闻
5. 主流财经媒体 — Bloomberg, Reuters, CNBC
```

### 3.5 等级 C: 财报 + 运营 + 分析师 — 每日 1 次检查（Run 3）

**目标**: 检测 SEC 新提交、月度运营报告、重大分析师变动

**影响文件**: `data/financials.json`, `data/operational.json`, `data/sentiment.json` (analyst_ratings), `data/analysis_data.json`, `data/raw_reports/`

**操作清单**:

```
1. SEC EDGAR 检查 → data/financials.json
   a. 对每家活跃公司查询 SEC EDGAR 是否有新的 10-K/10-Q/20-F/6-K
      URL: https://efts.sec.gov/LATEST/search-index?q={TICKER}&forms=10-K,10-Q,20-F,6-K&dateRange=custom&startdt={YESTERDAY}&enddt={TODAY}
   b. 如有新 filing:
      - 提取三表数据 → 写入 data/raw_reports/{TICKER}/{YEAR}_{PERIOD}.json
      - 同步更新 data/financials.json（追加/更新记录）
      - 如为年报: 同步更新 data/analysis_data.json（更新 current/prior）

2. 月度运营数据检查 → data/operational.json
   a. 检查各公司 IR 页面是否有新的月度生产报告
   b. 如有: 追加/更新 data 数组中的记录
   c. 通常每月 1-7 日有大量更新（上月数据发布密集期）
   d. 每月 8-30 日偶有迟发或更正

3. 分析师评级补充检查 → data/sentiment.json (analyst_ratings)
   a. Run 2 已检查过一次，Run 3 补充检查是否有新发布
   b. 如有，追加到 analyst_ratings 数组
```

**日检数据的特点**:
- 大部分时候检查后**不会有新数据**，这是正常的
- 财报数据集中在每年 1/2/3/4/5/7/8/10/11 月（即每季末后 1-2 月）
- 运营数据集中在每月 1-7 日
- 检查无新数据时不需要 git 提交

### 3.6 等级 D: BTC 价格预测 — 每周 1 次（Run 4，仅周日）

**目标**: 更新各平台和机构的 BTC 价格预测

**影响文件**: `data/btc_price_predictions.json`

**操作清单**:

```
仅在每周日的 Run 4 (00:00 UTC) 执行:

1. 访问各加密预测平台获取最新预测数据
   - DigitalCoinPrice, CoinCodex, PricePrediction.net, CryptoNewsZ 等
2. 更新 crypto_platform_predictions 中已有来源的预测数字
3. 检查 institutional_predictions 是否有新机构预测
4. 重新计算 summary_consensus（各年份高/中/低共识区间）
5. 更新 key_catalysts 和 key_risks（如有重大变化）
6. 更新 _meta.data_collected 日期
```

### 3.7 等级 E: 财务分析模型 — 事件驱动（年报发布时）

**目标**: 年报发布后重算 6 个分析模型

**影响文件**: `data/analysis_data.json` (current/prior 节点)

**触发条件**: 等级 C 检测到某公司的 **年报 (10-K/20-F)** 新发布时自动触发

```
当检测到公司年报发布:
1. 从 raw_reports 提取年度三表数据
2. 将 current 数据移到 prior
3. 用新年度数据填充 current
4. 6 个模型结果在前端自动重算，Agent 只需更新 current/prior 数据
```

### 3.8 各文件 × 运行时段完整矩阵

| 文件 | 频率等级 | Run 1 (06:00) | Run 2 (12:00) | Run 3 (18:00) | Run 4 (00:00) |
|------|:---:|:---:|:---:|:---:|:---:|
| `companies.json` (stock_price/market_cap) | A | ✓ | ✓ | ✓ | ✓ |
| `analysis_data.json` (market) | A | ✓ | ✓ | ✓ | ✓ |
| `news.json` | B | — | ✓ | — | ✓ |
| `sentiment.json` (social) | B | — | ✓ | — | ✓ |
| `sentiment.json` (analyst) | B+C | — | ✓ | ✓ | — |
| `financials.json` | C | — | — | ✓ | — |
| `operational.json` | C | — | — | ✓ | — |
| `analysis_data.json` (current/prior) | E | — | — | 年报时 | — |
| `btc_price_predictions.json` | D | — | — | — | 周日✓ |

### 3.9 各运行预计耗时

| 运行 | 预计耗时 | 说明 |
|------|---------|------|
| Run 1 | 5-10 分钟 | 仅股价，22 家公司批量获取 |
| Run 2 | 15-30 分钟 | 股价 + 新闻搜索 + 情绪采集 |
| Run 3 | 10-40 分钟 | 股价 + SEC 检查 + 运营检查（有新数据时耗时较长） |
| Run 4 | 10-60 分钟 | 股价 + 情绪 + 验证 + BTC 预测（周日时较长） |

---

## 第 4 章: 数据清洗与验证规则

### 4.1 通用规则

| 规则 | 说明 |
|------|------|
| 单位统一 | 所有金额以**百万美元 (millions USD)** 为单位，保留 1 位小数 |
| 千元转百万 | SEC 报表通常以千元为单位，除以 1000 转换 |
| null 处理 | 找不到的数据填 `null`，**绝对不可编造** |
| 负数处理 | 亏损、负现金流等保留为负数，不取绝对值 |
| 股价精度 | 保留 2 位小数 |
| 百分比精度 | YoY 增长率保留 1 位小数 |
| 日期格式 | 一律 `YYYY-MM-DD`（ISO 8601） |
| 时间格式 | 一律 `YYYY-MM-DDTHH:MM:SSZ`（UTC） |
| 月份格式 | operational.json 的 period: `YYYY-MM` |

### 4.2 财务数据交叉验证

每条 financials.json 或 raw_reports 记录写入前检查:

```
1. gross_profit 约等于 revenue - cogs（允许 +-5M 误差）
2. total_assets 约等于 total_liabilities + total_equity（允许 +-5M）
3. free_cash_flow 约等于 operating_cash_flow + capex（capex 为负值）
4. capex 应为负值或零
5. eps_diluted 正负号与 net_income 一致
6. shares_outstanding_m 单位是百万股（非股）
7. revenue_yoy_pct 计算正确: (当期 - 去年同期) / |去年同期| * 100
8. 如 net_income 和去年 net_income 都为负，net_income_yoy_pct 填 null
```

### 4.3 运营数据验证

```
1. btc_mined 应为正整数（通常 10-5000 之间，视公司规模）
2. btc_held 应为正整数
3. hash_rate_eh 应为正数（通常 0.1-60 之间）
4. btc_mined + btc_held_prior - btc_sold 约等于 btc_held（交叉验证）
5. stocktwits_bullish_pct + stocktwits_bearish_pct 应约等于 100
```

### 4.4 新闻数据验证

```
1. id 格式: news_NNNN（数字部分递增，无重复）
2. category 在枚举值列表中
3. sentiment 为 "positive" / "negative" / "neutral"
4. sentiment_score 在 -1.0 到 +1.0 之间
5. published_at 为有效的 ISO 8601 时间戳
6. summary 不超过 500 字符
```

### 4.5 情绪数据验证

```
1. rating_normalized 为 "buy" / "hold" / "sell"
2. action 在枚举值列表中
3. stocktwits_bullish_pct 在 0-100 之间
4. stocktwits_bearish_pct 在 0-100 之间
5. composite_score 在 -1.0 到 +1.0 之间
6. composite_score 应等于 (stocktwits_bullish_pct - 50) / 50
7. trend_direction 为 "up" / "down" / "neutral"
```

### 4.6 BTC 矿企特殊注意事项

1. **BTC 公允价值变动**: 2024 年起 ASC 350 生效，BTC 按公允价值计量，unrealized gain/loss 出现在利润表。Net income 可能因此异常波动，属正常现象。
2. **收入构成**: 矿企收入可能含 Mining / Hosting / Cloud Mining / HPC，全部汇总到 `revenue`。
3. **折旧**: 矿机折旧可能在 COGS 中或单独列示，在 `notes` 中说明。
4. **现金流分类**: BTC 买卖可能归类为经营或投资活动，不同公司处理不同。
5. **已破产/重组**: CORZ 2022 年破产、2024 年重组完成，在 `notes` 中注明。
6. **10-Q 现金流**: 10-Q 中的现金流是年初至今（YTD）累计数。如需单季度数据，需用当季 YTD 减去上季 YTD。

---

## 第 5 章: JSON 验证脚本

**每次提交前必须运行以下全部验证脚本。任何一项失败则禁止提交。**

### 5.1 验证 companies.json

```bash
python3 -c "
import json, sys
d = json.load(open('data/companies.json'))
assert isinstance(d, dict), 'Root must be dict'
assert 'companies' in d, 'Missing companies key'
assert isinstance(d['companies'], list), 'companies must be list'
for c in d['companies']:
    assert 'ticker' in c, f'Missing ticker in company record'
    assert 'name' in c, f'Missing name for {c.get(\"ticker\",\"?\")}'
    assert 'active' in c, f'Missing active for {c[\"ticker\"]}'
tickers = [c['ticker'] for c in d['companies']]
assert len(tickers) == len(set(tickers)), f'Duplicate tickers found'
print(f'companies.json: {len(d[\"companies\"])} companies, schema OK')
sys.exit(0)
"
```

### 5.2 验证 financials.json

```bash
python3 -c "
import json, sys
d = json.load(open('data/financials.json'))
assert isinstance(d, dict), 'Root must be dict'
assert 'data' in d, 'Missing data key'
assert isinstance(d['data'], list), 'data must be list'
seen = set()
for r in d['data']:
    assert 'ticker' in r, 'Missing ticker'
    assert 'fiscal_year' in r, f'Missing fiscal_year for {r[\"ticker\"]}'
    assert 'fiscal_quarter' in r, f'Missing fiscal_quarter for {r[\"ticker\"]}'
    assert r['fiscal_quarter'] in ('Q1','Q2','Q3','Q4','FY'), f'Invalid quarter: {r[\"fiscal_quarter\"]}'
    key = (r['ticker'], r['fiscal_year'], r['fiscal_quarter'])
    assert key not in seen, f'Duplicate record: {key}'
    seen.add(key)
print(f'financials.json: {len(d[\"data\"])} records, schema OK')
sys.exit(0)
"
```

### 5.3 验证 operational.json

```bash
python3 -c "
import json, sys
d = json.load(open('data/operational.json'))
assert isinstance(d, dict), 'Root must be dict'
assert 'data' in d, 'Missing data key'
assert isinstance(d['data'], list), 'data must be list'
seen = set()
for r in d['data']:
    assert 'ticker' in r, 'Missing ticker'
    assert 'period' in r, f'Missing period for {r[\"ticker\"]}'
    key = (r['ticker'], r['period'])
    assert key not in seen, f'Duplicate record: {key}'
    seen.add(key)
print(f'operational.json: {len(d[\"data\"])} records, schema OK')
sys.exit(0)
"
```

### 5.4 验证 news.json

```bash
python3 -c "
import json, sys
d = json.load(open('data/news.json'))
assert isinstance(d, dict), 'Root must be dict'
assert 'data' in d, 'Missing data key'
assert isinstance(d['data'], list), 'data must be list'
ids = set()
cats = {'earnings','operations','expansion','regulatory','market','business','sustainability','treasury','executive','partnership'}
sents = {'positive','negative','neutral'}
for r in d['data']:
    assert 'id' in r, 'Missing id'
    assert r['id'] not in ids, f'Duplicate id: {r[\"id\"]}'
    ids.add(r['id'])
    assert 'title' in r, f'Missing title for {r[\"id\"]}'
    assert 'category' in r, f'Missing category for {r[\"id\"]}'
    assert r['category'] in cats, f'Invalid category: {r[\"category\"]}'
    assert r['sentiment'] in sents, f'Invalid sentiment: {r[\"sentiment\"]}'
print(f'news.json: {len(d[\"data\"])} records, schema OK')
sys.exit(0)
"
```

### 5.5 验证 sentiment.json

```bash
python3 -c "
import json, sys
d = json.load(open('data/sentiment.json'))
assert isinstance(d, dict), 'Root must be dict'
assert 'analyst_ratings' in d, 'Missing analyst_ratings key'
assert 'social_sentiment' in d, 'Missing social_sentiment key'
assert isinstance(d['analyst_ratings'], list), 'analyst_ratings must be list'
assert isinstance(d['social_sentiment'], list), 'social_sentiment must be list'
# 注意: 此文件没有 data 键
valid_ratings = {'buy','hold','sell'}
valid_actions = {'initiate','maintain','upgrade','downgrade','upgrade_target','downgrade_target','reiterate'}
for r in d['analyst_ratings']:
    assert 'ticker' in r, 'Missing ticker in analyst rating'
    assert r['rating_normalized'] in valid_ratings, f'Invalid rating: {r[\"rating_normalized\"]}'
    assert r['action'] in valid_actions, f'Invalid action: {r[\"action\"]}'
for s in d['social_sentiment']:
    assert 'ticker' in s, 'Missing ticker in social sentiment'
    assert 'date' in s, f'Missing date for {s[\"ticker\"]}'
    bp = s.get('stocktwits_bullish_pct')
    if bp is not None:
        assert 0 <= bp <= 100, f'bullish_pct out of range: {bp}'
print(f'sentiment.json: {len(d[\"analyst_ratings\"])} ratings, {len(d[\"social_sentiment\"])} social, schema OK')
sys.exit(0)
"
```

### 5.6 验证 analysis_data.json

```bash
python3 -c "
import json, sys
d = json.load(open('data/analysis_data.json'))
assert isinstance(d, dict), 'Root must be dict'
assert 'data' in d, 'Missing data key'
assert isinstance(d['data'], dict), 'data must be dict (not list)'
for ticker, info in d['data'].items():
    assert 'current' in info, f'{ticker} missing current'
    assert 'prior' in info, f'{ticker} missing prior'
    assert 'market' in info, f'{ticker} missing market'
    assert 'revenue' in info['current'], f'{ticker} current missing revenue'
    assert 'revenue' in info['prior'], f'{ticker} prior missing revenue'
print(f'analysis_data.json: {len(d[\"data\"])} companies, schema OK')
sys.exit(0)
"
```

### 5.7 验证 btc_price_predictions.json

```bash
python3 -c "
import json, sys
d = json.load(open('data/btc_price_predictions.json'))
assert isinstance(d, dict), 'Root must be dict'
required = ['crypto_platform_predictions', 'institutional_predictions', 'summary_consensus', 'key_catalysts', 'key_risks']
for k in required:
    assert k in d, f'Missing required key: {k}'
assert isinstance(d['crypto_platform_predictions'], list), 'crypto_platform_predictions must be list'
assert isinstance(d['institutional_predictions'], list), 'institutional_predictions must be list'
assert isinstance(d['summary_consensus'], dict), 'summary_consensus must be dict'
assert isinstance(d['key_catalysts'], list), 'key_catalysts must be list'
assert isinstance(d['key_risks'], list), 'key_risks must be list'
print(f'btc_price_predictions.json: {len(d[\"crypto_platform_predictions\"])} crypto + {len(d[\"institutional_predictions\"])} institutional predictions, schema OK')
sys.exit(0)
"
```

### 5.8 验证未修改非 data/ 文件

```bash
python3 -c "
import subprocess, sys
result = subprocess.run(['git', 'diff', '--name-only', 'HEAD'], capture_output=True, text=True)
changed = [f for f in result.stdout.strip().split('\n') if f and not f.startswith('data/')]
if changed:
    print(f'ERROR: Modified files outside data/: {changed}')
    sys.exit(1)
# 同时检查未跟踪文件
result2 = subprocess.run(['git', 'ls-files', '--others', '--exclude-standard'], capture_output=True, text=True)
untracked = [f for f in result2.stdout.strip().split('\n') if f and not f.startswith('data/')]
if untracked:
    print(f'ERROR: Untracked files outside data/: {untracked}')
    sys.exit(1)
print('No files outside data/ modified or created.')
sys.exit(0)
"
```

### 5.9 一键运行全部验证

```bash
python3 -c "
import json, subprocess, sys

errors = []

# 1. companies.json
try:
    d = json.load(open('data/companies.json'))
    assert 'companies' in d and isinstance(d['companies'], list)
    tickers = [c['ticker'] for c in d['companies']]
    assert len(tickers) == len(set(tickers))
    print(f'  companies.json: {len(d[\"companies\"])} companies OK')
except Exception as e:
    errors.append(f'companies.json: {e}')

# 2. financials.json
try:
    d = json.load(open('data/financials.json'))
    assert 'data' in d and isinstance(d['data'], list)
    print(f'  financials.json: {len(d[\"data\"])} records OK')
except Exception as e:
    errors.append(f'financials.json: {e}')

# 3. operational.json
try:
    d = json.load(open('data/operational.json'))
    assert 'data' in d and isinstance(d['data'], list)
    print(f'  operational.json: {len(d[\"data\"])} records OK')
except Exception as e:
    errors.append(f'operational.json: {e}')

# 4. news.json
try:
    d = json.load(open('data/news.json'))
    assert 'data' in d and isinstance(d['data'], list)
    print(f'  news.json: {len(d[\"data\"])} records OK')
except Exception as e:
    errors.append(f'news.json: {e}')

# 5. sentiment.json
try:
    d = json.load(open('data/sentiment.json'))
    assert 'analyst_ratings' in d and isinstance(d['analyst_ratings'], list)
    assert 'social_sentiment' in d and isinstance(d['social_sentiment'], list)
    assert 'data' not in d or True  # data key should not exist, but don't fail if present
    print(f'  sentiment.json: {len(d[\"analyst_ratings\"])} ratings + {len(d[\"social_sentiment\"])} social OK')
except Exception as e:
    errors.append(f'sentiment.json: {e}')

# 6. analysis_data.json
try:
    d = json.load(open('data/analysis_data.json'))
    assert 'data' in d and isinstance(d['data'], dict)
    print(f'  analysis_data.json: {len(d[\"data\"])} companies OK')
except Exception as e:
    errors.append(f'analysis_data.json: {e}')

# 7. btc_price_predictions.json
try:
    d = json.load(open('data/btc_price_predictions.json'))
    for k in ['crypto_platform_predictions','institutional_predictions','summary_consensus','key_catalysts','key_risks']:
        assert k in d, f'Missing {k}'
    print(f'  btc_price_predictions.json OK')
except Exception as e:
    errors.append(f'btc_price_predictions.json: {e}')

# 8. 检查非 data/ 文件
result = subprocess.run(['git', 'diff', '--name-only', 'HEAD'], capture_output=True, text=True)
changed = [f for f in result.stdout.strip().split('\n') if f and not f.startswith('data/')]
if changed:
    errors.append(f'Modified files outside data/: {changed}')
else:
    print('  No files outside data/ modified')

# 结果
if errors:
    print(f'\nFAILED - {len(errors)} error(s):')
    for e in errors:
        print(f'  ERROR: {e}')
    sys.exit(1)
else:
    print(f'\nALL VALIDATIONS PASSED')
    sys.exit(0)
"
```

---

## 第 6 章: Git 提交与部署工作流

### 6.1 提交步骤（每次 Run 执行后）

**第一步: 确认在 main 分支**
```bash
git branch --show-current
# 输出必须是 "main"。如果不是，立即停止。
```

**第二步: 仅 stage data/ 目录文件**
```bash
# 按需 stage 修改过的具体文件
git add data/companies.json
git add data/financials.json
git add data/operational.json
git add data/news.json
git add data/sentiment.json
git add data/analysis_data.json
git add data/btc_price_predictions.json

# 如果有新的 raw_reports:
git add data/raw_reports/

# 绝对禁止:
# git add .
# git add -A
# git add --all
```

**第三步: 运行全部验证**
```bash
# 运行第 5.9 节的一键验证脚本
# 必须输出 "ALL VALIDATIONS PASSED"
# 如有任何 ERROR，立即停止，修复后重新验证
```

**第四步: 确认只 stage 了 data/ 文件**
```bash
git diff --cached --name-only | grep -v '^data/' && echo "ERROR: staged non-data files!" && exit 1
echo "Only data/ files staged - safe to commit"
```

**第五步: 提交**
```bash
git commit -m "data: Run N daily update - {简要描述修改内容}"
# 示例:
# "data: Run 1 daily update - stock prices for 23 companies"
# "data: Run 2 daily update - 3 news articles, social sentiment for 23 tickers"
# "data: Run 3 daily update - MARA Q4 2024 financial data from 10-K"
```

**第六步: 推送到 main**
```bash
git push origin main
```

**第七步: 同步部署分支（关键！）**

> 这一步是**强制性**的。btcmine.info 通过 GitHub Pages 部署分支 `claude/btc-mining-finance-site-HmJzR`。如果不执行此步，推送到 `main` 的变更**不会**出现在网站上。

```bash
git checkout claude/btc-mining-finance-site-HmJzR
git reset --hard main
git push --force origin claude/btc-mining-finance-site-HmJzR
git checkout main
```

**第八步: 验证部署**
```bash
# 等待 1-3 分钟让 GitHub Pages 部署完成

# 验证网站可访问
curl -s -o /dev/null -w "%{http_code}" https://btcmine.info
# 应返回 200

# 验证数据文件可访问
curl -s https://btcmine.info/data/companies.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'companies: {len(d[\"companies\"])} OK')"
curl -s https://btcmine.info/data/financials.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'financials: {len(d[\"data\"])} OK')"
```

### 6.2 提交消息格式

```
data: Run {N} daily update - {变更摘要}
data({TICKER}): add {PERIOD} financial data from {SOURCE}
data: weekly BTC price predictions update
data: {N} new news articles, social sentiment update
```

### 6.3 回滚流程

如果推送后网站出现异常:

```bash
# 方法 1: revert 最近一次提交
git revert HEAD --no-edit
git push origin main

# 同步部署分支
git checkout claude/btc-mining-finance-site-HmJzR
git reset --hard main
git push --force origin claude/btc-mining-finance-site-HmJzR
git checkout main

# 方法 2: 如果多次提交有问题，回退到已知好的 commit
git log --oneline -10   # 找到好的 commit hash
git revert HEAD~N..HEAD --no-edit   # revert 最近 N 个 commit
git push origin main

# 同步部署分支（同上）
```

### 6.4 故障排查

如果网站出错，按以下顺序检查:

```
1. 所有 JSON 文件是否为合法 JSON:
   python3 -c "import json; json.load(open('data/companies.json'))"
   python3 -c "import json; json.load(open('data/financials.json'))"
   python3 -c "import json; json.load(open('data/operational.json'))"
   python3 -c "import json; json.load(open('data/news.json'))"
   python3 -c "import json; json.load(open('data/sentiment.json'))"
   python3 -c "import json; json.load(open('data/analysis_data.json'))"
   python3 -c "import json; json.load(open('data/btc_price_predictions.json'))"

2. JSON 结构是否被改变（顶层键名是否正确）

3. 是否意外修改了 data/ 以外的文件:
   git diff --name-only HEAD~1 HEAD | grep -v '^data/'

4. 部署分支是否已同步:
   git log --oneline -1 main
   git log --oneline -1 origin/claude/btc-mining-finance-site-HmJzR
   # 两者应指向同一 commit
```

---

## 第 7 章: 采集报告格式

每次采集完成后，Agent 应输出以下格式的报告:

```markdown
## 采集报告 - {DATE} Run {N} ({TIME} UTC)

### 更新的文件
| 文件 | 操作 | 记录数变化 |
|------|------|-----------|
| data/companies.json | 更新 stock_price/market_cap | 22 家活跃公司 |
| data/news.json | 新增 3 条新闻 | 总计 28 条 |
| data/sentiment.json | 更新 social_sentiment | 23 条 |

### 新采集数据明细
| Ticker | 数据类型 | 周期 | 来源 | 关键指标 |
|--------|---------|------|------|---------|
| MARA | 财务 | Q4 2024 | 10-K | Revenue: $264.3M, NI: -$124.8M |
| RIOT | 运营 | 2025-01 | IR | 527 BTC mined, 18,692 BTC held |

### 数据验证结果
- companies.json: 23 companies OK
- financials.json: 45 records OK
- operational.json: 38 records OK
- news.json: 28 records OK
- sentiment.json: 15 ratings + 23 social OK
- analysis_data.json: 12 companies OK
- btc_price_predictions.json: OK
- Non-data files: none modified

### Git 操作
- Branch: main
- Commit: abc1234
- Push: success
- Deploy branch sync: success
- Site verification: 200 OK
```

---

## 第 8 章: 原始财报存档（data/raw_reports/）

### 8.1 文件位置和命名

```
data/raw_reports/{TICKER}/{YEAR}_{PERIOD}.json
```

- `{TICKER}` — 股票代码，大写
- `{YEAR}` — 年份
- `{PERIOD}` — `FY` / `Q1` / `Q2` / `Q3` / `Q4` / `H1` / `H2`

### 8.2 JSON Schema

```json
{
  "ticker": "FUFU",
  "company_name": "BitFuFu Inc.",
  "period": "2024_FY",
  "period_type": "annual",
  "period_end_date": "2024-12-31",
  "currency": "USD",
  "unit": "millions",
  "source": "SEC 20-F (filed 2025-04-21)",
  "collected_date": "2026-02-26",
  "notes": "",
  "income_statement": {
    "revenue": 463.3,
    "cogs": 433.6,
    "gross_profit": 29.7,
    "sga": 32.7,
    "depreciation": 24.7,
    "operating_income": 58.9,
    "net_income": 54.0,
    "ebit": 58.9,
    "eps_diluted": 0.34
  },
  "balance_sheet": {
    "total_assets": 377.7,
    "current_assets": 265.3,
    "cash_and_equivalents": 45.1,
    "receivables": 10.9,
    "ppe_net": 56.0,
    "total_liabilities": 215.2,
    "current_liabilities": 63.4,
    "long_term_debt": 35.0,
    "retained_earnings": 78.2,
    "total_equity": 162.5,
    "shares_outstanding_m": 163.1
  },
  "cash_flow_statement": {
    "operating_cash_flow": -219.9,
    "investing_cash_flow": 167.9,
    "financing_cash_flow": 65.1,
    "capex": -16.9,
    "free_cash_flow": -236.7
  },
  "market_data": {
    "stock_price": 2.66,
    "market_cap": 434.0,
    "btc_held": 1720
  }
}
```

### 8.3 raw_reports 与页面数据文件的关系

raw_reports 是原始存档，**网页不直接读取**。采集完 raw_reports 后，必须同步更新:

1. `data/financials.json` — 每个报告周期同步一条记录
2. `data/analysis_data.json` — 仅年报(FY)时更新 current/prior

**字段映射（raw_reports -> financials.json）**:

| raw_reports 字段 | financials.json 字段 |
|-----------------|---------------------|
| period 中的年份 | `fiscal_year` |
| period 中的类型 | `fiscal_quarter` |
| — | `period_label`（格式: `"Q4 2024"` / `"FY 2024"`） |
| `period_end_date` | `period_end_date` |
| — | `report_date`（财报发布日期，需额外查找） |
| — | `is_reported`（已发布: `true`） |
| `income_statement.revenue` | `revenue_usd_m` |
| `income_statement.gross_profit` | `gross_profit_usd_m` |
| `income_statement.operating_income` | `operating_income_usd_m` |
| `income_statement.net_income` | `net_income_usd_m` |
| — | `adjusted_ebitda_usd_m`（需从财报或 PR 中单独获取） |
| `income_statement.eps_diluted` | `eps_diluted` |
| `balance_sheet.shares_outstanding_m` | `shares_outstanding_m` |
| `balance_sheet.cash_and_equivalents` | `cash_and_equivalents_usd_m` |
| `balance_sheet.long_term_debt` | `total_debt_usd_m` |
| `market_data.btc_held` | `btc_held` |

---

## 第 9 章: 特殊情况处理 FAQ

### Q: 有些公司可能已退市或数据很少怎么办？
A: 在 `notes` 中说明情况，尽量填充能找到的数据。`active` 字段标记为 `false` 的公司不会显示在前端。

### Q: 外国私人发行人（20-F）与 10-K 有什么区别？
A: 20-F 通常在财年结束后 4 个月内提交（vs 10-K 的 60-90 天），季度用 6-K 而非 10-Q。FUFU、BTDR、IREN、SAIH 使用 20-F/6-K。

### Q: 如果公司改了财年截止日怎么办？
A: 在 `notes` 中说明，`period_end_date` 填写实际截止日期。

### Q: BTC 公允价值变动导致 net_income 异常大怎么办？
A: 正常填入。在 `notes` 中注明包含 unrealized gain/loss on digital assets。

### Q: 10-Q 中的现金流是 YTD 累计的怎么办？
A: 优先填写单季度数据（当季 YTD - 上季 YTD）。如无法计算，填 YTD 数据并在 notes 标注 "YTD cumulative"。

### Q: Press Release 和 SEC filing 数据不一致怎么办？
A: 优先使用 SEC filing（已审计/已审阅），Press Release 数据标注为 "unaudited"。

### Q: 某个数据源暂时不可用怎么办？
A: 跳过该来源，使用备选来源。在 commit message 中注明。不要因为一个来源不可用就跳过整个 Run。

### Q: companies.json 中发现公司信息有误（如名称、交易所）怎么办？
A: Agent 不可修改这些字段。在采集报告中标注发现的问题，等待人工修正。

### Q: stocktwits_bullish_pct 采集不到怎么办？
A: 填 `null`。`composite_score` 也填 `null`。前端会优雅处理 null 值。

### Q: 如何处理同一家公司在不同交易所的股价？
A: 使用 `companies.json` 中记录的 `exchange` 字段对应的交易所股价。

---

## 附录 A: 公司详细信息速查（22 家活跃 + 1 家退市）

| # | Ticker | 公司名称 | 交易所 | SEC Filing | 财年截止月 | IR URL | 状态 |
|---|--------|---------|--------|-----------|----------|--------|------|
| 1 | FUFU | BitFuFu Inc. | NASDAQ | 20-F / 6-K | 12月 | ir.bitfufu.com | 活跃 |
| 2 | MARA | Marathon Digital Holdings | NASDAQ | 10-K / 10-Q | 12月 | ir.mara.com | 活跃 |
| 3 | RIOT | Riot Platforms | NASDAQ | 10-K / 10-Q | 12月 | ir.riotplatforms.com | 活跃 |
| 4 | CLSK | CleanSpark | NASDAQ | 10-K / 10-Q | **9月** | ir.cleanspark.com | 活跃 |
| 5 | CORZ | Core Scientific | NASDAQ | 10-K / 10-Q | 12月 | investors.corescientific.com | 活跃 |
| 6 | CIFR | Cipher Mining | NASDAQ | 10-K / 10-Q | 12月 | ir.ciphermining.com | 活跃 |
| 7 | HUT | Hut 8 Corp | NASDAQ | 10-K / 10-Q | 12月 | hut8.com/investors | 活跃 |
| 8 | WULF | TeraWulf | NASDAQ | 10-K / 10-Q | 12月 | terawulf.com/investors | 活跃 |
| 9 | IREN | Iris Energy | NASDAQ | 20-F / 6-K | **6月** | irisenergy.co/investors | 活跃 |
| 10 | BITF | Bitfarms | NASDAQ | 10-K / 10-Q | 12月 | bitfarms.com/investors | 活跃 |
| 11 | BTBT | Bit Digital | NASDAQ | 10-K / 10-Q | 12月 | ir.bit-digital.com | 活跃 |
| 12 | BTDR | Bitdeer Technologies | NASDAQ | 20-F / 6-K | 12月 | ir.bitdeer.com | 活跃 |
| 13 | APLD | Applied Digital | NASDAQ | 10-K / 10-Q | **5月** | ir.applieddigital.com | 活跃 |
| 14 | HIVE | HIVE Digital Technologies | NASDAQ | 10-K / 10-Q | **3月** | hivedigitaltechnologies.com/investors | 活跃 |
| 15 | GREE | Greenidge Generation | NASDAQ | 10-K / 10-Q | 12月 | ir.greenidge.com | 活跃 |
| 16 | ABTC | American Bitcoin | NASDAQ | 10-K / 10-Q | 12月 | — | 活跃 |
| 17 | ANY | Sphere 3D | NASDAQ | 10-K / 10-Q | 12月 | sphere3d.com/investors | 活跃 |
| 18 | SLNH | Soluna Holdings | NASDAQ | 10-K / 10-Q | 12月 | solunacomputing.com/investors | 活跃 |
| 19 | GPUS | Hyperscale Data (原 Ault Alliance) | NYSE American | 10-K / 10-Q | 12月 | hyperscaledata.com/investors | 活跃 |
| 20 | DGXX | Digi Power X (原 Digihost) | NASDAQ | 10-K / 10-Q | 12月 | investors.digipowerx.com | 活跃 |
| 21 | MIGI | Mawson Infrastructure | NASDAQ | 10-K / 10-Q | **6月** | mawsoninc.com/investors | 活跃 |
| 22 | SAIH | SAIHEAT (原 SAI.TECH) | NASDAQ | 20-F / 6-K | **6月** | ir.saiheat.com | 活跃 |
| — | ~~SDIG~~ | ~~Stronghold Digital Mining~~ | — | — | — | — | **退市** (2025-03 并入 BITF) |

**Ticker 变更历史** (Agent 在数据文件中遇到旧 ticker 时需注意):
- `AULT` → `GPUS` (2024-09)
- `DGHI` → `DGXX` (2025-03)
- `SAI` → `SAIH` (2024-09)
- `SDIG` → 已退市，并入 `BITF` (2025-03)

---

## 附录 B: 数据来源 URL 汇总

### 市场数据（股价/市值）— 每日 4 次

```
Yahoo Finance:        https://finance.yahoo.com/quote/{TICKER}
Google Finance:       https://www.google.com/finance/quote/{TICKER}:NASDAQ
FMP API:              https://financialmodelingprep.com/api/v3/quote/{TICKER}?apikey={KEY}
Alpha Vantage:        https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={TICKER}&apikey={KEY}
```

### SEC 文件— Run 3

```
EDGAR 公司搜索:       https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={TICKER}&type=10-K&dateb=&owner=include&count=10
EDGAR 全文搜索:       https://efts.sec.gov/LATEST/search-index?q={TICKER}&forms=10-K,10-Q,20-F,6-K
EDGAR RSS (新filing): https://efts.sec.gov/LATEST/search-index?q={TICKER}&forms=10-K,10-Q,20-F,6-K&dateRange=custom&startdt={YESTERDAY}&enddt={TODAY}
```

### 财务数据平台 — Run 3

```
Stock Analysis:       https://stockanalysis.com/stocks/{TICKER}/financials/?p=quarterly
Yahoo Finance:        https://finance.yahoo.com/quote/{TICKER}/financials
Macrotrends:          https://www.macrotrends.net/stocks/charts/{TICKER}/
```

### 新闻 — Run 2 + Run 3

```
GlobeNewswire:        https://www.globenewswire.com/search?keyword={TICKER}
BusinessWire:         https://www.businesswire.com/portal/site/home/
CoinDesk Mining:      https://www.coindesk.com/tag/mining/
The Block Mining:     https://www.theblock.co/category/mining
SEC 8-K:              https://efts.sec.gov/LATEST/search-index?q={TICKER}&forms=8-K
```

### 情绪数据 — Run 2

```
StockTwits:           https://stocktwits.com/symbol/{TICKER}
TipRanks:             https://www.tipranks.com/stocks/{TICKER}/forecast
MarketBeat:           https://www.marketbeat.com/stocks/NASDAQ/{TICKER}/forecast/
AltIndex:             https://altindex.com/stock/{TICKER}
Reddit:               搜索 r/CryptoCurrency + r/BitcoinMining
Twitter/X:            搜索 ${TICKER} bitcoin mining
```

### BTC 价格预测 — Run 4（周更）

```
DigitalCoinPrice:     https://digitalcoinprice.com/forecast/bitcoin
CoinCodex:            https://coincodex.com/crypto/bitcoin/price-prediction/
PricePrediction.net:  https://priceprediction.net/en/price-prediction/bitcoin
CryptoNewsZ:          https://www.cryptonewsz.com/forecast/bitcoin-price-prediction/
```

### 运营数据 — Run 3

```
公司 IR 页面:          各公司 ir_url（见附录 A）
The Miner Mag:        https://www.theminermag.com/
Hashrate Index:       https://hashrateindex.com/
```

---

## 附录 C: 快速参考卡片

**Agent 每次运行前必读**:

```
=== 安全检查 ===
[ ] 我在 main 分支上
[ ] 我只会修改 data/ 目录下的文件
[ ] 我不会使用 git add . 或 git add -A
[ ] 我不会修改任何 JSON 文件的顶层结构
[ ] 我不会编造数据

=== 文件结构速记 ===
companies.json     → { _meta, companies: [...] }     ← 注意: 是 companies 不是 data
financials.json    → { _meta, data: [...] }           ← data 是数组
operational.json   → { _meta, data: [...] }           ← data 是数组
news.json          → { _meta, data: [...] }           ← data 是数组
sentiment.json     → { _meta, analyst_ratings: [...], social_sentiment: [...] } ← 无 data 键
analysis_data.json → { data: {...} }                  ← data 是对象。禁止添加 _meta
btc_predictions.json → { _meta, crypto_platform_predictions, institutional_predictions, summary_consensus, key_catalysts, key_risks } ← 无 data 包装

=== 提交后必做 ===
[ ] git push origin main
[ ] git checkout claude/btc-mining-finance-site-HmJzR
[ ] git reset --hard main
[ ] git push --force origin claude/btc-mining-finance-site-HmJzR
[ ] git checkout main
[ ] curl https://btcmine.info 验证 200 OK
```
