// Terrain doodads, part 2: space, lava, ice and techno decorations (seen from above,
// top-left light, baked contact shadows). Each entry paints and returns one sprite.
import { hash2 } from './noise';
import { Spr, pick, mixc } from './b_ter_sprite';

const METAL = [0x10141b, 0x1a1f29, 0x262c38, 0x343c4a, 0x465062, 0x5a6578, 0x727e92, 0x8c98aa];
const GOLD = [0x2a1e08, 0x46320e, 0x664a16, 0x86641e, 0xa47e2a, 0xc09a3c];
const PANEL = [0x0a1428, 0x10203e, 0x183058, 0x224474, 0x2e5a90];
const REDL = [0x3a0808, 0x701010, 0xa82020, 0xe04040, 0xff9a8a];
const BASALT = [0x0b080a, 0x130e11, 0x1b1418, 0x241b1f, 0x2e2327, 0x392b2f, 0x463438, 0x54404a];
const MAGMA = [0x200605, 0x3c0b07, 0x5c1408, 0x80220c, 0xa23812, 0xbe561c];
const OBSID = [0x050408, 0x0c0912, 0x16101e, 0x22182c, 0x302240, 0x44345a, 0x6a5a8a, 0xa898c8];
const CHAR = [0x0a0909, 0x161313, 0x231e1e, 0x312a2a, 0x403838];
const ICE = [0x12283e, 0x1e3c5a, 0x2e5878, 0x4a7898, 0x6e9ab6, 0x9cbed2, 0xc8dce8];
const DROCK = [0x0e0f14, 0x16171e, 0x202129, 0x2a2c35, 0x363842, 0x434651, 0x525563];
const SNOW = [0x5e6e86, 0x7e90a6, 0x9eafc0, 0xb8c6d4, 0xccd8e4];
const PINE = [0x06120a, 0x0c1c10, 0x122818, 0x1a3620, 0x234428, 0x2e5432, 0x3a643c];
const PIPE = [0x10141c, 0x1a1f2a, 0x252b37, 0x323947, 0x414958, 0x525b6b, 0x656f80, 0x7c8798];
const ARMOR = [0x121621, 0x1a1f2c, 0x232937, 0x2d3443, 0x383f50, 0x444c5e, 0x525b6e, 0x626c80];

// ------------------------------------------------------------------------------ space

function stationDebris(): Spr {
  const s = new Spr(36, 32);
  // two beams with cross bracing
  const beam = (x0: number, y0: number, x1: number, y1: number) => {
    s.line(x0, y0, x1, y1, METAL[5]);
    s.line(x0, y0 + 1, x1, y1 + 1, METAL[2]);
  };
  beam(4, 12, 25, 6);
  beam(6, 19, 27, 13);
  for (let k = 0; k <= 5; k++) {
    const t = k / 5;
    const ax = 4 + 21 * t, ay = 12 - 6 * t, bx = 6 + 21 * t, by = 19 - 6 * t;
    s.line(ax, ay + 1, bx, by, METAL[3]);
    if (k < 5) s.line(ax, ay + 1, 6 + 21 * (t + 0.2), 19 - 6 * (t + 0.2), METAL[2]);
  }
  // torn hull panel at the end
  s.poly([22, 9, 31, 7, 33, 13, 30, 15, 31, 19, 26, 21, 24, 16], (x, y) => {
    let t = 0.55 + (hash2(x, y, 201) - 0.5) * 0.14;
    if ((x + y) % 5 === 0) t -= 0.2;
    return pick(METAL, t, x, y);
  });
  s.line(22, 9, 31, 7, METAL[7]);
  s.set(27, 12, 0xff9040);
  s.set(28, 12, 0xc05020);
  s.outline(0x06080c);
  s.shadow(5, 6, 0.3);
  return s;
}

function satellite(): Spr {
  const s = new Spr(34, 26);
  // solar wings
  const wing = (x0: number) => {
    for (let y = 9; y <= 15; y++) {
      for (let x = x0; x < x0 + 10; x++) {
        const grid = (x - x0) % 3 === 0 || (y - 9) % 3 === 0;
        s.set(x, y, grid ? PANEL[0] : pick(PANEL, 0.35 + (y < 12 ? 0.25 : 0) + (x - x0) * 0.02, x, y));
      }
    }
    for (let x = x0; x < x0 + 10; x++) s.set(x, 9, PANEL[4]);
  };
  wing(1);
  wing(22);
  s.line(11, 12, 13, 12, METAL[4]);
  s.line(20, 12, 22, 12, METAL[4]);
  // gold foil body
  for (let y = 7; y <= 17; y++) {
    for (let x = 13; x <= 20; x++) {
      let t = 0.5 + (hash2(x >> 1, y >> 1, 211) - 0.5) * 0.3;
      if (x === 13 || y === 7) t = 0.95;
      else if (x === 20 || y === 17) t = 0.12;
      s.set(x, y, pick(GOLD, t, x, y));
    }
  }
  // antenna dish
  s.ball(16.5, 4, 3, 2.2, METAL, { bias: 0.15, seed: 212 });
  s.line(16, 6, 16, 7, METAL[3]);
  s.set(16, 3, 0xd04040);
  s.outline(0x06080c);
  s.shadow(4, 5, 0.3);
  return s;
}

function beacon(): Spr {
  const s = new Spr(18, 20);
  s.ball(8, 12, 5.2, 4.2, METAL, { seed: 221 });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    s.set(8 + Math.cos(a) * 3.6, 12 + Math.sin(a) * 2.8, METAL[1]);
  }
  s.line(8, 11, 8, 6, METAL[6]);
  s.line(9, 11, 9, 6, METAL[2]);
  s.ball(8.5, 4.5, 2.2, 2.2, REDL, { spec: 0.8, seed: 222, bias: 0.15 });
  s.outline(0x06080c);
  s.shadow(3, 3, 0.3);
  s.glow(8.5, 4.5, 7, 0xc03030, 80);
  return s;
}

// ------------------------------------------------------------------------------ lava

function vent(): Spr {
  const s = new Spr(26, 26);
  const cx = 11, cy = 11;
  s.ball(cx, cy, 9.5, 8.5, BASALT, { rough: 0.2, seed: 231, gain: 1.2 });
  // glowing throat: the far (south-east) inner wall catches the glow
  for (let y = cy - 5; y <= cy + 5; y++) {
    for (let x = cx - 6; x <= cx + 6; x++) {
      const nx = (x + 0.5 - cx) / 4.2, ny = (y + 0.5 - cy) / 3.5;
      const q = nx * nx + ny * ny + (hash2(x, y, 234) - 0.5) * 0.35;
      if (q > 1) continue;
      const t = (1 - q) * 0.7 + (nx + ny) * 0.14 + (hash2(x, y, 232) - 0.5) * 0.12;
      s.set(x, y, pick(MAGMA, t, x, y));
    }
  }
  s.outline(0x050304);
  s.shadow(3, 3, 0.34);
  // smoke drifting to the north-east
  for (let k = 0; k < 4; k++) {
    const x = cx + 4 + k * 3, y = cy - 6 - k * 2.5, rr = 2 + k * 0.6;
    for (let yy = Math.floor(y - rr); yy <= y + rr; yy++) {
      for (let xx = Math.floor(x - rr); xx <= x + rr; xx++) {
        if (Math.hypot(xx + 0.5 - x, yy + 0.5 - y) <= rr && hash2(xx, yy, 233 + k) > 0.35) s.over(xx, yy, 0x6a6266, 70 - k * 12);
      }
    }
  }
  return s;
}

function obsidian(): Spr {
  const s = new Spr(24, 22);
  const shard = (pts: number[], lit: number) => {
    s.poly(pts, (x, y) => pick(OBSID, lit + (hash2(x, y, 241) - 0.5) * 0.12, x, y));
    s.line(pts[0], pts[1], pts[2], pts[3], OBSID[7]);
  };
  shard([4, 12, 9, 3, 12, 11, 8, 17], 0.42);
  shard([9, 14, 15, 5, 19, 13, 13, 19], 0.3);
  shard([2, 17, 6, 13, 9, 18, 5, 20], 0.22);
  shard([14, 16, 20, 14, 21, 19, 15, 20], 0.18);
  s.outline(0x030205);
  s.shadow(2, 3, 0.34);
  return s;
}

function lavaRock(): Spr {
  const s = new Spr(24, 20);
  s.ball(10, 9, 8.5, 6.8, BASALT, { rough: 0.22, seed: 251, gain: 1.15 });
  const crack: number[] = [3, 9, 7, 8, 9, 11, 13, 9, 15, 12, 18, 10];
  for (let k = 0; k + 3 < crack.length; k += 2) s.line(crack[k], crack[k + 1], crack[k + 2], crack[k + 3], MAGMA[3]);
  s.line(9, 11, 10, 14, MAGMA[2]);
  s.set(9, 11, MAGMA[5]);
  s.set(13, 9, MAGMA[4]);
  s.outline(0x050304);
  s.glow(10, 10, 11, 0x8a2010, 60);
  s.shadow(2, 2, 0.34);
  return s;
}

function ashTree(): Spr {
  const s = new Spr(30, 30);
  const cx = 13, cy = 13;
  const branch = (x: number, y: number, a: number, len: number, depth: number, seed: number): void => {
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    const lit = Math.cos(a) * -0.6 + Math.sin(a) * -0.8 > 0;
    s.line(x, y, ex, ey, lit ? CHAR[3] : CHAR[1]);
    if (depth > 1) s.line(x + 1, y, ex + 1, ey, CHAR[0]);
    if (depth > 0) {
      branch(ex, ey, a - 0.5 - hash2(seed, 1, 261) * 0.3, len * 0.6, depth - 1, seed * 3 + 1);
      branch(ex, ey, a + 0.45 + hash2(seed, 2, 261) * 0.3, len * 0.55, depth - 1, seed * 3 + 2);
    } else if (hash2(seed, 3, 261) < 0.35) s.set(ex, ey, hash2(seed, 4, 261) < 0.5 ? 0xb03010 : 0xe06020);
  };
  for (let k = 0; k < 5; k++) branch(cx, cy, (k / 5) * Math.PI * 2 + 0.3, 6 + hash2(k, 5, 261) * 2, 2, k + 1);
  s.ball(cx, cy, 2.2, 2.2, CHAR, { seed: 262, bias: 0.1 });
  s.shadow(4, 5, 0.3);
  return s;
}

// ------------------------------------------------------------------------------ ice

function iceSpire(): Spr {
  const s = new Spr(24, 28);
  const facet = (pts: number[], t: number) => s.poly(pts, (x, y) => pick(ICE, t + (hash2(x, y, 271) - 0.5) * 0.08, x, y));
  // main spike: left facet lit, right facet shaded
  facet([10, 2, 10, 20, 5, 12], 0.85);
  facet([10, 2, 15, 11, 10, 20], 0.4);
  // side crystals
  facet([4, 13, 6, 22, 1, 19], 0.7);
  facet([4, 13, 8, 19, 6, 22], 0.3);
  facet([15, 10, 18, 19, 13, 18], 0.55);
  facet([15, 10, 20, 15, 18, 19], 0.22);
  s.line(10, 2, 10, 19, ICE[6]);
  s.outline(0x0a1626);
  s.longShadow(5, 7, 0.28);
  return s;
}

function snowRock(): Spr {
  const s = new Spr(24, 20);
  s.ball(10, 9, 9, 7, DROCK, { rough: 0.2, seed: 281 });
  s.ball(15, 12, 5, 4, DROCK, { rough: 0.2, seed: 282, bias: -0.05 });
  // snow cap on the lit north-west half (wavy boundary)
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 24; x++) {
      if (s.a(x, y) === 0) continue;
      const v = (x - 10) * 0.6 + (y - 9) * 0.8 + Math.sin(x * 1.3) * 1.2;
      if (v < -1.5) s.set(x, y, pick(SNOW, 0.55 - v * 0.08 + (hash2(x, y, 283) - 0.5) * 0.12, x, y));
    }
  }
  s.outline(0x07080c);
  s.shadow(3, 3, 0.34, 0x0a1428);
  return s;
}

function frozenWreck(): Spr {
  const s = new Spr(44, 28);
  // fuselage
  s.poly([3, 12, 8, 8, 34, 9, 40, 12, 34, 16, 8, 16], (x, y) => pick(METAL, 0.62 - (y - 12) * 0.08 + (hash2(x, y, 291) - 0.5) * 0.12, x, y));
  // broken wing and tail fin
  s.poly([17, 9, 23, 2, 27, 3, 24, 10], (x, y) => pick(METAL, 0.7 + (hash2(x, y, 292) - 0.5) * 0.1, x, y));
  s.poly([17, 15, 24, 15, 30, 24, 25, 25], (x, y) => pick(METAL, 0.3 + (hash2(x, y, 293) - 0.5) * 0.1, x, y));
  s.poly([4, 12, 1, 6, 4, 7, 7, 11], (x, y) => pick(METAL, 0.55, x, y));
  // cockpit and scorch
  s.rect(33, 11, 3, 2, 0x223448);
  s.ball(13, 12.5, 3, 2.2, CHAR, { seed: 294 });
  // snow drifts over the wreck
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 44; x++) {
      if (s.a(x, y) === 0) continue;
      const v = hash2(x >> 2, y >> 1, 295) * 0.6 + hash2(x, y, 296) * 0.4 - (y - 12) * 0.03;
      if (v > 0.62) s.set(x, y, pick(SNOW, 0.5 + (v - 0.62) * 2, x, y));
    }
  }
  s.outline(0x07080c);
  s.shadow(3, 4, 0.32, 0x0a1428);
  return s;
}

function pine(): Spr {
  const s = new Spr(26, 28);
  const cx = 11, cy = 11;
  const layer = (r: number, pts: number, rot: number, bias: number) => {
    const poly: number[] = [];
    for (let k = 0; k < pts * 2; k++) {
      const a = (k / (pts * 2)) * Math.PI * 2 + rot;
      const rr = k % 2 === 0 ? r : r * 0.55;
      poly.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    s.poly(poly, (x, y) => {
      const dx = x - cx, dy = y - cy;
      const lit = -(dx * 0.6 + dy * 0.8) / (r + 1);
      const tip = Math.hypot(dx, dy) / r;
      const snowy = lit > 0.3 && tip > 0.45 && hash2(x, y, 301) > 0.35;
      return snowy ? pick(SNOW, 0.4 + lit * 0.6, x, y) : pick(PINE, 0.38 + bias + lit * 0.7 + (hash2(x, y, 302) - 0.5) * 0.22, x, y);
    });
  };
  layer(10, 8, 0.1, -0.1);
  layer(7, 7, 0.4, 0.05);
  layer(4, 6, 0.2, 0.2);
  s.set(cx, cy, SNOW[4]);
  s.outline(0x040a06, 200);
  s.longShadow(4, 6, 0.3);
  return s;
}

// ------------------------------------------------------------------------------ techno

function pipeJunction(): Spr {
  const s = new Spr(32, 22);
  for (let y = 6; y <= 14; y++) {
    const k = (y - 6) / 8;
    for (let x = 1; x <= 28; x++) {
      let t = k < 0.15 ? 0.65 : k < 0.35 ? 0.95 : k < 0.6 ? 0.62 : k < 0.85 ? 0.36 : 0.12;
      if (x < 4 || x > 25) t += 0.1;
      if (x === 4 || x === 25) t -= 0.25;
      s.set(x, y, pick(PIPE, t, x, y));
    }
  }
  // valve wheel
  const wc = 15, wr = 5.5;
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    const lit = Math.cos(a) * -0.6 + Math.sin(a) * -0.8;
    s.set(wc + Math.cos(a) * wr, 10 + Math.sin(a) * wr, lit > 0 ? 0xc04444 : 0x7a1c1c);
  }
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    s.line(wc, 10, wc + Math.cos(a) * (wr - 1), 10 + Math.sin(a) * (wr - 1), 0x8a2424);
  }
  s.ball(wc, 10, 1.6, 1.6, METAL, { bias: 0.2, seed: 311 });
  s.outline(0x05070a);
  s.shadow(3, 3, 0.34);
  return s;
}

function ventGrate(): Spr {
  const s = new Spr(24, 24);
  for (let y = 2; y <= 19; y++) {
    for (let x = 2; x <= 19; x++) {
      let t: number;
      if (x <= 3 || y <= 3) t = x === 2 || y === 2 ? 0.95 : 0.7;
      else if (x >= 18 || y >= 18) t = x === 19 || y === 19 ? 0.1 : 0.3;
      else t = (y & 1) === 0 ? 0.62 - (x - 4) * 0.012 : 0.04;
      if (x === 4 || y === 4) t -= 0.2;
      s.set(x, y, pick(ARMOR, t, x, y));
    }
  }
  for (const [x, y] of [[3, 3], [18, 3], [3, 18], [18, 18]]) s.set(x, y, ARMOR[7]);
  s.outline(0x05070a);
  s.shadow(2, 2, 0.32);
  return s;
}

function landingLight(): Spr {
  const s = new Spr(14, 14);
  for (let y = 4; y <= 9; y++) for (let x = 4; x <= 9; x++) s.set(x, y, pick(METAL, x === 4 || y === 4 ? 0.85 : x === 9 || y === 9 ? 0.15 : 0.45, x, y));
  s.rect(6, 6, 2, 2, 0x4cc8b8);
  s.set(6, 6, 0xa8f0e4);
  s.outline(0x05070a);
  s.glow(7, 7, 7, 0x28b0a0, 80);
  return s;
}

function tower(): Spr {
  const s = new Spr(40, 44);
  const x0 = 4, y0 = 4, n = 18;
  for (let y = y0; y < y0 + n; y++) {
    for (let x = x0; x < x0 + n; x++) {
      const lx = x - x0, ly = y - y0;
      let t = 0.5 + (hash2(x >> 2, y >> 2, 321) - 0.5) * 0.12;
      if (lx < 2 || ly < 2) t = 0.95;
      else if (lx >= n - 2 || ly >= n - 2) t = 0.12;
      else if (lx >= 4 && lx <= 9 && ly >= 11 && ly <= 15) t = (ly & 1) ? 0.08 : 0.55;          // roof vent
      else if (lx >= 11 && ly >= 10 && lx <= 15 && ly <= 15) t = lx === 11 || ly === 10 ? 0.9 : lx === 15 || ly === 15 ? 0.2 : 0.62;
      s.set(x, y, pick(ARMOR, t, x, y));
    }
  }
  s.ball(x0 + 12.5, y0 + 5.5, 3.2, 3.2, METAL, { bias: 0.2, seed: 322 });
  s.set(x0 + 12, y0 + 5, METAL[1]);
  s.set(x0 + 5, y0 + 5, 0xff5050);
  s.set(x0 + 6, y0 + 5, 0xb02020);
  s.set(x0 + 5, y0 + 8, 0x40d0c0);
  s.outline(0x05070a);
  s.longShadow(10, 12, 0.3);
  // shadow of the antenna mast continuing beyond the building's shadow
  for (let k = 0; k < 12; k++) s.under(x0 + 12 + 10 + k, y0 + 5 + 12 + Math.round(k * 1.15), 0x000000, 80);
  s.glow(x0 + 5.5, y0 + 5.5, 4, 0xe04040, 80);
  return s;
}

function hatch(): Spr {
  const s = new Spr(26, 26);
  const cx = 11, cy = 11, R = 10;
  for (let y = 0; y < 23; y++) {
    for (let x = 0; x < 23; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
      if (d > R) continue;
      if (d > R - 2.5) {
        const stripe = ((Math.atan2(dy, dx) * 8) / Math.PI + 16) & 1;
        let col = stripe ? 0x5e4c1a : 0x15140f;
        if (dx + dy < -R * 0.9) col = mixc(col, 0xffffff, 0.12);
        s.set(x, y, col);
      } else {
        const lit = -(dx * 0.6 + dy * 0.8) / R;
        let t = 0.45 + lit * 0.3;
        if (d > R - 3.5) t -= 0.25;
        if (Math.abs(dx) < 1.2 && Math.abs(dy) < 5) t = 0.85;      // handle bar
        if (Math.abs(dy) < 1.2 && Math.abs(dx) < 5) t = 0.8;
        s.set(x, y, pick(ARMOR, t, x, y));
      }
    }
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.5;
    s.set(cx + Math.cos(a) * (R - 4.5), cy + Math.sin(a) * (R - 4.5), ARMOR[7]);
  }
  s.outline(0x05070a);
  s.shadow(2, 2, 0.3);
  return s;
}

/** Sprite factories for space, lava, ice and techno doodads. */
export const MISC_DOODADS: Record<string, () => Spr> = {
  dd_station_debris: stationDebris,
  dd_satellite: satellite,
  dd_beacon: beacon,
  dd_vent: vent,
  dd_obsidian: obsidian,
  dd_lava_rock: lavaRock,
  dd_ash_tree: ashTree,
  dd_ice_spire: iceSpire,
  dd_snow_rock: snowRock,
  dd_frozen_wreck: frozenWreck,
  dd_pine: pine,
  dd_pipe: pipeJunction,
  dd_vent_grate: ventGrate,
  dd_light: landingLight,
  dd_tower: tower,
  dd_hatch: hatch,
};
