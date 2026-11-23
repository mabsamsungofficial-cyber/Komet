import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (typeof body.match_any === "boolean") updates.match_any = body.match_any;
  if (typeof body.media_id === "string") updates.media_id = body.media_id;
  if (body.media_caption !== undefined) updates.media_caption = body.media_caption;
  if (body.media_thumbnail_url !== undefined) updates.media_thumbnail_url = body.media_thumbnail_url;
  if (Array.isArray(body.trigger_keywords)) {
    updates.trigger_keywords = body.trigger_keywords
      .map((k: unknown) => String(k).trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof body.dm_message === "string") updates.dm_message = body.dm_message.trim();
  if (body.dm_link !== undefined) updates.dm_link = body.dm_link ? String(body.dm_link).trim() : null;
  if (body.public_reply !== undefined) {
    updates.public_reply = body.public_reply ? String(body.public_reply).trim() : null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("automation_rules")
    .update(updates)
    .eq("id", id)
    .eq("ig_account_id", session.accountId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rule: data });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("automation_rules")
    .delete()
    .eq("id", id)
    .eq("ig_account_id", session.accountId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
