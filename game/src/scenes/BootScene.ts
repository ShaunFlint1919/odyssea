import Phaser from 'phaser';
import { SCENES, W, H, COLORS, GAME_SUBTITLE, GAME_TITLE, VERSION } from '../config';
import { DEBUG, markSceneReady } from '../debug';
import { FONT } from '../art/keys';
import { mulberry32 } from '../art/noise';
import { generateFonts } from '../art/fonts';
import { generatePlayerArt } from '../art/player';
import { generateProjectileArt } from '../art/projectiles';
import { generatePickupArt } from '../art/pickups';
import { generateFxArt, registerAnimations } from '../art/fx';
import { generateUiArt } from '../art/ui';
import { generatePlanetArt } from '../art/planets';
import { generateEnemyArt } from '../art/enemies';
import { generateBossArt } from '../art/bosses';
import { generateDoodadArt } from '../art/doodads';
import { getSave, loadSave, newGame, saveNow } from '../state/save';
import { audio } from '../audio';
import { initPlatform } from '../platform/device';
import { LEVELS, levelOrder } from '../data';

/** One slice of the boot work: label shown under the bar, relative cost (bar share), work. */
interface BootStep {
  label: string;
  weight: number;
  run: (scene: BootScene) => void;
}

/**
 * The art generators of src/art/index.ts generateAllTextures(), in the same order (fonts
 * first, registerAnimations last), then the save / platform / debug-save setup. Weights are
 * measured desktop costs (ms) so the bar advances evenly.
 */
const STEPS: BootStep[] = [
  { label: 'TYPESETTING', weight: 11, run: (s) => generateFonts(s) },
  { label: 'ASSEMBLING HULLS', weight: 16, run: (s) => generatePlayerArt(s) },
  { label: 'ARMING ORDNANCE', weight: 22, run: (s) => generateProjectileArt(s) },
  { label: 'MINTING CREDITS', weight: 13, run: (s) => generatePickupArt(s) },
  { label: 'PRIMING EXPLOSIVES', weight: 75, run: (s) => generateFxArt(s) },
  { label: 'WIRING CONSOLES', weight: 14, run: (s) => generateUiArt(s) },
  { label: 'CHARTING PLANETS', weight: 75, run: (s) => generatePlanetArt(s) },
  { label: 'SCANNING HOSTILES', weight: 100, run: (s) => generateEnemyArt(s) },
  { label: 'TRACKING CAPITAL SHIPS', weight: 220, run: (s) => generateBossArt(s) },
  { label: 'SURVEYING TERRAIN', weight: 25, run: (s) => generateDoodadArt(s) },
  { label: 'SYNCING ANIMATIONS', weight: 2, run: (s) => registerAnimations(s) },
  { label: 'LOADING PILOT RECORD', weight: 3, run: (s) => s.setupState() },
];
const TOTAL_WEIGHT = STEPS.reduce((a, s) => a + s.weight, 0);
/** More steps may run in the same frame while the frame's work stays under this (ms). */
const FRAME_BUDGET_MS = 12;
/** Loading bar geometry (game px): lit segments of SEG_W px separated by 1 px. */
const BAR_W = 166;
const BAR_H = 8;
const SEG_W = 4;
const SEG_N = Math.floor((BAR_W + 1) / (SEG_W + 1));
/** After the last step the bar finishes filling for at most this long (ms) before routing. */
const OUTRO_MAX_MS = 120;

/**
 * Generates all procedural assets one generator per frame behind an animated loading bar
 * (plain text until the bitmap fonts exist), loads the save, then routes to the first scene
 * (debug URL params: ?scene=..., &level=..., &credits=..., &max=1).
 */
export class BootScene extends Phaser.Scene {
  private next = 0;
  private frame = 0;
  private done = false;
  private outroMs = 0;
  private shown = 0;
  private time0 = 0;
  private readonly stepMs: number[] = [];
  private bar!: Phaser.GameObjects.Graphics;
  private barX = 0;
  private barY = 0;
  private plainTitle: Phaser.GameObjects.Text | null = null;
  private plainLabel: Phaser.GameObjects.Text | null = null;
  private label: Phaser.GameObjects.BitmapText | null = null;
  private pct: Phaser.GameObjects.BitmapText | null = null;
  private lastPct = -1;
  private lastLabel = '';

  constructor() {
    super(SCENES.Boot);
  }

  create(): void {
    this.next = 0;
    this.frame = 0;
    this.done = false;
    this.outroMs = 0;
    this.shown = 0;
    this.lastPct = -1;
    this.lastLabel = '';
    this.stepMs.length = 0;
    this.label = this.pct = null;
    this.time0 = performance.now();
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.drawStars();
    this.barX = Math.round((W - BAR_W) / 2);
    this.barY = Math.round(H * 0.56);
    this.bar = this.add.graphics();
    // plain canvas text until the bitmap fonts are generated (first step)
    this.plainTitle = this.add.text(W / 2, Math.round(H * 0.44), GAME_TITLE, {
      fontFamily: 'monospace', fontSize: '18px', fontStyle: 'bold', color: '#2ee6c8',
    }).setOrigin(0.5);
    this.plainLabel = this.add.text(this.barX, this.barY + BAR_H + 6, 'LOADING', {
      fontFamily: 'monospace', fontSize: '9px', color: '#8a84a0',
    }).setOrigin(0, 0);
    this.drawBar(0);
  }

  override update(_time: number, delta: number): void {
    if (this.done) return;
    // frame 0 only shows the screen: the first (synchronous) generator runs on frame 1
    if (this.frame++ === 0) return;
    const f0 = performance.now();
    while (this.next < STEPS.length) {
      const st = STEPS[this.next];
      const t0 = performance.now();
      try {
        st.run(this);
      } catch (e) {
        // never hang on the loading screen: the scenes fall back on missing textures
        console.error(`[boot] ${st.label.toLowerCase()} failed:`, e);
      }
      this.stepMs.push(performance.now() - t0);
      this.next++;
      if (this.next === 1) this.useBitmapFonts();
      if (performance.now() - f0 > FRAME_BUDGET_MS) break;
    }
    let target = 0;
    for (let i = 0; i < this.next; i++) target += STEPS[i].weight;
    target /= TOTAL_WEIGHT;
    // ease the displayed progress toward the work done (a long step still jumps it forward)
    const k = Math.min(1, (Math.min(delta, 50) / 1000) * 14);
    this.shown += (target - this.shown) * k;
    if (target - this.shown < 0.004) this.shown = target;
    this.updateTexts(this.shown);
    this.drawBar(this.shown);
    if (this.next >= STEPS.length) {
      this.outroMs += Math.min(delta, 50);
      if (this.shown >= 0.995 || this.outroMs >= OUTRO_MAX_MS) this.finish();
    }
  }

  /** Last boot step: save, platform, audio volumes and the debug save overrides. */
  setupState(): void {
    loadSave();
    initPlatform();
    const s = getSave();
    audio.setVolumes(DEBUG.mute ? 0 : s.settings.sfx, DEBUG.mute ? 0 : s.settings.music);
    this.applyDebugSave();
  }

  private finish(): void {
    this.done = true;
    if (import.meta.env?.DEV) {
      const total = performance.now() - this.time0;
      const parts = STEPS.map((s, i) => `${s.label.split(' ')[0].toLowerCase()} ${Math.round(this.stepMs[i] ?? 0)}`).join(', ');
      console.info(`[boot] ready in ${total.toFixed(0)} ms (${parts})`);
    }
    markSceneReady(SCENES.Boot);
    this.route();
  }

  // ------------------------------------------------------------------ loading screen

  private drawStars(): void {
    const g = this.add.graphics();
    const r = mulberry32(0x5eed);
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * H);
      const b = r();
      g.fillStyle(b < 0.15 ? 0xd8e8ff : b < 0.5 ? 0x6a6c9a : 0x34345a, 1);
      g.fillRect(x, y, b < 0.08 ? 2 : 1, b < 0.08 ? 2 : 1);
    }
  }

  /** The bitmap fonts exist from now on: swap the placeholder texts. */
  private useBitmapFonts(): void {
    if (!this.cache.bitmapFont.exists(FONT.l) || !this.cache.bitmapFont.exists(FONT.s)) return;
    this.plainTitle?.destroy();
    this.plainLabel?.destroy();
    this.plainTitle = this.plainLabel = null;
    this.add.bitmapText(W / 2, Math.round(H * 0.44), FONT.l, GAME_TITLE).setOrigin(0.5);
    this.add.bitmapText(W / 2, Math.round(H * 0.44) + 14, FONT.s, GAME_SUBTITLE.toUpperCase()).setOrigin(0.5).setTint(COLORS.accentLight);
    this.add.bitmapText(W / 2, H - 14, FONT.s, `V${VERSION}`).setOrigin(0.5).setTint(COLORS.textDim);
    this.label = this.add.bitmapText(this.barX, this.barY + BAR_H + 6, FONT.s, '').setTint(COLORS.teal);
    this.pct = this.add.bitmapText(this.barX + BAR_W, this.barY + BAR_H + 6, FONT.s, '').setOrigin(1, 0).setTint(COLORS.text);
  }

  private updateTexts(shown: number): void {
    const step = STEPS[Math.min(this.next, STEPS.length - 1)];
    const text = this.next >= STEPS.length ? 'READY' : step.label;
    const pct = Math.round(shown * 100);
    if (this.label && text !== this.lastLabel) {
      this.lastLabel = text;
      this.label.setText(text);
    }
    if (this.pct && pct !== this.lastPct) {
      this.lastPct = pct;
      this.pct.setText(`${pct}%`);
    }
  }

  /** Segmented neon bar: gunmetal frame, teal lit segments, a sweeping shine and a magenta head. */
  private drawBar(p: number): void {
    const g = this.bar;
    const x = this.barX, y = this.barY;
    g.clear();
    g.fillStyle(0x05040a, 1).fillRect(x - 3, y - 3, BAR_W + 6, BAR_H + 6);
    g.fillStyle(COLORS.panelLight, 1).fillRect(x - 2, y - 2, BAR_W + 4, BAR_H + 4);
    g.fillStyle(COLORS.panelDark, 1).fillRect(x - 1, y - 1, BAR_W + 2, BAR_H + 2);
    const lit = Math.round(p * SEG_N);
    const shine = Math.floor((this.frame * 0.6) % (SEG_N + 8));
    const blink = Math.floor(this.frame / 6) % 2 === 0;
    for (let i = 0; i < SEG_N; i++) {
      const sx = x + i * (SEG_W + 1);
      if (i < lit) {
        const head = i === lit - 1 && lit < SEG_N;
        const hot = Math.abs(i - shine) <= 1;
        g.fillStyle(head ? (blink ? COLORS.accent : COLORS.accentLight) : hot ? 0x9cf3e6 : COLORS.teal, 1).fillRect(sx, y, SEG_W, BAR_H);
        g.fillStyle(head ? COLORS.accentLight : 0xc8fbf3, 1).fillRect(sx, y, SEG_W, 1);
        g.fillStyle(head ? 0x7a2a9a : COLORS.tealDark, 1).fillRect(sx, y + BAR_H - 2, SEG_W, 2);
      } else {
        g.fillStyle(0x0d1f24, 1).fillRect(sx, y, SEG_W, BAR_H);
      }
    }
  }

  // ------------------------------------------------------------------ routing

  private applyDebugSave(): void {
    if (!DEBUG.scene && DEBUG.credits === null && !DEBUG.max) return;
    const s = getSave();
    if (DEBUG.scene && s.unlockedLevels.length === 0) {
      // Fresh debug session: start a campaign so every scene has valid state.
      newGame('normal');
    }
    const save = getSave();
    if (DEBUG.credits !== null) save.credits = DEBUG.credits;
    if (DEBUG.max) {
      save.credits = Math.max(save.credits, 999999);
      save.unlockedLevels = levelOrder();
      save.completedLevels = levelOrder(); // also unlocks every unlockLevel-gated shop item
    }
    if (DEBUG.level && LEVELS.some((l) => l.id === DEBUG.level)) save.currentLevel = DEBUG.level;
    saveNow();
  }

  private route(): void {
    const target = DEBUG.scene && Object.values(SCENES).includes(DEBUG.scene as never) ? DEBUG.scene : SCENES.Title;
    if (target === SCENES.Game) {
      const levelId = DEBUG.level ?? getSave().currentLevel ?? levelOrder()[0];
      this.scene.start(SCENES.Game, { levelId });
    } else if (target === SCENES.Shop) {
      this.scene.start(SCENES.Shop, { category: DEBUG.shop ?? undefined });
    } else {
      this.scene.start(target);
    }
  }
}
