// =====================================================================================
//  BOSSES — one per planet, fought at the end of level 3. Bosses face DOWN (towards the
//  player); offsets are px from the body centre, +y = down. Body size = BOSS_SPRITES value
//  (square bounding box); every part / muzzle sits inside it. Phases escalate: new bullet
//  patterns each phase, minion spawns (air units of the planet roster) in later phases.
//  HP curve 3500 -> 40000 (x1.42 per planet), see docs/BALANCE.md "Bosses". Body palettes
//  contrast with the planet's terrain (PLANET_PALETTES).
// =====================================================================================
import type { BossAttack, BossDef } from '../types';

type Muzzle = [number, number];
const atk = (
  fire: BossAttack['fire'], rate: number, bulletSpeed: number, bulletSprite: string, bulletColor: BossAttack['bulletColor'],
  from?: Muzzle,
): BossAttack => (from ? { fire, rate, bulletSpeed, bulletSprite, bulletColor, from } : { fire, rate, bulletSpeed, bulletSprite, bulletColor });

export const BOSSES: BossDef[] = [
  {
    id: 'colossus', name: 'Sandmaw Colossus', title: 'Siege Crawler of Kessra', sprite: 'boss_colossus', palette: 'crimson',
    hp: 3500, score: 21000, credits: 380,
    phases: [
      {
        untilHp: 0.6, move: 'anchor', speed: 20,
        attacks: [atk('spread5', 0.45, 85, 'eb_orb', 'pink', [0, 44]), atk('down', 1, 110, 'eb_dot', 'red', [-44, 40]), atk('down', 1, 110, 'eb_dot', 'red', [44, 40])],
      },
      {
        untilHp: 0.3, move: 'hoverSway', speed: 30,
        attacks: [atk('ring8', 0.5, 80, 'eb_orb', 'violet', [0, 0]), atk('burst', 0.6, 110, 'eb_dot', 'pink', [0, 44])],
        spawn: { enemy: 'k_mite', every: 6 },
      },
      {
        untilHp: 0, move: 'sweep', speed: 45,
        attacks: [atk('spiral', 5, 90, 'eb_dot', 'pink', [0, 10]), atk('spread5', 0.55, 100, 'eb_ring', 'red', [0, 44])],
        spawn: { enemy: 'k_dart', every: 5 },
      },
    ],
    parts: [
      { sprite: 'part_cannon', offset: [0, 34], hp: 420, attack: atk('spread3', 0.6, 95, 'eb_orb', 'pink') },
      { sprite: 'part_turret', offset: [-38, 12], hp: 260, attack: atk('aimed', 0.7, 100, 'eb_dot', 'violet') },
      { sprite: 'part_turret', offset: [38, 12], hp: 260, attack: atk('aimed', 0.7, 100, 'eb_dot', 'violet') },
      { sprite: 'part_core', offset: [0, -14], hp: 0 },
    ],
  },
  {
    id: 'hydra', name: 'Thornback Hydra', title: 'Reaper of Verdance', sprite: 'boss_hydra', palette: 'amber',
    hp: 4960, score: 30000, credits: 620,
    phases: [
      {
        untilHp: 0.65, move: 'hoverSway', speed: 25,
        attacks: [atk('spread5', 0.5, 90, 'eb_orb', 'red', [0, 30]), atk('down', 1.2, 115, 'eb_dot', 'orange', [-20, 44]), atk('down', 1.2, 115, 'eb_dot', 'orange', [20, 44])],
      },
      {
        untilHp: 0.3, move: 'figure8', speed: 35,
        attacks: [atk('spiral', 4, 90, 'eb_dot', 'pink', [0, 0]), atk('burst', 0.7, 120, 'eb_needle', 'red', [0, 40])],
        spawn: { enemy: 'v_diver', every: 5 },
      },
      {
        untilHp: 0, move: 'sweep', speed: 50,
        attacks: [atk('ring16', 0.45, 85, 'eb_orb', 'orange', [0, 0]), atk('missile', 0.3, 75, 'eb_missile', 'orange', [0, 30]), atk('spread3', 0.9, 120, 'eb_orb', 'red', [0, 44])],
        spawn: { enemy: 'v_mite', every: 4 },
      },
    ],
    parts: [
      { sprite: 'part_turret', offset: [-36, 26], hp: 360, attack: atk('aimed', 0.8, 105, 'eb_orb', 'red') },
      { sprite: 'part_turret', offset: [0, 38], hp: 400, attack: atk('spread3', 0.6, 100, 'eb_orb', 'pink') },
      { sprite: 'part_turret', offset: [36, 26], hp: 360, attack: atk('aimed', 0.8, 105, 'eb_orb', 'red') },
      { sprite: 'part_wing', offset: [-38, -22], hp: 0 },
      { sprite: 'part_wing', offset: [38, -22], hp: 0 },
    ],
  },
  {
    id: 'dreadnought', name: 'Brine Dreadnought', title: 'Tyrant of Thalassa', sprite: 'boss_dreadnought', palette: 'crimson',
    hp: 7030, score: 42000, credits: 850,
    phases: [
      {
        untilHp: 0.7, move: 'anchor', speed: 18,
        attacks: [atk('spread5', 0.5, 95, 'eb_orb', 'orange', [0, 56]), atk('down', 1.4, 125, 'eb_needle', 'yellow', [-30, 50]), atk('down', 1.4, 125, 'eb_needle', 'yellow', [30, 50])],
      },
      {
        untilHp: 0.4, move: 'sweep', speed: 30,
        attacks: [atk('ring8', 0.6, 90, 'eb_dot', 'orange', [0, 0]), atk('burst', 0.8, 125, 'eb_needle', 'yellow', [0, 56])],
        spawn: { enemy: 't_dart', every: 5 },
      },
      {
        untilHp: 0, move: 'charge', speed: 55,
        attacks: [atk('ring16', 0.5, 90, 'eb_ring', 'orange', [0, 0]), atk('spiral', 5, 100, 'eb_dot', 'yellow', [0, 20])],
        spawn: { enemy: 't_hornet', every: 5 },
      },
    ],
    parts: [
      { sprite: 'part_cannon', offset: [0, -38], hp: 520, attack: atk('flak', 0.4, 85, 'eb_orb', 'red') },
      { sprite: 'part_cannon', offset: [0, 16], hp: 520, attack: atk('spread3', 0.6, 105, 'eb_orb', 'orange') },
      { sprite: 'part_turret', offset: [-24, 46], hp: 320, attack: atk('aimed', 0.8, 115, 'eb_dot', 'orange') },
      { sprite: 'part_turret', offset: [24, 46], hp: 320, attack: atk('aimed', 0.8, 115, 'eb_dot', 'orange') },
      { sprite: 'part_pod', offset: [-26, -10], hp: 280, attack: atk('missile', 0.25, 75, 'eb_missile', 'yellow') },
      { sprite: 'part_pod', offset: [26, -10], hp: 280, attack: atk('missile', 0.25, 75, 'eb_missile', 'yellow') },
    ],
  },
  {
    id: 'hive', name: 'Gloam Matriarch', title: 'Queen of Umbra Deep', sprite: 'boss_hive', palette: 'toxic',
    hp: 9950, score: 60000, credits: 1100,
    phases: [
      {
        untilHp: 0.7, move: 'hoverSway', speed: 25,
        attacks: [atk('spread5', 0.55, 95, 'eb_orb', 'orange', [0, 40]), atk('down', 1.2, 120, 'eb_needle', 'yellow', [0, 46])],
        spawn: { enemy: 'u_mite', every: 4 },
      },
      {
        untilHp: 0.4, move: 'figure8', speed: 35,
        attacks: [atk('spiral', 6, 90, 'eb_dot', 'pink', [0, 4]), atk('burst', 0.7, 125, 'eb_needle', 'yellow', [0, 44])],
        spawn: { enemy: 'u_diver', every: 4 },
      },
      {
        untilHp: 0, move: 'charge', speed: 50,
        attacks: [atk('ring16', 0.55, 85, 'eb_orb', 'orange', [0, 4]), atk('laser', 0.25, 260, 'eb_laser', 'yellow', [0, 46]), atk('flak', 0.35, 85, 'eb_orb', 'pink', [0, 30])],
        spawn: { enemy: 'u_diver', every: 3 },
      },
    ],
    parts: [
      { sprite: 'part_pod', offset: [-34, -22], hp: 450, attack: atk('ring8', 0.3, 80, 'eb_dot', 'pink') },
      { sprite: 'part_pod', offset: [34, -22], hp: 450, attack: atk('ring8', 0.3, 80, 'eb_dot', 'pink') },
      { sprite: 'part_pod', offset: [-30, 26], hp: 450, attack: atk('aimed', 0.6, 110, 'eb_orb', 'orange') },
      { sprite: 'part_pod', offset: [30, 26], hp: 450, attack: atk('aimed', 0.6, 110, 'eb_orb', 'orange') },
      { sprite: 'part_core', offset: [0, 4], hp: 0 },
    ],
  },
  {
    id: 'forge', name: 'Crucible Forge', title: 'Heart of Cinder', sprite: 'boss_forge', palette: 'steel',
    hp: 14080, score: 85000, credits: 1500,
    phases: [
      {
        untilHp: 0.75, move: 'anchor', speed: 18,
        attacks: [atk('spread5', 0.55, 100, 'eb_orb', 'white', [0, 44]), atk('down', 1.6, 130, 'eb_needle', 'cyan', [-20, 46]), atk('down', 1.6, 130, 'eb_needle', 'cyan', [20, 46])],
      },
      {
        untilHp: 0.5, move: 'hoverSway', speed: 28,
        attacks: [atk('ring16', 0.4, 85, 'eb_ring', 'white', [0, 0]), atk('aimed', 1.2, 140, 'eb_orb', 'cyan', [0, 44])],
        spawn: { enemy: 'c_comet', every: 5 },
      },
      {
        untilHp: 0.25, move: 'sweep', speed: 40,
        attacks: [atk('spiral', 6, 100, 'eb_dot', 'violet', [0, 0]), atk('missile', 0.4, 80, 'eb_missile', 'yellow', [0, 30])],
        spawn: { enemy: 'c_dart', every: 4 },
      },
      {
        untilHp: 0, move: 'charge', speed: 60,
        attacks: [atk('ring16', 0.6, 95, 'eb_bigorb', 'yellow', [0, 0]), atk('spread5', 0.8, 120, 'eb_orb', 'cyan', [0, 44]), atk('laser', 0.3, 260, 'eb_laser', 'white', [0, 46])],
        spawn: { enemy: 'c_comet', every: 3 },
      },
    ],
    parts: [
      { sprite: 'part_cannon', offset: [-34, 24], hp: 650, attack: atk('flak', 0.35, 85, 'eb_orb', 'cyan') },
      { sprite: 'part_cannon', offset: [34, 24], hp: 650, attack: atk('flak', 0.35, 85, 'eb_orb', 'cyan') },
      { sprite: 'part_wing', offset: [-38, -18], hp: 600 },
      { sprite: 'part_wing', offset: [38, -18], hp: 600 },
      { sprite: 'part_core', offset: [0, 26], hp: 900, attack: atk('laser', 0.2, 260, 'eb_laser', 'white') },
    ],
  },
  {
    id: 'cryo', name: 'Rime Sentinel', title: 'Keeper of Glacia', sprite: 'boss_cryo', palette: 'violet',
    hp: 19940, score: 120000, credits: 2050,
    phases: [
      {
        untilHp: 0.7, move: 'hoverSway', speed: 30,
        attacks: [atk('spread5', 0.65, 115, 'eb_needle', 'red', [0, 40]), atk('laser', 0.22, 260, 'eb_laser', 'pink', [0, 44])],
      },
      {
        untilHp: 0.4, move: 'figure8', speed: 40,
        attacks: [atk('ring16', 0.5, 90, 'eb_orb', 'violet', [0, 0]), atk('aimed', 1.4, 150, 'eb_needle', 'red', [0, 40])],
        spawn: { enemy: 'g_wasp', every: 5 },
      },
      {
        untilHp: 0, move: 'sweep', speed: 55,
        attacks: [atk('spiral', 8, 105, 'eb_dot', 'pink', [0, 0]), atk('laser', 0.35, 260, 'eb_laser', 'red', [-30, 40]), atk('flak', 0.5, 90, 'eb_orb', 'orange', [0, 30])],
        spawn: { enemy: 'g_mite', every: 3 },
      },
    ],
    parts: [
      { sprite: 'part_wing', offset: [-34, 0], hp: 750, attack: atk('spread3', 0.5, 115, 'eb_needle', 'pink') },
      { sprite: 'part_wing', offset: [34, 0], hp: 750, attack: atk('spread3', 0.5, 115, 'eb_needle', 'pink') },
      { sprite: 'part_turret', offset: [-20, 34], hp: 520, attack: atk('burst', 0.7, 135, 'eb_needle', 'red') },
      { sprite: 'part_turret', offset: [20, 34], hp: 520, attack: atk('burst', 0.7, 135, 'eb_needle', 'red') },
      { sprite: 'part_core', offset: [0, -8], hp: 0 },
    ],
  },
  {
    id: 'voidcarrier', name: 'Nyx Voidcarrier', title: 'Shepherd of the Rift', sprite: 'boss_voidcarrier', palette: 'steel',
    hp: 28240, score: 170000, credits: 2800,
    phases: [
      {
        untilHp: 0.75, move: 'anchor', speed: 20,
        attacks: [atk('spread5', 0.7, 120, 'eb_orb', 'pink', [0, 56])],
        spawn: { enemy: 'r_dart', every: 4 },
      },
      {
        untilHp: 0.5, move: 'hoverSway', speed: 30,
        attacks: [atk('ring16', 0.5, 95, 'eb_ring', 'red', [0, 0]), atk('burst', 0.9, 145, 'eb_needle', 'orange', [0, 56])],
        spawn: { enemy: 'r_comet', every: 4 },
      },
      {
        untilHp: 0.25, move: 'sweep', speed: 45,
        attacks: [atk('spiral', 8, 105, 'eb_dot', 'pink', [0, 0]), atk('missile', 0.5, 85, 'eb_missile', 'orange', [0, 40])],
        spawn: { enemy: 'r_mite', every: 3 },
      },
      {
        untilHp: 0, move: 'charge', speed: 60,
        attacks: [atk('laser', 0.35, 260, 'eb_laser', 'red', [0, 60]), atk('ring16', 0.6, 100, 'eb_orb', 'yellow', [0, 0]), atk('flak', 0.55, 95, 'eb_orb', 'orange', [0, 40])],
        spawn: { enemy: 'r_comet', every: 2.5 },
      },
    ],
    parts: [
      { sprite: 'part_pod', offset: [-40, -30], hp: 900, attack: atk('missile', 0.3, 85, 'eb_missile', 'orange') },
      { sprite: 'part_pod', offset: [40, -30], hp: 900, attack: atk('missile', 0.3, 85, 'eb_missile', 'orange') },
      { sprite: 'part_pod', offset: [-40, 18], hp: 900, attack: atk('ring8', 0.35, 85, 'eb_dot', 'yellow') },
      { sprite: 'part_pod', offset: [40, 18], hp: 900, attack: atk('ring8', 0.35, 85, 'eb_dot', 'yellow') },
      { sprite: 'part_cannon', offset: [-16, 48], hp: 1100, attack: atk('spread3', 0.7, 125, 'eb_orb', 'red') },
      { sprite: 'part_cannon', offset: [16, 48], hp: 1100, attack: atk('spread3', 0.7, 125, 'eb_orb', 'red') },
    ],
  },
  {
    id: 'architect', name: 'The Architect', title: 'Mind of the Directorate', sprite: 'boss_architect', palette: 'crimson',
    hp: 40000, score: 250000, credits: 3750,
    phases: [
      {
        untilHp: 0.75, move: 'hoverSway', speed: 28,
        attacks: [atk('spread5', 0.8, 120, 'eb_orb', 'orange', [0, 50]), atk('down', 2, 150, 'eb_needle', 'cyan', [-24, 56]), atk('down', 2, 150, 'eb_needle', 'cyan', [24, 56])],
      },
      {
        untilHp: 0.5, move: 'figure8', speed: 38,
        attacks: [atk('spiral', 9, 110, 'eb_dot', 'pink', [0, 0]), atk('ring16', 0.5, 100, 'eb_ring', 'yellow', [0, 0])],
        spawn: { enemy: 'a_mite', every: 4 },
      },
      {
        untilHp: 0.25, move: 'sweep', speed: 50,
        attacks: [atk('laser', 0.4, 260, 'eb_laser', 'orange', [0, 58]), atk('missile', 0.5, 90, 'eb_missile', 'orange', [0, 30]), atk('burst', 1.2, 155, 'eb_needle', 'yellow', [0, 50])],
        spawn: { enemy: 'a_comet', every: 3.5 },
      },
      {
        untilHp: 0, move: 'charge', speed: 65,
        attacks: [
          atk('ring16', 0.55, 105, 'eb_orb', 'pink', [0, 0]), atk('spiral', 8, 115, 'eb_dot', 'cyan', [0, 0]),
          atk('flak', 0.45, 100, 'eb_orb', 'orange', [0, 40]), atk('spread5', 0.75, 130, 'eb_ring', 'yellow', [0, 50]),
        ],
        spawn: { enemy: 'a_hornet', every: 3 },
      },
    ],
    parts: [
      { sprite: 'part_wing', offset: [-46, -10], hp: 1400, attack: atk('spread3', 0.6, 130, 'eb_orb', 'yellow') },
      { sprite: 'part_wing', offset: [46, -10], hp: 1400, attack: atk('spread3', 0.6, 130, 'eb_orb', 'yellow') },
      { sprite: 'part_turret', offset: [-30, 38], hp: 1000, attack: atk('burst', 0.9, 150, 'eb_needle', 'orange') },
      { sprite: 'part_turret', offset: [30, 38], hp: 1000, attack: atk('burst', 0.9, 150, 'eb_needle', 'orange') },
      { sprite: 'part_cannon', offset: [0, 48], hp: 1500, attack: atk('spread5', 0.6, 125, 'eb_ring', 'pink') },
      { sprite: 'part_core', offset: [0, -26], hp: 0 },
    ],
  },
];
