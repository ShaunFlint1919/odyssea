// Small shared helpers for the UI widgets (texture cache, number/time formatting, visibility).
import Phaser from 'phaser';

/**
 * Lazily creates a shared canvas texture `key` (kept for the whole session, reused by every
 * scene). `draw` paints into a w x h canvas with image smoothing disabled. Returns the key.
 */
export function cachedTexture(
  scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): string {
  if (scene.textures.exists(key)) return key;
  const cw = Math.max(1, Math.round(w));
  const ch = Math.max(1, Math.round(h));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx, cw, ch);
  scene.textures.addCanvas(key, canvas);
  return key;
}

/** Integer with thousands separators: 1234567 -> "1,234,567". */
export function fmtInt(n: number): string {
  const v = Math.round(n);
  const neg = v < 0;
  const s = String(Math.abs(v));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ',';
    out += s[i];
  }
  return neg ? `-${out}` : out;
}

/** Seconds as m:ss (or h:mm:ss beyond an hour). */
export function fmtTime(seconds: number): string {
  const t = Math.max(0, Math.round(seconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** True when the container and all of its ancestors are visible. */
export function isShown(obj: Phaser.GameObjects.Container): boolean {
  let o: Phaser.GameObjects.Container | null = obj;
  while (o) {
    if (!o.visible) return false;
    o = o.parentContainer;
  }
  return true;
}

/** rgba() css string of a 0xRRGGBB colour. */
export function cssColor(c: number, a = 1): string {
  return `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
}
