# BTC Mining Intelligence Platform

> **Live Site: [btcmine.info](https://btcmine.info)**

A comprehensive analytics platform tracking US-listed Bitcoin mining companies.

[中文版](#中文版)

---

## For Data Agents (OpenClaw)

This section is the primary instruction set for automated data agents.

### Core Principle: Collect Only What's Missing

**DO NOT re-collect data that already exists.** Before any collection task:

1. Read the target JSON file in `/data/`
2. Identify what records are already present (check tickers, dates, periods)
3. Only collect and fill in **gaps** — missing companies, missing quarters, missing months, null fields in existing records

### Data Categories

All data lives in `/data/*.json`. See `data/schema.json` for exact field definitions.

#### Category A: Company Profiles (`companies.json`)

Basic company information: ticker, name, exchange, market cap, stock price, IR URLs.

**When to update:** New company IPO/listing, delisting, merger, or significant corporate change.

**Sources:**
- SEC EDGAR (CIK lookup, company filings)
- Yahoo Finance / Google Finance (stock price, market cap)
- Company IR websites (official profiles)

#### Category B: Quarterly Financials (`financials.json`)

Earnings data: revenue, net income, Adj. EBITDA, EPS, cash, BTC holdings, debt.

**When to update:** After each earnings release (10-Q / 10-K filing).

**Priority fields:** `revenue_usd_m` > `net_income_usd_m` > `adjusted_ebitda_usd_m` > everything else.

**Sources (try in order):**
1. Company IR page → earnings press release (fastest, usually same day)
2. SEC EDGAR → 10-Q / 10-K filing (authoritative, may lag 1-2 days)
3. Financial data APIs (Yahoo Finance, Macrotrends, Wisesheets)
4. Earnings call transcripts (for guidance, commentary, non-GAAP reconciliation)

#### Category C: Monthly Operations (`operational.json`)

Production reports: BTC mined, BTC held, hashrate, installed capacity, power cost, fleet efficiency.

**When to update:** After each monthly production report (companies typically release first week of following month).

**Sources (try in order):**
1. Company IR page → monthly production/operations update
2. GlobeNewswire / BusinessWire / PRNewswire (press release aggregators)
3. SEC Form 8-K (some companies file 8-K for monthly updates)
4. Mining pool data / on-chain analysis (for cross-validation)

#### Category D: News & Events (`news.json`)

Industry news, company announcements, regulatory changes, market events.

**Sources:**
- Company press releases (IR pages, PR wire services)
- Crypto media (CoinDesk, The Block, Bitcoin Magazine)
- Financial media (Bloomberg, Reuters, CNBC)
- SEC filings (material events)
- Social media trending topics

#### Category E: Market Sentiment (`sentiment.json`)

Two sub-categories:

**Analyst Ratings** — investment bank ratings, price targets, upgrades/downgrades.
- Sources: Research note summaries, TipRanks, MarketBeat, Benzinga, Seeking Alpha

**Social Sentiment** — community sentiment metrics.
- Sources: StockTwits API, Reddit (r/bitcoin, r/CryptoMining), Twitter/X search

#### Category F: BTC Price Predictions (`btc_price_predictions.json`)

Forecasts from crypto platforms and Wall Street / research institutions.

**Sources:**
- Crypto forecast platforms (DigitalCoinPrice, CoinPedia, Changelly, PricePrediction.net, etc.)
- Institutional research (ARK, JPMorgan, Goldman Sachs, Bernstein, Standard Chartered, etc.)
- Academic/quantitative models (Stock-to-Flow, on-chain metrics)

#### Category G: Financial Analysis (`analysis_data.json`)

Balance sheet and cash flow data for quantitative models (Altman Z-score, KMV, Beneish M-score, Piotroski F-score, Jones Model, Monte Carlo).

**Sources:**
- SEC EDGAR (10-K annual reports — balance sheet, income statement, cash flow statement)
- Same as Category B sources

### Data Collection Strategy

When tasked with data collection, follow this workflow:

```
1. READ existing data files → understand current coverage
2. IDENTIFY gaps:
   - Companies with no data or stale data
   - Missing quarters/months
   - Null fields that should have values
3. PRIORITIZE:
   - Priority companies first: MARA, RIOT, CLSK, CORZ, HUT
   - Then secondary: WULF, IREN, CIFR, APLD, BITF, BTBT, etc.
4. COLLECT from sources (try multiple channels if first fails)
5. VALIDATE data makes sense (no obvious errors, units correct)
6. COMMIT changes to /data/*.json files
```

### How to Publish Data (Auto-Deploy)

When the agent finishes collecting data, it should:

1. Modify only files in `/data/` directory
2. Commit with a descriptive message (e.g., `Update MARA Q4 2024 financials`)
3. Create a Pull Request targeting `main` branch

**The PR will be automatically merged and deployed** — no manual intervention needed. A GitHub Action validates that the PR only touches `data/` files and auto-merges it. GitHub Pages then re-deploys within ~60 seconds.

If the agent has direct push access to `main`, it can also push directly — the deploy workflow triggers on any push to `main`.

---

## Tech Stack

- Static website (HTML + CSS + JavaScript)
- Chart.js for data visualization
- Data via local JSON files (`/data/`)
- GitHub Pages + GitHub Actions auto-deployment
- Live BTC price via mempool.space API

## Covered Companies

**Priority:** MARA · RIOT · CLSK · CORZ · HUT

**Secondary:** WULF · IREN · CIFR · APLD · BITF · BTBT · DGXX · GPUS · SAIH and others

---

<a name="中文版"></a>
# 中文版

> **网站访问：[btcmine.info](https://btcmine.info)**

美国上市比特币矿商财务数据追踪平台。

---

## 数据采集指南（OpenClaw Agent 专用）

### 核心原则：只采集缺失的数据

**已有的数据不要重复采集。** 每次执行采集任务前：

1. 先读取 `/data/` 目录下的目标 JSON 文件
2. 确认哪些记录已经存在（按 ticker、日期、季度核对）
3. 只采集和补充**缺口**——缺失的公司、缺失的季度/月份、已有记录中为 null 的字段

### 数据分类

所有数据存放于 `/data/*.json`，详细字段定义见 `data/schema.json`。

#### A 类：公司档案（`companies.json`）

公司基本信息：代码、名称、交易所、市值、股价、投资者关系网址。

**何时更新：** 新公司 IPO/上市、退市、合并、重大公司变更。

**数据来源：**
- SEC EDGAR（CIK 查询、公司文件）
- Yahoo Finance / Google Finance（股价、市值）
- 公司 IR 网站（官方资料）

#### B 类：季度财务（`financials.json`）

财报数据：营收、净利润、Adj. EBITDA、EPS、现金、BTC 持仓、负债。

**何时更新：** 每次财报发布后（10-Q / 10-K）。

**优先字段：** `revenue_usd_m` > `net_income_usd_m` > `adjusted_ebitda_usd_m` > 其他。

**数据来源（按优先级）：**
1. 公司 IR 页面 → 财报新闻稿（最快，通常当天）
2. SEC EDGAR → 10-Q / 10-K 文件（权威，可能滞后 1-2 天）
3. 金融数据 API（Yahoo Finance、Macrotrends、Wisesheets）
4. 财报电话会议记录（获取业绩指引、非 GAAP 调整明细）

#### C 类：月度运营（`operational.json`）

月度产量报告：BTC 产量、BTC 持仓、算力、装机容量、电力成本、机队效率。

**何时更新：** 每月产量报告发布后（公司通常在次月第一周发布）。

**数据来源（按优先级）：**
1. 公司 IR 页面 → 月度运营/产量报告
2. GlobeNewswire / BusinessWire / PRNewswire（新闻稿聚合）
3. SEC Form 8-K（部分公司通过 8-K 披露月度数据）
4. 矿池数据 / 链上分析（用于交叉验证）

#### D 类：新闻动态（`news.json`）

行业新闻、公司公告、监管变化、市场事件。

**数据来源：**
- 公司新闻稿（IR 页面、PR 通讯社）
- 加密媒体（CoinDesk、The Block、Bitcoin Magazine）
- 财经媒体（Bloomberg、Reuters、CNBC）
- SEC 备案文件（重大事件）
- 社交媒体热点话题

#### E 类：市场情绪（`sentiment.json`）

**机构评级** — 投行评级、目标价、升降级。
- 来源：研报摘要、TipRanks、MarketBeat、Benzinga、Seeking Alpha

**社交情绪** — 社区情绪指标。
- 来源：StockTwits API、Reddit（r/bitcoin、r/CryptoMining）、Twitter/X

#### F 类：BTC 价格预测（`btc_price_predictions.json`）

加密平台和华尔街/研究机构的预测。

**数据来源：**
- 加密预测平台（DigitalCoinPrice、CoinPedia、Changelly、PricePrediction.net 等）
- 机构研报（ARK、JPMorgan、Goldman Sachs、Bernstein、Standard Chartered 等）
- 量化模型（Stock-to-Flow、链上指标）

#### G 类：财务分析（`analysis_data.json`）

资产负债表和现金流数据，用于量化模型（Altman Z-score、KMV、Beneish M-score、Piotroski F-score、Jones Model、Monte Carlo）。

**数据来源：**
- SEC EDGAR（10-K 年报 — 资产负债表、利润表、现金流量表）
- 同 B 类数据来源

### 数据采集流程

```
1. 读取现有数据文件 → 了解当前覆盖范围
2. 识别缺口：
   - 没有数据或数据过时的公司
   - 缺失的季度/月份
   - 已有记录中应该有值但为 null 的字段
3. 优先级排序：
   - 重点公司优先：MARA, RIOT, CLSK, CORZ, HUT
   - 然后：WULF, IREN, CIFR, APLD, BITF, BTBT 等
4. 从数据来源采集（第一个来源失败就换其他渠道）
5. 验证数据合理性（无明显错误、单位正确）
6. 提交变更到 /data/*.json 文件
```

### 数据发布方式（自动部署）

Agent 采集完数据后：

1. 只修改 `/data/` 目录下的文件
2. 提交并附描述性信息（如 `Update MARA Q4 2024 financials`）
3. 创建指向 `main` 分支的 Pull Request

**PR 会自动合并并部署** — 无需人工干预。GitHub Action 会验证 PR 仅修改了 `data/` 文件，然后自动合并。GitHub Pages 随后在约 60 秒内重新部署。

如果 agent 有 `main` 分支的直接推送权限，也可以直接 push — 部署工作流在任何 push 到 `main` 时自动触发。

---

## 技术栈

- 纯静态网站（HTML + CSS + JavaScript）
- Chart.js（图表可视化）
- 数据通过本地 JSON 文件管理（`/data/`）
- GitHub Pages + GitHub Actions 自动部署
- 实时 BTC 价格（mempool.space API）

## 覆盖公司

**重点：** MARA · RIOT · CLSK · CORZ · HUT

**其他：** WULF · IREN · CIFR · APLD · BITF · BTBT · DGXX · GPUS · SAIH 等
