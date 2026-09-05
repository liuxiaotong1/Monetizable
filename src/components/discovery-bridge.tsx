"use client";

import { useEffect } from "react";
import { discoveryAttribution, rememberDiscoveryAttribution } from "@/lib/client-analytics";

export function DiscoveryBridge() {
  useEffect(() => {
    rememberDiscoveryAttribution(
      discoveryAttribution(window.location.href, document.referrer),
      window.sessionStorage,
    );
  }, []);

  return null;
}

