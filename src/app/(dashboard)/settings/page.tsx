import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";

export default async function SettingsPage() {
  const supabase = await createClient();
  const tenantId = await getCurrentTenantId(supabase);

  const { data: account } = await supabase
    .from("whatsapp_accounts")
    .select("*")
    .limit(1)
    .maybeSingle();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const webhookUrl = `${siteUrl}/api/webhooks/whatsapp`;

  async function saveWhatsapp(formData: FormData) {
    "use server";
    const sb = await createClient();
    const tid = await getCurrentTenantId(sb);
    if (!tid) return;
    const phoneNumberId = String(formData.get("phone_number_id") || "").trim();
    const displayPhone = String(
      formData.get("display_phone_number") || "",
    ).trim();
    if (!phoneNumberId) return;

    // One WhatsApp number per tenant in this MVP: replace any existing.
    await sb.from("whatsapp_accounts").delete().eq("tenant_id", tid);
    await sb.from("whatsapp_accounts").insert({
      tenant_id: tid,
      phone_number_id: phoneNumberId,
      display_phone_number: displayPhone || null,
    });
    redirect("/settings");
  }

  const field =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none";
  const label = "block text-sm font-medium text-slate-700";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">WhatsApp integration</h2>
        <p className="mt-1 text-sm text-slate-500">
          Connect your WhatsApp Cloud API number so inbound messages create
          leads and get smart AI replies based on your listings.
        </p>

        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
          <div>
            <span className="font-medium text-slate-700">Callback URL: </span>
            <code className="text-slate-600">{webhookUrl}</code>
          </div>
          <div>
            <span className="font-medium text-slate-700">Verify token: </span>
            <code className="text-slate-600">
              {process.env.WHATSAPP_VERIFY_TOKEN
                ? "(set via WHATSAPP_VERIFY_TOKEN)"
                : "⚠️ set WHATSAPP_VERIFY_TOKEN in your env"}
            </code>
          </div>
          <p className="text-xs text-slate-400">
            Paste both into Meta → WhatsApp → Configuration → Webhook, and
            subscribe to the “messages” field.
          </p>
        </div>

        <form action={saveWhatsapp} className="mt-4 space-y-4">
          <div>
            <label className={label}>Phone number ID</label>
            <input
              name="phone_number_id"
              defaultValue={account?.phone_number_id ?? ""}
              placeholder="e.g. 123456789012345"
              className={field}
            />
          </div>
          <div>
            <label className={label}>Display phone number (optional)</label>
            <input
              name="display_phone_number"
              defaultValue={account?.display_phone_number ?? ""}
              placeholder="+20 10 ..."
              className={field}
            />
          </div>
          <button className="rounded-lg bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-800">
            Save
          </button>
          {!tenantId && (
            <p className="text-sm text-red-600">
              Could not resolve your workspace. Try signing out and back in.
            </p>
          )}
        </form>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5 text-sm text-slate-500 ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">
          The access token & sending
        </h2>
        <p className="mt-1">
          The WhatsApp access token and sending number id are read from server
          env vars (<code>WHATSAPP_TOKEN</code>,{" "}
          <code>WHATSAPP_PHONE_NUMBER_ID</code>) so secrets never touch the
          browser. Set <code>WHATSAPP_AUTO_REPLY=false</code> to disable
          automatic AI replies.
        </p>
      </section>
    </div>
  );
}
