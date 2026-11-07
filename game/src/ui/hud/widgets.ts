// =====================================================================================
//  HUD WIDGETS — small allocation-free runtime helpers. Every per-frame method only does
//  number math and touches its game objects when the displayed (rounded) value changes.
// =====================================================================================
import Phaser from 'phaser';
import type { GlyphFont } from './glyphs';
import { renderText } from './glyphs';
import type { Rect } from './layout';

type Img = Phaser.GameObjects.Image;

/** Fraction to move towards a target this frame for an exponential time constant (ms). */
export const approach = (dt: number, tau: number): number => 1 - Math.exp(-dt / tau);
export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v !== v ? 0 : v);

/** First-order low-pass (keeps a quickly fluctuating value readable). */
export class Smooth {
  value = 0;
  target = 0;
  constructor(private readonly tau: number) {}
  tick(dt: number): void {
    const d = this.target - this.value;
    if (d === 0) return;
    if (d < 0.0005 && d > -0.0005) { this.value = this.target; return; }
    this.value += d * approach(dt, this.tau);
  }
  snap(v: number): void { this.value = this.target = v; }
}

/**
 * Damage readability: drops are shown instantly while a "ghost" keeps the previous level for
 * `holdMs` and then drains; increases (regen / pickups) rise smoothly.
 */
export class Trail {
  shown = 0;
  ghost = 0;
  target = 0;
  private hold = 0;
  constructor(private readonly riseTau: number, private readonly holdMs: number, private readonly drainPerSec: number) {}

  /** Sets the target; returns the size of an instant drop (0 if none). */
  set(t: number): number {
    this.target = t;
    if (t < this.shown - 0.0001) {
      const drop = this.shown - t;
      if (this.ghost < this.shown) this.ghost = this.shown;
      this.shown = t;
      this.hold = this.holdMs;
      return drop;
    }
    return 0;
  }

  snap(t: number): void { this.target = this.shown = this.ghost = t; this.hold = 0; }

  tick(dt: number): void {
    if (this.shown < this.target) {
      this.shown += (this.target - this.shown) * approach(dt, this.riseTau);
      if (this.target - this.shown < 0.0005) this.shown = this.target;
    }
    if (this.ghost > this.shown) {
      if (this.hold > 0) this.hold -= dt;
      else this.ghost -= (this.drainPerSec * dt) / 1000;
      if (this.ghost < this.shown) this.ghost = this.shown;
    } else {
      this.ghost = this.shown;
    }
  }
}

/** Integer count-up ("rolling") counter: catches up in ~0.5 s, never rolls downwards. */
export class Rolling {
  shown = 0;
  target = 0;
  /** Advances; returns true when the shown value changed. */
  tick(dt: number): boolean {
    if (this.shown === this.target) return false;
    if (this.target < this.shown) { this.shown = this.target; return true; }
    const step = Math.max(1, Math.ceil((this.target - this.shown) * approach(dt, 95)));
    this.shown = Math.min(this.target, this.shown + step);
    return true;
  }
  snap(v: number): void { this.shown = this.target = v; }
}

/** Square-wave blinker (on immediately when activated). */
export class Blink {
  on = false;
  private active = false;
  private t = 0;
  constructor(private readonly onMs: number, private readonly offMs: number) {}
  /** Advances; returns true when `on` toggled. */
  tick(dt: number, active: boolean): boolean {
    if (!active) {
      this.active = false;
      if (this.on) { this.on = false; return true; }
      return false;
    }
    if (!this.active) { this.active = true; this.t = 0; this.on = true; return true; }
    this.t += dt;
    const period = this.on ? this.onMs : this.offMs;
    if (this.t < period) return false;
    this.t = Math.min(this.t - period, period);
    this.on = !this.on;
    return true;
  }
}

/** Linear 1 -> 0 decay (flash overlays). */
export class Pulse {
  v = 0;
  constructor(private readonly ms: number) {}
  fire(peak = 1): void { if (peak > this.v) this.v = peak; }
  /** Advances; returns true while the value changes. */
  tick(dt: number): boolean {
    if (this.v <= 0) return false;
    this.v -= dt / this.ms;
    if (this.v < 0) this.v = 0;
    return true;
  }
}

/** Shows an image cropped to its bottom `px` rows (vertical gauge fill / ghost / overlay). */
export class VCrop {
  private last = -1;
  constructor(readonly img: Img, private readonly w: number, private readonly h: number) {
    img.setVisible(false);
  }
  set(px: number): void {
    const p = px < 0 ? 0 : px > this.h ? this.h : px;
    if (p === this.last) return;
    this.last = p;
    if (p === 0) { this.img.setVisible(false); return; }
    this.img.setVisible(true).setCrop(0, this.h - p, this.w, p);
  }
}

/** Shows an image cropped to its left `px` columns (horizontal bars). */
export class HCrop {
  private last = -1;
  constructor(readonly img: Img, private readonly w: number, private readonly h: number) {
    img.setVisible(false);
  }
  set(px: number): void {
    const p = px < 0 ? 0 : px > this.w ? this.w : px;
    if (p === this.last) return;
    this.last = p;
    if (p === 0) { this.img.setVisible(false); return; }
    this.img.setVisible(true).setCrop(0, 0, p, this.h);
  }
}

/** Sets an image alpha only when it changes by a visible step (1/64). */
export class AlphaCache {
  private last = -1;
  constructor(readonly img: Img) { img.setAlpha(0).setVisible(false); }
  set(a: number): void {
    const q = Math.round((a < 0 ? 0 : a > 1 ? 1 : a) * 64);
    if (q === this.last) return;
    this.last = q;
    if (q === 0) { this.img.setVisible(false); return; }
    this.img.setVisible(true).setAlpha(q / 64);
  }
}

export interface DigitRowOpts {
  maxDigits: number;
  /** px between digit origins. */
  advance: number;
  /** Extra px between groups of 3 digits (0 = none). */
  group?: number;
  align?: 'left' | 'center' | 'right';
  /** Width of the area for center / right alignment. */
  width?: number;
  tint?: number;
}

/** A number drawn with per-digit images (frame swaps only: zero allocations). */
export class DigitRow {
  private readonly imgs: Img[] = [];
  private last = -1;
  private lastLen = -1;
  private readonly max: number;

  constructor(
    scene: Phaser.Scene, parent: Phaser.GameObjects.Container, texKey: string, private readonly frames: readonly string[],
    private readonly x: number, y: number, private readonly opts: DigitRowOpts,
  ) {
    // Capped below 2^31 so set() can use int32 arithmetic.
    this.max = Math.min(10 ** opts.maxDigits - 1, 999999999);
    for (let i = 0; i < opts.maxDigits; i++) {
      const img = scene.add.image(x, y, texKey, frames[0]).setOrigin(0).setScrollFactor(0).setVisible(false);
      if (opts.tint !== undefined) img.setTint(opts.tint);
      parent.add(img);
      this.imgs.push(img);
    }
  }

  /** Total width of the digits currently shown. */
  get shownWidth(): number {
    const len = Math.max(1, this.lastLen);
    return len * this.opts.advance + this.groupGaps(len) * (this.opts.group ?? 0);
  }

  private groupGaps(len: number): number { return this.opts.group ? ((len - 1) / 3) | 0 : 0; }

  /** Shows `value` (clamped to the digit count). Int32 math only: no boxed doubles. */
  set(value: number): void {
    const v = value <= 0 ? 0 : value >= this.max ? this.max : value | 0;
    if (v === this.last) return;
    this.last = v;
    let len = 1;
    for (let t = v; t >= 10; t = (t / 10) | 0) len++;
    if (len !== this.lastLen) {
      this.lastLen = len;
      const adv = this.opts.advance;
      const g = this.opts.group ?? 0;
      const total = len * adv + this.groupGaps(len) * g;
      const area = this.opts.width ?? total;
      const x0 = this.opts.align === 'right' ? this.x + area - total : this.opts.align === 'center' ? this.x + ((area - total) >> 1) : this.x;
      let gx = 0;
      for (let i = 0; i < this.imgs.length; i++) {
        const img = this.imgs[i];
        if (i >= len) { img.setVisible(false); continue; }
        if (i > 0 && g && (len - i) % 3 === 0) gx += g;
        img.setVisible(true).setX(x0 + i * adv + gx);
      }
    }
    let t = v;
    for (let i = len - 1; i >= 0; i--) {
      const q = (t / 10) | 0;
      this.imgs[i].setFrame(this.frames[t - q * 10]);
      t = q;
    }
  }

  setTint(c: number): void { for (const img of this.imgs) img.setTint(c); }
}

/** Colours for an LCD string. */
export interface LcdStyle { color: number; halo?: number; haloAlpha?: number }

/**
 * LCD text window: the string is drawn once into a canvas strip; if it does not fit the window
 * it scrolls like a real LCD ticker (whole-cell steps, pause on the first cell) by moving a
 * crop window — never a setText.
 */
export class Marquee {
  private cells = 0;
  private idx = 0;
  private t = 0;
  private scrolling = false;
  private readonly cw: number;
  static readonly STEP_MS = 150;
  static readonly PAUSE_MS = 1300;
  static readonly GAP_CELLS = 3;

  constructor(
    private readonly img: Img, private readonly tex: Phaser.Textures.CanvasTexture,
    private readonly font: GlyphFont, private readonly win: Rect,
  ) {
    this.cw = font.cellW;
  }

  /** Redraws the strip (call only when the string changes). */
  setText(raw: string, style: LcdStyle): void {
    const canvas = this.tex.getSourceImage() as HTMLCanvasElement;
    const ctx = this.tex.getContext();
    const winCells = Math.max(1, Math.floor(this.win.w / this.cw));
    let str = raw.toUpperCase();
    // A scrolling strip must hold one period (text + gap) plus one window; otherwise truncate.
    const scrollCap = Math.floor((canvas.width - 2 - this.win.w) / this.cw) - Marquee.GAP_CELLS;
    if (str.length > winCells && str.length > scrollCap) {
      str = scrollCap > winCells ? str.slice(0, scrollCap) : str.slice(0, winCells);
    }
    const glyphs = renderText(this.font, str, {
      tint: style.color,
      halo: style.halo !== undefined ? { color: style.halo, alpha: style.haloAlpha ?? 0.25 } : undefined,
    });
    const m = style.halo !== undefined ? 1 : 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.scrolling = str.length > winCells;
    this.idx = 0;
    this.t = 0;
    if (this.scrolling) {
      const period = (str.length + Marquee.GAP_CELLS) * this.cw;
      this.cells = str.length + Marquee.GAP_CELLS;
      ctx.drawImage(glyphs, 1 - m, 1 - m);
      ctx.drawImage(glyphs, 1 - m + period, 1 - m);
      this.tex.refresh();
      this.apply();
    } else {
      this.cells = 0;
      const c0 = Math.floor((winCells - str.length) / 2);
      ctx.drawImage(glyphs, 1 - m, 1 - m);
      this.tex.refresh();
      this.img.setCrop(0, 0, Math.min(canvas.width, glyphs.width + 2), canvas.height);
      this.img.setPosition(this.win.x - 1 + c0 * this.cw, this.win.y - 1);
    }
    this.img.setVisible(str.length > 0);
  }

  /** Crop exactly to the window (whole cells) so no sliver of the next glyph shows. */
  private apply(): void {
    const ox = this.idx * this.cw;
    this.img.setCrop(ox + 1, 0, this.win.w, this.tex.height);
    this.img.setPosition(this.win.x - 1 - ox, this.win.y - 1);
  }

  tick(dt: number): void {
    if (!this.scrolling) return;
    this.t += dt;
    const wait = this.idx === 0 ? Marquee.PAUSE_MS : Marquee.STEP_MS;
    if (this.t < wait) return;
    this.t -= wait;
    if (this.t > Marquee.STEP_MS) this.t = 0;
    this.idx++;
    if (this.idx >= this.cells) this.idx = 0;
    this.apply();
  }
}
