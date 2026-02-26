/**
 * Modified Jones Model
 * Estimates discretionary accruals to detect earnings management
 */
(function () {
  if (typeof ANALYSIS_MODELS === 'undefined') window.ANALYSIS_MODELS = {};

  ANALYSIS_MODELS.jones = {
    info: {
      zh: {
        name: 'Modified Jones Model',
        description: 'Modified Jones 模型（Dechow, Sloan & Sweeney, 1995）通过估算"非操纵性应计利润"来衡量公司可能存在的盈余管理程度。操纵性应计利润（DA）越高，表明盈余管理可能性越大。该模型使用行业固定系数估算正常应计水平。',
        pros: [
          '区分正常应计和异常应计，逻辑清晰',
          '学术界广泛使用的标准模型',
          '对于检测应计利润操纵较为敏感',
          '可横向比较同行业公司'
        ],
        cons: [
          '行业系数为固定估算值，可能不够精确',
          '假设非操纵性应计利润为线性关系',
          '对实际现金流操纵无法识别',
          '样本量小时结果不稳定'
        ]
      },
      en: {
        name: 'Modified Jones Model',
        description: 'The Modified Jones Model (Dechow, Sloan & Sweeney, 1995) estimates "non-discretionary accruals" to measure the degree of potential earnings management. Higher discretionary accruals (DA) indicate greater likelihood of manipulation. The model uses fixed industry coefficients to estimate normal accrual levels.',
        pros: [
          'Clear logic separating normal from abnormal accruals',
          'Standard model widely used in academia',
          'Sensitive to accrual-based manipulation',
          'Enables cross-company comparison within industries'
        ],
        cons: [
          'Fixed industry coefficients may lack precision',
          'Assumes linear relationship for non-discretionary accruals',
          'Cannot detect real cash flow manipulation',
          'Unstable results with small sample sizes'
        ]
      }
    },
    columns: {
      zh: ['公司', '总应计/资产', 'NDA', 'DA', '|DA|', '判定'],
      en: ['Company', 'TA/Assets', 'NDA', 'DA', '|DA|', 'Verdict']
    },
    calculate: function (data) {
      var results = [];
      // Fixed industry coefficients (mining sector estimates)
      var alpha1 = 0.02;
      var alpha2 = 0.08;
      var alpha3 = 0.05;

      var tickers = Object.keys(data);
      for (var i = 0; i < tickers.length; i++) {
        var ticker = tickers[i];
        var d = data[ticker];
        if (!d || !d.current || !d.prior) continue;
        var c = d.current;
        var p = d.prior;

        var avgTA = (c.total_assets + p.total_assets) / 2;
        if (!avgTA) continue;

        // Total Accruals = Net Income - Operating Cash Flow
        var totalAccruals = c.net_income - c.operating_cash_flow;
        var ta_scaled = totalAccruals / avgTA;

        // Modified Jones: NDA = α1*(1/A_t-1) + α2*((ΔRev - ΔRec)/A_t-1) + α3*(PPE/A_t-1)
        var invA = 1 / p.total_assets;
        var deltaRev = c.revenue - p.revenue;
        var deltaRec = c.receivables - p.receivables;
        var nda = alpha1 * invA + alpha2 * ((deltaRev - deltaRec) / p.total_assets) + alpha3 * (c.ppe_net / p.total_assets);

        // Discretionary Accruals = TA/A - NDA
        var da = ta_scaled - nda;
        var absDA = Math.abs(da);

        var verdict, verdictClass;
        if (absDA > 0.05) {
          verdict = { zh: '高 — 可能操纵', en: 'High — Possible' };
          verdictClass = 'verdict-danger';
        } else if (absDA > 0.02) {
          verdict = { zh: '中等', en: 'Moderate' };
          verdictClass = 'verdict-caution';
        } else {
          verdict = { zh: '低', en: 'Low' };
          verdictClass = 'verdict-safe';
        }

        results.push({
          ticker: ticker,
          name: d.name,
          ta_scaled: ta_scaled,
          nda: nda,
          da: da,
          absDA: absDA,
          verdict: verdict,
          verdictClass: verdictClass
        });
      }
      return results;
    }
  };
})();
