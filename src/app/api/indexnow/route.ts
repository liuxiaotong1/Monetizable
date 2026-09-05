import { groupIndexNowUrls } from "@/lib/indexnow";

export async function POST(request: Request) {
  const secret = process.env.INDEXNOW_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.INDEXNOW_KEY;
  if (!key) return Response.json({ error: "IndexNow is not configured" }, { status: 503 });

  try {
    const body = await request.json() as { urls?: unknown };
    const groups = groupIndexNowUrls(body.urls);
    const responses = await Promise.all([...groups].map(async ([host, urlList]) => {
      const response = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host, key, keyLocation: `https://${host}/indexnow-key.txt`, urlList }),
      });
      return { host, status: response.status, submitted: urlList.length };
    }));

    const accepted = responses.every(({ status }) => status >= 200 && status < 300);
    return Response.json({ accepted, responses }, { status: accepted ? 200 : 502 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
