import type {EventKind} from './types';
export const bossIdentities={
 CPI:{icon:'🦖',color:'#d9e8ba',en:'Inflation Rex',fr:'Rex de l’inflation',zh:'通胀暴龙'},
 PCE:{icon:'🐉',color:'#d5e8df',en:'Price Dragon',fr:'Dragon des prix',zh:'物价巨龙'},
 PPI:{icon:'🌋',color:'#f6d5c4',en:'Forge Beast',fr:'Bête de la forge',zh:'成本熔岩兽'},
 NFP:{icon:'🦍',color:'#dfd8ca',en:'Jobs Titan',fr:'Titan de l’emploi',zh:'就业泰坦'},
 CLAIMS:{icon:'👹',color:'#f1d7c5',en:'Claims Ogre',fr:'Ogre du chômage',zh:'初请独角怪'},
 JOLTS:{icon:'🕷️',color:'#e8d7e9',en:'Hiring Weaver',fr:'Tisseuse du recrutement',zh:'招聘织网蛛'},
 GDP:{icon:'🦕',color:'#d2e5cc',en:'Growth Colossus',fr:'Colosse de la croissance',zh:'增长巨兽'},
 FOMC:{icon:'medusa',color:'#d8ddf3',en:'Rate Medusa',fr:'Méduse des taux',zh:'利率美杜莎'},
 MINUTES:{icon:'🦉',color:'#e5d8bd',en:'Council Oracle',fr:'Oracle du conseil',zh:'议事神谕兽'},
 BEIGE_BOOK:{icon:'👻',color:'#eadfd0',en:'Regional Phantom',fr:'Fantôme des régions',zh:'地区幽灵'},
 EARNINGS:{icon:'🦁',color:'#f4e1a5',en:'Earnings Guardian',fr:'Gardien des résultats',zh:'财报守卫狮'},
 ISM:{icon:'🤖',color:'#d1e4e7',en:'Factory Golem',fr:'Golem des usines',zh:'景气机械魔像'},
 CONFIDENCE:{icon:'🦊',color:'#f5dfc0',en:'Sentiment Fox',fr:'Renard du sentiment',zh:'情绪幻狐'},
 RETAIL:{icon:'🐲',color:'#e6d9f0',en:'Demand Hydra',fr:'Hydre de la demande',zh:'消费九头龙'},
 TRADE:{icon:'🐙',color:'#dbd9ee',en:'Trade Kraken',fr:'Kraken du commerce',zh:'贸易海妖'},
} satisfies Record<EventKind,{icon:string;color:string;en:string;fr:string;zh:string}>;
