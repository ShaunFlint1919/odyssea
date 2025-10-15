# Structure du thème Odyssea Lymphea

Ce document décrit l'organisation complète du thème WordPress Odyssea Lymphea.

## 📁 Arborescence complète

```
odyssea/                              # Dossier racine du thème (déployer vers /wp-content/themes/odyssea/)
│
├── 📄 Fichiers WordPress essentiels (obligatoires)
│   ├── index.php                     # Template principal WordPress
│   ├── style.css                     # En-tête du thème + métadonnées (REQUIS)
│   ├── functions.php                 # Fonctions, hooks et enqueue des assets
│   ├── header.php                    # En-tête HTML (<head>, navigation)
│   ├── footer.php                    # Pied de page HTML (scripts, fermeture)
│   ├── page.php                      # Template pour les pages WordPress
│   ├── single.php                    # Template pour les articles
│   └── 404.php                       # Page d'erreur 404
│
├── 📄 Fichiers WordPress optionnels
│   ├── screenshot.png                # Aperçu du thème (1200×900px) - À CRÉER
│   ├── screenshot.txt                # Instructions pour créer le screenshot
│   └── asset-manifest.php            # Manifest des assets (auto-généré par build)
│
├── 📁 Code source React (client/)
│   ├── src/
│   │   ├── components/               # Composants React réutilisables
│   │   │   ├── ui/                   # Composants UI shadcn
│   │   │   ├── navigation.tsx        # Barre de navigation
│   │   │   ├── hero-section.tsx      # Section hero
│   │   │   ├── services-section.tsx  # Section services
│   │   │   ├── contact-section.tsx   # Section contact
│   │   │   └── minimal-footer.tsx    # Pied de page
│   │   │
│   │   ├── pages/                    # Pages React
│   │   │   ├── home.tsx              # Page d'accueil
│   │   │   ├── renata-franca.tsx     # Page Renata Franca
│   │   │   ├── drainage-lymphatique.tsx
│   │   │   ├── soins-cicatrices.tsx
│   │   │   ├── epilation-laser.tsx
│   │   │   └── not-found.tsx
│   │   │
│   │   ├── lib/                      # Utilitaires
│   │   │   ├── queryClient.ts        # Configuration TanStack Query
│   │   │   └── utils.ts              # Fonctions utilitaires
│   │   │
│   │   ├── hooks/                    # Hooks React personnalisés
│   │   │   ├── use-toast.ts
│   │   │   ├── use-mobile.tsx
│   │   │   └── use-intersection-observer.tsx
│   │   │
│   │   ├── App.tsx                   # Composant principal + routing
│   │   ├── main.tsx                  # Point d'entrée React
│   │   └── index.css                 # Styles globaux + variables CSS
│   │
│   └── index.html                    # Template HTML Vite
│
├── 📁 Code partagé (shared/)
│   └── schema.ts                     # Schémas de données TypeScript/Zod
│
├── 📁 Assets média (attached_assets/)
│   ├── logo cabinet_*.png            # Logos
│   ├── IMG_*.jpg                     # Photos du cabinet
│   ├── photo-output*.jpg             # Photos traitées
│   ├── WhatsApp Image*.jpg           # Images diverses
│   └── ...                           # Autres images
│
├── 📁 Assets compilés (assets/) - AUTO-GÉNÉRÉ
│   ├── index-[hash].css              # CSS compilé par Vite (Tailwind)
│   ├── index-[hash].js               # JS compilé par Vite (React app)
│   ├── chunks/                       # Chunks JavaScript
│   └── assets/                       # Images optimisées
│
├── 📄 Configuration du projet
│   ├── package.json                  # Dépendances Node.js
│   ├── vite.config.ts               # Configuration Vite
│   ├── tailwind.config.ts           # Configuration Tailwind CSS
│   ├── tsconfig.json                # Configuration TypeScript
│   ├── postcss.config.js            # Configuration PostCSS
│   └── components.json              # Configuration shadcn/ui
│
├── 📄 Scripts de build et déploiement
│   ├── build-theme.sh               # Script de build principal
│   └── .github/
│       └── workflows/
│           └── deploy.yml           # Workflow GitHub Actions
│
├── 📄 Documentation
│   ├── README.md                    # Documentation complète du thème
│   ├── INSTALLATION.md              # Guide d'installation rapide
│   ├── DEPLOYMENT.md                # Guide de déploiement GitHub
│   ├── QUICKSTART.md                # Guide de démarrage rapide
│   └── STRUCTURE.md                 # Ce fichier (structure du projet)
│
└── 📄 Fichiers de configuration
    └── .gitignore                   # Fichiers à exclure de Git
```

## 🔄 Flux de travail

### 1. Développement local

```
1. Modifier le code React (client/src/)
2. Tester avec npm run dev
3. Builder avec bash build-theme.sh
4. Vérifier les assets générés (assets/)
```

### 2. Déploiement

```
1. Commit et push vers GitHub
2. GitHub Actions exécute build-theme.sh
3. Déploiement automatique vers /wp-content/themes/odyssea/
4. WordPress charge le thème mis à jour
```

### 3. Fonctionnement WordPress

```
1. WordPress charge functions.php
2. functions.php lit asset-manifest.php
3. Enqueue des CSS/JS avec les noms hashés corrects
4. React app s'initialise dans <div id="root"></div>
5. Wouter gère le routing côté client
```

## 📦 Fichiers générés automatiquement

Ces fichiers sont créés par le build et NE DOIVENT PAS être modifiés manuellement :

- `assets/index-[hash].css` - CSS compilé
- `assets/index-[hash].js` - JS compilé
- `assets/chunks/*.js` - Chunks JavaScript
- `asset-manifest.php` - Liste des assets pour WordPress
- `node_modules/` - Dépendances (ignoré par Git)

## 🔑 Fichiers critiques

Ces fichiers sont ESSENTIELS pour WordPress :

1. **style.css** - En-tête du thème avec métadonnées
2. **functions.php** - Chargement des assets React
3. **index.php** - Template principal avec `<div id="root">`
4. **header.php** - `<head>` et ouverture `<body>`
5. **footer.php** - Scripts et fermeture `</body></html>`

## 📝 Chemins importants

### WordPress (chemins serveur)
- Thème : `/wp-content/themes/odyssea/`
- Assets : `/wp-content/themes/odyssea/assets/`
- Images : `/wp-content/themes/odyssea/assets/assets/`

### URLs WordPress (accessibles via web)
- Thème : `https://site.com/wp-content/themes/odyssea/`
- CSS : `https://site.com/wp-content/themes/odyssea/assets/index-[hash].css`
- JS : `https://site.com/wp-content/themes/odyssea/assets/index-[hash].js`

### Alias Vite (développement)
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

## 🛠️ Commandes principales

```bash
# Installation
npm install

# Build du thème
bash build-theme.sh

# Développement
npm run dev

# Créer ZIP pour WordPress
zip -r odyssea.zip odyssea/ -x "*/node_modules/*" -x "*/.git/*"

# Vérifier la structure
tree -L 3 odyssea/
```

## ✅ Vérification de la structure

Pour vérifier que tout est en place :

```bash
# Fichiers WordPress essentiels
ls -la odyssea/{index,style.css,functions,header,footer,page,single,404}.php

# Configuration
ls -la odyssea/{package.json,vite.config.ts,tailwind.config.ts}

# Code source
ls -la odyssea/client/src/

# Documentation
ls -la odyssea/{README,INSTALLATION,DEPLOYMENT,QUICKSTART}.md
```

## 📊 Statistiques du thème

- **Fichiers WordPress** : 8 (index, style, functions, header, footer, page, single, 404)
- **Pages React** : 6 (home, renata-franca, drainage, cicatrices, epilation, 404)
- **Composants UI** : 50+ (shadcn/ui)
- **Images** : 60+ fichiers
- **Documentation** : 5 fichiers MD
- **Taille totale** : ~15 MB (avec node_modules : ~200 MB)
- **Taille compilée** : ~500 KB (CSS + JS + images optimisées)

---

**Ce thème est auto-suffisant et prêt pour le déploiement ! 🚀**
