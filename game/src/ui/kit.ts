// =====================================================================================
//  UI KIT — shared widgets for every menu scene and the HUD.
//  CONTRACT: the exported functions/classes, their parameters and semantics are frozen
//  (several engineers build scenes on top of them in parallel). The UI-KIT owner may improve
//  the internals and the visuals, and may ADD exports, but must not change existing ones.
//
//  Conventions: positions are in game px with a TOP-LEFT origin unless stated otherwise;
//  fonts are the bitmap fonts FONT.s / FONT.m / FONT.l from src/art/keys.ts (white glyphs,
//  tinted); colours come from COLORS in src/config.ts.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, DEPTH } from '../config';
import { FONT } from '../art/keys';
import { audio } from '../audio';
import { onBackButton } from '../platform/device';
import type { SceneKey } from '../config';

export type FontSize = 's' | 'm' | 'l';

const FONT_KEY: Record<FontSize, string> = { s: FONT.s, m: FONT.m, l: FONT.l };
const FONT_CELL: Record<FontSize, [number, number]> = { s: [6, 8], m: [8, 10], l: [12, 16] };

// ------------------------------------------------------------------------------ fonts

/**
 * Makes sure the three bitmap fonts exist (registers a plain fallback font if the art module
 * has not produced one) — called automatically by text().
 */
export function ensureFonts(scene: Phaser.Scene): void {
  (Object.keys(FONT_KEY) as FontSize[]).forEach((size) => {
    const key = FONT_KEY[size];
    if (scene.cache.bitmapFont.exists(key)) return;
    const [cw, ch] = FONT_CELL[size];
    const chars = Phaser.GameObjects.RetroFont.TEXT_SET1;
    const perRow = 16;
    const rows = Math.ceil(chars.length / perRow);
    const canvas = document.createElement('canvas');
    canvas.width = cw * perRow;
    canvas.height = ch * rows;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    ctx.font = `${Math.floor(ch * 0.9)}px monospace`;
    for (let i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], (i % perRow) * cw, Math.floor(i / perRow) * ch);
    }
    const texKey = `${key}__fallback_tex`;
    if (!scene.textures.exists(texKey)) scene.textures.addCanvas(texKey, canvas);
    // NB: RetroFont.Parse returns the whole cache entry { data, texture, frame } (typed loosely).
    const entry = Phaser.GameObjects.RetroFont.Parse(scene, {
      image: texKey, width: cw, height: ch, chars, charsPerRow: perRow,
      'spacing.x': 0, 'spacing.y': 0, 'offset.x': 0, 'offset.y': 0, lineSpacing: 0,
    }) as unknown;
    scene.cache.bitmapFont.add(key, entry);
  });
}

export interface TextOpts {
  size?: FontSize;          // default 'm'
  color?: number;           // tint (ignored for size 'l', which is pre-coloured) — default COLORS.text
  originX?: number;         // 0 left (default), 0.5 centre, 1 right
  originY?: number;         // default 0 (top)
  maxWidth?: number;        // word-wrap width in px (0 = none)
  align?: 'left' | 'center' | 'right'; // multi-line alignment
  depth?: number;
}

/** Bitmap text with the game fonts. */
export function text(scene: Phaser.Scene, x: number, y: number, str: string, opts: TextOpts = {}): Phaser.GameObjects.BitmapText {
  ensureFonts(scene);
  const size = opts.size ?? 'm';
  const t = scene.add.bitmapText(Math.round(x), Math.round(y), FONT_KEY[size], str);
  t.setOrigin(opts.originX ?? 0, opts.originY ?? 0);
  if (size !== 'l') t.setTint(opts.color ?? COLORS.text);
  if (opts.maxWidth) t.setMaxWidth(opts.maxWidth);
  if (opts.align === 'center') t.setCenterAlign();
  else if (opts.align === 'right') t.setRightAlign();
  if (opts.depth !== undefined) t.setDepth(opts.depth);
  return t;
}

/** Width in px of `str` rendered with a given font size (single line). */
export function measure(scene: Phaser.Scene, str: string, size: FontSize = 'm'): number {
  ensureFonts(scene);
  const [cw] = FONT_CELL[size];
  return str.length * cw;
}

/** Truncate to fit `maxPx` with the given font (adds '.' when cut). */
export function fit(str: string, maxPx: number, size: FontSize = 'm'): string {
  const [cw] = FONT_CELL[size];
  const max = Math.max(1, Math.floor(maxPx / cw));
  return str.length <= max ? str : `${str.slice(0, Math.max(1, max - 1))}.`;
}

// ------------------------------------------------------------------------------ panels

const SLICE = 8;

function ensureSliceFrames(scene: Phaser.Scene, key: string): boolean {
  if (!scene.textures.exists(key)) return false;
  const tex = scene.textures.get(key);
  if (tex.has('__s_c')) return true;
  const src = tex.get();
  const w = src.width, h = src.height, s = SLICE;
  const sx = src.cutX, sy = src.cutY;
  const add = (name: string, x: number, y: number, fw: number, fh: number) => tex.add(name, src.sourceIndex, sx + x, sy + y, fw, fh);
  add('__s_tl', 0, 0, s, s); add('__s_t', s, 0, w - 2 * s, s); add('__s_tr', w - s, 0, s, s);
  add('__s_l', 0, s, s, h - 2 * s); add('__s_c', s, s, w - 2 * s, h - 2 * s); add('__s_r', w - s, s, s, h - 2 * s);
  add('__s_bl', 0, h - s, s, s); add('__s_b', s, h - s, w - 2 * s, s); add('__s_br', w - s, h - s, s, s);
  return true;
}

export type PanelStyle = 'raised' | 'inset';

/**
 * A 9-slice panel (ui_panel / ui_panel_inset, 8 px corners) as a Container at (x, y) top-left.
 * Falls back to flat rectangles if the UI art is missing. Minimum size 16x16.
 */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, style: PanelStyle = 'raised'): Phaser.GameObjects.Container {
  const c = scene.add.container(Math.round(x), Math.round(y));
  w = Math.max(16, Math.round(w));
  h = Math.max(16, Math.round(h));
  const key = style === 'raised' ? 'ui_panel' : 'ui_panel_inset';
  if (!ensureSliceFrames(scene, key)) {
    const g = scene.add.graphics();
    g.fillStyle(style === 'raised' ? COLORS.panel : COLORS.panelDark, 1).fillRect(0, 0, w, h);
    g.lineStyle(1, style === 'raised' ? COLORS.panelLight : COLORS.tealDark, 1).strokeRect(0.5, 0.5, w - 1, h - 1);
    c.add(g);
    return c;
  }
  const s = SLICE, iw = w - 2 * s, ih = h - 2 * s;
  const img = (fx: number, fy: number, frame: string) => scene.add.image(fx, fy, key, frame).setOrigin(0);
  const tile = (fx: number, fy: number, fw: number, fh: number, frame: string) =>
    scene.add.tileSprite(fx, fy, Math.max(1, fw), Math.max(1, fh), key, frame).setOrigin(0);
  c.add([
    tile(s, s, iw, ih, '__s_c'),
    tile(s, 0, iw, s, '__s_t'), tile(s, h - s, iw, s, '__s_b'),
    tile(0, s, s, ih, '__s_l'), tile(w - s, s, s, ih, '__s_r'),
    img(0, 0, '__s_tl'), img(w - s, 0, '__s_tr'), img(0, h - s, '__s_bl'), img(w - s, h - s, '__s_br'),
  ]);
  c.setSize(w, h);
  return c;
}

// ------------------------------------------------------------------------------ menu list

export interface MenuItem {
  label: string;
  value?: string;          // right-aligned text (cost, setting value...)
  valueColor?: number;
  color?: number;          // label colour override
  icon?: string;           // texture key drawn before the label (16x16 recommended)
  disabled?: boolean;      // focusable (shows help) but not selectable
  help?: string;           // shown by the scene in its status bar via onFocus
}

export interface MenuListOpts {
  x: number;
  y: number;
  width: number;
  items: MenuItem[];
  rowHeight?: number;      // default: 14 for 's', 18 for 'm', 24 for 'l'
  size?: FontSize;         // default 'm'
  startIndex?: number;
  depth?: number;
  keyboard?: boolean;      // listen to arrows/WASD/Enter/Space (default true)
  onSelect: (index: number, item: MenuItem) => void;
  onFocus?: (index: number, item: MenuItem) => void;
  onDisabled?: (index: number, item: MenuItem) => void;
  onLeft?: (index: number, item: MenuItem) => void;   // keyboard left / tap on a left arrow
  onRight?: (index: number, item: MenuItem) => void;
}

/**
 * Vertical selectable list: cursor + highlight, keyboard (up/down/enter/space/left/right),
 * pointer (hover focuses on desktop, tap selects). Plays ui_move / ui_select / ui_error.
 */
export class MenuList {
  readonly container: Phaser.GameObjects.Container;
  private items: MenuItem[] = [];
  private rows: Phaser.GameObjects.Container[] = [];
  private highlight: Phaser.GameObjects.Rectangle;
  private cursor: Phaser.GameObjects.Image | Phaser.GameObjects.BitmapText;
  private idx = 0;
  private enabled = true;
  private readonly rowH: number;
  private readonly size: FontSize;
  private keyHandler?: (e: KeyboardEvent) => void;

  constructor(private readonly scene: Phaser.Scene, private readonly opts: MenuListOpts) {
    this.size = opts.size ?? 'm';
    this.rowH = opts.rowHeight ?? (this.size === 's' ? 14 : this.size === 'm' ? 18 : 24);
    this.container = scene.add.container(opts.x, opts.y);
    if (opts.depth !== undefined) this.container.setDepth(opts.depth);
    this.highlight = scene.add.rectangle(0, 0, opts.width, this.rowH, COLORS.accent, 0.22).setOrigin(0);
    this.container.add(this.highlight);
    this.cursor = scene.textures.exists('ui_cursor')
      ? scene.add.image(-2, 0, 'ui_cursor').setOrigin(1, 0.5)
      : text(scene, -2, 0, '>', { size: this.size, color: COLORS.accent, originX: 1, originY: 0.5 });
    this.container.add(this.cursor);
    this.setItems(opts.items, false);
    this.setIndex(opts.startIndex ?? 0, false);
    if (opts.keyboard !== false) this.bindKeys();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  get index(): number { return this.idx; }
  get item(): MenuItem | undefined { return this.items[this.idx]; }
  get height(): number { return this.items.length * this.rowH; }

  /** Replace the rows (keeps the current index when possible). */
  setItems(items: MenuItem[], keepIndex = true): void {
    this.rows.forEach((r) => r.destroy());
    this.rows = [];
    this.items = items;
    const s = this.scene;
    items.forEach((it, i) => {
      const row = s.add.container(0, i * this.rowH);
      let lx = 4;
      if (it.icon && s.textures.exists(it.icon)) {
        row.add(s.add.image(lx, this.rowH / 2, it.icon).setOrigin(0, 0.5));
        lx += 20;
      }
      const baseColor = it.disabled ? COLORS.textDim : it.color ?? COLORS.text;
      row.add(text(s, lx, this.rowH / 2, it.label, { size: this.size, color: baseColor, originY: 0.5 }));
      if (it.value !== undefined) {
        row.add(text(s, this.opts.width - 4, this.rowH / 2, it.value, {
          size: this.size === 'l' ? 'm' : this.size, color: it.disabled ? COLORS.textDim : it.valueColor ?? COLORS.gold, originX: 1, originY: 0.5,
        }));
      }
      const zone = s.add.zone(0, 0, this.opts.width, this.rowH).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerover', (p: Phaser.Input.Pointer) => { if (this.enabled && !p.wasTouch) this.setIndex(i); });
      zone.on('pointerdown', () => { if (this.enabled) { audio.unlock(); this.setIndex(i); } });
      zone.on('pointerup', () => { if (this.enabled && this.idx === i) this.select(); });
      row.add(zone);
      this.container.add(row);
      this.rows.push(row);
    });
    this.container.bringToTop(this.cursor);
    this.setIndex(keepIndex ? Math.min(this.idx, Math.max(0, items.length - 1)) : 0, false);
  }

  /** Move the focus (plays ui_move when `sound`). */
  setIndex(i: number, sound = true): void {
    if (this.items.length === 0) return;
    const n = Phaser.Math.Clamp(i, 0, this.items.length - 1);
    const changed = n !== this.idx;
    this.idx = n;
    this.highlight.setPosition(0, n * this.rowH);
    this.cursor.setPosition(-2, n * this.rowH + this.rowH / 2);
    if (changed && sound) audio.sfx('ui_move');
    this.opts.onFocus?.(n, this.items[n]);
  }

  /** Enable/disable input (e.g. while a confirm dialog is open). */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.container.setAlpha(enabled ? 1 : 0.6);
  }

  /** Programmatic select of the focused row. */
  select(): void {
    const it = this.items[this.idx];
    if (!it) return;
    if (it.disabled) {
      audio.sfx('ui_error');
      this.opts.onDisabled?.(this.idx, it);
      return;
    }
    audio.sfx('ui_select');
    this.opts.onSelect(this.idx, it);
  }

  private bindKeys(): void {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.enabled || !this.container.visible) return;
      audio.unlock();
      switch (e.code) {
        case 'ArrowUp': case 'KeyW': this.setIndex(this.idx - 1 < 0 ? this.items.length - 1 : this.idx - 1); break;
        case 'ArrowDown': case 'KeyS': this.setIndex((this.idx + 1) % Math.max(1, this.items.length)); break;
        case 'Enter': case 'Space': case 'NumpadEnter': this.select(); break;
        case 'ArrowLeft': case 'KeyA': this.opts.onLeft?.(this.idx, this.items[this.idx]); break;
        case 'ArrowRight': case 'KeyD': this.opts.onRight?.(this.idx, this.items[this.idx]); break;
        default: break;
      }
    };
    kb.on('keydown', this.keyHandler);
  }

  destroy(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    if (this.container.scene) this.container.destroy();
  }
}

// ------------------------------------------------------------------------------ gauge

export interface GaugeOpts {
  vertical?: boolean;      // default true (fills bottom -> top)
  colorA?: number;         // gradient start (bottom for vertical, left for horizontal)
  colorB?: number;         // gradient end
  frame?: boolean;         // draw a frame (ui_bar_frame 9-slice, else a 1px border) — default true
  depth?: number;
  segments?: number;       // > 0: draw as N separated segments (pips)
}

/** A bar gauge with a gradient fill. setValue(0..1) is cheap (crop only). */
export class Gauge {
  readonly container: Phaser.GameObjects.Container;
  private fill: Phaser.GameObjects.Image;
  private flashRect: Phaser.GameObjects.Rectangle;
  private value = 1;
  private readonly iw: number;
  private readonly ih: number;
  private readonly vertical: boolean;
  private static seq = 0;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number, w: number, h: number, opts: GaugeOpts = {}) {
    this.vertical = opts.vertical ?? true;
    this.container = scene.add.container(Math.round(x), Math.round(y));
    if (opts.depth !== undefined) this.container.setDepth(opts.depth);
    const pad = opts.frame === false ? 0 : 2;
    this.iw = Math.max(1, w - pad * 2);
    this.ih = Math.max(1, h - pad * 2);
    if (opts.frame !== false) {
      const g = scene.add.graphics();
      g.fillStyle(COLORS.panelDark, 1).fillRect(0, 0, w, h);
      g.lineStyle(1, COLORS.panelLight, 1).strokeRect(0.5, 0.5, w - 1, h - 1);
      this.container.add(g);
    }
    const key = `__gauge_${Gauge.seq++}`;
    const canvas = document.createElement('canvas');
    canvas.width = this.iw;
    canvas.height = this.ih;
    const ctx = canvas.getContext('2d')!;
    const a = Phaser.Display.Color.IntegerToColor(opts.colorA ?? COLORS.energy);
    const b = Phaser.Display.Color.IntegerToColor(opts.colorB ?? COLORS.bad);
    const len = this.vertical ? this.ih : this.iw;
    for (let i = 0; i < len; i++) {
      const t = len <= 1 ? 0 : i / (len - 1);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, Math.round(t * 100));
      ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
      if (this.vertical) ctx.fillRect(0, this.ih - 1 - i, this.iw, 1);
      else ctx.fillRect(i, 0, 1, this.ih);
    }
    // subtle highlight column/row for a glassy look
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    if (this.vertical) ctx.fillRect(0, 0, Math.max(1, Math.floor(this.iw / 3)), this.ih);
    else ctx.fillRect(0, 0, this.iw, Math.max(1, Math.floor(this.ih / 3)));
    if (opts.segments && opts.segments > 1) {
      ctx.globalCompositeOperation = 'destination-out';
      const n = opts.segments;
      for (let s = 1; s < n; s++) {
        const p = Math.round((len * s) / n);
        if (this.vertical) ctx.fillRect(0, this.ih - p, this.iw, 1);
        else ctx.fillRect(p, 0, 1, this.ih);
      }
    }
    scene.textures.addCanvas(key, canvas);
    this.fill = scene.add.image(pad, pad, key).setOrigin(0);
    this.flashRect = scene.add.rectangle(pad, pad, this.iw, this.ih, 0xffffff, 0).setOrigin(0);
    this.container.add([this.fill, this.flashRect]);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { if (scene.textures.exists(key)) scene.textures.remove(key); });
  }

  /** Set the fill ratio (0..1). */
  setValue(ratio: number): void {
    const v = Phaser.Math.Clamp(ratio, 0, 1);
    if (Math.abs(v - this.value) < 0.002) return;
    this.value = v;
    if (this.vertical) {
      const hh = Math.round(this.ih * v);
      this.fill.setCrop(0, this.ih - hh, this.iw, hh);
    } else {
      this.fill.setCrop(0, 0, Math.round(this.iw * v), this.ih);
    }
  }

  /** Brief white flash over the gauge. */
  flash(color = 0xffffff): void {
    this.flashRect.setFillStyle(color, 0.8);
    this.scene.tweens.add({ targets: this.flashRect, fillAlpha: 0, duration: 220 });
  }

  destroy(): void { this.container.destroy(); }
}

// ------------------------------------------------------------------------------ misc widgets

export interface ButtonApi {
  container: Phaser.GameObjects.Container;
  setLabel(label: string): void;
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

/** A tappable button (ui_button 9-slice look) with a centred label. (x, y) = top-left. */
export function button(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void,
  opts: { size?: FontSize; color?: number; depth?: number } = {},
): ButtonApi {
  const c = scene.add.container(Math.round(x), Math.round(y));
  if (opts.depth !== undefined) c.setDepth(opts.depth);
  const bg = panel(scene, 0, 0, w, h, 'raised');
  const lbl = text(scene, w / 2, h / 2, label, { size: opts.size ?? 'm', color: opts.color ?? COLORS.teal, originX: 0.5, originY: 0.5 });
  const zone = scene.add.zone(0, 0, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
  let enabled = true;
  zone.on('pointerdown', () => { if (!enabled) return; audio.unlock(); c.setScale(0.97); c.setPosition(Math.round(x + w * 0.015), Math.round(y + h * 0.015)); });
  const reset = () => { c.setScale(1); c.setPosition(Math.round(x), Math.round(y)); };
  zone.on('pointerout', reset);
  zone.on('pointerup', () => { reset(); if (!enabled) return; audio.sfx('ui_select'); onClick(); });
  c.add([bg, lbl, zone]);
  return {
    container: c,
    setLabel: (l: string) => { lbl.setText(l); },
    setEnabled: (e: boolean) => { enabled = e; c.setAlpha(e ? 1 : 0.5); },
    destroy: () => c.destroy(),
  };
}

/** A small square tappable icon (e.g. pause). (x, y) = centre. */
export function iconButton(scene: Phaser.Scene, x: number, y: number, icon: string, onClick: () => void, size = 22, depth?: number): Phaser.GameObjects.Container {
  const c = scene.add.container(Math.round(x), Math.round(y));
  if (depth !== undefined) c.setDepth(depth);
  const bg = panel(scene, -size / 2, -size / 2, size, size, 'raised');
  c.add(bg);
  if (scene.textures.exists(icon)) c.add(scene.add.image(0, 0, icon));
  else c.add(text(scene, 0, 0, '?', { size: 's', originX: 0.5, originY: 0.5 }));
  const zone = scene.add.zone(-size / 2, -size / 2, size, size).setOrigin(0).setInteractive({ useHandCursor: true });
  zone.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation(); audio.unlock(); c.setScale(0.9);
  });
  zone.on('pointerout', () => c.setScale(1));
  zone.on('pointerup', () => { c.setScale(1); onClick(); });
  c.add(zone);
  return c;
}

export interface StatusBarApi { setText(t: string): void; readonly object: Phaser.GameObjects.Container }

/** Bottom help line across the screen (contextual help for the focused entry). */
export function statusBar(scene: Phaser.Scene, initial = ''): StatusBarApi {
  const { width, height } = scene.scale.gameSize;
  const h = 16;
  const c = scene.add.container(0, height - h).setDepth(DEPTH.overlay - 1);
  c.add(panel(scene, 2, 0, width - 4, h - 1, 'inset'));
  const t = text(scene, 8, h / 2, fit(initial, width - 16, 's'), { size: 's', color: COLORS.teal, originY: 0.5 });
  c.add(t);
  return { setText: (s: string) => t.setText(fit(s, width - 16, 's')), object: c };
}

/** Animated parallax starfield background (2-3 layers of drifting stars). */
export function starfield(scene: Phaser.Scene, opts: { density?: number; speed?: number; depth?: number } = {}): { destroy(): void } {
  const { width, height } = scene.scale.gameSize;
  const key = scene.textures.exists('fx_pixel') ? 'fx_pixel' : '__kit_px';
  if (key === '__kit_px' && !scene.textures.exists(key)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2);
    g.generateTexture(key, 2, 2);
    g.destroy();
  }
  const n = Math.round((opts.density ?? 1) * 90);
  const speed = opts.speed ?? 12;
  const stars: { img: Phaser.GameObjects.Image; v: number }[] = [];
  const tints = [0x6070a0, 0x9aa8d0, 0xd8e4ff, 0x2ee6c8, 0xf2a6ff];
  for (let i = 0; i < n; i++) {
    const layer = i % 3;
    const img = scene.add.image(Math.random() * width, Math.random() * height, key)
      .setDepth(opts.depth ?? -10)
      .setScale(layer === 2 ? 1 : 0.5)
      .setTint(tints[(i * 7) % tints.length])
      .setAlpha(0.35 + layer * 0.3);
    stars.push({ img, v: speed * (0.4 + layer * 0.6) });
  }
  const onUpdate = (_t: number, dt: number) => {
    for (const s of stars) {
      s.img.y += (s.v * dt) / 1000;
      if (s.img.y > height + 2) { s.img.y = -2; s.img.x = Math.random() * width; }
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  const destroy = () => { scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate); stars.forEach((s) => s.img.destroy()); stars.length = 0; };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, destroy);
  return { destroy };
}

// ------------------------------------------------------------------------------ navigation

type BackEntry = { scene: Phaser.Scene; cb: () => void };
const backStack: BackEntry[] = [];
let backInstalled = false;

/**
 * Register the "back" action of a scene: Escape / Backspace keys and the Android back button.
 * Only the most recently registered ACTIVE scene receives it. Auto-removed on scene shutdown.
 */
export function onBack(scene: Phaser.Scene, cb: () => void): void {
  if (!backInstalled) {
    backInstalled = true;
    onBackButton(() => {
      for (let i = backStack.length - 1; i >= 0; i--) {
        const e = backStack[i];
        if (e.scene.sys.isActive()) { e.cb(); return true; }
      }
      return false;
    });
  }
  const entry: BackEntry = { scene, cb };
  backStack.push(entry);
  const key = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'Backspace') {
      if (scene.sys.isActive()) cb();
    }
  };
  scene.input.keyboard?.on('keydown', key);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    const i = backStack.indexOf(entry);
    if (i >= 0) backStack.splice(i, 1);
    scene.input.keyboard?.off('keydown', key);
  });
}

/** Fade the scene in (call at the start of create()). */
export function fadeIn(scene: Phaser.Scene, ms = 180): void {
  scene.cameras.main.fadeIn(ms, 5, 4, 10);
}

/** Fade out, then start another scene (ignores repeated calls during the fade). */
export function goto(scene: Phaser.Scene, key: SceneKey | string, data?: object, ms = 160): void {
  const s = scene as Phaser.Scene & { __leaving?: boolean };
  if (s.__leaving) return;
  s.__leaving = true;
  scene.cameras.main.fadeOut(ms, 5, 4, 10);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    s.__leaving = false;
    scene.scene.start(key, data);
  });
}

/** Simple modal confirm dialog (YES / NO) centred on screen. Calls back with the choice. */
export function confirm(scene: Phaser.Scene, message: string, onDone: (yes: boolean) => void): void {
  const { width, height } = scene.scale.gameSize;
  const w = Math.min(260, width - 24), h = 92;
  const c = scene.add.container(0, 0).setDepth(DEPTH.overlay + 10);
  const shade = scene.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setInteractive();
  c.add(shade);
  c.add(panel(scene, (width - w) / 2, (height - h) / 2, w, h, 'raised'));
  c.add(text(scene, width / 2, (height - h) / 2 + 12, message, { size: 's', color: COLORS.text, originX: 0.5, maxWidth: w - 20, align: 'center' }));
  let done = false;
  const finish = (yes: boolean) => { if (done) return; done = true; c.destroy(); onDone(yes); };
  const by = (height + h) / 2 - 30;
  const yes = button(scene, width / 2 - 92, by, 84, 22, 'YES', () => finish(true), { size: 's', color: COLORS.good });
  const no = button(scene, width / 2 + 8, by, 84, 22, 'NO', () => finish(false), { size: 's', color: COLORS.bad });
  c.add([yes.container, no.container]);
  const key = (e: KeyboardEvent) => {
    if (e.code === 'KeyY' || e.code === 'Enter') finish(true);
    else if (e.code === 'KeyN' || e.code === 'Escape') finish(false);
  };
  scene.input.keyboard?.on('keydown', key);
  c.once(Phaser.GameObjects.Events.DESTROY, () => scene.input.keyboard?.off('keydown', key));
}
