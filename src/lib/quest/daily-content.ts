import type {QuestState,LearningCard} from './types';
import {marketDate} from './domain';
/** New factual exercises follow actual releases, rather than relabeling old questions with today's date. */
export function factualCards(state:QuestState,locale:'zh'|'en'):LearningCard[]{
 const zh=locale==='zh',cards:LearningCard[]=[];
 const units:Partial<Record<import('./types').EventKind,string>>={CPI:'headline, year over year (%)',PCE:'headline, year over year (%)',PPI:'final demand, year over year (%)',GDP:'quarterly annualized growth (%)',NFP:'monthly change, thousands of jobs',CLAIMS:'seasonally adjusted, people',JOLTS:'thousands of job openings',TRADE:'USD billions',RETAIL:'month over month (%)',FOMC:'target range upper bound (%)'};
 for(const e of state.events.filter(e=>e.status==='confirmed'&&e.actual!==undefined&&e.previous!==undefined).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,8)){
  const delta=e.actual!-e.previous!,date=marketDate(new Date(e.at)),concept=`release-comparison:${e.id}`;
  cards.push({id:`${zh?'':'en:'}live:${concept}`,conceptId:concept,category:'events',title:zh?`${e.kind} · ${date} 公布后怎么读？`:`${e.kind} · Read the ${date} release`,question:zh?`${e.kind} 本次公布 ${e.actual}，前值 ${e.previous}（${e.unit}）。只比较这两个数值，可以确认什么？`:`${e.kind} was ${e.actual}, versus ${e.previous} previously (${units[e.kind]||'index / source units'}). What can this comparison establish?`,choices:zh?[delta>0?'该指标高于前值':delta<0?'该指标低于前值':'该指标与前值相同','纳斯达克100 ETF 一定会上涨','这就是市场预期','这个数字证明盘中入场顺序']: [delta>0?'This measure increased':delta<0?'This measure decreased':'This measure was unchanged','Nasdaq-100 ETF must rise','This is the market consensus','It proves the intraday entry sequence'],answerIndex:0,answerExplanation:zh?`本次值减前值 = ${delta.toFixed(2)}。这比较的是同口径已公布数值，不是相对市场共识的意外程度。`:`Actual minus previous = ${delta.toFixed(2)}. This compares published observations, not a surprise against consensus.`,explanation:zh?'先确认同比、环比、季调与单位一致，再比较前值。如果要判断是否超预期，必须另有同口径、公布前取得的市场共识；纳斯达克100 ETF 反应还取决于利率路径和市场已有定价。':'Match annual/monthly changes, seasonal adjustment and units first. A surprise requires separately sourced pre-release consensus. Nasdaq-100 ETF also reflects rate expectations and prior market pricing.',analogy:zh?'温度比昨天高，并不说明比医生预料的更高。':'A higher temperature than yesterday does not mean higher than the doctor expected.',example:zh?`这次 ${e.actual} 与前值 ${e.previous} 的差为 ${delta.toFixed(2)}；没有可靠共识就不填“超预期”。`:`${e.actual} versus ${e.previous} gives a difference of ${delta.toFixed(2)}; missing consensus cannot establish a forecast surprise.`,sources:[{title:e.sourceName,url:e.sourceUrl}],tags:[e.kind],difficulty:1,asOf:date,generatedAt:e.fetchedAt,topical:true});
 }return cards;
}
export function updateDailyContent(state:QuestState){
 const cards=[...contextualCards(state,'zh'),...factualCards(state,'zh')];state.cards=[...cards,...state.cards.filter(c=>!cards.some(n=>n.id===c.id))];
 state.learningUpdate={date:marketDate(new Date(state.now)),savedAt:state.now,count:cards.length,stocks:state.learningUpdate?.stocks||[],selectionBasis:'按当前事件日程、已验证公布值及最近 72 小时财经新闻主题更新；新闻题训练分析框架，不推断付费全文或编造数据。',status:cards.length?'ready':'stale'};
}

/** Pre-release exercises are derived from the current calendar, never invented actuals. */
export function contextualCards(state:QuestState,locale:'zh'|'en'):LearningCard[]{
 const zh=locale==='zh',now=new Date(state.now),date=marketDate(now),cards:LearningCard[]=[];
 const upcoming=state.events.filter(e=>Date.parse(e.at)>=+now&&Date.parse(e.at)<+now+7*86400000).sort((a,b)=>a.at.localeCompare(b.at)).slice(0,5);
 for(const e of upcoming){
  const concept=`event-preparation:${e.id}`,eventDate=marketDate(new Date(e.at));
  cards.push({id:`${zh?'':'en:'}live:${concept}`,conceptId:concept,category:'events',title:zh?`${e.kind} · ${eventDate} 事件预习`:`${e.kind} · Prepare for ${eventDate}`,question:zh?`${eventDate} 的 ${e.kind} 即将公布。应该用什么基准判断“超预期”？`:`${e.kind} is scheduled for ${eventDate}. What is the right benchmark for a release surprise?`,choices:zh?['公布前、同口径的市场共识','上次公布值本身','看到新闻后猜一个数字','纳斯达克100 ETF 当天涨跌']:['Pre-release consensus for the same measure','The previous value alone','A number guessed after the news','Nasdaq-100 ETF’s daily direction'],answerIndex:0,answerExplanation:zh?'意外程度比较实际公布值与公布前的同口径预期；前值用来比较趋势。':'A surprise compares the release with the pre-release consensus for the same measure; the previous value measures the trend.',explanation:zh?'先核对时间、观察期、单位和季调口径。如果共识尚未可靠取得，保留未知，不把前值当预期。数据公布后还要结合利率、盈利与已有定价解读。':'Check release time, observation period, units and adjustment first. If reliable consensus is unavailable, leave it unknown. Interpret the eventual release alongside rates, earnings and prior pricing.',analogy:zh?'比赛结果要和赛前预期比，不能把上场比分当预测。':'Compare the result with the pre-game expectation, not the previous score.',example:zh?'公布值高于前值，也可能低于预期；这是两个不同的比较。':'A release can be above its previous value yet below consensus. These are different comparisons.',sources:[{title:e.kind,url:e.sourceUrl}],tags:[e.kind],difficulty:1,asOf:eventDate,generatedAt:state.now,topical:true});
 }
 // Headlines select the subject; no paywalled article or unsourced numerical claim is invented.
 const topics=[
  {key:'rates',re:/\b(fed|fomc|rate|yield|bond|inflation|cpi|pce)\b/i,zh:'利率与通胀',en:'Rates and inflation',correct:['通过融资成本与贴现率影响估值','Through financing costs and discount rates'],why:['利率变化会影响借款成本和未来现金流折现；股价方向还取决于预期、增长与估值。','Rates affect borrowing costs and the discounting of future cash flows. Direction still depends on expectations, growth and valuation.']},
  {key:'earnings',re:/\b(earnings|nvidia|apple|microsoft|amazon|meta|tesla|alphabet|ai)\b/i,zh:'企业盈利与科技热点',en:'Earnings and technology',correct:['结合收入、利润率、现金流与指引','Read revenue, margins, cash flow and guidance together'],why:['热门公司或财报标题不能代替基本面核对。利好也可能已计入价格。','A popular company or earnings headline cannot replace fundamental checks. Good news may already be priced in.']},
  {key:'growth',re:/\b(jobs|employment|payroll|gdp|recession|tariff|economy|market|stock)\b/i,zh:'增长与市场风险',en:'Growth and market risk',correct:['分别核对事实、市场预期与风险情景','Separate verified facts, expectations and risk scenarios'],why:['新闻标题不是完整证据。增长、政策与市场仓位可能同时影响反应，要先核对来源。','A headline is incomplete evidence. Growth, policy and positioning can affect the reaction together; verify the source first.']}
 ];
 const used=new Set<string>();
 for(const item of state.learningHeadlines||[]){
  if(!item.publishedAt||Date.parse(item.publishedAt)>+now||+now-Date.parse(item.publishedAt)>72*3600000)continue;
  const topic=topics.find(t=>t.re.test(item.title));if(!topic||used.has(topic.key))continue;used.add(topic.key);
  const source=new URL(item.url).hostname,publication=marketDate(new Date(item.publishedAt));
  let hash=2166136261;for(const ch of item.url)hash=Math.imul(hash^ch.charCodeAt(0),16777619);
  const concept=`news-context:${(hash>>>0).toString(16)}`;
  cards.push({id:`${zh?'':'en:'}live:${concept}`,conceptId:concept,category:topic.key==='earnings'?'earnings':'events',title:zh?`${topic.zh} · 热点学习 ${publication}`:`${topic.en} · In the news ${publication}`,question:zh?`近期财经报道涉及${topic.zh}。分析这类热点，哪个框架更可靠？`:`A recent financial headline concerns ${topic.en.toLowerCase()}. Which framework is more reliable?`,choices:[topic.correct[zh?0:1],zh?'看到热门标题就立即买入':'Buy immediately because the headline is popular',zh?'把新闻热度当作确定涨幅':'Treat attention as a guaranteed return',zh?'忽略来源与风险条件':'Ignore the source and risk conditions'],answerIndex:0,answerExplanation:topic.why[zh?0:1],explanation:zh?'本题由已取得的近期新闻主题触发，训练的是分析框架，不推断全文结论，也不提供买卖指令。打开原文核对背景，再列出支持与反对证据。':'This exercise uses a retrieved recent headline to select a learning topic. It teaches an analytical framework, not an inferred article conclusion or a trading instruction. Open the source, then list supporting and opposing evidence.',analogy:zh?'新闻是地图上的提示，不是替你驾驶的方向盘。':'News is a signpost, not a steering wheel.',example:zh?'先写“已知什么、还不知道什么、什么会推翻判断”，再考虑下一步。':'Write what is known, what is unknown and what would invalidate the thesis before considering a next step.',sources:[{title:source,url:item.url}],tags:[topic.key],difficulty:1,asOf:publication,generatedAt:item.publishedAt,topical:true});
 }
 return cards;
}
