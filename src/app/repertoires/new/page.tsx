import Link from "next/link";
import NewRepertoire from "@/components/NewRepertoire";

export default function NewRepertoirePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <header className="mb-8">
        <Link
          href="/repertoires"
          className="text-sm text-muted hover:underline"
        >
          ← Repertoires
        </Link>
        <h1 className="mt-2 text-2xl font-bold">New repertoire</h1>
        <p className="mt-1 text-sm text-muted">
          Paste a PGN, import a Lichess study, or build one from scratch.
        </p>
      </header>

      <NewRepertoire />
    </main>
  );
}
