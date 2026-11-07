// Shields: absorb damage before the armor and regenerate by drawing generator energy.
// Energy drain while regenerating = regen x energyPerPoint (docs/BALANCE.md "Energy").
import type { ShieldDef } from '../types';

export const SHIELDS: ShieldDef[] = [
  {
    id: 'sh_veil', name: 'Veil Screen', cost: 1000, capacity: 10, regen: 1.5, energyPerPoint: 2, color: 'cyan',
    desc: 'Basic deflector screen. Light capacity, gentle drain on the generator.',
  },
  {
    id: 'sh_aegis', name: 'Aegis Weave', cost: 4000, capacity: 15, regen: 2.2, energyPerPoint: 2, color: 'blue',
    desc: 'Woven deflector with faster recovery. The frontier pilot\'s first real upgrade.',
    unlockLevel: 'kessra-1',
  },
  {
    id: 'sh_bastion', name: 'Bastion Field', cost: 9500, capacity: 22, regen: 3, energyPerPoint: 2.2, color: 'green',
    desc: 'Dense layered field. Soaks a full volley and comes back quickly.',
    unlockLevel: 'verdance-1',
  },
  {
    id: 'sh_halo', name: 'Halo Lattice', cost: 19000, capacity: 30, regen: 4, energyPerPoint: 2.4, color: 'violet',
    desc: 'Crystal-lattice projector. Big reserve, but pair it with a strong generator.',
    unlockLevel: 'thalassa-2',
  },
  {
    id: 'sh_paragon', name: 'Paragon Ward', cost: 34000, capacity: 40, regen: 5.2, energyPerPoint: 2.5, color: 'yellow',
    desc: 'Military ward salvaged from a Directorate flagship. Hungry and superb.',
    unlockLevel: 'umbra-3',
  },
  {
    id: 'sh_eclipse', name: 'Eclipse Mantle', cost: 60000, capacity: 54, regen: 6.5, energyPerPoint: 2.8, color: 'pink',
    desc: 'Prototype mantle that drinks starlight. The finest shield in the Outer Marches.',
    unlockLevel: 'glacia-2',
  },
];
