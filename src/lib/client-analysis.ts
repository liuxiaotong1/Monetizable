export interface AnalysisApiPayload {
  preview?: { analysisId?: string } & Record<string, unknown>;
  recoveryToken?: string;
  error?: string;
  code?: string;
  details?: {
    cityRequired?: boolean;
    serviceName?: string;
    profile?: { rawEvidence?: unknown[] };
  } & Record<string, unknown>;
}

export interface AnalysisApiResponse {
  ok: boolean;
  status: number;
  data: AnalysisApiPayload;
}

type FetchLike = typeof fetch;

const transientStatuses = new Set([502, 503, 504]);
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function readJson(response: Response): Promise<AnalysisApiPayload> {
  const body = await response.text();
  if (!body) return {};
  try {
    return JSON.parse(body) as AnalysisApiPayload;
  } catch {
    return { error: response.ok ? "The analysis returned an unreadable response." : `Analysis request failed (${response.status}).` };
  }
}

async function recoverCompletedAnalysis(requestId: string, fetchImpl: FetchLike) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await wait(2_000);
    try {
      const response = await fetchImpl(`/api/analysis/${encodeURIComponent(requestId)}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (response.ok) return { ok: true, status: response.status, data: await readJson(response) } satisfies AnalysisApiResponse;
      if (response.status !== 404) return null;
    } catch {
      // The connection may still be recovering. Continue the bounded poll.
    }
  }
  return null;
}

export async function submitAnalysis(form: FormData, fetchImpl: FetchLike = fetch): Promise<AnalysisApiResponse> {
  const existingRequestId = String(form.get("requestId") ?? "");
  const requestId = /^[0-9a-f-]{36}$/i.test(existingRequestId) ? existingRequestId : crypto.randomUUID();
  form.set("requestId", requestId);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await fetchImpl("/api/analyze", {
        method: "POST",
        body: form,
        cache: "no-store",
        credentials: "same-origin",
      });
      if (transientStatuses.has(response.status) && attempt === 0) {
        const recovered = await recoverCompletedAnalysis(requestId, fetchImpl);
        if (recovered) return recovered;
        continue;
      }
      return { ok: response.ok, status: response.status, data: await readJson(response) };
    } catch (error) {
      if (attempt === 0) {
        if (Date.now() - startedAt > 3_000) {
          const recovered = await recoverCompletedAnalysis(requestId, fetchImpl);
          if (recovered) return recovered;
        } else {
          await wait(700);
        }
        continue;
      }
      throw new Error("The connection was interrupted while the analysis was running. Please try again.", { cause: error });
    }
  }

  throw new Error("The analysis service is temporarily unavailable. Please try again.");
}
