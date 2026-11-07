// =====================================================================================
//  DEBUG / AUTOMATION HOOKS
//  URL params (dev, preview and Playwright screenshot runs):
//    ?scene=Game&level=kessra-1   start directly in a scene (Game needs level)
//    &god=1      player cannot die          &t=40     fast-forward the level to 40 s
//    &max=1      max loadout + credits      &credits=50000
//    &seed=123   force RNG seed             &mute=1   no audio
//    &fps=1      show FPS                   &speed=2  time scale (gameplay)
//    &shop=front open the shop on a category (with scene=Shop)
//  window.__NC__ exposes state for automated tests (tools/screens.mjs, tools/smoke.mjs).
// =====================================================================================

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

const str = (k: string): string | null => params.get(k);
const num = (k: string): number | null => {
  const v = params.get(k);
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const bool = (k: string): boolean => {
  const v = params.get(k);
  return v !== null && v !== '0' && v !== 'false';
};

export const DEBUG = {
  scene: str('scene'),
  level: str('level'),
  shop: str('shop'),
  god: bool('god'),
  max: bool('max'),
  mute: bool('mute'),
  fps: bool('fps'),
  credits: num('credits'),
  seed: num('seed'),
  t: num('t'),
  speed: num('speed'),
} as const;

/**
 * True when the page was opened with any debug / automation parameter. In PRODUCTION builds such
 * sessions never write the player's save (see src/state/save.ts), so a stray debug URL cannot
 * rewrite a real campaign; dev builds keep persisting so local tools can inspect the save.
 */
export const DEBUG_ACTIVE: boolean = ['scene', 'level', 'shop', 'god', 'max', 'mute', 'fps', 'credits', 'seed', 't', 'speed', 'bot']
  .some((k) => params.has(k));

export interface NcHooks {
  ready: boolean;          // true once the current scene finished create()
  scene: string;           // key of the last scene that called markSceneReady
  errors: string[];        // uncaught errors (also console errors in smoke tests)
  game: unknown;           // Phaser.Game
  state: Record<string, unknown>; // free-form scene state for tests (e.g. { levelTime, bossActive })
}

declare global {
  interface Window { __NC__: NcHooks }
}

export function installHooks(game: unknown): NcHooks {
  const hooks: NcHooks = { ready: false, scene: '', errors: [], game, state: {} };
  if (typeof window !== 'undefined') {
    window.__NC__ = hooks;
    window.addEventListener('error', (e) => hooks.errors.push(String(e.message || e)));
    window.addEventListener('unhandledrejection', (e) => hooks.errors.push(String((e as PromiseRejectionEvent).reason)));
  }
  return hooks;
}

/** Every scene calls this at the end of create(). */
export function markSceneReady(sceneKey: string, state: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined' || !window.__NC__) return;
  window.__NC__.scene = sceneKey;
  window.__NC__.ready = true;
  window.__NC__.state = state;
}

/** Update free-form state for tests (cheap; call at most a few times per second). */
export function setHookState(patch: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.__NC__) return;
  Object.assign(window.__NC__.state, patch);
}
