import { sessionFor, nyTimeToUtc, latestCompletedDate, marketDate } from './domain';
import type { Bar, Forecast, QuestState } from './types';
export function predictionSession(state:Pick<QuestState,'now'|'session'>) {
 const now=new Date(state.now),session=state.session;
 const date=session.isTradingDay && now.getTime()<Date.parse(session.openAt)?session.date:session.nextDate;
 return sessionFor(new Date(nyTimeToUtc(date,'12:00')));
}
export function preparationForecast(bars:Bar[],date:string,now:Date,threshold=.3):Forecast|undefined {
 const history=bars.filter(b=>b.symbol==='QQQ'&&b.date<date).sort((a,b)=>a.date.localeCompare(b.date));
 const latest=history.at(-1);if(!latest||history.length<20)return;
 const recent=history.slice(-5),ma20=history.slice(-20).reduce((sum,b)=>sum+b.close,0)/20;
 const atr14=history.slice(-14).reduce((sum,b)=>{const index=history.indexOf(b),previous=history[index-1]?.close??b.open;return sum+Math.max(b.high-b.low,Math.abs(b.high-previous),Math.abs(b.low-previous));},0)/14;
 const support=Math.min(...recent.map(b=>b.low)),resistance=Math.max(...recent.map(b=>b.high));
 const round=(n:number)=>Math.round(n*100)/100;
 const provisional=latest.date!==sessionFor(new Date(nyTimeToUtc(date,'12:00'))).previousDate;
 const basis=`截至 ${latest.date} 的已完成日线；MA20 为20个收盘均值，ATR14 为14个真实波幅均值。${provisional?'前一交易日尚未收盘，当前价位仅是提前准备参考；方向复盘使用目标日实际前收盘。':''}`;
 return {id:`preparation:${date}:${latest.date}:${round(latest.close)}`,date,version:1,createdAt:now.toISOString(),dataAsOf:latest.date,baselineClose:latest.close,baselineDate:latest.date,provisional,threshold,summary:`${date} 提前准备：参考已确认的 ${latest.date} 收盘 $${latest.close.toFixed(2)}；保留原始依据，等待目标日验证。`,weeklyView:latest.close>=ma20?'收盘高于20日均线，观察支撑能否守住。':'收盘低于20日均线，观察阻力能否收回。',weeklyInvalidation:`重新评估最近五日区间 ${round(support)}–${round(resistance)}。`,levels:{support:round(support),resistance:round(resistance),ma20:round(ma20),atr14:round(atr14)},source:'rules',dataSource:latest.source+'；'+basis,scenarios:[
 {direction:'bullish',title:'偏多 · 突破关卡',condition:`观察前高 ${round(latest.high)} 与阻力 ${round(resistance)}。`,invalidation:`跌回参考收盘 ${round(latest.close)} 下方并无法收回。`,low:round(latest.close-atr14*.5),high:round(latest.close+atr14*1.5),basis},
 {direction:'neutral',title:'震荡 · 守住营地',condition:`围绕参考收盘 ${round(latest.close)} 波动。`,invalidation:'离开参考区间，重新核对条件。',low:round(latest.close-atr14),high:round(latest.close+atr14),basis},
 {direction:'bearish',title:'偏空 · 支撑失守',condition:`观察前低 ${round(latest.low)} 与支撑 ${round(support)}。`,invalidation:`重新站回参考收盘 ${round(latest.close)}。`,low:round(latest.close-atr14*1.5),high:round(latest.close+atr14*.5),basis}]};
}
