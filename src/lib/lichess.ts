import "server-only";

/** Pull an 8-char study id out of a Lichess study URL or a bare id. */
export function extractStudyId(input: string): string | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/lichess\.org\/study\/([a-zA-Z0-9]{8})/);
  if (urlMatch) return urlMatch[1];
  if (/^[a-zA-Z0-9]{8}$/.test(trimmed)) return trimmed;
  return null;
}

/** Fetch a public Lichess study as PGN (all chapters). */
export async function fetchLichessStudyPgn(input: string): Promise<string> {
  const id = extractStudyId(input);
  if (!id) {
    throw new Error("That doesn't look like a Lichess study URL or ID.");
  }

  let res: Response;
  try {
    res = await fetch(`https://lichess.org/api/study/${id}.pgn`, {
      headers: {
        "User-Agent": "ChessBoost (opening trainer)",
        Accept: "application/x-chess-pgn",
      },
      cache: "no-store",
    });
  } catch {
    throw new Error("Couldn't reach Lichess. Check your connection.");
  }

  if (res.status === 404) {
    throw new Error("Study not found — is it public?");
  }
  if (!res.ok) {
    throw new Error(`Lichess returned an error (${res.status}).`);
  }

  const pgn = await res.text();
  if (!pgn.trim()) throw new Error("That study has no moves.");
  return pgn;
}
