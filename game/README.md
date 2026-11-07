# Nova Corsair

*[English version below](#english)*

## Français

**Nova Corsair** est un shoot'em up spatial **original** à défilement vertical, très nerveux,
pensé pour le mobile en mode portrait (Android) et jouable dans le navigateur. Pilote corsaire
indépendant, vous affrontez la « Directive Axiome » sur 8 planètes × 3 niveaux (un mini-boss au
niveau 2, le boss de la planète au niveau 3). Entre deux missions, le hangar et la boutique
permettent d'acheter et d'améliorer coque, arme avant (10 niveaux de puissance), arme arrière
(2 modes), bouclier, générateur et sidekicks gauche/droite — avec reprise à 100 % de l'objet
remplacé. Tout l'art, les polices, les terrains, les sons et la musique sont **générés en code** :
aucun fichier d'asset binaire.

Pile technique : Phaser 3.90 · TypeScript strict · Vite 6 · Capacitor 8 (Android) · Vitest · Playwright.

### Lancer le jeu

Prérequis : Node.js 22.

```bash
cd game
npm ci
npm run dev          # http://localhost:5173/
```

Contrôles : glisser le doigt **n'importe où** sur l'aire de jeu (déplacement relatif : le doigt ne
cache jamais le vaisseau), tir automatique (option). Clavier : flèches / WASD, Espace / Z pour
tirer, X / Maj pour le mode de l'arme arrière, P / Échap pour la pause. Manette : stick / croix,
A pour tirer, B / X mode arrière, Start pause. Android : bouton Retour = pause.

### Paramètres d'URL de debug

| Paramètre | Effet |
|---|---|
| `?scene=Game&level=kessra-1` | démarre directement dans une scène (`Title`, `Map`, `Hangar`, `Shop`, `Specs`, `Options`, `Intel`, `Game`…) ; `Game` utilise `level` |
| `&god=1` | le joueur ne peut pas mourir |
| `&t=40` | avance le niveau jusqu'à 40 s |
| `&max=1` | équipement maximal + crédits, tous les niveaux débloqués |
| `&credits=50000` | fixe les crédits |
| `&seed=123` | force la graine aléatoire |
| `&mute=1` | coupe le son |
| `&fps=1` | affiche les FPS |
| `&speed=2` | accélère le temps de jeu |
| `&shop=front` | ouvre la boutique sur une catégorie (avec `scene=Shop`) |

Exemple : `http://localhost:5173/?scene=Game&level=kessra-1&god=1&t=40&mute=1`.
`window.__NC__` expose l'état du jeu (`ready`, `scene`, `errors`, `state.levelTime`…) pour les scripts.

### Tests et vérifications

```bash
npm run typecheck    # tsc --noEmit
npm test             # Vitest : sauvegarde, économie, progression, validation du contenu…
npm run build        # typecheck + bundle de production dans dist/
npm run smoke        # Playwright : toutes les scènes + 1 niveau par planète en god mode ; échoue sur toute erreur console
npm run screens      # Playwright : captures dans screens/ (menus, gameplay par planète, boss)
node tools/smoke.mjs --dist            # même smoke test sur le build de production (dist/)
node tools/screens.mjs --only boss     # seulement les captures dont le nom contient « boss »
node tools/icons.mjs                   # régénère les icônes et splash Android (+ screens/icons-preview.png)
```

Les outils Playwright démarrent leur propre serveur Vite (port `--port <n>`, variable `PORT`,
4173 par défaut) et l'arrêtent à la fin.

### Récupérer l'APK Android

Chaque push sur `main` ou une branche `ccr-**` qui touche `game/` construit l'APK sur GitHub Actions :

1. onglet **Actions** du dépôt → workflow **Android APK** ;
2. ouvrir le dernier run **vert** ;
3. section **Artifacts** → télécharger **`nova-corsair-debug-apk`** (un zip contenant `app-debug.apk`) ;
4. sur le téléphone : autoriser l'installation d'applications de sources inconnues, puis ouvrir l'APK.

Un tag `v*` (ex. `v0.1.0`) publie aussi les APK dans une **GitHub Release**.
Construction locale (nécessite le SDK Android) : `npm run android:debug`.

### APK release signée (optionnel)

1. Créer une clé (une seule fois, à conserver précieusement : elle est nécessaire pour toutes les mises à jour) :

   ```bash
   keytool -genkeypair -v -keystore nova-corsair-release.jks -alias novacorsair \
     -keyalg RSA -keysize 4096 -validity 10000
   ```

2. Encoder le fichier en base64 : `base64 -w0 nova-corsair-release.jks > keystore.b64`
   (macOS : `base64 -i nova-corsair-release.jks -o keystore.b64`).
3. Dans GitHub : **Settings → Secrets and variables → Actions → New repository secret**, ajouter :
   - `ANDROID_KEYSTORE_BASE64` : le contenu de `keystore.b64`
   - `ANDROID_KEYSTORE_PASSWORD` : le mot de passe du keystore
   - `ANDROID_KEY_ALIAS` : l'alias (`novacorsair` ci-dessus)
   - `ANDROID_KEY_PASSWORD` : le mot de passe de la clé
4. Les runs suivants publient aussi l'artifact **`nova-corsair-release-apk`** (APK signée).

Ne jamais committer le keystore (`*.jks` et `*.keystore` sont ignorés par git). Localement,
`android/app/build.gradle` lit les mêmes variables d'environnement `ANDROID_KEYSTORE_PATH`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` ; `versionCode` vient de
`GITHUB_RUN_NUMBER` (1 en local).

### Structure du projet

```
game/
  index.html, src/main.ts        point d'entrée (Phaser, échelle FIT, portrait)
  src/config.ts types.ts debug.ts  constantes, contrats de données, hooks de debug
  src/art/                       génération procédurale des textures (sprites, terrains, polices, UI)
  src/data/                      catalogue : coques, armes, ennemis, boss, planètes, niveaux, transmissions
  src/game/                      gameplay (monde, armes, ennemis, collisions, aperçu boutique)
  src/scenes/  src/ui/           scènes Phaser (titre, carte, hangar, boutique, jeu…) et HUD
  src/state/                     sauvegarde (localStorage), économie de la boutique, progression
  src/input/                     contrôles (tactile relatif, clavier, manette, bouton Retour)
  src/audio/                     effets sonores et musique procéduraux (WebAudio)
  src/platform/                  Capacitor : cycle de vie de l'app, bouton Retour, vibrations
  tests/                         tests Vitest
  tools/                         smoke.mjs, screens.mjs, icons.mjs, gallery-shot.mjs (Playwright)
  android/                       projet Android Capacitor (portrait, plein écran immersif, icônes)
  docs/                          architecture, feuille de route, journal, cibles visuelles
../.github/workflows/            Game CI (tests + smoke + captures) et Android APK
```

---

<a id="english"></a>

## English

**Nova Corsair** is an **original**, fast-paced vertical scrolling space shooter for mobile
portrait play (Android) that also runs in the browser. As an independent corsair pilot you fight
the "Axiom Directive" across 8 planets × 3 levels (a mid-boss in level 2, the planet boss in
level 3). Between missions, the hangar and shop let you buy and upgrade hull, front gun (10 power
levels), rear gun (2 modes), shield, generator and left/right sidekicks, with a 100 % trade-in of
the replaced item. All art, fonts, terrain, sound effects and music are **generated in code**:
there are no binary assets.

Stack: Phaser 3.90 · strict TypeScript · Vite 6 · Capacitor 8 (Android) · Vitest · Playwright.

### Run the game

Requirements: Node.js 22.

```bash
cd game
npm ci
npm run dev          # http://localhost:5173/
```

Controls: drag **anywhere** on the playfield (relative movement: your finger never hides the
ship), optional autofire. Keyboard: arrows / WASD, Space / Z fire, X / Shift rear-gun mode,
P / Esc pause. Gamepad: stick / d-pad, A fire, B / X rear mode, Start pause. Android back = pause.

### Debug URL parameters

| Parameter | Effect |
|---|---|
| `?scene=Game&level=kessra-1` | start directly in a scene (`Title`, `Map`, `Hangar`, `Shop`, `Specs`, `Options`, `Intel`, `Game`…); `Game` uses `level` |
| `&god=1` | the player cannot die |
| `&t=40` | fast-forward the level to 40 s |
| `&max=1` | max loadout + credits, every level unlocked |
| `&credits=50000` | set the credits |
| `&seed=123` | force the RNG seed |
| `&mute=1` | no audio |
| `&fps=1` | show FPS |
| `&speed=2` | gameplay time scale |
| `&shop=front` | open the shop on a category (with `scene=Shop`) |

Example: `http://localhost:5173/?scene=Game&level=kessra-1&god=1&t=40&mute=1`.
`window.__NC__` exposes game state (`ready`, `scene`, `errors`, `state.levelTime`…) to scripts.

### Tests and checks

```bash
npm run typecheck    # tsc --noEmit
npm test             # Vitest: save, economy, progress, content validation…
npm run build        # typecheck + production bundle in dist/
npm run smoke        # Playwright: every scene + 1 level per planet in god mode; fails on any console error
npm run screens      # Playwright: screenshots in screens/ (menus, gameplay per planet, bosses)
node tools/smoke.mjs --dist            # same smoke test against the production build (dist/)
node tools/screens.mjs --only boss     # only the screenshots whose name contains "boss"
node tools/icons.mjs                   # regenerate the Android icons and splash (+ screens/icons-preview.png)
```

The Playwright tools start their own Vite server (`--port <n>`, `PORT` env, default 4173) and
stop it when done.

### Get the Android APK

Every push to `main` or a `ccr-**` branch touching `game/` builds the APK on GitHub Actions:

1. repository **Actions** tab → **Android APK** workflow;
2. open the latest **green** run;
3. **Artifacts** section → download **`nova-corsair-debug-apk`** (a zip containing `app-debug.apk`);
4. on the phone: allow installing apps from unknown sources, then open the APK.

A `v*` tag (e.g. `v0.1.0`) also publishes the APKs in a **GitHub Release**.
Local build (needs the Android SDK): `npm run android:debug`.

### Signed release APK (optional)

1. Create a key once (keep it safe: every future update must be signed with it):

   ```bash
   keytool -genkeypair -v -keystore nova-corsair-release.jks -alias novacorsair \
     -keyalg RSA -keysize 4096 -validity 10000
   ```

2. Base64-encode it: `base64 -w0 nova-corsair-release.jks > keystore.b64`
   (macOS: `base64 -i nova-corsair-release.jks -o keystore.b64`).
3. On GitHub: **Settings → Secrets and variables → Actions → New repository secret**, add:
   - `ANDROID_KEYSTORE_BASE64`: the content of `keystore.b64`
   - `ANDROID_KEYSTORE_PASSWORD`: the keystore password
   - `ANDROID_KEY_ALIAS`: the alias (`novacorsair` above)
   - `ANDROID_KEY_PASSWORD`: the key password
4. Following runs also publish the **`nova-corsair-release-apk`** artifact (signed APK).

Never commit the keystore (`*.jks` and `*.keystore` are git-ignored). Locally,
`android/app/build.gradle` reads the same `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` environment variables; `versionCode` comes from
`GITHUB_RUN_NUMBER` (1 locally).

### Project structure

```
game/
  index.html, src/main.ts        entry point (Phaser, FIT scaling, portrait)
  src/config.ts types.ts debug.ts  constants, data contracts, debug hooks
  src/art/                       procedural texture generation (sprites, terrain, fonts, UI)
  src/data/                      catalogue: hulls, weapons, enemies, bosses, planets, levels, transmissions
  src/game/                      gameplay (world, weapons, enemies, collisions, shop preview)
  src/scenes/  src/ui/           Phaser scenes (title, map, hangar, shop, game…) and HUD
  src/state/                     save (localStorage), shop economy, campaign progress
  src/input/                     controls (relative touch, keyboard, gamepad, back button)
  src/audio/                     procedural sound effects and music (WebAudio)
  src/platform/                  Capacitor: app lifecycle, back button, haptics
  tests/                         Vitest suites
  tools/                         smoke.mjs, screens.mjs, icons.mjs, gallery-shot.mjs (Playwright)
  android/                       Capacitor Android project (portrait, immersive fullscreen, icons)
  docs/                          architecture, roadmap, progress log, visual targets
../.github/workflows/            Game CI (tests + smoke + screenshots) and Android APK
```
