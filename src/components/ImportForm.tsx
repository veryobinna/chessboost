"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  importRepertoireAction,
  type ImportState,
} from "@/app/repertoires/actions";

const SAMPLE_PGN = `1. e4 e5 2. Nf3 Nc6 3. Bc4 (3. Bb5 a6 4. Ba4 Nf6) 3... Bc5 4. c3 Nf6 5. d3 d6`;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-stone-950 transition hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Importing…" : "Import repertoire"}
    </button>
  );
}

export default function ImportForm() {
  const [state, action] = useActionState<ImportState, FormData>(
    importRepertoireAction,
    {},
  );
  const [pgn, setPgn] = useState("");

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          placeholder="e.g. White — Italian Game"
          className="rounded-lg border border-border bg-card px-3 py-2 outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">You play as</span>
        <div className="flex gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2">
            <input type="radio" name="color" value="WHITE" defaultChecked />
            White
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2">
            <input type="radio" name="color" value="BLACK" />
            Black
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="pgn" className="text-sm font-medium">
            PGN
          </label>
          <button
            type="button"
            onClick={() => setPgn(SAMPLE_PGN)}
            className="text-xs text-accent hover:underline"
          >
            Load sample
          </button>
        </div>
        <textarea
          id="pgn"
          name="pgn"
          rows={8}
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
          placeholder="Paste a PGN. Variations in parentheses become branches."
          className="rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm outline-none focus:border-accent"
        />
        <p className="text-xs text-muted">
          Tip: moves of your color become flashcards; the opponent&apos;s replies
          become branches the trainer plays for you.
        </p>
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
