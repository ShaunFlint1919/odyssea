// =====================================================================================
//  SFX VOICES — tiny synth layers (tone / noise / FM / note sequence) built per sound and
//  a voice pool with a global cap, priority-aware stealing (oldest first) and automatic
//  disconnection when the last source of a voice ends.
//  A build may run on a Chain: the persistent level / envelope / filter nodes of an earlier
//  voice of the same key, wired once and reprogrammed (their automation is cleared from the
//  new start time). Sources (oscillators, noise players) and the gains that modulate a
//  source's own params (FM depth, vibrato) are created per play. Builds are deterministic per
//  key, so the n-th node a build asks for always plays the same role.
// =====================================================================================
import { setWave, type Graph, type NoiseName, type WaveName } from './engine';

/** A sound under construction: every layer adds its nodes and extends `end`. */
export interface Build {
  g: Graph;
  ctx: BaseAudioContext;
  /** Absolute start time (context seconds). */
  t: number;
  /** Pitch multiplier (options * random variation * combo). */
  p: number;
  /** Input of the voice (level gain). */
  out: AudioNode;
  /** Absolute time when the last layer ends. */
  end: number;
  srcs: AudioScheduledSourceNode[];
  nodes: AudioNode[];
  /** Source that stops last (its `onended` disposes the voice). */
  last: AudioScheduledSourceNode | null;
  rnd: () => number;
  /** Pooled nodes to build on (null = every node is created for this play). */
  chain: Chain | null;
  /** Index of the next pooled node the build asks for. */
  ni: number;
}

/** Persistent nodes of one voice slot of an SFX key (see the header). */
export class Chain {
  /** Gains and filters in the order the key's build asks for them. */
  readonly nodes: AudioNode[] = [];
  /** Static wiring done (the first build on this chain ran). */
  wired = false;
  /** Voice playing on it (null: never used). */
  voice: Voice | null = null;

  /** `level` is the voice input, already connected to its bus. */
  constructor(readonly level: GainNode) {}

  /**
   * Reusable for a voice starting at `t`: the last voice was disposed, or `t` is past its natural
   * end. A stolen voice's chain waits for that natural end too: clearing automation from `t` would
   * otherwise drop envelope ramps still running before `t` (sounds scheduled ahead, offline renders).
   */
  freeAt(t: number): boolean {
    const v = this.voice;
    return !v || v.dead || t >= v.until;
  }
}

export interface FilterSpec {
  type: BiquadFilterType;
  f: number;
  /** End frequency of an exponential sweep over `sw` (default: whole layer). */
  to?: number;
  q?: number;
  sw?: number;
}

export interface ToneSpec {
  w: WaveName;
  f: number;
  /** End frequency (exponential sweep unless `lin`). */
  to?: number;
  sw?: number;
  lin?: boolean;
  at?: number;
  dur: number;
  v: number;
  a?: number;
  hold?: number;
  /** Vibrato [rate Hz, depth cents]. */
  vib?: [number, number];
  det?: number;
  flt?: FilterSpec;
}

export interface NoiseSpec {
  n?: NoiseName;
  at?: number;
  dur: number;
  v: number;
  a?: number;
  hold?: number;
  rate?: number;
  rateTo?: number;
  flt?: FilterSpec;
}

export interface FmSpec {
  f: number;
  ratio: number;
  /** Modulation index at start / end. */
  i0: number;
  i1?: number;
  to?: number;
  at?: number;
  dur: number;
  v: number;
  a?: number;
}

export interface SeqSpec {
  w: WaveName;
  /** Frequencies (Hz) played one after another on a single oscillator. */
  notes: number[];
  step: number;
  at?: number;
  v: number;
  /** Length of each note (<= step). */
  nd?: number;
  /** Length of the final note. */
  last?: number;
  a?: number;
  vib?: [number, number];
  det?: number;
  flt?: FilterSpec;
}

export interface MelSpec {
  w: WaveName;
  /** [midi frequency Hz, duration s] pairs. */
  notes: [number, number][];
  at?: number;
  v: number;
  gate?: number;
  a?: number;
  vib?: [number, number];
  flt?: FilterSpec;
}

const FLOOR = 0.0004;

/** Clamps an oscillator frequency into (0, 0.45 * sampleRate] (no aliasing / range warnings). */
function hz(b: Build, f: number): number {
  return Math.min(b.ctx.sampleRate * 0.45, Math.max(1, f));
}

/** A silent gain: an envelope must not pass a source that starts a frame before its first event. */
function silentGain(ctx: BaseAudioContext): GainNode {
  const g = ctx.createGain();
  g.gain.value = 0;
  return g;
}

/** Envelope gain: the chain's next pooled gain (automation cleared from the voice start) or a new one. */
function gainNode(b: Build): GainNode {
  const c = b.chain;
  if (!c) return own(b, silentGain(b.ctx));
  let g = c.nodes[b.ni] as GainNode | undefined;
  if (g) g.gain.cancelScheduledValues(b.t);
  else c.nodes.push((g = silentGain(b.ctx)));
  b.ni++;
  return g;
}

/** Filter: the chain's next pooled filter (type / Q fixed per layer) or a new one. */
function filterNode(b: Build, type: BiquadFilterType, q: number): BiquadFilterNode {
  const c = b.chain;
  let f = c ? (c.nodes[b.ni] as BiquadFilterNode | undefined) : undefined;
  if (f) {
    f.frequency.cancelScheduledValues(b.t);
  } else {
    f = b.ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    if (c) c.nodes.push(f);
    else b.nodes.push(f);
  }
  if (c) b.ni++;
  return f;
}

/** Connection between two persistent (or this-play) nodes: made once per chain. */
function wire(b: Build, from: AudioNode, to: AudioNode): void {
  if (!b.chain || !b.chain.wired) from.connect(to);
}

/** A per-play node (source, FM / vibrato depth): disconnected when the voice is disposed. */
function own<T extends AudioNode>(b: Build, n: T): T {
  b.nodes.push(n);
  return n;
}

function track(b: Build, src: AudioScheduledSourceNode, stop: number): void {
  b.srcs.push(src);
  if (stop >= b.end || !b.last) {
    b.end = Math.max(b.end, stop);
    b.last = src;
  }
}

/** Attack / hold / exponential decay on a gain param. Returns the end time. */
function envelope(gain: AudioParam, t0: number, a: number, hold: number, dur: number, v: number): number {
  const end = t0 + Math.max(dur, a + hold + 0.005);
  gain.setValueAtTime(0, t0);
  gain.linearRampToValueAtTime(v, t0 + a);
  if (hold > 0) gain.setValueAtTime(v, t0 + a + hold);
  gain.exponentialRampToValueAtTime(FLOOR, end);
  return end;
}

function sweep(param: AudioParam, t0: number, f0: number, f1: number | undefined, dur: number, lin = false): void {
  param.setValueAtTime(f0, t0);
  if (f1 === undefined || f1 === f0) return;
  if (lin) param.linearRampToValueAtTime(f1, t0 + dur);
  else param.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
}

/** Optional filter between `src` and `dst`; returns the node the source must connect to. */
function filterInto(b: Build, spec: FilterSpec | undefined, t0: number, dur: number, dst: AudioNode, pitch: number): AudioNode {
  if (!spec) return dst;
  const f = filterNode(b, spec.type, spec.q ?? (spec.type === 'bandpass' ? 1 : 0.7));
  const maxF = b.ctx.sampleRate * 0.45;
  const f0 = Math.min(maxF, spec.f * pitch);
  const f1 = spec.to === undefined ? undefined : Math.min(maxF, spec.to * pitch);
  sweep(f.frequency, t0, f0, f1, spec.sw ?? dur);
  wire(b, f, dst);
  return f;
}

function vibrato(b: Build, osc: OscillatorNode, vib: [number, number] | undefined, t0: number, stop: number): void {
  if (!vib) return;
  const lfo = own(b, b.ctx.createOscillator());
  const depth = own(b, b.ctx.createGain());
  lfo.frequency.value = vib[0];
  depth.gain.value = vib[1];
  lfo.connect(depth);
  depth.connect(osc.detune);
  lfo.start(t0);
  lfo.stop(stop);
  track(b, lfo, stop);
}

/** Oscillator layer with pitch sweep, envelope, optional vibrato and filter sweep. */
export function tone(b: Build, s: ToneSpec): void {
  const t0 = b.t + (s.at ?? 0);
  const osc = own(b, b.ctx.createOscillator());
  setWave(b.g, osc, s.w);
  if (s.det) osc.detune.value = s.det;
  const env = gainNode(b);
  sweep(osc.frequency, t0, hz(b, s.f * b.p), s.to === undefined ? undefined : hz(b, s.to * b.p), s.sw ?? s.dur, s.lin);
  const end = envelope(env.gain, t0, s.a ?? 0.002, s.hold ?? 0, s.dur, s.v);
  wire(b, env, b.out);
  osc.connect(filterInto(b, s.flt, t0, s.dur, env, b.p));
  osc.start(t0);
  osc.stop(end + 0.01);
  track(b, osc, end + 0.01);
  vibrato(b, osc, s.vib, t0, end + 0.01);
}

/** Filtered noise layer (random offset into the pre-generated table). */
export function noise(b: Build, s: NoiseSpec): void {
  const t0 = b.t + (s.at ?? 0);
  const buf = b.g.noise[s.n ?? 'white'];
  const src = own(b, b.ctx.createBufferSource());
  src.buffer = buf;
  src.loop = true;
  const rate = s.rate ?? 1;
  sweep(src.playbackRate, t0, rate, s.rateTo, s.dur);
  const env = gainNode(b);
  const end = envelope(env.gain, t0, s.a ?? 0.001, s.hold ?? 0, s.dur, s.v);
  wire(b, env, b.out);
  src.connect(filterInto(b, s.flt, t0, s.dur, env, 1));
  src.start(t0, b.rnd() * buf.duration * 0.9);
  src.stop(end + 0.01);
  track(b, src, end + 0.01);
}

/** Two-operator FM (sine carrier, sine modulator) for metallic / bell tones. */
export function fm(b: Build, s: FmSpec): void {
  const t0 = b.t + (s.at ?? 0);
  const fc = hz(b, s.f * b.p);
  const car = own(b, b.ctx.createOscillator());
  const mod = own(b, b.ctx.createOscillator());
  const modGain = own(b, b.ctx.createGain());
  const env = gainNode(b);
  sweep(car.frequency, t0, fc, s.to === undefined ? undefined : hz(b, s.to * b.p), s.dur);
  mod.frequency.setValueAtTime(hz(b, fc * s.ratio), t0);
  const d0 = Math.max(1, s.i0 * fc * s.ratio);
  const d1 = Math.max(1, (s.i1 ?? s.i0) * fc * s.ratio);
  modGain.gain.setValueAtTime(d0, t0);
  if (d1 !== d0) modGain.gain.exponentialRampToValueAtTime(d1, t0 + s.dur);
  mod.connect(modGain);
  modGain.connect(car.frequency);
  const end = envelope(env.gain, t0, s.a ?? 0.001, 0, s.dur, s.v);
  car.connect(env);
  wire(b, env, b.out);
  car.start(t0);
  mod.start(t0);
  car.stop(end + 0.01);
  mod.stop(end + 0.01);
  track(b, mod, end + 0.01);
  track(b, car, end + 0.01);
}

/** Fast arpeggio / blip sequence on ONE oscillator with a re-triggered envelope (cheap). */
export function seq(b: Build, s: SeqSpec): void {
  const t0 = b.t + (s.at ?? 0);
  const osc = own(b, b.ctx.createOscillator());
  setWave(b.g, osc, s.w);
  if (s.det) osc.detune.value = s.det;
  const env = gainNode(b);
  const a = s.a ?? 0.002;
  const nd = Math.min(s.nd ?? s.step * 0.9, s.step - 0.002);
  const g = env.gain;
  g.setValueAtTime(0, t0);
  let end = t0;
  for (let i = 0; i < s.notes.length; i++) {
    const tn = t0 + i * s.step;
    const len = i === s.notes.length - 1 ? s.last ?? nd : nd;
    osc.frequency.setValueAtTime(hz(b, s.notes[i] * b.p), tn);
    g.setValueAtTime(0, tn);
    g.linearRampToValueAtTime(s.v, tn + a);
    g.exponentialRampToValueAtTime(FLOOR, tn + Math.max(len, a + 0.004));
    end = tn + Math.max(len, a + 0.004);
  }
  wire(b, env, b.out);
  osc.connect(filterInto(b, s.flt, t0, end - t0, env, b.p));
  osc.start(t0);
  osc.stop(end + 0.01);
  track(b, osc, end + 0.01);
  vibrato(b, osc, s.vib, t0, end + 0.01);
}

/** Melody with individual note lengths on one oscillator (jingles). Notes are [Hz, seconds]. */
export function mel(b: Build, s: MelSpec): void {
  const t0 = b.t + (s.at ?? 0);
  const osc = own(b, b.ctx.createOscillator());
  setWave(b.g, osc, s.w);
  const env = gainNode(b);
  const g = env.gain;
  const a = s.a ?? 0.004;
  const gate = s.gate ?? 0.92;
  g.setValueAtTime(0, t0);
  let tn = t0;
  for (const [f, d] of s.notes) {
    const len = Math.max(a + 0.01, d * gate);
    osc.frequency.setValueAtTime(hz(b, f * b.p), tn);
    g.setValueAtTime(0, tn);
    g.linearRampToValueAtTime(s.v, tn + a);
    g.setValueAtTime(s.v, tn + a + 0.001);
    g.exponentialRampToValueAtTime(s.v * 0.5, tn + Math.max(a + 0.003, len * 0.6));
    g.exponentialRampToValueAtTime(FLOOR, tn + len);
    tn += d;
  }
  wire(b, env, b.out);
  osc.connect(filterInto(b, s.flt, t0, tn - t0, env, b.p));
  osc.start(t0);
  osc.stop(tn + 0.02);
  track(b, osc, tn + 0.02);
  vibrato(b, osc, s.vib, t0, tn + 0.02);
}

// ------------------------------------------------------------------------- voice pool

export interface Voice {
  key: string;
  prio: number;
  start: number;
  /** When the voice stops sounding (pulled in by a steal). */
  end: number;
  /** When its last source was scheduled to stop (never changed). */
  until: number;
  level: GainNode;
  /** Level gain value of this voice (a pooled gain's `.value` may not reflect it yet). */
  gain: number;
  pan: StereoPannerNode | null;
  srcs: AudioScheduledSourceNode[];
  /** Nodes created for this play only (disconnected on dispose). */
  nodes: AudioNode[];
  /** Plays on a Chain: its level gain and pooled nodes stay connected. */
  pooled: boolean;
  dead: boolean;
}

export interface PoolStats {
  started: number;
  stolen: number;
  dropped: number;
  peak: number;
  disposed: number;
}

/** Fixed-size voice pool. A new voice may steal the oldest voice of the lowest priority. */
export class VoicePool {
  readonly stats: PoolStats = { started: 0, stolen: 0, dropped: 0, peak: 0, disposed: 0 };
  private voices: Voice[] = [];

  constructor(readonly cap: number) {}

  /** Number of voices still sounding at time `now`. */
  active(now: number): number {
    this.prune(now);
    return this.voices.length;
  }

  /** Voices with this key still sounding at `now`. */
  countKey(key: string, now: number): number {
    let n = 0;
    for (const v of this.voices) if (v.key === key && v.end > now) n++;
    return n;
  }

  /**
   * Makes room for a new voice. Returns false when the new voice must be dropped
   * (pool full of more important sounds).
   */
  reserve(key: string, prio: number, maxSame: number, now: number): boolean {
    this.prune(now);
    if (maxSame > 0) {
      let same = 0;
      let oldest: Voice | null = null;
      for (const v of this.voices) {
        if (v.key !== key) continue;
        same++;
        if (!oldest || v.start < oldest.start) oldest = v;
      }
      if (same >= maxSame && oldest) this.steal(oldest, now);
    }
    if (this.voices.length < this.cap) return true;
    let victim: Voice | null = null;
    for (const v of this.voices) {
      if (!victim || v.prio < victim.prio || (v.prio === victim.prio && v.start < victim.start)) victim = v;
    }
    if (!victim || victim.prio > prio) {
      this.stats.dropped++;
      return false;
    }
    this.steal(victim, now);
    return true;
  }

  /** Registers a finished build as a live voice and wires its auto-dispose. */
  add(key: string, prio: number, b: Build, level: GainNode, pan: StereoPannerNode | null, gain = level.gain.value): Voice {
    const v: Voice = { key, prio, start: b.t, end: b.end, until: b.end, level, gain, pan, srcs: b.srcs, nodes: b.nodes, pooled: b.chain !== null, dead: false };
    this.voices.push(v);
    this.stats.started++;
    if (this.voices.length > this.stats.peak) this.stats.peak = this.voices.length;
    if (b.last) {
      b.last.onended = () => this.dispose(v);
    }
    return v;
  }

  private steal(v: Voice, now: number): void {
    const t = Math.max(now, v.start);
    try {
      const g = v.level.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(v.gain, t);
      g.linearRampToValueAtTime(0, t + 0.012);
      for (const s of v.srcs) {
        try {
          s.stop(t + 0.02);
        } catch {
          /* already stopped */
        }
      }
    } catch {
      /* node already gone */
    }
    v.end = Math.min(v.end, t + 0.02);
    this.stats.stolen++;
    const i = this.voices.indexOf(v);
    if (i >= 0) this.voices.splice(i, 1);
  }

  private prune(now: number): void {
    let w = 0;
    for (let r = 0; r < this.voices.length; r++) {
      const v = this.voices[r];
      if (v.end > now && !v.dead) this.voices[w++] = v;
    }
    this.voices.length = w;
  }

  private dispose(v: Voice): void {
    if (v.dead) return;
    v.dead = true;
    this.stats.disposed++;
    for (const n of v.nodes) {
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
    if (!v.pooled) {
      try {
        v.level.disconnect();
        v.pan?.disconnect();
      } catch {
        /* ignore */
      }
    }
    const i = this.voices.indexOf(v);
    if (i >= 0) this.voices.splice(i, 1);
  }
}
