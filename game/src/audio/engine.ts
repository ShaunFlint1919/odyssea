// =====================================================================================
//  AUDIO ENGINE — WebAudio graph shared by SFX and music.
//  sfx voices -> sfxBus (+ crunchBus: soft saturation) --\
//  songs      -> musicBus ------------------------------- mix -> high-shelf -> low-pass
//             -> DynamicsCompressor -> soft-clip ceiling (< 0 dBFS) -> destination
//  Everything here works on any BaseAudioContext (live AudioContext or OfflineAudioContext).
//  The context-free tables (noise as 48 kHz AudioBuffers, wave coefficients, shaper curves) are
//  module-wide: prepareAudioTables() builds them in idle slices before the first gesture, and
//  createGraph() builds whatever is still missing.
// =====================================================================================

/** Oscillator timbres: native types + custom PeriodicWaves (pulse duty cycles, 4-bit triangle). */
export type WaveName = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'pulse12' | 'pulse25' | 'tri4' | 'soft';
type CustomWave = 'pulse12' | 'pulse25' | 'tri4' | 'soft';
/** Pre-generated noise tables: white, chip LFSR (crunchy), short-loop LFSR (metallic), brown (rumble). */
export type NoiseName = 'white' | 'lfsr' | 'metal' | 'brown';

export interface Graph {
  ctx: BaseAudioContext;
  /** SFX volume bus. */
  sfxBus: GainNode;
  /** Saturating sub-bus for crunchy SFX (explosions, heavy hits); feeds sfxBus. */
  crunchBus: GainNode;
  /** Music volume bus. */
  musicBus: GainNode;
  /** Last node of the master chain (connect it to the destination). */
  output: AudioNode;
  waves: Record<CustomWave, PeriodicWave>;
  noise: Record<NoiseName, AudioBuffer>;
  /** StereoPannerNode support (missing on some old WebViews). */
  canPan: boolean;
}

/** Deterministic PRNG (mulberry32): same noise tables on every boot. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HARMONICS = 64;

/** Fourier coefficients of a custom wave (cos / sin terms), as createPeriodicWave takes them. */
interface WaveCoeffs { re: Float32Array<ArrayBuffer>; im: Float32Array<ArrayBuffer> }

/** Band-limited pulse wave of the given duty cycle (Fourier series of a bipolar pulse). */
function pulseCoeffs(duty: number): WaveCoeffs {
  const re = new Float32Array(HARMONICS + 1);
  const im = new Float32Array(HARMONICS + 1);
  for (let n = 1; n <= HARMONICS; n++) {
    re[n] = (2 * Math.sin(2 * Math.PI * n * duty)) / (Math.PI * n);
    im[n] = (2 * (1 - Math.cos(2 * Math.PI * n * duty))) / (Math.PI * n);
  }
  return { re, im };
}

/** 32-step / 16-level staircase triangle (classic chip bass), as an exact Fourier series. */
function stairCoeffs(): WaveCoeffs {
  const steps = 32;
  const vals: number[] = [];
  for (let k = 0; k < steps; k++) {
    const level = k < 16 ? 15 - k : k - 16; // 15..0, 0..15
    vals.push(level / 7.5 - 1);
  }
  const re = new Float32Array(HARMONICS + 1);
  const im = new Float32Array(HARMONICS + 1);
  for (let n = 1; n <= HARMONICS; n++) {
    let a = 0;
    let b = 0;
    const w = 2 * Math.PI * n;
    for (let k = 0; k < steps; k++) {
      const x0 = k / steps;
      const x1 = (k + 1) / steps;
      a += vals[k] * (Math.sin(w * x1) - Math.sin(w * x0));
      b += vals[k] * (Math.cos(w * x0) - Math.cos(w * x1));
    }
    re[n] = a / (Math.PI * n);
    im[n] = b / (Math.PI * n);
  }
  return { re, im };
}

/** Mellow square (odd harmonics rolled off faster than 1/n) for soft leads. */
function softCoeffs(): WaveCoeffs {
  const re = new Float32Array(HARMONICS + 1);
  const im = new Float32Array(HARMONICS + 1);
  for (let n = 1; n <= HARMONICS; n += 2) im[n] = 1 / Math.pow(n, 1.7);
  return { re, im };
}

const WAVE_COEFFS: Record<CustomWave, () => WaveCoeffs> = {
  pulse12: () => pulseCoeffs(0.125),
  pulse25: () => pulseCoeffs(0.25),
  tri4: stairCoeffs,
  soft: softCoeffs,
};

/** Rate of the shared noise tables (an AudioBuffer plays at its own rate on any context). */
const NOISE_RATE = 48000;
const NOISE_SEED: Record<NoiseName, number> = { white: 1234, lfsr: 4321, metal: 4321, brown: 777 };

/** Generator state of one noise table, so that it can be filled in idle slices. */
interface NoiseFill {
  kind: NoiseName;
  d: Float32Array;
  table: NoiseTable;
  /** Next sample to generate, then (brown noise) next sample to normalise. */
  i: number;
  norm: number;
  /** mulberry32 state, brown-noise integrator / peak, LFSR register / output. */
  a: number;
  last: number;
  peak: number;
  reg: number;
  out: number;
}

/** mulberry32 step on a state word: next state in `rngOut[0]`, returns a sample in [-1, 1). */
const rngOut = new Uint32Array(1);
function rng(a: number): number {
  a = (a + 0x6d2b79f5) >>> 0;
  rngOut[0] = a;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
}

function fillWhite(f: NoiseFill, end: number): void {
  const d = f.d;
  let a = f.a;
  for (let i = f.i; i < end; i++) {
    d[i] = rng(a);
    a = rngOut[0];
  }
  f.a = a;
}

function fillBrown(f: NoiseFill, end: number): void {
  const d = f.d;
  let a = f.a;
  let last = f.last;
  let peak = f.peak;
  for (let i = f.i; i < end; i++) {
    last = (last + 0.02 * rng(a)) / 1.02;
    a = rngOut[0];
    d[i] = last;
    const m = last < 0 ? -last : last;
    if (m > peak) peak = m;
  }
  f.a = a;
  f.last = last;
  f.peak = peak;
}

/** 15-bit LFSR noise as on 8/16-bit sound chips. 'metal' uses the short (93-step) loop. */
function fillLfsr(f: NoiseFill, end: number): void {
  const d = f.d;
  const metal = f.kind === 'metal';
  const tap = metal ? 6 : 1;
  const hold = Math.max(1, Math.round(NOISE_RATE / (metal ? 24000 : 14000)));
  let reg = f.reg;
  let out = f.out;
  for (let i = f.i; i < end; i++) {
    if (i % hold === 0) {
      const fb = (reg ^ (reg >> tap)) & 1;
      reg = (reg >> 1) | (fb << 14);
      out = reg & 1 ? 0.8 : -0.8;
    }
    d[i] = out;
  }
  f.reg = reg;
  f.out = out;
}

/** Processes up to `n` more samples of `f` (generation, then brown-noise normalisation); true when complete. */
function fillNoise(f: NoiseFill, n: number): boolean {
  const d = f.d;
  const len = d.length;
  if (f.i < len) {
    const end = Math.min(len, f.i + n);
    if (f.kind === 'white') fillWhite(f, end);
    else if (f.kind === 'brown') fillBrown(f, end);
    else fillLfsr(f, end);
    f.i = end;
    return end === len && f.kind !== 'brown';
  }
  const end = Math.min(len, f.norm + n);
  const k = f.peak > 0 ? 0.95 / f.peak : 1;
  for (let i = f.norm; i < end; i++) d[i] *= k;
  f.norm = end;
  return end === len;
}

type BufferCtor = new (opts: AudioBufferOptions) => AudioBuffer;

let bufferCtor: BufferCtor | null | undefined;

/** The context-free AudioBuffer constructor (Chrome 55+), or null (probed once). */
function audioBufferCtor(): BufferCtor | null {
  if (bufferCtor !== undefined) return bufferCtor;
  const C = (globalThis as { AudioBuffer?: unknown }).AudioBuffer;
  bufferCtor = null;
  if (typeof C === 'function') {
    try {
      new (C as BufferCtor)({ length: 1, sampleRate: NOISE_RATE, numberOfChannels: 1 });
      bufferCtor = C as BufferCtor;
    } catch {
      /* old engine: tables stay raw samples, copied into context buffers by createGraph() */
    }
  }
  return bufferCtor;
}

/** A noise table made before any context exists: an AudioBuffer when possible, else raw samples. */
type NoiseTable = AudioBuffer | Float32Array<ArrayBuffer>;

/** Tables shared by every graph (live context, offline renders): prepareAudioTables() or on demand. */
const tables = {
  waves: {} as Partial<Record<CustomWave, WaveCoeffs>>,
  noise: {} as Partial<Record<NoiseName, NoiseTable>>,
  clip: null as Float32Array<ArrayBuffer> | null,
  crunch: null as Float32Array<ArrayBuffer> | null,
};

const NOISE_KINDS: NoiseName[] = ['white', 'lfsr', 'metal', 'brown'];
const CUSTOM_WAVES = Object.keys(WAVE_COEFFS) as CustomWave[];
/** Samples processed per warm-up slice (a fraction of a ms at 1x CPU). */
const NOISE_SLICE = 4096;
const fills: Partial<Record<NoiseName, NoiseFill>> = {};

function startNoise(kind: NoiseName): NoiseFill {
  const len = Math.floor(NOISE_RATE * (kind === 'brown' ? 2 : 1));
  const C = audioBufferCtor();
  let table: NoiseTable;
  let d: Float32Array;
  if (C) {
    const buf = new C({ length: len, sampleRate: NOISE_RATE, numberOfChannels: 1 });
    table = buf;
    d = buf.getChannelData(0);
  } else {
    d = table = new Float32Array(len);
  }
  return { kind, d, table, i: 0, norm: 0, a: NOISE_SEED[kind] >>> 0, last: 0, peak: 0, reg: 1, out: 1 };
}

/** The noise table of `kind`, processing at most `budget` more samples (all of them by default); null while unfinished. */
function noiseTable(kind: NoiseName, budget = Infinity): NoiseTable | null {
  const ready = tables.noise[kind];
  if (ready) return ready;
  const f = (fills[kind] ??= startNoise(kind));
  let done = fillNoise(f, budget);
  while (!done && budget === Infinity) done = fillNoise(f, budget);
  if (!done) return null;
  delete fills[kind];
  return (tables.noise[kind] = f.table);
}

function tablesReady(): boolean {
  return NOISE_KINDS.every((k) => tables.noise[k]) && CUSTOM_WAVES.every((w) => tables.waves[w]) && !!tables.clip && !!tables.crunch;
}

/**
 * Does one small slice of the context-free preparation (noise tables, wave coefficients, shaper
 * curves). Call it from idle time before the first gesture so that createGraph() mostly creates
 * nodes. Returns true once everything is ready; createGraph() builds whatever is still missing.
 */
export function prepareAudioTables(): boolean {
  const noise = NOISE_KINDS.find((k) => !tables.noise[k]);
  const wave = CUSTOM_WAVES.find((w) => !tables.waves[w]);
  if (noise) noiseTable(noise, NOISE_SLICE);
  else if (wave) tables.waves[wave] = WAVE_COEFFS[wave]();
  else if (!tables.clip) tables.clip = softClipCurve(0.62);
  else if (!tables.crunch) tables.crunch = saturateCurve(1.4);
  return tablesReady();
}

function noiseBuffer(ctx: BaseAudioContext, kind: NoiseName): AudioBuffer {
  const t = noiseTable(kind) as NoiseTable;
  if (!(t instanceof Float32Array)) return t;
  const buf = ctx.createBuffer(1, t.length, NOISE_RATE);
  buf.getChannelData(0).set(t);
  return buf;
}

function periodicWave(ctx: BaseAudioContext, w: CustomWave): PeriodicWave {
  const c = (tables.waves[w] ??= WAVE_COEFFS[w]());
  return ctx.createPeriodicWave(c.re, c.im);
}

/** Transparent below |x| = knee, then a tanh shoulder; the ceiling stays below 0 dBFS. */
function softClipCurve(knee: number, n = 2048): Float32Array<ArrayBuffer> {
  const c = new Float32Array(n);
  const room = 1 - knee;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const ax = Math.abs(x);
    const y = ax <= knee ? ax : knee + room * 0.95 * Math.tanh((ax - knee) / (room * 0.95));
    c[i] = Math.sign(x) * y;
  }
  return c;
}

/** Unity small-signal gain, smooth saturation towards 1/k: adds grit to loud transients. */
function saturateCurve(k: number, n = 1024): Float32Array<ArrayBuffer> {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(k * x) / k;
  }
  return c;
}

/** Builds the whole bus graph on a context; wave / noise tables and curves come from `tables` (built now if missing). */
export function createGraph(ctx: BaseAudioContext): Graph {
  const sfxBus = ctx.createGain();
  const musicBus = ctx.createGain();
  const crunchBus = ctx.createGain();
  const crunch = ctx.createWaveShaper();
  crunch.curve = (tables.crunch ??= saturateCurve(1.4));
  crunchBus.gain.value = 1.15;
  crunchBus.connect(crunch);
  crunch.connect(sfxBus);

  const mix = ctx.createGain();
  sfxBus.connect(mix);
  musicBus.connect(mix);

  const shelf = ctx.createBiquadFilter();
  shelf.type = 'highshelf';
  shelf.frequency.value = Math.min(6500, ctx.sampleRate * 0.4);
  shelf.gain.value = -4;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(15000, ctx.sampleRate * 0.45);
  lp.Q.value = 0.5;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.knee.value = 10;
  comp.ratio.value = 5;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;

  const makeup = ctx.createGain();
  makeup.gain.value = 1.1;
  const clip = ctx.createWaveShaper();
  clip.curve = (tables.clip ??= softClipCurve(0.62));

  mix.connect(shelf);
  shelf.connect(lp);
  lp.connect(comp);
  comp.connect(makeup);
  makeup.connect(clip);

  const waves: Record<CustomWave, PeriodicWave> = {
    pulse12: periodicWave(ctx, 'pulse12'),
    pulse25: periodicWave(ctx, 'pulse25'),
    tri4: periodicWave(ctx, 'tri4'),
    soft: periodicWave(ctx, 'soft'),
  };
  const noise: Record<NoiseName, AudioBuffer> = {
    white: noiseBuffer(ctx, 'white'),
    lfsr: noiseBuffer(ctx, 'lfsr'),
    metal: noiseBuffer(ctx, 'metal'),
    brown: noiseBuffer(ctx, 'brown'),
  };
  const canPan = typeof (ctx as { createStereoPanner?: unknown }).createStereoPanner === 'function';
  return { ctx, sfxBus, crunchBus, musicBus, output: clip, waves, noise, canPan };
}

/** Applies a WaveName to an oscillator. */
export function setWave(g: Graph, osc: OscillatorNode, w: WaveName): void {
  if (w === 'sine' || w === 'square' || w === 'sawtooth' || w === 'triangle') osc.type = w;
  else osc.setPeriodicWave(g.waves[w]);
}

/** Perceptual fader taper for the 0..1 settings sliders (0.6 -> -6.2 dB, 0.8 -> -2.7 dB). */
export function faderGain(v: number): number {
  const x = Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
  return Math.pow(x, 1.4);
}

/** Nominal bus levels at full slider position (music sits under the SFX). */
export const SFX_LEVEL = 0.9;
export const MUSIC_LEVEL = 0.62;

type AudioCtor = new (opts?: AudioContextOptions) => AudioContext;
type OfflineCtor = new (channels: number, length: number, sampleRate: number) => OfflineAudioContext;

/** The AudioContext constructor of this platform, or null (node / vitest / very old WebViews). */
export function audioContextCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** The OfflineAudioContext constructor (debug renders), or null. */
export function offlineContextCtor(): OfflineCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { OfflineAudioContext?: OfflineCtor; webkitOfflineAudioContext?: OfflineCtor };
  return w.OfflineAudioContext ?? w.webkitOfflineAudioContext ?? null;
}

/** Swallows a possibly-undefined promise (old WebKit returns undefined from resume/suspend). */
export function quiet(p: unknown): void {
  if (p && typeof (p as Promise<unknown>).then === 'function') (p as Promise<unknown>).then(undefined, () => undefined);
}
