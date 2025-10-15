#!/bin/bash

# Script pour créer le fichier ZIP du plugin Odyssea Lymphea
# Usage: bash create-zip.sh

echo "🎯 Création du plugin Odyssea Lymphea..."

# Nom du fichier ZIP
ZIP_NAME="odyssea-lymphea.zip"

# Supprimer l'ancien ZIP s'il existe
if [ -f "$ZIP_NAME" ]; then
    echo "📦 Suppression de l'ancien fichier ZIP..."
    rm "$ZIP_NAME"
fi

# Créer le ZIP avec tous les fichiers nécessaires
echo "📦 Création du nouveau fichier ZIP..."
zip -r "$ZIP_NAME" \
    odyssea-lymphea.php \
    includes/ \
    templates/ \
    assets/ \
    uninstall.php \
    README.md \
    GUIDE-INSTALLATION.md \
    INSTALLATION-GUIDE.md \
    -x "*.DS_Store" "*.git*" "*__pycache__*" "*.pyc"

# Vérifier que le ZIP a été créé
if [ -f "$ZIP_NAME" ]; then
    echo "✅ Succès ! Le fichier $ZIP_NAME a été créé."
    echo ""
    echo "📋 Contenu du ZIP :"
    unzip -l "$ZIP_NAME" | head -20
    echo ""
    echo "🚀 Vous pouvez maintenant installer ce fichier sur WordPress !"
    echo ""
    echo "📍 Prochaines étapes :"
    echo "   1. Allez sur votresite.com/wp-admin"
    echo "   2. Extensions → Ajouter → Téléverser une extension"
    echo "   3. Choisissez $ZIP_NAME"
    echo "   4. Installez et activez !"
else
    echo "❌ Erreur : Le fichier ZIP n'a pas pu être créé."
    exit 1
fi
