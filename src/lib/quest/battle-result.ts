import type {Review} from './types';
/** A battle belongs to one verified, eligible call; UI animation flags are not results. */
export function predictionBattleOutcome(review?:Review):'win'|'loss'|undefined {
 const call=review?.judgmentSnapshot;
 if(!review||typeof review.matched!=='boolean'||!call?.eligible)return;
 if(call.date!==review.date||call.forecastId!==review.forecastId||review.actual.date!==review.date||review.actual.symbol!=='QQQ'||(review.judgmentId&&review.judgmentId!==call.id))return;
 return review.matched===true&&call.direction===review.actualDirection?'win':'loss';
}
