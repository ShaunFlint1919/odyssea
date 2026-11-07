# Cibles visuelles (extraites des images de référence)

Analyse des 12 captures fournies le 2026-11-07 (jeu de tir vertical PC des années 90). On en
retient des **qualités mesurables de genre**, jamais des éléments à copier : aucun sprite,
nom, ornement d'interface, texte ou niveau de la référence ne doit apparaître dans Nova Corsair.

## Écran de jeu
| Qualité observée | Cible mesurable pour Nova Corsair |
|---|---|
| Aire de jeu ≈ 82 % de la largeur, panneau de statut vertical à droite | `PLAY_W = 264`, `HUD_W = 56` sur 320 px (fait) |
| Jauges verticales hautes : énergie en dégradé jaune→rouge, bouclier bleu, blindage | 3 jauges verticales ≥ 40 % de la hauteur du HUD, couleurs `COLORS.energy/shield/armor` |
| Cases « LCD » vertes pour arme avant / arrière avec barre de puissance, mode de tir | Cases encastrées (`ui_panel_inset`), texte néon, 10 pastilles de puissance |
| Nom du niveau dans une case du HUD, score en bas à gauche de l'aire de jeu | Idem, police bitmap FONT.m avec ombre |
| Terrains 16 bits très détaillés (désert + palmiers + ruines, jungle + rivière, océan + îles, cavernes rocheuses, espace + plateformes) | 8 biomes procéduraux, ≥ 4 niveaux de valeur par matière, tramage, ombres portées des reliefs, doodads ≥ 6 par chunk |
| Ombres portées des avions sur le sol | Silhouette à 38 % d'opacité décalée (+6, +10) |
| Densité : dizaines de balles rouges/orange, rafales ennemies en éventail | Pics ≥ 60 balles ennemies et ≥ 15 ennemis à l'écran sur les niveaux avancés |
| Balles ennemies très lisibles : cœur clair, halo saturé | Cœur quasi blanc + anneau saturé + contour sombre 1 px |
| Explosions énormes multi-frames (boule de feu orange, cœur blanc, fumée) | 3 tailles (24/40/72 px), 8-12 frames, chaînes d'explosions sur les gros ennemis |
| Tirs du joueur multicolores (plasma bleu, croissants verts), sidekicks de part et d'autre | Couleurs par arme (`ShotColor`), sidekicks à ±18 px du vaisseau |
| Ennemis variés : chasseurs, tourelles au sol, gros vaisseaux, mines, structures | ≥ 36 types, 8 boss, mini-boss 56-72 px |

## Menus (hangar / boutique)
| Qualité observée | Cible pour Nova Corsair (direction artistique propre) |
|---|---|
| Grand cadre à gauche montrant le vaisseau équipé en gros (coque + sidekicks + arc de bouclier) | « Baie du vaisseau » : coque ×3, sidekicks, arc de bouclier, mini-jauges |
| Liste de menu en grosse police lisible, entrée sélectionnée surlignée | MenuList FONT.m/FONT.l, curseur, surbrillance magenta |
| Compteur de crédits sous le vaisseau | Crédits en or avec icône |
| Ligne d'aide contextuelle en bas de l'écran | StatusBar sur toutes les scènes de menu |
| Boutique par catégorie : icône + nom + prix, entrée équipée marquée | Liste avec icône 16 px, prix net (reprise), marqueur « équipé », verrou |
| Fenêtre d'aperçu animée de l'arme qui tire + barre de puissance réglable gauche/droite | `createWeaponPreview` + rangée POWER avec flèches et 10 pastilles |
| Écran « Upgrade Ship » listant les 7 catégories + Done | Liste des catégories avec l'objet équipé de chacune |

## Ce qui doit rester ORIGINAL
- Cadres et panneaux : plaques « gunmetal » indigo, néons turquoise, accents magenta (pas de
  cadres organiques/biomécaniques bronze).
- Noms : Nova Corsair, Directive Axiome, planètes Kessra/Verdance/Thalassa/Umbra Deep/Cinder/
  Glacia/The Rift/Axiom Citadel, armes et coques maison.
- Silhouettes de vaisseaux, ennemis et boss dessinées spécifiquement pour ce jeu.
