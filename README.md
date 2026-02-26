# BTC Mining Intelligence Platform

美国上市比特币矿商财务数据追踪平台

## 网站访问

GitHub Pages 部署后访问：`https://[用户名].github.io/btcminecompany/`

## 数据格式说明

所有数据文件位于 `/data/` 目录，供 data agent 填充真实数据：

| 文件 | 内容 | 更新频率 |
|------|------|----------|
| `data/companies.json` | 公司主数据 | 季度/事件驱动 |
| `data/financials.json` | 季度财务数据 | 每季度（财报后24h内） |
| `data/operational.json` | 月度运营披露 | 每月（披露后48h内） |
| `data/news.json` | 新闻动态 | 每日 |
| `data/sentiment.json` | 机构评级 + 社交情绪 | 每日 |
| `data/schema.json` | **数据格式规范**（给data agent看） | 只读 |

## 重要财务指标

财务数据优先级（按重要性）：
1. **营收**（Revenue）
2. **净利润**（Net Income）— 注意BTC公允价值影响
3. **Adj. EBITDA**（剔除非现金项目后的核心盈利）
4. EPS、现金、持仓BTC等

## 覆盖公司

MARA · RIOT · CLSK · CORZ · HUT · WULF · IREN · CIFR · APLD · BITF · SDIG · BTBT

## 技术栈

- 纯静态网站（HTML + CSS + JavaScript）
- Chart.js（图表）
- 数据通过本地 JSON 文件管理
- GitHub Pages 自动部署

## 数据更新方式

Data agent 直接修改 `/data/` 目录中的 JSON 文件并提交，GitHub Actions 自动重新部署。
