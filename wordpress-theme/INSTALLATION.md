# Guide d'installation rapide - Odyssea Lymphea WordPress Theme

## 🚀 Installation en 3 étapes

### Étape 1 : Préparer le thème

Deux options :

**Option A : Télécharger directement**
- Téléchargez l'intégralité du dossier `wordpress-theme`
- Compressez-le en fichier ZIP
- Renommez en `odyssea-lymphea.zip`

**Option B : Depuis le projet Replit**
```bash
# Construire le thème avec les derniers assets
bash build-wp-theme.sh

# Compresser le dossier
zip -r odyssea-lymphea.zip wordpress-theme/
```

### Étape 2 : Installer dans WordPress

1. Connectez-vous à votre **WordPress Admin**
2. Allez dans **Apparence → Thèmes**
3. Cliquez sur **Ajouter**
4. Cliquez sur **Téléverser un thème**
5. Sélectionnez `odyssea-lymphea.zip`
6. Cliquez sur **Installer maintenant**

### Étape 3 : Activer

Une fois l'installation terminée :
- Cliquez sur **Activer**
- Visitez votre site pour voir le résultat !

## 📋 Vérification post-installation

✅ Le site affiche la page d'accueil Odyssea Lymphea  
✅ La navigation fonctionne (toutes les pages)  
✅ Les informations de contact sont visibles  
✅ Le design est responsive (testez sur mobile)  
✅ Les boutons "Prendre rendez-vous" redirigent vers Salonkee  

## 🔧 Alternative : Installation FTP

Si vous préférez FTP :

1. **Uploadez le dossier** `wordpress-theme` vers :
   ```
   /votre-site/wp-content/themes/odyssea-lymphea/
   ```

2. **Activez le thème** :
   - WordPress Admin → Apparence → Thèmes
   - Cliquez sur "Activer" sous Odyssea Lymphea

## ❓ Problèmes courants

### Le thème ne s'affiche pas
- Vérifiez que vous avez bien activé le thème
- Videz le cache de votre navigateur (Ctrl+Shift+R)
- Vérifiez les permissions des fichiers (644 pour fichiers, 755 pour dossiers)

### Les styles ne se chargent pas
- Allez dans **Réglages → Permaliens** et cliquez sur "Enregistrer"
- Vérifiez que les fichiers `assets/css/main.css` et `assets/js/main.js` existent

### Pages 404
- Allez dans **Réglages → Permaliens**
- Sélectionnez "Nom de l'article"
- Cliquez sur "Enregistrer les modifications"

## 📞 Support

**Email** : odyssea.lymphea@gmail.com  
**Téléphone** : +32 494 74 17 77

---

Pour plus de détails, consultez le fichier **README.md** complet.
