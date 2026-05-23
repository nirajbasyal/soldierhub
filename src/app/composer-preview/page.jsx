"use client";

import AppShell from "@/components/layout/AppShell";
import PostComposer from "@/components/feed/composer/PostComposer";

export default function ComposerPreviewPage() {
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-4 rounded-3xl border bg-white p-4">
          <h1 className="text-lg font-black">Composer Preview</h1>
          <p className="mt-1 text-sm text-slate-500">
            This page uses the new refactored composer. The home feed still uses the original composer.
          </p>
        </div>

        <PostComposer startOpen pageMode />
      </main>
    </AppShell>
  );
}
