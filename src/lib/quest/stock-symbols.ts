export type StockMatch = {symbol:string; exchange:'NASDAQ'|'NYSE'|'AMEX'; name:string};
const stocks: [string, StockMatch['exchange'], string, string[]][] = [
  ['AAPL','NASDAQ','Apple',['apple','苹果']], ['NVDA','NASDAQ','NVIDIA',['nvidia','英伟达']],
  ['MSFT','NASDAQ','Microsoft',['microsoft','微软']], ['TSLA','NASDAQ','Tesla',['tesla','特斯拉']],
  ['AMZN','NASDAQ','Amazon',['amazon','亚马逊']], ['GOOGL','NASDAQ','Alphabet',['google','alphabet','谷歌']],
  ['META','NASDAQ','Meta',['meta','facebook']], ['QQQ','NASDAQ','Invesco QQQ',[]],
  ['AMD','NASDAQ','AMD',[]], ['AVGO','NASDAQ','Broadcom',['broadcom','博通']],
  ['PLTR','NASDAQ','Palantir',['palantir']], ['WMT','NASDAQ','Walmart',['walmart']],
  ['JPM','NYSE','JPMorgan Chase',['jpmorgan']], ['IBM','NYSE','IBM',[]],
  ['DIS','NYSE','Disney',['disney','迪士尼']], ['KO','NYSE','Coca-Cola',['coca cola']],
  ['BAC','NYSE','Bank of America',[]], ['XOM','NYSE','Exxon Mobil',[]], ['V','NYSE','Visa',['visa']],
  ['BRK.B','NYSE','Berkshire Hathaway',['berkshire']], ['SPY','AMEX','SPDR S&P 500',[]],
];
export function knownStock(input:string):StockMatch|undefined {
  const value=input.trim().toLowerCase();
  const row=stocks.find(([symbol,,,aliases])=>symbol.toLowerCase()===value||aliases.includes(value));
  return row?{symbol:row[0],exchange:row[1],name:row[2]}:undefined;
}
export function quoteExchange(value:string):StockMatch['exchange']|undefined {
  return ['NMS','NGM','NCM','NASDAQ'].includes(value)?'NASDAQ':['NYQ','NYSE'].includes(value)?'NYSE':['ASE','PCX','AMEX','NYSEARCA'].includes(value)?'AMEX':undefined;
}
