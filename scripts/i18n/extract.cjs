const fs = require('node:fs'), path=require('node:path'),ts=require('typescript');
const texts=new Set();
const add=s=>{s=s.replace(/\s+/g,' ').trim(); if(/[A-Za-z]{2}/.test(s)&&s.length>1&&!s.startsWith('/')&&!s.startsWith('http')&&!s.includes('var(--')&&!s.includes('@/')&&!/^[a-z0-9_./:#-]+$/.test(s)) texts.add(s);};
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk('src').filter(f=>/\.(tsx|ts)$/.test(f)&&!f.includes('/api/'))){
 const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 function visit(n){if(ts.isJsxText(n)||ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)) add(n.text);ts.forEachChild(n,visit);}visit(sf);
}
// HTML is handled separately on the server, never shipped in the UI catalog.
for(const file of walk('content/posts')){const p=JSON.parse(fs.readFileSync(file));for(const k of ['title','seoTitle','description','heroAlt']) if(p[k])add(p[k]);}
fs.writeFileSync('scripts/i18n/source-strings.json',JSON.stringify([...texts].sort(),null,2));
console.log(texts.size,'source strings');
