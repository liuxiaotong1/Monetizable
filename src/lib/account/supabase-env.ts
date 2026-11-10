/**
 * Supabase and Postgres configuration.
 *
 * The Vercel Supabase integration owns the unsuffixed variables, so each
 * value prefers its MZ_ name when that value is set and non-empty.
 * NEXT_PUBLIC_* names stay as static property access so Next.js inlines
 * them at build time. With no MZ_ values set, these return the same
 * strings the call sites used to read directly.
 */
function prefer(override: string | undefined, current: string | undefined) {
  return override ? override : current;
}

export function supabasePublicUrl() {
  return prefer(
    process.env.NEXT_PUBLIC_MZ_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

/** Publishable key wins over the anon key, matching the previous order. */
export function supabasePublicKey() {
  return (
    prefer(
      process.env.NEXT_PUBLIC_MZ_SUPABASE_PUBLISHABLE_KEY,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ) ||
    prefer(
      process.env.NEXT_PUBLIC_MZ_SUPABASE_ANON_KEY,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
  );
}

export function supabaseServiceRoleKey() {
  return prefer(
    process.env.MZ_SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function postgresUrl() {
  return prefer(process.env.MZ_POSTGRES_URL, process.env.POSTGRES_URL);
}
