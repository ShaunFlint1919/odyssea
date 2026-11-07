// =====================================================================================
//  AUTOPILOT BOT — `?bot=1` flies the ship like a decent player, through the SAME input
//  channel as a human: it overwrites the polled ControlsState with relative drag deltas
//  (a finger capped at `botSpeed` x the hull speed; the Ship still applies its own caps,
//  bounds and intro / death rules) and holds fire. It never teleports, never toggles the
//  rear mode, never pauses. Debug / balance tool only (zero cost when the flag is off).
//
//  URL flags (read here from location.search: src/debug.ts is a frozen contract):
//    bot=1          enable the autopilot (combine with god=1 / speed=3 / t=40 / level=...)
//    botSpeed=1.25  finger speed as a multiple of the hull speed (the Ship caps drag at 1.6x)
//    botReact=48    dodge perception radius (px): bullets / rammers farther away are ignored
//
//  Behaviour (every frame, allocation-free):
//    - home in the lower third (y = 82 % of H), dodging allowed between 62 % of H and the
//      bottom edge;
//    - horizontal goal = best target: boss weak point (pulsing core, else body centre),
//      mid-boss, else the most threatening enemy above the ship (shooters / divers / close
//      ones first, lead-aimed for the bolt travel time, with hysteresis);
//    - credit gems / drops within ~120 px pull the goal when nothing is shooting close by;
//    - dodge = 35 candidate velocities (16 directions x 2 speeds, stop, exact seek) simulated
//      0.3 s ahead against linearly extrapolated bullets and air enemies inside the
//      perception radius, telegraphed / firing laser columns and the boss body; the cheapest
//      candidate (danger + distance to the goal + a little smoothing) wins.
//
//  Metrics published by GameScene in window.__NC__.state (every 250 ms; times in seconds):
//    bot              true when the autopilot drives;  botMode  "<boss|mid|target|gem|idle> <goal x>"
//    damageTaken      raw damage of every hit that reached the ship (shield + armor), ALSO in
//                     god mode (a shadow shield/armor model replays the hits, incl. the 1 s
//                     post-hit invulnerability, so god runs report what a mortal run would take)
//    armorDamage      part of it that reached the armor;  hitsTaken  number of hits
//    wouldDie         god mode: times the ship would have died (shadow refills, keeps counting)
//    firstDeathT      level time of the first (would-be) death, null = none
//    bossTime         s since the boss entrance (null before), bossKillTime  entrance -> kill
//    midbossKillTime  spawn -> kill (null while alive / never), midbossEscaped  left alive
//    kills, spawned, killRatio   enemies destroyed by the player / spawned (incl. boss)
//    creditsEarned    credits collected this level (= state.credits)
//    volleys, starved weapon volleys fired / skipped for lack of energy
//    shotHits, damageDealt       projectile hits on enemies / boss / missiles and their damage
//    pickups          gems + drops collected;  creditsMissed  credits of gems that fell off screen
//    done / completed / aborted   set when the mission ends
//  The same object is mirrored in window.__NC_RUN__, which survives the switch to the
//  LevelEnd / GameOver scene (their markSceneReady() replaces window.__NC__.state).
//    (shotsFired / accuracy are not exposed: the Arsenal contract has no fired-shot counter.)
// =====================================================================================
import { H, PLAY_W } from '../config';
import type { ControlsState } from '../input/controls';
import type { World } from './world';

declare global {
  interface Window {
    /** Last published Game-scene metrics: survives the switch to LevelEnd / GameOver (whose
     *  markSceneReady() replaces window.__NC__.state). Set by GameScene via publishRun(). */
    __NC_RUN__?: Record<string, unknown>;
  }
}

/** Keep the latest run metrics in window.__NC_RUN__ (see the header). */
export function publishRun(state: Record<string, unknown>): void {
  if (typeof window !== 'undefined') window.__NC_RUN__ = state;
}

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

function numParam(key: string, fallback: number): number {
  const v = params.get(key);
  if (v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Autopilot URL flags. */
export const BOT_FLAGS = {
  enabled: (() => {
    const v = params.get('bot');
    return v !== null && v !== '0' && v !== 'false';
  })(),
  speed: Math.min(1.6, Math.max(0.3, numParam('botSpeed', 1.25))),
  react: Math.min(160, Math.max(16, numParam('botReact', 48))),
} as const;

const HOME_Y = 0.82;
const MIN_Y = 0.62;
const BOTTOM_PAD = 20;
/** Assumed player bolt speed for lead aiming (px/s). */
const BOLT_SPEED = 520;
/** Simulated look-ahead times (s) and their danger weights (earlier = more urgent). */
const STEPS = [0.05, 0.1, 0.16, 0.23, 0.3];
const STEP_W = [1.7, 1.45, 1.2, 1.0, 0.8];
/** Goal distance is measured where the candidate would be after this time. */
const GOAL_T = 0.1;
const DIRS = 16;
const MAX_THREATS = 160;
/** Clearance (px) the bot wants beyond the touching distance. */
const CLEAR = 5;
const DANGER = 320;
const HIT = 1600;
const LASER_FIRE = 1800;
const LASER_WARN = 700;
const BOSS_BODY = 1400;
const GEM_R = 120;
const MAGNET_EASY = 50;
const TARGET_HYSTERESIS = 28;

export class Bot {
  private readonly speed: number;
  private readonly react: number;
  // candidate velocities
  private readonly cvx = new Float32Array(DIRS * 2 + 3);
  private readonly cvy = new Float32Array(DIRS * 2 + 3);
  // threats gathered this frame
  private readonly tx = new Float32Array(MAX_THREATS);
  private readonly ty = new Float32Array(MAX_THREATS);
  private readonly tvx = new Float32Array(MAX_THREATS);
  private readonly tvy = new Float32Array(MAX_THREATS);
  private readonly tr = new Float32Array(MAX_THREATS);
  private nThreats = 0;
  private pvx = 0;
  private pvy = 0;
  private targetSerial = -1;
  private readonly aim = { x: 0, y: 0 };
  /** Current goal (px) and what it is: boss | mid | target | gem | idle (debug / hook state). */
  goalX = PLAY_W / 2;
  goalY = H * HOME_Y;
  mode = 'idle';

  constructor(private readonly w: World) {
    this.speed = w.ship.hull.speed * BOT_FLAGS.speed;
    this.react = BOT_FLAGS.react;
  }

  /**
   * Overwrite the polled controls for this frame. dt = simulated seconds the ship will be
   * advanced by this frame (0 during hit-stop: the finger then rests).
   */
  drive(c: ControlsState, dt: number): void {
    c.firing = true;
    c.moveX = 0;
    c.moveY = 0;
    c.dragDX = 0;
    c.dragDY = 0;
    c.touching = true;
    const ship = this.w.ship;
    if (dt <= 0 || !ship.alive || !ship.controllable) return;
    this.chooseGoal();
    this.gatherThreats();
    this.pick(dt);
    c.dragDX = this.pvx * dt;
    c.dragDY = this.pvy * dt;
  }

  // ---------------------------------------------------------------- goal

  private chooseGoal(): void {
    const w = this.w;
    const ship = w.ship;
    const sx = ship.x, sy = ship.y;
    let gx = this.goalX;
    const gy = H * HOME_Y;
    let found = false;
    this.mode = 'idle';
    if (w.boss.active && w.boss.aimPoint(this.aim)) {
      gx = this.aim.x;
      found = true;
      this.mode = 'boss';
    } else {
      const mid = w.enemies.midboss;
      if (mid && mid.active && mid.entered) {
        gx = mid.x + mid.vx * Math.max(0, (sy - mid.y) / BOLT_SPEED);
        found = true;
        this.mode = 'mid';
      } else {
        // most threatening enemy above the ship (lower cost = better), with hysteresis
        const list = w.enemies.list;
        let best = Infinity, bestX = 0, bestSerial = -1, curCost = Infinity, curX = 0;
        for (let k = 0; k < list.length; k++) {
          const e = list[k];
          if (!w.enemies.hittable(e) || e.y > sy - 26 || e.y < 4) continue;
          const lead = (sy - e.y) / BOLT_SPEED;
          const ex = e.x + e.vx * lead;
          // units hugging the side edges cannot be lined up (and pull the ship into a corner)
          const edge = Math.min(ex, PLAY_W - ex);
          if (edge < 14) continue;
          let cost = Math.abs(ex - sx) + (sy - e.y) * 0.3 + Math.max(0, 40 - edge) * 1.2;
          if (e.fire !== 'none') cost -= 45;
          if (e.move === 'dive' || e.move === 'chase') cost -= 30;
          if (e.layer !== 'air') cost += 15;
          if (e.hp > 120) cost += 25;
          if (cost < best) {
            best = cost;
            bestX = ex;
            bestSerial = e.serial;
          }
          if (e.serial === this.targetSerial) {
            curCost = cost;
            curX = ex;
          }
        }
        if (bestSerial >= 0) {
          if (curCost < Infinity && curCost <= best + TARGET_HYSTERESIS) {
            gx = curX;
          } else {
            gx = bestX;
            this.targetSerial = bestSerial;
          }
          found = true;
          this.mode = 'target';
        }
      }
    }
    if (!found) gx += (PLAY_W / 2 - gx) * 0.01;
    // gems / drops nearby (only when nothing dangerous is close)
    let gemX = 0, gemY = 0, gemD = GEM_R;
    const pk = w.pickups.liveView;
    for (let k = 0; k < pk.length; k++) {
      const p = pk[k];
      if (p.magnet || p.y < sy - 150 || p.y > H - 6) continue;
      const d = Math.hypot(p.x - sx, p.y - sy) * (p.kind === 0 ? 1 : 0.6);
      if (d < gemD) {
        gemD = d;
        gemX = p.x;
        gemY = p.y;
      }
    }
    this.goalX = gx;
    this.goalY = gy;
    if (gemD < GEM_R && gemD > MAGNET_EASY && !this.dangerClose(sx, sy, 56)) {
      this.goalX = gemX;
      this.goalY = Math.min(H - BOTTOM_PAD, Math.max(H * MIN_Y, gemY + 24));
      this.mode = 'gem';
    }
  }

  /** Any bullet within r px of (x, y)? */
  private dangerClose(x: number, y: number, r: number): boolean {
    const b = this.w.bullets;
    const r2 = r * r;
    for (let k = 0; k < b.count; k++) {
      const i = b.activeAt(k);
      const dx = b.x[i] - x, dy = b.y[i] - y;
      if (dx * dx + dy * dy < r2) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- threats

  private push(x: number, y: number, vx: number, vy: number, r: number): void {
    if (this.nThreats >= MAX_THREATS) return;
    const n = this.nThreats++;
    this.tx[n] = x;
    this.ty[n] = y;
    this.tvx[n] = vx;
    this.tvy[n] = vy;
    this.tr[n] = r;
  }

  private gatherThreats(): void {
    const w = this.w;
    const ship = w.ship;
    const sx = ship.x, sy = ship.y;
    const R = this.react;
    const R2 = R * R;
    this.nThreats = 0;
    const b = w.bullets;
    for (let k = 0; k < b.count; k++) {
      const i = b.activeAt(k);
      const dx = b.x[i] - sx, dy = b.y[i] - sy;
      if (dx * dx + dy * dy < R2) this.push(b.x[i], b.y[i], b.vx[i], b.vy[i], b.rad[i]);
    }
    const list = w.enemies.list;
    for (let k = 0; k < list.length; k++) {
      const e = list[k];
      if (e.layer !== 'air' || !e.entered) continue;
      const rr = R + e.radius;
      const dx = e.x - sx, dy = e.y - sy;
      if (dx * dx + dy * dy < rr * rr) this.push(e.x, e.y, e.vx, e.vy, e.radius * 0.85);
    }
  }

  // ---------------------------------------------------------------- decision

  private pick(dt: number): void {
    const w = this.w;
    const ship = w.ship;
    const sx = ship.x, sy = ship.y;
    const vmax = this.speed;
    // candidates: 16 directions x (full, 45 %), stop, exact seek, half seek
    let n = 0;
    for (let d = 0; d < DIRS; d++) {
      const a = (d / DIRS) * Math.PI * 2;
      this.cvx[n] = Math.cos(a) * vmax;
      this.cvy[n++] = Math.sin(a) * vmax;
      this.cvx[n] = Math.cos(a) * vmax * 0.45;
      this.cvy[n++] = Math.sin(a) * vmax * 0.45;
    }
    this.cvx[n] = 0;
    this.cvy[n++] = 0;
    const gdx = this.goalX - sx, gdy = this.goalY - sy;
    const gd = Math.hypot(gdx, gdy);
    if (gd > 0.5) {
      const s = Math.min(vmax, gd / Math.max(GOAL_T, dt));
      this.cvx[n] = (gdx / gd) * s;
      this.cvy[n++] = (gdy / gd) * s;
      this.cvx[n] = (gdx / gd) * s * 0.5;
      this.cvy[n++] = (gdy / gd) * s * 0.5;
    }
    const xMin = ship.halfW, xMax = PLAY_W - ship.halfW;
    const yMin = H * MIN_Y, yMax = H - BOTTOM_PAD;
    const sr = ship.hitRadius;
    const boss = w.boss;
    const bossOn = boss.active;
    const bx0 = boss.x - boss.bw * 0.42, bx1 = boss.x + boss.bw * 0.42;
    const by1 = boss.y + boss.bh * 0.42;
    const lasers = w.bullets.laserViews;
    let best = Infinity, bvx = 0, bvy = 0;
    for (let c = 0; c < n; c++) {
      const vx = this.cvx[c], vy = this.cvy[c];
      let cost = 0;
      for (let s = 0; s < STEPS.length; s++) {
        const t = STEPS[s];
        const px = clampN(sx + vx * t, xMin, xMax);
        const py = clampN(sy + vy * t, Math.min(yMin, sy), yMax);
        const wt = STEP_W[s];
        for (let k = 0; k < this.nThreats; k++) {
          const dx = px - (this.tx[k] + this.tvx[k] * t);
          const dy = py - (this.ty[k] + this.tvy[k] * t);
          const touch = this.tr[k] + sr;
          const rr = touch + CLEAR;
          const d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr) continue;
          const d = Math.sqrt(d2);
          cost += (DANGER * (rr - d) / rr + (d < touch ? HIT : 0)) * wt;
        }
        for (let k = 0; k < lasers.length; k++) {
          const l = lasers[k];
          if (!l.active || l.state > 1 || py < l.y0 - 4) continue;
          const half = l.width * 0.5 + sr + 4;
          if (Math.abs(px - l.x) >= half) continue;
          cost += (l.state === 1 || l.warn - l.t < t + 0.12 ? LASER_FIRE : LASER_WARN) * wt;
        }
        if (bossOn && px > bx0 && px < bx1 && py < by1 + sr + 6) cost += BOSS_BODY * wt;
      }
      const ex = clampN(sx + vx * GOAL_T, xMin, xMax) - this.goalX;
      const ey = clampN(sy + vy * GOAL_T, Math.min(yMin, sy), yMax) - this.goalY;
      cost += Math.sqrt(ex * ex + ey * ey * 0.5);
      const ddx = vx - this.pvx, ddy = vy - this.pvy;
      cost += Math.sqrt(ddx * ddx + ddy * ddy) * 0.01;
      if (cost < best) {
        best = cost;
        bvx = vx;
        bvy = vy;
      }
    }
    this.pvx = bvx;
    this.pvy = bvy;
  }
}

function clampN(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
