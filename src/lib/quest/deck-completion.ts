/** Count only persisted card dispositions, never answers, tab changes or an empty feed. */
export interface DeckBatch {seen:string[];batch:string[]}
export function advanceDeckBatch(state:DeckBatch,cardId:string,remainingIds:string[]){
 if(state.seen.includes(cardId)||remainingIds.includes(cardId))return {state,completed:0};
 const batch=[...state.batch,cardId],completed=remainingIds.length===0||batch.length>=5?batch.length:0;
 return {state:{seen:[...state.seen,cardId],batch:completed?[]:batch},completed};
}
