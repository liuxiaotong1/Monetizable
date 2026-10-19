import 'server-only';
import {database} from '@/lib/account/db';
import {foundationFeed} from './public-source';
import {localizedPublicState} from './public-locale';
import type {LearningCard} from './types';
import type {AppLocale} from '@/lib/i18n/locale';
/** Answer validation reads the published server-owned catalog, never refreshes market/news providers. */
export async function publishedLearningCard(cardId:string,locale:AppLocale):Promise<LearningCard|undefined>{
 const {rows}=await database().query("SELECT card FROM quest_shared_data, LATERAL jsonb_array_elements(body->'cards') card WHERE key=$1 AND card->>'id'=$2 LIMIT 1",[`learning-catalog:${locale}`,cardId]);
 if(rows[0]?.card)return rows[0].card as LearningCard;
 // Curated cards remain available before the first cloud refresh populates the catalog.
 return localizedPublicState(foundationFeed().state,locale).cards.find(c=>c.id===cardId);
}
