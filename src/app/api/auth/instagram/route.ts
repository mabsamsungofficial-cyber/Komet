import crypto from "crypto";
import { NextResponse } from "next/server";
import { getInstagramAuthUrl } from "@/lib/instagram";

export async function GET() {
  try {
    const state = crypto.randomBytes(16).toString("hex");
    const authUrl = getInstagramAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auth config error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
