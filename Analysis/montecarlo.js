/**
 * Monte Carlo Simulation
 * Revenue projection with Geometric Brownian Motion
 */
(function () {
  if (typeof ANALYSIS_MODELS === 'undefined') window.ANALYSIS_MODELS = {};

  ANALYSIS_MODELS.montecarlo = {
    info: {
      zh: {
        name: 'Monte Carlo 模拟',
        description: 'Monte Carlo 模拟使用几何布朗运动（GBM）对公司未来 12 个月的营收进行 1000 次随机路径模拟，输出不同置信区间下的营收预测（P10 到 P90）。选择公司后可查看模拟扇形图。',
        pros: [
          '能量化不确定性，提供概率分布',
          '直观展示收入路径的可能范围',
          '可调整增长率和波动率参数',
          '适合辅助情景分析和压力测试'
        ],
        cons: [
          '结果高度依赖输入参数的假设',
          'GBM 模型假设收益率正态分布',
          '不考虑结构性变化（如减半事件）',
          '仅供参考，不能作为精确预测使用'
        ]
      },
      en: {
        name: 'Monte Carlo Simulation',
        description: 'Monte Carlo simulation uses Geometric Brownian Motion (GBM) to run 1000 random path simulations of a company\'s revenue over the next 12 months, outputting projections at different confidence intervals (P10 to P90). Select a company to view the simulation fan chart.',
        pros: [
          'Quantifies uncertainty with probability distributions',
          'Visually shows the range of possible revenue paths',
          'Adjustable growth rate and volatility parameters',
          'Useful for scenario analysis and stress testing'
        ],
        cons: [
          'Results highly dependent on input assumptions',
          'GBM assumes normally distributed returns',
          'Does not account for structural changes (e.g., halving)',
          'For reference only, not precise forecasts'
        ]
      }
    },
    columns: {
      zh: ['公司', '当前营收 (M)', '增长率', '波动率', 'P10', 'P25', 'P50 (中位)', 'P75', 'P90'],
      en: ['Company', 'Current Rev (M)', 'Growth', 'Volatility', 'P10', 'P25', 'P50 (Median)', 'P75', 'P90']
    },
    simulate: function (S0, mu, sigma, steps, nSims) {
      // GBM simulation: S(t+dt) = S(t) * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)
      var dt = 1 / 12; // monthly steps
      var paths = [];
      for (var i = 0; i < nSims; i++) {
        var path = [S0];
        var s = S0;
        for (var j = 0; j < steps; j++) {
          // Box-Muller transform for normal random
          var u1 = Math.random();
          var u2 = Math.random();
          var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          s = s * Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
          path.push(s);
        }
        paths.push(path);
      }
      return paths;
    },
    getPercentiles: function (paths, steps) {
      var percentiles = { p10: [], p25: [], p50: [], p75: [], p90: [] };
      for (var step = 0; step <= steps; step++) {
        var vals = [];
        for (var i = 0; i < paths.length; i++) {
          vals.push(paths[i][step]);
        }
        vals.sort(function (a, b) { return a - b; });
        var n = vals.length;
        percentiles.p10.push(vals[Math.floor(n * 0.10)]);
        percentiles.p25.push(vals[Math.floor(n * 0.25)]);
        percentiles.p50.push(vals[Math.floor(n * 0.50)]);
        percentiles.p75.push(vals[Math.floor(n * 0.75)]);
        percentiles.p90.push(vals[Math.floor(n * 0.90)]);
      }
      return percentiles;
    },
    calculate: function (data) {
      var results = [];
      var tickers = Object.keys(data);
      var steps = 12;
      var nSims = 1000;
      for (var i = 0; i < tickers.length; i++) {
        var ticker = tickers[i];
        var d = data[ticker];
        if (!d || !d.current || !d.market) continue;

        var S0 = d.current.revenue;
        var mu = d.market.revenue_growth_mean;
        var sigma = d.market.revenue_growth_std;

        var paths = this.simulate(S0, mu, sigma, steps, nSims);
        var pct = this.getPercentiles(paths, steps);

        // Final step percentiles
        var final_idx = steps;
        results.push({
          ticker: ticker,
          name: d.name,
          currentRevenue: S0,
          growthMean: mu,
          growthStd: sigma,
          p10: pct.p10[final_idx],
          p25: pct.p25[final_idx],
          p50: pct.p50[final_idx],
          p75: pct.p75[final_idx],
          p90: pct.p90[final_idx],
          percentiles: pct // Full path for chart
        });
      }
      return results;
    }
  };
})();
