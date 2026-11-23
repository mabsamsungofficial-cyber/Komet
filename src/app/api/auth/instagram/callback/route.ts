import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForLongLivedToken,
  getAppUrl,
  getInstagramProfile,
} from "@/lib/instagram";
import { getSupabaseAdmin } from "@/lib/supabase";
import { setSessionCookie } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error_description") || searchParams.get("error");
  const baseUrl = getAppUrl();

  if (error || !code) {
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent(error || "Authorization cancelled")}`
    );
  }

  try {
    const { accessToken, expiresIn } = await exchangeCodeForLongLivedToken(code);
    const profile = await getInstagramProfile(accessToken);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const supabase = getSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("ig_accounts")
      .upsert(
        {
          ig_user_id: profile.igUserId,
          username: profile.username,
          profile_picture_url: profile.profilePictureUrl,
          access_token: accessToken,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "ig_user_id" }
      )
      .select("id, ig_user_id")
      .single();

    if (dbError || !data) {
      throw new Error(dbError?.message || "Failed to save account");
    }

    await setSessionCookie(data.id, data.ig_user_id);
    return NextResponse.redirect(`${baseUrl}/`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OAuth failed";
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(msg)}`);
  }
}
