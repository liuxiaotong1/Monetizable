// Read-only regressions. Run: node tests/company-needs.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'next/link') return ({ href, children, ...props }) => require('react').createElement('a', { href, ...props }, children);
  if (name === 'next/dynamic') return () => () => null;
  if (name === 'next/image') return (props) => require('react').createElement('img', props);
  if (name.startsWith('@/')) name = path.join(root, 'src', name.slice(2));
  return originalLoad.call(this, name, parent, isMain);
};
require.extensions['.css'] = (module) => { module.exports = new Proxy({}, { get: (_, key) => String(key) }); };
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } });
  module._compile(compiled.outputText, filename);
};
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { countCapabilityMatches } = require('../src/lib/company-need-match.ts');
const { CompanyNeedForm } = require('../src/components/company-need-form.tsx');
const { buildDemoCapacityGraph } = require('../src/lib/capacity-graph-view.ts');
const { demoCombinationInsight, DEMO_CAREER_TITLES } = require('../src/lib/demo-career-insights.ts');

const profiles = [
  { id: 'finance', top_skills: ['Financial Analysis', 'Budgeting'] },
  { id: 'content', skill_combinations: [{ elements: ['Short-form Content', 'Social Media'] }] },
  { id: 'language', languages: ['Mandarin Chinese', 'French'] },
];
assert.equal(countCapabilityMatches({ expertise: ['Financial analysis'] }, profiles), 1);
assert.equal(countCapabilityMatches({ expertise: ['Chinese language'] }, profiles), 1);
assert.equal(countCapabilityMatches({ expertise: [], expertiseOther: 'quantitative research' }, profiles), 0);
assert.equal(demoCombinationInsight(['Communication', 'Financial Analysis'])?.career, 'Finance Business Partner');
assert.equal(demoCombinationInsight(['Market Research', 'Financial Analysis'])?.career, 'Investment Research Analyst');
assert.equal(demoCombinationInsight(['Communication', 'Sales'])?.career, 'Business Development Manager');
assert.equal(demoCombinationInsight(['Data Analysis', 'Financial Analysis'])?.career, 'FP&A Analyst');
assert.equal(demoCombinationInsight(['Communication', 'Data Analysis'])?.career, 'Business Intelligence Analyst');
assert.equal(demoCombinationInsight(['Marketing', 'Financial Analysis'])?.career, 'Commercial Finance Manager');
assert.equal(demoCombinationInsight(['Product Knowledge', 'Brand Strategy', 'Financial Analysis'])?.career, 'Product Marketing Manager');
assert.equal(demoCombinationInsight(['Product Knowledge', 'Financial Analysis'])?.career, 'Product Strategy Manager');
assert.equal(demoCombinationInsight(['Product Knowledge', 'Operations'])?.career, 'Product Operations Manager');
assert.equal(demoCombinationInsight(['Product Knowledge', 'Growth Hacking', 'Data Analysis'])?.career, 'Growth Product Manager');
assert.equal(demoCombinationInsight(['Product Knowledge', 'Content Strategy', 'User Onboarding'])?.career, 'Customer Education Manager');
assert.equal(demoCombinationInsight(['Storytelling', 'SQL'])?.career, 'Insights Communication Consultant');
assert.equal(demoCombinationInsight(['Spanish', 'Excel'])?.career, 'International Reporting Analyst');
assert.equal(demoCombinationInsight(['Spanish', 'Operations', 'Financial Analysis'])?.career, 'International Finance Operations Manager');

const demoLabels = buildDemoCapacityGraph().nodes.map((node) => node.label);
const curatedTitles = new Set(DEMO_CAREER_TITLES);
let resolvedPairs = 0;
let resolvedTriples = 0;
function assertCuratedInsight(insight) {
  assert.ok(insight, 'Every two- or three-capacity selection must return an insight');
  assert.ok(curatedTitles.has(insight.career), `Uncatalogued career title: ${insight.career}`);
  assert.doesNotMatch(insight.career, /\+|\bspecialist\b/i);
  assert.ok(insight.market && insight.earning && insight.roleModel && insight.roleModelSummary);
}
for (let first = 0; first < demoLabels.length; first += 1) {
  for (let second = first + 1; second < demoLabels.length; second += 1) {
    const labels = [demoLabels[first], demoLabels[second]];
    const insight = demoCombinationInsight(labels);
    assert.deepEqual(insight, demoCombinationInsight([...labels].reverse()), `Pair result depends on selection order: ${labels.join(', ')}`);
    assertCuratedInsight(insight);
    if (insight) resolvedPairs += 1;
    for (let third = second + 1; third < demoLabels.length; third += 1) {
      const triple = [...labels, demoLabels[third]];
      const tripleInsight = demoCombinationInsight(triple);
      assert.deepEqual(tripleInsight, demoCombinationInsight([triple[2], triple[0], triple[1]]), `Triple result depends on selection order: ${triple.join(', ')}`);
      assertCuratedInsight(tripleInsight);
      if (tripleInsight) resolvedTriples += 1;
    }
  }
}
assert.equal(resolvedPairs, demoLabels.length * (demoLabels.length - 1) / 2, `Every pair must resolve, got ${resolvedPairs}`);
assert.equal(resolvedTriples, demoLabels.length * (demoLabels.length - 1) * (demoLabels.length - 2) / 6, `Every triple must resolve, got ${resolvedTriples}`);
const html = renderToStaticMarkup(React.createElement(CompanyNeedForm));
for (const text of ['What do you need done?', 'What outcome would make this successful?', 'B2B sales', 'Full-time', 'Budget / salary range', 'Location / timezone requirements', 'Work email', 'Free for now']) assert.match(html, new RegExp(text.replace(/[?]/g, '\\?')));
const homepage = fs.readFileSync(path.join(root, 'src/lib/i18n.ts'), 'utf8');
assert.match(homepage, /Turn expertise into/);
assert.match(homepage, /real opportunities/);
const funnel = fs.readFileSync(path.join(root, 'src/components/funnel.tsx'), 'utf8');
const companion = fs.readFileSync(path.join(root, 'src/components/supercharlie-companion.tsx'), 'utf8');
const companyForm = fs.readFileSync(path.join(root, 'src/components/company-need-form.tsx'), 'utf8');
const agentIntro = fs.readFileSync(path.join(root, 'src/components/opportunity-agent-intro.tsx'), 'utf8');
const capacityGraph = fs.readFileSync(path.join(root, 'src/components/capacity-graph-3d.tsx'), 'utf8');
const careerInsights = fs.readFileSync(path.join(root, 'src/lib/demo-career-insights.ts'), 'utf8');
const capacityCanvas = fs.readFileSync(path.join(root, 'src/components/capacity-graph-canvas.tsx'), 'utf8');
assert.match(funnel, /card discovery-card/);
assert.ok(funnel.indexOf('lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,.8fr)]') < funnel.indexOf('<SuperCharlieCompanion placement="homepage"'));
assert.doesNotMatch(companion, /"shell pointer-events-none/);
assert.match(companion, /w-\[92px\].*lg:w-\[116px\]/);
assert.match(companion, /lg:sticky lg:top-24/);
assert.match(companion, /fixed bottom-4 right-4/);
assert.match(companion, /onPointerDown=\{startDrag\}/);
assert.match(companion, /menuOpen \? .*Hide SuperCharlie/s);
assert.match(companyForm, /customExpertise\.map/);
assert.match(companyForm, /Press Enter or comma/);
assert.match(agentIntro, /Package and outreach now/);
assert.doesNotMatch(agentIntro, /Subscriber sign in|Create my Capacity Graph/);
assert.match(capacityGraph, /selectedIds/);
assert.match(capacityGraph, /Potential buyers to explore/);
assert.match(capacityGraph, /Illustrative earning range/);
assert.match(capacityGraph, /not verified salary data/);
assert.match(capacityGraph, /Illustrative role profile/);
assert.doesNotMatch(capacityGraph, /employment-crucial-change-2026-hero/);
assert.doesNotMatch(capacityGraph, /Add one clarifying capacity|No confident direction yet|Replace one capacity rather than forcing an invented role/);
assert.match(careerInsights, /Multilingual Content Strategist/);
assert.match(careerInsights, /Consumer Insights Manager/);
assert.match(careerInsights, /Financial Communications Strategist/);
assert.match(careerInsights, /coversSelection/);
assert.match(careerInsights, /meetsRequiredGroups/);
assert.match(careerInsights, /if \(!winner\) return semanticFallback\(selected\)/);
assert.doesNotMatch(careerInsights, /Commercial Strategy Consultant/);
assert.doesNotMatch(capacityGraph, /labels\.join\(" \+ "\)|\} specialist/);
assert.match(capacityCanvas, /selectedIds\.slice\(1\)/);
assert.match(capacityCanvas, /globalAlpha = dimmed \? 0\.52 : 1/);
assert.doesNotMatch(capacityCanvas, /combinationIndex === selectedCombination/);
console.log(`PASS: company need form, homepage positioning and capability matching; audited ${resolvedPairs}/${demoLabels.length * (demoLabels.length - 1) / 2} pairs and ${resolvedTriples}/${demoLabels.length * (demoLabels.length - 1) * (demoLabels.length - 2) / 6} triples with order-invariant curated titles.`);
