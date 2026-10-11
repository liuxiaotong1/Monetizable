const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const en=fs.readdirSync('content/posts').filter(x=>x.endsWith('.json')).sort();
const fr=fs.readdirSync('content/posts-fr').filter(x=>x.endsWith('.json')).sort();assert.deepEqual(fr,en);
for(const file of en){const source=JSON.parse(fs.readFileSync(path.join('content/posts',file)));const target=JSON.parse(fs.readFileSync(path.join('content/posts-fr',file)));for(const key of ['slug','canonical','publishedAt','modifiedAt','heroImage'])assert.equal(target[key],source[key]);assert.deepEqual(target.contentHtml.match(/<[^>]*>/g),source.contentHtml.match(/<[^>]*>/g));assert.notEqual(target.title,source.title);assert.notEqual(target.contentHtml,source.contentHtml);assert.equal(/Monétisable|Monetizing/.test(target.contentHtml),false);}
const dictionary=JSON.parse(fs.readFileSync('src/lib/messages-fr.json'));
for(const key of ['What is the difference between ChatGPT and Monetizable?','Something went wrong','Your analysis could not be loaded right now. Please try again.','Log in / Sign up','For Companies','Package your expertise'])assert.ok(dictionary[key]&&dictionary[key]!==key,key);
assert.equal(dictionary['%s | Monetizable'],'%s | Monetizable');
console.log(`PASS: ${en.length} French articles; identical URLs, tags, dates and assets; French navigation, errors and brand preservation.`);
