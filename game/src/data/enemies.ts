// =====================================================================================
//  BESTIARY — every enemy type, grouped by planet. Each planet has its own roster in its
//  colour identity (BIOME_PALETTES) with enemy bullet colours readable on its terrain
//  (BIOME_BULLET_COLORS). Ids are prefixed by planet: k_ kessra, v_ verdance, t_ thalassa,
//  u_ umbra, c_ cinder, g_ glacia, r_ rift, a_ axiom.
//  Weight classes (docs/BALANCE.md): small 4..14 hp, medium 30..90, heavy 150..450,
//  mid-boss 1500..4000. Credits = hp x CREDIT_RATE[tier] (x LOOT_BONUS for loot carriers)
//  unless given explicitly. Enemy bullet damage comes from ENEMY_BULLET_DAMAGE (config.ts).
// =====================================================================================
import type { DropDef, EnemyDef, EnemyLayer, FirePattern, MovePattern, Palette, ShotColor } from '../types';
import type { EnemyBulletSprite, EnemySprite } from '../art/keys';
import { ENEMY_SPRITES } from '../art/keys';

/** Credits per hit point of a regular enemy, per planet tier (0 = Kessra .. 7 = Axiom). */
export const CREDIT_RATE = [1.3, 1.1, 0.95, 0.8, 0.7, 0.62, 0.55, 0.5];
/** Loot carriers (radar relays, weak saucers) pay this multiple of the regular rate. */
export const LOOT_BONUS = 3;

interface Spec {
  hp: number;
  speed: number;
  move: MovePattern;
  fire?: FirePattern;
  /** volleys per second (spiral: bullets per second of the stream) */
  rate?: number;
  /** bullet speed px/s */
  bs?: number;
  b?: EnemyBulletSprite;
  c?: ShotColor;
  drops?: DropDef[];
  contact?: number;
  credits?: number;
  loot?: boolean;
}

const LOOT_POWER_ARMOR: DropDef[] = [{ kind: 'power', chance: 0.7 }, { kind: 'armor', chance: 0.3 }];
const LOOT_POWER_SHIELD: DropDef[] = [{ kind: 'power', chance: 0.7 }, { kind: 'shield', chance: 0.3 }];
const INTEL_DROP: DropDef[] = [{ kind: 'intel', chance: 1 }, { kind: 'power', chance: 0.4 }];
const MIDBOSS_DROP: DropDef[] = [{ kind: 'power', chance: 1 }, { kind: 'armor', chance: 1 }, { kind: 'shield', chance: 1 }];

function layerOf(sprite: EnemySprite): EnemyLayer {
  if (sprite.startsWith('gr_')) return 'ground';
  if (sprite.startsWith('sea_')) return 'sea';
  return 'air';
}

function contactFor(sprite: EnemySprite, tier: number): number {
  const size = ENEMY_SPRITES[sprite];
  const half = Math.floor(tier / 2);
  if (sprite === 'en_kamikaze') return 12 + tier;
  if (size <= 14) return 8 + half;
  if (size <= 20) return 10 + half;
  if (size <= 28) return 14 + half;
  if (size <= 40) return 18 + half;
  return 26 + half;
}

/** Build one EnemyDef with derived layer, contact damage, credits, score and explosion size. */
function mk(tier: number, id: string, name: string, sprite: EnemySprite, palette: Palette, s: Spec): EnemyDef {
  const layer = layerOf(sprite);
  const fire = s.fire ?? 'none';
  const rate = CREDIT_RATE[tier] * (s.loot ? LOOT_BONUS : 1);
  const def: EnemyDef = {
    id, name, sprite, palette, layer,
    hp: s.hp,
    speed: s.speed,
    move: s.move,
    fire,
    fireRate: fire === 'none' ? 0 : s.rate ?? 0.5,
    bulletSpeed: fire === 'none' ? 0 : s.bs ?? 100,
    bulletSprite: s.b ?? 'eb_dot',
    bulletColor: s.c ?? 'red',
    contactDamage: s.contact ?? (layer === 'air' ? contactFor(sprite, tier) : 0),
    score: Math.max(50, Math.round(s.hp * 1.2) * 10),
    credits: s.credits ?? Math.max(2, Math.round(s.hp * rate)),
    explosion: s.hp <= 20 ? 's' : s.hp <= 120 ? 'm' : 'l',
  };
  if (s.drops) def.drops = s.drops;
  return def;
}

// ------------------------------------------------------------ 1. KESSRA (desert) amber / bone
const K = 0;
const KESSRA: EnemyDef[] = [
  mk(K, 'k_mite', 'Dust Mite', 'en_drone', 'amber', { hp: 4, speed: 80, move: 'sine' }),
  mk(K, 'k_dart', 'Sand Dart', 'en_dart', 'amber', { hp: 5, speed: 115, move: 'straight', fire: 'aimed', rate: 0.3, bs: 90, b: 'eb_dot', c: 'pink' }),
  mk(K, 'k_wasp', 'Dune Wasp', 'en_wasp', 'bone', { hp: 6, speed: 105, move: 'zigzag', fire: 'burst', rate: 0.22, bs: 95, b: 'eb_dot', c: 'violet' }),
  mk(K, 'k_hornet', 'Scorch Hornet', 'en_hornet', 'amber', { hp: 10, speed: 80, move: 'straight', fire: 'spread3', rate: 0.35, bs: 85, b: 'eb_orb', c: 'pink' }),
  mk(K, 'k_diver', 'Sandsnap Diver', 'en_kamikaze', 'bone', { hp: 5, speed: 150, move: 'dive' }),
  mk(K, 'k_turret', 'Dune Turret', 'gr_turret', 'bone', { hp: 30, speed: 0, move: 'ground', fire: 'aimed', rate: 0.4, bs: 90, b: 'eb_orb', c: 'pink' }),
  mk(K, 'k_tank', 'Sandrunner Tank', 'gr_tank', 'amber', { hp: 36, speed: 20, move: 'groundMove', fire: 'aimed', rate: 0.35, bs: 95, b: 'eb_orb', c: 'violet' }),
  mk(K, 'k_bunker', 'Mesa Bunker', 'gr_bunker', 'bone', { hp: 160, speed: 0, move: 'ground', fire: 'ring8', rate: 0.3, bs: 75, b: 'eb_orb', c: 'violet', drops: [{ kind: 'armor', chance: 0.25 }] }),
  mk(K, 'k_relay', 'Relay Dish', 'gr_radar', 'amber', { hp: 8, speed: 0, move: 'ground', drops: INTEL_DROP, loot: true }),
  mk(K, 'k_loot', 'Prospector Disc', 'en_saucer', 'bone', { hp: 10, speed: 70, move: 'strafe', drops: LOOT_POWER_ARMOR, loot: true }),
  mk(K, 'k_frigate', 'Sirocco Frigate', 'en_frigate', 'amber', { hp: 1500, speed: 26, move: 'hover', fire: 'spread5', rate: 0.45, bs: 85, b: 'eb_orb', c: 'pink', credits: 300, drops: MIDBOSS_DROP }),
];

// ------------------------------------------------------------ 2. VERDANCE (jungle) emerald / toxic
const V = 1;
const VERDANCE: EnemyDef[] = [
  mk(V, 'v_mite', 'Spore Mite', 'en_drone', 'toxic', { hp: 5, speed: 90, move: 'sine' }),
  mk(V, 'v_wasp', 'Vine Wasp', 'en_wasp', 'emerald', { hp: 7, speed: 115, move: 'zigzag', fire: 'aimed', rate: 0.35, bs: 100, b: 'eb_dot', c: 'red' }),
  mk(V, 'v_diver', 'Thorn Diver', 'en_kamikaze', 'toxic', { hp: 6, speed: 155, move: 'dive' }),
  mk(V, 'v_hornet', 'Canopy Hornet', 'en_hornet', 'emerald', { hp: 11, speed: 90, move: 'straight', fire: 'spread3', rate: 0.4, bs: 95, b: 'eb_orb', c: 'pink' }),
  mk(V, 'v_spinner', 'Seedpod Spinner', 'en_spinner', 'toxic', { hp: 34, speed: 55, move: 'circle', fire: 'spiral', rate: 3, bs: 80, b: 'eb_dot', c: 'orange' }),
  mk(V, 'v_ray', 'Fern Ray', 'en_manta', 'emerald', { hp: 44, speed: 60, move: 'sine', fire: 'spread5', rate: 0.35, bs: 90, b: 'eb_orb', c: 'red' }),
  mk(V, 'v_crawler', 'Mire Crawler', 'gr_crawler', 'toxic', { hp: 11, speed: 24, move: 'groundMove', fire: 'aimed', rate: 0.35, bs: 95, b: 'eb_dot', c: 'red' }),
  mk(V, 'v_twin', 'Thicket Twin', 'gr_twin', 'emerald', { hp: 50, speed: 0, move: 'ground', fire: 'burst', rate: 0.35, bs: 100, b: 'eb_orb', c: 'pink' }),
  mk(V, 'v_silo', 'Bloom Silo', 'gr_silo', 'toxic', { hp: 56, speed: 0, move: 'ground', fire: 'missile', rate: 0.22, bs: 70, b: 'eb_missile', c: 'orange' }),
  mk(V, 'v_relay', 'Canopy Relay', 'gr_radar', 'emerald', { hp: 9, speed: 0, move: 'ground', drops: INTEL_DROP, loot: true }),
  mk(V, 'v_loot', 'Pollen Disc', 'en_saucer', 'toxic', { hp: 11, speed: 70, move: 'strafe', drops: LOOT_POWER_SHIELD, loot: true }),
  mk(V, 'v_carrier', 'Canopy Carrier', 'en_carrier', 'emerald', { hp: 1725, speed: 22, move: 'hover', fire: 'ring16', rate: 0.3, bs: 80, b: 'eb_orb', c: 'pink', credits: 450, drops: MIDBOSS_DROP }),
];

// ------------------------------------------------------------ 3. THALASSA (ocean) cobalt / steel
const T = 2;
const THALASSA: EnemyDef[] = [
  mk(T, 't_mite', 'Spray Mite', 'en_drone', 'cobalt', { hp: 5, speed: 95, move: 'sine' }),
  mk(T, 't_dart', 'Gull Dart', 'en_dart', 'steel', { hp: 7, speed: 130, move: 'straight', fire: 'aimed', rate: 0.4, bs: 110, b: 'eb_dot', c: 'orange' }),
  mk(T, 't_hornet', 'Squall Hornet', 'en_hornet', 'cobalt', { hp: 12, speed: 95, move: 'straight', fire: 'spread3', rate: 0.45, bs: 100, b: 'eb_orb', c: 'red' }),
  mk(T, 't_ray', 'Tide Ray', 'en_manta', 'cobalt', { hp: 50, speed: 70, move: 'sine', fire: 'down', rate: 0.7, bs: 120, b: 'eb_needle', c: 'yellow' }),
  mk(T, 't_disc', 'Gale Disc', 'en_saucer', 'steel', { hp: 38, speed: 50, move: 'hover', fire: 'ring8', rate: 0.4, bs: 85, b: 'eb_orb', c: 'orange' }),
  mk(T, 't_bomber', 'Albatross Bomber', 'en_bomber', 'cobalt', { hp: 190, speed: 34, move: 'straight', fire: 'flak', rate: 0.3, bs: 80, b: 'eb_orb', c: 'red', drops: [{ kind: 'power', chance: 0.2 }] }),
  mk(T, 't_mine', 'Tidal Mine', 'hz_mine', 'steel', { hp: 9, speed: 22, move: 'drift', contact: 14 }),
  mk(T, 't_skiff', 'Reef Skiff', 'sea_boat', 'cobalt', { hp: 12, speed: 30, move: 'groundMove', fire: 'aimed', rate: 0.45, bs: 105, b: 'eb_dot', c: 'orange' }),
  mk(T, 't_gunboat', 'Harbor Gunboat', 'sea_boat', 'steel', { hp: 40, speed: 18, move: 'groundMove', fire: 'spread3', rate: 0.4, bs: 100, b: 'eb_orb', c: 'red' }),
  mk(T, 't_destroyer', 'Breaker Destroyer', 'sea_destroyer', 'steel', { hp: 300, speed: 14, move: 'groundMove', fire: 'spread5', rate: 0.35, bs: 95, b: 'eb_ring', c: 'orange', drops: [{ kind: 'armor', chance: 0.3 }] }),
  mk(T, 't_courier', 'Wavecrest Courier', 'en_saucer', 'cobalt', { hp: 12, speed: 70, move: 'strafe', drops: INTEL_DROP, loot: true }),
  mk(T, 't_loot', 'Flotsam Disc', 'en_saucer', 'steel', { hp: 12, speed: 70, move: 'strafe', drops: LOOT_POWER_SHIELD, loot: true }),
  mk(T, 't_tidewall', 'Tidewall Destroyer', 'sea_destroyer', 'cobalt', { hp: 1985, speed: 12, move: 'groundMove', fire: 'spread5', rate: 0.55, bs: 95, b: 'eb_ring', c: 'orange', credits: 650, drops: MIDBOSS_DROP }),
];

// ------------------------------------------------------------ 4. UMBRA DEEP (cavern) bone / violet
const U = 3;
const UMBRA: EnemyDef[] = [
  mk(U, 'u_mite', 'Gloom Mite', 'en_drone', 'violet', { hp: 6, speed: 95, move: 'sine' }),
  mk(U, 'u_wasp', 'Cave Wasp', 'en_wasp', 'bone', { hp: 9, speed: 120, move: 'zigzag', fire: 'burst', rate: 0.35, bs: 110, b: 'eb_dot', c: 'yellow' }),
  mk(U, 'u_diver', 'Stalactite Diver', 'en_kamikaze', 'bone', { hp: 8, speed: 165, move: 'dive' }),
  mk(U, 'u_spinner', 'Crystal Spinner', 'en_spinner', 'violet', { hp: 40, speed: 55, move: 'circle', fire: 'spiral', rate: 4, bs: 90, b: 'eb_dot', c: 'pink' }),
  mk(U, 'u_eye', 'Gloom Eye', 'en_sentinel', 'bone', { hp: 68, speed: 45, move: 'hover', fire: 'laser', rate: 0.22, bs: 260, b: 'eb_laser', c: 'orange' }),
  mk(U, 'u_crawler', 'Tunnel Crawler', 'gr_crawler', 'bone', { hp: 12, speed: 26, move: 'groundMove', fire: 'spread3', rate: 0.3, bs: 100, b: 'eb_dot', c: 'orange' }),
  mk(U, 'u_turret', 'Geode Turret', 'gr_turret', 'violet', { hp: 42, speed: 0, move: 'ground', fire: 'burst', rate: 0.4, bs: 110, b: 'eb_orb', c: 'yellow' }),
  mk(U, 'u_silo', 'Brood Silo', 'gr_silo', 'bone', { hp: 68, speed: 0, move: 'ground', fire: 'missile', rate: 0.25, bs: 75, b: 'eb_missile', c: 'orange' }),
  mk(U, 'u_scree', 'Falling Scree', 'hz_rock_s', 'bone', { hp: 12, speed: 70, move: 'drift', contact: 8 }),
  mk(U, 'u_boulder', 'Cave-in Boulder', 'hz_rock_m', 'bone', { hp: 52, speed: 45, move: 'drift', contact: 14 }),
  mk(U, 'u_relay', 'Echo Relay', 'gr_radar', 'violet', { hp: 10, speed: 0, move: 'ground', drops: INTEL_DROP, loot: true }),
  mk(U, 'u_loot', 'Lantern Moth', 'en_saucer', 'bone', { hp: 12, speed: 70, move: 'strafe', drops: LOOT_POWER_ARMOR, loot: true }),
  mk(U, 'u_frigate', 'Gloam Frigate', 'en_frigate', 'violet', { hp: 2280, speed: 24, move: 'hover', fire: 'ring16', rate: 0.35, bs: 90, b: 'eb_orb', c: 'pink', credits: 800, drops: MIDBOSS_DROP }),
];

// ------------------------------------------------------------ 5. CINDER (lava) crimson / amber
const C = 4;
const CINDER: EnemyDef[] = [
  mk(C, 'c_mite', 'Spark Mite', 'en_drone', 'crimson', { hp: 7, speed: 100, move: 'sine' }),
  mk(C, 'c_dart', 'Ember Dart', 'en_dart', 'crimson', { hp: 9, speed: 150, move: 'straight', fire: 'aimed', rate: 0.5, bs: 125, b: 'eb_dot', c: 'cyan' }),
  mk(C, 'c_hornet', 'Magma Hornet', 'en_hornet', 'crimson', { hp: 12, speed: 100, move: 'straight', fire: 'spread3', rate: 0.5, bs: 115, b: 'eb_orb', c: 'white' }),
  mk(C, 'c_comet', 'Cinder Comet', 'en_kamikaze', 'amber', { hp: 9, speed: 120, move: 'chase' }),
  mk(C, 'c_bomber', 'Slag Bomber', 'en_bomber', 'amber', { hp: 240, speed: 34, move: 'straight', fire: 'flak', rate: 0.4, bs: 90, b: 'eb_orb', c: 'cyan', drops: [{ kind: 'power', chance: 0.2 }] }),
  mk(C, 'c_gunship', 'Pyre Gunship', 'en_gunship', 'crimson', { hp: 290, speed: 40, move: 'hover', fire: 'spread5', rate: 0.55, bs: 110, b: 'eb_orb', c: 'white', drops: [{ kind: 'shield', chance: 0.25 }] }),
  mk(C, 'c_tank', 'Basalt Tank', 'gr_tank', 'crimson', { hp: 58, speed: 22, move: 'groundMove', fire: 'burst', rate: 0.45, bs: 115, b: 'eb_orb', c: 'cyan' }),
  mk(C, 'c_twin', 'Obsidian Twin', 'gr_twin', 'amber', { hp: 70, speed: 0, move: 'ground', fire: 'spread3', rate: 0.45, bs: 115, b: 'eb_orb', c: 'violet' }),
  mk(C, 'c_bunker', 'Caldera Bunker', 'gr_bunker', 'amber', { hp: 260, speed: 0, move: 'ground', fire: 'ring16', rate: 0.28, bs: 85, b: 'eb_orb', c: 'white', drops: [{ kind: 'armor', chance: 0.25 }] }),
  mk(C, 'c_silo', 'Eruptor Silo', 'gr_silo', 'crimson', { hp: 76, speed: 0, move: 'ground', fire: 'missile', rate: 0.3, bs: 80, b: 'eb_missile', c: 'yellow' }),
  mk(C, 'c_boulder', 'Molten Boulder', 'hz_rock_m', 'crimson', { hp: 60, speed: 50, move: 'drift', contact: 14 }),
  mk(C, 'c_relay', 'Ash Relay', 'gr_radar', 'amber', { hp: 11, speed: 0, move: 'ground', drops: INTEL_DROP, loot: true }),
  mk(C, 'c_loot', 'Ember Disc', 'en_saucer', 'amber', { hp: 13, speed: 75, move: 'strafe', drops: LOOT_POWER_ARMOR, loot: true }),
  mk(C, 'c_carrier', 'Furnace Carrier', 'en_carrier', 'crimson', { hp: 2625, speed: 22, move: 'hover', fire: 'ring16', rate: 0.4, bs: 95, b: 'eb_ring', c: 'white', credits: 1000, drops: MIDBOSS_DROP }),
];

// ------------------------------------------------------------ 6. GLACIA (ice) steel / cobalt
const G = 5;
const GLACIA: EnemyDef[] = [
  mk(G, 'g_mite', 'Snow Mite', 'en_drone', 'steel', { hp: 8, speed: 100, move: 'sine' }),
  mk(G, 'g_wasp', 'Frost Wasp', 'en_wasp', 'cobalt', { hp: 11, speed: 130, move: 'zigzag', fire: 'burst', rate: 0.5, bs: 130, b: 'eb_dot', c: 'red' }),
  mk(G, 'g_hornet', 'Sleet Hornet', 'en_hornet', 'cobalt', { hp: 13, speed: 105, move: 'straight', fire: 'spread3', rate: 0.55, bs: 120, b: 'eb_orb', c: 'pink' }),
  mk(G, 'g_ray', 'Glacier Ray', 'en_manta', 'steel', { hp: 70, speed: 65, move: 'sine', fire: 'spread5', rate: 0.5, bs: 115, b: 'eb_orb', c: 'red' }),
  mk(G, 'g_spinner', 'Rime Spinner', 'en_spinner', 'cobalt', { hp: 54, speed: 60, move: 'circle', fire: 'spiral', rate: 5, bs: 100, b: 'eb_dot', c: 'pink' }),
  mk(G, 'g_warden', 'Ice Warden', 'en_sentinel', 'steel', { hp: 82, speed: 45, move: 'hover', fire: 'laser', rate: 0.28, bs: 260, b: 'eb_laser', c: 'red' }),
  mk(G, 'g_disc', 'Hailstone Disc', 'en_saucer', 'cobalt', { hp: 56, speed: 50, move: 'hover', fire: 'ring16', rate: 0.32, bs: 90, b: 'eb_orb', c: 'violet' }),
  mk(G, 'g_turret', 'Permafrost Gun', 'gr_turret', 'steel', { hp: 56, speed: 0, move: 'ground', fire: 'aimed', rate: 0.75, bs: 140, b: 'eb_needle', c: 'red' }),
  mk(G, 'g_walker', 'Rime Walker', 'gr_crawler', 'cobalt', { hp: 14, speed: 26, move: 'groundMove', fire: 'spread3', rate: 0.45, bs: 115, b: 'eb_dot', c: 'orange' }),
  mk(G, 'g_tank', 'Snowcat Tank', 'gr_tank', 'steel', { hp: 64, speed: 22, move: 'groundMove', fire: 'burst', rate: 0.5, bs: 125, b: 'eb_orb', c: 'red' }),
  mk(G, 'g_battery', 'Icecap Battery', 'gr_twin', 'cobalt', { hp: 78, speed: 0, move: 'ground', fire: 'spread5', rate: 0.4, bs: 115, b: 'eb_orb', c: 'pink' }),
  mk(G, 'g_relay', 'Frost Relay', 'gr_radar', 'steel', { hp: 12, speed: 0, move: 'ground', drops: INTEL_DROP, loot: true }),
  mk(G, 'g_loot', 'Aurora Disc', 'en_saucer', 'steel', { hp: 13, speed: 75, move: 'strafe', drops: LOOT_POWER_SHIELD, loot: true }),
  mk(G, 'g_frigate', 'Blizzard Frigate', 'en_frigate', 'steel', { hp: 3020, speed: 24, move: 'hover', fire: 'spread5', rate: 0.7, bs: 115, b: 'eb_needle', c: 'red', credits: 1300, drops: MIDBOSS_DROP }),
];

// ------------------------------------------------------------ 7. THE RIFT (space) violet / steel
const R = 6;
const RIFT: EnemyDef[] = [
  mk(R, 'r_mite', 'Void Mite', 'en_drone', 'violet', { hp: 9, speed: 100, move: 'circle' }),
  mk(R, 'r_dart', 'Rift Dart', 'en_dart', 'steel', { hp: 11, speed: 160, move: 'straight', fire: 'aimed', rate: 0.55, bs: 145, b: 'eb_needle', c: 'pink' }),
  mk(R, 'r_hornet', 'Nebula Hornet', 'en_hornet', 'violet', { hp: 14, speed: 110, move: 'straight', fire: 'spread3', rate: 0.6, bs: 125, b: 'eb_orb', c: 'red' }),
  mk(R, 'r_comet', 'Null Comet', 'en_kamikaze', 'violet', { hp: 11, speed: 130, move: 'chase' }),
  mk(R, 'r_disc', 'Phase Disc', 'en_saucer', 'violet', { hp: 62, speed: 50, move: 'hover', fire: 'ring16', rate: 0.4, bs: 95, b: 'eb_orb', c: 'pink' }),
  mk(R, 'r_eye', 'Void Eye', 'en_sentinel', 'violet', { hp: 86, speed: 45, move: 'hover', fire: 'laser', rate: 0.3, bs: 260, b: 'eb_laser', c: 'pink' }),
  mk(R, 'r_bomber', 'Eclipse Bomber', 'en_bomber', 'violet', { hp: 330, speed: 32, move: 'straight', fire: 'missile', rate: 0.4, bs: 85, b: 'eb_missile', c: 'orange', drops: [{ kind: 'power', chance: 0.2 }] }),
  mk(R, 'r_gunship', 'Picket Gunship', 'en_gunship', 'steel', { hp: 390, speed: 40, move: 'hover', fire: 'spread5', rate: 0.7, bs: 125, b: 'eb_ring', c: 'red', drops: [{ kind: 'shield', chance: 0.25 }] }),
  mk(R, 'r_mine', 'Graviton Mine', 'hz_mine', 'violet', { hp: 12, speed: 22, move: 'drift', fire: 'ring8', rate: 0.22, bs: 70, b: 'eb_dot', c: 'yellow', contact: 16 }),
  mk(R, 'r_shard', 'Rift Shard', 'hz_rock_s', 'steel', { hp: 13, speed: 60, move: 'drift', contact: 9 }),
  mk(R, 'r_boulder', 'Drift Boulder', 'hz_rock_m', 'steel', { hp: 70, speed: 40, move: 'drift', contact: 15 }),
  mk(R, 'r_monolith', 'Rift Monolith', 'hz_rock_l', 'violet', { hp: 280, speed: 28, move: 'drift', contact: 24, drops: [{ kind: 'armor', chance: 0.3 }] }),
  mk(R, 'r_courier', 'Ghost Courier', 'en_saucer', 'steel', { hp: 13, speed: 75, move: 'strafe', drops: INTEL_DROP, loot: true }),
  mk(R, 'r_loot', 'Salvage Disc', 'en_saucer', 'violet', { hp: 13, speed: 75, move: 'strafe', drops: LOOT_POWER_SHIELD, loot: true }),
  mk(R, 'r_carrier', 'Lamprey Carrier', 'en_carrier', 'steel', { hp: 3470, speed: 22, move: 'hover', fire: 'flak', rate: 0.6, bs: 95, b: 'eb_orb', c: 'orange', credits: 1650, drops: MIDBOSS_DROP }),
];

// ------------------------------------------------------------ 8. AXIOM CITADEL (techno) crimson / toxic / violet
const A = 7;
const AXIOM: EnemyDef[] = [
  mk(A, 'a_mite', 'Axiom Mite', 'en_drone', 'crimson', { hp: 10, speed: 105, move: 'sine' }),
  mk(A, 'a_wasp', 'Cipher Wasp', 'en_wasp', 'crimson', { hp: 13, speed: 135, move: 'zigzag', fire: 'burst', rate: 0.65, bs: 145, b: 'eb_needle', c: 'orange' }),
  mk(A, 'a_hornet', 'Lattice Hornet', 'en_hornet', 'toxic', { hp: 14, speed: 110, move: 'straight', fire: 'spread3', rate: 0.65, bs: 135, b: 'eb_orb', c: 'yellow' }),
  mk(A, 'a_comet', 'Purge Comet', 'en_kamikaze', 'violet', { hp: 12, speed: 140, move: 'chase' }),
  mk(A, 'a_spinner', 'Logic Spinner', 'en_spinner', 'violet', { hp: 66, speed: 60, move: 'circle', fire: 'spiral', rate: 6, bs: 110, b: 'eb_dot', c: 'pink' }),
  mk(A, 'a_ray', 'Vector Ray', 'en_manta', 'violet', { hp: 86, speed: 70, move: 'sine', fire: 'spread5', rate: 0.6, bs: 125, b: 'eb_orb', c: 'orange' }),
  mk(A, 'a_eye', 'Overseer Eye', 'en_sentinel', 'crimson', { hp: 90, speed: 45, move: 'hover', fire: 'laser', rate: 0.32, bs: 260, b: 'eb_laser', c: 'orange' }),
  mk(A, 'a_bomber', 'Quota Bomber', 'en_bomber', 'toxic', { hp: 380, speed: 32, move: 'straight', fire: 'flak', rate: 0.5, bs: 95, b: 'eb_orb', c: 'yellow', drops: [{ kind: 'power', chance: 0.2 }] }),
  mk(A, 'a_gunship', 'Directive Gunship', 'en_gunship', 'violet', { hp: 450, speed: 40, move: 'hover', fire: 'ring16', rate: 0.5, bs: 105, b: 'eb_ring', c: 'yellow', drops: [{ kind: 'shield', chance: 0.25 }] }),
  mk(A, 'a_turret', 'Citadel Turret', 'gr_turret', 'crimson', { hp: 70, speed: 0, move: 'ground', fire: 'burst', rate: 0.7, bs: 140, b: 'eb_orb', c: 'orange' }),
  mk(A, 'a_rampart', 'Rampart Twin', 'gr_twin', 'violet', { hp: 90, speed: 0, move: 'ground', fire: 'spread5', rate: 0.55, bs: 125, b: 'eb_orb', c: 'yellow' }),
  mk(A, 'a_tank', 'Enforcer Tank', 'gr_tank', 'toxic', { hp: 80, speed: 24, move: 'groundMove', fire: 'burst', rate: 0.6, bs: 135, b: 'eb_orb', c: 'cyan' }),
  mk(A, 'a_bunker', 'Core Bunker', 'gr_bunker', 'toxic', { hp: 400, speed: 0, move: 'ground', fire: 'ring16', rate: 0.4, bs: 95, b: 'eb_ring', c: 'pink', drops: [{ kind: 'armor', chance: 0.25 }] }),
  mk(A, 'a_silo', 'Purge Silo', 'gr_silo', 'violet', { hp: 90, speed: 0, move: 'ground', fire: 'missile', rate: 0.4, bs: 90, b: 'eb_missile', c: 'orange' }),
  mk(A, 'a_relay', 'Uplink Node', 'gr_radar', 'toxic', { hp: 14, speed: 0, move: 'ground', drops: INTEL_DROP, loot: true }),
  mk(A, 'a_loot', 'Scavenger Disc', 'en_saucer', 'crimson', { hp: 14, speed: 80, move: 'strafe', drops: LOOT_POWER_ARMOR, loot: true }),
  mk(A, 'a_frigate', 'Prefect Frigate', 'en_frigate', 'crimson', { hp: 4000, speed: 24, move: 'hover', fire: 'spiral', rate: 6, bs: 110, b: 'eb_dot', c: 'pink', credits: 2200, drops: MIDBOSS_DROP }),
];

/** Every enemy type, in campaign order (planet by planet). */
export const ENEMIES: EnemyDef[] = [...KESSRA, ...VERDANCE, ...THALASSA, ...UMBRA, ...CINDER, ...GLACIA, ...RIFT, ...AXIOM];

/** Planet tier (0..7) of an enemy id, from its prefix. */
export function enemyTier(id: string): number {
  return Math.max(0, 'kvtucgra'.indexOf(id.charAt(0)));
}
