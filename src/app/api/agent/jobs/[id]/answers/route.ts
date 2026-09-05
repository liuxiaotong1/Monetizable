import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { agentJobForUser, mergeConfirmedAnswers, requeueAnsweredAgentJob } from "@/lib/opportunity-agent/storage";

const schema = z.object({ answers: z.record(z.string().min(1), z.string().trim().min(1).max(2_000)) });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Every requested fact needs an answer" }, { status: 400 });
  const job = await agentJobForUser(user.id, id);
  if (!job || job.status !== "awaiting_user_answer") return NextResponse.json({ error: "Question is no longer pending" }, { status: 404 });
  const requested = new Set((job.required_answers ?? []).map((item: { key?: string }) => item.key).filter(Boolean));
  const answers = Object.fromEntries(Object.entries(parsed.data.answers).filter(([key]) => requested.has(key)));
  if (!Object.keys(answers).length) return NextResponse.json({ error: "No requested facts were supplied" }, { status: 400 });
  await mergeConfirmedAnswers(user.id, answers);
  const queued = await requeueAnsweredAgentJob(user.id, id);
  return NextResponse.json({ queued: Boolean(queued) });
}
