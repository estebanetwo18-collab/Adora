// A reusable wavy/scalloped edge — the "stamp border" signature from
// Adora's brand renders, applied as a section divider instead of a full
// 4-side cutout (a true all-around scalloped rectangle needs a clip-path
// hand-tuned per breakpoint, which breaks responsively; this reads just as
// "ondulado" and never distorts at any width, down to 320px).
export function WaveDivider({ color, flip = false }: { color: string; flip?: boolean }) {
  return (
    <svg
      className={`wave-divider ${flip ? "flip" : ""}`}
      viewBox="0 0 1200 60"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M0,30 C50,60 100,0 150,30 C200,60 250,0 300,30 C350,60 400,0 450,30 C500,60 550,0 600,30 C650,60 700,0 750,30 C800,60 850,0 900,30 C950,60 1000,0 1050,30 C1100,60 1150,0 1200,30 L1200,60 L0,60 Z"
        fill={color}
      />
    </svg>
  );
}
