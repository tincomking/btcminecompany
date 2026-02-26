# Raw Financial Reports

每家公司一个目录，用于存放原始财报数据。其他 agent 查询后将数据写入对应目录。

## 目录结构

```
raw_reports/
├── FUFU/          # BitFuFu Inc.
├── MARA/          # Marathon Digital Holdings
├── RIOT/          # Riot Platforms
├── CLSK/          # CleanSpark
├── CORZ/          # Core Scientific
├── CIFR/          # Cipher Mining
├── HUT/           # Hut 8 Corp
├── WULF/          # TeraWulf
├── IREN/          # Iris Energy
├── APLD/          # Applied Digital
├── BITF/          # Bitfarms
├── SDIG/          # Stronghold Digital Mining
├── BTBT/          # Bit Digital
├── BTDR/          # Bitdeer Technologies
├── HIVE/          # HIVE Digital Technologies
├── GREE/          # Greenidge Generation
├── ABTC/          # American Bitcoin
├── ANY/           # Sphere 3D
├── SLNH/          # Soluna Holdings
├── AULT/          # Ault Alliance
├── DGHI/          # Digihost Technology
├── MIGI/          # Mawson Infrastructure
└── SAI/           # SAI.TECH
```

## 文件命名规范

`{PERIOD}.json` — 放在对应公司目录下

示例：
- `FUFU/2024_Q4.json` — BitFuFu 2024年第四季度
- `FUFU/2024_FY.json` — BitFuFu 2024年全年
- `MARA/2024_Q3.json` — Marathon 2024年第三季度

## 数据格式

每个 JSON 文件应包含以下三表结构：

```json
{
  "ticker": "FUFU",
  "period": "2024_Q4",
  "period_end_date": "2024-12-31",
  "currency": "USD",
  "unit": "millions",
  "source": "SEC 10-K / 10-Q",
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

## 给 Agent 的说明

1. 将查询到的数据填入对应公司目录下，按上述格式保存
2. `null` 表示该字段暂无数据，有数据时替换为数值
3. 金额单位统一为 USD 百万（millions）
4. 每个季度/年度一个文件，文件名格式 `{YEAR}_{PERIOD}.json`
5. 数据来源优先级：SEC EDGAR > 公司 IR 页面 > 财经数据平台
