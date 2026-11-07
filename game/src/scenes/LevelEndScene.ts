// =====================================================================================
//  LEVEL END — mission complete screen. Applies the LevelResult to the save exactly once,
//  then plays a skippable sequence: tally rows (kills, ratio, credits, score, time, bank),
//  a rank stamp, notices (record, NEW TRANSMISSION, unlocks, new gear) and, after a boss,
//  the "PLANET LIBERATED" flourish. CONTINUE -> Hangar, or the galaxy Map after a planet.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, SCENES } from '../config';
import { markSceneReady, setHookState } from '../debug';
import { planetKey } from '../art/keys';
import type { Biome, LevelResult } from '../types';
import { audio } from '../audio';
import { haptic } from '../platform/haptics';
import { getSave } from '../state/save';
import { isCampaignComplete, itemsUnlockedBy } from '../state/progress';
import { LEVELS, PLANETS } from '../data';
import { button, fadeIn, goto, onBack, panel, starfield, text } from '../ui/kit';
import {
  Board, Sequence, applyOnce, badge, burst, cachedTexture, demoResult, fmtInt, fmtTime, header, isLevelResult,
  isPlanetFinale, levelInfo, neonRule, normalizeResult, ringPulse, type BoardRow, type SequenceStep,
} from '../ui/widgets';

const RANKS: { min: number; letter: string; color: number; note: string }[] = [
  { min: 0.95, letter: 'S', color: COLORS.gold, note: 'FLAWLESS SWEEP' },
  { min: 0.8, letter: 'A', color: COLORS.teal, note: 'SHARP SHOOTING' },
  { min: 0.6, letter: 'B', color: COLORS.accentLight, note: 'SOLID RUN' },
  { min: 0, letter: 'C', color: COLORS.textDim, note: 'TARGETS ESCAPED' },
];

interface Notice { text: string; color: number; icon?: string; badge?: string }

export class LevelEndScene extends Phaser.Scene {
  private seq: Sequence | null = null;
  private target: string = SCENES.Hangar;
  private continueReady = false;

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
    starfield(this, { density: 1, speed: 16 });
    audio.music('victory');
    audio.sfx('level_clear');

    const head = header(this, 'MISSION COMPLETE', { y: 12, sub: info.label });
    const top = (head.getData('bottom') as number) + 10;

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
    const rowH = 20;
    const bankH = 24;
    const ph = rows.length * rowH + bankH + 22;
    panel(this, 10, top, width - 20, ph, 'inset');
    const board = new Board(this, 22, top + 8, width - 44, rows, rowH, 'm');
    const sepY = top + 8 + board.height + 4;
    this.add.rectangle(22, sepY, width - 44, 1, COLORS.panelLight, 0.9).setOrigin(0);
    const bank = new Board(this, 22, sepY + 4, width - 44, [
      { label: 'CREDITS BANKED', value: applied.creditsAfter, from: applied.creditsBefore, color: COLORS.gold, labelColor: COLORS.text, icon: 'ui_icon_credits' },
    ], bankH, 'm');

    // ---- rank + notices
    const rank = RANKS.find((r) => ratio >= r.min) ?? RANKS[RANKS.length - 1];
    const ry = top + ph + 10;
    const rankBox = this.add.container(10, ry);
    rankBox.add(panel(this, 0, 0, 64, 64, 'raised'));
    rankBox.add(text(this, 32, 8, 'RANK', { size: 's', color: COLORS.textDim, originX: 0.5 }));
    const letter = text(this, 32, 38, rank.letter, { size: 'm', color: rank.color, originX: 0.5, originY: 0.5 }).setScale(3);
    rankBox.add(letter);
    rankBox.setAlpha(0);

    const notices = this.buildNotices(result, applied, rank.note);
    const nx = 84;
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

    // ---- planet liberated band
    const bandY = Math.max(ry + 74, Math.min(height - 120, ry + 74 + Math.max(0, notices.length - 4) * 15));
    const flourish = planetDone && (result.bossDefeated || campaignDone);

    // ---- continue
    const hint = text(this, width / 2, height - 14, 'TAP TO SKIP', { size: 's', color: COLORS.textDim, originX: 0.5 });
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 500, yoyo: true, repeat: -1, ease: 'Stepped' });

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
    if (flourish) {
      const biome = info.level?.biome;
      const title = campaignDone ? 'CAMPAIGN COMPLETE' : 'PLANET LIBERATED';
      const sub = campaignDone ? 'THE OUTER WORLDS ARE FREE' : (info.planet?.name ?? '').toUpperCase();
      steps.push({ wait: 500, run: (inst) => this.liberated(bandY, title, sub, biome, inst) });
    }
    this.seq = new Sequence(this, steps, () => {
      hint.destroy();
      this.showContinue(width, height);
    });
    this.seq.start();

    this.input.on('pointerdown', () => { if (this.seq && !this.seq.done) this.seq.skip(); });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') this.advance();
    });
    onBack(this, () => this.advance());
    markSceneReady(SCENES.LevelEnd, { levelId: result.levelId, applied: applied.applied, target: this.target, demo: !real });
  }

  private buildNotices(result: LevelResult, applied: ReturnType<typeof applyOnce>, rankNote: string): Notice[] {
    const out: Notice[] = [];
    if (result.score > applied.bestBefore && applied.bestBefore > 0) out.push({ text: 'NEW SCORE RECORD!', color: COLORS.gold });
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
        out.push({ text: `SECTOR UNLOCKED: ${(p?.name ?? lv.planet).toUpperCase()}`, color: COLORS.teal });
      } else {
        out.push({ text: `NEXT MISSION: ${lv.name.toUpperCase()}`, color: COLORS.teal });
      }
    }
    if (result.completed) {
      const gear = itemsUnlockedBy(result.levelId);
      if (gear.length > 0) {
        const names = gear.slice(0, 2).map((g) => g.name.toUpperCase()).join(', ');
        out.push({ text: `NEW GEAR: ${names}${gear.length > 2 ? ` +${gear.length - 2}` : ''}`, color: COLORS.gold });
      }
    }
    return out.map((n) => ({ ...n, text: n.text.length > 36 ? `${n.text.slice(0, 35)}.` : n.text }));
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

  private showContinue(width: number, height: number): void {
    const label = this.target === SCENES.Map ? 'GALAXY MAP' : 'CONTINUE';
    const bw = 172;
    const b = button(this, Math.round((width - bw) / 2), height - 46, bw, 28, label, () => this.leave(), { size: 'm', color: COLORS.teal });
    text(this, width / 2, height - 12, this.target === SCENES.Map ? 'NEW ROUTES ON THE MAP' : 'RETURN TO HANGAR', { size: 's', color: COLORS.textDim, originX: 0.5 });
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
