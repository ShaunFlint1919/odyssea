// Level constructor shared by the planet scripts: derives id, biome, seed and boss from the
// campaign table so every planet file only describes its design.
import type { LevelDef } from '../../types';
import { CAMPAIGN, seedOf } from '../helpers';
import { buildWaves, type WaveBlock } from '../waves';

export interface LevelSpec {
  planet: string;
  index: 1 | 2 | 3;
  name: string;
  duration: number;
  scrollSpeed: number;
  briefing: string;
  intel?: string;
  midboss?: { t: number; enemy: string };
  waves: WaveBlock[];
}

/** Build a LevelDef: id `<planet>-<index>`, biome / boss from CAMPAIGN, seed from the id. */
export function level(s: LevelSpec): LevelDef {
  const c = CAMPAIGN.find((p) => p.planet === s.planet);
  const id = `${s.planet}-${s.index}`;
  const def: LevelDef = {
    id,
    planet: s.planet,
    index: s.index,
    name: s.name,
    biome: c ? c.biome : 'space',
    seed: seedOf(id),
    duration: s.duration,
    scrollSpeed: s.scrollSpeed,
    waves: buildWaves(...s.waves),
    briefing: s.briefing,
  };
  if (s.midboss) def.midboss = s.midboss;
  if (s.index === 3 && c) def.boss = c.boss;
  if (s.intel) def.intel = s.intel;
  return def;
}
