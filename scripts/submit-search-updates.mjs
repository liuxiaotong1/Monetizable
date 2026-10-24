// Public IndexNow ownership key; this is intentionally not an authentication secret.
// Run only after the matching production content has passed HTTP/canonical checks.
const origin = 'https://getmonetizable.com';
const key = '461fa8052c4edd6325892fa2fa1e4882';
const response = await fetch(`${origin}/sitemap.xml`);
if (!response.ok) throw Error(`Sitemap HTTP ${response.status}`);
const xml = await response.text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
if (!urls.length || urls.some(url => new URL(url).origin !== origin)) throw Error('Invalid production sitemap');
const proof = await fetch(`${origin}/${key}.txt`);
if (!proof.ok || (await proof.text()).trim() !== key) throw Error('IndexNow ownership proof unavailable');
for (const url of urls) {
  const page = await fetch(url, {headers: {'User-Agent': 'Monetizable-Search-Verification/1.0'}});
  if (!page.ok || !page.headers.get('content-type')?.includes('text/html')) throw Error(`${url}: HTTP ${page.status}`);
  const html = await page.text();
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
  if (canonical?.replace(/\/$/, '') !== url.replace(/\/$/, '')) throw Error(`${url}: canonical mismatch`);
}
const result = await fetch('https://api.indexnow.org/indexnow', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({host: 'getmonetizable.com', key, keyLocation: `${origin}/${key}.txt`, urlList: urls})});
if (![200, 202].includes(result.status)) throw Error(`IndexNow HTTP ${result.status}: ${(await result.text()).slice(0, 300)}`);
console.log(JSON.stringify({date: new Date().toISOString(), status: 'submitted', httpStatus: result.status, urls, result: 'Notification accepted; crawling, indexing and AI recommendations remain independently unverified.'}, null, 2));
