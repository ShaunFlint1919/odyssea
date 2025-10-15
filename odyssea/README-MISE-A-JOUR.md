# Odyssea Lymphea - Thème WordPress (Version simplifiée)

## 📋 Structure mise à jour

Le thème utilise maintenant une structure simplifiée avec des fichiers WordPress standards :

### Fichiers WordPress essentiels

1. **style.css** - En-tête du thème WordPress
   ```css
   Theme Name: Odyssea Lymphea
   Author: Shaun Flint
   Text Domain: odyssea
   Version: 1.0
   ```

2. **index.php** - Template principal
   - Charge `<div id="app"></div>`
   - Inclut `client/main.js` et `client/style.css`

3. **functions.php** - Chargement des assets
   - Enqueue `client/style.css`
   - Enqueue `client/main.js`

### Fichiers compilés

Après le build avec `bash build-theme.sh`, vous aurez :

```
odyssea/
├── style.css              # En-tête WordPress
├── index.php              # Template principal  
├── functions.php          # Enqueue des assets
├── header.php             # En-tête HTML
├── footer.php             # Pied de page HTML
├── client/
│   ├── main.js           # ✅ Application React compilée
│   ├── style.css         # ✅ Styles Tailwind compilés
│   ├── src/              # Code source React
│   └── index.html        # Template Vite
├── shared/               # Schémas partagés
└── attached_assets/      # Images
```

## 🚀 Utilisation

### 1. Build le thème

```bash
cd odyssea
npm install
bash build-theme.sh
```

Ceci compile l'application React dans :
- `client/main.js` - JavaScript compilé
- `client/style.css` - CSS compilé

### 2. Déployer

**Option A : GitHub Actions (automatique)**
```bash
git add odyssea/
git commit -m "Update theme"
git push origin main
```

Le workflow GitHub Actions va :
1. Installer les dépendances
2. Builder l'application
3. Déployer vers `/wp-content/themes/odyssea/`

**Option B : Installation manuelle**
```bash
# Créer un ZIP
zip -r odyssea.zip odyssea/

# Installer via WordPress Admin
# Apparence → Thèmes → Ajouter → Téléverser
```

### 3. Activer dans WordPress

1. WordPress Admin → **Apparence → Thèmes**
2. Trouvez "Odyssea Lymphea"
3. Cliquez sur **Activer**

## 🔧 Comment WordPress charge le thème

1. WordPress charge `index.php`
2. `index.php` appelle `get_header()` → charge `header.php`
3. `index.php` affiche `<div id="app"></div>`
4. `index.php` inclut les scripts/styles :
   - `<script src=".../client/main.js" type="module">`
   - `<link href=".../client/style.css">`
5. `functions.php` enqueue aussi les assets via WordPress
6. React s'initialise et monte l'app dans `#app`
7. `index.php` appelle `get_footer()` → charge `footer.php`

## 📁 Différences avec l'ancienne structure

### Avant (avec manifest)
- Assets dans `/assets/` avec noms hashés
- `asset-manifest.php` généré automatiquement
- `functions.php` lit le manifest pour charger les bons fichiers

### Maintenant (simplifié)
- Assets dans `/client/` avec noms fixes
- Pas de manifest nécessaire
- `functions.php` charge directement `client/main.js` et `client/style.css`
- `index.php` inclut aussi les fichiers directement

## 🛠️ Développement

### Modifier le code React

```bash
# Éditez vos fichiers
vim odyssea/client/src/pages/home.tsx

# Rebuild
cd odyssea
bash build-theme.sh

# Les fichiers client/main.js et client/style.css sont mis à jour
```

### Tester localement (développement)

```bash
cd odyssea
npm run dev
# Ouvre http://localhost:5000
```

### Structure du code React

```
client/src/
├── pages/              # Pages React
│   ├── home.tsx
│   ├── renata-franca.tsx
│   ├── drainage-lymphatique.tsx
│   ├── soins-cicatrices.tsx
│   └── epilation-laser.tsx
│
├── components/         # Composants réutilisables
│   ├── navigation.tsx
│   ├── hero-section.tsx
│   ├── services-section.tsx
│   └── minimal-footer.tsx
│
├── App.tsx            # Routing et providers
├── main.tsx           # Point d'entrée (monte dans #app)
└── index.css          # Styles globaux
```

## 📦 Déploiement depuis GitHub

Le workflow `.github/workflows/deploy.yml` est configuré pour :

1. **Installer** les dépendances dans `odyssea/`
2. **Builder** avec `bash build-theme.sh`
3. **Vérifier** que `client/main.js` et `client/style.css` existent
4. **Déployer** le dossier `odyssea/` vers `/wp-content/themes/odyssea/`

### Configuration requise

Dans GitHub → Settings → Secrets and variables → Actions :
- `FTP_SERVER` : votre-serveur.com
- `FTP_USERNAME` : votre-nom-utilisateur
- `FTP_PASSWORD` : votre-mot-de-passe

## ✅ Vérification

Après déploiement, vérifiez que ces fichiers existent sur le serveur :

```
/wp-content/themes/odyssea/
├── style.css              ✅
├── index.php              ✅
├── functions.php          ✅
├── header.php             ✅
├── footer.php             ✅
├── client/
│   ├── main.js           ✅ (fichier compilé)
│   └── style.css         ✅ (fichier compilé)
```

Si WordPress ne reconnaît pas le thème :
1. ✅ Vérifiez que `style.css` contient l'en-tête WordPress
2. ✅ Vérifiez les permissions (644 pour fichiers, 755 pour dossiers)
3. ✅ Vérifiez que le dossier est bien dans `/wp-content/themes/odyssea/`

## 🎯 Structure finale

```
odyssea/                          → /wp-content/themes/odyssea/
├── 📄 WordPress core files
│   ├── style.css                 (Theme header)
│   ├── index.php                 (Main template)
│   ├── functions.php             (Asset enqueuing)
│   ├── header.php
│   ├── footer.php
│   ├── page.php
│   ├── single.php
│   └── 404.php
│
├── 📁 client/                    (Frontend)
│   ├── main.js                   ← Compiled React app
│   ├── style.css                 ← Compiled styles
│   ├── src/                      (Source code)
│   └── index.html
│
├── 📁 shared/                    (Shared code)
├── 📁 attached_assets/           (Images)
│
└── 📄 Config & build
    ├── package.json
    ├── vite.config.ts
    ├── build-theme.sh
    └── .github/workflows/deploy.yml
```

---

**Le thème est maintenant simplifié et prêt pour WordPress ! 🚀**
