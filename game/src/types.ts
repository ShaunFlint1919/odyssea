// =====================================================================================
//  DATA CONTRACTS — shared by every module. Change only with care: content (src/data),
//  gameplay (src/game), UI (src/scenes, src/ui) and save (src/state) all depend on them.
// =====================================================================================

/** Terrain / background family of a planet. One TerrainGenerator per biome (src/art/terrain.ts). */
export type Biome = 'desert' | 'jungle' | 'ocean' | 'cavern' | 'space' | 'lava' | 'ice' | 'techno';
export const BIOMES: Biome[] = ['desert', 'jungle', 'ocean', 'cavern', 'space', 'lava', 'ice', 'techno'];

/** Swappable colour ramps for enemy sprites (digits 1..5 in pixel maps). See src/art/palettes.ts. */
export type Palette = 'steel' | 'crimson' | 'emerald' | 'cobalt' | 'amber' | 'violet' | 'bone' | 'toxic';
export const PALETTE_NAMES: Palette[] = ['steel', 'crimson', 'emerald', 'cobalt', 'amber', 'violet', 'bone', 'toxic'];

/** Colours available for projectiles / glows. */
export type ShotColor = 'cyan' | 'orange' | 'green' | 'violet' | 'red' | 'yellow' | 'white' | 'pink' | 'blue';
export const SHOT_COLORS: ShotColor[] = ['cyan', 'orange', 'green', 'violet', 'red', 'yellow', 'white', 'pink', 'blue'];

/** Sound effect identifiers (implemented procedurally in src/audio/sfx.ts). */
export type SfxKey =
  | 'shot_pulse' | 'shot_scatter' | 'shot_gatling' | 'shot_laser' | 'shot_missile' | 'shot_wave'
  | 'shot_heavy' | 'shot_rear' | 'shot_sidekick' | 'enemy_shot' | 'enemy_laser'
  | 'hit' | 'hit_armor' | 'shield_hit' | 'shield_down'
  | 'explode_s' | 'explode_m' | 'explode_l' | 'explode_boss'
  | 'pickup_credit' | 'pickup_power' | 'pickup_repair' | 'pickup_intel'
  | 'ui_move' | 'ui_select' | 'ui_back' | 'ui_buy' | 'ui_sell' | 'ui_error'
  | 'boss_alarm' | 'warning' | 'level_clear' | 'game_over' | 'rear_toggle';

/** Music tracks (procedural chiptune in src/audio/music.ts). */
export type MusicTrack = 'title' | 'map' | 'hangar' | 'boss' | 'victory' | Biome;

// ------------------------------------------------------------------------- Ship parts

export interface HullDef {
  id: string;            // also the sprite key (see HULL_SPRITES in src/art/keys.ts)
  name: string;
  cost: number;
  armor: number;         // hit points of the hull
  speed: number;         // max speed in px/s (keyboard); touch drag is capped to ~1.6x this
  hitRadius: number;     // collision radius in px (small = more forgiving)
  sidekickSlots: 0 | 1 | 2;
  desc: string;
  unlockLevel?: string;  // level id that must be completed before it appears in the shop
}

export interface ShieldDef {
  id: string;
  name: string;
  cost: number;
  capacity: number;      // shield points
  regen: number;         // shield points restored per second (when energy available)
  energyPerPoint: number;// generator energy consumed per shield point restored
  color: ShotColor;      // bubble colour
  desc: string;
  unlockLevel?: string;
}

export interface GeneratorDef {
  id: string;
  name: string;
  cost: number;
  capacity: number;      // max energy stored
  output: number;        // energy produced per second
  desc: string;
  unlockLevel?: string;
}

export type WeaponSlot = 'front' | 'rear';

/**
 * How a weapon fires. The gameplay weapon system (src/game/weapons.ts) implements each
 * pattern and scales it with the power level (1..MAX_POWER): more projectiles, wider
 * spread, faster cadence, more damage.
 */
export type FrontPattern =
  | 'pulse'     // straight parallel bolts (1 -> 5 streams)
  | 'scatter'   // fan spread (3 -> 11 shots)
  | 'gatling'   // very fast narrow stream with jitter
  | 'lance'     // piercing beam bursts
  | 'seeker'    // homing micro-missiles
  | 'helix'     // two interleaved sine waves
  | 'mortar'    // slow heavy orbs with splash damage
  | 'prism';    // bolts that split into shards after a short distance
export type RearPattern =
  | 'tail'      // mode A: straight back, mode B: 45° diagonals forward
  | 'flame'     // mode A: rear flame cone, mode B: side flames
  | 'mines'     // mode A: drops proximity mines, mode B: lateral mine throw
  | 'arc'       // mode A: rear arc spread, mode B: sideways arcs
  | 'seekers';  // mode A: rear homing, mode B: side homing
export type SidekickPattern =
  | 'pod'       // fires straight forward
  | 'twin'      // fires two angled bolts
  | 'orbiter'   // orbits the ship, blocks enemy bullets, contact damage
  | 'rocket'    // homing rockets on cooldown
  | 'shard'     // fires piercing shards in a 3-way
  | 'charge';   // charges then releases a big beam every few seconds

export interface WeaponDef {
  id: string;
  name: string;
  slot: WeaponSlot;
  pattern: FrontPattern | RearPattern;
  cost: number;           // purchase price at power 1
  upgradeBase: number;    // price of power n -> n+1 is upgradeBase * n
  damage: number;         // damage of one projectile at power 1
  fireRate: number;       // volleys per second at power 1
  energyPerShot: number;  // generator energy per volley
  projectile: string;     // projectile sprite base key (PROJECTILE_SPRITES)
  color: ShotColor;
  sfx: SfxKey;
  desc: string;
  unlockLevel?: string;
}

export interface SidekickDef {
  id: string;             // also the sprite key (SIDEKICK_SPRITES)
  name: string;
  pattern: SidekickPattern;
  cost: number;
  damage: number;
  fireRate: number;       // volleys per second (charge: 1 / charge time)
  projectile: string;
  color: ShotColor;
  desc: string;
  unlockLevel?: string;
}

// ------------------------------------------------------------------------- Enemies

export type EnemyLayer = 'air' | 'ground' | 'sea';

export type MovePattern =
  | 'straight'        // moves down at speed
  | 'sine'            // moves down while oscillating horizontally
  | 'dive'            // enters, pauses, then dives toward the player's position
  | 'swoopL'          // enters from top, curves to the left and exits
  | 'swoopR'          // enters from top, curves to the right and exits
  | 'zigzag'          // sharp diagonal zigzags downward
  | 'hover'           // enters to a y position, strafes left/right, leaves after a while
  | 'strafe'          // enters from a side, crosses the screen horizontally
  | 'circle'          // loops in circles while descending
  | 'chase'           // slowly homes on the player
  | 'ground'          // fixed on the terrain: moves with scroll speed (turrets, bunkers)
  | 'groundMove'      // on the terrain, drives slowly in a direction (tanks)
  | 'drift'           // slow random drift (asteroids, mines)
  | 'rise';           // enters from the BOTTOM going up (surprise attackers)

export type FirePattern =
  | 'none'
  | 'aimed'           // single bullet at the player
  | 'burst'           // 3 aimed bullets in quick succession
  | 'spread3'         // 3-way aimed fan
  | 'spread5'         // 5-way aimed fan
  | 'down'            // straight down
  | 'ring8'           // 8 bullets in a circle
  | 'ring16'          // 16 bullets in a circle
  | 'spiral'          // rotating stream
  | 'laser'           // telegraphed vertical laser
  | 'flak'            // slow bullet that bursts into 6 fragments
  | 'missile';        // slow homing missile (can be shot down)

export type PickupKind = 'credit_s' | 'credit_m' | 'credit_l' | 'armor' | 'shield' | 'power' | 'intel';

export interface DropDef { kind: PickupKind; chance: number }

export interface EnemyDef {
  id: string;
  name: string;
  sprite: string;          // base sprite key (ENEMY_SPRITES)
  palette: Palette;        // colour variant -> texture key enemyKey(sprite, palette)
  layer: EnemyLayer;
  hp: number;
  speed: number;           // px/s along its pattern
  move: MovePattern;
  fire: FirePattern;
  fireRate: number;        // volleys per second (0 = never)
  bulletSpeed: number;     // px/s
  bulletSprite: string;    // ENEMY_BULLET_SPRITES
  bulletColor: ShotColor;
  contactDamage: number;
  score: number;
  credits: number;         // credits granted on kill (spawned as credit pickups)
  explosion: 's' | 'm' | 'l';
  drops?: DropDef[];
}

export interface BossAttack {
  fire: FirePattern;
  rate: number;            // volleys per second
  bulletSpeed: number;
  bulletSprite: string;
  bulletColor: ShotColor;
  from?: [number, number]; // muzzle offset from boss centre (px)
}

export interface BossPhase {
  untilHp: number;         // phase is active while hp fraction > untilHp (last phase: 0)
  move: 'hoverSway' | 'sweep' | 'charge' | 'figure8' | 'anchor';
  speed: number;
  attacks: BossAttack[];
  spawn?: { enemy: string; every: number };  // spawn minions every N seconds
}

export interface BossPart {
  sprite: string;          // part sprite key (BOSS_SPRITES 'parts')
  offset: [number, number];
  hp: number;              // destroyable sub-part (turret / pod); 0 = invulnerable decoration
  attack?: BossAttack;
}

export interface BossDef {
  id: string;
  name: string;
  title: string;           // e.g. "Guardian of Kessra"
  sprite: string;          // BOSS_SPRITES key
  palette: Palette;
  hp: number;
  score: number;
  credits: number;
  phases: BossPhase[];
  parts?: BossPart[];
}

// ------------------------------------------------------------------------- Levels

export type Formation = 'single' | 'line' | 'column' | 'v' | 'wall' | 'random' | 'arc' | 'pair';

export interface WaveDef {
  t: number;               // seconds since level start
  enemy: string;           // EnemyDef id
  count: number;
  formation: Formation;
  x: number;               // 0..1 horizontal anchor across the playfield
  spacing?: number;        // px between members (default 24)
  interval?: number;       // seconds between successive spawns (column / stream), default 0.35
  move?: MovePattern;      // override the enemy default
  mirror?: boolean;        // also spawn a mirrored copy at 1 - x
}

export interface LevelDef {
  id: string;              // e.g. "kessra-1"
  planet: string;          // PlanetDef id
  index: number;           // 1-based index within the planet
  name: string;
  biome: Biome;
  seed: number;            // terrain + randomness seed
  duration: number;        // seconds of waves before the boss / end
  scrollSpeed: number;     // terrain scroll speed in px/s (40..90)
  waves: WaveDef[];
  midboss?: { t: number; enemy: string };
  boss?: string;           // BossDef id (last level of a planet always has one)
  intel?: string;          // IntelDef id hidden in the level (dropped by a special enemy)
  briefing: string;        // one or two lines shown before the level starts
}

export interface PlanetDef {
  id: string;
  name: string;
  biome: Biome;
  desc: string;
  mapX: number;            // 0..1 position on the galaxy map
  mapY: number;
  levels: string[];        // LevelDef ids in order
}

export interface IntelDef {
  id: string;
  from: string;
  title: string;
  body: string;            // short lore message (<= 400 chars)
}

// ------------------------------------------------------------------------- Save / state

export interface Loadout {
  hull: string;
  front: string;
  frontPower: number;
  rear: string | null;
  rearPower: number;
  shield: string;
  generator: string;
  sidekickL: string | null;
  sidekickR: string | null;
}

export interface Settings {
  sfx: number;             // 0..1
  music: number;           // 0..1
  shake: boolean;
  vibrate: boolean;
  autofire: boolean;
  touchSensitivity: number;// 0.8..2.0 multiplier for relative drag
  showFps: boolean;
}

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface SaveData {
  version: 1;
  createdAt: number;
  credits: number;
  score: number;
  difficulty: Difficulty;
  loadout: Loadout;
  unlockedLevels: string[];
  completedLevels: string[];
  bestScores: Record<string, number>;
  intel: string[];          // collected IntelDef ids
  intelRead: string[];
  currentLevel: string;     // level selected on the map / next to play
  stats: { kills: number; deaths: number; playSeconds: number; creditsEarned: number };
  settings: Settings;
}

/** Passed from the Game scene to the LevelEnd / GameOver scenes. */
export interface LevelResult {
  levelId: string;
  completed: boolean;
  kills: number;
  spawned: number;
  creditsEarned: number;
  score: number;
  intelFound: string[];
  timeSeconds: number;
  bossDefeated: boolean;
}
