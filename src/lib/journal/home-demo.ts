import {metrics,type Trade} from './core';
// Illustrative closed trades, never written to a user journal or presented as user performance.
const demoTrades:Trade[]=[80,-30,60,50,-20,70,-40,40,-30,60].map((net,i)=>({id:`demo-${i}`,externalId:`demo-${i}`,account:'demo',date:`2026-01-${String(i+1).padStart(2,'0')}`,symbol:'QQQ',net,currency:'USD',strategy:'demo'}));
export const homeDemo={...metrics(demoTrades),adherence:90,followed:18,checks:20};
