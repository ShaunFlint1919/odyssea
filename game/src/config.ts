// Global, immutable game constants. Computed once at module load (before Phaser boots).
import pkg from '../package.json';

export const GAME_TITLE = 'NOVA CORSAIR';
export const GAME_SUBTITLE = 'Raid on the Outer Marches';

/** App version, single source of truth: game/package.json (also used by the Android build). */
export const VERSION: string = pkg.version;

/** Logical width in game pixels (pixel-art resolution, scaled up to the screen). */
export const W = 320;

function computeHeight(): number {
  if (typeof window === 'undefined') return 568;
  // Prefer the real game box (it excludes the notch / safe-area insets), else the window.
  const box = typeof document !== 'undefined' ? document.getElementById('game')?.getBoundingClientRect() : undefined;
  const bw = box && box.width > 0 ? box.width : window.innerWidth;
  const bh = box && box.height > 0 ? box.height : window.innerHeight;
  const ratio = bh / Math.max(1, bw);
  // Portrait phones: 16:9 -> 569, 20:9 -> 711. Landscape desktop clamps to 480.
  const h = Math.min(720, Math.max(480, Math.round(W * ratio)));
  return h - (h % 2);
}

/** Logical height in game pixels (depends on device aspect, 480..720). */
export const H = computeHeight();

/** Width of the in-game right-side HUD panel. */
export const HUD_W = 56;
/** Width of the playfield (left part of the screen during gameplay). */
export const PLAY_W = W - HUD_W;
/** Terrain chunk height in pixels (terrain is generated chunk by chunk while scrolling). */
export const CHUNK_H = 256;

/** Max weapon power level for front / rear guns. */
export const MAX_POWER = 10;

/** Depth (z-order) layers used by every scene that renders gameplay. */
export const DEPTH = {
  terrain: 0,
  doodads: 5,
  ground: 10,        // ground / sea enemies (scroll with terrain)
  shadows: 15,       // shadows of air units, drawn on the ground
  groundFx: 18,
  pickups: 20,
  air: 30,           // air enemies
  playerShots: 36,   // below enemy bullets: enemy bullets must stay the most readable thing
  enemyBullets: 40,
  player: 50,
  fx: 60,
  clouds: 70,
  hud: 100,
  overlay: 200,
} as const;

/** Scene keys. */
export const SCENES = {
  Boot: 'Boot',
  Title: 'Title',
  Map: 'Map',
  Hangar: 'Hangar',
  Shop: 'Shop',
  Specs: 'Specs',
  Options: 'Options',
  Intel: 'Intel',
  Game: 'Game',
  LevelEnd: 'LevelEnd',
  GameOver: 'GameOver',
  Pause: 'Pause',
} as const;
export type SceneKey = (typeof SCENES)[keyof typeof SCENES];

/** Core UI colours (original art direction: indigo gunmetal panels, teal neon glow, magenta accents). */
export const COLORS = {
  bg: 0x05040a,
  panelDark: 0x14121c,
  panel: 0x232030,
  panelLight: 0x3a3550,
  accent: 0xd04cff,
  accentLight: 0xf2a6ff,
  gold: 0xffd060,
  teal: 0x2ee6c8,
  tealDark: 0x0c6b62,
  text: 0xe8e4f0,
  textDim: 0x8a84a0,
  good: 0x5cf05c,
  warn: 0xffc030,
  bad: 0xff4040,
  shield: 0x40a0ff,
  armor: 0xff8040,
  energy: 0xffe040,
} as const;

/**
 * Damage dealt to the player by one enemy bullet, by bullet sprite (before difficulty scaling).
 * eb_laser deals its damage every 0.1 s of contact.
 */
export const ENEMY_BULLET_DAMAGE: Record<string, number> = {
  eb_dot: 2,
  eb_orb: 3,
  eb_needle: 3,
  eb_ring: 4,
  eb_bigorb: 6,
  eb_missile: 7,
  eb_laser: 1,
};
