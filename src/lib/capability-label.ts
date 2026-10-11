const NON_CAPABILITY_PLATFORM = /^(?:linkedin(?:\s+networking)?|indeed|glassdoor|jooble|monster|ziprecruiter|fiverr|upwork)$/i;
// Institutions and credentials are evidence, not transferable capabilities.
const NON_CAPABILITY_ENTITY = /(?:\b(?:university|college|institute|school)\s+of\b|\b(?:university|college|academy|incorporated|ltd|llc)\.?$|^(?:education|employer|company|name|email|address)\s*:|\b(?:université|universidad|universität)\b|大学|学院|有限公司|^(?:bachelor|master|doctor)(?:'s)?\s+(?:of|degree)\b|^(?:mba|ph\.?d\.?|b\.?sc\.?|m\.?sc\.?)$|https?:\/\/|\S+@\S+\.\S+)/i;

export function isCapabilityLabel(value: string) {
  const label = value.replace(/\s+/g, " ").trim();
  return Boolean(label) && !NON_CAPABILITY_PLATFORM.test(label) && !NON_CAPABILITY_ENTITY.test(label) && !/\buniversit[éä]/i.test(label);
}
