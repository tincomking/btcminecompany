# 纯静态站开发模式 — BTC Mining Intelligence

> 本项目是纯静态站（HTML + CSS + JS），无构建工具，通过 GitHub Pages 部署，CDN 引入依赖。

---

## 1. 架构概览

```
index.html          ← 唯一入口，单页应用（SPA）
├── js/i18n.js      ← 国际化 + 主题 + 缩放管理（902 行）
├── js/data.js      ← API 数据加载层（209 行）
├── Analysis/*.js   ← 6 个财务分析模型（IIFE 自注册）
└── js/app.js       ← 主应用逻辑（4302 行），50+ render 函数
```

**加载顺序**: `i18n.js` -> `data.js` -> `Analysis/*.js` (x6) -> `app.js`

这个顺序是硬性依赖：app.js 依赖 data.js 的全局变量和 i18n.js 的 `t()` 函数。

---

## 2. 模块化 JS 组织

### 2.1 IIFE 模块模式

本项目所有分析模型使用 IIFE（立即调用函数表达式）模式实现模块化：

```javascript
(function () {
  if (typeof ANALYSIS_MODELS === 'undefined') window.ANALYSIS_MODELS = {};

  ANALYSIS_MODELS.altman = {
    info: { zh: { ... }, en: { ... } },
    columns: { zh: [...], en: [...] },
    calculate: function (data) { ... }
  };
})();
```

**优点**: 无需构建工具，每个文件自包含，通过全局注册表 `ANALYSIS_MODELS` 解耦。

**约定**:
- 新增分析模型必须遵循此模式
- `info` 包含 `zh` 和 `en` 的 name/description/pros/cons
- `columns` 定义表头
- `calculate(data)` 接收 `ANALYSIS_DATA` 并返回结果数组

### 2.2 全局变量管理

数据层通过全局变量暴露（`data.js` 定义）：

```javascript
let COMPANIES = [];
let FINANCIALS = [];
let OPERATIONAL = [];
let NEWS = [];
let SENTIMENT = { analyst_ratings: [], social_sentiment: [] };
let ANALYSIS_DATA = {};
let BTC_PREDICTIONS = {};
let MARKET_PREDICT = { latest: null, forecast: null, ... };
let dataReady = false;
let marketPredictLoaded = false;
```

**规则**:
- 全大写 = API 数据容器，只在 `data.js` 中赋值
- `dataReady` / `marketPredictLoaded` = 加载状态标志
- 其他全局变量（如 `currentLang`, `currentTheme`）在 `i18n.js` 定义

### 2.3 函数命名规范

```
render*()           — 页面/组件渲染入口
renderXxxChart()    — 图表渲染
renderXxxTable()    — 表格渲染
setupXxxFilters()   — 筛选器初始化
getLatest*()        — 数据查询辅助
fmt.*               — 格式化工具（fmt.usd, fmt.pct, fmt.num, fmt.date）
t(key)              — 国际化翻译
```

---

## 3. CSS 变量主题系统

### 3.1 变量定义

暗色主题为默认，亮色通过 `[data-theme="light"]` 覆盖：

```css
:root {
  --bg-primary: #080808;
  --bg-card: #111111;
  --text-primary: #f0f0f0;
  --text-secondary: #a0a0a0;
  --border-default: #242424;
  --green: #10b981;
  --red: #ef4444;
  --orange: #f59e0b;
  --accent-blue: #3b82f6;
  --font-sans: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

[data-theme="light"] {
  --bg-primary: #f5f5f7;
  --bg-card: #ffffff;
  --text-primary: #18181b;
  --text-secondary: #52525b;
  --border-default: #d4d4d8;
  --green: #059669;
  --red: #dc2626;
  --orange: #d97706;
  --accent-blue: #2563eb;
}
```

### 3.2 使用原则

- **永远用变量**: `color: var(--text-primary)`，不要硬编码颜色
- **语义命名**: 用 `--green` 表示正面/上涨，`--red` 表示负面/下跌
- **dim 变体**: 背景高亮用 `--green-dim`（低透明度），不要手写 rgba
- **金融含义色彩约定**: 涨 = green，跌 = red，警告 = orange，信息 = blue

### 3.3 主题切换实现

```javascript
document.documentElement.setAttribute('data-theme', theme);
// 主题存储在 localStorage('btcmine-theme')
```

切换后需要：
1. 更新 CSS 变量（自动，通过选择器匹配）
2. 重新渲染当前页面的图表（需手动触发，因为 Chart.js 颜色在创建时固定）

---

## 4. i18n 双语实现

### 4.1 HTML 标记

```html
<span data-i18n="nav.overview">概览</span>
<th data-i18n="th.revenue">营收 (M)</th>
```

### 4.2 JS 翻译函数

```javascript
function t(key) {
  return I18N[currentLang][key] || key;
}
```

### 4.3 应用翻译

```javascript
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}
```

### 4.4 JS 中的动态文本

JS 生成的 HTML 中用 `t('key')` 获取翻译文本。翻译键定义在 `I18N.zh` 和 `I18N.en` 对象中。

**规则**:
- 新增 UI 文本必须同时加 zh 和 en 翻译
- 翻译键用点号分层: `nav.overview`, `th.revenue`, `js.no_data`
- 静态 HTML 内容用 `data-i18n` 属性
- JS 动态内容用 `t('key')` 函数

---

## 5. 数据加载策略

### 5.1 初始加载

```javascript
// data.js — 7 个核心 API 并行请求
const [companies, financials, operational, news, sentiment, analysis, predictions]
  = await Promise.all([ fetchAPI('/api/btcmine/companies'), ... ]);
```

### 5.2 懒加载

市场预测页面数据量大（12+ 个 API），仅在用户进入该页面时加载：

```javascript
async function loadMarketPredictions() {
  if (marketPredictLoaded) return;  // 防止重复加载
  // 核心 5 个 API 并行
  const [latest, forecast, models, pm, fg] = await Promise.all([...]);
  // 非核心 API 逐个 try-catch，失败不影响主体
  try { derivatives = await fetchAPI(...); } catch (_) {}
  try { backtest = await fetchAPI(...); } catch (_) {}
  // ...
}
```

### 5.3 API 调用封装

```javascript
const API_BASE = 'https://api.btcmine.info';

async function fetchAPI(apiPath) {
  const res = await fetch(`${API_BASE}${apiPath}`, {
    signal: AbortSignal.timeout(8000)  // 8 秒超时
  });
  if (!res.ok) throw new Error(`${apiPath}: ${res.status}`);
  return await res.json();
}
```

### 5.4 回退策略

经济日历数据有本地 JSON 备份：

```javascript
try {
  calRes = await fetchAPI('/api/btcmine/economic-calendar');
} catch (_) {
  calRes = await fetch('data/economic-calendar.json').then(r => r.json());
}
```

### 5.5 缓存考虑

当前无前端缓存（TODO）。计划使用 localStorage 或 Service Worker 缓存 API 响应。实施时注意：
- 财务数据变化频率低（季度），可缓存 24 小时
- 新闻数据变化频率高（30 分钟），缓存时间不超过 10 分钟
- 市场预测数据每小时更新，缓存 30 分钟
- 缓存 key 包含 API 路径，value 包含时间戳和数据

---

## 6. 单页应用路由

### 6.1 页面切换

通过 CSS class 控制页面显隐，无 URL 路由：

```html
<div id="page-overview" class="page active">...</div>
<div id="page-financials" class="page">...</div>
```

```javascript
// 导航点击
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.onclick = () => {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // 显示目标页面
    document.getElementById(tab.dataset.page).classList.add('active');
    // 触发该页面的渲染
    renderPage(tab.dataset.page);
  };
});
```

**优点**: 切换速度 <200ms，无网络请求。
**缺点**: 无法通过 URL 直接访问某个页面，不利于 SEO。

---

## 7. GitHub Pages 部署

### 7.1 部署流程

```
push main -> GitHub Actions -> upload-artifact -> deploy-pages
```

`.github/workflows/deploy.yml` 将整个仓库根目录上传为静态站：

```yaml
- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: '.'  # 整站目录
```

### 7.2 自定义域名

`CNAME` 文件内容: `btcmine.info`

DNS 配置通过 Cloudflare，CNAME 指向 `tincomking.github.io`。

### 7.3 数据 PR 自动合并

`auto-merge-data.yml` 工作流：
1. 检查 PR 只修改 `data/` 目录
2. JSON 语法验证
3. 确认作者为 `tincomking`
4. 自动 Approve + Squash Merge

---

## 8. 无构建工具架构的优劣

### 优势

- **零配置**: 无 package.json、无 node_modules、无 webpack/vite 配置
- **即改即部署**: `git push` 即完成部署，CI 只需 upload
- **调试简单**: 浏览器直接看源码，无 source map 问题
- **长期稳定**: 不受 npm 生态 breaking change 影响
- **CDN 缓存**: 依赖库走 jsdelivr CDN，全球加速

### 劣势与应对

| 劣势 | 当前影响 | 应对策略 |
|------|---------|---------|
| 无代码分割 | app.js 4300 行全量加载 | 通过懒加载市场预测数据缓解 |
| 无 Tree-shaking | Chart.js 全量引入 | CDN 版本已压缩，影响可控 |
| 无 TypeScript | 类型错误靠运行时发现 | 用 JSDoc 注释补充类型提示 |
| 无 CSS 预处理 | style.css 3100 行纯手写 | CSS 变量已提供足够抽象 |
| 无自动化测试 | 依赖手动测试 | PR 自动合并有 JSON 验证 |
| 全局变量污染 | IIFE 模式缓解但不彻底 | 命名空间约定避免冲突 |

### 何时考虑引入构建工具

- 当 app.js 超过 6000 行时
- 当需要引入 React/Vue 等框架时
- 当需要 CSS modules 或 Tailwind 时
- 当前不需要，纯静态站架构对本项目足够

---

## 9. 文件修改速查

| 修改需求 | 文件 | 注意事项 |
|---------|------|---------|
| 新增页面 | `index.html` + `app.js` | 加 `page-*` div + `nav-tab` + `render*()` |
| 改样式 | `css/style.css` | 同时改暗色和亮色两套变量 |
| 新增翻译 | `js/i18n.js` | zh 和 en 对象都要加 |
| 新增 API | `js/data.js` | 考虑是并行还是懒加载 |
| 新增分析模型 | `Analysis/新模型.js` | IIFE + 注册到 ANALYSIS_MODELS + 在 index.html 引入 |
| 改部署 | `.github/workflows/deploy.yml` | 注意 GitHub Pages 配置 |
