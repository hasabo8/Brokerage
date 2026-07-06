// ===========================================================================
// Supabase Edge Function: embed-property
// Triggered by a Database Webhook on INSERT/UPDATE of public.properties.
// Builds a bilingual text blob -> embedding -> writes it back with the
// service role. This keeps the vector index fresh with ZERO manual work.
//
// Deploy:   supabase functions deploy embed-property
// Webhook:  Database > Webhooks > new -> table public.properties,
//           events INSERT + UPDATE -> HTTP POST to this function URL.
// ===========================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims, multilingual

async function embed(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });
  if (!res.ok)
    throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data[0].embedding as number[];
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const record = body.record ?? body;
    if (!record?.id) return new Response("no record", { status: 400 });

    const blob = [
      record.title?.en,
      record.title?.ar,
      record.description?.en,
      record.description?.ar,
      record.type,
      record.city,
      record.district,
      Array.isArray(record.amenities) ? record.amenities.join(" ") : "",
      record.price ? `price ${record.price} ${record.currency ?? "EGP"}` : "",
      record.bedrooms ? `${record.bedrooms} bedrooms` : "",
    ]
      .filter(Boolean)
      .join(" \n ");

    if (!blob.trim()) return new Response("empty blob", { status: 200 });

    const embedding = await embed(blob);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { error } = await supabase
      .from("properties")
      .update({ embedding })
      .eq("id", record.id);

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, id: record.id }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
