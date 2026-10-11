const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(file, mocks = {}) {
  const filename = path.resolve(file), m = new Module(filename);
  m.filename = filename; m.paths = module.paths;
  m.require = name => name in mocks ? mocks[name] : require(name);
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  return m.exports;
}
(async () => {
  const stripe = load('src/lib/stripe.ts');
  const calls = [];
  process.env.STRIPE_SECRET_KEY = 'test-only';
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, json: async () => ({ data: [{ id: calls.length === 1 ? 'sub_a' : 'sub_b' }], has_more: calls.length === 1 }) };
  };
  assert.equal((await stripe.listCustomerSubscriptions('cus_a')).length, 2);
  assert.match(calls[1].url, /starting_after=sub_a/);
  await stripe.cancelSubscriptionRenewal('sub_a');
  assert.equal(calls[2].init.body.get('cancel_at_period_end'), 'true');
  assert.equal(calls[2].init.body.get('proration_behavior'), 'none');
  const queries = [];
  const billing = load('src/lib/account-billing.ts', {
    '@/lib/storage': { supabaseRest: async query => { queries.push(query); return ['sub_a', 'sub_b', 'sub_c'].map(id => ({ stripe_customer_id: 'cus_a', stripe_subscription_id: id })); } },
    '@/lib/stripe': { listCustomerSubscriptions: async () => [
      { id: 'sub_a', status: 'active', cancel_at_period_end: false, items: { data: [{ current_period_end: 1800000000 }] } },
      { id: 'sub_b', status: 'canceled', cancel_at_period_end: false },
      { id: 'sub_c', status: 'active', cancel_at_period_end: true },
      { id: 'sub_other_product', status: 'active', cancel_at_period_end: false },
    ] },
  });
  const user = { id: 'owner', email: 'owner@example.com' };
  assert.deepEqual(await billing.billingCustomers(user), ['cus_a']);
  assert.equal(queries.length, 1, 'unverified email cannot claim a subscription');
  await billing.billingCustomers({ ...user, email_confirmed_at: '2026-01-01' });
  assert.match(queries.at(-1), /user_id=is.null/);
  const list = await billing.billingSubscriptions(user);
  assert.equal(list.length, 3, 'unrelated merchant products must not be exposed');
  assert.equal(list[0].endsAt, new Date(1800000000 * 1000).toISOString());
  assert.equal(list[0].canCancel, true);
  assert.equal(list[1].canCancel, false);
  assert.equal(list[2].canCancel, false);
  let signedIn = true, writes = 0;
  const route = load('src/app/api/subscription/cancel/route.ts', {
    'next/server': { NextResponse: { json: (data, options) => new Response(JSON.stringify(data), { ...options, headers: { 'content-type': 'application/json' } }) } },
    '@/lib/auth': { currentUser: async () => signedIn ? user : null },
    '@/lib/account-billing': { billingSubscriptions: async () => [{ id: 'sub_owned', canCancel: writes === 0 }] },
    '@/lib/stripe': { cancelSubscriptionRenewal: async () => { writes++; } },
  });
  const request = (id, origin = 'https://getmonetizable.com', confirm = true) => new Request('https://getmonetizable.com/api/subscription/cancel', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ subscriptionId: id, confirm }) });
  assert.equal((await route.POST(request('sub_owned', 'https://evil.example'))).status, 403);
  signedIn = false;
  assert.equal((await route.POST(request('sub_owned'))).status, 401);
  signedIn = true;
  assert.equal((await route.POST(request('sub_owned', undefined, false))).status, 400);
  assert.equal((await route.POST(request('sub_foreign'))).status, 404);
  assert.equal(writes, 0);
  assert.equal((await route.POST(request('sub_owned'))).status, 200);
  assert.equal((await route.POST(request('sub_owned'))).status, 200);
  assert.equal(writes, 1, 'repeated cancellation must not change billing twice');
  const webhook = load('src/app/api/stripe/webhook/route.ts', {
    'next/server': { NextResponse: { json: data => new Response(JSON.stringify(data)) } },
    '@/lib/stripe': { verifyStripeSignature: () => true, retrieveSubscription: async () => ({ status: 'canceled' }) },
    '@/lib/storage': {}, '@/lib/account-email': {}, '@/lib/analytics': {},
    '@/lib/opportunity-agent/storage': { updateSubscriptionByStripeId: async (_, input) => assert.equal(input.status, 'canceled') },
  });
  for (const type of ['invoice.paid', 'invoice.payment_failed', 'customer.subscription.updated', 'customer.subscription.deleted']) {
    await webhook.POST(new Request('https://getmonetizable.com/api/stripe/webhook', { method: 'POST', body: JSON.stringify({ type, data: { object: { id: 'sub_owned', subscription: 'sub_owned', status: 'active' } } }) }));
  }
  console.log('PASS billing: ownership, verified email, pagination, period end, CSRF, confirmation, idempotency, late webhook cancellation');
})().catch(error => { console.error(error); process.exitCode = 1; });
