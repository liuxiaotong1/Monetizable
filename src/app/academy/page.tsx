import type { Metadata } from 'next';
import Academy from '@/components/academy/academy';
import { currentUser, isAdmin } from '@/lib/account/auth';
import { requestLocale } from '@/lib/i18n/server-locale';

const education = {
  en: ['Financial literacy for everyone | Monetizable', 'Learn investing, economics and everyday money through interactive charts, short quizzes and daily quests.'],
  fr: ['La finance pour tout le monde | Monetizable', 'Apprenez l’investissement, l’économie et les finances du quotidien avec des graphiques interactifs, des quiz et des quêtes.'],
  zh: ['零基础金融学习 | Monetizable', '通过互动图表、简短测验和每日任务，学习投资、经济和日常理财。'],
};

export async function generateMetadata(): Promise<Metadata> {
  const [title, description] = education[await requestLocale(isAdmin(await currentUser()))];
  return {
    title, description,
    alternates: { canonical: "/academy" },
    openGraph: { title, description, url: 'https://getmonetizable.com/academy', siteName: 'Monetizable', type: 'website', images: ['/brand/social-preview.png'] },
    twitter: { card: 'summary_large_image', title, description, images: ['/brand/social-preview.png'] },
  };
}

export default async function AcademyPage() {
  const user = await currentUser();
  return <Academy signedIn={!!user} legacyHref={user ? '/?view=today' : '/#first-prediction'}/>;
}
