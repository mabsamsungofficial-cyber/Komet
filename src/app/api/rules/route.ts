import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("ig_account_id", session.accountId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rules: data || [] });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const matchAny = Boolean(body.match_any);
    const rawKeywords = Array.isArray(body.trigger_keywords) ? body.trigger_keywords : [];
    const keywords = rawKeywords
      .map((k: unknown) => String(k).trim().toLowerCase())
      .filter(Boolean);

    const dmMessage = String(body.dm_message || "").trim();
    if (!dmMessage) {
      return NextResponse.json({ error: "DM message is required" }, { status: 400 });
    }
    if (!matchAny && keywords.length === 0) {
      return NextResponse.json(
        { error: "Add at least one trigger keyword or enable Any Comment" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("automation_rules")
      .insert({
        ig_account_id: session.accountId,
        media_id: String(body.media_id || "ALL"),
        media_caption: body.media_caption ? String(body.media_caption).slice(0, 140) : null,
        media_thumbnail_url: body.media_thumbnail_url ? String(body.media_thumbnail_url) : null,
        trigger_keywords: keywords,
        match_any: matchAny,
        dm_message: dmMessage,
        dm_link: body.dm_link ? String(body.dm_link).trim() : null,
        public_reply: body.public_reply ? String(body.public_reply).trim() : null,
        is_active: true,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rule: data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
