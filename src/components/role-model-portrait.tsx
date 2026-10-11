"use client";
import { Localized } from "@/components/localized";


import Image from "next/image";
import { useState } from "react";
import type { CareerProspect } from "@/lib/types";

export function RoleModelPortrait({ prospect }: { prospect: CareerProspect }) {
  const fallback = `/api/role-model/portrait?title=${encodeURIComponent(prospect.wikipediaTitle || prospect.name)}`;
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const source = [prospect.imageUrl, fallback].find((url): url is string => Boolean(url) && !failedSources.includes(url!));
  const className = "h-24 w-24 shrink-0 rounded-full border-2 border-[var(--gold)] object-cover object-[center_18%] shadow-lg md:h-32 md:w-32";

  if (!source) return <Localized><span role="img" aria-label={prospect.name} className={`${className} flex items-center justify-center bg-[var(--gold-soft)] text-2xl font-bold text-[var(--gold-deep)]`}>
    {prospect.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}
  </span></Localized>;

  return <Localized><Image key={source} src={source} alt={`${prospect.name} portrait`} width={128} height={128} unoptimized className={className}
    onError={() => setFailedSources((failed) => [...failed, source])} /></Localized>;
}
