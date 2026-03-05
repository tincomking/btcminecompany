# 金融模型实现指南 — BTC Mining Intelligence

> 本项目实现 6 个财务分析模型，代码位于 `Analysis/*.js`，每个模型通过 IIFE 注册到全局 `ANALYSIS_MODELS` 对象。

---

## 1. 数据输入格式

所有模型接收 `ANALYSIS_DATA` 对象，结构为 `{ [ticker]: CompanyData }`：

```javascript
{
  "MARA": {
    "name": "Marathon Digital",
    "current": {           // 最新期财务数据（年度）
      "total_assets": 4500.0,       // 总资产 (USD M)
      "current_assets": 800.0,      // 流动资产
      "current_liabilities": 200.0, // 流动负债
      "total_liabilities": 1200.0,  // 总负债
      "long_term_debt": 850.0,      // 长期债务
      "retained_earnings": -500.0,  // 留存收益（可为负）
      "ebit": 50.0,                 // 息税前利润
      "revenue": 800.0,             // 营收
      "net_income": -12.0,          // 净利润（可为负）
      "operating_cash_flow": 150.0, // 经营现金流
      "gross_profit": 300.0,        // 毛利润
      "ppe_net": 2500.0,            // 固定资产净值
      "depreciation": 120.0,        // 折旧
      "sga": 80.0,                  // 销售管理费用
      "receivables": 50.0,          // 应收账款
      "shares_outstanding_m": 310.0 // 流通股数 (M)
    },
    "prior": { /* 前期数据，结构同 current */ },
    "market": {
      "market_cap": 7200.0,         // 市值 (USD M)
      "asset_volatility": 0.65,     // 资产波动率
      "risk_free_rate": 0.045,      // 无风险利率
      "revenue_growth_mean": 0.25,  // 营收增长率均值
      "revenue_growth_std": 0.40    // 营收增长率标准差
    }
  }
}
```

**关键约定**:
- 所有金额单位为 USD 百万（M）
- `current` = 最近一个完整财年，`prior` = 前一个完整财年
- `market` 字段来自实时市场数据
- 缺失字段可能为 `null` 或 `0`，每个模型需自行处理

---

## 2. Altman Z-Score — 破产预测

**文件**: `Analysis/altman.js`
**学术来源**: Altman, E.I. (1968), "Financial Ratios, Discriminant Analysis and the Prediction of Corporate Bankruptcy"

### 公式

```
Z = 1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 1.0*X5
```

| 变量 | 计算 | 含义 |
|------|------|------|
| X1 | (流动资产 - 流动负债) / 总资产 | 营运资本/总资产 |
| X2 | 留存收益 / 总资产 | 累计盈利能力 |
| X3 | EBIT / 总资产 | 资产盈利效率 |
| X4 | 市值 / 总负债 | 市场杠杆 |
| X5 | 营收 / 总资产 | 资产周转率 |

### 阈值判定

| Z-Score | 判定 | CSS Class |
|---------|------|-----------|
| > 2.99 | 安全 (Safe) | `verdict-safe` |
| 1.81 - 2.99 | 灰色区 (Gray Zone) | `verdict-caution` |
| < 1.81 | 危险 (Distress) | `verdict-danger` |

### 边界条件

- `total_assets == 0` -> 跳过该公司（除数为零）
- `total_liabilities == 0` -> X4 设为 0（避免 Infinity）
- `retained_earnings < 0` -> 正常计算（矿企早期常见负留存收益）

### BTC 矿企特殊性

原模型为制造业设计。矿企特点：X2 普遍偏低（年轻公司留存收益少），X4 因股价波动剧烈可能极端，X5 受 BTC 价格周期影响大。Z-Score 对矿企可能偏保守。

---

## 3. Beneish M-Score — 盈余操纵检测

**文件**: `Analysis/beneish.js`
**学术来源**: Beneish, M.D. (1999), "The Detection of Earnings Manipulation"

### 公式

```
M = -4.84 + 0.920*DSRI + 0.528*GMI + 0.404*AQI + 0.892*SGI
    + 0.115*DEPI - 0.172*SGAI + 4.679*TATA - 0.327*LVGI
```

| 指标 | 计算 | 含义 |
|------|------|------|
| DSRI | (应收/营收)_t / (应收/营收)_{t-1} | 应收账款天数指数 |
| GMI | 毛利率_{t-1} / 毛利率_t | 毛利率指数 |
| AQI | (1-(流动+固定)/总资产)_t / 同_{t-1} | 资产质量指数 |
| SGI | 营收_t / 营收_{t-1} | 销售增长指数 |
| DEPI | 折旧率_{t-1} / 折旧率_t | 折旧指数 |
| SGAI | (SGA/营收)_t / (SGA/营收)_{t-1} | 管理费用指数 |
| TATA | (净利润 - 经营现金流) / 总资产 | 总应计/总资产 |
| LVGI | 杠杆率_t / 杠杆率_{t-1} | 杠杆指数 |

### 阈值判定

| M-Score | 判定 | CSS Class |
|---------|------|-----------|
| > -1.78 | 可能操纵 (Likely Manipulator) | `verdict-danger` |
| <= -1.78 | 不太可能 (Unlikely) | `verdict-safe` |

### 边界条件

- 需要 `current` 和 `prior` 两期数据，缺少 `prior` 则跳过
- 分母为 0 时（如前期营收为 0），该指标默认设为 1
- GMI 计算: 如果 `gm_c == 0`（当期毛利率为零），GMI 默认为 1

### BTC 矿企特殊性

矿企高增长时 SGI 较高（正常现象），可能导致 M-Score 偏高误判。TATA 因 BTC 公允价值变动可能异常。结果需结合行业背景解读。

---

## 4. Modified Jones Model — 应计利润分析

**文件**: `Analysis/jones.js`
**学术来源**: Dechow, P., Sloan, R. & Sweeney, A. (1995)

### 公式

```
总应计 (TA) = 净利润 - 经营现金流
TA_scaled = TA / 平均总资产

NDA = α1*(1/A_{t-1}) + α2*((ΔRev - ΔRec)/A_{t-1}) + α3*(PPE/A_{t-1})

DA = TA_scaled - NDA  （操纵性应计利润）
```

### 固定行业系数

```javascript
var alpha1 = 0.02;  // 截距系数
var alpha2 = 0.08;  // 收入变动系数
var alpha3 = 0.05;  // 固定资产系数
```

这些是矿业行业估算值，非精确回归结果。

### 阈值判定

| |DA| | 判定 | CSS Class |
|------|------|-----------|
| > 0.05 | 高 — 可能操纵 | `verdict-danger` |
| 0.02 - 0.05 | 中等 | `verdict-caution` |
| < 0.02 | 低 | `verdict-safe` |

### 边界条件

- `平均总资产 == 0` -> 跳过
- 需要 `current` 和 `prior` 两期数据
- `ΔRec` 可能为负（应收减少），这是正常的

---

## 5. KMV 信用风险模型 — 违约概率估算

**文件**: `Analysis/kmv.js`
**理论基础**: Merton (1974) 结构化信用风险模型

### 公式

```
资产价值 V_A = 市值 + 总债务
总债务 = 长期债务 + 流动负债
违约点 D = 流动负债 + 0.5 * 长期债务

DD = [ln(V_A/D) + (μ - 0.5σ²)T] / (σ√T)

PD = N(-DD)   （N 为标准正态分布 CDF）
```

| 参数 | 来源 | 说明 |
|------|------|------|
| V_A | 市值 + 总债务 | 资产价值近似 |
| D | 流动负债 + 0.5*长期债务 | 违约触发点 |
| σ | `market.asset_volatility` | 资产波动率 |
| μ | `market.risk_free_rate` | 漂移率 (≈ 无风险利率) |
| T | 1 | 预测期限（1 年） |

### 正态分布 CDF 近似

使用 Abramowitz & Stegun 多项式近似算法，精度约 7 位有效数字：

```javascript
function normCDF(x) {
  var a1=0.254829592, a2=-0.284496736, a3=1.421413741,
      a4=-1.453152027, a5=1.061405429;
  var p = 0.3275911;
  // ...
}
```

### 阈值判定

| DD | 判定 | CSS Class | 含义 |
|----|------|-----------|------|
| > 3 | 极低风险 | `verdict-safe` | 距违约 3 个标准差以上 |
| 1.5 - 3 | 中等风险 | `verdict-caution` | 需要关注 |
| < 1.5 | 高风险 | `verdict-danger` | 违约概率显著 |

### 边界条件

- `defaultPoint <= 0` -> DD 设为 0（无债务则模型不适用）
- `sigma <= 0` -> DD 设为 0（波动率数据缺失）
- 极端 DD 值（> 10 或 < -5）在理论上有效但实际意义有限

### BTC 矿企特殊性

矿企资产波动率极高（σ 常在 0.5-1.0），导致 DD 偏低。BTC 价格大幅波动时市值剧变，V_A 可能在短期内翻倍或减半。模型对矿企可能过于悲观。

---

## 6. Monte Carlo 模拟 — 营收预测

**文件**: `Analysis/montecarlo.js`

### 几何布朗运动 (GBM) 公式

```
S(t+dt) = S(t) * exp((μ - 0.5σ²)dt + σ√dt * Z)

Z ~ N(0,1)  使用 Box-Muller 变换生成
dt = 1/12   月度步长
```

### 参数

| 参数 | 来源 | 说明 |
|------|------|------|
| S0 | `current.revenue` | 当前营收（起始值） |
| μ | `market.revenue_growth_mean` | 年化营收增长率均值 |
| σ | `market.revenue_growth_std` | 年化营收增长率标准差 |
| steps | 12 | 模拟 12 个月 |
| nSims | 1000 | 1000 条路径 |

### 输出分位数

| 分位 | 含义 |
|------|------|
| P10 | 悲观情景（仅 10% 概率低于此值） |
| P25 | 偏悲观 |
| P50 | 中位数（最可能） |
| P75 | 偏乐观 |
| P90 | 乐观情景 |

### 随机数生成

Box-Muller 变换将均匀分布转为标准正态分布：

```javascript
var u1 = Math.random();
var u2 = Math.random();
var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
```

**注意**: `Math.random()` 是伪随机数，不适用于加密或需要可重现结果的场景。每次页面加载结果略有不同是正常的。

### 边界条件

- `S0 == 0` -> 所有路径恒为 0（GBM 的吸收态）
- `σ == 0` -> 退化为确定性增长模型
- `μ` 极大（>2.0）-> 模拟值可能溢出，建议限制 μ 在 [-1, 3] 区间
- 负营收理论上不会出现（GBM 保证正值），但实际 S0 如果很小可能出现浮点精度问题

---

## 7. Piotroski F-Score — 财务健康度

**文件**: `Analysis/piotroski.js`
**学术来源**: Piotroski, J.D. (2000), "Value Investing: The Use of Historical Financial Statement Information"

### 9 个二元信号

| # | 信号 | 计算 | 得 1 分条件 |
|---|------|------|------------|
| 1 | ROA > 0 | 净利润 / 总资产 | 正值 |
| 2 | CFO > 0 | 经营现金流 | 正值 |
| 3 | ROA 改善 | ROA_t > ROA_{t-1} | 同比提升 |
| 4 | CFO > NI | 经营现金流 > 净利润 | 现金质量好 |
| 5 | 杠杆下降 | (长债/总资产)_t < 同_{t-1} | 降杠杆 |
| 6 | 流动性改善 | 流动比率_t > 流动比率_{t-1} | 偿债能力提升 |
| 7 | 无股本稀释 | 流通股_t <= 流通股_{t-1} | 未增发 |
| 8 | 毛利率提升 | 毛利率_t > 毛利率_{t-1} | 盈利能力增强 |
| 9 | 资产周转率提升 | (营收/总资产)_t > 同_{t-1} | 运营效率提升 |

```
F-Score = 信号1 + 信号2 + ... + 信号9  (0-9)
```

### 阈值判定

| F-Score | 判定 | CSS Class |
|---------|------|-----------|
| >= 8 | 强势 (Strong) | `verdict-safe` |
| 5 - 7 | 中等 (Moderate) | `verdict-caution` |
| < 5 | 弱势 (Weak) | `verdict-danger` |

### 边界条件

- 需要 `current` 和 `prior` 两期数据
- 分母为 0 时（如 `total_assets == 0`），对应比率设为 0
- 信号 7（无稀释）: 矿企频繁增发融资，此项普遍得 0 分

### BTC 矿企特殊性

矿企特点导致几个信号天然不利：
- 信号 1/3: 净利润受 BTC 价格影响大，亏损常见
- 信号 7: 矿企普遍通过增发融资，几乎总是 0 分
- 信号 5: 扩张期频繁举债，杠杆上升是正常的

---

## 8. 数值精度与显示规范

### 计算精度

所有计算使用 JavaScript 原生 `Number`（64 位浮点），精度约 15-16 位有效数字。对于财务计算足够。

### 显示精度

| 数据类型 | 格式 | 示例 |
|---------|------|------|
| Z-Score / M-Score / DD | 2 位小数 | 2.15, -2.34 |
| 比率 (X1-X5, DA 等) | 4 位小数 | 0.1234 |
| 概率 (PD) | 百分比 2 位 | 3.45% |
| 金额 (营收/资产) | 1 位小数 + M | $214.4M |
| 增长率 | 百分比 1 位 | 37.2% |

### 格式化工具

使用 `app.js` 中定义的 `fmt` 对象：

```javascript
fmt.usd(214.4)      // "$214.4M"
fmt.pct(37.2, 'yoy') // "↑ 37.2% YoY" (带颜色)
fmt.num(44893)       // "44,893"
```

---

## 9. 综合评估输出

`renderAnalysisSummary()` 函数汇总所有模型结果，生成每家公司的综合评估。评估逻辑：

1. 运行全部 6 个模型的 `calculate()`
2. 统计每家公司各模型的判定结果
3. 按 `verdict-safe` / `verdict-caution` / `verdict-danger` 分类汇总
4. 以红/黄/绿标签可视化

**注意**: 综合评估是简单的信号计数，不是加权平均。各模型独立性强，不存在"综合得分"的概念。
