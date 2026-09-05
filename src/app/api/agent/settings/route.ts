import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { applicationProfileForUser, authorizationForUser, subscriptionForUser, upsertAgentAuthorization, upsertApplicationProfile } from "@/lib/opportunity-agent/storage";

const schema = z.object({
  status: z.enum(["active", "paused", "revoked"]), allowAts: z.boolean(), allowEmail: z.boolean(),
  profile: z.object({ target_roles: z.array(z.string()).max(20), target_locations: z.array(z.string()).max(20), remote_preference: z.string().max(80).optional(), relocation_preference: z.string().max(80).optional(), work_authorization: z.record(z.string(), z.unknown()), contract_types: z.array(z.string()).max(12), available_from: z.string().max(80).optional(), confirmed_answers: z.record(z.string(), z.string()) }),
});

export async function GET() {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [authorization, profile] = await Promise.all([authorizationForUser(user.id), applicationProfileForUser(user.id)]);
  return NextResponse.json({ authorization, profile });
}

export async function PUT(request: NextRequest) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subscription = await subscriptionForUser(user.id); if (!subscription) return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Invalid settings", details: parsed.error.flatten() }, { status: 400 });
  const oldProfile = await applicationProfileForUser(user.id);
  const profile = await upsertApplicationProfile(user.id, { ...parsed.data.profile, confirmed_answers: { ...(oldProfile?.confirmed_answers ?? {}), ...parsed.data.profile.confirmed_answers } });
  const existing = await authorizationForUser(user.id);
  const authorization = await upsertAgentAuthorization({ userId: user.id, candidateProfileId: subscription.candidate_profile_id, status: parsed.data.status, allowAts: false, allowEmail: parsed.data.status === "active" && parsed.data.allowEmail, consentVersion: existing?.consent_version ?? "email-outreach-v1" });
  return NextResponse.json({ authorization, profile });
}
