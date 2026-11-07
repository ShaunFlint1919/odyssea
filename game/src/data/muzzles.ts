// Muzzle / hangar-bay offsets of the large enemy sprites, in px from the sprite centre
// (+y = down, towards the player), as drawn by the enemy artist. EnemyDef has no muzzle
// field, so gameplay may read this table to fire mid-boss / gunship bullets from the
// painted cannons and to launch minions from carrier bays. Sprites not listed fire from
// their centre.
import type { EnemySprite } from '../art/keys';

export interface SpriteMuzzles {
  /** cannon muzzles (bullets) */
  guns: [number, number][];
  /** hangar bays (minion launch points) */
  bays?: [number, number][];
}

export const ENEMY_MUZZLES: Partial<Record<EnemySprite, SpriteMuzzles>> = {
  en_frigate: { guns: [[0, 25], [-19, 17], [19, 17]] },  // spinal cannon + wing cannons
  en_carrier: { guns: [[-16, 15], [16, 15]], bays: [[-16, 15], [16, 15]] },
  en_gunship: { guns: [[-13, 18], [13, 18]] },            // side cannons
  sea_destroyer: { guns: [[0, 16]] },                     // fore guns
};
