// STUB — to be implemented by the platform module owner (see docs/ARCHITECTURE.md).
export type HapticKind = 'light' | 'medium' | 'heavy';
/** Vibrate the device (respects settings.vibrate; no-op on desktop). */
export function haptic(kind: HapticKind): void { void kind; }
