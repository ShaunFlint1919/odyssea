// STUB — to be implemented by the platform module owner (see docs/ARCHITECTURE.md).
/** True inside the Capacitor Android app. */
export function isNative(): boolean { return false; }
/** Calls back when the app goes to background / foreground (visibilitychange + Capacitor App). */
export function onAppStateChange(cb: (active: boolean) => void): void { void cb; }
/** Android hardware back button. Return true from the handler if it was consumed. */
export function onBackButton(cb: () => boolean): void { void cb; }
/** Called once at boot: immersive fullscreen, keep screen awake if possible, etc. */
export function initPlatform(): void {}
