# Chart.js 最佳实践 — BTC Mining Intelligence

> 本项目使用 Chart.js 4.4.0 + 插件生态，所有图表通过 `<canvas>` 渲染，无框架封装。

---

## 1. 当前依赖版本

| 库 | 版本 | CDN | 用途 |
|---|---|---|---|
| Chart.js | 4.4.0 | jsdelivr | 核心渲染引擎 |
| chartjs-adapter-date-fns | 3.x | jsdelivr | 时间轴 X 轴适配 |
| chartjs-plugin-annotation | 3.x | jsdelivr | 阈值线、标注区域 |
| chartjs-plugin-zoom | 2.0.1 | jsdelivr | 缩放/平移交互 |
| Hammer.js | 2.0.8 | jsdelivr | 触摸手势（zoom 依赖） |

**重要**: 不要升级到 Chart.js 5.x，API 有 breaking change，且插件生态尚未完全适配。

---

## 2. 图表类型选择指南

本项目已使用的图表类型及其适用场景：

| 图表类型 | 使用位置 | 适用场景 |
|---------|---------|---------|
| `bar`（分组柱状图）| 营收对比图 (`renderRevenueChart`) | 多公司同指标横向对比 |
| `line`（折线图）| BTC 产量趋势 (`renderBtcProductionChart`) | 时间序列趋势展示 |
| `line` + `fill` | 预测主图 (`renderMPForecastChart`) | 带面积的价格走势 |
| `line` + `borderDash` | 历史预测线 | 虚线区分预测 vs 实际 |
| `doughnut`（环形图）| 新闻情绪分布 | 占比分布（正/中/负） |
| `bar`（水平）| 分类统计 | 类目数量对比 |
| `scatter` | Monte Carlo 扇形图 | 多路径模拟结果展示 |

**选择原则**:
- 时间序列 -> `line`（设 `pointRadius: 0` 减少渲染开销）
- 公司间对比 -> `bar`（分组或堆叠）
- 占比结构 -> `doughnut`（不用 `pie`，环形留白更美观）
- 双指标叠加 -> 双轴 `line` + `bar` 组合

---

## 3. 主题适配（暗色/亮色）

本项目通过 `chartColors()` 函数动态获取主题色，**所有图表必须使用此函数**：

```javascript
function chartColors() {
  const isLight = currentTheme === 'light';
  return {
    tooltip: {
      bg: isLight ? '#ffffff' : '#1a1a1a',
      border: isLight ? '#d4d4d8' : '#333',
      title: isLight ? '#18181b' : '#f0f0f0',
      body: isLight ? '#52525b' : '#a0a0a0'
    },
    legend: isLight ? '#52525b' : '#a0a0a0',
    tick: isLight ? '#93939e' : '#606060',
    grid: isLight ? '#e2e2e5' : '#1e1e1e',
  };
}
```

**使用模式**:
```javascript
const cc = chartColors();
// scales
x: { ticks: { color: cc.tick }, grid: { color: cc.grid } }
// plugins
legend: { labels: { color: cc.legend, font: { size: 11, family: 'Inter' } } }
tooltip: { backgroundColor: cc.tooltip.bg, borderColor: cc.tooltip.border, ... }
```

**注意**: 主题切换后需要销毁重建图表，不能仅更新颜色。当前实现是在页面重新渲染时自动处理。

---

## 4. 图表实例管理与内存防泄漏

**核心规则**: 创建新图表前必须销毁旧实例。

```javascript
// 模式 A: 绑定在 canvas 元素上（本项目主要模式）
if (canvas._chart) canvas._chart.destroy();
canvas._chart = new Chart(canvas, { ... });

// 模式 B: 使用独立变量（预测主图使用）
let mpForecastChart = null;
// ...
if (mpForecastChart) mpForecastChart.destroy();
mpForecastChart = new Chart(canvas, { ... });
```

**常见泄漏场景**:
- 页面切换后未销毁不可见页面的图表 -> 本项目通过页面 DOM 显隐而非销毁来管理，图表随页面隐藏但不销毁，这是可接受的
- 重复调用 render 函数未先 destroy -> 会导致多个图表实例叠加在同一 canvas 上
- 事件监听器未清理 -> zoom 插件会注册 wheel/touch 事件

---

## 5. 大数据集性能优化

### 5.1 数据下采样

预测主图 (`_renderMPChart`) 中对历史数据的处理是性能优化的典范：

```javascript
// 按时间桶聚合：每 2 小时取 1 个数据点
const BUCKET_MS = 2 * 3600 * 1000;
const bucketMap = new Map();
sorted.forEach(p => {
  const bucket = Math.floor(ts / BUCKET_MS);
  bucketMap.set(bucket, p);  // 同桶内后值覆盖前值
});
```

**指导原则**:
- 7 天数据: 2 小时桶 -> ~84 个点（合理）
- 30 天数据: 4 小时桶 -> ~180 个点（合理）
- 超过 500 个数据点时必须下采样
- canvas 像素宽度通常 800-1200px，超过 1000 个点没有视觉意义

### 5.2 减少绘制元素

```javascript
{
  pointRadius: 0,          // 不绘制数据点圆圈（性能最大提升）
  pointHitRadius: 10,      // 但保留 hover 交互区域
  tension: 0.2,            // 贝塞尔曲线，减少锯齿但增加计算
  fill: true,              // 面积填充，用 rgba 低透明度
  borderWidth: 2,          // 线宽 1-2 即可
}
```

### 5.3 移动平均平滑

```javascript
// 双重 3 点移动平均（等效加权 5 点平滑）
const sma3 = arr => arr.map((pt, i) => {
  if (i === 0 || i === arr.length - 1) return pt;
  return { x: pt.x, y: (arr[i-1].y + pt.y + arr[i+1].y) / 3 };
});
pts = sma3(sma3(pts));
```

---

## 6. 响应式配置

所有图表必须设置：

```javascript
options: {
  responsive: true,
  maintainAspectRatio: false,  // 让 CSS 控制高度
}
```

CSS 端通过固定容器高度控制：
```css
.chart-container { height: 350px; }
canvas { width: 100% !important; }
```

**移动端适配**（TODO）: 当前图表在小屏上可能过密，未来需要：
- 小屏时增大下采样桶大小
- 减小字体 `font.size`
- 隐藏部分 dataset legend

---

## 7. 双轴图表

OI vs Price 图使用双 Y 轴：

```javascript
scales: {
  y: {
    position: 'left',
    title: { display: true, text: 'OI (USD)' },
    ticks: { callback: v => `$${(v/1e9).toFixed(1)}B` }
  },
  y1: {
    position: 'right',
    title: { display: true, text: 'Price (USD)' },
    grid: { drawOnChartArea: false },  // 右轴不画网格线
    ticks: { callback: v => `$${v.toLocaleString()}` }
  }
}
```

**注意**: 双轴图表每个 dataset 必须指定 `yAxisID: 'y'` 或 `yAxisID: 'y1'`。

---

## 8. 图表标注（Annotation Plugin）

用于在分析模型图表中标注阈值线：

```javascript
plugins: {
  annotation: {
    annotations: {
      threshold: {
        type: 'line',
        yMin: 2.99, yMax: 2.99,
        borderColor: '#10b981',
        borderWidth: 1,
        borderDash: [5, 5],
        label: {
          display: true,
          content: 'Safe Zone (Z > 2.99)',
          position: 'start'
        }
      }
    }
  }
}
```

---

## 9. 动态数据更新

当数据变化时（如用户切换筛选条件），优先用 `chart.update()` 而非重建：

```javascript
// 轻量更新（推荐）
chart.data.datasets[0].data = newData;
chart.update('none');  // 'none' = 无动画，立即更新

// 完全重建（主题切换时必须）
chart.destroy();
chart = new Chart(canvas, newConfig);
```

**`update()` 的 mode 参数**:
- `'none'` — 无动画，数据刷新时用
- `'active'` — 仅激活态动画
- `undefined` — 默认动画

---

## 10. Tooltip 自定义

本项目所有金额类 tooltip 统一格式：

```javascript
tooltip: {
  callbacks: {
    label: ctx => `${ctx.dataset.label}: $${ctx.raw.toFixed(1)}M`,
    // 或带条件格式
    label: ctx => {
      const v = ctx.raw;
      return v >= 0
        ? `${ctx.dataset.label}: +$${v.toFixed(1)}M`
        : `${ctx.dataset.label}: -$${Math.abs(v).toFixed(1)}M`;
    }
  }
}
```

---

## 11. 常见坑

1. **Canvas 复用**: 同一个 `<canvas>` 不能同时挂两个 Chart 实例，必须先 `destroy()`
2. **时间轴**: 使用 `type: 'time'` 的 X 轴必须引入 date-fns adapter，否则静默失败
3. **数据格式**: 时间轴数据必须是 `{ x: Date, y: number }` 格式，不能是纯数组
4. **zoom 插件冲突**: zoom 插件会拦截滚轮事件，如果页面有多个图表可能影响页面滚动。建议设 `zoom.wheel.modifierKey: 'ctrl'`
5. **DPI 缩放**: 本项目使用 `document.body.style.zoom` 缩放，可能导致 canvas 模糊。Chart.js 的 `devicePixelRatio` 选项可以手动设置
6. **颜色透明度**: 背景色用 `rgba(r,g,b,0.04-0.15)` 范围，太高会遮挡网格线
