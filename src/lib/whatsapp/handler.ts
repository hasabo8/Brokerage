import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { answerForTenant } from "@/lib/assistant/rag";
import { sendWhatsappText, whatsappConfigured } from "./client";

type Admin = SupabaseClient<Database>;

// Minimal shape of the WhatsApp Cloud API webhook payload we care about.
type WaPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          from: string;
          id: string;
          type: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
};

function aiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY);
}

async function resolveTenant(
  admin: Admin,
  phoneNumberId: string | undefined,
): Promise<string | null> {
  if (!phoneNumberId) return null;
  const { data } = await admin
    .from("whatsapp_accounts")
    .select("tenant_id")
    .eq("phone_number_id", phoneNumberId)
    .maybeSingle();
  return data?.tenant_id ?? null;
}

async function upsertLeadByPhone(
  admin: Admin,
  tenantId: string,
  phone: string,
  name?: string,
) {
  const { data: existing } = await admin
    .from("leads")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await admin
    .from("leads")
    .insert({
      tenant_id: tenantId,
      phone,
      name: name ?? null,
      source: "whatsapp",
      status: "new",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function upsertConversation(
  admin: Admin,
  tenantId: string,
  leadId: string,
  phone: string,
) {
  const { data: existing } = await admin
    .from("conversations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("channel", "whatsapp")
    .eq("external_id", phone)
    .maybeSingle();

  if (existing) {
    await admin
      .from("conversations")
      .update({ last_message_at: new Date().toISOString(), lead_id: leadId })
      .eq("id", existing.id);
    return existing;
  }

  const { data, error } = await admin
    .from("conversations")
    .insert({
      tenant_id: tenantId,
      lead_id: leadId,
      channel: "whatsapp",
      external_id: phone,
      last_message_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Process one inbound WhatsApp webhook payload:
 * route to tenant -> upsert lead + conversation -> store message ->
 * (optionally) generate a grounded AI reply and send it back.
 */
export async function handleInboundWhatsapp(payload: WaPayload): Promise<void> {
  const admin = createAdminClient();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const messages = value?.messages ?? [];
      if (messages.length === 0) continue; // delivery/status events — ignore

      const tenantId = await resolveTenant(
        admin,
        value?.metadata?.phone_number_id,
      );
      if (!tenantId) continue; // unknown number — not one of our tenants

      const contactName = value?.contacts?.[0]?.profile?.name;

      for (const msg of messages) {
        if (msg.type !== "text" || !msg.text?.body) continue;
        const from = msg.from;
        const text = msg.text.body;

        const lead = await upsertLeadByPhone(
          admin,
          tenantId,
          from,
          contactName,
        );
        const convo = await upsertConversation(admin, tenantId, lead.id, from);

        await admin.from("messages").insert({
          tenant_id: tenantId,
          conversation_id: convo.id,
          lead_id: lead.id,
          direction: "inbound",
          channel: "whatsapp",
          external_id: msg.id,
          body: text,
          status: "received",
        });
        await admin.from("lead_interactions").insert({
          tenant_id: tenantId,
          lead_id: lead.id,
          channel: "whatsapp",
          direction: "inbound",
          content: text,
        });

        // Auto-reply (grounded in the tenant's own listings) when enabled.
        const autoReply = process.env.WHATSAPP_AUTO_REPLY !== "false";
        if (autoReply && aiEnabled() && whatsappConfigured()) {
          try {
            const { answer } = await answerForTenant(admin, tenantId, text);
            const sent = await sendWhatsappText(from, answer);
            await admin.from("messages").insert({
              tenant_id: tenantId,
              conversation_id: convo.id,
              lead_id: lead.id,
              direction: "outbound",
              channel: "whatsapp",
              external_id: sent.wa_message_id ?? null,
              body: answer,
              status: "sent",
            });
            await admin.from("lead_interactions").insert({
              tenant_id: tenantId,
              lead_id: lead.id,
              channel: "whatsapp",
              direction: "outbound",
              content: answer,
            });
          } catch (e) {
            console.error("WhatsApp auto-reply failed", e);
          }
        }
      }
    }
  }
}
