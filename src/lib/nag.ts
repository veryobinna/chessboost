// Chess annotation glyphs (NAGs) → display info. Used by the lesson view and
// the editor's evaluation picker.

export type NagInfo = {
  glyph: string;
  label: string;
  className: string;
  bad?: boolean; // a mistake/blunder — triggers "here's why" teaching
};

export const NAGS: Record<number, NagInfo> = {
  1: { glyph: "!", label: "Good move", className: "text-green-400" },
  3: { glyph: "!!", label: "Brilliant", className: "text-emerald-300" },
  5: { glyph: "!?", label: "Interesting", className: "text-sky-400" },
  6: { glyph: "?!", label: "Dubious", className: "text-yellow-400", bad: true },
  2: { glyph: "?", label: "Mistake", className: "text-orange-400", bad: true },
  4: { glyph: "??", label: "Blunder", className: "text-red-400", bad: true },
};

export function nagInfo(nag: number | null | undefined): NagInfo | null {
  return nag ? (NAGS[nag] ?? null) : null;
}

// Ordered choices for the editor's evaluation dropdown.
export const NAG_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "— no mark —" },
  { value: 1, label: "! good" },
  { value: 3, label: "!! brilliant" },
  { value: 5, label: "!? interesting" },
  { value: 6, label: "?! dubious" },
  { value: 2, label: "? mistake" },
  { value: 4, label: "?? blunder" },
];
