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
  /** Fraction of samples inside the soft-clip shoulder (|x| > 0.62). */
  shoulder: number;
  /** Ungated integrated loudness, K-weighted per ITU-R BS.1770 (LUFS; NaN unless 48 kHz). */
  lufs: number;
  /** Loudest 400 ms block (momentary loudness, LUFS; NaN unless 48 kHz). */
  momentaryMaxLufs: number;
  sfxStarted: number;
  sfxPeakVoices: number;
  sfxRateLimited: number;
  loops: number;
}

const db = (x: number): number => (x > 0 ? 20 * Math.log10(x) : -Infinity);

/** BS.1770 K-weighting (pre-filter shelf + RLB high-pass), 48 kHz coefficients, in place. */
function kWeight(x: Float32Array): Float64Array {
  const out = new Float64Array(x.length);
  const st = [
    [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
    [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621],
  ];
  for (let i = 0; i < x.length; i++) out[i] = x[i];
  for (const [b0, b1, b2, a1, a2] of st) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < out.length; i++) {
      const x0 = out[i];
      const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x0; y2 = y1; y1 = y0;
      out[i] = y0;
    }
  }
  return out;
}

function loudness(chans: Float32Array[], sr: number): { lufs: number; momentaryMax: number } {
  if (sr !== 48000) return { lufs: NaN, momentaryMax: NaN };
  const k = chans.map(kWeight);
  const n = k[0].length;
  let total = 0;
  for (const c of k) for (let i = 0; i < n; i++) total += c[i] * c[i];
  const block = Math.floor(0.4 * sr);
  const hop = Math.floor(0.1 * sr);
  let maxMs = 0;
  for (let s = 0; s + block <= n; s += hop) {
    let ms = 0;
    for (const c of k) for (let i = s; i < s + block; i++) ms += c[i] * c[i];
    maxMs = Math.max(maxMs, ms / block);
  }
  const lu = (ms: number): number => (ms > 0 ? -0.691 + 10 * Math.log10(ms) : -Infinity);
  return { lufs: lu(total / n), momentaryMax: lu(maxMs) };
}

/** Renders a scenario offline; resolves null when OfflineAudioContext is unavailable. */
export async function renderOffline(req: RenderRequest): Promise<RenderReport | null> {
  const Ctor = offlineContextCtor();
  if (!Ctor) return null;
  const seconds = Math.min(120, Math.max(0.5, req.seconds ?? 6));
  const sr = req.sampleRate ?? 48000;
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
  let shoulder = 0;
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
      if (a > 0.62) shoulder++;
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
  const ld = loudness(chans, sr);
  return {
    seconds,
    peak,
    peakDb: db(peak),
    rms,
    rmsDb: db(rms),
    maxWindowRmsDb: db(maxWin),
    clipped,
    shoulder: shoulder / (buf.length * chans.length),
    lufs: ld.lufs,
    momentaryMaxLufs: ld.momentaryMax,
    sfxStarted: st.started,
    sfxPeakVoices: st.peak,
    sfxRateLimited: st.rateLimited,
    loops: player ? player.stats.loops : 0,
  };
}
