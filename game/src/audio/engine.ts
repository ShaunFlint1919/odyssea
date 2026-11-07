// =====================================================================================
//  AUDIO ENGINE — WebAudio graph shared by SFX and music.
//  sfx voices -> sfxBus (+ crunchBus: soft saturation) --\
//  songs      -> musicBus ------------------------------- mix -> high-shelf -> low-pass
//             -> DynamicsCompressor -> soft-clip ceiling (< 0 dBFS) -> destination
//  Everything here works on any BaseAudioContext (live AudioContext or OfflineAudioContext).
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

/** Band-limited pulse wave of the given duty cycle (Fourier series of a bipolar pulse). */
function pulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  const re = new Float32Array(HARMONICS + 1);
  const im = new Float32Array(HARMONICS + 1);
  for (let n = 1; n <= HARMONICS; n++) {
    re[n] = (2 * Math.sin(2 * Math.PI * n * duty)) / (Math.PI * n);
    im[n] = (2 * (1 - Math.cos(2 * Math.PI * n * duty))) / (Math.PI * n);
  }
  return ctx.createPeriodicWave(re, im);
}

/** 32-step / 16-level staircase triangle (classic chip bass), as an exact Fourier series. */
function stairTriangle(ctx: BaseAudioContext): PeriodicWave {
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
  return ctx.createPeriodicWave(re, im);
}

/** Mellow square (odd harmonics rolled off faster than 1/n) for soft leads. */
function softSquare(ctx: BaseAudioContext): PeriodicWave {
  const re = new Float32Array(HARMONICS + 1);
  const im = new Float32Array(HARMONICS + 1);
  for (let n = 1; n <= HARMONICS; n += 2) im[n] = 1 / Math.pow(n, 1.7);
  return ctx.createPeriodicWave(re, im);
}

function makeNoise(ctx: BaseAudioContext, kind: NoiseName): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * (kind === 'brown' ? 2 : 1));
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const rnd = mulberry32(kind === 'white' ? 1234 : kind === 'brown' ? 777 : 4321);
  if (kind === 'white') {
    for (let i = 0; i < len; i++) d[i] = rnd() * 2 - 1;
  } else if (kind === 'brown') {
    let last = 0;
    let peak = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (rnd() * 2 - 1)) / 1.02;
      d[i] = last;
      peak = Math.max(peak, Math.abs(last));
    }
    const norm = peak > 0 ? 0.95 / peak : 1;
    for (let i = 0; i < len; i++) d[i] *= norm;
  } else {
    // 15-bit LFSR noise as on 8/16-bit sound chips. 'metal' uses the short (93-step) loop.
    const tap = kind === 'metal' ? 6 : 1;
    const hold = Math.max(1, Math.round(sr / (kind === 'metal' ? 24000 : 14000)));
    let reg = 1;
    let out = 1;
    for (let i = 0; i < len; i++) {
      if (i % hold === 0) {
        const fb = (reg ^ (reg >> tap)) & 1;
        reg = (reg >> 1) | (fb << 14);
        out = reg & 1 ? 0.8 : -0.8;
      }
      d[i] = out;
    }
  }
  return buf;
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

/** Builds the whole bus graph + wave tables + noise tables on a context. */
export function createGraph(ctx: BaseAudioContext): Graph {
  const sfxBus = ctx.createGain();
  const musicBus = ctx.createGain();
  const crunchBus = ctx.createGain();
  const crunch = ctx.createWaveShaper();
  crunch.curve = saturateCurve(1.4);
  crunchBus.gain.value = 1.15;
  crunchBus.connect(crunch);
  crunch.connect(sfxBus);

  const mix = ctx.createGain();
  sfxBus.connect(mix);
  musicBus.connect(mix);

  const shelf = ctx.createBiquadFilter();
  shelf.type = 'highshelf';
  shelf.frequency.value = 6500;
  shelf.gain.value = -4;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 15000;
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
  clip.curve = softClipCurve(0.62);

  mix.connect(shelf);
  shelf.connect(lp);
  lp.connect(comp);
  comp.connect(makeup);
  makeup.connect(clip);

  const waves: Record<CustomWave, PeriodicWave> = {
    pulse12: pulseWave(ctx, 0.125),
    pulse25: pulseWave(ctx, 0.25),
    tri4: stairTriangle(ctx),
    soft: softSquare(ctx),
  };
  const noise: Record<NoiseName, AudioBuffer> = {
    white: makeNoise(ctx, 'white'),
    lfsr: makeNoise(ctx, 'lfsr'),
    metal: makeNoise(ctx, 'metal'),
    brown: makeNoise(ctx, 'brown'),
  };
  const canPan = typeof (ctx as { createStereoPanner?: unknown }).createStereoPanner === 'function';
  return { ctx, sfxBus, crunchBus, musicBus, output: clip, waves, noise, canPan };
}

/** Applies a WaveName to an oscillator. */
export function setWave(g: Graph, osc: OscillatorNode, w: WaveName): void {
  if (w === 'sine' || w === 'square' || w === 'sawtooth' || w === 'triangle') osc.type = w;
  else osc.setPeriodicWave(g.waves[w]);
}

/** Perceptual fader taper for the 0..1 settings sliders. */
export function faderGain(v: number): number {
  const x = Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
  return x * x;
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
