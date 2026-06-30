import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-6 py-20 text-center">
        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted">
          ♟ Spaced-repetition chess training
        </span>

        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Boost your <span className="text-accent">openings</span>.
        </h1>

        <p className="max-w-xl text-lg text-muted">
          Build your opening repertoire, then drill it with spaced repetition so
          the right move is automatic — long after you studied the line.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-accent px-6 py-3 font-semibold text-stone-950 transition hover:opacity-90"
          >
            Start training →
          </Link>
          <span className="text-sm text-muted">No sign-up needed</span>
        </div>

        <ul className="mt-8 grid gap-4 text-left sm:grid-cols-3">
          {[
            ["Build", "Import a PGN or Lichess study into a move tree."],
            ["Drill", "Play your moves; the app plays the opponent."],
            ["Retain", "Reviews resurface a line right before you'd forget it."],
          ].map(([title, body]) => (
            <li
              key={title}
              className="rounded-xl border border-border bg-card p-4"
            >
              <h3 className="font-semibold text-accent">{title}</h3>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted">
        ChessBoost — a portfolio project. Built with Next.js.
      </footer>
    </main>
  );
}
