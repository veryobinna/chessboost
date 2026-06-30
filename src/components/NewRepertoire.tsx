"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  importRepertoireAction,
  importFromLichessAction,
  createBlankRepertoireAction,
  type ImportState,
} from "@/app/repertoires/actions";

const SAMPLE_PGN = `1. e4 e5 2. Nf3 Nc6 3. Bc4 (3. Bb5 a6 4. Ba4 Nf6) 3... Bc5 4. c3 Nf6 5. d3 d6`;

type Mode = "pgn" | "lichess" | "blank";

const MODES: { id: Mode; label: string }[] = [
  { id: "pgn", label: "Paste PGN" },
  { id: "lichess", label: "Lichess study" },
  { id: "blank", label: "Start blank" },
];

export default function NewRepertoire() {
  const [mode, setMode] = useState<Mode>("pgn");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 rounded-lg border border-border bg-card p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              mode === m.id
                ? "bg-accent text-stone-950"
                : "text-muted hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "pgn" && <PgnForm />}
      {mode === "lichess" && <LichessForm />}
      {mode === "blank" && <BlankForm />}
    </div>
  );
}

function NameColorFields() {
  return (
    <>
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
    </>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-lg bg-accent px-5 py-2.5 font-semibold text-stone-950 transition hover:opacity-90 disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function ErrorNote({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
      {error}
    </p>
  );
}

function PgnForm() {
  const [state, action] = useActionState<ImportState, FormData>(
    importRepertoireAction,
    {},
  );
  const [pgn, setPgn] = useState("");
  return (
    <form action={action} className="flex flex-col gap-5">
      <NameColorFields />
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
          Moves of your color become flashcards; the opponent&apos;s replies
          become branches the trainer plays for you.
        </p>
      </div>
      <ErrorNote error={state.error} />
      <SubmitButton label="Import repertoire" pendingLabel="Importing…" />
    </form>
  );
}

function LichessForm() {
  const [state, action] = useActionState<ImportState, FormData>(
    importFromLichessAction,
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-5">
      <NameColorFields />
      <div className="flex flex-col gap-2">
        <label htmlFor="study" className="text-sm font-medium">
          Lichess study URL
        </label>
        <input
          id="study"
          name="study"
          placeholder="https://lichess.org/study/XXXXXXXX"
          className="rounded-lg border border-border bg-card px-3 py-2 outline-none focus:border-accent"
        />
        <p className="text-xs text-muted">
          The study must be public. All chapters are imported.
        </p>
      </div>
      <ErrorNote error={state.error} />
      <SubmitButton label="Import from Lichess" pendingLabel="Fetching…" />
    </form>
  );
}

function BlankForm() {
  const [state, action] = useActionState<ImportState, FormData>(
    createBlankRepertoireAction,
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-5">
      <NameColorFields />
      <p className="text-sm text-muted">
        Create an empty repertoire and build it move by move in the editor.
      </p>
      <ErrorNote error={state.error} />
      <SubmitButton label="Create & edit" pendingLabel="Creating…" />
    </form>
  );
}
