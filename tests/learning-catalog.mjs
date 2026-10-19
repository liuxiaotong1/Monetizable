import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('src/lib/quest/learning-catalog.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let rows=[],queries=[];const curated={id:'en:curated',answerIndex:1,choices:['a','b']};
const module={exports:{}};
new Function('require','module','exports',code)(name=>{
 if(name==='server-only')return{};
 if(name.includes('/db'))return{database:()=>({query:async(sql,args)=>{queries.push(args);return {rows}}})};
 if(name==='./public-source')return{foundationFeed:()=>({state:{cards:[curated]}})};
 if(name==='./public-locale')return{localizedPublicState:state=>state};
 throw Error(`Unexpected dependency ${name}`);
},module,module.exports);
const {publishedLearningCard}=module.exports;
rows=[{card:{id:'en:hot',answerIndex:2}}];assert.equal((await publishedLearningCard('en:hot','en')).answerIndex,2);assert.deepEqual(queries[0],['learning-catalog:en','en:hot']);
rows=[];assert.equal((await publishedLearningCard('en:curated','en')).answerIndex,1);assert.equal(await publishedLearningCard('missing','fr'),undefined);
assert.ok(!/getPublicFeed\(/.test(code),'Answer validation must not trigger live data refresh');
console.log('Published multilingual catalog lookup, server-owned answers and curated fallback passed without provider refresh.');
