import {
  boxCorners,
  depthOf,
  fitProjection,
  iso,
  lineSvg,
  onTop,
  planOutline,
  slabOf,
  solidSvg,
  sideMatrix,
  type Plan,
  type Point3,
  type Tone,
} from "@/components/iso/iso-kit";
const desktop: Plan = { x: 0, y: 0, w: 290, d: 154, r: 9 };
export const projection = fitProjection(boxCorners(desktop, 0, 122), 560, 370, {
  pad: 36,
  azimuth: 48,
  elevation: 32,
});
const parts: { name: string; at: Point3; html: string }[] = [];
function part(
  name: string,
  plan: Plan,
  z: number,
  h: number,
  tone: Tone = "mid",
  inner = "",
  lit = false,
) {
  parts.push({
    name,
    at: [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2],
    html: solidSvg(slabOf(plan, z, h, projection, 8, h > 2 ? 0.6 : 0), {
      tone,
      inner,
      lit,
    }),
  });
}
function box(
  name: string,
  x: number,
  y: number,
  w: number,
  d: number,
  z: number,
  h: number,
  tone: Tone = "mid",
  inner = "",
  lit = false,
) {
  part(
    name,
    { x, y, w, d, r: Math.min(2, w / 5, d / 5) },
    z,
    h,
    tone,
    inner,
    lit,
  );
}
for (const [x, y] of [
  [10, 10],
  [270, 10],
  [10, 134],
  [270, 134],
]) {
  box(`foot-${x}-${y}`, x - 2, y - 2, 14, 14, 0, 3, "lo");
  box(`leg-${x}-${y}`, x, y, 10, 10, 3, 51, "lo");
  box(`collar-${x}-${y}`, x - 1, y - 1, 12, 12, 45, 4, "mid");
}
box("under-shelf", 10, 10, 270, 134, 15, 3, "lo");
box("back-apron", 10, 12, 270, 5, 44, 5, "lo");
box("front-apron", 10, 137, 270, 5, 44, 5, "lo");
for (let n = 0; n < 3; n++) {
  box(`shelf-folder-${n}`, 45 + n * 43, 40, 38, 70, 18, 7, "lo");
  box(`shelf-tab-${n}`, 48 + n * 43, 43, 9, 8, 25, 0.5, "mid");
}
part(
  "desk",
  desktop,
  54,
  8,
  "hi",
  lineSvg(planOutline({ x: 5, y: 5, w: 280, d: 144, r: 7 }, 62, projection), {
    tone: "lo",
  }),
);
for (const [x, y] of [
  [8, 8],
  [282, 8],
  [8, 146],
  [282, 146],
])
  box(`desk-fastener-${x}-${y}`, x - 1, y - 1, 2, 2, 62, 0.5, "hi");
for (const x of [15, 214]) {
  box(`laptop-base-${x}`, x, 81, 61, 39, 62, 2.5, "hi");
  const face = sideMatrix([x + 3, 82], 103, projection, "left");
  const display = `<g transform="${face}" class="desk-display"><defs><clipPath id="screen-${x}"><rect x="0" y="0" width="55" height="35" rx="1.4"/></clipPath></defs><g clip-path="url(#screen-${x})"><rect x="0" y="0" width="55" height="35" rx="1.4" fill="var(--anatomy-shade-0)"/><rect x="4" y="4" width="47" height="5" rx="1" fill="var(--anatomy-mid)"/><rect x="4" y="13" width="9" height="9" rx="1.5" fill="var(--anatomy-shade-3)"/><rect class="screen-row" x="17" y="13" width="34" height="2" rx=".7" fill="var(--anatomy-lo)"/><rect class="screen-row screen-row-second" x="17" y="18" width="26" height="2" rx=".7" fill="var(--anatomy-lo)"/><rect class="screen-row screen-row-third" x="4" y="27" width="47" height="3" rx=".7" fill="var(--anatomy-lo)"/></g></g>`;
  box(`laptop-display-${x}`, x, 79, 61, 3, 65, 42, "hi", display);
  box(`hinge-${x}`, x + 5, 80, 51, 3, 64.5, 1.5, "mid");
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 4; col++)
      box(
        `keyboard-${x}-${row}-${col}`,
        x + 8 + col * 11,
        88 + row * 6,
        8,
        4,
        64.5,
        0.7,
        "lo",
      );
  box(`spacebar-${x}`, x + 17, 108, 28, 3, 64.5, 0.6, "lo");
  box(`trackpad-${x}`, x + 22, 113, 19, 5, 64.5, 0.3, "lo");
}
box("shared-book-cover", 106, 98, 59, 35, 62, 1, "mid");
box(
  "shared-book-pages",
  107,
  99,
  57,
  33,
  63,
  3,
  "hi",
  lineSvg(
    onTop(
      [
        [135, 99],
        [135, 132],
      ],
      66,
      projection,
    ),
    { tone: "lo" },
  ),
);
for (const x of [110, 138])
  for (let row = 0; row < 4; row++)
    box(`book-print-${x}-${row}`, x, 104 + row * 5, 22, 1, 66, 0.05, "lo");
for (const y of [24, 55]) box(`rail-${y}`, 48, y, 188, 3, 62, 3, "mid");
for (const x of [47, 232]) box(`rail-stop-${x}`, x, 22, 6, 39, 62, 6, "hi");
const plaque: Plan = { x: 110, y: 139, w: 70, d: 9, r: 1 };
part("label-plate", plaque, 62, 0.7, "lo");
const plaqueMark = onTop(
  [
    [115, 142],
    [175, 142],
  ],
  62.7,
  projection,
);
parts.push({
  name: "label-rule",
  at: [145, 143, 63],
  html: lineSvg(plaqueMark, { tone: "lo", free: true }),
});
parts.sort((a, b) => depthOf(a.at, projection) - depthOf(b.at, projection));
const isFront = (name: string) =>
  /^(laptop|hinge|keyboard|spacebar|trackpad|shared-book|book-print)/.test(
    name,
  );
export const deskArt = parts
  .filter((p) => !isFront(p.name))
  .map((p) => `<g data-part="${p.name}">${p.html}</g>`)
  .join("");
export const frontArt = parts
  .filter((p) => isFront(p.name))
  .map((p) => `<g data-part="${p.name}">${p.html}</g>`)
  .join("");
const folderPlan: Plan = { x: 52, y: 20, w: 50, d: 43, r: 3 };
export const folderArt = [
  solidSvg(slabOf({ x: 52, y: 24, w: 50, d: 34, r: 2 }, 65, 2, projection), {
    tone: "hi",
  }),
  solidSvg(slabOf(folderPlan, 67, 1.5, projection), { tone: "hi", lit: true }),
  solidSvg(slabOf({ x: 56, y: 19, w: 17, d: 6, r: 1 }, 67, 1.5, projection), {
    tone: "hi",
    lit: true,
  }),
  `<g class="folder-page">${solidSvg(
    slabOf({ x: 57, y: 29, w: 40, d: 27, r: 1 }, 68.5, 0.5, projection),
    {
      tone: "hi",
      inner: [0, 1, 2]
        .map((n) =>
          lineSvg(
            onTop(
              [
                [62, 35 + n * 6],
                [91 - (n === 1 ? 9 : 0), 35 + n * 6],
              ],
              69,
              projection,
            ),
            { tone: "lo", free: true },
          ),
        )
        .join(""),
    },
  )}</g>`,
].join("");
const a = iso([0, 0, 0], projection),
  b = iso([1, 0, 0], projection);
export const travel = { x: b[0] - a[0], y: b[1] - a[1] };
export const partCount = parts.length + 4;
