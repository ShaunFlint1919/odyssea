// =====================================================================================
//  PLANET GLOBES (ART-A) — planetKey(biome) 48x48 and `planet_<biome>_lg` 96x96.
//  Each globe is ray-cast as a unit sphere: surface materials come from seamless 3D value
//  noise in the planet's own (tilted) frame, light comes from the top-left, shading walks
//  down per-material colour ramps with narrow ordered-dither bands (crisp retro terminator).
//  A despeckle pass removes isolated material pixels, then the atmosphere rim, soft outer
//  halo and (gas giant) real 3D rings with mutual shadows are composed. Emissive details
//  (lava cracks, city lights, crystal fields) stay visible on the night side.
// =====================================================================================
import Phaser from 'phaser';
import { planetKey } from './keys';
import { BIOMES, type Biome } from '../types';
import { addTexture, bayer, parseColor } from './pixel';
import { PixBuf, fbm3, hash1 } from './a_ui_buf';

interface V3 { x: number; y: number; z: number }

/** Output of a surface function for one point (mutable, reused). */
interface Sample {
  ramp: readonly string[];
  level: number;   // albedo position in the ramp (0..1) when fully lit
  spec: number;    // specular strength (0 = matte)
  shade: number;   // extra lighting offset (crater walls...)
  emis: string | null;
  emisA: number;   // 0..1 emissive opacity
  night: boolean;  // emissive only shows on the dark side (city lights)
}

interface PlanetCtx {
  pxAngle: number;   // radians of surface per screen pixel at the disc centre
  detail: number;    // 0 = small globe (damp fine noise), 1 = large globe
  light: V3;         // light direction in planet space
  front: V3;         // planet-space point facing the viewer (disc centre)
  right: V3;         // planet-space direction of screen +x
  down: V3;          // planet-space direction of screen +y
}

interface PlanetStyle {
  tilt: number;      // spin-axis roll in the screen plane (radians)
  lean: number;      // spin-axis lean toward the viewer (radians)
  spin: number;      // rotation about the axis
  atmo: string | null;
  atmoStrength: number;
  halo: number;      // outer halo opacity
  surface(s: V3, out: Sample, ctx: PlanetCtx): void;
  rings?: { inner: number; outer: number };
  radius?: number;   // disc radius as a fraction of the half size (ringed worlds)
}

// ------------------------------------------------------------------------------ palettes

const SAND = ['#120a10', '#2a1612', '#552c18', '#8a5024', '#bc7c36', '#e0a852', '#f4d084', '#fff0c4'];
const ROCK_RED = ['#0e0808', '#24120e', '#462416', '#6a381c', '#8a5028', '#a8683a'];
const GREEN = ['#050f0a', '#0a2214', '#10381c', '#185226', '#246e30', '#368c38', '#5aac46', '#94d064'];
const BROWN = ['#0c0908', '#211810', '#3a2a1a', '#564024', '#765a34', '#967a4c'];
const WATER = ['#03051a', '#060f32', '#0b1b52', '#11307c', '#1a4aa4', '#2868c4', '#4890de', '#7cb8f2'];
const SHALLOW = ['#03101a', '#072636', '#0c4656', '#146c7a', '#1e949a', '#38c0b8', '#76e6d6'];
const CLOUD = ['#0c1018', '#262e3e', '#545f78', '#949eb6', '#d2d8e8', '#ffffff'];
const MOON = ['#050408', '#0d0a12', '#18131e', '#272030', '#3a3042', '#504456', '#6a5c70', '#88798c'];
const CRUST = ['#060203', '#110506', '#200809', '#330e0c', '#481610', '#5e2214', '#76321c'];
const ICE = ['#0a1020', '#13233e', '#203e68', '#386296', '#5a8ec2', '#8cbae2', '#c0e0f6', '#f0faff'];
const ICE_ROCK = ['#07090f', '#121824', '#1f2838', '#2f3c50', '#445468', '#5c6e84'];
const GAS = ['#07040e', '#130a22', '#22123a', '#371b58', '#512674', '#70368e', '#924aa0', '#b660a6', '#d682aa', '#eeaaae', '#ffd4c2'];
const METAL = ['#05070b', '#0c111a', '#151d29', '#202b3b', '#2e3c51', '#405069', '#566883', '#7184a0', '#97a8c0'];
const RING = ['#140f1c', '#3c3044', '#6e5c70', '#a48c9c', '#d4bcc0', '#f6e6dc'];

// ------------------------------------------------------------------------------ helpers

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const n3 = (s: V3, k: number, seed: number, oct = 4) => fbm3(s.x * k + 11.3, s.y * k + 7.1, s.z * k + 3.7, seed, oct);

function set(out: Sample, ramp: readonly string[], level: number, spec = 0): void {
  out.ramp = ramp;
  out.level = level;
  out.spec = spec;
}

/** Fluffy cloud layer shared by the living worlds. */
function clouds(s: V3, out: Sample, seed: number, cover: number, ctx: PlanetCtx): void {
  const warp = n3(s, 1.6, seed + 40, 2) * 1.6;
  const c = fbm3(s.x * 2.6 + warp, s.y * 5.2, s.z * 2.6 - warp, seed + 41, ctx.detail > 0.5 ? 4 : 3);
  if (c >= cover) set(out, CLOUD, 0.62 + smooth(cover, cover + 0.12, c) * 0.38);
}

interface Crater { c: V3; r: number }

function makeCraters(seed: number, count: number, rMin: number, rMax: number): Crater[] {
  const list: Crater[] = [];
  for (let i = 0; i < count; i++) {
    const u = hash1(i * 3 + 1, seed) * 2 - 1;
    const a = hash1(i * 3 + 2, seed) * Math.PI * 2;
    const q = Math.sqrt(1 - u * u);
    const r = rMin + (rMax - rMin) * Math.pow(hash1(i * 3 + 3, seed), 2.2);
    list.push({ c: { x: q * Math.cos(a), y: u, z: q * Math.sin(a) }, r });
  }
  return list;
}

/** Crater relief: darker floor, shadowed light-side wall, lit far wall and raised rim. */
function applyCraters(s: V3, out: Sample, ctx: PlanetCtx, craters: readonly Crater[]): void {
  for (const k of craters) {
    if (k.r < ctx.pxAngle * 1.6) continue; // too small to read at this size
    const dot = s.x * k.c.x + s.y * k.c.y + s.z * k.c.z;
    if (dot < 0.5) continue;
    const dx = s.x - k.c.x, dy = s.y - k.c.y, dz = s.z - k.c.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > k.r * 1.3) continue;
    const t = d / k.r;
    const side = (dx * ctx.light.x + dy * ctx.light.y + dz * ctx.light.z) / Math.max(1e-6, d); // +1 = toward the light
    const k2 = 1.25 - 0.25 * ctx.detail; // stronger relief on the small globe
    if (t < 1) {
      out.level -= 0.1 * k2;
      out.shade -= side * smooth(0.35, 1, t) * 0.75 * k2;
    } else {
      out.shade += side * (1 - smooth(1, 1.3, t)) * 0.45 * k2;
    }
  }
}

// ------------------------------------------------------------------------------ biomes

const CRATERS_MOON = makeCraters(4401, 26, 0.07, 0.32);
const CRATERS_LAVA = makeCraters(9127, 10, 0.05, 0.14);
const CRYSTALS = makeCraters(3313, 70, 0, 0.12);

const STYLES: Record<Biome, PlanetStyle> = {
  // Kessra: wind-combed dunes, red mesas with dark cliffs, canyons on the large globe.
  desert: {
    tilt: -0.35, lean: 0.25, spin: 0.6, atmo: '#ffb070', atmoStrength: 0.55, halo: 0.45,
    surface(s, out, ctx) {
      const warp = n3(s, 2.2, 1101, 3);
      const dune = Math.sin((s.x * 0.7 + s.y * 1.3 + s.z * 0.5) * 13 + warp * 8);
      set(out, SAND, 0.68 + dune * 0.13 + (n3(s, 6, 1102, 3) - 0.5) * (0.06 + 0.16 * ctx.detail));
      const mesa = n3(s, 2.2, 1103, 3);
      if (mesa > 0.62) {
        set(out, ROCK_RED, mesa > 0.62 + ctx.pxAngle * 0.7 ? 0.66 + (n3(s, 7, 1104, 2) - 0.5) * 0.4 * ctx.detail : 0.28);
      }
      if (ctx.detail > 0.5 && Math.abs(n3(s, 2.8, 1105, 3) - 0.5) < ctx.pxAngle * 0.7) set(out, ROCK_RED, 0.18);
    },
  },
  // Verdance: rainforest greens, highlands, winding rivers and lakes, cloud bands.
  jungle: {
    tilt: 0.3, lean: 0.3, spin: 2.1, atmo: '#9cf0c4', atmoStrength: 0.6, halo: 0.45,
    surface(s, out, ctx) {
      const n = n3(s, 2.5, 2202);
      set(out, GREEN, 0.5 + (n - 0.5) * 0.9 + (n3(s, 7, 2203, 3) - 0.5) * (0.06 + 0.2 * ctx.detail));
      if (n3(s, 3.6, 2204) > 0.7) set(out, BROWN, 0.55 + (n3(s, 8, 2205, 2) - 0.5) * 0.4 * ctx.detail);
      if (Math.abs(n3(s, 1.9, 2206, 3) - 0.5) < ctx.pxAngle * 0.42) set(out, WATER, 0.72, 0.6);
      if (n3(s, 2.6, 2207) > 0.73) set(out, WATER, 0.62, 0.8);
      clouds(s, out, 2202, 0.655, ctx);
    },
  },
  // Thalassa: deep ocean, archipelagos with beaches and lagoons, glossy sun glint.
  ocean: {
    tilt: -0.2, lean: 0.35, spin: 4.0, atmo: '#7cc4ff', atmoStrength: 0.75, halo: 0.55,
    surface(s, out, ctx) {
      const h = n3(s, 2.3, 3303, ctx.detail > 0.5 ? 5 : 4);
      const beach = 0.63 - ctx.pxAngle * 0.5;
      if (h > 0.63) set(out, GREEN, 0.45 + (h - 0.63) * 2.4 + (n3(s, 9, 3304, 2) - 0.5) * 0.2 * ctx.detail);
      else if (h > beach) set(out, SAND, 0.8);
      else if (h > 0.56) set(out, SHALLOW, 0.5 + (h - 0.56) * 4, 0.6);
      else set(out, WATER, 0.5 + (h - 0.35) * 0.55, 1);
      clouds(s, out, 3303, 0.665, ctx);
    },
  },
  // Umbra Deep: dark cratered moon with faint bioluminescent crystal fields.
  cavern: {
    tilt: 0.5, lean: 0.2, spin: 1.3, atmo: '#8a6cff', atmoStrength: 0.18, halo: 0.18,
    surface(s, out, ctx) {
      const n = n3(s, 3, 4404);
      set(out, MOON, 0.7 + (n - 0.5) * 0.6 + (n3(s, 10, 4405, 2) - 0.5) * 0.18 * ctx.detail);
      if (n3(s, 2.2, 4406) > 0.6) out.level -= 0.14; // dark maria
      applyCraters(s, out, ctx, CRATERS_MOON);
      // Bioluminescent crystal clusters glimmering on the night side.
      for (let i = 0; i < CRYSTALS.length; i++) {
        const k = CRYSTALS[i];
        const dx = s.x - k.c.x, dy = s.y - k.c.y, dz = s.z - k.c.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        const rr = ctx.pxAngle * (0.75 + k.r * 6);
        if (d2 < rr * rr) {
          out.emis = d2 < rr * rr * 0.2 ? '#c8fff6' : i % 3 === 0 ? '#e070ff' : '#2ee6c8';
          out.emisA = 0.95;
          out.night = true;
          break;
        }
      }
    },
  },
  // Cinder: black basalt crust split by glowing magma cracks and lava lakes.
  lava: {
    tilt: -0.45, lean: 0.2, spin: 0.2, atmo: '#ff5a1e', atmoStrength: 0.7, halo: 0.6,
    surface(s, out, ctx) {
      set(out, CRUST, 0.62 + (n3(s, 6, 5505, 3) - 0.5) * (0.25 + 0.3 * ctx.detail));
      applyCraters(s, out, ctx, CRATERS_LAVA);
      const ridge = 1 - Math.abs(n3(s, 2.9 + 0.5 * ctx.detail, 5506) - 0.5) * 2;
      const w = ctx.pxAngle * 0.75;
      if (ridge > 1 - w * 2.2) {
        out.emis = ridge > 1 - w * 0.9 ? '#fff2a0' : ridge > 1 - w * 1.6 ? '#ffa030' : '#e04810';
        out.emisA = 1;
      }
      const lake = n3(s, 2, 5507);
      if (lake > 0.63) {
        out.emis = lake > 0.68 ? '#ffd860' : lake > 0.655 ? '#ff9a28' : '#e85010';
        out.emisA = 1;
      }
    },
  },
  // Glacia: glossy ice sheets, polar caps, blue crevasses and exposed rock.
  ice: {
    tilt: 0.25, lean: 0.4, spin: 3.3, atmo: '#c4f2ff', atmoStrength: 0.55, halo: 0.45,
    surface(s, out, ctx) {
      const polar = smooth(0.6, 0.85, Math.abs(s.y));
      set(out, ICE, 0.72 + (n3(s, 2.6, 6606) - 0.5) * 0.45 + polar * 0.2, 0.45);
      if (n3(s, 2.4, 6607) > 0.73 && polar < 0.5) set(out, ICE_ROCK, 0.55 + (n3(s, 9, 6608, 2) - 0.5) * 0.4 * ctx.detail);
      if (Math.abs(n3(s, 2.8, 6609, 2) - 0.5) < ctx.pxAngle * 0.8) set(out, ICE, 0.4, 0.2);
    },
  },
  // The Rift: banded violet gas giant with a great storm and rings.
  space: {
    tilt: -0.5, lean: -0.38, spin: 0.9, atmo: '#f0a0ff', atmoStrength: 0.45, halo: 0.35,
    rings: { inner: 1.32, outer: 1.95 },
    radius: 0.56,
    surface(s, out, ctx) {
      const turb = n3(s, 3.2, 7707, ctx.detail > 0.5 ? 4 : 3) - 0.5;
      const lat = s.y + turb * 0.16;
      const b = Math.sin(lat * 19) * 0.55 + Math.sin(lat * 7.3 + 1.1) * 0.45;
      set(out, GAS, 0.7 + b * 0.2 + turb * 0.1);
      // Great storm on the lit face, left of centre, stretched along the bands.
      const c = ctx.front, r = ctx.right, dn = ctx.down;
      const sx = s.x - (c.x * 0.88 - r.x * 0.22 + dn.x * 0.3);
      const sy = s.y - (c.y * 0.88 - r.y * 0.22 + dn.y * 0.3);
      const sz = s.z - (c.z * 0.88 - r.z * 0.22 + dn.z * 0.3);
      const along = sx * r.x + sy * r.y + sz * r.z;
      const d = Math.sqrt(Math.max(0, sx * sx + sy * sy + sz * sz - along * along * 0.65));
      if (d < 0.2) set(out, GAS, d < 0.07 ? 0.98 : d < 0.13 ? 0.84 : 0.5);
    },
  },
  // Axiom Citadel: armoured grid world, glowing teal trenches, city lights on the night side.
  techno: {
    tilt: 0.15, lean: 0.3, spin: 5.1, atmo: '#2ee6c8', atmoStrength: 0.42, halo: 0.42,
    surface(s, out, ctx) {
      const lon = Math.atan2(s.x, s.z);
      const lat = Math.asin(Math.max(-1, Math.min(1, s.y)));
      const U = 9 / Math.PI, Vk = 8 / Math.PI;
      const u = lon * U, v = lat * Vk;
      const cu = Math.floor(u), cv = Math.floor(v);
      const fu = u - cu, fv = v - cv;
      const seamU = ctx.pxAngle * U * Math.max(0.35, Math.cos(lat)) * 1.05;
      const seamV = ctx.pxAngle * Vk * 1.05;
      const cell = hash1(cu * 31 + cv * 977 + 4000, 8808);
      set(out, METAL, 0.5 + cell * 0.28 + (n3(s, 12, 8809, 2) - 0.5) * 0.12 * ctx.detail, 0.7);
      if (fu < seamU || fv < seamV) set(out, METAL, 0.26, 0.2);
      const tw = 0.5 + 0.45 * ctx.detail;
      const trench = Math.abs(lat) < ctx.pxAngle * tw || (Math.abs(fu - 0.5) < seamU * 0.6 * tw && (cu === 2 || cu === -3));
      if (trench) { out.emis = '#2ee6c8'; out.emisA = 0.95; return; }
      const district = n3(s, 2.2, 8810, 3);
      const lu = 0.25 + hash1(cu * 13 + cv * 71, 8811) * 0.5, lv = 0.25 + hash1(cu * 17 + cv * 53, 8812) * 0.5;
      if (district > 0.4 && Math.abs(fu - lu) < seamU * 0.75 && Math.abs(fv - lv) < seamV * 0.75) {
        out.emis = cell > 0.5 ? '#ffe27a' : '#9ff4ff';
        out.emisA = 1;
        out.night = true;
      }
    },
  },
};

// ------------------------------------------------------------------------------ renderer

/** Rotation matrix (row-major) for planet -> view space: Rz(tilt) * Rx(lean) * Ry(spin). */
function orientation(st: PlanetStyle): number[] {
  const cz = Math.cos(st.tilt), sz = Math.sin(st.tilt);
  const cx = Math.cos(st.lean), sx = Math.sin(st.lean);
  const cy = Math.cos(st.spin), sy = Math.sin(st.spin);
  const Rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  const Rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
  const Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const mul = (a: number[], b: number[]) => {
    const o = new Array<number>(9).fill(0);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) o[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c];
    return o;
  };
  return mul(mul(Rz, Rx), Ry);
}

const LIGHT: V3 = (() => {
  const l = { x: -0.62, y: -0.56, z: 0.55 };
  const n = Math.hypot(l.x, l.y, l.z);
  return { x: l.x / n, y: l.y / n, z: l.z / n };
})();

/** Ring opacity at radius r (planet radii): 0 = empty. */
function ringDensity(r: number, inner: number, outer: number): number {
  if (r < inner || r > outer) return 0;
  const t = (r - inner) / (outer - inner);
  if (t > 0.5 && t < 0.57) return 0; // main gap
  if (t < 0.14) return 0.45;          // faint inner ring
  if (t > 0.9) return 0.55;           // faint outer edge
  return 1;
}

function blendHex(buf: PixBuf, x: number, y: number, hex: string, a: number): void {
  const c = parseColor(hex);
  buf.blendRGB(x, y, c[0], c[1], c[2], a);
}

/**
 * Replaces isolated material pixels (no 4-neighbour of the same material, >= 3 neighbours
 * agreeing on another one) by that neighbour's colour. Lighting dither (same material) and
 * emissive pixels are left untouched.
 */
function despeckle(col: (string | null)[], mat: Int16Array, keep: Uint8Array, size: number): void {
  const src = col.slice();
  const srcMat = mat.slice();
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x;
      if (!src[i] || keep[i]) continue;
      const nb = [i - 1, i + 1, i - size, i + size];
      if (nb.some((j) => !src[j])) continue;
      const m = srcMat[i];
      if (nb.some((j) => srcMat[j] === m)) continue;
      for (const j of nb) {
        let count = 0;
        for (const k of nb) if (srcMat[k] === srcMat[j]) count++;
        if (count >= 3) { col[i] = src[j]; mat[i] = srcMat[j]; break; }
      }
    }
  }
}

/** Renders one globe into a size x size buffer. */
function renderPlanet(st: PlanetStyle, size: number): PixBuf {
  const buf = new PixBuf(size, size);
  const half = size / 2;
  const R = st.rings ? half * (st.radius ?? 0.56) : half - (size >= 96 ? 4.5 : 2.5);
  const M = orientation(st);
  const toPlanet = (v: V3): V3 => ({
    x: M[0] * v.x + M[3] * v.y + M[6] * v.z,
    y: M[1] * v.x + M[4] * v.y + M[7] * v.z,
    z: M[2] * v.x + M[5] * v.y + M[8] * v.z,
  });
  const axis: V3 = { x: M[1], y: M[4], z: M[7] }; // planet Y axis in view space (ring normal)
  const ctx: PlanetCtx = {
    pxAngle: 1 / R,
    detail: smooth(20, 40, R),
    light: toPlanet(LIGHT),
    front: toPlanet({ x: 0, y: 0, z: 1 }),
    right: toPlanet({ x: 1, y: 0, z: 0 }),
    down: toPlanet({ x: 0, y: 1, z: 0 }),
  };
  const sample: Sample = { ramp: SAND, level: 0, spec: 0, shade: 0, emis: null, emisA: 0, night: false };
  const hv = { x: LIGHT.x, y: LIGHT.y, z: LIGHT.z + 1 };
  const hn = Math.hypot(hv.x, hv.y, hv.z);
  const H: V3 = { x: hv.x / hn, y: hv.y / hn, z: hv.z / hn };
  const rings = st.rings;
  const lightDotAxis = axis.x * LIGHT.x + axis.y * LIGHT.y + axis.z * LIGHT.z;

  // ---- pass 1: surface colours
  const N = size * size;
  const col: (string | null)[] = new Array<string | null>(N).fill(null);
  const mat = new Int16Array(N);
  const keep = new Uint8Array(N);
  const lamb = new Float32Array(N);
  const depth = new Float32Array(N);
  const ramps: (readonly string[])[] = [];
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px + 0.5 - half) / R, y = (py + 0.5 - half) / R;
      const r2 = x * x + y * y;
      if (r2 >= 1) continue;
      const z = Math.sqrt(1 - r2);
      const s = toPlanet({ x, y, z });
      sample.level = 0; sample.spec = 0; sample.shade = 0; sample.emis = null; sample.emisA = 0; sample.night = false;
      st.surface(s, sample, ctx);
      const lam = x * LIGHT.x + y * LIGHT.y + z * LIGHT.z;
      if (rings && Math.abs(lightDotAxis) > 1e-3) {
        // Shadow of the rings on the globe.
        const t = -(axis.x * x + axis.y * y + axis.z * z) / lightDotAxis;
        if (t > 0) {
          const qx = x + LIGHT.x * t, qy = y + LIGHT.y * t, qz = z + LIGHT.z * t;
          sample.shade -= ringDensity(Math.sqrt(qx * qx + qy * qy + qz * qz), rings.inner, rings.outer) * 0.5;
        }
      }
      const litC = Math.pow(clamp01((lam + 0.12) / 0.92 + sample.shade), 0.85);
      const nR = sample.ramp.length - 1;
      let idx = clamp01(sample.level) * nR * (0.15 + 0.85 * litC) - (1 - litC) * 1.4 + Math.pow(litC, 6) * 0.8;
      if (sample.spec > 0) idx += Math.pow(Math.max(0, x * H.x + y * H.y + z * H.z), 26) * sample.spec * 3.5;
      // Narrow ordered-dither bands between ramp steps (flat areas stay clean).
      const i = py * size + px;
      col[i] = sample.ramp[Math.max(0, Math.min(nR, Math.floor(idx + 0.5 + (bayer(px, py) - 0.5) * 0.55)))];
      let m = ramps.indexOf(sample.ramp);
      if (m < 0) { ramps.push(sample.ramp); m = ramps.length - 1; }
      mat[i] = m;
      if (sample.emis) {
        const a = sample.night ? sample.emisA * Math.pow(1 - litC, 1.4) : sample.emisA;
        if (a > bayer(px, py) * 0.9) { col[i] = sample.emis; keep[i] = 1; mat[i] = 100; }
      }
      lamb[i] = lam;
      depth[i] = z;
    }
  }

  // ---- pass 2: clean isolated material pixels
  despeckle(col, mat, keep, size);

  // ---- pass 3: compose rings (back), globe + atmosphere, rings (front), halo
  const ringAt = (px: number, py: number, x: number, y: number, front: boolean): void => {
    if (!rings || Math.abs(axis.z) < 1e-3) return;
    const z = -(axis.x * x + axis.y * y) / axis.z;
    if (x * x + y * y < 1 ? !front || z <= 0 : front) return;
    const r = Math.sqrt(x * x + y * y + z * z);
    const dens = ringDensity(r, rings.inner, rings.outer);
    if (dens <= 0) return;
    const b = x * LIGHT.x + y * LIGHT.y + z * LIGHT.z;
    const shadowed = b < 0 && b * b - (r * r - 1) > 0; // planet blocks the light
    const t = (r - rings.inner) / (rings.outer - rings.inner);
    const band = t < 0.14 ? -1 : t < 0.3 ? 1 : t < 0.5 ? 0 : t < 0.75 ? 1 : 0;
    const base = shadowed ? 1 : 3 + Math.round(Math.abs(lightDotAxis) * 1.2) + band - (front ? 0 : 1);
    const c = RING[Math.max(0, Math.min(RING.length - 1, base))];
    if (dens >= 1) buf.set(px, py, c);
    else blendHex(buf, px, py, c, dens);
  };

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = py * size + px;
      const x = (px + 0.5 - half) / R, y = (py + 0.5 - half) / R;
      ringAt(px, py, x, y, false);
      const c = col[i];
      if (c) {
        buf.set(px, py, c);
        if (st.atmo && st.atmoStrength > 0) {
          const a = Math.pow(1 - depth[i], 3.2) * st.atmoStrength * (0.15 + 0.85 * clamp01(lamb[i] + 0.4)) * 1.4;
          if (a > 0.03) blendHex(buf, px, py, st.atmo, Math.min(0.85, a));
        }
        ringAt(px, py, x, y, true);
      } else if (st.atmo && st.halo > 0) {
        const r = Math.sqrt(x * x + y * y);
        const hw = (size >= 96 ? 4.5 : 2.6) / R;
        if (r < 1 + hw) {
          const dir = clamp01(((x / r) * LIGHT.x + (y / r) * LIGHT.y) * 0.9 + 0.35);
          const a = Math.pow(1 - (r - 1) / hw, 2) * st.halo * (0.25 + 0.75 * dir);
          if (a > 0.02) blendHex(buf, px, py, st.atmo, a);
        }
      }
    }
  }
  return buf;
}

/** Generates `planet_<biome>` (48x48) and `planet_<biome>_lg` (96x96) for every biome. */
export function generatePlanetArt(scene: Phaser.Scene): void {
  for (const biome of BIOMES) {
    const st = STYLES[biome];
    addTexture(scene, planetKey(biome), renderPlanet(st, 48).toCanvas());
    addTexture(scene, `${planetKey(biome)}_lg`, renderPlanet(st, 96).toCanvas());
  }
}
