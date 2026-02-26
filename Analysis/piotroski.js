/**
 * Piotroski F-Score Model
 * Measures financial strength using 9 binary signals
 */
(function () {
  if (typeof ANALYSIS_MODELS === 'undefined') window.ANALYSIS_MODELS = {};

  ANALYSIS_MODELS.piotroski = {
    info: {
      zh: {
        name: 'Piotroski F-Score',
        description: 'Piotroski F-Score 由斯坦福大学 Joseph Piotroski 教授于 2000 年提出，使用 9 个二元信号（0/1）综合评估公司财务健康状况。总分 0-9 分，涵盖盈利能力、杠杆/流动性和运营效率三大维度。',
        pros: [
          '简单直观，每个信号是 0 或 1',
          '多维度评估：盈利能力、杠杆水平、运营效率',
          '学术验证有效，特别适用于价值投资筛选',
          '不依赖市场数据，纯财务指标驱动'
        ],
        cons: [
          '二元化简化了复杂的财务状况',
          '不考虑行业差异，所有公司使用相同标准',
          '对周期性行业可能产生误判',
          '缺乏前瞻性，完全基于历史数据'
        ]
      },
      en: {
        name: 'Piotroski F-Score',
        description: 'The Piotroski F-Score, developed by Stanford Professor Joseph Piotroski in 2000, uses 9 binary signals (0/1) to assess a company\'s financial health. Scores range from 0-9, covering profitability, leverage/liquidity, and operating efficiency.',
        pros: [
          'Simple and intuitive: each signal is 0 or 1',
          'Multi-dimensional: profitability, leverage, efficiency',
          'Academically validated, effective for value investing',
          'Market-independent, purely financials-driven'
        ],
        cons: [
          'Binary simplification may miss nuances',
          'Industry-agnostic: same criteria for all sectors',
          'May misjudge cyclical industries',
          'Backward-looking, entirely based on historical data'
        ]
      }
    },
    columns: {
      zh: ['公司', 'ROA>0', 'CFO>0', 'ROA↑', 'CFO>NI', '杠杆↓', '流动性↑', '无稀释', '毛利率↑', '周转率↑', 'F-Score', '判定'],
      en: ['Company', 'ROA>0', 'CFO>0', 'ROA↑', 'CFO>NI', 'Lever↓', 'Liquid↑', 'NoDiv', 'Margin↑', 'Turn↑', 'F-Score', 'Verdict']
    },
    calculate: function (data) {
      var results = [];
      var tickers = Object.keys(data);
      for (var i = 0; i < tickers.length; i++) {
        var ticker = tickers[i];
        var d = data[ticker];
        if (!d || !d.current || !d.prior) continue;
        var c = d.current;
        var p = d.prior;

        var signals = {};

        // 1. ROA > 0
        var roa_c = c.total_assets ? c.net_income / c.total_assets : 0;
        signals.roa_pos = roa_c > 0 ? 1 : 0;

        // 2. CFO > 0
        signals.cfo_pos = c.operating_cash_flow > 0 ? 1 : 0;

        // 3. ROA improvement
        var roa_p = p.total_assets ? p.net_income / p.total_assets : 0;
        signals.roa_up = roa_c > roa_p ? 1 : 0;

        // 4. CFO > Net Income (accruals quality)
        signals.cfo_gt_ni = c.operating_cash_flow > c.net_income ? 1 : 0;

        // 5. Leverage decrease (LT debt / TA)
        var lev_c = c.total_assets ? c.long_term_debt / c.total_assets : 0;
        var lev_p = p.total_assets ? p.long_term_debt / p.total_assets : 0;
        signals.leverage_down = lev_c < lev_p ? 1 : 0;

        // 6. Current ratio improvement
        var cr_c = c.current_liabilities ? c.current_assets / c.current_liabilities : 0;
        var cr_p = p.current_liabilities ? p.current_assets / p.current_liabilities : 0;
        signals.liquidity_up = cr_c > cr_p ? 1 : 0;

        // 7. No share dilution
        signals.no_dilution = c.shares_outstanding_m <= p.shares_outstanding_m ? 1 : 0;

        // 8. Gross margin improvement
        var gm_c = c.revenue ? c.gross_profit / c.revenue : 0;
        var gm_p = p.revenue ? p.gross_profit / p.revenue : 0;
        signals.margin_up = gm_c > gm_p ? 1 : 0;

        // 9. Asset turnover improvement
        var at_c = c.total_assets ? c.revenue / c.total_assets : 0;
        var at_p = p.total_assets ? p.revenue / p.total_assets : 0;
        signals.turnover_up = at_c > at_p ? 1 : 0;

        var fScore = signals.roa_pos + signals.cfo_pos + signals.roa_up + signals.cfo_gt_ni +
          signals.leverage_down + signals.liquidity_up + signals.no_dilution +
          signals.margin_up + signals.turnover_up;

        var verdict, verdictClass;
        if (fScore >= 8) {
          verdict = { zh: '强势', en: 'Strong' };
          verdictClass = 'verdict-safe';
        } else if (fScore >= 5) {
          verdict = { zh: '中等', en: 'Moderate' };
          verdictClass = 'verdict-caution';
        } else {
          verdict = { zh: '弱势', en: 'Weak' };
          verdictClass = 'verdict-danger';
        }

        results.push({
          ticker: ticker,
          name: d.name,
          signals: signals,
          score: fScore,
          verdict: verdict,
          verdictClass: verdictClass
        });
      }
      return results;
    }
  };
})();
