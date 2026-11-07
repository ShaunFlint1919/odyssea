// VERDANCE (jungle) — ambush country. New threats: thorn divers bursting UP from the canopy
// behind the player ('rise'), mire crawler swarms, seedpod spinners (first spiral), fern
// rays (5-way fans), twin turrets and missile silos. Signature: the canopy ambush.
import type { LevelDef } from '../../types';
import { arc, cols, convoy, convoys, cross, duo, ground, line, one, rise, snake, snakes, swoop, vee, vees, wall } from '../waves';
import { level } from './common';

export const VERDANCE_LEVELS: LevelDef[] = [
  level({
    planet: 'verdance', index: 1, name: 'Canopy Breach', duration: 76, scrollSpeed: 50, intel: 'in_green',
    briefing: 'Fuel harvesters are torching the canopy. Watch your tail: thorn divers burst up from the trees.',
    waves: [
      snakes(1, 'v_mite', 0.25, 5, 0.3),
      vee(3, 'v_hornet', 0.5, 3, 28),
      convoy(4.8, 'v_crawler', 0.3, 3, 0.9),
      swoop(6.4, 'v_wasp', 4, 0.3),
      // teach: the first ambush from below, wide apart
      rise(8.4, 'v_diver', [0.12, 0.88], 0.5),
      snake(10.2, 'v_mite', 0.5, 7, 0.28),
      duo(12, 'v_hornet', 0.28),
      convoy(13.6, 'v_crawler', 0.7, 4, 0.8), cols(14, 'v_wasp', 0.2, 3, 0.45),
      one(15.8, 'v_loot', 0.02, 'strafe'), wall(16.2, 'v_mite', 8, 30),
      rise(18.2, 'v_diver', [0.2, 0.4, 0.6, 0.8], 0.25),
      vees(20, 'v_hornet', 0.28, 3, 26),
      // teach: spinner spiral
      one(21.8, 'v_spinner', 0.5),
      snakes(23.4, 'v_mite', 0.15, 5, 0.3),
      convoys(25, 'v_crawler', 0.25, 4, 0.7),
      swoop(26.8, 'v_wasp', 5, 0.26),
      duo(28.6, 'v_hornet', 0.2), arc(29, 'v_mite', 0.5, 9, 24),
      rise(30.8, 'v_diver', [0.3, 0.7], 0.2), vee(31.2, 'v_hornet', 0.5, 5, 26),
      duo(33, 'v_spinner', 0.25),
      // breather: relay with the intel
      ground(35.4, 'v_relay', [0.62]), snake(35.8, 'v_mite', 0.3, 5, 0.32),
      cross(37.6, 'v_wasp', 4, 0.45),
      convoy(39.4, 'v_crawler', 0.5, 5, 0.6), line(39.8, 'v_hornet', 0.5, 3, 70),
      wall(41.6, 'v_mite', 9, 27),
      rise(43.4, 'v_diver', [0.15, 0.35, 0.65, 0.85], 0.2),
      vees(45, 'v_hornet', 0.25, 3, 24),
      one(46.8, 'v_spinner', 0.3), one(47.4, 'v_spinner', 0.7),
      // breather
      one(49.4, 'v_loot', 0.98, 'strafe'), snakes(49.8, 'v_mite', 0.2, 4, 0.3),
      swoop(51.6, 'v_wasp', 5, 0.25),
      convoy(53.4, 'v_crawler', 0.2, 4, 0.6), duo(53.8, 'v_hornet', 0.35),
      rise(55.4, 'v_diver', [0.25, 0.5, 0.75], 0.2), snake(55.8, 'v_mite', 0.5, 8, 0.24),
      cols(57.6, 'v_wasp', 0.15, 4, 0.4),
      one(59.4, 'v_spinner', 0.5), convoy(59.8, 'v_crawler', 0.8, 4, 0.6),
      arc(61.4, 'v_mite', 0.5, 9, 24), duo(61.8, 'v_hornet', 0.15),
      snakes(63.6, 'v_mite', 0.3, 4, 0.32),
      // crescendo
      rise(65.8, 'v_diver', [0.2, 0.8], 0.15), vee(66, 'v_hornet', 0.5, 5, 24),
      duo(67.4, 'v_spinner', 0.22),
      wall(68.8, 'v_mite', 9, 27), convoy(69, 'v_crawler', 0.5, 4, 0.5),
      swoop(70.2, 'v_wasp', 6, 0.22),
      rise(71.6, 'v_diver', [0.15, 0.38, 0.62, 0.85], 0.15), duo(71.8, 'v_hornet', 0.25),
      line(73.2, 'v_hornet', 0.5, 4, 54),
      snakes(74.4, 'v_mite', 0.18, 4, 0.25),
    ],
  }),

  level({
    planet: 'verdance', index: 2, name: 'Spore Delta', duration: 78, scrollSpeed: 52, intel: 'in_confession',
    midboss: { t: 47, enemy: 'v_carrier' },
    briefing: 'Missile silos bloom along the delta and a Canopy carrier holds the river mouth.',
    waves: [
      vees(1, 'v_hornet', 0.3, 3, 24),
      snake(2.6, 'v_mite', 0.5, 7, 0.28),
      // teach: twin turrets
      ground(4.2, 'v_twin', [0.25, 0.75]),
      swoop(5.8, 'v_wasp', 4, 0.3),
      // teach: fern ray fan
      one(7.6, 'v_ray', 0.5),
      rise(9.4, 'v_diver', [0.15, 0.85], 0.3), convoy(9.6, 'v_crawler', 0.5, 4, 0.7),
      // teach: missile silo
      ground(11.4, 'v_silo', [0.5]), wall(11.8, 'v_mite', 8, 30),
      duo(13.6, 'v_hornet', 0.22),
      cols(15.4, 'v_wasp', 0.18, 4, 0.4),
      one(17.2, 'v_loot', 0.02, 'strafe'), duo(17.6, 'v_ray', 0.25),
      convoys(19.4, 'v_crawler', 0.3, 4, 0.6),
      rise(21.4, 'v_diver', [0.2, 0.4, 0.6, 0.8], 0.2),
      ground(23, 'v_twin', [0.15, 0.85]), vee(23.4, 'v_hornet', 0.5, 7, 22),
      one(25.2, 'v_spinner', 0.5), snakes(25.6, 'v_mite', 0.15, 4, 0.3),
      ground(27.4, 'v_silo', [0.3, 0.7]), swoop(27.8, 'v_wasp', 5, 0.25),
      duo(29.6, 'v_hornet', 0.3), arc(30, 'v_mite', 0.5, 9, 24),
      line(31.8, 'v_ray', 0.5, 3, 80),
      rise(33.6, 'v_diver', [0.25, 0.5, 0.75], 0.2), convoy(33.8, 'v_crawler', 0.5, 5, 0.5),
      cross(35.6, 'v_wasp', 4, 0.42),
      duo(37.4, 'v_spinner', 0.25), ground(37.6, 'v_twin', [0.5]),
      wall(39.4, 'v_mite', 9, 27),
      // breather: relay, then the carrier
      ground(41.4, 'v_relay', [0.4]), snake(41.8, 'v_mite', 0.7, 5, 0.32),
      vees(43.6, 'v_hornet', 0.25, 3, 22),
      // mid-boss at 47 s: light escorts
      snakes(47.6, 'v_mite', 0.12, 5, 0.32),
      one(50, 'v_loot', 0.98, 'strafe'),
      rise(52.2, 'v_diver', [0.1, 0.9], 0.3),
      snake(54.2, 'v_mite', 0.5, 6, 0.3),
      cols(56.4, 'v_wasp', 0.1, 3, 0.5),
      snakes(58.6, 'v_mite', 0.25, 4, 0.3), ground(58.8, 'v_silo', [0.5]),
      // combine
      duo(61, 'v_ray', 0.22), convoy(61.2, 'v_crawler', 0.5, 5, 0.5),
      swoop(62.8, 'v_wasp', 5, 0.25), ground(63, 'v_twin', [0.15, 0.85]),
      rise(64.6, 'v_diver', [0.3, 0.7], 0.2), wall(64.8, 'v_mite', 9, 27),
      // crescendo
      duo(66.6, 'v_hornet', 0.2), one(67, 'v_spinner', 0.5),
      vee(68.2, 'v_hornet', 0.5, 7, 22), ground(68.4, 'v_silo', [0.2, 0.8]),
      rise(69.8, 'v_diver', [0.15, 0.4, 0.6, 0.85], 0.15),
      line(71.2, 'v_ray', 0.5, 3, 80), snakes(71.4, 'v_mite', 0.2, 5, 0.25),
      cross(72.8, 'v_wasp', 5, 0.32),
      duo(74.2, 'v_hornet', 0.15), duo(74.6, 'v_hornet', 0.38),
      wall(75.8, 'v_mite', 9, 27),
    ],
  }),

  level({
    planet: 'verdance', index: 3, name: "Hydra's Garden", duration: 80, scrollSpeed: 52, intel: 'in_ascension',
    briefing: 'The Hydra guards the rendering vats. Many heads, one mind, and none of it friendly.',
    waves: [
      vees(1, 'v_hornet', 0.3, 3, 26),
      snake(2.6, 'v_mite', 0.5, 8, 0.26),
      ground(4.2, 'v_twin', [0.2, 0.8]), rise(4.6, 'v_diver', [0.4, 0.6], 0.2),
      swoop(6.2, 'v_wasp', 5, 0.26),
      one(8, 'v_ray', 0.3), one(8.6, 'v_ray', 0.7),
      convoys(10.2, 'v_crawler', 0.2, 4, 0.6),
      ground(11.8, 'v_silo', [0.5]), wall(12.2, 'v_mite', 9, 27),
      cross(14, 'v_wasp', 4, 0.42),
      duo(15.8, 'v_spinner', 0.25), rise(16.2, 'v_diver', [0.1, 0.9], 0.2),
      one(17.8, 'v_loot', 0.02, 'strafe'), vee(18.2, 'v_hornet', 0.5, 7, 22),
      ground(20, 'v_twin', [0.15, 0.5, 0.85]), snakes(20.4, 'v_mite', 0.25, 5, 0.28),
      line(22.2, 'v_ray', 0.5, 3, 80),
      rise(24, 'v_diver', [0.2, 0.4, 0.6, 0.8], 0.18), convoy(24.4, 'v_crawler', 0.5, 5, 0.5),
      swoop(26, 'v_wasp', 5, 0.25), ground(26.4, 'v_silo', [0.25, 0.75]),
      one(28.2, 'v_spinner', 0.5), arc(28.6, 'v_mite', 0.5, 9, 24),
      duo(30.4, 'v_hornet', 0.2), duo(30.8, 'v_hornet', 0.38),
      // breather: relay with the intel
      ground(32.8, 'v_relay', [0.35]), snake(33.2, 'v_mite', 0.7, 5, 0.32),
      cols(35, 'v_wasp', 0.2, 4, 0.4),
      duo(36.8, 'v_ray', 0.25), convoys(37.2, 'v_crawler', 0.15, 3, 0.7),
      rise(38.8, 'v_diver', [0.3, 0.5, 0.7], 0.2), wall(39.2, 'v_mite', 9, 27),
      ground(41, 'v_twin', [0.3, 0.7]), swoop(41.4, 'v_wasp', 5, 0.25),
      duo(43.2, 'v_spinner', 0.2), vee(43.6, 'v_hornet', 0.5, 5, 24),
      // breather
      one(45.6, 'v_loot', 0.98, 'strafe'), snakes(46, 'v_mite', 0.3, 4, 0.3),
      line(47.8, 'v_ray', 0.5, 3, 80), ground(48.2, 'v_silo', [0.5]),
      rise(49.8, 'v_diver', [0.15, 0.35, 0.65, 0.85], 0.16),
      cross(51.4, 'v_wasp', 5, 0.38), convoy(51.8, 'v_crawler', 0.5, 5, 0.5),
      duo(53.4, 'v_hornet', 0.15), one(53.8, 'v_spinner', 0.5),
      arc(55.4, 'v_mite', 0.5, 9, 24), ground(55.6, 'v_twin', [0.15, 0.85]),
      swoop(57.2, 'v_wasp', 6, 0.22),
      vees(59, 'v_hornet', 0.26, 3, 24), rise(59.4, 'v_diver', [0.3, 0.7], 0.2),
      duo(61, 'v_ray', 0.3), snake(61.4, 'v_mite', 0.5, 8, 0.24),
      // short breather before the crescendo
      snakes(63.4, 'v_mite', 0.2, 4, 0.32), ground(63.6, 'v_silo', [0.3, 0.7]),
      cols(65.2, 'v_wasp', 0.3, 3, 0.4),
      // crescendo into the Hydra
      wall(67.6, 'v_mite', 10, 24), rise(67.8, 'v_diver', [0.2, 0.8], 0.15),
      duo(69.2, 'v_spinner', 0.22), convoys(69.4, 'v_crawler', 0.2, 4, 0.5),
      swoop(70.8, 'v_wasp', 6, 0.22), duo(71, 'v_hornet', 0.35),
      line(72.2, 'v_ray', 0.5, 3, 80), ground(72.4, 'v_twin', [0.5]),
      rise(73.6, 'v_diver', [0.15, 0.38, 0.62, 0.85], 0.14), vee(73.8, 'v_hornet', 0.5, 7, 22),
      cross(75.2, 'v_wasp', 5, 0.34),
      duo(76.6, 'v_hornet', 0.2), duo(77, 'v_hornet', 0.4),
      wall(78.2, 'v_mite', 10, 24),
    ],
  }),
];
