// Barrel of the UI widgets built on top of src/ui/kit.ts (owner: UI-KIT & FLOW).
export { Slider, type SliderOpts } from './Slider';
export { Toggle, type ToggleOpts } from './Toggle';
export { Typewriter, type TypewriterOpts } from './Typewriter';
export { Tally, type TallyOpts } from './Tally';
export { ScrollMenu, type ScrollMenuOpts } from './ScrollMenu';
export { header, neonRule, badge, scanlines, burst, ringPulse, vignette, creditsTag, type HeaderOpts } from './decor';
export { cachedTexture, fmtInt, fmtTime, isShown, cssColor } from './util';
export { Sequence, type SequenceStep } from './Sequence';
export {
  Board, applyOnce, demoResult, isLevelResult, isPlanetFinale, levelInfo, normalizeResult,
  type AppliedResult, type BoardRow, type LevelInfo,
} from './results';
