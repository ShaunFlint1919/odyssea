// =====================================================================================
//  DEVICE — native (Capacitor Android) vs web glue: app foreground / background state, the
//  Android hardware back button and a frame-loop watchdog. Immersive fullscreen, portrait lock
//  and keep-screen-on are native (android/app/src/main/java/.../MainActivity.java).
//
//  The app is ACTIVE only while every source agrees (AND, never last-writer-wins):
//    - the page is visible (visibilitychange);
//    - the native app state is active (Android: Capacitor App 'appStateChange', plus
//      App.getState() at boot for reports sent before the page listened; MainActivity keeps it
//      false while a phone call rings or is in progress, also right after a resume);
//    - the window has focus (Android: MainActivity's FOCUS_EVENT, because the notification
//      shade, quick settings, the power menu, the assistant and system dialogs take focus
//      without pausing the activity; web: window blur / focus). A pointer or key press reaching
//      the page always counts as focus, so a missed report can never keep the game muted.
//  Inactive: audio suspended, pending debounced save flushed, missions auto-pause (GameScene).
//
//  WATCHDOG: an uncaught exception inside a Phaser frame stops its requestAnimationFrame loop for
//  good (frozen picture, while timers and music keep running and the scenes' back handlers keep
//  swallowing Back). While the app is active, a Phaser frame counter that stops advancing
//  (window.__NC__.game.loop.frame, installed by main.ts) marks the loop dead: audio is suspended,
//  and the next Back press or return to the foreground flushes the save and reloads the page. At
//  most one such reload per RELOAD_GUARD_MS and session (sessionStorage), so a crash at boot never
//  turns into a reload loop: Back then closes the app instead.
// =====================================================================================
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { audio } from '../audio';
import { flushSave } from '../state/save';

type StateListener = (active: boolean) => void;
type BackHandler = () => boolean;

/** Window event MainActivity dispatches when its window gains / loses focus (`focused: boolean` on the event). */
export const FOCUS_EVENT = 'nc:focus';

/** Watchdog sampling period (ms). */
const WATCH_MS = 250;
/** The frame loop is dead when no frame ran for this long while the app is active (ms)... */
const STALL_MS = 1500;
/** ...or for this long since an uncaught error (ms). */
const STALL_AFTER_ERROR_MS = 400;
/** A sample this late after the previous one (ms): main thread busy or timers throttled, no verdict. */
const LATE_SAMPLE_MS = 1000;
/** Back in the foreground with a dead loop: the loop gets this long to show a frame before the reload (ms). */
const RESUME_CHECK_MS = 600;
/** sessionStorage key holding Date.now() of the last recovery reload. */
const RELOAD_KEY = 'nc.recoveryReloadAt';
/** At most one recovery reload within this period (ms). */
const RELOAD_GUARD_MS = 60000;

const stateListeners: StateListener[] = [];
/** Back handlers, most recent LAST (dispatch walks the stack from the end). */
const backStack: BackHandler[] = [];
let initialized = false;

// Merged app state and its inputs.
let appActive = true;
let pageVisible = true;
let nativeActive = true;
let windowFocused = true;
/** Count of native appStateChange reports (an App.getState() answer older than one is ignored). */
let nativeReports = 0;

// Watchdog.
let watchdogEnabled = false;
let watchTimer: ReturnType<typeof setInterval> | null = null;
let audioWanted = true;
let frozen = false;
let lastFrame = -1;
let lastAdvanceAt = 0;
let lastSampleAt = 0;
let errorAt = -1;
let reloading = false;

/** True inside the Capacitor Android app. */
export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Current foreground state: false while the app / tab is in the background, unfocused or in a phone call. */
export function isAppActive(): boolean {
  return appActive;
}

/** Snapshot of the merged app state and the watchdog verdict (tests / debugging). */
export function platformState(): { active: boolean; visible: boolean; native: boolean; focused: boolean; frozen: boolean } {
  return { active: appActive, visible: pageVisible, native: nativeActive, focused: windowFocused, frozen };
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** Recomputes the merged state; listeners only hear real changes (sources report the same edge twice). */
function refresh(): void {
  const active = pageVisible && nativeActive && windowFocused;
  if (active === appActive) return;
  appActive = active;
  if (!active) flushSave();
  syncAudio();
  syncWatchdog();
  for (const cb of stateListeners.slice()) {
    try {
      cb(active);
    } catch (e) {
      console.warn('[platform] app state listener failed', e);
    }
  }
  if (active && frozen) {
    // Foreground again with a dead frame loop: give it a moment to prove otherwise, then reload.
    setTimeout(() => {
      sampleLoop();
      if (frozen && appActive) recover();
    }, RESUME_CHECK_MS);
  }
}

function setFocused(focused: boolean): void {
  if (focused === windowFocused) return;
  windowFocused = focused;
  if (initialized) refresh();
}

/** Audio runs only while the app is active and its frame loop alive. */
function syncAudio(): void {
  const want = appActive && !frozen;
  if (want === audioWanted) return;
  audioWanted = want;
  if (want) audio.resume();
  else audio.suspend();
}

/** Calls back when the app goes to background / foreground (see the header for what counts). */
export function onAppStateChange(cb: (active: boolean) => void): void {
  stateListeners.push(cb);
}

/** Same as onAppStateChange but returns an unsubscribe function (use it from scenes). */
export function addAppStateListener(cb: (active: boolean) => void): () => void {
  stateListeners.push(cb);
  return () => {
    const i = stateListeners.lastIndexOf(cb);
    if (i >= 0) stateListeners.splice(i, 1);
  };
}

/**
 * Pushes an Android back-button handler on the handler STACK (latest registered is asked first)
 * and returns its unsubscribe function. Return true from the handler if it consumed the press;
 * otherwise the next handler is asked. When nobody consumes it, the app goes to the background.
 */
export function pushBackHandler(cb: () => boolean): () => void {
  backStack.push(cb);
  return () => {
    const i = backStack.lastIndexOf(cb);
    if (i >= 0) backStack.splice(i, 1);
  };
}

/** Android hardware back button. Return true from the handler if it was consumed. (Permanent; prefer pushBackHandler.) */
export function onBackButton(cb: () => boolean): void {
  pushBackHandler(cb);
}

/** Runs the back-button handler stack (also usable on web for tests). Returns true if a handler consumed it. */
export function dispatchBackButton(): boolean {
  for (let i = backStack.length - 1; i >= 0; i--) {
    const handler = backStack[i];
    if (!handler) continue;
    try {
      if (handler()) return true;
    } catch (e) {
      console.warn('[platform] back handler failed', e);
    }
  }
  return false;
}

// ------------------------------------------------------------------------------ watchdog

/** Phaser's frame counter, or null while there is no game or its loop has not started. */
function loopFrame(): number | null {
  const hooks = (window as unknown as { __NC__?: { game?: unknown } }).__NC__;
  const loop = (hooks?.game as { loop?: { started?: unknown; frame?: unknown } } | null | undefined)?.loop;
  return loop && loop.started === true && typeof loop.frame === 'number' ? loop.frame : null;
}

/** One watchdog sample (timer, and on demand before Back / resume decisions): updates `frozen`. */
function sampleLoop(): void {
  const t = nowMs();
  const late = lastSampleAt > 0 && t - lastSampleAt > LATE_SAMPLE_MS;
  lastSampleAt = t;
  const frame = loopFrame();
  if (frame === null) {
    lastAdvanceAt = t;
    return;
  }
  if (frame !== lastFrame) {
    lastFrame = frame;
    lastAdvanceAt = t;
    errorAt = -1;
    if (frozen) setFrozen(false);
    return;
  }
  // No verdict unless the loop should be running (visible, focused, resumed) and this sampler
  // itself ran on time (a busy main thread delays frames and timers alike).
  if (!appActive || late) {
    lastAdvanceAt = t;
    return;
  }
  if (!frozen && t - lastAdvanceAt >= (errorAt >= 0 ? STALL_AFTER_ERROR_MS : STALL_MS)) setFrozen(true);
}

function setFrozen(dead: boolean): void {
  frozen = dead;
  if (dead) console.warn('[platform] the frame loop stopped: audio suspended, Back or a return to the app reloads the game');
  syncAudio();
}

/** Samples only while the app is active (no timer wake-ups in the background). */
function syncWatchdog(): void {
  if (!watchdogEnabled) return;
  if (appActive && watchTimer === null) {
    lastSampleAt = 0;
    lastAdvanceAt = nowMs();
    watchTimer = setInterval(sampleLoop, WATCH_MS);
  } else if (!appActive && watchTimer !== null) {
    clearInterval(watchTimer);
    watchTimer = null;
  }
}

/** Uncaught error / rejection: if no frame follows, the loop is declared dead sooner. */
function onUncaught(): void {
  if (errorAt < 0) errorAt = nowMs();
}

/** Claims the session's recovery reload; false while the guard forbids it or cannot be stored. */
function claimReload(): boolean {
  try {
    const store = window.sessionStorage;
    const t = Date.now();
    const last = Number(store.getItem(RELOAD_KEY));
    if (last > 0 && t >= last && t - last < RELOAD_GUARD_MS) return false;
    store.setItem(RELOAD_KEY, String(t));
    return store.getItem(RELOAD_KEY) === String(t);
  } catch {
    return false; // no storage: a reload loop could not be prevented, so never reload
  }
}

/** Last resort once the frame loop died: persist, then reload the page. False when the guard forbids it. */
function recover(): boolean {
  if (reloading) return true;
  flushSave();
  if (!claimReload()) {
    console.warn('[platform] the frame loop died again right after a recovery reload: not reloading');
    return false;
  }
  reloading = true;
  try {
    window.location.reload();
    return true;
  } catch {
    reloading = false;
    return false;
  }
}

/** Android back button: the scenes' handler stack, or the recovery path when the frame loop is dead. */
function onNativeBack(): void {
  sampleLoop();
  if (frozen) {
    // Nothing on screen can react: the stale handlers would swallow the press for good.
    if (!recover()) App.exitApp().catch(() => undefined);
    return;
  }
  if (!dispatchBackButton()) {
    flushSave();
    // Android 12+ guidance: send the task to the background instead of finishing it, so the
    // next launch resumes instantly instead of reloading the WebView.
    App.minimizeApp().catch(() => App.exitApp().catch(() => undefined));
  }
}

// MainActivity reports window focus from the first page load on (also re-sent once the page has
// loaded): listen from import time so a report sent before initPlatform() is not lost.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener(FOCUS_EVENT, (e: Event) => {
    const focused = (e as Event & { focused?: unknown }).focused;
    if (typeof focused === 'boolean') setFocused(focused);
  });
}

/** Called once at boot: registers lifecycle, focus, back-button and watchdog listeners (idempotent). */
export function initPlatform(): void {
  if (initialized) return;
  initialized = true;
  const native = isNative();

  if (typeof document !== 'undefined') {
    pageVisible = document.visibilityState !== 'hidden';
    document.addEventListener('visibilitychange', () => {
      pageVisible = document.visibilityState !== 'hidden';
      refresh();
    });
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('pagehide', () => flushSave());
    if (!native) {
      // On Android the activity's window focus (FOCUS_EVENT) is authoritative.
      window.addEventListener('blur', (e) => { if (e.target === window) setFocused(false); });
      window.addEventListener('focus', (e) => { if (e.target === window) setFocused(true); });
    }
    const focusedByInput = (): void => setFocused(true);
    window.addEventListener('pointerdown', focusedByInput, { capture: true, passive: true });
    window.addEventListener('keydown', focusedByInput, { capture: true, passive: true });
    window.addEventListener('error', onUncaught);
    window.addEventListener('unhandledrejection', onUncaught);
    watchdogEnabled = true;
  }
  appActive = pageVisible && nativeActive && windowFocused;
  syncAudio();
  syncWatchdog();

  if (!native) return;
  App.addListener('appStateChange', (s) => {
    nativeReports++;
    nativeActive = s.isActive;
    refresh();
  }).catch((e: unknown) => {
    console.warn('[platform] appStateChange listener unavailable', e);
  });
  // Reports sent before this listener existed (a call ringing at launch, a trip to the background
  // during boot) were dropped: start from the current native state.
  const reportsBefore = nativeReports;
  App.getState().then((s) => {
    if (nativeReports !== reportsBefore || typeof s?.isActive !== 'boolean') return;
    nativeActive = s.isActive;
    refresh();
  }).catch(() => undefined);
  App.addListener('backButton', onNativeBack).catch((e: unknown) => {
    console.warn('[platform] backButton listener unavailable', e);
  });
}
