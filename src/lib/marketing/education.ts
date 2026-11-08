import type { Metadata } from 'next';
import { currentUser, isAdmin } from '@/lib/account/auth';
import { requestLocale } from '@/lib/i18n/server-locale';

const education = {
  en: ['Financial literacy for everyone | Monetizable', 'Explore everyday money, investing and economics with Astra and Charlie through interactive charts, quizzes and daily quests.'],
  fr: ['La finance pour tout le monde | Monetizable', 'Apprenez l’investissement, l’économie et les finances du quotidien avec des graphiques interactifs, des quiz et des quêtes.'],
  zh: ['零基础金融学习 | Monetizable', '和星澜、查理一起，通过互动图表、简短测验和每日任务，学懂投资、经济和日常理财。'],
};

export async function educationMetadata(path: '/' | '/academy'): Promise<Metadata> {
  const [title, description] = education[await requestLocale(isAdmin(await currentUser()))];
  return {
    title, description,
    alternates: { canonical: path },
    openGraph: { title, description, url: 'https://getmonetizable.com' + path, siteName: 'Monetizable', type: 'website', images: ['/brand/social-preview.png'] },
    twitter: { card: 'summary_large_image', title, description, images: ['/brand/social-preview.png'] },
  };
}
