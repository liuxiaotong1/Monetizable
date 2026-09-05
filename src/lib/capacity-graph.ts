import type { AnalysisResult, CapacityEdge, CapacityGraph, CapacityNode, CapacityNodeType, NormalizedProfile, SkillCombination, SkillGraph, UserContext } from "@/lib/types";
import { isCapabilityLabel } from "@/lib/capability-label";

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function nodeKey(type: CapacityNodeType, label: string) {
  return `${type}:${clean(label).toLowerCase()}`;
}

function evidenceFor(label: string, profile: NormalizedProfile, combinations: SkillCombination[]) {
  const needle = label.toLowerCase();
  const direct = profile.rawEvidence
    .map((item) => clean(item.text))
    .filter((text) => text.toLowerCase().includes(needle))
    .map((text) => text.slice(0, 240));
  const combinationEvidence = combinations
    .filter((combination) => combination.elements.some((element) => element.toLowerCase() === needle))
    .flatMap((combination) => combination.evidence.map(clean));
  return [...new Set([...direct, ...combinationEvidence])].slice(0, 3);
}

export function buildCapacityGraph(input: {
  skillGraph: SkillGraph;
  combinations: SkillCombination[];
  profile: NormalizedProfile;
  context: UserContext;
  updatedAt?: string;
}): CapacityGraph {
  const { skillGraph, profile, context } = input;
  const combinations = input.combinations
    .map((combination) => ({ ...combination, elements: combination.elements.filter(isCapabilityLabel) }))
    .filter((combination) => combination.elements.length >= 2);
  const nodes = new Map<string, CapacityNode>();
  const edges = new Map<string, CapacityEdge>();

  function addNode(type: CapacityNodeType, rawLabel: string, suppliedEvidence: string[] = []) {
    const label = clean(rawLabel);
    if (!isCapabilityLabel(label)) return undefined;
    const evidence = [...new Set([...suppliedEvidence.map(clean), ...evidenceFor(label, profile, combinations)])].filter(Boolean).slice(0, 3);
    if (!evidence.length && type !== "constraint") return undefined;
    const key = nodeKey(type, label);
    const existing = nodes.get(key);
    if (existing) {
      existing.evidence = [...new Set([...existing.evidence, ...evidence])].slice(0, 3);
      return existing.id;
    }
    const id = `capacity-${nodes.size + 1}`;
    nodes.set(key, { id, type, label, evidence: evidence.length ? evidence : [`User preference: ${label}`], confidence: evidence.length > 1 ? "high" : "medium" });
    return id;
  }

  function existingNodeId(rawLabel: string) {
    const label = clean(rawLabel).toLowerCase();
    return [...nodes.entries()].find(([key]) => key.endsWith(`:${label}`))?.[1].id;
  }

  const groups: Array<[CapacityNodeType, string[]]> = [
    ["skill", [...skillGraph.hardSkills, ...skillGraph.commercialSkills, ...skillGraph.creativeAbilities, ...skillGraph.salesAbilities, ...skillGraph.operationalAbilities]],
    ["domain", skillGraph.domainExpertise],
    ["industry", skillGraph.industries],
    ["language", skillGraph.languages],
    ["tool", skillGraph.tools],
    ["experience", skillGraph.roles],
    ["strength", skillGraph.strengths ?? []],
    ["interest", skillGraph.interests ?? []],
  ];
  groups.forEach(([type, values]) => values.forEach((value) => addNode(type, value)));
  [context.country, context.city, context.workMode.replaceAll("_", " "), context.exclusions].filter(Boolean).forEach((value) => addNode("constraint", value as string));

  combinations.forEach((combination, combinationIndex) => {
    const ids = combination.elements.map((element) => existingNodeId(element) ?? addNode("skill", element, combination.evidence)).filter(Boolean) as string[];
    for (let index = 0; index < ids.length; index += 1) {
      for (let next = index + 1; next < ids.length; next += 1) {
        const source = ids[index];
        const target = ids[next];
        const edge: CapacityEdge = {
          source,
          target,
          type: combination.alreadyPerformedTogether ? "demonstrated_together" : "complementary",
          combinationIndex,
        };
        edges.set(`${source}:${target}:${edge.type}`, edge);
      }
    }
  });

  return {
    version: 1,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    combinations,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export function ensureCapacityGraph(result: AnalysisResult): AnalysisResult {
  const skillGraph = Object.fromEntries(Object.entries(result.skillGraph).map(([key, value]) => [
    key,
    Array.isArray(value) ? value.filter((item) => typeof item !== "string" || isCapabilityLabel(item)) : value,
  ])) as unknown as SkillGraph;
  const combinations = result.combinations
    .map((combination) => ({ ...combination, elements: combination.elements.filter(isCapabilityLabel) }))
    .filter((combination) => combination.elements.length >= 2);
  const sanitizedResult = { ...result, skillGraph, combinations };
  const rebuilt = buildCapacityGraph(sanitizedResult);
  if (!result.capacityGraph) return { ...sanitizedResult, capacityGraph: rebuilt };
  const allowedIds = new Set(result.capacityGraph.nodes.filter((node) => isCapabilityLabel(node.label)).map((node) => node.id));
  const existing: CapacityGraph = {
    ...result.capacityGraph,
    nodes: result.capacityGraph.nodes.filter((node) => allowedIds.has(node.id)),
    edges: result.capacityGraph.edges.filter((edge) => allowedIds.has(edge.source) && allowedIds.has(edge.target)),
    combinations: result.capacityGraph.combinations
      .map((combination) => ({ ...combination, elements: combination.elements.filter(isCapabilityLabel) }))
      .filter((combination) => combination.elements.length >= 2),
  };
  const uniqueLabels = (graph: CapacityGraph) => new Set(graph.nodes.map((node) => clean(node.label).toLowerCase())).size;
  // Some historical analyses persisted an incomplete model-produced graph.
  // Always rebuild from the full normalized analysis and use the richer,
  // evidence-backed projection so analysis and Agent intent selection agree.
  const graph = uniqueLabels(rebuilt) >= uniqueLabels(existing)
    ? rebuilt
    : { ...existing, updatedAt: existing.updatedAt || rebuilt.updatedAt };
  return { ...sanitizedResult, capacityGraph: graph };
}
