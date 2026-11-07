// Music-theory helpers shared by the SFX designs and the chiptune compiler (pure, no WebAudio).

const PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** MIDI note number -> frequency in Hz (A4 = 69 = 440 Hz). */
export function mtof(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Parses "C4", "F#5", "Bb3" into a MIDI note number (C4 = 60). Returns null when malformed. */
export function noteToMidi(name: string): number | null {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return null;
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + PITCH_CLASS[m[1]] + acc;
}

/** Chord qualities -> semitone offsets from the root (ascending). */
export const CHORD_QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '5': [0, 7],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '7sus4': [0, 5, 7, 10],
  dim: [0, 3, 6],
  m7b5: [0, 3, 6, 10],
  aug: [0, 4, 8],
  add9: [0, 4, 7, 14],
  m9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
};

export interface Chord {
  /** Pitch class of the root (0 = C .. 11 = B). */
  root: number;
  /** Semitone offsets of the chord tones from the root. */
  tones: number[];
}

/** Parses a chord symbol such as "Am7", "F#", "Bbmaj7", "E5". Returns null when unknown. */
export function parseChord(sym: string): Chord | null {
  const m = /^([A-G])([#b]?)(.*)$/.exec(sym);
  if (!m) return null;
  const tones = CHORD_QUALITIES[m[3]];
  if (!tones) return null;
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return { root: (PITCH_CLASS[m[1]] + acc + 12) % 12, tones };
}

/** The i-th chord tone above `rootMidi`, wrapping into higher octaves (0 = root, 1 = next tone...). */
export function chordTone(rootMidi: number, chord: Chord, i: number): number {
  const n = chord.tones.length;
  return rootMidi + chord.tones[i % n] + 12 * Math.floor(i / n);
}

/** Places a pitch class in the octave starting at `base` (MIDI): result in [base, base + 11]. */
export function placeRoot(pc: number, base: number): number {
  return base + ((pc - (base % 12) + 24) % 12);
}
