/** Count only persisted card dispositions, never answers, tab changes or an empty feed. */
export interface DeckBatch {seen:string[];batch:string[]}
export function advanceDeckBatch(state:DeckBatch,cardId:string,remainingIds:string[]){
 if(state.seen.includes(cardId)||remainingIds.includes(cardId))return {state,completed:0};
 const batch=[...state.batch,cardId],completed=state.seen.length<5&&batch.length===5?5:0;
 return {state:{seen:[...state.seen,cardId],batch},completed};
}

/** The learning allowance and completion celebration share the Paris calendar day. */
export function learningCompletionDay(at:string){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris'}).format(new Date(at));}

export function completedCardsToday(progress:{cardId:string;conceptId?:string;lastDispositionAt?:string}[],day:string){
 return [...new Set(progress.filter(p=>p.lastDispositionAt&&learningCompletionDay(p.lastDispositionAt)===day).map(p=>p.conceptId||p.cardId.replace(/^en:/,'')))];
}
