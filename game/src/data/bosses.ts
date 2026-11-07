// =====================================================================================
//  BOSSES — one per planet, fought at the end of level 3. Bosses face DOWN (towards the
//  player); offsets are px from the body centre, +y = down. Parts sit exactly on the
//  sockets drawn on each body and attacks fire from the body's muzzles (BOSS_MOUNTS, the
//  boss artist's metadata), so the positions follow the art. Phases escalate: new bullet
//  patterns each phase, minion spawns (air units of the planet roster) in later phases.
//  HP curve 3500 -> 40000 (x1.42 per planet), see docs/BALANCE.md "Bosses". Body palettes
//  contrast with the planet's terrain (PLANET_PALETTES).
// =====================================================================================
import type { BossAttack, BossDef } from '../types';
import type { BossSprite } from '../art/keys';
import { BOSS_MOUNTS } from '../art/b_boss_mounts';

type XY = [number, number];
type Socket = 'turret' | 'cannon' | 'pod' | 'core' | 'wing' | 'muzzle';

/** Copy of socket `i` of a boss body (falls back to the centre; validateContent flags it). */
function at(sprite: BossSprite, kind: Socket, i: number): XY {
  const p = BOSS_MOUNTS[sprite]?.[kind]?.[i];
  return p ? [p[0], p[1]] : [0, 0];
}

const atk = (
  fire: BossAttack['fire'], rate: number, bulletSpeed: number, bulletSprite: string, bulletColor: BossAttack['bulletColor'],
  from?: XY,
): BossAttack => (from ? { fire, rate, bulletSpeed, bulletSprite, bulletColor, from } : { fire, rate, bulletSpeed, bulletSprite, bulletColor });

// ------------------------------------------------------------------ socket shorthands
const COL = (k: Socket, i: number) => at('boss_colossus', k, i);
const HYD = (k: Socket, i: number) => at('boss_hydra', k, i);
const DRE = (k: Socket, i: number) => at('boss_dreadnought', k, i);
const HIV = (k: Socket, i: number) => at('boss_hive', k, i);
const FOR = (k: Socket, i: number) => at('boss_forge', k, i);
const CRY = (k: Socket, i: number) => at('boss_cryo', k, i);
const VOI = (k: Socket, i: number) => at('boss_voidcarrier', k, i);
const ARC = (k: Socket, i: number) => at('boss_architect', k, i);

export const BOSSES: BossDef[] = [
  {
    // desert crawler fortress: twin side turrets, missile pods, twin bow guns
    id: 'colossus', name: 'Sandmaw Colossus', title: 'Siege Crawler of Kessra', sprite: 'boss_colossus', palette: 'crimson',
    hp: 3000, score: 21000, credits: 380,
    phases: [
      {
        untilHp: 0.6, move: 'anchor', speed: 20,
        attacks: [atk('spread5', 0.45, 85, 'eb_orb', 'pink', COL('muzzle', 0)), atk('down', 0.9, 110, 'eb_dot', 'red', COL('muzzle', 1))],
      },
      {
        untilHp: 0.3, move: 'hoverSway', speed: 30,
        attacks: [atk('ring8', 0.5, 80, 'eb_orb', 'violet', COL('core', 0)), atk('burst', 0.6, 110, 'eb_dot', 'pink', COL('muzzle', 0))],
        spawn: { enemy: 'k_mite', every: 6 },
      },
      {
        untilHp: 0, move: 'sweep', speed: 45,
        attacks: [atk('spiral', 5, 90, 'eb_dot', 'pink', COL('core', 0)), atk('spread5', 0.55, 100, 'eb_ring', 'red', COL('muzzle', 1))],
        spawn: { enemy: 'k_dart', every: 5 },
      },
    ],
    parts: [
      { sprite: 'part_turret', offset: COL('turret', 0), hp: 220, attack: atk('aimed', 0.7, 100, 'eb_dot', 'violet') },
      { sprite: 'part_turret', offset: COL('turret', 1), hp: 220, attack: atk('aimed', 0.7, 100, 'eb_dot', 'violet') },
      { sprite: 'part_pod', offset: COL('pod', 0), hp: 190, attack: atk('missile', 0.2, 70, 'eb_missile', 'pink') },
      { sprite: 'part_pod', offset: COL('pod', 1), hp: 190, attack: atk('missile', 0.2, 70, 'eb_missile', 'pink') },
      { sprite: 'part_core', offset: COL('core', 0), hp: 0 },
    ],
  },
  {
    // jungle gun platform: five heads (muzzles), shoulder turrets, spore pods
    id: 'hydra', name: 'Thornback Hydra', title: 'Reaper of Verdance', sprite: 'boss_hydra', palette: 'amber',
    hp: 5350, score: 30000, credits: 620,
    phases: [
      {
        untilHp: 0.65, move: 'hoverSway', speed: 25,
        attacks: [
          atk('spread3', 0.5, 95, 'eb_orb', 'red', HYD('muzzle', 1)), atk('spread3', 0.5, 95, 'eb_orb', 'red', HYD('muzzle', 3)),
          atk('down', 1.2, 115, 'eb_dot', 'orange', HYD('muzzle', 2)),
        ],
      },
      {
        untilHp: 0.3, move: 'figure8', speed: 35,
        attacks: [
          atk('spiral', 4, 90, 'eb_dot', 'pink', HYD('muzzle', 2)),
          atk('burst', 0.7, 120, 'eb_needle', 'red', HYD('muzzle', 0)), atk('burst', 0.7, 120, 'eb_needle', 'red', HYD('muzzle', 4)),
        ],
        spawn: { enemy: 'v_diver', every: 5 },
      },
      {
        untilHp: 0, move: 'sweep', speed: 50,
        attacks: [
          atk('ring16', 0.45, 85, 'eb_orb', 'orange', HYD('core', 0)), atk('spread5', 0.6, 110, 'eb_orb', 'red', HYD('muzzle', 2)),
          atk('aimed', 1, 125, 'eb_needle', 'pink', HYD('muzzle', 1)), atk('aimed', 1, 125, 'eb_needle', 'pink', HYD('muzzle', 3)),
        ],
        spawn: { enemy: 'v_mite', every: 4 },
      },
    ],
    parts: [
      { sprite: 'part_turret', offset: HYD('turret', 0), hp: 390, attack: atk('aimed', 0.8, 105, 'eb_orb', 'red') },
      { sprite: 'part_turret', offset: HYD('turret', 1), hp: 390, attack: atk('aimed', 0.8, 105, 'eb_orb', 'red') },
      { sprite: 'part_pod', offset: HYD('pod', 0), hp: 330, attack: atk('missile', 0.22, 75, 'eb_missile', 'orange') },
      { sprite: 'part_pod', offset: HYD('pod', 1), hp: 330, attack: atk('missile', 0.22, 75, 'eb_missile', 'orange') },
      { sprite: 'part_core', offset: HYD('core', 0), hp: 0 },
    ],
  },
  {
    // ocean battleship: fore / aft cannons, four deck turrets, triple bow muzzles
    id: 'dreadnought', name: 'Brine Dreadnought', title: 'Tyrant of Thalassa', sprite: 'boss_dreadnought', palette: 'crimson',
    hp: 5400, score: 42000, credits: 850,
    phases: [
      {
        untilHp: 0.7, move: 'anchor', speed: 18,
        attacks: [
          atk('spread5', 0.5, 95, 'eb_orb', 'orange', DRE('muzzle', 1)),
          atk('down', 1.4, 125, 'eb_needle', 'yellow', DRE('muzzle', 0)), atk('down', 1.4, 125, 'eb_needle', 'yellow', DRE('muzzle', 2)),
        ],
      },
      {
        untilHp: 0.4, move: 'sweep', speed: 30,
        attacks: [atk('ring8', 0.6, 90, 'eb_dot', 'orange', DRE('core', 0)), atk('burst', 0.8, 125, 'eb_needle', 'yellow', DRE('muzzle', 1))],
        spawn: { enemy: 't_dart', every: 5 },
      },
      {
        untilHp: 0, move: 'charge', speed: 55,
        attacks: [atk('ring16', 0.5, 90, 'eb_ring', 'orange', DRE('core', 0)), atk('spiral', 5, 100, 'eb_dot', 'yellow', DRE('muzzle', 1))],
        spawn: { enemy: 't_hornet', every: 5 },
      },
    ],
    parts: [
      { sprite: 'part_cannon', offset: DRE('cannon', 0), hp: 400, attack: atk('spread3', 0.6, 105, 'eb_orb', 'orange') },
      { sprite: 'part_cannon', offset: DRE('cannon', 1), hp: 400, attack: atk('flak', 0.4, 85, 'eb_orb', 'red') },
      { sprite: 'part_turret', offset: DRE('turret', 2), hp: 240, attack: atk('aimed', 0.8, 115, 'eb_dot', 'orange') },
      { sprite: 'part_turret', offset: DRE('turret', 3), hp: 240, attack: atk('aimed', 0.8, 115, 'eb_dot', 'orange') },
      { sprite: 'part_turret', offset: DRE('turret', 0), hp: 230, attack: atk('burst', 0.5, 120, 'eb_dot', 'yellow') },
      { sprite: 'part_turret', offset: DRE('turret', 1), hp: 230, attack: atk('burst', 0.5, 120, 'eb_dot', 'yellow') },
    ],
  },
  {
    // cavern hive mother: egg pods spraying rings, mandible turrets, brood maw
    id: 'hive', name: 'Gloam Matriarch', title: 'Mother of the Hive', sprite: 'boss_hive', palette: 'toxic',
    hp: 6400, score: 60000, credits: 1100,
    phases: [
      {
        untilHp: 0.7, move: 'hoverSway', speed: 25,
        attacks: [atk('spread5', 0.55, 95, 'eb_orb', 'orange', HIV('muzzle', 0)), atk('down', 1.2, 120, 'eb_needle', 'yellow', HIV('muzzle', 1))],
        spawn: { enemy: 'u_mite', every: 4 },
      },
      {
        untilHp: 0.4, move: 'figure8', speed: 35,
        attacks: [atk('spiral', 6, 90, 'eb_dot', 'pink', HIV('muzzle', 0)), atk('burst', 0.7, 125, 'eb_needle', 'yellow', HIV('muzzle', 2))],
        spawn: { enemy: 'u_diver', every: 4 },
      },
      {
        untilHp: 0, move: 'charge', speed: 50,
        attacks: [
          atk('ring16', 0.55, 85, 'eb_orb', 'orange', HIV('core', 0)), atk('laser', 0.25, 260, 'eb_laser', 'yellow', HIV('muzzle', 0)),
          atk('flak', 0.35, 85, 'eb_orb', 'pink', HIV('muzzle', 1)),
        ],
        spawn: { enemy: 'u_diver', every: 3 },
      },
    ],
    parts: [
      { sprite: 'part_pod', offset: HIV('pod', 0), hp: 290, attack: atk('ring8', 0.3, 80, 'eb_dot', 'pink') },
      { sprite: 'part_pod', offset: HIV('pod', 1), hp: 290, attack: atk('ring8', 0.3, 80, 'eb_dot', 'pink') },
      { sprite: 'part_turret', offset: HIV('turret', 0), hp: 270, attack: atk('aimed', 0.6, 110, 'eb_orb', 'orange') },
      { sprite: 'part_turret', offset: HIV('turret', 1), hp: 270, attack: atk('aimed', 0.6, 110, 'eb_orb', 'orange') },
      { sprite: 'part_core', offset: HIV('core', 0), hp: 0 },
    ],
  },
  {
    // lava forge reactor: four flak / needle turrets around a glowing core
    id: 'forge', name: 'Crucible Forge', title: 'Heart of Cinder', sprite: 'boss_forge', palette: 'steel',
    hp: 12400, score: 85000, credits: 1500,
    phases: [
      {
        untilHp: 0.75, move: 'anchor', speed: 18,
        attacks: [
          atk('spread5', 0.55, 100, 'eb_orb', 'white', FOR('muzzle', 0)),
          atk('down', 1.6, 130, 'eb_needle', 'cyan', FOR('muzzle', 1)), atk('down', 1.6, 130, 'eb_needle', 'cyan', FOR('muzzle', 2)),
        ],
      },
      {
        untilHp: 0.5, move: 'hoverSway', speed: 28,
        attacks: [atk('ring16', 0.4, 85, 'eb_ring', 'white', FOR('core', 0)), atk('aimed', 1.2, 140, 'eb_orb', 'cyan', FOR('muzzle', 0))],
        spawn: { enemy: 'c_comet', every: 5 },
      },
      {
        untilHp: 0.25, move: 'sweep', speed: 40,
        attacks: [atk('spiral', 6, 100, 'eb_dot', 'violet', FOR('core', 0)), atk('missile', 0.4, 80, 'eb_missile', 'yellow', FOR('muzzle', 0))],
        spawn: { enemy: 'c_dart', every: 4 },
      },
      {
        untilHp: 0, move: 'charge', speed: 60,
        attacks: [
          atk('ring16', 0.6, 95, 'eb_bigorb', 'yellow', FOR('core', 0)), atk('spread5', 0.8, 120, 'eb_orb', 'cyan', FOR('muzzle', 0)),
          atk('laser', 0.3, 260, 'eb_laser', 'white', FOR('muzzle', 0)),
        ],
        spawn: { enemy: 'c_comet', every: 3 },
      },
    ],
    parts: [
      { sprite: 'part_turret', offset: FOR('turret', 2), hp: 540, attack: atk('flak', 0.35, 85, 'eb_orb', 'cyan') },
      { sprite: 'part_turret', offset: FOR('turret', 3), hp: 540, attack: atk('flak', 0.35, 85, 'eb_orb', 'cyan') },
      { sprite: 'part_turret', offset: FOR('turret', 0), hp: 440, attack: atk('aimed', 0.8, 130, 'eb_needle', 'white') },
      { sprite: 'part_turret', offset: FOR('turret', 1), hp: 440, attack: atk('aimed', 0.8, 130, 'eb_needle', 'white') },
      { sprite: 'part_core', offset: FOR('core', 0), hp: 0 },
    ],
  },
  {
    // ice crystal sentinel: crystal wings, brow turrets, five prism muzzles
    id: 'cryo', name: 'Rime Sentinel', title: 'Keeper of Glacia', sprite: 'boss_cryo', palette: 'violet',
    hp: 17250, score: 120000, credits: 2050,
    phases: [
      {
        untilHp: 0.7, move: 'hoverSway', speed: 30,
        attacks: [atk('spread5', 0.65, 115, 'eb_needle', 'red', CRY('muzzle', 0)), atk('laser', 0.22, 260, 'eb_laser', 'pink', CRY('muzzle', 3))],
      },
      {
        untilHp: 0.4, move: 'figure8', speed: 40,
        attacks: [atk('ring16', 0.5, 90, 'eb_orb', 'violet', CRY('core', 0)), atk('aimed', 1.4, 150, 'eb_needle', 'red', CRY('muzzle', 4))],
        spawn: { enemy: 'g_wasp', every: 5 },
      },
      {
        untilHp: 0, move: 'sweep', speed: 55,
        attacks: [
          atk('spiral', 8, 105, 'eb_dot', 'pink', CRY('core', 0)), atk('laser', 0.35, 260, 'eb_laser', 'red', CRY('muzzle', 1)),
          atk('flak', 0.5, 90, 'eb_orb', 'orange', CRY('muzzle', 0)),
        ],
        spawn: { enemy: 'g_mite', every: 3 },
      },
    ],
    parts: [
      { sprite: 'part_wing', offset: CRY('wing', 0), hp: 650, attack: atk('spread3', 0.5, 115, 'eb_needle', 'pink') },
      { sprite: 'part_wing', offset: CRY('wing', 1), hp: 650, attack: atk('spread3', 0.5, 115, 'eb_needle', 'pink') },
      { sprite: 'part_turret', offset: CRY('turret', 0), hp: 460, attack: atk('burst', 0.7, 135, 'eb_needle', 'red') },
      { sprite: 'part_turret', offset: CRY('turret', 1), hp: 460, attack: atk('burst', 0.7, 135, 'eb_needle', 'red') },
      { sprite: 'part_core', offset: CRY('core', 0), hp: 0 },
    ],
  },
  {
    // space carrier: missile launch pods, wing plates, flank turrets, hangar maw (muzzle 2)
    id: 'voidcarrier', name: 'Vesper Voidcarrier', title: 'Shepherd of the Rift', sprite: 'boss_voidcarrier', palette: 'steel',
    hp: 22750, score: 170000, credits: 2800,
    phases: [
      {
        untilHp: 0.75, move: 'anchor', speed: 20,
        attacks: [atk('spread5', 0.7, 120, 'eb_orb', 'pink', VOI('muzzle', 2))],
        spawn: { enemy: 'r_dart', every: 4 },
      },
      {
        untilHp: 0.5, move: 'hoverSway', speed: 30,
        attacks: [
          atk('ring16', 0.5, 95, 'eb_ring', 'red', VOI('core', 0)),
          atk('burst', 0.9, 145, 'eb_needle', 'orange', VOI('muzzle', 0)), atk('burst', 0.9, 145, 'eb_needle', 'orange', VOI('muzzle', 1)),
        ],
        spawn: { enemy: 'r_comet', every: 4 },
      },
      {
        untilHp: 0.25, move: 'sweep', speed: 45,
        attacks: [atk('spiral', 8, 105, 'eb_dot', 'pink', VOI('core', 0)), atk('missile', 0.5, 85, 'eb_missile', 'orange', VOI('muzzle', 2))],
        spawn: { enemy: 'r_mite', every: 3 },
      },
      {
        untilHp: 0, move: 'charge', speed: 60,
        attacks: [
          atk('laser', 0.35, 260, 'eb_laser', 'red', VOI('muzzle', 2)), atk('ring16', 0.6, 100, 'eb_orb', 'yellow', VOI('core', 0)),
          atk('flak', 0.55, 95, 'eb_orb', 'orange', VOI('muzzle', 0)),
        ],
        spawn: { enemy: 'r_comet', every: 2.5 },
      },
    ],
    parts: [
      { sprite: 'part_pod', offset: VOI('pod', 0), hp: 730, attack: atk('missile', 0.3, 85, 'eb_missile', 'orange') },
      { sprite: 'part_pod', offset: VOI('pod', 1), hp: 730, attack: atk('missile', 0.3, 85, 'eb_missile', 'orange') },
      { sprite: 'part_turret', offset: VOI('turret', 2), hp: 800, attack: atk('spread3', 0.7, 125, 'eb_orb', 'red') },
      { sprite: 'part_turret', offset: VOI('turret', 3), hp: 800, attack: atk('spread3', 0.7, 125, 'eb_orb', 'red') },
      { sprite: 'part_wing', offset: VOI('wing', 0), hp: 650 },
      { sprite: 'part_wing', offset: VOI('wing', 1), hp: 650 },
    ],
  },
  {
    // techno core: glowing core, keel cannon, wing batteries, flank turrets
    id: 'architect', name: 'The Architect', title: 'Mind of the Directorate', sprite: 'boss_architect', palette: 'crimson',
    hp: 29000, score: 250000, credits: 3750,
    phases: [
      {
        untilHp: 0.75, move: 'hoverSway', speed: 28,
        attacks: [
          atk('spread5', 0.8, 120, 'eb_orb', 'orange', ARC('muzzle', 2)),
          atk('down', 2, 150, 'eb_needle', 'cyan', ARC('muzzle', 0)), atk('down', 2, 150, 'eb_needle', 'cyan', ARC('muzzle', 1)),
        ],
      },
      {
        untilHp: 0.5, move: 'figure8', speed: 38,
        attacks: [atk('spiral', 9, 110, 'eb_dot', 'pink', ARC('core', 0)), atk('ring16', 0.5, 100, 'eb_ring', 'yellow', ARC('core', 0))],
        spawn: { enemy: 'a_mite', every: 4 },
      },
      {
        untilHp: 0.25, move: 'sweep', speed: 50,
        attacks: [
          atk('laser', 0.4, 260, 'eb_laser', 'orange', ARC('muzzle', 2)), atk('missile', 0.5, 90, 'eb_missile', 'orange', ARC('muzzle', 0)),
          atk('burst', 1.2, 155, 'eb_needle', 'yellow', ARC('muzzle', 1)),
        ],
        spawn: { enemy: 'a_comet', every: 3.5 },
      },
      {
        untilHp: 0, move: 'charge', speed: 65,
        attacks: [
          atk('ring16', 0.55, 105, 'eb_orb', 'pink', ARC('core', 0)), atk('spiral', 8, 115, 'eb_dot', 'cyan', ARC('core', 0)),
          atk('flak', 0.45, 100, 'eb_orb', 'orange', ARC('muzzle', 2)), atk('spread5', 0.75, 130, 'eb_ring', 'yellow', ARC('muzzle', 0)),
        ],
        spawn: { enemy: 'a_hornet', every: 3 },
      },
    ],
    parts: [
      { sprite: 'part_core', offset: ARC('core', 0), hp: 0 },
      { sprite: 'part_cannon', offset: ARC('cannon', 0), hp: 1090, attack: atk('spread5', 0.6, 125, 'eb_ring', 'pink') },
      { sprite: 'part_wing', offset: ARC('wing', 0), hp: 1010, attack: atk('spread3', 0.6, 130, 'eb_orb', 'yellow') },
      { sprite: 'part_wing', offset: ARC('wing', 1), hp: 1010, attack: atk('spread3', 0.6, 130, 'eb_orb', 'yellow') },
      { sprite: 'part_turret', offset: ARC('turret', 2), hp: 730, attack: atk('burst', 0.9, 150, 'eb_needle', 'orange') },
      { sprite: 'part_turret', offset: ARC('turret', 3), hp: 730, attack: atk('burst', 0.9, 150, 'eb_needle', 'orange') },
    ],
  },
];
