import { AppFrame } from "@/components/site/app-frame";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
