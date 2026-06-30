"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Color } from "@prisma/client";
import { getCurrentUser } from "@/lib/session";
import {
  createRepertoireFromPgn,
  createEmptyRepertoire,
  deleteRepertoire,
} from "@/lib/repertoire";
import { fetchLichessStudyPgn } from "@/lib/lichess";

export type ImportState = { error?: string };

function readColor(formData: FormData): Color {
  return String(formData.get("color")) === "BLACK" ? "BLACK" : "WHITE";
}

export async function importRepertoireAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const user = await getCurrentUser();
  if (!user) return { error: "No session — please reload." };

  const name = String(formData.get("name") ?? "").trim();
  const color = readColor(formData);
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

export async function importFromLichessAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const user = await getCurrentUser();
  if (!user) return { error: "No session — please reload." };

  const name = String(formData.get("name") ?? "").trim();
  const color = readColor(formData);
  const url = String(formData.get("study") ?? "").trim();

  if (!name) return { error: "Please give the repertoire a name." };
  if (!url) return { error: "Please paste a Lichess study URL." };

  let newId: string;
  try {
    const pgn = await fetchLichessStudyPgn(url);
    const { repertoire } = await createRepertoireFromPgn(
      user.id,
      name,
      color,
      pgn,
    );
    newId = repertoire.id;
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not import that study.",
    };
  }

  revalidatePath("/repertoires");
  revalidatePath("/dashboard");
  redirect(`/repertoires/${newId}`);
}

export async function createBlankRepertoireAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const user = await getCurrentUser();
  if (!user) return { error: "No session — please reload." };

  const name = String(formData.get("name") ?? "").trim();
  const color = readColor(formData);
  if (!name) return { error: "Please give the repertoire a name." };

  const repertoire = await createEmptyRepertoire(user.id, name, color);

  revalidatePath("/repertoires");
  redirect(`/repertoires/${repertoire.id}/edit`);
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
