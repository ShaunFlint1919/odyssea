// Generators: produce `output` energy/s up to `capacity`; weapons and shield regen draw on it.
// Each tier sustains the matching weapon tier + shield tier at power 1 (docs/BALANCE.md "Energy").
import type { GeneratorDef } from '../types';

export const GENERATORS: GeneratorDef[] = [
  {
    id: 'gen_cell', name: 'Ember Cell', cost: 1000, capacity: 50, output: 15,
    desc: 'Standard fusion cell. Enough for a light gun and a basic screen.',
  },
  {
    id: 'gen_coil', name: 'Flux Coil', cost: 3500, capacity: 70, output: 21,
    desc: 'Rewound flux coil with a deeper buffer for rapid-fire weapons.',
    unlockLevel: 'kessra-1',
  },
  {
    id: 'gen_furnace', name: 'Ion Furnace', cost: 9000, capacity: 95, output: 28,
    desc: 'Ion furnace that feeds a heavy gun and a rear weapon at once.',
    unlockLevel: 'kessra-3',
  },
  {
    id: 'gen_quasar', name: 'Quasar Core', cost: 18000, capacity: 125, output: 36,
    desc: 'Compressed quasar core. Keeps a lattice shield topped up under fire.',
    unlockLevel: 'thalassa-1',
  },
  {
    id: 'gen_helion', name: 'Helion Heart', cost: 32000, capacity: 165, output: 46,
    desc: 'Captured Directorate heart-reactor. Runs hot, runs everything.',
    unlockLevel: 'umbra-2',
  },
  {
    id: 'gen_well', name: 'Singularity Well', cost: 60000, capacity: 220, output: 60,
    desc: 'A caged micro-singularity. Bottomless power for a fully armed ship.',
    unlockLevel: 'cinder-3',
  },
];
