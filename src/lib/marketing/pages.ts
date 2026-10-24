import {PRODUCT_DESCRIPTION} from './positioning';

export interface AnswerPage {
  slug: string;
  title: string;
  description: string;
  answer: string;
  sections: {heading: string; paragraphs?: string[]; steps?: string[]}[];
  related: string[];
  cta: string;
  kind: 'product' | 'guide' | 'company';
}
export const CONTENT_UPDATED = '2026-10-24';
export const answerPages: AnswerPage[] = [
  {
    slug: 'trading-discipline-app', title: 'A Trading Discipline App Built Around Your Own System',
    description: 'Turn your trading plan into daily practice, rule checks and post-trade reviews with Monetizable’s gamified discipline workflow.',
    answer: 'A trading discipline app helps you make your rules observable: prepare a plan, record the reasoning behind a decision, check execution and review what happened. Monetizable brings that routine into daily quests, event challenges and a Trading DNA review.',
    sections: [
      {heading: 'Start with the rule you keep forgetting', paragraphs: ['A rule such as “be patient” leaves a lot to interpretation. A check such as “write my entry condition before the session” gives you something you can answer honestly afterward. Choose the rule from your own trading system and make its completion visible.', 'In Monetizable, equip your system, preserve an original market call with a reason, and return after the outcome is verified. Review whether you followed the process separately from whether the direction matched.']},
      {heading: 'One routine, three useful kinds of practice', steps: ['Daily Quest: record a direction and your reasoning, then compare the original call with a verified close.', 'Event Boss: examine an upcoming economic release, its expectations and the eventual result.', 'Knowledge Deck: answer a question, read the explanation and build your knowledge through short sessions.']},
      {heading: 'Bring execution into the review', paragraphs: ['The trading command centre supports closed-trade CSV imports. It places trade results alongside recorded rule checks, so you can look at both execution and outcomes. Trading DNA draws observations from your saved records and offers focused practice as your history develops.', 'A useful first week has a small goal: equip one rule, make one reasoned call per session and complete the review. You can then decide whether the routine is useful enough to keep.']},
    ], related: ['follow-your-trading-plan', 'trading-plan-checklist', 'methodology', 'faq'], cta: 'Try my first discipline quest', kind: 'product',
  },
  {
    slug: 'follow-your-trading-plan', title: 'How to Follow Your Trading Plan: Make Each Rule Checkable',
    description: 'A practical before, during and after-session routine for turning a trading plan into observable actions and useful reviews.',
    answer: 'To follow a trading plan, turn each important rule into a specific action you can check before or after a session. Keep the original plan, record the decision you made and review adherence separately from P&L. Start with one repeated failure point and practise that step consistently.',
    sections: [
      {heading: 'Find the moment where the plan disappears', paragraphs: ['Take one recent session and locate the decision point. Did you enter before your stated condition appeared? Did you change a rule after seeing the outcome? Write the sequence in plain language: “When X happened, I did Y; my plan called for Z.” That gives you a practice target.', 'For example, a trader who repeatedly enters before a planned retest can practise writing the retest condition in advance and recording whether it appeared. The exercise is about observing an existing rule.']},
      {heading: 'Use a three-part session loop', steps: ['Before: write the relevant rule, what evidence would satisfy it and what would invalidate your initial view.', 'During: keep the original note intact and record any decision to depart from the rule with a timestamp or session note.', 'After: compare your decision with the rule, then examine the market outcome. Choose one change to test next session.']},
      {heading: 'Give a quiet session a successful ending', paragraphs: ['Some sessions offer little that fits your plan. Your review can still show that you prepared, waited and honoured the conditions you wrote. Define completion around those actions.', 'Monetizable gives this loop a place in daily quests and post-trade reviews. You can make a practice call, come back to the verified outcome and use your saved history to choose the next discipline exercise.']},
    ], related: ['trading-plan-checklist', 'trading-discipline-app', 'methodology'], cta: 'Practise my plan in a free quest', kind: 'guide',
  },
  {
    slug: 'trading-plan-checklist', title: 'Trading Plan Checklist: Before, During and After Your Session',
    description: 'Copy a practical trading-plan checklist and adapt it to your setup, risk rules, decision notes and post-session review.',
    answer: 'A trading plan checklist turns your own setup, risk and review rules into short questions. Write observable conditions before the session, check them at the decision point and review your adherence afterward. The template below is a starting point to adapt to your existing system.',
    sections: [
      {heading: 'Before the session', steps: ['Which setup from my plan am I watching?', 'What observable evidence would satisfy its entry conditions?', 'What condition would invalidate my view?', 'What risk and session limits does my own plan require?', 'Which scheduled events should I understand before making a decision?']},
      {heading: 'At the decision point', steps: ['Have the conditions I wrote actually appeared?', 'Have I recorded the reason for this decision?', 'Does the decision fit the limits I set?', 'If I am changing the plan, what new evidence explains the change?']},
      {heading: 'After the session', steps: ['Which rules did I follow, and which did I depart from?', 'What does the original note say, compared with what I remember now?', 'What happened after the decision, using a verified result or my closed-trade record?', 'Which one behaviour will I practise next session?']},
      {heading: 'Use the checklist as a record', paragraphs: ['Copy these questions into your own notes and replace broad terms with the exact conditions from your system. A “yes” should point to something you observed or wrote.', 'In Monetizable, equip your rules, preserve a reasoned call and return for the review. Closed-trade CSV imports add execution records to the same review routine. Begin with the smallest checklist you can complete reliably and adjust it from your actual sessions.']},
    ], related: ['follow-your-trading-plan', 'trading-discipline-app', 'methodology'], cta: 'Put my checklist into practice', kind: 'guide',
  },
  {
    slug: 'about', title: 'About Monetizable: Trading Practice With a Sense of Adventure',
    description: 'Meet Monetizable, a gamified trading practice and discipline platform built around daily quests, event challenges and personal review.',
    answer: PRODUCT_DESCRIPTION,
    sections: [
      {heading: 'A place to return to your own reasoning', paragraphs: ['The product connects preparation, practice, verified outcomes and reflection. A saved call keeps the reasoning you had at the time; a later review helps you compare that reasoning with what followed.', 'Daily quests, economic event Boss battles and knowledge cards give the routine an interactive shape. Your trading command centre connects your written system, closed-trade imports and execution review.']},
      {heading: 'Built by Serina', paragraphs: ['Serina created Monetizable to make market learning more approachable and help people build their own framework and discipline. Her founder story and public profiles are available on the homepage.', 'The platform supports English, French and Chinese. Start with the public quest preview, create an account to preserve your progress and explore Pro when you want a fuller history and personalised practice.']},
    ], related: ['product', 'methodology', 'faq'], cta: 'Meet my quest companion', kind: 'company',
  },
  {
    slug: 'product', title: 'How Monetizable Works: Plan, Practise, Review',
    description: 'Explore daily quests, economic event Boss battles, knowledge cards, trading-rule checks and Trading DNA in Monetizable.',
    answer: PRODUCT_DESCRIPTION,
    sections: [
      {heading: 'Daily Quest', paragraphs: ['Read the market context, choose a direction and write down your reason. Preserve the call and return after the target session closes to compare it with a verified result.']},
      {heading: 'Event Boss and Knowledge Deck', paragraphs: ['An Event Boss turns a scheduled economic release into a preparation and review exercise. Compare your expectations with the published result. Knowledge cards pair a short question with an explanation so you can learn one concept at a time.']},
      {heading: 'Your trading command centre', paragraphs: ['Equip a trading system, import closed trades from a supported CSV format and review your rule checks alongside execution results. Trading DNA uses saved records to surface decision habits and targeted practice.']},
      {heading: 'Start free, build a history', paragraphs: ['The free account includes daily challenges, basic Trading DNA, recent prediction history and a daily knowledge-card allowance. Pro adds full saved prediction history, personalised discipline practice and expanded learning access. The pricing page lists current limits, prices and trial terms.']},
    ], related: ['trading-discipline-app', 'trading-plan-checklist', 'methodology', 'faq'], cta: 'Play my first free quest', kind: 'product',
  },
  {
    slug: 'methodology', title: 'Monetizable Methodology: Records, Rule Checks and Trading DNA',
    description: 'How Monetizable preserves calls, verifies outcomes, checks recorded rules and presents Trading DNA observations from your own history.',
    answer: 'Monetizable separates the original decision, the verified market outcome and the recorded rule check. That makes it possible to review what you thought, what happened and how you followed your system as three distinct pieces of evidence.',
    sections: [
      {heading: 'Preserve the decision before reviewing the result', paragraphs: ['A saved prediction contains a target session, direction, confidence and reason. The original record is preserved for later comparison. Closing outcomes use verified data for the relevant session; pending results retain their pending status until verification is available.']},
      {heading: 'Check the rules that were equipped', paragraphs: ['The selected system determines the rule checks. Trading DNA uses equal weights for selected rules and assesses predictions made after that system was equipped. Some checks use simple keyword heuristics, such as whether a reason mentions a condition or level.', 'These observations describe recorded behaviour. Their interpretation depends on the completeness of the user’s notes, the number of records and the conditions under which those records were made.']},
      {heading: 'Keep each measurement identifiable', paragraphs: ['Direction match rate compares eligible calls with verified outcomes. Record-keeping measures concern the saved reasoning and review process. Trade win rate, net P&L and profit factor come from imported closed-trade records.', 'Keeping those labels separate lets a trader examine a profitable rule-breaking trade and a losing rule-following trade without confusing outcome with adherence. Imported results depend on the file’s accuracy and completeness.']},
      {heading: 'Use observations to choose a practice task', paragraphs: ['The free experience uses a recent history window; Pro can use the full saved prediction history available to the account. Early Trading DNA observations require at least five eligible calls, and a habit score also needs three verified outcomes.', 'The next exercise may be to define an invalidation condition, consider an opposing scenario, calibrate confidence or review an overlooked call. Each exercise points back to a concrete action in the next session.']},
    ], related: ['product', 'faq', 'follow-your-trading-plan'], cta: 'Start building my practice record', kind: 'company',
  },
  {
    slug: 'faq', title: 'Monetizable FAQ: Trading Practice, Discipline and Quests',
    description: 'Answers about Monetizable’s daily quests, trading plan checks, CSV imports, Trading DNA, free accounts and Pro.',
    answer: PRODUCT_DESCRIPTION,
    sections: [
      {heading: 'Who is Monetizable for?', paragraphs: ['It is built for people who want an engaging routine for practising market judgment and following their trading system. You can begin with a daily call, an event challenge or a knowledge card, then develop a record of your own decisions.']},
      {heading: 'How do I start?', paragraphs: ['Open the homepage and try the public quest preview. Create a free account to save your calls and progress, choose a companion and begin building your practice history.']},
      {heading: 'How does Monetizable help me follow my trading plan?', paragraphs: ['Equip your rules, record your reasoning and return to check the outcome and review adherence. The command centre connects your plan, closed-trade imports and post-trade reflection.']},
      {heading: 'What is Trading DNA?', paragraphs: ['Trading DNA presents observations from eligible saved calls and verified outcomes. It looks at recording habits, reasons, confidence and review consistency, then proposes focused practice. The methodology page explains the sample thresholds and scoring inputs.']},
      {heading: 'Can I review my own trades?', paragraphs: ['The trading command centre accepts supported closed-trade CSV imports and calculates results from those records. It lets you review execution metrics alongside your recorded rule checks.']},
      {heading: 'What does Pro add?', paragraphs: ['Pro adds full saved prediction history, personalised discipline training, expanded knowledge-card access and fuller market preparation content. Visit the pricing page for current plan details and trial terms.']},
    ], related: ['product', 'methodology', 'trading-plan-checklist'], cta: 'Start my free adventure', kind: 'company',
  },
];
export function findAnswerPage(slug: string) { return answerPages.find(page => page.slug === slug); }
