require('./remote-only.cjs');
const assert = require('node:assert/strict');
const { opportunityTitleSupportsIntent: supports } = require('../src/lib/opportunity-execution-guard.ts');
const { remoteRoleQueries, capabilityMatches } = require('../src/lib/capability-evidence.ts');
const { freelancerProjectResult, FreelancerProjectsProvider } = require('../src/lib/freelancer-projects.ts');
const { buildMarketTopics } = require('../src/lib/opportunity-agent/topics.ts');
for (const language of ['Chinese', 'French', 'Spanish', 'German']) {
  const skills = [language, 'Market Research'];
  assert.equal(supports('Market Research Analyst', skills, 'Remote market research project.'), false);
  assert.equal(supports('Market Research Analyst', skills, `Remote market research. Fluent ${language} required.`), true);
  assert.equal(supports('Market Research Analyst', skills, `Remote market research. ${language} is not required.`), false);
  for (const query of remoteRoleQueries(skills)) {
    assert.ok(capabilityMatches(language, query), query);
    assert.ok(/market research|competitive intelligence|consumer insights|research analyst/i.test(query), query);
  }
}
assert.equal(capabilityMatches('Chinese', 'We have offices in Greater China.'), false);
assert.equal(supports('Find Chinese Business Emails', ['Chinese','Market Research'], 'Chinese company research and MX checking to collect email leads.'), false);
assert.equal(supports('Marketing Researcher', ['Chinese','Marketing','Market Research'], 'Remote marketing and market research.'), false);
assert.equal(supports('Marketing Researcher', ['Chinese','Marketing','Market Research'], 'Remote marketing and market research. Read Mandarin sources.'), true);
assert.equal(supports('Marketing Researcher', ['Market Research','Chinese','Marketing'], 'Remote marketing and market research. Read Mandarin sources.'), true);
assert.ok(remoteRoleQueries(['Chinese','Marketing']).every(q=>!q.includes('research')));
const graph={nodes:[{id:'a',label:'Chinese',type:'language',evidence:['Chinese']},{id:'b',label:'Market Research',type:'skill',evidence:['Research']}],edges:[],combinations:[]};
const {validCustomIntent}=require('../src/lib/agent-intents.ts');
assert.equal(validCustomIntent(graph,['Chinese','Unknown']),null);
const {matchingCombinations}=require('../src/lib/opportunity-agent/pipeline.ts');
assert.deepEqual(matchingCombinations({graph,intentCombinationIndex:-1,intentCapabilities:['Chinese','Market Research']})[0].elements,['Chinese','Market Research']);
const topics=buildMarketTopics({graph,intentCombinationIndex:-1,intentCapabilities:['Chinese','Market Research'],context:{workMode:'global_remote'}});
assert.match(topics[0].query,/Chinese market research remote/i);
assert.match(topics[1].query,/Mandarin market research remote/i);
const project={id:123,title:'Chinese Market Research',seo_url:'market-research/chinese-research-123',description:'Read Mandarin sources and deliver online market research.',status:'active',frontend_project_status:'open',local:false,time_submitted:Date.now()/1000,type:'fixed',budget:{minimum:100,maximum:200},currency:{code:'USD'}};
assert.ok(freelancerProjectResult(project));
for(const change of [{frontend_project_status:'closed'},{local:true},{deleted:true},{nonpublic:true},{hireme:true},{time_submitted:1},{description:'Must visit local markets in Kenya. Chinese market research.'}]) assert.equal(freelancerProjectResult({...project,...change}),null);
const fetchOriginal=global.fetch;
const calls=[];
global.fetch=async(url)=>{calls.push(String(url));return {ok:true,json:async()=>({status:'success',result:{projects:[project]}})}};
(async()=>{try{const rows=await new FreelancerProjectsProvider().search('Chinese market research remote');assert.equal(rows.length,1);assert.deepEqual(calls.map(url=>new URL(url).searchParams.get('query')),['Chinese market research','Chinese']);console.log('PASS: all selected skills required, languages preserved, aliases, 3-skill permutations, combined queries and open remote projects.');}finally{global.fetch=fetchOriginal;}})();
