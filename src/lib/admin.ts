import { supabaseRest } from "@/lib/storage";

// Always read trusted server-side state; never trust browser/user metadata.
export async function isAccountAdmin(userId: string): Promise<boolean> {
  return await supabaseRest("rpc/account_is_admin", {
    method: "POST", body: JSON.stringify({ p_user: userId }),
  }) === true;
}
