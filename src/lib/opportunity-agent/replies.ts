export async function classifyReply(text: string): Promise<{ classification: "positive" | "neutral" | "negative"; confidenceLabel: "high" | "medium" | "low" }> {
  const normalized = text.toLowerCase();
  const deterministic = /unsubscribe|remove me|not interested|do not contact|stop emailing/.test(normalized) ? "negative" as const : /interested|let'?s talk|schedule|availability|next step|book a call/.test(normalized) ? "positive" as const : null;
  if (deterministic) return { classification: deterministic, confidenceLabel: "high" };
  if (!process.env.OPENAI_API_KEY) return { classification: "neutral", confidenceLabel: "low" };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_REPLY_MODEL ?? "gpt-4.1-mini", input: `Classify this reply to professional outreach. Positive means concrete interest or a next step. Negative includes rejection or opt-out. Otherwise neutral. Do not infer beyond the text.\nReply:${text.slice(0, 4000)}`, max_output_tokens: 120, text: { format: { type: "json_schema", name: "reply_signal", strict: true, schema: { type: "object", additionalProperties: false, required: ["classification", "confidenceLabel"], properties: { classification: { type: "string", enum: ["positive", "neutral", "negative"] }, confidenceLabel: { type: "string", enum: ["high", "medium", "low"] } } } } } }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return { classification: "neutral", confidenceLabel: "low" };
  const data = await response.json();
  try {
    const outputText = data.output_text ?? data.output?.flatMap((item: { content?: { text?: string }[] }) => item.content ?? []).find((item: { text?: string }) => item.text)?.text;
    const parsed = JSON.parse(outputText);
    if (!["positive", "neutral", "negative"].includes(parsed.classification) || !["high", "medium", "low"].includes(parsed.confidenceLabel)) throw new Error("Invalid reply classification");
    return parsed as { classification: "positive" | "neutral" | "negative"; confidenceLabel: "high" | "medium" | "low" };
  } catch { return { classification: "neutral", confidenceLabel: "low" }; }
}
