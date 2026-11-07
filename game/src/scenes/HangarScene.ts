import Phaser from 'phaser';
import { COLORS, SCENES } from '../config';
import { markSceneReady, setHookState } from '../debug';
import { audio } from '../audio';
import type { GameStartData } from '../game/contracts';
import { getSave, saveNow } from '../state/save';
import { loadoutValue } from '../state/economy';
import { isCompleted } from '../state/progress';
import * as kit from '../ui/kit';
import { META, ensureMetaArt, iconOr } from '../ui/meta/art';
import { HEADER_H, MD, countBadge, sectionLabel } from '../ui/meta/chrome';
import { listGeometry, scanlines, screenBackdrop, screenHeader } from '../ui/widgets';
import {
  campaignProgress, dec, findGenerator, findLevel, findShield, findWeapon, fmt, hangarFocusIndex, nextMissionId, planetOfLevel, setHangarFocus, signed,
  unreadIntelCount, upper, wrapLines,
} from '../ui/meta/common';
import { ShipBay } from '../ui/meta/shipBay';
import { energyBalance, totalDps } from '../ui/meta/stats';
import { BIOME_TINT, planetScale, planetTexture } from '../ui/meta/planets';

/** Main between-missions menu: ship bay, next mission, launch / upgrade / map / specs / comms / options / quit. */
export class HangarScene extends Phaser.Scene {
  private list?: kit.MenuList;
  private dialogOpen = false;

  constructor() {
    super(SCENES.Hangar);
  }

  create(): void {
    kit.fadeIn(this);
    audio.music('hangar');
    ensureMetaArt(this);
    this.dialogOpen = false;
    const { width: W, height: H } = this.scale.gameSize;
    const save = getSave();
    const loadout = save.loadout;

    screenBackdrop(this);
    screenHeader(this, 'HANGAR', { credits: save.credits });

    // ------------------------------------------------------------ layout (adapts to H)
    const rowH = H >= 660 ? 26 : H >= 560 ? 24 : 22;
    const menuH = 7 * rowH + 12;
    const missionH = 62; // room for 3 briefing lines (briefings are <= 120 chars)
    const statusH = 16;
    const gap = H >= 600 ? 5 : 4;
    const top = HEADER_H + gap;
    const bottom = H - statusH - gap;
    const bayH = bottom - top - menuH - missionH - 2 * gap;
    const px = 4, pw = W - 8;

    // ------------------------------------------------------------ ship bay
    kit.panel(this, px, top, pw, bayH, 'raised').setDepth(MD.panel);
    const infoH = 22;
    const chips = bayH >= 250;
    const chipsH = chips ? 38 : 0;
    const screenH = bayH - 10 - infoH - chipsH;
    const bayScale = screenH >= 290 ? 4 : screenH >= 150 ? 3 : 2;
    new ShipBay(this, { x: px + 5, y: top + 5, w: pw - 10, h: screenH, depth: MD.content, scale: bayScale }, loadout);

    let iy = top + 5 + screenH + 4;
    if (chips) {
      this.loadoutChips(px + 5, iy, pw - 10);
      iy += chipsH;
    }
    // value plates
    const plateW = Math.floor((pw - 14) / 2);
    kit.panel(this, px + 5, iy, plateW, infoH - 2, 'inset').setDepth(MD.content);
    kit.panel(this, px + 9 + plateW, iy, plateW, infoH - 2, 'inset').setDepth(MD.content);
    kit.text(this, px + 12, iy + 10, 'SHIP VALUE', { size: 's', color: COLORS.textDim, originY: 0.5, depth: MD.content });
    const value = fmt(loadoutValue());
    const valX = px + 5 + plateW - 7;
    kit.text(this, valX, iy + 10, value, { size: 'm', color: COLORS.gold, originX: 1, originY: 0.5, depth: MD.content });
    if (this.textures.exists('ui_icon_credits')) {
      this.add.image(valX - kit.measure(this, value, 'm') - 3, iy + 10, 'ui_icon_credits').setOrigin(1, 0.5).setDepth(MD.content);
    }
    kit.text(this, px + 16 + plateW, iy + 10, 'FIREPOWER', { size: 's', color: COLORS.textDim, originY: 0.5, depth: MD.content });
    kit.text(this, px + 9 + 2 * plateW - 7, iy + 10, `${dec(totalDps(loadout), 0)} DPS`, { size: 'm', color: COLORS.teal, originX: 1, originY: 0.5, depth: MD.content });

    // ------------------------------------------------------------ next mission
    const my = top + bayH + gap;
    this.missionPanel(px, my, pw, missionH);

    // ------------------------------------------------------------ menu
    const ly = my + missionH + gap;
    kit.panel(this, px, ly, pw, menuH, 'raised').setDepth(MD.panel);
    scanlines(this, px + 3, ly + 3, pw - 6, menuH - 6, 0.35, MD.panel);
    const missionId = nextMissionId();
    const mission = findLevel(missionId);
    const planet = planetOfLevel(missionId);
    const { done, total } = campaignProgress();
    const unread = unreadIntelCount();
    const bal = energyBalance(loadout);
    const items: kit.MenuItem[] = [
      {
        label: 'LAUNCH MISSION', icon: META.icLaunch, color: COLORS.teal,
        value: mission && planet ? `${upper(planet.name).replace(/^THE /, '').split(' ')[0]} ${mission.index}` : undefined, valueColor: COLORS.accentLight,
        disabled: !mission,
        help: mission ? kit.fit(`FLY "${upper(mission.name)}" - FULL REPAIR INCLUDED`, 296, 's') : 'NO MISSION DATA AVAILABLE',
      },
      { label: 'REFIT BAY', icon: META.icUpgrade, help: 'BUY AND TRADE HULLS, GUNS, SHIELDS AND DRONES' },
      {
        label: 'STAR CHART', icon: META.icMap, value: total ? `${done}/${total}` : undefined, valueColor: COLORS.textDim,
        help: 'PICK A TARGET OR REPLAY MISSIONS FOR CREDITS',
      },
      {
        label: 'LOADOUT STATS', icon: META.icSpecs, value: `${signed(bal.net)} EN/S`, valueColor: bal.net < 0 ? COLORS.bad : COLORS.good,
        help: bal.net < 0 ? 'WARNING: GUNS DRAW MORE THAN THE GENERATOR MAKES' : 'FULL LOADOUT STATS AND ENERGY BALANCE',
      },
      {
        label: 'TRANSMISSIONS', icon: iconOr(this, 'ui_icon_intel', META.icComms),
        value: unread === 0 && save.intel.length ? `${save.intel.length} MSG` : undefined, valueColor: COLORS.textDim,
        help: unread ? `${unread} UNREAD TRANSMISSION${unread > 1 ? 'S' : ''}` : 'READ THE TRANSMISSIONS YOU RECOVERED',
      },
      { label: 'OPTIONS', icon: META.icOptions, help: 'SOUND, CONTROLS AND DISPLAY SETTINGS' },
      { label: 'SAVE & QUIT', icon: META.icQuit, help: 'SAVE AND RETURN TO THE TITLE SCREEN' },
    ];
    const start = Math.min(items.length - 1, hangarFocusIndex());
    const status = kit.statusBar(this, items[start].help ?? '');
    const listX = px + 20, listW = pw - 28;
    this.list = new kit.MenuList(this, {
      x: listX, y: ly + 6, width: listW, items, rowHeight: rowH, size: 'm', depth: MD.content, startIndex: start,
      onFocus: (i, it) => { status.setText(it.help ?? ''); setHookState({ menu: i }); },
      onSelect: (i) => this.activate(i, missionId),
      onDisabled: (_i, it) => status.setText(it.help ?? ''),
    });
    if (unread > 0) countBadge(this, listX + listW - 18, ly + 6 + 4 * rowH + rowH / 2, unread, MD.float);

    kit.onBack(this, () => this.askQuit());
    markSceneReady(SCENES.Hangar, {
      credits: save.credits, level: missionId, menu: start, value: loadoutValue(), unread, items: items.map((i) => i.label), list: listGeometry(this.list),
    });
  }

  /** Two rows of small read-outs: front / rear guns, shield, generator. */
  private loadoutChips(x: number, y: number, w: number): void {
    const l = getSave().loadout;
    const cw = Math.floor((w - 4) / 2);
    const front = findWeapon(l.front);
    const rear = findWeapon(l.rear);
    const shield = findShield(l.shield);
    const chip = (cx: number, cy: number, icon: string, name: string, extra: string, extraColor: number) => {
      kit.panel(this, cx, cy, cw, 17, 'inset').setDepth(MD.content);
      if (this.textures.exists(icon)) this.add.image(cx + 10, cy + 8, icon).setDepth(MD.content).setScale(0.75);
      const ex = extra ? kit.measure(this, extra, 's') + 6 : 0;
      kit.text(this, cx + 20, cy + 5, kit.fit(name, cw - 26 - ex, 's'), { size: 's', color: COLORS.text, depth: MD.content });
      if (extra) kit.text(this, cx + cw - 5, cy + 5, extra, { size: 's', color: extraColor, originX: 1, depth: MD.content });
    };
    chip(x, y, 'ui_icon_front', upper(front?.name ?? l.front), `P${l.frontPower}`, COLORS.teal);
    chip(x + cw + 4, y, 'ui_icon_rear', rear ? upper(rear.name) : 'NO REAR GUN', rear ? `P${l.rearPower}` : '', COLORS.teal);
    chip(x, y + 19, 'ui_icon_shield', upper(shield?.name ?? l.shield), shield ? `${shield.capacity}` : '', COLORS.shield);
    const bal = energyBalance(l);
    chip(x + cw + 4, y + 19, 'ui_icon_generator', upper(findGenerator(l.generator)?.name ?? l.generator), `${signed(bal.net)}/S`, bal.net < 0 ? COLORS.bad : COLORS.good);
  }

  /** "Next mission" panel: planet globe, level name, briefing. */
  private missionPanel(x: number, y: number, w: number, h: number): void {
    kit.panel(this, x, y, w, h, 'raised').setDepth(MD.panel);
    const id = nextMissionId();
    const lv = findLevel(id);
    const planet = planetOfLevel(id);
    const gx = x + 30, gy = y + h / 2;
    const tint = planet ? BIOME_TINT[planet.biome] ?? COLORS.teal : COLORS.teal;
    this.add.image(gx, gy, META.glow).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45).setDisplaySize(64, 64).setDepth(MD.content);
    if (planet) {
      const img = this.add.image(gx, gy, planetTexture(this, planet.biome, Math.round(48 * Math.min(1.2, planetScale(planet.biome))))).setDepth(MD.content);
      this.tweens.add({ targets: img, y: gy - 1.5, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    } else {
      const g = this.add.graphics().setDepth(MD.content);
      g.fillStyle(tint, 0.8).fillCircle(gx, gy, 18);
      g.fillStyle(0x000000, 0.35).fillCircle(gx + 5, gy + 4, 16);
    }
    const tx = x + 62;
    const tw = w - 62 - 8;
    const where = planet && lv ? `${upper(planet.name)} ${lv.index}/${planet.levels.length}` : '';
    sectionLabel(this, tx - 2, y + 6, 'NEXT MISSION', tw - kit.measure(this, where, 's') - 6, MD.content);
    if (where) kit.text(this, x + w - 8, y + 6, where, { size: 's', color: COLORS.teal, originX: 1, depth: MD.content });
    if (!lv) {
      const all = campaignProgress();
      const msg = all.total > 0 && all.done >= all.total ? 'CAMPAIGN COMPLETE' : 'NO MISSION DATA';
      kit.text(this, tx, y + 19, msg, { size: 'm', color: COLORS.gold, depth: MD.content });
      wrapLines('Replay any cleared mission from the star chart to farm credits.', Math.floor(tw / 6), 2)
        .forEach((ln, i) => kit.text(this, tx, y + 32 + i * 9, ln, { size: 's', color: COLORS.textDim, depth: MD.content }));
      return;
    }
    const replay = isCompleted(lv.id);
    kit.text(this, tx, y + 18, kit.fit(upper(lv.name), tw - (replay ? 54 : 0), 'm'), { size: 'm', color: COLORS.text, depth: MD.content });
    if (replay) kit.text(this, x + w - 8, y + 19, 'REPLAY', { size: 's', color: COLORS.gold, originX: 1, depth: MD.content });
    const maxLines = Math.max(2, Math.min(3, Math.floor((h - 33) / 9)));
    const lines = wrapLines(lv.briefing, Math.floor(tw / 6), maxLines);
    lines.forEach((ln, i) => kit.text(this, tx, y + 31 + i * 9, ln, { size: 's', color: COLORS.textDim, depth: MD.content }));
  }

  private activate(i: number, missionId: string | null): void {
    if (this.dialogOpen) return;
    setHangarFocus(i === 6 ? 0 : i);
    switch (i) {
      case 0:
        if (!missionId) return;
        saveNow();
        kit.goto(this, SCENES.Game, { levelId: missionId } satisfies GameStartData);
        break;
      case 1: kit.goto(this, SCENES.Shop, {}); break;
      case 2: kit.goto(this, SCENES.Map); break;
      case 3: kit.goto(this, SCENES.Specs); break;
      case 4: kit.goto(this, SCENES.Intel, { from: SCENES.Hangar }); break;
      case 5: kit.goto(this, SCENES.Options, { from: SCENES.Hangar }); break;
      case 6:
        saveNow();
        kit.goto(this, SCENES.Title);
        break;
      default: break;
    }
  }

  private askQuit(): void {
    if (this.dialogOpen) return;
    this.dialogOpen = true;
    audio.sfx('ui_back');
    this.list?.setEnabled(false);
    kit.confirm(this, 'Return to the title screen?\nYour progress is saved.', (yes) => {
      this.dialogOpen = false;
      this.list?.setEnabled(true);
      if (yes) {
        saveNow();
        setHangarFocus(0);
        kit.goto(this, SCENES.Title);
      }
    });
  }
}
