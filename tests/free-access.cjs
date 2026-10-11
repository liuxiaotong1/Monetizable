const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const policy = { PAYWALL_ENABLED: false, canViewFullReport: paid => !policy.PAYWALL_ENABLED || paid };
let user = { id: 'owner' }, owns = true, stripeCalls = 0, queries = [], hasProfile = true;
let stripeFailure = false, analyticsFailure = false;
const id = '11111111-1111-4111-8111-111111111111';
const report = { id, paid: false };
const mocks = {
  '@/lib/admin': { isAccountAdmin: async () => false },
  '@/lib/display-translations': { getDisplayTranslations: async () => ({}) },
  '@/lib/request-locale': { getRequestLocale: async () => 'en' },
  'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
  '@/lib/access-policy': policy,
  '@/lib/skill-stack-access': { canBuildSkillStack: async () => false },
  '@/lib/auth': { currentUser: async () => user },
  '@/lib/analytics': { trackServer: async () => { if (analyticsFailure) throw new Error('Analytics unavailable'); } },
  '@/lib/preview': { toPreview: result => ({ id: result.id }) },
  '@/lib/analysis-token': { openAnalysis: () => null },
  '@/lib/stripe': new Proxy({}, { get: () => async () => { stripeCalls++; if (stripeFailure) throw new Error('Permission denied: checkout_session_write'); return { url: 'https://checkout.stripe.com/test' }; } }),
  '@/lib/storage': {
    analysisBelongsToUser: async () => owns,
    getAnalysis: async () => report,
    supabaseConfig: () => true,
    supabaseRest: async (query, options) => {
      queries.push({ query, options });
      if(query === 'rpc/account_has_subscription') return false;
      assert.equal(options?.method, undefined, 'Access checks must not mutate billing or profiles');
      if (query.startsWith('agent_onboarding?')) return [];
      if (query.startsWith('candidate_profiles?')) {
        assert.match(query, /user_id=eq.owner/, 'Free access still checks ownership');
        return hasProfile ? [{ id: 'profile' }] : [];
      }
      if (query.startsWith('agent_subscriptions?')) return [{ id: 'paid', candidate_profile_id: 'paid-profile' }];
      return [];
    },
  },
};
const original = Module._load;
Module._load = function(name, parent, main) {
  if (mocks[name]) return mocks[name];
  if (name.startsWith('@/')) name = path.resolve(__dirname, '../src', name.slice(2));
  return original.call(this, name, parent, main);
};
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
const request = () => new Request('https://example.com/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ analysisId: id, billingInterval: 'month' }) });
async function main() {
  const { GET } = require('../src/app/api/analysis/[id]/route.ts');
  const context = { params: Promise.resolve({ id }) };
  const read = () => GET(new Request('https://example.com/api/analysis/' + id), context);
  assert.deepEqual(await (await read()).json(), { result: report, directionSelected: false });
  assert.equal(report.paid, false);
  policy.PAYWALL_ENABLED = true;
  assert.deepEqual(await (await read()).json(), { preview: { id } });
  report.paid = true;
  assert.deepEqual(await (await read()).json(), { result: report, directionSelected: false });
  report.paid = false; policy.PAYWALL_ENABLED = false;
  const checkout = require('../src/app/api/checkout/route.ts').POST;
  const subscribe = require('../src/app/api/subscription/checkout/route.ts').POST;
  assert.equal((await (await checkout(request())).json()).url, 'https://checkout.stripe.com/test');
  assert.equal((await (await subscribe(request())).json()).url, 'https://checkout.stripe.com/test');
  assert.equal(stripeCalls, 2);
  owns = false;
  assert.equal((await read()).status, 403);
  assert.equal((await checkout(request())).status, 403);
  assert.equal((await subscribe(request())).status, 403);
  owns = true; user = null;
  assert.equal((await read()).status, 401);
  assert.equal((await checkout(request())).status, 401);
  assert.equal((await subscribe(request())).status, 401);
  user = { id: 'owner' };
  const { subscriptionForUser, getActiveAgentProfiles, isCurrentAgentExecutionTarget } = require('../src/lib/opportunity-agent/storage.ts');
  assert.equal((await subscriptionForUser('owner')).status, 'free');
  assert.ok(!queries.some(({ query }) => query.startsWith('agent_subscriptions?')));
  assert.deepEqual(await getActiveAgentProfiles(), [], 'No onboarding means no background scanning');
  assert.equal(await isCurrentAgentExecutionTarget('owner', 'profile'), false, 'Free access never bypasses onboarding/authorization');
  hasProfile = false;
  assert.equal(await subscriptionForUser('owner'), null);
  policy.PAYWALL_ENABLED = true;
  assert.equal((await subscriptionForUser('owner')).id, 'paid');
  await subscribe(request());
  assert.equal(stripeCalls, 3, 'Subscription checkout remains available');
  analyticsFailure = true;
  assert.equal((await (await subscribe(request())).json()).url, 'https://checkout.stripe.com/test', 'Analytics failure must not block checkout');
  analyticsFailure = false; stripeFailure = true;
  const logError = console.error;
  let denied;
  try { console.error = () => {}; denied = await subscribe(request()); }
  finally { console.error = logError; }
  assert.equal(denied.status, 503);
  assert.equal((await denied.json()).code, 'CHECKOUT_PERMISSION_MISSING');
  console.log('PASS: saved report access; subscription checkout; ownership/auth; onboarding/approval retained.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
