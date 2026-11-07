// Boss part sockets and built-in muzzles for every boss body (pure data, no Phaser import,
// safe to use from content / gameplay / node tests). Offsets in px from the CENTRE of the boss
// sprite (+x right, +y down = towards the player), matching BossPart.offset / BossAttack.from.
// The body art (src/art/b_boss_*.ts) draws a matching socket at every turret/cannon/pod/core
// entry, so parts placed there sit on a visible mount; empty sockets read as closed mounts.
import type { BossSprite } from './keys';
import type { BossMounts } from './b_boss_types';

/** boss_colossus sockets / muzzles. */
export const COLOSSUS_MOUNTS: BossMounts = {
  turret: [[-41, -1], [41, -1]],
  cannon: [],
  pod: [[-21, -40], [21, -40]],
  core: [[0, -33]],
  wing: [],
  muzzle: [[-7, 53], [7, 53]],
};

/** boss_hydra sockets / muzzles. */
export const HYDRA_MOUNTS: BossMounts = {
  turret: [[-38, -24], [38, -24]],
  cannon: [],
  pod: [[-15, -45], [15, -45]],
  core: [[0, -26]],
  wing: [],
  muzzle: [[-48, 23], [-26, 43], [0, 49], [26, 43], [48, 23]],
};

/** boss_dreadnought sockets / muzzles. */
export const DREADNOUGHT_MOUNTS: BossMounts = {
  turret: [[-26, -18], [26, -18], [-25, 14], [25, 14]],
  cannon: [[0, 20], [0, -42]],
  pod: [[-11, -56], [11, -56]],
  core: [[0, -22]],
  wing: [],
  muzzle: [[-5, 58], [0, 59], [5, 58]],
};

/** boss_hive sockets / muzzles. */
export const HIVE_MOUNTS: BossMounts = {
  turret: [[-19, 9], [19, 9]],
  cannon: [],
  pod: [[-21, -37], [21, -37]],
  core: [[0, -27]],
  wing: [],
  muzzle: [[0, 42], [-7, 30], [7, 30]],
};

/** boss_forge sockets / muzzles. */
export const FORGE_MOUNTS: BossMounts = {
  turret: [[-31, -37], [31, -37], [-31, 25], [31, 25]],
  cannon: [],
  pod: [[-42, -6], [42, -6]],
  core: [[0, -6]],
  wing: [],
  muzzle: [[0, 54], [-31, 25], [31, 25]],
};

/** boss_cryo sockets / muzzles. */
export const CRYO_MOUNTS: BossMounts = {
  turret: [[-28, -26], [28, -26]],
  cannon: [],
  pod: [[-16, -42], [16, -42]],
  core: [[0, -8]],
  wing: [[-38, 6], [38, 6]],
  muzzle: [[0, 47], [-46, 2], [46, 2], [-27, 42], [27, 42]],
};

/** boss_voidcarrier sockets / muzzles. */
export const VOIDCARRIER_MOUNTS: BossMounts = {
  turret: [[-38, -6], [38, -6], [-22, 32], [22, 32]],
  cannon: [],
  pod: [[-53, -16], [53, -16]],
  core: [[0, -18]],
  wing: [[-30, 12], [30, 12]],
  muzzle: [[-22, 58], [22, 58], [0, 46]],
};

/** boss_architect sockets / muzzles. */
export const ARCHITECT_MOUNTS: BossMounts = {
  turret: [[-27, -39], [27, -39], [-29, 15], [29, 15]],
  cannon: [[0, 34]],
  pod: [[-48, -44], [48, -44]],
  core: [[0, -12]],
  wing: [[-44, 4], [44, 4]],
  muzzle: [[-43, 60], [43, 60], [0, 44]],
};

/** All boss mounts by body sprite. */
export const BOSS_MOUNTS: Record<BossSprite, BossMounts> = {
  boss_colossus: COLOSSUS_MOUNTS,
  boss_hydra: HYDRA_MOUNTS,
  boss_dreadnought: DREADNOUGHT_MOUNTS,
  boss_forge: FORGE_MOUNTS,
  boss_cryo: CRYO_MOUNTS,
  boss_hive: HIVE_MOUNTS,
  boss_voidcarrier: VOIDCARRIER_MOUNTS,
  boss_architect: ARCHITECT_MOUNTS,
};
