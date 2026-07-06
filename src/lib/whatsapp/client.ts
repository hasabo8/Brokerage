// ===========================================================================
// WhatsApp Cloud API adapter (Constitution rule #2: replaceable).
// Swap for Twilio/360dialog later by keeping this same interface.
//   WHATSAPP_TOKEN            - permanent/system-user access token
//   WHATSAPP_PHONE_NUMBER_ID  - the sending number's id
//   WHATSAPP_VERIFY_TOKEN     - your own random string for webhook verification
//   WHATSAPP_GRAPH_VERSION    - optional, defaults to v21.0
// ===========================================================================

const GRAPH_HOST = "https://graph.facebook.com";

export function whatsappConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
  );
}

export async function sendWhatsappText(
  to: string,
  body: string,
): Promise<{ wa_message_id?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error("WhatsApp is not configured");

  const version = process.env.WHATSAPP_GRAPH_VERSION ?? "v21.0";
  const endpoint = GRAPH_HOST + "/" + version + "/" + phoneId + "/messages";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: body.slice(0, 4096) },
    }),
  });

  if (!res.ok) {
    throw new Error(`WhatsApp send failed ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return { wa_message_id: json.messages?.[0]?.id };
}
