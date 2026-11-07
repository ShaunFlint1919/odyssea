// UMBRA DEEP (cavern) — the prison mine. New threats: falling scree and cave-in boulders
// (drifting hazards), gloom eyes firing telegraphed vertical lasers (paired, they close
// lanes like gates), stalactite divers, crystal spinners, brood silos. Signature: the
// rock-fall under a laser gate.
import type { LevelDef } from '../../types';
import { arc, cols, convoy, convoys, cross, dives, duo, field, ground, one, snake, snakes, swoop, wall } from '../waves';
import { level } from './common';

export const UMBRA_LEVELS: LevelDef[] = [
  level({
    planet: 'umbra', index: 1, name: 'Gloam Descent', duration: 88, scrollSpeed: 46, intel: 'in_prison',
    briefing: 'Dive into the prison mine. Falling rock, cave eyes and brood swarms wait in the dark.',
    waves: [
      snakes(1, 'u_mite', 0.22, 5, 0.3),
      cols(2.8, 'u_wasp', 0.3, 3, 0.45),
      // teach: falling scree
      field(4.6, 'u_scree', 5, 5, 31),
      ground(6.4, 'u_turret', [0.2, 0.8]), snake(6.8, 'u_mite', 0.5, 6, 0.28),
      swoop(8.2, 'u_wasp', 4, 0.3),
      // teach: stalactite divers
      dives(10, 'u_diver', [0.3, 0.7], 0.4),
      convoy(11.6, 'u_crawler', 0.5, 3, 0.9), snake(12, 'u_mite', 0.2, 6, 0.28),
      // teach: gloom eye laser
      one(13.8, 'u_eye', 0.5),
      field(15.6, 'u_scree', 4, 4, 32), cols(16, 'u_wasp', 0.15, 3, 0.45),
      one(17.8, 'u_loot', 0.02, 'strafe'), wall(18.2, 'u_mite', 8, 30),
      ground(20, 'u_turret', [0.15, 0.5, 0.85]),
      dives(21.6, 'u_diver', [0.2, 0.4, 0.6, 0.8], 0.25),
      // teach: boulders
      one(23.4, 'u_boulder', 0.35), one(24, 'u_boulder', 0.7),
      swoop(25.6, 'u_wasp', 5, 0.26),
      convoys(27.4, 'u_crawler', 0.2, 3, 0.8), snake(27.8, 'u_mite', 0.5, 6, 0.28),
      duo(29.4, 'u_eye', 0.25),
      arc(31.2, 'u_mite', 0.5, 9, 24), field(31.6, 'u_scree', 5, 4, 33),
      one(33.4, 'u_spinner', 0.5),
      cross(35.2, 'u_wasp', 4, 0.42),
      // breather: relay with the intel
      ground(37.2, 'u_relay', [0.45]), snakes(37.6, 'u_mite', 0.2, 4, 0.32),
      dives(39.4, 'u_diver', [0.15, 0.5, 0.85], 0.25), ground(39.8, 'u_turret', [0.3, 0.7]),
      wall(41.6, 'u_mite', 9, 27),
      one(43.4, 'u_boulder', 0.5), field(43.8, 'u_scree', 4, 3, 34),
      duo(45.4, 'u_eye', 0.3), convoy(45.8, 'u_crawler', 0.5, 4, 0.7),
      swoop(47.6, 'u_wasp', 5, 0.25),
      // breather
      one(49.6, 'u_loot', 0.98, 'strafe'), snake(50, 'u_mite', 0.5, 6, 0.3),
      duo(51.8, 'u_spinner', 0.25),
      dives(53.6, 'u_diver', [0.25, 0.5, 0.75], 0.2), convoys(54, 'u_crawler', 0.15, 3, 0.7),
      field(55.8, 'u_scree', 6, 4, 35), cols(56.2, 'u_wasp', 0.2, 4, 0.38),
      ground(58, 'u_turret', [0.12, 0.38, 0.62, 0.88]),
      one(59.8, 'u_eye', 0.5), arc(60.2, 'u_mite', 0.5, 9, 24),
      duo(62, 'u_boulder', 0.25), snakes(62.4, 'u_mite', 0.15, 4, 0.3),
      cross(63.8, 'u_wasp', 5, 0.36),
      one(65.6, 'u_spinner', 0.3), one(66.2, 'u_spinner', 0.7),
      dives(68, 'u_diver', [0.2, 0.8], 0.2), wall(68.4, 'u_mite', 9, 27),
      convoy(70.2, 'u_crawler', 0.4, 4, 0.6), duo(70.6, 'u_eye', 0.2),
      snakes(72.4, 'u_mite', 0.3, 4, 0.3), field(72.8, 'u_scree', 4, 3, 36),
      // short breather
      cols(75, 'u_wasp', 0.25, 3, 0.42), one(75.4, 'u_loot', 0.02, 'strafe'),
      // crescendo
      duo(77.4, 'u_eye', 0.3), wall(77.6, 'u_mite', 9, 27),
      dives(79, 'u_diver', [0.15, 0.38, 0.62, 0.85], 0.18),
      swoop(80.4, 'u_wasp', 6, 0.22), ground(80.6, 'u_turret', [0.2, 0.8]),
      field(82, 'u_scree', 5, 3, 37), duo(82.2, 'u_spinner', 0.22),
      cross(83.6, 'u_wasp', 5, 0.34),
      arc(85, 'u_mite', 0.5, 9, 24), one(85.2, 'u_boulder', 0.5),
      dives(86.4, 'u_diver', [0.3, 0.7], 0.2),
    ],
  }),

  level({
    planet: 'umbra', index: 2, name: 'Crystal Throat', duration: 90, scrollSpeed: 48, intel: 'in_brood',
    midboss: { t: 54, enemy: 'u_frigate' },
    briefing: 'Crystal spinners choke the main shaft and a Gloam frigate holds the deep gallery.',
    waves: [
      snakes(1, 'u_mite', 0.2, 5, 0.3),
      duo(2.8, 'u_spinner', 0.3),
      ground(4.6, 'u_turret', [0.25, 0.75]), cols(5, 'u_wasp', 0.12, 3, 0.45),
      // teach: brood silo missiles
      ground(6.8, 'u_silo', [0.5]), field(7.2, 'u_scree', 5, 4, 41),
      dives(9, 'u_diver', [0.2, 0.4, 0.6, 0.8], 0.22),
      // the first laser gate
      duo(10.8, 'u_eye', 0.2),
      wall(12.6, 'u_mite', 9, 27),
      convoys(14.4, 'u_crawler', 0.2, 3, 0.8), swoop(14.8, 'u_wasp', 4, 0.3),
      one(16.6, 'u_loot', 0.02, 'strafe'), one(17, 'u_spinner', 0.5),
      field(18.6, 'u_boulder', 3, 4, 42), snake(19, 'u_mite', 0.5, 8, 0.24),
      ground(20.8, 'u_silo', [0.2, 0.8]), cross(21.2, 'u_wasp', 4, 0.42),
      duo(23, 'u_eye', 0.3), one(23.4, 'u_diver', 0.5, 'dive'),
      arc(25, 'u_mite', 0.5, 9, 24), ground(25.2, 'u_turret', [0.15, 0.85]),
      duo(26.8, 'u_spinner', 0.2), field(27.2, 'u_scree', 5, 3, 43),
      convoy(29, 'u_crawler', 0.5, 5, 0.6), cols(29.4, 'u_wasp', 0.3, 3, 0.4),
      dives(31, 'u_diver', [0.15, 0.35, 0.65, 0.85], 0.18),
      one(32.8, 'u_eye', 0.5), wall(33, 'u_mite', 9, 27),
      ground(34.8, 'u_silo', [0.35, 0.65]), swoop(35.2, 'u_wasp', 5, 0.26),
      field(37, 'u_boulder', 2, 3, 44), duo(37.4, 'u_spinner', 0.25),
      convoys(39.2, 'u_crawler', 0.15, 3, 0.7), snake(39.6, 'u_mite', 0.5, 7, 0.26),
      dives(41.4, 'u_diver', [0.3, 0.7], 0.25), ground(41.8, 'u_turret', [0.5]),
      cross(43.4, 'u_wasp', 5, 0.38),
      // breather: relay, then the frigate
      ground(45.6, 'u_relay', [0.55]), snakes(46, 'u_mite', 0.2, 4, 0.32),
      field(48, 'u_scree', 4, 3, 45), duo(48.4, 'u_eye', 0.22),
      one(50.2, 'u_spinner', 0.5), cols(50.6, 'u_wasp', 0.15, 3, 0.45),
      // mid-boss at 54 s: light escorts
      snakes(54.6, 'u_mite', 0.12, 5, 0.32),
      one(57, 'u_loot', 0.98, 'strafe'),
      field(59.2, 'u_scree', 4, 4, 46),
      snake(61.4, 'u_mite', 0.5, 6, 0.3),
      dives(63.6, 'u_diver', [0.15, 0.85], 0.3),
      snakes(65.8, 'u_mite', 0.3, 4, 0.3),
      // combine
      duo(68, 'u_spinner', 0.25), ground(68.2, 'u_silo', [0.5]),
      swoop(69.8, 'u_wasp', 5, 0.25), convoy(70.2, 'u_crawler', 0.6, 4, 0.6),
      duo(71.8, 'u_eye', 0.2), field(72.2, 'u_boulder', 2, 3, 47),
      dives(73.8, 'u_diver', [0.25, 0.5, 0.75], 0.2), wall(74, 'u_mite', 9, 27),
      // short breather
      cols(76.2, 'u_wasp', 0.2, 3, 0.42),
      // crescendo
      ground(78.4, 'u_turret', [0.2, 0.8]), duo(78.6, 'u_spinner', 0.3),
      dives(80, 'u_diver', [0.15, 0.38, 0.62, 0.85], 0.16), field(80.2, 'u_scree', 5, 3, 48),
      cross(81.6, 'u_wasp', 5, 0.34), one(81.8, 'u_eye', 0.5),
      wall(83.2, 'u_mite', 10, 24), ground(83.4, 'u_silo', [0.3, 0.7]),
      swoop(84.8, 'u_wasp', 6, 0.22),
      duo(86.4, 'u_eye', 0.25), snakes(86.6, 'u_mite', 0.18, 4, 0.26),
      dives(88, 'u_diver', [0.3, 0.5, 0.7], 0.2),
    ],
  }),

  level({
    planet: 'umbra', index: 3, name: 'The Brood Vault', duration: 92, scrollSpeed: 50, intel: 'in_halcyon',
    briefing: 'The Gloam Matriarch nests at the bottom of the world. Burn the brood before it wakes.',
    waves: [
      dives(1, 'u_diver', [0.3, 0.7], 0.3), snake(1.4, 'u_mite', 0.5, 6, 0.28),
      ground(3, 'u_turret', [0.2, 0.8]), field(3.4, 'u_scree', 4, 3, 51),
      swoop(4.8, 'u_wasp', 5, 0.26),
      duo(6.6, 'u_eye', 0.25), convoy(7, 'u_crawler', 0.5, 4, 0.7),
      wall(8.6, 'u_mite', 9, 27),
      duo(10.4, 'u_spinner', 0.3), ground(10.8, 'u_silo', [0.5]),
      dives(12.4, 'u_diver', [0.15, 0.38, 0.62, 0.85], 0.2),
      field(14.2, 'u_boulder', 3, 4, 52), cols(14.6, 'u_wasp', 0.2, 3, 0.42),
      one(16.4, 'u_loot', 0.02, 'strafe'), arc(16.8, 'u_mite', 0.5, 9, 24),
      convoys(18.4, 'u_crawler', 0.15, 4, 0.6), one(18.8, 'u_eye', 0.5),
      cross(20.4, 'u_wasp', 5, 0.38),
      ground(22.2, 'u_silo', [0.25, 0.75]), field(22.6, 'u_scree', 5, 3, 53),
      duo(24.2, 'u_spinner', 0.2), snakes(24.6, 'u_mite', 0.25, 5, 0.28),
      dives(26.2, 'u_diver', [0.2, 0.5, 0.8], 0.2), ground(26.6, 'u_turret', [0.35, 0.65]),
      duo(28.2, 'u_eye', 0.18), wall(28.4, 'u_mite', 9, 27),
      swoop(30, 'u_wasp', 6, 0.22),
      // breather: relay with the intel
      ground(32, 'u_relay', [0.4]), snake(32.4, 'u_mite', 0.7, 5, 0.32),
      field(34.2, 'u_boulder', 2, 3, 54), cols(34.6, 'u_wasp', 0.15, 3, 0.45),
      one(36.4, 'u_spinner', 0.5), convoy(36.8, 'u_crawler', 0.3, 5, 0.5),
      dives(38.4, 'u_diver', [0.15, 0.35, 0.65, 0.85], 0.16),
      ground(40.2, 'u_silo', [0.5]), duo(40.6, 'u_eye', 0.28),
      arc(42.2, 'u_mite', 0.5, 9, 24), field(42.6, 'u_scree', 5, 3, 55),
      cross(44.2, 'u_wasp', 5, 0.36),
      duo(46, 'u_spinner', 0.25), ground(46.4, 'u_turret', [0.12, 0.88]),
      // breather
      one(48.4, 'u_loot', 0.98, 'strafe'), snakes(48.8, 'u_mite', 0.3, 4, 0.3),
      dives(50.6, 'u_diver', [0.3, 0.7], 0.2), convoys(51, 'u_crawler', 0.2, 3, 0.6),
      duo(52.6, 'u_eye', 0.22), field(53, 'u_boulder', 3, 3, 56),
      swoop(54.6, 'u_wasp', 6, 0.22),
      ground(56.4, 'u_silo', [0.3, 0.7]), wall(56.8, 'u_mite', 10, 24),
      one(58.6, 'u_spinner', 0.3), one(59.2, 'u_spinner', 0.7),
      dives(60.8, 'u_diver', [0.2, 0.4, 0.6, 0.8], 0.16), field(61.2, 'u_scree', 5, 3, 57),
      cross(62.8, 'u_wasp', 5, 0.34), ground(63.2, 'u_turret', [0.5]),
      duo(64.8, 'u_eye', 0.3), snake(65.2, 'u_mite', 0.5, 8, 0.24),
      convoy(66.8, 'u_crawler', 0.7, 5, 0.5), cols(67.2, 'u_wasp', 0.25, 3, 0.4),
      arc(68.8, 'u_mite', 0.5, 9, 24), duo(69.2, 'u_spinner', 0.2),
      dives(70.8, 'u_diver', [0.15, 0.85], 0.2), ground(71.2, 'u_silo', [0.5]),
      // short breather before the crescendo
      snakes(73.2, 'u_mite', 0.2, 4, 0.32), field(73.6, 'u_scree', 3, 3, 58),
      cols(75.4, 'u_wasp', 0.3, 3, 0.4),
      // crescendo into the brood vault
      duo(77.6, 'u_eye', 0.2), wall(77.8, 'u_mite', 10, 24),
      dives(79.2, 'u_diver', [0.15, 0.38, 0.62, 0.85], 0.14), ground(79.4, 'u_turret', [0.25, 0.75]),
      swoop(80.8, 'u_wasp', 6, 0.22), duo(81, 'u_spinner', 0.3),
      field(82.4, 'u_boulder', 3, 3, 59), convoys(82.6, 'u_crawler', 0.2, 3, 0.5),
      cross(84, 'u_wasp', 6, 0.3), one(84.2, 'u_eye', 0.5),
      dives(85.6, 'u_diver', [0.25, 0.5, 0.75], 0.16), ground(85.8, 'u_silo', [0.2, 0.8]),
      wall(87.2, 'u_mite', 10, 24), duo(87.4, 'u_spinner', 0.22),
      swoop(88.6, 'u_wasp', 6, 0.2),
      dives(90.2, 'u_diver', [0.2, 0.4, 0.6, 0.8], 0.14),
    ],
  }),
];
