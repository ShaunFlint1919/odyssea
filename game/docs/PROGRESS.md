# Journal de progression — Nova Corsair

Entrées les plus récentes EN HAUT. Chaque itération de la boucle (docs/MEGA_PROMPT.md) ajoute une
entrée : date, scorecard avant → après, changements, preuves, problèmes connus, prochaine étape.

## Itération 0 — 2026-11-07 — Fondation (session initiale, en cours)

- Le dépôt devient dédié au jeu : l'ancien site web a été supprimé de la branche
  `ccr-47cc43a7-n24a5r` (il reste dans l'historique git et sur `main` tant que la branche n'est pas fusionnée).
- Projet `game/` : Vite 6 + TypeScript strict + Phaser 3.90, Capacitor 8 (`android/` généré),
  contrats partagés (`src/types.ts`, `src/art/keys.ts`, `src/game/contracts.ts`, `src/debug.ts`),
  usine de pixel-art (`src/art/pixel.ts`), galerie de textures (`gallery.html`, `tools/gallery-shot.mjs`).
- Construction massivement parallèle lancée (agents en arrière-plan sur des périmètres de fichiers
  disjoints) : contenu & niveaux, art (UI/polices/planètes, joueur/projectiles/FX, ennemis, boss,
  terrains), plateforme (sauvegarde/économie/contrôles/Android/CI/outils), audio, puis gameplay,
  interface, intégration et relecture adverse.
- Scorecard : non mesurée (le jeu n'est pas encore assemblé).
- Prochaine étape : assembler, faire passer typecheck/tests/build/smoke, vérifier l'APK en CI.
