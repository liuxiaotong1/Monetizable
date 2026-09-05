// No network or production data. Run: node tests/security-regressions.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { createHmac } = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const mocks = {};
const load = Module._load;
Module._load = function(name, parent, main) {
  if (Object.hasOwn(mocks, name)) return mocks[name];
  if (name.startsWith('@/')) name = path.join(root, 'src', name.slice(2));
  return load.call(this, name, parent, main);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
global.fetch = async () => { throw new Error('Unexpected network access in regression test'); };
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.ANALYSIS_TOKEN_SECRET = 'private-test-key';
process.env.GMAIL_TOKEN_ENCRYPTION_KEY = 'private-oauth-test-key';
process.env.MONETIZABLE_ACCESS_CODE = 'public-coupon';

async function main() {
  const auth = require('../src/lib/auth-flow.ts');
  for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', '/\tevil.example', null]) assert.equal(auth.safeAuthRedirect(value), '/agent');
  assert.equal(auth.safeAuthRedirect('/companies?created=1#signup'), '/companies?created=1#signup');
  const state = auth.createLoginOAuthState('/companies');
  assert.notEqual(state, auth.createLoginOAuthState('/companies'), 'Each OAuth attempt must have a new nonce');
  assert.deepEqual(auth.verifyLoginOAuthState(state), { next: '/companies' });
  assert.equal(auth.verifyLoginOAuthState(state + 'broken'), null);
  const malformed = Buffer.from('not json').toString('base64url');
  assert.equal(auth.verifyLoginOAuthState(`${malformed}.${createHmac('sha256', process.env.GMAIL_TOKEN_ENCRYPTION_KEY).update(malformed).digest('base64url')}`), null);

  const tokens = require('../src/lib/analysis-token.ts');
  const grant = tokens.issueAgentAccessGrant('analysis-test');
  assert.equal(tokens.openAgentAccessGrant(grant), 'analysis-test');
  const payload = `analysis-test.${Date.now() + 60000}`;
  const forged = Buffer.from(`${payload}.${createHmac('sha256', process.env.MONETIZABLE_ACCESS_CODE).update(payload).digest('base64url')}`).toString('base64url');
  assert.equal(tokens.openAgentAccessGrant(forged), null, 'A public coupon cannot sign account access');
  assert.deepEqual(tokens.openAnalysis(tokens.sealAnalysis({ id: 'private' })), { id: 'private' });
  const realGmail = require('../src/lib/opportunity-agent/gmail.ts');
  const noNetwork = global.fetch;
  global.fetch = async () => Response.json({ error: 'invalid_grant' }, { status: 400 });
  await assert.rejects(realGmail.refreshGmailAccessToken(realGmail.encryptToken('fake')), realGmail.GmailReconnectRequiredError);
  global.fetch = async () => new Response(null, { status: 204 });
  await assert.doesNotReject(realGmail.stopGmailWatch('fake'));
  global.fetch = noNetwork;

  const storage = require('../src/lib/storage.ts');
  const result = { id: 'ownership-test', expiresAt: new Date(Date.now() + 60000).toISOString() };
  await storage.saveAnalysis(result);
  assert.equal(await storage.analysisBelongsToUser(result.id, 'stranger'), false);
  assert.equal(await storage.claimAnalysisForUser(result.id, 'owner'), true);
  assert.equal(await storage.claimAnalysisForUser(result.id, 'stranger'), false);
  await assert.rejects(storage.saveAnalysis({ ...result, paid: true }), /already exists/);
  const { countCapabilityMatches } = require('../src/lib/company-need-match.ts');
  assert.equal(countCapabilityMatches({ expertise: ['Financial analysis', 'Chinese language'] }, [{ id: 'one', top_skills: ['Financial analysis'] }]), 0);
  assert.equal(countCapabilityMatches({ expertise: ['French market knowledge'] }, [{ id: 'one', languages: ['French'] }]), 0);
  assert.equal(countCapabilityMatches({ expertise: ['B2B sales'] }, [{ id: 'one', top_skills: ['Salesforce'] }]), 0);
  assert.equal(countCapabilityMatches({ expertise: ['Financial analysis', 'Chinese language'] }, [{ id: 'one', top_skills: ['Financial analysis'], languages: ['Mandarin'] }]), 1);
  const { normalizeOpportunityText } = require('../src/lib/opportunity-text.ts');
  assert.doesNotThrow(() => normalizeOpportunityText('&#999999999;'));
  assert.equal(normalizeOpportunityText('&#X41;'), 'A');
  const { isSafeExternalUrl } = require('../src/lib/url.ts');
  for (const url of ['http://127.0.0.2/x', 'http://2130706433/', 'http://169.254.169.254/', 'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'https://user:pass@example.com/', 'http://x.local/']) assert.equal(isSafeExternalUrl(url), false, url);
  assert.equal(isSafeExternalUrl('https://example.com/jobs/1'), true);
  mocks['node:dns/promises'] = { lookup: async () => [{ address: '127.0.0.2', family: 4 }] };
  const { publicWebFetch } = require('../src/lib/public-web.ts');
  await assert.rejects(publicWebFetch('https://example.com/jobs'), /private address/);
  await assert.rejects(publicWebFetch('http://169.254.169.254/'), /Unsafe/);
  const { opportunityTitleSupportsIntent } = require('../src/lib/opportunity-execution-guard.ts');
  assert.equal(opportunityTitleSupportsIntent('Freelance Writer', ['Financial Analysis', 'Content Creation']), false);
  assert.equal(opportunityTitleSupportsIntent('Data Analyst', ['Data Analysis', 'Financial Analysis'], 'Analyze our customer data and report on product usage.'), false);
  assert.equal(opportunityTitleSupportsIntent('AI Automation Consultant', ['AI', 'SQL'], 'Build AI automation using SQL databases.'), true);

  // Execute the real send orchestration with fake Gmail/storage dependencies.
  let job, sent, finishes, retries, mode, checks;
  mocks['@/lib/config'] = { config: { opportunityAgentExecutionEnabled: true, agentDailyActionLimit: 20 } };
  mocks['@/lib/storage'] = { candidateCvSignedUrl: async () => null };
  mocks['@/lib/opportunity-agent/gmail'] = {
    GmailReconnectRequiredError: class extends Error {},
    decryptToken: value => value, encryptToken: value => value,
    refreshGmailAccessToken: async () => ({ access_token: 'token', expires_in: 3600 }),
    sendGmail: async (_, message) => { sent.push(message); if (mode === 'uncertain') throw new Error('network timeout'); return { id: 'gmail-id', threadId: 'thread-id' }; },
  };
  mocks['@/lib/opportunity-agent/storage'] = {
    claimAgentJobForUser: async () => job,
    agentJobForUser: async () => ({ ...job, status: 'running' }),
    authorizationForUser: async () => ({ status: 'active', allow_email_outreach: mode !== 'revoked' }),
    gmailConnectionForUser: async () => ({ status: 'active', user_id: 'owner', gmail_address: 'owner@example.com', connected_at: new Date().toISOString(), encrypted_access_token: 'token', access_token_expires_at: new Date(Date.now() + 3600000).toISOString() }),
    sentOutreachStats: async () => ({ sentToday: 0, sentLast72Hours: 0, sentLast7Days: 0, hardBouncesLast7Days: 0 }),
    updateGmailConnection: async () => {},
    isCurrentAgentExecutionTarget: async () => !(mode === 'direction-changed' && ++checks > 1),
    isSuppressed: async () => false,
    finishAgentJob: async (_, status, details) => { finishes.push({ status, ...details }); if (mode === 'receipt-failed' && status === 'sent') throw new Error('database unavailable'); },
    retryAgentJob: async () => { retries++; }, createOutreachMessage: async () => {},
  };
  const { executeAgentJobForUser } = require('../src/lib/opportunity-agent/execution.ts');
  async function run(nextMode, approved = true) {
    mode = nextMode; sent = []; finishes = []; retries = 0; checks = 0;
    job = { id: 'job', user_id: 'owner', candidate_profile_id: 'profile', opportunity_match_id: 'match', kind: 'email_outreach', attempts: 1, created_at: new Date().toISOString(), input: { recipient: 'hiring@example.org', approvalVersion: approved ? 'user-approved-v1' : undefined, outreachDraftId: 'draft', approvedByUserAt: new Date().toISOString(), approvedSubject: 'Approved subject', approvedBody: 'Exact text. Please let me know if you prefer not to hear from me.', templateVersion: 'old-template' } };
    await executeAgentJobForUser('owner', 'job');
  }
  await run('normal');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body, job.input.approvedBody, 'Do not regenerate or strip approved text');
  assert.equal(sent[0].subject, job.input.approvedSubject);
  await run('normal', false); assert.equal(sent.length, 0);
  await run('revoked'); assert.equal(sent.length, 0);
  await run('direction-changed'); assert.equal(sent.length, 0);
  await run('uncertain'); assert.equal(retries, 0); assert.equal(finishes.at(-1).errorCode, 'gmail_delivery_unconfirmed');
  const oldError = console.error; console.error = () => {};
  try { await run('receipt-failed'); } finally { console.error = oldError; }
  assert.equal(sent.length, 1); assert.equal(retries, 0);
  assert.equal(finishes.filter(item => item.status === 'failed').length, 0);
  let connectionStatus;
  mocks['@/lib/opportunity-agent/storage'].gmailConnectionForAddress = async () => ({ user_id: 'owner', encrypted_refresh_token: 'fake', status: 'active' });
  mocks['@/lib/opportunity-agent/storage'].updateGmailConnection = async (_, update) => { connectionStatus = update.status; };
  mocks['@/lib/opportunity-agent/gmail'].refreshGmailAccessToken = async () => { throw new mocks['@/lib/opportunity-agent/gmail'].GmailReconnectRequiredError(); };
  const { processGmailPush } = require('../src/lib/opportunity-agent/gmail-events.ts');
  assert.deepEqual(await processGmailPush({ emailAddress: 'owner@example.com', historyId: '2' }), { ignored: true, reason: 'gmail_reconnect_required' });
  assert.equal(connectionStatus, 'error');
  mocks['@/lib/opportunity-agent/gmail'].refreshGmailAccessToken = async () => { throw new Error('temporary provider outage'); };
  await assert.rejects(processGmailPush({ emailAddress: 'owner@example.com', historyId: '2' }), /temporary provider outage/);
  console.log('PASS: auth redirects/nonces, private grants, ownership, company all-capability matching, malformed text, local URLs, intent relevance, exact approved email, revocation, changed direction, and no ambiguous resend. No real emails or network requests.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
