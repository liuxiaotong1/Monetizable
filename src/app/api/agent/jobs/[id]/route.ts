import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { recoverStaleAgentJobForUser } from "@/lib/opportunity-agent/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const job = await recoverStaleAgentJobForUser(user.id, id);
  if (!job) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ job: { id: job.id, status: job.status, required_answers: job.required_answers ?? [], error_code: job.error_code, error_message: job.error_message } });
}
