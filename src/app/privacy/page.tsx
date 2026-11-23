import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 text-sm text-zinc-300">
      <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
        ← Back
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-white">Privacy Policy</h1>
      <div className="mt-6 space-y-4 leading-relaxed">
        <p>
          Komet connects to Instagram Business and Creator accounts through the
          official Meta Instagram API.
        </p>
        <p>
          <strong>Data Collected:</strong> Instagram user ID, username, profile
          picture URL, OAuth access token, automation rules you create, and
          comment-to-DM delivery logs.
        </p>
        <p>
          <strong>How Data Is Used:</strong> Strictly to detect matching
          comments on your selected posts/Reels and send the configured private
          DM and optional public reply via Meta APIs.
        </p>
        <p>
          <strong>Data Sharing:</strong> We never sell or share your data with
          third parties.
        </p>
        <p>
          <strong>Data Deletion:</strong> You can revoke access anytime from
          Instagram Settings → Apps and Websites, or request deletion via our{" "}
          <Link href="/data-deletion" className="underline text-white">
            Data Deletion
          </Link>{" "}
          page.
        </p>
      </div>
    </main>
  );
}
