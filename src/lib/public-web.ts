import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isSafeExternalUrl } from "@/lib/url";

// Untrusted job/contact pages must not reach internal services, including
// through DNS rebinding or redirects. Pin the validated IPv4 DNS result for
// the connection; keep the original hostname for TLS certificate validation.
export async function publicWebFetch(value: string, options: { headers?: Record<string, string>; redirect?: "manual" | "follow"; timeoutMs?: number } = {}): Promise<Response> {
  let current = value;
  for (let hop = 0; hop <= 4; hop++) {
    if (!isSafeExternalUrl(current)) throw new Error("Unsafe public-page URL");
    const url = new URL(current);
    const addresses = await lookup(url.hostname, { family: 4, all: true });
    if (!addresses.length || addresses.some(({ address }) => !isSafeExternalUrl(`https://${address}`))) throw new Error("Public page resolved to a private address");
    const response = await new Promise<Response>((resolve, reject) => {
      const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
        method: "GET", headers: options.headers,
        signal: AbortSignal.timeout(options.timeoutMs ?? 7000),
        lookup: (_hostname, settings, callback) => {
          if (settings.all) callback(null, addresses);
          else callback(null, addresses[0].address, 4);
        },
      }, (incoming) => {
        const chunks: Buffer[] = []; let size = 0;
        incoming.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2 * 1024 * 1024) { request.destroy(new Error("Public page exceeds size limit")); return; }
          chunks.push(chunk);
        });
        incoming.on("error", reject);
        incoming.on("end", () => {
          const headers = new Headers();
          for (const [key, value] of Object.entries(incoming.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
          const status = incoming.statusCode ?? 502;
          const result = new Response([204, 205, 304].includes(status) ? null : new Uint8Array(Buffer.concat(chunks)), { status, headers });
          Object.defineProperty(result, "url", { value: url.toString() });
          resolve(result);
        });
      });
      request.on("error", reject);
      request.end();
    });
    const location = response.headers.get("location");
    if (options.redirect !== "manual" && [301, 302, 303, 307, 308].includes(response.status) && location) {
      current = new URL(location, current).toString();
      continue;
    }
    return response;
  }
  throw new Error("Too many public-page redirects");
}
