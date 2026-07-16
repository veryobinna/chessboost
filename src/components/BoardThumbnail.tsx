// A tiny, static chessboard rendered from a FEN as inline SVG. No images, no
// storage, no client JS — the position IS the thumbnail.

const GLYPH: Record<string, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

const LIGHT = "#a8a29e";
const DARK = "#57534e";

function ranksFromFen(fen: string): string[][] {
  const board = fen.split(" ")[0];
  return board.split("/").map((row) => {
    const cells: string[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) cells.push("");
      } else {
        cells.push(ch);
      }
    }
    return cells;
  });
}

export default function BoardThumbnail({
  fen,
  orientation = "white",
  size = 72,
}: {
  fen: string;
  orientation?: "white" | "black";
  size?: number;
}) {
  let ranks = ranksFromFen(fen);
  if (orientation === "black") {
    ranks = [...ranks].reverse().map((r) => [...r].reverse());
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 8"
      className="rounded-md"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {ranks.map((row, r) =>
        row.map((piece, c) => {
          const light = (r + c) % 2 === 0;
          const isWhite = piece !== "" && piece === piece.toUpperCase();
          return (
            <g key={`${r}-${c}`}>
              <rect
                x={c}
                y={r}
                width={1}
                height={1}
                fill={light ? LIGHT : DARK}
              />
              {piece && (
                <text
                  x={c + 0.5}
                  y={r + 0.5}
                  fontSize={0.82}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isWhite ? "#fafaf9" : "#1c1917"}
                  stroke={isWhite ? "#1c1917" : "none"}
                  strokeWidth={isWhite ? 0.02 : 0}
                  style={{ shapeRendering: "auto" }}
                >
                  {GLYPH[piece.toLowerCase()]}
                </text>
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}
