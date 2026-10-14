import {knownStock,quoteExchange,type StockMatch} from '@/lib/quest/stock-symbols';
export async function GET(request:Request) {
  const query=new URL(request.url).searchParams.get('q')?.trim()||'';
  if(!query||query.length>60)return Response.json({error:'Enter a stock name or ticker.'},{status:400});
  const known=knownStock(query);
  if(known)return Response.json({matches:[known]});
  try {
    const response=await fetch('https://query1.finance.yahoo.com/v1/finance/search?'+new URLSearchParams({q:query,quotesCount:'8',newsCount:'0'}),{headers:{'User-Agent':'Mozilla/5.0'},next:{revalidate:86400},signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error('Unavailable');
    const data=await response.json();
    const matches:StockMatch[]=(data.quotes||[]).flatMap((q:{symbol?:string;exchange:string;quoteType:string;longname?:string;shortname?:string})=>{
      const exchange=quoteExchange(q.exchange);
      return exchange&&['EQUITY','ETF'].includes(q.quoteType)&&q.symbol&&/^[A-Z][A-Z0-9]{0,5}(?:[.-][A-Z0-9]{1,2})?$/.test(q.symbol)?[{symbol:q.symbol.replace(/-([A-Z])$/,'.$1'),exchange,name:q.longname||q.shortname||q.symbol}]:[];
    });
    return Response.json({matches},{headers:{'Cache-Control':'public, max-age=300, s-maxage=86400'}});
  }catch{return Response.json({error:'Symbol search unavailable. Please retry.'},{status:503});}
}
