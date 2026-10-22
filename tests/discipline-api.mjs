import fs from 'node:fs';import ts from 'typescript';import assert from 'node:assert/strict';
function load(file,deps={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>{if(n in deps)return deps[n];throw Error(n)},m,m.exports);return m.exports;}
const validation=load('src/lib/quest/discipline-plan.ts');let user=null,origin=true,queries=[];
const route=load('src/app/api/discipline/route.ts',{'next/server':{NextResponse:{json:(body,o={})=>({body,status:o.status||200,headers:o.headers})}},'@/lib/account/auth':{currentUser:async()=>user,sameOrigin:()=>origin},'@/lib/quest/discipline-plan':validation,'@/lib/account/db':{database:()=>({query:async(sql,args)=>{queries.push({sql,args});return {rows:[{body:{current:args.length>1?JSON.parse(args[1]):null}}]}}})}});
assert.equal((await route.GET()).status,401);assert.equal(queries.length,0);
user={id:'user-a'};origin=false;assert.equal((await route.PUT(new Request('https://example.com',{method:'PUT',body:'{}'}))).status,403);assert.equal(queries.length,0);
origin=true;const req=b=>new Request('https://example.com',{method:'PUT',body:JSON.stringify(b)});
assert.equal((await route.PUT(req({system:'ABC',rules:[],custom:''}))).status,400);
const saved=await route.PUT(req({system:'My trend system',rules:['reason'],custom:'Wait',since:'2000-01-01'}));assert.equal(saved.status,200);assert.notEqual(saved.body.plan.since,'2000-01-01');assert.equal(queries.at(-1).args[0],'discipline-v1:user-a');assert.match(queries.at(-1).sql,/history/);assert.equal(saved.headers['Cache-Control'],'private, no-store');
await route.GET();assert.equal(queries.at(-1).args[0],'discipline-v1:user-a');
console.log('Passed private per-user storage, authentication, same-origin guard, server timestamp and retained plan versions.');
