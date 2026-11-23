import Link from "next/link";

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 text-sm text-zinc-300">
      <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
        ← Back
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-white">Data Deletion</h1>
      <div className="mt-6 space-y-4 leading-relaxed">
        <p>To remove your Instagram account and all associated rules and logs:</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Open Instagram → Settings → Apps and Websites.</li>
          <li>Select Komet and tap Remove.</li>
        </ol>
        <p>
          Once removed, Meta triggers our deletion callback and all stored
          tokens, rules, and DM logs for your account are permanently deleted.
        </p>
      </div>
    </main>
  );
}
