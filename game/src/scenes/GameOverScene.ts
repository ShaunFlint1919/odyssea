// =====================================================================================
//  GAME OVER — failed / aborted mission. Applies the LevelResult once (the salvage rule —
//  50 % of the credits earned — lives in src/state/progress.ts), shows the drifting wreck,
//  the salvage tally and a tip, then RETRY (same level) / RETURN TO HANGAR.
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
import { MenuList, fadeIn, goto, onBack, panel, starfield, text, type MenuItem } from '../ui/kit';
import {
  Board, Sequence, applyOnce, badge, cachedTexture, demoResult, fmtInt, header, isLevelResult, levelInfo,
  normalizeResult, vignette, type BoardRow, type SequenceStep,
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
    starfield(this, { density: 0.7, speed: 5 });
    vignette(this, 0x6a0810, 0.75, -5);
    audio.music(null);
    audio.sfx('game_over');

    const head = header(this, 'MISSION FAILED', { y: 12, sub: aborted ? 'MISSION ABORTED' : 'SHIP DESTROYED', subColor: COLORS.bad });
    const top = head.getData('bottom') as number;
    this.buildWreck(width / 2, top + 44);

    // ---- salvage board
    const salvage = Math.max(0, applied.creditsAfter - applied.creditsBefore);
    const pct = Math.round(FAILED_CREDIT_RATIO * 100);
    const rows: BoardRow[] = [
      { label: 'ENEMIES DESTROYED', value: result.kills, format: (n) => `${fmtInt(n)} / ${fmtInt(result.spawned)}` },
      { label: 'CREDITS COLLECTED', value: result.creditsEarned, color: COLORS.textDim },
      { label: `SALVAGED (${pct}%)`, value: salvage, color: COLORS.gold, format: (n) => `+${fmtInt(n)}` },
    ];
    const by = top + 92;
    const rowH = 20;
    const ph = rows.length * rowH + 24 + 22;
    panel(this, 10, by, width - 20, ph, 'inset');
    const board = new Board(this, 22, by + 8, width - 44, rows, rowH, 'm');
    const sepY = by + 8 + board.height + 4;
    this.add.rectangle(22, sepY, width - 44, 1, COLORS.panelLight, 0.9).setOrigin(0);
    const bank = new Board(this, 22, sepY + 4, width - 44, [
      { label: 'CREDITS BANKED', value: applied.creditsAfter, from: applied.creditsBefore, color: COLORS.gold, labelColor: COLORS.text, icon: 'ui_icon_credits' },
    ], 24, 'm');

    // ---- notices + tip
    let ny = by + ph + 10;
    const extras: Phaser.GameObjects.Container[] = [];
    if (applied.newIntel.length > 0) {
      const c = this.add.container(16, ny);
      let tx = 0;
      if (this.textures.exists('ui_icon_intel')) { c.add(this.add.image(0, 5, 'ui_icon_intel').setOrigin(0, 0.5)); tx = 18; }
      const t = text(this, tx, 5, 'TRANSMISSION RECOVERED', { size: 's', color: COLORS.accentLight, originY: 0.5 });
      c.add([t, badge(this, tx + t.width + 5, 5, 'NEW', COLORS.accent)]);
      c.setAlpha(0);
      extras.push(c);
      ny += 18;
    }
    const tip = this.add.container(16, ny);
    tip.add(text(this, 0, 0, 'TIP', { size: 's', color: COLORS.accent }));
    tip.add(text(this, 24, 0, TIPS[Math.floor(Math.random() * TIPS.length)], { size: 's', color: COLORS.textDim, maxWidth: width - 48 }));
    tip.setAlpha(0);
    extras.push(tip);

    // ---- sequence, then the menu
    const steps: SequenceStep[] = [];
    for (let i = 0; i < board.count; i++) steps.push({ wait: i === 0 ? 650 : 320, run: (inst) => board.reveal(i, inst) });
    steps.push({ wait: 360, run: (inst) => bank.reveal(0, inst) });
    extras.forEach((o) => steps.push({
      wait: 300,
      run: (inst) => { if (inst) o.setAlpha(1); else this.tweens.add({ targets: o, alpha: 1, duration: 200 }); },
    }));
    const menuY = Math.max(ny + 40, height - 2 * ROW_H - 16 - 34);
    this.seq = new Sequence(this, steps, () => this.showMenu(width, menuY));
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

  private showMenu(width: number, y: number): void {
    const items: MenuItem[] = [
      { label: 'RETRY MISSION', color: COLORS.teal, help: 'Fly this mission again.' },
      { label: 'RETURN TO HANGAR', help: 'Repair, upgrade and try another route.' },
    ];
    const pw = 220;
    const px = Math.round((width - pw) / 2);
    const box = this.add.container(0, 0);
    box.add(panel(this, px, y, pw, items.length * ROW_H + 16, 'raised'));
    const help = text(this, width / 2, y + items.length * ROW_H + 24, '', { size: 's', color: COLORS.teal, originX: 0.5 });
    box.add(help);
    this.menu = new MenuList(this, {
      x: px + 18, y: y + 8, width: pw - 30, items, rowHeight: ROW_H, size: 'm',
      onSelect: (i) => {
        if (i === 0) goto(this, SCENES.Game, { levelId: this.levelId } satisfies GameStartData);
        else goto(this, SCENES.Hangar);
      },
      onFocus: (_i, it) => help.setText(it.help ?? ''),
    });
    box.add(this.menu.container);
    box.setAlpha(0);
    box.y = 6;
    this.tweens.add({ targets: box, alpha: 1, y: 0, duration: 200, ease: 'Quad.easeOut' });
    setHookState({ menuReady: true });
  }
}
