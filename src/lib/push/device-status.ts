export type ReminderPermission = "default" | "granted" | "denied" | "unsupported";
export type ReminderDeviceState = "unsupported" | "blocked" | "signed-out" | "ready" | "account-only" | "off";

/** What the reminders screen should say about this browser, separate from other devices on the account. */
export function reminderDeviceState(input: {
  pushSupported: boolean;
  permission: ReminderPermission;
  signedIn: boolean;
  deviceSubscribed: boolean;
  accountSubscribed: boolean;
}): ReminderDeviceState {
  if (!input.pushSupported || input.permission === "unsupported") return "unsupported";
  if (input.permission === "denied") return "blocked";
  if (!input.signedIn) return "signed-out";
  if (input.deviceSubscribed) return "ready";
  if (input.accountSubscribed) return "account-only";
  return "off";
}
