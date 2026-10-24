export const SITE_URL = 'https://getmonetizable.com';
export const PRODUCT_DESCRIPTION = 'Monetizable is a gamified trading practice and discipline platform that helps traders turn their trading plan into daily quests, event challenges, rule checks and post-trade reviews. It helps traders practise judgment and follow their own system';
export const positioning = {
  en: {title: 'Gamified Trading Practice & Discipline | Monetizable', description: PRODUCT_DESCRIPTION, heading: 'Practise judgment. Follow your system.', about: 'What is Monetizable?'},
  fr: {title: 'Entraînement et discipline de trading ludique | Monetizable', description: 'Monetizable est une plateforme ludique d’entraînement et de discipline de trading. Elle transforme votre plan en quêtes quotidiennes, défis événementiels, vérifications des règles et bilans après séance, pour exercer votre jugement et suivre votre propre système.', heading: 'Exercez votre jugement. Suivez votre système.', about: 'Qu’est-ce que Monetizable ?'},
  zh: {title: '游戏化交易练习与纪律平台 | Monetizable', description: 'Monetizable 是一个游戏化交易练习与纪律平台，把你的交易计划变成每日任务、事件挑战、规则检查与交易后复盘，帮助你练习判断并坚持自己的交易系统。', heading: '练习判断，坚持自己的交易系统。', about: 'Monetizable 是什么？'},
};
export function organizationSchema() {
  return {'@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: 'Monetizable', url: SITE_URL, description: PRODUCT_DESCRIPTION, logo: `${SITE_URL}/brand/monetizable-curious-m.svg`};
}
export function applicationSchema() {
  return {'@type': 'WebApplication', '@id': `${SITE_URL}/#application`, name: 'Monetizable', url: SITE_URL, description: PRODUCT_DESCRIPTION, applicationCategory: 'EducationalApplication', operatingSystem: 'Web browser', inLanguage: ['en', 'fr', 'zh-CN'], featureList: ['Daily trading practice quests', 'Economic event challenges', 'Trading plan rule checks', 'Closed-trade CSV import and review', 'Trading DNA and personalised discipline practice'], publisher: {'@id': `${SITE_URL}/#organization`}};
}
