// =====================================================================================
//  SCREEN FRAME — the one visual frame shared by every menu screen (the Title keeps its logo
//  but uses the same status bar):
//   - LAYOUT: the spacing grid (outer margin, panel gap, text padding, header / status heights);
//   - screenHeader(): the header strip — optional back arrow (34x26 hit area), magenta accent
//     bar + FONT.l title underlined in neon, and on the right either the gold credits readout
//     or a short status text; a light pulse runs along the neon line now and then;
//   - screenBackdrop(): indigo gradient + slow starfield behind the panels;
//   - contentRect(): the free area between the header and the kit status bar;
//   - bottomButton(): the full-width primary action anchored above the status bar.
//  Every texture is generated once and cached for the session.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, DEPTH } from '../../config';
import { bayer } from '../../art/pixel';
import * as kit from '../kit';
import { cachedTexture } from './util';

/** Spacing grid of the menu screens (game px). */
export const LAYOUT = {
  /** Screen edge -> outer panels. */
  margin: 4,
  /** Between stacked panels. */
  gap: 4,
  /** Panel edge -> text (never less than 6). */
  pad: 8,
  /** Header strip height (content starts at headerH + gap). */
  headerH: 26,
  /** Kit status bar height at the bottom. */
  statusH: kit.STATUS_H,
  /** Panel left edge -> MenuList x (room for the cursor); lists end `pad` before the right edge. */
  listInset: 20,
  /** Height of bottomButton(). */
  buttonH: 24,
} as const;

/** Depth layers shared by the menu scenes. */
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

// ------------------------------------------------------------------------- backdrop

const lerp3 = (a: number[], b: number[], t: number): number[] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Full-screen menu backdrop texture: indigo gradient + faint diagonal plating (cached per size). */
export function backdropTexture(scene: Phaser.Scene, w: number, h: number): string {
  return cachedTexture(scene, `__scr_bg_${w}x${h}`, w, h, (ctx) => {
    const img = ctx.createImageData(w, h);
    const top = [16, 13, 32], mid = [8, 7, 15], bot = [12, 10, 24];
    for (let y = 0; y < h; y++) {
      const t = y / Math.max(1, h - 1);
      for (let x = 0; x < w; x++) {
        const tt = t + (bayer(x, y) - 0.5) * 0.05;
        let c = tt < 0.55 ? lerp3(top, mid, Math.max(0, tt) / 0.55) : lerp3(mid, bot, Math.min(1, (tt - 0.55) / 0.45));
        if ((x + y * 2) % 48 === 0) c = lerp3(c, [40, 36, 70], 0.18);
        const i = (y * w + x) * 4;
        img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

/** Gradient backdrop + slow parallax starfield (every menu screen). */
export function screenBackdrop(scene: Phaser.Scene, opts: { stars?: number; speed?: number; gradient?: boolean } = {}): void {
  const { width, height } = scene.scale.gameSize;
  if (opts.gradient !== false) scene.add.image(0, 0, backdropTexture(scene, width, height)).setOrigin(0).setDepth(MD.bg);
  kit.starfield(scene, { density: opts.stars ?? 0.6, speed: opts.speed ?? 5, depth: MD.stars });
}

// ------------------------------------------------------------------------- credits readout

const fmtCredits = (n: number): string => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

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
    this.label = kit.text(scene, 0, 0, fmtCredits(value), { size: opts.size ?? 'm', color: COLORS.gold, originX: 1, originY: 0.5 });
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

  /** Animate to a new value (count up/down), flash green/red and pop the icon. */
  set(value: number, animate = true): void {
    if (value === this.shown && !this.tween) return;
    this.tween?.stop();
    const from = this.shown;
    this.shown = value;
    if (!animate) { this.label.setText(fmtCredits(value)).setTint(COLORS.gold); this.layout(); return; }
    this.counter.v = from;
    this.label.setTint(value < from ? COLORS.bad : COLORS.good);
    if (this.icon) {
      this.scene.tweens.killTweensOf(this.icon);
      this.icon.setScale(1.5);
      this.scene.tweens.add({ targets: this.icon, scale: 1, duration: 260, ease: 'Back.easeOut' });
    }
    this.tween = this.scene.tweens.add({
      targets: this.counter,
      v: value,
      duration: 420,
      ease: 'Cubic.Out',
      onUpdate: () => { this.label.setText(fmtCredits(Math.round(this.counter.v))); this.layout(); },
      onComplete: () => { this.label.setText(fmtCredits(value)).setTint(COLORS.gold); this.layout(); this.tween = undefined; },
    });
  }
}

// ------------------------------------------------------------------------- header strip

const HH = LAYOUT.headerH;

/** Header plate (w x HH+3): gunmetal gradient, plating hatch, dark seam + teal neon base line with glow. */
function headerTexture(scene: Phaser.Scene, w: number): string {
  return cachedTexture(scene, `__scr_hdr_${w}`, w, HH + 3, (ctx) => {
    for (let y = 0; y < HH - 2; y++) {
      const t = y / (HH - 3);
      const r = Math.round(29 - 13 * t), g = Math.round(26 - 12 * t), b = Math.round(46 - 21 * t);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, w, 1);
    }
    ctx.fillStyle = '#3a3550';
    ctx.fillRect(0, 0, w, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, 1, w, 1);
    // diagonal plating hatch on the right half
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let x = Math.floor(w * 0.45); x < w; x += 6) {
      for (let y = 2; y < HH - 3; y++) ctx.fillRect(x + y, y, 1, 1);
    }
    // seam + neon base line + glow
    ctx.fillStyle = '#0a0810';
    ctx.fillRect(0, HH - 2, w, 1);
    ctx.fillStyle = '#2ee6c8';
    ctx.fillRect(0, HH - 1, w, 1);
    ctx.fillStyle = 'rgba(46,230,200,0.38)';
    ctx.fillRect(0, HH, w, 1);
    ctx.fillStyle = 'rgba(46,230,200,0.12)';
    ctx.fillRect(0, HH + 1, w, 1);
    ctx.fillStyle = 'rgba(5,4,10,0.35)';
    ctx.fillRect(0, HH + 2, w, 1);
    // tick marks on the right part of the line (clear of the longest titles)
    ctx.fillStyle = '#2ee6c8';
    for (let x = w - 6; x > w * 0.72; x -= 10) ctx.fillRect(x, HH - 3, 1, 2);
  });
}

/** Soft horizontal light streak (white, tinted, ADD) that runs along the neon line. */
function streakTexture(scene: Phaser.Scene): string {
  return cachedTexture(scene, '__scr_streak', 24, 3, (ctx) => {
    for (let x = 0; x < 24; x++) {
      const a = Math.sin((x / 23) * Math.PI);
      ctx.fillStyle = `rgba(255,255,255,${(a * a).toFixed(3)})`;
      ctx.fillRect(x, 1, 1, 1);
      ctx.fillStyle = `rgba(255,255,255,${(a * a * 0.35).toFixed(3)})`;
      ctx.fillRect(x, 0, 1, 1);
      ctx.fillRect(x, 2, 1, 1);
    }
  });
}

export interface ScreenHeaderOpts {
  /** Back action: shows the back arrow at the left (tap area 34x26). */
  back?: () => void;
  /** Gold credits readout on the right (animated by header.credits.set()). */
  credits?: number | null;
  /** Texture drawn left of the title (16x16). */
  icon?: string;
  /** Short FONT.s text right-aligned in the strip (used when there is no credits readout). */
  right?: string;
  rightColor?: number;
  depth?: number;
}

export interface ScreenHeaderApi {
  readonly container: Phaser.GameObjects.Container;
  readonly credits: CreditsReadout | null;
  /** y of the strip's bottom edge: content starts at bottom + LAYOUT.gap. */
  readonly bottom: number;
  setTitle(title: string): void;
  setRight(text: string, color?: number): void;
}

/**
 * The header strip of every menu screen. Content must start at `bottom + LAYOUT.gap`; the
 * scene registers its back action itself (kit.onBack) — the arrow only calls opts.back.
 */
export function screenHeader(scene: Phaser.Scene, title: string, opts: ScreenHeaderOpts = {}): ScreenHeaderApi {
  const { width } = scene.scale.gameSize;
  const c = scene.add.container(0, 0).setDepth(opts.depth ?? MD.header);
  c.add(scene.add.image(0, 0, headerTexture(scene, width)).setOrigin(0));
  let x = 8;
  if (opts.back) {
    const back = opts.back;
    c.add(kit.iconButton(scene, 15, 12, 'ui_arrow_l', () => back(), 22, undefined, { hitW: 34, hitH: 26, glyph: '<' }));
    // engraved divider between the arrow and the title
    c.add(scene.add.rectangle(30, 4, 1, 17, 0x0a0810).setOrigin(0));
    c.add(scene.add.rectangle(31, 4, 1, 17, COLORS.panelLight, 0.7).setOrigin(0));
    x = 36;
  }
  // magenta accent bar before the title
  const accentX = x;
  c.add(scene.add.rectangle(x, 6, 3, 13, COLORS.accent).setOrigin(0));
  c.add(scene.add.rectangle(x + 3, 6, 1, 13, COLORS.accentLight, 0.6).setOrigin(0));
  x += 8;
  if (opts.icon && scene.textures.exists(opts.icon)) {
    const img = scene.add.image(x, 13, opts.icon).setOrigin(0, 0.5);
    c.add(img);
    x += img.width + 5;
  }
  const t = kit.text(scene, x, 5, title, { size: 'l' });
  c.add(t);
  // magenta underline under accent + title (on the neon line), with its own glow row
  const under = scene.add.rectangle(accentX, HH - 1, 1, 1, COLORS.accent).setOrigin(0);
  const underGlow = scene.add.rectangle(accentX, HH, 1, 1, COLORS.accent, 0.4).setOrigin(0);
  c.add([under, underGlow]);
  const sizeUnderline = () => {
    const w = Math.max(16, t.x + t.width + 6 - accentX);
    under.setSize(w, 1);
    underGlow.setSize(w, 1);
  };
  sizeUnderline();

  let credits: CreditsReadout | null = null;
  let right: Phaser.GameObjects.BitmapText | null = null;
  if (opts.credits !== undefined && opts.credits !== null) {
    const pw = 92;
    c.add(kit.panel(scene, width - pw - 4, 3, pw, 19, 'inset'));
    credits = new CreditsReadout(scene, width - 11, 13, opts.credits, { size: 'm' });
    c.add(credits.container);
  } else {
    right = kit.text(scene, width - 8, 13, opts.right ?? '', { size: 's', color: opts.rightColor ?? COLORS.textDim, originX: 1, originY: 0.5 });
    c.add(right);
  }

  // a light pulse runs along the neon line every few seconds
  const streak = scene.add.image(-24, HH - 1, streakTexture(scene)).setOrigin(0, 0.5).setTint(0xc8fff4)
    .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9);
  c.add(streak);
  scene.tweens.add({ targets: streak, x: width, duration: 1300, delay: 900, repeat: -1, repeatDelay: 3800, ease: 'Sine.easeInOut' });

  return {
    container: c,
    credits,
    bottom: HH,
    setTitle: (s: string) => {
      t.setText(s);
      sizeUnderline();
    },
    setRight: (s: string, color?: number) => {
      if (!right) return;
      right.setText(s);
      if (color !== undefined) right.setTint(color);
    },
  };
}

// ------------------------------------------------------------------------- layout helpers

export interface Rect { x: number; y: number; w: number; h: number }

/**
 * Free content area of a menu screen: inside the side margins, from `top` (default: below the
 * header strip + gap) down to the status bar (or the screen bottom when `status` is false).
 */
export function contentRect(scene: Phaser.Scene, top: number = LAYOUT.headerH + LAYOUT.gap, status = true): Rect {
  const { width, height } = scene.scale.gameSize;
  const bottom = height - (status ? LAYOUT.statusH + LAYOUT.gap : LAYOUT.margin);
  return { x: LAYOUT.margin, y: Math.round(top), w: width - 2 * LAYOUT.margin, h: Math.max(0, Math.round(bottom - top)) };
}

/** Full-width primary action button anchored just above the status bar. */
export function bottomButton(
  scene: Phaser.Scene, label: string, onClick: () => void, opts: { color?: number; depth?: number; size?: kit.FontSize } = {},
): kit.ButtonApi {
  const { width, height } = scene.scale.gameSize;
  const y = height - LAYOUT.statusH - LAYOUT.gap - LAYOUT.buttonH;
  return kit.button(scene, LAYOUT.margin, y, width - 2 * LAYOUT.margin, LAYOUT.buttonH, label, onClick, {
    size: opts.size ?? 'm', color: opts.color ?? COLORS.teal, depth: opts.depth ?? MD.content,
  });
}

/** y of the top of bottomButton() (content above it should end at this - LAYOUT.gap). */
export function bottomButtonY(scene: Phaser.Scene): number {
  return scene.scale.gameSize.height - LAYOUT.statusH - LAYOUT.gap - LAYOUT.buttonH;
}
