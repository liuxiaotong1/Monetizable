const NON_CAPABILITY_PLATFORM = /^(?:linkedin(?:\s+networking)?|indeed|glassdoor|jooble|monster|ziprecruiter|fiverr|upwork)$/i;

export function isCapabilityLabel(value: string) {
  const label = value.replace(/\s+/g, " ").trim();
  return Boolean(label) && !NON_CAPABILITY_PLATFORM.test(label);
}
