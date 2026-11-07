// =====================================================================================
//  COMPOSITIONS — one original looping chiptune per MusicTrack (format: see compile.ts).
//  Steps are 16th notes unless a song sets beat/bar (ocean uses a 12/8 triplet grid).
// =====================================================================================
import type { MusicTrack } from '../types';
import type { DrumPattern, SongDef } from './compile';

const ROCK: DrumPattern = {
  k: 'x.......x.x.....',
  s: '....x.......x...',
  h: 'x.x.x.x.x.x.x.x.',
  fill: { k: 'x.......x.x.....', s: '....x.......xxXX', h: 'x.x.x.x.x.x.x.x.' },
};

export const SONGS: Record<MusicTrack, SongDef> = {
  // ------------------------------------------------------------------ TITLE — heroic, D major
  title: {
    name: 'Corsair Rising',
    bpm: 132,
    inst: {
      lead: { w: 'pulse25', v: 0.15, a: 0.004, d: 0.18, s: 0.65, r: 0.08, gate: 0.92, vib: [5.5, 16, 0.16], det: 7, echo: 0.18 },
      bass: { w: 'sawtooth', v: 0.13, a: 0.002, d: 0.12, s: 0.55, r: 0.04, gate: 0.8, lp: 700, q: 2, fenv: 900, fdec: 0.12 },
      arp: { w: 'pulse12', v: 0.05, a: 0.001, d: 0.07, s: 0.25, r: 0.03, gate: 0.6, echo: 0.35 },
    },
    kit: { v: 0.5 },
    echo: { beats: 0.75, fb: 0.32, wet: 0.3 },
    def: { bass: '0.0.0.o.0.0.2.o.', arp: '0212', drums: ROCK },
    patterns: {
      A: {
        chords: 'D Bm G A',
        lead: 'A4:2 D5:2 F#5:4 E5:2 D5:2 E5:2 F#5:2 | D5:4 B4:4 -:2 B4:2 C#5:2 D5:2 | E5:2 D5:2 B4:2 G4:2 B4:2 D5:2 G5:4 | F#5:4 E5:4 C#5:2 A4:2 E5:4',
        drums: { ...ROCK, crash: true },
      },
      A2: {
        chords: 'D Bm G A:8 D:8',
        lead: 'A4:2 D5:2 F#5:4 E5:2 D5:2 E5:2 F#5:2 | D5:4 B4:4 -:2 B4:2 C#5:2 D5:2 | E5:2 F#5:2 G5:4 B5:4 A5:2 G5:2 | F#5:4 E5:4 D5:8',
      },
      B: {
        chords: 'G A F#m Bm',
        lead: 'B5:6 A5:2 G5:4 F#5:2 G5:2 | A5:6 G5:2 F#5:4 E5:4 | F#5:4 C#5:4 E5:2 F#5:2 A5:4 | B5:8 A5:4 F#5:4',
        arp: '0121',
        drums: { ...ROCK, crash: true },
      },
      B2: {
        chords: 'Em7 A D G:8 A:8',
        lead: 'G5:4 F#5:2 E5:2 B4:4 E5:4 | C#5:2 E5:2 A5:4 G5:2 F#5:2 E5:4 | F#5:4 D5:4 A4:4 D5:4 | B4:4 D5:4 C#5:4 E5:4',
        arp: '0121',
      },
      C: {
        chords: 'Bb C D D',
        lead: 'F5:4 D5:4 Bb4:4 D5:4 | E5:4 C5:4 G5:8 | F#5:4 A5:4 D6:8 | D6:8 -:4 A5:2 F#5:2',
        bass: '0..0..0.0..0..0.',
        arp: '0242',
        drums: {
          k: 'x...x...x...x...',
          s: '....x.......x.gg',
          h: 'x.x.x.x.x.x.x.x.',
          fill: { k: 'x...x...x...x...', s: '....x...l.m.hhXX', h: 'x.x.x.x.x.x.x.x.' },
          crash: true,
        },
      },
    },
    order: ['A', 'A2', 'B', 'B2', 'C', 'A2'],
  },

  // ------------------------------------------------------------------ MAP — spacey, calm, E lydian
  map: {
    name: 'Starchart',
    bpm: 92,
    inst: {
      lead: { w: 'triangle', v: 0.2, a: 0.05, d: 0.4, s: 0.7, r: 0.3, gate: 0.95, vib: [4.5, 14, 0.3], det: 5, echo: 0.4 },
      bass: { w: 'tri4', v: 0.22, a: 0.01, d: 0.4, s: 0.8, r: 0.2, gate: 0.95 },
      arp: { w: 'pulse12', v: 0.045, a: 0.002, d: 0.12, s: 0.2, r: 0.1, gate: 0.6, echo: 0.55 },
    },
    kit: { v: 0.3, hat: [8000, 0.03] },
    echo: { beats: 0.75, fb: 0.45, wet: 0.4, tone: 2500 },
    def: {
      bass: '0.......2.......',
      arp: '0.1.2.3.4.3.2.1.',
      drums: { k: 'x.........x.....', s: '................', h: '..x...x...x...xx' },
    },
    patterns: {
      A: {
        chords: 'Emaj7 F#6 Emaj7 F#6',
        lead: 'B4:6 D#5:2 F#5:8 | A#5:6 G#5:2 F#5:4 C#5:4 | E5:4 F#5:4 G#5:4 B5:4 | A#5:8 C#6:4 A#5:4',
      },
      B: {
        chords: 'C#m7 Amaj7 Bsus4 B',
        lead: 'G#5:6 E5:2 C#5:8 | C#5:4 E5:4 G#5:8 | F#5:6 E5:2 B4:8 | D#5:12 -:4',
        drums: { k: 'x.........x.....', s: '....g.......g...', h: '..x...x...x...xx' },
      },
      B2: {
        chords: 'C#m7 Amaj7 Bsus4 B',
        lead: 'G#5:6 B5:2 C#6:8 | B5:4 G#5:4 E5:8 | F#5:6 E5:2 B4:8 | D#5:4 F#5:4 A#5:8',
        drums: { k: 'x.........x.....', s: '....g.......g...', h: '..x...x...x...xx' },
      },
    },
    order: ['A', 'B', 'A', 'B2'],
  },

  // ------------------------------------------------------------------ HANGAR — cool groove, A dorian
  hangar: {
    name: 'Dry Dock Groove',
    bpm: 104,
    swing: 0.14,
    inst: {
      lead: { w: 'pulse25', v: 0.14, a: 0.003, d: 0.15, s: 0.55, r: 0.06, gate: 0.85, vib: [5, 14, 0.2], slide: 0.03, echo: 0.15 },
      bass: { w: 'square', v: 0.12, a: 0.002, d: 0.1, s: 0.5, r: 0.04, gate: 0.7, lp: 600, q: 4, fenv: 1400, fdec: 0.1 },
      arp: { w: 'pulse12', v: 0.06, a: 0.001, d: 0.05, s: 0.1, r: 0.03, gate: 0.4, echo: 0.1 },
    },
    kit: { v: 0.48, hat: [7500, 0.025] },
    echo: { beats: 0.5, fb: 0.25, wet: 0.22 },
    def: {
      bass: '0.-0o-2-0.-0o-3a',
      arp: '--2-1-2---2-1-0-',
      drums: { k: 'x..x....x.x.....', s: '....x..g.g..x..g', h: 'XxxxXxxxXxxxXxxo' },
    },
    patterns: {
      A: {
        chords: 'Am7 D7 Am7 D7',
        lead: '-:2 E5:1 G5:1 A5:2 G5:2 E5:2 D5:2 C5:2 A4:2 | -:4 F#5:2 A5:2 C6:3 A5:1 F#5:4 | E5:3 G5:1 A5:2 C6:2 B5:2 A5:2 G5:2 E5:2 | F#5:2 E5:2 D5:4 -:4 A4:2 C5:2',
      },
      B: {
        chords: 'Fmaj7 Em7 Dm7 G7',
        lead: 'A5:4 G5:2 E5:2 F5:4 C5:4 | G5:4 F#5:2 D5:2 E5:4 B4:4 | F5:2 E5:2 D5:2 C5:2 A4:4 D5:4 | B4:4 D5:4 F5:4 G5:4',
        drums: { k: 'x..x....x.x..x..', s: '....x..g.g..x..g', h: 'XxxxXxxxXxxxXxxo' },
      },
      B2: {
        chords: 'Fmaj7 Em7 Dm7 E7',
        lead: 'C6:4 A5:2 G5:2 E5:4 F5:4 | B5:4 G5:2 E5:2 D5:4 B4:4 | A5:2 F5:2 D5:2 C5:2 A4:2 C5:2 D5:4 | G#5:4 E5:4 D5:4 B4:4',
        drums: {
          k: 'x..x....x.x..x..',
          s: '....x..g.g..x..g',
          h: 'XxxxXxxxXxxxXxxo',
          fill: { k: 'x..x....x.x.....', s: '....x..g.g..mmhh', h: 'XxxxXxxxXxxxXxxo' },
        },
      },
    },
    order: ['A', 'B', 'A', 'B2'],
  },

  // ------------------------------------------------------------------ BOSS — intense, D harmonic minor
  boss: {
    name: 'Dread Engine',
    bpm: 168,
    bassBase: 36,
    inst: {
      lead: { w: 'square', v: 0.12, a: 0.002, d: 0.1, s: 0.7, r: 0.04, gate: 0.88, vib: [7, 22, 0.12], det: 10, echo: 0.12 },
      bass: { w: 'sawtooth', v: 0.13, a: 0.001, d: 0.06, s: 0.5, r: 0.03, gate: 0.7, lp: 900, q: 3, fenv: 1600, fdec: 0.06 },
      arp: { w: 'pulse12', v: 0.05, a: 0.001, d: 0.04, s: 0.3, r: 0.02, gate: 0.6, echo: 0.15 },
    },
    kit: { v: 0.55, kick: [170, 42, 0.12], metal: true },
    echo: { beats: 0.5, fb: 0.25, wet: 0.2 },
    def: {
      bass: '0o0o0o0o0o0o0o0o',
      arp: '0240',
      drums: {
        k: 'x.x.x.x.x.x.x.x.',
        s: '....x.......x...',
        h: 'XxxxXxxxXxxxXxxx',
        fill: { k: 'x.x.x.x.x.x.x.x.', s: '....x...x.xxXXXX', h: 'XxxxXxxxXxxxXxxx' },
      },
    },
    patterns: {
      A: {
        chords: 'Dm Dm Bb A',
        lead: 'D5:2 F5:2 A5:2 D6:2 C#6:2 A5:2 F5:2 E5:2 | D5:2 F5:2 A5:2 F5:2 G5:2 A5:2 Bb5:2 A5:2 | Bb5:4 A5:2 G5:2 F5:4 D5:4 | E5:2 F5:2 G5:2 A5:2 C#6:4 A5:4',
        drums: {
          k: 'x.x.x.x.x.x.x.x.',
          s: '....x.......x...',
          h: 'XxxxXxxxXxxxXxxx',
          fill: { k: 'x.x.x.x.x.x.x.x.', s: '....x...x.xxXXXX', h: 'XxxxXxxxXxxxXxxx' },
          crash: true,
        },
      },
      B: {
        chords: 'Gm A Dm Bb:8 A:8',
        lead: 'G5:4 Bb5:4 D6:4 C6:2 Bb5:2 | A5:4 C#6:4 E6:4 D6:2 C#6:2 | D6:6 A5:2 F5:4 D5:4 | Bb5:4 D6:4 C#6:4 E6:4',
      },
      C: {
        chords: 'Dm:8 Eb:8 Dm:8 C:8 Bb:8 C:8 A',
        lead: 'D5:1 D5:1 -:2 F5:2 D5:2 Eb5:2 G5:2 Eb5:2 Bb4:2 | D5:1 D5:1 -:2 F5:2 A5:2 G5:2 E5:2 C5:2 G5:2 | F5:2 D5:2 Bb4:2 D5:2 E5:2 G5:2 C6:4 | C#6:4 A5:4 E5:4 C#5:4',
        bass: '0000000000000000',
        arp: '0120',
        drums: {
          k: 'x..xx..xx..xx..x',
          s: '....x.......x...',
          h: 'x.x.x.x.x.x.x.x.',
          fill: { k: 'x.x.x.x.x.x.x.x.', s: 'x.x.x.x.xxxxXXXX', h: 'c...............' },
          crash: true,
        },
      },
    },
    order: ['A', 'B', 'A', 'C'],
  },

  // ------------------------------------------------------------------ VICTORY — fanfare then calm, C major
  victory: {
    name: 'Homeward Light',
    bpm: 116,
    inst: {
      lead: { w: 'pulse25', v: 0.15, a: 0.01, d: 0.3, s: 0.7, r: 0.2, gate: 0.95, vib: [5, 14, 0.2], echo: 0.25 },
      bass: { w: 'tri4', v: 0.24, a: 0.005, d: 0.3, s: 0.8, r: 0.1, gate: 0.9 },
      arp: { w: 'pulse12', v: 0.045, a: 0.002, d: 0.1, s: 0.2, r: 0.06, gate: 0.6, echo: 0.4 },
    },
    kit: { v: 0.4 },
    echo: { beats: 0.75, fb: 0.35, wet: 0.3 },
    def: {
      bass: '0.......2...1...',
      arp: '0.2.1.3.2.1.0.2.',
      drums: { k: 'x.......x.......', s: '....g.......g...', h: 'x.x.x.x.x.x.x.x.' },
    },
    patterns: {
      F: {
        chords: 'C F:8 G:8 C',
        lead: 'C5:1 E5:1 G5:1 C6:1 -:2 G5:2 C6:8 | A5:2 C6:2 F6:4 D6:2 B5:2 G5:4 | C6:12 -:4',
        bass: '0...0...0.0.0.0.',
        arp: '0123',
        drums: {
          k: 'x...x...x...x...',
          s: '....x.......x.xx',
          h: 'x.x.x.x.x.x.x.x.',
          fill: { k: 'x...............', s: '................', h: 'c...............' },
          crash: true,
        },
      },
      A: {
        chords: 'Cmaj7 Am7 Dm7 G',
        lead: 'E5:4 G5:4 B5:6 A5:2 | C6:6 B5:2 A5:4 E5:4 | F5:4 A5:4 C6:4 D6:4 | C6:8 B5:4 G5:4',
      },
      B: {
        chords: 'Fmaj7 Em7 Dm7 G',
        lead: 'A5:6 G5:2 E5:4 C5:4 | G5:6 E5:2 D5:4 B4:4 | A5:4 F5:4 D5:4 C5:4 | B4:4 D5:4 G5:8',
      },
    },
    intro: ['F'],
    order: ['A', 'B'],
  },

  // ------------------------------------------------------------------ DESERT — E phrygian dominant, driving
  desert: {
    name: 'Dune Raiders',
    bpm: 140,
    inst: {
      lead: { w: 'pulse25', v: 0.14, a: 0.003, d: 0.15, s: 0.6, r: 0.05, gate: 0.9, vib: [6, 30, 0.14], slide: 0.025, echo: 0.15 },
      bass: { w: 'tri4', v: 0.26, a: 0.002, d: 0.1, s: 0.7, r: 0.03, gate: 0.75 },
      arp: { w: 'pulse12', v: 0.05, a: 0.001, d: 0.05, s: 0.25, r: 0.02, gate: 0.55, echo: 0.2 },
    },
    kit: { v: 0.5, snare: [200, 2000, 0.12] },
    echo: { beats: 0.75, fb: 0.3, wet: 0.25 },
    def: {
      bass: '0.o00.o00.o00.o.',
      arp: '0.1.2.1.',
      drums: {
        k: 'x..x..x...x..x..',
        s: '....x..l....x.ml',
        h: 'x.xxx.xxx.xxx.xx',
        fill: { k: 'x..x..x.x.x.x.x.', s: '....x..lm.m.hhhh', h: 'x.xxx.xxx.xxx.xx' },
      },
    },
    patterns: {
      A: {
        chords: 'E E F E',
        lead: 'E5:2 F5:2 G#5:2 A5:2 B5:4 A5:2 G#5:2 | F5:2 G#5:2 F5:2 E5:2 F5:4 E5:4 | A5:2 G#5:2 A5:2 C6:2 B5:4 A5:2 G#5:2 | G#5:4 F5:2 E5:2 E5:8',
        drums: {
          k: 'x..x..x...x..x..',
          s: '....x..l....x.ml',
          h: 'x.xxx.xxx.xxx.xx',
          fill: { k: 'x..x..x.x.x.x.x.', s: '....x..lm.m.hhhh', h: 'x.xxx.xxx.xxx.xx' },
          crash: true,
        },
      },
      B: {
        chords: 'Am G F E',
        lead: 'C6:4 B5:2 A5:2 E5:4 A5:4 | B5:4 A5:2 G5:2 D5:4 G5:4 | A5:2 G#5:2 F5:2 E5:2 D5:2 C5:2 B4:2 C5:2 | G#5:4 E5:4 -:4 B4:2 D5:2',
        arp: '0121',
      },
      C: {
        chords: 'E:8 F:8 G:8 F:8 E:8 F:8 G:8 F:8',
        lead: 'E5:1 E5:1 -:2 G#5:2 E5:2 F5:2 A5:2 F5:2 -:2 | G5:2 B5:2 D6:2 B5:2 C6:2 A5:2 G#5:2 F5:2 | E5:1 E5:1 -:2 G#5:2 B5:2 C6:2 A5:2 F5:2 -:2 | G5:2 B5:2 D6:2 F6:2 E6:4 C6:4',
        bass: '0..0..0.0..0..0.',
        drums: {
          k: 'x..x..x.x..x..x.',
          s: '..l.x.m.l.h.x.mm',
          h: 'x.x.x.x.x.x.x.x.',
          fill: { k: 'x..x..x.x.x.x.x.', s: 'l.l.m.m.h.h.XXXX', h: 'x.x.x.x.x.x.x.x.' },
        },
      },
    },
    order: ['A', 'B', 'A', 'C'],
  },

  // ------------------------------------------------------------------ JUNGLE — G minor, percussive
  jungle: {
    name: 'Canopy Drums',
    bpm: 132,
    inst: {
      lead: { w: 'soft', v: 0.2, a: 0.002, d: 0.12, s: 0.3, r: 0.08, gate: 0.6, echo: 0.25 },
      bass: { w: 'tri4', v: 0.26, a: 0.002, d: 0.08, s: 0.6, r: 0.03, gate: 0.6 },
      arp: { w: 'pulse25', v: 0.05, a: 0.001, d: 0.05, s: 0.1, r: 0.03, gate: 0.4, echo: 0.3 },
    },
    kit: { v: 0.55, snare: [210, 2200, 0.1] },
    echo: { beats: 0.75, fb: 0.3, wet: 0.25 },
    def: {
      bass: '0..0..0...0.2.o.',
      arp: '-0-2-1-3-0-2-4-2',
      drums: {
        k: 'x..x...xx..x....',
        s: '..m.x..lh.m.x.ll',
        h: 'x.xx.xx.x.xx.xx.',
        fill: { k: 'x..x...xx..x.x.x', s: '..m.x..lh.m.hmml', h: 'x.xx.xx.x.xx.xx.' },
      },
    },
    patterns: {
      A: {
        chords: 'Gm7 Gm7 Eb F',
        lead: 'G5:2 Bb5:1 G5:1 F5:2 D5:2 F5:2 G5:2 Bb5:2 C6:2 | D6:3 C6:1 Bb5:2 G5:2 F5:3 G5:1 D5:4 | Eb5:2 G5:2 Bb5:2 G5:2 C6:2 Bb5:2 G5:2 Eb5:2 | F5:2 A5:2 C6:2 A5:2 D6:4 C6:4',
      },
      B: {
        chords: 'Cm7 Dm7 Ebmaj7 F',
        lead: 'C6:2 Bb5:2 G5:2 Eb5:2 G5:4 Bb5:4 | D6:2 C6:2 A5:2 F5:2 A5:4 C6:4 | Bb5:2 G5:2 Eb5:2 D5:2 G5:2 Bb5:2 D6:4 | C6:2 A5:2 F5:2 A5:2 C6:2 D6:2 F6:4',
      },
      C: {
        chords: 'Gm7 Gm7',
        arp: '0-2-1-3-4-3-2-1-',
        drums: {
          k: 'x..x...xx..x..x.',
          s: 'l.m.h.m.l.m.x.hh',
          h: 'x.xx.xx.x.xx.xx.',
          fill: { k: 'x..x...xx.x.x.x.', s: 'l.l.m.m.h.h.XXXX', h: 'x.xx.xx.x.xx.xx.' },
        },
      },
    },
    order: ['A', 'B', 'A', 'C'],
  },

  // ------------------------------------------------------------------ OCEAN — B minor, flowing 12/8
  ocean: {
    name: 'Tidewater',
    bpm: 124,
    beat: 3,
    bar: 12,
    inst: {
      lead: { w: 'soft', v: 0.17, a: 0.02, d: 0.3, s: 0.75, r: 0.15, gate: 1, vib: [5, 16, 0.18], slide: 0.04, echo: 0.3 },
      bass: { w: 'tri4', v: 0.26, a: 0.004, d: 0.2, s: 0.8, r: 0.08, gate: 0.9 },
      arp: { w: 'pulse12', v: 0.05, a: 0.002, d: 0.1, s: 0.3, r: 0.06, gate: 0.7, echo: 0.4 },
    },
    kit: { v: 0.42 },
    echo: { beats: 1, fb: 0.38, wet: 0.32, tone: 2600 },
    def: {
      bass: '0..2..o..2..',
      arp: '012321012321',
      drums: {
        k: 'x.....x.....',
        s: '......x.....',
        h: 'X.xX.xX.xX.x',
        fill: { k: 'x.....x.....', s: '......x..xxx', h: 'X.xX.xX.xX.x' },
      },
    },
    patterns: {
      A: {
        chords: 'Bm G D A',
        lead: 'F#5:3 B5:3 A5:2 F#5:1 D5:3 | G5:3 B5:3 D6:4 B5:2 | A5:3 F#5:3 D5:3 F#5:3 | E5:6 C#5:3 A4:3',
      },
      A2: {
        chords: 'Bm G D A',
        lead: 'F#5:3 B5:3 C#6:3 D6:3 | B5:3 G5:3 D5:3 G5:3 | F#5:6 A5:3 D6:3 | C#6:6 E6:3 C#6:3',
      },
      B: {
        chords: 'Em F#m G A',
        lead: 'G5:3 E5:3 B5:4 A5:2 | A5:3 F#5:3 C#6:4 B5:2 | B5:3 D6:3 G6:4 F#6:2 | E6:6 C#6:3 A5:3',
        arp: '024542024542',
      },
    },
    order: ['A', 'A2', 'B', 'A2'],
  },

  // ------------------------------------------------------------------ CAVERN — C minor, dark, echoing
  cavern: {
    name: 'Hollow Echoes',
    bpm: 122,
    bassBase: 36,
    inst: {
      lead: { w: 'pulse12', v: 0.15, a: 0.01, d: 0.3, s: 0.6, r: 0.25, gate: 0.9, vib: [4.5, 18, 0.25], lp: 1800, q: 1, echo: 0.45 },
      bass: { w: 'tri4', v: 0.3, a: 0.004, d: 0.3, s: 0.8, r: 0.15, gate: 0.95 },
      arp: { w: 'sine', v: 0.09, a: 0.001, d: 0.15, s: 0, r: 0.1, gate: 0.5, echo: 0.6 },
    },
    kit: { v: 0.42, echo: 0.3, kick: [130, 38, 0.2] },
    echo: { beats: 0.75, fb: 0.5, wet: 0.45, tone: 1800 },
    def: {
      bass: '0.......0...2...',
      arp: '4...7...5...3...',
      drums: { k: 'x.........x.....', s: '........x.......', h: '....x.......x...' },
    },
    patterns: {
      A: {
        chords: 'Cm Ab Fm G',
        lead: 'C5:6 Eb5:2 G5:8 | Ab5:6 G5:2 Eb5:8 | F5:4 Ab5:4 C6:4 Bb5:2 Ab5:2 | G5:8 B4:4 D5:4',
      },
      B: {
        chords: 'Cm Db Cm Bdim',
        lead: 'G5:4 Eb5:4 C5:4 D5:2 Eb5:2 | F5:4 Ab5:4 Db6:8 | C6:6 Bb5:2 G5:4 Eb5:4 | D5:4 F5:4 Ab5:4 B4:4',
        drums: {
          k: 'x.........x.....',
          s: '........x.......',
          h: '..x...x...x...x.',
          fill: { k: 'x.........x.....', s: '........x...l.ll', h: '..x...x...x...x.' },
        },
      },
      C: {
        chords: 'Cm Ab',
        arp: '4.6.7.5.6.4.3.5.',
        drums: { k: 'x...............', s: '................', h: '........x.......' },
      },
    },
    order: ['A', 'B', 'C', 'A', 'B'],
  },

  // ------------------------------------------------------------------ SPACE — ethereal arps, F lydian
  space: {
    name: 'Nebula Drift',
    bpm: 126,
    inst: {
      lead: { w: 'triangle', v: 0.2, a: 0.06, d: 0.4, s: 0.8, r: 0.3, gate: 0.95, vib: [4.5, 20, 0.2], det: 6, echo: 0.4 },
      bass: { w: 'tri4', v: 0.24, a: 0.01, d: 0.3, s: 0.85, r: 0.2, gate: 0.95 },
      arp: { w: 'pulse12', v: 0.05, a: 0.001, d: 0.08, s: 0.2, r: 0.05, gate: 0.6, echo: 0.55 },
    },
    kit: { v: 0.38, hat: [9000, 0.02] },
    echo: { beats: 0.75, fb: 0.48, wet: 0.42, tone: 3200 },
    def: {
      bass: '0.......0.....2.',
      arp: '0123456776543210',
      drums: { k: 'x.......x.......', s: '....c.......c...', h: '..x...x...x...x.' },
    },
    patterns: {
      A: {
        chords: 'Fmaj7 G Em7 Am7',
        lead: 'A5:8 G5:4 E5:4 | D5:8 B4:4 G5:4 | E5:6 G5:2 B5:8 | C6:8 A5:4 E5:4',
      },
      B: {
        chords: 'Dm9 Em7 Fmaj7 Gsus4:8 G:8',
        lead: 'F5:4 A5:4 E6:8 | D6:4 B5:4 G5:8 | C6:4 A5:4 E5:4 F5:4 | G5:8 B5:8',
        drums: { k: 'x.......x..x....', s: '....c.......c...', h: 'x.x.x.x.x.x.x.x.' },
      },
      C: {
        chords: 'Fmaj7 G Em7 Am7',
        lead: 'C6:16 | B5:16 | G5:16 | E5:8 A5:8',
        arp: '0246135724681357',
        drums: { k: 'x...............', s: '............c...', h: '..x...x...x...x.' },
      },
    },
    order: ['A', 'B', 'A', 'C'],
  },

  // ------------------------------------------------------------------ LAVA — E minor power chords, aggressive
  lava: {
    name: 'Magma Run',
    bpm: 152,
    bassBase: 33,
    inst: {
      lead: { w: 'pulse25', v: 0.14, a: 0.002, d: 0.12, s: 0.7, r: 0.04, gate: 0.9, vib: [6.5, 24, 0.12], det: 9, echo: 0.1 },
      bass: { w: 'sawtooth', v: 0.14, a: 0.001, d: 0.05, s: 0.4, r: 0.02, gate: 0.55, lp: 500, q: 5, fenv: 1800, fdec: 0.05 },
      arp: { w: 'square', v: 0.045, a: 0.001, d: 0.06, s: 0.4, r: 0.02, gate: 0.5 },
    },
    kit: { v: 0.58, kick: [160, 40, 0.11], snare: [180, 1800, 0.14] },
    echo: { beats: 0.5, fb: 0.2, wet: 0.15 },
    def: {
      bass: '0000000000000000',
      arp: '0.1.0.1.0.1.0.1.',
      drums: {
        k: 'x.x.x.xxx.x.x.xx',
        s: '....x.......x...',
        h: 'x.x.x.x.x.x.x.x.',
        fill: { k: 'x.x.x.x.x.x.x.x.', s: '....x.x.xxxxXXXX', h: 'x.x.x.x.x.x.x.x.' },
        crash: true,
      },
    },
    patterns: {
      A: {
        chords: 'E5 E5 G5 A5',
        lead: 'E5:2 G5:2 A5:2 B5:4 A5:2 G5:2 E5:2 | D5:2 E5:2 G5:2 E5:4 D5:2 B4:4 | G5:2 A5:2 B5:2 D6:4 B5:2 A5:2 G5:2 | A5:4 B5:2 C6:2 B5:4 A5:4',
      },
      B: {
        chords: 'C5 D5 E5 E5',
        lead: 'C6:4 B5:2 G5:2 E5:4 G5:4 | D6:4 C6:2 A5:2 F#5:4 A5:4 | E6:4 D6:2 B5:2 G5:2 A5:2 B5:4 | B5:2 A5:2 G5:2 F#5:2 E5:8',
      },
      C: {
        chords: 'F5 E5 F5 G5:8 A5:8',
        lead: 'F5:4 E5:2 F5:2 A5:4 C6:4 | B5:4 G5:2 E5:2 B4:8 | F5:2 A5:2 C6:2 F6:2 E6:4 C6:4 | D6:4 B5:4 E6:4 C#6:4',
        bass: '00o000o000o000o0',
      },
    },
    order: ['A', 'B', 'A', 'C'],
  },

  // ------------------------------------------------------------------ ICE — B minor, crystalline
  ice: {
    name: 'Crystal Veins',
    bpm: 138,
    inst: {
      lead: { w: 'pulse12', v: 0.14, a: 0.003, d: 0.2, s: 0.55, r: 0.1, gate: 0.85, vib: [6, 14, 0.15], echo: 0.3 },
      bass: { w: 'tri4', v: 0.26, a: 0.002, d: 0.15, s: 0.75, r: 0.05, gate: 0.8 },
      arp: { w: 'triangle', v: 0.1, a: 0.001, d: 0.09, s: 0, r: 0.08, gate: 0.5, echo: 0.4, oct: 1 },
    },
    kit: { v: 0.45, metal: true, hat: [9000, 0.02] },
    echo: { beats: 0.75, fb: 0.4, wet: 0.35, tone: 4000 },
    def: {
      bass: '0...0.2.0...0.o.',
      arp: '0214',
      drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'xxxXxxxXxxxXxxxX' },
    },
    patterns: {
      A: {
        chords: 'Bm7 Gmaj7 D A',
        lead: 'F#5:2 A5:2 B5:4 C#6:2 D6:2 C#6:2 A5:2 | B5:4 F#5:2 G5:2 D6:4 B5:4 | A5:2 F#5:2 D5:2 F#5:2 A5:2 D6:2 C#6:2 A5:2 | E5:4 C#6:4 B5:2 A5:2 E5:4',
      },
      A2: {
        chords: 'Bm7 Gmaj7 D A',
        lead: 'F#5:2 A5:2 B5:4 C#6:2 D6:2 C#6:2 A5:2 | B5:4 F#5:2 G5:2 D6:4 B5:4 | A5:2 F#5:2 D5:2 F#5:2 A5:2 D6:2 C#6:2 A5:2 | E5:4 C#6:4 B5:2 A5:2 E5:4',
        arp: '0123',
        drums: {
          k: 'x.....x...x.x...',
          s: '....x.......x..g',
          h: 'xxxXxxxXxxxXxxxX',
          fill: { k: 'x.....x...x.x.x.', s: '....x.......XXXX', h: 'xxxXxxxXxxxXxxxX' },
        },
      },
      B: {
        chords: 'Em7 F#m7 Gmaj7 A',
        lead: 'G5:4 B5:4 E6:4 D6:2 B5:2 | A5:4 C#6:4 F#6:4 E6:2 C#6:2 | B5:4 D6:4 F#6:4 E6:2 D6:2 | C#6:4 E6:4 A5:8',
        drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'xxxXxxxXxxxXxxxX', crash: true },
      },
    },
    order: ['A', 'B', 'A2', 'B'],
  },

  // ------------------------------------------------------------------ TECHNO — F minor, industrial, fast
  techno: {
    name: 'Citadel Protocol',
    bpm: 156,
    bassBase: 36,
    inst: {
      lead: { w: 'sawtooth', v: 0.1, a: 0.002, d: 0.12, s: 0.5, r: 0.04, gate: 0.8, lp: 900, q: 6, fenv: 2600, fdec: 0.12, slide: 0.04, echo: 0.2 },
      bass: { w: 'square', v: 0.11, a: 0.001, d: 0.06, s: 0.5, r: 0.02, gate: 0.6, lp: 700, q: 3, fenv: 900, fdec: 0.06 },
      arp: { w: 'pulse12', v: 0.045, a: 0.001, d: 0.04, s: 0.2, r: 0.02, gate: 0.5, echo: 0.25 },
    },
    kit: { v: 0.56, kick: [150, 45, 0.14], metal: true },
    echo: { beats: 0.75, fb: 0.35, wet: 0.25 },
    def: {
      bass: '-000-000-000-000',
      arp: '0420',
      drums: {
        k: 'x...x...x...x...',
        s: '....c.......c...',
        h: 'xxoxxxoxxxoxxxox',
        fill: { k: 'x...x...x...x.x.', s: '....c.......cccc', h: 'xxoxxxoxxxoxxxox' },
      },
    },
    patterns: {
      A: {
        chords: 'Fm Fm Db Eb',
        lead: 'F5:2 F5:1 Ab5:1 C6:2 F5:2 Eb6:2 C6:2 Ab5:2 G5:2 | F5:2 C6:2 F5:1 F5:1 Ab5:2 Bb5:2 Ab5:2 G5:2 Eb5:2 | Db5:2 F5:2 Ab5:2 C6:2 Db6:4 C6:2 Ab5:2 | Eb5:2 G5:2 Bb5:2 Eb6:2 D6:2 Bb5:2 G5:4',
        drums: {
          k: 'x...x...x...x...',
          s: '....c.......c...',
          h: 'xxoxxxoxxxoxxxox',
          fill: { k: 'x...x...x...x.x.', s: '....c.......cccc', h: 'xxoxxxoxxxoxxxox' },
          crash: true,
        },
      },
      B: {
        chords: 'Bbm C Fm C',
        lead: 'Bb5:4 Db6:4 F6:4 Db6:2 Bb5:2 | C6:4 E6:4 G6:4 E6:2 C6:2 | F6:6 C6:2 Ab5:4 F5:4 | G5:2 Ab5:2 B5:2 C6:2 E6:4 C6:4',
      },
      C: {
        chords: 'Fm Fm Gb Gb',
        lead: 'F4:1 F5:1 F4:1 Eb5:1 F4:1 C5:1 F4:1 Ab4:1 F4:1 F5:1 F4:1 Eb5:1 F4:1 C5:1 Ab4:1 Bb4:1 | F4:1 F5:1 F4:1 Eb5:1 F4:1 C5:1 F4:1 Ab4:1 F4:1 F5:1 F4:1 Eb5:1 F4:1 C5:1 Ab4:1 Bb4:1 | Gb4:1 Gb5:1 Gb4:1 F5:1 Gb4:1 Db5:1 Gb4:1 Bb4:1 Gb4:1 Gb5:1 Gb4:1 F5:1 Gb4:1 Db5:1 Bb4:1 C5:1 | Gb4:1 Gb5:1 Gb4:1 F5:1 Gb4:1 Db5:1 Gb4:1 Bb4:1 Gb4:1 Gb5:1 Gb4:1 F5:1 Gb4:1 Db5:1 Bb4:1 C5:1',
        bass: '0...0...0...0...',
        arp: '----0-------2---',
        drums: {
          k: 'x...x...x...x...',
          s: '................',
          h: 'x.x.x.x.x.x.x.x.',
          fill: { k: 'xxxxxxxxxxxxxxxx', s: 'c.c.c.c.cccccccc', h: 'x.x.x.x.x.x.x.x.' },
        },
      },
    },
    order: ['A', 'B', 'A', 'C'],
  },
};
