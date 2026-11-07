import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MusicTrack, SfxKey } from '../src/types';
import { BIOMES } from '../src/types';
import { audio, audioDebug } from '../src/audio';
import { SONGS } from '../src/audio/songs';
import { compileSong, RANGES, validateSong } from '../src/audio/compile';
import { SFX_DEFS, SfxEngine } from '../src/audio/sfx';
import { createGraph } from '../src/audio/engine';
import { getSong, SongPlayer } from '../src/audio/sequencer';
import { chordTone, mtof, noteToMidi, parseChord } from '../src/audio/theory';

const ALL_SFX: SfxKey[] = [
  'shot_pulse', 'shot_scatter', 'shot_gatling', 'shot_laser', 'shot_missile', 'shot_wave',
  'shot_heavy', 'shot_rear', 'shot_sidekick', 'enemy_shot', 'enemy_laser',
  'hit', 'hit_armor', 'shield_hit', 'shield_down',
  'explode_s', 'explode_m', 'explode_l', 'explode_boss',
  'pickup_credit', 'pickup_power', 'pickup_repair', 'pickup_intel',
  'ui_move', 'ui_select', 'ui_back', 'ui_buy', 'ui_sell', 'ui_error',
  'boss_alarm', 'warning', 'level_clear', 'game_over', 'rear_toggle',
];
const ALL_TRACKS: MusicTrack[] = ['title', 'map', 'hangar', 'boss', 'victory', ...BIOMES];

// ------------------------------------------------------------------ strict WebAudio mock
// Validates what real browsers reject (non-finite values, exponential ramps to <= 0,
// stop() before start(), double start()) and counts automation events inserted out of
// time order on a param (the engine keeps every param timeline strictly ordered).

const issues: string[] = [];
let outOfOrder = 0;

class MockParam {
  value: number;
  private lastT = -Infinity;
  constructor(v = 0) { this.value = v; }
  private ev(name: string, v: number, t: number): void {
    if (!Number.isFinite(v) || !Number.isFinite(t)) issues.push(`${name}: non-finite (${v}, ${t})`);
    if (t < 0) issues.push(`${name}: negative time ${t}`);
    if (t < this.lastT - 1e-9) outOfOrder++;
    this.lastT = Math.max(this.lastT, t);
  }
  setValueAtTime(v: number, t: number): this { this.ev('setValueAtTime', v, t); return this; }
  linearRampToValueAtTime(v: number, t: number): this { this.ev('linearRamp', v, t); return this; }
  exponentialRampToValueAtTime(v: number, t: number): this {
    if (!(v > 0)) issues.push(`exponentialRamp to ${v}`);
    this.ev('exponentialRamp', v, t);
    return this;
  }
  setTargetAtTime(v: number, t: number, tc: number): this {
    if (!(tc >= 0) || !Number.isFinite(tc)) issues.push(`setTargetAtTime tc=${tc}`);
    this.ev('setTargetAtTime', v, t);
    return this;
  }
  cancelScheduledValues(t: number): this { this.lastT = Math.min(this.lastT, t); return this; }
}

class MockNode {
  connections = 0;
  connect(dst: unknown): unknown { this.connections++; return dst; }
  disconnect(): void { this.connections = 0; }
}

class MockSource extends MockNode {
  started = false;
  onended: (() => void) | null = null;
  start(t = 0): void {
    if (this.started) issues.push('start() called twice');
    if (!Number.isFinite(t)) issues.push('start(non-finite)');
    this.started = true;
  }
  stop(t = 0): void {
    if (!this.started) issues.push('stop() before start()');
    if (!Number.isFinite(t)) issues.push('stop(non-finite)');
  }
}

class MockOsc extends MockSource {
  type = 'sine';
  frequency = new MockParam(440);
  detune = new MockParam(0);
  setPeriodicWave(): void {}
}

class MockBufferSource extends MockSource {
  buffer: unknown = null;
  loop = false;
  playbackRate = new MockParam(1);
}

class MockBuffer {
  private data: Float32Array[];
  constructor(readonly numberOfChannels: number, readonly length: number, readonly sampleRate: number) {
    this.data = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  get duration(): number { return this.length / this.sampleRate; }
  getChannelData(c: number): Float32Array { return this.data[c]; }
}

class MockContext {
  sampleRate = 48000;
  state: string = 'suspended';
  destination = new MockNode();
  private t0 = Date.now();
  private listeners: (() => void)[] = [];
  get currentTime(): number { return this.state === 'running' ? (Date.now() - this.t0) / 1000 : 0; }
  resume(): Promise<void> { this.t0 = Date.now(); this.state = 'running'; this.listeners.forEach((l) => l()); return Promise.resolve(); }
  suspend(): Promise<void> { this.state = 'suspended'; return Promise.resolve(); }
  close(): Promise<void> { this.state = 'closed'; return Promise.resolve(); }
  addEventListener(_e: string, l: () => void): void { this.listeners.push(l); }
  createGain() { return Object.assign(new MockNode(), { gain: new MockParam(1) }); }
  createOscillator() { return new MockOsc(); }
  createBufferSource() { return new MockBufferSource(); }
  createBiquadFilter() { return Object.assign(new MockNode(), { type: 'lowpass', frequency: new MockParam(350), Q: new MockParam(1), gain: new MockParam(0) }); }
  createDynamicsCompressor() {
    return Object.assign(new MockNode(), { threshold: new MockParam(), knee: new MockParam(), ratio: new MockParam(), attack: new MockParam(), release: new MockParam() });
  }
  createWaveShaper() { return Object.assign(new MockNode(), { curve: null as unknown, oversample: 'none' }); }
  createStereoPanner() { return Object.assign(new MockNode(), { pan: new MockParam(0) }); }
  createDelay() { return Object.assign(new MockNode(), { delayTime: new MockParam(0) }); }
  createPeriodicWave(re: Float32Array, im: Float32Array) {
    for (const v of [...re, ...im]) if (!Number.isFinite(v)) issues.push('periodic wave non-finite');
    return {};
  }
  createBuffer(ch: number, len: number, sr: number) { return new MockBuffer(ch, len, sr); }
}

function mockGraph(running = true): { ctx: MockContext; g: ReturnType<typeof createGraph> } {
  const ctx = new MockContext();
  if (running) void ctx.resume();
  const g = createGraph(ctx as unknown as BaseAudioContext);
  return { ctx, g };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ------------------------------------------------------------------ tests

describe('audio facade without WebAudio (node)', () => {
  it('every API call is a silent no-op and never throws', async () => {
    expect(() => {
      audio.unlock();
      audio.setVolumes(0.8, 0.6);
      for (const k of ALL_SFX) {
        audio.sfx(k);
        audio.sfx(k, { volume: 0.5, pitch: 1.2, pan: -0.7 });
      }
      for (const t of ALL_TRACKS) {
        audio.music(t);
        audio.music(t);
      }
      audio.music(null);
      audio.music('nonsense' as MusicTrack);
      audio.sfx('nonsense' as SfxKey, { volume: NaN, pitch: Infinity, pan: 99 });
      audio.setVolumes(NaN, -3);
      audio.suspend();
      audio.resume();
      audio.unlock();
    }).not.toThrow();
    const s = audioDebug.state();
    expect(s.available).toBe(false);
    expect(s.ctxState).toBe('none');
    expect(audioDebug.sfxStats()).toBeNull();
    expect(audioDebug.musicStats()).toBeNull();
    await expect(audioDebug.renderOffline({ seconds: 1, track: 'title' })).resolves.toBeNull();
  });

  it('does not throw when the AudioContext constructor is blocked', async () => {
    vi.resetModules();
    vi.stubGlobal('window', {
      AudioContext: class { constructor() { throw new Error('NotAllowedError'); } },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    });
    const mod = await import('../src/audio');
    expect(() => {
      for (let i = 0; i < 5; i++) mod.audio.unlock();
      for (const k of ALL_SFX) mod.audio.sfx(k);
      for (const t of ALL_TRACKS) mod.audio.music(t);
      mod.audio.setVolumes(1, 1);
      mod.audio.suspend();
      mod.audio.resume();
    }).not.toThrow();
    expect(mod.audioDebug.state().available).toBe(false);
  });
});

describe('theory helpers', () => {
  it('parses notes and chords', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('F#5')).toBe(78);
    expect(noteToMidi('Bb3')).toBe(58);
    expect(noteToMidi('H2')).toBeNull();
    expect(mtof(69)).toBeCloseTo(440, 6);
    const am7 = parseChord('Am7');
    expect(am7).toEqual({ root: 9, tones: [0, 3, 7, 10] });
    expect(parseChord('Bbmaj7')?.root).toBe(10);
    expect(parseChord('Cfoo')).toBeNull();
    expect(chordTone(57, am7!, 4)).toBe(69);
  });
});

describe('song data', () => {
  it('defines a song for every MusicTrack', () => {
    expect(Object.keys(SONGS).sort()).toEqual([...ALL_TRACKS].sort());
  });

  for (const track of ALL_TRACKS) {
    it(`${track}: compiles, patterns well-formed, notes in range`, () => {
      const song = SONGS[track];
      expect(validateSong(song, track)).toEqual([]);
      const c = compileSong(song, track);
      expect(c.seq.length).toBeGreaterThan(0);
      for (const p of c.seq) {
        expect(p.steps % c.bar).toBe(0);
        const bars = p.steps / c.bar;
        expect(bars).toBeGreaterThanOrEqual(2);
        expect(bars).toBeLessThanOrEqual(4);
        for (const [notes, lens, range] of [
          [p.lead, p.leadLen, RANGES.lead],
          [p.bass, p.bassLen, RANGES.bass],
          [p.arp, p.arpLen, RANGES.arp],
        ] as const) {
          expect(notes.length).toBe(p.steps);
          for (let i = 0; i < p.steps; i++) {
            if (notes[i] >= 0) {
              expect(notes[i]).toBeGreaterThanOrEqual(range[0] - 12);
              expect(notes[i]).toBeLessThanOrEqual(range[1]);
              expect(lens[i]).toBeGreaterThan(0);
              expect(i + lens[i]).toBeLessThanOrEqual(p.steps);
            }
          }
        }
        expect(p.drums.some((d) => d !== 0) || p.steps > 0).toBe(true);
      }
      // A loop long enough not to be repetitive, short enough to be learnable.
      expect(c.loopSeconds).toBeGreaterThan(15);
      expect(c.loopSeconds).toBeLessThan(120);
      const action = (BIOMES as string[]).includes(track) || track === 'boss';
      if (action) {
        expect(song.bpm).toBeGreaterThanOrEqual(120);
        expect(song.bpm).toBeLessThanOrEqual(170);
      }
    });
  }

  it('every track is distinct (name, melody)', () => {
    const names = new Set(ALL_TRACKS.map((t) => SONGS[t].name));
    expect(names.size).toBe(ALL_TRACKS.length);
    const melodies = new Set(ALL_TRACKS.map((t) => Array.from(compileSong(SONGS[t]).seq[0].lead).join(',')));
    expect(melodies.size).toBe(ALL_TRACKS.length);
  });

  it('rejects malformed patterns with a clear message', () => {
    const base = SONGS.title;
    const bad = { ...base, patterns: { ...base.patterns, A: { ...base.patterns.A, lead: 'C5:4 D5:4 | C5:16 | C5:16 | C5:16' } } };
    expect(validateSong(bad)[0]).toMatch(/bar 1 has 8 steps/);
    const badChord = { ...base, patterns: { ...base.patterns, A: { ...base.patterns.A, chords: 'D Bm Gx A' } } };
    expect(validateSong(badChord)[0]).toMatch(/unknown chord "Gx"/);
  });
});

describe('sfx definitions', () => {
  it('covers exactly every SfxKey with sane mixing rules', () => {
    expect(Object.keys(SFX_DEFS).sort()).toEqual([...ALL_SFX].sort());
    for (const k of ALL_SFX) {
      const d = SFX_DEFS[k];
      expect(d.gap).toBeGreaterThan(0);
      expect(d.max).toBeGreaterThanOrEqual(1);
      expect(d.v).toBeGreaterThan(0);
      expect(d.v).toBeLessThanOrEqual(1);
    }
    for (const k of ['shot_pulse', 'shot_scatter', 'shot_gatling', 'shot_laser', 'shot_missile', 'shot_wave', 'shot_heavy', 'shot_rear', 'shot_sidekick'] as SfxKey[]) {
      expect(SFX_DEFS[k].gap).toBeGreaterThanOrEqual(0.045);
      expect(SFX_DEFS[k].gap).toBeLessThanOrEqual(0.09);
    }
    expect(SFX_DEFS.enemy_shot.gap).toBeGreaterThanOrEqual(0.06);
  });
});

describe('engine on a strict WebAudio mock', () => {
  it('builds every sfx with valid automation, respects rate limits and the voice cap', () => {
    issues.length = 0;
    outOfOrder = 0;
    const { g } = mockGraph();
    const sfx = new SfxEngine(g, 24);
    let t = 0;
    for (const k of ALL_SFX) {
      expect(sfx.play(k, { pan: 0.5, pitch: 1.1, volume: 0.8 }, t)).toBe(true);
      t += 3.5;
    }
    // Rate limit: 40 calls at the same instant -> a single voice.
    const before = sfx.stats(t).started;
    for (let i = 0; i < 40; i++) sfx.play('shot_pulse', undefined, t);
    expect(sfx.stats(t).started - before).toBe(1);
    // 20+ shots/s on every weapon plus explosion storms never exceed the cap.
    const keys: SfxKey[] = ['shot_pulse', 'shot_gatling', 'shot_rear', 'shot_sidekick', 'enemy_shot', 'explode_s', 'explode_m', 'explode_l', 'hit', 'pickup_credit'];
    for (let i = 0; i < 4000; i++) {
      t += 0.004;
      sfx.play(keys[i % keys.length], undefined, t);
      expect(sfx.pool.active(t)).toBeLessThanOrEqual(24);
    }
    const st = sfx.stats(t);
    expect(st.peak).toBeLessThanOrEqual(24);
    expect(st.rateLimited).toBeGreaterThan(0);
    expect(issues).toEqual([]);
    expect(outOfOrder).toBe(0);
  });

  it('schedules every song gap-free with ordered automation and seamless loops', () => {
    for (const track of ALL_TRACKS) {
      issues.length = 0;
      outOfOrder = 0;
      const { g } = mockGraph();
      const song = getSong(track);
      const p = new SongPlayer(g, track, song, 0, 0.25);
      // Simulate the 25 ms lookahead timer over 1.3 loops.
      const end = song.loopSeconds * 1.3 + 2;
      for (let now = 0; now < end; now += 0.025) p.scheduleUntil(now + 0.12, now);
      expect(p.stats.late).toBe(0);
      expect(p.stats.loops).toBeGreaterThanOrEqual(1);
      expect(p.stats.minLead).toBeGreaterThan(0);
      // Steps lie exactly on the grid: no drift.
      const expected = (p.stats.lastTime - p.stats.firstTime) / song.stepDur;
      expect(Math.abs(expected - (p.stats.steps - 1))).toBeLessThan(1e-6);
      p.fadeOut(end, 0.6);
      p.dispose();
      expect(issues, track).toEqual([]);
      expect(outOfOrder, track).toBe(0);
    }
  });

  it('facade: unlock, cross-fade, same-track keep, null fade-out, suspend/resume', async () => {
    issues.length = 0;
    vi.useFakeTimers();
    vi.resetModules();
    const listeners = new Map<string, () => void>();
    vi.stubGlobal('window', {
      AudioContext: MockContext,
      addEventListener: (e: string, l: () => void) => listeners.set(e, l),
      removeEventListener: (e: string) => listeners.delete(e),
    });
    const mod = await import('../src/audio');
    const { audio: a, audioDebug: dbg } = mod;
    a.setVolumes(0.8, 0.6);
    a.music('title'); // before unlock: remembered, gesture listeners armed
    expect(dbg.state().available).toBe(false);
    expect(dbg.state().gestureArmed).toBe(true);
    listeners.get('pointerdown')?.(); // first gesture -> unlock
    expect(dbg.state().available).toBe(true);
    expect(dbg.state().ctxState).toBe('running');
    expect(dbg.state().track).toBe('title');
    vi.advanceTimersByTime(2000);
    const id = dbg.state().playerId;
    a.music('title');
    expect(dbg.state().playerId).toBe(id); // same track keeps playing
    for (const k of ALL_SFX) {
      a.sfx(k, { pan: -0.3 });
      vi.advanceTimersByTime(120);
    }
    expect(dbg.sfxStats()!.started).toBeGreaterThanOrEqual(ALL_SFX.length - 2);
    for (const t of ALL_TRACKS) {
      a.music(t);
      expect(dbg.state().track).toBe(t);
      vi.advanceTimersByTime(1500);
      const ms = dbg.musicStats()!;
      expect(ms.steps).toBeGreaterThan(5);
      expect(ms.late).toBe(0);
    }
    expect(dbg.state().fading).toBeLessThanOrEqual(1);
    a.suspend();
    expect(dbg.state().ctxState).toBe('suspended');
    a.resume();
    expect(dbg.state().ctxState).toBe('running');
    a.music(null);
    vi.advanceTimersByTime(1500);
    expect(dbg.state().track).toBeNull();
    expect(dbg.state().fading).toBe(0);
    expect(dbg.songInfo('boss').bpm).toBe(SONGS.boss.bpm);
    expect(issues).toEqual([]);
  });
});
