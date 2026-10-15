import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createJiti} from 'jiti';
import {fileURLToPath} from 'node:url';
const jiti=createJiti(import.meta.url,{alias:{'@':fileURLToPath(new URL('../src',import.meta.url))}});
const {knownStock}=await jiti.import('../src/lib/quest/stock-symbols.ts');
const {GET}=await jiti.import('../src/app/api/market/symbols/route.ts');
test('DXY names and provider aliases resolve to the dollar index chart source',()=>{
 for(const alias of ['DXY','dxy',' DXY ','美元指数','美元指數','TVC:DXY','DX-Y.NYB','^DXY','US Dollar Index','U.S. Dollar Index']){
  const result=knownStock(alias);assert.equal(result.symbol,'DXY',alias);assert.equal(`${result.exchange}:${result.symbol}`,'TVC:DXY',alias);
 }
});
test('symbol endpoint accepts DXY without depending on an equity-only upstream search',async()=>{
 for(const q of ['DXY','美元指数','TVC:DXY']){
  const response=await GET(new Request('https://getmonetizable.com/api/market/symbols?'+new URLSearchParams({q})));
  assert.equal(response.status,200);assert.deepEqual((await response.json()).matches,[{symbol:'DXY',exchange:'TVC',name:'U.S. Dollar Index'}]);
 }
});
test('existing stocks still resolve correctly; the DXY alias cannot match unrelated tickers',()=>{
 assert.equal(knownStock('Apple').symbol,'AAPL');assert.equal(knownStock('苹果').exchange,'NASDAQ');assert.equal(knownStock('BRK.B').exchange,'NYSE');assert.equal(knownStock('SPY').exchange,'AMEX');assert.equal(knownStock('DXYFAKE'),undefined);
});
