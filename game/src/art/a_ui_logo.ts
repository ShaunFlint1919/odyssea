// =====================================================================================
//  "NOVA CORSAIR" title logo (ART-A). Letters are crisp polygons (sampled at pixel centres,
//  no anti-aliasing), sheared into an italic, filled with a teal->white chrome gradient,
//  bevelled, extruded in deep violet, outlined, underlined by a magenta speed streak and
//  topped with a star flare (the only soft, intentional glow).
// =====================================================================================
import { Mask, PixBuf, fillPolygon, gradientAt } from './a_ui_buf';

export const LOGO_W = 256;
export const LOGO_H = 64;

const LH = 28;          // letter height
const TOP = 13;         // letter top row
const SLANT = 0.2;      // italic shear (px of x per px of y)
const GAP = 3;          // space between letters
const WORD_GAP = 10;

type Poly = number[];
interface LetterShape { w: number; fill: Poly[]; holes: Poly[] }

const rect = (x0: number, y0: number, x1: number, y1: number): Poly => [x0, y0, x1, y0, x1, y1, x0, y1];
const oct = (x0: number, y0: number, x1: number, y1: number, c: number): Poly =>
  [x0 + c, y0, x1 - c, y0, x1, y0 + c, x1, y1 - c, x1 - c, y1, x0 + c, y1, x0, y1 - c, x0, y0 + c];

/** Letter outlines in a 28px-tall local space (x right, y down). Stroke width 5. */
const LETTERS: Record<string, LetterShape> = {
  N: { w: 19, fill: [rect(0, 0, 5, 28), rect(14, 0, 19, 28), [0, 0, 6, 0, 19, 28, 13, 28]], holes: [] },
  O: { w: 19, fill: [oct(0, 0, 19, 28, 5)], holes: [oct(5, 5, 14, 23, 2)] },
  V: { w: 19, fill: [[0, 0, 5, 0, 9.5, 20, 14, 0, 19, 0, 12, 28, 7, 28]], holes: [] },
  A: {
    w: 19,
    fill: [[0, 28, 0, 5, 5, 0, 14, 0, 19, 5, 19, 28, 14, 28, 14, 19, 5, 19, 5, 28]],
    holes: [[5, 7, 7, 5, 12, 5, 14, 7, 14, 14, 5, 14]],
  },
  C: {
    w: 18,
    fill: [[5, 0, 16, 0, 18, 2, 18, 5, 7, 5, 5, 7, 5, 21, 7, 23, 18, 23, 18, 26, 16, 28, 5, 28, 0, 23, 0, 5]],
    holes: [],
  },
  R: {
    w: 19,
    fill: [[0, 0, 14, 0, 19, 5, 19, 12, 16, 15, 19, 18, 19, 28, 14, 28, 14, 20, 12, 18, 5, 18, 5, 28, 0, 28]],
    holes: [[5, 5, 12, 5, 14, 7, 14, 11, 12, 13, 5, 13]],
  },
  S: {
    w: 18,
    fill: [[5, 0, 18, 0, 18, 5, 5, 5, 5, 11.5, 15, 11.5, 18, 14.5, 18, 23, 13, 28, 0, 28, 0, 23, 13, 23, 13, 16.5, 3, 16.5, 0, 13.5, 0, 5]],
    holes: [],
  },
  I: { w: 5, fill: [rect(0, 0, 5, 28)], holes: [] },
};

/** Chrome ramp over the letter height: white sky, bright teal horizon, deep teal floor. */
const FACE: ReadonlyArray<readonly [number, string]> = [
  [0, '#ffffff'], [0.28, '#e2fffa'], [0.45, '#8ff2e2'], [0.5, '#3fe3c9'],
  [0.53, '#0b5853'], [0.62, '#107d73'], [0.84, '#1fb8a5'], [1, '#78f2e2'],
];
const EXTRUDE = ['#62208a', '#45166a', '#2c0d47'];
const OUTLINE = '#07050d';
const CONTOUR = '#1a1030';

function shear(p: Poly, penX: number): Poly {
  const out: Poly = [];
  for (let i = 0; i < p.length; i += 2) out.push(penX + p[i] + (LH - p[i + 1]) * SLANT, TOP + p[i + 1]);
  return out;
}

/** Builds the logo canvas (LOGO_W x LOGO_H). */
export function buildLogo(): HTMLCanvasElement {
  const text = 'NOVA CORSAIR';
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    total += ch === ' ' ? WORD_GAP : LETTERS[ch].w + (i < text.length - 1 && text[i + 1] !== ' ' ? GAP : 0);
  }
  const startX = Math.round((LOGO_W - (total + LH * SLANT + 4)) / 2);

  const face = new Mask(LOGO_W, LOGO_H);
  let pen = startX;
  let flareX = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ') { pen += WORD_GAP; continue; }
    const L = LETTERS[ch];
    if (i === 0) flareX = pen + LH * SLANT;
    for (const p of L.fill) fillPolygon(face, shear(p, pen));
    for (const h of L.holes) fillPolygon(face, shear(h, pen), false);
    pen += L.w + (text[i + 1] && text[i + 1] !== ' ' ? GAP : 0);
  }

  const buf = new PixBuf(LOGO_W, LOGO_H);
  drawStreak(buf, startX - 2, startX + total + 8);

  // Extrusion (down-right), dark outline around face + extrusion, then a second contour ring
  // that fuses the letters into one solid badge (reads on any background).
  const ext = [face.shift(1, 1), face.shift(2, 2), face.shift(3, 3)];
  let solid = face;
  for (const e of ext) solid = solid.or(e);
  const outline = solid.ring(true);
  const contour = solid.or(outline).ring(true);
  for (let y = 0; y < LOGO_H; y++) {
    for (let x = 0; x < LOGO_W; x++) {
      if (contour.get(x, y)) { buf.set(x, y, CONTOUR); continue; }
      if (outline.get(x, y)) { buf.set(x, y, OUTLINE); continue; }
      if (face.get(x, y)) continue;
      for (let k = 0; k < ext.length; k++) {
        if (ext[k].get(x, y)) { buf.set(x, y, EXTRUDE[k]); break; }
      }
    }
  }

  // Face: chrome gradient + bevel (light top/left edges, dark bottom/right edges).
  for (let y = 0; y < LOGO_H; y++) {
    const t = (y - TOP + 0.5) / LH;
    const base = gradientAt(FACE, t);
    const hi = gradientAt(FACE, Math.max(0, t - 0.3));
    const lo = gradientAt(FACE, Math.min(0.56, t + 0.06));
    for (let x = 0; x < LOGO_W; x++) {
      if (!face.get(x, y)) continue;
      let c = base;
      if (!face.get(x, y - 1) || !face.get(x - 1, y)) c = t < 0.5 ? '#ffffff' : hi;
      else if (!face.get(x, y + 1)) c = t < 0.5 ? lo : '#0d6a63';
      else if (!face.get(x + 1, y)) c = t < 0.5 ? gradientAt(FACE, t + 0.12) : '#14897e';
      buf.set(x, y, c);
    }
  }

  drawFlare(buf, Math.round(flareX) - 1, TOP - 1);
  return buf.toCanvas();
}

/**
 * Magenta speed blade under the letters: italic-cut left end (same slant as the letters),
 * constant body, pointed tip on the right, plus a thin detached speed line.
 */
function drawStreak(buf: PixBuf, x0: number, x1: number): void {
  const m = new Mask(LOGO_W, LOGO_H);
  const y0 = TOP + LH + 6;
  const T = 5;
  const tail = 22;
  fillPolygon(m, [x0 + T * SLANT * 2, y0, x1 - tail, y0, x1, y0 + T / 2, x1 - tail, y0 + T, x0, y0 + T]);
  const line = new Mask(LOGO_W, LOGO_H);
  fillPolygon(line, [x0 + 22, y0 + T + 2, x0 + 96, y0 + T + 2, x0 + 104, y0 + T + 3, x0 + 21, y0 + T + 3]);
  const ring = m.or(line).ring(true);
  const ROWS = ['#ffd0ff', '#f07cff', '#d04cff', '#a838d6', '#6c1f8e'];
  for (let y = 0; y < LOGO_H; y++) {
    for (let x = 0; x < LOGO_W; x++) {
      if (m.get(x, y)) {
        let r = y - y0;
        if (!m.get(x, y - 1)) r = 0;
        else if (!m.get(x, y + 1)) r = 4;
        buf.set(x, y, ROWS[Math.max(0, Math.min(4, r))]);
      } else if (line.get(x, y)) buf.set(x, y, '#d04cff');
      else if (ring.get(x, y)) buf.set(x, y, OUTLINE);
    }
  }
}

/** Four-point star flare with a soft glow (additive-looking, alpha blended). */
function drawFlare(buf: PixBuf, cx: number, cy: number): void {
  const R = 10;
  for (let y = -R; y <= R; y++) {
    for (let x = -R; x <= R; x++) {
      const d = Math.hypot(x, y) / R;
      if (d < 1) buf.blend(cx + x, cy + y, '#7ff6e6', 0.5 * (1 - d) * (1 - d));
    }
  }
  const ray = (len: number, dx: number, dy: number) => {
    for (let i = 1; i <= len; i++) {
      const a = Math.pow(1 - i / (len + 1), 1.2);
      buf.blend(cx + dx * i, cy + dy * i, i < len * 0.45 ? '#ffffff' : '#b8fff4', a);
    }
  };
  ray(16, 1, 0); ray(16, -1, 0); ray(11, 0, 1); ray(11, 0, -1);
  ray(4, 1, 1); ray(4, -1, -1); ray(4, 1, -1); ray(4, -1, 1);
  buf.set(cx, cy, '#ffffff');
  buf.set(cx + 1, cy, '#ffffff'); buf.set(cx - 1, cy, '#ffffff');
  buf.set(cx, cy + 1, '#ffffff'); buf.set(cx, cy - 1, '#ffffff');
}
