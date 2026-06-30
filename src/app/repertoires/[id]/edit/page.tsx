import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getRepertoire } from "@/lib/repertoire";
import RepertoireEditor from "@/components/RepertoireEditor";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const data = await getRepertoire(id, user.id);
  if (!data) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <header className="mb-8">
        <Link
          href={`/repertoires/${id}`}
          className="text-sm text-muted hover:underline"
        >
          ← {data.repertoire.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Edit moves</h1>
        <p className="mt-1 text-sm text-muted">
          Play moves to add them. Navigate back and play a different move to
          create a branch.
        </p>
      </header>

      <RepertoireEditor
        repertoireId={id}
        color={data.repertoire.color}
        initialNodes={data.nodes}
      />
    </main>
  );
}
