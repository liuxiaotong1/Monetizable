import type {
  CapacityEdge,
  CapacityGraph,
  CapacityNode,
  CapacityNodeType,
  DemandLevel,
  SkillCombination,
} from "@/lib/types";

export interface CapacitySceneNode extends CapacityNode {
  value: number;
  importance: number;
  combinationIndexes: number[];
  x?: number;
  y?: number;
  z?: number;
}

export type CapacitySceneLink = Omit<CapacityEdge, "source" | "target"> & {
  source: string | CapacitySceneNode;
  target: string | CapacitySceneNode;
};

export interface CapacitySceneData {
  nodes: CapacitySceneNode[];
  links: CapacitySceneLink[];
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

function combinationIndexes(
  node: CapacityNode,
  combinations: SkillCombination[],
) {
  const label = normalized(node.label);
  return combinations.flatMap((combination, index) =>
    combination.elements.some((element) => normalized(element) === label)
      ? [index]
      : [],
  );
}

export function projectCapacityGraph(
  graph: CapacityGraph,
  maxNodes = 60,
): CapacitySceneData {
  const canonicalByLabel = new Map<string, CapacityNode>();
  const canonicalIdByOriginalId = new Map<string, string>();
  graph.nodes.forEach((node) => {
    const key = normalized(node.label);
    const existing = canonicalByLabel.get(key);
    if (!existing) {
      const canonical = { ...node, evidence: [...new Set(node.evidence)] };
      canonicalByLabel.set(key, canonical);
      canonicalIdByOriginalId.set(node.id, canonical.id);
      return;
    }
    canonicalIdByOriginalId.set(node.id, existing.id);
    existing.evidence = [...new Set([...existing.evidence, ...node.evidence])];
    if (
      node.confidence === "high" ||
      (node.confidence === "medium" && existing.confidence === "low")
    ) {
      existing.confidence = node.confidence;
    }
  });

  const ranked = [...canonicalByLabel.values()]
    .map((node) => {
      const indexes = combinationIndexes(node, graph.combinations);
      const importance =
        node.evidence.length * 2 +
        (node.confidence === "high" ? 3 : 1) +
        indexes.length * 4;
      return {
        ...node,
        combinationIndexes: indexes,
        importance,
        value: Math.max(
          2,
          Math.min(
            12,
            2 +
              node.evidence.length +
              indexes.length * 2 +
              (node.confidence === "high" ? 1 : 0),
          ),
        ),
      } satisfies CapacitySceneNode;
    })
    .sort(
      (left, right) =>
        right.importance - left.importance ||
        left.label.localeCompare(right.label),
    );

  const visibleNodes = ranked.slice(0, Math.max(1, maxNodes));
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const typePhase: Record<CapacityNodeType, number> = {
    skill: 0,
    domain: 0.3,
    industry: 0.65,
    language: 0.95,
    tool: 1.25,
    experience: 1.55,
    strength: 1.85,
    interest: 2.15,
    constraint: 2.45,
  };
  const nodes = visibleNodes.map((node, index) => {
    const progress =
      visibleNodes.length <= 1 ? 0 : index / (visibleNodes.length - 1);
    const radius = 12 + Math.sqrt(progress) * 112;
    const angle = index * goldenAngle + typePhase[node.type];
    return {
      ...node,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.58,
      z: Math.sin(angle * 1.7) * (10 + progress * 28),
    };
  });
  const included = new Set(nodes.map((node) => node.id));
  const uniqueLinks = new Map<string, CapacitySceneLink>();
  graph.edges.forEach((edge) => {
    const source = canonicalIdByOriginalId.get(edge.source) ?? edge.source;
    const target = canonicalIdByOriginalId.get(edge.target) ?? edge.target;
    if (source === target || !included.has(source) || !included.has(target))
      return;
    const pair = [source, target].sort().join(":");
    const key = `${pair}:${edge.type}:${edge.combinationIndex ?? ""}`;
    if (!uniqueLinks.has(key))
      uniqueLinks.set(key, { ...edge, source, target });
  });
  const links = [...uniqueLinks.values()];

  return { nodes, links };
}

const demoGroups: Array<{ type: CapacityNodeType; labels: string[] }> = [
  {
    type: "skill",
    labels: [
      "Sales",
      "Communication",
      "Negotiation",
      "Persuasion",
      "Storytelling",
      "Copywriting",
    ],
  },
  {
    type: "domain",
    labels: [
      "Data Analysis",
      "Financial Analysis",
      "Market Research",
      "User Research",
      "Audience Strategy",
    ],
  },
  { type: "tool", labels: ["Excel", "SQL", "CRM", "AI", "Automation"] },
  {
    type: "industry",
    labels: [
      "SaaS",
      "Fintech",
      "Product Knowledge",
      "Customer Success",
      "User Onboarding",
    ],
  },
  {
    type: "strength",
    labels: [
      "Marketing",
      "Growth Hacking",
      "Brand Strategy",
      "Content Strategy",
      "Paid Ads",
    ],
  },
  {
    type: "experience",
    labels: [
      "Operations",
      "Project Management",
      "Process Optimization",
      "Stakeholder Management",
    ],
  },
  {
    type: "language",
    labels: ["Spanish", "French", "Mandarin", "Localization"],
  },
];

function demoCombination(
  elements: string[],
  demandLevel: DemandLevel,
  differentiation: string,
  noveltyReason: string,
): SkillCombination {
  return {
    elements,
    evidence: elements.map((element) => `Demonstrated capacity in ${element}`),
    differentiation,
    alreadyPerformedTogether: false,
    noveltyReason,
    careerProspect: {
      name: "Illustrative path",
      roleModelTitle: "Evidence-led capacity combination",
      wikipediaTitle: "",
      whatTheyBuilt: differentiation,
      whyRelevant: noveltyReason,
      whatTheyDidDifferently:
        "Combined complementary capabilities into one focused commercial offer.",
      stealThisMove:
        "Lead with the combination rather than selling each capability separately.",
    },
    demandLevel,
    services: [],
  };
}

const demoCombinations = [
  demoCombination(
    ["Sales", "SaaS", "Marketing"],
    "High",
    "A cross-functional growth profile that connects buyer insight, software products, and market activation.",
    "Package these capacities as a focused go-to-market offer for early-stage software teams.",
  ),
  demoCombination(
    ["Data Analysis", "AI", "Operations"],
    "High",
    "Turns operational questions into evidence-backed automation and decision systems.",
    "Package the combination as a two-week AI market and operations research sprint.",
  ),
  demoCombination(
    ["Financial Analysis", "Spanish", "Content Strategy"],
    "High",
    "Blends domain credibility, language access, and audience-ready communication.",
    "Position it as Spanish-language fintech education and localization.",
  ),
  demoCombination(
    ["Mandarin", "Market Research", "Localization"],
    "Medium",
    "Connects cross-border research with the cultural judgment needed to localize a market entry.",
    "Sell an evidence-led China market validation package rather than generic translation.",
  ),
  demoCombination(
    ["Storytelling", "Brand Strategy", "Audience Strategy"],
    "Medium",
    "Connects narrative craft with commercial positioning and audience insight.",
    "Package it as an executive narrative and content system.",
  ),
];

function demoEvidence(label: string) {
  return [
    `Example evidence for ${label}`,
    `${label} appears in a commercially relevant combination`,
  ];
}

export function buildDemoCapacityGraph(): CapacityGraph {
  const nodes = demoGroups.flatMap(({ type, labels }) =>
    labels.map((label, index) => ({
      id: `demo-${type}-${index}`,
      type,
      label,
      evidence: demoEvidence(label),
      confidence: "high" as const,
    })),
  );
  const byLabel = new Map(
    nodes.map((node) => [normalized(node.label), node.id]),
  );
  const edges = new Map<string, CapacityEdge>();

  demoGroups.forEach(({ labels }) => {
    for (let index = 1; index < labels.length; index += 1) {
      const source = byLabel.get(normalized(labels[index - 1]));
      const target = byLabel.get(normalized(labels[index]));
      if (source && target)
        edges.set(`${source}:${target}`, {
          source,
          target,
          type: "complementary",
        });
    }
  });

  demoCombinations.forEach((combination, combinationIndex) => {
    const ids = combination.elements
      .map((element) => byLabel.get(normalized(element)))
      .filter(Boolean) as string[];
    for (let index = 0; index < ids.length; index += 1) {
      for (let next = index + 1; next < ids.length; next += 1) {
        const source = ids[index];
        const target = ids[next];
        edges.set(`${source}:${target}`, {
          source,
          target,
          type: "complementary",
          combinationIndex,
        });
      }
    }
  });

  return {
    version: 1,
    nodes,
    edges: [...edges.values()],
    combinations: demoCombinations,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}
