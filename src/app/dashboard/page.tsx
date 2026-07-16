import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const repertoires = user
    ? await prisma.repertoire.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { nodes: true } } },
      })
    : [];

  const dueCount = user
    ? await prisma.card.count({
        where: { userId: user.id, due: { lte: new Date() } },
      })
    : 0;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold">
          Chess<span className="text-accent">Boost</span>
        </Link>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted">
          {user?.isGuest ? "Guest session" : (user?.name ?? "Signed in")}
        </span>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Due today" value={dueCount} accent />
        <Stat label="Repertoires" value={repertoires.length} />
        <Stat label="Day streak" value={0} />
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Your repertoires</h2>
          <div className="flex gap-2">
            <Link
              href="/courses"
              className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:border-accent"
            >
              Browse courses
            </Link>
            <Link
              href="/repertoires/new"
              className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:border-accent"
            >
              + Import
            </Link>
          </div>
        </div>

        {repertoires.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            Nothing here yet.{" "}
            <Link href="/courses" className="text-accent hover:underline">
              Pick a course
            </Link>{" "}
            or{" "}
            <Link href="/repertoires/new" className="text-accent hover:underline">
              import a PGN
            </Link>{" "}
            to get started.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {repertoires.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/repertoires/${r.id}`}
                  className="flex items-center justify-between py-3 transition hover:text-accent"
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="text-sm text-muted">
                    {r.color.toLowerCase()} · {r._count.nodes} moves
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div
        className={`text-3xl font-bold ${accent ? "text-accent" : "text-foreground"}`}
      >
        {value}
      </div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  );
}
