require('./remote-matching.cjs');
const assert = require('node:assert/strict');
const db = require('../src/lib/storage.ts');
const evidence = 'Remote worldwide. Video editing for marketing campaigns using Final Cut Pro.';
const rows = Array.from({ length: 205 }, (_, i) => ({ id: String(i), fit_label: 'Strong fit', status: 'new', market_opportunities: {
  title: 'Video Editor', summary: 'Company introduction.', source_url: `https://example.com/jobs/${i}`, remote_status: 'Remote', kind: 'employment',
  raw_payload: { listingEvidence: evidence }, opportunity_signatures: [{ contact_method: 'application_link' }],
} }));
rows.push({ id: 'wrong', market_opportunities: { title: 'Paid Search Manager', source_url: 'https://example.com/wrong', summary: 'Remote marketing. Final interview.' } });
db.supabaseRest = async query => {
  if (query.startsWith('opportunity_matches?')) { const offset = Number(new URLSearchParams(query.split('?')[1]).get('offset') ?? 0); return rows.slice(offset, offset + 200); }
  if (query.startsWith('agent_onboarding?')) return [{ intent_capabilities: ['Final Cut Pro', 'Marketing'], updated_at: '2026-09-13T00:00:00Z' }];
  if (query.startsWith('scan_funnel_snapshots?')) return [{ market_signals_scanned: 300, opportunity_type_breakdown: { consulting: 999 } }];
  return [];
};
const { agentFeed, agentRadarStats } = require('../src/lib/opportunity-agent/storage.ts');
(async () => {
  const feed = await agentFeed('test-user', 'test-profile');
  const radar = await agentRadarStats('test-user', 'test-profile');
  assert.equal(feed.length, 205);
  assert.equal(radar.capacityMatches, feed.length);
  assert.equal(radar.platformLeads, feed.length);
  assert.equal(radar.strongOpportunities, feed.length);
  assert.deepEqual(radar.opportunityTypeBreakdown, { employment: 205 });
  console.log('PASS: paginated feed over 200 rows, false match removed, radar/platform/type counts equal visible records.');
})().catch(error => { console.error(error); process.exitCode = 1; });
