// =====================================================================================
//  TITLE — animated logo over a parallax starfield with a big planet and occasional ship
//  flybys. First visit of the session: "TAP TO START" (unlocks audio), then the main menu:
//  CONTINUE (when a campaign exists) / NEW GAME (difficulty choice) / OPTIONS.
//  Android back on the main menu is NOT consumed (the platform exits the app).
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, GAME_SUBTITLE, SCENES, VERSION } from '../config';
import { markSceneReady, setHookState } from '../debug';
import { HULL_SPRITES, hullKey, planetKey } from '../art/keys';
import { BIOMES, type Biome, type Difficulty } from '../types';
import { audio } from '../audio';
import { getSave, hasSaveGame, newGame } from '../state/save';
import { DIFFICULTY_SCALES } from '../state/progress';
import { LEVELS, PLANETS } from '../data';
import { MenuList, confirm, fadeIn, goto, onBackIf, panel, starfield, text, type MenuItem } from '../ui/kit';
import { cachedTexture, neonRule } from '../ui/widgets';

/** Atmosphere glow colour per biome (title planet halo). */
const BIOME_GLOW: Record<Biome, number> = {
  desert: 0xffa040, jungle: 0x50e070, ocean: 0x3a90ff, cavern: 0x9a70ff,
  space: 0xd04cff, lava: 0xff5020, ice: 0x9ae8ff, techno: 0x2ee6c8,
};
/** Base colour of the procedural fallback planet (used only when the planet art is missing). */
const BIOME_BASE: Record<Biome, [number, number, number]> = {
  desert: [214, 150, 80], jungle: [60, 150, 70], ocean: [40, 100, 200], cavern: [110, 90, 140],
  space: [150, 70, 190], lava: [200, 70, 30], ice: [170, 220, 240], techno: [60, 170, 160],
};

const MENU_W = 176;
const ROW_H = 24;

/** "TAP TO START" is shown once per session. */
let firstView = true;

type Mode = 'press' | 'main' | 'difficulty';

export class TitleScene extends Phaser.Scene {
  private mode: Mode = 'press';
  private menuBox: Phaser.GameObjects.Container | null = null;
  private menu: MenuList | null = null;
  private trail: Phaser.GameObjects.Image[] = [];
  private trailIdx = 0;

  constructor() {
    super(SCENES.Title);
  }

  create(): void {
    this.mode = 'press';
    this.menuBox = null;
    this.menu = null;
    this.trail = [];
    this.trailIdx = 0;
    fadeIn(this, 260);
    const { width, height } = this.scale.gameSize;
    starfield(this, { density: 1.3, speed: 8 });
    this.buildPlanets(width, height);
    this.buildLogo(width, height);
    text(this, width - 4, height - 3, `v${VERSION}`, { size: 's', color: COLORS.textDim, originX: 1, originY: 1 }).setDepth(20);
    audio.music('title');
    this.buildTrailPool();
    this.time.delayedCall(1400 + Math.random() * 1600, () => this.flyby());
    onBackIf(this, () => {
      if (this.mode !== 'difficulty') return false; // main menu: let the platform exit the app
      audio.sfx('ui_back');
      this.showMain(true, 1);
      return true;
    });
    if (firstView) this.showPressStart(width, height);
    else this.showMain(false);
    markSceneReady(SCENES.Title, { mode: this.mode });
  }

  // ---------------------------------------------------------------------------- backdrop

  private pickBiome(): Biome {
    const save = getSave();
    const lv = LEVELS.find((l) => l.id === save.currentLevel);
    if (hasSaveGame() && lv) return lv.biome;
    return BIOMES[Math.floor(Math.random() * BIOMES.length)];
  }

  /** Texture key of a planet globe: large art if present, else the map globe, else procedural. */
  private planetTexture(biome: Biome): string {
    const lg = `${planetKey(biome)}_lg`;
    if (this.textures.exists(lg)) return lg;
    if (this.textures.exists(planetKey(biome))) return planetKey(biome);
    return cachedTexture(this, `__title_planet_${biome}`, 64, 64, (ctx) => {
      const [r, g, b] = BIOME_BASE[biome];
      const img = ctx.createImageData(64, 64);
      const c = 31.5;
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const dx = (x - c) / 30, dy = (y - c) / 30;
          const d2 = dx * dx + dy * dy;
          if (d2 > 1) continue;
          const nz = Math.sqrt(1 - d2);
          const light = Math.max(0, -dx * 0.55 - dy * 0.6 + nz * 0.6);
          const band = 0.85 + 0.15 * Math.sin((dy * 6 + Math.sin(dx * 3) * 0.6) * Math.PI);
          const q = Math.round(Math.min(1, light * band) * 4) / 4;
          const k = 0.18 + q * 0.95;
          const i = (y * 64 + x) * 4;
          img.data[i] = Math.min(255, r * k); img.data[i + 1] = Math.min(255, g * k); img.data[i + 2] = Math.min(255, b * k);
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    });
  }

  private glowTexture(): string {
    return cachedTexture(this, '__title_glow', 64, 64, (ctx) => {
      const img = ctx.createImageData(64, 64);
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const d = Math.hypot(x - 31.5, y - 31.5) / 32;
          const a = Math.max(0, 1 - d) ** 2;
          const i = (y * 64 + x) * 4;
          img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = Math.round(a * 255);
        }
      }
      ctx.putImageData(img, 0, 0);
    });
  }

  private buildPlanets(width: number, height: number): void {
    const biome = this.pickBiome();
    const key = this.planetTexture(biome);
    const frame = this.textures.getFrame(key);
    const scale = Math.max(1, Math.round(208 / Math.max(1, frame.width)));
    const size = frame.width * scale;
    const px = Math.round(width * 0.8);
    const py = Math.round(height * 0.86);
    const glow = this.add.image(px, py, this.glowTexture()).setDepth(-9).setScale((size * 1.5) / 64)
      .setTint(BIOME_GLOW[biome]).setAlpha(0.32).setBlendMode(Phaser.BlendModes.ADD);
    const planet = this.add.image(px, py, key).setScale(scale).setDepth(-8);
    this.tweens.add({ targets: [planet, glow], y: py - 5, duration: 7000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: glow, alpha: 0.2, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const others = BIOMES.filter((b) => b !== biome);
    const far = others[Math.floor(Math.random() * others.length)];
    const fkey = this.planetTexture(far);
    const fframe = this.textures.getFrame(fkey);
    const fscale = fframe.width > 48 ? 0.5 : 1;
    const fx = Math.round(width * 0.14);
    const fy = Math.round(height * 0.47);
    this.add.image(fx, fy, this.glowTexture()).setDepth(-9).setScale((fframe.width * fscale * 1.6) / 64)
      .setTint(BIOME_GLOW[far]).setAlpha(0.18).setBlendMode(Phaser.BlendModes.ADD);
    const small = this.add.image(fx, fy, fkey).setScale(fscale).setDepth(-9).setAlpha(0.8);
    this.tweens.add({ targets: small, y: fy + 3, duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ---------------------------------------------------------------------------- logo

  /** White silhouette of ui_logo (for the additive shine sweep). */
  private logoSilhouette(): string | null {
    const key = '__title_logo_sil';
    if (this.textures.exists(key)) return key;
    const fr = this.textures.getFrame('ui_logo');
    const src = fr?.source?.image as unknown;
    if (!(src instanceof HTMLCanvasElement) && !(src instanceof HTMLImageElement)) return null;
    return cachedTexture(this, key, fr.cutWidth, fr.cutHeight, (ctx, w, h) => {
      ctx.drawImage(src, fr.cutX, fr.cutY, w, h, 0, 0, w, h);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    });
  }

  private buildLogo(width: number, height: number): void {
    const cy = Math.round(height * 0.2);
    const c = this.add.container(Math.round(width / 2), cy).setDepth(10);
    const glow = this.add.image(0, 2, this.glowTexture()).setScale(4.2, 1.7).setTint(COLORS.accent)
      .setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD);
    c.add(glow);
    this.tweens.add({ targets: glow, alpha: 0.16, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    let half = 34;
    if (this.textures.exists('ui_logo')) {
      const logo = this.add.image(0, 0, 'ui_logo');
      c.add(logo);
      half = Math.round(logo.height / 2);
      const sil = this.logoSilhouette();
      if (sil) {
        const shine = this.add.image(0, 0, sil).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6).setVisible(false);
        c.add(shine);
        this.animateShine(shine);
      }
    } else {
      const t1 = text(this, 0, -16, 'NOVA', { size: 'l', originX: 0.5, originY: 0.5 }).setScale(2);
      const t2 = text(this, 0, 18, 'CORSAIR', { size: 'l', originX: 0.5, originY: 0.5 }).setScale(2);
      c.add([t1, t2]);
      half = 36;
    }
    c.add(neonRule(this, 0, half + 5, 208, COLORS.teal));
    c.add(text(this, 0, half + 11, GAME_SUBTITLE.toUpperCase(), { size: 's', color: COLORS.accentLight, originX: 0.5 }));
    const float = () => this.tweens.add({ targets: c, y: cy + 3, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (firstView) {
      c.setAlpha(0);
      c.y = cy - 36;
      this.tweens.add({ targets: c, y: cy, alpha: 1, duration: 900, delay: 150, ease: 'Back.easeOut', onComplete: float });
    } else {
      float();
    }
  }

  private animateShine(shine: Phaser.GameObjects.Image): void {
    const w = shine.width;
    const h = shine.height;
    const band = 18;
    const state = { x: -band };
    const sweep = () => {
      state.x = -band;
      shine.setVisible(true);
      this.tweens.add({
        targets: state, x: w, duration: 700, ease: 'Sine.easeInOut',
        onUpdate: () => {
          const x0 = Math.max(0, Math.round(state.x));
          const x1 = Math.min(w, Math.round(state.x + band));
          if (x1 <= x0) shine.setVisible(false);
          else shine.setVisible(true).setCrop(x0, 0, x1 - x0, h);
        },
        onComplete: () => shine.setVisible(false),
      });
    };
    this.time.addEvent({ delay: 3800, startAt: 1800, loop: true, callback: sweep });
  }

  // ---------------------------------------------------------------------------- flybys

  private buildTrailPool(): void {
    const key = cachedTexture(this, '__title_puff', 2, 2, (ctx) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 2, 2); });
    for (let i = 0; i < 40; i++) {
      this.trail.push(this.add.image(-10, -10, key).setVisible(false).setBlendMode(Phaser.BlendModes.ADD));
    }
  }

  private puff(x: number, y: number, depth: number, scale: number): void {
    const p = this.trail[this.trailIdx];
    this.trailIdx = (this.trailIdx + 1) % this.trail.length;
    if (!p) return;
    this.tweens.killTweensOf(p);
    p.setPosition(x + (Math.random() - 0.5) * 3 * scale, y).setVisible(true).setAlpha(0.9).setDepth(depth).setScale(scale)
      .setTint(Math.random() < 0.6 ? 0xffb050 : 0x7cf0ff);
    this.tweens.add({ targets: p, y: y + 10 * scale, alpha: 0, duration: 320, onComplete: () => p.setVisible(false) });
  }

  private flyby(): void {
    if (!this.sys.isActive()) return;
    this.time.delayedCall(4200 + Math.random() * 5200, () => this.flyby());
    const ids = HULL_SPRITES.filter((id) => this.textures.exists(hullKey(id)));
    if (ids.length === 0) return;
    const { width, height } = this.scale.gameSize;
    const close = Math.random() < 0.4;
    const scale = close ? 2 : 1;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const x0 = width * (dir > 0 ? 0.08 + Math.random() * 0.3 : 0.62 + Math.random() * 0.3);
    const x1 = x0 + dir * (40 + Math.random() * 60);
    const y0 = height + 24 * scale;
    const y1 = -32 * scale;
    const dur = close ? 1500 : 3200;
    const depth = close ? 8 : -7;
    const id = ids[Math.floor(Math.random() * ids.length)];
    const ships: Phaser.GameObjects.Sprite[] = [];
    const lead = this.add.sprite(x0, y0, hullKey(id), dir > 0 ? 2 : 1).setScale(scale).setDepth(depth);
    if (!close) lead.setAlpha(0.85);
    ships.push(lead);
    if (!close && Math.random() < 0.6) {
      for (const side of [-1, 1]) {
        const wing = this.add.sprite(x0 + side * 20, y0 + 18, hullKey(ids[0]), dir > 0 ? 2 : 1).setDepth(depth).setAlpha(0.8);
        ships.push(wing);
      }
    }
    const offsets = ships.map((s) => [s.x - x0, s.y - y0]);
    const state = { t: 0 };
    let acc = 0;
    let last = 0;
    this.tweens.add({
      targets: state, t: 1, duration: dur, ease: 'Linear',
      onUpdate: () => {
        const ey = state.t * state.t;                 // accelerating climb
        const ex = 0.5 - 0.5 * Math.cos(state.t * Math.PI);
        const x = x0 + (x1 - x0) * ex;
        const y = y0 + (y1 - y0) * ey;
        ships.forEach((s, i) => s.setPosition(Math.round(x + offsets[i][0]), Math.round(y + offsets[i][1])));
        if (state.t > 0.75) ships.forEach((s) => s.setFrame(0));
        acc += (state.t - last) * dur;
        last = state.t;
        if (acc >= 34) {
          acc = 0;
          ships.forEach((s) => this.puff(s.x, s.y + 13 * scale, depth - 1, scale));
        }
      },
      onComplete: () => ships.forEach((s) => s.destroy()),
    });
  }

  // ---------------------------------------------------------------------------- menus

  private showPressStart(width: number, height: number): void {
    this.mode = 'press';
    const prompt = text(this, width / 2, Math.round(height * 0.62), 'TAP TO START', { size: 'm', color: COLORS.teal, originX: 0.5, originY: 0.5 })
      .setDepth(20);
    const blink = this.time.addEvent({ delay: 520, loop: true, callback: () => prompt.setVisible(!prompt.visible) });
    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      this.input.off('pointerdown', go);
      this.input.keyboard?.off('keydown', onKey);
      audio.unlock();
      audio.music('title');
      audio.sfx('ui_select');
      firstView = false;
      blink.remove();
      prompt.setVisible(true);
      this.tweens.add({
        targets: prompt, alpha: 0, duration: 55, yoyo: true, repeat: 3,
        onComplete: () => { prompt.destroy(); this.showMain(true); },
      });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'Backspace') return;
      go();
    };
    this.input.on('pointerdown', go);
    this.input.keyboard?.on('keydown', onKey);
  }

  private continueHelp(): string {
    const save = getSave();
    const lv = LEVELS.find((l) => l.id === save.currentLevel);
    if (!lv) return 'Resume your campaign.';
    const planet = PLANETS.find((p) => p.id === lv.planet);
    return `Resume: ${(planet?.name ?? lv.planet).toUpperCase()} ${lv.index} - ${lv.name}`;
  }

  private showMain(animated = true, start = 0): void {
    this.mode = 'main';
    setHookState({ mode: this.mode });
    const actions: (() => void)[] = [];
    const items: MenuItem[] = [];
    if (hasSaveGame()) {
      items.push({ label: 'CONTINUE', help: this.continueHelp() });
      actions.push(() => goto(this, SCENES.Hangar));
    }
    items.push({ label: 'NEW GAME', help: 'Start a new campaign.' });
    actions.push(() => this.showDifficulty());
    items.push({ label: 'OPTIONS', help: 'Sound, controls and campaign reset.' });
    actions.push(() => goto(this, SCENES.Options, { from: SCENES.Title }));
    this.buildMenu(null, items, Math.min(start, items.length - 1), (i) => actions[i]?.(), animated);
  }

  private difficultyHelp(d: Difficulty): string {
    const s = DIFFICULTY_SCALES[d];
    const pct = (v: number) => `${v > 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`;
    if (d === 'normal') return 'The intended challenge.';
    const parts = [`Enemy hull ${pct(s.hp)}`, `fire ${pct(s.fireRate)}`];
    if (s.credits !== 1) parts.push(`credits ${pct(s.credits)}`);
    return `${parts.join(', ')}.`;
  }

  private showDifficulty(): void {
    this.mode = 'difficulty';
    setHookState({ mode: this.mode });
    const diffs: Difficulty[] = ['easy', 'normal', 'hard'];
    const items: MenuItem[] = [
      { label: 'EASY', help: this.difficultyHelp('easy'), color: COLORS.good },
      { label: 'NORMAL', help: this.difficultyHelp('normal') },
      { label: 'HARD', help: this.difficultyHelp('hard'), color: COLORS.warn },
      { label: 'BACK', help: 'Return to the main menu.', color: COLORS.textDim },
    ];
    this.buildMenu('SELECT DIFFICULTY', items, 1, (i) => {
      if (i === 3) { this.showMain(true, hasSaveGame() ? 1 : 0); return; }
      this.startCampaign(diffs[i]);
    }, true);
  }

  private startCampaign(d: Difficulty): void {
    const begin = () => {
      newGame(d);
      goto(this, SCENES.Hangar);
    };
    if (!hasSaveGame()) { begin(); return; }
    this.menu?.setEnabled(false);
    confirm(this, 'Start a new campaign? Your current progress will be lost.', (yes) => {
      this.menu?.setEnabled(true);
      if (yes) begin();
    });
  }

  private buildMenu(title: string | null, items: MenuItem[], start: number, onSelect: (i: number) => void, animated: boolean): void {
    this.menu?.destroy();
    this.menuBox?.destroy();
    const { width, height } = this.scale.gameSize;
    const h = items.length * ROW_H + 16;
    const x = Math.round((width - MENU_W) / 2);
    const y = Math.round(height * 0.56);
    const box = this.add.container(0, 0).setDepth(20);
    if (title) {
      box.add(text(this, width / 2, y - 12, title, { size: 's', color: COLORS.accentLight, originX: 0.5 }));
    }
    box.add(panel(this, x, y, MENU_W, h, 'raised'));
    const help = text(this, width / 2, y + h + 8, '', { size: 's', color: COLORS.teal, originX: 0.5, maxWidth: width - 24, align: 'center' });
    box.add(help);
    const list = new MenuList(this, {
      x: x + 18, y: y + 8, width: MENU_W - 30, items, rowHeight: ROW_H, size: 'm', startIndex: start,
      onSelect: (i) => onSelect(i),
      onFocus: (_i, it) => help.setText(it.help ?? ''),
    });
    box.add(list.container);
    this.menu = list;
    this.menuBox = box;
    if (animated) {
      box.setAlpha(0);
      box.y = 8;
      this.tweens.add({ targets: box, alpha: 1, y: 0, duration: 200, ease: 'Quad.easeOut' });
    }
  }
}
