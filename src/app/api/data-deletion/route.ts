import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAppUrl } from "@/lib/instagram";

function parseSignedRequest(signedRequest: string, appSecret: string): { user_id?: string } | null {
  const [encodedSig, payload] = signedRequest.split(".");
  if (!encodedSig || !payload) return null;

  const expectedSig = crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest("base64url");

  if (encodedSig !== expectedSig) return null;

  const decoded = Buffer.from(payload, "base64url").toString("utf8");
  return JSON.parse(decoded) as { user_id?: string };
}

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  const signedRequest = formData?.get("signed_request")?.toString();
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!signedRequest || !appSecret) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = parseSignedRequest(signedRequest, appSecret);
  if (!parsed?.user_id) {
    return NextResponse.json({ error: "Invalid signed_request" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  await supabase.from("ig_accounts").delete().eq("ig_user_id", String(parsed.user_id));

  const confirmationCode = crypto.randomBytes(8).toString("hex");
  return NextResponse.json({
    url: `${getAppUrl()}/data-deletion?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
