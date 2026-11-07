// =====================================================================================
//  A-FX EXPLOSIONS — procedural multi-lobe fireballs rendered frame by frame.
//  Model: a union of noise-warped fire lobes (some ignite late at the rim for a rolling,
//  secondary blast). Each lobe flashes white, swells, cools from its rim inwards (fire
//  pockets retreat to the lobe centres) and leaves a lit smoke cloud that erodes away with
//  ordered dithering. Colours are quantised to fixed ramps (no anti-aliasing), lit from the
//  top-left, plus a spiky flash, flying embers and dark debris chunks for bigger sizes.
// =====================================================================================
import { PixBuf, clamp, smoothstep, easeOut } from './a_fx_core';
import { bayer } from './pixel';
import { fbm, mulberry32 } from './noise';

export interface ExplosionSpec {
  size: number;     // square frame size in px
  frames: number;
  seed: number;
  lobes: number;    // fire lobes (first one is central and biggest)
  spread: number;   // lobe offset from the centre, fraction of the max radius
  late: number;     // probability that a lobe ignites late (secondary blasts)
  embers: number;   // bright flying embers
  chunks: number;   // dark flying debris chunks
  noise: number;    // boundary warp amplitude (fraction of the lobe radius)
  spikes: number;   // flash spikes on frame 0
}

/** Fire ramp from hottest to coolest. */
export const FIRE_RAMP = ['#ffffff', '#fff5c8', '#ffe266', '#ffb83a', '#ff8a22', '#f05a1a', '#c0341a', '#7c1f1a'];
const FIRE_T = [1.0, 0.86, 0.72, 0.58, 0.46, 0.35, 0.26, 0.19];
/** Smoke ramp from lit to deep shadow (slightly violet to sit with the indigo art direction). */
export const SMOKE_RAMP = ['#a898a4', '#7e7084', '#5a5066', '#3e364e', '#29233a'];
/** Smoke lit from below by the fire. */
const SMOKE_WARM = ['#8a5a4e', '#64403c', '#46302f'];

interface Lobe { x: number; y: number; dx: number; dy: number; rad: number; birth: number; heat: number }
interface Puff { x: number; y: number; dx: number; dy: number; r: number; birth: number; death: number; z: number }
interface Particle { ang: number; speed: number; start: number; life: number; big: boolean }

function fireIndex(t: number): number {
  for (let i = 0; i < FIRE_T.length; i++) if (t >= FIRE_T[i]) return i;
  return -1;
}

/** Render every frame of one explosion size. */
export function explosionFrames(spec: ExplosionSpec): HTMLCanvasElement[] {
  const { size, frames, seed } = spec;
  const rnd = mulberry32(seed);
  const R = size / 2 - 1.5;
  const cx = size / 2, cy = size / 2;
  const ns = Math.max(3, size / 5.5); // noise feature size in px

  const lobes: Lobe[] = [];
  for (let i = 0; i < spec.lobes; i++) {
    const ang = rnd() * Math.PI * 2;
    const late = i > 0 && rnd() < spec.late;
    const dist = i === 0 ? R * 0.05 : late ? R * (0.38 + 0.2 * rnd()) : spec.spread * R * (0.25 + 0.6 * rnd());
    let rad = i === 0 ? R * 0.6 : R * (late ? 0.28 + 0.2 * rnd() : 0.3 + 0.26 * rnd());
    rad = Math.min(rad, (R * 0.98 - dist) / 1.32);
    const birth = i === 0 ? 0 : late ? 0.1 + rnd() * 0.3 : rnd() * 0.07;
    lobes.push({
      x: cx + Math.cos(ang) * dist, y: cy + Math.sin(ang) * dist,
      dx: Math.cos(ang), dy: Math.sin(ang), rad, birth, heat: 0.95 + rnd() * 0.2,
    });
  }
  // smoke billows: round puffs seeded around every lobe, appearing as the lobe cools
  const puffs: Puff[] = [];
  for (const L of lobes) {
    const n = 2 + Math.round(rnd() * 2) + (L.rad > 8 ? 1 : 0);
    for (let p = 0; p < n; p++) {
      const ang = rnd() * Math.PI * 2, off = rnd() * 0.72 * L.rad;
      const x = L.x + Math.cos(ang) * off, y = L.y + Math.sin(ang) * off;
      const dl = Math.hypot(x - cx, y - cy) || 1;
      puffs.push({
        x, y, dx: (x - cx) / dl, dy: (y - cy) / dl,
        r: Math.max(2, L.rad * (0.34 + rnd() * 0.22)),
        birth: L.birth + (1 - L.birth) * (0.26 + rnd() * 0.2),
        death: 0.76 + rnd() * 0.36,
        z: rnd(),
      });
    }
  }
  const embers: Particle[] = [];
  for (let i = 0; i < spec.embers; i++) {
    embers.push({ ang: rnd() * Math.PI * 2, speed: 0.75 + rnd() * 0.5, start: rnd() * 0.12, life: 0.35 + rnd() * 0.3, big: size >= 40 && rnd() < 0.35 });
  }
  const chunks: Particle[] = [];
  for (let i = 0; i < spec.chunks; i++) {
    chunks.push({ ang: rnd() * Math.PI * 2, speed: 0.75 + rnd() * 0.4, start: 0.04 + rnd() * 0.08, life: 0.5 + rnd() * 0.35, big: rnd() < 0.6 });
  }
  const spikes: { ang: number; len: number }[] = [];
  for (let i = 0; i < spec.spikes; i++) spikes.push({ ang: (i / spec.spikes) * Math.PI * 2 + rnd() * 0.7, len: 0.48 + rnd() * 0.3 });

  const out: HTMLCanvasElement[] = [];
  const D = new Float32Array(size * size);
  const T = new Float32Array(size * size);
  const S = new Float32Array(size * size);
  const N2 = new Float32Array(size * size);
  const SL = new Float32Array(size * size);
  const SZ = new Float32Array(size * size);

  const nL = lobes.length;
  const LX = new Float32Array(nL), LY = new Float32Array(nL), LR = new Float32Array(nL);
  const LH = new Float32Array(nL), LE = new Float32Array(nL), LW = new Float32Array(nL), LReach = new Float32Array(nL);
  const LOn = new Uint8Array(nL);

  for (let f = 0; f < frames; f++) {
    const t = frames === 1 ? 0 : f / (frames - 1);
    D.fill(0); T.fill(0); N2.fill(NaN);
    // per-frame lobe state (hoisted out of the pixel loop)
    for (let j = 0; j < nL; j++) {
      const L = lobes[j];
      const a = (t - L.birth) / (1 - L.birth);
      LOn[j] = a >= 0 ? 1 : 0;
      if (a < 0) continue;
      const grow = a < 0.34 ? 0.42 + 0.58 * easeOut(a / 0.34, 2.2) : 1 + 0.3 * (a - 0.34);
      const r = L.rad * grow;
      LR[j] = r;
      LX[j] = L.x + L.dx * R * 0.12 * a;
      LY[j] = L.y + L.dy * R * 0.12 * a;
      LH[j] = L.heat * (1.45 - 1.75 * Math.pow(a, 0.85));
      LE[j] = 0.3 + 1.5 * a;
      LW[j] = spec.noise * r * 2 + 1.2;            // warp amplitude
      const reach = r + LW[j] * 0.5 + 0.8;          // warp is within [-0.5, 0.5]
      LReach[j] = reach * reach;
    }
    for (let y = 0; y < size; y++) {
      const py = y + 0.5;
      for (let x = 0; x < size; x++) {
        const px = x + 0.5;
        let near = false;
        for (let j = 0; j < nL; j++) {
          if (!LOn[j]) continue;
          const dx = px - LX[j], dy = py - LY[j];
          if (dx * dx + dy * dy < LReach[j]) { near = true; break; }
        }
        if (!near) continue;
        const warp = fbm(px / ns + t * 1.1, py / ns - t * 0.7, seed, 3) - 0.5;
        let d0 = 0, t0 = 0;
        for (let j = 0; j < nL; j++) {
          if (!LOn[j]) continue;
          const r = LR[j];
          const d = Math.sqrt((px - LX[j]) * (px - LX[j]) + (py - LY[j]) * (py - LY[j])) + warp * LW[j];
          const sv = 1 - d / r;
          if (sv <= 0) continue;
          if (sv > d0) d0 = sv;
          const th = LH[j] * Math.pow(sv, LE[j]);
          if (th > t0) t0 = th;
        }
        D[y * size + x] = d0;
        T[y * size + x] = t0;
      }
    }
    // fine billow noise, evaluated lazily for drawn pixels only
    const n2 = (x: number, y: number): number => {
      const k = y * size + x;
      let v = N2[k];
      if (v !== v) {
        v = fbm((x + 0.5) / (ns * 0.55) - t * 0.6, (y + 0.5) / (ns * 0.55) + t * 0.9, seed + 77, 2) - 0.5;
        N2[k] = v;
      }
      return v;
    };

    // smoke puffs: per pixel, the front-most live puff wins; sphere-lit from the top-left
    S.fill(-1);
    const PL = [-0.6, -0.8];
    for (const p of puffs) {
      if (t < p.birth) continue;
      const u = clamp((t - p.birth) / (p.death - p.birth));
      const fade = smoothstep(0.48, 1, u);
      const rr = p.r * (0.35 + 0.65 * easeOut(u * 2.2)) * (1 - 0.55 * fade);
      const px0 = p.x + p.dx * R * 0.1 * u, py0 = p.y + p.dy * R * 0.1 * u;
      const x0 = Math.max(0, Math.floor(px0 - rr - 1)), x1 = Math.min(size - 1, Math.ceil(px0 + rr + 1));
      const y0 = Math.max(0, Math.floor(py0 - rr - 1)), y1 = Math.min(size - 1, Math.ceil(py0 + rr + 1));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const ox = (x + 0.5 - px0) / rr, oy = (y + 0.5 - py0) / rr;
          const d2 = ox * ox + oy * oy;
          if (d2 >= 1) continue;
          const dens = 1 - Math.sqrt(d2);
          if (dens - fade * 0.45 + (bayer(x, y) - 0.5) * 0.24 <= 0) continue;
          const nz = Math.sqrt(1 - d2);
          const height = nz * rr + p.z * 2;
          const i = y * size + x;
          if (height <= S[i]) continue;
          S[i] = height;
          SZ[i] = nz;
          SL[i] = ox * PL[0] * 0.75 + oy * PL[1] * 0.75 + nz * 0.55 - t * 0.12;
        }
      }
    }

    const buf = new PixBuf(size, size);
    const at = (arr: Float32Array, x: number, y: number) => (x < 0 || y < 0 || x >= size || y >= size ? 0 : arr[y * size + x]);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const shadeF = clamp((at(D, x + 1, y + 1) - at(D, x - 1, y - 1)) * R * 0.32, -1, 1);
        if (D[i] <= 0 && S[i] < 0) continue;
        const temp = T[i] > 0 ? T[i] + 0.14 * shadeF + n2(x, y) * (0.1 + 0.25 * t) : 0;
        // smoke billows hide the cooling fire: it only peeks through gaps and thin edges
        const cover = S[i] >= 0 ? SZ[i] * smoothstep(0.3, 0.7, t) * 0.45 : 0;
        const fi = D[i] > 0 && temp - cover >= FIRE_T[FIRE_T.length - 1] ? fireIndex(temp) : -1;
        if (fi >= 0) {
          buf.put(x, y, FIRE_RAMP[fi]);
          continue;
        }
        if (S[i] < 0) continue;
        const v = SL[i] + n2(x, y) * 0.25;
        if (temp - cover > 0.11 && D[i] > 0) {
          buf.put(x, y, SMOKE_WARM[v > 0.75 ? 0 : v > 0.35 ? 1 : 2]);
          continue;
        }
        const si = v > 0.95 ? 0 : v > 0.62 ? 1 : v > 0.3 ? 2 : v > 0.02 ? 3 : 4;
        buf.put(x, y, SMOKE_RAMP[si]);
      }
    }

    // spiky flash on the first frame (tapered 2px spikes under the white core)
    if (f === 0) {
      for (const sp of spikes) {
        const len = R * sp.len;
        const ca = Math.cos(sp.ang), sa = Math.sin(sp.ang);
        for (let k = 0; k < len; k += 0.35) {
          const u = k / len;
          const half = (1 - u) * (R > 20 ? 2.1 : 1.5);
          for (let o = -half; o <= half; o += 0.5) {
            const x = Math.floor(cx + ca * k - sa * o), y = Math.floor(cy + sa * k + ca * o);
            if (buf.alphaAt(x, y) > 0 && buf.data[(y * size + x) * 4] === 255 && buf.data[(y * size + x) * 4 + 1] === 255) continue;
            buf.put(x, y, u < 0.35 ? FIRE_RAMP[1] : u < 0.65 ? FIRE_RAMP[2] : FIRE_RAMP[3]);
          }
        }
      }
    }

    // embers: bright specks flying out with a short trail
    for (const e of embers) {
      const a = (t - e.start) / e.life;
      if (a < 0 || a > 1) continue;
      const dist = R * (0.3 + e.speed * 0.8 * easeOut(a, 1.8));
      const x = cx + Math.cos(e.ang) * dist, y = cy + Math.sin(e.ang) * dist;
      if (x < 1 || y < 1 || x >= size - 1 || y >= size - 1) continue;
      const col = FIRE_RAMP[Math.min(7, 1 + Math.floor(a * 6))];
      const tcol = FIRE_RAMP[Math.min(7, 3 + Math.floor(a * 5))];
      const tx = cx + Math.cos(e.ang) * (dist - 1.6), ty = cy + Math.sin(e.ang) * (dist - 1.6);
      if (buf.alphaAt(Math.floor(tx), Math.floor(ty)) === 0) buf.put(Math.floor(tx), Math.floor(ty), tcol);
      buf.put(Math.floor(x), Math.floor(y), col);
      if (e.big && a < 0.6) {
        buf.put(Math.floor(x) + 1, Math.floor(y), col);
        buf.put(Math.floor(x), Math.floor(y) + 1, tcol);
      }
    }

    // dark debris chunks (only drawn outside the fire) with a smoke trail
    for (const c of chunks) {
      const a = (t - c.start) / c.life;
      if (a < 0 || a > 1) continue;
      const dist = R * (0.35 + c.speed * 0.75 * easeOut(a, 1.6));
      const x = Math.floor(cx + Math.cos(c.ang) * dist), y = Math.floor(cy + Math.sin(c.ang) * dist);
      if (x < 1 || y < 1 || x >= size - 2 || y >= size - 2) continue;
      const free = (px: number, py: number) => {
        const k = (py * size + px) * 4;
        return buf.data[k + 3] === 0 || buf.data[k] < 170; // transparent or smoke
      };
      if (!free(x, y)) continue;
      for (let k = 2; k < 6; k++) {
        const sx = Math.floor(cx + Math.cos(c.ang) * (dist - k)), sy = Math.floor(cy + Math.sin(c.ang) * (dist - k));
        if (buf.alphaAt(sx, sy) === 0 && bayer(sx, sy) < 0.75 - a * 0.5) buf.put(sx, sy, SMOKE_RAMP[2]);
      }
      buf.put(x, y, '#2a2434');
      if (c.big) {
        buf.put(x + 1, y, '#18131e');
        buf.put(x, y + 1, '#18131e');
        buf.put(x + 1, y + 1, '#0e0b12');
      }
      buf.put(x, y, a < 0.35 ? FIRE_RAMP[4] : '#6a6076');
    }
    out.push(buf.toCanvas());
  }
  return out;
}
