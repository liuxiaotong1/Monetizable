import type { ModelUsage } from "@/lib/opportunity-agent/types";

export async function embedTexts(texts: string[]): Promise<{ embeddings: number[][]; usage: ModelUsage; model: string } | null> {
  if (!texts.length || !process.env.OPENAI_API_KEY) return null;
  const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model, input: texts }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return null;
  const data = await response.json() as { data?: Array<{ index: number; embedding: number[] }>; usage?: { prompt_tokens?: number; total_tokens?: number } };
  const embeddings = [...(data.data ?? [])].sort((a, b) => a.index - b.index).map((item) => item.embedding);
  if (embeddings.length !== texts.length) return null;
  return { embeddings, model, usage: { inputTokens: data.usage?.prompt_tokens ?? data.usage?.total_tokens ?? 0, outputTokens: 0 } };
}

export function cosineSimilarity(a?: number[], b?: number[]) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0; let aa = 0; let bb = 0;
  for (let index = 0; index < a.length; index += 1) { dot += a[index] * b[index]; aa += a[index] ** 2; bb += b[index] ** 2; }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}
