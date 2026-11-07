// =====================================================================================
//  FX — pooled explosions, sparks, debris, smoke, shockwaves, glows, floating texts,
//  damage vignette and screen flash. Everything is driven by the world clock (manual
//  frame animation) so hit-stop / slow-motion / DEBUG.speed freeze or scale it too.
//  Depth bands: ground FX (DEPTH.groundFx, scroll with the terrain); air smoke, glows and
//  fireballs just under the enemy bullets (bullets stay readable through any explosion);
//  sparks / debris / texts / edge warnings / vignette / flash above everything but the HUD.
//  The animation, pixel and glow pools grow on demand up to their caps (then recycle round
//  robin): hidden pooled objects still cost Phaser a willRender() every frame, so only the peak
//  actually reached stays in the display list.
// =====================================================================================
import Phaser from 'phaser';
import { DEPTH, H, PLAY_W } from '../config';
import { ANIM, FONT } from '../art/keys';
import { ensureFonts } from '../ui/kit';
import { FrameAnim, TEX_CHEVRON, TEX_CRATER, TEX_PX, TEX_VIGNETTE, fallbackTex, texOr } from './tex';
import type { World } from './world';

const FIRE_TINTS = [0xffffff, 0xfff2b0, 0xffd050, 0xff9a30, 0xff5a18, 0xe03010];
/** Hot pixels / debris and additive glows: pool caps and the part created up front. */
const BIT_CAP = 240;
const BIT_PREWARM = 64;
const GLOW_CAP = 40;
const GLOW_PREWARM = 12;

class AnimFx {
  active = false;
  anim: FrameAnim | null = null;
  age = 0;
  delay = 0;
  lastIdx = -1;
  vx = 0;
  vy = 0;
  scroll = 0;
  s0 = 1;
  s1 = 1;
  a0 = 1;
  a1 = 1;
  constructor(readonly img: Phaser.GameObjects.Image) {}
}

class Bit {
  active = false;
  age = 0;
  life = 0;
  vx = 0;
  vy = 0;
  drag = 0;
  spin = 0;
  a0 = 1;
  s0 = 1;
  s1 = 1;
  scroll = 0;
  anim: FrameAnim | null = null;
  lastIdx = -1;
  constructor(readonly img: Phaser.GameObjects.Image) {}
}

class FloatText {
  active = false;
  age = 0;
  life = 900;
  y0 = 0;
  constructor(readonly txt: Phaser.GameObjects.BitmapText) {}
}

class Decal {
  active = false;
  constructor(readonly img: Phaser.GameObjects.Image) {}
}

/** Blinking edge warning (units about to enter from the bottom edge). */
class Marker {
  active = false;
  age = 0;
  life = 0;
  y0 = 0;
  tint = 0xffffff;
  constructor(readonly img: Phaser.GameObjects.Image) {}
}

/**
 * Index of a free item of a round-robin pool (searched from `cursor`), -1 when all are busy.
 * The caller then grows the pool or recycles the item at the cursor.
 */
function freeIndex(items: readonly { active: boolean }[], cursor: number): number {
  const n = items.length;
  for (let k = 0; k < n; k++) {
    const i = (cursor + k) % n;
    if (!items[i].active) return i;
  }
  return -1;
}

/** One depth band of frame-animated effects (grows on demand up to `cap`). */
class AnimPool {
  private readonly items: AnimFx[] = [];
  private cursor = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly cap: number, private readonly depth: number, prewarm: number) {
    for (let i = 0; i < prewarm; i++) this.grow();
  }

  private grow(): AnimFx {
    const f = new AnimFx(this.scene.add.image(-100, -100, TEX_PX).setDepth(this.depth).setVisible(false));
    this.items.push(f);
    return f;
  }

  /** Grab a free slot (grow while under the cap, else recycle the oldest-ish one round robin). */
  take(): AnimFx {
    const items = this.items;
    const i = freeIndex(items, this.cursor);
    if (i >= 0) {
      this.cursor = (i + 1) % items.length;
      return items[i];
    }
    if (items.length < this.cap) return this.grow();
    const it = items[this.cursor];
    this.cursor = (this.cursor + 1) % items.length;
    return it;
  }

  update(dtMs: number, scrollSpeed: number): void {
    const dts = dtMs / 1000;
    for (let k = 0; k < this.items.length; k++) {
      const f = this.items[k];
      if (!f.active) continue;
      const img = f.img;
      if (f.delay > 0) {
        f.delay -= dtMs;
        if (f.delay > 0) continue;
        img.setVisible(true);
        f.age = 0;
      } else {
        f.age += dtMs;
      }
      const anim = f.anim!;
      const idx = anim.index(f.age);
      if (idx < 0) {
        f.active = false;
        img.setVisible(false);
        continue;
      }
      if (idx !== f.lastIdx) {
        anim.apply(img, idx);
        f.lastIdx = idx;
      }
      img.x += f.vx * dts;
      img.y += (f.vy + f.scroll * scrollSpeed) * dts;
      const p = f.age / anim.duration;
      if (f.s0 !== f.s1) img.setScale(f.s0 + (f.s1 - f.s0) * p);
      if (f.a0 !== f.a1) img.setAlpha(f.a0 + (f.a1 - f.a0) * p);
    }
  }

  clear(): void {
    for (const f of this.items) {
      f.active = false;
      f.img.setVisible(false);
    }
  }
}

export class Fx {
  private readonly air: AnimPool;
  private readonly ground: AnimPool;
  /** Air smoke drifts BELOW the enemy bullets so it never hides them. */
  private readonly haze: AnimPool;
  /** Fireballs that must cover the player ship (its own death): DEPTH.fx. */
  private readonly over: AnimPool;
  private overTop = false;
  private readonly bits: Bit[] = [];
  private bitCursor = 0;
  private readonly glows: Bit[] = [];
  private glowCursor = 0;
  private readonly texts: FloatText[] = [];
  private textCursor = 0;
  private readonly decals: Decal[] = [];
  private decalCursor = 0;
  private readonly markers: Marker[] = [];
  private markerCursor = 0;
  private readonly vignette: Phaser.GameObjects.Image;
  private vignetteA = 0;
  private readonly flashImg: Phaser.GameObjects.Image;
  private flashA = 0;
  private flashDecay = 0;

  readonly animS: FrameAnim;
  readonly animM: FrameAnim;
  readonly animL: FrameAnim;
  readonly animSpark: FrameAnim;
  readonly animSmoke: FrameAnim;
  readonly animShock: FrameAnim;
  readonly animDebris: FrameAnim;
  readonly animMuzzle: FrameAnim;
  private readonly pixelKey: string;
  private readonly glowKey: string;
  private readonly scene: Phaser.Scene;

  constructor(private readonly w: World) {
    const scene = (this.scene = w.scene);
    this.animS = new FrameAnim(scene, ANIM.explosion_s, 'fx_explosion_s', 'blast', 22, false);
    this.animM = new FrameAnim(scene, ANIM.explosion_m, 'fx_explosion_m', 'blast', 20, false);
    this.animL = new FrameAnim(scene, ANIM.explosion_l, 'fx_explosion_l', 'blast', 18, false);
    this.animSpark = new FrameAnim(scene, ANIM.spark, 'fx_spark', 'chip', 24, false);
    this.animSmoke = new FrameAnim(scene, ANIM.smoke, 'fx_smoke', 'puff', 12, false);
    this.animShock = new FrameAnim(scene, ANIM.shockwave, 'fx_shockwave', 'ring', 20, false);
    this.animDebris = new FrameAnim(scene, ANIM.debris, 'fx_debris', 'chip', 14, true);
    this.animMuzzle = new FrameAnim(scene, ANIM.muzzle, 'fx_muzzle', 'glow', 30, false);
    this.pixelKey = texOr(scene, 'fx_pixel', 'chip');
    this.glowKey = scene.textures.exists('fx_glow') ? 'fx_glow' : fallbackTex(scene, 'glow');

    for (let i = 0; i < 28; i++) {
      const img = scene.add.image(-100, -100, TEX_CRATER).setDepth(DEPTH.doodads + 1).setVisible(false);
      this.decals.push(new Decal(img));
    }
    // Readability: smoke, glows and fireballs draw just UNDER the enemy bullets (above the
    // air units and the player shots); only sparks, debris, texts and overlays are above them.
    // caps as before; about a third is created up front, the rest on demand
    this.ground = new AnimPool(scene, 48, DEPTH.groundFx, 16);
    this.air = new AnimPool(scene, 110, DEPTH.enemyBullets - 0.5, 36);
    this.haze = new AnimPool(scene, 56, DEPTH.enemyBullets - 1, 16);
    this.over = new AnimPool(scene, 16, DEPTH.fx, 6);
    for (let i = 0; i < BIT_PREWARM; i++) this.growBit();
    for (let i = 0; i < GLOW_PREWARM; i++) this.growGlow();
    ensureFonts(scene);
    for (let i = 0; i < 14; i++) {
      const t = scene.add.bitmapText(-100, -100, FONT.s, '').setDepth(DEPTH.fx + 3).setOrigin(0.5).setVisible(false);
      this.texts.push(new FloatText(t));
    }
    // screen-space overlays: they do not follow the camera shake (scroll)
    for (let i = 0; i < 10; i++) {
      const img = scene.add.image(-100, -100, TEX_CHEVRON).setDepth(DEPTH.fx + 2).setVisible(false);
      this.markers.push(new Marker(img));
    }
    this.vignette = scene.add.image(0, 0, TEX_VIGNETTE).setOrigin(0).setDepth(DEPTH.fx + 4).setAlpha(0).setVisible(false)
      .setScrollFactor(0);
    this.flashImg = scene.add.image(0, 0, TEX_PX).setOrigin(0).setDisplaySize(PLAY_W, H).setDepth(DEPTH.fx + 5)
      .setAlpha(0).setVisible(false).setScrollFactor(0);
  }

  private explosionAnim(size: 's' | 'm' | 'l'): FrameAnim {
    return size === 'l' ? this.animL : size === 'm' ? this.animM : this.animS;
  }

  private band(ground: boolean): AnimPool {
    return ground ? this.ground : this.overTop ? this.over : this.air;
  }

  /** Full explosion drawn ABOVE the player ship (its own destruction). */
  explodeOver(x: number, y: number, size: 's' | 'm' | 'l'): void {
    this.overTop = true;
    this.explode(x, y, size);
    this.overTop = false;
  }

  /** Single explosion sprite drawn ABOVE the player ship. */
  blastOver(x: number, y: number, size: 's' | 'm' | 'l', scale = 1): void {
    this.overTop = true;
    this.blast(x, y, size, scale);
    this.overTop = false;
  }

  /** Single explosion sprite (no extras). delayMs postpones it (chains). */
  blast(x: number, y: number, size: 's' | 'm' | 'l', scale = 1, delayMs = 0, ground = false, vx = 0, vy = 0): void {
    const f = this.band(ground).take();
    const anim = this.explosionAnim(size);
    const r = this.w.fxRng;
    f.active = true;
    f.anim = anim;
    f.age = 0;
    f.delay = delayMs;
    f.lastIdx = -1;
    f.vx = vx;
    f.vy = vy;
    f.scroll = ground ? 1 : 0;
    f.s0 = f.s1 = scale;
    f.a0 = f.a1 = 1;
    const img = f.img;
    anim.apply(img, 0);
    img.setPosition(x, y).setScale(scale).setAlpha(1).setBlendMode(Phaser.BlendModes.NORMAL)
      .setAngle(Math.floor(r() * 4) * 90).setFlipX(r() < 0.5).setTint(0xffffff).setVisible(delayMs <= 0);
  }

  /**
   * A full explosion "event" by size: fireball(s), glow, hot pixels, debris, smoke,
   * shockwave for large ones. vx/vy = inherited velocity of the destroyed object.
   */
  explode(x: number, y: number, size: 's' | 'm' | 'l', ground = false, vx = 0, vy = 0): void {
    const r = this.w.fxRng;
    const ivx = vx * 0.25, ivy = vy * 0.25;
    if (size === 's') {
      this.blast(x, y, 's', 1, 0, ground, ivx, ivy);
      this.glow(x, y, 0xff9a40, 1.1, 200);
      this.sparks(x, y, 6, 90);
      this.debris(x, y, 2, 70, ground);
    } else if (size === 'm') {
      this.blast(x, y, 'm', 1, 0, ground, ivx, ivy);
      this.blast(x + (r() - 0.5) * 18, y + (r() - 0.5) * 18, 's', 1, 70 + r() * 60, ground, ivx, ivy);
      this.blast(x + (r() - 0.5) * 22, y + (r() - 0.5) * 22, 's', 0.9, 150 + r() * 80, ground, ivx, ivy);
      this.glow(x, y, 0xffa040, 2, 260);
      this.sparks(x, y, 12, 130);
      this.debris(x, y, 5, 110, ground);
      this.smoke(x, y, ground, 120);
    } else {
      this.blast(x, y, 'l', 1, 0, ground, ivx, ivy);
      for (let i = 0; i < 4; i++) {
        const a = r() * Math.PI * 2, d = 14 + r() * 18;
        this.blast(x + Math.cos(a) * d, y + Math.sin(a) * d, i % 2 === 0 ? 'm' : 's', 1, 80 + i * 90 + r() * 50, ground, ivx, ivy);
      }
      this.shockwave(x, y, 1.6, ground);
      this.glow(x, y, 0xffb050, 3.4, 380);
      this.sparks(x, y, 22, 180);
      this.debris(x, y, 10, 150, ground);
      this.smoke(x - 8, y, ground, 160);
      this.smoke(x + 8, y + 4, ground, 260);
    }
    if (ground) this.crater(x, y, size === 'l' ? 1.8 : size === 'm' ? 1.3 : 0.8);
  }

  /** Expanding ring (additive). */
  shockwave(x: number, y: number, scale = 1, ground = false): void {
    const f = this.band(ground).take();
    f.active = true;
    f.anim = this.animShock;
    f.age = 0;
    f.delay = 0;
    f.lastIdx = -1;
    f.vx = f.vy = 0;
    f.scroll = ground ? 1 : 0;
    f.s0 = scale * 0.6;
    f.s1 = scale * 1.3;
    f.a0 = 1;
    f.a1 = 0.2;
    this.animShock.apply(f.img, 0);
    f.img.setPosition(x, y).setScale(f.s0).setAlpha(1).setAngle(0).setFlipX(false).setTint(0xffffff)
      .setBlendMode(Phaser.BlendModes.ADD).setVisible(true);
  }

  /** Drifting smoke puff (air smoke stays below the enemy bullets). */
  smoke(x: number, y: number, ground = false, delayMs = 0): void {
    const f = (ground ? this.ground : this.haze).take();
    const r = this.w.fxRng;
    f.active = true;
    f.anim = this.animSmoke;
    f.age = 0;
    f.delay = delayMs;
    f.lastIdx = -1;
    f.vx = (r() - 0.5) * 14;
    f.vy = ground ? -6 : -14 - r() * 10;
    f.scroll = ground ? 1 : 0.6;
    f.s0 = 0.8 + r() * 0.4;
    f.s1 = f.s0 * 1.6;
    f.a0 = 0.85;
    f.a1 = 0.1;
    this.animSmoke.apply(f.img, 0);
    f.img.setPosition(x, y).setScale(f.s0).setAlpha(f.a0).setAngle(Math.floor(r() * 4) * 90).setFlipX(r() < 0.5)
      .setTint(0xffffff).setBlendMode(Phaser.BlendModes.NORMAL).setVisible(delayMs <= 0);
  }

  /** Small animated spark sprite (impacts). */
  spark(x: number, y: number, tint = 0xffffff): void {
    const f = this.air.take();
    f.active = true;
    f.anim = this.animSpark;
    f.age = 0;
    f.delay = 0;
    f.lastIdx = -1;
    f.vx = f.vy = 0;
    f.scroll = 0;
    f.s0 = f.s1 = 1;
    f.a0 = f.a1 = 1;
    this.animSpark.apply(f.img, 0);
    f.img.setPosition(x, y).setScale(1).setAlpha(1).setAngle(Math.floor(this.w.fxRng() * 4) * 90).setFlipX(false)
      .setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setVisible(true);
  }

  /** Muzzle flash sprite. */
  muzzle(x: number, y: number, tint: number): void {
    const f = this.air.take();
    f.active = true;
    f.anim = this.animMuzzle;
    f.age = 0;
    f.delay = 0;
    f.lastIdx = -1;
    f.vx = f.vy = 0;
    f.scroll = 0;
    f.s0 = f.s1 = 1;
    f.a0 = f.a1 = 1;
    this.animMuzzle.apply(f.img, 0);
    f.img.setPosition(x, y).setScale(1).setAlpha(1).setAngle(180).setFlipX(false).setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD).setVisible(true);
  }

  private growBit(): Bit {
    const b = new Bit(this.scene.add.image(-100, -100, this.pixelKey).setDepth(DEPTH.fx + 1).setVisible(false));
    this.bits.push(b);
    return b;
  }

  private growGlow(): Bit {
    const b = new Bit(this.scene.add.image(-100, -100, this.glowKey).setDepth(DEPTH.enemyBullets - 0.6).setVisible(false)
      .setBlendMode(Phaser.BlendModes.ADD));
    this.glows.push(b);
    return b;
  }

  private takeBit(): Bit {
    const bits = this.bits;
    const i = freeIndex(bits, this.bitCursor);
    if (i >= 0) {
      this.bitCursor = (i + 1) % bits.length;
      return bits[i];
    }
    if (bits.length < BIT_CAP) return this.growBit();
    const b = bits[this.bitCursor];
    this.bitCursor = (this.bitCursor + 1) % bits.length;
    return b;
  }

  /** Hot pixel particles flying outward (fire colours, or a given tint). */
  sparks(x: number, y: number, n: number, speed: number, tint = -1): void {
    const r = this.w.fxRng;
    for (let i = 0; i < n; i++) {
      const b = this.takeBit();
      const a = r() * Math.PI * 2, s = speed * (0.35 + r() * 0.9);
      b.active = true;
      b.age = 0;
      b.life = 220 + r() * 320;
      b.vx = Math.cos(a) * s;
      b.vy = Math.sin(a) * s;
      b.drag = 3.2;
      b.spin = 0;
      b.a0 = 1;
      b.s0 = r() < 0.3 ? 1.5 : 1;
      b.s1 = 0.5;
      b.scroll = 0;
      b.anim = null;
      b.img.setTexture(this.pixelKey).setPosition(x, y).setScale(b.s0).setAlpha(1).setAngle(0)
        .setTint(tint >= 0 ? tint : FIRE_TINTS[(r() * FIRE_TINTS.length) | 0]).setBlendMode(Phaser.BlendModes.ADD).setVisible(true);
    }
  }

  /** Tumbling metal debris. */
  debris(x: number, y: number, n: number, speed: number, ground = false): void {
    const r = this.w.fxRng;
    const anim = this.animDebris;
    for (let i = 0; i < n; i++) {
      const b = this.takeBit();
      const a = r() * Math.PI * 2, s = speed * (0.4 + r() * 0.8);
      b.active = true;
      b.age = 0;
      b.life = 500 + r() * 600;
      b.vx = Math.cos(a) * s;
      b.vy = Math.sin(a) * s;
      b.drag = 1.6;
      b.spin = (r() - 0.5) * 12;
      b.a0 = 1;
      b.s0 = 0.8 + r() * 0.6;
      b.s1 = b.s0 * 0.8;
      b.scroll = ground ? 1 : 0;
      b.anim = anim;
      b.lastIdx = -1;
      anim.apply(b.img, 0);
      b.img.setPosition(x, y).setScale(b.s0).setAlpha(1).setAngle(0).setTint(0xffffff)
        .setBlendMode(Phaser.BlendModes.NORMAL).setVisible(true);
    }
  }

  /** Short-lived smoke pixel left behind by missiles. */
  trail(x: number, y: number): void {
    const b = this.takeBit();
    b.active = true;
    b.age = 0;
    b.life = 260;
    b.vx = (this.w.fxRng() - 0.5) * 10;
    b.vy = -8;
    b.drag = 0;
    b.spin = 0;
    b.a0 = 0.8;
    b.s0 = 1.5;
    b.s1 = 2.5;
    b.scroll = 0;
    b.anim = null;
    b.img.setTexture(this.pixelKey).setPosition(x, y).setScale(b.s0).setAlpha(b.a0).setAngle(0).setTint(0xb0a8a0)
      .setBlendMode(Phaser.BlendModes.NORMAL).setVisible(true);
  }

  /** Small impact burst at a hit point. */
  hit(x: number, y: number, tint: number): void {
    this.sparks(x, y, 2, 70, tint);
    if (this.w.fxRng() < 0.35) this.spark(x, y, 0xffffff);
  }

  /** Additive radial glow flash. */
  glow(x: number, y: number, tint: number, scale: number, ms: number): void {
    const glows = this.glows;
    const i = freeIndex(glows, this.glowCursor);
    let b: Bit;
    if (i >= 0) {
      b = glows[i];
      this.glowCursor = (i + 1) % glows.length;
    } else if (glows.length < GLOW_CAP) {
      b = this.growGlow();
    } else {
      // all busy at the cap: reuse the one at the cursor (as before: the cursor does not move)
      b = glows[this.glowCursor];
    }
    b.active = true;
    b.age = 0;
    b.life = ms;
    b.vx = b.vy = 0;
    b.drag = 0;
    b.spin = 0;
    b.a0 = 0.9;
    b.s0 = scale * 0.7;
    b.s1 = scale * 1.25;
    b.scroll = 0;
    b.img.setPosition(x, y).setScale(b.s0).setAlpha(b.a0).setTint(tint).setVisible(true);
  }

  /** Floating text (score / pickup feedback). */
  text(x: number, y: number, str: string, tint: number, life = 900): void {
    const t = this.texts[this.textCursor];
    this.textCursor = (this.textCursor + 1) % this.texts.length;
    t.active = true;
    t.age = 0;
    t.life = life;
    t.y0 = y;
    t.txt.setText(str).setPosition(Math.round(Phaser.Math.Clamp(x, 16, PLAY_W - 16)), Math.round(y)).setTint(tint)
      .setAlpha(1).setVisible(true);
  }

  /**
   * Blinking up-chevron at the bottom edge above x: something is about to rise from below
   * (ms = warning time). Two stacked chevrons, bobbing upward.
   */
  edgeWarning(x: number, ms: number, tint = 0xff5a3c): void {
    const m = this.markers[this.markerCursor];
    this.markerCursor = (this.markerCursor + 1) % this.markers.length;
    m.active = true;
    m.age = 0;
    m.life = ms;
    m.y0 = H - 14;
    m.tint = tint;
    m.img.setPosition(Math.round(Phaser.Math.Clamp(x, 12, PLAY_W - 12)), m.y0).setTint(tint).setAlpha(1).setScale(2).setVisible(true);
  }

  /** Scorch decal on the ground (scrolls with the terrain). */
  crater(x: number, y: number, scale: number): void {
    const d = this.decals[this.decalCursor];
    this.decalCursor = (this.decalCursor + 1) % this.decals.length;
    d.active = true;
    d.img.setPosition(x, y).setScale(scale).setAngle(Math.floor(this.w.fxRng() * 4) * 90).setAlpha(1).setVisible(true);
  }

  /** Red damage vignette. */
  vignettePulse(strength = 0.75): void {
    this.vignetteA = Math.max(this.vignetteA, strength);
    this.vignette.setAlpha(this.vignetteA).setVisible(true);
  }

  /** Full playfield flash (white by default). decay = alpha lost per second. */
  flashScreen(color = 0xffffff, alpha = 0.9, decayPerSec = 2.2): void {
    this.flashA = Math.max(this.flashA, alpha);
    this.flashDecay = decayPerSec;
    this.flashImg.setTint(color).setAlpha(this.flashA).setVisible(true);
  }

  update(dtMs: number): void {
    const dts = dtMs / 1000;
    const scroll = this.w.scrollSpeed;
    this.ground.update(dtMs, scroll);
    this.haze.update(dtMs, scroll);
    this.air.update(dtMs, scroll);
    this.over.update(dtMs, scroll);
    for (let k = 0; k < this.bits.length; k++) {
      const b = this.bits[k];
      if (!b.active) continue;
      b.age += dtMs;
      if (b.age >= b.life) {
        b.active = false;
        b.img.setVisible(false);
        continue;
      }
      const damp = Math.max(0, 1 - b.drag * dts);
      b.vx *= damp;
      b.vy *= damp;
      const img = b.img;
      img.x += b.vx * dts;
      img.y += (b.vy + b.scroll * scroll) * dts;
      const p = b.age / b.life;
      img.setAlpha(b.a0 * (1 - p * p));
      if (b.s0 !== b.s1) img.setScale(b.s0 + (b.s1 - b.s0) * p);
      if (b.spin !== 0) img.rotation += b.spin * dts;
      if (b.anim) {
        const idx = b.anim.index(b.age);
        if (idx >= 0 && idx !== b.lastIdx) {
          b.anim.apply(img, idx);
          b.lastIdx = idx;
        }
      }
    }
    for (let k = 0; k < this.glows.length; k++) {
      const b = this.glows[k];
      if (!b.active) continue;
      b.age += dtMs;
      if (b.age >= b.life) {
        b.active = false;
        b.img.setVisible(false);
        continue;
      }
      const p = b.age / b.life;
      b.img.setAlpha(b.a0 * (1 - p)).setScale(b.s0 + (b.s1 - b.s0) * p);
    }
    for (let k = 0; k < this.texts.length; k++) {
      const t = this.texts[k];
      if (!t.active) continue;
      t.age += dtMs;
      if (t.age >= t.life) {
        t.active = false;
        t.txt.setVisible(false);
        continue;
      }
      const p = t.age / t.life;
      t.txt.y = Math.round(t.y0 - 22 * Math.sqrt(p));
      t.txt.setAlpha(p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3);
    }
    for (let k = 0; k < this.markers.length; k++) {
      const m = this.markers[k];
      if (!m.active) continue;
      m.age += dtMs;
      if (m.age >= m.life) {
        m.active = false;
        m.img.setVisible(false);
        continue;
      }
      const ph = (m.age % 240) / 240;
      const on = Math.floor(m.age / 120) % 2 === 0;
      m.img.y = Math.round(m.y0 - ph * 6);
      m.img.setAlpha(on ? 1 : 0.5).setTint(on ? m.tint : 0xffe070);
    }
    for (let k = 0; k < this.decals.length; k++) {
      const d = this.decals[k];
      if (!d.active) continue;
      d.img.y += scroll * dts;
      if (d.img.y > H + 30) {
        d.active = false;
        d.img.setVisible(false);
      }
    }
    if (this.vignetteA > 0) {
      this.vignetteA = Math.max(0, this.vignetteA - dts * 2.4);
      this.vignette.setAlpha(this.vignetteA);
      if (this.vignetteA <= 0) this.vignette.setVisible(false);
    }
    if (this.flashA > 0) {
      this.flashA = Math.max(0, this.flashA - dts * this.flashDecay);
      this.flashImg.setAlpha(this.flashA);
      if (this.flashA <= 0) this.flashImg.setVisible(false);
    }
  }

  /** Remove every running effect (scene restart / level end). */
  clear(): void {
    this.air.clear();
    this.ground.clear();
    this.haze.clear();
    this.over.clear();
    for (const b of this.bits) { b.active = false; b.img.setVisible(false); }
    for (const b of this.glows) { b.active = false; b.img.setVisible(false); }
  }
}
