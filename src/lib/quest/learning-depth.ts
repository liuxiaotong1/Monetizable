import lessons from './learning-depth.json';
import type {LearningCard} from './types';
export type Lesson = typeof lessons[number];
export function detailedLesson(card:LearningCard):Lesson|undefined {
  const title=card.title.toLowerCase(),tags=card.tags.join(' ').toLowerCase(),ids=[card.id,card.conceptId||''];
  let best:Lesson|undefined,score=0;
  for(const lesson of lessons){
    const match=Math.max(...lesson.patterns.map(pattern=>ids.some(id=>id===pattern||id.startsWith(pattern+':'))?100:title.includes(pattern.toLowerCase())?50:tags.includes(pattern.toLowerCase())?10:0));
    if(match>score){best=lesson;score=match;}
  }
  return best;
}
const oic='https://www.optionseducation.org/';
const sec='https://www.sec.gov/about/reports-publications/investorpubsbegfinstmtguide';
export const glossaryTerms=[
  {name:"OIC",pattern:"\\bOIC\\b",zh:"期权行业协会：由期权清算公司 OCC 提供的教育资源，帮助理解期权的原理与风险，不是交易信号。",en:"Options Industry Council: an educational resource provided by OCC to explain how options work and their risks, not a trading signal.",fr:"Options Industry Council : une ressource pédagogique proposée par OCC pour comprendre les options et leurs risques, pas un signal de trading.",url:oic},
  {name:'Put',pattern:'\\bput\\b|看跌期权',zh:'看跌期权：买方取得按执行价卖出标的的权利；卖方收权利金，同时承担被行权后的义务。',en:'A put buyer has the right to sell at the strike; the seller receives premium and takes the exercise obligation.',url:oic+'strategies/all-strategies/long-put'},
  {name:'Call',pattern:'\\bcall\\b|看涨期权',zh:'看涨期权：买方取得按执行价买入标的的权利，不等于已经持有股票。',en:'A call grants its buyer the right to buy at the strike, not immediate stock ownership.',url:oic+'strategies/all-strategies/long-call'},
  {name:'Strike · 执行价',pattern:'执行价|行权价|\\bstrike\\b',zh:'行权时使用的约定价格，与现在的股票价格、买期权支付的权利金不同。',en:'The contract’s exercise price, distinct from the current stock price or option premium.',url:oic+'optionsoverview/options-basics'},
  {name:'Premium · 权利金',pattern:'权利金|净支出|净付|\\bpremium\\b|\\bdebit\\b',zh:'买期权支付、卖期权收取的价格。报价常按每股显示，合约总金额还需乘实际乘数。',en:'The price paid for an option. Per-share quotes must be multiplied by the actual contract multiplier.',url:oic+'optionsoverview/options-basics'},
  {name:'Assignment · 指派',pattern:'指派|\\bassignment\\b|\\bassigned\\b',zh:'期权卖方被要求履行义务。卖 Put 被指派时，通常需按执行价接收股票并支付资金，具体取决于合约规格。',en:'The option seller must fulfill exercise obligations. A physically settled short put typically requires buying the shares at the strike.',url:'https://www.finra.org/investors/insights/trading-options-understanding-assignment'},
  {name:'Delta',pattern:'\\bdelta\\b',zh:'标的价格小幅变化时，期权报价的局部敏感度；会变化，不是固定盈利概率。',en:'Local premium sensitivity to a small underlying-price move; changing, not a fixed profit probability.',url:oic+'advancedconcepts/delta'},
  {name:'Gamma',pattern:'\\bgamma\\b',zh:'Delta 对标的价格变化的敏感度，可让仓位的方向敞口迅速改变。',en:'How delta responds to underlying-price moves, changing directional exposure.',url:oic+'advancedconcepts/gamma'},
  {name:'Theta',pattern:'\\btheta\\b|时间衰减',zh:'剩余时间减少对理论报价的影响，并非每天固定扣除的现金费用。',en:'Theoretical premium sensitivity to time passing, not a fixed daily cash charge.',url:oic+'advancedconcepts/theta'},
  {name:'IV · 隐含波动率',pattern:'\\biv\\b|隐含波动|implied volatility',zh:'从期权价格反推的波动率输入，表达价格波动规模的定价，不预测涨跌方向。',en:'A volatility input inferred from option prices, concerning movement size rather than direction.',url:oic+'advancedconcepts/volatility-the-greeks'},
  {name:'Liquidity · 流动性',pattern:'流动性|\\bliquidity\\b|\\billiquidity\\b',zh:'在需要时能否取得现金，或以合理价差成交。拥有资产，不代表当下立刻付得出钱。',en:'Access to cash or execution at workable prices. Holding assets does not ensure immediate cash availability.',url:'https://www.federalreservehistory.org/essays/panic-of-1907'},
  {name:'Bank run · 挤兑',pattern:'挤兑|bank run|withdrawals|1907',zh:'许多储户或资金提供者集中取回资金，使机构面临即时现金压力。',en:'Many depositors or funders withdraw together, creating immediate cash pressure.',url:'https://www.federalreservehistory.org/essays/banking-panics-of-the-gilded-age'},
  {name:'Leverage · 杠杆',pattern:'杠杆|\\bleverage\\b|2008',zh:'借款或衍生品让敞口大于投入资本，收益与损失都可能被放大。',en:'Borrowing or derivatives create exposure beyond invested capital, amplifying gains and losses.',url:'https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks/using-margin'},
  {name:'EPS · 每股盈利',pattern:'\\beps\\b|每股盈利',zh:'归属于普通股股东的利润，分摊到加权平均普通股数后的会计指标。',en:'Earnings attributable to common shareholders divided by weighted-average common shares.',url:sec},
  {name:'Margin · 利润率',pattern:'利润率|毛利率|gross margin|profit margin|margin vs',zh:'某类利润 ÷ 营收。毛利率、营业利润率与净利率使用不同层次的利润，不能混算。',en:'A profit measure divided by revenue. Gross, operating and net margins use different profit measures.',url:sec},
  {name:'Cash flow · 现金流',pattern:'现金流|cash flow',zh:'期间实际现金流入和流出；确认收入或利润的时点与收付款时点可能不同。',en:'Cash entering and leaving over a period; recognition of revenue and profit may occur at different times.',url:sec},
  {name:'RSI',pattern:'\\brsi\\b|超买|超卖',zh:'0–100 的相对动量指标，常见阈值是参考，不是自动反转开关。',en:'A 0–100 relative-momentum indicator; familiar thresholds do not guarantee reversal.',url:'https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/RSI'},
  {name:'ATR',pattern:'\\batr\\b|真实波幅',zh:'平均真实波幅，把相对前收盘的跳空也考虑进去，测波动大小而非方向。',en:'Average true range includes gaps relative to the prior close; it measures movement size, not direction.',url:'https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/atr'},
  {name:'VWAP',pattern:'\\bvwap\\b',zh:'成交量加权平均价格：Σ(价格 × 成交量) ÷ Σ成交量。计算从哪个时点开始，会影响结果。',en:'Volume-weighted average price: Σ(price × volume) / Σvolume. The starting point matters.',url:'https://www.fidelity.com/learning-center/trading-investing/technical-analysis/new-charts-replay'},
  {name:'EMA / SMA · 均线',pattern:'\\bema\\b|\\bsma\\b|均线|moving average',zh:'SMA 对窗口内价格等权平均；EMA 给较近价格更大权重。两者都基于历史价格。',en:'SMA weights window prices equally; EMA gives more weight to recent prices. Both use past prices.',url:'https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/ema'},
  {name:'CPI',pattern:'\\bcpi\\b',zh:'消费者价格指数；同比比较上年同月，环比比较上月，整体与核心也要分清。',en:'Consumer Price Index. Distinguish annual from monthly changes and headline from core.',url:'https://www.bls.gov/cpi/questions-and-answers.htm'},
  {name:'PCE',pattern:'\\bpce\\b',zh:'个人消费支出价格指数：观察消费价格变化，范围、权重和方法与 CPI 不同。比较前先核对同为整体或核心。',en:'A consumer-spending price index with coverage, weights and methods different from CPI. Match headline or core before comparing.',url:'https://www.bea.gov/resources/learning-center/what-to-know-prices-inflation'},
  {name:'GDP',pattern:'\\bgdp\\b',zh:'一段时期内国内生产的最终商品和服务的价值。实际 GDP 剔除价格影响；增长率不等于总金额。',en:'The value of final domestic output over a period. Real GDP removes price effects; growth rates differ from dollar levels.',url:'https://www.bea.gov/resources/learning-center/what-to-know-gdp'},
  {name:'FOMC',pattern:'\\bfomc\\b|联邦公开市场',zh:'美联储的联邦公开市场委员会，负责货币政策决策。会议纪要、声明与个人利率预测不是同一类信息。',en:'The Federal Open Market Committee makes monetary-policy decisions. Minutes, statements and individual projections are distinct.',url:'https://www.federalreserve.gov/monetarypolicy/fomc.htm'},
  {name:'GPU',pattern:'\\bgpu\\b',zh:'可并行执行大量运算的处理器。AI 计算效率还受内存、数据搬运、软件和任务形状限制。',en:'A highly parallel processor; AI performance also depends on memory, data movement, software and workload shape.',url:'https://docs.nvidia.com/deeplearning/performance/dl-performance-gpu-background/index.html'},
  {name:'HBM',pattern:'\\bhbm\\b|高带宽内存',zh:'高带宽内存，为处理器提供数据。容量决定装多少，带宽决定搬多快；它不代替 GPU 执行计算。',en:'High-bandwidth memory feeds the processor. Capacity is how much fits; bandwidth is how quickly data moves.',url:'https://docs.nvidia.com/deeplearning/performance/dl-performance-gpu-background/index.html'},
  {name:'Consensus · 市场预期',pattern:'市场预期|共识|consensus',zh:'某来源汇总的预测，不是已经公布的事实；需确认来源、采样时间和数据口径。',en:'A sourced aggregation of forecasts, not an actual release. Check timing and definitions.',url:'https://www.bls.gov/cpi/questions-and-answers.htm'},
];
export function cardTerms(card:LearningCard){
  const lesson=detailedLesson(card);
  const added=lesson?['zh','en'].flatMap(locale=>{const copy=lesson[locale as 'zh'|'en'];return [copy.intro,copy.example,copy.pitfall,...copy.steps.map(step=>step.text)];}):[];
  const text=[card.title,card.question,card.explanation,card.answerExplanation,card.tags.join(' '),...added].join(' ');
  return glossaryTerms.filter(term=>new RegExp(term.pattern,'i').test(text));
}

const termNames: Record<string, {en:string;fr:string;zh:string}> = {
 'Put':{en:'Put option',fr:'Option de vente',zh:'看跌期权'},
 'Call':{en:'Call option',fr:'Option d’achat',zh:'看涨期权'},
 'Strike · 执行价':{en:'Strike price',fr:'Prix d’exercice',zh:'执行价'},
 'Premium · 权利金':{en:'Option premium',fr:'Prime de l’option',zh:'权利金'},
 'Assignment · 指派':{en:'Assignment',fr:'Assignation',zh:'指派'},
 'Delta':{en:'Delta',fr:'Delta',zh:'方向敏感度（Delta）'},
 'Gamma':{en:'Gamma',fr:'Gamma',zh:'方向敏感度的变化（Gamma）'},
 'Theta':{en:'Theta',fr:'Thêta',zh:'时间衰减（Theta）'},
 'IV · 隐含波动率':{en:'Implied volatility (IV)',fr:'Volatilité implicite',zh:'隐含波动率'},
 'Liquidity · 流动性':{en:'Liquidity',fr:'Liquidité',zh:'流动性'},
 'Bank run · 挤兑':{en:'Bank run',fr:'Ruée bancaire',zh:'挤兑'},
 'Leverage · 杠杆':{en:'Leverage',fr:'Effet de levier',zh:'杠杆'},
 'EPS · 每股盈利':{en:'Earnings per share (EPS)',fr:'Bénéfice par action (BPA)',zh:'每股盈利'},
 'Margin · 利润率':{en:'Profit margin',fr:'Marge bénéficiaire',zh:'利润率'},
 'Cash flow · 现金流':{en:'Cash flow',fr:'Flux de trésorerie',zh:'现金流'},
 'RSI':{en:'Relative strength index (RSI)',fr:'Indice de force relative (RSI)',zh:'相对强弱指数（RSI）'},
 'ATR':{en:'Average true range (ATR)',fr:'Amplitude réelle moyenne (ATR)',zh:'平均真实波幅（ATR）'},
 'VWAP':{en:'Volume-weighted average price (VWAP)',fr:'Prix moyen pondéré par les volumes',zh:'成交量加权平均价格'},
 'EMA / SMA · 均线':{en:'Moving averages (EMA / SMA)',fr:'Moyennes mobiles simples et exponentielles',zh:'简单与指数移动平均线'},
 'CPI':{en:'Consumer Price Index (CPI)',fr:'Indice des prix à la consommation (IPC)',zh:'消费者价格指数'},
 'PCE':{en:'Personal consumption expenditures (PCE)',fr:'Indice des prix des dépenses de consommation',zh:'个人消费支出价格指数'},
 'GDP':{en:'Gross domestic product (GDP)',fr:'Produit intérieur brut (PIB)',zh:'国内生产总值'},
 'FOMC':{en:'Federal Open Market Committee (FOMC)',fr:'Comité de politique monétaire de la Réserve fédérale',zh:'联邦公开市场委员会'},
 'GPU':{en:'Graphics processing unit (GPU)',fr:'Processeur graphique',zh:'图形处理器'},
 'HBM':{en:'High-bandwidth memory (HBM)',fr:'Mémoire à haute bande passante',zh:'高带宽内存'},
 'Consensus · 市场预期':{en:'Market consensus',fr:'Consensus du marché',zh:'市场共识'},
};
export function termLabel(name:string,locale:'en'|'fr'|'zh') { return termNames[name]?.[locale] ?? name; }
