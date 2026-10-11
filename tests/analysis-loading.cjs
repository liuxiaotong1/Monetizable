const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
let user = { id: 'owner' }, owns = true, storageFails = false, claimed = false;
const report = { id: 'report', paid: true, combinations: [], marker: 'saved result' };
const mocks = {
  '@/lib/request-locale': { getRequestLocale: async () => 'en' },
  '@/lib/display-translations': { getDisplayTranslations: async () => { throw new Error('English saved reports must not invoke translation'); } },
  '@/lib/opportunity-agent/storage': {agentOnboardingForUser:async()=>null,candidateProfileIdForAnalysis:async()=>null},
  'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
  '@/lib/auth': { currentUser: async () => user },
  '@/lib/preview': { toPreview: value => ({ id: value.id }) },
  '@/lib/analysis-token': { openAnalysis: token => token === 'x'.repeat(70000) ? { id: 'report' } : null },
  '@/lib/storage': {
    analysisBelongsToUser: async () => { if (storageFails) throw new Error('database failure'); return owns; },
    claimAnalysisForUser: async () => { claimed = true; return true; },
    getAnalysis: async () => report,
    deleteAnalysis: async () => {},
  },
};
const original = Module._load;
Module._load = function(name, parent, main) {
  if (mocks[name]) return mocks[name];
  if (name.startsWith('@/')) name = path.resolve(__dirname, '../src', name.slice(2));
  return original.call(this, name, parent, main);
};
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
async function main() {
  const { GET, POST } = require('../src/app/api/analysis/[id]/route.ts');
  const context = { params: Promise.resolve({ id: 'report' }) };
  assert.deepEqual(await (await GET(new Request('https://example.com/api/analysis/report'), context)).json(), { result: report, directionSelected: false });
  owns = false;
  assert.equal((await GET(new Request('https://example.com/api/analysis/report'), context)).status, 403);
  const request = new Request('https://example.com/api/analysis/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ recoveryToken: 'x'.repeat(70000) }) });
  assert.equal(request.headers.has('x-analysis-recovery'), false);
  assert.equal((await POST(request, context)).status, 200);
  assert.equal(claimed, true);
  user = null;
  assert.equal((await GET(new Request('https://example.com/api/analysis/report'), context)).status, 401);
  user = { id: 'owner' }; storageFails = true;
  const originalError = console.error; console.error = () => {};
  let failure;
  try { failure = await GET(new Request('https://example.com/api/analysis/report'), context); } finally { console.error = originalError; }
  assert.equal(failure.status, 503);
  assert.equal((await failure.json()).retryable, true);
  const { readAnalysisResponse } = require('../src/lib/analysis-response.ts');
  await assert.rejects(readAnalysisResponse(new Response('An error occurred', { status: 431 })), /could not be loaded/);
  await assert.rejects(readAnalysisResponse(new Response('<html>gateway timeout</html>', { status: 504 })), /could not be loaded/);
  assert.deepEqual(await readAnalysisResponse(Response.json({ result: report })), { result: report });
  const css = fs.readFileSync(path.resolve(__dirname, '../src/components/capacity-graph-3d.module.css'), 'utf8');
  assert.match(css.match(/\.roleModel\s*\{([^}]+)\}/)[1], /grid-template-columns:\s*minmax\(0, 1fr\)/);
  const client = fs.readFileSync(path.resolve(__dirname, '../src/components/preview-client.tsx'), 'utf8');
  assert.doesNotMatch(client, /x-analysis-recovery/);
  assert.match(client, /Try again/);
  console.log('PASS: full-width role profile; stored report retrieval; large recovery body (not header); account checks; JSON failures; readable gateway errors and retry.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
