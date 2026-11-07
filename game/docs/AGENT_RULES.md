# Rules for every agent working on Nova Corsair (read fully before starting)

You are one of MANY senior engineers working IN PARALLEL on "Nova Corsair", an ORIGINAL
high-pace vertical-scrolling space shooter for mobile (portrait) in the spirit of 90s PC
shoot'em-ups with an upgrade shop between missions. Stack: Phaser 3.90.0 + TypeScript (strict)
+ Vite 6, packaged for Android with Capacitor 8.

Project root: `<repo>/game` (the clone path depends on the session, e.g. `/home/user/<repo>/game`).
The repo root only contains `game/`, `README.md`, `.gitignore` and `.github/`. Never write outside
`game/` unless your brief explicitly says so. The repository is PRIVATE: never publish code elsewhere.

## 1. Read the contracts first
`docs/ARCHITECTURE.md`, `src/types.ts`, `src/config.ts`, `src/art/keys.ts`, `src/art/pixel.ts`,
`src/art/palettes.ts`, `src/art/noise.ts`, `src/game/contracts.ts`, `src/debug.ts`, `src/main.ts`,
`src/scenes/BootScene.ts` (+ any extra contract file named in your brief).

Do NOT modify these contract files: `src/types.ts`, `src/config.ts`, `src/debug.ts`, `src/main.ts`,
`src/art/keys.ts`, `src/art/pixel.ts`, `src/art/palettes.ts`, `src/art/noise.ts`,
`src/art/index.ts`, `src/game/contracts.ts`, `src/scenes/BootScene.ts`, `src/gallery.ts`,
`gallery.html`, `tools/gallery-shot.mjs`. `src/game/arsenal/api.ts` and `src/ui/kit.ts` may only
receive ADDITIVE, backwards-compatible changes (new optional fields / options / exports). If a contract lacks something, work around it INSIDE your own files and
report it under CONTRACT ISSUES.

Keep the exported names and signatures of the stub files you own EXACTLY (others code against
them). You may add exports and new files inside your own folders/prefixes.

## 2. Concurrency rules (other agents edit the same working tree right now)
- Only create/edit files you own (listed in your brief). Never edit, delete or "fix" anyone
  else's files, even if they do not compile — they may be mid-edit.
- NEVER run git commands that change state (add, commit, stash, checkout, reset, clean,
  restore, rm, mv). Read-only git (status, diff, log, show) is fine.
- Do not install npm packages. Available: phaser 3.90, @capacitor/{core,android,app,haptics,cli},
  vite, vitest, typescript, playwright 1.63 (Chromium pre-installed; never run `playwright install`).
- Keep your files syntactically valid at all times: everyone's dev server compiles every module.
  Prefer writing a whole file at once; after each batch of edits run
  `cd <repo>/game && npx tsc --noEmit -p . 2>&1 | grep -E '<regex of your paths>'`.
  Errors in other people's files are not yours. Your files must end with ZERO type errors.
- If you start a dev server or Playwright, use ONLY your own port (given in your brief) and kill
  every process you started before finishing.
- Write scratch files only under `screens/` (gitignored) or `tools/tmp-<yourrole>-*.mjs`
  (delete those scripts before finishing).

## 3. Visual self-review (mandatory for anything visual)
You can LOOK at PNG files with the Read tool. Iterate until it is genuinely good.
- Texture gallery: `node tools/gallery-shot.mjs screens/<role>-x.png "<query>" <yourPort>`
  Query examples: `only=enemies&filter=en_dart&scale=6&frames=1`, `only=player,fx&filter=hull_&scale=4`,
  `only=fonts&font=1&scale=3`, `only=doodads&terrain=desert&chunks=3&scale=1`.
  ALWAYS pass `only=<your modules>` so other people's in-progress modules cannot break your run.
- Full game: `npx vite --port <yourPort> --strictPort` + a Playwright script
  (`require('playwright')` / `import { chromium } from 'playwright'`), viewport 360x640,
  URL params documented in `src/debug.ts` (e.g. `?scene=Game&level=kessra-1&god=1&mute=1&t=20`).
  Wait for `window.__NC__.ready && window.__NC__.scene === '<Scene>'`.

## 4. Originality (hard rule)
Inspired by a GENRE only. Never use names, ship designs, UI ornaments, texts, level layouts,
music or graphics of an existing game (no "Tyrian", "USP Talon", "MicroCorp", "Gencore",
"Savara", "Pulse-Cannon", "Sawblades"...). Menu/HUD art direction: indigo gunmetal panels, teal
neon glow lines, magenta accents, gold for credits (see `COLORS` in `src/config.ts`) — NOT
bronze/organic biomechanical frames.

## 5. Quality bar
Commercial-quality mobile game: dense, readable, punchy 16-bit pixel art; high pace; 60 fps on
a mid-range phone. Complete working implementations: no TODOs, no placeholders, no stubs left in
your files. Clear structure, short doc comments on public functions, no per-frame allocations in
hot paths.

## 6. Final report (your last message; it is read by the integrator, not by a human)
Max ~60 lines, exactly these sections:
- SUMMARY — what you built.
- FILES — every file you created/modified.
- NOTES FOR OTHERS — precise facts others must know (extra texture keys with sizes/frames,
  angle conventions, API semantics, gotchas).
- CONTRACT ISSUES — anything missing/wrong in the contracts.
- SELF-CHECK — commands run, screenshots viewed, results, known weaknesses (be honest).
