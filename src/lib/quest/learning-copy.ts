import type {LearningCard} from './types';
/** URLs belong in dedicated references, never in the educational prose. */
export function cleanCardText(text:string){return text.replace(/(?:https?:\/\/[^\s，。；！？<>]+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|gov|edu|net|io|fr)(?:\/[^\s，。；！？<>]*)?)(?:\s*的)?/gi,'').replace(/ {2,}/g,' ').trim();}
export function displayLearningCard(card:LearningCard):LearningCard{return {...card,title:cleanCardText(card.title),question:cleanCardText(card.question),choices:card.choices.map(cleanCardText),answerExplanation:cleanCardText(card.answerExplanation),explanation:cleanCardText(card.explanation),analogy:cleanCardText(card.analogy),example:cleanCardText(card.example)};}
