// =====================================================================================
//  AUDIO FACADE — 100 % procedural WebAudio (no audio files).
//  The AudioContext is created lazily by unlock() (first user gesture; the module also
//  arms one-shot gesture listeners on first use as a safety net) — never at import time.
//  Every call is a silent no-op when WebAudio is unavailable or blocked: nothing throws.
//  Files: engine.ts (graph / master bus), voices.ts + sfx.ts (SFX), compile.ts +
//  songs.ts + sequencer.ts (music), diagnostics.ts (offline measurement for tests).
// =====================================================================================
import type { MusicTrack, SfxKey } from '../types';
import { audioContextCtor, createGraph, faderGain, MUSIC_LEVEL, quiet, SFX_LEVEL, type Graph } from './engine';
import { SfxEngine, type SfxStats } from './sfx';
import { getSong, MusicManager, type PlayerStats } from './sequencer';
import { SONGS } from './songs';
import { renderOffline, type RenderReport, type RenderRequest } from './diagnostics';

export interface SfxOptions { volume?: number; pitch?: number; pan?: number }

interface Live {
  ctx: AudioContext;
  graph: Graph;
  sfx: SfxEngine;
  music: MusicManager;
}

const GESTURES = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'keydown', 'click'] as const;

const st = {
  live: null as Live | null,
  failures: 0,
  userSuspended: false,
  sfxVol: 1,
  musicVol: 1,
  wanted: null as MusicTrack | null,
  armed: false,
  primed: false,
  lastError: null as string | null,
};

function note(e: unknown): void {
  st.lastError = String((e as Error)?.message ?? e);
}

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

function applyVolumes(l: Live, smooth: boolean): void {
  const t = l.ctx.currentTime;
  const targets: [AudioParam, number][] = [
    [l.graph.sfxBus.gain, faderGain(st.sfxVol) * SFX_LEVEL],
    [l.graph.musicBus.gain, faderGain(st.musicVol) * MUSIC_LEVEL],
  ];
  for (const [p, v] of targets) {
    p.cancelScheduledValues(t);
    if (smooth) {
      p.setValueAtTime(p.value, t);
      p.setTargetAtTime(v, t, 0.06);
    } else {
      p.value = v;
    }
  }
}

function create(): Live | null {
  const Ctor = audioContextCtor();
  if (!Ctor || st.failures >= 3) return null;
  let ctx: AudioContext;
  try {
    ctx = new Ctor({ latencyHint: 'interactive' });
  } catch {
    try {
      ctx = new Ctor();
    } catch (e) {
      note(e);
      st.failures++;
      return null;
    }
  }
  try {
    const graph = createGraph(ctx);
    graph.output.connect(ctx.destination);
    const live: Live = { ctx, graph, sfx: new SfxEngine(graph), music: new MusicManager(graph, ctx) };
    applyVolumes(live, false);
    ctx.addEventListener?.('statechange', () => {
      // Interrupted by the browser / OS (not by us): resume on the next gesture.
      if (ctx.state === 'running') disarm();
      else if (ctx.state !== 'closed' && !st.userSuspended) arm();
    });
    return live;
  } catch (e) {
    note(e);
    st.failures++;
    try {
      quiet(ctx.close());
    } catch {
      /* ignore */
    }
    return null;
  }
}

/** iOS / old WebViews only unlock output when a buffer starts inside the gesture. */
function prime(l: Live): void {
  if (st.primed) return;
  st.primed = true;
  const src = l.ctx.createBufferSource();
  src.buffer = l.ctx.createBuffer(1, 1, l.ctx.sampleRate);
  src.connect(l.ctx.destination);
  src.onended = () => src.disconnect();
  src.start(0);
}

function onGesture(): void {
  audio.unlock();
  const l = st.live;
  if ((l && l.ctx.state === 'running') || (!l && !audioContextCtor())) disarm();
}

function arm(): void {
  if (st.armed || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  if (!audioContextCtor()) return;
  st.armed = true;
  for (const e of GESTURES) window.addEventListener(e, onGesture, { capture: true, passive: true });
}

function disarm(): void {
  if (!st.armed || typeof window === 'undefined') return;
  st.armed = false;
  for (const e of GESTURES) window.removeEventListener(e, onGesture, { capture: true });
}

function isTrack(t: unknown): t is MusicTrack {
  return typeof t === 'string' && Object.prototype.hasOwnProperty.call(SONGS, t);
}

export const audio = {
  /** Resume the WebAudio context (call on the first user gesture). */
  unlock(): void {
    try {
      let l = st.live;
      if (l && l.ctx.state === 'closed') {
        l.music.destroy();
        l = st.live = null;
        st.primed = false;
      }
      if (!l) {
        l = st.live = create();
        if (!l) return;
      }
      if (!st.userSuspended && l.ctx.state !== 'running') quiet(l.ctx.resume());
      prime(l);
      if (st.wanted !== (l.music.current?.track ?? null)) l.music.play(st.wanted);
      if (l.ctx.state !== 'running') arm();
    } catch (e) {
      note(e); // audio must never break the game
    }
  },
  /** Play a procedural sound effect (rate-limited per key to avoid clipping). */
  sfx(key: SfxKey, opts?: SfxOptions): void {
    try {
      const l = st.live;
      if (!l) {
        arm();
        return;
      }
      if (st.userSuspended || st.sfxVol <= 0 || l.ctx.state !== 'running') return;
      l.sfx.play(key, opts);
    } catch (e) {
      note(e);
    }
  },
  /** Start a looping procedural music track (null = stop). Cross-fades. */
  music(track: MusicTrack | null): void {
    try {
      if (track !== null && !isTrack(track)) return;
      st.wanted = track;
      const l = st.live;
      if (!l) {
        if (track) arm();
        return;
      }
      l.music.play(track);
    } catch (e) {
      note(e);
    }
  },
  /** Apply volumes 0..1 (read from settings). */
  setVolumes(sfx: number, music: number): void {
    try {
      st.sfxVol = clamp01(sfx);
      st.musicVol = clamp01(music);
      if (st.live) applyVolumes(st.live, true);
      else arm();
    } catch {
      /* ignore */
    }
  },
  /** Pause/resume everything (app backgrounded). */
  suspend(): void {
    try {
      st.userSuspended = true;
      const l = st.live;
      if (!l) return;
      l.music.pause();
      if (l.ctx.state === 'running') quiet(l.ctx.suspend());
    } catch {
      /* ignore */
    }
  },
  resume(): void {
    try {
      st.userSuspended = false;
      const l = st.live;
      if (!l) return;
      if (l.ctx.state !== 'running' && l.ctx.state !== 'closed') quiet(l.ctx.resume());
      l.music.unpause();
    } catch {
      /* ignore */
    }
  },
};

export interface AudioState {
  available: boolean;
  ctxState: string;
  time: number;
  sampleRate: number;
  track: MusicTrack | null;
  wanted: MusicTrack | null;
  playerId: number;
  fading: number;
  sfxVolume: number;
  musicVolume: number;
  suspended: boolean;
  gestureArmed: boolean;
  /** Last error swallowed by the facade (null = none). */
  lastError: string | null;
}

export interface MusicStats extends PlayerStats {
  id: number;
  track: MusicTrack;
  stepDur: number;
  bpm: number;
  loopSeconds: number;
  time: number;
}

/** Introspection for automated tests / debugging (not used by the game). */
export const audioDebug = {
  state(): AudioState {
    const l = st.live;
    return {
      available: !!l,
      ctxState: l ? l.ctx.state : 'none',
      time: l ? l.ctx.currentTime : 0,
      sampleRate: l ? l.ctx.sampleRate : 0,
      track: l?.music.current?.track ?? null,
      wanted: st.wanted,
      playerId: l?.music.current?.id ?? 0,
      fading: l ? l.music.fading.length : 0,
      sfxVolume: st.sfxVol,
      musicVolume: st.musicVol,
      suspended: st.userSuspended,
      gestureArmed: st.armed,
      lastError: st.lastError,
    };
  },
  sfxStats(): SfxStats | null {
    const l = st.live;
    return l ? l.sfx.stats(l.ctx.currentTime) : null;
  },
  musicStats(): MusicStats | null {
    const l = st.live;
    const p = l?.music.current;
    if (!l || !p) return null;
    return { ...p.stats, id: p.id, track: p.track, stepDur: p.song.stepDur, bpm: p.song.bpm, loopSeconds: p.song.loopSeconds, time: l.ctx.currentTime };
  },
  /** Song metadata (name, bpm, loop length) — works without WebAudio. */
  songInfo(track: MusicTrack): { name: string; bpm: number; loopSeconds: number; patterns: string[] } {
    const s = getSong(track);
    return { name: s.name, bpm: s.bpm, loopSeconds: s.loopSeconds, patterns: s.seq.map((p) => p.name) };
  },
  /** Offline render through the real master chain; null without OfflineAudioContext. */
  renderOffline(req: RenderRequest): Promise<RenderReport | null> {
    try {
      return renderOffline(req).catch(() => null);
    } catch {
      return Promise.resolve(null);
    }
  },
};
