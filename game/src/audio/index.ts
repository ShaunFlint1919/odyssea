// STUB — to be implemented by the platform module owner (see docs/ARCHITECTURE.md).
import type { MusicTrack, SfxKey } from '../types';

export interface SfxOptions { volume?: number; pitch?: number; pan?: number }

export const audio = {
  /** Resume the WebAudio context (call on the first user gesture). */
  unlock(): void {},
  /** Play a procedural sound effect (rate-limited per key to avoid clipping). */
  sfx(key: SfxKey, opts?: SfxOptions): void { void key; void opts; },
  /** Start a looping procedural music track (null = stop). Cross-fades. */
  music(track: MusicTrack | null): void { void track; },
  /** Apply volumes 0..1 (read from settings). */
  setVolumes(sfx: number, music: number): void { void sfx; void music; },
  /** Pause/resume everything (app backgrounded). */
  suspend(): void {},
  resume(): void {},
};
