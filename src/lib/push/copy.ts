export type PushLocale = 'en' | 'fr' | 'zh';
export type CompanionId = 'female' | 'supercharlie';
export type PushCategory = 'premarket' | 'review' | 'knowledge' | 'event';

export const PUSH_ICON: Record<CompanionId, string> = {
  female: '/push/astra-192.png',
  supercharlie: '/push/charlie-192.png',
};

export function companionName(companion: CompanionId, locale: PushLocale) {
  if (companion === 'female') return locale === 'zh' ? '星澜' : 'Astra';
  return locale === 'zh' ? '查理' : 'Charlie';
}

export function eventName(event: { kind: string; symbol?: string }, locale: PushLocale) {
  if (event.kind === 'EARNINGS' && event.symbol) {
    if (locale === 'zh') return `${event.symbol} 财报`;
    if (locale === 'fr') return `résultats ${event.symbol}`;
    return `${event.symbol} earnings`;
  }
  const names: Record<string, Record<PushLocale, string>> = {
    CPI: { zh: '美国 CPI', en: 'US CPI', fr: 'IPC américain' },
    NFP: { zh: '美国非农就业报告', en: 'US jobs report', fr: 'rapport sur l’emploi américain' },
    FOMC: { zh: '美联储利率决议', en: 'Federal Reserve decision', fr: 'décision de la Réserve fédérale' },
  };
  const fallback: Record<PushLocale, string> = { zh: '重要数据', fr: 'publication majeure', en: 'major release' };
  return names[event.kind]?.[locale] ?? fallback[locale];
}

export function eventClock(at: string, locale: PushLocale) {
  const date = new Date(at);
  const language = locale === 'zh' ? 'zh-CN' : locale === 'fr' ? 'fr-FR' : 'en-US';
  const clock = (timeZone: string) => new Intl.DateTimeFormat(language, { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  const paris = clock('Europe/Paris');
  const eastern = clock('America/New_York');
  if (locale === 'zh') return `${paris} 巴黎 / ${eastern} 美东`;
  if (locale === 'fr') return `${paris} (Paris) / ${eastern} (heure de l’Est)`;
  return `${paris} Paris / ${eastern} ET`;
}

const lines: Record<PushCategory, Record<CompanionId, Record<PushLocale, string>>> = {
  premarket: {
    female: {
      zh: '开盘前的最后一张牌。今天纳斯达克100 ETF 是涨还是跌？写下你的判断。',
      en: 'The last card before the open. Will the Nasdaq-100 ETF rise or fall today? Write down your call.',
      fr: 'La dernière carte avant l’ouverture. L’ETF Nasdaq-100 va-t-il monter ou baisser aujourd’hui ? Écris ton jugement.',
    },
    supercharlie: {
      zh: 'Boss 已经站在门口了！45 分钟后开盘，快来押一把，打它！⚔️',
      en: 'The Boss is at the door! The market opens in 45 minutes — come make your call and fight it! ⚔️',
      fr: 'Le Boss est déjà à la porte ! Ouverture dans 45 minutes : viens poser ton pari et l’affronter ! ⚔️',
    },
  },
  review: {
    female: {
      zh: '今天的复盘写好了。你哪里判断对了、哪里漏看了，我都标出来了。',
      en: 'Today’s review is ready. I marked where your call was right and what you missed.',
      fr: 'Le bilan du jour est prêt. J’ai marqué ce que tu as bien vu, et ce qui t’a échappé.',
    },
    supercharlie: {
      zh: '收盘啦！快来看你今天打得怎么样，我给你记好分数了 📊',
      en: 'The market’s closed! Come see how you fought today — I kept the score. 📊',
      fr: 'C’est la clôture ! Viens voir comment tu t’es battu aujourd’hui, j’ai noté le score. 📊',
    },
  },
  knowledge: {
    female: {
      zh: '今天的市场里藏着一个概念，花 1 分钟认识它。',
      en: 'Today’s market is hiding a concept. Take one minute to learn it.',
      fr: 'Le marché d’aujourd’hui cache un concept. Prends une minute pour le découvrir.',
    },
    supercharlie: {
      zh: '新卡牌掉落！答错也没关系，背面有详细讲解 🃏',
      en: 'A new card just dropped! A wrong answer is fine — the back explains it. 🃏',
      fr: 'Nouvelle carte ! Une mauvaise réponse ne compte pas : le verso explique tout. 🃏',
    },
  },
  event: {
    female: { zh: '', en: '', fr: '' },
    supercharlie: { zh: '', en: '', fr: '' },
  },
};

export function notificationBody(input: {
  locale: PushLocale;
  companion: CompanionId;
  category: PushCategory;
  phase?: 'eve' | 'soon';
  eventName?: string;
  eventTime?: string;
}) {
  const { locale, companion, category, phase, eventName: name = '', eventTime: time = '' } = input;
  if (category === 'event' && phase === 'eve') {
    if (companion === 'female') {
      if (locale === 'zh') return `明天 ${time} 公布 ${name}，这是本周最大的 Boss。先想想你的预测数字。`;
      if (locale === 'fr') return `Demain à ${time}, publication de ${name}. C’est le plus grand Boss de la semaine. Réfléchis d’abord à ton chiffre.`;
      return `Tomorrow at ${time}, ${name} is released. This is the week’s biggest Boss. Think through your number first.`;
    }
    if (locale === 'zh') return `大 Boss 明天登场：${name}！今晚就把你的预测交上来吧 🔥`;
    if (locale === 'fr') return `Le grand Boss arrive demain : ${name} ! Envoie ta prévision ce soir. 🔥`;
    return `The big Boss arrives tomorrow: ${name}! Send in your prediction tonight. 🔥`;
  }
  if (category === 'event') {
    if (companion === 'female') {
      if (locale === 'zh') return `${name} 还有 1 小时公布，预测马上截止。`;
      if (locale === 'fr') return `${name} est publié dans 1 heure. Les prévisions ferment bientôt.`;
      return `${name} is released in 1 hour. Predictions close soon.`;
    }
    if (locale === 'zh') return `最后 1 小时！猜中 ${name} 就能打败 Boss，冲！`;
    if (locale === 'fr') return `Dernière heure ! Vise juste sur ${name} et tu bats le Boss. En avant !`;
    return `Last hour! Call ${name} right and you beat the Boss. Go!`;
  }
  return lines[category][companion][locale];
}
