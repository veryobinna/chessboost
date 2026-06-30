"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Color } from "@prisma/client";
import { getCurrentUser } from "@/lib/session";
import {
  createRepertoireFromPgn,
  deleteRepertoire,
} from "@/lib/repertoire";

export type ImportState = { error?: string };

export async function importRepertoireAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const user = await getCurrentUser();
  if (!user) return { error: "No session — please reload." };

  const name = String(formData.get("name") ?? "").trim();
  const color: Color =
    String(formData.get("color")) === "BLACK" ? "BLACK" : "WHITE";
  const pgn = String(formData.get("pgn") ?? "").trim();

  if (!name) return { error: "Please give the repertoire a name." };
  if (!pgn) return { error: "Please paste a PGN." };

  let newId: string;
  try {
    const { repertoire } = await createRepertoireFromPgn(
      user.id,
      name,
      color,
      pgn,
    );
    newId = repertoire.id;
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not parse that PGN.",
    };
  }

  revalidatePath("/repertoires");
  revalidatePath("/dashboard");
  redirect(`/repertoires/${newId}`);
}

export async function deleteRepertoireAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const id = String(formData.get("id") ?? "");
  if (id) await deleteRepertoire(id, user.id);

  revalidatePath("/repertoires");
  revalidatePath("/dashboard");
  redirect("/repertoires");
}
