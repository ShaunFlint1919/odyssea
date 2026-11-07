# Nova Corsair: balance and content design

Owner: content (`src/data/**`). Every number below is real data from `src/data`. The model
that justifies them lives in code (`src/data/balance.ts`, `src/data/weapons.ts`
`nominalDps` / `powerFactor` / `PROJECTILES_AT_P1`). `tests/content.test.ts` checks the
content against this document and fails if they drift apart. `validateContent()`
(`src/data/validate.ts`) checks every cross-reference and design rule listed in §9.

## 1. Damage model (shared with gameplay)

* **Player DPS.** Nominal DPS = `damage × fireRate × projectiles-at-p1` (`PROJECTILES_AT_P1`:
  pulse 1, scatter 3, gatling 1, lance 1, seeker 2, helix 2, mortar 1, prism 1, tail 1,
  flame 1, mines 1, arc 3, seekers 2). Power p multiplies it by `M(p) = 1 + 0.45 (p-1)`,
  which is ×5.05 at p10. Gameplay implements exactly this (`src/game/arsenal/scaling.ts`).
* **Energy.** A gun draws `energyPerShot × fireRate` energy/s at p1. Gameplay scales it by
  `E(p) = 1 + 0.05 (p-1)`, ×1.45 at p10 (`energyFactor()`).
* **Enemy bullets.** Damage is fixed per sprite by `ENEMY_BULLET_DAMAGE`: dot 2, orb 3,
  needle 3, ring 4, bigorb 6, missile 7, laser 1 per 0.1 s. Content picks the sprite by
  threat: fodder fires dots, line units fire orbs or needles, heavies fire rings, flak shells
  are orbs (their 6 fragments stay at 3 dmg), and missiles can be shot down.
* **Survivability.** Sparrow (20 armor) + Veil Screen (10) = 30 points. That is 10 orb hits
  or 15 dot hits, about 12 hits of Kessra's mixed fire. Lancer + Veil takes 12 orb hits
  (test: 8-12).
* **Contact damage.** Air units: 8 (≤14 px) / 10 (≤20) / 14 (≤28) / 18 (≤40) / 26 (bigger),
  plus ⌊tier/2⌋. Kamikazes: 12 + tier. Ground and sea units: 0 (you fly over them). Hazards
  use explicit values.

## 2. Ship parts

### Hulls (armor 16..60, speed 120..200, hit radius 3..6)
| id | name | cost | armor | speed | hitR | slots | unlock |
| --- | --- | --: | --: | --: | --: | --: | --- |
| sparrow | Sparrow Skiff | 0 | 20 | 150 | 4 | 1 | start |
| lancer | Lancer Interceptor | 5000 | 26 | 180 | 3.5 | 2 | kessra-2 |
| bulwark | Bulwark Brawler | 14000 | 40 | 130 | 5 | 2 | verdance-2 |
| wraith | Wraith Ghostwing | 26000 | 32 | 200 | 3 | 2 | thalassa-3 |
| tempest | Tempest Vanguard | 48000 | 46 | 175 | 4 | 2 | cinder-1 |
| leviathan | Leviathan Ark | 90000 | 60 | 125 | 6 | 2 | glacia-3 |

The Lancer is the first must-buy because it adds the second sidekick mount. After that, each
hull is a different trade-off:
* Bulwark buys armour with speed.
* Wraith buys a tiny hitbox with armour.
* Tempest gets all three, at a price.
* Leviathan is the 90k post-campaign or farming goal.

### Shields and generators: the energy budget
| shield | cost | cap | regen/s | e/pt | drain e/s | unlock |
| --- | --: | --: | --: | --: | --: | --- |
| Veil Screen `sh_veil` | 1000 | 10 | 1.5 | 2 | 3.0 | start |
| Aegis Weave | 4000 | 15 | 2.2 | 2 | 4.4 | kessra-1 |
| Bastion Field | 9500 | 22 | 3 | 2.2 | 6.6 | verdance-1 |
| Halo Lattice | 19000 | 30 | 4 | 2.4 | 9.6 | thalassa-2 |
| Paragon Ward | 34000 | 40 | 5.2 | 2.5 | 13.0 | umbra-3 |
| Eclipse Mantle | 60000 | 54 | 6.5 | 2.8 | 18.2 | glacia-2 |

| generator | cost | cap | out e/s | paired shield drain | left for guns | unlock |
| --- | --: | --: | --: | --: | --: | --- |
| Ember Cell `gen_cell` | 1000 | 50 | 15 | 3.0 | 12.0 | start |
| Flux Coil | 3500 | 70 | 21 | 4.4 | 16.6 | kessra-1 |
| Ion Furnace | 9000 | 95 | 28 | 6.6 | 21.4 | kessra-3 |
| Quasar Core | 18000 | 125 | 36 | 9.6 | 26.4 | thalassa-1 |
| Helion Heart | 32000 | 165 | 46 | 13.0 | 33.0 | umbra-2 |
| Singularity Well | 60000 | 220 | 60 | 18.2 | 41.8 | cinder-3 |

The starting kit is sustainable: Kestrel p1 draws 10 e/s and the Veil regenerates at 3 e/s,
13 e/s in total against the Ember Cell's 15 (2 e/s spare). At p5 it draws 12 + 3 = 15, so the
cell exactly holds.

A generator tier runs its paired shield plus a front gun of the same price band up to about
p5. Shield regen only draws while the shield is below full, and the gauge drops only under
combined pressure. Three situations push the player to the next generator, which is the
Tyrian-style build trade-off:
* maxing a gun (p10 drains ×1.45 the p1 rate),
* adding a rear gun (4-8 e/s),
* or regenerating a big shield mid-fight.

The best kit is a Singularity Well running Thunderhead p1 (24) + Rearguard (8) + Eclipse
regen (18.2), 50.2 of 60 e/s. At p10 the same kit needs 64.6 e/s, but only while the shield
refills; the 220 buffer covers about 48 s of it. Sidekicks are free.

Front gun drain (e/s) at power 1 / 5 / 10:

| gun | p1 | p5 | p10 |
| --- | --: | --: | --: |
| Kestrel Pulser | 10 | 12 | 14.5 |
| Fanfire Scatter | 12 | 14.4 | 17.4 |
| Rattler Gatling | 15.6 | 18.7 | 22.6 |
| Serpent Helix | 16 | 19.2 | 23.2 |
| Kitehawk Seekers | 17.5 | 21 | 25.4 |
| Starpiercer Lance | 20 | 24 | 29 |
| Shatterprism | 21.6 | 25.9 | 31.3 |
| Thunderhead Mortar | 24 | 28.8 | 34.8 |

### Weapons (front: one per pattern; upgrade n→n+1 costs `upgradeBase × n`)
| id | name | pattern | cost | upg | upg/cost | dmg | rate | proj | DPS p1 | DPS p10 | to reach p10 | unlock |
| --- | --- | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --- |
| pulse_blaster | Kestrel Pulser | pulse | 500 | 300 | 0.60 | 5 | 5 | 1 | 25 | 126 | 14000 | start |
| scatter_fan | Fanfire Scatter | scatter | 1500 | 750 | 0.50 | 4 | 3 | 3 | 36 | 182 | 35250 | start |
| gatling_rattler | Rattler Gatling | gatling | 3500 | 1500 | 0.43 | 4 | 12 | 1 | 48 | 242 | 71000 | kessra-1 |
| helix_serpent | Serpent Helix | helix | 6000 | 2400 | 0.40 | 6 | 5 | 2 | 60 | 303 | 114000 | kessra-2 |
| seeker_kite | Kitehawk Seekers | seeker | 9500 | 3600 | 0.38 | 16 | 2.5 | 2 | 80 | 404 | 171500 | kessra-3 |
| lance_star | Starpiercer Lance | lance | 14000 | 4900 | 0.35 | 40 | 2.5 | 1 | 100 | 505 | 234500 | verdance-2 |
| prism_shatter | Shatterprism | prism | 20000 | 6400 | 0.32 | 32 | 3.6 | 1 | 115 | 582 | 308000 | thalassa-1 |
| mortar_thunder | Thunderhead Mortar | mortar | 30000 | 9000 | 0.30 | 88 | 1.6 | 1 | 141 | 711 | 435000 | thalassa-3 |

Colours (distinct per slot): pulse cyan, scatter orange, gatling yellow, lance blue, seeker
pink, helix green, mortar red, prism white.

Each step up the ladder doubles the price, adds about 25 % base DPS, and gets a cheaper
`upgradeBase / cost` ratio (0.60 down to 0.30). The cheap Kestrel therefore wins while the
budget is small: maxed for 14k, it gives 126 DPS. Above about 25k of investment, the premium
guns at p2-p4 overtake it:

| budget | Kestrel | Lance | Prism | Mortar |
| --: | --: | --: | --: | --: |
| 40k | 126 | 190 (p3) | 218 (p3) | 204 (p2) |
| 60k | 126 | 235 (p4) | 270 (p4) | 268 (p3) |

At equal investment the mid guns are sidegrades of similar value. You choose them by pattern:
spread for swarms, stream for single targets, homing for reliability, pierce for columns,
splash for crowds and bunkers. Trade-in refunds 100 %, so experimenting costs nothing.

| rear | pattern | cost | upg | dmg | rate | proj | DPS p1 | e/s | unlock |
| --- | --- | --: | --: | --: | --: | --: | --: | --: | --- |
| Tailstinger | tail | 1000 | 450 | 4 | 4 | 1 | 16 | 4.0 | start |
| Afterburn Torch | flame | 3000 | 1200 | 2 | 10 | 1 | 20 | 7.0 | kessra-2 |
| Caltrop Dropper | mines | 6000 | 2200 | 30 | 1.2 | 1 | 36 | 4.8 | verdance-1 |
| Backlash Arc | arc | 10000 | 3500 | 6 | 3 | 3 | 54 | 6.0 | verdance-3 |
| Rearguard Hunters | seekers | 16000 | 5000 | 14 | 2 | 2 | 56 | 8.0 | thalassa-2 |

Rear guns cover the threats that come from behind and the sides:
* Verdance's canopy ambushes (`rise`),
* the strafing columns on every planet,
* the comet packs of Cinder, the Rift and Axiom.

| sidekick | pattern | cost | dmg | rate | proj | DPS | unlock |
| --- | --- | --: | --: | --: | --: | --: | --- |
| Escort Pod | pod | 1200 | 4 | 3 | 1 | 12 | start |
| Twinfang Drone | twin | 3500 | 4 | 3 | 2 | 24 | kessra-1 |
| Satellite Ward | orbiter | 7000 | 10 | 4 | 1 | 40 (contact) + blocks bullets | kessra-3 |
| Skyhook Rockets | rocket | 12000 | 30 | 1.2 | 1 | 36, homing | verdance-2 |
| Shardcaster | shard | 20000 | 9 | 2.2 | 3 | 59, piercing | thalassa-1 |
| Stormcharge Pod | charge | 32000 | 160 | 0.4 | 1 | 64, piercing beam | umbra-1 |

## 3. Economy

* **Curve.** Credits per level (kills + mid-boss + boss) follow the geometric curve
  `targetLevelCredits(i) = 1500 × 10^(i/23)`, from 1500 at kessra-1 to 15000 at axiom-3,
  about 144.7k for the whole campaign. The estimate assumes `KILL_RATE` = 70 % of wave enemies
  plus the mid-boss and boss. Progress adds no completion bonus; hard difficulty pays ×1.3.
* **Enemy credits.** Enemy credits = `CREDIT_RATE[planet] × hp^0.75`; loot carriers (relay
  dishes, couriers, loot discs) pay ×3. The concave exponent pays big units more in total but
  less per hit point: a 160 hp bunker pays about 14 darts, not 32. This keeps swarms rewarding
  and stops a few heavies from dominating a level.
* **Tuning `CREDIT_RATE`.** `CREDIT_RATE` = [1.6, 1.66, 1.68, 1.92, 1.57, 1.97, 1.99, 1.97]
  was solved per planet so that each planet's three levels sum to its share of the curve
  (test: ±10 % per planet, ±30 % per level, ±5 % campaign). To retune, change the levels,
  recompute `getLevelStats()` for the planet and rescale its rate.
* **Fixed credits.** Mid-bosses pay 220 → 2000 and bosses 380 → 3750, about 15 % and 25 % of
  their level.
* **Sawtooth.** Level 1 of each planet pays about 0.8× the curve, level 2 about 1.0× and
  level 3 about 1.2×. Level 3 also adds a 70-170 s boss fight, so credits per minute stay
  flat within a planet.
* **Affordability.** Per-level income runs from about 1.3k to 16k. That buys one or two
  meaningful upgrades per level: a few power levels of the current gun early on, then a
  sidekick, shield or generator tier, then the premium guns from Glacia on.

| level | name | dur | scroll | beats | avg gap | spawned | hp | est. credits | target | ratio |
| --- | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| kessra-1 | Dustfall Approach | 70 | 44 | 36 | 1.93 | 239 | 1932 | 1261 | 1500 | 0.84 |
| kessra-2 | Bonefield Mesa | 72 | 46 | 35 | 2.04 | 258 | 2563 | 1691 | 1658 | 1.02 |
| kessra-3 | Colossus Trench | 74 | 48 | 39 | 1.88 | 319 | 3257 | 2244 | 1833 | 1.22 |
| verdance-1 | Canopy Breach | 76 | 50 | 40 | 1.88 | 276 | 2249 | 1564 | 2025 | 0.77 |
| verdance-2 | Spore Delta | 78 | 52 | 40 | 1.92 | 264 | 3099 | 2197 | 2239 | 0.98 |
| verdance-3 | Hydra's Garden | 80 | 52 | 42 | 1.88 | 339 | 4105 | 3042 | 2474 | 1.23 |
| thalassa-1 | Glasswater Strait | 82 | 54 | 51 | 1.59 | 302 | 3260 | 2069 | 2735 | 0.76 |
| thalassa-2 | Drowned Rigs | 84 | 56 | 48 | 1.72 | 301 | 4443 | 2882 | 3023 | 0.95 |
| thalassa-3 | Dreadnought Deep | 86 | 56 | 51 | 1.66 | 364 | 6993 | 4224 | 3341 | 1.26 |
| umbra-1 | Gloam Descent | 88 | 46 | 53 | 1.64 | 330 | 4768 | 3135 | 3693 | 0.85 |
| umbra-2 | Crystal Throat | 90 | 48 | 52 | 1.71 | 319 | 5268 | 3885 | 4082 | 0.95 |
| umbra-3 | The Brood Vault | 92 | 50 | 56 | 1.62 | 393 | 6574 | 5187 | 4512 | 1.15 |
| cinder-1 | Ashen Causeway | 94 | 58 | 54 | 1.72 | 396 | 9314 | 4094 | 4987 | 0.82 |
| cinder-2 | Slag Rivers | 96 | 60 | 50 | 1.90 | 360 | 11153 | 5184 | 5512 | 0.94 |
| cinder-3 | Heart of the Forge | 98 | 62 | 54 | 1.80 | 460 | 15374 | 7335 | 6092 | 1.20 |
| glacia-1 | Whiteout Pass | 100 | 62 | 52 | 1.89 | 441 | 9627 | 5769 | 6734 | 0.86 |
| glacia-2 | Shatterfrost | 103 | 64 | 54 | 1.89 | 453 | 10219 | 7152 | 7443 | 0.96 |
| glacia-3 | Cryo Sanctum | 106 | 66 | 56 | 1.88 | 527 | 12735 | 9469 | 8227 | 1.15 |
| rift-1 | Edge of the Rift | 108 | 70 | 77 | 1.38 | 577 | 14574 | 7598 | 9093 | 0.84 |
| rift-2 | Graveyard Orbit | 111 | 72 | 77 | 1.43 | 527 | 16350 | 9468 | 10050 | 0.94 |
| rift-3 | Carrier Maw | 114 | 74 | 81 | 1.39 | 633 | 21975 | 13121 | 11109 | 1.18 |
| axiom-1 | Outer Bastions | 116 | 74 | 61 | 1.89 | 574 | 23920 | 11086 | 12278 | 0.90 |
| axiom-2 | Quota Engines | 118 | 76 | 60 | 1.95 | 558 | 25354 | 13251 | 13571 | 0.98 |
| axiom-3 | The Architect | 120 | 78 | 63 | 1.90 | 623 | 28460 | 16405 | 15000 | 1.09 |

The campaign totals about 143k credits. With 1500 starting credits and 2500 of starting gear,
ship value grows from 4k to about 147k.

## 4. Progression (reference player)

The reference player spends with a heuristic, re-run after every level:
* 55 % of the weapon budget goes to the best front gun the shop prices allow.
* 25 % goes to sidekicks.
* 8 % goes to a rear gun.
* 25 % of the ship value stays in shield + generator.
* The Lancer is bought at 12k of ship value.

Its nominal firepower (`REFERENCE_DPS`, at each boss) is 70 → 82 → 105 → 150 → 180 → 230 →
290 → 330. A typical path:
* The Kestrel climbs to p4-p5 on Kessra and Verdance.
* Sidekicks and a Tailstinger join through Thalassa and Umbra.
* The Kestrel is maxed (p10) on Cinder.
* Lance, Seekers or Prism at p2-p4 take over from Glacia.
* The endgame has Lance or Prism p4 + Shardcaster.

HP pressure is the spawned hp divided by (duration × reference DPS). It stays at 0.36-0.87,
so a player who lands every shot could clear about everything. Real accuracy is about 70 %,
which matches the 70 % kill-rate assumption. Danger comes from bullets and positioning, not
from bullet-sponge enemies. Kessra is the exception: at about 0.75 the starter gun really
cannot kill everything, which pushes the first upgrades.

## 5. Bestiary

* **Ids and roster.** Ids are prefixed by planet: `k_` `v_` `t_` `u_` `c_` `g_` `r_` `a_`.
  There are 109 types and every ENEMY_SPRITE is used. Each planet has its own roster (11-17
  types).
* **Variants.** The same archetype returns tougher and faster on later planets (test: within
  a sprite and weight class, hp never decreases).

| planet | small hp | medium hp | heavy hp | mid-boss hp (credits) | types |
| --- | --: | --: | --: | --: | --: |
| kessra | 4-10 | 30-36 | 160 | 1500 (220) | 11 |
| verdance | 5-11 | 38-60 | - | 1725 (340) | 12 |
| thalassa | 5-12 | 38-50 | 190-300 | 1985 (450) | 13 |
| umbra | 7-13 | 46-74 | - | 2280 (600) | 13 |
| cinder | 7-13 | 58-76 | 240-290 | 2625 (820) | 14 |
| glacia | 9-14 | 62-86 | - | 3020 (1100) | 14 |
| rift | 9-14 | 66-86 | 280-390 | 3470 (1500) | 15 |
| axiom | 10-14 | 66-90 | 380-450 | 4000 (2000) | 17 |

* **Weight classes.** small 4..14, medium 30..90, heavy 150..450, mid-boss 1500..4000. No
  enemy falls in the gaps, so each class reads instantly.
* **Colour identity.** Palettes must CONTRAST with the terrain; the enemy artist confirmed
  that matching palettes blend in. Each planet uses 2-3 of its biome's contrasting palettes
  (`PLANET_PALETTES`), and its boss uses one of them:

  | planet | identity | boss |
  | --- | --- | --- |
  | Kessra | cobalt / crimson / steel | crimson Colossus |
  | Verdance | crimson / amber / bone | amber Hydra |
  | Thalassa | amber / bone / crimson | crimson Dreadnought |
  | Umbra | toxic / violet / cobalt | toxic Hive |
  | Cinder | steel / cobalt / toxic | steel Forge |
  | Glacia | crimson / amber / violet | violet Cryo |
  | Rift | amber / toxic / steel | steel Voidcarrier |
  | Axiom | crimson / toxic / violet | crimson Architect |
* **Bullet colours.** Enemy bullets also avoid the terrain colours (`BIOME_BULLET_COLORS`):
  pink/violet/red on sand, red/pink/orange on canopy, orange/red/yellow on water,
  orange/yellow/pink in caves, white/cyan/violet/yellow on lava, red/orange/pink/violet on
  ice, warm colours in space, orange/yellow/pink/cyan on the citadel.
* **Layers.** Ground units (`gr_*`, move `ground` / `groundMove`) appear only on land biomes.
  Sea units (`sea_*`) appear only in ocean levels. Hazards (`hz_*`, `drift`) appear mostly in
  the Rift and Umbra, plus Thalassa mines and Cinder slag boulders.
* **Loot and intel.**
  * Each level has a loot disc (`*_loot`, strafes across, drops power 70 % plus armor or
    shield 30 %) 2-3 times.
  * Land planets have a relay dish (`*_relay`); Thalassa and the Rift use a courier saucer.
    It drops the level's intel (100 %) plus power 40 %.
  * Gameplay drops intel once per level; the mid-boss is its fallback.
* **Mid-bosses.** Each level 2 has a frigate, carrier or destroyer at about 60 % of the
  duration, flagged with a WARNING banner, followed by about 15 s of light escorts. Gameplay
  forces its move to `hover`.

## 6. Bosses

| boss | planet | hp | phases | parts | parts hp | credits | TTK (ref DPS × 0.7) |
| --- | --- | --: | --: | --: | --: | --: | --: |
| Sandmaw Colossus | kessra | 3500 | 3 | 5 | 960 | 380 | ~71 s |
| Thornback Hydra | verdance | 4960 | 3 | 5 | 1320 | 620 | ~86 s |
| Brine Dreadnought | thalassa | 7030 | 3 | 6 | 2280 | 850 | ~95 s |
| Gloam Matriarch | umbra | 9950 | 3 | 5 | 1740 | 1100 | ~94 s |
| Crucible Forge | cinder | 14080 | 4 | 5 | 2200 | 1500 | ~111 s |
| Rime Sentinel | glacia | 19940 | 3 | 5 | 2540 | 2050 | ~123 s |
| Nyx Voidcarrier | rift | 28240 | 4 | 6 | 5400 | 2800 | ~140 s |
| The Architect | axiom | 40000 | 4 | 6 | 6300 | 3750 | ~174 s |

* **HP curve.** HP grows ×1.42 per planet (3500 → 40000). The time-to-kill assumes the body
  takes the damage; destroying parts first removes their guns (parts are optional).
* **Phases.** Every phase changes the set of bullet patterns. Minion spawns start in phase 1
  for the hive and the carrier (the spawner bosses) and in phase 2 for the others. Spawn
  intervals never grow and the final phase always spawns. The final phases stack 3-4
  patterns.
* **Placement.** Parts sit exactly on the sockets drawn on each body. `BOSS_MOUNTS`
  (`src/art/b_boss_mounts.ts`) is read directly by `src/data/bosses.ts`. Attack origins
  (`from`) are body muzzles or socket points, and rings and spirals come from the core.
* **Retuning.** If fights feel long, scale boss hp in one place. The test keeps the
  reference time-to-kill within 45-180 s.

## 7. Level design

* **Length and scroll.** Duration runs 70 s (kessra-1) to 120 s (axiom-3); scrollSpeed runs
  44-78 (caves 46-50).
* **Pace.** A beat is a group of waves starting within 0.9 s. A new beat arrives every
  1.4-2.0 s on average, with gaps of at most about 4.4 s. The validator allows a 4 s average
  and 6 s maximum; the tests allow 1.3-3.5 s average and 5 s maximum. The first wave comes by
  1 s, and the last 10 s spawn more enemies per second than the level average (crescendo
  test).
* **Structure.**
  1. teach: new unit alone, wide spacing;
  2. build-up: combinations, ground under air;
  3. first climax;
  4. breather with relay or loot (intel and power);
  5. test: harder combinations (level 2: the mid-boss window with light escorts);
  6. short breather;
  7. crescendo: about 10 s of layered V's, walls, pincers and ambushes (level 3: straight
     into the boss).
* **Planet signatures** (taught on level 1, tested on level 2, combined on level 3):
  * **Kessra:** tank convoys on the ore road under dart V's, turret lines, the bunker ring.
  * **Verdance:** canopy ambushes (`rise`) behind the player, crawler swarms, spinner spirals,
    bloom silos.
  * **Thalassa:** skiff and gunboat flotillas, drifting minefields, tide-ray needle rain, flak
    bombers, destroyers.
  * **Umbra:** rock falls (scree and boulders) under paired Gloom-eye laser gates, divers,
    crystal spinners.
  * **Cinder:** comet packs hunting the player, bomber runs over silo banks, gunships, ring16
    bunkers.
  * **Glacia:** laser fences of wardens over walker packs, needle turrets, battery fans,
    hailstone rings.
  * **Rift:** asteroid shoals with monoliths, pulsing graviton minefields, comet packs, picket
    gunships.
  * **Axiom:** turret grids with rampart flanks, laser gates, everything at full speed.
* **Pattern blocks.** The blocks live in `src/data/waves.ts` and output plain WaveDefs:
  * `vee` / `vees` and `line`;
  * `wall` (full width) and `arc` (crescent);
  * `col` / `cols` (columns) and `snake` / `snakes` (sine columns);
  * `loop` (circle columns) and `swoop` (left-and-right pincer);
  * `strafe` / `cross` (side entries) and `rise` (ambush from below);
  * `dives` and `ground` / `convoy(s)` (terrain units);
  * `swarm` (random) and `field` (hazards at mulberry32-seeded positions, deterministic).
* **Wave semantics** (the director implements them as specified):
  * `x` is 0..1 across the 264 px playfield.
  * Column, single and random waves stream one unit every `interval` (default 0.35 s).
  * Line, v, wall and arc waves spawn all at once, `spacing` px apart (default 24).
  * `mirror` adds a copy at 1-x with swoopL and swoopR swapped.
  * Strafers enter from the side nearest x; `rise` enters at the bottom edge.

## 8. Story (intel)

There are 24 transmissions, one per level, carried by that level's relay or courier. The
player is a freelance corsair hired by LANTERN (Ysolde Marr, Free Colonies) against the Axiom
Directorate. The cast:
* RUST, the hangar barge mechanic;
* Dr. Senna VAEL, a defector;
* intercepted Directorate nodes;
* a dead corsair's black box;
* THE ARCHITECT.

The twist lands on Glacia and the Rift. The Directorate strip-mines to build a gate that
seals the growing Rift, which the colonists' jump drives tore open, and it treats people as
raw material. Vael's "third way" is to break the Architect's will and take the gate without
the camps.

## 9. What `validateContent()` enforces

* **Ids, names, references.**
  * Ids are unique per list and globally across shop items and enemies + bosses.
  * Names are ≤ 18 characters, boss titles ≤ 24, briefings ≤ 120, descriptions ≤ 110.
  * Every unlockLevel exists, and START_LOADOUT is valid and unlocked.
* **Ship parts.**
  * Hull ids are exactly HULL_SPRITES, within their stat ranges.
  * The first shield and generator are sh_veil and gen_cell, with at least 5 of each.
  * There is exactly one front weapon per FrontPattern and one rear weapon per RearPattern,
    and the first front weapon is the pulse_blaster.
  * Projectile, colour and sfx keys exist.
  * upgradeBase / cost is 0.25..0.65.
  * Weapon colours are distinct per slot and prices increase in every category.
  * Sidekick ids are exactly SIDEKICK_SPRITES with the matching pattern.
* **Enemies.**
  * Sprite, palette, bullet sprite and colour exist, and layer matches sprite.
  * Ground and sea units use only surface moves; air units never do.
  * Fire `none` means rate 0; missile goes with eb_missile and laser with eb_laser.
  * Every ENEMY_SPRITE is used, and every enemy is used by some level.
* **Bosses.**
  * The 8 ids use the `boss_<id>` sprites, with 2-4 phases and decreasing untilHp ending at 0.
  * Each phase uses different patterns from the previous one.
  * Minions are air units whose spawns escalate.
  * Each boss has 2-6 parts, each on a matching, unused socket of the body art.
  * Muzzles sit on muzzles or sockets.
* **Planets.**
  * There are 8, in campaign order with the ARCHITECTURE.md names and biomes.
  * Map positions stay inside x 0.15-0.85 / y 0.12-0.88, and the route climbs.
  * Each planet has a 2-3 palette identity that contrasts with its terrain.
  * Each lists its 3 levels, and each level belongs to exactly one planet.
* **Levels.**
  * Ids follow `<planet>-<n>`, with matching biome, duration and scroll ranges.
  * Waves are sorted and stay within [0, duration], including stream tails.
  * count is 1..16 and x is in [0,1]; mirrored waves stay off-centre, and lines and walls fit
    the playfield.
  * Unit layers follow the biome rules, and colour identity and readable bullet colours hold.
  * Pacing (first wave ≤ 3 s, average gap ≤ 4 s, max gap ≤ 6 s, a wave in the last 8 s).
  * Level 3 has the planet's boss and no mid-boss. Level 2 has a mid-boss built on
    frigate / carrier / destroyer, 1500-4000 hp, at 45-75 % of the duration.
  * Every level intel exists, is carried with ≥ 90 % certainty, and each intel is used
    exactly once.
