require('./remote-only.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {buyerProblemSupported,buyerProblemRecoveryQueries}=require('../src/lib/opportunity-agent/buyer-problems.ts');
const {FreelancerProjectsProvider}=require('../src/lib/freelancer-projects.ts');
const cases=[
 {evidenceGroups:[['Mandarin'],['market research']],text:'Chinese market analysis for a remote client'},
 {evidenceGroups:[['video editing'],['social media']],text:'Edit videos for social media campaigns'},
 {evidenceGroups:[['financial technology'],['translation']],text:'Translate a fintech website'},
 {evidenceGroups:[['investor communications'],['financial reports']],text:'Investor communication using financial reports'},
];
for(const p of cases){assert.ok(buyerProblemSupported(p,'Freelance project',p.text));assert.equal(buyerProblemSupported(p,'Unrelated project','Remote website coding'),false);assert.ok(buyerProblemRecoveryQueries(p).length>=1);}
assert.equal(buyerProblemSupported(cases[0],'Market research','Generic English customer survey'),false);
const pipeline=fs.readFileSync('src/lib/opportunity-agent/pipeline.ts','utf8');
assert.ok(pipeline.includes('if (!hasMatch())'));
assert.ok(pipeline.includes('await mapWithConcurrency(topicGroups, 4'));
const original=global.fetch; const queries=[];
global.fetch=async url=>{queries.push(new URL(url).searchParams.get('query'));return{ok:true,json:async()=>({status:'success',result:{projects:[]}})}};
(async()=>{try{await new FreelancerProjectsProvider().search('Chinese investor communications remote freelance project');assert.ok(queries.includes('Chinese investor communications'));assert.ok(queries.includes('Chinese'));console.log('PASS: four directions, equivalent buyer wording, missing-domain rejection, filtered-zero recovery, bounded parallel searches, language and outcome lanes.');}finally{global.fetch=original}})();
