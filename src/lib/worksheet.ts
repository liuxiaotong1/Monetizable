import type { Locale } from "@/lib/i18n";

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

export function positioningHypothesis({ stack, buyer, problem, outcome }: { stack: string[]; buyer: string; problem: string; outcome: string }, locale: Locale = "en") {
  const fr = locale === "fr";
  const combination = stack.length ? stack.join(" + ") : (fr ? "[vos compétences les mieux étayées]" : "[your strongest evidence-backed skills]");
  const audience = buyer.trim() || (fr ? "[un acheteur défini]" : "[a defined buyer]");
  const pain = problem.trim() || (fr ? "[un problème coûteux ou récurrent]" : "[a costly or recurring problem]");
  const result = outcome.trim() || (fr ? "[un résultat mesurable]" : "[a measurable outcome]");
  if (fr) return `Je combine ${combination} pour aider ${audience} à résoudre ${pain} et à obtenir ${result}.`;
  return `I combine ${combination} to help ${audience} solve ${pain} and achieve ${result}.`;
}

export function worksheetSummary({ evidence, domain, execution, people, tools, positioning }: {
  evidence: WorksheetEvidence[];
  domain: string;
  execution: string;
  people: string;
  tools: string;
  positioning: string;
}, locale: Locale = "en") {
  const fr = locale === "fr";
  const completed = evidence.filter((row) => row.situation.trim() || row.action.trim() || row.result.trim());
  return [
    fr ? "MONETIZABLE — PREUVES DE COMPÉTENCES" : "MONETIZABLE — SKILL EVIDENCE WORKSHEET",
    "",
    ...completed.flatMap((row, index) => [
      `${fr ? "Preuve" : "Evidence"} ${index + 1}`,
      `${fr ? "Situation" : "Situation"}: ${row.situation || "—"}`,
      `${fr ? "Action" : "Action"}: ${row.action || "—"}`,
      `${fr ? "Résultat" : "Result"}: ${row.result || "—"}`,
      "",
    ]),
    `${fr ? "Connaissances métier" : "Domain knowledge"}: ${domain || "—"}`,
    `${fr ? "Compétences opérationnelles" : "Execution skills"}: ${execution || "—"}`,
    `${fr ? "Compétences relationnelles" : "People skills"}: ${people || "—"}`,
    `${fr ? "Outils et méthodes" : "Tools and methods"}: ${tools || "—"}`,
    "",
    `${fr ? "Hypothèse de positionnement" : "Positioning hypothesis"}: ${positioning}`,
    "",
    fr ? "Prochaine étape : vérifiez l’acheteur, le problème, les preuves et la volonté de payer avant de prendre une décision importante." : "Next step: verify the buyer, problem, evidence, and willingness to pay before making a major decision.",
  ].join("\n");
}
