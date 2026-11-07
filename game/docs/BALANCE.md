# Nova Corsair: balance and content design

Owner: content (`src/data/**`). Every number below is real data from `src/data` or is computed
by the model in code, so the document cannot drift from the game:

* `src/data/balance.ts`: credit curve, level-clear bonus, measured hit rates (uptime).
* `src/data/progression.ts`: the reference player (what it buys, what it fires).
* `src/game/arsenal/scaling.ts` `weaponFireStats()`: the exact cadence, energy and DPS the guns
  fire. The content model uses it directly.

`tests/content.test.ts` holds the content to this document. `validateContent()`
(`src/data/validate.ts`) checks every cross-reference and design rule listed in §9.
`tools/playtest.mjs` (§10) plays levels with the autopilot and measures what this document
predicts.

## 1. Damage model (shared with gameplay)

* **Player DPS.** For a weapon at power p, `weaponFireStats(def, p)` gives:
  * DPS = `damage × fireRate × PROJECTILES_AT_P1 × M(p)`, with `M(p) = 1 + 0.45 (p-1)`
    (×5.05 at p10). `PROJECTILES_AT_P1`: pulse 1, scatter 3, gatling 1, lance 1, seeker 2,
    helix 2, mortar 1, prism 1, tail 1, flame 1, mines 1, arc 3, seekers 2.
  * Cadence ×`R(p)` (+2.5-6 % per level, by pattern). Extra power adds projectiles and
    cadence; it never changes the DPS formula.
  * Energy per second = `energyPerShot × fireRate × E(p)`, `E(p) = 1 + 0.05 (p-1)` (×1.45 at
    p10).
* **One target is not a swarm.** Against a single boss, the model counts only the share of a
  volley that can hit it (`singleTargetShare`, a boss seen under ±9.6° from the ship):
  * the Fanfire Scatter fan opens from ±10° to ±40.6°, so it lands 96 % at p1 and 24 % at p10;
  * the Shatterprism shards open from ±10° to ±30°, so it lands 100 % at p1 and 59 % at p10;
  * every other front gun lands its whole volley.
  * Drones: twin needles (±9°) and shards (±14°) count 0.5, rockets 0.9, the orbiter 0 (it
    only grinds what it touches), pods and the charge beam 1. Rear guns count 0.2, since the
    autopilot never leaves mode A.
* **Bosses (gameplay rules).**
  * Shots hit destroyable parts first, and parts absorb that damage.
  * The pulsing core passes ×1.5 to the body.
  * A piercing shot damages the boss once per shot (the first element it touches).
  * In-level `power` pickups add +1 front power for the rest of the level (capped at 10).
* **Enemy bullets.** Damage is fixed per sprite by `ENEMY_BULLET_DAMAGE`: dot 2, orb 3,
  needle 3, ring 4, bigorb 6, missile 7, laser 1 per 0.1 s. Content picks the sprite by
  threat: fodder fires dots, line units fire orbs or needles, heavies fire rings, flak shells
  are orbs (their 6 fragments stay at 3 dmg), and missiles can be shot down.
* **Survivability.** Sparrow (20 armor) + Veil Screen (10) = 30 points. That is 10 orb hits
  or 15 dot hits. Lancer + Veil takes 12 orb hits (test: 8-12).
* **Contact damage.** Air units: 8 (≤14 px) / 10 (≤20) / 14 (≤28) / 18 (≤40) / 26 (bigger),
  plus ⌊tier/2⌋. Kamikazes: 12 + tier. Ground and sea units: 0 (you fly over them). Hazards
  use explicit values.

## 2. Ship parts

### Hulls (armor 16..60, speed 120..200, hit radius 3..6)
| id | name | cost | armor | speed | hitR | drone mounts | unlock |
| --- | --- | --: | --: | --: | --: | --: | --- |
| sparrow | Sparrow Skiff | 0 | 20 | 150 | 4 | 1 | start |
| lancer | Lancer Interceptor | 5000 | 26 | 180 | 3.5 | 2 | kessra-2 |
| bulwark | Bulwark Brawler | 14000 | 40 | 130 | 5 | 2 | verdance-2 |
| wraith | Wraith Ghostwing | 26000 | 32 | 200 | 3 | 2 | thalassa-3 |
| tempest | Tempest Vanguard | 48000 | 46 | 175 | 4 | 2 | cinder-1 |
| leviathan | Leviathan Ark | 90000 | 60 | 125 | 6 | 2 | glacia-3 |

The Lancer is the first must-buy because it adds the second drone mount. After that, each
hull is a different trade-off:
* Bulwark buys armor with speed.
* Wraith buys a tiny hitbox with armor.
* Tempest gets all three, at a price.
* Leviathan is the 90k post-campaign or farming goal.

### Shields and generators: the energy budget
| shield | cost | cap | regen/s | e/pt | drain e/s | unlock |
| --- | --: | --: | --: | --: | --: | --- |
| Veil Screen `sh_veil` | 1000 | 10 | 1.5 | 2 | 3 | start |
| Aegis Weave `sh_aegis` | 4000 | 15 | 2.2 | 2 | 4.4 | kessra-1 |
| Bastion Field `sh_bastion` | 9500 | 22 | 3 | 2.2 | 6.6 | verdance-1 |
| Halo Lattice `sh_halo` | 19000 | 30 | 4 | 2.4 | 9.6 | thalassa-2 |
| Paragon Ward `sh_paragon` | 34000 | 40 | 5.2 | 2.5 | 13 | umbra-3 |
| Eclipse Mantle `sh_eclipse` | 60000 | 54 | 6.5 | 2.8 | 18.2 | glacia-2 |

| generator | cost | cap | out e/s | paired shield drain | left for guns | unlock |
| --- | --: | --: | --: | --: | --: | --- |
| Ember Cell `gen_cell` | 1000 | 50 | 15 | 3 | 12 | start |
| Flux Coil `gen_coil` | 3500 | 70 | 21 | 4.4 | 16.6 | kessra-1 |
| Ion Furnace `gen_furnace` | 9000 | 95 | 28 | 6.6 | 21.4 | kessra-3 |
| Quasar Core `gen_quasar` | 18000 | 125 | 36 | 9.6 | 26.4 | thalassa-1 |
| Stellar Heart `gen_helion` | 32000 | 165 | 46 | 13 | 33 | umbra-2 |
| Singularity Well `gen_well` | 60000 | 220 | 60 | 18.2 | 41.8 | cinder-3 |

The guns fire through `trySpendEnergy`. Shield regeneration draws first, and only while the
shield is below full. A volley the generator cannot pay is skipped. The rear gun holds fire
while the front gun is starved.

Drain at full fire with the shield regenerating, against each generator (`ok` = sustained,
`-x` = deficit in energy/s), from `weaponFireStats()`:

| kit | gun e/s | shield e/s | total | Ember Cell 15 | Flux Coil 21 | Ion Furnace 28 | Quasar Core 36 | Stellar Heart 46 | Singularity Well 60 |
| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| Kestrel Coilgun p1 + Veil Screen | 10 | 3 | 13 | ok | ok | ok | ok | ok | ok |
| Kestrel Coilgun p5 + Veil Screen | 12 | 3 | 15 | ok | ok | ok | ok | ok | ok |
| Kestrel Coilgun p10 + Veil Screen | 14.5 | 3 | 17.5 | -2.5 | ok | ok | ok | ok | ok |
| Kestrel Coilgun p4 + Aegis Weave | 11.5 | 4.4 | 15.9 | -0.9 | ok | ok | ok | ok | ok |
| Kestrel Coilgun p10 + Aegis Weave | 14.5 | 4.4 | 18.9 | -3.9 | ok | ok | ok | ok | ok |
| Rattler Gatling p6 + Aegis Weave | 19.5 | 4.4 | 23.9 | -8.9 | -2.9 | ok | ok | ok | ok |
| Kitehawk Seekers p5 + Bastion Field | 21 | 6.6 | 27.6 | -12.6 | -6.6 | ok | ok | ok | ok |
| Starpiercer Lance p3 + Aegis Weave | 22 | 4.4 | 26.4 | -11.4 | -5.4 | ok | ok | ok | ok |
| Starpiercer Lance p5 + Bastion Field | 24 | 6.6 | 30.6 | -15.6 | -9.6 | -2.6 | ok | ok | ok |
| Starpiercer Lance p5 + Halo Lattice | 24 | 9.6 | 33.6 | -18.6 | -12.6 | -5.6 | ok | ok | ok |
| Starpiercer Lance p10 + Paragon Ward | 29 | 13 | 42 | -27 | -21 | -14 | -6 | ok | ok |
| Shatterprism p10 + Paragon Ward | 31.3 | 13 | 44.3 | -29.3 | -23.3 | -16.3 | -8.3 | ok | ok |
| Thunderhead Mortar p5 + Halo Lattice | 28.8 | 9.6 | 38.4 | -23.4 | -17.4 | -10.4 | -2.4 | ok | ok |
| Thunderhead Mortar p10 + Eclipse Mantle | 34.8 | 18.2 | 53 | -38 | -32 | -25 | -17 | -7 | ok |

* **Starting kit.** The start kit is sustained: the Kestrel p1 (10 e/s) plus the Veil (3 e/s)
  is 13 of the Ember Cell's 15. The cell holds up to p5 (12 + 3 = 15).
* **The trade-off.** Upgrades soon outgrow it:
  * The first real generator decision is the Flux Coil, needed for Kestrel p6-p10 or for the
    Aegis Weave.
  * The Lance at p5 needs a Quasar Core with a Bastion, a Paragon with a p10 Lance needs the
    Stellar Heart, and a maxed Mortar under the Eclipse Mantle needs the Singularity Well.
  * The buffer (`capacity`, 50..220) absorbs short deficits. A deficit of a few e/s only
    shows when the shield refills mid-fight. A large one starves the guns.

Drones draw no energy at all.

### Front weapons (one per pattern; upgrade n→n+1 costs `upgradeBase × n`)
| id | name | cost | upg | dmg | volleys/s p1 | proj/s p1 | DPS p1 | DPS p5 | DPS p10 | e/s p1 | e/s p5 | e/s p10 | to p10 | unlock |
| --- | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --- |
| pulse_blaster | Kestrel Coilgun | 500 | 300 | 3 | 10 | 10 | 30 | 84 | 152 | 10 | 12 | 14.5 | 14000 | start |
| scatter_fan | Fanfire Scatter | 1500 | 750 | 2.6 | 5 | 15 | 39 | 109 | 197 | 12 | 14.4 | 17.4 | 35250 | start |
| gatling_rattler | Rattler Gatling | 3500 | 1500 | 4 | 12 | 12 | 48 | 134 | 242 | 15.6 | 18.7 | 22.6 | 71000 | kessra-1 |
| helix_serpent | Serpent Helix | 6000 | 2400 | 6 | 5 | 10 | 60 | 168 | 303 | 16 | 19.2 | 23.2 | 114000 | kessra-2 |
| seeker_kite | Kitehawk Seekers | 9500 | 3600 | 11.4 | 3.5 | 7 | 80 | 223 | 403 | 17.5 | 21 | 25.4 | 171500 | kessra-3 |
| lance_star | Starpiercer Lance | 14000 | 4900 | 20 | 5 | 5 | 100 | 280 | 505 | 20 | 24 | 29 | 234500 | verdance-2 |
| prism_shatter | Shatterprism | 20000 | 6400 | 23 | 5 | 5 | 115 | 322 | 581 | 21.6 | 25.9 | 31.3 | 308000 | thalassa-1 |
| mortar_thunder | Thunderhead Mortar | 30000 | 9000 | 58.5 | 2.4 | 2.4 | 140 | 393 | 709 | 24 | 28.8 | 34.8 | 435000 | thalassa-3 |

Colours (distinct per slot): pulse cyan, scatter orange, gatling yellow, lance blue, seeker
pink, helix green, mortar red, prism white.

**Density.** Every front gun fires at least 3.5 volleys/s and 5 projectiles/s at p1; the
Mortar's slow shells fire 2.4/s. The Kestrel fires 10 bolts/s of 3 damage (30 DPS, it had 5 ×
5). The Lance and the Shatterprism fire 5 bursts/s, the Kitehawk 3.5 volleys of two missiles,
the Mortar 2.4 shells/s. Damage per projectile went down by the same factor, so DPS and energy
did not change (the Kestrel gained 20 %). Test: ≥ 8 volleys/s for the starter, and
`weaponFireStats().dps = nominalDps × M(p)` for every gun at every power.

**Gun ladder.** Each step up the ladder doubles the price, adds about 25 % base DPS, and gets
a cheaper `upgradeBase / cost` (0.60 down to 0.30).
* The Kestrel wins while the budget is small: maxed for 14k, it gives 152 DPS.
* From about 25k, the premium guns at p2-p4 overtake it.
* The mid guns are sidegrades, chosen by pattern: spread for swarms, stream for single targets,
  homing for reliability, pierce for columns, splash for crowds and bunkers.

Trade-in refunds 100 %, so experimenting costs nothing.

### Rear weapons
| id | name | cost | upg | dmg | volleys/s | proj | DPS p1 | DPS p10 | e/s p1 | e/s p10 | unlock |
| --- | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --- |
| tail_stinger | Tailstinger | 1000 | 450 | 4 | 4 | 1 | 16 | 81 | 4 | 5.8 | start |
| flame_torch | Afterburn Torch | 3000 | 1200 | 2 | 10 | 1 | 20 | 101 | 7 | 10.1 | kessra-2 |
| mine_caltrop | Caltrop Dropper | 6000 | 2200 | 30 | 1.2 | 1 | 36 | 182 | 4.8 | 7 | verdance-1 |
| arc_backlash | Backlash Arc | 10000 | 3500 | 6 | 3 | 3 | 54 | 273 | 6 | 8.7 | verdance-3 |
| seeker_rearguard | Rearguard Hunters | 16000 | 5000 | 14 | 2 | 2 | 56 | 283 | 8 | 11.6 | thalassa-2 |

Rear guns cover the threats from behind and the sides:
* Verdance's canopy ambushes (`rise`);
* the strafing columns on every planet;
* the comet packs of Cinder, the Rift and Axiom.

### Drones (left / right mounts; no energy)
| id | name | pattern | cost | dmg | rate | DPS | on one boss | unlock |
| --- | --- | --- | --: | --: | --: | --: | --: | --- |
| sk_pod | Escort Pod | pod | 1200 | 4 | 3 | 12 | 12 | start |
| sk_twin | Twinfang Drone | twin | 3500 | 4 | 3 | 24 | 12 | kessra-1 |
| sk_orbiter | Orbital Ward | orbiter | 7000 | 10 | 4 | 40 | 0 | kessra-3 |
| sk_rocket | Skyhook Rockets | rocket | 12000 | 30 | 1.2 | 36 | 32.4 | verdance-2 |
| sk_shard | Shardcaster | shard | 20000 | 9 | 2.2 | 59.4 | 29.7 | thalassa-1 |
| sk_charge | Stormcharge Pod | charge | 32000 | 160 | 0.4 | 64 | 64 | umbra-1 |

## 3. Economy

* **Kill credits.** Credits per level (kills + mid-boss + boss) follow the geometric curve
  `targetLevelCredits(i) = 1500 × 10^(i/23)`, from 1500 at kessra-1 to 15000 at axiom-3.
  The estimate assumes `KILL_RATE` = 70 % of wave enemies plus the mid-boss and boss.
* **Enemy credits.** Enemy credits = `CREDIT_RATE[planet] × hp^0.75`, and loot carriers pay
  ×3. The concave exponent pays big units more in total but less per hit point.
* **Tuning `CREDIT_RATE`.** `CREDIT_RATE` = [1.6, 1.66, 1.68, 1.92, 1.57, 1.97, 1.99, 1.97]
  keeps each planet within ±10 % of the curve (test: ±10 % per planet, ±30 % per level, ±5 %
  campaign).
* **Level-clear bonus** ("mission pay", `levelClearBonus(levelId, bossDefeated, replay)`).
  * It is paid on completion: 20 % of the level's credit target, 35 % on boss levels
    (300 → 5250).
  * A replay of a completed level pays `REPLAY_BONUS_FACTOR` = 25 % of it. Farming still pays
    the full kill credits, so it stays worthwhile without inflating the economy.
  * The bonus adds about 37k to the campaign: about 180k income plus 1500 start credits.
* **Hard difficulty** pays ×1.3 kill credits (`DIFFICULTY_SCALES`).

| level | name | dur | scroll | spawned | hp | kill credits | target | ratio | clear bonus | income |
| --- | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| kessra-1 | Dustfall Approach | 70 | 44 | 239 | 1900 | 1233 | 1500 | 0.82 | 300 | 1533 |
| kessra-2 | Bonefield Mesa | 72 | 46 | 256 | 2519 | 1659 | 1658 | 1.00 | 330 | 1989 |
| kessra-3 | Colossus Trench | 74 | 48 | 319 | 3205 | 2213 | 1833 | 1.21 | 640 | 2853 |
| verdance-1 | Canopy Breach | 76 | 50 | 276 | 2249 | 1564 | 2025 | 0.77 | 410 | 1974 |
| verdance-2 | Spore Delta | 78 | 52 | 264 | 3099 | 2197 | 2239 | 0.98 | 450 | 2647 |
| verdance-3 | Hydra's Garden | 80 | 52 | 339 | 4105 | 3042 | 2474 | 1.23 | 870 | 3912 |
| thalassa-1 | Glasswater Strait | 82 | 54 | 302 | 3260 | 2069 | 2735 | 0.76 | 550 | 2619 |
| thalassa-2 | Drowned Rigs | 84 | 56 | 301 | 4443 | 2882 | 3023 | 0.95 | 600 | 3482 |
| thalassa-3 | Dreadnought Deep | 86 | 56 | 364 | 6993 | 4224 | 3341 | 1.26 | 1170 | 5394 |
| umbra-1 | Gloam Descent | 88 | 46 | 330 | 4768 | 3135 | 3693 | 0.85 | 740 | 3875 |
| umbra-2 | Crystal Throat | 90 | 48 | 319 | 5268 | 3885 | 4082 | 0.95 | 820 | 4705 |
| umbra-3 | The Brood Vault | 92 | 50 | 393 | 6574 | 5187 | 4512 | 1.15 | 1580 | 6767 |
| cinder-1 | Ashen Causeway | 94 | 58 | 396 | 9314 | 4094 | 4987 | 0.82 | 1000 | 5094 |
| cinder-2 | Slag Rivers | 96 | 60 | 360 | 11153 | 5184 | 5512 | 0.94 | 1100 | 6284 |
| cinder-3 | Heart of the Forge | 98 | 62 | 460 | 15374 | 7335 | 6092 | 1.20 | 2130 | 9465 |
| glacia-1 | Whiteout Pass | 100 | 62 | 441 | 9627 | 5769 | 6734 | 0.86 | 1350 | 7119 |
| glacia-2 | Shatterfrost | 103 | 64 | 453 | 10219 | 7152 | 7443 | 0.96 | 1490 | 8642 |
| glacia-3 | Cryo Sanctum | 106 | 66 | 527 | 12735 | 9469 | 8227 | 1.15 | 2880 | 12349 |
| rift-1 | Edge of the Rift | 108 | 70 | 577 | 14574 | 7598 | 9093 | 0.84 | 1820 | 9418 |
| rift-2 | Graveyard Orbit | 111 | 72 | 527 | 16350 | 9468 | 10050 | 0.94 | 2010 | 11478 |
| rift-3 | Carrier Maw | 114 | 74 | 633 | 21975 | 13121 | 11109 | 1.18 | 3890 | 17011 |
| axiom-1 | Outer Bastions | 116 | 74 | 574 | 23920 | 11086 | 12278 | 0.90 | 2460 | 13546 |
| axiom-2 | Quota Engines | 118 | 76 | 558 | 25354 | 13251 | 13571 | 0.98 | 2710 | 15961 |
| axiom-3 | Architect's Core | 120 | 78 | 623 | 28460 | 16405 | 15000 | 1.09 | 5250 | 21655 |

## 4. Progression (reference player)

`referenceProgression()` (`src/data/progression.ts`) plays the campaign with a reference
player.
* **Income.** It earns each level's expected income: kill credits at 70 % plus the clear bonus.
* **Re-buy.** Before every level it re-buys its whole ship. Trade-in is 100 %, so the kit
  depends only on the ship value and the unlocks:
  * the Lancer once the ship is worth 12k, a later hull once it costs ≤ 18 % of the value;
  * the best shield costing ≤ 12 %;
  * then 62 % of the rest to the front gun with the most single-target DPS, 28 % to drones,
    and the remainder to a rear gun;
  * every generator tier is tried, and the one that fields the strongest kit wins. Every gun
    must run on it with the shield regenerating.
* **Pickups.** Fights add the level's in-level pickups: `POWER_COLLECT` = 0.8 × the expected
  `power` drops of the waves before the fight (`expectedPowerDrops`). That is 1.4 pickups before
  the Colossus and 3.5-3.9 before the last two bosses.
* **Playtests.** `tools/playtest.mjs --loadout ref` flies exactly these kits.

| level | ship value | hull | front | drones | rear | shield | generator | DPS | e/s use / out |
| --- | --: | --- | --- | --- | --- | --- | --- | --: | --: |
| kessra-1 | 4000 | Sparrow Skiff | Kestrel Coilgun p3 | - / - | - | Veil Screen | Ember Cell | 57 | 14 / 15 |
| kessra-2 | 5533 | Sparrow Skiff | Kestrel Coilgun p4 | Escort Pod / - | - | Veil Screen | Ember Cell | 83 | 14.5 / 15 |
| kessra-3 | 7522 | Sparrow Skiff | Kestrel Coilgun p5 | Escort Pod / - | - | Veil Screen | Ember Cell | 96 | 15 / 15 |
| verdance-1 | 10375 | Sparrow Skiff | Kestrel Coilgun p5 | Escort Pod / - | Tailstinger p1 | Veil Screen | Flux Coil | 99 | 19 / 21 |
| verdance-2 | 12349 | Lancer Interceptor | Kestrel Coilgun p4 | Escort Pod / Escort Pod | - | Veil Screen | Ember Cell | 95 | 14.5 / 15 |
| verdance-3 | 14996 | Lancer Interceptor | Kestrel Coilgun p5 | Escort Pod / Escort Pod | - | Veil Screen | Ember Cell | 108 | 15 / 15 |
| thalassa-1 | 18908 | Lancer Interceptor | Kestrel Coilgun p6 | Escort Pod / Escort Pod | Tailstinger p2 | Veil Screen | Flux Coil | 126 | 19.7 / 21 |
| thalassa-2 | 21527 | Lancer Interceptor | Kestrel Coilgun p7 | Escort Pod / Escort Pod | Tailstinger p3 | Veil Screen | Flux Coil | 141 | 20.4 / 21 |
| thalassa-3 | 25009 | Lancer Interceptor | Kestrel Coilgun p8 | Escort Pod / Escort Pod | Tailstinger p3 | Veil Screen | Flux Coil | 155 | 20.9 / 21 |
| umbra-1 | 30403 | Lancer Interceptor | Kestrel Coilgun p9 | Escort Pod / Escort Pod | Tailstinger p1 | Veil Screen | Flux Coil | 165 | 21 / 21 |
| umbra-2 | 34278 | Lancer Interceptor | Kestrel Coilgun p10 | Escort Pod / Escort Pod | - | Aegis Weave | Flux Coil | 176 | 18.9 / 21 |
| umbra-3 | 38983 | Lancer Interceptor | Kestrel Coilgun p10 | Escort Pod / Escort Pod | - | Aegis Weave | Flux Coil | 176 | 18.9 / 21 |
| cinder-1 | 45750 | Lancer Interceptor | Kestrel Coilgun p10 | Escort Pod / Skyhook Rockets | - | Aegis Weave | Flux Coil | 196 | 18.9 / 21 |
| cinder-2 | 50844 | Lancer Interceptor | Kestrel Coilgun p10 | Escort Pod / Skyhook Rockets | - | Aegis Weave | Flux Coil | 196 | 18.9 / 21 |
| cinder-3 | 57128 | Lancer Interceptor | Kestrel Coilgun p10 | Skyhook Rockets / Skyhook Rockets | - | Aegis Weave | Flux Coil | 216 | 18.9 / 21 |
| glacia-1 | 66593 | Lancer Interceptor | Starpiercer Lance p3 | Escort Pod / Skyhook Rockets | - | Aegis Weave | Ion Furnace | 234 | 26.4 / 28 |
| glacia-2 | 73712 | Lancer Interceptor | Starpiercer Lance p3 | Escort Pod / Skyhook Rockets | Tailstinger p4 | Aegis Weave | Quasar Core | 242 | 31 / 36 |
| glacia-3 | 82354 | Bulwark Brawler | Kitehawk Seekers p4 | Escort Pod / Skyhook Rockets | - | Bastion Field | Ion Furnace | 232 | 26.7 / 28 |
| rift-1 | 94703 | Bulwark Brawler | Kitehawk Seekers p4 | Skyhook Rockets / Skyhook Rockets | - | Bastion Field | Ion Furnace | 252 | 26.7 / 28 |
| rift-2 | 104121 | Bulwark Brawler | Kitehawk Seekers p5 | Escort Pod / Skyhook Rockets | - | Bastion Field | Ion Furnace | 268 | 27.6 / 28 |
| rift-3 | 115599 | Bulwark Brawler | Starpiercer Lance p4 | Escort Pod / Skyhook Rockets | Backlash Arc p2 | Bastion Field | Quasar Core | 295 | 35.9 / 36 |
| axiom-1 | 132610 | Bulwark Brawler | Starpiercer Lance p4 | Escort Pod / Stormcharge Pod | Backlash Arc p2 | Bastion Field | Quasar Core | 327 | 35.9 / 36 |
| axiom-2 | 146156 | Wraith Ghostwing | Starpiercer Lance p5 | Skyhook Rockets / Skyhook Rockets | - | Bastion Field | Quasar Core | 345 | 30.6 / 36 |
| axiom-3 | 162117 | Wraith Ghostwing | Starpiercer Lance p5 | Skyhook Rockets / Skyhook Rockets | - | Halo Lattice | Quasar Core | 345 | 33.6 / 36 |

Reading the curve:
* The 1500 start credits buy Kestrel p3 before the first mission.
* The Ember Cell caps the Kestrel at p5 until the Flux Coil (verdance-1).
* The Kestrel is maxed on Umbra. Drones (pods, then Skyhook Rockets) carry the mid-game.
* The Lance (Glacia) and the Kitehawk Seekers take over when the Ion Furnace or Quasar Core
  can feed them.
* Nominal single-target DPS grows ×6, from 57 to 345. Boss-fight DPS with pickups is
  `REFERENCE_DPS`: 115 → 521.
* Small dips (verdance-2, glacia-3) are the Lancer, Bulwark and shield purchases.

## 5. Bestiary

* **Ids and roster.** Ids are prefixed by planet: `k_` `v_` `t_` `u_` `c_` `g_` `r_` `a_`.
  There are 109 types and every ENEMY_SPRITE is used. Each planet has its own roster (11-17
  types).
* **Variants.** The same archetype returns tougher and faster on later planets (test: within
  a sprite and weight class, hp never decreases).

| planet | small hp | medium hp | heavy hp | mid-boss hp (credits) | types |
| --- | --: | --: | --: | --: | --: |
| kessra | 4-8 | 30-36 | 160 | 750 (220) | 11 |
| verdance | 5-11 | 38-60 | - | 1950 (340) | 12 |
| thalassa | 5-12 | 38-50 | 190-300 | 2000 (450) | 13 |
| umbra | 7-13 | 46-74 | - | 2100 (600) | 13 |
| cinder | 7-13 | 58-76 | 240-290 | 2200 (820) | 14 |
| glacia | 9-14 | 62-86 | - | 5300 (1100) | 14 |
| rift | 9-14 | 66-86 | 280-390 | 5600 (1500) | 15 |
| axiom | 10-14 | 66-90 | 380-450 | 10500 (2000) | 17 |

* **Weight classes.** small 4..14, medium 30..90, heavy 150..450, mid-boss 700..11000. No
  enemy falls in the gaps, so each class reads instantly.
  * Kessra's loot disc, relay and hornet are 6 / 6 / 8 hp, so the single-stream start gun can
    still pop the power-up carriers.
  * Kessra's shooters fire 20-30 % more often than before (autopilot runs took no damage).
* **Colour identity.** Palettes must contrast with the terrain. Each planet uses 2-3 of its
  biome's contrasting palettes (`PLANET_PALETTES`), and its boss uses one of them:

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
* **Bullet colours.** Enemy bullets avoid the terrain colours and never use cyan, the colour
  of the starter gun's stream (`BIOME_BULLET_COLORS`):
  * pink/violet/red on sand, red/pink/orange on canopy, orange/red/yellow on water;
  * orange/yellow/pink in caves, white/violet/yellow/pink on lava, red/orange/pink/violet on
    ice;
  * warm colours in space, orange/yellow/pink/red on the citadel.
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
  duration, flagged with a WARNING banner, followed by about 15 s of light escorts.
  * Air mid-bosses hover for 45 s, then retreat.
  * The Tidewall Destroyer (sea) steams against the scroll at 40 px/s, so it drifts down at
    16 px/s and stays on screen about 40 s. At its old 12 px/s it crossed the screen in 14 s
    and always escaped.

## 6. Bosses and mid-bosses

**Fight length.** fight = hp / (reference fight DPS × uptime). Uptime is the share of the
nominal single-target DPS the autopilot lands, measured per fight with the reference kit (§10).
* Core bosses take ~1.0 with the Kestrel or homing drones.
* The core-less Dreadnought takes 0.56, its six parts eating the stream.
* Mid-bosses take 0.35-0.9: the carriers' fighters and the escorts soak fire.
* A human lands about `HUMAN_AIM` = 80 % of the autopilot's hits ("human est.").

| boss | planet | hp | parts hp | credits | ref fight power | ref fight DPS | uptime | model fight | human est. |
| --- | --- | --: | --: | --: | --: | --: | --: | --: | --: |
| Sandmaw Colossus | Kessra | 3100 | 860 | 380 | 6.4 | 115 | 0.97 | 28 s | 35 s |
| Thornback Hydra | Verdance | 5350 | 1440 | 620 | 6.4 | 127 | 0.9 | 47 s | 58 s |
| Brine Dreadnought | Thalassa | 5400 | 1740 | 850 | 10 | 182 | 0.56 | 53 s | 66 s |
| Gloam Matriarch | Umbra Deep | 6400 | 1120 | 1100 | 10 | 176 | 0.69 | 53 s | 66 s |
| Crucible Forge | Cinder | 12400 | 1960 | 1500 | 10 | 216 | 1.06 | 54 s | 68 s |
| Rime Sentinel | Glacia | 17250 | 2220 | 2050 | 6 | 304 | 1.03 | 55 s | 69 s |
| Vesper Voidcarrier | The Rift | 24500 | 4700 | 2800 | 7.5 | 453 | 0.95 | 57 s | 71 s |
| The Architect | Axiom Citadel | 31500 | 4960 | 3750 | 8.9 | 521 | 1.02 | 59 s | 74 s |

| mid-boss | level | hp | credits | ref fight power | ref fight DPS | uptime | model fight | human est. |
| --- | --- | --: | --: | --: | --: | --: | --: | --: |
| Sirocco Frigate | kessra-2 | 750 | 220 | 4.9 | 94 | 0.8 | 10 s | 12 s |
| Canopy Carrier | verdance-2 | 1950 | 340 | 4.9 | 106 | 0.64 | 29 s | 36 s |
| Tidewall Destroyer | thalassa-2 | 2000 | 450 | 8.4 | 159 | 0.57 | 22 s | 28 s |
| Gloam Frigate | umbra-2 | 2100 | 600 | 10 | 176 | 0.42 | 28 s | 36 s |
| Furnace Carrier | cinder-2 | 2200 | 820 | 10 | 196 | 0.38 | 30 s | 37 s |
| Blizzard Frigate | glacia-2 | 5300 | 1100 | 3.9 | 282 | 0.88 | 21 s | 27 s |
| Lamprey Carrier | rift-2 | 5600 | 1500 | 6.8 | 334 | 0.67 | 25 s | 31 s |
| Prefect Frigate | axiom-2 | 10500 | 2000 | 7 | 435 | 0.87 | 28 s | 35 s |

* **Planet 1 is tuned for the start gun.** With the Kestrel at p2 / p3 (the start gun plus one
  or two upgrades or pickups), the model gives the Colossus 74 / 56 s and the Sirocco Frigate
  22 / 16 s. A player who re-bought everything (Kestrel p5 + pod) beats the tutorial planet
  about twice as fast. From Verdance on, the reference kit is the target: bosses 45-75 s,
  mid-bosses 20-35 s (tests).
* **HP curve.** HP grows every planet (3100 → 31500 for bosses, 750 → 10500 for mid-bosses).
  The steps follow the reference kit's DPS, not a fixed ratio:
  * the plateau from Thalassa to Umbra is the maxed Kestrel;
  * the Cinder jump is the homing Skyhook Rockets;
  * the Rift / Axiom jump is the Lance plus 3-4 power pickups.
* **Parts.** Destroyable parts keep about 15-30 % of the body hp: they scale with the body
  when it is retuned. Destroying them first removes their guns (they are optional).
* **Phases.** Every phase changes the set of bullet patterns.
  * Minion spawns start in phase 1 for the hive and the carrier (the spawner bosses) and in
    phase 2 for the others.
  * Spawn intervals never grow and the final phase always spawns.
  * The final phases stack 3-4 patterns.
* **Placement.** Parts sit exactly on the sockets drawn on each body. `BOSS_MOUNTS`
  (`src/art/b_boss_mounts.ts`) is read directly by `src/data/bosses.ts`. Attack origins
  (`from`) are body muzzles or socket points, and rings and spirals come from the core.
* **Retuning.** Fight length is linear in hp. To retune a fight:
  1. measure it with `tools/playtest.mjs`;
  2. scale its hp by target / measured;
  3. keep both hp curves strictly increasing;
  4. update `BOSS_UPTIME` / `MIDBOSS_UPTIME_BY_ID` if the kit changed.

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
  * Strafers enter from the side nearest x; `rise` units enter at the bottom edge, 0.75 s
    after their wave time (gameplay telegraphs them).

## 8. Story (intel)

There are 24 transmissions, one per level, carried by that level's relay or courier. The
player is a freelance corsair hired by LANTERN (Ysolde Marr, Free Colonies) against the Axiom
Directorate, which is strip-mining the Outer Marches. The cast:
* RUST, the hangar barge mechanic;
* Dr. Senna VAEL, a defector;
* intercepted Directorate nodes;
* a dead corsair's black box;
* THE ARCHITECT.

The twist lands on Glacia and the Rift. The Directorate strip-mines to build a gate that
seals the growing Rift, which the colonists' jump drives tore open, and it treats people as
raw material. Vael's "third way" is to break the Architect's will and take the gate without
the camps.
* **Before or after the boss.** A level's transmission is dropped mid-level and is kept even
  on a failed run, so no message assumes that its own level's boss is already dead.
* **American spelling.** The text uses American spelling throughout.

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
  * Drone (sidekick) ids are exactly SIDEKICK_SPRITES with the matching pattern.
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
    frigate / carrier / destroyer, 700-11000 hp, at 45-75 % of the duration.
  * Every level intel exists, is carried with ≥ 90 % certainty, and each intel is used
    exactly once.

## 10. Playtesting and calibration

`node tools/playtest.mjs` starts its own Vite server (`--port`, default 5211) and plays levels
in headless Chromium at 360×640 with `?scene=Game&level=<id>&mute=1&speed=<n>`, under the
in-game autopilot (`&bot=1`, `src/game/bot.ts`). Without the bot it falls back to a god-mode
aim driver.

**Options.**
* `--levels kessra-1,thalassa` takes level ids or planet ids.
* `--loadout start|ref|<JSON>` sets the kit, and `--set front=lance_star,frontPower=4` patches
  it. The kit is written into the save in localStorage before load.
* `--god`, `--speed`, `--seed` / `--runs`, `--json <file>`.
* `--skip` jumps straight to the fight. Add `--bonus auto` to emulate the expected pickups.
* `--model` prints the reference progression.

**Columns.** It prints one row per run:
* `bossKill`, the bot metric from the boss entrance to the kill, and `fight`, from the end of
  the invulnerable entrance;
* landed DPS, the front power when the fight starts, and `eff` (landed / nominal
  single-target DPS);
* mid-boss kill time or `escaped`;
* kills/spawned, credits;
* raw damage, armor damage, hits, `wouldDie` (god runs replay the hits on a shadow model);
* starved volleys.

**Calibration (done for this tuning).**
* **Run A** flew one fixed kit (Kestrel p10 + 2 Twinfangs) against every fight. It showed
  the geometry spread: core bosses 0.65-0.73 of nominal, the Dreadnought 0.48, mid-bosses
  0.35-0.44 with that kit.
* **Run B** flew each level's reference kit straight into its fight (`--skip --bonus auto`)
  and gave the per-fight uptimes in `src/data/balance.ts`.
* **Full levels.** Full-level runs with real waves and pickups then validated each fight and
  recalibrated the mid-boss uptimes, which are lower with escorts on screen.


**Measured, before → after** (autopilot; boss = `bossKill`, entrance → kill; mid-boss = spawn
→ kill; seed = level seed unless noted). Before = the catalogue at the start of this pass
(Kestrel 5 × 5/s, Colossus 3500 → Architect 40000, mid-bosses 1500 → 4000), with the
piercing double-hit then present. After = final data, mortal bot at speed 2 unless "god".

| fight | kit | before | after |
| --- | --- | --: | --: |
| Colossus (kessra-3) | start loadout, no pickups | 156.5 s (god) | 108.8 s at p1; 77.9 s when one pickup drops (p2) |
| Colossus (kessra-3) | start gun + 1-2 upgrades (p3) | — | 57.6 / 58.3 s (at 3000 hp; ≈ 60 s at 3100) |
| Colossus (kessra-3) | reference (Kestrel p5 + pod) | 35.1 s (god) | 31.6 s (god, skip) |
| Sirocco Frigate (kessra-2) | start loadout | escaped | 32.6 s |
| Sirocco Frigate (kessra-2) | start gun p2 | — | 16.9 s (at 800 hp, one pickup → p3) |
| Hydra / Dreadnought / Matriarch | reference | — / 62.1 s / — | 48.6 / 56.8 / 57.4 s |
| Forge / Rime Sentinel | reference | — | 57.0 / 53.5 s (god) |
| Voidcarrier (rift-3) | reference | 82.0 s (god) | 65.7 s (49.5 s god, another run) |
| Architect (axiom-3) | reference | 58.3 s (god, double-hit; ~110 s without) | 58.8 s |
| Tidewall Destroyer (thalassa-2) | reference | escaped (14 s on screen) | 25.0 s (god) |
| Canopy / Gloam / Furnace (v2 / u2 / c2) | reference | — | 28.9 / 28.2 / 27.2 s (god) |
| Blizzard / Lamprey / Prefect (g2 / r2 / a2) | reference | — / — / 14.1 s | 21.3 / 16-40 / 26.4 s (god) |

* **Model.** The model's boss fights went from 71-174 s to 47-59 s (planets 2-8), and its
  mid-boss fights from 12-25 s to 20-30 s.
* **Spread.** The Lamprey Carrier is the noisiest fight: its launched fighters soak 0.5-0.9 of
  the fire, depending on the run. Its hp sits at the mean.
* **Damage.** The mortal autopilot finished every validation level, taking 0-12 raw damage
  (it dodges very well). Kessra shooters were made 20-30 % more aggressive in response.
* **Start kit.** Kill ratio with the start loadout went from 52 / 38 / 46 % to 79 / 37-40 /
  49-57 % on kessra-1/2/3, with 917 / 599 / 1475 → 1337 / 610-686 / 1513-1806 credits
  (2-7 % of gems are lost off-screen).
* **Reference kit.** With the reference kits, levels clear 70-100 % of the spawns.
