"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Instagram,
  LogOut,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  Send,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Account {
  id: string;
  ig_user_id: string;
  username: string;
  profile_picture_url: string | null;
}

interface MediaItem {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
}

interface Rule {
  id: string;
  media_id: string;
  media_caption: string | null;
  media_thumbnail_url: string | null;
  trigger_keywords: string[];
  match_any: boolean;
  dm_message: string;
  dm_link: string | null;
  public_reply: string | null;
  is_active: boolean;
  dm_sent_count: number;
}

interface DmLog {
  id: string;
  commenter_username: string | null;
  comment_text: string | null;
  status: "sent" | "failed";
  error_message: string | null;
  created_at: string;
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<Account | null>(null);
  const [tab, setTab] = useState<"rules" | "logs">("rules");
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<DmLog[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mediaId, setMediaId] = useState<string>("ALL");
  const [mediaCaption, setMediaCaption] = useState<string | null>(null);
  const [mediaThumb, setMediaThumb] = useState<string | null>(null);
  const [matchAny, setMatchAny] = useState(false);
  const [keywordsText, setKeywordsText] = useState("");
  const [dmMessage, setDmMessage] = useState("");
  const [dmLink, setDmLink] = useState("");
  const [publicReply, setPublicReply] = useState("");

  const loadRules = useCallback(async () => {
    const res = await fetch("/api/rules");
    if (res.ok) {
      const data = await res.json();
      setRules(data.rules || []);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    const res = await fetch("/api/logs");
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs || []);
    }
  }, []);

  const loadMedia = useCallback(async () => {
    setMediaLoading(true);
    try {
      const res = await fetch("/api/media");
      if (res.ok) {
        const data = await res.json();
        setMedia(data.media || []);
      }
    } finally {
      setMediaLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) setErrorBanner(err);

    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.account) {
          setAccount(data.account);
          await Promise.all([loadRules(), loadLogs()]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRules, loadLogs]);

  const openCreateModal = () => {
    setEditingRuleId(null);
    setMediaId("ALL");
    setMediaCaption(null);
    setMediaThumb(null);
    setMatchAny(false);
    setKeywordsText("");
    setDmMessage("");
    setDmLink("");
    setPublicReply("");
    setModalOpen(true);
    if (media.length === 0) void loadMedia();
  };

  const openEditModal = (rule: Rule) => {
    setEditingRuleId(rule.id);
    setMediaId(rule.media_id);
    setMediaCaption(rule.media_caption);
    setMediaThumb(rule.media_thumbnail_url);
    setMatchAny(rule.match_any);
    setKeywordsText(rule.trigger_keywords.join(", "));
    setDmMessage(rule.dm_message);
    setDmLink(rule.dm_link || "");
    setPublicReply(rule.public_reply || "");
    setModalOpen(true);
    if (media.length === 0) void loadMedia();
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorBanner(null);

    const keywords = keywordsText
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const payload = {
      media_id: mediaId,
      media_caption: mediaCaption,
      media_thumbnail_url: mediaThumb,
      trigger_keywords: keywords,
      match_any: matchAny,
      dm_message: dmMessage,
      dm_link: dmLink || null,
      public_reply: publicReply || null,
    };

    try {
      const url = editingRuleId ? `/api/rules/${editingRuleId}` : "/api/rules";
      const method = editingRuleId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || "Failed to save rule");
        return;
      }

      setModalOpen(false);
      await loadRules();
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: Rule) => {
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
    );
    await fetch(`/api/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !rule.is_active }),
    });
  };

  const deleteRule = async (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/rules/${id}`, { method: "DELETE" });
  };

  const handleLogout = async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    setAccount(null);
    setRules([]);
    setLogs([]);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  // Signed-out view (minimal, zero filler text)
  if (!account) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-between px-5 py-10">
        <div />
        <div className="w-full max-w-xs rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800">
            <Send className="h-5 w-5 text-white" />
          </div>
          <h1 className="mt-4 text-lg font-semibold tracking-tight text-white">
            Komet
          </h1>

          {errorBanner && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-left text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}

          <a
            href="/api/auth/instagram"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
          >
            <Instagram className="h-4 w-4" />
            Connect Instagram
          </a>
        </div>

        <footer className="flex gap-5 text-xs text-zinc-500">
          <Link href="/privacy" className="hover:text-zinc-300">
            Privacy
          </Link>
          <Link href="/data-deletion" className="hover:text-zinc-300">
            Data Deletion
          </Link>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            {account.profile_picture_url ? (
              <img
                src={account.profile_picture_url}
                alt={account.username}
                className="h-7 w-7 rounded-full object-cover border border-zinc-800"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
                <Instagram className="h-3.5 w-3.5 text-zinc-400" />
              </div>
            )}
            <span className="text-sm font-medium text-white">@{account.username}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-zinc-950 transition hover:bg-zinc-200"
            >
              <Plus className="h-3.5 w-3.5" />
              New Rule
            </button>
            <button
              onClick={handleLogout}
              aria-label="Logout"
              className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {errorBanner && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-red-900/60 bg-red-950/40 px-3.5 py-2.5 text-xs text-red-300">
            <span>{errorBanner}</span>
            <button onClick={() => setErrorBanner(null)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl border border-zinc-800/80 bg-zinc-950 p-1 w-fit">
          <button
            onClick={() => setTab("rules")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
              tab === "rules"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Rules ({rules.length})
          </button>
          <button
            onClick={() => {
              setTab("logs");
              void loadLogs();
            }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
              tab === "logs"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Logs ({logs.length})
          </button>
        </div>

        {/* Rules Tab */}
        {tab === "rules" && (
          <div className="space-y-3">
            {rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-14">
                <button
                  onClick={openCreateModal}
                  className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-medium text-zinc-950 hover:bg-zinc-200"
                >
                  <Plus className="h-4 w-4" />
                  Create Rule
                </button>
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-950 p-4"
                >
                  <div className="flex min-w-0 gap-3.5">
                    {rule.media_thumbnail_url ? (
                      <img
                        src={rule.media_thumbnail_url}
                        alt=""
                        className="h-14 w-11 shrink-0 rounded-lg object-cover border border-zinc-800"
                      />
                    ) : (
                      <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-medium text-zinc-400">
                        ALL
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {rule.match_any ? (
                          <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-200">
                            Any comment
                          </span>
                        ) : (
                          rule.trigger_keywords.map((kw) => (
                            <span
                              key={kw}
                              className="rounded-md bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-200"
                            >
                              {kw}
                            </span>
                          ))
                        )}
                        <span className="text-[11px] text-zinc-500">
                          • {rule.dm_sent_count} sent
                        </span>
                      </div>

                      <p className="mt-1.5 truncate text-xs text-zinc-300 max-w-md">
                        {rule.dm_message}
                      </p>
                      {rule.dm_link && (
                        <p className="mt-0.5 truncate text-[11px] text-zinc-500 max-w-md">
                          {rule.dm_link}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => toggleRule(rule)}
                      aria-label="Toggle rule"
                      className={`relative h-5 w-9 rounded-full transition ${
                        rule.is_active ? "bg-emerald-500" : "bg-zinc-800"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                          rule.is_active ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => openEditModal(rule)}
                      aria-label="Edit"
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      aria-label="Delete"
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Logs Tab */}
        {tab === "logs" && (
          <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950">
            {logs.length === 0 ? (
              <div className="py-14 text-center text-xs text-zinc-500">
                No activity yet
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/80">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-zinc-200">
                        @{log.commenter_username || "user"}
                      </span>
                      <span className="mx-2 text-zinc-600">·</span>
                      <span className="text-zinc-400 truncate">
                        {log.comment_text}
                      </span>
                      {log.error_message && (
                        <p className="mt-0.5 text-[11px] text-red-400">
                          {log.error_message}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                        log.status === "sent"
                          ? "bg-emerald-950/70 text-emerald-400 border border-emerald-900/60"
                          : "bg-red-950/70 text-red-400 border border-red-900/60"
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create / Edit Rule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-zinc-800 bg-zinc-950 p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                {editingRuleId ? "Edit Rule" : "New Rule"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="mt-4 space-y-4">
              {/* Post / Reel Picker */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  Post / Reel
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMediaId("ALL");
                      setMediaCaption(null);
                      setMediaThumb(null);
                    }}
                    className={`flex h-20 w-16 shrink-0 flex-col items-center justify-center rounded-xl border text-[11px] font-medium transition ${
                      mediaId === "ALL"
                        ? "border-white bg-zinc-800 text-white"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    All Posts
                  </button>

                  {mediaLoading && (
                    <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-xl border border-zinc-800">
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                    </div>
                  )}

                  {media.map((item) => {
                    const thumb = item.thumbnail_url || item.media_url || "";
                    const selected = mediaId === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          setMediaId(item.id);
                          setMediaCaption(item.caption || null);
                          setMediaThumb(thumb || null);
                        }}
                        className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border transition ${
                          selected
                            ? "border-white ring-1 ring-white"
                            : "border-zinc-800 opacity-75 hover:opacity-100"
                        }`}
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-[10px] text-zinc-500">
                            {item.media_type}
                          </div>
                        )}
                        {selected && (
                          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-zinc-950">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Trigger Keywords */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-zinc-400">
                    Trigger Keywords
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={matchAny}
                      onChange={(e) => setMatchAny(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-900"
                    />
                    Any comment
                  </label>
                </div>
                <input
                  type="text"
                  disabled={matchAny}
                  value={keywordsText}
                  onChange={(e) => setKeywordsText(e.target.value)}
                  placeholder="link, pdf, price"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none disabled:opacity-40"
                />
              </div>

              {/* DM Message */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  DM Message
                </label>
                <textarea
                  required
                  rows={3}
                  value={dmMessage}
                  onChange={(e) => setDmMessage(e.target.value)}
                  placeholder="Here is your link 👇"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
                />
              </div>

              {/* Optional Link */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Link (optional)
                </label>
                <input
                  type="url"
                  value={dmLink}
                  onChange={(e) => setDmLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
                />
              </div>

              {/* Optional Public Reply */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Public Comment Reply (optional)
                </label>
                <input
                  type="text"
                  value={publicReply}
                  onChange={(e) => setPublicReply(e.target.value)}
                  placeholder="Sent to your DM!"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingRuleId ? "Save Changes" : "Save Rule"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
