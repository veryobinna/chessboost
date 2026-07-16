import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse } from "@/lib/courses";
import LessonBoard from "@/components/LessonBoard";
import ArticlePanel from "@/components/ArticlePanel";
import { startCourseAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCourse(id);
  if (!data) notFound();

  const { course, nodes } = data;
  const cardCount = nodes.filter((n) => n.isPlayerMove).length;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <Link href="/courses" className="text-sm text-muted hover:underline">
            ← Courses
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{course.name}</h1>
          <p className="mt-1 text-sm text-muted">
            You play {course.color.toLowerCase()} · {nodes.length} moves ·{" "}
            {cardCount} positions to master
            {course.category && <> · {course.category}</>}
          </p>
        </div>
        <form action={startCourseAction}>
          <input type="hidden" name="courseId" value={course.id} />
          <button
            type="submit"
            className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-stone-950 transition hover:opacity-90"
          >
            Start training ▶
          </button>
        </form>
      </header>

      {course.description && (
        <p className="mb-6 text-muted">{course.description}</p>
      )}

      <ArticlePanel article={course.article} />

      <LessonBoard color={course.color} intro={course.intro} nodes={nodes} />

      <p className="mt-8 text-sm text-muted">
        Like it? <span className="text-foreground">Start training</span> adds
        this course to your repertoires so you can drill it and track progress.
      </p>
    </main>
  );
}
