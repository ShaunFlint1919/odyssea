// Content validation + balance sanity checks for src/data (see docs/BALANCE.md).
import { describe, expect, it } from 'vitest';
import {
  BOSSES, ENEMIES, FRONT_WEAPONS, GENERATORS, HULLS, INTEL, LEVELS, PLANETS, REAR_WEAPONS, SHIELDS, SIDEKICKS,
  BOSS_UPTIME, DPS_UPTIME, MIDBOSS_UPTIME, MIDBOSS_UPTIME_BY_ID, PROJECTILES_AT_P1, REFERENCE_DPS, REPLAY_BONUS_FACTOR, START_CREDITS,
  START_LOADOUT, WEAPONS, estimateLevelCredits, estimateLevelIncome, fightDps, findLevel, getBoss, getEnemy, getGenerator, getHull,
  getLevel, getLevelStats, getShield, getWeapon, levelClearBonus, levelOrder, levelsOfPlanet, nextLevelId, nominalDps, planetOfLevel,
  HUMAN_AIM, powerFactor, referenceLoadout, referenceProgression, targetLevelCredits, validateContent,
} from '../src/data';
import { weaponFireStats } from '../src/game/arsenal/scaling';
import { validateBundle, type ContentBundle } from '../src/data/validate';
import { CAMPAIGN } from '../src/data/helpers';
import { field } from '../src/data/waves';
import { ENEMY_SPRITES } from '../src/art/keys';
import { ENEMY_BULLET_DAMAGE } from '../src/config';

const bundle = (): ContentBundle => structuredClone({
  hulls: HULLS, shields: SHIELDS, generators: GENERATORS, weapons: WEAPONS, sidekicks: SIDEKICKS,
  enemies: ENEMIES, bosses: BOSSES, planets: PLANETS, levels: LEVELS, intel: INTEL,
  startLoadout: START_LOADOUT, startCredits: START_CREDITS,
});

describe('content validation', () => {
  it('validateContent() reports no errors', () => {
    const errors = validateContent();
    if (errors.length) console.error(errors.slice(0, 40).join('\n'));
    expect(errors).toEqual([]);
  });

  it('the validator catches injected faults', () => {
    const cases: [string, (c: ContentBundle) => void, RegExp][] = [
      ['unknown enemy', (c) => { c.levels[0].waves[0].enemy = 'nobody'; }, /unknown enemy nobody/],
      ['ground unit on the ocean', (c) => { c.levels[6].waves[0].enemy = 'k_turret'; }, /ground unit k_turret in a ocean level/],
      ['sea unit on land', (c) => { c.levels[0].waves[0].enemy = 't_skiff'; }, /sea unit t_skiff outside an ocean level/],
      ['wave after the end', (c) => { c.levels[0].waves.push({ ...c.levels[0].waves[0], t: 99 }); }, /t outside/],
      ['x out of range', (c) => { c.levels[0].waves[0].x = 1.4; }, /x 1.4 outside/],
      ['empty wave', (c) => { c.levels[0].waves[0].count = 0; }, /count 0 outside/],
      ['air unit on the ground', (c) => { c.levels[0].waves[0].move = 'ground'; }, /air unit k_dart cannot use move ground/],
      ['level 3 without boss', (c) => { delete c.levels[2].boss; }, /level 3 must have a boss/],
      ['level 2 without mid-boss', (c) => { delete c.levels[1].midboss; }, /level 2 must have a mid-boss/],
      ['weak mid-boss', (c) => { c.levels[1].midboss = { t: 43, enemy: 'k_tank' }; }, /mid-boss sprite gr_tank/],
      ['boss part outside the body', (c) => { c.bosses[0].parts![0].offset = [70, 0]; }, /outside the 112px body/],
      ['boss part off its socket', (c) => { c.bosses[0].parts![0].offset = [10, 10]; }, /not on a turret socket/],
      ['boss gun off the art', (c) => { c.bosses[0].phases[0].attacks[0].from = [3, 3]; }, /not a muzzle \/ socket/],
      ['unknown enemy sprite', (c) => { c.enemies[0].sprite = 'en_ufo'; }, /unknown sprite en_ufo/],
      ['unknown bullet sprite', (c) => { c.enemies[1].bulletSprite = 'eb_blob'; }, /unknown bullet sprite eb_blob/],
      ['duplicate id', (c) => { c.enemies[1].id = c.enemies[0].id; }, /duplicate id/],
      ['unknown unlock level', (c) => { c.hulls[1].unlockLevel = 'mars-9'; }, /unlockLevel "mars-9"/],
      ['bad start loadout', (c) => { c.startLoadout.hull = 'zeppelin'; }, /unknown hull zeppelin/],
      ['empty screen gap', (c) => { c.levels[0].waves = c.levels[0].waves.filter((w) => w.t < 20 || w.t > 40); }, /gap of/],
      ['planet without its level', (c) => { c.levels.splice(0, 1); }, /unknown level kessra-1/],
      ['palette clash with terrain', (c) => { c.enemies[0].palette = 'amber'; }, /not in the kessra identity/],
      ['unreadable bullet colour', (c) => { c.enemies[1].bulletColor = 'orange'; }, /unreadable on desert/],
      ['orphan intel', (c) => { delete c.levels[0].intel; }, /referenced by 0 levels/],
      ['intel nobody carries', (c) => { c.levels[0].waves = c.levels[0].waves.filter((w) => w.enemy !== 'k_relay'); }, /not reliably dropped/],
      ['two front weapons, same pattern', (c) => { c.weapons[1].pattern = 'pulse'; }, /exactly one front weapon per pattern/],
      ['sidekick / sprite mismatch', (c) => { c.sidekicks[0].pattern = 'charge'; }, /does not match its sprite/],
      ['boss phases not escalating', (c) => { c.bosses[0].phases[1].attacks = c.bosses[0].phases[0].attacks; }, /same bullet patterns/],
      ['boss minion on the ground', (c) => { c.bosses[0].phases[2].spawn = { enemy: 'k_tank', every: 5 }; }, /must be an air unit/],
      ['name too long', (c) => { c.hulls[0].name = 'Sparrow Skiff Deluxe Edition'; }, /longer than 18/],
      ['map route going down', (c) => { c.planets[1].mapY = 0.95; }, /map position|mapY decreasing/],
    ];
    for (const [label, mutate, expected] of cases) {
      const c = bundle();
      mutate(c);
      const errors = validateBundle(c);
      expect(errors.some((e) => expected.test(e)), `${label}: ${errors.slice(0, 5).join(' | ')}`).toBe(true);
    }
  });
});

describe('catalogues', () => {
  it('has the campaign and catalogue sizes of the brief', () => {
    expect(PLANETS).toHaveLength(8);
    expect(LEVELS).toHaveLength(24);
    expect(BOSSES).toHaveLength(8);
    expect(HULLS).toHaveLength(6);
    expect(SHIELDS.length).toBeGreaterThanOrEqual(5);
    expect(GENERATORS.length).toBeGreaterThanOrEqual(5);
    expect(FRONT_WEAPONS).toHaveLength(8);
    expect(REAR_WEAPONS).toHaveLength(5);
    expect(WEAPONS).toHaveLength(13);
    expect(SIDEKICKS).toHaveLength(6);
    expect(ENEMIES.length).toBeGreaterThanOrEqual(36);
    expect(INTEL.length).toBeGreaterThanOrEqual(16);
    const used = new Set(ENEMIES.map((e) => e.sprite));
    for (const s of Object.keys(ENEMY_SPRITES)) expect(used.has(s), s).toBe(true);
    expect(LEVELS.filter((l) => l.intel).length).toBeGreaterThanOrEqual(16);
  });

  it('prices increase within every shop category', () => {
    for (const list of [HULLS, SHIELDS, GENERATORS, FRONT_WEAPONS, REAR_WEAPONS, SIDEKICKS]) {
      for (let i = 1; i < list.length; i++) expect(list[i].cost, list[i].id).toBeGreaterThan(list[i - 1].cost);
    }
    expect(FRONT_WEAPONS[0].cost).toBe(500);
    expect(FRONT_WEAPONS[FRONT_WEAPONS.length - 1].cost).toBe(30000);
    expect(HULLS[HULLS.length - 1].cost).toBe(90000);
  });

  it('START_LOADOUT is valid and cheap', () => {
    const L = START_LOADOUT;
    const hull = getHull(L.hull);
    const front = getWeapon(L.front);
    const value = hull.cost + front.cost + getShield(L.shield).cost + getGenerator(L.generator).cost;
    expect(front.slot).toBe('front');
    expect(L.rear).toBeNull();
    expect(value).toBeLessThanOrEqual(2 * START_CREDITS);
    for (const it of [hull, front, getShield(L.shield), getGenerator(L.generator)]) expect(it.unlockLevel).toBeUndefined();
    expect(hull.id).toBe('sparrow');
    expect(hull.sidekickSlots).toBe(1);
  });
});

describe('balance', () => {
  it('the starter generator sustains the starter gun plus shield regeneration', () => {
    const gen = getGenerator(START_LOADOUT.generator);
    const gun = getWeapon(START_LOADOUT.front);
    const sh = getShield(START_LOADOUT.shield);
    const shieldDrain = (id: string) => getShield(id).regen * getShield(id).energyPerPoint;
    const drain = gun.energyPerShot * gun.fireRate + sh.regen * sh.energyPerPoint;
    expect(gen.output).toBeGreaterThanOrEqual(drain);
    // ... and still runs it at power 5 (weaponFireStats = what the arsenal fires), not at power 10
    expect(weaponFireStats(gun, 5).energyPerSec + shieldDrain(sh.id)).toBeLessThanOrEqual(gen.output);
    expect(weaponFireStats(gun, 10).energyPerSec + shieldDrain(sh.id)).toBeGreaterThan(gen.output);
    // every shield tier paired with the same generator tier leaves >= 10 energy/s for guns
    SHIELDS.forEach((s, i) => expect(GENERATORS[i].output - s.regen * s.energyPerPoint, s.id).toBeGreaterThanOrEqual(10));
    // the best generator runs the hungriest front gun + best shield + hungriest rear gun
    const maxFront = Math.max(...FRONT_WEAPONS.map((w) => w.energyPerShot * w.fireRate));
    const maxRear = Math.max(...REAR_WEAPONS.map((w) => w.energyPerShot * w.fireRate));
    const best = SHIELDS[SHIELDS.length - 1];
    expect(GENERATORS[GENERATORS.length - 1].output).toBeGreaterThanOrEqual(maxFront + maxRear + best.regen * best.energyPerPoint);
    // trade-off: a big gun at high power + a strong shield needs a generator upgrade
    const needs = (gun: string, power: number, shield: string) => {
      const total = weaponFireStats(getWeapon(gun), power).energyPerSec + shieldDrain(shield);
      return GENERATORS.find((g) => g.output >= total)?.id ?? 'none';
    };
    expect(needs('pulse_blaster', 10, 'sh_veil')).toBe('gen_coil');
    expect(needs('lance_star', 5, 'sh_bastion')).toBe('gen_quasar');
    expect(needs('lance_star', 10, 'sh_paragon')).toBe('gen_helion');
    expect(needs('mortar_thunder', 10, 'sh_eclipse')).toBe('gen_well');
  });

  it('every front gun looks dense at power 1 and keeps the DPS model of the arsenal', () => {
    for (const w of FRONT_WEAPONS) {
      const st = weaponFireStats(w, 1);
      expect(st.volleysPerSec, w.id).toBeGreaterThanOrEqual(w.pattern === 'mortar' ? 2.4 : 3.5);
      expect(st.volleysPerSec * PROJECTILES_AT_P1[w.pattern], w.id).toBeGreaterThanOrEqual(w.pattern === 'mortar' ? 2.4 : 5);
      for (let p = 1; p <= 10; p++) expect(weaponFireStats(w, p).dps, `${w.id} p${p}`).toBeCloseTo(nominalDps(w) * powerFactor(p), 6);
    }
    for (const w of REAR_WEAPONS) expect(weaponFireStats(w, 1).dps, w.id).toBeCloseTo(nominalDps(w), 6);
  });

  it('pulse blaster power 1 fires >= 8 volleys/s for ~30 DPS and early hulls take 8-12 hits', () => {
    const pulse = getWeapon('pulse_blaster');
    expect(nominalDps(pulse)).toBeCloseTo(30, 0);
    expect(weaponFireStats(pulse, 1).volleysPerSec).toBeGreaterThanOrEqual(8);
    const veil = getShield('sh_veil').capacity;
    for (const id of ['sparrow', 'lancer']) {
      const hits = (getHull(id).armor + veil) / ENEMY_BULLET_DAMAGE.eb_orb;
      expect(hits, id).toBeGreaterThanOrEqual(8);
      expect(hits, id).toBeLessThanOrEqual(12);
    }
  });

  it('enemy hp sits in the weight classes and grows planet by planet', () => {
    const midbosses = new Set(LEVELS.flatMap((l) => (l.midboss ? [l.midboss.enemy] : [])));
    for (const e of ENEMIES) {
      const ok = midbosses.has(e.id)
        ? e.hp >= 800 && e.hp <= 9000
        : (e.hp >= 4 && e.hp <= 14) || (e.hp >= 30 && e.hp <= 90) || (e.hp >= 150 && e.hp <= 450);
      expect(ok, `${e.id} hp ${e.hp}`).toBe(true);
    }
    // same sprite + same weight class never gets weaker on a later planet
    const tierOf = (id: string) => 'kvtucgra'.indexOf(id.charAt(0));
    const classOf = (hp: number) => (hp <= 14 ? 0 : hp <= 90 ? 1 : 2);
    for (const sprite of Object.keys(ENEMY_SPRITES)) {
      for (let k = 0; k < 3; k++) {
        let prevMax = 0;
        for (let t = 0; t < 8; t++) {
          const hps = ENEMIES.filter((e) => e.sprite === sprite && tierOf(e.id) === t && !midbosses.has(e.id) && classOf(e.hp) === k).map((e) => e.hp);
          if (!hps.length) continue;
          expect(Math.max(...hps), `${sprite} class ${k} tier ${t}`).toBeGreaterThanOrEqual(prevMax);
          prevMax = Math.max(...hps);
        }
      }
    }
    const mb = LEVELS.filter((l) => l.midboss).map((l) => getEnemy(l.midboss!.enemy).hp);
    expect(mb[0]).toBe(800);
    expect(mb[mb.length - 1]).toBe(8900);
    for (let i = 1; i < mb.length; i++) expect(mb[i]).toBeGreaterThan(mb[i - 1]);
  });

  it('boss fights last 45-75 s for the reference player (planet 1: start gun + 1-2 upgrades)', () => {
    CAMPAIGN.forEach((c, i) => {
      const ttk = getBoss(c.boss).hp / (REFERENCE_DPS[i] * (BOSS_UPTIME[c.boss] ?? DPS_UPTIME));
      if (i === 0) {
        // the tutorial boss is tuned for the start gun; a full re-buy kit only shortens it
        const start = (power: number) =>
          getBoss(c.boss).hp / (fightDps({ ...START_LOADOUT, frontPower: power }, 'kessra-3', 'boss', false) * BOSS_UPTIME[c.boss]);
        expect(start(2), 'start gun p2').toBeGreaterThanOrEqual(60);
        expect(start(2), 'start gun p2').toBeLessThanOrEqual(75);
        expect(start(3), 'start gun p3').toBeGreaterThanOrEqual(50);
        expect(ttk, 'reference kit').toBeGreaterThanOrEqual(25);
        return;
      }
      expect(ttk, c.boss).toBeGreaterThanOrEqual(45);
      expect(ttk, c.boss).toBeLessThanOrEqual(75);
    });
    // humans land HUMAN_AIM of the autopilot's hits: their fights stay under ~95 s
    CAMPAIGN.forEach((c, i) => {
      if (i === 0) return;
      const human = getBoss(c.boss).hp / (REFERENCE_DPS[i] * (BOSS_UPTIME[c.boss] ?? DPS_UPTIME) * HUMAN_AIM);
      expect(human, `${c.boss} human`).toBeLessThanOrEqual(95);
    });
  });

  it('mid-boss fights last 20-35 s for the reference player (planet 1: start gun + 1-2 upgrades)', () => {
    const steps = referenceProgression();
    for (const p of PLANETS) {
      const id = p.levels[1];
      const l = getLevel(id);
      const m = getEnemy(l.midboss!.enemy);
      const up = MIDBOSS_UPTIME_BY_ID[m.id] ?? MIDBOSS_UPTIME;
      if (p.id === 'kessra') {
        const ttk = (power: number) => m.hp / (fightDps({ ...START_LOADOUT, frontPower: power }, id, 'midboss', false) * up);
        expect(ttk(2), 'kessra-2 start gun p2').toBeGreaterThanOrEqual(20);
        expect(ttk(2), 'kessra-2 start gun p2').toBeLessThanOrEqual(35);
        expect(ttk(1), 'kessra-2 bare start gun').toBeLessThan(45);
        continue;
      }
      const ttk = steps.find((s) => s.levelId === id)!.midbossTtk!;
      expect(ttk, id).toBeGreaterThanOrEqual(20);
      expect(ttk, id).toBeLessThanOrEqual(35);
      // the mid-boss hovers 45 s before it retreats: a kit with a third less DPS still gets it
      expect(ttk * 1.5, id).toBeLessThan(45);
    }
  });

  it('the reference player re-buys a sustainable kit and gets stronger planet by planet', () => {
    const steps = referenceProgression();
    expect(steps).toHaveLength(24);
    expect(steps[0].value).toBe(START_CREDITS + 2500);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].value, steps[i].levelId).toBeCloseTo(steps[i - 1].value + estimateLevelIncome(steps[i - 1].levelId), 6);
    }
    for (const s of steps) {
      const lo = referenceLoadout(s.levelId);
      expect(getWeapon(lo.front).slot).toBe('front');
      if (lo.rear) expect(getWeapon(lo.rear).slot).toBe('rear');
      if (lo.sidekickR) expect(getHull(lo.hull).sidekickSlots).toBe(2);
      expect(s.energyUse, `${s.levelId} energy`).toBeLessThanOrEqual(s.energyOut + 1e-9);
    }
    expect(REFERENCE_DPS).toHaveLength(8);
    for (let i = 1; i < 8; i++) expect(REFERENCE_DPS[i], `planet ${i}`).toBeGreaterThan(REFERENCE_DPS[i - 1] * 0.95);
    expect(REFERENCE_DPS[7] / REFERENCE_DPS[0]).toBeGreaterThan(3.5);
  });

  it('boss hp climbs from 3000 to 29000 with 2-4 phases and 2-6 parts', () => {
    const hp = CAMPAIGN.map((c) => getBoss(c.boss).hp);
    expect(hp[0]).toBe(3000);
    expect(hp[hp.length - 1]).toBe(29000);
    for (let i = 1; i < hp.length; i++) expect(hp[i]).toBeGreaterThan(hp[i - 1]);
    for (const b of BOSSES) {
      expect(b.phases.length).toBeGreaterThanOrEqual(2);
      expect(b.phases.length).toBeLessThanOrEqual(4);
      expect(b.parts?.length ?? 0).toBeGreaterThanOrEqual(2);
      expect(b.parts?.length ?? 0).toBeLessThanOrEqual(6);
    }
  });

  it('credits follow the 1500 -> 15000 curve', () => {
    const order = levelOrder();
    let total = 0, target = 0;
    order.forEach((id, i) => {
      const est = estimateLevelCredits(id);
      const tgt = targetLevelCredits(i);
      expect(est / tgt, id).toBeGreaterThan(0.7);
      expect(est / tgt, id).toBeLessThan(1.3);
      total += est;
      target += tgt;
    });
    for (const p of PLANETS) {
      const est = p.levels.reduce((s, id) => s + estimateLevelCredits(id), 0);
      const tgt = p.levels.reduce((s, id) => s + targetLevelCredits(order.indexOf(id)), 0);
      expect(est / tgt, p.id).toBeGreaterThan(0.9);
      expect(est / tgt, p.id).toBeLessThan(1.1);
    }
    expect(total / target).toBeGreaterThan(0.95);
    expect(total / target).toBeLessThan(1.05);
    expect(estimateLevelCredits('kessra-1')).toBeGreaterThan(1100);
    expect(estimateLevelCredits('axiom-3')).toBeGreaterThan(13500);
  });

  it('pays a level-clear bonus that scales with the campaign and is bigger on boss levels', () => {
    const order = levelOrder();
    let prev = 0;
    order.forEach((id, i) => {
      const l = getLevel(id);
      const bonus = levelClearBonus(id, !!l.boss);
      expect(bonus, id).toBeGreaterThan(0);
      expect(bonus % 10, id).toBe(0);
      if (!l.boss) expect(bonus, id).toBeGreaterThanOrEqual(prev);
      if (l.boss) expect(bonus, id).toBeGreaterThan(levelClearBonus(id, false) * 1.5);
      prev = levelClearBonus(id, false);
      // a share of the kill credits, never the main income
      const share = bonus / estimateLevelCredits(id);
      expect(share, id).toBeGreaterThan(0.1);
      expect(share, id).toBeLessThan(0.45);
      expect(estimateLevelIncome(id)).toBe(estimateLevelCredits(id) + bonus);
      expect(levelClearBonus(id, !!l.boss, true), `${id} replay`).toBeLessThanOrEqual(Math.round(bonus * REPLAY_BONUS_FACTOR) + 10);
      expect(targetLevelCredits(i)).toBeGreaterThan(0);
    });
    expect(levelClearBonus('nowhere-1', true)).toBe(0);
    expect(levelClearBonus('kessra-1', false)).toBe(300);
    expect(levelClearBonus('axiom-3', true)).toBe(5250);
  });
});

describe('campaign & pacing', () => {
  it('orders the campaign and links the levels', () => {
    const order = levelOrder();
    expect(order).toHaveLength(24);
    expect(order[0]).toBe('kessra-1');
    expect(order[23]).toBe('axiom-3');
    expect(nextLevelId('kessra-3')).toBe('verdance-1');
    expect(nextLevelId('axiom-3')).toBeNull();
    expect(nextLevelId('nowhere-1')).toBeNull();
    expect(() => getLevel('nowhere-1')).toThrow();
    expect(findLevel('nowhere-1')).toBeUndefined();
    expect(planetOfLevel('rift-2').id).toBe('rift');
    expect(levelsOfPlanet('glacia').map((l) => l.index)).toEqual([1, 2, 3]);
    PLANETS.forEach((p, i) => expect(p.id).toBe(CAMPAIGN[i].planet));
  });

  it('levels get longer, keep a high pace and end in a crescendo', () => {
    let prev = 0;
    for (const id of levelOrder()) {
      const l = getLevel(id);
      expect(l.duration, id).toBeGreaterThanOrEqual(prev);
      prev = l.duration;
      expect(l.scrollSpeed).toBeGreaterThanOrEqual(40);
      expect(l.scrollSpeed).toBeLessThanOrEqual(80);
      const s = getLevelStats(id);
      expect(s.avgGap, `${id} avg gap`).toBeGreaterThanOrEqual(1.3);
      expect(s.avgGap, `${id} avg gap`).toBeLessThanOrEqual(3.5);
      expect(s.maxGap, `${id} max gap`).toBeLessThanOrEqual(5);
      // crescendo: the last 10 s spawn more enemies per second than the level average
      const lastWaves = l.waves.filter((w) => w.t >= l.duration - 10);
      const late = lastWaves.reduce((n, w) => n + w.count * (w.mirror ? 2 : 1), 0) / 10;
      expect(late, `${id} crescendo`).toBeGreaterThan(s.spawned / l.duration);
    }
    expect(getLevel('kessra-1').duration).toBe(70);
    expect(getLevel('axiom-3').duration).toBe(120);
  });

  it('planets sit on a winding route up the portrait map', () => {
    expect(PLANETS[0].mapY).toBeCloseTo(0.88, 2);
    expect(PLANETS[7].mapY).toBeCloseTo(0.12, 2);
    for (let i = 1; i < PLANETS.length; i++) {
      const a = PLANETS[i - 1], b = PLANETS[i];
      const dist = Math.hypot((a.mapX - b.mapX) * 320, (a.mapY - b.mapY) * 568);
      expect(dist, `${a.id} -> ${b.id}`).toBeGreaterThanOrEqual(56);
    }
  });

  it('randomised wave blocks are deterministic', () => {
    expect(field(3, 'r_shard', 6, 4, 42)).toEqual(field(3, 'r_shard', 6, 4, 42));
    expect(JSON.stringify(field(3, 'r_shard', 6, 4, 1))).not.toEqual(JSON.stringify(field(3, 'r_shard', 6, 4, 2)));
  });

  it('tells a storyline with a recurring cast', () => {
    const senders = new Set(INTEL.map((i) => i.from));
    for (const who of ['LANTERN', 'RUST', 'DR. SENNA VAEL', 'THE ARCHITECT']) expect(senders.has(who), who).toBe(true);
    expect([...senders].filter((s) => s.startsWith('INTERCEPT')).length).toBeGreaterThanOrEqual(3);
    for (const i of INTEL) expect(i.body.length).toBeLessThanOrEqual(400);
  });
});
