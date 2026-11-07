# Performance review: Nova Corsair on a mid-range Android WebView

Reviewer: performance (read-only for `src/`). Date: 2026-11-07.
Target: a mid-range Android phone in a Capacitor WebView (4-6x slower CPU than the test desktop,
mobile GPU, ~300-500 MB of usable memory).

Snapshot: a production build of the working tree at 13:22 (HEAD `cb49db2` plus uncommitted edits),
built with sourcemaps into `/tmp/revperf-dist` and served by `vite preview --port 5242`. The
content-usage counts (section 1.4) come from the source tree at 13:50. File:line references are
for the tree at 14:20.

---

## 0. How it was measured (read this before the numbers)

* Playwright 1.63, headless Chromium, 360x640 viewport with a 320x568 game canvas. Chrome
  DevTools Protocol (CDP) was used for `Emulation.setCPUThrottlingRate` (4x and 6x),
  `Performance.getMetrics`, CPU profiles, heap sampling (objects collected by minor and major GC
  included) and tracing (V8 GC events with their reasons).
* **The WebGL here is SwiftShader, a software GPU.** It caps the frame rate at about 30-55 fps
  no matter how much JS a frame runs, so the rAF frame time does **not** represent a phone.
  The CPU-side metric used everywhere below is the **JS time of one Phaser step**: from
  `game.events 'prestep'` to `'postrender'`, which covers update plus render (WebGL command
  submission). GL calls were counted by wrapping `WebGLRenderingContext.prototype`
  (`drawArrays`/`drawElements`, `bindTexture`, `blendFunc*`, `texImage2D` and others).
* The test machine is a 4-core Xeon shared with other agents. **All tables use runs at
  load average ≤ 3.** Earlier runs at load 9-13 were 1.5-2x slower and are not quoted.
  Proportions (profiles, counts, memory) do not depend on the load.
* Heavy loadout for the gameplay runs: leviathan, prism_shatter 10, flame_torch 10, sh_eclipse,
  gen_well, sk_shard and sk_rocket, injected as a localStorage save. Every run used `god=1` and
  `seed=7`. The ship was steered left and right with the keyboard, with autofire on.
* Numbers are given as 4x / 6x CPU throttle unless stated otherwise. 1 MiB = 1,048,576 bytes.

---

## Priorities at a glance

| # | Finding (measured before) | Fix | Expected gain | Owner |
|---|---|---|---|---|
| **P1-1** | Boot generates **every palette variant**: 1,108 textures. Bosses alone take 640-810 ms at 4x (1.1-1.3 s at 6x) in **one blocking frame**; the Title is ready after 3.3-3.6 s at 4x and 5.1 s at 6x. Only 8 of 64 boss bodies, 18 of 40 boss parts and 88 of 232 enemy/turret variants are used by the content. | Generate only the variants the content uses, lazily: the boss of a level when that level loads, the enemies per level | Boot −0.9 to −1.1 s at 4x; GPU textures −13 MiB (−73 %); CPU canvases −7 MiB | ART-B (`art/bosses.ts`, `art/enemies.ts`) + FOUNDATION (`BootScene` STEPS) |
| **P1-2** | Phaser `CanvasTexture` (behind `textures.addCanvas`) keeps a **full `getImageData` copy of every canvas**: 17.8 MiB at the Title (1,104 copies), 24 MiB after the menus. The constructor costs ≈ 325 ms of boot at 4x. | Register static canvases with `textures.addImage(key, canvas)`. Verified drop-in (section 1.5). Keep `createCanvas` only for textures that are `refresh()`ed. | −17.8 to −24 MiB CPU memory; boot ≈ −200 ms at 4x | FOUNDATION (`art/pixel.ts:230-249`) + UI (`kit.ts`, `widgets/util.ts`) |
| **P1-3** | **One major GC 3-6 s into every level**: 48-81 ms at 4x (15-28 ms at 1x). It is the slowest frame of the fight (54.6 ms at 4x). Trigger: *global allocation limit*, with 95 MB consumed against a 64 MB limit while the V8 old generation is only 21 MB. Canvases, ImageData and Blink objects make up the rest. | P1-1 and P1-2 remove about 35-40 MB of that external/embedder memory | Removes or postpones that 50-80 ms (4x) hitch; each major GC traces about 560 fewer canvases | (follows P1-1 and P1-2) |
| **P1-4** | Phaser builds the preFX machinery at boot even though nothing uses it: **30 render targets (5.42 MiB GPU)** and 20 FX shaders. That is ≈ 70 ms of shader compiling plus 30 ms of framebuffer checks at 4x. | `disablePreFX: true, disablePostFX: true` in the game config (`src/main.ts:17-42`). No preFX/postFX is used anywhere in `src`. | −5.4 MiB GPU; boot ≈ −100 ms at 4x | FOUNDATION (`main.ts`) |
| **P2-1** | The Game display list holds **2,580 objects, 85 % of them hidden pool members**. Measured cost: 0.30 µs per hidden object per frame at 4x, so ≈ **0.65 ms of every frame at 4x** (≈ 17 % of the step). It also allocates a new `children.filter` array every frame. | Take idle pool members out of the display list (`removeFromDisplayList`/`addToDisplayList`), or prewarm far smaller pools | −0.5 to −0.65 ms per frame at 4x, ≈ −1 ms at 6x | WORLD (`enemyBullets.ts:113`, `pickups.ts:71`, `enemies.ts:167-177`, `fx.ts:190-215`), ARSENAL |
| **P2-2** | The Phaser chunk keeps **1,562 inline license comments: 274 KB, 18.5 % of 1.48 MB**. | `esbuild: { legalComments: 'eof' }` in `vite.config.ts` (verified) | Chunk 1,481.8 → 1,213.5 KB (−268 KB) | PLATFORM |
| **P2-3** | Phaser ships whole: Matter and Arcade physics, tilemaps, sound, particles, FB-instant/camera3d and unused game objects. That is ≈ 575 KB of minified code the game never uses. Module evaluation costs 531 ms of main thread at 4x. | Custom Phaser entry (`phaser/src` modules + `define` flags) aliased in Vite | ≈ −550 KB; startup ≈ −100-150 ms at 4x | PLATFORM |
| **P2-4** | Each terrain chunk goes through a temporary canvas: `new canvas` → `putImageData` → `drawImage` into the slot. The copy frame costs **3-14 ms at 4-6x** against a 2 ms budget. | `putImageData` straight into the slot's canvas | Copy frame → ~1-3 ms; one 270 KB canvas fewer per chunk | WORLD + ART-B (`terrain.ts:125-136`, `background.ts:168-172`) |
| **P2-5** | First menu visits cost **100-350 ms at 4x**: Hangar 203-322, Shop 242-349, Map 102-195. Causes: procedural backdrops, baked 9-slices and the TileSprite scanline canvases rebuilt on every visit. | Prebake the shared backdrops and panels during idle Title frames; cache the scanline overlay per size | First visit ≈ second visit (−150-250 ms at 4x) | UI |
| **P2-6** | The first tap on the Title builds the AudioContext graph: 126 ms of JS, a 183 ms frame at 4x. Of that, 5 s of noise tables is computed on the spot. | Precompute the noise tables before unlock with `new AudioBuffer()` during idle Title time | −50-75 ms on the first tap at 4x | PLATFORM (`audio/engine.ts:90,150`) |
| **P2-7** | No frame-rate cap. On 90/120 Hz panels the WebView rAF, and with it the whole step, can run at the panel rate. At 6x the p95 step (11.4 ms) already exceeds the 8.3 ms budget of 120 Hz. | Check on a device; if rAF runs at 120 Hz, use `fps: { target: 60, limit: 60 }` | Halves CPU, GPU and battery use on 120 Hz phones | FOUNDATION (`main.ts:28`) |
| P3-1 | Fights create a fresh WebAudio node graph per SFX: ≈ 35 ms/s at 4x (`createGain` alone is 173 ms per 15 s) | Pool and reuse the static gain/pan/filter chains per voice | −15-20 ms/s at 4x | PLATFORM (`audio/sfx.ts:354-368`) |
| P3-2 | The Title logo shine sheet is **4096 x 64** (exactly `MAX_TEXTURE_SIZE` on older GPUs) and stays alive as 1 MiB GPU plus 2 MiB CPU for the whole session | Lay it out as a 4x4 grid (1024 x 256); remove it on Title shutdown | Robustness; −3 MiB | UI (`TitleScene.ts:164-197`) |
| P3-3 | Draw calls are **driven by blend modes, not textures** (11-14 per frame; 10-12 NORMAL↔ADD switches). Texture binds are 52-68 per frame (≈ 0.23 ms at 4x). The Hangar runs 31 draws per frame for 30 blend switches. | Group ADD sprites into fewer depth bands. Atlas the gameplay families only if device profiling shows the cost of binds or of the 16-sampler shader | A few draws and binds | WORLD, UI |
| P3-4 | Steady allocation of 4.5-6.5 MB/s, ≈ 60 % of it inside Phaser's render path; game code adds 1-1.5 MB/s. Minor GC every 1-1.5 s, 2-5 ms at 4x. | Trim the hot spots listed in 2.4 | Fewer and shorter scavenges | WORLD, ARSENAL |

**What was not a problem:** no texture, listener, scene or tween leaks (section 3.3). HUD cost is
≈ 0.07 ms per frame at 4x. Terrain was never generated synchronously. GPU uploads during play are
only one 270 KB chunk every ~3.3 s. The audio sequencer costs ≈ 4 ms/s at 4x. WebGL context loss
is survived (section 1.6).

---

## 1. Boot

### 1.1 Timeline (quiet machine, fresh save → Title, 2 runs each)

| | 1x | 4x | 6x |
|---|---|---|---|
| `new Phaser.Game` done (scripts evaluated, WebGL initialised) | 219-226 ms | 661-829 ms | 949-1167 ms |
| Sum of boot steps (`BootScene.stepMs`) | 492-571 ms | 1962-2060 ms | 3024-3267 ms |
| **Title ready** (`markSceneReady('Title')`) | **1.01-1.12 s** | **3.27-3.61 s** | **5.10-5.12 s** |
| Longest frame (the boss step) | 183-233 ms | 667-833 ms | 1100-1283 ms |
| Frames > 100 ms during boot | 1-2 | 8 | 11 |

Per generator at 4x (ms): fonts 33-42, player 66-72, projectiles 79-87, pickups 49-52,
**fx 256-279**, ui 46-55, **planets 230-240**, **enemies 333-372**, **bosses 639-811**,
doodads 133-135, animations 3, save 3-4. At 1x the boss step is 173-226 ms, which matches the feel
engineer's 180-270 ms.

### 1.2 Where the boot time goes (CPU profile at 4x, inclusive time, sourcemap attribution)

* `generateBossArt` **675 ms**:
  * the 8 body compositions `draw*()` take 308 ms and `damaged()` takes 74 ms. Both are
    palette-independent.
  * `addPaletteSet` takes 253 ms: for each of the 8 palettes, `gridCanvas`, `silhouette` and 2 x
    `addTexture`.
* `generateEnemyArt` 479 ms (`register` 325 ms). `generateFxArt` 522 ms (`explosionFrames`
  270 ms). `generatePlanetArt` 279 ms (`renderPlanet` 231 ms for 16 globes, of which the Title
  shows 2). Doodads 149 ms.
* Phaser `CanvasTexture` constructor **325 ms**. That figure includes `texImage2D` (119 ms over
  ≈ 1,100 uploads) and a **`getImageData` of every canvas** (see P1-2). `makeCanvas` takes 172 ms
  for ≈ 1,200 canvas creations. GC takes 176 ms (48 scavenges during the boot).
* Phaser boot takes 256 ms. Of that, `getShaderParameter`/`getProgramParameter` take 108 ms for 31
  shaders, 20 of them belonging to the unused `FxPipeline`, and `checkFramebufferStatus` takes
  30 ms for 30 render targets.
* Before the first generator (trace at 4x): `v8.evaluateModule` 531 ms on the main thread. Of
  that, about 275 ms is the self time of Phaser's module initialisation, plus one 210 ms
  compilation of Phaser's UMD wrapper. Streaming parse runs off-thread: 96 ms for Phaser and
  84 ms for the game chunk.
* Title `create` takes 135 ms at 4x, of which `logoShineSheet` is 34 ms.

### 1.3 Texture census at the Title (summing `w*h*4` over every TextureManager source)

* **1,108 textures, 697 of them ≤ 32x32 px**, using 1,104 CanvasTextures.
  * **GPU: 17.8 MiB**
  * Unique CPU canvases: 11.83 MiB
  * `CanvasTexture.imageData` copies: 17.79 MiB
  * Total: **≈ 47 MiB** for sprites alone
* Phaser render targets add another 5.42 MiB, plus the utility frame buffers.
* Boss bodies: 64 textures, 64 shadows, 64 damaged bodies and 64 damaged shadows. Together they
  take **13.45 MiB, 75 % of all GPU texture memory**.
  * The 8 palette variants share one CPU shadow canvas, but each gets its own GL texture
    (`bosses.ts:76-79`). That makes 8 identical shadow uploads per shape.
* Enemies: 232 textures plus 232 shadows, 1.69 MiB. Shots: 162 textures (pj_* and eb_* x 9
  colours).
  * The `__title_logo_shine` sheet is 4096x64 (1 MiB). `fx_explosion_l` is 864x72.
* Later in the session:
  * The menus add +122 textures (+5 MiB). The UI caches hold 29 baked 9-slices (2.94 MiB GPU,
    capped at 2.5 Mpx = 9.5 MiB by `kit.ts:307`), `__scr_bg_320x568` (0.73 MiB) and `meta_*`
    (0.61 MiB).
  * A level adds +23 textures (3.1 MiB).
* GPU memory risks on the phone:
  * About 48 MiB of sprite memory at the Title, two thirds of it CPU mirrors.
  * ≈ 1,100 GL texture objects. Mobile drivers allocate with page or tile granularity, so tiny
    textures waste memory.
  * One texture exactly at the 4096 px width limit.
  * A canvas created without `willReadFrequently` (kit, UI, Title) may be GPU-accelerated on the
    device. Phaser's `getImageData` in the `CanvasTexture` constructor would then force a
    synchronous GPU readback. This cannot be observed here because SwiftShader disables
    accelerated 2D canvas.

### 1.4 Which palette variants does the content use?

Source: the content catalogues loaded through Vite SSR.

| Family | Generated | Used by content | Notes |
|---|---|---|---|
| Enemy `enemyKey(sprite, palette)` | 208 | **78** | Includes the 4 Shop-preview drones (`preview.ts:58-60`). Each level uses 8-17 combinations. |
| Turret tops | 24 | **10** | |
| Boss bodies + damaged bodies | 64 + 64 (+ shadows) | **8 + 8** | One palette per boss. Bosses use 5 of the 8 palettes. |
| Boss parts | 40 (+ shadows) | **18** | |
| Core pulse sheets | 8 | 5 | |
| Player `pj_*` shots | 99 | 17 | Used **only** by the Shop weapon chips (`ShopScene.ts:424`). Gameplay uses the arsenal's own `ars_*` art. |
| Enemy `eb_*` bullets | 63 | 30 | |

Experiment: removing the 559 unused palette textures at runtime on the Title, then forcing a GC:

| | Before | After |
|---|---|---|
| Textures | 1,108 | 549 |
| GPU | 17.8 MiB | 4.79 MiB |
| Canvases | 11.83 MiB | 4.76 MiB |
| ImageData copies | 17.79 MiB | 4.78 MiB |
| **Total** | | **−33 MiB** |

### 1.5 Boot fixes (in order)

1. **B1: lazy boss art** (P1-1).
   * Add `ensureBossArt(scene, sprite, palette, partSprites)` in `art/bosses.ts`. It builds the
     body, damaged body, shadows, parts and core pulse for **one** palette.
   * Call it from `GameScene.create` when `level.boss` is set, behind the level-start fade, and
     drop step 9 from `BootScene.ts:42`.
   * Cost per boss level ≈ 60-70 ms at 4x: one composition ≈ 40 ms, `damaged` ≈ 9 ms, two palette
     sets ≈ 8 ms, parts ≈ 10 ms. It could also run in time slices during the level's waves.
   * Boot gain −640-810 ms at 4x; −1.1-1.3 s and the 1.1-1.3 s frozen frame at 6x. GPU 13.45 →
     ≈ 0.2 MiB at boot.
2. **B2: enemy art per level** (P1-1).
   * `ensureEnemyArt(scene, combos)` built from the level's waves, its mid-boss and its boss
     spawns (≈ 8-17 combos plus their turret tops, ≈ 20-30 ms at 4x), plus the 4 preview drones
     for the Shop.
   * Keep generated variants for the session. They are small once restricted to the used ones:
     0.52 MiB including shadows for all 88.
   * Boot −333-372 ms at 4x. Even "used combos only, at boot" saves about 60 %.
3. **B3: no ImageData mirrors** (P1-2).
   * In `art/pixel.ts:232,246` replace `scene.textures.addCanvas(key, canvas)` with
     `scene.textures.addImage(key, canvas as unknown as HTMLImageElement)`. Do the same in
     `ui/kit.ts:116,227,395,1075`, `ui/widgets/util.ts:20`, `scenes/TitleScene.ts:194`,
     `game/tex.ts:98-243` and `ui/hud/HudController.ts:157`.
   * Verified in the build:
     * `addImage(canvas)` creates the GL texture, keeps `source.image` as the canvas (the boss
       hit mask `boss.ts:237`, `meta/art.ts` and arsenal shadows read it with cut offsets),
       supports `tex.add()` sheet frames and renders correctly.
     * It allocates **no** ImageData.
     * It halves the per-texture registration cost even on a 64x16 canvas (0.007 vs 0.014 ms).
   * Keep `createCanvas` (`CanvasTexture`) only where `refresh()`/`getContext()` is used:
     background slots, HUD strips, Banner, BossBar.
4. **B4: get gameplay-only art off the Title path.**
   * The Title only needs fonts, ui, player and 2 planet globes (`TitleScene.ts:88-93`):
     ≈ 230 ms at 4x.
   * Move projectiles, pickups, fx, doodads (per biome) and the other 14 globes to a time-sliced
     queue, ≤ 4 ms per frame, run during Title, Map and Hangar idle frames. `GameScene.create`
     guards with a synchronous `ensure*()` fallback behind the fade.
   * Needs the monolithic generators split into per-sprite jobs, like `ChunkJob` in terrain.
   * Combined with B1-B3 and P1-4: **Title ≈ 1.1-1.3 s at 4x instead of 3.3-3.6 s (−65 %)**, and
     ≈ 1.7 s at 6x instead of 5.1 s.
5. **B5: `disablePreFX: true, disablePostFX: true`** (`main.ts:17-42`, P1-4).
   * Removes 30 render targets (32²..288² x 3 plus 3 x 320x568), 5.42 MiB of GPU, the 20
     `FxPipeline` shaders and 26 of the 30 framebuffer checks: ≈ −100 ms at 4x.
6. **B6: Title shine sheet** (`TitleScene.ts:33,164-197`): 16 frames of 256x64 laid out 4x4
   (1024x256) instead of 4096x64, removed on shutdown.
7. **B7 (contract):** `BootScene` STEPS and `generateAllTextures()` are FOUNDATION contracts. B1,
   B2 and B4 need the integrator to change them. The texture keys themselves stay unchanged.

### 1.6 WebGL context loss (Android app switch)

`WEBGL_lose_context` lose and restore during a fight at 4x: the restore event arrived after
170 ms, the longest frame was 250 ms, and the scene continued with no errors. Phaser re-uploads
every texture from the kept canvases. That is a good reason not to free the canvases after upload.
With B1-B5 the restore re-uploads about half as many textures and 20 fewer shaders.

---

## 2. Gameplay

### 2.1 JS time per frame in busy moments (heavy loadout, 20 s each, quiet machine)

| Scenario | 4x mean / p95 / p99 / max (ms) | 6x mean / p95 / p99 / max (ms) |
|---|---|---|
| axiom-3 boss (`t=118`, 60 enemy bullets, ~140 player shots) | 3.8 / 7.4 / 10.6 / 63 | 6.3 / 11.4 / 20.0 / 102 |
| rift-2 mid-boss (`t=64`) | 4.2 / 7.6 / 11.1 / 72 | 5.2 / 9.1 / 12.2 / 98 |
| axiom-2 mid-boss (`t=68`) | 3.5 / 6.5 / 8.5 / 16 | 4.9 / 8.7 / 12.0 / 65 |

* Split for axiom-3 at 4x: update 1.4 ms, render 2.5 ms. The starting loadout costs about 60 % of
  the heavy one.
* **60 fps holds at 4x. At 6x, p99 reaches 12-20 ms.**
* The 50-100 ms maxima are the per-level major GC (2.4); the slowest frame coincides with it to
  the millisecond.
* Keep about 4-6 ms of each 16.7 ms frame for the WebView compositor and the GPU on a phone.

### 2.2 Draw calls and batch breaks

* Per frame: **11.5-13.6 draw calls** (max 22-32) and 10.4-11.6 blend changes. That leaves only
  about 1 batch split per frame caused by the 16-texture limit (`maxTextures` 16).
* Display list: 2,580 objects, 356-556 visible, 56-90 of them ADD-blended, 74 distinct textures
  among the visible ones.
* A simulation of Phaser's batching over the depth-sorted list gives 11 flushes and 12 batches, a
  match. The render order is NORMAL terrain → ADD glow → NORMAL smoke → ADD glows → NORMAL shots
  (139) → ADD flashes/sparks (43) → NORMAL clouds → ADD glow → NORMAL bullets/ship → ADD
  shield/pixels (48) → NORMAL HUD.
* **The many small textures do not break batches.** Multi-texture batching absorbs them; the
  cost shows up as 52-68 `bindTexture` and ~30 `activeTexture` calls per frame (≈ 0.23 ms at 4x).
* Atlasing would mostly save boot uploads, texture objects and binds, not draw calls (P3-3).

### 2.3 CPU breakdown (profile at 4x, axiom-3 boss, 822 frames, per frame)

| | ms per frame at 4x |
|---|---|
| **Phaser self time** | **2.32** |
| `willRender` + `getVisibleChildren` (culling, see 2.6) | 0.50 |
| `batchSprite` | 0.33 |
| Image `renderWebGL` | 0.19 |
| `applyITRS` | 0.10 |
| GL calls (`bindTexture` 0.16, `bufferSubData` 0.16, `activeTexture` 0.06, `clear` 0.05) | 0.44 |
| Game code: arsenal (`projectiles.update` 0.20, `arsenal/projectiles.ts:419`) | 0.67 |
| Game code: boss | 0.23 |
| Game code: collisions | 0.22 |
| Game code: terrain (background + painter) | 0.19 |
| Game code: fx | 0.15 |
| Game code: ship | 0.07 |
| Game code: HUD | 0.07 |
| Game code: enemy bullets | 0.04 |
| Game code: pickups | 0.04 |

### 2.4 Allocations and GC

* Allocation rate: **4.5-6.5 MB/s** at about 55 fps (heap sampling: 5.7 MB/s).
  * About 60 % comes from Phaser's render path: `batchSprite` boxes the 4 packed tints (uint32
    > Smi) and the quad doubles it passes to `batchQuad` (≈ 2.4 MB/s), and
    `CameraManager.getVisibleChildren` allocates a `filter()` array of 2,580 entries every frame.
  * Game code (KB/s):

    | Source | KB/s |
    |---|---|
    | `arsenal/projectiles.ts:419 update` | ≈ 425 |
    | techno terrain painter (`b_ter_techno.ts:236 hullRows`, `:192 panelTone`) | ≈ 350 |
    | `boss.ts:89-90 get x/get y` (boxed doubles) | ≈ 100 |
    | `fx.ts:539` | ≈ 85 |
    | `pickups.ts:162` | ≈ 50 |
    | `enemyBullets.ts:218` | ≈ 30 |
    | `firePatterns.ts:52` | ≈ 20 |

  * The first gesture also creates ≈ 11 MB of garbage: the noise tables built through the
    `mulberry32` closure.
* Minor GCs (scavenges) run every 1-1.5 s: 0.6-1.2 ms at 1x, 2-5 ms at 4x. That is acceptable.
* **Major GC: one, 3-6 s after each level starts.** It takes 15-28 ms at 1x and 48-81 ms at 4x
  (about 100 ms or more at 6x).
  * The trace shows `reason: 'global allocation limit reached'`, with
    `global_consumed_bytes` 95 MB against `global_allocation_limit` 64 MB, but
    `old_gen_consumed_bytes` only **21 MB**.
  * The pause includes `V8.GC_HEAP_EMBEDDER_TRACING_EPILOGUE` 11-15 ms at 1x (Blink objects).
  * No further major GC happened in 40-75 s of steady play (72 scavenges in 75 s).
  * The external and embedder memory driving it is mostly texture canvases plus their ImageData
    mirrors, so B1-B3 attack the cause directly.

### 2.5 Terrain chunks and canvas→texture uploads (`game/background.ts`)

* One chunk every ~3.3 s (scroll 74-78 px/s). That is ≈ 10 uploads per 25 s of 264x256 px
  (270 KB) each; `texImage2D` takes 2-6 ms at 4x.
* Painting steps stay within the 2-4 ms budget (max step 4-7 ms at 4x). No synchronous
  generation was seen (`terrainSync` 0).
* **Copy frame**: `Job.result()` (`art/terrain.ts:125-136`) creates a new canvas plus
  `putImageData`, then `place()` (`background.ts:168-172`) runs `clearRect` and `drawImage` into
  the slot canvas. It takes **3.3-4.5 ms at 4x and 5-14 ms at 6x**.
  * Fix: `slot.tex.getContext().putImageData(job.img, 0, 0)` through a `result(target)` variant.
    One copy instead of three, and no 270 KB canvas per chunk (that canvas is external memory
    feeding the global GC limit).
* Level load at 4x: biome warm-up 78 ms plus the first-screen chunks 102 ms (axiom, techno).

### 2.6 Pooled objects in the display list (P2-1)

* Pools are prewarmed and kept in the display list while hidden:
  * enemy bullets 640 (`enemyBullets.ts:30,113-116`)
  * pickups 360 (`pickups.ts:14,71`)
  * enemies 84 air x 3 images plus 48 ground x 2 (`enemies.ts:167-177`). Air units carry a turret
    head image that is never shown: 84 dead images.
  * fx: 240 pixels (`fx.ts:200`) plus 28, 40, 14 and 10
  * arsenal embers and glows: 135 and 130
* Peak usage seen: ≤ 75 bullets, ≤ 12 enemies, ≈ 140 shots.
* Phaser calls `willRender()` on all of them every frame.
* **Measured**: adding 2,000 hidden Images raised render JS from 2.17 to 2.77 ms per frame at 4x
  (0.30 µs per object). The current 2,165 hidden objects therefore cost ≈ 0.65 ms per frame at 4x.
* Fix: when an object is released, call `img.removeFromDisplayList()`; when it is acquired, call
  `img.addToDisplayList()`. Depth is kept, and Phaser re-sorts only on frames with spawns, over
  ≈ 450 objects. Alternatively, prewarm about 25 % of today's sizes and grow on demand.

### 2.7 HUD and audio

* **HUD**: 0.07 ms per frame at 4x. The parts atlas plus diffed updates is a good design.
  * The panel and parts are built once per game height: 130 ms at 4x on the first level only.
  * Per-level strips are created and removed correctly.
* **Audio** (unmuted fight, 15 s at 4x): 45 ms/s in total.
  * SFX `play` takes 526 ms. Of that, `createGain` 173, `connect` 78, `createOscillator` 78,
    `createBiquadFilter` 74 and `disconnect` 28 (`audio/sfx.ts:354-368` builds a fresh chain per
    sound; the gap/max limits already cap the rate).
  * The sequencer tick takes 59 ms per 15 s, which is cheap.
* **First tap**: `unlock` takes 126 ms at 4x.
  * `createGraph` takes 75 ms: `makeNoise` 23 ms for 5 s of noise at 48 kHz, `stairTriangle`
    14 ms and the AudioContext constructor 22 ms.
  * `compileSong` takes 7 ms and the first tick 17 ms.
  * The fix is P2-6: precompute the noise tables with the `AudioBuffer` constructor during idle
    Title time and hand them to `createGraph`.

---

## 3. Menus and leaks

### 3.1 First visit vs second visit (create time to `markSceneReady` / longest frame, 4x)

| Scene | First visit | Later visits | New textures on first visit |
|---|---|---|---|
| Hangar | 203-322 ms / 217 ms | 31-114 ms | +37 (2.39 MiB): `__scr_bg_320x568` (`widgets/screen.ts:55`), 9-slices, `meta_bay` (`meta/art.ts:411`), 2 TileSprite canvases |
| Shop | 242-349 ms / **300 ms** | 61 ms | +55 (1.08 MiB): 9-slices, arsenal preview art |
| Map | 102-195 ms / 117 ms | 21 ms | +11: nebula backdrop, where `fbm` takes 43 ms (`meta/art.ts:473`) |
| Specs | 71-82 ms | 19 ms | +18 |
| Options / Intel | 56 / 24-45 ms | 15 / 3 ms | +2 |
| Game (axiom-3, first level) | 466 ms | 21-49 ms at 1x on retries | +23 (3.08 MiB): HUD parts/panel, 6 terrain slots, vignette |

The scanline overlay (`ui/widgets/decor.ts:62`) is a `TileSprite`. Every visit gives it a
full-size canvas (296x192, 306x234…) plus a CanvasTexture with an ImageData copy and an upload.
Replace it with an Image baked once per size, the same way the kit caches 9-slices.

### 3.2 Steady state at 4x

| Scene | JS per frame | Draw calls |
|---|---|---|
| Title | 2.3 ms | 16 |
| Hangar | 3.2 ms | **31 (30 blend switches**: the ADD glows in `meta/shipBay.ts:141-288` sit among NORMAL sprites) |
| Shop | 3.0 ms | 19 |
| Map | 2.1 ms | 10 |
| Specs | 2.2 ms | 10 |

### 3.3 Leak loops (programmatic `scene.start`, two forced GCs before each snapshot)

* **50 cycles of Hangar → Shop → Map → Hangar**:
  * Textures stayed at 1,230 → 1,230 and GPU at 22.86 MiB.
  * Listeners were stable: window 32, document 13, `JSEventListeners` 61, `game.events` 14,
    `scale` 14, keyboard/input 0.
  * Every shut-down scene had 0 display-list entries, 0 update-list entries, 0 tweens and
    0 timers.
  * Heap after GC: 12.22 → 12.40 (1) → 12.82 (10) → 13.16 (40) → 13.22 MB (50). The growth slows
    to +6 KB per scene start, which looks like JIT/IC metadata. **No leak.**
* **20 x Game RETRY** (rift-2 → abort → GameOver → Game):
  * Textures stayed at 1,237.
  * Heap after GC: 15.23 → 16.07 (10) → 16.14 (15) → 16.14 MB (20), flat. **No leak.**
  * Background slots, HUD strips and boss textures are removed on shutdown.

---

## 4. Bundle

### 4.1 Sizes (production, esbuild minify)

| Chunk | Size | gzip | Contents |
|---|---|---|---|
| `index-*.js` | 832.6 KB | 283.4 KB | `src/art` 235.5 KB, `src/game` 155.5, `src/ui` 137.3, `src/data` 104.2, `src/scenes` 101.5, `src/audio` 49.8, `@capacitor/core` 9.2 |
| `phaser-*.js` | **1,481.8 KB** | 339.9 KB | the whole `phaser/dist/phaser.js` UMD build (via Vite's `browser` field) |
| 2 x `web-*.js` | ≈ 1 KB each | | Capacitor web shims |

* **1,563 comments in the Phaser chunk take 273.7 KB.** esbuild keeps every `@license` header
  inline by default.
* A test build with `esbuild: { legalComments: 'eof' }` gave 1,213.5 KB. The 28 unique notices
  stay at the end of the file, which keeps the MIT notice.
* Subsystems the game never uses (minified source sizes):

  | Subsystem | KB |
  |---|---|
  | Matter physics | 156 |
  | Arcade physics | 76 |
  | Tilemaps | 106 |
  | Particles | 45 |
  | Sound (`audio.noAudio`) | 40 |
  | camera3d + fbinstant plugins | 33 |
  | Curves | 18 |
  | mesh / rope / plane / shader / video / pointlight / dom / lights | ≈ 63 |
  | Shapes other than Rectangle | ≈ 40 |
  | **Total** | **≈ 575** |

  The game only uses Image, Container, Rectangle, Graphics, Zone, BitmapText, Sprite, Text,
  TileSprite and Layer.

### 4.2 Startup cost of the JS (4x)

* Streaming parse runs off-thread: 96 ms for Phaser and 84 ms for the game chunk.
* On the main thread: module evaluation 531 ms (Phaser's own initialisation ≈ 275 ms) plus a
  single 210 ms compile of the UMD wrapper.
* The data catalogues evaluate in ≈ 53 ms (`data/index`, `progression`, `waves`, `balance`).
* The APK compresses assets anyway, so gzip sizes do not matter. Parse, compile and evaluation do.

### 4.3 Bundle fixes

1. **U1** (P2-2): `vite.config.ts` → `esbuild: { legalComments: 'eof' }`. −268 KB, verified.
2. **U2** (P2-3): a custom Phaser entry.
   * Copy `phaser/src/phaser.js`, keep the namespaces used above and drop physics, tilemaps,
     sound, particles, plugins and the unused game objects.
   * Add `define: { WEBGL_RENDERER: true, CANVAS_RENDERER: false, FEATURE_SOUND: false,
     PLUGIN_CAMERA3D: false, PLUGIN_FBINSTANT: false }`.
   * Alias `phaser` to the new entry.
   * Estimated −550 KB and −100-150 ms startup at 4x.
   * Every scene must be smoke-tested; a missing module only fails at runtime.
3. **U3** (P3): dynamic `import()` of the non-Title scenes and `game/**`, registered through
   `game.scene.add` after the Title. The gain is limited (≈ 50-100 ms of evaluation at 4x), and it
   would require changing `main.ts`, which is a FOUNDATION contract.

---

## 5. Caveats

* The frame rate in this environment is GPU-bound (SwiftShader), so no 60 fps claims are made
  from rAF times. Use the JS step numbers and validate on a device:
  * with `chrome://inspect` remote profiling of the Capacitor WebView,
  * for the effect of the 16-sampler multi-texture shader on Mali/Adreno, which cannot be
    measured here,
  * for the 90/120 Hz behaviour (P2-7).
* CPU throttling slows only the renderer main thread. Background parse and compile, GC helper
  threads and the GPU process are not throttled, so the real device will be slower on those
  parts too.
* Several gains in the priority table are estimates from CPU profiles. These were measured
  directly:
  * the memory freed by dropping unused palettes (runtime removal),
  * the cost per hidden object (adding 2,000 hidden Images),
  * the Phaser chunk size with `legalComments: 'eof'` (real build),
  * that `addImage` is a drop-in (in-page test).
* The instrumentation added ≈ 0.2 ms per frame at 4x in a separate rAF callback (precise
  `performance.memory` reads). It is excluded from the step timings.

Measurement scripts (`tools/tmp-revperf-*.mjs`) and scratch output were deleted after the review.
They covered boot timing and texture census, boot CPU profile and trace, gameplay
step/GL/allocation/GC runs, the display-list census, the hidden-object experiment, the palette
removal and GC experiment, menu first-visit costs and leak loops, audio, context loss, bundle
attribution and the `legalComments` build. They are straightforward to recreate from the
descriptions above.
