/**
 * Altman Z-Score Model
 * Predicts probability of bankruptcy
 */
(function () {
  if (typeof ANALYSIS_MODELS === 'undefined') window.ANALYSIS_MODELS = {};

  ANALYSIS_MODELS.altman = {
    info: {
      zh: {
        name: 'Altman Z-Score',
        description: 'Altman Z-Score 由纽约大学 Edward Altman 教授于 1968 年提出，是最经典的企业破产预测模型。通过 5 个财务比率加权计算综合得分，Z > 2.99 为安全区，1.81-2.99 为灰色区，< 1.81 为危险区。',
        pros: [
          '历史悠久，经过大量实证检验',
          '计算简单，指标含义明确',
          '对制造业企业的破产预测准确率高',
          '提供清晰的区间划分（安全/灰色/危险）'
        ],
        cons: [
          '原始模型主要针对制造业设计',
          '不适用于金融行业和服务业',
          '未考虑市场环境变化和宏观因素',
          '对矿业公司可能需要调整系数'
        ]
      },
      en: {
        name: 'Altman Z-Score',
        description: 'The Altman Z-Score, developed by NYU Professor Edward Altman in 1968, is the most classic bankruptcy prediction model. It calculates a composite score from 5 weighted financial ratios: Z > 2.99 is safe, 1.81-2.99 is gray zone, < 1.81 is distress.',
        pros: [
          'Long history with extensive empirical validation',
          'Simple calculation with clear indicators',
          'High accuracy for manufacturing firm bankruptcy prediction',
          'Clear zone classification (safe/gray/distress)'
        ],
        cons: [
          'Originally designed for manufacturing firms',
          'Less applicable to finance and service industries',
          'Does not account for market environment changes',
          'Mining companies may require coefficient adjustments'
        ]
      }
    },
    columns: {
      zh: ['公司', 'X1 营运资本', 'X2 留存收益', 'X3 EBIT', 'X4 市值/负债', 'X5 周转率', 'Z-Score', '判定'],
      en: ['Company', 'X1 WC/TA', 'X2 RE/TA', 'X3 EBIT/TA', 'X4 MV/TL', 'X5 Rev/TA', 'Z-Score', 'Verdict']
    },
    calculate: function (data) {
      var results = [];
      var tickers = Object.keys(data);
      for (var i = 0; i < tickers.length; i++) {
        var ticker = tickers[i];
        var d = data[ticker];
        if (!d || !d.current || !d.market) continue;
        var c = d.current;
        var m = d.market;

        if (!c.total_assets) continue;

        // X1 = Working Capital / Total Assets
        var x1 = (c.current_assets - c.current_liabilities) / c.total_assets;

        // X2 = Retained Earnings / Total Assets
        var x2 = c.retained_earnings / c.total_assets;

        // X3 = EBIT / Total Assets
        var x3 = c.ebit / c.total_assets;

        // X4 = Market Cap / Total Liabilities
        var x4 = c.total_liabilities ? m.market_cap / c.total_liabilities : 0;

        // X5 = Revenue / Total Assets
        var x5 = c.revenue / c.total_assets;

        // Z = 1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 1.0*X5
        var zScore = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5;

        var verdict, verdictClass;
        if (zScore > 2.99) {
          verdict = { zh: '安全', en: 'Safe' };
          verdictClass = 'verdict-safe';
        } else if (zScore >= 1.81) {
          verdict = { zh: '灰色区', en: 'Gray Zone' };
          verdictClass = 'verdict-caution';
        } else {
          verdict = { zh: '危险', en: 'Distress' };
          verdictClass = 'verdict-danger';
        }

        results.push({
          ticker: ticker,
          name: d.name,
          x1: x1,
          x2: x2,
          x3: x3,
          x4: x4,
          x5: x5,
          score: zScore,
          verdict: verdict,
          verdictClass: verdictClass
        });
      }
      return results;
    }
  };
})();
