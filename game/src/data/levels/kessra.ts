// KESSRA (desert) — the tutorial planet. Teaches the vocabulary of the game one unit at a
// time: dart V's, mite snakes, turret lines, tank convoys, wasp pincers, loot discs, then
// hornet spreads, divers and bunkers. Signature: tank convoys on the ore roads.
import type { LevelDef } from '../../types';
import { arc, col, cols, convoy, convoys, cross, dives, duo, ground, line, one, snake, snakes, swoop, vee, vees, wall } from '../waves';
import { level } from './common';

export const KESSRA_LEVELS: LevelDef[] = [
  level({
    planet: 'kessra', index: 1, name: 'Dustfall Approach', duration: 70, scrollSpeed: 44, intel: 'in_contract',
    briefing: 'Directorate scouts sweep the dunes. Break their patrols, crack the turret line and earn your first pay.',
    waves: [
      // teach: darts, mites, turrets
      vee(1, 'k_dart', 0.5, 5, 26),
      snake(3, 'k_mite', 0.25, 5, 0.32),
      snake(4.6, 'k_mite', 0.75, 5, 0.32),
      vees(6.6, 'k_dart', 0.28, 3, 24),
      ground(8.6, 'k_turret', [0.2, 0.8]),
      line(10.2, 'k_dart', 0.5, 5, 40),
      // first loot disc, wasps, tanks
      one(12.2, 'k_loot', 0.02, 'strafe'), snake(12.6, 'k_mite', 0.5, 6, 0.3),
      swoop(14.6, 'k_wasp', 3, 0.35),
      convoy(16.8, 'k_tank', 0.32, 3, 1.4),
      vee(18.4, 'k_dart', 0.66, 5, 24),
      wall(20.4, 'k_mite', 8, 30),
      ground(22.4, 'k_turret', [0.14, 0.5, 0.86]), col(22.8, 'k_wasp', 0.5, 3, 0.5),
      // breather: the relay dish carries the intel
      ground(25, 'k_relay', [0.5]), snakes(25.4, 'k_mite', 0.18, 4, 0.34),
      cols(27.4, 'k_dart', 0.22, 4, 0.42),
      vee(29.4, 'k_dart', 0.5, 5, 24), convoy(29.8, 'k_tank', 0.76, 3, 1.4),
      arc(31.6, 'k_mite', 0.5, 7, 28), one(32, 'k_loot', 0.98, 'strafe'),
      cross(33.6, 'k_dart', 3, 0.5),
      ground(35.6, 'k_turret', [0.3, 0.7]), line(36, 'k_dart', 0.5, 5, 40),
      swoop(38, 'k_wasp', 4, 0.3),
      // first climax
      vees(40, 'k_dart', 0.26, 5, 22), ground(40.4, 'k_turret', [0.5]), snake(41.4, 'k_mite', 0.5, 8, 0.25),
      // breather, then hornets are introduced
      one(43.6, 'k_loot', 0.98, 'strafe'), convoy(44, 'k_tank', 0.2, 2, 1.6),
      duo(46, 'k_hornet', 0.3),
      vee(48, 'k_dart', 0.5, 7, 22), ground(48.4, 'k_turret', [0.82]),
      wall(50.2, 'k_mite', 8, 30),
      swoop(52.2, 'k_wasp', 4, 0.3), duo(53, 'k_hornet', 0.18),
      ground(54.8, 'k_turret', [0.2, 0.5, 0.8]),
      dives(56.4, 'k_dart', [0.3, 0.5, 0.7], 0.3), convoy(56.8, 'k_tank', 0.82, 2, 1.4),
      snakes(58.2, 'k_mite', 0.3, 5, 0.3),
      // crescendo
      vees(60, 'k_dart', 0.28, 5, 22),
      duo(61.4, 'k_hornet', 0.22), convoy(61.6, 'k_tank', 0.5, 2, 1.4),
      wall(63, 'k_mite', 8, 30),
      swoop(64.4, 'k_wasp', 5, 0.26),
      vee(65.8, 'k_dart', 0.5, 7, 22), ground(66, 'k_turret', [0.15, 0.85]),
      snakes(67.4, 'k_mite', 0.2, 5, 0.26),
      line(68.6, 'k_hornet', 0.5, 3, 64),
    ],
  }),

  level({
    planet: 'kessra', index: 2, name: 'Bonefield Mesa', duration: 72, scrollSpeed: 46, intel: 'in_quota',
    midboss: { t: 43, enemy: 'k_frigate' },
    briefing: 'Bunkers ring the mesa road and a Sirocco frigate escorts the ore convoy. Bring it down.',
    waves: [
      vee(1, 'k_dart', 0.5, 5, 24),
      snakes(2.8, 'k_mite', 0.22, 5, 0.3),
      ground(4.6, 'k_turret', [0.25, 0.75]), line(5, 'k_dart', 0.5, 4, 44),
      swoop(6.8, 'k_wasp', 4, 0.3),
      convoy(8.6, 'k_tank', 0.3, 3, 1.3), vee(9, 'k_dart', 0.7, 5, 22),
      wall(11, 'k_mite', 8, 30),
      // teach: bunker (ring of orbs)
      ground(12.8, 'k_bunker', [0.5]), cols(13.2, 'k_dart', 0.15, 3, 0.45),
      duo(15.2, 'k_hornet', 0.25),
      one(17, 'k_loot', 0.02, 'strafe'), arc(17.4, 'k_mite', 0.5, 7, 26),
      // teach: divers
      dives(19.2, 'k_diver', [0.2, 0.5, 0.8], 0.3),
      vees(21, 'k_dart', 0.3, 5, 22), convoy(21.4, 'k_tank', 0.72, 2, 1.5),
      ground(23.2, 'k_turret', [0.12, 0.4, 0.6, 0.88]),
      cross(24.8, 'k_wasp', 4, 0.45),
      snake(26.6, 'k_mite', 0.5, 8, 0.25), duo(27, 'k_hornet', 0.18),
      // climax: twin convoys under a V
      convoys(28.8, 'k_tank', 0.25, 3, 1.2), vee(29, 'k_dart', 0.5, 7, 22),
      dives(31, 'k_diver', [0.3, 0.7], 0.3), wall(31.4, 'k_mite', 8, 30),
      swoop(33.2, 'k_wasp', 5, 0.26),
      ground(35, 'k_bunker', [0.3, 0.7]), line(35.4, 'k_hornet', 0.5, 3, 70),
      // breather before the frigate: relay with the intel
      ground(37.6, 'k_relay', [0.5]), snakes(38, 'k_mite', 0.2, 4, 0.34),
      vee(40, 'k_dart', 0.5, 5, 24),
      // mid-boss at 43 s: light escorts only while the frigate is up
      snakes(44, 'k_mite', 0.12, 5, 0.32),
      one(46.4, 'k_loot', 0.98, 'strafe'),
      cols(48.4, 'k_dart', 0.1, 3, 0.5),
      snake(50.4, 'k_mite', 0.5, 6, 0.3),
      duo(52.6, 'k_wasp', 0.2),
      snakes(54.8, 'k_mite', 0.3, 4, 0.3),
      cols(57, 'k_dart', 0.12, 3, 0.45),
      // combine
      vees(59.2, 'k_dart', 0.26, 5, 22), ground(59.6, 'k_turret', [0.5]),
      dives(61.4, 'k_diver', [0.15, 0.5, 0.85], 0.25), convoy(61.6, 'k_tank', 0.4, 2, 1.2),
      // crescendo
      wall(63.2, 'k_mite', 8, 30), ground(63.4, 'k_turret', [0.2, 0.8]),
      swoop(64.8, 'k_wasp', 5, 0.26),
      vee(66.2, 'k_dart', 0.5, 7, 22), duo(66.6, 'k_hornet', 0.3),
      cross(67.8, 'k_dart', 4, 0.4),
      ground(69, 'k_bunker', [0.5]), snakes(69.2, 'k_mite', 0.2, 5, 0.26),
      line(70.4, 'k_hornet', 0.5, 4, 52),
    ],
  }),

  level({
    planet: 'kessra', index: 3, name: 'Colossus Trench', duration: 74, scrollSpeed: 48, intel: 'in_crawler',
    briefing: 'The siege crawler Colossus is chewing a new trench. Break its escort and scrap the beast.',
    waves: [
      vees(1, 'k_dart', 0.3, 3, 24),
      snake(2.6, 'k_mite', 0.5, 7, 0.28),
      convoys(4.2, 'k_tank', 0.2, 3, 1.2),
      swoop(6.2, 'k_wasp', 4, 0.3),
      ground(8, 'k_turret', [0.35, 0.65]), vee(8.4, 'k_dart', 0.5, 5, 24),
      dives(10.2, 'k_diver', [0.25, 0.75], 0.3), wall(10.6, 'k_mite', 8, 30),
      duo(12.4, 'k_hornet', 0.22), line(12.8, 'k_dart', 0.5, 4, 44),
      ground(14.6, 'k_bunker', [0.5]), cols(15, 'k_wasp', 0.15, 3, 0.5),
      one(17, 'k_loot', 0.02, 'strafe'), snakes(17.4, 'k_mite', 0.25, 5, 0.3),
      vees(19.4, 'k_dart', 0.28, 5, 22), ground(19.8, 'k_turret', [0.12, 0.88]),
      cross(21.6, 'k_wasp', 4, 0.42),
      convoy(23.4, 'k_tank', 0.5, 4, 1), arc(23.8, 'k_mite', 0.5, 9, 24),
      dives(25.6, 'k_diver', [0.2, 0.4, 0.6, 0.8], 0.22),
      line(27.4, 'k_hornet', 0.5, 3, 70),
      // breather: relay with the intel
      ground(29.6, 'k_relay', [0.5]), snake(30, 'k_mite', 0.2, 5, 0.32),
      vee(31.8, 'k_dart', 0.5, 7, 22),
      ground(33.6, 'k_bunker', [0.25, 0.75]), swoop(34, 'k_wasp', 5, 0.26),
      duo(35.8, 'k_hornet', 0.15), wall(36.2, 'k_mite', 8, 30),
      cols(38, 'k_dart', 0.2, 4, 0.35, 'dive'),
      convoys(39.8, 'k_tank', 0.3, 3, 1.1),
      cross(41.6, 'k_dart', 4, 0.4),
      // breather
      one(43.6, 'k_loot', 0.98, 'strafe'), snakes(44, 'k_mite', 0.3, 4, 0.3),
      ground(46, 'k_turret', [0.15, 0.38, 0.62, 0.85]),
      vees(47.6, 'k_dart', 0.25, 5, 22), duo(48, 'k_hornet', 0.4),
      dives(49.8, 'k_diver', [0.3, 0.5, 0.7], 0.25), snake(50.2, 'k_mite', 0.5, 8, 0.24),
      swoop(52, 'k_wasp', 5, 0.25),
      ground(53.8, 'k_bunker', [0.5]), line(54.2, 'k_hornet', 0.5, 4, 52),
      wall(56, 'k_mite', 9, 27),
      convoys(57.8, 'k_tank', 0.15, 3, 1), vee(58, 'k_dart', 0.5, 7, 22),
      // short breather before the crescendo
      snakes(60.4, 'k_mite', 0.2, 4, 0.34),
      cols(62.2, 'k_wasp', 0.3, 3, 0.4),
      // crescendo into the Colossus
      vees(64, 'k_dart', 0.28, 5, 22), ground(64.2, 'k_turret', [0.5]),
      dives(65.4, 'k_diver', [0.15, 0.85], 0.2), wall(65.6, 'k_mite', 9, 27),
      duo(66.8, 'k_hornet', 0.2), duo(67.2, 'k_hornet', 0.4),
      swoop(68.2, 'k_wasp', 6, 0.22),
      vee(69.6, 'k_dart', 0.5, 9, 20), ground(69.8, 'k_turret', [0.2, 0.8]),
      cross(71, 'k_dart', 5, 0.32),
      line(72.4, 'k_hornet', 0.5, 4, 56), snake(72.6, 'k_mite', 0.5, 4, 0.3),
    ],
  }),
];
