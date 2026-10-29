export function installedApp() {
  if (typeof window === "undefined") return false;
  const ios = navigator as Navigator & { standalone?: boolean };
  return Boolean(ios.standalone || window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches);
}
export function deviceTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris"; } catch { return "Europe/Paris"; }
}
export function decodeVapidKey(value: string) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
export const openPushCard = () => window.dispatchEvent(new Event("monetizable-open-push"));
