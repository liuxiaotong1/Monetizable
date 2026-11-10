import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {createJiti} from 'jiti';

const jiti = createJiti(import.meta.url);
const {scheduledRefreshMode, calendarMonths, FULL_ASSEMBLE_MS} = await jiti.import('../src/lib/quest/feed-plan.ts');
const {toSnapshot, fromSnapshot} = await jiti.import('../src/lib/quest/feed-snapshot.ts');
const raw = JSON.parse(await readFile(new URL('../src/data/public-feed.json', import.meta.url), 'utf8'));

function feedFrom(data) {
  return structuredClone({
    version: 1,
    exportedAt: data.exportedAt,
    state: data.state,
    reports: data.reports || {reports: []},
    intelligence: data.intelligence || {sources: []},
  });
}

function clock(key, version, at, error) {
  return {key, version, attemptedAt: at, ...(error ? {error} : {})};
}

function quietClocks(now, events) {
  const at = now.toISOString();
  const clocks = [
    clock('news-native', 1, at),
    clock('event-values-native', 1, at),
    clock('bea-calendar-native', 1, at),
    clock('fed-calendar-native', 2, at),
    clock(`major-earnings:${now.toISOString().slice(0, 7)}:${Math.floor(+now / 604800000)}`, 2, at),
    ...calendarMonths(now).map((month) => clock(`calendar-native:${month}`, 1, at)),
    ...['CPI', 'NFP', 'PCE', 'GDP', 'FOMC', 'CLAIMS', 'CONFIDENCE', 'TRADE', 'JOLTS', 'RETAIL', 'PPI'].map((kind) => clock(`history-native:${kind}`, 1, at)),
    ...events.map((event) => clock(`release-native:${event.id}`, event.kind === 'FOMC' ? 7 : event.kind === 'GDP' ? 6 : event.kind === 'CLAIMS' || event.kind === 'PCE' || event.kind === 'TRADE' ? 5 : event.kind === 'EARNINGS' ? 1 : 4, at)),
  ];
  return clocks;
}

test('a fresh snapshot skips the heavy rebuild', () => {
  const now = new Date('2026-11-07T15:00:00Z');
  const events = [{id: 'old', kind: 'CPI', at: '2026-10-01T12:30:00Z', status: 'confirmed', title: 'CPI'}];
  const plan = scheduledRefreshMode({
    now,
    snapshotUpdatedAt: now.toISOString(),
    barsFetchedAt: now.toISOString(),
    lastBarDate: '2026-11-06',
    clocks: quietClocks(now, events),
    events,
  });
  assert.equal(plan.mode, 'light');
  assert.equal(plan.newsDue, false);
  assert.equal(FULL_ASSEMBLE_MS, 15 * 60 * 1000);
});

test('an old snapshot or a release from the last day rebuilds the feed', () => {
  const now = new Date('2026-11-07T15:00:00Z');
  const events = [{id: 'old', kind: 'CPI', at: '2026-10-01T12:30:00Z', status: 'confirmed', title: 'CPI'}];
  const clocks = quietClocks(now, events);
  assert.equal(scheduledRefreshMode({now, snapshotUpdatedAt: new Date(+now - 16 * 60 * 1000).toISOString(), barsFetchedAt: now.toISOString(), lastBarDate: '2026-11-06', clocks, events}).mode, 'full');
  const recent = [{id: 'cpi-now', kind: 'CPI', at: new Date(+now - 60 * 60 * 1000).toISOString(), status: 'pending', title: 'CPI'}];
  assert.equal(scheduledRefreshMode({now, snapshotUpdatedAt: now.toISOString(), barsFetchedAt: now.toISOString(), lastBarDate: '2026-11-06', clocks: quietClocks(now, recent).filter((item) => item.key !== 'release-native:cpi-now'), events: recent}).mode, 'full');
});

test('an old failed release waits for the regular assemble instead of reloading every cache', () => {
  const now = new Date('2026-11-07T15:00:00Z');
  const events = [{id: 'old', kind: 'CPI', at: '2026-10-01T12:30:00Z', status: 'confirmed', title: 'CPI'}];
  const clocks = quietClocks(now, events).map((item) => item.key === 'release-native:old' ? {...item, attemptedAt: new Date(+now - 10 * 60 * 1000).toISOString(), error: 'upstream'} : item);
  assert.equal(scheduledRefreshMode({now, snapshotUpdatedAt: now.toISOString(), barsFetchedAt: now.toISOString(), lastBarDate: '2026-11-06', clocks, events}).mode, 'light');
});

test('the stored public feed keeps one history per series and round-trips changed releases', () => {
  const baseline = feedFrom(raw);
  const live = feedFrom(raw);
  for (const item of live.state.events) if (item.kind === 'CPI') item.history = [{date: '2026-09-01', value: 9.91}];
  const event = live.state.events.find((item) => item.kind === 'CPI');
  assert.ok(event);
  event.actual = 9.91;
  const snapshot = toSnapshot(live, {events: baseline.state.events, bars: baseline.state.bars});
  const encoded = JSON.stringify(snapshot);
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.patches[event.id].actual, 9.91);
  assert.equal(snapshot.patches[event.id].history, undefined);
  assert.deepEqual(snapshot.historyByKind.CPI.history, event.history);
  assert.ok(encoded.length < JSON.stringify(live.state).length / 2, `snapshot ${encoded.length} is still too large`);
  const restored = fromSnapshot(snapshot, feedFrom(raw));
  const match = restored.state.events.filter((item) => item.kind === 'CPI');
  assert.ok(match.some((item) => item.actual === 9.91));
  assert.ok(match.every((item) => item.history.at(-1)?.value === 9.91));
  assert.ok(restored.state.cards.length > 100);
  assert.equal(JSON.stringify(snapshot).includes('"cards"'), false);
});
