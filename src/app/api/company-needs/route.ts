import { z } from "zod";
import { createCompanyNeed } from "@/lib/company-needs";
import { COMPANY_ENGAGEMENT_TYPES, COMPANY_EXPERTISE } from "@/lib/company-need-options";

export const dynamic = "force-dynamic";

const schema = z.object({
  need: z.string().trim().min(20).max(3000), successOutcome: z.string().trim().min(10).max(2000),
  expertise: z.array(z.enum(COMPANY_EXPERTISE)).max(COMPANY_EXPERTISE.length), expertiseOther: z.string().trim().max(320).optional().default(""),
  engagementType: z.enum(COMPANY_ENGAGEMENT_TYPES), budgetRange: z.string().trim().min(2).max(160), locationTimezone: z.string().trim().min(2).max(240), workEmail: z.email().max(320), website: z.string().max(0).optional().default(""),
}).refine((value) => value.expertise.length > 0 || value.expertiseOther.length > 1, { path: ["expertise"], message: "Choose or add at least one area of expertise." });

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    return Response.json({ ok: true, ...await createCompanyNeed(payload) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Please check the form." }, { status: 400 });
    console.error("Company need submission failed", error);
    return Response.json({ error: "We could not save this request. Please try again." }, { status: 500 });
  }
}
