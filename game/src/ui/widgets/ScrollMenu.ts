// =====================================================================================
//  SCROLL MENU — a MenuList showing a window of `visibleRows` rows of a longer list.
//  Keyboard: up/down (wraps), PageUp/PageDown, Home/End, Enter/Space, left/right.
//  Touch: tap selects, drag scrolls (row by row), tap the scroll arrows to page; mouse wheel.
//  Indices given to / received from the callbacks are GLOBAL (into the full item list).
// =====================================================================================
import Phaser from 'phaser';
import { COLORS } from '../../config';
import { audio } from '../../audio';
import { MenuList, modalLevel, text, type FontSize, type MenuItem } from '../kit';
import { isShown } from './util';

export interface ScrollMenuOpts {
  x: number;
  y: number;
  width: number;
  items: MenuItem[];
  visibleRows: number;
  rowHeight?: number;
  size?: FontSize;
  startIndex?: number;
  depth?: number;
  keyboard?: boolean;       // default true
  onSelect: (index: number, item: MenuItem) => void;
  onFocus?: (index: number, item: MenuItem) => void;
  onDisabled?: (index: number, item: MenuItem) => void;
  onLeft?: (index: number, item: MenuItem) => void;
  onRight?: (index: number, item: MenuItem) => void;
}

type Glyph = Phaser.GameObjects.Image | Phaser.GameObjects.BitmapText;

export class ScrollMenu {
  readonly container: Phaser.GameObjects.Container;
  private readonly list: MenuList;
  private items: MenuItem[] = [];
  private top = 0;
  private idx = 0;
  private syncing = false;
  private enabled = true;
  private readonly rowH: number;
  private readonly rows: number;
  private readonly up: Glyph;
  private readonly down: Glyph;
  private readonly level: number;
  private dragY: number | null = null;
  private keyHandler?: (e: KeyboardEvent) => void;
  private readonly onMove: (p: Phaser.Input.Pointer) => void;
  private readonly onDown: (p: Phaser.Input.Pointer) => void;
  private readonly onUp: () => void;
  private readonly onWheel: (p: Phaser.Input.Pointer, over: unknown, dx: number, dy: number) => void;

  constructor(private readonly scene: Phaser.Scene, private readonly opts: ScrollMenuOpts) {
    const size = opts.size ?? 'm';
    this.rowH = opts.rowHeight ?? (size === 's' ? 14 : size === 'm' ? 18 : 24);
    this.rows = Math.max(1, opts.visibleRows);
    this.level = modalLevel(scene);
    this.container = scene.add.container(Math.round(opts.x), Math.round(opts.y));
    if (opts.depth !== undefined) this.container.setDepth(opts.depth);
    this.items = opts.items;
    this.idx = Phaser.Math.Clamp(opts.startIndex ?? 0, 0, Math.max(0, this.items.length - 1));
    this.top = this.clampTop(this.idx - Math.floor(this.rows / 2));
    this.syncing = true;
    this.list = new MenuList(scene, {
      x: 0, y: 0, width: opts.width, items: this.windowItems(), rowHeight: this.rowH, size,
      startIndex: this.idx - this.top, keyboard: false,
      onSelect: (i) => this.opts.onSelect(this.top + i, this.items[this.top + i]),
      onFocus: (i) => {
        if (this.syncing) return;
        this.idx = this.top + i;
        this.opts.onFocus?.(this.idx, this.items[this.idx]);
      },
      onDisabled: (i) => this.opts.onDisabled?.(this.top + i, this.items[this.top + i]),
      onLeft: opts.onLeft ? (i) => opts.onLeft?.(this.top + i, this.items[this.top + i]) : undefined,
      onRight: opts.onRight ? (i) => opts.onRight?.(this.top + i, this.items[this.top + i]) : undefined,
    });
    this.syncing = false;
    this.container.add(this.list.container);

    const mk = (dir: -1 | 1): Glyph => {
      const x = Math.round(opts.width) - 6;
      const y = dir < 0 ? -7 : this.rows * this.rowH + 7;
      if (scene.textures.exists('ui_arrow_l')) {
        return scene.add.image(x, y, 'ui_arrow_l').setRotation(dir < 0 ? Math.PI / 2 : -Math.PI / 2);
      }
      return text(scene, x, y, dir < 0 ? '^' : 'v', { size: 's', color: COLORS.teal, originX: 0.5, originY: 0.5 });
    };
    this.up = mk(-1);
    this.down = mk(1);
    this.container.add([this.up, this.down]);
    const zoneFor = (g: Glyph, dir: -1 | 1) => {
      const z = scene.add.zone(g.x - 14, g.y - 11, 28, 22).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { if (this.enabled) { audio.unlock(); this.scrollBy(dir * (this.rows - 1)); } });
      this.container.add(z);
      return z;
    };
    zoneFor(this.up, -1);
    zoneFor(this.down, 1);
    scene.tweens.add({ targets: [this.up, this.down], alpha: 0.35, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.onDown = (p) => { this.dragY = this.inside(p) ? p.y : null; };
    this.onMove = (p) => {
      if (this.dragY === null || !p.isDown || !this.enabled) return;
      const dy = p.y - this.dragY;
      if (Math.abs(dy) >= this.rowH * 0.8) {
        this.list.cancelPress();
        this.scrollBy(dy < 0 ? 1 : -1, false);
        this.dragY = p.y;
      }
    };
    this.onUp = () => { this.dragY = null; };
    this.onWheel = (p, _over, _dx, dy) => {
      if (!this.enabled || !this.inside(p) || dy === 0) return;
      this.scrollBy(dy > 0 ? 1 : -1);
    };
    scene.input.on('pointerdown', this.onDown);
    scene.input.on('pointermove', this.onMove);
    scene.input.on('pointerup', this.onUp);
    scene.input.on('wheel', this.onWheel);
    if (opts.keyboard !== false) this.bindKeys();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    this.refreshArrows();
  }

  get index(): number { return this.idx; }
  get item(): MenuItem | undefined { return this.items[this.idx]; }
  get length(): number { return this.items.length; }
  /** Height of the visible window in px. */
  get height(): number { return this.rows * this.rowH; }

  /** Replace the items (keeps the index when possible). */
  setItems(items: MenuItem[], keepIndex = true): void {
    this.items = items;
    this.idx = keepIndex ? Phaser.Math.Clamp(this.idx, 0, Math.max(0, items.length - 1)) : 0;
    this.top = this.clampTop(Math.min(this.top, this.idx));
    if (this.idx >= this.top + this.rows) this.top = this.clampTop(this.idx - this.rows + 1);
    this.sync();
  }

  /** Focus a global index (scrolls the window to show it). */
  setIndex(i: number, sound = true): void {
    if (this.items.length === 0) return;
    const n = Phaser.Math.Clamp(i, 0, this.items.length - 1);
    const changed = n !== this.idx;
    this.idx = n;
    if (n < this.top) this.top = n;
    else if (n >= this.top + this.rows) this.top = n - this.rows + 1;
    this.top = this.clampTop(this.top);
    this.sync();
    if (changed && sound) audio.sfx('ui_move');
    this.opts.onFocus?.(this.idx, this.items[this.idx]);
  }

  /** Select the focused row (sounds + callbacks like MenuList.select). */
  select(): void {
    this.list.select();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.list.setEnabled(enabled);
  }

  destroy(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    this.scene.input.off('pointerdown', this.onDown);
    this.scene.input.off('pointermove', this.onMove);
    this.scene.input.off('pointerup', this.onUp);
    this.scene.input.off('wheel', this.onWheel);
    if (this.container.scene) {
      this.scene.tweens.killTweensOf([this.up, this.down]);
      this.list.destroy();
      this.container.destroy();
    }
  }

  private windowItems(): MenuItem[] {
    return this.items.slice(this.top, this.top + this.rows);
  }

  private clampTop(t: number): number {
    return Phaser.Math.Clamp(t, 0, Math.max(0, this.items.length - this.rows));
  }

  private sync(): void {
    this.syncing = true;
    this.list.setItems(this.windowItems(), false);
    this.list.setIndex(this.idx - this.top, false);
    this.syncing = false;
    this.refreshArrows();
  }

  private scrollBy(delta: number, moveFocus = true): void {
    if (this.items.length === 0) return;
    const before = this.top;
    this.top = this.clampTop(this.top + delta);
    if (moveFocus) {
      this.setIndex(Phaser.Math.Clamp(this.idx + delta, 0, this.items.length - 1));
      return;
    }
    if (this.top !== before) {
      this.idx = Phaser.Math.Clamp(this.idx, this.top, this.top + this.rows - 1);
      this.sync();
      audio.sfx('ui_move');
      this.opts.onFocus?.(this.idx, this.items[this.idx]);
    }
  }

  private refreshArrows(): void {
    this.up.setVisible(this.top > 0);
    this.down.setVisible(this.top + this.rows < this.items.length);
  }

  private inside(p: Phaser.Input.Pointer): boolean {
    let x = this.container.x;
    let y = this.container.y;
    let parent = this.container.parentContainer;
    while (parent) { x += parent.x; y += parent.y; parent = parent.parentContainer; }
    return p.x >= x && p.x < x + this.opts.width && p.y >= y && p.y < y + this.rows * this.rowH;
  }

  private bindKeys(): void {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.enabled || !isShown(this.container) || modalLevel(this.scene) > this.level || this.items.length === 0) return;
      audio.unlock();
      const n = this.items.length;
      switch (e.code) {
        case 'ArrowUp': case 'KeyW': this.setIndex(this.idx - 1 < 0 ? n - 1 : this.idx - 1); break;
        case 'ArrowDown': case 'KeyS': this.setIndex((this.idx + 1) % n); break;
        case 'PageUp': this.setIndex(this.idx - (this.rows - 1)); break;
        case 'PageDown': this.setIndex(this.idx + (this.rows - 1)); break;
        case 'Home': this.setIndex(0); break;
        case 'End': this.setIndex(n - 1); break;
        case 'Enter': case 'Space': case 'NumpadEnter': if (!e.repeat) this.select(); break;
        case 'ArrowLeft': case 'KeyA': this.opts.onLeft?.(this.idx, this.items[this.idx]); break;
        case 'ArrowRight': case 'KeyD': this.opts.onRight?.(this.idx, this.items[this.idx]); break;
        default: break;
      }
    };
    kb.on('keydown', this.keyHandler);
  }
}
