// Read-only render regressions. Run: node tests/scan-ui.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'next/navigation') return { useRouter: () => ({ refresh() {}, replace() {} }) };
  if (name.startsWith('@/')) name = path.join(root, 'src', name.slice(2));
  return originalLoad.call(this, name, parent, isMain);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } });
  module._compile(compiled.outputText, filename);
};
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { AgentRadar } = require('../src/components/agent-radar.tsx');
const { AgentFeed } = require('../src/components/agent-feed.tsx');
const { AgentProcess } = require('../src/components/agent-process.tsx');
const { opportunityTitleSupportsIntent } = require('../src/lib/opportunity-execution-guard.ts');
const { safeOpportunityDescription } = require('../src/lib/opportunity-text.ts');
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const stats = { scanning: false, hasScanned: true, marketSignalsScanned: 100, eligibleAfterHardFilters: 10, capacityMatches: 2, strongOpportunities: 2, hotLeads: 2, platformLeads: 2, emailLeads: 0, opportunityTypeBreakdown: {}, filteredOutReasons: {} };
const platform = { id: 'platform', combination_index: 0, fit_label: 'Strong fit', fit_reason: 'Relevant evidence', score: 90, status: 'new', created_at: '2026-09-03', market_opportunities: { id: 'op-platform', title: 'Market expansion consultant', source: 'Example', source_url: 'https://example.com/apply', kind: 'consulting', summary: 'A relevant consulting opportunity.', required_skills: [], public_signals: [], evidence_urls: [], opportunity_signatures: { contact_method: 'application_link' } } };
const email = { ...platform, id: 'email', market_opportunities: { ...platform.market_opportunities, id: 'op-email', title: 'Direct consulting request', opportunity_signatures: { contact_method: 'public_email', contact_value: 'hello@example.com' } } };
for (const scanning of [false, true]) {
  const html = render(AgentRadar, { initialStats: { ...stats, scanning } });
  assert.match(html, /SuperCharlie found 2 opportunities for you/);
  assert.doesNotMatch(html, /Direct email leads/i);
  assert.match(html, /Review the best opportunities/);
}
assert.match(render(AgentRadar, { initialStats: { ...stats, emailLeads: 1 } }), /Direct email leads/i);
const platformHtml = render(AgentFeed, { initialMatches: [platform], initialJobs: [], combinationLabels: [] });
assert.match(platformHtml, /Market expansion consultant/);
assert.match(platformHtml, /Try this application/);
assert.match(platformHtml, /then submit it yourself/);
assert.doesNotMatch(platformHtml, /Direct email outreach|verified direct.email|can be sent by SuperCharlie/i);
const mixedHtml = render(AgentFeed, { initialMatches: [platform, email], initialJobs: [], combinationLabels: [] });
assert.match(mixedHtml, /Direct email outreach/);
assert.match(mixedHtml, /hello@example.com/);
assert.match(mixedHtml, /Your approval required/);
assert.match(mixedHtml, /Review email draft/);
assert.match(mixedHtml, /No email will be sent until you review and approve/);
assert.doesNotMatch(render(AgentProcess, { initialJobs: [], initialRadar: stats }), /Direct email outreach today|0 verified email/i);
assert.match(render(AgentProcess, { initialJobs: [], initialRadar: { ...stats, emailLeads: 1 } }), /Email leads awaiting approval/);
assert.equal(opportunityTitleSupportsIntent('Freelance Writer', ['Financial Analysis', 'Content Creation', 'Social Media Management'], 'Write articles and blog posts on many topics.'), false);
assert.equal(opportunityTitleSupportsIntent('Financial Analyst', ['Financial Analysis', 'Project Management'], 'Financial analysis and project planning for senior stakeholders.'), true);
assert.equal(safeOpportunityDescription('Summit K12 · ...roadmap, and financial ... ...disciplined analysis ...Performance Management &...'), null);
const pipelineSource = fs.readFileSync(require.resolve('../src/lib/opportunity-agent/pipeline.ts'), 'utf8');
const executionSource = fs.readFileSync(require.resolve('../src/lib/opportunity-agent/execution.ts'), 'utf8');
const activitySource = fs.readFileSync(require.resolve('../src/app/api/agent/activity/route.ts'), 'utf8');
assert.doesNotMatch(pipelineSource, /enqueueAgentJob|consumeExecutionQueue/);
assert.match(executionSource, /approvalVersion === "user-approved-v1"/);
assert.match(executionSource, /approvedByUserAt/);
assert.doesNotMatch(activitySource, /executeAgentJob|consumeExecutionQueue/);
console.log('PASS: scan headline, background scanning, zero-email visibility, platform details, ATS submission CTA, mixed-channel results, process metrics.');
