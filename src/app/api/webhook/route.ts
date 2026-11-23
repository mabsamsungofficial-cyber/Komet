import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  sendPrivateReply,
  sendPublicCommentReply,
  verifyMetaSignature,
} from "@/lib/instagram";

interface MetaCommentValue {
  id?: string;
  text?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string };
}

interface MetaWebhookBody {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: MetaCommentValue;
    }>;
  }>;
}

// 1. Meta Webhook Verification (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    token === process.env.META_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge || "", { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// 2. Meta Comment Event Receiver (POST)
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (appSecret) {
    const sig = req.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(rawBody, sig, appSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let body: MetaWebhookBody;
  try {
    body = JSON.parse(rawBody) as MetaWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.object !== "instagram" || !Array.isArray(body.entry)) {
    return NextResponse.json({ ok: true });
  }

  const supabase = getSupabaseAdmin();

  for (const entry of body.entry) {
    const igUserId = entry.id ? String(entry.id) : null;
    if (!igUserId || !Array.isArray(entry.changes)) continue;

    // Look up connected creator account
    const { data: account } = await supabase
      .from("ig_accounts")
      .select("id, ig_user_id, access_token")
      .eq("ig_user_id", igUserId)
      .single();

    if (!account) continue;

    // Fetch active rules for this creator
    const { data: rules } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("ig_account_id", account.id)
      .eq("is_active", true);

    if (!rules || rules.length === 0) continue;

    for (const change of entry.changes) {
      if (change.field !== "comments" || !change.value) continue;

      const commentId = change.value.id ? String(change.value.id) : null;
      const commentText = String(change.value.text || "").trim();
      const commenterId = change.value.from?.id ? String(change.value.from.id) : null;
      const commenterUsername = change.value.from?.username || null;
      const mediaId = change.value.media?.id ? String(change.value.media.id) : null;

      // Skip missing ID or self-comments by the account owner
      if (!commentId || !commentText || commenterId === account.ig_user_id) {
        continue;
      }

      // Skip if this comment_id was already processed (Meta retries)
      const { data: existingLog } = await supabase
        .from("dm_logs")
        .select("id")
        .eq("comment_id", commentId)
        .maybeSingle();

      if (existingLog) continue;

      // Prefer post-specific rule over ALL-posts fallback
      const normalized = commentText.toLowerCase();
      const matchingRules = rules
        .filter((r) => r.media_id === mediaId || r.media_id === "ALL")
        .sort((a, b) => (a.media_id === mediaId ? -1 : b.media_id === mediaId ? 1 : 0));

      const matchedRule = matchingRules.find((rule) => {
        if (rule.match_any) return true;
        const keywords: string[] = Array.isArray(rule.trigger_keywords)
          ? rule.trigger_keywords
          : [];
        return keywords.some((kw) => kw && normalized.includes(kw.toLowerCase()));
      });

      if (!matchedRule) continue;

      const finalDmText = matchedRule.dm_link
        ? `${matchedRule.dm_message}\n\n${matchedRule.dm_link}`
        : matchedRule.dm_message;

      const result = await sendPrivateReply(
        account.ig_user_id,
        account.access_token,
        commentId,
        finalDmText
      );

      await supabase.from("dm_logs").insert({
        ig_account_id: account.id,
        rule_id: matchedRule.id,
        comment_id: commentId,
        commenter_id: commenterId,
        commenter_username: commenterUsername,
        comment_text: commentText.slice(0, 300),
        status: result.ok ? "sent" : "failed",
        error_message: result.ok ? null : result.error || "Unknown error",
      });

      if (result.ok) {
        await supabase.rpc("increment_rule_dm_count", {
          p_rule_id: matchedRule.id,
        });

        if (matchedRule.public_reply) {
          await sendPublicCommentReply(
            commentId,
            account.access_token,
            matchedRule.public_reply
          );
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
