// =====================================================================================
//  GAME SCENE — orchestrates one mission: builds the World and its systems (background,
//  FX, pickups, enemy bullets, enemies, boss, ship, arsenal, collisions, director, flow),
//  feeds the HUD, runs the fixed-ish simulation steps (sub-stepped, hit-stop, slow-motion,
//  DEBUG.speed), handles pause / abort / app background and leaves to LevelEnd / GameOver
//  with a LevelResult. Never writes the save. Once the outcome is decided (boss dying or
//  down, stage clear, ship destroyed) pause requests are ignored and an abort cannot change
//  the result: the flow finishes the mission (LevelEnd, or GameOver "SHIP DESTROYED").
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, DEPTH, H, PLAY_W, SCENES, W } from '../config';
import { DEBUG, markSceneReady, setHookState } from '../debug';
import { FONT } from '../art/keys';
import { mulberry32 } from '../art/noise';
import type { BossDef, EnemyDef, GeneratorDef, HullDef, LevelDef, LevelResult, Loadout, SfxKey, ShieldDef } from '../types';
import {
  GENERATORS, HULLS, LEVELS, SHIELDS, getBoss, getEnemy, getGenerator, getHull, getPlanet, getShield, getSidekick, getWeapon,
} from '../data';
import { getSave } from '../state/save';
import { difficultyScale } from '../state/progress';
import { audio } from '../audio';
import { haptic, type HapticKind } from '../platform/haptics';
import { addAppStateListener, isAppActive } from '../platform/device';
import { Controls, type ControlsState } from '../input/controls';
import { createHud, hudButtonAt } from '../ui/Hud';
import { ensureFonts } from '../ui/kit';
import { HUD_EVENTS, PAUSE_EVENTS, type GameStartData, type HudApi, type HudModel } from '../game/contracts';
import { createArsenal } from '../game/arsenal';
import type { Arsenal, ArsenalHost } from '../game/arsenal/api';
import { World, type DiffScale, type WorldServices } from '../game/world';
import { ensureWorldTextures } from '../game/tex';
import { Background } from '../game/background';
import { Fx } from '../game/fx';
import { Pickups } from '../game/pickups';
import { EnemyBullets } from '../game/enemyBullets';
import { Enemies } from '../game/enemies';
import { Boss } from '../game/boss';
import { Ship } from '../game/ship';
import { Collisions } from '../game/collisions';
import { Director } from '../game/director';
import { LevelFlow, type FlowHost } from '../game/flow';
import { BOT_FLAGS, Bot, publishRun } from '../game/bot';

/**
 * Largest simulation sub-step (ms) at low fps / DEBUG.speed. Shots cannot tunnel whatever the
 * step (collisions.ts sweeps each shot's segment relative to each target's motion); the cap
 * bounds the motion integrated per step (homing turns, enemy patterns, flow timers).
 */
const MAX_STEP_MS = 25;
/** Real-time clamp of one frame (tab switches, hitches). */
const MAX_FRAME_MS = 50;
const HAPTIC_GAP: Record<HapticKind, number> = { light: 90, medium: 140, heavy: 260 };

const FALLBACK_HULL: HullDef = { id: 'sparrow', name: 'Sparrow', cost: 0, armor: 20, speed: 150, hitRadius: 4, sidekickSlots: 1, desc: '' };
const FALLBACK_SHIELD: ShieldDef = { id: 'sh_veil', name: 'Veil', cost: 0, capacity: 10, regen: 1.5, energyPerPoint: 2, color: 'cyan', desc: '' };
const FALLBACK_GEN: GeneratorDef = { id: 'gen_cell', name: 'Cell', cost: 0, capacity: 50, output: 15, desc: '' };

/**
 * Where a steering drag may START: the whole screen (the HUD panel is a natural thumb rest)
 * EXCEPT the HUD's touch buttons, so tapping pause / rear never nudges the ship.
 */
class DragArea extends Phaser.Geom.Rectangle {
  override contains(x: number, y: number): boolean {
    return super.contains(x, y) && hudButtonAt(x, y) === null;
  }
}

/** Integer with thousands separators (38750 -> "38,750"), as in the menus. */
function fmtScore(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export class GameScene extends Phaser.Scene implements FlowHost {
  private level!: LevelDef;
  private w!: World;
  private bg!: Background;
  private ship!: Ship;
  private arsenal!: Arsenal;
  private collisions!: Collisions;
  private director!: Director;
  private flow!: LevelFlow;
  private hud!: HudApi;
  private controls!: Controls;
  private model!: HudModel;
  private bossDef: BossDef | null = null;
  private loadout!: Loadout;
  private fpsText: Phaser.GameObjects.BitmapText | null = null;
  /** Autopilot (?bot=1), null otherwise. */
  private bot: Bot | null = null;

  private speed = 1;
  private hitStopMs = 0;
  private slowMoMs = 0;
  private slowMoScale = 1;
  private realMs = 0;
  private startTime = 0;
  /** Camera shake state (real ms): start amplitude (px), duration, elapsed, wobble phases. */
  private shakeAmp = 0;
  private shakeDur = 0;
  private shakeT = 0;
  private shakePh1 = 0;
  private shakePh2 = 0;
  private readonly hapticLast: Record<HapticKind, number> = { light: -1e9, medium: -1e9, heavy: -1e9 };
  private energyFlashT = 0;
  private hookT = 0;
  private fpsT = 0;
  private finished = false;
  private paused = false;
  /** create() completed for the current run (fields persist across scene restarts). */
  private running = false;
  private unsubAppState: (() => void) | null = null;
  /** game.loop.frame when the app last went to background (resume race, see onResume()). */
  private inactiveFrame = -1;
  private readonly warned = new Set<string>();
  private readonly target = { x: 0, y: 0 };
  private readonly bossTarget = { x: 0, y: 0 };
  private idleControls: ControlsState = {
    moveX: 0, moveY: 0, dragDX: 0, dragDY: 0, touching: false, firing: false, rearTogglePressed: false, pausePressed: false,
  };

  constructor() {
    super(SCENES.Game);
  }

  create(data: GameStartData): void {
    this.resetRunState();
    this.cameras.main.setBackgroundColor(COLORS.bg);
    ensureWorldTextures(this);
    ensureFonts(this);
    const level = this.resolveLevel(data?.levelId);
    if (!level) {
      this.add.bitmapText(W / 2, H / 2, FONT.m, 'NO LEVEL DATA').setOrigin(0.5).setTint(COLORS.bad);
      markSceneReady(SCENES.Game, { levelTime: 0, done: true });
      return;
    }
    this.level = level;
    const save = getSave();
    const settings = save.settings;
    const ds = difficultyScale();
    // DifficultyScale has no damage multiplier: enemy damage follows the hp ("toughness") factor.
    const diff: DiffScale = { hp: ds.hp, bulletSpeed: ds.bulletSpeed, fireRate: ds.fireRate, credits: ds.credits, damage: ds.hp };
    const seed = DEBUG.seed ?? level.seed;
    const startT = DEBUG.t !== null ? Math.max(0, DEBUG.t) : 0;
    this.speed = DEBUG.speed !== null && DEBUG.speed > 0 ? DEBUG.speed : 1;

    const services: WorldServices = {
      sfx: (k) => this.sfx(k),
      haptic: (k) => this.vibrate(k),
      hitStop: (ms) => { this.hitStopMs = Math.max(this.hitStopMs, ms); },
      shake: (i, ms) => this.shake(i, ms),
      hudFlash: (k) => this.hud.flash(k),
      banner: (t, s, ms) => this.hud.showBanner(t, s, ms),
      slowMo: (scale, ms) => { this.slowMoScale = scale; this.slowMoMs = Math.max(this.slowMoMs, ms); },
    };
    const w = (this.w = new World(this, level, diff, settings, mulberry32(seed), mulberry32(seed ^ 0x9e3779b9), services, DEBUG.god));
    w.time = startT;
    this.startTime = startT;

    this.bg = new Background(this, level.biome, seed, startT * level.scrollSpeed);
    w.fx = new Fx(w);
    w.pickups = new Pickups(w);
    w.bullets = new EnemyBullets(w);
    w.enemies = new Enemies(w);
    w.boss = new Boss(w, (id) => this.enemyDef(id));

    this.loadout = { ...save.loadout };
    const hull = safe(() => getHull(this.loadout.hull), HULLS[0] ?? FALLBACK_HULL);
    const shield = safe(() => getShield(this.loadout.shield), SHIELDS[0] ?? FALLBACK_SHIELD);
    const gen = safe(() => getGenerator(this.loadout.generator), GENERATORS[0] ?? FALLBACK_GEN);
    this.ship = w.ship = new Ship(w, hull, shield, gen);
    if (startT > 0) this.ship.skipIntro();

    const host: ArsenalHost = {
      scene: this,
      shipX: () => this.ship.x,
      shipY: () => this.ship.y,
      canFire: () => this.ship.canFire && !w.ended,
      trySpendEnergy: (amount) => {
        if (this.ship.energy.trySpend(amount)) {
          w.metrics.volleys++;
          return true;
        }
        w.metrics.starved++;
        this.energyEmpty();
        return false;
      },
      nearestTarget: (x, y, maxDist) => this.nearestTarget(x, y, maxDist),
      sfx: (k) => this.sfx(k),
      bounds: { x: 0, y: 0, w: PLAY_W, h: H },
    };
    this.arsenal = w.arsenal = createArsenal(host, this.loadout, {
      shots: DEPTH.playerShots, sidekicks: DEPTH.player, shadows: w.shadows ? DEPTH.shadows : -1,
    });

    this.bot = BOT_FLAGS.enabled ? new Bot(w) : null;
    this.collisions = new Collisions(w);
    this.director = new Director(w, level, startT, (id) => this.enemyDef(id));
    this.bossDef = level.boss ? safe<BossDef | null>(() => getBoss(level.boss!), null) : null;
    if (level.boss && !this.bossDef) this.warnOnce(`boss:${level.boss}`, `[game] unknown boss "${level.boss}"`);
    this.flow = new LevelFlow(w, level, this.director, this.bossDef, this);

    this.hud = createHud(this);
    this.model = this.buildModel();
    this.controls = new Controls(this, {
      dragArea: new DragArea(0, 0, W, H),
      sensitivity: settings.touchSensitivity,
      autofire: settings.autofire,
    });

    this.events.on(HUD_EVENTS.pause, this.onHudPause, this);
    this.events.on(HUD_EVENTS.rearToggle, this.onRearToggle, this);
    this.events.on(PAUSE_EVENTS.abort, this.onAbort, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.unsubAppState = addAppStateListener((active) => {
      if (active) return;
      this.inactiveFrame = this.game.loop.frame;
      this.pauseGame();
    });

    if (DEBUG.fps || settings.showFps) {
      this.fpsText = this.add.bitmapText(4, 26, FONT.s, '').setDepth(DEPTH.overlay).setTint(COLORS.good).setScrollFactor(0);
    }

    audio.music(level.biome);
    if (startT < 1) {
      const planet = safe(() => getPlanet(level.planet).name, level.planet);
      this.hud.showBanner(level.name.toUpperCase(), `${planet.toUpperCase()}  ${level.index}`, 2200);
    }
    this.hud.update(this.model);
    this.running = true;
    markSceneReady(SCENES.Game, this.hookState());
  }

  // ------------------------------------------------------------------ setup helpers

  private resetRunState(): void {
    this.hitStopMs = 0;
    this.slowMoMs = 0;
    this.slowMoScale = 1;
    this.realMs = 0;
    this.shakeAmp = this.shakeDur = this.shakeT = 0;
    this.cameras.main.setScroll(0, 0);
    this.hapticLast.light = this.hapticLast.medium = this.hapticLast.heavy = -1e9;
    this.energyFlashT = 0;
    this.hookT = 0;
    this.fpsT = 0;
    this.finished = false;
    this.paused = false;
    this.running = false;
    this.inactiveFrame = -1;
    this.fpsText = null;
    this.bossDef = null;
    this.bot = null;
  }

  private resolveLevel(id: string | undefined): LevelDef | null {
    const found = LEVELS.find((l) => l.id === id);
    if (found) return found;
    if (id) this.warnOnce(`level:${id}`, `[game] unknown level "${id}", falling back to the first level`);
    return LEVELS[0] ?? null;
  }

  private warnOnce(key: string, msg: string): void {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    console.warn(msg);
  }

  private enemyDef(id: string): EnemyDef | null {
    try {
      return getEnemy(id);
    } catch {
      this.warnOnce(`enemy:${id}`, `[game] unknown enemy "${id}" skipped`);
      return null;
    }
  }

  private buildModel(): HudModel {
    const lo = this.loadout;
    const name = (fn: () => string, fb: string) => safe(fn, fb);
    const front = name(() => getWeapon(lo.front).name, lo.front);
    const rear = lo.rear ? name(() => getWeapon(lo.rear!).name, lo.rear) : null;
    const skL = lo.sidekickL ? name(() => getSidekick(lo.sidekickL!).name, lo.sidekickL) : null;
    const skR = lo.sidekickR ? name(() => getSidekick(lo.sidekickR!).name, lo.sidekickR) : null;
    const e = this.ship.energy;
    return {
      armor: e.armor, armorMax: e.armorMax, shield: e.shield, shieldMax: e.shieldMax, energy: e.energy, energyMax: e.energyMax,
      frontName: front, frontPower: this.arsenal.frontPower, rearName: rear, rearPower: this.arsenal.rearPower,
      rearMode: this.arsenal.rearMode, sidekickL: skL, sidekickR: skR, levelName: this.level.name,
      score: 0, credits: 0, progress: 0, bossHp: null, bossName: null,
    };
  }

  // ------------------------------------------------------------------ services

  private sfx(key: SfxKey): void {
    audio.sfx(key);
  }

  private vibrate(kind: HapticKind): void {
    if (this.realMs - this.hapticLast[kind] < HAPTIC_GAP[kind]) return;
    this.hapticLast[kind] = this.realMs;
    haptic(kind);
  }

  /**
   * Camera shake: a smooth two-frequency wobble (~9 / 22 Hz) whose amplitude decays
   * quadratically over `ms` of real time. intensity = fraction of the screen width, as with
   * Phaser's camera.shake (0.002 tiny .. 0.014 huge); horizontal swing is 70 % of the
   * vertical one. Applied as camera SCROLL, so scrollFactor-0 objects (the HUD) never move.
   * A weaker request never cuts a stronger shake short.
   */
  private shake(intensity: number, ms: number): void {
    if (!this.w.settings.shake || ms <= 0) return;
    const amp = intensity * W;
    if (amp <= this.shakeNow()) return;
    this.shakeAmp = amp;
    this.shakeDur = ms;
    this.shakeT = 0;
    this.shakePh1 = this.w.fxRng() * Math.PI * 2;
    this.shakePh2 = this.w.fxRng() * Math.PI * 2;
  }

  /** Current shake amplitude (px). */
  private shakeNow(): number {
    if (this.shakeT >= this.shakeDur) return 0;
    const k = 1 - this.shakeT / this.shakeDur;
    return this.shakeAmp * k * k;
  }

  private updateShake(realMs: number): void {
    if (this.shakeAmp <= 0) return;
    this.shakeT += realMs;
    const a = this.shakeNow();
    const cam = this.cameras.main;
    if (a < 0.3) {
      this.shakeAmp = 0;
      cam.setScroll(0, 0);
      return;
    }
    const t = this.shakeT, p1 = this.shakePh1, p2 = this.shakePh2;
    const ox = (Math.sin(t * 0.061 + p1) * 0.65 + Math.sin(t * 0.137 + p2) * 0.35) * a * 0.7;
    const oy = (Math.sin(t * 0.053 + p2) * 0.6 + Math.sin(t * 0.149 + p1) * 0.4) * a;
    cam.setScroll(Math.round(ox), Math.round(oy));
  }

  private energyEmpty(): void {
    if (this.energyFlashT > 0) return;
    this.energyFlashT = 0.6;
    this.hud.flash('energy');
  }

  /** ArsenalHost.nearestTarget: nearest enemy or boss target point (reused object). */
  private nearestTarget(x: number, y: number, maxDist: number): Readonly<{ x: number; y: number }> | null {
    const w = this.w;
    const e = w.enemies.nearest(x, y, maxDist);
    let best = maxDist;
    if (e) {
      this.target.x = e.x;
      this.target.y = e.y;
      best = Math.hypot(e.x - x, e.y - y);
    }
    if (w.boss.active) {
      const d = w.boss.nearestPoint(x, y, best, this.bossTarget);
      if (d < best) {
        this.target.x = this.bossTarget.x;
        this.target.y = this.bossTarget.y;
        return this.target;
      }
    }
    return e ? this.target : null;
  }

  // ------------------------------------------------------------------ input events

  private onHudPause(): void {
    this.pauseGame();
  }

  /** Rear-gun mode toggle (HUD button, X / Shift, gamepad B / X): ignored without a rear gun. */
  private onRearToggle(): void {
    if (this.finished || !this.ship.alive || !this.loadout.rear) return;
    this.arsenal.toggleRearMode();
    this.sfx('rear_toggle');
  }

  /**
   * The mission's outcome is decided: won (the boss is dying or down, stage clear and fly-out)
   * or lost (the ship is destroyed). w.ended covers the stage clear and the death phases.
   */
  private get outcomeDecided(): boolean {
    const w = this.w;
    return w.ended || w.boss.defeated || w.boss.state === 'dying' || !this.ship.alive;
  }

  /**
   * Opens the pause menu. Ignored once the outcome is decided, so a won mission can never be
   * aborted (the Controls back handler still consumes Android back: the app stays open).
   */
  private pauseGame(): void {
    if (this.paused || this.finished || !this.scene.isActive() || this.outcomeDecided) return;
    this.paused = true;
    audio.sfx('ui_select');
    this.scene.pause();
    this.scene.launch(SCENES.Pause, { levelId: this.level.id });
  }

  private onResume(): void {
    this.paused = false;
    // settings may have changed in the pause menu (shake is read live from the save)
    const st = getSave().settings;
    this.controls.configure({ sensitivity: st.touchSensitivity, autofire: st.autofire });
    // RESUME is queued to the next frame: if the app went to background meanwhile (or still
    // is), this resume must not leave the mission running unpaused -> pause again.
    if (!isAppActive() || this.inactiveFrame >= this.game.loop.frame) {
      this.pauseGame();
      return;
    }
    markSceneReady(SCENES.Game, this.hookState());
  }

  /**
   * Pause menu ABORT. Once the outcome is decided the abort cannot change it: the game resumes
   * and the flow ends the mission itself (victory -> LevelEnd with every reward; ship
   * destroyed -> GameOver "SHIP DESTROYED", not "aborted").
   */
  private onAbort(): void {
    if (this.finished) return;
    this.scene.resume();
    this.paused = false;
    if (this.outcomeDecided) return;
    this.finish(false, true);
  }

  // ------------------------------------------------------------------ FlowHost

  startBoss(def: BossDef): void {
    const w = this.w;
    this.hud.showBanner('WARNING', def.name.toUpperCase(), 2800);
    this.sfx('boss_alarm');
    audio.music('boss');
    w.metrics.bossStartT = w.time;
    w.boss.start(def);
  }

  stageClear(): void {
    const w = this.w;
    w.bullets.clearAll(true);
    w.enemies.clearForStageEnd(); // leftovers blow up unrewarded; a live mid-boss retreats instead
    w.pickups.magnetAll();
    this.arsenal.clearShots();
    this.hud.showBanner('ALL CLEAR', `${fmtScore(w.stats.score)} PTS`, 2600);
    this.sfx('level_clear');
    audio.music('victory');
  }

  /** Leave the mission. aborted = quit from the pause menu (GameOver shows "MISSION ABORTED"). */
  finish(completed: boolean, aborted = false): void {
    if (this.finished) return;
    this.finished = true;
    this.w.ended = true;
    const result: LevelResult & { aborted?: boolean } = this.result(completed);
    if (aborted) result.aborted = true;
    const st = this.hookState();
    st.done = true;
    st.completed = completed;
    st.aborted = aborted;
    setHookState(st);
    publishRun(st);
    this.scene.start(completed ? SCENES.LevelEnd : SCENES.GameOver, result);
  }

  private result(completed: boolean): LevelResult {
    const s = this.w.stats;
    return {
      levelId: this.level.id,
      completed,
      kills: s.kills,
      spawned: s.spawned,
      creditsEarned: Math.round(s.credits),
      score: s.score,
      intelFound: s.intelFound.slice(),
      timeSeconds: Math.max(0, Math.round(this.w.time - this.startTime)),
      bossDefeated: this.w.boss.defeated,
    };
  }

  // ------------------------------------------------------------------ main loop

  override update(_time: number, delta: number): void {
    // paused: the scene pause is queued to the next frame, so skip the rest of this one too
    if (!this.running || this.finished || this.paused) return;
    const real = Math.min(delta, MAX_FRAME_MS);
    this.realMs += real;
    const c = this.controls.update();
    if (c.pausePressed) {
      this.pauseGame();
      return;
    }
    if (c.rearTogglePressed) this.onRearToggle();
    if (this.energyFlashT > 0) this.energyFlashT -= real / 1000;

    let scale = this.speed;
    if (this.slowMoMs > 0) {
      this.slowMoMs -= real;
      scale *= this.slowMoScale;
    }
    if (this.hitStopMs > 0) {
      this.hitStopMs -= real;
      scale = 0;
    }
    const dtMs = real * scale;
    if (this.bot) this.bot.drive(c, dtMs / 1000);
    if (dtMs > 0) {
      const w = this.w;
      this.ship.update(dtMs / 1000, this.ship.controllable ? c : this.idleControls);
      this.bg.update(dtMs / 1000, w.scrollSpeed);
      const steps = Math.max(1, Math.ceil(dtMs / MAX_STEP_MS));
      const stepMs = dtMs / steps;
      for (let i = 0; i < steps && !this.finished; i++) this.step(stepMs, c.firing);
      if (!this.finished) w.fx.update(dtMs);
    } else {
      // hit-stop: the finger keeps moving, the ship catches up when the simulation resumes
      this.ship.queueDrag(c.dragDX, c.dragDY);
    }
    if (this.finished) return;
    // terrain generation and the camera shake run on real time (also during hit-stop / slow-motion)
    this.bg.work(delta);
    this.updateShake(real);
    this.updateHud();
    this.hookT -= real;
    if (this.hookT <= 0) {
      this.hookT = 250;
      const st = this.hookState();
      setHookState(st);
      publishRun(st);
    }
    if (this.fpsText) {
      this.fpsT -= real;
      if (this.fpsT <= 0) {
        this.fpsT = 500;
        this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} FPS`);
      }
    }
  }

  /** One simulation sub-step. */
  private step(ms: number, firing: boolean): void {
    const w = this.w;
    const dt = ms / 1000;
    w.time += dt;
    if (this.ship.alive) this.ship.updateEnergy(dt);
    if (this.flow.spawning) this.director.update();
    this.arsenal.update(ms, firing);
    w.enemies.update(dt);
    w.boss.update(dt);
    w.bullets.update(dt);
    w.pickups.update(dt);
    this.collisions.update(dt);
    this.flow.update(dt);
  }

  private updateHud(): void {
    const m = this.model;
    const w = this.w;
    const e = this.ship.energy;
    m.armor = e.armor;
    m.shield = e.shield;
    m.energy = e.energy;
    m.frontPower = this.arsenal.frontPower;
    m.rearPower = this.arsenal.rearPower;
    m.rearMode = this.arsenal.rearMode;
    m.score = w.stats.score;
    m.credits = Math.round(w.stats.credits);
    m.progress = this.flow.progress;
    const boss = w.boss;
    const mid = w.enemies.midboss;
    if (boss.active || (boss.defeated && this.flow.phase === 'bossDown')) {
      m.bossHp = boss.hpFrac;
      m.bossName = boss.name;
    } else if (mid && mid.active) {
      m.bossHp = Math.max(0, mid.hp / mid.maxHp);
      m.bossName = mid.def.name;
    } else {
      m.bossHp = null;
      m.bossName = null;
    }
    this.hud.update(m);
  }

  private hookState(): Record<string, unknown> {
    const w = this.w;
    const m = w?.metrics;
    const since = (t0: number, t1: number): number | null => (t0 >= 0 && t1 >= 0 ? Math.round((t1 - t0) * 100) / 100 : null);
    const r1 = (v: number): number => Math.round(v * 10) / 10;
    return {
      levelId: this.level?.id,
      levelTime: w ? Math.round(w.time * 100) / 100 : 0,
      phase: this.flow?.phase,
      bossActive: w ? w.boss.active : false,
      bossHp: w && w.boss.active ? Math.round(w.boss.hpFrac * 1000) / 1000 : null,
      enemies: w ? w.enemies.count : 0,
      enemyBullets: w ? w.bullets.count : 0,
      playerShots: this.arsenal ? this.arsenal.shotCount : 0,
      playerArmor: this.ship ? Math.round(this.ship.energy.armor * 10) / 10 : 0,
      score: w ? w.stats.score : 0,
      credits: w ? Math.round(w.stats.credits) : 0,
      kills: w ? w.stats.kills : 0,
      fps: Math.round(this.game.loop.actualFps),
      done: this.finished,
      bot: !!this.bot,
      botMode: this.bot ? `${this.bot.mode} ${Math.round(this.bot.goalX)}` : null,
      spawned: w ? w.stats.spawned : 0,
      killRatio: w && w.stats.spawned > 0 ? Math.round((w.stats.kills / w.stats.spawned) * 1000) / 1000 : 0,
      creditsEarned: w ? Math.round(w.stats.credits) : 0,
      damageTaken: m ? r1(m.damageTaken) : 0,
      armorDamage: m ? r1(m.armorDamage) : 0,
      hitsTaken: m ? m.hitsTaken : 0,
      wouldDie: m ? m.wouldDie : 0,
      firstDeathT: m && m.firstDeathT >= 0 ? r1(m.firstDeathT) : null,
      bossTime: m ? since(m.bossStartT, w.time) : null,
      bossKillTime: m ? since(m.bossStartT, m.bossKillT) : null,
      midbossKillTime: m ? since(m.midbossStartT, m.midbossKillT) : null,
      midbossEscaped: m ? m.midbossEscaped : false,
      volleys: m ? m.volleys : 0,
      starved: m ? m.starved : 0,
      shotHits: m ? m.shotHits : 0,
      damageDealt: m ? Math.round(m.damageDealt) : 0,
      pickups: m ? m.pickups : 0,
      creditsMissed: m ? Math.round(m.creditsMissed) : 0,
      shipArmor: this.ship ? r1(this.ship.energy.armor) : 0,
      shipShield: this.ship ? r1(this.ship.energy.shield) : 0,
      terrainInitMs: this.bg ? this.bg.stats.initMs : 0,
      terrainMaxFrameMs: this.bg ? this.bg.stats.maxFrameMs : 0,
      terrainChunks: this.bg ? this.bg.stats.chunks : 0,
      terrainSync: this.bg ? this.bg.stats.sync : 0,
      terrainStepMs: this.bg ? r1(this.bg.stats.maxStepMs) : 0,
      terrainCopyMs: this.bg ? r1(this.bg.stats.maxCopyMs) : 0,
      terrainUploadMs: this.bg ? r1(this.bg.stats.maxUploadMs) : 0,
    };
  }

  private cleanup(): void {
    this.running = false;
    this.events.off(HUD_EVENTS.pause, this.onHudPause, this);
    this.events.off(HUD_EVENTS.rearToggle, this.onRearToggle, this);
    this.events.off(PAUSE_EVENTS.abort, this.onAbort, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.unsubAppState?.();
    this.unsubAppState = null;
    this.controls?.destroy();
    this.hud?.destroy();
    this.arsenal?.destroy();
    this.bg?.destroy();
    this.w?.boss.destroy();
    this.ship?.destroy();
  }
}
