# 🚀 Guide de démarrage rapide - Odyssea Lymphea

Installez et déployez votre thème WordPress Odyssea Lymphea en quelques minutes.

## 📦 Installation locale (5 minutes)

### 1. Télécharger et installer

```bash
# Téléchargez le dossier odyssea
# Compressez-le en ZIP
zip -r odyssea.zip odyssea/

# Installez dans WordPress
# WordPress Admin → Apparence → Thèmes → Ajouter → Téléverser
# Sélectionnez odyssea.zip et activez
```

✅ **C'est fait !** Votre site est maintenant en ligne avec le thème Odyssea Lymphea.

## 🔄 Déploiement automatique depuis GitHub (10 minutes)

### 1. Créer un dépôt GitHub

```bash
cd odyssea
git init
git add .
git commit -m "Initial commit: Odyssea Lymphea theme"

# Créez un dépôt sur GitHub puis :
git remote add origin https://github.com/VOTRE-USERNAME/odyssea-theme.git
git push -u origin main
```

### 2. Configurer les secrets GitHub

Dans votre dépôt GitHub :
1. **Settings → Secrets and variables → Actions → New repository secret**
2. Ajoutez ces 3 secrets :
   - `FTP_SERVER` : `votre-serveur.com`
   - `FTP_USERNAME` : `votre-nom-utilisateur`
   - `FTP_PASSWORD` : `votre-mot-de-passe`

### 3. Déployer automatiquement

```bash
# Modifiez n'importe quel fichier
vim client/src/pages/home.tsx

# Commit et push
git add .
git commit -m "Update: ma modification"
git push origin main
```

🎉 **GitHub Actions déploie automatiquement vers `/wp-content/themes/odyssea/` !**

## 🛠️ Développement local (pour les développeurs)

### 1. Installer les dépendances

```bash
cd odyssea
npm install
```

### 2. Développer avec hot-reload

```bash
npm run dev
# Ouvrez http://localhost:5000
```

### 3. Builder le thème

```bash
bash build-theme.sh
```

## 📝 Personnalisation rapide

### Modifier les informations de contact

```bash
# Éditez ces fichiers :
vim client/src/pages/home.tsx              # Section infos en haut
vim client/src/components/minimal-footer.tsx  # Pied de page

# Rebuild
bash build-theme.sh
```

### Changer les couleurs

```bash
# Éditez les variables CSS
vim client/src/index.css

# Rebuild
bash build-theme.sh
```

### Ajouter des images

```bash
# 1. Ajoutez vos images dans attached_assets/
cp mon-image.jpg attached_assets/

# 2. Utilisez-les dans React
# import imagePath from "@assets/mon-image.jpg"

# 3. Rebuild
bash build-theme.sh
```

## ✅ Checklist de déploiement

**Avant le premier déploiement :**

- [ ] Build réussi localement (`bash build-theme.sh`)
- [ ] Fichier `asset-manifest.php` créé
- [ ] Dossier `assets/` contient les fichiers CSS/JS
- [ ] Dépôt GitHub créé
- [ ] Secrets GitHub configurés (FTP_SERVER, FTP_USERNAME, FTP_PASSWORD)
- [ ] Workflow GitHub Actions testé
- [ ] Thème activé dans WordPress Admin

**Après chaque mise à jour :**

- [ ] Commit et push vers GitHub
- [ ] Workflow GitHub Actions réussi
- [ ] Vérification visuelle sur le site
- [ ] Cache WordPress vidé si nécessaire

## 🐛 Résolution rapide des problèmes

| Problème | Solution rapide |
|----------|----------------|
| **Le thème ne s'affiche pas** | Activez le thème dans WordPress Admin |
| **Les styles manquent** | Réglages → Permaliens → Enregistrer |
| **Build échoue** | `npm install` puis `bash build-theme.sh` |
| **Deploy échoue** | Vérifiez les secrets GitHub (FTP_SERVER, etc.) |
| **Erreur 404** | Réglages → Permaliens → Nom de l'article → Enregistrer |

## 📚 Documentation complète

- 📖 **[README.md](README.md)** - Documentation complète
- 🚀 **[DEPLOYMENT.md](DEPLOYMENT.md)** - Guide de déploiement GitHub détaillé
- 📦 **[INSTALLATION.md](INSTALLATION.md)** - Guide d'installation
- 💡 **[QUICKSTART.md](QUICKSTART.md)** - Ce guide (démarrage rapide)

## 🎯 Commandes essentielles

```bash
# Installation
npm install

# Build du thème
bash build-theme.sh

# Développement local
npm run dev

# Créer un ZIP pour WordPress
zip -r odyssea.zip odyssea/ -x "*/node_modules/*" -x "*/.git/*"

# Git workflow
git add .
git commit -m "Description"
git push origin main
```

## 📞 Support

**Odyssea Lymphea**  
📧 odyssea.lymphea@gmail.com  
📱 +32 494 74 17 77

---

**Maintenant, lancez-vous et créez un magnifique site WordPress !** ✨
