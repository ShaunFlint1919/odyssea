# Odyssea Lymphea - Thème WordPress

Un thème WordPress moderne et professionnel pour le cabinet de kinésithérapie Odyssea Lymphea, construit avec React, Vite et Tailwind CSS.

## 📋 Description

Ce thème WordPress intègre une application React single-page pour offrir une expérience utilisateur moderne et fluide, tout en conservant tous les avantages de WordPress pour la gestion de contenu.

### ✨ Caractéristiques principales

- ⚛️ **React 18 + WordPress** : Application React intégrée dans WordPress
- 🎨 **Design moderne** : Interface élégante avec Tailwind CSS
- 📱 **100% Responsive** : Optimisé pour mobile, tablette et desktop
- ⚡ **Performance optimale** : Build optimisé avec Vite
- ♿ **Accessible** : Composants accessibles avec Radix UI
- 🔍 **SEO-friendly** : Meta tags et Open Graph optimisés
- 🚀 **Déploiement GitHub** : Prêt pour le déploiement automatique

## 📁 Structure du thème

```
odyssea/
├── index.php                 # Template principal WordPress
├── style.css                 # En-tête du thème WordPress (obligatoire)
├── functions.php             # Fonctions et hooks WordPress
├── header.php                # En-tête HTML
├── footer.php                # Pied de page HTML
├── page.php                  # Template de page
├── single.php                # Template d'article
├── 404.php                   # Page d'erreur 404
├── screenshot.png            # Aperçu du thème (1200×900px)
├── asset-manifest.php        # Manifest des assets (auto-généré)
│
├── client/                   # Code source React
│   ├── src/
│   │   ├── pages/           # Pages React
│   │   ├── components/      # Composants réutilisables
│   │   └── lib/            # Utilitaires
│   └── index.html           # Template HTML Vite
│
├── shared/                   # Code partagé
│   └── schema.ts            # Schémas de données
│
├── attached_assets/          # Assets médias
│   └── images/              # Images du site
│
├── assets/                   # Assets compilés (auto-généré)
│   ├── index-[hash].css     # Styles compilés
│   ├── index-[hash].js      # Application React compilée
│   └── assets/              # Images et autres assets
│
├── package.json              # Dépendances Node.js
├── vite.config.ts           # Configuration Vite
├── tailwind.config.ts       # Configuration Tailwind CSS
├── tsconfig.json            # Configuration TypeScript
├── postcss.config.js        # Configuration PostCSS
├── build-theme.sh           # Script de build
└── README.md                # Ce fichier
```

## 🚀 Installation

### Prérequis

- **WordPress** 5.0 ou supérieur
- **PHP** 7.4 ou supérieur
- **Node.js** 18+ et npm (pour le développement)

### Méthode 1 : Téléchargement direct (recommandé)

1. **Téléchargez le thème**
   - Téléchargez le dossier `odyssea` complet
   - Compressez-le en fichier ZIP : `odyssea.zip`

2. **Installez dans WordPress**
   - WordPress Admin → **Apparence → Thèmes → Ajouter → Téléverser un thème**
   - Sélectionnez `odyssea.zip`
   - Cliquez sur **Installer maintenant**
   - **Activez** le thème

### Méthode 2 : Installation FTP/SFTP

1. **Uploadez le dossier**
   ```
   Uploadez le dossier 'odyssea' vers :
   /wp-content/themes/odyssea/
   ```

2. **Activez le thème**
   - WordPress Admin → **Apparence → Thèmes**
   - Trouvez "Odyssea Lymphea" et cliquez sur **Activer**

### Méthode 3 : Déploiement automatique depuis GitHub

Consultez [DEPLOYMENT.md](DEPLOYMENT.md) pour configurer le déploiement automatique depuis GitHub.

## 🛠️ Développement

### Installation des dépendances

```bash
cd odyssea
npm install
```

### Build du thème

Pour compiler l'application React et générer les assets :

```bash
bash build-theme.sh
```

Ce script va :
1. ✅ Installer les dépendances (si nécessaire)
2. ✅ Compiler l'application React avec Vite
3. ✅ Copier tous les assets dans `/assets/`
4. ✅ Générer le manifest des assets (`asset-manifest.php`)
5. ✅ Préparer le thème pour le déploiement

### Développement local

Pour développer en local avec hot-reload :

```bash
npm run dev
```

**Note :** Pour un développement complet, utilisez le projet Replit original qui inclut le serveur Express.

## 🎨 Personnalisation

### Modifier le contenu

Les fichiers React se trouvent dans :
- `client/src/pages/` - Toutes les pages du site
- `client/src/components/` - Composants réutilisables

Après modification :
```bash
bash build-theme.sh  # Rebuilder le thème
```

### Modifier les styles

- `client/src/index.css` - Variables CSS globales
- `tailwind.config.ts` - Configuration Tailwind CSS

### Ajouter des images

1. Placez-les dans `attached_assets/`
2. Rebuilder le thème
3. Référencez-les dans React avec :
   ```jsx
   import imagePath from "@assets/nom-image.jpg"
   ```

### Informations de contact

Les informations sont dans :
- `client/src/pages/home.tsx` - Section d'informations en haut
- `client/src/components/minimal-footer.tsx` - Pied de page

Vous pouvez aussi utiliser l'API REST WordPress :
```
GET /wp-json/odyssea-lymphea/v1/settings
```

## 📄 Pages du site

Le thème crée un site avec les pages suivantes :

1. **Accueil** (`/`) - Page principale avec hero et présentation
2. **Renata Franca** (`/renata-franca`) - Drainage lymphatique brésilien
3. **Drainage lymphatique** (`/drainage-lymphatique`) - Techniques Vodder et Leduc
4. **Soins de cicatrices** (`/soins-cicatrices`) - Traitements cicatriciels
5. **Épilation laser** (`/epilation-laser`) - Tarifs par zone

## 🔗 Intégrations

### Salonkee (Réservation en ligne)

Tous les boutons "Prendre rendez-vous" redirigent vers :
```
https://salonkee.be/salon/odyssea-lymphea
```

## 🐛 Dépannage

### Le thème ne s'affiche pas

1. ✅ Vérifiez que le thème est bien activé dans WordPress Admin
2. ✅ Vérifiez que le fichier `asset-manifest.php` existe
3. ✅ Ouvrez la console du navigateur (F12) pour voir les erreurs
4. ✅ Vérifiez les permissions des fichiers (644 pour fichiers, 755 pour dossiers)
5. ✅ Videz le cache WordPress et du navigateur

### Les styles ne se chargent pas

1. ✅ Allez dans **Réglages → Permaliens** et cliquez sur "Enregistrer"
2. ✅ Vérifiez que les fichiers existent dans `/assets/`
3. ✅ Vérifiez que `asset-manifest.php` contient les bons chemins
4. ✅ Videz tous les caches

### Erreur 404 sur les pages

1. ✅ Allez dans **Réglages → Permaliens**
2. ✅ Sélectionnez "Nom de l'article"
3. ✅ Cliquez sur "Enregistrer les modifications"

### Assets manquants après build

```bash
# Rebuild complet
rm -rf assets/*
bash build-theme.sh
```

## 🔧 Configuration requise

### Serveur

- **PHP** 7.4 ou supérieur
- **MySQL** 5.6 ou supérieur (ou MariaDB 10.1+)
- **Apache** ou **Nginx** avec mod_rewrite

### Développement

- **Node.js** 18 ou supérieur
- **npm** 8 ou supérieur
- **Git** (pour le déploiement depuis GitHub)

## 📚 Documentation

- 📖 [README.md](README.md) - Ce fichier (vue d'ensemble)
- 🚀 [DEPLOYMENT.md](DEPLOYMENT.md) - Guide de déploiement depuis GitHub
- 📦 [INSTALLATION.md](INSTALLATION.md) - Guide d'installation rapide

## 📞 Support

**Odyssea Lymphea**
- 📧 Email : odyssea.lymphea@gmail.com
- 📱 Téléphone : +32 494 74 17 77
- 📍 Adresse : Rue de la station, 70 - 1410 Waterloo

## 📜 Licence

Ce thème est distribué sous licence GPL v2 ou ultérieure.

## 🔄 Versions

### Version 1.0.0 (Octobre 2025)
- ✅ Version initiale du thème
- ✅ Application React complète
- ✅ Design responsive
- ✅ Intégration Salonkee
- ✅ Support des ES modules
- ✅ Déploiement automatique depuis GitHub
- ✅ Manifest automatique des assets

---

**Développé avec ❤️ pour Odyssea Lymphea**
