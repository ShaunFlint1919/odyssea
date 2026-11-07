// =====================================================================================
//  META SCREENS — shared chrome built on the UI kit: backdrop, header strip with a back
//  button and an animated credits readout, recessed "screens" with scanlines and corner
//  brackets, section labels, feedback toasts and badges.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, DEPTH } from '../../config';
import * as kit from '../kit';
import { addTexture, makeCanvas } from '../../art/pixel';
import { META, ensureMetaArt, menuBackdrop } from './art';
import { fmt } from './common';

/** Depth layers used by the meta scenes. */
export const MD = {
  bg: -30,
  stars: -25,
  panel: 0,
  content: 2,
  overlay: 6,
  header: 30,
  float: 40,
  toast: DEPTH.overlay - 5,
} as const;

/** Header strip height (content starts below it). */
export const HEADER_H = 26;

/** Full-screen backdrop (gradient + slow starfield). */
export function backdrop(scene: Phaser.Scene, opts: { stars?: number; speed?: number } = {}): void {
  ensureMetaArt(scene);
  const { width, height } = scene.scale.gameSize;
  scene.add.image(0, 0, menuBackdrop(scene, width, height)).setOrigin(0).setDepth(MD.bg);
  kit.starfield(scene, { density: opts.stars ?? 0.6, speed: opts.speed ?? 5, depth: MD.stars });
}

// ------------------------------------------------------------------------- credits readout

/** Gold credits value with the credits icon; set() animates the count. (x, y) = right edge, vertical centre. */
export class CreditsReadout {
  readonly container: Phaser.GameObjects.Container;
  private readonly label: Phaser.GameObjects.BitmapText;
  private readonly icon: Phaser.GameObjects.Image | null;
  private shown: number;
  private tween?: Phaser.Tweens.Tween;
  private readonly counter = { v: 0 };

  constructor(private readonly scene: Phaser.Scene, x: number, y: number, value: number, opts: { size?: kit.FontSize; depth?: number } = {}) {
    this.shown = value;
    this.container = scene.add.container(Math.round(x), Math.round(y));
    if (opts.depth !== undefined) this.container.setDepth(opts.depth);
    this.label = kit.text(scene, 0, 0, fmt(value), { size: opts.size ?? 'm', color: COLORS.gold, originX: 1, originY: 0.5 });
    this.icon = scene.textures.exists('ui_icon_credits') ? scene.add.image(0, 0, 'ui_icon_credits').setOrigin(1, 0.5) : null;
    this.container.add(this.label);
    if (this.icon) this.container.add(this.icon);
    this.layout();
  }

  private layout(): void {
    if (this.icon) this.icon.setX(-this.label.width - 3);
  }

  /** Width of the readout in px (icon included). */
  get width(): number { return this.label.width + (this.icon ? this.icon.width + 3 : 0); }

  /** Animate to a new value (count up/down) and flash green/red. */
  set(value: number, animate = true): void {
    if (value === this.shown && !this.tween) return;
    this.tween?.stop();
    const from = this.shown;
    this.shown = value;
    if (!animate) { this.label.setText(fmt(value)); this.layout(); return; }
    this.counter.v = from;
    this.label.setTint(value < from ? COLORS.bad : COLORS.good);
    this.tween = this.scene.tweens.add({
      targets: this.counter,
      v: value,
      duration: 420,
      ease: 'Cubic.Out',
      onUpdate: () => { this.label.setText(fmt(Math.round(this.counter.v))); this.layout(); },
      onComplete: () => { this.label.setText(fmt(value)).setTint(COLORS.gold); this.layout(); this.tween = undefined; },
    });
  }
}

// ------------------------------------------------------------------------- header

function headerTexture(scene: Phaser.Scene, w: number): string {
  const key = `meta_hdr_${w}`;
  if (scene.textures.exists(key)) return key;
  const h = HEADER_H + 3;
  const { canvas, ctx } = makeCanvas(w, h);
  for (let y = 0; y < HEADER_H - 2; y++) {
    const t = y / (HEADER_H - 3);
    const r = Math.round(29 - 13 * t), g = Math.round(26 - 12 * t), b = Math.round(46 - 21 * t);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, y, w, 1);
  }
  ctx.fillStyle = '#3a3550';
  ctx.fillRect(0, 0, w, 1);
  // diagonal plating hatch on the right half
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let x = Math.floor(w * 0.45); x < w; x += 6) {
    for (let y = 2; y < HEADER_H - 3; y++) ctx.fillRect(x + y, y, 1, 1);
  }
  // neon base line: magenta accent on the left, teal elsewhere, glow below
  ctx.fillStyle = '#0a0810';
  ctx.fillRect(0, HEADER_H - 2, w, 1);
  ctx.fillStyle = '#2ee6c8';
  ctx.fillRect(0, HEADER_H - 1, w, 1);
  ctx.fillStyle = '#d04cff';
  ctx.fillRect(0, HEADER_H - 1, 46, 1);
  ctx.fillRect(46, HEADER_H - 1, 2, 1);
  ctx.fillStyle = 'rgba(46,230,200,0.38)';
  ctx.fillRect(48, HEADER_H, w - 48, 1);
  ctx.fillStyle = 'rgba(208,76,255,0.38)';
  ctx.fillRect(0, HEADER_H, 48, 1);
  ctx.fillStyle = 'rgba(46,230,200,0.12)';
  ctx.fillRect(0, HEADER_H + 1, w, 1);
  // tick marks on the line
  ctx.fillStyle = '#2ee6c8';
  for (let x = w - 6; x > w * 0.55; x -= 10) ctx.fillRect(x, HEADER_H - 3, 1, 2);
  addTexture(scene, key, canvas);
  return key;
}

export interface HeaderApi {
  readonly container: Phaser.GameObjects.Container;
  readonly credits: CreditsReadout | null;
  setTitle(title: string): void;
}

/**
 * Top strip: optional back button (ui_arrow_l), optional icon, FONT.l title, credits readout
 * on the right. Returns the credits readout so scenes can animate purchases.
 */
export function header(
  scene: Phaser.Scene, title: string,
  opts: { onBack?: () => void; credits?: number | null; icon?: string; subtitle?: string } = {},
): HeaderApi {
  const { width } = scene.scale.gameSize;
  const c = scene.add.container(0, 0).setDepth(MD.header);
  c.add(scene.add.image(0, 0, headerTexture(scene, width)).setOrigin(0));
  let x = 8;
  if (opts.onBack) {
    const back = opts.onBack;
    c.add(kit.iconButton(scene, 15, 12, scene.textures.exists('ui_arrow_l') ? 'ui_arrow_l' : META.icDone, () => back(), 22));
    x = 32;
  }
  // magenta accent bar before the title
  c.add(scene.add.rectangle(x, 6, 3, 13, COLORS.accent).setOrigin(0));
  c.add(scene.add.rectangle(x + 3, 6, 1, 13, COLORS.accentLight, 0.6).setOrigin(0));
  x += 8;
  let iconImg: Phaser.GameObjects.Image | null = null;
  if (opts.icon && scene.textures.exists(opts.icon)) {
    iconImg = scene.add.image(x, 12, opts.icon).setOrigin(0, 0.5);
    c.add(iconImg);
    x += iconImg.width + 5;
  }
  const t = kit.text(scene, x, 5, title, { size: 'l' });
  c.add(t);
  let sub: Phaser.GameObjects.BitmapText | null = null;
  if (opts.subtitle) {
    sub = kit.text(scene, x + t.width + 6, 13, opts.subtitle, { size: 's', color: COLORS.textDim, originY: 0.5 });
    c.add(sub);
  }
  let credits: CreditsReadout | null = null;
  if (opts.credits !== undefined && opts.credits !== null) {
    const pw = 92;
    c.add(kit.panel(scene, width - pw - 3, 3, pw, 19, 'inset'));
    credits = new CreditsReadout(scene, width - 10, 13, opts.credits, { size: 'm' });
    c.add(credits.container);
  }
  return {
    container: c,
    credits,
    setTitle: (s: string) => {
      t.setText(s);
      if (sub) sub.setX(t.x + t.width + 6);
    },
  };
}

// ------------------------------------------------------------------------- framed screens

/** Teal corner brackets around a rectangle (HUD framing). */
export function cornerBrackets(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number = COLORS.teal, len = 5, depth: number = MD.overlay): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(color, 0.9);
  const r = (rx: number, ry: number, rw: number, rh: number) => g.fillRect(Math.round(rx), Math.round(ry), rw, rh);
  r(x, y, len, 1); r(x, y, 1, len);
  r(x + w - len, y, len, 1); r(x + w - 1, y, 1, len);
  r(x, y + h - 1, len, 1); r(x, y + h - len, 1, len);
  r(x + w - len, y + h - 1, len, 1); r(x + w - 1, y + h - len, 1, len);
  return g;
}

/** Scanline overlay (CRT look) over a rectangle: the shared 'ui_scanlines' tile (own fallback). */
export function scanlines(scene: Phaser.Scene, x: number, y: number, w: number, h: number, depth: number = MD.overlay, alpha = 1): Phaser.GameObjects.TileSprite {
  ensureMetaArt(scene);
  const key = scene.textures.exists('ui_scanlines') ? 'ui_scanlines' : META.scan;
  return scene.add.tileSprite(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), key).setOrigin(0).setDepth(depth).setAlpha(alpha);
}

/** Magenta section label with a diamond marker and a thin rule up to `w`. Returns its height (8). */
export function sectionLabel(scene: Phaser.Scene, x: number, y: number, label: string, w = 0, depth: number = MD.content, color: number = COLORS.accent): Phaser.GameObjects.Container {
  const c = scene.add.container(Math.round(x), Math.round(y)).setDepth(depth);
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRect(1, 3, 3, 1); g.fillRect(2, 2, 1, 3);
  c.add(g);
  const t = kit.text(scene, 7, 0, label, { size: 's', color });
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

// ------------------------------------------------------------------------- feedback

const activeToast = new WeakMap<Phaser.Scene, Phaser.GameObjects.Container>();

/** Short centred feedback banner ("NOT ENOUGH CREDITS", "INSTALLED"...) at height y. */
export function toast(scene: Phaser.Scene, msg: string, color: number, y?: number, sub?: string): void {
  const { width, height } = scene.scale.gameSize;
  activeToast.get(scene)?.destroy();
  const good = color === COLORS.good || color === COLORS.teal;
  const tw = Math.max(kit.measure(scene, msg, 'm'), sub ? kit.measure(scene, sub, 's') : 0);
  const w = Math.min(width - 16, Math.max(170, tw + 52));
  const h = sub ? 38 : 28;
  const cy = Math.round(y ?? height / 2);
  const c = scene.add.container(Math.round(width / 2), cy).setDepth(MD.toast);
  c.add(scene.add.image(0, 0, META.glow).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setDisplaySize(w + 40, h + 30));
  c.add(kit.panel(scene, -w / 2, -h / 2, w, h, 'raised'));
  const g = scene.add.graphics();
  g.lineStyle(1, color, 0.9).strokeRect(-w / 2 + 2.5, -h / 2 + 2.5, w - 5, h - 5);
  g.fillStyle(color, 1).fillRect(-w / 2 + 3, -h / 2 + 3, 4, h - 6);
  c.add(g);
  // status glyph
  const gx = -w / 2 + 18;
  if (good && scene.textures.exists(META.tick)) c.add(scene.add.image(gx, 0, META.tick));
  else c.add(kit.text(scene, gx, 0, '!', { size: 'm', color, originX: 0.5, originY: 0.5 }));
  const tx = 8;
  c.add(kit.text(scene, tx, sub ? -7 : 0, msg, { size: 'm', color, originX: 0.5, originY: 0.5 }));
  if (sub) c.add(kit.text(scene, tx, 8, kit.fit(sub, w - 44, 's'), { size: 's', color: COLORS.text, originX: 0.5, originY: 0.5 }));
  c.setScale(0.7, 0.3).setAlpha(0);
  activeToast.set(scene, c);
  scene.tweens.add({ targets: c, scaleX: 1, scaleY: 1, alpha: 1, duration: 130, ease: 'Back.Out' });
  scene.tweens.add({
    targets: c, alpha: 0, y: cy - 8, delay: 1100, duration: 260,
    onComplete: () => { if (activeToast.get(scene) === c) activeToast.delete(scene); c.destroy(); },
  });
}

/** A small pulsing magenta badge with a number (unread counters). (x, y) = centre. */
export function badge(scene: Phaser.Scene, x: number, y: number, n: number, depth: number = MD.float): Phaser.GameObjects.Container {
  const c = scene.add.container(Math.round(x), Math.round(y)).setDepth(depth);
  const label = n > 99 ? '99+' : String(n);
  const w = Math.max(14, label.length * 6 + 8);
  const g = scene.add.graphics();
  g.fillStyle(0x0a0810, 1).fillRoundedRect(-w / 2 - 1, -7, w + 2, 14, 6);
  g.fillStyle(COLORS.accent, 1).fillRoundedRect(-w / 2, -6, w, 12, 5);
  g.fillStyle(COLORS.accentLight, 0.7).fillRect(-w / 2 + 3, -5, w - 6, 1);
  c.add(g);
  c.add(kit.text(scene, 0, 0, label, { size: 's', color: 0xffffff, originX: 0.5, originY: 0.5 }));
  scene.tweens.add({ targets: c, scale: 1.15, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  return c;
}
