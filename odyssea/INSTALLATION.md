# Guide d'installation rapide - Odyssea Lymphea

Installation du thème WordPress Odyssea Lymphea en 3 étapes simples.

## 🚀 Installation rapide

### Étape 1 : Préparer le thème

**Option A : Téléchargement direct**
- Téléchargez le dossier `odyssea` complet
- Compressez-le en fichier ZIP : `odyssea.zip`

**Option B : Build depuis les sources**
```bash
cd odyssea
npm install
bash build-theme.sh
cd ..
zip -r odyssea.zip odyssea/
```

### Étape 2 : Installer dans WordPress

1. Connectez-vous à **WordPress Admin**
2. Allez dans **Apparence → Thèmes**
3. Cliquez sur **Ajouter → Téléverser un thème**
4. Sélectionnez `odyssea.zip`
5. Cliquez sur **Installer maintenant**

### Étape 3 : Activer

- Cliquez sur **Activer** après l'installation
- Visitez votre site pour voir le résultat !

## 📋 Vérification post-installation

✅ Le site affiche la page d'accueil Odyssea Lymphea  
✅ La navigation fonctionne (toutes les pages)  
✅ Les informations de contact sont visibles  
✅ Le design est responsive (testez sur mobile)  
✅ Les boutons "Prendre rendez-vous" redirigent vers Salonkee  

## 🔧 Installation alternative : FTP/SFTP

Si vous préférez installer via FTP :

1. **Uploadez le dossier**
   ```
   Uploadez le dossier 'odyssea' complet vers :
   /wp-content/themes/odyssea/
   ```

2. **Vérifiez les permissions**
   - Fichiers : `644` (rw-r--r--)
   - Dossiers : `755` (rwxr-xr-x)

3. **Activez le thème**
   - WordPress Admin → **Apparence → Thèmes**
   - Trouvez "Odyssea Lymphea"
   - Cliquez sur **Activer**

## ❓ Problèmes courants

### Le thème ne s'affiche pas

1. ✅ Vérifiez que vous avez bien activé le thème
2. ✅ Vérifiez que `asset-manifest.php` existe dans le dossier du thème
3. ✅ Videz le cache du navigateur (Ctrl+Shift+R)
4. ✅ Vérifiez les permissions des fichiers

### Les styles ne se chargent pas

1. ✅ Allez dans **Réglages → Permaliens**
2. ✅ Cliquez sur "Enregistrer les modifications"
3. ✅ Vérifiez que les fichiers dans `assets/` existent
4. ✅ Ouvrez la console du navigateur (F12) pour voir les erreurs

### Erreur 404 sur les pages

1. ✅ Allez dans **Réglages → Permaliens**
2. ✅ Sélectionnez "Nom de l'article"
3. ✅ Cliquez sur "Enregistrer les modifications"

### Assets manquants

Le thème doit être construit avant l'installation. Si les assets manquent :

```bash
cd odyssea
bash build-theme.sh
```

Puis réinstallez le thème.

## 📦 Configuration requise

### Serveur
- **WordPress** : 5.0+
- **PHP** : 7.4+
- **MySQL** : 5.6+
- **Apache/Nginx** avec mod_rewrite

### Développement
- **Node.js** : 18+
- **npm** : 8+

## 🔄 Mise à jour du thème

Pour mettre à jour le thème vers une nouvelle version :

1. **Sauvegardez** votre site WordPress (base de données + fichiers)
2. **Désactivez** le thème actuel (activez un thème par défaut temporairement)
3. **Supprimez** l'ancien thème via FTP ou WordPress Admin
4. **Installez** la nouvelle version (suivez les étapes ci-dessus)
5. **Activez** le nouveau thème
6. **Testez** toutes les fonctionnalités

## 📚 Documentation complète

Pour plus d'informations :

- 📖 [README.md](README.md) - Documentation complète du thème
- 🚀 [DEPLOYMENT.md](DEPLOYMENT.md) - Déploiement depuis GitHub
- 🛠️ Build du thème : `bash build-theme.sh`

## 📞 Support

**Odyssea Lymphea**  
📧 Email : odyssea.lymphea@gmail.com  
📱 Téléphone : +32 494 74 17 77  
📍 Adresse : Rue de la station, 70 - 1410 Waterloo

---

**Installation simple et rapide pour un thème WordPress moderne !** ✨
