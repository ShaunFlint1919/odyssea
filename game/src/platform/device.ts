// =====================================================================================
//  DEVICE — native (Capacitor Android) vs web glue: app foreground/background events and
//  the Android hardware back button. Immersive fullscreen, portrait lock and keep-screen-on
//  are done natively in android/app/src/main/java/.../MainActivity.java (nothing to lock on web).
// =====================================================================================
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { audio } from '../audio';
import { flushSave } from '../state/save';

type StateListener = (active: boolean) => void;
type BackHandler = () => boolean;

const stateListeners: StateListener[] = [];
/** Back handlers, most recent LAST (dispatch walks the stack from the end). */
const backStack: BackHandler[] = [];
let appActive = true;
let initialized = false;

/** True inside the Capacitor Android app. */
export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Current foreground state (false while the app / tab is in the background). */
export function isAppActive(): boolean {
  return appActive;
}

function setActive(active: boolean): void {
  if (active === appActive) return; // visibilitychange and App.appStateChange both report: dedupe
  appActive = active;
  if (!active) flushSave();
  for (const cb of stateListeners.slice()) {
    try {
      cb(active);
    } catch (e) {
      console.warn('[platform] app state listener failed', e);
    }
  }
}

/** Calls back when the app goes to background / foreground (visibilitychange + Capacitor App). */
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
 * otherwise the next handler is asked. When nobody consumes it, the app exits.
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

/** Called once at boot: registers lifecycle + back-button listeners (idempotent). */
export function initPlatform(): void {
  if (initialized) return;
  initialized = true;

  // Audio follows the app lifecycle; pending debounced saves are flushed in setActive(false).
  stateListeners.unshift((active) => {
    if (active) audio.resume();
    else audio.suspend();
  });

  if (typeof document !== 'undefined') {
    appActive = document.visibilityState !== 'hidden';
    document.addEventListener('visibilitychange', () => setActive(document.visibilityState !== 'hidden'));
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => flushSave());
  }

  if (!isNative()) return;
  App.addListener('appStateChange', (s) => setActive(s.isActive)).catch((e: unknown) => {
    console.warn('[platform] appStateChange listener unavailable', e);
  });
  App.addListener('backButton', () => {
    if (!dispatchBackButton()) {
      flushSave();
      // Android 12+ guidance: send the task to the background instead of finishing it, so the
      // next launch resumes instantly instead of reloading the WebView.
      App.minimizeApp().catch(() => App.exitApp().catch(() => undefined));
    }
  }).catch((e: unknown) => {
    console.warn('[platform] backButton listener unavailable', e);
  });
}
