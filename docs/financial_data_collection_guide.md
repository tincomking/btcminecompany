# BTC Mining Company 财务数据采集指南

> 本文档供 AI Agent 定时执行，用于为 btcmine.info 平台持续采集各上市矿企的真实财务数据。

---

## ⚠️ 安全红线（Agent 必读）

> **以下规则绝对不可违反。上一次 Agent 因违反这些规则，删除了网站核心文件，导致 btcmine.info 完全崩溃。**

### 禁止操作清单

| # | 禁止操作 | 原因 |
|---|---------|------|
| 1 | **禁止删除任何非 `data/` 目录的文件** | Agent 删除了 `Analysis/*.js`、`CNAME`、`css/style.css`、`js/i18n.js`，导致网站崩溃 |
| 2 | **禁止修改以下文件**: `index.html`、`js/app.js`、`js/data.js`、`js/i18n.js`、`css/style.css`、`Analysis/*.js`、`CNAME`、`.github/` | 这些是网站核心代码，数据采集 Agent 无权修改 |
| 3 | **禁止修改 JSON 文件结构/Schema** | Agent 将 `financials.json` 从纯数组 `{data:[...]}` 改为 `{_meta:{...}, data:[...]}` 结构，导致网站解析失败 |
| 4 | **禁止推送到非 `main` 分支** | Agent 推送到了其他分支，但 GitHub Pages 部署该分支，导致未经审核的代码上线 |
| 5 | **禁止创建新分支** | 所有数据采集变更直接提交到 `main` 分支 |
| 6 | **禁止 `git push --force`** | 可能覆盖他人提交 |

### 允许操作范围

Agent **只能**操作以下文件：

```
✅ 可新增/修改:
  data/raw_reports/{TICKER}/{YEAR}_{PERIOD}.json  — 原始财报数据

✅ 可修改（不可改变结构）:
  data/financials.json      — 仅在 data 数组中 添加/更新 记录
  data/analysis_data.json   — 仅在 data 对象中 添加/更新 公司条目

❌ 不可触碰:
  index.html, js/*, css/*, Analysis/*, CNAME, .github/*, docs/*
  data/companies.json (公司列表，仅人工维护)
```

### JSON Schema 保护

**`data/financials.json` 的结构必须是**:
```json
{
  "data": [
    { "ticker": "...", "fiscal_year": 2024, "fiscal_quarter": "FY", ... }
  ]
}
```
- 顶层只有 `data` 键，值是数组
- **禁止添加 `_meta` 或任何其他顶层键**
- 数组中每条记录的字段见第 5.1 节

**`data/analysis_data.json` 的结构必须是**:
```json
{
  "data": {
    "FUFU": { "name": "...", "current": {...}, "prior": {...}, "market": {...} },
    "MARA": { ... }
  }
}
```
- 顶层只有 `data` 键，值是对象
- **禁止添加 `_meta` 或任何其他顶层键**
- 每家公司的子结构见第 5.2 节

### 提交前检查清单

每次 `git push` 前，Agent **必须**执行：

```bash
# 1. 确认只修改了 data/ 下的文件
git diff --name-only HEAD | grep -v '^data/' && echo "❌ ERROR: 修改了 data/ 以外的文件！" && exit 1

# 2. 确认 financials.json 结构完整
python3 -c "
import json
d = json.load(open('data/financials.json'))
assert isinstance(d, dict), 'Root must be dict'
assert list(d.keys()) == ['data'], f'Root keys must be [data], got {list(d.keys())}'
assert isinstance(d['data'], list), 'data must be list'
for r in d['data']:
    assert 'ticker' in r and 'fiscal_year' in r, f'Missing required fields in record'
print(f'✅ financials.json: {len(d[\"data\"])} records, schema OK')
"

# 3. 确认 analysis_data.json 结构完整
python3 -c "
import json
d = json.load(open('data/analysis_data.json'))
assert isinstance(d, dict), 'Root must be dict'
assert list(d.keys()) == ['data'], f'Root keys must be [data], got {list(d.keys())}'
assert isinstance(d['data'], dict), 'data must be dict'
for ticker, info in d['data'].items():
    assert 'current' in info and 'prior' in info and 'market' in info, f'{ticker} missing required sections'
print(f'✅ analysis_data.json: {len(d[\"data\"])} companies, schema OK')
"

# 4. 确认在 main 分支
git branch --show-current | grep -q '^main$' || echo "❌ ERROR: 不在 main 分支！"

# 5. 只推送到 main
git push origin main
```

### 上次事故回顾

**日期**: 2026-02-26
**影响**: btcmine.info 完全不可用

**Agent 做了什么错误操作**:
1. 删除了 6 个分析模型文件 (`Analysis/beneish.js` 等)
2. 删除了 CNAME 文件（自定义域名配置）
3. 删除了 `css/style.css`（整个样式表）
4. 删除了 `js/i18n.js`（国际化系统）
5. 重写了 `index.html`、`js/app.js`、`js/data.js`
6. 将 JSON 文件结构从 `{data:[...]}` 改为 `{_meta:{...}, data:[...]}`
7. 推送到了非 main 分支

**根本原因**: Agent 没有理解自己的操作范围仅限于 `data/` 目录，擅自重写了整个网站。

---

## 1. 概览

### 1.1 项目背景
本项目是一个 BTC 矿企情报平台（btcmine.info），需要为 23 家上市比特币矿企持续采集真实财务报表数据。

### 1.2 采集范围

**时间范围**: 2023 Q1 至今（含未来新发布的财报）

**报告类型**:
| 类型 | 标识 | SEC 文件 | 说明 |
|------|------|---------|------|
| 季报 | Q1, Q2, Q3, Q4 | 10-Q / 6-K | 每季度一份 |
| 半年报 | H1, H2 | 部分外国发行人用 6-K | 仅部分公司发布 |
| 年报 | FY | 10-K / 20-F | 包含全年合并数据 |

**优先级**: FY > Q4 > Q3 > Q2 > Q1 > H1/H2

### 1.3 采集状态总览（2026-02-26 第二次验证）

> **总体进度**: Agent 创建了 ~230 个 raw_reports 文件，但绝大部分财务数据为 null（空壳文件）。仅 FUFU/MARA/RIOT/CLSK 有真实完整数据。其余公司需要**重新采集并填入真实数据**。
>
> **上次 Agent 的问题**: Agent 创建了文件结构但没有从 SEC EDGAR 或财经平台抓取真实数字。大部分 income_statement/balance_sheet/cash_flow_statement 字段全部为 null。

| # | Ticker | 公司名称 | SEC Filing | 财年截止月 | raw_reports 状态 | 数据质量 | 页面同步 | 优先级 |
|---|--------|---------|-----------|-----------|-----------------|---------|---------|--------|
| 1 | FUFU | BitFuFu Inc. | 20-F / 6-K | 12月 | FY2023✅ FY2024✅ | **完整**(SEC验证) | ✅ 已同步 | P0-补季报 |
| 2 | MARA | Marathon Digital | 10-K / 10-Q | 12月 | FY2023✅ FY2024✅ + Q空壳 | **FY完整**, Q为空 | ✅ FY已同步 | P0-补季报实际数据 |
| 3 | RIOT | Riot Platforms | 10-K / 10-Q | 12月 | FY2023✅ FY2024✅ + Q空壳 | **FY完整**, Q为空 | ✅ FY已同步 | P0-补季报实际数据 |
| 4 | CLSK | CleanSpark | 10-K / 10-Q | **9月** | FY2023✅ FY2024✅ + Q空壳 | **FY完整**, Q为空 | ✅ FY已同步 | P0-补季报实际数据 |
| 5 | CORZ | Core Scientific | 10-K / 10-Q | 12月 | FY有但稀疏 + Q空壳 | **极不完整**(30%填充) | ❌ | **P1-重新采集** |
| 6 | CIFR | Cipher Mining | 10-K / 10-Q | 12月 | FY有但部分 + Q空壳 | **不完整**(60%填充) | ❌ | **P1-重新采集** |
| 7 | HUT | Hut 8 Corp | 10-K / 10-Q | 12月 | FY有但部分 + Q空壳 | **不完整**(65%填充) | ❌ | **P1-重新采集** |
| 8 | WULF | TeraWulf | 10-K / 10-Q | 12月 | FY有但稀疏 + Q空壳 | **极不完整**(45%填充) | ❌ | **P1-重新采集** |
| 9 | IREN | Iris Energy | 20-F / 6-K | **6月** | Q空壳 | **全部为null** | ❌ | **P1-全量** |
| 10 | BITF | Bitfarms | 10-K / 10-Q | 12月 | FY有但稀疏 + Q空壳 | **极不完整**(40%填充) | ❌ | **P2-重新采集** |
| 11 | BTBT | Bit Digital | 10-K / 10-Q | 12月 | FY有但部分 + Q空壳 | **不完整**(65%填充) | ❌ | **P2-重新采集** |
| 12 | BTDR | Bitdeer Technologies | 20-F / 6-K | 12月 | Q空壳 | **全部为null** | ❌ | **P2-全量** |
| 13 | APLD | Applied Digital | 10-K / 10-Q | **5月** | Q空壳 | **全部为null** | ❌ | **P2-全量** |
| 14 | HIVE | HIVE Digital | 10-K / 10-Q | **3月** | Q空壳 | **全部为null** | ❌ | **P2-全量** |
| 15 | SDIG | Stronghold Digital | 10-K / 10-Q | 12月 | FY有但稀疏 + Q空壳 | **极不完整**(45%填充) | ❌ | **P2-重新采集** |
| 16 | GREE | Greenidge Generation | 10-K / 10-Q | 12月 | Q空壳 | **全部为null** | ❌ | **P3-全量** |
| 17 | ABTC | American Bitcoin | 10-K / 10-Q | 12月 | Q空壳 | **全部为null** | ❌ | **P3-全量** |
| 18 | ANY | Sphere 3D | 10-K / 10-Q | 12月 | Q空壳 | **全部为null** | ❌ | **P3-全量** |
| 19 | SLNH | Soluna Holdings | 10-K / 10-Q | 12月 | Q空壳 | **全部为null** | ❌ | **P3-全量** |
| 20 | AULT | Ault Alliance | 10-K / 10-Q | 12月 | Q空壳 | **全部为null** | ❌ | **P3-全量** |
| 21 | DGHI | Digihost Technology | 20-F / 6-K | 12月 | Q空壳 | **全部为null** | ❌ | **P3-全量** |
| 22 | MIGI | Mawson Infrastructure | 10-K / 10-Q | **6月** | Q空壳 | **全部为null** | ❌ | **P3-全量** |
| 23 | SAI | SAI.TECH | 20-F / 6-K | **6月** | Q空壳 | **全部为null** | ❌ | **P3-全量** |

> **"空壳文件"说明**: Agent 创建了符合格式的 JSON 文件，但 income_statement、balance_sheet、cash_flow_statement 中所有数值字段均为 null。这些文件的结构可以保留，但**必须填入真实数据**。

### 1.4 优先级说明

- **P0-补季报**: 已有 FY 数据的 4 家公司，需补充 2023-2024 所有季报 + 同步页面数据
- **P1-全量**: 大型矿企，需从零开始全量采集（FY + 所有季报）+ 同步页面数据 + 更新 analysis_data.json 替换模拟数据
- **P2-全量**: 中型矿企，同 P1
- **P3-全量**: 小型/数据可能有限的公司

### 1.5 页面数据同步状态

| 数据文件 | 状态 | 详情 |
|---------|------|------|
| `data/financials.json` | 4家真实 | FUFU/MARA/RIOT/CLSK 有真实 FY 数据；其余公司仅有基础 Q4 估算数据（来自初始数据） |
| `data/analysis_data.json` | 4/12 真实 | FUFU/MARA/RIOT/CLSK 为真实 SEC 数据；CORZ/CIFR/HUT/WULF/IREN/BITF/BTDR/BTBT 为模拟数据；11 家公司完全缺失 |

> **Agent 上次的问题**: Agent 试图重写 financials.json 和 analysis_data.json 的整体结构（添加 `_meta` 字段），导致网站解析失败。**请严格遵守现有 JSON Schema，仅在 data 数组/对象中添加或更新记录。**

> **注意**: 标记为 20-F/6-K 的为外国私人发行人。粗体月份为非标准财年。

---

## 2. 数据格式规范

### 2.1 文件位置和命名

```
data/raw_reports/{TICKER}/{YEAR}_{PERIOD}.json
```

- `{TICKER}` — 股票代码，大写
- `{YEAR}` — 年份（如 2024, 2023）
- `{PERIOD}` — 周期标识：
  - `FY` — 全年
  - `Q1` — 第一季度
  - `Q2` — 第二季度
  - `Q3` — 第三季度
  - `Q4` — 第四季度
  - `H1` — 上半年（仅部分公司）
  - `H2` — 下半年（仅部分公司）

**示例**:
```
data/raw_reports/FUFU/2024_FY.json
data/raw_reports/FUFU/2024_Q4.json
data/raw_reports/FUFU/2024_Q3.json
data/raw_reports/MARA/2023_Q1.json
data/raw_reports/IREN/2024_H1.json
```

### 2.2 采集周期要求

每家公司需要采集 **2023 Q1 至今** 所有已发布的财报：

| 财年截止12月的公司 | 需采集的周期 |
|-------------------|-------------|
| 2023年 | 2023_Q1, 2023_Q2, 2023_Q3, 2023_Q4, 2023_FY |
| 2024年 | 2024_Q1, 2024_Q2, 2024_Q3, 2024_Q4, 2024_FY |
| 2025年 | 已发布的季报（如 2025_Q1 等） |

> 非标准财年公司（CLSK 9月、IREN/MIGI/SAI 6月、APLD 5月、HIVE 3月）按其实际财年季度采集。

### 2.3 JSON Schema

```json
{
  "ticker": "FUFU",
  "company_name": "BitFuFu Inc.",
  "period": "2024_Q4",
  "period_type": "quarterly",
  "period_end_date": "2024-12-31",
  "currency": "USD",
  "unit": "millions",
  "source": "SEC 10-Q / Press Release",
  "collected_date": "2026-02-26",
  "notes": "",
  "income_statement": {
    "revenue": null,
    "cogs": null,
    "gross_profit": null,
    "sga": null,
    "depreciation": null,
    "operating_income": null,
    "net_income": null,
    "ebit": null,
    "eps_diluted": null
  },
  "balance_sheet": {
    "total_assets": null,
    "current_assets": null,
    "cash_and_equivalents": null,
    "receivables": null,
    "ppe_net": null,
    "total_liabilities": null,
    "current_liabilities": null,
    "long_term_debt": null,
    "retained_earnings": null,
    "total_equity": null,
    "shares_outstanding_m": null
  },
  "cash_flow_statement": {
    "operating_cash_flow": null,
    "investing_cash_flow": null,
    "financing_cash_flow": null,
    "capex": null,
    "free_cash_flow": null
  },
  "market_data": {
    "stock_price": null,
    "market_cap": null,
    "btc_held": null
  }
}
```

新增字段说明：
- `period_type` — `"annual"` / `"quarterly"` / `"semi_annual"`，用于区分报告类型
- `collected_date` — Agent 采集日期，ISO 格式 `"YYYY-MM-DD"`

### 2.4 字段详细说明

#### 元数据字段
| 字段 | 类型 | 说明 |
|------|------|------|
| `ticker` | string | 股票代码，大写 |
| `company_name` | string | 公司全称 |
| `period` | string | 周期标识，如 "2024_FY"、"2024_Q4"、"2024_H1" |
| `period_type` | string | `"annual"` / `"quarterly"` / `"semi_annual"` |
| `period_end_date` | string | 周期截止日期，ISO 格式 |
| `currency` | string | 固定 "USD" |
| `unit` | string | 固定 "millions" |
| `source` | string | 如 "SEC 10-K"、"SEC 10-Q"、"SEC 20-F"、"Press Release" |
| `collected_date` | string | Agent 执行采集的日期 |
| `notes` | string | 备注（特殊情况说明） |

#### Income Statement（利润表）
| 字段 | 英文名 | 说明 |
|------|--------|------|
| `revenue` | Total Revenue | 总营收 |
| `cogs` | Cost of Revenue | 营业成本（含折旧或不含折旧，按公司报表原样填写） |
| `gross_profit` | Gross Profit | 毛利润 = revenue - cogs |
| `sga` | SG&A | 销售、一般及行政费用 |
| `depreciation` | D&A | 折旧摊销（如在 COGS 中已包含，此处仍单独列出金额） |
| `operating_income` | Operating Income | 营业利润 |
| `net_income` | Net Income | 净利润 |
| `ebit` | EBIT | 息税前利润 |
| `eps_diluted` | Diluted EPS | 稀释每股收益 |

#### Balance Sheet（资产负债表）
| 字段 | 英文名 | 说明 |
|------|--------|------|
| `total_assets` | Total Assets | 总资产 |
| `current_assets` | Current Assets | 流动资产 |
| `cash_and_equivalents` | Cash | 现金及等价物 |
| `receivables` | Receivables | 应收账款（贸易应收） |
| `ppe_net` | PP&E Net | 固定资产净值 |
| `total_liabilities` | Total Liabilities | 总负债 |
| `current_liabilities` | Current Liabilities | 流动负债 |
| `long_term_debt` | Long-term Debt | 长期债务（贷款 + 应付票据，不含经营租赁） |
| `retained_earnings` | Retained Earnings | 留存收益 / 累计亏损 |
| `total_equity` | Total Equity | 总股东权益 |
| `shares_outstanding_m` | Shares Outstanding | 流通股数（百万） |

#### Cash Flow Statement（现金流量表）
| 字段 | 英文名 | 说明 |
|------|--------|------|
| `operating_cash_flow` | OCF | 经营活动现金流 |
| `investing_cash_flow` | ICF | 投资活动现金流 |
| `financing_cash_flow` | FCF | 融资活动现金流 |
| `capex` | CapEx | 资本支出（负值） |
| `free_cash_flow` | FCF | 自由现金流 = OCF + capex |

> **季报现金流注意**: 10-Q 中的现金流是年初至今（YTD）累计数。如需单季度数据，需用当季 YTD 减去上季 YTD。如无法计算，填 YTD 数据并在 notes 中标注 "YTD cumulative"。

#### Market Data（市场数据）
| 字段 | 英文名 | 说明 |
|------|--------|------|
| `stock_price` | Stock Price | 周期末收盘价（美元） |
| `market_cap` | Market Cap | 市值（百万美元） |
| `btc_held` | BTC Holdings | 持有 BTC 数量（个） |

---

## 3. 数据采集步骤

### 3.1 步骤概述

```
1. 检查该公司是否有新财报发布（SEC EDGAR RSS / 公司 IR 页面）
2. 确认报告周期（Q1/Q2/Q3/Q4/H1/H2/FY）
3. 从 SEC filing 或 Press Release 中提取三表数据
4. 补充市场数据（期末股价、市值、BTC 持仓）
5. 计算衍生字段（gross_profit, ebit, free_cash_flow）
6. 写入 raw_reports JSON 文件
7. 【关键】同步更新页面数据文件（详见第 5 节）
8. 提交并推送到 GitHub
```

### 3.2 数据来源（优先级从高到低）

1. **SEC EDGAR**（最权威）
   - 年报搜索: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={TICKER}&type=10-K&dateb=&owner=include&count=10`
   - 季报搜索: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={TICKER}&type=10-Q&dateb=&owner=include&count=20`
   - 外国发行人: type 改为 `20-F`（年报）或 `6-K`（季报）
   - EDGAR 全文搜索: `https://efts.sec.gov/LATEST/search-index?q={TICKER}&forms=10-K,10-Q,20-F,6-K`

2. **公司 IR 页面** — `{company-website}/investors` 或 `/ir`

3. **财经数据平台**
   - Stock Analysis: `https://stockanalysis.com/stocks/{TICKER}/financials/?p=quarterly`
   - Yahoo Finance: `https://finance.yahoo.com/quote/{TICKER}/financials`
   - Macrotrends: `https://www.macrotrends.net/stocks/charts/{TICKER}/`

### 3.3 单位转换

- 财报通常以"千元"（thousands）为单位
- **本项目统一以"百万"（millions）为单位**
- 转换: 千 → 百万，除以 1000，保留一位小数

### 3.4 衍生字段计算

| 字段 | 计算方法 |
|------|---------|
| `gross_profit` | `revenue - cogs` |
| `ebit` | `operating_income`（简化处理） |
| `free_cash_flow` | `operating_cash_flow + capex`（capex 为负值） |
| `market_cap` | `stock_price × shares_outstanding_m` |

### 3.5 处理 null 值

- 无法找到的数据保留 `null`
- **不要编造数据**
- 在 `notes` 中说明缺失原因

### 3.6 BTC 矿企特殊注意事项

1. **BTC 公允价值变动**: 2024 年起 ASC 350 生效，BTC 按公允价值计量，unrealized gain/loss 出现在利润表中
2. **收入构成**: 矿企收入可能含 Mining / Hosting / Cloud mining / HPC，全部汇总到 `revenue`
3. **折旧**: 矿机折旧可能在 COGS 中或单独列示，在 notes 中说明
4. **现金流分类**: BTC 买卖可能归类为经营或投资活动，不同公司处理不同
5. **已破产/重组**: CORZ 2022 年破产、2024 年重组完成，在 notes 中注明

---

## 4. 质量检查清单

每个文件写入后检查:

- [ ] `ticker` 与目录名一致
- [ ] `period` 和 `period_type` 匹配（FY→annual, Q1-Q4→quarterly, H1/H2→semi_annual）
- [ ] `period_end_date` 格式正确且与实际财年/季度对应
- [ ] 所有金额单位已转换为百万美元
- [ ] `gross_profit` ≈ `revenue` - `cogs`
- [ ] `total_assets` ≈ `total_liabilities` + `total_equity`（允许 ±5M 误差）
- [ ] `free_cash_flow` ≈ `operating_cash_flow` + `capex`
- [ ] `capex` 为负值或零
- [ ] `eps_diluted` 正负号与 `net_income` 一致
- [ ] `shares_outstanding_m` 单位是百万股
- [ ] `source` 标注了正确的 SEC 文件类型
- [ ] `collected_date` 已填写
- [ ] 无法确认的字段设为 `null`

---

## 5. 同步更新页面数据文件（必须执行）

> **重要**: `data/raw_reports/` 仅为原始存档，网页不直接读取。必须同步更新以下两个文件，数据才会在 btcmine.info 上生效。

### 5.1 文件 A: `data/financials.json`（"财务数据"页面）

此文件供"财务数据" Tab 展示。是一个 JSON 数组，**每条记录对应一个公司的一个报告周期**。

**支持的周期**: Q1, Q2, Q3, Q4, FY（均可添加）

**结构**:
```json
{
  "data": [
    {
      "ticker": "FUFU",
      "fiscal_year": 2024,
      "fiscal_quarter": "Q4",
      "period_label": "Q4 2024",
      "period_end_date": "2024-12-31",
      "report_date": "2025-03-25",
      "estimated_report_date": null,
      "is_reported": true,
      "revenue_usd_m": 120.5,
      "gross_profit_usd_m": 8.2,
      "operating_income_usd_m": 25.4,
      "net_income_usd_m": 22.1,
      "adjusted_ebitda_usd_m": 35.2,
      "eps_diluted": 0.14,
      "revenue_yoy_pct": 45.2,
      "gross_profit_yoy_pct": 80.3,
      "net_income_yoy_pct": null,
      "adjusted_ebitda_yoy_pct": null,
      "shares_outstanding_m": 163.1,
      "cash_and_equivalents_usd_m": 45.1,
      "btc_held": 1720,
      "total_debt_usd_m": 35.0,
      "notes": "说明文字"
    }
  ]
}
```

**字段映射**（raw_reports → financials.json）:

| raw_reports | financials.json | 说明 |
|-------------|----------------|------|
| `period` 中的年份 | `fiscal_year` | 如 2024 |
| `period` 中的类型 | `fiscal_quarter` | `"Q1"` / `"Q2"` / `"Q3"` / `"Q4"` / `"FY"` |
| — | `period_label` | 显示文字，如 `"Q4 2024"` / `"FY 2024"` |
| `period_end_date` | `period_end_date` | 直接复制 |
| — | `report_date` | 财报实际发布日期 |
| — | `is_reported` | 已发布填 `true` |
| `income_statement.revenue` | `revenue_usd_m` | |
| `income_statement.gross_profit` | `gross_profit_usd_m` | |
| `income_statement.operating_income` | `operating_income_usd_m` | |
| `income_statement.net_income` | `net_income_usd_m` | |
| `income_statement.eps_diluted` | `eps_diluted` | |
| `balance_sheet.shares_outstanding_m` | `shares_outstanding_m` | |
| `balance_sheet.cash_and_equivalents` | `cash_and_equivalents_usd_m` | |
| `balance_sheet.long_term_debt` | `total_debt_usd_m` | |
| `market_data.btc_held` | `btc_held` | |

**YoY 增长率计算**:
- 找到同一公司去年同期数据（如当前为 Q4 2024，则找 Q4 2023）
- `revenue_yoy_pct` = (当期 - 去年同期) / |去年同期| × 100
- 如果去年同期不存在或为负数，填 `null`

**操作步骤**:
1. 打开 `data/financials.json`
2. 在 `data` 数组中为该公司添加新记录（季度或年度各一条）
3. 如已存在同一 ticker + fiscal_year + fiscal_quarter 的记录，更新而非重复添加
4. 保存文件

### 5.2 文件 B: `data/analysis_data.json`（"财务分析"页面）

此文件供"财务分析"页面的 6 个分析模型使用。每家公司保留 **最近两个完整财年** 的对比数据。

**当有新年报时需更新**:
- 当某公司最新 FY 数据采集完成后，更新该公司的 `current` = 最新 FY，`prior` = 上一个 FY
- 季度数据不需要更新此文件（分析模型目前仅用年度数据）

**结构**:
```json
{
  "data": {
    "{TICKER}": {
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
        "(同 current 结构)"
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
}
```

**market 字段说明**:
- `equity_volatility` — 年化波动率，矿企典型 0.70-0.95
- `asset_volatility` — ≈ equity_volatility × (equity / assets)，典型 0.35-0.55
- `risk_free_rate` — 统一 `0.043`
- `revenue_growth_mean` — (current.revenue - prior.revenue) / prior.revenue
- `revenue_growth_std` — ≈ growth_mean × 0.3~0.5

---

## 6. 定时采集任务规范

### 6.1 每日采集任务

Agent 应每天执行以下检查:

```
每日任务: 检查并采集新发布的财务数据

1. 检查 SEC EDGAR RSS / 公司 IR 页面是否有新的 10-K / 10-Q / 20-F / 6-K
2. 对于有新 filing 的公司:
   a. 采集财报数据，写入 data/raw_reports/{TICKER}/{YEAR}_{PERIOD}.json
   b. 同步更新 data/financials.json（添加新记录）
   c. 如果是年报(FY)，同步更新 data/analysis_data.json（更新 current/prior）
3. 提交到 Git 并推送到 GitHub（自动触发 GitHub Pages 部署）
4. 输出采集报告（见 6.4）
```

### 6.2 新财报检测方法

**方法 A — SEC EDGAR RSS**:
```
https://efts.sec.gov/LATEST/search-index?q={TICKER}&forms=10-K,10-Q,20-F,6-K&dateRange=custom&startdt={YESTERDAY}&enddt={TODAY}
```

**方法 B — 公司新闻稿**:
- 搜索 "{TICKER} earnings results" 或 "{COMPANY_NAME} quarterly results"
- 检查公司 IR 页面的 Press Releases 部分

**方法 C — 财经平台**:
- Stock Analysis: `https://stockanalysis.com/stocks/{TICKER}/financials/?p=quarterly` 检查是否有新数据

### 6.3 Agent 执行模板

#### 模板 A: 首次全量采集（每家公司执行一次）

```
任务: 为 {TICKER} ({COMPANY_NAME}) 全量采集 2023-至今 财务数据

1. 查找该公司 2023 年至今的所有 SEC 年报和季报
2. 按时间顺序逐个提取:
   - 2023_Q1, 2023_Q2, 2023_Q3, 2023_Q4, 2023_FY
   - 2024_Q1, 2024_Q2, 2024_Q3, 2024_Q4, 2024_FY
   - 2025 年已发布的报告
3. 每个周期写入 data/raw_reports/{TICKER}/{YEAR}_{PERIOD}.json
4. 将所有周期数据同步到 data/financials.json
5. 用最近两个 FY 更新 data/analysis_data.json
6. 所有金额转换为百万美元，保留一位小数
7. 无法找到的数据设为 null，在 notes 中说明
8. 提交并推送到 GitHub
```

#### 模板 B: 日常增量采集

```
任务: 每日增量检查并采集新财报

1. 遍历 23 家公司，检查是否有新 SEC filing 或 Press Release
2. 对有新数据的公司:
   a. 采集该周期数据，写入 raw_reports
   b. 更新 financials.json
   c. 如为年报，更新 analysis_data.json
3. 提交并推送
4. 输出采集报告
```

### 6.4 采集报告格式

每次采集后输出以下报告:

```markdown
## 采集报告 - {DATE}

### 新采集数据
| Ticker | 周期 | 类型 | 来源 | 关键指标 |
|--------|------|------|------|---------|
| FUFU | 2025_Q1 | 季报 | 6-K | Revenue: $125.4M, NI: $18.2M |

### 数据完整性
| Ticker | 总周期数 | 已采集 | 缺失 |
|--------|---------|--------|------|
| FUFU | 10 | 8 | 2025_Q1, 2025_Q2 (未发布) |

### 文件更新
- [x] data/raw_reports/FUFU/2025_Q1.json — 新增
- [x] data/financials.json — 新增 1 条记录
- [ ] data/analysis_data.json — 无需更新（非年报）

### Git 操作
- Commit: {commit_hash}
- Push: 成功 / 失败
```

---

## 7. Git 操作与发布

### 7.1 分支规则（强制）

- **只能在 `main` 分支上工作**
- **只能推送到 `main` 分支**: `git push origin main`
- **禁止创建新分支**、**禁止 force push**
- 推送前运行安全检查清单（见「安全红线」一节）

### 7.2 提交规范

```bash
# ⚠️ 重要: 只 add data/ 下的文件，绝不 add 其他目录
# 单家公司
git add data/raw_reports/{TICKER}/ data/financials.json data/analysis_data.json
git commit -m "data({TICKER}): add {PERIOD} financial data from {SOURCE}"

# 批量采集
git add data/raw_reports/ data/financials.json data/analysis_data.json
git commit -m "data: daily collection - {N} new reports for {TICKERS}"

# ❌ 禁止使用:
# git add .          ← 会 stage 非 data/ 文件
# git add -A         ← 同上
# git add --all      ← 同上

# 推送前检查（必须执行）
git diff --name-only HEAD | grep -v '^data/' && echo "❌ 包含非 data/ 文件，请撤销！" && exit 1
git branch --show-current | grep -q '^main$' || echo "❌ 不在 main 分支！" && exit 1

# 推送（触发 GitHub Pages 部署）
git push origin main
```

### 7.3 发布到 btcmine.info

推送到 `main` 分支后，GitHub Pages 会自动部署。通常 1-3 分钟后在 btcmine.info 生效。

**验证步骤**:
1. 打开 `https://btcmine.info`
2. 切换到"财务数据"页面 → 选择对应公司/周期，确认数据显示
3. 如为年报更新，切换到"财务分析"页面 → 确认分析模型计算结果正确
4. 检查浏览器控制台无 JSON 解析错误
5. 确认网站各页面正常加载（Overview、财务数据、财务分析、情绪分析）

### 7.4 回滚

如果推送后页面显示异常:
```bash
git revert HEAD
git push origin main
```

### 7.5 故障排查

如果网站出错，优先检查:
1. `data/financials.json` 是否为合法 JSON（`python3 -c "import json; json.load(open('data/financials.json'))"`)
2. `data/analysis_data.json` 是否为合法 JSON
3. JSON 结构是否被改变（顶层只有 `data` 键）
4. 是否意外修改了 `data/` 以外的文件

---

## 8. 特殊情况处理

### Q: 有些公司可能已退市或数据很少怎么办？
A: 在 `notes` 中说明情况，尽量填充能找到的数据。

### Q: 外国私人发行人（20-F）与 10-K 有什么区别？
A: 20-F 通常在财年结束后 4 个月内提交（vs 10-K 的 60-90 天），季度用 6-K 而非 10-Q。

### Q: 如果公司改了财年截止日怎么办？
A: 在 `notes` 中说明，`period_end_date` 填写实际截止日期。

### Q: BTC 公允价值变动导致 net_income 异常大怎么办？
A: 正常填入。在 `notes` 中注明包含 unrealized gain/loss on digital assets。

### Q: 10-Q 中的现金流是 YTD 累计的怎么办？
A: 优先填写单季度数据（当季 YTD - 上季 YTD）。如无法计算，填 YTD 数据并在 notes 标注。

### Q: Press Release 和 SEC filing 数据不一致怎么办？
A: 优先使用 SEC filing（已审计/已审阅），Press Release 数据标注为 "unaudited"。

---

## 附录: 参考示例

已完成的 FUFU 2024_FY 文件（真实 SEC 数据）:

```json
{
  "ticker": "FUFU",
  "company_name": "BitFuFu Inc.",
  "period": "2024_FY",
  "period_type": "annual",
  "period_end_date": "2024-12-31",
  "currency": "USD",
  "unit": "millions",
  "source": "SEC 20-F (filed 2025-04-21); Press Release 2025-03-25",
  "collected_date": "2026-02-26",
  "notes": "D&A ($24.7M) included in COGS. Operating income includes unrealized BTC gain $44.3M and realized BTC gain $31.3M. Adjusted EBITDA: $117.5M.",
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
