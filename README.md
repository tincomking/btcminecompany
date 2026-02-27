# BTC Mining Intelligence Platform

[![Live Site](https://img.shields.io/badge/Live-btcmine.info-blue?style=flat-square)](https://btcmine.info)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-222?style=flat-square&logo=github)](https://btcmine.info)
[![Companies](https://img.shields.io/badge/Companies-22-orange?style=flat-square)]()
[![Data](https://img.shields.io/badge/Records-535+-green?style=flat-square)]()

A comprehensive, open-source analytics dashboard for tracking **22 US-listed Bitcoin mining companies** — covering financials, operations, market sentiment, quantitative analysis, and BTC price predictions.

**[English](#features)** | **[中文](#中文版)**

---

## Features

### Data Dashboard (7 Tabs)

| Tab | Description |
|-----|-------------|
| **Overview** | Real-time BTC price & network difficulty, company grid cards with key metrics, earnings calendar |
| **Financials** | Quarterly earnings (revenue, net income, EBITDA, EPS), YoY comparisons, interactive detail modal, pagination |
| **Operations** | Monthly production reports — BTC mined, BTC holdings, hashrate, power capacity, fleet efficiency |
| **News** | Industry news with sentiment analysis, category filtering, CSS-based sentiment & category charts |
| **Sentiment** | Analyst ratings (Buy/Hold/Sell), target prices vs current, social sentiment (StockTwits/Reddit) |
| **Analysis** | 6 quantitative models — Altman Z-Score, Piotroski F-Score, Beneish M-Score, Jones Model, KMV, Monte Carlo |
| **Predictions** | BTC price forecasts from institutions & crypto platforms, fitting curves, interactive chart |

### Key Highlights

- **22 active companies** tracked with 420+ financial records and 110+ operational records
- **Real-time data** — live BTC price (mempool.space), network difficulty, stock prices (Yahoo Finance)
- **6 financial analysis models** for fraud detection, solvency, and risk assessment
- **Bilingual UI** — full Chinese/English support with toggle
- **Dark/Light theme** with font size adjustment
- **Zero dependencies** — pure HTML/CSS/JS, no build step required
- **Auto-deploy** — push to `main` triggers GitHub Pages deployment in ~60 seconds
- **Agent-ready** — automated data collection via OpenClaw cron jobs

---

## Covered Companies

| Tier | Companies |
|------|-----------|
| **Priority** | MARA (Marathon) · RIOT (Riot Platforms) · CLSK (CleanSpark) · CORZ (Core Scientific) · HUT (Hut 8) |
| **Major** | WULF (TeraWulf) · IREN (Iris Energy) · CIFR (Cipher Mining) · APLD (Applied Digital) · BITF (Bitfarms) · BTDR (Bitdeer) · HIVE (HIVE Digital) · FUFU (BitFuFu) |
| **Secondary** | BTBT (Bit Digital) · ABTC (American Bitcoin) · ANY (Sphere 3D) · SLNH (Soluna) · GPUS (Hyperscale Data) · DGXX (Digi Power X) · MIGI (Mawson) · SAIH (SAIHEAT) · GREE (Greenidge) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JavaScript, HTML5, CSS3 |
| Charts | Chart.js 4.x + CSS conic-gradient / progress bars |
| Data | JSON files (`/data/*.json`) — no database required |
| Hosting | GitHub Pages (static, auto HTTPS) |
| CI/CD | GitHub Actions — auto-merge data PRs, auto-deploy |
| Data Collection | Python scripts + OpenClaw agent automation |
| APIs | mempool.space (BTC price), Yahoo Finance v8 (stocks), SEC EDGAR XBRL (financials) |

---

## Project Structure

```
btcminecompany/
├── index.html              # Main single-page application
├── css/style.css           # All styles (dark/light themes)
├── js/
│   ├── app.js              # Core application logic (~2,400 lines)
│   ├── data.js             # Data loading & initialization
│   └── i18n.js             # Internationalization (zh/en)
├── Analysis/               # 6 quantitative financial models
│   ├── altman.js           # Altman Z-Score
│   ├── beneish.js          # Beneish M-Score
│   ├── jones.js            # Jones Model
│   ├── kmv.js              # KMV Default Probability
│   ├── montecarlo.js       # Monte Carlo Simulation
│   └── piotroski.js        # Piotroski F-Score
├── data/                   # All data (JSON)
│   ├── companies.json      # Company master data (23 companies)
│   ├── financials.json     # Quarterly/annual earnings (420+ records)
│   ├── operational.json    # Monthly ops reports (110+ records)
│   ├── news.json           # Industry news & events
│   ├── sentiment.json      # Analyst ratings & social sentiment
│   ├── btc_price_predictions.json
│   ├── analysis_data.json  # Balance sheet data for models
│   └── schema.json         # Field definitions
├── scripts/                # Python data collection tools
│   ├── fetch_sec_data.py   # SEC EDGAR XBRL scraper
│   ├── fetch_prices.py     # Stock & BTC price fetcher
│   ├── update_all_data.py  # Master data pipeline
│   └── ...                 # Additional data scripts
├── docs/                   # Documentation
│   └── DATA_COLLECTION_GUIDE.md
└── .github/workflows/      # CI/CD
    ├── deploy.yml          # GitHub Pages deployment
    └── auto-merge-data.yml # Auto-merge data PRs
```

---

## Quick Start

No build step needed. Just open `index.html` in a browser or serve locally:

```bash
# Clone
git clone https://github.com/tincomking/btcminecompany.git
cd btcminecompany

# Serve locally (any static server works)
python3 -m http.server 8080
# Open http://localhost:8080
```

---

## Data Collection

Data is collected from public sources and stored as JSON in `/data/`. See [`docs/DATA_COLLECTION_GUIDE.md`](docs/DATA_COLLECTION_GUIDE.md) for the complete guide.

### Sources

| Data | Primary Source | Update Frequency |
|------|---------------|-----------------|
| Financials | SEC EDGAR XBRL, Company IR | Quarterly (earnings season) |
| Operations | Company press releases | Monthly (1st week of following month) |
| Stock Prices | Yahoo Finance v8 API | Daily |
| BTC Price | mempool.space / CoinGecko | Real-time |
| Analyst Ratings | TipRanks, MarketBeat, Benzinga | As published |
| News | CoinDesk, Bloomberg, PR wire | Continuous |
| BTC Predictions | Institutional research, crypto platforms | As published |

### Auto-Deploy Pipeline

```
Data collected → git push / PR to main → GitHub Actions validates → Auto-merge → GitHub Pages deploys (~60s)
```

---

## For Data Agents (OpenClaw)

> Detailed instructions: [`docs/DATA_COLLECTION_GUIDE.md`](docs/DATA_COLLECTION_GUIDE.md)

**Core principle: Collect only what's missing.**

1. Read target JSON in `/data/` to check existing coverage
2. Identify gaps (missing companies, quarters, months, null fields)
3. Collect from sources (company IR → SEC EDGAR → financial APIs)
4. Validate data (no obvious errors, correct units)
5. Commit to `/data/*.json` and push — auto-deploy handles the rest

---

<a name="中文版"></a>

# 中文版

[![在线访问](https://img.shields.io/badge/访问-btcmine.info-blue?style=flat-square)](https://btcmine.info)

全面追踪 **22 家美股上市比特币矿商** 的开源数据分析平台 — 涵盖财务数据、运营指标、市场情绪、量化分析和 BTC 价格预测。

---

## 功能特色

### 数据看板（7 个 Tab）

| Tab | 说明 |
|-----|------|
| **概览** | 实时 BTC 价格与网络难度、公司卡片、财报日历 |
| **财务数据** | 季度财报（营收、净利润、EBITDA、EPS）、同比对比、点击查看财报详情、分页 |
| **运营数据** | 月度产量报告 — BTC 产量、持仓、算力、电力容量、机队效率 |
| **新闻动态** | 行业新闻、情绪分析、分类筛选、CSS 可视化图表 |
| **市场情绪** | 机构评级（买入/持有/卖出）、目标价对比、社交情绪（StockTwits/Reddit） |
| **财务分析** | 6 个量化模型 — Altman Z-Score、Piotroski F-Score、Beneish M-Score、Jones Model、KMV、蒙特卡洛 |
| **BTC 预测** | 机构和加密平台的 BTC 价格预测、拟合曲线、交互图表 |

### 核心亮点

- **22 家活跃公司**，420+ 条财务记录，110+ 条运营记录
- **实时数据** — 实时 BTC 价格（mempool.space）、网络难度、股价（Yahoo Finance）
- **6 个财务分析模型**，覆盖欺诈检测、偿付能力和风险评估
- **中英双语 UI**，一键切换
- **深色/浅色主题**，可调字号
- **零依赖** — 纯 HTML/CSS/JS，无需构建步骤
- **自动部署** — 推送到 `main` 分支后约 60 秒完成 GitHub Pages 部署
- **Agent 就绪** — 通过 OpenClaw 定时任务自动采集数据

---

## 覆盖公司

| 优先级 | 公司 |
|--------|------|
| **核心** | MARA（Marathon）· RIOT（Riot Platforms）· CLSK（CleanSpark）· CORZ（Core Scientific）· HUT（Hut 8） |
| **重要** | WULF（TeraWulf）· IREN（Iris Energy）· CIFR（Cipher Mining）· APLD（Applied Digital）· BITF（Bitfarms）· BTDR（Bitdeer）· HIVE · FUFU（BitFuFu） |
| **次要** | BTBT · ABTC · ANY · SLNH · GPUS · DGXX · MIGI · SAIH · GREE |

---

## 技术栈

| 层级 | 技术方案 |
|------|---------|
| 前端 | 原生 JavaScript、HTML5、CSS3 |
| 图表 | Chart.js 4.x + CSS conic-gradient / 进度条 |
| 数据 | JSON 文件（`/data/*.json`）— 无需数据库 |
| 托管 | GitHub Pages（静态站点，自动 HTTPS） |
| CI/CD | GitHub Actions — 自动合并数据 PR、自动部署 |
| 数据采集 | Python 脚本 + OpenClaw Agent 自动化 |
| API | mempool.space（BTC 价格）、Yahoo Finance v8（股价）、SEC EDGAR XBRL（财务数据） |

---

## 快速开始

无需构建。直接在浏览器中打开 `index.html` 或本地起服务：

```bash
# 克隆项目
git clone https://github.com/tincomking/btcminecompany.git
cd btcminecompany

# 本地服务（任意静态服务器均可）
python3 -m http.server 8080
# 打开 http://localhost:8080
```

---

## 数据采集

数据来源于公开信息，以 JSON 格式存储在 `/data/` 目录。完整指南见 [`docs/DATA_COLLECTION_GUIDE.md`](docs/DATA_COLLECTION_GUIDE.md)。

### 数据来源

| 数据类型 | 主要来源 | 更新频率 |
|---------|---------|---------|
| 季度财务 | SEC EDGAR XBRL、公司 IR 页面 | 季度（财报季） |
| 月度运营 | 公司新闻稿 | 月度（次月第一周） |
| 股价 | Yahoo Finance v8 API | 每日 |
| BTC 价格 | mempool.space / CoinGecko | 实时 |
| 机构评级 | TipRanks、MarketBeat、Benzinga | 随时发布 |
| 新闻 | CoinDesk、Bloomberg、PR 通讯社 | 持续 |
| BTC 预测 | 机构研报、加密预测平台 | 随时发布 |

### 自动部署流程

```
数据采集 → git push / PR 到 main → GitHub Actions 验证 → 自动合并 → GitHub Pages 部署（~60秒）
```

---

## 数据采集 Agent（OpenClaw）

> 详细文档：[`docs/DATA_COLLECTION_GUIDE.md`](docs/DATA_COLLECTION_GUIDE.md)

**核心原则：只采集缺失的数据。**

1. 读取 `/data/` 中的目标 JSON，了解当前覆盖范围
2. 识别缺口（缺失的公司、季度、月份、空值字段）
3. 从数据来源采集（公司 IR → SEC EDGAR → 金融 API）
4. 验证数据（无明显错误、单位正确）
5. 提交到 `/data/*.json` 并推送 — 自动部署会处理后续

---

## License

MIT
