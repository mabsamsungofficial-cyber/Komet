import crypto from "crypto";

const GRAPH_VERSION = "v22.0";
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_VERSION}`;

export interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
}

export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function getInstagramAuthUrl(state: string): string {
  const appId = process.env.INSTAGRAM_APP_ID;
  if (!appId) throw new Error("Missing INSTAGRAM_APP_ID");

  const redirectUri = `${getAppUrl()}/api/auth/instagram/callback`;
  const scopes = [
    "instagram_business_basic",
    "instagram_business_manage_comments",
    "instagram_business_manage_messages",
  ].join(",");

  const params = new URLSearchParams({
    enable_fb_login: "0",
    force_authentication: "1",
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    state,
  });

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForLongLivedToken(code: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Missing INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET");
  }

  const redirectUri = `${getAppUrl()}/api/auth/instagram/callback`;

  // 1. Exchange authorization code for short-lived token (valid 1 hour)
  const form = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code: code.replace(/#_$/, ""),
  });

  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const shortData = await shortRes.json();
  if (!shortRes.ok || !shortData.access_token) {
    throw new Error(shortData.error_message || shortData.error?.message || "Short-lived token exchange failed");
  }

  // 2. Exchange short-lived token for 60-day long-lived token
  const longParams = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: appSecret,
    access_token: shortData.access_token,
  });

  const longRes = await fetch(
    `https://graph.instagram.com/access_token?${longParams.toString()}`
  );
  const longData = await longRes.json();

  if (!longRes.ok || !longData.access_token) {
    return {
      accessToken: shortData.access_token,
      expiresIn: 3600,
    };
  }

  return {
    accessToken: longData.access_token as string,
    expiresIn: Number(longData.expires_in) || 5184000,
  };
}

export async function getInstagramProfile(accessToken: string): Promise<{
  igUserId: string;
  username: string;
  profilePictureUrl: string | null;
}> {
  const params = new URLSearchParams({
    fields: "user_id,username,profile_picture_url",
    access_token: accessToken,
  });

  const res = await fetch(`${GRAPH_BASE}/me?${params.toString()}`);
  const data = await res.json();

  if (!res.ok || !data.user_id) {
    throw new Error(data.error?.message || "Failed to fetch Instagram profile");
  }

  return {
    igUserId: String(data.user_id),
    username: String(data.username || "instagram_user"),
    profilePictureUrl: data.profile_picture_url ? String(data.profile_picture_url) : null,
  };
}

export async function getInstagramMedia(accessToken: string): Promise<InstagramMediaItem[]> {
  const params = new URLSearchParams({
    fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
    limit: "25",
    access_token: accessToken,
  });

  const res = await fetch(`${GRAPH_BASE}/me/media?${params.toString()}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to fetch media");
  }

  return Array.isArray(data.data) ? data.data : [];
}

export async function sendPrivateReply(
  igUserId: string,
  accessToken: string,
  commentId: string,
  messageText: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${GRAPH_BASE}/${igUserId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text: messageText },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: data?.error?.message || `HTTP ${res.status}`,
    };
  }
  return { ok: true };
}

export async function sendPublicCommentReply(
  commentId: string,
  accessToken: string,
  replyText: string
): Promise<void> {
  await fetch(`${GRAPH_BASE}/${commentId}/replies`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: replyText }),
  }).catch(() => null);
}

export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const provided = signatureHeader.slice("sha256=".length);
  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
