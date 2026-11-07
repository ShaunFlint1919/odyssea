// =====================================================================================
//  BALANCE MODEL — the numbers docs/BALANCE.md reasons with, as code so tests can hold the
//  content to them: credit curve, level-clear bonus, hit factors, level statistics (pacing,
//  spawned hp, estimated credits). Pure functions, no Phaser. The reference player that
//  turns credits into a loadout and DPS lives in src/data/progression.ts.
// =====================================================================================
import type { BossDef, EnemyDef, LevelDef } from '../types';

/** Share of spawned enemies the economy assumes a player destroys. */
export const KILL_RATE = 0.7;
/** Kill-credit targets of the first and the last campaign level (geometric in between). */
export const CREDIT_CURVE = { first: 1500, last: 15000 };

/** Kill-credit target of the i-th campaign level (0-based, `n` levels in total). */
export function targetLevelCredits(i: number, n = 24): number {
  return CREDIT_CURVE.first * Math.pow(CREDIT_CURVE.last / CREDIT_CURVE.first, i / Math.max(1, n - 1));
}

/**
 * Level-clear bonus ("mission pay", granted on completion on top of the kill credits): a share
 * of the level's kill-credit target, bigger on boss levels. Replays of a completed level pay
 * REPLAY_BONUS_FACTOR of it (farming still pays the full kill credits).
 */
export const CLEAR_BONUS = { share: 0.2, bossShare: 0.35 };
export const REPLAY_BONUS_FACTOR = 0.25;

/** Clear bonus of the i-th campaign level (rounded to 10 credits). */
export function clearBonus(i: number, bossLevel: boolean, n = 24): number {
  const share = bossLevel ? CLEAR_BONUS.bossShare : CLEAR_BONUS.share;
  return Math.round((targetLevelCredits(i, n) * share) / 10) * 10;
}

/**
 * Share of a kit's nominal single-target DPS (progression.ts: weaponFireStats x the pattern's
 * single-target share) that lands on each planet boss while the autopilot dodges: missed
 * shots, shots eaten by destroyable parts and minions, the boss moves, plus the x1.5 weak-point
 * core. Measured with tools/playtest.mjs for the reference kit of each boss level
 * (docs/BALANCE.md §10, run B, re-measured after the swept-collision / single-splash fix):
 * the Kestrel on a core boss lands ~0.9-0.97, rocket and lance kits 0.76-0.91, the Kestrel on
 * the core-less Dreadnought only 0.56. DPS_UPTIME is the default.
 */
export const BOSS_UPTIME: Record<string, number> = {
  colossus: 0.97, hydra: 0.9, dreadnought: 0.56, hive: 0.69, forge: 0.76, cryo: 0.91, voidcarrier: 0.84, architect: 0.9,
};
export const DPS_UPTIME = 0.85;
/**
 * Same for the mid-bosses (by enemy id, full-level runs): the level's escorts and the fighters
 * carriers launch every 3.4 s soak part of the fire, and the bot dodges off their narrower
 * hitboxes (carriers 0.35-0.66). MIDBOSS_UPTIME is the default.
 */
export const MIDBOSS_UPTIME_BY_ID: Record<string, number> = {
  k_frigate: 0.8, v_carrier: 0.64, t_tidewall: 0.57, u_frigate: 0.42, c_carrier: 0.45, g_frigate: 0.83, r_carrier: 0.55, a_frigate: 0.86,
};
export const MIDBOSS_UPTIME = 0.75;
/** A human pilot lands about this share of what the autopilot lands (fights ~25 % longer). */
export const HUMAN_AIM = 0.8;

/** Energy drawn per second at power p relative to power 1 (gameplay: E(p) = 1 + 0.05 (p - 1)). */
export function energyFactor(power: number): number {
  return 1 + 0.05 * (Math.max(1, power) - 1);
}

export interface LevelStats {
  waves: number;
  /** wave start times clustered within 0.9 s = what the player perceives as one wave */
  beats: number;
  avgGap: number;
  maxGap: number;
  /** enemies spawned by waves (mirrored waves count twice) */
  spawned: number;
  spawnedHp: number;
  /** credits if every wave enemy is destroyed */
  creditsAll: number;
  /** KILL_RATE x wave credits + mid-boss + boss (always destroyed to finish) */
  estCredits: number;
  midbossHp: number;
  bossHp: number;
}

/** Pacing / economy statistics of a level. */
export function levelStats(
  level: LevelDef,
  enemy: (id: string) => EnemyDef | undefined,
  boss: (id: string) => BossDef | undefined,
): LevelStats {
  let spawned = 0, spawnedHp = 0, creditsAll = 0;
  for (const w of level.waves) {
    const e = enemy(w.enemy);
    if (!e) continue;
    const n = w.count * (w.mirror ? 2 : 1);
    spawned += n;
    spawnedHp += n * e.hp;
    creditsAll += n * e.credits;
  }
  const times = [...new Set(level.waves.map((w) => w.t))].sort((a, b) => a - b);
  const beatsT: number[] = [];
  for (const t of times) if (!beatsT.length || t - beatsT[beatsT.length - 1] > 0.9) beatsT.push(t);
  let maxGap = 0;
  for (let i = 1; i < beatsT.length; i++) maxGap = Math.max(maxGap, beatsT[i] - beatsT[i - 1]);
  const avgGap = beatsT.length > 1 ? (beatsT[beatsT.length - 1] - beatsT[0]) / (beatsT.length - 1) : 0;
  const mb = level.midboss ? enemy(level.midboss.enemy) : undefined;
  const bs = level.boss ? boss(level.boss) : undefined;
  return {
    waves: level.waves.length,
    beats: beatsT.length,
    avgGap,
    maxGap,
    spawned,
    spawnedHp,
    creditsAll,
    estCredits: Math.round(creditsAll * KILL_RATE + (mb?.credits ?? 0) + (bs?.credits ?? 0)),
    midbossHp: mb?.hp ?? 0,
    bossHp: bs?.hp ?? 0,
  };
}
