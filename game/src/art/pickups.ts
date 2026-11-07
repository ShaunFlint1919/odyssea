// =====================================================================================
//  PICKUP ART — spinning credit gems (6-frame sheets) and blinking power-ups (2 frames).
//   pk_credit_s 10x10 teal, pk_credit_m 12x12 gold, pk_credit_l 16x16 magenta: faceted
//   brilliants rendered with a tiny flat-shaded polyhedron rasteriser (light top-left),
//   spinning 180 degrees over 6 frames (loops seamlessly, see ANIM.credit_*).
//   pk_armor (orange repair badge), pk_shield (blue hexagon), pk_power (yellow-green P orb
//   with arrows), pk_intel (cyan data chip): 16x16, frame 0 normal, frame 1 bright blink.
// =====================================================================================
import Phaser from 'phaser';
import { addSheet, outlineCanvas } from './pixel';
import { PixBuf, LIGHT, clamp, dot3, fillConvex, norm3, renderPolyhedron, type Vec2, type Vec3 } from './a_fx_core';

type Ramp5 = [string, string, string, string, string];

// ------------------------------------------------------------------ credit gems

interface GemStyle { size: number; height: number; ramp: Ramp5; outline: string }

const GEMS: Record<'pk_credit_s' | 'pk_credit_m' | 'pk_credit_l', GemStyle> = {
  pk_credit_s: { size: 10, height: 8, ramp: ['#05302e', '#0b5f58', '#14998c', '#2ed8c0', '#9cfaea'], outline: '#03120f' },
  pk_credit_m: { size: 12, height: 10, ramp: ['#402004', '#7e4c0a', '#c88c16', '#ffcf46', '#fff1ac'], outline: '#170b02' },
  pk_credit_l: { size: 16, height: 14, ramp: ['#33083c', '#6c1a82', '#aa34cc', '#e270ff', '#ffc8ff'], outline: '#14031a' },
};

/** Octagonal brilliant: table ring, girdle ring, culet. Flattened in depth so the spin reads. */
function gemGeometry(): { verts: Vec3[]; faces: number[][] } {
  const n = 8, zf = 0.5;
  const verts: Vec3[] = [];
  const faces: number[][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    verts.push([Math.cos(a) * 0.38, -0.6, Math.sin(a) * 0.38 * zf]);
  }
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    verts.push([Math.cos(a) * 0.74, -0.2, Math.sin(a) * 0.74 * zf]);
  }
  verts.push([0, 1, 0]);
  faces.push(Array.from({ length: n }, (_, i) => i));
  for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, n + ((i + 1) % n), n + i]);
  for (let i = 0; i < n; i++) faces.push([n + i, n + ((i + 1) % n), 2 * n]);
  return { verts, faces };
}

function gemFrames(style: GemStyle): HTMLCanvasElement[] {
  const { verts, faces } = gemGeometry();
  const { size, height, ramp } = style;
  const scale = height / 1.62;
  const cx = size / 2, cy = size / 2 - 0.2 * scale + 0.3;
  const out: HTMLCanvasElement[] = [];
  for (let f = 0; f < 6; f++) {
    const { light } = renderPolyhedron(size, size, verts, faces, scale, cx, cy, (f * Math.PI) / 6, 0.34);
    const buf = new PixBuf(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const v = light[y * size + x];
      if (v < 0) continue;
      const col = v > 0.92 ? '#ffffff' : v > 0.7 ? ramp[4] : v > 0.5 ? ramp[3] : v > 0.32 ? ramp[2] : v > 0.2 ? ramp[1] : ramp[0];
      buf.put(x, y, col);
    }
    // twinkle: a white glint on the upper-left of the crown on two frames
    if (f === 0 || f === 1) {
      const gx = Math.round(cx - scale * 0.32), gy = Math.round(cy - scale * 0.42);
      buf.put(gx, gy, '#ffffff');
      if (size >= 12 && f === 0) {
        buf.put(gx - 1, gy, ramp[4]); buf.put(gx + 1, gy, ramp[4]);
        buf.put(gx, gy - 1, ramp[4]); buf.put(gx, gy + 1, ramp[4]);
      }
    }
    out.push(outlineCanvas(buf.toCanvas(), style.outline));
  }
  return out;
}

// ------------------------------------------------------------------ bevelled badges

const BLUE: Ramp5 = ['#0c1a4a', '#1c3e96', '#2f70e0', '#62a8ff', '#c0e4ff'];
const ORANGE: Ramp5 = ['#4a1a06', '#953a0c', '#e06a14', '#ff9e3a', '#ffdcac'];
const LIME: Ramp5 = ['#1e3606', '#46760f', '#82c01c', '#c2ee40', '#f2ffb4'];
const CYAN: Ramp5 = ['#06303c', '#0c6478', '#16a8c8', '#40e0ff', '#c8f8ff'];
const SLATE: Ramp5 = ['#121622', '#232a3c', '#384260', '#56628a', '#8c98c0'];

type Mask = (x: number, y: number) => boolean;

function maskOf(pts: Vec2[], size: number): Mask {
  const m = new Uint8Array(size * size);
  fillConvex(pts, (x, y) => { if (x >= 0 && y >= 0 && x < size && y < size) m[y * size + x] = 1; });
  return (x, y) => x >= 0 && y >= 0 && x < size && y < size && m[y * size + x] === 1;
}

/**
 * Bevel shading of a mask with the light from the top-left: lit rim on top/left edges,
 * shadow rim on bottom/right edges, diagonal gradient inside. `boost` shifts the ramp (blink).
 */
function bevel(buf: PixBuf, mask: Mask, ramp: Ramp5, boost = 0): void {
  const tone = (i: number) => ramp[Math.max(0, Math.min(4, i + boost))];
  for (let y = 0; y < buf.h; y++) for (let x = 0; x < buf.w; x++) {
    if (!mask(x, y)) continue;
    const tl1 = !mask(x - 1, y) || !mask(x, y - 1);
    const br1 = !mask(x + 1, y) || !mask(x, y + 1);
    const tl2 = !mask(x - 2, y) || !mask(x, y - 2) || !mask(x - 1, y - 1);
    const br2 = !mask(x + 2, y) || !mask(x, y + 2) || !mask(x + 1, y + 1);
    let i: number;
    if (tl1 && !br1) i = 4;
    else if (br1) i = 1;
    else if (tl2) i = 3;
    else if (br2) i = 1;
    else i = x + y < buf.w ? 3 : 2;
    buf.put(x, y, tone(i));
  }
}

/** Paint a small char map (chars from `cols`) at (ox, oy). */
function stamp(buf: PixBuf, rows: string[], cols: Record<string, string>, ox: number, oy: number): void {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = cols[row[x]];
      if (c) buf.put(ox + x, oy + y, c);
    }
  });
}

function sphere(buf: PixBuf, cx: number, cy: number, r: number, ramp: Ramp5, boost = 0): void {
  for (let y = 0; y < buf.h; y++) for (let x = 0; x < buf.w; x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r;
    const d2 = dx * dx + dy * dy;
    if (d2 > 1) continue;
    const n = norm3([dx, dy, Math.sqrt(1 - d2)]);
    const v = clamp(0.12 + 0.8 * Math.max(0, dot3(n, LIGHT)) + 0.1 * boost);
    const i = v > 0.86 ? 4 : v > 0.64 ? 3 : v > 0.42 ? 2 : v > 0.24 ? 1 : 0;
    buf.put(x, y, ramp[Math.min(4, i + (boost > 0 && i < 4 ? 1 : 0))]);
  }
}

/** Blue hexagon (pointy top) with an inner raised plate and a crest. */
function shieldFrame(blink: boolean): HTMLCanvasElement {
  const s = 16, b = blink ? 1 : 0;
  const buf = new PixBuf(s, s);
  const hex = (r: number): Vec2[] => Array.from({ length: 6 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return [8 + Math.cos(a) * r * 0.93, 8 + Math.sin(a) * r];
  });
  bevel(buf, maskOf(hex(7.05), s), BLUE, b);
  const inner = maskOf(hex(4.4), s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    if (!inner(x, y)) continue;
    const edgeTL = !inner(x - 1, y) || !inner(x, y - 1);
    const edgeBR = !inner(x + 1, y) || !inner(x, y + 1);
    buf.put(x, y, edgeTL ? BLUE[1] : edgeBR ? BLUE[4] : BLUE[2 + b]);
  }
  // crest: white chevron shield
  stamp(buf, [
    'wwww',
    'wqqw',
    'wqqw',
    '.ww.',
  ], { w: blink ? '#ffffff' : '#e8f4ff', q: blink ? '#9ad0ff' : BLUE[3] }, 6, 6);
  if (blink) { buf.put(4, 4, '#ffffff'); buf.put(3, 6, '#ffffff'); }
  return outlineCanvas(buf.toCanvas(), '#060a1c');
}

/** Orange armour-repair badge: bevelled octagon with a bold white plus (drop-shadowed). */
function armorFrame(blink: boolean): HTMLCanvasElement {
  const s = 16, b = blink ? 1 : 0;
  const buf = new PixBuf(s, s);
  const oct: Vec2[] = [[4.5, 1.5], [11.5, 1.5], [14.5, 4.5], [14.5, 11.5], [11.5, 14.5], [4.5, 14.5], [1.5, 11.5], [1.5, 4.5]];
  bevel(buf, maskOf(oct, s), ORANGE, b);
  stamp(buf, [
    '...kkkk...',
    '...kwwk...',
    '...kwwk...',
    'kkkkwwkkkk',
    'kwwwwwwwwk',
    'kwwwwwwwwq',
    'kkkkwwkqqq',
    '...kwwq...',
    '...kwwq...',
    '...kqqq...',
  ], { k: '#5a1e06', w: blink ? '#ffffff' : '#fff4e6', q: ORANGE[0] }, 3, 3);
  if (blink) { buf.put(4, 3, '#ffffff'); buf.put(3, 4, '#ffffff'); }
  return outlineCanvas(buf.toCanvas(), '#1a0802');
}

/** Yellow-green power orb with a P and double up-chevrons on both sides. */
function powerFrame(blink: boolean): HTMLCanvasElement {
  const s = 16;
  const buf = new PixBuf(s, s);
  sphere(buf, 8, 8.5, 6.0, LIME, blink ? 1 : 0);
  stamp(buf, [
    'kkkk.',
    'kwwwk',
    'kwkwk',
    'kwwwk',
    'kwkk.',
    'kwk..',
    'kkk..',
  ], { k: '#1a3204', w: '#ffffff' }, 6, 4);
  const arrow = ['.w.', 'w.w', '.w.', 'w.w'];
  const ac = { w: blink ? '#ffffff' : LIME[4] };
  stamp(buf, arrow, ac, 0, 1);
  stamp(buf, arrow, ac, 13, 1);
  return outlineCanvas(buf.toCanvas(), '#0c1802');
}

/** Cyan data chip: slate body, pins, glowing traces and core. */
function intelFrame(blink: boolean): HTMLCanvasElement {
  const s = 16;
  const buf = new PixBuf(s, s);
  // pins
  for (const y of [4, 7, 10]) {
    buf.rect(1, y, 2, 2, '#9a96aa'); buf.put(1, y, '#d4d0e0');
    buf.rect(13, y, 2, 2, '#9a96aa'); buf.put(13, y, '#d4d0e0');
  }
  const body: Vec2[] = [[3, 2], [13, 2], [13, 14], [3, 14]];
  bevel(buf, maskOf(body, s), SLATE, 0);
  const t = blink ? CYAN[4] : CYAN[3];
  const td = blink ? CYAN[3] : CYAN[2];
  stamp(buf, [
    't.t..t.t',
    '.tdddd..',
    'tdccccdt',
    '.dcwwcd.',
    '.dcwwcd.',
    'tdccccdt',
    '..dddd..',
    't.t..t.t',
  ], { t: td, d: CYAN[1], c: blink ? CYAN[4] : CYAN[3], w: blink ? '#ffffff' : CYAN[4] }, 4, 4);
  buf.put(4, 3, t); buf.put(11, 12, t);
  return outlineCanvas(buf.toCanvas(), '#05070e');
}

/** Generates every PICKUP_SPRITES texture (see keys.ts). */
export function generatePickupArt(scene: Phaser.Scene): void {
  for (const [key, style] of Object.entries(GEMS)) addSheet(scene, key, gemFrames(style));
  addSheet(scene, 'pk_armor', [armorFrame(false), armorFrame(true)]);
  addSheet(scene, 'pk_shield', [shieldFrame(false), shieldFrame(true)]);
  addSheet(scene, 'pk_power', [powerFrame(false), powerFrame(true)]);
  addSheet(scene, 'pk_intel', [intelFrame(false), intelFrame(true)]);
}
