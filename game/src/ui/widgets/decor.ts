// =====================================================================================
//  DECOR — small visual building blocks shared by the menu scenes: screen headers, neon
//  rules, NEW badges, scanline overlays, spark bursts, ring pulses and vignettes.
//  Every texture is generated once (white, tinted at runtime) and cached for the session.
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

export interface HeaderOpts {
  y?: number;            // top of the title (default 10)
  sub?: string;          // small line under the rule
  subColor?: number;     // default COLORS.teal
  icon?: string;         // texture drawn left of the title
  depth?: number;
}

/**
 * Screen header: big FONT.l title centred at the top, a magenta neon rule with end ticks and
 * an optional sub line. Returns the container; data 'bottom' = y below the header, data
 * 'subText' = the sub line BitmapText (when `sub` was given) for live updates.
 */
export function header(scene: Phaser.Scene, title: string, opts: HeaderOpts = {}): Phaser.GameObjects.Container {
  const { width } = scene.scale.gameSize;
  const y = opts.y ?? 10;
  const c = scene.add.container(0, 0);
  if (opts.depth !== undefined) c.setDepth(opts.depth);
  const tw = measure(scene, title, 'l');
  const hasIcon = !!opts.icon && scene.textures.exists(opts.icon);
  const total = tw + (hasIcon ? 20 : 0);
  const left = Math.round((width - total) / 2);
  if (hasIcon && opts.icon) c.add(scene.add.image(left, y + 8, opts.icon).setOrigin(0, 0.5));
  c.add(text(scene, left + (hasIcon ? 20 : 0), y, title, { size: 'l' }));
  const ruleW = Math.min(width - 24, Math.max(140, total + 64));
  const ry = y + 20;
  c.add(neonRule(scene, width / 2, ry, ruleW, COLORS.accent));
  const tick = (x: number) => scene.add.rectangle(x, ry - 1, 2, 4, COLORS.accentLight).setOrigin(0.5, 0);
  c.add([tick(Math.round(width / 2 - total / 2 - 12)), tick(Math.round(width / 2 + total / 2 + 12))]);
  let bottom = ry + 3;
  if (opts.sub !== undefined) {
    const sub = text(scene, width / 2, ry + 6, opts.sub, { size: 's', color: opts.subColor ?? COLORS.teal, originX: 0.5 });
    c.add(sub);
    c.setData('subText', sub);
    bottom = ry + 14;
  }
  c.setData('bottom', bottom);
  return c;
}

/** Small pill badge (e.g. "NEW") with a dark label; (x, y) = left / vertical centre. Pulses. */
export function badge(scene: Phaser.Scene, x: number, y: number, label: string, color: number = COLORS.accent, pulse = true): Phaser.GameObjects.Container {
  const w = measure(scene, label, 's') + 6;
  const h = 10;
  const key = cachedTexture(scene, `__w_pill_${w}`, w, h, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1, 0, w - 2, h);
    ctx.fillRect(0, 1, w, h - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(1, h - 2, w - 2, 1);
  });
  const c = scene.add.container(Math.round(x), Math.round(y));
  c.add(scene.add.image(0, 0, key).setOrigin(0, 0.5).setTint(color));
  c.add(text(scene, 3, 0, label, { size: 's', color: COLORS.bg, originY: 0.5 }));
  c.setSize(w, h);
  if (pulse) scene.tweens.add({ targets: c, alpha: 0.55, duration: 460, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [2] });
  return c;
}

/** CRT scanline overlay (every other row darkened) over a rectangle. */
export function scanlines(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.22): Phaser.GameObjects.Image {
  const width = Math.max(1, Math.round(w));
  const height = Math.max(1, Math.round(h));
  const key = cachedTexture(scene, `__w_scan_${width}x${height}`, width, height, (ctx) => {
    ctx.fillStyle = '#000000';
    for (let yy = 1; yy < height; yy += 2) ctx.fillRect(0, yy, width, 1);
  });
  return scene.add.image(Math.round(x), Math.round(y), key).setOrigin(0).setAlpha(alpha);
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

/** Gold credits amount with the ui_icon_credits icon; (x, y) = left / vertical centre. */
export function creditsTag(
  scene: Phaser.Scene, x: number, y: number, label: string, opts: { size?: 's' | 'm'; color?: number; originX?: number } = {},
): Phaser.GameObjects.Container {
  const size = opts.size ?? 'm';
  const c = scene.add.container(Math.round(x), Math.round(y));
  const hasIcon = scene.textures.exists('ui_icon_credits');
  const t = text(scene, hasIcon ? 13 : 0, 0, label, { size, color: opts.color ?? COLORS.gold, originY: 0.5 });
  if (hasIcon) c.add(scene.add.image(0, 0, 'ui_icon_credits').setOrigin(0, 0.5));
  c.add(t);
  const w = (hasIcon ? 13 : 0) + t.width;
  if (opts.originX) c.x = Math.round(x - w * opts.originX);
  c.setSize(w, 10);
  return c;
}
