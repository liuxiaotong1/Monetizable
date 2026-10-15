import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createJiti} from 'jiti';
const jiti=createJiti(import.meta.url);const {fetchIntelligence}=await jiti.import('../src/lib/quest/event-intelligence.ts');
test('failed news fetch preserves timestamp but drops expired markets and old headlines',async()=>{
 const now=new Date('2026-10-15T13:00:00Z'),previous={sources:[{id:'polymarket',fetchedAt:'2026-10-14T13:00:00Z',items:[{id:'closed',endAt:'2026-10-15T12:00:00Z'},{id:'active',endAt:'2026-10-16T12:00:00Z'}]},{id:'ft',fetchedAt:'2026-10-14T13:00:00Z',items:[{id:'old',publishedAt:'2026-10-01T12:00:00Z'},{id:'recent',publishedAt:'2026-10-14T12:00:00Z'}]}]};
 const result=await fetchIntelligence(previous,now,async()=>{throw Error('Unavailable');});
 assert.equal(result.sources[0].status,'error');assert.equal(result.sources[0].fetchedAt,'2026-10-14T13:00:00Z');assert.deepEqual(result.sources[0].items.map(i=>i.id),['active']);assert.deepEqual(result.sources[1].items.map(i=>i.id),['recent']);
});
