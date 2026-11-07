// Player hulls. Ids are the sprite keys of HULL_SPRITES (src/art/keys.ts) — hullKey(id).
// Balance reasoning: docs/BALANCE.md "Hulls".
import type { HullDef } from '../types';

export const HULLS: HullDef[] = [
  {
    id: 'sparrow', name: 'Sparrow Skiff', cost: 0, armor: 20, speed: 150, hitRadius: 4, sidekickSlots: 1,
    desc: 'Nimble starter skiff. Light plating and one sidekick mount; cheap to fly, cheaper to fix.',
  },
  {
    id: 'lancer', name: 'Lancer Interceptor', cost: 5000, armor: 26, speed: 180, hitRadius: 3.5, sidekickSlots: 2,
    desc: 'Interceptor frame with twin sidekick mounts and a slim, forgiving profile.',
    unlockLevel: 'kessra-2',
  },
  {
    id: 'bulwark', name: 'Bulwark Brawler', cost: 14000, armor: 40, speed: 130, hitRadius: 5, sidekickSlots: 2,
    desc: 'Armoured brawler. Slow to turn, but shrugs off fire that would gut a skiff.',
    unlockLevel: 'verdance-2',
  },
  {
    id: 'wraith', name: 'Wraith Ghostwing', cost: 26000, armor: 32, speed: 200, hitRadius: 3, sidekickSlots: 2,
    desc: 'Stealth racer with a razor-thin profile. Blistering speed, modest plating.',
    unlockLevel: 'thalassa-3',
  },
  {
    id: 'tempest', name: 'Tempest Vanguard', cost: 48000, armor: 46, speed: 175, hitRadius: 4, sidekickSlots: 2,
    desc: 'Elite multi-role frame: heavy plating, quick thrusters and a compact core.',
    unlockLevel: 'cinder-1',
  },
  {
    id: 'leviathan', name: 'Leviathan Ark', cost: 90000, armor: 60, speed: 125, hitRadius: 6, sidekickSlots: 2,
    desc: 'Super-heavy fortress hull. Colossal armour for pilots who would rather not dodge.',
    unlockLevel: 'glacia-3',
  },
];
