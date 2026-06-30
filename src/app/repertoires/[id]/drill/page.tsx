import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getRepertoire } from "@/lib/repertoire";
import { buildDrillQueue } from "@/lib/drill";
import DrillBoard from "@/components/DrillBoard";

export const dynamic = "force-dynamic";

export default async function DrillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const data = await getRepertoire(id, user.id);
  if (!data) notFound();

  const queue = buildDrillQueue(data.nodes);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <header className="mb-8">
        <Link
          href={`/repertoires/${id}`}
          className="text-sm text-muted hover:underline"
        >
          ← {data.repertoire.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Drill</h1>
      </header>

      <DrillBoard
        color={data.repertoire.color}
        repertoireId={id}
        queue={queue}
      />
    </main>
  );
}
