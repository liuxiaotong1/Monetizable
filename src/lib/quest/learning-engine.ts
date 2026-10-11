import type { LearningCard, CardProgress, Category } from "./types";
export const learningThemes: Category[] = ["earnings", "options", "history", "technical", "events"];
export const conceptKey = (card: Pick<LearningCard, "id" | "conceptId">) => card.conceptId || card.id;
export const questionKey = (card: LearningCard) => `${card.category}:${card.question.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}\s]/gu, "")}`;
const dateAt = (at: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/New_York" }).format(new Date(at));
function identities(cards: LearningCard[], progress: CardProgress[], predicate: (p: CardProgress) => boolean) {
 const byId = new Map(cards.map(c => [c.id,c]));
 const concepts = new Set<string>(), questions = new Set<string>();
 for(const p of progress.filter(predicate)) { const card=byId.get(p.cardId); concepts.add(p.conceptId || (card?conceptKey(card):p.cardId)); if(p.questionKey || card) questions.add(p.questionKey || questionKey(card!)); }
 return {has:(card:LearningCard)=>concepts.has(conceptKey(card)) || questions.has(questionKey(card))};
}
export function masteredConcepts(cards: LearningCard[], progress: CardProgress[]) {
 const mastered=identities(cards,progress,p=>!!p.masteredAt || p.learningStatus==="mastered");
 return new Set([...cards.filter(c=>mastered.has(c)).map(conceptKey),...progress.filter(p=>!!p.masteredAt || p.learningStatus==="mastered").map(p=>p.conceptId || p.cardId)]);
}
/** No calendar-based automatic reviews: only an explicit left swipe requests one. */
export function migrateLearningProgress(cards:LearningCard[],progress:CardProgress[]) {
 const byId=new Map(cards.map(c=>[c.id,c]));
 for(const p of progress) {
  const card=byId.get(p.cardId); if(card) p.questionKey=questionKey(card);
  if(p.learningStatus==="review" && p.lastDispositionAt && !p.masteredAt) p.reviewPending=true;
  else if(p.lastAnswerAt && !p.masteredAt) p.learningStatus="seen";
  delete p.dueDate;
 }
}
/** Only a foreground learning visit consumes a requested review. Polls/jobs do not. */
export function beginLearningVisit(progress:CardProgress[],visitId:string) {
 for(const p of progress) if(p.reviewPending && !p.masteredAt) {p.reviewPending=false;p.reviewVisitId=visitId;}
}
export function learningQueue(cards:LearningCard[],progress:CardProgress[],date:string,assignedIds?:string[],theme?:Category,visitId?:string) {
 const mastered=identities(cards,progress,p=>!!p.masteredAt || p.learningStatus==="mastered");
 const learned=identities(cards,progress,p=>!!p.lastAnswerAt);
 const byId=new Map(cards.map(c=>[c.id,c])),byProgress=new Map(progress.map(p=>[p.cardId,p]));
 const source=assignedIds?assignedIds.flatMap(id=>byId.has(id)?[byId.get(id)!]:[]):cards;
 const concepts=new Set<string>(),questions=new Set<string>();
 return source.filter(card=>{
  const p=byProgress.get(card.id),key=conceptKey(card),q=questionKey(card);
  const current=!!visitId && (p?.reviewVisitId===visitId || p?.lastAnswerVisitId===visitId) && p?.lastDispositionVisitId!==visitId && !p?.reviewPending;
  if(mastered.has(card) || (learned.has(card) && !current) || p?.reviewPending || concepts.has(key) || questions.has(q) || (theme && theme!==card.category))return false;
  concepts.add(key);questions.add(q);return true;
 });
}
export function assignDaily(cards:LearningCard[],progress:CardProgress[],date:string,existingIds:string[]=[],relevance:(card:LearningCard)=>number=()=>0,visitId?:string) {
 const byId=new Map(cards.map(c=>[c.id,c]));
 const output=[...new Set(existingIds.filter(id=>byId.has(id)))];
 const eligible=learningQueue(cards,progress,date,undefined,undefined,visitId);
 const append=(card:LearningCard)=>{if(!output.some(id=>conceptKey(byId.get(id)!)===conceptKey(card)||questionKey(byId.get(id)!)===questionKey(card)))output.push(card.id);};
 for(const card of eligible) if(progress.some(p=>p.cardId===card.id && p.reviewVisitId===visitId && !!visitId))append(card);
 for(const theme of learningThemes) {
  if(output.some(id=>byId.get(id)?.category===theme && (!progress.find(p=>p.cardId===id)?.lastAnswerAt || dateAt(progress.find(p=>p.cardId===id)!.lastAnswerAt!)===date)))continue;
  const candidates=eligible.filter(c=>c.category===theme && !progress.some(p=>p.cardId===c.id && p.lastAnswerAt)).sort((a,b)=>Number(!!b.generatedAt && dateAt(b.generatedAt)===date)-Number(!!a.generatedAt && dateAt(a.generatedAt)===date)||relevance(b)-relevance(a)||a.difficulty-b.difficulty||a.id.localeCompare(b.id));
  if(candidates[0])append(candidates[0]);
 }
 return output;
}
/** Repeated requests in one visit cannot overwrite an answer or award twice. */
export function answerCard(progress:CardProgress,card:LearningCard,chosen:number,correct:number,choiceCount:number,now:string,visitId?:string) {
 if(!Number.isInteger(chosen)||chosen<0||chosen>=choiceCount)throw new Error("请选择一个有效答案");
 if(progress.lastAnswerAt && (visitId?progress.lastAnswerVisitId===visitId:dateAt(progress.lastAnswerAt)===dateAt(now)))return {progress,award:0,chosen:progress.lastAnswerIndex??chosen};
 const next:CardProgress={...progress,conceptId:conceptKey(card),questionKey:questionKey(card),lastAnswerAt:now,lastAnswerIndex:chosen,lastAnswerVisitId:visitId,learningStatus:"seen",attempts:progress.attempts+1,correctCount:progress.correctCount+Number(chosen===correct),intervalDays:0,skipped:false};
 delete next.dueDate;
 return {progress:next,award:chosen===correct?5:0,chosen};
}
export function classifyCard(progress:CardProgress,card:LearningCard,action:"review"|"master",now:string,visitId?:string) {
 if(!progress.lastAnswerAt)throw new Error("先选一个答案，再决定是否复习");
 if(progress.masteredAt || (visitId?progress.lastDispositionVisitId===visitId:progress.lastDispositionAt && dateAt(progress.lastDispositionAt)===dateAt(now)))return progress;
 const next:CardProgress={...progress,conceptId:conceptKey(card),questionKey:questionKey(card),skipped:false,lastDispositionAt:now,lastDispositionVisitId:visitId,learningStatus:action==="master"?"mastered":"review",reviewPending:action==="review"};
 delete next.dueDate;delete next.reviewVisitId;
 if(action==="master")next.masteredAt=now;else delete next.masteredAt;
 return next;
}
export function nextCardId(beforeIds:string[],currentId:string,afterIds:string[]) {
 const start=beforeIds.indexOf(currentId),eligible=new Set(afterIds);
 for(const id of beforeIds.slice(start+1))if(eligible.has(id))return id;
 return afterIds.find(id=>id!==currentId);
}
