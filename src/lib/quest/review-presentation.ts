import type {CurrentReviewContext} from './prediction-review-context';
type Locale='zh'|'en'|'fr';
type Boss={kind:string;symbol?:string;title:string;unit:string};
const names:Record<string,Record<Locale,string>>={
 FOMC:{zh:'美联储利率决议',en:'Federal Reserve rate decision',fr:'Décision de taux de la Fed'},
 CLAIMS:{zh:'初请失业金',en:'Initial jobless claims',fr:'Demandes initiales d’allocation chômage'},
 CPI:{zh:'消费者物价',en:'Consumer price inflation',fr:'Inflation des prix à la consommation'},
 PCE:{zh:'个人消费支出物价',en:'Personal consumption inflation',fr:'Inflation des dépenses de consommation'},
 NFP:{zh:'非农就业报告',en:'Nonfarm payrolls',fr:'Emploi non agricole'},
 GDP:{zh:'经济增长',en:'Economic growth',fr:'Croissance économique'},
 PPI:{zh:'生产者物价',en:'Producer prices',fr:'Prix à la production'},
 ISM:{zh:'企业景气调查',en:'Business activity survey',fr:'Enquête sur l’activité des entreprises'},
 RETAIL:{zh:'零售销售',en:'Retail sales',fr:'Ventes au détail'},
 JOLTS:{zh:'职位空缺',en:'Job openings',fr:'Offres d’emploi'},
 CONFIDENCE:{zh:'消费者信心',en:'Consumer confidence',fr:'Confiance des consommateurs'}
};
export function reviewBossTitle(boss:Boss,locale:Locale){
 if(boss.kind==='EARNINGS')return (boss.symbol||'')+' · '+({zh:'公司财报',en:'Company earnings',fr:'Résultats de l’entreprise'}[locale]);
 return names[boss.kind]?.[locale]||(locale==='zh'?boss.title:/[\u3400-\u9fff]/.test(boss.title)?boss.kind:boss.title);
}
export function reviewBossUnit(unit:string,locale:Locale){
 if(locale==='zh')return unit;
 const terms:[string,string,string][]=[
 ['目标利率区间上限','upper end of target rate range','borne haute du taux cible'],
 ['季环比折年率','annualized quarter-on-quarter','variation trimestrielle annualisée'],
 ['季环比年化','annualized quarter-on-quarter','variation trimestrielle annualisée'],
 ['季调初次申请','seasonally adjusted initial claims','demandes initiales corrigées des variations saisonnières'],
 ['月度净新增非农就业','monthly change in nonfarm payrolls','variation mensuelle de l’emploi non agricole'],
 ['未季调','not seasonally adjusted','non corrigé des variations saisonnières'],
 ['同比','year-on-year','sur un an'],['环比','month-on-month','sur un mois'],
 ['季调','seasonally adjusted','corrigé des variations saisonnières'],
 ['千人','thousand people','milliers de personnes'],['万人','ten thousand people','dizaines de milliers de personnes'],
 ['亿美元','USD hundred million','centaines de millions USD'],['十亿美元','USD billion','milliards USD'],
 ['美元','USD','USD'],['人','people','personnes'],['指数','index','indice'],['点','points','points']
 ];
 let result=unit;for(const [zh,en,fr]of terms)result=result.replaceAll(zh,locale==='fr'?fr:en);
 return result.replaceAll('，',', ').replace(/[\u3400-\u9fff]+/g,'').trim();
}
/** A price-trend proxy, deliberately separate from surveyed or live investor sentiment. */
export function reviewTemperature(context:CurrentReviewContext){
 const p=context.priceMap,values=[
 p.ma20!==undefined&&Number.isFinite(p.ma20)?Math.sign(p.close-p.ma20):undefined,
 p.ma60!==undefined&&Number.isFinite(p.ma60)?Math.sign(p.close-p.ma60):undefined,
 Number.isFinite(p.return5Pct)?Math.sign(p.return5Pct!):undefined,
 Number.isFinite(p.return20Pct)?Math.sign(p.return20Pct!):undefined
 ].filter((n):n is number=>n!==undefined);
 const age=(Date.parse(context.marketDate+'T12:00:00Z')-Date.parse(context.priceAsOf+'T12:00:00Z'))/86400000;
 if(!Number.isFinite(p.close)||!values.length||!Number.isFinite(age)||age>5||age<0)return {level:'pending' as const,position:50};
 const mean=values.reduce((sum,n)=>sum+n,0)/values.length;
 return {level:mean<=-.75?'defensive' as const:mean<0?'cautious' as const:mean===0?'balanced' as const:mean<.75?'warming' as const:'riskOn' as const,position:Math.round((mean+1)*50)};
}
