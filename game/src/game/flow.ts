// =====================================================================================
//  LEVEL FLOW — the mission state machine:
//    waves  -> (duration reached) -> clearing (screen clear or 4 s) -> warning + boss
//           -> boss defeated -> stage clear -> fly-out -> LevelEnd
//    waves  -> (no boss: last wave gone, or 6 s after duration) -> stage clear
//    any    -> ship destroyed -> GameOver after ~1.5 s
//  The host (GameScene) performs the side effects (music, banners, scene changes).
// =====================================================================================
import type { BossDef, LevelDef } from '../types';
import type { Director } from './director';
import type { World } from './world';

export type FlowPhase = 'waves' | 'clearing' | 'boss' | 'bossDown' | 'clear' | 'dead' | 'done';

export interface FlowHost {
  /** WARNING banner + alarm + boss music + boss entrance. */
  startBoss(def: BossDef): void;
  /** ALL CLEAR banner, music, gem magnet. */
  stageClear(): void;
  /** Leave the mission (completed = LevelEnd, else GameOver). */
  finish(completed: boolean): void;
}

const CLEAR_WAIT = 4;
const NO_BOSS_GRACE = 6;
const BOSS_DOWN_DELAY = 1.6;
const FLYOUT_DELAY = 1.7;
const DEATH_DELAY = 1.5;

export class LevelFlow {
  phase: FlowPhase = 'waves';
  private t = 0;

  constructor(
    private readonly w: World,
    private readonly level: LevelDef,
    private readonly director: Director,
    private readonly bossDef: BossDef | null,
    private readonly host: FlowHost,
  ) {
    // DEBUG.t at / past the duration: straight to the boss.
    if (w.time >= level.duration && bossDef) this.set('clearing');
  }

  /** Waves are still being spawned. */
  get spawning(): boolean {
    return this.phase === 'waves' || this.phase === 'clearing';
  }

  /** 0..1 progress through the level (1 from the boss onward). */
  get progress(): number {
    if (this.phase !== 'waves' && this.phase !== 'dead') return 1;
    return Math.min(1, this.w.time / Math.max(1, this.level.duration));
  }

  private set(p: FlowPhase): void {
    this.phase = p;
    this.t = 0;
  }

  update(dt: number): void {
    const w = this.w;
    this.t += dt;
    if (this.phase !== 'dead' && this.phase !== 'done' && !w.ship.alive) {
      this.set('dead');
      w.ended = true;
    }
    switch (this.phase) {
      case 'waves': {
        const time = w.time;
        if (this.bossDef) {
          if (time >= this.level.duration) this.set('clearing');
        } else {
          const gone = this.director.done && w.enemies.count === 0;
          if ((gone && (time >= this.level.duration || time >= this.director.lastWaveT + 4)) || time >= this.level.duration + NO_BOSS_GRACE) {
            this.toClear();
          }
        }
        break;
      }
      case 'clearing':
        if (w.enemies.count === 0 || this.t >= CLEAR_WAIT) {
          this.set('boss');
          this.host.startBoss(this.bossDef!);
        }
        break;
      case 'boss':
        if (w.boss.defeated) this.set('bossDown');
        break;
      case 'bossDown':
        if (this.t >= BOSS_DOWN_DELAY) this.toClear();
        break;
      case 'clear':
        if (this.t >= FLYOUT_DELAY && w.ship.controllable) w.ship.startFlyOut();
        if (w.ship.gone || this.t >= FLYOUT_DELAY + 2.5) {
          this.set('done');
          this.host.finish(true);
        }
        break;
      case 'dead':
        if (this.t >= DEATH_DELAY && w.ship.deathDone) {
          this.set('done');
          this.host.finish(false);
        }
        break;
      case 'done':
        break;
    }
  }

  private toClear(): void {
    this.set('clear');
    this.w.ended = true;
    this.host.stageClear();
  }
}
