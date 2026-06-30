import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { listRepertoires } from "@/lib/repertoire";
import { deleteRepertoireAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function RepertoiresPage() {
  const user = await getCurrentUser();
  const repertoires = user ? await listRepertoires(user.id) : [];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-muted hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Repertoires</h1>
        </div>
        <Link
          href="/repertoires/new"
          className="rounded-lg bg-accent px-4 py-2 font-semibold text-stone-950 transition hover:opacity-90"
        >
          + Import
        </Link>
      </header>

      {repertoires.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-muted">No repertoires yet.</p>
          <Link
            href="/repertoires/new"
            className="mt-3 inline-block text-accent hover:underline"
          >
            Import your first PGN →
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {repertoires.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
            >
              <Link href={`/repertoires/${r.id}`} className="flex-1">
                <span className="font-medium">{r.name}</span>
                <span className="ml-2 text-sm text-muted">
                  {r.color.toLowerCase()} · {r._count.nodes} moves
                </span>
              </Link>
              <form action={deleteRepertoireAction}>
                <input type="hidden" name="id" value={r.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:border-red-800 hover:text-red-300"
                >
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
