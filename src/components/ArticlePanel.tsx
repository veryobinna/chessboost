"use client";

import { useState } from "react";

// Collapsible "About this opening" article. Hidden by default so it never gets
// in the way of the board; the user opts in to read it.
export default function ArticlePanel({ article }: { article: string | null }) {
  const [open, setOpen] = useState(false);
  if (!article?.trim()) return null;

  return (
    <div className="mb-6 rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="font-semibold">📖 About this opening</span>
        <span className="text-sm text-muted">{open ? "Hide" : "Read"}</span>
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4">
          {article
            .trim()
            .split(/\n{2,}/)
            .map((para, i) => (
              <p
                key={i}
                className="mb-3 whitespace-pre-line text-sm leading-relaxed text-muted last:mb-0"
              >
                {para}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
