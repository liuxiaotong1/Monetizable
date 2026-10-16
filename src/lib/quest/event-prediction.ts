import type { MarketEvent } from './types';

export type EventPick = 'lower' | 'equal' | 'higher';
export interface EventPrediction {
  eventId: string;
  releaseAt: string;
  savedAt: string;
  pick: EventPick;
  value?: number;
  reference: number;
  referenceKind: 'consensus' | 'previous';
  unit: string;
}
export function predictionReference(event: MarketEvent) {
  if (Number.isFinite(event.consensus)) return { value: event.consensus!, kind: 'consensus' as const };
  if (Number.isFinite(event.previous)) return { value: event.previous!, kind: 'previous' as const };
  return undefined;
}
export function predictionOpen(event: MarketEvent, now: string) {
  return event.status === 'scheduled' && event.actual === undefined && !event.report && Date.parse(event.at) > Date.parse(now);
}
export function predictionResult(prediction: EventPrediction, event: MarketEvent) {
  // Only compare the same release and measurement, using the saved reference.
  if (prediction.eventId !== event.id || prediction.releaseAt !== event.at || prediction.unit !== event.unit || event.status !== 'confirmed' || !Number.isFinite(event.actual)) return undefined;
  const difference = event.actual! - prediction.reference;
  const actual: EventPick = Math.abs(difference) < 1e-8 ? 'equal' : difference > 0 ? 'higher' : 'lower';
  return { actual, matched: actual === prediction.pick, value: event.actual! };
}
