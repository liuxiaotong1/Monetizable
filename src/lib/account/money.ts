// Stripe charge amounts use currency minor units. ISK and UGX remain two-decimal API representations.
// https://docs.stripe.com/currencies#zero-decimal
const zeroDecimal = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);
export function stripeAmount(amount: number, currency: string) {
  return amount / (zeroDecimal.has(currency.toLowerCase()) ? 1 : 100);
}
