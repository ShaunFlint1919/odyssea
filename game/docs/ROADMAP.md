# Nova Corsair — Roadmap (checklist pilotée par la boucle)

Légende : `[x]` fait et vérifié · `[~]` partiel (préciser) · `[ ]` à faire.
La boucle de développement (docs/MEGA_PROMPT.md) choisit toujours les items non cochés de
plus fort impact. Chaque item coché doit avoir été vérifié (test, capture ou run CI).

## M0 — Fondation
- [x] Projet Vite + TypeScript + Phaser 3.90 dans `game/` (le site web à la racine n'est pas touché)
- [x] Contrats partagés (`src/types.ts`, `src/art/keys.ts`, `src/game/contracts.ts`, `src/debug.ts`)
- [x] Usine de pixel-art procédural (`src/art/pixel.ts`) + galerie de textures (`gallery.html`)
- [x] Projet Android Capacitor 8 (`game/android/`)
- [ ] Workflows GitHub Actions : `game-ci.yml` (typecheck/tests/build/smoke/screens) et `android-apk.yml` (APK debug, release signée optionnelle) — **verts**

## M1 — Tranche verticale jouable
- [ ] Boucle complète : Titre → Nouvelle partie → Hangar → Boutique → Mission → Fin de niveau → Hangar
- [ ] Mort → Game Over → Réessayer / Hangar ; Pause → Reprendre / Abandonner
- [ ] Sauvegarde locale (crédits, équipement, progression, options)
- [ ] Smoke test Playwright sans aucune erreur console

## M2 — Sensations de jeu (game feel)
- [ ] Contrôle tactile relatif fluide (le doigt ne cache jamais le vaisseau), clavier, manette
- [ ] Impacts lisibles : flash blanc, étincelles, hit-stop, secousse d'écran dosée, vibration
- [ ] Balles ennemies lisibles sur les 8 biomes (cœur clair + anneau saturé + contour sombre)
- [ ] Rythme élevé : jamais d'écran vide plus de 2 s, crescendo avant les boss
- [ ] Courbe de difficulté des planètes 1-2 validée par playtest automatisé (taux de survie en god=0)

## M3 — Arsenal
- [ ] 8 armes avant distinctes, 10 niveaux de puissance visiblement différents
- [ ] 5 armes arrière avec 2 modes (A/B) basculables en vol
- [ ] 6 drones latéraux (pod, twin, orbiteur bloqueur, roquettes, éclats, canon à charge)
- [ ] 6 coques, ≥5 boucliers, ≥5 générateurs — modèle énergie/bouclier/blindage équilibré
- [ ] Aperçu animé des armes dans la boutique

## M4 — Bestiaire & boss
- [ ] ≥ 36 types d'ennemis (air / sol / mer / dangers), patterns de mouvement et de tir variés
- [ ] Unités au sol qui défilent avec le terrain, tourelles orientées vers le joueur, ombres portées des unités aériennes
- [ ] 8 boss multi-phases avec parties destructibles + 1 mini-boss par planète
- [ ] Mort de boss spectaculaire (chaîne d'explosions, ralenti, balles → crédits)

## M5 — Campagne
- [ ] 8 planètes × 3 niveaux = 24 niveaux scénarisés (vagues designées, pas aléatoires)
- [ ] Carte galactique avec routes, verrous, rejouabilité pour farmer des crédits
- [ ] Histoire originale via ≥ 16 transmissions (Comms)
- [ ] Économie équilibrée : 1-2 améliorations significatives achetables par niveau

## M6 — Visuel (cible : scorecard ≥ 4/5 partout)
- [ ] Terrains des 8 biomes riches et sans couture, décor (doodads), nuages/brume en parallaxe
- [ ] Explosions multi-frames volumineuses, débris, fumée, ondes de choc
- [ ] HUD latéral original lisible (énergie, puissance avant/arrière, mode, drones, bouclier, blindage, score)
- [ ] Menus « atelier » (hangar, boutique, specs, carte) cohérents, lisibles à 320 px
- [ ] Logo et écran titre animés

## M7 — Audio
- [ ] SFX procéduraux pour chaque action, mixage sans saturation à 20 tirs/s
- [ ] Musique chiptune procédurale par biome + boss + menus, boucles propres

## M8 — Mobile / Android
- [ ] 60 fps sur un Android milieu de gamme avec 300+ projectiles (pools, zéro allocation par frame)
- [ ] Plein écran immersif, portrait verrouillé, écran toujours allumé en jeu
- [ ] Bouton retour Android géré partout, pause automatique en arrière-plan
- [ ] Icône et splash originaux
- [ ] APK release signée (secrets GitHub) + publication sur GitHub Release au tag `v*`

## M9 — Finitions
- [ ] Tutoriel intégré au premier niveau (overlay discret)
- [ ] Localisation FR / EN
- [ ] Mode Arcade / survie après la campagne
- [ ] Accessibilité : option balles contrastées, réduction des flashs

## M10 — Release 1.0
- [ ] Tous les items M0-M8 cochés, scorecard ≥ 4/5 sur chaque critère et moyenne ≥ 4,5
- [ ] 2 runs CI consécutifs verts, APK release téléchargeable
- [ ] Tag `v1.0.0`
