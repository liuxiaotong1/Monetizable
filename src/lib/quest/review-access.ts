export type ReviewInsight={headline:string;detail:string};
export function firstAction(insight:ReviewInsight):ReviewInsight{
 const sentence=insight.detail.split(/(?<=[。！？])|(?<=[.!?])\s+/u).map(s=>s.trim()).find(Boolean)||insight.detail;
 return {headline:insight.headline,detail:sentence};
}
/** Explicit allowlist: the free response never serializes deep analysis or its evidence packet. */
export function projectPredictionReview(report:Record<string,unknown>,premium:boolean){
 if(premium)return {...report,access:'pro' as const};
 return {access:'basic' as const,reflection:report.reflection,evidence:report.evidence,nextStep:firstAction(report.practice as ReviewInsight),verified:report.verified,generatedAt:report.generatedAt};
}
export function projectReasonFeedback(report:Record<string,unknown>,premium:boolean){
 return premium?{...report,access:'pro' as const}:{access:'basic' as const,headline:report.headline,detail:report.detail,nextStep:report.nextStep};
}
export const mentorQuestions=['reason','countercase','next'] as const;
export function mentorQuestion(value:unknown){return typeof value==='string'&&(mentorQuestions as readonly string[]).includes(value)?value as typeof mentorQuestions[number]:null;}
