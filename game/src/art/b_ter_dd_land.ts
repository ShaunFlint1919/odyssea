// Terrain doodads, part 1: desert, jungle, ocean and cavern decorations (seen from above,
// top-left light, baked contact shadows). Each entry paints and returns one sprite.
import { hash2 } from './noise';
import { Spr, pick, mixc } from './b_ter_sprite';

const SAND_ROCK = [0x2a1617, 0x43251f, 0x5c3327, 0x744231, 0x89533b, 0x9d6647, 0xb07a55];
const LIME = [0x3a2c24, 0x523f31, 0x6a543f, 0x806a4f, 0x957d5e, 0xa89070, 0xb9a282];
const PALM = [0x101c0c, 0x182a12, 0x223c18, 0x30521e, 0x406826, 0x527c2e, 0x668e38];
const NUT = [0x24160c, 0x3e2614, 0x5a3a1e, 0x7a522a];
const CACTUS = [0x0c1e14, 0x14301c, 0x1e4426, 0x2a5a30, 0x3a6e38, 0x4e8242, 0x62944c];
const BONE = [0x3a3228, 0x5e5444, 0x847660, 0xa49478, 0xbcac8e, 0xccbfa2];
const CROWN = [0x07120c, 0x0e2014, 0x16301a, 0x204220, 0x2c5426, 0x3a662c, 0x4c7832, 0x62883a, 0x76963e];
const FERN = [0x10220c, 0x183212, 0x224618, 0x305c1e, 0x407226, 0x52862e, 0x669a38];
const TEMPLE = [0x1c1c16, 0x2a2a20, 0x3a3a2c, 0x4c4c3a, 0x5e5e48, 0x727058, 0x84826a];
const MOSS = [0x142412, 0x1e3418, 0x2a461e, 0x385824, 0x4a6a2c];
const CORAL_P = [0x3a1a2c, 0x5a2a42, 0x7a3c58, 0x9a506c, 0xb46a80];
const CORAL_O = [0x3a2010, 0x5a3418, 0x7a4a22, 0x9a622e, 0xb47a3a];
const CORAL_V = [0x221a3a, 0x342856, 0x483a72, 0x5e508c, 0x766aa4];
const RUST = [0x1e100c, 0x321a12, 0x4a2818, 0x62361e, 0x7a4626, 0x8e5630, 0xa0683c];
const ISLE_ROCK = [0x1e1c1a, 0x302c28, 0x433d37, 0x575048, 0x6b6258, 0x7f7468];
const CYAN = [0x0a2232, 0x0f3a50, 0x16586e, 0x22788e, 0x3a9cb0, 0x68c4d0, 0xa8e6ec];
const CAVE = [0x150f0e, 0x221814, 0x30221b, 0x3e2c22, 0x4e382a, 0x5e4533, 0x6e533d, 0x806248];
const EGG = [0x1a0a18, 0x34122c, 0x521e42, 0x702e58, 0x8e426e, 0xaa5c86, 0xc87ca4];

// ------------------------------------------------------------------------------ desert

function palm(): Spr {
  const s = new Spr(34, 34);
  const cx = 15, cy = 15;
  const n = 8;
  const order: number[] = [];
  for (let k = 0; k < n; k++) order.push(k);
  // draw fronds pointing down-right first so the lit up-left ones sit on top
  const angOf = (k: number) => (k / n) * Math.PI * 2 + 0.25 + (hash2(k, 1, 7) - 0.5) * 0.4;
  order.sort((a, b) => (Math.cos(angOf(b)) + Math.sin(angOf(b))) - (Math.cos(angOf(a)) + Math.sin(angOf(a))));
  for (const k of order) {
    const a = angOf(k);
    s.frond(cx, cy, a, 11 + hash2(k, 2, 7) * 3, (hash2(k, 3, 7) - 0.5) * 1.1, PALM, 2.6, k + 11);
  }
  s.ball(cx - 1, cy - 1, 1.8, 1.8, NUT, { seed: 3 });
  s.ball(cx + 1.2, cy - 0.4, 1.6, 1.6, NUT, { seed: 4 });
  s.ball(cx, cy + 1.2, 1.6, 1.6, NUT, { seed: 5 });
  s.outline(0x0a1208, 170);
  s.shadow(4, 5, 0.34);
  return s;
}

function duneRock(): Spr {
  const s = new Spr(22, 18);
  s.ball(9, 8, 7.5, 5.8, SAND_ROCK, { rough: 0.22, seed: 21 });
  s.ball(14, 10, 4.5, 3.6, SAND_ROCK, { rough: 0.2, seed: 22, bias: -0.06 });
  s.line(6, 6, 9, 9, SAND_ROCK[1]);
  s.line(9, 9, 11, 8, SAND_ROCK[1]);
  s.outline(0x160a0a);
  s.shadow(2, 2, 0.36);
  return s;
}

function pyramid(): Spr {
  const s = new Spr(48, 48);
  const x0 = 3, size = 36, c = x0 + size / 2 - 0.5;
  for (let y = x0; y < x0 + size; y++) {
    for (let x = x0; x < x0 + size; x++) {
      const dx = x - c, dy = y - c;
      // crumbled south-east corner
      const ex = x - (x0 + size), ey = y - (x0 + size);
      if (Math.hypot(ex, ey) < 9 + hash2(x, y, 31) * 4) continue;
      const ring = Math.max(Math.abs(dx), Math.abs(dy));
      let t: number;
      if (Math.abs(dy) >= Math.abs(dx)) t = dy < 0 ? 0.74 : 0.32;     // north lit, south dark
      else t = dx < 0 ? 0.6 : 0.18;                                    // west lit, east darkest
      const step = ring % 4.5;
      if (step < 1) t -= 0.16;
      else if (step < 2) t += 0.08;
      if (Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.8) t += dx + dy < 0 ? 0.16 : -0.1;   // ridges
      t += (hash2(x, y, 32) - 0.5) * 0.12;
      let col = pick(LIME, t, x, y);
      // windblown sand piled on the south-west base
      const sand = (y - x) / size + hash2(x >> 1, y >> 1, 33) * 0.5;
      if (ring > 13 && sand > 0.75) col = mixc(col, 0x9a7048, 0.6);
      s.set(x, y, col);
    }
  }
  // capstone and a dark shrine opening on the north face
  s.rect(Math.round(c) - 1, Math.round(c) - 1, 3, 3, LIME[5]);
  s.rect(Math.round(c), x0 + 9, 2, 3, 0x1a120e);
  // rubble around the broken corner
  for (let k = 0; k < 6; k++) {
    const rx = x0 + size - 8 + hash2(k, 1, 34) * 10, ry = x0 + size - 8 + hash2(k, 2, 34) * 10;
    s.ball(rx, ry, 1.6, 1.3, LIME, { seed: k });
  }
  s.outline(0x20160f);
  s.longShadow(6, 6, 0.32);
  return s;
}

function pillar(): Spr {
  const s = new Spr(26, 28);
  const cx = 8, cy = 8, R = 6.4;
  // fluted drum: crenellated rim, flat lit top with a worn ring
  for (let y = 0; y < 18; y++) {
    for (let x = 0; x < 18; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const rim = R - (Math.cos(a * 10) > 0.4 ? 0.9 : 0);
      if (d > rim) continue;
      const lit = -(dx * 0.6 + dy * 0.8) / R;
      let t = 0.62 + lit * 0.3 + (hash2(x, y, 41) - 0.5) * 0.12;
      if (d > rim - 1.2) t = lit > 0 ? 0.95 : 0.25;
      else if (Math.abs(d - 3.2) < 0.6) t -= 0.18;
      s.set(x, y, pick(LIME, t, x, y));
    }
  }
  // a broken notch on the east side
  s.ball(cx + 3.4, cy + 1.2, 2, 2.4, LIME, { bias: -0.3, seed: 42 });
  s.ball(cx + 10, cy + 10, 2, 1.5, LIME, { seed: 43 });
  s.ball(cx - 5, cy + 8, 1.5, 1.2, LIME, { seed: 44 });
  s.outline(0x20160f);
  s.longShadow(9, 11, 0.3);
  return s;
}

function cactus(): Spr {
  const s = new Spr(20, 20);
  const body = (cx: number, cy: number, r: number, seed: number) => {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
        if (d > r) continue;
        const a = Math.atan2(dy, dx);
        const rib = Math.cos(a * 8 + seed);
        const nz = Math.sqrt(Math.max(0, 1 - (d / r) ** 2));
        const lam = Math.max(0, (dx / r) * -0.55 + (dy / r) * -0.7 + nz * 0.85);
        const t = 0.15 + lam * 0.8 + (rib > 0.55 ? 0.14 : rib < -0.55 ? -0.14 : 0);
        s.set(x, y, pick(CACTUS, t, x, y));
        if (rib > 0.9 && d > r * 0.45 && hash2(x, y, seed) > 0.4) s.set(x, y, 0xc4c89a);     // spines on the ribs
      }
    }
  };
  body(14, 13, 2.6, 2);
  body(4.5, 12, 2.2, 3);
  body(9, 8, 4.8, 1);
  s.set(8, 6, 0xc8607e);
  s.set(9, 6, 0xd87a90);
  s.set(8, 7, 0xa04462);
  s.outline(0x07120a);
  s.shadow(3, 3, 0.34);
  return s;
}

function bones(): Spr {
  const s = new Spr(26, 18);
  // spine
  for (let x = 4; x <= 17; x++) s.set(x, 9 + Math.round(Math.sin(x * 0.4) * 0.6), pick(BONE, 0.7, x, 9));
  // ribs
  for (let k = 0; k < 5; k++) {
    const bx = 6 + k * 2.6;
    for (let t = 0; t <= 1; t += 0.12) {
      const ax = bx + Math.sin(t * 2.6) * 2.2, up = 9 - t * 6, dn = 9 + t * 6;
      s.set(ax, up, pick(BONE, 0.8 - t * 0.2, ax, up));
      s.set(ax, dn, pick(BONE, 0.5 - t * 0.2, ax, dn));
    }
  }
  // skull
  s.ball(20, 9, 3, 2.6, BONE, { seed: 61, bias: 0.05 });
  s.set(20, 8, BONE[0]);
  s.set(21, 10, BONE[0]);
  s.ball(23.2, 9.2, 1.3, 1, BONE, { seed: 62 });
  s.outline(0x2a2018, 150);
  s.shadow(1, 2, 0.3);
  return s;
}

// ------------------------------------------------------------------------------ jungle

/** A tree crown made of leaf clumps (dome); `r` = crown radius. */
function crownSprite(size: number, r: number, clumps: number, seed: number): Spr {
  const s = new Spr(size, size);
  const c = size / 2 - 3;
  const parts: number[][] = [];
  for (let k = 0; k < clumps; k++) {
    const a = (k / clumps) * Math.PI * 2 + hash2(k, 1, seed) * 0.5;
    const d = r * (0.48 + hash2(k, 2, seed) * 0.12);
    parts.push([c + Math.cos(a) * d, c + Math.sin(a) * d, r * (0.44 + hash2(k, 3, seed) * 0.1)]);
  }
  parts.sort((p, q) => (q[0] + q[1]) - (p[0] + p[1]));               // bottom-right first
  for (const [x, y, rr] of parts) s.ball(x, y, rr, rr, CROWN, { rough: 0.22, seed: seed + Math.round(x * 7 + y), bias: -0.08 });
  s.ball(c - 0.5, c - 0.5, r * 0.55, r * 0.55, CROWN, { rough: 0.22, seed: seed + 99, bias: 0.04 });
  // leaf glints on the lit side
  for (let k = 0; k < r * 2; k++) {
    const x = c - r * 0.6 + hash2(k, 4, seed) * r, y = c - r * 0.6 + hash2(k, 5, seed) * r;
    if (s.a(x, y) > 0) s.set(x, y, CROWN[8]);
  }
  s.outline(0x040a06, 190);
  s.shadow(Math.round(r * 0.3) + 1, Math.round(r * 0.36) + 1, 0.38);
  return s;
}

function fern(): Spr {
  const s = new Spr(22, 22);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.2;
    s.frond(10, 10, a, 8 + hash2(k, 1, 71) * 2, 0.5, FERN, 1.8, k + 71);
  }
  s.set(10, 10, FERN[1]);
  s.outline(0x08140a, 140);
  s.shadow(2, 2, 0.3);
  return s;
}

function jungleRuin(): Spr {
  const s = new Spr(42, 42);
  const tier = (x0: number, x1: number, bias: number) => {
    for (let y = x0; y <= x1; y++) {
      for (let x = x0; x <= x1; x++) {
        let t = 0.5 + bias + (hash2(x, y, 81) - 0.5) * 0.14;
        if (x === x0 || y === x0) t = 0.9;
        else if (x === x1 || y === x1) t = 0.15;
        else if (((x >> 2) + (y >> 1)) % 4 === 0 && (y & 1) === 0) t -= 0.12;                // block joints
        s.set(x, y, pick(TEMPLE, t, x, y));
      }
    }
    // visible south face of the tier
    for (let x = x0; x <= x1; x++) for (let k = 1; k <= 2; k++) if (s.a(x, x1 + k) === 0 || k === 1) s.set(x, x1 + k, pick(TEMPLE, 0.28 - k * 0.08, x, x1 + k));
  };
  tier(3, 33, -0.05);
  tier(9, 27, 0.04);
  tier(14, 22, 0.12);
  s.rect(16, 21, 5, 3, 0x0c0c08);                                       // shrine doorway (south)
  // moss and vines
  for (let y = 0; y < 42; y++) {
    for (let x = 0; x < 42; x++) {
      if (s.a(x, y) === 0) continue;
      const m = hash2(x >> 2, y >> 2, 82) * 0.6 + hash2(x, y, 83) * 0.4;
      if (m > 0.68) s.set(x, y, pick(MOSS, 0.3 + (m - 0.68) * 2 + (hash2(x, y, 84) - 0.5) * 0.3, x, y));
    }
  }
  s.outline(0x0a0a06);
  s.shadow(4, 4, 0.36);
  return s;
}

function flowerBush(): Spr {
  const s = new Spr(17, 17);
  s.ball(7, 7, 5.6, 5, FERN, { rough: 0.3, seed: 91 });
  s.ball(10, 9, 3.4, 3, FERN, { rough: 0.3, seed: 93, bias: -0.06 });
  const cols = [0xc8507c, 0xd8a03a, 0xd0c8b8, 0xc8507c];
  for (let k = 0; k < 9; k++) {
    const x = 3 + hash2(k, 1, 92) * 9, y = 3 + hash2(k, 2, 92) * 8;
    if (s.a(x, y) === 0) continue;
    const col = cols[k % 4];
    s.set(x, y, col);
    s.set(x + 1, y, mixc(col, 0xffffff, 0.2));
    s.set(x, y + 1, mixc(col, 0x000000, 0.35));
  }
  s.outline(0x08140a, 160);
  s.shadow(2, 2, 0.3);
  return s;
}

// ------------------------------------------------------------------------------ ocean

function reef(): Spr {
  const s = new Spr(34, 26);
  // pale sand patch seen through the water
  s.ellipse(16, 12, 14, 9, 0x2e7478, 90);
  const ramps = [CORAL_P, CORAL_O, CORAL_V];
  for (let k = 0; k < 16; k++) {
    const a = hash2(k, 1, 101) * Math.PI * 2, d = Math.sqrt(hash2(k, 2, 101)) * 9;
    const x = 16 + Math.cos(a) * d * 1.3, y = 12 + Math.sin(a) * d;
    const rr = 1.6 + hash2(k, 3, 101) * 2.2;
    s.ball(x, y, rr, rr, ramps[k % 3], { rough: 0.3, seed: k, alpha: 200 });
  }
  return s;
}

function buoy(): Spr {
  const s = new Spr(16, 16);
  const white = [0x5a6068, 0x8a9098, 0xb4bac2, 0xd2d6dc];
  const red = [0x3a0a0c, 0x6a1416, 0x962224, 0xb83434];
  for (let y = 2; y < 13; y++) {
    for (let x = 2; x < 13; x++) {
      const nx = (x + 0.5 - 7) / 4.6, ny = (y + 0.5 - 7) / 4.6, q = nx * nx + ny * ny;
      if (q > 1) continue;
      const lam = Math.max(0, -nx * 0.55 - ny * 0.7 + Math.sqrt(1 - q) * 0.85);
      const stripe = (((x + y) >> 1) & 1) === 0;
      s.set(x, y, pick(stripe ? white : red, 0.1 + lam * 0.9, x, y));
    }
  }
  s.set(6, 6, 0xffe080);
  s.set(7, 6, 0xd8a040);
  s.outline(0x0a0c10);
  // ripple ring on the water
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    s.under(7 + Math.cos(a) * 7.2, 7 + Math.sin(a) * 6.4, 0xc8e0e8, 70);
  }
  s.shadow(1, 2, 0.22);
  return s;
}

function islet(): Spr {
  const s = new Spr(40, 32);
  s.ball(16, 14, 10, 8, ISLE_ROCK, { rough: 0.2, seed: 111 });
  s.ball(23, 17, 6.5, 5, ISLE_ROCK, { rough: 0.2, seed: 112, bias: -0.05 });
  s.ball(11, 18, 5, 3.8, ISLE_ROCK, { rough: 0.2, seed: 113, bias: -0.08 });
  // scrub on the top
  for (let k = 0; k < 5; k++) {
    const x = 12 + hash2(k, 1, 114) * 10, y = 9 + hash2(k, 2, 114) * 6;
    s.ball(x, y, 1.8 + hash2(k, 3, 114), 1.6, FERN, { rough: 0.2, seed: k });
  }
  s.outline(0x0e0c0a);
  // breaking foam ring + turquoise shallows halo (drawn behind)
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 40; x++) {
      if (s.a(x, y) > 0) continue;
      let near = 99;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (s.a(x + dx, y + dy) > 200) near = Math.min(near, Math.hypot(dx, dy));
      if (near <= 1.5 && hash2(x, y, 115) > 0.25) s.set(x, y, 0xb8d4dc, 190);
      else if (near <= 4.2) s.set(x, y, 0x2a7a84, near < 3 ? 120 : 70);
    }
  }
  return s;
}

function wreck(): Spr {
  const s = new Spr(50, 24);
  const hull = [3, 12, 9, 5, 36, 4, 46, 12, 36, 19, 9, 19];
  s.poly(hull, (x, y) => {
    const ny = (y - 12) / 7.5;
    let t = 0.5 - ny * 0.3 + (hash2(x, y, 121) - 0.5) * 0.18;
    if ((y & 1) === 0 && y > 6 && y < 18) t -= 0.08;                     // deck planks
    return pick(RUST, t, x, y);
  });
  // hull rim: lit north edge, dark south edge
  for (let x = 9; x <= 36; x++) { s.set(x, 5, RUST[6]); s.set(x, 18, RUST[0]); }
  // cabin
  for (let y = 8; y <= 15; y++) for (let x = 26; x <= 33; x++) s.set(x, y, pick(RUST, x === 26 || y === 8 ? 0.95 : x === 33 || y === 15 ? 0.15 : 0.6, x, y));
  s.rect(28, 10, 4, 3, 0x1a2a30);
  // broken flooded mid-section and submerged stern fading into the water
  s.poly([16, 6, 21, 8, 19, 12, 22, 17, 15, 17, 17, 12], 0x184a58, 230);
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 14; x++) {
      if (s.a(x, y) === 0) continue;
      const k = (14 - x) / 14;
      const i = (y * s.w + x) * 4;
      const col = mixc((s.d[i] << 16) | (s.d[i + 1] << 8) | s.d[i + 2], 0x123a50, k * 0.8);
      s.set(x, y, col, Math.round(255 - k * 90));
    }
  }
  s.outline(0x0a0606, 200);
  for (let k = 0; k < 14; k++) s.under(2 + hash2(k, 1, 122) * 46, 2 + hash2(k, 2, 122) * 20, 0xb8d0d8, 110);
  s.shadow(1, 2, 0.22);
  return s;
}

// ------------------------------------------------------------------------------ cavern

function crystal(): Spr {
  const s = new Spr(24, 26);
  s.ball(11, 19, 5, 3, CAVE, { rough: 0.2, seed: 131 });
  const shards: number[][] = [[-100, 15, 3.4], [-62, 11, 2.8], [-132, 10, 2.6], [-36, 7, 2.2], [-160, 6, 2]];
  for (const [deg, len, wd] of shards) {
    const a = (deg * Math.PI) / 180, ax = Math.cos(a), ay = Math.sin(a), px = -ay, py = ax;
    const bx = 11 + ax * 1.5, by = 18 + ay * 1.5, tx = bx + ax * len, ty = by + ay * len;
    const midx = bx + ax * len * 0.78, midy = by + ay * len * 0.78;
    // two facets split along the long axis: left (lit) / right (shade)
    s.poly([bx, by, bx + px * wd, by + py * wd, midx + px * wd, midy + py * wd, tx, ty], (x, y) => pick(CYAN, 0.78 + (hash2(x, y, 132) - 0.5) * 0.1, x, y));
    s.poly([bx, by, tx, ty, midx - px * wd, midy - py * wd, bx - px * wd, by - py * wd], (x, y) => pick(CYAN, 0.36 + (hash2(x, y, 133) - 0.5) * 0.1, x, y));
    s.line(bx, by, tx, ty, CYAN[6]);
  }
  s.outline(0x061420);
  s.glow(11, 12, 12, 0x30c0d0, 90);
  s.shadow(2, 3, 0.3);
  return s;
}

function stalagmite(): Spr {
  const s = new Spr(22, 22);
  s.ball(8, 8, 6.6, 6.6, CAVE, { rough: 0.12, seed: 141, gain: 1.1 });
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    for (const rr of [2.6, 4.8]) s.set(8 + Math.cos(a) * rr, 8 + Math.sin(a) * rr, mixc(pick(CAVE, 0.3, k, 0), 0x000000, 0.1));
  }
  s.set(7, 7, CAVE[7]);
  s.set(8, 7, CAVE[6]);
  s.outline(0x0a0606);
  s.longShadow(5, 6, 0.3);
  return s;
}

function eggPod(): Spr {
  const s = new Spr(20, 22);
  s.ellipse(9.5, 12, 8, 6, 0x1e0c1a, 220);
  s.ball(6, 10, 3.6, 4.6, EGG, { spec: 0.7, seed: 151 });
  s.ball(13, 9, 3.3, 4.3, EGG, { spec: 0.7, seed: 152 });
  s.ball(10, 14.5, 3.1, 3.9, EGG, { spec: 0.7, seed: 153 });
  // veins
  s.line(4, 9, 6, 13, EGG[1]);
  s.line(12, 6, 14, 10, EGG[1]);
  s.line(9, 13, 11, 17, EGG[1]);
  s.outline(0x0c040a);
  s.shadow(2, 2, 0.32);
  return s;
}

function boulder(): Spr {
  const s = new Spr(28, 24);
  s.ball(11, 10, 9.5, 7.8, CAVE, { rough: 0.22, seed: 161, gain: 1.1 });
  s.ball(17, 14, 5.5, 4.5, CAVE, { rough: 0.22, seed: 162, bias: -0.05 });
  s.line(7, 7, 11, 11, CAVE[1]);
  s.line(11, 11, 10, 15, CAVE[1]);
  s.line(14, 6, 16, 9, CAVE[2]);
  s.outline(0x080505);
  s.shadow(3, 3, 0.36);
  return s;
}

/** Sprite factories for desert, jungle, ocean and cavern doodads. */
export const LAND_DOODADS: Record<string, () => Spr> = {
  dd_palm: palm,
  dd_dune_rock: duneRock,
  dd_ruin_pyramid: pyramid,
  dd_ruin_pillar: pillar,
  dd_cactus: cactus,
  dd_bones: bones,
  dd_tree_big: () => crownSprite(46, 17, 7, 171),
  dd_tree_small: () => crownSprite(26, 9.5, 5, 172),
  dd_fern: fern,
  dd_jungle_ruin: jungleRuin,
  dd_flower: flowerBush,
  dd_reef: reef,
  dd_buoy: buoy,
  dd_islet: islet,
  dd_wreck: wreck,
  dd_crystal: crystal,
  dd_stalagmite: stalagmite,
  dd_egg_pod: eggPod,
  dd_boulder: boulder,
};
