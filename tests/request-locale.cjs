const assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript');
function load(file,stubs){const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>stubs[name],mod,mod.exports);return mod.exports;}
const i18n=load('src/lib/i18n.ts',{});let selected,values=new Headers();
const {getRequestLocale}=load('src/lib/request-locale.ts',{'@/lib/i18n':i18n,'next/headers':{cookies:async()=>({get:()=>selected?{value:selected}:undefined}),headers:async()=>values}});
(async()=>{
 values.set('x-vercel-ip-country','FR');assert.equal(await getRequestLocale(),'fr');
 selected='en';assert.equal(await getRequestLocale(),'en');
 selected='zh';assert.equal(await getRequestLocale(),'fr','Legacy cookies must not select unsupported languages');
 selected='fr';values.set('x-vercel-ip-country','US');values.set('x-monetizable-content-language','en');assert.equal(await getRequestLocale(),'fr','Content routes cannot force English');
 selected=undefined;values=new Headers({'accept-language':'fr-FR'});assert.equal(await getRequestLocale(),'en','Unknown location defaults to English');
 console.log('PASS: explicit preference, geography, invalid-cookie migration, ignored forced-English header and default English.');
})().catch(e=>{console.error(e);process.exitCode=1;});
