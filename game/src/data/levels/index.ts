// All 24 campaign levels in campaign order (one file per planet).
import type { LevelDef } from '../../types';
import { KESSRA_LEVELS } from './kessra';
import { VERDANCE_LEVELS } from './verdance';
import { THALASSA_LEVELS } from './thalassa';
import { UMBRA_LEVELS } from './umbra';
import { CINDER_LEVELS } from './cinder';
import { GLACIA_LEVELS } from './glacia';
import { RIFT_LEVELS } from './rift';
import { AXIOM_LEVELS } from './axiom';

export const LEVELS: LevelDef[] = [
  ...KESSRA_LEVELS, ...VERDANCE_LEVELS, ...THALASSA_LEVELS, ...UMBRA_LEVELS,
  ...CINDER_LEVELS, ...GLACIA_LEVELS, ...RIFT_LEVELS, ...AXIOM_LEVELS,
];
