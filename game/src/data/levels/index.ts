// All 24 campaign levels in campaign order (one file per planet).
import type { LevelDef } from '../../types';
import { KESSRA_LEVELS } from './kessra';
import { VERDANCE_LEVELS } from './verdance';
import { THALASSA_LEVELS } from './thalassa';

export const LEVELS: LevelDef[] = [...KESSRA_LEVELS, ...VERDANCE_LEVELS, ...THALASSA_LEVELS];
