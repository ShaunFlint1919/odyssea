// =====================================================================================
//  SFX — every SfxKey designed procedurally (oscillators, chip noise, FM, sweeps).
//  Each definition carries its mixing rules: minimum gap between two plays (rate limit),
//  max simultaneous voices of the same key, steal priority and level.
// =====================================================================================
import type { SfxKey } from '../types';
import type { Graph } from './engine';
import { mtof } from './theory';
import { fm, mel, noise, seq, tone, VoicePool, type Build } from './voices';

export interface SfxDef {
  /** Minimum seconds between two plays of this key (extra calls are ignored). */
  gap: number;
  /** Max simultaneous voices of this key (the oldest one is stolen). */
  max: number;
  /** Steal priority 0 (spam) .. 3 (never stolen by lower priorities). */
  prio: number;
  /** Voice level. */
  v: number;
  /** Random pitch variation (fraction, default 0.04 = ±4 %). */
  vary?: number;
  /** Route through the saturating crunch bus. */
  crunch?: boolean;
  build: (b: Build) => void;
}

const m = mtof;

/** Explosion burst: noise body with closing low-pass + sine drop + chip crackle. */
function boom(b: Build, at: number, size: number, v: number): void {
  noise(b, { n: 'white', at, dur: 0.3 * size, v: 0.6 * v, flt: { type: 'lowpass', f: 4200 / Math.sqrt(size), to: 140, q: 0.9 } });
  tone(b, { w: 'sine', at, f: 190 / Math.sqrt(size), to: 26, sw: 0.18 * size, dur: 0.24 * size, v: 0.7 * v, a: 0.002 });
  noise(b, { n: 'lfsr', at, rate: 0.5 / Math.sqrt(size), dur: 0.12 * size, v: 0.4 * v, flt: { type: 'bandpass', f: 1100 / Math.sqrt(size), q: 0.9 } });
}

export const SFX_DEFS: Record<SfxKey, SfxDef> = {
  // ------------------------------------------------------------------ player weapons
  shot_pulse: {
    gap: 0.055, max: 4, prio: 0, v: 0.47,
    build: (b) => {
      tone(b, { w: 'pulse25', f: 1500, to: 380, dur: 0.085, v: 0.5, a: 0.001, flt: { type: 'lowpass', f: 6500, to: 1800 } });
      tone(b, { w: 'square', f: 750, to: 190, dur: 0.06, v: 0.18, a: 0.001 });
      noise(b, { dur: 0.018, v: 0.22, flt: { type: 'highpass', f: 3500 } });
    },
  },
  shot_scatter: {
    gap: 0.07, max: 3, prio: 0, v: 0.58,
    build: (b) => {
      tone(b, { w: 'pulse12', f: 1100, to: 280, dur: 0.1, v: 0.45, a: 0.001 });
      tone(b, { w: 'pulse25', f: 1650, to: 420, dur: 0.08, v: 0.28, a: 0.001, det: 14 });
      noise(b, { n: 'lfsr', dur: 0.07, v: 0.35, flt: { type: 'bandpass', f: 3000, to: 900, q: 1.2 } });
    },
  },
  shot_gatling: {
    gap: 0.045, max: 4, prio: 0, v: 0.5,
    build: (b) => {
      tone(b, { w: 'square', f: 980, to: 520, dur: 0.036, v: 0.4, a: 0.0008 });
      noise(b, { dur: 0.022, v: 0.3, flt: { type: 'highpass', f: 4500 } });
    },
  },
  shot_laser: {
    gap: 0.07, max: 3, prio: 0, v: 0.68,
    build: (b) => {
      tone(b, { w: 'sawtooth', f: 2400, to: 1300, dur: 0.16, v: 0.32, a: 0.002, vib: [38, 80], flt: { type: 'bandpass', f: 3200, to: 1500, q: 2 } });
      tone(b, { w: 'pulse12', f: 1200, to: 650, dur: 0.14, v: 0.25, a: 0.002 });
      tone(b, { w: 'sine', f: 260, to: 180, dur: 0.12, v: 0.3 });
    },
  },
  shot_missile: {
    gap: 0.08, max: 3, prio: 0, v: 0.7,
    build: (b) => {
      noise(b, { dur: 0.26, v: 0.45, a: 0.02, flt: { type: 'bandpass', f: 700, to: 3200, q: 1.6 } });
      tone(b, { w: 'square', f: 150, to: 85, dur: 0.09, v: 0.3, a: 0.001, flt: { type: 'lowpass', f: 900 } });
      tone(b, { w: 'pulse25', f: 520, to: 1400, dur: 0.12, v: 0.12, a: 0.004 });
    },
  },
  shot_wave: {
    gap: 0.06, max: 3, prio: 0, v: 0.46,
    build: (b) => {
      tone(b, { w: 'sine', f: 620, to: 880, dur: 0.13, v: 0.45, vib: [22, 160] });
      tone(b, { w: 'triangle', f: 930, to: 1320, dur: 0.11, v: 0.3, vib: [22, 160] });
      tone(b, { w: 'pulse12', f: 310, to: 440, dur: 0.06, v: 0.15 });
    },
  },
  shot_heavy: {
    gap: 0.09, max: 3, prio: 0, v: 0.42, crunch: true,
    build: (b) => {
      tone(b, { w: 'sine', f: 170, to: 42, sw: 0.16, dur: 0.22, v: 0.8, a: 0.002 });
      tone(b, { w: 'square', f: 300, to: 70, dur: 0.14, v: 0.3, a: 0.001, flt: { type: 'lowpass', f: 1600, to: 300 } });
      noise(b, { n: 'lfsr', rate: 0.5, dur: 0.12, v: 0.35, flt: { type: 'lowpass', f: 2200, to: 400 } });
    },
  },
  shot_rear: {
    gap: 0.07, max: 3, prio: 0, v: 0.55,
    build: (b) => {
      tone(b, { w: 'pulse25', f: 720, to: 240, dur: 0.065, v: 0.45, a: 0.001, flt: { type: 'lowpass', f: 3200 } });
      noise(b, { dur: 0.015, v: 0.18, flt: { type: 'highpass', f: 3000 } });
    },
  },
  shot_sidekick: {
    gap: 0.065, max: 3, prio: 0, v: 0.47,
    build: (b) => {
      tone(b, { w: 'pulse12', f: 1900, to: 950, dur: 0.045, v: 0.4, a: 0.001 });
      tone(b, { w: 'triangle', f: 950, to: 475, dur: 0.04, v: 0.25 });
    },
  },
  // ------------------------------------------------------------------ enemy weapons
  enemy_shot: {
    gap: 0.06, max: 4, prio: 0, v: 0.32,
    build: (b) => {
      tone(b, { w: 'triangle', f: 540, to: 250, dur: 0.09, v: 0.5, a: 0.002 });
      tone(b, { w: 'pulse25', f: 270, to: 125, dur: 0.07, v: 0.22, a: 0.002, flt: { type: 'lowpass', f: 2000 } });
    },
  },
  enemy_laser: {
    gap: 0.15, max: 2, prio: 1, v: 0.33,
    build: (b) => {
      tone(b, { w: 'sawtooth', f: 110, to: 116, dur: 0.6, v: 0.35, a: 0.05, hold: 0.3, flt: { type: 'lowpass', f: 300, to: 3200, q: 6, sw: 0.45 } });
      tone(b, { w: 'square', f: 220, to: 233, dur: 0.55, v: 0.12, a: 0.08, vib: [14, 40] });
      noise(b, { dur: 0.55, v: 0.12, a: 0.2, flt: { type: 'bandpass', f: 1500, to: 4000, q: 3 } });
    },
  },
  // ------------------------------------------------------------------ impacts
  hit: {
    gap: 0.035, max: 4, prio: 0, v: 0.34,
    build: (b) => {
      fm(b, { f: 2300, ratio: 1.41, i0: 2.5, i1: 0.1, dur: 0.05, v: 0.4 });
      noise(b, { dur: 0.02, v: 0.3, flt: { type: 'highpass', f: 5000 } });
    },
  },
  hit_armor: {
    gap: 0.08, max: 2, prio: 2, v: 0.7, crunch: true,
    build: (b) => {
      noise(b, { n: 'lfsr', rate: 0.7, dur: 0.18, v: 0.55, flt: { type: 'bandpass', f: 1400, to: 500, q: 1.1 } });
      tone(b, { w: 'square', f: 200, to: 55, dur: 0.16, v: 0.4, a: 0.001, flt: { type: 'lowpass', f: 1500 } });
      fm(b, { f: 420, ratio: 2.76, i0: 4, i1: 0.3, dur: 0.25, v: 0.3 });
    },
  },
  shield_hit: {
    gap: 0.07, max: 2, prio: 2, v: 0.62,
    build: (b) => {
      tone(b, { w: 'sine', f: 240, to: 110, dur: 0.3, v: 0.6, a: 0.004 });
      tone(b, { w: 'triangle', f: 480, to: 220, dur: 0.22, v: 0.25, vib: [9, 60] });
      noise(b, { dur: 0.25, v: 0.3, a: 0.003, flt: { type: 'lowpass', f: 2600, to: 280, q: 7 } });
    },
  },
  shield_down: {
    gap: 0.3, max: 1, prio: 3, v: 0.72,
    build: (b) => {
      tone(b, { w: 'sawtooth', f: 640, to: 60, dur: 0.6, v: 0.4, a: 0.002, vib: [18, 90], flt: { type: 'lowpass', f: 3200, to: 220, q: 3 } });
      tone(b, { w: 'pulse25', f: 1280, to: 120, dur: 0.45, v: 0.15, a: 0.002 });
      noise(b, { n: 'lfsr', dur: 0.35, v: 0.2, flt: { type: 'highpass', f: 2500 } });
    },
  },
  // ------------------------------------------------------------------ explosions
  explode_s: {
    gap: 0.04, max: 5, prio: 1, v: 0.66, crunch: true,
    build: (b) => boom(b, 0, 1, 1),
  },
  explode_m: {
    gap: 0.06, max: 4, prio: 1, v: 0.68, crunch: true,
    build: (b) => {
      boom(b, 0, 2, 1);
      tone(b, { w: 'square', f: 95, to: 32, dur: 0.3, v: 0.22, a: 0.001, flt: { type: 'lowpass', f: 700, to: 200 } });
    },
  },
  explode_l: {
    gap: 0.11, max: 3, prio: 2, v: 0.61, crunch: true,
    build: (b) => {
      boom(b, 0, 3.6, 1);
      noise(b, { at: 0.09, dur: 0.3, v: 0.22, flt: { type: 'highpass', f: 2500 } });
      boom(b, 0.16, 1.6, 0.6);
      tone(b, { w: 'square', f: 75, to: 28, dur: 0.55, v: 0.22, a: 0.002, flt: { type: 'lowpass', f: 500, to: 150 } });
    },
  },
  explode_boss: {
    gap: 0.4, max: 2, prio: 3, v: 0.63, crunch: true, vary: 0.02,
    build: (b) => {
      boom(b, 0, 3, 1);
      boom(b, 0.32, 3.5, 0.85);
      boom(b, 0.7, 4.2, 0.8);
      boom(b, 1.15, 5.5, 0.9);
      noise(b, { n: 'brown', dur: 3.0, v: 0.9, a: 0.04, flt: { type: 'lowpass', f: 520, to: 60 } });
      tone(b, { w: 'sine', f: 58, to: 20, dur: 2.6, v: 0.55, a: 0.02 });
    },
  },
  // ------------------------------------------------------------------ pickups
  pickup_credit: {
    gap: 0.035, max: 3, prio: 1, v: 0.44, vary: 0,
    build: (b) => {
      seq(b, { w: 'pulse12', notes: [m(88), m(95)], step: 0.034, v: 0.42, nd: 0.03, last: 0.12 });
      tone(b, { w: 'sine', at: 0.034, f: m(107), dur: 0.08, v: 0.1 });
    },
  },
  pickup_power: {
    gap: 0.15, max: 1, prio: 2, v: 0.6, vary: 0,
    build: (b) => {
      seq(b, { w: 'square', notes: [m(72), m(79), m(84), m(88), m(91), m(96)], step: 0.045, v: 0.32, nd: 0.04, last: 0.22, vib: [12, 30] });
      tone(b, { w: 'sine', f: 400, to: 1600, dur: 0.3, v: 0.22, a: 0.02 });
    },
  },
  pickup_repair: {
    gap: 0.15, max: 1, prio: 2, v: 0.62, vary: 0,
    build: (b) => {
      tone(b, { w: 'triangle', f: 330, to: 1320, dur: 0.38, v: 0.45, a: 0.01, vib: [11, 50] });
      seq(b, { w: 'pulse25', notes: [m(72), m(76), m(79), m(84)], step: 0.06, at: 0.16, v: 0.25, nd: 0.05, last: 0.2 });
    },
  },
  pickup_intel: {
    gap: 0.3, max: 1, prio: 2, v: 0.55, vary: 0,
    build: (b) => {
      seq(b, { w: 'pulse12', notes: [m(91), m(96), m(88), m(100), m(93), m(98), m(95), m(103)], step: 0.032, v: 0.3, nd: 0.026, last: 0.03 });
      seq(b, { w: 'pulse25', notes: [m(84), m(91)], step: 0.09, at: 0.3, v: 0.35, nd: 0.08, last: 0.25 });
    },
  },
  // ------------------------------------------------------------------ UI
  ui_move: {
    gap: 0.03, max: 2, prio: 2, v: 0.47, vary: 0.01,
    build: (b) => tone(b, { w: 'pulse25', f: 1320, dur: 0.035, v: 0.4, a: 0.001 }),
  },
  ui_select: {
    gap: 0.06, max: 2, prio: 2, v: 0.43, vary: 0.01,
    build: (b) => seq(b, { w: 'pulse25', notes: [880, 1320], step: 0.045, v: 0.4, nd: 0.04, last: 0.08 }),
  },
  ui_back: {
    gap: 0.06, max: 2, prio: 2, v: 0.43, vary: 0.01,
    build: (b) => seq(b, { w: 'pulse25', notes: [1175, 784], step: 0.045, v: 0.4, nd: 0.04, last: 0.08 }),
  },
  ui_buy: {
    gap: 0.1, max: 2, prio: 2, v: 0.47, vary: 0,
    build: (b) => {
      seq(b, { w: 'pulse12', notes: [m(84), m(88), m(91), m(96)], step: 0.04, v: 0.3, nd: 0.035, last: 0.06 });
      fm(b, { f: m(96), ratio: 3.5, i0: 1.5, i1: 0.05, at: 0.15, dur: 0.45, v: 0.32 });
      fm(b, { f: m(100), ratio: 3.5, i0: 1.2, i1: 0.05, at: 0.17, dur: 0.4, v: 0.18 });
    },
  },
  ui_sell: {
    gap: 0.1, max: 2, prio: 2, v: 0.53, vary: 0,
    build: (b) => {
      seq(b, { w: 'pulse12', notes: [m(91), m(88), m(84)], step: 0.05, v: 0.3, nd: 0.045, last: 0.08 });
      fm(b, { f: m(88), ratio: 3.5, i0: 1.2, i1: 0.05, at: 0.12, dur: 0.35, v: 0.28 });
    },
  },
  ui_error: {
    gap: 0.12, max: 1, prio: 2, v: 0.42, vary: 0,
    build: (b) => {
      seq(b, { w: 'square', notes: [139, 139], step: 0.11, v: 0.35, nd: 0.08, last: 0.09, flt: { type: 'lowpass', f: 1400 } });
      seq(b, { w: 'square', notes: [147, 147], step: 0.11, v: 0.25, nd: 0.08, last: 0.09, flt: { type: 'lowpass', f: 1400 } });
    },
  },
  // ------------------------------------------------------------------ events & jingles
  boss_alarm: {
    gap: 1.0, max: 1, prio: 3, v: 0.45, vary: 0,
    build: (b) => {
      for (let i = 0; i < 4; i++) {
        tone(b, { w: 'square', at: i * 0.36, f: 520, to: 1040, sw: 0.3, dur: 0.34, v: 0.3, a: 0.01, hold: 0.24, flt: { type: 'lowpass', f: 2800 } });
      }
      tone(b, { w: 'sawtooth', f: 92, dur: 1.5, v: 0.3, a: 0.02, hold: 1.2, vib: [6, 60], flt: { type: 'lowpass', f: 600 } });
    },
  },
  warning: {
    gap: 0.6, max: 1, prio: 3, v: 0.53, vary: 0,
    build: (b) => {
      seq(b, { w: 'square', notes: [1046, 1046, 1046], step: 0.16, v: 0.35, nd: 0.1, last: 0.1, flt: { type: 'lowpass', f: 4000 } });
      seq(b, { w: 'pulse25', notes: [523, 523, 523], step: 0.16, v: 0.2, nd: 0.1, last: 0.1 });
    },
  },
  level_clear: {
    gap: 2, max: 1, prio: 3, v: 0.4, vary: 0,
    build: (b) => {
      const lead: [number, number][] = [[67, 0.08], [72, 0.08], [76, 0.08], [79, 0.24], [77, 0.08], [81, 0.08], [84, 0.24], [86, 0.1], [88, 0.8]];
      mel(b, { w: 'pulse25', notes: lead.map(([n, d]) => [m(n), d] as [number, number]), v: 0.4, gate: 0.95, vib: [6, 14] });
      mel(b, { w: 'triangle', notes: [[m(64), 0.48], [m(69), 0.4], [m(71), 0.1], [m(72), 0.8]], v: 0.45, gate: 0.97 });
      mel(b, { w: 'tri4', notes: [[m(48), 0.48], [m(53), 0.4], [m(55), 0.1], [m(48), 0.8]], v: 0.55, gate: 0.97 });
      seq(b, { w: 'pulse12', at: 1.0, notes: [m(96), m(100), m(103), m(108)], step: 0.05, v: 0.16, nd: 0.045, last: 0.2 });
    },
  },
  game_over: {
    gap: 2, max: 1, prio: 3, v: 0.38, vary: 0,
    build: (b) => {
      mel(b, { w: 'square', notes: [[m(76), 0.28], [m(74), 0.28], [m(72), 0.28], [m(71), 0.56], [m(69), 1.3]], v: 0.32, gate: 0.96, vib: [5, 22], flt: { type: 'lowpass', f: 1800, to: 700 } });
      mel(b, { w: 'pulse12', notes: [[m(60), 0.56], [m(57), 0.28], [m(56), 0.56], [m(57), 1.3]], v: 0.2, gate: 0.97 });
      mel(b, { w: 'tri4', notes: [[m(45), 0.56], [m(41), 0.28], [m(40), 0.56], [m(45), 1.3]], v: 0.55, gate: 0.97 });
    },
  },
  rear_toggle: {
    gap: 0.1, max: 1, prio: 2, v: 0.45, vary: 0.02,
    build: (b) => {
      noise(b, { dur: 0.012, v: 0.4, flt: { type: 'bandpass', f: 3200, q: 2 } });
      tone(b, { w: 'pulse25', f: 440, to: 880, dur: 0.05, v: 0.35, a: 0.001 });
      noise(b, { at: 0.07, dur: 0.012, v: 0.35, flt: { type: 'bandpass', f: 2400, q: 2 } });
      tone(b, { w: 'pulse25', at: 0.07, f: 880, dur: 0.05, v: 0.3, a: 0.001 });
    },
  },
};

/** Major-scale ladder used when credits are collected in quick succession. */
const CREDIT_LADDER = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];

export interface SfxPlayOptions {
  volume?: number;
  pitch?: number;
  pan?: number;
}

export interface SfxStats {
  started: number;
  rateLimited: number;
  stolen: number;
  dropped: number;
  peak: number;
  active: number;
  disposed: number;
}

/** Plays SFX on one Graph: rate limits, voice pool, pitch variation, stereo pan. */
export class SfxEngine {
  readonly pool: VoicePool;
  private last = new Map<SfxKey, number>();
  private rateLimited = 0;
  private combo = 0;
  private lastCredit = -1;

  constructor(private g: Graph, cap = 24, private rnd: () => number = Math.random) {
    this.pool = new VoicePool(cap);
  }

  /** Plays `key` at context time `when` (default: now). Returns true if a voice was started. */
  play(key: SfxKey, opts: SfxPlayOptions | undefined, when?: number): boolean {
    const def = SFX_DEFS[key];
    if (!def) return false;
    const ctx = this.g.ctx;
    const now = when ?? ctx.currentTime;
    const prev = this.last.get(key);
    if (prev !== undefined && now - prev < def.gap && now >= prev) {
      this.rateLimited++;
      return false;
    }
    const vol = clampNum(opts?.volume, 0, 2, 1);
    if (vol <= 0.001) return false;
    if (!this.pool.reserve(key, def.prio, def.max, now)) return false;
    this.last.set(key, now);

    let p = clampNum(opts?.pitch, 0.25, 4, 1);
    const vary = def.vary ?? 0.04;
    if (vary > 0) p *= 1 + (this.rnd() * 2 - 1) * vary;
    if (key === 'pickup_credit') {
      this.combo = this.lastCredit >= 0 && now - this.lastCredit < 0.45 ? Math.min(this.combo + 1, CREDIT_LADDER.length - 1) : 0;
      this.lastCredit = now;
      p *= Math.pow(2, CREDIT_LADDER[this.combo] / 12);
    }
    // Same-key pile-ups get quieter so 20 shots/s or a chain of explosions never clip.
    const same = this.pool.countKey(key, now);
    const level = ctx.createGain();
    level.gain.value = def.v * vol / Math.sqrt(1 + 0.45 * same);
    let pan: StereoPannerNode | null = null;
    const panV = clampNum(opts?.pan, -1, 1, 0);
    const dest = def.crunch ? this.g.crunchBus : this.g.sfxBus;
    if (this.g.canPan && Math.abs(panV) > 0.01) {
      pan = ctx.createStereoPanner();
      pan.pan.value = panV;
      level.connect(pan);
      pan.connect(dest);
    } else {
      level.connect(dest);
    }
    const b: Build = { g: this.g, ctx, t: now, p, out: level, end: now, srcs: [], nodes: [], last: null, rnd: this.rnd };
    def.build(b);
    this.pool.add(key, def.prio, b, level, pan);
    return true;
  }

  stats(now: number): SfxStats {
    const s = this.pool.stats;
    return {
      started: s.started,
      rateLimited: this.rateLimited,
      stolen: s.stolen,
      dropped: s.dropped,
      peak: s.peak,
      active: this.pool.active(now),
      disposed: s.disposed,
    };
  }
}

function clampNum(v: number | undefined, lo: number, hi: number, dflt: number): number {
  if (v === undefined || !Number.isFinite(v)) return dflt;
  return Math.min(hi, Math.max(lo, v));
}
