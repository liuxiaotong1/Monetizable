require('./remote-only.cjs');
const assert = require('node:assert/strict');
const { safeOpportunityDescription: clean } = require('../src/lib/opportunity-text.ts');
assert.equal(clean('Yaqeen · Remote · Worldwide · UTC offsets: -11, -10, -9.5, 14 · Contractor · About Yaqeen Institute Yaqeen is a nonprofit on a mission to pioneer I'), null);
assert.equal(clean('&lt;p&gt;Create video campaigns for our remote marketing team.&lt;/p&gt;'), 'Create video campaigns for our remote marketing team.');
assert.equal(clean('Create video campaigns for our remote marketing team. This sentence is cut midw'), 'Create video campaigns for our remote marketing team.');
assert.equal(clean('... media ... content ...'), null);
const { remoteOkResult } = require('../src/lib/remote-ok.ts');
assert.equal(remoteOkResult({ legal: 'not a job' }), null);
assert.ok(remoteOkResult({id: 1, position: 'Video editor', url: 'https://remoteok.com/remote-jobs/1-video-editor', date: new Date().toISOString(), description: 'Edit video for remote marketing campaigns.'}));
const { buildDemoCapacityGraph, projectCapacityGraph } = require('../src/lib/capacity-graph-view.ts');
const { demoCombinationInsight } = require('../src/lib/demo-career-insights.ts');
const { DEFAULT_DEMO_CAPABILITIES, demoRoleModel } = require('../src/lib/demo-role-models.ts');
const scene = projectCapacityGraph(buildDemoCapacityGraph(), 42);
assert.ok(DEFAULT_DEMO_CAPABILITIES.every(label => scene.nodes.some(node => node.label === label)));
assert.equal(demoRoleModel(demoCombinationInsight(DEFAULT_DEMO_CAPABILITIES).career).name, 'Julie Zhuo');
const { HimalayasProvider, himalayasResult } = require('../src/lib/himalayas.ts');
const job = { title: 'Video editor', guid: 'https://himalayas.app/companies/test/jobs/editor', description: 'Edit videos for our remote marketing team.', pubDate: '2026-09-13T00:00:00Z', locationRestrictions: [{name:'France'}] };
assert.ok(himalayasResult(job,{country:'France'}).publishedDate);
assert.equal(himalayasResult({...job,pubDate:'broken'},{country:'France'}).publishedDate, undefined);
(async () => {
  const original = global.fetch;
  let calls = 0;
  global.fetch = async url => {
    const page = Number(new URL(url).searchParams.get('page')); calls++;
    return {ok:true,json:async()=>({limit:20,totalCount:25,jobs:Array.from({length:page===1?20:5},(_,i)=>({...job,guid:`${job.guid}-${page}-${i}`}))})};
  };
  try { assert.equal((await new HimalayasProvider({country:'France'}).search('video editor')).length,25); assert.equal(calls,2); }
  finally { global.fetch=original; }
  const { RemoteFirstProvider } = require('../src/lib/search.ts');
  calls = 0;
  global.fetch = async url => {
    const page = Number(new URL(url).searchParams.get('page')); calls++;
    return {ok:true,json:async()=>({jobs:Array.from({length:page===0?100:25},(_,i)=>({title:'Video Editor',url:`https://remotefirstjobs.com/jobs/${page}-${i}`,description:'Edit video campaigns remotely.'}))})};
  };
  try { assert.equal((await new RemoteFirstProvider().search('video editor')).length,125); assert.equal(calls,2); }
  finally { global.fetch=original; }
  console.log('PASS: clean descriptions, Remote OK, Himalayas pagination/date variants, Julie default.');
})().catch(error=>{console.error(error);process.exitCode=1});
