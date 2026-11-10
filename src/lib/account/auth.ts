import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import { isAdmin } from "./policy";
import { supabasePublicKey, supabasePublicUrl, supabaseServiceRoleKey } from "./supabase-env";
export { ADMIN_EMAIL, isAdmin, sameOrigin } from "./policy";
export const APP_URL = "https://getmonetizable.com";
export function publicAuthConfig() {
  const url = supabasePublicUrl(),
    key = supabasePublicKey();
  return url && key ? { url, key } : null;
}
export async function authClient() {
  const config = publicAuthConfig();
  if (!config) return null;
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          for (const v of values) jar.set(v.name, v.value, v.options);
        } catch {
          /* Proxy refreshes cookies for Server Components. */
        }
      },
    },
  });
}
export function authAdmin() {
  const url = supabasePublicUrl(),
    key = supabaseServiceRoleKey();
  return url && key
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
}
export const currentUser = cache(async () => {
  const jar = await cookies();
  if (!jar.getAll().some((cookie) => cookie.name.includes("auth-token"))) return null;
  const client = await authClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
});
export async function administrator() {
  const user = await currentUser();
  return isAdmin(user) ? user : null;
}
