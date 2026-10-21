export const homepageContentKey='homepage-founder-v1';
export const defaultFounder={name:'Serina',instagram:'',zh:{credential:'持证金融分析师 · 3 年工作经验',story:'工作中，我看到许多人对金融感兴趣，却不知道如何开始，觉得图表枯燥、复杂，也担心亏损。我创办 Monetizable，希望用游戏式学习帮助大家建立自己的判断框架，保持交易纪律，在理解市场的过程中找到乐趣，而非鼓励频繁交易。'},en:{credential:'Certified financial analyst · 3 years of professional experience',story:'In my work, I saw people who were curious about finance but unsure where to start. Charts felt dull or difficult, and losing money felt frightening. I created Monetizable to help people build their own framework, practise discipline and find enjoyment in understanding markets — without encouraging more trading.'},fr:{credential:'Analyste financière certifiée · 3 ans d’expérience professionnelle',story:'Dans mon travail, j’ai rencontré des personnes attirées par la finance, mais qui ne savaient pas par où commencer : des graphiques intimidants, un univers perçu comme ennuyeux et la peur de perdre de l’argent. J’ai créé Monetizable pour aider chacun à construire son cadre de réflexion, cultiver sa discipline et prendre plaisir à comprendre les marchés, sans encourager la multiplication des transactions.'}};
export type FounderContent=typeof defaultFounder;
export function validateFounder(value:unknown):FounderContent|null{
 if(!value||typeof value!=='object')return null;
 const v=value as Record<string,unknown>;
 if(typeof v.name!=='string'||!v.name.trim()||v.name.length>60||typeof v.instagram!=='string'||v.instagram.length>200)return null;
 let instagram=v.instagram.trim();
 if(instagram){try{const u=new URL(instagram);if(u.protocol!=='https:'||!['instagram.com','www.instagram.com'].includes(u.hostname)||u.username||u.password||!/^\/[A-Za-z0-9._]+\/?$/.test(u.pathname)||u.search||u.hash)return null;instagram=u.href;}catch{return null;}}
 const result={name:v.name.trim(),instagram} as FounderContent;
 for(const locale of ['en','fr','zh'] as const){const copy=v[locale] as Record<string,unknown>|null;if(!copy||typeof copy.credential!=='string'||!copy.credential.trim()||copy.credential.length>180||typeof copy.story!=='string'||!copy.story.trim()||copy.story.length>1600)return null;result[locale]={credential:copy.credential.trim(),story:copy.story.trim()};}
 return result;
}
