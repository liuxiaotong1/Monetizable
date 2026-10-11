import type { CapacityGraph, CapacityNodeType } from "@/lib/types";
import { isCapabilityLabel } from "@/lib/capability-label";

export interface AgentIntentOption {
  label: string;
  capabilities: string[];
  combinationIndex?: number;
}

const normalize = (value: string) => value.trim().toLocaleLowerCase();
const keyFor = (values: string[]) => [...new Set(values.map(normalize).filter(Boolean))].sort().join("|");

const COMMERCIAL_NODE_PRIORITY: CapacityNodeType[] = ["domain", "skill", "strength", "industry", "tool", "experience", "interest", "language", "constraint"];

export function expandCustomIntent(graph: CapacityGraph, capabilities: string[], limit = 3) {
  const selected = [...new Set(capabilities.map((value) => value.trim()).filter(isCapabilityLabel))].slice(0, limit);
  if (selected.length >= limit) return selected;
  const selectedKeys = new Set(selected.map(normalize));
  const selectedTypes = new Set(graph.nodes.filter((node) => selectedKeys.has(normalize(node.label))).map((node) => node.type));
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const connected = new Map<string, number>();
  for (const edge of graph.edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) continue;
    if (selectedKeys.has(normalize(source.label))) connected.set(normalize(target.label), (connected.get(normalize(target.label)) ?? 0) + 8);
    if (selectedKeys.has(normalize(target.label))) connected.set(normalize(source.label), (connected.get(normalize(source.label)) ?? 0) + 8);
  }
  for (const combination of graph.combinations) {
    if (!combination.elements.some((element) => selectedKeys.has(normalize(element)))) continue;
    for (const element of combination.elements) connected.set(normalize(element), (connected.get(normalize(element)) ?? 0) + 12);
  }
  const candidates = graph.nodes
    .filter((node) => node.type !== "constraint" && node.evidence.length > 0 && isCapabilityLabel(node.label) && !selectedKeys.has(normalize(node.label)))
    .sort((left, right) => {
      const commercialBoost = (label: string) => selectedTypes.has("language") && /marketing|content|communication|localization|translation|market expansion|business development|sales/i.test(label) ? 7 : 0;
      const leftScore = (connected.get(normalize(left.label)) ?? 0) + left.evidence.length * 2 + commercialBoost(left.label) - COMMERCIAL_NODE_PRIORITY.indexOf(left.type);
      const rightScore = (connected.get(normalize(right.label)) ?? 0) + right.evidence.length * 2 + commercialBoost(right.label) - COMMERCIAL_NODE_PRIORITY.indexOf(right.type);
      return rightScore - leftScore || left.label.localeCompare(right.label);
    });
  for (const node of candidates) {
    if (selected.length >= limit) break;
    if (node.type === "language" && selected.some((label) => graph.nodes.find((item) => normalize(item.label) === normalize(label))?.type === "language")) continue;
    selected.push(node.label);
    selectedKeys.add(normalize(node.label));
  }
  return selected;
}

export function suggestedAgentIntents(graph: CapacityGraph, limit = 3): AgentIntentOption[] {
  const seen = new Set<string>();
  const options: AgentIntentOption[] = [];
  graph.combinations.forEach((combination, combinationIndex) => {
    const capabilities = [...new Set(combination.elements.map((value) => value.trim()).filter(isCapabilityLabel))];
    const key = keyFor(capabilities);
    if (!key || seen.has(key) || capabilities.length < 2) return;
    seen.add(key);
    options.push({ label: capabilities.join(" × "), capabilities, combinationIndex });
  });

  const priority: CapacityNodeType[] = ["interest", "strength", "domain", "skill", "language", "tool", "industry", "experience", "constraint"];
  const candidates = [...graph.nodes]
    .filter((node) => node.type !== "constraint" && node.evidence.length > 0 && isCapabilityLabel(node.label))
    .sort((a, b) => priority.indexOf(a.type) - priority.indexOf(b.type) || b.evidence.length - a.evidence.length);

  const evidencedInterest = candidates.find((node) => node.type === "interest");
  const interestAlreadyRepresented = evidencedInterest
    ? options.some((option) => option.capabilities.some((value) => normalize(value) === normalize(evidencedInterest.label)))
    : true;
  if (evidencedInterest && !interestAlreadyRepresented) {
    const partner = candidates.find((node) => node.id !== evidencedInterest.id && ["skill", "domain", "strength", "industry", "language", "tool"].includes(node.type));
    if (partner) {
      const capabilities = [partner.label, evidencedInterest.label];
      const key = keyFor(capabilities);
      if (!seen.has(key)) {
        seen.add(key);
        const insertAt = Math.min(2, options.length);
        options.splice(insertAt, options.length >= limit ? 1 : 0, { label: capabilities.join(" × "), capabilities });
      }
    }
  }

  for (let anchorIndex = 0; anchorIndex < candidates.length && options.length < limit; anchorIndex += 1) {
    const anchor = candidates[anchorIndex];
    const partner = candidates.find((node, index) => index !== anchorIndex && node.type !== anchor.type);
    if (!partner) continue;
    const capabilities = [anchor.label, partner.label];
    const key = keyFor(capabilities);
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ label: capabilities.join(" × "), capabilities });
  }
  return options.slice(0, limit);
}

export function validCustomIntent(graph: CapacityGraph, capabilities: string[]) {
  const allowed = new Map(graph.nodes.filter((node) => node.type !== "constraint" && isCapabilityLabel(node.label)).map((node) => [normalize(node.label), node.label]));
  graph.combinations.forEach((combination) => combination.elements.forEach((label) => {
    const key = normalize(label);
    if (key && isCapabilityLabel(label) && combination.evidence.length && !allowed.has(key)) allowed.set(key, label.trim());
  }));
  // Reject an invalid selection instead of silently dropping one of its skills.
  if (capabilities.some(value => !allowed.has(normalize(value)))) return null;
  const values = [...new Set(capabilities.map((value) => allowed.get(normalize(value))!))];
  return values.length >= 1 && values.length <= 3 ? values : null;
}
