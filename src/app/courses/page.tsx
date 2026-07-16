import Link from "next/link";
import { listCourses } from "@/lib/courses";
import BoardThumbnail from "@/components/BoardThumbnail";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Opening courses — ChessBoost",
  description:
    "Ready-made chess opening courses. Learn the lines move by move, then drill them until they're automatic.",
};

export default async function CoursesPage() {
  const courses = await listCourses();
  const white = courses.filter((c) => c.color === "WHITE");
  const black = courses.filter((c) => c.color === "BLACK");
  const lines = courses.reduce((s, c) => s + c._count.nodes, 0);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <header className="mb-10">
        <Link href="/dashboard" className="text-sm text-muted hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Opening courses</h1>
        <p className="mt-2 text-muted">
          {courses.length} courses · {lines} moves · free to start. Pick one,
          learn it move by move, then drill it until it&apos;s instinct.
        </p>
      </header>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted">
          No courses published yet — check back soon.
        </div>
      ) : (
        <>
          <Section title="For White" courses={white} />
          <Section title="For Black" courses={black} />
        </>
      )}
    </main>
  );
}

function Section({
  title,
  courses,
}: {
  title: string;
  courses: Awaited<ReturnType<typeof listCourses>>;
}) {
  if (courses.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-semibold text-muted">{title}</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {courses.map((c) => (
          <li key={c.id}>
            <Link
              href={`/courses/${c.id}`}
              className="flex h-full gap-4 rounded-xl border border-border bg-card p-4 transition hover:border-accent"
            >
              <BoardThumbnail
                fen={c.previewFen}
                orientation={c.color === "BLACK" ? "black" : "white"}
                size={80}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{c.name}</span>
                  {c.category && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                      {c.category}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-3 text-sm text-muted">
                  {c.description}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {c._count.nodes} moves
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
