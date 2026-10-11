import {getPublicFeed} from '@/lib/quest/public-source';
import {marketContext} from '@/lib/quest/market-context';
export const dynamic='force-dynamic';
export async function GET(){
 const {state}=await getPublicFeed(),context=marketContext(state),bar=context.latest;
 return Response.json({expectedDate:context.expectedDate,isTradingDay:state.session.isTradingDay,previousTradingDate:state.session.previousDate,opensAt:state.session.openAt,brief:bar?{date:state.session.date,status:context.fresh?'verified':'partial',dataAsOf:bar.fetchedAt,savedAt:bar.fetchedAt,version:1,summary:state.forecasts.find(f=>f.date===state.session.date)?.summary||`最近确认的常规时段收盘来自 ${bar.date}。先核对事件窗口与关键区间，再留下自己的判断。`,watchPoints:[],quote:{date:bar.date,close:bar.close,high:bar.high,low:bar.low,sourceUrl:'https://finance.yahoo.com/quote/QQQ/history/'},sources:[{title:bar.source,url:'https://finance.yahoo.com/quote/QQQ/history/'}]}:undefined},{headers:{'Cache-Control':'public,max-age=0,s-maxage=30'}});
}
