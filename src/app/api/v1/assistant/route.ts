export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { answerQuestion } from "@/lib/assistant/rag";
import { logEvent } from "@/lib/events";
import type { ChatMessage } from "@/lib/ai/llm";

// POST /api/v1/assistant  { message: string, history?: ChatMessage[] }
// Tenant-scoped via RLS. This is the conversational RAG endpoint and also the
// contract the future WhatsApp bot will call.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      message?: string;
      history?: ChatMessage[];
    };
    const message = (body.message ?? "").trim();
    if (!message)
      return NextResponse.json({ error: "message required" }, { status: 422 });

    const result = await answerQuestion(supabase, message, body.history ?? []);
    await logEvent(supabase, {
      action: "assistant_query",
      entityType: "assistant",
      payload: { message, matches: result.properties.length },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
