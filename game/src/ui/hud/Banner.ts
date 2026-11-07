// =====================================================================================
//  BANNER — big centred animated message over the playfield (FONT.l, sub-text FONT.m).
//  - Warning style (text contains WARN / ALERT / DANGER): red band, fx_warning hazard
//    stripes scrolling in opposite directions above and below, text + stripes blinking.
//  - Info style (anything else, e.g. STAGE CLEAR): band opens, text wipes in from the
//    centre, a light sweep runs across the letters, sub-text fades in.
//  Auto-hides after `ms`. Calling show() again replaces the current banner.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS } from '../../config';
import { PART } from './art';
import { brightMask, renderText, type HudFonts } from './glyphs';
import { BAND_H, BAND_H_SHORT, BAND_W, type HudLayout } from './layout';

const OPEN_MS = 170;
const WIPE_FROM = 60;
const WIPE_MS = 260;
const SHINE_FROM = 340;
const SHINE_MS = 520;
const CLOSE_MS = 230;
const BLINK_ON = 260;
const BLINK_OFF = 150;
const STRIPE_SPEED = 0.05; // px per ms
const TEXT_H = 20;
const SUB_H = 12;

const WARN_RE = /WARN|ALERT|DANGER/;

export class Banner {
  private readonly c: Phaser.GameObjects.Container;
  private readonly band: Phaser.GameObjects.Image;
  private readonly stripeT: Phaser.GameObjects.Image;
  private readonly stripeB: Phaser.GameObjects.Image;
  private readonly main: Phaser.GameObjects.Image;
  private readonly shineWide: Phaser.GameObjects.Image;
  private readonly shineCore: Phaser.GameObjects.Image;
  private readonly sub: Phaser.GameObjects.Image;
  private readonly mainTex: Phaser.Textures.CanvasTexture;
  private readonly shineTex: Phaser.Textures.CanvasTexture;
  private readonly subTex: Phaser.Textures.CanvasTexture;
  private active = false;
  private warn = false;
  private hasSub = false;
  private t = 0;
  private dur = 1800;
  private textX = 0;
  private textW = 0;
  private bandH = BAND_H;
  // last applied values (touch objects only on change)
  private lastStripe = -1;
  private lastWipe = -1;
  private lastShine = -2;
  private lastOpen = -1;
  private lastAlpha = -1;
  private lastBlink = -1;
  private lastSubA = -1;

  constructor(scene: Phaser.Scene, root: Phaser.GameObjects.Container, partsKey: string, keyPrefix: string, L: HudLayout, private readonly fonts: HudFonts) {
    this.c = scene.add.container(Math.round(BAND_W / 2), L.bannerY).setScrollFactor(0).setVisible(false);
    root.add(this.c);
    const mk = (suffix: string, w: number, h: number) => {
      const tex = scene.textures.createCanvas(`${keyPrefix}${suffix}`, w, h);
      if (!tex) throw new Error(`[hud] cannot create canvas texture ${keyPrefix}${suffix}`);
      return tex;
    };
    this.mainTex = mk('bnMain', BAND_W, TEXT_H);
    this.shineTex = mk('bnShine', BAND_W, TEXT_H);
    this.subTex = mk('bnSub', BAND_W, SUB_H);
    const half = Math.round(BAND_W / 2);
    this.band = scene.add.image(0, 0, partsKey, PART.bandInfo).setOrigin(0.5).setScrollFactor(0);
    this.stripeT = scene.add.image(-half, 0, partsKey, PART.stripe).setOrigin(0).setScrollFactor(0).setVisible(false);
    this.stripeB = scene.add.image(-half, 0, partsKey, PART.stripe).setOrigin(0).setScrollFactor(0).setVisible(false);
    this.main = scene.add.image(-half, 0, this.mainTex.key).setOrigin(0).setScrollFactor(0);
    this.shineWide = scene.add.image(-half, 0, this.shineTex.key).setOrigin(0).setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.4).setVisible(false);
    this.shineCore = scene.add.image(-half, 0, this.shineTex.key).setOrigin(0).setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.95).setVisible(false);
    this.sub = scene.add.image(-half, 0, this.subTex.key).setOrigin(0).setScrollFactor(0);
    this.c.add([this.stripeT, this.stripeB, this.band, this.main, this.shineWide, this.shineCore, this.sub]);
  }

  get isActive(): boolean { return this.active; }

  /** Shows (or replaces) the banner. */
  show(text: string, sub: string | undefined, ms: number): void {
    const str = (text ?? '').toUpperCase();
    const subStr = (sub ?? '').toUpperCase();
    this.warn = WARN_RE.test(str);
    this.hasSub = subStr.length > 0;
    this.dur = Math.max(OPEN_MS + CLOSE_MS + 200, ms);
    this.t = 0;
    this.active = true;
    // main text: FONT.l when it fits, FONT.m otherwise
    const big = this.fonts.l.width(str) <= BAND_W - 16;
    const font = big ? this.fonts.l : this.fonts.m;
    const shown = big ? str : str.slice(0, Math.floor((BAND_W - 8) / this.fonts.m.cellW));
    const glyphs = renderText(font, shown, big ? {} : { tint: this.warn ? 0xffd0c8 : COLORS.text, outline: '#05040a' });
    this.textW = glyphs.width;
    this.textX = Math.max(0, Math.floor((BAND_W - glyphs.width) / 2));
    const ty = Math.max(0, Math.floor((TEXT_H - glyphs.height) / 2));
    const mctx = this.mainTex.getContext();
    mctx.clearRect(0, 0, BAND_W, TEXT_H);
    mctx.drawImage(glyphs, this.textX, ty);
    this.mainTex.refresh();
    const sctx = this.shineTex.getContext();
    sctx.clearRect(0, 0, BAND_W, TEXT_H);
    sctx.drawImage(brightMask(glyphs, 60), this.textX, ty);
    this.shineTex.refresh();
    const subCtx = this.subTex.getContext();
    subCtx.clearRect(0, 0, BAND_W, SUB_H);
    if (this.hasSub) {
      const maxChars = Math.floor((BAND_W - 8) / this.fonts.m.cellW);
      const sg = renderText(this.fonts.m, subStr.slice(0, maxChars), { tint: this.warn ? 0xffd060 : COLORS.teal, outline: '#05040a' });
      subCtx.drawImage(sg, Math.max(0, Math.floor((BAND_W - sg.width) / 2)), Math.max(0, Math.floor((SUB_H - sg.height) / 2)));
    }
    this.subTex.refresh();
    // geometry
    this.bandH = this.hasSub ? BAND_H : BAND_H_SHORT;
    const top = -Math.floor(this.bandH / 2);
    this.band.setFrame(this.warn ? (this.hasSub ? PART.bandWarn : PART.bandWarnShort) : (this.hasSub ? PART.bandInfo : PART.bandInfoShort));
    const mainY = this.hasSub ? top + 5 : top + Math.floor((this.bandH - TEXT_H) / 2);
    this.main.setY(mainY);
    this.shineWide.setY(mainY);
    this.shineCore.setY(mainY);
    this.sub.setY(mainY + TEXT_H + 1).setVisible(this.hasSub);
    this.stripeT.setY(top - 17).setVisible(this.warn);
    this.stripeB.setY(top + this.bandH + 1).setVisible(this.warn);
    this.shineWide.setVisible(false);
    this.shineCore.setVisible(false);
    this.lastStripe = this.lastWipe = this.lastOpen = this.lastAlpha = this.lastBlink = this.lastSubA = -1;
    this.lastShine = -2;
    this.c.setVisible(true);
    this.apply();
  }

  /** Hides immediately. */
  hide(): void {
    this.active = false;
    this.c.setVisible(false);
  }

  tick(dt: number): void {
    if (!this.active) return;
    this.t += dt;
    if (this.t >= this.dur) { this.hide(); return; }
    this.apply();
  }

  private apply(): void {
    const t = this.t;
    const closeT = this.dur - CLOSE_MS;
    // band open / close (scaleY), global alpha while closing
    let open = Math.min(1, t / OPEN_MS);
    open = 1 - (1 - open) * (1 - open);
    let alpha = 1;
    if (t > closeT) {
      const p = Math.min(1, (t - closeT) / CLOSE_MS);
      open = 1 - p * p;
      alpha = 1 - p;
    }
    const oq = Math.round(open * 32);
    if (oq !== this.lastOpen) { this.lastOpen = oq; this.band.setScale(1, Math.max(0.03, oq / 32)); }
    // text wipe from the centre
    const wp = Math.min(1, Math.max(0, (t - WIPE_FROM) / WIPE_MS));
    const vis = Math.round(this.textW * (1 - (1 - wp) * (1 - wp)));
    if (vis !== this.lastWipe) {
      this.lastWipe = vis;
      if (vis <= 0) this.main.setVisible(false);
      else this.main.setVisible(true).setCrop(this.textX + Math.floor((this.textW - vis) / 2), 0, vis, TEXT_H);
    }
    // blink (warning) / alpha (closing)
    let textA = alpha;
    let stripeA = alpha * Math.min(1, t / OPEN_MS);
    if (this.warn) {
      const phase = t % (BLINK_ON + BLINK_OFF);
      const on = phase < BLINK_ON ? 1 : 0;
      textA *= on ? 1 : 0.22;
      stripeA *= on ? 1 : 0.5;
    }
    const aq = Math.round(textA * 32) * 64 + Math.round(stripeA * 32);
    if (aq !== this.lastAlpha) {
      this.lastAlpha = aq;
      this.main.setAlpha(Math.round(textA * 32) / 32);
      this.band.setAlpha(Math.max(0.15, alpha));
      if (this.warn) { this.stripeT.setAlpha(Math.round(stripeA * 32) / 32); this.stripeB.setAlpha(Math.round(stripeA * 32) / 32); }
    }
    if (this.hasSub) {
      const sa = Math.round(Math.min(1, Math.max(0, (t - 200) / 220)) * alpha * 32);
      if (sa !== this.lastSubA) { this.lastSubA = sa; this.sub.setAlpha(sa / 32); }
    }
    // scrolling hazard stripes
    if (this.warn) {
      const off = Math.floor(t * STRIPE_SPEED) % 64;
      if (off !== this.lastStripe) {
        this.lastStripe = off;
        const half = Math.round(BAND_W / 2);
        this.stripeT.setCrop(64 - off, 0, BAND_W, 16).setX(-half - (64 - off));
        this.stripeB.setCrop(off, 0, BAND_W, 16).setX(-half - off);
      }
    } else {
      // light sweep across the letters (repeats every 1.6 s on long banners)
      const st = t - SHINE_FROM;
      const cycle = st >= 0 ? st % 1600 : -1;
      let sx = -2;
      if (cycle >= 0 && cycle < SHINE_MS && t < closeT) sx = Math.round(this.textX - 12 + ((this.textW + 24) * cycle) / SHINE_MS);
      if (sx !== this.lastShine) {
        this.lastShine = sx;
        if (sx === -2) {
          this.shineWide.setVisible(false);
          this.shineCore.setVisible(false);
        } else {
          const w0 = Math.max(0, sx - 6);
          this.shineWide.setVisible(true).setCrop(w0, 0, 12, TEXT_H);
          this.shineCore.setVisible(true).setCrop(Math.max(0, sx - 2), 0, 4, TEXT_H);
        }
      }
    }
  }
}
