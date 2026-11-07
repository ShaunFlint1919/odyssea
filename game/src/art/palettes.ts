import type { Palette } from '../types';

/**
 * Swappable colour ramps (dark -> light) used for digits '1'..'5' in pixel maps.
 * Every enemy/boss sprite is generated once per palette: enemyKey(sprite, palette).
 */
export const PALETTE_RAMPS: Record<Palette, [string, string, string, string, string]> = {
  steel:   ['#1e2230', '#3a4258', '#5e6a86', '#8e9ab4', '#c8d2e6'],
  crimson: ['#2a0a12', '#5a1422', '#9a2232', '#d84a4a', '#ff9a86'],
  emerald: ['#06201a', '#0e4a32', '#1a7a48', '#3cb85e', '#9cf09a'],
  cobalt:  ['#0a1030', '#16286a', '#2448b0', '#4a86f0', '#a8d0ff'],
  amber:   ['#2a1404', '#5e3008', '#a65a10', '#e89a28', '#ffe08a'],
  violet:  ['#1a0a2a', '#3a1660', '#6a2aa0', '#a45ae0', '#e2b4ff'],
  bone:    ['#2a241c', '#5a4e3c', '#8e8064', '#c4b494', '#f2ead2'],
  toxic:   ['#0e1a04', '#28420a', '#4e7a10', '#8cc61e', '#e0ff6a'],
};
