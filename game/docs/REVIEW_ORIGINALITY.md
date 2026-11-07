# Review: originality, IP and text quality (Nova Corsair)

Reviewer: originality / IP / text-quality reviewer (read-only). Date: 2026-11-07.
Scope: `src/data/**`, `src/scenes/**`, `src/ui/**`, the player-facing strings in `src/game/**`, `src/art/**` (gallery), the in-game
screenshots under `screens/`, `index.html`, Android strings, `README.md`, `docs/*.md`. I compared all of it against the 12
reference screenshots, which show the 1995 game *Tyrian*.

Line numbers are from the working tree at review time. Several owners were editing while I reviewed, so grep for the quoted
text if a line has moved. Every proposed replacement passes the content validator limits: names ≤ 18 characters, boss
titles ≤ 24, descriptions ≤ 110, briefings ≤ 120, intel titles ≤ 28, intel bodies ≤ 400. Every proposed status-bar text
fits its 49-glyph budget. No test or tool asserts on any string I propose to change.

Severity:
- **blocker**: fix before any public build. It is a trademark risk or a breach of the hard rule in AGENT_RULES §4.
- **major**: visible copying, a contradiction, or misleading text.
- **minor**: polish, or an optional extra distance from the reference.

## 1. Prioritised findings

### Blockers

| # | Sev | File:line (owner) | Current text | Proposed replacement |
|---|---|---|---|---|
| B1a | blocker | `src/config.ts:4` (FOUNDATION, contract file, so the integrator applies it) | `GAME_SUBTITLE = 'Raid on the Outer Worlds'`. It is shown under the logo on the title screen. | `'Raid on the Outer Marches'` |
| B1b | blocker | `src/scenes/MapScene.ts:156` (UI-META) | `'OUTER WORLDS - SECTOR 7'` | `'OUTER MARCHES - SECTOR 31'`. This also drops the echo of the well-known "Sector 7" from *Final Fantasy VII*. |
| B1c | blocker | `src/scenes/LevelEndScene.ts:153` (UI-FLOW) | `'THE OUTER WORLDS ARE FREE'` | `'THE OUTER MARCHES ARE FREE'` |
| B1d | blocker | `src/data/planets.ts:14` (CONTENT) | `The jungle that fed the Outer Worlds, rendered into fuel valley by valley. Ambush country.` | `The jungle that fed the Outer Marches, rendered into fuel valley by valley. Ambush country.` |
| B1e | blocker | `src/data/shields.ts:32` (CONTENT) | `... The finest shield in the Outer Worlds.` | `... The finest shield in the Outer Marches.` |
| B1f | blocker | `src/data/intel.ts:30` (in_green) | `Verdance fed half the Outer Worlds. ...` | `Verdance fed half the Outer Marches. ...` (rest unchanged) |
| B1g | blocker | `src/data/intel.ts:86` (in_truth) | `... in ninety years it swallows every Outer World. ...` | `... in ninety years it swallows every world in the Marches. ...` |
| B1h | blocker (root cause) | `docs/MEGA_PROMPT.md:102`, comment at `src/data/intel.ts:7` | `ravage les Mondes Extérieurs` / `strip-mining the Outer Worlds` | `ravage les Marches Extérieures` / `strip-mining the Outer Marches`. The development loop re-reads MEGA_PROMPT every iteration, so the old name would come back. |
| B2a | blocker (AGENT_RULES §4) | `src/scenes/HangarScene.ts:102` (UI-META) | menu label `'UPGRADE SHIP'` | `'REFIT BAY'` (alternative: `'OUTFITTER'`) |
| B2b | blocker | `src/scenes/ShopScene.ts:74` and `:192` | header `'UPGRADE SHIP'` | `'REFIT BAY'` |
| B2c | blocker | `src/scenes/HangarScene.ts:108` | menu label `'SHIP SPECS'` | `'LOADOUT STATS'` (13 glyphs: fits both the menu row and the large-font header) |
| B2d | blocker | `src/scenes/SpecsScene.ts:32` | header `'SHIP SPECS'` | `'LOADOUT STATS'` |
| B2e | blocker | `src/scenes/ShopScene.ts:33` | category label `'LEFT SIDEKICK'` | `'LEFT DRONE'`. This is already the page's own title on the same line. |
| B2f | blocker | `src/scenes/ShopScene.ts:34` | `'RIGHT SIDEKICK'` | `'RIGHT DRONE'` |
| B2g | blocker | `src/scenes/ShopScene.ts:222` and `:246` | last row and info title `'DONE'` | `'BACK TO HANGAR'`. This matches the Specs button at `SpecsScene.ts:67`. |
| B2h | minor, optional | `src/scenes/ShopScene.ts:29-30` | `'FRONT GUN'`, `'REAR GUN'` (label and title) | `'MAIN GUN'`, `'TAIL GUN'`. The help texts on the same lines already use these words. Keep the HUD legends FRONT and REAR. |
| B2i | major (root cause) | `docs/VISUAL_TARGETS.md:31` | `Écran « Upgrade Ship » listant les 7 catégories + Done` | `Écran « Refit Bay » listant les 7 catégories + retour au hangar`. This doc tells future agents to rebuild the reference's menu. |

Why B1 is a blocker: THE OUTER WORLDS is a registered, active USPTO trademark (reg. 6420215, class 9 video game software),
held by Obsidian/Microsoft for their sci-fi RPG series. Nova Corsair uses it as the proper name of its setting, on the
title screen and in the ending. "Outer Marches" (borderlands) is original and fits the corsair theme.

Why B2 is a blocker: the shop category page reads, top to bottom, `HULL / FRONT GUN / REAR GUN / SHIELD / GENERATOR / LEFT
SIDEKICK / RIGHT SIDEKICK / DONE` under the header `UPGRADE SHIP` (see `screens/qa-orig-shop-cats-569.png`). The
reference's *Upgrade Ship* menu reads `Ship Type / Front Gun / Rear Gun / Shield / Generator / Left Sidekick / Right
Sidekick / Done`. Six of the eight labels are identical and in the same order. The hangar adds `UPGRADE SHIP` and
`SHIP SPECS`, which are word for word the reference's *Game Menu* entries. The category structure itself is a genre
mechanic and is fine. The exact wording is what has to change, and the fix is about ten string edits.

### Major

| # | Sev | File:line (owner) | Current text | Proposed replacement |
|---|---|---|---|---|
| M1a | major | `src/data/hulls.ts:8` | `...Light plating and one sidekick mount; cheap to fly, cheaper to fix.` | `...Light plating and one drone mount; cheap to fly, cheaper to fix.` |
| M1b | major | `src/data/hulls.ts:12` | `Interceptor frame with twin sidekick mounts and a slim, forgiving profile.` | `Interceptor frame with twin drone mounts and a slim, forgiving profile.` |
| M1c | major | `src/scenes/GameOverScene.ts:28` (tip) | `Sidekicks fire for free and never drain your generator.` | `Drones fire for free and never drain your generator.` |
| M1d | major | `src/data/planets.ts:22` | `...where the Hive breeds its drones in the dark.` | `...where the Hive breeds its swarms in the dark.` This keeps "drone" for the player's helpers only. |
| M1e | major | `src/data/intel.ts:56` (in_prison) | `...until it breeds drones on command.` | `...until it breeds swarms on command.` |
| M1f | minor | `README.md:12`, `README.md:133` | `sidekicks gauche/droite`, `left/right sidekicks` | `drones gauche/droite`, `left/right drones` |
| M2a | major | `src/data/intel.ts:25` (in_crawler, from Rust, kessra-3) | `Rust here, on the Magpie. That Colossus you scrapped chewed Kessra's crust for thirty years, and its ore sleds were stamped for THE RIFT, ... Anyway, the salvage paid for a new paint job, so I am happy. ...` | `Rust here, on the Magpie. That Colossus has chewed Kessra's crust for thirty years, and its ore sleds are stamped for THE RIFT, not for their Citadel. Odd routing for miners. Scrap it and the salvage is mine; I have my eye on a new paint job. The hangar is open: spend those credits before Lantern finds a use for them.` (320 chars) |
| M2b | major | `src/data/intel.ts:51` (in_routes, thalassa-3) | `I cracked the Dreadnought's navigation core. Every ore barge ...` | `I cracked the flotilla's navigation logs. Every ore barge from every world, Kessra, Verdance, Thalassa, is routed to the same coordinates, and they are not the Citadel. They are the edge of the Rift. Whatever the Directorate is building, it is building it out there, at the tear in space nobody charts on purpose.` (313) |
| M2c | major | `src/data/intel.ts:77` (in_expendable, cinder-3) | `AXIOM CENTRAL: Forge node lost. Gate assembly at 88%. ...` | `AXIOM CENTRAL: Forge node under attack. Casting halted; gate assembly frozen at 88%. Remaining segments to be tempered at Glacia under cryogenic conditions. Rift expansion rate: accelerating. Revised directive: complete the collar at any cost. All assets expendable. All populations expendable. The corsair is reclassified as weather, to be endured.` (349) |
| M3 | major | `src/scenes/IntelScene.ts:136` (UI-FLOW, empty state) | `Some missions hide encrypted data caches. Shoot down the courier ships that carry them to intercept enemy transmissions.` | `Every mission hides one data cache. Allies and enemy nodes alike ride the Directorate relay net: destroy relay dishes and courier ships to recover their transmissions.` |
| M4 | major | `README.md:9`, `README.md:131`, `docs/MEGA_PROMPT.md:102`, `docs/VISUAL_TARGETS.md:36` | `« Directive Axiome »`, `"Axiom Directive"` | `« Directorat Axiome »`, `"Axiom Directorate"`, the name used everywhere in the game. The README will likely seed the store copy. |
| M5 | major (docs) | `docs/BALANCE.md:73` | `Tyrian-style build trade-off:` | `the classic shop-shooter build trade-off:`. Shipped docs should not name the reference game. AGENT_RULES naming it as a prohibition is fine. |

Why M1 matters: "Sidekick" is the reference game's own term for its side weapons. The game is also inconsistent today:
the HUD legend says DRONES, the shop page titles and help say DRONE, the hangar help says DRONES, yet the category labels,
hull descriptions and a tip say SIDEKICK. Use "drone" everywhere the player can see it. Internal ids (`sidekickL`, `sk_*`)
stay as they are.

Why M2 matters: these three messages assume the boss of their own level is already dead. Their carrier appears halfway
through the level: `kessra.ts:126` at 29.6 s, `thalassa.ts:143` at 33.4 s and `cinder.ts:156` at 32.4 s, all before the
boss. Intel is also kept on failure (`state/progress.ts:27`), and the Game Over screen shows "TRANSMISSION RECOVERED". A
player who dies to the Colossus therefore reads "That Colossus you scrapped". The rewrites work both before and after the
boss.

Why M3 matters: the current text is wrong on three counts. Every level has a cache, most carriers are ground relay
dishes, and two thirds of the messages come from allies. The new text also explains in the fiction why Lantern, Rust and
Vael reach you through enemy relays: in_contract already says "keep this channel quiet".

### Minor: IP-adjacent names (optional extra distance)

| # | Sev | File:line | Current | Proposed |
|---|---|---|---|---|
| m1 | minor | `src/data/weapons.ts:9` | `'Kestrel Pulser'`: the starter front gun is built on the "Pulse" stem, in the same role as the forbidden *Pulse-Cannon* | `'Kestrel Coilgun'`. Its description already says "coil bolts". The id `pulse_blaster` stays; the validator needs it. Also update `docs/BALANCE.md:66,86,98,111,115,210,212`. |
| m2 | minor | `src/data/sidekicks.ts:18` | `'Satellite Ward'`, which echoes the reference's "Satellite ..." side-weapon naming | `'Orbital Ward'` (also `docs/BALANCE.md:141`) |
| m3 | minor | `src/data/bosses.ts:240` and `src/data/levels/rift.ts:165` | `'Nyx Voidcarrier'`. *EVE Online*'s iconic supercarrier is also called "Nyx". | `'Vesper Voidcarrier'` (18 chars). Briefing: `The Vesper Voidcarrier shepherds the gate collar. Gut its launch bays and break it.` Also `docs/BALANCE.md:284`. |
| m4 | minor | `src/data/generators.ts:26` | `'Helion Heart'`. Helion is a real fusion-power company, and this item is a reactor. | `'Stellar Heart'` (also `docs/BALANCE.md:63`) |
| m5 | minor | `src/scenes/MapScene.ts:69`, `HangarScene.ts:104`, `LevelEndScene.ts:285`, `HangarScene.ts:183` ("galaxy map") | `'GALAXY MAP'`: a named *Mass Effect* feature, and inaccurate because the map shows one sector | `'STAR CHART'` / `star chart` |
| m6 | info | title | "Nova Corsair" | A web check found no video game with this title. A "Nova Corsairs" miniatures faction exists, and CORSAIR is a class-9 mark of Corsair Gaming (peripherals). Run a formal USPTO/EUIPO clearance (classes 9 and 41) before store submission. |

### Minor: lore consistency

| # | Sev | File:line | Current | Proposed |
|---|---|---|---|---|
| L1 | minor | `src/data/intel.ts:99` (in_direct) | `Corsair. You are owed an explanation, so here it is. Your ancestors' jump drives tore this Rift. We were made to mend it. ...` | `Corsair. You are owed an explanation. Your ancestors' jump drives tore this Rift. Their first gate lies half-built under your seas and in your bedrock; we were made to finish it. Every world you free is a world the Rift will eat a little sooner. Turn back and I will carve your name on the gate. Continue, and I will add it to the list of things the gate was built to outlast.` (~376) |
| L2 | minor | `src/data/intel.ts:95` (in_nosaviours) | `A machine that sells children for quota ...` (the Directorate consumes people; it does not sell them) | `A machine that spends children to make quota ...` |
| L3 | minor | `src/data/intel.ts:108` (in_beforeyougo) | `...you still owe me for the paint.` (in_crawler said the salvage already paid for it) | `...you still owe me that bar tab.` This picks up in_thinskins: "Dead heroes do not pay their tab, and you still owe me." |
| L4 | minor | `src/data/levels/glacia.ts:143` | `The Rime Sentinel guards the drained seed vault. Shatter it and free the cold.` (unclear) | `The Rime Sentinel guards the drained seed vault. Shatter it and save what is left.` |
| L5 | minor | `src/data/bosses.ts:138` | title `'Queen of Umbra Deep'`. The intel only ever calls this boss "the Hive". | `'Mother of the Hive'` |
| L6 | minor | `src/data/levels/axiom.ts:162` | level name `'The Architect'`, the same as the boss name. Both the intro banner and the WARNING banner read THE ARCHITECT. | `"Architect's Core"` (also `docs/BALANCE.md:194`) |

L1 resolves a loose thread. "A shape down there ... too old to be ours" (`intel.ts:47`) and "Directorate pylons older than
the Directorate" (`intel.ts:64`) are never explained.

The rest of the story is coherent: every briefing, planet description, boss title and intercept agrees with the gate and
Rift twist, the 61% → 88% → "final segment" assembly progression, Vael's protocol, and the order of the boss kills.

### Minor: text quality

| # | Sev | File:line | Current | Proposed |
|---|---|---|---|---|
| T1 | minor | British spellings, where the UI uses American (ARMOR, `DEFENSE & POWER`, Harbor Gunboat): `hulls.ts:17` Armoured · `hulls.ts:32` armour · `weapons.ts:39` armour · `planets.ts:38` defence · `intel.ts:21` labour · `intel.ts:34` tonnes · `intel.ts:43` metre by metre · `intel.ts:94` No Saviours · `intel.ts:95` saviour · `intel.ts:108` fuelled · `intel.ts:112` defence | Armored · armor · armor · defense · labor · tons · meter by meter · No Saviors · savior · fueled · defense |
| T2 | minor | `src/data/weapons.ts:33`, `:51` | `Never wastes a shot.` · `Flattens bunkers and crowds alike.` (the subject is plural) | `Never waste a shot.` · `Flatten bunkers and crowds alike.` |
| T3 | minor | `src/data/levels/verdance.ts:64` | `...along the river delta and a Canopy carrier holds the river mouth.` | `Missile silos bloom along the delta and a Canopy carrier holds the river mouth.` |
| T4 | minor | `src/scenes/ShopScene.ts:385` | `` `${verb} ALSO SELLS YOUR ${lost} - TAP AGAIN` `` reads "BUY ALSO SELLS YOUR RIGHT DRONE" | `` `ALSO SELLS YOUR ${lost} - TAP AGAIN TO ${verb}` `` (at most 47/49 glyphs) |
| T5 | minor | `src/scenes/ShopScene.ts:455` | `'SLOT EMPTY'` (lines 265 and 448 say `'EMPTY SLOT'`) | `'EMPTY SLOT'` |
| T6 | minor | `src/scenes/ShopScene.ts:542` | the drone ENERGY/S cell renders `0 FREE` | Drop `suffix: ' FREE'`; the help line already says USES NO ENERGY. |
| T7 | minor | `src/ui/kit.ts:133` (`fit`) | truncation leaves `SINGULARITY .` (a space before the dot) in the hangar chips | `` `${str.slice(0, Math.max(1, max - 1)).trimEnd()}.` `` |
| T8 | minor | `src/scenes/GameScene.ts:384` | `'STAGE CLEAR'`, `` `${w.stats.score} PTS` `` with no thousands separators | `'ALL CLEAR'`, with the score formatted like everywhere else (38,750). The game says "mission" everywhere else. |
| T9 | minor | `src/game/pickups.ts:265` | `'INTEL ACQUIRED'`, `'transmission decoded'` (lowercase in an all-caps banner; the reader says DECRYPTED) | `'INTEL RECOVERED'`, `'NEW TRANSMISSION'` |
| T10 | minor | `src/scenes/HangarScene.ts:112` | label `'COMMS'`; the screen header says TRANSMISSIONS. "Comms" also echoes the reference's "Communications: Read incoming messages". | `'TRANSMISSIONS'` (104 px, fits beside the value) |
| T11 | minor | `src/scenes/LevelEndScene.ts:181`, `:170` | `` `SECTOR UNLOCKED: ${name}` ``, `'NEW SCORE RECORD!'` | `` `NEW WORLD UNLOCKED: ${name}` `` (at most 33/38), `'NEW HIGH SCORE!'` |
| T12 | minor | `src/scenes/HangarScene.ts:109` | `WARNING: YOUR GUNS DRAIN MORE THAN THE GENERATOR` | `WARNING: GUNS DRAW MORE THAN THE GENERATOR MAKES` (48/49) |
| T13 | minor | `src/scenes/SpecsScene.ts:33` | `NOMINAL: EVERY SHOT HITS, GUNS FIRE NONSTOP` | `NOMINAL STATS: ALL SHOTS HIT, GUNS FIRE NONSTOP` (47/49) |
| T14 | minor | `src/scenes/HangarScene.ts:222` | `RETURN TO THE TITLE SCREEN?\nYOUR PROGRESS IS SAVED.` (every other confirm dialog uses sentence case) | `Return to the title screen?\nYour progress is saved.` |
| T15 | minor | `index.html:2` | `<html lang="fr">` (the game is English) | `<html lang="en">` |
| T16 | minor | `HangarScene.missionPanel` (H < 540, i.e. 4:3 and 16:10 screens) | 2 briefing lines of 40 glyphs: 17 of 24 briefings end in "..." (for example kessra-1 `...crack the turret...`) | Allow 3 lines, or keep briefings ≤ 80 chars |
| T17 | minor | `src/data/intel.ts`, all human senders | Rust, Lantern and Vael never contract ("I am", "do not"), which sounds stilted next to the machine intercepts | Optional style pass: contractions for the human voices only. The intercepts keep their flat machine style. |
| T18 | minor | `src/data/enemies.ts:149` and others (not shown to the player today; would matter for a bestiary) | `'Lantern Moth'` vs the ally callsign LANTERN; Eclipse Bomber vs Eclipse Mantle; Ember Dart/Disc vs Ember Cell | `'Lumen Moth'`. Avoid reusing shop-item words for enemies. |

Capitalisation rule I recommend applying from now on:
- ALL CAPS for labels, status lines, toasts and banners.
- Sentence case for descriptions, briefings, intel bodies and confirm dialogs.

The status bar already uppercases its input.

No placeholder or test text is left in `src/`: no TODO, no lorem, no "INTERCEPT NUMBER n" style titles. Every intel
title is bespoke. One scratch screenshot, `screens/uiflow-intel-reading.png`, shows a demo message ("CMDR. ILSE VARRO /
KESSRA GARRISON ORDERS / the Directive convoy") that exists nowhere in the source. It was a test fixture; just make sure no
such fixture ever ships.

## 2. Explicitly fine (genre conventions, no action)

**HUD.** The right-hand vertical HUD has tall gauges for energy, shield and armour, front and rear weapon boxes with power
pips, the A/B rear-gun mode, left and right drones, the level name in an LCD, and the score at bottom left. This is a genre
convention, and `VISUAL_TARGETS.md` asked for it. The art is Nova's own:
- indigo gunmetal panels, teal neon lines, magenta accents and LED columns;
- no bronze or organic frame, no pipe or rib ornaments;
- no vertical "SHIELD / ARMOR" lettering inside the gauges;
- no green-on-black LCD.

Optional extra distance: `ENERGY_RAMP` (`ui/hud/art.ts:45`) reuses the reference's yellow-to-red energy gradient. A
teal-to-white or magenta-to-gold ramp would make the HUD unmistakably Nova's.

**Shop and hangar.** The category structure, power levels 1–10 with ‹ › arrows, the live weapon preview, the 100%
trade-in, the "NONE" row, the help line at the bottom, and the hangar bay (large ship, shield arc, drone slots, credits) are
all mechanics or layout conventions. They are fine once the B2 wording changes. Optional: draw the shield as a full dome or
hex bubble rather than an arc over the nose.

**Other genre staples.** Story messages collected and read between missions (story logs), credit gems, the "P" power-up,
WARNING banners and mission briefings.

**Names.** I checked every ship, weapon, shield, generator, drone, enemy (109), boss, planet, level, character, company and
song name against the reference. There are no matches beyond B2, M1 and m1. A web search found no collision for the boss
names.

**Sprites.** I looked at these in the gallery (`screens/qa-orig-{ui,hulls,enemies,bosses,pickups}.png`) and in the Android
icon preview:
- 6 hulls and 6 drones;
- every enemy and boss palette variant;
- the pickups, the logo, the icons and the panels.

All silhouettes are original. Nothing resembles the bronze arrowhead "USP Talon" or the silver ship with the blue dome
from the references, beyond the generic jet-fighter archetype.

**Music.** Track names are internal and never shown. The tracks are original compositions over common chord progressions;
I did not audit them note by note. "Magma Run" echoes the reference level "Lava Run": rename it only if a jukebox is ever
added.

**Offensive content, real people, real brands.** Nothing offensive. Labour camps, starvation and the "children" line suit a
Teen / PEGI 12 rating; declare them in the IARC questionnaire. No real people. The only real brand is Helion (m4). The
appId uses the developer's own namespace, which is fine.

**Accuracy and validation.** Every weapon, drone and hull description matches the real behaviour in the arsenal code. The
content validator passes. The only duplicate name is "The Architect" (L6).

**Layout.** At H 480 and 569 with the longest names and the longest intel body, everything fits except graceful
truncations (`screens/qa-orig-*-{480,569}.png`):
- the hangar loadout chips (`THUNDERHEAD MOR.`, see T7);
- the specs armament table (`REARGUARD HUNTE.`).

## 3. French localisation opportunities (English-first; list only)

1. **No i18n layer.** About 180 UI strings are inline across 11 scenes, `ui/meta`, the HUD legends and the `game/` banners
   and floating texts. The data adds 37 item descriptions, 8 planet descriptions, 24 briefings and 24 intel messages
   (sender, title, body). Suggested approach:
   - a `src/i18n/{en,fr}.ts` key table with a `t()` helper;
   - a parallel FR table keyed by content id;
   - proper nouns (ships, planets) stay in English.
2. **The fonts are ASCII only** (RetroFont TEXT_SET1, characters 32–126). French needs é è ê ë à â ç î ï ô û ù ü ÿ œ æ, the
   capitals É È À Ç Ô Œ, and « » ’. Add these glyphs to FONT.s, FONT.m and FONT.l rather than stripping accents.
3. **Glyph budgets French (+15–30%) will hit:**
   - status bar: 49 glyphs;
   - LevelEnd notices: 38 (`NOTICE_CHARS`);
   - screen titles in FONT.l: about 15 (« AMÉLIORATIONS » at 13 fits);
   - Title menu: 19 FONT.m glyphs (« NOUVELLE PARTIE » at 15 fits);
   - HUD legends SHD/ARM: 3 glyphs (« BOU »/« BLI », or icons instead);
   - intel bodies: limit 400. in_direct would be about 376 after L1, so French needs a higher limit, or English bodies
     kept ≤ 330.
4. **Hard-coded English rules.** Plurals (`TRANSMISSION${s}`), number format (`123,456` → `123 456`), and `lang` in
   `index.html` (see T15).

## 4. Method

- Read every catalogue, level, briefing and intel file. Dumped all 226 content strings with their lengths (all validator
  limits pass), simulated the UI word-wrap per box, and listed every unique word to check spelling. Spelling is clean
  apart from the British/American mix in T1.
- Grepped `src` for player strings and for every reference-game name and menu phrase.
- Read the scenes and UI code for layout budgets. All fonts are monospace: 6, 8 and 12 px per glyph.
- Rendered the gallery on port 5214 for ui, player, enemies, bosses and pickups.
- Captured Hangar, Shop, Specs, Map and the Intel reader at H 480 and 569, with a mid-campaign save using the longest
  names and the longest message.
- Ran web checks for "Nova Corsair", the "The Outer Worlds" trademark, and the boss names.
