# Nova Corsair — Architecture & conventions

High-pace **vertical scrolling space shooter** (portrait, mobile-first) with a between-missions
**upgrade shop** (hull, front gun, rear gun, shield, generator, left/right drones — called `sidekick` in code), a
**multi-planet campaign** (8 planets × 3 levels) and a dense, readable 16-bit pixel-art look.
Everything (sprites, terrain, fonts, sounds, music) is **generated procedurally in code** —
there are no binary art/audio assets, so there is no licensing risk and the APK stays small.

> Originality rule: the game is *inspired by the genre* (90s PC shoot'em-ups with an upgrade
> shop). It must never reuse names, ships, UI ornaments, levels, music or graphics from any
> existing game. All names below are original.

## Stack

| Layer | Choice |
|---|---|
| Engine | Phaser **3.90.0** (WebGL, pixelArt, Arcade-free custom collisions) |
| Language / build | TypeScript 5.8 strict, Vite 6 (`base: './'`) |
| Mobile | Capacitor 8 (`android/` committed) → APK via GitHub Actions |
| Tests | Vitest (pure logic + content validation), Playwright smoke + screenshots |

Logical resolution: **W = 320**, **H = 480..720** (depends on device aspect, computed once in
`src/config.ts`). Scale mode FIT. Gameplay playfield = left `PLAY_W = 264` px, HUD panel =
right `HUD_W = 56` px.

## Folder ownership (one owner per folder — do not edit other owners' files)

```
src/
  config.ts  types.ts  debug.ts  main.ts          FOUNDATION (contracts — change with care)
  art/keys.ts art/pixel.ts art/palettes.ts art/noise.ts art/index.ts   FOUNDATION
  art/fonts.ts player.ts projectiles.ts pickups.ts fx.ts ui.ts planets.ts   ART-A
  art/enemies.ts bosses.ts doodads.ts terrain.ts                           ART-B
  data/**                                          CONTENT  (catalogs, levels, lore, validation)
  state/** audio/** input/** platform/**           PLATFORM (save, economy, progress, sound, controls, device)
  scenes/GameScene.ts  game/** (except contracts.ts)  GAMEPLAY
  scenes/* (all other scenes)  ui/**               UI (menus, shop, map, HUD)
  game/contracts.ts                                FOUNDATION (HUD + preview contracts)
tests/  tools/  android/  ../.github/workflows/    PLATFORM
docs/                                              everyone (append-only notes)
```

## Parallel build split (phase 2 contracts)

| Owner | Files |
|---|---|
| WORLD | `src/scenes/GameScene.ts`, `src/game/**` except `contracts.ts`, `arsenal/**`, `preview.ts` |
| ARSENAL | `src/game/arsenal/**` (except `api.ts`), `src/game/preview.ts` |
| UI-KIT & FLOW | `src/ui/kit.ts` internals (API frozen), `src/ui/widgets/**`, Title/Options/Pause/LevelEnd/GameOver/Intel scenes |
| UI-META | Hangar/Shop/Specs/Map scenes, `src/ui/meta/**` |
| UI-HUD | `src/ui/Hud.ts`, `src/ui/hud/**` |

Extra contracts: `src/game/arsenal/api.ts` (World ↔ Arsenal: ArsenalHost, PlayerShot,
Arsenal) and `src/ui/kit.ts` (text/panel/MenuList/Gauge/button/iconButton/statusBar/starfield/
onBack/fadeIn/goto/confirm). Phaser note: `RetroFont.Parse()` returns the whole bitmap-font
cache entry — add it to `scene.cache.bitmapFont` as is.

## Contracts (read these files first)

* `src/types.ts` — every data shape (HullDef, WeaponDef, EnemyDef, BossDef, LevelDef, SaveData, …).
* `src/art/keys.ts` — every texture / animation / font key + key helpers (`enemyKey`, `shotKey`, `hullKey`, `shadowKey`, `planetKey` …). **Content and gameplay reference sprites only through these.**
* `src/art/pixel.ts` — ASCII pixel-map → texture factory (digits `1..5` = palette ramp, letters = `COMMON_COLORS`).
* `src/game/contracts.ts` — `HudApi`/`HudModel` (UI implements `createHud` in `src/ui/Hud.ts`), `createWeaponPreview` (gameplay implements in `src/game/preview.ts`), `GameStartData`, `ShopCategory`.
* `src/debug.ts` — URL params (`?scene=Game&level=kessra-1&god=1&t=40&max=1&mute=1`) and `window.__NC__` hooks. **Every scene calls `markSceneReady(key)` at the end of `create()`.**

## Campaign (fixed ids)

| # | Planet id | Name | Biome | Boss id / sprite |
|---|---|---|---|---|
| 1 | `kessra` | Kessra | desert | `colossus` / `boss_colossus` |
| 2 | `verdance` | Verdance | jungle | `hydra` / `boss_hydra` |
| 3 | `thalassa` | Thalassa | ocean | `dreadnought` / `boss_dreadnought` |
| 4 | `umbra` | Umbra Deep | cavern | `hive` / `boss_hive` |
| 5 | `cinder` | Cinder | lava | `forge` / `boss_forge` |
| 6 | `glacia` | Glacia | ice | `cryo` / `boss_cryo` |
| 7 | `rift` | The Rift | space | `voidcarrier` / `boss_voidcarrier` |
| 8 | `axiom` | Axiom Citadel | techno | `architect` / `boss_architect` |

Levels: `<planet>-1`, `<planet>-2`, `<planet>-3`. Level 3 of each planet ends with the planet
boss; level 2 has a mid-boss (`en_frigate`, `en_carrier` or `sea_destroyer` based enemy).
Unlock order = campaign order; completed levels can be replayed to farm credits.

Start loadout: hull `sparrow`, front `pulse_blaster` power 1, no rear, shield `sh_veil`,
generator `gen_cell`, no sidekicks. `START_CREDITS` in `src/data/index.ts`.

## Core rules (gameplay model)

* **Generator** produces `output` energy/s up to `capacity`. Each weapon volley costs
  `energyPerShot`; no energy → that weapon skips the volley. Shield regeneration also draws
  energy (`energyPerPoint`). Sidekicks are free.
* **Shield** absorbs damage first, then **armor** (hull HP). Armor only repairs via pickups or
  between levels (full repair at the hangar).
* **Front gun** power 1..10; **rear gun** power 1..10 with two modes (A/B) toggled in-flight.
  Upgrade price n→n+1 = `upgradeBase × n`. Changing a weapon resets power to 1.
* **Trade-in**: buying an item refunds 100 % of what was spent on the item it replaces.
* Credits come from destroyed enemies (credit gems, magnetised to the ship) + level bonus.
  Failing / aborting a level keeps 50 % of the credits earned in it.
* Difficulty (easy / normal / hard) scales enemy hp, bullet speed, fire rate and credits.

## Rendering & depth

Use `DEPTH` from `src/config.ts`. Air units cast a shadow (`shadowKey(texture)`) offset
(+6, +10) px on the ground layer. Ground units scroll with the terrain. Enemy bullets must be
the most readable thing on screen: bright core + dark rim, drawn above everything except the
player and FX.

## Performance budget

60 fps on a mid-range Android phone with 300+ bullets: pool every bullet / enemy / FX object
(no allocations in the per-frame hot path), circle-vs-circle collisions, cull off-screen
objects, terrain chunks generated one at a time ahead of the camera.

## Commands

```
npm run dev         # local dev server (http://localhost:5173/?scene=Game&level=kessra-1&god=1)
npm run typecheck   # tsc --noEmit
npm test            # vitest (logic + content validation)
npm run build       # typecheck + production bundle in dist/
npm run smoke       # Playwright: boots every scene, plays a level in god mode, fails on console errors
npm run screens     # Playwright: writes screens/*.png (title, map, hangar, shop, gameplay per biome, boss)
npm run cap:sync    # build + copy into android/
npm run android:debug  # needs Android SDK locally; CI does this in .github/workflows/android-apk.yml
```
