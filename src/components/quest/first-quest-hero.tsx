'use client';
import {useLocale} from '@/components/i18n/locale-provider';
import './hero-experience.css';
export default function FirstQuestHero(){
 const locale=useLocale(),c={zh:{tag:'你的第一场冒险',title:'先玩懂，再做判断。',text:'用每日判断、事件挑战和知识卡片，建立自己的投资框架。',start:'开始玩',hint:'选一位伙伴，我们一起走完第一轮。'},en:{tag:'YOUR FIRST QUEST',title:'Play. Understand. Make your own call.',text:'Build your investing framework through daily predictions, market events and learning cards.',start:'Start playing',hint:'Choose a companion. We’ll guide your first quest.'},fr:{tag:'VOTRE PREMIÈRE QUÊTE',title:'Jouez. Comprenez. Faites vos choix.',text:'Construisez votre cadre d’investissement avec les prévisions, les événements et les cartes.',start:'Commencer à jouer',hint:'Choisissez votre partenaire. On vous guide pour la suite.'}}[locale];
 return <section className="first-quest-hero"><small>{c.tag}</small><h1>{c.title}</h1><p>{c.text}</p><button className="primary" onClick={()=>dispatchEvent(new Event('quest-start-playing'))}>▶ {c.start}</button><span>{c.hint}</span></section>
}
