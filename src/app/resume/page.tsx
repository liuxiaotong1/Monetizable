
import { Localized } from "@/components/localized";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { ResumeUpload } from "@/components/resume-upload";
export default async function ResumePage() {
  if(!await currentUser()) redirect("/auth?next=/resume");
  return <Localized><main><ResumeUpload/></main></Localized>;
}
