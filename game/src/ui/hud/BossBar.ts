// =====================================================================================
//  BOSS BAR — slides in across the top of the playfield when HudModel.bossHp becomes
//  non-null, charges up, then drains smoothly (instant drop + delayed ghost) and flashes on
//  hits; slides out when bossHp returns to null.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS } from '../../config';
import { PART } from './art';
import { renderText, type HudFonts } from './glyphs';
import { BOSS_H, BOSS_W, type HudLayout } from './layout';
import { HCrop, Pulse, Trail, clamp01 } from './widgets';

const HIDDEN = 0, ENTER = 1, SHOWN = 2, LEAVE = 3;
const ENTER_MS = 380;
const CHARGE_DELAY = 160;
const CHARGE_MS = 700;
const LEAVE_MS = 320;

const easeOutBack = (p: number): number => {
  const c1 = 1.4, c3 = c1 + 1;
  const q = p - 1;
  return 1 + c3 * q * q * q + c1 * q * q;
};
const easeOutCubic = (p: number): number => 1 - (1 - p) * (1 - p) * (1 - p);

export class BossBar {
  private readonly c: Phaser.GameObjects.Container;
  private readonly fill: HCrop;
  private readonly ghost: HCrop;
  private readonly flash: Phaser.GameObjects.Image;
  private readonly nameImg: Phaser.GameObjects.Image;
  private readonly nameTex: Phaser.Textures.CanvasTexture;
  private readonly trail = new Trail(80, 280, 0.42);
  private readonly hit = new Pulse(150);
  private state = HIDDEN;
  private t = 0;
  private hp = 0;
  private hitCooldown = 0;
  private lastName: string | null | undefined = undefined;
  private lastY = Number.NaN;
  private lastFlashA = -1;
  private lastFlashW = -1;
  private readonly yHidden: number;

  constructor(scene: Phaser.Scene, root: Phaser.GameObjects.Container, partsKey: string, nameTexKey: string, L: HudLayout, private readonly fonts: HudFonts) {
    const b = L.boss;
    this.yHidden = -(b.y + b.h + 6);
    this.c = scene.add.container(0, this.yHidden).setScrollFactor(0).setVisible(false);
    root.add(this.c);
    const tex = scene.textures.createCanvas(nameTexKey, BOSS_W, fonts.s.cellH + 2);
    if (!tex) throw new Error(`[hud] cannot create canvas texture ${nameTexKey}`);
    this.nameTex = tex;
    this.nameImg = scene.add.image(b.x + 1, b.y - 1, nameTexKey).setOrigin(0).setScrollFactor(0);
    const barY = b.y + fonts.s.cellH + 2;
    const frame = scene.add.image(b.x, barY, partsKey, PART.bossFrame).setOrigin(0).setScrollFactor(0);
    const ghostImg = scene.add.image(b.x + 2, barY + 2, partsKey, PART.bossWhite).setOrigin(0).setScrollFactor(0)
      .setTint(0xfff0c8).setAlpha(0.85);
    const fillImg = scene.add.image(b.x + 2, barY + 2, partsKey, PART.bossFill).setOrigin(0).setScrollFactor(0);
    this.flash = scene.add.image(b.x + 2, barY + 2, partsKey, PART.bossWhite).setOrigin(0).setScrollFactor(0).setVisible(false);
    this.c.add([this.nameImg, frame, ghostImg, fillImg, this.flash]);
    this.ghost = new HCrop(ghostImg, BOSS_W, BOSS_H);
    this.fill = new HCrop(fillImg, BOSS_W, BOSS_H);
  }

  private drawName(name: string): void {
    const ctx = this.nameTex.getContext();
    ctx.clearRect(0, 0, this.nameTex.width, this.nameTex.height);
    const maxChars = Math.floor((this.nameTex.width - 2) / this.fonts.s.cellW);
    const s = name.toUpperCase().slice(0, maxChars);
    ctx.drawImage(renderText(this.fonts.s, s, { tint: COLORS.accentLight, outline: '#05040a' }), 0, 0);
    this.nameTex.refresh();
  }

  /** Feeds the model values (every frame). */
  set(hp: number | null, name: string | null): void {
    if (hp === null) {
      if (this.state === ENTER || this.state === SHOWN) { this.state = LEAVE; this.t = 0; }
      return;
    }
    if (name !== this.lastName) { this.lastName = name; this.drawName(name ?? 'BOSS'); }
    this.hp = clamp01(hp);
    if (this.state === HIDDEN || this.state === LEAVE) {
      this.state = ENTER;
      this.t = 0;
      this.trail.snap(0);
      this.c.setVisible(true);
      return;
    }
    if (this.state === SHOWN) {
      const drop = this.trail.set(this.hp);
      if (drop > 0.0004 && this.hitCooldown <= 0) { this.hit.fire(0.9); this.hitCooldown = 80; }
    }
  }

  get visible(): boolean { return this.state !== HIDDEN; }

  tick(dt: number): void {
    if (this.state === HIDDEN) return;
    this.t += dt;
    this.hitCooldown -= dt;
    let y = 0;
    if (this.state === ENTER) {
      const p = Math.min(1, this.t / ENTER_MS);
      y = this.yHidden * (1 - easeOutBack(p));
      const cp = clamp01((this.t - CHARGE_DELAY) / CHARGE_MS);
      this.trail.snap(this.hp * easeOutCubic(cp));
      if (cp >= 1 && p >= 1) { this.state = SHOWN; this.trail.snap(this.hp); }
    } else if (this.state === LEAVE) {
      const p = Math.min(1, this.t / LEAVE_MS);
      y = this.yHidden * p * p;
      if (p >= 1) { this.state = HIDDEN; this.c.setVisible(false); this.lastY = Number.NaN; return; }
    }
    const ry = Math.round(y);
    if (ry !== this.lastY) { this.lastY = ry; this.c.setY(ry); }
    this.trail.tick(dt);
    const fw = Math.round(this.trail.shown * BOSS_W);
    this.fill.set(fw);
    this.ghost.set(Math.round(this.trail.ghost * BOSS_W));
    this.hit.tick(dt);
    const a = Math.round(this.hit.v * 32);
    if (a !== this.lastFlashA || (a > 0 && fw !== this.lastFlashW)) {
      this.lastFlashA = a;
      this.lastFlashW = fw;
      if (a === 0 || fw === 0) this.flash.setVisible(false);
      else this.flash.setVisible(true).setAlpha(a / 32).setCrop(0, 0, fw, BOSS_H);
    }
  }
}
