/**
 * Beneish M-Score Model
 * Detects likelihood of earnings manipulation
 */
(function () {
  if (typeof ANALYSIS_MODELS === 'undefined') window.ANALYSIS_MODELS = {};

  ANALYSIS_MODELS.beneish = {
    info: {
      zh: {
        name: 'Beneish M-Score',
        description: 'Beneish M-Score 模型通过分析 8 个财务指标变化来检测公司是否存在盈余操纵的可能性。该模型由印第安纳大学 Messod Beneish 教授于 1999 年提出，曾成功预警安然事件。',
        pros: [
          '基于学术研究，具有实证支持',
          '涵盖多个财务维度，不易被单一因素误导',
          '可量化的判定阈值 (-1.78)',
          '对投资者筛选风险股票具有实用价值'
        ],
        cons: [
          '依赖历史财务数据的准确性',
          '对新上市公司或数据不完整的公司适用性有限',
          '可能产生误报（假阳性），特别是高增长行业',
          '不能替代专业审计和尽职调查'
        ]
      },
      en: {
        name: 'Beneish M-Score',
        description: 'The Beneish M-Score model analyzes 8 financial indicator changes to detect the likelihood of earnings manipulation. Developed by Professor Messod Beneish at Indiana University in 1999, it successfully flagged the Enron scandal.',
        pros: [
          'Backed by academic research with empirical support',
          'Multi-dimensional analysis reduces single-factor bias',
          'Quantifiable threshold (-1.78) for clear decision making',
          'Practical for screening risky stocks'
        ],
        cons: [
          'Relies on accuracy of historical financial data',
          'Limited applicability for newly listed or data-incomplete companies',
          'May produce false positives, especially in high-growth sectors',
          'Cannot replace professional auditing and due diligence'
        ]
      }
    },
    columns: {
      zh: ['公司', 'DSRI', 'GMI', 'AQI', 'SGI', 'DEPI', 'SGAI', 'TATA', 'LVGI', 'M-Score', '判定'],
      en: ['Company', 'DSRI', 'GMI', 'AQI', 'SGI', 'DEPI', 'SGAI', 'TATA', 'LVGI', 'M-Score', 'Verdict']
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

        // DSRI = (Receivables_t / Revenue_t) / (Receivables_t-1 / Revenue_t-1)
        var dsri = p.revenue && p.receivables ? (c.receivables / c.revenue) / (p.receivables / p.revenue) : 1;

        // GMI = Gross Margin_t-1 / Gross Margin_t
        var gm_c = c.revenue ? c.gross_profit / c.revenue : 0;
        var gm_p = p.revenue ? p.gross_profit / p.revenue : 0;
        var gmi = gm_c ? gm_p / gm_c : 1;

        // AQI = (1 - (CA_t + PPE_t) / TA_t) / (1 - (CA_t-1 + PPE_t-1) / TA_t-1)
        var aq_c = c.total_assets ? 1 - (c.current_assets + c.ppe_net) / c.total_assets : 0;
        var aq_p = p.total_assets ? 1 - (p.current_assets + p.ppe_net) / p.total_assets : 0;
        var aqi = aq_p ? aq_c / aq_p : 1;

        // SGI = Revenue_t / Revenue_t-1
        var sgi = p.revenue ? c.revenue / p.revenue : 1;

        // DEPI = (Dep_t-1 / (Dep_t-1 + PPE_t-1)) / (Dep_t / (Dep_t + PPE_t))
        var dep_rate_c = (c.depreciation + c.ppe_net) ? c.depreciation / (c.depreciation + c.ppe_net) : 0;
        var dep_rate_p = (p.depreciation + p.ppe_net) ? p.depreciation / (p.depreciation + p.ppe_net) : 0;
        var depi = dep_rate_c ? dep_rate_p / dep_rate_c : 1;

        // SGAI = (SGA_t / Revenue_t) / (SGA_t-1 / Revenue_t-1)
        var sga_c = c.revenue ? c.sga / c.revenue : 0;
        var sga_p = p.revenue ? p.sga / p.revenue : 0;
        var sgai = sga_p ? sga_c / sga_p : 1;

        // TATA = (NI_t - CFO_t) / TA_t
        var tata = c.total_assets ? (c.net_income - c.operating_cash_flow) / c.total_assets : 0;

        // LVGI = (TL_t / TA_t) / (TL_t-1 / TA_t-1)
        var lev_c = c.total_assets ? c.total_liabilities / c.total_assets : 0;
        var lev_p = p.total_assets ? p.total_liabilities / p.total_assets : 0;
        var lvgi = lev_p ? lev_c / lev_p : 1;

        // M = -4.84 + 0.920*DSRI + 0.528*GMI + 0.404*AQI + 0.892*SGI + 0.115*DEPI - 0.172*SGAI + 4.679*TATA - 0.327*LVGI
        var mScore = -4.84 + 0.920 * dsri + 0.528 * gmi + 0.404 * aqi + 0.892 * sgi + 0.115 * depi - 0.172 * sgai + 4.679 * tata - 0.327 * lvgi;

        var verdict, verdictClass;
        if (mScore > -1.78) {
          verdict = { zh: '可能操纵', en: 'Likely Manipulator' };
          verdictClass = 'verdict-danger';
        } else {
          verdict = { zh: '不太可能', en: 'Unlikely' };
          verdictClass = 'verdict-safe';
        }

        results.push({
          ticker: ticker,
          name: d.name,
          dsri: dsri,
          gmi: gmi,
          aqi: aqi,
          sgi: sgi,
          depi: depi,
          sgai: sgai,
          tata: tata,
          lvgi: lvgi,
          score: mScore,
          verdict: verdict,
          verdictClass: verdictClass
        });
      }
      return results;
    }
  };
})();
