export type WorksheetEvidence = {
  situation: string;
  action: string;
  result: string;
};

export function skillStackFromLayers(layers: string[], limit = 8) {
  const seen = new Set<string>();
  const stack: string[] = [];
  for (const value of layers) {
    for (const item of value.split(/[,;\n]/).map((part) => part.trim()).filter(Boolean)) {
      const normalized = item.toLocaleLowerCase("en");
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      stack.push(item);
      if (stack.length === limit) return stack;
    }
  }
  return stack;
}

export function positioningHypothesis({ stack, buyer, problem, outcome }: { stack: string[]; buyer: string; problem: string; outcome: string }) {
  const combination = stack.length ? stack.join(" + ") : "[your strongest evidence-backed skills]";
  const audience = buyer.trim() || "[a defined buyer]";
  const pain = problem.trim() || "[a costly or recurring problem]";
  const result = outcome.trim() || "[a measurable outcome]";
  return `I combine ${combination} to help ${audience} solve ${pain} and achieve ${result}.`;
}

export function worksheetSummary({ evidence, domain, execution, people, tools, positioning }: {
  evidence: WorksheetEvidence[];
  domain: string;
  execution: string;
  people: string;
  tools: string;
  positioning: string;
}) {
  const completed = evidence.filter((row) => row.situation.trim() || row.action.trim() || row.result.trim());
  return [
    "MONETIZABLE — SKILL EVIDENCE WORKSHEET",
    "",
    ...completed.flatMap((row, index) => [
      `Evidence ${index + 1}`,
      `Situation: ${row.situation || "—"}`,
      `Action: ${row.action || "—"}`,
      `Result: ${row.result || "—"}`,
      "",
    ]),
    `Domain knowledge: ${domain || "—"}`,
    `Execution skills: ${execution || "—"}`,
    `People skills: ${people || "—"}`,
    `Tools and methods: ${tools || "—"}`,
    "",
    `Positioning hypothesis: ${positioning}`,
    "",
    "Next step: verify the buyer, problem, evidence, and willingness to pay before making a major decision.",
  ].join("\n");
}
