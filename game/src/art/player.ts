// =====================================================================================
//  PLAYER ART — the six hulls and six sidekick drones.
//   hullKey(id)            3-frame sheet of 32x32: 0 neutral, 1 banking LEFT, 2 banking RIGHT
//   shadowKey(hullKey(id)) silhouette of frame 0 (ground shadow)
//   sidekickKey(id) = id   2-frame sheet of 16x16 (idle glow pulse), + shadowKey(id)
//  Maps are hand-authored left halves (src/art/a_fx_hulls.ts), mirrored, then:
//   - light pass: light from the top-left -> highlights on the right half are toned down;
//   - banking: the dipping wing is foreshortened (horizontal squash towards the fuselage)
//     and darkened, the rising wing catches the light, and the rigid fuselage (canopy,
//     ridge highlight) shifts 1px towards the dipping side, exposing its far flank.
// =====================================================================================
import Phaser from 'phaser';
import { HULL_SPRITES, SIDEKICK_SPRITES, hullKey, shadowKey, sidekickKey } from './keys';
import { addSheet, addTexture, flipH, makeCanvas, mirrorH, outlineCanvas, paintMap, silhouette, type ColorMap } from './pixel';
import { lerpColor, makeShifter } from './a_fx_core';
import { HULL_ART, SIDEKICK_ART, padHalf, type HullScheme } from './a_fx_hulls';

/** Gun muzzle and engine nozzle points per hull, in px from the sprite centre (+y = down). */
export const HULL_MOUNTS: Record<string, { nose: [number, number]; engines: [number, number][] }> = Object.fromEntries(
  Object.entries(HULL_ART).map(([id, a]) => [id, { nose: a.nose, engines: a.engines }]),
);

const OUTLINE = '#0a0810';
const METAL: ColorMap = { g: '#2a2836', G: '#4c4a5c', h: '#7e7c90', H: '#b8b6c8' };
const ENGINE: ColorMap = { e: '#c03010', E: '#ff7a20', y: '#ffe060' };

function colorsFor(s: HullScheme): ColorMap {
  return {
    '1': s.hull[0], '2': s.hull[1], '3': s.hull[2], '4': s.hull[3], '5': s.hull[4],
    '6': s.accent[0], '7': s.accent[1], '8': s.accent[2], '9': s.accent[3],
    ...METAL, ...ENGINE,
    c: s.canopy[0], C: s.canopy[1], q: s.canopy[2], w: '#ffffff',
    n: s.neon[0], N: s.neon[1], P: lerpColor(s.neon[1], '#ffffff', 0.55),
    k: OUTLINE,
  };
}

const shift = makeShifter(['12345', '6789', 'gGhH', 'cCqw']);
/** Right-of-centre tone-down (light comes from the top-left). */
const DIM: Record<string, string> = { '5': '4', '4': '3', '9': '8', '8': '7', H: 'h', q: 'C', w: 'q' };
/** Rising wing catches the light. */
const BRIGHT: Record<string, string> = { '2': '3', '3': '4', '4': '5', '7': '8', '8': '9', G: 'h', h: 'H' };

function lightPass(map: string[], centre: number): string[] {
  return map.map((row) => {
    let out = '';
    for (let x = 0; x < row.length; x++) out += x >= centre ? DIM[row[x]] ?? row[x] : row[x];
    return out;
  });
}

/**
 * Bank LEFT (left wing dips). `fw` = fuselage half-width, `k` = horizontal scale of the
 * dipping wing. Works on the symmetric, unlit map; mirror the result for a right bank.
 */
function bankLeft(map: string[], fw: number, k: number): string[] {
  const W = map[0].length, C = W / 2;
  return map.map((row) => {
    const out = new Array<string>(W).fill('.');
    for (let x = C + fw; x < W; x++) out[x] = row[x] === '.' ? '.' : BRIGHT[row[x]] ?? row[x];
    for (let x = C - fw; x < C + fw; x++) out[x - 1] = row[x];
    const flank = row[C + fw - 1];
    out[C + fw - 1] = flank === '.' ? '.' : shift(flank, -1);
    const rootSrc = C - fw - 1, rootDst = C - fw - 2;
    for (let d = 0; d <= rootDst; d++) {
      const s = Math.round(d / k);
      if (s > rootSrc) break;
      const ch = row[rootSrc - s];
      if (ch !== '.') out[rootDst - d] = shift(ch, -1);
    }
    return out.join('');
  });
}

function render(map: string[], colors: ColorMap): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(map[0].length, map.length);
  paintMap(ctx, map, colors);
  return outlineCanvas(canvas, OUTLINE);
}

/** The three frames (neutral, bank left, bank right) of one hull as canvases. */
export function hullFrames(id: string): HTMLCanvasElement[] {
  const art = HULL_ART[id];
  const full = mirrorH(padHalf(art.half, 16));
  const colors = colorsFor(art.scheme);
  const left = bankLeft(full, art.fuselage, 0.62);
  const right = flipH(left);
  return [
    render(lightPass(full, 16), colors),
    render(lightPass(left, 15), colors),
    render(lightPass(right, 17), colors),
  ];
}

function sidekickFrames(id: string): HTMLCanvasElement[] {
  const art = SIDEKICK_ART[id];
  const full = lightPass(mirrorH(padHalf(art.half, 8)), 8);
  const colors = colorsFor(art.scheme);
  const pulse = full.map((row) => row.replace(/N/g, 'P').replace(/n/g, 'N'));
  return [render(full, colors), render(pulse, colors)];
}

/** Generates every hull and sidekick texture (+ their ground shadows). */
export function generatePlayerArt(scene: Phaser.Scene): void {
  for (const id of HULL_SPRITES) {
    const frames = hullFrames(id);
    const key = hullKey(id);
    addSheet(scene, key, frames);
    addTexture(scene, shadowKey(key), silhouette(frames[0], '#000000', 0.38));
  }
  for (const id of SIDEKICK_SPRITES) {
    const frames = sidekickFrames(id);
    const key = sidekickKey(id);
    addSheet(scene, key, frames);
    addTexture(scene, shadowKey(key), silhouette(frames[0], '#000000', 0.38));
  }
}
