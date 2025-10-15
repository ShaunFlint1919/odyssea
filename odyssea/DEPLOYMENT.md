# Déploiement depuis GitHub - Odyssea Lymphea

Guide complet pour déployer automatiquement le thème WordPress Odyssea Lymphea depuis un dépôt GitHub vers votre site WordPress.

## 📋 Vue d'ensemble

Ce thème est conçu pour être déployé automatiquement depuis GitHub vers `/wp-content/themes/odyssea/` sur votre serveur WordPress.

## 🚀 Configuration du déploiement automatique

### Étape 1 : Préparer le dépôt GitHub

1. **Créer un nouveau dépôt GitHub**
   - Allez sur [GitHub](https://github.com) et créez un nouveau dépôt
   - Nommez-le par exemple : `odyssea-wordpress-theme`
   - Initialisez-le avec un README (optionnel)

2. **Pousser le thème vers GitHub**

   **Option A : Dépôt dédié au thème uniquement**
   ```bash
   # Depuis le dossier odyssea
   cd odyssea
   
   # Initialiser git (si pas déjà fait)
   git init
   
   # Ajouter le remote
   git remote add origin https://github.com/VOTRE-USERNAME/odyssea-wordpress-theme.git
   
   # Ajouter tous les fichiers
   git add .
   
   # Commit initial
   git commit -m "Initial commit: Odyssea Lymphea WordPress theme"
   
   # Pousser vers GitHub
   git push -u origin main
   ```

   **Option B : Dépôt avec le dossier odyssea (recommandé)**
   ```bash
   # Depuis le dossier racine du projet
   git init
   
   # Ajouter le remote
   git remote add origin https://github.com/VOTRE-USERNAME/odyssea-theme-repo.git
   
   # Ajouter le dossier odyssea
   git add odyssea/
   
   # Commit initial
   git commit -m "Initial commit: Odyssea Lymphea WordPress theme"
   
   # Pousser vers GitHub
   git push -u origin main
   ```
   
   **Note :** Le workflow GitHub Actions est déjà inclus dans `odyssea/.github/workflows/deploy.yml`

### Étape 2 : Configurer le déploiement automatique

Il existe plusieurs méthodes pour déployer automatiquement depuis GitHub. Voici les plus courantes :

#### Option A : GitHub Actions + FTP/SFTP (Recommandé)

1. **Créer un fichier de workflow GitHub Actions**

   Créez `.github/workflows/deploy.yml` dans votre dépôt :

   ```yaml
   name: Deploy Odyssea Lymphea to WordPress

   on:
     push:
       branches: [ main, master ]
     workflow_dispatch:

   jobs:
     deploy:
       runs-on: ubuntu-latest
       
       steps:
       - name: Checkout code
         uses: actions/checkout@v4

       - name: Setup Node.js
         uses: actions/setup-node@v4
         with:
           node-version: '18'

       - name: Install dependencies
         working-directory: ./odyssea
         run: npm install

       - name: Build theme
         working-directory: ./odyssea
         run: bash build-theme.sh

       - name: Deploy to WordPress via FTP
         uses: SamKirkland/FTP-Deploy-Action@v4.3.5
         with:
           server: ${{ secrets.FTP_SERVER }}
           username: ${{ secrets.FTP_USERNAME }}
           password: ${{ secrets.FTP_PASSWORD }}
           local-dir: ./odyssea/
           server-dir: /wp-content/themes/odyssea/
           exclude: |
             **/.git*
             **/.git*/**
             **/node_modules/**
             **/.github/**
             **/package-lock.json
   ```

   **Important :** Notez que le workflow utilise `working-directory: ./odyssea` car le thème se trouve dans le sous-dossier `odyssea/` du dépôt, et `local-dir: ./odyssea/` pour déployer le contenu du dossier directement vers `/wp-content/themes/odyssea/`.

2. **Configurer les secrets GitHub**

   Dans votre dépôt GitHub :
   - Allez dans **Settings → Secrets and variables → Actions**
   - Ajoutez les secrets suivants :
     - `FTP_SERVER` : votre-serveur.com
     - `FTP_USERNAME` : votre-nom-utilisateur
     - `FTP_PASSWORD` : votre-mot-de-passe

#### Option B : Deploy via SSH

1. **Créer un fichier de workflow avec SSH**

   `.github/workflows/deploy.yml` :

   ```yaml
   name: Deploy to WordPress via SSH

   on:
     push:
       branches: [ main ]

   jobs:
     deploy:
       runs-on: ubuntu-latest
       
       steps:
       - name: Checkout code
         uses: actions/checkout@v3

       - name: Setup Node.js
         uses: actions/setup-node@v4
         with:
           node-version: '18'

       - name: Install dependencies
         working-directory: ./odyssea
         run: npm install

       - name: Build theme
         working-directory: ./odyssea
         run: bash build-theme.sh

       - name: Deploy via SSH
         uses: appleboy/scp-action@master
         with:
           host: ${{ secrets.SSH_HOST }}
           username: ${{ secrets.SSH_USERNAME }}
           key: ${{ secrets.SSH_PRIVATE_KEY }}
           source: "./odyssea/*"
           target: "/var/www/html/wp-content/themes/odyssea/"
           strip_components: 1
   ```

2. **Configurer les secrets SSH**

   - `SSH_HOST` : votre-serveur.com
   - `SSH_USERNAME` : votre-nom-utilisateur
   - `SSH_PRIVATE_KEY` : votre clé SSH privée

#### Option C : Hébergeurs avec intégration Git native

Certains hébergeurs WordPress offrent une intégration Git native :

**Kinsta, WP Engine, Cloudways, etc.**

1. **Connectez votre dépôt GitHub**
   - Dans le panneau d'administration de votre hébergeur
   - Trouvez l'option "Git deployment" ou "Deploy from GitHub"
   - Connectez votre dépôt

2. **Configurez le chemin de déploiement**
   - Chemin cible : `/wp-content/themes/odyssea/`
   - Branche : `main`
   - Déploiement automatique : Activé

3. **Configurez les commandes de build**
   ```bash
   npm install
   bash build-theme.sh
   ```

### Étape 3 : Workflow de déploiement

Une fois configuré, le déploiement se fait automatiquement :

1. **Modifier le code localement**
   ```bash
   # Faire vos modifications dans client/src/
   vim client/src/pages/home.tsx
   ```

2. **Tester localement** (optionnel)
   ```bash
   bash build-theme.sh
   # Vérifier que tout fonctionne
   ```

3. **Commit et push**
   ```bash
   git add .
   git commit -m "Update: description de vos modifications"
   git push origin main
   ```

4. **Déploiement automatique**
   - GitHub Actions va automatiquement :
     - ✅ Installer les dépendances
     - ✅ Builder l'application React
     - ✅ Générer les assets
     - ✅ Déployer vers `/wp-content/themes/odyssea/`

5. **Activer le thème** (première fois uniquement)
   - WordPress Admin → Apparence → Thèmes
   - Activer "Odyssea Lymphea"

## 🔒 Sécurité

### Fichiers à ne pas commiter

Créez un fichier `.gitignore` dans le dossier `odyssea/` :

```gitignore
# Dépendances
node_modules/
package-lock.json

# Build artifacts
dist/
.vite/

# Assets compilés (seront générés par le build)
assets/*.css
assets/*.js
assets/chunks/
asset-manifest.php

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Environment
.env
.env.local
```

### Bonnes pratiques de sécurité

1. ✅ **Ne jamais commiter** les secrets (mots de passe, clés API)
2. ✅ **Utiliser les secrets GitHub** pour les informations sensibles
3. ✅ **Limiter les permissions** des utilisateurs FTP/SSH
4. ✅ **Activer l'authentification 2FA** sur GitHub
5. ✅ **Vérifier les logs** de déploiement régulièrement

## 🧪 Tester le déploiement

### Test en local avant de pousser

```bash
# Build local
bash build-theme.sh

# Vérifier que les assets sont générés
ls -la assets/

# Vérifier le manifest
cat asset-manifest.php
```

### Test du déploiement

1. **Faire un petit changement de test**
   ```bash
   echo "<!-- Test deploy -->" >> footer.php
   git add footer.php
   git commit -m "Test: deploy workflow"
   git push origin main
   ```

2. **Vérifier GitHub Actions**
   - Allez dans l'onglet "Actions" de votre dépôt
   - Vérifiez que le workflow s'exécute correctement
   - Consultez les logs en cas d'erreur

3. **Vérifier sur le serveur**
   - Connectez-vous en FTP/SSH
   - Vérifiez que les fichiers sont bien dans `/wp-content/themes/odyssea/`
   - Vérifiez que le thème fonctionne sur le site

## 🛠️ Dépannage

### Le déploiement échoue

1. **Vérifier les logs GitHub Actions**
   - Onglet "Actions" → Cliquez sur le workflow échoué
   - Consultez les logs détaillés

2. **Erreurs courantes**

   **Build failed:**
   ```bash
   # Vérifier que build-theme.sh est exécutable
   chmod +x build-theme.sh
   git add build-theme.sh
   git commit -m "Fix: make build-theme.sh executable"
   git push
   ```

   **FTP connection failed:**
   - Vérifiez les secrets FTP_SERVER, FTP_USERNAME, FTP_PASSWORD
   - Vérifiez que le FTP/SFTP est activé sur votre hébergeur

   **Permission denied:**
   - Vérifiez les permissions du dossier `/wp-content/themes/`
   - Le dossier doit être accessible en écriture (755)

### Les assets ne se chargent pas après déploiement

1. **Vérifier le manifest**
   ```bash
   # Sur le serveur
   cat /wp-content/themes/odyssea/asset-manifest.php
   ```

2. **Rebuilder si nécessaire**
   ```bash
   # En local
   rm -rf assets/*
   bash build-theme.sh
   git add .
   git commit -m "Fix: rebuild assets"
   git push
   ```

3. **Vider le cache WordPress**
   - WordPress Admin → Plugins → WP Super Cache (si installé)
   - Ou via plugin de cache (W3 Total Cache, etc.)

## 📦 Déploiement manuel (alternative)

Si vous préférez ne pas utiliser le déploiement automatique :

1. **Build en local**
   ```bash
   cd odyssea
   bash build-theme.sh
   ```

2. **Créer une archive**
   ```bash
   zip -r odyssea.zip ./* -x "*.git*" -x "node_modules/*"
   ```

3. **Installer via WordPress Admin**
   - WordPress Admin → Apparence → Thèmes → Ajouter → Téléverser
   - Sélectionner `odyssea.zip`
   - Installer et activer

## 📊 Monitoring du déploiement

### Notifications par email

Configurez les notifications GitHub pour recevoir un email :
- Settings → Notifications → Actions
- Activez "Email" pour les workflows

### Slack notifications (optionnel)

Ajoutez à votre workflow :

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 📝 Checklist de déploiement

Avant de déployer en production :

- [ ] ✅ Build réussi en local
- [ ] ✅ Tous les tests passent
- [ ] ✅ Assets générés correctement
- [ ] ✅ Manifest créé
- [ ] ✅ Secrets GitHub configurés
- [ ] ✅ Workflow testé avec un petit commit
- [ ] ✅ Permissions serveur vérifiées
- [ ] ✅ Backup du site WordPress existant
- [ ] ✅ Documentation à jour

## 🎯 Résumé

1. **Pousser le code** → GitHub détecte le push
2. **GitHub Actions** → Build automatique
3. **Déploiement** → FTP/SSH vers le serveur
4. **Thème mis à jour** → Automatiquement sur WordPress

**Le déploiement automatique simplifie grandement la maintenance et les mises à jour du thème !** 🚀

---

Pour plus d'informations :
- 📖 [README.md](README.md) - Vue d'ensemble du thème
- 📦 [INSTALLATION.md](INSTALLATION.md) - Installation manuelle
