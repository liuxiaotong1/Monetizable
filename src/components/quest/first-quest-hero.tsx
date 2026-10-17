'use client';
import {useLocale} from '@/components/i18n/locale-provider';
import './hero-experience.css';
export default function FirstQuestHero(){
 const locale=useLocale(),c={zh:{tag:'你的第一场冒险',title:'让金融，像游戏一样好玩。',text:'用每日判断、事件挑战和知识卡片，建立自己的投资框架。',start:'免费开玩',hint:'选好伙伴，创建免费账户，再开启第一场引导冒险。'},en:{tag:'YOUR FIRST QUEST',title:'Finance, played like a game.',text:'Build your investing framework through daily predictions, market events and learning cards.',start:'Play for free',hint:'Choose a hero, create a free account, then begin your guided quest.'},fr:{tag:'VOTRE PREMIÈRE QUÊTE',title:'La finance, comme un jeu.',text:'Construisez votre cadre d’investissement avec les prévisions, les événements et les cartes.',start:'Jouer gratuitement',hint:'Choisissez un partenaire, créez un compte gratuit, puis commencez le guide.'}}[locale];
 return <section className="first-quest-hero"><small>{c.tag}</small><h1>{c.title}</h1><p>{c.text}</p><button className="primary" onClick={()=>dispatchEvent(new Event('quest-start-playing'))}>▶ {c.start}</button><span>{c.hint}</span></section>
}
