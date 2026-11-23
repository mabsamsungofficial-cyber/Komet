import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getInstagramMedia } from "@/lib/instagram";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: account, error } = await supabase
      .from("ig_accounts")
      .select("access_token")
      .eq("id", session.accountId)
      .single();

    if (error || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const media = await getInstagramMedia(account.access_token);
    return NextResponse.json({ media });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load media";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
