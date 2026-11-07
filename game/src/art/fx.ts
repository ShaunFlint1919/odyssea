// =====================================================================================
//  FX ART — explosions, sparks, smoke, muzzle flash, shockwave, shield bubble, debris,
//  particles, glow, engine flame and the hazard stripe; plus every animation in ANIM
//  (except ANIM.spinner, registered by the enemy art module per palette).
//  Frame counts / sizes follow FX_SPRITES in src/art/keys.ts.
// =====================================================================================
import Phaser from 'phaser';
import { ANIM, FX_SPRITES, PICKUP_SPRITES, SIDEKICK_SPRITES } from './keys';
import { addSheet, addTexture, bayer, outlineCanvas, radialGlow } from './pixel';
import { PixBuf, clamp, easeOut, fillConvex, smoothstep, type Vec2 } from './a_fx_core';
import { explosionFrames, SMOKE_RAMP } from './a_fx_explosion';
import { fbm } from './noise';

/** Engine flame frame size: 8 x 12 px, nozzle on the top row, flame points DOWN. */
export const ENGINE_FLAME_SIZE = { w: 8, h: 12 } as const;

/**
 * Extra looping idle animations created by registerAnimations() for 2-frame sheets that are
 * not in ANIM: every sidekick (glow pulse) and the blinking pickups (pk_armor, pk_shield,
 * pk_power, pk_intel). Key = idleAnimKey(textureKey), e.g. 'anim_sk_pod', 'anim_pk_power'.
 */
export const idleAnimKey = (textureKey: string): string => `anim_${textureKey}`;

const BLINK_PICKUPS = PICKUP_SPRITES.filter((k) => !k.startsWith('pk_credit'));

/** Paint a char map into a buffer; cols maps char -> [colour, alpha]. */
function stampMap(buf: PixBuf, rows: string[], cols: Record<string, [string, number]>, ox = 0, oy = 0): void {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = cols[row[x]];
      if (c) buf.put(ox + x, oy + y, c[0], c[1]);
    }
  });
}

// ------------------------------------------------------------------ spark (impact)

const SPARK_COLS: Record<string, [string, number]> = {
  W: ['#ffffff', 1], y: ['#fff3a8', 1], o: ['#ffb040', 1], r: ['#e8581c', 1],
};

/** Impact spark: white-hot star whose rays fly out and cool (4 frames, 8x8, centre at 3.5). */
function sparkFrames(): HTMLCanvasElement[] {
  const frames = [
    ['...o...', '.o.y.o.', '..yWy..', 'oyWWWyo', '..yWy..', '.o.y.o.', '...o...'],
    ['o..y..o', '.o.y.o.', '...W...', 'yyWWWyy', '...W...', '.o.y.o.', 'o..y..o'],
    ['r.....r', '...o...', '...y...', '.oyWyo.', '...y...', '...o...', 'r.....r'],
    ['.......', '.......', '...r...', '..roo..', '...r...', '.......', '.......'],
  ];
  return frames.map((rows) => {
    const b = new PixBuf(8, 8);
    stampMap(b, rows, SPARK_COLS);
    return b.toCanvas();
  });
}

// ------------------------------------------------------------------ muzzle flash

const MUZZLE_COLS: Record<string, [string, number]> = {
  w: ['#ffffff', 1], L: ['#e2e7ff', 1], m: ['#a4aed6', 0.62],
};

/** Neutral (white / pale steel) muzzle flash with a forward (UP) spike: tint it or use as is. */
function muzzleFrames(): HTMLCanvasElement[] {
  const frames = [
    ['....mm....', '....LL....', '...mLLm...', '...LwwL...', '.m.LwwL.m.', 'mLLwwwwLLm', '.mLwwwwLm.', '..mLwwLm..', '...mLLm...', '....mm....'],
    ['..........', '....mm....', '....LL....', '...mLLm...', '...LwwL...', '.mLwwwwLm.', '..mLwwLm..', '...mLLm...', '....mm....', '..........'],
    ['..........', '..........', '....mm....', '....LL....', '...mLLm...', '..mLwwLm..', '...mLLm...', '....mm....', '..........', '..........'],
  ];
  return frames.map((rows) => {
    const b = new PixBuf(10, 10);
    stampMap(b, rows, MUZZLE_COLS);
    return b.toCanvas();
  });
}

// ------------------------------------------------------------------ smoke puff

/** Sphere-lit cluster of billows that grows, drifts and erodes (6 frames, 16x16). */
function smokeFrames(): HTMLCanvasElement[] {
  const size = 16, n = 6;
  const puffs = [
    { x: 8.2, y: 8.8, r: 5.1, z: 0.5, die: 1.2 },
    { x: 5.9, y: 6.6, r: 3.7, z: 1, die: 1.0 },
    { x: 10.6, y: 6.9, r: 3.4, z: 0.7, die: 1.08 },
    { x: 6.4, y: 10.6, r: 2.9, z: 0.2, die: 0.9 },
  ];
  const out: HTMLCanvasElement[] = [];
  for (let f = 0; f < n; f++) {
    const t = f / (n - 1);
    const buf = new PixBuf(size, size);
    const zbuf = new Float32Array(size * size).fill(-1);
    for (const p of puffs) {
      const u = clamp(t / p.die);
      if (u >= 1) continue;
      const fade = smoothstep(0.45, 1, u);
      const rr = p.r * (0.5 + 0.5 * easeOut(u * 2)) * (1 - 0.5 * fade);
      const px0 = p.x + (p.x - 8) * 0.25 * t, py0 = p.y - 1.2 * t;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const ox = (x + 0.5 - px0) / rr, oy = (y + 0.5 - py0) / rr;
        const d2 = ox * ox + oy * oy;
        if (d2 >= 1) continue;
        if (1 - Math.sqrt(d2) - fade * 0.45 + (bayer(x, y) - 0.5) * 0.24 <= 0) continue;
        const nz = Math.sqrt(1 - d2);
        const h = nz * rr + p.z * 2;
        if (h <= zbuf[y * size + x]) continue;
        zbuf[y * size + x] = h;
        const v = -ox * 0.5 - oy * 0.65 + nz * 0.55 - t * 0.18;
        buf.put(x, y, SMOKE_RAMP[v > 0.72 ? 0 : v > 0.42 ? 1 : v > 0.12 ? 2 : v > -0.22 ? 3 : 4]);
      }
    }
    out.push(buf.toCanvas());
  }
  return out;
}

// ------------------------------------------------------------------ shockwave ring

/** Expanding ring, white / pale steel (tint it if needed): sharp leading edge, fades out. */
function shockwaveFrames(): HTMLCanvasElement[] {
  const size = 64, n = 6, c = 32, seed = 4711;
  const out: HTMLCanvasElement[] = [];
  for (let f = 0; f < n; f++) {
    const t = f / (n - 1);
    const r = 7 + 23.5 * easeOut(t, 1.7);
    const th = 3.8 - 2.4 * t;
    const alpha = 1 - smoothstep(0.3, 1, t) * 0.72;
    const buf = new PixBuf(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const px = x + 0.5 - c, py = y + 0.5 - c;
      const d = Math.hypot(px, py);
      const ang = Math.atan2(py, px);
      const wob = (fbm(Math.cos(ang) * 2 + 5, Math.sin(ang) * 2 + 5, seed + f, 2) - 0.5) * 1.4;
      const u = (d - (r + wob)) / th; // 0 at the leading edge, negative inside
      if (u > 0.3 || u < -1.5) continue;
      const v = u > 0 ? 1 - u / 0.3 : 1 + u / 1.5;
      if (v < 0.18) continue;
      const lit = px * -0.6 + py * -0.8 > 0 ? 0.1 : -0.05;
      const k = v + lit;
      const col = k > 0.84 ? '#ffffff' : k > 0.6 ? '#dfe6ff' : k > 0.38 ? '#a9b4dc' : '#7884b0';
      buf.put(x, y, col, alpha * (k > 0.6 ? 1 : 0.75));
    }
    out.push(buf.toCanvas());
  }
  return out;
}

// ------------------------------------------------------------------ shield bubble

/** Translucent hex-patterned bubble (white / pale blue so a runtime tint gives its colour). */
function shieldBubble(): HTMLCanvasElement {
  const size = 40, c = 20, R = 19.2;
  const buf = new PixBuf(size, size);
  const hexR = 4.4; // hex cell radius (pointy-top)
  const sq3 = Math.sqrt(3);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = x + 0.5 - c, py = y + 0.5 - c;
    const d = Math.hypot(px, py);
    if (d > R) continue;
    const e = d / R; // 0 centre .. 1 rim
    // spherical-ish mapping so cells shrink towards the rim
    const k = e > 0.001 ? Math.asin(Math.min(1, e)) / (Math.PI / 2) / e : 1;
    const ux = px * k * 1.3, uy = py * k * 1.3;
    // cube coordinates of the hex cell + offset inside it
    const q = (sq3 / 3 * ux - uy / 3) / hexR;
    const rr = (2 / 3 * uy) / hexR;
    const cx = q, cz = rr, cy = -q - rr;
    let rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz);
    const dx = Math.abs(rx - cx), dy = Math.abs(ry - cy), dz = Math.abs(rz - cz);
    if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
    const fx = cx - rx, fy = cy - ry, fz = cz - rz;
    const edge = Math.max(Math.abs(fx - fy), Math.abs(fy - fz), Math.abs(fz - fx));
    let a = 0.04 + 0.12 * e * e * e;
    let col = '#e8f0ff';
    if (edge > 0.86) { a = 0.08 + 0.4 * e * e; col = '#d4e4ff'; }
    if (e > 0.84) { a = Math.max(a, 0.28 + (e - 0.84) * 2.6); col = '#e4eeff'; }
    if (d > R - 1.25) { a = 0.95; col = '#ffffff'; }
    // specular arc top-left
    const ang = Math.atan2(py, px);
    const da = Math.abs(((ang + Math.PI * 0.75 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (e > 0.64 && e < 0.8 && da < 0.4) { a = 0.8; col = '#ffffff'; }
    buf.put(x, y, col, a);
  }
  buf.put(11, 10, '#ffffff', 1); buf.put(10, 11, '#ffffff', 0.85);
  return buf.toCanvas();
}

// ------------------------------------------------------------------ debris

const DEBRIS_RAMP = ['#e2deec', '#a29cb6', '#6a6482', '#3e3a52'];

/** Small tumbling metal shard (4 frames, 6x6), lit top-left, with a glowing hot corner. */
function debrisFrames(): HTMLCanvasElement[] {
  const shape: Vec2[] = [[-1.9, -1.2], [0.6, -1.9], [2.0, 0.4], [-0.2, 1.9], [-1.6, 0.9]];
  const out: HTMLCanvasElement[] = [];
  for (let f = 0; f < 4; f++) {
    const ang = f * (Math.PI / 2.4);
    const sx = [1, 0.55, 1, 0.55][f];
    const pts: Vec2[] = shape.map(([x, y]) => {
      const X = x * sx, Y = y;
      return [3 + X * Math.cos(ang) - Y * Math.sin(ang), 3 + X * Math.sin(ang) + Y * Math.cos(ang)];
    });
    const buf = new PixBuf(6, 6);
    let hot: [number, number] | null = null;
    fillConvex(pts, (x, y) => {
      if (x < 1 || y < 1 || x > 4 || y > 4) return;
      const lit = (3 - (x + 0.5)) * 0.6 + (3 - (y + 0.5)) * 0.8 + (f % 2 ? -0.6 : 0.3);
      buf.put(x, y, DEBRIS_RAMP[lit > 1.2 ? 0 : lit > 0.2 ? 1 : lit > -0.9 ? 2 : 3]);
      if (!hot || x + y > hot[0] + hot[1]) hot = [x, y];
    });
    if (hot) buf.put(hot[0], hot[1], f < 2 ? '#ff9a2a' : '#c84a1a');
    out.push(outlineCanvas(buf.toCanvas(), '#0a0810'));
  }
  return out;
}

// ------------------------------------------------------------------ engine flame

const FLAME_RAMP = ['#ffffff', '#fff4b4', '#ffd050', '#ff9a26', '#f05a1c', '#b0341a'];

/** 8 x 12 engine flame pointing DOWN (nozzle on row 0), 4 flicker frames. */
function engineFrames(): HTMLCanvasElement[] {
  const { w, h } = ENGINE_FLAME_SIZE;
  const lens = [11.6, 9.4, 12, 10.4];
  const wob = [0, 0.5, -0.45, 0.25];
  const swell = [0, 0.25, -0.15, 0.1];
  const out: HTMLCanvasElement[] = [];
  for (let f = 0; f < 4; f++) {
    const buf = new PixBuf(w, h);
    const len = lens[f];
    for (let y = 0; y < h; y++) {
      const v = (y + 0.5) / len;
      if (v > 1) continue;
      // teardrop: rounded at the nozzle, widest just below it, tapering to the tip
      const hw = 3.2 * Math.sin(Math.min(1, (y + 1.2) / 3.2) * Math.PI / 2) * Math.pow(1 - v, 0.7) + swell[f] + Math.sin(y * 1.9 + f * 2.3) * 0.2;
      for (let x = 0; x < w; x++) {
        const dx = x + 0.5 - 4 - wob[f] * v;
        const u = Math.abs(dx) / Math.max(0.55, hw);
        if (u > 1) continue;
        const heat = (1 - u * 0.8) * (1 - Math.pow(v, 1.15));
        const i = heat > 0.74 ? 0 : heat > 0.56 ? 1 : heat > 0.4 ? 2 : heat > 0.25 ? 3 : heat > 0.11 ? 4 : 5;
        buf.put(x, y, FLAME_RAMP[i], i >= 5 ? 0.8 : 1);
      }
    }
    if (f === 1) buf.put(4, 10, FLAME_RAMP[4]);
    if (f === 3) buf.put(3, 11, FLAME_RAMP[5], 0.8);
    out.push(buf.toCanvas());
  }
  return out;
}

// ------------------------------------------------------------------ warning stripe

/** 64 x 16 yellow / black hazard stripe, seamless horizontally. */
function warningStripe(): HTMLCanvasElement {
  const w = 64, h = 16;
  const buf = new PixBuf(w, h);
  const yellow = (x: number, y: number) => ((((x + y) % 16) + 16) % 16) < 8;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (y === 0 || y === h - 1) { buf.put(x, y, '#0a0810'); continue; }
    const yl = yellow(x, y);
    let col: string;
    if (y === 1) col = yl ? '#fff3a0' : '#4a4658';
    else if (y === h - 2) col = yl ? '#b07c0c' : '#08070c';
    else if (yl) {
      const edgeR = !yellow(x + 1, y);
      const edgeL = !yellow(x - 1, y);
      col = edgeR ? '#e0a418' : edgeL ? '#ffe46a' : '#ffcc2a';
    } else {
      col = yellow(x - 1, y) ? '#2a2733' : '#17141e';
    }
    buf.put(x, y, col);
  }
  return buf.toCanvas();
}

/** Generates every FX_SPRITES texture (see keys.ts for sizes and frame counts). */
export function generateFxArt(scene: Phaser.Scene): void {
  addSheet(scene, 'fx_explosion_s', explosionFrames({
    size: FX_SPRITES.fx_explosion_s, frames: 8, seed: 1307, lobes: 4, spread: 0.45, late: 0.3, embers: 5, chunks: 0, noise: 0.22, spikes: 5,
  }));
  addSheet(scene, 'fx_explosion_m', explosionFrames({
    size: FX_SPRITES.fx_explosion_m, frames: 10, seed: 2741, lobes: 6, spread: 0.52, late: 0.4, embers: 9, chunks: 3, noise: 0.25, spikes: 6,
  }));
  addSheet(scene, 'fx_explosion_l', explosionFrames({
    size: FX_SPRITES.fx_explosion_l, frames: 12, seed: 5099, lobes: 10, spread: 0.56, late: 0.55, embers: 14, chunks: 6, noise: 0.26, spikes: 7,
  }));
  addSheet(scene, 'fx_spark', sparkFrames());
  addSheet(scene, 'fx_smoke', smokeFrames());
  addSheet(scene, 'fx_muzzle', muzzleFrames());
  addSheet(scene, 'fx_shockwave', shockwaveFrames());
  addTexture(scene, 'fx_shield_bubble', shieldBubble());
  addSheet(scene, 'fx_debris', debrisFrames());
  const px = new PixBuf(2, 2);
  px.rect(0, 0, 2, 2, '#ffffff');
  addTexture(scene, 'fx_pixel', px.toCanvas());
  addTexture(scene, 'fx_glow', radialGlow(FX_SPRITES.fx_glow, '#ffffff', 2));
  addSheet(scene, 'fx_engine', engineFrames());
  addTexture(scene, 'fx_warning', warningStripe());
}

/** Create a frame-sequence animation over every numbered frame of a sheet (guarded). */
function makeAnim(scene: Phaser.Scene, key: string, texture: string, frameRate: number, repeat: number): void {
  if (scene.anims.exists(key) || !scene.textures.exists(texture)) return;
  const tex = scene.textures.get(texture);
  const n = Math.max(1, tex.frameTotal - 1); // frameTotal counts __BASE
  scene.anims.create({
    key,
    frames: Array.from({ length: n }, (_, i) => ({ key: texture, frame: i })),
    frameRate,
    repeat,
  });
}

/** Registers every animation listed in ANIM (src/art/keys.ts). Called after all textures exist. */
export function registerAnimations(scene: Phaser.Scene): void {
  makeAnim(scene, ANIM.explosion_s, 'fx_explosion_s', 20, 0);
  makeAnim(scene, ANIM.explosion_m, 'fx_explosion_m', 20, 0);
  makeAnim(scene, ANIM.explosion_l, 'fx_explosion_l', 18, 0);
  makeAnim(scene, ANIM.spark, 'fx_spark', 24, 0);
  makeAnim(scene, ANIM.smoke, 'fx_smoke', 12, 0);
  makeAnim(scene, ANIM.muzzle, 'fx_muzzle', 24, 0);
  makeAnim(scene, ANIM.shockwave, 'fx_shockwave', 20, 0);
  makeAnim(scene, ANIM.debris, 'fx_debris', 16, 0);
  makeAnim(scene, ANIM.engine, 'fx_engine', 20, -1);
  makeAnim(scene, ANIM.credit_s, 'pk_credit_s', 12, -1);
  makeAnim(scene, ANIM.credit_m, 'pk_credit_m', 12, -1);
  makeAnim(scene, ANIM.credit_l, 'pk_credit_l', 12, -1);
  for (const id of SIDEKICK_SPRITES) makeAnim(scene, idleAnimKey(id), id, 4, -1);
  for (const id of BLINK_PICKUPS) makeAnim(scene, idleAnimKey(id), id, 5, -1);
}
