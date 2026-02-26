# BTC Mining Intelligence — Agent 操作手册

> 本文档是 OpenClaw Agent 的完整操作指南。Agent 按照本文档执行数据采集、验证、提交和清理。
>
> **网站**: [btcmine.info](https://btcmine.info)
> **仓库**: [github.com/tincomking/btcminecompany](https://github.com/tincomking/btcminecompany)

---

## 第 -1 章：常见失误（历史教训，必读）

> 以下是之前 Agent 执行时犯过的错误，**你必须避免**。

### 失误 1：stock_price 更新了但 market_cap 没同步

**错误表现**: MARA stock_price 从 14.52 改为 8.57，但 market_cap_usd_m 仍然是 4860。
**正确做法**: **stock_price 和 market_cap_usd_m 必须同时更新**。market_cap = stock_price × shares_outstanding。如果无法获取实时市值，用 stock_price × shares_outstanding_m 估算。

### 失误 2：只做了一小部分就声称完成

**错误表现**: 只更新了股价和 4 条运营数据，对 news、sentiment、predictions、大量缺失的 financials 完全没有处理，就报告"执行完毕"。
**正确做法**: 按照第 1 章的工作流，**对每个数据类别 (A-G) 都执行一遍 READ→DIFF→HUNT→WRITE**。如果时间或 token 不够处理全部，明确报告"已完成 X 类，Y 类未处理"，不要笼统说"完成"。

### 失误 3：关键字段填 null 而没有尝试多个来源

**错误表现**: RIOT 运营数据中 btc_mined、btc_held 等核心字段全部为 null，只填了 hashrate。
**正确做法**: 如果第一个来源没有完整数据，**必须尝试其他来源**（IR 页面 → PRNewswire → SEC 8-K → 行业网站）。只有所有来源都查过仍找不到，才填 null。

### 失误 4：股价数值异常未验证

**错误表现**: HUT 股价从 $3.85 直接改成 $55.30（涨了 14 倍），没有验证合理性。
**正确做法**: 更新股价时做基本 sanity check — 如果新旧价格变动超过 50%，需要确认数据来源的准确性。在 commit message 或 notes 中说明数据来源。

---

## 第 0 章：安全红线

> **历史事故**: Agent 曾删除网站核心文件（js/app.js、css/style.css、Analysis/*.js、CNAME），导致 btcmine.info 完全崩溃。以下规则基于事故教训，**绝对不可违反**。

### 禁止操作

| 禁止操作 | 原因 |
|---------|------|
| 删除或修改 `data/` 以外的任何文件 | 网站核心代码，Agent 无权触碰 |
| 修改任何 JSON 文件的顶层结构 | 前端解析依赖固定结构 |
| 使用 `git add .` / `git add -A` / `git add --all` | 可能 stage 非 data/ 文件 |
| 编造数据 | 找不到就填 `null`，绝不捏造 |
| 修改 `data/schema.json` | 只读参考文档 |

### 允许操作

```
只能修改的文件（7 个）:
  data/companies.json           — 仅更新 stock_price 和 market_cap_usd_m
  data/financials.json          — 在 data 数组中添加/更新记录
  data/operational.json         — 在 data 数组中添加/更新记录
  data/news.json                — 在 data 数组中添加新记录
  data/sentiment.json           — 在 analyst_ratings / social_sentiment 数组中添加/更新
  data/analysis_data.json       — 在 data 对象中添加/更新公司条目
  data/btc_price_predictions.json — 更新预测数据

可新增的文件:
  data/raw_reports/{TICKER}/{YEAR}_{PERIOD}.json — 原始财报存档

绝对不可触碰:
  index.html, js/*, css/*, Analysis/*, CNAME, .github/*, docs/*, README.md, data/schema.json
```

### JSON 文件顶层结构（必须严格遵守）

| 文件 | 顶层键 | 注意事项 |
|------|--------|---------|
| `companies.json` | `_meta`, `companies` | 数组键名是 `companies`，不是 `data` |
| `financials.json` | `_meta`, `data` | `data` 是数组 |
| `operational.json` | `_meta`, `data` | `data` 是数组 |
| `news.json` | `_meta`, `data` | `data` 是数组 |
| `sentiment.json` | `_meta`, `analyst_ratings`, `social_sentiment` | **无 `data` 键**，两个独立数组 |
| `analysis_data.json` | `data` | `data` 是**对象**（非数组）。**禁止添加 `_meta`** |
| `btc_price_predictions.json` | `_meta`, `crypto_platform_predictions`, `institutional_predictions`, `summary_consensus`, `key_catalysts`, `key_risks` | **无 `data` 包装器**，所有键在顶层 |

### 前端数据加载方式（Agent 必须了解）

```javascript
COMPANIES = companiesRes.companies || [];              // 注意: .companies 不是 .data
FINANCIALS = financialsRes.data || [];
OPERATIONAL = operationalRes.data || [];
NEWS = newsRes.data || [];
SENTIMENT = {
  analyst_ratings: sentimentRes.analyst_ratings || [],  // 无 .data
  social_sentiment: sentimentRes.social_sentiment || [],
};
ANALYSIS_DATA = analysisRes.data || {};                // .data 是对象
BTC_PREDICTIONS = predictionsRes || {};                // 直接用整个对象
```

---

## 第 1 章：核心原则 — 只采集缺失的数据

**每次任务的第一步永远是：读取现有数据，找出缺什么。**

```
工作流:
1. READ  — 读取目标 JSON 文件，了解当前已有的数据
2. DIFF  — 对比应有数据和已有数据，找出缺口
           · 哪些公司完全没有数据？
           · 哪些季度/月份缺失？
           · 哪些已有记录中字段为 null？
3. HUNT  — 从多个渠道搜索缺失数据（第一个来源失败就换下一个）
4. VALIDATE — 验证数据合理性（单位、正负号、交叉校验）
5. WRITE — 写入 JSON 文件
6. COMMIT — 提交并推送
```

### 优先级排序

**重点公司（优先采集）**: MARA, RIOT, CLSK, CORZ, HUT

**次要公司**: WULF, IREN, CIFR, APLD, BITF, BTBT, BTDR, FUFU

**其余公司**: GREE, ABTC, ANY, SLNH, GPUS, DGXX, MIGI, SAIH, HIVE

**退市（不采集）**: SDIG（2025-03 并入 BITF）

### 非标准财年公司

| Ticker | 财年截止月 | SEC Filing |
|--------|----------|-----------|
| CLSK | 9月 | 10-K / 10-Q |
| IREN | 6月 | 20-F / 6-K |
| APLD | 5月 | 10-K / 10-Q |
| HIVE | 3月 | 10-K / 10-Q |
| MIGI | 6月 | 10-K / 10-Q |
| SAIH | 6月 | 20-F / 6-K |

其余公司财年截止为 12 月。

---

## 第 2 章：数据分类与采集方法

---

### A 类：股价与市值（`companies.json` + `analysis_data.json`）

**目标**: 保持股价和市值数据尽可能新。

**Agent 权限**: 仅可更新每家公司的 `stock_price` 和 `market_cap_usd_m` 两个字段。禁止修改公司基础信息。

**去重键**: `ticker`（每个 ticker 只有一条记录）

**采集流程**:
```
1. 获取所有活跃公司的最新股价和市值
2. 更新 data/companies.json 中对应字段
3. 同步更新 data/analysis_data.json 中 market.stock_price 和 market.market_cap
4. 更新 _meta.last_updated 为当天日期
```

**数据来源（按优先级）**:

| # | 来源 | URL | 说明 |
|---|------|-----|------|
| 1 | Yahoo Finance | `https://finance.yahoo.com/quote/{TICKER}` | 实时股价、市值 |
| 2 | Google Finance | `https://www.google.com/finance/quote/{TICKER}:NASDAQ` | 备用 |
| 3 | Financial Modeling Prep API | `https://financialmodelingprep.com/api/v3/quote/{TICKER}` | 需 API key |
| 4 | Alpha Vantage | `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={TICKER}` | 需 API key |

---

### B 类：季度财务数据（`financials.json`）

**目标**: 覆盖所有公司的所有季度财报数据。

**优先字段**: `revenue_usd_m` > `net_income_usd_m` > `adjusted_ebitda_usd_m` > 其他

**去重键**: `(ticker, fiscal_year, fiscal_quarter)`

**怎么找缺口**:
```
1. 读取 financials.json，按 ticker 分组
2. 对每家公司，检查从 FY2023 起的每个季度和年度是否都有记录
3. 检查已有记录中是否有 revenue_usd_m/net_income_usd_m 为 null 的
4. 列出所有缺失的 (ticker, year, quarter) 组合
```

**每条记录的字段**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ticker` | string | 是 | 股票代码 |
| `fiscal_year` | integer | 是 | 财年 |
| `fiscal_quarter` | string | 是 | `Q1`/`Q2`/`Q3`/`Q4`/`FY` |
| `period_label` | string | 是 | 显示文字，如 `"Q4 2024"` |
| `period_end_date` | string | 是 | 周期截止日 `YYYY-MM-DD` |
| `report_date` | string\|null | 是 | 财报实际发布日。未发布填 `null` |
| `estimated_report_date` | string\|null | 否 | 预计发布日。已发布填 `null` |
| `is_reported` | boolean | 是 | 已发布填 `true` |
| `revenue_usd_m` | number\|null | 是 | 总营收（百万 USD） |
| `gross_profit_usd_m` | number\|null | 否 | 毛利润 |
| `operating_income_usd_m` | number\|null | 否 | 营业利润/亏损（亏损为负） |
| `net_income_usd_m` | number\|null | 是 | 净利润/亏损 |
| `adjusted_ebitda_usd_m` | number\|null | 是 | 调整后 EBITDA |
| `eps_diluted` | number\|null | 否 | 稀释每股收益 |
| `revenue_yoy_pct` | number\|null | 否 | 营收同比增长率（%） |
| `gross_profit_yoy_pct` | number\|null | 否 | 毛利润 YoY |
| `net_income_yoy_pct` | number\|null | 否 | 净利润 YoY。双亏损填 `null` |
| `adjusted_ebitda_yoy_pct` | number\|null | 否 | Adj EBITDA YoY |
| `shares_outstanding_m` | number\|null | 否 | 稀释流通股（百万） |
| `cash_and_equivalents_usd_m` | number\|null | 否 | 现金 |
| `btc_held` | integer\|null | 否 | 期末持有 BTC |
| `total_debt_usd_m` | number\|null | 否 | 总债务 |
| `notes` | string | 否 | 备注和数据来源 |

**YoY 计算方法**:
```
revenue_yoy_pct = (当期 - 去年同期) / |去年同期| * 100
如去年同期不存在或为 0，填 null
如两期 net_income 都为负，net_income_yoy_pct 填 null
保留 1 位小数
```

**数据来源（按优先级）**:

| # | 来源 | URL | 说明 |
|---|------|-----|------|
| 1 | 公司 IR 页面 | 各公司 `ir_url` 字段 | 财报新闻稿，最快 |
| 2 | SEC EDGAR | `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={TICKER}&type=10-K&dateb=&owner=include&count=10` | 权威，可能滞后 1-2 天 |
| 3 | SEC EDGAR 全文搜索 | `https://efts.sec.gov/LATEST/search-index?q={TICKER}&forms=10-K,10-Q,20-F,6-K` | 检查最新 filing |
| 4 | Stock Analysis | `https://stockanalysis.com/stocks/{TICKER}/financials/?p=quarterly` | 结构化数据 |
| 5 | Yahoo Finance | `https://finance.yahoo.com/quote/{TICKER}/financials` | 备用 |
| 6 | Macrotrends | `https://www.macrotrends.net/stocks/charts/{TICKER}/` | 历史数据补全 |

**完整记录示例**:
```json
{
  "ticker": "MARA",
  "fiscal_year": 2024,
  "fiscal_quarter": "Q4",
  "period_label": "Q4 2024",
  "period_end_date": "2024-12-31",
  "report_date": "2025-02-25",
  "estimated_report_date": null,
  "is_reported": true,
  "revenue_usd_m": 264.3,
  "gross_profit_usd_m": 168.9,
  "operating_income_usd_m": -124.8,
  "net_income_usd_m": -124.8,
  "adjusted_ebitda_usd_m": 293.4,
  "eps_diluted": -0.39,
  "revenue_yoy_pct": 37.1,
  "gross_profit_yoy_pct": null,
  "net_income_yoy_pct": null,
  "adjusted_ebitda_yoy_pct": 173.2,
  "shares_outstanding_m": 322.6,
  "cash_and_equivalents_usd_m": 243.7,
  "btc_held": 44893,
  "total_debt_usd_m": 2238.8,
  "notes": "Q4 2024: Revenue $264.3M. Net loss $(124.8M) includes unrealized BTC fair value loss. Source: 10-K filed 2025-02-25."
}
```

---

### C 类：月度运营数据（`operational.json`）

**目标**: 覆盖所有公司的月度产量报告。

**去重键**: `(ticker, period)`

**怎么找缺口**:
```
1. 读取 operational.json，按 ticker 分组
2. 对每家公司，检查最近 6 个月是否都有记录
3. 识别缺失的 (ticker, month) 组合
```

**每条记录的字段**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ticker` | string | 是 | 股票代码 |
| `period` | string | 是 | `YYYY-MM` |
| `period_label` | string | 是 | 如 `"Jan 2025"` |
| `report_date` | string\|null | 是 | 公司发布日期 |
| `btc_mined` | integer\|null | 是 | 当月挖出 BTC |
| `btc_held` | integer\|null | 是 | 期末持有 BTC |
| `btc_sold` | integer\|null | 否 | 当月出售。HODL 填 `0` |
| `hash_rate_eh` | number\|null | 是 | 平均算力 EH/s |
| `installed_capacity_eh` | number\|null | 否 | 已安装容量 EH/s |
| `power_capacity_mw` | number\|null | 否 | 电力容量 MW |
| `fleet_efficiency_j_th` | number\|null | 否 | 矿机效率 J/TH |
| `uptime_pct` | number\|null | 否 | 在线率 % |
| `avg_power_cost_cents_kwh` | number\|null | 否 | 电费 美分/kWh |
| `source_url` | string\|null | 否 | IR 新闻稿 URL |
| `notes` | string | 否 | 备注 |

**数据来源（按优先级）**:

| # | 来源 | URL | 说明 |
|---|------|-----|------|
| 1 | 公司 IR 页面 | 各公司 `ir_url` | 月度产量报告（最权威） |
| 2 | GlobeNewswire | `https://www.globenewswire.com/search?keyword={TICKER}` | 新闻稿分发 |
| 3 | BusinessWire | `https://www.businesswire.com/portal/site/home/` | 新闻稿分发 |
| 4 | PRNewswire | 搜索 `{TICKER} monthly production` | 新闻稿分发 |
| 5 | SEC Form 8-K | `https://efts.sec.gov/LATEST/search-index?q={TICKER}&forms=8-K` | 部分公司通过 8-K 披露 |
| 6 | The Miner Mag | `https://www.theminermag.com/` | 行业汇总（辅助验证） |
| 7 | Hashrate Index | `https://hashrateindex.com/` | 行业数据（辅助验证） |

---

### D 类：新闻动态（`news.json`）

**目标**: 持续收集行业新闻和公司公告。

**去重**: `id` 字段，格式 `news_NNNN`。新增前先找最大 ID 号 +1。同时检查 `title + ticker + published_at` 避免重复。

**规则**: 新闻**只新增**，不更新已有记录。

**每条记录的字段**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | `news_NNNN` |
| `ticker` | string\|null | 是 | 公司填 ticker，行业新闻填 `null` |
| `title` | string | 是 | 标题 |
| `source` | string | 是 | 来源 |
| `url` | string\|null | 否 | URL |
| `published_at` | string | 是 | ISO 8601 UTC |
| `category` | string | 是 | 见下方枚举 |
| `sentiment` | string | 是 | `positive`/`negative`/`neutral` |
| `sentiment_score` | number | 否 | -1.0 到 +1.0 |
| `summary` | string | 是 | 2-4 句摘要，最多 500 字符 |
| `tags` | array[string] | 否 | 关键词标签 |

**category 枚举**: `earnings`, `operations`, `expansion`, `regulatory`, `market`, `business`, `sustainability`, `treasury`, `executive`, `partnership`

**数据来源**:

| # | 来源 | URL |
|---|------|-----|
| 1 | 公司 IR 页面 | 各公司 `ir_url` |
| 2 | SEC 8-K | `https://efts.sec.gov/LATEST/search-index?q={TICKER}&forms=8-K` |
| 3 | GlobeNewswire | `https://www.globenewswire.com/search?keyword={TICKER}` |
| 4 | BusinessWire | `https://www.businesswire.com/portal/site/home/` |
| 5 | CoinDesk | `https://www.coindesk.com/tag/mining/` |
| 6 | The Block | `https://www.theblock.co/category/mining` |
| 7 | Bloomberg / Reuters | 搜索 `{TICKER} OR {COMPANY_NAME} bitcoin mining` |

---

### E 类：市场情绪（`sentiment.json`）

此文件包含两个独立数组。

#### E1: 机构评级（`analyst_ratings`）

**去重键**: `(ticker, analyst_firm, date)`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ticker` | string | 是 | 股票代码 |
| `analyst_firm` | string | 是 | 券商名称 |
| `analyst_name` | string\|null | 否 | 分析师姓名 |
| `rating` | string | 是 | 原始评级（原文） |
| `rating_normalized` | string | 是 | `buy`/`hold`/`sell` |
| `target_price_usd` | number\|null | 否 | 目标价 |
| `prev_target_price_usd` | number\|null | 否 | 此前目标价 |
| `date` | string | 是 | `YYYY-MM-DD` |
| `action` | string | 是 | 见下方枚举 |
| `note` | string | 否 | 评论/理由 |

**action 枚举**: `initiate`, `maintain`, `upgrade`, `downgrade`, `upgrade_target`, `downgrade_target`, `reiterate`

**rating 标准化**: Buy/Outperform/Overweight/Strong Buy → `buy`; Hold/Neutral/Equal Weight → `hold`; Sell/Underperform/Underweight → `sell`

#### E2: 社交情绪（`social_sentiment`）

**规则**: 每个 ticker 只保留最新一条。新日期替换旧日期。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ticker` | string | 是 | 股票代码 |
| `date` | string | 是 | `YYYY-MM-DD` |
| `reddit_mentions_24h` | integer\|null | 否 | Reddit 24h 提及数 |
| `twitter_x_mentions_24h` | integer\|null | 否 | X 24h 提及数 |
| `stocktwits_bullish_pct` | number\|null | 否 | 看涨比例 0-100 |
| `stocktwits_bearish_pct` | number\|null | 否 | 看跌比例 0-100 |
| `stocktwits_message_volume` | string | 否 | `low`/`normal`/`high` |
| `composite_score` | number\|null | 否 | = (bullish_pct - 50) / 50 |
| `trending` | boolean | 否 | 是否趋势化 |
| `trend_direction` | string | 否 | `up`/`down`/`neutral` |
| `notes` | string | 否 | 备注 |

**重要**: `composite_score` 前端会自动从 `stocktwits_bullish_pct` 计算，但 Agent 仍应写入以保持一致。

**数据来源**:

| 类型 | 来源 | URL |
|------|------|-----|
| 评级 | TipRanks | `https://www.tipranks.com/stocks/{TICKER}/forecast` |
| 评级 | MarketBeat | `https://www.marketbeat.com/stocks/NASDAQ/{TICKER}/forecast/` |
| 评级 | Yahoo Finance | `https://finance.yahoo.com/quote/{TICKER}/analysis/` |
| 评级 | Benzinga / Seeking Alpha | 搜索 analyst ratings |
| 社交 | StockTwits | `https://stocktwits.com/symbol/{TICKER}` |
| 社交 | AltIndex | `https://altindex.com/stock/{TICKER}` |
| 社交 | Reddit | r/CryptoCurrency, r/BitcoinMining |
| 社交 | Twitter/X | 搜索 `${TICKER} bitcoin mining` |

---

### F 类：BTC 价格预测（`btc_price_predictions.json`）

**顶层键**: `_meta`, `crypto_platform_predictions`, `institutional_predictions`, `summary_consensus`, `key_catalysts`, `key_risks`

**去重**: `crypto_platform_predictions` 按 `source`；`institutional_predictions` 按 `source` + `analyst`

**采集流程**:
```
1. 访问各预测平台获取最新数据
2. 更新已有来源的预测数字
3. 添加新发现的预测来源
4. 重新计算 summary_consensus（各年份的 high/low/median/mean）
5. 如有重大变化更新 key_catalysts 和 key_risks
```

**crypto_platform_predictions 示例**:
```json
{
  "source": "DigitalCoinPrice",
  "url": "https://digitalcoinprice.com/forecast/bitcoin",
  "prediction_date": "2026-02",
  "methodology": "Algorithmic model based on historical data",
  "predictions": {
    "2025": { "low": null, "high": null, "average": null },
    "2026": { "low": 224224, "high": 270576, "average": 247614 }
  }
}
```

**数据来源**:

| 来源 | URL |
|------|-----|
| DigitalCoinPrice | `https://digitalcoinprice.com/forecast/bitcoin` |
| CoinCodex | `https://coincodex.com/crypto/bitcoin/price-prediction/` |
| PricePrediction.net | `https://priceprediction.net/en/price-prediction/bitcoin` |
| CryptoNewsZ | `https://www.cryptonewsz.com/forecast/bitcoin-price-prediction/` |
| ARK, JPMorgan, Goldman Sachs, Standard Chartered 等 | 研报/公开预测 |

---

### G 类：财务分析模型数据（`analysis_data.json`）

**顶层结构**: `{ "data": { "TICKER": { ... } } }` — data 是对象，**禁止添加 _meta**

**更新时机**: 仅当某公司有新年报（FY）时更新。季度数据不更新此文件。

**去重**: data 对象中的键名（ticker），每个 ticker 一个条目。

**每家公司结构**:
```json
{
  "TICKER": {
    "name": "公司全称",
    "current": { "period": "FY2024", "revenue": 463.3, ... },
    "prior":   { "period": "FY2023", "revenue": 284.1, ... },
    "market":  { "stock_price": 2.66, "market_cap": 434.0, ... }
  }
}
```

**current/prior 字段**: `period`, `revenue`, `cogs`, `gross_profit`, `sga`, `depreciation`, `operating_income`, `net_income`, `ebit`, `total_assets`, `current_assets`, `receivables`, `ppe_net`, `total_liabilities`, `current_liabilities`, `long_term_debt`, `retained_earnings`, `total_equity`, `operating_cash_flow`, `shares_outstanding_m`（均为百万 USD）

**market 字段**: `stock_price`, `market_cap`, `equity_volatility`（0.70-0.95）, `asset_volatility`（≈ equity_vol * equity/assets）, `risk_free_rate`（统一 0.043）, `revenue_growth_mean`, `revenue_growth_std`（≈ mean * 0.3~0.5）

**数据来源**: 同 B 类（SEC EDGAR 年报）+ Yahoo Finance（market 字段）

---

## 第 3 章：原始财报存档（`data/raw_reports/`）

### 文件命名

```
data/raw_reports/{TICKER}/{YEAR}_{PERIOD}.json
示例: data/raw_reports/MARA/2024_FY.json
```

### JSON 结构

```json
{
  "ticker": "MARA",
  "company_name": "Marathon Digital Holdings, Inc.",
  "period": "2024_FY",
  "period_type": "annual",
  "period_end_date": "2024-12-31",
  "currency": "USD",
  "unit": "millions",
  "source": "SEC 10-K (filed 2025-02-25)",
  "collected_date": "2026-02-26",
  "notes": "",
  "income_statement": {
    "revenue": 264.3, "cogs": 95.4, "gross_profit": 168.9,
    "sga": 45.2, "depreciation": 120.5, "operating_income": -124.8,
    "net_income": -124.8, "ebit": -4.3, "eps_diluted": -0.39
  },
  "balance_sheet": {
    "total_assets": 8500.0, "current_assets": 500.0,
    "cash_and_equivalents": 243.7, "receivables": 25.0,
    "ppe_net": 3200.0, "total_liabilities": 3500.0,
    "current_liabilities": 200.0, "long_term_debt": 2238.8,
    "retained_earnings": -500.0, "total_equity": 5000.0,
    "shares_outstanding_m": 322.6
  },
  "cash_flow_statement": {
    "operating_cash_flow": 150.0, "investing_cash_flow": -300.0,
    "financing_cash_flow": 200.0, "capex": -250.0,
    "free_cash_flow": -100.0
  },
  "market_data": {
    "stock_price": 14.52, "market_cap": 4860.0, "btc_held": 44893
  }
}
```

**raw_reports 与页面数据的关系**: raw_reports 是存档，网页不直接读取。采集完后必须同步更新 `financials.json`，年报时还需更新 `analysis_data.json`。

---

## 第 4 章：数据验证

**每次修改 JSON 文件后、提交前必须验证。**

### 通用规则

| 规则 | 说明 |
|------|------|
| 金额单位 | **百万美元**，保留 1 位小数 |
| SEC 报表转换 | SEC 通常以千元为单位，除以 1000 |
| null 处理 | 找不到填 `null`，绝不编造 |
| 负数 | 亏损、负现金流保留负号 |
| 股价 | 保留 2 位小数 |
| YoY 百分比 | 保留 1 位小数 |
| 日期 | `YYYY-MM-DD` |
| 时间 | `YYYY-MM-DDTHH:MM:SSZ` (UTC) |

### 跨文件一致性检查（必做）

```
1. companies.json 中的 stock_price 更新时，market_cap_usd_m 必须同步更新
2. companies.json 中的 stock_price 和 analysis_data.json 中的 market.stock_price 必须一致
3. companies.json 中的 market_cap_usd_m 和 analysis_data.json 中的 market.market_cap 必须一致
4. 股价变动超过 50% 时，必须验证数据来源是否正确
5. 运营数据中 btc_mined/btc_held/hash_rate_eh 等核心字段不应全部为 null — 如果是，说明没有充分搜索
```

### 财务数据交叉验证

```
gross_profit ≈ revenue - cogs (允许 ±5M 误差)
total_assets ≈ total_liabilities + total_equity (允许 ±5M)
eps_diluted 正负号与 net_income 一致
如 net_income 和去年 net_income 都为负，net_income_yoy_pct 填 null
```

### 运营数据验证

```
btc_mined: 正整数，通常 10-5000
hash_rate_eh: 正数，通常 0.1-60
stocktwits_bullish_pct + stocktwits_bearish_pct ≈ 100
```

### 一键验证脚本

**提交前必须运行此脚本，全部通过才能提交。**

```bash
python3 -c "
import json, subprocess, sys

errors = []

# 1. companies.json
try:
    d = json.load(open('data/companies.json'))
    assert 'companies' in d and isinstance(d['companies'], list)
    tickers = [c['ticker'] for c in d['companies']]
    assert len(tickers) == len(set(tickers)), 'Duplicate tickers'
    print(f'  companies.json: {len(d[\"companies\"])} companies OK')
except Exception as e:
    errors.append(f'companies.json: {e}')

# 2. financials.json
try:
    d = json.load(open('data/financials.json'))
    assert 'data' in d and isinstance(d['data'], list)
    seen = set()
    for r in d['data']:
        key = (r['ticker'], r['fiscal_year'], r['fiscal_quarter'])
        assert key not in seen, f'Duplicate: {key}'
        seen.add(key)
    print(f'  financials.json: {len(d[\"data\"])} records OK')
except Exception as e:
    errors.append(f'financials.json: {e}')

# 3. operational.json
try:
    d = json.load(open('data/operational.json'))
    assert 'data' in d and isinstance(d['data'], list)
    seen = set()
    for r in d['data']:
        key = (r['ticker'], r['period'])
        assert key not in seen, f'Duplicate: {key}'
        seen.add(key)
    print(f'  operational.json: {len(d[\"data\"])} records OK')
except Exception as e:
    errors.append(f'operational.json: {e}')

# 4. news.json
try:
    d = json.load(open('data/news.json'))
    assert 'data' in d and isinstance(d['data'], list)
    cats = {'earnings','operations','expansion','regulatory','market','business','sustainability','treasury','executive','partnership'}
    ids = set()
    for r in d['data']:
        assert r['id'] not in ids, f'Duplicate id: {r[\"id\"]}'
        ids.add(r['id'])
        assert r['category'] in cats, f'Invalid category: {r[\"category\"]}'
        assert r['sentiment'] in {'positive','negative','neutral'}
    print(f'  news.json: {len(d[\"data\"])} records OK')
except Exception as e:
    errors.append(f'news.json: {e}')

# 5. sentiment.json
try:
    d = json.load(open('data/sentiment.json'))
    assert 'analyst_ratings' in d and isinstance(d['analyst_ratings'], list)
    assert 'social_sentiment' in d and isinstance(d['social_sentiment'], list)
    valid_actions = {'initiate','maintain','upgrade','downgrade','upgrade_target','downgrade_target','reiterate'}
    for r in d['analyst_ratings']:
        assert r['rating_normalized'] in {'buy','hold','sell'}
        assert r['action'] in valid_actions
    for s in d['social_sentiment']:
        bp = s.get('stocktwits_bullish_pct')
        if bp is not None:
            assert 0 <= bp <= 100
    print(f'  sentiment.json: {len(d[\"analyst_ratings\"])} ratings + {len(d[\"social_sentiment\"])} social OK')
except Exception as e:
    errors.append(f'sentiment.json: {e}')

# 6. analysis_data.json
try:
    d = json.load(open('data/analysis_data.json'))
    assert 'data' in d and isinstance(d['data'], dict)
    for t, info in d['data'].items():
        assert 'current' in info and 'prior' in info and 'market' in info
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

# 8. 检查非 data/ 文件是否被修改
result = subprocess.run(['git', 'diff', '--name-only', 'HEAD'], capture_output=True, text=True)
changed = [f for f in result.stdout.strip().split('\n') if f and not f.startswith('data/')]
if changed:
    errors.append(f'Modified files outside data/: {changed}')
else:
    print('  No files outside data/ modified')

if errors:
    print(f'\nFAILED - {len(errors)} error(s):')
    for e in errors:
        print(f'  ERROR: {e}')
    sys.exit(1)
else:
    print('\nALL VALIDATIONS PASSED')
    sys.exit(0)
"
```

---

## 第 5 章：提交与自动部署

### 方式一：直接推送到 main（推荐，最快）

如果 Agent 有仓库的直接 push 权限：

```bash
# 1. 确认在 main 分支
git branch --show-current   # 必须是 "main"

# 2. 仅 stage data/ 文件（逐个添加，禁止 git add .）
git add data/companies.json
git add data/financials.json
git add data/operational.json
git add data/news.json
git add data/sentiment.json
git add data/analysis_data.json
git add data/btc_price_predictions.json
git add data/raw_reports/    # 如有新 raw_reports

# 3. 运行验证脚本（第 4 章），必须全部通过

# 4. 确认只 stage 了 data/ 文件
git diff --cached --name-only | grep -v '^data/' && echo "ERROR: staged non-data files!" && exit 1

# 5. 提交
git commit -m "data: {简要描述}"
# 示例:
# "data: update stock prices for 22 companies"
# "data: add MARA Q4 2024 financials from 10-K"
# "data: 5 new news articles, social sentiment update"

# 6. 推送
git push origin main

# 7. 验证部署（等待 1-2 分钟）
curl -s -o /dev/null -w "%{http_code}" https://btcmine.info
# 应返回 200
```

**推送到 main 后，GitHub Actions 自动部署到 GitHub Pages，约 60 秒内生效。**

### 方式二：通过 Pull Request（自动合并）

如果 Agent 通过 PR 提交：

```bash
# 1. 创建新分支
git checkout -b data-update-YYYY-MM-DD

# 2. 修改数据文件 + 验证（同上）

# 3. 提交
git add data/...
git commit -m "data: {简要描述}"

# 4. 推送并创建 PR
git push origin data-update-YYYY-MM-DD
gh pr create --title "data: {简要描述}" --body "自动数据更新" --base main

# 5. 切回 main
git checkout main
```

**PR 会被自动合并**: 仓库配置了 `auto-merge-data.yml` GitHub Action，当 PR 满足以下条件时自动审批并 squash merge：
- 仅修改了 `data/` 目录下的文件
- 所有 JSON 文件语法合法

合并后自动触发 `deploy.yml` → GitHub Pages 重新部署。**全程无需人工干预。**

### 自动合并的工作原理

```
Agent 创建 PR (只改 data/ 文件)
    ↓
auto-merge-data.yml 触发
    ↓
检查: PR 中所有文件是否都在 data/ 目录下？
    ↓ 是
验证: 所有 data/*.json 文件 JSON 语法是否合法？
    ↓ 通过
自动审批 + squash merge 到 main
    ↓
deploy.yml 触发 → GitHub Pages 部署
    ↓
btcmine.info 更新（约 60 秒）
```

如果 PR 包含 `data/` 以外的文件，自动合并**不会执行**，需要人工审核。

---

## 第 6 章：数据清理

### 新闻清理

保留最近 6 个月的新闻，更早的可以清理：
```
1. 读取 news.json
2. 找到所有 published_at 超过 6 个月的记录
3. 删除这些记录
4. 注意: id 编号不需要重排，新记录继续递增即可
```

### 社交情绪清理

每个 ticker 只保留最新一条 social_sentiment 记录，旧的可以删除。

### 过时预测清理

`btc_price_predictions.json` 中已过去的年份预测可以保留作为历史参考，但需标注实际结果。

### 退市公司处理

- `companies.json`: `active` 设为 `false`，记录保留
- 其他数据文件: 历史数据保留，停止采集新数据
- 示例: SDIG (2025-03 并入 BITF)

---

## 第 7 章：采集报告格式

每次采集完成后输出报告：

```markdown
## 采集报告 - {DATE}

### 更新的文件
| 文件 | 操作 | 记录数变化 |
|------|------|-----------|
| data/companies.json | 更新 stock_price/market_cap | 22 家 |
| data/news.json | 新增 3 条新闻 | 总计 28 条 |

### 新采集数据明细
| Ticker | 数据类型 | 周期 | 来源 | 关键指标 |
|--------|---------|------|------|---------|
| MARA | 财务 | Q4 2024 | 10-K | Revenue $264.3M |

### 验证结果
ALL VALIDATIONS PASSED

### Git
- Commit: abc1234
- Push: success
- Site: 200 OK
```

---

## 第 8 章：特殊情况 FAQ

**Q: 数据源暂时不可用？**
A: 跳过该来源，用备选。在 commit message 注明。不要因一个来源故障停止整个任务。

**Q: BTC 公允价值变动导致 net_income 异常？**
A: 正常填入。2024 起 ASC 350 生效，unrealized gain/loss 计入利润表。在 `notes` 注明。

**Q: 10-Q 现金流是 YTD 累计？**
A: 优先填单季度数据（当季 YTD - 上季 YTD）。无法计算则填 YTD 并在 notes 标注。

**Q: Press Release 和 SEC filing 数据不一致？**
A: 优先 SEC filing（已审计/已审阅）。

**Q: companies.json 中公司信息有误？**
A: Agent 不可修改基础信息。在采集报告中标注问题，等待人工修正。

**Q: StockTwits 数据采集不到？**
A: 填 `null`。前端会优雅处理。

**Q: 外国私人发行人（20-F）vs 10-K？**
A: 20-F 通常在财年结束后 4 个月内提交（vs 10-K 的 60-90 天）。FUFU、BTDR、IREN、SAIH 使用 20-F/6-K。

---

## 附录：公司速查表

| # | Ticker | 公司名称 | 交易所 | SEC Filing | 财年截止 | IR URL |
|---|--------|---------|--------|-----------|---------|--------|
| 1 | FUFU | BitFuFu Inc. | NASDAQ | 20-F/6-K | 12月 | ir.bitfufu.com |
| 2 | MARA | Marathon Digital Holdings | NASDAQ | 10-K/10-Q | 12月 | ir.mara.com |
| 3 | RIOT | Riot Platforms | NASDAQ | 10-K/10-Q | 12月 | ir.riotplatforms.com |
| 4 | CLSK | CleanSpark | NASDAQ | 10-K/10-Q | **9月** | ir.cleanspark.com |
| 5 | CORZ | Core Scientific | NASDAQ | 10-K/10-Q | 12月 | investors.corescientific.com |
| 6 | CIFR | Cipher Mining | NASDAQ | 10-K/10-Q | 12月 | ir.ciphermining.com |
| 7 | HUT | Hut 8 Corp | NASDAQ | 10-K/10-Q | 12月 | hut8.com/investors |
| 8 | WULF | TeraWulf | NASDAQ | 10-K/10-Q | 12月 | terawulf.com/investors |
| 9 | IREN | Iris Energy | NASDAQ | 20-F/6-K | **6月** | irisenergy.co/investors |
| 10 | BITF | Bitfarms | NASDAQ | 10-K/10-Q | 12月 | bitfarms.com/investors |
| 11 | BTBT | Bit Digital | NASDAQ | 10-K/10-Q | 12月 | ir.bit-digital.com |
| 12 | BTDR | Bitdeer Technologies | NASDAQ | 20-F/6-K | 12月 | ir.bitdeer.com |
| 13 | APLD | Applied Digital | NASDAQ | 10-K/10-Q | **5月** | ir.applieddigital.com |
| 14 | HIVE | HIVE Digital Technologies | NASDAQ | 10-K/10-Q | **3月** | hivedigitaltechnologies.com/investors |
| 15 | GREE | Greenidge Generation | NASDAQ | 10-K/10-Q | 12月 | ir.greenidge.com |
| 16 | ABTC | American Bitcoin | NASDAQ | 10-K/10-Q | 12月 | — |
| 17 | ANY | Sphere 3D | NASDAQ | 10-K/10-Q | 12月 | sphere3d.com/investors |
| 18 | SLNH | Soluna Holdings | NASDAQ | 10-K/10-Q | 12月 | solunacomputing.com/investors |
| 19 | GPUS | Hyperscale Data | NYSE American | 10-K/10-Q | 12月 | hyperscaledata.com/investors |
| 20 | DGXX | Digi Power X | NASDAQ | 10-K/10-Q | 12月 | investors.digipowerx.com |
| 21 | MIGI | Mawson Infrastructure | NASDAQ | 10-K/10-Q | **6月** | mawsoninc.com/investors |
| 22 | SAIH | SAIHEAT | NASDAQ | 20-F/6-K | **6月** | ir.saiheat.com |

**Ticker 变更历史**: AULT→GPUS (2024-09), DGHI→DGXX (2025-03), SAI→SAIH (2024-09), SDIG→退市并入 BITF (2025-03)
