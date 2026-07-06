export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { handleInboundWhatsapp } from "@/lib/whatsapp/handler";

// GET: Meta webhook verification handshake.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

// POST: inbound messages + status callbacks. Always 200 so Meta stops retrying.
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    await handleInboundWhatsapp(payload);
  } catch (e) {
    console.error("WhatsApp webhook error", e);
  }
  return NextResponse.json({ received: true });
}
