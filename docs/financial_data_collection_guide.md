# BTC Mining Company 财务数据采集指南

> 本文档供 AI Agent 或人工操作员参考，用于为 btcmine.info 平台补充各上市矿企的真实财务数据。

---

## 1. 概览

### 1.1 项目背景
本项目是一个 BTC 矿企情报平台（btcmine.info），需要为 23 家上市比特币矿企采集真实财务报表数据。数据存放在 `data/raw_reports/{TICKER}/` 目录下，每家公司每个财务周期一个 JSON 文件。

### 1.2 已完成的公司（无需重复采集）
| Ticker | 公司名称 | 已采集周期 |
|--------|---------|-----------|
| FUFU | BitFuFu Inc. | 2023_FY, 2024_FY |
| MARA | Marathon Digital Holdings | 2023_FY, 2024_FY |
| RIOT | Riot Platforms | 2023_FY, 2024_FY |
| CLSK | CleanSpark | 2023_FY, 2024_FY |

### 1.3 待采集的公司（19家）
| Ticker | 公司名称 | SEC Filing Type | 财年截止月 |
|--------|---------|----------------|-----------|
| CORZ | Core Scientific | 10-K / 10-Q | 12月 |
| CIFR | Cipher Mining | 10-K / 10-Q | 12月 |
| HUT | Hut 8 Corp | 10-K / 10-Q | 12月 |
| WULF | TeraWulf | 10-K / 10-Q | 12月 |
| IREN | Iris Energy | 20-F / 6-K | 6月 |
| APLD | Applied Digital | 10-K / 10-Q | 5月 |
| BITF | Bitfarms | 10-K / 10-Q | 12月 |
| SDIG | Stronghold Digital Mining | 10-K / 10-Q | 12月 |
| BTBT | Bit Digital | 10-K / 10-Q | 12月 |
| BTDR | Bitdeer Technologies | 20-F / 6-K | 12月 |
| HIVE | HIVE Digital Technologies | 10-K / 10-Q | 3月 |
| GREE | Greenidge Generation | 10-K / 10-Q | 12月 |
| ABTC | American Bitcoin | 10-K / 10-Q | 12月 |
| ANY | Sphere 3D | 10-K / 10-Q | 12月 |
| SLNH | Soluna Holdings | 10-K / 10-Q | 12月 |
| AULT | Ault Alliance | 10-K / 10-Q | 12月 |
| DGHI | Digihost Technology | 20-F / 6-K | 12月 |
| MIGI | Mawson Infrastructure | 10-K / 10-Q | 6月 |
| SAI | SAI.TECH | 20-F / 6-K | 6月 |

> **注意**: 标记为 20-F/6-K 的为外国私人发行人（Foreign Private Issuer），在 SEC EDGAR 上的搜索方式不同。某些公司财年截止月并非 12 月，采集时需特别注意。

---

## 2. 数据格式规范

### 2.1 文件位置和命名

```
data/raw_reports/{TICKER}/{YEAR}_{PERIOD}.json
```

- `{TICKER}` — 股票代码，大写（如 CORZ, CIFR）
- `{YEAR}` — 年份（如 2024, 2023）
- `{PERIOD}` — 周期标识：
  - `FY` — 全年（Annual / Full Year）
  - `Q1` — 第一季度
  - `Q2` — 第二季度
  - `Q3` — 第三季度
  - `Q4` — 第四季度

**示例**:
```
data/raw_reports/CORZ/2024_FY.json
data/raw_reports/CORZ/2023_FY.json
data/raw_reports/CIFR/2024_Q4.json
```

### 2.2 每家公司至少需要采集的文件
1. **最近一个完整财年** — 如 `2024_FY.json`
2. **上一个完整财年** — 如 `2023_FY.json`

> 两期数据是必需的，因为财务分析模型（Beneish M-Score、Piotroski F-Score 等）需要比较当期与上期的数据变化。

### 2.3 JSON Schema

每个文件必须严格遵循以下结构：

```json
{
  "ticker": "CORZ",
  "company_name": "Core Scientific, Inc.",
  "period": "2024_FY",
  "period_end_date": "2024-12-31",
  "currency": "USD",
  "unit": "millions",
  "source": "SEC 10-K",
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

### 2.4 字段详细说明

#### 元数据字段
| 字段 | 类型 | 说明 |
|------|------|------|
| `ticker` | string | 股票代码，大写 |
| `company_name` | string | 公司全称 |
| `period` | string | 周期标识，如 "2024_FY"、"2024_Q4" |
| `period_end_date` | string | 周期截止日期，ISO 格式 "YYYY-MM-DD" |
| `currency` | string | 固定 "USD" |
| `unit` | string | 固定 "millions"（所有金额单位为百万美元） |
| `source` | string | 数据来源，如 "SEC 10-K"、"SEC 20-F"、"SEC 10-Q" |
| `notes` | string | 可选备注，如特殊财年日期、破产重组等说明 |

#### Income Statement（利润表）
| 字段 | 英文名 | 说明 | 在财报中的位置 |
|------|--------|------|---------------|
| `revenue` | Total Revenue | 总营收 | Consolidated Statements of Operations → Total revenues |
| `cogs` | Cost of Goods Sold | 营业成本/销货成本 | Cost of revenues / Cost of mining |
| `gross_profit` | Gross Profit | 毛利润 = revenue - cogs | 通常需自行计算 |
| `sga` | SG&A | 销售、一般及行政费用 | Selling, general and administrative |
| `depreciation` | Depreciation & Amortization | 折旧摊销 | Depreciation and amortization（可能在成本或费用中） |
| `operating_income` | Operating Income | 营业利润 | Income (loss) from operations |
| `net_income` | Net Income | 净利润 | Net income (loss) attributable to common stockholders |
| `ebit` | EBIT | 息税前利润 = operating_income + 利息收入 | 通常需自行计算 |
| `eps_diluted` | Diluted EPS | 稀释每股收益 | Diluted net income (loss) per share |

#### Balance Sheet（资产负债表）
| 字段 | 英文名 | 说明 | 在财报中的位置 |
|------|--------|------|---------------|
| `total_assets` | Total Assets | 总资产 | Consolidated Balance Sheets → Total assets |
| `current_assets` | Current Assets | 流动资产 | Total current assets |
| `cash_and_equivalents` | Cash & Equivalents | 现金及等价物 | Cash and cash equivalents |
| `receivables` | Receivables | 应收账款 | Accounts receivable / Trade receivables |
| `ppe_net` | PP&E Net | 固定资产净值 | Property, plant and equipment, net |
| `total_liabilities` | Total Liabilities | 总负债 | Total liabilities |
| `current_liabilities` | Current Liabilities | 流动负债 | Total current liabilities |
| `long_term_debt` | Long-term Debt | 长期债务 | Long-term debt / Notes payable (non-current) |
| `retained_earnings` | Retained Earnings | 留存收益 | Accumulated deficit / Retained earnings |
| `total_equity` | Total Equity | 总股东权益 | Total stockholders' equity |
| `shares_outstanding_m` | Shares Outstanding | 已发行流通股数（百万） | Shares of common stock outstanding |

#### Cash Flow Statement（现金流量表）
| 字段 | 英文名 | 说明 | 在财报中的位置 |
|------|--------|------|---------------|
| `operating_cash_flow` | Operating Cash Flow | 经营活动现金流 | Net cash from operating activities |
| `investing_cash_flow` | Investing Cash Flow | 投资活动现金流 | Net cash from investing activities |
| `financing_cash_flow` | Financing Cash Flow | 融资活动现金流 | Net cash from financing activities |
| `capex` | Capital Expenditures | 资本支出（负值） | Purchases of property and equipment |
| `free_cash_flow` | Free Cash Flow | 自由现金流 = OCF + capex | 通常需自行计算 |

#### Market Data（市场数据）
| 字段 | 英文名 | 说明 | 数据来源 |
|------|--------|------|---------|
| `stock_price` | Stock Price | 周期末收盘股价（美元） | Yahoo Finance / Google Finance |
| `market_cap` | Market Cap | 市值（百万美元） | stock_price × shares_outstanding_m |
| `btc_held` | BTC Holdings | 持有的比特币数量（个） | 公司公告 / 10-K 披露 |

---

## 3. 数据采集步骤

### 3.1 步骤概述

对于每家公司，按以下顺序操作：

```
1. 确认公司基本信息（SEC Filing Type、财年截止月）
2. 在 SEC EDGAR 查找最近两个完整财年的年报
3. 提取三张报表数据
4. 补充市场数据（股价、市值、BTC 持仓）
5. 计算衍生字段（gross_profit, ebit, free_cash_flow）
6. 写入 JSON 文件
```

### 3.2 数据来源（优先级从高到低）

1. **SEC EDGAR**（最权威）
   - 网址: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=&CIK={TICKER}&type=10-K&dateb=&owner=include&count=10
   - 搜索 10-K（年报）或 20-F（外国私人发行人年报）
   - 点击 "Filing" 链接查看完整财务报表

2. **公司 IR 页面**
   - 通常在 `{company-website}/investors` 或 `{company-website}/ir`
   - 提供 Press Release 和 SEC Filing 链接

3. **财经数据平台**
   - Yahoo Finance: https://finance.yahoo.com/quote/{TICKER}/financials
   - Macrotrends: https://www.macrotrends.net/stocks/charts/{TICKER}/{company-name}/financial-statements
   - Stock Analysis: https://stockanalysis.com/stocks/{TICKER}/financials/

### 3.3 详细操作流程

#### Step 1: 查找 SEC 文件

```
搜索: https://efts.sec.gov/LATEST/search-index?q=%22{COMPANY_NAME}%22&dateRange=custom&startdt=2024-01-01&enddt=2025-12-31&forms=10-K,20-F
```

或者使用 SEC EDGAR 全文搜索:
```
https://efts.sec.gov/LATEST/search-index?q={TICKER}&forms=10-K
```

#### Step 2: 从 10-K / 20-F 中提取数据

在年报中找到以下三个部分:
- **Consolidated Statements of Operations** → 利润表
- **Consolidated Balance Sheets** → 资产负债表
- **Consolidated Statements of Cash Flows** → 现金流量表

#### Step 3: 单位转换

- 财报中的数字通常以"千元"（thousands）为单位
- **本项目要求以"百万"（millions）为单位**
- 转换: 千 → 百万，除以 1000
- 例：报表中 `$463,312 (thousands)` → 写入 `463.3 (millions)`
- 保留一位小数

#### Step 4: 特殊字段处理

| 字段 | 计算方法 |
|------|---------|
| `gross_profit` | `revenue - cogs` |
| `ebit` | `operating_income + interest_income`（若无利息数据，可等于 operating_income） |
| `free_cash_flow` | `operating_cash_flow + capex`（capex 为负值，所以是加） |
| `market_cap` | `stock_price × shares_outstanding_m` |

#### Step 5: 处理 null 值

- 如果某个数据确实无法找到，保留 `null`
- **不要编造数据** — 宁可留 null 也不要猜测
- 在 `notes` 字段说明哪些数据未找到及原因

### 3.4 BTC 矿企特殊注意事项

1. **BTC 公允价值变动**: 2024年起 ASC 350 会计准则生效，BTC 按公允价值计量，导致"unrealized gain/loss on digital assets"出现在利润表中。这可能使 net_income 大幅波动，与真实经营表现脱节。

2. **收入构成**: 矿企收入可能包含:
   - Mining revenue（自挖矿收入）
   - Hosting/Cloud mining revenue（托管/云挖矿收入）
   - Engineering/HPC revenue（工程/高性能计算收入）
   - 汇总所有收入到 `revenue` 字段

3. **折旧**: 矿机折旧通常在 COGS 中，也可能单独列示。确保不要重复计算。

4. **BTC Holdings**:
   - 通常在 10-K 的 MD&A 部分或附注中披露
   - 也可能在季度更新/新闻稿中找到
   - 如果 10-K 中未明确披露，可从公司新闻稿或投资者演示中获取

5. **已破产/重组的公司**:
   - CORZ（Core Scientific）2022年破产，2024年初重组完成
   - SDIG（Stronghold）可能数据有限
   - 在 `notes` 中注明任何特殊情况

---

## 4. 质量检查清单

每个文件写入后，检查以下项目:

- [ ] `ticker` 与目录名一致
- [ ] `period_end_date` 格式正确且与财年对应
- [ ] 所有金额单位已转换为百万美元
- [ ] `gross_profit` ≈ `revenue` - `cogs`
- [ ] `total_assets` ≈ `total_liabilities` + `total_equity`（允许 ±5 误差）
- [ ] `free_cash_flow` ≈ `operating_cash_flow` + `capex`
- [ ] `capex` 为负值或零
- [ ] `investing_cash_flow` 通常为负值（矿企大量 capex）
- [ ] `eps_diluted` 正负号与 `net_income` 一致
- [ ] `shares_outstanding_m` 单位是百万股
- [ ] `source` 字段标注了正确的 SEC 文件类型
- [ ] 无法确认的字段设为 `null`，不编造数据

---

## 5. 参考示例

以下是已完成的 FUFU 2024_FY 文件作为参考:

```json
{
  "ticker": "FUFU",
  "company_name": "BitFuFu Inc.",
  "period": "2024_FY",
  "period_end_date": "2024-12-31",
  "currency": "USD",
  "unit": "millions",
  "source": "SEC 20-F (Foreign Private Issuer)",
  "notes": "BitFuFu files 20-F/6-K as a foreign private issuer, not 10-K/10-Q.",
  "income_statement": {
    "revenue": 463.3,
    "cogs": 370.6,
    "gross_profit": 92.7,
    "sga": 32.1,
    "depreciation": 18.5,
    "operating_income": 42.1,
    "net_income": 54.0,
    "ebit": 60.6,
    "eps_diluted": 0.33
  },
  "balance_sheet": {
    "total_assets": 377.7,
    "current_assets": 198.2,
    "cash_and_equivalents": 58.9,
    "receivables": 35.4,
    "ppe_net": 125.6,
    "total_liabilities": 215.2,
    "current_liabilities": 142.8,
    "long_term_debt": 52.4,
    "retained_earnings": 12.3,
    "total_equity": 162.5,
    "shares_outstanding_m": 164.3
  },
  "cash_flow_statement": {
    "operating_cash_flow": -15.2,
    "investing_cash_flow": -85.3,
    "financing_cash_flow": 112.5,
    "capex": -78.6,
    "free_cash_flow": -93.8
  },
  "market_data": {
    "stock_price": 2.66,
    "market_cap": 437.0,
    "btc_held": 1780
  }
}
```

---

## 6. 批量执行建议

### 6.1 分批执行
建议将 19 家公司分为 3-4 批执行，每批 5-6 家:

**第1批** (大型矿企):
- CORZ, CIFR, HUT, WULF, IREN

**第2批** (中型矿企):
- APLD, BITF, BTBT, BTDR, HIVE

**第3批** (小型矿企):
- GREE, ABTC, ANY, SLNH, AULT

**第4批** (其他/可能数据有限):
- SDIG, DGHI, MIGI, SAI

### 6.2 Agent 执行模板

对于每家公司，Agent 应执行以下任务:

```
任务: 为 {TICKER} ({COMPANY_NAME}) 采集财务数据

1. 搜索 {TICKER} 最近两个完整财年的 SEC 年报（10-K 或 20-F）
2. 从年报中提取利润表、资产负债表、现金流量表数据
3. 查找期末股价、市值、BTC 持仓量
4. 按照 data/raw_reports/README.md 中的 JSON 格式填写数据
5. 将数据写入:
   - data/raw_reports/{TICKER}/{YEAR1}_FY.json (最近财年)
   - data/raw_reports/{TICKER}/{YEAR2}_FY.json (上一财年)
6. 所有金额转换为百万美元，保留一位小数
7. 无法找到的数据设为 null，在 notes 字段说明
```

### 6.3 完成后的后续步骤

所有 19 家公司数据采集完成后:
1. 运行质量检查脚本（待编写）验证所有 JSON 文件格式
2. 更新 `data/analysis_data.json` 中的模拟数据为真实数据
3. 提交并推送到 GitHub，等待 GitHub Pages 部署
4. 在 btcmine.info 验证财务分析页面数据显示正常

---

## 7. 常见问题

### Q: 有些公司可能已退市或数据很少怎么办？
A: 在 `notes` 中说明情况，尽量填充能找到的数据。如 SDIG（Stronghold）已被收购、AULT（Ault Alliance）规模极小等。

### Q: 季度数据需要采集吗？
A: 当前阶段只需采集年度（FY）数据。季度数据为可选的后续扩展。

### Q: 外国私人发行人（20-F）与 10-K 有什么区别？
A: 20-F 通常在财年结束后 4 个月内提交（vs 10-K 的 60-90 天），格式可能略有不同，但包含的财务报表信息基本一致。

### Q: 如果公司改了财年截止日怎么办？
A: 在 `notes` 中说明，`period_end_date` 填写实际截止日期。例如 "公司于 2024 年将财年从 6月改为 12月"。

### Q: BTC 公允价值变动导致 net_income 异常大怎么办？
A: 正常填入报表数据。这是 2024 年 ASC 350 准则变更的结果，不需要调整。在 `notes` 中可以注明。
