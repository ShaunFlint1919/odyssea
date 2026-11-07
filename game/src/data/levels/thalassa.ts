// THALASSA (ocean) — no ground, the threat is on the water: skiff flotillas, gunboats and
// destroyers ('sea' layer) under gull dart squadrons, tide rays raining needles, gale
// discs, flak bombers and drifting tidal mines. Signature: flotilla + minefield.
import type { LevelDef } from '../../types';
import { arc, cols, convoy, convoys, cross, duo, field, line, one, snake, snakes, swoop, vee, vees, wall } from '../waves';
import { level } from './common';

export const THALASSA_LEVELS: LevelDef[] = [
  level({
    planet: 'thalassa', index: 1, name: 'Glasswater Strait', duration: 82, scrollSpeed: 54, intel: 'in_rafts',
    briefing: 'Gunboat flotillas patrol the strait and mines drift in the spray. Keep moving.',
    waves: [
      vee(1, 't_dart', 0.5, 5, 24),
      // teach: skiffs on the water
      convoy(2.8, 't_skiff', 0.3, 3, 0.9),
      snakes(4.4, 't_mite', 0.22, 5, 0.3),
      // teach: drifting mines
      field(6, 't_mine', 4, 6, 101),
      vees(7.8, 't_dart', 0.3, 3, 24),
      convoy(9.6, 't_skiff', 0.7, 3, 0.9), line(10, 't_dart', 0.5, 4, 46),
      // teach: tide ray needle rain
      one(11.8, 't_ray', 0.5),
      swoop(13.6, 't_dart', 4, 0.3),
      one(15.4, 't_loot', 0.02, 'strafe'), wall(15.8, 't_mite', 8, 30),
      convoys(17.6, 't_skiff', 0.2, 3, 0.8),
      duo(19.4, 't_hornet', 0.26),
      field(21, 't_mine', 5, 5, 202), vee(21.4, 't_dart', 0.5, 7, 22),
      // teach: gale disc ring
      one(23.4, 't_disc', 0.5),
      cross(25.2, 't_dart', 4, 0.45),
      // teach: gunboats
      convoy(27, 't_gunboat', 0.5, 2, 1.4),
      snake(28.8, 't_mite', 0.3, 7, 0.26), snake(29.4, 't_mite', 0.7, 7, 0.26),
      duo(31.2, 't_ray', 0.25),
      // breather: the courier carries the intel
      one(33.4, 't_courier', 0.98, 'strafe'), snakes(33.8, 't_mite', 0.2, 4, 0.32),
      vees(35.6, 't_hornet', 0.28, 3, 26),
      convoys(37.4, 't_skiff', 0.15, 4, 0.7), field(37.8, 't_mine', 4, 4, 303),
      arc(39.6, 't_mite', 0.5, 9, 24),
      duo(41.4, 't_disc', 0.25),
      swoop(43.2, 't_dart', 5, 0.26), convoy(43.6, 't_gunboat', 0.3, 2, 1.4),
      line(45.4, 't_ray', 0.5, 3, 80),
      // breather
      one(47.6, 't_loot', 0.02, 'strafe'), snakes(48, 't_mite', 0.3, 4, 0.3),
      vee(49.8, 't_dart', 0.5, 7, 22), convoy(50.2, 't_skiff', 0.8, 4, 0.7),
      field(52, 't_mine', 5, 5, 404), duo(52.4, 't_hornet', 0.2),
      cross(54.2, 't_dart', 5, 0.38),
      convoys(56, 't_gunboat', 0.25, 2, 1.4), one(56.4, 't_disc', 0.5),
      wall(58.2, 't_mite', 9, 27),
      duo(60, 't_ray', 0.3), vees(60.4, 't_dart', 0.22, 3, 22),
      swoop(62.2, 't_hornet', 3, 0.4),
      snake(64, 't_mite', 0.5, 8, 0.24), convoy(64.4, 't_skiff', 0.35, 4, 0.6),
      field(66.2, 't_mine', 4, 4, 505), line(66.6, 't_dart', 0.5, 5, 40),
      duo(68.4, 't_disc', 0.2),
      snakes(70.2, 't_mite', 0.25, 4, 0.3),
      // crescendo
      vee(72, 't_dart', 0.5, 7, 22), convoys(72.2, 't_skiff', 0.2, 3, 0.6),
      duo(73.4, 't_hornet', 0.25), one(73.8, 't_ray', 0.5),
      wall(75, 't_mite', 9, 27), convoy(75.2, 't_gunboat', 0.5, 2, 1.2),
      cross(76.4, 't_dart', 5, 0.34),
      duo(77.8, 't_hornet', 0.15), duo(78.2, 't_hornet', 0.38),
      vees(79.4, 't_dart', 0.26, 5, 22),
      line(80.6, 't_ray', 0.5, 2, 110),
    ],
  }),

  level({
    planet: 'thalassa', index: 2, name: 'Drowned Rigs', duration: 84, scrollSpeed: 56, intel: 'in_lastshift',
    midboss: { t: 50, enemy: 't_tidewall' },
    briefing: 'Sounding rigs map the trench under destroyer guard. Sink the Tidewall and silence them.',
    waves: [
      vee(1, 't_dart', 0.5, 5, 24),
      convoys(2.6, 't_skiff', 0.25, 3, 0.8),
      snake(4.2, 't_mite', 0.5, 7, 0.28),
      duo(5.8, 't_ray', 0.28),
      field(7.4, 't_mine', 5, 5, 11), swoop(7.8, 't_dart', 4, 0.3),
      // teach: albatross bomber flak
      one(9.8, 't_bomber', 0.5),
      vees(11.6, 't_dart', 0.22, 3, 22), convoy(12, 't_gunboat', 0.65, 2, 1.4),
      wall(13.8, 't_mite', 8, 30),
      duo(15.6, 't_hornet', 0.25), one(16, 't_disc', 0.5),
      one(17.8, 't_loot', 0.02, 'strafe'), cross(18.2, 't_dart', 4, 0.42),
      convoys(20, 't_skiff', 0.18, 4, 0.7),
      line(21.8, 't_ray', 0.5, 3, 80),
      field(23.4, 't_mine', 4, 4, 12), vee(23.8, 't_dart', 0.5, 7, 22),
      duo(25.6, 't_bomber', 0.3),
      snakes(27.4, 't_mite', 0.2, 5, 0.28), convoy(27.8, 't_gunboat', 0.4, 3, 1.2),
      swoop(29.6, 't_hornet', 3, 0.4),
      duo(31.4, 't_disc', 0.22), arc(31.8, 't_mite', 0.5, 9, 24),
      cross(33.6, 't_dart', 5, 0.38),
      convoys(35.4, 't_skiff', 0.3, 3, 0.7), one(35.8, 't_ray', 0.5),
      vees(37.6, 't_hornet', 0.28, 3, 26),
      field(39.4, 't_mine', 5, 4, 13), wall(39.8, 't_mite', 9, 27),
      // breather: courier, then the Tidewall
      one(42, 't_courier', 0.98, 'strafe'), snakes(42.4, 't_mite', 0.15, 4, 0.32),
      convoy(44.2, 't_gunboat', 0.6, 2, 1.3), vee(44.6, 't_dart', 0.3, 5, 22),
      duo(46.6, 't_ray', 0.2),
      // mid-boss at 50 s: light escorts
      snakes(50.6, 't_mite', 0.12, 5, 0.32),
      one(53, 't_loot', 0.02, 'strafe'),
      cols(55.2, 't_dart', 0.1, 3, 0.5),
      field(57.4, 't_mine', 3, 4, 14),
      snake(59.6, 't_mite', 0.5, 6, 0.3),
      duo(61.8, 't_hornet', 0.15),
      // combine
      one(64, 't_bomber', 0.5), convoys(64.4, 't_skiff', 0.2, 3, 0.6),
      swoop(66, 't_dart', 5, 0.26), one(66.4, 't_disc', 0.5),
      line(68, 't_ray', 0.5, 3, 80), snakes(68.4, 't_mite', 0.25, 4, 0.3),
      field(70, 't_mine', 4, 3, 15), convoy(70.2, 't_gunboat', 0.75, 2, 1.2),
      // crescendo
      vee(72.4, 't_dart', 0.5, 7, 22), duo(72.8, 't_hornet', 0.25),
      duo(74.2, 't_bomber', 0.25),
      wall(75.6, 't_mite', 9, 27), convoys(75.8, 't_skiff', 0.15, 3, 0.6),
      cross(77.2, 't_dart', 5, 0.34),
      duo(78.6, 't_disc', 0.2), vees(78.8, 't_hornet', 0.3, 3, 24),
      swoop(80.2, 't_dart', 6, 0.22),
      line(81.8, 't_ray', 0.5, 3, 80), snakes(82, 't_mite', 0.2, 4, 0.25),
    ],
  }),

  level({
    planet: 'thalassa', index: 3, name: 'Dreadnought Deep', duration: 86, scrollSpeed: 56, intel: 'in_routes',
    briefing: 'The flagship Dreadnought sails over the deepest trench of Thalassa. Send it to the bottom.',
    waves: [
      vees(1, 't_dart', 0.3, 3, 24),
      convoy(2.6, 't_skiff', 0.5, 4, 0.7), snake(3, 't_mite', 0.2, 6, 0.28),
      swoop(4.8, 't_dart', 5, 0.26),
      duo(6.6, 't_ray', 0.25), field(7, 't_mine', 4, 4, 21),
      // teach: breaker destroyer
      one(8.8, 't_destroyer', 0.5),
      wall(10.6, 't_mite', 8, 30),
      convoys(12.2, 't_gunboat', 0.2, 2, 1.3), vee(12.6, 't_dart', 0.5, 5, 24),
      one(14.4, 't_bomber', 0.3), one(15, 't_bomber', 0.7),
      cross(16.6, 't_dart', 4, 0.42),
      one(18.4, 't_loot', 0.02, 'strafe'), duo(18.8, 't_disc', 0.25),
      convoys(20.6, 't_skiff', 0.15, 4, 0.6), line(21, 't_ray', 0.5, 3, 80),
      field(22.8, 't_mine', 5, 4, 22), swoop(23.2, 't_hornet', 4, 0.35),
      one(25, 't_destroyer', 0.3), arc(25.4, 't_mite', 0.5, 9, 24),
      vees(27.2, 't_dart', 0.24, 5, 22),
      duo(29, 't_bomber', 0.25), snakes(29.4, 't_mite', 0.2, 4, 0.3),
      convoy(31, 't_gunboat', 0.6, 3, 1.1), one(31.4, 't_disc', 0.4),
      // breather: courier with the intel
      one(33.4, 't_courier', 0.98, 'strafe'), snake(33.8, 't_mite', 0.4, 6, 0.3),
      cross(35.6, 't_hornet', 3, 0.5),
      field(37.4, 't_mine', 4, 4, 23), vee(37.8, 't_dart', 0.5, 7, 22),
      one(39.6, 't_destroyer', 0.7), duo(40, 't_ray', 0.2),
      wall(41.8, 't_mite', 9, 27), convoys(42, 't_skiff', 0.25, 3, 0.6),
      swoop(43.8, 't_dart', 5, 0.25),
      duo(45.6, 't_disc', 0.25), one(46, 't_bomber', 0.5),
      // breather
      one(48, 't_loot', 0.98, 'strafe'), snakes(48.4, 't_mite', 0.3, 4, 0.3),
      convoys(50.2, 't_gunboat', 0.15, 2, 1.2), vees(50.6, 't_hornet', 0.3, 3, 24),
      line(52.4, 't_ray', 0.5, 3, 80), field(52.8, 't_mine', 4, 3, 24),
      cross(54.6, 't_dart', 5, 0.36),
      one(56.4, 't_destroyer', 0.25), one(56.8, 't_destroyer', 0.75),
      arc(58.4, 't_mite', 0.5, 9, 24), duo(58.8, 't_hornet', 0.2),
      duo(60.6, 't_bomber', 0.3),
      swoop(62.4, 't_dart', 6, 0.22), convoy(62.8, 't_skiff', 0.5, 4, 0.5),
      duo(64.4, 't_disc', 0.2), snakes(64.8, 't_mite', 0.2, 4, 0.28),
      // short breather before the crescendo
      field(66.8, 't_mine', 4, 3, 25), cols(67.2, 't_dart', 0.3, 3, 0.4),
      // crescendo into the Dreadnought
      wall(70, 't_mite', 10, 24), convoys(70.2, 't_skiff', 0.2, 3, 0.5),
      vee(71.4, 't_dart', 0.5, 7, 22), duo(71.8, 't_ray', 0.3),
      duo(73, 't_hornet', 0.15), duo(73.4, 't_hornet', 0.38),
      one(74.6, 't_bomber', 0.5), convoy(74.8, 't_gunboat', 0.3, 2, 1),
      cross(76, 't_dart', 6, 0.3),
      duo(77.4, 't_disc', 0.25), vees(77.6, 't_hornet', 0.3, 3, 24),
      swoop(79, 't_dart', 6, 0.22), field(79.4, 't_mine', 4, 2, 26),
      line(81, 't_ray', 0.5, 3, 80), snakes(81.2, 't_mite', 0.2, 5, 0.25),
      vees(82.6, 't_dart', 0.25, 5, 22),
      wall(84, 't_mite', 10, 24),
    ],
  }),
];
