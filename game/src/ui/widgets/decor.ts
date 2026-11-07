// =====================================================================================
//  DECOR — small visual building blocks shared by the menu scenes: neon rules, section
//  labels, corner brackets, NEW badges, scanline overlays, spark bursts, ring pulses and
//  vignettes. (The screen header lives in ./screen.ts.) Every texture is generated once
//  (white, tinted at runtime) and cached for the session.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS } from '../../config';
import { text, measure } from '../kit';
import { cachedTexture } from './util';

/** Horizontal neon rule centred on (cx, y): bright core fading to both ends, 2 px tall. */
export function neonRule(scene: Phaser.Scene, cx: number, y: number, w: number, color: number = COLORS.accent): Phaser.GameObjects.Image {
  const width = Math.max(4, Math.round(w));
  const key = cachedTexture(scene, `__w_rule_${width}`, width, 2, (ctx) => {
    for (let x = 0; x < width; x++) {
      const t = Math.abs(x - (width - 1) / 2) / ((width - 1) / 2 || 1);
      const a = Math.max(0, 1 - t * t);
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      ctx.fillRect(x, 0, 1, 1);
      ctx.fillStyle = `rgba(255,255,255,${(a * 0.3).toFixed(3)})`;
      ctx.fillRect(x, 1, 1, 1);
    }
  });
  return scene.add.image(Math.round(cx), Math.round(y), key).setOrigin(0.5, 0).setTint(color);
}

/** Small pill badge (e.g. "NEW") with a white label; (x, y) = left / vertical centre. Pulses. */
export function badge(scene: Phaser.Scene, x: number, y: number, label: string, color: number = COLORS.accent, pulse = true): Phaser.GameObjects.Container {
  const w = measure(scene, label, 's') + 6;
  const h = 10;
  const key = cachedTexture(scene, `__w_pill_${w}`, w, h, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1, 0, w - 2, h);
    ctx.fillRect(0, 1, w, h - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(1, h - 2, w - 2, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(2, 1, w - 4, 1);
  });
  const c = scene.add.container(Math.round(x), Math.round(y));
  c.add(scene.add.image(0, 0, key).setOrigin(0, 0.5).setTint(color));
  c.add(text(scene, 3, 0, label, { size: 's', color: 0xffffff, originY: 0.5 }));
  c.setSize(w, h);
  if (pulse) scene.tweens.add({ targets: c, alpha: 0.55, duration: 460, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [2] });
  return c;
}

/**
 * CRT scanline overlay over a rectangle: a TileSprite of the art's 4x4 'ui_scanlines' tile
 * (or a baked 1x3 fallback tile). `alpha` = strength (0.3..0.6 typical), `depth` optional.
 */
export function scanlines(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.5, depth?: number,
): Phaser.GameObjects.TileSprite {
  const key = scene.textures.exists('ui_scanlines') ? 'ui_scanlines' : cachedTexture(scene, '__w_scan_tile', 1, 3, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(0, 2, 1, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.fillRect(0, 0, 1, 1);
  });
  const t = scene.add.tileSprite(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), key).setOrigin(0).setAlpha(alpha);
  if (depth !== undefined) t.setDepth(depth);
  return t;
}

/**
 * Section label: a small diamond marker + FONT.s caption and a thin rule running to `w`
 * (with an end tick). (x, y) = top-left; the label is 8 px tall.
 */
export function sectionLabel(
  scene: Phaser.Scene, x: number, y: number, label: string, w = 0, depth?: number, color: number = COLORS.accent,
): Phaser.GameObjects.Container {
  const c = scene.add.container(Math.round(x), Math.round(y));
  if (depth !== undefined) c.setDepth(depth);
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRect(1, 3, 3, 1); g.fillRect(2, 2, 1, 3);
  c.add(g);
  const t = text(scene, 7, 0, label, { size: 's', color });
  c.add(t);
  if (w > 0) {
    const lx = 7 + t.width + 4;
    if (w - lx > 4) {
      g.fillStyle(color, 0.35);
      g.fillRect(lx, 3, w - lx, 1);
      g.fillStyle(color, 0.8);
      g.fillRect(w - 2, 2, 2, 3);
    }
  }
  return c;
}

/** Corner brackets (HUD framing) around a rectangle, drawn in one Graphics. */
export function cornerBrackets(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number = COLORS.teal, len = 5, depth?: number,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  if (depth !== undefined) g.setDepth(depth);
  g.fillStyle(color, 0.9);
  const r = (rx: number, ry: number, rw: number, rh: number) => g.fillRect(Math.round(rx), Math.round(ry), rw, rh);
  r(x, y, len, 1); r(x, y, 1, len);
  r(x + w - len, y, len, 1); r(x + w - 1, y, 1, len);
  r(x, y + h - 1, len, 1); r(x, y + h - len, 1, len);
  r(x + w - len, y + h - 1, len, 1); r(x + w - 1, y + h - len, 1, len);
  return g;
}

/** Pixel sparks flying out from (x, y), then fading. Self-cleaning, no per-frame allocations. */
export function burst(
  scene: Phaser.Scene, x: number, y: number,
  opts: { count?: number; colors?: number[]; speed?: number; life?: number; depth?: number; gravity?: number } = {},
): void {
  const key = cachedTexture(scene, '__w_spark', 2, 2, (ctx) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 2, 2); });
  const count = opts.count ?? 24;
  const colors = opts.colors ?? [COLORS.teal, COLORS.accentLight, 0xffffff, COLORS.gold];
  const speed = opts.speed ?? 90;
  const life = opts.life ?? 700;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const v = speed * (0.45 + Math.random() * 0.75);
    const img = scene.add.image(x, y, key).setTint(colors[i % colors.length]).setBlendMode(Phaser.BlendModes.ADD);
    if (opts.depth !== undefined) img.setDepth(opts.depth);
    const dur = life * (0.6 + Math.random() * 0.6);
    scene.tweens.add({
      targets: img,
      x: x + Math.cos(a) * v * (dur / 1000),
      y: y + Math.sin(a) * v * (dur / 1000) + (opts.gravity ?? 0) * (dur / 1000) ** 2,
      alpha: 0,
      duration: dur,
      ease: 'Cubic.easeOut',
      onComplete: () => img.destroy(),
    });
  }
}

/** An expanding neon ring from (x, y) (radius r0 -> r1), fading out. Self-cleaning. */
export function ringPulse(
  scene: Phaser.Scene, x: number, y: number, color: number = COLORS.teal, r1 = 120, duration = 700, depth?: number,
): void {
  const size = 64;
  const key = cachedTexture(scene, '__w_ring', size, size, (ctx) => {
    const c = (size - 1) / 2;
    const img = ctx.createImageData(size, size);
    for (let yy = 0; yy < size; yy++) {
      for (let xx = 0; xx < size; xx++) {
        const d = Math.hypot(xx - c, yy - c);
        const a = Math.max(0, 1 - Math.abs(d - (c - 2)) / 2.2);
        const i = (yy * size + xx) * 4;
        img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = Math.round(a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  });
  const ring = scene.add.image(x, y, key).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2);
  if (depth !== undefined) ring.setDepth(depth);
  scene.tweens.add({
    targets: ring, scale: (r1 * 2) / size, alpha: 0, duration, ease: 'Cubic.easeOut', onComplete: () => ring.destroy(),
  });
}

/** Full-screen edge vignette (darkens towards the borders), tinted with `color`. */
export function vignette(scene: Phaser.Scene, color = 0x000000, alpha = 0.85, depth?: number): Phaser.GameObjects.Image {
  const { width, height } = scene.scale.gameSize;
  const w = Math.ceil(width / 4);
  const h = Math.ceil(height / 4);
  const key = cachedTexture(scene, `__w_vig_${w}x${h}`, w, h, (ctx) => {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - (w - 1) / 2) / (w / 2);
        const dy = (y - (h - 1) / 2) / (h / 2);
        const d = Math.min(1, Math.sqrt(dx * dx * 1.1 + dy * dy * 0.9));
        const a = Math.max(0, (d - 0.55) / 0.45) ** 1.6;
        const i = (y * w + x) * 4;
        img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = Math.round(a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  });
  const v = scene.add.image(0, 0, key).setOrigin(0).setScale(width / w, height / h).setTint(color).setAlpha(alpha);
  if (depth !== undefined) v.setDepth(depth);
  return v;
}
