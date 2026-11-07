// The eight campaign planets (docs/ARCHITECTURE.md). mapX / mapY place the globes on the
// portrait galaxy map: a winding route climbing from Kessra (bottom) to Axiom (top).
import type { PlanetDef } from '../types';

const levelsOf = (id: string) => [`${id}-1`, `${id}-2`, `${id}-3`];

export const PLANETS: PlanetDef[] = [
  {
    id: 'kessra', name: 'Kessra', biome: 'desert', mapX: 0.3, mapY: 0.88, levels: levelsOf('kessra'),
    desc: 'A sun-scoured farm world turned open-pit mine. Tank columns guard the Directorate ore roads.',
  },
  {
    id: 'verdance', name: 'Verdance', biome: 'jungle', mapX: 0.68, mapY: 0.78, levels: levelsOf('verdance'),
    desc: 'The jungle that fed the Outer Worlds, rendered into fuel valley by valley. Ambush country.',
  },
  {
    id: 'thalassa', name: 'Thalassa', biome: 'ocean', mapX: 0.82, mapY: 0.66, levels: levelsOf('thalassa'),
    desc: 'An ocean of raft-towns. Directorate flotillas and drifting mines patrol its glassy straits.',
  },
  {
    id: 'umbra', name: 'Umbra Deep', biome: 'cavern', mapX: 0.5, mapY: 0.56, levels: levelsOf('umbra'),
    desc: 'A penal colony bored into living rock, where the Hive breeds its drones in the dark.',
  },
  {
    id: 'cinder', name: 'Cinder', biome: 'lava', mapX: 0.2, mapY: 0.45, levels: levelsOf('cinder'),
    desc: 'A volcanic forge world that casts Directorate hull plate in rivers of slag.',
  },
  {
    id: 'glacia', name: 'Glacia', biome: 'ice', mapX: 0.36, mapY: 0.34, levels: levelsOf('glacia'),
    desc: 'A frozen world guarding the colony seed vault, now coolant for the Directorate gate.',
  },
  {
    id: 'rift', name: 'The Rift', biome: 'space', mapX: 0.74, mapY: 0.23, levels: levelsOf('rift'),
    desc: 'A wound in space ringed with wrecks and asteroid shoals. Even starlight bends away.',
  },
  {
    id: 'axiom', name: 'Axiom Citadel', biome: 'techno', mapX: 0.52, mapY: 0.12, levels: levelsOf('axiom'),
    desc: 'The machine heart of the Directorate. Every defence it has left is waiting for you.',
  },
];
