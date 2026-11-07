// =====================================================================================
//  GAME OVER — failed / aborted mission. Applies the LevelResult once (the salvage rule —
//  50 % of the credits earned — lives in src/state/progress.ts), shows the drifting wreck,
//  the salvage tally and a tip, then RETRY (same level) / RETURN TO HANGAR. Shared screen
//  frame: header strip (no back arrow: back = skip / hangar), status bar with the menu help.
//  Optional extra field on the result: `aborted: true` (mission aborted from the pause menu).
// =====================================================================================
import Phaser from 'phaser';
import { COLORS, SCENES } from '../config';
import { markSceneReady, setHookState } from '../debug';
import { hullKey } from '../art/keys';
import type { LevelResult } from '../types';
import type { GameStartData } from '../game/contracts';
import { audio } from '../audio';
import { getSave } from '../state/save';
import { FAILED_CREDIT_RATIO } from '../state/progress';
import { MenuList, fadeIn, fit, goto, onBack, panel, statusBar, text, wrapText, type MenuItem, type StatusBarApi } from '../ui/kit';
import {
  Board, LAYOUT, MD, Sequence, applyOnce, badge, cachedTexture, contentRect, demoResult, fmtInt, isLevelResult, levelInfo,
  normalizeResult, screenBackdrop, screenHeader, sectionLabel, vignette, type BoardRow, type SequenceStep,
} from '../ui/widgets';

const TIPS = [
  'Shields recharge from generator energy: upgrade both together.',
  'Trade-ins refund 100% of what you paid for the old part.',
  'Replay cleared missions to farm credits for upgrades.',
  'Rear guns cover your flanks: switch their mode in flight.',
  'Sidekicks fire for free and never drain your generator.',
  'Keep moving: aimed shots are fired where you stand.',
  'Armor only repairs at the hangar or with repair pickups.',
];

const ROW_H = 26;

export class GameOverScene extends Phaser.Scene {
  private seq: Sequence | null = null;
  private menu: MenuList | null = null;
  private levelId = '';
  private status!: StatusBarApi;

  constructor() {
    super(SCENES.GameOver);
  }

  create(data?: LevelResult & { aborted?: boolean }): void {
    this.seq = null;
    this.menu = null;
    const real = isLevelResult(data);
    const raw = real ? data : demoResult(false);
    const result = normalizeResult(raw);
    const applied = applyOnce(raw, real);
    const aborted = !!data?.aborted;
    const info = levelInfo(result.levelId);
    this.levelId = result.levelId;

    fadeIn(this, 320);
    const { width, height } = this.scale.gameSize;
    screenBackdrop(this, { stars: 0.7, speed: 5 });
    vignette(this, 0x5a0610, 0.7, MD.stars + 1);
    audio.music(null);
    audio.sfx('game_over');

    screenHeader(this, 'MISSION FAILED', { right: aborted ? 'MISSION ABORTED' : 'SHIP DESTROYED', rightColor: COLORS.bad });
    this.status = statusBar(this, 'Tap to skip');
    const area = contentRect(this);

    // ---- salvage board
    const salvage = Math.max(0, applied.creditsAfter - applied.creditsBefore);
    const pct = Math.round(FAILED_CREDIT_RATIO * 100);
    const rows: BoardRow[] = [
      { label: 'ENEMIES DESTROYED', value: result.kills, format: (n) => `${fmtInt(n)} / ${fmtInt(result.spawned)}` },
      { label: 'CREDITS COLLECTED', value: result.creditsEarned, color: COLORS.textDim },
      { label: `SALVAGED (${pct}%)`, value: salvage, color: COLORS.gold, format: (n) => `+${fmtInt(n)}` },
    ];
    const by = area.y;
    const rowH = 20;
    const pad = 12;
    const labelH = 18;
    const ph = labelH + rows.length * rowH + 9 + 24 + 6;
    panel(this, area.x, by, area.w, ph, 'inset');
    sectionLabel(this, area.x + LAYOUT.pad, by + 7, fit(info.label, area.w - 2 * LAYOUT.pad - 24, 's'), area.w - 2 * LAYOUT.pad, MD.content, COLORS.bad);
    const board = new Board(this, area.x + pad, by + labelH, area.w - 2 * pad, rows, rowH, 'm');
    const sepY = by + labelH + board.height + 4;
    this.add.rectangle(area.x + pad, sepY, area.w - 2 * pad, 1, COLORS.panelLight, 0.9).setOrigin(0);
    const bank = new Board(this, area.x + pad, sepY + 4, area.w - 2 * pad, [
      { label: 'CREDITS BANKED', value: applied.creditsAfter, from: applied.creditsBefore, color: COLORS.gold, labelColor: COLORS.text, icon: 'ui_icon_credits' },
    ], 24, 'm');

    // ---- notices + tip card
    let ny = by + ph + LAYOUT.gap;
    const extras: Phaser.GameObjects.Container[] = [];
    if (applied.newIntel.length > 0) {
      const c = this.add.container(area.x + LAYOUT.pad, ny + 2);
      let tx = 0;
      if (this.textures.exists('ui_icon_intel')) { c.add(this.add.image(0, 5, 'ui_icon_intel').setOrigin(0, 0.5)); tx = 18; }
      const t = text(this, tx, 5, 'TRANSMISSION RECOVERED', { size: 's', color: COLORS.accentLight, originY: 0.5 });
      c.add([t, badge(this, tx + t.width + 5, 5, 'NEW', COLORS.accent)]);
      c.setAlpha(0);
      extras.push(c);
      ny += 18;
    }
    const tipStr = wrapText(TIPS[Math.floor(Math.random() * TIPS.length)], area.w - 2 * LAYOUT.pad, 's');
    const tipLines = tipStr.split('\n').length;
    const tipH = 20 + tipLines * 10 + 4;
    const tip = this.add.container(area.x, ny);
    tip.add(panel(this, 0, 0, area.w, tipH, 'raised'));
    tip.add(sectionLabel(this, LAYOUT.pad, 7, 'TIP', area.w - 2 * LAYOUT.pad));
    const tipText = text(this, LAYOUT.pad, 19, tipStr, { size: 's', color: COLORS.textDim });
    tipText.setLineSpacing(2);
    tip.add(tipText);
    tip.setAlpha(0);
    extras.push(tip);
    const contentBottom = ny + tipH;

    // ---- the wreck drifts in the space left between the tip and the menu
    const menuH = 2 * ROW_H + 16;
    const menuY = height - LAYOUT.statusH - LAYOUT.gap - menuH;
    const wreckY = Math.round((contentBottom + menuY) / 2);
    if (menuY - contentBottom > 76) this.buildWreck(width / 2, wreckY);

    // ---- sequence, then the menu
    const steps: SequenceStep[] = [];
    for (let i = 0; i < board.count; i++) steps.push({ wait: i === 0 ? 650 : 320, run: (inst) => board.reveal(i, inst) });
    steps.push({ wait: 360, run: (inst) => bank.reveal(0, inst) });
    extras.forEach((o) => steps.push({
      wait: 300,
      run: (inst) => { if (inst) o.setAlpha(1); else this.tweens.add({ targets: o, alpha: 1, duration: 200 }); },
    }));
    this.seq = new Sequence(this, steps, () => this.showMenu(menuY));
    this.seq.start();
    this.input.on('pointerdown', () => { if (this.seq && !this.seq.done) this.seq.skip(); });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (!e.repeat && this.seq && !this.seq.done && (e.code === 'Enter' || e.code === 'Space')) this.seq.skip();
    });
    onBack(this, () => {
      if (this.seq && !this.seq.done) { this.seq.skip(); return; }
      audio.sfx('ui_back');
      goto(this, SCENES.Hangar);
    });
    markSceneReady(SCENES.GameOver, { levelId: result.levelId, applied: applied.applied, demo: !real, aborted });
  }

  /** The player's hull tumbling in space with smoke and sparks. */
  private buildWreck(x: number, y: number): void {
    const key = hullKey(getSave().loadout.hull);
    const puffKey = cachedTexture(this, '__go_puff', 3, 3, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1, 0, 1, 3);
      ctx.fillRect(0, 1, 3, 1);
    });
    const smoke: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 18; i++) smoke.push(this.add.image(x, y, puffKey).setVisible(false).setDepth(1));
    let si = 0;
    if (this.textures.exists(key)) {
      const ship = this.add.sprite(x, y, key, 0).setScale(2).setDepth(2).setTint(0x8a6070);
      this.tweens.add({ targets: ship, angle: { from: -14, to: 14 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: ship, y: y + 6, duration: 3400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.time.addEvent({
        delay: 140, loop: true, callback: () => {
          ship.setTint(Math.random() < 0.25 ? 0xff6040 : 0x8a6070);
          const p = smoke[si];
          si = (si + 1) % smoke.length;
          const fire = Math.random() < 0.35;
          p.setPosition(ship.x + (Math.random() - 0.5) * 22, ship.y + (Math.random() - 0.5) * 18).setVisible(true)
            .setAlpha(0.8).setScale(fire ? 1 : 2).setTint(fire ? 0xffa040 : 0x5a5466);
          this.tweens.killTweensOf(p);
          this.tweens.add({ targets: p, y: p.y - 18 - Math.random() * 14, x: p.x + (Math.random() - 0.5) * 10, alpha: 0, duration: 900, onComplete: () => p.setVisible(false) });
        },
      });
    }
  }

  private showMenu(y: number): void {
    const items: MenuItem[] = [
      { label: 'RETRY MISSION', color: COLORS.teal, help: 'Fly this mission again.' },
      { label: 'RETURN TO HANGAR', help: 'Repair, upgrade and try another route.' },
    ];
    const area = contentRect(this);
    const box = this.add.container(0, 0);
    box.add(panel(this, area.x, y, area.w, items.length * ROW_H + 16, 'raised'));
    this.menu = new MenuList(this, {
      x: area.x + LAYOUT.listInset, y: y + 8, width: area.w - LAYOUT.listInset - LAYOUT.pad, items, rowHeight: ROW_H, size: 'm',
      onSelect: (i) => {
        if (i === 0) goto(this, SCENES.Game, { levelId: this.levelId } satisfies GameStartData);
        else goto(this, SCENES.Hangar);
      },
      onFocus: (_i, it) => this.status.setText(it.help ?? ''),
    });
    box.add(this.menu.container);
    box.setAlpha(0);
    box.y = 6;
    this.tweens.add({ targets: box, alpha: 1, y: 0, duration: 200, ease: 'Quad.easeOut' });
    setHookState({ menuReady: true });
  }
}
