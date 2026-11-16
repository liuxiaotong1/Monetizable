import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('shared routes stay on a public cache and per-user routes stay private', async () => {
  const intelligence = await read('src/app/api/event-intelligence/route.ts');
  const state = await read('src/app/api/state/route.ts');
  const reports = await read('src/app/api/agent-reports/route.ts');
  const billing = await read('src/app/api/billing/status/route.ts');
  assert.match(intelligence, /s-maxage=3600/);
  assert.match(intelligence, /stale-while-revalidate=86400/);
  assert.doesNotMatch(intelligence, /private/);
  for (const source of [state, reports, billing]) {
    assert.match(source, /private/);
    assert.match(source, /Vary':'Cookie'|Vary": "Cookie"/);
    assert.doesNotMatch(source, /s-maxage/);
  }
  assert.match(state, /maxDuration=15/);
  assert.match(reports, /maxDuration=20/);
  assert.match(billing, /maxDuration=10/);
  assert.match(await read('src/app/api/refresh/route.ts'), /maxDuration=60/);
});

test('open tabs poll slowly and pause when hidden or idle', async () => {
  const poll = await read('src/components/quest/use-visible-poll.ts');
  assert.match(poll, /visibilityState/);
  assert.match(poll, /IDLE_MS = 3 \* 60 \* 1000/);
  const quest = await read('src/components/quest/quest-app.tsx');
  const english = await read('src/components/quest/english-quest.tsx');
  const reports = await read('src/components/quest/agent-reports.tsx');
  const intelligence = await read('src/components/quest/event-intelligence.tsx');
  const billing = await read('src/components/account/billing-access.tsx');
  assert.match(quest, /useVisiblePoll\([\s\S]*5\*60\*1000\)/);
  assert.match(english, /useVisiblePoll\([\s\S]*5 \* 60 \* 1000\)/);
  assert.match(reports, /useVisiblePoll\([\s\S]*10\*60\*1000/);
  assert.match(intelligence, /useVisiblePoll\([\s\S]*10\*60\*1000\)/);
  assert.match(billing, /useVisiblePoll\([\s\S]*5\*60\*1000\)/);
  assert.match(await read('src/components/quest/use-close-refresh.ts'), /60_000/);
  assert.doesNotMatch(quest, /setInterval\(onReturn,60000\)/);
  assert.doesNotMatch(billing, /30000/);
});

test('reads do not start a provider refresh', async () => {
  const source = await read('src/lib/quest/public-source.ts');
  assert.doesNotMatch(source, /refreshNative/);
  assert.match(source, /getLocalizedPublicState/);
  assert.match(await read('src/lib/quest/feed-plan.ts'), /NEWS_REFRESH_MS=60\*60\*1000/);
  assert.match(await read('src/lib/quest/data-refresh.ts'), /NEWS_REFRESH_MS/);
});
