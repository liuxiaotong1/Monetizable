const fs=require('fs'),ts=require('typescript');
const file='src/lib/messages-fr.json';const dictionary=JSON.parse(fs.readFileSync(file));
// Prefer the maintained product translations over generated draft copy.
const mod={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('src/lib/i18n.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod,mod.exports);
const en=mod.exports.getMessages('en'),fr=mod.exports.getMessages('fr');
for(const key of Object.keys(en))dictionary[en[key]]=fr[key];
for(const french of Object.values(fr))if(!(Object.values(en).includes(french)))delete dictionary[french];
for(const [source,value]of Object.entries(dictionary)){
 let translated=value;
 if(source.includes('Monetizable'))translated=translated.replace(/Monétisable|monétisable|Monetizing|Monetisable/g,'Monetizable');
 if(source.includes('SuperCharlie'))translated=translated.replace(/Super Charlie|Supercharlie|Super Charley/g,'SuperCharlie');
 dictionary[source]=translated;
 // JSX entity spelling differs from the text node React renders.
 const normalized=source.replace(/&apos;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
 if(normalized!==source)dictionary[normalized]=translated;
}
// Existing French dictionaries are already localized: never translate them twice.
for (const sourceFile of ['src/lib/i18n.ts', 'src/lib/agent-copy.ts', 'src/components/brand.tsx', 'src/components/opportunity-agent-intro.tsx']) {
  const tree=ts.createSourceFile(sourceFile,fs.readFileSync(sourceFile,'utf8'),ts.ScriptTarget.Latest,true);
  function removeFrench(node, french=false) {
    const inside=french || (ts.isPropertyAssignment(node) && node.name.getText(tree)==='fr');
    if(inside && ts.isStringLiteral(node) && !Object.values(en).includes(node.text)) delete dictionary[node.text.replace(/\s+/g,' ').trim()];
    ts.forEachChild(node, child=>removeFrench(child,inside));
  }
  removeFrench(tree);
}
Object.assign(dictionary,JSON.parse(fs.readFileSync('scripts/i18n/overrides.json')));
// Don't ship untranslated code/config values in the presentation catalog.
for(const [key,value]of Object.entries(dictionary))if(/var\(--|^https?:|^Bearer |Content-Type:|^monetizable_locale=|^\(?max-width:|^@|^#[0-9A-F]{6}$/.test(key))delete dictionary[key];
fs.writeFileSync(file,JSON.stringify(dictionary,null,2)+'\n');
console.log('Final French catalog:',Object.keys(dictionary).length,'entries');
