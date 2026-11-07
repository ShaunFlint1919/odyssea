// =====================================================================================
//  ARSENAL ART — procedural pixel-art textures owned by the arsenal, generated lazily
//  (once per game, cached in the texture manager) under private 'ars_' keys.
//
//  Every projectile tier, muzzle flash, impact spark, flash, splash ring, flame puff,
//  smoke puff and crackle has a DEDICATED pixel size: nothing is drawn with a non-integer
//  scale, so pixels stay crisp at every power level. Animated effects are frame sheets
//  (frames 0..n-1) whose growth and fade are baked into the frames, so the FX pools only
//  step frames (no per-frame scale / alpha work).
//
//  Colours come from SHOT_RGB (the same ramps as the art module's shots): white-hot core
//  -> core -> light -> glow -> dark, with translucent outer pixels and never a dark rim,
//  so player fire can never be mistaken for enemy bullets. Glows / flashes / ward rings are
//  white and meant to be tinted (additive).
//  Odd sizes are used for star shapes (a true centre pixel); even widths for bolts that
//  are centred on the gun axis.
// =====================================================================================
import type Phaser from 'phaser';
import type { ShotColor } from '../../types';
import { SHOT_RGB } from '../../art/keys';
import { addSheet, addTexture, makeCanvas } from '../../art/pixel';
import { fbm, mulberry32 } from '../../art/noise';
import { texInfo, type TexInfo } from './textures';

// ------------------------------------------------------------------ pixel buffer + colour

/** RGBA buffer with numeric colours (generation time only). */
class Pix {
  readonly d: Uint8ClampedArray;
  constructor(readonly w: number, readonly h: number) {
    this.d = new Uint8ClampedArray(Math.max(1, w * h * 4));
  }

  /** Writes rgb (0xRRGGBB) with alpha a (0..1) unless the pixel is already more opaque. */
  set(x: number, y: number, rgb: number, a: number): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = (y * this.w + x) * 4;
    const na = Math.round(Math.min(1, a) * 255);
    if (na < this.d[i + 3]) return;
    this.d[i] = (rgb >> 16) & 255;
    this.d[i + 1] = (rgb >> 8) & 255;
    this.d[i + 2] = rgb & 255;
    this.d[i + 3] = na;
  }

  /** Overwrites a pixel. */
  put(x: number, y: number, rgb: number, a: number): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = (rgb >> 16) & 255;
    this.d[i + 1] = (rgb >> 8) & 255;
    this.d[i + 2] = rgb & 255;
    this.d[i + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
  }

  alpha(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[(y * this.w + x) * 4 + 3] / 255;
  }

  canvas(): HTMLCanvasElement {
    const { canvas, ctx } = makeCanvas(this.w, this.h);
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.d);
    ctx.putImageData(img, 0, 0);
    return canvas;
  }
}

function mix(a: number, b: number, t: number): number {
  const r = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * t);
  const g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t);
  const bl = (a & 255) + (((b & 255) - (a & 255)) * t);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

function shadeRgb(c: number, k: number): number {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return (f((c >> 16) & 255) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255);
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x: number, y: number): number => (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

/** Colour ramp of a projectile colour: white-hot -> core -> light -> glow -> dark -> deep. */
export interface Ramp {
  readonly w: number;
  readonly c: number;
  readonly l: number;
  readonly g: number;
  readonly d: number;
  readonly e: number;
}

/** Ramp built from a core and a glow colour. */
export function rampFrom(core: number, glow: number): Ramp {
  return { w: 0xffffff, c: core, l: mix(core, glow, 0.5), g: glow, d: shadeRgb(glow, 0.7), e: shadeRgb(glow, 0.48) };
}

/** Ramp of a ShotColor (SHOT_RGB). */
export function rampOf(color: ShotColor): Ramp {
  const rgb = SHOT_RGB[color] ?? SHOT_RGB.white;
  return rampFrom(rgb.core, rgb.glow);
}

const hexKey = (n: number): string => n.toString(16).padStart(6, '0');

// heat -> colour band (module scratch, generation time only)
let SC = 0;
let SA = 0;
function heat(r: Ramp, h: number): void {
  if (h >= 0.8) { SC = r.w; SA = 1; }
  else if (h >= 0.6) { SC = r.c; SA = 1; }
  else if (h >= 0.42) { SC = r.l; SA = 1; }
  else if (h >= 0.26) { SC = r.g; SA = 1; }
  else if (h >= 0.12) { SC = r.d; SA = 0.85; }
  else { SC = r.e; SA = 0.55; }
}

/** Registers frames under `key` (single image or sheet) once and returns its layout. */
function build(scene: Phaser.Scene, key: string, make: () => Pix[]): TexInfo {
  if (!scene.textures.exists(key)) {
    const frames = make();
    if (frames.length === 1) addTexture(scene, key, frames[0].canvas());
    else addSheet(scene, key, frames.map((f) => f.canvas()));
  }
  return texInfo(scene, key);
}

// ------------------------------------------------------------------ projectiles (nose UP)

/** Plasma bolt sizes (pulse, tail gun, pod): tiers 0..3. */
export const BOLT_SIZES: readonly (readonly [number, number])[] = [[4, 11], [6, 14], [8, 18], [10, 22]];

/** Elongated plasma bolt: rounded white-hot head, tapering translucent tail. */
export function boltTex(scene: Phaser.Scene, color: ShotColor, tier: number): TexInfo {
  const [W, H] = BOLT_SIZES[Math.max(0, Math.min(3, tier))];
  return build(scene, `ars_bolt_${color}_${W}`, () => {
    const r = rampOf(color);
    const p = new Pix(W, H);
    const cx = W / 2;
    const nose = Math.min(W / 2, H * 0.28);
    const bodyEnd = H * 0.55;
    for (let y = 0; y < H; y++) {
      const py = y + 0.5;
      let hw: number;
      let lon = 1;
      let tail = 1;
      if (py < nose) {
        const k = (nose - py) / nose;
        hw = (W / 2) * Math.sqrt(Math.max(0, 1 - k * k * 0.85));
      } else if (py < bodyEnd) {
        hw = W / 2;
      } else {
        const t = (py - bodyEnd) / (H - bodyEnd);
        hw = (W / 2) * (1 - t * 0.78);
        lon = 1 - 0.62 * t;
        tail = 1 - 0.45 * t;
      }
      for (let x = 0; x < W; x++) {
        const dx = Math.abs(x + 0.5 - cx);
        if (dx > hw + 0.01) continue;
        let h = (1 - dx / (hw + 0.35)) * lon;
        if (py < bodyEnd) h += 0.1;
        heat(r, h);
        p.set(x, y, SC, SA * tail);
      }
    }
    return [p];
  });
}

/** Tracer needle sizes (gatling, twin drone): tiers 0..2. */
export const NEEDLE_SIZES: readonly (readonly [number, number])[] = [[2, 12], [3, 15], [4, 19]];

/** Fast tracer: white head, coloured body, long fading tail. */
export function needleTex(scene: Phaser.Scene, color: ShotColor, tier: number): TexInfo {
  const [W, H] = NEEDLE_SIZES[Math.max(0, Math.min(2, tier))];
  return build(scene, `ars_needle_${color}_${W}`, () => {
    const r = rampOf(color);
    const p = new Pix(W, H);
    const cx = W / 2;
    for (let y = 0; y < H; y++) {
      const t = (y + 0.5) / H;
      const hw = t < 0.1 ? Math.max(0.5, W / 2 - 0.6) : t < 0.45 ? W / 2 : (W / 2) * (1 - ((t - 0.45) / 0.55) * 0.6);
      const lon = t < 0.35 ? 1.25 : 1.05 - ((t - 0.35) / 0.65) * 0.9;
      for (let x = 0; x < W; x++) {
        const dx = Math.abs(x + 0.5 - cx);
        if (dx > hw + 0.01) continue;
        heat(r, (1 - dx / (W / 2 + 0.7)) * lon);
        p.set(x, y, SC, SA * (t > 0.5 ? 1 - (t - 0.5) * 1.3 : 1));
      }
    }
    return [p];
  });
}

/** Fireball pellet sizes (scatter): tiers 0..2. */
export const PELLET_SIZES: readonly (readonly [number, number])[] = [[6, 9], [8, 11], [10, 14]];

/** Round plasma pellet with a short comet tail (rotate along velocity). */
export function pelletTex(scene: Phaser.Scene, color: ShotColor, tier: number): TexInfo {
  const [W, H] = PELLET_SIZES[Math.max(0, Math.min(2, tier))];
  return build(scene, `ars_pellet_${color}_${W}`, () => {
    const r = rampOf(color);
    const p = new Pix(W, H);
    const R0 = W / 2, cx = W / 2, cy = W / 2;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const px = x + 0.5, py = y + 0.5;
        const d = Math.hypot(px - cx, py - cy) / R0;
        if (d <= 1) {
          const hl = Math.hypot(px - cx + R0 * 0.2, py - cy + R0 * 0.25) / R0;
          heat(r, 1.05 - d * 0.82 + (hl < 0.3 ? 0.15 : 0));
          p.set(x, y, SC, d > 0.86 ? SA * 0.8 : SA);
        } else if (py > cy) {
          const t = (py - cy) / (H - cy);
          const hw = R0 * 0.72 * (1 - t);
          const dx = Math.abs(px - cx);
          if (dx <= hw + 0.01) {
            heat(r, 0.5 * (1 - t) * (1 - dx / (hw + 0.6)) + 0.1);
            p.set(x, y, SC, SA * (1 - t * 0.6));
          }
        }
      }
    }
    return [p];
  });
}

/** Crescent wave sizes (helix): tiers 0..3. */
export const WAVE_SIZES: readonly (readonly [number, number])[] = [[10, 6], [12, 7], [14, 8], [16, 9]];

/** Crescent pointing UP (convex top), brightest along the middle of the band. */
export function waveTex(scene: Phaser.Scene, color: ShotColor, tier: number): TexInfo {
  const [W, H] = WAVE_SIZES[Math.max(0, Math.min(3, tier))];
  return build(scene, `ars_wave_${color}_${W}`, () => {
    const r = rampOf(color);
    const p = new Pix(W, H);
    const cx = W / 2, cy = H * 1.35;
    const ro = cy, ri = cy - H * 0.62;
    const mid = (ro + ri) / 2, half = (ro - ri) / 2;
    const amax = Math.asin(Math.min(1, (W / 2) / ro)) * 1.02;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - cx, dy = cy - (y + 0.5);
        const d = Math.hypot(dx, dy);
        if (d > ro || d < ri) continue;
        const ang = Math.abs(Math.atan2(dx, dy)) / amax;
        if (ang > 1) continue;
        const band = 1 - Math.abs(d - mid) / half;
        heat(r, band * 1.1 * (1 - 0.55 * ang * ang) + (ang < 0.35 ? 0.1 : 0));
        p.set(x, y, SC, SA * (ang > 0.85 ? 0.75 : 1));
      }
    }
    return [p];
  });
}

/** Lance beam widths per tier (the length is exact per power level). */
export const BEAM_WIDTHS = [6, 8, 10, 12] as const;
/** Crackle frames of a lance beam. */
export const BEAM_FRAMES = 3;

/**
 * Piercing beam of exact length `len` (px) and core width BEAM_WIDTHS[tier]: white core,
 * coloured sheath, tapered tips, translucent glow columns and electric crackle pixels that
 * change on every frame (2 px margin each side).
 */
export function beamTex(scene: Phaser.Scene, color: ShotColor, tier: number, len: number): TexInfo {
  const W = BEAM_WIDTHS[Math.max(0, Math.min(3, tier))];
  const L = Math.max(12, Math.round(len));
  return build(scene, `ars_beam_${color}_${W}_${L}`, () => {
    const r = rampOf(color);
    const TW = W + 6;
    const cx = TW / 2;
    const frames: Pix[] = [];
    for (let f = 0; f < BEAM_FRAMES; f++) {
      const p = new Pix(TW, L);
      const rng = mulberry32(911 + f * 131 + W * 7 + L);
      for (let y = 0; y < L; y++) {
        const tip = Math.min(y + 0.5, L - y - 0.5);
        const k = tip < 6 ? 0.3 + 0.7 * (tip / 6) : 1;
        const hw = (W / 2) * k;
        for (let x = 0; x < TW; x++) {
          const dx = Math.abs(x + 0.5 - cx);
          if (dx <= hw + 0.01) {
            heat(r, (1 - dx / (hw + 0.5)) * 1.18 + (tip < 3 ? 0.15 : 0));
            p.set(x, y, SC, SA);
          } else if (dx <= hw + 1.6 && tip > 2) {
            p.set(x, y, r.g, 0.28);
          }
        }
      }
      // crackle: short zig-zag arcs leaving the sheath
      const arcs = Math.max(3, Math.round(L / 9));
      for (let a = 0; a < arcs; a++) {
        let y = 3 + Math.floor(rng() * (L - 6));
        const side = rng() < 0.5 ? -1 : 1;
        let off = W / 2 - 0.5;
        const n = 2 + Math.floor(rng() * 3);
        for (let s = 0; s < n; s++) {
          off = Math.min(W / 2 + 2.4, off + 0.6 + rng() * 1.1);
          y += rng() < 0.5 ? -1 : 1;
          p.put(cx + side * off - 0.5, y, s === 0 ? r.w : r.c, 0.95);
        }
      }
      frames.push(p);
    }
    return frames;
  });
}

/** Plasma orb sizes (mortar): tiers 0..3. */
export const ORB_SIZES = [16, 18, 20, 22] as const;
/** Swirl frames of an orb. */
export const ORB_FRAMES = 4;

/** Heavy plasma orb with a rotating 3-arm swirl (4 frames, seamless loop). */
export function orbTex(scene: Phaser.Scene, color: ShotColor, tier: number): TexInfo {
  const S = ORB_SIZES[Math.max(0, Math.min(3, tier))];
  return build(scene, `ars_orb_${color}_${S}`, () => {
    const r = rampOf(color);
    const frames: Pix[] = [];
    const c = S / 2, R0 = S / 2;
    for (let f = 0; f < ORB_FRAMES; f++) {
      const p = new Pix(S, S);
      const rot = (f * (Math.PI * 2 / 3)) / ORB_FRAMES;
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const dx = x + 0.5 - c, dy = y + 0.5 - c;
          const d = Math.hypot(dx, dy) / R0;
          if (d > 1) continue;
          const ang = Math.atan2(dy, dx);
          const sw = Math.sin(3 * (ang - rot) + d * 5.5);
          let h = (1 - d) * 1.22 + 0.06;
          if (d > 0.3 && d < 0.86) h += sw > 0.55 ? 0.2 : sw < -0.6 ? -0.08 : 0;
          if (Math.hypot(dx + R0 * 0.28, dy + R0 * 0.3) < R0 * 0.16) h += 0.3;
          heat(r, h);
          p.set(x, y, SC, d > 0.9 ? SA * 0.55 : d > 0.8 ? SA * 0.85 : SA);
        }
      }
      frames.push(p);
    }
    return frames;
  });
}

/** Crystal bolt sizes (prism): tiers 0..2. */
export const CRYSTAL_SIZES: readonly (readonly [number, number])[] = [[7, 13], [9, 15], [11, 17]];

/** The 7 spectrum hues of the prism shards (red .. violet). */
export const SPECTRUM = [0xff5a5a, 0xffa040, 0xfff060, 0x6cff7c, 0x60e0ff, 0x7c8cff, 0xd27cff] as const;

/** Faceted white crystal (prism bolt), 2 frames: rainbow glints sparkle on its edges. */
export function crystalTex(scene: Phaser.Scene, tier: number): TexInfo {
  const [W, H] = CRYSTAL_SIZES[Math.max(0, Math.min(2, tier))];
  return build(scene, `ars_crystal_${W}`, () => {
    const frames: Pix[] = [];
    const cx = W / 2, mid = Math.round(H * 0.4);
    for (let f = 0; f < 2; f++) {
      const p = new Pix(W, H);
      for (let y = 0; y < H; y++) {
        const py = y + 0.5;
        const hw = py < mid ? (W / 2) * (py / mid) + 0.35 : (W / 2) * (1 - (py - mid) / (H - mid)) + 0.35;
        for (let x = 0; x < W; x++) {
          const px = x + 0.5 - cx;
          if (Math.abs(px) > hw) continue;
          const edge = Math.abs(px) > hw - 1;
          let col: number;
          if (Math.abs(px) < 0.6) col = 0xffffff;
          else if (px < 0) col = py < mid ? 0xf0f8ff : 0xc4dcff;
          else col = py < mid ? 0xcfe0ff : 0x8ca8ff;
          if (edge) {
            const g = (y + f * 3 + (px < 0 ? 0 : 2)) % 7;
            col = g < 2 ? SPECTRUM[(y * 2 + f * 3 + (px < 0 ? 0 : 4)) % 7] : mix(col, 0x7090ff, 0.35);
          }
          p.set(x, y, col, edge ? 0.92 : 1);
        }
      }
      // halo pixels around the widest row
      p.set(0, mid, 0xb0c8ff, 0.35);
      p.set(W - 1, mid, 0xb0c8ff, 0.35);
      frames.push(p);
    }
    return frames;
  });
}

/** Shard sizes (prism shards, shard drone): tiers 0..1. */
export const SHARD_SIZES: readonly (readonly [number, number])[] = [[5, 8], [6, 10]];

/** Small crystal shard in one hue: white core ridge, hue facets (nose up). */
export function shardTex(scene: Phaser.Scene, hue: number, tier: number): TexInfo {
  const [W, H] = SHARD_SIZES[Math.max(0, Math.min(1, tier))];
  return build(scene, `ars_shard_${hexKey(hue)}_${W}`, () => {
    const r = rampFrom(mix(hue, 0xffffff, 0.65), hue);
    const p = new Pix(W, H);
    const cx = W / 2, mid = Math.round(H * 0.35);
    for (let y = 0; y < H; y++) {
      const py = y + 0.5;
      const hw = py < mid ? (W / 2) * (py / mid) + 0.3 : (W / 2) * (1 - (py - mid) / (H - mid)) * 0.9 + 0.3;
      for (let x = 0; x < W; x++) {
        const px = x + 0.5 - cx;
        if (Math.abs(px) > hw) continue;
        let h = 1 - Math.abs(px) / (hw + 0.4);
        if (px > 0) h -= 0.12;
        if (py > H * 0.7) h -= 0.2;
        heat(r, h * 1.12);
        p.set(x, y, SC, SA);
      }
    }
    return [p];
  });
}

const METAL = { hi: 0xe4e0f0, lt: 0xb4b0c8, md: 0x7c7890, dk: 0x48445a, kk: 0x26232f };
const FLAME = { w: 0xffffff, y: 0xfff2a0, o: 0xffb040, r: 0xff6020 };

/** Missile kinds: 0 micro-missile (front seekers), 1 hunter (rear seekers), 2 rocket (drone). */
export type MissileKind = 0 | 1 | 2;
const MISSILE_MAPS: readonly (readonly string[])[] = [
  // 5 x 13 micro-missile
  ['..w..', '.wcw.', '.lHl.', '.hgh.', '.hmh.', '.hgh.', 'GhmhG', 'GmmmG', '.kkk.', '.yWy.', '.oyo.', '..o..', '..r..'],
  // 7 x 15 hunter (twin fins, wide body)
  ['...w...', '..wcw..', '..lHl..', '.lhmhl.', '.Ghggh.', '..hmh..', '..hgh..', 'G.hmh.G', 'GGhmhGG', 'GGmmmGG', '..kkk..', '..yWy..', '..oyo..', '..ooo..', '...r...'],
  // 7 x 15 rocket (stubby, striped)
  ['...w...', '..wcw..', '..cGc..', '.hHHHh.', '.hgggh.', '.hGGGh.', '.hmmmh.', '.hgggh.', 'GhGGGhG', 'GhmmmhG', 'G.kkk.G', '..yWy..', '..oyo..', '..ooo..', '...r...'],
];

/** Missile with a 2-frame exhaust flicker (frame 1 has a shorter, cooler flame). */
export function missileTex(scene: Phaser.Scene, color: ShotColor, kind: MissileKind): TexInfo {
  return build(scene, `ars_missile_${color}_${kind}`, () => {
    const r = rampOf(color);
    const map = MISSILE_MAPS[kind];
    const W = map[0].length, H = map.length;
    const pal: Record<string, [number, number]> = {
      w: [r.w, 1], c: [r.c, 1], l: [r.l, 1], G: [r.g, 1], H: [METAL.hi, 1], h: [METAL.lt, 1], m: [METAL.md, 1],
      g: [r.d, 1], k: [METAL.kk, 1], W: [FLAME.w, 1], y: [FLAME.y, 1], o: [FLAME.o, 0.9], r: [FLAME.r, 0.7],
    };
    const frames: Pix[] = [];
    for (let f = 0; f < 2; f++) {
      const p = new Pix(W, H);
      const flameStart = map.findIndex((row) => row.includes('W'));
      for (let y = 0; y < H; y++) {
        const row = map[y];
        for (let x = 0; x < W; x++) {
          let ch = row[x];
          if (f === 1 && y >= flameStart) {
            // shorter, cooler flame: shift the flame up one row and cool it
            const src = map[y + 1]?.[x] ?? '.';
            ch = y === flameStart ? (row[x] === 'W' ? 'y' : row[x] === 'y' ? 'o' : row[x]) : src === 'W' ? 'y' : src;
          }
          const e = pal[ch];
          if (e) p.set(x, y, e[0], e[1]);
        }
      }
      frames.push(p);
    }
    return frames;
  });
}

/** Mine sizes (caltrop dropper): tiers 0..2. */
export const MINE_SIZES = [11, 13, 15] as const;

/** Spiked proximity mine, 2 frames (beacon light on / dim). */
export function mineTex(scene: Phaser.Scene, color: ShotColor, tier: number): TexInfo {
  const S = MINE_SIZES[Math.max(0, Math.min(2, tier))];
  return build(scene, `ars_mine_${color}_${S}`, () => {
    const r = rampOf(color);
    const frames: Pix[] = [];
    const c = S / 2;
    const R0 = S * 0.3;
    for (let f = 0; f < 2; f++) {
      const p = new Pix(S, S);
      // spikes: 4 long orthogonal + 4 short diagonal
      const spikes: [number, number, number][] = [[0, -1, c - 0.5], [0, 1, c - 0.5], [-1, 0, c - 0.5], [1, 0, c - 0.5],
        [-0.7071, -0.7071, R0 + 1.6], [0.7071, -0.7071, R0 + 1.6], [-0.7071, 0.7071, R0 + 1.6], [0.7071, 0.7071, R0 + 1.6]];
      for (const [ux, uy, len] of spikes) {
        for (let t = R0 - 0.5; t <= len; t += 0.5) {
          const tipCol = t > len - 1 ? (f === 0 ? r.c : METAL.lt) : METAL.md;
          p.set(c + ux * t, c + uy * t, tipCol, 1);
        }
      }
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const dx = x + 0.5 - c, dy = y + 0.5 - c;
          const d = Math.hypot(dx, dy);
          if (d > R0 + 0.5) continue;
          const lit = (-dx - dy) / (R0 * 1.6);
          const col = d > R0 - 0.5 ? METAL.kk : lit > 0.35 ? METAL.lt : lit > -0.1 ? METAL.md : METAL.dk;
          p.put(x, y, col, 1);
          if (d < R0 * 0.55) {
            if (f === 0) p.put(x, y, d < R0 * 0.3 ? r.w : r.c, 1);
            else p.put(x, y, d < R0 * 0.3 ? r.l : r.d, 1);
          }
        }
      }
      frames.push(p);
    }
    return frames;
  });
}

/** Frames of the expanding ring shot (backlash arc). */
export const RING_FRAMES = 6;

/** Expanding energy ring (rear arc), 6 frames over the shot's life: 9 -> 21 px across. */
export function ringShotTex(scene: Phaser.Scene, color: ShotColor): TexInfo {
  const S = 23;
  return build(scene, `ars_ring_${color}`, () => {
    const r = rampOf(color);
    const frames: Pix[] = [];
    const c = S / 2;
    for (let f = 0; f < RING_FRAMES; f++) {
      const t = f / (RING_FRAMES - 1);
      const ro = 4.6 + 6 * t;
      const th = 2.6 - 1.1 * t;
      const p = new Pix(S, S);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
          if (d > ro || d < ro - th) continue;
          const u = (ro - d) / th; // 0 outer edge .. 1 inner edge
          heat(r, (u < 0.45 ? 1 : 0.62) * (1 - t * 0.35));
          p.set(x, y, SC, SA * (1 - t * 0.35));
        }
      }
      frames.push(p);
    }
    return frames;
  });
}

/** Frames of the flame puff (rear torch). */
export const FLAME_FRAMES = 8;

/** Flame puff growing 5 -> 21 px and cooling white -> core -> glow -> embers -> smoke. */
export function flameTex(scene: Phaser.Scene, color: ShotColor): TexInfo {
  const S = 23;
  return build(scene, `ars_flame_${color}`, () => {
    const r = rampOf(color);
    const smoke = 0x40343a;
    const frames: Pix[] = [];
    const c = S / 2;
    for (let f = 0; f < FLAME_FRAMES; f++) {
      const t = f / (FLAME_FRAMES - 1);
      const R0 = 2.6 + 8 * Math.pow(t, 0.8);
      const p = new Pix(S, S);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const px = x + 0.5, py = y + 0.5;
          const n = fbm(px / 3.2 + f * 0.7, py / 3.2 - f * 0.9, 77, 2) - 0.5;
          const d = (Math.hypot(px - c, py - c) + n * (1.5 + 3 * t)) / R0;
          if (d > 1) continue;
          const hh = (1 - d) * (1.25 - t * 1.1) + 0.05;
          let col: number;
          let a = 1;
          if (hh > 0.85) col = r.w;
          else if (hh > 0.62) col = r.c;
          else if (hh > 0.42) col = r.l;
          else if (hh > 0.26) col = r.g;
          else if (hh > 0.12) col = r.d;
          else { col = smoke; a = 0.55; }
          a *= 1 - t * 0.45;
          if (d > 0.82 && bayer(x, y) > 0.55) continue;
          p.set(x, y, col, a);
        }
      }
      frames.push(p);
    }
    return frames;
  });
}

// ------------------------------------------------------------------ FX sheets

/** Muzzle flash sizes (odd: true centre pixel), tiers 0..3. */
export const MUZZLE_SIZES = [9, 13, 17, 21] as const;
/** Frames of a muzzle flash. */
export const MUZZLE_FRAMES = 3;

function ray(p: Pix, r: Ramp, c: number, ux: number, uy: number, from: number, to: number, h0: number, h1: number, wide: boolean): void {
  for (let t = from; t <= to; t += 0.5) {
    const k = to > from ? (t - from) / (to - from) : 0;
    heat(r, h0 + (h1 - h0) * k);
    const x = c + ux * t, y = c + uy * t;
    p.set(x, y, SC, SA);
    if (wide) {
      p.set(x + uy, y - ux, SC, SA * 0.7);
      p.set(x - uy, y + ux, SC, SA * 0.7);
    }
  }
}

function disc(p: Pix, c: number, rad: number, rgb: number, a: number): void {
  for (let y = Math.floor(c - rad); y <= Math.ceil(c + rad); y++) {
    for (let x = Math.floor(c - rad); x <= Math.ceil(c + rad); x++) {
      if (Math.hypot(x + 0.5 - c, y + 0.5 - c) <= rad) p.set(x, y, rgb, a);
    }
  }
}

/** Star-shaped muzzle flash (forward = UP), 3 frames: burst, cooling star, sparks. */
export function muzzleTex(scene: Phaser.Scene, color: ShotColor, tier: number): TexInfo {
  const S = MUZZLE_SIZES[Math.max(0, Math.min(3, tier))];
  return build(scene, `ars_muzzle_${color}_${S}`, () => {
    const r = rampOf(color);
    const c = S / 2;
    const R = (S - 1) / 2;
    const wide = S >= 13;
    const f0 = new Pix(S, S);
    disc(f0, c, R * 0.62, r.g, 0.35);
    disc(f0, c, R * 0.38, r.c, 1);
    disc(f0, c, R * 0.22, r.w, 1);
    ray(f0, r, c, 0, -1, R * 0.2, R, 1, 0.3, wide);
    ray(f0, r, c, -1, 0, R * 0.2, R * 0.62, 0.9, 0.3, false);
    ray(f0, r, c, 1, 0, R * 0.2, R * 0.62, 0.9, 0.3, false);
    ray(f0, r, c, 0, 1, R * 0.2, R * 0.36, 0.8, 0.4, false);
    ray(f0, r, c, -0.7071, -0.7071, R * 0.25, R * 0.6, 0.75, 0.3, false);
    ray(f0, r, c, 0.7071, -0.7071, R * 0.25, R * 0.6, 0.75, 0.3, false);
    const f1 = new Pix(S, S);
    disc(f1, c, R * 0.5, r.g, 0.3);
    disc(f1, c, R * 0.28, r.l, 1);
    disc(f1, c, R * 0.14, r.w, 1);
    ray(f1, r, c, 0, -1, R * 0.3, R * 0.85, 0.7, 0.2, false);
    ray(f1, r, c, -0.7071, -0.7071, R * 0.3, R * 0.7, 0.55, 0.15, false);
    ray(f1, r, c, 0.7071, -0.7071, R * 0.3, R * 0.7, 0.55, 0.15, false);
    ray(f1, r, c, -1, 0, R * 0.3, R * 0.5, 0.5, 0.2, false);
    ray(f1, r, c, 1, 0, R * 0.3, R * 0.5, 0.5, 0.2, false);
    const f2 = new Pix(S, S);
    disc(f2, c, R * 0.16, r.l, 0.9);
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k - 2.5) * 0.55;
      f2.set(c + Math.cos(a) * R * 0.78, c + Math.sin(a) * R * 0.78, k === 2 || k === 3 ? r.c : r.g, 0.85);
    }
    return [f0, f1, f2];
  });
}

/** Impact spark sizes, tiers 0..2. */
export const SPARK_SIZES = [9, 13, 17] as const;
/** Frames of an impact spark. */
export const SPARK_FRAMES = 4;

/** Impact star: white-hot core, 8 rays flying out and cooling (4 frames). */
export function sparkTex(scene: Phaser.Scene, color: ShotColor, tier: number): TexInfo {
  const S = SPARK_SIZES[Math.max(0, Math.min(2, tier))];
  return build(scene, `ars_spark_${color}_${S}`, () => {
    const r = rampOf(color);
    const c = S / 2;
    const R = (S - 1) / 2;
    const frames: Pix[] = [];
    const dirs: [number, number, number][] = [[0, -1, 1], [1, 0, 1], [0, 1, 1], [-1, 0, 1],
      [0.7071, -0.7071, 0.7], [0.7071, 0.7071, 0.7], [-0.7071, 0.7071, 0.7], [-0.7071, -0.7071, 0.7]];
    for (let f = 0; f < SPARK_FRAMES; f++) {
      const p = new Pix(S, S);
      if (f === 0) {
        disc(p, c, R * 0.42, r.c, 1);
        disc(p, c, R * 0.26, r.w, 1);
        for (const [ux, uy, k] of dirs) ray(p, r, c, ux, uy, R * 0.3, R * 0.62 * k, 0.95, 0.5, false);
      } else if (f === 1) {
        disc(p, c, R * 0.2, r.w, 1);
        for (const [ux, uy, k] of dirs) ray(p, r, c, ux, uy, R * 0.28, R * 0.95 * k, 0.75, 0.3, false);
      } else if (f === 2) {
        disc(p, c, R * 0.12, r.l, 0.8);
        for (const [ux, uy, k] of dirs) ray(p, r, c, ux, uy, R * 0.62 * k, R * k, 0.45, 0.2, false);
      } else {
        for (const [ux, uy, k] of dirs) p.set(c + ux * R * k, c + uy * R * k, r.d, 0.7);
      }
      frames.push(p);
    }
    return frames;
  });
}

/** Additive flash sizes (white, tinted), tiers 0..5. */
export const FLASH_SIZES = [11, 15, 23, 31, 47, 63] as const;
/** Frames of a flash. */
export const FLASH_FRAMES = 4;

/** Soft stepped flash disc (white, meant to be tinted): pops, swells and fades (4 frames). */
export function flashTex(scene: Phaser.Scene, tier: number): TexInfo {
  const S = FLASH_SIZES[Math.max(0, Math.min(5, tier))];
  return build(scene, `ars_flash_${S}`, () => {
    const c = S / 2;
    const R = S / 2;
    const rad = [0.62, 1, 0.92, 0.75];
    const amp = [1, 0.75, 0.42, 0.18];
    const frames: Pix[] = [];
    for (let f = 0; f < FLASH_FRAMES; f++) {
      const p = new Pix(S, S);
      const rr = R * rad[f];
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / rr;
          if (d > 1) continue;
          const a = d < 0.34 ? 1 : d < 0.62 ? 0.62 : d < 0.84 ? 0.34 : 0.14;
          p.set(x, y, 0xffffff, a * amp[f]);
        }
      }
      frames.push(p);
    }
    return frames;
  });
}

/** Static stepped glow of an exact odd diameter (white, tinted; additive halos). */
export function glowTex(scene: Phaser.Scene, size: number): TexInfo {
  const S = Math.max(5, Math.round(size) | 1);
  return build(scene, `ars_glow_${S}`, () => {
    const p = new Pix(S, S);
    const c = S / 2, R = S / 2;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / R;
        if (d > 1) continue;
        p.set(x, y, 0xffffff, d < 0.3 ? 0.85 : d < 0.55 ? 0.55 : d < 0.78 ? 0.3 : 0.12);
      }
    }
    return [p];
  });
}

/** Frames of a splash ring. */
export const BLAST_FRAMES = 7;

/**
 * Splash shockwave of exact radius `radius` (px): a filled flash that turns into a ring
 * expanding to the full radius with a white leading edge, cooling and fading (7 frames).
 */
export function blastTex(scene: Phaser.Scene, color: ShotColor, radius: number): TexInfo {
  const R = Math.max(8, Math.round(radius));
  return build(scene, `ars_blast_${color}_${R}`, () => {
    const r = rampOf(color);
    const S = 2 * R + 5;
    const c = S / 2;
    const frames: Pix[] = [];
    for (let f = 0; f < BLAST_FRAMES; f++) {
      const t = f / (BLAST_FRAMES - 1);
      const ease = 1 - Math.pow(1 - t, 2.2);
      const ro = R * (0.34 + 0.66 * ease);
      const th = Math.max(1.2, 4.2 - 3.2 * t) * (R >= 30 ? 1.25 : 1);
      const fill = t < 0.35 ? 0.45 * (1 - t / 0.35) : 0;
      const fade = 1 - 0.65 * t * t;
      const p = new Pix(S, S);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
          if (d > ro + 0.01) continue;
          if (d >= ro - th) {
            const u = (ro - d) / th; // 0 = leading edge
            const h = u < 0.34 ? (t < 0.6 ? 1 : 0.7) : u < 0.7 ? 0.66 : 0.4;
            heat(r, h * (1 - 0.3 * t));
            p.set(x, y, SC, SA * fade);
          } else if (fill > 0) {
            const k = d / ro;
            if (bayer(x, y) < 0.75 - k * 0.4) p.set(x, y, k < 0.4 ? r.c : r.g, fill * (1.1 - k));
          }
        }
      }
      frames.push(p);
    }
    return frames;
  });
}

/** Frames of a smoke puff. */
export const SMOKE_FRAMES = 5;

/** Small grey smoke puff (NORMAL blend): grows 3 -> 9 px, lightens and thins out. */
export function smokeTex(scene: Phaser.Scene): TexInfo {
  const S = 9;
  return build(scene, 'ars_smoke', () => {
    const frames: Pix[] = [];
    const c = S / 2;
    for (let f = 0; f < SMOKE_FRAMES; f++) {
      const t = f / (SMOKE_FRAMES - 1);
      const R = 1.7 + 2.8 * t;
      const p = new Pix(S, S);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const dx = x + 0.5 - c, dy = y + 0.5 - c;
          const d = Math.hypot(dx, dy) / R;
          if (d > 1) continue;
          if (d > 0.7 && bayer(x + f, y) > 0.6 - t * 0.3) continue;
          const lit = -dx - dy > 0;
          const col = lit ? mix(0xd8d0d4, 0x8c8490, t) : mix(0x9c9498, 0x5c5460, t);
          p.set(x, y, col, (0.72 - 0.5 * t) * (d > 0.7 ? 0.7 : 1));
        }
      }
      frames.push(p);
    }
    return frames;
  });
}

/** Frames of a crackle zap. */
export const ZAP_FRAMES = 3;

/** Tiny electric zig-zag (lance crackle, charge beam), 3 frames. */
export function zapTex(scene: Phaser.Scene, color: ShotColor): TexInfo {
  const S = 9;
  return build(scene, `ars_zap_${color}`, () => {
    const r = rampOf(color);
    const frames: Pix[] = [];
    const paths: readonly (readonly [number, number][])[] = [
      [[1, 4], [2, 3], [3, 4], [4, 3], [5, 2], [6, 3], [7, 2]],
      [[4, 0], [3, 1], [4, 2], [5, 3], [4, 4], [3, 5], [4, 6], [5, 7]],
      [[1, 7], [2, 6], [2, 5], [3, 4], [4, 4], [5, 3], [6, 3], [7, 1]],
    ];
    for (let f = 0; f < ZAP_FRAMES; f++) {
      const p = new Pix(S, S);
      const path = paths[f];
      for (let i = 0; i < path.length; i++) {
        const [x, y] = path[i];
        p.set(x, y, i === Math.floor(path.length / 2) ? r.w : i % 2 ? r.c : r.l, 1);
        p.set(x + 1, y, r.g, 0.4);
      }
      frames.push(p);
    }
    return frames;
  });
}

/** Frames of the orbiter ward ring. */
export const WARD_FRAMES = 4;

/** Dashed ward ring (orbiter blocker radius ~8 px) that turns over its 4 frames (white, tinted). */
export function wardTex(scene: Phaser.Scene): TexInfo {
  const S = 21;
  return build(scene, 'ars_ward', () => {
    const frames: Pix[] = [];
    const c = S / 2;
    for (let f = 0; f < WARD_FRAMES; f++) {
      const p = new Pix(S, S);
      const off = (f / WARD_FRAMES) * (Math.PI / 4);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const dx = x + 0.5 - c, dy = y + 0.5 - c;
          const d = Math.hypot(dx, dy);
          if (d > 9.6 || d < 7.4) continue;
          const seg = Math.floor(((Math.atan2(dy, dx) + Math.PI + off) / (Math.PI * 2)) * 16) % 2;
          if (d > 8.6) p.set(x, y, 0xffffff, seg === 0 ? 0.95 : 0.22);
          else p.set(x, y, 0xffffff, seg === 0 ? 0.4 : 0.1);
        }
      }
      frames.push(p);
    }
    return frames;
  });
}

/** 1x1 and 2x2 white pixels (embers, tinted). */
export function pixelTex(scene: Phaser.Scene, size: 1 | 2): TexInfo {
  return build(scene, `ars_px${size}`, () => {
    const p = new Pix(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) p.put(x, y, 0xffffff, 1);
    return [p];
  });
}

/** Charge-beam column widths (frames, widest first): rows are uniform, so it stretches vertically. */
export const COLUMN_WIDTHS = [18, 14, 10, 6] as const;

/**
 * Charge-drone beam column: 4 frames of decreasing width (18 / 14 / 10 / 6 px core), each
 * 8 rows high with identical rows (vertical stretching keeps every pixel crisp).
 */
export function columnTex(scene: Phaser.Scene, color: ShotColor): TexInfo {
  const TW = COLUMN_WIDTHS[0] + 6;
  return build(scene, `ars_column_${color}`, () => {
    const r = rampOf(color);
    const frames: Pix[] = [];
    const cx = TW / 2;
    for (let f = 0; f < COLUMN_WIDTHS.length; f++) {
      const hw = COLUMN_WIDTHS[f] / 2;
      const p = new Pix(TW, 8);
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < TW; x++) {
          const dx = Math.abs(x + 0.5 - cx);
          if (dx <= hw) {
            heat(r, (1 - dx / (hw + 0.6)) * 1.25);
            p.set(x, y, SC, SA);
          } else if (dx <= hw + 2.5) {
            p.set(x, y, r.g, dx <= hw + 1.2 ? 0.4 : 0.16);
          }
        }
      }
      frames.push(p);
    }
    return frames;
  });
}
