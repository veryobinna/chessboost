import Link from "next/link";
import ImportForm from "@/components/ImportForm";

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
        <h1 className="mt-2 text-2xl font-bold">Import a repertoire</h1>
        <p className="mt-1 text-sm text-muted">
          Paste a PGN — including variations in parentheses — and we&apos;ll build
          the move tree.
        </p>
      </header>

      <ImportForm />
    </main>
  );
}
