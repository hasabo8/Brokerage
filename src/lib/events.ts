import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Append a behavioural event. Fire-and-forget: never let logging break a
 * user action. This table powers future "analyze behavior" + "next best action".
 */
export async function logEvent(
  supabase: SupabaseClient<Database>,
  input: {
    action: string;
    entityType?: string;
    entityId?: string;
    actorType?: "user" | "agent" | "system";
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("events").insert({
      actor_type: input.actorType ?? "user",
      actor_id: user?.id ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      action: input.action,
      payload: input.payload ?? {},
    });
  } catch {
    // swallow — telemetry must never break the request
  }
}
