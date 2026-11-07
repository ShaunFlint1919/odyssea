// =====================================================================================
//  SONG FORMAT + COMPILER (pure TypeScript, no WebAudio — unit-tested in node).
//
//  A song = instruments + named patterns + a play order (optional one-shot intro).
//  A pattern (2-4 bars) =
//   chords: "Am F C G" (one bar each) or "Am:8 G:8" (length in steps); '|' is ignored.
//   lead:   explicit melody, bars separated by '|', tokens NOTE[:steps] | -[:steps] (rest)
//           | ~[:steps] (tie: extends the previous note). Each bar must fill exactly.
//   bass / arp: one char per step, repeated cyclically, applied to the current chord:
//           '0'..'9' chord tone index (wraps up an octave per chord size), 'o' root+12,
//           'b' fifth below the root, 'a' semitone approach to the next chord root,
//           '.' hold, '-' rest.
//   drums:  lanes k (x X), s (x X g=ghost c=clap l/m/h toms), h (x X o=open c=crash r=ride),
//           one char per step (repeated); `fill` replaces the last bar; `crash` on step 0.
//  Order entries may transpose a pattern: "A^2" = pattern A two semitones up.
// =====================================================================================
import type { WaveName } from './engine';
import { chordTone, noteToMidi, parseChord, placeRoot, type Chord } from './theory';

export interface InstDef {
  w: WaveName;
  /** Channel level. */
  v: number;
  a?: number;
  d?: number;
  /** Sustain level 0..1. */
  s?: number;
  r?: number;
  /** Fraction of the note length that sounds (>= 1 = legato). */
  gate?: number;
  /** Vibrato [rate Hz, depth cents, delay s]. */
  vib?: [number, number, number];
  /** Low-pass cutoff (Hz) — enables a filter; `fenv` adds a per-note envelope (Hz). */
  lp?: number;
  q?: number;
  fenv?: number;
  fdec?: number;
  /** Second oscillator detuned by this many cents (chorus). */
  det?: number;
  /** Portamento (s) between legato notes. */
  slide?: number;
  /** Echo send level. */
  echo?: number;
  /** Octave shift. */
  oct?: number;
}

export interface DrumKitDef {
  v: number;
  kick?: [number, number, number];   // start Hz, end Hz, decay s
  snare?: [number, number, number];  // tone Hz, noise band-pass Hz, decay s
  hat?: [number, number];            // high-pass Hz, closed decay s
  metal?: boolean;                   // metallic (short LFSR) hats
  echo?: number;
}

export interface EchoDef {
  /** Delay time in beats. */
  beats: number;
  fb: number;
  wet: number;
  /** Low-pass in the feedback loop (Hz). */
  tone?: number;
}

export interface DrumLanes {
  k: string;
  s: string;
  h: string;
}

export interface DrumPattern extends DrumLanes {
  fill?: DrumLanes;
  crash?: boolean;
}

export interface PatternDef {
  chords: string;
  lead?: string;
  bass?: string;
  arp?: string;
  drums?: DrumPattern;
}

export interface SongDef {
  /** Display name (debug / tests). */
  name: string;
  bpm: number;
  /** Steps per beat (4 = 16th notes, 3 = triplet feel). */
  beat?: number;
  /** Steps per bar. */
  bar?: number;
  /** Delay applied to odd steps, fraction of a step. */
  swing?: number;
  /** Song mix gain (loudness matching between tracks, default 1). */
  gain?: number;
  inst: { lead: InstDef; bass: InstDef; arp: InstDef };
  kit: DrumKitDef;
  echo?: EchoDef;
  /** Lowest MIDI note for bass roots / arp roots. */
  bassBase?: number;
  arpBase?: number;
  /** Defaults for patterns that omit a channel. */
  def: { bass: string; arp: string; drums: DrumPattern };
  patterns: Record<string, PatternDef>;
  intro?: string[];
  order: string[];
}

// Drum bit mask (one Uint16 per step).
export const DR = {
  KICK: 1, KICK_ACC: 2, SNARE: 4, SNARE_ACC: 8, GHOST: 16, CLAP: 32,
  TOM_L: 64, TOM_M: 128, TOM_H: 256, HAT: 512, HAT_ACC: 1024, HAT_OPEN: 2048, CRASH: 4096, RIDE: 8192,
} as const;

export interface CompiledPattern {
  name: string;
  steps: number;
  /** MIDI note starting at each step, -1 = nothing new. */
  lead: Int16Array;
  leadLen: Uint16Array;
  bass: Int16Array;
  bassLen: Uint16Array;
  arp: Int16Array;
  arpLen: Uint16Array;
  drums: Uint16Array;
}

export interface CompiledSong {
  name: string;
  bpm: number;
  beat: number;
  bar: number;
  /** Seconds per step. */
  stepDur: number;
  swing: number;
  /** Playlist (intro + loop order). */
  seq: CompiledPattern[];
  /** Index in `seq` where the loop restarts. */
  loopStart: number;
  /** Duration of one loop in seconds. */
  loopSeconds: number;
  def: SongDef;
}

export const RANGES = {
  lead: [48, 100],
  bass: [24, 64],
  arp: [45, 103],
} as const;

const strip = (s: string): string => s.replace(/[\s|]/g, '');

function parseChords(src: string, bar: number, ctx: string): { chords: Chord[]; starts: number[] } {
  const out: Chord[] = [];
  const starts: number[] = [];
  for (const tok of src.split(/[\s|]+/).filter(Boolean)) {
    const [sym, lenStr] = tok.split(':');
    const len = lenStr === undefined ? bar : Number(lenStr);
    const ch = parseChord(sym);
    if (!ch) throw new Error(`${ctx}: unknown chord "${sym}"`);
    if (!Number.isInteger(len) || len <= 0) throw new Error(`${ctx}: bad chord length "${tok}"`);
    starts.push(out.length);
    for (let i = 0; i < len; i++) out.push(ch);
  }
  return { chords: out, starts };
}

function parseLead(src: string, bar: number, steps: number, tr: number, ctx: string): Int16Array {
  const notes = new Int16Array(steps).fill(-1);
  const bars = src.split('|').map((b) => b.trim()).filter(Boolean);
  if (bars.length * bar !== steps) throw new Error(`${ctx}: lead has ${bars.length} bars, pattern needs ${steps / bar}`);
  let pos = 0;
  bars.forEach((b, bi) => {
    let sum = 0;
    for (const tok of b.split(/\s+/).filter(Boolean)) {
      const [n, lenStr] = tok.split(':');
      const len = lenStr === undefined ? 2 : Number(lenStr);
      if (!Number.isInteger(len) || len <= 0) throw new Error(`${ctx}: bad length in "${tok}"`);
      if (n === '-') notes[pos] = -1;
      else if (n === '~') {
        if (pos === 0) throw new Error(`${ctx}: a pattern cannot start with a tie`);
      } else {
        const midi = noteToMidi(n);
        if (midi === null) throw new Error(`${ctx}: bad note "${tok}"`);
        notes[pos] = midi + tr;
      }
      // Mark rests explicitly so lengths stop there.
      if (n === '-') notes[pos] = -2;
      pos += len;
      sum += len;
    }
    if (sum !== bar) throw new Error(`${ctx}: lead bar ${bi + 1} has ${sum} steps (expected ${bar})`);
  });
  return notes;
}

/** Note lengths: distance to the next note start or rest (-2). Converts rests to -1. */
function lengths(notes: Int16Array): Uint16Array {
  const len = new Uint16Array(notes.length);
  let next = notes.length;
  for (let i = notes.length - 1; i >= 0; i--) {
    if (notes[i] >= 0) {
      len[i] = next - i;
      next = i;
    } else if (notes[i] === -2) {
      next = i;
      notes[i] = -1;
    }
  }
  return len;
}

function expandTemplate(
  tpl: string,
  chords: Chord[],
  chordStarts: number[],
  base: number,
  tr: number,
  ctx: string,
): Int16Array {
  const t = strip(tpl);
  if (!t.length) throw new Error(`${ctx}: empty template`);
  if (t[0] === '.') throw new Error(`${ctx}: template cannot start with a hold`);
  const steps = chords.length;
  const notes = new Int16Array(steps).fill(-1);
  for (let i = 0; i < steps; i++) {
    const c = t[i % t.length];
    const ch = chords[i];
    const root = placeRoot((ch.root + tr + 120) % 12, base);
    if (c === '.') continue;
    if (c === '-') {
      notes[i] = -2;
    } else if (c >= '0' && c <= '9') {
      notes[i] = chordTone(root, ch, c.charCodeAt(0) - 48);
    } else if (c === 'o') {
      notes[i] = root + 12;
    } else if (c === 'b') {
      notes[i] = root - 5;
    } else if (c === 'a') {
      const nextStart = chordStarts.find((s) => s > i) ?? 0;
      const nx = chords[nextStart];
      notes[i] = placeRoot((nx.root + tr + 120) % 12, base) - 1;
    } else {
      throw new Error(`${ctx}: bad template char "${c}"`);
    }
  }
  return notes;
}

function laneChar(lane: string, i: number): string {
  return lane.length ? lane[i % lane.length] : '.';
}

function drumBits(k: string, s: string, h: string, ctx: string): number {
  let bits = 0;
  if (k === 'x') bits |= DR.KICK;
  else if (k === 'X') bits |= DR.KICK | DR.KICK_ACC;
  else if (k !== '.') throw new Error(`${ctx}: bad kick char "${k}"`);
  switch (s) {
    case 'x': bits |= DR.SNARE; break;
    case 'X': bits |= DR.SNARE | DR.SNARE_ACC; break;
    case 'g': bits |= DR.GHOST; break;
    case 'c': bits |= DR.CLAP; break;
    case 'l': bits |= DR.TOM_L; break;
    case 'm': bits |= DR.TOM_M; break;
    case 'h': bits |= DR.TOM_H; break;
    case '.': break;
    default: throw new Error(`${ctx}: bad snare char "${s}"`);
  }
  switch (h) {
    case 'x': bits |= DR.HAT; break;
    case 'X': bits |= DR.HAT | DR.HAT_ACC; break;
    case 'o': bits |= DR.HAT_OPEN; break;
    case 'c': bits |= DR.CRASH; break;
    case 'r': bits |= DR.RIDE; break;
    case '.': break;
    default: throw new Error(`${ctx}: bad hat char "${h}"`);
  }
  return bits;
}

function compileDrums(d: DrumPattern, steps: number, bar: number, ctx: string): Uint16Array {
  const out = new Uint16Array(steps);
  const lanes = { k: strip(d.k), s: strip(d.s), h: strip(d.h) };
  const fill = d.fill ? { k: strip(d.fill.k), s: strip(d.fill.s), h: strip(d.fill.h) } : null;
  const fillFrom = steps - bar;
  for (let i = 0; i < steps; i++) {
    const L = fill && i >= fillFrom ? fill : lanes;
    const j = fill && i >= fillFrom ? i - fillFrom : i;
    out[i] = drumBits(laneChar(L.k, j), laneChar(L.s, j), laneChar(L.h, j), ctx);
  }
  if (d.crash) out[0] |= DR.CRASH;
  return out;
}

/** Compiles one pattern (optionally transposed). Throws a descriptive Error when malformed. */
export function compilePattern(song: SongDef, name: string, tr: number, ctx: string): CompiledPattern {
  const p = song.patterns[name];
  if (!p) throw new Error(`${ctx}: unknown pattern "${name}"`);
  const bar = song.bar ?? 16;
  const c = `${ctx}/${name}`;
  const { chords, starts } = parseChords(p.chords, bar, c);
  const steps = chords.length;
  if (steps === 0 || steps % bar !== 0) throw new Error(`${c}: chords cover ${steps} steps (not whole bars)`);
  const bars = steps / bar;
  if (bars < 1 || bars > 8) throw new Error(`${c}: ${bars} bars (expected 1..8)`);
  const lead = p.lead ? parseLead(p.lead, bar, steps, tr, c) : new Int16Array(steps).fill(-1);
  const bass = expandTemplate(p.bass ?? song.def.bass, chords, starts, song.bassBase ?? 40, tr, `${c}.bass`);
  const arp = expandTemplate(p.arp ?? song.def.arp, chords, starts, song.arpBase ?? 60, tr, `${c}.arp`);
  const drums = compileDrums(p.drums ?? song.def.drums, steps, bar, `${c}.drums`);
  return {
    name: tr ? `${name}^${tr}` : name,
    steps,
    lead,
    leadLen: lengths(lead),
    bass,
    bassLen: lengths(bass),
    arp,
    arpLen: lengths(arp),
    drums,
  };
}

function parseOrderEntry(e: string): { name: string; tr: number } {
  const m = /^([A-Za-z0-9_]+)(?:\^(-?\d+))?$/.exec(e);
  if (!m) return { name: e, tr: 0 };
  return { name: m[1], tr: m[2] ? Number(m[2]) : 0 };
}

/** Compiles a whole song into per-step arrays for the scheduler. */
export function compileSong(song: SongDef, ctx = song.name): CompiledSong {
  const beat = song.beat ?? 4;
  const bar = song.bar ?? 16;
  if (!(song.bpm >= 40 && song.bpm <= 240)) throw new Error(`${ctx}: bpm ${song.bpm} out of range`);
  if (bar % beat !== 0) throw new Error(`${ctx}: bar (${bar}) must be a multiple of beat (${beat})`);
  if (!song.order.length) throw new Error(`${ctx}: empty order`);
  const intro = song.intro ?? [];
  const seq = [...intro, ...song.order].map((e) => {
    const { name, tr } = parseOrderEntry(e);
    return compilePattern(song, name, tr, ctx);
  });
  const stepDur = 60 / song.bpm / beat;
  const loopSteps = seq.slice(intro.length).reduce((n, p) => n + p.steps, 0);
  return {
    name: song.name,
    bpm: song.bpm,
    beat,
    bar,
    stepDur,
    swing: song.swing ?? 0,
    seq,
    loopStart: intro.length,
    loopSeconds: loopSteps * stepDur,
    def: song,
  };
}

/** Lists problems of a song (compile errors, notes out of channel ranges). Empty = valid. */
export function validateSong(song: SongDef, ctx = song.name): string[] {
  const errors: string[] = [];
  let compiled: CompiledSong;
  try {
    compiled = compileSong(song, ctx);
  } catch (e) {
    return [String((e as Error).message ?? e)];
  }
  const check = (arr: Int16Array, range: readonly [number, number], label: string, oct = 0): void => {
    for (let i = 0; i < arr.length; i++) {
      const n = arr[i] + 12 * oct;
      if (arr[i] >= 0 && (n < range[0] || n > range[1])) errors.push(`${label} step ${i}: note ${n} outside ${range[0]}..${range[1]}`);
    }
  };
  for (const p of compiled.seq) {
    check(p.lead, RANGES.lead, `${ctx}/${p.name}.lead`, song.inst.lead.oct ?? 0);
    check(p.bass, RANGES.bass, `${ctx}/${p.name}.bass`, song.inst.bass.oct ?? 0);
    check(p.arp, RANGES.arp, `${ctx}/${p.name}.arp`, song.inst.arp.oct ?? 0);
  }
  for (const name of Object.keys(song.patterns)) {
    if (![...(song.intro ?? []), ...song.order].some((e) => parseOrderEntry(e).name === name)) {
      errors.push(`${ctx}: pattern "${name}" is never played`);
    }
  }
  return errors;
}
