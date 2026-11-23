import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ account: null });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("ig_accounts")
      .select("id, ig_user_id, username, profile_picture_url, token_expires_at")
      .eq("id", session.accountId)
      .single();

    if (error || !data) {
      await clearSessionCookie();
      return NextResponse.json({ account: null });
    }

    return NextResponse.json({ account: data });
  } catch {
    return NextResponse.json({ account: null });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
