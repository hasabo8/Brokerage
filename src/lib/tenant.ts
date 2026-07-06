import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Resolve the current user's primary tenant id. Most inserts don't need this
 * (the DB trigger stamps tenant_id automatically), but it's handy for reads
 * and for building agent context.
 */
export async function getCurrentTenantId(
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.tenant_id;
}
