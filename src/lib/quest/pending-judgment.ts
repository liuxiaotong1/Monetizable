import type { QuestState, Judgment } from './types';
/** A newer sealed call awaiting its own session must never inherit an old review's verdict. */
export function pendingJudgment(state: QuestState): Judgment | undefined {
 const calls = [state.judgment, ...(state.trackingWeeks || []).flatMap(w => w.days.map(d => d.judgment))]
  .filter((j): j is Judgment => !!j)
  .sort((a,b) => b.date.localeCompare(a.date));
 const latestReview = state.reviews[0];
 return calls.find(j => j.eligible && !state.reviews.some(r => r.date === j.date) && (!latestReview || j.date > latestReview.date));
}
