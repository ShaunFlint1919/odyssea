// =====================================================================================
//  OFFLINE DIAGNOSTICS — renders music + SFX through the real master chain into an
//  OfflineAudioContext and measures peak / RMS (used by automated audio checks only).
// =====================================================================================
import type { MusicTrack, SfxKey } from '../types';
import { createGraph, faderGain, MUSIC_LEVEL, mulberry32, offlineContextCtor, SFX_LEVEL } from './engine';
import { getSong, SongPlayer } from './sequencer';
import { SfxEngine, type SfxPlayOptions } from './sfx';

export interface RenderRequest {
  seconds?: number;
  track?: MusicTrack | null;
  sfx?: { key: SfxKey; t: number; opts?: SfxPlayOptions }[];
  /** Slider values 0..1 (same taper as setVolumes). */
  sfxVolume?: number;
  musicVolume?: number;
  sampleRate?: number;
}

export interface RenderReport {
  seconds: number;
  peak: number;
  peakDb: number;
  rms: number;
  rmsDb: number;
  /** Loudest 400 ms window (RMS, dBFS). */
  maxWindowRmsDb: number;
  /** Samples at or above 0.999 (digital clipping). */
  clipped: number;
  sfxStarted: number;
  sfxPeakVoices: number;
  sfxRateLimited: number;
  loops: number;
}

const db = (x: number): number => (x > 0 ? 20 * Math.log10(x) : -Infinity);

/** Renders a scenario offline; resolves null when OfflineAudioContext is unavailable. */
export async function renderOffline(req: RenderRequest): Promise<RenderReport | null> {
  const Ctor = offlineContextCtor();
  if (!Ctor) return null;
  const seconds = Math.min(120, Math.max(0.5, req.seconds ?? 6));
  const sr = req.sampleRate ?? 44100;
  const ctx = new Ctor(2, Math.ceil(seconds * sr), sr);
  const g = createGraph(ctx);
  g.output.connect(ctx.destination);
  g.sfxBus.gain.value = faderGain(req.sfxVolume ?? 1) * SFX_LEVEL;
  g.musicBus.gain.value = faderGain(req.musicVolume ?? 1) * MUSIC_LEVEL;
  let player: SongPlayer | null = null;
  if (req.track) {
    player = new SongPlayer(g, req.track, getSong(req.track), 0, 0);
    player.scheduleUntil(seconds, 0);
  }
  const sfx = new SfxEngine(g, 24, mulberry32(99));
  const events = [...(req.sfx ?? [])].sort((a, b) => a.t - b.t);
  for (const e of events) if (e.t < seconds) sfx.play(e.key, e.opts, e.t);
  const buf = await ctx.startRendering();
  let peak = 0;
  let sum = 0;
  let clipped = 0;
  let maxWin = 0;
  const win = Math.floor(sr * 0.4);
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  let winSum = 0;
  let winN = 0;
  for (let i = 0; i < buf.length; i++) {
    let s2 = 0;
    for (const d of chans) {
      const v = d[i];
      const a = Math.abs(v);
      if (a > peak) peak = a;
      if (a >= 0.999) clipped++;
      s2 += v * v;
    }
    s2 /= chans.length;
    sum += s2;
    winSum += s2;
    if (++winN === win) {
      maxWin = Math.max(maxWin, Math.sqrt(winSum / win));
      winSum = 0;
      winN = 0;
    }
  }
  const rms = Math.sqrt(sum / buf.length);
  const st = sfx.stats(seconds);
  return {
    seconds,
    peak,
    peakDb: db(peak),
    rms,
    rmsDb: db(rms),
    maxWindowRmsDb: db(maxWin),
    clipped,
    sfxStarted: st.started,
    sfxPeakVoices: st.peak,
    sfxRateLimited: st.rateLimited,
    loops: player ? player.stats.loops : 0,
  };
}
