# BTC Mining Intelligence Platform

> **Live Site: [btcmine.info](https://btcmine.info)**

A comprehensive analytics platform tracking US-listed Bitcoin mining companies, providing investors and researchers with consolidated industry data, financial insights, and market sentiment.

[中文版](#中文版)

## Overview

- **12+ public miners tracked** — MARA · RIOT · CLSK · CORZ · HUT · WULF · IREN · CIFR · APLD · BITF · SDIG · BTBT
- Quarterly financial data (Revenue, Net Income, Adj. EBITDA, EPS, etc.)
- Monthly operational disclosures (BTC production, hashrate, facility capacity)
- Real-time news & announcements
- Market sentiment (Wall Street ratings + social media analysis)
- Financial analysis models (Monte Carlo simulations, bankruptcy warnings)
- BTC price forecasts from 8 crypto platforms and 11 institutions (2025–2030)

## Data Structure

All data files are located in the `/data/` directory:

| File | Content | Update Frequency |
|------|---------|-----------------|
| `data/companies.json` | Company master data | Quarterly / event-driven |
| `data/financials.json` | Quarterly financial data | Quarterly (within 24h of earnings) |
| `data/operational.json` | Monthly operational disclosures | Monthly (within 48h of disclosure) |
| `data/news.json` | News & updates | Daily |
| `data/sentiment.json` | Institutional ratings + social sentiment | Daily |
| `data/btc_price_predictions.json` | BTC price forecasts | As available |
| `data/analysis_data.json` | Financial analysis model data | As available |
| `data/schema.json` | **Data format specification** (for data agent) | Read-only |

## Key Financial Metrics

Priority order:
1. **Revenue**
2. **Net Income** — note BTC fair value impact
3. **Adj. EBITDA** — core profitability excluding non-cash items
4. EPS, cash position, BTC holdings, etc.

## Tech Stack

- Static website (HTML + CSS + JavaScript)
- Chart.js for data visualization
- Data managed via local JSON files
- GitHub Pages auto-deployment
- Live BTC price via mempool.space API

## Data Updates

The data agent modifies JSON files in `/data/` and commits. GitHub Actions automatically redeploys.

---

<a name="中文版"></a>
# 中文版

> **网站访问：[btcmine.info](https://btcmine.info)**

美国上市比特币矿商财务数据追踪平台，为投资者和研究人员提供全面的行业数据、财务分析和市场情绪洞察。

## 概览

- **覆盖 12+ 家上市矿企** — MARA · RIOT · CLSK · CORZ · HUT · WULF · IREN · CIFR · APLD · BITF · SDIG · BTBT
- 季度财务数据（营收、净利润、Adj. EBITDA、EPS 等）
- 月度运营披露（BTC 产量、算力、设施容量）
- 实时新闻与公告
- 市场情绪（华尔街评级 + 社交媒体分析）
- 财务分析模型（蒙特卡洛模拟、破产预警）
- BTC 价格预测：来自 8 家加密平台和 11 家机构（2025–2030）

## 数据格式说明

所有数据文件位于 `/data/` 目录：

| 文件 | 内容 | 更新频率 |
|------|------|----------|
| `data/companies.json` | 公司主数据 | 季度/事件驱动 |
| `data/financials.json` | 季度财务数据 | 每季度（财报后 24h 内） |
| `data/operational.json` | 月度运营披露 | 每月（披露后 48h 内） |
| `data/news.json` | 新闻动态 | 每日 |
| `data/sentiment.json` | 机构评级 + 社交情绪 | 每日 |
| `data/btc_price_predictions.json` | BTC 价格预测 | 按需更新 |
| `data/analysis_data.json` | 财务分析模型数据 | 按需更新 |
| `data/schema.json` | **数据格式规范**（给 data agent 看） | 只读 |

## 重要财务指标

优先级排序：
1. **营收**（Revenue）
2. **净利润**（Net Income）— 注意 BTC 公允价值影响
3. **Adj. EBITDA**（剔除非现金项目后的核心盈利）
4. EPS、现金、持仓 BTC 等

## 技术栈

- 纯静态网站（HTML + CSS + JavaScript）
- Chart.js（图表可视化）
- 数据通过本地 JSON 文件管理
- GitHub Pages 自动部署
- 实时 BTC 价格（mempool.space API）

## 数据更新方式

Data agent 直接修改 `/data/` 目录中的 JSON 文件并提交，GitHub Actions 自动重新部署。
