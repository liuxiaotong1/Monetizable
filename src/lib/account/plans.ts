export type PaidPlan='monthly'|'annual';
export const MONTHLY_CENTS=999,ANNUAL_CENTS=7900,TRIAL_DAYS=7;
export function paidPlan(value:unknown):PaidPlan|undefined{return value==='monthly'||value==='annual'?value:undefined;}
export const annualSavings=Math.round((1-ANNUAL_CENTS/(MONTHLY_CENTS*12))*100);
