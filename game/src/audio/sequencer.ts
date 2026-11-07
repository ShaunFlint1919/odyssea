// =====================================================================================
//  MUSIC SEQUENCER — tracker-style chiptune player.
//  Each song instance owns persistent monophonic channels (lead / bass / arp oscillators,
//  noise + oscillator drum kit, echo) whose AudioParams are automated note by note, so no
//  node is created per note. A lookahead scheduler (25 ms timer, 250 ms horizon on the
//  AudioContext clock) feeds the steps; patterns loop seamlessly; tracks cross-fade.
// =====================================================================================
import type { MusicTrack } from '../types';
import { setWave, type Graph } from './engine';
import { compileSong, DR, type CompiledPattern, type CompiledSong, type DrumKitDef, type InstDef } from './compile';
import { SONGS } from './songs';
import { mtof } from './theory';

/** Scheduling horizon (s): rides out main-thread hitches such as scene creation. */
export const LOOKAHEAD = 0.25;
export const TICK_MS = 25;
export const FADE = 0.6;

const compiled = new Map<MusicTrack, CompiledSong>();

/** Compiled song for a track (compiled once, cached). */
export function getSong(track: MusicTrack): CompiledSong {
  let s = compiled.get(track);
  if (!s) {
    s = compileSong(SONGS[track], track);
    compiled.set(track, s);
  }
  return s;
}

/** One persistent monophonic voice (oscillator[s] -> [filter] -> envelope gain). */
class Channel {
  private osc: OscillatorNode;
  private osc2: OscillatorNode | null = null;
  private env: GainNode;
  private filter: BiquadFilterNode | null = null;
  private lfoGain: GainNode | null = null;
  private lastF = 0;
  private lastEnd = -1;
  private maxF: number;

  constructor(g: Graph, private inst: InstDef, out: AudioNode, echoIn: AudioNode | null, start: number, nodes: AudioNode[], srcs: AudioScheduledSourceNode[]) {
    const ctx = g.ctx;
    this.maxF = Math.min(12000, ctx.sampleRate * 0.45);
    this.osc = ctx.createOscillator();
    setWave(g, this.osc, inst.w);
    this.env = ctx.createGain();
    this.env.gain.value = 0;
    const level = ctx.createGain();
    level.gain.value = inst.v;
    let head: AudioNode = this.env;
    if (inst.lp) {
      this.filter = ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = inst.lp;
      this.filter.Q.value = inst.q ?? 1;
      this.filter.connect(this.env);
      head = this.filter;
    }
    this.osc.connect(head);
    if (inst.det) {
      this.osc2 = ctx.createOscillator();
      setWave(g, this.osc2, inst.w);
      this.osc2.detune.value = inst.det;
      const half = ctx.createGain();
      half.gain.value = 0.7;
      this.osc2.connect(half);
      half.connect(head);
      nodes.push(this.osc2, half);
      srcs.push(this.osc2);
    }
    if (inst.vib) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = inst.vib[0];
      this.lfoGain = ctx.createGain();
      this.lfoGain.gain.value = 0;
      lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.osc.detune);
      if (this.osc2) this.lfoGain.connect(this.osc2.detune);
      lfo.start(start);
      nodes.push(lfo, this.lfoGain);
      srcs.push(lfo);
    }
    this.env.connect(level);
    level.connect(out);
    if (echoIn && inst.echo) {
      const send = ctx.createGain();
      send.gain.value = inst.echo;
      level.connect(send);
      send.connect(echoIn);
      nodes.push(send);
    }
    this.osc.start(start);
    this.osc2?.start(start);
    nodes.push(this.osc, this.env, level);
    if (this.filter) nodes.push(this.filter);
    srcs.push(this.osc);
  }

  /** Schedules a note: all automation stays inside [t, t + dur] so channels never overlap. */
  note(t: number, midi: number, dur: number, vel: number): void {
    const i = this.inst;
    const f = mtof(midi + 12 * (i.oct ?? 0));
    const gate = i.gate ?? 0.9;
    const len = gate >= 1 ? dur : Math.max(0.025, dur * gate);
    const a = Math.min(i.a ?? 0.004, len * 0.5);
    const fr = this.osc.frequency;
    const fr2 = this.osc2?.frequency;
    if (i.slide && this.lastF > 0 && this.lastEnd >= t - 0.002) {
      const st = t + Math.min(i.slide, len * 0.5);
      fr.setValueAtTime(this.lastF, t);
      fr.exponentialRampToValueAtTime(f, st);
      fr2?.setValueAtTime(this.lastF, t);
      fr2?.exponentialRampToValueAtTime(f, st);
    } else {
      fr.setValueAtTime(f, t);
      fr2?.setValueAtTime(f, t);
    }
    const g = this.env.gain;
    g.setTargetAtTime(vel, t, a / 3 + 0.0003);
    g.setTargetAtTime(vel * (i.s ?? 0.7), t + a, (i.d ?? 0.1) / 3);
    g.setTargetAtTime(0, t + len, (i.r ?? 0.05) / 3);
    if (this.filter && i.fenv && i.lp) {
      const q = this.filter.frequency;
      q.setTargetAtTime(Math.min(this.maxF, i.lp + i.fenv * vel), t, 0.002);
      q.setTargetAtTime(i.lp, t + 0.006, (i.fdec ?? 0.15) / 3);
    }
    if (this.lfoGain && i.vib) {
      const vg = this.lfoGain.gain;
      vg.setValueAtTime(0, t);
      const delay = i.vib[2];
      if (len > delay + 0.06) {
        vg.setValueAtTime(0, t + delay);
        vg.linearRampToValueAtTime(i.vib[1], Math.min(t + delay + 0.2, t + len));
      }
    }
    this.lastF = f;
    this.lastEnd = gate >= 1 ? t + len : -1;
  }
}

/** Noise + oscillator drum kit (kick, snare, clap, toms, hats, crash, ride). */
class DrumKit {
  private kOsc: OscillatorNode;
  private kGain: GainNode;
  private clickGain: GainNode;
  private snGain: GainNode;
  private tOsc: OscillatorNode;
  private tGain: GainNode;
  private hatGain: GainNode;
  private crGain: GainNode;
  private kick: [number, number, number];
  private snare: [number, number, number];
  private hatDecay: number;

  constructor(g: Graph, kit: DrumKitDef, out: AudioNode, echoIn: AudioNode | null, start: number, nodes: AudioNode[], srcs: AudioScheduledSourceNode[]) {
    const ctx = g.ctx;
    this.kick = kit.kick ?? [150, 45, 0.13];
    this.snare = kit.snare ?? [190, 1800, 0.12];
    const hat = kit.hat ?? [7000, 0.025];
    this.hatDecay = hat[1];
    const bus = ctx.createGain();
    bus.gain.value = kit.v;
    bus.connect(out);
    if (echoIn && kit.echo) {
      const send = ctx.createGain();
      send.gain.value = kit.echo;
      bus.connect(send);
      send.connect(echoIn);
      nodes.push(send);
    }
    const gain = (v = 0): GainNode => {
      const n = ctx.createGain();
      n.gain.value = v;
      n.connect(bus);
      nodes.push(n);
      return n;
    };
    const filt = (type: BiquadFilterType, f: number, q: number, dst: AudioNode): BiquadFilterNode => {
      const n = ctx.createBiquadFilter();
      n.type = type;
      n.frequency.value = f;
      n.Q.value = q;
      n.connect(dst);
      nodes.push(n);
      return n;
    };
    const noise = ctx.createBufferSource();
    noise.buffer = g.noise.white;
    noise.loop = true;
    const hatNoise = ctx.createBufferSource();
    hatNoise.buffer = kit.metal ? g.noise.metal : g.noise.white;
    hatNoise.loop = true;
    if (kit.metal) hatNoise.playbackRate.value = 1.6;

    this.kOsc = ctx.createOscillator();
    this.kOsc.type = 'sine';
    this.kGain = gain();
    this.kOsc.connect(this.kGain);
    this.clickGain = gain();
    noise.connect(filt('highpass', 1800, 0.7, this.clickGain));
    this.snGain = gain();
    noise.connect(filt('bandpass', this.snare[1], 0.8, this.snGain));
    this.tOsc = ctx.createOscillator();
    this.tOsc.type = 'triangle';
    this.tGain = gain();
    this.tOsc.connect(this.tGain);
    this.hatGain = gain();
    hatNoise.connect(filt('highpass', hat[0], 0.9, this.hatGain));
    this.crGain = gain();
    noise.connect(filt('highpass', 4500, 0.7, this.crGain));

    noise.start(start);
    hatNoise.start(start);
    this.kOsc.start(start);
    this.tOsc.start(start);
    nodes.push(bus, noise, hatNoise, this.kOsc, this.tOsc);
    srcs.push(noise, hatNoise, this.kOsc, this.tOsc);
  }

  private hitGain(g: GainNode, t: number, v: number, decay: number, hold = 0.002): void {
    g.gain.setTargetAtTime(v, t, 0.0006);
    g.gain.setTargetAtTime(0, t + hold, decay / 3);
  }

  /** Plays every drum of a step bit mask at time t. */
  hit(t: number, m: number, vel: number): void {
    let click = 0;
    if (m & DR.KICK) {
      const [f0, f1, dec] = this.kick;
      const v = (m & DR.KICK_ACC ? 1 : 0.85) * vel;
      this.kOsc.frequency.setValueAtTime(f0, t);
      this.kOsc.frequency.setTargetAtTime(f1, t + 0.002, 0.028);
      this.hitGain(this.kGain, t, v, dec, 0.02);
      click = v * 0.35;
    }
    if (m & (DR.SNARE | DR.GHOST)) {
      const v = (m & DR.GHOST ? 0.28 : m & DR.SNARE_ACC ? 1 : 0.8) * vel;
      const [tone, , dec] = this.snare;
      this.hitGain(this.snGain, t, v * 0.75, dec, 0.004);
      this.tOsc.frequency.setValueAtTime(tone, t);
      this.tOsc.frequency.setTargetAtTime(tone * 0.72, t + 0.002, 0.025);
      this.hitGain(this.tGain, t, v * 0.5, dec * 0.45, 0.002);
    } else if (m & DR.CLAP) {
      const v = 0.75 * vel;
      const sg = this.snGain.gain;
      sg.setTargetAtTime(v, t, 0.0005);
      sg.setTargetAtTime(0, t + 0.004, 0.003);
      sg.setTargetAtTime(v * 0.9, t + 0.011, 0.0005);
      sg.setTargetAtTime(0, t + 0.015, 0.003);
      sg.setTargetAtTime(v, t + 0.022, 0.0005);
      sg.setTargetAtTime(0, t + 0.026, 0.045);
    } else if (m & (DR.TOM_L | DR.TOM_M | DR.TOM_H)) {
      const f = m & DR.TOM_H ? 210 : m & DR.TOM_M ? 150 : 105;
      this.tOsc.frequency.setValueAtTime(f, t);
      this.tOsc.frequency.setTargetAtTime(f * 0.66, t + 0.003, 0.06);
      this.hitGain(this.tGain, t, 0.85 * vel, 0.2, 0.01);
      click = Math.max(click, 0.12 * vel);
    }
    if (click > 0) this.hitGain(this.clickGain, t, click, 0.012, 0.001);
    if (m & DR.CRASH) {
      this.hitGain(this.crGain, t, 0.42 * vel, 1.1, 0.005);
    } else if (m & DR.RIDE) {
      this.hitGain(this.crGain, t, 0.16 * vel, 0.35, 0.003);
    }
    if (m & DR.HAT_OPEN) {
      this.hitGain(this.hatGain, t, 0.3 * vel, 0.22, 0.004);
    } else if (m & DR.HAT) {
      this.hitGain(this.hatGain, t, (m & DR.HAT_ACC ? 0.34 : 0.22) * vel, this.hatDecay, 0.001);
    }
  }
}

export interface PlayerStats {
  steps: number;
  late: number;
  minLead: number;
  maxLead: number;
  firstTime: number;
  lastTime: number;
  loops: number;
  reanchors: number;
}

let nextPlayerId = 1;

/** One playing instance of a song (own channels, echo, fade gain). */
export class SongPlayer {
  readonly id = nextPlayerId++;
  readonly out: GainNode;
  readonly stats: PlayerStats = { steps: 0, late: 0, minLead: Infinity, maxLead: 0, firstTime: -1, lastTime: -1, loops: 0, reanchors: 0 };
  /** Context time after which the player is silent and can be disposed. */
  stopAt = Infinity;
  private nodes: AudioNode[] = [];
  private srcs: AudioScheduledSourceNode[] = [];
  private lead: Channel;
  private bass: Channel;
  private arp: Channel;
  private kit: DrumKit;
  private anchor: number;
  private stepCount = 0;
  private sec = 0;
  private secStep = 0;
  private disposed = false;

  constructor(private g: Graph, readonly track: MusicTrack, readonly song: CompiledSong, start: number, private fadeIn: number) {
    const ctx = g.ctx;
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(fadeIn > 0 ? 0 : 1, start);
    if (fadeIn > 0) this.out.gain.linearRampToValueAtTime(1, start + fadeIn);
    this.out.connect(g.musicBus);
    const mix = ctx.createGain();
    mix.gain.value = song.def.gain ?? 1;
    mix.connect(this.out);
    this.nodes.push(this.out, mix);
    let echoIn: GainNode | null = null;
    const e = song.def.echo;
    if (e) {
      echoIn = ctx.createGain();
      const delay = ctx.createDelay(2);
      delay.delayTime.value = Math.min(1.9, e.beats * song.beat * song.stepDur);
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = e.tone ?? 3000;
      const fb = ctx.createGain();
      fb.gain.value = Math.min(0.85, e.fb);
      const wet = ctx.createGain();
      wet.gain.value = e.wet;
      echoIn.connect(delay);
      delay.connect(tone);
      tone.connect(fb);
      fb.connect(delay);
      tone.connect(wet);
      wet.connect(mix);
      this.nodes.push(echoIn, delay, tone, fb, wet);
    }
    const inst = song.def.inst;
    this.lead = new Channel(g, inst.lead, mix, echoIn, start, this.nodes, this.srcs);
    this.bass = new Channel(g, inst.bass, mix, echoIn, start, this.nodes, this.srcs);
    this.arp = new Channel(g, inst.arp, mix, echoIn, start, this.nodes, this.srcs);
    this.kit = new DrumKit(g, song.def.kit, mix, echoIn, start, this.nodes, this.srcs);
    this.anchor = start + 0.01;
  }

  /** Context time of the next step to schedule. */
  get nextTime(): number {
    return this.anchor + this.stepCount * this.song.stepDur;
  }

  /** Schedules every step whose time is before `horizon`. */
  scheduleUntil(horizon: number, now: number): void {
    if (this.disposed) return;
    const s = this.song;
    if (this.stats.steps === 0 && this.nextTime < now && this.stopAt === Infinity) {
      // The main thread was busy since the song was requested (scene creation): start now,
      // cleanly, instead of counting the first steps as late.
      this.anchor = now + 0.03;
      const g = this.out.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(this.fadeIn > 0 ? 0 : 1, now);
      if (this.fadeIn > 0) g.linearRampToValueAtTime(1, this.anchor + this.fadeIn);
    }
    while (this.nextTime < horizon && this.nextTime < this.stopAt) {
      let t = this.nextTime;
      if (t < now) {
        // Timer starved (tab throttled): shift the grid instead of playing a burst of late notes.
        this.stats.late++;
        this.stats.reanchors++;
        this.anchor += Math.ceil((now + 0.02 - t) / s.stepDur) * s.stepDur;
        t = this.nextTime;
        if (t >= horizon) break;
      }
      const pat = s.seq[this.sec];
      const i = this.secStep;
      const swingT = s.swing && i % 2 === 1 ? t + s.swing * s.stepDur : t;
      this.playStep(pat, i, swingT);
      const lead = t - now;
      if (lead < this.stats.minLead) this.stats.minLead = lead;
      if (lead > this.stats.maxLead) this.stats.maxLead = lead;
      if (this.stats.firstTime < 0) this.stats.firstTime = t;
      this.stats.lastTime = t;
      this.stats.steps++;
      this.stepCount++;
      if (++this.secStep >= pat.steps) {
        this.secStep = 0;
        if (++this.sec >= s.seq.length) {
          this.sec = s.loopStart;
          this.stats.loops++;
        }
      }
    }
  }

  /** Duration in seconds of `len` steps starting at pattern step `i` (swing-aware). */
  private span(i: number, len: number): number {
    const s = this.song;
    if (!s.swing) return len * s.stepDur;
    const sw = s.swing * s.stepDur;
    return len * s.stepDur + ((i + len) % 2 === 1 ? sw : 0) - (i % 2 === 1 ? sw : 0);
  }

  private playStep(p: CompiledPattern, i: number, t: number): void {
    const s = this.song;
    const vel = i % s.bar === 0 ? 1 : i % s.beat === 0 ? 0.9 : 0.78;
    let n = p.lead[i];
    if (n >= 0) this.lead.note(t, n, this.span(i, p.leadLen[i]), Math.min(1, vel + 0.1));
    n = p.bass[i];
    if (n >= 0) this.bass.note(t, n, this.span(i, p.bassLen[i]), vel);
    n = p.arp[i];
    if (n >= 0) this.arp.note(t, n, this.span(i, p.arpLen[i]), vel);
    const d = p.drums[i];
    if (d) this.kit.hit(t, d, vel > 0.85 ? 1 : 0.9);
  }

  /** Fades the player out over `time` seconds starting at `now`. */
  fadeOut(now: number, time: number): void {
    if (this.stopAt !== Infinity) return;
    const g = this.out.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + time);
    this.stopAt = now + time + 0.05;
    for (const src of this.srcs) {
      try {
        src.stop(this.stopAt + 0.05);
      } catch {
        /* already stopped */
      }
    }
  }

  /** Disconnects every node (call once the fade is over). */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const src of this.srcs) {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    }
    for (const n of this.nodes) {
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.nodes.length = 0;
    this.srcs.length = 0;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }
}

/** Owns the current song + fading songs and the lookahead timer of a live context. */
export class MusicManager {
  current: SongPlayer | null = null;
  readonly fading: SongPlayer[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private paused = false;
  started = 0;

  constructor(private g: Graph, private ctx: AudioContext) {}

  /** Switches to `track` (cross-fade), keeps playing if it is already current, null fades out. */
  play(track: MusicTrack | null): void {
    const now = this.ctx.currentTime;
    if (track !== null && this.current && this.current.track === track) return;
    const prev = this.current;
    if (prev) {
      prev.fadeOut(now, FADE);
      this.fading.push(prev);
      this.current = null;
    }
    if (track !== null) {
      const song = getSong(track);
      const fadeIn = track === 'victory' ? 0.02 : prev ? FADE : 0.25;
      // Scheduling starts on the next timer tick, once the caller (often a scene's create())
      // has released the main thread.
      this.current = new SongPlayer(this.g, track, song, now + 0.03, fadeIn);
      this.started++;
    }
    this.ensureTimer();
  }

  /** Stops the timer (context suspended / app in background). */
  pause(): void {
    this.paused = true;
    this.clearTimer();
  }

  /** Restarts the timer after pause(). */
  unpause(): void {
    this.paused = false;
    this.ensureTimer();
  }

  /** One scheduler pass (also called by the timer). */
  tick(): void {
    const ctx = this.ctx;
    if (ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const horizon = now + LOOKAHEAD;
    this.current?.scheduleUntil(horizon, now);
    for (let i = this.fading.length - 1; i >= 0; i--) {
      const p = this.fading[i];
      if (now > p.stopAt + 0.1) {
        p.dispose();
        this.fading.splice(i, 1);
      } else {
        p.scheduleUntil(horizon, now);
      }
    }
    if (!this.current && this.fading.length === 0) this.clearTimer();
  }

  /** Disposes everything (context closed). */
  destroy(): void {
    this.clearTimer();
    this.current?.dispose();
    for (const p of this.fading) p.dispose();
    this.current = null;
    this.fading.length = 0;
  }

  private ensureTimer(): void {
    if (this.timer !== null || this.paused) return;
    if (!this.current && this.fading.length === 0) return;
    this.timer = setInterval(() => {
      try {
        this.tick();
      } catch {
        /* never let the scheduler throw into the page */
      }
    }, TICK_MS);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
