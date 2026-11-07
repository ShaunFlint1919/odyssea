// =====================================================================================
//  HUD CONTROLLER — implements HudApi for the Game scene.
//
//  Rendering strategy
//  - The whole static panel is ONE pre-composed canvas texture; every dynamic element is an
//    Image from one parts atlas or a small canvas "strip" texture (LCD text, boss name,
//    banner). No BitmapText, no masks, no Graphics: the HUD batches in the Multi pipeline.
//  - update(model) only stores targets and diffs strings / integers. A POST_UPDATE listener
//    animates (smoothing, ghost trails, rolling counters, blinks, marquee, banner, boss bar)
//    and touches a game object only when its rounded displayed value changes. No per-frame
//    allocations (no strings, closures, arrays or objects in the hot path).
//
//  Camera shake: all HUD objects live in one root container (depth DEPTH.hud, scrollFactor 0).
//  Phaser's camera shake translates the camera matrix by shakeEffect._offsetX/Y (computed in
//  the scene UPDATE event); in POST_UPDATE the root is moved by the opposite offset, so the
//  HUD stays rock-steady while the world shakes. Chosen over a second camera because camera
//  fades / flashes still cover the HUD and no world object has to be ignored by a HUD camera.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, DEPTH, MAX_POWER } from '../../config';
import type { HudApi, HudModel } from '../../game/contracts';
import { HUD_EVENTS } from '../../game/contracts';
import { audio } from '../../audio';
import { DIGIT_M, DIGIT_S, PART, buildParts, legendTextRect, paintPanel } from './art';
import { Banner } from './Banner';
import { BossBar } from './BossBar';
import { loadHudFonts, type HudFonts } from './glyphs';
import { PIP_STRIDE, computeLayout, type HudLayout, type Rect } from './layout';
import {
  AlphaCache, Blink, DigitRow, HCrop, Marquee, Pulse, Rolling, Smooth, Trail, VCrop, clamp01, type LcdStyle,
} from './widgets';

type Img = Phaser.GameObjects.Image;

const LCD_ON: LcdStyle = { color: COLORS.teal, halo: COLORS.teal, haloAlpha: 0.22 };
const LCD_OFF: LcdStyle = { color: 0x1f6f66 };
const LEGEND_COLORS: Record<string, number> = {
  ENERGY: 0xffe27a, SHD: 0x8cc8ff, ARM: 0xffa070, FRONT: 0xaaa4c4, REAR: 0xc8c2e0, DRONES: 0xaaa4c4,
};
const ARMOR_LOW = 0.25;
const ENERGY_EMPTY = 0.06;

const ratio = (v: number, max: number): number => (max > 0 ? clamp01(v / max) : 0);
const pipsPx = (p: number): number => (p <= 0 ? 0 : p * PIP_STRIDE - 1);

let instanceSeq = 0;

/** The in-game HUD. Create with createHud(scene) (src/ui/Hud.ts). */
export class HudController implements HudApi {
  private readonly scene: Phaser.Scene;
  private readonly L: HudLayout;
  private readonly fonts: HudFonts;
  private readonly root: Phaser.GameObjects.Container;
  private readonly texKeys: string[] = [];
  private readonly parts: string;
  private dead = false;
  private seen = false;

  // gauges
  private readonly energy = new Smooth(75);
  private readonly shield = new Trail(140, 340, 0.75);
  private readonly armor = new Trail(140, 360, 0.6);
  private readonly eFill: VCrop;
  private readonly sFill: VCrop;
  private readonly sGhost: VCrop;
  private readonly aFill: VCrop;
  private readonly aGhost: VCrop;
  private readonly eFlash: AlphaCache;
  private readonly sFlash: AlphaCache;
  private readonly aFlash: AlphaCache;
  private readonly eEmpty: AlphaCache;
  private readonly ePulse = new Pulse(260);
  private readonly sPulse = new Pulse(240);
  private readonly aPulse = new Pulse(260);
  private readonly eBlink = new Blink(170, 150);
  private readonly aBlink = new Blink(210, 190);
  private readonly eLegendRed: Img;
  private readonly aLegendRed: Img;
  private readonly aFillImg: Img;
  private energyLow = false;
  private armorLow = false;
  private readonly shieldNum: DigitRow;
  private readonly armorNum: DigitRow;

  // progress
  private readonly prog: HCrop;
  private readonly progHead: Img;
  private lastProg = -1;

  // guns
  private readonly lcd: Marquee;
  private readonly frontName: Marquee;
  private readonly rearName: Marquee;
  private readonly sideL: Marquee;
  private readonly sideR: Marquee;
  private readonly frontPips: HCrop;
  private readonly rearPips: HCrop;
  private readonly frontPipFlash: AlphaCache;
  private readonly rearPipFlash: AlphaCache;
  private readonly fpPulse = new Pulse(380);
  private readonly rpPulse = new Pulse(380);
  private readonly lampLit: Img;
  private readonly lampFlash: AlphaCache;
  private readonly lampPulse = new Pulse(300);
  private readonly rearDim: Img;
  private readonly rearGlow: AlphaCache;
  private readonly rearPress = new Pulse(260);
  private readonly pausePressed: Img;
  private pausePressMs = 0;
  private lastLevel: string | null = null;
  private lastFront: string | null = null;
  private lastFrontPow = -1;
  private lastRear: string | null | undefined = undefined;
  private lastRearPow = -1;
  private lastMode = -1;
  private lastSkL: string | null | undefined = undefined;
  private lastSkR: string | null | undefined = undefined;
  private rearEnabled = false;

  // score / credits
  private readonly score: DigitRow;
  private readonly credits: DigitRow;
  private readonly scoreRoll = new Rolling();
  private readonly credRoll = new Rolling();
  private readonly credC: Phaser.GameObjects.Container;
  private readonly pop = new Pulse(230);
  private lastPop = -1;

  // panel edge damage glow
  private readonly edgeL: AlphaCache;
  private readonly edgeR: AlphaCache;
  private readonly edgePulse = new Pulse(340);

  private readonly boss: BossBar;
  private readonly banner: Banner;

  // camera-shake compensation
  private lastOx = 0;
  private lastOy = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const id = ++instanceSeq;
    const prefix = `__hud${id}_`;
    this.L = computeLayout(scene.scale.gameSize.height);
    const L = this.L;
    this.fonts = loadHudFonts(scene);
    const f = this.fonts;

    // ---- textures (composed once)
    const panelKey = `${prefix}panel`;
    if (scene.textures.exists(panelKey)) scene.textures.remove(panelKey);
    scene.textures.addCanvas(panelKey, paintPanel(scene, L, f, LEGEND_COLORS));
    this.parts = `${prefix}parts`;
    buildParts(scene, this.parts, L, f);
    this.texKeys.push(panelKey, this.parts);

    // ---- root container
    this.root = scene.add.container(0, 0).setDepth(DEPTH.hud).setScrollFactor(0);
    const R = this.root;
    const P = this.parts;
    const X = L.px;
    const img = (x: number, y: number, frame: string): Img => {
      const o = scene.add.image(x, y, P, frame).setOrigin(0).setScrollFactor(0);
      R.add(o);
      return o;
    };
    const strip = (suffix: string, w: number, h: number): Phaser.Textures.CanvasTexture => {
      const key = `${prefix}${suffix}`;
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const tex = scene.textures.createCanvas(key, w, h);
      if (!tex) throw new Error(`[hud] cannot create canvas texture ${key}`);
      this.texKeys.push(key);
      return tex;
    };
    const marquee = (suffix: string, w: number, win: Rect): Marquee => {
      const tex = strip(suffix, w, f.s.cellH + 2);
      const o = scene.add.image(X + win.x - 1, win.y - 1, tex.key).setOrigin(0).setScrollFactor(0).setVisible(false);
      R.add(o);
      return new Marquee(o, tex, f.s, { x: X + win.x, y: win.y, w: win.w, h: win.h });
    };

    R.add(scene.add.image(X, 0, panelKey).setOrigin(0).setScrollFactor(0));

    // pause button pressed state
    this.pausePressed = img(X + L.pause.x, L.pause.y, PART.pausePressed).setVisible(false);

    // level LCD + progress
    this.lcd = marquee('lcd', 768, L.lcdWin);
    this.prog = new HCrop(img(X + L.progIn.x, L.progIn.y, PART.progFill), L.progIn.w, L.progIn.h);
    this.progHead = img(X + L.progIn.x, L.progIn.y, PART.progHead).setVisible(false);

    // energy
    const eb = L.energyBar;
    this.eFill = new VCrop(img(X + eb.x, eb.y, PART.eFill), eb.w, eb.h);
    this.eEmpty = new AlphaCache(img(X + eb.x, eb.y, PART.eWhite).setTint(0xff2828));
    this.eFlash = new AlphaCache(img(X + eb.x, eb.y, PART.eWhite).setTint(0xfff6d0));
    const eLeg = legendTextRect(L.energy, f);
    this.eLegendRed = img(X + eLeg.x, eLeg.y, `leg_${L.energy.legend}`).setVisible(false);

    // front gun
    this.frontName = marquee('front', 512, L.frontWin);
    this.frontPips = new HCrop(img(X + L.frontPips.x, L.frontPips.y, PART.pips), L.frontPips.w, L.frontPips.h);
    this.frontPipFlash = new AlphaCache(img(X + L.frontPips.x, L.frontPips.y, PART.pipsWhite));

    // rear gun (touch button)
    this.rearName = marquee('rear', 512, L.rearWin);
    this.rearPips = new HCrop(img(X + L.rearPips.x, L.rearPips.y, PART.pips), L.rearPips.w, L.rearPips.h);
    this.rearPipFlash = new AlphaCache(img(X + L.rearPips.x, L.rearPips.y, PART.pipsWhite));
    this.lampLit = img(X + L.lampA.x - 1, L.lampA.y - 1, PART.lampA).setVisible(false);
    this.lampFlash = new AlphaCache(img(X + L.lampA.x, L.lampA.y, PART.lampWhite));
    const rb = L.rear.box;
    this.rearDim = img(X + rb.x, rb.y + 4, PART.px).setDisplaySize(rb.w, rb.h - 4).setTint(0x05040a).setAlpha(0.5);
    this.rearGlow = new AlphaCache(img(X + rb.x, rb.y + 4, PART.rearGlow));

    // drones
    this.sideL = marquee('skL', 7 * f.s.cellW + 4, L.sideWinL);
    this.sideR = marquee('skR', 7 * f.s.cellW + 4, L.sideWinR);

    // shield / armor
    const sb = L.shieldBar, ab = L.armorBar;
    this.sGhost = new VCrop(img(X + sb.x, sb.y, PART.gWhite).setTint(0xcfe8ff).setAlpha(0.8), sb.w, sb.h);
    this.sFill = new VCrop(img(X + sb.x, sb.y, PART.sFill), sb.w, sb.h);
    this.sFlash = new AlphaCache(img(X + sb.x, sb.y, PART.gWhite).setTint(0xe0f0ff));
    this.aGhost = new VCrop(img(X + ab.x, ab.y, PART.gWhite).setTint(0xffe2cc).setAlpha(0.8), ab.w, ab.h);
    this.aFillImg = img(X + ab.x, ab.y, PART.aFill);
    this.aFill = new VCrop(this.aFillImg, ab.w, ab.h);
    this.aFlash = new AlphaCache(img(X + ab.x, ab.y, PART.gWhite).setTint(0xffe8e0));
    const aLeg = legendTextRect(L.armor, f);
    this.aLegendRed = img(X + aLeg.x, aLeg.y, `leg_${L.armor.legend}`).setVisible(false);
    const sAdv = f.s.cellW;
    this.shieldNum = new DigitRow(scene, R, P, DIGIT_S, X + L.shieldNum.x, L.shieldNum.y, { maxDigits: 3, advance: sAdv, align: 'center', width: L.shieldNum.w, tint: 0xa8d4ff });
    this.armorNum = new DigitRow(scene, R, P, DIGIT_S, X + L.armorNum.x, L.armorNum.y, { maxDigits: 3, advance: sAdv, align: 'center', width: L.armorNum.w, tint: 0xffc4a0 });

    // panel edge damage glow (left seam + right edge)
    const H = L.height;
    this.edgeL = new AlphaCache(img(X, 0, PART.edgeRed).setDisplaySize(8, H));
    this.edgeR = new AlphaCache(img(X + L.pw, 0, PART.edgeRed).setDisplaySize(8, H).setFlipX(true).setOrigin(1, 0));

    // score / credits (playfield, bottom-left)
    this.score = new DigitRow(scene, R, P, DIGIT_M, L.score.x, L.score.y, { maxDigits: 8, advance: f.m.cellW, group: 3 });
    this.credC = scene.add.container(L.creditIcon.x + 5, L.creditIcon.y + 5).setScrollFactor(0);
    R.add(this.credC);
    this.credC.add(scene.add.image(-5, -5, P, PART.credIcon).setOrigin(0).setScrollFactor(0));
    this.credits = new DigitRow(scene, this.credC, P, DIGIT_M, L.credits.x - (L.creditIcon.x + 5), L.credits.y - (L.creditIcon.y + 5),
      { maxDigits: 7, advance: f.m.cellW, group: 3, tint: COLORS.gold });

    // boss bar + banner (above everything else on the playfield)
    this.boss = new BossBar(scene, R, P, `${prefix}boss`, L, f);
    this.texKeys.push(`${prefix}boss`);
    this.banner = new Banner(scene, R, P, prefix, L, f);
    this.texKeys.push(`${prefix}bnMain`, `${prefix}bnShine`, `${prefix}bnSub`);

    // ---- touch zones (inside the root so they follow the shake compensation)
    const zone = (r: Rect, handler: (p: Phaser.Input.Pointer, x: number, y: number, ev: Phaser.Types.Input.EventData) => void) => {
      const z = scene.add.zone(X + r.x, r.y, r.w, r.h).setOrigin(0).setScrollFactor(0).setInteractive({ useHandCursor: true });
      z.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, handler, this);
      R.add(z);
      return z;
    };
    zone(L.pauseHit, this.onPauseDown);
    zone(L.rearHit, this.onRearDown);

    // ---- initial (pre-model) state
    this.lcd.setText('-', LCD_OFF);
    this.frontName.setText('-', LCD_OFF);
    this.rearName.setText('NONE', LCD_OFF);
    this.sideL.setText('-', LCD_OFF);
    this.sideR.setText('-', LCD_OFF);
    this.score.set(0);
    this.credits.set(0);
    this.shieldNum.set(0);
    this.armorNum.set(0);

    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.tick, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  // ------------------------------------------------------------------------------ HudApi

  update(m: HudModel): void {
    if (this.dead) return;
    const first = !this.seen;
    this.seen = true;

    // gauges (targets only; animated in tick)
    this.energy.target = ratio(m.energy, m.energyMax);
    const sr = ratio(m.shield, m.shieldMax);
    const ar = ratio(m.armor, m.armorMax);
    if (this.shield.set(sr) > 0.004 && !first) this.sPulse.fire(0.75);
    if (this.armor.set(ar) > 0.004 && !first) this.aPulse.fire(0.8);
    this.armorLow = m.armorMax > 0 && ar < ARMOR_LOW;
    this.energyLow = this.energy.target < ENERGY_EMPTY;
    this.shieldNum.set(m.shield > 0 ? Math.ceil(m.shield - 0.01) : 0);
    this.armorNum.set(m.armor > 0 ? Math.ceil(m.armor - 0.01) : 0);

    // level name + progress
    if (m.levelName !== this.lastLevel) {
      this.lastLevel = m.levelName;
      this.lcd.setText(m.levelName || '-', m.levelName ? LCD_ON : LCD_OFF);
    }
    const pp = Math.round(clamp01(m.progress) * this.L.progIn.w);
    if (pp !== this.lastProg) {
      this.lastProg = pp;
      this.prog.set(pp);
      const hx = this.L.px + this.L.progIn.x + Math.min(this.L.progIn.w - 2, Math.max(0, pp - 2));
      this.progHead.setVisible(pp > 0 && pp < this.L.progIn.w).setX(hx);
    }

    // front gun
    if (m.frontName !== this.lastFront) {
      this.lastFront = m.frontName;
      this.frontName.setText(m.frontName || '-', m.frontName ? LCD_ON : LCD_OFF);
    }
    const fp = m.frontName ? Math.max(0, Math.min(MAX_POWER, Math.round(m.frontPower))) : 0;
    if (fp !== this.lastFrontPow) {
      if (!first && fp > this.lastFrontPow) this.fpPulse.fire(1);
      this.lastFrontPow = fp;
      this.frontPips.set(pipsPx(fp));
    }

    // rear gun
    if (m.rearName !== this.lastRear) {
      this.lastRear = m.rearName;
      this.rearEnabled = !!m.rearName;
      this.rearName.setText(m.rearName || 'NONE', m.rearName ? LCD_ON : LCD_OFF);
      this.rearDim.setVisible(!this.rearEnabled);
      this.lastMode = -1;
    }
    const rp = this.rearEnabled ? Math.max(0, Math.min(MAX_POWER, Math.round(m.rearPower))) : 0;
    if (rp !== this.lastRearPow) {
      if (!first && rp > this.lastRearPow && this.lastRearPow >= 0) this.rpPulse.fire(1);
      this.lastRearPow = rp;
      this.rearPips.set(pipsPx(rp));
    }
    const mode = this.rearEnabled ? (m.rearMode === 1 ? 1 : 0) : -2;
    if (mode !== this.lastMode) {
      const switched = this.lastMode >= 0 && mode >= 0;
      this.lastMode = mode;
      if (mode < 0) {
        this.lampLit.setVisible(false);
      } else {
        const lr = mode === 1 ? this.L.lampB : this.L.lampA;
        this.lampLit.setFrame(mode === 1 ? PART.lampB : PART.lampA).setPosition(this.L.px + lr.x - 1, lr.y - 1).setVisible(true);
        this.lampFlash.img.setPosition(this.L.px + lr.x, lr.y);
        if (switched) this.lampPulse.fire(1);
      }
    }

    // drones
    if (m.sidekickL !== this.lastSkL) {
      this.lastSkL = m.sidekickL;
      this.sideL.setText(shortName(m.sidekickL), m.sidekickL ? LCD_ON : LCD_OFF);
    }
    if (m.sidekickR !== this.lastSkR) {
      this.lastSkR = m.sidekickR;
      this.sideR.setText(shortName(m.sidekickR), m.sidekickR ? LCD_ON : LCD_OFF);
    }

    // score / credits
    const sc = m.score > 0 ? Math.floor(m.score) : 0;
    const cr = m.credits > 0 ? Math.floor(m.credits) : 0;
    if (first) {
      this.scoreRoll.snap(sc);
      this.credRoll.snap(cr);
      this.score.set(sc);
      this.credits.set(cr);
    } else {
      if (cr > this.credRoll.target) this.pop.fire(1);
      this.scoreRoll.target = sc;
      this.credRoll.target = cr;
    }

    this.boss.set(m.bossHp, m.bossName);
  }

  flash(kind: 'damage' | 'shield' | 'pickup' | 'energy'): void {
    if (this.dead) return;
    switch (kind) {
      case 'damage': this.aPulse.fire(1); this.edgePulse.fire(1); break;
      case 'shield': this.sPulse.fire(1); break;
      case 'pickup': this.pop.fire(1); break;
      case 'energy': this.ePulse.fire(1); break;
      default: break;
    }
  }

  showBanner(text: string, sub?: string, ms = 1800): void {
    if (this.dead) return;
    this.banner.show(text, sub, ms);
  }

  destroy(): void {
    if (this.dead) return;
    this.dead = true;
    const s = this.scene;
    s.events.off(Phaser.Scenes.Events.POST_UPDATE, this.tick, this);
    s.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.root.destroy();
    for (const k of this.texKeys) if (s.textures.exists(k)) s.textures.remove(k);
    this.texKeys.length = 0;
  }

  // ------------------------------------------------------------------------------ input

  private onPauseDown(_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData): void {
    ev.stopPropagation();
    if (this.dead) return;
    audio.unlock();
    this.pausePressMs = 170;
    this.pausePressed.setVisible(true);
    this.scene.events.emit(HUD_EVENTS.pause);
  }

  private onRearDown(_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData): void {
    ev.stopPropagation();
    if (this.dead) return;
    audio.unlock();
    if (!this.rearEnabled) return;
    this.rearPress.fire(1);
    this.scene.events.emit(HUD_EVENTS.rearToggle);
  }

  // ------------------------------------------------------------------------------ per frame

  private tick(_time: number, delta: number): void {
    if (this.dead) return;
    const dt = delta > 100 ? 100 : delta > 0 ? delta : 0;
    this.compensateShake();
    const L = this.L;

    // energy column (low-pass so rapid drain / refill stays readable)
    this.energy.tick(dt);
    this.eFill.set(Math.round(this.energy.value * L.energyBar.h));
    if (this.eBlink.tick(dt, this.seen && this.energyLow)) {
      this.eEmpty.set(this.eBlink.on ? 0.42 : 0);
      this.eLegendRed.setVisible(this.eBlink.on);
    }
    if (this.ePulse.tick(dt)) this.eFlash.set(this.ePulse.v * 0.8);

    // shield / armor
    this.shield.tick(dt);
    this.armor.tick(dt);
    const sh = L.shieldBar.h;
    this.sFill.set(Math.round(this.shield.shown * sh));
    this.sGhost.set(Math.round(this.shield.ghost * sh));
    this.aFill.set(Math.round(this.armor.shown * sh));
    this.aGhost.set(Math.round(this.armor.ghost * sh));
    if (this.sPulse.tick(dt)) this.sFlash.set(this.sPulse.v * 0.75);
    if (this.aPulse.tick(dt)) this.aFlash.set(this.aPulse.v * 0.8);
    if (this.aBlink.tick(dt, this.armorLow)) {
      if (this.aBlink.on) this.aFillImg.setTintFill(0xff3030);
      else this.aFillImg.clearTint();
      this.aLegendRed.setVisible(this.aBlink.on);
    }
    if (this.edgePulse.tick(dt)) {
      this.edgeL.set(this.edgePulse.v * 0.9);
      this.edgeR.set(this.edgePulse.v * 0.55);
    }

    // guns
    if (this.fpPulse.tick(dt)) this.frontPipFlash.set(this.fpPulse.v * 0.9);
    if (this.rpPulse.tick(dt)) this.rearPipFlash.set(this.rpPulse.v * 0.9);
    if (this.lampPulse.tick(dt)) this.lampFlash.set(this.lampPulse.v * 0.9);
    if (this.rearPress.tick(dt)) this.rearGlow.set(this.rearPress.v);
    if (this.pausePressMs > 0) {
      this.pausePressMs -= dt;
      if (this.pausePressMs <= 0) this.pausePressed.setVisible(false);
    }
    this.lcd.tick(dt);
    this.frontName.tick(dt);
    this.rearName.tick(dt);

    // counters
    if (this.scoreRoll.tick(dt)) this.score.set(this.scoreRoll.shown);
    if (this.credRoll.tick(dt)) this.credits.set(this.credRoll.shown);
    if (this.pop.tick(dt)) {
      const q = Math.round(this.pop.v * 16);
      if (q !== this.lastPop) {
        this.lastPop = q;
        const p = q / 16;
        this.credC.setScale(1 + 0.4 * p * p);
        this.credits.setTint(p > 0.45 ? 0xffffff : COLORS.gold);
      }
    }

    this.boss.tick(dt);
    this.banner.tick(dt);
  }

  /** Cancels the main camera's shake offset for the HUD (see header). */
  private compensateShake(): void {
    const cam = this.scene.cameras.main;
    let ox = 0, oy = 0;
    if (cam) {
      const fx = cam.shakeEffect as unknown as { isRunning: boolean; _offsetX: number; _offsetY: number } | undefined;
      if (fx && fx.isRunning) { ox = -(fx._offsetX || 0); oy = -(fx._offsetY || 0); }
    }
    if (ox !== this.lastOx || oy !== this.lastOy) {
      this.lastOx = ox;
      this.lastOy = oy;
      this.root.setPosition(ox, oy);
    }
  }
}

/** Short display name for the drones box: first word, upper case ('-' when empty). */
function shortName(name: string | null): string {
  if (!name) return '-';
  const w = name.trim().split(/\s+/)[0] ?? name;
  return w.toUpperCase();
}
