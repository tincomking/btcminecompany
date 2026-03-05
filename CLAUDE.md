# BTC Mining Intelligence

23 家美股上市 BTC 矿企金融情报平台，含 6 大量化分析模型和 P0-P3 实时预测面板。纯静态站（HTML + JS + Chart.js），GitHub Pages 托管于 [btcmine.info](https://btcmine.info)。

## 产品需求文档

完整项目上下文见 [.claude/PRD.md](.claude/PRD.md) — 包含功能规格、架构设计、API 依赖、数据流、目录结构。

## Reference 技术文档

| 文档 | 路径 | 何时读取 |
|------|------|---------|
| Chart.js 最佳实践 | [.claude/reference/chartjs-best-practices.md](.claude/reference/chartjs-best-practices.md) | 新增/修改图表、调试图表渲染问题、处理大数据集可视化、主题适配 |
| 纯静态站开发模式 | [.claude/reference/static-site-patterns.md](.claude/reference/static-site-patterns.md) | 修改项目结构、新增页面/模块、处理 i18n/主题、调整数据加载策略、部署问题 |
| 金融模型实现指南 | [.claude/reference/financial-models.md](.claude/reference/financial-models.md) | 修改/新增分析模型、排查计算错误、理解模型输入数据格式和边界条件 |

## 快速上手

```bash
# 本地预览
cd /Users/leogrossman/btcminecompany && python3 -m http.server 8080

# 部署（push 即部署）
git add -A && git commit -m "描述" && git push
```

## 关键文件

| 文件 | 行数 | 职责 |
|------|------|------|
| `index.html` | 1363 | 单页应用 HTML 结构 |
| `js/app.js` | 4302 | 主逻辑，50+ render 函数 |
| `js/data.js` | 209 | API 数据加载层 |
| `js/i18n.js` | 902 | 中英双语 + 主题 + 缩放 |
| `css/style.css` | 3123 | 全站样式，暗/亮双主题 |
| `Analysis/*.js` | ~150/个 | 6 个财务分析模型 |
