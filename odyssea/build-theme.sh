#!/bin/bash

# Build WordPress Theme Script for Odyssea Lymphea
# This script builds the theme from within the theme directory
# Usage: bash build-theme.sh

echo "🚀 Building Odyssea Lymphea WordPress theme..."
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Dependency installation failed!"
        exit 1
    fi
    echo "✅ Dependencies installed"
    echo ""
fi

# Build the Vite app
echo "📦 Building React application..."
npx vite build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ React app built successfully"
echo ""

# Extract CSS and JS filenames for manifest
if [ -f "client/index.html" ]; then
    CSS_FILE=$(grep -oP 'assets/[^"]+\.css' client/index.html | head -1)
    JS_FILE=$(grep -oP 'assets/[^"]+\.js' client/index.html | head -1)
else
    # Fallback: find the files directly
    CSS_FILE=$(find assets -name "index-*.css" -type f | head -1 | sed 's|^||')
    JS_FILE=$(find assets -name "index-*.js" -type f | head -1 | sed 's|^||')
fi

# Create a manifest file for functions.php to read
cat > asset-manifest.php <<EOF
<?php
// Auto-generated asset manifest
// Do not edit manually - regenerate with build-theme.sh
return array(
    'css' => '${CSS_FILE}',
    'js' => '${JS_FILE}',
);
EOF

echo "✅ Created asset manifest"
echo ""

echo "✅ WordPress theme build complete!"
echo ""
echo "📦 Theme location: $(pwd)"
echo "📖 The theme is ready to be deployed to /wp-content/themes/odyssea/"
echo ""
echo "To deploy from GitHub:"
echo "  1. Push this directory to your GitHub repository"
echo "  2. Set up automatic deployment to /wp-content/themes/odyssea/"
echo "  3. Activate the theme in WordPress Admin"
