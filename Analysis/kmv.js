/**
 * KMV (Moody's) Credit Risk Model
 * Estimates distance-to-default and probability of default
 */
(function () {
  if (typeof ANALYSIS_MODELS === 'undefined') window.ANALYSIS_MODELS = {};

  // Standard normal CDF approximation
  function normCDF(x) {
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
    var p = 0.3275911;
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    var t = 1.0 / (1.0 + p * x);
    var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1.0 + sign * y);
  }

  ANALYSIS_MODELS.kmv = {
    info: {
      zh: {
        name: 'KMV 信用风险模型',
        description: 'KMV 模型（由 KMV 公司开发，后被穆迪收购）基于 Merton 结构模型，利用市场数据估算企业的违约距离（DD）和违约概率（PD）。核心思路是将公司股权视为对公司资产的看涨期权。',
        pros: [
          '基于市场数据，具有前瞻性',
          '理论基础扎实（Merton 期权定价模型）',
          '能及时反映市场对违约风险的评估',
          '违约距离（DD）具有直观经济含义'
        ],
        cons: [
          '仅适用于上市公司（需要市场数据）',
          '假设资产价值服从对数正态分布',
          '波动率估算对结果影响大',
          '不考虑流动性风险和操作风险'
        ]
      },
      en: {
        name: 'KMV Credit Risk Model',
        description: 'The KMV model (developed by KMV Corp, acquired by Moody\'s) is based on the Merton structural model, using market data to estimate Distance-to-Default (DD) and Probability of Default (PD). It treats equity as a call option on the firm\'s assets.',
        pros: [
          'Market-based with forward-looking signals',
          'Strong theoretical foundation (Merton option pricing)',
          'Reflects market assessment of default risk in real-time',
          'Distance-to-Default has intuitive economic meaning'
        ],
        cons: [
          'Only applicable to public companies (requires market data)',
          'Assumes log-normal distribution of asset values',
          'Volatility estimates significantly impact results',
          'Does not account for liquidity or operational risk'
        ]
      }
    },
    columns: {
      zh: ['公司', '资产价值 (M)', '违约点 (M)', '资产波动率', '违约距离 (DD)', '违约概率 (PD)', '判定'],
      en: ['Company', 'Asset Value (M)', 'Default Point (M)', 'Asset Vol', 'DD', 'PD', 'Verdict']
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

        // V_A ≈ Market Cap + Total Debt
        var totalDebt = c.long_term_debt + c.current_liabilities;
        var assetValue = m.market_cap + totalDebt;

        // Default Point = Short-term Debt + 0.5 * Long-term Debt
        var defaultPoint = c.current_liabilities + 0.5 * c.long_term_debt;

        var sigma = m.asset_volatility;
        var mu = m.risk_free_rate; // drift ≈ risk-free rate
        var T = 1; // 1-year horizon

        // DD = (ln(V_A / D) + (μ - 0.5*σ²)*T) / (σ*√T)
        var dd = 0;
        if (defaultPoint > 0 && sigma > 0) {
          dd = (Math.log(assetValue / defaultPoint) + (mu - 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
        }

        // PD = N(-DD)
        var pd = normCDF(-dd);

        var verdict, verdictClass;
        if (dd > 3) {
          verdict = { zh: '极低风险', en: 'Very Low Risk' };
          verdictClass = 'verdict-safe';
        } else if (dd >= 1.5) {
          verdict = { zh: '中等风险', en: 'Moderate Risk' };
          verdictClass = 'verdict-caution';
        } else {
          verdict = { zh: '高风险', en: 'High Risk' };
          verdictClass = 'verdict-danger';
        }

        results.push({
          ticker: ticker,
          name: d.name,
          assetValue: assetValue,
          defaultPoint: defaultPoint,
          assetVol: sigma,
          dd: dd,
          pd: pd,
          verdict: verdict,
          verdictClass: verdictClass
        });
      }
      return results;
    }
  };
})();
