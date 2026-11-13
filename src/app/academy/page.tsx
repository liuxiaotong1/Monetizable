import Academy from '@/components/academy/academy';
import { AppFrame } from '@/components/site/app-frame';
import { currentUser } from '@/lib/account/auth';
import { educationMetadata } from '@/lib/marketing/education';

export async function generateMetadata() {
  return educationMetadata('/academy');
}

export default async function AcademyPage() {
  const user = await currentUser();
  return <AppFrame><Academy signedIn={!!user} legacyHref={user ? '/?view=today' : '/?market=1#first-prediction'}/></AppFrame>;
}
