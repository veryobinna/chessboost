import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getRepertoire } from "@/lib/repertoire";
import RepertoireViewer from "@/components/RepertoireViewer";

export const dynamic = "force-dynamic";

export default async function RepertoirePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const data = await getRepertoire(id, user.id);
  if (!data) notFound();

  const { repertoire, nodes } = data;
  const cardCount = nodes.filter((n) => n.isPlayerMove).length;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/repertoires"
            className="text-sm text-muted hover:underline"
          >
            ← Repertoires
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{repertoire.name}</h1>
          <p className="mt-1 text-sm text-muted">
            You play {repertoire.color.toLowerCase()} · {nodes.length} moves ·{" "}
            {cardCount} cards
          </p>
        </div>
      </header>

      <RepertoireViewer color={repertoire.color} nodes={nodes} />
    </main>
  );
}
