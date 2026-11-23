import { NextResponse } from "next/server";

export async function GET() {
  const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
  const configId = process.env.FACEBOOK_CONFIG_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`;

  const authUrl = `https://www.facebook.com/dialog/oauth?client_id=${metaAppId}&config_id=${configId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=instagram_basic,instagram_manage_messages`;

  return NextResponse.redirect(authUrl);
}
