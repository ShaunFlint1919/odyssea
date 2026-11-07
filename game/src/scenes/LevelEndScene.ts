// =====================================================================================
//  LEVEL END — mission complete screen. Applies the LevelResult to the save exactly once,
//  then plays a skippable sequence: tally rows (kills, ratio, credits, score, time, bank),
//  a rank stamp, notices (record, NEW TRANSMISSION, unlocks, new gear) and, after a boss,
//  the "PLANET LIBERATED" flourish. CONTINUE -> Hangar, or the star chart (Map) after a planet.
//  Shared screen frame: header strip (no back arrow: back = skip / continue), status bar.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, SCENES } from '../config';
import { markSceneReady, setHookState } from '../debug';
import { ANIM, hullKey, planetKey } from '../art/keys';
import { HULL_MOUNTS } from '../art/player';
import type { Biome, LevelResult } from '../types';
import { audio } from '../audio';
import { haptic } from '../platform/haptics';
import { getSave } from '../state/save';
import { isCampaignComplete, itemsUnlockedBy } from '../state/progress';
import { LEVELS, PLANETS } from '../data';
import { fadeIn, fit, goto, onBack, panel, statusBar, text, wrapText, type StatusBarApi } from '../ui/kit';
import {
  Board, LAYOUT, MD, Sequence, applyOnce, badge, bottomButton, bottomButtonY, burst, cachedTexture, contentRect, demoResult, fmtInt,
  fmtTime, isLevelResult, isPlanetFinale, levelInfo, neonRule, normalizeResult, ringPulse, screenBackdrop, screenHeader, sectionLabel,
  type BoardRow, type SequenceStep,
} from '../ui/widgets';

const RANKS: { min: number; letter: string; color: number; note: string }[] = [
  { min: 0.95, letter: 'S', color: COLORS.gold, note: 'FLAWLESS SWEEP' },
  { min: 0.8, letter: 'A', color: COLORS.teal, note: 'SHARP SHOOTING' },
  { min: 0.6, letter: 'B', color: COLORS.accentLight, note: 'SOLID RUN' },
  { min: 0, letter: 'C', color: COLORS.textDim, note: 'TARGETS ESCAPED' },
];

interface Notice { text: string; color: number; icon?: string; badge?: string }

/** Max characters of a notice line (FONT.s, right of the rank box). */
const NOTICE_CHARS = 38;

export class LevelEndScene extends Phaser.Scene {
  private seq: Sequence | null = null;
  private target: string = SCENES.Hangar;
  private continueReady = false;
  private status!: StatusBarApi;

  constructor() {
    super(SCENES.LevelEnd);
  }

  create(data?: LevelResult): void {
    this.seq = null;
    this.continueReady = false;
    const real = isLevelResult(data);
    const raw = real ? data : demoResult(true);
    const result = normalizeResult(raw);
    const applied = applyOnce(raw, real);
    const info = levelInfo(result.levelId);
    const campaignDone = real && result.completed && isCampaignComplete();
    const planetDone = result.bossDefeated || isPlanetFinale(info);
    this.target = planetDone || campaignDone ? SCENES.Map : SCENES.Hangar;

    fadeIn(this, 220);
    const { width, height } = this.scale.gameSize;
    screenBackdrop(this, { stars: 1, speed: 16 });
    audio.music('victory');
    audio.sfx('level_clear');

    const tag = info.level && info.planet ? `${info.planet.name.toUpperCase()} ${info.level.index}` : '';
    screenHeader(this, 'MISSION COMPLETE', { right: tag, rightColor: COLORS.teal });
    this.status = statusBar(this, 'Tap to skip');
    const area = contentRect(this);
    const top = area.y;

    // ---- tally board
    const ratio = result.spawned > 0 ? Math.min(1, result.kills / result.spawned) : 1;
    const bonus = Math.max(0, applied.creditsAfter - applied.creditsBefore - result.creditsEarned);
    const rows: BoardRow[] = [
      { label: 'ENEMIES DESTROYED', value: result.kills, format: (n) => `${fmtInt(n)} / ${fmtInt(result.spawned)}` },
      { label: 'KILL RATIO', value: Math.round(ratio * 100), format: (n) => `${n}%` },
      { label: 'CREDITS COLLECTED', value: result.creditsEarned, color: COLORS.gold },
    ];
    if (bonus > 0) rows.push({ label: 'MISSION BONUS', value: bonus, color: COLORS.gold });
    rows.push({ label: 'SCORE', value: result.score, color: COLORS.text });
    rows.push({ label: 'MISSION TIME', value: Math.round(result.timeSeconds), format: fmtTime });
    const rowH = height >= 640 ? 22 : height >= 560 ? 20 : 18;
    const bankH = 24;
    const pad = 12;
    const labelH = 18;
    const ph = labelH + rows.length * rowH + 9 + bankH + 6;
    panel(this, area.x, top, area.w, ph, 'inset');
    sectionLabel(this, area.x + LAYOUT.pad, top + 7, fit(info.label, area.w - 2 * LAYOUT.pad - 24, 's'), area.w - 2 * LAYOUT.pad, MD.content, COLORS.teal);
    const board = new Board(this, area.x + pad, top + labelH, area.w - 2 * pad, rows, rowH, 'm');
    const sepY = top + labelH + board.height + 4;
    this.add.rectangle(area.x + pad, sepY, area.w - 2 * pad, 1, COLORS.panelLight, 0.9).setOrigin(0);
    const bank = new Board(this, area.x + pad, sepY + 4, area.w - 2 * pad, [
      { label: 'CREDITS BANKED', value: applied.creditsAfter, from: applied.creditsBefore, color: COLORS.gold, labelColor: COLORS.text, icon: 'ui_icon_credits' },
    ], bankH, 'm');

    // ---- rank + notices
    const rank = RANKS.find((r) => ratio >= r.min) ?? RANKS[RANKS.length - 1];
    const ry = top + ph + LAYOUT.gap;
    const rankBox = this.add.container(area.x, ry);
    rankBox.add(panel(this, 0, 0, 64, 64, 'raised'));
    rankBox.add(text(this, 32, 8, 'RANK', { size: 's', color: COLORS.textDim, originX: 0.5 }));
    const letter = text(this, 32, 38, rank.letter, { size: 'm', color: rank.color, originX: 0.5, originY: 0.5 }).setScale(3);
    rankBox.add(letter);
    rankBox.setAlpha(0);

    const nextId = getSave().currentLevel;
    const flourish = planetDone && (result.bossDefeated || campaignDone);
    const showCard = !flourish && real && !!nextId && nextId !== result.levelId && LEVELS.some((l) => l.id === nextId);
    const notices = this.buildNotices(result, applied, rank.note, showCard);
    const nx = area.x + 64 + 10;
    const noticeObjs: Phaser.GameObjects.Container[] = notices.map((n, i) => {
      const c = this.add.container(nx, ry + 6 + i * 15);
      let tx = 0;
      if (n.icon && this.textures.exists(n.icon)) { c.add(this.add.image(0, 5, n.icon).setOrigin(0, 0.5)); tx = 18; }
      const t = text(this, tx, 5, n.text, { size: 's', color: n.color, originY: 0.5 });
      c.add(t);
      if (n.badge) c.add(badge(this, tx + t.width + 5, 5, n.badge, COLORS.accent));
      c.setAlpha(0);
      return c;
    });

    // ---- free space between the notices and the CONTINUE button: the flourish band or the
    // UP NEXT card sit just above the button; the player's ship takes the room left above them
    const freeTop = ry + Math.max(64, 6 + notices.length * 15) + LAYOUT.gap;
    const freeBottom = bottomButtonY(this) - LAYOUT.gap;
    let shipBottom = freeBottom;
    const bandY = Math.round(Math.max(freeTop, freeBottom - 52 - 6));
    if (flourish) shipBottom = bandY - 8;
    const card = showCard ? this.upNextCard(nextId, width) : null;
    if (card) {
      const ch = card.getData('h') as number;
      if (freeBottom - freeTop >= ch) {
        card.setY(Math.round(freeBottom - ch));
        shipBottom = freeBottom - ch - LAYOUT.gap;
      } else {
        card.destroy();
      }
    }
    if (shipBottom - freeTop >= 88) this.heroShip(Math.round(width / 2), Math.round((freeTop + shipBottom) / 2));

    const steps: SequenceStep[] = [];
    for (let i = 0; i < board.count; i++) steps.push({ wait: i === 0 ? 450 : 330, run: (inst) => board.reveal(i, inst) });
    steps.push({ wait: 380, run: (inst) => { bank.reveal(0, inst); if (!inst) audio.sfx('pickup_credit'); } });
    steps.push({ wait: 650, run: (inst) => this.stampRank(rankBox, letter, inst) });
    noticeObjs.forEach((o, i) => steps.push({
      wait: i === 0 ? 420 : 200,
      run: (inst) => {
        if (inst) { o.setAlpha(1); return; }
        o.x = nx + 8;
        this.tweens.add({ targets: o, alpha: 1, x: nx, duration: 180, ease: 'Quad.easeOut' });
        audio.sfx(notices[i].icon === 'ui_icon_intel' ? 'pickup_intel' : 'ui_move');
      },
    }));
    if (card && card.scene) {
      card.setAlpha(0);
      steps.push({ wait: 380, run: (inst) => { if (inst) card.setAlpha(1); else this.tweens.add({ targets: card, alpha: 1, duration: 220 }); } });
    }
    if (flourish) {
      const biome = info.level?.biome;
      const title = campaignDone ? 'CAMPAIGN COMPLETE' : 'PLANET LIBERATED';
      const sub = campaignDone ? 'THE OUTER MARCHES ARE FREE' : (info.planet?.name ?? '').toUpperCase();
      steps.push({ wait: 500, run: (inst) => this.liberated(bandY, title, sub, biome, inst) });
    }
    this.seq = new Sequence(this, steps, () => this.showContinue());
    this.seq.start();

    this.input.on('pointerdown', () => { if (this.seq && !this.seq.done) this.seq.skip(); });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') this.advance();
    });
    onBack(this, () => this.advance());
    markSceneReady(SCENES.LevelEnd, { levelId: result.levelId, applied: applied.applied, target: this.target, demo: !real });
  }

  private buildNotices(result: LevelResult, applied: ReturnType<typeof applyOnce>, rankNote: string, nextShownInCard: boolean): Notice[] {
    const out: Notice[] = [];
    if (result.score > applied.bestBefore && applied.bestBefore > 0) out.push({ text: 'NEW HIGH SCORE!', color: COLORS.gold });
    else out.push({ text: rankNote, color: COLORS.textDim });
    if (applied.newIntel.length > 0) {
      out.push({ text: applied.newIntel.length > 1 ? `${applied.newIntel.length} TRANSMISSIONS` : 'NEW TRANSMISSION', color: COLORS.accentLight, icon: 'ui_icon_intel', badge: 'NEW' });
    }
    const curPlanet = LEVELS.find((l) => l.id === result.levelId)?.planet;
    for (const id of applied.unlocked) {
      const lv = LEVELS.find((l) => l.id === id);
      if (!lv) continue;
      if (lv.planet !== curPlanet) {
        const p = PLANETS.find((pl) => pl.id === lv.planet);
        out.push({ text: `NEW WORLD UNLOCKED: ${(p?.name ?? lv.planet).toUpperCase()}`, color: COLORS.teal });
      } else if (!nextShownInCard) {
        out.push({ text: `NEXT MISSION: ${lv.name.toUpperCase()}`, color: COLORS.teal });
      }
    }
    if (result.completed && !applied.completedBefore) {
      const gear = itemsUnlockedBy(result.levelId).map((g) => g.name.toUpperCase());
      if (gear.length > 0) out.push({ text: this.listFit('NEW GEAR: ', gear, NOTICE_CHARS), color: COLORS.gold });
    }
    return out.map((n) => ({ ...n, text: n.text.length > NOTICE_CHARS ? `${n.text.slice(0, NOTICE_CHARS - 1)}.` : n.text }));
  }

  /** "PREFIX A, B +2" — as many names as fit in `max` characters, then a +N count. */
  private listFit(prefix: string, names: string[], max: number): string {
    let out = prefix;
    for (let i = 0; i < names.length; i++) {
      const rest = names.length - i - 1;
      const piece = `${i > 0 ? ', ' : ''}${names[i]}`;
      const suffix = rest > 0 ? ` +${rest}` : '';
      if ((out + piece + suffix).length <= max) { out += piece; continue; }
      return i === 0 ? `${prefix}${names.length} ITEMS` : `${out} +${names.length - i}`;
    }
    return out;
  }

  /** Card announcing the next mission (planet globe, name, briefing). Height in data 'h'. */
  private upNextCard(levelId: string, width: number): Phaser.GameObjects.Container | null {
    const lv = LEVELS.find((l) => l.id === levelId);
    if (!lv) return null;
    const planet = PLANETS.find((p) => p.id === lv.planet);
    const x0 = LAYOUT.margin;
    const w = width - 2 * LAYOUT.margin;
    const tx = 70;
    const tw = w - tx - LAYOUT.pad;
    const brief = wrapText(lv.briefing ?? '', tw, 's').split('\n').slice(0, 4).join('\n');
    const lines = brief ? brief.split('\n').length : 0;
    const h = Math.max(66, 34 + lines * 10 + 8);
    const c = this.add.container(0, 0);
    c.add(panel(this, x0, 0, w, h, 'raised'));
    if (this.textures.exists(planetKey(lv.biome))) c.add(this.add.image(x0 + 34, Math.round(h / 2), planetKey(lv.biome)));
    c.add(sectionLabel(this, x0 + tx - 7, 8, 'UP NEXT', tw + 7));
    c.add(text(this, x0 + tx, 19, fit(`${(planet?.name ?? lv.planet).toUpperCase()} ${lv.index} - ${lv.name.toUpperCase()}`, tw, 'm'), { size: 'm', color: COLORS.teal }));
    if (brief) c.add(text(this, x0 + tx, 34, brief, { size: 's', color: COLORS.textDim }).setLineSpacing(2));
    c.setData('h', h);
    return c;
  }

  /** The player's ship cruising home: hull x2 with engine flames, a gentle banking sway and sparkles. */
  private heroShip(x: number, y: number): void {
    const key = hullKey(getSave().loadout.hull);
    if (!this.textures.exists(key)) return;
    const c = this.add.container(x, y).setDepth(2);
    const glowKey = cachedTexture(this, '__le_glow', 32, 32, (ctx) => {
      const img = ctx.createImageData(32, 32);
      for (let yy = 0; yy < 32; yy++) {
        for (let xx = 0; xx < 32; xx++) {
          const d = Math.hypot(xx - 15.5, yy - 15.5) / 16;
          const i = (yy * 32 + xx) * 4;
          img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = Math.round(Math.max(0, 1 - d) ** 2 * 255);
        }
      }
      ctx.putImageData(img, 0, 0);
    });
    c.add(this.add.image(0, 4, glowKey).setScale(3.2, 2.2).setTint(COLORS.teal).setAlpha(0.18).setBlendMode(Phaser.BlendModes.ADD));
    const mounts = HULL_MOUNTS[getSave().loadout.hull]?.engines ?? [[0, 14]];
    if (this.textures.exists('fx_engine')) {
      for (const [ex, ey] of mounts) {
        const fl = this.add.sprite(ex * 2, (ey - 1) * 2, 'fx_engine', 0).setOrigin(0.5, 0).setScale(2);
        if (this.anims.exists(ANIM.engine)) fl.play({ key: ANIM.engine, startFrame: Math.floor(Math.random() * 4) });
        c.add(fl);
      }
    }
    const ship = this.add.sprite(0, 0, key, 0).setScale(2);
    c.add(ship);
    this.tweens.add({ targets: c, y: y - 5, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // banking sway: the hull leans into the drift while it is fast (frames 1 / 2 = banked left / right)
    const banks = this.textures.get(key).frameTotal - 1 >= 3;
    let prevX = x - 10;
    this.tweens.add({
      targets: c, x: { from: x - 10, to: x + 10 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const dx = c.x - prevX;
        prevX = c.x;
        if (banks) ship.setFrame(Math.abs(c.x - x) < 6 && Math.abs(dx) > 0.01 ? (dx < 0 ? 1 : 2) : 0);
      },
    });
    this.time.addEvent({
      delay: 900, loop: true, callback: () => {
        burst(this, c.x + (Math.random() - 0.5) * 40, c.y + (Math.random() - 0.5) * 30, { count: 6, speed: 30, life: 500, depth: 1, colors: [COLORS.teal, 0xffffff, COLORS.accentLight] });
      },
    });
  }

  private stampRank(box: Phaser.GameObjects.Container, letter: Phaser.GameObjects.BitmapText, instant: boolean): void {
    if (instant) { box.setAlpha(1); letter.setScale(3); return; }
    box.setAlpha(1);
    letter.setScale(6).setAlpha(0);
    this.tweens.add({
      targets: letter, scale: 3, alpha: 1, duration: 220, ease: 'Quad.easeIn',
      onComplete: () => {
        audio.sfx('explode_s', { volume: 0.6 });
        if (getSave().settings.shake) this.cameras.main.shake(120, 0.006);
        burst(this, box.x + 32, box.y + 38, { count: 16, speed: 70, life: 500 });
      },
    });
  }

  private liberated(y: number, title: string, sub: string, biome: Biome | undefined, instant: boolean): void {
    const { width } = this.scale.gameSize;
    const band = this.add.container(0, y).setDepth(5);
    band.add(this.add.rectangle(0, 0, width, 52, COLORS.panelDark, 0.92).setOrigin(0));
    band.add(neonRule(this, width / 2, 0, width, COLORS.teal));
    band.add(neonRule(this, width / 2, 50, width, COLORS.teal));
    const iconX = 34;
    const glowKey = cachedTexture(this, '__le_glow', 32, 32, (ctx) => {
      const img = ctx.createImageData(32, 32);
      for (let yy = 0; yy < 32; yy++) {
        for (let xx = 0; xx < 32; xx++) {
          const d = Math.hypot(xx - 15.5, yy - 15.5) / 16;
          const i = (yy * 32 + xx) * 4;
          img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = Math.round(Math.max(0, 1 - d) ** 2 * 255);
        }
      }
      ctx.putImageData(img, 0, 0);
    });
    const glow = this.add.image(iconX, 26, glowKey).setScale(2.4).setTint(COLORS.teal).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
    band.add(glow);
    if (biome && this.textures.exists(planetKey(biome))) {
      const pf = this.textures.getFrame(planetKey(biome));
      band.add(this.add.image(iconX, 26, planetKey(biome)).setScale(pf.width > 48 ? 0.5 : 1));
    }
    band.add(text(this, 66, 9, title, { size: 'l' }));
    band.add(text(this, 66, 32, sub, { size: 'm', color: COLORS.gold }));
    this.tweens.add({ targets: glow, alpha: 0.2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (instant) return;
    band.x = -width;
    this.tweens.add({ targets: band, x: 0, duration: 320, ease: 'Back.easeOut' });
    this.cameras.main.flash(220, 220, 255, 250);
    if (getSave().settings.shake) this.cameras.main.shake(260, 0.01);
    haptic('heavy');
    audio.sfx('explode_boss', { volume: 0.7 });
    this.time.delayedCall(240, () => {
      ringPulse(this, iconX, y + 26, COLORS.teal, 150, 900, 4);
      ringPulse(this, iconX, y + 26, COLORS.accent, 110, 700, 4);
      burst(this, iconX, y + 26, { count: 36, speed: 140, life: 900, depth: 6 });
    });
  }

  private showContinue(): void {
    const toMap = this.target === SCENES.Map;
    const b = bottomButton(this, toMap ? 'STAR CHART' : 'CONTINUE', () => this.leave());
    this.status.setText(toMap ? 'New routes are open on the star chart.' : 'Return to the hangar: repair and upgrade.');
    b.container.setAlpha(0);
    b.container.y += 6;
    this.tweens.add({ targets: b.container, alpha: 1, y: b.container.y - 6, duration: 180, ease: 'Quad.easeOut' });
    this.continueReady = true;
    setHookState({ continueReady: true });
  }

  private advance(): void {
    if (this.seq && !this.seq.done) { this.seq.skip(); return; }
    if (this.continueReady) { audio.sfx('ui_select'); this.leave(); }
  }

  private leave(): void {
    goto(this, this.target);
  }
}
