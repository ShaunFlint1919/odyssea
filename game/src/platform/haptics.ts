// =====================================================================================
//  HAPTICS — short vibrations for hits, explosions and UI feedback.
//  Native: @capacitor/haptics impact styles. Web: navigator.vibrate (only after a user
//  gesture, otherwise Chrome logs an intervention). Respects settings.vibrate and is
//  rate-limited so a hail of hits never turns into a continuous buzz.
// =====================================================================================
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { getSave } from '../state/save';
import { isNative } from './device';

export type HapticKind = 'light' | 'medium' | 'heavy';

const IMPACT: Record<HapticKind, ImpactStyle> = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
/** Web vibration length per kind (ms). */
const WEB_MS: Record<HapticKind, number> = { light: 12, medium: 25, heavy: 45 };
/** Minimum gap before another pulse of the same or lower strength (ms). */
const COOLDOWN_MS: Record<HapticKind, number> = { light: 70, medium: 110, heavy: 160 };
const RANK: Record<HapticKind, number> = { light: 1, medium: 2, heavy: 3 };

let busyUntil = 0;
let lastRank = 0;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function webVibrate(ms: number): void {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
  if (typeof nav.vibrate !== 'function') return;
  if (nav.userActivation && !nav.userActivation.hasBeenActive) return;
  try {
    nav.vibrate(ms);
  } catch {
    // Some embedded browsers throw when vibration is blocked: ignore.
  }
}

/** Vibrate the device (respects settings.vibrate; no-op on desktop). */
export function haptic(kind: HapticKind): void {
  if (!getSave().settings.vibrate) return;
  const t = now();
  const rank = RANK[kind] ?? 1;
  if (t < busyUntil && rank <= lastRank) return;
  busyUntil = t + (COOLDOWN_MS[kind] ?? 80);
  lastRank = rank;
  if (isNative()) {
    Haptics.impact({ style: IMPACT[kind] ?? ImpactStyle.Light }).catch(() => undefined);
  } else {
    webVibrate(WEB_MS[kind] ?? 15);
  }
}
