import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function currentUser() {
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user;
}
