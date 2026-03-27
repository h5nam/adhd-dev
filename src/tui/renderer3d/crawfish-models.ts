import { Vector3 } from './math.js';
import type { Polygon } from './renderer.js';

// Build a box (12 triangles from 6 faces) centered at (cx,cy,cz) with half-extents (sx,sy,sz)
function makeBox(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): Polygon[] {
  const x0 = cx - sx; const x1 = cx + sx;
  const y0 = cy - sy; const y1 = cy + sy;
  const z0 = cz - sz; const z1 = cz + sz;

  // 8 corners
  const v = [
    new Vector3(x0, y0, z0), // 0
    new Vector3(x1, y0, z0), // 1
    new Vector3(x1, y1, z0), // 2
    new Vector3(x0, y1, z0), // 3
    new Vector3(x0, y0, z1), // 4
    new Vector3(x1, y0, z1), // 5
    new Vector3(x1, y1, z1), // 6
    new Vector3(x0, y1, z1), // 7
  ];

  return [
    // Front (z1)
    { vertices: [v[4], v[5], v[6]] },
    { vertices: [v[4], v[6], v[7]] },
    // Back (z0)
    { vertices: [v[1], v[0], v[3]] },
    { vertices: [v[1], v[3], v[2]] },
    // Left (x0)
    { vertices: [v[0], v[4], v[7]] },
    { vertices: [v[0], v[7], v[3]] },
    // Right (x1)
    { vertices: [v[5], v[1], v[2]] },
    { vertices: [v[5], v[2], v[6]] },
    // Top (y1)
    { vertices: [v[7], v[6], v[2]] },
    { vertices: [v[7], v[2], v[3]] },
    // Bottom (y0)
    { vertices: [v[0], v[1], v[5]] },
    { vertices: [v[0], v[5], v[4]] },
  ];
}

// Pyramid: square base around (bx,by,bz) with half-size bs, tip at tipY
function makePyramid(bx: number, by: number, bz: number, bs: number, tip: Vector3): Polygon[] {
  const b0 = new Vector3(bx - bs, by, bz - bs);
  const b1 = new Vector3(bx + bs, by, bz - bs);
  const b2 = new Vector3(bx + bs, by, bz + bs);
  const b3 = new Vector3(bx - bs, by, bz + bs);
  return [
    { vertices: [b0, b1, tip] },
    { vertices: [b1, b2, tip] },
    { vertices: [b2, b3, tip] },
    { vertices: [b3, b0, tip] },
    // base
    { vertices: [b0, b2, b1] },
    { vertices: [b0, b3, b2] },
  ];
}

// Claw shape: small box + pyramid tip
function makeClaw(x: number, y: number, z: number, size: number, open: boolean): Polygon[] {
  const polys: Polygon[] = [];
  // Claw arm
  polys.push(...makeBox(x, y, z, size * 0.4, size * 0.2, size * 0.2));
  // Claw pincer
  const tipOffset = open ? size * 0.5 : size * 0.3;
  polys.push(...makePyramid(x + size * 0.4, y + tipOffset, z, size * 0.2, new Vector3(x + size * 0.85, y, z)));
  return polys;
}

// Octahedron (sphere-like): 8 triangles
function makeOctahedron(cx: number, cy: number, cz: number, r: number): Polygon[] {
  const top = new Vector3(cx, cy + r, cz);
  const bot = new Vector3(cx, cy - r, cz);
  const front = new Vector3(cx, cy, cz + r);
  const back  = new Vector3(cx, cy, cz - r);
  const left  = new Vector3(cx - r, cy, cz);
  const right = new Vector3(cx + r, cy, cz);

  return [
    { vertices: [top, front, right] },
    { vertices: [top, right, back] },
    { vertices: [top, back, left] },
    { vertices: [top, left, front] },
    { vertices: [bot, right, front] },
    { vertices: [bot, back, right] },
    { vertices: [bot, left, back] },
    { vertices: [bot, front, left] },
  ];
}

// Level 1: Baby — simple octahedron body + 2 tiny claws (~14 polys)
function level1(): Polygon[] {
  const polys: Polygon[] = [];
  polys.push(...makeOctahedron(0, 0, 0, 0.5));       // 8 polys - body
  polys.push(...makeClaw(-0.7, 0, 0, 0.25, false));   // 3 polys - left claw
  polys.push(...makeClaw(0.7, 0, 0, 0.25, false));    // 3 polys - right claw (mirrored later)
  return polys;
}

// Level 2: Juvenile — elongated body + bigger claws (~20 polys)
function level2(): Polygon[] {
  const polys: Polygon[] = [];
  // Elongated body as two stacked boxes
  polys.push(...makeBox(0, 0.1, 0, 0.45, 0.35, 0.35));  // 12 polys - body
  polys.push(...makeClaw(-0.7, 0.1, 0, 0.3, true));     // 3 polys - left claw
  polys.push(...makeClaw(0.7, 0.1, 0, 0.3, true));      // 3 polys - right claw
  // Antennae as thin pyramids
  polys.push(...makePyramid(-0.15, 0.35, 0, 0.05, new Vector3(-0.6, 0.9, 0))); // 6 polys - antennae
  return polys;
}

// Level 3: Adult — segmented body + tail + large claws (~30 polys)
function level3(): Polygon[] {
  const polys: Polygon[] = [];
  // Head
  polys.push(...makeBox(0, 0.3, 0, 0.4, 0.25, 0.35));
  // Thorax
  polys.push(...makeBox(0, -0.1, 0, 0.35, 0.2, 0.3));
  // Tail segment
  polys.push(...makeBox(0, -0.45, 0, 0.25, 0.15, 0.25));
  // Large claws
  polys.push(...makeClaw(-0.8, 0.3, 0, 0.4, true));
  polys.push(...makeClaw(0.8, 0.3, 0, 0.4, true));
  // Antennae
  polys.push(...makePyramid(-0.2, 0.55, 0, 0.05, new Vector3(-0.8, 1.1, 0)));
  polys.push(...makePyramid(0.2, 0.55, 0, 0.05, new Vector3(0.8, 1.1, 0)));
  return polys;
}

// Level 4: Warrior — armored body + spiked claws (~40 polys)
function level4(): Polygon[] {
  const polys: Polygon[] = [];
  // Head
  polys.push(...makeBox(0, 0.35, 0, 0.42, 0.27, 0.37));
  // Thorax
  polys.push(...makeBox(0, -0.05, 0, 0.38, 0.22, 0.32));
  // Tail segments (2)
  polys.push(...makeBox(0, -0.42, 0, 0.3, 0.17, 0.27));
  polys.push(...makeBox(0, -0.68, 0, 0.2, 0.13, 0.2));
  // Armor plate on top
  polys.push(...makePyramid(0, 0.62, 0, 0.38, new Vector3(0, 0.9, 0)));
  // Spiked claws
  polys.push(...makeClaw(-0.9, 0.35, 0, 0.45, true));
  polys.push(...makeClaw(0.9, 0.35, 0, 0.45, true));
  // Antennae
  polys.push(...makePyramid(-0.25, 0.62, 0, 0.05, new Vector3(-0.9, 1.2, 0)));
  polys.push(...makePyramid(0.25, 0.62, 0, 0.05, new Vector3(0.9, 1.2, 0)));
  return polys;
}

// Level 5: King — crown + massive claws + cushion base (~50 polys)
function level5(): Polygon[] {
  const polys: Polygon[] = [];
  // Head
  polys.push(...makeBox(0, 0.4, 0, 0.44, 0.3, 0.4));
  // Thorax
  polys.push(...makeBox(0, 0, 0, 0.4, 0.25, 0.35));
  // Tail segments (3)
  polys.push(...makeBox(0, -0.38, 0, 0.33, 0.18, 0.28));
  polys.push(...makeBox(0, -0.65, 0, 0.25, 0.14, 0.22));
  polys.push(...makeBox(0, -0.88, 0, 0.17, 0.1, 0.16));
  // Crown (3 pyramid peaks)
  polys.push(...makePyramid(-0.25, 0.7, 0, 0.1, new Vector3(-0.25, 1.1, 0)));
  polys.push(...makePyramid(0, 0.7, 0, 0.1, new Vector3(0, 1.25, 0)));
  polys.push(...makePyramid(0.25, 0.7, 0, 0.1, new Vector3(0.25, 1.1, 0)));
  // Massive claws
  polys.push(...makeClaw(-1.05, 0.4, 0, 0.55, true));
  polys.push(...makeClaw(1.05, 0.4, 0, 0.55, true));
  // Cushion base
  polys.push(...makeBox(0, -1.05, 0, 0.55, 0.12, 0.55));
  // Antennae
  polys.push(...makePyramid(-0.3, 0.7, 0, 0.05, new Vector3(-1.0, 1.35, 0)));
  polys.push(...makePyramid(0.3, 0.7, 0, 0.05, new Vector3(1.0, 1.35, 0)));
  return polys;
}

export function getCrawfishModel(level: number): Polygon[] {
  const clamped = Math.max(1, Math.min(5, level));
  switch (clamped) {
    case 1: return level1();
    case 2: return level2();
    case 3: return level3();
    case 4: return level4();
    case 5: return level5();
    default: return level1();
  }
}
