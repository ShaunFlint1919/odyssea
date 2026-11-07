// Shared types for the boss art modules.

/** [x, y] offset in px from the sprite centre (+x right, +y down = towards the player). */
export type Offset = [number, number];

/**
 * Where the body art provides sockets / openings for separate parts and muzzles.
 * All offsets are relative to the CENTRE of the boss sprite, matching BossPart.offset and
 * BossAttack.from in src/types.ts.
 */
export interface BossMounts {
  turret: Offset[];  // sockets sized for part_turret (20 px)
  cannon: Offset[];  // sockets sized for part_cannon (24 px)
  pod: Offset[];     // sockets sized for part_pod (18 px)
  core: Offset[];    // weak-point sockets for part_core (28 px)
  wing: Offset[];    // attachment points for part_wing (32 px, left wing art; flipX for x > 0)
  muzzle: Offset[];  // built-in gun muzzles of the body art (for BossAttack.from)
}
